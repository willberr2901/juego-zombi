const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

let gameRunning = false;

// === 1. CARGAR IMÁGENES (NUEVO) ===
// Crea los objetos de imagen
const imgJugador = new Image();
imgJugador.src = "personaje.png"; // ¡Asegúrate que el nombre sea EXACTO!

// Opcional: Imagen de fondo
const imgSuelo = new Image();
imgSuelo.src = "suelo.jpg"; 

// PLAYER
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 25, // Un poco más grande para que se vea bien la foto
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

// ===== JOYSTICK (Sin cambios, tu código está bien) =====
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

    // Límites de pantalla
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
}

function draw() {
    // Limpiar pantalla
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // === 2. DIBUJAR FONDO (OPCIONAL) ===
    // Si tienes imagen de suelo, descomenta la línea de abajo:
    // ctx.drawImage(imgSuelo, 0, 0, canvas.width, canvas.height);

    // === 3. DIBUJAR JUGADOR (CAMBIO IMPORTANTE) ===
    // Antes usabas ctx.arc (círculo). Ahora usamos ctx.drawImage
    
    // ctx.drawImage(imagen, x, y, ancho, alto)
    // Restamos el radio para que la imagen quede centrada en la coordenada X,Y
    ctx.drawImage(
        imgJugador, 
        player.x - player.radius, 
        player.y - player.radius, 
        player.radius * 2, 
        player.radius * 2
    );
    
    // (Opcional) Si la imagen no carga, dibuja un borde rojo para saber dónde está
    // ctx.strokeStyle = "red";
    // ctx.strokeRect(player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(animate);
}
