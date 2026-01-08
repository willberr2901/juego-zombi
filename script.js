/* Archivo: script.js - VERSIÓN FINAL MÓVIL + RECORD */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- SISTEMA DE AUDIO SEGURO ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        if (type === 'SHOOT') {
            osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'MG') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(600, now); gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.05); osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'HIT') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'RELOAD') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(800, now + 0.2); gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2);
        }
    } catch (e) {}
}

// --- IMÁGENES ---
const playerImg = new Image(); playerImg.src = 'imagenes/player.png'; 
const zombieImg = new Image(); zombieImg.src = 'imagenes/zombie.png';
const survivorImg = new Image(); survivorImg.src = 'imagenes/survivor.png';
const roadImg = new Image(); roadImg.src = 'imagenes/asfalto.png';
const bossImg = new Image(); bossImg.src = 'imagenes/boss.png';
const mgImg = new Image(); mgImg.src = 'imagenes/mg.png';

// --- VARIABLES GLOBALES ---
let gameRunning = false; let animationId; let spawnZ, spawnS; let frameCount = 0;
const player = { x: 0, y: 0, radius: 20, speed: 5, health: 100, cureProgress: 0, color: '#3498db' };
let score = 0; let highScore = 0; let level = 1; let ammo = 12; const maxAmmo = 30;
let machineGunActive = false; let machineGunTimer = 0;
let zombies = [], survivors = [], bullets = [], particles = [], floatingTexts = [];
let boss = null;
const keys = {};

// Variables de Control Táctil
let touchFiring = false;

// Elementos UI
const menuScreen = document.getElementById('menu-screen');
const gameUI = document.getElementById('game-ui');
const uiScore = document.getElementById('score');
const uiLevel = document.getElementById('level');
const uiAmmo = document.getElementById('ammo');
const uiHealth = document.getElementById('health');
const uiCure = document.getElementById('cure');
const uiLog = document.getElementById('log');
const uiHighScore = document.getElementById('ui-highscore');
const menuHighScore = document.getElementById('menu-highscore');

// --- CARGAR RECORD ---
// Intentamos leer del almacenamiento local
if (localStorage.getItem('zombieHighScore')) {
    highScore = parseInt(localStorage.getItem('zombieHighScore'));
    menuHighScore.innerText = highScore;
    uiHighScore.innerText = highScore;
}

// --- CLASES (Resumidas) ---
class FloatingText {
    constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 60; this.opacity = 1; }
    update() { this.y -= 1; this.life--; this.opacity = this.life/60; }
    draw() { ctx.globalAlpha = this.opacity; ctx.fillStyle = this.color; ctx.font = 'bold 16px Arial'; ctx.textAlign='center'; ctx.fillText(this.text, this.x, this.y); ctx.globalAlpha = 1; }
}
class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.size = Math.random()*5+2; this.vx = (Math.random()-0.5)*10; this.vy = (Math.random()-0.5)*10; this.life = 30; }
    update() { this.x += this.vx; this.y += this.vy; this.vx *= 0.9; this.vy *= 0.9; this.life--; this.size *= 0.9; }
    draw() { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); }
}
class Bullet {
    constructor(tx, ty) {
        this.x = player.x; this.y = player.y; this.radius = 5; this.speed = 15;
        let spread = machineGunActive ? (Math.random()-0.5)*0.2 : 0;
        let angle = Math.atan2(ty - this.y, tx - this.x) + spread;
        this.vx = Math.cos(angle)*this.speed; this.vy = Math.sin(angle)*this.speed;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fillStyle = machineGunActive ? '#8e44ad' : '#f1c40f'; ctx.fill(); }
}
class Zombie {
    constructor() {
        const s = Math.floor(Math.random()*4);
        if(s===0){this.x=-64;this.y=Math.random()*canvas.height} else if(s===1){this.x=canvas.width+64;this.y=Math.random()*canvas.height} else if(s===2){this.x=Math.random()*canvas.width;this.y=-64} else{this.x=Math.random()*canvas.width;this.y=canvas.height+64}
        this.radius=20; this.speed = (Math.random()*1.5+1)+(level*0.2); this.color='#e74c3c';
    }
    update() { const dx=player.x-this.x; const dy=player.y-this.y; const dist=Math.sqrt(dx*dx+dy*dy); this.x+=(dx/dist)*this.speed; this.y+=(dy/dist)*this.speed; }
    draw() { if(zombieImg.complete && zombieImg.naturalHeight!==0) ctx.drawImage(zombieImg, this.x-32, this.y-32, 64, 64); else {ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle=this.color;ctx.fill();} }
}
class Boss {
    constructor() { this.x=canvas.width/2; this.y=-150; this.radius=60; this.speed=1.5; this.hp=20+(level*2); this.maxHp=this.hp; }
    update() { const dx=player.x-this.x; const dy=player.y-this.y; const dist=Math.sqrt(dx*dx+dy*dy); this.x+=(dx/dist)*this.speed; this.y+=(dy/dist)*this.speed; }
    draw() { if(bossImg.complete && bossImg.naturalHeight!==0) ctx.drawImage(bossImg, this.x-64, this.y-64, 128, 128); else {ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='#800000';ctx.fill();} }
}
class Survivor {
    constructor() { this.x=Math.random()*(canvas.width-100)+50; this.y=Math.random()*(canvas.height-100)+50; this.radius=20; const r=Math.random(); if(r<0.1)this.type='MG';else if(r<0.4)this.type='MUNICION';else if(r<0.7)this.type='MEDICINA';else this.type='DATOS'; }
    draw() { 
        if(this.type==='MG'&&mgImg.complete) ctx.drawImage(mgImg,this.x-24,this.y-24,48,48);
        else if(survivorImg.complete) ctx.drawImage(survivorImg,this.x-32,this.y-32,64,64);
        else {ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='orange';ctx.fill();}
        ctx.fillStyle='white'; ctx.font='bold 12px Arial'; ctx.textAlign='center';
        ctx.fillText(this.type==='MUNICION'?'BALAS':(this.type==='MG'?'MG':(this.type==='MEDICINA'?'HP':'DATA')), this.x, this.y-35);
    }
}

// --- CONTROLES (PC + MÓVIL) ---
// PC
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('mousedown', e => { if(!gameRunning) return; if(e.target.tagName !== 'BUTTON') shootBullet(e.clientX, e.clientY); });

// MÓVIL (Botones en pantalla)
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnFire = document.getElementById('btn-fire');

const addTouch = (elem, key) => {
    elem.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    elem.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    elem.addEventListener('mousedown', (e) => keys[key] = true); // Para probar con mouse
    elem.addEventListener('mouseup', (e) => keys[key] = false);
};
addTouch(btnUp, 'w'); addTouch(btnDown, 's'); addTouch(btnLeft, 'a'); addTouch(btnRight, 'd');

// Botón de disparo móvil (Auto-aim al zombi más cercano o frente)
btnFire.addEventListener('touchstart', (e) => { e.preventDefault(); touchFiring = true; });
btnFire.addEventListener('touchend', (e) => { e.preventDefault(); touchFiring = false; });
btnFire.addEventListener('mousedown', () => touchFiring = true);
btnFire.addEventListener('mouseup', () => touchFiring = false);


function shootBullet(targetX, targetY) {
    if(machineGunActive) {
        bullets.push(new Bullet(targetX, targetY)); playSound('MG');
    } else {
        if(ammo > 0) { bullets.push(new Bullet(targetX, targetY)); ammo--; uiAmmo.innerText = ammo; playSound('SHOOT'); }
    }
}

// Auto-disparo para móvil
function handleMobileShooting() {
    if(touchFiring) {
        // Encontrar zombi más cercano para apuntar
        let targetX = player.x, targetY = player.y - 100; // Default arriba
        let minDist = 9999;
        
        // Prioridad: Boss -> Zombi más cercano
        if(boss) {
            targetX = boss.x; targetY = boss.y;
        } else if(zombies.length > 0) {
            zombies.forEach(z => {
                let d = Math.hypot(player.x - z.x, player.y - z.y);
                if(d < minDist) { minDist = d; targetX = z.x; targetY = z.y; }
            });
        }
        
        if (machineGunActive && frameCount % 5 === 0) shootBullet(targetX, targetY);
        else if (!machineGunActive && frameCount % 15 === 0) shootBullet(targetX, targetY);
    }
}


function createBlood(x, y) { for(let i=0;i<8;i++) particles.push(new Particle(x, y, '#900')); }

// --- LOGICA PRINCIPAL ---
function startGame() {
    if(audioCtx.state==='suspended') audioCtx.resume();
    player.x=canvas.width/2; player.y=canvas.height/2; player.health=100; player.cureProgress=0;
    score=0; level=1; ammo=12; zombies=[]; survivors=[]; bullets=[]; boss=null; particles=[]; floatingTexts=[];
    machineGunActive=false;
    uiScore.innerText=0; uiLevel.innerText=1; uiHealth.innerText=100; uiAmmo.innerText=12; uiCure.innerText=0;
    menuScreen.style.display='none'; gameUI.style.display='block';
    gameRunning=true; startSpawners(); animate();
}

function endGame(win) {
    gameRunning=false; clearInterval(spawnZ); clearInterval(spawnS);
    
    // GUARDAR RECORD
    if(score > highScore) {
        highScore = score;
        localStorage.setItem('zombieHighScore', highScore);
        menuHighScore.innerText = highScore;
        uiHighScore.innerText = highScore;
    }
    
    menuScreen.style.display='flex'; gameUI.style.display='none';
    const title = document.getElementById('menu-title');
    title.innerText = win ? "¡VICTORIA!" : "GAME OVER";
    title.style.color = win ? "#2ecc71" : "#e74c3c";
    document.getElementById('start-btn').innerText = "REINTENTAR";
}

function startSpawners() {
    clearInterval(spawnZ); clearInterval(spawnS);
    spawnZ = setInterval(() => { if(gameRunning && !boss) zombies.push(new Zombie()); }, Math.max(500, 1500-(level*100)));
    spawnS = setInterval(() => { if(gameRunning && survivors.length<5) survivors.push(new Survivor()); }, 4000);
}

function update() {
    frameCount++;
    handleMobileShooting(); // Revisar si se dispara en móvil
    
    // Movimiento
    if(keys['w']||keys['ArrowUp']) player.y-=player.speed;
    if(keys['s']||keys['ArrowDown']) player.y+=player.speed;
    if(keys['a']||keys['ArrowLeft']) player.x-=player.speed;
    if(keys['d']||keys['ArrowRight']) player.x+=player.speed;
    player.x=Math.max(0,Math.min(canvas.width,player.x)); player.y=Math.max(0,Math.min(canvas.height,player.y));
    
    // Timer MG
    if(machineGunActive) { machineGunTimer--; if(machineGunTimer<=0) machineGunActive=false; }
    
    // Update Efectos
    for(let i=particles.length-1;i>=0;i--){ particles[i].update(); if(particles[i].life<=0) particles.splice(i,1); }
    for(let i=floatingTexts.length-1;i>=0;i--){ floatingTexts[i].update(); if(floatingTexts[i].life<=0) floatingTexts.splice(i,1); }
    
    // COLISIONES (Bucle inverso)
    for(let i=bullets.length-1;i>=0;i--) {
        let b=bullets[i]; let hit=false;
        // Zombis
        for(let j=zombies.length-1;j>=0;j--) {
            let z=zombies[j];
            if(Math.hypot(b.x-z.x,b.y-z.y) < b.radius+z.radius) {
                createBlood(z.x, z.y); floatingTexts.push(new FloatingText(z.x, z.y, "+50", "#f1c40f"));
                zombies.splice(j,1); hit=true; score+=50; uiScore.innerText=score; playSound('HIT'); 
                // Subir nivel
                if(Math.floor(score/500)+1 > level) { level++; uiLevel.innerText=level; if(level%5===0){boss=new Boss();zombies=[];} startSpawners(); }
                break;
            }
        }
        if(!hit && boss && Math.hypot(b.x-boss.x,b.y-boss.y) < b.radius+boss.radius) {
            boss.hp--; hit=true; createBlood(boss.x, boss.y); playSound('HIT');
            if(boss.hp<=0) { boss=null; score+=1000; uiScore.innerText=score; floatingTexts.push(new FloatingText(canvas.width/2,canvas.height/2,"BOSS DEAD!","#2ecc71")); startSpawners(); }
        }
        if(hit || b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) bullets.splice(i,1);
    }
    
    // Daño Jugador
    zombies.forEach(z => { if(Math.hypot(player.x-z.x,player.y-z.y)<player.radius+z.radius) { player.health-=0.5; uiHealth.innerText=Math.floor(player.health); if(player.health<=0) endGame(false); } });
    if(boss && Math.hypot(player.x-boss.x,player.y-boss.y)<player.radius+boss.radius) { player.health-=1; uiHealth.innerText=Math.floor(player.health); if(player.health<=0) endGame(false); }
    
    // Items
    for(let i=survivors.length-1;i>=0;i--) {
        let s=survivors[i];
        if(Math.hypot(player.x-s.x,player.y-s.y)<player.radius+s.radius) {
            playSound('RELOAD');
            if(s.type==='MUNICION'){ammo=Math.min(ammo+12,maxAmmo); floatingTexts.push(new FloatingText(player.x,player.y-20,"+12 BALAS","orange"));}
            else if(s.type==='MEDICINA'){player.health=Math.min(player.health+30,100); floatingTexts.push(new FloatingText(player.x,player.y-20,"+HP","#2ecc71"));}
            else if(s.type==='MG'){machineGunActive=true; machineGunTimer=600; floatingTexts.push(new FloatingText(player.x,player.y-40,"MACHINE GUN!","#8e44ad"));}
            else {player.cureProgress+=20; floatingTexts.push(new FloatingText(player.x,player.y-20,"DATA","#3498db"));}
            uiAmmo.innerText=ammo; uiHealth.innerText=Math.floor(player.health); uiCure.innerText=player.cureProgress;
            survivors.splice(i,1);
            if(player.cureProgress>=100) endGame(true);
        }
    }
}

function animate() {
    if(!gameRunning) return;
    if(roadImg.complete) { const p=ctx.createPattern(roadImg,'repeat'); ctx.fillStyle=p; ctx.fillRect(0,0,canvas.width,canvas.height); }
    else ctx.clearRect(0,0,canvas.width,canvas.height);
    
    update();
    
    particles.forEach(p=>p.draw());
    survivors.forEach(s=>s.draw());
    bullets.forEach(b=>b.draw());
    if(playerImg.complete) ctx.drawImage(playerImg,player.x-32,player.y-32,64,64); else {ctx.beginPath();ctx.arc(player.x,player.y,20,0,Math.PI*2);ctx.fillStyle=player.color;ctx.fill();}
    zombies.forEach(z=>z.draw());
    if(boss) { boss.draw(); ctx.fillStyle='red';ctx.fillRect(boss.x-50,boss.y-80,100,10);ctx.fillStyle='#0f0';ctx.fillRect(boss.x-50,boss.y-80,100*(boss.hp/boss.maxHp),10); }
    floatingTexts.forEach(t=>t.draw());
    
    requestAnimationFrame(animate);
}

document.getElementById('start-btn').addEventListener('click', startGame);
menuScreen.style.display='flex'; gameUI.style.display='none';