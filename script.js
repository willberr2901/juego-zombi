/* script.js - V24.0 AIMING SYSTEM & REWARDS */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // DETECCIÓN DE MÓVIL
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
        } else if (type === 'NUKE') { // Sonido de bomba
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 1);
            osc.start(now); osc.stop(now + 1);
        }
    }

    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    let gameRunning = false;
    let score = 0, level = 1, ammo = 12, maxAmmo = 12;
    let killCount = 0;
    let killsForNextLevel = 10; // TOPE DE MUERTOS
    let zombies = [], bullets = [], items = [], boss = null;
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };

    // --- PUNTERÍA PC (MOUSE) ---
    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // --- AUTO-AIM (MÓVIL) ---
    function getNearestZombie() {
        let nearest = null;
        let minDist = Infinity;
        zombies.forEach(z => {
            const dist = Math.hypot(z.x - player.x, z.y - player.y);
            if (dist < minDist) { minDist = dist; nearest = z; }
        });
        if (boss) { // El jefe tiene prioridad
            const dist = Math.hypot(boss.x - player.x, boss.y - player.y);
            if (dist < minDist) return boss;
        }
        return nearest;
    }

    // --- SISTEMA DE NIVELES Y BOMBA ---
    function triggerNuke() {
        // Efecto visual
        const pulse = document.getElementById("pulse-wave");
        pulse.classList.remove("pulse-active");
        void pulse.offsetWidth; // Reiniciar animación
        pulse.classList.add("pulse-active");
        playSound('NUKE');

        // Efecto jugable: Matar a todos
        zombies = []; 
        if(boss) boss.hp -= 20; // Daño masivo al jefe
        player.hp = Math.min(player.maxHp, player.hp + 50); // Curar
        ammo = maxAmmo; // Recargar
    }

    function levelUp() {
        level++;
        killsForNextLevel += 5; // Aumentar dificultad
        killCount = 0;
        triggerNuke(); // PREMIO: ¡BOMBA!
        
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
        document.getElementById("kills-left").innerText = (killsForNextLevel - killCount); // Mostrar faltantes
        document.getElementById("health-num").innerText = Math.max(0, Math.floor(player.hp));
        document.getElementById("health-bar").style.width = Math.max(0, player.hp) + "%";
    }

    // --- DISPARO INTELIGENTE ---
    function shoot() {
        if(ammo <= 0) return;
        let vx, vy;

        if (!isMobile) {
            // PC: Usa el mouse
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            vx = Math.cos(angle) * 15;
            vy = Math.sin(angle) * 15;
        } else {
            // MÓVIL: Auto-Aim o Joystick
            if (dragging) {
                // Si mueve joystick, dispara a donde camina (Twin Stick básico)
                vx = joyX * 15; vy = joyY * 15;
            } else {
                // Si está quieto, Auto-Aim al más cercano
                const target = getNearestZombie();
                if (target) {
                    const angle = Math.atan2(target.y - player.y, target.x - player.x);
                    vx = Math.cos(angle) * 15; vy = Math.sin(angle) * 15;
                } else {
                    vx = 0; vy = -15; // Defecto arriba
                }
            }
        }

        bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
        ammo--; updateHUD(); playSound('SHOOT');
    }
    
    // Listeners disparo
    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    window.addEventListener("mousedown", e => { if(gameRunning && e.target.tagName !== 'BUTTON') shoot(); });

    // --- BUCLE DE JUEGO ---
    function update() {
        // Movimiento
        let dx = joyX, dy = joyY;
        const keys = {}; // (Asegurar que definimos keys si no usamos joystick)
        // ... (Tu lógica de movimiento de teclado aquí si quieres mantenerla, o solo joystick)
        if(!dragging) {
             // Lógica teclado simple (W A S D)
             if (keys['d']) dx=1; if (keys['a']) dx=-1; if (keys['s']) dy=1; if (keys['w']) dy=-1;
        }
        player.x += dx * player.speed; player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x)); player.y = Math.max(0, Math.min(canvas.height, player.y));

        // Balas
        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i]; b.x += b.vx; b.y += b.vy;
            // Limites bala
            if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) { bullets.splice(i,1); continue; }

            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; killCount++; updateHUD();
                    
                    // CHECK DE NIVEL
                    if (killCount >= killsForNextLevel) levelUp();
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1);
                if(boss.hp <= 0) { boss=null; score+=1000; levelUp(); } // Boss también sube nivel
            }
        }

        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) {
                player.hp -= 0.5; updateHUD();
                document.getElementById("blood-screen").style.boxShadow = "inset 0 0 100px rgba(255,0,0,0.8)";
                setTimeout(()=>document.getElementById("blood-screen").style.boxShadow="none", 100);
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

    function draw() {
        // FONDO TÁCTICO GENERADO (NO IMAGEN FEA)
        ctx.fillStyle = "#111"; // Fondo base oscuro
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Rejilla táctica verde oscuro
        ctx.strokeStyle = "rgba(0, 50, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        items.forEach(it => { if(imgItem.complete) ctx.drawImage(imgItem, it.x-20, it.y-20, 40, 40); });
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        zombies.forEach(z => { if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64); });
        if(boss && imgBoss.complete) { ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128); }
        bullets.forEach(b => { 
            ctx.fillStyle='#ff0'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur=10; ctx.shadowColor='orange'; // Bala brillante
        });
        ctx.shadowBlur=0;
    }

    // Teclado
    const k = {};
    window.addEventListener("keydown", e => k[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => k[e.key.toLowerCase()] = false);
    // Loop mover PC
    function updatePCKeys() {
        if (!dragging) {
            let dx=0, dy=0;
            if(k['d']||k['arrowright']) dx=1; if(k['a']||k['arrowleft']) dx=-1;
            if(k['s']||k['arrowdown']) dy=1; if(k['w']||k['arrowup']) dy=-1;
            player.x += dx * player.speed; player.y += dy * player.speed;
        }
    }

    function loop() { if(gameRunning) { update(); updatePCKeys(); draw(); requestAnimationFrame(loop); } }

    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true;
        setInterval(() => { if(!boss) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.1}); }, 1000);
        setInterval(() => items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height}), 8000);
        updateHUD(); loop();
    };
});
