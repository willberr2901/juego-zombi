/* script.js - V3.0 TERROR EDITION */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- AUDIO PROCEDURAL DE TERROR ---
    let audioCtx;
    let ambienceOsc;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            playStartSound();
            startAmbience();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playStartSound() {
        // Sonido grave e impactante al iniciar
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(50, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 2);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 2);
    }

    function startAmbience() {
        // Zumbido de fondo (Drone)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(30, audioCtx.currentTime); // Tono muy bajo
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Volumen bajo
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start();
        ambienceOsc = osc;
    }

    function playSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'SHOOT') {
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'COLLECT') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        }
    }

    // --- ASSETS ---
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; // Usamos survivor como item
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    
    // --- VARIABLES ---
    let gameRunning = false;
    let score = 0; let ammo = 12;
    let zombies = []; let bullets = []; let items = [];
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, speed: 5 };
    
    // --- JOYSTICK DINÁMICO ---
    const joyArea = document.getElementById("dynamic-joystick-area");
    const joyContainer = document.getElementById("joystick-container");
    const joyStick = document.getElementById("joystick-stick");
    let joyStartX = 0, joyStartY = 0;
    let joyX = 0, joyY = 0;
    let dragging = false;

    joyArea.addEventListener("touchstart", e => {
        e.preventDefault();
        const touch = e.touches[0];
        joyStartX = touch.clientX;
        joyStartY = touch.clientY;
        dragging = true;
        
        // Mover el joystick visual a donde tocaste
        joyContainer.style.display = "block";
        joyContainer.style.left = (joyStartX - 50) + "px"; // -50 para centrar (ancho/2)
        joyContainer.style.top = (joyStartY - 50) + "px";
        joyStick.style.transform = `translate(-50%, -50%)`;
        joyX = 0; joyY = 0;
    });

    joyArea.addEventListener("touchmove", e => {
        e.preventDefault();
        if(!dragging) return;
        const touch = e.touches[0];
        
        let dx = touch.clientX - joyStartX;
        let dy = touch.clientY - joyStartY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 40;

        if(dist > maxDist) {
            const ratio = maxDist / dist;
            dx *= ratio; dy *= ratio;
        }

        joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joyX = dx / maxDist;
        joyY = dy / maxDist;
    });

    joyArea.addEventListener("touchend", e => {
        e.preventDefault();
        dragging = false;
        joyContainer.style.display = "none";
        joyX = 0; joyY = 0;
    });

    // --- TECLADO PC ---
    const keys = {};
    window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

    // --- DISPARO ---
    document.getElementById("btn-fire").addEventListener("touchstart", (e) => { e.preventDefault(); shoot(); });
    document.addEventListener("mousedown", () => { if(gameRunning) shoot(); });

    function shoot() {
        if(ammo > 0) {
            let vx = joyX * 15; let vy = joyY * 15;
            if(!dragging) { // Si no usa joystick, usa teclado o defecto
                vx = 0; vy = 0;
                if(keys['d']) vx = 15; if(keys['a']) vx = -15;
                if(keys['s']) vy = 15; if(keys['w']) vy = -15;
                if(vx===0 && vy===0) vy = -15;
            }
            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
            ammo--; document.getElementById("ammo").innerText = ammo;
            playSound('SHOOT');
        }
    }

    // --- GAME LOOP ---
    function spawnZombie() {
        const edge = Math.floor(Math.random()*4);
        let x, y;
        if(edge===0) { x = Math.random()*canvas.width; y = -50; }
        else if(edge===1) { x = canvas.width+50; y = Math.random()*canvas.height; }
        else if(edge===2) { x = Math.random()*canvas.width; y = canvas.height+50; }
        else { x = -50; y = Math.random()*canvas.height; }
        zombies.push({x:x, y:y, speed: 1 + Math.random()});
    }

    function spawnItem() {
        items.push({
            x: 50 + Math.random()*(canvas.width-100),
            y: 50 + Math.random()*(canvas.height-100),
            type: Math.random() > 0.5 ? 'AMMO' : 'HEALTH'
        });
    }

    function update() {
        if(!gameRunning) return;

        // Movimiento Jugador
        let dx = joyX; let dy = joyY;
        if(!dragging) {
            if(keys['d']) dx = 1; if(keys['a']) dx = -1;
            if(keys['s']) dy = 1; if(keys['w']) dy = -1;
        }
        player.x += dx * player.speed; player.y += dy * player.speed;
        
        // Balas
        for(let i=bullets.length-1; i>=0; i--){
            let b = bullets[i];
            b.x += b.vx; b.y += b.vy;
            // Colisiones Bala-Zombie
            for(let j=zombies.length-1; j>=0; j--){
                let z = zombies[j];
                if(Math.hypot(b.x-z.x, b.y-z.y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score+=10; document.getElementById("score").innerText = score;
                    break;
                }
            }
        }

        // Zombies
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle) * z.speed;
            z.y += Math.sin(angle) * z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) {
                player.hp -= 0.5;
                document.getElementById("health-bar").style.width = player.hp + "%";
            }
        });

        // Items (Suministros)
        for(let i=items.length-1; i>=0; i--) {
            let item = items[i];
            if(Math.hypot(player.x-item.x, player.y-item.y) < 40) {
                playSound('COLLECT');
                if(item.type === 'AMMO') { ammo += 10; document.getElementById("ammo").innerText = ammo; }
                else { player.hp = Math.min(100, player.hp + 30); document.getElementById("health-bar").style.width = player.hp + "%"; }
                items.splice(i, 1);
            }
        }

        if(player.hp <= 0) location.reload();
    }

    function draw() {
        // Fondo Oscuro
        ctx.fillStyle = '#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
        if(imgGround.complete) {
            ctx.globalAlpha = 0.4; // Oscurecer el suelo
            const ptrn = ctx.createPattern(imgGround, 'repeat');
            ctx.fillStyle = ptrn; ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.globalAlpha = 1.0;
        }

        // Items
        items.forEach(item => {
            if(imgItem.complete) ctx.drawImage(imgItem, item.x-20, item.y-20, 40, 40);
            else { ctx.fillStyle = 'lime'; ctx.fillRect(item.x-10, item.y-10, 20, 20); }
        });

        // Player
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);

        // Zombies
        zombies.forEach(z => {
            if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64);
        });

        bullets.forEach(b => {
            ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
        });
    }

    function loop() {
        update(); draw(); requestAnimationFrame(loop);
    }

    // START
    document.getElementById("start-btn").onclick = () => {
        initAudio();
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true;
        
        // Spawners (Zombis rápidos y Suministros lentos)
        setInterval(spawnZombie, 1000); 
        setInterval(spawnItem, 8000); // Items cada 8 segs
        
        loop();
    };
});
