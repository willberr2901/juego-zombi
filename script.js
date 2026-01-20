/* script.js - V38.0 ACTUALIZACIÓN: PERRO ZOMBIE (HELLHOUND) + INTERFAZ CLÁSICA */

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
    let zombieInterval = null;
    let dogInterval = null; 
    let itemInterval = null;
    
    let zombies = [], dogs = [], bullets = [], items = [], particles = []; 
    let boss = null;
    let player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };

    // AUDIO SIMPLE
    let audioCtx;
    function initAudio() { if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
    function playTone(f, t) { if(!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value=f; o.type=t; g.gain.value=0.1; o.start(); o.stop(audioCtx.currentTime+0.1); }

    // --- EFECTO SANGRE ---
    function spawnBlood(x, y) {
        for(let i=0; i<12; i++){
            particles.push({
                x: x, y: y,
                vx: (Math.random()-0.5)*12, 
                vy: (Math.random()-0.5)*12,
                life: 1.0, 
                size: Math.random()*6+3, 
                color: '#8a0303' 
            });
        }
    }

    // --- ALERTAS ---
    function showAlert(title, sub) {
        const alertBox = document.getElementById("big-alert");
        if(alertBox) {
            document.getElementById("alert-title").innerText = title;
            document.getElementById("alert-sub").innerText = sub;
            alertBox.classList.add("alert-visible");
            setTimeout(() => { alertBox.classList.remove("alert-visible"); }, 3000);
        }
    }

    // --- LÓGICA DE JUEGO ---
    function levelUp() {
        level++;
        killsForNextLevel += 5;
        killCount = 0;
        ammo = maxAmmo;
        player.hp = Math.min(player.maxHp, player.hp + 30);
        
        zombies.forEach(z => spawnBlood(z.x, z.y));
        zombies = [];
        dogs.forEach(d => spawnBlood(d.x, d.y)); 
        dogs = [];
        
        showAlert("¡NIVEL " + level + "!", "RECOMPENSA: MUNICIÓN LLENA");
        updateHUD();
    }

    function spawnBoss() {
        boss = { x: canvas.width/2, y: -100, hp: 200 + (level*50), maxHp: 200 + (level*50) };
        const bossHud = document.getElementById("boss-hud");
        if(bossHud) bossHud.style.display = "flex";
        showAlert("¡ALERTA!", "PACIENTE CERO EN CAMINO");
    }

    function updateHUD() {
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("level").innerText = level;
        document.getElementById("health-num").innerText = Math.floor(player.hp);
        document.getElementById("health-bar").style.width = Math.max(0, player.hp) + "%";
        
        const bossHud = document.getElementById("boss-hud");
        if (boss) {
            if(bossHud) bossHud.style.display = "flex";
            document.getElementById("boss-health-bar").style.width = (boss.hp / boss.maxHp * 100) + "%";
        } else {
            if(bossHud) bossHud.style.display = "none";
        }
    }

    function shoot() {
        if(ammo <= 0 || isPaused) return;
        let vx, vy;
        if (!isMobile) {
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            vx = Math.cos(angle) * 20; vy = Math.sin(angle) * 20;
        } else {
            if (dragging) { 
                vx = joyX * 20; 
                vy = joyY * 20; 
            } else {
                vx = 0; 
                vy = -20; 
            }
        }

        // ESCOPETA (Nivel 3+)
        if (level >= 3) {
            const angle = Math.atan2(vy, vx);
            const spread = 0.3; 
            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
            bullets.push({
                x: player.x, y: player.y, 
                vx: Math.cos(angle - spread) * 20, 
                vy: Math.sin(angle - spread) * 20
            });
            bullets.push({
                x: player.x, y: player.y, 
                vx: Math.cos(angle + spread) * 20, 
                vy: Math.sin(angle + spread) * 20
            });
            playTone(300, 'sawtooth'); 
        } else {
            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
        }
        
        ammo--; updateHUD(); playTone(400, 'square');
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
                    spawnBlood(zombies[j].x, zombies[j].y); 
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; killCount++; updateHUD();
                    if (killCount >= killsForNextLevel && !boss) levelUp();
                    if (score > 0 && score % 300 === 0 && !boss) spawnBoss();
                    break;
                }
            }

            // Perros (Hitbox más pequeña)
            for(let j=dogs.length-1; j>=0; j--){
                if(Math.hypot(b.x-dogs[j].x, b.y-dogs[j].y) < 25) {
                    spawnBlood(dogs[j].x, dogs[j].y); 
                    dogs.splice(j,1); bullets.splice(i,1);
                    score+=15; killCount++; updateHUD(); 
                    if (killCount >= killsForNextLevel && !boss) levelUp();
                    break;
                }
            }

            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp -= 5; bullets.splice(i,1); updateHUD();
                spawnBlood(boss.x, boss.y);
                if(boss.hp <= 0) { 
                    boss=null; score+=500; levelUp(); 
                    showAlert("¡JEFE ELIMINADO!", "+500 PUNTOS");
                }
            }
        }

        // Partículas
        for(let i=particles.length-1; i>=0; i--){
            let p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.03; 
            if(p.life <= 0) particles.splice(i,1);
        }

        // Zombies
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) { 
                if (!isInvincible) { 
                    player.hp -= 0.5; updateHUD();
                    damageEffect();
                }
            }
        });

        // Perros
        dogs.forEach(d => {
            let angle = Math.atan2(player.y - d.y, player.x - d.x);
            d.x += Math.cos(angle)*d.speed; d.y += Math.sin(angle)*d.speed;
            if(Math.hypot(player.x-d.x, player.y-d.y) < 25) { 
                if (!isInvincible) { 
                    player.hp -= 0.2; updateHUD();
                    damageEffect();
                }
            }
        });

        // Boss
        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle)*2.5; boss.y += Math.sin(angle)*2.5;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) { 
                if(!isInvincible) { player.hp -= 1; updateHUD(); }
            }
        }

        // Ítems
        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) { 
                if (items[i].type === 'shield') {
                    isInvincible = true;
                    showAlert("¡ESCUDO ACTIVO!", "INVENCIBLE POR 5s");
                    playTone(600, 'sine'); 
                    setTimeout(() => { 
                        isInvincible = false; 
                        showAlert("¡ESCUDO AGOTADO!", "CUIDADO");
                    }, 5000);
                } else {
                    ammo += 10; updateHUD();
                }
                items.splice(i,1); 
            }
        }

        // Game Over
        if(player.hp <= 0) {
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('ciudadZ_record', highScore);
                const bs = document.getElementById('best-score');
                if(bs) bs.innerText = highScore;
                showAlert("¡NUEVO RÉCORD!", "🏆 " + score + " PUNTOS");
            }
            showPauseMenu("¡MISIÓN FALLIDA!");
        }
    }

    function damageEffect() {
        const bs = document.getElementById("blood-screen");
        if(bs) {
            bs.style.boxShadow = "inset 0 0 50px rgba(255,0,0,0.5)";
            setTimeout(()=>bs.style.boxShadow="none", 100);
        }
    }

    function draw() {
        ctx.fillStyle = '#222'; ctx.fillRect(0,0,canvas.width,canvas.height); 
        if(imgGround.complete) {
            ctx.drawImage(imgGround, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        }

        particles.forEach(p => {
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // ÍTEMS
        items.forEach(it => { 
            if (it.type === 'shield') {
                ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = "bold 12px Arial"; ctx.fillText("S", it.x-4, it.y+4); ctx.restore();
            } else {
                if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); 
            }
        });

        // ZOMBIES
        zombies.forEach(z => { 
            if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); 
        });

        // PERROS
        dogs.forEach(d => {
            if(imgDog.complete && imgDog.naturalHeight !== 0) {
                ctx.drawImage(imgDog, d.x-25, d.y-25, 50, 50); 
            } else {
                ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.arc(d.x, d.y, 20, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#FFFF00'; ctx.beginPath(); ctx.arc(d.x-6, d.y-5, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(d.x+6, d.y-5, 3, 0, Math.PI*2); ctx.fill();
            }
        });

        // JEFE
        if(boss && imgBoss.complete) { 
             ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); 
        }

        // JUGADOR
        if(imgPlayer.complete) {
            if (isInvincible) { ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff'; }
            ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
            if (isInvincible) ctx.restore();
        }

        // BALAS
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4;
        bullets.forEach(b => {
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx, b.y - b.vy); ctx.stroke();
        });
    }

    function loop() { if(gameRunning && !isPaused) { update(); draw(); requestAnimationFrame(loop); } }

    function showPauseMenu(title="JUEGO PAUSADO") {
        isPaused = true;
        document.querySelector(".pause-title").innerText = title;
        document.getElementById("pause-menu").style.display = "flex";
    }
    
    // START BUTTON
    const startBtn = document.getElementById("start-btn");
    if(startBtn) {
        startBtn.onclick = () => {
            initAudio();
            document.getElementById("menu-screen").style.display = "none";
            document.getElementById("game-ui").style.display = "block";
            gameRunning = true; isPaused = false;
            
            player.hp = 100; score = 0; level = 1; ammo = 12; killCount = 0;
            zombies = []; dogs = []; bullets = []; items = []; boss = null; particles = [];
            
            resize();

            if (zombieInterval) clearInterval(zombieInterval);
            if (dogInterval) clearInterval(dogInterval);
            if (itemInterval) clearInterval(itemInterval);

            zombieInterval = setInterval(() => { if(!boss && !isPaused && gameRunning) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.2}); }, 1000);
            dogInterval = setInterval(() => { if(!boss && !isPaused && gameRunning && level >= 1) dogs.push({x:Math.random()*canvas.width, y:canvas.height+50, speed:3+level*0.3}); }, 3000);
            itemInterval = setInterval(() => { if(!isPaused && gameRunning) items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, type: Math.random()>0.8?'shield':'ammo'}); }, 8000);
            
            updateHUD(); loop();
        };
    }

    document.getElementById("pause-btn").onclick = () => showPauseMenu();
    document.getElementById("resume-btn").onclick = () => { if(player.hp > 0) { isPaused = false; document.getElementById("pause-menu").style.display="none"; loop(); } };
    document.getElementById("restart-btn").onclick = () => { document.getElementById("start-btn").click(); document.getElementById("pause-menu").style.display="none"; };
    document.getElementById("home-btn").onclick = () => location.reload();

    // INPUTS
    const k={}; let mouseX=0, mouseY=0, joyX=0, joyY=0, dragging=false, startX, startY;
    window.addEventListener("keydown", e => k[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => k[e.key.toLowerCase()] = false);
    window.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; });
    
    const btnFire = document.getElementById("btn-fire");
    if(btnFire) btnFire.addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    
    window.addEventListener("mousedown", e => { if(gameRunning && !isPaused && e.target.tagName !== 'BUTTON') shoot(); });

    // JOYSTICK
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
