// --- JavaScript for Live Clock ---
function updateClocks() {
    // Get current time in HH:MM format (24-hour)
    var now = new Date();
    // Using Norwegian time formatting
    var options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' };
    var timeString = new Intl.DateTimeFormat('nb-NO', options).format(now);

    // Update clock elements
    var clock1 = document.getElementById('clock-1');
    var clock2 = document.getElementById('clock-2');

    if (clock1) {
        clock1.textContent = timeString;
    }
    if (clock2) {
        clock2.textContent = timeString;
    }
}

// --- START: SCRIPT FOR LIVE WEATHER AND NEWS (ES5 Compatible) ---

// --- Constants ---
var USER_AGENT = 'Eivind-Dashboard/1.0 (github.com/Eivind_n.s)';
var LOCATIONS = [
    { id: 'grimstad', name: 'Grimstad', latitude: 58.33455833890616, longitude: 8.577132411967785 },
    { id: 'kristiansand', name: 'Kristiansand', latitude: 58.16329955371125, longitude: 8.00258786985478 },
    { id: 'arendal', name: 'Arendal', latitude: 58.46086657739493, longitude: 8.764345505384163 },
    { id: 'hovag', name: 'Høvåg', latitude: 58.403478, longitude: 8.283623 }
];
var NRK_RSS_URL = 'https://www.nrk.no/nyheter/siste.rss';
var CORS_PROXY_PREFIX = 'https://corsproxy.io/?';

// --- Global cache for news ---
var nrkHeadlines = [];
var currentNewsIndex = 0;

/**
 * Logs a message to the status box on the page.
 */
function logStatus(msg) {
    var logBox = document.getElementById('log-box');
    if (!logBox) return;
    var time = new Date().toLocaleTimeString('nb-NO');
    var newLogEntry = document.createElement('p');
    newLogEntry.textContent = '[' + time + '] - ' + msg;
    logBox.prepend(newLogEntry);
    while (logBox.children.length > 10) {
        logBox.removeChild(logBox.lastChild);
    }
}

/**
 * DEBUG MODE: Creates buttons to manually toggle weather
 */
function initDebugMode() {
    // Sjekk om debug-panel allerede finnes
    if (document.getElementById('weather-debug-panel')) return;

    var debugDiv = document.createElement('div');
    debugDiv.id = 'weather-debug-panel';
    debugDiv.innerHTML = '<h4>Debug Vær</h4>' +
        '<button onclick="updateWeatherEffects(\'clearsky\')">☀️ Sol</button>' +
        '<button onclick="updateWeatherEffects(\'snow\')">❄️ Snø</button>' +
        '<button onclick="updateWeatherEffects(\'fog\')">🌫️ Tåke</button>' +
        '<button onclick="updateWeatherEffects(\'rain\')">🌧️ Regn</button>' +
        '<button onclick="updateWeatherEffects(\'cloud\')">☁️ Skyet</button>' +
        '<button onclick="updateWeatherEffects(\'\')">❌ Nullstill</button>';

    document.body.appendChild(debugDiv);

    // Toggle visning med 'X' tast
    document.addEventListener('keydown', function (e) {
        if (e.key.toLowerCase() === 'x') {
            // Hvis den er tom (fra CSS) eller 'none' -> sett til 'block', ellers 'none'
            var currentDisplay = window.getComputedStyle(debugDiv).display;
            if (currentDisplay === 'none') {
                debugDiv.style.display = 'block';
            } else {
                debugDiv.style.display = 'none';
            }
        }
    });

    console.log('🔧 Debug panel lastet. Trykk "X" for å vise/skjule.');
}

/**
 * Updates the background weather effect based on the symbol code.
 */
function updateWeatherEffects(symbolCode) {
    console.log('🎨 Oppdaterer væreffekt for symbol:', symbolCode);
    var overlay = document.getElementById('weather-overlay');
    if (!overlay) {
        console.error('❌ Fant ikke #weather-overlay elementet!');
        return;
    }

    // Nullstill klasser
    overlay.className = '';

    if (!symbolCode) {
        console.warn('⚠️ Ingen symbolkode (eller nullstilling).');
        overlay.style.opacity = 0; // Skjul overlay hvis nullstilt
        return;
    }

    // --- LOGIKK FOR Å VELGE EFFEKT ---
    if (symbolCode.indexOf('clearsky') !== -1 || symbolCode.indexOf('fair') !== -1 || symbolCode.indexOf('sun') !== -1) {
        overlay.classList.add('weather-sun');
        logStatus('Debug: Sol valgt');
    }
    else if (symbolCode.indexOf('snow') !== -1 || symbolCode.indexOf('sleet') !== -1) {
        overlay.classList.add('weather-snow');
        logStatus('Debug: Snø valgt');
    }
    else if (symbolCode.indexOf('fog') !== -1) {
        overlay.classList.add('weather-fog');
        logStatus('Debug: Tåke valgt');
    }
    else if (symbolCode.indexOf('rain') !== -1) {
        overlay.classList.add('weather-rain');
        logStatus('Debug: Regn valgt');
    }
    else if (symbolCode.indexOf('cloud') !== -1 || symbolCode.indexOf('partlycloudy') !== -1) {
        // ENDRET: Ingen effekt når det er skyet (kun logg)
        logStatus('Debug: Skyet valgt (Ingen overlay)');
    }
    else {
        console.log('ℹ️ Ukjent symbol, ingen effekt:', symbolCode);
    }

    // Gjør effekten synlig
    overlay.style.opacity = 1;
}

/**
 * Fetches weather data for all locations.
 */
function updateWeather() {
    logStatus('🌤️ Henter værdata...');

    LOCATIONS.forEach(function (loc, index) {
        var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + loc.latitude + '&lon=' + loc.longitude;
        var proxyUrl = CORS_PROXY_PREFIX + encodeURIComponent(url);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', proxyUrl, true);

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var timeseries = data.properties.timeseries;
                    var current = timeseries[0].data.instant.details;
                    var next1h = timeseries[0].data.next_1_hours.summary.symbol_code;

                    // Update temperature text
                    var tempEl = document.getElementById('temp-' + loc.id);
                    if (tempEl) {
                        var temp = Math.round(current.air_temperature);
                        tempEl.textContent = temp + '°';

                        if (temp <= 0) {
                            tempEl.classList.add('weather-temp-cold');
                        } else {
                            tempEl.classList.remove('weather-temp-cold');
                        }
                    }

                    // --- KUN OPPDATER EFFEKT HVIS VI IKKE DEBUGGER MANUELT ---
                    // (I praksis vil denne overskrive debug-valg når den kjører hvert 15. minutt)
                    if (index === 0) {
                        updateWeatherEffects(next1h);
                    }

                } catch (e) {
                    console.error('Weather parse error:', e);
                    logStatus('❌ Vær-feil (' + loc.name + '): Parse error');
                }
            } else {
                logStatus('❌ Vær-feil (' + loc.name + '): ' + xhr.status);
            }
        };

        xhr.onerror = function () {
            logStatus('❌ Vær-feil (' + loc.name + '): Nettverksfeil');
        };

        xhr.send();
    });
}

function fetchNews() {
    logStatus('⏳ Henter NRK-nyheter (RSS)...');
    var proxyUrl = CORS_PROXY_PREFIX + encodeURIComponent(NRK_RSS_URL);
    var headlineEl = document.getElementById('nrk-headline');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var xmlText = xhr.responseText;
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xmlText, "text/xml");
                var items = xmlDoc.querySelectorAll("item");

                if (items.length === 0) throw new Error('Ingen nyheter');

                var headlines = [];
                items.forEach(function (item) {
                    var titleEl = item.querySelector("title");
                    if (titleEl) {
                        headlines.push(titleEl.textContent.replace("<![CDATA[", "").replace("]]>", "").trim());
                    }
                });

                nrkHeadlines = headlines.slice(0, 10).filter(Boolean);

                if (nrkHeadlines.length > 0) {
                    logStatus('✅ Nyheter lastet');
                    rotateNews(true);
                }

            } catch (e) {
                logStatus('❌ Nyheter feilet: ' + e.message);
            }
        }
    };
    xhr.send();
}

function rotateNews(reset) {
    if (nrkHeadlines.length === 0) return;
    if (reset) currentNewsIndex = 0;

    var headlineEl = document.getElementById('nrk-headline');
    if (headlineEl) {
        headlineEl.style.opacity = 0;
        setTimeout(function () {
            if (nrkHeadlines[currentNewsIndex]) {
                headlineEl.textContent = nrkHeadlines[currentNewsIndex];
            }
            headlineEl.style.opacity = 1;
        }, 300);
    }
    currentNewsIndex = (currentNewsIndex + 1) % nrkHeadlines.length;
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', function () {
    var logBox = document.getElementById('log-box');
    if (logBox) logBox.innerHTML = '';

    updateClocks();
    setInterval(updateClocks, 10000);

    // Last debug panel
    initDebugMode();

    updateWeather();
    fetchNews();

    setInterval(updateWeather, 15 * 60 * 1000);
    setInterval(fetchNews, 5 * 60 * 1000);
    setInterval(rotateNews, 10000);
});