import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const app = express();
const port = Number(process.env.PORT || process.env.PDF_CONVERTER_PORT || 3001);
const conversionTimeoutMs = Number(process.env.CONVERSION_TIMEOUT_MS || 120000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

const sofficeCandidates = [
  process.env.LIBREOFFICE_PATH,
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
].filter(Boolean) as string[];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function findExecutableOnPath(command: string): Promise<string | null> {
  return new Promise((resolve) => {
    const lookup = spawn(process.platform === 'win32' ? 'where' : 'which', [command], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let stdout = '';

    lookup.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    lookup.on('error', () => resolve(null));
    lookup.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      const firstMatch = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

      resolve(firstMatch || null);
    });
  });
}

async function resolveSofficePath(): Promise<string | null> {
  for (const candidate of sofficeCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  const discoveredPath = await findExecutableOnPath('soffice');
  return discoveredPath || null;
}

function runSoffice(sofficePath: string, inputPath: string, outputDir: string, profileDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn> | null = null;

    const timeout = setTimeout(() => {
      if (child) {
        child.kill();
      }
      reject(new Error(`LibreOffice conversion timed out after ${conversionTimeoutMs / 1000} seconds.`));
    }, conversionTimeoutMs);

    child = spawn(sofficePath, [
      '--headless',
      '--nologo',
      '--nodefault',
      '--nolockcheck',
      '--nofirststartwizard',
      `-env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath,
    ], {
      stdio: 'pipe',
    });

    let stderr = '';

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `LibreOffice conversion failed with exit code ${code}.`));
    });
  });
}

app.get('/api/health', async (_req, res) => {
  const sofficePath = await resolveSofficePath();
  res.json({
    ok: true,
    converterAvailable: Boolean(sofficePath),
    converterPath: sofficePath,
  });
});

app.post('/api/convert/docx-to-pdf', async (req, res) => {
  const { docxBase64, fileName } = req.body as { docxBase64?: string; fileName?: string };

  if (!docxBase64) {
    res.status(400).send('Missing DOCX payload.');
    return;
  }

  const sofficePath = await resolveSofficePath();
  if (!sofficePath) {
    res.status(503).send('PDF converter not available. Install LibreOffice and restart the converter service.');
    return;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agreement-system-'));
  const profileDir = path.join(tempDir, 'libreoffice-profile');
  const safeName = (fileName || 'agreement.docx').replace(/[^a-zA-Z0-9._-]/g, '_');
  const inputPath = path.join(tempDir, safeName.endsWith('.docx') ? safeName : `${safeName}.docx`);
  const outputPath = path.join(tempDir, `${path.parse(inputPath).name}.pdf`);

  try {
    await fs.mkdir(profileDir, { recursive: true });
    await fs.writeFile(inputPath, Buffer.from(docxBase64, 'base64'));
    console.log(`[converter] Starting conversion for ${safeName}`);
    await runSoffice(sofficePath, inputPath, tempDir, profileDir);
    console.log(`[converter] Finished conversion for ${safeName}`);

    const pdfBuffer = await fs.readFile(outputPath);
    res.json({
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error instanceof Error ? error.message : 'Failed to convert DOCX to PDF.');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PDF converter listening on http://0.0.0.0:${port}`);
});
