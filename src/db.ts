import Dexie, { type EntityTable } from 'dexie';

export interface Template {
  id?: number;
  cloudId?: number;
  name: string;
  fileData: ArrayBuffer; 
  placeholders: string[];
  updatedAt?: string;
}

export interface FormField {
  id: string; 
  name: string;
  type: 'text' | 'date' | 'number' | 'file';
}

export interface Mapping {
  placeholder: string;
  fieldId: string;
}

export interface FormConfig {
  id?: number;
  cloudId?: number;
  templateId: number;
  templateCloudId?: number;
  fields: FormField[];
  mappings: Mapping[];
  signaturePdfData?: ArrayBuffer; // Predefined PDF to append
  updatedAt?: string;
}

export interface StoredPdfFile {
  name: string;
  data: ArrayBuffer;
}

export interface GeneratedDoc {
  id?: number;
  cloudId?: number;
  name: string;
  date: string;
  size: number;
  fileData: ArrayBuffer;
  mimeType?: string;
  extension?: string;
  templateId?: number;
  templateCloudId?: number;
  configId?: number;
  configCloudId?: number;
  formData?: Record<string, string>;
  uploadedAppendages?: Record<string, StoredPdfFile>;
}

const db = new Dexie('GalaxyAutomatorDB') as Dexie & {
  templates: EntityTable<Template, 'id'>,
  formConfigs: EntityTable<FormConfig, 'id'>,
  generatedDocs: EntityTable<GeneratedDoc, 'id'>
};

// Start with standard tables
db.version(1).stores({
  templates: '++id, name',
  formConfigs: '++id, templateId',
  generatedDocs: '++id, name, date'
});

export default db;
