/* script.js - V61.0 PROCEDURAL GRAPHICS PRO */

document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIO SEGURO
    const startBtn = document.getElementById("start-btn");
    if (startBtn) {
        startBtn.onclick = () => {
            initAudio();
            document.getElementById("menu-screen").style.display = "none";
            document.getElementById("game-ui").style.display = "block";
            gameRunning = true;
            resize(); resetGame(); setupMap(); startRound(); loop();
        };
    }

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    // INTENTO DE CARGA DE IMÁGENES (No pasa nada si fallan, tenemos backup)
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';

    // VARIABLES
    const weapons = {
        'M1911': { name: 'M1911', damage: 35, speed: 20, spread: 0, delay: 400, color: '#f1c40f', shake: 2 },
        'AK-47': { name: 'AK-47', damage: 45, speed: 25, spread: 0.1, delay: 100, color: '#e67e22', shake: 3 },
        'ESCOPETA': { name: 'STRIKER', damage: 25, speed: 15, spread: 0.3, delay: 800, color: '#c0392b', count: 6, shake: 8 },
        'RAYGUN': { name: 'RAY GUN MK2', damage: 1000, speed: 15, spread: 0, delay: 300, color: '#2ecc71', type: 'RAY', shake: 5 },
        'MINIGUN': { name: 'DEATH MACHINE', damage: 100, speed: 30, spread: 0.1, delay: 50, color: '#fff', type: 'MINI', shake: 4 }
    };
    let currentWeapon = weapons['M1911'];
    let lastShotTime = 0, meleeCooldown = 0, isPaP = false;

    let gameRunning = false, round = 1, points = 500, ammo = 30, grenadeCount = 3;
    let highScore = localStorage.getItem('cz_highscore') || 0;
    document.getElementById("menu-highscore").innerText = highScore;

    let zombiesToSpawn = 0, isDogRound = false;
    let zombies = [], bullets = [], particles = [], powerups = [], floatTexts = [], grenades = [], turrets = [];
    let player = { x: 0, y: 0, hp: 100, maxHp: 100, speed: 5, hasJugger: false, hasSpeed: false, hasRevive: false, lives: 1 };
    let shakeAmount = 0;
    let activeEffects = { instaKill: 0, doublePoints: 0, deathMachine: 0 };
    
    let partsCollected = [false, false, false];
    let mapParts = [], craftingTable = { x: 0, y: 0, active: true };
    let mysteryBox, speedMachine, reviveMachine, gateLeft, gateRight, juggMachine, papMachine, turretShop, trapLeft, trapRight, teleporter;
    let extractionPhase = false;

    function resetGame() {
        player.x=canvas.width/2; player.y=canvas.height/2; player.hp=100; player.lives=1;
        player.hasJugger=false; player.hasSpeed=false; player.hasRevive=false; isPaP=false;
        round=1; points=500; ammo=30; grenadeCount=3;
        zombies=[]; bullets=[]; particles=[]; powerups=[]; floatTexts=[]; grenades=[]; turrets=[];
        partsCollected=[false,false,false]; mapParts=[];
        currentWeapon = weapons['M1911'];
        for(let i=1; i<=3; i++) { const p = document.getElementById(`part-${i}`); if(p) p.classList.remove("part-found"); }
        document.getElementById("perks-container").innerHTML = "";
        document.getElementById("achievement-area").innerHTML = "";
    }

    // MAPA
    function setupMap() {
        const cx = canvas.width/2; const cy = canvas.height/2;
        player.x = cx; player.y = cy;
        // Definir objetos con colores PRO
        mysteryBox = { x: cx, y: cy-150, price: 1000, color: '#3498db', label: '?', type: 'BOX' };
        speedMachine = { x: cx, y: cy+150, price: 3000, color: '#2ecc71', label: 'SPEED', type: 'PERK' };
        reviveMachine = { x: cx-100, y: cy+50, price: 500, color: '#3498db', label: 'REVIVE', type: 'PERK' };
        turretShop = { x: cx+100, y: cy+50, price: 2000, color: '#e67e22', label: 'SENTRY', type: 'SHOP' };
        
        gateLeft = { x: cx-300, y: cy-100, w: 20, h: 200, price: 750, active: true };
        gateRight = { x: cx+300, y: cy-100, w: 20, h: 200, price: 750, active: true };
        trapLeft = { x: cx-300, y: cy-100, price: 1000, active: false, timer: 0 };
        trapRight = { x: cx+300, y: cy-100, price: 1000, active: false, timer: 0 };

        juggMachine = { x: cx-500, y: cy, price: 2500, color: '#c0392b', label: 'JUGG', type: 'PERK' };
        papMachine = { x: cx+500, y: cy, price: 5000, color: '#9b59b6', label: 'PAP', type: 'PAP' };
        teleporter = { x: cx+500, y: cy-100, price: 1500 };
        craftingTable = { x: cx+150, y: cy-50, active: true };
        mapParts = [ { id: 0, x: cx-100, y: cy-100, taken: false }, { id: 1, x: cx-600, y: cy, taken: false }, { id: 2, x: cx+600, y: cy, taken: false } ];
    }

    // --- RENDERIZADO PROCEDURAL AVANZADO (LA MAGIA VISUAL) ---
    function draw() {
        ctx.save();
        if(shakeAmount > 0) { ctx.translate((Math.random()-0.5)*shakeAmount, (Math.random()-0.5)*shakeAmount); }
        
        // 1. SUELO TÁCTICO
        ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
        if(imgGround.complete && imgGround.naturalWidth !== 0) {
            ctx.drawImage(imgGround, 0, 0, canvas.width, canvas.height);
        } else {
            // Rejilla de respaldo si no hay imagen
            ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
            for(let i=0; i<canvas.width; i+=60) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
            for(let i=0; i<canvas.height; i+=60) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }
        }

        // 2. MÁQUINAS DETALLADAS (SIN IMÁGENES, PURO CÓDIGO)
        function drawMachine(obj) {
            // Cuerpo
            let grad = ctx.createLinearGradient(obj.x-20, obj.y-30, obj.x+20, obj.y+30);
            grad.addColorStop(0, '#222'); grad.addColorStop(0.5, obj.color); grad.addColorStop(1, '#111');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 15; ctx.shadowColor = obj.color;
            ctx.fillRect(obj.x-20, obj.y-30, 40, 60);
            
            // Detalles Metálicos
            ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
            ctx.strokeRect(obj.x-20, obj.y-30, 40, 60);
            
            // Pantalla Brillante
            ctx.fillStyle = "#fff"; ctx.shadowBlur=20;
            ctx.fillRect(obj.x-15, obj.y-10, 30, 20);
            
            // Etiqueta
            ctx.shadowBlur=0; ctx.fillStyle = "#fff"; ctx.font = "bold 10px Arial"; ctx.textAlign="center";
            ctx.fillText(obj.label, obj.x, obj.y+45);
        }
        drawMachine(mysteryBox); drawMachine(speedMachine); drawMachine(reviveMachine);
        drawMachine(juggMachine); drawMachine(papMachine); drawMachine(turretShop);

        // 3. PUERTAS DE SEGURIDAD
        function drawGate(g) {
            if(g.active) {
                // Rayas de precaución
                ctx.fillStyle = "#222"; ctx.fillRect(g.x, g.y, g.w, g.h);
                ctx.beginPath(); ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 5;
                for(let i=0; i<g.h; i+=20) { ctx.moveTo(g.x, g.y+i); ctx.lineTo(g.x+g.w, g.y+i+10); }
                ctx.stroke();
                ctx.fillStyle="#000"; ctx.fillRect(g.x-10, g.y+80, 40, 20);
                ctx.fillStyle="#f1c40f"; ctx.font="10px Arial"; ctx.fillText("🔒", g.x+10, g.y+93);
            }
        }
        drawGate(gateLeft); drawGate(gateRight);

        // 4. MESA DE CRAFTEO
        ctx.fillStyle="#444"; ctx.fillRect(craftingTable.x-30, craftingTable.y-20, 60, 40);
        ctx.fillStyle="#8e44ad"; ctx.fillRect(craftingTable.x-25, craftingTable.y-15, 50, 30); // Tapete
        ctx.fillStyle="#fff"; ctx.fillText("RADIO", craftingTable.x, craftingTable.y+5);

        // 5. TRAMPAS Y TELEPORTER
        if(trapLeft.active || trapRight.active) {
            ctx.shadowBlur=20; ctx.shadowColor="#0ff"; ctx.strokeStyle="#0ff"; ctx.lineWidth=3;
            if(trapLeft.active) { ctx.beginPath(); ctx.moveTo(trapLeft.x, trapLeft.y); ctx.lineTo(trapLeft.x, trapLeft.y+200); ctx.stroke(); }
            if(trapRight.active) { ctx.beginPath(); ctx.moveTo(trapRight.x, trapRight.y); ctx.lineTo(trapRight.x, trapRight.y+200); ctx.stroke(); }
            ctx.shadowBlur=0;
        }
        ctx.shadowBlur=15; ctx.shadowColor="#0ff"; ctx.fillStyle="#0ff"; ctx.beginPath(); ctx.arc(teleporter.x, teleporter.y, 15, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

        // 6. PIEZAS
        mapParts.forEach(p => { 
            if(!p.taken) { 
                ctx.shadowBlur=10; ctx.shadowColor="#f1c40f"; ctx.fillStyle="#f1c40f"; 
                ctx.fillRect(p.x-8, p.y-8, 16, 16); ctx.shadowBlur=0; 
            } 
        });

        // 7. ENTIDADES (Backup si no cargan imágenes)
        // Jugador
        if(imgPlayer.complete && imgPlayer.naturalWidth!==0) ctx.drawImage(imgPlayer, player.x-32, player.y-32, 64, 64);
        else { ctx.shadowBlur=10; ctx.shadowColor="#3498db"; ctx.fillStyle="#3498db"; ctx.beginPath(); ctx.arc(player.x, player.y, 20, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }

        // Zombis
        zombies.forEach(z => {
            if(imgZombie.complete && imgZombie.naturalWidth!==0 && z.type!=='DOG') {
                ctx.drawImage(imgZombie, z.x-32, z.y-32, 64, 64);
            } else {
                ctx.fillStyle = z.type==='DOG' ? "#c0392b" : "#27ae60"; 
                ctx.beginPath(); ctx.arc(z.x, z.y, z.type==='DOG'?12:18, 0, Math.PI*2); ctx.fill();
            }
        });

        // Balas y efectos
        bullets.forEach(b => { ctx.fillStyle = b.color; ctx.shadowBlur=5; ctx.shadowColor=b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0; });
        particles.forEach(p => { ctx.globalAlpha=p.life; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); });
        ctx.globalAlpha=1;
        floatTexts.forEach(t => { ctx.globalAlpha=t.life; ctx.fillStyle=t.color; ctx.font="bold 20px Arial"; ctx.fillText(t.text, t.x, t.y); });
        
        ctx.restore();
    }

    // AUDIO
    let audioCtx;
    function initAudio() { if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume(); }
    function playSound(type) {
        if(!audioCtx) return;
        const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
        osc.connect(g); g.connect(audioCtx.destination);
        if(type==='SHOOT'){ 
            osc.frequency.setValueAtTime(isPaP?800:400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime+0.1);
            g.gain.setValueAtTime(0.1, audioCtx.currentTime); g.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.1);
            osc.start(); osc.stop(audioCtx.currentTime+0.1); 
        }
        if(type==='BUY') { osc.frequency.value=1000; g.gain.value=0.1; osc.start(); osc.stop(audioCtx.currentTime+0.2); }
    }

    // LÓGICA PRINCIPAL (REDUCIDA PARA ESTABILIDAD)
    function checkInteraction() {
        if(extractionPhase) return;
        const btn = document.getElementById("interact-btn");
        let action = null;
        if(Math.hypot(player.x-mysteryBox.x, player.y-mysteryBox.y)<60) action={msg:"🎁 CAJA ($1000)", cb:buyWeapon, color:"#3498db"};
        // ... (Resto de interacciones igual) ...
        else if(gateLeft.active && Math.hypot(player.x-gateLeft.x, player.y-(gateLeft.y+100))<100) action={msg:"🔓 ABRIR ($750)", cb:()=>openGate(gateLeft, "ZONA OESTE"), color:"#f39c12"};
        else if(gateRight.active && Math.hypot(player.x-gateRight.x, player.y-(gateRight.y+100))<100) action={msg:"🔓 ABRIR ($750)", cb:()=>openGate(gateRight, "ZONA ESTE"), color:"#f39c12"};
        else if(!gateLeft.active && Math.hypot(player.x-trapLeft.x, player.y-(trapLeft.y+100))<80 && !trapLeft.active) action={msg:"⚡ TRAMPA ($1000)", cb:()=>activateTrap(trapLeft), color:"#f39c12"};
        else if(!gateRight.active && Math.hypot(player.x-trapRight.x, player.y-(trapRight.y+100))<80 && !trapRight.active) action={msg:"⚡ TRAMPA ($1000)", cb:()=>activateTrap(trapRight), color:"#f39c12"};
        else if(!gateLeft.active && Math.hypot(player.x-juggMachine.x, player.y-juggMachine.y)<60 && !player.hasJugger) action={msg:"❤️ TITÁN ($2500)", cb:buyJuggernog, color:"#c0392b"};
        else if(!gateRight.active && Math.hypot(player.x-papMachine.x, player.y-papMachine.y)<60 && !isPaP) action={msg:"🔮 MEJORAR ($5000)", cb:buyPaP, color:"#9b59b6"};
        else if(Math.hypot(player.x-speedMachine.x, player.y-speedMachine.y)<60 && !player.hasSpeed) action={msg:"⚡ SPEED ($3000)", cb:buySpeedCola, color:"#2ecc71"};
        
        if(action) { btn.style.display="block"; btn.innerHTML=action.msg; btn.style.borderColor=action.color; btn.onclick=action.cb; }
        else { btn.style.display="none"; }
    }

    // FUNCIONES AUXILIARES
    function openGate(gate, name) { if(points>=gate.price){ points-=gate.price; gate.active=false; playSound('BUY'); updateHUD(); } }
    function buyWeapon() { if(points>=1000){ points-=1000; const keys=Object.keys(weapons).filter(k=>k!=='M1911'); currentWeapon=weapons[keys[Math.floor(Math.random()*keys.length)]]; ammo=100; playSound('BUY'); updateHUD(); } }
    function buyJuggernog() { if(points>=2500){ points-=2500; player.hasJugger=true; player.maxHp=200; player.hp=200; addPerk('jugg'); updateHUD(); } }
    function buySpeedCola() { if(points>=3000){ points-=3000; player.hasSpeed=true; addPerk('speed'); updateHUD(); } }
    function buyPaP() { if(points>=5000){ points-=5000; isPaP=true; ammo=150; addPerk('pap'); updateHUD(); } }
    function activateTrap(trap) { if(points>=1000){ points-=1000; trap.active=true; trap.timer=1200; updateHUD(); } }
    function addPerk(type) { document.getElementById("perks-container").innerHTML+=`<div class="perk-icon perk-${type}">+</div>`; }

    function updateHUD() { document.getElementById("score").innerText=points; document.getElementById("ammo").innerText=ammo; document.getElementById("level").innerText=round; document.getElementById("weapon-name").innerText=currentWeapon.name; document.getElementById("hp-bar").style.width=(player.hp/player.maxHp)*100+"%"; }
    function checkRoundEnd() { if(zombiesToSpawn <= 0 && zombies.length === 0) { round++; setTimeout(startRound, 3000); } }
    function startRound() { zombiesToSpawn = 5 + (round*3); isDogRound=(round%5===0); updateHUD(); spawnZombiesLoop(); }
    function spawnZombiesLoop() { if(!gameRunning) return; if(zombiesToSpawn>0) { let hp=isDogRound?50+(round*10):100*Math.pow(1.1,round); let type=isDogRound?'DOG':'ZOMBIE'; let x,y; if(Math.random()<0.5){x=Math.random()<0.5?-50:canvas.width+50;y=Math.random()*canvas.height;}else{x=Math.random()*canvas.width;y=Math.random()<0.5?-50:canvas.height+50;} zombies.push({x,y,hp,maxHp:hp,speed:1+round*0.1,type}); zombiesToSpawn--; setTimeout(spawnZombiesLoop,1000); } }

    function shoot() {
        const now = Date.now();
        let delay = currentWeapon.delay; if(player.hasSpeed) delay/=2; if(isPaP) delay/=1.5;
        if(ammo <= 0 || now - lastShotTime < delay) return;
        lastShotTime = now;
        let baseAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        let count = currentWeapon.count || 1;
        shakeAmount = currentWeapon.shake || 2;
        for(let i=0; i<count; i++) {
            let angle = baseAngle + (Math.random() - 0.5) * currentWeapon.spread;
            let dmg = isPaP ? currentWeapon.damage * 3 : currentWeapon.damage;
            let color = currentWeapon.type === 'RAY' ? '#2ecc71' : (isPaP ? '#9b59b6' : currentWeapon.color);
            bullets.push({ x: player.x, y: player.y, vx: Math.cos(angle)*currentWeapon.speed, vy: Math.sin(angle)*currentWeapon.speed, dmg: dmg, color: color });
        }
        ammo--; playSound('SHOOT'); updateHUD();
    }

    function update() {
        if(shakeAmount > 0) shakeAmount *= 0.9; if(shakeAmount < 0.5) shakeAmount = 0;
        let dx=0, dy=0; if(k['w']) dy=-1; if(k['s']) dy=1; if(k['a']) dx=-1; if(k['d']) dx=1;
        player.x += dx*player.speed; player.y += dy*player.speed;
        
        checkInteraction();

        // TRAMPAS
        [trapLeft, trapRight].forEach(t => { if(t.active) { t.timer--; if(t.timer<=0) t.active=false; zombies.forEach(z => { if(Math.abs(z.x-t.x)<20 && Math.abs(z.y-(t.y+100))<100) { z.hp=0; points+=10; } }); } });

        // BALAS
        for(let i=bullets.length-1; i>=0; i--){
            let b=bullets[i]; b.x+=b.vx; b.y+=b.vy;
            if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height){ bullets.splice(i,1); continue; }
            for(let j=zombies.length-1; j>=0; j--){
                if(Math.hypot(b.x-zombies[j].x, b.y-zombies[j].y) < 35){
                    zombies[j].hp -= b.dmg; points+=10; bullets.splice(i,1);
                    if(zombies[j].hp <= 0) { zombies.splice(j,1); points+=60; checkRoundEnd(); }
                    updateHUD(); break;
                }
            }
        }
        // ZOMBIES
        zombies.forEach(z => {
            let angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle)*z.speed; z.y += Math.sin(angle)*z.speed;
            if(Math.hypot(player.x-z.x, player.y-z.y) < 30) { player.hp -= 0.5; updateHUD(); shakeAmount=5; }
        });
        if(player.hp<=0) { gameRunning=false; location.reload(); }
    }

    function loop() { if(gameRunning) { update(); draw(); requestAnimationFrame(loop); } }

    const k={}; let mouseX=0, mouseY=0;
    window.addEventListener("keydown", e => k[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => k[e.key.toLowerCase()] = false);
    window.addEventListener("mousemove", e => { const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; });
    window.addEventListener("mousedown", e => { if(gameRunning && e.target.tagName !== 'BUTTON') shoot(); });
});
