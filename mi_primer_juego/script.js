const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* VARIABLES */
let player = {x:300,y:300,hp:100,maxHp:100};
let zombies = [];
let bullets = [];

let score = 0;
let ammo = 12;
let level = 1;

let visualHP = 100;
let delayHP = 100;

let slowMotion = false;

/* CROSSHAIR */
let mouseX=0, mouseY=0;
window.addEventListener("mousemove", e=>{
    mouseX = e.clientX;
    mouseY = e.clientY;
    document.getElementById("crosshair").style.left = mouseX+"px";
    document.getElementById("crosshair").style.top = mouseY+"px";
});

/* DISPARO */
function shoot(){
    if(ammo<=0) return;

    const angle = Math.atan2(mouseY-player.y, mouseX-player.x);

    bullets.push({
        x:player.x,
        y:player.y,
        vx:Math.cos(angle)*15,
        vy:Math.sin(angle)*15
    });

    ammo--;

    flashEffect();
}

/* FLASH */
function flashEffect(){
    const flash = document.createElement("div");
    flash.className="flash";
    document.body.appendChild(flash);

    setTimeout(()=>flash.remove(),100);
}

/* DAÑO */
function hitEffect(){
    const card = document.querySelector(".health-card");

    card.classList.add("damage-hit");

    document.getElementById("blood-screen").style.boxShadow =
        "inset 0 0 80px rgba(255,0,0,0.6)";

    setTimeout(()=>{
        card.classList.remove("damage-hit");
        document.getElementById("blood-screen").style.boxShadow="none";
    },100);
}

/* HUD */
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
    }else{
        card.classList.remove("low-hp");
    }
}

/* SPAWN */
setInterval(()=>{
    zombies.push({
        x:Math.random()*canvas.width,
        y:-50,
        speed:1
    });
},1000);

/* UPDATE */
function update(){

    /* BALAS */
    for(let i=bullets.length-1;i>=0;i--){
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        for(let j=zombies.length-1;j>=0;j--){
            let z = zombies[j];

            if(Math.hypot(b.x-z.x,b.y-z.y)<30){
                zombies.splice(j,1);
                bullets.splice(i,1);
                score+=10;

                /* CAMARA LENTA */
                slowMotion = true;
                setTimeout(()=>slowMotion=false,200);

                break;
            }
        }
    }

    /* ZOMBIES */
    zombies.forEach(z=>{
        let angle = Math.atan2(player.y-z.y, player.x-z.x);
        z.x += Math.cos(angle)*z.speed;
        z.y += Math.sin(angle)*z.speed;

        if(Math.hypot(player.x-z.x,player.y-z.y)<30){
            player.hp -= 0.2;
            hitEffect();
        }
    });

    updateHUD();
}

/* DRAW */
function draw(){
    ctx.fillStyle="#222";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="blue";
    ctx.fillRect(player.x-15,player.y-15,30,30);

    ctx.fillStyle="green";
    zombies.forEach(z=>{
        ctx.fillRect(z.x-15,z.y-15,30,30);
    });

    ctx.strokeStyle="yellow";
    bullets.forEach(b=>{
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(b.x-b.vx,b.y-b.vy);
        ctx.stroke();
    });
}

/* LOOP */
function loop(){

    if(slowMotion){
        setTimeout(loop,30);
    }else{
        requestAnimationFrame(loop);
    }

    update();
    draw();
}

loop();

/* CLICK */
window.addEventListener("click", shoot);
