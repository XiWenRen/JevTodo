import { registerUser, authenticateUser, isCloudDBConfigured } from '../db.js';
import { signToken, verifyToken } from '../auth.js';

export async function handleAuthRequest(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query?.action || (req.body && req.body.action) || 'me';

  try {
    // 1. Current user profile info
    if (req.method === 'GET' || action === 'me') {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (!authHeader) {
        return res.status(401).json({ authenticated: false, error: '未提供身份凭证' });
      }

      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return res.status(401).json({ authenticated: false, error: '身份凭证格式不正确' });
      }

      const payload = verifyToken(match[1].trim());
      if (!payload) {
        return res.status(401).json({ authenticated: false, error: '登录凭证已过期或无效，请重新登录' });
      }

      return res.status(200).json({
        authenticated: true,
        user: {
          id: payload.uid,
          username: payload.username
        }
      });
    }

    if (req.method === 'POST') {
      const { username, password } = req.body || {};

      // 2. User Registration
      if (action === 'register') {
        if (!username || typeof username !== 'string' || username.trim().length < 2) {
          return res.status(400).json({ error: '用户名长度至少为 2 个字符' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
          return res.status(400).json({ error: '密码长度至少为 6 位' });
        }

        if (!isCloudDBConfigured()) {
          const mockUser = { id: `local_${Date.now()}`, username: username.trim().toLowerCase() };
          const token = signToken(mockUser);
          return res.status(200).json({
            success: true,
            user: mockUser,
            token,
            isLocalMode: true,
            message: '本地离线模式已创建用户'
          });
        }

        const newUser = await registerUser(username, password);
        if (!newUser) {
          return res.status(500).json({ error: '注册失败，请稍后重试' });
        }

        const token = signToken(newUser);
        return res.status(200).json({
          success: true,
          user: newUser,
          token
        });
      }

      // 3. User Login
      if (action === 'login') {
        if (!username || !password) {
          return res.status(400).json({ error: '请输入用户名和密码' });
        }

        if (!isCloudDBConfigured()) {
          const mockUser = { id: `local_${username.trim().toLowerCase()}`, username: username.trim().toLowerCase() };
          const token = signToken(mockUser);
          return res.status(200).json({
            success: true,
            user: mockUser,
            token,
            isLocalMode: true
          });
        }

        const user = await authenticateUser(username, password);
        if (!user) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }

        const token = signToken(user);
        return res.status(200).json({
          success: true,
          user,
          token
        });
      }

      return res.status(400).json({ error: 'Unsupported action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Auth process failed' });
  }
}
