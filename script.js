/* script.js - V4.0 TORMENTA FINAL */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- AUDIO MEJORADO ---
    let audioCtx;
    
    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playHorrorAmbience();
    }

    function playHorrorAmbience() {
        // Sonido grave de fondo
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 40; // Bajo profundo
        osc.type = 'sawtooth';
        gain.gain.value = 0.05;
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start();
        // Efecto sirena lento
        setInterval(() => {
            if(gameRunning) {
                osc.frequency.rampTo(60, 2);
                setTimeout(() => osc.frequency.rampTo(40, 2), 2000);
            } else {
                osc.stop();
            }
        }, 4000);
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
        } else if (type === 'BOSS_SPAWN') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(50, now + 1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 1);
            osc.start(now); osc.stop(now + 1);
        } else if (type === 'THUNDER') {
            // Ruido blanco para trueno
            const bufferSize = audioCtx.sampleRate * 0.5;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.value = 0.2;
            noise.connect(noiseGain); noiseGain.connect(audioCtx.destination);
            noise.start();
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
    let score = 0; let ammo = 12; let killCount = 0;
    let zombies = []; let bullets = []; let items = [];
    let boss = null;
    const player = { x: canvas.width/2, y: canvas.height/2, hp: 100, speed: 5 };
    
    // Mouse Posición
    let mouseX = 0; let mouseY = 0;

    // Joystick
    let joyX = 0, joyY = 0; let dragging = false;
    const joyArea = document.getElementById("dynamic-joystick-area");
    const joyContainer = document.getElementById("joystick-container");
    const joyStick = document.getElementById("joystick-stick");

    // --- EFECTOS VISUALES ---
    function triggerLightning() {
        const flash = document.getElementById("flash-overlay");
        flash.classList.remove("flash-anim");
        void flash.offsetWidth; // Reiniciar animación
        flash.classList.add("flash-anim");
        if(gameRunning) playSound('THUNDER');
    }

    // --- INPUTS ---
    window.addEventListener("mousemove", e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    joyArea.addEventListener("touchstart", e => {
        e.preventDefault();
        const t = e.touches[0];
        joyContainer.style.display = "block";
        joyContainer.style.left = (t.clientX - 50) + "px";
        joyContainer.style.top = (t.clientY - 50) + "px";
        dragging = true;
    });

    joyArea.addEventListener("touchmove", e => {
        e.preventDefault(); if(!dragging) return;
        const t = e.touches[0];
        const rect = joyContainer.getBoundingClientRect();
        let dx = t.clientX - (rect.left + 50);
        let dy = t.clientY - (rect.top + 50);
        const dist = Math.hypot(dx, dy);
        if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
        joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joyX = dx/40; joyY = dy/40;
    });

    joyArea.addEventListener("touchend", () => {
        dragging = false; joyContainer.style.display = "none";
        joyX = 0; joyY = 0;
    });

    // DISPARO
    function shoot() {
        if(ammo > 0) {
            let vx, vy;
            
            if(dragging) {
                // Modo Joystick
                vx = joyX * 15; vy = joyY * 15;
                if(vx===0 && vy===0) vy = -15;
            } else {
                // Modo Mouse (PC)
                const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
                vx = Math.cos(angle) * 15;
                vy = Math.sin(angle) * 15;
            }

            bullets.push({x: player.x, y: player.y, vx: vx, vy: vy});
            ammo--; document.getElementById("ammo").innerText = ammo;
            playSound('SHOOT');
        }
    }
    
    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    document.addEventListener("mousedown", ()=>{if(gameRunning) shoot();});

    // TECLADO WASD
    const keys = {};
    window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

    // --- LOGICA JUEGO ---
    function spawnZombie() {
        if(boss) return; // No mas zombies si hay jefe
        const edge = Math.floor(Math.random()*4);
        let x, y;
        if(edge===0) { x=Math.random()*canvas.width; y=-50; }
        else if(edge===1) { x=canvas.width+50; y=Math.random()*canvas.height; }
        else if(edge===2) { x=Math.random()*canvas.width; y=canvas.height+50; }
        else { x=-50; y=Math.random()*canvas.height; }
        zombies.push({x:x, y:y, speed: 1.5 + Math.random()});
    }

    function spawnItem() {
        items.push({
            x: 50 + Math.random()*(canvas.width-100),
            y: 50 + Math.random()*(canvas.height-100)
        });
    }

    function spawnBoss() {
        boss = { x: canvas.width/2, y: -100, hp: 50, maxHp: 50 };
        document.getElementById("log").innerText = "¡ALERTA: JEFE INMORTAL!";
        document.getElementById("log").style.color = "red";
        triggerLightning();
        playSound('BOSS_SPAWN');
    }

    function update() {
        if(!gameRunning) return;

        // Movimiento
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
            
            // Vs Zombies
            for(let j=zombies.length-1; j>=0; j--){
                let z = zombies[j];
                if(Math.hypot(b.x-z.x, b.y-z.y) < 30) {
                    zombies.splice(j,1); bullets.splice(i,1);
                    score++; killCount++;
                    document.getElementById("score").innerText = score;
                    if(killCount === 10) spawnBoss(); 
                    break;
                }
            }
            // Vs Boss
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1);
                if(boss.hp <= 0) {
                    boss = null; score += 500; killCount = 0;
                    document.getElementById("log").innerText = "JEFE ELIMINADO. LA TORMENTA CONTINUA...";
                    document.getElementById("log").style.color = "#aaa";
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

        // Boss IA
        if(boss) {
            let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle) * 2;
            boss.y += Math.sin(angle) * 2;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 50) {
                player.hp -= 1;
                document.getElementById("health-bar").style.width = player.hp + "%";
            }
        }

        // Items
        for(let i=items.length-1; i>=0; i--) {
            if(Math.hypot(player.x-items[i].x, player.y-items[i].y) < 40) {
                ammo += 10; document.getElementById("ammo").innerText = ammo;
                items.splice(i,1);
            }
        }

        if(player.hp <= 0) location.reload();
    }

    function draw() {
        // Fondo con asfalto
        if(imgGround.complete) {
            const ptrn = ctx.createPattern(imgGround, 'repeat');
            ctx.fillStyle = ptrn; ctx.fillRect(0,0,canvas.width,canvas.height);
        } else {
            ctx.fillStyle = '#222'; ctx.fillRect(0,0,canvas.width,canvas.height);
        }

        // Items (Cajas brillantes)
        items.forEach(item => {
            // Aura brillante para ver en oscuridad
            ctx.shadowBlur = 20; ctx.shadowColor = "white";
            if(imgItem.complete) ctx.drawImage(imgItem, item.x-20, item.y-20, 40, 40);
            else { ctx.fillStyle = 'lime'; ctx.fillRect(item.x-15, item.y-15, 30, 30); }
            ctx.shadowBlur = 0; // Reset
        });

        // Player
        if(imgPlayer.complete) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);

        // Zombies
        zombies.forEach(z => {
            if(imgZombie.complete) ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64);
        });

        // Boss
        if(boss && imgBoss.complete) {
            ctx.shadowBlur = 15; ctx.shadowColor = "red";
            ctx.drawImage(imgBoss, boss.x-64, boss.y-64, 128, 128);
            ctx.shadowBlur = 0;
            // Vida Boss
            ctx.fillStyle = 'red'; ctx.fillRect(boss.x-50, boss.y-80, 100, 10);
            ctx.fillStyle = 'green'; ctx.fillRect(boss.x-50, boss.y-80, 100 * (boss.hp/boss.maxHp), 10);
        }

        // Balas
        bullets.forEach(b => {
            ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
        });
    }

    function loop() {
        if(gameRunning) { update(); draw(); requestAnimationFrame(loop); }
    }

    // RAYOS ALEATORIOS EN EL MENÚ
    setInterval(() => {
        if(!gameRunning) triggerLightning();
    }, 4000);

    // INICIO
    document.getElementById("start-btn").onclick = () => {
        initAudio(); // Activa audio al primer clic (obligatorio)
        triggerLightning(); // Rayo inicial
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        gameRunning = true;
        
        setInterval(spawnZombie, 1000);
        setInterval(spawnItem, 8000);
        loop();
    };
});
