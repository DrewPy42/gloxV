import { Router, Request, Response } from 'express';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { query, pool } from '../controllers/db';

const router = Router();

type EntityType = 'series' | 'volume' | 'issue' | 'copy';

const LOCATION_LABEL = (alias: string) => `
  COALESCE(${alias}.location_name,
    CASE
      WHEN ${alias}.cabinet_number IS NOT NULL AND ${alias}.drawer_number IS NOT NULL AND ${alias}.divider IS NOT NULL
        THEN CONCAT('Cabinet ', ${alias}.cabinet_number, ' / Drawer ', ${alias}.drawer_number, ' / ', ${alias}.divider)
      WHEN ${alias}.cabinet_number IS NOT NULL AND ${alias}.drawer_number IS NOT NULL
        THEN CONCAT('Cabinet ', ${alias}.cabinet_number, ' / Drawer ', ${alias}.drawer_number)
      WHEN ${alias}.cabinet_number IS NOT NULL
        THEN CONCAT('Cabinet ', ${alias}.cabinet_number)
      ELSE ${alias}.storage_type
    END)`;

const EFFECTIVE_LOCATION = 'COALESCE(c.location_id, s.default_location_id)';

const toIds = (v: unknown): number[] =>
  Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => Number.isInteger(n) && n > 0))] : [];

const num = (v: unknown) => Number(v) || 0;

interface Selection {
  series: number[];
  volumes: number[];
  issues: number[];
  copies: number[];
}

const readSelection = (body: any): Selection => ({
  series: toIds(body?.series_ids),
  volumes: toIds(body?.volume_ids),
  issues: toIds(body?.issue_ids),
  copies: toIds(body?.copy_ids)
});

interface Cascade {
  series: RowDataPacket[];
  volumes: RowDataPacket[];
  issues: RowDataPacket[];
  copies: RowDataPacket[];
}

type Db = Pick<PoolConnection, 'query'>;

const q = async (db: Db, sql: string, params: unknown[]): Promise<RowDataPacket[]> => {
  const [rows] = await db.query(sql, params);
  return rows as RowDataPacket[];
};

// Expands a selection downward: a series takes its volumes and issues, a volume
// its issues, an issue its copies. Only live (not deleted) rows are returned.
async function resolveCascade(db: Db, sel: Selection): Promise<Cascade> {
  const series = sel.series.length
    ? await q(db, 'SELECT series_id, title FROM series WHERE deleted_at IS NULL AND series_id IN (?)', [sel.series])
    : [];
  const seriesIds = series.map((r) => r.series_id as number);

  const volumes =
    sel.volumes.length || seriesIds.length
      ? await q(
          db,
          `SELECT v.volume_id, v.volume_number, v.series_id, s.title
           FROM volume v JOIN series s ON s.series_id = v.series_id
           WHERE v.deleted_at IS NULL AND (v.volume_id IN (?) OR v.series_id IN (?))`,
          [sel.volumes.length ? sel.volumes : [0], seriesIds.length ? seriesIds : [0]]
        )
      : [];
  const volumeIds = volumes.map((r) => r.volume_id as number);

  const issues =
    sel.issues.length || seriesIds.length || volumeIds.length
      ? await q(
          db,
          `SELECT i.issue_id, i.issue_number, i.series_id, i.volume_id, s.title
           FROM issue i JOIN series s ON s.series_id = i.series_id
           WHERE i.deleted_at IS NULL
             AND (i.issue_id IN (?) OR i.series_id IN (?) OR i.volume_id IN (?))`,
          [
            sel.issues.length ? sel.issues : [0],
            seriesIds.length ? seriesIds : [0],
            volumeIds.length ? volumeIds : [0]
          ]
        )
      : [];
  const issueIds = issues.map((r) => r.issue_id as number);

  const copies =
    sel.copies.length || issueIds.length
      ? await q(
          db,
          `SELECT c.copy_id, c.issue_id, c.cover_price AS cost, c.current_value AS value,
                  i.issue_number, s.title
           FROM copy c
           JOIN issue i ON i.issue_id = c.issue_id
           JOIN series s ON s.series_id = i.series_id
           WHERE c.deleted_at IS NULL AND (c.copy_id IN (?) OR c.issue_id IN (?))`,
          [sel.copies.length ? sel.copies : [0], issueIds.length ? issueIds : [0]]
        )
      : [];

  return { series, volumes, issues, copies };
}

interface Suggestion {
  type: 'series' | 'volume' | 'issue';
  id: number;
  label: string;
  empty_issues: number; // extra issues with no copies that would go with it
  volumes: number;
}

// "Prompt up": records that would be left with no copies once the selection is
// removed. Expressed as cascade-down entities, highest level only.
async function findSuggestions(db: Db, c: Cascade): Promise<Suggestion[]> {
  const touched = new Set<number>();
  c.series.forEach((r) => touched.add(r.series_id));
  c.volumes.forEach((r) => touched.add(r.series_id));
  c.issues.forEach((r) => touched.add(r.series_id));
  if (c.copies.length) {
    const rows = await q(
      db,
      'SELECT DISTINCT series_id FROM issue WHERE issue_id IN (?)',
      [[...new Set(c.copies.map((r) => r.issue_id as number))]]
    );
    rows.forEach((r) => touched.add(r.series_id));
  }
  if (!touched.size) return [];
  const touchedIds = [...touched];

  const issueRows = await q(
    db,
    `SELECT i.issue_id, i.issue_number, i.series_id, i.volume_id, COUNT(c.copy_id) AS live_copies
     FROM issue i
     LEFT JOIN copy c ON c.issue_id = i.issue_id AND c.deleted_at IS NULL
     WHERE i.deleted_at IS NULL AND i.series_id IN (?)
     GROUP BY i.issue_id, i.issue_number, i.series_id, i.volume_id`,
    [touchedIds]
  );
  const volumeRows = await q(
    db,
    'SELECT volume_id, volume_number, series_id FROM volume WHERE deleted_at IS NULL AND series_id IN (?)',
    [touchedIds]
  );
  const seriesRows = await q(db, 'SELECT series_id, title FROM series WHERE series_id IN (?)', [touchedIds]);

  const goneSeries = new Set(c.series.map((r) => r.series_id as number));
  const goneVolumes = new Set(c.volumes.map((r) => r.volume_id as number));
  const goneIssues = new Set(c.issues.map((r) => r.issue_id as number));
  const removedCopies = new Map<number, number>();
  c.copies.forEach((r) => removedCopies.set(r.issue_id, (removedCopies.get(r.issue_id) || 0) + 1));

  // Issues left empty because their copies are going (suggested), or already empty.
  const suggestedIssues = new Set<number>();
  const emptyIssues = new Set<number>();
  for (const i of issueRows) {
    if (goneIssues.has(i.issue_id) || goneVolumes.has(i.volume_id) || goneSeries.has(i.series_id)) continue;
    const removed = removedCopies.get(i.issue_id) || 0;
    if (num(i.live_copies) - removed > 0) continue;
    if (removed > 0) suggestedIssues.add(i.issue_id);
    else emptyIssues.add(i.issue_id);
  }

  const remainingIssues = (pred: (i: RowDataPacket) => boolean) =>
    issueRows.filter((i) => pred(i) && !goneIssues.has(i.issue_id));
  const removable = (i: RowDataPacket) => suggestedIssues.has(i.issue_id) || emptyIssues.has(i.issue_id);

  const out: Suggestion[] = [];
  const coveredIssues = new Set<number>();
  const coveredVolumes = new Set<number>();

  // Series: every issue still alive in it is going or empty.
  for (const s of seriesRows) {
    if (goneSeries.has(s.series_id)) continue;
    const remaining = remainingIssues((i) => i.series_id === s.series_id && !goneVolumes.has(i.volume_id));
    if (!remaining.length && !goneIssues.size) continue;
    const suggestedHere = remaining.filter((i) => suggestedIssues.has(i.issue_id));
    const hasRemovals =
      suggestedHere.length > 0 ||
      issueRows.some((i) => i.series_id === s.series_id && goneIssues.has(i.issue_id)) ||
      volumeRows.some((v) => v.series_id === s.series_id && goneVolumes.has(v.volume_id));
    if (!hasRemovals || !remaining.every(removable)) continue;
    out.push({
      type: 'series',
      id: s.series_id,
      label: s.title,
      empty_issues: remaining.filter((i) => emptyIssues.has(i.issue_id)).length,
      volumes: volumeRows.filter((v) => v.series_id === s.series_id && !goneVolumes.has(v.volume_id)).length
    });
    remaining.forEach((i) => coveredIssues.add(i.issue_id));
    volumeRows.filter((v) => v.series_id === s.series_id).forEach((v) => coveredVolumes.add(v.volume_id));
  }

  // Volumes
  for (const v of volumeRows) {
    if (goneVolumes.has(v.volume_id) || coveredVolumes.has(v.volume_id) || goneSeries.has(v.series_id)) continue;
    const remaining = remainingIssues((i) => i.volume_id === v.volume_id);
    const hasRemovals =
      remaining.some((i) => suggestedIssues.has(i.issue_id)) ||
      issueRows.some((i) => i.volume_id === v.volume_id && goneIssues.has(i.issue_id));
    if (!hasRemovals || !remaining.every(removable)) continue;
    const title = seriesRows.find((s) => s.series_id === v.series_id)?.title;
    out.push({
      type: 'volume',
      id: v.volume_id,
      label: `${title} Vol. ${v.volume_number}`,
      empty_issues: remaining.filter((i) => emptyIssues.has(i.issue_id)).length,
      volumes: 0
    });
    remaining.forEach((i) => coveredIssues.add(i.issue_id));
  }

  // Remaining individually-emptied issues
  for (const i of issueRows) {
    if (!suggestedIssues.has(i.issue_id) || coveredIssues.has(i.issue_id)) continue;
    const title = seriesRows.find((s) => s.series_id === i.series_id)?.title;
    out.push({ type: 'issue', id: i.issue_id, label: `${title} #${i.issue_number}`, empty_issues: 0, volumes: 0 });
  }

  return out;
}

const summarize = (c: Cascade) => ({
  series: c.series.length,
  volumes: c.volumes.length,
  issues: c.issues.length,
  copies: c.copies.length,
  cost: c.copies.reduce((t, r) => t + num(r.cost), 0),
  value: c.copies.reduce((t, r) => t + num(r.value), 0)
});

// ---------------------------------------------------------------------------
// GET /api/audit/locations - every location with direct copy / verified counts
// ---------------------------------------------------------------------------
router.get('/api/audit/locations', async (_req: Request, res: Response) => {
  try {
    const locations = await query<RowDataPacket[]>(
      `SELECT l.location_id, l.parent_location_id, l.storage_type, ${LOCATION_LABEL('l')} AS label,
              COUNT(c.copy_id) AS copy_count,
              COALESCE(SUM(c.verified_at IS NOT NULL), 0) AS verified_count
       FROM location l
       LEFT JOIN (
         SELECT c.copy_id, c.verified_at, ${EFFECTIVE_LOCATION} AS loc
         FROM copy c
         JOIN issue i ON i.issue_id = c.issue_id AND i.deleted_at IS NULL
         JOIN series s ON s.series_id = i.series_id AND s.deleted_at IS NULL
         WHERE c.deleted_at IS NULL
       ) c ON c.loc = l.location_id
       WHERE l.deleted_at IS NULL
       GROUP BY l.location_id, l.parent_location_id, l.storage_type, label
       ORDER BY l.storage_type, l.cabinet_number, l.drawer_number, l.divider, l.location_id`
    );
    res.json({ results: locations });
  } catch (err) {
    console.error('Error fetching audit locations:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/audit/copies - copies in a location in shelf order
// ?location_id=N|unassigned &include_descendants=true &unverified_only=true
// ---------------------------------------------------------------------------
router.get('/api/audit/copies', async (req: Request, res: Response) => {
  try {
    const where = ['c.deleted_at IS NULL', 'i.deleted_at IS NULL', 's.deleted_at IS NULL'];
    const params: (string | number)[] = [];
    const locationId = req.query.location_id as string | undefined;

    if (!locationId) {
      res.status(400).json({ error: 'location_id is required' });
      return;
    }
    if (locationId === 'unassigned') {
      where.push(`${EFFECTIVE_LOCATION} IS NULL`);
    } else if (req.query.include_descendants === 'true') {
      where.push(`${EFFECTIVE_LOCATION} IN (
        WITH RECURSIVE d AS (
          SELECT location_id FROM location WHERE location_id = ? AND deleted_at IS NULL
          UNION ALL
          SELECT l2.location_id FROM location l2 JOIN d ON l2.parent_location_id = d.location_id
          WHERE l2.deleted_at IS NULL
        ) SELECT location_id FROM d)`);
      params.push(parseInt(locationId));
    } else {
      where.push(`${EFFECTIVE_LOCATION} = ?`);
      params.push(parseInt(locationId));
    }
    if (req.query.unverified_only === 'true') where.push('c.verified_at IS NULL');

    const limit = 3000;
    const results = await query<RowDataPacket[]>(
      `SELECT c.copy_id, c.issue_id, c.format, c.cover_price, c.current_value, c.grade, c.verified_at,
              cc.condition_code, cv.cover_type, cv.cover_description,
              i.issue_number, i.issue_title, i.volume_id, v.volume_number,
              s.series_id, s.title AS series_title,
              ${LOCATION_LABEL('l')} AS location_label,
              (SELECT COUNT(*) FROM copy c2 WHERE c2.issue_id = c.issue_id AND c2.deleted_at IS NULL) AS issue_copy_count
       FROM copy c
       JOIN issue i ON i.issue_id = c.issue_id
       JOIN series s ON s.series_id = i.series_id
       LEFT JOIN volume v ON v.volume_id = i.volume_id
       LEFT JOIN condition_code cc ON cc.condition_id = c.condition_id
       LEFT JOIN cover cv ON cv.copy_id = c.copy_id AND cv.deleted_at IS NULL
       LEFT JOIN location l ON l.location_id = ${EFFECTIVE_LOCATION}
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(s.sort_title, s.title), s.series_id, v.volume_number, i.sort_order, c.copy_id
       LIMIT ${limit}`,
      params
    );
    res.json({ results, truncated: results.length === limit });
  } catch (err) {
    console.error('Error fetching audit copies:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/audit/verify { copy_ids, verified }
// ---------------------------------------------------------------------------
router.post('/api/audit/verify', async (req: Request, res: Response) => {
  try {
    const ids = toIds(req.body?.copy_ids);
    if (!ids.length) {
      res.status(400).json({ error: 'copy_ids is required' });
      return;
    }
    const [result] = await pool.query(
      `UPDATE copy SET verified_at = ${req.body?.verified === false ? 'NULL' : 'NOW()'},
                       updated_at = updated_at
       WHERE deleted_at IS NULL AND copy_id IN (?)`,
      [ids]
    );
    res.json({ updated: (result as any).affectedRows });
  } catch (err) {
    console.error('Error updating verification:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/audit/preview - what a removal would touch, plus "prompt up" suggestions
// ---------------------------------------------------------------------------
router.post('/api/audit/preview', async (req: Request, res: Response) => {
  try {
    const cascade = await resolveCascade(pool, readSelection(req.body));
    res.json({ summary: summarize(cascade), suggestions: await findSuggestions(pool, cascade) });
  } catch (err) {
    console.error('Error previewing audit:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/audit/apply - soft delete the selection (and everything beneath it)
// ---------------------------------------------------------------------------
router.post('/api/audit/apply', async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const sel = readSelection(req.body);
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 255) || null : null;

    await conn.beginTransaction();
    const cascade = await resolveCascade(conn, sel);
    const total = cascade.series.length + cascade.volumes.length + cascade.issues.length + cascade.copies.length;
    if (!total) {
      await conn.rollback();
      res.status(400).json({ error: 'Nothing to remove' });
      return;
    }

    const [ins] = await conn.query('INSERT INTO audit_session (note) VALUES (?)', [note]);
    const sessionId = (ins as any).insertId as number;

    const items: (string | number | null)[][] = [
      ...cascade.series.map((r) => [sessionId, 'series', r.series_id, r.title, null, null]),
      ...cascade.volumes.map((r) => [sessionId, 'volume', r.volume_id, `${r.title} Vol. ${r.volume_number}`, null, null]),
      ...cascade.issues.map((r) => [sessionId, 'issue', r.issue_id, `${r.title} #${r.issue_number}`, null, null]),
      ...cascade.copies.map((r) => [
        sessionId, 'copy', r.copy_id, `${r.title} #${r.issue_number}`, r.cost ?? null, r.value ?? null
      ])
    ];
    for (let i = 0; i < items.length; i += 1000) {
      await conn.query(
        'INSERT INTO audit_session_item (audit_session_id, entity_type, entity_id, label, cost, value) VALUES ?',
        [items.slice(i, i + 1000)]
      );
    }

    // One timestamp for the whole batch so a restore can find what went together.
    const [[{ ts }]] = (await conn.query('SELECT NOW() AS ts')) as any;
    const mark = async (table: string, col: string, ids: number[]) => {
      if (!ids.length) return;
      await conn.query(`UPDATE ${table} SET deleted_at = ? WHERE deleted_at IS NULL AND ${col} IN (?)`, [ts, ids]);
    };
    await mark('copy', 'copy_id', cascade.copies.map((r) => r.copy_id));
    // Covers belong to copies; hide them with their copy.
    await mark('cover', 'copy_id', cascade.copies.map((r) => r.copy_id));
    await mark('issue', 'issue_id', cascade.issues.map((r) => r.issue_id));
    await mark('volume', 'volume_id', cascade.volumes.map((r) => r.volume_id));
    await mark('series', 'series_id', cascade.series.map((r) => r.series_id));

    await conn.commit();
    res.json({ audit_session_id: sessionId, summary: summarize(cascade) });
  } catch (err) {
    await conn.rollback();
    console.error('Error applying audit:', err);
    res.status(500).json({ error: 'Database error occurred' });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
router.get('/api/audit/sessions', async (_req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT a.audit_session_id, a.note, a.created_at, a.restored_at,
              COALESCE(SUM(x.entity_type = 'series'), 0) AS series_count,
              COALESCE(SUM(x.entity_type = 'volume'), 0) AS volume_count,
              COALESCE(SUM(x.entity_type = 'issue'), 0) AS issue_count,
              COALESCE(SUM(x.entity_type = 'copy'), 0) AS copy_count,
              COALESCE(SUM(x.cost), 0) AS cost, COALESCE(SUM(x.value), 0) AS value
       FROM audit_session a
       LEFT JOIN audit_session_item x ON x.audit_session_id = a.audit_session_id
       GROUP BY a.audit_session_id, a.note, a.created_at, a.restored_at
       ORDER BY a.audit_session_id DESC LIMIT 200`
    );
    res.json({ results });
  } catch (err) {
    console.error('Error fetching audit sessions:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

router.get('/api/audit/sessions/:id', async (req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT entity_type, entity_id, label, cost, value FROM audit_session_item
       WHERE audit_session_id = ?
       ORDER BY FIELD(entity_type, 'series', 'volume', 'issue', 'copy'), label LIMIT 2000`,
      [parseInt(req.params.id)]
    );
    res.json({ results });
  } catch (err) {
    console.error('Error fetching audit session items:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------
class RestoreBlocked extends Error {}

const TABLES: Record<EntityType, { table: string; id: string }> = {
  series: { table: 'series', id: 'series_id' },
  volume: { table: 'volume', id: 'volume_id' },
  issue: { table: 'issue', id: 'issue_id' },
  copy: { table: 'copy', id: 'copy_id' }
};

// Restores records, refusing when a parent is still deleted. With withChildren,
// children soft-deleted in the same batch (same deleted_at) come back too.
async function restore(conn: Db, type: EntityType, ids: number[], withChildren: boolean): Promise<number> {
  if (!ids.length) return 0;
  const t = TABLES[type];

  const blockers: Record<EntityType, string | null> = {
    series: null,
    volume: `SELECT x.${t.id} FROM volume x JOIN series p ON p.series_id = x.series_id
             WHERE x.volume_id IN (?) AND p.deleted_at IS NOT NULL`,
    issue: `SELECT x.issue_id FROM issue x
            LEFT JOIN series p ON p.series_id = x.series_id
            LEFT JOIN volume v ON v.volume_id = x.volume_id
            WHERE x.issue_id IN (?) AND (p.deleted_at IS NOT NULL OR v.deleted_at IS NOT NULL)`,
    copy: `SELECT x.copy_id FROM copy x JOIN issue p ON p.issue_id = x.issue_id
           WHERE x.copy_id IN (?) AND p.deleted_at IS NOT NULL`
  };
  const sql = blockers[type];
  if (sql) {
    // Parents that are themselves being restored in this call are fine, so only
    // block when the parent stays deleted; callers restore top-down in order.
    const blocked = await q(conn, sql, [ids]);
    if (blocked.length) {
      throw new RestoreBlocked(
        `${blocked.length} ${type}(s) belong to a deleted parent. Restore the parent first.`
      );
    }
  }

  let restored = 0;
  const run = async (sqlText: string, params: unknown[]) => {
    const [r] = await conn.query(sqlText, params);
    restored += (r as any).affectedRows || 0;
  };

  if (withChildren && type !== 'copy') {
    const stamps = await q(conn, `SELECT ${t.id} AS id, deleted_at FROM ${t.table} WHERE ${t.id} IN (?) AND deleted_at IS NOT NULL`, [ids]);
    for (const s of stamps) {
      if (type === 'series') {
        await run('UPDATE volume SET deleted_at = NULL WHERE series_id = ? AND deleted_at = ?', [s.id, s.deleted_at]);
      }
      const issueFilter = type === 'series' ? 'series_id' : type === 'volume' ? 'volume_id' : 'issue_id';
      const issueIds = (await q(conn, `SELECT issue_id FROM issue WHERE ${issueFilter} = ? AND deleted_at = ?`, [s.id, s.deleted_at])).map((r) => r.issue_id);
      if (type === 'issue') issueIds.push(s.id);
      if (issueIds.length) {
        const copyIds = (await q(conn, 'SELECT copy_id FROM copy WHERE issue_id IN (?) AND deleted_at = ?', [issueIds, s.deleted_at])).map((r) => r.copy_id);
        await run('UPDATE copy SET deleted_at = NULL WHERE issue_id IN (?) AND deleted_at = ?', [issueIds, s.deleted_at]);
        if (copyIds.length) await run('UPDATE cover SET deleted_at = NULL WHERE copy_id IN (?) AND deleted_at = ?', [copyIds, s.deleted_at]);
        if (type !== 'issue') await run('UPDATE issue SET deleted_at = NULL WHERE issue_id IN (?)', [issueIds]);
      }
    }
  }
  if (type === 'copy') {
    const [stamped] = [await q(conn, 'SELECT deleted_at FROM copy WHERE copy_id IN (?) AND deleted_at IS NOT NULL', [ids])];
    if (stamped.length) {
      await run('UPDATE cover SET deleted_at = NULL WHERE copy_id IN (?) AND deleted_at IN (?)', [ids, stamped.map((r) => r.deleted_at)]);
    }
  }
  await run(`UPDATE ${t.table} SET deleted_at = NULL WHERE ${t.id} IN (?) AND deleted_at IS NOT NULL`, [ids]);
  return restored;
}

// GET /api/audit/trash?type=series|volume|issue|copy
router.get('/api/audit/trash', async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as EntityType) || 'copy';
    const sqlByType: Record<EntityType, string> = {
      series: `SELECT s.series_id AS id, s.title AS label, s.deleted_at FROM series s
               WHERE s.deleted_at IS NOT NULL`,
      volume: `SELECT v.volume_id AS id, CONCAT(s.title, ' Vol. ', v.volume_number) AS label, v.deleted_at,
                      s.deleted_at IS NOT NULL AS parent_deleted
               FROM volume v JOIN series s ON s.series_id = v.series_id WHERE v.deleted_at IS NOT NULL`,
      issue: `SELECT i.issue_id AS id, CONCAT(s.title, ' #', i.issue_number) AS label, i.deleted_at,
                     s.deleted_at IS NOT NULL AS parent_deleted
              FROM issue i JOIN series s ON s.series_id = i.series_id WHERE i.deleted_at IS NOT NULL`,
      copy: `SELECT c.copy_id AS id, CONCAT(s.title, ' #', i.issue_number) AS label, c.deleted_at,
                    i.deleted_at IS NOT NULL AS parent_deleted, c.current_value AS value
             FROM copy c JOIN issue i ON i.issue_id = c.issue_id JOIN series s ON s.series_id = i.series_id
             WHERE c.deleted_at IS NOT NULL`
    };
    if (!sqlByType[type]) {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }
    const results = await query<RowDataPacket[]>(`${sqlByType[type]} ORDER BY deleted_at DESC LIMIT 1000`);
    res.json({ results });
  } catch (err) {
    console.error('Error fetching trash:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/audit/restore { type, ids }
router.post('/api/audit/restore', async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const type = req.body?.type as EntityType;
    const ids = toIds(req.body?.ids);
    if (!TABLES[type] || !ids.length) {
      res.status(400).json({ error: 'type and ids are required' });
      return;
    }
    await conn.beginTransaction();
    await restore(conn, type, ids, true);
    await conn.commit();
    res.json({ message: 'Restored' });
  } catch (err) {
    await conn.rollback();
    if (err instanceof RestoreBlocked) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error('Error restoring:', err);
    res.status(500).json({ error: 'Database error occurred' });
  } finally {
    conn.release();
  }
});

// POST /api/audit/sessions/:id/restore - undo a whole audit batch
router.post('/api/audit/sessions/:id/restore', async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const sessionId = parseInt(req.params.id);
    await conn.beginTransaction();
    const [sess] = await conn.query('SELECT restored_at FROM audit_session WHERE audit_session_id = ? FOR UPDATE', [sessionId]);
    const row = (sess as RowDataPacket[])[0];
    if (!row) {
      await conn.rollback();
      res.status(404).json({ error: 'Audit session not found' });
      return;
    }
    if (row.restored_at) {
      await conn.rollback();
      res.status(409).json({ error: 'This audit was already restored' });
      return;
    }
    const items = await q(conn, 'SELECT entity_type, entity_id FROM audit_session_item WHERE audit_session_id = ?', [sessionId]);
    for (const type of ['series', 'volume', 'issue', 'copy'] as EntityType[]) {
      const ids = items.filter((i) => i.entity_type === type).map((i) => i.entity_id as number);
      await restore(conn, type, ids, false);
    }
    await conn.query('UPDATE audit_session SET restored_at = NOW() WHERE audit_session_id = ?', [sessionId]);
    await conn.commit();
    res.json({ message: 'Audit restored' });
  } catch (err) {
    await conn.rollback();
    if (err instanceof RestoreBlocked) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error('Error restoring audit session:', err);
    res.status(500).json({ error: 'Database error occurred' });
  } finally {
    conn.release();
  }
});

export default router;
