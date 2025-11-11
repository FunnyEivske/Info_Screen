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
    var videoBackground = document.getElementById('video-background');

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
        videoBackground.style.opacity = '0';
        messageOverlay.classList.remove('visible'); 
    } 
    else {
        afterHoursScreen.style.display = 'none';
        videoBackground.style.opacity = '1';

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
document.addEventListener('DOMContentLoaded', function() {
    
    // FJernet: Event listeners for knapper

    // Start med ekte tid
    startAutoOppdatering();
});