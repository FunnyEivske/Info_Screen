import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCOcFfiRIw3sgU9eqEbwc1uc_Ur1aTOJXk",
    authDomain: "ferie-805e0.firebaseapp.com",
    projectId: "ferie-805e0",
    storageBucket: "ferie-805e0.firebasestorage.app",
    messagingSenderId: "621338557882",
    appId: "1:621338557882:web:9eae6887a484db316d7183",
    measurementId: "G-C8PT9DKJ3Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = 'holiday-tracker-main';

var currentLunchers = [];
try {
    const lunchCol = collection(db, 'artifacts', appId, 'public', 'data', 'lunch');
    onSnapshot(lunchCol, (snap) => {
        currentLunchers = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.active) {
                currentLunchers.push(data);
            }
        });
        checkTime();
    }, (error) => {
        console.warn("Firestore listener failed, but logic will continue:", error);
    });
} catch (e) {
    console.warn("Firebase setup failed, but aquarium will still start:", e);
}

// Variabel for å holde styr på auto-oppdatering
var simuleringsIntervall = null;

/**
 * Hovedfunksjon som sjekker tiden og oppdaterer skjermen.
 */
function checkTime() {
    var now = new Date(); // Dato-objekt (lokal tid for klienten)

    // --- START: PÅLITELIG TIDSSONE-LOGIKK (ES5-stil) ---
    var osloTimeStr = new Intl.DateTimeFormat('nb-NO', {
        timeZone: 'Europe/Oslo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(now);

    var osloDayStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Oslo',
        weekday: 'long'
    }).format(now);

    var hour = parseInt(osloTimeStr.substring(0, 2), 10);
    var minute = parseInt(osloTimeStr.substring(3, 5), 10);
    var timeString = osloTimeStr;

    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var dayOfWeek = days.indexOf(osloDayStr);
    // --- SLUTT: PÅLITELIG TIDSSONE-LOGIKK ---

    // Hent klokke-elementet og oppdater det
    var klokkeEl = document.getElementById('vakt-klokke');
    if (klokkeEl) {
        klokkeEl.innerHTML = timeString;
    }

    var messageOverlay = document.getElementById('message-overlay');
    var messageText = document.getElementById('message-text');
    var afterHoursScreen = document.getElementById('after-hours');
    var backgroundElement = document.getElementById('aquarium-canvas');

    var message = "";

    // --- Dynamisk lunsj-logikk fra Firestore ---
    var lunchNow = [];
    var lunchSoon = [];
    var nowMins = hour * 60 + minute;

    currentLunchers.forEach(function(l) {
        if (!l.startTime || !l.endTime) return;
        var sParts = l.startTime.split(':');
        var eParts = l.endTime.split(':');
        var startMins = parseInt(sParts[0]) * 60 + parseInt(sParts[1]);
        var endMins = parseInt(eParts[0]) * 60 + parseInt(eParts[1]);

        if (nowMins >= startMins && nowMins < endMins) {
            lunchNow.push(l.name);
        } else if (nowMins >= startMins - 15 && nowMins < startMins) {
            lunchSoon.push({ name: l.name, time: l.startTime });
        }
    });

    if (lunchNow.length > 0) {
        message = 'Det er lunsj!<br><small style="font-size: 0.6em">' + lunchNow.join(', ') + '</small>';
    } else if (lunchSoon.length > 0) {
        message = 'Lunsj nærmer seg!<br><small style="font-size: 0.6em">' + lunchSoon.map(s => s.name + " (" + s.time + ")").join(', ') + '</small>';
    }
    
    // Spesial-meldinger
    if (hour === 8 && minute >= 0 && minute < 5) {
        message = "Velkommen tilbake!";
    }
    else if (hour === 15 && minute >= 30) {
        message = "På tide å dra hjem!";
    }

    // --- Logikk for visning ---
    if (hour >= 16 || hour < 8) { // Etter stengetid
        afterHoursScreen.style.display = 'flex';
        if (backgroundElement) backgroundElement.style.opacity = '0';
        messageOverlay.classList.remove('visible');
        if (klokkeEl) klokkeEl.style.display = 'none';
    }
    else { // I åpningstiden
        afterHoursScreen.style.display = 'none';
        if (backgroundElement) backgroundElement.style.opacity = '1';
        if (klokkeEl) klokkeEl.style.display = 'block';

        if (message) {
            messageText.innerHTML = message;
            messageOverlay.classList.add('visible');
        } else {
            messageOverlay.classList.remove('visible');
        }
    }
}

/**
 * Starter den automatiske oppdateringen av klokken.
 */
function startAutoOppdatering() {
    clearInterval(simuleringsIntervall);
    checkTime(); // Kjør med ekte tid umiddelbart
    simuleringsIntervall = setInterval(checkTime, 10000); // Sjekk hvert 10. sekund
}

// --- Weather Fetching Logic for Aquarium Effects ---
var CORS_PROXY_PREFIX = 'https://corsproxy.io/?';
var WEATHER_LAT = 58.334558; // Grimstad
var WEATHER_LON = 8.577132;

var currentTemp = 10; // Default warm
var currentSymbol = 'clearsky_day'; // Default

function fetchWeatherForAquarium() {
    var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + WEATHER_LAT + '&lon=' + WEATHER_LON;
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

                currentTemp = Math.round(current.air_temperature);
                currentSymbol = next1h;
                console.log('Aquarium Weather Updated: ' + currentTemp + '°C, ' + currentSymbol);
            } catch (e) {
                console.error('Weather parse error:', e);
            }
        }
    };
    xhr.send();
}

// --- Initial Load og Timere ---
document.addEventListener('DOMContentLoaded', function () {
    startAutoOppdatering();
    fetchWeatherForAquarium();
    setInterval(fetchWeatherForAquarium, 15 * 60 * 1000); // 15 min update

    if (document.getElementById('aquarium-canvas')) {
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        initAquarium();

        setInterval(animateAquarium, 16);
    } else {
        console.error("Fant ikke 'aquarium-canvas' ved DOMContentLoaded.");
    }
});


/* --- DEL 2: Akvarium-logikk med Væreffekter (Nord Theme) --- */
var canvas = null;
var ctx = null;

// Entiteter
var fishTank = [];
var fishColors = ['#00E5FF', '#FF1744', '#00E676', '#2979FF', '#FFD600', '#F50057', '#D500F9', '#651FFF']; // Neon Pop Colors
var bubbleTank = [];
var precipitationTank = []; // Snø/Regn
var cloudTank = []; // Skyer

// Konfigurasjon
var fishCount = 15;
var bubbleCount = 20;
var waterLevelY = 0; // Settes i resize

// Vær-tilstand (styres av fetchWeatherForAquarium)
var iceThickness = 0; // Vokser hvis minusgrader
var snowAccumulation = 0; // Vokser hvis snø

function resizeCanvas() {
    var localCanvas = document.getElementById('aquarium-canvas');
    if (localCanvas) {
        localCanvas.width = window.innerWidth;
        localCanvas.height = window.innerHeight;

        // Vannet starter litt nedpå skjermen for å gi plass til "himmel"
        waterLevelY = window.innerHeight * 0.25;

        if (!canvas) {
            canvas = localCanvas;
        }
    }
}

// --- Klasser ---

function Fish() {
    this.reset();
}

Fish.prototype.reset = function () {
    if (!canvas) return;
    this.size = (Math.random() * 20) + 10; // Større fisk
    this.x = Math.random() * canvas.width;
    // Fisk svømmer kun i vannet (under waterLevelY)
    this.y = waterLevelY + 50 + Math.random() * (canvas.height - waterLevelY - 100);
    this.speed = (Math.random() * 1.5) + 0.5;
    this.dx = (Math.random() > 0.5 ? 1 : -1) * this.speed;
    this.dy = (Math.random() * 0.5 - 0.25) * this.speed;
    this.color = fishColors[Math.floor(Math.random() * fishColors.length)];
}

Fish.prototype.draw = function () {
    if (!ctx) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.dx < 0) ctx.scale(-1, 1);

    ctx.fillStyle = this.color;
    var halfHeight = this.size / 2;

    // Tegn fisk
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.quadraticCurveTo(this.size * 0.5, -halfHeight * 1.5, 0, -halfHeight);
    ctx.lineTo(-this.size, -halfHeight * 0.5);
    ctx.lineTo(-this.size, halfHeight * 0.5);
    ctx.lineTo(0, halfHeight);
    ctx.quadraticCurveTo(this.size * 0.5, halfHeight * 1.5, this.size, 0);
    ctx.fill();

    // Øye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.size * 0.7, -halfHeight * 0.2, this.size * 0.15, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(this.size * 0.7, -halfHeight * 0.2, this.size * 0.08, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
}

Fish.prototype.update = function () {
    if (!canvas) return;
    this.x += this.dx;
    this.y += this.dy;

    // Snu ved kantene
    var m = 50;
    if (this.x < -m || this.x > canvas.width + m) {
        this.dx = -this.dx;
        this.x += this.dx; // Dytt inn
    }

    // Hold fisken i vannet (under is/vannflate)
    var topLimit = waterLevelY + iceThickness + this.size;
    var bottomLimit = canvas.height - this.size;

    if (this.y < topLimit) {
        this.y = topLimit;
        this.dy = Math.abs(this.dy);
    }
    if (this.y > bottomLimit) {
        this.y = bottomLimit;
        this.dy = -Math.abs(this.dy);
    }

    if (Math.random() < 0.01) {
        this.dy = (Math.random() * 0.5 - 0.25) * this.speed;
    }
}

function Bubble() {
    this.reset();
}

Bubble.prototype.reset = function () {
    if (!canvas) return;
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + Math.random() * 50;
    this.size = (Math.random() * 3) + 1;
    this.speed = (Math.random() * 1) + 0.5;
}

Bubble.prototype.update = function () {
    this.y -= this.speed;
    // Hvis boblen treffer isen, stopper den/forsvinner
    if (this.y < waterLevelY + iceThickness) {
        this.reset();
    }
}

Bubble.prototype.draw = function () {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(236, 239, 244, 0.3)'; // Nord Snow Storm
    ctx.fill();
}

// Nedbør (Snø/Regn)
function Precipitation(type) {
    this.type = type; // 'snow' or 'rain'
    this.reset();
}

Precipitation.prototype.reset = function () {
    if (!canvas) return;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * -waterLevelY; // Start over vannet
    this.size = this.type === 'snow' ? (Math.random() * 3 + 2) : (Math.random() * 1 + 1);
    this.speed = this.type === 'snow' ? (Math.random() * 1 + 0.5) : (Math.random() * 5 + 5);
}

Precipitation.prototype.update = function () {
    this.y += this.speed;

    // Når den treffer overflaten
    if (this.y > waterLevelY - (this.type === 'snow' ? snowAccumulation : 0)) {
        // Hvis regn, lag krusning? (Forenklet: reset)
        // Hvis snø, bidra til snøhaug?
        this.reset();
    }
}

Precipitation.prototype.draw = function () {
    if (!ctx) return;
    ctx.fillStyle = this.type === 'snow' ? '#ECEFF4' : '#81A1C1';
    ctx.beginPath();
    if (this.type === 'snow') {
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    } else {
        ctx.fillRect(this.x, this.y, 1, this.size * 3); // Regndråpe
    }
    ctx.fill();
}

// --- Hovedfunksjoner ---

function initAquarium() {
    if (!canvas) {
        canvas = document.getElementById('aquarium-canvas');
    }
    if (canvas) {
        ctx = canvas.getContext('2d');
        // Init Fisk
        for (var i = 0; i < fishCount; i++) fishTank.push(new Fish());
        // Init Bobler
        for (var i = 0; i < bubbleCount; i++) bubbleTank.push(new Bubble());
    }
}

function updateSimulationLogic() {
    // Juster istykkelse basert på temperatur
    if (currentTemp <= 0) {
        if (iceThickness < 40) iceThickness += 0.05; // Isen vokser sakte
    } else {
        if (iceThickness > 0) iceThickness -= 0.1; // Isen smelter
    }

    // Juster nedbør (legg til/fjern partikler)
    var isRaining = currentSymbol && currentSymbol.indexOf('rain') !== -1;
    var isSnowing = currentSymbol && (currentSymbol.indexOf('snow') !== -1 || currentSymbol.indexOf('sleet') !== -1);

    // Snøakkumulering (visuell hack)
    if (isSnowing && currentTemp <= 0) {
        if (snowAccumulation < 20) snowAccumulation += 0.02;
    } else {
        if (snowAccumulation > 0) snowAccumulation -= 0.05;
    }

    // Håndter partikkelsystem
    var targetPrecipitation = 0;
    var type = null;

    if (isSnowing) { targetPrecipitation = 50; type = 'snow'; }
    else if (isRaining) { targetPrecipitation = 100; type = 'rain'; }

    // Legg til partikler hvis vi trenger
    if (precipitationTank.length < targetPrecipitation) {
        precipitationTank.push(new Precipitation(type));
    } else if (precipitationTank.length > targetPrecipitation) {
        precipitationTank.pop();
    }

    // Oppdater type hvis endret
    if (precipitationTank.length > 0 && precipitationTank[0].type !== type) {
        precipitationTank = []; // Tøm og bytt
    }
}

function animateAquarium() {
    if (!ctx || !canvas) return;

    updateSimulationLogic();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Tegn Himmel (Bakgrunn for toppdel)
    var skyGrad = ctx.createLinearGradient(0, 0, 0, waterLevelY);
    skyGrad.addColorStop(0, '#2E3440'); // Natt
    skyGrad.addColorStop(1, '#4C566A'); // Horisont
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, waterLevelY);

    // 2. Tegn Værinfo i himmelen (Tekst)
    ctx.fillStyle = '#ECEFF4';
    ctx.font = '24px Inter';
    ctx.textAlign = 'center';
    var weatherText = Math.round(currentTemp) + "°C";
    if (currentSymbol) weatherText += " | " + currentSymbol;
    ctx.fillText(weatherText, canvas.width / 2, waterLevelY / 2);

    // 3. Tegn Nedbør (bak vann/is)
    for (var i = 0; i < precipitationTank.length; i++) {
        precipitationTank[i].update();
        precipitationTank[i].draw();
    }

    // 4. Tegn Vann (Resten av skjermen)
    var waterGrad = ctx.createLinearGradient(0, waterLevelY, 0, canvas.height);
    waterGrad.addColorStop(0, '#3B4252'); // Overflate mørk
    waterGrad.addColorStop(1, '#2E3440'); // Dypet
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterLevelY, canvas.width, canvas.height - waterLevelY);

    // 5. Tegn Is (hvis tykkelse > 0)
    if (iceThickness > 0) {
        ctx.fillStyle = 'rgba(236, 239, 244, 0.8)'; // Halvgjennomsiktig is
        ctx.fillRect(0, waterLevelY, canvas.width, iceThickness);

        // Iskant
        ctx.fillStyle = '#ECEFF4';
        ctx.fillRect(0, waterLevelY, canvas.width, 5); // Topp skorpe
    }

    // 6. Tegn Snø på isen (hvis akkumulert)
    if (snowAccumulation > 0) {
        ctx.fillStyle = '#ECEFF4';
        // Tegn en "haug" eller bare et lag
        ctx.beginPath();
        ctx.moveTo(0, waterLevelY);
        // Bølgete snø
        for (var x = 0; x <= canvas.width; x += 50) {
            ctx.lineTo(x, waterLevelY - snowAccumulation - (Math.sin(x / 100) * 5));
        }
        ctx.lineTo(canvas.width, waterLevelY);
        ctx.fill();
    }

    // 7. Tegn Bobler
    for (var i = 0; i < bubbleTank.length; i++) {
        bubbleTank[i].update();
        bubbleTank[i].draw();
    }

    // 8. Tegn Fisk
    for (var i = 0; i < fishTank.length; i++) {
        fishTank[i].update();
        fishTank[i].draw();
    }

    // 9. Vannoverflate-linje (hvis ingen is)
    if (iceThickness <= 0) {
        ctx.beginPath();
        ctx.moveTo(0, waterLevelY);
        ctx.lineTo(canvas.width, waterLevelY);
        ctx.strokeStyle = '#81A1C1'; // Frost Blue
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}