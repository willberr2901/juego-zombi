/* script.js - V15.0 ESTABLE Y SIN ERRORES */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- AUDIO (SOLO SFX) ---
    let audioCtx;
    function initAudio() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'SHOOT') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        }
    }

    // --- ASSETS ---
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    // --- VARIABLES ---
    let gameRunning = false;
    let score = 0, level = 1, ammo = 12;
    let zombies = [], bullets = [], items = [], boss = null;
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, speed: 5 };

    // --- CONTROLES MÓVIL ---
    const touchZone = document.getElementById("touch-zone");
    const joyWrapper = document.getElementById("joystick-wrapper");
    const joyStick = document.getElementById("joystick-stick");
    let joyX = 0, joyY = 0, dragging = false, startX, startY;

    if(touchZone) {
        touchZone.addEventListener("touchstart", e => {
            e.preventDefault();
            const t = e.touches[0]; startX = t.clientX; startY = t.clientY; dragging = true;
            joyWrapper.style.display = "block";
            joyWrapper.style.left = (startX-60)+"px"; joyWrapper.style.top = (startY-60)+"px";
            joyStick.style.transform = `translate(-50%, -50%)`; joyX=0; joyY=0;
        });
        touchZone.addEventListener("touchmove", e => {
            if(!dragging) return; e.preventDefault();
            const t = e.touches[0];
            let dx = t.clientX-startX; let dy = t.clientY-startY;
            const dist = Math.hypot(dx, dy);
            if(dist>50) { const r=50/dist; dx*=r; dy*=r; }
            joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            joyX=dx/50; joyY=dy/50;
        });
        touchZone.addEventListener("touchend", () => { dragging=false; joyWrapper.style.display="none"; joyX=0; joyY=0; });
    }

    // --- CONTROLES PC ---
    const keys = {};
    window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
    
    window.addEventListener("mousedown", e => {
        if(gameRunning && e.target.tagName !== 'BUTTON') shoot();
    });

    function shoot() {
        if(ammo <= 0) return;
        let vx = joyX*15, vy = joyY*15;
        if(!dragging) vy = -15; 
        bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
        ammo--; updateHUD(); playSound('SHOOT');
    }
    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});

    // --- LÓGICA JUEGO ---
    function update() {
        let dx = joyX, dy = joyY;
        if(!dragging) {
            if(keys['d'] || keys['arrowright']) dx=1; 
            if(keys['a'] || keys['arrowleft']) dx=-1;
            if(keys['s'] || keys['arrowdown']) dy=1; 
            if(keys['w'] || keys['arrowup']) dy=-1;
        }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height, player.y));

        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i]; b.x += b.vx; b.y += b.vy;
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; updateHUD();
                    if(score % 500 === 0 && !boss) spawnBoss();
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1);
                if(boss.hp <= 0) { boss=null; score+=1000; updateHUD(); }
            }
        }

        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) {
                player.hp -= 0.5; updateHUD();
            }
        });

        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle)*2; boss.y += Math.sin(angle)*2;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) { player.hp -= 1; updateHUD(); }
        }

        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) {
                ammo += 10; items.splice(i,1); updateHUD();
            }
        }
        if(player.hp <= 0) location.reload();
    }

    function spawnBoss() { boss = { x: canvas.width/2, y: -100, hp: 50, maxHp: 50 }; }

    function updateHUD() {
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("health").innerText = Math.floor(player.hp);
    }

    function draw() {
        if(imgGround.complete) {
            const ptrn = ctx.createPattern(imgGround, 'repeat');
            ctx.fillStyle = ptrn; ctx.fillRect(0,0,canvas.width,canvas.height);
        } else { ctx.fillStyle='#333'; ctx.fillRect(0,0,canvas.width,canvas.height); }

        items.forEach(it => { if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); });
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        if(boss && imgBoss.complete) { ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); }
        bullets.forEach(b => { ctx.fillStyle='yellow'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
    }

    function loop() { if(gameRunning) { update(); draw(); requestAnimationFrame(loop); } }

    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true;
        setInterval(() => { if(!boss) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.1}); }, 1000);
        setInterval(() => items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height}), 8000);
        loop();
    };
});
