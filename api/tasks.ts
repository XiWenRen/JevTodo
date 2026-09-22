import { fetchAllTasksFromDB, upsertTaskToDB, deleteTaskFromDB, syncBatchTasksToDB, isCloudDBConfigured } from '../server/db.js';
import { extractUserIdFromReq } from '../server/auth.js';

export default async function handler(req: any, res: any) {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isConfigured = isCloudDBConfigured();

  // Extract user ID from Bearer token
  const userId = extractUserIdFromReq(req);

  try {
    if (req.method === 'GET') {
      if (!isConfigured) {
        return res.status(200).json({
          configured: false,
          source: 'local_storage',
          tasks: [],
          message: '未配置 Vercel POSTGRES_URL / DATABASE_URL 环境变量，系统运行在纯本地存储模式。'
        });
      }

      // If user is not logged in, return empty or 401
      if (!userId) {
        return res.status(401).json({
          configured: true,
          authenticated: false,
          error: '请先登录后访问您的个人待办事项',
          tasks: []
        });
      }

      // Strictly scoped to the authenticated user ID (anti-IDOR)
      const tasks = await fetchAllTasksFromDB(userId);
      return res.status(200).json({
        configured: true,
        authenticated: true,
        source: 'vercel_postgres',
        tasks: tasks || []
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
      if (body.action === 'batch_sync' && Array.isArray(body.tasks)) {
        await syncBatchTasksToDB(body.tasks, userId);
        return res.status(200).json({ configured: true, success: true, count: body.tasks.length });
      }

      if (body.task) {
        await upsertTaskToDB(body.task, userId);
        return res.status(200).json({ configured: true, success: true });
      }

      return res.status(400).json({ error: 'Missing task data' });
    }

    if (req.method === 'DELETE') {
      if (!isConfigured) {
        return res.status(200).json({ configured: false, success: true });
      }

      if (!userId) {
        return res.status(401).json({ error: '请先登录' });
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'Missing id to delete' });
      }

      // Delete strictly checks user_id matches
      await deleteTaskFromDB(id, userId);
      return res.status(200).json({ configured: true, success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /api/tasks error:', err);
    res.status(500).json({ error: err?.message || 'Database operation error' });
  }
}
