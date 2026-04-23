import { PDFDocument } from 'pdf-lib';
import { getApiUrl } from './api';
import { fillTemplate } from './docxHelper';

export interface GeneratedDocumentFile {
  bytes: Uint8Array;
  mimeType: string;
  extension: 'pdf';
}

const CONVERTER_TIMEOUT_MS = 120000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function appendPdfBuffers(pdfBytes: Uint8Array, appendixBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  if (appendixBuffers.length === 0) {
    return pdfBytes;
  }

  const finalPdfDoc = await PDFDocument.load(pdfBytes);

  for (const appendixBuffer of appendixBuffers) {
    const appendPdfDoc = await PDFDocument.load(appendixBuffer);
    const copiedPages = await finalPdfDoc.copyPages(appendPdfDoc, appendPdfDoc.getPageIndices());
    copiedPages.forEach((page) => finalPdfDoc.addPage(page));
  }

  return await finalPdfDoc.save();
}

export async function createAgreementDocument(
  templateBuffer: ArrayBuffer,
  data: Record<string, string>,
  appendixBuffers: ArrayBuffer[] = []
): Promise<GeneratedDocumentFile> {
  const filledDocx = fillTemplate(templateBuffer, data);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CONVERTER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(getApiUrl('/api/convert/docx-to-pdf'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: 'agreement.docx',
        docxBase64: arrayBufferToBase64(filledDocx)
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'PDF generation timed out after 120 seconds. Check the converter server terminal for LibreOffice errors and try again.'
      );
    }

    throw new Error(
      'Could not reach the PDF converter service. Check that the backend is running and the API URL is correct.'
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to convert DOCX to PDF.');
  }

  const payload = await response.json() as { pdfBase64: string };
  let pdfBytes = base64ToUint8Array(payload.pdfBase64);

  pdfBytes = await appendPdfBuffers(pdfBytes, appendixBuffers);

  return {
    bytes: pdfBytes,
    mimeType: 'application/pdf',
    extension: 'pdf'
  };
}
