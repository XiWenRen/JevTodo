import { readJevLogFile, clearJevLogFile } from '../../server/jevFileLogger.js';

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

  const logs = readJevLogFile();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(logs);
}
