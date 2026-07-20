import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ==============================================
// SANKIRTAN SAAS - SESSION 3
// Bhajan Se Bhagwan Tak
// Multi-user platform with Google + Phone Auth
// CHANGES:
// 1. Home screen after login = Public Library (was Dashboard),
//    with a Public ↔ My Library switcher on both library views.
// 2. "Create Program" + "My Programs" available inside My Library.
// 3. Onboarding tour auto-plays ONLY on the very first login
//    (flag stored in Firestore profile + localStorage). Replay it
//    anytime via the ⓘ button in the header.
// 4. Add bhajans from Image / PDF / Camera: on-device OCR
//    (Tesseract.js + pdf.js via CDN) extracts lyrics text into the
//    Add/Edit form. No files are uploaded - only text is saved to
//    Firestore, so it works fully within the free Spark plan.
// ==============================================

// ==============================================
// SANKIRTAN WORDMARK COMPONENT
// ==============================================
// Sankirtan wordmark - text converted to SVG paths (Poppins Bold).
// Renders identically on every device with no font dependency.
// Tight viewBox for use in header (no tagline - shown on splash/login).
const SankirtanWordmark = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 1089 305"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Sankirtan"
  >
    <title>Sankirtan</title>
    <g transform="translate(15.00 220.00) scale(0.200000 -0.200000)"><path d="M32 183H201Q204 154 228.0 136.0Q252 118 287 118Q319 118 336.5 130.5Q354 143 354 163Q354 187 329.0 198.5Q304 210 248 224Q188 238 148.0 253.5Q108 269 79.0 302.5Q50 336 50 393Q50 441 76.5 480.5Q103 520 154.5 543.0Q206 566 277 566Q382 566 442.5 514.0Q503 462 512 376H354Q350 405 328.5 422.0Q307 439 272 439Q242 439 226.0 427.5Q210 416 210 396Q210 372 235.5 360.0Q261 348 315 336Q377 320 416.0 304.5Q455 289 484.5 254.5Q514 220 515 162Q515 113 487.5 74.5Q460 36 408.5 14.0Q357 -8 289 -8Q216 -8 159.0 17.0Q102 42 69.0 85.5Q36 129 32 183Z" fill="#E65100"/></g>
    <g transform="translate(126.60 220.00) scale(0.200000 -0.200000)"><path d="M274 566Q333 566 377.5 542.0Q422 518 446 479V558H617V0H446V79Q421 40 376.5 16.0Q332 -8 273 -8Q205 -8 149.0 27.5Q93 63 60.5 128.5Q28 194 28 280Q28 366 60.5 431.0Q93 496 149.0 531.0Q205 566 274 566ZM324 417Q273 417 237.5 380.5Q202 344 202 280Q202 216 237.5 178.5Q273 141 324 141Q375 141 410.5 178.0Q446 215 446 279Q446 343 410.5 380.0Q375 417 324 417Z" fill="#E65100"/></g>
    <g transform="translate(262.40 220.00) scale(0.200000 -0.200000)"><path d="M617 326V0H447V303Q447 359 418.0 390.0Q389 421 340 421Q291 421 262.0 390.0Q233 359 233 303V0H62V558H233V484Q259 521 303.0 542.5Q347 564 402 564Q500 564 558.5 500.5Q617 437 617 326Z" fill="#E65100"/></g>
    <g transform="translate(397.20 220.00) scale(0.200000 -0.200000)"><path d="M403 0 233 234V0H62V740H233V331L402 558H613L381 278L615 0Z" fill="#0B5A70"/></g>
    <g transform="translate(520.80 220.00) scale(0.200000 -0.200000)"><path d="M46 708Q46 748 74.5 774.5Q103 801 148 801Q192 801 220.5 774.5Q249 748 249 708Q249 669 220.5 642.5Q192 616 148 616Q103 616 74.5 642.5Q46 669 46 708ZM233 558V0H62V558Z" fill="#0B5A70"/></g>
    <g transform="translate(579.80 220.00) scale(0.200000 -0.200000)"><path d="M408 564V383H361Q297 383 265.0 355.5Q233 328 233 259V0H62V558H233V465Q263 511 308.0 537.5Q353 564 408 564Z" fill="#0B5A70"/></g>
    <g transform="translate(665.40 220.00) scale(0.200000 -0.200000)"><path d="M373 145V0H286Q193 0 141.0 45.5Q89 91 89 194V416H21V558H89V694H260V558H372V416H260V192Q260 167 272.0 156.0Q284 145 312 145Z" fill="#0B5A70"/></g>
    <g transform="translate(746.60 220.00) scale(0.200000 -0.200000)"><path d="M274 566Q333 566 377.5 542.0Q422 518 446 479V558H617V0H446V79Q421 40 376.5 16.0Q332 -8 273 -8Q205 -8 149.0 27.5Q93 63 60.5 128.5Q28 194 28 280Q28 366 60.5 431.0Q93 496 149.0 531.0Q205 566 274 566ZM324 417Q273 417 237.5 380.5Q202 344 202 280Q202 216 237.5 178.5Q273 141 324 141Q375 141 410.5 178.0Q446 215 446 279Q446 343 410.5 380.0Q375 417 324 417Z" fill="#0B5A70"/></g>
    <g transform="translate(882.40 220.00) scale(0.200000 -0.200000)"><path d="M617 326V0H447V303Q447 359 418.0 390.0Q389 421 340 421Q291 421 262.0 390.0Q233 359 233 303V0H62V558H233V484Q259 521 303.0 542.5Q347 564 402 564Q500 564 558.5 500.5Q617 437 617 326Z" fill="#0B5A70"/></g>
    <g transform="translate(1017.20 220.00) scale(0.200000 -0.200000)"><path d="M40 84Q40 124 68.5 151.0Q97 178 142 178Q186 178 214.5 151.0Q243 124 243 84Q243 45 214.5 18.5Q186 -8 142 -8Q97 -8 68.5 18.5Q40 45 40 84Z" fill="#E65100"/></g>
  </svg>
);

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

// Admin user ID (only this user can manage public library)
const ADMIN_UID = 'ukY1LbmeVCYv803ipg0wJgyEL1F2';
const APP_VERSION = '2026.07.17.s3';

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
  // Common bhajan words
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

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBrowserWarning, setShowBrowserWarning] = useState(() => {
    // Detect iOS Chrome and suggest Safari
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
  const [editingItem, setEditingItem] = useState(null); // { type, value }
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
  const [userCount, setUserCount] = useState(0);

  // NEW: My Library states
  const [currentView, setCurrentView] = useState('public-library'); // HOME = Public Library. Views: 'public-library', 'library', 'bhajan-detail', 'add-bhajan', 'edit-bhajan', 'programs', 'program-detail', 'create-program', 'edit-program', 'live-program', 'public-bhajan-detail', 'admin-panel'
  const [scrollPositions, setScrollPositions] = useState({});
  const [bhajans, setBhajans] = useState([]);
  const [selectedBhajan, setSelectedBhajan] = useState(null);
  const [editingBhajan, setEditingBhajan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeity, setFilterDeity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [bhajansLoading, setBhajansLoading] = useState(false);
  const [bhajanFormError, setBhajanFormError] = useState('');
  const [bhajanFormSaving, setBhajanFormSaving] = useState(false);
  
  // NEW: Programs states
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
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState('');
  const [pickerKeywordFilter, setPickerKeywordFilter] = useState('');
  
  // Program form
  const [programForm, setProgramForm] = useState({
    name: '',
    date: '',
    venue: '',
    bhajanIds: [] // ordered list
  });
  
  // Live Program Mode states
  const [liveProgramIndex, setLiveProgramIndex] = useState(0);
  const [liveFontSize, setLiveFontSize] = useState(20);
  const [liveWakeLock, setLiveWakeLock] = useState(null);

  // NEW: Public Library states
  const [publicBhajans, setPublicBhajans] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicSearchQuery, setPublicSearchQuery] = useState('');
  const [publicFilterKeyword, setPublicFilterKeyword] = useState('');
  const [libraryFilterKeyword, setLibraryFilterKeyword] = useState('');
  const [publicFilterDeity, setPublicFilterDeity] = useState('');
  const [publicFilterCategory, setPublicFilterCategory] = useState('');
  const [selectedPublicBhajan, setSelectedPublicBhajan] = useState(null);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedBhajanIds, setSavedBhajanIds] = useState(new Set());
  
  // NEW: Admin Panel states
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  
  // NEW: Manual Add/Edit Public Bhajan states (admin)
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
  
  // Check if current user is admin (with defensive comparison + debug)
  const isAdmin = useMemo(() => {
    if (!user || !user.uid) return false;
    const uid = user.uid.toString().trim();
    const adminUid = ADMIN_UID.toString().trim();
    const match = uid === adminUid;
    if (user) {
      console.log('👑 Admin check:', {
        userUid: uid,
        adminUid: adminUid,
        userLength: uid.length,
        adminLength: adminUid.length,
        match: match
      });
    }
    return match;
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

  // NEW: Hindi Typing states
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
  const [suggestionsCache, setSuggestionsCache] = useState({});
  const [activeTypingField, setActiveTypingField] = useState(null); // 'lyrics', 'title', 'dhun'
  const suggestionsAbortRef = useRef(null);

  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef(null);
  const [speechLang, setSpeechLang] = useState('hi-IN'); // Default: Hindi. Can toggle to 'en-IN'

  // Reading view settings
  const [readingSettings, setReadingSettings] = useState(() => {
    const defaults = { fontSize: 18, fontFamily: 'sans-serif', lineHeight: 1.8, textAlign: 'center', readingMode: false, keepScreenOn: false };
    try {
      const saved = localStorage.getItem('sankirtan-reading-settings');
      if (saved) {
        // Merge with defaults so new fields work with older saved settings
        return { ...defaults, ...JSON.parse(saved) };
      }
      return defaults;
    } catch {
      return defaults;
    }
  });
  const [showReadingSettings, setShowReadingSettings] = useState(false);
  // Wake lock for reading view - separate from live mode's wake lock
  const [readingWakeLock, setReadingWakeLock] = useState(null);

  // Compact card view - saved to localStorage so users don't have to re-toggle
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

  // Branded splash screen - minimum 2.8s so user sees the full animation
  // (logo fade-in + tagline typewriter + credit line) before main app loads.
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  useEffect(() => {
    const SPLASH_MIN_MS = 2800;
    const timer = setTimeout(() => {
      setSplashFadeOut(true); // Start fade-out animation
      setTimeout(() => setSplashVisible(false), 600); // Remove after fade completes
    }, SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // Progressive rendering - show first N cards, load more as user scrolls.
  // Keeps initial DOM small (~20 nodes instead of 175) which speeds up
  // first paint significantly, especially on lower-end phones.

  // Global ESC key handler — closes the topmost open modal/popup
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (showBhajanPicker) { setShowBhajanPicker(false); return; }
      if (showReadingSettings) { setShowReadingSettings(false); return; }
      if (showOnboarding) { setShowOnboarding(false); return; }
      if (showPhoneLogin) { setShowPhoneLogin(false); return; }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showBhajanPicker, showReadingSettings, showOnboarding, showPhoneLogin]);
  const PAGE_SIZE = 20;
  const [publicVisibleCount, setPublicVisibleCount] = useState(PAGE_SIZE);
  const [libraryVisibleCount, setLibraryVisibleCount] = useState(PAGE_SIZE);
  const publicLoadMoreRef = useRef(null);
  const libraryLoadMoreRef = useRef(null);

  // Reset visible count when filters change - so filtering doesn't require
  // scrolling back down through invisible-but-loaded chunks.
  useEffect(() => {
    setPublicVisibleCount(PAGE_SIZE);
  }, [publicSearchQuery, publicFilterDeity, publicFilterCategory, publicFilterKeyword]);
  useEffect(() => {
    setLibraryVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterDeity, filterCategory, libraryFilterKeyword]);

  // Set up IntersectionObserver for Public Library "load more" sentinel.
  // When user scrolls the sentinel into view, bump visible count by PAGE_SIZE.
  // Uses a retry loop to handle the case where the sentinel DOM node
  // doesn't exist yet when the effect first runs (React hasn't rendered it).
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
        // Sentinel not in DOM yet - retry after next paint
        retryTimer = setTimeout(() => tryObserve(attempt + 1), 100);
      }
    };

    tryObserve();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [currentView, publicVisibleCount, publicBhajans.length]);

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
  }, [currentView, libraryVisibleCount, bhajans.length]);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('sankirtan-dark-mode') === 'true';
    } catch {
      return false;
    }
  });

  // OCR / File import states (image, PDF, camera → lyrics text)
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState('');
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // NEW: Refs for public bhajan form OCR inputs
  const publicCameraInputRef = useRef(null);
  const publicImageInputRef = useRef(null);
  const publicPdfInputRef = useRef(null);
  
  // Save Hindi typing preference
  useEffect(() => {
    try {
      localStorage.setItem('sankirtan-hindi-typing', hindiTypingEnabled.toString());
    } catch (e) {
      console.log('LocalStorage not available');
    }
  }, [hindiTypingEnabled]);

  // Save reading settings
  useEffect(() => {
    try {
      localStorage.setItem('sankirtan-reading-settings', JSON.stringify(readingSettings));
    } catch (e) {}
  }, [readingSettings]);

  // Manage the screen wake lock based on the "Keep screen on" toggle.
  // Only holds the lock while user is actually on a bhajan-reading view -
  // this prevents draining battery on library / list views.
  useEffect(() => {
    const isReadingView = currentView === 'public-bhajan-detail' || currentView === 'bhajan-detail';
    const shouldHoldLock = readingSettings.keepScreenOn && isReadingView;

    let currentLock = readingWakeLock;

    const acquire = async () => {
      if (currentLock) return; // Already have one
      if (!('wakeLock' in navigator)) return; // Unsupported browser
      try {
        const lock = await navigator.wakeLock.request('screen');
        setReadingWakeLock(lock);
        // If OS drops the lock (backgrounded tab, etc.), clear state
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

    // Re-acquire when tab becomes visible (browsers auto-release on hide)
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
  }, [darkMode]);

  // ==============================================
  // NAVIGATION WITH HISTORY (browser back support)
  // ==============================================
  const previousViewRef = useRef('public-library');
  
  // Track view changes - push to browser history when view changes
  useEffect(() => {
    if (currentView !== previousViewRef.current) {
      // Save scroll position of previous view
      setScrollPositions(prev => ({
        ...prev,
        [previousViewRef.current]: window.scrollY
      }));
      
      // Push new view to browser history
      window.history.pushState({ view: currentView }, '', window.location.pathname);
      
      // Scroll to top for new view (unless coming back from browser back)
      if (!window.__sankirtanBackNav) {
        // Instant scroll to top for forward navigation
        window.scrollTo(0, 0);
      } else {
        // Restore scroll position when going BACK
        // Use requestAnimationFrame + multiple attempts to wait for DOM to render
        const savedScroll = scrollPositions[currentView] || 0;
        
        if (savedScroll > 0) {
          // Multiple restoration attempts to handle slow rendering (large lists)
          const restoreScroll = () => {
            window.scrollTo({ top: savedScroll, behavior: 'instant' });
          };
          
          // Try immediately
          restoreScroll();
          // Try after first paint
          requestAnimationFrame(() => {
            restoreScroll();
            // Try after second paint (when list has rendered)
            requestAnimationFrame(() => {
              restoreScroll();
              // Final attempt after 100ms for very slow devices
              setTimeout(restoreScroll, 100);
              // One more attempt after 300ms as fallback
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
  
  // Handle browser back button
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

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Back online');
      setIsOffline(false);
    };
    const handleOffline = () => {
      console.log('⚠️ Went offline');
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==============================================
  // VERSION CHECK - Prompt on new deployment
  // ==============================================
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem('sankirtan-app-version');
      if (savedVersion !== APP_VERSION) {
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
    // Check if user already dismissed or app is already installed
    const alreadyDismissed = localStorage.getItem('sankirtan-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    
    if (alreadyDismissed || isStandalone || isIOSStandalone) {
      console.log('ℹ️ Install prompt: not shown (already installed or dismissed)');
      return;
    }
    
    // Listen for Android/Desktop install event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      // Show our custom prompt after user has used app for 30 seconds
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // For iOS Safari, show manual instructions after 30 seconds
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
      console.log(`Install prompt outcome: ${outcome}`);
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
      
      console.log('✅ Feedback submitted');
      setFeedbackSuccess(true);
      setFeedbackText('');
      
      // Auto-close after 2 seconds
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
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setFeedbackList(list);
      console.log(`✅ Loaded ${list.length} feedback items`);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setFeedbackListLoading(false);
    }
  };
  
  const deleteFeedback = async (feedbackId) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this feedback?')) return;
    try {
      const db = window.firebase.firestore();
      await db.collection('feedback').doc(feedbackId).delete();
      setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
      console.log('✅ Feedback deleted');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Could not delete: ' + error.message);
    }
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
        console.log('✅ Config lists loaded');
      } else {
        // First-time seed: Initialize Firestore with defaults so admin can edit them
        console.log('ℹ️ First-time seed of config lists...');
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
          console.log('✅ Seeded config lists with defaults');
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
    
    // Get current list
    const current = type === 'deity' ? customDeities
                  : type === 'category' ? customCategories
                  : customKeywords;
    
    // Check for duplicates (case-insensitive)
    const existing = current.map(s => s.toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
      alert(`"${trimmed}" already exists!`);
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
      
      console.log(`✅ Added ${type}: ${trimmed}`);
    } catch (error) {
      console.error(`Error adding ${type}:`, error);
      alert('Could not add: ' + error.message);
    }
  };
  
  const editConfigItem = async (type, oldValue, newValue) => {
    if (!isAdmin) return;
    const trimmed = newValue.trim();
    if (!trimmed || trimmed === oldValue) return;
    
    // Check for duplicates
    const current = type === 'deity' ? customDeities
                  : type === 'category' ? customCategories
                  : customKeywords;
    const existing = current.filter(s => s !== oldValue).map(s => s.toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
      alert(`"${trimmed}" already exists!`);
      return;
    }
    
    // Check usage - can only rename if not in use OR user confirms
    const fieldName = type === 'deity' ? 'deity' 
                    : type === 'category' ? 'category'
                    : null;
    
    let usageInfo = { publicUsage: 0, personalUsage: 0 };
    
    if (fieldName) {
      usageInfo.publicUsage = publicBhajans.filter(b => b[fieldName] === oldValue).length;
      usageInfo.personalUsage = bhajans.filter(b => b[fieldName] === oldValue).length;
    } else {
      // Keywords
      usageInfo.publicUsage = publicBhajans.filter(b => (b.keywords || []).includes(oldValue)).length;
      usageInfo.personalUsage = bhajans.filter(b => (b.keywords || []).includes(oldValue)).length;
    }
    
    const totalUsage = usageInfo.publicUsage + usageInfo.personalUsage;
    
    if (totalUsage > 0) {
      alert(`Cannot rename "${oldValue}"\n\n${totalUsage} bhajan${totalUsage !== 1 ? 's' : ''} still use this ${type}.\n(${usageInfo.publicUsage} public + ${usageInfo.personalUsage} personal)\n\nUpdate those bhajans first, then rename.`);
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
      
      console.log(`✅ Renamed ${type}: ${oldValue} → ${trimmed}`);
    } catch (error) {
      console.error(`Error renaming ${type}:`, error);
      alert('Could not rename: ' + error.message);
    }
  };
  
  const deleteConfigItem = async (type, value) => {
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
      alert(`Cannot delete "${value}"\n\n${totalUsage} bhajan${totalUsage !== 1 ? 's' : ''} still use this ${type}.\n(${usageInfo.publicUsage} public + ${usageInfo.personalUsage} personal)\n\nRemove from those bhajans first.`);
      return;
    }
    
    if (!window.confirm(`Delete "${value}"?`)) return;
    
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
      
      console.log(`✅ Deleted ${type}: ${value}`);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert('Could not delete: ' + error.message);
    }
  };
  
  // Combined lists (uses Firestore data if available, else defaults)
  // Once admin visits admin panel, Firestore gets seeded and becomes source of truth
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
  
  // Mark the tour as seen: locally (this device) AND on the user's
  // Firestore profile (so it never auto-pops again on any device/login).
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

        // Set persistence to LOCAL — users stay logged in even after closing browser
        // Users only need to login once until they explicitly logout
        try {
          await window.firebase.auth().setPersistence(
            window.firebase.auth.Auth.Persistence.LOCAL
          );
          console.log('✅ Auth persistence set to LOCAL (permanent login until logout)');
        } catch (persistErr) {
          console.log('Persistence setting failed:', persistErr.message);
        }

        // Enable Firestore offline persistence + long polling fallback
        // (helps with QUIC/network issues)
        try {
          if (!window._firestoreConfigured) {
            const db = window.firebase.firestore();
            
            // Only set long polling (which auto-disables QUIC)
            // Note: Cannot use experimentalForceLongPolling with autoDetect
            db.settings({
              experimentalAutoDetectLongPolling: true,  // Auto-detects when needed
              merge: true
            });
            
            // Enable offline persistence (cached data works offline)
            // Skip in Chrome due to IndexedDB storage issues
            const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const skipPersistence = isChrome && isIOS;
            
            if (!skipPersistence) {
              try {
                await db.enablePersistence({ synchronizeTabs: true });
                console.log('✅ Firestore offline persistence enabled');
              } catch (persistErr) {
                if (persistErr.code === 'failed-precondition') {
                  console.log('Multiple tabs open, persistence enabled in first tab only');
                } else if (persistErr.code === 'unimplemented') {
                  console.log('Browser does not support persistence');
                }
              }
            } else {
              console.log('ℹ️ Skipping persistence in iOS Chrome (uses direct network)');
            }
            
            window._firestoreConfigured = true;
          }
        } catch (configErr) {
          console.warn('Firestore config error:', configErr);
        }

        // Handle redirect result (for signInWithRedirect fallback)
        try {
          const result = await window.firebase.auth().getRedirectResult();
          if (result && result.user) {
            console.log('✅ Redirect sign-in successful:', result.user.email);
          }
        } catch (redirectError) {
          console.log('No redirect result:', redirectError.message);
        }

        window.firebase.auth().onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            console.log('👤 User logged in:', firebaseUser.email || firebaseUser.phoneNumber);
            setUser(firebaseUser);
            // Load profile in background (non-blocking) - user sees dashboard immediately
            loadUserProfile(firebaseUser); // No await!
          } else {
            console.log('👤 No user logged in');
            setUser(null);
            setUserProfile(null);
            setBhajans([]);
          }
          setLoading(false);
        });
        
        // Safety timeout: never stay in loading state more than 8 seconds
        setTimeout(() => {
          setLoading(false);
        }, 8000);

        await fetchUserCount();
      } catch (error) {
        console.error('Firebase init error:', error);
        setLoading(false);
      }
    };

    initFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==============================================
  // LOAD USER'S BHAJANS (Real-time)
  // ==============================================
  useEffect(() => {
    if (!user) {
      setBhajans([]);
      return;
    }

    setBhajansLoading(true);
    const db = window.firebase.firestore();
    const bhajansRef = db.collection('users').doc(user.uid).collection('bhajans');

    // CACHE HYDRATION: Show cached bhajans instantly (<50ms) while
    // fresh data loads from Firestore in background. On repeat visits
    // the user sees their library immediately instead of a spinner.
    const CACHE_KEY = `sankirtan-my-bhajans-${user.uid}`;
    const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        const isStale = !cached.savedAt || (Date.now() - cached.savedAt) > CACHE_MAX_AGE_MS;
        if (cached.list && cached.list.length > 0 && !isStale) {
          setBhajans(cached.list);
          setBhajansLoading(false);
          console.log(`📦 My Library: hydrated ${cached.list.length} bhajans from cache`);
        }
      }
    } catch (e) {
      console.warn('My Library cache hydration failed:', e);
    }

    const saveCache = (list) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ list, savedAt: Date.now() }));
      } catch (e) { /* quota exceeded - non-fatal */ }
    };

    // Load with .get() first (reliable across networks)
    const loadBhajans = async () => {
      try {
        const snapshot = await bhajansRef.get();
        const bhajanList = [];
        snapshot.forEach((doc) => {
          bhajanList.push({ id: doc.id, ...doc.data() });
        });
        // Sort in JS
        bhajanList.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setBhajans(bhajanList);
        setBhajansLoading(false);
        saveCache(bhajanList);
        console.log(`✅ Loaded ${bhajanList.length} bhajans`);
      } catch (error) {
        console.error('Error loading bhajans:', error);
        setBhajansLoading(false);
      }
    };
    
    loadBhajans();
    
    // Real-time updates (optional, may fail on some networks)
    let unsubscribe = () => {};
    try {
      unsubscribe = bhajansRef
        .onSnapshot(
          (snapshot) => {
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
            saveCache(bhajanList);
          },
          (error) => {
            console.log('Bhajans real-time error (using cached):', error.message);
          }
        );
    } catch (e) {
      console.log('Could not set up bhajans listener');
    }

    return () => unsubscribe();
  }, [user]);

  // ==============================================
  // LOAD USER'S PROGRAMS (Real-time)
  // ==============================================
  useEffect(() => {
    if (!user) {
      setPrograms([]);
      return;
    }

    setProgramsLoading(true);
    const db = window.firebase.firestore();
    const programsRef = db.collection('users').doc(user.uid).collection('programs');

    // CACHE HYDRATION for programs
    const PROG_CACHE_KEY = `sankirtan-programs-${user.uid}`;
    try {
      const raw = localStorage.getItem(PROG_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.list && cached.list.length > 0 && cached.savedAt && (Date.now() - cached.savedAt) < 24 * 60 * 60 * 1000) {
          setPrograms(cached.list);
          setProgramsLoading(false);
          console.log(`📦 Programs: hydrated ${cached.list.length} from cache`);
        }
      }
    } catch (e) { /* non-fatal */ }

    const saveProgramsCache = (list) => {
      try {
        localStorage.setItem(PROG_CACHE_KEY, JSON.stringify({ list, savedAt: Date.now() }));
      } catch (e) { /* quota exceeded */ }
    };

    const loadPrograms = async () => {
      try {
        const snapshot = await programsRef.get();
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
        console.log(`✅ Loaded ${programList.length} programs`);
      } catch (error) {
        console.error('Error loading programs:', error);
        setProgramsLoading(false);
      }
    };
    
    loadPrograms();
    
    let unsubscribe = () => {};
    try {
      unsubscribe = programsRef
        .onSnapshot(
          (snapshot) => {
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
            saveProgramsCache(programList);
          },
          (error) => {
            console.log('Programs real-time error:', error.message);
          }
        );
    } catch (e) {
      console.log('Could not set up programs listener');
    }

    return () => unsubscribe();
  }, [user]);

  // ==============================================
  // LOAD PUBLIC LIBRARY BHAJANS
  // ==============================================
  useEffect(() => {
    if (!user && !guestMode) {
      setPublicBhajans([]);
      return;
    }

    setPublicLoading(true);
    const db = window.firebase.firestore();
    const publicRef = db.collection('publicBhajans');

    // CACHE HYDRATION: Show cached bhajans instantly while fresh data loads
    // in background. Cache is a JSON string in localStorage with:
    //   { list: [...bhajans], savedAt: timestamp }
    // On subsequent visits users see content in <100ms instead of waiting
    // for a network round-trip. Fresh data replaces cache silently once it
    // arrives.
    const CACHE_KEY = 'sankirtan-public-bhajans-cache';
    const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        const isStale = !cached.savedAt || (Date.now() - cached.savedAt) > CACHE_MAX_AGE_MS;
        if (cached.list && cached.list.length > 0 && !isStale) {
          setPublicBhajans(cached.list);
          setPublicLoading(false);
          console.log(`📦 Hydrated ${cached.list.length} bhajans from cache (age: ${Math.round((Date.now() - cached.savedAt) / 1000)}s)`);
        }
      }
    } catch (e) {
      console.warn('Cache hydration failed, continuing with network fetch:', e);
    }

    // Save fresh list to cache (called after successful loads)
    const saveCache = (list) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          list,
          savedAt: Date.now()
        }));
      } catch (e) {
        // Quota exceeded / private browsing - non-fatal, just skip cache
        console.warn('Cache save failed (non-fatal):', e);
      }
    };

    // Simple, reliable fetch - default source (network first, cache fallback)
    const loadPublicBhajans = async () => {
      try {
        const snapshot = await publicRef.get();
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
        console.log(`✅ Loaded ${list.length} public bhajans from network`);
      } catch (error) {
        console.error('Error loading public bhajans:', error);
        setPublicLoading(false);
        
        // Retry with exponential backoff
        [2000, 5000, 10000].forEach((delay, idx) => {
          setTimeout(async () => {
            try {
              const snapshot = await publicRef.get();
              const list = [];
              snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
              });
              list.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
              });
              if (list.length > 0) {
                setPublicBhajans(list);
                saveCache(list);
                console.log(`✅ Retry ${idx + 1}: Loaded ${list.length} public bhajans`);
              }
            } catch (retryErr) {
              console.error(`Retry ${idx + 1} failed:`, retryErr);
            }
          }, delay);
        });
      }
    };
    
    loadPublicBhajans();
    
    // Also set up real-time listener (bonus for updates)
    let unsubscribe = () => {};
    try {
      unsubscribe = publicRef.onSnapshot(
        (snapshot) => {
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
        },
        (error) => {
          console.log('Real-time listener error (using cached data):', error.message);
        }
      );
    } catch (listenerErr) {
      console.log('Could not set up real-time listener:', listenerErr.message);
    }

    return () => unsubscribe();
  }, [user, guestMode]);

  // Track which public bhajans user has already saved
  useEffect(() => {
    if (!user || !bhajans) {
      setSavedBhajanIds(new Set());
      return;
    }
    
    // Find bhajans that were saved from public library
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
    const MAX_RETRIES = 2; // Reduced from 3
    
    // Show minimal profile IMMEDIATELY (better perceived speed)
    if (retryCount === 0) {
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL,
        stats: { bhajanCount: 0, publicBhajanCount: 0, followerCount: 0, followingCount: 0 },
        _loading: true // Flag to indicate this is minimal
      });
    }
    
    try {
      const db = window.firebase.firestore();
      
      // Try to load from Firestore (with shorter timeout via retry)
      let userDoc;
      try {
        userDoc = await db.collection('users').doc(firebaseUser.uid).get({ source: 'default' });
      } catch (fetchErr) {
        console.log('Trying cache fallback...');
        try {
          userDoc = await db.collection('users').doc(firebaseUser.uid).get({ source: 'cache' });
        } catch (cacheErr) {
          throw fetchErr; // Re-throw original error
        }
      }
      
      if (userDoc.exists) {
        const profile = userDoc.data();
        setUserProfile(profile);
        console.log('✅ Profile loaded:', profile.displayName);
        
        // Load custom deity/category/keyword lists in background
        loadConfigLists();
        
        // Show onboarding tour ONLY if never seen before - checks both
        // this device (localStorage) and the account profile (Firestore),
        // so it never auto-pops up again on any login. Users can always
        // replay it manually via the ⓘ button in the header.
        const hasSeenTour = localStorage.getItem('sankirtan-onboarding-completed');
        if (!hasSeenTour && !profile.hasSeenOnboarding) {
          setTimeout(() => {
            setShowOnboarding(true);
            setOnboardingStep(0);
          }, 800); // Small delay so the home screen renders first
        }
      } else {
        console.log('🆕 New user - setup profile');
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
      
      // Reduced retries to 2 instead of 3 (faster failure detection)
      if (retryCount < MAX_RETRIES) {
        const delayMs = 1500; // Fixed 1.5s (not exponential)
        console.log(`Retrying in ${delayMs}ms...`);
        setTimeout(() => {
          loadUserProfile(firebaseUser, retryCount + 1);
        }, delayMs);
      } else {
        // Use minimal profile (already set) - user can still browse app
        console.warn('Using minimal profile - user can browse cached content');
        setUserProfile(prev => ({
          ...prev,
          _loading: false, // Done trying
          _minimal: true
        }));
      }
    }
  };

  const fetchUserCount = async () => {
    try {
      const db = window.firebase.firestore();
      const snapshot = await db.collection('users').limit(1000).get();
      setUserCount(snapshot.size);
    } catch (error) {
      console.log('Could not fetch user count:', error);
      setUserCount(1);
    }
  };

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
      console.log('✅ Profile saved');
      
      // Show onboarding for brand new users
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
  // OCR / FILE IMPORT (Image, PDF, Camera → Lyrics text)
  // Text is extracted ON THE USER'S DEVICE (Tesseract.js + pdf.js
  // loaded from CDN on demand). No files are uploaded or stored
  // anywhere - only the extracted text is saved to Firestore,
  // exactly like typed lyrics. Storage impact: negligible, fully
  // within the free Firebase Spark plan.
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
      // Suggest a title from the first line if the title is still empty
      if (!title.trim()) {
        const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length >= 3) || '';
        title = firstLine.slice(0, 60);
      }
      return { ...prev, lyrics: mergedLyrics, title };
    });
    setOcrMessage('✅ Text extracted from ' + sourceLabel + '! Please review & edit below, then save.');
    return true;
  };

  // Downscale large photos so OCR runs faster and more accurately
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
    // Check if Tesseract is already loaded (subsequent uses)
    const isFirstUse = !window.Tesseract;
    if (isFirstUse) {
      setOcrMessage('📥 Downloading OCR engine (~2 MB, one-time only). Next time will be instant...');
      setOcrProgress(0);
    }
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract');

    // Check if language files are cached (Tesseract stores them in browser)
    // Language files are ~15-20 MB total for Hindi + English
    const langModelsCached = localStorage.getItem('sankirtan-tesseract-langs-cached');

    const result = await window.Tesseract.recognize(imageSource, 'hin+eng', {
      logger: (m) => {
        // Detailed status messages so users know what's happening
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

    // Mark language models as cached for next time
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
      const maxPages = Math.min(pdf.numPages, PAGE_LIMIT); // safety cap

      // Warn user if PDF has more pages than we'll process (silent truncation is bad UX)
      if (pdf.numPages > PAGE_LIMIT) {
        setOcrMessage('⚠️ PDF has ' + pdf.numPages + ' pages. Processing first ' + PAGE_LIMIT + ' only. To import more, split the PDF or upload the rest separately.');
        // Give user a moment to read the warning
        await new Promise(r => setTimeout(r, 2500));
      }

      let extracted = '';

      // 1) Try embedded text first (digital PDFs)
      for (let p = 1; p <= maxPages; p++) {
        setOcrMessage('📄 Reading page ' + p + ' of ' + maxPages + '...');
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        extracted += content.items.map(it => it.str).join(' ') + '\n\n';
        // Explicitly clean up page to free memory
        try { page.cleanup && page.cleanup(); } catch (e) {}
      }

      // 2) Scanned PDF (no embedded text) → OCR each page image
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

          // MEMORY FIX: Explicitly release canvas + page memory before next iteration.
          // Without this, mobile browsers accumulate ~15 MB per page and can crash on
          // multi-page scanned PDFs. Setting canvas dimensions to 0 releases GPU/CPU memory.
          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup && page.cleanup();
          } catch (e) { /* best effort */ }
        }
      }

      // Release the PDF document itself
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
  // Uses live transcription (interim results) on browsers that support it well.
  // Falls back to single-shot recognition on iOS Safari where interim results
  // are unreliable. Hindi is the default language.
  // ==============================================
  const startVoiceSearch = (targetField) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome or Safari.');
      return;
    }
    // Second tap = stop current listening
    if (isListening && speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
      return;
    }

    // Detect iOS Safari - interim results are flaky there, use single-shot
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isIOSSafari = isIOS && /^((?!chrome|android).)*safari/i.test(ua);

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;

    if (isIOSSafari) {
      // Graceful fallback: single utterance, no interim results
      recognition.continuous = false;
      recognition.interimResults = false;
    } else {
      // Live transcription: keeps going, shows partial results as you speak
      recognition.continuous = true;
      recognition.interimResults = true;
    }
    recognition.lang = speechLang;
    recognition.maxAlternatives = 1;

    // Track transcripts across multiple result events (live mode fires many)
    let finalTranscript = '';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
      // "no-speech" is normal (user didn't say anything), don't alarm them
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        // Only alert for unexpected errors
        if (e.error === 'not-allowed') {
          alert('Microphone access blocked. Please allow microphone in browser settings.');
        }
      }
    };
    recognition.onresult = (e) => {
      let interimTranscript = '';
      // Walk through all results in this event
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      // Show final + interim combined so user sees live typing effect
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
        // Update existing
        await bhajansRef.doc(editingBhajan.id).update(bhajanData);
        console.log('✅ Bhajan updated');
        // Return to detail view
        setSelectedBhajan({ ...editingBhajan, ...bhajanData });
        setCurrentView('bhajan-detail');
      } else {
        // Create new
        bhajanData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        const docRef = await bhajansRef.add(bhajanData);
        console.log('✅ Bhajan created:', docRef.id);
        
        // Update user's bhajan count
        await db.collection('users').doc(user.uid).update({
          'stats.bhajanCount': window.firebase.firestore.FieldValue.increment(1)
        });
        
        setUserProfile(prev => ({
          ...prev,
          stats: { ...prev.stats, bhajanCount: (prev.stats?.bhajanCount || 0) + 1 }
        }));
        
        setCurrentView('library');
      }
    } catch (error) {
      console.error('Error saving bhajan:', error);
      setBhajanFormError('Could not save: ' + error.message);
    } finally {
      setBhajanFormSaving(false);
    }
  };

  const deleteBhajan = async (bhajan) => {
    if (!window.confirm(`Delete "${bhajan.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const db = window.firebase.firestore();
      await db.collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).delete();
      
      // Update stats
      await db.collection('users').doc(user.uid).update({
        'stats.bhajanCount': window.firebase.firestore.FieldValue.increment(-1)
      });
      
      setUserProfile(prev => ({
        ...prev,
        stats: { ...prev.stats, bhajanCount: Math.max(0, (prev.stats?.bhajanCount || 0) - 1) }
      }));
      
      console.log('✅ Bhajan deleted');
      setCurrentView('library');
      setSelectedBhajan(null);
    } catch (error) {
      console.error('Error deleting bhajan:', error);
      alert('Could not delete: ' + error.message);
    }
  };

  const openBhajanDetail = async (bhajan) => {
    setSelectedBhajan(bhajan);
    setCurrentView('bhajan-detail');
    
    // Increment view count
    try {
      const db = window.firebase.firestore();
      await db.collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).update({
        viewCount: window.firebase.firestore.FieldValue.increment(1),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.log('Could not update view count:', error);
    }
  };

  // ==============================================
  // HINDI TYPING - GOOGLE INPUT TOOLS API
  // ==============================================
  const fetchGoogleSuggestions = async (word) => {
    if (!word || word.length < 1) {
      setTransliterationSuggestions([]);
      return;
    }
    
    const lowerWord = word.toLowerCase();
    
    // Check cache first
    if (suggestionsCache[lowerWord]) {
      setTransliterationSuggestions(suggestionsCache[lowerWord]);
      return;
    }
    
    // Abort any pending request
    if (suggestionsAbortRef.current && suggestionsAbortRef.current.abort) {
      try {
        suggestionsAbortRef.current.abort();
      } catch (e) {}
    }
    
    const controller = new AbortController();
    suggestionsAbortRef.current = controller;
    
    try {
      // Always use Hindi transliteration. The user's Hindi ON/OFF toggle
      // controls whether transliteration runs at all - if they're typing
      // English, they turn the toggle off in the form.
      const langCode = 'hi';
      
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${langCode}-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`;
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        const suggestions = data[1][0][1].slice(0, 5);
        setTransliterationSuggestions(suggestions);
        setSuggestionsCache(prev => ({ ...prev, [`${langCode}:${lowerWord}`]: suggestions }));
      } else {
        // Fallback to local map (only for Hindi)
        if (langCode === 'hi') {
          const fallback = HINDI_FALLBACK_MAP[lowerWord];
          setTransliterationSuggestions(fallback ? [fallback] : []);
        } else {
          setTransliterationSuggestions([]);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.log('Transliteration API error, using fallback');
        const fallback = HINDI_FALLBACK_MAP[lowerWord];
        setTransliterationSuggestions(fallback ? [fallback] : []);
      }
    }
  };
  
  // Handle keyboard events (space/enter/period converts word)
  const handleHindiKeyDown = (e, fieldName) => {
    if (!hindiTypingEnabled) return;
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== '.') return;
    
    const target = e.target;
    const cursorPos = target.selectionStart;
    const value = target.value;
    
    // Find word boundaries
    let wordStart = cursorPos - 1;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    const currentWordText = value.substring(wordStart, cursorPos);
    
    // Only convert if word looks like English (ASCII letters only)
    if (!currentWordText || !/^[a-zA-Z]+$/.test(currentWordText)) {
      setShowSuggestions(false);
      return;
    }
    
    const lowerWord = currentWordText.toLowerCase();
    const cachedSuggestions = suggestionsCache[lowerWord] || 
      (HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);
    
    if (cachedSuggestions && cachedSuggestions.length > 0) {
      e.preventDefault();
      const replacement = cachedSuggestions[0];
      const separator = e.key === '.' ? '.' : (e.key === 'Enter' ? '\n' : ' ');
      const newValue = value.substring(0, wordStart) + replacement + separator + value.substring(cursorPos);
      
      setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
      
      setShowSuggestions(false);
      setCurrentWord('');
      
      // Restore cursor
      setTimeout(() => {
        const newCursor = wordStart + replacement.length + 1;
        target.selectionStart = newCursor;
        target.selectionEnd = newCursor;
      }, 0);
    } else {
      setShowSuggestions(false);
    }
  };
  
  // Track current word for suggestions
  // ALSO handles auto-conversion on Android (which doesn't fire keydown for space)
  const handleHindiInput = (e, fieldName) => {
    const value = e.target.value;
    const oldValue = bhajanForm[fieldName] || '';
    
    // Detect if a space was JUST typed (Android compatibility)
    const spaceJustTyped = value.length > oldValue.length && 
                           (value.endsWith(' ') || value.endsWith('\n') || value.endsWith('.')) &&
                           !oldValue.endsWith(value.slice(-1));
    
    setBhajanForm(prev => ({ ...prev, [fieldName]: value }));
    
    if (!hindiTypingEnabled) {
      setShowSuggestions(false);
      return;
    }
    
    const cursorPos = e.target.selectionStart;
    
    // If space was just typed, try to auto-convert the previous word
    if (spaceJustTyped) {
      const separator = value.slice(-1); // space, newline, or period
      const beforeSeparator = value.slice(0, -1);
      
      // Find the last word before separator
      let wordStart = beforeSeparator.length;
      while (wordStart > 0 && beforeSeparator[wordStart - 1] !== ' ' && beforeSeparator[wordStart - 1] !== '\n') {
        wordStart--;
      }
      const lastWord = beforeSeparator.substring(wordStart);
      
      // Only convert if it's English letters
      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        const lowerWord = lastWord.toLowerCase();
        // Always Hindi transliteration when Hindi typing is on
        const langCode = 'hi';
        
        const cachedSuggestions = suggestionsCache[`${langCode}:${lowerWord}`] ||
          suggestionsCache[lowerWord] ||
          (HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);
        
        if (cachedSuggestions && cachedSuggestions.length > 0) {
          // Auto-replace with top suggestion
          const replacement = cachedSuggestions[0];
          const newValue = beforeSeparator.substring(0, wordStart) + replacement + separator;
          
          setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
          setShowSuggestions(false);
          setCurrentWord('');
          
          // Restore cursor to end
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
    
    // Normal typing - fetch suggestions for current word
    let wordStart = cursorPos;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    const wordText = value.substring(wordStart, cursorPos);
    
    if (wordText && /^[a-zA-Z]+$/.test(wordText) && wordText.length >= 1) {
      setCurrentWord(wordText);
      setActiveTypingField(fieldName);
      
      // Debounced fetch
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
  
  // Apply a suggestion (tap on chip)
  // Uses onMouseDown/onTouchStart with preventDefault to avoid losing focus
  const applySuggestion = (suggestion, fieldName) => {
    const fieldElement = document.getElementById(`hindi-input-${fieldName}`);
    if (!fieldElement) return;
    
    const cursorPos = fieldElement.selectionStart;
    const value = fieldElement.value;
    
    let wordStart = cursorPos;
    while (wordStart > 0 && value[wordStart - 1] !== ' ' && value[wordStart - 1] !== '\n') {
      wordStart--;
    }
    
    // Add space after suggestion for natural flow
    const newValue = value.substring(0, wordStart) + suggestion + ' ' + value.substring(cursorPos);
    setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
    
    setShowSuggestions(false);
    setCurrentWord('');
    
    // Restore focus and cursor position AFTER React re-render
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
        const lowerWord = lastWord.toLowerCase();
        // Always Hindi transliteration when Hindi typing is on
        const langCode = 'hi';

        const cachedSuggestions = suggestionsCache[`${langCode}:${lowerWord}`] ||
          suggestionsCache[lowerWord] ||
          (HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);

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

    const lowerWord = currentWordText.toLowerCase();
    const cachedSuggestions = suggestionsCache[lowerWord] || 
      (HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);

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
  const openPublicLibrary = () => {
    setCurrentView('public-library');
    setPublicSearchQuery('');
    setPublicFilterDeity('');
    setPublicFilterCategory('');
  };

  const openPublicBhajanDetail = (bhajan) => {
    setSelectedPublicBhajan(bhajan);
    setCurrentView('public-bhajan-detail');
  };

  // Save public bhajan to user's personal library
  const saveToMyLibrary = async (publicBhajan) => {
    if (!user || !userProfile) {
      if (guestMode) { setGuestMode(false); } // redirect to login
      return;
    }
    
    // Check if already saved
    if (savedBhajanIds.has(publicBhajan.id)) {
      alert('You already have this bhajan in your library!');
      return;
    }
    
    try {
      setSavingToLibrary(true);
      const db = window.firebase.firestore();
      
      // Create a copy in user's library
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
        savedFromPublicId: publicBhajan.id, // Track source
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Save to user's collection
      await db.collection('users').doc(user.uid).collection('bhajans').add(bhajanData);
      
      // Update user's bhajan count
      await db.collection('users').doc(user.uid).update({
        'stats.bhajanCount': window.firebase.firestore.FieldValue.increment(1)
      });
      
      setUserProfile(prev => ({
        ...prev,
        stats: { ...prev.stats, bhajanCount: (prev.stats?.bhajanCount || 0) + 1 }
      }));
      
      // Track that we saved it
      setSavedBhajanIds(prev => new Set([...prev, publicBhajan.id]));
      
      // Update public bhajan save count (best effort)
      try {
        await db.collection('publicBhajans').doc(publicBhajan.id).update({
          saveCount: window.firebase.firestore.FieldValue.increment(1)
        });
      } catch (e) {
        console.log('Could not update save count (not admin)');
      }
      
      alert(`✅ "${publicBhajan.title}" added to your library!`);
      console.log('✅ Bhajan saved to library');
    } catch (error) {
      console.error('Error saving bhajan:', error);
      alert('Could not save: ' + error.message);
    } finally {
      setSavingToLibrary(false);
    }
  };

  // Filter public bhajans
  const filteredPublicBhajans = publicBhajans.filter(bhajan => {
    if (publicSearchQuery) {
      const q = publicSearchQuery.toLowerCase();
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

  // ==============================================
  // ADMIN PANEL FUNCTIONS
  // ==============================================
  const openAdminPanel = () => {
    if (!isAdmin) {
      alert('Access denied. Admin only.');
      return;
    }
    setCurrentView('admin-panel');
    setImportJsonText('');
    setImportPreview(null);
    setImportError('');
    setImportSuccess('');
    // Auto-load feedback list
    loadFeedbackList();
    // Load config lists (deities/categories/keywords)
    loadConfigLists();
  };

  // Parse JSON and show preview
  const previewImport = () => {
    setImportError('');
    setImportSuccess('');
    
    if (!importJsonText.trim()) {
      setImportError('Please paste JSON content first');
      return;
    }
    
    try {
      const parsed = JSON.parse(importJsonText);
      
      // Handle different possible structures
      let bhajanArray = [];
      
      if (Array.isArray(parsed)) {
        bhajanArray = parsed;
      } else if (parsed.bhajans && Array.isArray(parsed.bhajans)) {
        bhajanArray = parsed.bhajans;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        bhajanArray = parsed.data;
      } else if (typeof parsed === 'object') {
        // Maybe it's an object of bhajans
        bhajanArray = Object.values(parsed).filter(v => 
          v && typeof v === 'object' && (v.title || v.lyrics)
        );
      }
      
      if (bhajanArray.length === 0) {
        setImportError('No bhajans found in the JSON. Please check the format.');
        return;
      }
      
      // Helper: parse keywords (string OR array)
      const parseKeywords = (kw) => {
        if (!kw) return [];
        if (Array.isArray(kw)) return kw.filter(k => k && typeof k === 'string').map(k => k.trim()).filter(k => k);
        if (typeof kw === 'string') {
          return kw.split(',').map(k => k.trim()).filter(k => k);
        }
        return [];
      };
      
      // Normalize each bhajan
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
      }).filter(b => b.title && b.lyrics); // Only keep valid bhajans
      
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

  // Normalize deity name to match our options
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
    
    // Match exact options
    const validOptions = ['Babosa', 'Krishna', 'Mata Ji', 'Hanuman', 'Rama', 'Shiv', 'Ramdev', 'Ganesh', 'Bhairav', 'Saibaba', 'Vishnu', 'Buddha', 'Mahavir', 'Guru Nanak', 'Jain', 'Nirgun', 'Deshbhakti', 'Others'];
    const found = validOptions.find(o => o.toLowerCase() === d);
    if (found) return found;
    
    return 'Others';
  };

  // Normalize category
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

  // Bulk import bhajans in batches
  const executeImport = async () => {
    if (!importPreview || !importPreview.bhajans) return;
    if (!isAdmin) {
      alert('Access denied. Admin only.');
      return;
    }
    
    if (!window.confirm(`Import ${importPreview.valid} bhajans to Public Library? This cannot be easily undone.`)) {
      return;
    }
    
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
  };

  // Delete a public bhajan (admin only)
  const deletePublicBhajan = async (bhajan) => {
    if (!isAdmin) {
      alert('Access denied. Admin only.');
      return;
    }
    if (!window.confirm(`Delete public bhajan "${bhajan.title}"? This affects all users.`)) {
      return;
    }
    try {
      const db = window.firebase.firestore();
      await db.collection('publicBhajans').doc(bhajan.id).delete();
      console.log('✅ Public bhajan deleted');
      if (selectedPublicBhajan && selectedPublicBhajan.id === bhajan.id) {
        setCurrentView('public-library');
        setSelectedPublicBhajan(null);
      }
    } catch (error) {
      console.error('Error deleting public bhajan:', error);
      alert('Could not delete: ' + error.message);
    }
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
        // Update existing
        await db.collection('publicBhajans').doc(editingPublicBhajan.id).update(bhajanData);
        console.log('✅ Public bhajan updated');
        // Update selected if it's the one being viewed
        if (selectedPublicBhajan && selectedPublicBhajan.id === editingPublicBhajan.id) {
          setSelectedPublicBhajan({ ...editingPublicBhajan, ...bhajanData });
        }
      } else {
        // Create new
        bhajanData.saveCount = 0;
        bhajanData.viewCount = 0;
        bhajanData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('publicBhajans').add(bhajanData);
        console.log('✅ Public bhajan created');
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
  const openPrograms = () => {
    setCurrentView('programs');
    setProgramSearchQuery('');
  };
  
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
    // Auto-open bhajan picker so user can start adding immediately
    setShowBhajanPicker(true);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerCategoryFilter('');
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
        console.log('✅ Program updated');
        setSelectedProgram({ ...editingProgram, ...programData });
        setCurrentView('program-detail');
      } else {
        programData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        const docRef = await programsRef.add(programData);
        console.log('✅ Program created:', docRef.id);
        setCurrentView('programs');
      }
    } catch (error) {
      console.error('Error saving program:', error);
      setProgramFormError('Could not save: ' + error.message);
    } finally {
      setProgramFormSaving(false);
    }
  };
  
  const deleteProgram = async (program) => {
    if (!window.confirm(`Delete program "${program.name}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const db = window.firebase.firestore();
      await db.collection('users').doc(user.uid).collection('programs').doc(program.id).delete();
      console.log('✅ Program deleted');
      setCurrentView('programs');
      setSelectedProgram(null);
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Could not delete: ' + error.message);
    }
  };
  
  // Add bhajan to program form
  const addBhajanToProgram = (bhajanId) => {
    if (!programForm.bhajanIds.includes(bhajanId)) {
      setProgramForm(prev => ({
        ...prev,
        bhajanIds: [...prev.bhajanIds, bhajanId]
      }));
    }
    setShowBhajanPicker(false);
    setBhajanPickerSearch('');
  };
  
  const removeBhajanFromProgram = (bhajanId) => {
    setProgramForm(prev => ({
      ...prev,
      bhajanIds: prev.bhajanIds.filter(id => id !== bhajanId)
    }));
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
  
  // Helper: get bhajan by ID
  const getBhajanById = (id) => bhajans.find(b => b.id === id);
  
  // Filter programs
  const filteredPrograms = programs.filter(program => {
    if (!programSearchQuery) return true;
    const q = programSearchQuery.toLowerCase();
    return (program.name && program.name.toLowerCase().includes(q)) ||
           (program.venue && program.venue.toLowerCase().includes(q));
  });
  
  // ==============================================
  // LIVE PROGRAM MODE
  // ==============================================
  const startLiveProgram = async (program) => {
    if (!program.bhajanIds || program.bhajanIds.length === 0) {
      alert('This program has no bhajans! Add some first.');
      return;
    }
    setSelectedProgram(program);
    setLiveProgramIndex(0);
    setCurrentView('live-program');
    
    // Try to enable screen wake lock
    try {
      if ('wakeLock' in navigator) {
        const wakeLock = await navigator.wakeLock.request('screen');
        setLiveWakeLock(wakeLock);
        console.log('✅ Screen wake lock enabled');
      }
    } catch (error) {
      console.log('Wake lock not available:', error);
    }
  };
  
  const exitLiveProgram = async () => {
    // Release wake lock
    if (liveWakeLock) {
      try {
        await liveWakeLock.release();
        setLiveWakeLock(null);
        console.log('✅ Wake lock released');
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

  // Filter bhajans based on search and filters
  const filteredBhajans = bhajans.filter(bhajan => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
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
        // Try popup method first (better UX)
        await window.firebase.auth().signInWithPopup(provider);
        console.log('✅ Google sign-in successful (popup)');
      } catch (popupError) {
        console.warn('Popup failed, trying redirect:', popupError);
        
        // If popup blocked or has issues, use redirect
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
        callback: () => {
          console.log('✅ reCAPTCHA verified');
        }
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
      console.log('✅ OTP sent to', formattedPhone);
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
      console.log('✅ Phone verification successful');
      
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
      console.log('👋 Logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ==============================================
  // BRANDED SPLASH SCREEN
  // Shows on every app open with animated brand identity.
  // Minimum 2.8s display so users see the full animation
  // sequence: logo → tagline typewriter → credit line glow.
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
          {/* Logo with scale+fade entrance */}
          <div
            style={{
              animation: 'splashLogoIn 0.8s ease-out forwards',
              opacity: 0,
            }}
          >
            <SankirtanWordmark className="h-16 sm:h-20 w-auto mx-auto" />
          </div>

          {/* Tagline in Devanagari with letter-spacing entrance */}
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

          {/* Decorative divider */}
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

          {/* Credit line with Babosa Bhagwan glow */}
          <div
            style={{
              animation: 'splashCreditIn 0.7s ease-out 1.6s forwards',
              opacity: 0,
            }}
            className="mt-5"
          >
            <p className="text-[#0B5A70]/50 text-xs sm:text-sm leading-relaxed">
              Founded for the Bhajan Community
            </p>
            <p className="text-[#0B5A70]/50 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5">
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

          {/* Spinner appears last */}
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
  // MAIN APP (Authenticated OR Guest)
  // ==============================================
  if ((user && userProfile) || guestMode) {
    const currentStep = ONBOARDING_STEPS[onboardingStep];
    
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#0f1a1c] text-gray-100' : 'bg-[#FFF8F0]'}`}>
        {/* ==============================================
            ONBOARDING TOUR MODAL
            ============================================== */}
        {showOnboarding && currentStep && (
          <div onClick={() => { setShowOnboarding(false); }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-[#0B5A70] p-6 text-white text-center relative">
                {/* Skip button */}
                <button
                  onClick={skipOnboarding}
                  className="absolute top-3 right-3 text-white/80 hover:text-white text-sm font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full"
                >
                  Skip Tour
                </button>
                
                {/* Big emoji */}
                <div className="text-6xl mb-3 mt-2 animate-bounce">
                  {currentStep.emoji}
                </div>
                
                {/* Step indicator */}
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
              
              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-2xl font-bold text-[#0B5A70] mb-3">
                  {currentStep.title}
                </h3>
                <p className="text-gray-700 leading-relaxed text-base mb-6">
                  {currentStep.description}
                </p>
                
                {/* Action buttons */}
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
                
                {/* Skip link on later steps */}
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
        
        {/* ==============================================
            APP UPDATE PROMPT
            ============================================== */}
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
                    <span>Google Hindi typing now works in Public Library add/edit forms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0B5A70] font-bold">✓</span>
                    <span>You will now see this prompt every time the app is updated on GitHub</span>
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

                {/* ==============================================
            FEEDBACK MODAL
            ============================================== */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="bg-[#0B5A70] p-6 text-white text-center relative">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl leading-none w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  ×
                </button>
                <div className="text-5xl mb-2">💬</div>
                <h3 className="text-2xl font-bold">Share Your Feedback</h3>
                <p className="text-sm text-white/80 mt-1">
                  Your thoughts help us improve Sankirtan
                </p>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {feedbackSuccess ? (
                  // Success message
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
        
        {/* ==============================================
            READING SETTINGS MODAL
            ============================================== */}
        {showReadingSettings && (
          <div onClick={() => setShowReadingSettings(false)} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className={`rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-sm w-full overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-[#FFFCF8]'}`}>
              <div className={`p-6 text-center ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]'} text-white`}>
                <div className="text-5xl mb-2">📖</div>
                <h3 className="text-2xl font-bold">Reading View</h3>
                <p className="text-sm opacity-90 mt-1">Comfortable lyrics reading</p>
              </div>
              <div className="p-6 space-y-5">
                {/* Font Size */}
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

                {/* Reading Mode toggle - larger font + tighter alignment for focused reading */}
                <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                  <div>
                    <div className="text-sm font-semibold">Reading Mode</div>
                    <div className="text-xs opacity-75">Larger, centered text for focused singing</div>
                  </div>
                  <button
                    onClick={() => setReadingSettings(prev => {
                      const on = !prev.readingMode;
                      // When enabling reading mode, bump font size + center-align.
                      // When disabling, keep whatever they had.
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

                {/* Keep Screen On toggle - uses Wake Lock API */}
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

        {/* ==============================================
            PWA INSTALL PROMPT (Android/Desktop)
            ============================================== */}
        {showInstallPrompt && deferredInstallPrompt && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-50">
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
        
        {/* ==============================================
            iOS SAFARI INSTALL INSTRUCTIONS
            ============================================== */}
        {showIOSInstructions && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-50">
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
        
        {/* Header */}
        <header className={`sticky top-0 z-40 border-b ${darkMode ? 'bg-[#0f1a1c] border-[#0B5A70]/15' : 'bg-[#FFF8F0]/95 backdrop-blur-md border-[#0B5A70]/10'}`}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentView('public-library')}
              className="hover:opacity-80 transition-opacity"
              aria-label="Sankirtan — go to Public Library"
            >
              {/* Wordmark: 'sankirtan.' as SVG paths. Tagline appears
                  on login/splash screens instead. h-10 (40px) on mobile,
                  h-12 (48px) on desktop. Auto-scales width per viewBox. */}
              <SankirtanWordmark className="h-10 sm:h-12 w-auto" />
            </button>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={openAdminPanel}
                  className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg"
                  title="Admin Panel"
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
                  className={`font-semibold px-4 py-2 rounded-xl text-sm transition-all ${darkMode ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d]' : 'bg-[#0B5A70] text-white hover:bg-[#094a5d]'}`}
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
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#0B5A70]">{userProfile.displayName}</p>
                {userProfile.verified && <span className="text-xs text-[#0B5A70]">✓ Verified</span>}
                {isAdmin && <span className="text-xs text-purple-600 ml-1">👑 Admin</span>}
              </div>
              )}
              </>
              )}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-[#E65100] hover:bg-[#1e2e33]' : 'text-[#0B5A70]/50 hover:bg-[#0B5A70]/5'}`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
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

        {/* Main Content - Switch between views */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          
          {/* ==============================================
              MY LIBRARY VIEW
              ============================================== */}
          {currentView === 'library' && (
            <>
              {/* Library Header with Public/Personal Switcher */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Public ↔ Personal library switcher */}
                  <div className={`inline-flex rounded-xl p-1.5 border ${darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/20' : 'bg-[#0B5A70]/10 border-[#0B5A70]/20'}`}>
                    <button
                      onClick={openPublicLibrary}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#0B5A70]/10' : 'text-[#0B5A70]/70 hover:text-[#0B5A70] hover:bg-white/50'}`}
                    >
                      🌐 Public
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md ${darkMode ? 'bg-[#0B5A70]/30 text-gray-100' : 'bg-white text-[#0B5A70] border border-[#0B5A70]/15'}`}
                    >
                      📚 My Library
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={openPrograms}
                    className={`border font-semibold px-3 py-2 rounded-xl text-sm flex items-center gap-1 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 text-gray-200 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/15 hover:border-[#0B5A70]/40 text-[#0B5A70]'}`}
                    title="View and manage your programs / setlists"
                  >
                    🎵 Programs ({programs.length})
                  </button>
                  <button
                    onClick={openAddBhajan}
                    className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                  >
                    <span className="text-lg">+</span> Add Bhajan
                  </button>
                </div>
              </div>

              {/* Tiny count line replaces the "📚 My Library" heading - tab already indicates page.
                  Shown as a small helper text so users still see how many bhajans they have. */}
              <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/60'}`}>
                {bhajans.length} bhajan{bhajans.length === 1 ? '' : 's'} in your collection
              </p>

              {/* Search Bar - voice language toggle sits inline with mic */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search bhajans (title, lyrics, keywords)..."
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
                  >
                    {speechLang === 'hi-IN' ? 'HI' : 'EN'}
                  </button>
                  <button
                    onClick={() => startVoiceSearch('library')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : darkMode
                          ? 'text-[#0B5A70]/40 hover:text-[#0B5A70]/70 hover:bg-[#1e2e33]'
                          : 'text-[#0B5A70]/40 hover:text-[#0B5A70] hover:bg-[#0B5A70]/5'
                    }`}
                    title={isListening ? 'Listening...' : 'Voice search'}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Clear filters link */}
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

              {/* Filters - single row: Deity | Category | Keyword. Active filters highlighted. */}
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={filterDeity}
                  onChange={(e) => setFilterDeity(e.target.value)}
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

              {/* Quick Keywords - top 4 chips only. Full keyword list is
                  available in the "All Keywords" dropdown in the filters row above. */}
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

              {/* Bhajans List - skeleton loaders while data loads */}
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
                  {/* View density toggle */}
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex bg-[#0B5A70]/5 rounded-lg p-0.5 border border-[#0B5A70]/10">
                      <button
                        onClick={() => setCompactView(false)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${!compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/50 hover:text-[#0B5A70]'}`}
                        title="Full card view"
                      >
                        ▤ Full
                      </button>
                      <button
                        onClick={() => setCompactView(true)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/50 hover:text-[#0B5A70]'}`}
                        title="Compact list view"
                      >
                        ☰ Compact
                      </button>
                    </div>
                  </div>

                <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {filteredBhajans.slice(0, libraryVisibleCount).map(bhajan => {
                    // COMPACT VIEW
                    if (compactView) {
                      return (
                        <button
                          key={bhajan.id}
                          onClick={() => openBhajanDetail(bhajan)}
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

                    // FULL CARD VIEW
                    return (
                      <button
                        key={bhajan.id}
                        onClick={() => openBhajanDetail(bhajan)}
                        className={`rounded-2xl p-5 border transition-all text-left ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 shadow-[0_2px_12px_rgba(11,90,112,0.15)] hover:border-[#0B5A70]/30 hover:shadow-[0_4px_20px_rgba(11,90,112,0.25)]' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_2px_12px_rgba(11,90,112,0.06)] hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)]'}`}
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

                        {/* Same defensive lyrics preview treatment as Public
                            Library - trim + max-height prevents card stretching. */}
                        <p className={`text-sm line-clamp-3 mb-2 whitespace-pre-line max-h-16 overflow-hidden ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {(bhajan.lyrics || '').trim()}
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
                  })}
                </div>

                {/* Load more sentinel */}
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
            <>
              {/* Detail Header */}
              <div className="flex items-center justify-between mb-4">
                {/* Compact action bar: back + pill actions (Edit / Delete / View) */}
                <button
                  onClick={() => { if (guestMode && !user) { setGuestMode(false); } else { setCurrentView('library'); } }}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Back
                </button>
                <div className="flex gap-1.5 flex-wrap">
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

              {/* Bhajan Content */}
              <div className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 mb-4 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'}`}>
                {/* Title (smaller, max 2 lines) - View button already in action bar above */}
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

                {/* Scale / Raag - compact single-line display. Shows the scale
                    when set; otherwise a small "+ Add Scale" affordance that
                    opens the edit form. Kept small so it doesn't reintroduce
                    the clutter of the old badges strip. */}
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
                  {/* Quick font size adjust */}
                  <div className="flex items-center justify-end gap-1 mb-2">
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Decrease font size"
                    >
                      Aa−
                    </button>
                    <span className={`text-xs w-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{readingSettings.fontSize}</span>
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.min(40, prev.fontSize + 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Increase font size"
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

              {/* Related Bhajans - compact cards BELOW the main bhajan card.
                  Auto-generated from shared keywords. No toggle — just shows up. */}
              {selectedBhajan.keywords && selectedBhajan.keywords.length > 0 && (() => {
                const relKws = new Set(selectedBhajan.keywords);
                const related = bhajans
                  .filter(b => b.id !== selectedBhajan.id && b.keywords && b.keywords.some(kw => relKws.has(kw)))
                  .map(b => ({
                    ...b,
                    matchCount: b.keywords.filter(kw => relKws.has(kw)).length,
                    matchedKws: b.keywords.filter(kw => relKws.has(kw))
                  }))
                  .sort((a, b) => b.matchCount - a.matchCount)
                  .slice(0, 6);
                if (related.length === 0) return null;
                return (
                  <div className="mt-6">
                    <p className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]'}`}>
                      ✨ Related Bhajans
                    </p>
                    <div className="space-y-1.5">
                      {related.map(b => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedBhajan(b);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>{b.title}</p>
                            <p className="text-xs text-gray-600 truncate">
                              {b.deity} · {b.category}
                              {b.matchedKws.length > 0 && (
                                <span className="text-[#E65100]/60"> · {b.matchedKws.slice(0, 2).map(k => `#${k}`).join(' ')}</span>
                              )}
                            </p>
                          </div>
                          <span className="text-[#0B5A70]/30 text-lg flex-shrink-0">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
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
                        {/* English fallback - keeps the original English word.
                            Useful for proper nouns (Krishna, Radha) and bilingual titles
                            (कृष्ण भजन / Krishna Bhajan). Styled subtly so it doesn't
                            compete with Hindi options; positioned last as an escape hatch. */}
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
                        {/* English fallback - keeps the original English word.
                            Useful for proper nouns (Krishna, Radha) and bilingual titles
                            (कृष्ण भजन / Krishna Bhajan). Styled subtly so it doesn't
                            compete with Hindi options; positioned last as an escape hatch. */}
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
                  
                  {/* Add lyrics from Image / PDF / Camera (on-device OCR - no files uploaded) */}
                  <div className="mb-3 p-3 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-xl">
                    <p className="text-xs font-semibold text-[#0B5A70] mb-2">
                      📥 Auto-fill lyrics from a photo, PDF, or camera — text is read on your device, nothing is uploaded or stored as a file
                    </p>

                    {/* First-time warning about OCR engine download */}
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

                    {/* Hidden file inputs */}
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
                    
                    {/* Hindi Suggestions Popup - positioned above textarea */}
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
                        {/* English fallback - keeps the original English word.
                            Useful for proper nouns (Krishna, Radha) and bilingual titles
                            (कृष्ण भजन / Krishna Bhajan). Styled subtly so it doesn't
                            compete with Hindi options; positioned last as an escape hatch. */}
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

                {/* Error Message */}
                {bhajanFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {bhajanFormError}
                  </div>
                )}

                {/* Save Button */}
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
                <button
                  onClick={() => setCurrentView('public-library')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Dashboard
                </button>
                <button
                  onClick={openCreateProgram}
                  className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">+</span> Create Program
                </button>
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold text-[#0B5A70]">🎵 Programs & Setlists</h2>
                <p className="text-sm text-[#0B5A70]/70">Your live performance programs ({programs.length} programs)</p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  value={programSearchQuery}
                  onChange={(e) => setProgramSearchQuery(e.target.value)}
                  placeholder="🔍 Search programs by name or venue..."
                  className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                />
              </div>

              {/* Programs List */}
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
                      <p className="text-xs text-[#0B5A70]/50 mt-3">View Program →</p>
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

                {/* START LIVE MODE Button */}
                {selectedProgram.bhajanIds && selectedProgram.bhajanIds.length > 0 && (
                  <button
                    onClick={() => startLiveProgram(selectedProgram)}
                    className="w-full mt-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2"
                  >
                    🎤 START LIVE PERFORMANCE
                  </button>
                )}
              </div>

              {/* Bhajans in Program */}
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

                {/* Name */}
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

                {/* Date and Venue */}
                <div className="grid grid-cols-2 gap-3 mb-4">
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0B5A70]/50 hover:text-[#0B5A70] p-1.5 rounded-lg hover:bg-[#0B5A70]/5 transition-colors"
                          title="Open in Google Maps"
                        >
                          📍
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bhajans Section */}
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
                        setPickerCategoryFilter('');
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
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBhajanDown(index)}
                                disabled={index === programForm.bhajanIds.length - 1}
                                className="w-8 h-8 rounded-lg bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBhajanFromProgram(bhajanId)}
                                className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                                title="Remove"
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

                {/* Error */}
                {programFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {programFormError}
                  </div>
                )}

                {/* Save */}
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
                // Collect unique deities, categories, and keywords from user's library
                const pickerDeities = [...new Set(bhajans.map(b => b.deity).filter(Boolean))].sort();
                const pickerCategories = [...new Set(bhajans.map(b => b.category).filter(Boolean))].sort();
                const allKeywordsMap = {};
                bhajans.forEach(b => {
                  (b.keywords || []).forEach(kw => {
                    allKeywordsMap[kw] = (allKeywordsMap[kw] || 0) + 1;
                  });
                });
                const topKeywords = Object.entries(allKeywordsMap)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([kw]) => kw);

                // Gather keywords from bhajans already in the program for "Related" suggestions
                const programKeywords = new Set();
                programForm.bhajanIds.forEach(id => {
                  const b = getBhajanById(id);
                  if (b && b.keywords) b.keywords.forEach(kw => programKeywords.add(kw));
                });

                // Filter bhajans
                const searchLower = bhajanPickerSearch.toLowerCase();
                const filteredPickerBhajans = bhajans.filter(b => {
                  if (bhajanPickerSearch && !(
                    b.title.toLowerCase().includes(searchLower) ||
                    (b.lyrics && b.lyrics.toLowerCase().includes(searchLower)) ||
                    (b.keywords && b.keywords.some(kw => kw.toLowerCase().includes(searchLower)))
                  )) return false;
                  if (pickerDeityFilter && b.deity !== pickerDeityFilter) return false;
                  if (pickerCategoryFilter && b.category !== pickerCategoryFilter) return false;
                  if (pickerKeywordFilter && !(b.keywords && b.keywords.includes(pickerKeywordFilter))) return false;
                  return true;
                });

                // Related bhajans: not already in program, share keywords with program bhajans
                const relatedBhajans = programKeywords.size > 0 && !bhajanPickerSearch && !pickerDeityFilter && !pickerCategoryFilter && !pickerKeywordFilter
                  ? bhajans.filter(b => {
                      if (programForm.bhajanIds.includes(b.id)) return false;
                      return b.keywords && b.keywords.some(kw => programKeywords.has(kw));
                    }).slice(0, 8)
                  : [];

                const hasActiveFilters = bhajanPickerSearch || pickerDeityFilter || pickerCategoryFilter || pickerKeywordFilter;

                return (
                <div onClick={() => setShowBhajanPicker(false)} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div onClick={(e) => e.stopPropagation()} className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-lg w-full max-h-[85vh] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-[#0B5A70]/10 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#0B5A70]">Add Bhajans to Program</h3>
                      <button
                        onClick={() => setShowBhajanPicker(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>

                    {/* Search + Filters */}
                    <div className="p-4 border-b border-[#0B5A70]/10 space-y-3">
                      {/* Search bar */}
                      <input
                        type="text"
                        value={bhajanPickerSearch}
                        onChange={(e) => setBhajanPickerSearch(e.target.value)}
                        placeholder="🔍 Search by title, lyrics, or keyword..."
                        className="w-full px-3 py-2.5 border border-[#0B5A70]/15 rounded-lg focus:ring-2 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none text-sm bg-white"
                        autoFocus
                      />

                      {/* Filter row */}
                      <div className="flex gap-2">
                        <select
                          value={pickerDeityFilter}
                          onChange={(e) => setPickerDeityFilter(e.target.value)}
                          className={`flex-1 px-2 py-1.5 border rounded-lg text-xs outline-none bg-[#FFFCF8] transition-all ${
                            pickerDeityFilter
                              ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                              : 'border-[#0B5A70]/15'
                          }`}
                        >
                          <option value="">All Deities</option>
                          {pickerDeities.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                          value={pickerCategoryFilter}
                          onChange={(e) => setPickerCategoryFilter(e.target.value)}
                          className={`flex-1 px-2 py-1.5 border rounded-lg text-xs outline-none bg-[#FFFCF8] transition-all ${
                            pickerCategoryFilter
                              ? `border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold ${darkMode ? 'text-white' : 'text-[#0B5A70]'}`
                              : 'border-[#0B5A70]/15'
                          }`}
                        >
                          <option value="">All Categories</option>
                          {pickerCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {hasActiveFilters && (
                          <button
                            onClick={() => {
                              setBhajanPickerSearch('');
                              setPickerDeityFilter('');
                              setPickerCategoryFilter('');
                              setPickerKeywordFilter('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap px-2"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Keyword chips */}
                      {topKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {topKeywords.map(kw => (
                            <button
                              key={kw}
                              onClick={() => setPickerKeywordFilter(pickerKeywordFilter === kw ? '' : kw)}
                              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                                pickerKeywordFilter === kw
                                  ? 'bg-[#0B5A70] text-white shadow-md'
                                  : `${darkMode ? 'bg-[#0B5A70]/15 text-teal-300 border border-[#0B5A70]/25 hover:bg-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12 hover:bg-[#0B5A70]/10'}`
                              }`}
                            >
                              #{kw}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {bhajans.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[#0B5A70] font-semibold">Your library is empty</p>
                          <p className="text-sm text-gray-600 mt-1">Add bhajans to your library first</p>
                        </div>
                      ) : (
                        <>
                          {/* Related Bhajans Section - only when no active filters */}
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
                                      onClick={() => !isAdded && addBhajanToProgram(bhajan.id)}
                                      disabled={isAdded}
                                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                                        isAdded 
                                          ? 'bg-green-50 border-green-200 opacity-60 cursor-not-allowed'
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
                                          <span className="text-green-600 font-bold ml-2 text-sm">✓</span>
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

                          {/* All Bhajans (filtered) */}
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
                                  setPickerCategoryFilter('');
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
                                    onClick={() => !isAdded && addBhajanToProgram(bhajan.id)}
                                    disabled={isAdded}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                                      isAdded 
                                        ? 'bg-green-50 border-green-200 opacity-60 cursor-not-allowed'
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
                                        <span className="text-green-600 font-bold ml-2 text-sm">✓</span>
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
              {/* Library Header with Public/Personal Switcher */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Public ↔ Personal library switcher */}
                  <div className={`inline-flex rounded-xl p-1.5 border ${darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/20' : 'bg-[#0B5A70]/10 border-[#0B5A70]/20'}`}>
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md ${darkMode ? 'bg-[#0B5A70]/30 text-gray-100' : 'bg-white text-[#0B5A70] border border-[#0B5A70]/15'}`}
                    >
                      🌐 Public
                    </button>
                    <button
                      onClick={() => { if (guestMode && !user) { setGuestMode(false); } else { setCurrentView('library'); } }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#0B5A70]/10' : 'text-[#0B5A70]/70 hover:text-[#0B5A70] hover:bg-white/50'}`}
                    >
                      📚 My Library
                    </button>
                  </div>
                  {/* Add Bhajan (admin-only) - placed where Dashboard used to be */}
                  {isAdmin && (
                    <button
                      onClick={openAddPublicBhajan}
                      className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1 shadow-md"
                    >
                      + Add Bhajan
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar - page title removed as tab already indicates location.
                  Voice language toggle now sits inline with mic for less clutter. */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="🔍 Search public bhajans..."
                    className={`w-full px-4 py-3 pr-24 border rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-[#162226] border-[#0B5A70]/15 text-gray-100 focus:ring-[#0B5A70]/20 focus:border-[#0B5A70]/30'
                        : 'bg-white border-[#0B5A70]/12 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30'
                    }`}
                  />
                  {/* Voice language toggle (compact, sits inline next to mic) */}
                  <button
                    onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                    className={`absolute right-11 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      speechLang === 'hi-IN'
                        ? 'bg-[#0B5A70] text-white border-[#0B5A70]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20'
                    }`}
                    title={`Voice input: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}`}
                  >
                    {speechLang === 'hi-IN' ? 'HI' : 'EN'}
                  </button>
                  <button
                    onClick={() => startVoiceSearch('public')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : darkMode
                          ? 'text-[#0B5A70]/40 hover:text-[#0B5A70]/70 hover:bg-[#1e2e33]'
                          : 'text-[#0B5A70]/40 hover:text-[#0B5A70] hover:bg-[#0B5A70]/5'
                    }`}
                    title={isListening ? 'Listening...' : 'Voice search'}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Clear filters link - only appears when a filter is active.
                  Sits above the dropdowns row so it doesn't wrap awkwardly. */}
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

              {/* Filters - single row: Deity | Category | Keyword.
                  Active filters get amber ring + bold font so users see them at a glance. */}
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={publicFilterDeity}
                  onChange={(e) => setPublicFilterDeity(e.target.value)}
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

              {/* Quick Keywords - top 4 chips only. Full keyword list is
                  available in the "All Keywords" dropdown in the filters row above. */}
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

              {/* Public Bhajans List - skeleton loaders while data loads.
                  Structured placeholders feel much faster than a plain spinner
                  because users see the layout appear immediately. */}
              {publicLoading ? (
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
                        {/* Title placeholder */}
                        <div className={`h-5 rounded w-3/4 mb-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                        {/* Tags row placeholder */}
                        <div className="flex gap-2 mb-3">
                          <div className={`h-5 w-16 rounded-full ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                          <div className={`h-5 w-14 rounded-full ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#E65100]/5'}`}></div>
                        </div>
                        {/* Lyrics placeholder - 3 lines */}
                        <div className="space-y-2 mb-3">
                          <div className={`h-3 rounded ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-5/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-4/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                        </div>
                        {/* Bottom action placeholder */}
                        <div className={`h-9 rounded-lg mt-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}></div>
                      </div>
                    )
                  ))}
                </div>
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
                  {/* View density toggle - saved to localStorage.
                      Compact = title + first line of lyrics only (fits 4-6 cards per screen).
                      Full = title + tags + 3 lines lyrics + keywords (default). */}
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex bg-[#0B5A70]/5 rounded-lg p-0.5 border border-[#0B5A70]/10">
                      <button
                        onClick={() => setCompactView(false)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${!compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/50 hover:text-[#0B5A70]'}`}
                        title="Full card view"
                      >
                        ▤ Full
                      </button>
                      <button
                        onClick={() => setCompactView(true)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/50 hover:text-[#0B5A70]'}`}
                        title="Compact list view"
                      >
                        ☰ Compact
                      </button>
                    </div>
                  </div>

                <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {filteredPublicBhajans.slice(0, publicVisibleCount).map(bhajan => {
                    const isSaved = savedBhajanIds.has(bhajan.id);

                    // COMPACT VIEW - title + one lyrics line + save state on right.
                    // Clicking the row opens the bhajan (same as full card).
                    if (compactView) {
                      return (
                        <button
                          key={bhajan.id}
                          onClick={() => openPublicBhajanDetail(bhajan)}
                          className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                              {bhajan.title}
                            </h3>
                            <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {bhajan.deity} · {bhajan.category}
                            </p>
                          </div>
                          {isSaved ? (
                            <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                              ✓
                            </span>
                          ) : (
                            <span
                              onClick={(e) => { e.stopPropagation(); saveToMyLibrary(bhajan); }}
                              className="bg-[#0B5A70] hover:bg-[#094a5d] text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 cursor-pointer"
                            >
                              + Save
                            </span>
                          )}
                        </button>
                      );
                    }

                    // FULL CARD VIEW
                    return (
                      <div
                        key={bhajan.id}
                        className={`rounded-2xl p-5 border transition-all ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 shadow-[0_2px_12px_rgba(11,90,112,0.15)] hover:border-[#0B5A70]/30 hover:shadow-[0_4px_20px_rgba(11,90,112,0.25)]' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_2px_12px_rgba(11,90,112,0.06)] hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)]'}`}
                      >
                        <button
                          onClick={() => openPublicBhajanDetail(bhajan)}
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

                          {/* Lyrics preview - explicit max-height prevents rare
                              rendering bug where line-clamp + whitespace-pre-line
                              can leak height on iOS Safari when lyrics have many
                              trailing newlines or whitespace-only lines. */}
                          <p className={`text-sm line-clamp-3 mb-2 whitespace-pre-line max-h-16 overflow-hidden ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {(bhajan.lyrics || '').trim()}
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

                        {/* Action row - only Save/In Library. "Read" removed since
                            clicking the card body above already opens the bhajan. */}
                        <div className={`flex gap-2 mt-3 pt-3 border-t ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                          {isSaved ? (
                            <span className="flex-1 bg-green-50 text-green-700 font-semibold py-2 rounded-lg text-sm text-center">
                              ✓ In Your Library
                            </span>
                          ) : (
                            <button
                              onClick={() => saveToMyLibrary(bhajan)}
                              disabled={savingToLibrary}
                              className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
                            >
                              ➕ Add to Personal
                            </button>
                          )}
                        </div>

                        {(bhajan.saveCount > 0) && (
                          <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/40'}`}>
                            ✨ Added by {bhajan.saveCount} {bhajan.saveCount === 1 ? 'person' : 'people'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Load more sentinel - IntersectionObserver watches this div
                    and bumps visibleCount when it scrolls into view. Also
                    shows a subtle "loading more" indicator + a count summary. */}
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
                <p className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/60'}`}>
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
              </div>
            </>
          )}

          {/* ==============================================
              PUBLIC BHAJAN DETAIL VIEW
              ============================================== */}
          {currentView === 'public-bhajan-detail' && selectedPublicBhajan && (
            <>
              {/* Compact action bar: back button + pill actions.
                  All actions live in one row now: Save / Edit / Delete / View. */}
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentView('public-library')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Back
                </button>
                <div className="flex gap-1.5 flex-wrap">
                  {/* Add to Personal (small pill instead of big banner button) */}
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

                  {/* View settings pill (was up in title row before) */}
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

              <div className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 mb-4 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'}`}>
                {/* Title (smaller, max 2 lines - was xl 3xl before) */}
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
                  {/* Quick font size adjust - no need to open Reading View modal for
                      common tweaks. Range clamped to 14-40px to match the modal slider. */}
                  <div className="flex items-center justify-end gap-1 mb-2">
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Decrease font size"
                    >
                      Aa−
                    </button>
                    <span className={`text-xs w-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{readingSettings.fontSize}</span>
                    <button
                      onClick={() => setReadingSettings(prev => ({ ...prev, fontSize: Math.min(40, prev.fontSize + 2) }))}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Increase font size"
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

              {/* Related Bhajans - compact cards BELOW the main bhajan card */}
              {selectedPublicBhajan.keywords && selectedPublicBhajan.keywords.length > 0 && (() => {
                const relKws = new Set(selectedPublicBhajan.keywords);
                const related = publicBhajans
                  .filter(b => b.id !== selectedPublicBhajan.id && b.keywords && b.keywords.some(kw => relKws.has(kw)))
                  .map(b => ({
                    ...b,
                    matchCount: b.keywords.filter(kw => relKws.has(kw)).length,
                    matchedKws: b.keywords.filter(kw => relKws.has(kw))
                  }))
                  .sort((a, b) => b.matchCount - a.matchCount)
                  .slice(0, 6);
                if (related.length === 0) return null;
                return (
                  <div className="mt-6">
                    <p className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]'}`}>
                      ✨ Related Bhajans
                    </p>
                    <div className="space-y-1.5">
                      {related.map(b => (
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
                            <p className="text-xs text-gray-600 truncate">
                              {b.deity} · {b.category}
                              {b.matchedKws.length > 0 && (
                                <span className="text-[#E65100]/60"> · {b.matchedKws.slice(0, 2).map(k => `#${k}`).join(' ')}</span>
                              )}
                            </p>
                          </div>
                          <span className="text-[#0B5A70]/30 text-lg flex-shrink-0">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* ==============================================
              ADMIN PANEL VIEW
              ============================================== */}
          {currentView === 'admin-panel' && isAdmin && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView('public-library')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← Dashboard
                </button>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                  👑 Admin Only
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#0B5A70]">🔧 Admin Panel</h2>
                <p className="text-sm text-[#0B5A70]/70">Manage the Public Library</p>
              </div>

              {/* Stats Card */}
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

              {/* Manual Add Bhajan Card */}
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
              
              {/* MANAGE LISTS (Deities, Categories, Keywords) */}
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
                          >✓</button>
                          <button
                            onClick={() => { setEditingItem(null); setEditingValue(''); }}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                            title="Cancel (Esc)"
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
                          >✏️</button>
                          <button
                            onClick={() => deleteConfigItem('deity', name)}
                            className="ml-0.5 text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
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
                          >✓</button>
                          <button
                            onClick={() => { setEditingItem(null); setEditingValue(''); }}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
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
                          >✏️</button>
                          <button
                            onClick={() => deleteConfigItem('category', name)}
                            className="ml-0.5 text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
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
                          >✓</button>
                          <button
                            onClick={() => { setEditingItem(null); setEditingValue(''); }}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
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
                          >✏️</button>
                          <button
                            onClick={() => deleteConfigItem('keyword', name)}
                            className="ml-0.5 text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
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
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-[#0B5A70]/12/60">
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

                    {/* Preview List */}
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

              {/* Quick Info */}
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
                        {/* English fallback - keeps the original English word.
                            Useful for proper nouns (Krishna, Radha) and bilingual titles
                            (कृष्ण भजन / Krishna Bhajan). Styled subtly so it doesn't
                            compete with Hindi options; positioned last as an escape hatch. */}
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
                        {/* English fallback - keeps the original English word.
                            Useful for proper nouns (Krishna, Radha) and bilingual titles
                            (कृष्ण भजन / Krishna Bhajan). Styled subtly so it doesn't
                            compete with Hindi options; positioned last as an escape hatch. */}
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

                {/* NEW: Add lyrics from Image / PDF / Camera (on-device OCR) */}
                <div className="mb-3 p-3 bg-[#0B5A70]/5 border border-[#0B5A70]/12 rounded-xl">
                  <p className="text-xs font-semibold text-[#0B5A70] mb-2">
                    📥 Auto-fill lyrics from a photo, PDF, or camera — text is read on your device, nothing is uploaded or stored as a file
                  </p>

                  {/* First-time warning about OCR engine download */}
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

                  {/* Hidden file inputs for public form */}
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
                        {/* English fallback - keeps the original English word.
                            Useful for proper nouns (Krishna, Radha) and bilingual titles
                            (कृष्ण भजन / Krishna Bhajan). Styled subtly so it doesn't
                            compete with Hindi options; positioned last as an escape hatch. */}
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
                            : `${darkMode ? 'bg-[#0B5A70]/15 text-teal-300 border border-[#0B5A70]/25 hover:bg-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12 hover:bg-[#0B5A70]/10'}`
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
      </div>
    );
  }

  // ==============================================
  // LIVE PROGRAM MODE (Fullscreen)
  // ==============================================
  if (user && userProfile && currentView === 'live-program' && selectedProgram) {
    const currentBhajanId = selectedProgram.bhajanIds[liveProgramIndex];
    const currentBhajan = getBhajanById(currentBhajanId);
    const totalBhajans = selectedProgram.bhajanIds.length;
    
    if (!currentBhajan) {
      return (
        <div className="min-h-screen bg-[#FFF8F0] p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-[#0B5A70] mb-4">⚠️ This bhajan is not available</p>
            <p className="text-sm text-gray-600 mb-4">It may have been deleted from your library</p>
            <button
              onClick={exitLiveProgram}
              className="bg-[#0B5A70] hover:bg-[#094a5d] text-white px-4 py-2 rounded-xl"
            >
              Exit Live Mode
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        {/* Live Header */}
        <div className="bg-[#FFF8F0]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#0B5A70]/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={exitLiveProgram}
              className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 text-sm"
            >
              ✕ Exit Live
            </button>
            <div className="text-center flex-1 mx-4">
              <p className="text-xs text-[#0B5A70]/60 font-semibold">🎤 LIVE PROGRAM</p>
              <p className="text-sm font-bold text-[#0B5A70] truncate">{selectedProgram.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Bhajan</p>
              <p className="text-lg font-bold text-[#E65100]">{liveProgramIndex + 1} / {totalBhajans}</p>
            </div>
          </div>
          
          {/* Font Size Controls */}
          <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setLiveFontSize(Math.max(14, liveFontSize - 2))}
              className="w-8 h-8 rounded-lg bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70] font-bold"
              title="Decrease font"
            >
              A−
            </button>
            <span className="text-xs text-gray-500 min-w-[40px] text-center">{liveFontSize}px</span>
            <button
              onClick={() => setLiveFontSize(Math.min(40, liveFontSize + 2))}
              className="w-8 h-8 rounded-lg bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 text-[#0B5A70] font-bold"
              title="Increase font"
            >
              A+
            </button>
            {liveWakeLock && (
              <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                🔦 Screen On
              </span>
            )}
          </div>
        </div>
        
        {/* Bhajan Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0B5A70] mb-3">
            {currentBhajan.title}
          </h1>
          
          {currentBhajan.dhun && (
            <div className="bg-[#0B5A70]/5 border-l-4 border-[#E65100]/40 p-3 rounded-r-lg mb-4">
              <p className="text-sm text-[#E65100]">
                <span className="font-semibold">तर्ज़ / धुन:</span> {currentBhajan.dhun}
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-[#0B5A70]/8 text-[#0B5A70] px-3 py-1 rounded-full text-sm font-semibold">
              {currentBhajan.deity}
            </span>
            {currentBhajan.scale && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
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
        
        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#FFF8F0]/95 backdrop-blur-md border-t border-[#0B5A70]/10 shadow-2xl z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              onClick={livePrev}
              disabled={liveProgramIndex === 0}
              className="flex-1 bg-[#0B5A70]/8 hover:bg-[#0B5A70]/15 disabled:opacity-30 disabled:cursor-not-allowed text-[#0B5A70] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              ← Previous
            </button>
            <div className="text-center min-w-[80px]">
              <p className="text-xs text-gray-500">Bhajan</p>
              <p className="text-lg font-bold text-[#E65100]">{liveProgramIndex + 1} / {totalBhajans}</p>
            </div>
            <button
              onClick={liveNext}
              disabled={liveProgramIndex >= totalBhajans - 1}
              className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // LANDING / SIGN-IN SCREEN
  // ==============================================
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-center text-sm font-semibold z-50 shadow-md">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            ⚠️ You're offline. Please check your internet connection.
          </span>
        </div>
      )}
      {/* App Update Prompt */}
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
                  <span>Google Hindi typing now works in Public Library add/edit forms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0B5A70] font-bold">✓</span>
                  <span>You will now see this prompt every time the app is updated on GitHub</span>
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
          {/* Cream hero with wordmark - matches new brand aesthetic.
              Wordmark component reused from header (single source of truth). */}
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

                <p className="text-[11px] text-[#0B5A70]/40 text-center">One tap sign-in — no passwords needed</p>

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

                {/* Phone login temporarily hidden - will be enabled when Blaze plan is active */}
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

                {/* Benefit-focused features. Verb-first, action-oriented.
                    Answers "what do I get to DO?" not "what does the app HAVE?" */}
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

            {userCount > 0 && (
              <div className="text-center pt-4 border-t border-[#0B5A70]/10">
                <p className="text-xs text-[#0B5A70]">
                  🌟 <strong className="text-[#E65100]">{userCount}+</strong> {userCount === 1 ? 'devotee has' : 'devotees have'} joined
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer credit - now on cream background so uses teal (not white) text.
            Music note replaces 🕉️ for consistency with new brand identity. */}
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
// Catches any unhandled React errors (e.g. OCR crashes, Firestore errors)
// and shows a friendly recovery screen instead of a white page.
// Without this, ANY component crash = users see a blank screen with no
// recovery option - they'd have to know to hard-refresh or clear cache.
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
    // Log for debugging (visible in browser console + can be sent to error tracking later)
    console.error('🚨 App crashed:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReload = () => {
    // Clear caches that might be causing repeated crashes
    try {
      // Do NOT clear login state or user preferences - only crash-related caches
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

// Wrap App in ErrorBoundary before exporting
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
