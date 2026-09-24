import fs from 'fs';
import path from 'path';

/**
 * Shared File Logger for Jev AI Evaluation Requests
 * Works both locally (logs/jev.log) and on Vercel Serverless (/tmp/jev.log)
 */

export function getLogFilePath(): string {
  const isVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const dir = isVercel ? '/tmp' : path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // ignore if folder already exists
    }
  }
  return path.join(dir, 'jev.log');
}

export function writeJevLogEntry(entry: {
  timestamp?: string;
  triggerType?: string;
  inputText: string;
  targetEndpoint: string;
  apiKeyMasked: string;
  status: string;
  statusCode?: number;
  durationMs: number;
  requestPayload?: any;
  result?: any;
  error?: string;
}) {
  const timeStr = entry.timestamp || new Date().toISOString();
  const logBlock = [
    `[${timeStr}] [TRIGGER: ${entry.triggerType || 'evaluate'}] [STATUS: ${entry.status}] [DURATION: ${entry.durationMs}ms]`,
    `INPUT: "${entry.inputText}"`,
    `GATEWAY: ${entry.targetEndpoint} (KEY: ${entry.apiKeyMasked})`,
    entry.requestPayload ? `PAYLOAD: ${JSON.stringify(entry.requestPayload)}` : null,
    entry.result ? `RESULT: ${JSON.stringify(entry.result)}` : null,
    entry.error ? `ERROR/FALLBACK: ${entry.error}` : null,
    `--------------------------------------------------------------------------------\n`
  ].filter(Boolean).join('\n');

  // 1. Append to log file
  try {
    const filePath = getLogFilePath();
    fs.appendFileSync(filePath, logBlock, 'utf8');
  } catch (err) {
    console.warn('[JevLogger] Failed writing to jev.log:', err);
  }

  // 2. Output to console/stdout (Vercel Runtime Logs captures this automatically)
  console.log(`[JevLog] ${entry.triggerType || 'evaluate'} | ${entry.status} (${entry.durationMs}ms) | "${entry.inputText}" -> ${entry.result ? JSON.stringify(entry.result) : (entry.error || '')}`);
}

export function readJevLogFile(): string {
  try {
    const filePath = getLogFilePath();
    if (!fs.existsSync(filePath)) {
      return `[${new Date().toISOString()}] No Jev logs recorded yet. (File: ${filePath})\n`;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (err: any) {
    return `Error reading jev.log: ${err?.message || String(err)}\n`;
  }
}

export function clearJevLogFile(): boolean {
  try {
    const filePath = getLogFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (e) {
    return false;
  }
}
