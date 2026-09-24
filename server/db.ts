import { neon } from '@neondatabase/serverless';
import { hashPassword, verifyPassword } from './auth.js';

export interface DBTask {
  id: string;
  userId?: string;
  title: string;
  rawInput?: string;
  category: string;
  priority: string;
  urgencyScore?: number;
  tags: string[];
  dueDate?: string;
  dueDateIso?: string;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  notes?: string[];
  cherrySubtasks?: any[];
  isStale?: boolean;
  jevConfidence?: number;
}

export interface AppUserRecord {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  created_at: number;
}

export interface DBOperationLog {
  id: string;
  userId?: string;
  timestamp: number;
  type: string;
  title: string;
  description: string;
  affectedCount: number;
  taskSnapshots: any[];
}

function getDatabaseUrl(): string | null {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || null;
}

let tableInitialized = false;

export async function ensureTables(sql: any) {
  if (tableInitialized) return;
  try {
    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(128) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `;

    // 2. Tasks table with user_id
    await sql`
      CREATE TABLE IF NOT EXISTS jev_tasks (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128),
        title TEXT NOT NULL,
        raw_input TEXT,
        category VARCHAR(64) NOT NULL,
        priority VARCHAR(32) NOT NULL,
        urgency_score REAL DEFAULT 0.5,
        tags JSONB DEFAULT '[]'::jsonb,
        due_date TEXT,
        due_date_iso TEXT,
        completed BOOLEAN DEFAULT FALSE,
        completed_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        is_stale BOOLEAN DEFAULT FALSE,
        notes JSONB DEFAULT '[]'::jsonb,
        jev_confidence REAL
      );
    `;

    // Ensure user_id and notes columns exist (for backward compatibility if table existed)
    await sql`
      ALTER TABLE jev_tasks ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);
    `;
    await sql`
      ALTER TABLE jev_tasks ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
    `;
    await sql`
      ALTER TABLE jev_tasks ADD COLUMN IF NOT EXISTS cherry_subtasks JSONB DEFAULT '[]'::jsonb;
    `;

    // Index for fast tenant query and strict isolation
    await sql`
      CREATE INDEX IF NOT EXISTS idx_jev_tasks_user_id ON jev_tasks(user_id);
    `;

    // 3. Operation logs table with user_id
    await sql`
      CREATE TABLE IF NOT EXISTS jev_operation_logs (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        timestamp BIGINT NOT NULL,
        type VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        affected_count INT DEFAULT 1,
        task_snapshots JSONB DEFAULT '[]'::jsonb
      );
    `;

    // Indices for operation logs
    await sql`
      CREATE INDEX IF NOT EXISTS idx_jev_operation_logs_user_id ON jev_operation_logs(user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_jev_operation_logs_timestamp ON jev_operation_logs(timestamp DESC);
    `;

    tableInitialized = true;
  } catch (err) {
    console.warn('Failed to ensure database tables:', err);
  }
}

export function isCloudDBConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getSqlClient() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return null;
  return neon(dbUrl);
}

// ==================== User Authentication Database Methods ====================

export async function registerUser(username: string, password: string): Promise<{ id: string; username: string } | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  await ensureTables(sql);

  const cleanUsername = username.trim().toLowerCase();
  const existing = await sql`
    SELECT id FROM app_users WHERE username = ${cleanUsername} LIMIT 1;
  `;

  if (existing.length > 0) {
    throw new Error('用户名已被注册，请尝试其他用户名');
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const { hash, salt } = hashPassword(password);
  const now = Date.now();

  await sql`
    INSERT INTO app_users (id, username, password_hash, salt, created_at)
    VALUES (${userId}, ${cleanUsername}, ${hash}, ${salt}, ${now});
  `;

  return { id: userId, username: cleanUsername };
}

export async function authenticateUser(username: string, password: string): Promise<{ id: string; username: string } | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  await ensureTables(sql);

  const cleanUsername = username.trim().toLowerCase();
  const rows = await sql`
    SELECT id, username, password_hash, salt FROM app_users WHERE username = ${cleanUsername} LIMIT 1;
  `;

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return null;
  }

  return { id: user.id, username: user.username };
}

export async function getUserById(id: string): Promise<{ id: string; username: string } | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  await ensureTables(sql);

  const rows = await sql`
    SELECT id, username FROM app_users WHERE id = ${id} LIMIT 1;
  `;

  if (rows.length === 0) return null;
  return { id: rows[0].id, username: rows[0].username };
}

// ==================== Strict Multi-Tenant Tasks Methods ====================

/**
 * Fetch all tasks strictly scoped to a specific user.
 * Cannot access tasks of other users (IDOR prevention).
 */
export async function fetchAllTasksFromDB(userId: string): Promise<DBTask[] | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  await ensureTables(sql);

  const rows = await sql`
    SELECT * FROM jev_tasks 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `;

  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    rawInput: r.raw_input || undefined,
    category: r.category,
    priority: r.priority,
    urgencyScore: r.urgency_score ?? 0.5,
    tags: Array.isArray(r.tags) ? r.tags : [],
    dueDate: r.due_date || undefined,
    dueDateIso: r.due_date_iso || undefined,
    completed: Boolean(r.completed),
    completedAt: r.completed_at ? Number(r.completed_at) : undefined,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    isStale: Boolean(r.is_stale),
    notes: Array.isArray(r.notes) ? r.notes : [],
    cherrySubtasks: Array.isArray(r.cherry_subtasks) ? r.cherry_subtasks : [],
    jevConfidence: r.jev_confidence ?? undefined
  }));
}

/**
 * Upsert task strictly scoped to a specific user.
 * Enforces ownership: a user CANNOT overwrite another user's task ID!
 */
export async function upsertTaskToDB(task: DBTask, userId: string): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureTables(sql);

  const tagsJson = JSON.stringify(task.tags || []);
  const notesJson = JSON.stringify(task.notes || []);
  const cherrySubtasksJson = JSON.stringify(task.cherrySubtasks || []);

  // Strict ownership check on conflict: only allow update if user_id matches
  await sql`
    INSERT INTO jev_tasks (
      id, user_id, title, raw_input, category, priority, urgency_score, 
      tags, due_date, due_date_iso, completed, completed_at, 
      created_at, updated_at, is_stale, notes, cherry_subtasks, jev_confidence
    ) VALUES (
      ${task.id}, ${userId}, ${task.title}, ${task.rawInput || null}, ${task.category}, ${task.priority}, ${task.urgencyScore ?? 0.5},
      ${tagsJson}::jsonb, ${task.dueDate || null}, ${task.dueDateIso || null}, ${task.completed}, ${task.completedAt || null},
      ${task.createdAt}, ${task.updatedAt}, ${task.isStale || false}, ${notesJson}::jsonb, ${cherrySubtasksJson}::jsonb, ${task.jevConfidence || null}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      raw_input = EXCLUDED.raw_input,
      category = EXCLUDED.category,
      priority = EXCLUDED.priority,
      urgency_score = EXCLUDED.urgency_score,
      tags = EXCLUDED.tags,
      due_date = EXCLUDED.due_date,
      due_date_iso = EXCLUDED.due_date_iso,
      completed = EXCLUDED.completed,
      completed_at = EXCLUDED.completed_at,
      updated_at = EXCLUDED.updated_at,
      is_stale = EXCLUDED.is_stale,
      notes = EXCLUDED.notes,
      cherry_subtasks = EXCLUDED.cherry_subtasks,
      jev_confidence = EXCLUDED.jev_confidence
    WHERE jev_tasks.user_id = ${userId};
  `;

  return true;
}

/**
 * Delete task strictly scoped to user_id.
 * If the task belongs to another user, 0 rows are affected (no cross-tenant deletion).
 */
export async function deleteTaskFromDB(id: string, userId: string): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureTables(sql);

  await sql`
    DELETE FROM jev_tasks 
    WHERE id = ${id} AND user_id = ${userId};
  `;
  return true;
}

/**
 * Batch sync tasks strictly scoped to user_id.
 */
export async function syncBatchTasksToDB(tasks: DBTask[], userId: string): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureTables(sql);

  for (const t of tasks) {
    await upsertTaskToDB(t, userId);
  }
  return true;
}

// ==================== Strict Multi-Tenant Operation Logs Methods ====================

/**
 * Fetch all operation logs strictly scoped to a specific user.
 * Cannot access operation logs of other users (anti-IDOR).
 */
export async function fetchAllOperationLogsFromDB(userId: string): Promise<DBOperationLog[] | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  await ensureTables(sql);

  const rows = await sql`
    SELECT * FROM jev_operation_logs 
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
    LIMIT 200;
  `;

  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    timestamp: Number(r.timestamp),
    type: r.type,
    title: r.title,
    description: r.description,
    affectedCount: Number(r.affected_count ?? 1),
    taskSnapshots: Array.isArray(r.task_snapshots) ? r.task_snapshots : []
  }));
}

/**
 * Insert or update an operation log strictly scoped to a specific user.
 */
export async function insertOperationLogToDB(log: DBOperationLog, userId: string): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureTables(sql);

  const snapshotsJson = JSON.stringify(log.taskSnapshots || []);

  await sql`
    INSERT INTO jev_operation_logs (
      id, user_id, timestamp, type, title, description, affected_count, task_snapshots
    ) VALUES (
      ${log.id}, ${userId}, ${log.timestamp}, ${log.type}, ${log.title}, ${log.description},
      ${log.affectedCount ?? 1}, ${snapshotsJson}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      affected_count = EXCLUDED.affected_count,
      task_snapshots = EXCLUDED.task_snapshots
    WHERE jev_operation_logs.user_id = ${userId};
  `;

  return true;
}

/**
 * Batch sync operation logs strictly scoped to a specific user.
 */
export async function syncBatchOperationLogsToDB(logs: DBOperationLog[], userId: string): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureTables(sql);

  for (const log of logs) {
    await insertOperationLogToDB(log, userId);
  }
  return true;
}

/**
 * Clear all operation logs strictly scoped to user_id.
 * If another user calls this, only their own records are deleted.
 */
export async function clearOperationLogsFromDB(userId: string): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureTables(sql);

  await sql`
    DELETE FROM jev_operation_logs 
    WHERE user_id = ${userId};
  `;
  return true;
}

