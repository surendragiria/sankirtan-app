// SESSION 141: who is calling our serverless functions?
// Verifies the Firebase ID token the app sends as "Authorization: Bearer …"
// by asking Google's Identity Toolkit (no service-account key needed; the
// web API key is the public project identifier already shipped in the app).
// Then enforces a per-user daily cap, kept in the user's own Firestore
// profile at users/{uid}/usage/{day} through the Firestore REST API using
// the same token (the rules let a user write only their own documents).

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sankirtan-app-ebc18';
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDTfTsY4NH2jjN-Sb_5rmFRNSrB6y4sJMA';
const ADMIN_UID = process.env.ADMIN_UID || 'ukY1LbmeVCYv803ipg0wJgyEL1F2';

const dayKey = () => new Date().toISOString().slice(0, 10);

async function verifyIdToken(req) {
  const h = String(req.headers.authorization || '');
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const idToken = m[1].trim();
  if (!idToken || idToken.length > 4096) return null;
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(WEB_API_KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
    });
    if (!r.ok) return null;
    const j = await r.json();
    const u = j && j.users && j.users[0];
    if (!u || !u.localId) return null;
    return { uid: u.localId, email: u.email || null, token: idToken };
  } catch { return null; }
}

// Returns { ok: true, used } or { ok: false, used, limit }. Best effort: if
// the usage document cannot be read/written the call is allowed.
async function checkDailyQuota(user, feature, limit) {
  const day = dayKey();
  const doc = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${user.uid}/usage/${day}`;
  const headers = { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' };
  let used = 0;
  try {
    const r = await fetch(doc, { headers });
    if (r.ok) {
      const j = await r.json();
      const f = j.fields && j.fields[feature];
      used = f ? parseInt(f.integerValue || f.doubleValue || 0, 10) || 0 : 0;
    }
  } catch { /* treat as 0 */ }
  if (used >= limit) return { ok: false, used, limit };
  try {
    await fetch(`${doc}?updateMask.fieldPaths=${encodeURIComponent(feature)}&updateMask.fieldPaths=day`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ fields: { [feature]: { integerValue: String(used + 1) }, day: { stringValue: day } } })
    });
  } catch { /* non-fatal */ }
  return { ok: true, used: used + 1, limit };
}

// Common gate: 401 when not signed in, 429 when over the daily cap.
async function requireUser(req, res, feature, limit, opts = {}) {
  const user = await verifyIdToken(req);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Please sign in to use this feature' });
    return null;
  }
  if (opts.adminOnly && user.uid !== ADMIN_UID) {
    res.status(403).json({ ok: false, error: 'This feature is available to the admin only' });
    return null;
  }
  const q = await checkDailyQuota(user, feature, limit);
  if (!q.ok) {
    res.status(429).json({ ok: false, error: `Daily limit reached (${limit} per day) — try again tomorrow` });
    return null;
  }
  return user;
}

module.exports = { verifyIdToken, checkDailyQuota, requireUser };
