/**
 * kolbassnik.kikkey.com — edge worker.
 *
 * - Serves the static Astro build (Workers Static Assets, same CDN as Cloudflare Pages).
 * - "/" → 302 to /ru/ or /he/ by Accept-Language.
 * - /api/comments* → Figma-style review comments stored in a SQLite-backed Durable Object.
 * - New comments / replies trigger a notification (webhook and/or ntfy push + e-mail forward).
 *
 * No secrets live in the repo. Configure them with `wrangler secret put …` (see README).
 */
import { DurableObject } from 'cloudflare:workers';

const MAX_BODY = 2000;
const MAX_NAME = 60;
const LANGS = new Set(['ru', 'he']);

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(init.headers || {}),
    },
  });

const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

const num = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      const al = (request.headers.get('accept-language') || '').toLowerCase();
      const he = /(^|,)\s*(he|iw)\b/.test(al) && !/^\s*ru\b/.test(al);
      return new Response(null, {
        status: 302,
        headers: { location: `/${he ? 'he' : 'ru'}/${url.search}`, vary: 'accept-language', 'cache-control': 'no-store' },
      });
    }

    if (url.pathname.startsWith('/api/comments')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      // Only same-origin writes (the overlay is served from this host).
      if (request.method !== 'GET') {
        const origin = request.headers.get('origin');
        let sameOrigin = true;
        try {
          sameOrigin = !origin || new URL(origin).host === url.host;
        } catch {
          sameOrigin = false;
        }
        if (!sameOrigin) return json({ error: 'forbidden' }, { status: 403 });
      }
      const stub = env.COMMENTS.get(env.COMMENTS.idFromName('kolbassnik-home'));
      const res = await stub.handle({
        method: request.method,
        path: url.pathname,
        search: url.search,
        body: request.method === 'GET' ? null : await request.text(),
        ip: request.headers.get('cf-connecting-ip') || '0.0.0.0',
        ua: (request.headers.get('user-agent') || '').slice(0, 160),
      });
      if (res.notify) ctx.waitUntil(notify(env, res.notify, url.origin));
      return json(res.body, { status: res.status });
    }

    return env.ASSETS.fetch(request);
  },
};

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

async function notify(env, evt, origin) {
  const link = `${env.SITE_URL || origin}${evt.page}?comments=1#comment-${evt.number}`;
  const head =
    evt.kind === 'thread'
      ? `Новый комментарий #${evt.number} (${evt.lang.toUpperCase()}) от ${evt.author}`
      : evt.kind === 'reply'
        ? `Ответ в #${evt.number} (${evt.lang.toUpperCase()}) от ${evt.author}`
        : `#${evt.number} отмечен «${evt.resolved ? 'решено' : 'открыт снова'}» — ${evt.author}`;
  const text = `${head}\n«${evt.body || ''}»\n${link}`;
  const jobs = [];

  if (env.NOTIFY_WEBHOOK_URL) {
    // Works as-is for Slack ("text"), Discord ("content") and any generic JSON receiver (Make, Zapier, n8n…).
    jobs.push(
      fetch(env.NOTIFY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, content: text, event: evt, link }),
      }),
    );
  }

  if (env.NTFY_TOPIC) {
    const headers = {
      Title: encodeRFC2047(head),
      Click: link,
      Tags: 'speech_balloon',
    };
    if (env.NTFY_EMAIL) headers.Email = env.NTFY_EMAIL;
    jobs.push(
      fetch(`${env.NTFY_SERVER || 'https://ntfy.sh'}/${env.NTFY_TOPIC}`, {
        method: 'POST',
        headers,
        body: `«${evt.body || ''}»\n${link}`,
      }),
    );
  }

  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') console.error('notify failed', r.reason);
    else if (!r.value.ok) console.error('notify http', r.value.status, await r.value.text().catch(() => ''));
  }
}

// HTTP headers must be ASCII; ntfy accepts RFC 2047 encoded-words for UTF-8 titles.
function encodeRFC2047(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

/* ------------------------------------------------------------------ */
/* Durable Object: one SQLite database for all review comments         */
/* ------------------------------------------------------------------ */

export class CommentsStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.hits = new Map();
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        page TEXT NOT NULL,
        lang TEXT NOT NULL,
        dir TEXT NOT NULL,
        selector TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        page_x REAL,
        page_y REAL,
        doc_h REAL,
        vw INTEGER,
        vh INTEGER,
        section TEXT,
        snippet TEXT,
        author TEXT NOT NULL,
        client TEXT,
        body TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolved_by TEXT,
        resolved_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS replies (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        author TEXT NOT NULL,
        client TEXT,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS replies_thread ON replies(thread_id);
    `);
  }

  limited(ip) {
    // ≤ 30 writes per IP per 10 minutes — enough for a review session, stops floods.
    const now = Date.now();
    const arr = (this.hits.get(ip) || []).filter((t) => now - t < 600_000);
    arr.push(now);
    this.hits.set(ip, arr);
    return arr.length > 30;
  }

  list() {
    const threads = this.sql.exec('SELECT * FROM threads ORDER BY number ASC').toArray();
    const replies = this.sql.exec('SELECT * FROM replies ORDER BY created_at ASC').toArray();
    const byThread = new Map();
    for (const r of replies) {
      const { client, ...pub } = r;
      if (!byThread.has(r.thread_id)) byThread.set(r.thread_id, []);
      byThread.get(r.thread_id).push(pub);
    }
    return threads.map(({ client, ...t }) => ({ ...t, resolved: !!t.resolved, replies: byThread.get(t.id) || [] }));
  }

  async handle({ method, path, search, body, ip }) {
    const parts = path.replace(/\/+$/, '').split('/').slice(3); // after /api/comments
    let data = {};
    if (body) {
      if (body.length > 10_000) return { status: 413, body: { error: 'too_large' } };
      try {
        data = JSON.parse(body);
      } catch {
        return { status: 400, body: { error: 'bad_json' } };
      }
    }

    if (method === 'GET' && parts.length === 0) {
      return { status: 200, body: { threads: this.list() } };
    }

    if (method !== 'GET' && this.limited(ip)) return { status: 429, body: { error: 'rate_limited' } };
    if (data.website) return { status: 200, body: { ok: true } }; // honeypot

    const author = clean(data.author, MAX_NAME);
    const client = clean(data.client, 64);

    // POST /api/comments → new thread
    if (method === 'POST' && parts.length === 0) {
      const text = clean(data.body, MAX_BODY);
      const lang = LANGS.has(data.lang) ? data.lang : null;
      const selector = clean(data.selector, 400);
      const x = num(data.x, 0, 1);
      const y = num(data.y, 0, 1);
      if (!text || !author || !lang || !selector || x === null || y === null)
        return { status: 400, body: { error: 'missing_fields' } };
      const page = `/${lang}/`;
      const number = (this.sql.exec('SELECT COALESCE(MAX(number),0)+1 AS n FROM threads').one().n) | 0;
      const row = {
        id: crypto.randomUUID(),
        number,
        page,
        lang,
        dir: lang === 'he' ? 'rtl' : 'ltr',
        selector,
        x,
        y,
        page_x: num(data.page_x, 0, 1),
        page_y: num(data.page_y, 0, 1e6),
        doc_h: num(data.doc_h, 0, 1e6),
        vw: num(data.vw, 0, 10000),
        vh: num(data.vh, 0, 10000),
        section: clean(data.section, 80) || null,
        snippet: clean(data.snippet, 120) || null,
        author,
        client,
        body: text,
        created_at: Date.now(),
      };
      this.sql.exec(
        `INSERT INTO threads (id,number,page,lang,dir,selector,x,y,page_x,page_y,doc_h,vw,vh,section,snippet,author,client,body,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        row.id, row.number, row.page, row.lang, row.dir, row.selector, row.x, row.y, row.page_x, row.page_y, row.doc_h,
        row.vw, row.vh, row.section, row.snippet, row.author, row.client, row.body, row.created_at,
      );
      const { client: _c, ...pub } = row;
      return {
        status: 201,
        body: { thread: { ...pub, resolved: false, replies: [] } },
        notify: { kind: 'thread', number, lang, page, author, body: text },
      };
    }

    const id = parts[0];
    const thread = id ? this.sql.exec('SELECT * FROM threads WHERE id = ?', id).toArray()[0] : null;
    if (!thread) return { status: 404, body: { error: 'not_found' } };

    // POST /api/comments/:id/replies
    if (method === 'POST' && parts[1] === 'replies') {
      const text = clean(data.body, MAX_BODY);
      if (!text || !author) return { status: 400, body: { error: 'missing_fields' } };
      const reply = { id: crypto.randomUUID(), thread_id: id, author, body: text, created_at: Date.now() };
      this.sql.exec(
        'INSERT INTO replies (id,thread_id,author,client,body,created_at) VALUES (?,?,?,?,?,?)',
        reply.id, id, author, client, text, reply.created_at,
      );
      return {
        status: 201,
        body: { reply },
        notify: { kind: 'reply', number: thread.number, lang: thread.lang, page: thread.page, author, body: text },
      };
    }

    // PATCH /api/comments/:id  { resolved: bool }
    if (method === 'PATCH' && parts.length === 1) {
      const resolved = !!data.resolved;
      this.sql.exec(
        'UPDATE threads SET resolved = ?, resolved_by = ?, resolved_at = ? WHERE id = ?',
        resolved ? 1 : 0, resolved ? author || null : null, resolved ? Date.now() : null, id,
      );
      return {
        status: 200,
        body: { ok: true, resolved },
        notify: { kind: 'resolve', number: thread.number, lang: thread.lang, page: thread.page, author: author || '—', resolved },
      };
    }

    // DELETE /api/comments/:id — only the browser that created it
    if (method === 'DELETE' && parts.length === 1) {
      if (!client || client !== thread.client) return { status: 403, body: { error: 'not_owner' } };
      this.sql.exec('DELETE FROM replies WHERE thread_id = ?', id);
      this.sql.exec('DELETE FROM threads WHERE id = ?', id);
      return { status: 200, body: { ok: true } };
    }

    return { status: 405, body: { error: 'method_not_allowed' } };
  }
}
