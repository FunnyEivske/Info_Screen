// --- JavaScript for Live Clock ---
function updateClocks() {
    // Get current time in HH:MM format (24-hour)
    const now = new Date();
    // Using Norwegian time formatting
    const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' };
    const timeString = new Intl.DateTimeFormat('nb-NO', options).format(now);
    
    // Update clock elements
    const clock1 = document.getElementById('clock-1');
    const clock2 = document.getElementById('clock-2');
    
    if (clock1) {
        clock1.textContent = timeString;
    }
    if (clock2) {
        clock2.textContent = timeString;
    }
}

// --- START: SCRIPT FOR LIVE WEATHER AND NEWS ---

// --- Constants ---
// Endret USER_AGENT for å fjerne e-posten. Dette er tryggere for publisering.
const USER_AGENT = 'Eivind-Dashboard/1.0 (github.com/Eivind_n.s)';
const LOCATIONS = [
    { id: 'grimstad',     name: 'Grimstad',     latitude: 58.33455833890616, longitude: 8.577132411967785 },
    { id: 'kristiansand', name: 'Kristiansand', latitude: 58.16329955371125, longitude: 8.00258786985478  },
    { id: 'arendal',      name: 'Arendal',      latitude: 58.46086657739493, longitude: 8.764345505384163 }
];

// --- NRK RSS URL (Back to this one) ---
const NRK_RSS_URL = 'https://www.nrk.no/nyheter/siste.rss';

// --- NEW CORS Proxy ---
// Using corsproxy.io which seems more reliable
const CORS_PROXY_PREFIX = 'https://corsproxy.io/?';

// --- Global cache for news ---
let nrkHeadlines = [];
let currentNewsIndex = 0;

/**
 * Logs a message to the status box on the page.
 */
function logStatus(msg) {
    const logBox = document.getElementById('log-box');
    if (!logBox) return;
    const time = new Date().toLocaleTimeString('nb-NO');
    const newLogEntry = document.createElement('p');
    newLogEntry.textContent = `[${time}] - ${msg}`;
    // Add new log to the top
    logBox.prepend(newLogEntry);
    // Keep log box clean
    while (logBox.children.length > 10) {
        logBox.removeChild(logBox.lastChild);
    }
}

/**
 * Fetches weather data from MET.no for all locations.
 */
async function updateWeather() {
    logStatus('⏳ Henter værdata...');
    
    LOCATIONS.forEach(async (loc) => {
        // We must URL-encode the target URL for the proxy
        // Note: We are NOT encoding the '?' or '=' from the proxy itself.
        const targetUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${loc.latitude}&lon=${loc.longitude}`;
        const proxyUrl = `${CORS_PROXY_PREFIX}${encodeURIComponent(targetUrl)}`;
        
        try {
            const response = await fetch(proxyUrl, {
                headers: {
                    // This proxy requires an Origin header, but a random one often works
                    'Origin': 'https://example.com',
                    // We ALSO have to set the User-Agent, which is why we need the proxy
                    'User-Agent': USER_AGENT
                }
            }); 

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${loc.name}`);
            }
            
            const data = await response.json(); // This proxy returns JSON directly
            
            const temp = data?.properties?.timeseries?.[0]?.data?.instant?.details?.air_temperature;

            const tempEl = document.getElementById(`temp-${loc.id}`);
            if (tempEl && typeof temp === 'number') {
                tempEl.textContent = `${temp.toFixed(1)}°`;
                logStatus(`✅ Vær oppdatert for ${loc.name}: ${temp.toFixed(1)}°`);
            } else {
                logStatus(`ℹ️ Kunne ikke parse temp for ${loc.name}.`);
            }

        } catch (error) {
            console.error('Weather fetch error:', error);
            logStatus(`❌ Vær-feil ${loc.name}: ${error.message}`);
            const tempEl = document.getElementById(`temp-${loc.name}`);
            if (tempEl) tempEl.textContent = 'Feil';
        }
    });
}

/**
 * Fetches and parses the NRK RSS feed.
 */
async function fetchNews() {
    logStatus('⏳ Henter NRK-nyheter (RSS)...');
    const proxyUrl = `${CORS_PROXY_PREFIX}${encodeURIComponent(NRK_RSS_URL)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlText = await response.text();
        
        // Parse the XML text
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const items = xmlDoc.querySelectorAll("item");
        
        if (items.length === 0) {
             // Check for common XML parse error
            const parseError = xmlDoc.querySelector("parsererror");
            if (parseError) {
                throw new Error(`XML Parsefeil: ${parseError.textContent}`);
            }
            throw new Error('Ingen <item> funnet i RSS feed.');
        }

        const headlines = [];
        items.forEach(item => {
            const title = item.querySelector("title")?.textContent;
            if (title) {
                // Fjerner CDATA-wrapper hvis den finnes
                headlines.push(title.replace("<![CDATA[", "").replace("]]>", "").trim());
            }
        });
        
        nrkHeadlines = headlines.slice(0, 10).filter(Boolean); // Get top 10 valid headlines

        if (nrkHeadlines.length > 0) {
            logStatus(`✅ Nyheter lastet (${nrkHeadlines.length} overskrifter)`);
            rotateNews(true); // 'true' to reset index
        } else {
            throw new Error('Ingen nyhetsoverskrifter funnet.');
        }

    } catch (error) {
        console.error('News fetch error:', error);
        logStatus(`❌ Nyhets-feil: ${error.message}`);
        const headlineEl = document.getElementById('nrk-headline');
        if (headlineEl) headlineEl.textContent = 'Kunne ikke laste nyheter.';
    }
}

/**
 * Rotates the news headline in the ticker.
 */
function rotateNews(reset = false) {
    if (nrkHeadlines.length === 0) return;
    
    if (reset) {
        currentNewsIndex = 0;
    }

    const headlineEl = document.getElementById('nrk-headline');
    if (headlineEl) {
        // Add a simple fade effect for transition
        headlineEl.style.opacity = 0;
        setTimeout(() => {
            // Check if headline exists before trying to show it
            if (nrkHeadlines[currentNewsIndex]) {
               headlineEl.textContent = nrkHeadlines[currentNewsIndex];
            }
            headlineEl.style.opacity = 1;
        }, 300); // 300ms fade
    }
    
    // Go to next headline
    currentNewsIndex = (currentNewsIndex + 1) % nrkHeadlines.length;
}

// --- Initial Load and Timers ---
document.addEventListener('DOMContentLoaded', () => {
    // Clear initial log
    const logBox = document.getElementById('log-box');
    if (logBox) logBox.innerHTML = '';
    
    // Run clock (from existing script)
    updateClocks();
    setInterval(updateClocks, 10000); // Oppdater klokke hvert 10. sek

    // Fetch data immediately on load
    updateWeather();
    fetchNews();

    // Set intervals to re-fetch data
    setInterval(updateWeather, 15 * 60 * 1000); // Vær: Hvert 15. min
    setInterval(fetchNews, 5 * 60 * 1000);   // Nyheter: Hvert 5. min
    
    // Set interval to rotate news
    setInterval(rotateNews, 10000); // Roter nyhet hver 10. sekund
});