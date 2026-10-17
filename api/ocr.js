// Vercel serverless function: transcribe bhajan lyrics from an image or PDF
// with Gemini (free tier). The API key lives only in the GEMINI_API_KEY
// environment variable — the browser never sees it.
//
// POST /api/ocr  { mime: "image/jpeg" | "image/png" | "application/pdf", data: "<base64>" }
// → { ok, title, lyrics, model }

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_BYTES = 4 * 1024 * 1024; // keep under Vercel's request body limit

const PROMPT = `You are transcribing a Hindi/Marwari devotional song (bhajan, aarti, chalisa) from the attached image or document.
Rules:
- Transcribe the lyrics exactly as written, in Devanagari. If the source is in Latin letters (romanised Hindi), transcribe it to Devanagari.
- Keep one line of the song per line. Put ONE blank line between stanzas. The opening refrain (mukhda) is the first stanza.
- Do not add anything: no commentary, no translation, no numbering, no "verse" labels, no markdown.
- Fix obvious OCR-style slips only where the intended word is certain; otherwise keep what is written.
- If a title is clearly shown, return it separately; otherwise leave title empty.
- Ignore page headers, footers, page numbers, advertisements and unrelated text.
Return JSON: {"title": "...", "lyrics": "..."}`;

const readJson = (req) => new Promise((resolve, reject) => {
  if (req.body && typeof req.body === 'object') return resolve(req.body);
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > MAX_BYTES * 1.4) { reject(new Error('too large')); req.destroy(); } });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
  req.on('error', reject);
});

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'AI reading is not set up yet (missing GEMINI_API_KEY)' });

  let body;
  try { body = await readJson(req); } catch { return res.status(413).json({ ok: false, error: 'File is too large — try a smaller photo' }); }
  const mime = String(body.mime || '');
  const data = String(body.data || '');
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(mime)) return res.status(415).json({ ok: false, error: 'Send a JPEG/PNG/WebP image or a PDF' });
  if (!data || data.length * 0.75 > MAX_BYTES) return res.status(413).json({ ok: false, error: 'File is too large — try a smaller photo or fewer pages' });

  const payload = {
    contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 8192 }
  };

  let lastErr = 'AI service unavailable';
  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) { lastErr = 'Free AI quota is used up for now — try again in a minute, or later today'; continue; }
      if (r.status === 404) { lastErr = `Model ${model} not available`; continue; }
      if (!r.ok) { lastErr = (j.error && j.error.message) || `AI error ${r.status}`; continue; }
      const text = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
      let out = {};
      try { out = JSON.parse(text); } catch { out = { title: '', lyrics: text }; }
      const lyrics = String(out.lyrics || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (!lyrics) { lastErr = 'No lyrics were recognised in that file'; continue; }
      return res.status(200).json({ ok: true, model, title: String(out.title || '').trim(), lyrics });
    } catch (e) {
      lastErr = e && e.name === 'AbortError' ? 'The AI took too long — try a smaller or clearer photo' : 'Could not reach the AI service';
    } finally {
      clearTimeout(timer);
    }
  }
  return res.status(502).json({ ok: false, error: lastErr });
};
