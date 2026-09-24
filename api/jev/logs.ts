import { readJevLogFile, clearJevLogFile, parseJevLogFile } from '../../server/jevFileLogger.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'DELETE' || req.query?.clear === 'true') {
    clearJevLogFile();
    return res.status(200).send('Jev log file cleared.\n');
  }

  if (req.query?.format === 'json' || req.headers?.accept?.includes('application/json')) {
    const keyFilter = typeof req.query?.key === 'string' ? req.query.key : undefined;
    const parsed = parseJevLogFile(keyFilter);
    return res.status(200).json(parsed);
  }

  const logs = readJevLogFile();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(logs);
}
