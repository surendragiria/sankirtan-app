// Vercel serverless function: fetch a web page server-side (browsers can't,
// because of CORS) and return the page title, the block of text that looks
// most like bhajan lyrics, and the full visible text as a fallback.
//
// GET /api/fetch-lyrics?url=https://example.com/bhajan-page
// → { ok, title, lyrics, text, host }
//
// Safety: http(s) only, public hosts only (no localhost / private ranges),
// 1.5 MB cap, 10 s timeout, HTML only. Returns extracted text only — never
// the raw HTML — so it cannot be used as a general proxy.

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»' };
const decode = (s) => s
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (ENTITIES[k] !== undefined) return ENTITIES[k];
    if (k[0] === '#') {
      const code = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return m;
  });

const htmlToText = (html) => {
  // Newlines in HTML source are just whitespace; only <br>, <hr> and block
  // tags make line breaks. (A source newline after each <br> was turning
  // every lyric line into its own paragraph.)
  let h = html
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form|select)[\s\S]*?<\/\1>/gi, ' ')
    // link-heavy lists are menus / category clouds, not lyrics
    .replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, (m) => ((m.match(/<a\b/gi) || []).length >= 4 ? ' ' : m));
  h = h.replace(/<br\s*\/?>/gi, '\n')
       .replace(/<hr\b[^>]*>/gi, '\n\n')
       .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote|pre|dd|dt)>/gi, '\n\n')
       .replace(/<(p|div|li|h[1-6]|tr|section|article|blockquote|pre)\b[^>]*>/gi, '\n')
       .replace(/<[^>]+>/g, ' ');
  h = decode(h);
  return h
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const DEV = /[ऀ-ॿ]/g;
const devCount = (s) => (s.match(DEV) || []).length;

// Pick the run of consecutive paragraphs with the most Devanagari, allowing
// short non-Devanagari gaps (stanza labels, "chorus" etc.).
const pickLyrics = (text) => {
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paras.length === 0) return '';
  const seen = {};
  paras.forEach(p => { seen[p] = (seen[p] || 0) + 1; });
  const score = paras.map(p => {
    const d = devCount(p);
    const letters = (p.match(/\p{L}/gu) || []).length || 1;
    const lines = p.split('\n').filter(l => l.trim());
    const words = p.split(/\s+/).filter(Boolean).length;
    // Menu items / category names: a single short line, often repeated
    // elsewhere on the page (desktop + mobile menus). Lyrics are stanzas
    // (several lines) or at least a full line of song.
    if (seen[p] > 1 && lines.length < 2) return 0;
    if (lines.length < 2 && words < 4) return 0;
    if (lines.length < 2 && /(\.\.\.|…)\s*$/.test(p)) return 0; // post excerpt
    if (lines.length < 2 && words > 30) return 0; // prose paragraph (meaning / description), not a song
    return d / letters >= 0.5 && d >= 8 ? d : 0;
  });
  let best = { sum: 0, from: 0, to: -1 };
  let i = 0;
  while (i < paras.length) {
    if (!score[i]) { i++; continue; }
    let j = i, sum = 0, gap = 0, lastGood = i;
    while (j < paras.length && gap <= 1) {
      if (score[j]) { sum += score[j]; gap = 0; lastGood = j; } else { gap++; }
      j++;
    }
    if (sum > best.sum) best = { sum, from: i, to: lastGood };
    i = lastGood + 1;
  }
  if (best.to < best.from) return '';
  return paras.slice(best.from, best.to + 1).join('\n\n');
};

// Line-based fallback: the longest run of Devanagari lines (blank lines and
// up to two stray lines allowed inside the run). Robust to pages that put the
// whole song in one block or separate stanzas with <hr>.
const pickLyricsByLines = (text, exclude = []) => {
  const ex = new Set(exclude.map(x => x.trim()).filter(Boolean));
  const lines = text.split('\n');
  const good = lines.map(l => {
    const t = l.trim();
    if (!t) return false;
    const d = devCount(t);
    const letters = (t.match(/\p{L}/gu) || []).length || 1;
    const words = t.split(/\s+/).length;
    return d >= 6 && d / letters >= 0.6 && (words >= 4 || (words >= 2 && /[,।॥]\s*$/.test(t))) && !ex.has(t) && !/(\.\.\.|…)\s*$/.test(t);
  });
  let best = { sum: 0, from: 0, to: -1, n: 0 };
  let i = 0;
  while (i < lines.length) {
    if (!good[i]) { i++; continue; }
    let j = i, sum = 0, n = 0, stray = 0, last = i;
    while (j < lines.length) {
      const t = lines[j].trim();
      if (good[j]) { sum += devCount(t); n++; last = j; stray = 0; }
      else if (t) { stray++; if (stray > 2) break; }
      j++;
    }
    if (sum > best.sum) best = { sum, from: i, to: last, n };
    i = last + 1;
  }
  if (best.n < 4) return '';
  return lines.slice(best.from, best.to + 1)
    .filter((l, k) => good[best.from + k] || !l.trim() || (devCount(l) >= 3 && !ex.has(l.trim())))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

// Structured data: many lyrics sites embed schema.org JSON-LD with a
// MusicComposition whose `lyrics.text` holds the song verbatim. That is
// far more reliable than scraping the visible page (and works even when
// the page renders its lyrics with JavaScript).
const lyricsFromJsonLd = (html) => {
  const out = { lyrics: '', title: '' };
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const nodes = [];
  for (const b of blocks) {
    const body = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const j = JSON.parse(body);
      const arr = Array.isArray(j) ? j : [j];
      for (const x of arr) { nodes.push(x); if (Array.isArray(x['@graph'])) nodes.push(...x['@graph']); }
    } catch {}
  }
  const walk = (n, depth) => {
    if (!n || typeof n !== 'object' || depth > 4) return;
    const l = n.lyrics;
    const txt = typeof l === 'string' ? l : (l && typeof l.text === 'string' ? l.text : '');
    if (txt && devCount(txt) >= 40 && devCount(txt) > devCount(out.lyrics)) { out.lyrics = txt; out.title = typeof n.name === 'string' ? n.name : out.title; }
    for (const k of Object.keys(n)) if (k !== 'lyrics' && n[k] && typeof n[k] === 'object') walk(n[k], depth + 1);
  };
  nodes.forEach(n => walk(n, 0));
  out.lyrics = out.lyrics.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return out;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const raw = (req.query && req.query.url) || '';
  let url;
  try { url = new URL(String(raw).trim()); } catch { return res.status(400).json({ ok: false, error: 'Enter a full link starting with http:// or https://' }); }
  if (!/^https?:$/.test(url.protocol)) return res.status(400).json({ ok: false, error: 'Only http(s) links are supported' });
  if (PRIVATE_HOST.test(url.hostname)) return res.status(400).json({ ok: false, error: 'That address is not allowed' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 22000); // slow ad-heavy sites; function maxDuration is 30s (vercel.json)
  try {
    const r = await fetch(url.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        // Some lyrics sites (Cloudflare "bot fight" mode) refuse unknown
        // user-agents with a 403; present as an ordinary browser.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'hi-IN,hi;q=0.9,en;q=0.8'
      }
    });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) return res.status(502).json({ ok: false, error: `The page answered with ${r.status}` });
    if (!/html|xml|text\/plain/i.test(ct)) return res.status(415).json({ ok: false, error: 'That link is not a web page' });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 1.5 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Page is too large' });
    const html = buf.toString('utf8');
    const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1M = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const clean = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const title = (h1M && clean(h1M[1])) || (titleM && clean(titleM[1]).replace(/\s*[|\-–—]\s*[^|\-–—]*$/, '')) || '';
    // Prefer the page's main content region when it has real Devanagari
    // content; sidebars and menus live outside <article>/<main>.
    const regions = [];
    for (const re of [/<article\b[\s\S]*?<\/article>/gi, /<main\b[\s\S]*?<\/main>/gi, /<div\b[^>]*class="[^"]*(?:entry-content|post-content|td-post-content|post-body|lyrics|article-content)[^"]*"[^>]*>[\s\S]*?(?=<(?:footer|aside)\b|<div\b[^>]*class="[^"]*(?:comments|related|sidebar|post-navigation)[^"]*")/gi]) {
      const m = html.match(re);
      if (m) regions.push(...m);
    }
    const fullText = htmlToText(html);
    let text = fullText;
    let best = 0;
    for (const r of regions) {
      const t = htmlToText(r);
      const d = devCount(pickLyrics(t));
      if (d > best && d >= 40) { best = d; text = t; }
    }
    // Structured data first; otherwise whichever text method finds the most song.
    const ld = lyricsFromJsonLd(html);
    const candidates = [pickLyrics(text), pickLyrics(fullText), pickLyricsByLines(fullText, [title, titleM ? clean(titleM[1]) : ''])];
    let lyrics = ld.lyrics || candidates.reduce((a, b) => (devCount(b) > devCount(a) ? b : a), '');
    // Tidy: drop heading/title lines and non-Devanagari lines at the edges
    // (site name, credits, share buttons).
    const headings = new Set([title, titleM ? clean(titleM[1]) : ''].map(x => x.trim()).filter(Boolean));
    const isDev = (l) => { const d = devCount(l); const n = (l.match(/\p{L}/gu) || []).length || 1; return d / n >= 0.5; };
    let ls = lyrics.split('\n').filter(l => !headings.has(l.trim()) && !/skip to content/i.test(l));
    while (ls.length && (!ls[0].trim() || !isDev(ls[0]))) ls.shift();
    while (ls.length && (!ls[ls.length - 1].trim() || !isDev(ls[ls.length - 1]))) ls.pop();
    lyrics = ls.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    // A site's home/listing page has many short excerpts, not one song.
    const isRoot = url.pathname === '/' || url.pathname === '';
    const hint = isRoot ? 'That is the site\'s home page — open the bhajan you want and paste that page\'s link.' : (lyrics ? '' : 'No Hindi lyrics block was found on that page.');
    const outTitle = title || ld.title || '';
    return res.status(200).json({ ok: true, host: url.hostname, title: isRoot ? '' : outTitle, lyrics: isRoot ? '' : lyrics, text: fullText.slice(0, 60000), hint, source: ld.lyrics ? 'structured-data' : 'page-text' });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'The page took too long to respond (over 20 s)' : `Could not fetch that page (${(e && e.cause && e.cause.code) || (e && e.message) || 'network error'})`;
    return res.status(502).json({ ok: false, error: msg });
  } finally {
    clearTimeout(timer);
  }
};
