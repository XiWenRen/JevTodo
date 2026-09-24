import { 
  fetchAllOperationLogsFromDB, 
  insertOperationLogToDB, 
  syncBatchOperationLogsToDB, 
  clearOperationLogsFromDB, 
  isCloudDBConfigured 
} from '../db.js';
import { extractUserIdFromReq } from '../auth.js';

export async function handleOperationLogsRequest(req: any, res: any) {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isConfigured = isCloudDBConfigured();
  const userId = extractUserIdFromReq(req);

  try {
    if (req.method === 'GET') {
      if (!isConfigured) {
        return res.status(200).json({
          configured: false,
          source: 'local_storage',
          logs: [],
          message: '未配置数据库，操作记录存储在客户端 LocalStorage。'
        });
      }

      if (!userId) {
        return res.status(401).json({
          configured: true,
          authenticated: false,
          error: '请先登录后查看您的操作历史日志',
          logs: []
        });
      }

      // Strictly scoped to the authenticated user ID (anti-IDOR)
      const logs = await fetchAllOperationLogsFromDB(userId);
      return res.status(200).json({
        configured: true,
        authenticated: true,
        source: 'vercel_postgres',
        logs: logs || []
      });
    }

    if (req.method === 'POST') {
      if (!isConfigured) {
        return res.status(200).json({
          configured: false,
          success: true,
          source: 'local_storage',
          message: '未配置云端数据库，数据保存至客户端 LocalStorage。'
        });
      }

      if (!userId) {
        return res.status(401).json({ error: '请先登录' });
      }

      const body = req.body || {};
      if (body.action === 'batch_sync' && Array.isArray(body.logs)) {
        await syncBatchOperationLogsToDB(body.logs, userId);
        return res.status(200).json({ configured: true, success: true, count: body.logs.length });
      }

      if (body.log) {
        await insertOperationLogToDB(body.log, userId);
        return res.status(200).json({ configured: true, success: true });
      }

      return res.status(400).json({ error: 'Missing log data' });
    }

    if (req.method === 'DELETE') {
      if (!isConfigured) {
        return res.status(200).json({ configured: false, success: true });
      }

      if (!userId) {
        return res.status(401).json({ error: '请先登录' });
      }

      // Clear all logs strictly scoped to authenticated user
      await clearOperationLogsFromDB(userId);
      return res.status(200).json({ configured: true, success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /api/operation-logs error:', err);
    return res.status(500).json({ error: err?.message || 'Operation logs DB error' });
  }
}
