/* script.js - VERSIÓN 2.0: JOYSTICK PRO & ZOMBIE THEME */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- SISTEMA DE AUDIO ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination); const now = audioCtx.currentTime;
        if (type === 'SHOOT') { 
            osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.1); 
            gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); 
        } else if (type === 'HIT') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
            gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        }
        osc.start(now); osc.stop(now + 0.1);
    } catch (e) {}
}

// --- CARGA DE IMÁGENES ---
const playerImg = new Image(); playerImg.src = 'imagenes/player.png'; 
const zombieImg = new Image(); zombieImg.src = 'imagenes/zombie.png';
const survivorImg = new Image(); survivorImg.src = 'imagenes/survivor.png';
const roadImg = new Image(); roadImg.src = 'imagenes/asfalto.png';
const bossImg = new Image(); bossImg.src = 'imagenes/boss.png';

// --- VARIABLES ---
let gameRunning = false;
let score = 0; let level = 1; let ammo = 12;
let zombies = []; let survivors = []; let bullets = [];
let boss = null;
let spawnZ, spawnS;

const player = { x: canvas.width/2, y: canvas.height/2, radius: 20, speed: 5, health: 100 };

// --- UI ---
const uiScore = document.getElementById('score');
const uiLevel = document.getElementById('level');
const uiAmmo = document.getElementById('ammo');
const uiHealth = document.getElementById('health');
const uiLog = document.getElementById('log');

// --- LÓGICA DEL JOYSTICK PRO ---
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
const btnFire = document.getElementById("btn-fire");

let joyX = 0; let joyY = 0; let joyActive = false;
const maxRadius = 50; // Radio máximo de movimiento del stick

// Función para manejar el toque
function handleJoystick(touchX, touchY) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = touchX - centerX;
    let deltaY = touchY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    // Limitar el movimiento al círculo
    if (distance > maxRadius) {
        const ratio = maxRadius / distance;
        deltaX *= ratio;
        deltaY *= ratio;
    }

    // Mover visualmente el stick
    joystickStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Calcular valores normalizados (-1 a 1) para el jugador
    joyX = deltaX / maxRadius;
    joyY = deltaY / maxRadius;
}

// Eventos Táctiles del Joystick
joystickBase.addEventListener("touchstart", (e) => { e.preventDefault(); joyActive = true; handleJoystick(e.touches[0].clientX, e.touches[0].clientY); });
joystickBase.addEventListener("touchmove", (e) => { e.preventDefault(); if(joyActive) handleJoystick(e.touches[0].clientX, e.touches[0].clientY); });
joystickBase.addEventListener("touchend", (e) => { 
    e.preventDefault(); joyActive = false; joyX = 0; joyY = 0; 
    joystickStick.style.transform = `translate(0px, 0px)`; // Volver al centro
});

// Botón de Disparo
btnFire.addEventListener("touchstart", (e) => { e.preventDefault(); shootBullet(); btnFire.style.transform = "scale(0.9)"; });
btnFire.addEventListener("touchend", (e) => { e.preventDefault(); btnFire.style.transform = "scale(1)"; });
btnFire.addEventListener("mousedown", (e) => { shootBullet(); }); // Para PC pruebas

// --- CLASES Y LÓGICA ---
function shootBullet() {
    if(ammo > 0) {
        // Dispara en la dirección del joystick, si está quieto, dispara hacia arriba
        let vx = joyX * 15; let vy = joyY * 15;
        if(vx === 0 && vy === 0) vy = -15; // Por defecto arriba
        
        bullets.push({ x: player.x, y: player.y, vx: vx, vy: vy });
        ammo--; uiAmmo.innerText = ammo;
        playSound('SHOOT');
    } else { uiLog.innerText = "¡SIN MUNICIÓN!"; uiLog.style.color = "red"; }
}

function update() {
    // 1. Mover Jugador con Joystick
    player.x += joyX * player.speed;
    player.y += joyY * player.speed;
    player.x = Math.max(0, Math.min(canvas.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height, player.y));

    // 2. Mover Balas
    for(let i=bullets.length-1; i>=0; i--) {
        let b = bullets[i];
        b.x += b.vx; b.y += b.vy;

        // Colisión Bala vs Zombie
        for(let j=zombies.length-1; j>=0; j--) {
            let z = zombies[j];
            if(Math.hypot(b.x-z.x, b.y-z.y) < 30) {
                zombies.splice(j, 1); bullets.splice(i, 1);
                score += 50; uiScore.innerText = score;
                playSound('HIT');
                if(score % 500 === 0) { boss = {x: canvas.width/2, y: -100, hp: 20, maxHp: 20}; uiLog.innerText = "¡JEFE APROXIMÁNDOSE!"; }
                break;
            }
        }
        if(b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    }

    // 3. Mover Zombies
    zombies.forEach(z => {
        const angle = Math.atan2(player.y - z.y, player.x - z.x);
        z.x += Math.cos(angle) * (1 + level * 0.1);
        z.y += Math.sin(angle) * (1 + level * 0.1);
        
        if(Math.hypot(player.x - z.x, player.y - z.y) < 30) {
            player.health -= 0.5; uiHealth.innerText = Math.floor(player.health);
        }
    });

    // 4. Jefe
    if(boss) {
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        boss.x += Math.cos(angle) * 1.5; boss.y += Math.sin(angle) * 1.5;
        // Colisión Bala vs Boss
        for(let i=bullets.length-1; i>=0; i--) {
            let b = bullets[i];
            if(Math.hypot(b.x - boss.x, b.y - boss.y) < 60) {
                boss.hp--; bullets.splice(i, 1); playSound('HIT');
                if(boss.hp <= 0) { boss = null; score += 1000; uiLog.innerText = "¡JEFE ELIMINADO!"; }
            }
        }
        if(Math.hypot(player.x - boss.x, player.y - boss.y) < 60) { player.health -= 1; uiHealth.innerText = Math.floor(player.health); }
    }

    if(player.health <= 0) { gameRunning = false; alert("INFECTADO. Puntos: " + score); location.reload(); }
}

function draw() {
    if(roadImg.complete) { const p = ctx.createPattern(roadImg, 'repeat'); ctx.fillStyle = p; ctx.fillRect(0,0,canvas.width,canvas.height); }
    else ctx.clearRect(0,0,canvas.width,canvas.height);

    bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI*2); ctx.fillStyle = '#f1c40f'; ctx.fill(); });
    zombies.forEach(z => { if(zombieImg.complete) ctx.drawImage(zombieImg, z.x-32, z.y-32, 64, 64); });
    
    if(boss) {
        if(bossImg.complete) ctx.drawImage(bossImg, boss.x-64, boss.y-64, 128, 128);
        // Barra vida Boss
        ctx.fillStyle = 'red'; ctx.fillRect(boss.x-50, boss.y-80, 100, 10);
        ctx.fillStyle = 'lime'; ctx.fillRect(boss.x-50, boss.y-80, 100 * (boss.hp/boss.maxHp), 10);
    }

    if(playerImg.complete) ctx.drawImage(playerImg, player.x-32, player.y-32, 64, 64);
}

function loop() { if(gameRunning) { update(); draw(); requestAnimationFrame(loop); } }

// INICIAR
document.getElementById("start-btn").onclick = () => {
    document.getElementById("menu-screen").style.display = "none";
    document.getElementById("game-ui").style.display = "block";
    gameRunning = true;
    spawnZ = setInterval(() => zombies.push({x: Math.random()*canvas.width, y: -50}), 1500);
    loop();
};

if(localStorage.getItem('zScore')) document.getElementById('menu-highscore').innerText = localStorage.getItem('zScore');
