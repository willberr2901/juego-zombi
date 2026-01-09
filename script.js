/* script.js - V36.0 FINAL CUMPLIMIENTO TOTAL */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SETUP CANVAS
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 2. RECURSOS (IMÁGENES)
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    // 3. VARIABLES DE ESTADO
    let gameRunning = false;
    let isPaused = false;
    let score = 0, level = 1, ammo = 12, maxAmmo = 12;
    let killCount = 0, killsForNextLevel = 10;
    
    let zombies = [];
    let bullets = [];
    let items = [];
    let particles = []; // Sangre
    let boss = null;
    
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };

    // --- AUDIO SIMPLIFICADO ---
    let audioCtx;
    function initAudio() {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(audioCtx.state === 'suspended') audioCtx.resume();
    }
    function playTone(freq, type) {
        if(!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }

    // --- EFECTOS VISUALES (SANGRE) ---
    function spawnBlood(x, y) {
        for(let i=0; i<8; i++){
            particles.push({
                x: x, y: y,
                vx: (Math.random()-0.5)*10,
                vy: (Math.random()-0.5)*10,
                life: 1.0, size: Math.random()*5+2
            });
        }
    }

    // --- MENSAJES EN PANTALLA ---
    function showBigMessage(title, sub) {
        const el = document.getElementById("big-message");
        document.getElementById("msg-title").innerText = title;
        document.getElementById("msg-sub").innerText = sub;
        el.classList.add("show-msg");
        setTimeout(() => el.classList.remove("show-msg"), 3000);
    }

    // --- LOGICA DEL JUEGO ---
    function levelUp() {
        level++;
        killsForNextLevel += 5;
        killCount = 0;
        ammo = maxAmmo;
        player.hp = Math.min(player.maxHp, player.hp + 25);
        
        // Regalo: Matar a todos los zombis normales
        zombies.forEach(z => spawnBlood(z.x, z.y));
        zombies = [];
        
        document.getElementById("flash-overlay").style.opacity = 0.5;
        setTimeout(() => document.getElementById("flash-overlay").style.opacity = 0, 200);
        
        showBigMessage("¡NIVEL " + level + "!", "SUMINISTROS RECARGADOS");
        updateHUD();
    }

    function spawnBoss() {
        boss = { x: canvas.width/2, y: -100, hp: 200 + (level*50), maxHp: 200 + (level*50) };
        document.getElementById("boss-container").style.display = "flex";
        showBigMessage("¡ALERTA!", "PACIENTE CERO DETECTADO");
    }

    function updateHUD() {
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("level").innerText = level;
        document.getElementById("hp-text").innerText = Math.floor(player.hp);
        document.getElementById("hp-bar").style.width = Math.max(0, player.hp) + "%";
        
        if(boss) {
            document.getElementById("boss-bar").style.width = (boss.hp / boss.maxHp * 100) + "%";
        } else {
            document.getElementById("boss-container").style.display = "none";
        }
    }

    function shoot() {
        if(ammo <= 0 || isPaused) return;
        let vx, vy;
        if(!isMobile) {
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            vx = Math.cos(angle)*20; vy = Math.sin(angle)*20;
        } else {
            if(dragging) { vx = joyX*20; vy = joyY*20; }
            else {
                // Auto aim
                let target = boss || zombies[0]; 
                if(target) {
                    const angle = Math.atan2(target.y - player.y, target.x - player.x);
                    vx = Math.cos(angle)*20; vy = Math.sin(angle)*20;
                } else { vx=0; vy=-20; }
            }
        }
        bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
        ammo--; updateHUD(); playTone(600, 'square');
    }

    // --- LOOP PRINCIPAL ---
    function update() {
        // Movimiento
        let dx = joyX, dy = joyY;
        if(!dragging) { if(k['d']) dx=1; if(k['a']) dx=-1; if(k['s']) dy=1; if(k['w']) dy=-1; }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height, player.y));

        // Balas
        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i]; b.x += b.vx; b.y += b.vy;
            if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) { bullets.splice(i,1); continue; }
            
            // Colisión Zombie
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 35) {
                    spawnBlood(zombies[j].x, zombies[j].y);
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; killCount++; updateHUD();
                    if(killCount >= killsForNextLevel && !boss) levelUp();
                    if(score > 0 && score % 300 === 0 && !boss) spawnBoss();
                    break;
                }
            }
            // Colisión Jefe
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp -= 5; bullets.splice(i,1); updateHUD();
                spawnBlood(boss.x, boss.y);
                if(boss.hp <= 0) {
                    boss = null; score+=1000; levelUp();
                    showBigMessage("¡ENEMIGO ELIMINADO!", "+1000 PUNTOS");
                }
            }
        }

        // Partículas (Sangre)
        for(let i=particles.length-1; i>=0; i--){
            let p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.05;
            if(p.life <= 0) particles.splice(i,1);
        }

        // Daño Jugador
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) {
                player.hp -= 0.5; updateHUD();
                document.getElementById("damage-overlay").style.boxShadow = "inset 0 0 50px rgba(200,0,0,0.5)";
                setTimeout(()=>document.getElementById("damage-overlay").style.boxShadow="none", 100);
            }
        });

        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle)*2; boss.y += Math.sin(angle)*2;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) { player.hp -= 1; updateHUD(); }
        }

        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) { ammo += 10; items.splice(i,1); updateHUD(); }
        }

        if(player.hp <= 0) togglePause("¡MISION FALLIDA!");
    }

    function draw() {
        // 1. FONDO DE SEGURIDAD (GRIS) + IMAGEN
        ctx.fillStyle = '#34495e'; ctx.fillRect(0,0,canvas.width,canvas.height); // Fondo base
        if(imgGround.complete && imgGround.naturalWidth > 0) {
            ctx.drawImage(imgGround, 0, 0, canvas.width, canvas.height);
        }
        
        // 2. SANGRE
        particles.forEach(p => {
            ctx.globalAlpha = p.life; ctx.fillStyle = "#8a0303";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // 3. ENTIDADES
        items.forEach(it => { if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); });
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        if(boss && imgBoss.complete) { ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); }

        // 4. BALAS TRAZADORAS
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4;
        bullets.forEach(b => {
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx, b.y - b.vy); ctx.stroke();
        });
    }

    function loop() { if(gameRunning && !isPaused) { update(); draw(); requestAnimationFrame(loop); } }

    // --- SISTEMA DE PAUSA ---
    function togglePause(title="JUEGO PAUSADO") {
        isPaused = !isPaused;
        const menu = document.getElementById("pause-menu");
        if(isPaused) {
            menu.style.display = "flex";
            document.querySelector("#pause-menu h2").innerText = title;
            document.getElementById("pause-score").innerText = score;
        } else {
            menu.style.display = "none";
            loop();
        }
    }

    // --- CONTROLES Y EVENTOS ---
    const k={}; let mouseX=0, mouseY=0, joyX=0, joyY=0, dragging=false, startX, startY;
    window.addEventListener("keydown", e => k[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => k[e.key.toLowerCase()] = false);
    window.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; });

    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true; isPaused = false;
        player.hp=100; score=0; level=1; ammo=12; killCount=0;
        zombies=[]; bullets=[]; items=[]; boss=null; particles=[];
        resize();
        setInterval(() => { if(gameRunning && !isPaused && !boss) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.2}); }, 1000);
        setInterval(() => { if(gameRunning && !isPaused) items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height}); }, 8000);
        updateHUD(); loop();
    };

    document.getElementById("pause-btn").onclick = () => togglePause();
    document.getElementById("resume-btn").onclick = () => { if(player.hp > 0) togglePause(); };
    document.getElementById("restart-btn").onclick = () => { document.getElementById("start-btn").click(); document.getElementById("pause-menu").style.display="none"; };
    document.getElementById("home-btn").onclick = () => location.reload();
    document.getElementById("fire-btn").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    window.addEventListener("mousedown", e => { if(gameRunning && !isPaused && e.target.tagName !== 'BUTTON') shoot(); });

    // Joystick Logic
    const touchZone = document.getElementById("touch-zone");
    const joyBase = document.getElementById("joy-base");
    const joyStick = document.getElementById("joy-stick");
    if(touchZone) {
        touchZone.addEventListener("touchstart", e => { if(isPaused) return; e.preventDefault(); const t=e.touches[0]; startX=t.clientX; startY=t.clientY; dragging=true; joyBase.style.display="block"; joyBase.style.left=(startX-60)+"px"; joyBase.style.top=(startY-60)+"px"; joyStick.style.transform=`translate(-50%, -50%)`; joyX=0; joyY=0; });
        touchZone.addEventListener("touchmove", e => { if(!dragging || isPaused) return; e.preventDefault(); const t=e.touches[0]; let dx=t.clientX-startX; let dy=t.clientY-startY; const dist=Math.hypot(dx, dy); if(dist>50){ const r=50/dist; dx*=r; dy*=r; } joyStick.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; joyX=dx/50; joyY=dy/50; });
        touchZone.addEventListener("touchend", () => { dragging=false; joyBase.style.display="none"; joyX=0; joyY=0; });
    }
});
