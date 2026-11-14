import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Linking,
  RefreshControl,
  Switch,
  Keyboard,
  Dimensions,
  Easing,
  Alert,
  NativeModules,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { signInWithBrowser, getStoredToken, signOut } from './auth';
import {
  loadAll,
  markThreadRead,
  markAllRead,
  createRepo,
  starRepo,
  unstarRepo,
  fetchOrgs,
  fetchGists,
  fetchFeed,
  FEED_RANGES,
  AuthError,
  ApiError,
} from './github';

const C = {
  bg: '#000000',
  card: '#101010',
  gray: '#262626',
  grayHi: '#363636',
  btn: '#3a3a3a',
  btnHi: '#575757',
  text: '#ececec',
  soft: '#c4c4c4',
  muted: '#8a8a8a',
  dim: '#5c5c5c',
};

let CUR_LANG = 'hu';
const LangContext = React.createContext({ lang: 'hu' });
const useLang = () => React.useContext(LangContext);

const deviceLang = () => {
  let loc = '';
  try {
    if (Platform.OS === 'ios') {
      const st = NativeModules.SettingsManager && NativeModules.SettingsManager.settings;
      loc = (st && (st.AppleLocale || (st.AppleLanguages && st.AppleLanguages[0]))) || '';
    } else {
      loc = (NativeModules.I18nManager && NativeModules.I18nManager.localeIdentifier) || '';
    }
    if (!loc && typeof Intl !== 'undefined') {
      loc = Intl.DateTimeFormat().resolvedOptions().locale || '';
    }
  } catch (e) {
    loc = '';
  }
  return String(loc).toLowerCase().startsWith('hu') ? 'hu' : 'en';
};

const EN = {
  'Főoldal': 'Home',
  'Repók': 'Repos',
  'Repó': 'Repos',
  'Értesítések': 'Notifications',
  'Mind': 'All',
  'Saját': 'Mine',
  'Csillagozott': 'Starred',
  'Privát': 'Private',
  'Publikus': 'Public',
  'Neked': 'For you',
  'Felkapott': 'Trending',
  'Új': 'New',
  'új': 'new',
  'Mobil': 'Mobile',
  'Említés': 'Mentions',
  'Csillagozott repók': 'Starred repos',
  'Szervezetek': 'Organizations',
  'Gist-ek': 'Gists',
  'Beállítások': 'Settings',
  'Kilépés': 'Sign out',
  'Követő': 'Followers',
  'Követett': 'Following',
  'Fiók beállításai': 'Account settings',
  'Értesítési beállítások': 'Notification settings',
  'Engedélyezett alkalmazások': 'Authorized apps',
  'Keresés a repóid között': 'Search your repos',
  'Böngéssz a projektek között': 'Browse projects',
  'Nincs találat.': 'No results.',
  'Nincs itt semmi.': 'Nothing here.',
  'Nincs még repód.': "You don't have any repos yet.",
  'Még nincs gist-ed.': "You don't have any gists yet.",
  'Nem vagy tagja egy szervezetnek sem.': "You're not a member of any organization.",
  'Csillagozva': 'Starred',
  'Csillag': 'Star',
  'csillag': 'stars',
  'frissítve': 'updated',
  'Feed időszaka': 'Feed period',
  'hozzászólás': 'comment',
  'review kérés': 'review request',
  'hozzád rendelték': 'assigned to you',
  'követett': 'watching',
  'megemlítés': 'mention',
  'állapotváltozás': 'state change',
  'meghívás': 'invitation',
  'biztonsági riasztás': 'security alert',
  'csapat megemlítése': 'team mention',
  'te nyitottad': 'you opened it',
  'tegnap': 'yesterday',
  'most': 'just now',
  'ma': 'today',
  'publikus': 'public',
  'titkos': 'secret',
  'Ma': 'Today',
  'Ezen a héten': 'This week',
  'Ez a hét': 'This week',
  'Ebben a hónapban': 'This month',
  'Ez a hónap': 'This month',
  'Idén': 'This year',
  'Ez az év': 'This year',
  'Legújabb': 'Latest',
  'Előzetes': 'Pre-release',
  'Piszkozat': 'Draft',
  'Kiadások': 'Releases',
  'Kiadás': 'Release',
  'Fájlok': 'Files',
  'Forráskód (zip)': 'Source code (zip)',
  'Forráskód (tar.gz)': 'Source code (tar.gz)',
  'TÖBBI KIADÁS': 'OTHER RELEASES',
  'Szerkesztés': 'Editing',
  'Megnyitás GitHubon': 'Open on GitHub',
  'Commit üzenet': 'Commit message',
  'Tartalom': 'Content',
  'Mentés…': 'Saving…',
  'Mentés a GitHubra': 'Save to GitHub',
  'Előnézet': 'Preview',
  'Forrás': 'Source',
  'Ez a fájl túl hosszú az appban való szerkesztéshez.': 'This file is too long to edit in the app.',
  'Ez a mappa üres.': 'This folder is empty.',
  'A fájl túl nagy az előnézethez.': 'The file is too large to preview.',
  'Ez a fájl nem szöveges, nem jeleníthető meg.': 'This file is not text and cannot be displayed.',
  'A fájl eleje látszik.': 'Only the beginning of the file is shown.',
  'Elveted a módosításokat?': 'Discard your changes?',
  'A nem mentett változtatások elvesznek.': 'Unsaved changes will be lost.',
  'Mégse': 'Cancel',
  'Elvetés': 'Discard',
  'Megnyitás': 'Open',
  'Bezár': 'Close',
  'SVG kép': 'SVG image',
  'A kép nem tölthető be': 'The image could not be loaded',
  'Részletek': 'Details',
  'Új repó': 'New repo',
  'Repó neve': 'Repo name',
  'Leírás (nem kötelező)': 'Description (optional)',
  'Privát repó': 'Private repo',
  'Létrehozás': 'Create',
  'Adj nevet a repónak.': 'Give the repo a name.',
  'Üdv!': 'Welcome!',
  'Lépj be a GitHub-fiókoddal.': 'Sign in with your GitHub account.',
  'Bejelentkezés GitHubbal': 'Sign in with GitHub',
  'Belépés fejlesztőként': 'Sign in as developer',
  'Fejlesztői jelszó': 'Developer password',
  'Belép': 'Sign in',
  'Hibás jelszó.': 'Wrong password.',
  'Nem sikerült a bejelentkezés. Próbáld újra.': 'Sign-in failed. Please try again.',
  'Nem sikerült a bejelentkezés. Ellenőrizd az internetkapcsolatot.': 'Sign-in failed. Check your internet connection.',
  'Lejárt a bejelentkezés.': 'Your sign-in has expired.',
  'Nem sikerült betölteni. Húzd lefelé a frissítéshez.': 'Could not load. Pull down to refresh.',
  'Nem sikerült betölteni az adatokat. Húzd lefelé a frissítéshez.': 'Could not load your data. Pull down to refresh.',
  'Nem sikerült a csillagozás. Húzd lefelé a frissítéshez.': 'Could not update the star. Pull down to refresh.',
  'Nem sikerült betölteni.': 'Could not load.',
  'Nem sikerült betölteni. Ellenőrizd az internetkapcsolatot.': 'Could not load. Check your internet connection.',
  'Nem található (vagy privát, és nincs hozzáférésed).': 'Not found (or private, and you do not have access).',
  'A GitHub átmenetileg korlátozta a kéréseket. Próbáld később.': 'GitHub has temporarily limited requests. Try again later.',
  'Ilyen nevű repód már van, vagy érvénytelen a név.': 'You already have a repo with that name, or the name is invalid.',
  'Nem sikerült létrehozni a repót.': 'Could not create the repo.',
  'A fájl közben megváltozott a GitHubon. Lépj ki, nyisd meg újra, és szerkeszd újra.': 'The file changed on GitHub in the meantime. Go back, reopen it and edit it again.',
  'Nincs írási jogod ehhez a repóhoz (vagy a belépési token nem engedi a módosítást).': 'You do not have write access to this repo (or your sign-in token does not allow changes).',
  'Nem sikerült menteni. Ellenőrizd az internetkapcsolatot.': 'Could not save. Check your internet connection.',
  'Kártyatárca vonalkód-olvasóval és húzós gombokkal': 'Card wallet with a barcode scanner and swipe buttons',
  'Egy app minden eszközhöz: számítógép, óra, fülhallgató': 'One app for all your devices: computer, watch, earbuds',
  'Saját GitHub-kliens telefonra': 'My own GitHub client for phones',
  'Író app könyvespolccal regényekhez és versekhez': 'Writing app with a bookshelf for novels and poems',
  'Platform univerzális natív appok készítéséhez Reacttel': 'Platform for building universal native apps with React',
  'Keretrendszer natív appokhoz Reacttel': 'Framework for native apps with React',
  'Animációs könyvtár React Native-hez': 'Animation library for React Native',
  'Platform univerzális natív appokhoz': 'Platform for universal native apps',
  'Meta nyílt forráskódú projektjei': "Meta's open-source projects",
  'PocketBase kliens React Native-hez, offline szinkronnal és típusokkal.': 'PocketBase client for React Native with offline sync and types.',
  'Moduláris jegyzetelő alkalmazás helyi tárolással és titkosítással.': 'Modular note-taking app with local storage and encryption.',
  'Minimalista időzítő és fókusz app, reklám és fiók nélkül.': 'Minimalist timer and focus app, with no ads and no account.',
  'Magyar hivatali űrlapok kitöltése parancssorból.': 'Fill in Hungarian government forms from the command line.',
  'Gyors, kicsi diagramkönyvtár, függőségek nélkül.': 'Fast, tiny charting library with no dependencies.',
  'Nyílt forráskódú helyi zenelejátszó, szép felülettel.': 'Open-source local music player with a nice interface.',
  'Fájlszinkron több eszköz között, szerver nélkül.': 'File sync between multiple devices, no server needed.',
  'Weboldal-adatgyűjtő eszközkészlet kezdőknek.': 'Web scraping toolkit for beginners.',
  'Kézmozdulatok és animációk React Native-hez, példákkal.': 'Gestures and animations for React Native, with examples.',
  'Vonalkód-olvasó nem találja a kamerát Androidon': 'Barcode scanner cannot find the camera on Android',
  'Eszközlista betöltési hiba': 'Device list loading error',
  'Kártyák rendezése húzással': 'Reordering cards by dragging',
  'Új fájl': 'New file',
  'Új mappa': 'New folder',
  'Új kiadás': 'New release',
  'Új fájl létrehozása': 'Create new file',
  'Új mappa létrehozása': 'Create new folder',
  'Új kiadás létrehozása': 'Create new release',
  'Fájlok feltöltése': 'Upload files',
  'Fájl neve': 'File name',
  'Mappa neve': 'Folder name',
  'Bővebb leírás (nem kötelező)': 'Extended description (optional)',
  'Commit közvetlenül ide:': 'Commit directly to:',
  'Commit változtatások': 'Commit changes',
  'Feltöltés': 'Uploading',
  'Koppints a fájlok kiválasztásához': 'Tap to choose your files',
  'Legfeljebb 100 fájl, egyenként legfeljebb 25 MB.': 'Up to 100 files, 25 MB each.',
  'Válassz ki legalább egy fájlt.': 'Choose at least one file.',
  'Adj meg egy fájlnevet.': 'Enter a file name.',
  'Adj meg egy mappanevet.': 'Enter a folder name.',
  'Érvénytelen név (nem lehet üres, . vagy .. rész, és nem kezdődhet vagy végződhet /-rel).': 'Invalid name (no empty, . or .. parts, and it cannot start or end with /).',
  'Ilyen nevű fájl már létezik ezen az útvonalon.': 'A file with that name already exists at this path.',
  'Az ág közben megváltozott a GitHubon. Próbáld újra.': 'The branch changed on GitHub in the meantime. Try again.',
  'A GitHub nem tárol üres mappát, ezért egy .gitkeep fájl kerül bele.': 'GitHub does not store empty folders, so a .gitkeep file is added inside.',
  'Egy vagy több fájl túl nagy (vagy túl sok a fájl), ezeket kihagytam.': 'One or more files were too large (or there were too many), so they were skipped.',
  'Fájlok kiválasztásához telepítsd az expo-document-picker csomagot.': 'Install the expo-document-picker package to choose files.',
  'Nem sikerült a fájlok kiválasztása.': 'Could not choose the files.',
  'Tag': 'Tag',
  'Adj meg egy taget.': 'Enter a tag.',
  'A tag nem tartalmazhat szóközt.': 'A tag cannot contain spaces.',
  'Ha a tag még nem létezik, közzétételkor létrejön ezen az ágon:': 'If the tag does not exist yet, it is created on publish from:',
  'Kiadás címe': 'Release title',
  'Leírás': 'Description',
  'Kiadási jegyzetek generálása': 'Generate release notes',
  'Nem sikerült a jegyzetek generálása.': 'Could not generate release notes.',
  'Mi változott ebben a kiadásban?': 'Describe this release',
  'Fájlok csatolása': 'Attach files',
  'Előzetes kiadás': 'Set as a pre-release',
  'Legújabb kiadás': 'Set as the latest release',
  'Kiadás közzététele': 'Publish release',
  'Piszkozat mentése': 'Save draft',
  'Ilyen tagű kiadás már létezik, vagy érvénytelen a tag.': 'A release with this tag already exists, or the tag is invalid.',
  'A kiadás piszkozatként létrejött, de egy fájl feltöltése nem sikerült. Próbáld újra.': 'The release was created as a draft, but a file upload failed. Try again.',
  'Még nincs kiadás.': 'No releases yet.',
  'Fordítás…': 'Translating…',
};

const REL_UNIT = {
  'másodperce': 'second',
  'perce': 'minute',
  'órája': 'hour',
  'napja': 'day',
  'hete': 'week',
  'hónapja': 'month',
  'éve': 'year',
};
const EN_RULES = [
  [/^Olvasatlan \((\d+)\)$/, (m) => `Unread (${m[1]})`],
  [/^\+(\d+) ma$/, (m) => `+${m[1]} today`],
  [/^(\d+) fájl$/, (m) => (m[1] === '1' ? '1 file' : `${m[1]} files`)],
  [/^(\d+) letöltés$/, (m) => (m[1] === '1' ? '1 download' : `${m[1]} downloads`)],
  [
    /^(\d+) (másodperce|perce|órája|napja|hete|hónapja|éve)$/,
    (m) => `${m[1]} ${REL_UNIT[m[2]]}${m[1] === '1' ? '' : 's'} ago`,
  ],
];

const tr = (s) => {
  if (CUR_LANG !== 'en' || typeof s !== 'string' || !s) return s;
  if (Object.prototype.hasOwnProperty.call(EN, s)) return EN[s];
  for (let i = 0; i < EN_RULES.length; i++) {
    const m = s.match(EN_RULES[i][0]);
    if (m) return EN_RULES[i][1](m);
  }
  if (s.indexOf('  ·  ') !== -1) return s.split('  ·  ').map(tr).join('  ·  ');
  return s;
};

const OCTOGIT_LOGO = require('./assets/octogit.png');

const REPOS = [
  { id: 'r1', owner: 'akosdevhu', name: 'QuickWallet', desc: 'Kártyatárca vonalkód-olvasóval és húzós gombokkal', lang: 'JavaScript', stars: 3, forks: 0, updated: '12 perce', isPrivate: false, scope: ['mine'] },
  { id: 'r2', owner: 'akosdevhu', name: 'QuickHome', desc: 'Egy app minden eszközhöz: számítógép, óra, fülhallgató', lang: 'JavaScript', stars: 0, forks: 0, updated: '3 órája', isPrivate: true, scope: ['mine'] },
  { id: 'r3', owner: 'akosdevhu', name: 'GitHubApp', desc: 'Saját GitHub-kliens telefonra', lang: 'JavaScript', stars: 0, forks: 0, updated: '1 hete', isPrivate: true, scope: ['mine'] },
  { id: 'r4', owner: 'akosdevhu', name: 'WritingApp', desc: 'Író app könyvespolccal regényekhez és versekhez', lang: 'JavaScript', stars: 0, forks: 0, updated: '2 hete', isPrivate: true, scope: ['mine'] },
  { id: 'r5', owner: 'expo', name: 'expo', desc: 'Platform univerzális natív appok készítéséhez Reacttel', lang: 'TypeScript', stars: 46000, forks: 5200, updated: '1 órája', isPrivate: false, scope: ['starred'] },
  { id: 'r6', owner: 'facebook', name: 'react-native', desc: 'Keretrendszer natív appokhoz Reacttel', lang: 'C++', stars: 120000, forks: 24000, updated: 'tegnap', isPrivate: false, scope: ['starred'] },
  { id: 'r7', owner: 'software-mansion', name: 'react-native-reanimated', desc: 'Animációs könyvtár React Native-hez', lang: 'TypeScript', stars: 9000, forks: 1200, updated: '2 napja', isPrivate: false, scope: ['starred'] },
];

const MOCK_USER = { name: 'Ákos', login: 'akosdevhu', avatar: null, repos: 12, followers: 4, following: 18 };

const MOCK_ORGS = [
  { id: 'o1', title: 'expo', sub: 'Platform univerzális natív appokhoz', url: 'https://github.com/expo' },
  { id: 'o2', title: 'facebook', sub: 'Meta nyílt forráskódú projektjei', url: 'https://github.com/facebook' },
];
const MOCK_GISTS = [
  { id: 'g1', title: 'rn-gesture-minta.js', sub: 'publikus  ·  1 fájl  ·  2 napja', url: 'https://gist.github.com' },
  { id: 'g2', title: 'jegyzetek.md', sub: 'titkos  ·  1 fájl  ·  1 hete', url: 'https://gist.github.com' },
];
const SETTINGS_LINKS = [
  { id: 's1', title: 'Fiók beállításai', sub: 'github.com/settings/profile', url: 'https://github.com/settings/profile' },
  { id: 's2', title: 'Értesítési beállítások', sub: 'github.com/settings/notifications', url: 'https://github.com/settings/notifications' },
  { id: 's3', title: 'Engedélyezett alkalmazások', sub: 'github.com/settings/applications', url: 'https://github.com/settings/applications' },
];

const REPO_FILTERS = [
  { key: 'all', label: 'Mind' },
  { key: 'mine', label: 'Saját' },
  { key: 'starred', label: 'Csillagozott' },
  { key: 'private', label: 'Privát' },
];

const FEED = [
  { id: 'f1', owner: 'nordlicht', name: 'pocketbase-rn', desc: 'PocketBase kliens React Native-hez, offline szinkronnal és típusokkal.', lang: 'TypeScript', stars: 2400, forks: 180, trend: '+120 ma', topics: ['react-native', 'backend', 'offline'], tags: ['felkapott', 'Mobil'] },
  { id: 'f2', owner: 'tessera', name: 'tessera', desc: 'Moduláris jegyzetelő alkalmazás helyi tárolással és titkosítással.', lang: 'Rust', stars: 8700, forks: 410, trend: '+310 ma', topics: ['notes', 'privacy', 'desktop'], tags: ['felkapott', 'Rust'] },
  { id: 'f3', owner: 'kavics', name: 'kavics', desc: 'Minimalista időzítő és fókusz app, reklám és fiók nélkül.', lang: 'Kotlin', stars: 640, forks: 32, trend: 'új', topics: ['android', 'productivity'], tags: ['új', 'Mobil'] },
  { id: 'f4', owner: 'hivatal-hu', name: 'ugyfelkapu-cli', desc: 'Magyar hivatali űrlapok kitöltése parancssorból.', lang: 'Python', stars: 1300, forks: 90, trend: '+45 ma', topics: ['cli', 'automation'], tags: ['felkapott', 'Python'] },
  { id: 'f5', owner: 'orbit', name: 'orbit-charts', desc: 'Gyors, kicsi diagramkönyvtár, függőségek nélkül.', lang: 'JavaScript', stars: 15200, forks: 900, trend: '+80 ma', topics: ['charts', 'dataviz'], tags: ['felkapott', 'JavaScript'] },
  { id: 'f6', owner: 'mira', name: 'mira-player', desc: 'Nyílt forráskódú helyi zenelejátszó, szép felülettel.', lang: 'Kotlin', stars: 5200, forks: 260, trend: 'új', topics: ['music', 'android', 'player'], tags: ['új', 'Mobil'] },
  { id: 'f7', owner: 'fenyo', name: 'fenyo-sync', desc: 'Fájlszinkron több eszköz között, szerver nélkül.', lang: 'Rust', stars: 3100, forks: 140, trend: 'új', topics: ['sync', 'p2p'], tags: ['új', 'Rust'] },
  { id: 'f8', owner: 'daruvasarlo', name: 'scraper-kit', desc: 'Weboldal-adatgyűjtő eszközkészlet kezdőknek.', lang: 'Python', stars: 980, forks: 70, trend: 'új', topics: ['scraping', 'data'], tags: ['új', 'Python'] },
  { id: 'f9', owner: 'szivarvany', name: 'rn-gestures', desc: 'Kézmozdulatok és animációk React Native-hez, példákkal.', lang: 'JavaScript', stars: 1900, forks: 120, trend: '+22 ma', topics: ['react-native', 'animation'], tags: ['JavaScript', 'Mobil'] },
];

const FEED_FILTERS = [
  { key: 'all', label: 'Neked' },
  { key: 'felkapott', label: 'Felkapott' },
  { key: 'új', label: 'Új' },
  { key: 'JavaScript', label: 'JavaScript' },
  { key: 'Python', label: 'Python' },
  { key: 'Rust', label: 'Rust' },
  { key: 'Mobil', label: 'Mobil' },
];

const INITIAL_NOTIFS = [
  { id: 'n1', repo: 'akosdevhu/QuickWallet', title: 'Vonalkód-olvasó nem találja a kamerát Androidon', reason: 'comment', meta: 'hozzászólás', time: '12 perce', unread: true },
  { id: 'n2', repo: 'expo/expo', title: 'Fix SecureStore keychain access on iOS 18', reason: 'review', meta: 'review kérés', time: '1 órája', unread: true },
  { id: 'n3', repo: 'akosdevhu/QuickHome', title: 'Eszközlista betöltési hiba', reason: 'assign', meta: 'hozzád rendelték', time: '3 órája', unread: true },
  { id: 'n4', repo: 'kovacs-peter/mobile-ui', title: 'Add dark mode tokens to theme', reason: 'review', meta: 'review kérés', time: '5 órája', unread: true },
  { id: 'n5', repo: 'facebook/react-native', title: 'Update Hermes to latest version', reason: 'watch', meta: 'követett', time: 'tegnap', unread: false },
  { id: 'n6', repo: 'akosdevhu/QuickWallet', title: 'Kártyák rendezése húzással', reason: 'mention', meta: 'megemlítés', time: '2 napja', unread: false },
];

const REASON_ICON = {
  comment: 'chatbubble-outline',
  review: 'eye-outline',
  assign: 'person-add-outline',
  watch: 'bookmark-outline',
  mention: 'at-outline',
};

const ICON_COLOR = {
  'lock-closed-outline': '#ffb74d',
  'book-outline': '#4da3ff',
  'chatbubble-outline': '#4da3ff',
  'eye-outline': '#b388ff',
  'person-add-outline': '#4ade80',
  'bookmark-outline': '#ffd54f',
  'at-outline': '#ff8a65',
  'notifications-outline': '#ffd54f',
  'code-slash-outline': '#4da3ff',
  'star-outline': '#ffd54f',
  star: '#ffd54f',
  'git-branch-outline': '#4ade80',
  'search-outline': '#4da3ff',
  'close-circle': '#ff6b6b',
  add: '#4ade80',
  'checkmark-done-outline': '#4da3ff',
  'options-outline': '#b388ff',
  close: '#ff6b6b',
  'business-outline': '#4da3ff',
  'settings-outline': '#ff8a65',
  'log-out-outline': '#ff6b6b',
  'folder-outline': '#4da3ff',
  'document-text-outline': '#b388ff',
  'open-outline': '#4da3ff',
  'git-network-outline': '#4ade80',
  'pricetag-outline': '#4ade80',
  'download-outline': '#4da3ff',
  'cube-outline': '#ffb74d',
  'document-outline': '#8a8a8a',
  'image-outline': '#4ade80',
  'create-outline': '#ffd54f',
  checkmark: '#4ade80',
  'cloud-upload-outline': '#4da3ff',
};
const ic = (name) => ICON_COLOR[name] || C.text;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SCALE = 0.95;
const PRESS_DELAY = 110;
function Btn({ style, onPress, onPressIn, onPressOut, activeOpacity, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef(null);
  const shown = useRef(false);
  const wasShown = useRef(false);
  const to = (v) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          shown.current = true;
          to(PRESS_SCALE);
        }, PRESS_DELAY);
        onPressIn && onPressIn(e);
      }}
      onPressOut={(e) => {
        clearTimeout(timer.current);
        wasShown.current = shown.current;
        if (shown.current) to(1);
        shown.current = false;
        onPressOut && onPressOut(e);
      }}
      onPress={
        onPress
          ? (e) => {
              if (!wasShown.current) {
                Animated.sequence([
                  Animated.timing(scale, { toValue: PRESS_SCALE, duration: 80, useNativeDriver: true }),
                  Animated.delay(60),
                  Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
                ]).start();
              }
              wasShown.current = false;
              onPress(e);
            }
          : undefined
      }
    >
      {children}
    </AnimatedPressable>
  );
}

const fmt = (n) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

const pullRefresh = (refreshing, onRefresh) =>
  onRefresh ? (
    <RefreshControl
      refreshing={!!refreshing}
      onRefresh={onRefresh}
      tintColor={C.muted}
      colors={[C.muted]}
      progressBackgroundColor={C.card}
    />
  ) : undefined;

const repoSheet = (r) => ({
  icon: r.isPrivate ? 'lock-closed-outline' : 'book-outline',
  overline: r.owner,
  title: r.name,
  body: tr(r.desc),
  meta: `${r.lang}  ·  ${fmt(r.stars)} ${tr('csillag')}  ·  ${tr('frissítve')} ${tr(r.updated)}`,
  url: r.url || `https://github.com/${r.owner}/${r.name}`,
  repo: { owner: r.owner, name: r.name, desc: r.desc, lang: r.lang, stars: r.stars, forks: r.forks, isPrivate: r.isPrivate, url: r.url },
});

const notifSheet = (n) => ({
  icon: REASON_ICON[n.reason] || 'notifications-outline',
  overline: n.repo,
  title: tr(n.title),
  tTitle: true,
  body: '',
  meta: `${tr(n.meta)}  ·  ${tr(n.time)}`,
  url: n.url || `https://github.com/${n.repo}`,
});

function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{tr(title)}</Text>
      {!!onAction && (
        <Btn style={styles.linkBtn} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.linkBtnText}>{tr(action)}</Text>
          <Ionicons name="chevron-forward" size={14} color={C.text} />
        </Btn>
      )}
    </View>
  );
}

const HEADER_SLIDE = 16;

const Header = React.memo(function Header({
  position,
  scrollXJS,
  width,
  onProfile,
  onMarkAll,
  onAdd,
  onFeedOptions,
  user,
}) {
  useLang();
  const range = (i) => [i - 1, i, i + 1];

  const [page, setPage] = useState(0);
  useEffect(() => {
    let cur = 0;
    const id = scrollXJS.addListener(({ value }) => {
      const next = clamp(Math.round(value / width), 0, TABS.length - 1);
      if (next !== cur) {
        cur = next;
        setPage(next);
      }
    });
    return () => scrollXJS.removeListener(id);
  }, [scrollXJS, width]);

  const rights = useMemo(
    () => [
      null,
      <RoundBtn icon="add" onPress={onAdd} />,
      <RoundBtn icon="checkmark-done-outline" onPress={onMarkAll} />,
      <RoundBtn icon="options-outline" onPress={onFeedOptions} />,
    ],
    [onMarkAll, onAdd, onFeedOptions]
  );

  return (
    <View style={styles.header}>
      <Btn style={styles.avatar} onPress={onProfile} activeOpacity={0.8}>
        {user && user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{((user && user.name) || '?')[0].toUpperCase()}</Text>
        )}
      </Btn>

      <View style={styles.headerTitleBox}>
        {TABS.map((t, i) => (
          <Animated.Text
            key={t.key}
            pointerEvents="none"
            numberOfLines={1}
            style={[
              styles.headerTitle,
              styles.headerLayer,
              {
                opacity: position.interpolate({
                  inputRange: range(i),
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: position.interpolate({
                      inputRange: range(i),
                      outputRange: [HEADER_SLIDE, 0, -HEADER_SLIDE],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {tr(t.label)}
          </Animated.Text>
        ))}
      </View>

      <View style={styles.headerRightSlot}>
        {rights.map((node, i) =>
          node ? (
            <Animated.View
              key={TABS[i].key}
              pointerEvents={page === i ? 'auto' : 'none'}
              style={[
                styles.headerLayer,
                {
                  opacity: position.interpolate({
                    inputRange: range(i),
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      scale: position.interpolate({
                        inputRange: range(i),
                        outputRange: [0.5, 1, 0.5],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            >
              {node}
            </Animated.View>
          ) : null
        )}
      </View>
    </View>
  );
});

function RoundBtn({ icon, onPress }) {
  return (
    <Btn style={styles.roundBtn} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={20} color={ic(icon)} />
    </Btn>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={18} color={ic('search-outline')} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={tr(placeholder)}
        placeholderTextColor={C.dim}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Btn onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={18} color={ic('close-circle')} />
        </Btn>
      )}
    </View>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <View style={{ height: 52 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {options.map((o) => {
          const on = value === o.key;
          return (
            <Btn
              key={o.key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(o.key)}
              activeOpacity={0.8}
            >
              <Text numberOfLines={1} style={[styles.chipText, on && styles.chipTextOn]}>{tr(o.label)}</Text>
            </Btn>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MetaItem({ icon, text }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={ic(icon)} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function EmptyText({ children }) {
  return <Text style={styles.empty}>{typeof children === 'string' ? tr(children) : children}</Text>;
}

function RepoCard({ repo, onPress }) {
  return (
    <Btn style={styles.card} onPress={() => onPress(repo)} activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Ionicons
          name={repo.isPrivate ? 'lock-closed-outline' : 'book-outline'}
          size={18}
          color={ic(repo.isPrivate ? 'lock-closed-outline' : 'book-outline')}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowCenter}>
          <Text style={styles.cardOwner} numberOfLines={1}>{repo.owner}</Text>
          <View style={styles.tinyPill}>
            <Text style={styles.tinyPillText}>{tr(repo.isPrivate ? 'Privát' : 'Publikus')}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{repo.name}</Text>
        <AText style={styles.cardDesc} numberOfLines={2}>{repo.desc}</AText>
        <View style={styles.metaRow}>
          <MetaItem icon="code-slash-outline" text={repo.lang} />
          <MetaItem icon="star-outline" text={fmt(repo.stars)} />
          <MetaItem icon="git-branch-outline" text={fmt(repo.forks)} />
          <Text style={styles.metaText}>{tr(repo.updated)}</Text>
        </View>
      </View>
    </Btn>
  );
}

function ReposScreen({ repos, filter, onFilter, onOpen, refreshing, onRefresh }) {
  const [query, setQuery] = useState('');

  const list = repos.filter((r) => {
    const okFilter =
      filter === 'all' ||
      (filter === 'private' ? r.isPrivate : r.scope.includes(filter));
    const q = query.trim().toLowerCase();
    const okQuery =
      !q || `${r.owner}/${r.name} ${r.desc}`.toLowerCase().includes(q);
    return okFilter && okQuery;
  });

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={pullRefresh(refreshing, onRefresh)}
      >
        <SearchBar value={query} onChange={setQuery} placeholder="Keresés a repóid között" />
        <Chips options={REPO_FILTERS} value={filter} onChange={onFilter} />
        <View style={styles.listPad}>
          {list.length === 0 ? (
            <EmptyText>Nincs találat.</EmptyText>
          ) : (
            list.map((r) => (
              <RepoCard
                key={r.id}
                repo={r}
                onPress={() => onOpen(repoSheet(r))}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function NotifCard({ n, onPress }) {
  return (
    <Btn style={styles.card} onPress={() => onPress(n)} activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Ionicons
          name={REASON_ICON[n.reason] || 'notifications-outline'}
          size={18}
          color={ic(REASON_ICON[n.reason] || 'notifications-outline')}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowCenter}>
          <Text style={styles.cardOwner} numberOfLines={1}>{n.repo}</Text>
          {n.unread && <View style={styles.unreadDot} />}
        </View>
        <AText style={styles.cardTitle} numberOfLines={2}>{n.title}</AText>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: C.soft, fontWeight: '700' }]}>{tr(n.meta)}</Text>
          <Text style={styles.metaText}>{tr(n.time)}</Text>
        </View>
      </View>
    </Btn>
  );
}

function NotificationsScreen({ notifs, onOpenNotif, refreshing, onRefresh }) {
  const [filter, setFilter] = useState('unread');

  const unreadCount = notifs.filter((n) => n.unread).length;
  const options = [
    { key: 'unread', label: `Olvasatlan (${unreadCount})` },
    { key: 'all', label: 'Mind' },
    { key: 'review', label: 'Review' },
    { key: 'mention', label: 'Említés' },
  ];

  const list = notifs.filter((n) => {
    if (filter === 'unread') return n.unread;
    if (filter === 'all') return true;
    return n.reason === filter;
  });

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={pullRefresh(refreshing, onRefresh)}
      >
        <Chips options={options} value={filter} onChange={setFilter} />
        <View style={styles.listPad}>
          {list.length === 0 ? (
            <EmptyText>Nincs itt semmi.</EmptyText>
          ) : (
            list.map((n) => <NotifCard key={n.id} n={n} onPress={onOpenNotif} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HomeScreen({
  repos,
  notifs,
  onOpen,
  onOpenNotif,
  onSeeRepos,
  onSeeNotifs,
  refreshing,
  onRefresh,
}) {
  const notifList = [...notifs].sort((a, b) => Number(b.unread) - Number(a.unread)).slice(0, 4);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={pullRefresh(refreshing, onRefresh)}
      >
        <View style={styles.listPad}>
          <SectionHeader title="Repók" action="Mind" onAction={onSeeRepos} />
          {repos.length === 0 && <EmptyText>Nincs még repód.</EmptyText>}
          {repos.slice(0, 4).map((r) => (
            <RepoCard key={r.id} repo={r} onPress={() => onOpen(repoSheet(r))} />
          ))}

          <SectionHeader title="Értesítések" action="Mind" onAction={onSeeNotifs} />
          {notifList.length === 0 ? (
            <EmptyText>Nincs itt semmi.</EmptyText>
          ) : (
            notifList.map((n) => <NotifCard key={n.id} n={n} onPress={onOpenNotif} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function FeedCard({ item, starred, delta, onToggleStar, onPress }) {
  return (
    <Btn style={styles.feedCard} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.rowCenter}>
        <View style={styles.ownerAvatar}>
          <Text style={styles.ownerAvatarText}>{item.owner[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.feedOwner} numberOfLines={1}>{item.owner}</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.tinyPill}>
          <Text style={styles.tinyPillText}>{tr(item.trend)}</Text>
        </View>
      </View>

      <Text style={styles.feedName}>{item.name}</Text>
      <AText style={styles.feedDesc} numberOfLines={3}>{item.desc}</AText>

      <View style={styles.topicRow}>
        {item.topics.map((t) => (
          <View key={t} style={styles.topic}>
            <Text style={styles.topicText}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={styles.feedBottom}>
        <MetaItem icon="code-slash-outline" text={item.lang} />
        <MetaItem icon="star-outline" text={fmt(item.stars + (delta || 0))} />
        <MetaItem icon="git-branch-outline" text={fmt(item.forks)} />
        <View style={{ flex: 1 }} />
        <Btn
          style={[styles.starBtn, starred && styles.starBtnOn]}
          onPress={() => onToggleStar(item)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={starred ? 'star' : 'star-outline'}
            size={15}
            color={ic('star-outline')}
          />
          <Text style={styles.starBtnText}>{tr(starred ? 'Csillagozva' : 'Csillag')}</Text>
        </Btn>
      </View>
    </Btn>
  );
}

function FeedScreen({ token, range, topLang, starredSet, onToggleStar, onOpen }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(token ? [] : FEED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [delta, setDelta] = useState({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setItems(await fetchFeed(token, filter, range, topLang));
      setDelta({});
    } catch (e) {
      setError('Nem sikerült betölteni. Húzd lefelé a frissítéshez.');
    } finally {
      setLoading(false);
    }
  }, [token, filter, range, topLang]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStar = (item) => {
    const was = starredSet.has(`${item.owner}/${item.name}`);
    onToggleStar(item);
    setDelta((d) => ({ ...d, [item.id]: (d[item.id] || 0) + (was ? -1 : 1) }));
  };

  const list = items.filter((f) => {
    const okFilter = token ? true : filter === 'all' || f.tags.includes(filter);
    const q = query.trim().toLowerCase();
    const okQuery =
      !q || `${f.owner}/${f.name} ${f.desc} ${f.topics.join(' ')}`.toLowerCase().includes(q);
    return okFilter && okQuery;
  });

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={pullRefresh(loading, token ? load : undefined)}
      >
        <SearchBar value={query} onChange={setQuery} placeholder="Böngéssz a projektek között" />
        <Chips options={FEED_FILTERS} value={filter} onChange={setFilter} />
        <View style={styles.listPad}>
          {!!error && <EmptyText>{error}</EmptyText>}
          {loading && items.length === 0 ? (
            <ActivityIndicator color={C.muted} style={{ marginVertical: 28 }} />
          ) : list.length === 0 && !error ? (
            <EmptyText>Nincs találat.</EmptyText>
          ) : (
            list.map((f) => (
              <FeedCard
                key={f.id}
                item={f}
                starred={starredSet.has(`${f.owner}/${f.name}`)}
                delta={delta[f.id]}
                onToggleStar={toggleStar}
                onPress={() =>
                  onOpen({
                    icon: 'book-outline',
                    overline: f.owner,
                    title: f.name,
                    body: tr(f.desc),
                    meta: `${f.lang}  ·  ${fmt(f.stars + (delta[f.id] || 0))} ${tr('csillag')}  ·  ${tr(f.trend)}`,
                    url: f.url || `https://github.com/${f.owner}/${f.name}`,
                    repo: { owner: f.owner, name: f.name, desc: f.desc, lang: f.lang, stars: f.stars + (delta[f.id] || 0), forks: f.forks, isPrivate: false, url: f.url },
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ACCOUNT_MENU = [
  { key: 'starred', label: 'Csillagozott repók', icon: 'star-outline' },
  { key: 'orgs', label: 'Szervezetek', icon: 'business-outline' },
  { key: 'gists', label: 'Gist-ek', icon: 'code-slash-outline' },
  { key: 'settings', label: 'Beállítások', icon: 'settings-outline' },
  { key: 'logout', label: 'Kilépés', icon: 'log-out-outline' },
];

function ProfileModal({ visible, onClose, onLogout, onMenu, user }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.profileWrap}>
        <View style={styles.profileTop}>
          <RoundBtn icon="close" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.profileHead}>
            <View style={styles.bigAvatar}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.bigAvatarImg} />
              ) : (
                <Text style={styles.bigAvatarText}>{user.name[0].toUpperCase()}</Text>
              )}
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileLogin}>@{user.login}</Text>
          </View>

          <View style={styles.statBoxes}>
            {[
              { n: String(user.repos), l: 'Repó' },
              { n: String(user.followers), l: 'Követő' },
              { n: String(user.following), l: 'Követett' },
            ].map((s) => (
              <View key={s.l} style={styles.statBox}>
                <Text style={styles.statNum}>{s.n}</Text>
                <Text style={styles.statLabel}>{tr(s.l)}</Text>
              </View>
            ))}
          </View>

          {ACCOUNT_MENU.map((m) => (
            <Btn
              key={m.key}
              style={styles.menuRow}
              activeOpacity={0.8}
              onPress={() => {
                if (m.key === 'logout') {
                  onClose();
                  onLogout();
                } else {
                  onMenu(m.key);
                }
              }}
            >
              <Ionicons name={m.icon} size={20} color={ic(m.icon)} />
              <Text style={styles.menuLabel}>{tr(m.label)}</Text>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Btn>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const GH_API = 'https://api.github.com';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const FILE_MAX_BYTES = 200000;
const FILE_MAX_CHARS = 60000;
const MD_MAX_LINES = 2500;
const FILES_PREVIEW = 5;
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|ico|avif)$/i;
const MD_EXT = /\.(md|markdown|mdx)$/i;
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
};
const HU_MONTHS = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function ghGet(path, token, raw) {
  const res = await fetch(GH_API + path, {
    headers: {
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const e = new Error(String(res.status));
    e.status = res.status;
    throw e;
  }
  return raw ? res.text() : res.json();
}

async function ghSend(method, path, token, body) {
  const res = await fetch(GH_API + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = new Error(String(res.status));
    e.status = res.status;
    throw e;
  }
  return res.json();
}

const UPLOAD_FILE_MAX = 25 * 1024 * 1024; // same limit as uploading in the browser on github.com
const UPLOAD_FILES_MAX = 100;
const RELEASE_FILE_MAX = 200 * 1024 * 1024;

// expo-document-picker is loaded lazily so the app still starts if it is not installed yet.
let DocPicker = null;
try {
  DocPicker = require('expo-document-picker');
} catch (e) {
  DocPicker = null;
}

async function pickFiles() {
  if (!DocPicker) throw new Error('nopicker');
  const r = await DocPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
  if (!r || r.canceled || r.type === 'cancel') return [];
  const list = r.assets || (r.uri ? [r] : []);
  return list.map((a) => ({ uri: a.uri, name: a.name, size: a.size || 0, mime: a.mimeType || '' }));
}

async function readBase64(uri) {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = () => reject(new Error('read'));
    fr.readAsDataURL(blob);
  });
}

const parentDir = (p) => (p.includes('/') ? p.split('/').slice(0, -1).join('/') : '');
const joinPath = (d, n) => (d ? `${d}/${n}` : n);
const validPath = (p) => p.split('/').every((s) => s && s !== '.' && s !== '..' && s.toLowerCase() !== '.git');

// Create one new file (fails with 422 if it already exists, like the "Create new file" page).
async function putNew(owner, name, token, branch, path, b64, message) {
  const url = `/repos/${owner}/${name}/contents/${encPath(path)}`;
  try {
    await ghSend('PUT', url, token, { message, content: b64, ...(branch ? { branch } : {}) });
  } catch (e) {
    if (e && e.status === 404 && branch) await ghSend('PUT', url, token, { message, content: b64 });
    else throw e;
  }
}

// Commit several files in ONE commit (git data API), like "Upload files" on github.com.
// files: [{ path, uri }]  (an empty repo has no branch yet, so files are created one by one there)
async function commitFiles(owner, name, token, branch, files, message, onProgress) {
  const base = `/repos/${owner}/${name}`;
  let ref = null;
  try {
    ref = await ghGet(`${base}/git/ref/heads/${encPath(branch)}`, token);
  } catch (e) {
    if (!e || (e.status !== 404 && e.status !== 409)) throw e;
  }
  if (!ref) {
    for (let i = 0; i < files.length; i++) {
      onProgress && onProgress(i + 1, files.length);
      await ghSend('PUT', `${base}/contents/${encPath(files[i].path)}`, token, {
        message,
        content: await readBase64(files[i].uri),
      });
    }
    return;
  }
  const headSha = ref.object.sha;
  const head = await ghGet(`${base}/git/commits/${headSha}`, token);
  const tree = [];
  for (let i = 0; i < files.length; i++) {
    onProgress && onProgress(i + 1, files.length);
    const b = await ghSend('POST', `${base}/git/blobs`, token, { content: await readBase64(files[i].uri), encoding: 'base64' });
    tree.push({ path: files[i].path, mode: '100644', type: 'blob', sha: b.sha });
  }
  const t = await ghSend('POST', `${base}/git/trees`, token, { base_tree: head.tree.sha, tree });
  const c = await ghSend('POST', `${base}/git/commits`, token, { message, tree: t.sha, parents: [headSha] });
  await ghSend('PATCH', `${base}/git/refs/heads/${encPath(branch)}`, token, { sha: c.sha });
}

async function uploadAsset(owner, name, token, relId, f) {
  const blob = await (await fetch(f.uri)).blob();
  const res = await fetch(
    `https://uploads.github.com/repos/${owner}/${name}/releases/${relId}/assets?name=${encodeURIComponent(f.name)}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': f.mime || 'application/octet-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: blob,
    }
  );
  if (!res.ok) {
    const e = new Error(String(res.status));
    e.status = res.status;
    throw e;
  }
  return res.json();
}

const NO_WRITE = 'Nincs írási jogod ehhez a repóhoz (vagy a belépési token nem engedi a módosítást).';
const commitErr = (e) =>
  e && e.status === 422
    ? 'Ilyen nevű fájl már létezik ezen az útvonalon.'
    : e && e.status === 409
    ? 'Az ág közben megváltozott a GitHubon. Próbáld újra.'
    : e && (e.status === 403 || e.status === 404)
    ? NO_WRITE
    : 'Nem sikerült menteni. Ellenőrizd az internetkapcsolatot.';

const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
const errText = (e) =>
  e && e.status === 404
    ? 'Nem található (vagy privát, és nincs hozzáférésed).'
    : e && e.status === 403
    ? 'A GitHub átmenetileg korlátozta a kéréseket. Próbáld később.'
    : 'Nem sikerült betölteni. Ellenőrizd az internetkapcsolatot.';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.codePointAt(i);
    if (c > 0xffff) i++;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | ((b1 || 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 || 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

const fmtSize = (b) =>
  b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' B';
const fmtDate = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  if (CUR_LANG === 'en') return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return `${d.getFullYear()}. ${HU_MONTHS[d.getMonth()]} ${d.getDate()}.`;
};
const decodeEnt = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function resolveRepoPath(rel, dir) {
  let p = String(rel).split('#')[0].split('?')[0];
  try {
    p = decodeURIComponent(p);
  } catch (e) {}
  const parts = p.startsWith('/') ? [] : String(dir || '').split('/').filter(Boolean);
  p.split('/').forEach((s) => {
    if (s === '..') parts.pop();
    else if (s && s !== '.') parts.push(s);
  });
  return parts.join('/');
}
const isAbsUrl = (u) => /^(https?:)?\/\//i.test(u) || /^data:/i.test(u);
const ghRawUrl = (u) => {
  const m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3].split('?')[0]}`;
  return u.startsWith('//') ? 'https:' + u : u;
};

const imgCache = new Map();
function loadRepoImage(owner, name, path, token) {
  const key = `${owner}/${name}/${path}`;
  if (imgCache.has(key)) return imgCache.get(key);
  const p = (async () => {
    const j = await ghGet(`/repos/${owner}/${name}/contents/${encPath(path)}`, token);
    let b64 = j && j.encoding === 'base64' ? String(j.content || '').replace(/\s/g, '') : '';
    if (!b64 && j && j.sha) {
      const b = await ghGet(`/repos/${owner}/${name}/git/blobs/${j.sha}`, token);
      b64 = String(b.content || '').replace(/\s/g, '');
    }
    if (!b64) throw new Error('empty');
    const ext = (path.split('.').pop() || '').toLowerCase();
    return `data:${MIME[ext] || 'image/png'};base64,${b64}`;
  })();
  imgCache.set(key, p);
  if (imgCache.size > 40) imgCache.delete(imgCache.keys().next().value);
  p.catch(() => imgCache.delete(key));
  return p;
}

const BADGE_RE =
  /img\.shields\.io|badgen\.net|badge\.fury\.io|badges?\.|\/badge(\.svg|\/|\?)|travis-ci|codecov\.io|coveralls\.io|github\.com\/[^/]+\/[^/]+\/(actions|workflows)/i;

const INLINE_RULES = [
  { k: 'limg', re: /\[!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/ },
  { k: 'img', re: /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/ },
  { k: 'link', re: /\[((?:[^\[\]]|\[[^\]]*\])+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/ },
  { k: 'html', re: /<img\b[^>]*>/i },
  { k: 'code', re: /`([^`]+)`/ },
  { k: 'bold', re: /\*\*(.+?)\*\*|__(.+?)__/ },
  { k: 'strike', re: /~~(.+?)~~/ },
  { k: 'ital', re: /\*([^*\s](?:[^*]*?[^*\s])?)\*|(?<![A-Za-z0-9_])_([^_\s](?:[^_]*?[^_\s])?)_(?![A-Za-z0-9_])/ },
  { k: 'auto', re: /<(https?:\/\/[^>\s]+)>/ },
  { k: 'at', re: /(?<![\w@.\/])@([A-Za-z0-9][A-Za-z0-9-]{0,38})(?![\w\/-])/ },
  { k: 'emoji', re: /:([a-z0-9_+-]+):/ },
  { k: 'url', re: /https?:\/\/[^\s<>()\[\]]+/ },
];

const EMOJI = {
  tada: '🎉', rocket: '🚀', sparkles: '✨', fire: '🔥', bug: '🐛', warning: '⚠️', white_check_mark: '✅',
  x: '❌', heavy_check_mark: '✔️', star: '⭐', star2: '🌟', zap: '⚡', memo: '📝', book: '📖', books: '📚',
  package: '📦', lock: '🔒', key: '🔑', wrench: '🔧', hammer: '🔨', gear: '⚙️', art: '🎨', bulb: '💡',
  point_right: '👉', '+1': '👍', '-1': '👎', thumbsup: '👍', thumbsdown: '👎', heart: '❤️', eyes: '👀',
  link: '🔗', computer: '💻', iphone: '📱', smile: '😄', wave: '👋', pray: '🙏', construction: '🚧',
  hourglass: '⏳', information_source: 'ℹ️', question: '❓', mag: '🔍', bar_chart: '📊',
  globe_with_meridians: '🌐', hungary: '🇭🇺', checkered_flag: '🏁', penguin: '🐧', apple: '🍎',
  robot: '🤖', cloud: '☁️', house: '🏠', bell: '🔔', calendar: '📅', trophy: '🏆', coffee: '☕',
};

function parseInline(s, st, out) {
  let rest = s;
  while (rest) {
    let best = null;
    for (const r of INLINE_RULES) {
      const m = r.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { r, m };
    }
    if (!best) {
      out.push({ ...st, text: rest });
      break;
    }
    const { r, m } = best;
    if (m.index > 0) out.push({ ...st, text: rest.slice(0, m.index) });
    let len = m[0].length;
    switch (r.k) {
      case 'limg':
        out.push({ img: true, alt: m[1], src: m[2], href: m[3] });
        break;
      case 'img':
        out.push({ img: true, alt: m[1], src: m[2], href: st.href });
        break;
      case 'link':
        parseInline(m[1], { ...st, href: m[2] }, out);
        break;
      case 'html': {
        const attr = (n) => {
          const a = m[0].match(new RegExp(n + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
          return a ? a[1] || a[2] || a[3] || '' : '';
        };
        const w = parseInt(attr('width'), 10);
        if (attr('src')) out.push({ img: true, alt: attr('alt'), src: attr('src'), width: w > 0 ? w : null, href: st.href });
        break;
      }
      case 'code':
        out.push({ ...st, text: m[1], code: true });
        break;
      case 'bold':
        parseInline(m[1] || m[2], { ...st, bold: true }, out);
        break;
      case 'strike':
        parseInline(m[1], { ...st, strike: true }, out);
        break;
      case 'ital':
        parseInline(m[1] || m[2], { ...st, ital: true }, out);
        break;
      case 'auto':
        out.push({ ...st, text: m[1], href: m[1] });
        break;
      case 'at':
        out.push({ ...st, text: m[0], href: `https://github.com/${m[1]}` });
        break;
      case 'emoji':
        out.push({ ...st, text: EMOJI[m[1]] || m[0] });
        break;
      case 'url': {
        const u = m[0].replace(/[.,;:!?'"]+$/, '');
        len = u.length;
        out.push({ ...st, text: u, href: st.href || u });
        break;
      }
      default:
        break;
    }
    rest = rest.slice(m.index + len);
  }
  return out;
}

const AL_C = '\u0001C';
const AL_O = '\u0001O';
const AL_E = '\u0001E';

// HTML <table> -> markdown pipe table (so it renders with borders, like on GitHub)
function htmlTableToMd(tbl) {
  const cellText = (s) =>
    s
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<(?!img\b|https?:)[^>\n]*>/gi, ' ')
      .replace(/(^|\n)\s*#{1,6}\s+/g, ' ')
      .replace(/\s*\n\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\|/g, '\\|')
      .trim();
  const alignOf = (attrs) => {
    const a = attrs.match(/align\s*=\s*["']?(left|center|right)/i) || attrs.match(/text-align\s*:\s*(left|center|right)/i);
    return a ? a[1].toLowerCase() : '';
  };
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let tm;
  while ((tm = trRe.exec(tbl))) {
    const cells = [];
    const tdRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cm;
    let allTh = true;
    while ((cm = tdRe.exec(tm[1]))) {
      if (cm[1].toLowerCase() !== 'th') allTh = false;
      const span = Math.max(1, Math.min(12, parseInt((cm[2].match(/colspan\s*=\s*["']?(\d+)/i) || [])[1], 10) || 1));
      cells.push({ t: cellText(cm[3]), a: alignOf(cm[2]) });
      for (let s = 1; s < span; s++) cells.push({ t: '', a: '' });
    }
    if (cells.length) rows.push({ th: allTh, cells });
  }
  if (!rows.length) return '';
  const cols = Math.max(...rows.map((r) => r.cells.length));
  const hasHead = rows[0].th;
  const line = (cells) => `| ${Array.from({ length: cols }, (_, i) => (cells[i] ? cells[i].t : '')).join(' | ')} |`;
  const aligns = Array.from({ length: cols }, (_, i) => {
    const a = rows[0].cells[i] ? rows[0].cells[i].a : '';
    return a === 'center' ? ':---:' : a === 'right' ? '---:' : '---';
  });
  const out = [hasHead ? line(rows[0].cells) : line([]), `| ${aligns.join(' | ')} |`];
  rows.slice(hasHead ? 1 : 0).forEach((r) => out.push(line(r.cells)));
  return `\n\n${out.join('\n')}\n\n`;
}

function htmlToMd(t) {
  const centered = (a) => /align\s*=\s*["']?center/i.test(a) || /text-align\s*:\s*center/i.test(a);
  return t
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img\b[^>]*>/gi, (m) => m.replace(/\s*\n\s*/g, ' '))
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (all, attrs, inner) => {
      const h = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const body = inner.replace(/\s*\n\s*/g, ' ').trim();
      if (!h) return body;
      return body ? `[${body}](${h[1] || h[2] || ''})` : '';
    })
    .replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (a, n, attrs, inner) => {
      const line = `${'#'.repeat(+n)} ${inner.replace(/\s*\n\s*/g, ' ').trim()}`;
      return centered(attrs) ? `\n${AL_C}\n${line}\n${AL_E}\n` : `\n${line}\n`;
    })
    .replace(/<center\b[^>]*>/gi, `\n${AL_C}\n`)
    .replace(/<\/center>/gi, `\n${AL_E}\n`)
    .replace(/<(p|div)\b([^>]*)>/gi, (a, tag, attrs) => `\n${centered(attrs) ? AL_C : AL_O}\n`)
    .replace(/<\/(p|div)>/gi, `\n${AL_E}\n`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<(code|kbd)\b[^>]*>([\s\S]*?)<\/\1>/gi, '`$2`')
    .replace(/<table\b[\s\S]*?<\/table>/gi, htmlTableToMd)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<br\s*\/?>/gi, '  \n')
    .replace(/<\/tr>/gi, '\n\n')
    .replace(/<\/(td|th)>/gi, ' ')
    .replace(/<(?!img\b|https?:)[^>\n]*>/gi, '');
}

function mapOutsideFences(text, fn) {
  const out = [];
  let buf = [];
  let fence = null;
  const flush = () => {
    if (buf.length) {
      out.push(fn(buf.join('\n')));
      buf = [];
    }
  };
  text.split('\n').forEach((ln) => {
    const m = ln.match(/^\s*(```+|~~~+)/);
    if (fence) {
      out.push(ln);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
    } else if (m) {
      flush();
      fence = m[1];
      out.push(ln);
    } else buf.push(ln);
  });
  flush();
  return out.join('\n');
}

function splitDetails(t) {
  const out = [];
  let last = 0;
  const re = /<details\b[^>]*>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push({ md: t.slice(last, m.index) });
    const inner = m[1];
    const sm = inner.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    out.push({
      summary: sm ? sm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '',
      body: sm ? inner.replace(sm[0], '') : inner,
    });
    last = m.index + m[0].length;
  }
  if (last < t.length) out.push({ md: t.slice(last) });
  return out;
}

const svgCache = new Map();

function prepSvg(xml) {
  let s = String(xml)
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();
  const m = s.match(/<svg\b[^>]*>/i);
  if (!m) throw new Error('svg');
  const tag = m[0];
  const num = (a) => {
    const t = tag.match(new RegExp(`\\s${a}\\s*=\\s*["']([\\d.]+)(?:px)?["']`, 'i'));
    return t ? parseFloat(t[1]) : 0;
  };
  let w = num('width');
  let h = num('height');
  const vb = tag.match(/\sviewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*["']/i);
  if (vb) {
    const vw = parseFloat(vb[3]);
    const vh = parseFloat(vb[4]);
    if (!w || !h) {
      if (w && vw) h = (w * vh) / vw;
      else if (h && vh) w = (h * vw) / vh;
      else {
        w = vw;
        h = vh;
      }
    }
  } else if (w && h) {
    s = s.replace(tag, tag.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`));
  }
  if (!w || !h) throw new Error('svg size');
  const ff = Platform.OS === 'ios' ? 'Verdana' : 'sans-serif';
  s = s.replace(/font-family\s*=\s*"[^"]*"/g, `font-family="${ff}"`).replace(/font-family\s*=\s*'[^']*'/g, `font-family="${ff}"`);
  return { xml: s, w, h };
}

function fetchSvg(clean, ctx) {
  const key = `${ctx.owner}/${ctx.name}/${ctx.dir}|${clean}`;
  if (svgCache.has(key)) return svgCache.get(key);
  const p = (async () => {
    let xml = null;
    if (/^data:image\/svg\+xml/i.test(clean)) {
      const body = clean.slice(clean.indexOf(',') + 1);
      xml = /;base64,/i.test(clean) ? null : decodeURIComponent(body);
      if (xml == null) throw new Error('data');
    } else {
      const same = isAbsUrl(clean)
        ? clean.match(
            new RegExp(
              `^https?://(?:github\\.com/${escRe(ctx.owner)}/${escRe(ctx.name)}/(?:blob|raw)/[^/]+/|raw\\.githubusercontent\\.com/${escRe(ctx.owner)}/${escRe(ctx.name)}/[^/]+/)(.+)$`,
              'i'
            )
          )
        : null;
      if (!isAbsUrl(clean) || same) {
        const path = same ? resolveRepoPath(same[1], '') : resolveRepoPath(clean, ctx.dir);
        try {
          xml = await ghGet(`/repos/${ctx.owner}/${ctx.name}/contents/${encPath(path)}`, ctx.token, true);
        } catch (e) {
          if (!same) throw e;
        }
      }
      if (xml == null) {
        const res = await fetch(ghRawUrl(clean), { headers: { Accept: 'image/svg+xml,*/*' } });
        if (!res.ok) throw new Error(String(res.status));
        xml = await res.text();
      }
    }
    return prepSvg(xml);
  })();
  svgCache.set(key, p);
  if (svgCache.size > 60) svgCache.delete(svgCache.keys().next().value);
  p.catch(() => svgCache.delete(key));
  return p;
}

function MdSvg({ src, alt, width, ctx, center }) {
  const [svg, setSvg] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setSvg(null);
    setFailed(false);
    fetchSvg(src, ctx)
      .then((v) => alive && setSvg(v))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [src, ctx.owner, ctx.name, ctx.dir, ctx.token]);

  if (failed) {
    if (BADGE_RE.test(src)) {
      if (!alt) return null;
      return (
        <View style={styles.mdBadge}>
          <Text style={styles.mdBadgeText} numberOfLines={1}>{decodeEnt(alt)}</Text>
        </View>
      );
    }
    return (
      <View style={styles.mdImgFail}>
        <Ionicons name="image-outline" size={15} color={C.muted} />
        <Text style={styles.mdImgFailText} numberOfLines={1}>{alt ? decodeEnt(alt) : tr('SVG kép')}</Text>
      </View>
    );
  }
  if (!svg) return <View style={{ width: 64, height: BADGE_RE.test(src) ? 20 : 40 }} />;
  const ww = Number(width) || 0;
  const w = ww || svg.w;
  const h = ww ? (svg.h * ww) / svg.w : svg.h;
  return (
    <View style={{ width: w, maxWidth: '100%', aspectRatio: w / h, alignSelf: center ? 'center' : 'flex-start' }}>
      <SvgXml xml={svg.xml} width="100%" height="100%" onError={() => setFailed(true)} />
    </View>
  );
}

function MdImage({ src, alt, width, href, ctx, center }) {
  const clean = String(src || '').trim();
  const isSvg = /\.svg(\?|#|$)/i.test(clean) || /img\.shields\.io|badgen\.net/i.test(clean);
  const [uri, setUri] = useState(null);
  const [size, setSize] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setUri(null);
    setSize(null);
    setFailed(false);
    if (!clean || isSvg) return undefined;
    if (/^data:/i.test(clean)) {
      setUri(clean);
      return undefined;
    }
    const same = isAbsUrl(clean)
      ? clean.match(
          new RegExp(
            `^https?://(?:github\\.com/${escRe(ctx.owner)}/${escRe(ctx.name)}/(?:blob|raw)/[^/]+/|raw\\.githubusercontent\\.com/${escRe(ctx.owner)}/${escRe(ctx.name)}/[^/]+/)(.+)$`,
            'i'
          )
        )
      : null;
    if (isAbsUrl(clean) && !same) {
      setUri(ghRawUrl(clean));
      return undefined;
    }
    const path = same ? resolveRepoPath(same[1], '') : resolveRepoPath(clean, ctx.dir);
    loadRepoImage(ctx.owner, ctx.name, path, ctx.token)
      .then((u) => alive && setUri(u))
      .catch(() => {
        if (!alive) return;
        if (same) setUri(ghRawUrl(clean));
        else setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [clean, isSvg, ctx.owner, ctx.name, ctx.dir, ctx.token]);

  useEffect(() => {
    if (!uri) return undefined;
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && (w && h ? setSize({ w, h }) : setFailed(true)),
      () => alive && setFailed(true)
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  const open = href ? () => ctx.onLink(href) : undefined;
  let body;
  if (isSvg) {
    body = <MdSvg src={clean} alt={alt} width={width} ctx={ctx} center={center} />;
  } else if (failed) {
    body = (
      <View style={styles.mdImgFail}>
        <Ionicons name="image-outline" size={15} color={C.muted} />
        <Text style={styles.mdImgFailText} numberOfLines={1}>{alt ? decodeEnt(alt) : tr('A kép nem tölthető be')}</Text>
      </View>
    );
  } else if (!uri || !size) {
    body = (
      <View style={styles.mdImgLoad}>
        <ActivityIndicator size="small" color={C.dim} />
      </View>
    );
  } else {
    body = (
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{
          width: '100%',
          maxWidth: width || size.w,
          aspectRatio: size.w / size.h,
          alignSelf: center ? 'center' : 'flex-start',
        }}
      />
    );
  }
  const wrapStyle = { maxWidth: '100%' };
  return open ? (
    <Pressable onPress={open} style={wrapStyle}>{body}</Pressable>
  ) : (
    <View style={wrapStyle}>{body}</View>
  );
}

function Inline({ text, ctx, center, textStyle }) {
  const groups = useMemo(() => {
    let nodes = parseInline(String(text), {}, []);
    if (nodes.some((n) => n.img)) nodes = nodes.filter((n) => n.img || (n.text && n.text.trim()));
    const g = [];
    nodes.forEach((n) => {
      const t = n.img ? 'img' : 'text';
      const last = g[g.length - 1];
      if (last && last.t === t) last.items.push(n);
      else g.push({ t, items: [n] });
    });
    return g;
  }, [text]);
  if (!groups.length) return null;
  return (
    <View style={{ width: '100%' }}>
      {groups.map((g, gi) =>
        g.t === 'img' ? (
          <View key={gi} style={[styles.mdImgRow, center && { justifyContent: 'center' }]}>
            {g.items.map((im, ii) => (
              <MdImage key={ii} src={im.src} alt={im.alt} width={im.width} href={im.href} ctx={ctx} center={center} />
            ))}
          </View>
        ) : (
          <Text key={gi} style={[styles.mdP, textStyle, center && { textAlign: 'center' }]}>
            {g.items.map((n, ni) => (
              <Text
                key={ni}
                style={[
                  n.bold && styles.mdBold,
                  n.ital && styles.mdItal,
                  n.strike && styles.mdStrike,
                  n.code && styles.mdInlineCode,
                  n.href && styles.mdLink,
                ]}
                onPress={n.href ? () => ctx.onLink(n.href) : undefined}
              >
                {n.code ? n.text : decodeEnt(n.text)}
              </Text>
            ))}
          </Text>
        )
      )}
    </View>
  );
}

const mdPlainCell = (s) =>
  String(s || '')
    .replace(/!\[[^\]]*\]\([^)]*\)|<img[^>]*>/g, 'WWWWWWW')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`_~]/g, '');

// GitHub-like table: columns are as wide as their content (measured), wrap only when the table
// would be wider than the screen, honour :---: / ---: alignment, scroll sideways as a last resort.
function MdTable({ head, rows, aligns, ctx }) {
  const hasHead = head.some((h) => String(h || '').trim());
  const all = useMemo(() => (hasHead ? [head, ...rows] : rows), [head, rows, hasHead]);
  const cols = head.length;
  const [avail, setAvail] = useState(0);
  const [nat, setNat] = useState(null);
  const [late, setLate] = useState(false);

  const probes = useMemo(() => {
    const l = [];
    for (let c = 0; c < cols; c++) {
      const idx = all
        .map((r, ri) => [ri, mdPlainCell(r[c]).length])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map((x) => x[0]);
      if (!idx.includes(0)) idx.push(0);
      idx.forEach((ri) => l.push({ c, ri, t: mdPlainCell(all[ri][c]) }));
    }
    return l;
  }, [all, cols]);
  const got = useMemo(() => ({}), [probes]);
  const onProbe = (i, c, w) => {
    got[i] = [c, w];
    if (Object.keys(got).length === probes.length) {
      const m = new Array(cols).fill(0);
      Object.keys(got).forEach((key) => {
        m[got[key][0]] = Math.max(m[got[key][0]], got[key][1]);
      });
      setNat({ probes, m });
    }
  };
  useEffect(() => {
    const t = setTimeout(() => setLate(true), 300);
    return () => clearTimeout(t);
  }, []);

  const est = [];
  for (let c = 0; c < cols; c++) {
    const longest = Math.max(...all.map((r) => mdPlainCell(r[c]).length));
    est.push(Math.min(320, Math.max(64, longest * 8.6 + 28)));
  }
  const measured = !!nat && nat.probes === probes;
  const natW = measured ? nat.m.map((w) => Math.max(40, Math.ceil(w) + 28)) : est;
  const total = natW.reduce((a, b) => a + b, 0);
  const room = avail ? avail - 2 : 0;
  let widths = natW;
  if (room && total > room) {
    const minW = natW.map((w) => Math.min(w, 110));
    const slack = natW.reduce((s, w, i) => s + w - minW[i], 0);
    const kk = slack > 0 ? Math.min(1, (total - room) / slack) : 0;
    widths = natW.map((w, i) => Math.round(w - (w - minW[i]) * kk));
  }
  const tableW = widths.reduce((a, b) => a + b, 0) + 2;

  return (
    <View style={{ marginBottom: 16 }} onLayout={(e) => setAvail(Math.round(e.nativeEvent.layout.width))}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: avail ? Math.min(tableW, avail) : tableW, opacity: measured || late ? 1 : 0 }}
      >
        <View style={styles.mdTableWrap}>
          {all.map((r, ri) => (
            <View
              key={ri}
              style={[
                styles.mdTr,
                hasHead && ri === 0 && styles.mdTrHead,
                (hasHead ? ri > 0 && ri % 2 === 0 : ri % 2 === 1) && styles.mdTrAlt,
                ri === all.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              {widths.map((w, ci) => {
                const a = (aligns && aligns[ci]) || 'left';
                return (
                  <View key={ci} style={[styles.mdTd, { width: w }, ci === widths.length - 1 && { borderRightWidth: 0 }]}>
                    <Inline
                      text={r[ci] || ''}
                      ctx={ctx}
                      center={a === 'center'}
                      textStyle={[styles.mdCell, hasHead && ri === 0 && styles.mdBold, { textAlign: a }]}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 3000, opacity: 0 }}>
        {probes.map((p, i) => (
          <View key={i} style={{ alignSelf: 'flex-start' }} onLayout={(e) => onProbe(i, p.c, e.nativeEvent.layout.width)}>
            <Text style={[styles.mdP, styles.mdCell, hasHead && p.ri === 0 && styles.mdBold]}>{p.t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MdDetails({ summary, body, ctx }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.mdDetails}>
      <Btn style={styles.mdSummary} onPress={() => setOpen((o) => !o)}>
        <Ionicons name={open ? 'caret-down' : 'caret-forward'} size={14} color="#f0f6fc" />
        <Text style={styles.mdSummaryText}>{summary || tr('Részletek')}</Text>
      </Btn>
      {open && (
        <View style={{ paddingTop: 8 }}>
          <MiniMd text={body} ctx={ctx} />
        </View>
      )}
    </View>
  );
}

const MD_ALERTS = {
  NOTE: { label: 'Note', icon: 'information-circle-outline', color: '#4493f8', line: '#1f6feb' },
  TIP: { label: 'Tip', icon: 'bulb-outline', color: '#3fb950', line: '#238636' },
  IMPORTANT: { label: 'Important', icon: 'chatbox-ellipses-outline', color: '#ab7df8', line: '#8957e5' },
  WARNING: { label: 'Warning', icon: 'warning-outline', color: '#d29922', line: '#9e6a03' },
  CAUTION: { label: 'Caution', icon: 'stop-circle-outline', color: '#f85149', line: '#da3633' },
};

const HL_COL = { c: '#9198a1', s: '#a5d6ff', n: '#79c0ff', k: '#ff7b72', f: '#d2a8ff' };
const HL_KW = new Set(
  (
    'abstract and as assert async await break case catch class const continue def default defer del do elif else enum except export extends final finally fn for from func function go if impl implements import in instanceof interface is lambda let match mod namespace new not of or package pass private protected pub public raise return static struct super switch throw trait try type typeof use using val var void where while with yield'
  ).split(' ')
);
const HL_CONST = new Set('true false null nil none undefined this self True False None NULL'.split(' '));
const HL_HASH = /^(sh|bash|zsh|shell|python|py|ruby|rb|yaml|yml|toml|dockerfile|makefile|perl|ini|conf|powershell|ps1|r|elixir|ex)$/i;
const HL_DASH = /^(sql|lua|hs|haskell)$/i;
const HL_PLAIN = /^(text|txt|plain|plaintext|log|console|output|markdown|md|html|xml|svg|vue)$/i;
const HL_C_COM = /\/\/[^\n]*|\/\*[\s\S]*?\*\//;
const HL_D_COM = /--[^\n]*|\/\*[\s\S]*?\*\//;
const HL_H_COM = /(?<=^|\s)#[^\n]*/;
const HL_STR = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/;
const HL_NUM = /\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b/;
const HL_WORD = /[A-Za-z_$][\w$]*/;

function highlightCode(code, lang) {
  const l = String(lang || '').toLowerCase();
  if (!l || HL_PLAIN.test(l)) return code;
  if (l === 'diff' || l === 'patch') {
    const ls = code.split('\n');
    return ls.map((ln, i) => {
      const add = ln.startsWith('+') && !ln.startsWith('+++');
      const del = ln.startsWith('-') && !ln.startsWith('---');
      return (
        <Text
          key={i}
          style={add ? { color: '#aff5b4', backgroundColor: '#033a16' } : del ? { color: '#ffdcd7', backgroundColor: '#67060c' } : null}
        >
          {ln + (i < ls.length - 1 ? '\n' : '')}
        </Text>
      );
    });
  }
  const com = HL_HASH.test(l) ? HL_H_COM : HL_DASH.test(l) ? HL_D_COM : HL_C_COM;
  const re = new RegExp(`(${com.source})|(${HL_STR.source})|(${HL_NUM.source})|(${HL_WORD.source})`, 'gm');
  const out = [];
  let last = 0;
  let n = 0;
  let m;
  const put = (t, col) => {
    if (!t) return;
    out.push(col ? <Text key={n++} style={{ color: col }}>{t}</Text> : t);
  };
  while ((m = re.exec(code))) {
    if (m[0] === '') {
      re.lastIndex++;
      continue;
    }
    put(code.slice(last, m.index));
    let col = null;
    if (m[1]) col = HL_COL.c;
    else if (m[2]) col = HL_COL.s;
    else if (m[3]) col = HL_COL.n;
    else if (HL_KW.has(m[4])) col = HL_COL.k;
    else if (HL_CONST.has(m[4])) col = HL_COL.n;
    else if (code.charAt(re.lastIndex) === '(') col = HL_COL.f;
    put(m[0], col);
    last = re.lastIndex;
  }
  put(code.slice(last));
  return out;
}

function renderBlocks(text, ctx, kp, tstyle) {
  const lines = text.replace(/\r/g, '').split('\n').slice(0, MD_MAX_LINES);
  const out = [];
  const stack = [];
  let para = [];
  let indents = [];
  let k = 0;
  let afterList = false;
  const center = () => stack.some(Boolean);
  const endList = () => {
    indents = [];
    if (afterList) {
      out.push(<View key={`${kp}s${k++}`} style={{ height: 14 }} />);
      afterList = false;
    }
  };
  const pushHeading = (txt, lv) => {
    const size = [32, 24, 20, 16, 14, 13.6][lv - 1];
    const slug = mdSlug(txt);
    const reg = (r) => {
      if (!r || !ctx.anchors) return;
      let s = slug;
      let n = 0;
      while (ctx.anchors.has(s) && ctx.anchors.get(s) !== r) s = `${slug}-${++n}`;
      ctx.anchors.set(s, r);
      const al = ctx.slugAlias && ctx.slugAlias.get(slug);
      if (al && !ctx.anchors.has(al)) ctx.anchors.set(al, r);
    };
    out.push(
      <View
        key={`${kp}h${k++}`}
        ref={reg}
        collapsable={false}
        style={[
          styles.mdHWrap,
          kp === 'm0' && out.length === 0 && { marginTop: 0 },
          lv <= 2 && styles.mdHBorder,
          lv <= 2 && { paddingBottom: Math.round(size * 0.3 * 10) / 10 },
        ]}
      >
        <Inline
          text={txt}
          ctx={ctx}
          center={center()}
          textStyle={[styles.mdH, { fontSize: size, lineHeight: Math.round(size * 1.25) }, lv === 6 && { color: '#9198a1' }]}
        />
      </View>
    );
  };
  const flushPara = () => {
    if (!para.length) return;
    let s = '';
    para.forEach((l, idx) => {
      if (idx > 0) s += /( {2,}|\\)$/.test(para[idx - 1]) ? '\n' : ' ';
      s += l.trim();
    });
    out.push(
      <View key={`${kp}p${k++}`} style={styles.mdBlock}>
        <Inline text={s} ctx={ctx} center={center()} textStyle={tstyle} />
      </View>
    );
    para = [];
  };
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.startsWith('\u0001')) {
      flushPara();
      const c = raw[1];
      if (c === 'C') stack.push(true);
      else if (c === 'O') stack.push(false);
      else stack.pop();
      i++;
      continue;
    }
    const f = raw.match(/^\s*(```+|~~~+)\s*([\w+#.-]*)/);
    if (f) {
      flushPara();
      endList();
      const code = [];
      const closer = new RegExp('^\\s*' + (f[1][0] === '`' ? '`' : '~') + '{' + f[1].length + ',}\\s*$');
      i++;
      while (i < lines.length && !closer.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <ScrollView
          key={`${kp}c${k++}`}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.mdCode}
          contentContainerStyle={{ padding: 16 }}
        >
          <Text style={styles.mdCodeText} selectable>{highlightCode(code.join('\n'), f[2])}</Text>
        </ScrollView>
      );
      continue;
    }
    if (!raw.trim()) {
      flushPara();
      i++;
      continue;
    }
    if (para.length && /^\s{0,3}(=+|-{2,})\s*$/.test(raw)) {
      const lv = raw.trim()[0] === '=' ? 1 : 2;
      const txt = para.map((l) => l.trim()).join(' ');
      para = [];
      endList();
      pushHeading(txt, lv);
      i++;
      continue;
    }
    const h = raw.match(/^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    if (h) {
      flushPara();
      endList();
      pushHeading(h[2], h[1].length);
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(raw)) {
      flushPara();
      endList();
      out.push(<View key={`${kp}r${k++}`} style={styles.mdHr} />);
      i++;
      continue;
    }
    if (/^\s*>/.test(raw)) {
      flushPara();
      endList();
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        q.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const am = q.length ? q[0].match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i) : null;
      const alert = am ? MD_ALERTS[am[1].toUpperCase()] : null;
      if (alert) q[0] = am[2];
      const qk = `${kp}q${k++}`;
      const inner = renderBlocks(q.join('\n'), ctx, qk, alert ? undefined : styles.mdQuoteText);
      const lastCh = inner.length ? String(inner[inner.length - 1].key).charAt(qk.length) : '';
      const trim = inner.length && lastCh !== 'l' && lastCh !== 'r' ? -16 : 0;
      out.push(
        <View key={qk} style={alert ? [styles.mdAlert, { borderColor: alert.line }] : styles.mdQuote}>
          {!!alert && (
            <View style={styles.mdAlertTitle}>
              <Ionicons name={alert.icon} size={16} color={alert.color} />
              <Text style={[styles.mdAlertTitleText, { color: alert.color }]}>{alert.label}</Text>
            </View>
          )}
          <View style={{ marginBottom: trim }}>{inner}</View>
        </View>
      );
      continue;
    }
    if (
      raw.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('|') &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])
    ) {
      flushPara();
      endList();
      const split = (l) => {
        let s = l.trim();
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|')) s = s.slice(0, -1);
        return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      };
      const head = split(raw);
      const aligns = split(lines[i + 1]).map((s) => (/^:-+:$/.test(s) ? 'center' : /^-+:$/.test(s) ? 'right' : 'left'));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(split(lines[i]));
        i++;
      }
      out.push(<MdTable key={`${kp}t${k++}`} head={head} rows={rows} aligns={aligns} ctx={ctx} />);
      continue;
    }
    const li = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara();
      const n = li[1].replace(/\t/g, '    ').length;
      while (indents.length && indents[indents.length - 1] > n) indents.pop();
      if (!indents.length || indents[indents.length - 1] < n) indents.push(n);
      const level = Math.min(indents.length - 1, 5);
      afterList = true;
      const ordered = /\d/.test(li[2]);
      const num = ordered ? li[2].replace(/[.)]/, '') : null;
      let body = li[3];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        /^\s{2,}\S/.test(lines[i]) &&
        !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) &&
        !/^\s*(```|~~~)/.test(lines[i])
      ) {
        body += ' ' + lines[i].trim();
        i++;
      }
      let task = null;
      const tm = body.match(/^\[( |x|X)\]\s+(.*)$/);
      if (tm) {
        task = tm[1] !== ' ';
        body = tm[2];
      }
      out.push(
        <View key={`${kp}l${k++}`} style={[styles.mdBullet, { paddingLeft: level * 32 }]}>
          <View style={styles.mdMarker}>
            {task !== null ? (
              <Ionicons name={task ? 'checkbox' : 'square-outline'} size={16} color={task ? '#1f6feb' : '#9198a1'} style={{ marginTop: 4 }} />
            ) : (
              <Text style={[styles.mdP, tstyle]}>{ordered ? `${num}.` : level === 0 ? '•' : level === 1 ? '◦' : '▪'}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Inline text={body} ctx={ctx} textStyle={tstyle} />
          </View>
        </View>
      );
      continue;
    }
    if (!para.length) endList();
    para.push(raw);
    i++;
  }
  flushPara();
  return out;
}

function MiniMd({ text, ctx }) {
  const nodes = useMemo(() => {
    const segs = splitDetails(String(text || ''));
    return segs.map((s, idx) =>
      s.md !== undefined ? (
        <View key={`m${idx}`}>{renderBlocks(mapOutsideFences(s.md, htmlToMd), ctx, `m${idx}`)}</View>
      ) : (
        <MdDetails key={`d${idx}`} summary={s.summary} body={s.body} ctx={ctx} />
      )
    );
  }, [text, ctx]);
  return <View style={styles.mdRoot}>{nodes}</View>;
}

function FileImage({ uri }) {
  const [ratio, setRatio] = useState(null);
  useEffect(() => {
    let alive = true;
    Image.getSize(uri, (w, h) => alive && w && h && setRatio(w / h), () => {});
    return () => {
      alive = false;
    };
  }, [uri]);
  return (
    <View style={styles.fileImgBox}>
      {ratio ? (
        <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', aspectRatio: ratio }} />
      ) : (
        <ActivityIndicator color={C.muted} style={{ margin: 24 }} />
      )}
    </View>
  );
}

// ---------- Auto-translation of GitHub content (README, release notes, descriptions, titles) ----------
// Everything that comes from GitHub is translated into the app language (CUR_LANG). Texts that are
// already in that language are left alone. Failures fall back silently to the original text.
const TR_CACHE = new Map();
const TR_BUSY = new Map();
const TRMD = new Map();
const TRMD_BUSY = new Map();
const TRMD_FAIL = new Set();
const TR_LET = /[A-Za-z\u00C0-\u024F\u0370-\u1FFF\u3040-\uFFEF]/;
let trActive = 0;
const trQueue = [];
function trPump() {
  while (trActive < 4 && trQueue.length) {
    const j = trQueue.shift();
    trActive++;
    j.fn().then(j.res, j.rej).then(() => {
      trActive--;
      trPump();
    });
  }
}
const trRun = (fn) =>
  new Promise((res, rej) => {
    trQueue.push({ fn, res, rej });
    trPump();
  });

async function gtx(text, lang) {
  const base = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=${lang}`;
  let res;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `q=${encodeURIComponent(text)}`,
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch (e) {
    if (text.length > 1200) throw e;
    res = await fetch(`${base}&q=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error(String(res.status));
  }
  const d = await res.json();
  return { text: (d[0] || []).map((s) => (s && s[0]) || '').join(''), src: d[2] || '' };
}

async function translatePlain(text, lang) {
  if (!TR_LET.test(text)) return text;
  const r = await trRun(() => gtx(text.slice(0, 4000), lang));
  return !r.text || r.src === lang ? text : r.text;
}

function useTranslated(text) {
  useLang();
  const [, bump] = useState(0);
  const t = typeof text === 'string' ? text : '';
  const lang = CUR_LANG;
  const key = `${lang}\u0001${t}`;
  const hit = TR_CACHE.get(key);
  useEffect(() => {
    if (!t.trim() || TR_CACHE.has(key)) return undefined;
    let alive = true;
    let p = TR_BUSY.get(key);
    if (!p) {
      p = translatePlain(t, lang)
        .then((r) => {
          TR_CACHE.set(key, r);
        })
        .catch(() => {})
        .then(() => {
          TR_BUSY.delete(key);
        });
      TR_BUSY.set(key, p);
    }
    p.then(() => alive && bump((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [key]);
  return hit === undefined ? t : hit;
}

// <Text> whose content is translated into the app language (UI dictionary first, then machine translation)
function AText({ children, ...props }) {
  const s = typeof children === 'string' ? children : '';
  const dict = tr(s);
  const out = useTranslated(dict !== s ? '' : s);
  return <Text {...props}>{dict !== s ? dict : out}</Text>;
}

// Markdown-aware translation: code blocks, inline code, links/URLs, images and HTML tags are protected.
async function translateMd(text, lang) {
  const toks = [];
  const put = (s, k) => {
    toks.push({ s, k: k || 'x' });
    return `\u27E6${toks.length - 1}\u27E7`;
  };
  const g = String(text)
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, (m) => put(m))
    .replace(/<\/?[A-Za-z][^<>]*>/g, (m) => put(m));
  const lines = g.split('\n');
  const rows = [];
  const jobs = [];
  const heads = [];
  const addJob = (b) => {
    jobs.push(b);
    return { j: jobs.length - 1 };
  };
  const prep = (body) => {
    const b = body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => put(m))
      .replace(/\[\^[^\]]+\]/g, (m) => put(m))
      .replace(/\[![A-Za-z]+\]/g, (m) => put(m))
      .replace(/`[^`\n]+`/g, (m) => put(m))
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, (m, a, u) => `${put('[', 'o')}${a}${put(`](${u})`, 'c')}`)
      .replace(/https?:\/\/[^\s)\]]+/g, (m) => put(m))
      .replace(/&[A-Za-z#0-9]+;/g, (m) => put(m))
      .replace(/:[a-z0-9_+-]+:/g, (m) => put(m));
    return TR_LET.test(b.replace(/\u27E6\d+\u27E7/g, '')) ? b : null;
  };
  const sepRe = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  const refRe = /^\s*\[[^\]]+\]:\s+\S/;
  const preRe = /^(\s*(?:>\s*)*(?:(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)?(?:#{1,6}\s+)?)([\s\S]*?)(\s*)$/;
  let fence = null;
  let prevBlank = true;
  let ind = false;
  lines.forEach((line) => {
    const fm = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      rows.push([line]);
      if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length) fence = null;
      prevBlank = false;
      return;
    }
    if (fm) {
      fence = fm[1];
      rows.push([line]);
      prevBlank = false;
      return;
    }
    if (!line.trim()) {
      rows.push([line]);
      prevBlank = true;
      return;
    }
    if (/^( {4}|\t)/.test(line) && (ind || (prevBlank && !/^\s*([-*+]|\d+[.)])\s/.test(line)))) {
      ind = true;
      rows.push([line]);
      prevBlank = false;
      return;
    }
    ind = false;
    prevBlank = false;
    if (sepRe.test(line) || refRe.test(line)) {
      rows.push([line]);
      return;
    }
    const t = line.trim();
    if (t.length > 2 && t.includes('|') && (t.startsWith('|') || t.endsWith('|'))) {
      const safe = line.replace(/\\\|/g, (m) => put(m));
      const row = [];
      safe.split('|').forEach((c, ci) => {
        if (ci > 0) row.push('|');
        const m = c.match(/^(\s*)([\s\S]*?)(\s*)$/);
        const b = m[2] ? prep(m[2]) : null;
        if (b === null) row.push(c);
        else row.push(m[1], addJob(b), m[3]);
      });
      rows.push(row);
      return;
    }
    const m = line.match(preRe);
    const b = prep(m[2]);
    if (b === null) {
      rows.push([line]);
      return;
    }
    const ref = addJob(b);
    if (m[1].indexOf('#') !== -1) heads.push({ j: ref.j, orig: b });
    rows.push([m[1], ref, m[3]]);
  });

  const res = new Array(jobs.length).fill(null);
  const chunks = [];
  let cur = [];
  let len = 0;
  jobs.forEach((b, idx) => {
    if (len + b.length > 1500 && cur.length) {
      chunks.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(idx);
    len += b.length + 1;
  });
  if (cur.length) chunks.push(cur);
  await Promise.all(
    chunks.map(async (ids) => {
      try {
        const r = await trRun(() => gtx(ids.map((i) => jobs[i]).join('\n'), lang));
        if (r.src === lang) return;
        const parts = r.text.split('\n');
        if (parts.length === ids.length) {
          ids.forEach((id, k) => {
            res[id] = parts[k];
          });
          return;
        }
      } catch (e) {
        return;
      }
      for (let k = 0; k < ids.length; k++) {
        try {
          const r = await trRun(() => gtx(jobs[ids[k]], lang));
          if (r.src !== lang) res[ids[k]] = r.text.replace(/\n/g, ' ');
        } catch (e) {}
      }
    })
  );
  const idsOf = (s) => (s.match(/\u27E6\s*\d+\s*\u27E7/g) || []).map((x) => x.replace(/\D/g, '')).sort().join(',');
  const fix = (s) => s.replace(/\*\*\s*([^*]+?)\s*\*\*/g, '**$1**').replace(/~~\s*([^~]+?)\s*~~/g, '~~$1~~').trim();
  const finalJob = jobs.map((b, i) => (res[i] != null && idsOf(res[i]) === idsOf(b) ? fix(res[i]) : b));
  const restore = (s) =>
    s.replace(/(\s*)\u27E6\s*(\d+)\s*\u27E7(\s*)/g, (mm, a, n, b2) => {
      const tk = toks[+n];
      if (!tk) return mm;
      return tk.k === 'o' ? a + tk.s : tk.k === 'c' ? tk.s + b2 : a + tk.s + b2;
    });
  const outText = rows
    .map((row) => restore(row.map((p) => (typeof p === 'string' ? p : finalJob[p.j])).join('')))
    .join('\n');
  return { text: outText, heads: heads.map((h) => [restore(h.orig), restore(finalJob[h.j])]) };
}

const strHash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

function useTranslatedMd(text) {
  useLang();
  const [, bump] = useState(0);
  const t = typeof text === 'string' ? text : '';
  const lang = CUR_LANG;
  const key = `${lang}|${t.length}|${strHash(t)}`;
  const hit = TRMD.get(key);
  useEffect(() => {
    if (!t.trim() || TRMD.has(key)) return undefined;
    let alive = true;
    let p = TRMD_BUSY.get(key);
    if (!p) {
      p = translateMd(t, lang)
        .then((r) => {
          TRMD.set(key, r);
        })
        .catch(() => {
          TRMD_FAIL.add(key);
        })
        .then(() => {
          TRMD_BUSY.delete(key);
        });
      TRMD_BUSY.set(key, p);
    }
    p.then(() => alive && bump((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [key]);
  const alias = useMemo(() => {
    const m = new Map();
    if (hit)
      hit.heads.forEach(([o, n]) => {
        const a = mdSlug(n);
        const b = mdSlug(o);
        if (a && b && a !== b) m.set(a, b);
      });
    return m;
  }, [hit]);
  return { text: hit ? hit.text : t, alias, busy: !hit && !!t.trim() && !TRMD_FAIL.has(key) };
}

const mdSlug = (t) =>
  String(t || '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*`~]/g, '')
    .toLowerCase()
    .replace(/[\uD800-\uDFFF\u2000-\u2BFF\uFE0F]/g, '')
    .replace(/[^\w\s\-\u00C0-\uFFFF]/g, '')
    .replace(/\s/g, '-');

// A README is always rendered natively (no WebView): GitHub-dark look, anchor links scroll to headings.
function GhReadme({ text, ctx, scrollRef }) {
  const tm = useTranslatedMd(text);
  const anchors = useMemo(() => new Map(), [tm.text]);
  const jumpRef = useRef(null);
  jumpRef.current = (raw) => {
    let id = String(raw || '');
    try {
      id = decodeURIComponent(id);
    } catch (e) {}
    id = id.toLowerCase().replace(/^user-content-/, '');
    const target = anchors.get(id);
    const sc = scrollRef && scrollRef.current;
    if (!target || !sc) return;
    try {
      const inner = sc.getInnerViewRef ? sc.getInnerViewRef() : sc.getInnerViewNode && sc.getInnerViewNode();
      if (inner) target.measureLayout(inner, (_x, top) => sc.scrollTo({ y: Math.max(0, top - 8), animated: true }), () => {});
    } catch (e) {}
  };
  const rctx = useMemo(
    () => ({
      ...ctx,
      anchors,
      slugAlias: tm.alias,
      onLink: (href) => {
        const h = String(href || '').trim();
        if (h.startsWith('#')) jumpRef.current(h.slice(1));
        else ctx.onLink(href);
      },
    }),
    [ctx, anchors, tm.alias]
  );
  return (
    <View collapsable={false} style={styles.ghMd}>
      {tm.busy && <Text style={styles.trNote}>{tr('Fordítás…')}</Text>}
      <MiniMd text={tm.text} ctx={rctx} />
    </View>
  );
}

function RelBadges({ r, latest }) {
  return (
    <>
      {latest && (
        <View style={[styles.relBadge, { borderColor: '#4ade80' }]}>
          <Text style={[styles.relBadgeText, { color: '#4ade80' }]}>{tr('Legújabb')}</Text>
        </View>
      )}
      {!!r.prerelease && (
        <View style={[styles.relBadge, { borderColor: '#ffb74d' }]}>
          <Text style={[styles.relBadgeText, { color: '#ffb74d' }]}>{tr('Előzetes')}</Text>
        </View>
      )}
      {!!r.draft && (
        <View style={styles.relBadge}>
          <Text style={styles.relBadgeText}>{tr('Piszkozat')}</Text>
        </View>
      )}
    </>
  );
}

const relMetaText = (r) =>
  [r.tag_name, fmtDate(r.published_at || r.created_at), r.author && r.author.login].filter(Boolean).join('  ·  ');

const relDownloads = (r) => (r.assets || []).reduce((s, a) => s + (a.download_count || 0), 0);

function ReleaseRow({ r, latest, first, open, onPress }) {
  return (
    <Btn style={[styles.relRow, !first && styles.relRowTop]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <View style={styles.relNameRow}>
          <Text style={styles.relName} numberOfLines={2}>{r.name || r.tag_name}</Text>
          <RelBadges r={r} latest={latest} />
        </View>
        <View style={styles.relMetaRow}>
          <Text style={[styles.relMeta, { marginTop: 0, flexShrink: 1 }]} numberOfLines={1}>{relMetaText(r)}</Text>
          <View style={styles.relDl}>
            <Ionicons name="download-outline" size={13} color={C.muted} />
            <Text style={styles.relDlText}>{fmt(relDownloads(r))}</Text>
          </View>
        </View>
      </View>
      <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={C.muted} />
    </Btn>
  );
}

function ReleasesBox({ releases, latest, onAll, onOpen }) {
  const cur = latest || releases[0];
  return (
    <View style={styles.relBox}>
      <Btn style={styles.relHead} onPress={onAll}>
        <Ionicons name="pricetag-outline" size={17} color={ic('pricetag-outline')} />
        <Text style={styles.relTitle}>{tr('Kiadások')}</Text>
        <View style={styles.relCount}>
          <Text style={styles.relCountText}>{releases.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </Btn>
      {!!cur && <ReleaseRow r={cur} latest={!!latest && latest.id === cur.id} first={false} onPress={() => onOpen(cur.id)} />}
    </View>
  );
}

function ReleaseDetail({ r, latest, repoUrl, ctx, hideHead }) {
  const assets = r.assets || [];
  const relBody = useTranslatedMd(String(r.body || '').slice(0, 20000));
  const tag = encPath(r.tag_name || '');
  const row = (key, icon, label, size, url) => (
    <Btn key={key} style={styles.relAsset} onPress={() => Linking.openURL(url)}>
      <Ionicons name={icon} size={18} color={ic(icon)} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.relAssetName, { flex: 0 }]}>{label}</Text>
        {!!size && <Text style={[styles.relAssetSize, { maxWidth: '100%', marginTop: 3 }]}>{size}</Text>}
      </View>
      <Ionicons name="download-outline" size={17} color={ic('download-outline')} />
    </Btn>
  );
  return (
    <View style={{ padding: 14 }}>
      {!hideHead && (
        <View>
          <View style={styles.relNameRow}>
            <Text style={styles.relName}>{r.name || r.tag_name}</Text>
            <RelBadges r={r} latest={latest} />
          </View>
          <Text style={styles.relMeta}>{relMetaText(r)}</Text>
        </View>
      )}
      {!!(r.body && r.body.trim()) && (
        <View style={styles.relNotes}>
          {relBody.busy && <Text style={styles.trNote}>{tr('Fordítás…')}</Text>}
          <MiniMd text={relBody.text} ctx={ctx} />
        </View>
      )}
      <Text style={styles.relFiles}>{tr('Fájlok')}</Text>
      <View style={styles.relAssets}>
        {assets.map((a) =>
          row(
            `a${a.id}`,
            'cube-outline',
            a.name,
            [fmtSize(a.size || 0), fmtDate(a.updated_at), `${a.download_count || 0} letöltés`].filter(Boolean).join('  ·  '),
            a.browser_download_url
          )
        )}
        {!r.draft && !!r.tag_name && row('zip', 'document-outline', tr('Forráskód (zip)'), '', `${repoUrl}/archive/refs/tags/${tag}.zip`)}
        {!r.draft && !!r.tag_name && row('tar', 'document-outline', tr('Forráskód (tar.gz)'), '', `${repoUrl}/archive/refs/tags/${tag}.tar.gz`)}
      </View>
    </View>
  );
}

// GitHub-style "+" dropdown in the repo header
function AddMenu({ anchor, onClose, onPick }) {
  const items = [
    { k: 'file', icon: 'document-text-outline', label: 'Új fájl létrehozása' },
    { k: 'upload', icon: 'cloud-upload-outline', label: 'Fájlok feltöltése' },
    { k: 'folder', icon: 'folder-outline', label: 'Új mappa létrehozása' },
  ];
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.addMenu, { top: anchor ? anchor.y + anchor.h + 6 : 100, right: 14 }]}>
        {items.map((it, i) => (
          <Btn
            key={it.k}
            style={[styles.addMenuRow, it.sep && styles.addMenuSep, i === items.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => onPick(it.k)}
          >
            <Ionicons name={it.icon} size={19} color={ic(it.icon)} />
            <Text style={styles.addMenuText}>{tr(it.label)}</Text>
          </Btn>
        ))}
      </View>
    </Modal>
  );
}

// Native versions of the github.com pages: new file, new folder, upload files, new release.
function RepoComposer({ kind, owner, name, token, branch, dir, onClose, onDone, onReleased }) {
  const [fname, setFname] = useState('');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState('');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState([]);
  const [tag, setTag] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [pre, setPre] = useState(false);
  const [latest, setLatest] = useState(true);
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const created = useRef(null);
  const uploaded = useRef(new Set());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (kind !== 'release') return;
    ghGet(`/repos/${owner}/${name}/tags?per_page=12`, token)
      .then((d) => alive.current && setTags(Array.isArray(d) ? d.map((t) => t.name) : []))
      .catch(() => {});
  }, [kind, owner, name, token]);

  const dirty = !!(fname || content || msg || desc || files.length || tag || title || notes);
  const close = () => {
    if (busy) return;
    if (dirty) {
      Alert.alert(tr('Elveted a módosításokat?'), tr('A nem mentett változtatások elvesznek.'), [
        { text: tr('Mégse'), style: 'cancel' },
        { text: tr('Elvetés'), style: 'destructive', onPress: onClose },
      ]);
    } else onClose();
  };

  const pick = async () => {
    setErr('');
    try {
      const picked = await pickFiles();
      if (!picked.length) return;
      const max = kind === 'release' ? RELEASE_FILE_MAX : UPLOAD_FILE_MAX;
      let skipped = false;
      let next = files.slice();
      picked.forEach((p) => {
        if (p.size > max) {
          skipped = true;
          return;
        }
        const i = next.findIndex((x) => x.name === p.name);
        if (i >= 0) next[i] = p;
        else next.push(p);
      });
      if (kind === 'upload' && next.length > UPLOAD_FILES_MAX) {
        next = next.slice(0, UPLOAD_FILES_MAX);
        skipped = true;
      }
      setFiles(next);
      if (skipped) setErr('Egy vagy több fájl túl nagy (vagy túl sok a fájl), ezeket kihagytam.');
    } catch (e) {
      setErr(
        e && e.message === 'nopicker'
          ? 'Fájlok kiválasztásához telepítsd az expo-document-picker csomagot.'
          : 'Nem sikerült a fájlok kiválasztása.'
      );
    }
  };

  const defMsg =
    kind === 'file'
      ? `Create ${fname.trim() || 'new file'}`
      : kind === 'folder'
      ? `Create ${fname.trim() || 'new'} folder`
      : 'Add files via upload';

  const commit = async () => {
    if (busy) return;
    setErr('');
    const message = (msg.trim() || defMsg) + (desc.trim() ? `\n\n${desc.trim()}` : '');
    const n = fname.trim();
    if (kind === 'upload' && !files.length) {
      setErr('Válassz ki legalább egy fájlt.');
      return;
    }
    if (kind !== 'upload') {
      if (!n) {
        setErr(kind === 'file' ? 'Adj meg egy fájlnevet.' : 'Adj meg egy mappanevet.');
        return;
      }
      if (!validPath(n)) {
        setErr('Érvénytelen név (nem lehet üres, . vagy .. rész, és nem kezdődhet vagy végződhet /-rel).');
        return;
      }
    }
    setBusy('commit');
    try {
      if (kind === 'upload') {
        await commitFiles(
          owner,
          name,
          token,
          branch,
          files.map((f) => ({ path: joinPath(dir, f.name), uri: f.uri })),
          message,
          (i, t) => alive.current && setProgress(`${tr('Feltöltés')} ${i}/${t}…`)
        );
      } else if (kind === 'folder') {
        await putNew(owner, name, token, branch, joinPath(dir, `${n}/.gitkeep`), '', message);
      } else {
        await putNew(owner, name, token, branch, joinPath(dir, n), toBase64(content), message);
      }
      if (alive.current) setBusy('');
      onDone();
    } catch (e) {
      if (alive.current) {
        setErr(commitErr(e));
        setBusy('');
        setProgress('');
      }
    }
  };

  const genNotes = async () => {
    if (busy) return;
    const t = tag.trim();
    if (!t) {
      setErr('Adj meg egy taget.');
      return;
    }
    setErr('');
    setBusy('notes');
    try {
      const r = await ghSend('POST', `/repos/${owner}/${name}/releases/generate-notes`, token, {
        tag_name: t,
        ...(branch ? { target_commitish: branch } : {}),
      });
      if (!alive.current) return;
      if (r && r.name && !title.trim()) setTitle(r.name);
      if (r && r.body) setNotes(r.body);
    } catch (e) {
      if (alive.current) setErr('Nem sikerült a jegyzetek generálása.');
    } finally {
      if (alive.current) setBusy('');
    }
  };

  const release = async (asDraft) => {
    if (busy) return;
    const t = tag.trim();
    if (!t) {
      setErr('Adj meg egy taget.');
      return;
    }
    if (/\s/.test(t)) {
      setErr('A tag nem tartalmazhat szóközt.');
      return;
    }
    setErr('');
    setBusy(asDraft ? 'draft' : 'publish');
    const needDraft = asDraft || files.length > 0; // files are attached before the release goes public
    const makeLatest = latest && !pre ? 'true' : 'false';
    try {
      let rel = created.current;
      if (!rel) {
        rel = await ghSend('POST', `/repos/${owner}/${name}/releases`, token, {
          tag_name: t,
          ...(branch ? { target_commitish: branch } : {}),
          name: title.trim() || t,
          body: notes,
          draft: needDraft,
          prerelease: pre,
          ...(needDraft ? {} : { make_latest: makeLatest }),
        });
        created.current = rel;
      }
      for (let i = 0; i < files.length; i++) {
        if (uploaded.current.has(files[i].uri)) continue;
        if (alive.current) setProgress(`${tr('Feltöltés')} ${i + 1}/${files.length}…`);
        await uploadAsset(owner, name, token, rel.id, files[i]);
        uploaded.current.add(files[i].uri);
      }
      if (needDraft && !asDraft) {
        rel = await ghSend('PATCH', `/repos/${owner}/${name}/releases/${rel.id}`, token, {
          draft: false,
          prerelease: pre,
          make_latest: makeLatest,
        });
      }
      if (alive.current) setBusy('');
      onReleased(rel);
    } catch (e) {
      if (alive.current) {
        setErr(
          created.current
            ? 'A kiadás piszkozatként létrejött, de egy fájl feltöltése nem sikerült. Próbáld újra.'
            : e && e.status === 422
            ? 'Ilyen tagű kiadás már létezik, vagy érvénytelen a tag.'
            : e && (e.status === 403 || e.status === 404)
            ? NO_WRITE
            : 'Nem sikerült menteni. Ellenőrizd az internetkapcsolatot.'
        );
        setBusy('');
        setProgress('');
      }
    }
  };

  const heading = {
    file: 'Új fájl',
    folder: 'Új mappa',
    upload: 'Fájlok feltöltése',
    release: 'Új kiadás',
  }[kind];

  const fileRows = files.map((f) => (
    <View key={f.uri} style={styles.cmpFile}>
      <Ionicons name="document-outline" size={18} color={ic('document-outline')} />
      <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
      {!!f.size && <Text style={styles.relAssetSize}>{fmtSize(f.size)}</Text>}
      <Btn style={styles.miniBtn} onPress={() => setFiles(files.filter((x) => x !== f))}>
        <Ionicons name="close" size={16} color={ic('close')} />
      </Btn>
    </View>
  ));

  const dropBox = (label, hint) => (
    <Btn style={styles.cmpDrop} onPress={pick}>
      <Ionicons name="cloud-upload-outline" size={30} color={ic('cloud-upload-outline')} />
      <Text style={styles.cmpDropText}>{tr(label)}</Text>
      {!!hint && <Text style={styles.cmpDropHint}>{tr(hint)}</Text>}
    </Btn>
  );

  const commitBox = (
    <View style={styles.cmpCommit}>
      <Text style={styles.cmpCommitTitle}>{tr('Commit változtatások')}</Text>
      <TextInput
        style={styles.commitInput}
        value={msg}
        onChangeText={setMsg}
        placeholder={defMsg}
        placeholderTextColor={C.dim}
      />
      <TextInput
        style={[styles.commitInput, { minHeight: 74, textAlignVertical: 'top' }]}
        value={desc}
        onChangeText={setDesc}
        placeholder={tr('Bővebb leírás (nem kötelező)')}
        placeholderTextColor={C.dim}
        multiline
      />
      <View style={styles.cmpBranch}>
        <Ionicons name="git-branch-outline" size={15} color={ic('git-branch-outline')} />
        <Text style={styles.cmpBranchText} numberOfLines={1}>
          {tr('Commit közvetlenül ide:')} {branch}
        </Text>
      </View>
      <Btn style={[styles.cmpGreen, !!busy && { opacity: 0.6 }]} onPress={commit}>
        {busy === 'commit' ? (
          <View style={styles.rowCenter}>
            <ActivityIndicator size="small" color="#fff" />
            {!!progress && <Text style={[styles.cmpGreenText, { marginLeft: 8 }]}>{progress}</Text>}
          </View>
        ) : (
          <Text style={styles.cmpGreenText}>{tr('Commit változtatások')}</Text>
        )}
      </Btn>
    </View>
  );

  return (
    <Modal animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.repoWrap}>
        <View style={styles.repoHead}>
          <Btn style={styles.roundBtn} onPress={close}>
            <Ionicons name="close" size={21} color={ic('close')} />
          </Btn>
          <View style={{ flex: 1 }}>
            <Text style={styles.repoOver} numberOfLines={1}>{`${owner}/${name}${dir ? `/${dir}` : ''}`}</Text>
            <Text style={styles.repoTitle} numberOfLines={1}>{tr(heading)}</Text>
          </View>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.repoBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {(kind === 'file' || kind === 'folder') && (
              <View>
                <Text style={styles.editLabel}>{tr(kind === 'file' ? 'Fájl neve' : 'Mappa neve')}</Text>
                <View style={styles.cmpPathRow}>
                  <Text style={styles.cmpPathPrefix} numberOfLines={1}>{`${name}/${dir ? `${dir}/` : ''}`}</Text>
                  <TextInput
                    style={styles.cmpPathInput}
                    value={fname}
                    onChangeText={setFname}
                    placeholder={kind === 'file' ? 'index.js' : 'src'}
                    placeholderTextColor={C.dim}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoFocus
                  />
                </View>
                {kind === 'folder' && (
                  <Text style={styles.cmpHint}>{tr('A GitHub nem tárol üres mappát, ezért egy .gitkeep fájl kerül bele.')}</Text>
                )}
                {kind === 'file' && (
                  <View>
                    <Text style={styles.editLabel}>{tr('Tartalom')}</Text>
                    <TextInput
                      style={[styles.editInput, { minHeight: 240 }]}
                      value={content}
                      onChangeText={setContent}
                      multiline
                      scrollEnabled={false}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </View>
            )}

            {kind === 'upload' && (
              <View>
                {dropBox('Koppints a fájlok kiválasztásához', 'Legfeljebb 100 fájl, egyenként legfeljebb 25 MB.')}
                {files.length > 0 && <View style={styles.fileList}>{fileRows}</View>}
              </View>
            )}

            {kind === 'release' ? (
              <View>
                <Text style={styles.editLabel}>{tr('Tag')}</Text>
                <TextInput
                  style={styles.commitInput}
                  value={tag}
                  onChangeText={setTag}
                  placeholder="v1.0.0"
                  placeholderTextColor={C.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoFocus
                />
                {tags.length > 0 && (
                  <View style={styles.cmpChips}>
                    {tags.map((t) => (
                      <Btn key={t} style={[styles.seg, tag === t && styles.segOn]} onPress={() => setTag(t)}>
                        <Text style={styles.segText}>{t}</Text>
                      </Btn>
                    ))}
                  </View>
                )}
                <Text style={styles.cmpHint}>
                  {tr('Ha a tag még nem létezik, közzétételkor létrejön ezen az ágon:')} {branch}
                </Text>

                <Text style={[styles.editLabel, { marginTop: 14 }]}>{tr('Kiadás címe')}</Text>
                <TextInput
                  style={styles.commitInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={tag.trim() || tr('Kiadás címe')}
                  placeholderTextColor={C.dim}
                />

                <View style={styles.cmpLabelRow}>
                  <Text style={[styles.editLabel, { flex: 1, marginBottom: 0 }]}>{tr('Leírás')}</Text>
                  <Btn style={[styles.cmpLink, busy === 'notes' && { opacity: 0.5 }]} onPress={genNotes}>
                    {busy === 'notes' ? (
                      <ActivityIndicator size="small" color={C.muted} />
                    ) : (
                      <Text style={styles.cmpLinkText}>{tr('Kiadási jegyzetek generálása')}</Text>
                    )}
                  </Btn>
                </View>
                <TextInput
                  style={[styles.editInput, { minHeight: 160, marginTop: 6 }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={tr('Mi változott ebben a kiadásban?')}
                  placeholderTextColor={C.dim}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                />

                <Text style={[styles.editLabel, { marginTop: 14 }]}>{tr('Fájlok csatolása')}</Text>
                {dropBox('Koppints a fájlok kiválasztásához', '')}
                {files.length > 0 && <View style={styles.fileList}>{fileRows}</View>}

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{tr('Előzetes kiadás')}</Text>
                  <Switch
                    value={pre}
                    onValueChange={(v) => {
                      setPre(v);
                      if (v) setLatest(false);
                    }}
                    trackColor={{ false: C.grayHi, true: '#4ade80' }}
                    thumbColor={C.text}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, pre && { opacity: 0.4 }]}>{tr('Legújabb kiadás')}</Text>
                  <Switch
                    value={latest && !pre}
                    disabled={pre}
                    onValueChange={setLatest}
                    trackColor={{ false: C.grayHi, true: '#4ade80' }}
                    thumbColor={C.text}
                  />
                </View>

                {!!err && <Text style={styles.formError}>{tr(err)}</Text>}
                <Btn style={[styles.cmpGreen, { marginTop: 20 }, !!busy && { opacity: 0.6 }]} onPress={() => release(false)}>
                  {busy === 'publish' ? (
                    <View style={styles.rowCenter}>
                      <ActivityIndicator size="small" color="#fff" />
                      {!!progress && <Text style={[styles.cmpGreenText, { marginLeft: 8 }]}>{progress}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.cmpGreenText}>{tr('Kiadás közzététele')}</Text>
                  )}
                </Btn>
                <Btn style={[styles.cmpGhost, !!busy && { opacity: 0.6 }]} onPress={() => release(true)}>
                  {busy === 'draft' ? (
                    <ActivityIndicator size="small" color={C.muted} />
                  ) : (
                    <Text style={styles.cmpGhostText}>{tr('Piszkozat mentése')}</Text>
                  )}
                </Btn>
              </View>
            ) : (
              <View>
                {!!err && <Text style={styles.formError}>{tr(err)}</Text>}
                {commitBox}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function RepoScreen({ repo, token, onClose }) {
  const { owner, name } = repo || {};
  const [info, setInfo] = useState(null);
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [readme, setReadme] = useState(null);
  const [releases, setReleases] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawView, setRawView] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [relView, setRelView] = useState(null);
  const [filesView, setFilesView] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [composer, setComposer] = useState(null);
  const plusRef = useRef(null);
  const relPos = useRef({});
  const segY = useRef({});
  const seq = useRef(0);
  const rseq = useRef(0);
  const actions = useRef({});
  const scrollRef = useRef(null);

  const loadDir = useCallback(
    async (p) => {
      const id = ++seq.current;
      setLoading(true);
      setError('');
      setFile(null);
      setEditing(false);
      setRelView(null);
      setFilesView(false);
      try {
        const list = await ghGet(`/repos/${owner}/${name}/contents/${encPath(p)}`, token);
        if (id !== seq.current) return;
        const arr = (Array.isArray(list) ? list : []).slice().sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(arr);
        setPath(p);
        if (p === '') {
          const rid = ++rseq.current;
          ghGet(`/repos/${owner}/${name}/readme`, token)
            .then(async (meta) => {
              const t = String(await ghGet(`/repos/${owner}/${name}/contents/${encPath(meta.path)}`, token, true));
              if (rid === rseq.current)
                setReadme({ name: meta.name, path: meta.path, text: t.slice(0, FILE_MAX_CHARS), full: t.length <= FILE_MAX_CHARS });
            })
            .catch(() => rid === rseq.current && setReadme(null));
        }
      } catch (e) {
        if (id === seq.current) setError(errText(e));
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [owner, name, token]
  );

  useEffect(() => {
    if (!repo) return undefined;
    setInfo(null);
    setPath('');
    setEntries([]);
    setReadme(null);
    setReleases([]);
    setRelView(null);
    setFile(null);
    setEditing(false);
    loadDir('');
    let alive = true;
    ghGet(`/repos/${owner}/${name}`, token)
      .then((d) => alive && setInfo(d))
      .catch(() => {});
    ghGet(`/repos/${owner}/${name}/releases?per_page=20`, token)
      .then((d) => alive && setReleases(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => {
      alive = false;
      seq.current++;
      rseq.current++;
    };
  }, [repo, owner, name, token, loadDir]);

  const openFile = async (entry) => {
    const id = ++seq.current;
    setEditing(false);
    setRelView(null);
    setSaveErr('');
    setRawView(false);
    const base = { name: entry.name, path: entry.path };
    setLoading(true);
    setError('');
    try {
      if (IMG_EXT.test(entry.name)) {
        const uri = await loadRepoImage(owner, name, entry.path, token);
        if (id === seq.current) setFile({ ...base, kind: 'image', uri });
        return;
      }
      if (entry.size > FILE_MAX_BYTES) {
        if (id === seq.current) setFile({ ...base, kind: 'other', msg: 'A fájl túl nagy az előnézethez.' });
        return;
      }
      const t = String(await ghGet(`/repos/${owner}/${name}/contents/${encPath(entry.path)}`, token, true));
      if (id !== seq.current) return;
      if (t.indexOf('\u0000') !== -1) {
        setFile({ ...base, kind: 'other', msg: 'Ez a fájl nem szöveges, nem jeleníthető meg.' });
      } else {
        setFile({
          ...base,
          kind: 'text',
          text: t.slice(0, FILE_MAX_CHARS),
          full: t.length <= FILE_MAX_CHARS,
          msg: t.length > FILE_MAX_CHARS ? 'A fájl eleje látszik.' : '',
        });
      }
    } catch (e) {
      if (id === seq.current) setError(errText(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  };

  const openPath = async (p) => {
    if (!p) {
      loadDir('');
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const j = await ghGet(`/repos/${owner}/${name}/contents/${encPath(p)}`, token);
      if (id !== seq.current) return;
      if (Array.isArray(j)) loadDir(p);
      else openFile({ name: j.name, path: j.path, size: j.size });
    } catch (e) {
      if (id === seq.current) {
        setError(errText(e));
        setLoading(false);
      }
    }
  };

  const handleLink = (href, dir) => {
    const h = String(href || '').trim();
    if (!h || h.startsWith('#')) return;
    let rel = null;
    const m = h.match(new RegExp(`^https?://github\\.com/${escRe(owner)}/${escRe(name)}/(?:blob|tree)/[^/]+/(.+)$`, 'i'));
    if (m) rel = resolveRepoPath(m[1], '');
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(h) && !h.startsWith('//')) rel = resolveRepoPath(h, dir);
    if (rel === null) Linking.openURL(h.startsWith('//') ? 'https:' + h : h).catch(() => {});
    else actions.current.openPath(rel);
  };
  actions.current = { openPath };

  const canPush = !!(info && info.permissions && info.permissions.push && token);

  const beginEdit = (f) => {
    setDraft(f.text || '');
    setCommitMsg(`Update ${f.name}`);
    setSaveErr('');
    setEditing(true);
  };

  const openReadme = (edit) => {
    if (!readme) return;
    const f = { name: readme.name, path: readme.path, kind: 'text', text: readme.text, full: readme.full, msg: '' };
    seq.current++;
    setFile(f);
    setRawView(false);
    if (edit) beginEdit(f);
    else setEditing(false);
  };

  const save = async () => {
    if (!file || saving) return;
    setSaving(true);
    setSaveErr('');
    try {
      const cur = await ghGet(`/repos/${owner}/${name}/contents/${encPath(file.path)}`, token);
      const body = {
        message: commitMsg.trim() || `Update ${file.name}`,
        content: toBase64(draft),
        sha: cur.sha,
      };
      if (info && info.default_branch) body.branch = info.default_branch;
      await ghSend('PUT', `/repos/${owner}/${name}/contents/${encPath(file.path)}`, token, body);
      setFile({ ...file, text: draft });
      if (readme && readme.path === file.path) setReadme({ ...readme, text: draft.slice(0, FILE_MAX_CHARS) });
      setEditing(false);
    } catch (e) {
      setSaveErr(
        e && (e.status === 409 || e.status === 422)
          ? 'A fájl közben megváltozott a GitHubon. Lépj ki, nyisd meg újra, és szerkeszd újra.'
          : e && (e.status === 403 || e.status === 404)
          ? 'Nincs írási jogod ehhez a repóhoz (vagy a belépési token nem engedi a módosítást).'
          : 'Nem sikerült menteni. Ellenőrizd az internetkapcsolatot.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openFilesView = () => {
    setFilesView(true);
    if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false });
  };

  const openMenu = () => {
    const show = (a) => {
      setMenuAnchor(a);
      setMenuOpen(true);
    };
    if (plusRef.current && plusRef.current.measureInWindow) {
      plusRef.current.measureInWindow((x, y, w, h) => show({ x, y, w, h }));
    } else show(null);
  };

  const pickKind = (k) => {
    setMenuOpen(false);
    setComposer({ kind: k, dir: file ? parentDir(file.path) : path });
  };

  const afterCommit = () => {
    const d = composer ? composer.dir : path;
    setComposer(null);
    loadDir(d);
  };

  const afterRelease = (rel) => {
    setComposer(null);
    ghGet(`/repos/${owner}/${name}/releases?per_page=20`, token)
      .then((d) => {
        const l = Array.isArray(d) ? d : [];
        setReleases(l);
        if (rel && l.some((r) => r.id === rel.id)) {
          setFile(null);
          setEditing(false);
          setRelView({ all: true, id: rel.id });
        }
      })
      .catch(() => {});
  };

  const openRelFromBox = (id) => {
    setRelView({ all: true, id });
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTo({ y: Math.max(0, (segY.current[id] || 0) + (relPos.current[id] || 0) + 8), animated: false });
    }, 80);
  };

  const goBack = () => {
    if (relView) {
      setRelView(null);
      return;
    }
    if (editing) {
      if (file && draft !== file.text) {
        Alert.alert(tr('Elveted a módosításokat?'), tr('A nem mentett változtatások elvesznek.'), [
          { text: tr('Mégse'), style: 'cancel' },
          { text: tr('Elvetés'), style: 'destructive', onPress: () => setEditing(false) },
        ]);
      } else setEditing(false);
      return;
    }
    if (file) {
      setFile(null);
      return;
    }
    if (filesView) {
      setFilesView(false);
      return;
    }
    if (path) {
      loadDir(path.split('/').slice(0, -1).join('/'));
      return;
    }
    onClose();
  };

  const mdPath = file ? file.path : readme ? readme.path : '';
  const dir = mdPath.includes('/') ? mdPath.split('/').slice(0, -1).join('/') : '';
  const ctx = useMemo(
    () => ({ owner, name, token, dir, onLink: (h) => handleLink(h, dir) }),
    [owner, name, token, dir]
  );

  if (!repo) return null;
  const url = (info && info.html_url) || repo.url || `https://github.com/${owner}/${name}`;
  const desc = (info && info.description) || repo.desc;
  const lang = (info && info.language) || repo.lang;
  const stars = info ? info.stargazers_count : repo.stars;
  const forks = info ? info.forks_count : repo.forks;
  const isPrivate = info ? info.private : repo.isPrivate;
  const avatar = info && info.owner && info.owner.avatar_url;
  const title = relView
    ? tr('Kiadások')
    : editing
    ? tr('Szerkesztés')
    : file ? file.name : filesView ? tr('Fájlok') : path ? path.split('/').pop() : name;
  const isMd = !!file && MD_EXT.test(file.name);
  const latestRel = releases.find((r) => !r.prerelease && !r.draft) || null;
  const canEditFile = !!file && file.kind === 'text' && !!file.full && canPush && !editing;

  return (
    <Modal animationType="slide" onRequestClose={goBack} statusBarTranslucent>
      <View style={styles.repoWrap}>
        <View style={styles.repoHead}>
          <Btn style={styles.roundBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color={ic('arrow-back')} />
          </Btn>
          <View style={{ flex: 1 }}>
            <Text style={styles.repoOver} numberOfLines={1}>
              {relView ? `${owner}/${name}` : file ? `${owner}/${name}/${file.path}` : filesView ? `${owner}/${name}` : path ? `${owner}/${name}/${path}` : owner}
            </Text>
            <Text style={styles.repoTitle} numberOfLines={1}>{title}</Text>
          </View>
          {editing ? (
            <Btn style={[styles.roundBtn, saving && { opacity: 0.5 }]} onPress={save}>
              {saving ? (
                <ActivityIndicator size="small" color={C.muted} />
              ) : (
                <Ionicons name="checkmark" size={21} color={ic('checkmark')} />
              )}
            </Btn>
          ) : (
            <>
              {canEditFile && (
                <Btn style={styles.roundBtn} onPress={() => beginEdit(file)}>
                  <Ionicons name="create-outline" size={19} color={ic('create-outline')} />
                </Btn>
              )}
              {canPush && (
                <View ref={plusRef} collapsable={false}>
                  <Btn style={styles.roundBtn} onPress={relView ? () => setComposer({ kind: 'release', dir: '' }) : openMenu}>
                    <Ionicons name="add" size={22} color={ic('add')} />
                  </Btn>
                </View>
              )}
              <Btn style={styles.roundBtn} onPress={() => Linking.openURL(relView ? `${url}/releases` : url)}>
                <Ionicons name="open-outline" size={19} color={ic('open-outline')} />
              </Btn>
            </>
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.repoBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!file && !path && !relView && !filesView && (
              <View style={styles.repoInfo}>
                <View style={styles.rowCenter}>
                  {!!avatar && <Image source={{ uri: avatar }} style={styles.repoAvatar} />}
                  <Ionicons
                    name={isPrivate ? 'lock-closed-outline' : 'book-outline'}
                    size={16}
                    color={ic(isPrivate ? 'lock-closed-outline' : 'book-outline')}
                  />
                  <Text style={styles.repoVis}>{tr(isPrivate ? 'Privát' : 'Publikus')}</Text>
                </View>
                {!!desc && <AText style={styles.repoDesc}>{desc}</AText>}
                <View style={styles.repoStats}>
                  {!!lang && (
                    <View style={styles.repoStat}>
                      <Ionicons name="code-slash-outline" size={14} color={ic('code-slash-outline')} />
                      <Text style={styles.repoStatText}>{lang}</Text>
                    </View>
                  )}
                  {stars != null && (
                    <View style={styles.repoStat}>
                      <Ionicons name="star" size={14} color={ic('star')} />
                      <Text style={styles.repoStatText}>{fmt(stars)}</Text>
                    </View>
                  )}
                  {forks != null && (
                    <View style={styles.repoStat}>
                      <Ionicons name="git-network-outline" size={14} color={ic('git-network-outline')} />
                      <Text style={styles.repoStatText}>{fmt(forks)}</Text>
                    </View>
                  )}
                  {!!(info && info.default_branch) && (
                    <View style={styles.repoStat}>
                      <Ionicons name="git-branch-outline" size={14} color={ic('git-branch-outline')} />
                      <Text style={styles.repoStatText}>{info.default_branch}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {loading && <ActivityIndicator color={C.muted} style={{ marginVertical: 24 }} />}
            {!!error && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={styles.errorBanner}>{tr(error)}</Text>
                <Btn style={styles.primaryBtn} onPress={() => Linking.openURL(url)}>
                  <Text style={styles.primaryBtnText}>{tr('Megnyitás GitHubon')}</Text>
                </Btn>
              </View>
            )}

            {!!relView && !error && (
              <View>
                {releases.length === 0 && (
                  <View style={styles.relBox}>
                    <Text style={styles.repoNote}>{tr('Még nincs kiadás.')}</Text>
                  </View>
                )}
                {(() => {
                  // the opened release gets its own bubble, the others stay grouped
                  const segs = [];
                  releases.forEach((r) => {
                    const open = relView.id === r.id;
                    const last = segs[segs.length - 1];
                    if (!open && last && !last.open) last.items.push(r);
                    else segs.push({ open, items: [r] });
                  });
                  return segs.map((sg) => (
                    <View
                      key={sg.items[0].id}
                      style={styles.relBox}
                      onLayout={(e) => {
                        sg.items.forEach((r) => {
                          segY.current[r.id] = e.nativeEvent.layout.y;
                        });
                      }}
                    >
                      {sg.items.map((r, k) => (
                        <View
                          key={r.id}
                          onLayout={(e) => {
                            relPos.current[r.id] = e.nativeEvent.layout.y;
                          }}
                        >
                          <ReleaseRow
                            r={r}
                            latest={!!latestRel && latestRel.id === r.id}
                            first={k === 0}
                            open={sg.open}
                            onPress={() => setRelView({ all: true, id: sg.open ? null : r.id })}
                          />
                          {sg.open && (
                            <View style={styles.relOpenBody}>
                              <ReleaseDetail hideHead r={r} latest={!!latestRel && latestRel.id === r.id} repoUrl={url} ctx={ctx} />
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ));
                })()}
              </View>
            )}

            {!!file && editing && (
              <View>
                <Text style={styles.editLabel}>{tr('Commit üzenet')}</Text>
                <TextInput
                  style={styles.commitInput}
                  value={commitMsg}
                  onChangeText={setCommitMsg}
                  placeholder={`Update ${file.name}`}
                  placeholderTextColor={C.dim}
                />
                <Text style={styles.editLabel}>{tr('Tartalom')}</Text>
                <TextInput
                  style={styles.editInput}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  scrollEnabled={false}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textAlignVertical="top"
                />
                {!!saveErr && <Text style={styles.errorBanner}>{tr(saveErr)}</Text>}
                <Btn style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={save}>
                  <Text style={styles.primaryBtnText}>{tr(saving ? 'Mentés…' : 'Mentés a GitHubra')}</Text>
                </Btn>
              </View>
            )}

            {!!file && !editing && !loading && !error && (
              <View>
                {!!file.msg && <Text style={styles.repoNote}>{tr(file.msg)}</Text>}
                {file.kind === 'image' && <FileImage uri={file.uri} />}
                {file.kind === 'text' && (
                  <View>
                    {isMd && (
                      <View style={styles.segRow}>
                        <Btn style={[styles.seg, !rawView && styles.segOn]} onPress={() => setRawView(false)}>
                          <Text style={styles.segText}>{tr('Előnézet')}</Text>
                        </Btn>
                        <Btn style={[styles.seg, rawView && styles.segOn]} onPress={() => setRawView(true)}>
                          <Text style={styles.segText}>{tr('Forrás')}</Text>
                        </Btn>
                      </View>
                    )}
                    {isMd && !rawView ? (
                      <View style={styles.ghBox}>
                        <GhReadme
                          owner={owner}
                          name={name}
                          path={file.path}
                          token={token}
                          isPrivate={!!isPrivate}
                          branch={info && info.default_branch}
                          text={file.text}
                          ctx={ctx}
                          scrollRef={scrollRef}
                        />
                      </View>
                    ) : isMd ? (
                      <View style={styles.fileBox}>
                        <Text style={styles.fileText} selectable>{file.text}</Text>
                      </View>
                    ) : (
                      !!file.text && (
                        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={styles.fileBox}>
                          <Text style={styles.fileText} selectable>{file.text}</Text>
                        </ScrollView>
                      )
                    )}
                    {canPush && !file.full && (
                      <Text style={styles.repoNote}>{tr('Ez a fájl túl hosszú az appban való szerkesztéshez.')}</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {!file && !relView && !error && (
              <View>
                {!path && !filesView && (releases.length > 0 || canPush) && (
                  <ReleasesBox
                    releases={releases}
                    latest={latestRel}
                    onAll={() => setRelView({ all: true })}
                    onOpen={openRelFromBox}
                  />
                )}
                {entries.length > 0 &&
                  (() => {
                    const limited = !path && !filesView;
                    const shown = limited ? entries.slice(0, FILES_PREVIEW) : entries;
                    return (
                      <>
                        {limited && (
                          <Btn style={[styles.relBox, styles.relHead, styles.filesHead]} onPress={openFilesView}>
                            <Text style={styles.relTitle}>{tr('Fájlok')}</Text>
                            <View style={styles.relCount}>
                              <Text style={styles.relCountText}>{entries.length}</Text>
                            </View>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={16} color={C.muted} />
                          </Btn>
                        )}
                        <View style={styles.fileList}>
                          {shown.map((en, i) => {
                            const dirE = en.type === 'dir';
                            const icon = dirE ? 'folder-outline' : IMG_EXT.test(en.name) ? 'image-outline' : 'document-text-outline';
                            return (
                              <Btn
                                key={en.path}
                                style={[styles.fileRow, i === shown.length - 1 && { borderBottomWidth: 0 }]}
                                onPress={() => (dirE ? loadDir(en.path) : openFile(en))}
                              >
                                <Ionicons name={icon} size={19} color={ic(icon)} />
                                <Text style={styles.fileName} numberOfLines={1}>{en.name}</Text>
                                {dirE && <Ionicons name="chevron-forward" size={16} color={C.muted} />}
                              </Btn>
                            );
                          })}
                        </View>
                      </>
                    );
                  })()}
                {!loading && entries.length === 0 && <Text style={styles.repoNote}>{tr('Ez a mappa üres.')}</Text>}
                {!!readme && !path && !filesView && (
                  <View style={styles.ghBox}>
                    <Btn style={styles.ghHead} onPress={() => openReadme(false)}>
                      <Ionicons name="book-outline" size={16} color={ic('book-outline')} />
                      <Text style={styles.ghHeadText} numberOfLines={1}>{readme.name}</Text>
                      {canPush && readme.full && (
                        <Btn style={styles.miniBtn} onPress={() => openReadme(true)}>
                          <Ionicons name="create-outline" size={16} color={ic('create-outline')} />
                        </Btn>
                      )}
                      <Ionicons name="expand-outline" size={16} color={C.muted} />
                    </Btn>
                    <GhReadme
                      owner={owner}
                      name={name}
                      path={readme.path}
                      token={token}
                      isPrivate={!!isPrivate}
                      branch={info && info.default_branch}
                      text={readme.text}
                      ctx={ctx}
                      scrollRef={scrollRef}
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {menuOpen && <AddMenu anchor={menuAnchor} onClose={() => setMenuOpen(false)} onPick={pickKind} />}
        {!!composer && (
          <RepoComposer
            kind={composer.kind}
            owner={owner}
            name={name}
            token={token}
            branch={(info && info.default_branch) || ''}
            dir={composer.dir}
            onClose={() => setComposer(null)}
            onDone={afterCommit}
            onReleased={afterRelease}
          />
        )}
      </View>
    </Modal>
  );
}

function DetailSheet({ selected, onClose }) {
  if (!selected) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.rowCenter}>
          <View style={styles.cardIcon}>
            <Ionicons name={selected.icon} size={18} color={ic(selected.icon)} />
          </View>
          <Text style={styles.sheetOverline} numberOfLines={1}>{selected.overline}</Text>
        </View>
        {selected.tTitle ? (
          <AText style={styles.sheetTitle}>{selected.title}</AText>
        ) : (
          <Text style={styles.sheetTitle}>{selected.title}</Text>
        )}
        {!!selected.body && <AText style={styles.sheetBody}>{selected.body}</AText>}
        <Text style={styles.sheetMeta}>{selected.meta}</Text>

        <Btn
          style={styles.primaryBtn}
          activeOpacity={0.8}
          onPress={() => selected.url && Linking.openURL(selected.url)}
        >
          <Text style={styles.primaryBtnText}>{tr('Megnyitás')}</Text>
        </Btn>
        <Btn style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryBtnText}>{tr('Bezár')}</Text>
        </Btn>
      </View>
    </Modal>
  );
}

function ListSheet({ data, onClose }) {
  if (!data) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { marginTop: 0 }]}>{tr(data.title)}</Text>

        {data.loading ? (
          <ActivityIndicator color={C.muted} style={{ marginVertical: 28 }} />
        ) : data.items.length === 0 ? (
          <EmptyText>{tr(data.empty || 'Nincs itt semmi.')}</EmptyText>
        ) : (
          <ScrollView style={styles.sheetList}>
            {data.items.map((it) => (
              <Btn
                key={it.id}
                style={styles.listRow}
                activeOpacity={0.8}
                onPress={() => {
                  if (it.onPress) it.onPress();
                  else if (it.url) Linking.openURL(it.url);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{tr(it.title)}</Text>
                  {!!it.sub && <Text style={styles.listRowSub} numberOfLines={1}>{tr(it.sub)}</Text>}
                </View>
                <Ionicons
                  name={it.selected ? 'checkmark' : 'chevron-forward'}
                  size={18}
                  color={it.selected ? '#4ade80' : C.muted}
                />
              </Btn>
            ))}
          </ScrollView>
        )}

        <Btn style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryBtnText}>{tr('Bezár')}</Text>
        </Btn>
      </View>
    </Modal>
  );
}

function NewRepoModal({ visible, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setDesc('');
      setIsPrivate(true);
      setBusy(false);
      setError('');
    }
  }, [visible]);

  const submit = async () => {
    const clean = name.trim().replace(/\s+/g, '-');
    if (!clean) {
      setError('Adj nevet a repónak.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await onCreate({ name: clean, description: desc.trim(), isPrivate });
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { marginTop: 0 }]}>{tr('Új repó')}</Text>

          <TextInput
            style={styles.formInput}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            placeholder={tr('Repó neve')}
            placeholderTextColor={C.dim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.formInput}
            value={desc}
            onChangeText={setDesc}
            placeholder={tr('Leírás (nem kötelező)')}
            placeholderTextColor={C.dim}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{tr('Privát repó')}</Text>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: C.grayHi, true: '#4ade80' }}
              thumbColor={C.text}
            />
          </View>

          {!!error && <Text style={styles.formError}>{tr(error)}</Text>}

          <Btn
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <Text style={styles.primaryBtnText}>{tr('Létrehozás')}</Text>
            )}
          </Btn>
          <Btn style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>{tr('Mégse')}</Text>
          </Btn>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const NAV_H = 46;
const NAV_ICON = 21;
const NAV_W = 50;
const NAV_PAD = (NAV_W - NAV_ICON) / 2;

const TABS = [
  { key: 'home', label: 'Főoldal', icon: 'home-outline', iconActive: 'home', lw: 56, lwEn: 43 },
  { key: 'repos', label: 'Repók', icon: 'folder-outline', iconActive: 'folder', lw: 46, lwEn: 46 },
  { key: 'inbox', label: 'Értesítések', icon: 'notifications-outline', iconActive: 'notifications', lw: 84, lwEn: 86 },
  { key: 'feed', label: 'Feed', icon: 'compass-outline', iconActive: 'compass', lw: 36, lwEn: 36 },
];
const lwOf = (t) => (CUR_LANG === 'en' ? t.lwEn : t.lw);

function NavItem({ tab, index, position, unread, onPress }) {
  const p = position.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const full = NAV_PAD + NAV_ICON + 8 + lwOf(tab) + 14;
  const width = p.interpolate({ inputRange: [0, 1], outputRange: [NAV_W, full] });
  const iconOff = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const labelOpacity = p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.navItem, { width }]}>
        <View style={styles.navIconBox}>
          <Animated.View style={[styles.navIconLayer, { opacity: iconOff }]}>
            <Ionicons name={tab.icon} size={NAV_ICON} color={C.muted} />
          </Animated.View>
          <Animated.View style={[styles.navIconLayer, { opacity: p }]}>
            <Ionicons name={tab.iconActive} size={NAV_ICON} color={NAV_GREEN} />
          </Animated.View>
          {tab.key === 'inbox' && unread > 0 && (
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{unread}</Text>
            </View>
          )}
        </View>
        <Animated.Text
          numberOfLines={1}
          ellipsizeMode="clip"
          style={[styles.navLabel, { width: lwOf(tab), opacity: labelOpacity, color: NAV_GREEN }]}
        >
          {tr(tab.label)}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const NAV_GAP = 4;
const NAV_PADDING = 6;
const navFull = () => TABS.map((t) => NAV_PAD + NAV_ICON + 8 + lwOf(t) + 14);
const NAV_LEFT = TABS.map((_, i) => NAV_PADDING + i * (NAV_W + NAV_GAP));

const NAV_STEP = 60;
const NAV_GROW = 4;
const NAV_GREEN = '#4ade80';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function CapsuleNav({ position, onSelect, unread, getPos, onScrubEnd }) {
  const h = useRef({});
  const start = useRef({ pos: 0, dx: 0 });
  const dragPos = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(0)).current;
  const animGrow = (to) =>
    Animated.timing(grow, { toValue: to, duration: 140, useNativeDriver: false }).start();
  const [dragging, setDragging] = useState(false);
  const settle = useRef(null);

  const target = (g) =>
    clamp(start.current.pos + (g.dx - start.current.dx) / NAV_STEP, 0, TABS.length - 1);

  const clearSettle = () => {
    if (settle.current) {
      clearInterval(settle.current);
      settle.current = null;
    }
  };
  useEffect(() => clearSettle, []);

  const finish = (g) => {
    const tab = Math.round(target(g));
    animGrow(0);
    Animated.timing(dragPos, { toValue: tab, duration: 160, useNativeDriver: false }).start();
    h.current.onScrubEnd(tab);
    const t0 = Date.now();
    clearSettle();
    settle.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const arrived = Math.abs(h.current.getPos() - tab) < 0.02;
      if (elapsed > 180 && (arrived || elapsed > 900)) {
        clearSettle();
        setDragging(false);
      }
    }, 30);
  };

  h.current = { getPos, onScrubEnd, finish };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => {
        clearSettle();
        dragPos.stopAnimation();
        const p = h.current.getPos();
        start.current = { pos: p, dx: g.dx };
        dragPos.setValue(p);
        setDragging(true);
        animGrow(1);
      },
      onPanResponderMove: (_, g) => dragPos.setValue(target(g)),
      onPanResponderRelease: (_, g) => h.current.finish(g),
      onPanResponderTerminate: (_, g) => h.current.finish(g),
    })
  ).current;

  const shown = dragging ? dragPos : position;

  return (
    <View style={styles.navWrap} pointerEvents="box-none">
      <View
        style={styles.capsule}
        {...pan.panHandlers}
        onTouchStart={() => animGrow(1)}
        onTouchEnd={() => animGrow(0)}
        onTouchCancel={() => animGrow(0)}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.navPill,
            {
              top: grow.interpolate({
                inputRange: [0, 1],
                outputRange: [NAV_PADDING, NAV_PADDING - NAV_GROW],
              }),
              height: grow.interpolate({
                inputRange: [0, 1],
                outputRange: [NAV_H, NAV_H + 2 * NAV_GROW],
              }),
              left: Animated.subtract(
                shown.interpolate({
                  inputRange: TABS.map((_, i) => i),
                  outputRange: NAV_LEFT,
                  extrapolate: 'clamp',
                }),
                grow.interpolate({ inputRange: [0, 1], outputRange: [0, NAV_GROW] })
              ),
              width: Animated.add(
                shown.interpolate({
                  inputRange: TABS.map((_, i) => i),
                  outputRange: navFull(),
                  extrapolate: 'clamp',
                }),
                grow.interpolate({ inputRange: [0, 1], outputRange: [0, 2 * NAV_GROW] })
              ),
            },
          ]}
        />
        {TABS.map((t, i) => (
          <NavItem
            key={t.key}
            tab={t}
            index={i}
            position={shown}
            unread={unread}
            onPress={() => onSelect(i)}
          />
        ))}
      </View>
    </View>
  );
}

function MainApp({ token, onLogout }) {
  const { width } = useWindowDimensions();
  useLang();
  const [repos, setRepos] = useState(token ? [] : REPOS);
  const [user, setUser] = useState(token ? null : MOCK_USER);
  const [notifs, setNotifs] = useState(token ? [] : INITIAL_NOTIFS);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [repoFilter, setRepoFilter] = useState('all');
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [listSheet, setListSheet] = useState(null);
  const [feedRange, setFeedRange] = useState('week');
  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [repoView, setRepoView] = useState(null);
  const openSheet = (sh) => (sh && sh.repo ? setRepoView(sh.repo) : setSelected(sh));

  const pagerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollXJS = useRef(new Animated.Value(0)).current;
  const position = useMemo(() => Animated.divide(scrollX, width), [scrollX, width]);
  const positionJS = useMemo(() => Animated.divide(scrollXJS, width), [scrollXJS, width]);
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (e) => scrollXJS.setValue(e.nativeEvent.contentOffset.x),
      }),
    [scrollX, scrollXJS]
  );

  const posRef = useRef(0);
  useEffect(() => {
    const id = scrollXJS.addListener(({ value }) => {
      posRef.current = value / width;
    });
    return () => scrollXJS.removeListener(id);
  }, [scrollXJS, width]);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const data = await loadAll(token);
      setUser(data.user);
      setRepos(data.repos);
      setNotifs(data.notifs);
      setLoadError('');
    } catch (e) {
      if (e instanceof AuthError) {
        onLogout();
      } else {
        setLoadError('Nem sikerült betölteni az adatokat. Húzd lefelé a frissítéshez.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = useCallback(() => {
    setNotifs((arr) => arr.map((n) => ({ ...n, unread: false })));
    if (token) markAllRead(token).catch(() => {});
  }, [token]);

  const starredSet = useMemo(
    () =>
      new Set(
        repos.filter((r) => r.scope.includes('starred')).map((r) => `${r.owner}/${r.name}`)
      ),
    [repos]
  );

  const topLang = useMemo(() => {
    const count = {};
    repos.forEach((r) => {
      if (r.scope.includes('mine') && r.lang && r.lang !== '–') {
        count[r.lang] = (count[r.lang] || 0) + 1;
      }
    });
    const best = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
    return best || null;
  }, [repos]);

  const toggleStar = useCallback(
    (item) => {
      const full = `${item.owner}/${item.name}`;
      const same = (r) => `${r.owner}/${r.name}` === full;
      const wasStarred = starredSet.has(full);

      setRepos((prev) => {
        if (wasStarred) {
          return prev.flatMap((r) => {
            if (!same(r)) return [r];
            const scope = r.scope.filter((x) => x !== 'starred');
            return scope.length ? [{ ...r, scope }] : [];
          });
        }
        if (prev.some(same)) {
          return prev.map((r) => (same(r) ? { ...r, scope: [...r.scope, 'starred'] } : r));
        }
        return [
          ...prev,
          {
            id: String(item.id),
            owner: item.owner,
            name: item.name,
            desc: item.desc,
            lang: item.lang,
            stars: item.stars,
            forks: item.forks,
            updated: item.updated || '',
            isPrivate: false,
            scope: ['starred'],
            url: item.url,
          },
        ];
      });

      if (token) {
        const call = wasStarred ? unstarRepo : starRepo;
        call(token, item.owner, item.name).catch(() => {
          setLoadError('Nem sikerült a csillagozás. Húzd lefelé a frissítéshez.');
          load();
        });
      }
    },
    [starredSet, token, load]
  );

  const createNewRepo = useCallback(
    async ({ name, description, isPrivate }) => {
      try {
        let repo;
        if (token) {
          repo = await createRepo(token, { name, description, isPrivate });
        } else {
          const login = user ? user.login : 'akosdevhu';
          repo = {
            id: `new-${Date.now()}`,
            owner: login,
            name,
            desc: description,
            lang: '–',
            stars: 0,
            forks: 0,
            updated: 'most',
            isPrivate,
            scope: ['mine'],
            url: `https://github.com/${login}/${name}`,
          };
        }
        setRepos((prev) => [repo, ...prev]);
        setRepoFilter('all');
        setNewRepoOpen(false);
        return { ok: true };
      } catch (e) {
        if (e instanceof AuthError) {
          onLogout();
          return { ok: false, error: 'Lejárt a bejelentkezés.' };
        }
        if (e instanceof ApiError && e.status === 422) {
          return { ok: false, error: 'Ilyen nevű repód már van, vagy érvénytelen a név.' };
        }
        return { ok: false, error: 'Nem sikerült létrehozni a repót.' };
      }
    },
    [token, user, onLogout]
  );

  const openNewRepo = useCallback(() => setNewRepoOpen(true), []);

  const openFeedOptions = useCallback(() => {
    setListSheet({
      title: 'Feed időszaka',
      loading: false,
      items: FEED_RANGES.map((r) => ({
        id: r.key,
        title: r.label,
        selected: r.key === feedRange,
        onPress: () => {
          setFeedRange(r.key);
          setListSheet(null);
        },
      })),
    });
  }, [feedRange]);

  const showList = useCallback(
    async (title, empty, loader) => {
      setListSheet({ title, empty, loading: true, items: [] });
      try {
        const items = await loader();
        setListSheet({ title, empty, loading: false, items });
      } catch (e) {
        if (e instanceof AuthError) {
          setListSheet(null);
          onLogout();
        } else {
          setListSheet({ title, empty: 'Nem sikerült betölteni.', loading: false, items: [] });
        }
      }
    },
    [onLogout]
  );

  const scrollToPos = (pos, animated) => {
    const node = pagerRef.current?.getNode?.() ?? pagerRef.current;
    node?.scrollTo({ x: pos * width, animated });
  };
  const goTo = (i) => scrollToPos(i, true);

  const unread = notifs.filter((n) => n.unread).length;
  const openProfile = useCallback(() => setProfileOpen(true), []);

  const openNotif = (n) => {
    setNotifs((arr) => arr.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    if (token && n.unread) markThreadRead(token, n.id).catch(() => {});
    setSelected(notifSheet(n));
  };

  const handleMenu = (key) => {
    setProfileOpen(false);
    setTimeout(() => {
      if (key === 'starred') {
        setRepoFilter('starred');
        goTo(1);
      } else if (key === 'orgs') {
        showList('Szervezetek', 'Nem vagy tagja egy szervezetnek sem.', () =>
          token ? fetchOrgs(token) : Promise.resolve(MOCK_ORGS)
        );
      } else if (key === 'gists') {
        showList('Gist-ek', 'Még nincs gist-ed.', () =>
          token ? fetchGists(token) : Promise.resolve(MOCK_GISTS)
        );
      } else if (key === 'settings') {
        setListSheet({ title: 'Beállítások', loading: false, items: SETTINGS_LINKS });
      }
    }, 350);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <Header
        position={position}
        scrollXJS={scrollXJS}
        width={width}
        onProfile={openProfile}
        onMarkAll={markAll}
        onAdd={openNewRepo}
        onFeedOptions={openFeedOptions}
        user={user}
      />
      {!!loadError && <Text style={styles.errorBanner}>{tr(loadError)}</Text>}

      <Animated.ScrollView
        ref={pagerRef}
        style={styles.flex}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View style={{ width }}>
          <HomeScreen
            repos={repos}
            notifs={notifs}
            onOpen={openSheet}
            onOpenNotif={openNotif}
            onSeeRepos={() => goTo(1)}
            onSeeNotifs={() => goTo(2)}
            refreshing={refreshing}
            onRefresh={token ? load : undefined}
          />
        </View>
        <View style={{ width }}>
          <ReposScreen
            repos={repos}
            filter={repoFilter}
            onFilter={setRepoFilter}
            onOpen={openSheet}
            refreshing={refreshing}
            onRefresh={token ? load : undefined}
          />
        </View>
        <View style={{ width }}>
          <NotificationsScreen
            notifs={notifs}
            onOpenNotif={openNotif}
            refreshing={refreshing}
            onRefresh={token ? load : undefined}
          />
        </View>
        <View style={{ width }}>
          <FeedScreen
            token={token}
            range={feedRange}
            topLang={topLang}
            starredSet={starredSet}
            onToggleStar={toggleStar}
            onOpen={openSheet}
          />
        </View>
      </Animated.ScrollView>

      <CapsuleNav
        position={positionJS}
        onSelect={goTo}
        unread={unread}
        getPos={() => posRef.current}
        onScrubEnd={goTo}
      />
      <ProfileModal
        user={user || MOCK_USER}
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={onLogout}
        onMenu={handleMenu}
      />
      <DetailSheet selected={selected} onClose={() => setSelected(null)} />
      {!!repoView && <RepoScreen repo={repoView} token={token} onClose={() => setRepoView(null)} />}
      <ListSheet data={listSheet} onClose={() => setListSheet(null)} />
      <NewRepoModal
        visible={newRepoOpen}
        onClose={() => setNewRepoOpen(false)}
        onCreate={createNewRepo}
      />
    </View>
  );
}

const DEV_LOGIN_ENABLED = true;
const DEV_PASSWORD = '1234';

const LOGIN_PAD_BOTTOM = 40;

function LoginScreen({ onLoggedIn }) {
  useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devOpen, setDevOpen] = useState(false);
  const [devPass, setDevPass] = useState('');
  const [devError, setDevError] = useState('');

  const [kbOpen, setKbOpen] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const bottomRef = useRef(null);
  const barBottom = useRef(null);
  const kbOpenRef = useRef(false);
  const baseH = useRef(Dimensions.get('window').height);
  const kbHRef = useRef(Math.round(Dimensions.get('window').height * 0.4));
  const logoLift = useRef(new Animated.Value(0)).current;
  const lay = useRef({ bottomY: 0, centerY: 0, logoY: 0, logoH: 0 });
  const moveTo = useCallback(
    (v, logoV = 0) => {
      const cfg = { duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true };
      Animated.parallel([
        Animated.timing(lift, { toValue: v, ...cfg }),
        Animated.timing(logoLift, { toValue: logoV, ...cfg }),
      ]).start();
    },
    [lift, logoLift]
  );
  const liftFor = (kbH, screenY) => {
    if (barBottom.current == null) return 0;
    const winH = Dimensions.get('window').height;
    const kbTop = Math.min(screenY == null ? Infinity : screenY, winH - kbH);
    const overlap = barBottom.current - kbTop;
    return overlap > 0 ? -(overlap + 2) : 0;
  };
  const logoFor = (liftVal) => {
    const L = lay.current;
    const logoTop = L.centerY + L.logoY;
    const logoBottom = logoTop + L.logoH;
    const blockTop = L.bottomY + liftVal;
    const overlap = logoBottom + 14 - blockTop;
    if (overlap <= 0) return 0;
    const maxUp = Math.max(0, logoTop - 70);
    return -Math.min(overlap, maxUp);
  };
  const goTo = (kbH, screenY) => {
    const l = liftFor(kbH, screenY);
    moveTo(l, logoFor(l));
  };
  const onWrapLayout = (e) => {
    if (kbOpenRef.current) return;
    const { y, height } = e.nativeEvent.layout;
    barBottom.current = y + height - LOGIN_PAD_BOTTOM;
  };
  const onInputFocus = () => {
    setDevError('');
    kbOpenRef.current = true;
    setKbOpen(true);
    if (Platform.OS !== 'ios') goTo(kbHRef.current);
  };
  const onInputBlur = () => {
    kbOpenRef.current = false;
    setKbOpen(false);
    if (Platform.OS !== 'ios') moveTo(0);
  };
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const a = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      kbOpenRef.current = true;
      setKbOpen(true);
      if (ios) return;
      const kbH = e.endCoordinates.height;
      kbHRef.current = kbH;
      const winH = Dimensions.get('window').height;
      if (baseH.current - winH > kbH * 0.5) moveTo(0);
      else goTo(kbH, e.endCoordinates.screenY);
    });
    const b = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      kbOpenRef.current = false;
      setKbOpen(false);
      moveTo(0);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, [moveTo]);
  useEffect(() => {
    Animated.timing(fade, { toValue: kbOpen ? 0 : 1, duration: 200, useNativeDriver: true }).start();
  }, [kbOpen, fade]);

  useEffect(() => {
    if (!devError) return undefined;
    const t = setTimeout(() => setDevError(''), 2500);
    return () => clearTimeout(t);
  }, [devError]);

  const login = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await signInWithBrowser();
      if (res.ok) {
        onLoggedIn(res.token);
        return;
      }
      if (res.reason !== 'cancel' && res.reason !== 'dismiss') {
        setError('Nem sikerült a bejelentkezés. Próbáld újra.');
      }
    } catch (e) {
      setError('Nem sikerült a bejelentkezés. Ellenőrizd az internetkapcsolatot.');
    } finally {
      setBusy(false);
    }
  };

  const devLogin = () => {
    if (devPass === DEV_PASSWORD) {
      setDevError('');
      onLoggedIn(null);
    } else {
      setDevError('Hibás jelszó.');
      setDevPass('');
    }
  };

  return (
    <KeyboardAvoidingView
      onLayout={onWrapLayout}
      style={styles.loginWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {DEV_LOGIN_ENABLED && devOpen && !!devError && (
        <View style={styles.topError} pointerEvents="none">
          <Text style={styles.topErrorText}>{tr(devError)}</Text>
        </View>
      )}
      <View
        style={styles.loginCenter}
        pointerEvents="none"
        onLayout={(e) => {
          lay.current.centerY = e.nativeEvent.layout.y;
        }}
      >
        <Animated.View
          style={[styles.loginLogo, { transform: [{ translateY: logoLift }] }]}
          onLayout={(e) => {
            lay.current.logoY = e.nativeEvent.layout.y;
            lay.current.logoH = e.nativeEvent.layout.height;
          }}
        >
          <Image source={OCTOGIT_LOGO} style={styles.loginLogoImg} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
          <Text style={styles.loginTitle}>{tr('Üdv!')}</Text>
          <Text style={styles.loginSub}>{tr('Lépj be a GitHub-fiókoddal.')}</Text>
        </Animated.View>
      </View>

      <Animated.View
        ref={bottomRef}
        collapsable={false}
        onLayout={(e) => {
          lay.current.bottomY = e.nativeEvent.layout.y;
        }}
        style={[styles.loginBottom, { transform: [{ translateY: lift }] }]}
      >
        <View style={{ gap: 12 }}>
          {!!error && <Text style={styles.loginError}>{tr(error)}</Text>}
          <Btn
            style={[styles.loginBtn, busy && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={login}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <>
                <Ionicons name="logo-github" size={20} color={C.text} />
                <Text style={styles.loginBtnText}>{tr('Bejelentkezés GitHubbal')}</Text>
              </>
            )}
          </Btn>
        </View>

        {DEV_LOGIN_ENABLED && !devOpen && (
          <Btn
            style={styles.devLink}
            activeOpacity={0.7}
            onPress={() => setDevOpen(true)}
          >
            <Text style={styles.devLinkText}>{tr('Belépés fejlesztőként')}</Text>
          </Btn>
        )}

        {DEV_LOGIN_ENABLED && devOpen && (
          <View style={styles.devBox}>
            <TextInput
              style={styles.devInput}
              value={devPass}
              onChangeText={(t) => {
                setDevPass(t);
                setDevError('');
              }}
              placeholder={tr('Fejlesztői jelszó')}
              placeholderTextColor={C.dim}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              onSubmitEditing={devLogin}
            />
            <Btn style={styles.devSubmit} activeOpacity={0.85} onPress={devLogin}>
              <Text style={styles.loginBtnText}>{tr('Belép')}</Text>
            </Btn>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

export default function App() {
  const [status, setStatus] = useState('loading');
  const [token, setToken] = useState(null);
  const [lang, setLang] = useState(deviceLang);
  CUR_LANG = lang;
  const langValue = useMemo(() => ({ lang }), [lang]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setLang(deviceLang());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    getStoredToken().then((t) => {
      if (!alive) return;
      setToken(t || null);
      setStatus(t ? 'in' : 'out');
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    setToken(null);
    setStatus('out');
  }, []);

  let screen;
  if (status === 'loading') {
    screen = (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.muted} />
      </View>
    );
  } else if (status === 'out') {
    screen = (
      <LoginScreen
        onLoggedIn={(t) => {
          setToken(t || null);
          setStatus('in');
        }}
      />
    );
  } else {
    screen = <MainApp token={token} onLogout={handleLogout} />;
  }
  return <LangContext.Provider value={langValue}>{screen}</LangContext.Provider>;
}

const styles = StyleSheet.create({
  loginWrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24, paddingBottom: LOGIN_PAD_BOTTOM },
  loginCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginLogo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLogoImg: { width: 66, height: 53 },
  loginTitle: { color: C.text, fontSize: 28, fontWeight: '800', marginTop: 24 },
  loginSub: {
    color: C.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  loginBottom: { gap: 12 },
  topError: {
    position: 'absolute',
    top: (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 54) + 12,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  topErrorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  loginError: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2ea043',
  },
  loginBtnText: { color: C.text, fontSize: 16, fontWeight: '700' },
  devLink: { alignItems: 'center', paddingVertical: 10 },
  devLinkText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  devBox: { flexDirection: 'row', gap: 10 },
  devInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: C.gray,
    color: C.text,
    fontSize: 15,
  },
  devSubmit: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: C.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
  },
  flex: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  listPad: { paddingHorizontal: 14 },
  empty: { color: C.muted, fontSize: 14, paddingVertical: 24, textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.text, fontSize: 18, fontWeight: '800' },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  headerTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
  headerTitleBox: { flex: 1, height: 30, justifyContent: 'center' },
  headerRightSlot: { width: 40, height: 40 },
  headerLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 14,
    marginHorizontal: 14,
    marginTop: 2,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 11 },
  chipRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: {
    height: 36,
    minWidth: 64,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: 18,
    backgroundColor: C.btn,
    borderWidth: 1,
    borderColor: C.btn,
  },
  chipOn: { backgroundColor: C.btnHi, borderColor: C.btnHi },
  chipText: { color: C.soft, fontSize: 13, fontWeight: '600', textAlign: 'center', includeFontPadding: false },
  chipTextOn: { color: C.text },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  cardOwner: { color: C.muted, fontSize: 12, flexShrink: 1 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 3 },
  cardDesc: { color: C.soft, fontSize: 13, marginTop: 4, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: C.muted, fontSize: 12 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.text,
    marginLeft: 6,
  },
  tinyPill: {
    backgroundColor: C.gray,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  tinyPillText: { color: C.soft, fontSize: 11, fontWeight: '600' },

  feedCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  ownerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  ownerAvatarText: { color: C.soft, fontSize: 12, fontWeight: '800' },
  feedOwner: { color: C.muted, fontSize: 13, flexShrink: 1 },
  feedName: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
  feedDesc: { color: C.soft, fontSize: 14, lineHeight: 20, marginTop: 4 },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  topic: {
    backgroundColor: C.gray,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicText: { color: C.soft, fontSize: 12 },
  feedBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  starBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.btn,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  starBtnOn: { backgroundColor: C.btnHi },
  starBtnText: { color: C.text, fontSize: 12, fontWeight: '700' },

  profileWrap: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
  },
  profileTop: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  profileHead: { alignItems: 'center', marginTop: 4, marginBottom: 22 },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarText: { color: C.text, fontSize: 40, fontWeight: '800' },
  bigAvatarImg: { width: 96, height: 96, borderRadius: 48 },
  errorBanner: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 6 },
  profileName: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 12 },
  profileLogin: { color: C.muted, fontSize: 14, marginTop: 2 },
  statBoxes: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statBox: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNum: { color: C.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.btn,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuLabel: { flex: 1, color: C.text, fontSize: 15, fontWeight: '600' },

  repoWrap: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
  },
  repoHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  repoOver: { color: C.muted, fontSize: 12 },
  repoTitle: { color: C.text, fontSize: 19, fontWeight: '800' },
  repoBody: { padding: 16, paddingBottom: 48 },
  repoInfo: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  repoVis: { color: C.soft, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  repoDesc: { color: C.soft, fontSize: 14, lineHeight: 20, marginTop: 10 },
  repoStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  repoStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  repoStatText: { color: C.text, fontSize: 13, fontWeight: '600' },
  repoNote: { color: C.muted, fontSize: 13, textAlign: 'center', paddingVertical: 14 },
  fileList: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 18,
    overflow: 'hidden',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: C.gray,
  },
  fileName: { flex: 1, color: C.text, fontSize: 14 },
  filesHead: { marginBottom: 8 },
  fileBox: { backgroundColor: C.card, borderRadius: 14, padding: 14 },
  fileText: { color: C.soft, fontSize: 12.5, lineHeight: 18, fontFamily: MONO },
  readmeBox: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  readmeHead: { color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  readmeTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  readmePreview: { overflow: 'hidden' },
  ghBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.gray, borderRadius: 18, overflow: 'hidden', marginTop: 16 },
  ghHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.gray,
  },
  ghHeadText: { flex: 1, color: C.text, fontSize: 15, fontWeight: '800' },
  readmeMore: { color: '#4da3ff', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.gray, alignItems: 'center', justifyContent: 'center' },
  repoAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 8, backgroundColor: C.gray },
  fileImgBox: { backgroundColor: C.card, borderRadius: 14, padding: 8, overflow: 'hidden' },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  seg: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.gray },
  segOn: { backgroundColor: C.btnHi },
  segText: { color: C.text, fontSize: 13, fontWeight: '700' },
  editLabel: { color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  commitInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.gray, borderRadius: 12,
    color: C.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  editInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.gray, borderRadius: 14,
    color: C.text, fontFamily: MONO, fontSize: 12.5, lineHeight: 18, padding: 12, minHeight: 320,
  },
  addMenu: {
    position: 'absolute',
    minWidth: 250,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: C.grayHi,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  addMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: C.gray,
  },
  addMenuSep: { borderTopWidth: 6, borderTopColor: '#0b0b0b' },
  addMenuText: { color: C.text, fontSize: 15, fontWeight: '600' },
  cmpPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  cmpPathPrefix: { color: C.muted, fontSize: 14, maxWidth: '55%' },
  cmpPathInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 11 },
  cmpHint: { color: C.muted, fontSize: 12.5, lineHeight: 17, marginBottom: 6 },
  cmpDrop: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.grayHi,
    backgroundColor: C.card,
    marginBottom: 12,
  },
  cmpDropText: { color: C.text, fontSize: 15, fontWeight: '700' },
  cmpDropHint: { color: C.muted, fontSize: 12.5, textAlign: 'center' },
  cmpFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: C.gray,
  },
  cmpCommit: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  cmpCommitTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  cmpBranch: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cmpBranchText: { color: C.soft, fontSize: 13, flex: 1 },
  cmpChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cmpLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  cmpLink: { paddingVertical: 4, paddingHorizontal: 4 },
  cmpLinkText: { color: '#4da3ff', fontSize: 13, fontWeight: '700' },
  cmpGreen: { backgroundColor: '#238636', borderRadius: 14, padding: 14, alignItems: 'center' },
  cmpGreenText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cmpGhost: { backgroundColor: C.gray, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 10 },
  cmpGhostText: { color: C.text, fontWeight: '700', fontSize: 15 },

  mdRoot: { width: '100%', overflow: 'hidden' },
  ghMd: { backgroundColor: '#101010', padding: 16 },
  mdMarker: { width: 32, alignItems: 'flex-end', paddingRight: 8 },
  mdAlert: { borderLeftWidth: 4, paddingVertical: 8, paddingLeft: 16, marginBottom: 16 },
  mdAlertTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  mdAlertTitleText: { fontSize: 16, fontWeight: '500' },
  mdH: { color: '#f0f6fc', fontWeight: '600' },
  mdHWrap: { marginTop: 24, marginBottom: 16 },
  mdHBorder: { borderBottomWidth: 1, borderColor: 'rgba(61,68,77,0.7)' },
  mdP: { color: '#f0f6fc', fontSize: 16, lineHeight: 24 },
  mdBlock: { marginBottom: 16 },
  mdCell: { fontSize: 16, lineHeight: 24 },
  mdQuoteText: { color: '#9198a1' },
  mdTrAlt: { backgroundColor: '#151b23' },
  mdBold: { fontWeight: '600' },
  mdItal: { fontStyle: 'italic' },
  mdStrike: { textDecorationLine: 'line-through' },
  mdInlineCode: { fontFamily: MONO, backgroundColor: '#656c7633', fontSize: 13.6 },
  mdLink: { color: '#4493f8' },
  mdBullet: { flexDirection: 'row', marginVertical: 2 },
  mdCode: { backgroundColor: '#151b23', borderRadius: 6, marginBottom: 16 },
  mdCodeText: { color: '#f0f6fc', fontFamily: MONO, fontSize: 13.6, lineHeight: 20 },
  mdQuote: { borderLeftWidth: 4, borderColor: '#3d444d', paddingLeft: 16, marginBottom: 16 },
  mdHr: { height: 4, backgroundColor: '#3d444d', marginVertical: 24 },
  mdTableWrap: { borderWidth: 1, borderColor: '#3d444d' },
  mdTr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#3d444d' },
  mdTrHead: { backgroundColor: '#101010' },
  mdTd: { paddingVertical: 6, paddingHorizontal: 13, borderRightWidth: 1, borderColor: '#3d444d' },
  mdImgRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginVertical: 2, width: '100%' },
  mdImgLoad: { width: 64, height: 40, alignItems: 'center', justifyContent: 'center' },
  mdImgFail: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: C.gray, borderRadius: 8, maxWidth: '100%',
  },
  mdImgFailText: { color: C.muted, fontSize: 12, flexShrink: 1 },
  mdBadge: { backgroundColor: C.gray, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, maxWidth: '100%' },
  mdBadgeText: { color: C.soft, fontSize: 11, fontWeight: '700' },
  mdDetails: { marginBottom: 16 },
  mdSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  mdSummaryText: { color: '#f0f6fc', fontSize: 16, flex: 1 },

  relBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.gray, borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  relHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 },
  relTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  relCount: { backgroundColor: C.gray, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1 },
  relCountText: { color: C.soft, fontSize: 12, fontWeight: '700' },
  relItem: { borderTopWidth: 1, borderColor: C.gray, padding: 14 },
  relName: { color: C.text, fontSize: 16, fontWeight: '800', flexShrink: 1, marginRight: 8 },
  relBadge: { borderWidth: 1, borderColor: C.muted, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, marginRight: 6 },
  relBadgeText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  relMeta: { color: C.muted, fontSize: 12.5, marginTop: 6 },
  relNotesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  relNotesText: { color: C.soft, fontSize: 13, fontWeight: '700' },
  relNotes: { marginTop: 8, padding: 12, backgroundColor: C.bg, borderRadius: 12 },
  relFiles: { color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  relAssets: { borderWidth: 1, borderColor: C.gray, borderRadius: 12, overflow: 'hidden' },
  relAsset: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: C.gray },
  relAssetName: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
  relAssetSize: { color: C.muted, fontSize: 11.5, maxWidth: 130 },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  relRowTop: { borderTopWidth: 1, borderColor: C.gray },
  relMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  relDl: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 10 },
  relDlText: { color: C.muted, fontSize: 12.5, fontWeight: '600' },
  relOpenBody: { borderTopWidth: 1, borderColor: C.gray },
  trNote: { color: C.dim, fontSize: 12, marginBottom: 8 },
  relNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  relOthers: { color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  relMore: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderColor: C.gray },
  relMoreText: { color: '#4da3ff', fontSize: 13, fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: C.gray,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.grayHi,
    marginBottom: 16,
  },
  sheetOverline: { color: C.muted, fontSize: 14, flex: 1, marginLeft: 8 },
  sheetTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginTop: 14 },
  sheetBody: { color: C.soft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  sheetMeta: { color: C.muted, fontSize: 13, marginTop: 10 },
  primaryBtn: {
    backgroundColor: C.btn,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: { color: C.text, fontWeight: '700', fontSize: 15 },
  sheetList: { maxHeight: 340, marginTop: 8 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.gray,
  },
  listRowTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  listRowSub: { color: C.muted, fontSize: 12.5, marginTop: 2 },
  formInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchLabel: { color: C.text, fontSize: 15 },
  formError: { color: '#ff6b6b', fontSize: 13, marginTop: 10 },
  secondaryBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  secondaryBtnText: { color: C.muted, fontSize: 14 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: C.btn,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  linkBtnText: { color: C.text, fontSize: 12, fontWeight: '700' },

  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 30 : 22,
    alignItems: 'center',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.gray,
    borderRadius: 40,
    padding: 6,
    gap: 4,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  navPill: {
    position: 'absolute',
    top: NAV_PADDING,
    height: NAV_H,
    borderRadius: NAV_H,
    backgroundColor: 'rgb(87,87,87)',
  },
  navItem: {
    height: NAV_H,
    borderRadius: NAV_H / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: NAV_PAD,
  },
  navIconBox: { width: NAV_ICON, height: NAV_ICON },
  navIconLayer: { position: 'absolute', left: 0, top: 0 },
  navLabel: { color: C.text, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  navBadge: {
    position: 'absolute',
    top: -6,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navBadgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
});