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
    // Add new log to the top
    logBox.prepend(newLogEntry);
    // Keep log box clean
    while (logBox.children.length > 10) {
        logBox.removeChild(logBox.lastChild);
    }
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

    // Reset classes
    overlay.className = '';

    // Map symbol codes to classes
    // See https://api.met.no/weatherapi/weathericon/2.0/documentation
    if (!symbolCode) {
        console.warn('⚠️ Ingen symbolkode mottatt for væreffekt.');
        return;
    }

    if (symbolCode.indexOf('sun') !== -1 || symbolCode === 'clearsky_day' || symbolCode === 'fair_day') {
        overlay.classList.add('weather-sun');
    } else if (symbolCode.indexOf('rain') !== -1 || symbolCode.indexOf('sleet') !== -1) {
        overlay.classList.add('weather-rain');
    } else if (symbolCode.indexOf('snow') !== -1) {
        overlay.classList.add('weather-snow');
    } else if (symbolCode.indexOf('fog') !== -1) {
        overlay.classList.add('weather-fog');
    } else if (symbolCode.indexOf('cloud') !== -1 || symbolCode === 'partlycloudy_day' || symbolCode === 'partlycloudy_night') {
        overlay.classList.add('weather-cloud');
    } else {
        console.log('ℹ️ Ingen spesifikk effekt for symbol:', symbolCode);
    }

    // Make it visible
    overlay.style.opacity = 1;
    logStatus('🎨 Væreffekt satt til: ' + symbolCode);
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
        // Add User-Agent to be polite to Met.no
        // xhr.setRequestHeader('User-Agent', USER_AGENT); 

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var timeseries = data.properties.timeseries;
                    var current = timeseries[0].data.instant.details;
                    var next1h = timeseries[0].data.next_1_hours.summary.symbol_code;

                    // Update temperature
                    var tempEl = document.getElementById('temp-' + loc.id);
                    if (tempEl) {
                        var temp = Math.round(current.air_temperature);
                        tempEl.textContent = temp + '°';

                        // Apply color based on temperature
                        if (temp <= 0) {
                            tempEl.classList.add('weather-temp-cold');
                        } else {
                            tempEl.classList.remove('weather-temp-cold');
                        }
                    }

                    // Update effects only for the first location (Grimstad)
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

/**
 * Fetches and parses the NRK RSS feed using XHR
 */
function fetchNews() {
    logStatus('⏳ Henter NRK-nyheter (RSS)...');
    var proxyUrl = CORS_PROXY_PREFIX + encodeURIComponent(NRK_RSS_URL);
    var headlineEl = document.getElementById('nrk-headline'); // Get element early

    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var xmlText = xhr.responseText;
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xmlText, "text/xml");

                var items = xmlDoc.querySelectorAll("item");

                if (items.length === 0) {
                    var parseError = xmlDoc.querySelector("parsererror");
                    if (parseError) {
                        throw new Error('XML Parsefeil');
                    }
                    throw new Error('Ingen <item> funnet i RSS feed.');
                }

                var headlines = [];
                items.forEach(function (item) {
                    // Manual, safe check (replacement for '?.')
                    var titleEl = item.querySelector("title");
                    var title = null;
                    if (titleEl) {
                        title = titleEl.textContent;
                    }

                    if (title) {
                        headlines.push(title.replace("<![CDATA[", "").replace("]]>", "").trim());
                    }
                });

                // .filter(Boolean) is ES5.1, should be fine.
                nrkHeadlines = headlines.slice(0, 10).filter(Boolean);

                if (nrkHeadlines.length > 0) {
                    logStatus('✅ Nyheter lastet (' + nrkHeadlines.length + ' overskrifter)');
                    rotateNews(true); // 'true' to reset index
                } else {
                    throw new Error('Ingen nyhetsoverskrifter funnet.');
                }

            } catch (e) {
                logStatus('❌ Parse-feil Nyheter: ' + e.message);
                if (headlineEl) headlineEl.textContent = 'Kunne ikke laste nyheter.';
            }
        } else {
            logStatus('❌ Nyhets-feil: HTTP ' + xhr.status);
            if (headlineEl) headlineEl.textContent = 'Kunne ikke laste nyheter.';
        }
    };

    xhr.onerror = function () {
        logStatus('❌ Nyhets-feil: Nettverksfeil');
        if (headlineEl) headlineEl.textContent = 'Kunne ikke laste nyheter.';
    };

    xhr.send();
}

/**
 * Rotates the news headline in the ticker.
 */
function rotateNews(reset) {
    if (nrkHeadlines.length === 0) return;

    if (reset) {
        currentNewsIndex = 0;
    }

    var headlineEl = document.getElementById('nrk-headline');
    if (headlineEl) {
        // Add a simple fade effect for transition
        headlineEl.style.opacity = 0;
        setTimeout(function () {
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
document.addEventListener('DOMContentLoaded', function () {
    // Clear initial log
    var logBox = document.getElementById('log-box');
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