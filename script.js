const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

/* ===== UI ===== */
const menu = document.getElementById("menu-screen");
const startBtn = document.getElementById("start-btn");
const ui = document.getElementById("game-ui");

startBtn.onclick = () => {
    menu.style.display = "none";
    ui.style.display = "block";
    gameRunning = true;
};

/* ===== JUGADOR ===== */
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    r: 15,
    speed: 3
};

/* ===== JOYSTICK ===== */
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");

let joyX = 0;
let joyY = 0;
let active = false;
const radius = 40;

joystickBase.addEventListener("touchstart", () => active = true);

joystickBase.addEventListener("touchmove", e => {
    if (!active) return;
    const rect = joystickBase.getBoundingClientRect();
    const t = e.touches[0];

    let x = t.clientX - rect.left - rect.width / 2;
    let y = t.clientY - rect.top - rect.height / 2;

    const d = Math.hypot(x, y);
    if (d > radius) {
        x = x / d * radius;
        y = y / d * radius;
    }

    joyX = x / radius;
    joyY = y / radius;
    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
});

joystickBase.addEventListener("touchend", () => {
    active = false;
    joyX = joyY = 0;
    joystickStick.style.transform = "translate(0,0)";
});

/* ===== LOOP ===== */
let gameRunning = false;

function update() {
    if (!gameRunning) return;

    player.x += joyX * player.speed;
    player.y += joyY * player.speed;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(update);
}

update();