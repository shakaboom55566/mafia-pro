/* Minimal D1 look-alike on top of Node's built-in SQLite, enough for the worker's prepare().bind().run()/first()/all(). */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function makeD1(schemaPath) {
  const db = new DatabaseSync(':memory:');
  if (schemaPath) db.exec(readFileSync(schemaPath, 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a.map(v => (v === undefined ? null : v))),
    run: async () => { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
    first: async (col) => { const r = db.prepare(sql).get(...args); if (!r) return null; return col ? r[col] : { ...r }; },
    all: async () => ({ success: true, results: db.prepare(sql).all(...args).map(r => ({ ...r })), meta: {} }),
    raw: async () => db.prepare(sql).all(...args).map(r => Object.values(r))
  });
  return { prepare: sql => stmt(sql), exec: async sql => db.exec(sql), _db: db };
}
