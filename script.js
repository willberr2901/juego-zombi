const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

let gameRunning = false;

// PLAYER
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 4
};

// UI
const menu = document.getElementById("menu-screen");
const ui = document.getElementById("game-ui");
const startBtn = document.getElementById("start-btn");

// START
startBtn.onclick = () => {
    menu.style.display = "none";
    ui.style.display = "block";
    gameRunning = true;
    animate();
};

// ===== JOYSTICK =====
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");

let joyX = 0;
let joyY = 0;
let active = false;
const radius = 40;

joystickBase.addEventListener("touchstart", e => {
    e.preventDefault();
    active = true;
});

joystickBase.addEventListener("touchmove", e => {
    if (!active) return;
    e.preventDefault();

    const rect = joystickBase.getBoundingClientRect();
    const touch = e.touches[0];

    let x = touch.clientX - rect.left - rect.width / 2;
    let y = touch.clientY - rect.top - rect.height / 2;

    const dist = Math.hypot(x, y);
    if (dist > radius) {
        x = (x / dist) * radius;
        y = (y / dist) * radius;
    }

    joyX = x / radius;
    joyY = y / radius;

    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
});

joystickBase.addEventListener("touchend", () => {
    active = false;
    joyX = 0;
    joyY = 0;
    joystickStick.style.transform = "translate(0,0)";
});

// LOOP
function update() {
    player.x += joyX * player.speed;
    player.y += joyY * player.speed;

    player.x = Math.max(0, Math.min(canvas.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height, player.y));
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = "#3498db";
    ctx.fill();
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(animate);
}