// ==========================================
// === CONFIGURACIÓN ESTÉTICA (PALETA) ===
// ==========================================
const C_BG = "#6B7A8F";
const C_KEY_BASE = "#526175";
const C_KEY_ACTIVE = "#D98E5F";
const C_KEY_SOLVED = "#4A6C96";
const C_TEXT_LIGHT = "#E6E9ED";
const C_TEXT_DARK = "#2C3E50";
const C_PANEL_BG = "#3E4C5E";
const C_ACCENT_LINE = "#8CA0B3";

// ==========================================
// === ESTADO GENERAL DEL JUEGO ===
// ==========================================
let targetName = "";
let typedName = "";
let keyboard = [];
const rows = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];
let activeKey = null;
let isSolving = false;

// --- ESTADO INICIAL ---
let nameInput;
let startButton;
let isChallengeActive = false;

// --- ESTADO DEL ENTER MOLESTO ---
let isConfirming = false;
let confirmationStartMillis = 0;
const confirmationDuration = 5000;
let enterButton;

// --- VARIABLES DE LOS DESAFÍOS ---
let currentChallenge = 0;
let lastChallenge = 0;
let challengeStartMillis = 0;

// Variables de los juegos
let sliders = [];
let targetValues = [];
let patternColors = ["#E74C3C", "#3498DB", "#2ECC71", "#F1C40F"];
let targetPattern = [];
let inputPattern = [];
let isDisplayingPattern = false;
let clickCounter = 0;
let lastClickTime = 0;
const targetClicks = 5;
const clickInterval = 1500;
let dragTargetPos;
let isDraggingActive = false;
const trackingDuration = 3000;

// --- FUNCIÓN SETUP ---
function setup() {
  // USAMOS window.innerWidth en lugar de windowWidth para mayor precisión inicial
  createCanvas(window.innerWidth, window.innerHeight);

  // Forzar estilos al body directamente con JS nativo (más seguro que p5.dom)
  document.body.style.overflow = "hidden";
  document.body.style.margin = "0";
  document.body.style.backgroundColor = C_BG;

  textFont("Courier New");

  // Crear Input
  nameInput = createInput("");
  nameInput.attribute("placeholder", "NOMBRE A DELETREAR...");
  styleInput(nameInput);

  // Crear Botón de Inicio
  startButton = createButton("INICIAR SISTEMA");
  styleTechnicalButton(startButton, C_KEY_ACTIVE);
  startButton.mousePressed(startChallenge);

  centerIntroElements();

  // Crear Sliders
  for (let i = 0; i < 3; i++) {
    sliders[i] = createSlider(0, 10, 0, 0.05);
    sliders[i].style("width", "120px");
    sliders[i].position(-200, -200);
    sliders[i].input(checkSliders);
    sliders[i].hide();
  }

  // Crear Botón Enter
  enterButton = createButton("ENTER [FINALIZAR PROCESO]");
  styleTechnicalButton(enterButton, C_KEY_ACTIVE);
  enterButton.mousePressed(triggerAnnoyingEnter);
  enterButton.hide();

  dragTargetPos = createVector(0, 0);
}

// --- SOLUCIÓN AL PARPADEO: DEBOUNCING DEL RESIZE ---
function windowResized() {
  // Solo redimensionar si el cambio es significativo (evita bucle por barra de scroll)
  if (abs(windowWidth - width) > 10 || abs(windowHeight - height) > 10) {
    resizeCanvas(windowWidth, windowHeight);
    centerIntroElements();
    if (isChallengeActive) {
      initializeKeyboard();
    }
  }
}

function centerIntroElements() {
  // Usamos width/height del canvas, no windowWidth
  let centerX = width / 2;
  let centerY = height / 2;
  nameInput.position(centerX - 175, centerY - 40);
  startButton.position(centerX - 100, centerY + 20);
}

function styleInput(inp) {
  inp.style("font-family", "Courier New, monospace");
  inp.style("font-size", "20px");
  inp.style("padding", "10px");
  inp.style("width", "350px");
  inp.style("border", "2px solid " + C_ACCENT_LINE);
  inp.style("background", C_TEXT_LIGHT);
  inp.style("color", C_TEXT_DARK);
  inp.style("text-align", "center");
  inp.style("outline", "none");
}

function styleTechnicalButton(btn, bgColor) {
  btn.style("font-family", "Courier New, monospace");
  btn.style("font-size", "18px");
  btn.style("padding", "10px 20px");
  btn.style("background", bgColor);
  btn.style("color", C_TEXT_LIGHT);
  btn.style("border", "2px solid " + C_ACCENT_LINE);
  btn.style("border-radius", "4px");
  btn.style("cursor", "pointer");
  btn.style("font-weight", "bold");
}

// --- INICIO DEL JUEGO ---
function startChallenge() {
  let name = nameInput.value().trim().toUpperCase();
  if (name.length > 0) {
    targetName = name;
    isChallengeActive = true;
    nameInput.hide();
    startButton.hide();
    initializeKeyboard();
  } else {
    alert("ERROR: Ingrese un nombre para iniciar el protocolo.");
  }
}

function initializeKeyboard() {
  keyboard = [];
  let keySize = 50;
  let paddingX = 12;
  let paddingY = 140;

  // Cálculos basados en 'height' y 'width' del canvas actual
  let totalKeyboardHeight =
    rows.length * keySize + (rows.length - 1) * paddingY;
  let startY = height / 2 - totalKeyboardHeight / 2 + 50;

  let longestRowLength = 10;
  let keyboardWidth =
    longestRowLength * keySize + (longestRowLength - 1) * paddingX;
  let startX = (width - keyboardWidth) / 2;

  for (let r = 0; r < rows.length; r++) {
    let row = rows[r];
    let rowWidth = row.length * keySize + (row.length - 1) * paddingX;
    let rowOffset = (keyboardWidth - rowWidth) / 2;
    let offsetX = startX + rowOffset;

    for (let i = 0; i < row.length; i++) {
      keyboard.push({
        char: row[i],
        x: offsetX + i * (keySize + paddingX),
        y: startY + r * paddingY,
        w: keySize,
        h: keySize,
        isSolved: false,
      });
    }
  }
}

// --- DRAW LOOP PRINCIPAL ---
function draw() {
  background(C_BG); // Dibujar fondo siempre primero

  // Restaurar modos por seguridad al inicio de cada frame
  rectMode(CORNER);
  ellipseMode(CENTER);
  textAlign(LEFT, TOP);

  if (!isChallengeActive) {
    drawIntroScreen();
    return;
  }

  drawHeader();
  drawKeyboard();

  if (isSolving) {
    // Fondo oscuro semitransparente (Dimmer)
    push();
    fill(30, 40, 50, 150);
    noStroke();
    rectMode(CORNER);
    rect(0, 0, width, height);
    pop();

    if (currentChallenge === 1) drawChallengeSliders();
    else if (currentChallenge === 2) drawChallengePattern();
    else if (currentChallenge === 3) drawChallengeRhythm();
    else if (currentChallenge === 4) drawChallengeDrag();
  } else {
    drawInstructions();
  }

  handleConfirmation();
}

// --- PANTALLAS Y HUD ---
function drawIntroScreen() {
  let centerX = width / 2;
  let centerY = height / 2;
  push();
  textAlign(CENTER, BOTTOM);
  fill(C_TEXT_LIGHT);
  noStroke();
  textSize(32);
  text("> PROTOCOLO DE INGRESO MANUAL <", centerX, centerY - 60);
  textSize(16);
  fill(C_ACCENT_LINE);
  text(
    "Define el objetivo. Prepárate para la ineficiencia.",
    centerX,
    centerY - 90
  );
  stroke(C_ACCENT_LINE);
  line(centerX - 200, centerY - 50, centerX + 200, centerY - 50);
  pop();
}

function drawHeader() {
  push();
  textAlign(LEFT, TOP);
  let marginX = 50;
  let marginY = 40;

  fill(C_ACCENT_LINE);
  textSize(14);
  text("[OBJETIVO]", marginX, marginY);
  text("[BUFFER]", marginX, marginY + 70);

  fill(C_TEXT_LIGHT);
  textSize(32);
  text(targetName, marginX, marginY + 20);

  let displayTyped = "";
  for (let i = 0; i < targetName.length; i++) {
    if (i < typedName.length) displayTyped += typedName[i];
    else displayTyped += "_";
  }
  fill(C_KEY_ACTIVE);
  text(displayTyped, marginX, marginY + 90);

  // Asegurar que el botón Enter siga la posición de la ventana
  if (typedName.length === targetName.length && !isConfirming) {
    enterButton.position(width / 2 - 120, height - 100);
    enterButton.show();
  } else {
    enterButton.hide();
  }

  stroke(C_ACCENT_LINE);
  strokeWeight(2);
  line(marginX, marginY + 140, width - marginX, marginY + 140);
  pop();
}

function drawInstructions() {
  if (!isSolving && !isConfirming && typedName.length < targetName.length) {
    push();
    textAlign(CENTER);
    fill(C_TEXT_LIGHT);
    textSize(20);
    text(
      ">>> INICIAR SECUENCIA: " + targetName[typedName.length] + " <<<",
      width / 2,
      keyboard[0].y - 50
    );

    noFill();
    stroke(C_KEY_ACTIVE);
    strokeWeight(2);
    if (frameCount % 60 < 30) {
      rectMode(CENTER);
      rect(width / 2, keyboard[0].y - 58, 300, 35, 5);
    }
    pop();
  }
}

function drawKeyboard() {
  push();
  for (let key of keyboard) {
    let isCurrent = activeKey && activeKey.char === key.char;
    let isTarget =
      !isSolving &&
      typedName.length < targetName.length &&
      key.char === targetName[typedName.length];

    let bgCol = C_KEY_BASE;
    let textCol = C_TEXT_LIGHT;
    let borderCol = C_ACCENT_LINE;
    let borderW = 1;

    if (key.isSolved) {
      bgCol = C_KEY_SOLVED;
    } else if (isTarget || isCurrent) {
      bgCol = C_KEY_ACTIVE;
      textCol = C_TEXT_DARK;
      borderCol = C_TEXT_LIGHT;
      borderW = 2;
    }

    fill(bgCol);
    stroke(borderCol);
    strokeWeight(borderW);
    rect(key.x, key.y, key.w, key.h, 8);

    noFill();
    stroke(C_ACCENT_LINE);
    strokeWeight(0.5);
    if (isTarget) {
      ellipse(key.x + key.w / 2, key.y + key.h / 2, key.w - 10);
    }

    fill(textCol);
    noStroke();
    textSize(22);
    textAlign(CENTER, CENTER);
    text(key.char, key.x + key.w / 2, key.y + key.h / 2);
  }
  pop();
}

// --- LOGICA DE CLICS ---
function mousePressed() {
  if (!isChallengeActive || isConfirming) return;

  if (isSolving) {
    if (currentChallenge === 2) handlePatternClick();
    if (currentChallenge === 3) handleRhythmClick();
    if (currentChallenge === 4) startDragging();
    return;
  }

  for (let key of keyboard) {
    if (
      mouseX > key.x &&
      mouseX < key.x + key.w &&
      mouseY > key.y &&
      mouseY < key.y + key.h
    ) {
      if (key.isSolved) return;
      if (
        typedName.length < targetName.length &&
        key.char === targetName[typedName.length]
      ) {
        activateRandomChallenge(key);
      }
    }
  }
}

function mouseReleased() {
  if (isConfirming) {
    if (millis() - confirmationStartMillis < confirmationDuration) {
      failTotal("Protocolo de finalización abortado prematuramente.");
      isConfirming = false;
    }
  }
  if (isSolving && currentChallenge === 4 && isDraggingActive) {
    if (millis() - challengeStartMillis < trackingDuration) {
      isDraggingActive = false;
    }
  }
}

function activateRandomChallenge(key) {
  activeKey = key;
  isSolving = true;
  let newChallenge;
  do {
    newChallenge = floor(random(1, 5));
  } while (newChallenge === lastChallenge);
  currentChallenge = newChallenge;
  lastChallenge = currentChallenge;

  for (let s of sliders) s.hide();

  if (currentChallenge === 1) setupSliders(key);
  if (currentChallenge === 2) setupPattern();
  if (currentChallenge === 3) setupRhythm();
  if (currentChallenge === 4) setupDrag();
}

function completeLetter() {
  activeKey.isSolved = true;
  typedName += activeKey.char;
  resetSystem();
}

function failTotal(reason) {
  alert(
    ">>> ERROR CRÍTICO DEL SISTEMA <<<\nCausa: " +
      reason +
      "\n\nMEDIDA: Reinicio total del buffer."
  );
  typedName = "";
  for (let k of keyboard) k.isSolved = false;
  resetSystem();
  isConfirming = false;
}

function resetSystem() {
  isSolving = false;
  activeKey = null;
  currentChallenge = 0;
  for (let s of sliders) s.hide();
}

// --- PANELES TÉCNICOS ---
function drawTechnicalPanel(x, y, w, h, title) {
  push();
  rectMode(CENTER);
  fill(C_PANEL_BG);
  stroke(C_ACCENT_LINE);
  strokeWeight(2);
  rect(x, y, w, h, 15);

  fill(C_KEY_BASE);
  noStroke();
  ellipse(x - w / 2 + 15, y - h / 2 + 15, 8);
  ellipse(x + w / 2 - 15, y - h / 2 + 15, 8);
  ellipse(x - w / 2 + 15, y + h / 2 - 15, 8);
  ellipse(x + w / 2 - 15, y + h / 2 - 15, 8);

  fill(C_KEY_ACTIVE);
  textSize(16);
  textAlign(CENTER, TOP);
  text("/// MÓDULO: " + title + " ///", x, y - h / 2 + 20);

  stroke(C_ACCENT_LINE);
  strokeWeight(1);
  line(x - w / 2 + 30, y - h / 2 + 50, x + w / 2 - 30, y - h / 2 + 50);
  pop();
}

// --- 1. SLIDERS ---
function setupSliders(key) {
  targetValues = [
    floor(random(1, 9)) + 0.5,
    floor(random(1, 9)) + 0.5,
    floor(random(1, 9)) + 0.5,
  ];
  let startX = width / 2 - 200;
  let panelCenterY = height / 2;
  for (let i = 0; i < 3; i++) {
    sliders[i].value(0);
    sliders[i].position(startX + i * 140, panelCenterY - 10);
    sliders[i].show();
  }
}

function checkSliders() {
  if (currentChallenge !== 1) return;
  let allCorrect = true;
  for (let i = 0; i < 3; i++) {
    if (abs(sliders[i].value() - targetValues[i]) > 0.1) allCorrect = false;
  }
  if (allCorrect) completeLetter();
}

function drawChallengeSliders() {
  push();
  let panelCenterY = height / 2;
  drawTechnicalPanel(width / 2, panelCenterY, 550, 180, "CALIBRACIÓN");
  textAlign(CENTER);
  fill(C_TEXT_LIGHT);
  textSize(14);
  text(
    "Alinee los parámetros con los valores objetivo.",
    width / 2,
    panelCenterY - 50
  );

  for (let i = 0; i < 3; i++) {
    let val = sliders[i].value();
    let target = targetValues[i];
    let xPos = width / 2 - 200 + i * 140 + 60;

    fill(C_ACCENT_LINE);
    textSize(12);
    text("META: " + target.toFixed(1), xPos, panelCenterY + 30);
    if (abs(val - target) < 0.1) fill(C_KEY_SOLVED);
    else fill(C_KEY_ACTIVE);
    text("ACTUAL: " + nf(val, 1, 2), xPos, panelCenterY + 50);
  }
  pop();
}

// --- 2. PATRÓN ---
function setupPattern() {
  targetPattern = [];
  inputPattern = [];
  for (let i = 0; i < 4; i++) targetPattern.push(floor(random(4)));
  isDisplayingPattern = true;
  challengeStartMillis = millis();
}

function drawChallengePattern() {
  push();
  let centerY = height / 2;
  let centerX = width / 2;
  drawTechnicalPanel(centerX, centerY, 450, 250, "MEMORIA INVERSA");

  if (isDisplayingPattern) {
    let elapsed = millis() - challengeStartMillis;
    let indexToShow = floor(elapsed / 1000);
    if (indexToShow < targetPattern.length) {
      fill(C_TEXT_LIGHT);
      textSize(20);
      text("ADQUIRIENDO SECUENCIA...", centerX, centerY - 60);
      let colorIdx = targetPattern[indexToShow];
      fill(patternColors[colorIdx]);
      stroke(C_TEXT_LIGHT);
      strokeWeight(3);
      rectMode(CENTER);
      rect(centerX, centerY + 20, 100, 100, 10);
    } else {
      isDisplayingPattern = false;
    }
  } else {
    fill(C_TEXT_LIGHT);
    textSize(16);
    text("INGRESE SECUENCIA EN ORDEN INVERSO", centerX, centerY - 60);
    rectMode(CORNER);
    for (let i = 0; i < 4; i++) {
      fill(patternColors[i]);
      stroke(C_PANEL_BG);
      strokeWeight(2);
      rect(centerX - 160 + i * 90, centerY - 20, 70, 70, 8);
    }
    fill(C_ACCENT_LINE);
    text("BUFFER: " + inputPattern.length + "/4", centerX, centerY + 100);
  }
  pop();
}

function handlePatternClick() {
  if (isDisplayingPattern) return;
  let centerY = height / 2;
  let centerX = width / 2;
  for (let i = 0; i < 4; i++) {
    let bx = centerX - 160 + i * 90;
    if (
      mouseX > bx &&
      mouseX < bx + 70 &&
      mouseY > centerY - 20 &&
      mouseY < centerY + 50
    ) {
      let expectedIndex = targetPattern.length - 1 - inputPattern.length;
      if (targetPattern[expectedIndex] === i) {
        inputPattern.push(i);
        if (inputPattern.length === targetPattern.length) completeLetter();
      } else {
        failTotal("Error en la secuencia de memoria.");
      }
    }
  }
}

// --- 3. RITMO ---
function setupRhythm() {
  clickCounter = 0;
  lastClickTime = millis();
}

function drawChallengeRhythm() {
  push();
  let centerY = height / 2;
  let elapsed = millis() - lastClickTime;

  drawTechnicalPanel(width / 2, centerY, 450, 250, "SINCRONIZACIÓN");

  textAlign(CENTER);
  fill(C_TEXT_LIGHT);
  textSize(16);
  text("Pulsación cada 1.50 segundos.", width / 2, centerY - 50);
  fill(C_ACCENT_LINE);
  text("RESTANTES: " + (targetClicks - clickCounter), width / 2, centerY - 25);

  let btnColor = C_KEY_BASE;
  if (
    mouseIsPressed &&
    mouseX > width / 2 - 60 &&
    mouseX < width / 2 + 60 &&
    mouseY > centerY + 10 &&
    mouseY < centerY + 70
  ) {
    btnColor = C_KEY_ACTIVE;
  }
  fill(btnColor);
  stroke(C_ACCENT_LINE);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width / 2, centerY + 40, 140, 60, 8);

  fill(C_TEXT_LIGHT);
  textSize(20);
  text("EJECUTAR", width / 2, centerY + 48);

  fill(C_PANEL_BG);
  stroke(C_ACCENT_LINE);
  rectMode(CENTER);
  rect(width / 2, centerY + 100, 200, 15);

  let barW = map(elapsed, 0, clickInterval, 0, 200);
  if (barW > 200) fill(C_KEY_ACTIVE);
  else fill(C_KEY_SOLVED);
  noStroke();
  rectMode(CORNER);
  rect(width / 2 - 100, centerY + 100 - 7.5, barW, 15);

  stroke(C_TEXT_LIGHT);
  strokeWeight(2);
  line(width / 2 + 100, centerY + 90, width / 2 + 100, centerY + 110);

  if (elapsed > clickInterval + 500) failTotal("Tiempo agotado.");
  pop();
}

function handleRhythmClick() {
  let centerY = height / 2;
  if (
    mouseX > width / 2 - 70 &&
    mouseX < width / 2 + 70 &&
    mouseY > centerY + 10 &&
    mouseY < centerY + 70
  ) {
    let elapsed = millis() - lastClickTime;
    if (elapsed > clickInterval - 300 && elapsed < clickInterval + 300) {
      clickCounter++;
      lastClickTime = millis();
      if (clickCounter >= targetClicks) completeLetter();
    } else {
      failTotal("Error de sincronización.");
    }
  }
}

// --- 4. ARRASTRE ---
function setupDrag() {
  isDraggingActive = false;
  dragTargetPos = createVector(width / 2, height / 2 + 50);
}

function startDragging() {
  let d = dist(mouseX, mouseY, dragTargetPos.x, dragTargetPos.y);
  if (d < 30) {
    isDraggingActive = true;
    challengeStartMillis = millis();
  }
}

function drawChallengeDrag() {
  push();
  let centerY = height / 2;
  drawTechnicalPanel(width / 2, centerY, 500, 300, "SEGUIMIENTO");
  textAlign(CENTER);
  fill(C_TEXT_LIGHT);
  textSize(16);
  text("Mantenga el cursor en el objetivo (3s).", width / 2, centerY - 110);

  dragTargetPos.x = width / 2 + sin(millis() * 0.003) * 150;
  dragTargetPos.y = centerY + cos(millis() * 0.005) * 60;

  noFill();
  stroke(C_KEY_ACTIVE);
  strokeWeight(3);
  ellipse(dragTargetPos.x, dragTargetPos.y, 70);
  fill(C_KEY_ACTIVE);
  noStroke();
  ellipse(dragTargetPos.x, dragTargetPos.y, 30);

  if (isDraggingActive) {
    if (dist(mouseX, mouseY, dragTargetPos.x, dragTargetPos.y) > 35) {
      isDraggingActive = false;
    }
    let progress = (millis() - challengeStartMillis) / trackingDuration;

    fill(C_PANEL_BG);
    stroke(C_ACCENT_LINE);
    rectMode(CENTER);
    rect(width / 2, centerY + 100, 200, 20);

    fill(C_KEY_SOLVED);
    noStroke();
    rectMode(CORNER);
    rect(width / 2 - 100, centerY + 90, 200 * progress, 20);

    fill(C_TEXT_LIGHT);
    text(floor(progress * 100) + "%", width / 2, centerY + 135);

    if (progress >= 1) completeLetter();
  }
  pop();
}

// --- ENTER FINAL ---
function triggerAnnoyingEnter() {
  if (typedName.length === targetName.length && !isConfirming) {
    isConfirming = true;
    confirmationStartMillis = millis();
    enterButton.hide();
  }
}

function handleConfirmation() {
  if (!isConfirming) return;
  push();
  let progress = (millis() - confirmationStartMillis) / confirmationDuration;
  progress = constrain(progress, 0, 1);

  fill(C_BG);
  noStroke();
  rectMode(CORNER);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(C_KEY_ACTIVE);
  textSize(24);
  text(">>> FINALIZANDO PROTOCOLO <<<", width / 2, height / 2 - 80);

  fill(C_TEXT_LIGHT);
  textSize(16);
  text("Mantenga la presión para confirmar.", width / 2, height / 2 - 40);

  noFill();
  stroke(C_ACCENT_LINE);
  strokeWeight(4);
  rectMode(CENTER);
  rect(width / 2, height / 2 + 20, 400, 50, 10);

  fill(C_KEY_ACTIVE);
  noStroke();
  rectMode(CORNER);
  rect(width / 2 - 195, height / 2 + 20 - 20, 390 * progress, 40, 8);

  fill(C_TEXT_LIGHT);
  text(floor(progress * 100) + "%", width / 2, height / 2 + 80);
  pop();

  if (progress >= 1) {
    isConfirming = false;
    alert("SISTEMA: Escritura confirmada. Cerrando.");
    location.reload();
  }
}
