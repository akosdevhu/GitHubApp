// auth.js – GitHub bejelentkezés böngészőn keresztül (a felhasználónak nem kell tokent kezelnie)
//
// Telepítés:
//   npx expo install expo-auth-session expo-web-browser expo-secure-store expo-crypto
//
// app.json -> "expo": { "scheme": "octogit" }
//
// Két mód van, mindkettő ugyanazt adja: a böngészőben lép be a user, az app pedig
// a háttérben megkapja és biztonságosan eltárolja a tokent.
//   1) signInWithBrowser()    – legfolyékonyabb (kell hozzá egy pici backend, lásd worker.js)
//   2) signInWithDeviceFlow() – nem kell backend, de a user begépel egy kódot a böngészőben

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

// ---------- Beállítások ----------
// GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App
// A client ID nem titok, nyugodtan lehet az appban.
const CLIENT_ID = 'Ov23ctnytQVkyv5t1D62';
const SCOPES = ['repo', 'read:user', 'read:org', 'notifications'];

// A backend címe (worker.js), csak az 1) módhoz kell
const EXCHANGE_URL = 'https://octogit.gameproa42.workers.dev/exchange';

// Az app sémája: egyeznie kell az app.json "scheme" értékével
// és a GitHub OAuth App "Authorization callback URL"-jével: octogit://auth
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'octogit', path: 'auth' });

const TOKEN_KEY = 'github_access_token';

// ---------- Token tárolás (titkosított, a telefon kulcstartójában) ----------

export async function getStoredToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function signOut() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ---------- 1) Böngészős belépés (kód + PKCE, a secretet a backend tartja) ----------

export async function signInWithBrowser() {
  const request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
    usePKCE: true,
  });

  // Megnyitja a böngészőt (iOS: ASWebAuthenticationSession, Android: Custom Tab).
  // Ha a user már be van lépve a GitHubra, egyetlen "Authorize" gombot kell megnyomnia.
  const result = await request.promptAsync({
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  });

  if (result.type !== 'success') {
    return { ok: false, reason: result.type }; // 'cancel' / 'dismiss' / 'error'
  }

  const res = await fetch(EXCHANGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: result.params.code,
      redirectUri: REDIRECT_URI,
      codeVerifier: request.codeVerifier,
    }),
  });
  const data = await res.json();

  if (!data.access_token) {
    return { ok: false, reason: data.error || 'no_token' };
  }
  await saveToken(data.access_token);
  return { ok: true, token: data.access_token };
}

// ---------- 2) Device Flow (nincs backend) ----------
// onCode({ userCode, verificationUri }) – itt mutasd meg a usernek a kódot.

export async function signInWithDeviceFlow(onCode) {
  const start = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPES.join(' ') }),
  }).then((r) => r.json());

  if (!start.device_code) return { ok: false, reason: start.error || 'start_failed' };

  if (onCode) onCode({ userCode: start.user_code, verificationUri: start.verification_uri });
  WebBrowser.openBrowserAsync(start.verification_uri);

  let interval = (start.interval || 5) * 1000;
  const deadline = Date.now() + start.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const poll = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: start.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    }).then((r) => r.json());

    if (poll.access_token) {
      await saveToken(poll.access_token);
      return { ok: true, token: poll.access_token };
    }
    if (poll.error === 'authorization_pending') continue;
    if (poll.error === 'slow_down') {
      interval += 5000;
      continue;
    }
    return { ok: false, reason: poll.error || 'failed' }; // expired_token, access_denied...
  }
  return { ok: false, reason: 'timeout' };
}