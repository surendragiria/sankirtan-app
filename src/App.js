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

// Language options for bhajans (with Google Input Tools language codes)
const LANGUAGE_OPTIONS = [
  { value: 'Hindi', code: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'English', code: 'en', label: 'English' },
  { value: 'Marwari', code: 'hi', label: 'मारवाड़ी (Marwari)' },
  { value: 'Gujarati', code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'Marathi', code: 'mr', label: 'मराठी (Marathi)' },
  { value: 'Punjabi', code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { value: 'Bengali', code: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'Tamil', code: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'Telugu', code: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'Kannada', code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'Malayalam', code: 'ml', label: 'മലയാളം (Malayalam)' },
  { value: 'Sanskrit', code: 'sa', label: 'संस्कृतम् (Sanskrit)' },
  { value: 'Odia', code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { value: 'Other', code: 'en', label: 'Other' }
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
  const [currentView, setCurrentView] = useState('public-library'); // HOME = Public Library. Views: 'public-library', 'library', 'dashboard', 'bhajan-detail', 'add-bhajan', 'edit-bhajan', 'programs', 'program-detail', 'create-program', 'edit-program', 'live-program', 'public-bhajan-detail', 'admin-panel'
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
  const [publicFilterLanguage, setPublicFilterLanguage] = useState('');
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
  const [speechLang, setSpeechLang] = useState('en-IN'); // 'en-IN' or 'hi-IN'

  // Reading view settings
  const [readingSettings, setReadingSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('sankirtan-reading-settings');
      return saved ? JSON.parse(saved) : { fontSize: 18, fontFamily: 'sans-serif', lineHeight: 1.8, textAlign: 'center' };
    } catch {
      return { fontSize: 18, fontFamily: 'sans-serif', lineHeight: 1.8, textAlign: 'center' };
    }
  });
  const [showReadingSettings, setShowReadingSettings] = useState(false);

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
    if (!user || !userProfile) {
      setBhajans([]);
      return;
    }

    setBhajansLoading(true);
    const db = window.firebase.firestore();
    const bhajansRef = db.collection('users').doc(user.uid).collection('bhajans');
    
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
          },
          (error) => {
            console.log('Bhajans real-time error (using cached):', error.message);
          }
        );
    } catch (e) {
      console.log('Could not set up bhajans listener');
    }

    return () => unsubscribe();
  }, [user, userProfile]);

  // ==============================================
  // LOAD USER'S PROGRAMS (Real-time)
  // ==============================================
  useEffect(() => {
    if (!user || !userProfile) {
      setPrograms([]);
      return;
    }

    setProgramsLoading(true);
    const db = window.firebase.firestore();
    const programsRef = db.collection('users').doc(user.uid).collection('programs');
    
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
          },
          (error) => {
            console.log('Programs real-time error:', error.message);
          }
        );
    } catch (e) {
      console.log('Could not set up programs listener');
    }

    return () => unsubscribe();
  }, [user, userProfile]);

  // ==============================================
  // LOAD PUBLIC LIBRARY BHAJANS
  // ==============================================
  useEffect(() => {
    if (!user) {
      setPublicBhajans([]);
      return;
    }

    setPublicLoading(true);
    const db = window.firebase.firestore();
    const publicRef = db.collection('publicBhajans');
    
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
        console.log(`✅ Loaded ${list.length} public bhajans`);
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
        },
        (error) => {
          console.log('Real-time listener error (using cached data):', error.message);
        }
      );
    } catch (listenerErr) {
      console.log('Could not set up real-time listener:', listenerErr.message);
    }

    return () => unsubscribe();
  }, [user]);

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
  // ==============================================
  const startVoiceSearch = (targetField) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome or Safari.');
      return;
    }
    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = speechLang;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
    };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (targetField === 'library') setSearchQuery(transcript);
      else if (targetField === 'public') setPublicSearchQuery(transcript);
      else if (targetField === 'bhajanPicker') setBhajanPickerSearch(transcript);
    };
    recognition.start();
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
      // Get language code from current form (default to Hindi)
      const currentLang = bhajanForm.language || publicBhajanForm.language || 'Hindi';
      const langObj = LANGUAGE_OPTIONS.find(l => l.value === currentLang);
      const langCode = langObj?.code || 'hi';
      
      // Skip transliteration for English
      if (langCode === 'en') {
        setTransliterationSuggestions([]);
        return;
      }
      
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
        const currentLang = bhajanForm.language || 'Hindi';
        const langObj = LANGUAGE_OPTIONS.find(l => l.value === currentLang);
        const langCode = langObj?.code || 'hi';
        
        // Skip conversion for English
        if (langCode !== 'en') {
          const cachedSuggestions = suggestionsCache[`${langCode}:${lowerWord}`] || 
            suggestionsCache[lowerWord] ||
            (langCode === 'hi' && HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);
          
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
        const currentLang = publicBhajanForm.language || 'Hindi';
        const langObj = LANGUAGE_OPTIONS.find(l => l.value === currentLang);
        const langCode = langObj?.code || 'hi';

        if (langCode !== 'en') {
          const cachedSuggestions = suggestionsCache[`${langCode}:${lowerWord}`] || 
            suggestionsCache[lowerWord] ||
            (langCode === 'hi' && HINDI_FALLBACK_MAP[lowerWord] ? [HINDI_FALLBACK_MAP[lowerWord]] : null);

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
    if (!user || !userProfile) return;
    
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
    if (publicFilterLanguage && bhajan.language !== publicFilterLanguage) return false;
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
  // LOADING SCREEN
  // ==============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4">🕉️</div>
          <h1 className="text-4xl font-bold text-white mb-2">Sankirtan</h1>
          <p className="text-orange-100 text-lg">भजन से भगवान तक</p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mx-auto"></div>
          </div>
          <p className="text-orange-100 text-sm mt-4">
            Loading your devotional experience...
          </p>
          {isOffline && (
            <p className="text-white text-xs mt-2 bg-red-600 rounded-lg px-3 py-1 inline-block">
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white text-center">
              <div className="text-5xl mb-2">🙏</div>
              <h2 className="text-2xl font-bold">Welcome to Sankirtan!</h2>
              <p className="text-orange-100 text-sm mt-1">Let's set up your profile</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  placeholder="Enter your full name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">
                  Bio (optional)
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  placeholder="e.g., Bhajan singer, Kirtan lover"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  placeholder="e.g., Delhi, India"
                />
              </div>

              <div className="pt-2 border-t border-orange-100">
                <p className="text-xs text-gray-500 mb-2">📱 Social & Contact (optional)</p>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    value={profileForm.whatsapp}
                    onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none text-sm"
                    placeholder="WhatsApp number"
                  />
                  <input
                    type="text"
                    value={profileForm.youtube}
                    onChange={(e) => setProfileForm({...profileForm, youtube: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none text-sm"
                    placeholder="YouTube channel URL"
                  />
                  <input
                    type="text"
                    value={profileForm.instagram}
                    onChange={(e) => setProfileForm({...profileForm, instagram: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none text-sm"
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
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  // MAIN AUTHENTICATED APP
  // ==============================================
  if (user && userProfile) {
    const currentStep = ONBOARDING_STEPS[onboardingStep];
    
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50'}`}>
        {/* ==============================================
            ONBOARDING TOUR MODAL
            ============================================== */}
        {showOnboarding && currentStep && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 ">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white text-center relative">
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
                
                <p className="text-xs text-orange-100">
                  Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}
                </p>
              </div>
              
              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-2xl font-bold text-amber-900 mb-3">
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
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
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
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-6 text-white text-center">
                <div className="text-5xl mb-2">🎉</div>
                <h3 className="text-2xl font-bold">App Updated!</h3>
                <p className="text-sm text-green-100 mt-1">Sankirtan just got better</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-4">
                  A new version of Sankirtan has been deployed. Here is what is new:
                </p>
                <ul className="text-sm text-gray-700 space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Google Hindi typing now works in Public Library add/edit forms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>You will now see this prompt every time the app is updated on GitHub</span>
                  </li>
                </ul>
                <button
                  onClick={dismissUpdatePrompt}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg"
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
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white text-center relative">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl leading-none w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  ×
                </button>
                <div className="text-5xl mb-2">💬</div>
                <h3 className="text-2xl font-bold">Share Your Feedback</h3>
                <p className="text-sm text-orange-100 mt-1">
                  Your thoughts help us improve Sankirtan
                </p>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {feedbackSuccess ? (
                  // Success message
                  <div className="text-center py-6">
                    <div className="text-6xl mb-3">🙏</div>
                    <h4 className="text-xl font-bold text-amber-900 mb-2">Thank You!</h4>
                    <p className="text-gray-600">
                      Your feedback has been received.
                      <br />
                      बाबोसा जी की कृपा से हम और बेहतर बनाएंगे! 🕉️
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-semibold text-amber-900 mb-2">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none text-base"
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
                    
                    <div className="mt-4 p-3 bg-orange-50 rounded-lg text-xs text-amber-800">
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
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all"
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
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className={`rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
              <div className={`p-6 text-center ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-br from-orange-500 to-amber-500'} text-white`}>
                <div className="text-5xl mb-2">📖</div>
                <h3 className="text-2xl font-bold">Reading View</h3>
                <p className="text-sm opacity-90 mt-1">Customize how lyrics appear</p>
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
                    max="32"
                    step="1"
                    value={readingSettings.fontSize}
                    onChange={(e) => setReadingSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Font Style</label>
                  <select
                    value={readingSettings.fontFamily}
                    onChange={(e) => setReadingSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border-2 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-orange-200'}`}
                  >
                    <option value="sans-serif">Sans-Serif (Modern)</option>
                    <option value="serif">Serif (Classic)</option>
                    <option value="monospace">Monospace (Fixed)</option>
                    <option value="cursive">Cursive (Decorative)</option>
                    <option value="system-ui">System UI</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold">Line Spacing</label>
                    <span className="text-sm">{readingSettings.lineHeight}</span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.5"
                    step="0.1"
                    value={readingSettings.lineHeight}
                    onChange={(e) => setReadingSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Text Alignment</label>
                  <div className="flex gap-2">
                    {['left', 'center', 'right', 'justify'].map(align => (
                      <button
                        key={align}
                        onClick={() => setReadingSettings(prev => ({ ...prev, textAlign: align }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                          readingSettings.textAlign === align
                            ? 'bg-orange-500 text-white shadow-md'
                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-orange-50 text-amber-800 hover:bg-orange-100'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowReadingSettings(false)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg"
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
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-300 p-5">
              <div className="flex items-start gap-3">
                <div className="text-4xl">🕉️</div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 mb-1">Add Sankirtan to Home Screen</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Install for a native app experience - quick access, offline support, and full-screen mode!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInstallApp}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-md flex-1"
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
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-300 p-5">
              <div className="flex items-start gap-3">
                <div className="text-4xl">🕉️</div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 mb-1">Add Sankirtan to Home Screen</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Get quick access - just like a native app!
                  </p>
                  <div className="bg-orange-50 rounded-lg p-3 mb-3 text-xs text-amber-900">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Tap the <span className="inline-block bg-white border border-gray-300 rounded px-1.5 py-0.5 text-blue-600">Share ⬆️</span> button below</li>
                      <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                      <li>Tap <strong>"Add"</strong> in the top right</li>
                      <li>Find Sankirtan on your home screen! 🎉</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={dismissInstallPrompt}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-4 py-2 rounded-lg text-sm flex-1"
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
          <div className="bg-blue-500 text-white px-4 py-3 text-center text-sm sticky top-0 z-50 shadow-md">
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
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="text-3xl">🕉️</div>
              <div className="text-left">
                <h1 className="text-lg font-bold text-amber-900">Sankirtan</h1>
                <p className="text-xs text-amber-600">भजन से भगवान तक</p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={openAdminPanel}
                  className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  title="Admin Panel"
                >
                  🔧 Admin
                </button>
              )}
              {userProfile.photoURL && (
                <img 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName}
                  className="w-9 h-9 rounded-full border-2 border-orange-300"
                />
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-amber-900">{userProfile.displayName}</p>
                {userProfile.verified && <span className="text-xs text-blue-600">✓ Verified</span>}
                {isAdmin && <span className="text-xs text-purple-600 ml-1">👑 Admin</span>}
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
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
                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"
                title="Show Tour"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="text-orange-600 hover:text-orange-800 p-2 rounded-lg hover:bg-orange-50"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Switch between views */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          
          {/* ==============================================
              DASHBOARD VIEW
              ============================================== */}
          {currentView === 'dashboard' && (
            <>
              {/* Welcome Card */}
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl shadow-xl p-8 text-white mb-6">
                <h2 className="text-3xl font-bold mb-2">
                  Welcome, {userProfile.displayName}! 🙏
                </h2>
                <p className="text-orange-100 mb-4">
                  Your bhajan journey begins here.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">{userProfile.stats?.bhajanCount || 0}</div>
                    <div className="text-xs text-orange-100">Bhajans</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">{userProfile.stats?.publicBhajanCount || 0}</div>
                    <div className="text-xs text-orange-100">Public</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">{userProfile.stats?.followerCount || 0}</div>
                    <div className="text-xs text-orange-100">Followers</div>
                  </div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* My Library - NOW ACTIVE */}
                <button
                  onClick={() => setCurrentView('library')}
                  className="bg-white rounded-2xl shadow-md p-6 border-2 border-orange-300 hover:border-orange-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="text-4xl mb-3">📚</div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">My Library</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Add and manage your personal bhajan collection
                  </p>
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    ✨ Available Now! ({bhajans.length} bhajans)
                  </span>
                </button>

                <button
                  onClick={openPublicLibrary}
                  className="bg-white rounded-2xl shadow-md p-6 border-2 border-orange-300 hover:border-orange-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="text-4xl mb-3">🌐</div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Public Library</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Browse curated bhajans & save your favorites
                  </p>
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    ✨ {publicBhajans.length > 0 ? `${publicBhajans.length} bhajans available` : 'Loading bhajans...'}
                  </span>
                </button>

                <button
                  onClick={openPrograms}
                  className="bg-white rounded-2xl shadow-md p-6 border-2 border-orange-300 hover:border-orange-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="text-4xl mb-3">🎵</div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Programs & Setlists</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Create playlists for live performances
                  </p>
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    ✨ Available Now! ({programs.length} programs)
                  </span>
                </button>
              </div>

              {/* ADMIN PANEL CARD (Only visible to admin) */}
              {isAdmin && (
                <div className="mb-6">
                  <button
                    onClick={openAdminPanel}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-2xl shadow-xl p-6 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">👑</div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold mb-1">Admin Panel</h3>
                        <p className="text-purple-100 text-sm">Manage Public Library • Import Bhajans • View Stats</p>
                      </div>
                    </div>
                    <div className="text-3xl">→</div>
                  </button>
                </div>
              )}

              {/* Footer Credit */}
              <div className="text-center py-6">
                <p className="text-xs text-amber-700 mb-2">
                  Founded for the Bhajan Community 🙏 by Grace of <strong>Babosa Bhagwan</strong> 🕉️
                </p>
                <button
                  onClick={() => {
                    setShowFeedbackModal(true);
                    setFeedbackText('');
                    setFeedbackError('');
                    setFeedbackSuccess(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors"
                >
                  💬 Share feedback or suggestions
                </button>
              </div>
            </>
          )}

          {/* ==============================================
              MY LIBRARY VIEW
              ============================================== */}
          {currentView === 'library' && (
            <>
              {/* Library Header with Public/Personal Switcher */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Public ↔ Personal library switcher */}
                  <div className="inline-flex bg-orange-100 rounded-xl p-1 shadow-inner">
                    <button
                      onClick={openPublicLibrary}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-700 hover:text-amber-900 transition-all"
                    >
                      🌐 Public
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-amber-900 shadow-md"
                    >
                      📚 My Library
                    </button>
                  </div>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="text-orange-600 hover:text-orange-800 text-sm"
                    title="Go to Dashboard"
                  >
                    🏠 Dashboard
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={openPrograms}
                    className="bg-white border-2 border-orange-300 hover:border-orange-500 text-amber-800 font-semibold px-3 py-2 rounded-xl text-sm flex items-center gap-1"
                    title="View your programs"
                  >
                    🎵 Programs ({programs.length})
                  </button>
                  <button
                    onClick={openCreateProgram}
                    className="bg-white border-2 border-orange-300 hover:border-orange-500 text-amber-800 font-semibold px-3 py-2 rounded-xl text-sm flex items-center gap-1"
                    title="Create a new program / setlist from your bhajans"
                  >
                    <span className="text-lg leading-none">+</span> Create Program
                  </button>
                  <button
                    onClick={openAddBhajan}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                  >
                    <span className="text-lg">+</span> Add Bhajan
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold text-amber-900">📚 My Library</h2>
                <p className="text-sm text-amber-700">Your personal bhajan collection ({bhajans.length} bhajans)</p>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      speechLang === 'hi-IN'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                    }`}
                    title="Toggle voice search language"
                  >
                    {speechLang === 'hi-IN' ? '🇮🇳 HI' : '🇬🇧 EN'}
                  </button>
                  <span className="text-xs text-gray-500 self-center">Voice search language</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search bhajans (title, lyrics, keywords)..."
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-gray-100 focus:ring-gray-700 focus:border-gray-500'
                        : 'border-orange-200 focus:ring-orange-200 focus:border-orange-400'
                    }`}
                  />
                  <button
                    onClick={() => startVoiceSearch('library')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : darkMode
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                          : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
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

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-6">
                <select
                  value={filterDeity}
                  onChange={(e) => setFilterDeity(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Deities</option>
                  {allDeityOptions.map(d => (
                    <option key={d.value} value={d.value}>{d.value}</option>
                  ))}
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Categories</option>
                  {allCategoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {(searchQuery || filterDeity || filterCategory || libraryFilterKeyword) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterDeity('');
                      setFilterCategory('');
                      setLibraryFilterKeyword('');
                    }}
                    className="px-3 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Keyword Chips - Quick Filter */}
              <div className="mb-6">
                <p className="text-xs text-amber-700 font-semibold mb-2">Quick Keywords (tap to filter):</p>
                <div className="flex flex-wrap gap-2">
                  {allKeywordOptions.map(kw => (
                    <button
                      key={kw}
                      onClick={() => setLibraryFilterKeyword(libraryFilterKeyword === kw ? '' : kw)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        libraryFilterKeyword === kw
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-orange-50 text-amber-800 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      {libraryFilterKeyword === kw ? '✓ ' : ''}#{kw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bhajans List */}
              {bhajansLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-400 border-t-transparent mx-auto mb-3"></div>
                  <p className={`${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Loading your bhajans...</p>
                </div>
              ) : filteredBhajans.length === 0 ? (
                <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-orange-200'}`}>
                  {bhajans.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-lg font-bold text-amber-900 mb-2">Your library is empty!</h3>
                      <p className="text-sm text-gray-600 mb-4">Start by adding your first bhajan</p>
                      <button
                        onClick={openAddBhajan}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2"
                      >
                        <span className="text-lg">+</span> Add Your First Bhajan
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-amber-900 font-semibold">No bhajans match your filters</p>
                      <p className="text-sm text-gray-600 mt-1">Try adjusting your search or filters</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBhajans.map(bhajan => (
                    <button
                      key={bhajan.id}
                      onClick={() => openBhajanDetail(bhajan)}
                      className={`rounded-2xl shadow-md p-5 border-2 hover:border-orange-400 hover:shadow-xl transition-all text-left ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-orange-500' : 'bg-white border-orange-100'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-amber-900 flex-1 line-clamp-2">
                          {bhajan.title}
                        </h3>
                      </div>

                      {bhajan.dhun && (
                        <p className="text-xs text-orange-600 mb-2">
                          <span className="font-semibold">तर्ज़:</span> {bhajan.dhun}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {bhajan.deity}
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          {bhajan.category}
                        </span>
                        {bhajan.scale && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            🎵 {bhajan.scale}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                        {bhajan.lyrics}
                      </p>

                      {bhajan.keywords && bhajan.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {bhajan.keywords.slice(0, 4).map(kw => (
                            <span key={kw} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              #{kw}
                            </span>
                          ))}
                          {bhajan.keywords.length > 4 && (
                            <span className="text-xs text-gray-500">+{bhajan.keywords.length - 4}</span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-orange-500 mt-3">Read →</p>
                    </button>
                  ))}
                </div>
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
                <button
                  onClick={() => setCurrentView('library')}
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Back to Library
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditBhajan(selectedBhajan)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-sm font-semibold"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteBhajan(selectedBhajan)}
                    className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-semibold"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Bhajan Content */}
              <div className={`rounded-2xl shadow-lg p-6 md:p-8 mb-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                <div className="flex items-start justify-between mb-3">
                  <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${darkMode ? 'text-amber-100' : 'text-amber-900'}`}>
                    {selectedBhajan.title}
                  </h1>
                  <button
                    onClick={() => setShowReadingSettings(true)}
                    className={`p-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-orange-100 text-amber-800 hover:bg-orange-200'}`}
                    title="Reading view options"
                  >
                    ⚙️ View
                  </button>
                </div>

                {selectedBhajan.dhun && (
                  <div className={`border-l-4 border-orange-400 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
                    <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedBhajan.dhun}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                    {selectedBhajan.deity}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                    📖 {selectedBhajan.category}
                  </span>
                  {selectedBhajan.language && (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800'}`}>
                      🗣️ {selectedBhajan.language}
                    </span>
                  )}
                  {selectedBhajan.scale ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                      🎵 Scale: {selectedBhajan.scale}
                    </span>
                  ) : (
                    <button
                      onClick={() => openEditBhajan(selectedBhajan)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold border border-dashed ${darkMode ? 'bg-gray-700 text-gray-400 border-gray-500 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 border-gray-400 hover:bg-purple-100 hover:text-purple-800'}`}
                      title="Click to add scale/raag"
                    >
                      + Add Scale
                    </button>
                  )}
                </div>

                <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
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
                  <div className="mt-6 pt-4 border-t border-orange-100">
                    <p className="text-xs text-gray-500 mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBhajan.keywords.map(kw => (
                        <span key={kw} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBhajan.source && (
                  <div className="mt-4 pt-4 border-t border-orange-100">
                    <a
                      href={selectedBhajan.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-semibold"
                    >
                      🔗 View Source
                    </a>
                  </div>
                )}
              </div>
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
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Cancel
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-amber-900 mb-6">
                  {currentView === 'edit-bhajan' ? '✏️ Edit Bhajan' : '➕ Add New Bhajan'}
                </h2>

                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none text-lg"
                      placeholder={hindiTypingEnabled ? "Type: om jai jagdish hare" : "e.g., ॐ जय जगदीश हरे"}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'title' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-orange-300 rounded-lg shadow-2xl p-2 flex flex-wrap gap-2 items-center z-30">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                                : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deity and Category */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-1">
                      Deity
                    </label>
                    <select
                      value={bhajanForm.deity}
                      onChange={(e) => setBhajanForm({...bhajanForm, deity: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
                    >
                      {allDeityOptions.map(d => (
                        <option key={d.value} value={d.value}>{d.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-1">
                      Category
                    </label>
                    <select
                      value={bhajanForm.category}
                      onChange={(e) => setBhajanForm({...bhajanForm, category: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
                    >
                      {allCategoryOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Language dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Language / भाषा
                  </label>
                  <select
                    value={bhajanForm.language}
                    onChange={(e) => setBhajanForm({...bhajanForm, language: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
                  >
                    {LANGUAGE_OPTIONS.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Typing will convert to selected script automatically
                  </p>
                </div>

                {/* Dhun / Tarz */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                      placeholder={hindiTypingEnabled ? "Type in English, press space" : "e.g., तर्ज़: तुझे देखा तो..."}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'dhun' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-orange-300 rounded-lg shadow-2xl p-2 flex flex-wrap gap-2 items-center z-30">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                                : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Scale */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Scale / Raag
                  </label>
                  <input
                    type="text"
                    value={bhajanForm.scale}
                    onChange={(e) => setBhajanForm({...bhajanForm, scale: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                    placeholder="e.g., Raag Yaman, C# Scale"
                  />
                </div>

                {/* Lyrics with Hindi Typing */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-amber-900">
                      Lyrics <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setHindiTypingEnabled(!hindiTypingEnabled)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                        hindiTypingEnabled
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                      title={hindiTypingEnabled ? 'Turn off Hindi typing' : 'Turn on Hindi typing'}
                    >
                      {hindiTypingEnabled ? '🇮🇳 हिंदी ON' : '🔤 Hindi OFF'}
                    </button>
                  </div>
                  
                  {/* Add lyrics from Image / PDF / Camera (on-device OCR - no files uploaded) */}
                  <div className="mb-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <p className="text-xs font-semibold text-blue-900 mb-2">
                      📥 Auto-fill lyrics from a photo, PDF, or camera — text is read on your device, nothing is uploaded or stored as a file
                    </p>

                    {/* First-time warning about OCR engine download */}
                    {!localStorage.getItem('sankirtan-tesseract-langs-cached') && !ocrProcessing && (
                      <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900">
                        ⚠️ <strong>First-time use:</strong> The OCR engine (~15 MB) will download once and be cached. Please use WiFi if possible.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={ocrProcessing}
                        onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        📷 Camera
                      </button>
                      <button
                        type="button"
                        disabled={ocrProcessing}
                        onClick={() => imageInputRef.current && imageInputRef.current.click()}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        🖼️ Upload Image
                      </button>
                      <button
                        type="button"
                        disabled={ocrProcessing}
                        onClick={() => pdfInputRef.current && pdfInputRef.current.click()}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
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
                      <div className="mt-3 p-3 bg-white border-2 border-blue-300 rounded-lg">
                        <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                            style={{ width: ocrProgress + '%' }}
                          ></div>
                        </div>
                        <p className="text-xs font-semibold text-blue-900">{ocrMessage || 'Processing...'}</p>
                        {!localStorage.getItem('sankirtan-tesseract-langs-cached') && (
                          <p className="text-[10px] text-blue-700 mt-1">
                            💡 First-time setup takes 30-60 seconds. Future uses will be instant.
                          </p>
                        )}
                      </div>
                    )}
                    {!ocrProcessing && ocrMessage && (
                      <p className="text-xs font-semibold text-blue-900 mt-2">{ocrMessage}</p>
                    )}
                    <p className="text-xs text-blue-700 mt-2">
                      💡 Works best with clear, printed Hindi/English text. Handwriting may need manual correction. Scanned PDFs supported (up to 10 pages).
                    </p>
                  </div>

                  {hindiTypingEnabled && (
                    <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs text-orange-800">
                        ✨ Type in English, press <kbd className="bg-white px-1.5 py-0.5 rounded border text-xs">space</kbd> to auto-convert to Hindi
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none font-mono text-base"
                      placeholder={hindiTypingEnabled ? "Type: jai shri babosa (press space to convert)" : "भजन के बोल यहाँ लिखें..."}
                      style={{ lineHeight: '1.8' }}
                    />
                    
                    {/* Hindi Suggestions Popup - positioned above textarea */}
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'lyrics' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-orange-400 rounded-xl shadow-2xl p-2 flex flex-wrap gap-2 items-center z-30">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                                : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                            }`}
                            title={idx === 0 ? 'Default (press space)' : `Alternative ${idx + 1}`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
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
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-orange-50 text-amber-800 border border-orange-200 hover:bg-orange-100'
                        }`}
                      >
                        {bhajanForm.keywords.includes(kw) ? '✓ ' : ''}#{kw}
                      </button>
                    ))}
                  </div>
                  {bhajanForm.keywords.length > 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      {bhajanForm.keywords.length} selected
                    </p>
                  )}
                </div>

                {/* Source URL */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Source URL (optional)
                  </label>
                  <input
                    type="url"
                    value={bhajanForm.source}
                    onChange={(e) => setBhajanForm({...bhajanForm, source: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
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
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => setCurrentView('dashboard')}
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Dashboard
                </button>
                <button
                  onClick={openCreateProgram}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">+</span> Create Program
                </button>
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold text-amber-900">🎵 Programs & Setlists</h2>
                <p className="text-sm text-amber-700">Your live performance programs ({programs.length} programs)</p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  value={programSearchQuery}
                  onChange={(e) => setProgramSearchQuery(e.target.value)}
                  placeholder="🔍 Search programs by name or venue..."
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>

              {/* Programs List */}
              {programsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-400 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-orange-700">Loading programs...</p>
                </div>
              ) : filteredPrograms.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-orange-200">
                  {programs.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">🎵</div>
                      <h3 className="text-lg font-bold text-amber-900 mb-2">No programs yet!</h3>
                      <p className="text-sm text-gray-600 mb-4">Create your first program for a live performance</p>
                      <button
                        onClick={openCreateProgram}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2"
                      >
                        <span className="text-lg">+</span> Create Your First Program
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-amber-900 font-semibold">No programs match your search</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrograms.map(program => (
                    <button
                      key={program.id}
                      onClick={() => openProgramDetail(program)}
                      className="bg-white rounded-2xl shadow-md p-5 border-2 border-orange-100 hover:border-orange-400 hover:shadow-xl transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-3xl">🎵</div>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                          {program.bhajanCount || 0} bhajans
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-amber-900 mb-1">
                        {program.name}
                      </h3>
                      {program.date && (
                        <p className="text-sm text-orange-600 mb-1">📅 {program.date}</p>
                      )}
                      {program.venue && (
                        <p className="text-sm text-gray-600 mb-2">📍 {program.venue}</p>
                      )}
                      <p className="text-xs text-orange-500 mt-3">View Program →</p>
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
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Back to Programs
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditProgram(selectedProgram)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-sm font-semibold"
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

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-4">
                <div className="text-4xl mb-2">🎵</div>
                <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-3">
                  {selectedProgram.name}
                </h1>
                {selectedProgram.date && (
                  <p className="text-lg text-orange-600 mb-1">📅 {selectedProgram.date}</p>
                )}
                {selectedProgram.venue && (
                  <p className="text-lg text-gray-600 mb-3">📍 {selectedProgram.venue}</p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedProgram.bhajanIds?.length || 0} bhajans
                  </span>
                </div>

                {/* START LIVE MODE Button */}
                {selectedProgram.bhajanIds && selectedProgram.bhajanIds.length > 0 && (
                  <button
                    onClick={() => startLiveProgram(selectedProgram)}
                    className="w-full mt-6 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2"
                  >
                    🎤 START LIVE PERFORMANCE
                  </button>
                )}
              </div>

              {/* Bhajans in Program */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-amber-900 mb-3">Bhajans in this Program:</h3>
                {(!selectedProgram.bhajanIds || selectedProgram.bhajanIds.length === 0) ? (
                  <div className="bg-white rounded-2xl p-6 text-center border-2 border-dashed border-orange-200">
                    <p className="text-amber-900 mb-2">No bhajans in this program yet</p>
                    <button
                      onClick={() => openEditProgram(selectedProgram)}
                      className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
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
                          className="w-full bg-white rounded-xl p-4 border-2 border-orange-100 hover:border-orange-400 transition-all text-left flex items-center gap-3"
                        >
                          <div className="text-2xl font-bold text-orange-500 min-w-[40px] text-center">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-amber-900 truncate">{bhajan.title}</p>
                            {bhajan.dhun && (
                              <p className="text-xs text-orange-600 truncate">तर्ज़: {bhajan.dhun}</p>
                            )}
                            <div className="flex gap-1 mt-1">
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
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
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Cancel
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-amber-900 mb-6">
                  {currentView === 'edit-program' ? '✏️ Edit Program' : '➕ Create New Program'}
                </h2>

                {/* Name */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Program Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none text-lg"
                    placeholder="e.g., Diwali Jagran 2026"
                  />
                </div>

                {/* Date and Venue */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-1">
                      Date (optional)
                    </label>
                    <input
                      type="text"
                      value={programForm.date}
                      onChange={(e) => setProgramForm({...programForm, date: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                      placeholder="e.g., 25 Oct 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-1">
                      Venue (optional)
                    </label>
                    <input
                      type="text"
                      value={programForm.venue}
                      onChange={(e) => setProgramForm({...programForm, venue: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                      placeholder="e.g., Delhi Temple"
                    />
                  </div>
                </div>

                {/* Bhajans Section */}
                <div className="mb-4 pt-4 border-t border-orange-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-amber-900">
                      Bhajans in Program ({programForm.bhajanIds.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBhajanPicker(true);
                        setBhajanPickerSearch('');
                      }}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold px-3 py-1.5 rounded-lg text-sm"
                    >
                      + Add Bhajan
                    </button>
                  </div>

                  {programForm.bhajanIds.length === 0 ? (
                    <div className="text-center py-6 bg-orange-50 rounded-xl border-2 border-dashed border-orange-200">
                      <p className="text-sm text-amber-700">No bhajans added yet</p>
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
                          <div key={bhajanId} className="bg-white border-2 border-orange-200 rounded-xl p-3 flex items-center gap-2">
                            <div className="text-xl font-bold text-orange-500 min-w-[30px] text-center">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-amber-900 truncate text-sm">{bhajan.title}</p>
                              <p className="text-xs text-gray-600 truncate">
                                {bhajan.deity} • {bhajan.category}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveBhajanUp(index)}
                                disabled={index === 0}
                                className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBhajanDown(index)}
                                disabled={index === programForm.bhajanIds.length - 1}
                                className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
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
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              {showBhajanPicker && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b border-orange-100 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-amber-900">Add Bhajan to Program</h3>
                      <button
                        onClick={() => setShowBhajanPicker(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-4 border-b border-orange-100">
                      <input
                        type="text"
                        value={bhajanPickerSearch}
                        onChange={(e) => setBhajanPickerSearch(e.target.value)}
                        placeholder="🔍 Search your library..."
                        className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {bhajans.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-amber-900 font-semibold">Your library is empty</p>
                          <p className="text-sm text-gray-600 mt-1">Add bhajans to your library first</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bhajans
                            .filter(b => !bhajanPickerSearch || 
                              b.title.toLowerCase().includes(bhajanPickerSearch.toLowerCase()) ||
                              (b.lyrics && b.lyrics.toLowerCase().includes(bhajanPickerSearch.toLowerCase())))
                            .map(bhajan => {
                              const isAdded = programForm.bhajanIds.includes(bhajan.id);
                              return (
                                <button
                                  key={bhajan.id}
                                  onClick={() => !isAdded && addBhajanToProgram(bhajan.id)}
                                  disabled={isAdded}
                                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                    isAdded 
                                      ? 'bg-green-50 border-green-200 opacity-60 cursor-not-allowed'
                                      : 'bg-white border-orange-100 hover:border-orange-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-amber-900 truncate">{bhajan.title}</p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {bhajan.deity} • {bhajan.category}
                                      </p>
                                    </div>
                                    {isAdded && <span className="text-green-600 font-bold ml-2">✓ Added</span>}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  <div className="inline-flex bg-orange-100 rounded-xl p-1 shadow-inner">
                    <button
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-amber-900 shadow-md"
                    >
                      🌐 Public
                    </button>
                    <button
                      onClick={() => setCurrentView('library')}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-700 hover:text-amber-900 transition-all"
                    >
                      📚 My Library
                    </button>
                  </div>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="text-orange-600 hover:text-orange-800 text-sm"
                    title="Go to Dashboard"
                  >
                    🏠 Dashboard
                  </button>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={openAddPublicBhajan}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1 shadow-md"
                    >
                      + Add Bhajan
                    </button>
                    <button
                      onClick={openAdminPanel}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1"
                    >
                      🔧 Admin Panel
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold text-amber-900">🌐 Public Library</h2>
                <p className="text-sm text-amber-700">Curated bhajans - save any to your personal library ({publicBhajans.length} bhajans)</p>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      speechLang === 'hi-IN'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                    }`}
                    title="Toggle voice search language"
                  >
                    {speechLang === 'hi-IN' ? '🇮🇳 HI' : '🇬🇧 EN'}
                  </button>
                  <span className="text-xs text-gray-500 self-center">Voice search language</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="🔍 Search public bhajans..."
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-gray-100 focus:ring-gray-700 focus:border-gray-500'
                        : 'border-orange-200 focus:ring-orange-200 focus:border-orange-400'
                    }`}
                  />
                  <button
                    onClick={() => startVoiceSearch('public')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : darkMode
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                          : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
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

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-6">
                <select
                  value={publicFilterDeity}
                  onChange={(e) => setPublicFilterDeity(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Deities</option>
                  {allDeityOptions.map(d => (
                    <option key={d.value} value={d.value}>{d.value}</option>
                  ))}
                </select>

                <select
                  value={publicFilterCategory}
                  onChange={(e) => setPublicFilterCategory(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Categories</option>
                  {allCategoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={publicFilterLanguage}
                  onChange={(e) => setPublicFilterLanguage(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Languages</option>
                  {LANGUAGE_OPTIONS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>

                {(publicSearchQuery || publicFilterDeity || publicFilterCategory || publicFilterKeyword || publicFilterLanguage) && (
                  <button
                    onClick={() => {
                      setPublicSearchQuery('');
                      setPublicFilterDeity('');
                      setPublicFilterCategory('');
                      setPublicFilterKeyword('');
                      setPublicFilterLanguage('');
                    }}
                    className="px-3 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Keyword Chips - Quick Filter */}
              <div className="mb-6">
                <p className="text-xs text-amber-700 font-semibold mb-2">Quick Keywords (tap to filter):</p>
                <div className="flex flex-wrap gap-2">
                  {allKeywordOptions.map(kw => (
                    <button
                      key={kw}
                      onClick={() => setPublicFilterKeyword(publicFilterKeyword === kw ? '' : kw)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        publicFilterKeyword === kw
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-orange-50 text-amber-800 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      {publicFilterKeyword === kw ? '✓ ' : ''}#{kw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public Bhajans List */}
              {publicLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-400 border-t-transparent mx-auto mb-3"></div>
                  <p className={`${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Loading public library...</p>
                </div>
              ) : filteredPublicBhajans.length === 0 ? (
                <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-orange-200'}`}>
                  {publicBhajans.length === 0 ? (
                    <>
                      <div className="text-6xl mb-4">🌐</div>
                      <h3 className="text-lg font-bold text-amber-900 mb-2">Public library is empty</h3>
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
                      <p className="text-amber-900 font-semibold">No bhajans match your filters</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPublicBhajans.map(bhajan => {
                    const isSaved = savedBhajanIds.has(bhajan.id);
                    return (
                      <div
                        key={bhajan.id}
                        className={`rounded-2xl shadow-md p-5 border-2 hover:border-orange-400 hover:shadow-xl transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-100'}`}
                      >
                        <button
                          onClick={() => openPublicBhajanDetail(bhajan)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-bold text-amber-900 flex-1 line-clamp-2">
                              {bhajan.title}
                            </h3>
                          </div>

                          {bhajan.dhun && (
                            <p className="text-xs text-orange-600 mb-2">
                              <span className="font-semibold">तर्ज़:</span> {bhajan.dhun}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              {bhajan.deity}
                            </span>
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              {bhajan.category}
                            </span>
                          </div>

                          <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                            {bhajan.lyrics}
                          </p>

                          {bhajan.keywords && bhajan.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {bhajan.keywords.slice(0, 4).map(kw => (
                                <span key={kw} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>

                        <div className="flex gap-2 mt-3 pt-3 border-t border-orange-100">
                          <button
                            onClick={() => openPublicBhajanDetail(bhajan)}
                            className="flex-1 bg-orange-100 hover:bg-orange-200 text-amber-800 font-semibold py-2 rounded-lg text-sm"
                          >
                            📖 Read
                          </button>
                          {isSaved ? (
                            <span className="flex-1 bg-green-100 text-green-700 font-semibold py-2 rounded-lg text-sm text-center">
                              ✓ In Your Library
                            </span>
                          ) : (
                            <button
                              onClick={() => saveToMyLibrary(bhajan)}
                              disabled={savingToLibrary}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
                            >
                              ➕ Add to Personal
                            </button>
                          )}
                        </div>

                        {(bhajan.saveCount > 0) && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            ✨ Added by {bhajan.saveCount} {bhajan.saveCount === 1 ? 'person' : 'people'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ==============================================
              PUBLIC BHAJAN DETAIL VIEW
              ============================================== */}
          {currentView === 'public-bhajan-detail' && selectedPublicBhajan && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView('public-library')}
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Back to Public Library
                </button>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditPublicBhajan(selectedPublicBhajan)}
                      className="text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-sm font-semibold"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deletePublicBhajan(selectedPublicBhajan)}
                      className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-semibold"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>

              <div className={`rounded-2xl shadow-lg p-6 md:p-8 mb-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                <div className="flex items-start justify-between mb-3">
                  <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${darkMode ? 'text-amber-100' : 'text-amber-900'}`}>
                    {selectedPublicBhajan.title}
                  </h1>
                  <button
                    onClick={() => setShowReadingSettings(true)}
                    className={`p-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-orange-100 text-amber-800 hover:bg-orange-200'}`}
                    title="Reading view options"
                  >
                    ⚙️ View
                  </button>
                </div>

                {selectedPublicBhajan.dhun && (
                  <div className={`border-l-4 border-orange-400 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
                    <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedPublicBhajan.dhun}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                    {selectedPublicBhajan.deity}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                    📖 {selectedPublicBhajan.category}
                  </span>
                  {selectedPublicBhajan.language && (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800'}`}>
                      🗣️ {selectedPublicBhajan.language}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                    🌐 Public
                  </span>
                </div>

                {/* Save to Library Button */}
                {savedBhajanIds.has(selectedPublicBhajan.id) ? (
                  <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                    <p className="text-green-800 font-semibold">✓ Already in your library!</p>
                    <p className="text-xs text-green-600 mt-1">You can edit your copy in My Library</p>
                  </div>
                ) : (
                  <button
                    onClick={() => saveToMyLibrary(selectedPublicBhajan)}
                    disabled={savingToLibrary}
                    className="w-full mb-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
                  >
                    {savingToLibrary ? 'Adding...' : '➕ Add to Personal Library'}
                  </button>
                )}

                <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
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
                  <div className="mt-6 pt-4 border-t border-orange-100">
                    <p className="text-xs text-gray-500 mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPublicBhajan.keywords.map(kw => (
                        <span key={kw} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPublicBhajan.source && (
                  <div className="mt-4 pt-4 border-t border-orange-100">
                    <a
                      href={selectedPublicBhajan.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-semibold"
                    >
                      🔗 View Source
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==============================================
              ADMIN PANEL VIEW
              ============================================== */}
          {currentView === 'admin-panel' && isAdmin && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Dashboard
                </button>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                  👑 Admin Only
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-amber-900">🔧 Admin Panel</h2>
                <p className="text-sm text-amber-700">Manage the Public Library</p>
              </div>

              {/* Stats Card */}
              <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-6 text-white mb-6">
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
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-amber-900 mb-3">➕ Add Bhajan Manually</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add a single bhajan to the Public Library using a form.
                </p>
                <button
                  onClick={openAddPublicBhajan}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  + Add New Public Bhajan
                </button>
              </div>
              
              {/* MANAGE LISTS (Deities, Categories, Keywords) */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-indigo-200">
                <h3 className="text-lg font-bold text-amber-900 mb-2">📋 Manage Lists</h3>
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
                  <h4 className="font-semibold text-amber-900 mb-2">🕉️ Deities ({customDeities.length || DEITY_OPTIONS.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(customDeities.length > 0 ? customDeities : DEITY_OPTIONS.map(d => d.value)).map(name => (
                      editingItem?.type === 'deity' && editingItem?.value === name ? (
                        <div key={name} className="inline-flex items-center gap-1 bg-yellow-50 border-2 border-yellow-400 rounded-full px-2 py-0.5">
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
                            className="ml-1 text-blue-600 hover:text-blue-800 text-[10px]"
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
                      className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg text-sm outline-none focus:border-orange-400"
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
                  <h4 className="font-semibold text-amber-900 mb-2">📖 Categories ({customCategories.length || CATEGORY_OPTIONS.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(customCategories.length > 0 ? customCategories : CATEGORY_OPTIONS).map(name => (
                      editingItem?.type === 'category' && editingItem?.value === name ? (
                        <div key={name} className="inline-flex items-center gap-1 bg-yellow-50 border-2 border-yellow-400 rounded-full px-2 py-0.5">
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
                            className="ml-1 text-blue-600 hover:text-blue-800 text-[10px]"
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
                      className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg text-sm outline-none focus:border-orange-400"
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
                  <h4 className="font-semibold text-amber-900 mb-2">🏷️ Keywords ({customKeywords.length || DEFAULT_KEYWORDS.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(customKeywords.length > 0 ? customKeywords : DEFAULT_KEYWORDS).map(name => (
                      editingItem?.type === 'keyword' && editingItem?.value === name ? (
                        <div key={name} className="inline-flex items-center gap-1 bg-yellow-50 border-2 border-yellow-400 rounded-full px-2 py-0.5">
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
                            className="ml-1 text-blue-600 hover:text-blue-800 text-[10px]"
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
                      className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg text-sm outline-none focus:border-orange-400"
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
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                  💡 Click <strong>✏️</strong> to rename, <strong>×</strong> to delete.<br/>
                  Items in use by bhajans <strong>cannot be renamed or deleted</strong> - update those bhajans first.
                </div>
              </div>
              
              {/* USER FEEDBACK CARD */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-amber-900">💬 User Feedback</h3>
                  <button
                    onClick={loadFeedbackList}
                    disabled={feedbackListLoading}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
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
                    <div className="text-sm text-blue-700 font-semibold mb-3">
                      📊 Total: {feedbackList.length} feedback item{feedbackList.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {feedbackList.map((fb) => (
                        <div key={fb.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-amber-900 text-sm">
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
                          <p className="text-gray-800 whitespace-pre-wrap text-sm mt-2 bg-white rounded-lg p-3 border border-blue-100">
                            {fb.text}
                          </p>
                          {fb.userEmail && (
                            <a 
                              href={`mailto:${fb.userEmail}?subject=Re: Your Sankirtan Feedback&body=Hi ${fb.userName},%0D%0A%0D%0AThank you for your feedback!%0D%0A%0D%0A`}
                              className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold"
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
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-amber-900 mb-3">📥 Import Bhajans from JSON</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Paste JSON exported from your personal Babosa Sankirtan app. Bhajans will be added to the Public Library.
                </p>

                {!importPreview ? (
                  <>
                    <textarea
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      className="w-full h-40 px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 outline-none font-mono text-sm"
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
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-purple-900 mb-2">Ready to import:</h4>
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
                          <p className="font-semibold text-amber-900 truncate">{b.title}</p>
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
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-semibold">
                          {importProgress.message}
                        </p>
                        <div className="mt-2 bg-blue-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          {importProgress.current} of {importProgress.total}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={executeImport}
                        disabled={importing}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
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
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">💡 JSON Format Support:</h4>
                <p className="text-xs text-blue-700 mb-2">The importer accepts:</p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4">
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-orange-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <h3 className="text-lg font-bold text-amber-900">
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
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none text-lg"
                      placeholder={hindiTypingEnabled ? "Type: om jai jagdish hare" : "e.g., ॐ जय जगदीश हरे"}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'title' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-orange-300 rounded-lg shadow-2xl p-2 flex flex-wrap gap-2 items-center z-30">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                                : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deity and Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-1">Deity</label>
                    <select
                      value={publicBhajanForm.deity}
                      onChange={(e) => setPublicBhajanForm({...publicBhajanForm, deity: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none bg-white"
                    >
                      {allDeityOptions.map(d => (
                        <option key={d.value} value={d.value}>{d.value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-1">Category</label>
                    <select
                      value={publicBhajanForm.category}
                      onChange={(e) => setPublicBhajanForm({...publicBhajanForm, category: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none bg-white"
                    >
                      {allCategoryOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">Language / भाषा</label>
                  <select
                    value={publicBhajanForm.language}
                    onChange={(e) => setPublicBhajanForm({...publicBhajanForm, language: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none bg-white"
                  >
                    {LANGUAGE_OPTIONS.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {/* Dhun */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none"
                      placeholder={hindiTypingEnabled ? "Type in English, press space" : "e.g., तर्ज़: तुझे देखा तो..."}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'dhun' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-orange-300 rounded-lg shadow-2xl p-2 flex flex-wrap gap-2 items-center z-30">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                                : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                            }`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">Scale / Raag</label>
                  <input
                    type="text"
                    value={publicBhajanForm.scale}
                    onChange={(e) => setPublicBhajanForm({...publicBhajanForm, scale: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none"
                    placeholder="e.g., Raag Yaman, C# Scale"
                  />
                </div>

                {/* NEW: Add lyrics from Image / PDF / Camera (on-device OCR) */}
                <div className="mb-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-900 mb-2">
                    📥 Auto-fill lyrics from a photo, PDF, or camera — text is read on your device, nothing is uploaded or stored as a file
                  </p>

                  {/* First-time warning about OCR engine download */}
                  {!localStorage.getItem('sankirtan-tesseract-langs-cached') && !ocrProcessing && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900">
                      ⚠️ <strong>First-time use:</strong> The OCR engine (~15 MB) will download once and be cached. Please use WiFi if possible.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={ocrProcessing}
                      onClick={() => publicCameraInputRef.current && publicCameraInputRef.current.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      📷 Camera
                    </button>
                    <button
                      type="button"
                      disabled={ocrProcessing}
                      onClick={() => publicImageInputRef.current && publicImageInputRef.current.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      🖼️ Upload Image
                    </button>
                    <button
                      type="button"
                      disabled={ocrProcessing}
                      onClick={() => publicPdfInputRef.current && publicPdfInputRef.current.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
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
                    <div className="mt-3 p-3 bg-white border-2 border-blue-300 rounded-lg">
                      <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                          style={{ width: ocrProgress + '%' }}
                        ></div>
                      </div>
                      <p className="text-xs font-semibold text-blue-900">{ocrMessage || 'Processing...'}</p>
                      {!localStorage.getItem('sankirtan-tesseract-langs-cached') && (
                        <p className="text-[10px] text-blue-700 mt-1">
                          💡 First-time setup takes 30-60 seconds. Future uses will be instant.
                        </p>
                      )}
                    </div>
                  )}
                  {!ocrProcessing && ocrMessage && (
                    <p className="text-xs font-semibold text-blue-900 mt-2">{ocrMessage}</p>
                  )}
                  <p className="text-xs text-blue-700 mt-2">
                    💡 Works best with clear, printed Hindi/English text. Handwriting may need manual correction. Scanned PDFs supported (up to 10 pages).
                  </p>
                </div>

                {/* Lyrics */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-amber-900">
                      Lyrics <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setHindiTypingEnabled(!hindiTypingEnabled)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                        hindiTypingEnabled
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                      title={hindiTypingEnabled ? 'Turn off Hindi typing' : 'Turn on Hindi typing'}
                    >
                      {hindiTypingEnabled ? '🇮🇳 हिंदी ON' : '🔤 Hindi OFF'}
                    </button>
                  </div>
                  {hindiTypingEnabled && (
                    <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs text-orange-800">
                        ✨ Type in English, press <kbd className="bg-white px-1.5 py-0.5 rounded border text-xs">space</kbd> to auto-convert to Hindi
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
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
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none font-mono text-base"
                      placeholder={hindiTypingEnabled ? "Type: jai shri babosa (press space to convert)" : "भजन के बोल यहाँ लिखें..."}
                      style={{ lineHeight: '1.8' }}
                    />
                    {hindiTypingEnabled && showSuggestions && activeTypingField === 'lyrics' && transliterationSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-orange-400 rounded-xl shadow-2xl p-2 flex flex-wrap gap-2 items-center z-30">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                                : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                            }`}
                            title={idx === 0 ? 'Default (press space)' : `Alternative ${idx + 1}`}
                          >
                            {idx === 0 && '⭐ '}{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-2">Keywords</label>
                  <div className="flex flex-wrap gap-2">
                    {allKeywordOptions.map(kw => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => togglePublicBhajanKeyword(kw)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          publicBhajanForm.keywords.includes(kw)
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-orange-50 text-amber-800 border border-orange-200 hover:bg-orange-100'
                        }`}
                      >
                        {publicBhajanForm.keywords.includes(kw) ? '✓ ' : ''}#{kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">Source URL (optional)</label>
                  <input
                    type="url"
                    value={publicBhajanForm.source}
                    onChange={(e) => setPublicBhajanForm({...publicBhajanForm, source: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl outline-none"
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
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
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
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-amber-900 mb-4">⚠️ This bhajan is not available</p>
            <p className="text-sm text-gray-600 mb-4">It may have been deleted from your library</p>
            <button
              onClick={exitLiveProgram}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
            >
              Exit Live Mode
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        {/* Live Header */}
        <div className="bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-md border-b-2 border-orange-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={exitLiveProgram}
              className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 text-sm"
            >
              ✕ Exit Live
            </button>
            <div className="text-center flex-1 mx-4">
              <p className="text-xs text-orange-600 font-semibold">🎤 LIVE PROGRAM</p>
              <p className="text-sm font-bold text-amber-900 truncate">{selectedProgram.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Bhajan</p>
              <p className="text-lg font-bold text-orange-600">{liveProgramIndex + 1} / {totalBhajans}</p>
            </div>
          </div>
          
          {/* Font Size Controls */}
          <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setLiveFontSize(Math.max(14, liveFontSize - 2))}
              className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 text-amber-800 font-bold"
              title="Decrease font"
            >
              A−
            </button>
            <span className="text-xs text-gray-500 min-w-[40px] text-center">{liveFontSize}px</span>
            <button
              onClick={() => setLiveFontSize(Math.min(40, liveFontSize + 2))}
              className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 text-amber-800 font-bold"
              title="Increase font"
            >
              A+
            </button>
            {liveWakeLock && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                🔦 Screen On
              </span>
            )}
          </div>
        </div>
        
        {/* Bhajan Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-3">
            {currentBhajan.title}
          </h1>
          
          {currentBhajan.dhun && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg mb-4">
              <p className="text-sm text-orange-900">
                <span className="font-semibold">तर्ज़ / धुन:</span> {currentBhajan.dhun}
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
              {currentBhajan.deity}
            </span>
            {currentBhajan.scale && (
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                🎵 {currentBhajan.scale}
              </span>
            )}
          </div>
          
          <div className={`rounded-2xl shadow-lg p-6 md:p-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowReadingSettings(true)}
                className={`p-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-orange-100 text-amber-800 hover:bg-orange-200'}`}
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-orange-200 shadow-2xl z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              onClick={livePrev}
              disabled={liveProgramIndex === 0}
              className="flex-1 bg-orange-100 hover:bg-orange-200 disabled:opacity-30 disabled:cursor-not-allowed text-amber-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              ← Previous
            </button>
            <div className="text-center min-w-[80px]">
              <p className="text-xs text-gray-500">Bhajan</p>
              <p className="text-lg font-bold text-orange-600">{liveProgramIndex + 1} / {totalBhajans}</p>
            </div>
            <button
              onClick={liveNext}
              disabled={liveProgramIndex >= totalBhajans - 1}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 flex items-center justify-center p-4">
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-6 text-white text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-2xl font-bold">App Updated!</h3>
              <p className="text-sm text-green-100 mt-1">Sankirtan just got better</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                A new version of Sankirtan has been deployed. Here is what is new:
              </p>
              <ul className="text-sm text-gray-700 space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Google Hindi typing now works in Public Library add/edit forms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>You will now see this prompt every time the app is updated on GitHub</span>
                </li>
              </ul>
              <button
                onClick={dismissUpdatePrompt}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg"
              >
                Awesome, let us go! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

            <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-8 text-white text-center">
            <div className="text-7xl mb-2">🕉️</div>
            <h1 className="text-4xl font-bold mb-1">Sankirtan</h1>
            <p className="text-orange-100 text-base">भजन से भगवान तक</p>
            <div className="mt-4 pt-4 border-t border-white/30">
              <p className="text-xs text-orange-100 leading-relaxed">
                The devotional music platform for<br/>
                <strong>singers, artists & devotees</strong>
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {!showPhoneLogin ? (
              <>
                <button
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="w-full bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-gray-700 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {authLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                {/* Phone login temporarily hidden - will be enabled when Blaze plan is active */}
                {false && (
                  <button
                    onClick={() => setShowPhoneLogin(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    📱 Continue with Phone
                  </button>
                )}

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    ⚠️ {authError}
                  </div>
                )}

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="text-xs text-gray-400">Available Features</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>

                <div className="text-center text-xs text-gray-500 space-y-1">
                  <p>📚 Personal bhajan library</p>
                  <p>🔍 Smart search & filters</p>
                  <p>☁️ Cloud sync across devices</p>
                  <p>🎵 Coming soon: Programs, Parody</p>
                </div>

                <p className="text-xs text-gray-400 text-center mt-4">
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
                      className="text-orange-600 text-sm mb-2 flex items-center gap-1"
                    >
                      ← Back
                    </button>

                    <h3 className="text-lg font-bold text-amber-900 text-center">
                      📱 Sign in with Phone
                    </h3>

                    <div>
                      <label className="block text-sm font-semibold text-amber-900 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
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
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
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
                      className="text-orange-600 text-sm mb-2 flex items-center gap-1"
                    >
                      ← Change number
                    </button>

                    <h3 className="text-lg font-bold text-amber-900 text-center">
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
                        className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none text-center text-2xl tracking-widest"
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
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                    >
                      {authLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </>
                )}
              </>
            )}

            {userCount > 0 && (
              <div className="text-center pt-4 border-t border-orange-100">
                <p className="text-xs text-amber-700">
                  🌟 <strong>{userCount}+</strong> {userCount === 1 ? 'devotee has' : 'devotees have'} joined
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-4 text-white/80 text-xs">
          <p>Founded for the Bhajan Community</p>
          <p className="mt-1">🕉️ by Grace of <strong>Babosa Bhagwan</strong> 🕉️</p>
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
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-orange-200">
            <div className="text-6xl mb-4">🙏</div>
            <h1 className="text-2xl font-bold text-amber-900 mb-2">
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
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl shadow-md"
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

            <p className="text-xs text-amber-700 mt-4">
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
