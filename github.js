// github.js – GitHub API hívások és az adatok átalakítása az app formátumára.
// A tokent az auth.js adja (getStoredToken / signInWithBrowser).

const API = 'https://api.github.com';

// Akkor dobjuk, ha a token érvénytelen vagy visszavonták → újra be kell lépni
export class AuthError extends Error {}

// Egyéb API-hiba, a státuszkóddal (pl. 422 = érvénytelen adat)
export class ApiError extends Error {
  constructor(status) {
    super(`GitHub ${status}`);
    this.status = status;
  }
}

async function gh(token, path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new AuthError('unauthorized');
  if (!res.ok) throw new ApiError(res.status);
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------- Segédek ----------

export function timeAgo(iso) {
  if (!iso) return '';
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'most';
  if (min < 60) return `${min} perce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} órája`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'tegnap';
  if (d < 7) return `${d} napja`;
  if (d < 30) return `${Math.floor(d / 7)} hete`;
  if (d < 365) return `${Math.floor(d / 30)} hónapja`;
  return `${Math.floor(d / 365)} éve`;
}

const REASONS = {
  assign: ['assign', 'hozzád rendelték'],
  author: ['comment', 'a te témád'],
  comment: ['comment', 'hozzászólás'],
  mention: ['mention', 'megemlítés'],
  team_mention: ['mention', 'csapat említés'],
  review_requested: ['review', 'review kérés'],
  subscribed: ['watch', 'követett'],
  state_change: ['watch', 'állapotváltozás'],
  ci_activity: ['watch', 'CI'],
  manual: ['watch', 'követett'],
  invitation: ['assign', 'meghívás'],
  security_alert: ['watch', 'biztonsági figyelmeztetés'],
};

function mapRepo(r, scope) {
  return {
    id: String(r.id),
    owner: r.owner.login,
    name: r.name,
    desc: r.description || '',
    lang: r.language || '–',
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    updated: timeAgo(r.pushed_at || r.updated_at),
    isPrivate: !!r.private,
    scope,
    url: r.html_url,
  };
}

// Az értesítés API-s címéből weboldal-címet csinál
function notifUrl(n) {
  const repoUrl = n.repository.html_url;
  const api = n.subject && n.subject.url;
  if (!api) return repoUrl;
  if (n.subject.type === 'Release') return `${repoUrl}/releases`;
  return api
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/');
}

function mapNotif(n) {
  const [reason, meta] = REASONS[n.reason] || ['watch', n.reason];
  return {
    id: n.id,
    repo: n.repository.full_name,
    title: n.subject.title,
    reason,
    meta,
    time: timeAgo(n.updated_at),
    unread: !!n.unread,
    url: notifUrl(n),
  };
}

function mapUser(u) {
  return {
    name: u.name || u.login,
    login: u.login,
    avatar: u.avatar_url,
    repos: (u.public_repos || 0) + (u.total_private_repos || 0),
    followers: u.followers || 0,
    following: u.following || 0,
  };
}

// ---------- Lekérések ----------

// Egyszerre tölti le a profilt, a repókat (saját + csillagozott) és az értesítéseket
export async function loadAll(token) {
  const [user, mine, starred, notifs] = await Promise.all([
    gh(token, '/user'),
    gh(token, '/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member'),
    gh(token, '/user/starred?per_page=100'),
    gh(token, '/notifications?all=true&per_page=50'),
  ]);

  const byId = new Map();
  (mine || []).forEach((r) => byId.set(r.id, mapRepo(r, ['mine'])));
  (starred || []).forEach((r) => {
    const ex = byId.get(r.id);
    if (ex) ex.scope = ['mine', 'starred'];
    else byId.set(r.id, mapRepo(r, ['starred']));
  });

  return {
    user: mapUser(user),
    repos: Array.from(byId.values()),
    notifs: (notifs || []).map(mapNotif),
  };
}

export async function markThreadRead(token, id) {
  await gh(token, `/notifications/threads/${id}`, { method: 'PATCH' });
}

export async function markAllRead(token) {
  await gh(token, '/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_read_at: new Date().toISOString() }),
  });
}

// ---------- Új repó, csillagozás ----------

export async function createRepo(token, { name, description, isPrivate }) {
  const r = await gh(token, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, private: !!isPrivate }),
  });
  return mapRepo(r, ['mine']);
}

export async function starRepo(token, owner, name) {
  await gh(token, `/user/starred/${owner}/${name}`, {
    method: 'PUT',
    headers: { 'Content-Length': '0' },
  });
}

export async function unstarRepo(token, owner, name) {
  await gh(token, `/user/starred/${owner}/${name}`, { method: 'DELETE' });
}

// ---------- Szervezetek, gist-ek (listalapok) ----------

export async function fetchOrgs(token) {
  const orgs = await gh(token, '/user/orgs?per_page=100');
  return (orgs || []).map((o) => ({
    id: String(o.id),
    title: o.login,
    sub: o.description || '',
    url: `https://github.com/${o.login}`,
  }));
}

export async function fetchGists(token) {
  const gists = await gh(token, '/gists?per_page=50');
  return (gists || []).map((x) => {
    const files = Object.keys(x.files || {});
    const n = files.length;
    return {
      id: x.id,
      title: x.description || files[0] || '(névtelen gist)',
      sub: `${x.public ? 'publikus' : 'titkos'}  ·  ${n} fájl  ·  ${timeAgo(x.updated_at)}`,
      url: x.html_url,
    };
  });
}

// ---------- Feed (a GitHub keresésével) ----------
// A GitHubnak nincs hivatalos "trending" API-ja, ezért a keresést használjuk:
// az időszakon belül frissített / létrehozott, sok csillagot kapott repók.

const DAY = 86400000;
const isoDate = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);

export const FEED_RANGES = [
  { key: 'day', label: 'Ma', days: 1 },
  { key: 'week', label: 'Ez a hét', days: 7 },
  { key: 'month', label: 'Ez a hónap', days: 30 },
];

const langQ = (l) => (/^[A-Za-z0-9]+$/.test(l) ? l : `"${l}"`);

export async function fetchFeed(token, filter, rangeKey, topLang) {
  const days = (FEED_RANGES.find((r) => r.key === rangeKey) || FEED_RANGES[1]).days;
  const since = isoDate(days);

  let q;
  if (filter === 'felkapott') q = `created:>${since} stars:>5`;
  else if (filter === 'új') q = `created:>${isoDate(3)} stars:>3`;
  else if (filter === 'Mobil') q = `topic:mobile pushed:>${since} stars:>50`;
  else if (['JavaScript', 'Python', 'Rust'].includes(filter)) {
    q = `language:${filter} pushed:>${since} stars:>100`;
  } else {
    // "Neked": a leggyakoribb nyelved szerint, ha van
    q = `pushed:>${since} stars:>500${topLang ? ` language:${langQ(topLang)}` : ''}`;
  }

  const data = await gh(
    token,
    `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`
  );
  return ((data && data.items) || []).map((r) => ({
    id: String(r.id),
    owner: r.owner.login,
    name: r.name,
    desc: r.description || '',
    lang: r.language || '–',
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    trend: new Date(r.created_at).getTime() > Date.now() - days * DAY ? 'új' : timeAgo(r.pushed_at),
    topics: (r.topics || []).slice(0, 3),
    tags: [],
    url: r.html_url,
    updated: timeAgo(r.pushed_at || r.updated_at),
    isPrivate: false,
  }));
}