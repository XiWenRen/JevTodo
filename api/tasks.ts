import { fetchAllTasksFromDB, upsertTaskToDB, deleteTaskFromDB, syncBatchTasksToDB, isCloudDBConfigured } from '../server/db.js';

export default async function handler(req: any, res: any) {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isConfigured = isCloudDBConfigured();

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

      const tasks = await fetchAllTasksFromDB();
      return res.status(200).json({
        configured: true,
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

      const body = req.body || {};
      if (body.action === 'batch_sync' && Array.isArray(body.tasks)) {
        await syncBatchTasksToDB(body.tasks);
        return res.status(200).json({ configured: true, success: true, count: body.tasks.length });
      }

      if (body.task) {
        await upsertTaskToDB(body.task);
        return res.status(200).json({ configured: true, success: true });
      }

      return res.status(400).json({ error: 'Missing task data' });
    }

    if (req.method === 'DELETE') {
      if (!isConfigured) {
        return res.status(200).json({ configured: false, success: true });
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'Missing id to delete' });
      }

      await deleteTaskFromDB(id);
      return res.status(200).json({ configured: true, success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /api/tasks error:', err);
    res.status(500).json({ error: err?.message || 'Database operation error' });
  }
}
