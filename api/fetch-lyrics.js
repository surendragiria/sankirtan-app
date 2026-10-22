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

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
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
  let h = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, ' ');
  h = h.replace(/<br\s*\/?>/gi, '\n')
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
  const score = paras.map(p => {
    const d = devCount(p);
    const letters = (p.match(/\p{L}/gu) || []).length || 1;
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

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const raw = (req.query && req.query.url) || '';
  let url;
  try { url = new URL(String(raw).trim()); } catch { return res.status(400).json({ ok: false, error: 'Enter a full link starting with http:// or https://' }); }
  if (!/^https?:$/.test(url.protocol)) return res.status(400).json({ ok: false, error: 'Only http(s) links are supported' });
  if (PRIVATE_HOST.test(url.hostname)) return res.status(400).json({ ok: false, error: 'That address is not allowed' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
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
    const text = htmlToText(html);
    const lyrics = pickLyrics(text);
    // A site's home/listing page has many short excerpts, not one song.
    const isRoot = url.pathname === '/' || url.pathname === '';
    const hint = isRoot ? 'That is the site\'s home page — open the bhajan you want and paste that page\'s link.' : (lyrics ? '' : 'No Hindi lyrics block was found on that page.');
    return res.status(200).json({ ok: true, host: url.hostname, title: isRoot ? '' : title, lyrics: isRoot ? '' : lyrics, text: text.slice(0, 60000), hint });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'The page took too long to respond' : 'Could not fetch that page';
    return res.status(502).json({ ok: false, error: msg });
  } finally {
    clearTimeout(timer);
  }
};
