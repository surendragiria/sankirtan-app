import React, { useState, useEffect, useCallback } from 'react';

// ==============================================
// SANKIRTAN SAAS - SESSION 2 (My Library Added)
// Bhajan Se Bhagwan Tak
// Multi-user platform with Google + Phone Auth
// NEW: Personal Bhajan Library (CRUD + Search + Filter)
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

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'library', 'bhajan-detail', 'add-bhajan', 'edit-bhajan'
  const [bhajans, setBhajans] = useState([]);
  const [selectedBhajan, setSelectedBhajan] = useState(null);
  const [editingBhajan, setEditingBhajan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeity, setFilterDeity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [bhajansLoading, setBhajansLoading] = useState(false);
  const [bhajanFormError, setBhajanFormError] = useState('');
  const [bhajanFormSaving, setBhajanFormSaving] = useState(false);
  
  // New/Edit bhajan form
  const [bhajanForm, setBhajanForm] = useState({
    title: '',
    lyrics: '',
    deity: 'Babosa',
    category: 'Bhajan',
    dhun: '',
    scale: '',
    keywords: [],
    source: ''
  });

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

        window.firebase.auth().onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            console.log('👤 User logged in:', firebaseUser.email || firebaseUser.phoneNumber);
            setUser(firebaseUser);
            await loadUserProfile(firebaseUser);
          } else {
            console.log('👤 No user logged in');
            setUser(null);
            setUserProfile(null);
            setBhajans([]);
          }
          setLoading(false);
        });

        await fetchUserCount();
      } catch (error) {
        console.error('Firebase init error:', error);
        setLoading(false);
      }
    };

    initFirebase();
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
    
    const unsubscribe = bhajansRef
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const bhajanList = [];
          snapshot.forEach((doc) => {
            bhajanList.push({ id: doc.id, ...doc.data() });
          });
          setBhajans(bhajanList);
          setBhajansLoading(false);
          console.log(`✅ Loaded ${bhajanList.length} bhajans`);
        },
        (error) => {
          console.error('Error loading bhajans:', error);
          setBhajansLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user, userProfile]);

  // ==============================================
  // USER PROFILE MANAGEMENT
  // ==============================================
  const loadUserProfile = async (firebaseUser) => {
    try {
      const db = window.firebase.firestore();
      const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
      
      if (userDoc.exists) {
        const profile = userDoc.data();
        setUserProfile(profile);
        console.log('✅ Profile loaded:', profile.displayName);
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
      console.error('Error loading profile:', error);
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
    } catch (error) {
      console.error('Error saving profile:', error);
      setAuthError('Could not save profile: ' + error.message);
    } finally {
      setAuthLoading(false);
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
      dhun: '',
      scale: '',
      keywords: [],
      source: ''
    });
    setBhajanFormError('');
    setEditingBhajan(null);
    setCurrentView('add-bhajan');
  };

  const openEditBhajan = (bhajan) => {
    setBhajanForm({
      title: bhajan.title || '',
      lyrics: bhajan.lyrics || '',
      deity: bhajan.deity || 'Babosa',
      category: bhajan.category || 'Bhajan',
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
      
      await window.firebase.auth().signInWithPopup(provider);
      console.log('✅ Google sign-in successful');
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError('Popup blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('');
      } else {
        setAuthError(error.message);
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
      setCurrentView('dashboard');
      setShowPhoneLogin(false);
      setOtpSent(false);
      setPhoneNumber('');
      setOtpCode('');
      console.log('👋 Logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get deity emoji helper
  const getDeityEmoji = (deityName) => {
    const deity = DEITY_OPTIONS.find(d => d.value === deityName);
    return deity ? deity.emoji : '✨';
  };

  // ==============================================
  // LOADING SCREEN
  // ==============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-pulse">🕉️</div>
          <h1 className="text-4xl font-bold text-white mb-2">Sankirtan</h1>
          <p className="text-orange-100 text-lg">भजन से भगवान तक</p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mx-auto"></div>
          </div>
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
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
              </div>
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

                <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-orange-100 opacity-60">
                  <div className="text-4xl mb-3">🌐</div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Explore Community</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Discover bhajans from other artists
                  </p>
                  <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                    Coming Soon 🚀
                  </span>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-orange-100 opacity-60">
                  <div className="text-4xl mb-3">🎵</div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Programs & Setlists</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Create playlists for live performances
                  </p>
                  <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                    Coming in Session 3 🚀
                  </span>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-orange-100 opacity-60">
                  <div className="text-4xl mb-3">🎶</div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Parody Medleys</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Combine mukhdas for energetic performances
                  </p>
                  <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                    Coming in Session 3 🚀
                  </span>
                </div>
              </div>

              {/* Development Notice */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">🚧</div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Sankirtan is Under Active Development</h3>
                <p className="text-sm text-blue-700 mb-3">
                  You're seeing the foundation of the app. More features are being added weekly!
                </p>
                <p className="text-xs text-blue-600">
                  Founded by <strong>Surendra Jain</strong> • Made with 🙏 for the bhajan community
                </p>
              </div>
            </>
          )}

          {/* ==============================================
              MY LIBRARY VIEW
              ============================================== */}
          {currentView === 'library' && (
            <>
              {/* Library Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                >
                  ← Dashboard
                </button>
                <button
                  onClick={openAddBhajan}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">+</span> Add Bhajan
                </button>
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold text-amber-900">📚 My Library</h2>
                <p className="text-sm text-amber-700">Your personal bhajan collection ({bhajans.length} bhajans)</p>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search bhajans (title, lyrics, keywords)..."
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-6">
                <select
                  value={filterDeity}
                  onChange={(e) => setFilterDeity(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Deities</option>
                  {DEITY_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.emoji} {d.value}</option>
                  ))}
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-sm bg-white"
                >
                  <option value="">All Categories</option>
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {(searchQuery || filterDeity || filterCategory) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterDeity('');
                      setFilterCategory('');
                    }}
                    className="px-3 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Bhajans List */}
              {bhajansLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-400 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-orange-700">Loading your bhajans...</p>
                </div>
              ) : filteredBhajans.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-orange-200">
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
                      className="bg-white rounded-2xl shadow-md p-5 border-2 border-orange-100 hover:border-orange-400 hover:shadow-xl transition-all text-left"
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
                          {getDeityEmoji(bhajan.deity)} {bhajan.deity}
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
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-3">
                  {selectedBhajan.title}
                </h1>

                {selectedBhajan.dhun && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg mb-4">
                    <p className="text-sm text-orange-900">
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedBhajan.dhun}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {getDeityEmoji(selectedBhajan.deity)} {selectedBhajan.deity}
                  </span>
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                    📖 {selectedBhajan.category}
                  </span>
                  {selectedBhajan.scale && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                      🎵 {selectedBhajan.scale}
                    </span>
                  )}
                </div>

                <div className="border-t border-orange-100 pt-4">
                  <pre className="whitespace-pre-wrap font-sans text-lg text-gray-800 leading-relaxed">
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
                  <input
                    type="text"
                    value={bhajanForm.title}
                    onChange={(e) => setBhajanForm({...bhajanForm, title: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none text-lg"
                    placeholder="e.g., ॐ जय जगदीश हरे"
                  />
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
                      {DEITY_OPTIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.emoji} {d.value}</option>
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
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dhun / Tarz */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    तर्ज़ / धुन (Tune)
                  </label>
                  <input
                    type="text"
                    value={bhajanForm.dhun}
                    onChange={(e) => setBhajanForm({...bhajanForm, dhun: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none"
                    placeholder="e.g., तर्ज़: तुझे देखा तो..."
                  />
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

                {/* Lyrics */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Lyrics <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bhajanForm.lyrics}
                    onChange={(e) => setBhajanForm({...bhajanForm, lyrics: e.target.value})}
                    rows={10}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 outline-none font-mono text-base"
                    placeholder="भजन के बोल यहाँ लिखें..."
                    style={{ lineHeight: '1.8' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Hindi typing support coming in Session 4!
                  </p>
                </div>

                {/* Keywords */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
                    Keywords (tap to select)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_KEYWORDS.map(kw => (
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
        </main>
      </div>
    );
  }

  // ==============================================
  // LANDING / SIGN-IN SCREEN
  // ==============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-8 text-white text-center">
            <div className="text-7xl mb-2 animate-pulse">🕉️</div>
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

                <button
                  onClick={() => setShowPhoneLogin(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  📱 Continue with Phone
                </button>

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
          <p>Founded by <strong>Surendra Jain</strong></p>
          <p className="mt-1">Made with 🙏 for the bhajan community</p>
        </div>
      </div>
    </div>
  );
};

export default App;
