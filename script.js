/* ===============================
   CIUDAD Z - VERSION PRO 1.2.0
   =============================== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ===== VERSION ===== */
const GAME_VERSION = "1.2.0";
const CHANGELOG = [
  "Sistema de oleadas",
  "Feedback visual de daño",
  "Armas diferenciadas",
  "Mejor balance de dificultad"
];

/* ===== AUDIO ===== */
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t = audioCtx.currentTime;

        if (type === 'SHOOT') osc.frequency.setValueAtTime(400, t);
        if (type === 'MG') osc.frequency.setValueAtTime(700, t);
        if (type === 'HIT') osc.frequency.setValueAtTime(150, t);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
    } catch {}
}

/* ===== IMAGENES ===== */
const playerImg = new Image(); playerImg.src = 'imagenes/player.png';
const zombieImg = new Image(); zombieImg.src = 'imagenes/zombie.png';
const bossImg = new Image(); bossImg.src = 'imagenes/boss.png';
const survivorImg = new Image(); survivorImg.src = 'imagenes/survivor.png';

/* ===== VARIABLES ===== */
let gameRunning = false;
let frameCount = 0;
let damageFlash = 0;

const player = {
    x: 0, y: 0,
    radius: 20,
    speed: 5,
    health: 100
};

let bullets = [];
let zombies = [];
let survivors = [];
let boss = null;

let score = 0;
let ammo = 12;
let weapon = "PISTOL";

/* ===== OLEADAS ===== */
let wave = 1;
let zombiesToSpawn = 5;
let zombiesKilled = 0;
let waveCooldown = 0;

/* ===== UI ===== */
const menuScreen = document.getElementById('menu-screen');
const gameUI = document.getElementById('game-ui');
const uiScore = document.getElementById('score');
const uiAmmo = document.getElementById('ammo');
const uiHealth = document.getElementById('health');
const uiLog = document.getElementById('log');

/* ===== CLASES ===== */
class Bullet {
    constructor(tx, ty) {
        this.x = player.x;
        this.y = player.y;
        this.speed = weapon === "MG" ? 18 : 14;
        const angle = Math.atan2(ty - this.y, tx - this.x);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    draw() {
        ctx.fillStyle = weapon === "MG" ? "#9b59b6" : "#f1c40f";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Zombie {
    constructor() {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { this.x = -50; this.y = Math.random() * canvas.height; }
        if (side === 1) { this.x = canvas.width + 50; this.y = Math.random() * canvas.height; }
        if (side === 2) { this.x = Math.random() * canvas.width; this.y = -50; }
        if (side === 3) { this.x = Math.random() * canvas.width; this.y = canvas.height + 50; }
        this.radius = 20;
        this.speed = 1.5 + wave * 0.15;
    }
    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const d = Math.hypot(dx, dy);
        this.x += (dx / d) * this.speed;
        this.y += (dy / d) * this.speed;
    }
    draw() {
        if (zombieImg.complete)
            ctx.drawImage(zombieImg, this.x - 32, this.y - 32, 64, 64);
    }
}

/* ===== CONTROLES ===== */
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('mousedown', e => shoot(e.clientX, e.clientY));

function shoot(x, y) {
    if (weapon === "PISTOL" && ammo <= 0) return;
    bullets.push(new Bullet(x, y));
    if (weapon === "PISTOL") ammo--;
    playSound(weapon === "MG" ? "MG" : "SHOOT");
    uiAmmo.innerText = ammo;
}

/* ===== GAME FLOW ===== */
function startGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = 100;
    score = 0;
    ammo = 12;
    wave = 1;
    zombiesToSpawn = 5;
    zombiesKilled = 0;
    bullets = [];
    zombies = [];
    gameRunning = true;

    uiLog.innerHTML = `
      <b>Versión ${GAME_VERSION}</b><br>
      ${CHANGELOG.map(c => "• " + c).join("<br>")}
    `;

    menuScreen.style.display = "none";
    gameUI.style.display = "block";
    animate();
}

function update() {
    frameCount++;

    if (keys['w']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['a']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;

    bullets.forEach(b => b.update());
    zombies.forEach(z => z.update());

    for (let i = zombies.length - 1; i >= 0; i--) {
        if (Math.hypot(player.x - zombies[i].x, player.y - zombies[i].y) < 30) {
            player.health -= 0.5;
            damageFlash = 8;
            uiHealth.innerText = Math.floor(player.health);
            if (player.health <= 0) gameRunning = false;
        }
    }

    if (zombies.length < zombiesToSpawn && waveCooldown <= 0) {
        zombies.push(new Zombie());
    }

    if (zombiesKilled >= zombiesToSpawn) {
        wave++;
        zombiesKilled = 0;
        zombiesToSpawn += 3;
        waveCooldown = 120;
    }

    if (waveCooldown > 0) waveCooldown--;
}

function animate() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();

    bullets.forEach(b => b.draw());
    zombies.forEach(z => z.draw());

    if (playerImg.complete)
        ctx.drawImage(playerImg, player.x - 32, player.y - 32, 64, 64);

    if (damageFlash > 0) {
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        damageFlash--;
    }

    requestAnimationFrame(animate);
}

document.getElementById('start-btn').addEventListener('click', startGame);
menuScreen.style.display = "flex";
gameUI.style.display = "none";