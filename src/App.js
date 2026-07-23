import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ==============================================
// SANKIRTAN SAAS - SESSION 9
// Bhajan Se Bhagwan Tak
// CHANGES (Session 9 — hotfix for Session 8's Firestore config error):
//
// Session 8's db.settings() call included `merge: true` alongside
// `experimentalForceLongPolling: true`. Firebase compat SDK v10.7.0
// throws at runtime:
//
//   "experimentalForceLongPolling and
//    experimentalAutoDetectLongPolling cannot be used together"
//
// Why: the compat SDK's merge:true option merges new settings on
// top of defaults, and the defaults include
// experimentalAutoDetectLongPolling:false. Post-merge, both keys
// end up present, and the SDK's own validation refuses. The
// Firestore SDK was then left in an unconfigured, cannot-talk-to-
// backend state — the observable symptom was "Public library is
// empty" plus "Could not reach Cloud Firestore backend" for
// signed-in and guest users alike, worse than pre-Session-8.
//
// 1. FIX: dropped `merge: true`. The settings object now replaces
//    defaults wholesale rather than merging.
//
// 2. UX: removed the silent `console.warn` around the settings
//    call. If settings ever fails, it now logs a CRITICAL error
//    and throws so we see it fast next time, and _firestoreConfigured
//    stays false so the next reload retries the setup.
//
// This is a hotfix for Session 8, not a full new session's worth of
// work. Everything else from Session 8 stays: the 8-second stuck-
// loading escape hatch with the Reload button.
//
// Verification after deploy: incognito window on sankirtan.app,
// console should NOT show "Firestore config error". Public library
// should paint in 2-3 seconds even on mobile / incognito.
// ==============================================
// (Session 8 kept: experimentalForceLongPolling for reliability;
//  8-second stuck-loading escape-hatch banner with Reload button.)
// (Session 7 kept: fetchUserCount() deleted; the blocking retry
//  loop that caused the original 40-second cold-start hang.)
// (Session 6 kept: card memoization, dark mode, back-button behaviour,
//  transliteration cache, related/prev-next memoization.)
// ==============================================

// ==============================================
// SANKIRTAN WORDMARK COMPONENT (Devanagari)
// ==============================================
const WORDMARK_FONT = "'Noto Sans Devanagari', 'Mangal', system-ui, sans-serif";

const SankirtanWordmark = ({ className = "" }) => {
  let fontSize = '34px';
  if (className.includes('h-20'))      fontSize = '58px';
  else if (className.includes('h-16')) fontSize = '46px';
  else if (className.includes('h-14')) fontSize = '40px';
  else if (className.includes('h-12')) fontSize = '34px';
  else if (className.includes('h-10')) fontSize = '28px';

  return (
    <span
      className={className}
      role="img"
      aria-label="संकीर्तन"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: WORDMARK_FONT,
        fontSize,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span style={{ color: '#0B5A70' }}>सं</span>
      <span style={{ color: '#E65100' }}>कीर्तन.</span>
    </span>
  );
};

// Constants for dropdowns
const DEITY_OPTIONS = [
  { value: 'Babosa', emoji: '🕉️' },
  { value: 'Krishna', emoji: '🪈' },
  { value: 'Mata Ji', emoji: '🌺' },
  { value: 'Hanuman', emoji: '🐒' },
  { value: 'Rama', emoji: '🏹' },
  { value: 'Shiv', emoji: '🔱' },
  { value: 'Ramdev', emoji: '🐎' },
  { value: 'Ganesh', emoji: '🐘' },
  { value: 'Bhairav', emoji: '🐕' },
  { value: 'Saibaba', emoji: '🌟' },
  { value: 'Vishnu', emoji: '💫' },
  { value: 'Buddha', emoji: '☸️' },
  { value: 'Mahavir', emoji: '🙏' },
  { value: 'Guru Nanak', emoji: '☬' },
  { value: 'Jain', emoji: '🕉️' },
  { value: 'Nirgun', emoji: '✨' },
  { value: 'Deshbhakti', emoji: '🇮🇳' },
  { value: 'Others', emoji: '✨' }
];

const CATEGORY_OPTIONS = [
  'Bhajan', 'Arti', 'Parody', 'Quwali', 'Folk Song',
  'Katha', 'Dohe', 'Stotra', 'Mantra', 'Chalisa'
];

const DEFAULT_KEYWORDS = [
  'bhawna', 'dance', 'marwari', 'dhamal', 'fast', 'sad',
  'celebration', 'punjabi', 'melody', 'mela', 'birthday',
  'gujarati', 'filmy', 'folk', 'traditional', 'peaceful'
];

// Admin user ID (client-side check only hides UI — enforce in Firestore rules!)
const ADMIN_UID = 'ukY1LbmeVCYv803ipg0wJgyEL1F2';
const APP_VERSION = '2026.07.23.s9';

// Onboarding tour steps
const ONBOARDING_STEPS = [
  {
    target: 'welcome',
    title: '🙏 Welcome to Sankirtan!',
    description: 'Let me quickly show you around. This will take just 30 seconds.',
    emoji: '🕉️'
  },
  {
    target: 'public-library',
    title: '🌐 Public Library',
    description: 'Browse 175+ curated bhajans - Babosa, Krishna, Mata Ji, Hanuman & more. Tap any bhajan to save it to your personal library.',
    emoji: '📚'
  },
  {
    target: 'my-library',
    title: '📚 My Library',
    description: 'Your personal collection. Add your own bhajans, edit lyrics, add tunes (धुन), and organize by deity or category.',
    emoji: '❤️'
  },
  {
    target: 'programs',
    title: '🎵 Programs & Live Mode',
    description: 'Create setlists for jagrans & satsangs. Live Mode shows big text, keeps screen awake, and lets you navigate hands-free during performances.',
    emoji: '🎤'
  },
  {
    target: 'hindi-typing',
    title: '✍️ Hindi Typing Made Easy',
    description: 'Type in English → Get Hindi automatically! Like "bhagwan" → "भगवान". Works when adding or editing bhajans.',
    emoji: '📝'
  },
  {
    target: 'finish',
    title: '🎊 You\'re All Set!',
    description: 'बाबोसा जी की कृपा से आपकी यात्रा शुरू होती है। Start by exploring the Public Library!',
    emoji: '🙏'
  }
];

// Fallback Hindi transliteration map (used when API fails)
const HINDI_FALLBACK_MAP = {
  'jai': 'जय', 'shri': 'श्री', 'shree': 'श्री', 'om': 'ॐ', 'aum': 'ॐ',
  'ram': 'राम', 'rama': 'राम', 'krishna': 'कृष्ण', 'krsna': 'कृष्ण',
  'hari': 'हरि', 'hare': 'हरे', 'radha': 'राधा', 'radhe': 'राधे',
  'shiv': 'शिव', 'shiva': 'शिव', 'ganesh': 'गणेश', 'ganesha': 'गणेश',
  'hanuman': 'हनुमान', 'ganpati': 'गणपति',
  'babosa': 'बाबोसा', 'baba': 'बाबा', 'bhajan': 'भजन',
  'khatu': 'खाटू', 'shyam': 'श्याम', 'khatushyam': 'खाटूश्याम',
  'mata': 'माता', 'mataji': 'माताजी', 'devi': 'देवी',
  'bhagwan': 'भगवान', 'bhagwaan': 'भगवान', 'prabhu': 'प्रभु',
  'namo': 'नमो', 'namah': 'नमः', 'namaste': 'नमस्ते',
  'satguru': 'सतगुरु', 'guru': 'गुरु', 'sadguru': 'सद्गुरु',
  'bhole': 'भोले', 'shankar': 'शंकर', 'mahadev': 'महादेव',
  'govind': 'गोविन्द', 'gopal': 'गोपाल', 'murari': 'मुरारी',
  'kanha': 'कान्हा', 'kanhaiya': 'कन्हैया', 'nandlala': 'नंदलाला',
  'mohan': 'मोहन', 'giridhar': 'गिरधर', 'giridhari': 'गिरधारी',
  'sita': 'सीता', 'lakshman': 'लक्ष्मण', 'bharat': 'भरत',
  'bajrangbali': 'बजरंगबली', 'sankat': 'संकट', 'mochan': 'मोचन',
  'ambe': 'अम्बे', 'ambey': 'अम्बे', 'durga': 'दुर्गा', 'kali': 'काली',
  'saraswati': 'सरस्वती', 'lakshmi': 'लक्ष्मी', 'parvati': 'पार्वती',
  'ramdev': 'रामदेव', 'ramdevji': 'रामदेवजी', 'bhairav': 'भैरव',
  'mandir': 'मंदिर', 'temple': 'मंदिर', 'darshan': 'दर्शन',
  'aarti': 'आरती', 'arti': 'आरती', 'pooja': 'पूजा', 'puja': 'पूजा',
  'diya': 'दीया', 'jyoti': 'ज्योति', 'roshni': 'रोशनी',
  'bhakt': 'भक्त', 'bhakti': 'भक्ति', 'seva': 'सेवा',
  'daya': 'दया', 'karo': 'करो', 'kripa': 'कृपा',
  'charno': 'चरणों', 'charan': 'चरण', 'sharan': 'शरण',
  'darbar': 'दरबार', 'dwar': 'द्वार', 'gate': 'द्वार',
  'meera': 'मीरा', 'sant': 'संत', 'kabir': 'कबीर', 'tulsi': 'तुलसी',
  'dhun': 'धुन', 'tarz': 'तर्ज़', 'raag': 'राग',
  'ke': 'के', 'ka': 'का', 'ki': 'की', 'ko': 'को', 'se': 'से',
  'me': 'में', 'mai': 'मैं', 'main': 'मैं', 'tum': 'तुम',
  'hai': 'है', 'hain': 'हैं', 'ho': 'हो', 'hoga': 'होगा',
  'aaya': 'आया', 'aya': 'आया', 'aayi': 'आयी', 'aayo': 'आयो',
  'jaao': 'जाओ', 'jao': 'जाओ', 'jai_ho': 'जय हो',
  'sundar': 'सुंदर', 'pyara': 'प्यारा', 'nyara': 'न्यारा',
  'balak': 'बालक', 'putra': 'पुत्र', 'beta': 'बेटा',
  'maa': 'माँ', 'papa': 'पापा', 'pita': 'पिता',
  'ghar': 'घर', 'aangan': 'आँगन', 'darwaza': 'दरवाज़ा',
  'suhavan': 'सुहावन', 'manohar': 'मनोहर',
  'sab': 'सब', 'sabhi': 'सभी', 'hum': 'हम', 'tumhare': 'तुम्हारे',
  'tera': 'तेरा', 'teri': 'तेरी', 'tere': 'तेरे', 'tujh': 'तुझ',
  'mera': 'मेरा', 'meri': 'मेरी', 'mere': 'मेरे', 'mujh': 'मुझ',
  'bhajans': 'भजन', 'kirtan': 'कीर्तन', 'sankirtan': 'संकीर्तन',
  'satsang': 'सत्संग', 'jagran': 'जागरण', 'mela': 'मेला',
};

// Consistent transliteration cache key (SESSION 5 FIX:
// previously saved as "hi:word" but read as "word" → cache never hit)
const hiKey = (word) => `hi:${(word || '').toLowerCase()}`;

// ==============================================
// CSS KEYFRAMES — injected once into <head>
// ==============================================
if (typeof document !== 'undefined' && !document.getElementById('sankirtan-animations')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'sankirtan-animations';
  styleEl.textContent = `
    @keyframes sk-card-in {
      from { opacity: 0; transform: translateY(18px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .sk-card-animate {
      animation: sk-card-in 0.35s cubic-bezier(0.22,1,0.36,1) both;
    }
    @keyframes sk-toast-in {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes sk-toast-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(16px); }
    }
    @keyframes sk-slide-left-in {
      from { opacity: 0; transform: translateX(60px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes sk-slide-right-in {
      from { opacity: 0; transform: translateX(-60px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .sk-slide-left  { animation: sk-slide-left-in  0.28s cubic-bezier(0.22,1,0.36,1) both; }
    .sk-slide-right { animation: sk-slide-right-in 0.28s cubic-bezier(0.22,1,0.36,1) both; }
    @keyframes sk-dialog-in {
      from { opacity: 0; transform: scale(0.94) translateY(10px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .sk-dialog-animate { animation: sk-dialog-in 0.22s cubic-bezier(0.22,1,0.36,1) both; }
    @media (prefers-reduced-motion: reduce) {
      .sk-card-animate, .sk-slide-left, .sk-slide-right, .sk-dialog-animate { animation: none !important; }
    }
  `;
  document.head.appendChild(styleEl);
}

// ==============================================
// SHARE HELPER — Web Share API with clipboard fallback
// ==============================================
const shareBhajan = async (bhajan) => {
  if (!bhajan) return false;
  const shareTitle = bhajan.title || 'Bhajan';
  const lyricsPreview = (bhajan.lyrics || '').trim().substring(0, 300);
  const shareText = `${shareTitle}\n\n${lyricsPreview}${(bhajan.lyrics || '').length > 300 ? '…' : ''}\n\n— Shared from Sankirtan App (sankirtan.app)`;

  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, text: shareText });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    return 'copied';
  } catch {
    const ta = document.createElement('textarea');
    ta.value = shareText;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return 'copied';
  }
};

// ==============================================
// SWIPE HOOK — horizontal swipe detection for reading views
// ==============================================
const useSwipe = (onSwipeLeft, onSwipeRight, { threshold = 60, enabled = true } = {}) => {
  const touchStart = useRef(null);
  const touchStartY = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStart.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, [enabled]);

  const onTouchEnd = useCallback((e) => {
    if (!enabled || touchStart.current === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current;
    const dy = Math.abs(touch.clientY - touchStartY.current);
    touchStart.current = null;

    if (Math.abs(dx) < threshold || dy > Math.abs(dx) * 0.8) return;

    if (dx < 0 && onSwipeLeft) onSwipeLeft();
    if (dx > 0 && onSwipeRight) onSwipeRight();
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
};

// ==============================================
// SESSION 6: MEMOIZED CARD COMPONENTS
// Extracted so that unchanged rows skip re-rendering when parent
// state (toast, search, dark-mode, font-size) changes. React.memo
// bails out when all props are shallow-equal, so parent callbacks
// MUST be wrapped in useCallback for this to help.
//
// Lyric preview: line-clamp only hides overflow visually — the DOM
// still holds the entire song. Slicing to 4 lines before render
// keeps the browser fast on Android when hundreds of cards mount.
// ==============================================
const previewLyrics = (lyrics) =>
  (lyrics || '').trim().split('\n').slice(0, 4).join('\n');

const MyBhajanCard = React.memo(function MyBhajanCard({
  bhajan, darkMode, compactView, cardIndex, onOpen
}) {
  if (compactView) {
    return (
      <button
        onClick={() => onOpen(bhajan)}
        className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
      >
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
            {bhajan.title}
          </h3>
          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {bhajan.deity} · {bhajan.category}{bhajan.scale ? ` · 🎵 ${bhajan.scale}` : ''}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(bhajan)}
      className={`sk-card-animate rounded-2xl p-5 border transition-all text-left ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 shadow-[0_2px_12px_rgba(11,90,112,0.15)] hover:border-[#0B5A70]/30 hover:shadow-[0_4px_20px_rgba(11,90,112,0.25)]' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_2px_12px_rgba(11,90,112,0.06)] hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)]'}`}
      style={{ animationDelay: `${Math.min(cardIndex, 8) * 0.04}s` }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className={`text-lg font-bold flex-1 line-clamp-2 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
          {bhajan.title}
        </h3>
      </div>

      {bhajan.dhun && (
        <p className={`text-xs mb-2 ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
          <span className="font-semibold">तर्ज़:</span> {bhajan.dhun}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-[#0B5A70]/20 text-teal-300' : 'bg-[#0B5A70]/8 text-[#0B5A70]'}`}>
          {bhajan.deity}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-[#E65100]/15 text-orange-300' : 'bg-[#E65100]/8 text-[#E65100]'}`}>
          {bhajan.category}
        </span>
        {bhajan.scale && (
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
            🎵 {bhajan.scale}
          </span>
        )}
      </div>

      <p className={`text-sm line-clamp-3 mb-2 whitespace-pre-line max-h-16 overflow-hidden ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {previewLyrics(bhajan.lyrics)}
      </p>

      {bhajan.keywords && bhajan.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {bhajan.keywords.slice(0, 4).map(kw => (
            <span key={kw} className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-[#0B5A70]/15 text-teal-400' : 'bg-[#0B5A70]/5 text-[#0B5A70]/70'}`}>
              #{kw}
            </span>
          ))}
          {bhajan.keywords.length > 4 && (
            <span className="text-xs text-gray-400">+{bhajan.keywords.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
});

const PublicBhajanCard = React.memo(function PublicBhajanCard({
  bhajan, darkMode, compactView, cardIndex, isSaved, savingToLibrary, onOpen, onSave
}) {
  if (compactView) {
    // SESSION 6 FIX: was <button><span onClick>+ Save</span></button>
    // (invalid HTML, screen-readers skipped the Save action).
    // Restructured so title-tap and Save are sibling real buttons.
    return (
      <div
        className={`w-full rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
      >
        <button
          onClick={() => onOpen(bhajan)}
          className="flex-1 min-w-0 text-left"
          aria-label={`Open ${bhajan.title}`}
        >
          <h3 className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
            {bhajan.title}
          </h3>
          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {bhajan.deity} · {bhajan.category}
          </p>
        </button>
        {isSaved ? (
          <span
            className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
            aria-label="Already in your library"
          >
            ✓
          </span>
        ) : (
          <button
            onClick={() => onSave(bhajan)}
            disabled={savingToLibrary}
            className="bg-[#0B5A70] hover:bg-[#094a5d] text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 disabled:opacity-50"
            aria-label={`Save ${bhajan.title} to my library`}
          >
            + Save
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`sk-card-animate rounded-2xl p-5 border transition-all ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 shadow-[0_2px_12px_rgba(11,90,112,0.15)] hover:border-[#0B5A70]/30 hover:shadow-[0_4px_20px_rgba(11,90,112,0.25)]' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_2px_12px_rgba(11,90,112,0.06)] hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)]'}`}
      style={{ animationDelay: `${Math.min(cardIndex, 8) * 0.04}s` }}
    >
      <button
        onClick={() => onOpen(bhajan)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className={`text-lg font-bold flex-1 line-clamp-2 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
            {bhajan.title}
          </h3>
        </div>

        {bhajan.dhun && (
          <p className={`text-xs mb-2 ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
            <span className="font-semibold">तर्ज़:</span> {bhajan.dhun}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-[#0B5A70]/20 text-teal-300' : 'bg-[#0B5A70]/8 text-[#0B5A70]'}`}>
            {bhajan.deity}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-[#E65100]/15 text-orange-300' : 'bg-[#E65100]/8 text-[#E65100]'}`}>
            {bhajan.category}
          </span>
        </div>

        <p className={`text-sm line-clamp-3 mb-2 whitespace-pre-line max-h-16 overflow-hidden ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {previewLyrics(bhajan.lyrics)}
        </p>

        {bhajan.keywords && bhajan.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {bhajan.keywords.slice(0, 4).map(kw => (
              <span key={kw} className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-[#0B5A70]/15 text-teal-400' : 'bg-[#0B5A70]/5 text-[#0B5A70]/70'}`}>
                #{kw}
              </span>
            ))}
          </div>
        )}
      </button>

      <div className={`flex gap-2 mt-3 pt-3 border-t ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
        {isSaved ? (
          <span className="flex-1 bg-green-50 text-green-700 font-semibold py-2 rounded-lg text-sm text-center">
            ✓ In Your Library
          </span>
        ) : (
          <button
            onClick={() => onSave(bhajan)}
            disabled={savingToLibrary}
            className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
          >
            ➕ Add to Personal
          </button>
        )}
      </div>

      {(bhajan.saveCount > 0) && (
        <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/50'}`}>
          ✨ Added by {bhajan.saveCount} {bhajan.saveCount === 1 ? 'person' : 'people'}
        </p>
      )}
    </div>
  );
});

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBrowserWarning, setShowBrowserWarning] = useState(() => {
    const isIOSChrome = /CriOS/.test(navigator.userAgent);
    const dismissed = localStorage.getItem('sankirtan-browser-warning-dismissed');
    return isIOSChrome && !dismissed;
  });

  // Onboarding tour state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // PWA install prompt state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackListLoading, setFeedbackListLoading] = useState(false);

  // Custom config lists (Firestore-based, admin editable)
  const [customDeities, setCustomDeities] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [customKeywords, setCustomKeywords] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [newItemInput, setNewItemInput] = useState({ deity: '', category: '', keyword: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    whatsapp: '',
    youtube: '',
    instagram: ''
  });
  // SESSION 7: userCount state removed with fetchUserCount deletion.

  // My Library states
  const [currentView, setCurrentView] = useState('public-library');
  const [scrollPositions, setScrollPositions] = useState({});
  const [bhajans, setBhajans] = useState([]);
  const [selectedBhajan, setSelectedBhajan] = useState(null);
  const [editingBhajan, setEditingBhajan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterDeity, setFilterDeity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [bhajansLoading, setBhajansLoading] = useState(false);
  const [bhajanFormError, setBhajanFormError] = useState('');
  const [bhajanFormSaving, setBhajanFormSaving] = useState(false);

  // Programs states
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [programFormError, setProgramFormError] = useState('');
  const [programFormSaving, setProgramFormSaving] = useState(false);
  const [showBhajanPicker, setShowBhajanPicker] = useState(false);
  const [bhajanPickerSearch, setBhajanPickerSearch] = useState('');
  const [pickerDeityFilter, setPickerDeityFilter] = useState('');
  const [pickerKeywordFilter, setPickerKeywordFilter] = useState('');

  const [programForm, setProgramForm] = useState({
    name: '',
    date: '',
    venue: '',
    bhajanIds: []
  });

  // Live Program Mode states
  const [liveProgramIndex, setLiveProgramIndex] = useState(0);
  const [liveFontSize, setLiveFontSize] = useState(20);
  const [liveWakeLock, setLiveWakeLock] = useState(null);

  // Public Library states
  const [publicBhajans, setPublicBhajans] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  // SESSION 8: escape hatch — after 8 seconds of skeleton loading,
  // show a "Having trouble loading" message with a Retry button so
  // users aren't stuck watching skeletons forever if Firestore's
  // Listen stream is misbehaving (mobile Safari, incognito, strict
  // corporate proxies, etc).
  const [publicLoadingStuck, setPublicLoadingStuck] = useState(false);
  const [publicSearchQuery, setPublicSearchQuery] = useState('');
  const [debouncedPublicSearch, setDebouncedPublicSearch] = useState('');
  const [publicFilterKeyword, setPublicFilterKeyword] = useState('');
  const [libraryFilterKeyword, setLibraryFilterKeyword] = useState('');
  const [publicFilterDeity, setPublicFilterDeity] = useState('');
  const [publicFilterCategory, setPublicFilterCategory] = useState('');
  const [selectedPublicBhajan, setSelectedPublicBhajan] = useState(null);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedBhajanIds, setSavedBhajanIds] = useState(new Set());

  // Admin Panel states
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Manual Add/Edit Public Bhajan states (admin)
  const [showPublicBhajanForm, setShowPublicBhajanForm] = useState(false);
  const [editingPublicBhajan, setEditingPublicBhajan] = useState(null);
  const [publicBhajanForm, setPublicBhajanForm] = useState({
    title: '',
    lyrics: '',
    deity: 'Babosa',
    category: 'Bhajan',
    language: 'Hindi',
    dhun: '',
    scale: '',
    keywords: [],
    source: ''
  });
  const [publicBhajanFormError, setPublicBhajanFormError] = useState('');
  const [publicBhajanFormSaving, setPublicBhajanFormSaving] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Check if current user is admin (SESSION 5: debug logging removed —
  // never advertise the comparison logic in the console)
  const isAdmin = useMemo(() => {
    if (!user || !user.uid) return false;
    return user.uid.toString().trim() === ADMIN_UID;
  }, [user]);

  // New/Edit bhajan form
  const [bhajanForm, setBhajanForm] = useState({
    title: '',
    lyrics: '',
    deity: 'Babosa',
    category: 'Bhajan',
    language: 'Hindi',
    dhun: '',
    scale: '',
    keywords: [],
    source: ''
  });

  // Hindi Typing states
  const [hindiTypingEnabled, setHindiTypingEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('sankirtan-hindi-typing');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [transliterationSuggestions, setTransliterationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [activeTypingField, setActiveTypingField] = useState(null);
  const suggestionsAbortRef = useRef(null);
  // SESSION 6: transliteration cache lives ONLY in a ref now.
  // Previous session kept it in state + mirrored to a ref, which
  // caused a full app re-render on every cache write (i.e. mid-typing).
  // All reads/writes go through this ref directly.
  const suggestionsCacheRef = useRef({});

  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef(null);
  const [speechLang, setSpeechLang] = useState('hi-IN');

  // Reading view settings
  const [readingSettings, setReadingSettings] = useState(() => {
    const defaults = { fontSize: 18, fontFamily: 'sans-serif', lineHeight: 1.8, textAlign: 'center', readingMode: false, keepScreenOn: false };
    try {
      const saved = localStorage.getItem('sankirtan-reading-settings');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
      return defaults;
    } catch {
      return defaults;
    }
  });
  const [showReadingSettings, setShowReadingSettings] = useState(false);
  const [readingWakeLock, setReadingWakeLock] = useState(null);

  // ==============================================
  // TOAST SYSTEM (SESSION 5: generalized from share toast —
  // now handles success/error notices app-wide, replacing alert())
  // ==============================================
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error', visible }
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
      setTimeout(() => setToast(null), 400);
    }, type === 'error' ? 3500 : 2200);
  }, []);

  // ==============================================
  // CONFIRM DIALOG (SESSION 5: replaces window.confirm() —
  // branded, non-blocking, works properly in installed PWAs)
  // ==============================================
  const [confirmDialog, setConfirmDialog] = useState(null);
  // askConfirm({ title, message, confirmLabel, danger }, onConfirm)
  const askConfirm = useCallback((opts, onConfirm) => {
    setConfirmDialog({
      title: opts.title || 'Are you sure?',
      message: opts.message || '',
      confirmLabel: opts.confirmLabel || 'Confirm',
      danger: opts.danger !== false,
      onConfirm
    });
  }, []);
  const closeConfirm = useCallback(() => setConfirmDialog(null), []);
  const runConfirm = useCallback(() => {
    const fn = confirmDialog && confirmDialog.onConfirm;
    setConfirmDialog(null);
    if (fn) fn();
  }, [confirmDialog]);

  // Swipe animation direction
  const [slideDir, setSlideDir] = useState(null);

  // Compact card view
  const [compactView, setCompactView] = useState(() => {
    try {
      return localStorage.getItem('sankirtan-compact-view') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('sankirtan-compact-view', compactView.toString()); } catch (e) {}
  }, [compactView]);

  // ==============================================
  // SPLASH SCREEN (SESSION 5: full 2.8s animation once per day,
  // fast 0.8s splash on subsequent opens — big perceived-speed win)
  // ==============================================
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  useEffect(() => {
    let showFull = true;
    try {
      const lastFullSplash = localStorage.getItem('sankirtan-splash-shown');
      const today = new Date().toDateString();
      showFull = lastFullSplash !== today;
      if (showFull) localStorage.setItem('sankirtan-splash-shown', today);
    } catch (e) { /* private browsing — default to full */ }

    const SPLASH_MS = showFull ? 2800 : 800;
    const timer = setTimeout(() => {
      setSplashFadeOut(true);
      setTimeout(() => setSplashVisible(false), 600);
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // Debounce searches
  useEffect(() => {
    const t1 = setTimeout(() => setDebouncedSearchQuery(searchQuery), 200);
    return () => clearTimeout(t1);
  }, [searchQuery]);

  useEffect(() => {
    const t2 = setTimeout(() => setDebouncedPublicSearch(publicSearchQuery), 200);
    return () => clearTimeout(t2);
  }, [publicSearchQuery]);

  // Scroll-to-top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ==============================================
  // RECENTLY READ (SESSION 5 FIX: state now reloads when the
  // storage key changes — i.e. when user logs in or out)
  // ==============================================
  const RECENT_KEY = user ? `sankirtan-recent-${user.uid}` : 'sankirtan-recent-guest';
  const [recentlyRead, setRecentlyRead] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      setRecentlyRead(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentlyRead([]);
    }
  }, [RECENT_KEY]);

  const trackRecentRead = useCallback((bhajan) => {
    if (!bhajan || !bhajan.id) return;
    setRecentlyRead(prev => {
      const filtered = prev.filter(b => b.id !== bhajan.id);
      const updated = [{ id: bhajan.id, title: bhajan.title, deity: bhajan.deity, category: bhajan.category }, ...filtered].slice(0, 5);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [RECENT_KEY]);

  // Global ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmDialog) { setConfirmDialog(null); return; }
      if (showBhajanPicker) { setShowBhajanPicker(false); return; }
      if (showReadingSettings) { setShowReadingSettings(false); return; }
      if (showOnboarding) { setShowOnboarding(false); return; }
      if (showPhoneLogin) { setShowPhoneLogin(false); return; }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [confirmDialog, showBhajanPicker, showReadingSettings, showOnboarding, showPhoneLogin]);

  const PAGE_SIZE = 20;
  const [publicVisibleCount, setPublicVisibleCount] = useState(PAGE_SIZE);
  const [libraryVisibleCount, setLibraryVisibleCount] = useState(PAGE_SIZE);
  const publicLoadMoreRef = useRef(null);
  const libraryLoadMoreRef = useRef(null);

  // Reset visible count when filters change
  useEffect(() => {
    setPublicVisibleCount(PAGE_SIZE);
  }, [publicSearchQuery, publicFilterDeity, publicFilterCategory, publicFilterKeyword]);
  useEffect(() => {
    setLibraryVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterDeity, filterCategory, libraryFilterKeyword]);

  // ==============================================
  // "LOAD MORE" OBSERVERS (SESSION 5: visibleCount removed from
  // deps — observer now lives for the whole view instead of being
  // torn down and rebuilt on every increment)
  // ==============================================
  useEffect(() => {
    if (currentView !== 'public-library') return;
    if (typeof IntersectionObserver === 'undefined') {
      setPublicVisibleCount(9999);
      return;
    }

    let observer;
    let retryTimer;
    let cancelled = false;

    const tryObserve = (attempt = 0) => {
      if (cancelled) return;
      const node = publicLoadMoreRef.current;
      if (node) {
        observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            setPublicVisibleCount(prev => prev + PAGE_SIZE);
          }
        }, { rootMargin: '400px' });
        observer.observe(node);
      } else if (attempt < 10) {
        retryTimer = setTimeout(() => tryObserve(attempt + 1), 100);
      }
    };

    tryObserve();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [currentView, publicBhajans.length]);

  useEffect(() => {
    if (currentView !== 'library') return;
    if (typeof IntersectionObserver === 'undefined') {
      setLibraryVisibleCount(9999);
      return;
    }

    let observer;
    let retryTimer;
    let cancelled = false;

    const tryObserve = (attempt = 0) => {
      if (cancelled) return;
      const node = libraryLoadMoreRef.current;
      if (node) {
        observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            setLibraryVisibleCount(prev => prev + PAGE_SIZE);
          }
        }, { rootMargin: '400px' });
        observer.observe(node);
      } else if (attempt < 10) {
        retryTimer = setTimeout(() => tryObserve(attempt + 1), 100);
      }
    };

    tryObserve();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [currentView, bhajans.length]);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('sankirtan-dark-mode') === 'true';
    } catch {
      return false;
    }
  });

  // OCR / File import states
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState('');
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const publicCameraInputRef = useRef(null);
  const publicImageInputRef = useRef(null);
  const publicPdfInputRef = useRef(null);

  // Save Hindi typing preference
  useEffect(() => {
    try {
      localStorage.setItem('sankirtan-hindi-typing', hindiTypingEnabled.toString());
    } catch (e) {}
  }, [hindiTypingEnabled]);

  // Save reading settings
  useEffect(() => {
    try {
      localStorage.setItem('sankirtan-reading-settings', JSON.stringify(readingSettings));
    } catch (e) {}
  }, [readingSettings]);

  // Reading wake lock
  useEffect(() => {
    const isReadingView = currentView === 'public-bhajan-detail' || currentView === 'bhajan-detail';
    const shouldHoldLock = readingSettings.keepScreenOn && isReadingView;

    let currentLock = readingWakeLock;

    const acquire = async () => {
      if (currentLock) return;
      if (!('wakeLock' in navigator)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        setReadingWakeLock(lock);
        lock.addEventListener('release', () => {
          setReadingWakeLock(null);
        });
      } catch (err) {
        console.log('Reading wake lock failed:', err);
      }
    };

    const release = async () => {
      if (!currentLock) return;
      try { await currentLock.release(); } catch (e) {}
      setReadingWakeLock(null);
    };

    if (shouldHoldLock) acquire();
    else release();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldHoldLock) acquire();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingSettings.keepScreenOn, currentView]);

  // Save dark mode
  useEffect(() => {
    try {
      localStorage.setItem('sankirtan-dark-mode', darkMode.toString());
    } catch (e) {}
    // SESSION 6: keep the Android status bar / PWA chrome in sync
    // with the app background — otherwise dark mode leaves a bright
    // cream bar at the top of the screen.
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', darkMode ? '#0f1a1c' : '#FFF8F0');
      }
    } catch (e) { /* non-fatal */ }
  }, [darkMode]);

  // ==============================================
  // NAVIGATION WITH HISTORY (browser back support)
  // SESSION 6: switching between the three top-level tabs
  // (public-library / library / programs) uses REPLACEstate so
  // the back button doesn't have to unwind every tab tap before
  // exiting. pushState is only used when drilling INTO a detail,
  // form, or admin view — which is where "back" is actually useful.
  // ==============================================
  const previousViewRef = useRef('public-library');
  const TOP_LEVEL_VIEWS = useMemo(
    () => new Set(['public-library', 'library', 'programs']),
    []
  );

  useEffect(() => {
    if (currentView !== previousViewRef.current) {
      setScrollPositions(prev => ({
        ...prev,
        [previousViewRef.current]: window.scrollY
      }));

      const bothTopLevel =
        TOP_LEVEL_VIEWS.has(currentView) &&
        TOP_LEVEL_VIEWS.has(previousViewRef.current);

      if (bothTopLevel) {
        // Sideways tab switch — don't grow the history stack.
        window.history.replaceState({ view: currentView }, '', window.location.pathname);
      } else {
        // Drill-down or drill-up between different navigation levels.
        window.history.pushState({ view: currentView }, '', window.location.pathname);
      }

      if (!window.__sankirtanBackNav) {
        window.scrollTo(0, 0);
      } else {
        const savedScroll = scrollPositions[currentView] || 0;

        if (savedScroll > 0) {
          const restoreScroll = () => {
            window.scrollTo({ top: savedScroll, behavior: 'instant' });
          };
          restoreScroll();
          requestAnimationFrame(() => {
            restoreScroll();
            requestAnimationFrame(() => {
              restoreScroll();
              setTimeout(restoreScroll, 100);
              setTimeout(restoreScroll, 300);
            });
          });
        }

        window.__sankirtanBackNav = false;
      }

      previousViewRef.current = currentView;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    const handlePopState = (event) => {
      window.__sankirtanBackNav = true;
      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
      } else {
        setCurrentView('public-library');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==============================================
  // VERSION CHECK (SESSION 5 FIX: null-guard so brand-new users
  // don't see "App Updated!" on their very first visit)
  // ==============================================
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem('sankirtan-app-version');
      if (savedVersion === null) {
        // First-ever visit — silently record version, no prompt
        localStorage.setItem('sankirtan-app-version', APP_VERSION);
      } else if (savedVersion !== APP_VERSION) {
        setShowUpdatePrompt(true);
      }
    } catch (e) {
      console.log('Version check skipped');
    }
  }, []);

  const dismissUpdatePrompt = () => {
    try {
      localStorage.setItem('sankirtan-app-version', APP_VERSION);
    } catch (e) {}
    setShowUpdatePrompt(false);
  };

  // ==============================================
  // PWA INSTALL PROMPT
  // ==============================================
  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('sankirtan-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;

    if (alreadyDismissed || isStandalone || isIOSStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);

    if (isIOS && isSafari && !isIOSStandalone) {
      const timer = setTimeout(() => {
        setShowIOSInstructions(true);
      }, 30000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('sankirtan-install-dismissed', 'installed');
      }
      setDeferredInstallPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const dismissInstallPrompt = () => {
    localStorage.setItem('sankirtan-install-dismissed', 'true');
    setShowInstallPrompt(false);
    setShowIOSInstructions(false);
  };

  // ==============================================
  // FEEDBACK FUNCTIONS
  // ==============================================
  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackError('Please write your feedback');
      return;
    }

    if (feedbackText.trim().length < 5) {
      setFeedbackError('Feedback too short. Please write at least 5 characters.');
      return;
    }

    try {
      setFeedbackSubmitting(true);
      setFeedbackError('');
      const db = window.firebase.firestore();

      await db.collection('feedback').add({
        text: feedbackText.trim(),
        userId: user.uid,
        userEmail: user.email || '',
        userName: userProfile?.displayName || 'Anonymous',
        userAgent: navigator.userAgent,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        status: 'new'
      });

      setFeedbackSuccess(true);
      setFeedbackText('');

      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Feedback submission error:', error);
      setFeedbackError('Could not submit: ' + error.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const loadFeedbackList = async () => {
    if (!isAdmin) return;
    try {
      setFeedbackListLoading(true);
      const db = window.firebase.firestore();
      const snapshot = await db.collection('feedback').get();
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setFeedbackList(list);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setFeedbackListLoading(false);
    }
  };

  const deleteFeedback = (feedbackId) => {
    if (!isAdmin) return;
    askConfirm(
      { title: 'Delete Feedback?', message: 'This feedback item will be permanently removed.', confirmLabel: '🗑️ Delete' },
      async () => {
        try {
          const db = window.firebase.firestore();
          await db.collection('feedback').doc(feedbackId).delete();
          setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
          showToast('Feedback deleted');
        } catch (error) {
          console.error('Error deleting feedback:', error);
          showToast('Could not delete: ' + error.message, 'error');
        }
      }
    );
  };

  // ==============================================
  // CONFIG LISTS (Deities, Categories, Keywords)
  // ==============================================
  const loadConfigLists = async () => {
    try {
      setConfigLoading(true);
      const db = window.firebase.firestore();
      const configDoc = await db.collection('appConfig').doc('lists').get();

      if (configDoc.exists) {
        const data = configDoc.data();
        setCustomDeities(data.deities || []);
        setCustomCategories(data.categories || []);
        setCustomKeywords(data.keywords || []);
      } else {
        if (isAdmin) {
          const seedData = {
            deities: DEITY_OPTIONS.map(d => d.value),
            categories: [...CATEGORY_OPTIONS],
            keywords: [...DEFAULT_KEYWORDS],
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid,
            seeded: true
          };
          await db.collection('appConfig').doc('lists').set(seedData);
          setCustomDeities(seedData.deities);
          setCustomCategories(seedData.categories);
          setCustomKeywords(seedData.keywords);
        }
      }
    } catch (error) {
      console.error('Error loading config lists:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const addConfigItem = async (type, value) => {
    if (!isAdmin) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    const current = type === 'deity' ? customDeities
                  : type === 'category' ? customCategories
                  : customKeywords;

    const existing = current.map(s => s.toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
      showToast(`"${trimmed}" already exists!`, 'error');
      return;
    }

    try {
      const db = window.firebase.firestore();
      const configRef = db.collection('appConfig').doc('lists');
      const fieldName = type === 'deity' ? 'deities'
                      : type === 'category' ? 'categories'
                      : 'keywords';

      const newList = [...current, trimmed];

      await configRef.set({
        [fieldName]: newList,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: user.uid
      }, { merge: true });

      if (type === 'deity') setCustomDeities(newList);
      else if (type === 'category') setCustomCategories(newList);
      else setCustomKeywords(newList);

      setNewItemInput(prev => ({ ...prev, [type]: '' }));
      showToast(`Added ${type}: ${trimmed}`);
    } catch (error) {
      console.error(`Error adding ${type}:`, error);
      showToast('Could not add: ' + error.message, 'error');
    }
  };

  const editConfigItem = async (type, oldValue, newValue) => {
    if (!isAdmin) return;
    const trimmed = newValue.trim();
    if (!trimmed || trimmed === oldValue) return;

    const current = type === 'deity' ? customDeities
                  : type === 'category' ? customCategories
                  : customKeywords;
    const existing = current.filter(s => s !== oldValue).map(s => s.toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
      showToast(`"${trimmed}" already exists!`, 'error');
      return;
    }

    const fieldName = type === 'deity' ? 'deity'
                    : type === 'category' ? 'category'
                    : null;

    let usageInfo = { publicUsage: 0, personalUsage: 0 };

    if (fieldName) {
      usageInfo.publicUsage = publicBhajans.filter(b => b[fieldName] === oldValue).length;
      usageInfo.personalUsage = bhajans.filter(b => b[fieldName] === oldValue).length;
    } else {
      usageInfo.publicUsage = publicBhajans.filter(b => (b.keywords || []).includes(oldValue)).length;
      usageInfo.personalUsage = bhajans.filter(b => (b.keywords || []).includes(oldValue)).length;
    }

    const totalUsage = usageInfo.publicUsage + usageInfo.personalUsage;

    if (totalUsage > 0) {
      showToast(`Cannot rename "${oldValue}" — ${totalUsage} bhajan${totalUsage !== 1 ? 's' : ''} still use it. Update those first.`, 'error');
      return;
    }

    try {
      const db = window.firebase.firestore();
      const configRef = db.collection('appConfig').doc('lists');
      const firestoreField = type === 'deity' ? 'deities'
                            : type === 'category' ? 'categories'
                            : 'keywords';

      const newList = current.map(item => item === oldValue ? trimmed : item);

      await configRef.set({
        [firestoreField]: newList,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: user.uid
      }, { merge: true });

      if (type === 'deity') setCustomDeities(newList);
      else if (type === 'category') setCustomCategories(newList);
      else setCustomKeywords(newList);

      setEditingItem(null);
      setEditingValue('');
      showToast(`Renamed to "${trimmed}"`);
    } catch (error) {
      console.error(`Error renaming ${type}:`, error);
      showToast('Could not rename: ' + error.message, 'error');
    }
  };

  const deleteConfigItem = (type, value) => {
    if (!isAdmin) return;

    const fieldName = type === 'deity' ? 'deity'
                    : type === 'category' ? 'category'
                    : null;

    let usageInfo = { publicUsage: 0, personalUsage: 0 };

    if (fieldName) {
      usageInfo.publicUsage = publicBhajans.filter(b => b[fieldName] === value).length;
      usageInfo.personalUsage = bhajans.filter(b => b[fieldName] === value).length;
    } else {
      usageInfo.publicUsage = publicBhajans.filter(b => (b.keywords || []).includes(value)).length;
      usageInfo.personalUsage = bhajans.filter(b => (b.keywords || []).includes(value)).length;
    }

    const totalUsage = usageInfo.publicUsage + usageInfo.personalUsage;

    if (totalUsage > 0) {
      showToast(`Cannot delete "${value}" — ${totalUsage} bhajan${totalUsage !== 1 ? 's' : ''} still use it. Remove it from those first.`, 'error');
      return;
    }

    askConfirm(
      { title: `Delete "${value}"?`, message: `This ${type} will be removed from the lists for all users.`, confirmLabel: '🗑️ Delete' },
      async () => {
        try {
          const db = window.firebase.firestore();
          const configRef = db.collection('appConfig').doc('lists');
          const firestoreField = type === 'deity' ? 'deities'
                                : type === 'category' ? 'categories'
                                : 'keywords';

          const current = type === 'deity' ? customDeities
                        : type === 'category' ? customCategories
                        : customKeywords;

          const newList = current.filter(item => item !== value);

          await configRef.set({
            [firestoreField]: newList,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
          }, { merge: true });

          if (type === 'deity') setCustomDeities(newList);
          else if (type === 'category') setCustomCategories(newList);
          else setCustomKeywords(newList);

          showToast(`Deleted ${type}: ${value}`);
        } catch (error) {
          console.error(`Error deleting ${type}:`, error);
          showToast('Could not delete: ' + error.message, 'error');
        }
      }
    );
  };

  // Combined lists
  const allDeityOptions = customDeities.length > 0
    ? customDeities.map(name => ({ value: name, emoji: '🕉️' }))
    : DEITY_OPTIONS;
  const allCategoryOptions = customCategories.length > 0 ? customCategories : CATEGORY_OPTIONS;
  const allKeywordOptions = customKeywords.length > 0 ? customKeywords : DEFAULT_KEYWORDS;

  // ==============================================
  // ONBOARDING TOUR FUNCTIONS
  // ==============================================
  const nextOnboardingStep = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      finishOnboarding();
    }
  };

  const previousOnboardingStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const markOnboardingCompleted = () => {
    localStorage.setItem('sankirtan-onboarding-completed', 'true');
    setUserProfile(prev => (prev ? { ...prev, hasSeenOnboarding: true } : prev));
    try {
      if (user) {
        const db = window.firebase.firestore();
        db.collection('users').doc(user.uid)
          .set({ hasSeenOnboarding: true }, { merge: true })
          .catch(err => console.log('Could not save tour flag to profile:', err.message));
      }
    } catch (e) {
      console.log('Could not save tour flag:', e.message);
    }
  };

  const finishOnboarding = () => {
    markOnboardingCompleted();
    setShowOnboarding(false);
    setOnboardingStep(0);
  };

  const skipOnboarding = () => {
    markOnboardingCompleted();
    setShowOnboarding(false);
    setOnboardingStep(0);
  };

  // ==============================================
  // FIREBASE INITIALIZATION
  // ==============================================
  useEffect(() => {
    const initFirebase = async () => {
      try {
        let attempts = 0;
        while (!window.firebase && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.firebase) {
          console.error('Firebase SDK failed to load');
          setLoading(false);
          return;
        }

        const firebaseConfig = {
          apiKey: "AIzaSyDTfTsY4NH2jjN-Sb_5rmFRNSrB6y4sJMA",
          authDomain: "sankirtan-app-ebc18.firebaseapp.com",
          projectId: "sankirtan-app-ebc18",
          storageBucket: "sankirtan-app-ebc18.firebasestorage.app",
          messagingSenderId: "638067419612",
          appId: "1:638067419612:web:707b18e7d6affefc9e4719",
          measurementId: "G-XKHJTB1MZ6"
        };

        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp(firebaseConfig);
        }

        try {
          await window.firebase.auth().setPersistence(
            window.firebase.auth.Auth.Persistence.LOCAL
          );
        } catch (persistErr) {
          console.log('Persistence setting failed:', persistErr.message);
        }

        try {
          if (!window._firestoreConfigured) {
            const db = window.firebase.firestore();

            // SESSION 9 FIX for the "experimentalForceLongPolling
            // and experimentalAutoDetectLongPolling cannot be used
            // together" runtime error that Session 8 introduced.
            //
            // The compat SDK's `merge: true` option merges new
            // settings on top of defaults. In v10.7.0 the defaults
            // include experimentalAutoDetectLongPolling:false, so
            // after merge the settings object ends up with BOTH
            // keys present. The SDK's own validation then throws
            // because setting both (even one true one false) is
            // not allowed. Removing merge:true means our object
            // replaces defaults wholesale.
            //
            // We also stopped swallowing config errors silently —
            // the previous console.warn hid the "cannot be used
            // together" error for a long time.
            try {
              db.settings({
                experimentalForceLongPolling: true
              });
            } catch (settingsErr) {
              console.error(
                'CRITICAL: Firestore db.settings() failed. ' +
                'App will not work correctly. Error: ',
                settingsErr && settingsErr.message
              );
              // Fall back to default transport so the app can at
              // least try to work. Don't set _firestoreConfigured
              // — let the next reload attempt fresh.
              throw settingsErr;
            }

            // Skip Firestore's IndexedDB persistence on iOS (all browsers).
            // On iOS every browser is a WebKit wrapper, and WebKit's IndexedDB
            // implementation causes slow first-load hydration and aggressive
            // eviction. The app already maintains a localStorage cache layer
            // for bhajans/programs, so we don't lose offline-first behaviour
            // by disabling this.
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const skipPersistence = isIOS;

            if (!skipPersistence) {
              try {
                await db.enablePersistence({ synchronizeTabs: true });
              } catch (persistErr) {
                if (persistErr.code === 'failed-precondition') {
                  console.log('Multiple tabs open, persistence enabled in first tab only');
                } else if (persistErr.code === 'unimplemented') {
                  console.log('Browser does not support persistence');
                }
              }
            }

            window._firestoreConfigured = true;
          }
        } catch (configErr) {
          console.warn('Firestore config error:', configErr);
        }

        try {
          const result = await window.firebase.auth().getRedirectResult();
          if (result && result.user) {
            console.log('✅ Redirect sign-in successful');
          }
        } catch (redirectError) {
          console.log('No redirect result:', redirectError.message);
        }

        window.firebase.auth().onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            loadUserProfile(firebaseUser); // non-blocking
          } else {
            setUser(null);
            setUserProfile(null);
            setBhajans([]);
          }
          setLoading(false);
        });

        setTimeout(() => {
          setLoading(false);
        }, 8000);

        // SESSION 7: fetchUserCount() removed from init.
        // The vanity counter was awaited on the critical path AND
        // was denied by Firestore rules (users collection is
        // per-user-only, no collection-level count permission).
        // The permission-denied error triggered Firestore's
        // exponential-backoff retry loop, blocking splash → sign-in
        // for 30-40 seconds on every cold start. Root cause of the
        // "app hangs on first open" reports.
      } catch (error) {
        console.error('Firebase init error:', error);
        setLoading(false);
      }
    };

    initFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==============================================
  // LOAD USER'S BHAJANS (SESSION 5: onSnapshot is now the single
  // source of truth — the duplicate .get() has been removed, halving
  // Firestore reads. A one-time .get() runs only if the listener errors.)
  // ==============================================
  useEffect(() => {
    if (!user) {
      setBhajans([]);
      return;
    }

    setBhajansLoading(true);
    const db = window.firebase.firestore();
    const bhajansRef = db.collection('users').doc(user.uid).collection('bhajans');

    // CACHE HYDRATION: instant paint from localStorage while
    // Firestore's listener delivers cached-then-fresh data.
    const CACHE_KEY = `sankirtan-my-bhajans-${user.uid}`;
    const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — devotional content changes rarely, stale-but-instant beats blank-but-fresh
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        const isStale = !cached.savedAt || (Date.now() - cached.savedAt) > CACHE_MAX_AGE_MS;
        if (cached.list && cached.list.length > 0 && !isStale) {
          setBhajans(cached.list);
          setBhajansLoading(false);
        }
      }
    } catch (e) { /* non-fatal */ }

    const saveCache = (list) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ list, savedAt: Date.now() }));
      } catch (e) { /* quota exceeded — non-fatal */ }
    };

    const sortAndSet = (snapshot) => {
      const bhajanList = [];
      snapshot.forEach((doc) => {
        bhajanList.push({ id: doc.id, ...doc.data() });
      });
      bhajanList.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setBhajans(bhajanList);
      setBhajansLoading(false);
      saveCache(bhajanList);
    };

    let unsubscribe = () => {};
    try {
      unsubscribe = bhajansRef.onSnapshot(
        sortAndSet,
        async (error) => {
          // Listener failed (rare network configs) — one-time .get() fallback
          console.log('Bhajans listener error, trying one-time fetch:', error.message);
          try {
            const snapshot = await bhajansRef.get();
            sortAndSet(snapshot);
          } catch (getErr) {
            console.error('Bhajans fallback fetch failed:', getErr);
            setBhajansLoading(false);
          }
        }
      );
    } catch (e) {
      console.log('Could not set up bhajans listener');
      setBhajansLoading(false);
    }

    return () => unsubscribe();
  }, [user]);

  // ==============================================
  // LOAD USER'S PROGRAMS (SESSION 5: same snapshot-only pattern)
  // ==============================================
  useEffect(() => {
    if (!user) {
      setPrograms([]);
      return;
    }

    setProgramsLoading(true);
    const db = window.firebase.firestore();
    const programsRef = db.collection('users').doc(user.uid).collection('programs');

    const PROG_CACHE_KEY = `sankirtan-programs-${user.uid}`;
    const PROG_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — programs change rarely once created
    try {
      const raw = localStorage.getItem(PROG_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.list && cached.list.length > 0 && cached.savedAt && (Date.now() - cached.savedAt) < PROG_CACHE_MAX_AGE_MS) {
          setPrograms(cached.list);
          setProgramsLoading(false);
        }
      }
    } catch (e) { /* non-fatal */ }

    const saveProgramsCache = (list) => {
      try {
        localStorage.setItem(PROG_CACHE_KEY, JSON.stringify({ list, savedAt: Date.now() }));
      } catch (e) { /* quota exceeded */ }
    };

    const sortAndSet = (snapshot) => {
      const programList = [];
      snapshot.forEach((doc) => {
        programList.push({ id: doc.id, ...doc.data() });
      });
      programList.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setPrograms(programList);
      setProgramsLoading(false);
      saveProgramsCache(programList);
    };

    let unsubscribe = () => {};
    try {
      unsubscribe = programsRef.onSnapshot(
        sortAndSet,
        async (error) => {
          console.log('Programs listener error, trying one-time fetch:', error.message);
          try {
            const snapshot = await programsRef.get();
            sortAndSet(snapshot);
          } catch (getErr) {
            console.error('Programs fallback fetch failed:', getErr);
            setProgramsLoading(false);
          }
        }
      );
    } catch (e) {
      console.log('Could not set up programs listener');
      setProgramsLoading(false);
    }

    return () => unsubscribe();
  }, [user]);

  // ==============================================
  // LOAD PUBLIC LIBRARY BHAJANS (SESSION 5: snapshot-only —
  // removed the .get() + retry-chain that ran alongside the listener)
  // ==============================================
  useEffect(() => {
    if (!user && !guestMode) {
      setPublicBhajans([]);
      return;
    }

    setPublicLoading(true);
    const db = window.firebase.firestore();
    const publicRef = db.collection('publicBhajans');

    const CACHE_KEY = 'sankirtan-public-bhajans-cache';
    const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — public library changes rarely; extended TTL avoids blank-then-repaint on weekly visitors
    let cacheHit = false;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        const isStale = !cached.savedAt || (Date.now() - cached.savedAt) > CACHE_MAX_AGE_MS;
        if (cached.list && cached.list.length > 0 && !isStale) {
          setPublicBhajans(cached.list);
          setPublicLoading(false);
          cacheHit = true;
        }
      }
    } catch (e) { /* non-fatal */ }

    // Progressive load for cold-cache users: fetch the newest 30 bhajans
    // immediately so the library renders in ~200-400ms, then the full
    // onSnapshot below delivers the rest in the background (~800-1500ms).
    // The onSnapshotFired flag prevents a slow .get() from overwriting the
    // full data if onSnapshot happens to arrive first.
    let onSnapshotFired = false;
    if (!cacheHit) {
      publicRef.orderBy('createdAt', 'desc').limit(30).get()
        .then((snapshot) => {
          if (onSnapshotFired) return;
          const list = [];
          snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setPublicBhajans(list);
          setPublicLoading(false);
        })
        .catch((e) => console.log('Initial 30-bhajan fetch failed:', e.message));
    }

    const saveCache = (list) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ list, savedAt: Date.now() }));
      } catch (e) { /* non-fatal */ }
    };

    const sortAndSet = (snapshot) => {
      onSnapshotFired = true;
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setPublicBhajans(list);
      setPublicLoading(false);
      saveCache(list);
    };

    let unsubscribe = () => {};
    try {
      unsubscribe = publicRef.onSnapshot(
        sortAndSet,
        async (error) => {
          console.log('Public listener error, trying one-time fetch:', error.message);
          try {
            const snapshot = await publicRef.get();
            sortAndSet(snapshot);
          } catch (getErr) {
            console.error('Public fallback fetch failed:', getErr);
            setPublicLoading(false);
          }
        }
      );
    } catch (listenerErr) {
      console.log('Could not set up public listener:', listenerErr.message);
      setPublicLoading(false);
    }

    return () => unsubscribe();
  }, [user, guestMode]);

  // SESSION 8: after 8s of skeleton loading, show a "Having trouble
  // loading" prompt with a Retry button so guests aren't stuck.
  // Cleared as soon as data arrives OR user leaves the view.
  useEffect(() => {
    if (!publicLoading) {
      setPublicLoadingStuck(false);
      return;
    }
    const t = setTimeout(() => setPublicLoadingStuck(true), 8000);
    return () => clearTimeout(t);
  }, [publicLoading]);

  // Track which public bhajans user has already saved
  useEffect(() => {
    if (!user || !bhajans) {
      setSavedBhajanIds(new Set());
      return;
    }

    const saved = new Set();
    bhajans.forEach(b => {
      if (b.savedFromPublicId) {
        saved.add(b.savedFromPublicId);
      }
    });
    setSavedBhajanIds(saved);
  }, [user, bhajans]);

  // ==============================================
  // USER PROFILE MANAGEMENT
  // ==============================================
  const loadUserProfile = async (firebaseUser, retryCount = 0) => {
    const MAX_RETRIES = 2;

    if (retryCount === 0) {
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL,
        stats: { bhajanCount: 0, publicBhajanCount: 0, followerCount: 0, followingCount: 0 },
        _loading: true
      });
    }

    try {
      const db = window.firebase.firestore();

      let userDoc;
      try {
        userDoc = await db.collection('users').doc(firebaseUser.uid).get({ source: 'default' });
      } catch (fetchErr) {
        try {
          userDoc = await db.collection('users').doc(firebaseUser.uid).get({ source: 'cache' });
        } catch (cacheErr) {
          throw fetchErr;
        }
      }

      if (userDoc.exists) {
        const profile = userDoc.data();
        setUserProfile(profile);

        loadConfigLists();

        const hasSeenTour = localStorage.getItem('sankirtan-onboarding-completed');
        if (!hasSeenTour && !profile.hasSeenOnboarding) {
          setTimeout(() => {
            setShowOnboarding(true);
            setOnboardingStep(0);
          }, 800);
        }
      } else {
        setProfileForm({
          displayName: firebaseUser.displayName || '',
          bio: '',
          location: '',
          whatsapp: firebaseUser.phoneNumber || '',
          youtube: '',
          instagram: ''
        });
        setShowProfileSetup(true);
      }
    } catch (error) {
      console.error(`Profile load failed (attempt ${retryCount + 1}):`, error.message);

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          loadUserProfile(firebaseUser, retryCount + 1);
        }, 1500);
      } else {
        setUserProfile(prev => ({
          ...prev,
          _loading: false,
          _minimal: true
        }));
      }
    }
  };

  // SESSION 7: fetchUserCount() deleted. Was a vanity "N devotees
  // joined" counter that (a) required collection-level read on
  // users/ which isn't permitted by security rules, (b) sat on the
  // critical path in initFirebase() awaiting a permission-denied
  // retry loop. Cosmetic feature, blocking cost, no way to
  // reconcile without loosening user-privacy rules — deleted.

  const saveProfile = async () => {
    if (!user || !profileForm.displayName.trim()) {
      setAuthError('Please enter your name');
      return;
    }

    try {
      setAuthLoading(true);
      const db = window.firebase.firestore();

      const profileData = {
        uid: user.uid,
        email: user.email || null,
        phoneNumber: user.phoneNumber || null,
        photoURL: user.photoURL || null,
        displayName: profileForm.displayName.trim(),
        bio: profileForm.bio.trim(),
        location: profileForm.location.trim(),
        contactInfo: {
          whatsapp: profileForm.whatsapp.trim(),
          youtube: profileForm.youtube.trim(),
          instagram: profileForm.instagram.trim()
        },
        verified: false,
        stats: {
          bhajanCount: 0,
          publicBhajanCount: 0,
          followerCount: 0,
          followingCount: 0
        },
        preferences: {
          theme: 'saffron',
          hindiTypingEnabled: true,
          viewMode: 'normal',
          fontSize: 18
        },
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(user.uid).set(profileData);
      setUserProfile(profileData);
      setShowProfileSetup(false);
      setAuthError('');

      const hasSeenTour = localStorage.getItem('sankirtan-onboarding-completed');
      if (!hasSeenTour) {
        setTimeout(() => {
          setShowOnboarding(true);
          setOnboardingStep(0);
        }, 800);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setAuthError('Could not save profile: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ==============================================
  // OCR / FILE IMPORT (unchanged from Session 4)
  // ==============================================
  const loadScriptOnce = (src, globalName) => {
    return new Promise((resolve, reject) => {
      if (globalName && window[globalName]) return resolve();
      const existing = document.querySelector('script[data-ocr-src="' + src + '"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.ocrSrc = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  };

  const cleanupExtractedText = (text) => {
    return (text || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const applyExtractedText = (rawText, sourceLabel, formSetter = setBhajanForm) => {
    const text = cleanupExtractedText(rawText);
    if (!text || text.length < 3) {
      setOcrMessage('⚠️ No readable text found in this ' + sourceLabel + '. Try a clearer photo or type manually.');
      return false;
    }
    formSetter(prev => {
      const mergedLyrics = prev.lyrics.trim()
        ? prev.lyrics.trim() + '\n\n' + text
        : text;
      let title = prev.title;
      if (!title.trim()) {
        const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length >= 3) || '';
        title = firstLine.slice(0, 60);
      }
      return { ...prev, lyrics: mergedLyrics, title };
    });
    setOcrMessage('✅ Text extracted from ' + sourceLabel + '! Please review & edit below, then save.');
    return true;
  };

  const fileToOptimizedDataUrl = (file, maxDim = 1800) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => reject(new Error('Could not read this image file'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read this file'));
      reader.readAsDataURL(file);
    });
  };

  const ocrImageSource = async (imageSource, sourceLabel) => {
    const isFirstUse = !window.Tesseract;
    if (isFirstUse) {
      setOcrMessage('📥 Downloading OCR engine (~2 MB, one-time only). Next time will be instant...');
      setOcrProgress(0);
    }
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract');

    const langModelsCached = localStorage.getItem('sankirtan-tesseract-langs-cached');

    const result = await window.Tesseract.recognize(imageSource, 'hin+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          setOcrProgress(pct);
          setOcrMessage('🔍 Reading text from ' + sourceLabel + '... ' + pct + '%');
        } else if (m.status === 'loading tesseract core') {
          setOcrMessage('⏳ Loading OCR core engine...');
        } else if (m.status === 'initializing tesseract') {
          setOcrMessage('⚙️ Initializing OCR engine...');
        } else if (m.status === 'loading language traineddata') {
          const pct = Math.round((m.progress || 0) * 100);
          if (!langModelsCached) {
            setOcrMessage('📥 Downloading Hindi + English language data (~15 MB, one-time)... ' + pct + '%');
          } else {
            setOcrMessage('📚 Loading language data from cache... ' + pct + '%');
          }
          setOcrProgress(pct);
        } else if (m.status === 'initializing api') {
          setOcrMessage('⚙️ Preparing OCR engine...');
        } else if (m.status && m.status.indexOf('loading') !== -1) {
          setOcrMessage('⏳ ' + m.status + '...');
        }
      }
    });

    if (!langModelsCached) {
      try { localStorage.setItem('sankirtan-tesseract-langs-cached', 'true'); } catch (e) {}
    }

    return result && result.data ? result.data.text : '';
  };

  const handleImageFileForOcr = async (file, sourceLabel, formSetter = setBhajanForm) => {
    if (!file) return;
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrMessage('⏳ Preparing ' + sourceLabel + '...');
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      const text = await ocrImageSource(dataUrl, sourceLabel);
      applyExtractedText(text, sourceLabel, formSetter);
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrMessage('❌ Could not read text from this file. Check your internet (needed for first-time engine load) or type manually.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handlePdfFileForOcr = async (file, formSetter = setBhajanForm) => {
    if (!file) return;
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrMessage('⏳ Reading PDF...');
    try {
      await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const buffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
      const PAGE_LIMIT = 10;
      const maxPages = Math.min(pdf.numPages, PAGE_LIMIT);

      if (pdf.numPages > PAGE_LIMIT) {
        setOcrMessage('⚠️ PDF has ' + pdf.numPages + ' pages. Processing first ' + PAGE_LIMIT + ' only. To import more, split the PDF or upload the rest separately.');
        await new Promise(r => setTimeout(r, 2500));
      }

      let extracted = '';

      for (let p = 1; p <= maxPages; p++) {
        setOcrMessage('📄 Reading page ' + p + ' of ' + maxPages + '...');
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        extracted += content.items.map(it => it.str).join(' ') + '\n\n';
        try { page.cleanup && page.cleanup(); } catch (e) {}
      }

      if (cleanupExtractedText(extracted).length < 10) {
        extracted = '';
        for (let p = 1; p <= maxPages; p++) {
          setOcrMessage('🔍 Scanning page ' + p + ' of ' + maxPages + ' for text...');
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          extracted += (await ocrImageSource(dataUrl, 'page ' + p)) + '\n\n';

          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup && page.cleanup();
          } catch (e) { /* best effort */ }
        }
      }

      try { pdf.destroy && pdf.destroy(); } catch (e) {}

      applyExtractedText(extracted, 'PDF', formSetter);
    } catch (err) {
      console.error('PDF import failed:', err);
      setOcrMessage('❌ Could not read this PDF. Check your internet (needed for first-time engine load) or type manually.');
    } finally {
      setOcrProcessing(false);
    }
  };

  // ==============================================
  // VOICE SEARCH (Web Speech API)
  // ==============================================
  const startVoiceSearch = (targetField) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice search is not supported in this browser. Please use Chrome or Safari.', 'error');
      return;
    }
    if (isListening && speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isIOSSafari = isIOS && /^((?!chrome|android).)*safari/i.test(ua);

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;

    if (isIOSSafari) {
      recognition.continuous = false;
      recognition.interimResults = false;
    } else {
      recognition.continuous = true;
      recognition.interimResults = true;
    }
    recognition.lang = speechLang;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        if (e.error === 'not-allowed') {
          showToast('Microphone access blocked. Please allow microphone in browser settings.', 'error');
        }
      }
    };
    recognition.onresult = (e) => {
      let interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      const display = (finalTranscript + interimTranscript).trim();
      if (targetField === 'library') setSearchQuery(display);
      else if (targetField === 'public') setPublicSearchQuery(display);
      else if (targetField === 'bhajanPicker') setBhajanPickerSearch(display);
    };
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // ==============================================
  // BHAJAN CRUD OPERATIONS
  // ==============================================
  const openAddBhajan = () => {
    setBhajanForm({
      title: '',
      lyrics: '',
      deity: 'Babosa',
      category: 'Bhajan',
      language: 'Hindi',
      dhun: '',
      scale: '',
      keywords: [],
      source: ''
    });
    setBhajanFormError('');
    setEditingBhajan(null);
    setOcrMessage('');
    setOcrProgress(0);
    setOcrProcessing(false);
    setCurrentView('add-bhajan');
  };

  const openEditBhajan = (bhajan) => {
    setBhajanForm({
      title: bhajan.title || '',
      lyrics: bhajan.lyrics || '',
      deity: bhajan.deity || 'Babosa',
      category: bhajan.category || 'Bhajan',
      language: bhajan.language || 'Hindi',
      dhun: bhajan.dhun || '',
      scale: bhajan.scale || '',
      keywords: bhajan.keywords || [],
      source: bhajan.source || ''
    });
    setBhajanFormError('');
    setEditingBhajan(bhajan);
    setCurrentView('edit-bhajan');
  };

  const saveBhajan = async () => {
    if (!bhajanForm.title.trim()) {
      setBhajanFormError('Please enter a bhajan title');
      return;
    }
    if (!bhajanForm.lyrics.trim()) {
      setBhajanFormError('Please enter bhajan lyrics');
      return;
    }

    try {
      setBhajanFormSaving(true);
      setBhajanFormError('');
      const db = window.firebase.firestore();

      const bhajanData = {
        title: bhajanForm.title.trim(),
        lyrics: bhajanForm.lyrics.trim(),
        deity: bhajanForm.deity,
        category: bhajanForm.category,
        language: bhajanForm.language || 'Hindi',
        dhun: bhajanForm.dhun.trim(),
        scale: bhajanForm.scale.trim(),
        keywords: bhajanForm.keywords,
        source: bhajanForm.source.trim(),
        ownerId: user.uid,
        ownerName: userProfile.displayName,
        visibility: 'private',
        viewCount: editingBhajan ? (editingBhajan.viewCount || 0) : 0,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      const bhajansRef = db.collection('users').doc(user.uid).collection('bhajans');

      if (editingBhajan) {
        await bhajansRef.doc(editingBhajan.id).update(bhajanData);
        setSelectedBhajan({ ...editingBhajan, ...bhajanData });
        setCurrentView('bhajan-detail');
        showToast('💾 Changes saved');
      } else {
        bhajanData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await bhajansRef.add(bhajanData);

        await db.collection('users').doc(user.uid).update({
          'stats.bhajanCount': window.firebase.firestore.FieldValue.increment(1)
        });

        setUserProfile(prev => ({
          ...prev,
          stats: { ...prev.stats, bhajanCount: (prev.stats?.bhajanCount || 0) + 1 }
        }));

        setCurrentView('library');
        showToast(`✅ "${bhajanData.title}" added to your library`);
      }
    } catch (error) {
      console.error('Error saving bhajan:', error);
      setBhajanFormError('Could not save: ' + error.message);
    } finally {
      setBhajanFormSaving(false);
    }
  };

  // SESSION 5: browser confirm() → branded ConfirmDialog
  const deleteBhajan = (bhajan) => {
    askConfirm(
      {
        title: 'Delete Bhajan?',
        message: `"${bhajan.title}" will be permanently deleted from your library. This cannot be undone.`,
        confirmLabel: '🗑️ Delete'
      },
      async () => {
        try {
          const db = window.firebase.firestore();
          await db.collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).delete();

          await db.collection('users').doc(user.uid).update({
            'stats.bhajanCount': window.firebase.firestore.FieldValue.increment(-1)
          });

          setUserProfile(prev => ({
            ...prev,
            stats: { ...prev.stats, bhajanCount: Math.max(0, (prev.stats?.bhajanCount || 0) - 1) }
          }));

          setCurrentView('library');
          setSelectedBhajan(null);
          showToast('Bhajan deleted');
        } catch (error) {
          console.error('Error deleting bhajan:', error);
          showToast('Could not delete: ' + error.message, 'error');
        }
      }
    );
  };

  // SESSION 6: useCallback so MyBhajanCard's React.memo holds
  // (a fresh function every render would defeat memoization).
  const openBhajanDetail = useCallback(async (bhajan) => {
    setSelectedBhajan(bhajan);
    setCurrentView('bhajan-detail');
    trackRecentRead(bhajan);

    try {
      if (!user) return;
      const db = window.firebase.firestore();
      await db.collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).update({
        viewCount: window.firebase.firestore.FieldValue.increment(1),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.log('Could not update view count:', error);
    }
  }, [user, trackRecentRead]);

  // ==============================================
  // HINDI TYPING - GOOGLE INPUT TOOLS API
  // (SESSION 5 FIX: cache key is now hiKey(word) = "hi:word"
  // consistently for reads AND writes — previously reads used the
  // bare word so the cache never hit and every keystroke refetched)
  // ==============================================
  const fetchGoogleSuggestions = async (word) => {
    if (!word || word.length < 1) {
      setTransliterationSuggestions([]);
      return;
    }

    const cacheKey = hiKey(word);

    // Check cache first — now actually hits!
    if (suggestionsCacheRef.current[cacheKey]) {
      setTransliterationSuggestions(suggestionsCacheRef.current[cacheKey]);
      return;
    }

    if (suggestionsAbortRef.current && suggestionsAbortRef.current.abort) {
      try {
        suggestionsAbortRef.current.abort();
      } catch (e) {}
    }

    const controller = new AbortController();
    suggestionsAbortRef.current = controller;

    try {
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`;
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();

      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        const suggestions = data[1][0][1].slice(0, 5);
        setTransliterationSuggestions(suggestions);
        // SESSION 6: write straight to the ref — no re-render.
        suggestionsCacheRef.current[cacheKey] = suggestions;
      } else {
        const fallback = HINDI_FALLBACK_MAP[word.toLowerCase()];
        setTransliterationSuggestions(fallback ? [fallback] : []);
        if (fallback) {
          suggestionsCacheRef.current[cacheKey] = [fallback];
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const fallback = HINDI_FALLBACK_MAP[word.toLowerCase()];
        setTransliterationSuggestions(fallback ? [fallback] : []);
      }
    }
  };

  // Shared lookup used by all keydown/input handlers
  const getCachedSuggestions = (word) => {
    const lowerWord = word.toLowerCase();
    return suggestionsCacheRef.current[hiKey(lowerWord)] ||
      (HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);
  };

  const handleHindiKeyDown = (e, fieldName) => {
    if (!hindiTypingEnabled) return;
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== '.') return;

    const target = e.target;
    const cursorPos = target.selectionStart;
    const value = target.value;

    let wordStart = cursorPos - 1;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    const currentWordText = value.substring(wordStart, cursorPos);

    if (!currentWordText || !/^[a-zA-Z]+$/.test(currentWordText)) {
      setShowSuggestions(false);
      return;
    }

    const cachedSuggestions = getCachedSuggestions(currentWordText);

    if (cachedSuggestions && cachedSuggestions.length > 0) {
      e.preventDefault();
      const replacement = cachedSuggestions[0];
      const separator = e.key === '.' ? '.' : (e.key === 'Enter' ? '\n' : ' ');
      const newValue = value.substring(0, wordStart) + replacement + separator + value.substring(cursorPos);

      setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));

      setShowSuggestions(false);
      setCurrentWord('');

      setTimeout(() => {
        const newCursor = wordStart + replacement.length + 1;
        target.selectionStart = newCursor;
        target.selectionEnd = newCursor;
      }, 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleHindiInput = (e, fieldName) => {
    const value = e.target.value;
    const oldValue = bhajanForm[fieldName] || '';

    const spaceJustTyped = value.length > oldValue.length &&
                           (value.endsWith(' ') || value.endsWith('\n') || value.endsWith('.')) &&
                           !oldValue.endsWith(value.slice(-1));

    setBhajanForm(prev => ({ ...prev, [fieldName]: value }));

    if (!hindiTypingEnabled) {
      setShowSuggestions(false);
      return;
    }

    const cursorPos = e.target.selectionStart;

    if (spaceJustTyped) {
      const separator = value.slice(-1);
      const beforeSeparator = value.slice(0, -1);

      let wordStart = beforeSeparator.length;
      while (wordStart > 0 && beforeSeparator[wordStart - 1] !== ' ' && beforeSeparator[wordStart - 1] !== '\n') {
        wordStart--;
      }
      const lastWord = beforeSeparator.substring(wordStart);

      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        const cachedSuggestions = getCachedSuggestions(lastWord);

        if (cachedSuggestions && cachedSuggestions.length > 0) {
          const replacement = cachedSuggestions[0];
          const newValue = beforeSeparator.substring(0, wordStart) + replacement + separator;

          setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
          setShowSuggestions(false);
          setCurrentWord('');

          setTimeout(() => {
            const target = e.target;
            const newCursor = wordStart + replacement.length + 1;
            target.selectionStart = newCursor;
            target.selectionEnd = newCursor;
          }, 0);
          return;
        }
      }

      setShowSuggestions(false);
      setCurrentWord('');
      return;
    }

    let wordStart = cursorPos;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    const wordText = value.substring(wordStart, cursorPos);

    if (wordText && /^[a-zA-Z]+$/.test(wordText) && wordText.length >= 1) {
      setCurrentWord(wordText);
      setActiveTypingField(fieldName);

      if (suggestionsAbortRef.current && suggestionsAbortRef.current._timerId) {
        clearTimeout(suggestionsAbortRef.current._timerId);
      }
      const timerId = setTimeout(() => fetchGoogleSuggestions(wordText), 200);
      suggestionsAbortRef.current = {
        _timerId: timerId,
        abort: () => clearTimeout(timerId)
      };
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setCurrentWord('');
    }
  };

  const applySuggestion = (suggestion, fieldName) => {
    const fieldElement = document.getElementById(`hindi-input-${fieldName}`);
    if (!fieldElement) return;

    const cursorPos = fieldElement.selectionStart;
    const value = fieldElement.value;

    let wordStart = cursorPos;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }

    const newValue = value.substring(0, wordStart) + suggestion + ' ' + value.substring(cursorPos);
    setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));

    setShowSuggestions(false);
    setCurrentWord('');

    requestAnimationFrame(() => {
      fieldElement.focus();
      const newCursor = wordStart + suggestion.length + 1;
      fieldElement.setSelectionRange(newCursor, newCursor);
    });
  };

  // ==============================================
  // PUBLIC BHAJAN FORM - HINDI TYPING HANDLERS
  // ==============================================
  const handlePublicHindiInput = (e, fieldName) => {
    const value = e.target.value;
    const oldValue = publicBhajanForm[fieldName] || '';

    const spaceJustTyped = value.length > oldValue.length &&
                           (value.endsWith(' ') || value.endsWith('\n') || value.endsWith('.')) &&
                           !oldValue.endsWith(value.slice(-1));

    setPublicBhajanForm(prev => ({ ...prev, [fieldName]: value }));

    if (!hindiTypingEnabled) {
      setShowSuggestions(false);
      return;
    }

    const cursorPos = e.target.selectionStart;

    if (spaceJustTyped) {
      const separator = value.slice(-1);
      const beforeSeparator = value.slice(0, -1);

      let wordStart = beforeSeparator.length;
      while (wordStart > 0 && beforeSeparator[wordStart - 1] !== ' ' && beforeSeparator[wordStart - 1] !== '\n') {
        wordStart--;
      }
      const lastWord = beforeSeparator.substring(wordStart);

      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        const cachedSuggestions = getCachedSuggestions(lastWord);

        if (cachedSuggestions && cachedSuggestions.length > 0) {
          const replacement = cachedSuggestions[0];
          const newValue = beforeSeparator.substring(0, wordStart) + replacement + separator;

          setPublicBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
          setShowSuggestions(false);
          setCurrentWord('');

          setTimeout(() => {
            const target = e.target;
            const newCursor = wordStart + replacement.length + 1;
            target.selectionStart = newCursor;
            target.selectionEnd = newCursor;
          }, 0);
          return;
        }
      }

      setShowSuggestions(false);
      setCurrentWord('');
      return;
    }

    let wordStart = cursorPos;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    const wordText = value.substring(wordStart, cursorPos);

    if (wordText && /^[a-zA-Z]+$/.test(wordText) && wordText.length >= 1) {
      setCurrentWord(wordText);
      setActiveTypingField(fieldName);

      if (suggestionsAbortRef.current && suggestionsAbortRef.current._timerId) {
        clearTimeout(suggestionsAbortRef.current._timerId);
      }
      const timerId = setTimeout(() => fetchGoogleSuggestions(wordText), 200);
      suggestionsAbortRef.current = {
        _timerId: timerId,
        abort: () => clearTimeout(timerId)
      };
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setCurrentWord('');
    }
  };

  const handlePublicHindiKeyDown = (e, fieldName) => {
    if (!hindiTypingEnabled) return;
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== '.') return;

    const target = e.target;
    const cursorPos = target.selectionStart;
    const value = target.value;

    let wordStart = cursorPos - 1;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    const currentWordText = value.substring(wordStart, cursorPos);

    if (!currentWordText || !/^[a-zA-Z]+$/.test(currentWordText)) {
      setShowSuggestions(false);
      return;
    }

    const cachedSuggestions = getCachedSuggestions(currentWordText);

    if (cachedSuggestions && cachedSuggestions.length > 0) {
      e.preventDefault();
      const replacement = cachedSuggestions[0];
      const separator = e.key === '.' ? '.' : (e.key === 'Enter' ? '\n' : ' ');
      const newValue = value.substring(0, wordStart) + replacement + separator + value.substring(cursorPos);

      setPublicBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));

      setShowSuggestions(false);
      setCurrentWord('');

      setTimeout(() => {
        const newCursor = wordStart + replacement.length + 1;
        target.selectionStart = newCursor;
        target.selectionEnd = newCursor;
      }, 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const applyPublicSuggestion = (suggestion, fieldName) => {
    const fieldElement = document.getElementById(`public-hindi-input-${fieldName}`);
    if (!fieldElement) return;

    const cursorPos = fieldElement.selectionStart;
    const value = fieldElement.value;

    let wordStart = cursorPos;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }

    const newValue = value.substring(0, wordStart) + suggestion + ' ' + value.substring(cursorPos);
    setPublicBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));

    setShowSuggestions(false);
    setCurrentWord('');

    requestAnimationFrame(() => {
      fieldElement.focus();
      const newCursor = wordStart + suggestion.length + 1;
      fieldElement.setSelectionRange(newCursor, newCursor);
    });
  };

  // ==============================================
  // PUBLIC LIBRARY OPERATIONS
  // ==============================================
  // SESSION 6: useCallback so PublicBhajanCard's React.memo holds.
  const openPublicBhajanDetail = useCallback((bhajan) => {
    setSelectedPublicBhajan(bhajan);
    setCurrentView('public-bhajan-detail');
  }, []);

  const saveToMyLibrary = useCallback(async (publicBhajan) => {
    if (!user || !userProfile) {
      if (guestMode) { setGuestMode(false); }
      return;
    }

    if (savedBhajanIds.has(publicBhajan.id)) {
      showToast('Already in your library!', 'error');
      return;
    }

    try {
      setSavingToLibrary(true);
      const db = window.firebase.firestore();

      const bhajanData = {
        title: publicBhajan.title || '',
        lyrics: publicBhajan.lyrics || '',
        deity: publicBhajan.deity || 'Others',
        category: publicBhajan.category || 'Bhajan',
        dhun: publicBhajan.dhun || '',
        scale: publicBhajan.scale || '',
        keywords: publicBhajan.keywords || [],
        source: publicBhajan.source || '',
        ownerId: user.uid,
        ownerName: userProfile.displayName,
        visibility: 'private',
        viewCount: 0,
        savedFromPublicId: publicBhajan.id,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(user.uid).collection('bhajans').add(bhajanData);

      await db.collection('users').doc(user.uid).update({
        'stats.bhajanCount': window.firebase.firestore.FieldValue.increment(1)
      });

      setUserProfile(prev => ({
        ...prev,
        stats: { ...prev.stats, bhajanCount: (prev.stats?.bhajanCount || 0) + 1 }
      }));

      setSavedBhajanIds(prev => new Set([...prev, publicBhajan.id]));

      try {
        await db.collection('publicBhajans').doc(publicBhajan.id).update({
          saveCount: window.firebase.firestore.FieldValue.increment(1)
        });
      } catch (e) { /* not admin — expected */ }

      showToast(`✅ "${publicBhajan.title}" added to your library!`);
    } catch (error) {
      console.error('Error saving bhajan:', error);
      showToast('Could not save: ' + error.message, 'error');
    } finally {
      setSavingToLibrary(false);
    }
  }, [user, userProfile, guestMode, savedBhajanIds, showToast]);

  // ==============================================
  // MEMOIZED FILTERED LISTS (SESSION 5: previously ran full-lyrics
  // .toLowerCase().includes() on every single render)
  // ==============================================
  const filteredPublicBhajans = useMemo(() => {
    const q = debouncedPublicSearch.toLowerCase();
    return publicBhajans.filter(bhajan => {
      if (q) {
        const matches =
          (bhajan.title && bhajan.title.toLowerCase().includes(q)) ||
          (bhajan.lyrics && bhajan.lyrics.toLowerCase().includes(q)) ||
          (bhajan.dhun && bhajan.dhun.toLowerCase().includes(q)) ||
          (bhajan.keywords && bhajan.keywords.some(k => k.toLowerCase().includes(q)));
        if (!matches) return false;
      }
      if (publicFilterDeity && bhajan.deity !== publicFilterDeity) return false;
      if (publicFilterCategory && bhajan.category !== publicFilterCategory) return false;
      if (publicFilterKeyword && (!bhajan.keywords || !bhajan.keywords.includes(publicFilterKeyword))) return false;
      return true;
    });
  }, [publicBhajans, debouncedPublicSearch, publicFilterDeity, publicFilterCategory, publicFilterKeyword]);

  const filteredBhajans = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase();
    return bhajans.filter(bhajan => {
      if (q) {
        const matches =
          (bhajan.title && bhajan.title.toLowerCase().includes(q)) ||
          (bhajan.lyrics && bhajan.lyrics.toLowerCase().includes(q)) ||
          (bhajan.dhun && bhajan.dhun.toLowerCase().includes(q)) ||
          (bhajan.keywords && bhajan.keywords.some(k => k.toLowerCase().includes(q)));
        if (!matches) return false;
      }
      if (filterDeity && bhajan.deity !== filterDeity) return false;
      if (filterCategory && bhajan.category !== filterCategory) return false;
      if (libraryFilterKeyword && (!bhajan.keywords || !bhajan.keywords.includes(libraryFilterKeyword))) return false;
      return true;
    });
  }, [bhajans, debouncedSearchQuery, filterDeity, filterCategory, libraryFilterKeyword]);

  const filteredPrograms = useMemo(() => {
    if (!programSearchQuery) return programs;
    const q = programSearchQuery.toLowerCase();
    return programs.filter(program =>
      (program.name && program.name.toLowerCase().includes(q)) ||
      (program.venue && program.venue.toLowerCase().includes(q))
    );
  }, [programs, programSearchQuery]);

  // ==============================================
  // SESSION 6: RELATED BHAJANS + PREV/NEXT MEMOS
  // Previously these were inline IIFEs in the reading views, which
  // re-scanned and re-sorted the full library on EVERY render —
  // meaning every Aa+ font tap or scroll-to-top re-did the work.
  // Now they only recompute when the selected bhajan or the source
  // list actually changes.
  // ==============================================
  const relatedMyBhajans = useMemo(() => {
    if (!selectedBhajan || !selectedBhajan.keywords || selectedBhajan.keywords.length === 0) return [];
    const relKws = new Set(selectedBhajan.keywords);
    return bhajans
      .filter(b => b.id !== selectedBhajan.id && b.keywords && b.keywords.some(kw => relKws.has(kw)))
      .map(b => ({
        ...b,
        matchCount: b.keywords.filter(kw => relKws.has(kw)).length,
        matchedKws: b.keywords.filter(kw => relKws.has(kw))
      }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 6);
  }, [selectedBhajan, bhajans]);

  const relatedPublicBhajans = useMemo(() => {
    if (!selectedPublicBhajan || !selectedPublicBhajan.keywords || selectedPublicBhajan.keywords.length === 0) return [];
    const relKws = new Set(selectedPublicBhajan.keywords);
    return publicBhajans
      .filter(b => b.id !== selectedPublicBhajan.id && b.keywords && b.keywords.some(kw => relKws.has(kw)))
      .map(b => ({
        ...b,
        matchCount: b.keywords.filter(kw => relKws.has(kw)).length,
        matchedKws: b.keywords.filter(kw => relKws.has(kw))
      }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 6);
  }, [selectedPublicBhajan, publicBhajans]);

  const myPrevNext = useMemo(() => {
    if (!selectedBhajan || filteredBhajans.length <= 1) return null;
    const idx = filteredBhajans.findIndex(b => b.id === selectedBhajan.id);
    if (idx === -1) return null;
    return {
      idx,
      total: filteredBhajans.length,
      prev: filteredBhajans[(idx - 1 + filteredBhajans.length) % filteredBhajans.length],
      next: filteredBhajans[(idx + 1) % filteredBhajans.length]
    };
  }, [selectedBhajan, filteredBhajans]);

  const publicPrevNext = useMemo(() => {
    if (!selectedPublicBhajan || filteredPublicBhajans.length <= 1) return null;
    const idx = filteredPublicBhajans.findIndex(b => b.id === selectedPublicBhajan.id);
    if (idx === -1) return null;
    return {
      idx,
      total: filteredPublicBhajans.length,
      prev: filteredPublicBhajans[(idx - 1 + filteredPublicBhajans.length) % filteredPublicBhajans.length],
      next: filteredPublicBhajans[(idx + 1) % filteredPublicBhajans.length]
    };
  }, [selectedPublicBhajan, filteredPublicBhajans]);

  // ==============================================
  // ADMIN PANEL FUNCTIONS
  // ==============================================
  const openAdminPanel = () => {
    if (!isAdmin) {
      showToast('Access denied. Admin only.', 'error');
      return;
    }
    setCurrentView('admin-panel');
    setImportJsonText('');
    setImportPreview(null);
    setImportError('');
    setImportSuccess('');
    loadFeedbackList();
    loadConfigLists();
  };

  const previewImport = () => {
    setImportError('');
    setImportSuccess('');

    if (!importJsonText.trim()) {
      setImportError('Please paste JSON content first');
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);

      let bhajanArray = [];

      if (Array.isArray(parsed)) {
        bhajanArray = parsed;
      } else if (parsed.bhajans && Array.isArray(parsed.bhajans)) {
        bhajanArray = parsed.bhajans;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        bhajanArray = parsed.data;
      } else if (typeof parsed === 'object') {
        bhajanArray = Object.values(parsed).filter(v =>
          v && typeof v === 'object' && (v.title || v.lyrics)
        );
      }

      if (bhajanArray.length === 0) {
        setImportError('No bhajans found in the JSON. Please check the format.');
        return;
      }

      const parseKeywords = (kw) => {
        if (!kw) return [];
        if (Array.isArray(kw)) return kw.filter(k => k && typeof k === 'string').map(k => k.trim()).filter(k => k);
        if (typeof kw === 'string') {
          return kw.split(',').map(k => k.trim()).filter(k => k);
        }
        return [];
      };

      const normalized = bhajanArray.map((b, idx) => {
        return {
          _originalIndex: idx,
          title: (b.title || b.name || `Bhajan ${idx + 1}`).toString().trim(),
          lyrics: (b.lyrics || b.body || b.text || b.content || '').toString().trim(),
          deity: normalizeDeity(b.deity || b.god || 'Others'),
          category: normalizeCategory(b.category || b.type || 'Bhajan'),
          dhun: (b.dhun || b.tune || b.tarz || b.tarj || '').toString().trim(),
          scale: (b.scale || b.raag || b.raga || '').toString().trim(),
          keywords: parseKeywords(b.keywords || b.tags),
          source: (b.source || b.sourceUrl || b.url || b.link || '').toString().trim()
        };
      }).filter(b => b.title && b.lyrics);

      setImportPreview({
        total: bhajanArray.length,
        valid: normalized.length,
        skipped: bhajanArray.length - normalized.length,
        bhajans: normalized
      });
    } catch (error) {
      setImportError('Invalid JSON format: ' + error.message);
    }
  };

  const normalizeDeity = (deity) => {
    if (!deity) return 'Others';
    const d = deity.toString().toLowerCase().trim();

    if (d.includes('babos')) return 'Babosa';
    if (d.includes('krishn') || d.includes('kanhaiy') || d.includes('kanha')) return 'Krishna';
    if (d.includes('mata') || d.includes('devi') || d.includes('amba') || d.includes('durg')) return 'Mata Ji';
    if (d.includes('hanuman') || d.includes('bajrang')) return 'Hanuman';
    if (d.includes('ramdev')) return 'Ramdev';
    if (d.includes('ram')) return 'Rama';
    if (d.includes('shiv') || d.includes('mahadev') || d.includes('bhole')) return 'Shiv';
    if (d.includes('ganesh') || d.includes('ganpat')) return 'Ganesh';
    if (d.includes('bhairav')) return 'Bhairav';
    if (d.includes('sai')) return 'Saibaba';
    if (d.includes('vishnu') || d.includes('narayan')) return 'Vishnu';
    if (d.includes('buddh')) return 'Buddha';
    if (d.includes('mahavir') || d.includes('mahaveer')) return 'Mahavir';
    if (d.includes('nanak') || d.includes('guru nanak')) return 'Guru Nanak';
    if (d.includes('jain')) return 'Jain';
    if (d.includes('nirgun')) return 'Nirgun';
    if (d.includes('desh')) return 'Deshbhakti';

    const validOptions = ['Babosa', 'Krishna', 'Mata Ji', 'Hanuman', 'Rama', 'Shiv', 'Ramdev', 'Ganesh', 'Bhairav', 'Saibaba', 'Vishnu', 'Buddha', 'Mahavir', 'Guru Nanak', 'Jain', 'Nirgun', 'Deshbhakti', 'Others'];
    const found = validOptions.find(o => o.toLowerCase() === d);
    if (found) return found;

    return 'Others';
  };

  const normalizeCategory = (cat) => {
    if (!cat) return 'Bhajan';
    const c = cat.toString().toLowerCase().trim();

    if (c.includes('arti') || c.includes('aarti')) return 'Arti';
    if (c.includes('parody')) return 'Parody';
    if (c.includes('quwal') || c.includes('qawwal')) return 'Quwali';
    if (c.includes('folk')) return 'Folk Song';
    if (c.includes('katha')) return 'Katha';
    if (c.includes('dohe') || c.includes('doha')) return 'Dohe';
    if (c.includes('stotra')) return 'Stotra';
    if (c.includes('mantra')) return 'Mantra';
    if (c.includes('chalisa')) return 'Chalisa';
    if (c.includes('bhajan')) return 'Bhajan';

    return 'Bhajan';
  };

  const executeImport = () => {
    if (!importPreview || !importPreview.bhajans) return;
    if (!isAdmin) {
      showToast('Access denied. Admin only.', 'error');
      return;
    }

    askConfirm(
      {
        title: 'Import Bhajans?',
        message: `${importPreview.valid} bhajans will be added to the Public Library for all users. This cannot be easily undone.`,
        confirmLabel: `✅ Import ${importPreview.valid}`,
        danger: false
      },
      async () => {
        try {
          setImporting(true);
          setImportError('');
          setImportSuccess('');
          setImportProgress({ current: 0, total: importPreview.valid, message: 'Starting import...' });

          const db = window.firebase.firestore();
          const batchSize = 25;
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < importPreview.bhajans.length; i += batchSize) {
            const batch = db.batch();
            const chunk = importPreview.bhajans.slice(i, i + batchSize);

            chunk.forEach((bhajan) => {
              const docRef = db.collection('publicBhajans').doc();
              batch.set(docRef, {
                title: bhajan.title,
                lyrics: bhajan.lyrics,
                deity: bhajan.deity,
                category: bhajan.category,
                dhun: bhajan.dhun,
                scale: bhajan.scale,
                keywords: bhajan.keywords || [],
                source: bhajan.source,
                saveCount: 0,
                viewCount: 0,
                addedByUid: user.uid,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
              });
            });

            try {
              await batch.commit();
              successCount += chunk.length;
              setImportProgress({
                current: successCount,
                total: importPreview.valid,
                message: `Imported ${successCount} of ${importPreview.valid}...`
              });
            } catch (error) {
              console.error('Batch error:', error);
              errorCount += chunk.length;
            }
          }

          if (errorCount === 0) {
            setImportSuccess(`✅ Successfully imported ${successCount} bhajans to Public Library!`);
          } else {
            setImportSuccess(`⚠️ Imported ${successCount} bhajans. ${errorCount} failed.`);
          }

          setImportProgress({ current: 0, total: 0, message: '' });
          setImportJsonText('');
          setImportPreview(null);

        } catch (error) {
          console.error('Import error:', error);
          setImportError('Import failed: ' + error.message);
        } finally {
          setImporting(false);
        }
      }
    );
  };

  const deletePublicBhajan = (bhajan) => {
    if (!isAdmin) {
      showToast('Access denied. Admin only.', 'error');
      return;
    }
    askConfirm(
      {
        title: 'Delete Public Bhajan?',
        message: `"${bhajan.title}" will be removed from the Public Library for ALL users.`,
        confirmLabel: '🗑️ Delete for Everyone'
      },
      async () => {
        try {
          const db = window.firebase.firestore();
          await db.collection('publicBhajans').doc(bhajan.id).delete();
          if (selectedPublicBhajan && selectedPublicBhajan.id === bhajan.id) {
            setCurrentView('public-library');
            setSelectedPublicBhajan(null);
          }
          showToast('Public bhajan deleted');
        } catch (error) {
          console.error('Error deleting public bhajan:', error);
          showToast('Could not delete: ' + error.message, 'error');
        }
      }
    );
  };

  // ==============================================
  // MANUAL ADD/EDIT PUBLIC BHAJAN (Admin only)
  // ==============================================
  const openAddPublicBhajan = () => {
    if (!isAdmin) return;
    setPublicBhajanForm({
      title: '',
      lyrics: '',
      deity: 'Babosa',
      category: 'Bhajan',
      language: 'Hindi',
      dhun: '',
      scale: '',
      keywords: [],
      source: ''
    });
    setEditingPublicBhajan(null);
    setPublicBhajanFormError('');
    setShowPublicBhajanForm(true);
  };

  const openEditPublicBhajan = (bhajan) => {
    if (!isAdmin) return;
    setPublicBhajanForm({
      title: bhajan.title || '',
      lyrics: bhajan.lyrics || '',
      deity: bhajan.deity || 'Babosa',
      category: bhajan.category || 'Bhajan',
      language: bhajan.language || 'Hindi',
      dhun: bhajan.dhun || '',
      scale: bhajan.scale || '',
      keywords: bhajan.keywords || [],
      source: bhajan.source || ''
    });
    setEditingPublicBhajan(bhajan);
    setPublicBhajanFormError('');
    setShowPublicBhajanForm(true);
  };

  const savePublicBhajan = async () => {
    if (!isAdmin) return;
    if (!publicBhajanForm.title.trim()) {
      setPublicBhajanFormError('Please enter a title');
      return;
    }
    if (!publicBhajanForm.lyrics.trim()) {
      setPublicBhajanFormError('Please enter lyrics');
      return;
    }

    try {
      setPublicBhajanFormSaving(true);
      setPublicBhajanFormError('');
      const db = window.firebase.firestore();

      const bhajanData = {
        title: publicBhajanForm.title.trim(),
        lyrics: publicBhajanForm.lyrics.trim(),
        deity: publicBhajanForm.deity,
        category: publicBhajanForm.category,
        language: publicBhajanForm.language || 'Hindi',
        dhun: publicBhajanForm.dhun.trim(),
        scale: publicBhajanForm.scale.trim(),
        keywords: publicBhajanForm.keywords,
        source: publicBhajanForm.source.trim(),
        addedByUid: user.uid,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      if (editingPublicBhajan) {
        await db.collection('publicBhajans').doc(editingPublicBhajan.id).update(bhajanData);
        if (selectedPublicBhajan && selectedPublicBhajan.id === editingPublicBhajan.id) {
          setSelectedPublicBhajan({ ...editingPublicBhajan, ...bhajanData });
        }
        showToast('💾 Public bhajan updated');
      } else {
        bhajanData.saveCount = 0;
        bhajanData.viewCount = 0;
        bhajanData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('publicBhajans').add(bhajanData);
        showToast(`✅ "${bhajanData.title}" added to Public Library`);
      }

      setShowPublicBhajanForm(false);
      setEditingPublicBhajan(null);
    } catch (error) {
      console.error('Error saving public bhajan:', error);
      setPublicBhajanFormError('Could not save: ' + error.message);
    } finally {
      setPublicBhajanFormSaving(false);
    }
  };

  const togglePublicBhajanKeyword = (keyword) => {
    setPublicBhajanForm(prev => {
      const isSelected = prev.keywords.includes(keyword);
      return {
        ...prev,
        keywords: isSelected
          ? prev.keywords.filter(k => k !== keyword)
          : [...prev.keywords, keyword]
      };
    });
  };

  const toggleKeyword = (keyword) => {
    setBhajanForm(prev => {
      const isSelected = prev.keywords.includes(keyword);
      return {
        ...prev,
        keywords: isSelected
          ? prev.keywords.filter(k => k !== keyword)
          : [...prev.keywords, keyword]
      };
    });
  };

  // ==============================================
  // PROGRAMS CRUD OPERATIONS
  // ==============================================
  const openCreateProgram = () => {
    setProgramForm({
      name: '',
      date: '',
      venue: '',
      bhajanIds: []
    });
    setProgramFormError('');
    setEditingProgram(null);
    setCurrentView('create-program');
    setShowBhajanPicker(true);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerKeywordFilter('');
  };

  const openEditProgram = (program) => {
    setProgramForm({
      name: program.name || '',
      date: program.date || '',
      venue: program.venue || '',
      bhajanIds: program.bhajanIds || []
    });
    setProgramFormError('');
    setEditingProgram(program);
    setCurrentView('edit-program');
  };

  const openProgramDetail = (program) => {
    setSelectedProgram(program);
    setCurrentView('program-detail');
  };

  const saveProgram = async () => {
    if (!programForm.name.trim()) {
      setProgramFormError('Please enter a program name');
      return;
    }

    try {
      setProgramFormSaving(true);
      setProgramFormError('');
      const db = window.firebase.firestore();

      const programData = {
        name: programForm.name.trim(),
        date: programForm.date.trim(),
        venue: programForm.venue.trim(),
        bhajanIds: programForm.bhajanIds,
        ownerId: user.uid,
        ownerName: userProfile.displayName,
        bhajanCount: programForm.bhajanIds.length,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      const programsRef = db.collection('users').doc(user.uid).collection('programs');

      if (editingProgram) {
        await programsRef.doc(editingProgram.id).update(programData);
        setSelectedProgram({ ...editingProgram, ...programData });
        setCurrentView('program-detail');
        showToast('💾 Program updated');
      } else {
        programData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await programsRef.add(programData);
        setCurrentView('programs');
        showToast(`✅ Program "${programData.name}" created`);
      }
    } catch (error) {
      console.error('Error saving program:', error);
      setProgramFormError('Could not save: ' + error.message);
    } finally {
      setProgramFormSaving(false);
    }
  };

  const deleteProgram = (program) => {
    askConfirm(
      {
        title: 'Delete Program?',
        message: `"${program.name}" and its setlist will be permanently deleted. Your bhajans stay in your library.`,
        confirmLabel: '🗑️ Delete'
      },
      async () => {
        try {
          const db = window.firebase.firestore();
          await db.collection('users').doc(user.uid).collection('programs').doc(program.id).delete();
          setCurrentView('programs');
          setSelectedProgram(null);
          showToast('Program deleted');
        } catch (error) {
          console.error('Error deleting program:', error);
          showToast('Could not delete: ' + error.message, 'error');
        }
      }
    );
  };

  // Toggle a bhajan in the current program form.
  // Adds if absent, removes if present. Does NOT close the picker —
  // the picker stays open so the user can add/remove multiple bhajans
  // in one session and closes only via the Done button (or X/backdrop).
  const toggleBhajanInProgram = (bhajanId) => {
    setProgramForm(prev => (
      prev.bhajanIds.includes(bhajanId)
        ? { ...prev, bhajanIds: prev.bhajanIds.filter(id => id !== bhajanId) }
        : { ...prev, bhajanIds: [...prev.bhajanIds, bhajanId] }
    ));
  };

  const removeBhajanFromProgram = (bhajanId) => {
    setProgramForm(prev => ({
      ...prev,
      bhajanIds: prev.bhajanIds.filter(id => id !== bhajanId)
    }));
  };

  // Central close-and-reset helper for the picker.
  // Used by the Done button, X button, and backdrop click so all three
  // paths reset search + filters consistently.
  const closeBhajanPicker = () => {
    setShowBhajanPicker(false);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerKeywordFilter('');
  };

  const moveBhajanUp = (index) => {
    if (index <= 0) return;
    setProgramForm(prev => {
      const newIds = [...prev.bhajanIds];
      [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
      return { ...prev, bhajanIds: newIds };
    });
  };

  const moveBhajanDown = (index) => {
    setProgramForm(prev => {
      if (index >= prev.bhajanIds.length - 1) return prev;
      const newIds = [...prev.bhajanIds];
      [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
      return { ...prev, bhajanIds: newIds };
    });
  };

  const getBhajanById = (id) => bhajans.find(b => b.id === id);

  // ==============================================
  // LIVE PROGRAM MODE
  // ==============================================
  const startLiveProgram = async (program) => {
    if (!program.bhajanIds || program.bhajanIds.length === 0) {
      showToast('This program has no bhajans! Add some first.', 'error');
      return;
    }
    setSelectedProgram(program);
    setLiveProgramIndex(0);
    setCurrentView('live-program');

    try {
      if ('wakeLock' in navigator) {
        const wakeLock = await navigator.wakeLock.request('screen');
        setLiveWakeLock(wakeLock);
      }
    } catch (error) {
      console.log('Wake lock not available:', error);
    }
  };

  const exitLiveProgram = async () => {
    if (liveWakeLock) {
      try {
        await liveWakeLock.release();
        setLiveWakeLock(null);
      } catch (error) {
        console.log('Error releasing wake lock:', error);
      }
    }
    setCurrentView('program-detail');
  };

  const liveNext = () => {
    if (selectedProgram && liveProgramIndex < selectedProgram.bhajanIds.length - 1) {
      setLiveProgramIndex(liveProgramIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const livePrev = () => {
    if (liveProgramIndex > 0) {
      setLiveProgramIndex(liveProgramIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  // ==============================================
  // SWIPE NAVIGATION — next/prev bhajan in reading view
  // ==============================================
  const navigateBhajan = useCallback((direction, isPublic) => {
    const list = isPublic ? filteredPublicBhajans : filteredBhajans;
    const current = isPublic ? selectedPublicBhajan : selectedBhajan;
    if (!current || list.length < 2) return;
    const idx = list.findIndex(b => b.id === current.id);
    if (idx === -1) return;
    const nextIdx = direction === 'next'
      ? (idx + 1) % list.length
      : (idx - 1 + list.length) % list.length;
    const nextBhajan = list[nextIdx];
    setSlideDir(direction === 'next' ? 'left' : 'right');
    setTimeout(() => setSlideDir(null), 350);
    if (isPublic) {
      setSelectedPublicBhajan(nextBhajan);
    } else {
      setSelectedBhajan(nextBhajan);
      trackRecentRead(nextBhajan);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filteredPublicBhajans, filteredBhajans, selectedPublicBhajan, selectedBhajan, trackRecentRead]);

  const publicSwipe = useSwipe(
    () => navigateBhajan('next', true),
    () => navigateBhajan('prev', true),
    { enabled: currentView === 'public-bhajan-detail' }
  );
  const librarySwipe = useSwipe(
    () => navigateBhajan('next', false),
    () => navigateBhajan('prev', false),
    { enabled: currentView === 'bhajan-detail' }
  );

  // Share handler with toast feedback
  const handleShareBhajan = useCallback(async (bhajan) => {
    const result = await shareBhajan(bhajan);
    if (result === 'copied') showToast('📋 Lyrics copied to clipboard!');
    else if (result === 'shared') showToast('✓ Shared successfully!');
  }, [showToast]);

  // ==============================================
  // AUTHENTICATION - GOOGLE
  // ==============================================
  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      setAuthError('');

      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        await window.firebase.auth().signInWithPopup(provider);
      } catch (popupError) {
        console.warn('Popup failed, trying redirect:', popupError);

        if (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request' ||
            popupError.message?.includes('Cross-Origin')) {
          setAuthError('Popup blocked, redirecting to sign in...');
          await window.firebase.auth().signInWithRedirect(provider);
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError('Popup blocked. Please allow popups or try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('');
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized. Please contact support.');
      } else {
        setAuthError('Sign-in failed: ' + (error.message || 'Please try again'));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // ==============================================
  // AUTHENTICATION - PHONE OTP
  // ==============================================
  const setupRecaptcha = useCallback(() => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    } catch (error) {
      console.error('reCAPTCHA setup error:', error);
    }
  }, []);

  const handleSendOtp = async () => {
    if (!phoneNumber.match(/^\+?[1-9]\d{9,14}$/)) {
      setAuthError('Please enter a valid phone number with country code (e.g., +911234567890)');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

      setupRecaptcha();

      const confirmation = await window.firebase.auth().signInWithPhoneNumber(
        formattedPhone,
        window.recaptchaVerifier
      );

      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (error) {
      console.error('OTP send error:', error);
      if (error.code === 'auth/billing-not-enabled') {
        setAuthError('Phone auth requires paid plan. Please use Google Sign-In instead.');
      } else if (error.code === 'auth/invalid-phone-number') {
        setAuthError('Invalid phone number format');
      } else {
        setAuthError(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setAuthError('Please enter the 6-digit OTP');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      await confirmationResult.confirm(otpCode);

      setOtpCode('');
      setOtpSent(false);
      setPhoneNumber('');
      setShowPhoneLogin(false);
    } catch (error) {
      console.error('OTP verify error:', error);
      if (error.code === 'auth/invalid-verification-code') {
        setAuthError('Invalid OTP. Please try again.');
      } else {
        setAuthError(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.firebase.auth().signOut();
      setUser(null);
      setUserProfile(null);
      setBhajans([]);
      setCurrentView('public-library');
      setShowPhoneLogin(false);
      setOtpSent(false);
      setPhoneNumber('');
      setOtpCode('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ==============================================
  // SHARED UI FRAGMENTS (rendered inside branches below)
  // ==============================================

  // ConfirmDialog — branded replacement for window.confirm()
  const confirmDialogJsx = confirmDialog && (
    <div
      onClick={closeConfirm}
      className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`sk-dialog-animate rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.2)] max-w-sm w-full overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-[#FFFCF8]'}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={confirmDialog.title}
      >
        <div className={`p-5 text-white text-center ${confirmDialog.danger ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-[#0B5A70]'}`}>
          <div className="text-4xl mb-1">{confirmDialog.danger ? '⚠️' : '🤔'}</div>
          <h3 className="text-xl font-bold">{confirmDialog.title}</h3>
        </div>
        <div className="p-5">
          {confirmDialog.message && (
            <p className={`text-sm leading-relaxed mb-5 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {confirmDialog.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={closeConfirm}
              className={`flex-1 font-semibold py-3 rounded-xl transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-200 hover:bg-[#243940]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              Cancel
            </button>
            <button
              onClick={runConfirm}
              className={`flex-1 text-white font-bold py-3 rounded-xl shadow-lg transition-all ${confirmDialog.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0B5A70] hover:bg-[#094a5d]'}`}
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Toast — success (teal) / error (red)
  const toastJsx = toast && (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[105] pointer-events-none px-4 max-w-full"
      style={{
        animation: toast.visible
          ? 'sk-toast-in 0.3s cubic-bezier(0.22,1,0.36,1) both'
          : 'sk-toast-out 0.3s ease-in both'
      }}
      role="status"
      aria-live="polite"
    >
      <div className={`px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-center ${
        toast.type === 'error'
          ? 'bg-red-600 text-white shadow-[0_4px_20px_rgba(220,38,38,0.35)]'
          : darkMode
            ? 'bg-[#1e2e33] text-gray-100 border border-[#0B5A70]/20'
            : 'bg-[#0B5A70] text-white shadow-[0_4px_20px_rgba(11,90,112,0.3)]'
      }`}>
        {toast.message}
      </div>
    </div>
  );

  // Bottom tab bar visibility — only on top-level list views
  const showTabBar = ['public-library', 'library', 'programs'].includes(currentView);

  // ==============================================
  // BRANDED SPLASH SCREEN
  // ==============================================
  if (loading || splashVisible) {
    return (
      <div
        className={`min-h-screen bg-[#FFF8F0] flex items-center justify-center px-6 transition-opacity duration-500 ${splashFadeOut ? 'opacity-0' : 'opacity-100'}`}
      >
        <style>{`
          @keyframes splashLogoIn {
            0% { opacity: 0; transform: scale(0.85) translateY(12px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes splashTaglineIn {
            0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.3em; }
            60% { opacity: 1; letter-spacing: 0.05em; }
            100% { opacity: 1; transform: translateY(0); letter-spacing: 0.08em; }
          }
          @keyframes splashDividerGrow {
            0% { width: 0; opacity: 0; }
            100% { width: 80px; opacity: 1; }
          }
          @keyframes splashCreditIn {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes splashBabosaGlow {
            0%, 100% { color: #E65100; text-shadow: 0 0 0px transparent; }
            50% { color: #E65100; text-shadow: 0 0 12px rgba(230, 81, 0, 0.35); }
          }
          @keyframes splashSpinnerIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes splashPrayerPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>

        <div className="text-center max-w-sm mx-auto">
          <div
            style={{
              animation: 'splashLogoIn 0.8s ease-out forwards',
              opacity: 0,
            }}
          >
            <SankirtanWordmark className="h-16 sm:h-20 w-auto mx-auto" />
          </div>

          <p
            style={{
              fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
              animation: 'splashTaglineIn 1s ease-out 0.6s forwards',
              opacity: 0,
              letterSpacing: '0.08em',
            }}
            className="text-[#0B5A70] text-xl sm:text-2xl font-semibold mt-5"
          >
            भजन से भगवान तक
          </p>

          <div className="flex justify-center mt-4">
            <div
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #0B5A70, #E65100, #0B5A70, transparent)',
                animation: 'splashDividerGrow 0.8s ease-out 1.2s forwards',
                width: 0,
                opacity: 0,
              }}
            />
          </div>

          <div
            style={{
              animation: 'splashCreditIn 0.7s ease-out 1.6s forwards',
              opacity: 0,
            }}
            className="mt-5"
          >
            <p className="text-[#0B5A70]/60 text-xs sm:text-sm leading-relaxed">
              Founded for the Bhajan Community
            </p>
            <p className="text-[#0B5A70]/60 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5">
              <span
                style={{ animation: 'splashPrayerPulse 2s ease-in-out 2s infinite' }}
              >
                🙏
              </span>
              <span>by Grace of</span>
              <span
                style={{
                  animation: 'splashBabosaGlow 2.5s ease-in-out 2s infinite',
                  fontWeight: 700,
                }}
              >
                Babosa Bhagwan
              </span>
              <span>🙏</span>
            </p>
          </div>

          <div
            className="mt-8"
            style={{
              animation: 'splashSpinnerIn 0.5s ease-out 2s forwards',
              opacity: 0,
            }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-[#0B5A70]/15 border-t-[#E65100] mx-auto"></div>
          </div>

          {isOffline && (
            <p
              className="text-white text-xs mt-4 bg-red-500/80 rounded-lg px-3 py-1 inline-block"
              style={{
                animation: 'splashCreditIn 0.5s ease-out 2.2s forwards',
                opacity: 0,
              }}
            >
              ⚠️ Slow connection detected
            </p>
          )}
        </div>
      </div>
    );
  }

  // ==============================================
  // PROFILE SETUP SCREEN (First-time users)
  // ==============================================
  if (user && showProfileSetup) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] overflow-hidden">
            <div className="bg-[#0B5A70] p-6 text-white text-center">
              <div className="text-5xl mb-2">🙏</div>
              <h2 className="text-2xl font-bold">Welcome to Sankirtan!</h2>
              <p className="text-white/80 text-sm mt-1">Let's set up your profile</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                  className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                  placeholder="Enter your full name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                  Bio (optional)
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  className="w-full px-4 py-2 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                  placeholder="e.g., Bhajan singer, Kirtan lover"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                  className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                  placeholder="e.g., Delhi, India"
                />
              </div>

              <div className="pt-2 border-t border-[#0B5A70]/8">
                <p className="text-xs text-gray-500 mb-2">📱 Social & Contact (optional)</p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={profileForm.whatsapp}
                    onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})}
                    className="w-full px-3 py-2 border border-[#0B5A70]/15 rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm"
                    placeholder="WhatsApp number"
                  />
                  <input
                    type="text"
                    value={profileForm.youtube}
                    onChange={(e) => setProfileForm({...profileForm, youtube: e.target.value})}
                    className="w-full px-3 py-2 border border-[#0B5A70]/15 rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm"
                    placeholder="YouTube channel URL"
                  />
                  <input
                    type="text"
                    value={profileForm.instagram}
                    onChange={(e) => setProfileForm({...profileForm, instagram: e.target.value})}
                    className="w-full px-3 py-2 border border-[#0B5A70]/15 rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm"
                    placeholder="Instagram handle"
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  ⚠️ {authError}
                </div>
              )}

              <button
                onClick={saveProfile}
                disabled={authLoading || !profileForm.displayName.trim()}
                className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Saving...' : '🚀 Complete Setup'}
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
              >
                Cancel and logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // LIVE PROGRAM MODE (Fullscreen)
  // SESSION 5 FIX: this branch now comes BEFORE the main app branch.
  // Previously it was unreachable — the main branch returned first
  // for all authenticated users, so Live Mode showed a blank main.
  // ==============================================
  if (user && userProfile && currentView === 'live-program' && selectedProgram) {
    const currentBhajanId = selectedProgram.bhajanIds[liveProgramIndex];
    const currentBhajan = getBhajanById(currentBhajanId);
    const totalBhajans = selectedProgram.bhajanIds.length;

    // SESSION 6: Live Program mode now respects darkMode.
    // Previously hardcoded cream — a bright flashbang for the singer
    // at evening programs. Dark background is also easier to read
    // from a distance under stage lighting.
    const liveBg = darkMode ? 'bg-[#0f1a1c]' : 'bg-[#FFF8F0]';
    const liveHeaderBg = darkMode ? 'bg-[#0f1a1c]/95 border-[#0B5A70]/20' : 'bg-[#FFF8F0]/95 border-[#0B5A70]/10';
    const liveTitleColor = darkMode ? 'text-amber-100' : 'text-[#0B5A70]';
    const liveMutedColor = darkMode ? 'text-gray-400' : 'text-[#0B5A70]/60';
    const liveMutedGray = darkMode ? 'text-gray-500' : 'text-gray-500';
    const liveBtnMuted = darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/25 text-teal-200' : 'bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70]';
    const liveBtnPrimary = darkMode ? 'bg-[#0B5A70] hover:bg-[#094a5d] text-white' : 'bg-[#0B5A70] hover:bg-[#094a5d] text-white';

    if (!currentBhajan) {
      return (
        <div className={`min-h-screen p-4 flex items-center justify-center ${liveBg}`}>
          <div className="text-center">
            <p className={`text-lg mb-4 ${liveTitleColor}`}>⚠️ This bhajan is not available</p>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              It may have been deleted from your library
            </p>
            <button
              onClick={exitLiveProgram}
              className={`${liveBtnPrimary} px-4 py-2 rounded-xl`}
            >
              Exit Live Mode
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen ${liveBg}`}>
        {confirmDialogJsx}
        {toastJsx}
        {/* Live Header */}
        <div className={`backdrop-blur-md sticky top-0 z-40 border-b ${liveHeaderBg}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={exitLiveProgram}
              className={`font-semibold flex items-center gap-1 text-sm ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}`}
              aria-label="Exit live mode"
            >
              ✕ Exit Live
            </button>
            <div className="text-center flex-1 mx-4">
              <p className={`text-xs font-semibold ${liveMutedColor}`}>🎤 LIVE PROGRAM</p>
              <p className={`text-sm font-bold truncate ${liveTitleColor}`}>{selectedProgram.name}</p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${liveMutedGray}`}>Bhajan</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-orange-300' : 'text-[#E65100]'}`}>
                {liveProgramIndex + 1} / {totalBhajans}
              </p>
            </div>
          </div>

          {/* Font Size Controls */}
          <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setLiveFontSize(Math.max(14, liveFontSize - 2))}
              className={`w-8 h-8 rounded-lg font-bold ${liveBtnMuted}`}
              title="Decrease font"
              aria-label="Decrease font size"
            >
              A−
            </button>
            <span className={`text-xs min-w-[40px] text-center ${liveMutedGray}`}>{liveFontSize}px</span>
            <button
              onClick={() => setLiveFontSize(Math.min(40, liveFontSize + 2))}
              className={`w-8 h-8 rounded-lg font-bold ${liveBtnMuted}`}
              title="Increase font"
              aria-label="Increase font size"
            >
              A+
            </button>
            {liveWakeLock && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-50 text-green-700'}`}>
                🔦 Screen On
              </span>
            )}
          </div>
        </div>

        {/* Bhajan Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
          <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${liveTitleColor}`}>
            {currentBhajan.title}
          </h1>

          {currentBhajan.dhun && (
            <div className={`border-l-4 border-[#E65100]/40 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
              <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
                <span className="font-semibold">तर्ज़ / धुन:</span> {currentBhajan.dhun}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-[#0B5A70]/25 text-teal-200' : 'bg-[#0B5A70]/8 text-[#0B5A70]'}`}>
              {currentBhajan.deity}
            </span>
            {currentBhajan.scale && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-50 text-purple-700'}`}>
                🎵 {currentBhajan.scale}
              </span>
            )}
          </div>

          <div className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'}`}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowReadingSettings(true)}
                className={`p-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                title="Reading view options"
                aria-label="Reading view options"
              >
                ⚙️ View
              </button>
            </div>
            <pre
              className={`whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
              style={{
                fontSize: `${Math.max(readingSettings.fontSize, liveFontSize)}px`,
                fontFamily: readingSettings.fontFamily,
                lineHeight: readingSettings.lineHeight,
                textAlign: readingSettings.textAlign
              }}
            >
              {currentBhajan.lyrics}
            </pre>
          </div>
        </div>

        {/* Bottom Navigation Bar (live mode) — SESSION 6: dark-mode aware */}
        <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-md border-t shadow-2xl z-40 ${liveHeaderBg}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              onClick={livePrev}
              disabled={liveProgramIndex === 0}
              className={`flex-1 disabled:opacity-30 disabled:cursor-not-allowed font-bold py-3 rounded-xl flex items-center justify-center gap-2 ${liveBtnMuted}`}
              aria-label="Previous bhajan"
            >
              ← Previous
            </button>
            <div className="text-center min-w-[80px]">
              <p className={`text-xs ${liveMutedGray}`}>Bhajan</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-orange-300' : 'text-[#E65100]'}`}>
                {liveProgramIndex + 1} / {totalBhajans}
              </p>
            </div>
            <button
              onClick={liveNext}
              disabled={liveProgramIndex >= totalBhajans - 1}
              className={`flex-1 disabled:opacity-30 disabled:cursor-not-allowed font-bold py-3 rounded-xl flex items-center justify-center gap-2 ${liveBtnPrimary}`}
              aria-label="Next bhajan"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Reading settings modal is reachable from live mode too */}
        {showReadingSettings && (
          <div onClick={() => setShowReadingSettings(false)} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className={`rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-sm w-full overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-[#FFFCF8]'}`}>
              <div className={`p-6 text-center ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]'} text-white`}>
                <div className="text-5xl mb-2">📖</div>
                <h3 className="text-2xl font-bold">Reading View</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold">Font Size</label>
                    <span className="text-sm">{readingSettings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="40"
                    step="1"
                    value={readingSettings.fontSize}
                    onChange={(e) => setReadingSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="w-full accent-[#0B5A70]"
                  />
                </div>
                <button
                  onClick={() => setShowReadingSettings(false)}
                  className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==============================================
  // MAIN APP (Authenticated OR Guest)
  // ==============================================
  if ((user && userProfile) || guestMode) {
    const currentStep = ONBOARDING_STEPS[onboardingStep];

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#0f1a1c] text-gray-100' : 'bg-[#FFF8F0]'}`}>
        {confirmDialogJsx}
        {toastJsx}

        {/* ONBOARDING TOUR MODAL */}
        {showOnboarding && currentStep && (
          <div onClick={() => { setShowOnboarding(false); }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full overflow-hidden">
              <div className="bg-[#0B5A70] p-6 text-white text-center relative">
                <button
                  onClick={skipOnboarding}
                  className="absolute top-3 right-3 text-white/80 hover:text-white text-sm font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full"
                >
                  Skip Tour
                </button>

                <div className="text-6xl mb-3 mt-2 animate-bounce">
                  {currentStep.emoji}
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  {ONBOARDING_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === onboardingStep
                          ? 'w-8 bg-white'
                          : idx < onboardingStep
                            ? 'w-4 bg-white/60'
                            : 'w-4 bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-white/80">
                  Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}
                </p>
              </div>

              <div className="p-6 text-center">
                <h3 className="text-2xl font-bold text-[#0B5A70] mb-3">
                  {currentStep.title}
                </h3>
                <p className="text-gray-700 leading-relaxed text-base mb-6">
                  {currentStep.description}
                </p>

                <div className="flex gap-3">
                  {onboardingStep > 0 && (
                    <button
                      onClick={previousOnboardingStep}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={nextOnboardingStep}
                    className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
                  >
                    {onboardingStep === ONBOARDING_STEPS.length - 1 ? "Let's Start! 🚀" : 'Next →'}
                  </button>
                </div>

                {onboardingStep > 0 && onboardingStep < ONBOARDING_STEPS.length - 1 && (
                  <button
                    onClick={skipOnboarding}
                    className="text-gray-500 text-sm mt-4 hover:text-gray-700"
                  >
                    Skip the rest
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* APP UPDATE PROMPT */}
        {showUpdatePrompt && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full overflow-hidden">
              <div className="bg-[#0B5A70] p-6 text-white text-center">
                <div className="text-5xl mb-2">🎉</div>
                <h3 className="text-2xl font-bold">App Updated!</h3>
                <p className="text-sm text-white/80 mt-1">Sankirtan just got better</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-4">
                  A new version of Sankirtan has been deployed. Here is what is new:
                </p>
                <ul className="text-sm text-gray-700 space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-[#0B5A70] font-bold">✓</span>
                    <span>New bottom tab bar — switch between Public, My Library & Programs with one tap</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0B5A70] font-bold">✓</span>
                    <span>Hindi typing is now faster (smarter caching)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0B5A70] font-bold">✓</span>
                    <span>Faster app opening & smoother confirmations</span>
                  </li>
                </ul>
                <button
                  onClick={dismissUpdatePrompt}
                  className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  Awesome, let us go! 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK MODAL */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full overflow-hidden">
              <div className="bg-[#0B5A70] p-6 text-white text-center relative">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl leading-none w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                  aria-label="Close feedback"
                >
                  ×
                </button>
                <div className="text-5xl mb-2">💬</div>
                <h3 className="text-2xl font-bold">Share Your Feedback</h3>
                <p className="text-sm text-white/80 mt-1">
                  Your thoughts help us improve Sankirtan
                </p>
              </div>

              <div className="p-6">
                {feedbackSuccess ? (
                  <div className="text-center py-6">
                    <div className="text-6xl mb-3">🙏</div>
                    <h4 className="text-xl font-bold text-[#0B5A70] mb-2">Thank You!</h4>
                    <p className="text-gray-600">
                      Your feedback has been received.
                      <br />
                      बाबोसा जी की कृपा से हम और बेहतर बनाएंगे! 🕉️
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-2">
                      Tell us what you think...
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => {
                        setFeedbackText(e.target.value);
                        setFeedbackError('');
                      }}
                      rows={6}
                      maxLength={1000}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none resize-none text-base"
                      placeholder="What do you love? What could be better? Any bugs? Ideas for new features? We're listening... 🙏"
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {feedbackText.length}/1000
                    </div>

                    {feedbackError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        ⚠️ {feedbackError}
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-[#0B5A70]/5 rounded-lg text-xs text-[#0B5A70]">
                      💡 Your name & email will be included so we can follow up if needed.
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={() => setShowFeedbackModal(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitFeedback}
                        disabled={feedbackSubmitting || !feedbackText.trim()}
                        className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all"
                      >
                        {feedbackSubmitting ? 'Sending...' : '📤 Send Feedback'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* READING SETTINGS MODAL */}
        {showReadingSettings && (
          <div onClick={() => setShowReadingSettings(false)} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className={`rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-sm w-full overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-[#FFFCF8]'}`}>
              <div className={`p-6 text-center ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]'} text-white`}>
                <div className="text-5xl mb-2">📖</div>
                <h3 className="text-2xl font-bold">Reading View</h3>
                <p className="text-sm opacity-90 mt-1">Comfortable lyrics reading</p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold">Font Size</label>
                    <span className="text-sm">{readingSettings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="40"
                    step="1"
                    value={readingSettings.fontSize}
                    onChange={(e) => setReadingSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="w-full accent-[#0B5A70]"
                  />
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                  <div>
                    <div className="text-sm font-semibold">Reading Mode</div>
                    <div className="text-xs opacity-75">Larger, centered text for focused singing</div>
                  </div>
                  <button
                    onClick={() => setReadingSettings(prev => {
                      const on = !prev.readingMode;
                      return on
                        ? { ...prev, readingMode: true, fontSize: Math.max(prev.fontSize, 24), textAlign: 'center', lineHeight: 2.0 }
                        : { ...prev, readingMode: false };
                    })}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${readingSettings.readingMode ? 'bg-[#0B5A70]' : 'bg-gray-300'}`}
                    aria-label="Toggle reading mode"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${readingSettings.readingMode ? 'translate-x-6' : ''}`}
                    ></span>
                  </button>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                  <div>
                    <div className="text-sm font-semibold">Keep Screen On</div>
                    <div className="text-xs opacity-75">
                      {'wakeLock' in navigator
                        ? 'Prevents screen from sleeping while reading'
                        : 'Not supported on this browser'}
                    </div>
                  </div>
                  <button
                    onClick={() => setReadingSettings(prev => ({ ...prev, keepScreenOn: !prev.keepScreenOn }))}
                    disabled={!('wakeLock' in navigator)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${readingSettings.keepScreenOn ? 'bg-[#0B5A70]' : 'bg-gray-300'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    aria-label="Toggle keep screen on"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${readingSettings.keepScreenOn ? 'translate-x-6' : ''}`}
                    ></span>
                  </button>
                </div>

                <button
                  onClick={() => setShowReadingSettings(false)}
                  className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PWA INSTALL PROMPT (Android/Desktop) */}
        {showInstallPrompt && deferredInstallPrompt && (
          <div className="fixed bottom-20 left-4 right-4 md:left-auto md:max-w-md z-50">
            <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] border border-[#0B5A70]/15 p-5">
              <div className="flex items-start gap-3">
                <div className="text-4xl">🕉️</div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#0B5A70] mb-1">Add Sankirtan to Home Screen</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Install for a native app experience - quick access, offline support, and full-screen mode!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInstallApp}
                      className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-md flex-1"
                    >
                      📱 Install App
                    </button>
                    <button
                      onClick={dismissInstallPrompt}
                      className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iOS SAFARI INSTALL INSTRUCTIONS */}
        {showIOSInstructions && (
          <div className="fixed bottom-20 left-4 right-4 md:left-auto md:max-w-md z-50">
            <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] border border-[#0B5A70]/15 p-5">
              <div className="flex items-start gap-3">
                <div className="text-4xl">🕉️</div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#0B5A70] mb-1">Add Sankirtan to Home Screen</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Get quick access - just like a native app!
                  </p>
                  <div className="bg-[#0B5A70]/5 rounded-lg p-3 mb-3 text-xs text-[#0B5A70]">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Tap the <span className="inline-block bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[#0B5A70]">Share ⬆️</span> button below</li>
                      <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                      <li>Tap <strong>"Add"</strong> in the top right</li>
                      <li>Find Sankirtan on your home screen! 🎉</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={dismissInstallPrompt}
                      className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-lg text-sm flex-1"
                    >
                      Got it! 👍
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Offline Indicator Banner */}
        {isOffline && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-semibold sticky top-0 z-50 shadow-md">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              ⚠️ You're offline. Some features may not work. Changes will sync when back online.
            </span>
          </div>
        )}

        {/* iOS Chrome Warning Banner */}
        {showBrowserWarning && (
          <div className="bg-[#0B5A70] text-white px-4 py-3 text-center text-sm sticky top-0 z-50 shadow-md">
            <span className="inline-flex items-center gap-2 flex-wrap justify-center">
              💡 For best experience on iPhone, please use <strong>Safari</strong>
              <button
                onClick={() => {
                  localStorage.setItem('sankirtan-browser-warning-dismissed', 'true');
                  setShowBrowserWarning(false);
                }}
                className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs"
              >
                Dismiss
              </button>
            </span>
          </div>
        )}

        {/* Header — SESSION 5: navigation moved to bottom tab bar;
            header now carries only branding + utility actions */}
        <header className={`sticky top-0 z-40 border-b ${darkMode ? 'bg-[#0f1a1c] border-[#0B5A70]/15' : 'bg-[#FFF8F0]/95 backdrop-blur-md border-[#0B5A70]/10'}`}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentView('public-library')}
              className="hover:opacity-80 transition-opacity"
              aria-label="Sankirtan — go to Public Library"
            >
              <SankirtanWordmark className="h-10 sm:h-12 w-auto" />
            </button>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={openAdminPanel}
                  className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg"
                  title="Admin Panel"
                  aria-label="Open admin panel"
                >
                  🔧<span className="hidden sm:inline"> Admin</span>
                </button>
              )}
              {guestMode && !user ? (
                <button
                  onClick={() => {
                    setGuestMode(false);
                    setLoading(false);
                  }}
                  className="font-semibold px-4 py-2 rounded-xl text-sm transition-all bg-[#0B5A70] text-white hover:bg-[#094a5d]"
                >
                  Sign In
                </button>
              ) : (
              <>
              {userProfile && userProfile.photoURL && (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-9 h-9 rounded-full border-2 border-[#0B5A70]/30"
                />
              )}
              {userProfile && (
              /* SESSION 6: username was hardcoded teal on dark-teal bg — invisible.
                 Now uses amber-100 in dark mode to match card titles. */
              <div className="hidden sm:block">
                <p className={`text-sm font-semibold ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                  {userProfile.displayName}
                </p>
                {userProfile.verified && (
                  <span className={`text-xs ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>
                    ✓ Verified
                  </span>
                )}
                {isAdmin && (
                  <span className={`text-xs ml-1 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                    👑 Admin
                  </span>
                )}
              </div>
              )}
              </>
              )}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-[#E65100] hover:bg-[#1e2e33]' : 'text-[#0B5A70]/60 hover:bg-[#0B5A70]/5'}`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  setOnboardingStep(0);
                  setShowOnboarding(true);
                }}
                className="text-[#0B5A70] hover:text-[#0B5A70]/80 p-2 rounded-lg hover:bg-[#0B5A70]/5"
                title="Show Tour"
                aria-label="Show app tour"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {user && (
              <button
                onClick={handleLogout}
                className="text-[#0B5A70]/60 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                title="Logout"
                aria-label="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content — pb-24 when tab bar is visible so content
            never hides behind the fixed bottom bar */}
        <main className={`max-w-6xl mx-auto px-4 py-6 ${showTabBar ? 'pb-28' : ''}`}>

          {/* ==============================================
              MY LIBRARY VIEW
              ============================================== */}
          {currentView === 'library' && (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/70'}`}>
                  {bhajans.length} bhajan{bhajans.length === 1 ? '' : 's'} in your collection
                </p>
                <button
                  onClick={openAddBhajan}
                  className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">+</span> Add Bhajan
                </button>
              </div>

              {/* Recently Read */}
              {recentlyRead.length > 0 && !searchQuery && !filterDeity && !filterCategory && !libraryFilterKeyword && (
                <div className="mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/60'}`}>
                    🕐 Recently Read
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {recentlyRead.map(r => {
                      const fullBhajan = bhajans.find(b => b.id === r.id);
                      if (!fullBhajan) return null;
                      return (
                        <button
                          key={r.id}
                          onClick={() => { setSelectedBhajan(fullBhajan); setCurrentView('bhajan-detail'); trackRecentRead(fullBhajan); }}
                          className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition-all max-w-[160px] ${
                            darkMode
                              ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30'
                              : 'bg-[#FFFCF8] border-[#0B5A70]/8 hover:border-[#0B5A70]/25 shadow-[0_1px_4px_rgba(11,90,112,0.04)]'
                          }`}
                        >
                          <p className={`text-xs font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>{r.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{r.deity} · {r.category}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search bhajans (title, lyrics, keywords)..."
                    aria-label="Search my library"
                    className={`w-full px-4 py-3 pr-24 border rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-[#162226] border-[#0B5A70]/15 text-gray-100 focus:ring-[#0B5A70]/20 focus:border-[#0B5A70]/30'
                        : 'bg-white border-[#0B5A70]/12 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30'
                    }`}
                  />
                  <button
                    onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                    className={`absolute right-11 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      speechLang === 'hi-IN'
                        ? 'bg-[#0B5A70] text-white border-[#0B5A70]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20'
                    }`}
                    title={`Voice input: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}`}
                    aria-label={`Voice input language: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}. Tap to switch.`}
                  >
                    {speechLang === 'hi-IN' ? 'HI' : 'EN'}
                  </button>
                  <button
                    onClick={() => startVoiceSearch('library')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : darkMode
                          ? 'text-[#0B5A70]/60 hover:text-[#0B5A70]/80 hover:bg-[#1e2e33]'
                          : 'text-[#0B5A70]/60 hover:text-[#0B5A70] hover:bg-[#0B5A70]/5'
                    }`}
                    title={isListening ? 'Listening...' : 'Voice search'}
                    aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
              </div>

              {(searchQuery || filterDeity || filterCategory || libraryFilterKeyword) && (
                <div className="flex justify-end mb-1">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterDeity('');
                      setFilterCategory('');
                      setLibraryFilterKeyword('');
                    }}
                    className="text-xs text-red-600 hover:text-red-800 underline hover:no-underline"
                  >
                    ✕ Clear filters
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={filterDeity}
                  onChange={(e) => setFilterDeity(e.target.value)}
                  aria-label="Filter by deity"
                  className={`flex-1 min-w-[110px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm transition-all ${darkMode ? 'bg-[#162226] text-gray-200' : 'bg-[#FFFCF8]'} ${
                    filterDeity
                      ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                      : `${darkMode ? 'border-[#0B5A70]/20' : 'border-[#0B5A70]/12'}`
                  }`}
                >
                  <option value="">All Deities</option>
                  {allDeityOptions.map(d => (
                    <option key={d.value} value={d.value}>{d.value}</option>
                  ))}
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  aria-label="Filter by category"
                  className={`flex-1 min-w-[110px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm transition-all ${darkMode ? 'bg-[#162226] text-gray-200' : 'bg-[#FFFCF8]'} ${
                    filterCategory
                      ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                      : `${darkMode ? 'border-[#0B5A70]/20' : 'border-[#0B5A70]/12'}`
                  }`}
                >
                  <option value="">All Categories</option>
                  {allCategoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={libraryFilterKeyword}
                  onChange={(e) => setLibraryFilterKeyword(e.target.value)}
                  aria-label="Filter by keyword"
                  className={`flex-1 min-w-[110px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm transition-all ${darkMode ? 'bg-[#162226] text-gray-200' : 'bg-[#FFFCF8]'} ${
                    libraryFilterKeyword
                      ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                      : `${darkMode ? 'border-[#0B5A70]/20' : 'border-[#0B5A70]/12'}`
                  }`}
                >
                  <option value="">All Keywords</option>
                  {allKeywordOptions.map(kw => (
                    <option key={kw} value={kw}>#{kw}</option>
                  ))}
                </select>
              </div>

              {/* Quick Keywords */}
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                {allKeywordOptions.slice(0, 4).map(kw => (
                  <button
                    key={kw}
                    onClick={() => setLibraryFilterKeyword(libraryFilterKeyword === kw ? '' : kw)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      libraryFilterKeyword === kw
                        ? 'bg-[#0B5A70] text-white shadow-md'
                        : `${darkMode ? 'bg-[#0B5A70]/15 text-teal-300 border border-[#0B5A70]/25 hover:bg-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12 hover:bg-[#0B5A70]/10'}`
                    }`}
                  >
                    {libraryFilterKeyword === kw ? '✓ ' : ''}#{kw}
                  </button>
                ))}
              </div>

              {/* Bhajans List */}
              {bhajansLoading ? (
                <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {[...Array(6)].map((_, i) => (
                    compactView ? (
                      <div
                        key={i}
                        className={`rounded-xl p-3 border flex items-center gap-3 animate-pulse ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15' : 'bg-[#FFFCF8] border-[#0B5A70]/8'}`}
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className={`h-3 rounded w-3/4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                          <div className={`h-2 rounded w-1/2 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}></div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={i}
                        className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-5 border animate-pulse ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15' : 'bg-[#FFFCF8] border-[#0B5A70]/8'}`}
                      >
                        <div className={`h-5 rounded w-3/4 mb-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                        <div className="flex gap-2 mb-3">
                          <div className={`h-5 w-16 rounded-full ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                          <div className={`h-5 w-14 rounded-full ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#E65100]/5'}`}></div>
                        </div>
                        <div className="space-y-2">
                          <div className={`h-3 rounded ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-5/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-4/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : filteredBhajans.length === 0 ? (
                <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-[#162226] border-[#0B5A70]/12' : 'bg-[#FFFCF8] border-[#0B5A70]/15'}`}>
                  {bhajans.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-lg font-bold text-[#0B5A70] mb-2">Your library is empty!</h3>
                      <p className="text-sm text-gray-600 mb-4">Start by adding your first bhajan</p>
                      <button
                        onClick={openAddBhajan}
                        className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2"
                      >
                        <span className="text-lg">+</span> Add Your First Bhajan
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-[#0B5A70] font-semibold">No bhajans match your filters</p>
                      <p className="text-sm text-gray-600 mt-1">Try adjusting your search or filters</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex bg-[#0B5A70]/5 rounded-lg p-0.5 border border-[#0B5A70]/10">
                      <button
                        onClick={() => setCompactView(false)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${!compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/60 hover:text-[#0B5A70]'}`}
                        title="Full card view"
                        aria-label="Full card view"
                      >
                        ▤ Full
                      </button>
                      <button
                        onClick={() => setCompactView(true)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/60 hover:text-[#0B5A70]'}`}
                        title="Compact list view"
                        aria-label="Compact list view"
                      >
                        ☰ Compact
                      </button>
                    </div>
                  </div>

                <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {/* SESSION 6: MyBhajanCard is React.memo — unchanged rows skip re-render */}
                  {filteredBhajans.slice(0, libraryVisibleCount).map((bhajan, cardIndex) => (
                    <MyBhajanCard
                      key={bhajan.id}
                      bhajan={bhajan}
                      darkMode={darkMode}
                      compactView={compactView}
                      cardIndex={cardIndex}
                      onOpen={openBhajanDetail}
                    />
                  ))}
                </div>

                {libraryVisibleCount < filteredBhajans.length && (
                  <div ref={libraryLoadMoreRef} className="text-center py-6">
                    <div className="inline-flex items-center gap-2 text-xs text-[#0B5A70]/60">
                      <div className="w-4 h-4 border-2 border-[#0B5A70]/40 border-t-transparent rounded-full animate-spin"></div>
                      Loading more bhajans...
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Showing {libraryVisibleCount} of {filteredBhajans.length}
                    </p>
                    <button
                      onClick={() => setLibraryVisibleCount(prev => prev + PAGE_SIZE * 3)}
                      className={`mt-2 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${darkMode ? 'bg-[#0B5A70]/20 text-teal-300 hover:bg-[#0B5A70]/30' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    >
                      ↻ Load more
                    </button>
                  </div>
                )}
                {libraryVisibleCount >= filteredBhajans.length && filteredBhajans.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-gray-400 py-6">
                    ✨ You've seen all {filteredBhajans.length} bhajans
                  </p>
                )}
                </>
              )}
            </>
          )}

          {/* ==============================================
              BHAJAN DETAIL VIEW
              ============================================== */}
          {currentView === 'bhajan-detail' && selectedBhajan && (
            <div
              onTouchStart={librarySwipe.onTouchStart}
              onTouchEnd={librarySwipe.onTouchEnd}
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => { if (guestMode && !user) { setGuestMode(false); } else { setCurrentView('library'); } }}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Back
                </button>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleShareBhajan(selectedBhajan)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Share this bhajan"
                  >
                    ↗ Share
                  </button>
                  <button
                    onClick={() => setShowReadingSettings(true)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Reading view options"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => openEditBhajan(selectedBhajan)}
                    className="bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70] font-semibold px-2.5 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteBhajan(selectedBhajan)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-2.5 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div
                key={selectedBhajan.id}
                className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 mb-4 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'} ${slideDir === 'left' ? 'sk-slide-left' : slideDir === 'right' ? 'sk-slide-right' : ''}`}
              >
                <h1
                  className={`text-xl md:text-2xl font-bold mb-3 line-clamp-2 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}
                  title={selectedBhajan.title}
                >
                  {selectedBhajan.title}
                </h1>

                {selectedBhajan.dhun && (
                  <div className={`border-l-4 border-[#E65100]/40 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                    <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedBhajan.dhun}
                    </p>
                  </div>
                )}

                <div className="mb-4 flex items-center gap-2">
                  {selectedBhajan.scale ? (
                    <button
                      onClick={() => openEditBhajan(selectedBhajan)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${darkMode ? 'bg-purple-900 text-purple-200 hover:bg-purple-800' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                      title="Click to change scale/raag"
                    >
                      🎵 Scale: {selectedBhajan.scale}
                    </button>
                  ) : (
                    <button
                      onClick={() => openEditBhajan(selectedBhajan)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed transition-colors ${darkMode ? 'bg-transparent text-gray-400 border-[#0B5A70]/20 hover:bg-[#1e2e33] hover:text-gray-200' : 'bg-transparent text-gray-500 border-gray-400 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-400'}`}
                      title="Add scale/raag for this bhajan"
                    >
                      + Add Scale
                    </button>
                  )}
                </div>

                <div className={`border-t pt-4 ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                  <div className="flex items-center justify-end gap-1 mb-2">
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Decrease font size"
                      aria-label="Decrease font size"
                    >
                      Aa−
                    </button>
                    <span className={`text-xs w-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{readingSettings.fontSize}</span>
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.min(40, prev.fontSize + 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Increase font size"
                      aria-label="Increase font size"
                    >
                      Aa+
                    </button>
                  </div>
                  <pre
                    className={`whitespace-pre-wrap text-lg leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                    style={{
                      fontSize: `${readingSettings.fontSize}px`,
                      fontFamily: readingSettings.fontFamily,
                      lineHeight: readingSettings.lineHeight,
                      textAlign: readingSettings.textAlign
                    }}
                  >
                    {selectedBhajan.lyrics}
                  </pre>
                </div>

                {selectedBhajan.keywords && selectedBhajan.keywords.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#0B5A70]/8">
                    <p className="text-xs text-gray-500 mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBhajan.keywords.map(kw => (
                        <span key={kw} className="bg-[#0B5A70]/5 text-[#0B5A70]/70 px-3 py-1 rounded-full text-sm">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBhajan.source && (
                  <div className="mt-4 pt-4 border-t border-[#0B5A70]/8">
                    <a
                      href={selectedBhajan.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#0B5A70] hover:text-[#0B5A70]/80 text-sm font-semibold"
                    >
                      🔗 View Source
                    </a>
                  </div>
                )}
              </div>

              {/* Related Bhajans — SESSION 6: uses memoized relatedMyBhajans */}
              {relatedMyBhajans.length > 0 && (
                <div className="mt-6">
                  <p className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]'}`}>
                    ✨ Related Bhajans
                  </p>
                  <div className="space-y-1.5">
                    {relatedMyBhajans.map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBhajan(b);
                          trackRecentRead(b);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>{b.title}</p>
                          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {b.deity} · {b.category}
                            {b.matchedKws.length > 0 && (
                              <span className={darkMode ? 'text-orange-300/70' : 'text-[#E65100]/60'}> · {b.matchedKws.slice(0, 2).map(k => `#${k}`).join(' ')}</span>
                            )}
                          </p>
                        </div>
                        <span className={`text-lg flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/30'}`}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev / Next navigation — SESSION 6: uses memoized myPrevNext */}
              {myPrevNext && (
                <div className={`flex items-center justify-between mt-6 pt-4 border-t ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                  <button
                    onClick={() => navigateBhajan('prev', false)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all max-w-[45%] ${darkMode ? 'text-gray-300 hover:bg-[#1e2e33]' : 'text-[#0B5A70] hover:bg-[#0B5A70]/5'}`}
                    aria-label="Previous bhajan"
                  >
                    <span className="flex-shrink-0">‹</span>
                    <span className="truncate">{myPrevNext.prev.title}</span>
                  </button>
                  <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {myPrevNext.idx + 1}/{myPrevNext.total}
                  </span>
                  <button
                    onClick={() => navigateBhajan('next', false)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all max-w-[45%] text-right ${darkMode ? 'text-gray-300 hover:bg-[#1e2e33]' : 'text-[#0B5A70] hover:bg-[#0B5A70]/5'}`}
                    aria-label="Next bhajan"
                  >
                    <span className="truncate">{myPrevNext.next.title}</span>
                    <span className="flex-shrink-0">›</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==============================================
              ADD/EDIT BHAJAN FORM
              ============================================== */}
          {(currentView === 'add-bhajan' || currentView === 'edit-bhajan') && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (currentView === 'edit-bhajan' && selectedBhajan) {
                      setCurrentView('bhajan-detail');
                    } else {
                      setCurrentView('library');
                    }
                  }}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Cancel
                </button>
              </div>

              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 border border-[#0B5A70]/8">
                <h2 className="text-2xl font-bold text-[#0B5A70] mb-6">
                  {currentView === 'edit-bhajan' ? '✏️ Edit Bhajan' : '➕ Add New Bhajan'}
                </h2>

                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="hindi-input-title"
                      type="text"
                      value={bhajanForm.title}
                      onChange={(e) => handleHindiInput(e, 'title')}
                      onKeyDown={(e) => handleHindiKeyDown(e, 'title')}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      onFocus={() => setActiveTypingField('title')}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-lg"
                      placeholder={hindiTypingEnabled ? "Type: om jai jagdish hare" : "e.g., ॐ जय जगदीश हरे"}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'title' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center z-30">
                        <span className="text-xs text-gray-500 mr-1">
                          <strong>"{currentWord}"</strong> →
                        </span>
                        {transliterationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applySuggestion(suggestion, 'title');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              applySuggestion(suggestion, 'title');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              idx === 0
                                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md'
                                : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestion(currentWord, 'title');
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            applySuggestion(currentWord, 'title');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
                          title="Keep as English"
                        >
                          {currentWord}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deity and Category */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                      Deity
                    </label>
                    <select
                      value={bhajanForm.deity}
                      onChange={(e) => setBhajanForm({...bhajanForm, deity: e.target.value})}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none bg-[#FFFCF8]"
                    >
                      {allDeityOptions.map(d => (
                        <option key={d.value} value={d.value}>{d.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                      Category
                    </label>
                    <select
                      value={bhajanForm.category}
                      onChange={(e) => setBhajanForm({...bhajanForm, category: e.target.value})}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none bg-[#FFFCF8]"
                    >
                      {allCategoryOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dhun / Tarz */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    तर्ज़ / धुन (Tune)
                  </label>
                  <div className="relative">
                    <input
                      id="hindi-input-dhun"
                      type="text"
                      value={bhajanForm.dhun}
                      onChange={(e) => handleHindiInput(e, 'dhun')}
                      onKeyDown={(e) => handleHindiKeyDown(e, 'dhun')}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      onFocus={() => setActiveTypingField('dhun')}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                      placeholder={hindiTypingEnabled ? "Type in English, press space" : "e.g., तर्ज़: तुझे देखा तो..."}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'dhun' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center z-30">
                        <span className="text-xs text-gray-500 mr-1">
                          <strong>"{currentWord}"</strong> →
                        </span>
                        {transliterationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applySuggestion(suggestion, 'dhun');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              applySuggestion(suggestion, 'dhun');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              idx === 0
                                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md'
                                : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestion(currentWord, 'dhun');
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            applySuggestion(currentWord, 'dhun');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
                          title="Keep as English"
                        >
                          {currentWord}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scale */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    Scale / Raag
                  </label>
                  <input
                    type="text"
                    value={bhajanForm.scale}
                    onChange={(e) => setBhajanForm({...bhajanForm, scale: e.target.value})}
                    className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                    placeholder="e.g., Raag Yaman, C# Scale"
                  />
                </div>

                {/* Lyrics with Hindi Typing */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-[#0B5A70]">
                      Lyrics <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setHindiTypingEnabled(!hindiTypingEnabled)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                        hindiTypingEnabled
                          ? 'bg-[#0B5A70] text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                      title={hindiTypingEnabled ? 'Turn off Hindi typing' : 'Turn on Hindi typing'}
                    >
                      {hindiTypingEnabled ? '🇮🇳 हिंदी ON' : '🔤 Hindi OFF'}
                    </button>
                  </div>

                  {/* OCR import block */}
                  <div className="mb-3 p-3 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-xl">
                    <p className="text-xs font-semibold text-[#0B5A70] mb-2">
                      📥 Auto-fill lyrics from a photo, PDF, or camera — text is read on your device, nothing is uploaded or stored as a file
                    </p>

                    {!localStorage.getItem('sankirtan-tesseract-langs-cached') && !ocrProcessing && (
                      <div className="mb-2 p-2 bg-[#E65100]/5 border border-[#E65100]/20 rounded-lg text-xs text-[#0B5A70]">
                        ⚠️ <strong>First-time use:</strong> The OCR engine (~15 MB) will download once and be cached. Please use WiFi if possible.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={ocrProcessing}
                        onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                        className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        📷 Camera
                      </button>
                      <button
                        type="button"
                        disabled={ocrProcessing}
                        onClick={() => imageInputRef.current && imageInputRef.current.click()}
                        className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        🖼️ Upload Image
                      </button>
                      <button
                        type="button"
                        disabled={ocrProcessing}
                        onClick={() => pdfInputRef.current && pdfInputRef.current.click()}
                        className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        📄 Upload PDF
                      </button>
                    </div>

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handleImageFileForOcr(f, 'photo');
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handleImageFileForOcr(f, 'image');
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handlePdfFileForOcr(f);
                        e.target.value = '';
                      }}
                    />

                    {ocrProcessing && (
                      <div className="mt-3 p-3 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg">
                        <div className="w-full bg-[#0B5A70]/10 rounded-full h-3 mb-2">
                          <div
                            className="bg-[#0B5A70] h-3 rounded-full transition-all"
                            style={{ width: ocrProgress + '%' }}
                          ></div>
                        </div>
                        <p className="text-xs font-semibold text-[#0B5A70]">{ocrMessage || 'Processing...'}</p>
                        {!localStorage.getItem('sankirtan-tesseract-langs-cached') && (
                          <p className="text-[10px] text-[#0B5A70]/80 mt-1">
                            💡 First-time setup takes 30-60 seconds. Future uses will be instant.
                          </p>
                        )}
                      </div>
                    )}
                    {!ocrProcessing && ocrMessage && (
                      <p className="text-xs font-semibold text-[#0B5A70] mt-2">{ocrMessage}</p>
                    )}
                    <p className="text-xs text-[#0B5A70]/80 mt-2">
                      💡 Works best with clear, printed Hindi/English text. Handwriting may need manual correction. Scanned PDFs supported (up to 10 pages).
                    </p>
                  </div>

                  {hindiTypingEnabled && (
                    <div className="mb-2 p-2 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-lg">
                      <p className="text-xs text-[#E65100]">
                        ✨ Type in English, press <kbd className="bg-white px-1.5 py-0.5 rounded border text-xs">space</kbd> to auto-convert to Hindi
                      </p>
                      <p className="text-xs text-[#0B5A70]/60 mt-1">
                        Example: <code className="bg-white px-1 rounded">jai shri babosa</code> → जय श्री बाबोसा
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      id="hindi-input-lyrics"
                      value={bhajanForm.lyrics}
                      onChange={(e) => handleHindiInput(e, 'lyrics')}
                      onKeyDown={(e) => handleHindiKeyDown(e, 'lyrics')}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      onFocus={() => setActiveTypingField('lyrics')}
                      rows={10}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none font-mono text-base"
                      placeholder={hindiTypingEnabled ? "Type: jai shri babosa (press space to convert)" : "भजन के बोल यहाँ लिखें..."}
                      style={{ lineHeight: '1.8' }}
                    />

                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'lyrics' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-xl shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center z-30">
                        <span className="text-xs text-gray-500 mr-1">
                          <strong>"{currentWord}"</strong> →
                        </span>
                        {transliterationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applySuggestion(suggestion, 'lyrics');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              applySuggestion(suggestion, 'lyrics');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              idx === 0
                                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md'
                                : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'
                            }`}
                            title={idx === 0 ? 'Default (press space)' : `Alternative ${idx + 1}`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestion(currentWord, 'lyrics');
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            applySuggestion(currentWord, 'lyrics');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
                          title="Keep as English"
                        >
                          {currentWord}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-2">
                    Keywords (tap to select)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allKeywordOptions.map(kw => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => toggleKeyword(kw)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          bhajanForm.keywords.includes(kw)
                            ? 'bg-[#0B5A70] text-white shadow-md'
                            : `${darkMode ? 'bg-[#0B5A70]/15 text-teal-300 border border-[#0B5A70]/25 hover:bg-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12 hover:bg-[#0B5A70]/10'}`
                        }`}
                      >
                        {bhajanForm.keywords.includes(kw) ? '✓ ' : ''}#{kw}
                      </button>
                    ))}
                  </div>
                  {bhajanForm.keywords.length > 0 && (
                    <p className="text-xs text-[#0B5A70]/60 mt-2">
                      {bhajanForm.keywords.length} selected
                    </p>
                  )}
                </div>

                {/* Source URL */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    Source URL (optional)
                  </label>
                  <input
                    type="url"
                    value={bhajanForm.source}
                    onChange={(e) => setBhajanForm({...bhajanForm, source: e.target.value})}
                    className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                    placeholder="https://youtube.com/... or reference URL"
                  />
                </div>

                {bhajanFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {bhajanFormError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveBhajan}
                    disabled={bhajanFormSaving || !bhajanForm.title.trim() || !bhajanForm.lyrics.trim()}
                    className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bhajanFormSaving ? 'Saving...' : (currentView === 'edit-bhajan' ? '💾 Save Changes' : '➕ Add Bhajan')}
                  </button>
                  <button
                    onClick={() => {
                      if (currentView === 'edit-bhajan' && selectedBhajan) {
                        setCurrentView('bhajan-detail');
                      } else {
                        setCurrentView('library');
                      }
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ==============================================
              PROGRAMS LIST VIEW
              ============================================== */}
          {currentView === 'programs' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#0B5A70]">🎵 Programs & Setlists</h2>
                  <p className="text-sm text-[#0B5A70]/70">Your live performance programs ({programs.length})</p>
                </div>
                <button
                  onClick={openCreateProgram}
                  className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">+</span> Create
                </button>
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  value={programSearchQuery}
                  onChange={(e) => setProgramSearchQuery(e.target.value)}
                  placeholder="🔍 Search programs by name or venue..."
                  aria-label="Search programs"
                  className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                />
              </div>

              {programsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#0B5A70]/40 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-[#0B5A70]/70">Loading programs...</p>
                </div>
              ) : filteredPrograms.length === 0 ? (
                <div className="text-center py-12 bg-[#FFFCF8] rounded-2xl border-2 border-dashed border-[#0B5A70]/12">
                  {programs.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">🎵</div>
                      <h3 className="text-lg font-bold text-[#0B5A70] mb-2">No programs yet!</h3>
                      <p className="text-sm text-gray-600 mb-4">Create your first program for a live performance</p>
                      <button
                        onClick={openCreateProgram}
                        className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2"
                      >
                        <span className="text-lg">+</span> Create Your First Program
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-[#0B5A70] font-semibold">No programs match your search</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrograms.map(program => (
                    <button
                      key={program.id}
                      onClick={() => openProgramDetail(program)}
                      className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-5 border border-[#0B5A70]/8 hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)] transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-3xl">🎵</div>
                        <span className="text-xs bg-[#0B5A70]/8 text-[#0B5A70] px-2 py-1 rounded-full font-semibold">
                          {program.bhajanCount || 0} bhajans
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0B5A70] mb-1">
                        {program.name}
                      </h3>
                      {program.date && (
                        <p className="text-sm text-[#E65100] mb-1">📅 {program.date}</p>
                      )}
                      {program.venue && (
                        <p className="text-sm text-gray-600 mb-2">📍 {program.venue}</p>
                      )}
                      <p className="text-xs text-[#0B5A70]/60 mt-3">View Program →</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ==============================================
              PROGRAM DETAIL VIEW
              ============================================== */}
          {currentView === 'program-detail' && selectedProgram && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView('programs')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Back to Programs
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditProgram(selectedProgram)}
                    className="text-[#0B5A70] hover:text-[#0B5A70]/80 px-3 py-1.5 rounded-lg hover:bg-[#0B5A70]/5 text-sm font-semibold"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteProgram(selectedProgram)}
                    className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-semibold"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 border border-[#0B5A70]/8 mb-4">
                <div className="text-4xl mb-2">🎵</div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#0B5A70] mb-3">
                  {selectedProgram.name}
                </h1>
                {selectedProgram.date && (
                  <p className="text-lg text-[#E65100] mb-1">📅 {selectedProgram.date}</p>
                )}
                {selectedProgram.venue && (
                  <p className="text-lg text-gray-600 mb-3">📍 {selectedProgram.venue}</p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <span className="bg-[#0B5A70]/8 text-[#0B5A70] px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedProgram.bhajanIds?.length || 0} bhajans
                  </span>
                </div>

                {selectedProgram.bhajanIds && selectedProgram.bhajanIds.length > 0 && (
                  <button
                    onClick={() => startLiveProgram(selectedProgram)}
                    className="w-full mt-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2"
                  >
                    🎤 START LIVE PERFORMANCE
                  </button>
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-[#0B5A70] mb-3">Bhajans in this Program:</h3>
                {(!selectedProgram.bhajanIds || selectedProgram.bhajanIds.length === 0) ? (
                  <div className="bg-[#FFFCF8] rounded-2xl p-6 text-center border-2 border-dashed border-[#0B5A70]/12">
                    <p className="text-[#0B5A70] mb-2">No bhajans in this program yet</p>
                    <button
                      onClick={() => openEditProgram(selectedProgram)}
                      className="text-[#0B5A70] hover:text-[#0B5A70]/80 font-semibold text-sm"
                    >
                      + Add bhajans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedProgram.bhajanIds.map((bhajanId, index) => {
                      const bhajan = getBhajanById(bhajanId);
                      if (!bhajan) return (
                        <div key={bhajanId} className="bg-red-50 rounded-xl p-3 border border-red-200">
                          <p className="text-sm text-red-700">⚠️ Bhajan not found (may have been deleted)</p>
                        </div>
                      );
                      return (
                        <button
                          key={bhajanId}
                          onClick={() => openBhajanDetail(bhajan)}
                          className="w-full bg-[#FFFCF8] rounded-xl p-4 border border-[#0B5A70]/8 hover:border-[#0B5A70]/25 transition-all text-left flex items-center gap-3 shadow-[0_1px_4px_rgba(11,90,112,0.04)]"
                        >
                          <div className="text-2xl font-bold text-[#E65100] min-w-[40px] text-center">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#0B5A70] truncate">{bhajan.title}</p>
                            {bhajan.dhun && (
                              <p className="text-xs text-[#0B5A70]/60 truncate">तर्ज़: {bhajan.dhun}</p>
                            )}
                            <div className="flex gap-1 mt-1">
                              <span className="text-xs bg-[#0B5A70]/8 text-[#0B5A70] px-2 py-0.5 rounded-full">
                                {bhajan.deity}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==============================================
              CREATE/EDIT PROGRAM FORM
              ============================================== */}
          {(currentView === 'create-program' || currentView === 'edit-program') && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (currentView === 'edit-program' && selectedProgram) {
                      setCurrentView('program-detail');
                    } else {
                      setCurrentView('programs');
                    }
                  }}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Cancel
                </button>
              </div>

              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 border border-[#0B5A70]/8">
                <h2 className="text-2xl font-bold text-[#0B5A70] mb-6">
                  {currentView === 'edit-program' ? '✏️ Edit Program' : '➕ Create New Program'}
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    Program Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-lg"
                    placeholder="e.g., Diwali Jagran 2026"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                      Date (optional)
                    </label>
                    <input
                      type="date"
                      value={programForm.date}
                      onChange={(e) => setProgramForm({...programForm, date: e.target.value})}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                      Venue (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={programForm.venue}
                        onChange={(e) => setProgramForm({...programForm, venue: e.target.value})}
                        className="w-full px-4 py-3 pr-10 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                        placeholder="e.g., Delhi Temple"
                      />
                      {programForm.venue.trim() && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(programForm.venue)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0B5A70]/60 hover:text-[#0B5A70] p-1.5 rounded-lg hover:bg-[#0B5A70]/5 transition-colors"
                          title="Open in Google Maps"
                          aria-label="Open venue in Google Maps"
                        >
                          📍
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4 pt-4 border-t border-[#0B5A70]/8">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-[#0B5A70]">
                      Bhajans in Program ({programForm.bhajanIds.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBhajanPicker(true);
                        setBhajanPickerSearch('');
                        setPickerDeityFilter('');
                        setPickerKeywordFilter('');
                      }}
                      className="bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70] font-semibold px-3 py-1.5 rounded-lg text-sm"
                    >
                      + Add Bhajan
                    </button>
                  </div>

                  {programForm.bhajanIds.length === 0 ? (
                    <div className="text-center py-6 bg-[#0B5A70]/5 rounded-xl border-2 border-dashed border-[#0B5A70]/12">
                      <p className="text-sm text-[#0B5A70]/70">No bhajans added yet</p>
                      <p className="text-xs text-gray-500 mt-1">Tap "+ Add Bhajan" to add from your library</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {programForm.bhajanIds.map((bhajanId, index) => {
                        const bhajan = getBhajanById(bhajanId);
                        if (!bhajan) return (
                          <div key={bhajanId} className="bg-red-50 rounded-lg p-2 border border-red-200 text-xs text-red-700">
                            ⚠️ Bhajan not found (ID: {bhajanId})
                            <button
                              onClick={() => removeBhajanFromProgram(bhajanId)}
                              className="ml-2 text-red-600 underline"
                            >
                              Remove
                            </button>
                          </div>
                        );
                        return (
                          <div key={bhajanId} className="bg-white border border-[#0B5A70]/15 rounded-xl p-3 flex items-center gap-2">
                            <div className="text-xl font-bold text-[#E65100] min-w-[30px] text-center">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#0B5A70] truncate text-sm">{bhajan.title}</p>
                              <p className="text-xs text-gray-600 truncate">
                                {bhajan.deity} • {bhajan.category}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveBhajanUp(index)}
                                disabled={index === 0}
                                className="w-8 h-8 rounded-lg bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Move up"
                                aria-label={`Move ${bhajan.title} up`}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBhajanDown(index)}
                                disabled={index === programForm.bhajanIds.length - 1}
                                className="w-8 h-8 rounded-lg bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Move down"
                                aria-label={`Move ${bhajan.title} down`}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBhajanFromProgram(bhajanId)}
                                className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                                title="Remove"
                                aria-label={`Remove ${bhajan.title} from program`}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {programFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {programFormError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveProgram}
                    disabled={programFormSaving || !programForm.name.trim()}
                    className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {programFormSaving ? 'Saving...' : (currentView === 'edit-program' ? '💾 Save Changes' : '➕ Create Program')}
                  </button>
                  <button
                    onClick={() => {
                      if (currentView === 'edit-program' && selectedProgram) {
                        setCurrentView('program-detail');
                      } else {
                        setCurrentView('programs');
                      }
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Bhajan Picker Modal */}
              {showBhajanPicker && (() => {
                const pickerDeities = [...new Set(bhajans.map(b => b.deity).filter(Boolean))].sort();
                const allPickerKeywords = [...new Set(bhajans.flatMap(b => b.keywords || []))].sort();

                const programKeywords = new Set();
                programForm.bhajanIds.forEach(id => {
                  const b = getBhajanById(id);
                  if (b && b.keywords) b.keywords.forEach(kw => programKeywords.add(kw));
                });

                const searchLower = bhajanPickerSearch.toLowerCase();
                const filteredPickerBhajans = bhajans.filter(b => {
                  if (bhajanPickerSearch && !(
                    b.title.toLowerCase().includes(searchLower) ||
                    (b.lyrics && b.lyrics.toLowerCase().includes(searchLower)) ||
                    (b.keywords && b.keywords.some(kw => kw.toLowerCase().includes(searchLower)))
                  )) return false;
                  if (pickerDeityFilter && b.deity !== pickerDeityFilter) return false;
                  if (pickerKeywordFilter && !(b.keywords && b.keywords.includes(pickerKeywordFilter))) return false;
                  return true;
                });

                const relatedBhajans = programKeywords.size > 0 && !bhajanPickerSearch && !pickerDeityFilter && !pickerKeywordFilter
                  ? bhajans.filter(b => {
                      if (programForm.bhajanIds.includes(b.id)) return false;
                      return b.keywords && b.keywords.some(kw => programKeywords.has(kw));
                    }).slice(0, 8)
                  : [];

                const hasActiveFilters = bhajanPickerSearch || pickerDeityFilter || pickerKeywordFilter;

                return (
                <div onClick={closeBhajanPicker} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div onClick={(e) => e.stopPropagation()} className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-lg w-full max-h-[85vh] flex flex-col">
                    <div className="p-4 border-b border-[#0B5A70]/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[#0B5A70]">Add Bhajans to Program</h3>
                        <p className="text-xs text-[#0B5A70]/60 mt-0.5">Tap to add or remove. Hit Done when finished.</p>
                      </div>
                      <button
                        onClick={closeBhajanPicker}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Close bhajan picker"
                      >
                        ×
                      </button>
                    </div>

                    <div className="p-4 border-b border-[#0B5A70]/10 space-y-3">
                      <input
                        type="text"
                        value={bhajanPickerSearch}
                        onChange={(e) => setBhajanPickerSearch(e.target.value)}
                        placeholder="🔍 Search by title, lyrics, or keyword..."
                        className="w-full px-3 py-2.5 border border-[#0B5A70]/15 rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm bg-white"
                        autoFocus
                      />

                      <div className="flex gap-2">
                        <select
                          value={pickerDeityFilter}
                          onChange={(e) => setPickerDeityFilter(e.target.value)}
                          aria-label="Filter picker by deity"
                          className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs outline-none bg-[#FFFCF8] transition-all ${
                            pickerDeityFilter
                              ? 'border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold text-[#0B5A70]'
                              : 'border-[#0B5A70]/15'
                          }`}
                        >
                          <option value="">All Deities</option>
                          {pickerDeities.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                          value={pickerKeywordFilter}
                          onChange={(e) => setPickerKeywordFilter(e.target.value)}
                          aria-label="Filter picker by keyword"
                          className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs outline-none bg-[#FFFCF8] transition-all ${
                            pickerKeywordFilter
                              ? 'border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold text-[#0B5A70]'
                              : 'border-[#0B5A70]/15'
                          }`}
                        >
                          <option value="">All Keywords</option>
                          {allPickerKeywords.map(kw => <option key={kw} value={kw}>#{kw}</option>)}
                        </select>
                        {hasActiveFilters && (
                          <button
                            onClick={() => {
                              setBhajanPickerSearch('');
                              setPickerDeityFilter('');
                              setPickerKeywordFilter('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap px-2"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      {bhajans.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[#0B5A70] font-semibold">Your library is empty</p>
                          <p className="text-sm text-gray-600 mt-1">Add bhajans to your library first</p>
                        </div>
                      ) : (
                        <>
                          {relatedBhajans.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-[#E65100] uppercase tracking-wide mb-2 flex items-center gap-1">
                                <span>✨</span> Suggested based on program keywords
                              </p>
                              <div className="space-y-1.5">
                                {relatedBhajans.map(bhajan => {
                                  const isAdded = programForm.bhajanIds.includes(bhajan.id);
                                  const matchedKws = (bhajan.keywords || []).filter(kw => programKeywords.has(kw));
                                  return (
                                    <button
                                      key={`rel-${bhajan.id}`}
                                      onClick={() => toggleBhajanInProgram(bhajan.id)}
                                      aria-pressed={isAdded}
                                      title={isAdded ? 'Tap to remove from program' : 'Tap to add to program'}
                                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                                        isAdded
                                          ? 'bg-green-50 border-green-200 hover:border-green-400'
                                          : 'bg-[#E65100]/3 border-[#E65100]/15 hover:border-[#E65100]/30'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-[#0B5A70] truncate text-sm">{bhajan.title}</p>
                                          <p className="text-xs text-gray-600 truncate">
                                            {bhajan.deity} • {bhajan.category}
                                          </p>
                                          {matchedKws.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {matchedKws.slice(0, 3).map(kw => (
                                                <span key={kw} className="text-[10px] bg-[#E65100]/8 text-[#E65100] px-1.5 py-0.5 rounded-full">
                                                  #{kw}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        {isAdded ? (
                                          <span className="text-green-700 font-semibold ml-2 text-sm whitespace-nowrap">✓ Added</span>
                                        ) : (
                                          <span className="text-[#0B5A70] font-semibold ml-2 text-sm">+ Add</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="border-b border-[#0B5A70]/8 mt-4 mb-3"></div>
                            </div>
                          )}

                          <p className="text-xs font-semibold text-[#0B5A70]/60 uppercase tracking-wide mb-2">
                            {hasActiveFilters ? `${filteredPickerBhajans.length} results` : `All bhajans (${bhajans.length})`}
                          </p>
                          {filteredPickerBhajans.length === 0 ? (
                            <div className="text-center py-6">
                              <p className="text-sm text-gray-500">No bhajans match your search</p>
                              <button
                                onClick={() => {
                                  setBhajanPickerSearch('');
                                  setPickerDeityFilter('');
                                  setPickerKeywordFilter('');
                                }}
                                className="text-sm text-[#0B5A70] hover:underline mt-2"
                              >
                                Clear all filters
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {filteredPickerBhajans.map(bhajan => {
                                const isAdded = programForm.bhajanIds.includes(bhajan.id);
                                return (
                                  <button
                                    key={bhajan.id}
                                    onClick={() => toggleBhajanInProgram(bhajan.id)}
                                    aria-pressed={isAdded}
                                    title={isAdded ? 'Tap to remove from program' : 'Tap to add to program'}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                                      isAdded
                                        ? 'bg-green-50 border-green-200 hover:border-green-400'
                                        : 'bg-white border-[#0B5A70]/10 hover:border-[#0B5A70]/25'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[#0B5A70] truncate text-sm">{bhajan.title}</p>
                                        <p className="text-xs text-gray-600 truncate">
                                          {bhajan.deity} • {bhajan.category}
                                          {bhajan.keywords && bhajan.keywords.length > 0 && (
                                            <span className="text-[#0B5A70]/40"> • {bhajan.keywords.slice(0, 2).map(k => `#${k}`).join(' ')}</span>
                                          )}
                                        </p>
                                      </div>
                                      {isAdded ? (
                                        <span className="text-green-700 font-semibold ml-2 text-sm whitespace-nowrap">✓ Added</span>
                                      ) : (
                                        <span className="text-[#0B5A70] font-semibold ml-2 text-sm">+ Add</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="p-3 border-t border-[#0B5A70]/10 bg-[#FFFCF8]">
                      <button
                        type="button"
                        onClick={closeBhajanPicker}
                        className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-2.5 rounded-xl shadow-md transition-colors"
                      >
                        Done · {programForm.bhajanIds.length} {programForm.bhajanIds.length === 1 ? 'bhajan' : 'bhajans'} in program
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </>
          )}

          {/* ==============================================
              PUBLIC LIBRARY VIEW
              ============================================== */}
          {currentView === 'public-library' && (
            <>
              {isAdmin && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={openAddPublicBhajan}
                    className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1 shadow-md"
                  >
                    + Add Bhajan
                  </button>
                </div>
              )}

              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="🔍 Search public bhajans..."
                    aria-label="Search public library"
                    className={`w-full px-4 py-3 pr-24 border rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-[#162226] border-[#0B5A70]/15 text-gray-100 focus:ring-[#0B5A70]/20 focus:border-[#0B5A70]/30'
                        : 'bg-white border-[#0B5A70]/12 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30'
                    }`}
                  />
                  <button
                    onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                    className={`absolute right-11 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      speechLang === 'hi-IN'
                        ? 'bg-[#0B5A70] text-white border-[#0B5A70]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20'
                    }`}
                    title={`Voice input: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}`}
                    aria-label={`Voice input language: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}. Tap to switch.`}
                  >
                    {speechLang === 'hi-IN' ? 'HI' : 'EN'}
                  </button>
                  <button
                    onClick={() => startVoiceSearch('public')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : darkMode
                          ? 'text-[#0B5A70]/60 hover:text-[#0B5A70]/80 hover:bg-[#1e2e33]'
                          : 'text-[#0B5A70]/60 hover:text-[#0B5A70] hover:bg-[#0B5A70]/5'
                    }`}
                    title={isListening ? 'Listening...' : 'Voice search'}
                    aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
              </div>

              {(publicSearchQuery || publicFilterDeity || publicFilterCategory || publicFilterKeyword) && (
                <div className="flex justify-end mb-1">
                  <button
                    onClick={() => {
                      setPublicSearchQuery('');
                      setPublicFilterDeity('');
                      setPublicFilterCategory('');
                      setPublicFilterKeyword('');
                    }}
                    className="text-xs text-red-600 hover:text-red-800 underline hover:no-underline"
                  >
                    ✕ Clear filters
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={publicFilterDeity}
                  onChange={(e) => setPublicFilterDeity(e.target.value)}
                  aria-label="Filter public library by deity"
                  className={`flex-1 min-w-[110px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm transition-all ${darkMode ? 'bg-[#162226] text-gray-200' : 'bg-[#FFFCF8]'} ${
                    publicFilterDeity
                      ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                      : `${darkMode ? 'border-[#0B5A70]/20' : 'border-[#0B5A70]/12'}`
                  }`}
                >
                  <option value="">All Deities</option>
                  {allDeityOptions.map(d => (
                    <option key={d.value} value={d.value}>{d.value}</option>
                  ))}
                </select>

                <select
                  value={publicFilterCategory}
                  onChange={(e) => setPublicFilterCategory(e.target.value)}
                  aria-label="Filter public library by category"
                  className={`flex-1 min-w-[110px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm transition-all ${darkMode ? 'bg-[#162226] text-gray-200' : 'bg-[#FFFCF8]'} ${
                    publicFilterCategory
                      ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                      : `${darkMode ? 'border-[#0B5A70]/20' : 'border-[#0B5A70]/12'}`
                  }`}
                >
                  <option value="">All Categories</option>
                  {allCategoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={publicFilterKeyword}
                  onChange={(e) => setPublicFilterKeyword(e.target.value)}
                  aria-label="Filter public library by keyword"
                  className={`flex-1 min-w-[110px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm transition-all ${darkMode ? 'bg-[#162226] text-gray-200' : 'bg-[#FFFCF8]'} ${
                    publicFilterKeyword
                      ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                      : `${darkMode ? 'border-[#0B5A70]/20' : 'border-[#0B5A70]/12'}`
                  }`}
                >
                  <option value="">All Keywords</option>
                  {allKeywordOptions.map(kw => (
                    <option key={kw} value={kw}>#{kw}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6 flex flex-wrap gap-2 items-center">
                {allKeywordOptions.slice(0, 4).map(kw => (
                  <button
                    key={kw}
                    onClick={() => setPublicFilterKeyword(publicFilterKeyword === kw ? '' : kw)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      publicFilterKeyword === kw
                        ? 'bg-[#0B5A70] text-white shadow-md'
                        : `${darkMode ? 'bg-[#0B5A70]/15 text-teal-300 border border-[#0B5A70]/25 hover:bg-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12 hover:bg-[#0B5A70]/10'}`
                    }`}
                  >
                    {publicFilterKeyword === kw ? '✓ ' : ''}#{kw}
                  </button>
                ))}
              </div>

              {publicLoading ? (
                <>
                  {/* SESSION 8: escape hatch — after 8s of skeletons,
                      tell the user something is wrong and give them
                      a way out. Reload picks up cached data OR
                      re-attempts Firestore with a fresh listener. */}
                  {publicLoadingStuck && (
                    <div className={`mb-4 rounded-2xl border p-4 flex items-center gap-3 ${darkMode ? 'bg-[#1e2e33] border-[#E65100]/30 text-amber-100' : 'bg-[#FFF8F0] border-[#E65100]/40 text-[#0B5A70]'}`}>
                      <div className="text-2xl flex-shrink-0">🐢</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold mb-0.5">Taking longer than usual…</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Your network may be slow, or Firestore is having a moment. Try reloading.
                        </p>
                      </div>
                      <button
                        onClick={() => window.location.reload()}
                        className={`flex-shrink-0 font-semibold px-4 py-2 rounded-xl text-sm ${darkMode ? 'bg-[#E65100] hover:bg-[#d64800] text-white' : 'bg-[#0B5A70] hover:bg-[#094a5d] text-white'}`}
                        aria-label="Reload the page"
                      >
                        ↻ Reload
                      </button>
                    </div>
                  )}
                  <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {[...Array(6)].map((_, i) => (
                    compactView ? (
                      <div
                        key={i}
                        className={`rounded-xl p-3 border flex items-center gap-3 animate-pulse ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15' : 'bg-[#FFFCF8] border-[#0B5A70]/8'}`}
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className={`h-3 rounded w-3/4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                          <div className={`h-2 rounded w-1/2 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}></div>
                        </div>
                        <div className={`h-6 w-10 rounded-full flex-shrink-0 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                      </div>
                    ) : (
                      <div
                        key={i}
                        className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-5 border animate-pulse ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15' : 'bg-[#FFFCF8] border-[#0B5A70]/8'}`}
                      >
                        <div className={`h-5 rounded w-3/4 mb-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                        <div className="flex gap-2 mb-3">
                          <div className={`h-5 w-16 rounded-full ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                          <div className={`h-5 w-14 rounded-full ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#E65100]/5'}`}></div>
                        </div>
                        <div className="space-y-2 mb-3">
                          <div className={`h-3 rounded ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-5/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-4/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                        </div>
                        <div className={`h-9 rounded-lg mt-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}></div>
                      </div>
                    )
                  ))}
                </div>
                </>
              ) : filteredPublicBhajans.length === 0 ? (
                <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-[#162226] border-[#0B5A70]/12' : 'bg-[#FFFCF8] border-[#0B5A70]/15'}`}>
                  {publicBhajans.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">🌐</div>
                      <h3 className="text-lg font-bold text-[#0B5A70] mb-2">Public library is empty</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {isAdmin ? 'Add bhajans via Admin Panel to get started!' : 'Bhajans will be added soon by the admin.'}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={openAdminPanel}
                          className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2"
                        >
                          🔧 Open Admin Panel
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-[#0B5A70] font-semibold">No bhajans match your filters</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex bg-[#0B5A70]/5 rounded-lg p-0.5 border border-[#0B5A70]/10">
                      <button
                        onClick={() => setCompactView(false)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${!compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/60 hover:text-[#0B5A70]'}`}
                        title="Full card view"
                        aria-label="Full card view"
                      >
                        ▤ Full
                      </button>
                      <button
                        onClick={() => setCompactView(true)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/60 hover:text-[#0B5A70]'}`}
                        title="Compact list view"
                        aria-label="Compact list view"
                      >
                        ☰ Compact
                      </button>
                    </div>
                  </div>

                <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {/* SESSION 6: PublicBhajanCard is React.memo + compact card
                      now uses sibling buttons instead of nested span/onClick */}
                  {filteredPublicBhajans.slice(0, publicVisibleCount).map((bhajan, pubCardIndex) => (
                    <PublicBhajanCard
                      key={bhajan.id}
                      bhajan={bhajan}
                      darkMode={darkMode}
                      compactView={compactView}
                      cardIndex={pubCardIndex}
                      isSaved={savedBhajanIds.has(bhajan.id)}
                      savingToLibrary={savingToLibrary}
                      onOpen={openPublicBhajanDetail}
                      onSave={saveToMyLibrary}
                    />
                  ))}
                </div>

                {publicVisibleCount < filteredPublicBhajans.length && (
                  <div ref={publicLoadMoreRef} className="text-center py-6">
                    <div className="inline-flex items-center gap-2 text-xs text-[#0B5A70]/60">
                      <div className="w-4 h-4 border-2 border-[#0B5A70]/40 border-t-transparent rounded-full animate-spin"></div>
                      Loading more bhajans...
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Showing {publicVisibleCount} of {filteredPublicBhajans.length}
                    </p>
                    <button
                      onClick={() => setPublicVisibleCount(prev => prev + PAGE_SIZE * 3)}
                      className={`mt-2 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${darkMode ? 'bg-[#0B5A70]/20 text-teal-300 hover:bg-[#0B5A70]/30' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    >
                      ↻ Load more
                    </button>
                  </div>
                )}
                {publicVisibleCount >= filteredPublicBhajans.length && filteredPublicBhajans.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-gray-400 py-6">
                    ✨ You've seen all {filteredPublicBhajans.length} bhajans
                  </p>
                )}
                </>
              )}
              <div className="text-center mt-12 mb-4">
                <p className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/70'}`}>
                  Founded for the Bhajan Community 🙏 by Grace of <strong>Babosa Bhagwan</strong> 🕉️
                </p>
                <button
                  onClick={() => {
                    setShowFeedbackModal(true);
                    setFeedbackText('');
                    setFeedbackError('');
                    setFeedbackSuccess(false);
                  }}
                  className={`text-xs underline hover:no-underline transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-[#0B5A70] hover:text-[#0B5A70]/80'}`}
                >
                  💬 Share feedback or suggestions
                </button>
                <div className={`flex items-center justify-center gap-3 mt-2 text-xs ${darkMode ? 'text-gray-600' : 'text-[#0B5A70]/50'}`}>
                  <a href="/privacy-policy.html" className="hover:underline">Privacy Policy</a>
                  <span>·</span>
                  <a href="/terms.html" className="hover:underline">Terms & Copyright</a>
                </div>
              </div>
            </>
          )}

          {/* ==============================================
              PUBLIC BHAJAN DETAIL VIEW
              ============================================== */}
          {currentView === 'public-bhajan-detail' && selectedPublicBhajan && (
            <div
              onTouchStart={publicSwipe.onTouchStart}
              onTouchEnd={publicSwipe.onTouchEnd}
            >
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentView('public-library')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Back
                </button>
                <div className="flex gap-1.5 flex-wrap">
                  {savedBhajanIds.has(selectedPublicBhajan.id) ? (
                    <span
                      className="bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full text-xs flex items-center gap-1"
                      title="Already in your library"
                    >
                      ✓ In Library
                    </span>
                  ) : (
                    <button
                      onClick={() => saveToMyLibrary(selectedPublicBhajan)}
                      disabled={savingToLibrary}
                      className="bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-2.5 py-1 rounded-full text-xs disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingToLibrary ? '...' : '💾 Save'}
                    </button>
                  )}

                  <button
                    onClick={() => handleShareBhajan(selectedPublicBhajan)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Share this bhajan"
                  >
                    ↗ Share
                  </button>

                  <button
                    onClick={() => setShowReadingSettings(true)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Reading view options"
                  >
                    👁️ View
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditPublicBhajan(selectedPublicBhajan)}
                        className="bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70] font-semibold px-2.5 py-1 rounded-full text-xs flex items-center gap-1"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deletePublicBhajan(selectedPublicBhajan)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-2.5 py-1 rounded-full text-xs flex items-center gap-1"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div
                key={selectedPublicBhajan.id}
                className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 mb-4 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'} ${slideDir === 'left' ? 'sk-slide-left' : slideDir === 'right' ? 'sk-slide-right' : ''}`}
              >
                <h1
                  className={`text-xl md:text-2xl font-bold mb-3 line-clamp-2 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}
                  title={selectedPublicBhajan.title}
                >
                  {selectedPublicBhajan.title}
                </h1>

                {selectedPublicBhajan.dhun && (
                  <div className={`border-l-4 border-[#E65100]/40 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                    <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedPublicBhajan.dhun}
                    </p>
                  </div>
                )}

                <div className={`border-t pt-4 ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                  <div className="flex items-center justify-end gap-1 mb-2">
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Decrease font size"
                      aria-label="Decrease font size"
                    >
                      Aa−
                    </button>
                    <span className={`text-xs w-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{readingSettings.fontSize}</span>
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.min(40, prev.fontSize + 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Increase font size"
                      aria-label="Increase font size"
                    >
                      Aa+
                    </button>
                  </div>
                  <pre
                    className={`whitespace-pre-wrap text-lg leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                    style={{
                      fontSize: `${readingSettings.fontSize}px`,
                      fontFamily: readingSettings.fontFamily,
                      lineHeight: readingSettings.lineHeight,
                      textAlign: readingSettings.textAlign
                    }}
                  >
                    {selectedPublicBhajan.lyrics}
                  </pre>
                </div>

                {selectedPublicBhajan.keywords && selectedPublicBhajan.keywords.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#0B5A70]/8">
                    <p className="text-xs text-gray-500 mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPublicBhajan.keywords.map(kw => (
                        <span key={kw} className="bg-[#0B5A70]/5 text-[#0B5A70]/70 px-3 py-1 rounded-full text-sm">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPublicBhajan.source && (
                  <div className="mt-4 pt-4 border-t border-[#0B5A70]/8">
                    <a
                      href={selectedPublicBhajan.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#0B5A70] hover:text-[#0B5A70]/80 text-sm font-semibold"
                    >
                      🔗 View Source
                    </a>
                  </div>
                )}
              </div>

              {/* Related Bhajans — SESSION 6: uses memoized relatedPublicBhajans */}
              {relatedPublicBhajans.length > 0 && (
                <div className="mt-6">
                  <p className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]'}`}>
                    ✨ Related Bhajans
                  </p>
                  <div className="space-y-1.5">
                    {relatedPublicBhajans.map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          openPublicBhajanDetail(b);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>{b.title}</p>
                          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {b.deity} · {b.category}
                            {b.matchedKws.length > 0 && (
                              <span className={darkMode ? 'text-orange-300/70' : 'text-[#E65100]/60'}> · {b.matchedKws.slice(0, 2).map(k => `#${k}`).join(' ')}</span>
                            )}
                          </p>
                        </div>
                        <span className={`text-lg flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/30'}`}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev / Next navigation — SESSION 6: uses memoized publicPrevNext */}
              {publicPrevNext && (
                <div className={`flex items-center justify-between mt-6 pt-4 border-t ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                  <button
                    onClick={() => navigateBhajan('prev', true)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all max-w-[45%] ${darkMode ? 'text-gray-300 hover:bg-[#1e2e33]' : 'text-[#0B5A70] hover:bg-[#0B5A70]/5'}`}
                    aria-label="Previous bhajan"
                  >
                    <span className="flex-shrink-0">‹</span>
                    <span className="truncate">{publicPrevNext.prev.title}</span>
                  </button>
                  <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {publicPrevNext.idx + 1}/{publicPrevNext.total}
                  </span>
                  <button
                    onClick={() => navigateBhajan('next', true)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all max-w-[45%] text-right ${darkMode ? 'text-gray-300 hover:bg-[#1e2e33]' : 'text-[#0B5A70] hover:bg-[#0B5A70]/5'}`}
                    aria-label="Next bhajan"
                  >
                    <span className="truncate">{publicPrevNext.next.title}</span>
                    <span className="flex-shrink-0">›</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==============================================
              ADMIN PANEL VIEW — unchanged structurally from S4,
              alert()/confirm() calls now route through toast/dialog
              ============================================== */}
          {currentView === 'admin-panel' && isAdmin && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView('public-library')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Back
                </button>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                  👑 Admin Only
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#0B5A70]">🔧 Admin Panel</h2>
                <p className="text-sm text-[#0B5A70]/70">Manage the Public Library</p>
              </div>

              <div className="bg-[#0B5A70] rounded-2xl p-6 text-white mb-6">
                <h3 className="text-lg font-bold mb-3">📊 Public Library Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold">{publicBhajans.length}</div>
                    <div className="text-xs">Total Bhajans</div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold">
                      {publicBhajans.reduce((sum, b) => sum + (b.saveCount || 0), 0)}
                    </div>
                    <div className="text-xs">Total Saves</div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold">
                      {new Set(publicBhajans.map(b => b.deity)).size}
                    </div>
                    <div className="text-xs">Deities</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-green-200/60">
                <h3 className="text-lg font-bold text-[#0B5A70] mb-3">➕ Add Bhajan Manually</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add a single bhajan to the Public Library using a form.
                </p>
                <button
                  onClick={openAddPublicBhajan}
                  className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  + Add New Public Bhajan
                </button>
              </div>

              {/* MANAGE LISTS */}
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-indigo-200/60">
                <h3 className="text-lg font-bold text-[#0B5A70] mb-2">📋 Manage Lists</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add, rename, or delete deities, categories, and keywords. Changes apply to all users.
                </p>

                {configLoading && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    ⏳ Loading lists...
                  </div>
                )}

                {/* Deities */}
                <div className="mb-6">
                  <h4 className="font-semibold text-[#0B5A70] mb-2">🕉️ Deities ({customDeities.length || DEITY_OPTIONS.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(customDeities.length > 0 ? customDeities : DEITY_OPTIONS.map(d => d.value)).map(name => (
                      editingItem?.type === 'deity' && editingItem?.value === name ? (
                        <div key={name} className="inline-flex items-center gap-1 bg-[#E65100]/8 border border-[#E65100]/25 rounded-full px-2 py-0.5">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') editConfigItem('deity', name, editingValue);
                              if (e.key === 'Escape') { setEditingItem(null); setEditingValue(''); }
                            }}
                            autoFocus
                            className="bg-transparent outline-none text-xs font-medium w-24 min-w-24"
                          />
                          <button
                            onClick={() => editConfigItem('deity', name, editingValue)}
                            className="text-green-600 hover:text-green-800 text-xs font-bold"
                            title="Save (Enter)"
                            aria-label="Save rename"
                          >✓</button>
                          <button
                            onClick={() => { setEditingItem(null); setEditingValue(''); }}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                            title="Cancel (Esc)"
                            aria-label="Cancel rename"
                          >×</button>
                        </div>
                      ) : (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors"
                        >
                          {name}
                          <button
                            onClick={() => { setEditingItem({ type: 'deity', value: name }); setEditingValue(name); }}
                            className="ml-1 text-[#0B5A70] hover:text-[#0B5A70]/80 text-[10px]"
                            title="Rename"
                            aria-label={`Rename ${name}`}
                          >✏️</button>
                          <button
                            onClick={() => deleteConfigItem('deity', name)}
                            className="ml-0.5 text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
                            aria-label={`Delete ${name}`}
                          >×</button>
                        </span>
                      )
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemInput.deity}
                      onChange={(e) => setNewItemInput({...newItemInput, deity: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && addConfigItem('deity', newItemInput.deity)}
                      placeholder="Add new deity (e.g., Radha Rani)"
                      className="flex-1 px-3 py-2 border border-[#0B5A70]/15 rounded-lg text-sm outline-none focus:border-[#0B5A70]/30"
                    />
                    <button
                      onClick={() => addConfigItem('deity', newItemInput.deity)}
                      disabled={!newItemInput.deity.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h4 className="font-semibold text-[#0B5A70] mb-2">📖 Categories ({customCategories.length || CATEGORY_OPTIONS.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(customCategories.length > 0 ? customCategories : CATEGORY_OPTIONS).map(name => (
                      editingItem?.type === 'category' && editingItem?.value === name ? (
                        <div key={name} className="inline-flex items-center gap-1 bg-[#E65100]/8 border border-[#E65100]/25 rounded-full px-2 py-0.5">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') editConfigItem('category', name, editingValue);
                              if (e.key === 'Escape') { setEditingItem(null); setEditingValue(''); }
                            }}
                            autoFocus
                            className="bg-transparent outline-none text-xs font-medium w-24 min-w-24"
                          />
                          <button
                            onClick={() => editConfigItem('category', name, editingValue)}
                            className="text-green-600 hover:text-green-800 text-xs font-bold"
                            aria-label="Save rename"
                          >✓</button>
                          <button
                            onClick={() => { setEditingItem(null); setEditingValue(''); }}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                            aria-label="Cancel rename"
                          >×</button>
                        </div>
                      ) : (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors"
                        >
                          {name}
                          <button
                            onClick={() => { setEditingItem({ type: 'category', value: name }); setEditingValue(name); }}
                            className="ml-1 text-[#0B5A70] hover:text-[#0B5A70]/80 text-[10px]"
                            title="Rename"
                            aria-label={`Rename ${name}`}
                          >✏️</button>
                          <button
                            onClick={() => deleteConfigItem('category', name)}
                            className="ml-0.5 text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
                            aria-label={`Delete ${name}`}
                          >×</button>
                        </span>
                      )
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemInput.category}
                      onChange={(e) => setNewItemInput({...newItemInput, category: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && addConfigItem('category', newItemInput.category)}
                      placeholder="Add new category (e.g., Kirtan)"
                      className="flex-1 px-3 py-2 border border-[#0B5A70]/15 rounded-lg text-sm outline-none focus:border-[#0B5A70]/30"
                    />
                    <button
                      onClick={() => addConfigItem('category', newItemInput.category)}
                      disabled={!newItemInput.category.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <h4 className="font-semibold text-[#0B5A70] mb-2">🏷️ Keywords ({customKeywords.length || DEFAULT_KEYWORDS.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(customKeywords.length > 0 ? customKeywords : DEFAULT_KEYWORDS).map(name => (
                      editingItem?.type === 'keyword' && editingItem?.value === name ? (
                        <div key={name} className="inline-flex items-center gap-1 bg-[#E65100]/8 border border-[#E65100]/25 rounded-full px-2 py-0.5">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') editConfigItem('keyword', name, editingValue);
                              if (e.key === 'Escape') { setEditingItem(null); setEditingValue(''); }
                            }}
                            autoFocus
                            className="bg-transparent outline-none text-xs font-medium w-24 min-w-24"
                          />
                          <button
                            onClick={() => editConfigItem('keyword', name, editingValue)}
                            className="text-green-600 hover:text-green-800 text-xs font-bold"
                            aria-label="Save rename"
                          >✓</button>
                          <button
                            onClick={() => { setEditingItem(null); setEditingValue(''); }}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                            aria-label="Cancel rename"
                          >×</button>
                        </div>
                      ) : (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors"
                        >
                          #{name}
                          <button
                            onClick={() => { setEditingItem({ type: 'keyword', value: name }); setEditingValue(name); }}
                            className="ml-1 text-[#0B5A70] hover:text-[#0B5A70]/80 text-[10px]"
                            title="Rename"
                            aria-label={`Rename ${name}`}
                          >✏️</button>
                          <button
                            onClick={() => deleteConfigItem('keyword', name)}
                            className="ml-0.5 text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
                            aria-label={`Delete ${name}`}
                          >×</button>
                        </span>
                      )
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemInput.keyword}
                      onChange={(e) => setNewItemInput({...newItemInput, keyword: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                      onKeyDown={(e) => e.key === 'Enter' && addConfigItem('keyword', newItemInput.keyword)}
                      placeholder="Add new keyword (e.g., aarti)"
                      className="flex-1 px-3 py-2 border border-[#0B5A70]/15 rounded-lg text-sm outline-none focus:border-[#0B5A70]/30"
                    />
                    <button
                      onClick={() => addConfigItem('keyword', newItemInput.keyword)}
                      disabled={!newItemInput.keyword.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#0B5A70]/5 rounded-lg text-xs text-[#0B5A70]">
                  💡 Click <strong>✏️</strong> to rename, <strong>×</strong> to delete.<br/>
                  Items in use by bhajans <strong>cannot be renamed or deleted</strong> - update those bhajans first.
                </div>
              </div>

              {/* USER FEEDBACK CARD */}
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-[#0B5A70]/12">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-[#0B5A70]">💬 User Feedback</h3>
                  <button
                    onClick={loadFeedbackList}
                    disabled={feedbackListLoading}
                    className="bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70] font-semibold px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                  >
                    {feedbackListLoading ? '⏳ Loading...' : '🔄 Refresh'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  View feedback from your users to improve the app.
                </p>

                {feedbackList.length === 0 && !feedbackListLoading && (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    <div className="text-3xl mb-2">📭</div>
                    <p>No feedback yet. Click "Refresh" to check.</p>
                  </div>
                )}

                {feedbackList.length > 0 && (
                  <>
                    <div className="text-sm text-[#0B5A70] font-semibold mb-3">
                      📊 Total: {feedbackList.length} feedback item{feedbackList.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {feedbackList.map((fb) => (
                        <div key={fb.id} className="bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-[#0B5A70] text-sm">
                                {fb.userName || 'Anonymous'}
                              </p>
                              {fb.userEmail && (
                                <p className="text-xs text-gray-600">{fb.userEmail}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-0.5">
                                {fb.createdAt?.seconds
                                  ? new Date(fb.createdAt.seconds * 1000).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Just now'
                                }
                              </p>
                            </div>
                            <button
                              onClick={() => deleteFeedback(fb.id)}
                              className="text-red-500 hover:text-red-700 text-sm p-1"
                              title="Delete"
                              aria-label="Delete feedback"
                            >
                              🗑️
                            </button>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap text-sm mt-2 bg-white rounded-lg p-3 border border-[#0B5A70]/10">
                            {fb.text}
                          </p>
                          {fb.userEmail && (
                            <a
                              href={`mailto:${fb.userEmail}?subject=Re: Your Sankirtan Feedback&body=Hi ${fb.userName},%0D%0A%0D%0AThank you for your feedback!%0D%0A%0D%0A`}
                              className="inline-block mt-2 text-xs text-[#0B5A70] hover:text-[#0B5A70]/80 font-semibold"
                            >
                              ✉️ Reply via email
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* JSON Import Section */}
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-purple-200/60">
                <h3 className="text-lg font-bold text-[#0B5A70] mb-3">📥 Import Bhajans from JSON</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Paste JSON exported from your personal Babosa Sankirtan app. Bhajans will be added to the Public Library.
                </p>

                {!importPreview ? (
                  <>
                    <textarea
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      className="w-full h-40 px-4 py-3 border border-purple-200/40 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none font-mono text-sm"
                      placeholder='Paste JSON here... e.g., [{"title": "...", "lyrics": "..."}, ...]'
                    />

                    {importError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        ⚠️ {importError}
                      </div>
                    )}

                    {importSuccess && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        {importSuccess}
                      </div>
                    )}

                    <button
                      onClick={previewImport}
                      disabled={!importJsonText.trim()}
                      className="mt-3 w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                    >
                      Preview Import
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-purple-50/50 border border-purple-200/60 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-[#0B5A70] mb-2">Ready to import:</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div>
                          <div className="text-2xl font-bold text-purple-700">{importPreview.total}</div>
                          <div className="text-xs text-purple-600">Total in JSON</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{importPreview.valid}</div>
                          <div className="text-xs text-purple-600">Will Import</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{importPreview.skipped}</div>
                          <div className="text-xs text-purple-600">Skipped (invalid)</div>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-xl p-3 mb-4">
                      <p className="text-xs text-gray-500 mb-2">Preview (first 10):</p>
                      {importPreview.bhajans.slice(0, 10).map((b, idx) => (
                        <div key={idx} className="mb-2 p-2 bg-white rounded-lg text-sm border border-gray-200">
                          <p className="font-semibold text-[#0B5A70] truncate">{b.title}</p>
                          <p className="text-xs text-gray-600">
                            {b.deity} • {b.category}
                          </p>
                        </div>
                      ))}
                      {importPreview.bhajans.length > 10 && (
                        <p className="text-xs text-gray-500 text-center mt-2">
                          ...and {importPreview.bhajans.length - 10} more
                        </p>
                      )}
                    </div>

                    {importing && importProgress.total > 0 && (
                      <div className="mb-4 p-3 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-lg">
                        <p className="text-sm text-[#0B5A70] font-semibold">
                          {importProgress.message}
                        </p>
                        <div className="mt-2 bg-[#0B5A70]/15 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-[#0B5A70] h-full transition-all"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-[#0B5A70] mt-1">
                          {importProgress.current} of {importProgress.total}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={executeImport}
                        disabled={importing}
                        className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
                      >
                        {importing ? 'Importing...' : `✅ Import ${importPreview.valid} Bhajans`}
                      </button>
                      <button
                        onClick={() => {
                          setImportPreview(null);
                          setImportJsonText('');
                        }}
                        disabled={importing}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-xl p-4">
                <h4 className="font-bold text-[#0B5A70] mb-2">💡 JSON Format Support:</h4>
                <p className="text-xs text-[#0B5A70]/80 mb-2">The importer accepts:</p>
                <ul className="text-xs text-[#0B5A70]/80 space-y-1 ml-4">
                  <li>• Array of bhajans: <code className="bg-white px-1 rounded">[{`{"title": "...", "lyrics": "..."}`}]</code></li>
                  <li>• Object with bhajans property</li>
                  <li>• Fields: title, lyrics, deity, category, dhun, scale, keywords, source</li>
                  <li>• Automatically maps common field variations</li>
                </ul>
              </div>
            </>
          )}
        </main>

        {/* ==============================================
            PUBLIC BHAJAN ADD/EDIT MODAL (Admin only)
            ============================================== */}
        {showPublicBhajanForm && isAdmin && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-[#0B5A70]/10 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <h3 className="text-lg font-bold text-[#0B5A70]">
                  {editingPublicBhajan ? '✏️ Edit Public Bhajan' : '➕ Add Public Bhajan'}
                </h3>
                <button
                  onClick={() => {
                    setShowPublicBhajanForm(false);
                    setEditingPublicBhajan(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  aria-label="Close form"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="public-hindi-input-title"
                      type="text"
                      value={publicBhajanForm.title}
                      onChange={(e) => handlePublicHindiInput(e, 'title')}
                      onKeyDown={(e) => handlePublicHindiKeyDown(e, 'title')}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      onFocus={() => setActiveTypingField('title')}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-lg"
                      placeholder={hindiTypingEnabled ? "Type: om jai jagdish hare" : "e.g., ॐ जय जगदीश हरे"}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'title' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center z-30">
                        <span className="text-xs text-gray-500 mr-1">
                          <strong>"{currentWord}"</strong> →
                        </span>
                        {transliterationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyPublicSuggestion(suggestion, 'title');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              applyPublicSuggestion(suggestion, 'title');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              idx === 0
                                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md'
                                : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyPublicSuggestion(currentWord, 'title');
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            applyPublicSuggestion(currentWord, 'title');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
                          title="Keep as English"
                        >
                          {currentWord}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deity and Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">Deity</label>
                    <select
                      value={publicBhajanForm.deity}
                      onChange={(e) => setPublicBhajanForm({...publicBhajanForm, deity: e.target.value})}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none bg-[#FFFCF8]"
                    >
                      {allDeityOptions.map(d => (
                        <option key={d.value} value={d.value}>{d.value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">Category</label>
                    <select
                      value={publicBhajanForm.category}
                      onChange={(e) => setPublicBhajanForm({...publicBhajanForm, category: e.target.value})}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none bg-[#FFFCF8]"
                    >
                      {allCategoryOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dhun */}
                <div>
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                    तर्ज़ / धुन (Tune)
                  </label>
                  <div className="relative">
                    <input
                      id="public-hindi-input-dhun"
                      type="text"
                      value={publicBhajanForm.dhun}
                      onChange={(e) => handlePublicHindiInput(e, 'dhun')}
                      onKeyDown={(e) => handlePublicHindiKeyDown(e, 'dhun')}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      onFocus={() => setActiveTypingField('dhun')}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none"
                      placeholder={hindiTypingEnabled ? "Type in English, press space" : "e.g., तर्ज़: तुझे देखा तो..."}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'dhun' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center z-30">
                        <span className="text-xs text-gray-500 mr-1">
                          <strong>"{currentWord}"</strong> →
                        </span>
                        {transliterationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyPublicSuggestion(suggestion, 'dhun');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              applyPublicSuggestion(suggestion, 'dhun');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              idx === 0
                                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md'
                                : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyPublicSuggestion(currentWord, 'dhun');
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            applyPublicSuggestion(currentWord, 'dhun');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
                          title="Keep as English"
                        >
                          {currentWord}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">Scale / Raag</label>
                  <input
                    type="text"
                    value={publicBhajanForm.scale}
                    onChange={(e) => setPublicBhajanForm({...publicBhajanForm, scale: e.target.value})}
                    className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none"
                    placeholder="e.g., Raag Yaman, C# Scale"
                  />
                </div>

                {/* OCR import block (public form) */}
                <div className="mb-3 p-3 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-xl">
                  <p className="text-xs font-semibold text-[#0B5A70] mb-2">
                    📥 Auto-fill lyrics from a photo, PDF, or camera — text is read on your device, nothing is uploaded or stored as a file
                  </p>

                  {!localStorage.getItem('sankirtan-tesseract-langs-cached') && !ocrProcessing && (
                    <div className="mb-2 p-2 bg-[#E65100]/5 border border-[#E65100]/20 rounded-lg text-xs text-[#0B5A70]">
                      ⚠️ <strong>First-time use:</strong> The OCR engine (~15 MB) will download once and be cached. Please use WiFi if possible.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={ocrProcessing}
                      onClick={() => publicCameraInputRef.current && publicCameraInputRef.current.click()}
                      className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      📷 Camera
                    </button>
                    <button
                      type="button"
                      disabled={ocrProcessing}
                      onClick={() => publicImageInputRef.current && publicImageInputRef.current.click()}
                      className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      🖼️ Upload Image
                    </button>
                    <button
                      type="button"
                      disabled={ocrProcessing}
                      onClick={() => publicPdfInputRef.current && publicPdfInputRef.current.click()}
                      className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      📄 Upload PDF
                    </button>
                  </div>

                  <input
                    ref={publicCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) handleImageFileForOcr(f, 'photo', setPublicBhajanForm);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={publicImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) handleImageFileForOcr(f, 'image', setPublicBhajanForm);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={publicPdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) handlePdfFileForOcr(f, setPublicBhajanForm);
                      e.target.value = '';
                    }}
                  />

                  {ocrProcessing && (
                    <div className="mt-3 p-3 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg">
                      <div className="w-full bg-[#0B5A70]/10 rounded-full h-3 mb-2">
                        <div
                          className="bg-[#0B5A70] h-3 rounded-full transition-all"
                          style={{ width: ocrProgress + '%' }}
                        ></div>
                      </div>
                      <p className="text-xs font-semibold text-[#0B5A70]">{ocrMessage || 'Processing...'}</p>
                      {!localStorage.getItem('sankirtan-tesseract-langs-cached') && (
                        <p className="text-[10px] text-[#0B5A70]/80 mt-1">
                          💡 First-time setup takes 30-60 seconds. Future uses will be instant.
                        </p>
                      )}
                    </div>
                  )}
                  {!ocrProcessing && ocrMessage && (
                    <p className="text-xs font-semibold text-[#0B5A70] mt-2">{ocrMessage}</p>
                  )}
                  <p className="text-xs text-[#0B5A70]/80 mt-2">
                    💡 Works best with clear, printed Hindi/English text. Handwriting may need manual correction. Scanned PDFs supported (up to 10 pages).
                  </p>
                </div>

                {/* Lyrics */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-[#0B5A70]">
                      Lyrics <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setHindiTypingEnabled(!hindiTypingEnabled)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                        hindiTypingEnabled
                          ? 'bg-[#0B5A70] text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                      title={hindiTypingEnabled ? 'Turn off Hindi typing' : 'Turn on Hindi typing'}
                    >
                      {hindiTypingEnabled ? '🇮🇳 हिंदी ON' : '🔤 Hindi OFF'}
                    </button>
                  </div>
                  {hindiTypingEnabled && (
                    <div className="mb-2 p-2 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-lg">
                      <p className="text-xs text-[#E65100]">
                        ✨ Type in English, press <kbd className="bg-white px-1.5 py-0.5 rounded border text-xs">space</kbd> to auto-convert to Hindi
                      </p>
                      <p className="text-xs text-[#0B5A70]/60 mt-1">
                        Example: <code className="bg-white px-1 rounded">jai shri babosa</code> → जय श्री बाबोसा
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <textarea
                      id="public-hindi-input-lyrics"
                      value={publicBhajanForm.lyrics}
                      onChange={(e) => handlePublicHindiInput(e, 'lyrics')}
                      onKeyDown={(e) => handlePublicHindiKeyDown(e, 'lyrics')}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      onFocus={() => setActiveTypingField('lyrics')}
                      rows={10}
                      className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none font-mono text-base"
                      placeholder={hindiTypingEnabled ? "Type: jai shri babosa (press space to convert)" : "भजन के बोल यहाँ लिखें..."}
                      style={{ lineHeight: '1.8' }}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'lyrics' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-xl shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center z-30">
                        <span className="text-xs text-gray-500 mr-1">
                          <strong>"{currentWord}"</strong> →
                        </span>
                        {transliterationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyPublicSuggestion(suggestion, 'lyrics');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              applyPublicSuggestion(suggestion, 'lyrics');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              idx === 0
                                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md'
                                : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'
                            }`}
                            title={idx === 0 ? 'Default (press space)' : `Alternative ${idx + 1}`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyPublicSuggestion(currentWord, 'lyrics');
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            applyPublicSuggestion(currentWord, 'lyrics');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
                          title="Keep as English"
                        >
                          {currentWord}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-2">Keywords</label>
                  <div className="flex flex-wrap gap-2">
                    {allKeywordOptions.map(kw => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => togglePublicBhajanKeyword(kw)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          publicBhajanForm.keywords.includes(kw)
                            ? 'bg-[#0B5A70] text-white shadow-md'
                            : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12 hover:bg-[#0B5A70]/10'
                        }`}
                      >
                        {publicBhajanForm.keywords.includes(kw) ? '✓ ' : ''}#{kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-semibold text-[#0B5A70] mb-1">Source URL (optional)</label>
                  <input
                    type="url"
                    value={publicBhajanForm.source}
                    onChange={(e) => setPublicBhajanForm({...publicBhajanForm, source: e.target.value})}
                    className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none"
                    placeholder="https://youtube.com/... or reference URL"
                  />
                </div>

                {publicBhajanFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {publicBhajanFormError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={savePublicBhajan}
                    disabled={publicBhajanFormSaving || !publicBhajanForm.title.trim() || !publicBhajanForm.lyrics.trim()}
                    className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
                  >
                    {publicBhajanFormSaving ? 'Saving...' : (editingPublicBhajan ? '💾 Save Changes' : '➕ Add Bhajan')}
                  </button>
                  <button
                    onClick={() => {
                      setShowPublicBhajanForm(false);
                      setEditingPublicBhajan(null);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================
            BOTTOM TAB BAR (SESSION 5 — NEW)
            One-handed navigation between the three main views.
            Only shows on list views (public-library / library /
            programs); hidden on detail, form, admin & live views.
            Guest users see a lock hint on My Library & Programs
            and are routed to sign-in when they tap them.
            ============================================== */}
        {showTabBar && (
          <nav
            className={`fixed bottom-0 left-0 right-0 z-40 border-t ${
              darkMode
                ? 'bg-[#0f1a1c]/95 backdrop-blur-md border-[#0B5A70]/20'
                : 'bg-[#FFF8F0]/95 backdrop-blur-md border-[#0B5A70]/10 shadow-[0_-2px_12px_rgba(11,90,112,0.06)]'
            }`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Main navigation"
          >
            <div className="max-w-6xl mx-auto flex items-stretch">
              {[
                { view: 'public-library', label: 'Public', icon: '🌐', requiresAuth: false },
                { view: 'library', label: 'My Library', icon: '📚', requiresAuth: true },
                { view: 'programs', label: 'Programs', icon: '🎵', requiresAuth: true },
              ].map(tab => {
                const isActive = currentView === tab.view;
                const isLocked = tab.requiresAuth && guestMode && !user;
                return (
                  <button
                    key={tab.view}
                    onClick={() => {
                      if (isLocked) {
                        // SESSION 6: explain WHY the screen is about to change,
                        // instead of silently dumping the user on the sign-in page.
                        showToast('Sign in to build your personal library', 'error');
                        setGuestMode(false);
                        setLoading(false);
                        return;
                      }
                      if (!isActive) setCurrentView(tab.view);
                      else window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${
                      isActive
                        ? darkMode ? 'text-[#E65100]' : 'text-[#0B5A70]'
                        : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-[#0B5A70]/50 hover:text-[#0B5A70]/80'
                    }`}
                    aria-label={isLocked ? `${tab.label} (sign in required)` : tab.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full ${darkMode ? 'bg-[#E65100]' : 'bg-[#0B5A70]'}`}></span>
                    )}
                    <span className="text-xl leading-none">
                      {isLocked ? '🔒' : tab.icon}
                    </span>
                    <span className={`text-[10px] font-semibold ${isActive ? '' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                    {/* Badge: count on My Library / Programs */}
                    {!isLocked && tab.view === 'library' && bhajans.length > 0 && (
                      <span className={`absolute top-1 right-[calc(50%-24px)] text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                        isActive
                          ? 'bg-[#0B5A70] text-white'
                          : darkMode ? 'bg-[#1e2e33] text-gray-400' : 'bg-[#0B5A70]/10 text-[#0B5A70]/70'
                      }`}>
                        {bhajans.length > 99 ? '99+' : bhajans.length}
                      </span>
                    )}
                    {!isLocked && tab.view === 'programs' && programs.length > 0 && (
                      <span className={`absolute top-1 right-[calc(50%-24px)] text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                        isActive
                          ? 'bg-[#0B5A70] text-white'
                          : darkMode ? 'bg-[#1e2e33] text-gray-400' : 'bg-[#0B5A70]/10 text-[#0B5A70]/70'
                      }`}>
                        {programs.length > 99 ? '99+' : programs.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Scroll-to-top floating button — lifted above the tab bar */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`fixed right-6 z-40 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all ${
              showTabBar ? 'bottom-20' : 'bottom-6'
            } ${
              darkMode
                ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d]'
                : 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-[0_4px_12px_rgba(11,90,112,0.3)]'
            }`}
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            ↑
          </button>
        )}
      </div>
    );
  }

  // ==============================================
  // LANDING / SIGN-IN SCREEN
  // ==============================================
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      {confirmDialogJsx}
      {toastJsx}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-center text-sm font-semibold z-50 shadow-md">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            ⚠️ You're offline. Please check your internet connection.
          </span>
        </div>
      )}
      {showUpdatePrompt && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full overflow-hidden">
            <div className="bg-[#0B5A70] p-6 text-white text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-2xl font-bold">App Updated!</h3>
              <p className="text-sm text-white/80 mt-1">Sankirtan just got better</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                A new version of Sankirtan has been deployed. Here is what is new:
              </p>
              <ul className="text-sm text-gray-700 space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#0B5A70] font-bold">✓</span>
                  <span>New bottom tab bar — switch between Public, My Library & Programs with one tap</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0B5A70] font-bold">✓</span>
                  <span>Hindi typing is now faster (smarter caching)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0B5A70] font-bold">✓</span>
                  <span>Faster app opening & smoother confirmations</span>
                </li>
              </ul>
              <button
                onClick={dismissUpdatePrompt}
                className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg"
              >
                Awesome, let us go! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.12)] overflow-hidden border border-[#0B5A70]/8">
          <div className="bg-[#FFF8F0] p-8 text-center border-b border-[#0B5A70]/10">
            <SankirtanWordmark className="h-14 sm:h-16 w-auto mx-auto" />
            <p className="text-sm text-[#0B5A70] mt-3" style={{ fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif" }}>
              भजन से भगवान तक
            </p>
            <div className="mt-4 pt-4 border-t border-[#0B5A70]/15">
              <p className="text-xs text-[#0B5A70]/70 leading-relaxed">
                The devotional music platform for<br/>
                <strong className="text-[#0B5A70]">singers, artists & devotees</strong>
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-[#FFFCF8]">
            {!showPhoneLogin ? (
              <>
                <button
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="w-full bg-white border-2 border-[#0B5A70]/20 hover:border-[#E65100]/50 hover:bg-[#FFF8F0] transition-all flex items-center justify-center gap-3 py-4 px-4 rounded-xl font-bold text-gray-700 disabled:opacity-50 text-base shadow-sm"
                >
                  <svg className="w-6 h-6" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {authLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>

                <p className="text-[11px] text-[#0B5A70]/50 text-center">One tap sign-in — no passwords needed</p>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-[#0B5A70]/15"></div>
                  <span className="text-[10px] text-[#0B5A70]/50 uppercase tracking-wider font-semibold">or</span>
                  <div className="flex-1 border-t border-[#0B5A70]/15"></div>
                </div>

                <button
                  onClick={() => {
                    setGuestMode(true);
                    setLoading(false);
                    setSplashVisible(false);
                    setCurrentView('public-library');
                  }}
                  className="w-full bg-transparent border border-[#0B5A70]/15 hover:border-[#0B5A70]/30 hover:bg-[#0B5A70]/5 transition-all py-3 px-4 rounded-xl font-semibold text-[#0B5A70]/70 text-sm"
                >
                  Browse Public Library as Guest →
                </button>

                {false && (
                  <button
                    onClick={() => setShowPhoneLogin(true)}
                    className="w-full bg-[#E65100] hover:bg-[#B84418] text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    📱 Continue with Phone
                  </button>
                )}

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    ⚠️ {authError}
                  </div>
                )}

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 border-t border-[#0B5A70]/15"></div>
                  <span className="text-[10px] text-[#0B5A70]/50 uppercase tracking-wider font-semibold">What you'll do</span>
                  <div className="flex-1 border-t border-[#0B5A70]/15"></div>
                </div>

                <div className="text-center text-xs text-[#0B5A70]/80 space-y-1.5">
                  <p>🎵 Sing your favourites, anywhere</p>
                  <p>🔍 Find any bhajan instantly</p>
                  <p>🎤 Perform live with confidence</p>
                </div>

                <p className="text-[11px] text-[#0B5A70]/50 text-center mt-4">
                  By signing up, you agree to our<br/>
                  Terms of Service & Privacy Policy
                </p>
              </>
            ) : (
              <>
                {!otpSent ? (
                  <>
                    <button
                      onClick={() => {
                        setShowPhoneLogin(false);
                        setAuthError('');
                      }}
                      className="text-[#E65100] text-sm mb-2 flex items-center gap-1"
                    >
                      ← Back
                    </button>

                    <h3 className="text-lg font-bold text-[#0B5A70] text-center">
                      📱 Sign in with Phone
                    </h3>

                    <div>
                      <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                        placeholder="+91 98765 43210"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Include country code (e.g., +91 for India)
                      </p>
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                        ⚠️ {authError}
                      </div>
                    )}

                    <button
                      onClick={handleSendOtp}
                      disabled={authLoading || !phoneNumber}
                      className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                    >
                      {authLoading ? 'Sending...' : 'Send OTP'}
                    </button>

                    <div id="recaptcha-container"></div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setAuthError('');
                      }}
                      className="text-[#E65100] text-sm mb-2 flex items-center gap-1"
                    >
                      ← Change number
                    </button>

                    <h3 className="text-lg font-bold text-[#0B5A70] text-center">
                      🔐 Enter OTP
                    </h3>
                    <p className="text-center text-sm text-gray-600">
                      Sent to {phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`}
                    </p>

                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-center text-2xl tracking-widest"
                        placeholder="123456"
                        autoFocus
                      />
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                        ⚠️ {authError}
                      </div>
                    )}

                    <button
                      onClick={handleVerifyOtp}
                      disabled={authLoading || otpCode.length !== 6}
                      className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                    >
                      {authLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </>
                )}
              </>
            )}

            {/* SESSION 7: "N devotees joined" counter removed —
                see fetchUserCount deletion note above. */}
          </div>
        </div>

        <div className="text-center mt-4 text-[#0B5A70]/60 text-xs">
          <p>Founded for the Bhajan Community</p>
          <p className="mt-1">🎵 by Grace of <strong className="text-[#0B5A70]">Babosa Bhagwan</strong> 🎵</p>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// ERROR BOUNDARY
// ==============================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 App crashed:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReload = () => {
    try {
      localStorage.removeItem('sankirtan-tesseract-langs-cached');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error && this.state.error.message
        ? this.state.error.message
        : 'Unknown error';

      return (
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full p-8 text-center border border-[#0B5A70]/10">
            <div className="text-6xl mb-4">🙏</div>
            <h1 className="text-2xl font-bold text-[#0B5A70] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              We're sorry — Sankirtan encountered an unexpected issue.
              Your data is safe.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs font-semibold text-red-900 mb-1">Error details:</p>
              <p className="text-xs text-red-800 font-mono break-all">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-3 rounded-xl shadow-md"
              >
                🔄 Try Again
              </button>
              <button
                onClick={this.handleHardReload}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl"
              >
                🧹 Reload App (clears cache)
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              If this keeps happening, please share feedback so we can fix it.
            </p>

            <p className="text-xs text-[#0B5A70]/60 mt-4">
              🕉️ बाबोसा जी की कृपा से यह जल्दी ठीक होगा
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
