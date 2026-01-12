document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    let gameRunning = false, isPaused = false;
    let score=0, level=1, ammo=12, maxAmmo=12, killCount=0, killsForNextLevel=10;
    let zombies=[], bullets=[], items=[], particles=[], boss=null;
    let shakeTime=0, shakeIntensity=0;
    let player = { x: canvas.width/2, y: canvas.height/2, hp:100, maxHp:100, speed:5 };
    let zombieInterval=null, itemInterval=null;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Inputs
    const k={}; let mouseX=0, mouseY=0, joyX=0, joyY=0, dragging=false, startX, startY;
    window.addEventListener("keydown", e=>k[e.key.toLowerCase()]=true);
    window.addEventListener("keyup", e=>k[e.key.toLowerCase()]=false);
    window.addEventListener("mousemove", e=>{ const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; });

    // Funciones: spawnBlood, shoot, update, draw, loop, levelUp, spawnBoss, updateHUD, showAlert, showPauseMenu
    // ... (todas tus funciones intactas)

    // Listeners
    document.getElementById("start-btn").onclick = () => {
        gameRunning=true; isPaused=false;
        zombies=[]; bullets=[]; items=[]; boss=null; particles=[];
        resize();
        updateHUD(); loop();
        if(zombieInterval) clearInterval(zombieInterval);
        zombieInterval = setInterval(()=>{ if(!boss && !isPaused) zombies.push({x:Math.random()*canvas.width,y:-50,speed:1+level*0.2}); }, 1000);
        if(itemInterval) clearInterval(itemInterval);
        itemInterval = setInterval(()=>{ if(!isPaused) items.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height}); }, 8000);
    };

    // Pausa, reanudar y reiniciar
    document.getElementById("pause-btn").onclick = () => showPauseMenu();
    document.getElementById("resume-btn").onclick = () => { isPaused=false; document.getElementById("pause-menu").style.display="none"; loop(); };
    document.getElementById("restart-btn").onclick = () => document.getElementById("start-btn").click();
    document.getElementById("home-btn").onclick = () => location.reload();

    // Joystick (móvil)
    const touchZone=document.getElementById("touch-zone");
    const joyWrapper=document.getElementById("joystick-wrapper");
    const joyStick=document.getElementById("joystick-stick");
    if(touchZone){
        touchZone.addEventListener("touchstart", e=>{ if(isPaused) return; e.preventDefault(); const t=e.touches[0]; startX=t.clientX; startY=t.clientY; dragging=true; joyWrapper.style.display="block"; joyWrapper.style.left=(startX-60)+"px"; joyWrapper.style.top=(startY-60)+"px"; });
        touchZone.addEventListener("touchmove", e=>{ if(!dragging||isPaused) return; e.preventDefault(); const t=e.touches[0]; let dx=t.clientX-startX; let dy=t.clientY-startY; const dist=Math.hypot(dx,dy); if(dist>50){ const r=50/dist; dx*=r; dy*=r; } joyStick.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; joyX=dx/50; joyY=dy/50; });
        touchZone.addEventListener("touchend", ()=>{ dragging=false; joyWrapper.style.display="none"; joyX=0; joyY=0; });
    }
});
