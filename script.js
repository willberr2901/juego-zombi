/* script.js */

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

    // --- ELEMENTOS ---
    const introScreen = document.getElementById("intro-screen");
    const introBtn = document.getElementById("intro-btn");
    const controlsInfo = document.getElementById("controls-info");

    const menuScreen = document.getElementById("menu-screen");

    // Mostrar controles según dispositivo
    if (isMobile) {
        controlsInfo.innerHTML = `
            📱 <strong>CONTROLES MÓVIL</strong><br>
            Moverse: Joystick<br>
            Disparar: Botón 🔫
        `;
    } else {
        controlsInfo.innerHTML = `
            🖥️ <strong>CONTROLES PC</strong><br>
            Moverse: W A S D<br>
            Disparar: Mouse
        `;
    }

    // IMÁGENES
    const imgGround = new Image(); imgGround.src = 'imagenes/asfalto.png';
    const imgPlayer = new Image(); imgPlayer.src = 'imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src = 'imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src = 'imagenes/survivor.png'; 
    const imgBoss = new Image(); imgBoss.src = 'imagenes/boss.png';

    // VARIABLES
    let gameRunning = false, isPaused = false;
    let score = 0, level = 1, ammo = 12, maxAmmo = 12;
    let killCount = 0, killsForNextLevel = 10;
    let zombies = [], bullets = [], items = [], particles = [];
    let shakeTime = 0, shakeIntensity = 0;
    let boss = null;
    let player = { x: canvas.width/2, y: canvas.height/2, hp: 100, maxHp: 100, speed: 5 };
    let zombieInterval = null, itemInterval = null;

    // --- AUDIO ---
    let audioCtx;
    function initAudio() { if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
    function playTone(f, t) { if(!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value=f; o.type=t; g.gain.value=0.1; o.start(); o.stop(audioCtx.currentTime+0.1); }

    // --- FUNCIONES AUX ---
    function spawnBlood(x, y) {
        for(let i=0;i<12;i++){
            particles.push({
                x, y,
                vx: (Math.random()-0.5)*12,
                vy: (Math.random()-0.5)*12,
                life: 1.0,
                size: Math.random()*6+3,
                color: '#8a0303'
            });
        }
    }

    function showAlert(title, sub){
        const alertBox = document.getElementById("big-alert");
        document.getElementById("alert-title").innerText = title;
        document.getElementById("alert-sub").innerText = sub;
        alertBox.classList.add("alert-visible");
        setTimeout(()=>{ alertBox.classList.remove("alert-visible"); }, 3000);
    }

    function updateHUD(){
        document.getElementById("score").innerText = score;
        document.getElementById("ammo").innerText = ammo;
        document.getElementById("level").innerText = level;
        document.getElementById("health-num").innerText = Math.floor(player.hp);
        document.getElementById("health-bar").style.width = Math.max(0, player.hp) + "%";
        if (boss) document.getElementById("boss-health-bar").style.width = (boss.hp / boss.maxHp * 100) + "%";
        else document.getElementById("boss-hud").style.display = "none";
    }

    // --- JUEGO ---
    function startGame(){
        gameRunning = true; isPaused = false;
        player.hp=100; score=0; level=1; ammo=12; killCount=0;
        zombies=[]; bullets=[]; items=[]; boss=null; particles=[];
        resize(); initAudio(); updateHUD(); loop();

        if(zombieInterval) clearInterval(zombieInterval);
        if(itemInterval) clearInterval(itemInterval);

        zombieInterval = setInterval(()=>{
            if(!boss && !isPaused && gameRunning) zombies.push({x:Math.random()*canvas.width, y:-50, speed:1+level*0.2});
        }, 1000);

        itemInterval = setInterval(()=>{
            if(!isPaused && gameRunning) items.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height});
        }, 8000);
    }

    // --- BOTONES ---
    document.getElementById("start-btn").onclick = ()=>{
        introScreen.style.display = "flex";
        menuScreen.style.display = "none";
    };

    introBtn.onclick = ()=>{
        introScreen.style.display = "none";
        document.getElementById("game-ui").style.display = "block";
        startGame();
    };

    document.getElementById("pause-btn").onclick = ()=> showPauseMenu();
    document.getElementById("resume-btn").onclick = ()=>{ if(player.hp>0){ isPaused=false; document.getElementById("pause-menu").style.display="none"; loop(); }};
    document.getElementById("restart-btn").onclick = ()=>{ introBtn.click(); document.getElementById("pause-menu").style.display="none"; };
    document.getElementById("home-btn").onclick = ()=> location.reload();

    // --- INPUTS ---
    const k={}; let mouseX=0, mouseY=0, joyX=0, joyY=0, dragging=false, startX, startY;
    window.addEventListener("keydown", e=> k[e.key.toLowerCase()]=true);
    window.addEventListener("keyup", e=> k[e.key.toLowerCase()]=false);
    window.addEventListener("mousemove", e=>{ const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; });

    document.getElementById("btn-fire").addEventListener("touchstart", (e)=>{e.preventDefault(); shoot();});
    window.addEventListener("mousedown", e=>{ if(gameRunning && !isPaused && e.target.tagName!=='BUTTON') shoot(); });

    // Aquí irían el resto de funciones: shoot(), loop(), update(), draw(), levelUp(), spawnBoss(), showPauseMenu() etc.
    // Se mantienen igual que tu código actual
});
