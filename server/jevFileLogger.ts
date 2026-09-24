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

export interface JevLogRecord {
  id: string;
  timestamp: string;
  triggerType: string;
  status: string;
  durationMs: number;
  inputText: string;
  gateway: string;
  apiKeyMasked: string;
  payload?: any;
  result?: any;
  error?: string;
}

export interface JevUsageStats {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  todayCalls: number;
  avgDurationMs: number;
  byTriggerType: Record<string, number>;
  keysSummary: Record<string, number>;
}

export function parseJevLogFile(keyFilter?: string): { stats: JevUsageStats; records: JevLogRecord[] } {
  const content = readJevLogFile();
  const blocks = content.split('--------------------------------------------------------------------------------');

  const records: JevLogRecord[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  let totalDuration = 0;
  let successCount = 0;
  let failedCount = 0;
  let todayCount = 0;
  const byTriggerType: Record<string, number> = {};
  const keysSummary: Record<string, number> = {};

  for (let i = 0; i < blocks.length; i++) {
    const raw = blocks[i].trim();
    if (!raw || raw.startsWith('Error reading') || raw.startsWith('No Jev logs')) continue;

    const headerMatch = /\[(.*?)\]\s*\[TRIGGER:\s*(.*?)\]\s*\[STATUS:\s*(.*?)\]\s*\[DURATION:\s*(\d+)ms\]/.exec(raw);
    const inputMatch = /INPUT:\s*"(.*?)"(?:\r?\n|$)/s.exec(raw);
    const gatewayMatch = /GATEWAY:\s*(.*?)\s*\(KEY:\s*(.*?)\)/.exec(raw);
    const payloadMatch = /PAYLOAD:\s*(\{.*?\})(?:\r?\n|$)/s.exec(raw);
    const resultMatch = /RESULT:\s*(\{.*?\})(?:\r?\n|$)/s.exec(raw);
    const errorMatch = /ERROR\/FALLBACK:\s*(.*?)(?:\r?\n|$)/s.exec(raw);

    const timestamp = headerMatch ? headerMatch[1] : '';
    const triggerType = headerMatch ? headerMatch[2] : 'unknown';
    const status = headerMatch ? headerMatch[3] : 'unknown';
    const durationMs = headerMatch ? parseInt(headerMatch[4], 10) : 0;
    const inputText = inputMatch ? inputMatch[1] : '';
    const gateway = gatewayMatch ? gatewayMatch[1] : '';
    const apiKeyMasked = gatewayMatch ? gatewayMatch[2] : '(未提供)';

    let payload: any = undefined;
    if (payloadMatch) {
      try { payload = JSON.parse(payloadMatch[1]); } catch {}
    }

    let result: any = undefined;
    if (resultMatch) {
      try { result = JSON.parse(resultMatch[1]); } catch {}
    }

    const error = errorMatch ? errorMatch[1] : undefined;

    // Filter by key if specified
    if (keyFilter) {
      const cleanFilter = keyFilter.trim().slice(0, 10);
      if (!apiKeyMasked.includes(cleanFilter)) {
        continue;
      }
    }

    const isSuccess = status.includes('200') || status.includes('OK');
    if (isSuccess) successCount++;
    else failedCount++;

    if (timestamp && timestamp.slice(0, 10) === todayStr) {
      todayCount++;
    }

    totalDuration += durationMs;
    byTriggerType[triggerType] = (byTriggerType[triggerType] || 0) + 1;
    keysSummary[apiKeyMasked] = (keysSummary[apiKeyMasked] || 0) + 1;

    records.push({
      id: `jev-log-${i}-${Date.parse(timestamp) || Date.now()}`,
      timestamp,
      triggerType,
      status,
      durationMs,
      inputText,
      gateway,
      apiKeyMasked,
      payload,
      result,
      error
    });
  }

  // Newest first
  records.reverse();

  const totalCalls = records.length;
  const avgDurationMs = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  return {
    stats: {
      totalCalls,
      successCalls: successCount,
      failedCalls: failedCount,
      todayCalls: todayCount,
      avgDurationMs,
      byTriggerType,
      keysSummary
    },
    records
  };
}

