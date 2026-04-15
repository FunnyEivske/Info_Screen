// --- JavaScript for Live Clock ---
function updateClocks() {
    // Get current time in HH:MM format (24-hour)
    var now = new Date();
    // Using Norwegian time formatting
    var options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' };
    var timeString = new Intl.DateTimeFormat('nb-NO', options).format(now);

    // Update main clock
    var clockEl = document.getElementById('clock-main');
    if (clockEl) {
        clockEl.textContent = timeString;
    }
}

// --- START: SCRIPT FOR LIVE WEATHER AND NEWS (ES5 Compatible) ---

// --- Constants ---
var USER_AGENT = 'Eivind-Dashboard/1.0 (github.com/Eivind_n.s)';
var LOCATIONS = [
    { id: 'grimstad', name: 'Grimstad', latitude: 58.33455833890616, longitude: 8.577132411967785 },
    { id: 'kristiansand', name: 'Kristiansand', latitude: 58.16329955371125, longitude: 8.00258786985478 },
    { id: 'arendal', name: 'Arendal', latitude: 58.46086657739493, longitude: 8.764345505384163 },
    { id: 'hovag', name: 'Høvåg', latitude: 58.522017, longitude: 8.351285 },
    { id: 'ravenna', name: 'Ravenna', latitude: 44.4178, longitude: 12.1979 }
];
var NRK_RSS_URL = 'https://www.nrk.no/nyheter/siste.rss';
var VG_RSS_URL = 'https://www.vg.no/rss/feed/?categories=1068&keywords=&limit=10&format=rss';
var ENTUR_GRAPHQL_URL = 'https://api.entur.io/journey-planner/v3/graphql';

// Bus Stops (NSR Quays) - Corrected for Universitetet (Grimstad)
var BUS_STOPS = [
    { ids: ['NSR:Quay:38117', 'NSR:Quay:40507'], elementId: 'bus-departures-1' }, // Mot Kristiansand (Grimstad platforms)
    { ids: ['NSR:Quay:38116', 'NSR:Quay:40506'], elementId: 'bus-departures-2' }  // Mot Arendal (Grimstad platforms)
];

// --- Global cache for news ---
var nrkHeadlines = [];
var currentNewsIndex = 0;
var vgHeadlines = [];
var currentVGIndex = 0;

/**
 * Logs a message to the status box on the page.
 * (Disabled visual logging as per user request, only console)
 */
function logStatus(msg) {
    console.log('[LOG]: ' + msg);
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

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

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

                    // Update weather icon
                    var iconEl = document.getElementById('icon-' + loc.id);
                    if (iconEl && next1h) {
                        // Met.no icons URL
                        iconEl.src = 'https://raw.githubusercontent.com/metno/weathericons/master/weather/svg/' + next1h + '.svg';
                        iconEl.style.display = 'inline-block';
                    }

                    // --- KUN OPPDATER EFFEKT HVIS VI IKKE DEBUGGER MANUELT ---
                    // (I praksis vil denne overskrive debug-valg når den kjører hvert 15. minutt)
                    if (index === 0) {
                        // updateWeatherEffects(next1h);
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
    logStatus('⏳ Henter NRK-nyheter...');
    var proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(NRK_RSS_URL);
    var headlineEl = document.getElementById('nrk-headline');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.status !== 'ok' || !data.items || data.items.length === 0) {
                    throw new Error('Ingen nyheter');
                }

                var headlines = [];
                data.items.forEach(function (item) {
                    if (item.title) {
                        headlines.push(item.title.trim());
                    }
                });

                nrkHeadlines = headlines.slice(0, 10).filter(Boolean);

                if (nrkHeadlines.length > 0) {
                    logStatus('✅ Nyheter lastet');
                    rotateNews(true);
                }

            } catch (e) {
                logStatus('❌ Nyheter feilet: ' + e.message);
                if (headlineEl) headlineEl.textContent = "Kunne ikke laste NRK nyheter";
            }
        } else {
             if (headlineEl) headlineEl.textContent = "Nettverksfeil for NRK";
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

function fetchVGNews() {
    logStatus('⏳ Henter VG-nyheter...');
    var proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(VG_RSS_URL);
    var headlineEl = document.getElementById('vg-headline');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.status !== 'ok' || !data.items || data.items.length === 0) {
                    throw new Error('Ingen nyheter');
                }

                var headlines = [];
                data.items.forEach(function (item) {
                    if (item.title) {
                        headlines.push(item.title.trim());
                    }
                });

                vgHeadlines = headlines.slice(0, 10).filter(Boolean);

                if (vgHeadlines.length > 0) {
                    logStatus('✅ VG lastet');
                    rotateVGNews(true);
                }
            } catch (e) {
                logStatus('❌ VG feilet: ' + e.message);
                if (headlineEl) headlineEl.textContent = "Kunne ikke laste VG nyheter";
            }
        } else {
             if (headlineEl) headlineEl.textContent = "Nettverksfeil for VG";
        }
    };
    xhr.send();
}

function rotateVGNews(reset) {
    if (vgHeadlines.length === 0) return;
    if (reset) currentVGIndex = 0;

    var headlineEl = document.getElementById('vg-headline');
    if (headlineEl) {
        headlineEl.style.opacity = 0;
        setTimeout(function () {
            if (vgHeadlines[currentVGIndex]) {
                headlineEl.textContent = vgHeadlines[currentVGIndex];
            }
            headlineEl.style.opacity = 1;
        }, 300);
    }
    currentVGIndex = (currentVGIndex + 1) % vgHeadlines.length;
}

/**
 * Fetches bus departures from Entur API.
 */
function fetchBusData() {
    BUS_STOPS.forEach(function (stop) {
        // Construct array string like ["NSR:Quay:123", "NSR:Quay:456"]
        var idsString = JSON.stringify(stop.ids);
        logStatus('🚌 Henter bussruter...');

        var query = '{ quays(ids: ' + idsString + ') { id estimatedCalls(numberOfDepartures: 20) { expectedArrivalTime realtime destinationDisplay { frontText } serviceJourney { line { publicCode } } } } }';

        var xhr = new XMLHttpRequest();
        xhr.open('POST', ENTUR_GRAPHQL_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('ET-Client-Name', USER_AGENT);

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    var data = response.data;

                    if (data && data.quays) {
                        // Merge calls from all quays
                        var allCalls = [];
                        data.quays.forEach(function (quay) {
                            if (quay && quay.estimatedCalls) {
                                allCalls = allCalls.concat(quay.estimatedCalls);
                            }
                        });

                        // Sort by arrival time
                        allCalls.sort(function (a, b) {
                            return new Date(a.expectedArrivalTime) - new Date(b.expectedArrivalTime);
                        });

                        // Slice top 14
                        var nextCalls = allCalls.slice(0, 14);

                        renderBusDepartures(stop.elementId, nextCalls);
                        logStatus('✅ Bussruter lastet (' + nextCalls.length + ')');
                    } else {
                        console.error('Bus data missing structure:', response);
                        throw new Error('No quays found');
                    }
                } catch (e) {
                    console.error('Bus parse error:', e);
                    logStatus('❌ Buss-feil: Parse error');
                }
            } else {
                logStatus('❌ Buss-feil: ' + xhr.status);
            }
        };

        xhr.onerror = function () {
            logStatus('❌ Buss-feil: Nettverk');
        };

        xhr.send(JSON.stringify({ query: query }));
    });
}

function renderBusDepartures(elementId, calls) {
    var container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = ''; // Clear loading/old content

    if (calls.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#9ca3af;">Ingen avganger funnet.</p>';
        return;
    }

    calls.forEach(function (call) {
        var lineCode = call.serviceJourney.line.publicCode;
        var destination = call.destinationDisplay.frontText;
        var arrivalTime = new Date(call.expectedArrivalTime);
        var isRealtime = call.realtime;

        // Calculate time diff
        var now = new Date();
        var diffMs = arrivalTime - now;
        var diffMins = Math.floor(diffMs / 60000);

        var timeDisplay = '';
        if (diffMins <= 0) {
            timeDisplay = 'Nå';
        } else if (diffMins < 15) {
            timeDisplay = diffMins + ' min';
        } else {
            var hours = arrivalTime.getHours().toString().padStart(2, '0');
            var minutes = arrivalTime.getMinutes().toString().padStart(2, '0');
            timeDisplay = hours + ':' + minutes;
        }

        // HTML Structure
        var item = document.createElement('div');
        item.className = 'bus-item';

        var lineBox = document.createElement('div');
        lineBox.className = 'bus-line';
        lineBox.textContent = lineCode;

        var destBox = document.createElement('div');
        destBox.className = 'bus-dest';
        destBox.textContent = destination;

        var timeBox = document.createElement('div');
        timeBox.className = 'bus-time' + (isRealtime ? ' realtime' : '');
        timeBox.textContent = timeDisplay;

        item.appendChild(lineBox);
        item.appendChild(destBox);
        item.appendChild(timeBox);
        container.appendChild(item);
    });
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
    fetchVGNews();
    fetchBusData(); // Initial bus fetch

    setInterval(updateWeather, 15 * 60 * 1000); // 15 min
    setInterval(fetchNews, 5 * 60 * 1000); // 5 min NRK
    setInterval(fetchVGNews, 5 * 60 * 1000); // 5 min VG
    setInterval(fetchBusData, 60 * 1000); // 1 min (Bus data update)

    setInterval(rotateNews, 10000);
    setInterval(rotateVGNews, 10000);
});