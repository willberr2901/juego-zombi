/* script.js - V23.0 LÓGICA DE ALERTAS */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // AUDIO
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
            osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'ALARM') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.3, now); osc.start(now); osc.stop(now + 1.0);
        }
    }

    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    let gameRunning = false, score = 0, level = 1, ammo = 12, maxAmmo = 12;
    let zombies = [], bullets = [], items = [], boss = null;
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };

    // --- SISTEMA DE ALERTAS VISUALES ---
    function triggerAlert(msg, type) {
        const banner = document.getElementById('combat-banner');
        const text = document.getElementById('banner-msg');
        
        text.innerText = msg;
        banner.className = "banner-container banner-active"; // Activar
        
        if(type === 'GOOD') banner.classList.add('banner-green');
        else banner.classList.remove('banner-green');

        playSound('ALARM');

        setTimeout(() => {
            banner.className = "banner-container"; // Ocultar
        }, 3000);
    }

    function triggerDamageEffect() {
        const screen = document.getElementById('blood-screen');
        screen.style.boxShadow = "inset 0 0 100px rgba(255,0,0,0.8)";
        setTimeout(() => { screen.style.boxShadow = "inset 0 0 0 rgba(255,0,0,0)"; }, 200);
    }

    function updateHUD() {
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("level").innerText = level;
        document.getElementById("health-num").innerText = Math.max(0, Math.floor(player.hp));
        document.getElementById("health-bar").style.width = Math.max(0, player.hp) + "%";
    }

    // --- GAME LOOP ---
    function update() {
        let dx = joyX, dy = joyY;
        if(!dragging) { if(keys['d']||keys['arrowright']) dx=1; if(keys['a']||keys['arrowleft']) dx=-1; if(keys['s']||keys['arrowdown']) dy=1; if(keys['w']||keys['arrowup']) dy=-1; }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x)); player.y = Math.max(0, Math.min(canvas.height, player.y));

        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i]; b.x += b.vx; b.y += b.vy;
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; updateHUD();
                    // Alerta de Jefe
                    if(score > 0 && score % 500 === 0 && !boss) {
                        boss = { x: canvas.width/2, y: -100, hp: 50 + (level*10), maxHp: 50 + (level*10) };
                        triggerAlert("¡ADVERTENCIA: JEFE EN CAMINO!", "BAD");
                    }
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1);
                if(boss.hp <= 0) { 
                    boss=null; score+=1000; level++; ammo=maxAmmo; 
                    triggerAlert("¡AMENAZA ELIMINADA! NIVEL " + level, "GOOD");
                    updateHUD();
                }
            }
        }

        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x); z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) { 
                player.hp -= 0.5; updateHUD(); triggerDamageEffect();
            }
        });

        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x); boss.x += Math.cos(angle)*2; boss.y += Math.sin(angle)*2;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) { player.hp -= 1; updateHUD(); triggerDamageEffect(); }
        }

        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) { ammo += 10; items.splice(i,1); updateHUD(); }
        }
        if(player.hp <= 0) location.reload();
    }

    function draw() {
        if(imgGround.complete) { const ptrn = ctx.createPattern(imgGround, 'repeat'); ctx.fillStyle = ptrn; ctx.fillRect(0,0,canvas.width,canvas.height); } else { ctx.fillStyle='#333'; ctx.fillRect(0,0,canvas.width,canvas.height); }
        items.forEach(it => { if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); });
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        if(boss && imgBoss.complete) { ctx.shadowBlur = 20; ctx.shadowColor = "red"; ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); ctx.shadowBlur = 0; }
        bullets.forEach(b => { ctx.fillStyle='yellow'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
    }
    function loop() { if(gameRunning) { update(); draw(); requestAnimationFrame(loop); } }

    // CONTROLES
    const touchZone = document.getElementById("touch-zone");
    const joyWrapper = document.getElementById("joystick-wrapper");
    const joyStick = document.getElementById("joystick-stick");
    let joyX = 0, joyY = 0, dragging = false, startX, startY;
    if(touchZone) {
        touchZone.addEventListener("touchstart", e => { e.preventDefault(); const t = e.touches[0]; startX = t.clientX; startY = t.clientY; dragging = true; joyWrapper.style.display = "block"; joyWrapper.style.left = (startX-60)+"px"; joyWrapper.style.top = (startY-60)+"px"; joyStick.style.transform = `translate(-50%, -50%)`; joyX=0; joyY=0; });
        touchZone.addEventListener("touchmove", e => { if(!dragging) return; e.preventDefault(); const t = e.touches[0]; let dx = t.clientX-startX; let dy = t.clientY-startY; const dist = Math.hypot(dx, dy); if(dist>50) { const r=50/dist; dx*=r; dy*=r; } joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; joyX=dx/50; joyY=dy/50; });
        touchZone.addEventListener("touchend", () => { dragging=false; joyWrapper.style.display="none"; joyX=0; joyY=0; });
    }
    const keys = {}; window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true); window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
    window.addEventListener("mousedown", e => { if(gameRunning && e.target.tagName !== 'BUTTON') shoot(); });

    function shoot() {
        if(ammo <= 0) return;
        let vx = joyX*15, vy = joyY*15; if(!dragging) vy = -15; 
        bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
        ammo--; updateHUD(); playSound('SHOOT');
    }
    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});

    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true;
        setInterval(() => { if(!boss) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.2}); }, 1000);
        setInterval(() => items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height}), 8000);
        updateHUD(); loop();
    };
});
