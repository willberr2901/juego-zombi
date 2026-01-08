/* script.js - VERSIÓN FINAL: JOYSTICK + IMÁGENES + ZOMBIS */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- AUDIO (Opcional, evita errores si no hay audio) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination); const now = audioCtx.currentTime;
        if (type === 'SHOOT') { osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    } catch (e) {}
}

// --- 1. CARGA DE IMÁGENES ---
// ¡Asegúrate de que los nombres en tu carpeta sean IGUALES a estos!
const playerImg = new Image(); playerImg.src = 'imagenes/player.png'; 
const zombieImg = new Image(); zombieImg.src = 'imagenes/zombie.png';
const survivorImg = new Image(); survivorImg.src = 'imagenes/survivor.png';
const roadImg = new Image(); roadImg.src = 'imagenes/asfalto.png';
const bossImg = new Image(); bossImg.src = 'imagenes/boss.png';
const mgImg = new Image(); mgImg.src = 'imagenes/mg.png';

// --- VARIABLES DEL JUEGO ---
let gameRunning = false;
let score = 0; let level = 1; let ammo = 12; const maxAmmo = 30;
let zombies = []; let survivors = []; let bullets = []; let floatingTexts = []; let particles = [];
let boss = null;
let machineGunActive = false; let machineGunTimer = 0;
let spawnZ, spawnS;

// --- JUGADOR ---
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 4, // Velocidad ajustada para móvil
    health: 100,
    cureProgress: 0
};

// --- UI ELEMENTS ---
const menuScreen = document.getElementById("menu-screen");
const gameUI = document.getElementById("game-ui");
const uiScore = document.getElementById('score');
const uiLevel = document.getElementById('level');
const uiAmmo = document.getElementById('ammo');
const uiHealth = document.getElementById('health');
const uiCure = document.getElementById('cure');
const startBtn = document.getElementById("start-btn");

// --- 2. CONTROLES JOYSTICK (TU CÓDIGO INTEGRADO) ---
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
const btnFire = document.getElementById("btn-fire");

let joyX = 0;
let joyY = 0;
let active = false;
const joyRadius = 40; // Radio del joystick

// Lógica del Joystick
joystickBase.addEventListener("touchstart", e => { e.preventDefault(); active = true; });
joystickBase.addEventListener("touchmove", e => {
    if (!active) return;
    e.preventDefault();
    const rect = joystickBase.getBoundingClientRect();
    const touch = e.touches[0];
    let x = touch.clientX - rect.left - rect.width / 2;
    let y = touch.clientY - rect.top - rect.height / 2;
    const dist = Math.hypot(x, y);
    if (dist > joyRadius) {
        x = (x / dist) * joyRadius;
        y = (y / dist) * joyRadius;
    }
    joyX = x / joyRadius;
    joyY = y / joyRadius;
    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
});

joystickBase.addEventListener("touchend", () => {
    active = false; joyX = 0; joyY = 0;
    joystickStick.style.transform = "translate(0,0)";
});

// Botón de Disparo
btnFire.addEventListener("touchstart", (e) => {
    e.preventDefault();
    shootBullet(); // Dispara al tocar
    btnFire.style.background = "rgba(255, 255, 255, 0.5)";
});
btnFire.addEventListener("touchend", (e) => {
    e.preventDefault();
    btnFire.style.background = "rgba(231,76,60,0.4)";
});

// --- CLASES ---
class Bullet {
    constructor() {
        this.x = player.x; this.y = player.y; this.radius = 5; this.speed = 15;
        // Si hay joystick, dispara en la dirección del movimiento, si no, hacia arriba
        let dirX = joyX !== 0 ? joyX : 0;
        let dirY = joyY !== 0 ? joyY : -1; 
        
        // Normalizar vector
        const len = Math.hypot(dirX, dirY);
        if(len === 0) { dirY = -1; } // Por defecto arriba
        else { dirX /= len; dirY /= len; }

        this.vx = dirX * this.speed;
        this.vy = dirY * this.speed;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fillStyle = '#f1c40f'; ctx.fill(); }
}

class Zombie {
    constructor() {
        const s = Math.floor(Math.random()*4);
        if(s===0){this.x=-64;this.y=Math.random()*canvas.height} else if(s===1){this.x=canvas.width+64;this.y=Math.random()*canvas.height} else if(s===2){this.x=Math.random()*canvas.width;this.y=-64} else{this.x=Math.random()*canvas.width;this.y=canvas.height+64}
        this.radius=20; this.speed = (Math.random()*1.5+1)+(level*0.1); 
    }
    update() { 
        const dx=player.x-this.x; const dy=player.y-this.y; const dist=Math.sqrt(dx*dx+dy*dy); 
        this.x+=(dx/dist)*this.speed; this.y+=(dy/dist)*this.speed; 
    }
    draw() { 
        // ¡AQUÍ DIBUJAMOS LA IMAGEN!
        if(zombieImg.complete && zombieImg.naturalHeight!==0) ctx.drawImage(zombieImg, this.x-32, this.y-32, 64, 64); 
        else {ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='red';ctx.fill();} 
    }
}

class Survivor {
    constructor() { this.x=Math.random()*(canvas.width-100)+50; this.y=Math.random()*(canvas.height-100)+50; this.radius=20; this.type = Math.random() < 0.5 ? 'MUNICION' : 'MEDICINA'; }
    draw() { 
        if(survivorImg.complete) ctx.drawImage(survivorImg,this.x-32,this.y-32,64,64);
        else {ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='green';ctx.fill();}
    }
}

// --- FUNCIONES DEL JUEGO ---
function shootBullet() {
    if(ammo > 0) {
        bullets.push(new Bullet());
        ammo--;
        uiAmmo.innerText = ammo;
        playSound('SHOOT');
    }
}

function startSpawners() {
    clearInterval(spawnZ); clearInterval(spawnS);
    spawnZ = setInterval(() => { if(gameRunning) zombies.push(new Zombie()); }, 1500 - (level * 50));
    spawnS = setInterval(() => { if(gameRunning && survivors.length < 3) survivors.push(new Survivor()); }, 5000);
}

function update() {
    // MOVER AL JUGADOR CON EL JOYSTICK
    player.x += joyX * player.speed;
    player.y += joyY * player.speed;
    player.x = Math.max(0, Math.min(canvas.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height, player.y));

    // Mover Balas
    for(let i=bullets.length-1; i>=0; i--) {
        let b = bullets[i];
        b.update();
        // Colisiones con Zombies
        for(let j=zombies.length-1; j>=0; j--) {
            let z = zombies[j];
            if(Math.hypot(b.x-z.x, b.y-z.y) < b.radius+z.radius) {
                zombies.splice(j, 1);
                bullets.splice(i, 1);
                score += 50; uiScore.innerText = score;
                break; 
            }
        }
    }

    // Mover Zombies
    zombies.forEach(z => z.update());
    
    // Daño Jugador
    zombies.forEach(z => {
        if(Math.hypot(player.x-z.x, player.y-z.y) < player.radius+z.radius) {
            player.health -= 0.5;
            uiHealth.innerText = Math.floor(player.health);
            if(player.health <= 0) { gameRunning = false; alert("GAME OVER"); location.reload(); }
        }
    });

    // Recoger Items
    for(let i=survivors.length-1; i>=0; i--) {
        let s = survivors[i];
        if(Math.hypot(player.x-s.x, player.y-s.y) < player.radius+s.radius) {
            if(s.type === 'MUNICION') { ammo+=12; uiAmmo.innerText = ammo; }
            else { player.health = Math.min(100, player.health + 20); uiHealth.innerText = Math.floor(player.health); }
            survivors.splice(i, 1);
        }
    }
}

function draw() {
    // Fondo
    if(roadImg.complete) { const p = ctx.createPattern(roadImg, 'repeat'); ctx.fillStyle = p; ctx.fillRect(0,0,canvas.width,canvas.height); }
    else ctx.clearRect(0,0,canvas.width,canvas.height);

    // Dibujar Entidades
    survivors.forEach(s => s.draw());
    bullets.forEach(b => b.draw());
    zombies.forEach(z => z.draw());

    // DIBUJAR JUGADOR (IMAGEN)
    if(playerImg.complete && playerImg.naturalHeight!==0) {
        ctx.drawImage(playerImg, player.x-32, player.y-32, 64, 64);
    } else {
        // Fallback si no hay imagen (Círculo azul)
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2); ctx.fillStyle = "#3498db"; ctx.fill();
    }
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(animate);
}

// INICIAR
startBtn.onclick = () => {
    menuScreen.style.display = "none";
    gameUI.style.display = "block";
    gameRunning = true;
    startSpawners();
    animate();
};
