/* script.js - VERSIÓN SEGURA V2.1 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- AUDIO SEGURO (Se inicia solo al jugar) ---
    let audioCtx;
    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type) {
        if (!audioCtx) return; // Si no hay audio, no hacer nada (evita errores)
        try {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            const now = audioCtx.currentTime;

            if (type === 'SHOOT') {
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            } else if (type === 'HIT') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
            }
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) { console.log(e); }
    }

    // --- IMÁGENES ---
    const playerImg = new Image(); playerImg.src = 'imagenes/player.png';
    const zombieImg = new Image(); zombieImg.src = 'imagenes/zombie.png';
    const survivorImg = new Image(); survivorImg.src = 'imagenes/survivor.png';
    const roadImg = new Image(); roadImg.src = 'imagenes/asfalto.png';
    const bossImg = new Image(); bossImg.src = 'imagenes/boss.png';

    // --- VARIABLES ---
    let gameRunning = false;
    let score = 0; let level = 1; let ammo = 12;
    let zombies = []; let bullets = [];
    let boss = null;
    let spawnInterval;
    
    // Jugador
    const player = { x: canvas.width / 2, y: canvas.height / 2, radius: 20, speed: 5, health: 100 };
    
    // Joystick
    let joyX = 0; let joyY = 0; let joyActive = false;
    const joystickBase = document.getElementById("joystick-base");
    const joystickStick = document.getElementById("joystick-stick");
    const maxRadius = 40;

    // --- CONTROLES ---
    // 1. Joystick Móvil
    function handleJoystick(touchX, touchY) {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touchX - centerX;
        let dy = touchY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
            const ratio = maxRadius / dist;
            dx *= ratio; dy *= ratio;
        }
        joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
        joyX = dx / maxRadius;
        joyY = dy / maxRadius;
    }

    joystickBase.addEventListener("touchstart", (e) => { e.preventDefault(); joyActive = true; handleJoystick(e.touches[0].clientX, e.touches[0].clientY); });
    joystickBase.addEventListener("touchmove", (e) => { e.preventDefault(); if (joyActive) handleJoystick(e.touches[0].clientX, e.touches[0].clientY); });
    joystickBase.addEventListener("touchend", (e) => { 
        e.preventDefault(); joyActive = false; joyX = 0; joyY = 0; 
        joystickStick.style.transform = `translate(0px, 0px)`; 
    });

    // 2. Disparo
    const btnFire = document.getElementById("btn-fire");
    
    function shoot() {
        if (ammo > 0) {
            let vx = joyX * 15;
            let vy = joyY * 15;
            // Si no se mueve, dispara arriba
            if (vx === 0 && vy === 0) vy = -15;
            
            bullets.push({ x: player.x, y: player.y, vx: vx, vy: vy });
            ammo--;
            document.getElementById('ammo').innerText = ammo;
            playSound('SHOOT');
        }
    }

    btnFire.addEventListener("touchstart", (e) => { e.preventDefault(); shoot(); });
    btnFire.addEventListener("mousedown", (e) => { e.preventDefault(); shoot(); }); // Para PC

    // 3. Teclado PC
    const keys = {};
    window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

    // --- LOOP DEL JUEGO ---
    function update() {
        if (!gameRunning) return;

        // Movimiento Híbrido (Joystick + Teclado)
        let dx = joyX;
        let dy = joyY;
        if (keys['w']) dy = -1;
        if (keys['s']) dy = 1;
        if (keys['a']) dx = -1;
        if (keys['d']) dx = 1;

        player.x += dx * player.speed;
        player.y += dy * player.speed;
        player.x = Math.max(0, Math.min(canvas.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height, player.y));

        // Balas
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.vx; b.y += b.vy;
            
            // Colisiones
            for (let j = zombies.length - 1; j >= 0; j--) {
                let z = zombies[j];
                if (Math.hypot(b.x - z.x, b.y - z.y) < 30) {
                    zombies.splice(j, 1);
                    bullets.splice(i, 1);
                    score += 50;
                    document.getElementById('score').innerText = score;
                    playSound('HIT');
                    if(score % 500 === 0 && !boss) spawnBoss();
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x, b.y-boss.y) < 60) {
                boss.hp--; bullets.splice(i,1); playSound('HIT');
                if(boss.hp<=0) { boss=null; score+=1000; }
            }
        }

        // Zombies
        zombies.forEach(z => {
            const angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle) * (1 + level * 0.1);
            z.y += Math.sin(angle) * (1 + level * 0.1);
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) {
                player.health -= 0.5;
                document.getElementById('health').innerText = Math.floor(player.health);
            }
        });

        if(boss) {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            boss.x += Math.cos(angle)*1.5; boss.y += Math.sin(angle)*1.5;
            if(Math.hypot(player.x-boss.x, player.y-boss.y) < 60) player.health -= 1;
        }

        if (player.health <= 0) {
            gameRunning = false;
            alert("¡INFECTADO! Puntos: " + score);
            location.reload();
        }
    }

    function spawnBoss() {
        boss = { x: canvas.width/2, y: -100, hp: 20, maxHp: 20 };
    }

    function draw() {
        if (roadImg.complete) {
            const p = ctx.createPattern(roadImg, 'repeat');
            ctx.fillStyle = p; ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }

        bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fillStyle = 'yellow'; ctx.fill(); });
        
        zombies.forEach(z => {
            if (zombieImg.complete) ctx.drawImage(zombieImg, z.x - 32, z.y - 32, 64, 64);
            else { ctx.beginPath(); ctx.fillStyle='red'; ctx.arc(z.x, z.y, 20, 0, Math.PI*2); ctx.fill(); }
        });

        if(boss && bossImg.complete) ctx.drawImage(bossImg, boss.x-64, boss.y-64, 128, 128);

        if (playerImg.complete) ctx.drawImage(playerImg, player.x - 32, player.y - 32, 64, 64);
    }

    function loop() {
        if (gameRunning) {
            update();
            draw();
            requestAnimationFrame(loop);
        }
    }

    // --- INICIO DEL JUEGO ---
    document.getElementById("start-btn").onclick = () => {
        // 1. Iniciar Audio (Gestor de usuario)
        initAudio();
        
        // 2. Cambiar pantallas
        document.getElementById("menu-screen").style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        
        // 3. Iniciar lógica
        gameRunning = true;
        spawnInterval = setInterval(() => {
            if(gameRunning) zombies.push({ x: Math.random() * canvas.width, y: -50 });
        }, 1500);
        
        loop();
    };

    // Cargar récord
    if(localStorage.getItem('zScore')) 
        document.getElementById('menu-highscore').innerText = localStorage.getItem('zScore');
});
