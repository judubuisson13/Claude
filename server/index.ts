// Serveur Tempo Play v12 : API de la v11 (mêmes contrats de version) + analyse IA + export/import.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { ComposeKinds, type ComposeKind } from '../src/lib/analysis-schema';
import { today, type RecordItem } from '../src/lib/debrief-model';
import { templateMessage } from '../src/lib/insights';
import { analyseLocally } from '../src/lib/local-analyzer';
import { aiEnabled, analyseWithClaude, composeWithClaude } from './ai';
import { knownContext } from '../src/lib/prompt';
import { ConflictError, importRows, listRecords, openDb, writeBatch, writeOne } from './db';

const PORT = Number(process.env.PORT || 8787);
const DB_FILE = process.env.TEMPO_DB || join(process.cwd(), 'data', 'tempo.sqlite');
// Identité : instance mono-utilisateur par défaut. Ne jamais lire l'identité depuis un en-tête
// envoyé par le navigateur ; brancher ici un vrai fournisseur d'authentification pour le multi-utilisateur.
const USER = process.env.TEMPO_USER_ID || 'local';
const DEBRIEF_KINDS = ['account', 'contact', 'candidate', 'consultant', 'opportunity', 'task', 'activity', 'topic', 'meeting'];
const ALL_KINDS = [...DEBRIEF_KINDS, 'goal', 'billing'];
const DIST = join(process.cwd(), 'dist');

const db = openDb(DB_FILE);

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage, limit = 4_000_000): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function items(): RecordItem[] {
  return listRecords(db, USER).map((r) => ({ id: r.id, kind: r.kind, version: r.version, data: JSON.parse(r.data) }));
}


async function api(req: IncomingMessage, res: ServerResponse, path: string) {
  const method = req.method || 'GET';

  if (path === '/api/status') return send(res, 200, { ok: true, ai: aiEnabled(), user: USER, today: today() });

  if (path === '/api/data' && method === 'GET') {
    return send(res, 200, { items: items(), demo: false });
  }

  if (path === '/api/data' && method === 'POST') {
    const b = await readJson(req);
    if (!b.id || typeof b.id !== 'string' || !ALL_KINDS.includes(b.kind) || !b.data || typeof b.data !== 'object') return send(res, 400, { error: 'Données invalides.' });
    const v = Number(b.version || 0);
    if (!Number.isInteger(v) || v < 0) return send(res, 400, { error: 'Version invalide.' });
    try {
      const version = writeOne(db, USER, { id: b.id, kind: b.kind, data: b.data, version: v });
      return send(res, 200, { item: { id: b.id, kind: b.kind, data: b.data, version } });
    } catch (e) {
      if (e instanceof ConflictError) return send(res, 409, { error: e.message });
      throw e;
    }
  }

  if (path === '/api/debrief' && method === 'POST') {
    const body = await readJson(req);
    const entries = body.items;
    if (
      !Array.isArray(entries) || !entries.length || entries.length > 160 ||
      new Set(entries.map((x: any) => x.id)).size !== entries.length ||
      entries.some((x: any) => !x.id || typeof x.id !== 'string' || !DEBRIEF_KINDS.includes(x.kind) || !Number.isInteger(x.version) || x.version < 1 || !x.data || typeof x.data !== 'object')
    ) return send(res, 400, { error: 'Débrief invalide.' });
    if (entries.some((x: any) => JSON.stringify(x.data).length > 50_000)) return send(res, 400, { error: 'Un compte rendu est trop long.' });
    try {
      writeBatch(db, USER, entries);
      return send(res, 200, { items: entries });
    } catch {
      return send(res, 409, { error: 'Le débrief n’a pas été enregistré. Si une fiche a changé, recharge puis reprends la validation.' });
    }
  }

  if (path === '/api/analyze' && method === 'POST') {
    const b = await readJson(req, 400_000);
    const text = String(b.text || '').trim().slice(0, 20_000);
    if (!text) return send(res, 400, { error: 'Récit vide.' });
    // En mode démo, les fiches sont fictives et vivent dans le navigateur : on les reçoit pour le contexte.
    const list: RecordItem[] = b.demo && Array.isArray(b.items) ? b.items.slice(0, 2000) : items();
    const history = Array.isArray(b.history) ? b.history.slice(-12).map((h: any) => ({ role: h.role === 'copilot' ? 'copilot' : 'user', text: String(h.text || '').slice(0, 2000) })) : [];
    if (aiEnabled()) {
      try {
        const analysis = await analyseWithClaude(text, { today: today(), persona: String(b.persona || ''), known: knownContext(list), history });
        return send(res, 200, { analysis, engine: 'claude' });
      } catch (e) {
        console.error('[analyze] Claude indisponible, analyse locale :', (e as Error).message);
        return send(res, 200, { analysis: analyseLocally(text, list), engine: 'local', warning: 'Analyse IA indisponible : analyse locale utilisée.' });
      }
    }
    return send(res, 200, { analysis: analyseLocally(text, list), engine: 'local' });
  }

  if (path === '/api/compose' && method === 'POST') {
    const b = await readJson(req, 100_000);
    const kind = ComposeKinds.includes(b.kind) ? (b.kind as ComposeKind) : 'followup';
    const person = String(b.person || '').slice(0, 120);
    const fallback = { subject: '', message: templateMessage(kind, person, { client: b.client, sender: b.sender }) };
    if (!aiEnabled()) return send(res, 200, { ...fallback, engine: 'local' });
    try {
      const out = await composeWithClaude(kind, person, String(b.details || '').slice(0, 2000), String(b.tone || ''));
      return send(res, 200, { ...out, engine: 'claude' });
    } catch {
      return send(res, 200, { ...fallback, engine: 'local' });
    }
  }

  if (path === '/api/export' && method === 'GET') {
    const rows = listRecords(db, USER).map((r) => ({ ...r, user_id: USER, data: JSON.parse(r.data) }));
    res.setHeader('Content-Disposition', `attachment; filename="tempo-export-${today()}.json"`);
    return send(res, 200, { exportedAt: new Date().toISOString(), format: 'tempo-records-v1', count: rows.length, rows });
  }

  if (path === '/api/import' && method === 'POST') {
    const b = await readJson(req, 20_000_000);
    const rows = Array.isArray(b.rows) ? b.rows : Array.isArray(b.items) ? b.items : null;
    if (!rows || rows.some((r: any) => !r.id || typeof r.id !== 'string' || !ALL_KINDS.includes(r.kind) || r.data == null)) return send(res, 400, { error: 'Fichier d’import invalide.' });
    return send(res, 200, importRows(db, USER, rows));
  }

  return send(res, 404, { error: 'Introuvable.' });
}

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

function serveStatic(res: ServerResponse, path: string) {
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('Lance « npm run build » ou utilise « npm run dev ».');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  try {
    if (path.startsWith('/api/')) await api(req, res, path);
    else serveStatic(res, path);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'Erreur serveur.' });
  }
});

const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`Tempo API sur http://${HOST}:${PORT} · IA ${aiEnabled() ? 'Claude activée' : 'désactivée (analyse locale)'} · base ${DB_FILE}`);
});
