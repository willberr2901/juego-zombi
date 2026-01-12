// ====== CONFIGURACIÓN GLOBAL ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let keys = {};
let player = {
    x: canvas.width/2,
    y: canvas.height/2,
    width: 50,
    height: 50,
    speed: 5,
    health: 100
};

let bullets = [];
let zombies = [];
let score = 0;
let ammo = 12;
let level = 1;
let boss = {
    health: 500,
    maxHealth: 500,
    active: false
};

// ====== EVENTOS TECLADO ======
document.addEventListener('keydown', (e)=>keys[e.key.toLowerCase()]=true);
document.addEventListener('keyup', (e)=>keys[e.key.toLowerCase()]=false);

// ====== START BUTTON ======
document.getElementById('start-btn').addEventListener('click', ()=>{
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    spawnZombies(level*5);
    if(level>=5) boss.active=true;
});

// ====== DISPARO ======
document.getElementById('btn-fire').addEventListener('click', fireBullet);
function fireBullet(){
    if(ammo<=0) return;
    bullets.push({
        x: player.x + player.width/2,
        y: player.y + player.height/2,
        radius: 6,
        speed: 12
    });
    ammo--;
    document.getElementById('ammo').innerText = ammo;
}

// ====== ZOMBIES SPAWN ======
function spawnZombies(count){
    for(let i=0;i<count;i++){
        zombies.push({
            x: Math.random()*canvas.width,
            y: Math.random()*canvas.height,
            width:40,
            height:40,
            speed:1 + Math.random()*1.5,
            health:20
        });
    }
}

// ====== LOOP PRINCIPAL ======
function gameLoop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // MOVIMIENTO PLAYER
    if(keys['w']) player.y-=player.speed;
    if(keys['s']) player.y+=player.speed;
    if(keys['a']) player.x-=player.speed;
    if(keys['d']) player.x+=player.speed;

    // DIBUJAR PLAYER
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(player.x,player.y,player.width,player.height);

    // ACTUALIZAR BALAS
    bullets.forEach((b,i)=>{
        b.y -= b.speed;
        ctx.fillStyle='#f1c40f';
        ctx.beginPath();
        ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);
        ctx.fill();

        // colisión con zombies
        zombies.forEach((z,j)=>{
            if(b.x<z.x+z.width && b.x>z.x && b.y<z.y+z.height && b.y>z.y){
                z.health-=10;
                bullets.splice(i,1);
                if(z.health<=0){
                    zombies.splice(j,1);
                    score++;
                    document.getElementById('score').innerText = score;
                }
            }
        });
    });

    // MOVER ZOMBIES
    zombies.forEach(z=>{
        let dx = player.x - z.x;
        let dy = player.y - z.y;
        let dist = Math.hypot(dx,dy);
        z.x += (dx/dist)*z.speed;
        z.y += (dy/dist)*z.speed;
        ctx.fillStyle='#27ae60';
        ctx.fillRect(z.x,z.y,z.width,z.height);

        // colisión con jugador
        if(player.x<z.x+z.width && player.x+player.width>z.x && player.y<z.y+z.height && player.y+player.height>z.y){
            player.health-=0.5;
            document.getElementById('health-bar').style.width = player.health+'%';
            document.getElementById('health-num').innerText = Math.floor(player.health);
            document.getElementById('blood-screen').style.boxShadow = 'inset 0 0 100px rgba(255,0,0,'+(1-player.health/100)+')';
            if(player.health<=0){
                alert('GAME OVER');
                location.reload();
            }
        }
    });

    // BOSS
    if(boss.active){
        ctx.fillStyle='#8e44ad';
        ctx.fillRect(canvas.width/2-60,50,120,20);
        boss.health-=0.01; // dummy de daño por tiempo
        let width = (boss.health/boss.maxHealth)*120;
        document.getElementById('boss-health-bar').style.width = width+'px';
        document.getElementById('boss-hud').style.display = 'flex';
        if(boss.health<=0){
            boss.active=false;
            document.getElementById('big-alert').classList.add('alert-visible');
            setTimeout(()=>document.getElementById('big-alert').classList.remove('alert-visible'),2000);
        }
    }

    requestAnimationFrame(gameLoop);
}
gameLoop();

// ====== REINICIO Y PAUSA ======
document.getElementById('pause-btn').addEventListener('click', ()=>{
    document.getElementById('pause-menu').style.display='flex';
    cancelAnimationFrame(gameLoop);
});
document.getElementById('resume-btn').addEventListener('click', ()=>{
    document.getElementById('pause-menu').style.display='none';
    gameLoop();
});
document.getElementById('restart-btn').addEventListener('click', ()=>{
    location.reload();
});
document.getElementById('home-btn').addEventListener('click', ()=>{
    location.reload();
});

// ====== JOYSTICK MÓVIL ======
const joystick = document.getElementById('joystick-wrapper');
const stick = document.getElementById('joystick-stick');
let joy = {active:false, x:0, y:0};
joystick.addEventListener('touchstart', e=>{ joy.active=true; joy.x=e.touches[0].clientX; joy.y=e.touches[0].clientY; });
joystick.addEventListener('touchmove', e=>{
    if(!joy.active) return;
    let dx = e.touches[0].clientX - joy.x;
    let dy = e.touches[0].clientY - joy.y;
    player.x += dx/10;
    player.y += dy/10;
});
joystick.addEventListener('touchend', ()=>{ joy.active=false; stick.style.transform='translate(-50%,-50%)'; });
