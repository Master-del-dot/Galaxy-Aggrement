import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import db, { FormField, Mapping } from '@/db';
import { extractPlaceholders } from '@/lib/docxHelper';
import { autoMapPlaceholders, createFieldsFromPlaceholders } from '@/lib/templateSetup';

type TemplateRecord = {
  templateId: number;
  configId: number;
  name: string;
  updatedAt?: string;
  fields: FormField[];
  placeholders: string[];
};

function createManualField(type: FormField['type']): FormField {
  return {
    id: crypto.randomUUID(),
    name: type === 'file' ? 'Drawing PDF' : 'New Field',
    type,
  };
}

export default function Setup() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.toArray());
  const configs = useLiveQuery(() => db.formConfigs.toArray());

  const templateRecords = useMemo<TemplateRecord[]>(() => {
    if (!templates || !configs) {
      return [];
    }

    return configs
      .map((config) => {
        const template = templates.find((item) => item.id === config.templateId);
        if (!template || !template.id || !config.id) {
          return null;
        }

        return {
          templateId: template.id,
          configId: config.id,
          name: template.name,
          updatedAt: config.updatedAt || template.updatedAt,
          fields: config.fields,
          placeholders: template.placeholders,
        };
      })
      .filter(Boolean) as TemplateRecord[];
  }, [configs, templates]);

  const [step, setStep] = useState(1);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateBuffer, setTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [signatureBuffer, setSignatureBuffer] = useState<ArrayBuffer | null>(null);

  const mappableFields = fields.filter((field) => field.type !== 'file');

  const resetEditor = () => {
    setStep(1);
    setEditingTemplateId(null);
    setEditingConfigId(null);
    setTemplateName('');
    setTemplateBuffer(null);
    setPlaceholders([]);
    setFields([]);
    setMappings([]);
    setSignatureBuffer(null);
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const extracted = extractPlaceholders(arrayBuffer);
    const generatedFields = createFieldsFromPlaceholders(extracted);

    setTemplateName(file.name.replace(/\.docx$/i, ''));
    setTemplateBuffer(arrayBuffer);
    setPlaceholders(extracted);
    setFields(generatedFields);
    setMappings(autoMapPlaceholders(extracted, generatedFields));
    setStep(2);
  };

  const loadTemplateForEditing = async (record: TemplateRecord) => {
    const template = templates?.find((item) => item.id === record.templateId);
    const config = configs?.find((item) => item.id === record.configId);
    if (!template || !config) return;

    setEditingTemplateId(record.templateId);
    setEditingConfigId(record.configId);
    setTemplateName(template.name);
    setTemplateBuffer(template.fileData);
    setPlaceholders(template.placeholders);
    setFields(config.fields);
    setMappings(config.mappings);
    setSignatureBuffer(config.signaturePdfData || null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTemplate = async (record: TemplateRecord) => {
    const confirmed = window.confirm(`Delete template "${record.name}"?`);
    if (!confirmed) return;

    await db.transaction('rw', db.templates, db.formConfigs, async () => {
      await db.formConfigs.delete(record.configId);
      await db.templates.delete(record.templateId);
    });

    if (editingTemplateId === record.templateId) {
      resetEditor();
    }
  };

  const addField = (type: FormField['type'] = 'text') => {
    setFields((prev) => [...prev, createManualField(type)]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...updates } : field)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
    setMappings((prev) => prev.map((mapping) => (mapping.fieldId === id ? { ...mapping, fieldId: '' } : mapping)));
  };

  const updateMapping = (placeholder: string, fieldId: string) => {
    setMappings((prev) => prev.map((mapping) => (mapping.placeholder === placeholder ? { ...mapping, fieldId } : mapping)));
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureBuffer(await file.arrayBuffer());
  };

  const handleAutoMap = () => {
    setMappings(autoMapPlaceholders(placeholders, fields));
  };

  const saveConfiguration = async () => {
    if (!templateBuffer || fields.length === 0 || !templateName.trim()) return;

    const timestamp = new Date().toISOString();

    try {
      if (editingTemplateId && editingConfigId) {
        await db.transaction('rw', db.templates, db.formConfigs, async () => {
          await db.templates.update(editingTemplateId, {
            name: templateName.trim(),
            fileData: templateBuffer,
            placeholders,
            updatedAt: timestamp,
          });

          await db.formConfigs.update(editingConfigId, {
            fields,
            mappings,
            signaturePdfData: signatureBuffer || undefined,
            updatedAt: timestamp,
          });
        });
      } else {
        const templateId = await db.templates.add({
          name: templateName.trim(),
          fileData: templateBuffer,
          placeholders,
          updatedAt: timestamp,
        });

        await db.formConfigs.add({
          templateId: templateId as number,
          fields,
          mappings,
          signaturePdfData: signatureBuffer || undefined,
          updatedAt: timestamp,
        });
      }

      navigate('/fill-form');
    } catch (error) {
      console.error(error);
      alert('Failed to save configuration');
    }
  };

  return (
    <main className="px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col gap-10">
      <section className="bg-surface-container-low rounded-2xl p-5 md:p-7 shadow-sm border border-outline-variant/10 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface">Active Templates</h2>
            <p className="text-on-surface-variant mt-2">Edit or delete existing templates, or start a new one.</p>
          </div>
          <button
            onClick={resetEditor}
            className="w-full md:w-auto px-5 py-3 rounded-full bg-primary text-on-primary font-medium shadow-sm hover:scale-[0.98] transition-transform"
          >
            New Template
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {templateRecords.length === 0 && (
            <div className="rounded-xl bg-surface-container-highest border border-dashed border-outline-variant/30 px-5 py-8 text-on-surface-variant">
              No templates saved yet.
            </div>
          )}

          {templateRecords.map((record) => (
            <article key={record.configId} className="rounded-xl bg-surface-container-highest p-5 border border-outline-variant/15 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-headline text-xl font-bold text-on-surface truncate">{record.name}</h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {record.placeholders.length} placeholders, {record.fields.length} fields
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wider text-primary bg-primary-container/40 px-3 py-1 rounded-full">
                  {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : 'Saved'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {record.placeholders.slice(0, 4).map((placeholder) => (
                  <span key={placeholder} className="px-3 py-1 rounded-full bg-surface text-xs border border-outline-variant/20 text-on-surface-variant">
                    &lt;&lt;{placeholder}&gt;&gt;
                  </span>
                ))}
                {record.placeholders.length > 4 && (
                  <span className="px-3 py-1 rounded-full bg-surface text-xs border border-outline-variant/20 text-on-surface-variant">
                    +{record.placeholders.length - 4} more
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => void loadTemplateForEditing(record)}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary-container/20 text-primary font-medium hover:bg-primary-container/30 transition-colors"
                >
                  Edit Template
                </button>
                <button
                  onClick={() => void deleteTemplate(record)}
                  className="flex-1 px-4 py-3 rounded-xl bg-error-container/60 text-on-error-container font-medium hover:bg-error-container transition-colors"
                >
                  Delete Template
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <nav aria-label="Progress" className="flex items-center gap-3 font-label text-xs sm:text-sm uppercase tracking-widest">
        <div className={cn('flex flex-col sm:flex-row sm:items-center', step >= 1 ? 'text-primary font-bold' : 'text-on-surface-variant/60')}>
          <span className="mr-2">01.</span><span>Metadata</span>
        </div>
        <span className="text-outline-variant/30 px-1">/</span>
        <div className={cn('flex flex-col sm:flex-row sm:items-center', step >= 2 ? 'text-primary font-bold' : 'text-on-surface-variant/60')}>
          <span className="mr-2">02.</span><span>Form Creator</span>
        </div>
        <span className="text-outline-variant/30 px-1">/</span>
        <div className={cn('flex flex-col sm:flex-row sm:items-center', step >= 3 ? 'text-primary font-bold' : 'text-on-surface-variant/60')}>
          <span className="mr-2">03.</span><span>Mapping</span>
        </div>
      </nav>

      {step === 1 && (
        <>
          <section className="flex flex-col gap-4 pl-1 md:pl-4 border-l-4 border-primary">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
              {editingTemplateId ? 'Edit Template' : 'Upload Template'}
            </h1>
            <p className="font-body text-on-surface-variant text-lg max-w-2xl leading-relaxed">
              Upload your `.docx` agreement. Fields are auto-created from `&lt;&lt;Placeholder&gt;&gt;` tags, and matching placeholders are mapped automatically.
            </p>
          </section>

          <section className="bg-surface-container-low rounded-xl p-6 md:p-8 flex flex-col gap-6 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-4">
              <label className="font-label text-sm font-medium text-on-surface-variant uppercase tracking-wider">Document Name</label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-surface-container-highest border-b-2 border-primary border-t-0 border-l-0 border-r-0 py-4 px-4 text-on-surface focus:ring-0 focus:bg-surface-container-lowest transition-colors"
                placeholder="e.g. Master Services Agreement"
              />
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <label className="font-label text-sm font-medium text-on-surface-variant uppercase tracking-wider">.docx File</label>
              <input
                type="file"
                accept=".docx"
                onChange={handleTemplateUpload}
                className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20 transition-all cursor-pointer"
              />
              {placeholders.length > 0 && (
                <div className="mt-4 p-4 bg-secondary-fixed/50 rounded-lg">
                  <p className="font-medium text-secondary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    Found {placeholders.length} placeholders and prepared the form automatically
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {placeholders.map((placeholder) => (
                      <span key={placeholder} className="px-3 py-1 bg-surface rounded-full text-xs font-mono text-on-surface-variant border border-outline-variant/30">
                        &lt;&lt;{placeholder}&gt;&gt;
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {step === 2 && (
        <>
          <section className="flex flex-col gap-4 pl-1 md:pl-4 border-l-4 border-primary">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
              Form Creator
            </h1>
            <p className="font-body text-on-surface-variant text-lg max-w-2xl leading-relaxed">
              Placeholder fields are created automatically. You can rename them, change field types, add extra inputs, or add a drawing PDF upload field that will be appended to the generated agreement.
            </p>
          </section>

          <section className="bg-surface-container-low rounded-xl p-4 md:p-8 flex flex-col gap-6 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

            <div className="flex flex-col gap-3 z-10">
              {fields.map((field) => (
                <div key={field.id} className="bg-surface-container-lowest p-5 rounded-lg flex flex-col gap-4 transition-transform hover:scale-[0.99] duration-300 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-secondary-container flex shrink-0 items-center justify-center text-on-secondary-container shadow-sm">
                        <span className="material-symbols-outlined fill">
                          {field.type === 'text' ? 'short_text' : field.type === 'date' ? 'calendar_today' : field.type === 'number' ? 'numbers' : 'upload_file'}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1">
                        <input
                          value={field.name}
                          onChange={(e) => updateField(field.id, { name: e.target.value })}
                          className="bg-transparent border-b border-dashed border-outline-variant/50 focus:border-primary px-1 py-1 font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors focus:ring-0 focus:outline-none"
                          placeholder="Field Name"
                        />
                        {field.type === 'file' && (
                          <span className="text-xs text-on-surface-variant mt-1">Uploaded PDF will be appended at the end of the generated agreement.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'] })}
                        className="bg-surface-container border-none text-xs uppercase tracking-wider font-medium text-on-surface-variant rounded py-2 px-3 focus:ring-0 cursor-pointer"
                      >
                        <option value="text">Text Field</option>
                        <option value="date">Date Picker</option>
                        <option value="number">Number Input</option>
                        <option value="file">PDF Upload</option>
                      </select>
                      <button onClick={() => removeField(field.id)} className="p-2 rounded-full hover:bg-error-container hover:text-on-error-container text-on-surface-variant transition-colors opacity-80 group-hover:opacity-100">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 z-10">
              <button onClick={() => addField('text')} className="w-full py-5 rounded-xl bg-primary-container/10 backdrop-blur-md text-primary font-body font-semibold text-base flex flex-col items-center justify-center gap-1 hover:bg-primary-container/20 hover:scale-[0.99] transition-all duration-300 border border-primary/5">
                <span className="material-symbols-outlined text-2xl">add_circle</span>
                <span>Add New Field</span>
              </button>
              <button onClick={() => addField('file')} className="w-full py-5 rounded-xl bg-secondary-container/60 text-on-secondary-container font-body font-semibold text-base flex flex-col items-center justify-center gap-1 hover:opacity-90 hover:scale-[0.99] transition-all duration-300 border border-outline-variant/10">
                <span className="material-symbols-outlined text-2xl">upload_file</span>
                <span>Add Drawing PDF Upload</span>
              </button>
            </div>
          </section>
        </>
      )}

      {step === 3 && (
        <>
          <section className="flex flex-col gap-4 pl-1 md:pl-4 border-l-4 border-primary">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
              Mapping & Appendages
            </h1>
            <p className="font-body text-on-surface-variant text-lg max-w-2xl leading-relaxed">
              Matching placeholders are mapped automatically. Any upload field you add in the form creator is treated as a PDF appendix and will be joined at the end of the generated agreement.
            </p>
          </section>

          <section className="bg-surface-container-low rounded-xl p-4 md:p-8 flex flex-col gap-8 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="font-headline font-bold text-xl text-on-surface">Data Mapping</h3>
                <button
                  onClick={handleAutoMap}
                  className="px-4 py-2 rounded-full bg-primary-container/20 text-primary font-medium hover:bg-primary-container/30 transition-colors"
                >
                  Auto-map Again
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex flex-col gap-2 p-4 bg-surface-container-highest rounded-lg border border-outline-variant/20">
                    <span className="font-mono text-xs text-secondary font-semibold">&lt;&lt;{mapping.placeholder}&gt;&gt;</span>
                    <select
                      value={mapping.fieldId}
                      onChange={(e) => updateMapping(mapping.placeholder, e.target.value)}
                      className="w-full bg-surface-container-lowest border-none py-2 px-3 rounded focus:ring-2 focus:ring-primary text-sm font-body border border-outline-variant/20"
                    >
                      <option value="">-- Connect to Form Field --</option>
                      {mappableFields.map((field) => (
                        <option key={field.id} value={field.id}>{field.name} ({field.type})</option>
                      ))}
                    </select>
                  </div>
                ))}
                {mappings.length === 0 && <p className="text-on-surface-variant italic">No placeholders to map.</p>}
              </div>
            </div>

            <div className="h-px bg-outline-variant/30 w-full" />

            <div className="flex flex-col gap-4">
              <h3 className="font-headline font-bold text-xl text-on-surface">Appendages (Optional)</h3>
              <p className="text-sm text-on-surface-variant">
                Upload a standard appendix PDF here if every agreement should include it. Drawing PDF fields added in Form Creator are filled by the user later and appended to that specific agreement only.
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleSignatureUpload}
                className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-surface-container-highest file:text-on-surface hover:file:bg-surface-variant transition-all cursor-pointer"
              />
              {signatureBuffer && (
                <p className="text-primary text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Standard appendix loaded and will be merged after PDF conversion.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4 ring-1 ring-outline-variant/15 ring-inset rounded-xl p-4 md:p-6 bg-surface-container-lowest shadow-sm shadow-black/5 mt-4 mb-8">
        {step > 1 ? (
          <button onClick={() => setStep((current) => current - 1)} className="w-full sm:w-auto px-6 py-3 font-body font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            disabled={step === 1 && (!templateBuffer || !templateName.trim())}
            onClick={() => setStep((current) => current + 1)}
            className="w-full sm:w-auto bg-primary text-on-primary px-8 py-3 rounded-full font-body font-medium hover:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,88,85,0.2)] disabled:opacity-50 disabled:hover:scale-100"
          >
            Next <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={saveConfiguration}
            disabled={fields.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-full font-body font-medium hover:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 disabled:opacity-50"
          >
            {editingTemplateId ? 'Update Template' : 'Finish Setup'} <span className="material-symbols-outlined text-sm">check</span>
          </button>
        )}
      </div>
    </main>
  );
}
