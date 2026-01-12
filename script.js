document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // IMÁGENES
    const imgGround = new Image(); imgGround.src='imagenes/asfalto.png';
    const imgPlayer = new Image(); imgPlayer.src='imagenes/player.png';
    const imgZombie = new Image(); imgZombie.src='imagenes/zombie.png';
    const imgItem = new Image(); imgItem.src='imagenes/survivor.png';
    const imgBoss = new Image(); imgBoss.src='imagenes/boss.png';

    // VARIABLES
    let gameRunning=false,isPaused=false;
    let score=0,level=1,ammo=12,maxAmmo=12,killCount=0,killsForNextLevel=10;
    let zombies=[],bullets=[],items=[],particles=[],boss=null;
    let player={x:canvas.width/2,y:canvas.height/2,hp:100,maxHp:100,speed:5};

    // AUDIO
    let audioCtx;
    function initAudio(){ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
    function playTone(f,t){ if(!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value=f; o.type=t; g.gain.value=0.1; o.start(); o.stop(audioCtx.currentTime+0.1); }

    // BLOOD
    function spawnBlood(x,y){ for(let i=0;i<12;i++){ particles.push({x:x,y:y,vx:(Math.random()-0.5)*12,vy:(Math.random()-0.5)*12,life:1,size:Math.random()*6+3,color:'#8a0303'}); } }

    // ALERT
    function showAlert(title,sub){ const alertBox=document.getElementById("big-alert"); document.getElementById("alert-title").innerText=title; document.getElementById("alert-sub").innerText=sub; alertBox.classList.add("alert-visible"); setTimeout(()=>{alertBox.classList.remove("alert-visible");},3000); }

    // HUD
    function updateHUD(){
        document.getElementById("score").innerText=score;
        document.getElementById("ammo").innerText=ammo;
        document.getElementById("level").innerText=level;
        document.getElementById("health-num").innerText=Math.floor(player.hp);
        document.getElementById("health-bar").style.width=Math.max(0,player.hp)+'%';
        if(boss){ document.getElementById("boss-hud").style.display="flex"; document.getElementById("boss-health-bar").style.width=(boss.hp/boss.maxHp*100)+'%'; }
        else document.getElementById("boss-hud").style.display="none";
    }

    // NIVEL
    function levelUp(){ level++; killsForNextLevel+=5; killCount=0; ammo=maxAmmo; player.hp=Math.min(player.maxHp,player.hp+30); zombies.forEach(z=>spawnBlood(z.x,z.y)); zombies=[]; showAlert("¡NIVEL "+level+"!","RECOMPENSA: MUNICIÓN LLENA"); updateHUD(); }

    // SPAWN BOSS
    function spawnBoss(){ boss={x:canvas.width/2,y:-100,hp:200+(level*50),maxHp:200+(level*50)}; document.getElementById("boss-hud").style.display="flex"; showAlert("¡ALERTA!","PACIENTE CERO EN CAMINO"); }

    // DISPARO
    function shoot(){ if(ammo<=0||isPaused) return; let vx,vy; if(!isMobile){ const angle=Math.atan2(mouseY-player.y,mouseX-player.x); vx=Math.cos(angle)*20; vy=Math.sin(angle)*20; } else { if(dragging){ vx=joyX*20; vy=joyY*20; } else { let target=boss||zombies[0]; if(target){ const angle=Math.atan2(target.y-player.y,target.x-player.x); vx=Math.cos(angle)*20; vy=Math.sin(angle)*20; } else { vx=0;vy=-20; } } } bullets.push({x:player.x,y:player.y,vx:vx,vy:vy}); ammo--; updateHUD(); playTone(400,'square'); }

    // LOOP
    function update(){
        let dx=joyX,dy=joyY;
        if(!dragging){ if(k['d']) dx=1; if(k['a']) dx=-1; if(k['s']) dy=1; if(k['w']) dy=-1; }
        player.x+=dx*player.speed; player.y+=dy*player.speed;
        player.x=Math.max(0,Math.min(canvas.width,player.x));
        player.y=Math.max(0,Math.min(canvas.height,player.y));

        // BALAS
        for(let i=bullets.length-1;i>=0;i--){
            let b=bullets[i]; b.x+=b.vx; b.y+=b.vy;
            if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height){ bullets.splice(i,1); continue; }
            for(let j=zombies.length-1;j>=0;j--){
                if(Math.hypot(b.x-zombies[j].x,b.y-zombies[j].y)<35){
                    spawnBlood(zombies[j].x,zombies[j].y);
                    zombies.splice(j,1); bullets.splice(i,1); score+=10; killCount++; updateHUD();
                    if(killCount>=killsForNextLevel && !boss) levelUp();
                    if(score>0 && score%300===0 && !boss) spawnBoss();
                    break;
                }
            }
            if(boss && Math.hypot(b.x-boss.x,b.y-boss.y)<60){ boss.hp-=5; bullets.splice(i,1); updateHUD(); spawnBlood(boss.x,boss.y); if(boss.hp<=0){ boss=null; score+=500; levelUp(); showAlert("¡JEFE ELIMINADO!","+500 PUNTOS"); } }
        }

        // PARTICULAS
        for(let i=particles.length-1;i>=0;i--){ let p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.life-=0.03; if(p.life<=0) particles.splice(i,1); }

        // ZOMBIES
        zombies.forEach(z=>{ let angle=Math.atan2(player.y-z.y,player.x-z.x); z.x+=Math.cos(angle)*z.speed; z.y+=Math.sin(angle)*z.speed; if(Math.hypot(player.x-z.x,player.y-z.y)<30){ player.hp-=0.5; updateHUD(); document.getElementById("blood-screen").style.boxShadow="inset 0 0 50px rgba(255,0,0,0.5)"; setTimeout(()=>document.getElementById("blood-screen").style.boxShadow="none",100); } });

        // BOSS
        if(boss){ let angle=Math.atan2(player.y-boss.y,player.x-boss.x); boss.x+=Math.cos(angle)*2.5; boss.y+=Math.sin(angle)*2.5; if(Math.hypot(player.x-boss.x,player.y-boss.y)<50){ player.hp-=1; updateHUD(); } }

        // ITEMS
        for(let i=items.length-1;i>=0;i--){ if(Math.hypot(player.x-items[i].x,player.y-items[i].y)<40){ ammo+=10; items.splice(i,1); updateHUD(); } }
        if(player.hp<=0) showPauseMenu("¡MISIÓN FALLIDA!");
    }

    function draw(){
        ctx.fillStyle='#222'; ctx.fillRect(0,0,canvas.width,canvas.height);
        if(imgGround.complete){ ctx.drawImage(imgGround,0,0,canvas.width,canvas.height); ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,canvas.width,canvas.height); }
        particles.forEach(p=>{ ctx.globalAlpha=p.life; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1.0; });
        items.forEach(it=>{ if(imgItem.complete) ctx.drawImage(imgItem,it.x-20,it.y-20,40,40); });
        if(imgPlayer.complete) ctx.drawImage(imgPlayer,player.x-32,player.y-32,64,64);
        zombies.forEach(z=>{ if(imgZombie.complete) ctx.drawImage(imgZombie,z.x-32,z.y-32,
