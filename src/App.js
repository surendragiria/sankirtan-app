import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

// ==============================================
// SANKIRTAN SAAS - SESSION 58
// Bhajan Se Bhagwan Tak
// CHANGES (Session 58 — Listen button on card opens inline player):
//
// S57 made the YouTube button on the full card open YouTube in
// a new tab. User feedback: that defeats the purpose of inline
// playback. Users were jumping out of the app to YouTube.
//
// Now: tapping the YouTube Listen button on a full card opens
// the bhajan's reading view AND auto-expands the inline player
// in one step. User never leaves the app.
//
// Implementation
// - openBhajanDetail and openPublicBhajanDetail accept an optional
//   second argument: { autoplay: true }. When set, showAudioPlayer
//   is initialized to true instead of false.
// - Card YouTube buttons became <button> instead of <a>, calling
//   onOpen(bhajan, { autoplay: true }) with stopPropagation so the
//   card's own click handler doesn't fight it.
// - Non-YouTube source URLs (rare) still open in a new tab via the
//   original <a href> — there's no inline player for a blog link.
//
// Reading-view Listen button is unchanged — it still toggles the
// inline player normally.
//
// Not touched: schema, Firestore rules, S6-57 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 57
// Bhajan Se Bhagwan Tak
// CHANGES (Session 57 — card YouTube button + tighten playlist/program/medley heroes):
//
// 1. Detailed-card YouTube button. Both MyBhajanCard and
//    PublicBhajanCard in full (non-compact) view were still
//    showing a "🔗 Source" text link at the bottom. Now they
//    show the YouTube-branded Listen button, matching the
//    reading view (S56). On a card, the button opens YouTube in
//    a new tab (same behavior as the old Source link) — the
//    inline player lives on the reading view, which the whole
//    card already opens.
//
// 2. Playlist/Program cards (Playlists tab) shrunk. Was p-5
//    rounded-2xl with a text-3xl emoji at top-left, text-lg
//    title, bhajan-count pill at top-right, date/venue lines,
//    and an "Open →" footer. Now a compact one-liner card:
//    small emoji inline next to a text-sm title, meta
//    (bhajan count · date · venue) in a single text-xs line
//    beneath. Footer arrow dropped — the whole card is already
//    tappable.
//
// 3. Playlist/Program detail page title shrunk. Was p-6/8 hero
//    with text-3xl/4xl title and separate 🎵 icon above. Now
//    p-4/5 with text-xl/2xl title, icon inline, meta row
//    (count · date · venue) under the title. Live Performance
//    button and other controls below are unchanged.
//
// 4. Medley detail page title tightened further. Already shrunk
//    in S46; now p-3/4 with text-base/lg title.
//
// Not touched: schema, Firestore rules, S6-56 work. Compact card
// list unchanged (already small enough).
// ==============================================
//
// SANKIRTAN SAAS - SESSION 56
// Bhajan Se Bhagwan Tak
// CHANGES (Session 56 — YouTube-branded Listen button, drop Source text):
//
// Every source is a YouTube URL (confirmed by the user), so the
// separate "🔗 Source" text link next to the Play button was
// redundant. Both merged into a single YouTube-branded button:
//
//   [YouTube icon] Listen   (or)   [YouTube icon] Hide
//
// The YouTube icon is drawn inline as SVG — red rounded rectangle
// with a white play triangle. Signals "this plays a YouTube video"
// without needing separate Source text.
//
// Non-YouTube URLs (rare/never in practice) still show a small
// "🔗 Source" link, so nothing becomes unreachable if a
// non-YouTube URL sneaks in.
//
// Not touched: schema, Firestore rules, S6-55 work. The inline
// player itself (S54) and past-program filtering (S55) unchanged.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 55
// Bhajan Se Bhagwan Tak
// CHANGES (Session 55 — hide past programs in the Add-to picker):
//
// When adding a bhajan from a reading view to a program, dated
// events that already happened (program.date < today) are no
// longer shown. Only playlists, medleys, and upcoming programs
// appear. A program with a blank/missing date is still shown
// (safer than silently dropping it).
//
// Filter uses getTodayKey() for the YYYY-MM-DD comparison, so
// timezone matches the user's local calendar. A program dated
// today is still "current" — not hidden.
//
// Empty state refined into two branches:
//   - Nothing at all — "No playlists, programs, or medleys yet"
//     (unchanged copy)
//   - Only past programs — "No upcoming programs. Past programs
//     are hidden here. Create a new program or add this bhajan
//     to a playlist / medley instead."
//
// Not touched: schema, Firestore rules, S6-54 work. Past
// programs still exist and remain visible in the Playlists tab
// itself — this only affects the Add-to picker.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 54
// Bhajan Se Bhagwan Tak
// CHANGES (Session 54 — inline YouTube audio on bhajan pages):
//
// User confirmed: every existing bhajan's `source` field points
// to a YouTube URL. This session makes those YouTube links
// playable inline on the bhajan reading view, without leaving
// the page.
//
// New helper (top of file, near shareBhajan):
//   getYouTubeVideoId(url) — parses youtube.com/watch, youtu.be,
//   /shorts/, /embed/, /live/, with optional timestamp
//   (t=90 or t=1m30s). Returns { id, start } or null.
//
// New state: showAudioPlayer (bool). Resets to false whenever a
// new bhajan opens (openBhajanDetail / openPublicBhajanDetail).
//
// Reading view footer: if source is a YouTube URL, a new
// ▶ Play button sits alongside 🔗 Source. Tapping it expands
// a compact inline player below the footer:
//   - 16:9 aspect ratio, capped at 260px tall
//   - Lazy-loaded — the <iframe> only mounts after the user taps
//     Play, so opening a bhajan never quietly loads YouTube
//     tracking / ads
//   - Uses youtube-nocookie.com/embed for privacy-preserving
//     embed
//   - autoplay=1 works because the tap is a user gesture
//   - Timestamp preserved if the source URL had t=/start=
//   - rel=0 keeps recommended videos on-channel only
//   - When expanded, the Play button becomes ✕ Hide
//
// Non-YouTube sources still show just 🔗 Source (unchanged).
//
// Not built in this session:
//   - Autoplay in Live mode — deliberately absent; singers don't
//     want a video fighting them mid-performance.
//   - Cross-bhajan playback continuation — each bhajan gets a
//     fresh, collapsed player.
//
// Not touched: schema, Firestore rules, S6-53 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 53
// Bhajan Se Bhagwan Tak
// CHANGES (Session 53 — fix double link in shared bhajan message):
//
// Bug: sharing a public bhajan on WhatsApp/iMessage put the
// sankirtan.app link into the outgoing message TWICE.
//
// Cause: shareBhajan called navigator.share with the link in
// both the text body AND the url field. WhatsApp and iMessage
// concatenate them on send.
//
// Fix: build a second version of the body — shareTextNoLink —
// that drops the inline URL, and pass that to navigator.share
// alongside the url field. The clipboard fallback keeps the
// with-link text so pasting into a plain textbox still carries
// the link.
//
// Applies to standard public share and "Today's Bhajan" share.
// Private-library shares unchanged (no deep link anyway).
//
// Not touched: schema, Firestore rules, S6-52 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 52
// Bhajan Se Bhagwan Tak
// CHANGES (Session 52 — small polish on splash + mood chips):
//
// 1. Splash credit: 🙏 Namaste emojis now flank the "Inspired by
//    Manju Baisa" line, matching the "🙏 By Grace of Lord Babosa 🙏"
//    line above it.
//
// 2. Mood chips in the reading-view footer are now TAPPABLE.
//    Was: read-only <span> chips — decoration only.
//    Now: <button> chips. Tapping one applies that mood as the
//    library's mood filter (clearing deity/type filters) and
//    returns the user to the library view. Applied on both
//    reading views:
//    - My Library reading view → filters My Library
//    - Public reading view → filters Public Library
//    Hover state added so the affordance reads as clickable.
//
// Not touched: schema, Firestore rules, all Session 6-51 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 51
// Bhajan Se Bhagwan Tak
// CHANGES (Session 51 — small fixes on forms and filter rows):
//
// 1. Add Public Bhajan form: Deity and Category selects were
//    vertically staggered because the two labels wrap to
//    different heights. Added items-end on the grid so selects
//    align at the bottom regardless of label height.
//
// 2/3. Create/Edit Medley: the Type toggle showed Playlist /
//    Program / Medley, letting the user accidentally turn a
//    medley into a playlist. When programForm.type === 'parody'
//    the toggle now shows ONLY a locked 🎭 Medley pill.
//    Symmetric with the S43 rule that hid Medley from playlist/
//    program forms.
//
// 4/5. Filter row: undone S49's Filter button + modal. Deity
//    and Type are back as inline dropdowns. Mood is gone from
//    the dropdowns — all moods now appear as a horizontally
//    scrollable chip row below (was: only the first 4).
//    Negative-margin trick pushes the row to the screen edges
//    on mobile so users see chips scrolling from/to the edge
//    and know there's more offscreen. Applied to both
//    libraries.
//
// 6. Search + voice: placeholder shortened to "Search bhajans…"
//    (was "Search — try 'babosa' or 'बाबोसा'" —
//    truncated on mobile alongside +Add). Voice language chip
//    shrunk to just "EN" / "हिं" (was "🎤 EN" / "🎤 हिं") —
//    the real mic button already sits right next to it, so the
//    duplicate glyph was noise. Result: search box gets its
//    breathing room back on phones.
//
// Not touched: schema, Firestore rules, S6-50 work. The old
// Filter sheet modal state (filterSheetView) is now unused but
// left in place; removing state is riskier than leaving it.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 50
// Bhajan Se Bhagwan Tak
// CHANGES (Session 50 — icon system for the app chrome):
//
// Replaced emoji-in-controls with a small set of single-stroke
// line icons. Emoji render differently on every OS and read as
// informal in controls; SVGs are consistent, currentColor-aware
// (so dark mode works), and typographically settled.
//
// New icon components at the top of the file: Icon (base),
// IconSearch, IconGlobe, IconBookOpen, IconMusic, IconLock,
// IconFlame, IconSparkle, IconClipboardList, IconShare, IconEye,
// IconPencil.
//
// Sites swapped:
//   • Bottom nav tabs: 🌐 📚 🎵 🔒 → IconGlobe /
//     IconBookOpen / IconMusic / IconLock
//   • Both library search inputs: 🔍 moved out of placeholder
//     to an absolute-positioned SVG icon on the left. Padding
//     shifts to pl-10; icon stays visible while typing.
//   • Discovery pills: 🔥 Popular / ✨ Recently Added →
//     IconFlame / IconSparkle inline before the label.
//   • Reading-view action buttons on both libraries: ↗ Share,
//     📋 Add to, 👁️ View, ✏️ Edit → IconShare,
//     IconClipboardList, IconEye, IconPencil.
//
// Intentionally NOT swapped (content vs. control distinction):
//   • 🙏 guest banner, 🌟 daily bhajan chip, 🎭 medley
//     badges, splash blessing, empty-state emoji — content.
//   • Form page titles ("✏️ Edit Bhajan", "➕ Add..."),
//     💾 Save buttons — labels, not chrome.
//   • Playlist/Program type pills (🎵 / 📅) — emoji
//     distinguishes types visually and carries meaning.
//   • 🎤 START LIVE PERFORMANCE — big action label; mic reads
//     appropriately at that size.
//
// Not touched: schema, Firestore rules, all Session 6-49 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 49
// Bhajan Se Bhagwan Tak
// CHANGES (Session 49 — header + filters polish):
//
// 1. Avatar menu. The header right side had 5 controls (avatar +
//    name, dark-mode, guide, sign-out; plus a duplicated “Admin”
//    label). Now: one avatar button that opens a dropdown menu
//    containing the user's name, Admin badge if applicable, Dark
//    mode toggle, Singer's Guide, Sign out. Sign-out routes through
//    a confirm dialog — one stray tap no longer signs the user out.
//    The 🔧 Admin button (mode toggle) stays outside the menu.
//
// 2. Filter sheet. The three Deity/Type/Mood <select>s on each
//    library are replaced by a single "Filter" button that opens
//    a modal sheet. Count badge shows how many are active
//    ("Filter · 2"). Active filters appear as removable chips
//    beside the button. Clear-all + Done in the sheet footer.
//
// 3. Keyword pill styling. Mood pills below the search were near-
//    invisible in light mode. Now white bg + teal border + saffron
//    hover — clearly clickable outlined pills.
//
// 4. Delete moved to overflow menu (⋯). On both reading views
//    (My Library and admin Public Library), the red Delete button
//    that shared the row with Edit and View is now a small ⋯
//    button that opens a small menu with one destructive option.
//    Removes visual weight; keeps the action discoverable.
//
// Not touched: data schema, Firestore rules, all Session 6-48 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 48
// Bhajan Se Bhagwan Tak
// CHANGES (Session 48 — polish quick wins):
//
// 1. Desktop width caps. Main container was max-w-6xl (~1150px);
//    now max-w-4xl (~900px). Same for the bottom tab bar. On
//    desktop, cards no longer stretch across the whole screen
//    with lonely markers floating far right. On phones nothing
//    changes (viewports are narrower than max-w-4xl anyway).
//
// 2. BhajanTitle component. Titles stored as "Devanagari / Latin"
//    now render as two lines — Devanagari as the primary heading,
//    Latin as a lighter subtitle. Applied in both card types
//    (compact + full) and both reading views. Titles without " / "
//    render as-is; no data change.
//
// 3. Nav badges removed. The count on My Library and Playlists
//    read as unread-alert badges. They're not. Removing them
//    makes the tab bar quieter.
//
// 4. + Add moved into the search row on Public Library. The
//    admin-only strip above the search no longer sits empty for
//    regular users; admins see a compact + Add button beside
//    the search input.
//
// 5. Reading view footer. Moods and Source were two stacked
//    border-t sections that read like form fields. Now one quiet
//    footer row: chips on the left, small saffron "🔗 Source" on
//    the right, single hairline above.
//
// 6. Guide link on ⓘ. The header info button used to open the
//    onboarding tour; now it opens the Singer's Guide (/guide) in
//    a new tab. The tour code stays for possible reuse.
//
// Prev/next controls (originally item 6 on the review list) turned
// out to already exist on both reading views — no work needed.
//
// Not touched: data schema, Firestore rules, all Session 6-47 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 47
// Bhajan Se Bhagwan Tak
// CHANGES (Session 47 — explainer moved from per-playlist to tab):
//
// 1. Removed the disabled "Live Performance · Programs only" block
//    from Playlist detail. It repeated on every playlist a user
//    opened, which was noisy.
// 2. Added a small always-visible one-liner right under the
//    Playlists/Programs toggle at the top of the tab, teaching
//    the distinction once:
//      🎵 Playlist — undated collection for daily practice.
//      📅 Program — dated event (jagran, sankirtan) with Live mode.
//    Smaller footprint, taught in the right place.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 46
// Bhajan Se Bhagwan Tak
// CHANGES (Session 46 — medley detail polish + related sort):
//
// 1. Medley detail view: compact header (small 🎭, text-xl
//    title, "N mukhdas · purpose" in a small line). Playlist and
//    Program keep the existing big hero card unchanged.
// 2. Live Performance block removed on medleys — never relevant
//    (you don't do a medley live from a stage). Still shown on
//    playlists as the "Programs only" explainer.
// 3. Related bhajans: DEITY FIRST, then mood similarity within
//    the same deity. Non-same-deity bhajans only fill remaining
//    slots and only if they share at least one mood. Previous
//    scoring could rank a mood-heavy other-deity bhajan above a
//    same-deity one.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 45
// Bhajan Se Bhagwan Tak
// CHANGES (Session 45 — labels, related logic, chips, daily picker):
//
// 1. "Tag" → "Mood" on all three filter dropdowns. Reading-view
//    "Keywords:" → "Moods:"; form labels "Keywords" → "Moods".
//    Data field is still `keywords` — labels only.
// 2. "Parody/Parodies" → "Medley/Medleys" in every user-facing
//    string. Data value stays type:'parody' (no migration).
// 3. ॐ removed: two placeholders and the transliteration map
//    ('om'/'aum' now → ओम). Splash never had it; posters are
//    static images (regenerate on request).
// 4. Related bhajans (both reading views) now score on deity +
//    moods: same deity = 2, each shared mood = 1. Previously
//    moods only, so a bhajan with no moods had no relatives.
// 5. Mood chips on the reading view were near-invisible
//    (5% bg / 70% text). Now teal 10% bg, full teal text, border,
//    semibold; dark-mode variant.
// 7. Admin daily-bhajan picker: Deity + Mood filter selects above
//    the search, match count, cap raised 20 → 60.
// 6. (User manual) shipped as public/guide.html — see outputs.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 44
// Bhajan Se Bhagwan Tak
// CHANGES (Session 44 — splash credits):
//
// Credits line on the splash screen now reads:
//   🙏 By Grace of Lord Babosa 🙏
//   Inspired by Manju Baisa
// (replaces "Made for the Bhajan Community / by Grace of Babosa
// Bhagwan").
//
// Also fixed: the credit block only ever appeared on the once-a-day
// FULL splash (2.8s). On the fast repeat-open splash (0.8s) its
// 1.6s animation delay meant it never rendered — the splash was
// gone first. New `splashFull` state lets the JSX pick short
// delays (tagline 0.1s, divider 0.25s, credit 0.35s, spinner 0.5s)
// on the fast splash, which is lengthened slightly to 1.1s so the
// line is legible. Full-splash timings unchanged.
//
// Not touched: everything else. (Parodies-in-setlists work,
// originally planned as S44, moves to S45.)
// ==============================================
//
// SANKIRTAN SAAS - SESSION 43
// Bhajan Se Bhagwan Tak
// CHANGES (Session 43 — parodies move to My Library; Save at top;
//                     auto-save setlists):
//
// MENTAL-MODEL FIX: a parody is a performance unit (a medley of
// mukhdas you sing at a jagran), not a kind of playlist. So it
// now lives with bhajans, not with collections. Data is untouched
// (still users/{uid}/programs with type:'parody'); only where it's
// shown and created changes. Session 44 will make parodies
// selectable INSIDE program/playlist setlists.
//
// MY LIBRARY
// - Header count: "N bhajans · K parodies in your collection".
// - "+ Add" is now two buttons: "+ Bhajan" (teal) and "+ 🎭 Medley"
//   (saffron). openCreateParody() opens the existing form pre-typed
//   as parody with the picker open.
// - Collapsible "🎭 Medleys (K)" pill above the bhajan list; rows
//   show name · N mukhdas · purpose; tap opens the mukhda view.
//   Hidden while searching/filtering. Auto-opens after creating one.
// - Parody detail back-nav → "← Back to My Library". Create-form
//   Cancel, post-save, and delete for parodies also return to
//   My Library.
//
// PLAYLISTS TAB
// - Back to two toggles (🎵 Playlists / 📅 Programs). 'parody'
//   retired as a persisted view-mode value. Create form no longer
//   offers Parody as a type (shows a locked 🎭 Medley chip only
//   when already creating/editing one).
//
// SAVE BUTTON AT TOP
// - Create/edit form header now has Save on the right ("💾 Save"
//   when creating, "💾 Save details" when editing). Bottom row
//   keeps Save/Cancel in create mode.
//
// AUTO-SAVE SETLIST ON EXISTING LISTS
// - In edit-program mode, any change to bhajanIds (add, remove,
//   reorder) writes to Firestore after a 600ms debounce. No Save
//   tap needed. Guarded so opening the editor doesn't write.
//   Bottom row shows status ("⏳ Saving setlist…" / "✓ Setlist
//   saved automatically" / "⚠️ Could not save") and a Done button
//   that returns to the refreshed detail view. Save details still
//   handles name/date/venue/purpose.
//
// Not touched: Firestore rules, schema, mukhda detection, S38
// Add-to picker (parodies remain valid targets), public library.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 42
// Bhajan Se Bhagwan Tak
// CHANGES (Session 42 — intuitiveness pass, from the S41 UX review):
//
// Kept as-is at user's request: "Playlists" tab name and all
// Playlist / Program / Parody labels.
//
// DEFAULT EXPERIENCE
// - Unregistered visitors land directly on the Public Library as
//   guests. No sign-in wall. onAuthStateChanged(null) → guestMode
//   true. Sign-in is one tap away (header button, locked tabs,
//   Save, "Add to"). Sign-out also lands on Public Library as guest.
// - Guest banner on Public Library: "You're browsing as a guest —
//   sign in (free) to save, build playlists, edit lyrics." One-tap
//   Sign in, dismissible per device (localStorage).
// - Compact card view is now the DEFAULT for users with no saved
//   preference (was full). Existing users keep their choice.
//
// REVIEW POINT 3 — "Add to" from Public reading view
// - New "📋 Add to" button on public-bhajan-detail. If the bhajan
//   isn't in My Library, it's saved first (reuses saveToMyLibrary,
//   which now RETURNS the new personal bhajan) then the S38 picker
//   opens. If already saved, the local copy is found via
//   savedFromPublicId. Guests are routed to sign-in.
// - First-ever Save shows a one-time hint toast about what saving
//   unlocks (playlists, editing).
//
// REVIEW POINT 4 — Live Mode on playlists/parodies
// - Was hidden; now visible-but-disabled with "Programs only" chip
//   and a one-line path forward (Edit → switch type to Program).
//
// REVIEW POINT 5 — voice-language chip
// - "HI"/"EN" → "🎤 हिं"/"🎤 EN" with a clearer tooltip. (The Hindi
//   TYPING toggle already read "🇮🇳 हिंदी ON" — left as is.) Plus a
//   one-line how-it-works hint under Lyrics while typing is ON:
//   "Type shyam → श्याम. Press space or tap a suggestion."
//
// REVIEW POINT 6 — mukhda rule made visible
// - Helper text under Lyrics: "Leave a blank line after the mukhda
//   so Medley view shows it correctly." Plus a LIVE chip: "Mukhda:
//   N lines" (teal) or "No blank line yet — first 3 lines will be
//   used" (saffron). Reuses getMukhda().
//
// REVIEW POINT 7 — dhun field
// - Sub-label: "The song or bhajan whose tune this is sung to".
//   Placeholder now a concrete example (both forms).
//
// REVIEW POINT 9 — taxonomy hints
// - Deity: "Who the bhajan is about". Category: "Type: bhajan,
//   aarti, chalisa…". Keywords: "Moods and occasions — #diwali
//   #morning #parody". Both user and admin forms.
//
// REVIEW POINT 10 — search placeholder
// - Both libraries: "🔍 Search — try 'shyam' or 'श्याम'".
//
// Not touched: Firestore rules, schema, S41 pills, cards, reading
// view layout, playlist/program/parody logic.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 41
// Bhajan Se Bhagwan Tak
// CHANGES (Session 41 — Source button on cards + discovery pills):
//
// Two additions in one session.
//
// 1. SOURCE BUTTON ON CARDS
// Previously "🔗 View Source" existed only on the reading view.
// Now shown on the FULL card view of both PublicBhajanCard and
// MyBhajanCard, as a small saffron text link ("🔗 Source")
// below the tap area. Opens source URL in new tab.
//
// Placement: outside the card's tap-button so it doesn't nest
// interactive elements (accessibility) and doesn't compete with
// "open reading view" as the primary click. stopPropagation on
// click prevents card open triggering when user wants source.
//
// Only rendered when bhajan.source is set — hidden for bhajans
// without a source (no empty label, no layout inconsistency
// signal to users that some bhajans "have less").
//
// Compact card view (both libraries): source NOT added.
// Compact means compact. Users wanting source from a compact
// card can tap in (one extra tap) — same trade compact users
// signed up for. Preserving the compact card's whole point.
//
// 2. COLLAPSIBLE DISCOVERY PILLS
// Home page had Popular Bhajans always-visible (Session 11).
// User asked to make it (and a new "Recently Added") into pills
// that expand on tap.
//
// New pattern:
//   [ 🔥 Popular Bhajans ▼ ] [ ✨ Recently Added ▼ ]
// Both collapsed by default (keeps home page compact — the
// whole point). Tapping expands 8 bhajans inline in the same
// compact-card layout Popular has used since Session 11. Only
// one open at a time — tapping the other collapses the first.
// Same tap-same-pill toggles it closed.
//
// Section entirely hidden when any filter/search is active
// (same rule as always for Popular).
//
// New memo: recentPublicBhajans (top 8 by createdAt descending,
// filtering out docs with no createdAt as a safety guard).
//
// State: expandedDiscoverySection = null | 'popular' | 'recent'.
//
// Design notes
// - Pills use saffron-active/cream-inactive visual, matching the
//   compact/full toggle style established earlier.
// - No localStorage persistence yet. If the "always collapsed"
//   default annoys users who liked Popular open, we add
//   remember-last-state in a follow-up. See first.
// - No dedup between Popular and Recently Added — same bhajan may
//   show in both sections. Signal of curation quality, minor
//   visual duplication. Skip until it's a real problem.
//
// Not touched: reading view Source link (kept), Firestore rules,
// schema, all Session 6-40 work.
//
// Meta-audit (per Session 30 promise): verified stopPropagation
// on source links prevents card-open on source-click; pill state
// tap-same-collapses works; hidden-when-filter guard preserved;
// no orphaned imports or dead code.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 40
// Bhajan Se Bhagwan Tak
// CHANGES (Session 40 — three focused improvements):
//
// 1. UPDATE-AVAILABLE BANNER (undoes some of Session 30, but
//    RIGHT this time). Session 30 removed the old "App Updated!"
//    modal because its content was hardcoded and stale. Now
//    users don't know when to refresh to get new features.
//    New approach: non-blocking bottom banner, no marketing
//    copy, no feature list, just "New version available.
//    Refresh?" with a button. Refresh triggers window.location
//    .reload() which pulls the new bundle.
//    Detection: poll index.html every 5 min + on tab focus,
//    hash the content, compare against the mount-time baseline.
//    Any change = new deploy (Vercel bundles reference hashed
//    JS filenames from index.html — deterministic per deploy).
//    Zero manual version-file maintenance.
//    Dismissible per-session. Won't nag; won't stay silent.
//
// 2. COMPACT DAILY CARD. Session 31 shrunk it; Session 33
//    removed buttons; user wanted it even smaller — same size
//    as regular compact cards. Now it's a normal card layout
//    (rounded-xl p-3, flex row) with a small "🌟 आज का" chip
//    on the right where the Save button would be. No gradient
//    bg, no big header text. Note (if curated) shows as one
//    italic line below meta. Whole card still tappable.
//
// 3. PERSONAL-READ → PUBLIC READCOUNT. Popular Bhajans ranking
//    used readCount from Public Library reads only. Now,
//    when a user reads a bhajan from their personal library
//    that ORIGINATED as a public bhajan (savedFromPublicId
//    set), we also bump the source public bhajan's readCount.
//    Both surface reads and personal-library reads contribute
//    to popularity signal. Fire-and-forget write — doesn't
//    block the reading view if it fails.
//    Firestore rules (Session 19) already permit this.
//
// Skipped from user request: realtime voice search. User asked
// to defer to a later session. Web Speech API works well on
// Android Chrome but iOS Safari support is spotty — worth
// building carefully in its own session.
//
// Not touched: everything else. All Session 6-39 work intact.
// Firestore rules unchanged.
//
// Meta-audit (per Session 30 promise): update banner detection
// won't false-positive on first mount (baseline set on first
// fetch). Dismiss is per-session (natural page reload resets).
// Personal-read → public counter uses fire-and-forget so
// Firestore failure doesn't block user flow.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 39
// Bhajan Se Bhagwan Tak
// CHANGES (Session 39 — तर्ज़ in parody mukhda blocks):
//
// User asked to show तर्ज़ (dhun / tune) along with the bhajan
// title in the parody view. Small addition, real value — the
// singer performing a parody medley needs to know the tune at
// a glance, not just the title.
//
// Sub-line below title, before the mukhda:
//   1. श्री दुर्गा चालीसा             Tap for full →
//      तर्ज़: कोई कहे कि जीत गया
//
//      [mukhda lines large]
//
// Only rendered when bhajan.dhun is set (many bhajans don't
// have a dhun — no empty line for those).
//
// Convention "तर्ज़: X" matches the standard playlist/program
// bhajan list render (line ~7420). Consistent across the app.
// Saffron/orange color chosen to visually associate it with
// the number marker (already saffron) rather than the title
// (teal). Truncates on overflow so long dhun names don't
// break card layout.
//
// Not touched: everything else. Standard playlist/program
// render (which already shows dhun), reading view, all other
// Session 6-38 work.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 38
// Bhajan Se Bhagwan Tak
// CHANGES (Session 38 — Add to Program/Playlist/Parody + back-nav
//                     bug fix):
//
// Two user asks in one session:
//
// 1. BUG FIX: bhajan-detail back button ignored programContext
//    (Session 34 state). Even after tapping into a bhajan FROM
//    a parody, hitting Back went to the library home. Now the
//    button routes back to program-detail when programContext
//    is set, with type-aware label: "← Back to Parody" / "← Back
//    to Playlist" / "← Back to Program". Falls back to library
//    behavior when no context.
//
// 2. NEW FEATURE: "📋 Add to" button in the bhajan-detail action
//    row opens a picker of all the user's programs/playlists/
//    parodies. Tap one → append this bhajan's ID to that
//    program's bhajanIds. Toast confirms. Modal stays open so
//    user can add to multiple in one flow.
//
// Picker design
// - Grouped by type: Parodies first (newest concept), then
//   Playlists, then Programs. Each section alphabetical.
// - Already-added rows show "✓ Added" and are disabled.
// - Saving spinner during Firestore write (rapid-tap guard).
// - Empty-state CTA when user has no programs yet.
// - Bottom sheet on mobile, centered dialog on desktop.
// - ESC key + tap-outside close it.
//
// Optimistic UI
// - addBhajanToProgram updates local `programs` state
//   immediately, then writes to Firestore. On failure, reverts
//   the local update and shows an error toast. Feels instant on
//   good networks; still correct on bad networks.
//
// Scope
// - Only on My Library reading view (bhajan-detail). Public
//   Library reading view (public-bhajan-detail) NOT included in
//   this pass — that surface needs a save-then-add flow which
//   is a bigger design decision. Ship the common case first.
// - Only for logged-in users (guests have no programs).
//
// Not touched: schema, rules, existing modals, all Session 6-37.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 37
// Bhajan Se Bhagwan Tak
// CHANGES (Session 37 — mukhda detection by blank line):
//
// User's actual mukhda convention: "I always leave a blank line
// after mukhda before the para starts." Session 36's default of
// "first 3 lines" was arbitrary and wrong for bhajans with 1-line
// or 5-line mukhdas.
//
// New getMukhda priority (most specific → most fallback):
//   1. If bhajan.mukhdaLines is set → take that count (explicit
//      override for anyone who wants exact control regardless
//      of formatting).
//   2. Else if lyrics have a blank line → take everything BEFORE
//      the first blank line. Matches user's convention exactly.
//      Handles arbitrary mukhda lengths.
//   3. Else → first 3 non-empty lines. Degrades gracefully for
//      legacy/imported bhajans with no paragraph structure
//      (rather than dumping the whole bhajan into mukhda view).
//
// Leading blank lines skipped before detection. Whitespace-only
// lines counted as blank (real-world lyrics data often has
// stray spaces on "empty" lines).
//
// Self-tested with 12 cases covering:
//   - Well-formatted 1/2/4-line mukhdas
//   - No-blank-line fallback
//   - Explicit override
//   - Edge cases: empty lyrics, null bhajan, only-blank lyrics,
//     leading blanks, multiple blanks between mukhda and para,
//     whitespace-only "blank" lines
//   All 12 pass.
//
// Not touched: schema, UI, form, everything else in Session 36.
// Pure logic improvement — parody display now correctly reflects
// user's own formatting convention.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 36
// Bhajan Se Bhagwan Tak
// CHANGES (Session 36 — Parody as a third type):
//
// User asked for a "parody" feature: a playlist type where the
// detail view shows just the MUKHDA (opening lines) of each
// bhajan in the medley, so a singer can see the arc of all 5-6
// bhajans at a glance. Tapping a mukhda opens the full reading
// view. Back-nav returns to the parody. Purpose: singing a
// continuous medley at jagrans/kirtans where singer needs to
// remember the sequence and occasionally see full lyrics.
//
// Design decisions (all recommended defaults from planning):
//
// - Third type alongside Playlist and Program. Not a display
//   mode on existing playlists. Cleaner conceptually — a parody
//   is functionally different (renders as mukhda blocks, not
//   bhajan cards), so it deserves its own type.
//
// - Mukhda default: first 3 non-empty lines. Optional
//   per-bhajan override via new `mukhdaLines` field on the
//   bhajan doc (e.g., mukhdaLines: 5 for bhajans with a longer
//   mukhda). No migration needed — existing bhajans use default.
//
// - Tap opens the full reading view with programContext set
//   (same Session 34 pattern as playlists). Back nav shows
//   "← Back to [Parody name]" and reading view shows "🎭 More
//   in this parody" siblings at the bottom. No modal overlay.
//
// - Live Performance button hidden on parodies AND playlists.
//   Only shown for 'program' type (dated performance events).
//
// Schema
// - New `type` value: 'parody' (existing: 'playlist', 'program').
//   getProgramType() extended to recognize it.
// - New `mukhdaLines` field on bhajan docs (optional, number,
//   default 3). Currently no UI to set this — admin/user would
//   set it via a future edit-form update. For now, default 3
//   works for most Marwari devotional pieces.
// - No Firestore rules change (existing rules cover new fields).
// - No migration needed for existing parodies (there are none).
//
// UI changes
// - Bottom tab: unchanged ("Playlists").
// - List page: three-way toggle (🎵 Playlists / 📅 Programs /
//   🎭 Medleys), each persists to localStorage as before.
// - Card render: 🎭 emoji for parody, "Open Parody →" CTA.
// - Detail render: parody type renders MUKHDA BLOCKS — bhajan
//   title small at top, first 3 lines of lyrics large below,
//   "Tap for full →" hint. Not the standard bhajan-cards list.
// - Create form: three-way type toggle. Parody uses the same
//   fields as Playlist (name + optional purpose). Description
//   text explains what a parody is.
// - Toasts, delete confirms, validation errors, bhajan-count
//   labels — all parody-aware.
//
// New helpers
// - getMukhda(bhajan): returns the first N non-empty lines,
//   where N is bhajan.mukhdaLines or 3.
//
// Not touched
// - Playlist and Program behavior — completely unchanged
// - Firestore rules
// - Live Mode (still hidden for playlists AND parodies)
// - All Session 6-35 work
//
// Meta-audit (Session 30 promise): verified every playlist/
// program label site is now parody-aware. Reading-view sibling
// label switches emoji + text. Empty-state uses parody copy.
// Toggle persistence covers new value.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 35
// Bhajan Se Bhagwan Tak
// CHANGES (Session 35 — Hindi typing on Lyricist field):
//
// The rachnākāra (composer) field was a plain input with no
// transliteration support. Adding composers like साध्वी कनकश्रीजी
// or आचार्यश्री तुलसी required a Devanagari keyboard or paste.
// Hindi typing was already wired on title/lyrics/dhun; this
// completes the set.
//
// Wired both user form (bhajanForm.lyricist via handleHindiInput
// /handleHindiKeyDown/applySuggestion) and admin form
// (publicBhajanForm.lyricist via handlePublicHindiInput/
// KeyDown/applyPublicSuggestion). Same suggestions dropdown UI,
// same state (showSuggestions, activeTypingField, currentWord,
// transliterationSuggestions).
//
// Handlers are already field-name-generic via [fieldName] index —
// no handler code changed, just added 'lyricist' as a valid field
// name at the JSX call sites.
//
// Not touched: singer field (also a plain input, but singer names
// are almost always English/Latin — Anup Jalota, Lata Mangeshkar —
// so Hindi typing there would be occasional noise, not consistent
// help). If you want it there too, ask — 30-second change.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 34
// Bhajan Se Bhagwan Tak
// CHANGES (Session 34 — playlist context in reading view + no Live
//                     Performance for playlists):
//
// User raised two Session-32 issues while using the new Playlists:
//
// 1. "Start Live Performance" showed on a Playlist. Live Mode is
//    for jagrans/sankirtans (dated events, performance-focused),
//    not for daily-practice playlists. Now hidden when
//    getProgramType(program) === 'playlist'. Users who want Live
//    Mode on a playlist can convert it to a Program via edit.
//
// 2. "Related Bhajans" (keyword-matched from library) appeared
//    below the reading view even when the user opened the bhajan
//    from a playlist. Broke the mental model of "I'm reading
//    through my playlist." Now, when opened from a playlist/
//    program context, the reading view shows "🎵 More in this
//    playlist" with the OTHER bhajans from that specific
//    playlist/program (siblings, current one excluded, in order).
//    Falls back to the original Related Bhajans behavior for
//    bhajans opened directly from My Library.
//
// Implementation
// - New state: programContext, set when tapping a bhajan card
//   from program-detail view, holds the whole program object.
// - Auto-clear effect: whenever currentView leaves the playlist
//   flow (not bhajan-detail AND not program-detail), context
//   clears. So navigating to Public / My Library / Programs
//   list resets the context. Navigating bhajan → program-detail
//   → another bhajan preserves it (both views are "in flow").
// - Context validity check: programContext is only used if the
//   currently-selected bhajan is actually IN the program's
//   bhajanIds. Handles the edge case where user navigates via
//   Prev/Next arrows to a bhajan outside the playlist.
//
// Also fixed (Session 32 meta-audit miss):
// - "Bhajans in this Program:" heading — now says "Playlist"
//   for playlist type.
// - "No bhajans in this program yet" empty-state — same fix.
//
// Not touched: Related Bhajans on Public Library reading view
// (public-bhajan-detail is not reached from a playlist tap; the
// playlist references personal-library IDs, so this doesn't
// apply). Live Mode logic unchanged for actual programs.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 33
// Bhajan Se Bhagwan Tak
// CHANGES (Session 33 — cleaner daily card):
//
// Removed Read and Share buttons from the "आज का भजन" card
// on the Public Library. The whole card is still tappable
// (opens the reading view via the parent onClick handler);
// Share is still available in the reading view header.
//
// One extra tap to share, but the card is visually cleaner
// and matches Session 31's compact-card direction.
//
// Not touched: everything else. Card structure, gradient bg,
// Curated chip, note display, meta line, tap-to-open behavior
// all unchanged. handleShareBhajan and openPublicBhajanDetail
// are still called elsewhere so nothing orphaned.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 32
// Bhajan Se Bhagwan Tak
// CHANGES (Session 32 — Playlists as a sibling to Programs):
//
// User asked to add a "playlist" concept alongside the existing
// "program" concept. Playlists are recurring undated collections
// (Morning Prayers, Krishna Favorites); Programs are one-time
// dated events (Tuesday Jagran).
//
// Design decisions
//
// - Single Firestore collection (users/{uid}/programs). No new
//   subcollection, no data migration. Type distinguished by a
//   new optional `type` field ('playlist' | 'program').
//
// - Legacy documents (created before Session 32, no `type` field)
//   are inferred at display time via getProgramType():
//     - date present → 'program'
//     - date empty → 'playlist'
//   Trusts the data. Users can edit to correct if inference wrong.
//
// - Bottom tab renamed "Programs" → "Playlists" (single word,
//   friendlier). Internal view identifier stays 'programs' to
//   avoid needless churn.
//
// - Toggle at top switches Playlists / Programs views. Same
//   visual style as compact/full card toggle in the libraries.
//   Selection persists in localStorage ('sankirtan-playlist-view').
//
// - Create form: type toggle at top. When 'playlist', shows a
//   short optional "Purpose" field instead of date/venue. When
//   'program', shows date + venue as before. Switching doesn't
//   clear fields.
//
// - Cards: differentiated by type (🎵 vs 📅, purpose vs date/venue).
//   Empty-state copy adapts to selected toggle.
//
// - Toasts, delete-confirms, validation errors, form title —
//   all type-aware.
//
// - New Create button seeds programForm.type from playlistViewMode.
//
// Not touched: existing programs' data, Live Mode, share/save/read
// flows, Firestore rules. Pure UX addition on top of existing schema.
//
// Meta-audit (per Session 30 promise): "Back to Playlists" nav,
// tab bar, header, onboarding step all updated.
// ==============================================
//
// SANKIRTAN SAAS - SESSION 31
// Bhajan Se Bhagwan Tak
// CHANGES (Session 31 — three Daily Bhajan improvements):
//
// 1. Compact card on Public Library
//    The "आज का भजन" card used to take significant vertical
//    space (lyric preview + large padding). Removed the lyric
//    preview, tightened padding, slightly smaller title. Card
//    is now ~half the previous height. Still visually
//    distinctive (saffron border, gradient bg, "TODAY'S
//    BHAJAN" chip) — just doesn't dominate the scroll.
//
// 2. Searchable bhajan picker in admin scheduler
//    Old <select> dropdown listed all 250+ bhajans alphabetically.
//    Finding a specific one meant scrolling forever. Replaced
//    with a search input that filters by title, deity, or दhun
//    as you type. Shows up to 20 matches in a scrollable
//    dropdown. Once selected, shows a chip with a Change button
//    to swap. New state: dailyEditSearch, dailyEditSearchOpen.
//
// 3. Share button in admin scheduler
//    Admin used to have to save the daily pick, then navigate
//    to Public Library, then tap the daily card, then Share.
//    Now there's a "↗ Share" button right next to Save in the
//    admin scheduler. Uses the currently-selected bhajan + note
//    (regardless of whether it's been saved yet — useful for
//    previewing what today's share would look like).
//
// Not touched: everything else. resolvedDailyBhajan memo, the
// Firestore schema, the read/save/share flow, all Session 6-30
// work. No new dependencies, no rules changes.
// ==============================================

// ==============================================
// SANKIRTAN WORDMARK COMPONENT (Devanagari)
// ==============================================
const WORDMARK_FONT = "'Noto Sans Devanagari', 'Mangal', system-ui, sans-serif";
// SESSION 61: lyrics font. Noto Sans Devanagari is now loaded from Google
// Fonts (index.html), so Hindi lyrics render in a proper typeface instead
// of whatever the phone happens to ship with.
const LYRICS_FONT = "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif";

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
const APP_VERSION = '2026.10.28.s133';
const AUTO_SCROLL_VIEWS = ['live-program', 'bhajan-detail', 'public-bhajan-detail'];
const LIVE_SCROLL_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

// SESSION 30: log at startup so admin can verify which build is
// running via the browser console (helps diagnose "is my new
// deploy live?" without needing the removed "App Updated" modal).
try {
  // eslint-disable-next-line no-console
  console.log('Sankirtan build:', APP_VERSION);
} catch { /* non-fatal */ }

// ==============================================
// SESSION 12: Session-scoped shuffle for Public Library
//
// mulberry32 is a tiny, fast, deterministic pseudo-random generator.
// Same seed → same sequence of numbers → same shuffle result. This
// is what makes the shuffle *stable* within a session (so search,
// filter, and load-more don't re-randomize) while still giving a
// fresh order on each new session.
//
// The seed itself lives in sessionStorage. sessionStorage clears
// when the tab closes, so a "session" naturally means "one browsing
// stretch." Reopening the app in a new tab gets a new seed → new
// shuffle → feels like new content on return visits.
// ==============================================
const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// SESSION 71: forgiving search. Both the query and the bhajan text are
// folded to a loose key so "Shree Ganesh", "shri ganesha", "sree ganes"
// and "श्री गणेश" / "श्रि गनेश" all meet. Latin: diacritics stripped,
// aspirates and doubled vowels collapsed, w→v, z→j, ph→f, trailing
// schwa dropped. Devanagari: nukta and chandrabindu folded, long vowels
// shortened, श/ष→स, ण→न, ऋ→रि. Punctuation and dandas removed.
const foldSearchKey = (str) => {
  if (!str) return '';
  let t = String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
  // Devanagari folds
  t = t
    .replace(/़/g, '')              // nukta
    .replace(/ँ/g, 'ं')        // chandrabindu → anusvara
    .replace(/ी/g, 'ि')        // ी → ि
    .replace(/ू/g, 'ु')        // ू → ु
    .replace(/ई/g, 'इ')        // ई → इ
    .replace(/ऊ/g, 'उ')        // ऊ → उ
    .replace(/ै/g, 'े')        // ै → े
    .replace(/ौ/g, 'ो')        // ौ → ो
    .replace(/औ/g, 'ओ')        // औ → ओ
    .replace(/ऐ/g, /ए/.source) // ऐ → ए
    .replace(/[शष]/g, 'स') // श ष → स
    .replace(/ण/g, 'न')        // ण → न
    .replace(/ऋ/g, 'रि')  // ऋ → रि
    .replace(/ृ/g, '्रि') // ृ → ्रि
    .replace(/[।॥]/g, ' ');    // । ॥
  // Latin folds (only touch a-z runs)
  t = t.replace(/[a-z]+/g, (w) => w
    .replace(/chh/g, 'ch')
    .replace(/([kgjtdpb])h/g, '$1')
    .replace(/sh/g, 's')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/y(?![aeiou])/g, 'i')      // jay → jai, but shyam keeps y
    .replace(/ee|ii/g, 'i')
    .replace(/oo|uu/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/([bcdfghjklmnpqrstvxyz])\1/g, '$1')
    .replace(/^(.{3,}[^aeiou])a$/, '$1'));
  return t.replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
};

// Per-bhajan folded text, cached on the object (Firestore snapshots hand
// us fresh objects on change, so the cache naturally invalidates).
const searchIndexCache = new WeakMap();
const getSearchIndex = (b) => {
  let idx = searchIndexCache.get(b);
  if (idx) return idx;
  idx = {
    title: foldSearchKey(b.title),
    meta: foldSearchKey([b.dhun, b.singer, b.lyricist, ...(b.keywords || [])].filter(Boolean).join(' ')),
    lyrics: foldSearchKey(b.lyrics)
  };
  searchIndexCache.set(b, idx);
  return idx;
};

// Returns 0 (title), 1 (dhun/singer/keywords), 2 (lyrics) or -1 (no match).
// Multi-word queries match when every word is found somewhere in that field.
//
// SESSION 89: partial matches. Voice search hands back a whole phrase, and
// one mis-heard word used to give zero results. A query of 3+ words now
// also matches when at least half its words hit one field; those land in
// tiers 10+ (after every full match) and sort by how many words missed.
const searchTier = (b, foldedQuery) => {
  if (!foldedQuery) return 0;
  const idx = getSearchIndex(b);
  const words = foldedQuery.split(' ').filter(Boolean);
  const hit = (field) => field && words.every(w => field.includes(w));
  if (hit(idx.title)) return 0;
  if (hit(idx.meta)) return 1;
  if (hit(idx.lyrics)) return 2;
  if (words.length < 3) return -1;
  const need = Math.ceil(words.length / 2);
  const count = (field) => (field ? words.filter(w => field.includes(w)).length : 0);
  let best = -1;
  [idx.title, idx.meta, idx.lyrics].forEach((field, fi) => {
    const c = count(field);
    if (c >= need) {
      const tier = 10 + fi * 100 + (words.length - c);
      if (best < 0 || tier < best) best = tier;
    }
  });
  return best;
};

// Stable re-order: title matches first, then dhun/keywords, then lyrics.
const rankByTier = (list, foldedQuery) => {
  if (!foldedQuery) return list;
  return list
    .map((b, i) => ({ b, i, t: searchTier(b, foldedQuery) }))
    .sort((x, y) => x.t - y.t || x.i - y.i)
    .map(x => x.b);
};

// SESSION 77: top-N title matches for the search dropdown.
const titleSuggestions = (list, rawQuery, n = 5) => {
  const q = foldSearchKey(rawQuery);
  if (!q || q.length < 2) return [];
  const out = [];
  for (const b of list) {
    if (searchTier(b, q) === 0) { out.push(b); if (out.length >= n) break; }
  }
  return out;
};

// SESSION 77: "Did you mean" — nearest titles by edit distance on the
// folded key, for the zero-results state.
const editDistance = (a, b) => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
};
const didYouMean = (list, rawQuery, n = 3) => {
  const q = foldSearchKey(rawQuery);
  if (!q || q.length < 3) return [];
  const qWords = q.split(' ');
  const scored = [];
  for (const b of list) {
    const idx = getSearchIndex(b);
    if (!idx.title) continue;
    // best word-level distance: each query word vs each title word
    const tWords = idx.title.split(' ');
    let total = 0;
    for (const qw of qWords) {
      let best = Infinity;
      for (const tw of tWords) best = Math.min(best, editDistance(qw, tw));
      total += best;
    }
    const budget = Math.max(1, Math.floor(q.replace(/ /g, '').length * 0.4));
    if (total <= budget) scored.push({ b, d: total });
  }
  scored.sort((x, y) => x.d - y.d);
  const seen = new Set();
  return scored.filter(x => { const k = x.b.title; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n).map(x => x.b);
};

const seededShuffle = (arr, seed) => {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const getSessionShuffleSeed = () => {
  try {
    const KEY = 'sankirtan-shuffle-seed';
    let seed = sessionStorage.getItem(KEY);
    if (!seed) {
      // 32-bit non-zero seed
      seed = String((Math.floor(Math.random() * 0xFFFFFFFE) + 1) >>> 0);
      sessionStorage.setItem(KEY, seed);
    }
    return parseInt(seed, 10) || 1;
  } catch {
    // sessionStorage disabled (rare) — fall back to a per-page-load
    // seed. Still gives a shuffle, just not stable if the app
    // somehow re-mounts within the same load.
    return (Math.floor(Math.random() * 0xFFFFFFFE) + 1) >>> 0;
  }
};

// SESSION 16: today's date as a YYYY-MM-DD key in the user's local
// timezone. Used as the Firestore doc id in the `dailyBhajans`
// collection AND as the seed for the deterministic fallback pick.
// Local timezone matters — an admin in Delhi setting "tomorrow's"
// bhajan needs their tomorrow, not UTC's.
const getTodayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// SESSION 66: human-readable program date. "Today", "Tomorrow",
// "Sat, 18 Oct", or "18 Oct 2025" when it's another year.
const formatProgramDate = (dateStr) => {
  if (!dateStr) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!m) return String(dateStr);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = getTodayKey();
  const key = getTodayKey(d);
  if (key === today) return 'Today';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === getTodayKey(tomorrow)) return 'Tomorrow';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-IN', sameYear
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
};
const isPastProgramDate = (dateStr) => !!dateStr && String(dateStr).trim() < getTodayKey();

// SESSION 16: hash a YYYY-MM-DD date string to a 32-bit int
// suitable for seeding mulberry32. Simple FNV-1a — deterministic,
// fast, no collisions we care about at this scale.
// eslint-disable-next-line no-unused-vars
const hashDateKey = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
};

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
    title: '🎵 Playlists & Programs',
    description: 'Playlists for daily practice, Programs for jagrans & sankirtans. Live Mode shows big text, keeps screen awake, and lets you navigate hands-free during performances.',
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
  'jai': 'जय', 'shri': 'श्री', 'shree': 'श्री', 'om': 'ओम', 'aum': 'ओम',
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

// ==============================================
// SESSION 94: DICTATION CORRECTION
// Speech engines (iOS especially) mangle devotional names: "jai shree
// babosa" → "जाए बाबू साहब". Two passes fix most of it:
//  1. Phrase fixes for names that are mangled the same way every time.
//  2. Snap each word to the nearest word the app already knows (titles,
//     lyrics and dhun across the user's library + public library, plus
//     a seed list), when it is within a letter or two of it.
// ==============================================
const DICTATION_PHRASE_FIXES = [
  // names first, so the "जय" rule below can see them
  [/(^|\s)(बाबू\s*(?:साहब|सा|सहाब|सहा|शा|साब)|बाबो\s*सा|बाबूसा|बबोसा|बाबोशा|बाबो\s*साँ|बाबोसां)(?=\s|$)/g, '$1बाबोसा'],
  [/(^|\s)(सिरी|श्रि|स्री|शिरी|सिरि)(?=\s|$)/g, '$1श्री'],
  [/(^|\s)(खाटू|खाटु|काटू|खातू)\s*(स्याम|श्याम|शाम|स्वामी)(?=\s|$)/g, '$1खाटू श्याम'],
  [/(^|\s)(हनूमान|हनुमाँ|हनुमन|हनुमा)(?=\s|$)/g, '$1हनुमान'],
  [/(^|\s)(गनेश|गणेस|गनेस)(?=\s|$)/g, '$1गणेश'],
  [/(^|\s)(किसन|किशन|कृष्न|क्रिश्ना|कृष्णा)(?=\s|$)/g, '$1कृष्ण'],
  [/(^|\s)(भगवन|भगवाँ)(?=\s|$)/g, '$1भगवान'],
  [/(^|\s)(गिरधर|गिरीधर)(?=\s|$)/g, '$1गिरिधर'],
  [/(^|\s)(जाए|जाये|जे|जै|जाय|जय्|जयि|जाओ)(?=\s+(श्री|हो|बाबोसा|बाबा|माता|गणेश|हनुमान|श्याम|राम|श्री))/g, '$1जय'],
];
const DICTATION_SEED_WORDS = Object.values(HINDI_FALLBACK_MAP).concat([
  'बाबोसा', 'चूरू', 'धाम', 'म्हारो', 'म्हारा', 'थारो', 'थारा', 'जय', 'जयकारा', 'सांवरिया', 'सांवरा', 'खाटू', 'श्याम', 'गिरिधर', 'गोपाल',
  'मीरा', 'कन्हैया', 'मुरलीधर', 'बांके', 'बिहारी', 'वृंदावन', 'बरसाना', 'गोकुल', 'सालासर', 'बालाजी', 'मेहंदीपुर', 'भैरव', 'भैरूं',
  'करणी', 'जीण', 'शाकंभरी', 'अंबे', 'दुर्गा', 'शेरांवाली', 'ज्योत', 'आरती', 'कीर्तन', 'सत्संग', 'महिमा', 'कृपा', 'दया', 'शरण', 'चरण', 'दर्शन',
  'भक्त', 'भक्ति', 'नमो', 'नमः', 'ओम', 'णमो', 'अरिहंताणं', 'सिद्धाणं', 'पारसनाथ', 'महावीर', 'स्वामी', 'स्तवन', 'चैत्य', 'वंदना',
]);
const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
};
// vocab: Map<foldedKey, { word, count }>  (built by the app from its bhajans)
const buildDictationVocab = (lists) => {
  const vocab = new Map();
  const add = (w, n) => {
    if (!w || !/[ऀ-ॿ]/.test(w)) return;
    const k = foldSearchKey(w);
    if (!k) return;
    const e = vocab.get(k);
    if (e) { e.count += n; if (n > e.best) { e.best = n; e.word = w; } }
    else vocab.set(k, { word: w, count: n, best: n });
  };
  DICTATION_SEED_WORDS.forEach(w => add(w, 50));
  lists.forEach(list => (list || []).forEach(b => {
    [b.title, b.dhun, b.lyrics].filter(Boolean).join(' ').split(/[\s।॥,.!?/()\-–—"'“”‘’]+/).forEach(w => add(w.replace(/^[^ऀ-ॿ]+|[^ऀ-ॿ]+$/g, ''), 1));
  }));
  return vocab;
};
const correctDictation = (text, vocab) => {
  if (!text) return text;
  let t = ' ' + text.replace(/\s+/g, ' ').trim();
  DICTATION_PHRASE_FIXES.forEach(([re, rep]) => { t = t.replace(re, rep); });
  t = t.trim();
  if (!vocab || vocab.size === 0) return t;
  const words = t.split(' ');
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!/[ऀ-ॿ]/.test(w)) { out.push(w); continue; }
    const k = foldSearchKey(w);
    const exact = vocab.get(k);
    if (exact) { out.push(exact.count >= 2 ? exact.word : w); continue; }
    // two short words that are really one ("बाबो सा" → "बाबोसा")
    if (i + 1 < words.length && /[ऀ-ॿ]/.test(words[i + 1])) {
      const joined = vocab.get(foldSearchKey(w + words[i + 1]));
      if (joined && joined.count >= 2) { out.push(joined.word); i++; continue; }
    }
    if (k.length < 3) { out.push(w); continue; }
    const maxD = k.length <= 4 ? 1 : 2;
    let best = null, bestD = maxD + 1;
    for (const [vk, e] of vocab) {
      if (Math.abs(vk.length - k.length) > maxD || e.count < 2) continue;
      const d = levenshtein(k, vk);
      if (d < bestD || (d === bestD && best && e.count > best.count)) { bestD = d; best = e; }
      if (bestD === 0) break;
    }
    out.push(best ? best.word : w);
  }
  return out.join(' ');
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
// SESSION 13: for public bhajans, appends a deep link
// (?b=<id>) so recipients land directly on that bhajan
// instead of the home page. Private-library bhajans still
// share as text only — a private-id link wouldn't be
// resolvable by the recipient anyway.
// SESSION 17: when the share originates from the "आज का भजन"
// card (isDaily = true), prepend a bilingual tag so recipients
// in a WhatsApp group understand WHY the sender is sharing it
// ("today's featured bhajan") and are more likely to tap the
// link. Also includes the curator's optional note if present.
// ==============================================
// ==============================================
// SHARE APP HELPER (Session 29) — one-tap invite to sankirtan.app
// Same navigator.share + clipboard fallback pattern as shareBhajan.
// Message is short and bilingual, respecting the app's identity.
// ==============================================
// ==============================================
// PROGRAM/PLAYLIST TYPE HELPER (Session 32)
// Returns 'playlist' or 'program' for any doc, whether it was
// created before Session 32 (no explicit type field) or after.
//
// Rule:
//   - If explicit `type` field exists and is valid → use it
//   - Else, legacy inference: date present → 'program', else → 'playlist'
//
// Trusting the data on legacy docs: if a user created a program
// without a date, we treat it as a playlist. If they intended it
// as an unfinished event, they can add a date via edit to move it
// back. Assumption: most existing programs have dates.
// ==============================================
const getProgramType = (program) => {
  if (!program) return 'program';
  // SESSION 36: 'parody' added as a third valid type. Same explicit
  // handling as playlist/program — no legacy inference for parody
  // (didn't exist before, so any parody doc must have explicit type).
  if (program.type === 'playlist' || program.type === 'program' || program.type === 'parody') {
    return program.type;
  }
  return (program.date && String(program.date).trim()) ? 'program' : 'playlist';
};

// SESSION 36/37: helper for extracting the mukhda (opening lines)
// of a bhajan for the parody compact-view render.
//
// Priority order (most specific → most fallback):
//   1. If bhajan.mukhdaLines is explicitly set → take that many
//      non-empty lines. Override for anyone who wants an exact
//      count regardless of formatting.
//   2. Else if the lyrics contain a blank line → take everything
//      BEFORE the first blank line. This is the user's stated
//      convention: "I always leave a blank line after mukhda
//      before the para starts." Well-formatted bhajans use this.
//      Handles arbitrary mukhda lengths (1 line, 4 lines, 8
//      lines — whatever the actual mukhda is).
//   3. Else → first non-empty line (was 3 until Session 91). Fallback for legacy or
//      imported bhajans (e.g., Kabir Bhajan Mala) that don't
//      have paragraph separators. Degrades gracefully instead
//      of dumping the entire bhajan into the mukhda view.
//
// Leading blank lines are always skipped before mukhda detection
// begins — an accidental blank line at the very top of lyrics
// shouldn't produce an empty mukhda.
const getMukhda = (bhajan) => {
  if (!bhajan || !bhajan.lyrics) return '';
  const rawLines = String(bhajan.lyrics).split('\n');

  // Skip leading blank lines
  let start = 0;
  while (start < rawLines.length && rawLines[start].trim().length === 0) {
    start++;
  }

  // Tier 1: explicit override
  const override = Number(bhajan.mukhdaLines);
  if (override > 0) {
    const nonEmpty = rawLines.slice(start).filter(l => l.trim().length > 0);
    return nonEmpty.slice(0, override).map(l => l.trim()).join('\n');
  }

  // Tier 2: blank-line detection (user's stated convention)
  // Walk from start; collect lines until we hit a blank line.
  const mukhdaLines = [];
  let sawBlankAfterContent = false;
  for (let i = start; i < rawLines.length; i++) {
    if (rawLines[i].trim().length === 0) {
      // First blank line encountered after content → mukhda ends here
      if (mukhdaLines.length > 0) {
        sawBlankAfterContent = true;
        break;
      }
      // Otherwise (shouldn't happen since we skipped leading blanks)
      continue;
    }
    mukhdaLines.push(rawLines[i].trim());
  }

  if (sawBlankAfterContent && mukhdaLines.length > 0) {
    return mukhdaLines.join('\n');
  }

  // Tier 3: no blank-line structure → the first line is the mukhda.
  // (SESSION 91: was the first 3 lines; the first line break now marks
  // the mukhda when no explicit break was added.)
  const allNonEmpty = rawLines.slice(start).filter(l => l.trim().length > 0);
  return allNonEmpty.slice(0, 1).map(l => l.trim()).join('\n');
};

// SESSION 70: split lyrics into the mukhda (opening refrain) and the
// rest so the mukhda can be emphasised. Returns null when the lyrics
// have no detectable refrain (no blank-line stanza break and no explicit
// mukhdaLines) — in that case callers render the lyrics unchanged rather
// than bolding three arbitrary lines.
const splitMukhda = (bhajan) => {
  if (!bhajan || !bhajan.lyrics) return null;
  const text = String(bhajan.lyrics).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  let start = 0;
  while (start < lines.length && lines[start].trim().length === 0) start++;
  const override = Number(bhajan.mukhdaLines);
  let end = -1; // index of first line after the mukhda
  if (override > 0) {
    let seen = 0;
    for (let i = start; i < lines.length; i++) {
      if (lines[i].trim().length > 0 && ++seen === override) { end = i + 1; break; }
    }
  } else {
    for (let i = start; i < lines.length; i++) {
      if (lines[i].trim().length === 0) { end = i; break; }
    }
  }
  if (end <= start || end >= lines.length) return null;   // no refrain, or refrain is the whole text
  const mukhda = lines.slice(start, end).join('\n');
  let restStart = end;
  while (restStart < lines.length && lines[restStart].trim().length === 0) restStart++;
  const rest = lines.slice(restStart).join('\n');
  if (!rest.trim()) return null;
  return { mukhda, rest };
};

// SESSION 70: generic share-or-copy for plain text (program setlists etc.)
const shareTextContent = async (title, text) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return 'copied';
  }
};

// SESSION 70: lyrics with the mukhda emphasised (bold + saffron, with a
// thin rule below). Falls back to plain text when no refrain is detected.
const LyricsBody = ({ bhajan, darkMode, emphasize = true }) => {
  const parts = emphasize ? splitMukhda(bhajan) : null;
  if (!parts) return <>{bhajan?.lyrics}</>;
  return (
    <>
      <span
        className={`block font-bold pb-3 mb-3 border-b border-dashed ${darkMode ? 'text-orange-200 border-orange-300/30' : 'text-[#E65100] border-[#E65100]/30'}`}
      >
        {parts.mukhda}
      </span>
      {parts.rest}
    </>
  );
};

const shareApp = async () => {
  const shareText = [
    '🙏 संकीर्तन · Sankirtan.app',
    '',
    '250+ bhajans, aartis, chalisas, kathas & more.',
    'भजन से भगवान तक।',
    '',
    'https://sankirtan.app'
  ].join('\n');

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'संकीर्तन · Sankirtan',
        text: shareText,
        url: 'https://sankirtan.app'
      });
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

// SESSION 54: parse a YouTube URL and return { id, start } or null.
// Handles youtube.com/watch, youtu.be short links, /shorts/, /embed/,
// and optional timestamps (t=90 or t=1m30s → seconds).
// SESSION 59: Listen bar — YouTube player lives at the TOP of the
// bhajan page (under the title), not in the footer. One full-width
// button; the player expands directly beneath it so the singer never
// has to scroll past the lyrics to find audio.
const ListenBar = ({ bhajan, show, onToggle, darkMode, playerId }) => {
  if (!bhajan || !bhajan.source) return null;
  const yt = getYouTubeVideoId(bhajan.source);
  if (!yt) {
    return (
      <a
        href={bhajan.source}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-4 ${darkMode ? 'text-orange-300 hover:text-orange-200' : 'text-[#E65100] hover:text-[#d64800]'} hover:underline`}
      >
        🔗 Source
      </a>
    );
  }
  const startParam = yt.start > 0 ? `&start=${yt.start}` : '';
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={show}
        aria-controls={playerId}
        aria-label={show ? 'Hide audio player' : 'Listen on YouTube'}
        className={`inline-flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-1.5 font-semibold text-xs transition-colors border ${show
          ? (darkMode ? 'bg-[#1e2e33] text-gray-300 border-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border-[#0B5A70]/15')
          : 'bg-[#FF0000] text-white border-[#FF0000] hover:bg-[#e60000] shadow-sm'}`}
      >
        <svg width="22" height="16" viewBox="0 0 28 20" aria-hidden="true">
          <rect width="28" height="20" rx="5" fill={show ? '#FF0000' : 'white'} />
          <path d="M11 6 L11 14 L18 10 Z" fill={show ? 'white' : '#FF0000'} />
        </svg>
        <span>{show ? 'Hide player' : 'Listen'}</span>
      </button>
      {show && (
        <div id={playerId} className="mt-3 rounded-xl overflow-hidden border border-[#0B5A70]/15 bg-black" style={{aspectRatio: '16/9', maxHeight: '260px'}}>
          <iframe
            title={`Audio for ${bhajan.title}`}
            src={`https://www.youtube-nocookie.com/embed/${yt.id}?autoplay=1&rel=0${startParam}`}
            style={{width: '100%', height: '100%', border: 0}}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};

const getYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let id = null;
    if (host === 'youtu.be') {
      id = u.pathname.slice(1).split('/')[0] || null;
    } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v');
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.split('/')[2] || null;
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.split('/')[2] || null;
      } else if (u.pathname.startsWith('/live/')) {
        id = u.pathname.split('/')[2] || null;
      }
    }
    if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return null;

    // Extract optional start time (t or start param).
    let start = 0;
    const raw = u.searchParams.get('t') || u.searchParams.get('start') || '';
    if (raw) {
      if (/^\d+$/.test(raw)) {
        start = parseInt(raw, 10);
      } else {
        const m = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
        if (m) {
          start = (parseInt(m[1] || 0, 10) * 3600)
                + (parseInt(m[2] || 0, 10) * 60)
                + (parseInt(m[3] || 0, 10));
        }
      }
    }
    return { id, start };
  } catch { return null; }
};

const shareBhajan = async (bhajan, isPublic = false, opts = {}) => {
  if (!bhajan) return false;
  const isDaily = !!opts.isDaily;
  const dailyNote = (opts.dailyNote || '').trim();

  const shareTitle = bhajan.title || 'Bhajan';
  const meta = [bhajan.deity, bhajan.category].filter(Boolean).join(' · ');
  const lyricsPreview = (bhajan.lyrics || '').trim().substring(0, 300);
  const truncated = (bhajan.lyrics || '').length > 300 ? '…' : '';

  const deepLink = isPublic && bhajan.id
    ? `https://sankirtan.app/?b=${encodeURIComponent(bhajan.id)}`
    : 'https://sankirtan.app';

  // SESSION 53: build TWO versions of the share body:
  //   - shareText (with link) — for the clipboard fallback.
  //   - shareTextNoLink — for navigator.share on public bhajans,
  //     because we ALSO pass url as its own field. WhatsApp and
  //     iMessage merge text + url and previously appended the URL
  //     twice (once inline, once from the url field). Dropping
  //     the inline URL from the text sent to navigator.share
  //     yields exactly one link in the outgoing message.
  let shareText;
  let shareTextNoLink;
  if (isDaily && isPublic) {
    const head = [
      '🌟 आज का भजन · Today\'s Bhajan',
      '',
      shareTitle,
    ];
    const partsWithLink = [...head];
    const partsNoLink = [...head];
    if (meta) { partsWithLink.push(`(${meta})`); partsNoLink.push(`(${meta})`); }
    if (dailyNote) {
      partsWithLink.push('', `"${dailyNote}"`);
      partsNoLink.push('', `"${dailyNote}"`);
    }
    partsWithLink.push('', lyricsPreview + truncated);
    partsNoLink.push('', lyricsPreview + truncated);
    partsWithLink.push('', 'एक tap में पूरा भजन पढ़ें:', deepLink);
    partsNoLink.push('', 'एक tap में पूरा भजन पढ़ें ↓');
    shareText = partsWithLink.join('\n');
    shareTextNoLink = partsNoLink.join('\n');
  } else if (isPublic) {
    shareText = `${shareTitle}\n\n${lyricsPreview}${truncated}\n\nRead full at: ${deepLink}`;
    shareTextNoLink = `${shareTitle}\n\n${lyricsPreview}${truncated}\n\nRead the full bhajan ↓`;
  } else {
    // Private-library bhajan — no deep link, no double-link risk.
    shareText = `${shareTitle}\n\n${lyricsPreview}${truncated}\n\n— Shared from Sankirtan (sankirtan.app)`;
    shareTextNoLink = shareText;
  }

  if (navigator.share) {
    try {
      const shareData = isPublic
        ? { title: isDaily ? `आज का भजन: ${shareTitle}` : shareTitle, text: shareTextNoLink, url: deepLink }
        : { title: shareTitle, text: shareTextNoLink };
      await navigator.share(shareData);
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

// SESSION 50: single-stroke line icons in the app chrome. Emoji
// render differently on every OS and read as informal in controls;
// these are consistent SVGs sized 16-20px and colored with
// currentColor so dark mode works without extra props. Content
// emoji (🙏, 🌟, 🎭-in-mukhda-badge, splash)
// deliberately stay as emoji — they're content, not controls.
const Icon = ({ path, size = 20, className = '', strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);
const IconSearch = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></>} />;
const IconGlobe = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></>} />;
const IconBookOpen = (p) => <Icon {...p} path={<path d="M2 5.5A2.5 2.5 0 014.5 3H10v16H4.5A2.5 2.5 0 012 16.5v-11zM22 5.5A2.5 2.5 0 0019.5 3H14v16h5.5a2.5 2.5 0 002.5-2.5v-11z" />} />;
const IconCalendar = (p) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />;
const IconSparkle = (p) => <Icon {...p} path={<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z" /></>} />;
const IconCamera = (p) => <Icon {...p} path={<><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /><circle cx="12" cy="13" r="3.5" /></>} />;
const IconGallery = (p) => <Icon {...p} path={<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5-6 6-2-2-5 5" /></>} />;
const IconDocument = (p) => <Icon {...p} path={<><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>} />;
// SESSION 98: WhatsApp-style attach buttons — coloured circles with line icons
const AttachBtn = ({ kind, onClick, disabled, title }) => {
  const look = kind === 'camera'
    ? { bg: 'bg-[#D3396D]', Icon: IconCamera }
    : kind === 'gallery'
      ? { bg: 'bg-[#BF59CF]', Icon: IconGallery }
      : kind === 'ai'
        ? { bg: 'bg-[#0B5A70]', Icon: IconSparkle }
        : { bg: 'bg-[#5157AE]', Icon: IconDocument };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm transition-transform active:scale-95 disabled:opacity-40 ${look.bg}`}
    >
      <look.Icon size={18} strokeWidth={2} />
    </button>
  );
};
const IconMusic = (p) => <Icon {...p} path={<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>} />;
const IconLock = (p) => <Icon {...p} path={<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>} />;
const IconShare = (p) => <Icon {...p} path={<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" /></>} />;
const IconListPlus = (p) => <Icon {...p} path={<><path d="M4 6h12M4 12h12M4 18h7" /><path d="M18 14v6M15 17h6" /></>} />;
const IconStar = ({ filled, ...p }) => <Icon {...p} path={<path fill={filled ? 'currentColor' : 'none'} d="M12 3l2.8 5.9 6.4.8-4.7 4.5 1.2 6.4L12 17.5 6.3 20.6l1.2-6.4L2.8 9.7l6.4-.8L12 3z" />} />;
const IconPencil = (p) => <Icon {...p} path={<path d="M4 20h4l10-10a2.83 2.83 0 00-4-4L4 16v4zm9-13l4 4" />} />;

// SESSION 48: BhajanTitle renders a title stored as
// "Devanagari / Latin" as two visual lines — Devanagari
// dominant, Latin as a lighter subtitle. Titles that don't
// contain " / " render as-is.
const BhajanTitle = ({ title, size = 'md', darkMode }) => {
  const t = (title || '').trim();
  const parts = t.split(' / ');
  const hasSplit = parts.length >= 2 && parts[0].trim() && parts.slice(1).join(' / ').trim();
  const primary = hasSplit ? parts[0].trim() : t;
  const secondary = hasSplit ? parts.slice(1).join(' / ').trim() : '';
  const primaryClass =
    size === 'sm' ? 'text-sm font-bold truncate' :
    size === 'lg' ? 'text-lg font-bold line-clamp-2' :
    size === 'xl' ? 'text-xl md:text-2xl font-bold line-clamp-2' :
    'text-base font-bold line-clamp-2';
  const secondaryClass =
    size === 'sm' ? 'text-[11px] truncate' :
    size === 'lg' ? 'text-xs line-clamp-1 mt-0.5' :
    size === 'xl' ? 'text-sm md:text-base line-clamp-1 mt-1' :
    'text-xs line-clamp-1 mt-0.5';
  const primaryColor = darkMode ? 'text-amber-100' : 'text-[#0B5A70]';
  const secondaryColor = darkMode ? 'text-gray-400' : 'text-[#0B5A70]/55';
  return (
    <>
      <h3 className={`${primaryClass} ${primaryColor}`}>{primary}</h3>
      {secondary && <p className={`${secondaryClass} ${secondaryColor} font-normal`}>{secondary}</p>}
    </>
  );
};

// SESSION 110: admin-only flag on the expanded (full) card for bhajans
// whose public source is not yet marked reviewed/finalised.
const UnreviewedChip = ({ darkMode }) => (
  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-800'}`} title="Not yet reviewed & finalised">
    <span aria-hidden="true">⚠</span> Unreviewed
  </span>
);
const unreviewedCardCls = (darkMode) => darkMode ? ' !border-amber-500/50 !bg-[#2a2214]' : ' !border-amber-300 !bg-amber-50/70';

// SESSION 111: touch gestures shared by both card styles —
// swipe right = star, swipe left = add to playlist, long-press = menu.
function useCardGestures(bhajan, { onStar, onAddTo, onMenu }) {
  const ref = React.useRef({ x: 0, y: 0, t: 0, timer: null, fired: false });
  const clear = () => { if (ref.current.timer) { clearTimeout(ref.current.timer); ref.current.timer = null; } };
  const onTouchStart = (e) => {
    const t = e.touches[0]; if (!t) return;
    ref.current = { x: t.clientX, y: t.clientY, t: Date.now(), timer: null, fired: false };
    if (onMenu) ref.current.timer = setTimeout(() => { ref.current.fired = true; onMenu(bhajan); }, 550);
  };
  const onTouchMove = (e) => {
    const t = e.touches[0]; if (!t) return;
    if (Math.abs(t.clientX - ref.current.x) > 10 || Math.abs(t.clientY - ref.current.y) > 10) clear();
  };
  const onTouchEnd = (e) => {
    clear();
    const t = e.changedTouches && e.changedTouches[0]; if (!t) return;
    const dx = t.clientX - ref.current.x, dy = t.clientY - ref.current.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 40 && Date.now() - ref.current.t < 600) {
      ref.current.fired = true;
      if (dx > 0 && onStar) onStar(bhajan); else if (dx < 0 && onAddTo) onAddTo(bhajan);
    }
  };
  // suppress the click that follows a swipe / long-press
  const onClickCapture = (e) => { if (ref.current.fired) { e.stopPropagation(); e.preventDefault(); ref.current.fired = false; } };
  const onContextMenu = (e) => { if (onMenu) { e.preventDefault(); onMenu(bhajan); } };
  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: clear, onClickCapture, onContextMenu };
}

const MyBhajanCard = React.memo(function MyBhajanCard({
  bhajan, darkMode, compactView, cardIndex, onOpen, onRemove, unreviewed, onStar, onAddTo, onMenu
}) {
  const gestures = useCardGestures(bhajan, { onStar, onAddTo, onMenu });
  if (compactView) {
    const hasYt = !!(bhajan.source && getYouTubeVideoId(bhajan.source));
    return (
      <button
        onClick={() => onOpen(bhajan)}
        {...gestures}
        className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_1px_4px_rgba(11,90,112,0.04)] hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.10)]'}`}
      >
        <div className="flex-1 min-w-0">
          <BhajanTitle title={bhajan.title} size="sm" darkMode={darkMode} />
          <p className={`text-xs truncate mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {bhajan.deity} · {bhajan.category}{bhajan.scale ? ` · 🎵 ${bhajan.scale}` : ''}
          </p>
        </div>
        {(hasYt || bhajan.starred) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {bhajan.starred && <span className="text-[#E65100] text-sm" aria-label="Starred">⭐</span>}
            {hasYt && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); onOpen(bhajan, { autoplay: true }); }}
                className="inline-flex items-center justify-center w-7 h-5 rounded bg-[#FF0000] text-white text-[10px]"
                aria-label="Listen"
                title="Listen"
              >▶</span>
            )}
          </div>
        )}
      </button>
    );
  }

  // SESSION 18: `<button>` wrapping the entire card means a nested
  // <button> for remove wouldn't be valid HTML. Using a <div
  // role="button"> wrapper + inner <button> for remove is the
  // standard escape hatch. Keyboard-accessible via Enter/Space.
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(bhajan);
    }
  };

  const isSavedFromPublic = !!bhajan.savedFromPublicId;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(bhajan)}
      onKeyDown={handleKey}
      {...gestures}
      className={`sk-card-animate rounded-2xl p-5 border transition-all text-left cursor-pointer relative ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 shadow-[0_2px_12px_rgba(11,90,112,0.15)] hover:border-[#0B5A70]/30 hover:shadow-[0_4px_20px_rgba(11,90,112,0.25)]' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_2px_12px_rgba(11,90,112,0.06)] hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)]'}${unreviewed ? unreviewedCardCls(darkMode) : ''}`}
      style={{ animationDelay: `${Math.min(cardIndex, 8) * 0.04}s` }}
    >
      {/* SESSION 18: quick unsave / delete button, top-right.
          stopPropagation prevents the card's onClick from firing.
          Wording is context-aware: "Remove" (soft) for
          saved-from-public bhajans, "Delete" (permanent) for
          personally-authored ones — the confirmation dialog
          reinforces the difference. */}
      {onRemove && !bhajan.virtual && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(bhajan);
          }}
          aria-label={isSavedFromPublic ? 'Remove from library' : 'Delete bhajan'}
          title={isSavedFromPublic ? 'Remove from library' : 'Delete bhajan'}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${darkMode ? 'text-gray-500 hover:text-red-300 hover:bg-red-900/20' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
        >
          ✕
        </button>
      )}

      <div className="mb-2 pr-8">
        <BhajanTitle title={bhajan.title} size="lg" darkMode={darkMode} />
        {unreviewed && <div className="mt-1"><UnreviewedChip darkMode={darkMode} /></div>}
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

      {/* SESSION 41: source link on the card. Only rendered when
          bhajan.source is set. stopPropagation prevents the
          card's role="button" onClick from firing (which would
          open the reading view instead of the source URL). */}
      {bhajan.source && (() => {
        // SESSION 58: tapping the YouTube button on a card now opens the
        // reading view AND auto-expands the inline player — so the user
        // never leaves the app. Non-YouTube sources still open in a new
        // tab (there's no inline player for a blog link).
        const yt = getYouTubeVideoId(bhajan.source);
        if (yt) {
          return (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(bhajan, { autoplay: true });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-red-50/60 transition-colors group"
                aria-label="Listen inline"
                title="Listen inline"
              >
                <svg width="24" height="17" viewBox="0 0 28 20" aria-hidden="true">
                  <rect width="28" height="20" rx="5" fill="#FF0000" />
                  <path d="M11 6 L11 14 L18 10 Z" fill="white" />
                </svg>
                <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300 group-hover:text-white' : 'text-[#0B5A70]/70 group-hover:text-[#0B5A70]'}`}>
                  Listen
                </span>
              </button>
            </div>
          );
        }
        return (
          <div className="mt-3 text-center">
            <a
              href={bhajan.source}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-[#0B5A70]/5 transition-colors group"
              aria-label="Open source"
              title="Open source"
            >
              <span aria-hidden="true">🔗</span>
              <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]/70'}`}>
                Source
              </span>
            </a>
          </div>
        );
      })()}
    </div>
  );
});

const PublicBhajanCard = React.memo(function PublicBhajanCard({
  bhajan, darkMode, compactView, cardIndex, isSaved, savingToLibrary, onOpen, onSave, unreviewed
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
          <BhajanTitle title={bhajan.title} size="sm" darkMode={darkMode} />
          <p className={`text-xs truncate mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {bhajan.deity} · {bhajan.category}
          </p>
        </button>
        {isSaved === null ? null : isSaved ? (
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
      className={`sk-card-animate rounded-2xl p-5 border transition-all ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 shadow-[0_2px_12px_rgba(11,90,112,0.15)] hover:border-[#0B5A70]/30 hover:shadow-[0_4px_20px_rgba(11,90,112,0.25)]' : 'bg-[#FFFCF8] border-[#0B5A70]/8 shadow-[0_2px_12px_rgba(11,90,112,0.06)] hover:border-[#0B5A70]/25 hover:shadow-[0_4px_20px_rgba(11,90,112,0.12)]'}${unreviewed ? unreviewedCardCls(darkMode) : ''}`}
      style={{ animationDelay: `${Math.min(cardIndex, 8) * 0.04}s` }}
    >
      <button
        onClick={() => onOpen(bhajan)}
        className="w-full text-left"
      >
        <div className="mb-2">
          <BhajanTitle title={bhajan.title} size="lg" darkMode={darkMode} />
          {unreviewed && <div className="mt-1"><UnreviewedChip darkMode={darkMode} /></div>}
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
        {isSaved === null ? null : isSaved ? (
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

      {/* SESSION 41: source link on the card. Only rendered when
          bhajan.source is set — many bhajans have no source and
          shouldn't show an empty label. Sits outside the tap-
          button so click doesn't compete with "open reading
          view", and doesn't nest an anchor inside a button. */}
      {bhajan.source && (() => {
        // SESSION 58: tapping Listen on the card opens the reading view
        // with the inline player expanded instead of jumping to YouTube.
        const yt = getYouTubeVideoId(bhajan.source);
        if (yt) {
          return (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(bhajan, { autoplay: true });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-red-50/60 transition-colors group"
                aria-label="Listen inline"
                title="Listen inline"
              >
                <svg width="24" height="17" viewBox="0 0 28 20" aria-hidden="true">
                  <rect width="28" height="20" rx="5" fill="#FF0000" />
                  <path d="M11 6 L11 14 L18 10 Z" fill="white" />
                </svg>
                <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300 group-hover:text-white' : 'text-[#0B5A70]/70 group-hover:text-[#0B5A70]'}`}>
                  Listen
                </span>
              </button>
            </div>
          );
        }
        return (
          <div className="mt-2 text-center">
            <a
              href={bhajan.source}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-[#0B5A70]/5 transition-colors group"
              aria-label="Open source"
              title="Open source"
            >
              <span aria-hidden="true">🔗</span>
              <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]/70'}`}>
                Source
              </span>
            </a>
          </div>
        );
      })()}

      {(bhajan.saveCount > 0) && (
        <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/50'}`}>
          ✨ Added by {bhajan.saveCount} {bhajan.saveCount === 1 ? 'person' : 'people'}
        </p>
      )}
    </div>
  );
});

// ==============================================
// SESSION 90: LYRICS EDITOR
// The lyrics box in Add/Edit Bhajan was a fixed 10-row monospace textarea.
// Now: auto-growing in the lyrics font, a toolbar (full screen, mukhda
// break, paste & clean, dictate, clean up, undo) and a full-screen sheet.
// ==============================================

// Strip the junk that comes with lyrics pasted from WhatsApp / YouTube.
const cleanLyricsText = (raw, { hindiOnly = false } = {}) => {
  if (!raw) return '';
  let t = String(raw).replace(/\r\n?/g, '\n');
  // SESSION 92: Hindi-only mode (Clean up with हिंदी typing ON) — keep
  // Devanagari letters/marks, spaces, line breaks and basic punctuation
  // (। ॥ , ? !); strip every English letter, digit and other symbol.
  if (hindiOnly) {
    t = t.replace(/\|/g, '।').replace(/[^ऀ-ॿ\s।॥,?!]/g, ' ').replace(/[०-९]/g, ' ');
  }
  t = t.replace(/[​-‍﻿ ]/g, ' ');            // zero-width, nbsp
  t = t.replace(/\[?\b\d{1,2}:\d{2}(?::\d{2})?\]?/g, '');         // timestamps 0:12 / [01:02:03]
  t = t.replace(/\p{Extended_Pictographic}️?|[☀-➿]/gu, ''); // emoji
  t = t.replace(/^\s*(lyrics?|बोल|भजन के बोल|song|title)\s*[:：-]\s*$/gim, '');
  t = t.replace(/^\s*[-=_*~·•]{3,}\s*$/gm, '');                   // divider lines
  // OCR noise: on lines that are mostly Devanagari, drop short stray Latin
  // runs ("eRe", "KA", "gt"), stray symbols, lone digits; ASCII | → danda.
  const devLetters = (s) => (s.match(/[ऀ-ॿ]/g) || []).length;
  const latLetters = (s) => (s.match(/[A-Za-z]/g) || []).length;
  t = t.split('\n').map(line => {
    let l = line;
    const d = devLetters(l);
    if (d >= 3 && d > latLetters(l)) {
      const num = l.match(/^\s*([\d०-९]{1,2}[.)])\s+/); // keep "1. " / "२) " antara numbering
      if (num) l = l.slice(num[0].length);
      l = l
        .replace(/\|/g, '।')
        .replace(/[*;`'’‘"“”^~_<>{}[\]\\#@$%&+=]/g, ' ')
        .replace(/(^|[^A-Za-z])[A-Za-z]{1,4}(?![A-Za-z])/g, '$1 ')
        .replace(/(^|\s)[\d०-९]{1,2}(?=\s|$|[,.।])/g, '$1 ')
        .replace(/(^|\s)[,.]+(?=\s|$)/g, '$1 ')
        .replace(/[।॥](?:\s*[।॥])+/g, (m) => (m.includes('॥') ? '॥' : '।'));
      if (num) l = num[1] + ' ' + l.trim();
    }
    return l.replace(/[ \t]+/g, ' ').replace(/\s+([।॥,.!?])/g, '$1').trim();
  }).filter(l => l === '' || (l.match(/\p{L}/gu) || []).length >= 3) // drop junk-only lines
    .join('\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
};

// SESSION 114: the lyrics box is a fixed-height, inner-scrolling textarea
// (auto-grow made the page jump on every keystroke on iPhone).
const LYRICS_BOX_STYLE = { height: '320px', lineHeight: '1.9', fontFamily: LYRICS_FONT };

// SESSION 115: replace a range of text in a focused field the way the
// keyboard would (execCommand) — keeps the caret and scroll position and
// the browser's own undo, unlike re-setting the whole value from React.
// SESSION 120: verify the result — on some iOS builds insertText ignores the
// programmatic selection and appends instead of replacing. Fall back to
// setRangeText (no input event, so the caller's `onValue` syncs React state).
const replaceRangeInField = (el, start, end, text, onValue) => {
  if (!el) return false;
  const original = el.value;
  const expected = original.slice(0, start) + text + original.slice(end);
  try {
    el.focus({ preventScroll: true });
    el.setSelectionRange(start, end);
    if (document.execCommand && document.execCommand('insertText', false, text) && el.value === expected) return true;
  } catch {}
  try {
    if (el.value !== original) el.value = original;
    el.setRangeText(text, start, end, 'end');
    if (el.value !== expected) return false;
    if (onValue) onValue(el.value);
    return true;
  } catch { return false; }
};

// Pixel position of the caret inside a textarea (mirror-div technique).
const getCaretTop = (el) => {
  const cs = window.getComputedStyle(el);
  const div = document.createElement('div');
  ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom', 'textTransform'].forEach(k => { div.style[k] = cs[k]; });
  Object.assign(div.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflowWrap: 'break-word', boxSizing: 'border-box', width: el.clientWidth + 'px', top: '0', left: '-9999px', border: '0' });
  const pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
  div.textContent = el.value.substring(0, pos);
  const span = document.createElement('span');
  span.textContent = el.value.substring(pos, pos + 1) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const top = span.offsetTop - el.scrollTop;
  document.body.removeChild(div);
  return { top, lineH: parseFloat(cs.lineHeight) || 28 };
};

// Floats the Hindi suggestion chips inside the textarea, just above the
// line being edited (below it when there is no room above).
const CaretChips = ({ inputId, children }) => {
  const [pos, setPos] = useState(null);
  const has = !!children;
  useLayoutEffect(() => {
    const el = document.getElementById(inputId);
    if (!el || !has) { setPos(p => (p === null ? p : null)); return; }
    const update = () => {
      try {
        const { top, lineH } = getCaretTop(el);
        const CH = 54;
        let y = top - CH - 2;
        if (y < 0) y = top + lineH + 2;
        y = Math.max(0, Math.min(y, el.clientHeight - CH));
        setPos(p => (p && p.y === y ? p : { y }));
      } catch { setPos(null); }
    };
    update();
    el.addEventListener('scroll', update);
    return () => el.removeEventListener('scroll', update);
  }, [inputId, has, children]);
  if (!has || !pos) return null;
  return (
    <div className="absolute left-2 right-2 z-30" style={{ top: pos.y }}>
      {children}
    </div>
  );
};

const LyricsToolbar = ({ darkMode, fullscreen, onFullscreen, onMukhda, onPaste, onDictate, dictating, onClean, onUndo, canUndo }) => {
  const btn = `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-200 hover:bg-[#0B5A70]/30' : 'bg-[#0B5A70]/6 text-[#0B5A70] hover:bg-[#0B5A70]/12 border border-[#0B5A70]/12'}`;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button type="button" onClick={onDictate} className={dictating ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-red-600 text-white border border-red-600' : btn} title={dictating ? 'Stop dictation' : 'Dictate lyrics (Hindi)'} aria-pressed={dictating}>
        {dictating ? '🔴 Listening… tap to stop' : '🎤 Dictate'}
      </button>
      <button type="button" onClick={onPaste} className={btn} title="Paste from clipboard and clean up">📋 Paste</button>
      <button type="button" onClick={onMukhda} className={btn} title="Insert a blank line here (marks the end of the mukhda)">¶ Mukhda break</button>
      <button type="button" onClick={onClean} className={btn} title="Remove timestamps, emoji, extra spaces and blank lines">🧹 Clean up</button>
      <button type="button" onClick={onUndo} disabled={!canUndo} className={`${btn} disabled:opacity-40`} title="Undo last toolbar action">↶ Undo</button>
      {!fullscreen && (
        <button type="button" onClick={onFullscreen} className={btn} title="Open full-screen editor">⛶ Full screen</button>
      )}
    </div>
  );
};

const TransliterationChips = ({ currentWord, suggestions, onPick, darkMode, className = '' }) => (
  <div className={`border rounded-xl shadow-[0_8px_30px_rgba(11,90,112,0.18)] p-2 flex flex-wrap gap-2 items-center ${darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/15'} ${className}`}>
    <span className="text-xs text-gray-500 mr-1"><strong>"{currentWord}"</strong> →</span>
    {suggestions.map((s, idx) => (
      <button
        key={idx}
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onPick(s); }}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${idx === 0 ? 'bg-[#0B5A70] text-white hover:bg-[#094a5d] shadow-md' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
        title={idx === 0 ? 'Default (press space)' : `Alternative ${idx + 1}`}
      >
        {idx === 0 && '⭐ '}{s}
      </button>
    ))}
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onPick(currentWord); }}
      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
      title="Keep as English"
    >
      {currentWord}
    </button>
  </div>
);

// Full-screen lyrics sheet. The textarea keeps the same `id` as the inline
// one (which is unmounted while this is open) so the Hindi-typing helpers
// that look the field up by id keep working.
const LyricsEditorSheet = ({ open, onClose, onCancel, darkMode, inputId, value, onChange, onKeyDown, onFocus, onBlur, placeholder, toolbar, chips, mukhdaChip }) => {
  // SESSION 119: `onClose` is a fresh arrow on every render, so having it in
  // the deps re-ran this effect on EVERY keystroke — refocusing and moving
  // the caret to the end of the text each time. Keep it in a ref instead.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      const el = document.getElementById(inputId);
      if (el) { el.focus({ preventScroll: true }); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) {} }
    });
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, inputId]);
  if (!open) return null;
  const lines = (value || '').split('\n').length;
  return (
    <div className={`fixed inset-0 z-[70] flex flex-col ${darkMode ? 'bg-[#0f1a1e] text-gray-100' : 'bg-[#FFF8F0] text-gray-900'}`} role="dialog" aria-modal="true" aria-label="Lyrics editor">
      <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${darkMode ? 'border-[#0B5A70]/25' : 'border-[#0B5A70]/12'}`} style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${darkMode ? 'text-teal-200' : 'text-[#0B5A70]'}`}>भजन के बोल</p>
          <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{lines} line{lines === 1 ? '' : 's'}{mukhdaChip ? ` · ${mukhdaChip}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onCancel && <button type="button" onClick={onCancel} className={`px-3 py-2 rounded-xl text-sm font-semibold ${darkMode ? 'bg-[#1e2e33] text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#E65100] text-white shadow-md">Done</button>
        </div>
      </div>
      <div className={`px-4 pt-2 ${darkMode ? '' : ''}`}>
        <LyricsToolbar {...toolbar} darkMode={darkMode} fullscreen />
      </div>
      <div className="relative flex-1 min-h-0">
        <textarea
          id={inputId}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`absolute inset-0 w-full h-full px-5 py-4 outline-none resize-none bg-transparent text-lg overflow-y-auto ${darkMode ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
          style={{ fontFamily: LYRICS_FONT, lineHeight: '1.9', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        />
        <CaretChips inputId={inputId}>{chips}</CaretChips>
      </div>
    </div>
  );
};

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);

  // SESSION 13: parse a deep link at boot time — links shared out
  // as `sankirtan.app/?b=<id>` should open the reading view for
  // that bhajan directly instead of the sign-in wall.
  //
  // We read the URL synchronously in the initial state so we know
  // as early as possible whether the user is arriving via a link.
  // If they are, we default guestMode to true so the sign-in page
  // is skipped and they land in the app — recipients of a WhatsApp
  // forward should not be gated by an auth screen. Existing sign-in
  // paths remain accessible via the header "Sign In" button.
  //
  // The pending id is consumed later by an effect that waits for
  // publicBhajans to arrive.
  //
  // SESSION 27: parser now extracts the leading ID PREFIX rather
  // than requiring the whole ?b= value to be a clean ID. Some
  // messengers (WhatsApp forward chains, copy-paste through apps
  // that strip newlines, some in-app browsers) can concatenate
  // the URL with following text — the ?b= param ends up as
  // "abcXYZ123 वन्दे मातरम्..." instead of just "abcXYZ123".
  // Previously that fell through to "no deep link" and the user
  // saw the sign-in wall instead of the bhajan.
  //
  // The ID is always the first token of alphanumeric+underscore+
  // dash characters (Firestore auto-IDs are 20 chars from that
  // set). We match the prefix and ignore the rest. Safe because
  // valid IDs would have nothing after them to ignore.
  const initialDeepLinkId = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bIdRaw = params.get('b');
      if (!bIdRaw) return null;
      const m = bIdRaw.match(/^([A-Za-z0-9_-]{6,64})/);
      return m ? m[1] : null;
    } catch { return null; }
  })();
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState(initialDeepLinkId);

  // SESSION 26: while a deep link is being resolved, we show a
  // dedicated splash instead of the empty home page. Prevents
  // WhatsApp-browser users from thinking the link is broken
  // during the 200ms-8s window before the target bhajan is ready.
  const [deepLinkResolving, setDeepLinkResolving] = useState(!!initialDeepLinkId);

  // SESSION 26: after 6 seconds of resolution, expose a "Skip →
  // Browse Library" escape hatch on the splash so a truly stuck
  // network doesn't trap the user forever.
  const [deepLinkStuck, setDeepLinkStuck] = useState(false);

  const [guestMode, setGuestMode] = useState(!!initialDeepLinkId);
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
  // SESSION 86: signed-in users have a single Library (My Library); any
  // navigation to the public list view lands there instead.
  useEffect(() => {
    if (user && currentView === 'public-library') setCurrentView('library');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentView]);
  const [scrollPositions, setScrollPositions] = useState({});
  const [rawBhajans, setBhajans] = useState([]);
  const [selectedBhajan, setSelectedBhajan] = useState(null);
  const [editingBhajan, setEditingBhajan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterDeity, setFilterDeity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [bhajansLoading, setBhajansLoading] = useState(false);
  const [bhajanFormError, setBhajanFormError] = useState('');
  const [bhajanFormMore, setBhajanFormMore] = useState(false); // SESSION 96: collapsed extras
  const aiInputRef = useRef(null);        // SESSION 102
  const [bhajanFormMoods, setBhajanFormMoods] = useState(false);   // SESSION 104
  const [publicFormMoods, setPublicFormMoods] = useState(false);   // SESSION 104
  const publicAiInputRef = useRef(null);  // SESSION 102
  const [publicFormMore, setPublicFormMore] = useState(false); // SESSION 97
  const [publishFromId, setPublishFromId] = useState(null); // SESSION 108: personal bhajan being published
  const [bhajanFormSaving, setBhajanFormSaving] = useState(false);

  // Programs states
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  // SESSION 34: when a bhajan is opened from a playlist/program's
  // detail view, we remember which one so the reading view can show
  // "Other bhajans in this playlist" (contextual siblings) instead of
  // "Related Bhajans" (unrelated keyword matches from the library).
  // Cleared when user navigates back to a list view, opens a bhajan
  // from another surface (public library, my library), or logs out.
  const [programContext, setProgramContext] = useState(null);

  // SESSION 34: auto-clear programContext when user navigates away
  // from the playlist reading flow. Keeps context alive across
  // bhajan-detail → program-detail → bhajan-detail (natural
  // navigation within a playlist). Clears when they leave to
  // Public / My Library / Programs list / anywhere else.
  useEffect(() => {
    const inPlaylistFlow = currentView === 'bhajan-detail' || currentView === 'program-detail';
    if (!inPlaylistFlow && programContext) {
      setProgramContext(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [programFormError, setProgramFormError] = useState('');
  const [programFormSaving, setProgramFormSaving] = useState(false);
  const [showBhajanPicker, setShowBhajanPicker] = useState(false);
  // SESSION 40: update banner state. When a new deploy is detected
  // (via periodic index.html hash check), this flips true and a
  // non-blocking banner shows at the bottom of the screen with a
  // Refresh button. Dismissible per-session (banner won't reappear
  // until the next detected update).
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // SESSION 74: index.js also fires 'sankirtan:update' the moment a new
  // service worker takes over the page — faster than the 5-minute poll.
  useEffect(() => {
    const on = () => setUpdateAvailable(true);
    window.addEventListener('sankirtan:update', on);
    return () => window.removeEventListener('sankirtan:update', on);
  }, []);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  // SESSION 41: which discovery pill is currently expanded on the
  // Public Library home. null | 'popular' | 'recent'. Only one
  // open at a time (tapping the other collapses the first). Both
  // collapsed by default to keep the home page compact — the whole
  // point of the pill pattern.
  // SESSION 38: state for the "Add to Program/Playlist/Parody"
  // picker that opens from the bhajan-detail reading view.
  // Stores the bhajan being added so the picker can target it,
  // and a "saving" set tracking which programs are mid-update
  // (for spinner + disable on rapid taps).
  const [addToProgramFor, setAddToProgramFor] = useState(null);
  // SESSION 43: setlist auto-save status in edit-program mode
  const [setlistAutoSave, setSetlistAutoSave] = useState('idle');
  // SESSION 43: My Library parodies section open/closed (collapsed by default)
  const [libraryParodiesOpen, setLibraryParodiesOpen] = useState(false);
  const [addToProgramSaving, setAddToProgramSaving] = useState(new Set());
  const [bhajanPickerSearch, setBhajanPickerSearch] = useState('');
  const [pickerDeityFilter, setPickerDeityFilter] = useState('');
  const [pickerKeywordFilter, setPickerKeywordFilter] = useState('');

  const [programForm, setProgramForm] = useState({
    name: '',
    date: '',
    venue: '',
    bhajanIds: [],
    // SESSION 32: 'playlist' or 'program'. Playlists are recurring
    // undated collections (e.g., "Morning Prayers"). Programs are
    // one-time dated events (e.g., "Tuesday Jagran"). Default is
    // 'program' to preserve the pre-Session-32 behavior when users
    // just tap Create without touching the toggle.
    type: 'program',
    // For playlists: an optional short label like "Daily practice"
    // that appears where date/venue would for a program.
    purpose: ''
  });

  // SESSION 32: which sub-view of the Playlists tab is currently
  // shown — 'playlist' or 'program'. Persisted in localStorage so
  // a user who mostly uses playlists doesn't have to re-toggle on
  // every visit. Default to 'program' for backward compatibility
  // — existing users have programs, and this shows them first.
  const [playlistViewMode, setPlaylistViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('sankirtan-playlist-view');
      // SESSION 36: parody added as a valid third value
      return saved === 'playlist' || saved === 'program' ? saved : 'program';  // SESSION 43: 'parody' retired from this toggle
    } catch {
      return 'program';
    }
  });

  // Live Program Mode states
  const [liveProgramIndex, setLiveProgramIndex] = useState(0);
  // SESSION 69: Live mode has its own font size, remembered across
  // sessions. Defaults to the reading size + 4 (stage distance).
  const [liveFontSize, setLiveFontSize] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('sankirtan-live-font-size'), 10);
      if (saved >= 14 && saved <= 48) return saved;
      const rs = JSON.parse(localStorage.getItem('sankirtan-reading-settings') || '{}');
      if (rs.fontSize) return Math.min(48, rs.fontSize + 4);
    } catch {}
    return 24;
  });
  useEffect(() => { try { localStorage.setItem('sankirtan-live-font-size', String(liveFontSize)); } catch {} }, [liveFontSize]);

  // SESSION 70: hands-free auto-scroll in Live mode. Speed 1–5 (px/frame
  // scaled); any touch / wheel / key pauses it so the singer can grab the
  // page; it stops by itself at the bottom.
  const [liveAutoScroll, setLiveAutoScroll] = useState(false);
  // SESSION 74: what the singer *asked for* (▶ pressed, not yet ⏸).
  // Reaching the bottom pauses the loop but leaves this true, so the
  // next bhajan resumes scrolling from the top automatically.
  const liveScrollWantedRef = useRef(false);
  const toggleLiveAutoScroll = useCallback(() => {
    setLiveAutoScroll(v => { liveScrollWantedRef.current = !v; return !v; });
  }, []);
  // SESSION 73: speed steps now go below 1× (0.25× ≈ 7 px/s for slow
  // bhajans). Stored as the multiplier; unknown values snap to nearest.
  const [liveScrollSpeed, setLiveScrollSpeed] = useState(() => {
    try {
      const v = Number(localStorage.getItem('sankirtan-live-scroll-speed'));
      if (!(v > 0)) return 1;
      return LIVE_SCROLL_STEPS.reduce((best, x) => Math.abs(x - v) < Math.abs(best - v) ? x : best, 1);
    } catch { return 1; }
  });
  useEffect(() => { try { localStorage.setItem('sankirtan-live-scroll-speed', String(liveScrollSpeed)); } catch {} }, [liveScrollSpeed]);
  useEffect(() => {
    if (!liveAutoScroll || !AUTO_SCROLL_VIEWS.includes(currentView)) return;
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    // index.css sets `html { scroll-behavior: smooth }`; on iOS Safari a
    // smooth scrollBy() every frame is restarted before it moves, so the
    // page never scrolls. Force instant scrolling while we drive it.
    const htmlStyle = document.documentElement.style;
    const prevBehavior = htmlStyle.scrollBehavior;
    htmlStyle.scrollBehavior = 'auto';
    const pxPerSec = 28 * liveScrollSpeed; // 0.25× = 7 px/s … 4× = 112 px/s
    const step = (now) => {
      const dt = Math.min(100, now - last);
      last = now;
      acc += (pxPerSec * dt) / 1000;
      const whole = Math.floor(acc);
      if (whole >= 1) {
        acc -= whole;
        window.scrollTo(0, window.scrollY + whole);
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) { setLiveAutoScroll(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // Touching the Scroll/speed buttons themselves must not pause
    // (otherwise ⏸ would pause on touchstart and re-start on click).
    // A tap on the lyrics card toggles (handled by its onClick), so a
    // touch *starting* there must not pause; a drag anywhere does.
    const inControls = (e) => e && e.target && e.target.closest && e.target.closest('[data-live-controls]');
    const inLyrics = (e) => e && e.target && e.target.closest && e.target.closest('[data-live-lyrics]');
    const pauseUser = () => { liveScrollWantedRef.current = false; setLiveAutoScroll(false); };
    const pause = (e) => { if (inControls(e) || inLyrics(e)) return; pauseUser(); };
    const pauseMove = (e) => { if (inControls(e)) return; pauseUser(); };
    window.addEventListener('touchstart', pause, { passive: true });
    window.addEventListener('touchmove', pauseMove, { passive: true });
    window.addEventListener('wheel', pause, { passive: true });
    window.addEventListener('keydown', pause);
    return () => {
      cancelAnimationFrame(raf);
      htmlStyle.scrollBehavior = prevBehavior;
      window.removeEventListener('touchstart', pause);
      window.removeEventListener('touchmove', pauseMove);
      window.removeEventListener('wheel', pause);
      window.removeEventListener('keydown', pause);
    };
  }, [liveAutoScroll, liveScrollSpeed, currentView]);
  const [liveWakeLock, setLiveWakeLock] = useState(null);

  // Public Library states
  const [publicBhajans, setPublicBhajans] = useState([]);
  // SESSION 80: a bhajan saved from the Public Library is a snapshot copy.
  // Fields the admin fills in later (YouTube link, तर्ज़, scale, singer,
  // lyricist, moods) flow through to the personal copy as long as the
  // user hasn't set that field themselves. Lyrics and title are never
  // overridden — those are the user's to edit.
  const ownedBhajans = useMemo(() => {
    if (rawBhajans.length === 0 || publicBhajans.length === 0) return rawBhajans;
    const pub = new Map(publicBhajans.map(b => [b.id, b]));
    // SESSION 106: copies made before the app recorded where they came
    // from (early imports) carry no savedFromPublicId. Link them to the
    // public bhajan with the same title when that title is unique, so
    // YouTube links, तर्ज़ etc. flow through and the library doesn't show
    // the same bhajan twice. The link is persisted on next open.
    const byTitle = new Map();
    publicBhajans.forEach(b => {
      const k = foldSearchKey(b.title);
      if (!k) return;
      byTitle.set(k, byTitle.has(k) ? null : b);   // null = ambiguous
    });
    const INHERIT = ['source', 'dhun', 'scale', 'singer', 'lyricist'];
    const FOLLOW = ['title', 'lyrics', 'deity', 'category', 'dhun', 'scale', 'singer', 'lyricist', 'keywords', 'source', 'language'];
    let changed = false;
    const out = rawBhajans.map(b => {
      let src = b.savedFromPublicId ? pub.get(b.savedFromPublicId) : null;
      let m = null;
      if (!src && !b.savedFromPublicId) {
        const cand = byTitle.get(foldSearchKey(b.title));
        if (cand) { src = cand; m = { ...b, savedFromPublicId: cand.id, linkedByTitle: true }; }
      }
      if (!src) return b;
      // SESSION 85: public corrections flow into copies the user hasn't
      // edited themselves (admin chose "apply to personal libraries").
      if (!b.textEdited && (src.pushRev || 0) > (b.baseRev || 0)) {
        m = { ...(m || b), needsSync: true, baseRev: src.pushRev };
        for (const f of FOLLOW) { if (src[f] !== undefined) m[f] = src[f]; }
      }
      for (const f of INHERIT) {
        if (!(m || b)[f] && src[f]) { m = m || { ...b }; m[f] = src[f]; }
      }
      // SESSION 109: a YouTube link on the public bhajan beats a non-YouTube
      // reference URL left on the copy by the original import.
      if (src.source && getYouTubeVideoId(src.source) && !getYouTubeVideoId((m || b).source)) { m = m || { ...b }; m.source = src.source; }
      if ((!b.keywords || b.keywords.length === 0) && src.keywords && src.keywords.length) { m = m || { ...b }; m.keywords = src.keywords; }
      if (m) changed = true;
      return m || b;
    });
    return changed ? out : rawBhajans;
  }, [rawBhajans, publicBhajans]);
  // SESSION 83: every public bhajan is part of My Library. Public bhajans
  // the user hasn't personalised appear as "virtual" entries (same id as
  // the public doc, virtual: true). The first personal action on one —
  // star, notes, edit — silently creates the user's own copy
  // (materializeBhajan). New public bhajans appear for everyone at once.
  const bhajans = useMemo(() => {
    if (!user || publicBhajans.length === 0) return ownedBhajans;
    const have = new Set();
    ownedBhajans.forEach(b => { if (b.savedFromPublicId) have.add(b.savedFromPublicId); });
    const virtual = publicBhajans
      .filter(pb => !have.has(pb.id))
      .map(pb => ({ ...pb, savedFromPublicId: pb.id, virtual: true, ownerId: user.uid, viewCount: 0, starred: false, notes: '' }));
    return virtual.length ? [...ownedBhajans, ...virtual] : ownedBhajans;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedBhajans, publicBhajans, user && user.uid]);
  const [publicLoading, setPublicLoading] = useState(false);
  // SESSION 12: session-scoped seed drives seededShuffle in the
  // filteredPublicBhajans memo. Set once per browsing session so
  // the order stays stable while the user is here, but reshuffles
  // on the next visit (new tab / next day / relaunch).
  const [shuffleSeed] = useState(() => getSessionShuffleSeed());

  // SESSION 16: "आज का भजन" — admin-curated daily bhajan.
  // Fetched once on app open. Falls back to a deterministic
  // pick (same for all users on a given day) if no admin curation
  // exists for today's date.
// eslint-disable-next-line no-unused-vars
  const [dailyBhajanId, setDailyBhajanId] = useState(null);
// eslint-disable-next-line no-unused-vars
  const [dailyBhajanNote, setDailyBhajanNote] = useState('');
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
  // SESSION 75: ⭐ Starred filter in My Library, and the notes editor.
  const [libraryStarredOnly, setLibraryStarredOnly] = useState(false);
  // SESSION 85: admin review workflow
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  // SESSION 111: library page rework state
  const [librarySort, setLibrarySort] = useState(() => { try { return localStorage.getItem('sankirtan-library-sort') || 'az'; } catch { return 'az'; } });
  useEffect(() => { try { localStorage.setItem('sankirtan-library-sort', librarySort); } catch {} }, [librarySort]);
  const [librarySheet, setLibrarySheet] = useState(null);     // 'deity' | 'type' | 'mood' | 'sort'
  const [libraryFabOpen, setLibraryFabOpen] = useState(false);
  const [libraryRowMenu, setLibraryRowMenu] = useState(null); // bhajan for the long-press menu
  // SESSION 88: admin "fetch lyrics from a web page" utility
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchBusy, setFetchBusy] = useState(false);
  const [fetchResult, setFetchResult] = useState(null); // { title, lyrics, text, host } | { error }
  const [fetchShowFull, setFetchShowFull] = useState(false);
  const [notesDraft, setNotesDraft] = useState(null); // null = not editing
  const [scaleDraft, setScaleDraft] = useState(null); // SESSION 84: null = not editing scale inline
  const [publicFilterDeity, setPublicFilterDeity] = useState('');
  const [publicFilterCategory, setPublicFilterCategory] = useState('');
  const [selectedPublicBhajan, setSelectedPublicBhajan] = useState(null);
  // SESSION 70/74: moving to another bhajan pauses, then resumes from the
  // top after a short breath if ▶ was on; leaving Live mode clears it.
  useEffect(() => {
    setLiveAutoScroll(false);
    if (!AUTO_SCROLL_VIEWS.includes(currentView)) { liveScrollWantedRef.current = false; return; }
    if (!liveScrollWantedRef.current) return;
    const t = setTimeout(() => { if (liveScrollWantedRef.current) setLiveAutoScroll(true); }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveProgramIndex, currentView, selectedBhajan?.id, selectedPublicBhajan?.id]);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedBhajanIds, setSavedBhajanIds] = useState(new Set());

  // Admin Panel states

  // SESSION 16: admin state for Bhajan of the Day scheduling
  const [dailyEditDate, setDailyEditDate] = useState(() => getTodayKey());
  const [dailyEditBhajanId, setDailyEditBhajanId] = useState('');
  const [dailyEditNote, setDailyEditNote] = useState('');
  const [dailyEditSaving, setDailyEditSaving] = useState(false);
  const [dailyEditLoadedFor, setDailyEditLoadedFor] = useState(null);
  // SESSION 31: search query for admin's bhajan picker + dropdown open state.
  // With 250+ public bhajans, the old dropdown was impractical.
  const [dailyEditSearch, setDailyEditSearch] = useState('');
  // SESSION 45: deity / mood filters for the daily-bhajan picker
  const [dailyEditDeity, setDailyEditDeity] = useState('');
  const [dailyEditMood, setDailyEditMood] = useState('');
  const [dailyEditSearchOpen, setDailyEditSearchOpen] = useState(false);

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
    singer: '',       // SESSION 11
    lyricist: '',     // SESSION 11
    keywords: [],
    source: '',
    reviewed: false,
    applyToCopies: true
  });
  const [publicBhajanFormError, setPublicBhajanFormError] = useState('');
  const [publicBhajanFormSaving, setPublicBhajanFormSaving] = useState(false);

  // Check if current user is admin (SESSION 5: debug logging removed —
  // never advertise the comparison logic in the console)
  const isAdmin = useMemo(() => {
    if (!user || !user.uid) return false;
    return user.uid.toString().trim() === ADMIN_UID;
  }, [user]);

  // SESSION 122: contributors — members the admin allows to add public
  // bhajans. Stored in Firestore `contributors/{uid}`. Contributors can add
  // new public bhajans (saved as drafts for admin review) and edit the ones
  // they added; only the admin reviews, deletes, or edits others' entries.
  const [isContributor, setIsContributor] = useState(false);
  const [contributors, setContributors] = useState([]);
  const [contributorEmail, setContributorEmail] = useState('');
  const [contributorBusy, setContributorBusy] = useState(false);
  useEffect(() => {
    if (!user || !user.uid || !window.firebase) { setIsContributor(false); return; }
    const db = window.firebase.firestore();
    const unsub = db.collection('contributors').doc(user.uid).onSnapshot(
      (d) => setIsContributor(d.exists),
      () => setIsContributor(false)
    );
    return () => unsub();
  }, [user]);
  useEffect(() => {
    if (!isAdmin || !window.firebase) { setContributors([]); return; }
    const db = window.firebase.firestore();
    const unsub = db.collection('contributors').onSnapshot(
      (snap) => setContributors(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setContributors([])
    );
    return () => unsub();
  }, [isAdmin]);
  const canContribute = isAdmin || isContributor;
  const canEditPublic = (pb) => isAdmin || (isContributor && !!pb && pb.addedByUid === (user && user.uid));
  const addContributor = async () => {
    const key = contributorEmail.trim();
    if (!key || !isAdmin) return;
    setContributorBusy(true);
    try {
      const db = window.firebase.firestore();
      let target = null;
      if (key.includes('@')) {
        const q = await db.collection('users').where('email', '==', key.toLowerCase()).limit(1).get();
        if (q.empty) {
          const q2 = await db.collection('users').where('email', '==', key).limit(1).get();
          if (!q2.empty) target = { id: q2.docs[0].id, ...q2.docs[0].data() };
        } else target = { id: q.docs[0].id, ...q.docs[0].data() };
        if (!target) { showToast('No member found with that email — they must sign in to the app once first', 'error'); return; }
      } else {
        const d = await db.collection('users').doc(key).get();
        target = d.exists ? { id: d.id, ...d.data() } : { id: key };
      }
      await db.collection('contributors').doc(target.id).set({
        uid: target.id,
        email: target.email || null,
        displayName: target.displayName || null,
        grantedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        grantedBy: user.uid
      });
      setContributorEmail('');
      showToast(`✓ ${target.displayName || target.email || target.id} can now add public bhajans`);
    } catch (e) {
      showToast('Could not add: ' + e.message, 'error');
    } finally { setContributorBusy(false); }
  };
  const removeContributor = (c) => askConfirm(
    { title: 'Remove contributor?', message: `${c.displayName || c.email || c.uid} will no longer be able to add public bhajans. Bhajans they already added stay.`, confirmLabel: 'Remove' },
    async () => {
      try { await window.firebase.firestore().collection('contributors').doc(c.id).delete(); showToast('Removed'); }
      catch (e) { showToast('Could not remove: ' + e.message, 'error'); }
    }
  );

  // New/Edit bhajan form
  const [bhajanForm, setBhajanForm] = useState({
    title: '',
    lyrics: '',
    deity: 'Babosa',
    category: 'Bhajan',
    language: 'Hindi',
    dhun: '',
    scale: '',
    singer: '',      // SESSION 11: गायक — original singer / famous rendition
    lyricist: '',    // SESSION 11: रचनाकार — lyricist / composer
    keywords: [],
    source: ''
  });

  // Hindi Typing states
  const [hindiTypingEnabled, setHindiTypingEnabled] = useState(() => {
    // SESSION 90: default OFF on phones — Gboard's Hindi keyboard and
    // voice typing do this better and the popup fought with them. Stays
    // ON by default on desktop, where there's usually no Hindi keyboard.
    const isTouchPhone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
    try {
      const saved = localStorage.getItem('sankirtan-hindi-typing');
      return saved === null ? !isTouchPhone : saved === 'true';
    } catch {
      return !isTouchPhone;
    }
  });

  // SESSION 90: lyrics editor state (shared by the library and public forms)
  const [lyricsSheet, setLyricsSheet] = useState(null);       // null | 'bhajan' | 'public'
  const [lyricsDictating, setLyricsDictating] = useState(null); // null | 'bhajan' | 'public'
  const lyricsUndoRef = useRef({ bhajan: [], public: [] });          // SESSION 114: undo stacks
  const lyricsUndoTsRef = useRef({ bhajan: 0, public: 0 });
  const lyricsSheetSnapRef = useRef({ bhajan: '', public: '' });      // text when the full-screen sheet opened
  const [lyricsUndoTick, setLyricsUndoTick] = useState(0);
  const lyricsRecRef = useRef(null);
  const lyricsDictatingRef = useRef(null);
  const lyricsTextareaRef = useRef(null);
  const publicLyricsTextareaRef = useRef(null);
  // SESSION 94: words the app knows, for snapping dictated words onto.
  const dictationVocab = useMemo(() => buildDictationVocab([rawBhajans, publicBhajans]), [rawBhajans, publicBhajans]);
  const dictationVocabRef = useRef(null);
  dictationVocabRef.current = dictationVocab;
  const [transliterationSuggestions, setTransliterationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const keepEnglishRef = useRef(null); // SESSION 121: word the user chose to keep in English
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
    const defaults = { fontSize: 18, fontFamily: LYRICS_FONT, lineHeight: 1.8, textAlign: 'center', readingMode: false, keepScreenOn: true };
    try {
      const saved = localStorage.getItem('sankirtan-reading-settings');
      if (saved) {
        const merged = { ...defaults, ...JSON.parse(saved) };
        // SESSION 61: migrate the old bare 'sans-serif' default to the real stack
        if (!merged.fontFamily || merged.fontFamily === 'sans-serif') merged.fontFamily = LYRICS_FONT;
        return merged;
      }
      return defaults;
    } catch {
      return defaults;
    }
  });
  // SESSION 78: notes panel open/closed on the bhajan page and in Live mode
  const [notesOpen, setNotesOpen] = useState(false);
  // SESSION 54: expanded inline YouTube player on reading views.
  // Reset to false when a different bhajan is opened.
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

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

  // SESSION 49: account dropdown menu (avatar button in the header)
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  // SESSION 49: filter sheet — collapses the 3 Deity/Type/Mood
  // selects into a single button + modal. Value is null | 'public' |
  // 'library'; only one sheet is ever open at once and it targets
  // whichever library the user is currently in.
  const [filterSheetView, setFilterSheetView] = useState(null);
  // SESSION 49: delete overflow menu — a small dropdown that opens
  // above the Delete action. Value is null | 'library' | 'public'.
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);

  // Compact card view — SESSION 42: defaults to COMPACT for new
  // users (was full). Compact shows more bhajans per screen, which
  // is what first-time visitors browsing the library want. Anyone
  // who has already chosen a view keeps their choice via localStorage.
  // SESSION 78: libraries always open in compact view; the toggle lasts
  // for the session only.
  const [compactView, setCompactView] = useState(true);
  useEffect(() => {
    try { localStorage.setItem('sankirtan-compact-view', compactView.toString()); } catch (e) {}
  }, [compactView]);

  // SESSION 42: guest banner dismissal (per device)
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(() => {
    try { return localStorage.getItem('sankirtan-guest-banner-dismissed') === '1'; } catch { return false; }
  });

  // ==============================================
  // SPLASH SCREEN (SESSION 5: full 2.8s animation once per day,
  // fast 0.8s splash on subsequent opens — big perceived-speed win)
  // ==============================================
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  // SESSION 44: expose full-vs-fast to the JSX so the credits line can
  // use short delays on the fast splash (previously its 1.6s delay
  // meant it never appeared on repeat opens).
  const [splashFull, setSplashFull] = useState(true);
  useEffect(() => {
    let showFull = true;
    try {
      const lastFullSplash = localStorage.getItem('sankirtan-splash-shown');
      const today = new Date().toDateString();
      showFull = lastFullSplash !== today;
      if (showFull) localStorage.setItem('sankirtan-splash-shown', today);
    } catch (e) { /* private browsing — default to full */ }
    setSplashFull(showFull);

    const SPLASH_MS = showFull ? 2800 : 1100;
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
  // eslint-disable-next-line no-unused-vars
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

  const trackRecentRead = useCallback((bhajan, scope) => {
    if (!bhajan || !bhajan.id) return;
    setRecentlyRead(prev => {
      const filtered = prev.filter(b => b.id !== bhajan.id);
      // SESSION 62: scope ('public' | undefined) tells the home-screen
      // "Recently opened" row which list to resolve the id against.
      const updated = [{ id: bhajan.id, title: bhajan.title, deity: bhajan.deity, category: bhajan.category, scope: scope || 'library' }, ...filtered].slice(0, 6);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [RECENT_KEY]);

  // Global ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmDialog) { setConfirmDialog(null); return; }
      if (addToProgramFor) { setAddToProgramFor(null); return; }
      if (libraryRowMenu) { setLibraryRowMenu(null); return; }
      if (librarySheet) { setLibrarySheet(null); return; }
      if (libraryFabOpen) { setLibraryFabOpen(false); return; }
      if (showBhajanPicker) { setShowBhajanPicker(false); return; }
      if (showOnboarding) { setShowOnboarding(false); return; }
      if (showPhoneLogin) { setShowPhoneLogin(false); return; }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [confirmDialog, showBhajanPicker, showOnboarding, showPhoneLogin, addToProgramFor, libraryRowMenu, librarySheet, libraryFabOpen]);

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
  // SESSION 133: keep the screen on everywhere in the app, robustly.
  //  - Wake Lock API (Chrome, Safari 16.4+): held in a ref, re-acquired
  //    whenever the system releases it (tab hidden, phone locked) and on the
  //    next user touch — Safari sometimes only grants it on a user gesture.
  //  - Fallback (older iOS / WebViews without the API): a tiny silent looping
  //    video, started on the first user interaction, keeps the display awake.
  const wakeLockRef = useRef(null);
  const keepAwakeVideoRef = useRef(null);
  useEffect(() => {
    let disposed = false;
    const hasApi = 'wakeLock' in navigator;

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return;
      if (!hasApi) { startVideoFallback(); return; }
      if (wakeLockRef.current && !wakeLockRef.current.released) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
          // System took it (screen locked / tab hidden): take it back as soon as we're visible again.
          setTimeout(() => { if (document.visibilityState === 'visible') acquire(); }, 500);
        });
      } catch (err) {
        // Not granted (low battery mode, or needs a gesture) — try again on the next touch.
        console.log('Wake lock request failed:', err && err.message);
      }
    };

    const startVideoFallback = () => {
      if (keepAwakeVideoRef.current) { keepAwakeVideoRef.current.play().catch(() => {}); return; }
      const v = document.createElement('video');
      v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.setAttribute('loop', '');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.src = '/keepawake.mp4';
      Object.assign(v.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', left: '0', bottom: '0' });
      document.body.appendChild(v);
      keepAwakeVideoRef.current = v;
      v.play().catch(() => {});
    };

    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    const onGesture = () => { if (hasApi ? !wakeLockRef.current : true) acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    document.addEventListener('touchstart', onGesture, { passive: true });
    document.addEventListener('click', onGesture, { passive: true });
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('touchstart', onGesture);
      document.removeEventListener('click', onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // SESSION 65: returning from a bhajan page to the list it came
      // from is a "back" move whichever control was used — the in-app
      // ← Back button as much as the phone's back gesture. Restore the
      // saved scroll so the user lands on the same bhajans they left.
      const prevView = previousViewRef.current;
      const isReturnToList =
        (prevView === 'bhajan-detail' && (currentView === 'library' || currentView === 'program-detail')) ||
        (prevView === 'public-bhajan-detail' && currentView === 'public-library');

      if (!window.__sankirtanBackNav && !isReturnToList) {
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

  // SESSION 10 (item 2): refs so the popstate handler always sees
  // fresh live-mode state without needing to be re-registered on
  // every state change (which would risk missing events).
  const currentViewRef = useRef(currentView);
  const liveProgramIndexRef = useRef(liveProgramIndex);
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);
  useEffect(() => { liveProgramIndexRef.current = liveProgramIndex; }, [liveProgramIndex]);

  useEffect(() => {
    const handlePopState = (event) => {
      // SESSION 10 (item 2): iOS edge-swipe (system back gesture)
      // fires popstate. In live mode we redirect this to livePrev
      // instead of exiting the mode — a swipe back = previous bhajan.
      // Only if already at bhajan 1 do we let the browser back
      // proceed normally (which exits live mode).
      if (currentViewRef.current === 'live-program') {
        if (liveProgramIndexRef.current > 0) {
          setLiveProgramIndex(liveProgramIndexRef.current - 1);
          window.scrollTo(0, 0);
          // Push a fresh state so the next back-swipe fires again.
          try {
            window.history.pushState({ view: 'live-program' }, '', window.location.pathname);
          } catch (e) { /* private-mode / rare failures — non-fatal */ }
          return;
        }
        // At first bhajan — fall through to exit as usual.
      }

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

  // SESSION 40: update detection via index.html hash polling.
  //
  // Session 30 removed the old "App Updated!" modal because its
  // content was hardcoded and stale for 25+ deploys. This is
  // different — no marketing copy, no feature list, just a
  // non-blocking banner saying "New version — refresh?" with a
  // refresh button. It fires only when a real deploy is detected,
  // not on every version bump we happen to make in code.
  //
  // Detection strategy:
  // 1. On first mount, fetch /index.html (bypass cache) and record
  //    its content hash as the "baseline".
  // 2. Every 5 minutes, re-fetch and hash. If hash differs from
  //    baseline → new deploy was pushed. Set updateAvailable=true.
  // 3. Banner appears at bottom of screen with Refresh button.
  //    User can dismiss with X (per-session).
  //
  // Why hash the whole file: Vercel bundles reference hashed JS
  // filenames from index.html (e.g. main.abc123.js). Any deploy
  // changes those references, so index.html content changes
  // deterministically per deploy. No manual version-file needed.
  useEffect(() => {
    let baselineHash = null;
    let cancelled = false;

    const simpleHash = (s) => {
      // Small, fast hash — enough to detect any change
      let h = 5381;
      for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      }
      return h.toString(36);
    };

    const fetchAndHash = async () => {
      try {
        const res = await fetch('/index.html', {
          cache: 'no-store',
          credentials: 'omit'
        });
        if (!res.ok) return null;
        const text = await res.text();
        return simpleHash(text);
      } catch {
        return null;
      }
    };

    const check = async () => {
      if (cancelled) return;
      const h = await fetchAndHash();
      if (cancelled || !h) return;
      if (baselineHash === null) {
        baselineHash = h;
      } else if (h !== baselineHash) {
        setUpdateAvailable(true);
      }
    };

    // Initial baseline read shortly after mount (don't compete
    // with the app's own load resources).
    const initialTimer = setTimeout(check, 3000);
    // Periodic re-check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000);
    // Also re-check when the tab regains focus (common: user
    // switches back to sankirtan.app after using something else)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ==============================================
  // PWA INSTALL PROMPT
  // ==============================================
  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('sankirtan-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    // SESSION 61: the Play Store app is a Trusted Web Activity — it is
    // already installed, so never offer "Install" inside it.
    const isPlayStoreApp = (document.referrer || '').startsWith('android-app://');

    if (alreadyDismissed || isStandalone || isIOSStandalone || isPlayStoreApp) {
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

    // SESSION 21: count usages separately for public vs personal.
    // - Public usages: we CAN and WILL update in a cascade batch.
    // - Personal usages: NEVER touched. Users' saved bhajans are
    //   their private data; silently mutating them from an admin
    //   action crosses a boundary. If a user's saved copy has
    //   the old value, they'll see it until they resave or edit.
    //   Eventually consistent, no privacy violation.
    let publicUsage = 0;
    let personalUsage = 0;
    let publicMatches = [];  // ← the actual docs we'll update
    if (fieldName) {
      publicMatches = publicBhajans.filter(b => b[fieldName] === oldValue);
      publicUsage = publicMatches.length;
      personalUsage = bhajans.filter(b => b[fieldName] === oldValue).length;
    } else {
      publicMatches = publicBhajans.filter(b => (b.keywords || []).includes(oldValue));
      publicUsage = publicMatches.length;
      personalUsage = bhajans.filter(b => (b.keywords || []).includes(oldValue)).length;
    }

    // Actual rename work — extracted so we can call it directly OR
    // from inside a confirmation dialog's callback.
    const doRename = async () => {
      try {
        const db = window.firebase.firestore();
        const configRef = db.collection('appConfig').doc('lists');
        const firestoreField = type === 'deity' ? 'deities'
                              : type === 'category' ? 'categories'
                              : 'keywords';

        const newList = current.map(item => item === oldValue ? trimmed : item);

        // Batch write: update the config list AND every public
        // bhajan that references it, all-or-nothing. If any
        // single write fails, nothing commits — no partial state.
        //
        // SESSION 21 SAFETY: we update ONLY the specific field
        // (deity / category / keywords). Title, lyrics, dhun,
        // singer, lyricist, source, etc. are never touched even
        // if they happen to contain the old value as a substring.
        // "Rama" in a lyric line stays "Rama" — only the deity
        // tag flips to "Ram".
        //
        // Firestore batches are limited to 500 writes. We should
        // never approach that (would need 499 bhajans tagged with
        // the same deity), but we cap and warn just in case.
        const MAX_BATCH = 490;
        if (publicMatches.length > MAX_BATCH) {
          showToast(`Too many bhajans (${publicMatches.length}) — split rename manually.`, 'error');
          return;
        }

        const batch = db.batch();
        batch.set(configRef, {
          [firestoreField]: newList,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: user.uid
        }, { merge: true });

        publicMatches.forEach(b => {
          const bRef = db.collection('publicBhajans').doc(b.id);
          if (fieldName) {
            // Single-field update (deity or category)
            batch.update(bRef, { [fieldName]: trimmed });
          } else {
            // Keywords array — replace the old value, keep order
            const newKeywords = (b.keywords || []).map(k => k === oldValue ? trimmed : k);
            batch.update(bRef, { keywords: newKeywords });
          }
        });

        await batch.commit();

        if (type === 'deity') setCustomDeities(newList);
        else if (type === 'category') setCustomCategories(newList);
        else setCustomKeywords(newList);

        setEditingItem(null);
        setEditingValue('');

        const msg = publicMatches.length === 0
          ? `Renamed to "${trimmed}"`
          : `Renamed to "${trimmed}" · updated ${publicMatches.length} public bhajan${publicMatches.length !== 1 ? 's' : ''}`;
        showToast(msg);
      } catch (error) {
        console.error(`Error renaming ${type}:`, error);
        showToast('Could not rename: ' + error.message, 'error');
      }
    };

    // Zero public usages AND zero personal usages → rename the
    // config entry alone, no dialog needed.
    if (publicUsage === 0 && personalUsage === 0) {
      await doRename();
      return;
    }

    // SESSION 25: personal-only usages used to hard-block the
    // rename. That was wrong — it made cleanup impossible once
    // any user had a tag/deity/category in their personal library.
    // The fix: rename the config entry, DO NOT touch personal
    // copies (privacy stance preserved), just proceed with a
    // toast noting the drift. Personal copies will self-correct
    // when the user resaves the bhajan from Public Library.
    //
    // No confirmation needed since there's no public-bhajan
    // cascade here — just a config list update, same as the
    // zero-usage case.
    if (publicUsage === 0 && personalUsage > 0) {
      await doRename();
      showToast(`Note: ${personalUsage} user's personal ${personalUsage === 1 ? 'copy' : 'copies'} will keep the old value until re-saved.`);
      return;
    }

    // Public usages exist → cascade with confirmation.
    // Message is explicit about what changes and what doesn't,
    // so admin knows exactly what they're consenting to.
    const bhajanWord = publicUsage === 1 ? 'bhajan' : 'bhajans';
    const personalNote = personalUsage > 0
      ? `\n\nNote: ${personalUsage} user's personal ${personalUsage === 1 ? 'copy' : 'copies'} won't change (privacy).`
      : '';

    askConfirm(
      {
        title: `Rename "${oldValue}" → "${trimmed}"?`,
        message: `This will update the ${type} field on ${publicUsage} public ${bhajanWord}.\n\nTitles, lyrics, तर्ज़ etc. will NOT be touched — only the ${type} tag.${personalNote}`,
        confirmLabel: `✓ Rename ${publicUsage} ${bhajanWord}`
      },
      doRename
    );
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
  // SESSION 77: counts shown in the deity/type dropdowns ("Krishna (42)")
  const countBy = (list, field) => {
    const m = {};
    for (const b of list) { const k = b[field]; if (k) m[k] = (m[k] || 0) + 1; }
    return m;
  };
  const publicDeityCounts = useMemo(() => countBy(publicBhajans, 'deity'), [publicBhajans]);
  const publicCategoryCounts = useMemo(() => countBy(publicBhajans, 'category'), [publicBhajans]);
  const myDeityCounts = useMemo(() => countBy(bhajans, 'deity'), [bhajans]);
  const myCategoryCounts = useMemo(() => countBy(bhajans, 'category'), [bhajans]);
  const [searchFocus, setSearchFocus] = useState(null); // 'public' | 'library' | null

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

        // S131: not awaited — on a weak network this call can hang for many
        // seconds while onAuthStateChanged already knows the signed-in user
        // from local storage. Redirect sign-ins still complete in the background.
        window.firebase.auth().getRedirectResult()
          .then((result) => { if (result && result.user) console.log('✅ Redirect sign-in successful'); })
          .catch((redirectError) => { console.log('No redirect result:', redirectError.message); });

        window.firebase.auth().onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            loadUserProfile(firebaseUser); // non-blocking
          } else {
            setUser(null);
            setUserProfile(null);
            setBhajans([]);
            // SESSION 42: unregistered visitors land directly on the
            // Public Library as guests instead of a sign-in wall.
            // The sign-in screen is still one tap away (header
            // "Sign In" button, locked tabs, Save button) and a
            // guest banner explains what registering unlocks.
            setGuestMode(true);
            setCurrentView('public-library');
          }
          setLoading(false);
        });

        setTimeout(() => {
          setLoading(false);
        }, 4000); // S131: was 8 s

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
    const CACHE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // S132: effectively never expire — offline (esp. iPhone, no Firestore persistence) relies on this
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
    const PROG_CACHE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // S132: effectively never expire
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

    // SESSION 28 FIX: wait for initFirebase() to finish configuring
    // db.settings() before touching Firestore. If this listener fires
    // ahead of the config (as it does for deep-link visitors where
    // guestMode is true from initial render, bypassing the auth-load
    // delay that used to naturally serialize things), the SDK locks
    // its settings to defaults and initFirebase()'s
    // db.settings({experimentalForceLongPolling}) call throws —
    // "Firestore has already been started and its settings can no
    // longer be changed" — which breaks the entire Firestore
    // transport and results in "Could not reach Cloud Firestore
    // backend" 404 spam.
    //
    // Same pattern as Session 16b (daily bhajan fetch) and Session
    // 26 (direct deep-link fetch). Applied here too because the
    // guard was missing on the main public library listener.
    let cancelled = false;
    let unsubscribe = () => {};

    const waitForFirestoreConfig = () => new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (cancelled) return resolve(false);
        if (window._firestoreConfigured && window.firebase && window.firebase.firestore) {
          return resolve(true);
        }
        if (Date.now() - start > 15000) return resolve(false);
        setTimeout(check, 100);
      };
      check();
    });

    (async () => {
      const ready = await waitForFirestoreConfig();
      if (!ready || cancelled) return;

      setPublicLoading(true);
      const db = window.firebase.firestore();
      const publicRef = db.collection('publicBhajans');

      const CACHE_KEY = 'sankirtan-public-bhajans-cache';
      const CACHE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // S132: effectively never expire — the live listener replaces it whenever online
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
            if (onSnapshotFired || cancelled) return;
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
        if (cancelled) return;
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
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
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

  // SESSION 16: fetch today's bhajan curation (admin-set) if any.
  // Fires once per day per session — cached in state, so repeated
  // navigations don't re-fetch. Read from cache first (Firestore
  // SDK handles this transparently) so offline users still see it.
  //
  // SESSION 16b FIX: WAIT for initFirebase() to finish configuring
  // db.settings() before touching Firestore. If this effect races
  // ahead and calls .get() first, the SDK locks its settings to
  // defaults and initFirebase()'s db.settings({experimentalForceLongPolling})
  // call throws "Firestore has already been started and its settings
  // can no longer be changed" — which then breaks the entire app's
  // Firestore connection (public library empty, all listeners fail).
  // The initFirebase code path sets window._firestoreConfigured=true
  // AFTER settings apply; we poll on that flag.
  useEffect(() => {
    let cancelled = false;
    const waitForFirestoreConfig = () => new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (cancelled) return resolve(false);
        if (window._firestoreConfigured && window.firebase && window.firebase.firestore) {
          return resolve(true);
        }
        // Bail out after 15s so we don't wait forever if initFirebase
        // never completed (offline, blocked CDN, etc). Failure path
        // just leaves the fallback pick showing — no user-visible issue.
        if (Date.now() - start > 15000) return resolve(false);
        setTimeout(check, 100);
      };
      check();
    });

    const fetchDaily = async () => {
      const ready = await waitForFirestoreConfig();
      if (!ready || cancelled) return;
      try {
        const db = window.firebase.firestore();
        const todayKey = getTodayKey();
        const doc = await db.collection('dailyBhajans').doc(todayKey).get();
        if (cancelled) return;
        if (doc.exists) {
          const data = doc.data() || {};
          setDailyBhajanId(data.bhajanId || null);
          setDailyBhajanNote(data.note || '');
        } else {
          // No curation for today — leave dailyBhajanId null.
          // The UI will use the deterministic fallback (see
          // resolvedDailyBhajan memo below).
          setDailyBhajanId(null);
          setDailyBhajanNote('');
        }
      } catch (e) {
        // Rules deny read? No network? Either way, fall back to
        // the deterministic pick — no user-visible regression.
        if (!cancelled) {
          setDailyBhajanId(null);
          setDailyBhajanNote('');
        }
      }
    };
    fetchDaily();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        // SESSION 64: the automatic first-login feature tour is retired —
        // new users land straight in the library. (Singer's Guide in the
        // menu covers the same ground, on demand.)
      } else if (firebaseUser.displayName && firebaseUser.displayName.trim()) {
        // SESSION 64: first sign-in with Google — create the profile
        // silently from the Google name. No form, no questions; the
        // bhakt lands straight in the library.
        const profileData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          phoneNumber: firebaseUser.phoneNumber || null,
          photoURL: firebaseUser.photoURL || null,
          displayName: firebaseUser.displayName.trim(),
          bio: '',
          location: '',
          contactInfo: { whatsapp: firebaseUser.phoneNumber || '', youtube: '', instagram: '' },
          verified: false,
          stats: { bhajanCount: 0, publicBhajanCount: 0, followerCount: 0, followingCount: 0 },
          preferences: { theme: 'saffron', hindiTypingEnabled: true, viewMode: 'normal', fontSize: 18 },
          hasSeenOnboarding: true,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(firebaseUser.uid).set(profileData);
        setUserProfile(profileData);
        loadConfigLists();
      } else {
        // No name available (e.g. phone sign-in): ask for just the name.
        setProfileForm({
          displayName: '',
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
        hasSeenOnboarding: true,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(user.uid).set(profileData);
      setUserProfile(profileData);
      setShowProfileSetup(false);
      setAuthError('');

      // SESSION 64: no automatic feature tour after profile setup either.
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

  // SESSION 102: "Read with AI" — sends the photo/PDF to /api/ocr (Gemini,
  // key kept on the server). Better than Tesseract on photos and the only
  // route that reads handwriting. Falls back with a clear message.
  const handleAiRead = async (file, formSetter = setBhajanForm) => {
    if (!file) return;
    setOcrProcessing(true);
    setOcrProgress(30);
    setOcrMessage('✨ Reading with AI…');
    try {
      let mime = file.type || '';
      let b64;
      if (/^application\/pdf$/.test(mime)) {
        if (file.size > 3.8 * 1024 * 1024) throw new Error('PDF is larger than 4 MB — split it or photograph the pages');
        const buf = await file.arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        b64 = btoa(bin);
      } else {
        const dataUrl = await fileToOptimizedDataUrl(file, 1600);
        mime = 'image/jpeg';
        b64 = dataUrl.split(',')[1];
      }
      setOcrProgress(60);
      const r = await fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mime, data: b64 }) });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) throw new Error(j.error || 'AI could not read this file');
      setOcrProgress(100);
      applyExtractedText(j.lyrics, 'AI', formSetter);
      if (j.title) formSetter(prev => (prev.title && prev.title.trim() ? prev : { ...prev, title: j.title }));
      setOcrMessage('');
    } catch (err) {
      console.error('AI read failed:', err);
      setOcrMessage('❌ ' + (err.message || 'AI could not read this file') + ' — you can still use Camera / Gallery / Document.');
    } finally {
      setOcrProcessing(false);
    }
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
  // SESSION 90: LYRICS EDITOR ACTIONS
  // `which` is 'bhajan' (library form) or 'public' (public-library form).
  // ==============================================
  const lyricsInputId = (which) => (which === 'public' ? 'public-hindi-input-lyrics' : 'hindi-input-lyrics');
  const getLyrics = (which) => (which === 'public' ? publicBhajanForm.lyrics : bhajanForm.lyrics) || '';
  // Replace the lyrics, remembering the previous text for Undo.
  const pushLyricsHistory = (which, prev, force) => {
    const now = Date.now();
    const st = lyricsUndoRef.current[which];
    if (!force && now - lyricsUndoTsRef.current[which] < 1500) return; // group quick keystrokes
    if (st.length && st[st.length - 1] === prev) return;
    st.push(prev);
    if (st.length > 60) st.shift();
    lyricsUndoTsRef.current[which] = now;
    setLyricsUndoTick(t => t + 1);
  };
  const setLyricsWithUndo = (which, next) => {
    const prev = getLyrics(which);
    if (next === prev) return;
    pushLyricsHistory(which, prev, true);
    lyricsUndoTsRef.current[which] = 0;
    if (which === 'public') setPublicBhajanForm(p => ({ ...p, lyrics: next }));
    else setBhajanForm(p => ({ ...p, lyrics: next }));
  };
  const undoLyrics = (which) => {
    const st = lyricsUndoRef.current[which];
    if (!st.length) return;
    const prev = st.pop();
    lyricsUndoTsRef.current[which] = 0;
    setLyricsUndoTick(t => t + 1);
    if (which === 'public') setPublicBhajanForm(p => ({ ...p, lyrics: prev }));
    else setBhajanForm(p => ({ ...p, lyrics: prev }));
    requestAnimationFrame(() => { const el = document.getElementById(lyricsInputId(which)); if (el) el.focus(); });
  };
  const openLyricsSheet = (which) => { lyricsSheetSnapRef.current[which] = getLyrics(which); setLyricsSheet(which); };
  const cancelLyricsSheet = (which) => {
    const snap = lyricsSheetSnapRef.current[which];
    if (snap !== getLyrics(which)) {
      pushLyricsHistory(which, getLyrics(which), true);
      if (which === 'public') setPublicBhajanForm(p => ({ ...p, lyrics: snap }));
      else setBhajanForm(p => ({ ...p, lyrics: snap }));
      showToast('Changes discarded');
    }
    setLyricsSheet(null);
  };
  // Insert a blank line at the end of the line the cursor is on.
  const insertMukhdaBreak = (which) => {
    const el = document.getElementById(lyricsInputId(which));
    const text = getLyrics(which);
    let pos = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const lineEnd = text.indexOf('\n', pos);
    pos = lineEnd === -1 ? text.length : lineEnd;
    const before = text.slice(0, pos).replace(/\s+$/, '');
    const after = text.slice(pos).replace(/^\n+/, '');
    const next = before + '\n\n' + after;
    setLyricsWithUndo(which, next);
    const cursor = before.length + 2;
    requestAnimationFrame(() => { if (el) { el.focus(); try { el.setSelectionRange(cursor, cursor); } catch (e) {} } });
  };
  const cleanLyrics = (which) => {
    const next = cleanLyricsText(getLyrics(which), { hindiOnly: hindiTypingEnabled });
    if (next === getLyrics(which)) { showToast('Nothing to clean — no stray symbols, timestamps or extra blank lines found'); return; }
    setLyricsWithUndo(which, next);
    showToast(hindiTypingEnabled ? '🧹 Cleaned up — Hindi only (English, numbers & symbols removed)' : '🧹 Cleaned up');
  };
  const pasteLyrics = async (which) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('unsupported');
      const raw = await navigator.clipboard.readText();
      const pasted = cleanLyricsText(raw, { hindiOnly: hindiTypingEnabled });
      if (!pasted) { showToast('Clipboard is empty', 'error'); return; }
      const cur = getLyrics(which).trim();
      setLyricsWithUndo(which, cur ? cur + '\n\n' + pasted : pasted);
      showToast('📋 Pasted & cleaned');
    } catch (err) {
      showToast('Could not read clipboard — long-press in the box and tap Paste, then use Clean up.', 'error');
    }
  };
  // Dictation: continuous Hindi speech → appended lines. Tap again to stop.
  const stopLyricsDictation = () => {
    lyricsDictatingRef.current = null;
    setLyricsDictating(null);
    const rec = lyricsRecRef.current;
    lyricsRecRef.current = null;
    if (rec) { try { rec.stop(); } catch (e) {} }
  };
  // SESSION 93: smarter Hindi dictation.
  //  - Chunks spoken in one breath join into ONE line; a pause (the engine
  //    ending its session) starts a new line.
  //  - Of the alternatives Google offers, the one with the most Devanagari
  //    wins; English words that still slip through ("Babosa", "Shyam") are
  //    transliterated with the same Input Tools service the typing uses.
  //  - Voice commands: "नई लाइन"/"next line" → line break,
  //    "मुखड़ा"/"नया पैरा"/"new para" → blank line, "रुको"/"stop" → stop.
  const devCount = (s) => (s.match(/[ऀ-ॿ]/g) || []).length;
  const pickDevanagariAlt = (result) => {
    let best = '', bestScore = -1;
    for (let j = 0; j < result.length; j++) {
      const t = (result[j].transcript || '').trim();
      const score = devCount(t) * 10 - (t.match(/[A-Za-z]/g) || []).length;
      if (t && score > bestScore) { best = t; bestScore = score; }
    }
    return best;
  };
  // (\b doesn't work next to Devanagari, so boundaries are explicit.)
  const DICT_CMD = [
    { re: /(?:^|\s)(?:नई|नयी|न्यू|अगली|next|new)\s*(?:लाइन|लाईन|पंक्ति|line)(?=\s|$)/i, cmd: 'line' },
    { re: /(?:^|\s)(?:मुखड़ा|मुखडा|मुखरा|mukhda|नया\s*पैरा|न्यू\s*पैरा|new\s*para(?:graph)?|अंतरा\s*शुरू)(?=\s|$)/i, cmd: 'para' },
    { re: /(?:^|\s)(?:रुको|रुक\s*जाओ|बंद\s*करो|stop|स्टॉप)(?=\s|$)/i, cmd: 'stop' },
  ];
  const parseDictCommand = (t) => {
    for (const { re, cmd } of DICT_CMD) {
      const m = t.match(re);
      if (m) return { text: (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(), cmd, cmdFirst: !t.slice(0, m.index).trim() };
    }
    return { text: t, cmd: null, cmdFirst: false };
  };
  // Transliterate any Latin words in a chunk (cached, best effort).
  const hindifyText = async (text) => {
    const words = text.split(' ');
    const out = await Promise.all(words.map(async (w) => {
      if (!/^[A-Za-z]{2,}$/.test(w)) return w;
      const cached = getCachedSuggestions(w);
      if (cached && cached[0]) return cached[0];
      try {
        const url = `https://inputtools.google.com/request?text=${encodeURIComponent(w)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
        const res = await fetch(url);
        const data = await res.json();
        const hi = data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0];
        if (hi) { suggestionsCacheRef.current[hiKey(w)] = [hi]; return hi; }
      } catch (e) {}
      return w;
    }));
    return out.join(' ');
  };
  const toggleLyricsDictation = (which) => {
    if (lyricsDictatingRef.current) { stopLyricsDictation(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('Dictation is not supported in this browser. Please use Chrome or Safari.', 'error'); return; }
    pushLyricsHistory(which, getLyrics(which), true);
    lyricsDictatingRef.current = which;
    setLyricsDictating(which);
    showToast('🎤 बोलिए… "नई लाइन" = line break · "मुखड़ा" = blank line · "रुको" = stop');
    const base = getLyrics(which).replace(/\s+$/, '');
    const committed = [];   // finished lines
    let cur = [];           // chunks of the line being spoken: { raw, hi }
    const curText = () => cur.map(c => c.hi || c.raw).filter(Boolean).join(' ');
    const render = (interim) => {
      const shown = [curText(), interim].filter(Boolean).join(' ');
      const body = [...committed, shown].join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
      const next = base ? (body ? base + '\n\n' + body : base) : body;
      if (which === 'public') setPublicBhajanForm(p => ({ ...p, lyrics: next }));
      else setBhajanForm(p => ({ ...p, lyrics: next }));
      const el = document.getElementById(lyricsInputId(which));
      if (el) el.scrollTop = el.scrollHeight;
    };
    const endLine = () => { const t = curText(); if (t) committed.push(t); cur = []; };
    const start = () => {
      const rec = new SR();
      lyricsRecRef.current = rec;
      rec.lang = 'hi-IN';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.onresult = (e) => {
        let interim = '';
        let stopAfter = false;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) { const t = (e.results[i][0].transcript || '').trim(); if (t) interim += (interim ? ' ' : '') + t; continue; }
          const { text: rawText, cmd, cmdFirst } = parseDictCommand(pickDevanagariAlt(e.results[i]));
          const text = correctDictation(rawText, dictationVocabRef.current);
          const applyBreak = () => { if (cmd === 'line') endLine(); else if (cmd === 'para') { endLine(); committed.push(''); } };
          if (cmdFirst) applyBreak(); // "नई लाइन जाके सिर…" → break, then the words
          if (text) {
            const chunk = { raw: text, hi: null };
            cur.push(chunk);
            if (/[A-Za-z]{2,}/.test(text)) hindifyText(text).then(hi => { if (hi !== text) { chunk.hi = hi; if (lyricsDictatingRef.current === which) render(''); } });
          }
          if (!cmdFirst) applyBreak();
          if (cmd === 'stop') stopAfter = true;
        }
        render(stopAfter ? '' : interim);
        if (stopAfter) { endLine(); render(''); stopLyricsDictation(); showToast('🎤 Dictation stopped'); }
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed') { showToast('Microphone access blocked. Please allow microphone in browser settings.', 'error'); stopLyricsDictation(); }
        else if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') { showToast('Dictation error: ' + e.error, 'error'); stopLyricsDictation(); }
      };
      // The engine ends its session on a pause — treat that as a line
      // break and keep listening while the user still has dictation on.
      rec.onend = () => {
        endLine(); render('');
        if (lyricsDictatingRef.current === which && lyricsRecRef.current === rec) { try { start(); } catch (e) { stopLyricsDictation(); } }
      };
      rec.start();
    };
    try { start(); } catch (err) { stopLyricsDictation(); showToast('Could not start dictation', 'error'); }
  };
  // Leaving the form or closing the sheet stops the mic.
  useEffect(() => { if (lyricsDictatingRef.current) stopLyricsDictation(); setLyricsSheet(null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentView, showPublicBhajanForm]);
  useEffect(() => () => stopLyricsDictation(), []);
  const lyricsToolbarProps = (which) => ({
    onFullscreen: () => openLyricsSheet(which),
    onMukhda: () => insertMukhdaBreak(which),
    onPaste: () => pasteLyrics(which),
    onDictate: () => toggleLyricsDictation(which),
    dictating: lyricsDictating === which,
    onClean: () => cleanLyrics(which),
    onUndo: () => undoLyrics(which),
    canUndo: lyricsUndoTick >= 0 && lyricsUndoRef.current[which].length > 0,
  });
  const mukhdaChipText = (lyrics) => {
    if (!lyrics || !lyrics.trim()) return '';
    const m = getMukhda({ lyrics });
    const n = m ? m.split('\n').length : 0;
    const hasBlank = /\n\s*\n/.test(lyrics.replace(/^\s+/, ''));
    return hasBlank ? `Mukhda: ${n} line${n === 1 ? '' : 's'}` : 'No blank line — first line used as mukhda';
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

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;

    // SESSION 89: one phrase, then stop. `continuous` kept the mic open
    // until the engine's silence timeout, so the final transcript arrived
    // late and the user had to tap the mic again to end it. Interim
    // results still stream into the search box while speaking.
    recognition.continuous = false;
    recognition.interimResults = true;
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
      // Got the final phrase — release the mic right away instead of
      // waiting for the engine to time out on silence.
      if (finalTranscript) {
        try { recognition.stop(); } catch (err) {}
      }
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
      singer: '',       // SESSION 11
      lyricist: '',     // SESSION 11
      keywords: [],
      source: ''
    });
    setBhajanFormError('');
    setEditingBhajan(null);
    setOcrMessage('');
    setOcrProgress(0);
    setOcrProcessing(false);
    setBhajanFormMore(false);
    setBhajanFormMoods(false);
    setCurrentView('add-bhajan');
  };

  const openEditBhajan = async (bhajanIn) => {
    // SESSION 83: editing a public (virtual) entry edits your own copy
    const bhajan = await materializeBhajan(bhajanIn);
    if (!bhajan) return;
    setBhajanForm({
      title: bhajan.title || '',
      lyrics: bhajan.lyrics || '',
      deity: bhajan.deity || 'Babosa',
      category: bhajan.category || 'Bhajan',
      language: bhajan.language || 'Hindi',
      dhun: bhajan.dhun || '',
      scale: bhajan.scale || '',
      singer: bhajan.singer || '',      // SESSION 11
      lyricist: bhajan.lyricist || '',  // SESSION 11
      keywords: bhajan.keywords || [],
      source: bhajan.source || ''
    });
    setBhajanFormError('');
    setBhajanFormMore(!!(bhajan.singer || bhajan.lyricist));
    setBhajanFormMoods(false);
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
        singer: (bhajanForm.singer || '').trim(),     // SESSION 11
        lyricist: (bhajanForm.lyricist || '').trim(), // SESSION 11
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
        // SESSION 85: a copy whose title/lyrics the user changed becomes a
        // "fork" — public corrections no longer overwrite it.
        if (editingBhajan.savedFromPublicId && (bhajanData.title !== (editingBhajan.title || '').trim() || bhajanData.lyrics !== (editingBhajan.lyrics || '').trim())) {
          bhajanData.textEdited = true;
        }
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
    // SESSION 24: one-click for saved-from-public bhajans (soft
    // unsave — public copy still exists, reversible in one tap
    // by saving again). Confirmation stays for self-authored
    // bhajans because that's a permanent, unrecoverable delete.
    const isSavedFromPublic = !!bhajan.savedFromPublicId;

    // The actual delete work — used by both the direct path
    // (saved-from-public) and the confirmed path (self-authored).
    const doDelete = async () => {
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
        showToast(isSavedFromPublic ? 'Removed from library' : 'Bhajan deleted');
      } catch (error) {
        console.error('Error deleting bhajan:', error);
        showToast('Could not delete: ' + error.message, 'error');
      }
    };

    if (isSavedFromPublic) {
      // One-click removal. No dialog. The toast confirms what
      // happened; recovery is a one-tap Save from Public Library.
      doDelete();
      return;
    }

    // Self-authored bhajan — permanent, deserves the extra tap.
    askConfirm(
      {
        title: 'Delete Bhajan?',
        message: `"${bhajan.title}" will be permanently deleted from your library. This cannot be undone.`,
        confirmLabel: '🗑️ Delete'
      },
      doDelete
    );
  };

  // SESSION 6: useCallback so MyBhajanCard's React.memo holds
  // (a fresh function every render would defeat memoization).
  const openBhajanDetail = useCallback(async (bhajan, opts) => {
    setSelectedBhajan(bhajan);
    setCurrentView('bhajan-detail');
    // SESSION 58: when opened from the card's YouTube Listen button,
    // auto-expand the inline player. Otherwise collapse any prior one.
    setShowAudioPlayer(!!(opts && opts.autoplay));
    trackRecentRead(bhajan);

    try {
      if (!user) return;
      const db = window.firebase.firestore();
      // Personal viewCount — only when the user owns a copy (SESSION 83)
      if (!bhajan.virtual) {
        const patch = {
          viewCount: window.firebase.firestore.FieldValue.increment(1),
          lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        // SESSION 85: persist public corrections into the copy so the
        // stored document matches what the user sees.
        if (bhajan.needsSync) {
          ['title', 'lyrics', 'deity', 'category', 'dhun', 'scale', 'singer', 'lyricist', 'keywords', 'source', 'language'].forEach(f => { if (bhajan[f] !== undefined) patch[f] = bhajan[f]; });
          patch.baseRev = bhajan.baseRev || 0;
        }
        if (bhajan.linkedByTitle && bhajan.savedFromPublicId) patch.savedFromPublicId = bhajan.savedFromPublicId;   // SESSION 106
        await db.collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).update(patch);
      }

      // SESSION 40: if this personal bhajan originated from a
      // public bhajan (savedFromPublicId set), also bump the
      // source public bhajan's readCount so Popular Bhajans
      // reflects both surface reads (directly from Public
      // Library) AND personal-library reads of the same bhajan.
      // Firestore rules (Session 19) already permit signed-in
      // users to increment readCount only. Fire-and-forget:
      // failure here shouldn't block the reading view.
      if (bhajan.savedFromPublicId) {
        db.collection('publicBhajans').doc(bhajan.savedFromPublicId).update({
          readCount: window.firebase.firestore.FieldValue.increment(1)
        }).catch(e => console.log('Could not bump public readCount:', e.message));
      }
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

    if (keepEnglishRef.current && currentWordText === keepEnglishRef.current) { keepEnglishRef.current = null; setShowSuggestions(false); return; }
    const cachedSuggestions = getCachedSuggestions(currentWordText);

    if (cachedSuggestions && cachedSuggestions.length > 0) {
      e.preventDefault();
      const replacement = cachedSuggestions[0];
      const separator = e.key === '.' ? '.' : (e.key === 'Enter' ? '\n' : ' ');
      setShowSuggestions(false);
      setCurrentWord('');
      // SESSION 115: edit in place (no caret/scroll jump); fall back to state replace
      if (replaceRangeInField(target, wordStart, cursorPos, replacement + separator, (v) => setBhajanForm(prev => ({ ...prev, [fieldName]: v })))) return;
      const newValue = value.substring(0, wordStart) + replacement + separator + value.substring(cursorPos);
      setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
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
    if (fieldName === 'lyrics') pushLyricsHistory('bhajan', oldValue);

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

      if (keepEnglishRef.current && lastWord === keepEnglishRef.current) {
        keepEnglishRef.current = null;
        setShowSuggestions(false);
        setCurrentWord('');
        return;
      }
      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        const cachedSuggestions = getCachedSuggestions(lastWord);

        if (cachedSuggestions && cachedSuggestions.length > 0) {
          const replacement = cachedSuggestions[0];
          const newValue = beforeSeparator.substring(0, wordStart) + replacement + separator;
          const target = e.target;
          setShowSuggestions(false);
          setCurrentWord('');
          // SESSION 115: swap the word in place after this input event settles
          requestAnimationFrame(() => {
            if (replaceRangeInField(target, wordStart, value.length, replacement + separator, (v) => setBhajanForm(prev => ({ ...prev, [fieldName]: v })))) return;
            setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
            setTimeout(() => {
              const newCursor = wordStart + replacement.length + 1;
              target.selectionStart = newCursor;
              target.selectionEnd = newCursor;
            }, 0);
          });
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

    setShowSuggestions(false);
    setCurrentWord('');
    // SESSION 121: picking the plain English chip must not get re-converted on the space that follows
    keepEnglishRef.current = /^[a-zA-Z]+$/.test(suggestion) ? suggestion : null;
    if (replaceRangeInField(fieldElement, wordStart, cursorPos, suggestion + ' ', (v) => setBhajanForm(prev => ({ ...prev, [fieldName]: v })))) return;
    const newValue = value.substring(0, wordStart) + suggestion + ' ' + value.substring(cursorPos);
    setBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
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
    if (fieldName === 'lyrics') pushLyricsHistory('public', oldValue);

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

      if (keepEnglishRef.current && lastWord === keepEnglishRef.current) {
        keepEnglishRef.current = null;
        setShowSuggestions(false);
        setCurrentWord('');
        return;
      }
      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        const cachedSuggestions = getCachedSuggestions(lastWord);

        if (cachedSuggestions && cachedSuggestions.length > 0) {
          const replacement = cachedSuggestions[0];
          const newValue = beforeSeparator.substring(0, wordStart) + replacement + separator;
          const target = e.target;
          setShowSuggestions(false);
          setCurrentWord('');
          // SESSION 115: swap the word in place after this input event settles
          requestAnimationFrame(() => {
            if (replaceRangeInField(target, wordStart, value.length, replacement + separator, (v) => setPublicBhajanForm(prev => ({ ...prev, [fieldName]: v })))) return;
            setPublicBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
            setTimeout(() => {
              const newCursor = wordStart + replacement.length + 1;
              target.selectionStart = newCursor;
              target.selectionEnd = newCursor;
            }, 0);
          });
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

    if (keepEnglishRef.current && currentWordText === keepEnglishRef.current) { keepEnglishRef.current = null; setShowSuggestions(false); return; }
    const cachedSuggestions = getCachedSuggestions(currentWordText);

    if (cachedSuggestions && cachedSuggestions.length > 0) {
      e.preventDefault();
      const replacement = cachedSuggestions[0];
      const separator = e.key === '.' ? '.' : (e.key === 'Enter' ? '\n' : ' ');
      setShowSuggestions(false);
      setCurrentWord('');
      // SESSION 115: edit in place (no caret/scroll jump); fall back to state replace
      if (replaceRangeInField(target, wordStart, cursorPos, replacement + separator, (v) => setPublicBhajanForm(prev => ({ ...prev, [fieldName]: v })))) return;
      const newValue = value.substring(0, wordStart) + replacement + separator + value.substring(cursorPos);
      setPublicBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
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

    setShowSuggestions(false);
    setCurrentWord('');
    keepEnglishRef.current = /^[a-zA-Z]+$/.test(suggestion) ? suggestion : null;
    if (replaceRangeInField(fieldElement, wordStart, cursorPos, suggestion + ' ', (v) => setPublicBhajanForm(prev => ({ ...prev, [fieldName]: v })))) return;
    const newValue = value.substring(0, wordStart) + suggestion + ' ' + value.substring(cursorPos);
    setPublicBhajanForm(prev => ({ ...prev, [fieldName]: newValue }));
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
  const openPublicBhajanDetail = useCallback((bhajan, opts) => {
    setSelectedPublicBhajan(bhajan);
    setCurrentView('public-bhajan-detail');
    // SESSION 58: auto-expand the inline player when the user tapped
    // the YouTube Listen button on the card.
    setShowAudioPlayer(!!(opts && opts.autoplay));
    trackRecentRead(bhajan, 'public');

    // SESSION 19: increment readCount for signed-in users so
    // "Popular Bhajans" reflects what's actually being read, not
    // just what's been saved. Guests are excluded on purpose:
    // (a) rules would need to allow anonymous writes, which
    //     invites bot inflation of the counter
    // (b) the signed-in bhakt community is who matters most for
    //     this signal — their reading patterns are meaningful,
    //     random guest reads are noise.
    //
    // First-time write also backfills readCount from saveCount so
    // pre-Session-19 bhajans start with a reasonable ranking
    // instead of dropping to 0 on the transition day. This is a
    // one-shot per-bhajan migration piggybacked on the read.
    //
    // Fire-and-forget: we don't await or block navigation on it,
    // and we swallow any error (permission-denied on first deploy
    // before rules are updated, offline, etc). Worst case the
    // counter just doesn't move — no user-visible regression.
    if (user && bhajan && bhajan.id) {
      try {
        const db = window.firebase.firestore();
        const ref = db.collection('publicBhajans').doc(bhajan.id);
        const currentRead = typeof bhajan.readCount === 'number' ? bhajan.readCount : null;
        const currentSave = typeof bhajan.saveCount === 'number' ? bhajan.saveCount : 0;
        if (currentRead === null && currentSave > 0) {
          // One-shot backfill: seed readCount to saveCount then +1
          ref.update({
            readCount: currentSave + 1
          }).catch(() => { /* rules or network — noop */ });
        } else {
          ref.update({
            readCount: window.firebase.firestore.FieldValue.increment(1)
          }).catch(() => { /* noop */ });
        }
      } catch { /* firebase not ready — extremely rare */ }
    }
  }, [user, trackRecentRead]);

  // SESSION 13: consume a pending deep link once the public library
  // has loaded. We wait for publicBhajans (rather than opening
  // eagerly) so that (a) the reading view has real content to show,
  // (b) we can toast a "couldn't find" message if the id is invalid.
  //
  // SESSION 13 + SESSION 26: consume a pending deep link.
  //
  // SESSION 26 FIX: WhatsApp's in-app browser is slow, and users
  // arriving via a shared link were seeing the empty home page
  // (skeletons) for 3-8 seconds while the full publicBhajans
  // listener populated. Many refreshed or gave up, thinking the
  // link was broken. Report: "First time me home page pe stuck
  // tha, this time worked" — confirming the timing issue.
  //
  // Two-part fix:
  //   1. Fast path: single-doc fetch for JUST the target bhajan
  //      (~200-500ms), independent of the full library listener.
  //      Fires as soon as Firestore is configured. Resolves the
  //      deep link almost instantly on cold cache.
  //   2. Fallback: if the direct fetch fails (network, rules,
  //      transient error), the original "wait for publicBhajans"
  //      path still handles resolution.
  //
  // A separate `deepLinkResolving` state lets the render layer
  // show a dedicated "Loading your bhajan..." splash instead of
  // the empty home page while resolution is in progress.
  useEffect(() => {
    if (!pendingDeepLinkId) return;

    let cancelled = false;

    const waitForFirestoreConfig = () => new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (cancelled) return resolve(false);
        if (window._firestoreConfigured && window.firebase && window.firebase.firestore) {
          return resolve(true);
        }
        if (Date.now() - start > 15000) return resolve(false);
        setTimeout(check, 100);
      };
      check();
    });

    const resolveDeepLink = async () => {
      const ready = await waitForFirestoreConfig();
      if (!ready || cancelled) return;

      try {
        const db = window.firebase.firestore();
        const doc = await db.collection('publicBhajans').doc(pendingDeepLinkId).get();
        if (cancelled) return;

        if (doc.exists) {
          const bhajan = { id: doc.id, ...doc.data() };
          openPublicBhajanDetail(bhajan);
          setPendingDeepLinkId(null);
          setDeepLinkResolving(false);
          try {
            const clean = window.location.pathname + window.location.hash;
            window.history.replaceState({ view: 'public-bhajan-detail' }, '', clean);
          } catch { /* non-fatal */ }
        } else {
          if (!cancelled) {
            showToast('That bhajan couldn\'t be found. Browse the library instead.', 'error');
            setPendingDeepLinkId(null);
            setDeepLinkResolving(false);
            try {
              const clean = window.location.pathname + window.location.hash;
              window.history.replaceState({ view: 'public-library' }, '', clean);
            } catch { /* non-fatal */ }
          }
        }
      } catch (e) {
        // Direct fetch failed — leave pendingDeepLinkId set so
        // the fallback effect (below) can resolve when the full
        // publicBhajans listener eventually fires.
        console.warn('Deep link direct fetch failed, falling back to listener:', e);
      }
    };

    resolveDeepLink();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeepLinkId]);

  // SESSION 26 fallback path: if direct fetch above didn't
  // resolve (network flaked, rules issue, etc.) but the full
  // publicBhajans listener eventually populates, we can still
  // resolve from that. Rare path — direct fetch usually wins.
  useEffect(() => {
    if (!pendingDeepLinkId) return;
    if (!publicBhajans || publicBhajans.length === 0) return;

    const target = publicBhajans.find(b => b.id === pendingDeepLinkId);
    if (target) {
      openPublicBhajanDetail(target);
    } else {
      showToast('That bhajan couldn\'t be found. Browse the library instead.', 'error');
    }

    setPendingDeepLinkId(null);
    setDeepLinkResolving(false);
    try {
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({ view: target ? 'public-bhajan-detail' : 'public-library' }, '', clean);
    } catch { /* non-fatal */ }
  }, [pendingDeepLinkId, publicBhajans, openPublicBhajanDetail, showToast]);

  // SESSION 26: expose escape hatch after 6s of splash. If a
  // deep link is truly failing to resolve (broken network,
  // Firestore config wedged, etc.), the user shouldn't be trapped.
  useEffect(() => {
    if (!deepLinkResolving) {
      setDeepLinkStuck(false);
      return;
    }
    const t = setTimeout(() => setDeepLinkStuck(true), 6000);
    return () => clearTimeout(t);
  }, [deepLinkResolving]);

  const saveToMyLibrary = useCallback(async (publicBhajan, opts = {}) => {
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
        baseRev: publicBhajan.rev || 0,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      // SESSION 42: keep the ref so callers (public reading view's
      // "Add to playlist") can chain save → add-to-program.
      const newRef = await db.collection('users').doc(user.uid).collection('bhajans').add(bhajanData);

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

      // SESSION 42: first-ever save gets a one-time hint about what
      // saving unlocks. Later saves get the short toast.
      let firstSave = false;
      try {
        firstSave = !localStorage.getItem('sankirtan-first-save-done');
        if (firstSave) localStorage.setItem('sankirtan-first-save-done', '1');
      } catch {}
      if (!opts.silent) {
        showToast(firstSave
          ? `✅ Saved! You can now add "${publicBhajan.title}" to playlists and edit its lyrics from My Library.`
          : `✅ "${publicBhajan.title}" added to your library!`);
      }
      return { id: newRef.id, ...bhajanData, savedFromPublicId: publicBhajan.id };
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
    const q = foldSearchKey(debouncedPublicSearch);
    const filtered = publicBhajans.filter(bhajan => {
      if (unreviewedOnly && bhajan.reviewStatus === 'reviewed') return false;
      if (q && searchTier(bhajan, q) < 0) return false;
      if (publicFilterDeity && bhajan.deity !== publicFilterDeity) return false;
      if (publicFilterCategory && bhajan.category !== publicFilterCategory) return false;
      if (publicFilterKeyword && (!bhajan.keywords || !bhajan.keywords.includes(publicFilterKeyword))) return false;
      return true;
    });
    // SESSION 12: session-scoped seeded shuffle. Same seed for the
    // whole session means search / filter / load-more don't cause
    // a re-randomization. New session = new seed = new order,
    // giving returning visitors a "fresh library" feeling.
    // Popular Bhajans section stays deterministic (sorted by
    // saveCount) — this shuffle only affects the main grid below it.
    // SESSION 71: when searching, title matches come first.
    return rankByTier(seededShuffle(filtered, shuffleSeed), q);
  }, [publicBhajans, debouncedPublicSearch, publicFilterDeity, publicFilterCategory, publicFilterKeyword, shuffleSeed, unreviewedOnly]);





  const filteredBhajans = useMemo(() => {
    const q = foldSearchKey(debouncedSearchQuery);
    const filtered = bhajans.filter(bhajan => {
      if (libraryStarredOnly && !bhajan.starred) return false;
      if (unreviewedOnly) {
        const pubId = bhajan.savedFromPublicId || bhajan.id;
        const pb = publicBhajans.find(x => x.id === pubId);
        if (!pb || pb.reviewStatus === 'reviewed') return false;
      }
      if (q && searchTier(bhajan, q) < 0) return false;
      if (filterDeity && bhajan.deity !== filterDeity) return false;
      if (filterCategory && bhajan.category !== filterCategory) return false;
      if (libraryFilterKeyword && (!bhajan.keywords || !bhajan.keywords.includes(libraryFilterKeyword))) return false;
      return true;
    });
    // SESSION 11: default sort by viewCount desc so the bhajans you
    // sing most often float to the top. Tiebreak by lastActive so
    // recently-opened bhajans beat older ones with the same view
    // count. Falls back to title A-Z for bhajans never opened.
    // SESSION 111: user-chosen sort (A–Z default; was silent most-sung).
    const ms = (x) => (x && x.toMillis ? x.toMillis() : 0);
    const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', 'hi');
    const sorted = filtered.sort((a, b) => {
      if (librarySort === 'sung') {
        const d = (b.viewCount || 0) - (a.viewCount || 0);
        if (d) return d;
        const l = ms(b.lastActive) - ms(a.lastActive);
        return l || byTitle(a, b);
      }
      if (librarySort === 'recent') {
        const l = ms(b.lastActive) - ms(a.lastActive);
        return l || byTitle(a, b);
      }
      if (librarySort === 'added') {
        const c = ms(b.createdAt) - ms(a.createdAt);
        return c || byTitle(a, b);
      }
      return byTitle(a, b);
    });
    // SESSION 71: when searching, title matches come first.
    return rankByTier(sorted, q);
  }, [bhajans, libraryStarredOnly, unreviewedOnly, publicBhajans, debouncedSearchQuery, filterDeity, filterCategory, libraryFilterKeyword, librarySort]);

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
  // SESSION 78: Related bhajans go by MOOD first (shared keywords, more
  // shared = higher), same deity as the tie-break; then same-deity
  // bhajans with no shared mood fill the remaining slots.
  const computeRelated = (current, pool) => {
    if (!current) return [];
    const relKws = new Set(current.keywords || []);
    const deity = (current.deity || '').trim().toLowerCase();
    const scored = pool
      .filter(b => b.id !== current.id)
      .map(b => {
        const matchedKws = (b.keywords || []).filter(kw => relKws.has(kw));
        const sameDeity = !!deity && (b.deity || '').trim().toLowerCase() === deity;
        return { ...b, matchedKws, sameDeity };
      });
    const byMood = scored
      .filter(b => b.matchedKws.length > 0)
      .sort((a, b) => b.matchedKws.length - a.matchedKws.length || (b.sameDeity - a.sameDeity) || (a.title || '').localeCompare(b.title || ''));
    const deityOnly = scored
      .filter(b => b.matchedKws.length === 0 && b.sameDeity)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return [...byMood, ...deityOnly].slice(0, 6);
  };

  const relatedMyBhajans = useMemo(() => computeRelated(selectedBhajan, bhajans), [selectedBhajan, bhajans]);
  const relatedPublicBhajans = useMemo(() => computeRelated(selectedPublicBhajan, publicBhajans), [selectedPublicBhajan, publicBhajans]);

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
    loadFeedbackList();
    loadConfigLists();
  };

  const deletePublicBhajan = (bhajan) => {
    if (!isAdmin) {
      showToast('Access denied. Admin only.', 'error');
      return;
    }
    // SESSION 101: warn how many of the admin's own programs/playlists use
    // it (other users' lists are private; theirs drop it automatically).
    const myCopyIds = new Set(bhajans.filter(b => b.id === bhajan.id || b.savedFromPublicId === bhajan.id).map(b => b.id));
    myCopyIds.add(bhajan.id);
    const using = programs.filter(p => (p.bhajanIds || []).some(id => myCopyIds.has(id)));
    const nProg = using.filter(p => getProgramType(p) === 'program').length;
    const nPl = using.length - nProg;
    const parts = [];
    if (nProg) parts.push(`${nProg} program${nProg === 1 ? '' : 's'}`);
    if (nPl) parts.push(`${nPl} playlist${nPl === 1 ? '' : 's'}/medley${nPl === 1 ? '' : 's'}`);
    const usage = using.length
      ? `\n\n⚠️ It is in ${parts.join(' and ')} of yours (${using.slice(0, 4).map(p => p.name).join(', ')}${using.length > 4 ? '…' : ''}). It will be removed from them, and from every other user's programs and playlists.`
      : "\n\nIt is not in any of your programs or playlists. Other users' lists that include it will drop it automatically.";
    askConfirm(
      {
        title: 'Delete Public Bhajan?',
        message: `"${bhajan.title}" will be removed from the Public Library for ALL users.${usage}`,
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
          // SESSION 113: also leave the library reading page if it was showing this bhajan
          if (currentView === 'bhajan-detail' && selectedBhajan && (selectedBhajan.id === bhajan.id || selectedBhajan.savedFromPublicId === bhajan.id)) {
            setCurrentView('library');
            setSelectedBhajan(null);
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
  // SESSION 16: admin — load existing curation for a date so we
  // can pre-populate the form (avoids accidentally overwriting).
  useEffect(() => {
    if (!isAdmin || currentView !== 'admin-panel') return;
    if (!dailyEditDate) return;
    if (dailyEditLoadedFor === dailyEditDate) return;

    let cancelled = false;
    (async () => {
      try {
        const db = window.firebase.firestore();
        const snap = await db.collection('dailyBhajans').doc(dailyEditDate).get();
        if (cancelled) return;
        if (snap.exists) {
          const data = snap.data() || {};
          setDailyEditBhajanId(data.bhajanId || '');
          setDailyEditNote(data.note || '');
        } else {
          setDailyEditBhajanId('');
          setDailyEditNote('');
        }
        setDailyEditLoadedFor(dailyEditDate);
      } catch (e) {
        // Non-fatal; leave form empty, allow save attempt.
        if (!cancelled) setDailyEditLoadedFor(dailyEditDate);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, currentView, dailyEditDate, dailyEditLoadedFor]);

  // SESSION 16: admin — save today's / a specific day's bhajan
  const saveDailyBhajan = async () => {
    if (!isAdmin) return;
    if (!dailyEditDate || !dailyEditBhajanId) {
      showToast('Please pick a date and a bhajan', 'error');
      return;
    }
    setDailyEditSaving(true);
    try {
      const db = window.firebase.firestore();
      await db.collection('dailyBhajans').doc(dailyEditDate).set({
        bhajanId: dailyEditBhajanId,
        note: (dailyEditNote || '').trim(),
        curatedByUid: user.uid,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast(`✓ Saved bhajan for ${dailyEditDate}`);
      // If we just set today's, update the visible daily card too.
      if (dailyEditDate === getTodayKey()) {
        setDailyBhajanId(dailyEditBhajanId);
        setDailyBhajanNote((dailyEditNote || '').trim());
      }
    } catch (e) {
      showToast('Could not save: ' + (e.message || 'unknown error'), 'error');
    } finally {
      setDailyEditSaving(false);
    }
  };

  const clearDailyBhajan = async () => {
    if (!isAdmin) return;
    if (!dailyEditDate) return;
    setDailyEditSaving(true);
    try {
      const db = window.firebase.firestore();
      await db.collection('dailyBhajans').doc(dailyEditDate).delete();
      showToast(`Cleared curation for ${dailyEditDate}`);
      setDailyEditBhajanId('');
      setDailyEditNote('');
      if (dailyEditDate === getTodayKey()) {
        setDailyBhajanId(null);
        setDailyBhajanNote('');
      }
    } catch (e) {
      showToast('Could not clear: ' + (e.message || 'unknown error'), 'error');
    } finally {
      setDailyEditSaving(false);
    }
  };

  const openAddPublicBhajan = (prefill = {}) => {
    if (!canContribute) return;
    if (!(prefill && typeof prefill === 'object' && !prefill.nativeEvent && prefill.title !== undefined)) setPublishFromId(null);
    setPublicBhajanForm({
      title: '',
      lyrics: '',
      deity: 'Babosa',
      category: 'Bhajan',
      language: 'Hindi',
      dhun: '',
      scale: '',
      singer: '',       // SESSION 11
      lyricist: '',     // SESSION 11
      keywords: [],
      source: '',
      reviewed: false,
      applyToCopies: true,
      ...(prefill && typeof prefill === 'object' && !prefill.nativeEvent ? prefill : {})
    });
    setEditingPublicBhajan(null);
    setPublicBhajanFormError('');
    setShowPublicBhajanForm(true);
  };

  // SESSION 108: admin publishes one of their own bhajans to the public
  // library. Opens the public Add form prefilled; on save the personal
  // copy is linked to the new public doc.
  const publishBhajanToPublic = (bhajan) => {
    if (!canContribute || !bhajan) return;
    setPublishFromId(bhajan.id);
    openAddPublicBhajan({
      title: bhajan.title || '',
      lyrics: bhajan.lyrics || '',
      deity: bhajan.deity || 'Babosa',
      category: bhajan.category || 'Bhajan',
      language: bhajan.language || 'Hindi',
      dhun: bhajan.dhun || '',
      scale: bhajan.scale || '',
      singer: bhajan.singer || '',
      lyricist: bhajan.lyricist || '',
      keywords: bhajan.keywords || [],
      source: bhajan.source || ''
    });
  };

  const openEditPublicBhajan = (bhajan) => {
    if (!canEditPublic(bhajan)) return;
    setPublicBhajanForm({
      title: bhajan.title || '',
      lyrics: bhajan.lyrics || '',
      deity: bhajan.deity || 'Babosa',
      category: bhajan.category || 'Bhajan',
      language: bhajan.language || 'Hindi',
      dhun: bhajan.dhun || '',
      scale: bhajan.scale || '',
      singer: bhajan.singer || '',      // SESSION 11
      lyricist: bhajan.lyricist || '',  // SESSION 11
      keywords: bhajan.keywords || [],
      source: bhajan.source || '',
      reviewed: bhajan.reviewStatus === 'reviewed',
      applyToCopies: true
    });
    setEditingPublicBhajan(bhajan);
    setPublicBhajanFormError('');
    setShowPublicBhajanForm(true);
  };

  // SESSION 85: one-tap review flag (admin). Works from any page that
  // shows a public bhajan or a library entry backed by one.
  const toggleReviewed = async (bhajan) => {
    if (!isAdmin || !bhajan) return;
    const pubId = bhajan.savedFromPublicId || bhajan.id;
    const pub = publicBhajans.find(b => b.id === pubId);
    if (!pub) { showToast('Not a public bhajan', 'error'); return; }
    const next = pub.reviewStatus === 'reviewed' ? 'draft' : 'reviewed';
    try {
      await window.firebase.firestore().collection('publicBhajans').doc(pubId).update({
        reviewStatus: next,
        reviewedAt: next === 'reviewed' ? window.firebase.firestore.FieldValue.serverTimestamp() : null
      });
      if (selectedPublicBhajan && selectedPublicBhajan.id === pubId) setSelectedPublicBhajan(prev => ({ ...prev, reviewStatus: next }));
      showToast(next === 'reviewed' ? '✓ Marked reviewed' : 'Marked as needs review');
    } catch (e) {
      showToast('Could not update: ' + e.message, 'error');
    }
  };
  const isReviewed = (bhajan) => {
    if (!bhajan) return false;
    const pub = publicBhajans.find(b => b.id === (bhajan.savedFromPublicId || bhajan.id));
    return !!pub && pub.reviewStatus === 'reviewed';
  };

  // SESSION 88: server-side fetch (api/fetch-lyrics.js) — browsers can't
  // read other sites directly because of CORS.
  // SESSION 130: some sites (Kavita Kosh etc.) refuse requests from our
  // server but are MediaWiki installs whose API allows browser requests
  // (origin=*). Read the page's wikitext straight from the browser.
  const cleanWikitext = (wt) => {
    let t = String(wt || '');
    for (let i = 0; i < 6; i++) { const n = t.replace(/\{\{[^{}]*\}\}/g, ''); if (n === t) break; t = n; }
    t = t.replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(poem|div|span|p|center|small|big|b|i|u|nowiki)[^>]*>/gi, '')
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1')
      .replace(/\[https?:[^\s\]]*\s*([^\]]*)\]/g, '$1')
      .replace(/'{2,}/g, '').replace(/^=+.*=+\s*$/gm, '').replace(/^[*#:;]+\s?/gm, '')
      .replace(/&nbsp;/g, ' ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
    return t;
  };
  const fetchViaMediaWiki = async (u) => {
    const url = new URL(u);
    let title = url.searchParams.get('title') || '';
    let prefix = '';
    if (!title) {
      const m = url.pathname.match(/^\/([^/]+)\/(.+)$/);
      if (m) { prefix = m[1]; title = m[2]; } else title = url.pathname.replace(/^\//, '');
    }
    title = decodeURIComponent(title).replace(/_/g, ' ');
    if (!title) throw new Error('no title');
    const apis = [prefix ? `${url.origin}/${prefix}/api.php` : null, `${url.origin}/w/api.php`, `${url.origin}/api.php`].filter(Boolean);
    for (const api of apis) {
      try {
        const r = await fetch(`${api}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&origin=*`);
        if (!r.ok) continue;
        const j = await r.json();
        const wt = j && j.parse && j.parse.wikitext && j.parse.wikitext['*'];
        if (!wt) continue;
        const lyrics = cleanWikitext(wt);
        if (!/[\u0900-\u097F]/.test(lyrics)) continue;
        const pageTitle = (j.parse.title || title);
        const parts = pageTitle.split(' / ');
        return { title: parts[0].trim(), lyricist: (parts[1] || '').trim(), lyrics, text: lyrics, host: url.hostname, url: u, via: 'wiki' };
      } catch { /* try next */ }
    }
    return null;
  };
  const fetchLyricsFromWeb = async () => {
    const u = fetchUrl.trim();
    if (!u) return;
    setFetchBusy(true); setFetchResult(null); setFetchShowFull(false);
    try {
      const r = await fetch('/api/fetch-lyrics?url=' + encodeURIComponent(u));
      const j = await r.json();
      if (!j.ok || !j.lyrics) {
        // Blocked for our server, or nothing found: try the site's wiki API from this browser.
        let alt = null;
        try { alt = await fetchViaMediaWiki(u); } catch { alt = null; }
        if (alt) { setFetchResult(alt); return; }
      }
      if (!j.ok) setFetchResult({ error: j.error || 'Could not fetch' });
      else setFetchResult({ title: j.title || '', lyrics: j.lyrics || '', text: j.text || '', host: j.host, url: u, hint: j.hint });
    } catch (e) {
      let alt = null;
      try { alt = await fetchViaMediaWiki(u); } catch { alt = null; }
      if (alt) setFetchResult(alt); else setFetchResult({ error: 'Could not reach the fetch service' });
    } finally {
      setFetchBusy(false);
    }
  };

  const savePublicBhajan = async () => {
    if (!canContribute) return;
    if (editingPublicBhajan && !canEditPublic(editingPublicBhajan)) return;
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
        singer: (publicBhajanForm.singer || '').trim(),     // SESSION 11
        lyricist: (publicBhajanForm.lyricist || '').trim(), // SESSION 11
        keywords: publicBhajanForm.keywords,
        source: publicBhajanForm.source.trim(),
        addedByUid: editingPublicBhajan ? (editingPublicBhajan.addedByUid || user.uid) : user.uid,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      };
      // SESSION 85: revision tracking. rev bumps on every save; pushRev is
      // raised to rev only when the admin chooses "apply to personal
      // libraries" — personal copies follow the public text while their
      // baseRev < pushRev and the user hasn't edited the text themselves.
      const prevRev = editingPublicBhajan ? (editingPublicBhajan.rev || 0) : 0;
      const nextRev = prevRev + 1;
      bhajanData.rev = nextRev;
      bhajanData.pushRev = publicBhajanForm.applyToCopies ? nextRev : (editingPublicBhajan ? (editingPublicBhajan.pushRev || 0) : nextRev);
      // Contributors' entries always stay 'draft' until the admin reviews them.
      bhajanData.reviewStatus = isAdmin && publicBhajanForm.reviewed ? 'reviewed' : 'draft';
      if (isAdmin && publicBhajanForm.reviewed && !(editingPublicBhajan && editingPublicBhajan.reviewStatus === 'reviewed')) {
        bhajanData.reviewedAt = window.firebase.firestore.FieldValue.serverTimestamp();
      }

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
        const newRef = await db.collection('publicBhajans').add(bhajanData);
        if (publishFromId) {
          // SESSION 108: link the personal copy so it follows the public one
          try {
            await db.collection('users').doc(user.uid).collection('bhajans').doc(publishFromId).update({ savedFromPublicId: newRef.id, baseRev: nextRev });
            setSelectedBhajan(prev => (prev && prev.id === publishFromId ? { ...prev, savedFromPublicId: newRef.id } : prev));
          } catch (e) { console.warn('Could not link personal copy:', e); }
          setPublishFromId(null);
        }
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
    // SESSION 32: seed the new form's type based on which sub-view
    // the user is currently on. If they're on Playlists tab and
    // hit Create, they most likely want a playlist. Still
    // switchable via the toggle inside the form.
    setProgramForm({
      name: '',
      date: '',
      venue: '',
      bhajanIds: [],
      type: playlistViewMode,
      purpose: ''
    });
    setProgramFormError('');
    setEditingProgram(null);
    setCurrentView('create-program');
    setShowBhajanPicker(true);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerKeywordFilter('');
  };

  // SESSION 43: create a parody from My Library. Same form as
  // programs/playlists, pre-typed as 'parody'. The form's type
  // toggle only shows Parody when type is already parody, so the
  // user can't accidentally turn it into a playlist here.
  const openCreateParody = () => {
    setProgramForm({ name: '', date: '', venue: '', bhajanIds: [], type: 'parody', purpose: '' });
    setProgramFormError('');
    setEditingProgram(null);
    setSetlistAutoSave('idle');
    setCurrentView('create-program');
    setShowBhajanPicker(true);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerKeywordFilter('');
  };

  const openEditProgram = (program) => {
    // SESSION 32: derive type from doc or infer for legacy docs.
    // Purpose field is new; defaults to empty for legacy.
    setProgramForm({
      name: program.name || '',
      date: program.date || '',
      venue: program.venue || '',
      bhajanIds: program.bhajanIds || [],
      type: getProgramType(program),
      purpose: program.purpose || ''
    });
    setProgramFormError('');
    setEditingProgram(program);
    setSetlistAutoSave('idle');
    setCurrentView('edit-program');
  };

  const openProgramDetail = (program) => {
    setSelectedProgram(program);
    setCurrentView('program-detail');
  };

  // SESSION 38: append a bhajan to a program/playlist/parody's
  // bhajanIds array. Called from the "Add to..." picker in the
  // bhajan-detail reading view.
  //
  // No-op if bhajan already in the list (button is disabled in
  // that case, but defensive check catches racing double-taps).
  // Optimistic UI: update programs state immediately, then write
  // to Firestore. If the write fails, we revert and show an error
  // toast so the user knows.
  const addBhajanToProgram = async (program, bhajan) => {
    if (!program || !bhajan || !user) return;
    if (Array.isArray(program.bhajanIds) && program.bhajanIds.includes(bhajan.id)) {
      // Already in — no work
      return;
    }
    const programId = program.id;
    // Mark as saving (drives spinner/disabled state)
    setAddToProgramSaving(prev => {
      const next = new Set(prev);
      next.add(programId);
      return next;
    });

    const prevBhajanIds = Array.isArray(program.bhajanIds) ? program.bhajanIds : [];
    const nextBhajanIds = [...prevBhajanIds, bhajan.id];

    // Optimistic local update
    setPrograms(prev => prev.map(p =>
      p.id === programId
        ? { ...p, bhajanIds: nextBhajanIds, bhajanCount: nextBhajanIds.length }
        : p
    ));

    try {
      const db = window.firebase.firestore();
      await db.collection('users').doc(user.uid).collection('programs').doc(programId).update({
        bhajanIds: nextBhajanIds,
        bhajanCount: nextBhajanIds.length,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      const t = getProgramType(program);
      const label = t === 'parody' ? 'medley' : t === 'playlist' ? 'playlist' : 'program';
      showToast(`✓ Added to ${label} "${program.name}"`);
    } catch (error) {
      console.error('Add-to-program failed:', error);
      // Revert optimistic update
      setPrograms(prev => prev.map(p =>
        p.id === programId
          ? { ...p, bhajanIds: prevBhajanIds, bhajanCount: prevBhajanIds.length }
          : p
      ));
      showToast('Could not add: ' + error.message, 'error');
    } finally {
      setAddToProgramSaving(prev => {
        const next = new Set(prev);
        next.delete(programId);
        return next;
      });
    }
  };

  const saveProgram = async () => {
    if (!programForm.name.trim()) {
      const t = programForm.type;
      const noun = t === 'parody' ? 'medley' : t === 'playlist' ? 'playlist' : 'program';
      setProgramFormError(`Please enter a ${noun} name`);
      return;
    }
    // SESSION 67: a program is a dated event by definition — without a
    // date it can't be sorted or marked complete. Playlists are for
    // undated collections.
    if (programForm.type === 'program' && !programForm.date.trim()) {
      setProgramFormError('Please pick the program date — or make it a Playlist if it has no date');
      return;
    }

    try {
      setProgramFormSaving(true);
      setProgramFormError('');
      const db = window.firebase.firestore();

      const isPlaylist = programForm.type === 'playlist';
      const isParody = programForm.type === 'parody';
      // SESSION 36: both playlist and parody have no date/venue.
      const isDateless = isPlaylist || isParody;

      const programData = {
        name: programForm.name.trim(),
        // SESSION 32/36: for playlists AND parodies, date/venue are
        // always empty. For programs, purpose is empty. Keep the doc
        // shape predictable — no field surprises for downstream code.
        date: isDateless ? '' : programForm.date.trim(),
        venue: isDateless ? '' : programForm.venue.trim(),
        purpose: isDateless ? programForm.purpose.trim() : '',
        type: programForm.type,
        bhajanIds: programForm.bhajanIds,
        ownerId: user.uid,
        ownerName: userProfile.displayName,
        bhajanCount: programForm.bhajanIds.length,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
      };

      const programsRef = db.collection('users').doc(user.uid).collection('programs');
      const label = isParody ? 'Medley' : (isPlaylist ? 'Playlist' : 'Program');

      if (editingProgram) {
        await programsRef.doc(editingProgram.id).update(programData);
        setSelectedProgram({ ...editingProgram, ...programData });
        setCurrentView('program-detail');
        showToast(`💾 ${label} updated`);
      } else {
        programData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await programsRef.add(programData);
        // SESSION 43: parodies return to My Library (with the section
        // open so the new one is visible); playlists/programs to the tab.
        if (isParody) {
          setLibraryParodiesOpen(true);
          setCurrentView('library');
        } else {
          setPlaylistViewMode(programForm.type);   // SESSION 87: land on the matching tab
          setCurrentView('programs');
        }
        showToast(`✅ ${label} "${programData.name}" created`);
      }
    } catch (error) {
      console.error('Error saving program:', error);
      setProgramFormError('Could not save: ' + error.message);
    } finally {
      setProgramFormSaving(false);
    }
  };

  // SESSION 83: turn a virtual (public) library entry into the user's own
  // copy before a personal write. Returns the bhajan to operate on.
  const materializeBhajan = async (bhajan) => {
    if (!bhajan || !bhajan.virtual) return bhajan;
    const pub = publicBhajans.find(b => b.id === bhajan.id) || bhajan;
    const saved = await saveToMyLibrary(pub, { silent: true });
    if (!saved) return null;
    setSelectedBhajan(prev => (prev && prev.id === bhajan.id ? { ...saved, starred: false, notes: '' } : prev));
    return saved;
  };

  // SESSION 75: ⭐ star / unstar a library bhajan.
  const toggleStarred = async (bhajanIn) => {
    if (!user || !bhajanIn) return;
    const bhajan = await materializeBhajan(bhajanIn);
    if (!bhajan) return;
    const next = !bhajan.starred;
    try {
      await window.firebase.firestore().collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).update({ starred: next });
      setSelectedBhajan(prev => (prev && (prev.id === bhajan.id || prev.id === bhajanIn.id) ? { ...prev, ...bhajan, starred: next, virtual: false } : prev));
      showToast(next ? '⭐ Starred' : 'Removed from Starred');
    } catch (error) {
      showToast('Could not update: ' + error.message, 'error');
    }
  };

  // SESSION 75: private singer notes on a library bhajan.
  const saveBhajanNotes = async (bhajanIn, text) => {
    if (!user || !bhajanIn) return;
    const notes = (text || '').trim();
    try {
      const bhajan = await materializeBhajan(bhajanIn);
      if (!bhajan) return;
      await window.firebase.firestore().collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).update({ notes });
      setSelectedBhajan(prev => (prev && (prev.id === bhajan.id || prev.id === bhajanIn.id) ? { ...prev, ...bhajan, notes, virtual: false } : prev));
      setNotesDraft(null);
      showToast(notes ? '📝 Notes saved' : 'Notes cleared');
    } catch (error) {
      showToast('Could not save notes: ' + error.message, 'error');
    }
  };

  // SESSION 84: save scale/raag inline from the bhajan page — no full form.
  // Writes the same `scale` field the Edit Bhajan form uses, so the form
  // shows it next time it is opened.
  const saveBhajanScale = async (bhajanIn, text) => {
    if (!user || !bhajanIn) return;
    const scale = (text || '').trim();
    try {
      const bhajan = await materializeBhajan(bhajanIn);
      if (!bhajan) return;
      await window.firebase.firestore().collection('users').doc(user.uid).collection('bhajans').doc(bhajan.id).update({ scale });
      setSelectedBhajan(prev => (prev && (prev.id === bhajan.id || prev.id === bhajanIn.id) ? { ...prev, ...bhajan, scale, virtual: false } : prev));
      setScaleDraft(null);
      showToast(scale ? `🎵 Scale set: ${scale}` : 'Scale cleared');
    } catch (error) {
      showToast('Could not save scale: ' + error.message, 'error');
    }
  };

  // SESSION 70: share the setlist as plain text (WhatsApp-friendly).
  const shareProgramText = async (program) => {
    const pType = getProgramType(program);
    const label = pType === 'parody' ? 'Medley' : (pType === 'playlist' ? 'Playlist' : 'Program');
    const ids = program.bhajanIds || [];
    const lines = [`🙏 ${program.name}`];
    if (pType === 'program') {
      const when = program.date ? formatProgramDate(program.date) : '';
      const where = program.venue ? program.venue : '';
      if (when || where) lines.push([when, where].filter(Boolean).join(' · '));
    } else if (program.purpose) {
      lines.push(program.purpose);
    }
    lines.push('');
    ids.forEach((id, i) => {
      const b = getBhajanById(id);
      if (!b) return;
      let row = `${i + 1}. ${b.title}`;
      if (b.dhun) row += `  (तर्ज़: ${b.dhun})`;
      if (b.scale) row += `  [${b.scale}]`;
      if (program.singers && program.singers[id]) row += `  — 🎤 ${program.singers[id]}`;
      lines.push(row);
    });
    lines.push('', `${ids.length} bhajan${ids.length === 1 ? '' : 's'} · via sankirtan.app`);
    const result = await shareTextContent(`${label}: ${program.name}`, lines.join('\n'));
    if (result === 'copied') showToast('📋 Setlist copied — paste in WhatsApp');
    else if (result === 'shared') showToast('✓ Setlist shared');
  };

  // SESSION 70: duplicate a program/playlist/medley into a new one.
  const duplicateProgram = async (program) => {
    const pType = getProgramType(program);
    const label = pType === 'parody' ? 'Medley' : (pType === 'playlist' ? 'Playlist' : 'Program');
    try {
      const db = window.firebase.firestore();
      const programsRef = db.collection('users').doc(user.uid).collection('programs');
      const ts = window.firebase.firestore.FieldValue.serverTimestamp();
      const data = {
        name: `${program.name} (copy)`,
        date: pType === 'program' ? getTodayKey() : '',
        venue: pType === 'program' ? (program.venue || '') : '',
        purpose: pType === 'program' ? '' : (program.purpose || ''),
        type: program.type || pType,
        bhajanIds: [...(program.bhajanIds || [])],
        singers: { ...(program.singers || {}) },
        ownerId: user.uid,
        ownerName: userProfile.displayName,
        bhajanCount: (program.bhajanIds || []).length,
        createdAt: ts,
        updatedAt: ts,
        lastActive: ts
      };
      const ref = await programsRef.add(data);
      setSelectedProgram({ ...data, id: ref.id, createdAt: null, updatedAt: null, lastActive: null });
      setCurrentView('program-detail');
      showToast(`✅ ${label} copied — rename it from ✎ Edit details`);
    } catch (error) {
      console.error('Error duplicating program:', error);
      showToast('Could not copy: ' + error.message, 'error');
    }
  };

  const deleteProgram = (program) => {
    // SESSION 32/36: label matches the program's actual type
    const pType = getProgramType(program);
    const label = pType === 'parody' ? 'Medley' : (pType === 'playlist' ? 'Playlist' : 'Program');
    askConfirm(
      {
        title: `Delete ${label}?`,
        message: `"${program.name}" and its setlist will be permanently deleted. Your bhajans stay in your library.`,
        confirmLabel: '🗑️ Delete'
      },
      async () => {
        try {
          const db = window.firebase.firestore();
          await db.collection('users').doc(user.uid).collection('programs').doc(program.id).delete();
          if (pType !== 'parody') setPlaylistViewMode(pType);   // SESSION 87
          setCurrentView(pType === 'parody' ? 'library' : 'programs');  // SESSION 43
          setSelectedProgram(null);
          showToast(`${label} deleted`);
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

  // SESSION 67: reorder / remove straight from the program page, no
  // Edit form needed. Writes the new setlist immediately; the programs
  // onSnapshot listener keeps the list view in sync.
  const [setlistEditMode, setSetlistEditMode] = useState(false);
  // SESSION 76: print/PDF job, singer-assignment editor
  const [printJob, setPrintJob] = useState(null); // { program, withLyrics }
  const [singerEditId, setSingerEditId] = useState(null);
  const [singerDraft, setSingerDraft] = useState('');
  useEffect(() => {
    if (!printJob) return;
    const t = setTimeout(() => { try { window.print(); } catch {} }, 400);
    const done = () => setPrintJob(null);
    window.addEventListener('afterprint', done);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printJob]);
  useEffect(() => { if (currentView !== 'program-detail') setSetlistEditMode(false); }, [currentView]);
  // SESSION 76: who sings which bhajan — { [bhajanId]: name } on the program.
  const persistSingers = async (program, singers) => {
    if (!user || !program) return;
    const updated = { ...program, singers };
    setSelectedProgram(updated);
    try {
      await window.firebase.firestore()
        .collection('users').doc(user.uid).collection('programs').doc(program.id)
        .update({ singers, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
      showToast('Could not save singer — check your connection', 'error');
    }
  };
  const setSingerFor = (program, bhajanId, name) => {
    const singers = { ...(program.singers || {}) };
    const n = (name || '').trim();
    if (n) singers[bhajanId] = n; else delete singers[bhajanId];
    setSingerEditId(null);
    persistSingers(program, singers);
  };

  // SESSION 101: a bhajan deleted from the library silently drops out of
  // any program/playlist the next time it is opened — the remaining ones
  // renumber. Only runs once both libraries have loaded, so a slow
  // network never prunes by mistake.
  useEffect(() => {
    if (currentView !== 'program-detail' || !selectedProgram || !user) return;
    if (bhajansLoading || publicLoading || publicBhajans.length === 0) return;
    const ids = selectedProgram.bhajanIds || [];
    const kept = ids.filter(id => !!getBhajanById(id));
    if (kept.length !== ids.length) persistSetlist(selectedProgram, kept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, selectedProgram && selectedProgram.id, bhajans, publicBhajans, bhajansLoading, publicLoading]);

  const persistSetlist = async (program, newIds) => {
    if (!user || !program) return;
    const updated = { ...program, bhajanIds: newIds, bhajanCount: newIds.length };
    setSelectedProgram(updated);
    try {
      await window.firebase.firestore()
        .collection('users').doc(user.uid).collection('programs').doc(program.id)
        .update({
          bhajanIds: newIds,
          bhajanCount: newIds.length,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
      console.error('Setlist update failed:', e);
      showToast('Could not save the new order — check your connection', 'error');
    }
  };
  const moveInSetlist = (program, index, delta) => {
    const ids = [...(program.bhajanIds || [])];
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    persistSetlist(program, ids);
  };
  const removeFromSetlist = (program, bhajanId) => {
    persistSetlist(program, (program.bhajanIds || []).filter(id => id !== bhajanId));
  };

  // SESSION 43: AUTO-SAVE THE SETLIST WHEN EDITING AN EXISTING LIST.
  // Any change to programForm.bhajanIds (add, remove, reorder) while
  // in edit-program mode writes to Firestore after a 600ms debounce.
  // The Save button is only needed for name/date/venue/purpose.
  // Guarded against writing when the ids already match the stored
  // doc, so opening the editor doesn't trigger a write.
  useEffect(() => {
    if (currentView !== 'edit-program' || !editingProgram || !user) return;
    const ids = programForm.bhajanIds || [];
    const stored = editingProgram.bhajanIds || [];
    if (ids.length === stored.length && ids.every((id, i) => id === stored[i])) return;
    setSetlistAutoSave('saving');
    const t = setTimeout(async () => {
      try {
        const db = window.firebase.firestore();
        await db.collection('users').doc(user.uid).collection('programs').doc(editingProgram.id).update({
          bhajanIds: ids,
          bhajanCount: ids.length,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        setEditingProgram(prev => prev ? { ...prev, bhajanIds: ids, bhajanCount: ids.length } : prev);
        setPrograms(prev => prev.map(p => p.id === editingProgram.id ? { ...p, bhajanIds: ids, bhajanCount: ids.length } : p));
        setSetlistAutoSave('saved');
      } catch (e) {
        console.error('Setlist auto-save failed:', e);
        setSetlistAutoSave('error');
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programForm.bhajanIds, editingProgram, currentView, user]);

  // Central close-and-reset helper for the picker.
  // Used by the Done button, X button, and backdrop click so all three
  // paths reset search + filters consistently.
  // SESSION 68: when the picker was opened from the program page, Done
  // returns there (writing any setlist change immediately) instead of
  // dropping the user into the Edit form.
  const [pickerReturnTo, setPickerReturnTo] = useState(null);
  const openPickerFromProgramPage = (program) => {
    openEditProgram(program);
    setShowBhajanPicker(true);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerKeywordFilter('');
    setPickerReturnTo('program-detail');
  };
  const closeBhajanPicker = () => {
    setShowBhajanPicker(false);
    setBhajanPickerSearch('');
    setPickerDeityFilter('');
    setPickerKeywordFilter('');
    if (pickerReturnTo === 'program-detail' && editingProgram) {
      const ids = programForm.bhajanIds || [];
      const stored = editingProgram.bhajanIds || [];
      const changed = !(ids.length === stored.length && ids.every((id, i) => id === stored[i]));
      if (changed) persistSetlist(editingProgram, ids);
      else setSelectedProgram(editingProgram);
      setCurrentView('program-detail');
    }
    setPickerReturnTo(null);
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

  // SESSION 83: a program may reference a public id (added while the
  // bhajan was virtual); resolve it to the personal copy once one exists.
  const getBhajanById = (id) => bhajans.find(b => b.id === id) || bhajans.find(b => b.savedFromPublicId === id);

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
      trackRecentRead(nextBhajan, 'public');
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
  // SESSION 74: swipe between bhajans in Live mode too.
  const liveSwipe = useSwipe(liveNext, livePrev, { enabled: currentView === 'live-program', threshold: 80 });
  useEffect(() => { setNotesDraft(null); setNotesOpen(false); setScaleDraft(null); }, [selectedBhajan?.id, currentView, liveProgramIndex]);

  // Share handler with toast feedback
  // SESSION 13: isPublic flag determines whether we include a
  // deep link. Public reading view passes true; my-library
  // reading view passes false (private ids aren't resolvable
  // by recipients).
  // SESSION 17: opts.isDaily=true (from the "आज का भजन" card)
  // prepends the bilingual "Today's Bhajan" tag to the share
  // text so recipients understand context.
  const handleShareBhajan = useCallback(async (bhajan, isPublic = false, opts = {}) => {
    const result = await shareBhajan(bhajan, isPublic, opts);
    if (result === 'copied') showToast('📋 Lyrics copied to clipboard!');
    else if (result === 'shared') showToast('✓ Shared successfully!');
  }, [showToast]);

  // SESSION 29: share the app itself. Used by the footer link and
  // the final onboarding step to let bhakts invite family/friends
  // in one tap.
  const handleShareApp = useCallback(async () => {
    const result = await shareApp();
    if (result === 'copied') showToast('📋 Link copied — paste in WhatsApp');
    else if (result === 'shared') showToast('🙏 Thank you for sharing!');
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
      // SESSION 42: land on the Public Library as a guest (matches the
      // new default for unregistered visitors) — avoids a flash of the
      // sign-in screen between signOut() and onAuthStateChanged.
      setGuestMode(true);
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
            <p className={`text-sm leading-relaxed mb-5 text-center whitespace-pre-line ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
  // SESSION 76: print sheet — rendered into <body> and shown only in
  // @media print (index.css). The browser's own Devanagari shaping and
  // "Save as PDF" do the rest; no PDF library needed.
  const printJsx = printJob && createPortal(
    <div id="sk-print">
      <h1>{printJob.program.name}</h1>
      <p className="sk-print-meta">
        {[printJob.program.date ? formatProgramDate(printJob.program.date) : '', printJob.program.venue, printJob.program.purpose].filter(Boolean).join(' · ')}
        {(printJob.program.bhajanIds || []).length ? ` · ${(printJob.program.bhajanIds || []).length} bhajans` : ''}
      </p>
      {printJob.withLyrics ? (
        (printJob.program.bhajanIds || []).map((id, i) => {
          const b = getBhajanById(id);
          if (!b) return null;
          return (
            <section key={id} className="sk-print-bhajan">
              <h2>{i + 1}. {b.title}</h2>
              <p className="sk-print-sub">
                {[b.dhun ? `तर्ज़: ${b.dhun}` : '', b.scale ? `🎵 ${b.scale}` : '', printJob.program.singers && printJob.program.singers[id] ? `🎤 ${printJob.program.singers[id]}` : ''].filter(Boolean).join('  ·  ')}
              </p>
              <pre>{b.lyrics}</pre>
            </section>
          );
        })
      ) : (
        <ol>
          {(printJob.program.bhajanIds || []).map((id) => {
            const b = getBhajanById(id);
            if (!b) return null;
            return (
              <li key={id}>
                <span className="sk-print-title">{b.title}</span>
                <span className="sk-print-sub">
                  {[b.dhun ? `तर्ज़: ${b.dhun}` : '', b.scale ? `🎵 ${b.scale}` : '', printJob.program.singers && printJob.program.singers[id] ? `🎤 ${printJob.program.singers[id]}` : ''].filter(Boolean).join('  ·  ')}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="sk-print-foot">संकीर्तन · sankirtan.app</p>
    </div>,
    document.body
  );

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
              animation: splashFull ? 'splashTaglineIn 1s ease-out 0.6s forwards' : 'splashTaglineIn 0.5s ease-out 0.1s forwards',
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
                animation: splashFull ? 'splashDividerGrow 0.8s ease-out 1.2s forwards' : 'splashDividerGrow 0.5s ease-out 0.25s forwards',
                width: 0,
                opacity: 0,
              }}
            />
          </div>

          {/* SESSION 44: credits — "By Grace of Lord Babosa · Inspired by
              Manju Baisa". Shown on both the full and fast splash. */}
          <div
            style={{
              animation: splashFull ? 'splashCreditIn 0.7s ease-out 1.6s forwards' : 'splashCreditIn 0.5s ease-out 0.35s forwards',
              opacity: 0,
            }}
            className="mt-5"
          >
            <p className="text-[#0B5A70]/70 text-xs sm:text-sm flex items-center justify-center gap-1.5">
              <span style={{ animation: 'splashPrayerPulse 2s ease-in-out 2s infinite' }}>🙏</span>
              <span>By Grace of</span>
              <span
                style={{
                  animation: 'splashBabosaGlow 2.5s ease-in-out 2s infinite',
                  fontWeight: 700,
                }}
              >
                Lord Babosa
              </span>
              <span>🙏</span>
            </p>
            <p className="text-[#0B5A70]/60 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5">
              <span aria-hidden="true">🙏</span>
              <span>Inspired by <span className="font-semibold text-[#E65100]/80">Manju Baisa</span></span>
              <span aria-hidden="true">🙏</span>
            </p>
          </div>

          <div
            className="mt-8"
            style={{
              animation: splashFull ? 'splashSpinnerIn 0.5s ease-out 2s forwards' : 'splashSpinnerIn 0.4s ease-out 0.5s forwards',
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
              <p className="text-white/80 text-sm mt-1">What should we call you?</p>
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
                {authLoading ? 'Saving...' : 'Continue →'}
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
    // SESSION 14: opaque background (was /95 + backdrop-blur-md).
    // iOS Safari renders backdrop-blur on fixed elements by pulling
    // scrolled content through the blur, which makes the bar look
    // like it's floating mid-page. Solid bg fixes the visual.
    const liveHeaderBg = darkMode ? 'bg-[#0f1a1c] border-[#0B5A70]/20' : 'bg-[#FFF8F0] border-[#0B5A70]/10';
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

    const nextBhajan = liveProgramIndex < totalBhajans - 1 ? getBhajanById(selectedProgram.bhajanIds[liveProgramIndex + 1]) : null;
    return (
      <div className={`min-h-screen ${liveBg}`} onTouchStart={liveSwipe.onTouchStart} onTouchEnd={liveSwipe.onTouchEnd}>
        {confirmDialogJsx}
        {toastJsx}{printJsx}
        {/* Live Header */}
        <div className={`sticky top-0 z-40 border-b ${liveHeaderBg}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={exitLiveProgram}
              className={`font-semibold flex items-center gap-1 text-sm ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}`}
              aria-label="Exit live mode"
            >
              Exit Live
            </button>
            <div className="text-center flex-1 mx-4">
              <p className={`text-xs font-semibold ${liveMutedColor}`}>🎤 LIVE PROGRAM</p>
              <p className={`text-sm font-bold truncate ${liveTitleColor}`}>{selectedProgram.name}</p>
              {selectedProgram.singers && selectedProgram.singers[currentBhajanId] && (
                <p className={`text-xs font-semibold truncate ${darkMode ? 'text-orange-300' : 'text-[#E65100]'}`}>🎤 {selectedProgram.singers[currentBhajanId]}</p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-xs ${liveMutedGray}`}>Bhajan</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-orange-300' : 'text-[#E65100]'}`}>
                {liveProgramIndex + 1} / {totalBhajans}
              </p>
            </div>
          </div>

          {/* Font Size Controls */}
          <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center justify-center gap-2 flex-wrap" data-live-controls>
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
              onClick={() => setLiveFontSize(Math.min(48, liveFontSize + 2))}
              className={`w-8 h-8 rounded-lg font-bold ${liveBtnMuted}`}
              title="Increase font"
              aria-label="Increase font size"
            >
              A+
            </button>
            <span className={`mx-1 h-5 w-px ${darkMode ? 'bg-white/15' : 'bg-[#0B5A70]/15'}`} aria-hidden="true" />
            <button
              onClick={toggleLiveAutoScroll}
              className={`w-9 h-8 rounded-lg text-sm font-bold flex items-center justify-center ${liveAutoScroll ? 'bg-[#E65100] text-white' : liveBtnMuted}`}
              title={liveAutoScroll ? 'Pause auto-scroll' : 'Auto-scroll lyrics'}
              aria-label={liveAutoScroll ? 'Pause auto-scroll' : 'Start auto-scroll'}
              aria-pressed={liveAutoScroll}
            >
              {liveAutoScroll ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => setLiveScrollSpeed(v => LIVE_SCROLL_STEPS[Math.max(0, LIVE_SCROLL_STEPS.indexOf(v) - 1)])}
              className={`w-8 h-8 rounded-lg font-bold ${liveBtnMuted} disabled:opacity-40`}
              title="Slower"
              aria-label="Slower auto-scroll"
              disabled={LIVE_SCROLL_STEPS.indexOf(liveScrollSpeed) <= 0}
            >
              −
            </button>
            <span className={`text-xs min-w-[34px] text-center ${liveMutedGray}`} title="Scroll speed">{liveScrollSpeed}×</span>
            <button
              onClick={() => setLiveScrollSpeed(v => LIVE_SCROLL_STEPS[Math.min(LIVE_SCROLL_STEPS.length - 1, LIVE_SCROLL_STEPS.indexOf(v) + 1)])}
              className={`w-8 h-8 rounded-lg font-bold ${liveBtnMuted} disabled:opacity-40`}
              title="Faster"
              aria-label="Faster auto-scroll"
              disabled={LIVE_SCROLL_STEPS.indexOf(liveScrollSpeed) >= LIVE_SCROLL_STEPS.length - 1}
            >
              +
            </button>
          </div>
        </div>

        {/* Bhajan Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
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
            {currentBhajan.notes && (
              <button
                onClick={() => setNotesOpen(v => !v)}
                aria-expanded={notesOpen}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${notesOpen ? 'bg-amber-400 text-amber-950' : (darkMode ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-800')}`}
                title="My notes"
                aria-label="Show my notes"
              >
                📝
              </button>
            )}
          </div>
          {currentBhajan.notes && notesOpen && (
            <div className={`border-l-4 border-amber-400/60 p-3 rounded-r-lg mb-4 -mt-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-amber-50'}`}>
              <p className={`text-base whitespace-pre-wrap ${darkMode ? 'text-amber-100' : 'text-amber-900'}`}>{currentBhajan.notes}</p>
            </div>
          )}

          <div
            data-live-lyrics
            onClick={(e) => { if (e.target.closest('button')) return; toggleLiveAutoScroll(); }}
            className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'}`}
          >
            <div className="flex justify-end mb-2">
              <span className={`text-[11px] ${liveMutedGray}`}>{liveAutoScroll ? 'Tap lyrics to pause' : 'Tap lyrics to auto-scroll'}</span>
            </div>
            <pre
              className={`whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
              style={{
                fontSize: `${liveFontSize}px`,
                fontFamily: readingSettings.fontFamily,
                lineHeight: readingSettings.lineHeight,
                textAlign: readingSettings.textAlign
              }}
            >
              <LyricsBody bhajan={currentBhajan} darkMode={darkMode} />
            </pre>
          </div>

          {/* SESSION 10 (item 2): "coming up" list below the current bhajan.
              Lets the singer see what's next and jump to any bhajan
              without swiping through arrows one by one. */}
          {totalBhajans > 1 && (
            <div className="mt-6">
              <p className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${liveMutedColor}`}>
                📜 All Bhajans in this Program
              </p>
              <div className="space-y-2">
                {selectedProgram.bhajanIds.map((bId, idx) => {
                  const b = getBhajanById(bId);
                  if (!b) return null;
                  const isCurrent = idx === liveProgramIndex;
                  const isPast = idx < liveProgramIndex;
                  return (
                    <button
                      key={bId + '-' + idx}
                      onClick={() => {
                        setLiveProgramIndex(idx);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${
                        isCurrent
                          ? (darkMode
                              ? 'bg-[#0B5A70]/25 border-teal-400/40 shadow-md'
                              : 'bg-[#0B5A70]/10 border-[#0B5A70]/40 shadow-md')
                          : (darkMode
                              ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30'
                              : 'bg-[#FFFCF8] border-[#0B5A70]/8 hover:border-[#0B5A70]/25')
                      } ${isPast ? 'opacity-60' : ''}`}
                    >
                      <div className={`text-lg font-bold min-w-[28px] text-center flex-shrink-0 ${
                        isCurrent
                          ? (darkMode ? 'text-orange-300' : 'text-[#E65100]')
                          : (darkMode ? 'text-gray-500' : 'text-[#0B5A70]/50')
                      }`}>
                        {isCurrent ? '▶' : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${liveTitleColor}`}>{b.title}</p>
                        <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {b.deity}{b.dhun ? ` · तर्ज़: ${b.dhun}` : ''}
                        </p>
                      </div>
                      {isPast && (
                        <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar (live mode) — SESSION 6: dark-mode aware */}
        <div className={`fixed bottom-0 left-0 right-0 border-t shadow-2xl z-40 ${liveHeaderBg}`}>
          {/* SESSION 74: up-next strip so the lead singer can announce
              the next bhajan without scrolling down. */}
          {nextBhajan && (
            <button
              onClick={liveNext}
              className={`w-full text-left max-w-4xl mx-auto block px-4 pt-2 pb-1 ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]'}`}
              aria-label="Go to next bhajan"
            >
              <p className="text-xs truncate">
                <span className={`font-semibold ${darkMode ? 'text-orange-300' : 'text-[#E65100]'}`}>Up next · </span>
                <span className="font-semibold">{nextBhajan.title}</span>
                {selectedProgram.singers && selectedProgram.singers[nextBhajan.id] && <span className={liveMutedGray}> · 🎤 {selectedProgram.singers[nextBhajan.id]}</span>}
                {nextBhajan.dhun && <span className={liveMutedGray}> · तर्ज़: {nextBhajan.dhun}</span>}
                {nextBhajan.scale && <span className={liveMutedGray}> · 🎵 {nextBhajan.scale}</span>}
              </p>
            </button>
          )}
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

      </div>
    );
  }

  // ==============================================
  // MAIN APP (Authenticated OR Guest)
  // ==============================================
  if ((user && userProfile) || guestMode) {
    const currentStep = ONBOARDING_STEPS[onboardingStep];

    // SESSION 26: dedicated splash while a deep link is being
    // resolved. Prevents users from seeing an empty/skeleton
    // home page and thinking the link is broken, which was the
    // most common reason WhatsApp-shared bhajans "didn't work
    // the first time."
    //
    // We render this INSIDE the main-app gate (so guestMode
    // still works) but BEFORE all the normal content. Auto-
    // dismisses when deepLinkResolving flips false (in the
    // resolver effect, on success OR failure).
    if (deepLinkResolving) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-6 ${darkMode ? 'bg-[#0f1a1c] text-gray-100' : 'bg-[#FFF8F0]'}`}>
          {toastJsx}{printJsx}
          <div className="max-w-sm w-full text-center">
            <SankirtanWordmark className="h-14 mb-6 justify-center" />
            <div className={`inline-block w-10 h-10 border-3 rounded-full animate-spin mb-4 ${darkMode ? 'border-[#0B5A70]/30 border-t-[#E65100]' : 'border-[#0B5A70]/20 border-t-[#E65100]'}`}
                 style={{ borderWidth: '3px' }} />
            <p className={`text-base font-semibold mb-1 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
              भजन लोड हो रहा है…
            </p>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Opening your bhajan…
            </p>
            {/* Escape hatch: if the resolve takes too long the
                user shouldn't be trapped on the splash. Shown after
                6 seconds via deepLinkStuck (see effect below). */}
            {deepLinkStuck && (
              <button
                onClick={() => {
                  setPendingDeepLinkId(null);
                  setDeepLinkResolving(false);
                }}
                className={`text-sm font-semibold px-4 py-2 rounded-xl ${darkMode ? 'bg-[#E65100]/20 text-orange-300 hover:bg-[#E65100]/30' : 'bg-[#E65100]/10 text-[#E65100] hover:bg-[#E65100]/20'}`}
              >
                Skip → Browse Library
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#0f1a1c] text-gray-100' : 'bg-[#FFF8F0]'}`}>
        {confirmDialogJsx}
        {toastJsx}{printJsx}

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

                {/* SESSION 29: on the final onboarding step, offer
                    a share button. Moment of highest enthusiasm —
                    user just learned what the app does. Skippable
                    by just tapping the primary CTA. */}
                {onboardingStep === ONBOARDING_STEPS.length - 1 && (
                  <button
                    onClick={handleShareApp}
                    className="w-full mb-3 bg-[#E65100]/10 hover:bg-[#E65100]/20 text-[#E65100] font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    Share with a bhakt in your community
                  </button>
                )}

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
        {/* SESSION 30: "App Updated!" modal removed — content was
            hardcoded and stale for 25+ deploys. Silent PWA updates
            are the modern norm. */}

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


        {/* SESSION 38: ADD-TO PROGRAM/PLAYLIST/PARODY PICKER */}
        {addToProgramFor && (
          <div
            onClick={() => setAddToProgramFor(null)}
            className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`rounded-t-3xl sm:rounded-3xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-[#FFFCF8]'}`}
            >
              {/* Header */}
              <div className={`p-5 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]'} text-white flex items-start justify-between gap-3 flex-shrink-0`}>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">📋 Add to…</h3>
                  <p className="text-sm opacity-90 truncate mt-0.5">{addToProgramFor.title}</p>
                </div>
                <button
                  onClick={() => setAddToProgramFor(null)}
                  className="text-white/80 hover:text-white text-2xl leading-none flex-shrink-0 -mr-1 -mt-1 px-2 py-1"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 p-4">
                {(() => {
                  // SESSION 55: refined empty state — differentiates
                  // "no lists yet" from "only past programs left".
                  const todayKey = getTodayKey();
                  const hasAny = programs.length > 0;
                  const hasCurrent = programs.some(pp => {
                    const t = getProgramType(pp);
                    if (t !== 'program') return true;
                    const d = (pp.date && String(pp.date).trim()) || '';
                    return !d || d >= todayKey;
                  });
                  if (!hasAny) {
                    return (
                      <div className="text-center py-10">
                        <div className="text-5xl mb-3">🎵</div>
                        <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                          No playlists, programs, or medleys yet
                        </p>
                        <p className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Create one first, then come back to add this bhajan.
                        </p>
                        <button
                          onClick={() => {
                            setAddToProgramFor(null);
                            setCurrentView('programs');
                          }}
                          className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-5 py-2 rounded-xl text-sm"
                        >
                          Go to Playlists →
                        </button>
                      </div>
                    );
                  }
                  if (!hasCurrent) {
                    return (
                      <div className="text-center py-10">
                        <div className="text-5xl mb-3">📅</div>
                        <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                          No upcoming programs
                        </p>
                        <p className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Past programs are hidden here. Create a new program or add this bhajan to a playlist / medley instead.
                        </p>
                        <button
                          onClick={() => {
                            setAddToProgramFor(null);
                            setCurrentView('programs');
                          }}
                          className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-5 py-2 rounded-xl text-sm"
                        >
                          Go to Playlists →
                        </button>
                      </div>
                    );
                  }
                  return (
                  <div className="space-y-2">
                    {(() => {
                      // Group by type (parody, playlist, program) —
                      // parody at top since it's the newest concept
                      // and often what users add short bhajans to.
                      // SESSION 55: filter out PAST programs (dated
                      // events that already happened). Playlists and
                      // medleys are ongoing collections — no date, no
                      // filter. A program with a missing/blank date
                      // is kept (safer than silently hiding it).
                      const todayKey = getTodayKey();
                      const byType = { parody: [], playlist: [], program: [] };
                      for (const p of programs) {
                        const t = getProgramType(p);
                        if (t === 'program') {
                          const d = (p.date && String(p.date).trim()) || '';
                          if (d && d < todayKey) continue; // skip past
                        }
                        byType[t] = byType[t] || [];
                        byType[t].push(p);
                      }
                      // Sort each group alphabetically by name
                      for (const key of Object.keys(byType)) {
                        byType[key].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                      }
                      const sections = [
                        { key: 'parody', label: '🎭 Medleys', items: byType.parody },
                        { key: 'playlist', label: '🎵 Playlists', items: byType.playlist },
                        { key: 'program', label: '📅 Programs', items: byType.program },
                      ].filter(s => s.items.length > 0);

                      return sections.map(section => (
                        <div key={section.key} className="mb-4 last:mb-0">
                          <p className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/60'}`}>
                            {section.label}
                          </p>
                          <div className="space-y-1.5">
                            {section.items.map(program => {
                              const alreadyIn = Array.isArray(program.bhajanIds) && program.bhajanIds.includes(addToProgramFor.id);
                              const saving = addToProgramSaving.has(program.id);
                              return (
                                <button
                                  key={program.id}
                                  onClick={() => {
                                    if (alreadyIn || saving) return;
                                    addBhajanToProgram(program, addToProgramFor);
                                  }}
                                  disabled={alreadyIn || saving}
                                  className={`w-full rounded-xl p-3 border transition-all text-left flex items-center gap-3 ${
                                    alreadyIn
                                      ? (darkMode ? 'bg-[#0B5A70]/10 border-[#0B5A70]/20 opacity-70' : 'bg-[#0B5A70]/5 border-[#0B5A70]/12 opacity-70')
                                      : (darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/15 hover:border-[#0B5A70]/40' : 'bg-white border-[#0B5A70]/10 hover:border-[#0B5A70]/30 hover:shadow-sm')
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                                      {program.name}
                                    </p>
                                    <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {program.bhajanCount || 0} bhajans
                                      {program.purpose ? ` · ${program.purpose}` : ''}
                                      {program.date ? ` · ${program.date}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {saving ? (
                                      <div className="w-5 h-5 border-2 border-[#0B5A70]/30 border-t-[#0B5A70] rounded-full animate-spin"></div>
                                    ) : alreadyIn ? (
                                      <span className={`text-xs font-semibold ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>
                                        ✓ Added
                                      </span>
                                    ) : (
                                      <span className={`text-xl font-bold ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>
                                        +
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className={`p-3 border-t flex-shrink-0 ${darkMode ? 'border-[#0B5A70]/20 bg-[#1e2e33]/50' : 'border-[#0B5A70]/10 bg-[#FFFCF8]'}`}>
                <button
                  onClick={() => setAddToProgramFor(null)}
                  className={`w-full font-semibold py-2.5 rounded-xl text-sm ${darkMode ? 'bg-[#0B5A70]/20 hover:bg-[#0B5A70]/30 text-teal-200' : 'bg-[#0B5A70]/10 hover:bg-[#0B5A70]/15 text-[#0B5A70]'}`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SESSION 40: UPDATE-AVAILABLE BANNER
            Non-blocking. Sits above the bottom nav (bottom-20).
            Shows only when a new deploy was detected by the
            version-check effect AND user hasn't dismissed it
            this session. Refresh button reloads the page,
            which pulls the new bundle. */}
        {updateAvailable && !updateBannerDismissed && (
          <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50">
            <div className={`rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] border p-4 flex items-center gap-3 ${darkMode ? 'bg-[#1e2e33] border-[#E65100]/30 text-gray-100' : 'bg-[#FFFCF8] border-[#E65100]/30'}`}>
              <div className="text-2xl flex-shrink-0" aria-hidden="true">✨</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                  New version available
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Refresh to get the latest features
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#E65100] hover:bg-[#d64800] text-white text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0"
              >
                Refresh
              </button>
              <button
                onClick={() => setUpdateBannerDismissed(true)}
                className={`text-xl leading-none px-1 flex-shrink-0 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Dismiss"
                title="Dismiss (banner will return on next update)"
              >
                ×
              </button>
            </div>
          </div>
        )}


        {/* SESSION 49: filter sheet modal. Renders outside every view so
            it can overlay Public Library or My Library depending on
            filterSheetView. */}
        {filterSheetView && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setFilterSheetView(null)}
            />
            <div className={`fixed left-1/2 -translate-x-1/2 bottom-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2 w-[92%] max-w-md rounded-2xl shadow-2xl z-50 p-6 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/25' : 'bg-[#FFFCF8] border border-[#0B5A70]/15'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>Filter bhajans</h3>
                <button
                  onClick={() => setFilterSheetView(null)}
                  className={`p-1 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-[#1e2e33]' : 'text-gray-500 hover:bg-[#0B5A70]/5'}`}
                  aria-label="Close filters"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {(() => {
                const isPublic = filterSheetView === 'public';
                const dVal = isPublic ? publicFilterDeity : filterDeity;
                const cVal = isPublic ? publicFilterCategory : filterCategory;
                const kVal = isPublic ? publicFilterKeyword : libraryFilterKeyword;
                const setD = isPublic ? setPublicFilterDeity : setFilterDeity;
                const setC = isPublic ? setPublicFilterCategory : setFilterCategory;
                const setK = isPublic ? setPublicFilterKeyword : setLibraryFilterKeyword;
                const inputCls = `w-full px-3 py-2.5 border rounded-xl outline-none text-sm ${darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/25 text-gray-100 focus:border-[#0B5A70]/50' : 'bg-white border-[#0B5A70]/20 focus:border-[#0B5A70]/50'}`;
                const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]/70'}`;
                return (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Deity</label>
                        <select value={dVal} onChange={(e) => setD(e.target.value)} className={inputCls}>
                          <option value="">All deities</option>
                          {allDeityOptions.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Type</label>
                        <select value={cVal} onChange={(e) => setC(e.target.value)} className={inputCls}>
                          <option value="">All types</option>
                          {allCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Mood</label>
                        <select value={kVal} onChange={(e) => setK(e.target.value)} className={inputCls}>
                          <option value="">All moods</option>
                          {allKeywordOptions.map(k => <option key={k} value={k}>#{k}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={() => { setD(''); setC(''); setK(''); }}
                        className={`text-sm font-semibold ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-[#0B5A70]/60 hover:text-[#0B5A70]'}`}
                      >
                        Clear all
                      </button>
                      <button
                        onClick={() => setFilterSheetView(null)}
                        className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-5 py-2 rounded-xl text-sm"
                      >
                        Done
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </>
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
                      Install App
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
        <header className={`sticky top-0 z-40 border-b ${darkMode ? 'bg-[#0f1a1c] border-[#0B5A70]/15' : 'bg-[#FFF8F0] border-[#0B5A70]/10'}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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
              {/* SESSION 49: single avatar button collapses avatar, name,
                  admin badge, dark-mode toggle, guide link and sign-out
                  into one dropdown menu — header goes from 5 controls
                  to 1. Sign-out now goes through a confirm dialog. */}
              <div className="relative">
                <button
                  onClick={() => setShowAccountMenu(v => !v)}
                  className={`flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors ${darkMode ? 'hover:bg-[#1e2e33]' : 'hover:bg-[#0B5A70]/5'}`}
                  aria-label="Account menu"
                  aria-expanded={showAccountMenu}
                >
                  {userProfile && userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.displayName || 'You'}
                      className="w-8 h-8 rounded-full border-2 border-[#0B5A70]/30"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/30 text-amber-100' : 'bg-[#0B5A70]/10 border-[#0B5A70]/30 text-[#0B5A70]'}`}>
                      {(userProfile && (userProfile.displayName || '').charAt(0).toUpperCase()) || (user && user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                    </div>
                  )}
                  <svg className={`w-4 h-4 transition-transform ${showAccountMenu ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAccountMenu && (
                  <>
                    {/* click-outside catcher */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                    <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-lg border z-50 overflow-hidden ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25' : 'bg-white border-[#0B5A70]/12'}`}>
                      {userProfile && (
                        <div className={`px-4 py-3 border-b ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                          <p className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                            {userProfile.displayName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isAdmin && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                👑 Admin
                              </span>
                            )}
                            {userProfile.verified && (
                              <span className={`text-xs ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]/60'}`}>✓ Verified</span>
                            )}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => { setDarkMode(!darkMode); setShowAccountMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-[#1e2e33] text-gray-200' : 'hover:bg-[#0B5A70]/5 text-[#0B5A70]'}`}
                      >
                        {darkMode ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                        <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
                      </button>
                      <a
                        href="/guide.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowAccountMenu(false)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-[#1e2e33] text-gray-200' : 'hover:bg-[#0B5A70]/5 text-[#0B5A70]'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Singer's Guide</span>
                      </a>
                      {/* SESSION 81: build number, so stale installs are easy to spot */}
                      <button
                        onClick={() => window.location.reload()}
                        className={`w-full text-left px-4 py-2 text-[11px] flex items-center justify-between ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                        title="Tap to reload the app"
                      >
                        <span>Version {APP_VERSION.replace(/^2026\./, '')}</span>
                        <span>Reload ↻</span>
                      </button>
                      {user && (
                        <button
                          onClick={() => {
                            setShowAccountMenu(false);
                            askConfirm({
                              title: 'Sign out?',
                              message: 'You can sign back in anytime with the same Google account.',
                              confirmLabel: 'Sign out',
                              danger: false
                            }, handleLogout);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 border-t transition-colors ${darkMode ? 'border-[#0B5A70]/15 hover:bg-[#1e2e33] text-red-300' : 'border-[#0B5A70]/8 hover:bg-red-50 text-red-600'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          <span>Sign out</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content — pb-24 when tab bar is visible so content
            never hides behind the fixed bottom bar */}
        <main className={`max-w-4xl mx-auto px-4 py-6 ${showTabBar ? 'pb-28' : ''}`}>

          {/* ==============================================
              MY LIBRARY VIEW
              ============================================== */}
          {currentView === 'library' && (() => {
            // SESSION 111: Library page rework — search first, one filter
            // row, explicit sort, A–Z rail, Continue strip, FAB for adding.
            const anyFilter = !!(searchQuery || filterDeity || filterCategory || libraryFilterKeyword || libraryStarredOnly || unreviewedOnly);
            const clearAll = () => { setSearchQuery(''); setFilterDeity(''); setFilterCategory(''); setLibraryFilterKeyword(''); setLibraryStarredOnly(false); setUnreviewedOnly(false); };
            const chipBase = 'px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition-all flex items-center gap-1';
            const chipOn = 'bg-[#0B5A70] text-white border-[#0B5A70] shadow-sm';
            const chipOff = darkMode ? 'bg-transparent text-teal-200 border-[#0B5A70]/40' : 'bg-white text-[#0B5A70] border-[#0B5A70]/25';
            const sortLabel = { az: 'A–Z', recent: 'Recently opened', sung: 'Most sung', added: 'Recently added' }[librarySort] || 'A–Z';
            const continueItems = !anyFilter ? recentlyRead.map(r => getBhajanById(r.id)).filter(Boolean).slice(0, 5) : [];
            const sheetWrap = (title, body) => (
              <div onClick={() => setLibrarySheet(null)} className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
                <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[75vh] flex flex-col overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-white text-gray-900'}`}>
                  <div className={`px-5 py-3 flex items-center justify-between border-b ${darkMode ? 'border-[#0B5A70]/25' : 'border-[#0B5A70]/10'}`}>
                    <h3 className="font-bold text-[#0B5A70]">{title}</h3>
                    <button onClick={() => setLibrarySheet(null)} className="text-2xl leading-none px-2 opacity-70" aria-label="Close">×</button>
                  </div>
                  <div className="overflow-y-auto p-3">{body}</div>
                </div>
              </div>
            );
            const optionRow = (label, selected, onPick, count) => (
              <button key={label} onClick={() => { onPick(); setLibrarySheet(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center justify-between ${selected ? 'bg-[#0B5A70] text-white font-semibold' : (darkMode ? 'hover:bg-[#0B5A70]/20' : 'hover:bg-[#0B5A70]/8')}`}>
                <span>{label}</span>
                {count != null && <span className={`text-xs ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>}
              </button>
            );
            return (
            <>
              {/* Search — first thing on the page, sticky under the header */}
              <div className={`sticky top-[64px] sm:top-[72px] z-30 -mx-4 px-4 pt-1 pb-2 ${darkMode ? 'bg-[#0f1a1c]' : 'bg-[#FFF8F0]'}`}>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/50'}`}>
                    <IconSearch size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocus('library')}
                    onBlur={() => setTimeout(() => setSearchFocus(f => (f === 'library' ? null : f)), 150)}
                    placeholder={`Search ${bhajans.length} bhajan${bhajans.length === 1 ? '' : 's'}…`}
                    aria-label="Search my library"
                    className={`w-full pl-10 pr-24 py-3 border rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-[#162226] border-[#0B5A70]/15 text-gray-100 focus:ring-[#0B5A70]/20 focus:border-[#0B5A70]/30'
                        : 'bg-white border-[#0B5A70]/12 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30'
                    }`}
                  />
                  {searchFocus === 'library' && searchQuery.trim().length >= 2 && (() => {
                    const sug = titleSuggestions(bhajans, searchQuery);
                    if (sug.length === 0) return null;
                    return (
                      <div
                        onPointerDown={(e) => e.preventDefault()}
                        className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg z-30 overflow-hidden ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25' : 'bg-white border-[#0B5A70]/15'}`}
                      >
                        {sug.map(b => (
                          <button
                            key={b.id}
                            onClick={() => { setSearchFocus(null); openBhajanDetail(b); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-100' : 'hover:bg-[#0B5A70]/8 text-gray-900'}`}
                          >
                            <span className="truncate flex-1">{b.title}</span>
                            <span className="text-[11px] flex-shrink-0 text-gray-500">{b.deity}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  {searchQuery ? (
                    <button onClick={() => setSearchQuery('')} className="absolute right-11 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800" aria-label="Clear search">✕</button>
                  ) : (
                    <button
                      onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                      className={`absolute right-11 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        speechLang === 'hi-IN' ? 'bg-[#0B5A70] text-white border-[#0B5A70]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20'
                      }`}
                      title={`Voice search language: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'} — tap to switch`}
                      aria-label={`Voice input language: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}. Tap to switch.`}
                    >
                      {speechLang === 'hi-IN' ? 'हिं' : 'EN'}
                    </button>
                  )}
                  <button
                    onClick={() => startVoiceSearch('library')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : darkMode ? 'text-[#0B5A70]/60 hover:text-[#0B5A70]/80 hover:bg-[#1e2e33]' : 'text-[#0B5A70]/60 hover:text-[#0B5A70] hover:bg-[#0B5A70]/5'
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

              {/* SESSION 118: two calm rows — dropdown chips, then mood chips with More pinned right */}
              {(() => {
                const QUICK_MOOD = ['marwari', 'bhawna', 'dance', 'melody'];
                const moodOther = libraryFilterKeyword && !QUICK_MOOD.includes(libraryFilterKeyword);
                const scrollRow = (children) => (
                  <div className="flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none'}}>
                    <div className="flex flex-nowrap gap-2 items-center">{children}</div>
                  </div>
                );
                return (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {scrollRow(<>
                        <button onClick={() => setLibraryStarredOnly(v => !v)} aria-pressed={libraryStarredOnly} className={`${chipBase} ${libraryStarredOnly ? 'bg-[#E65100] text-white border-[#E65100] shadow-sm' : (darkMode ? 'bg-transparent text-orange-200 border-[#E65100]/40' : 'bg-white text-[#E65100] border-[#E65100]/30')}`}>⭐ Starred</button>
                        <button onClick={() => setLibrarySheet('deity')} className={`${chipBase} ${filterDeity ? chipOn : chipOff}`}>{filterDeity || 'Deity'} <span className="opacity-70 text-[10px]">▼</span></button>
                        <button onClick={() => setLibrarySheet('type')} className={`${chipBase} ${filterCategory ? chipOn : chipOff}`}>{filterCategory || 'Type'} <span className="opacity-70 text-[10px]">▼</span></button>
                        <button onClick={() => setLibrarySheet('sort')} className={`${chipBase} ${chipOff}`} title="Sort & view">⇅ {sortLabel}</button>
                        {isAdmin && (
                          <button onClick={() => setUnreviewedOnly(v => !v)} aria-pressed={unreviewedOnly} className={`${chipBase} ${unreviewedOnly ? 'bg-purple-700 text-white border-purple-700 shadow-sm' : (darkMode ? 'bg-transparent text-purple-200 border-purple-400/40' : 'bg-white text-purple-700 border-purple-300')}`} title="Admin: show only bhajans not yet reviewed">
                            ⚠ {publicBhajans.filter(b => b.reviewStatus !== 'reviewed').length}
                          </button>
                        )}
                      </>)}
                    </div>
                    <div className="flex items-center gap-2">
                      {scrollRow(<>
                        {QUICK_MOOD.map(v => (
                          <button key={v} onClick={() => setLibraryFilterKeyword(libraryFilterKeyword === v ? '' : v)} aria-pressed={libraryFilterKeyword === v} className={`${chipBase} ${libraryFilterKeyword === v ? chipOn : chipOff}`}>#{v}</button>
                        ))}
                      </>)}
                      <button onClick={() => setLibrarySheet('mood')} className={`${chipBase} ${moodOther ? chipOn : chipOff}`} title="More moods">
                        {moodOther ? `#${libraryFilterKeyword}` : 'More'} <span className="opacity-70 text-[10px]">▼</span>
                      </button>
                    </div>
                    {anyFilter && (
                      <div className="flex justify-end">
                        <button onClick={clearAll} className="text-xs font-semibold text-red-600 hover:text-red-800">✕ Clear filters</button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Continue strip — last opened bhajans, one tap back */}
              {continueItems.length > 0 && (
                <div className="mt-3 mb-3 -mx-4 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none'}}>
                  <div className="flex flex-nowrap gap-2 items-center">
                    <span className={`text-[11px] font-semibold flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/60'}`}>Continue</span>
                    {continueItems.map(b => (
                      <button key={b.id} onClick={() => openBhajanDetail(b)} className={`flex-shrink-0 max-w-[12rem] truncate px-3 py-1.5 rounded-full text-xs border ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25 text-teal-100' : 'bg-[#FFFCF8] border-[#0B5A70]/15 text-[#0B5A70]'}`}>
                        {(b.title || '').split(' / ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {continueItems.length === 0 && <div className="mt-3" />}

              {/* Bhajans List */}
              {bhajansLoading ? (
                <div className={compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {[...Array(6)].map((_, i) => (
                    compactView ? (
                      <div key={i} className={`rounded-xl p-3 border flex items-center gap-3 animate-pulse ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15' : 'bg-[#FFFCF8] border-[#0B5A70]/8'}`}>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className={`h-3 rounded w-3/4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                          <div className={`h-2 rounded w-1/2 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}></div>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-5 border animate-pulse ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15' : 'bg-[#FFFCF8] border-[#0B5A70]/8'}`}>
                        <div className={`h-5 rounded w-3/4 mb-3 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/8'}`}></div>
                        <div className="space-y-2">
                          <div className={`h-3 rounded ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
                          <div className={`h-3 rounded w-5/6 ${darkMode ? 'bg-[#1e2e33]' : 'bg-gray-100'}`}></div>
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
                      <button onClick={openAddBhajan} className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2">
                        <span className="text-lg">+</span> Add Your First Bhajan
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-[#0B5A70] font-semibold">No bhajans match</p>
                      <button onClick={clearAll} className="text-sm text-[#E65100] font-semibold mt-2 underline">Clear filters</button>
                      {(() => {
                        const dym = didYouMean(bhajans, searchQuery);
                        if (dym.length === 0) return null;
                        return (
                          <div className="mt-3 flex flex-wrap justify-center gap-2 items-center">
                            <span className="text-sm text-gray-600">Did you mean</span>
                            {dym.map(b => (
                              <button key={b.id} onClick={() => setSearchQuery((b.title || '').split(' / ')[0])} className="px-3 py-1 rounded-full text-sm font-semibold bg-[#E65100]/10 text-[#E65100]">
                                {(b.title || '').split(' / ')[0]}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              ) : (
                <>
                <div className={`${compactView ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'} `}>
                  {filteredBhajans.slice(0, libraryVisibleCount).map((bhajan, cardIndex) => (
                    <div key={bhajan.id}>
                      <MyBhajanCard
                        bhajan={bhajan}
                        darkMode={darkMode}
                        compactView={compactView}
                        cardIndex={cardIndex}
                        onOpen={openBhajanDetail}
                        onRemove={deleteBhajan}
                        onStar={toggleStarred}
                        onAddTo={(b) => setAddToProgramFor(b)}
                        onMenu={(b) => setLibraryRowMenu(b)}
                        unreviewed={isAdmin && !compactView && !isReviewed(bhajan)}
                      />
                    </div>
                  ))}
                </div>

                {libraryVisibleCount < filteredBhajans.length && (
                  <div ref={libraryLoadMoreRef} className="text-center py-6">
                    <div className="inline-flex items-center gap-2 text-xs text-[#0B5A70]/60">
                      <div className="w-4 h-4 border-2 border-[#0B5A70]/40 border-t-transparent rounded-full animate-spin"></div>
                      Loading more bhajans...
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Showing {libraryVisibleCount} of {filteredBhajans.length}</p>
                    <button onClick={() => setLibraryVisibleCount(prev => prev + PAGE_SIZE * 3)} className={`mt-2 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${darkMode ? 'bg-[#0B5A70]/20 text-teal-300 hover:bg-[#0B5A70]/30' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}>
                      ↻ Load more
                    </button>
                  </div>
                )}
                {libraryVisibleCount >= filteredBhajans.length && filteredBhajans.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-gray-400 py-6">✨ You've seen all {filteredBhajans.length} bhajans</p>
                )}
                </>
              )}

              {/* Floating + button */}
              <div className="fixed right-4 bottom-24 z-40 flex flex-col items-end gap-2">
                {libraryFabOpen && (
                  <>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setLibraryFabOpen(false)} />
                    {canContribute && (
                      <button onClick={() => { setLibraryFabOpen(false); openAddPublicBhajan(); }} className="bg-purple-700 text-white font-semibold px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2">🌐 Public bhajan</button>
                    )}
                    <button onClick={() => { setLibraryFabOpen(false); openCreateParody(); }} className="bg-[#E65100] text-white font-semibold px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2">🎭 Medley</button>
                    <button onClick={() => { setLibraryFabOpen(false); openAddBhajan(); }} className="bg-[#0B5A70] text-white font-semibold px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2">🎵 Bhajan</button>
                  </>
                )}
                <button onClick={() => setLibraryFabOpen(v => !v)} aria-expanded={libraryFabOpen} aria-label="Add" className={`w-14 h-14 rounded-full shadow-xl text-white text-3xl leading-none flex items-center justify-center transition-transform ${libraryFabOpen ? 'bg-gray-700 rotate-45' : 'bg-[#0B5A70]'}`}>+</button>
              </div>

              {/* Filter / sort sheets */}
              {librarySheet === 'deity' && sheetWrap('Deity', <>
                {optionRow('All deities', !filterDeity, () => setFilterDeity(''), bhajans.length)}
                {allDeityOptions.map(d => optionRow(d.value, filterDeity === d.value, () => setFilterDeity(d.value), myDeityCounts[d.value] || 0))}
              </>)}
              {librarySheet === 'type' && sheetWrap('Type', <>
                {optionRow('All types', !filterCategory, () => setFilterCategory(''), bhajans.length)}
                {allCategoryOptions.map(c => optionRow(c, filterCategory === c, () => setFilterCategory(c), myCategoryCounts[c] || 0))}
              </>)}
              {librarySheet === 'mood' && sheetWrap('Mood', <>
                {optionRow('Any mood', !libraryFilterKeyword, () => setLibraryFilterKeyword(''))}
                {allKeywordOptions.map(kw => optionRow('#' + kw, libraryFilterKeyword === kw, () => setLibraryFilterKeyword(kw), bhajans.filter(b => (b.keywords || []).includes(kw)).length))}
              </>)}
              {librarySheet === 'sort' && sheetWrap('Sort & view', <>
                <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sort by</p>
                {optionRow('A–Z', librarySort === 'az', () => setLibrarySort('az'))}
                {optionRow('Recently opened', librarySort === 'recent', () => setLibrarySort('recent'))}
                {optionRow('Most sung', librarySort === 'sung', () => setLibrarySort('sung'))}
                {optionRow('Recently added', librarySort === 'added', () => setLibrarySort('added'))}
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">View</p>
                {optionRow('☰ Compact list', compactView, () => setCompactView(true))}
                {optionRow('▤ Full cards', !compactView, () => setCompactView(false))}
              </>)}

              {/* Long-press quick menu */}
              {libraryRowMenu && (
                <div onClick={() => setLibraryRowMenu(null)} className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
                  <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden ${darkMode ? 'bg-[#162226] text-gray-100' : 'bg-white text-gray-900'}`}>
                    <div className={`px-5 py-3 border-b ${darkMode ? 'border-[#0B5A70]/25' : 'border-[#0B5A70]/10'}`}>
                      <p className="font-bold text-[#0B5A70] truncate">{libraryRowMenu.title}</p>
                    </div>
                    <div className="p-2">
                      {[
                        [libraryRowMenu.starred ? '⭐ Unstar' : '⭐ Star', () => toggleStarred(libraryRowMenu)],
                        ['📋 Add to playlist / program', () => setAddToProgramFor(libraryRowMenu)],
                        ['🔗 Share', () => handleShareBhajan(libraryRowMenu)],
                        ['✏️ Edit', () => openEditBhajan(libraryRowMenu)],
                        ...(libraryRowMenu.virtual ? [] : [[libraryRowMenu.savedFromPublicId ? '🗑 Remove from library' : '🗑 Delete', () => deleteBhajan(libraryRowMenu)]])
                      ].map(([label, fn]) => (
                        <button key={label} onClick={() => { setLibraryRowMenu(null); fn(); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${darkMode ? 'hover:bg-[#0B5A70]/20' : 'hover:bg-[#0B5A70]/8'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
            );
          })()}

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
                  onClick={() => {
                    // SESSION 38: if we came from a program/playlist/
                    // parody, go back there. Previously always went to
                    // 'library' which felt broken when reading through
                    // a parody's mukhda-tap → full lyrics flow.
                    if (programContext) {
                      setSelectedProgram(programContext);
                      setCurrentView('program-detail');
                      return;
                    }
                    if (guestMode && !user) {
                      setGuestMode(false);
                    } else {
                      setCurrentView('library');
                    }
                  }}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  ← {programContext
                    ? `Back to ${(() => {
                        const t = getProgramType(programContext);
                        return t === 'parody' ? 'Medley' : t === 'playlist' ? 'Playlist' : 'Program';
                      })()}`
                    : 'Back'}
                </button>
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <button
                      onClick={() => toggleReviewed(selectedBhajan)}
                      className={`h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${isReviewed(selectedBhajan) ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                      title={isReviewed(selectedBhajan) ? 'Reviewed — tap to mark as needs review' : 'Mark as reviewed & finalised'}
                      aria-pressed={isReviewed(selectedBhajan)}
                    >
                      {isReviewed(selectedBhajan) ? '✓ Reviewed' : 'Review ✓'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleStarred(selectedBhajan)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${selectedBhajan.starred ? 'bg-[#E65100]/15 text-[#E65100]' : (darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15')}`}
                    aria-label={selectedBhajan.starred ? 'Unstar' : 'Star'}
                    aria-pressed={!!selectedBhajan.starred}
                    title={selectedBhajan.starred ? 'Remove from Starred' : 'Add to Starred'}
                  >
<IconStar size={18} filled={!!selectedBhajan.starred} />
                  </button>
                  <button
                    onClick={() => handleShareBhajan(selectedBhajan)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Share this bhajan"
                    aria-label="Share this bhajan"
                  >
<IconShare size={16} />
                  </button>
                  {/* SESSION 38: Add-to picker — surface the bhajan
                      into any playlist/program/parody without
                      leaving the reading view. Only shown for
                      logged-in users (guests have no programs). */}
                  {user && (
                    <button
                      onClick={() => setAddToProgramFor(selectedBhajan)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                      title="Add to a playlist, program, or medley"
                      aria-label="Add to a playlist, program, or medley"
                    >
<IconListPlus size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => openEditBhajan(selectedBhajan)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Edit bhajan"
                    aria-label="Edit bhajan"
                  >
<IconPencil size={16} />
                  </button>
                  {/* SESSION 49: Delete moved out of the primary action row
                      into an overflow menu. Same behavior; less visual weight
                      — destructive actions shouldn't share space with routine
                      Edit/View/Add-to buttons. */}
                  {canContribute && !selectedBhajan.virtual && !publicBhajans.some(b => b.id === (selectedBhajan.savedFromPublicId || selectedBhajan.id)) && (
                    <button
                      onClick={() => publishBhajanToPublic(selectedBhajan)}
                      className="h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1 bg-purple-700 text-white hover:bg-purple-800"
                      title="Add this bhajan to the public library for all users"
                    >
                      🌐 Publish
                    </button>
                  )}
                  {canEditPublic(publicBhajans.find(b => b.id === (selectedBhajan.savedFromPublicId || selectedBhajan.id))) && (
                    <button
                      onClick={() => openEditPublicBhajan(publicBhajans.find(b => b.id === (selectedBhajan.savedFromPublicId || selectedBhajan.id)) || selectedBhajan)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                      title="Edit public bhajan"
                      aria-label="Edit public bhajan"
                    >
                      🌐
                    </button>
                  )}
                  {!selectedBhajan.virtual && <div className="relative">
                    <button
                      onClick={() => setShowDeleteMenu(showDeleteMenu === 'library' ? null : 'library')}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-lg leading-none transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                      aria-label="More options"
                      title="More options"
                    >
                      ⋯
                    </button>
                    {showDeleteMenu === 'library' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDeleteMenu(null)} />
                        <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25' : 'bg-white border-[#0B5A70]/12'}`}>
                          {isAdmin && selectedBhajan.savedFromPublicId && publicBhajans.some(b => b.id === selectedBhajan.savedFromPublicId) && (
                            <button
                              onClick={() => { setShowDeleteMenu(null); openEditPublicBhajan(publicBhajans.find(b => b.id === selectedBhajan.savedFromPublicId)); }}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors border-b ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-200 border-[#0B5A70]/20' : 'hover:bg-[#0B5A70]/8 text-gray-800 border-[#0B5A70]/10'}`}
                            >
                              🌐 <span>Edit public bhajan</span>
                            </button>
                          )}
                          <button
                            onClick={() => { setShowDeleteMenu(null); deleteBhajan(selectedBhajan); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'hover:bg-red-900/20 text-red-300' : 'hover:bg-red-50 text-red-600'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 3h6a1 1 0 011 1v3H8V4a1 1 0 011-1z" /></svg>
                            <span>{selectedBhajan.savedFromPublicId ? 'Remove from library' : 'Delete bhajan'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>}
                </div>
              </div>

              <div
                key={selectedBhajan.id}
                className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 mb-4 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'} ${slideDir === 'left' ? 'sk-slide-left' : slideDir === 'right' ? 'sk-slide-right' : ''}`}
              >
                <div className="mb-3" title={selectedBhajan.title}>
                  <BhajanTitle title={selectedBhajan.title} size="xl" darkMode={darkMode} />
                </div>

                <ListenBar
                  bhajan={selectedBhajan}
                  show={showAudioPlayer}
                  onToggle={() => setShowAudioPlayer(v => !v)}
                  darkMode={darkMode}
                  playerId="sk-audio-player"
                />

                {selectedBhajan.dhun && (
                  <div className={`border-l-4 border-[#E65100]/40 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                    <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedBhajan.dhun}
                    </p>
                  </div>
                )}

                {/* SESSION 11: Singer + Lyricist credits (blank for
                    traditional/anonymous bhajans; shown when known) */}
                {(selectedBhajan.singer || selectedBhajan.lyricist) && (
                  <div className={`text-xs mb-4 flex flex-wrap gap-x-4 gap-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedBhajan.singer && (
                      <span>
                        <span className={`font-semibold ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>गायक / Singer:</span> {selectedBhajan.singer}
                      </span>
                    )}
                    {selectedBhajan.lyricist && (
                      <span>
                        <span className={`font-semibold ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>रचनाकार / Lyricist:</span> {selectedBhajan.lyricist}
                      </span>
                    )}
                  </div>
                )}

                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {/* SESSION 84: scale is set inline — no detour via the full bhajan form */}
                  {scaleDraft !== null ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); saveBhajanScale(selectedBhajan, scaleDraft); }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span className="text-sm" aria-hidden="true">🎵</span>
                      <input
                        type="text"
                        value={scaleDraft}
                        onChange={(e) => setScaleDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setScaleDraft(null); }}
                        autoFocus
                        placeholder="e.g. C#, Raag Yaman"
                        aria-label="Scale / Raag"
                        className={`w-36 text-xs px-2.5 py-1 rounded-full border outline-none ${darkMode ? 'bg-[#162226] border-purple-400/40 text-gray-100' : 'bg-white border-purple-300 text-gray-800'}`}
                      />
                      <button type="submit" className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E65100] text-white">Save</button>
                      <button type="button" onClick={() => setScaleDraft(null)} className={`px-2 py-1 rounded-full text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cancel</button>
                    </form>
                  ) : selectedBhajan.scale ? (
                    <button
                      onClick={() => setScaleDraft(selectedBhajan.scale || '')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${darkMode ? 'bg-purple-900 text-purple-200 hover:bg-purple-800' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                      title="Tap to change scale/raag"
                    >
                      🎵 Scale: {selectedBhajan.scale}
                    </button>
                  ) : (
                    <button
                      onClick={() => setScaleDraft('')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed transition-colors ${darkMode ? 'bg-transparent text-gray-400 border-[#0B5A70]/20 hover:bg-[#1e2e33] hover:text-gray-200' : 'bg-transparent text-gray-500 border-gray-400 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-400'}`}
                      title="Add scale/raag for this bhajan"
                    >
                      + Add Scale
                    </button>
                  )}
                  {/* SESSION 78: notes chip — opens the notes panel below */}
                  <button
                    onClick={() => { setNotesOpen(v => !v); setNotesDraft(null); }}
                    aria-expanded={notesOpen}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${notesOpen ? 'bg-amber-400 text-amber-950' : selectedBhajan.notes ? (darkMode ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-800') : (darkMode ? 'bg-transparent text-gray-400 border border-dashed border-[#0B5A70]/20' : 'bg-transparent text-gray-500 border border-dashed border-gray-400')}`}
                    title={selectedBhajan.notes ? 'My notes' : 'Add my notes (sur, who sings what, tempo…)'}
                    aria-label="My notes"
                  >
                    📝{selectedBhajan.notes ? '' : ' Notes'}
                  </button>
                </div>
                {notesOpen && (
                  <div className={`rounded-xl mb-4 border ${darkMode ? 'bg-[#1e2e33]/60 border-[#0B5A70]/20' : 'bg-amber-50/60 border-amber-200/60'}`}>
                    {notesDraft === null ? (
                      <button
                        onClick={() => setNotesDraft(selectedBhajan.notes || '')}
                        className="w-full text-left px-3 py-2.5"
                        aria-label="Edit my notes"
                      >
                        {selectedBhajan.notes ? (
                          <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedBhajan.notes}</p>
                        ) : (
                          <p className={`text-sm ${darkMode ? 'text-amber-200/80' : 'text-amber-800/80'}`}>Tap to add notes — starting sur, who sings which antara, tempo…</p>
                        )}
                        <p className={`text-[11px] mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Private · tap to edit</p>
                      </button>
                    ) : (
                      <div className="p-3">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          autoFocus
                          placeholder="e.g. Start from C#, Ramesh ji sings 2nd antara, slow tempo"
                          className={`w-full text-sm p-2 rounded-lg border outline-none ${darkMode ? 'bg-[#162226] border-[#0B5A70]/30 text-gray-100' : 'bg-white border-amber-300 text-gray-800'}`}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setNotesDraft(null)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cancel</button>
                          <button onClick={() => saveBhajanNotes(selectedBhajan, notesDraft)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E65100] text-white">Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className={`border-t pt-4 ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                  <div className="flex items-center justify-end gap-1 mb-2 flex-wrap" data-live-controls>
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
                    <span className={`mx-1 h-5 w-px ${darkMode ? 'bg-white/15' : 'bg-[#0B5A70]/15'}`} aria-hidden="true" />
                    <button
                      onClick={toggleLiveAutoScroll}
                      className={`w-8 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${liveAutoScroll ? 'bg-[#E65100] text-white' : (darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12')}`}
                      title={liveAutoScroll ? 'Pause auto-scroll' : 'Auto-scroll lyrics'}
                      aria-label={liveAutoScroll ? 'Pause auto-scroll' : 'Start auto-scroll'}
                      aria-pressed={liveAutoScroll}
                    >
                      {liveAutoScroll ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={() => setLiveScrollSpeed(v => LIVE_SCROLL_STEPS[Math.max(0, LIVE_SCROLL_STEPS.indexOf(v) - 1)])}
                      disabled={LIVE_SCROLL_STEPS.indexOf(liveScrollSpeed) <= 0}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Slower" aria-label="Slower auto-scroll"
                    >
                      −
                    </button>
                    <span className={`text-xs w-9 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} title="Scroll speed">{liveScrollSpeed}×</span>
                    <button
                      onClick={() => setLiveScrollSpeed(v => LIVE_SCROLL_STEPS[Math.min(LIVE_SCROLL_STEPS.length - 1, LIVE_SCROLL_STEPS.indexOf(v) + 1)])}
                      disabled={LIVE_SCROLL_STEPS.indexOf(liveScrollSpeed) >= LIVE_SCROLL_STEPS.length - 1}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Faster" aria-label="Faster auto-scroll"
                    >
                      +
                    </button>
                  </div>
                  <pre
                    onClick={toggleLiveAutoScroll}
                    data-live-lyrics
                    className={`whitespace-pre-wrap text-lg leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                    style={{
                      fontSize: `${readingSettings.fontSize}px`,
                      fontFamily: readingSettings.fontFamily,
                      lineHeight: readingSettings.lineHeight,
                      textAlign: readingSettings.textAlign
                    }}
                  >
                    <LyricsBody bhajan={selectedBhajan} darkMode={darkMode} />
                  </pre>
                </div>

                {/* SESSION 48: quiet footer — moods on the left, source on
                    the right, single hairline above. Was two stacked
                    border-t sections that read like form fields. */}
                {(selectedBhajan.keywords && selectedBhajan.keywords.length > 0) ? (
                  <div className="mt-6 pt-4 border-t border-[#0B5A70]/8 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                      {/* SESSION 52: mood chips are now tappable — apply the
                          mood as a library filter and return to the list. */}
                      {(selectedBhajan.keywords || []).map(kw => (
                        <button
                          key={kw}
                          type="button"
                          onClick={() => {
                            setLibraryFilterKeyword(kw);
                            setFilterDeity('');
                            setFilterCategory('');
                            setCurrentView('library');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          title={`Show my bhajans tagged #${kw}`}
                          aria-label={`Filter my library by #${kw}`}
                          className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${darkMode ? "bg-[#0B5A70]/25 text-teal-200 border-[#0B5A70]/40 hover:bg-[#0B5A70]/40 hover:border-teal-300" : "bg-[#0B5A70]/10 text-[#0B5A70] border-[#0B5A70]/25 hover:bg-[#0B5A70]/20 hover:border-[#0B5A70]/50"}`}
                        >
                          #{kw}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* SESSION 34: context-aware "next-tap" list below reading view.
                  If we came from a playlist/program, show OTHER bhajans in
                  that playlist/program (siblings in order, current one
                  excluded). Otherwise, keep the Session 6 Related Bhajans
                  behavior (keyword-matched from library). */}
              {(() => {
                const contextIsValid =
                  programContext &&
                  Array.isArray(programContext.bhajanIds) &&
                  selectedBhajan &&
                  programContext.bhajanIds.includes(selectedBhajan.id);

                if (contextIsValid) {
                  const siblings = programContext.bhajanIds
                    .filter(id => id !== selectedBhajan.id)
                    .map(id => getBhajanById(id))
                    .filter(Boolean);

                  if (siblings.length === 0) return null;

                  // SESSION 32/36: label + emoji match program type
                  const ctxType = getProgramType(programContext);
                  const ctxLabel = ctxType === 'parody' ? 'this medley' :
                                   ctxType === 'playlist' ? 'this playlist' :
                                   'this program';
                  const ctxEmoji = ctxType === 'parody' ? '🎭' : '🎵';

                  return (
                    <div className="mt-6">
                      <p className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${darkMode ? 'text-gray-300' : 'text-[#0B5A70]'}`}>
                        {ctxEmoji} More in {ctxLabel}
                        <span className={`text-xs font-normal ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/50'}`}>
                          · {programContext.name}
                        </span>
                      </p>
                      <div className="space-y-1.5">
                        {siblings.map(b => (
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
                              </p>
                            </div>
                            <span className={`text-lg flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/30'}`}>›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Fallback: original Related Bhajans (keyword-matched)
                if (relatedMyBhajans.length === 0) return null;
                return (
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
                );
              })()}

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
          {(currentView === 'add-bhajan' || currentView === 'edit-bhajan') && (() => {
            // SESSION 10 (item 1): dark-mode-aware form control classes.
            // Previously all inputs/selects/textareas were hardcoded to
            // cream backgrounds with dark-teal borders and inherited
            // near-black text — invisible on the dark-mode background.
            const fInput = darkMode
              ? 'w-full px-4 py-3 border border-[#0B5A70]/30 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/20 focus:border-teal-400 outline-none bg-[#1e2e33] text-amber-50 placeholder-gray-500'
              : 'w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none bg-[#FFFCF8] text-gray-900 placeholder-gray-400';
            const fSelect = darkMode
              ? 'w-full px-4 py-3 border border-[#0B5A70]/30 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/20 focus:border-teal-400 outline-none bg-[#1e2e33] text-amber-50'
              : 'w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none bg-[#FFFCF8] text-gray-900';
            const fLabel = darkMode ? 'block text-sm font-semibold text-teal-200 mb-1' : 'block text-sm font-semibold text-[#0B5A70] mb-1';
            const fCard = darkMode
              ? 'bg-[#162226] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.15)] p-6 md:p-8 border border-[#0B5A70]/15'
              : 'bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 border border-[#0B5A70]/8';
            const fTitle = darkMode ? 'text-xl font-bold text-amber-100' : 'text-xl font-bold text-[#0B5A70]';
            const isEdit = currentView === 'edit-bhajan';
            const goBack = () => setCurrentView(isEdit && selectedBhajan ? 'bhajan-detail' : 'library');
            const hint = darkMode ? 'text-gray-400' : 'text-gray-500';
            const sectionTitle = `text-[11px] font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/60'}`;
            // SESSION 96: one set of Hindi-typing props per field; suggestions
            // use the shared TransliterationChips (was three inline copies).
            const hindiProps = (field) => ({
              id: `hindi-input-${field}`,
              value: bhajanForm[field],
              onChange: (e) => handleHindiInput(e, field),
              onKeyDown: (e) => handleHindiKeyDown(e, field),
              onBlur: () => setTimeout(() => setShowSuggestions(false), 300),
              onFocus: () => setActiveTypingField(field)
            });
            const chipsFor = (field, inline) => (
              hindiTypingEnabled && showSuggestions && activeTypingField === field && transliterationSuggestions.length > 0 ? (
                <TransliterationChips
                  className={inline ? '' : 'absolute bottom-full left-0 right-0 mb-2 z-30'}
                  currentWord={currentWord}
                  suggestions={transliterationSuggestions}
                  onPick={(s) => applySuggestion(s, field)}
                  darkMode={darkMode}
                />
              ) : null
            );
            const mukhdaInfo = (() => {
              if (!bhajanForm.lyrics || !bhajanForm.lyrics.trim()) return null;
              const m = getMukhda({ lyrics: bhajanForm.lyrics });
              const n = m ? m.split('\n').length : 0;
              const hasBlank = /\n\s*\n/.test(bhajanForm.lyrics.replace(/^\s+/, ''));
              return { n, hasBlank };
            })();
            return (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={goBack} className={darkMode ? 'text-teal-200 hover:text-teal-100 text-sm' : 'text-[#0B5A70] hover:text-[#0B5A70]/80 text-sm'}>
                  ← Cancel
                </button>
                <h2 className={fTitle}>{isEdit ? 'Edit bhajan' : 'New bhajan'}</h2>
                <span className="w-14" aria-hidden="true" />
              </div>

              <div className={fCard}>
                {/* ---------- Title ---------- */}
                <div className="mb-5 relative">
                  <input
                    type="text"
                    {...hindiProps('title')}
                    className={fInput + ' text-lg font-semibold'}
                    placeholder={hindiTypingEnabled ? 'Title — type in English, space converts to Hindi' : 'Title · शीर्षक'}
                    aria-label="Title (required)"
                  />
                  {chipsFor('title')}
                </div>

                {/* ---------- Lyrics ---------- */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <label className={fLabel + ' mb-0'}>Lyrics</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHindiTypingEnabled(!hindiTypingEnabled)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${hindiTypingEnabled ? 'bg-[#0B5A70] text-white border-[#0B5A70]' : (darkMode ? 'bg-[#1e2e33] text-gray-300 border-[#0B5A70]/30' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20')}`}
                        title={`Typing language: ${hindiTypingEnabled ? 'Hindi (type in English, space converts)' : 'English'} — tap to switch`}
                        aria-label={`Typing language: ${hindiTypingEnabled ? 'Hindi' : 'English'}. Tap to switch.`}
                        aria-pressed={hindiTypingEnabled}
                      >
                        {hindiTypingEnabled ? 'हिं' : 'EN'}
                      </button>
                      <span className={`mx-0.5 h-5 w-px ${darkMode ? 'bg-white/15' : 'bg-[#0B5A70]/15'}`} aria-hidden="true" />
                      <span className={`text-[11px] font-semibold mr-0.5 ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/70'}`}>Upload</span>
                      <AttachBtn kind="camera" disabled={ocrProcessing} onClick={() => cameraInputRef.current && cameraInputRef.current.click()} title="Camera — photograph the lyrics" />
                      <AttachBtn kind="gallery" disabled={ocrProcessing} onClick={() => imageInputRef.current && imageInputRef.current.click()} title="Gallery — pick a photo of the lyrics" />
                      <AttachBtn kind="document" disabled={ocrProcessing} onClick={() => pdfInputRef.current && pdfInputRef.current.click()} title="Document — PDF of the lyrics" />
                      <AttachBtn kind="ai" disabled={ocrProcessing} onClick={() => aiInputRef.current && aiInputRef.current.click()} title="Read with AI — photo or PDF, including handwriting" />
                    </div>
                  </div>
                  <input ref={aiInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleAiRead(f); e.target.value = ''; }} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleImageFileForOcr(f, 'photo'); e.target.value = ''; }} />
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleImageFileForOcr(f, 'image'); e.target.value = ''; }} />
                  <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handlePdfFileForOcr(f); e.target.value = ''; }} />

                  {ocrProcessing && (
                    <div className={`mb-2 p-3 border rounded-lg ${darkMode ? 'bg-[#1e2e33] border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/15'}`}>
                      <div className="w-full bg-[#0B5A70]/10 rounded-full h-2 mb-2"><div className="bg-[#0B5A70] h-2 rounded-full transition-all" style={{ width: ocrProgress + '%' }} /></div>
                      <p className="text-xs font-semibold text-[#0B5A70]">{ocrMessage || 'Reading…'}</p>
                      {!localStorage.getItem('sankirtan-tesseract-langs-cached') && (
                        <p className={`text-[11px] mt-1 ${hint}`}>First use downloads the reader (~15 MB) once; later scans are quick.</p>
                      )}
                    </div>
                  )}
                  {!ocrProcessing && ocrMessage && <p className="text-xs font-semibold text-[#0B5A70] mb-2">{ocrMessage}</p>}

                  <div className="mt-4 mb-2">
                    <LyricsToolbar {...lyricsToolbarProps('bhajan')} darkMode={darkMode} />
                  </div>
                  <div className="relative">
                    {lyricsSheet !== 'bhajan' && (
                      <textarea
                        ref={lyricsTextareaRef}
                        {...hindiProps('lyrics')}
                        className={fInput + ' text-lg resize-none overflow-y-auto'}
                        placeholder={hindiTypingEnabled ? 'jai shri babosa … (space converts to Hindi)' : 'भजन के बोल यहाँ लिखें…'}
                        style={LYRICS_BOX_STYLE}
                        aria-label="Lyrics (required)"
                      />
                    )}
                    {lyricsSheet === 'bhajan' && (
                      <div className={`rounded-xl border border-dashed p-4 text-sm text-center ${darkMode ? 'border-[#0B5A70]/30 text-gray-400' : 'border-[#0B5A70]/20 text-gray-500'}`}>Editing in full screen…</div>
                    )}
                    {lyricsSheet !== 'bhajan' && <CaretChips inputId="hindi-input-lyrics">{chipsFor('lyrics', true)}</CaretChips>}
                  </div>
                  <LyricsEditorSheet
                    open={lyricsSheet === 'bhajan'}
                    onClose={() => setLyricsSheet(null)}
                    onCancel={() => cancelLyricsSheet('bhajan')}
                    darkMode={darkMode}
                    inputId="hindi-input-lyrics"
                    value={bhajanForm.lyrics}
                    onChange={(e) => handleHindiInput(e, 'lyrics')}
                    onKeyDown={(e) => handleHindiKeyDown(e, 'lyrics')}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                    onFocus={() => setActiveTypingField('lyrics')}
                    placeholder={hindiTypingEnabled ? 'jai shri babosa … (space converts to Hindi)' : 'भजन के बोल यहाँ लिखें…'}
                    toolbar={lyricsToolbarProps('bhajan')}
                    mukhdaChip={mukhdaChipText(bhajanForm.lyrics)}
                    chips={hindiTypingEnabled && showSuggestions && activeTypingField === 'lyrics' && transliterationSuggestions.length > 0 ? (
                      <TransliterationChips currentWord={currentWord} suggestions={transliterationSuggestions} onPick={(s) => applySuggestion(s, 'lyrics')} darkMode={darkMode} />
                    ) : null}
                  />
                  <p className={`mt-1.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-1 ${hint}`}>
                    <span>Blank line after the mukhda.</span>
                    {mukhdaInfo && (
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${mukhdaInfo.hasBlank ? (darkMode ? 'bg-[#0B5A70]/20 text-teal-200' : 'bg-[#0B5A70]/8 text-[#0B5A70]') : (darkMode ? 'bg-[#E65100]/20 text-orange-200' : 'bg-[#E65100]/10 text-[#E65100]')}`}>
                        {mukhdaInfo.hasBlank ? `Mukhda · ${mukhdaInfo.n} line${mukhdaInfo.n === 1 ? '' : 's'}` : 'No blank line yet'}
                      </span>
                    )}
                    {hindiTypingEnabled && <span>· <strong>shyam</strong> → श्याम on space</span>}
                  </p>
                </div>

                {/* ---------- Details ---------- */}
                <p className={sectionTitle}>Details</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <span className={`absolute left-4 top-1.5 text-[10px] font-semibold pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Deity</span>
                    <select value={bhajanForm.deity} onChange={(e) => setBhajanForm({ ...bhajanForm, deity: e.target.value })} className={fSelect + ' pt-5 pb-2'} aria-label="Deity">
                      {allDeityOptions.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <span className={`absolute left-4 top-1.5 text-[10px] font-semibold pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type</span>
                    <select value={bhajanForm.category} onChange={(e) => setBhajanForm({ ...bhajanForm, category: e.target.value })} className={fSelect + ' pt-5 pb-2'} aria-label="Type">
                      {allCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <input type="text" {...hindiProps('dhun')} className={fInput} placeholder="तर्ज़ / Tune" aria-label="तर्ज़ / Tune" />
                    {chipsFor('dhun')}
                  </div>
                  <div>
                    <input type="text" value={bhajanForm.scale} onChange={(e) => setBhajanForm({ ...bhajanForm, scale: e.target.value })} className={fInput} placeholder="Scale / Raag" aria-label="Scale / Raag" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className={fLabel}>YouTube link</label>
                  <input type="url" value={bhajanForm.source} onChange={(e) => setBhajanForm({ ...bhajanForm, source: e.target.value })} className={fInput} placeholder="https://youtube.com/…" />
                </div>

                {/* ---------- More (collapsed unless filled) ---------- */}
                <button
                  type="button"
                  onClick={() => setBhajanFormMore(v => !v)}
                  aria-expanded={bhajanFormMore}
                  className={`text-xs font-semibold mb-3 ${darkMode ? 'text-teal-200' : 'text-[#0B5A70]'}`}
                >
                  {bhajanFormMore ? '▾' : '+'} Add singer, lyricist…
                </button>
                {bhajanFormMore && (
                  <div className="mb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input type="text" value={bhajanForm.singer} onChange={(e) => setBhajanForm({ ...bhajanForm, singer: e.target.value })} className={fInput} placeholder="गायक / Singer" aria-label="Singer" />
                      </div>
                      <div className="relative">
                        <input type="text" {...hindiProps('lyricist')} className={fInput} placeholder="रचनाकार / Lyricist" aria-label="Lyricist" />
                        {chipsFor('lyricist')}
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------- Moods (collapsed) ---------- */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setBhajanFormMoods(v => !v)}
                    aria-expanded={bhajanFormMoods}
                    className={`text-xs font-semibold ${darkMode ? 'text-teal-200' : 'text-[#0B5A70]'}`}
                  >
                    {bhajanFormMoods ? '▾' : '+'} Add mood
                  </button>
                  {!bhajanFormMoods && bhajanForm.keywords.map(kw => (
                    <button key={kw} type="button" onClick={() => toggleKeyword(kw)} title="Remove" className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#0B5A70] text-white">#{kw} ×</button>
                  ))}
                </div>
                <div className={`flex flex-wrap gap-1.5 mb-6 ${bhajanFormMoods ? '' : 'hidden'}`}>
                  {allKeywordOptions.map(kw => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => toggleKeyword(kw)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        bhajanForm.keywords.includes(kw)
                          ? 'bg-[#0B5A70] text-white'
                          : (darkMode ? 'bg-[#0B5A70]/15 text-teal-300 border border-[#0B5A70]/25' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12')
                      }`}
                    >
                      #{kw}
                    </button>
                  ))}
                </div>

                {bhajanFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠️ {bhajanFormError}</div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveBhajan}
                    disabled={bhajanFormSaving || !bhajanForm.title.trim() || !bhajanForm.lyrics.trim()}
                    className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bhajanFormSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={goBack} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            </>
            );
          })()}

          {/* ==============================================
              PROGRAMS LIST VIEW
              ============================================== */}
          {currentView === 'programs' && (() => {
            // SESSION 32: split existing programs into two groups by
            // effective type (using getProgramType helper — handles
            // both explicit `type` field and legacy inference from
            // date presence). Toggle switches which group is shown.
            const playlists = filteredPrograms.filter(p => getProgramType(p) === 'playlist');
            const events = filteredPrograms.filter(p => getProgramType(p) === 'program');
            // SESSION 36: parody as third type
            const visibleItems = playlistViewMode === 'playlist' ? playlists : events;
            const isPlaylistView = playlistViewMode === 'playlist';
            const isParodyView = playlistViewMode === 'parody';

            return (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-[#0B5A70]">{isPlaylistView ? 'Playlists' : 'Programs'}</h2>
                <button
                  onClick={openCreateProgram}
                  className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">+</span> Create
                </button>
              </div>

              {/* SESSION 47: one-line explainer of the difference between
                  Playlist and Program. Small, always visible, teaches the
                  distinction so per-playlist explainers aren't needed. */}
              {/* SESSION 66: explainer only while the user is new to this
                  tab; search only once the list is long enough to need it. */}
              {programs.length < 2 && (
                <p className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/60'}`}>
                  {isPlaylistView
                    ? 'A playlist is an undated collection — daily practice, a theme, a favourite set.'
                    : 'A program is a dated event (jagran, sankirtan) with a venue, singer assignments and Live mode for performing.'}
                </p>
              )}

              {/* SESSION 87: next program hero — the most common action
                  (open tonight's program / start live) is one tap away. */}
              {!isPlaylistView && !programSearchQuery && (() => {
                const upcoming = events.filter(p => !isPastProgramDate(p.date)).sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));
                const next = upcoming[0];
                if (!next) return null;
                const n = (next.bhajanIds || []).length;
                return (
                  <div className={`rounded-2xl p-4 mb-4 border ${darkMode ? 'bg-[#162226] border-[#E65100]/30' : 'bg-[#FFFCF8] border-[#E65100]/30 shadow-[0_2px_12px_rgba(230,81,0,0.08)]'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${darkMode ? 'text-orange-300' : 'text-[#E65100]'}`}>
                      Next program · {formatProgramDate(next.date)}
                    </p>
                    <button onClick={() => openProgramDetail(next)} className="w-full text-left">
                      <h3 className={`text-lg font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>{next.name}</h3>
                      <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {n} bhajan{n === 1 ? '' : 's'}{next.venue ? ` · 📍 ${next.venue}` : ''}
                      </p>
                    </button>
                    {n > 0 && (
                      <button
                        onClick={() => startLiveProgram(next)}
                        className="w-full mt-3 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border transition-colors border-[#E65100]/50 text-[#E65100] hover:bg-[#E65100]/8"
                      >
                        🎤 Start live performance
                      </button>
                    )}
                  </div>
                );
              })()}

              {(programs.length > 5 || programSearchQuery) && (
              <div className="mb-4">
                <input
                  type="text"
                  value={programSearchQuery}
                  onChange={(e) => setProgramSearchQuery(e.target.value)}
                  placeholder={
                    isParodyView ? "🔍 Search medleys..." :
                    isPlaylistView ? "🔍 Search playlists..." :
                    "🔍 Search programs by name or venue..."
                  }
                  aria-label="Search"
                  className="w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none"
                />
              </div>
              )}

              {/* SESSION 111: medleys moved here from the Library page. */}
              {isPlaylistView && !programSearchQuery && (() => {
                const myParodies = programs.filter(p => getProgramType(p) === 'parody').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                return (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setLibraryParodiesOpen(v => !v)}
                        aria-expanded={libraryParodiesOpen}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${libraryParodiesOpen ? 'bg-[#E65100] text-white shadow-sm' : (darkMode ? 'bg-[#162226] border border-[#0B5A70]/25 text-teal-200' : 'bg-[#FFFCF8] border border-[#0B5A70]/15 text-[#0B5A70]')}`}
                      >
                        🎭 Medleys ({myParodies.length})
                        <span className="text-xs opacity-70">{libraryParodiesOpen ? '▲' : '▼'}</span>
                      </button>
                      <button onClick={openCreateParody} className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${darkMode ? 'border-[#E65100]/40 text-orange-200' : 'border-[#E65100]/30 text-[#E65100]'}`} title="A medley shows only the mukhda of each bhajan">+ Medley</button>
                    </div>
                    {libraryParodiesOpen && (myParodies.length === 0 ? (
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No medleys yet — a medley strings together the mukhda of several bhajans.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {myParodies.map(p => (
                          <button key={p.id} onClick={() => openProgramDetail(p)} className={`w-full text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${darkMode ? 'bg-[#162226] border-[#E65100]/20' : 'bg-[#FFFCF8] border-[#E65100]/20'}`}>
                            <div className="text-xl flex-shrink-0" aria-hidden="true">🎭</div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>{p.name}</p>
                              <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {p.bhajanCount || (p.bhajanIds || []).length} mukhda{(p.bhajanCount || (p.bhajanIds || []).length) === 1 ? '' : 's'}{p.purpose ? ` · ${p.purpose}` : ''}
                              </p>
                            </div>
                            <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/50'}`}>Open →</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {programsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#0B5A70]/40 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-[#0B5A70]/70">Loading...</p>
                </div>
              ) : visibleItems.length === 0 ? (
                (() => {
                  // SESSION 36: derive labels once for the empty state
                  const emoji = isParodyView ? '🎭' : (isPlaylistView ? '🎵' : '📅');
                  const Noun = isParodyView ? 'Medley' : (isPlaylistView ? 'Playlist' : 'Program');
                  const nounPlural = isParodyView ? 'medleys' : (isPlaylistView ? 'playlists' : 'programs');
                  const firstCta = isParodyView
                    ? 'Create your first medley — shows just the mukhda of each bhajan'
                    : (isPlaylistView
                      ? 'Create your first playlist for daily practice or a themed collection'
                      : 'Create your first program for an upcoming jagran or sankirtan');
                  const typeIntro = isParodyView
                    ? 'Medleys show just the mukhda of each bhajan — perfect for singing several short pieces back to back.'
                    : (isPlaylistView
                      ? 'Playlists are undated collections for daily practice or themed listening.'
                      : 'Programs are dated events like jagrans and sankirtans.');
                  return (
                    <div className="text-center py-12 bg-[#FFFCF8] rounded-2xl border-2 border-dashed border-[#0B5A70]/12">
                      {programs.length === 0 ? (
                        <>
                          <div className="text-6xl mb-4">🎵</div>
                          <h3 className="text-lg font-bold text-[#0B5A70] mb-2">Nothing here yet!</h3>
                          <p className="text-sm text-gray-600 mb-4">{firstCta}</p>
                          <button
                            onClick={openCreateProgram}
                            className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2"
                          >
                            <span className="text-lg">+</span> Create Your First {Noun}
                          </button>
                        </>
                      ) : programSearchQuery ? (
                        <>
                          <div className="text-4xl mb-3">🔍</div>
                          <p className="text-[#0B5A70] font-semibold">No matches for your search</p>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">{emoji}</div>
                          <p className="text-[#0B5A70] font-semibold mb-2">No {nounPlural} yet</p>
                          <p className="text-sm text-gray-600 mb-4">{typeIntro}</p>
                          <button
                            onClick={openCreateProgram}
                            className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-5 py-2 rounded-xl shadow-md inline-flex items-center gap-2 text-sm"
                          >
                            <span className="text-lg">+</span> Create a {Noun}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()
              ) : (
                (() => {
                  // SESSION 66: programs sort upcoming-first (soonest at
                  // top), then a dimmed "Past" section newest-first.
                  // Playlists keep their existing order.
                  const renderCard = (program, isPast) => {
                    const pType = getProgramType(program);
                    const isPl = pType === 'playlist';
                    const isPar = pType === 'parody';
                    const cardEmoji = isPar ? '🎭' : (isPl ? '🎵' : '');
                    const count = program.bhajanCount || 0;
                    const noun = isPar ? 'mukhda' : 'bhajan';
                    return (
                      <button
                        key={program.id}
                        onClick={() => openProgramDetail(program)}
                        className={`bg-[#FFFCF8] rounded-lg shadow-[0_1px_4px_rgba(11,90,112,0.04)] px-3 py-2 border border-[#0B5A70]/8 hover:border-[#0B5A70]/25 hover:shadow-[0_2px_8px_rgba(11,90,112,0.08)] transition-all text-left`}
                      >
                        <div className="flex items-center gap-2.5">
                          {cardEmoji && <div className="text-base flex-shrink-0" aria-hidden="true">{cardEmoji}</div>}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-[#0B5A70] truncate leading-tight">{program.name}</h3>
                            <p className="text-[11px] text-gray-500 truncate">
                              {count} {noun}{count === 1 ? '' : 's'}
                              {isPl || isPar ? (program.purpose ? ` · ${program.purpose}` : '') : (program.venue ? ` · 📍 ${program.venue}` : '')}
                            </p>
                          </div>
                          {!isPl && !isPar && program.date && (
                            <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-[#E65100]/10 text-[#E65100]'}`}>
                              {formatProgramDate(program.date)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  };
                  if (isPlaylistView) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {visibleItems.map(p => renderCard(p, false))}
                      </div>
                    );
                  }
                  const upcoming = visibleItems.filter(p => !isPastProgramDate(p.date)).sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));
                  const past = visibleItems.filter(p => isPastProgramDate(p.date)).sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
                  return (
                    <>
                      {upcoming.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {upcoming.map(p => renderCard(p, false))}
                        </div>
                      )}
                      {past.length > 0 && (
                        <>
                          <p className={`text-[11px] font-semibold uppercase tracking-wide mt-6 mb-2 ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/50'}`}>
                            Past programs
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {past.map(p => renderCard(p, true))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()
              )}
            </>
            );
          })()}

          {/* ==============================================
              PROGRAM DETAIL VIEW
              ============================================== */}
          {currentView === 'program-detail' && selectedProgram && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentView(getProgramType(selectedProgram) === 'parody' ? 'library' : 'programs')}
                  className="text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm"
                >
                  {/* SESSION 66: short label so the header stays on one line */}
                  ← Back
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openPickerFromProgramPage(selectedProgram)}
                    className="text-white bg-[#0B5A70] hover:bg-[#094a5d] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  >
                    ➕ Add bhajan
                  </button>
                  <button
                    onClick={() => openEditProgram(selectedProgram)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Edit details"
                    aria-label="Edit details"
                  >
<IconPencil size={16} />
                  </button>
                  {/* SESSION 66: Delete moved into an overflow menu, matching
                      the bhajan page. */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDeleteMenu(showDeleteMenu === 'program' ? null : 'program')}
                      className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-400 hover:text-gray-200 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70]/70 hover:text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                      aria-label="More options"
                      title="More options"
                    >
                      ⋯
                    </button>
                    {showDeleteMenu === 'program' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDeleteMenu(null)} />
                        <div className={`absolute right-0 mt-2 w-52 rounded-xl shadow-lg border z-50 overflow-hidden ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25' : 'bg-white border-[#0B5A70]/12'}`}>
                          <button
                            onClick={() => { setShowDeleteMenu(null); shareProgramText(selectedProgram); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-200' : 'hover:bg-[#0B5A70]/8 text-gray-800'}`}
                          >
                            📤 <span>Share setlist as text</span>
                          </button>
                          <button
                            onClick={() => { setShowDeleteMenu(null); duplicateProgram(selectedProgram); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-200' : 'hover:bg-[#0B5A70]/8 text-gray-800'}`}
                          >
                            📋 <span>Duplicate {getProgramType(selectedProgram) === 'parody' ? 'medley' : getProgramType(selectedProgram) === 'playlist' ? 'playlist' : 'program'}</span>
                          </button>
                          <button
                            onClick={() => { setShowDeleteMenu(null); setPrintJob({ program: selectedProgram, withLyrics: false }); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-200' : 'hover:bg-[#0B5A70]/8 text-gray-800'}`}
                          >
                            🖨️ <span>Print / PDF — list</span>
                          </button>
                          <button
                            onClick={() => { setShowDeleteMenu(null); setPrintJob({ program: selectedProgram, withLyrics: true }); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors border-b ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-200 border-[#0B5A70]/20' : 'hover:bg-[#0B5A70]/8 text-gray-800 border-[#0B5A70]/10'}`}
                          >
                            🖨️ <span>Print / PDF — with lyrics</span>
                          </button>
                          <button
                            onClick={() => { setShowDeleteMenu(null); deleteProgram(selectedProgram); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'hover:bg-red-900/20 text-red-300' : 'hover:bg-red-50 text-red-600'}`}
                          >
                            🗑️ <span>Delete {getProgramType(selectedProgram) === 'parody' ? 'medley' : getProgramType(selectedProgram) === 'playlist' ? 'playlist' : 'program'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const t = getProgramType(selectedProgram);
                // SESSION 46: medleys get a compact header — smaller title,
                // tighter padding, no Live Performance block (which was never
                // relevant to a medley — you don't perform a medley "live"
                // from a stage, you sing through its mukhdas).
                if (t === 'parody') {
                  // SESSION 57: medley hero tightened a bit further.
                  // p-3/4, text-base/lg title, smaller icon.
                  return (
                    <div className="bg-[#FFFCF8] rounded-xl shadow-[0_1px_6px_rgba(11,90,112,0.05)] p-3 md:p-4 border border-[#0B5A70]/8 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="text-xl flex-shrink-0" aria-hidden="true">🎭</div>
                        <div className="flex-1 min-w-0">
                          <h1 className="text-base md:text-lg font-bold text-[#0B5A70] truncate">
                            {selectedProgram.name}
                          </h1>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {selectedProgram.bhajanIds?.length || 0} mukhda{(selectedProgram.bhajanIds?.length || 0) === 1 ? '' : 's'}
                            {selectedProgram.purpose ? ` · ${selectedProgram.purpose}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                // Playlists and Programs keep the full-size hero card.
                return (
                  // SESSION 57: shrunk playlist/program hero. Was p-6/8
                  // with text-3xl/4xl title; now p-4/5 with text-xl/2xl
                  // title, icon inline with title, date/venue in a
                  // single meta line. Live button still prominent.
                  <div className="bg-[#FFFCF8] rounded-xl shadow-[0_1px_6px_rgba(11,90,112,0.05)] p-4 md:p-5 border border-[#0B5A70]/8 mb-4">
                    <div className="flex items-center gap-3">
                      {t === 'playlist' && <div className="text-2xl flex-shrink-0" aria-hidden="true">🎵</div>}
                      <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-[#0B5A70] truncate">
                          {selectedProgram.name}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {selectedProgram.bhajanIds?.length || 0} bhajan{(selectedProgram.bhajanIds?.length || 0) === 1 ? '' : 's'}
                          {selectedProgram.date ? ` · ${isPastProgramDate(selectedProgram.date) ? 'Completed · ' : ''}${formatProgramDate(selectedProgram.date)}` : ''}
                          {selectedProgram.venue ? ` · 📍 ${selectedProgram.venue}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* SESSION 47: per-playlist Live explainer removed.
                        The difference between Playlist and Program is now
                        explained ONCE at the top of the Playlists tab. */}
                    {selectedProgram.bhajanIds && selectedProgram.bhajanIds.length > 0 && t === 'program' && (
                      <button
                        onClick={() => startLiveProgram(selectedProgram)}
                        className="w-full mt-3 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border transition-colors border-[#E65100]/50 text-[#E65100] hover:bg-[#E65100]/8"
                      >
                        🎤 Start live performance
                      </button>
                    )}
                    {/* SESSION 66: playlists get Live mode too (full-screen
                        lyrics, screen awake) — quieter button than a program's. */}
                    {selectedProgram.bhajanIds && selectedProgram.bhajanIds.length > 0 && t === 'playlist' && (
                      <button
                        onClick={() => startLiveProgram(selectedProgram)}
                        className={`w-full mt-3 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border transition-colors ${darkMode ? 'border-[#0B5A70]/40 text-teal-200 hover:bg-[#0B5A70]/20' : 'border-[#0B5A70]/25 text-[#0B5A70] hover:bg-[#0B5A70]/5'}`}
                      >
                        🎤 Sing in Live mode
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-[#0B5A70]/60'}`}>
                    {(() => {
                      const n = selectedProgram.bhajanIds?.length || 0;
                      const t = getProgramType(selectedProgram);
                      return `${n} ${t === 'parody' ? 'mukhda' : 'bhajan'}${n === 1 ? '' : 's'}`;
                    })()}
                  </h3>
                  {(selectedProgram.bhajanIds?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => setSetlistEditMode(v => !v)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${setlistEditMode
                        ? 'bg-[#E65100] text-white'
                        : (darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15')}`}
                      aria-pressed={setlistEditMode}
                    >
                      {setlistEditMode ? 'Done' : 'Edit list'}
                    </button>
                  )}
                </div>
                {(!selectedProgram.bhajanIds || selectedProgram.bhajanIds.length === 0) ? (
                  <div className="bg-[#FFFCF8] rounded-2xl p-6 text-center border-2 border-dashed border-[#0B5A70]/12">
                    <p className="text-[#0B5A70] mb-2">
                      {(() => {
                        const t = getProgramType(selectedProgram);
                        return t === 'parody' ? 'No bhajans in this medley yet' :
                               t === 'playlist' ? 'No bhajans in this playlist yet' :
                               'No bhajans in this program yet';
                      })()}
                    </p>
                    <button
                      onClick={() => openPickerFromProgramPage(selectedProgram)}
                      className="text-[#0B5A70] hover:text-[#0B5A70]/80 font-semibold text-sm"
                    >
                      Add bhajans
                    </button>
                  </div>
                ) : getProgramType(selectedProgram) === 'parody' ? (
                  // SESSION 36/37: PARODY render — mukhda blocks.
                  // Each block shows the bhajan title small at top
                  // and the mukhda (opening lines) large below.
                  // Mukhda is detected by blank-line convention
                  // (see getMukhda helper for full priority rules).
                  // Tapping opens the full reading view via the
                  // programContext path (Session 34), so "🎭 More
                  // in this parody" shows at the bottom and back-
                  // nav reads "← Back to [Parody name]".
                  <div className="space-y-3">
                    {selectedProgram.bhajanIds.map((bhajanId, index) => {
                      const bhajan = getBhajanById(bhajanId);
                      if (!bhajan) return null;
                      const mukhda = getMukhda(bhajan);
                      return (
                        <button
                          key={bhajanId}
                          onClick={() => {
                            setProgramContext(selectedProgram);
                            openBhajanDetail(bhajan);
                          }}
                          className={`w-full rounded-2xl p-4 border transition-all text-left shadow-[0_1px_4px_rgba(11,90,112,0.04)] ${darkMode ? 'bg-[#162226] border-[#0B5A70]/15 hover:border-[#0B5A70]/30' : 'bg-[#FFFCF8] border-[#0B5A70]/8 hover:border-[#0B5A70]/25'}`}
                        >
                          <div className="flex items-baseline justify-between mb-1 gap-2">
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="text-sm font-bold text-[#E65100]">{index + 1}.</span>
                              <p className={`text-xs font-semibold truncate ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]/80'}`}>
                                {bhajan.title}
                              </p>
                            </div>
                            <span className="text-xs text-[#0B5A70]/50 flex-shrink-0">Tap for full →</span>
                          </div>
                          {/* SESSION 39: तर्ज़ (dhun) sub-line — singer
                              needs the tune to sing a parody medley.
                              Only rendered if the bhajan actually has
                              a dhun. Same "तर्ज़: X" convention as the
                              standard playlist/program bhajan list. */}
                          {bhajan.dhun && (
                            <p className={`text-xs mb-2 ml-6 truncate ${darkMode ? 'text-orange-300/80' : 'text-[#E65100]/80'}`}>
                              तर्ज़: {bhajan.dhun}
                            </p>
                          )}
                          <p
                            className={`whitespace-pre-line leading-relaxed text-lg font-medium ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}
                            style={{ fontFamily: "'Noto Sans Devanagari', 'Noto Serif Devanagari', system-ui, sans-serif" }}
                          >
                            {mukhda || <span className="italic text-sm text-gray-500">(no lyrics to preview)</span>}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Standard render for playlist and program
                  <div className="space-y-2">
                    {selectedProgram.bhajanIds.map((bhajanId, index) => {
                      const bhajan = getBhajanById(bhajanId);
                      if (!bhajan) return null;
                      const total = selectedProgram.bhajanIds.length;
                      const rowBody = (
                        <>
                          <div className="text-2xl font-bold text-[#E65100] min-w-[40px] text-center">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#0B5A70] truncate">{bhajan.title}</p>
                            {bhajan.dhun && (
                              <p className="text-xs text-[#0B5A70]/60 truncate">तर्ज़: {bhajan.dhun}</p>
                            )}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <span className="text-xs bg-[#0B5A70]/8 text-[#0B5A70] px-2 py-0.5 rounded-full">
                                {bhajan.deity}
                              </span>
                              {selectedProgram.singers && selectedProgram.singers[bhajanId] && (
                                <span className="text-xs bg-[#E65100]/10 text-[#E65100] px-2 py-0.5 rounded-full">
                                  🎤 {selectedProgram.singers[bhajanId]}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      );
                      if (setlistEditMode) {
                        // SESSION 76: singer assignment editor
                        if (singerEditId === bhajanId) {
                          return (
                            <div key={bhajanId} className="w-full bg-[#FFFCF8] rounded-xl p-3 border border-[#E65100]/30 flex items-center gap-2">
                              <span className="text-lg">🎤</span>
                              <input
                                autoFocus
                                value={singerDraft}
                                onChange={(e) => setSingerDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setSingerFor(selectedProgram, bhajanId, singerDraft); if (e.key === 'Escape') setSingerEditId(null); }}
                                placeholder={`Who sings "${(bhajan.title || '').split(' / ')[0]}"?`}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#0B5A70]/20 text-sm outline-none bg-white text-gray-900"
                              />
                              <button type="button" onClick={() => setSingerFor(selectedProgram, bhajanId, singerDraft)} className="px-3 py-2 rounded-lg text-xs font-bold bg-[#E65100] text-white">Save</button>
                              <button type="button" onClick={() => setSingerEditId(null)} className="px-2 py-2 text-xs text-gray-500">✕</button>
                            </div>
                          );
                        }
                        // SESSION 67: reorder/remove controls, saved instantly
                        const ctl = 'w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors disabled:opacity-25';
                        return (
                          <div
                            key={bhajanId}
                            className="w-full bg-[#FFFCF8] rounded-xl p-3 border border-[#E65100]/30 flex items-center gap-2 shadow-[0_1px_4px_rgba(11,90,112,0.04)]"
                          >
                            {rowBody}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button type="button" onClick={() => { setSingerDraft((selectedProgram.singers || {})[bhajanId] || ''); setSingerEditId(bhajanId); }} className={`${ctl} bg-[#E65100]/10 text-[#E65100] hover:bg-[#E65100]/20`} aria-label={`Assign singer for ${bhajan.title}`} title="Assign singer">🎤</button>
                              <button type="button" onClick={() => moveInSetlist(selectedProgram, index, -1)} disabled={index === 0} className={`${ctl} bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15`} aria-label={`Move ${bhajan.title} up`}>↑</button>
                              <button type="button" onClick={() => moveInSetlist(selectedProgram, index, 1)} disabled={index === total - 1} className={`${ctl} bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15`} aria-label={`Move ${bhajan.title} down`}>↓</button>
                              <button type="button" onClick={() => removeFromSetlist(selectedProgram, bhajanId)} className={`${ctl} bg-red-50 text-red-600 hover:bg-red-100`} aria-label={`Remove ${bhajan.title}`}>✕</button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={bhajanId}
                          onClick={() => {
                            // SESSION 34: remember we came from this
                            // program/playlist, so the reading view
                            // shows siblings instead of Related.
                            setProgramContext(selectedProgram);
                            openBhajanDetail(bhajan);
                          }}
                          className="w-full bg-[#FFFCF8] rounded-xl p-4 border border-[#0B5A70]/8 hover:border-[#0B5A70]/25 transition-all text-left flex items-center gap-3 shadow-[0_1px_4px_rgba(11,90,112,0.04)]"
                        >
                          {rowBody}
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
          {(currentView === 'create-program' || currentView === 'edit-program') && (() => {
            // SESSION 10 (item 1): same dark-mode form control helpers as bhajan form.
            const fInput = darkMode
              ? 'w-full px-4 py-3 border border-[#0B5A70]/30 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/20 focus:border-teal-400 outline-none bg-[#1e2e33] text-amber-50 placeholder-gray-500'
              : 'w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none bg-[#FFFCF8] text-gray-900 placeholder-gray-400';
            const fLabel = darkMode ? 'block text-sm font-semibold text-teal-200 mb-1' : 'block text-sm font-semibold text-[#0B5A70] mb-1';
            const fCard = darkMode
              ? 'bg-[#162226] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.15)] p-6 md:p-8 border border-[#0B5A70]/15'
              : 'bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 border border-[#0B5A70]/8';
            const fTitle = darkMode ? 'text-2xl font-bold text-amber-100 mb-6' : 'text-2xl font-bold text-[#0B5A70] mb-6';
            return (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (currentView === 'edit-program' && selectedProgram) {
                      setCurrentView('program-detail');
                    } else {
                      setCurrentView(programForm.type === 'parody' ? 'library' : 'programs');
                    }
                  }}
                  className={darkMode ? 'text-teal-200 hover:text-teal-100 flex items-center gap-1 text-sm' : 'text-[#0B5A70] hover:text-[#0B5A70]/80 flex items-center gap-1 text-sm'}
                >
                  ← Cancel
                </button>
                {/* SESSION 43: Save moved to the top so it's reachable
                    without scrolling past the setlist. In edit mode the
                    setlist auto-saves; this button saves name/date/venue. */}
                <button
                  onClick={saveProgram}
                  disabled={programFormSaving || !programForm.name.trim()}
                  className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold px-5 py-2 rounded-xl shadow-md text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {programFormSaving ? 'Saving…' : (currentView === 'edit-program' ? '💾 Save details' : '💾 Save')}
                </button>
              </div>

              <div className={fCard}>
                <h2 className={fTitle}>
                  {(() => {
                    const t = programForm.type;
                    const editing = currentView === 'edit-program';
                    const noun = t === 'parody' ? 'Medley' : t === 'playlist' ? 'Playlist' : 'Program';
                    return editing ? `✏️ Edit ${noun}` : `➕ Create New ${noun}`;
                  })()}
                </h2>

                {/* SESSION 76: start from a past program/playlist — copies
                    its setlist (and venue) into the new form. */}
                {currentView === 'create-program' && programForm.type !== 'parody' && programs.some(pr => getProgramType(pr) !== 'parody' && (pr.bhajanIds || []).length > 0) && (
                  <div className="mb-5">
                    <label className={fLabel}>Start from a past program (optional)</label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const src = programs.find(pr => pr.id === e.target.value);
                        if (!src) return;
                        setProgramForm(f => ({
                          ...f,
                          bhajanIds: [...(src.bhajanIds || [])],
                          venue: f.venue || src.venue || '',
                          name: f.name || src.name
                        }));
                        showToast(`📋 ${(src.bhajanIds || []).length} bhajans copied from "${src.name}"`);
                      }}
                      className={fInput}
                    >
                      <option value="">— choose to copy its bhajans —</option>
                      {programs.filter(pr => getProgramType(pr) !== 'parody' && (pr.bhajanIds || []).length > 0).map(pr => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name}{pr.date ? ` · ${formatProgramDate(pr.date)}` : ''} · {(pr.bhajanIds || []).length} bhajans
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SESSION 32/36: type toggle. Three options — Playlist,
                    Program, Parody. Switching type doesn't clear the
                    fields — just hides/shows them — so switching
                    accidentally isn't destructive. */}
                <div className="mb-5">
                  <label className={fLabel}>Type</label>
                  {/* SESSION 51: symmetric handling — when creating/editing
                      a medley we ONLY show the medley pill (locked), so the
                      user can't accidentally turn it into a playlist. When
                      creating a playlist/program, medley isn't offered.
                      Same guardrail on both sides of the toggle. */}
                  {programForm.type === 'parody' ? (
                    <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-[#0B5A70]/20' : 'bg-[#0B5A70]/5'}`}>
                      <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#E65100] text-white shadow-sm">
                        🎭 Medley
                      </span>
                    </div>
                  ) : (
                    <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-[#0B5A70]/20' : 'bg-[#0B5A70]/5'}`}>
                      <button
                        type="button"
                        onClick={() => setProgramForm({...programForm, type: 'playlist'})}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          programForm.type === 'playlist'
                            ? 'bg-[#E65100] text-white shadow-sm'
                            : (darkMode ? 'text-teal-200/70 hover:text-teal-100' : 'text-[#0B5A70]/70 hover:text-[#0B5A70]')
                        }`}
                      >
                        🎵 Playlist
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgramForm({...programForm, type: 'program'})}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          programForm.type === 'program'
                            ? 'bg-[#E65100] text-white shadow-sm'
                            : (darkMode ? 'text-teal-200/70 hover:text-teal-100' : 'text-[#0B5A70]/70 hover:text-[#0B5A70]')
                        }`}
                      >
                        📅 Program
                      </button>
                    </div>
                  )}
                  <p className={`text-xs mt-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {programForm.type === 'parody'
                      ? 'A medley shows just the mukhda of each bhajan. Tap a mukhda to see full lyrics.'
                      : (programForm.type === 'playlist'
                        ? 'A recurring collection — no date or venue. Good for daily practice or themed sets.'
                        : 'A one-time event with date and venue — like a jagran or sankirtan.')}
                  </p>
                </div>

                <div className="mb-4">
                  <label className={fLabel}>
                    {(() => {
                      const t = programForm.type;
                      return (t === 'parody' ? 'Medley Name' : t === 'playlist' ? 'Playlist Name' : 'Program Name');
                    })()} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                    className={fInput + " text-lg"}
                    placeholder={(() => {
                      const t = programForm.type;
                      return t === 'parody' ? 'e.g., Sunday Morning Medley' :
                             t === 'playlist' ? 'e.g., Morning Prayers' :
                             'e.g., Diwali Jagran 2026';
                    })()}
                  />
                </div>

                {programForm.type !== 'program' ? (
                  <div className="mb-4">
                    <label className={fLabel}>
                      Purpose (optional)
                    </label>
                    <input
                      type="text"
                      value={programForm.purpose}
                      onChange={(e) => setProgramForm({...programForm, purpose: e.target.value})}
                      className={fInput}
                      placeholder={programForm.type === 'parody' ? "e.g., Wedding songs, fast bhajans" : "e.g., Daily practice, kids' prayer time"}
                      maxLength={80}
                    />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {programForm.type === 'parody'
                        ? 'Short label that shows on the medley card.'
                        : 'Short label that shows on the playlist card.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={fLabel}>
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={programForm.date}
                      onChange={(e) => setProgramForm({...programForm, date: e.target.value})}
                      className={fInput}
                    />
                  </div>
                  <div>
                    <label className={fLabel}>
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
                )}

                <div className="mb-4 pt-4 border-t border-[#0B5A70]/8">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-[#0B5A70]">
                      Bhajans in {(() => {
                        const t = programForm.type;
                        return t === 'parody' ? 'Medley' : t === 'playlist' ? 'Playlist' : 'Program';
                      })()} ({programForm.bhajanIds.length})
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

                {currentView === 'edit-program' ? (
                  // SESSION 43: in edit mode the setlist auto-saves on
                  // every add/remove/reorder, so the bottom row is just
                  // a status line and a Done button.
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {setlistAutoSave === 'saving' ? '⏳ Saving setlist…'
                        : setlistAutoSave === 'saved' ? '✓ Setlist saved automatically'
                        : setlistAutoSave === 'error' ? '⚠️ Could not save setlist — check connection'
                        : 'Changes to the setlist save automatically'}
                    </p>
                    <button
                      onClick={() => {
                        if (selectedProgram) {
                          const fresh = programs.find(p => p.id === selectedProgram.id);
                          if (fresh) setSelectedProgram(fresh);
                          setCurrentView('program-detail');
                        } else {
                          setCurrentView('programs');
                        }
                      }}
                      className="px-6 py-3 bg-[#0B5A70] text-white rounded-xl hover:bg-[#094a5d] font-semibold"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={saveProgram}
                      disabled={programFormSaving || !programForm.name.trim()}
                      className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {programFormSaving ? 'Saving...' : '💾 Save'}
                    </button>
                    <button
                      onClick={() => setCurrentView(programForm.type === 'parody' ? 'library' : 'programs')}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Bhajan Picker Modal */}
              {showBhajanPicker && (() => {
                const pickerNoun = programForm.type === 'parody' ? 'medley' : programForm.type === 'playlist' ? 'playlist' : 'program';
                const pickerDeities = [...new Set([...bhajans, ...publicBhajans].map(b => b.deity).filter(Boolean))].sort();
                // SESSION 68: second filter is Type (Bhajan/Aarti/…) to match
                // the library pages; keyword chips still searchable by text.
                const pickerTypes = [...new Set([...bhajans, ...publicBhajans].map(b => b.category).filter(Boolean))].sort();
                // SESSION 10 (item 4): was derived from the user's own
                // bhajans only, which meant a nearly-empty dropdown for
                // users with a small personal library. Now uses the
                // master keyword list (same as home page filter).

                const programKeywords = new Set();
                programForm.bhajanIds.forEach(id => {
                  const b = getBhajanById(id);
                  if (b && b.keywords) b.keywords.forEach(kw => programKeywords.add(kw));
                });

                const pickerQ = foldSearchKey(bhajanPickerSearch);
                const filteredPickerBhajans = rankByTier(bhajans.filter(b => {
                  if (pickerQ && searchTier(b, pickerQ) < 0) return false;
                  if (pickerDeityFilter && b.deity !== pickerDeityFilter) return false;
                  if (pickerKeywordFilter && b.category !== pickerKeywordFilter) return false;
                  return true;
                }), pickerQ);

                // SESSION 68: public-library results. Shown once the user
                // searches or filters (not all 280+ by default). Public
                // bhajans already saved to My Library are excluded — their
                // personal copy is in the list above.
                const publicPickerMatches = (hasActiveFiltersFn() && !user) ? rankByTier(publicBhajans.filter(b => {
                  if (savedBhajanIds.has(b.id)) return false;
                  if (pickerQ && searchTier(b, pickerQ) < 0) return false;
                  if (pickerDeityFilter && b.deity !== pickerDeityFilter) return false;
                  if (pickerKeywordFilter && b.category !== pickerKeywordFilter) return false;
                  return true;
                }), pickerQ).slice(0, 40) : [];
                function hasActiveFiltersFn() { return !!(bhajanPickerSearch || pickerDeityFilter || pickerKeywordFilter); }
                const addPublicToProgram = async (pb) => {
                  if (savingToLibrary) return;
                  const saved = await saveToMyLibrary(pb);
                  if (saved && saved.id) toggleBhajanInProgram(saved.id);
                };

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
                        <h3 className="text-lg font-bold text-[#0B5A70]">Add bhajans to {pickerNoun}</h3>
                        <p className="text-xs text-[#0B5A70]/60 mt-0.5">Tap to add or remove · search to find more in the public library</p>
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
                          <option value="">Deity</option>
                          {pickerDeities.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                          value={pickerKeywordFilter}
                          onChange={(e) => setPickerKeywordFilter(e.target.value)}
                          aria-label="Filter picker by type"
                          className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs outline-none bg-[#FFFCF8] transition-all ${
                            pickerKeywordFilter
                              ? 'border-[#0B5A70]/50 ring-2 ring-[#0B5A70]/10 font-semibold text-[#0B5A70]'
                              : 'border-[#0B5A70]/15'
                          }`}
                        >
                          <option value="">Type</option>
                          {pickerTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
                      {bhajans.length === 0 && !hasActiveFilters ? (
                        <div className="text-center py-8">
                          <p className="text-[#0B5A70] font-semibold">Your library is empty</p>
                          <p className="text-sm text-gray-600 mt-1">Search above to add bhajans from the public library</p>
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

                          {publicPickerMatches.length > 0 && (
                            <div className="mt-5">
                              <p className="text-xs font-semibold text-[#E65100] uppercase tracking-wide mb-2">
                                🌐 From the public library ({publicPickerMatches.length})
                              </p>
                              <div className="space-y-1.5">
                                {publicPickerMatches.map(pb => (
                                  <button
                                    key={`pub-${pb.id}`}
                                    onClick={() => addPublicToProgram(pb)}
                                    disabled={savingToLibrary}
                                    title={`Save to My Library and add to ${pickerNoun}`}
                                    className="w-full text-left p-3 rounded-xl border transition-all bg-white border-[#E65100]/20 hover:border-[#E65100]/40 disabled:opacity-50"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[#0B5A70] truncate text-sm">{pb.title}</p>
                                        <p className="text-xs text-gray-600 truncate">{pb.deity} • {pb.category}</p>
                                      </div>
                                      <span className="text-[#E65100] font-semibold ml-2 text-sm whitespace-nowrap">+ Add</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
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
                        Done · {programForm.bhajanIds.length} {programForm.bhajanIds.length === 1 ? 'bhajan' : 'bhajans'} in {pickerNoun}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </>
            );
          })()}

          {/* ==============================================
              PUBLIC LIBRARY VIEW
              ============================================== */}
          {currentView === 'public-library' && (
            <>
              {/* SESSION 42: guest banner. Unregistered visitors now land
                  here directly (no sign-in wall), so this is where they
                  learn what registering unlocks. Dismissible per device. */}
              {guestMode && !user && !guestBannerDismissed && (
                /* SESSION 61: single-line guest strip. The old card took a
                   third of the first screen; the library is the hero now. */
                <div className={`mb-3 rounded-xl border px-3 py-2 flex items-center gap-2 text-xs ${darkMode ? 'bg-[#1e2e33] border-[#E65100]/30 text-gray-300' : 'bg-[#FFF3E5] border-[#E65100]/25 text-[#0B5A70]'}`}>
                  <span aria-hidden="true">🙏</span>
                  <span className="flex-1 min-w-0 truncate">
                    <span className="font-semibold">Sign in</span> (free) to save bhajans &amp; build playlists
                  </span>
                  <button
                    onClick={() => { setGuestMode(false); setLoading(false); }}
                    className="flex-shrink-0 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold px-2.5 py-1 rounded-lg"
                  >
                    Sign in →
                  </button>
                  <button
                    onClick={() => {
                      setGuestBannerDismissed(true);
                      try { localStorage.setItem('sankirtan-guest-banner-dismissed', '1'); } catch {}
                    }}
                    className={`text-lg leading-none px-1 flex-shrink-0 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* SESSION 48: +Add (admin) merged into the search row — was
                  a standalone strip that sat empty for regular users. */}
              <div className="mb-4 flex items-stretch gap-2">
                <div className="relative flex-1 min-w-0">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-[#0B5A70]/50'}`}>
                    <IconSearch size={18} />
                  </div>
                  <input
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocus('public')}
                    onBlur={() => setTimeout(() => setSearchFocus(f => (f === 'public' ? null : f)), 150)}
                    placeholder="Search bhajans…"
                    aria-label="Search public library"
                    className={`w-full pl-10 pr-24 py-3 border rounded-xl focus:ring-4 outline-none ${
                      darkMode
                        ? 'bg-[#162226] border-[#0B5A70]/15 text-gray-100 focus:ring-[#0B5A70]/20 focus:border-[#0B5A70]/30'
                        : 'bg-white border-[#0B5A70]/12 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30'
                    }`}
                  />
                  {searchFocus === 'public' && publicSearchQuery.trim().length >= 2 && (() => {
                    const sug = titleSuggestions(publicBhajans, publicSearchQuery);
                    if (sug.length === 0) return null;
                    return (
                      <div
                        onPointerDown={(e) => e.preventDefault()}
                        className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg z-30 overflow-hidden ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25' : 'bg-white border-[#0B5A70]/15'}`}
                      >
                        {sug.map(b => (
                          <button
                            key={b.id}
                            onClick={() => { setSearchFocus(null); openPublicBhajanDetail(b); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-[#0B5A70]/20 text-gray-100' : 'hover:bg-[#0B5A70]/8 text-gray-900'}`}
                          >
                            <span className="truncate flex-1">{b.title}</span>
                            <span className={`text-[11px] flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{b.deity}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                    className={`absolute right-11 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      speechLang === 'hi-IN'
                        ? 'bg-[#0B5A70] text-white border-[#0B5A70]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20'
                    }`}
                    title={`Voice search language: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'} — tap to switch`}
                    aria-label={`Voice input language: ${speechLang === 'hi-IN' ? 'Hindi' : 'English'}. Tap to switch.`}
                  >
{speechLang === 'hi-IN' ? 'हिं' : 'EN'}
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
                {canContribute && (
                  <button
                    onClick={openAddPublicBhajan}
                    className="bg-[#0B5A70] hover:bg-[#094a5d] text-white font-semibold px-4 rounded-xl text-sm flex items-center gap-1 shadow-md flex-shrink-0"
                    title="Add a new public bhajan"
                  >
                    + Add
                  </button>
                )}
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

              {/* SESSION 51: Filter button retired. Deity and Type are back
                  as inline dropdowns; Mood is now a horizontally-scrollable
                  chip row below (see next block). */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  value={publicFilterDeity}
                  onChange={(e) => setPublicFilterDeity(e.target.value)}
                  aria-label="Filter by deity"
                  className={`px-3 py-2 border rounded-xl outline-none text-sm ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25 text-gray-200' : 'bg-white border-[#0B5A70]/20 text-[#0B5A70]'} ${publicFilterDeity ? 'font-semibold border-[#0B5A70]/50' : ''}`}
                >
                  <option value="">All deities</option>
                  {allDeityOptions.map(d => (
                    <option key={d.value} value={d.value}>{d.value}{publicDeityCounts[d.value] ? ` (${publicDeityCounts[d.value]})` : ''}</option>
                  ))}
                </select>
                <select
                  value={publicFilterCategory}
                  onChange={(e) => setPublicFilterCategory(e.target.value)}
                  aria-label="Filter by type"
                  className={`px-3 py-2 border rounded-xl outline-none text-sm ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25 text-gray-200' : 'bg-white border-[#0B5A70]/20 text-[#0B5A70]'} ${publicFilterCategory ? 'font-semibold border-[#0B5A70]/50' : ''}`}
                >
                  <option value="">All types</option>
                  {allCategoryOptions.map(c => (
                    <option key={c} value={c}>{c}{publicCategoryCounts[c] ? ` (${publicCategoryCounts[c]})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* SESSION 51: all moods, horizontally scrollable. Negative
                  margins push the row to the screen edges on mobile so
                  chips scroll from and to the edge — a signal there's
                  more offscreen. scrollbar hidden on WebKit. */}
              <div className="mb-6 -mx-4 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none'}}>
                <div className="flex flex-nowrap gap-2 items-center">
                  {isAdmin && (
                    <button
                      onClick={() => setUnreviewedOnly(v => !v)}
                      aria-pressed={unreviewedOnly}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
                        unreviewedOnly
                          ? 'bg-purple-700 text-white border-purple-700 shadow-md'
                          : (darkMode ? 'bg-transparent text-purple-200 border-purple-400/40' : 'bg-white text-purple-700 border-purple-300')
                      }`}
                      title="Admin: show only bhajans not yet reviewed"
                    >
                      🔍 Unreviewed {publicBhajans.filter(b => b.reviewStatus !== 'reviewed').length}
                    </button>
                  )}
                  {allKeywordOptions.map(kw => (
                    <button
                      key={kw}
                      onClick={() => setPublicFilterKeyword(publicFilterKeyword === kw ? '' : kw)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
                        publicFilterKeyword === kw
                          ? 'bg-[#0B5A70] text-white border-[#0B5A70] shadow-md'
                          : `${darkMode ? 'bg-transparent text-teal-200 border-[#0B5A70]/40 hover:border-[#0B5A70]/70 hover:bg-[#0B5A70]/15' : 'bg-white text-[#0B5A70] border-[#0B5A70]/25 hover:border-[#0B5A70]/45 hover:bg-[#0B5A70]/5'}`
                      }`}
                    >
                      {publicFilterKeyword === kw ? '✓ ' : ''}#{kw}
                    </button>
                  ))}
                </div>
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
                          Open Admin Panel
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-[#0B5A70] font-semibold">No bhajans match your filters</p>
                      {(() => {
                        const dym = didYouMean(publicBhajans, publicSearchQuery);
                        if (dym.length === 0) return null;
                        return (
                          <div className="mt-3 flex flex-wrap justify-center gap-2 items-center">
                            <span className="text-sm text-gray-600">Did you mean</span>
                            {dym.map(b => (
                              <button key={b.id} onClick={() => setPublicSearchQuery((b.title || '').split(' / ')[0])} className="px-3 py-1 rounded-full text-sm font-semibold bg-[#E65100]/10 text-[#E65100] hover:bg-[#E65100]/20">
                                {(b.title || '').split(' / ')[0]}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
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
                        ▤
                      </button>
                      <button
                        onClick={() => setCompactView(true)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${compactView ? 'bg-white text-[#0B5A70] shadow' : 'text-[#0B5A70]/60 hover:text-[#0B5A70]'}`}
                        title="Compact list view"
                        aria-label="Compact list view"
                      >
                        ☰
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
                      isSaved={user ? null : false}
                      savingToLibrary={savingToLibrary}
                      onOpen={openPublicBhajanDetail}
                      onSave={saveToMyLibrary}
                      unreviewed={isAdmin && !compactView && !isReviewed(bhajan)}
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
                  Made for the Bhajan Community 🙏 by Grace of <strong>Babosa Bhagwan</strong> 🕉️
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
                {/* SESSION 29: share app button. Small, subtle,
                    same visual weight as the feedback link. Sits
                    below feedback because feedback is more
                    important for iteration; share is optional. */}
                <div className="mt-1">
                  <button
                    onClick={handleShareApp}
                    className={`text-xs underline hover:no-underline transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-[#0B5A70] hover:text-[#0B5A70]/80'}`}
                  >
                    Share this app with a bhakt
                  </button>
                </div>
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
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <button
                      onClick={() => toggleReviewed(selectedPublicBhajan)}
                      className={`h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${isReviewed(selectedPublicBhajan) ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                      title={isReviewed(selectedPublicBhajan) ? 'Reviewed — tap to mark as needs review' : 'Mark as reviewed & finalised'}
                      aria-pressed={isReviewed(selectedPublicBhajan)}
                    >
                      {isReviewed(selectedPublicBhajan) ? '✓ Reviewed' : 'Review ✓'}
                    </button>
                  )}
                  {!user && (
                    <button
                      onClick={() => saveToMyLibrary(selectedPublicBhajan)}
                      className="h-9 bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-3 rounded-full text-xs flex items-center"
                    >
                      Save
                    </button>
                  )}

                  {/* SESSION 42: "Add to" directly from the public reading
                      view. If the bhajan isn't in the user's library yet,
                      we save it first (silently reusing saveToMyLibrary),
                      then open the same picker My Library uses. Removes
                      the hidden two-step "save, go to My Library, add". */}
                  <button
                    onClick={async () => {
                      if (!user) { setGuestMode(false); setLoading(false); return; }
                      const existing = bhajans.find(b => b.savedFromPublicId === selectedPublicBhajan.id);
                      if (existing) { setAddToProgramFor(existing); return; }
                      if (savedBhajanIds.has(selectedPublicBhajan.id)) {
                        // Saved earlier (possibly before savedFromPublicId existed) —
                        // point them to My Library rather than failing silently.
                        showToast('This bhajan is already in My Library — open it there to add to a playlist.', 'error');
                        return;
                      }
                      const saved = await saveToMyLibrary(selectedPublicBhajan);
                      if (saved && saved.id) setAddToProgramFor(saved);
                    }}
                    disabled={savingToLibrary}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Add to a playlist, program, or medley (saves to your library first)"
                    aria-label="Add to a playlist, program, or medley"
                  >
<IconListPlus size={18} />
                  </button>

                  <button
                    onClick={() => handleShareBhajan(selectedPublicBhajan, true)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                    title="Share this bhajan"
                    aria-label="Share this bhajan"
                  >
<IconShare size={16} />
                  </button>


                  {canEditPublic(selectedPublicBhajan) && (
                    <>
                      <button
                        onClick={() => openEditPublicBhajan(selectedPublicBhajan)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                        title="Edit public bhajan"
                        aria-label="Edit public bhajan"
                      >
<IconPencil size={16} />
                      </button>
                      {isAdmin && <div className="relative">
                        <button
                          onClick={() => setShowDeleteMenu(showDeleteMenu === 'public' ? null : 'public')}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg leading-none transition-colors ${darkMode ? 'bg-[#1e2e33] text-gray-300 hover:bg-[#0B5A70]/20' : 'bg-[#0B5A70]/8 text-[#0B5A70] hover:bg-[#0B5A70]/15'}`}
                          aria-label="More options"
                          title="More options"
                        >
                          ⋯
                        </button>
                        {showDeleteMenu === 'public' && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowDeleteMenu(null)} />
                            <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${darkMode ? 'bg-[#162226] border-[#0B5A70]/25' : 'bg-white border-[#0B5A70]/12'}`}>
                              <button
                                onClick={() => { setShowDeleteMenu(null); deletePublicBhajan(selectedPublicBhajan); }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'hover:bg-red-900/20 text-red-300' : 'hover:bg-red-50 text-red-600'}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 3h6a1 1 0 011 1v3H8V4a1 1 0 011-1z" /></svg>
                                <span>Delete public bhajan</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>}
                    </>
                  )}
                </div>
              </div>

              <div
                key={selectedPublicBhajan.id}
                className={`rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 md:p-8 mb-4 ${darkMode ? 'bg-[#162226] border border-[#0B5A70]/15' : 'bg-[#FFFCF8] border border-[#0B5A70]/8'} ${slideDir === 'left' ? 'sk-slide-left' : slideDir === 'right' ? 'sk-slide-right' : ''}`}
              >
                <div className="mb-3" title={selectedPublicBhajan.title}>
                  <BhajanTitle title={selectedPublicBhajan.title} size="xl" darkMode={darkMode} />
                </div>

                <ListenBar
                  bhajan={selectedPublicBhajan}
                  show={showAudioPlayer}
                  onToggle={() => setShowAudioPlayer(v => !v)}
                  darkMode={darkMode}
                  playerId="sk-audio-player-public"
                />

                {selectedPublicBhajan.dhun && (
                  <div className={`border-l-4 border-[#E65100]/40 p-3 rounded-r-lg mb-4 ${darkMode ? 'bg-[#1e2e33]' : 'bg-[#0B5A70]/5'}`}>
                    <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-[#E65100]'}`}>
                      <span className="font-semibold">तर्ज़ / धुन:</span> {selectedPublicBhajan.dhun}
                    </p>
                  </div>
                )}

                {/* SESSION 11 */}
                {(selectedPublicBhajan.singer || selectedPublicBhajan.lyricist) && (
                  <div className={`text-xs mb-4 flex flex-wrap gap-x-4 gap-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedPublicBhajan.singer && (
                      <span>
                        <span className={`font-semibold ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>गायक / Singer:</span> {selectedPublicBhajan.singer}
                      </span>
                    )}
                    {selectedPublicBhajan.lyricist && (
                      <span>
                        <span className={`font-semibold ${darkMode ? 'text-teal-300' : 'text-[#0B5A70]'}`}>रचनाकार / Lyricist:</span> {selectedPublicBhajan.lyricist}
                      </span>
                    )}
                  </div>
                )}

                <div className={`border-t pt-4 ${darkMode ? 'border-[#0B5A70]/15' : 'border-[#0B5A70]/8'}`}>
                  <div className="flex items-center justify-end gap-1 mb-2 flex-wrap" data-live-controls>
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
                    <span className={`mx-1 h-5 w-px ${darkMode ? 'bg-white/15' : 'bg-[#0B5A70]/15'}`} aria-hidden="true" />
                    <button
                      onClick={toggleLiveAutoScroll}
                      className={`w-8 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${liveAutoScroll ? 'bg-[#E65100] text-white' : (darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12')}`}
                      title={liveAutoScroll ? 'Pause auto-scroll' : 'Auto-scroll lyrics'}
                      aria-label={liveAutoScroll ? 'Pause auto-scroll' : 'Start auto-scroll'}
                      aria-pressed={liveAutoScroll}
                    >
                      {liveAutoScroll ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={() => setLiveScrollSpeed(v => LIVE_SCROLL_STEPS[Math.max(0, LIVE_SCROLL_STEPS.indexOf(v) - 1)])}
                      disabled={LIVE_SCROLL_STEPS.indexOf(liveScrollSpeed) <= 0}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Slower" aria-label="Slower auto-scroll"
                    >
                      −
                    </button>
                    <span className={`text-xs w-9 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} title="Scroll speed">{liveScrollSpeed}×</span>
                    <button
                      onClick={() => setLiveScrollSpeed(v => LIVE_SCROLL_STEPS[Math.min(LIVE_SCROLL_STEPS.length - 1, LIVE_SCROLL_STEPS.indexOf(v) + 1)])}
                      disabled={LIVE_SCROLL_STEPS.indexOf(liveScrollSpeed) >= LIVE_SCROLL_STEPS.length - 1}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 ${darkMode ? 'bg-[#1e2e33] hover:bg-[#0B5A70]/20 text-gray-200' : 'bg-[#0B5A70]/5 hover:bg-[#0B5A70]/10 text-[#0B5A70] border border-[#0B5A70]/12'}`}
                      title="Faster" aria-label="Faster auto-scroll"
                    >
                      +
                    </button>
                  </div>
                  <pre
                    onClick={toggleLiveAutoScroll}
                    data-live-lyrics
                    className={`whitespace-pre-wrap text-lg leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                    style={{
                      fontSize: `${readingSettings.fontSize}px`,
                      fontFamily: readingSettings.fontFamily,
                      lineHeight: readingSettings.lineHeight,
                      textAlign: readingSettings.textAlign
                    }}
                  >
                    <LyricsBody bhajan={selectedPublicBhajan} darkMode={darkMode} />
                  </pre>
                </div>

                {(selectedPublicBhajan.keywords && selectedPublicBhajan.keywords.length > 0) ? (
                  <div className="mt-6 pt-4 border-t border-[#0B5A70]/8 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                      {/* SESSION 52: mood chips are now tappable — apply the
                          mood as a public library filter and return to it. */}
                      {(selectedPublicBhajan.keywords || []).map(kw => (
                        <button
                          key={kw}
                          type="button"
                          onClick={() => {
                            setPublicFilterKeyword(kw);
                            setPublicFilterDeity('');
                            setPublicFilterCategory('');
                            setCurrentView('public-library');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          title={`Show public bhajans tagged #${kw}`}
                          aria-label={`Filter public library by #${kw}`}
                          className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${darkMode ? "bg-[#0B5A70]/25 text-teal-200 border-[#0B5A70]/40 hover:bg-[#0B5A70]/40 hover:border-teal-300" : "bg-[#0B5A70]/10 text-[#0B5A70] border-[#0B5A70]/25 hover:bg-[#0B5A70]/20 hover:border-[#0B5A70]/50"}`}
                        >
                          #{kw}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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

              {(() => {
                // SESSION 78: richer admin statistics, all computed client-side
                // from the public library already in memory.
                const total = publicBhajans.length;
                const sum = (f) => publicBhajans.reduce((a, b) => a + (Number(b[f]) || 0), 0);
                const totalSaves = sum('saveCount');
                const totalReads = sum('readCount');
                const count = (f) => {
                  const m = {};
                  publicBhajans.forEach(b => { const k = b[f] || '—'; m[k] = (m[k] || 0) + 1; });
                  return Object.entries(m).sort((a, b) => b[1] - a[1]);
                };
                const byDeity = count('deity');
                const byType = count('category');
                const topRead = [...publicBhajans].sort((a, b) => (b.readCount || 0) - (a.readCount || 0)).slice(0, 10);
                const topSaved = [...publicBhajans].sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0)).slice(0, 10);
                const noVideo = publicBhajans.filter(b => !getYouTubeVideoId(b.source)).length;
                const noDhun = publicBhajans.filter(b => !b.dhun).length;
                const noScale = publicBhajans.filter(b => !b.scale).length;
                const noMood = publicBhajans.filter(b => !b.keywords || b.keywords.length === 0).length;
                const shortLyrics = publicBhajans.filter(b => !b.lyrics || b.lyrics.trim().length < 80).length;
                const neverRead = publicBhajans.filter(b => !(b.readCount > 0)).length;
                const ms30 = Date.now() - 30 * 86400000;
                const toMs = (t) => (t && t.toMillis) ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);
                const added30 = publicBhajans.filter(b => toMs(b.createdAt) >= ms30).length;
                const Stat = ({ n, label }) => (
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold">{n}</div>
                    <div className="text-[11px] leading-tight">{label}</div>
                  </div>
                );
                const Bar = ({ rows, max }) => (
                  <div className="space-y-1">
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-28 truncate text-[#0B5A70]">{k}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-[#0B5A70]/10 overflow-hidden"><div className="h-full bg-[#0B5A70]/60" style={{ width: `${Math.max(2, (v / max) * 100)}%` }} /></div>
                        <span className="w-8 text-right text-gray-600">{v}</span>
                      </div>
                    ))}
                  </div>
                );
                const TopList = ({ rows, field, label }) => (
                  <ol className="space-y-1 text-xs">
                    {rows.map((b, i) => (
                      <li key={b.id} className="flex items-center gap-2">
                        <span className="w-5 text-right font-bold text-[#E65100]">{i + 1}</span>
                        <button onClick={() => openPublicBhajanDetail(b)} className="flex-1 min-w-0 truncate text-left text-[#0B5A70] hover:underline">{b.title}</button>
                        <span className="text-gray-600 flex-shrink-0">{b[field] || 0} {label}</span>
                      </li>
                    ))}
                  </ol>
                );
                return (
                  <>
                    <div className="bg-[#0B5A70] rounded-2xl p-5 text-white mb-6">
                      <h3 className="text-lg font-bold mb-3">📊 Public Library Stats</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <Stat n={total} label="Bhajans" />
                        <Stat n={totalReads} label="Total reads" />
                        <Stat n={totalSaves} label="Total saves" />
                        <Stat n={byDeity.length} label="Deities" />
                        <Stat n={byType.length} label="Types" />
                        <Stat n={added30} label="Added · 30 days" />
                      </div>
                      {(() => {
                        const reviewed = publicBhajans.filter(b => b.reviewStatus === 'reviewed').length;
                        const pct = total ? Math.round((reviewed / total) * 100) : 0;
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold">Review progress</span>
                              <span>{reviewed} / {total} · {pct}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-amber-300" style={{ width: `${pct}%` }} /></div>
                            {reviewed < total && (
                              <button
                                onClick={() => { setUnreviewedOnly(true); setCurrentView('public-library'); }}
                                className="mt-2 text-xs font-semibold underline underline-offset-2"
                              >
                                Open the {total - reviewed} unreviewed →
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-[#FFFCF8] rounded-2xl p-5 border border-[#0B5A70]/8">
                        <h4 className="font-bold text-[#0B5A70] mb-3">By deity</h4>
                        <Bar rows={byDeity.slice(0, 12)} max={byDeity[0] ? byDeity[0][1] : 1} />
                      </div>
                      <div className="bg-[#FFFCF8] rounded-2xl p-5 border border-[#0B5A70]/8">
                        <h4 className="font-bold text-[#0B5A70] mb-3">By type</h4>
                        <Bar rows={byType} max={byType[0] ? byType[0][1] : 1} />
                      </div>
                      <div className="bg-[#FFFCF8] rounded-2xl p-5 border border-[#0B5A70]/8">
                        <h4 className="font-bold text-[#0B5A70] mb-3">Most read</h4>
                        <TopList rows={topRead} field="readCount" label="reads" />
                      </div>
                      <div className="bg-[#FFFCF8] rounded-2xl p-5 border border-[#0B5A70]/8">
                        <h4 className="font-bold text-[#0B5A70] mb-3">Most saved</h4>
                        <TopList rows={topSaved} field="saveCount" label="saves" />
                      </div>
                    </div>

                    <div className="bg-[#FFFCF8] rounded-2xl p-5 border border-amber-200/70 mb-6">
                      <h4 className="font-bold text-[#0B5A70] mb-1">Content gaps</h4>
                      <p className="text-xs text-gray-500 mb-3">Bhajans missing something — worth filling in.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {[['No YouTube link', noVideo], ['No तर्ज़ / dhun', noDhun], ['No scale', noScale], ['No mood tags', noMood], ['Very short lyrics', shortLyrics], ['Never read', neverRead]].map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between rounded-lg px-3 py-2 bg-amber-50 border border-amber-200/60">
                            <span className="text-gray-700">{k}</span>
                            <span className="font-bold text-amber-800">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* SESSION 16: Bhajan of the Day scheduler */}
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border-2 border-[#E65100]/40">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-[#0B5A70]">🌟 आज का भजन · Today's Bhajan</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Curate the bhajan that appears at the top of the Public Library for a chosen date. Leave blank and today's card falls back to a deterministic pick.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">Date</label>
                    <input
                      type="date"
                      value={dailyEditDate}
                      onChange={(e) => {
                        setDailyEditDate(e.target.value);
                        setDailyEditLoadedFor(null); // re-load for new date
                      }}
                      className="w-full px-4 py-2 border border-[#0B5A70]/15 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">Bhajan</label>
                    {/* SESSION 31: searchable picker replaces the old
                        250+ item <select> dropdown. Type a title or
                        deity fragment to filter. Selected bhajan
                        shows as a chip with an × to clear. */}
                    {(() => {
                      const selectedBhajan = dailyEditBhajanId
                        ? publicBhajans.find(b => b.id === dailyEditBhajanId)
                        : null;

                      if (selectedBhajan) {
                        // Selected state: chip + Change button
                        return (
                          <div className={`flex items-center justify-between gap-2 px-3 py-2 border border-[#0B5A70]/15 rounded-xl ${darkMode ? 'bg-[#162226]' : 'bg-white'}`}>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                                {selectedBhajan.title}
                              </p>
                              <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {selectedBhajan.deity}
                                {selectedBhajan.category ? ` · ${selectedBhajan.category}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDailyEditBhajanId('');
                                setDailyEditSearch('');
                                setDailyEditSearchOpen(true);
                              }}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex-shrink-0"
                            >
                              Change
                            </button>
                          </div>
                        );
                      }

                      // Unselected state: filters + search input + dropdown.
                      // SESSION 45: added Deity and Mood filters and raised
                      // the visible cap from 20 to 60 — admins couldn't reach
                      // most of the library from the search alone.
                      const q = dailyEditSearch.trim().toLowerCase();
                      const pickerDeities = [...new Set(publicBhajans.map(b => b.deity).filter(Boolean))].sort();
                      const pickerMoods = [...new Set(publicBhajans.flatMap(b => b.keywords || []))].sort();
                      const filtered = publicBhajans.filter(b => {
                        if (dailyEditDeity && b.deity !== dailyEditDeity) return false;
                        if (dailyEditMood && !(b.keywords || []).includes(dailyEditMood)) return false;
                        if (!q) return true;
                        const title = (b.title || '').toLowerCase();
                        const deity = (b.deity || '').toLowerCase();
                        const dhun = (b.dhun || '').toLowerCase();
                        return title.includes(q) || deity.includes(q) || dhun.includes(q);
                      });
                      const matches = [...filtered]
                        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                        .slice(0, 60);

                      return (
                        <div className="relative">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <select
                              value={dailyEditDeity}
                              onChange={(e) => { setDailyEditDeity(e.target.value); setDailyEditSearchOpen(true); }}
                              className="px-3 py-2 border border-[#0B5A70]/15 rounded-xl outline-none bg-white text-sm"
                            >
                              <option value="">All deities</option>
                              {pickerDeities.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select
                              value={dailyEditMood}
                              onChange={(e) => { setDailyEditMood(e.target.value); setDailyEditSearchOpen(true); }}
                              className="px-3 py-2 border border-[#0B5A70]/15 rounded-xl outline-none bg-white text-sm"
                            >
                              <option value="">All moods</option>
                              {pickerMoods.map(k => <option key={k} value={k}>#{k}</option>)}
                            </select>
                          </div>
                          <p className="text-[11px] text-gray-500 mb-1">
                            {filtered.length} bhajan{filtered.length === 1 ? '' : 's'} match{filtered.length > 60 ? ' — showing first 60, narrow with search' : ''}
                          </p>
                          <input
                            type="text"
                            value={dailyEditSearch}
                            onChange={(e) => {
                              setDailyEditSearch(e.target.value);
                              setDailyEditSearchOpen(true);
                            }}
                            onFocus={() => setDailyEditSearchOpen(true)}
                            onBlur={() => {
                              // Delay so click on a match option registers first
                              setTimeout(() => setDailyEditSearchOpen(false), 200);
                            }}
                            placeholder="🔍 Search by title, deity, or तर्ज़…"
                            className="w-full px-4 py-2 border border-[#0B5A70]/15 rounded-xl outline-none bg-white"
                          />
                          {dailyEditSearchOpen && matches.length > 0 && (
                            <div className={`absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border shadow-lg ${darkMode ? 'bg-[#162226] border-[#0B5A70]/30' : 'bg-white border-[#0B5A70]/15'}`}>
                              {matches.map(b => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setDailyEditBhajanId(b.id);
                                    setDailyEditSearch('');
                                    setDailyEditSearchOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 border-b last:border-b-0 ${darkMode ? 'border-[#0B5A70]/10 hover:bg-[#0B5A70]/10' : 'border-gray-100 hover:bg-[#FFF3E5]'}`}
                                >
                                  <p className={`text-sm font-semibold truncate ${darkMode ? 'text-amber-100' : 'text-[#0B5A70]'}`}>
                                    {b.title}
                                  </p>
                                  <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {b.deity}
                                    {b.category ? ` · ${b.category}` : ''}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                          {dailyEditSearchOpen && q && matches.length === 0 && (
                            <div className={`absolute z-10 left-0 right-0 mt-1 rounded-xl border p-3 text-sm text-center ${darkMode ? 'bg-[#162226] border-[#0B5A70]/30 text-gray-400' : 'bg-white border-[#0B5A70]/15 text-gray-500'}`}>
                              No bhajan matches "{dailyEditSearch}"
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#0B5A70] mb-1">
                      Note <span className="text-xs text-gray-500 font-normal">(optional — shown as italic caption)</span>
                    </label>
                    <input
                      type="text"
                      value={dailyEditNote}
                      onChange={(e) => setDailyEditNote(e.target.value)}
                      placeholder="e.g., Hanuman Ji ke Mangalvar par vishesh"
                      maxLength={140}
                      className="w-full px-4 py-2 border border-[#0B5A70]/15 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveDailyBhajan}
                      disabled={dailyEditSaving || !dailyEditBhajanId}
                      className="flex-1 bg-[#E65100] hover:bg-[#d64800] disabled:opacity-50 text-white font-bold py-2 rounded-xl"
                    >
                      {dailyEditSaving ? 'Saving…' : '💾 Save'}
                    </button>
                    {/* SESSION 31: one-tap share from admin — no need
                        to leave the admin panel to broadcast today's
                        pick. Only enabled once a bhajan is selected. */}
                    <button
                      onClick={() => {
                        const b = publicBhajans.find(x => x.id === dailyEditBhajanId);
                        if (!b) return;
                        handleShareBhajan(b, true, {
                          isDaily: true,
                          dailyNote: (dailyEditNote || '').trim()
                        });
                      }}
                      disabled={!dailyEditBhajanId}
                      className="px-4 bg-[#0B5A70] hover:bg-[#094a5d] disabled:opacity-50 text-white font-semibold py-2 rounded-xl"
                      title="Share this bhajan (uses current selection + note)"
                    >
                      Share
                    </button>
                    <button
                      onClick={clearDailyBhajan}
                      disabled={dailyEditSaving}
                      className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t border-[#0B5A70]/8">
                    Tip: batch-curate a week at a time — pick tomorrow, then use the arrow to jump ahead.
                  </div>
                </div>
              </div>

              {/* SESSION 122: CONTRIBUTORS */}
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-purple-200/60">
                <h3 className="text-lg font-bold text-[#0B5A70] mb-1">🤝 Contributors</h3>
                <p className="text-sm text-gray-600 mb-3">Members who may add bhajans to the Public Library. Their additions are marked Unreviewed until you check them; they can edit only what they added.</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addContributor(); }}
                    placeholder="Member's email (must have signed in once)"
                    className="flex-1 px-3 py-2 border border-[#0B5A70]/20 rounded-xl text-sm outline-none focus:border-[#0B5A70]/40"
                    aria-label="Contributor email"
                  />
                  <button onClick={addContributor} disabled={contributorBusy || !contributorEmail.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-700 text-white disabled:opacity-50">
                    {contributorBusy ? '…' : '+ Add'}
                  </button>
                </div>
                {contributors.length === 0 ? (
                  <p className="text-xs text-gray-500">No contributors yet.</p>
                ) : (
                  <ul className="divide-y divide-[#0B5A70]/8">
                    {contributors.map(c => (
                      <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0B5A70] truncate">{c.displayName || c.email || c.uid}</p>
                          <p className="text-xs text-gray-500 truncate">{c.email || c.uid}{' · '}{publicBhajans.filter(b => b.addedByUid === c.id).length} added</p>
                        </div>
                        <button onClick={() => removeContributor(c)} className="text-xs font-semibold text-red-600 hover:text-red-800 flex-shrink-0">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* SESSION 88: FETCH LYRICS FROM A WEB PAGE */}
              <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_2px_12px_rgba(11,90,112,0.06)] p-6 mb-6 border border-teal-200/60">
                <h3 className="text-lg font-bold text-[#0B5A70] mb-1">🔗 Fetch lyrics from a web page</h3>
                <p className="text-sm text-gray-600 mb-3">Paste the link of a bhajan's own page (not the site's home page); the Devanagari block is picked out for you to check, then opened in the Add Public Bhajan form.</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={fetchUrl}
                    onChange={(e) => setFetchUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchLyricsFromWeb(); }}
                    placeholder="https://…"
                    className="flex-1 min-w-0 px-4 py-3 border border-[#0B5A70]/15 rounded-xl outline-none"
                  />
                  <button
                    onClick={fetchLyricsFromWeb}
                    disabled={fetchBusy || !fetchUrl.trim()}
                    className="px-4 bg-[#0B5A70] hover:bg-[#094a5d] disabled:opacity-50 text-white font-semibold rounded-xl"
                  >
                    {fetchBusy ? 'Fetching…' : 'Fetch'}
                  </button>
                </div>
                {fetchResult && !fetchResult.error && fetchResult.hint && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">💡 {fetchResult.hint}</div>
                )}
                {fetchResult && fetchResult.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠️ {fetchResult.error}</div>
                )}
                {fetchResult && !fetchResult.error && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0B5A70] mb-1">Title</label>
                      <input
                        value={fetchResult.title}
                        onChange={(e) => setFetchResult({ ...fetchResult, title: e.target.value })}
                        className="w-full px-3 py-2 border border-[#0B5A70]/15 rounded-lg outline-none text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#0B5A70]">Lyrics {fetchResult.lyrics ? `· ${fetchResult.lyrics.split('\n').filter(Boolean).length} lines` : '· nothing recognised — use the full page text'}</label>
                        <button onClick={() => setFetchShowFull(v => !v)} className="text-xs text-[#0B5A70] underline underline-offset-2">{fetchShowFull ? 'Hide full page text' : 'Show full page text'}</button>
                      </div>
                      <textarea
                        value={fetchResult.lyrics}
                        onChange={(e) => setFetchResult({ ...fetchResult, lyrics: e.target.value })}
                        rows={12}
                        className="w-full px-3 py-2 border border-[#0B5A70]/15 rounded-lg outline-none text-sm whitespace-pre-wrap"
                        style={{ fontFamily: LYRICS_FONT }}
                      />
                    </div>
                    {fetchShowFull && (
                      <div>
                        <label className="block text-xs font-semibold text-[#0B5A70] mb-1">Full page text (copy what you need into Lyrics)</label>
                        <textarea readOnly value={fetchResult.text} rows={14} className="w-full px-3 py-2 border border-[#0B5A70]/15 rounded-lg outline-none text-xs bg-gray-50 whitespace-pre-wrap" style={{ fontFamily: LYRICS_FONT }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAddPublicBhajan({ title: fetchResult.title, lyrics: fetchResult.lyrics, lyricist: fetchResult.lyricist || '', source: /youtu\.?be/i.test(fetchResult.url) ? fetchResult.url : '' })}
                        disabled={!fetchResult.lyrics.trim()}
                        className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] disabled:opacity-50 text-white font-bold py-3 rounded-xl"
                      >
                        Use in new public bhajan →
                      </button>
                      <button onClick={() => { setFetchResult(null); setFetchUrl(''); }} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl">Clear</button>
                    </div>
                    <p className="text-[11px] text-gray-500">From {fetchResult.host}. Please make sure you have the right to reproduce these lyrics.</p>
                  </div>
                )}
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

            </>
          )}
        </main>

        {/* ==============================================
            PUBLIC BHAJAN ADD/EDIT MODAL (Admin only)
            ============================================== */}
        {showPublicBhajanForm && canContribute && (() => {
          // SESSION 97: same simplified layout as the library form.
          const pIn = 'w-full px-4 py-3 border border-[#0B5A70]/15 rounded-xl focus:ring-4 focus:ring-[#0B5A70]/10 focus:border-[#0B5A70]/30 outline-none bg-[#FFFCF8] text-gray-900';
          const pLabel = 'block text-sm font-semibold text-[#0B5A70] mb-1';
          const pSection = 'text-[11px] font-semibold uppercase tracking-wide mb-2 text-[#0B5A70]/60';
          const hp = (field) => ({
            id: `public-hindi-input-${field}`,
            value: publicBhajanForm[field],
            onChange: (e) => handlePublicHindiInput(e, field),
            onKeyDown: (e) => handlePublicHindiKeyDown(e, field),
            onBlur: () => setTimeout(() => setShowSuggestions(false), 300),
            onFocus: () => setActiveTypingField(field)
          });
          const chips = (field, inline) => (
            hindiTypingEnabled && showSuggestions && activeTypingField === field && transliterationSuggestions.length > 0 ? (
              <TransliterationChips className={inline ? '' : 'absolute bottom-full left-0 right-0 mb-2 z-30'} currentWord={currentWord} suggestions={transliterationSuggestions} onPick={(s) => applyPublicSuggestion(s, field)} darkMode={false} />
            ) : null
          );
          const close = () => { setShowPublicBhajanForm(false); setEditingPublicBhajan(null); };
          const mk = (() => {
            if (!publicBhajanForm.lyrics || !publicBhajanForm.lyrics.trim()) return null;
            const m = getMukhda({ lyrics: publicBhajanForm.lyrics });
            return { n: m ? m.split('\n').length : 0, hasBlank: /\n\s*\n/.test(publicBhajanForm.lyrics.replace(/^\s+/, '')) };
          })();
          const moreOpen = publicFormMore || !!(publicBhajanForm.singer || publicBhajanForm.lyricist);
          return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FFFCF8] rounded-2xl shadow-[0_8px_40px_rgba(11,90,112,0.15)] max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-[#0B5A70]/10 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <h3 className="text-lg font-bold text-[#0B5A70]">
                  {editingPublicBhajan ? 'Edit public bhajan' : 'New public bhajan'}
                </h3>
                <button onClick={close} className="text-gray-500 hover:text-gray-700 text-2xl leading-none" aria-label="Close form">×</button>
              </div>

              <div className="p-6">
                {/* ---------- Title ---------- */}
                <div className="mb-5 relative">
                  <input type="text" {...hp('title')} className={pIn + ' text-lg font-semibold'} placeholder={hindiTypingEnabled ? 'Title — type in English, space converts to Hindi' : 'Title · शीर्षक'} aria-label="Title (required)" />
                  {chips('title')}
                </div>

                {/* ---------- Lyrics ---------- */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <label className={pLabel + ' mb-0'}>Lyrics</label>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setHindiTypingEnabled(!hindiTypingEnabled)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${hindiTypingEnabled ? 'bg-[#0B5A70] text-white border-[#0B5A70]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0B5A70]/20'}`} title={`Typing language: ${hindiTypingEnabled ? 'Hindi (type in English, space converts)' : 'English'} — tap to switch`} aria-label={`Typing language: ${hindiTypingEnabled ? 'Hindi' : 'English'}. Tap to switch.`} aria-pressed={hindiTypingEnabled}>
                        {hindiTypingEnabled ? 'हिं' : 'EN'}
                      </button>
                      <span className="mx-0.5 h-5 w-px bg-[#0B5A70]/15" aria-hidden="true" />
                      <span className="text-[11px] font-semibold mr-0.5 text-[#0B5A70]/70">Upload</span>
                      <AttachBtn kind="camera" disabled={ocrProcessing} onClick={() => publicCameraInputRef.current && publicCameraInputRef.current.click()} title="Camera — photograph the lyrics" />
                      <AttachBtn kind="gallery" disabled={ocrProcessing} onClick={() => publicImageInputRef.current && publicImageInputRef.current.click()} title="Gallery — pick a photo of the lyrics" />
                      <AttachBtn kind="document" disabled={ocrProcessing} onClick={() => publicPdfInputRef.current && publicPdfInputRef.current.click()} title="Document — PDF of the lyrics" />
                      <AttachBtn kind="ai" disabled={ocrProcessing} onClick={() => publicAiInputRef.current && publicAiInputRef.current.click()} title="Read with AI — photo or PDF, including handwriting" />
                    </div>
                  </div>
                  <input ref={publicAiInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleAiRead(f, setPublicBhajanForm); e.target.value = ''; }} />
                  <input ref={publicCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleImageFileForOcr(f, 'photo', setPublicBhajanForm); e.target.value = ''; }} />
                  <input ref={publicImageInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleImageFileForOcr(f, 'image', setPublicBhajanForm); e.target.value = ''; }} />
                  <input ref={publicPdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handlePdfFileForOcr(f, setPublicBhajanForm); e.target.value = ''; }} />

                  {ocrProcessing && (
                    <div className="mb-2 p-3 bg-[#FFFCF8] border border-[#0B5A70]/15 rounded-lg">
                      <div className="w-full bg-[#0B5A70]/10 rounded-full h-2 mb-2"><div className="bg-[#0B5A70] h-2 rounded-full transition-all" style={{ width: ocrProgress + '%' }} /></div>
                      <p className="text-xs font-semibold text-[#0B5A70]">{ocrMessage || 'Reading…'}</p>
                      {!localStorage.getItem('sankirtan-tesseract-langs-cached') && <p className="text-[11px] mt-1 text-gray-500">First use downloads the reader (~15 MB) once; later scans are quick.</p>}
                    </div>
                  )}
                  {!ocrProcessing && ocrMessage && <p className="text-xs font-semibold text-[#0B5A70] mb-2">{ocrMessage}</p>}

                  <div className="mt-4 mb-2">
                    <LyricsToolbar {...lyricsToolbarProps('public')} darkMode={false} />
                  </div>
                  <div className="relative">
                    {lyricsSheet !== 'public' && (
                      <textarea ref={publicLyricsTextareaRef} {...hp('lyrics')} className={pIn + ' text-lg resize-none overflow-y-auto'} placeholder={hindiTypingEnabled ? 'jai shri babosa … (space converts to Hindi)' : 'भजन के बोल यहाँ लिखें…'} style={LYRICS_BOX_STYLE} aria-label="Lyrics (required)" />
                    )}
                    {lyricsSheet === 'public' && (
                      <div className="rounded-xl border border-dashed border-[#0B5A70]/20 p-4 text-sm text-center text-gray-500">Editing in full screen…</div>
                    )}
                    {lyricsSheet !== 'public' && <CaretChips inputId="public-hindi-input-lyrics">{chips('lyrics', true)}</CaretChips>}
                  </div>
                  <LyricsEditorSheet
                    open={lyricsSheet === 'public'}
                    onClose={() => setLyricsSheet(null)}
                    onCancel={() => cancelLyricsSheet('public')}
                    darkMode={false}
                    inputId="public-hindi-input-lyrics"
                    value={publicBhajanForm.lyrics}
                    onChange={(e) => handlePublicHindiInput(e, 'lyrics')}
                    onKeyDown={(e) => handlePublicHindiKeyDown(e, 'lyrics')}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                    onFocus={() => setActiveTypingField('lyrics')}
                    placeholder={hindiTypingEnabled ? 'jai shri babosa … (space converts to Hindi)' : 'भजन के बोल यहाँ लिखें…'}
                    toolbar={lyricsToolbarProps('public')}
                    mukhdaChip={mukhdaChipText(publicBhajanForm.lyrics)}
                    chips={hindiTypingEnabled && showSuggestions && activeTypingField === 'lyrics' && transliterationSuggestions.length > 0 ? (
                      <TransliterationChips currentWord={currentWord} suggestions={transliterationSuggestions} onPick={(s) => applyPublicSuggestion(s, 'lyrics')} darkMode={false} />
                    ) : null}
                  />
                  <p className="mt-1.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500">
                    <span>Blank line after the mukhda.</span>
                    {mk && (
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${mk.hasBlank ? 'bg-[#0B5A70]/8 text-[#0B5A70]' : 'bg-[#E65100]/10 text-[#E65100]'}`}>
                        {mk.hasBlank ? `Mukhda · ${mk.n} line${mk.n === 1 ? '' : 's'}` : 'No blank line yet'}
                      </span>
                    )}
                    {hindiTypingEnabled && <span>· <strong>shyam</strong> → श्याम on space</span>}
                  </p>
                </div>

                {/* ---------- Details ---------- */}
                <p className={pSection}>Details</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1.5 text-[10px] font-semibold pointer-events-none text-gray-500">Deity</span>
                    <select value={publicBhajanForm.deity} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, deity: e.target.value })} className={pIn + ' pt-5 pb-2'} aria-label="Deity">
                      {allDeityOptions.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1.5 text-[10px] font-semibold pointer-events-none text-gray-500">Type</span>
                    <select value={publicBhajanForm.category} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, category: e.target.value })} className={pIn + ' pt-5 pb-2'} aria-label="Type">
                      {allCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <input type="text" {...hp('dhun')} className={pIn} placeholder="तर्ज़ / Tune" aria-label="तर्ज़ / Tune" />
                    {chips('dhun')}
                  </div>
                  <div>
                    <input type="text" value={publicBhajanForm.scale} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, scale: e.target.value })} className={pIn} placeholder="Scale / Raag" aria-label="Scale / Raag" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className={pLabel}>YouTube link</label>
                  <input type="url" value={publicBhajanForm.source} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, source: e.target.value })} className={pIn} placeholder="https://youtube.com/…" />
                </div>

                {/* ---------- More ---------- */}
                <button type="button" onClick={() => setPublicFormMore(v => !v)} aria-expanded={moreOpen} className="text-xs font-semibold mb-3 text-[#0B5A70]">
                  {moreOpen ? '▾' : '+'} Add singer, lyricist…
                </button>
                {moreOpen && (
                  <div className="mb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input type="text" value={publicBhajanForm.singer} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, singer: e.target.value })} className={pIn} placeholder="गायक / Singer" aria-label="Singer" />
                      </div>
                      <div className="relative">
                        <input type="text" {...hp('lyricist')} className={pIn} placeholder="रचनाकार / Lyricist" aria-label="Lyricist" />
                        {chips('lyricist')}
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------- Moods (collapsed) ---------- */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <button type="button" onClick={() => setPublicFormMoods(v => !v)} aria-expanded={publicFormMoods} className="text-xs font-semibold text-[#0B5A70]">
                    {publicFormMoods ? '▾' : '+'} Add mood
                  </button>
                  {!publicFormMoods && publicBhajanForm.keywords.map(kw => (
                    <button key={kw} type="button" onClick={() => togglePublicBhajanKeyword(kw)} title="Remove" className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#0B5A70] text-white">#{kw} ×</button>
                  ))}
                </div>
                <div className={`flex flex-wrap gap-1.5 mb-5 ${publicFormMoods ? '' : 'hidden'}`}>
                  {allKeywordOptions.map(kw => (
                    <button key={kw} type="button" onClick={() => togglePublicBhajanKeyword(kw)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${publicBhajanForm.keywords.includes(kw) ? 'bg-[#0B5A70] text-white' : 'bg-[#0B5A70]/5 text-[#0B5A70] border border-[#0B5A70]/12'}`}>
                      #{kw}
                    </button>
                  ))}
                </div>

                {/* ---------- Review + propagation (admin) ---------- */}
                {!isAdmin && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 mb-4 text-sm text-[#0B5A70]">
                    🙏 Thank you for contributing. Your bhajan goes into the Public Library straight away and is marked <strong>Unreviewed</strong> until the admin checks it.
                  </div>
                )}
                <div className={`rounded-xl border border-purple-200 bg-purple-50/60 p-3 space-y-2 mb-4 ${isAdmin ? '' : 'hidden'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!publicBhajanForm.reviewed} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, reviewed: e.target.checked })} className="w-4 h-4 accent-purple-700" />
                    <span className="text-sm font-semibold text-[#0B5A70]">Reviewed &amp; finalised</span>
                    {editingPublicBhajan && editingPublicBhajan.reviewStatus === 'reviewed' && editingPublicBhajan.reviewedAt && editingPublicBhajan.reviewedAt.toDate && (
                      <span className="text-xs text-gray-500">· {editingPublicBhajan.reviewedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </label>
                  {editingPublicBhajan && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={!!publicBhajanForm.applyToCopies} onChange={(e) => setPublicBhajanForm({ ...publicBhajanForm, applyToCopies: e.target.checked })} className="w-4 h-4 accent-purple-700" />
                      <span className="text-sm font-semibold text-[#0B5A70]">Apply to personal libraries too</span>
                      <span className="text-xs text-gray-500" title="Copies users edited themselves are never touched">· skips user-edited copies</span>
                    </label>
                  )}
                </div>

                {publicBhajanFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠️ {publicBhajanFormError}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={savePublicBhajan} disabled={publicBhajanFormSaving || !publicBhajanForm.title.trim() || !publicBhajanForm.lyrics.trim()} className="flex-1 bg-[#0B5A70] hover:bg-[#094a5d] text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50">
                    {publicBhajanFormSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={close} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold">Cancel</button>
                </div>
                {/* SESSION 113: delete from the edit form */}
                {editingPublicBhajan && isAdmin && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => { const b = editingPublicBhajan; close(); deletePublicBhajan(b); }}
                      className="text-sm font-semibold text-red-600 hover:text-red-800 underline hover:no-underline"
                    >
                      🗑 Delete this bhajan from the Public Library
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}

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
                ? 'bg-[#0f1a1c] border-[#0B5A70]/20'
                : 'bg-[#FFF8F0] border-[#0B5A70]/10 shadow-[0_-2px_12px_rgba(11,90,112,0.06)]'
            }`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Main navigation"
          >
            <div className="max-w-4xl mx-auto flex items-stretch">
              {[
                // SESSION 50: emoji → SVG icon components
                // SESSION 86: one Library tab. Guests get the public library;
                // signed-in users get My Library (which contains all public
                // bhajans since S83).
                ...(user
                  ? [{ view: 'library', label: 'Library', Icon: IconBookOpen, requiresAuth: true }]
                  : [{ view: 'public-library', label: 'Library', Icon: IconGlobe, requiresAuth: false }]),
                // SESSION 87: Playlists and Programs are separate tabs (same
                // list view, different mode).
                { view: 'programs', mode: 'playlist', label: 'Playlists', Icon: IconMusic, requiresAuth: true },
                { view: 'programs', mode: 'program', label: 'Programs', Icon: IconCalendar, requiresAuth: true },
              ].map(tab => {
                const isActive = currentView === tab.view && (!tab.mode || playlistViewMode === tab.mode);
                const isLocked = tab.requiresAuth && guestMode && !user;
                return (
                  <button
                    key={tab.view + (tab.mode || '')}
                    onClick={() => {
                      if (isLocked) {
                        // SESSION 6: explain WHY the screen is about to change,
                        // instead of silently dumping the user on the sign-in page.
                        showToast('Sign in to build your personal library', 'error');
                        setGuestMode(false);
                        setLoading(false);
                        return;
                      }
                      if (tab.mode && playlistViewMode !== tab.mode) {
                        setPlaylistViewMode(tab.mode);
                        try { localStorage.setItem('sankirtan-playlist-view', tab.mode); } catch {}
                        setProgramSearchQuery('');
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
                    <span className="leading-none">
                      {isLocked ? <IconLock size={22} /> : <tab.Icon size={22} />}
                    </span>
                    <span className={`text-[10px] font-semibold ${isActive ? '' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                    {/* SESSION 48: tab-count badges removed. A badge on
                        your own library reads as an unread alert, which
                        it isn't — the number here doesn't need attention. */}
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
      {toastJsx}{printJsx}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-center text-sm font-semibold z-50 shadow-md">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            ⚠️ You're offline. Please check your internet connection.
          </span>
        </div>
      )}
      {/* SESSION 30: "App Updated!" modal removed here too. */}

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
                  className="w-full bg-[#E65100]/10 hover:bg-[#E65100]/20 border-2 border-[#E65100]/40 hover:border-[#E65100]/60 transition-all py-3 px-4 rounded-xl font-semibold text-[#E65100] text-sm shadow-[0_1px_4px_rgba(230,81,0,0.10)]"
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
          <p>Made for the Bhajan Community</p>
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
                Try Again
              </button>
              <button
                onClick={this.handleHardReload}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl"
              >
                Reload App (clears cache)
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
