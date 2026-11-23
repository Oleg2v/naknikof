/**
 * kolbassnik.kikkey.com — edge worker.
 *
 * - Serves the static Astro build (Workers Static Assets, same CDN as Cloudflare Pages).
 * - "/" → 302 to /ru/ or /he/ by Accept-Language (q-values respected, default ru).
 * - /api/comments[/…] → Figma-style review comments stored in a SQLite-backed Durable Object.
 * - New comments / replies / status changes trigger notifications: e-mail (Resend), Telegram, ntfy or any webhook —
 *   whichever secrets are configured (see README).
 *
 * No secrets live in the repo. Configure them with `wrangler secret put …` (see README).
 */
import { DurableObject } from 'cloudflare:workers';

const MAX_BODY = 2000;
const MAX_NAME = 60;
const MAX_REQUEST = 10_000; // bytes
const MAX_THREADS = 1000;
const MAX_REPLIES = 100;
const LANGS = new Set(['ru', 'he']);
const API = /^\/api\/comments(?:\/|$)/;

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

/** Free text: drop control characters except newlines/tabs. */
const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

/** Names and other one-line fields: collapse all whitespace and strip bidi/format controls. */
const oneLine = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁠-⁩﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const num = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

/** Pick ru/he from Accept-Language honouring q-values and order; default ru. */
function pickLang(header) {
  const prefs = String(header || '')
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { tag: tag.split('-')[0], q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((p) => p.tag && Number.isFinite(p.q) && p.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const p of prefs) {
    if (p.tag === 'ru') return 'ru';
    if (p.tag === 'he' || p.tag === 'iw') return 'he';
  }
  return 'ru';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      const lang = pickLang(request.headers.get('accept-language'));
      return new Response(null, {
        status: 302,
        headers: { location: `/${lang}/${url.search}`, vary: 'accept-language', 'cache-control': 'no-store' },
      });
    }

    if (API.test(url.pathname)) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      let body = null;
      if (request.method !== 'GET') {
        // Only same-origin writes (the overlay is served from this host).
        const origin = request.headers.get('origin');
        let sameOrigin = true;
        try {
          sameOrigin = !origin || new URL(origin).host === url.host;
        } catch {
          sameOrigin = false;
        }
        if (!sameOrigin) return json({ error: 'forbidden' }, { status: 403 });
        const len = Number(request.headers.get('content-length') || 0);
        if (len > MAX_REQUEST) return json({ error: 'too_large' }, { status: 413 });
        body = await readCapped(request, MAX_REQUEST);
        if (body === null) return json({ error: 'too_large' }, { status: 413 });
      }
      const stub = env.COMMENTS.get(env.COMMENTS.idFromName('kolbassnik-home'));
      const res = await stub.handle({
        method: request.method,
        path: url.pathname,
        body,
        ip: request.headers.get('cf-connecting-ip') || '0.0.0.0',
      });
      if (res.notify) ctx.waitUntil(notify(env, res.notify, url.origin));
      return json(res.body, { status: res.status });
    }

    return env.ASSETS.fetch(request);
  },
};

/** Read at most `max` bytes of the request body; null when it is larger. */
async function readCapped(request, max) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Slack mrkdwn: & < > must be escaped so user text cannot create <!channel> pings or disguised links.
const slack = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function notify(env, evt, origin) {
  const link = `${env.SITE_URL || origin}${evt.page}?comments=1#comment-${evt.number}`;
  const who = `«${evt.author}»`;
  const head =
    evt.kind === 'thread'
      ? `Новый комментарий #${evt.number} (${evt.lang.toUpperCase()}) — ${who}`
      : evt.kind === 'reply'
        ? `Ответ в #${evt.number} (${evt.lang.toUpperCase()}) — ${who}`
        : `#${evt.number} — ${evt.resolved ? 'решено' : 'открыт снова'} (${who})`;
  const quote = evt.body ? `«${evt.body}»` : '';
  const text = [head, quote, link].filter(Boolean).join('\n');
  const jobs = [];

  if (env.NOTIFY_WEBHOOK_URL) {
    // Slack reads "text" (escaped), Discord reads "content" (mentions disabled); generic receivers get "event".
    jobs.push(
      fetch(env.NOTIFY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: [slack(head), slack(quote), link].filter(Boolean).join('\n'),
          content: text,
          allowed_mentions: { parse: [] },
          event: evt,
          link,
        }),
      }),
    );
  }

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    // E-mail via Resend (free plan). Without a verified domain Resend delivers from onboarding@resend.dev
    // to the address the Resend account was registered with — register it with NOTIFY_EMAIL.
    jobs.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: env.NOTIFY_FROM || 'Kolbassnik review <onboarding@resend.dev>',
          to: [env.NOTIFY_EMAIL],
          subject: `Kolbassnik: ${head}`.slice(0, 180),
          text,
          html: `<p style="font:16px/1.5 sans-serif"><b>${esc(head)}</b></p>${evt.body ? `<blockquote style="font:16px/1.5 sans-serif;border-left:3px solid #6e1634;margin:0;padding:4px 12px;white-space:pre-wrap">${esc(evt.body)}</blockquote>` : ''}<p><a href="${esc(link)}">Открыть на странице →</a></p>`,
        }),
      }),
    );
  }

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    // Plain text (no parse_mode): user input cannot inject markup.
    jobs.push(
      fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      }),
    );
  }

  if (env.NTFY_TOPIC && env.NTFY_TOKEN) {
    // ntfy needs an access token from Workers: anonymous quotas are per IP and Workers share egress IPs.
    jobs.push(
      fetch(`${env.NTFY_SERVER || 'https://ntfy.sh'}/${env.NTFY_TOPIC}`, {
        method: 'POST',
        headers: { Title: encodeRFC2047(head), Click: link, Tags: 'speech_balloon', authorization: `Bearer ${env.NTFY_TOKEN}` },
        body: [quote, link].filter(Boolean).join('\n'),
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

const WINDOW = 600_000; // rate-limit window: 10 minutes
const PER_CLIENT = 30; // writes per IPv4 / IPv6 /64 per window
const GLOBAL_PER_HOUR = 300; // all writes
const NOTIFY_PER_HOUR = 60; // notifications sent

/** Rate-limit key: full IPv4, or the /64 prefix of an IPv6 address. */
const ipKey = (ip) => (ip.includes(':') ? ip.split(':').slice(0, 4).join(':') + '::/64' : ip);

export class CommentsStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
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
      CREATE UNIQUE INDEX IF NOT EXISTS threads_number ON threads(number);
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, n INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS hits (k TEXT NOT NULL, t INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS hits_k_t ON hits(k, t);
    `);
    // Monotonic comment numbers: never reused, even after a delete (old notification links stay valid).
    this.sql.exec(`INSERT OR IGNORE INTO meta (k, n) VALUES ('seq', (SELECT COALESCE(MAX(number), 0) FROM threads))`);
  }

  /** Returns true when the write must be rejected. Counters persist in SQLite (survive DO eviction). */
  limited(ip) {
    const now = Date.now();
    this.sql.exec('DELETE FROM hits WHERE t < ?', now - 3_600_000);
    const key = ipKey(ip);
    const mine = this.sql.exec('SELECT COUNT(*) AS c FROM hits WHERE k = ? AND t > ?', key, now - WINDOW).one().c;
    const all = this.sql.exec("SELECT COUNT(*) AS c FROM hits WHERE k <> 'notify'").one().c;
    if (mine >= PER_CLIENT || all >= GLOBAL_PER_HOUR) return true;
    this.sql.exec('INSERT INTO hits (k, t) VALUES (?, ?)', key, now);
    return false;
  }

  /** Global notification budget, so a burst of comments cannot flood the owner's inbox. */
  mayNotify() {
    const now = Date.now();
    const sent = this.sql.exec("SELECT COUNT(*) AS c FROM hits WHERE k = 'notify' AND t > ?", now - 3_600_000).one().c;
    if (sent >= NOTIFY_PER_HOUR) return false;
    this.sql.exec("INSERT INTO hits (k, t) VALUES ('notify', ?)", now);
    return true;
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

  withNotify(res, evt) {
    if (evt && this.mayNotify()) res.notify = evt;
    return res;
  }

  async handle({ method, path, body, ip }) {
    const parts = path.replace(/\/+$/, '').split('/').slice(3); // after /api/comments

    if (method === 'GET') {
      if (parts.length) return { status: 404, body: { error: 'not_found' } };
      return { status: 200, body: { threads: this.list(), now: Date.now() } };
    }

    let data;
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      return { status: 400, body: { error: 'bad_json' } };
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 400, body: { error: 'bad_json' } };

    if (this.limited(ip)) return { status: 429, body: { error: 'rate_limited' } };
    if (data.website) return { status: 200, body: { ok: true } }; // honeypot

    const author = oneLine(data.author, MAX_NAME);
    const client = oneLine(data.client, 64);

    // POST /api/comments → new thread
    if (method === 'POST' && parts.length === 0) {
      const text = clean(data.body, MAX_BODY);
      const lang = LANGS.has(data.lang) ? data.lang : null;
      const selector = oneLine(data.selector, 600);
      const x = num(data.x, 0, 1);
      const y = num(data.y, 0, 1);
      if (!text || !author || !lang || !selector || x === null || y === null)
        return { status: 400, body: { error: 'missing_fields' } };
      if (this.sql.exec('SELECT COUNT(*) AS c FROM threads').one().c >= MAX_THREADS)
        return { status: 507, body: { error: 'storage_full' } };
      const page = `/${lang}/`;
      const number = this.sql.exec("UPDATE meta SET n = n + 1 WHERE k = 'seq' RETURNING n").one().n;
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
        section: oneLine(data.section, 80) || null,
        snippet: oneLine(data.snippet, 120) || null,
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
      return this.withNotify(
        { status: 201, body: { thread: { ...pub, resolved: false, replies: [] } } },
        { kind: 'thread', number, lang, page, author, body: text },
      );
    }

    const id = parts[0];
    const thread = id ? this.sql.exec('SELECT * FROM threads WHERE id = ?', id).toArray()[0] : null;
    if (!thread) return { status: 404, body: { error: 'not_found' } };

    // POST /api/comments/:id/replies
    if (method === 'POST' && parts[1] === 'replies' && parts.length === 2) {
      const text = clean(data.body, MAX_BODY);
      if (!text || !author) return { status: 400, body: { error: 'missing_fields' } };
      if (this.sql.exec('SELECT COUNT(*) AS c FROM replies WHERE thread_id = ?', id).one().c >= MAX_REPLIES)
        return { status: 507, body: { error: 'thread_full' } };
      const reply = { id: crypto.randomUUID(), thread_id: id, author, body: text, created_at: Date.now() };
      this.sql.exec(
        'INSERT INTO replies (id,thread_id,author,client,body,created_at) VALUES (?,?,?,?,?,?)',
        reply.id, id, author, client, text, reply.created_at,
      );
      return this.withNotify(
        { status: 201, body: { reply } },
        { kind: 'reply', number: thread.number, lang: thread.lang, page: thread.page, author, body: text },
      );
    }

    // PATCH /api/comments/:id  { resolved: bool }
    if (method === 'PATCH' && parts.length === 1) {
      if (!author) return { status: 400, body: { error: 'missing_fields' } };
      const resolved = !!data.resolved;
      if (resolved === !!thread.resolved) return { status: 200, body: { ok: true, resolved } }; // nothing changed
      this.sql.exec(
        'UPDATE threads SET resolved = ?, resolved_by = ?, resolved_at = ? WHERE id = ?',
        resolved ? 1 : 0, resolved ? author : null, resolved ? Date.now() : null, id,
      );
      return this.withNotify(
        { status: 200, body: { ok: true, resolved } },
        { kind: 'resolve', number: thread.number, lang: thread.lang, page: thread.page, author, resolved, body: thread.body.slice(0, 200) },
      );
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
