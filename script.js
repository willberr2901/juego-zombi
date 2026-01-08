/* script.js - V10.0 CÓDIGO LIMPIO Y SIN ERRORES */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- AUDIO ---
    let audioCtx;
    function initAudio() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playAmbience();
    }

    function playAmbience() {
        if(!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle'; 
        osc.frequency.value = 50; 
        gain.gain.value = 0.05;
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start();
    }

    function playSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'SHOOT') {
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'HIT') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        }
    }

    // --- IMÁGENES ---
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png';
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    // --- VARIABLES ---
    let gameRunning = false;
    let score = 0; let ammo = 12; let killCount = 0;
    let zombies = []; let bullets = []; let items = [];
    let boss = null;
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, speed: 5 };

    // --- JOYSTICK ---
    const touchZone = document.getElementById("touch-zone");
    const joyWrapper = document.getElementById("joystick-wrapper");
    const joyStick = document.getElementById("joystick-stick");
    let joyX = 0, joyY = 0;
    let joyStartX = 0, joyStartY = 0;
    let dragging = false;

    if(touchZone) {
        touchZone.addEventListener("touchstart", e => {
            e.preventDefault();
            const t = e.touches[0];
            joyStartX = t.clientX;
            joyStartY = t.clientY;
            dragging = true;
            joyWrapper.style.display = "block";
            joyWrapper.style.left = (joyStartX - 50) + "px";
            joyWrapper.style.top = (joyStartY - 50) + "px";
            joyStick.style.transform = `translate(-50%, -50%)`;
            joyX = 0; joyY = 0;
        });

        touchZone.addEventListener("touchmove", e => {
            e.preventDefault(); if (!dragging) return;
            const t = e.touches[0];
            let dx = t.clientX - joyStartX;
            let dy = t.clientY - joyStartY;
            const dist = Math.hypot(dx, dy);
            if (dist > 50) { const r = 50/dist; dx*=r; dy*=r; }
            joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            joyX = dx/50; joyY = dy/50;
        });

        touchZone.addEventListener("touchend", () => {
            dragging = false; joyWrapper.style.display = "none"; joyX = 0; joyY = 0;
        });
    }

    // --- DISPARO & MOUSE ---
    let mouseX = 0, mouseY = 0;
    window.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY; });

    function shoot() {
        if (ammo > 0) {
            let vx, vy;
            if (dragging) { vx = joyX*15; vy = joyY*15; if(vx===0&&vy===0) vy=-15; }
            else {
                const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
                vx = Math.cos(angle)*15; vy = Math.sin(angle)*15;
            }
            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
            ammo--; document.getElementById("ammo").innerText = ammo;
            playSound('SHOOT');
        }
    }
    
    const btnFire = document.getElementById("btn-fire");
    if(btnFire) btnFire.addEventListener("touchstart", (e)=>{e.preventDefault();shoot();});
    document.addEventListener("mousedown", (e)=>{ if(gameRunning && e.target.tagName !== 'BUTTON') shoot(); });

    // TECLADO
    const keys = {};
    window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

    // --- LOOP ---
    function update() {
        if(!gameRunning) return;

        let dx = joyX; let dy = joyY;
        if(!dragging) {
            if(keys['d']) dx=1; if(keys['a']) dx=-1;
            if(keys['s']) dy=1; if(keys['w']) dy=-1;
        }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height, player.y));

        // Balas
        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i];
            b.x += b.vx; b.y += b.vy;
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score++; killCount++; document.getElementById("score").innerText = score;
                    if(killCount === 10) spawnBoss();
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1);
                if(boss.hp <= 0) { boss=null; score+=500; killCount=0; document.getElementById("log").innerText="JEFE DERROTADO"; }
            }
        }

        // Zombis
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) {
                player.hp -= 0.5; document.getElementById("health-bar").style.width = player.hp+"%";
            }
        });

        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle)*2; boss.y += Math.sin(angle)*2;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) player.hp -= 1;
        }

        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) {
                ammo += 10; document.getElementById("ammo").innerText = ammo;
                items.splice(i,1);
            }
        }
        if(player.hp <= 0) location.reload();
    }

    function spawnBoss() {
        boss = { x: canvas.width/2, y: -100, hp: 50, maxHp: 50 };
        document.getElementById("log").innerText = "¡ALERTA BIOLÓGICA!";
    }

    function draw() {
        if(imgGround.complete) {
            const ptrn = ctx.createPattern(imgGround, 'repeat');
            ctx.fillStyle = ptrn; ctx.fillRect(0,0,canvas.width,canvas.height);
        } else { ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height); }

        items.forEach(it => {
            ctx.shadowBlur = 15; ctx.shadowColor = "#4a90e2";
            if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40);
            else { ctx.fillStyle='#4a90e2'; ctx.fillRect(it.x-15, it.y-15, 30, 30); }
            ctx.shadowBlur = 0;
        });

        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        
        if(boss && imgBoss.complete) {
            ctx.shadowBlur = 25; ctx.shadowColor = "#4a90e2";
            ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128);
            ctx.shadowBlur = 0;
            ctx.fillStyle='#333'; ctx.fillRect(boss.x-50, boss.y-80, 100, 8);
            ctx.fillStyle='#e74c3c'; ctx.fillRect(boss.x-50, boss.y-80, 100*(boss.hp/boss.maxHp), 8);
        }

        bullets.forEach(b => { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
    }

    function loop() { if(gameRunning) { update(); draw(); requestAnimationFrame(loop); } }

    const startBtn = document.getElementById("start-btn");
    if(startBtn) {
        startBtn.onclick = () => {
            initAudio();
            document.getElementById("menu-screen").style.display = "none";
            document.getElementById("game-ui").style.display = "block";
            gameRunning = true;
            setInterval(() => { if(!boss) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+Math.random()}); }, 900);
            setInterval(() => items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height}), 8000);
            loop();
        };
    }
});