/* Minimal D1 look-alike on top of Node's built-in SQLite, enough for the worker's prepare().bind().run()/first()/all() and batch(). */
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
  // D1's batch(): the statements run in one transaction, all or nothing
  const batch = async list => { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  return { prepare: sql => stmt(sql), exec: async sql => db.exec(sql), batch, _db: db };
}
