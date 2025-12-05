// --- Constants ---
const CORS_PROXY_PREFIX = 'https://corsproxy.io/?';
const NRK_RSS_URL = 'https://www.nrk.no/nyheter/siste.rss';
const VG_RSS_URL = 'https://www.vg.no/rss/feed';

// Grimstad Coordinates
const LOCATION = {
    lat: 58.33455833890616,
    lon: 8.577132411967785
};

// --- Clock ---
function updateClock() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' };
    const timeString = new Intl.DateTimeFormat('nb-NO', options).format(now);

    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = timeString;
}

// --- Weather ---
function updateWeather() {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LOCATION.lat}&lon=${LOCATION.lon}`;
    const proxyUrl = CORS_PROXY_PREFIX + encodeURIComponent(url);

    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            const timeseries = data.properties.timeseries;
            const current = timeseries[0];

            // 1. Update Current Weather
            updateCurrentWeather(current);

            // 2. Update Hourly Forecast
            updateHourlyForecast(timeseries);
        })
        .catch(error => {
            console.error('Weather fetch error:', error);
            document.getElementById('current-summary').textContent = 'Feil ved henting av vær';
        });
}

function updateCurrentWeather(currentData) {
    const temp = Math.round(currentData.data.instant.details.air_temperature);
    const symbolCode = currentData.data.next_1_hours.summary.symbol_code;

    const tempEl = document.getElementById('current-temp');
    const iconEl = document.getElementById('current-weather-icon');
    const summaryEl = document.getElementById('current-summary');

    tempEl.textContent = `${temp}°`;

    // Color logic
    if (temp <= 0) {
        tempEl.classList.add('weather-temp-cold');
    } else {
        tempEl.classList.remove('weather-temp-cold');
    }

    // Icon (Using Met.no SVG icons)
    // Note: You might need to host these icons or use a CDN. 
    // For now, I'll use a public CDN or a placeholder if not available.
    // Using a reliable CDN for Met.no icons if possible, or fallback to text/emoji if image fails.
    // Let's try to use the raw GitHub content from Met.no's icon repo or similar.
    // Actually, let's use a known CDN for weather icons or just the symbol code name for now if image fails.
    // A common way is to download them, but since I can't easily do that, I will use a public URL structure.
    // https://raw.githubusercontent.com/metno/weathericons/master/weather/svg/${symbolCode}.svg

    iconEl.src = `https://raw.githubusercontent.com/metno/weathericons/master/weather/svg/${symbolCode}.svg`;
    summaryEl.textContent = translateSymbolCode(symbolCode);
}

function updateHourlyForecast(timeseries) {
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = ''; // Clear previous

    // Show next 12 hours
    const next12Hours = timeseries.slice(1, 13);

    next12Hours.forEach(item => {
        const time = new Date(item.time);
        const hour = time.getHours().toString().padStart(2, '0');
        const temp = Math.round(item.data.instant.details.air_temperature);
        const symbolCode = item.data.next_1_hours.summary.symbol_code;

        const el = document.createElement('div');
        el.className = 'forecast-item';
        el.innerHTML = `
            <div class="forecast-time">${hour}:00</div>
            <img class="forecast-icon" src="https://raw.githubusercontent.com/metno/weathericons/master/weather/svg/${symbolCode}.svg" alt="${symbolCode}">
            <div class="forecast-temp ${temp <= 0 ? 'weather-temp-cold' : ''}">${temp}°</div>
        `;
        container.appendChild(el);
    });
}

function translateSymbolCode(code) {
    // Simple translation map (expand as needed)
    // This removes the _day, _night, _polartwilight suffixes for cleaner text
    const cleanCode = code.split('_')[0];
    const map = {
        'clearsky': 'Klarvær',
        'cloudy': 'Skyet',
        'fair': 'Lettskyet',
        'fog': 'Tåke',
        'heavyrain': 'Kraftig regn',
        'heavyrainandthunder': 'Kraftig regn og torden',
        'heavysnow': 'Kraftig snø',
        'heavysnowandthunder': 'Kraftig snø og torden',
        'lightrain': 'Lett regn',
        'lightrainandthunder': 'Lett regn og torden',
        'lightsnow': 'Lett snø',
        'lightsnowandthunder': 'Lett snø og torden',
        'partlycloudy': 'Delvis skyet',
        'rain': 'Regn',
        'rainandthunder': 'Regn og torden',
        'snow': 'Snø',
        'snowandthunder': 'Snø og torden',
        'sleet': 'Sludd'
    };
    return map[cleanCode] || cleanCode;
}

// --- News ---
function fetchRSS(url, listId) {
    const proxyUrl = CORS_PROXY_PREFIX + encodeURIComponent(url);

    fetch(proxyUrl)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
        .then(data => {
            const items = data.querySelectorAll("item");
            const listEl = document.getElementById(listId);
            listEl.innerHTML = ''; // Clear loading text

            // Take top 10
            let count = 0;
            items.forEach(item => {
                if (count >= 10) return;
                const title = item.querySelector("title").textContent.replace("<![CDATA[", "").replace("]]>", "").trim();

                const li = document.createElement('li');
                li.textContent = title;
                listEl.appendChild(li);
                count++;
            });
        })
        .catch(error => {
            console.error(`Error fetching RSS from ${url}:`, error);
            document.getElementById(listId).innerHTML = '<li>Kunne ikke laste nyheter.</li>';
        });
}

function updateNews() {
    fetchRSS(NRK_RSS_URL, 'nrk-news-list');
    fetchRSS(VG_RSS_URL, 'vg-news-list');
}

// --- Screensaver & Refresh Logic ---
let isScreensaverActive = false;
let manualOverride = false; // true if user manually toggled it
let animationId = null;

// Bouncing Logic
let x = 100, y = 100;
let dx = 2, dy = 2; // Speed
const logo = document.getElementById('screensaver-logo');
const container = document.getElementById('screensaver-container');

function startScreensaver() {
    if (isScreensaverActive) return;
    isScreensaverActive = true;
    container.style.display = 'block';

    // Reset position if needed or keep random? Let's keep it simple.
    // Ensure logo is loaded for dimensions
    animateScreensaver();
}

function stopScreensaver() {
    if (!isScreensaverActive) return;
    isScreensaverActive = false;
    container.style.display = 'none';
    if (animationId) cancelAnimationFrame(animationId);
}

function animateScreensaver() {
    if (!isScreensaverActive) return;

    const logoRect = logo.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // Update position
    x += dx;
    y += dy;

    // Bounce X
    if (x + logoRect.width >= winWidth || x <= 0) {
        dx = -dx;
        x = Math.max(0, Math.min(x, winWidth - logoRect.width)); // Clamp
    }

    // Bounce Y
    if (y + logoRect.height >= winHeight || y <= 0) {
        dy = -dy;
        y = Math.max(0, Math.min(y, winHeight - logoRect.height)); // Clamp
    }

    logo.style.left = x + 'px';
    logo.style.top = y + 'px';

    animationId = requestAnimationFrame(animateScreensaver);
}

function checkTimeForScreensaver() {
    if (manualOverride) return; // Don't auto-change if user manually set it

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Active between 16:30 and 06:00
    // >= 16:30 OR < 06:00

    const isAfterStart = (hours > 16) || (hours === 16 && minutes >= 30);
    const isBeforeEnd = (hours < 6);

    if (isAfterStart || isBeforeEnd) {
        startScreensaver();
    } else {
        stopScreensaver();
    }
}

function toggleScreensaver() {
    manualOverride = true; // User took control
    if (isScreensaverActive) {
        stopScreensaver();
    } else {
        startScreensaver();
    }
}

// Hourly Refresh (Only if screensaver is OFF)
function checkHourlyRefresh() {
    if (!isScreensaverActive) {
        console.log('Refreshing page...');
        location.reload();
    } else {
        console.log('Screensaver active, skipping refresh.');
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    updateWeather();
    updateNews();

    // Timers
    setInterval(updateClock, 10000); // Every 10 sec
    setInterval(updateWeather, 15 * 60 * 1000); // Every 15 min
    setInterval(updateNews, 5 * 60 * 1000); // Every 5 min

    // Screensaver Check (Every minute)
    checkTimeForScreensaver();
    setInterval(checkTimeForScreensaver, 60 * 1000);

    // Hourly Refresh
    setInterval(checkHourlyRefresh, 60 * 60 * 1000);

    // Key Listener
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'v') {
            toggleScreensaver();
        }
    });
});
