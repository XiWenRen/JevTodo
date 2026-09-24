/**
 * Jev Interaction Log Store & Management
 * Records all request & response exchanges with the Jev AI Decision Engine
 */

export interface JevInteractionLog {
  id: string;
  timestamp: number;
  inputText: string;
  triggerType: 'preview' | 'create_task' | 'manual';
  apiKeyMasked: string;
  endpoint: string;
  status: 'success' | 'fallback' | 'error';
  statusCode?: number;
  durationMs: number;
  source: string; // 'vercel-ai-gateway-jev' | 'jev-calibrated-local' | 'local-heuristic'
  category: string;
  urgencyScore: number;
  tags: string[];
  requestPayload?: any;
  responseData?: any;
  errorMessage?: string;
}

const STORAGE_KEY_JEV_LOGS = 'cherry_todo_jev_interaction_logs';
const MAX_LOGS = 100;

export function getJevInteractionLogs(): JevInteractionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JEV_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse Jev interaction logs:', e);
    return [];
  }
}

export function addJevInteractionLog(entry: Omit<JevInteractionLog, 'id'>): JevInteractionLog {
  const newLog: JevInteractionLog = {
    ...entry,
    id: `jev-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  };

  try {
    const current = getJevInteractionLogs();
    const updated = [newLog, ...current].slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY_JEV_LOGS, JSON.stringify(updated));
    
    // Dispatch custom event so UI can reactively update
    window.dispatchEvent(new CustomEvent('jev-log-updated', { detail: newLog }));
  } catch (e) {
    console.warn('Failed to save Jev interaction log:', e);
  }

  return newLog;
}

export function clearJevInteractionLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_JEV_LOGS);
    window.dispatchEvent(new CustomEvent('jev-log-updated', { detail: null }));
  } catch (e) {
    console.warn('Failed to clear Jev interaction logs:', e);
  }
}

export function maskApiKey(key?: string): string {
  if (!key) return '(未配置)';
  if (key.length <= 16) return '******';
  return `${key.slice(0, 10)}...${key.slice(-6)} (共${key.length}位)`;
}
