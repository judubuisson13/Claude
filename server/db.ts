// Stockage SQLite local, même table `records` que la v11 (D1) : user_id, id, kind, data, version, updated_at.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Row = { id: string; kind: string; data: string; version: number; updated_at: string };

export function openDb(file: string) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS records (
    user_id TEXT NOT NULL,
    id TEXT NOT NULL,
    kind TEXT NOT NULL,
    data TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
  )`);
  return db;
}

export type Db = ReturnType<typeof openDb>;

export function listRecords(db: Db, user: string) {
  return db.prepare('SELECT id, kind, data, version, updated_at FROM records WHERE user_id = ?').all(user) as Row[];
}

export class ConflictError extends Error {}

/** POST /api/data — version de DÉPART : 0 = création, n = mise à jour de la version n. */
export function writeOne(db: Db, user: string, r: { id: string; kind: string; data: unknown; version: number }) {
  const now = new Date().toISOString();
  const json = JSON.stringify(r.data);
  if (r.version === 0) {
    const q = db.prepare('INSERT INTO records(user_id,id,kind,data,version,updated_at) VALUES(?,?,?,?,1,?) ON CONFLICT(user_id,id) DO NOTHING').run(user, r.id, r.kind, json, now);
    if (!q.changes) throw new ConflictError('Cette fiche existe déjà.');
    return 1;
  }
  const q = db.prepare('UPDATE records SET data=?, version=version+1, updated_at=? WHERE user_id=? AND id=? AND kind=? AND version=?').run(json, now, user, r.id, r.kind, r.version);
  if (!q.changes) throw new ConflictError('Cette fiche a changé, recharge la page.');
  return r.version + 1;
}

/**
 * POST /api/debrief — version CIBLE : 1 = création, n+1 = mise à jour de n.
 * Tout ou rien ; une répétition strictement identique est acceptée (idempotence).
 */
export function writeBatch(db: Db, user: string, entries: { id: string; kind: string; data: unknown; version: number }[]) {
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of entries) {
      const json = JSON.stringify(r.data);
      if (r.version === 1) {
        db.prepare('INSERT INTO records(user_id,id,kind,data,version,updated_at) VALUES(?,?,?,?,1,?) ON CONFLICT(user_id,id) DO NOTHING').run(user, r.id, r.kind, json, now);
      } else {
        db.prepare('UPDATE records SET data=?, version=?, updated_at=? WHERE user_id=? AND id=? AND kind=? AND version=?').run(json, r.version, now, user, r.id, r.kind, r.version - 1);
      }
      const check = db.prepare('SELECT 1 AS ok FROM records WHERE user_id=? AND id=? AND kind=? AND version=? AND data=?').get(user, r.id, r.kind, r.version, json);
      if (!check) throw new ConflictError(`Conflit sur la fiche ${r.id}`);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Import d'un export (v11 ou v12) : conserve id, kind, version et updated_at. N'écrase jamais une fiche existante. */
export function importRows(db: Db, user: string, rows: { id: string; kind: string; data: unknown; version?: number; updated_at?: string }[]) {
  let created = 0;
  let skipped = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of rows) {
      const q = db
        .prepare('INSERT INTO records(user_id,id,kind,data,version,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,id) DO NOTHING')
        .run(user, r.id, r.kind, typeof r.data === 'string' ? r.data : JSON.stringify(r.data), Number(r.version) || 1, r.updated_at || new Date().toISOString());
      if (q.changes) created++;
      else skipped++;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { created, skipped };
}
