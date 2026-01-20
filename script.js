/* script.js - V2.0 PRO UI + SYNTH AUDIO */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // IMÁGENES
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';
    const imgDog = new Image(); imgDog.src = 'imagenes/dog.png'; 

    // VARIABLES
    let gameRunning = false, isPaused = false;
    let score = 0, level = 1, ammo = 12, maxAmmo = 12;
    let killCount = 0, killsForNextLevel = 10;
    let isInvincible = false;

    // Récord
    let highScore = localStorage.getItem('ciudadZ_record') || 0; 
    const bestScoreEl = document.getElementById('best-score');
    if(bestScoreEl) bestScoreEl.innerText = highScore;
    
    // Intervalos
    let zombieInterval = null, dogInterval = null, itemInterval = null;
    let zombies = [], dogs = [], bullets = [], items = [], particles = []; 
    let boss = null;
    let player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };

    // --- AUDIO PRO (SINTETIZADO SIN DESCARGAS) ---
    let audioCtx;
    function initAudio() { 
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
        if(audioCtx.state==='suspended') audioCtx.resume(); 
    }

    // 1. Sonido de Disparo (Ruido Blanco)
    function shootSound() {
        if(!audioCtx) return;
        const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 segundos
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generar ruido aleatorio
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        // Filtro para que suene como disparo y no estática
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.1);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    }

    // 2. Tonos simples (Powerups / Daño)
    function playTone(f, t, dur=0.1) { 
        if(!audioCtx) return; 
        const o=audioCtx.createOscillator(), g=audioCtx.createGain(); 
        o.connect(g); g.connect(audioCtx.destination); 
        o.frequency.value=f; o.type=t; 
        g.gain.value=0.1; o.start(); o.stop(audioCtx.currentTime+dur); 
    }

    // --- ALERTAS ---
    function showAlert(title, sub) {
        const alertBox = document.getElementById("big-alert");
        document.getElementById("alert-title").innerText = title;
        document.getElementById("alert-sub").innerText = sub;
        alertBox.classList.add("alert-visible");
        setTimeout(() => { alertBox.classList.remove("alert-visible"); }, 3000);
    }

    // --- JUEGO ---
    function levelUp() {
        level++;
        killsForNextLevel += 5;
        killCount = 0;
        ammo = maxAmmo;
        player.hp = Math.min(player.maxHp, player.hp + 30);
        zombies = []; dogs = [];
        showAlert("¡NIVEL " + level + "!", "AMENAZA CRECIENTE");
        playTone(600, 'sine', 0.5); // Sonido de nivel
        updateHUD();
    }

    function spawnBoss() {
        boss = { x: canvas.width/2, y: -100, hp: 200 + (level*50), maxHp: 200 + (level*50) };
        document.getElementById("boss-hud").style.display = "flex";
        showAlert("¡ALERTA!", "PACIENTE CERO DETECTADO");
        playTone(100, 'sawtooth', 1.0); // Sonido grave de alerta
    }

    function updateHUD() {
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("level").innerText = level;
        document.getElementById("health-num").innerText = Math.floor(player.hp);
        document.getElementById("health-bar").style.width = Math.max(0, player.hp) + "%";
        
        if (boss) document.getElementById("boss-health-bar").style.width = (boss.hp / boss.maxHp * 100) + "%";
        else document.getElementById("boss-hud").style.display = "none";
    }

    function shoot() {
        if(ammo <= 0 || isPaused) return;
        let vx, vy;
        if (!isMobile) {
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            vx = Math.cos(angle) * 20; vy = Math.sin(angle) * 20;
        } else {
            if (dragging) { vx = joyX * 20; vy = joyY * 20; }
            else { vx = 0; vy = -20; }
        }

        if (level >= 3) { // Escopeta
            const angle = Math.atan2(vy, vx);
            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
            bullets.push({x: player.x, y: player.y, vx: Math.cos(angle - 0.3) * 20, vy: Math.sin(angle - 0.3) * 20});
            bullets.push({x: player.x, y: player.y, vx: Math.cos(angle + 0.3) * 20, vy: Math.sin(angle + 0.3) * 20});
            shootSound(); // SONIDO PRO
        } else {
            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
            shootSound(); // SONIDO PRO
        }
        
        ammo--; updateHUD(); 
    }

    function update() {
        let dx = joyX, dy = joyY;
        if(!dragging) { if(k['d']) dx=1; if(k['a']) dx=-1; if(k['s']) dy=1; if(k['w']) dy=-1; }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x)); 
        player.y = Math.max(0, Math.min(canvas.height, player.y));

        // Balas
        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i]; b.x += b.vx; b.y += b.vy;
            if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) { bullets.splice(i,1); continue; }
            
            // Zombies
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 35) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; killCount++; updateHUD();
                    if (killCount >= killsForNextLevel && !boss) levelUp();
                    if (score > 0 && score % 300 === 0 && !boss) spawnBoss();
                    break;
                }
            }
            // Perros
            for(let j=dogs.length-1; j>=0; j--){
                if(Math.hypot(b.x-dogs[j].x, b.y-dogs[j].y) < 25) {
                    dogs.splice(j,1); bullets.splice(i,1);
                    score+=15; killCount++; updateHUD();
                    if (killCount >= killsForNextLevel && !boss) levelUp();
                    break;
                }
            }
            // Boss
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp -= 5; bullets.splice(i,1); updateHUD();
                if(boss.hp <= 0) { boss=null; score+=500; levelUp(); showAlert("¡JEFE ELIMINADO!", "+500 PUNTOS"); }
            }
        }

        // Enemigos Atacando
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30 && !isInvincible) { 
                player.hp -= 0.5; updateHUD(); damageEffect(); 
            }
        });
        dogs.forEach(d => {
            let angle = Math.atan2(player.y - d.y, player.x - d.x);
            d.x += Math.cos(angle)*d.speed; d.y += Math.sin(angle)*d.speed;
            if(Math.hypot(player.x-d.x, player.y-d.y) < 25 && !isInvincible) { 
                player.hp -= 0.2; updateHUD(); damageEffect(); 
            }
        });
        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle)*2.5; boss.y += Math.sin(angle)*2.5;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50 && !isInvincible) { player.hp -= 1; updateHUD(); }
        }

        // Ítems
        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) { 
                if (items[i].type === 'shield') {
                    isInvincible = true; showAlert("¡ESCUDO ACTIVO!", "INVENCIBLE"); playTone(600, 'sine', 0.3);
                    setTimeout(() => { isInvincible = false; showAlert("¡ESCUDO AGOTADO!", "CUIDADO"); }, 5000);
                } else {
                    ammo += 10; updateHUD(); playTone(800, 'square', 0.1);
                }
                items.splice(i,1); 
            }
        }

        if(player.hp <= 0) {
            if (score > highScore) { highScore = score; localStorage.setItem('ciudadZ_record', highScore); document.getElementById('best-score').innerText = highScore; }
            showPauseMenu("¡AGENTE CAÍDO!");
        }
    }

    function damageEffect() {
        const bs = document.getElementById("blood-screen");
        bs.style.boxShadow = "inset 0 0 50px rgba(255,0,0,0.5)";
        setTimeout(()=>bs.style.boxShadow="none", 100);
    }

    function draw() {
        ctx.fillStyle = '#222'; ctx.fillRect(0,0,canvas.width,canvas.height); 
        if(imgGround.complete) { ctx.drawImage(imgGround, 0, 0, canvas.width, canvas.height); ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(0,0,canvas.width,canvas.height); }

        items.forEach(it => { 
            if (it.type === 'shield') {
                ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = "bold 12px Arial"; ctx.fillText("S", it.x-4, it.y+4); ctx.restore();
            } else if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); 
        });

        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        
        dogs.forEach(d => {
            if(imgDog.complete && imgDog.naturalHeight !== 0) ctx.drawImage(imgDog, d.x-25, d.y-25, 50, 50); 
            else { ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.arc(d.x, d.y, 20, 0, Math.PI*2); ctx.fill(); }
        });

        if(boss && imgBoss.complete) ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); 

        if(imgPlayer.complete) {
            if (isInvincible) { ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff'; }
            ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
            if (isInvincible) ctx.restore();
        }

        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4;
        bullets.forEach(b => { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx, b.y - b.vy); ctx.stroke(); });
    }

    function loop() { if(gameRunning && !isPaused) { update(); draw(); requestAnimationFrame(loop); } }

    function showPauseMenu(title="JUEGO PAUSADO") {
        isPaused = true;
        document.querySelector(".pause-title").innerText = title;
        document.getElementById("pause-menu").style.display = "flex";
    }
    
    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true; isPaused = false;
        player.hp = 100; score = 0; level = 1; ammo = 12; killCount = 0;
        zombies = []; dogs = []; bullets = []; items = []; boss = null;
        resize();
        if (zombieInterval) clearInterval(zombieInterval);
        if (dogInterval) clearInterval(dogInterval);
        if (itemInterval) clearInterval(itemInterval);

        zombieInterval = setInterval(() => { if(!boss && !isPaused && gameRunning) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.2}); }, 1000);
        dogInterval = setInterval(() => { if(!boss && !isPaused && gameRunning && level >= 1) dogs.push({x:Math.random()*canvas.width, y:canvas.height+50, speed:3+level*0.3}); }, 3000);
        itemInterval = setInterval(() => { if(!isPaused && gameRunning) items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, type: Math.random()>0.8?'shield':'ammo'}); }, 8000);
        
        updateHUD(); loop();
    };

    document.getElementById("pause-btn").onclick = () => showPauseMenu();
    document.getElementById("resume-btn").onclick = () => { if(player.hp > 0) { isPaused = false; document.getElementById("pause-menu").style.display="none"; loop(); } };
    document.getElementById("restart-btn").onclick = () => { document.getElementById("start-btn").click(); document.getElementById("pause-menu").style.display="none"; };
    document.getElementById("home-btn").onclick = () => location.reload();

    // INPUTS
    const k={}; let mouseX=0, mouseY=0, joyX=0, joyY=0, dragging=false, startX, startY;
    window.addEventListener("keydown", e => k[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => k[e.key.toLowerCase()] = false);
    window.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; });
    
    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    window.addEventListener("mousedown", e => { if(gameRunning && !isPaused && e.target.tagName !== 'BUTTON') shoot(); });

    const touchZone = document.getElementById("touch-zone");
    const joyWrapper = document.getElementById("joystick-wrapper");
    const joyStick = document.getElementById("joystick-stick");

    if(touchZone) {
        const stopDrag = () => { dragging = false; joyWrapper.style.display = "none"; joyX = 0; joyY = 0; };
        touchZone.addEventListener("touchstart", e => { if(isPaused) return; e.preventDefault(); const t = e.touches[0]; startX = t.clientX; startY = t.clientY; dragging = true; joyWrapper.style.display = "block"; joyWrapper.style.left = (startX - 60) + "px"; joyWrapper.style.top = (startY - 60) + "px"; joyStick.style.transform = `translate(-50%, -50%)`; joyX = 0; joyY = 0; });
        touchZone.addEventListener("touchmove", e => { if(!dragging || isPaused) return; e.preventDefault(); const t = e.touches[0]; let dx = t.clientX - startX; let dy = t.clientY - startY; const dist = Math.hypot(dx, dy); if(dist > 50){ const r = 50 / dist; dx *= r; dy *= r; } joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; joyX = dx / 50; joyY = dy / 50; });
        touchZone.addEventListener("touchend", stopDrag); touchZone.addEventListener("touchcancel", stopDrag); 
    }
});
