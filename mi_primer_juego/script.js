const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* ================= VARIABLES ================= */

let player = {x:300,y:300,hp:100,maxHp:100};

let zombies = [];
let bullets = [];
let particles = [];

let score = 0;
let ammo = 12;
let level = 1;

let visualHP = 100;
let delayHP = 100;

let mouseX = 0;
let mouseY = 0;

let crosshairSize = 20;
let cameraShake = 0;

/* ================= AUDIO ================= */

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playGunSound(){
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

/* ================= INPUT ================= */

window.addEventListener("mousemove", e=>{
    mouseX = e.clientX;
    mouseY = e.clientY;

    const cross = document.getElementById("crosshair");
    cross.style.left = mouseX+"px";
    cross.style.top = mouseY+"px";
    cross.style.width = crosshairSize+"px";
    cross.style.height = crosshairSize+"px";
});

window.addEventListener("click", shoot);

/* ================= DISPARO ================= */

function shoot(){
    if(ammo <= 0) return;

    const baseAngle = Math.atan2(mouseY-player.y, mouseX-player.x);

    const spread = (Math.random()-0.5)*0.3;
    const angle = baseAngle + spread;

    bullets.push({
        x:player.x,
        y:player.y,
        vx:Math.cos(angle)*15,
        vy:Math.sin(angle)*15
    });

    ammo--;

    crosshairSize = 35;
    cameraShake = 8;

    muzzleFlash(player.x, player.y);
    flashEffect();
    playGunSound();
}

/* ================= EFECTOS ================= */

function flashEffect(){
    const flash = document.createElement("div");
    flash.className="flash";
    document.body.appendChild(flash);
    setTimeout(()=>flash.remove(),100);
}

function muzzleFlash(x,y){
    for(let i=0;i<6;i++){
        particles.push({
            x:x,
            y:y,
            vx:(Math.random()-0.5)*6,
            vy:(Math.random()-0.5)*6,
            life:0.3,
            size:Math.random()*4+2,
            color:"orange"
        });
    }
}

function bloodEffect(x,y){
    for(let i=0;i<12;i++){
        particles.push({
            x:x,
            y:y,
            vx:(Math.random()-0.5)*10,
            vy:(Math.random()-0.5)*10,
            life:1,
            size:Math.random()*6+2,
            color:"#8a0303"
        });
    }
}

function hitEffect(){
    document.getElementById("blood-screen").style.boxShadow =
        "inset 0 0 80px rgba(255,0,0,0.6)";

    setTimeout(()=>{
        document.getElementById("blood-screen").style.boxShadow="none";
    },100);

    cameraShake = 10;
}

/* ================= SPAWN ================= */

setInterval(()=>{
    zombies.push({
        x:Math.random()*canvas.width,
        y:-50,
        speed:1 + Math.random()
    });
},1000);

/* ================= HUD ================= */

function updateHUD(){

    visualHP += (player.hp - visualHP) * 0.1;
    delayHP += (player.hp - delayHP) * 0.03;

    document.getElementById("health-num").innerText = Math.floor(visualHP);
    document.getElementById("health-bar").style.width = visualHP+"%";
    document.getElementById("health-bar-delay").style.width = delayHP+"%";

    document.getElementById("ammo").innerText = ammo;
    document.getElementById("score").innerText = score;
    document.getElementById("level").innerText = level;

    const card = document.querySelector(".health-card");

    if(player.hp < 30){
        card.classList.add("low-hp");
    } else {
        card.classList.remove("low-hp");
    }
}

/* ================= UPDATE ================= */

function update(){

    crosshairSize += (20 - crosshairSize) * 0.2;
    cameraShake *= 0.8;

    /* BALAS */
    for(let i=bullets.length-1;i>=0;i--){
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        for(let j=zombies.length-1;j>=0;j--){
            let z = zombies[j];

            if(Math.hypot(b.x-z.x,b.y-z.y) < 30){
                bloodEffect(z.x,z.y);
                zombies.splice(j,1);
                bullets.splice(i,1);
                score+=10;
                break;
            }
        }
    }

    /* ZOMBIES */
    zombies.forEach(z=>{
        let angle = Math.atan2(player.y-z.y, player.x-z.x);
        z.x += Math.cos(angle)*z.speed;
        z.y += Math.sin(angle)*z.speed;

        if(Math.hypot(player.x-z.x,player.y-z.y) < 30){
            player.hp -= 0.3;
            hitEffect();
        }
    });

    updateHUD();
}

/* ================= DRAW ================= */

function draw(){

    ctx.save();

    const shakeX = (Math.random()-0.5)*cameraShake;
    const shakeY = (Math.random()-0.5)*cameraShake;

    ctx.translate(shakeX, shakeY);

    ctx.fillStyle="#222";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    /* PLAYER */
    ctx.fillStyle="blue";
    ctx.fillRect(player.x-15,player.y-15,30,30);

    /* ZOMBIES */
    ctx.fillStyle="green";
    zombies.forEach(z=>{
        ctx.fillRect(z.x-15,z.y-15,30,30);
    });

    /* BALAS */
    ctx.strokeStyle="yellow";
    bullets.forEach(b=>{
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(b.x-b.vx,b.y-b.vy);
        ctx.stroke();
    });

    /* PARTICLES */
    particles.forEach((p,i)=>{
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if(p.life <= 0) particles.splice(i,1);
    });

    ctx.restore();
}

/* ================= LOOP ================= */

function loop(){
    requestAnimationFrame(loop);
    update();
    draw();
}

loop();
