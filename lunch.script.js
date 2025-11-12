/* --- Skript for lunch.html --- */
/* ENDRET: Bruker 'var' for eldre kompatibilitet */

// Datastruktur for lunsjplan
var lunchSchedule = {
    1: { // Mandag
        "10:30": "Mariann",
        "11:00": "Mathilde, Jonny, Olai",
        "11:30": "AC, Audun"
    },
    2: { // Tirsdag
        "10:30": "Mariann",
        "11:00": "Jonny, Audun",
        "11:30": "AC, Mathilde, Olai"
    },
    3: { // Onsdag
        "10:30": "Mariann",
        "11:00": "AC, Mathilde, Audun",
        "11:30": "Jonny, Olai"
    },
    4: { // Torsdag
        "10:30": "Mariann",
        "11:00": "Jonny, Olai",
        "11:30": "AC, Audun, Mathilde"
    },
    5: { // Fredag
        "10:30": "Mariann",
        "11:00": "Mathilde, Jonny, Audun",
        "11:30": "AC, Olai"
    },
    0: { "10:30": "-", "11:00": "-", "11:30": "-" }, // Søndag
    6: { "10:30": "-", "11:00": "-", "11:30": "-" }  // Lørdag
};

// Variabel for å holde styr på auto-oppdatering
var simuleringsIntervall = null;

/**
 * Hovedfunksjon som sjekker tiden og oppdaterer skjermen.
 * ENDRET: Kjører nå kun på ekte tid.
 */
function checkTime() {
    var now = new Date();
    
    // Bruker kun ekte tid
    var hour = now.getHours();
    var minute = now.getMinutes();
    var dayOfWeek = now.getDay(); 

    // Hent DOM-elementer
    var messageOverlay = document.getElementById('message-overlay');
    var messageText = document.getElementById('message-text');
    var afterHoursScreen = document.getElementById('after-hours');
    // ENDRING: Byttet ID fra 'video-background' til 'aquarium-canvas'
    var backgroundElement = document.getElementById('aquarium-canvas');

    var todaySchedule = lunchSchedule[dayOfWeek] || lunchSchedule[0]; 
    var message = ""; 

    // --- Logikk for meldinger ---
    if (hour === 8 && minute >= 0 && minute < 5) {
        message = "Velkommen tilbake!";
    }
    else if (hour === 11 && minute >= 15 && minute < 30) {
         message = 'Lunsj nærmer seg! (11:30)<br><small style="font-size: 0.6em">' + todaySchedule['11:30'] + '</small>';
    }
    else if (hour === 11 && minute >= 30) {
        message = 'Det er lunsj! (11:30)<br><small style="font-size: 0.6em">' + todaySchedule['11:30'] + '</small>';
    }
    else if (hour === 10 && minute >= 45) {
         message = 'Lunsj nærmer seg! (11:00)<br><small style="font-size: 0.6em">' + todaySchedule['11:00'] + '</small>';
    }
    else if (hour === 11 && minute < 15) { // 11:00 - 11:14
        message = 'Det er lunsj! (11:00)<br><small style="font-size: 0.6em">' + todaySchedule['11:00'] + '</small>';
    }
    else if (hour === 10 && minute >= 15 && minute < 30) {
        message = 'Lunsj nærmer seg! (10:30)<br><small style="font-size: 0.6em">' + todaySchedule['10:30'] + '</small>';
    }
    else if (hour === 10 && minute >= 30 && minute < 45) { // 10:30 - 10:44
        message = 'Det er lunsj! (10:30)<br><small style="font-size: 0.6em">' + todaySchedule['10:30'] + '</small>';
    }
    else if (hour === 15 && minute >= 30) {
        message = "På tide å dra hjem!";
    }

    // --- Logikk for visning ---
    if (hour >= 16 || hour < 8) {
        afterHoursScreen.style.display = 'flex';
        // ENDRING: Bruker nå backgroundElement
        if (backgroundElement) backgroundElement.style.opacity = '0';
        messageOverlay.classList.remove('visible'); 
    } 
    else {
        afterHoursScreen.style.display = 'none';
        // ENDRING: Bruker nå backgroundElement
         if (backgroundElement) backgroundElement.style.opacity = '1';

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
    clearInterval(simuleringsIntervall); // Stopp eventuell gammel timer
    checkTime(); // Kjør med ekte tid umiddelbart
    simuleringsIntervall = setInterval(checkTime, 10000); // Start ny timer
}

// --- Initial Load og Timere ---

// NY DOMContentLoaded som starter begge deler
document.addEventListener('DOMContentLoaded', function() {
    // Start den opprinnelige logikken
    startAutoOppdatering();

    // Start den nye akvarium-logikken
    if (document.getElementById('aquarium-canvas')) {
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Sett størrelse umiddelbart
        initAquarium();
        
        // ENDRING: Byttet fra requestAnimationFrame til setInterval
        // 16ms = ca 60fps. TV-en vil kanskje kjøre saktere, men dette er mer kompatibelt.
        setInterval(animateAquarium, 16); 
    } else {
        console.error("Fant ikke 'aquarium-canvas' ved DOMContentLoaded.");
    }
});


/* --- DEL 2: NY Akvarium-logikk (ES5-kompatibel) --- */

var canvas = null; // Initialiseres i initAquarium
var ctx = null; // Initialiseres i initAquarium
var fishTank = [];
var fishCount = 20; // Antall fisker
var fishColors = ['#FF4136', '#FF851B', '#2ECC40', '#0074D9', '#B10DC9'];

var bubbleTank = [];
var bubbleCount = 30;

// Sørg for at canvas fyller skjermen
function resizeCanvas() {
    var localCanvas = document.getElementById('aquarium-canvas');
    if (localCanvas) {
        localCanvas.width = window.innerWidth;
        localCanvas.height = window.innerHeight;
        
        if (!canvas) {
            canvas = localCanvas;
        }
    }
}

// NY: Klasse for bobler (ES5-stil)
function Bubble() {
    this.x = Math.random() * (canvas ? canvas.width : window.innerWidth);
    this.y = (Math.random() * (canvas ? canvas.height : window.innerHeight)) + (canvas ? canvas.height : window.innerHeight); // Start på bunnen
    this.size = (Math.random() * 4) + 2; // Størrelse 2-6
    this.dy = (Math.random() * 1.5) + 0.5; // Hastighet 0.5 - 2
}

Bubble.prototype.draw = function() {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

Bubble.prototype.update = function() {
    if (!canvas) return;
    this.y -= this.dy; // Beveger seg oppover
    
    // Reset hvis boblen går ut av toppen
    if (this.y < -this.size) {
        this.y = canvas.height + this.size;
        this.x = Math.random() * canvas.width;
    }
}

// Klasse for hver fisk (ES5-stil)
function Fish() {
    this.x = Math.random() * (canvas ? canvas.width : window.innerWidth);
    this.y = Math.random() * (canvas ? canvas.height : window.innerHeight);
    this.size = (Math.random() * 5) + 8; // Halv lengde 8-13
    this.speed = (Math.random() * 1) + 0.5; // Hastighet 0.5 - 1.5
    this.dx = (Math.random() > 0.5 ? 1 : -1) * this.speed;
    this.dy = (Math.random() * 0.5 - 0.25) * this.speed;
    this.color = fishColors[Math.floor(Math.random() * fishColors.length)];
}

// Tegnemetode for fisk (ES5-stil)
Fish.prototype.draw = function() {
    if (!ctx) return;
    
    ctx.save();
    ctx.translate(this.x, this.y); // 1. Gå til fiskens SENTER-posisjon

    // 2. Speilvend HELE tegningen hvis fisken svømmer til venstre
    if (this.dx < 0) {
        ctx.scale(-1, 1);
    }

    // 3. Tegn fisken som om den er ved (0,0) og PEKER TIL HØYRE
    ctx.fillStyle = this.color;
    var halfHeight = this.size / 2;
    
    // Kropp
    ctx.beginPath();
    ctx.moveTo(this.size, 0); // Nese (peker mot +X)
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

// Oppdateringsmetode for fisk (ES5-stil)
Fish.prototype.update = function() {
    if (!canvas) return; 
    this.x += this.dx;
    this.y += this.dy;

    var boundingBoxX = this.size; 
    if (this.x - boundingBoxX < 0 || this.x + boundingBoxX > canvas.width) {
        this.dx = -this.dx; // Snu horisontalt
    }
    
    var boundingBoxY = this.size / 2;
     if (this.y - boundingBoxY < 0 || this.y + boundingBoxY > canvas.height) {
        this.dy = -this.dy; // Snu vertikalt
    }

    // "AI": Tilfeldig endre vertikal retning av og til
    if (Math.random() < 0.01) {
        this.dy = (Math.random() * 0.5 - 0.25) * this.speed;
    }
}

// Fyll akvariet med fisk
function initAquarium() {
    if (!canvas) {
        canvas = document.getElementById('aquarium-canvas');
        if (!canvas) {
            console.error("initAquarium: Fant ikke 'aquarium-canvas'.");
            return;
        }
    }
    ctx = canvas.getContext('2d');
    
    // Fyll fisketanken (ENDRET: var i statt let)
    fishTank = [];
    for (var i = 0; i < fishCount; i++) {
        fishTank.push(new Fish());
    }

    // Fyll bobletanken (ENDRET: var i statt let)
    bubbleTank = [];
    for (var i = 0; i < bubbleCount; i++) {
        bubbleTank.push(new Bubble());
    }
}

// Animasjonsløkke
function animateAquarium() {
    if (!ctx || !canvas) {
        return; // Ikke gjør noe hvis canvas ikke er klart
    }
    
    // Tøm canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Oppdater og tegn hver boble (ES5-kompatibel løkke)
    for (var i = 0; i < bubbleTank.length; i++) {
        bubbleTank[i].update();
        bubbleTank[i].draw();
    }

    // Oppdater og tegn hver fisk (ES5-kompatibel løkke)
    for (var i = 0; i < fishTank.length; i++) {
        fishTank[i].update();
        fishTank[i].draw();
    }
    
    // ENDRING: Ikke kall requestAnimationFrame
    // Løkken kjøres nå av setInterval fra DOMContentLoaded
}