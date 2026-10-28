// SESSION 136: on-device recordings (IndexedDB). Audio never leaves the phone
// unless the user shares it. Kept out of App.js so it never touches the main
// data path: nothing here runs until the user records or opens a list.

const DB_NAME = 'sankirtan-recordings';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) {
        const meta = db.createObjectStore('meta', { keyPath: 'id' });
        meta.createIndex('bhajanId', 'bhajanId');
        meta.createIndex('programId', 'programId');
        meta.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio'); // key: id → Blob
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open recordings store'));
  });
}

const tx = (db, stores, mode, fn) => new Promise((resolve, reject) => {
  const t = db.transaction(stores, mode);
  let out;
  t.oncomplete = () => resolve(out);
  t.onerror = () => reject(t.error);
  t.onabort = () => reject(t.error || new Error('aborted'));
  out = fn(t);
});

const reqToPromise = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export const recordingsSupported = () =>
  typeof window !== 'undefined' && !!window.indexedDB && !!window.MediaRecorder && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

export const pickMimeType = () => {
  if (!window.MediaRecorder) return '';
  const cands = ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const c of cands) { try { if (MediaRecorder.isTypeSupported(c)) return c; } catch {} }
  return '';
};

export const extForMime = (m) => (/mp4/.test(m) ? 'm4a' : /ogg/.test(m) ? 'ogg' : 'webm');

export async function saveRecording(meta, blob) {
  const db = await openDb();
  await tx(db, ['meta', 'audio'], 'readwrite', (t) => {
    t.objectStore('meta').put({ ...meta, size: blob.size });
    t.objectStore('audio').put(blob, meta.id);
  });
  db.close();
}

export async function listRecordings(filter = {}) {
  const db = await openDb();
  const all = await tx(db, ['meta'], 'readonly', (t) => reqToPromise(t.objectStore('meta').getAll()));
  db.close();
  let rows = all || [];
  if (filter.bhajanId) rows = rows.filter(r => r.bhajanId === filter.bhajanId);
  if (filter.programId) rows = rows.filter(r => r.programId === filter.programId);
  if (filter.uid) rows = rows.filter(r => !r.uid || r.uid === filter.uid);
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getRecordingBlob(id) {
  const db = await openDb();
  const b = await tx(db, ['audio'], 'readonly', (t) => reqToPromise(t.objectStore('audio').get(id)));
  db.close();
  return b || null;
}

export async function deleteRecording(id) {
  const db = await openDb();
  await tx(db, ['meta', 'audio'], 'readwrite', (t) => { t.objectStore('meta').delete(id); t.objectStore('audio').delete(id); });
  db.close();
}

export async function updateRecording(id, patch) {
  const db = await openDb();
  await tx(db, ['meta'], 'readwrite', (t) => {
    const st = t.objectStore('meta');
    reqToPromise(st.get(id)).then((row) => { if (row) st.put({ ...row, ...patch }); });
  });
  db.close();
}

export async function recordingsUsage() {
  try {
    const db = await openDb();
    const all = await tx(db, ['meta'], 'readonly', (t) => reqToPromise(t.objectStore('meta').getAll()));
    db.close();
    const bytes = (all || []).reduce((n, r) => n + (r.size || 0), 0);
    let quota = null, usage = null;
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      quota = est.quota || null; usage = est.usage || null;
    }
    return { count: (all || []).length, bytes, quota, usage };
  } catch { return { count: 0, bytes: 0, quota: null, usage: null }; }
}

// Ask the browser not to evict our data under storage pressure. Chrome grants
// this silently for installed apps; Safari ignores it (Home Screen apps are
// already exempt from its 7-day cleanup).
export async function requestPersistentStorage() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch {}
  return false;
}

export const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60), r = s % 60;
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
export const fmtBytes = (b) => (b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB');

export const safeFileName = (s) => String(s || 'recording').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

// Recorder: one active session at a time. `onTick` gets elapsed seconds.
export class Recorder {
  constructor() { this.stream = null; this.rec = null; this.chunks = []; this.startedAt = 0; this.timer = null; this.mime = ''; }
  async start(onTick) {
    if (this.rec) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    this.mime = pickMimeType();
    this.rec = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime, audioBitsPerSecond: 96000 } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start(5000); // a chunk every 5 s — a crash loses at most that much
    this.startedAt = Date.now();
    if (onTick) this.timer = setInterval(() => onTick((Date.now() - this.startedAt) / 1000), 1000);
  }
  // Returns { blob, duration, mime }
  async stop() {
    if (!this.rec) return null;
    const rec = this.rec; this.rec = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const duration = (Date.now() - this.startedAt) / 1000;
    const done = new Promise((resolve) => { rec.onstop = () => resolve(); });
    try { rec.stop(); } catch { }
    await done;
    const mime = this.mime || (this.chunks[0] && this.chunks[0].type) || 'audio/webm';
    const blob = new Blob(this.chunks, { type: mime });
    this.chunks = [];
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    return { blob, duration, mime };
  }
  get active() { return !!this.rec; }
}
