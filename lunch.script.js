/* --- Skript for lunch.html --- */
/* ENDRET: Bruker 'var' for eldre kompatibilitet */

// --- NY VAKTPLAN ---
// (Basert på bilde, ignorerer LCM, slår sammen Tlf/Kontor/Sentralbord/Post til Backoffice)
var vaktPlan = {
    // 0: Søndag
    0: {
        formiddag: { skranke: [], backoffice: [] },
        ettermiddag: { skranke: [], backoffice: [] }
    },
    // 1: Mandag
    1: {
        formiddag: { // 08:00 - 12:00
            skranke: ["Mathilde", "AC", "Olai"],
            backoffice: ["Jonny", "Audun", "KRS"]
        },
        ettermiddag: { // 12:00 - 15:30
            skranke: ["Mathilde", "AC", "Audun"],
            backoffice: ["Jonny", "Olai", "KRS"]
        }
    },
    // 2: Tirsdag
    2: {
        formiddag: {
            skranke: ["AC", "Mariann", "Audun"],
            backoffice: ["Jonny", "Mathilde", "Olai"]
        },
        ettermiddag: {
            skranke: ["Mariann", "Olai"],
            backoffice: ["Jonny", "Audun", "Mathilde", "AC"]
        }
    },
    // 3: Onsdag
    3: {
        formiddag: {
            skranke: ["Jonny", "Audun"],
            backoffice: ["Mathilde", "Olai", "AC", "KRS"]
        },
        ettermiddag: {
            skranke: ["Mathilde", "Olai"],
            backoffice: ["Jonny", "AC", "KRS", "Olai"]
        }
    },
    // 4: Torsdag
    4: {
        formiddag: {
            skranke: ["Mathilde", "Olai"],
            backoffice: ["AC", "Mariann", "Audun", "Jonny"]
        },
        ettermiddag: {
            skranke: ["AC", "Audun"],
            backoffice: ["Mathilde", "Jonny", "Olai", "Mariann"]
        }
    },
    // 5: Fredag
    5: {
        formiddag: {
            skranke: ["Olai", "Mathilde"],
            backoffice: ["AC", "Jonny", "Mariann", "Audun"]
        },
        ettermiddag: {
            skranke: ["AC", "Jonny"],
            backoffice: ["Olai", "Mariann", "Mathilde"]
        }
    },
    // 6: Lørdag
    6: {
        formiddag: { skranke: [], backoffice: [] },
        ettermiddag: { skranke: [], backoffice: [] }
    }
};

// --- GAMMEL LUNSJPLAN ---
var lunchSchedule = {
    1: { "10:30": "Mariann", "11:00": "Mathilde, Jonny, Olai", "11:30": "AC, Audun" },
    2: { "10:30": "Mariann", "11:00": "Jonny, Audun", "11:30": "AC, Mathilde, Olai" },
    3: { "10:30": "Mariann", "11:00": "AC, Mathilde, Audun", "11:30": "Jonny, Olai" },
    4: { "10:30": "Mariann", "11:00": "Jonny, Olai", "11:30": "AC, Audun, Mathilde" },
    5: { "10:30": "Mariann", "11:00": "Mathilde, Jonny, Audun", "11:30": "AC, Olai" },
    0: { "10:30": "-", "11:00": "-", "11:30": "-" },
    6: { "10:30": "-", "11:00": "-", "11:30": "-" }
};

// Variabel for å holde styr på auto-oppdatering
var simuleringsIntervall = null;

// --- NY FUNKSJON for å oppdatere vakt-baren ---
function oppdaterVaktNavn(dag, time) {
    var dagensPlan = vaktPlan[dag] || vaktPlan[0]; // Hent plan, default til søndag
    var skrankeNavn = [];
    var backofficeNavn = [];

    if (time >= 8 && time < 12) { // Formiddag
        skrankeNavn = dagensPlan.formiddag.skranke;
        backofficeNavn = dagensPlan.formiddag.backoffice;
    } else if (time >= 12 && time < 16) { // Ettermiddag (til kl 15:30, men sjekker til 16)
        skrankeNavn = dagensPlan.ettermiddag.skranke;
        backofficeNavn = dagensPlan.ettermiddag.backoffice;
    }
    // Hvis tiden er utenfor 8-16, vil listene forbli tomme (som er riktig)

    // Hent DOM-elementer for navn
    var skrankeEl = document.getElementById('skranke-vakt-navn');
    var backofficeEl = document.getElementById('backoffice-vakt-navn');

    // Oppdater tekst
    if (skrankeNavn.length > 0) {
        skrankeEl.innerHTML = skrankeNavn.join(', ');
    } else {
        skrankeEl.innerHTML = '-';
    }

    if (backofficeNavn.length > 0) {
        backofficeEl.innerHTML = backofficeNavn.join(', ');
    } else {
        backofficeEl.innerHTML = '-';
    }
}


/**
 * Hovedfunksjon som sjekker tiden og oppdaterer skjermen.
 */
function checkTime() {
    var now = new Date();
    
    var hour = now.getHours();
    var minute = now.getMinutes();
    var dayOfWeek = now.getDay(); 

    // Hent DOM-elementer
    var messageOverlay = document.getElementById('message-overlay');
    var messageText = document.getElementById('message-text');
    var afterHoursScreen = document.getElementById('after-hours');
    var backgroundElement = document.getElementById('aquarium-canvas');
    var vaktBar = document.getElementById('vakt-bar'); // NYTT element

    var todaySchedule = lunchSchedule[dayOfWeek] || lunchSchedule[0]; 
    var message = ""; 

    // --- Logikk for LUNSJ-meldinger ---
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
    if (hour >= 16 || hour < 8) { // Etter stengetid
        afterHoursScreen.style.display = 'flex';
        if (backgroundElement) backgroundElement.style.opacity = '0';
        messageOverlay.classList.remove('visible'); 
        vaktBar.style.display = 'none'; // NY: Skjul vakt-bar
    } 
    else { // I åpningstiden
        afterHoursScreen.style.display = 'none';
        if (backgroundElement) backgroundElement.style.opacity = '1';
        vaktBar.style.display = 'flex'; // NY: Vis vakt-bar

        // NY: Oppdater vakt-navnene
        oppdaterVaktNavn(dayOfWeek, hour);

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

// --- Initial Load og Timere ---
document.addEventListener('DOMContentLoaded', function() {
    startAutoOppdatering();

    if (document.getElementById('aquarium-canvas')) {
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        initAquarium();
        
        setInterval(animateAquarium, 16); 
    } else {
        console.error("Fant ikke 'aquarium-canvas' ved DOMContentLoaded.");
    }
});


/* --- DEL 2: Akvarium-logikk (ES5-kompatibel) --- */

var canvas = null;
var ctx = null;
var fishTank = [];
var fishCount = 20; 
var fishColors = ['#FF4136', '#FF851B', '#2ECC40', '#0074D9', '#B10DC9'];

var bubbleTank = [];
var bubbleCount = 30;

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

function Bubble() {
    this.x = Math.random() * (canvas ? canvas.width : window.innerWidth);
    this.y = (Math.random() * (canvas ? canvas.height : window.innerHeight)) + (canvas ? canvas.height : window.innerHeight);
    this.size = (Math.random() * 4) + 2; 
    this.dy = (Math.random() * 1.5) + 0.5; 
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
    this.y -= this.dy; 
    
    if (this.y < -this.size) {
        this.y = canvas.height + this.size;
        this.x = Math.random() * canvas.width;
    }
}

function Fish() {
    this.x = Math.random() * (canvas ? canvas.width : window.innerWidth);
    this.y = Math.random() * (canvas ? canvas.height : window.innerHeight);
    this.size = (Math.random() * 5) + 8;
    this.speed = (Math.random() * 1) + 0.5;
    this.dx = (Math.random() > 0.5 ? 1 : -1) * this.speed;
    this.dy = (Math.random() * 0.5 - 0.25) * this.speed;
    this.color = fishColors[Math.floor(Math.random() * fishColors.length)];
}

Fish.prototype.draw = function() {
    if (!ctx) return;
    
    ctx.save();
    ctx.translate(this.x, this.y); 

    if (this.dx < 0) {
        ctx.scale(-1, 1);
    }

    ctx.fillStyle = this.color;
    var halfHeight = this.size / 2;
    
    ctx.beginPath();
    ctx.moveTo(this.size, 0); 
    ctx.quadraticCurveTo(this.size * 0.5, -halfHeight * 1.5, 0, -halfHeight);
    ctx.lineTo(-this.size, -halfHeight * 0.5);
    ctx.lineTo(-this.size, halfHeight * 0.5);
    ctx.lineTo(0, halfHeight);
    ctx.quadraticCurveTo(this.size * 0.5, halfHeight * 1.5, this.size, 0);
    ctx.fill();

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

Fish.prototype.update = function() {
    if (!canvas) return; 
    this.x += this.dx;
    this.y += this.dy;

    var boundingBoxX = this.size; 
    if (this.x - boundingBoxX < 0 || this.x + boundingBoxX > canvas.width) {
        this.dx = -this.dx;
    }
    
    var boundingBoxY = this.size / 2;
     if (this.y - boundingBoxY < 0 || this.y + boundingBoxY > canvas.height) {
        this.dy = -this.dy;
    }

    if (Math.random() < 0.01) {
        this.dy = (Math.random() * 0.5 - 0.25) * this.speed;
    }
}

function initAquarium() {
    if (!canvas) {
        canvas = document.getElementById('aquarium-canvas');
        if (!canvas) {
            console.error("initAquarium: Fant ikke 'aquarium-canvas'.");
            return;
        }
    }
    ctx = canvas.getContext('2d');
    
    fishTank = [];
    for (var i = 0; i < fishCount; i++) {
        fishTank.push(new Fish());
    }

    bubbleTank = [];
    for (var i = 0; i < bubbleCount; i++) {
        bubbleTank.push(new Bubble());
    }
}

function animateAquarium() {
    if (!ctx || !canvas) {
        return; 
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < bubbleTank.length; i++) {
        bubbleTank[i].update();
        bubbleTank[i].draw();
    }

    for (var i = 0; i < fishTank.length; i++) {
        fishTank[i].update();
        fishTank[i].draw();
    }
}