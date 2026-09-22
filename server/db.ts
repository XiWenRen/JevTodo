import { neon } from '@neondatabase/serverless';

export interface DBTask {
  id: string;
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
  isStale?: boolean;
  jevConfidence?: number;
}

function getDatabaseUrl(): string | null {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || null;
}

let tableInitialized = false;

async function ensureTable(sql: any) {
  if (tableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS jev_tasks (
        id VARCHAR(128) PRIMARY KEY,
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
        jev_confidence REAL
      );
    `;
    tableInitialized = true;
  } catch (err) {
    console.warn('Failed to ensure jev_tasks table:', err);
  }
}

export function isCloudDBConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export async function fetchAllTasksFromDB(): Promise<DBTask[] | null> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return null;

  const sql = neon(dbUrl);
  await ensureTable(sql);

  const rows = await sql`
    SELECT * FROM jev_tasks ORDER BY created_at DESC;
  `;

  return rows.map((r: any) => ({
    id: r.id,
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
    jevConfidence: r.jev_confidence ?? undefined
  }));
}

export async function upsertTaskToDB(task: DBTask): Promise<boolean> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return false;

  const sql = neon(dbUrl);
  await ensureTable(sql);

  const tagsJson = JSON.stringify(task.tags || []);

  await sql`
    INSERT INTO jev_tasks (
      id, title, raw_input, category, priority, urgency_score, 
      tags, due_date, due_date_iso, completed, completed_at, 
      created_at, updated_at, is_stale, jev_confidence
    ) VALUES (
      ${task.id}, ${task.title}, ${task.rawInput || null}, ${task.category}, ${task.priority}, ${task.urgencyScore ?? 0.5},
      ${tagsJson}::jsonb, ${task.dueDate || null}, ${task.dueDateIso || null}, ${task.completed}, ${task.completedAt || null},
      ${task.createdAt}, ${task.updatedAt}, ${task.isStale || false}, ${task.jevConfidence || null}
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
      jev_confidence = EXCLUDED.jev_confidence;
  `;

  return true;
}

export async function deleteTaskFromDB(id: string): Promise<boolean> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return false;

  const sql = neon(dbUrl);
  await ensureTable(sql);

  await sql`
    DELETE FROM jev_tasks WHERE id = ${id};
  `;
  return true;
}

export async function syncBatchTasksToDB(tasks: DBTask[]): Promise<boolean> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return false;

  const sql = neon(dbUrl);
  await ensureTable(sql);

  for (const t of tasks) {
    await upsertTaskToDB(t);
  }
  return true;
}
