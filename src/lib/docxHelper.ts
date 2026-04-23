import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export function extractPlaceholders(fileBuffer: ArrayBuffer): string[] {
  try {
    const zip = new PizZip(fileBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() { return ""; },
        delimiters: { start: '<<', end: '>>' }
    });
    
    // doc.getFullText() returns pure text without xml tags
    const text = doc.getFullText();
    
    // Find all instances of <<Tag>>
    const regex = /<<([^>]+)>>/g;
    const matches = [...text.matchAll(regex)].map(m => m[1].trim());
    
    return Array.from(new Set(matches)).filter(Boolean);
  } catch (error) {
    console.error("Error extracting placeholders:", error);
    return [];
  }
}

export function fillTemplate(fileBuffer: ArrayBuffer, data: Record<string, string>): ArrayBuffer {
  const zip = new PizZip(fileBuffer);
  const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '<<', end: '>>' }
  });
  
  doc.render(data);
  const out = doc.getZip().generate({
      type: "arraybuffer",
      compression: "DEFLATE",
  });
  
  return out;
}
