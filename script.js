// script.js — Nea IPTV Pro v4 (Fixed)
// - Khmer pinned, Sports merged, full country categories (200+)
// - Dead-stream manager with undo, lazy rendering, favorites
// - Shareable channel links (?channel=Bayon_TV)
// - Sticky mini-player on mobile (body.mini toggled on scroll)
// - Country strip + bottom-sheet picker with search
// - Keyboard shortcuts, expand/collapse all, toast-with-action
// - FIX: Additive country routing (channels appear in original group AND country group)
// - FIX: Loose country detection (US| News, FR - Movies, etc.)
// - FIX: Unique channel count in stats
// - FIX: Higher SEARCH_LIMIT + "Load more" button
// - FIX: Horizontal wheel scroll on strips

const m3uUrl = 'https://iptv-org.github.io/iptv/index.m3u';
const khmerUrl = 'https://iptv-org.github.io/iptv/languages/khm.m3u';

const $ = id => document.getElementById(id);
const channelsContainer = $('channels-container');
const searchBox = $('search-box');
const searchClear = $('search-clear');
const video = $('video-player');
const nowPlayingName = $('now-playing-name');
const statusEl = $('status');
const totalChannelsEl = $('total-channels');
const totalCountriesEl = $('total-countries');
const totalDeadEl = $('total-dead');
const videoMsg = $('video-msg');
const toastEl = $('toast');
const dotEl = $('header-status-dot');
const dotText = $('header-status-text');
const chipsEl = $('chips');
const countryStrip = $('country-strip');
const nowGroup = $('now-group');
const shareUrlEl = $('share-url');
const favBtn = $('btn-fav');
const resultCountEl = $('result-count');
const playerArea = $('player-area');
const sheetBackdrop = $('sheet-backdrop');
const countrySheet = $('country-sheet');
const countryList = $('country-list');
const countrySearch = $('country-search');

const LOAD_TIMEOUT = 15000;
const DEAD_TTL = 24 * 3600 * 1000;
const SEARCH_LIMIT = 500;           // ← raised from 150
const MAX_AUTO_SKIP = 5;
const FAV_KEY = '★ Favorites';
const SPORTS_KEY = 'Sports';
const KHMER_KEY = 'Khmer TV';
const COUNTRY_PREFIX = '🌍 ';

let allChannels = [];
let activeChannel = null;
let activeUrl = null;
let playList = [];
let currentHls = null;
let loadTimer = null;
let playToken = 0;
let autoSkips = 0;
let query = '';
let activeCat = 'all';
let activeCountry = null;
let countrySearchQuery = '';
const openCats = new Set();

// ============================================================
// COUNTRY DATA
// ============================================================
const COUNTRY_NAMES = {
  AD:'Andorra',AE:'United Arab Emirates',AF:'Afghanistan',AG:'Antigua and Barbuda',
  AL:'Albania',AM:'Armenia',AO:'Angola',AR:'Argentina',AT:'Austria',AU:'Australia',
  AZ:'Azerbaijan',BA:'Bosnia and Herzegovina',BB:'Barbados',BD:'Bangladesh',
  BE:'Belgium',BF:'Burkina Faso',BG:'Bulgaria',BH:'Bahrain',BI:'Burundi',BJ:'Benin',
  BN:'Brunei',BO:'Bolivia',BR:'Brazil',BS:'Bahamas',BT:'Bhutan',BW:'Botswana',
  BY:'Belarus',BZ:'Belize',CA:'Canada',CD:'DR Congo',CF:'Central African Republic',
  CG:'Congo',CH:'Switzerland',CI:'Ivory Coast',CL:'Chile',CM:'Cameroon',CN:'China',
  CO:'Colombia',CR:'Costa Rica',CU:'Cuba',CV:'Cape Verde',CY:'Cyprus',CZ:'Czechia',
  DE:'Germany',DJ:'Djibouti',DK:'Denmark',DM:'Dominica',DO:'Dominican Republic',
  DZ:'Algeria',EC:'Ecuador',EE:'Estonia',EG:'Egypt',ER:'Eritrea',ES:'Spain',
  ET:'Ethiopia',FI:'Finland',FJ:'Fiji',FM:'Micronesia',FR:'France',GA:'Gabon',
  GB:'United Kingdom',GD:'Grenada',GE:'Georgia',GH:'Ghana',GM:'Gambia',GN:'Guinea',
  GQ:'Equatorial Guinea',GR:'Greece',GT:'Guatemala',GW:'Guinea-Bissau',GY:'Guyana',
  HK:'Hong Kong',HN:'Honduras',HR:'Croatia',HT:'Haiti',HU:'Hungary',ID:'Indonesia',
  IE:'Ireland',IL:'Israel',IN:'India',IQ:'Iraq',IR:'Iran',IS:'Iceland',IT:'Italy',
  JM:'Jamaica',JO:'Jordan',JP:'Japan',KE:'Kenya',KG:'Kyrgyzstan',KH:'Cambodia',
  KI:'Kiribati',KM:'Comoros',KN:'Saint Kitts and Nevis',KP:'North Korea',
  KR:'South Korea',KW:'Kuwait',KY:'Cayman Islands',KZ:'Kazakhstan',LA:'Laos',
  LB:'Lebanon',LC:'Saint Lucia',LI:'Liechtenstein',LK:'Sri Lanka',LR:'Liberia',
  LS:'Lesotho',LT:'Lithuania',LU:'Luxembourg',LV:'Latvia',LY:'Libya',MA:'Morocco',
  MC:'Monaco',MD:'Moldova',ME:'Montenegro',MG:'Madagascar',MH:'Marshall Islands',
  MK:'North Macedonia',ML:'Mali',MM:'Myanmar',MN:'Mongolia',MO:'Macau',MR:'Mauritania',
  MT:'Malta',MU:'Mauritius',MV:'Maldives',MW:'Malawi',MX:'Mexico',MY:'Malaysia',
  MZ:'Mozambique',NA:'Namibia',NE:'Niger',NG:'Nigeria',NI:'Nicaragua',NL:'Netherlands',
  NO:'Norway',NP:'Nepal',NR:'Nauru',NZ:'New Zealand',OM:'Oman',PA:'Panama',PE:'Peru',
  PG:'Papua New Guinea',PH:'Philippines',PK:'Pakistan',PL:'Poland',PS:'Palestine',
  PT:'Portugal',PW:'Palau',PY:'Paraguay',QA:'Qatar',RO:'Romania',RS:'Serbia',
  RU:'Russia',RW:'Rwanda',SA:'Saudi Arabia',SB:'Solomon Islands',SC:'Seychelles',
  SD:'Sudan',SE:'Sweden',SG:'Singapore',SI:'Slovenia',SK:'Slovakia',SL:'Sierra Leone',
  SM:'San Marino',SN:'Senegal',SO:'Somalia',SR:'Suriname',SS:'South Sudan',
  ST:'São Tomé and Príncipe',SV:'El Salvador',SY:'Syria',SZ:'Eswatini',TD:'Chad',
  TG:'Togo',TH:'Thailand',TJ:'Tajikistan',TL:'Timor-Leste',TM:'Turkmenistan',
  TN:'Tunisia',TO:'Tonga',TR:'Turkey',TT:'Trinidad and Tobago',TV:'Tuvalu',
  TW:'Taiwan',TZ:'Tanzania',UA:'Ukraine',UG:'Uganda',US:'United States',
  UY:'Uruguay',UZ:'Uzbekistan',VA:'Vatican City',VC:'Saint Vincent',VE:'Venezuela',
  VN:'Vietnam',VU:'Vanuatu',WS:'Samoa',YE:'Yemen',ZA:'South Africa',ZM:'Zambia',
  ZW:'Zimbabwe',XK:'Kosovo'
};

const REGIONS = {
  'Asia Pacific':['AF','AS','AU','BD','BN','BT','CN','FJ','FM','GU','HK','ID','IN','JP','KH','KI','KP','KR','LA','LK','MM','MN','MO','MV','MY','NP','NR','NZ','PG','PH','PK','PW','SB','SG','TH','TL','TM','TO','TV','TW','VN','VU','WS'],
  'Europe':['AD','AL','AT','BA','BE','BG','BY','CH','CY','CZ','DE','DK','EE','ES','FI','FO','FR','GB','GG','GI','GR','HR','HU','IE','IM','IS','IT','JE','LI','LT','LU','LV','MC','MD','ME','MK','MT','NL','NO','PL','PT','RO','RS','RU','SE','SI','SK','SM','UA','VA','XK'],
  'Americas':['AG','AR','BB','BO','BR','BS','BZ','CA','CL','CO','CR','CU','DM','DO','EC','GD','GT','GY','HN','HT','JM','KN','KY','LC','MX','NI','PA','PE','PR','PY','SR','SV','TT','US','UY','VC','VE'],
  'Middle East':['AE','BH','IL','IQ','IR','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE'],
  'Africa':['AO','BF','BI','BJ','BW','CD','CF','CG','CI','CM','CV','DJ','DZ','EG','ER','ET','GA','GH','GM','GN','GQ','GW','KE','KM','LR','LS','LY','MA','MG','ML','MR','MU','MW','MZ','NA','NE','NG','RW','SC','SD','SL','SN','SO','SS','ST','SZ','TD','TG','TN','TZ','UG','ZA','ZM','ZW']
};

const REGION_ORDER = ['Asia Pacific','Europe','Americas','Middle East','Africa','Other'];

// Build a reverse lookup: lowercase country name → code
const COUNTRY_NAME_TO_CODE = {};
Object.entries(COUNTRY_NAMES).forEach(([code, name]) => {
  COUNTRY_NAME_TO_CODE[name.toLowerCase()] = code;
});

function flagOf(code) {
  if (!code || code.length !== 2) return '🌐';
  const A = 0x1F1E6;
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65)
  );
}

function regionOf(code) {
  for (const [region, list] of Object.entries(REGIONS)) {
    if (list.includes(code)) return region;
  }
  return 'Other';
}

function countryNameOf(code) {
  return COUNTRY_NAMES[code] || code;
}

// ============================================================
// No-zoom guards
// ============================================================
['gesturestart', 'gesturechange', 'gestureend'].forEach(e =>
  document.addEventListener(e, ev => ev.preventDefault()));
document.addEventListener('touchmove', ev => {
  if (ev.touches.length > 1) ev.preventDefault();
}, { passive: false });
let lastTap = 0;
document.addEventListener('touchend', ev => {
  const now = Date.now();
  if (now - lastTap < 300 && !ev.target.closest('video')) ev.preventDefault();
  lastTap = now;
}, { passive: false });

// ============================================================
// Status + toast
// ============================================================
function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = cls || '';
  dotEl.className = 'status-dot ' + (cls === 'ready' ? 'online' : cls === 'error' ? 'offline' : cls === 'loading' ? 'loading' : '');
  dotText.textContent = text;
}

let toastTimer;
function toast(msg, action) {
  toastEl.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = msg;
  toastEl.appendChild(span);
  if (action) {
    const btn = document.createElement('button');
    btn.id = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { action.fn(); toastEl.classList.remove('show'); });
    toastEl.appendChild(btn);
  }
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), action ? 5000 : 2800);
}

// ============================================================
// Dead-stream storage
// ============================================================
function loadDead() {
  try {
    const raw = JSON.parse(localStorage.getItem('nea_dead') || '{}');
    const now = Date.now();
    Object.keys(raw).forEach(u => { if (now - raw[u] > DEAD_TTL) delete raw[u]; });
    return raw;
  } catch (e) { return {}; }
}
let dead = loadDead();
function saveDead() {
  try { localStorage.setItem('nea_dead', JSON.stringify(dead)); } catch (e) {}
  totalDeadEl.textContent = Object.keys(dead).length;
}

// ============================================================
// Favorites
// ============================================================
function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem('nea_favs') || '[]')); } catch (e) { return new Set(); }
}
let favs = loadFavs();
function saveFavs() {
  try { localStorage.setItem('nea_favs', JSON.stringify([...favs])); } catch (e) {}
}
function updateFavBtn() {
  const on = !!activeUrl && favs.has(activeUrl);
  favBtn.textContent = on ? '★' : '☆';
  favBtn.classList.toggle('on', on);
  favBtn.title = on ? 'Remove from favorites' : 'Add to favorites';
}

// ============================================================
// Shareable links
// ============================================================
const slugOf = name => name.trim().replace(/\s+/g, '_');
const normKey = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

function shareLink(ch) {
  const u = new URL(location.href);
  u.hash = '';
  u.search = '';
  u.searchParams.set('channel', slugOf(ch.name));
  return u.toString();
}
function syncUrl(ch) {
  const link = shareLink(ch);
  try { history.replaceState(null, '', link); } catch (e) {}
  shareUrlEl.value = link;
  document.title = ch.name + ' — Nea IPTV';
}
function findBySlug(value) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const exact = allChannels.find(c =>
    slugOf(c.name).toLowerCase() === v ||
    c.name.toLowerCase() === v.replace(/_/g, ' ')
  );
  if (exact) return exact;
  const key = normKey(value);
  return key ? allChannels.find(c => normKey(c.name) === key) : null;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    try {
      shareUrlEl.focus(); shareUrlEl.select();
      const ok = document.execCommand('copy');
      shareUrlEl.blur();
      return ok;
    } catch (e2) { return false; }
  }
}

// ============================================================
// Logo fallback
// ============================================================
function getLogoUrl(channel) {
  if (channel.logo && channel.logo.startsWith('http')) return channel.logo;
  const name = channel.name.toLowerCase();
  const logoMap = {
    'bbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/BBC_Logo_2021.svg/1200px-BBC_Logo_2021.svg.png',
    'itv': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/ITV_Logo_2019.svg/1200px-ITV_Logo_2019.svg.png',
    'cnn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN_logo_2024.svg/1200px-CNN_logo_2024.svg.png',
    'sky news': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Sky_News_2021_logo.svg/1200px-Sky_News_2021_logo.svg.png',
    'fox': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Fox_News_Channel_logo.svg/1200px-Fox_News_Channel_logo.svg.png',
    'al jazeera': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Al_Jazeera_Logo_2023.svg/1200px-Al_Jazeera_Logo_2023.svg.png',
  };
  for (const [key, url] of Object.entries(logoMap)) if (name.includes(key)) return url;
  return null;
}

// ============================================================
// M3U parsing
// ============================================================
function parseM3U(data, defaultGroup = 'Uncategorized') {
  const lines = data.split('\n');
  const out = [];
  let name = '', group = defaultGroup, logo = '', tvgId = '';
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#EXTINF:')) {
      const nm = t.match(/,([^,]+)$/);
      name = nm ? nm[1].trim() : 'Unknown';
      const gm = t.match(/group-title="([^"]*)"/);
      group = gm ? gm[1].trim() : defaultGroup;
      const lm = t.match(/tvg-logo="([^"]*)"/);
      logo = lm ? lm[1].trim() : '';
      const tm = t.match(/tvg-id="([^"]*)"/);
      tvgId = tm ? tm[1].trim() : '';
    } else if (t && !t.startsWith('#') && name) {
      out.push({ name, url: t, group: group || defaultGroup, logo, tvgId });
      name = ''; group = defaultGroup; logo = ''; tvgId = '';
    }
  }
  return out;
}

// ============================================================
// Country detection — LOOSE (fixed)
// ============================================================
function detectCountry(ch) {
  // 1. tvg-id suffix — highest confidence ("BBC.uk", "CNN.us@SD")
  if (ch.tvgId) {
    const m = ch.tvgId.match(/\.([a-z]{2})(?:@|$)/i);
    if (m) {
      const code = m[1].toUpperCase();
      if (COUNTRY_NAMES[code]) return code;
    }
  }

  const g = (ch.group || '').trim();

  // 2. Group prefix pattern: "US| News", "UK: Sports", "FR - Movies"
  if (g) {
    const prefixMatch = g.match(/^([A-Za-z]{2})\s*[|:\-–]\s+/);
    if (prefixMatch) {
      const code = prefixMatch[1].toUpperCase();
      if (COUNTRY_NAMES[code]) return code;
    }

    // 3. Exact group-name match (e.g. "Cambodia", "France")
    const gl = g.toLowerCase();
    if (COUNTRY_NAME_TO_CODE[gl]) return COUNTRY_NAME_TO_CODE[gl];
  }

  // 4. Channel-name prefix: "US: CNN", "UK | BBC One"
  const nm = (ch.name || '').trim();
  const namePrefix = nm.match(/^([A-Z]{2})\s*[|:]/);
  if (namePrefix) {
    const code = namePrefix[1];
    if (COUNTRY_NAMES[code]) return code;
  }

  return null;
}

// ============================================================
// Grouping / sorting
// ============================================================
function groupByCategory(channels) {
  const groups = {};
  const seen = new Set();
  channels.forEach(ch => {
    if (dead[ch.url] || seen.has(ch.url)) return;
    seen.add(ch.url);
    const g = ch.group || 'Uncategorized';
    (groups[g] = groups[g] || []).push(ch);
  });
  Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.name.localeCompare(b.name)));
  return groups;
}

/**
 * Build the final ordered view.
 *
 * FIXED (v4): Country routing is now ADDITIVE.
 *   A channel appears in BOTH its original group AND its country group.
 *   This guarantees no channels are ever "lost" — the original group
 *   stays intact, and the country group is a convenience copy.
 *
 * Precedence in the sidebar:
 *   FAV_KEY (inserted later by getView)
 *   Khmer TV  (pinned, channels exclusive to this group)
 *   Sports    (merged across all countries, exclusive)
 *   🌍 Country categories  (additive — copy of channel)
 *   Original groups  (alphabetical)
 *
 * Deduplication rules:
 *   - Khmer / Sports channels are removed from country buckets
 *     (so they don't double-appear inside "Cambodia" or "Sports")
 *   - All other channels appear in both their original group
 *     and their country group
 */
function buildSortedGroups(groups) {
  let khmer = [], sports = [];
  const otherGroups = {};
  const countryBuckets = {};

  Object.entries(groups).forEach(([category, channels]) => {
    const lc = category.toLowerCase();
    const isKhmerGroup = lc.includes('khmer') || lc.includes('cambodia') || lc.includes('កម្ពុជា');
    const isSportsGroup = lc.includes('sport') || lc.includes('football') || lc.includes('futebol') || lc.includes('fútbol');

    if (isKhmerGroup) {
      khmer = khmer.concat(channels);
      return;
    }
    if (isSportsGroup) {
      sports = sports.concat(channels);
      return;
    }

    // ✅ ADDITIVE: keep the original group intact
    otherGroups[category] = channels.slice();

    // ✅ ALSO copy matching channels into country buckets
    channels.forEach(ch => {
      const code = detectCountry(ch);
      if (code) (countryBuckets[code] = countryBuckets[code] || []).push(ch);
    });
  });

  // De-dup country buckets against Khmer + Sports only
  const khmerUrls = new Set(khmer.map(c => c.url));
  const sportUrls = new Set(sports.map(c => c.url));
  Object.keys(countryBuckets).forEach(code => {
    const seen = new Set();
    countryBuckets[code] = countryBuckets[code].filter(c => {
      if (khmerUrls.has(c.url) || sportUrls.has(c.url)) return false;
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
    if (!countryBuckets[code].length) delete countryBuckets[code];
  });

  // Assemble
  const sorted = {};
  if (khmer.length) {
    khmer.sort((a, b) => a.name.localeCompare(b.name));
    sorted[KHMER_KEY] = khmer;
  }
  if (sports.length) {
    sports.sort((a, b) => a.name.localeCompare(b.name));
    sorted[SPORTS_KEY] = sports;
  }

  // Countries sorted by channel count desc
  Object.entries(countryBuckets)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([code, list]) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      sorted[COUNTRY_PREFIX + countryNameOf(code)] = { channels: list, code };
    });

  // Original groups
  Object.keys(otherGroups).sort((a, b) => a.localeCompare(b)).forEach(k => {
    sorted[k] = otherGroups[k];
  });

  return sorted;
}

function normalizeGroups(sorted) {
  const result = {};
  const codes = {};
  Object.entries(sorted).forEach(([k, v]) => {
    if (Array.isArray(v)) { result[k] = v; }
    else { result[k] = v.channels; codes[k] = v.code; }
  });
  return { groups: result, codes };
}

// ============================================================
// Channel button
// ============================================================
function makeChannelButton(ch, list) {
  const btn = document.createElement('button');
  btn.className = 'channel-item' + (ch.url === activeUrl ? ' active' : '');
  btn.dataset.url = ch.url;
  btn.title = ch.name;

  const star = document.createElement('span');
  star.className = 'fav-star';
  star.textContent = '★';
  star.setAttribute('aria-hidden', 'true');

  const logoDiv = document.createElement('span');
  logoDiv.className = 'ch-logo';
  const logoUrl = ch.logo || getLogoUrl(ch);
  if (logoUrl) {
    const img = document.createElement('img');
    img.src = logoUrl; img.alt = ''; img.loading = 'lazy';
    img.onerror = () => { img.remove(); logoDiv.textContent = ch.name.charAt(0).toUpperCase(); };
    logoDiv.appendChild(img);
  } else logoDiv.textContent = ch.name.charAt(0).toUpperCase();

  const nameSpan = document.createElement('span');
  nameSpan.className = 'ch-name';
  nameSpan.textContent = ch.name;

  btn.appendChild(star);
  btn.appendChild(logoDiv);
  btn.appendChild(nameSpan);
  btn.addEventListener('click', () => {
    autoSkips = 0;
    playChannel(ch, list);
    if (window.innerWidth <= 900) {
      document.body.classList.remove('mini');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  return btn;
}

// ============================================================
// View building
// ============================================================
function getView() {
  const baseGroups = groupByCategory(allChannels);
  const sorted = buildSortedGroups(baseGroups);
  const { groups, codes } = normalizeGroups(sorted);

  const favList = [];
  const seen = new Set();
  Object.values(groups).forEach(list => list.forEach(c => {
    if (favs.has(c.url) && !seen.has(c.url)) { seen.add(c.url); favList.push(c); }
  }));
  favList.sort((a, b) => a.name.localeCompare(b.name));

  const view = favList.length ? { [FAV_KEY]: favList, ...groups } : groups;
  return { groups, view, codes };
}

// ============================================================
// Render
// ============================================================
function renderChannels() {
  const scrollTop = channelsContainer.scrollTop;
  const { groups, view, codes } = getView();
  const q = query.toLowerCase();
  channelsContainer.innerHTML = '';

  // ✅ Unique channel count (not affected by country duplication)
  const uniqueUrls = new Set();
  Object.values(groups).forEach(l => l.forEach(c => uniqueUrls.add(c.url)));
  const totalUnique = uniqueUrls.size;

  if (activeCat !== 'all' && !view[activeCat]) activeCat = 'all';
  renderChips(view);
  renderCountryStrip(view, codes);

  let visibleCount = 0;

  Object.entries(view).forEach(([category, channels]) => {
    if (activeCat !== 'all' && category !== activeCat) return;
    const matches = q ? channels.filter(c => c.name.toLowerCase().includes(q)) : channels;
    if (matches.length === 0) return;

    const isCountry = category.startsWith(COUNTRY_PREFIX);
    const catDiv = document.createElement('div');
    catDiv.className = 'category';
    if (category === KHMER_KEY) catDiv.classList.add('category-khmer');
    else if (category === SPORTS_KEY) catDiv.classList.add('category-sports');
    else if (category === FAV_KEY) catDiv.classList.add('category-fav');
    else if (isCountry) catDiv.classList.add('category-country');
    catDiv.dataset.category = category;

    const lc = category.toLowerCase();
    const icon = category === KHMER_KEY ? '🇰🇭' :
                 category === SPORTS_KEY ? '⚽' :
                 category === FAV_KEY ? '⭐' :
                 isCountry ? flagOf(codes[category]) :
                 lc.includes('news') ? '📰' :
                 lc.includes('movie') ? '🎬' :
                 lc.includes('music') ? '🎵' :
                 lc.includes('kids') ? '🧸' :
                 lc.includes('doc') ? '📖' : '📺';

    const isOpen = (q || activeCat !== 'all') ? true : openCats.has(category);

    const header = document.createElement('button');
    header.className = 'category-header';
    header.innerHTML = `
      <span class="cat-name"><span class="cat-icon">${icon}</span><span class="txt"></span></span>
      <span class="cat-meta"><span class="cat-count">${matches.length}</span><span class="arrow${isOpen ? ' open' : ''}">▼</span></span>`;
    header.querySelector('.txt').textContent = category === FAV_KEY ? 'Favorites' : category;

    const wrapper = document.createElement('div');
    wrapper.className = 'channel-list-wrapper' + (isOpen ? ' open' : '');

    const fill = () => {
      if (wrapper.dataset.filled) return;
      wrapper.dataset.filled = '1';
      const shown = q ? matches.slice(0, SEARCH_LIMIT) : matches;
      const frag = document.createDocumentFragment();
      shown.forEach(ch => {
        const b = makeChannelButton(ch, channels);
        if (favs.has(ch.url)) b.classList.add('is-fav');
        frag.appendChild(b);
      });
      if (shown.length < matches.length) {
        // ✅ "Load more" button instead of a dead-end note
        const more = document.createElement('button');
        more.className = 'more-note';
        more.style.cursor = 'pointer';
        more.style.background = 'var(--card)';
        more.style.border = '1px solid var(--line)';
        more.style.borderRadius = '10px';
        more.style.padding = '10px';
        more.textContent = `Load ${Math.min(500, matches.length - shown.length)} more (${shown.length} / ${matches.length})`;
        more.addEventListener('click', () => {
          const start = wrapper.querySelectorAll('.channel-item').length;
          const nextBatch = matches.slice(start, start + 500);
          const f2 = document.createDocumentFragment();
          nextBatch.forEach(ch => {
            const b = makeChannelButton(ch, channels);
            if (favs.has(ch.url)) b.classList.add('is-fav');
            f2.appendChild(b);
          });
          wrapper.replaceChild(f2, more);
          const newCount = wrapper.querySelectorAll('.channel-item').length;
          if (newCount < matches.length) {
            more.textContent = `Load ${Math.min(500, matches.length - newCount)} more (${newCount} / ${matches.length})`;
            wrapper.appendChild(more);
          }
        });
        frag.appendChild(more);
      }
      wrapper.appendChild(frag);
    };
    if (isOpen) fill();

    header.addEventListener('click', () => {
      if (q || activeCat !== 'all') return;
      const open = wrapper.classList.toggle('open');
      header.querySelector('.arrow').classList.toggle('open', open);
      if (open) { openCats.add(category); fill(); } else openCats.delete(category);
    });

    catDiv.appendChild(header);
    catDiv.appendChild(wrapper);
    channelsContainer.appendChild(catDiv);
    visibleCount += matches.length;
  });

  totalChannelsEl.textContent = totalUnique;
  totalDeadEl.textContent = Object.keys(dead).length;
  resultCountEl.textContent = q ? `${visibleCount} match${visibleCount !== 1 ? 'es' : ''}` : '';

  const countryCount = Object.keys(view).filter(k => k.startsWith(COUNTRY_PREFIX)).length;
  totalCountriesEl.textContent = countryCount;

  if (visibleCount === 0) {
    const div = document.createElement('div');
    div.className = 'empty';
    div.innerHTML = `<span class="big">${q ? '🔍' : '📭'}</span>${q ? `No channels found for "${query}"` : 'No channels available'}`;
    channelsContainer.appendChild(div);
  }

  channelsContainer.scrollTop = scrollTop;
}

// ============================================================
// Country strip
// ============================================================
function renderCountryStrip(view, codes) {
  const countries = Object.entries(view)
    .filter(([k]) => k.startsWith(COUNTRY_PREFIX))
    .map(([k, list]) => ({ code: codes[k], name: k.slice(COUNTRY_PREFIX.length), count: list.length }))
    .filter(c => c.code)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  countryStrip.innerHTML = '';
  countries.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'flag-chip' + (activeCat === COUNTRY_PREFIX + c.name ? ' on' : '');
    btn.innerHTML = `<span class="flag">${flagOf(c.code)}</span>${c.name}<span class="count">${c.count}</span>`;
    btn.title = `${c.name} — ${c.count} channels`;
    btn.addEventListener('click', () => {
      activeCat = COUNTRY_PREFIX + c.name;
      renderChannels();
      channelsContainer.scrollTop = 0;
    });
    countryStrip.appendChild(btn);
  });
}

// ============================================================
// Bottom sheet — country picker
// ============================================================
function openSheet() {
  buildCountryList();
  sheetBackdrop.classList.add('show');
  countrySheet.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => countrySearch.focus(), 200);
}
function closeSheet() {
  sheetBackdrop.classList.remove('show');
  countrySheet.classList.remove('show');
  document.body.style.overflow = '';
}
function buildCountryList() {
  const { view, codes } = getView();
  const all = Object.entries(view)
    .filter(([k]) => k.startsWith(COUNTRY_PREFIX))
    .map(([k, list]) => ({
      code: codes[k],
      name: k.slice(COUNTRY_PREFIX.length),
      count: list.length,
      categoryKey: k,
    }))
    .filter(c => c.code && COUNTRY_NAMES[c.code]);

  const byRegion = {};
  all.forEach(c => {
    const r = regionOf(c.code);
    (byRegion[r] = byRegion[r] || []).push(c);
  });

  countryList.innerHTML = '';
  const q = countrySearchQuery.toLowerCase();

  REGION_ORDER.forEach(region => {
    const items = (byRegion[region] || [])
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!items.length) return;

    const label = document.createElement('div');
    label.className = 'region-label';
    label.textContent = region;
    countryList.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'country-grid';

    items.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'country-btn' + (activeCat === c.categoryKey ? ' on' : '');
      btn.innerHTML = `
        <span class="flag">${flagOf(c.code)}</span>
        <div class="info">
          <div class="name">${c.name}</div>
          <div class="num">${c.count} channel${c.count !== 1 ? 's' : ''}</div>
        </div>`;
      btn.addEventListener('click', () => {
        activeCat = c.categoryKey;
        renderChannels();
        closeSheet();
        channelsContainer.scrollTop = 0;
        toast(`${flagOf(c.code)} ${c.name} — ${c.count} channels`);
      });
      grid.appendChild(btn);
    });

    countryList.appendChild(grid);
  });

  if (!countryList.children.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `<span class="big">🌍</span>No countries match "${countrySearchQuery}"`;
    countryList.appendChild(empty);
  }
}

$('btn-open-countries').addEventListener('click', openSheet);
$('sheet-close').addEventListener('click', closeSheet);
sheetBackdrop.addEventListener('click', closeSheet);
countrySearch.addEventListener('input', e => {
  countrySearchQuery = e.target.value.trim();
  buildCountryList();
});

// ============================================================
// Mini player
// ============================================================
let lastScrollY = 0;
function updateMini() {
  if (window.innerWidth > 900) {
    document.body.classList.remove('mini');
    return;
  }
  const y = window.scrollY;
  if (y > 120 && activeChannel) {
    document.body.classList.add('mini');
    playerArea.classList.add('scrolled');
  } else if (y < 40) {
    document.body.classList.remove('mini');
    playerArea.classList.remove('scrolled');
  }
  lastScrollY = y;
}
window.addEventListener('scroll', updateMini, { passive: true });
window.addEventListener('resize', updateMini);

$('mini-expand').addEventListener('click', () => {
  document.body.classList.remove('mini');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  playerArea.classList.remove('scrolled');
});

// ============================================================
// Dead-stream handling
// ============================================================
function clearLoadTimer() { clearTimeout(loadTimer); loadTimer = null; }
function destroyHls() { if (currentHls) { currentHls.destroy(); currentHls = null; } }

function markDead(ch, token, reason) {
  if (token !== playToken || !ch) return;
  clearLoadTimer();
  destroyHls();

  const prevDead = dead[ch.url];
  dead[ch.url] = Date.now();
  saveDead();

  const idx = playList.indexOf(ch);
  const next = idx >= 0 ? playList.slice(idx + 1).find(c => !dead[c.url]) : null;

  allChannels = allChannels.filter(c => c.url !== ch.url);
  renderChannels();
  setStatus('❌ ' + (reason || 'Stream failed'), 'error');
  videoMsg.innerHTML = '<span class="big">📡</span><span>This stream is offline and was removed</span>';
  videoMsg.classList.remove('hide');

  const undo = {
    label: 'Undo',
    fn: () => {
      if (prevDead) dead[ch.url] = prevDead; else delete dead[ch.url];
      saveDead();
      if (!allChannels.find(c => c.url === ch.url)) allChannels.unshift(ch);
      renderChannels();
      toast('Stream restored');
    }
  };

  if (next && autoSkips < MAX_AUTO_SKIP) {
    autoSkips++;
    toast(`${ch.name} is offline. Trying next…`, undo);
    setTimeout(() => playChannel(next, playList), 700);
  } else {
    toast(`${ch.name} is offline. Removed from list.`, undo);
  }
}

function tryPlay() {
  video.play().catch(() => {
    video.muted = true;
    video.play()
      .then(() => toast('Playing muted. Tap speaker to unmute'))
      .catch(() => {});
  });
}

// ============================================================
// Play channel
// ============================================================
function playChannel(ch, list) {
  const token = ++playToken;
  clearLoadTimer();
  destroyHls();
  activeChannel = ch;
  activeUrl = ch.url;
  playList = list || playList;
  nowPlayingName.textContent = ch.name || 'Unknown';
  nowGroup.textContent = (ch.group || '').replace('🇰🇭 ', '') || 'Live TV';
  setStatus('Loading…', 'loading');
  videoMsg.innerHTML = '<span class="big">⏳</span><span>Loading stream…</span>';
  videoMsg.classList.remove('hide');
  syncUrl(ch);
  updateFavBtn();

  document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
  const activeBtn = channelsContainer.querySelector(`.channel-item[data-url="${CSS.escape(ch.url)}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  video.pause();
  video.removeAttribute('src');
  video.load();

  video.onplaying = () => {
    if (token !== playToken) return;
    clearLoadTimer();
    autoSkips = 0;
    videoMsg.classList.add('hide');
    setStatus('Playing', 'ready');
  };

  loadTimer = setTimeout(() => markDead(ch, token, 'Stream timed out'), LOAD_TIMEOUT);

  if (window.Hls && Hls.isSupported()) {
    let mediaRetry = 0;
    currentHls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30, maxBufferLength: 60 });
    currentHls.loadSource(ch.url);
    currentHls.attachMedia(video);
    currentHls.on(Hls.Events.MANIFEST_PARSED, () => tryPlay());
    currentHls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal || token !== playToken) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetry++ < 1) {
        currentHls.recoverMediaError();
        return;
      }
      markDead(ch, token, 'Stream failed');
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = ch.url;
    video.onerror = () => markDead(ch, token, 'Stream failed');
    video.onloadedmetadata = () => tryPlay();
  } else {
    clearLoadTimer();
    setStatus('❌ HLS not supported', 'error');
  }
}

// ============================================================
// URL boot
// ============================================================
function openFromUrl() {
  const param = new URLSearchParams(location.search).get('channel');
  if (!param) return;
  const ch = findBySlug(param);
  if (!ch) { toast(`Channel "${param.replace(/_/g, ' ')}" not found`); return; }
  if (dead[ch.url]) { delete dead[ch.url]; saveDead(); }

  const { view } = getView();
  const cat = Object.keys(view).find(k => k !== FAV_KEY && view[k].some(c => c.url === ch.url));
  if (cat) openCats.add(cat);
  renderChannels();
  const list = cat ? view[cat] : [ch];
  const target = list.find(c => c.url === ch.url) || ch;
  playChannel(target, list);
}

// ============================================================
// Load playlists
// ============================================================
async function loadPlaylist() {
  try {
    setStatus('Downloading…', 'loading');
    const [mainResponse, khmerResponse] = await Promise.all([
      fetch(m3uUrl),
      fetch(khmerUrl).catch(() => null)
    ]);
    if (!mainResponse.ok) throw new Error('Main playlist failed');

    allChannels = parseM3U(await mainResponse.text());
    allChannels.forEach(ch => {
      if (/\.kh(@|$)/i.test(ch.tvgId)) ch.group = '🇰🇭 Khmer TV';
    });

    if (khmerResponse && khmerResponse.ok) {
      const khmerChannels = parseM3U(await khmerResponse.text(), '🇰🇭 Khmer TV');
      khmerChannels.forEach(ch => ch.group = '🇰🇭 Khmer TV');
      allChannels = khmerChannels.concat(allChannels);
    } else {
      toast('Khmer playlist could not load');
    }

    setStatus('Parsing…', 'loading');
    openCats.add(KHMER_KEY);
    renderChannels();
    setStatus('Ready', 'ready');
    openFromUrl();
  } catch (err) {
    console.error(err);
    setStatus('❌ Load failed', 'error');
    channelsContainer.innerHTML = `
      <div class="empty"><span class="big">📡</span>Failed to load playlist<br>
      <span style="font-size:12px;color:var(--muted-2);display:block;margin-top:6px">Check your connection and refresh</span></div>`;
  }
}

// ============================================================
// Chips
// ============================================================
function renderChips(groups) {
  const names = Object.keys(groups);
  const pinned = names.filter(n => n === FAV_KEY || n === KHMER_KEY || n === SPORTS_KEY);
  const rest = names
    .filter(n => !pinned.includes(n) && !n.startsWith(COUNTRY_PREFIX))
    .sort((a, b) => groups[b].length - groups[a].length)
    .slice(0, 6);

  const list = [...pinned, ...rest];

  const label = n =>
    n === KHMER_KEY ? '🇰🇭 Khmer' :
    n === SPORTS_KEY ? '⚽ Sports' :
    n === FAV_KEY ? '⭐ Favorites' : n;

  chipsEl.innerHTML = '';

  [['all', 'All']].concat(list.map(n => [n, label(n)])).forEach(([key, text]) => {
    const count = key === 'all' ? '' : `<span class="count">${groups[key] ? groups[key].length : 0}</span>`;
    const b = document.createElement('button');
    b.className = 'chip' + (activeCat === key ? ' on' : '');
    b.innerHTML = `${text}${count}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', activeCat === key);
    b.addEventListener('click', () => {
      activeCat = key;
      renderChannels();
      channelsContainer.scrollTop = 0;
    });
    chipsEl.appendChild(b);
  });
}

// ============================================================
// Expand / collapse all
// ============================================================
$('btn-expand-all').addEventListener('click', () => {
  const { view } = getView();
  Object.keys(view).forEach(k => openCats.add(k));
  renderChannels();
});
$('btn-collapse-all').addEventListener('click', () => {
  openCats.clear();
  renderChannels();
});

// ============================================================
// Player controls
// ============================================================
function step(dir) {
  if (!activeChannel) return toast('Pick a channel first');
  const i = playList.indexOf(activeChannel);
  const next = playList[i + dir];
  if (!next) return toast(dir > 0 ? 'Last channel in this list' : 'First channel in this list');
  autoSkips = 0;
  playChannel(next, playList);
}
function toggleFullscreen() {
  const box = $('video-container');
  if (document.fullscreenElement) document.exitFullscreen();
  else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
  else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
}
$('btn-prev').addEventListener('click', () => step(-1));
$('btn-next').addEventListener('click', () => step(1));
$('btn-reload').addEventListener('click', () => {
  if (!activeChannel) return toast('Pick a channel first');
  autoSkips = 0;
  playChannel(activeChannel, playList);
});
$('btn-full').addEventListener('click', toggleFullscreen);

$('btn-copy').addEventListener('click', async () => {
  if (!activeChannel) return toast('Pick a channel first');
  toast((await copyText(shareLink(activeChannel))) ? '🔗 Link copied' : 'Could not copy');
});
shareUrlEl.addEventListener('focus', () => shareUrlEl.select());
$('btn-share').addEventListener('click', async () => {
  if (!activeChannel) return toast('Pick a channel first');
  const url = shareLink(activeChannel);
  if (navigator.share) {
    try { await navigator.share({ title: activeChannel.name + ' — Nea IPTV', text: 'Watch ' + activeChannel.name + ' live', url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  toast((await copyText(url)) ? '🔗 Link copied' : 'Could not copy');
});

favBtn.addEventListener('click', () => {
  if (!activeChannel) return toast('Pick a channel first');
  const u = activeChannel.url;
  if (favs.has(u)) { favs.delete(u); toast('Removed from favorites'); }
  else { favs.add(u); toast('⭐ Added to favorites'); }
  saveFavs();
  updateFavBtn();
  renderChannels();
});

// ============================================================
// Search
// ============================================================
let searchTimer;
searchBox.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    query = e.target.value.trim();
    renderChannels();
  }, 150);
});
searchClear.addEventListener('click', () => {
  searchBox.value = '';
  query = '';
  renderChannels();
  searchBox.focus();
});

$('reset-dead').addEventListener('click', () => {
  if (!Object.keys(dead).length) return toast('No removed streams to restore');
  dead = {};
  saveDead();
  renderChannels();
  toast('All removed streams restored');
});

// ============================================================
// Keyboard shortcuts
// ============================================================
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  if (e.key === 'Escape') {
    if (countrySheet.classList.contains('show')) { closeSheet(); return; }
    if (typing) { document.activeElement.blur(); return; }
  }
  if (typing) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowright') step(1);
  else if (k === 'arrowleft') step(-1);
  else if (k === 'f') toggleFullscreen();
  else if (k === 'm') video.muted = !video.muted;
  else if (k === '/') { e.preventDefault(); searchBox.focus(); }
  else if (k === 'c') openSheet();
});

// ============================================================
// Stall detection
// ============================================================
video.addEventListener('waiting', () => {
  if (!activeChannel || loadTimer) return;
  const ch = activeChannel, token = playToken;
  loadTimer = setTimeout(() => {
    if (video.readyState < 3) markDead(ch, token, 'Stream stalled');
  }, 30000);
});
video.addEventListener('playing', () => clearLoadTimer());

// ============================================================
// Horizontal wheel scroll on strips
// ============================================================
['country-strip', 'chips'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('wheel', (e) => {
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
});

// ============================================================
// Start
// ============================================================
loadPlaylist();
