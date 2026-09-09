// script.js - Enhanced with Khmer category pinned, all collapsed by default

const m3uUrl = 'https://iptv-org.github.io/iptv/index.m3u';
const khmerUrl = 'https://iptv-org.github.io/iptv/languages/khm.m3u';
const channelsContainer = document.getElementById('channels-container');
const searchBox = document.getElementById('search-box');
const video = document.getElementById('video-player');
const nowPlaying = document.getElementById('now-playing');
const statusEl = document.getElementById('status');
const totalChannelsEl = document.getElementById('total-channels');
const totalCategoriesEl = document.getElementById('total-categories');
const hamburger = document.getElementById('hamburger');
const overlay = document.getElementById('overlay');
const sidebar = document.getElementById('sidebar');

let allChannels = [];
let allGroups = {};
let activeChannelUrl = null;
let currentHls = null;

// --- Hamburger logic ---
function toggleSidebar(show) {
    if (show === undefined) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    } else if (show) {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
}

hamburger.addEventListener('click', () => toggleSidebar());
overlay.addEventListener('click', () => toggleSidebar(false));

// Close sidebar on window resize to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 700) {
        toggleSidebar(false);
    }
});

// --- Helper: Get logo ---
function getLogoUrl(channel) {
    if (channel.logo && channel.logo.startsWith('http')) {
        return channel.logo;
    }
    const name = channel.name.toLowerCase();
    const logoMap = {
        'bbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/BBC_Logo_2021.svg/1200px-BBC_Logo_2021.svg.png',
        'itv': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/ITV_Logo_2019.svg/1200px-ITV_Logo_2019.svg.png',
        'cnn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN_logo_2024.svg/1200px-CNN_logo_2024.svg.png',
        'sky news': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Sky_News_2021_logo.svg/1200px-Sky_News_2021_logo.svg.png',
        'fox': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Fox_News_Channel_logo.svg/1200px-Fox_News_Channel_logo.svg.png',
        'al jazeera': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Al_Jazeera_Logo_2023.svg/1200px-Al_Jazeera_Logo_2023.svg.png',
        'sport': 'https://cdn-icons-png.flaticon.com/512/58/58990.png',
    };
    for (const [key, url] of Object.entries(logoMap)) {
        if (name.includes(key)) return url;
    }
    return null;
}

// --- Parse M3U ---
function parseM3U(data, defaultGroup = 'Uncategorized') {
    const lines = data.split('\n');
    const channels = [];
    let currentName = '';
    let currentGroup = defaultGroup;
    let currentLogo = '';
    let currentTvgId = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#EXTINF:')) {
            const nameMatch = trimmed.match(/,([^,]+)$/);
            currentName = nameMatch ? nameMatch[1].trim() : 'Unknown';
            const groupMatch = trimmed.match(/group-title="([^"]*)"/);
            currentGroup = groupMatch ? groupMatch[1].trim() : defaultGroup;
            const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
            currentLogo = logoMatch ? logoMatch[1].trim() : '';
            const tvgMatch = trimmed.match(/tvg-id="([^"]*)"/);
            currentTvgId = tvgMatch ? tvgMatch[1].trim() : '';
        } else if (trimmed && !trimmed.startsWith('#') && currentName) {
            channels.push({
                name: currentName,
                url: trimmed,
                group: currentGroup || defaultGroup,
                logo: currentLogo,
                tvgId: currentTvgId,
            });
            currentName = '';
            currentGroup = defaultGroup;
            currentLogo = '';
            currentTvgId = '';
        }
    }
    return channels;
}

// --- Group and sort ---
function groupByCategory(channels) {
    const groups = {};
    channels.forEach(ch => {
        const g = ch.group || 'Uncategorized';
        if (!groups[g]) groups[g] = [];
        groups[g].push(ch);
    });
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    return groups;
}

// --- Render with Khmer FIRST, then ALL Sports merged, then alphabetically ---
function renderChannels(groups) {
    channelsContainer.innerHTML = '';
    let total = 0;
    let catCount = 0;

    // 1. Extract categories
    let khmerChannels = [];
    let sportsChannels = [];
    const otherGroups = {};
    
    Object.entries(groups).forEach(([category, channels]) => {
        const lowerCat = category.toLowerCase();
        if (lowerCat.includes('khmer') || lowerCat.includes('cambodia') || lowerCat.includes('កម្ពុជា')) {
            khmerChannels = channels;
        } else if (lowerCat.includes('sport') || lowerCat.includes('football') || lowerCat.includes('futebol') || lowerCat.includes('fútbol')) {
            // Merge ALL sports-related categories into one
            sportsChannels = sportsChannels.concat(channels);
        } else {
            otherGroups[category] = channels;
        }
    });

    // 2. Build final sorted groups: Khmer first, then Sports, then alphabetically
    const sortedGroups = {};
    
    // Add Khmer TV if it exists
    if (khmerChannels.length > 0) {
        sortedGroups['Khmer TV'] = khmerChannels;
    }
    
    // Add merged Sports if it exists
    if (sportsChannels.length > 0) {
        // Sort sports channels alphabetically
        sportsChannels.sort((a, b) => a.name.localeCompare(b.name));
        sortedGroups['Sports'] = sportsChannels;
    }
    
    // Add remaining groups alphabetically
    Object.keys(otherGroups).sort((a, b) => a.localeCompare(b)).forEach(key => {
        sortedGroups[key] = otherGroups[key];
    });

    // 3. Render (same as before)
    Object.entries(sortedGroups).forEach(([category, channels]) => {
        if (channels.length === 0) return;
        total += channels.length;
        catCount++;

        const catDiv = document.createElement('div');
        catDiv.className = 'category';
        if (category.includes('Khmer')) {
            catDiv.classList.add('category-khmer');
        }
        catDiv.dataset.category = category;

        const header = document.createElement('div');
        header.className = 'category-header';
        const icon = category.includes('Khmer') ? '🇰🇭' :
                     category.includes('Sports') ? '⚽' :
                     category.toLowerCase().includes('news') ? '📰' :
                     category.toLowerCase().includes('movie') ? '🎬' :
                     category.toLowerCase().includes('music') ? '🎵' :
                     category.toLowerCase().includes('kids') ? '🧸' :
                     category.toLowerCase().includes('doc') ? '📖' : '📺';
        header.innerHTML = `
            <span class="cat-name">
                <span class="cat-icon">${icon}</span>
                ${category}
            </span>
            <span class="cat-meta">
                <span class="cat-count">${channels.length}</span>
                <span class="arrow">▼</span>
            </span>
        `;

        const listWrapper = document.createElement('div');
        listWrapper.className = 'channel-list-wrapper';

        channels.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'channel-item';
            btn.dataset.url = ch.url;
            btn.dataset.name = ch.name.toLowerCase();

            const logoDiv = document.createElement('span');
            logoDiv.className = 'ch-logo';
            const logoUrl = ch.logo || getLogoUrl(ch);
            if (logoUrl) {
                const img = document.createElement('img');
                img.src = logoUrl;
                img.alt = '';
                img.loading = 'lazy';
                img.onerror = () => { logoDiv.textContent = ch.name.charAt(0).toUpperCase(); };
                logoDiv.appendChild(img);
            } else {
                logoDiv.textContent = ch.name.charAt(0).toUpperCase();
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ch-name';
            nameSpan.textContent = ch.name;

            btn.appendChild(logoDiv);
            btn.appendChild(nameSpan);

            btn.addEventListener('click', () => {
                playChannel(ch.url, ch.name);
                document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                if (window.innerWidth <= 700) {
                    toggleSidebar(false);
                }
            });

            listWrapper.appendChild(btn);
        });

        header.addEventListener('click', () => {
            const isOpen = listWrapper.classList.toggle('open');
            header.querySelector('.arrow').classList.toggle('open');
        });

        catDiv.appendChild(header);
        catDiv.appendChild(listWrapper);
        channelsContainer.appendChild(catDiv);
    });

    totalChannelsEl.textContent = total;
    totalCategoriesEl.textContent = catCount;

    if (total === 0) {
        channelsContainer.innerHTML = `
            <div style="text-align:center;color:#4a5a7a;padding:40px 20px;font-size:14px;">
                🔍 No channels found
            </div>
        `;
    }
}

// --- Play channel ---
function playChannel(url, name) {
    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }
    activeChannelUrl = url;
    nowPlaying.textContent = `▶ ${name || 'Unknown'}`;
    statusEl.textContent = 'Loading...';
    statusEl.className = 'loading';

    video.pause();
    video.src = '';

    if (Hls.isSupported()) {
        currentHls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backbufferLength: 30,
            maxBufferLength: 60,
        });
        currentHls.loadSource(url);
        currentHls.attachMedia(video);
        currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => {
                statusEl.textContent = '⚠️ Playback error';
                statusEl.className = 'error';
            });
            statusEl.textContent = 'Playing';
            statusEl.className = 'ready';
        });
        currentHls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                statusEl.textContent = '❌ Stream failed';
                statusEl.className = 'error';
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(e => {
                statusEl.textContent = '⚠️ Playback error';
                statusEl.className = 'error';
            });
            statusEl.textContent = 'Playing';
            statusEl.className = 'ready';
        });
    } else {
        statusEl.textContent = '❌ HLS not supported';
        statusEl.className = 'error';
    }
}

// --- Search ---
function filterChannels(term) {
    const q = term.toLowerCase().trim();
    const categoryDivs = channelsContainer.querySelectorAll('.category');

    if (!q) {
        categoryDivs.forEach(cat => {
            cat.style.display = '';
            // Keep collapsed state, don't auto-open
            const wrapper = cat.querySelector('.channel-list-wrapper');
            wrapper.classList.remove('open');
            const arrow = cat.querySelector('.arrow');
            if (arrow) arrow.classList.remove('open');
            wrapper.querySelectorAll('.channel-item').forEach(btn => btn.style.display = '');
        });
        return;
    }

    let anyVisible = false;
    categoryDivs.forEach(cat => {
        const items = cat.querySelectorAll('.channel-item');
        let hasVisible = false;
        items.forEach(btn => {
            const name = btn.dataset.name || '';
            if (name.includes(q)) {
                btn.style.display = 'flex';
                hasVisible = true;
                anyVisible = true;
            } else {
                btn.style.display = 'none';
            }
        });
        if (hasVisible) {
            cat.style.display = '';
            // Auto-expand category when search has results
            const wrapper = cat.querySelector('.channel-list-wrapper');
            wrapper.classList.add('open');
            const arrow = cat.querySelector('.arrow');
            if (arrow) arrow.classList.add('open');
        } else {
            cat.style.display = 'none';
        }
    });

    if (!anyVisible) {
        const existing = channelsContainer.querySelector('.no-results');
        if (!existing) {
            const div = document.createElement('div');
            div.className = 'no-results';
            div.style.cssText = 'text-align:center;color:#4a5a7a;padding:40px 20px;font-size:14px;';
            div.innerHTML = `🔍 No channels found for "<strong>${term}</strong>"`;
            channelsContainer.appendChild(div);
        }
    } else {
        const existing = channelsContainer.querySelector('.no-results');
        if (existing) existing.remove();
    }
}

// --- Load both playlists ---
async function loadPlaylist() {
    try {
        statusEl.textContent = 'Downloading...';
        statusEl.className = 'loading';

        // Fetch main playlist and Khmer playlist in parallel
        const [mainResponse, khmerResponse] = await Promise.all([
            fetch(m3uUrl),
            fetch(khmerUrl).catch(() => null) // Khmer might fail, continue
        ]);

        if (!mainResponse.ok) throw new Error('Main playlist failed');

        const mainText = await mainResponse.text();
        let allChannels = parseM3U(mainText);

        

        // If Khmer playlist loaded, force its channels into "🇰🇭 Khmer TV" group
        if (khmerResponse && khmerResponse.ok) {
            const khmerText = await khmerResponse.text();
            // Parse the file, but override the group for all these channels
            const khmerChannels = parseM3U(khmerText, '🇰🇭 Khmer TV');
            // IMPORTANT: Force the group name for every single channel
            khmerChannels.forEach(ch => ch.group = '🇰🇭 Khmer TV');
            allChannels = allChannels.concat(khmerChannels);
        }

        statusEl.textContent = 'Parsing...';
        allGroups = groupByCategory(allChannels);
        renderChannels(allGroups);
        statusEl.textContent = 'Ready';
        statusEl.className = 'ready';

    } catch (err) {
        console.error(err);
        statusEl.textContent = '❌ Load failed';
        statusEl.className = 'error';
        channelsContainer.innerHTML = `
            <div style="text-align:center;color:#e06060;padding:40px 20px;font-size:14px;">
                ❌ Failed to load playlist<br>
                <span style="font-size:12px;color:#6a4a4a;">Check your internet connection</span>
            </div>
        `;
    }
}

// --- Events ---
searchBox.addEventListener('input', (e) => filterChannels(e.target.value));

// --- Start ---
loadPlaylist();