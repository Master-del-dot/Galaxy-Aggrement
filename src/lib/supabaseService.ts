import { supabase, arrayBufferToBase64, base64ToArrayBuffer } from './supabase';
import db, { Template, FormConfig, GeneratedDoc } from '../db';

// Helper to safely decode base64 with error handling
function safeBase64ToArrayBuffer(base64Str: string | null | undefined): ArrayBuffer | null {
  if (!base64Str) return null;
  try {
    return base64ToArrayBuffer(base64Str);
  } catch (err) {
    console.error('Failed to decode base64:', err);
    return null;
  }
}

// =============== TEMPLATES SERVICE ===============

export async function saveTemplateToSupabase(template: Template): Promise<Template> {
  const fileDataBase64 = arrayBufferToBase64(template.fileData);

  const { data, error } = await supabase
    .from('templates')
    .upsert(
      {
        name: template.name,
        file_data: fileDataBase64,
        placeholders: template.placeholders,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'name' }
    )
    .select();

  if (error) throw new Error(`Failed to save template: ${error.message}`);
  if (!data || data.length === 0) throw new Error('No data returned from template save');

  const savedData = data[0];
  const decodedFileData = safeBase64ToArrayBuffer(savedData.file_data);
  if (!decodedFileData) {
    throw new Error('Failed to decode file data from Supabase');
  }

  return {
    id: savedData.id,
    cloudId: savedData.id,
    name: savedData.name,
    fileData: decodedFileData,
    placeholders: savedData.placeholders,
    updatedAt: savedData.updated_at,
  };
}

export async function getTemplatesFromSupabase(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*');

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);

  return (data || []).map((t: any) => {
    const fileData = safeBase64ToArrayBuffer(t.file_data);
    if (!fileData) return null;
    return {
      id: t.id,
      cloudId: t.id,
      name: t.name,
      fileData,
      placeholders: t.placeholders,
      updatedAt: t.updated_at,
    };
  }).filter(Boolean) as Template[];
}

export async function getTemplateByNameFromSupabase(name: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  if (!data) return null;

  const fileData = safeBase64ToArrayBuffer(data.file_data);
  if (!fileData) return null;

  return {
    id: data.id,
    cloudId: data.id,
    name: data.name,
    fileData,
    placeholders: data.placeholders,
    updatedAt: data.updated_at,
  };
}

export async function syncSupabaseTemplatesToLocal(): Promise<void> {
  const cloudTemplates = await getTemplatesFromSupabase();
  if (cloudTemplates.length === 0) return;

  const localTemplates = await db.templates.toArray();
  const localByCloudId = new Map<number, Template>();
  const localByName = new Map<string, Template>();

  localTemplates.forEach((template) => {
    if (template.cloudId) localByCloudId.set(template.cloudId, template);
    localByName.set(template.name, template);
  });

  await db.transaction('rw', db.templates, db.formConfigs, async () => {
    for (const cloudTemplate of cloudTemplates) {
      const existingByCloudId = cloudTemplate.cloudId ? localByCloudId.get(cloudTemplate.cloudId) : undefined;
      const existingByName = localByName.get(cloudTemplate.name);
      let localTemplateId: number;

      if (existingByCloudId && existingByCloudId.id) {
        localTemplateId = existingByCloudId.id;
        const remoteUpdatedAt = cloudTemplate.updatedAt ? Date.parse(cloudTemplate.updatedAt) : 0;
        const localUpdatedAt = existingByCloudId.updatedAt ? Date.parse(existingByCloudId.updatedAt) : 0;
        if (remoteUpdatedAt > localUpdatedAt) {
          await db.templates.update(localTemplateId, {
            fileData: cloudTemplate.fileData,
            placeholders: cloudTemplate.placeholders,
            updatedAt: cloudTemplate.updatedAt,
            cloudId: cloudTemplate.cloudId,
          });
        }
      } else if (existingByName && existingByName.id) {
        localTemplateId = existingByName.id;
        await db.templates.update(localTemplateId, {
          fileData: cloudTemplate.fileData,
          placeholders: cloudTemplate.placeholders,
          updatedAt: cloudTemplate.updatedAt,
          cloudId: cloudTemplate.cloudId,
        });
      } else {
        const localTemplate = {
          name: cloudTemplate.name,
          fileData: cloudTemplate.fileData,
          placeholders: cloudTemplate.placeholders,
          updatedAt: cloudTemplate.updatedAt,
          cloudId: cloudTemplate.cloudId,
        } as Template;
        localTemplateId = await db.templates.add(localTemplate);
      }

      if (!cloudTemplate.cloudId) continue;
      const cloudConfigs = await getFormConfigsByTemplateIdFromSupabase(cloudTemplate.cloudId);
      const localConfigs = await db.formConfigs.where('templateId').equals(localTemplateId).toArray();
      const localConfigByCloudId = new Map<number, FormConfig>();

      localConfigs.forEach((config) => {
        if (config.cloudId) localConfigByCloudId.set(config.cloudId, config);
      });

      for (const cloudConfig of cloudConfigs) {
        const existingConfig = cloudConfig.cloudId ? localConfigByCloudId.get(cloudConfig.cloudId) : undefined;

        if (existingConfig && existingConfig.id) {
          const remoteUpdatedAt = cloudConfig.updatedAt ? Date.parse(cloudConfig.updatedAt) : 0;
          const localUpdatedAt = existingConfig.updatedAt ? Date.parse(existingConfig.updatedAt) : 0;
          if (remoteUpdatedAt > localUpdatedAt) {
            await db.formConfigs.update(existingConfig.id, {
              templateId: localTemplateId,
              templateCloudId: cloudTemplate.cloudId,
              fields: cloudConfig.fields,
              mappings: cloudConfig.mappings,
              signaturePdfData: cloudConfig.signaturePdfData,
              updatedAt: cloudConfig.updatedAt,
              cloudId: cloudConfig.cloudId,
            });
          }
        } else {
          await db.formConfigs.add({
            templateId: localTemplateId,
            templateCloudId: cloudTemplate.cloudId,
            cloudId: cloudConfig.cloudId,
            fields: cloudConfig.fields,
            mappings: cloudConfig.mappings,
            signaturePdfData: cloudConfig.signaturePdfData,
            updatedAt: cloudConfig.updatedAt,
          });
        }
      }
    }
  });
}

export async function deleteTemplateFromSupabase(cloudId?: number, name?: string): Promise<void> {
  const query = supabase.from('templates').delete();

  if (cloudId) {
    query.eq('id', cloudId);
  } else if (name) {
    query.eq('name', name);
  } else {
    return;
  }

  const { error } = await query;
  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

// =============== FORM CONFIGS SERVICE ===============

export async function saveFormConfigToSupabase(config: FormConfig): Promise<FormConfig> {
  const payload: any = {
    template_id: config.templateCloudId ?? config.templateId,
    fields: config.fields,
    mappings: config.mappings,
    updated_at: new Date().toISOString(),
  };

  if (config.signaturePdfData) {
    payload.signature_pdf_data = arrayBufferToBase64(config.signaturePdfData);
  }

  let result;
  if (config.cloudId) {
    result = await supabase
      .from('form_configs')
      .update(payload)
      .eq('id', config.cloudId)
      .select();

    if (!result.data || result.data.length === 0) {
      result = await supabase
        .from('form_configs')
        .insert(payload)
        .select();
    }
  } else {
    result = await supabase
      .from('form_configs')
      .insert(payload)
      .select();
  }

  const { data, error } = result;

  if (error) throw new Error(`Failed to save form config: ${error.message}`);
  if (!data || data.length === 0) throw new Error('No data returned from form config save');

  const savedData = data[0];

  return {
    id: savedData.id,
    cloudId: savedData.id,
    templateId: savedData.template_id,
    templateCloudId: savedData.template_id,
    fields: savedData.fields,
    mappings: savedData.mappings,
    signaturePdfData: savedData.signature_pdf_data ? safeBase64ToArrayBuffer(savedData.signature_pdf_data) : undefined,
    updatedAt: savedData.updated_at,
  };
}

export async function getFormConfigsByTemplateIdFromSupabase(templateId: number): Promise<FormConfig[]> {
  const { data, error } = await supabase
    .from('form_configs')
    .select('*')
    .eq('template_id', templateId);

  if (error) throw new Error(`Failed to fetch form configs: ${error.message}`);

  return (data || []).map((c: any) => ({
    id: c.id,
    cloudId: c.id,
    templateId: c.template_id,
    templateCloudId: c.template_id,
    fields: c.fields,
    mappings: c.mappings,
    signaturePdfData: c.signature_pdf_data ? safeBase64ToArrayBuffer(c.signature_pdf_data) : undefined,
    updatedAt: c.updated_at,
  }));
}

export async function deleteFormConfigFromSupabase(cloudId?: number, templateCloudId?: number): Promise<void> {
  const query = supabase.from('form_configs').delete();

  if (cloudId) {
    query.eq('id', cloudId);
  } else if (templateCloudId) {
    query.eq('template_id', templateCloudId);
  } else {
    return;
  }

  const { error } = await query;
  if (error) throw new Error(`Failed to delete form config: ${error.message}`);
}

export async function deleteGeneratedDocFromSupabase(cloudId?: number, name?: string): Promise<void> {
  const query = supabase.from('generated_documents').delete();

  if (cloudId) {
    query.eq('id', cloudId);
  } else if (name) {
    query.eq('name', name);
  } else {
    return;
  }

  const { error } = await query;
  if (error) throw new Error(`Failed to delete generated document: ${error.message}`);
}
