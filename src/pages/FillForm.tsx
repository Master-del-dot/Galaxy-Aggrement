import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { StoredPdfFile, GeneratedDoc } from '@/db';
import { getApiUrl } from '@/lib/api';
import { createAgreementDocument } from '@/lib/documentHelper';
import { supabase, arrayBufferToBase64 } from '@/lib/supabase';
import { deleteGeneratedDocFromSupabase } from '@/lib/supabaseService';

function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '_');
}

// Save generated document to Supabase
async function saveGeneratedDocToSupabase(doc: GeneratedDoc) {
  try {
    const fileDataBase64 = arrayBufferToBase64(doc.fileData);
    const uploadedAppendagesJson: Record<string, { name: string; data: string }> = {};

    Object.entries(doc.uploadedAppendages || {}).forEach(([key, file]) => {
      uploadedAppendagesJson[key] = {
        name: file.name,
        data: arrayBufferToBase64(file.data),
      };
    });

    const payload: any = {
      name: doc.name,
      date: doc.date,
      size: doc.size,
      file_data: fileDataBase64,
      mime_type: doc.mimeType || 'application/pdf',
      extension: doc.extension || 'pdf',
      template_id: doc.templateCloudId ?? doc.templateId,
      config_id: doc.configCloudId ?? doc.configId,
      form_data: doc.formData || {},
      uploaded_appendages: uploadedAppendagesJson,
      created_at: doc.date,
    };

    if (doc.cloudId) {
      const { data, error } = await supabase
        .from('generated_documents')
        .update(payload)
        .eq('id', doc.cloudId)
        .select();

      if (error) throw error;
      console.log('✅ Generated document updated in Supabase!');
      return data?.[0];
    }

    const { data, error } = await supabase
      .from('generated_documents')
      .insert(payload)
      .select();

    if (error) throw error;
    console.log('✅ Generated document saved to Supabase!');
    return data?.[0];
  } catch (err) {
    console.warn('⚠️ Failed to save generated document to cloud:', err);
    return null;
  }
}

export default function FillForm() {
  const navigate = useNavigate();
  const { docId } = useParams();
  const editingDocId = docId ? Number(docId) : null;
  const isEditMode = Number.isFinite(editingDocId);

  const configs = useLiveQuery(() => db.formConfigs.toArray());
  const templates = useLiveQuery(() => db.templates.toArray());
  const generatedDocs = useLiveQuery(() => db.generatedDocs.toArray());

  const [selectedConfigId, setSelectedConfigId] = useState<number | ''>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploadedAppendages, setUploadedAppendages] = useState<Record<string, StoredPdfFile>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [converterStatus, setConverterStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [didPrefillEditState, setDidPrefillEditState] = useState(false);

  const editingDoc = useMemo(
    () => (editingDocId ? generatedDocs?.find((doc) => doc.id === editingDocId) : undefined),
    [editingDocId, generatedDocs]
  );

  useEffect(() => {
    let isMounted = true;

    const checkConverter = async () => {
      try {
        const response = await fetch(getApiUrl('/api/health'));
        if (!response.ok) {
          throw new Error('Health check failed');
        }

        const payload = await response.json() as { converterAvailable?: boolean };
        if (!isMounted) return;
        setConverterStatus(payload.converterAvailable ? 'ready' : 'offline');
      } catch {
        if (!isMounted) return;
        setConverterStatus('offline');
      }
    };

    void checkConverter();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!configs?.length) {
      return;
    }

    if (isEditMode && editingDoc && !didPrefillEditState) {
      const configId = editingDoc.configId || '';
      setSelectedConfigId(configId);
      setFormData(editingDoc.formData || {});
      setUploadedAppendages(editingDoc.uploadedAppendages || {});
      setDidPrefillEditState(true);
      return;
    }

    if (!isEditMode && selectedConfigId === '') {
      setSelectedConfigId(configs[configs.length - 1].id!);
    }
  }, [configs, didPrefillEditState, editingDoc, isEditMode, selectedConfigId]);

  const activeConfig = configs?.find((config) => config.id === selectedConfigId);
  const activeTemplate = templates?.find((template) => template.id === activeConfig?.templateId);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = async (fieldId: string, file?: File | null) => {
    if (!file) {
      setUploadedAppendages((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      return;
    }

    const buffer = await file.arrayBuffer();
    setUploadedAppendages((prev) => ({
      ...prev,
      [fieldId]: {
        name: file.name,
        data: buffer,
      },
    }));
  };

  const handleGenerate = async () => {
    if (!activeConfig || !activeTemplate) return;
    setIsGenerating(true);

    try {
      const dataMap: Record<string, string> = {};
      activeConfig.mappings.forEach((mapping) => {
        const value = mapping.fieldId ? formData[mapping.fieldId] : '';
        dataMap[mapping.placeholder] = value || `[${mapping.placeholder}]`;
      });

      const appendixBuffers: ArrayBuffer[] = [];
      if (activeConfig.signaturePdfData) {
        appendixBuffers.push(activeConfig.signaturePdfData);
      }

      activeConfig.fields
        .filter((field) => field.type === 'file')
        .forEach((field) => {
          const appendix = uploadedAppendages[field.id];
          if (appendix?.data) {
            appendixBuffers.push(appendix.data);
          }
        });

      const generatedFile = await createAgreementDocument(activeTemplate.fileData, dataMap, appendixBuffers);

      let baseName = activeTemplate.name || 'Agreement';
      const firstTextField = activeConfig.fields.find((field) => field.type !== 'file');
      if (firstTextField && formData[firstTextField.id]) {
        baseName = sanitizeName(formData[firstTextField.id]);
      }

      const fileName = `${baseName}_Agreement.${generatedFile.extension}`;
      const now = new Date().toISOString();
      const payload: GeneratedDoc = {
        name: fileName,
        date: now,
        size: generatedFile.bytes.byteLength,
        fileData: generatedFile.bytes.buffer,
        mimeType: generatedFile.mimeType,
        extension: generatedFile.extension,
        templateId: activeTemplate.id,
        templateCloudId: activeTemplate.cloudId,
        configId: activeConfig.id,
        configCloudId: activeConfig.cloudId,
        formData,
        uploadedAppendages,
      };

      let newDocId: number | undefined;
      if (isEditMode && editingDocId) {
        newDocId = editingDocId;
        await db.generatedDocs.update(editingDocId, payload);
      } else {
        newDocId = await db.generatedDocs.add(payload);
      }

      const savedDoc = await saveGeneratedDocToSupabase({
        ...payload,
        id: newDocId,
      });

      if (savedDoc?.id && newDocId) {
        await db.generatedDocs.update(newDocId, { cloudId: savedDoc.id });
      }

      navigate('/library');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Error generating PDF. Please ensure the template is valid.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (configs === undefined || templates === undefined || generatedDocs === undefined) return null;

  if (isEditMode && !editingDoc) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 gap-4 px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant">edit_off</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface">PDF Not Found</h2>
        <p className="text-on-surface-variant max-w-md">The selected generated PDF could not be found in your local library.</p>
        <button onClick={() => navigate('/edit-pdf')} className="mt-4 bg-primary text-on-primary px-8 py-3 rounded-full font-bold shadow-md hover:scale-[0.98] transition-transform">
          Open Edit PDF
        </button>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 gap-4 px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant">assignment_late</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface">No Templates Configured</h2>
        <p className="text-on-surface-variant max-w-md">You need to set up a template first before generating agreements.</p>
        <button onClick={() => navigate('/setup')} className="mt-4 bg-primary text-on-primary px-8 py-3 rounded-full font-bold shadow-md hover:scale-[0.98] transition-transform">
          Go to Setup
        </button>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-6 md:px-12 max-w-5xl pt-8 flex flex-col gap-10">
      <div className="ml-2 md:ml-8">
        <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface leading-tight">
          {isEditMode ? 'Edit PDF' : 'Fill Agreement Details'}
        </h2>
        <p className="font-body text-on-surface-variant text-lg mt-4 max-w-3xl">
          {isEditMode
            ? 'Correct any values, replace uploaded drawing PDFs if needed, and regenerate the final PDF with the same template.'
            : 'Please provide the specific details required for this contract template. The generated PDF uses a local converter so the original Word layout, header, footer, and logo placement remain intact.'}
        </p>
      </div>

      <div className="px-2 md:px-8">
        <label className="text-on-surface-variant font-label text-sm font-medium">Active Template</label>
        <select
          value={selectedConfigId}
          onChange={(e) => {
            setSelectedConfigId(Number(e.target.value));
            setFormData({});
            setUploadedAppendages({});
            setDidPrefillEditState(true);
          }}
          disabled={isEditMode}
          className="block w-full mt-2 bg-surface-container-highest border-none rounded-lg p-4 text-on-surface font-body font-medium shadow-sm focus:ring-2 focus:ring-primary disabled:opacity-60"
        >
          {configs.map((config) => {
            const template = templates.find((item) => item.id === config.templateId);
            return <option key={config.id} value={config.id}>{template?.name || 'Unknown Template'}</option>;
          })}
        </select>
      </div>

      <div className="bg-surface-container-low rounded-xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-12 border border-outline-variant/10">
        <form className="space-y-8">
          {activeConfig?.fields.map((field) => (
            <div key={field.id} className="relative bg-surface-container-high rounded-t-lg pt-6 px-4 pb-3 border-b-2 border-primary transition-all focus-within:bg-surface-container-lowest">
              <label className="absolute top-2 left-4 font-label text-xs font-medium text-on-surface-variant">
                {field.name}
              </label>

              {field.type === 'file' ? (
                <div className="pt-2">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => void handleFileChange(field.id, e.target.files?.[0])}
                    className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-3 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20 transition-all cursor-pointer"
                  />
                  {uploadedAppendages[field.id] && (
                    <p className="text-sm text-primary mt-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">attach_file</span>
                      {uploadedAppendages[field.id].name}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center pt-2">
                  {field.type === 'number' && <span className="text-on-surface-variant mr-2 font-body text-base">$</span>}
                  <input
                    type={field.type}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.type === 'date' ? '' : 'Enter value'}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface font-body text-base placeholder-outline-variant"
                  />
                  {field.type === 'date' && <span className="material-symbols-outlined text-on-surface-variant ml-2 pointer-events-none">calendar_today</span>}
                </div>
              )}
            </div>
          ))}

          {activeConfig?.fields.length === 0 && (
            <p className="text-center text-on-surface-variant italic py-8">No fields defined for this template.</p>
          )}

          <div className="pt-8 flex flex-col items-center">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !activeConfig}
              className="w-full md:w-auto bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-semibold text-lg py-4 px-12 rounded-xl shadow-lg shadow-primary-container/20 hover:scale-[0.98] transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                  Generating PDF...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined fill">picture_as_pdf</span>
                  {isEditMode ? 'Regenerate PDF' : 'Generate PDF'}
                </>
              )}
            </button>
            <p className="font-label text-xs text-on-surface-variant mt-6 text-center max-w-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px]">info</span>
              {converterStatus === 'ready'
                ? 'Converter is ready. PDF generation will preserve the DOCX layout.'
                : converterStatus === 'checking'
                  ? 'Checking local PDF converter status...'
                  : 'Converter offline. Start the backend and make sure LibreOffice is available on the server.'}
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
