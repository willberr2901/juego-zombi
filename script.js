/* script.js - V28.1 CORRECCIÓN NOMBRE IMAGEN (asfalto.png) */

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
        } else if (type === 'NUKE') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 1);
            gain.gain.setValueAtTime(0.5, now); gain.gain.linearRampToValueAtTime(0, now + 1);
            osc.start(now); osc.stop(now + 1);
        }
    }

    // --- AQUÍ ESTÁ EL CAMBIO: Apunta a 'asfalto.png' ---
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png'; 
    
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    let gameRunning = false, score = 0, level = 1, ammo = 12, maxAmmo = 12;
    let killCount = 0, killsForNextLevel = 10;
    let zombies = [], bullets = [], items = [], boss = null;
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
    });

    function getNearestZombie() {
        let nearest = null, minDist = Infinity;
        zombies.forEach(z => {
            const dist = Math.hypot(z.x - player.x, z.y - player.y);
            if (dist < minDist) { minDist = dist; nearest = z; }
        });
        if (boss) {
            const dist = Math.hypot(boss.x - player.x, boss.y - player.y);
            if (dist < minDist) return boss;
        }
        return nearest;
    }

    function triggerNuke() {
        const pulse = document.getElementById("pulse-wave");
        pulse.classList.remove("pulse-active"); void pulse.offsetWidth;
        pulse.classList.add("pulse-active"); playSound('NUKE');
        zombies = []; if(boss) boss.hp -= 20; player.hp = Math.min(player.maxHp, player.hp + 50); ammo = maxAmmo;
    }

    function levelUp() {
        level++; killsForNextLevel += 5; killCount = 0; triggerNuke();
        const banner = document.getElementById('combat-banner');
        document.getElementById('banner-msg').innerText = "¡NIVEL " + level + "! ZONA LIMPIA";
        banner.className = "banner-container banner-active banner-green";
        setTimeout(() => { banner.className = "banner-container"; }, 3000);
        updateHUD();
    }

    function updateHUD() {
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("level").innerText = level;
        document.getElementById("kills-left").innerText = (killsForNextLevel - killCount);
        document.getElementById("health-num").innerText = Math.max(0, Math.floor(player.hp));
        document.getElementById("health-bar").style.width = Math.max(0, player.hp) + "%";
    }

    function shoot() {
        if(ammo <= 0) return;
        let vx, vy;
        if (!isMobile) {
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            vx = Math.cos(angle) * 15; vy = Math.sin(angle) * 15;
        } else {
            if (dragging) { vx = joyX * 15; vy = joyY * 15; }
            else {
                const target = getNearestZombie();
                if (target) { const angle = Math.atan2(target.y - player.y, target.x - player.x); vx = Math.cos(angle) * 15; vy = Math.sin(angle) * 15; }
                else { vx = 0; vy = -15; }
            }
        }
        bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
        ammo--; updateHUD(); playSound('SHOOT');
    }
    
    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    window.addEventListener("mousedown", e => { if(gameRunning && e.target.tagName !== 'BUTTON') shoot(); });

    function update() {
        let dx = joyX, dy = joyY;
        const keys = {}; 
        if(!dragging) { if(keys['d']) dx=1; }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x)); player.y = Math.max(0, Math.min(canvas.height, player.y));

        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i]; b.x += b.vx; b.y += b.vy;
            if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) { bullets.splice(i,1); continue; }
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; killCount++; updateHUD();
                    if (killCount >= killsForNextLevel) levelUp();
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1);
                if(boss.hp <= 0) { boss=null; score+=1000; levelUp(); }
            }
        }
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x); z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) { 
                player.hp -= 0.5; updateHUD();
                document.getElementById("blood-screen").style.boxShadow = "inset 0 0 100px rgba(255,0,0,0.8)";
                setTimeout(()=>document.getElementById("blood-screen").style.boxShadow="none", 100);
            }
        });
        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x); boss.x += Math.cos(angle)*2; boss.y += Math.sin(angle)*2;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) { player.hp -= 1; updateHUD(); }
        }
        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) { ammo += 10; items.splice(i,1); updateHUD(); }
        }
        if(player.hp <= 0) location.reload();
    }

    function draw() {
        if(imgGround.complete) {
            // Dibuja la imagen estirada
            ctx.drawImage(imgGround, 0, 0, canvas.width, canvas.height);
            
            // Capa de oscuridad (Filtro)
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0,0,canvas.width,canvas.height);
        } else {
            // Fondo de respaldo si falla la imagen
            ctx.fillStyle='#111'; 
            ctx.fillRect(0,0,canvas.width,canvas.height);
        }

        items.forEach(it => { if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); });
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        if(boss && imgBoss.complete) { ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); }
        
        bullets.forEach(b => { 
            ctx.fillStyle='#ff0'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur=10; ctx.shadowColor='orange';
        });
        ctx.shadowBlur=0;
    }

    const k = {};
    window.addEventListener("keydown", e => k[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => k[e.key.toLowerCase()] = false);
    function updatePCKeys() {
        if (!dragging) {
            let dx=0, dy=0;
            if(k['d']||k['arrowright']) dx=1; if(k['a']||k['arrowleft']) dx=-1;
            if(k['s']||k['arrowdown']) dy=1; if(k['w']||k['arrowup']) dy=-1;
            player.x += dx * player.speed; player.y += dy * player.speed;
        }
    }

    function loop() { if(gameRunning) { update(); updatePCKeys(); draw(); requestAnimationFrame(loop); } }

    const touchZone = document.getElementById("touch-zone");
    const joyWrapper = document.getElementById("joystick-wrapper");
    const joyStick = document.getElementById("joystick-stick");
    let joyX = 0, joyY = 0, dragging = false, startX, startY;
    if(touchZone) {
        touchZone.addEventListener("touchstart", e => { e.preventDefault(); const t = e.touches[0]; startX = t.clientX; startY = t.clientY; dragging = true; joyWrapper.style.display = "block"; joyWrapper.style.left = (startX-60)+"px"; joyWrapper.style.top = (startY-60)+"px"; joyStick.style.transform = `translate(-50%, -50%)`; joyX=0; joyY=0; });
        touchZone.addEventListener("touchmove", e => { if(!dragging) return; e.preventDefault(); const t = e.touches[0]; let dx = t.clientX-startX; let dy = t.clientY-startY; const dist = Math.hypot(dx, dy); if(dist>50) { const r=50/dist; dx*=r; dy*=r; } joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; joyX=dx/50; joyY=dy/50; });
        touchZone.addEventListener("touchend", () => { dragging=false; joyWrapper.style.display="none"; joyX=0; joyY=0; });
    }

    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true;
        resize(); 
        setInterval(() => { if(!boss) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.2}); }, 1000);
        setInterval(() => items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height}), 8000);
        updateHUD(); loop();
    };
});
