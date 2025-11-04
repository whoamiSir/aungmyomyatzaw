let selectedLanguage = 'en';

// Game state tracking
let gameActive = false;
let currentGameType = null;
let snakeGameRunning = false;
let tttGameActive = false;
let memoryGameActive = false;

// Game initialization tracking
let snakeInitialized = false;
let tttInitialized = false;
let memInitialized = false;

// Snake game variables
let currentSnakeDX = 0, currentSnakeDY = 0;
let cursorVisible = true;
let cursorTimeout;


// ============================================
// MEMORY LEAK PREVENTION - ADD THESE VARIABLES
// ============================================

// Animation intervals for cleanup
let matrixInterval;
let loadingAnimationId;
let mainAnimationId;
let connectionLines = null;

// Game cleanup trackers
let currentGameControls = null;
let currentGameLoop = null;
let currentTTTControls = null;
let currentMemoryControls = null;
let currentMemoryTimer = null;

// Three.js cleanup
let threeSceneObjects = [];

// ============================================
// CURSOR MANAGEMENT
// ============================================

function showCursor() {
  if (!cursorVisible) {
    customCursor.style.opacity = '1';
    cursorDot.style.opacity = '1';
    cursorVisible = true;
  }
  clearTimeout(cursorTimeout);
}

function hideCursor() {
  cursorTimeout = setTimeout(() => {
    customCursor.style.opacity = '0';
    cursorDot.style.opacity = '0';
    cursorVisible = false;
  }); 
}

function forceHideCursor() {
  clearTimeout(cursorTimeout);
  customCursor.style.opacity = '0';
  cursorDot.style.opacity = '0';
  cursorVisible = false;
}

hideCursor();

// Hide cursor after any button click or interaction
document.addEventListener('click', () => {
  setTimeout(hideCursor, 500);
});

// Specifically for your game control buttons
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('game-control-btn') || 
      e.target.classList.contains('cmd-button') ||
      e.target.classList.contains('nav-arrow') ||
      e.target.classList.contains('minimap-cell')) {
    setTimeout(hideCursor, 300);
  }
});

// Also hide cursor when tapping anywhere on mobile
document.addEventListener('touchend', (e) => {
  if (e.touches && e.touches.length === 0) {
    setTimeout(hideCursor, 500);
  }
});

// ============================================
// HOVER EFFECTS
// ============================================

function addButtonHoverEffect(button) {
  if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    button.style.setProperty('background', '#0f0', 'important');
    button.style.setProperty('color', '#000', 'important');
    button.style.setProperty('transform', 'scale(1.05)', 'important');
    button.style.setProperty('box-shadow', '0 0 15px #0f0', 'important');
    
    setTimeout(() => {
      button.style.removeProperty('background');
      button.style.removeProperty('color');
      button.style.removeProperty('transform');
      button.style.removeProperty('box-shadow');
    }, 150);
  }
}

// Apply to all interactive elements
document.addEventListener('click', (e) => {
  if (e.target.matches('.game-control-btn, .cmd-button, .nav-arrow, .minimap-cell:not(.empty), .terminal-btn, .lang-btn, .project-menu-btn, .cert-card')) {
    addButtonHoverEffect(e.target);
  }
});

// Also for touch events
document.addEventListener('touchend', (e) => {
  const touch = e.changedTouches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (element && element.matches('.game-control-btn, .cmd-button, .nav-arrow, .minimap-cell:not(.empty), .terminal-btn, .lang-btn, .project-menu-btn, .cert-card')) {
    addButtonHoverEffect(element);
  }
});

// ============================================
// TOUCH HANDLING
// ============================================

document.addEventListener('touchstart', handleTouch);
document.addEventListener('touchmove', handleTouch);
document.addEventListener('touchend', handleTouch);

function handleTouch(e) {
  showCursor();
  if (e.type === 'touchend') {
    return;
  }
  const touch = e.touches[0];
  
  // Update cursor position
  customCursor.style.left = touch.clientX + 'px';
  customCursor.style.top = touch.clientY + 'px';
  cursorDot.style.left = touch.clientX + 'px';
  cursorDot.style.top = touch.clientY + 'px';
  
  // Create snow particles for touch movement
  const distance = Math.sqrt(Math.pow(touch.clientX - lastX, 2) + Math.pow(touch.clientY - lastY, 2));
  if (distance > 10) {
    createSnowParticle(touch.clientX, touch.clientY);
    lastX = touch.clientX;
    lastY = touch.clientY;
  }
}

// ============================================
// MOBILE GAME BUTTONS
// ============================================

function setupMobileGameButtons() {
  // Snake game buttons
  const snakeEnterBtn = document.getElementById('snake-enter-btn');
  const snakeRestartBtn = document.getElementById('snake-restart-btn');
  
  if (snakeEnterBtn) {
    snakeEnterBtn.addEventListener('click', () => {
      if (!snakeInitialized) {
        startSnakeGame();
      } else if (gameKeyboardActive && currentGameType === 'snake') {
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' });
        document.dispatchEvent(escEvent);
      } else {
        startSnakeGame();
      }
    });
  }

  if (snakeRestartBtn) {
    snakeRestartBtn.addEventListener('click', () => {
      if (gameKeyboardActive && currentGameType === 'snake') {
        const rEvent = new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', keyCode: 82 });
        document.dispatchEvent(rEvent);
      }
    });
  }

  // TicTacToe buttons
  const tttEnterBtn = document.getElementById('ttt-enter-btn');
  const tttRestartBtn = document.getElementById('ttt-restart-btn');
  
  if (tttEnterBtn) {
    tttEnterBtn.addEventListener('click', () => {
      if (!tttInitialized) {
        startTicTacToe();
      } else if (gameKeyboardActive && currentGameType === 'tictactoe') {
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 });
        document.dispatchEvent(escEvent);
      } else {
        startTicTacToe();
      }
    });
  }
  
  if (tttRestartBtn) {
    tttRestartBtn.addEventListener('click', () => {
      if (gameKeyboardActive && currentGameType === 'tictactoe') {
        const rEvent = new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', keyCode: 82 });
        document.dispatchEvent(rEvent);
      }
    });
  }

  // Memory game buttons
  const memoryEnterBtn = document.getElementById('memory-enter-btn');
  const memoryRestartBtn = document.getElementById('memory-restart-btn');
  
  if (memoryEnterBtn) {
    memoryEnterBtn.addEventListener('click', () => {
      if (!memInitialized) {
        startMemoryGame();
      } else if (gameKeyboardActive && currentGameType === 'memory') {
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 });
        document.dispatchEvent(escEvent);
      } else {
        startMemoryGame();
      }
    });
  }
  
  if (memoryRestartBtn) {
    memoryRestartBtn.addEventListener('click', () => {
      if (gameKeyboardActive && currentGameType === 'memory') {
        const rEvent = new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', keyCode: 82 });
        document.dispatchEvent(rEvent);
      }
    });
  }
}

function updateMobileGameButtons() {
  // Snake buttons
  const snakeEnterBtn = document.getElementById('snake-enter-btn');
  if (snakeEnterBtn) {
    snakeEnterBtn.textContent = (gameKeyboardActive && currentGameType === 'snake') ? '⏹️ ESC' : '🎮 ENTER';
  }

  // TicTacToe buttons
  const tttEnterBtn = document.getElementById('ttt-enter-btn');
  if (tttEnterBtn) {
    tttEnterBtn.textContent = (gameKeyboardActive && currentGameType === 'tictactoe') ? '⏹️ ESC' : '🎮 ENTER';
  }

  // Memory buttons
  const memoryEnterBtn = document.getElementById('memory-enter-btn');
  if (memoryEnterBtn) {
    memoryEnterBtn.textContent = (gameKeyboardActive && currentGameType === 'memory') ? '⏹️ ESC' : '🎮 ENTER';
  }
}

// ============================================
// GAME MANAGEMENT
// ============================================

function exitGame() {
  gameActive = false;
  currentGameType = null;
  gameKeyboardActive = false;
  snakeGameRunning = false;
  tttGameActive = false;
  memoryGameActive = false;
  
  // Clean up game-specific resources
  if (currentGameLoop) {
    clearTimeout(currentGameLoop);
    currentGameLoop = null;
  }
  
  if (currentGameControls) {
    document.removeEventListener('keydown', currentGameControls);
    currentGameControls = null;
  }
  
  if (currentTTTControls) {
    document.removeEventListener('keydown', currentTTTControls);
    currentTTTControls = null;
  }
  
  if (currentMemoryControls) {
    document.removeEventListener('keydown', currentMemoryControls);
    currentMemoryControls = null;
  }
  
  if (currentMemoryTimer) {
    clearInterval(currentMemoryTimer);
    currentMemoryTimer = null;
  }

  if (currentGameType === 'snake') {
    snakeInitialized = false;
  }

  updateMobileGameButtons();
}

// ============================================
// CURSOR WITH SNOW TRAIL
// ============================================

const customCursor = document.querySelector('.custom-cursor');
const cursorDot = document.querySelector('.cursor-dot');
let lastX = 0, lastY = 0, snowParticles = [];

document.addEventListener('mousemove', (e) => {
  showCursor();
  customCursor.style.left = e.clientX + 'px';
  customCursor.style.top = e.clientY + 'px';
  cursorDot.style.left = e.clientX + 'px';
  cursorDot.style.top = e.clientY + 'px';

  const distance = Math.sqrt(Math.pow(e.clientX - lastX, 2) + Math.pow(e.clientY - lastY, 2));
  if (distance > 10) {
    createSnowParticle(e.clientX, e.clientY);
    lastX = e.clientX;
    lastY = e.clientY;
  }
});

function createSnowParticle(x, y) {
  // ENFORCE LIMIT BEFORE CREATING
  while (snowParticles.length >= 20) {
    const old = snowParticles.shift();
    if (old?.parentNode) old.parentNode.removeChild(old);
  }
  
  const particle = document.createElement('div');
  particle.className = 'snow-particle';
  particle.style.left = x + 'px';
  particle.style.top = y + 'px';
  particle.style.width = (Math.random() * 3 + 2) + 'px';
  particle.style.height = particle.style.width;
  document.body.appendChild(particle);
  snowParticles.push(particle);
  
  setTimeout(() => {
    if (particle?.parentNode) {
      particle.parentNode.removeChild(particle);
      snowParticles = snowParticles.filter(p => p !== particle);
    }
  }, 600); // Reduced lifetime
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

function showProjectSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  const parentCodeBlock = section.closest('.code-block');
  const allSections = parentCodeBlock.querySelectorAll('.project-content-section');
  
  allSections.forEach(s => s.style.display = 'none');
  section.style.display = 'block';
}

// ============================================
// LANGUAGE SELECTION
// ============================================

function selectLanguage(lang) {
  selectedLanguage = lang;
  document.getElementById('lang-selector').style.display = 'none';
  document.getElementById('loading-progress').style.display = 'block';
  document.getElementById('loading-text').textContent = lang === 'en' ? 'Loading...' : 'တင်နေသည်...';
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20;
    if(progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        
        // CLEANUP LOADING ANIMATION
        if (loadingAnimationId) {
          cancelAnimationFrame(loadingAnimationId);
          loadingAnimationId = null;
        }
        
        // Dispose loading scene
        if (particlesGeometry) {
          particlesGeometry.dispose();
        }
        if (particlesMaterial) {
          particlesMaterial.dispose();
        }
        if (loadingRenderer) {
          loadingRenderer.dispose();
          loadingRenderer.forceContextLoss();
        }
      }, 500);
    }
    document.getElementById('progress-bar').style.width = progress + '%';
  }, 150);
}

// ============================================
// 3D LOADING EFFECT - PARTICLES + WAVES
// ============================================

const loadingCanvas = document.getElementById('loading-canvas');
const loadingScene = new THREE.Scene();
const loadingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const loadingRenderer = new THREE.WebGLRenderer({ canvas: loadingCanvas, alpha: true, antialias: false });
loadingRenderer.setSize(window.innerWidth, window.innerHeight);
loadingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// Particle system
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 800;
const posArray = new Float32Array(particlesCount * 3);
const velocities = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i += 3) {
  posArray[i] = (Math.random() - 0.5) * 60;
  posArray[i + 1] = (Math.random() - 0.5) * 60;
  posArray[i + 2] = (Math.random() - 0.5) * 60;
  velocities[i] = (Math.random() - 0.5) * 0.02;
  velocities[i + 1] = (Math.random() - 0.5) * 0.02;
  velocities[i + 2] = (Math.random() - 0.5) * 0.02;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
  size: 0.1,
  color: 0x00ff00,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
loadingScene.add(particlesMesh);

// Connection lines
const linesGeometry = new THREE.BufferGeometry();
const linesMaterial = new THREE.LineBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.3
});
const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
loadingScene.add(linesMesh);

loadingCamera.position.z = 30;

function animateLoading() {
  if(!document.getElementById('loading-screen').classList.contains('hidden')) {
    loadingAnimationId = requestAnimationFrame(animateLoading);
    
    const positions = particlesGeometry.attributes.position.array;
    for(let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] += velocities[i];
      positions[i + 1] += velocities[i + 1];
      positions[i + 2] += velocities[i + 2];
      
      if(Math.abs(positions[i]) > 30) velocities[i] *= -1;
      if(Math.abs(positions[i + 1]) > 30) velocities[i + 1] *= -1;
      if(Math.abs(positions[i + 2]) > 30) velocities[i + 2] *= -1;
    }
    particlesGeometry.attributes.position.needsUpdate = true;
    
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.x += 0.0005;
    
    loadingRenderer.render(loadingScene, loadingCamera);
  }
}
animateLoading();

// ============================================
// MATRIX RAIN BACKGROUND - WITH CLEANUP
// ============================================

const matrixCanvas = document.getElementById('matrix-canvas');
const matrixCtx = matrixCanvas.getContext('2d');
matrixCanvas.width = window.innerWidth;
matrixCanvas.height = window.innerHeight;

const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
const fontSize = 14;
const columns = matrixCanvas.width / fontSize;
const drops = [];

for(let i = 0; i < columns; i++) {
  drops[i] = Math.random() * -100;
}

function drawMatrix() {
    if (drops[0] % 10 === 0) {
    matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    matrixCtx.fillStyle = '#000';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  } else {
    matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  }
  


  matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  
  matrixCtx.fillStyle = '#0f0';
  matrixCtx.font = fontSize + 'px monospace';
  
  for(let i = 0; i < drops.length; i++) {
    const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
    matrixCtx.fillText(text, i * fontSize, drops[i] * fontSize);
    
    if(drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

// Start matrix rain with cleanup capability
function startMatrixRain() {
  if (matrixInterval) {
    clearInterval(matrixInterval);
  }
  matrixInterval = setInterval(drawMatrix, 50);
}

function stopMatrixRain() {
  if (matrixInterval) {
    clearInterval(matrixInterval);
    matrixInterval = null;
  }
}

// Start the matrix rain
startMatrixRain();

// ============================================
// MAIN 3D BACKGROUND - PARTICLES + NETWORK
// ============================================

const canvas = document.getElementById('canvas-3d');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// Main particle system
const mainParticlesGeometry = new THREE.BufferGeometry();
const mainParticlesCount = window.innerWidth < 768 ? 300 : 600;
const mainPosArray = new Float32Array(mainParticlesCount * 3);
const mainVelocities = new Float32Array(mainParticlesCount * 3);

for(let i = 0; i < mainParticlesCount * 3; i += 3) {
  mainPosArray[i] = (Math.random() - 0.5) * 80;
  mainPosArray[i + 1] = (Math.random() - 0.5) * 80;
  mainPosArray[i + 2] = (Math.random() - 0.5) * 80;
  mainVelocities[i] = (Math.random() - 0.5) * 0.015;
  mainVelocities[i + 1] = (Math.random() - 0.5) * 0.015;
  mainVelocities[i + 2] = (Math.random() - 0.5) * 0.015;
}

mainParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(mainPosArray, 3));
const mainParticlesMaterial = new THREE.PointsMaterial({
  size: 0.08,
  color: 0x00ff00,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending
});

const mainParticlesMesh = new THREE.Points(mainParticlesGeometry, mainParticlesMaterial);
scene.add(mainParticlesMesh);
threeSceneObjects.push(mainParticlesMesh);

// Network connections
const maxDistance = 15;

function updateConnections() {
  const positions = mainParticlesGeometry.attributes.position.array;
  const linePositions = [];
  
  for(let i = 0; i < mainParticlesCount; i++) {
    for(let j = i + 1; j < mainParticlesCount; j++) {
      const i3 = i * 3;
      const j3 = j * 3;
      
      const dx = positions[i3] - positions[j3];
      const dy = positions[i3 + 1] - positions[j3 + 1];
      const dz = positions[i3 + 2] - positions[j3 + 2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if(distance < maxDistance) {
        linePositions.push(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        linePositions.push(positions[j3], positions[j3 + 1], positions[j3 + 2]);
      }
    }
  }
  
  // REUSE existing lines instead of creating new ones
  if (connectionLines) {
    connectionLines.geometry.dispose(); // Dispose old geometry
    connectionLines.geometry = new THREE.BufferGeometry();
    connectionLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  } else {
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    
    const linesMat = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.15
    });
    
    connectionLines = new THREE.LineSegments(linesGeo, linesMat);
    scene.add(connectionLines);
  }
}


camera.position.z = 40;

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

let frameCount = 0;
function animate() {
  mainAnimationId = requestAnimationFrame(animate);
  
    frameCount++;
  
  // Only update GPU buffer every 3 frames instead of every frame
  if (frameCount % 3 === 0) {
    const positions = mainParticlesGeometry.attributes.position.array;
    for(let i = 0; i < mainParticlesCount * 3; i += 3) {
      positions[i] += mainVelocities[i];
      positions[i + 1] += mainVelocities[i + 1];
      positions[i + 2] += mainVelocities[i + 2];
      
      if(Math.abs(positions[i]) > 40) mainVelocities[i] *= -1;
      if(Math.abs(positions[i + 1]) > 40) mainVelocities[i + 1] *= -1;
      if(Math.abs(positions[i + 2]) > 40) mainVelocities[i + 2] *= -1;
    }
    mainParticlesGeometry.attributes.position.needsUpdate = true;
  }

  const positions = mainParticlesGeometry.attributes.position.array;
  for(let i = 0; i < mainParticlesCount * 3; i += 3) {
    positions[i] += mainVelocities[i];
    positions[i + 1] += mainVelocities[i + 1];
    positions[i + 2] += mainVelocities[i + 2];
    
    if(Math.abs(positions[i]) > 40) mainVelocities[i] *= -1;
    if(Math.abs(positions[i + 1]) > 40) mainVelocities[i + 1] *= -1;
    if(Math.abs(positions[i + 2]) > 40) mainVelocities[i + 2] *= -1;
  }
  mainParticlesGeometry.attributes.position.needsUpdate = true;
  
  // Update connections every 5 frames for performance
  frameCount++;
  if(frameCount % 5 === 0) {
    updateConnections();
  }
  
  mainParticlesMesh.rotation.y += 0.0005;
  
  camera.position.x = mouseX * 3;
  camera.position.y = mouseY * 3;
  camera.lookAt(0, 0, 0);
  
  renderer.render(scene, camera);
}
animate();

// ============================================
// BURMESE TEXT ANIMATION
// ============================================

const burmeseLayer = document.getElementById('burmese-layer');
const burmeseWords = ['မင်္ဂလာပါ', 'ကျေးဇူးတင်ပါတယ်', 'AMMZ', 'Developer', 'Myanmar'];
for(let i = 0; i < 10; i++) {
  const word = document.createElement('div');
  word.className = 'burmese-word';
  word.textContent = burmeseWords[i % burmeseWords.length];
  word.style.top = (i * 10) + '%';
  word.style.animationDelay = (i * 2) + 's';
  burmeseLayer.appendChild(word);
}

// ============================================
// NAVIGATION SYSTEM
// ============================================

let currentX = 0, currentY = 0, gameKeyboardActive = false;
const container = document.getElementById('sections-container');
const navArrows = document.querySelectorAll('.nav-arrow[data-direction]');

function updatePosition() {
  container.style.transform = `translate(${-currentX * 100}vw, ${-currentY * 100}vh)`;
}

// Game controls via nav buttons
function handleGameControl(direction) {
  if (!gameActive) return;
  
  switch(currentGameType) {
    case 'snake':
      handleSnakeControl(direction);
      break;
    case 'tictactoe':
      handleTicTacToeControl(direction);
      break;
    case 'memory':
      handleMemoryControl(direction);
      break;
  }
}

// Snake game controls
function handleSnakeControl(direction) {
  if (!snakeGameRunning) return;
  
  switch(direction) {
    case 'up':
      if (currentSnakeDY === 0) { currentSnakeDX = 0; currentSnakeDY = -1; }
      break;
    case 'down':
      if (currentSnakeDY === 0) { currentSnakeDX = 0; currentSnakeDY = 1; }
      break;
    case 'left':
      if (currentSnakeDX === 0) { currentSnakeDX = -1; currentSnakeDY = 0; }
      break;
    case 'right':
      if (currentSnakeDX === 0) { currentSnakeDX = 1; currentSnakeDY = 0; }
      break;
    case 'home':
      exitGame();
      break;
  }
}

// TicTacToe game controls
function handleTicTacToeControl(direction) {
  if (!tttGameActive) return;
  
  switch(direction) {
    case 'home':
      exitGame();
      break;
  }
}

// Memory game controls  
function handleMemoryControl(direction) {
  if (!memoryGameActive) return;
  
  switch(direction) {
    case 'home':
      exitGame();
      break;
  }
}

// Main navigation function
function navigate(direction) {
  if (gameActive) {
    handleGameControl(direction);
    return;
  }
  
  if (gameKeyboardActive) return;
  
  // ONLY block UP/DOWN on project 1 and 2 (x=1,2 at y=1) and certificates (x=1 at y=0)
  if ((currentX === 1 && currentY === 1) || (currentX === 2 && currentY === 1) || (currentX === 1 && currentY === 0)) {
    if (direction === 'up' || direction === 'down') {
      return;
    }
  }
  
  if (direction === 'up') {
    if (currentY === 0 && currentX === 0) { currentY = -1; currentX = 0; }
    else if (currentY === -1 || currentY === 1) { currentY = 0; currentX = 0; }
    else if (currentY === 0 && (currentX === -1 || currentX === 1)) { currentY = 0; currentX = 0; }
  } 
  else if (direction === 'down') {
    if (currentY === 0 && currentX === 0) { currentY = 1; currentX = 0; }
    else if (currentY === -1 || currentY === 1) { currentY = 0; currentX = 0; }
    else if (currentY === 0 && (currentX === -1 || currentX === 1)) { currentY = 0; currentX = 0; }
  } 
  else if (direction === 'left') {
    if (currentY === 0) {
      if (currentX === -1) currentX = 0;
      else if (currentX === 0) currentX = -1;
      else if (currentX === 1) currentX = 0;
    } else if (currentY === -1) { currentY = 0; currentX = 0; }
    else if (currentY === 1) {
      if (currentX === 0) currentX = -1;
      else if (currentX === -1) currentX = -2;
      else if (currentX === -2) currentX = -3;
      else if (currentX === -3) currentX = 0;
      else if (currentX === 1) currentX = 0;
      else if (currentX === 2) currentX = 1;
      else if (currentX === 3) currentX = 2;
    }
  } 
  else if (direction === 'right') {
    if (currentY === 0) {
      if (currentX === -1) currentX = 0;
      else if (currentX === 0) currentX = 1;
      else if (currentX === 1) currentX = 0;
    } else if (currentY === -1) { currentY = 0; currentX = 0; }
    else if (currentY === 1) {
      if (currentX === 0) currentX = 1;
      else if (currentX === 1) currentX = 2;
      else if (currentX === 2) currentX = 3;
      else if (currentX === 3) currentX = 0;
      else if (currentX === -1) currentX = 0;
      else if (currentX === -2) currentX = -1;
      else if (currentX === -3) currentX = -2;
    }
  }

  updatePosition();
  updateMinimap(currentX, currentY);
  if (currentX === -1 && currentY === 1) initSnakeGame();
  if (currentX === -2 && currentY === 1) initTicTacToe();
  if (currentX === -3 && currentY === 1) initMemoryGame();
}

navArrows.forEach(arrow => {
  arrow.addEventListener('click', () => navigate(arrow.getAttribute('data-direction')));
});

let scrollTimeout;
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navigate(e.deltaY > 0 ? 'down' : 'up');
    } else {
      navigate(e.deltaX > 0 ? 'right' : 'left');
    }
  }, 100);
}, { passive: false });

// Keyboard event listener
document.addEventListener('keydown', (e) => {
  if (gameActive) {
    switch(e.key) {
      case 'ArrowUp': e.preventDefault(); handleGameControl('up'); break;
      case 'ArrowDown': e.preventDefault(); handleGameControl('down'); break;
      case 'ArrowLeft': e.preventDefault(); handleGameControl('left'); break;
      case 'ArrowRight': e.preventDefault(); handleGameControl('right'); break;
      case 'Escape': e.preventDefault(); exitGame(); break;
      case 'Enter': e.preventDefault(); break;
    }
  } else {
    if (gameKeyboardActive) return;
    
    const isProject1 = Math.abs(currentX - 1) < 0.1 && Math.abs(currentY - 1) < 0.1;
    const isProject2 = Math.abs(currentX - 2) < 0.1 && Math.abs(currentY - 1) < 0.1;
    const isProject3 = Math.abs(currentX - 3) < 0.1 && Math.abs(currentY - 1) < 0.1;
    const isProjectSection = isProject1 || isProject2 || isProject3;
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile && isProjectSection) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        return;
      }
    }
    
    if (e.key === 'ArrowUp') { e.preventDefault(); navigate('up'); }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigate('down'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigate('left'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate('right'); }
  }
});

let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;
  
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 50) navigate('right');
    else if (diffX < -50) navigate('left');
  } else {
    if (diffY > 50) navigate('down');
    else if (diffY < -50) navigate('up');
  }
  hideCursor();
});

// ============================================
// CONTENT MANAGEMENT
// ============================================

function showAbout() {
  document.getElementById('about-content').style.display = 'block';
  document.getElementById('experience-content').style.display = 'none';
}

function showExperience() {
  document.getElementById('about-content').style.display = 'none';
  document.getElementById('experience-content').style.display = 'block';
}

function updateMinimap(x, y) {
  document.querySelectorAll('.minimap-cell[data-pos], .game-label[data-pos]').forEach(cell => {
    const pos = cell.getAttribute('data-pos');
    if (pos) {
      const [cellX, cellY] = pos.split(',').map(Number);
      cell.classList.toggle('active', cellX === x && cellY === y);
    }
  });
}

document.querySelectorAll('.minimap-cell[data-pos], .game-label[data-pos]').forEach(cell => {
  cell.addEventListener('click', () => {
    const pos = cell.getAttribute('data-pos');
    if (pos) {
      const [targetX, targetY] = pos.split(',').map(Number);
      currentX = targetX;
      currentY = targetY;
      updatePosition();
      updateMinimap(currentX, currentY);
      
      if (currentX === -1 && currentY === 1) initSnakeGame();
      if (currentX === -2 && currentY === 1) initTicTacToe();
      if (currentX === -3 && currentY === 1) initMemoryGame();
    }
  });
});

// Home button click handler
document.querySelector('.nav-arrow.home-btn').addEventListener('click', () => {
  currentX = 0;
  currentY = 0;
  updatePosition();
  updateMinimap(currentX, currentY);
});

// ============================================
// SCROLL MANAGEMENT
// ============================================

let currentScrollElement = null;

document.addEventListener('wheel', (e) => {
  const isProject1 = currentX === 1 && currentY === 1;
  const isProject2 = currentX === 2 && currentY === 1;
  const isCertificate = currentX === 3 && currentY === 1;

  if (!isProject1 && !isProject2 && !isCertificate) return;

  const codeBlock = document.querySelector('.code-block');
  if (!codeBlock || codeBlock.scrollHeight <= codeBlock.clientHeight) return;
  
  e.stopPropagation();
  codeBlock.scrollTop += e.deltaY;
}, { passive: false });

document.addEventListener('wheel', (e) => {
  const isProject1 = currentX === 1 && currentY === 1;
  const isProject2 = currentX === 2 && currentY === 1;
  const isCertificate = currentX === 3 && currentY === 1;

  if (isProject1 || isProject2 || isCertificate) {
    const codeBlock = document.querySelector('.code-block');
    if (!codeBlock || codeBlock.scrollHeight <= codeBlock.clientHeight) return;
    
    e.stopPropagation();
    codeBlock.scrollTop += e.deltaY;
    return;
  }
  
  e.preventDefault();
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navigate(e.deltaY > 0 ? 'down' : 'up');
    } else {
      navigate(e.deltaX > 0 ? 'right' : 'left');
    }
  }, 100);
}, { passive: false });

// ============================================
// GAMES CODE (Snake, Tic-Tac-Toe, Memory) - WITH MEMORY CLEANUP
// ============================================

function initSnakeGame() {
  if (snakeInitialized) return;
  snakeInitialized = true;
  
  const content = document.getElementById('snake-content');
  content.innerHTML = `
    <div><span class="prompt">root@ammz:~/games/snake$</span> cat README.md</div>
    <div style="margin: 0.8rem 0; font-size: 0.85rem;">
      <span class="keyword">🐍 SNAKE GAME</span><br>
      <span class="comment"># Eat yellow food, don't hit walls</span>
    </div>
    <div><span class="prompt">root@ammz:~/games/snake$</span> <span>python3 snake.py</span><span class="typing-cursor"></span></div><br><br>
    <div style="margin: 0.5rem 0; font-size: 0.8rem;">
      <span class="string">Press ENTER to start | ESC to exit</span>
    </div>
  `;
  
  const keyHandler = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startSnakeGame();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  document.addEventListener('keydown', keyHandler);
}

function startSnakeGame() {
  gameActive = true;
  currentGameType = 'snake';
  gameKeyboardActive = true;
  snakeGameRunning = true;
  
  const content = document.getElementById('snake-content');
  content.innerHTML = `
    <div><span class="prompt">root@ammz:~/games/snake$</span> python3 snake.py</div>
    <div style="margin: 0.5rem 0; font-size: 0.8rem;">
      Score: <span id="snake-score" style="color: #0f0;">0</span> | <span style="color: #0f08;">WASD/Arrows | ESC=exit R=restart</span>
    </div>
    <div class="game-canvas-center">
      <canvas id="snake-canvas" width="400" height="400"></canvas>
    </div>
    <div style="margin-top: 0.5rem;"><span class="prompt">root@ammz:~/games/snake$</span> <span class="typing-cursor"></span></div>
  `;
  
  const canvas = document.getElementById('snake-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('snake-score');
  
  const gridSize = 20, tileCount = 20;
  let snake = [{x: 10, y: 10}];
  let food = {x: 15, y: 15};
  let score = 0;
  
  currentSnakeDX = 0;
  currentSnakeDY = 0;
  
  function drawGame() {
    if (!snakeGameRunning) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (currentSnakeDX !== 0 || currentSnakeDY !== 0) {
      const head = {x: snake[0].x + currentSnakeDX, y: snake[0].y + currentSnakeDY};
      
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount ||
          snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver();
        return;
      }
      
      snake.unshift(head);
      
      if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
      } else {
        snake.pop();
      }
    }
    
    ctx.fillStyle = '#0f0';
    snake.forEach(s => ctx.fillRect(s.x * gridSize, s.y * gridSize, gridSize - 2, gridSize - 2));
    
    ctx.fillStyle = '#ff0';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
    
    currentGameLoop = setTimeout(() => requestAnimationFrame(drawGame), 120);
  }
  
  function gameOver() {
    snakeGameRunning = false;
    if (currentGameLoop) {
      clearTimeout(currentGameLoop);
      currentGameLoop = null;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f00';
    ctx.font = '28px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
    ctx.fillStyle = '#0f0';
    ctx.font = '20px JetBrains Mono';
    ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 15);
    ctx.font = '16px JetBrains Mono';
    ctx.fillText('ESC to exit | R to restart', canvas.width/2, canvas.height/2 + 45);
  }
  
  function restartGame() {
    if (currentGameLoop) {
      clearTimeout(currentGameLoop);
      currentGameLoop = null;
    }
    startSnakeGame();
  }
  
  const controls = (e) => {
    if (e.key === 'Escape') {
      if (currentGameLoop) {
        clearTimeout(currentGameLoop);
        currentGameLoop = null;
      }
      gameActive = false;
      currentGameType = null;
      gameKeyboardActive = false;
      snakeGameRunning = false;
      snakeInitialized = false;
      document.removeEventListener('keydown', controls);
      initSnakeGame();
      e.preventDefault();
    }
    else if (e.key === 'r' || e.key === 'R') {
      restartGame();
      e.preventDefault();
    }
    else if (snakeGameRunning) {
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && currentSnakeDY === 0) { 
        currentSnakeDX = 0; currentSnakeDY = -1; e.preventDefault(); 
      }
      if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && currentSnakeDY === 0) { 
        currentSnakeDX = 0; currentSnakeDY = 1; e.preventDefault(); 
      }
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && currentSnakeDX === 0) { 
        currentSnakeDX = -1; currentSnakeDY = 0; e.preventDefault(); 
      }
      if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && currentSnakeDX === 0) { 
        currentSnakeDX = 1; currentSnakeDY = 0; e.preventDefault(); 
      }
    }
  };
  
  // Clean up previous controls
  if (currentGameControls) {
    document.removeEventListener('keydown', currentGameControls);
  }
  
  currentGameControls = controls;
  document.addEventListener('keydown', controls);
  drawGame();
  updateMobileGameButtons();
}

function initTicTacToe() {
  if (tttInitialized) return;
  tttInitialized = true;
  
  const content = document.getElementById('ttt-content');
  content.innerHTML = `
    <div><span class="prompt">root@ammz:~/games/tictactoe$</span> cat README.md</div>
    <div style="margin: 0.8rem 0; font-size: 0.85rem;">
      <span class="keyword">⭕ TIC-TAC-TOE</span><br>
      <span class="comment"># You=X, AI=O. Get 3 in a row!</span>
    </div>
    <div><span class="prompt">root@ammz:~/games/tictactoe$</span> <span>python3 tictactoe.py</span><span class="typing-cursor"></span></div><br><br>
    <div style="margin: 0.5rem 0; font-size: 0.8rem;">
      <span class="string">Press ENTER to start | ESC to exit</span>
    </div>
  `;
  
  const keyHandler = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startTicTacToe();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  document.addEventListener('keydown', keyHandler);
}

function startTicTacToe() {
  gameActive = true;
  currentGameType = 'tictactoe';
  gameKeyboardActive = true;
  tttGameActive = true;
  
  const content = document.getElementById('ttt-content');
  
  content.innerHTML = `
    <div><span class="prompt">root@ammz:~/games/tictactoe$</span> python3 tictactoe.py</div>
    <div style="margin: 0.5rem 0; font-size: 0.8rem;">
      <span id="ttt-status" style="color: #0f0;">Your turn (X)</span> | <span style="color: #0f08;">R=restart ESC=exit</span>
    </div>
    <div style="display: flex; justify-content: center; margin: 1rem 0;">
      <div id="ttt-board" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; max-width: 300px; width: 100%;"></div>
    </div>
    <div style="margin-top: 0.5rem;"><span class="prompt">root@ammz:~/games/tictactoe$</span> <span class="typing-cursor"></span></div>
  `;
  
  let board = ['', '', '', '', '', '', '', '', ''];
  let tttGameRunning = true, currentPlayer = 'X';
  const boardEl = document.getElementById('ttt-board');
  
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.style.cssText = `aspect-ratio: 1; background: rgba(0, 255, 0, 0.1); border: 2px solid #0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; cursor: pointer; transition: all 0.2s;`;
    
    cell.addEventListener('click', () => {
      if (board[i] !== '' || !tttGameRunning || currentPlayer !== 'X') return;
      board[i] = 'X';
      updateBoard();
      if (checkWinner('X')) { endGame('🎉 You Win!', '#0f0'); return; }
      if (board.every(c => c !== '')) { endGame('🤝 Draw!', '#ff0'); return; }
      currentPlayer = 'O';
      document.getElementById('ttt-status').textContent = 'AI thinking...';
      setTimeout(aiMove, 400);
    });
    
    cell.addEventListener('mouseenter', () => {
      if (board[i] === '' && tttGameRunning && currentPlayer === 'X') cell.style.background = 'rgba(0, 255, 0, 0.25)';
    });
    cell.addEventListener('mouseleave', () => {
      hideCursor();
      if (board[i] === '') cell.style.background = 'rgba(0, 255, 0, 0.1)';
    });
    
    boardEl.appendChild(cell);
  }
  
  const cells = boardEl.children;
  
  function updateBoard() {
    for (let i = 0; i < 9; i++) {
      cells[i].textContent = board[i];
      cells[i].style.color = board[i] === 'X' ? '#0f0' : '#f0f';
    }
  }
  
  function aiMove() {
    const empty = board.map((c, i) => c === '' ? i : null).filter(i => i !== null);
    
    if (Math.random() > 0.35) {
      for (let i of empty) {
        board[i] = 'O';
        if (checkWinner('O')) { updateBoard(); endGame('🤖 AI Wins!', '#f00'); return; }
        board[i] = '';
      }
      for (let i of empty) {
        board[i] = 'X';
        if (checkWinner('X')) { board[i] = 'O'; updateBoard(); currentPlayer = 'X'; document.getElementById('ttt-status').textContent = 'Your turn (X)'; return; }
        board[i] = '';
      }
      if (board[4] === '') { board[4] = 'O'; updateBoard(); currentPlayer = 'X'; document.getElementById('ttt-status').textContent = 'Your turn (X)'; return; }
    }
    
    const move = empty[Math.floor(Math.random() * empty.length)];
    board[move] = 'O';
    updateBoard();
    if (checkWinner('O')) { endGame('🤖 AI Wins!', '#f00'); return; }
    if (board.every(c => c !== '')) { endGame('🤝 Draw!', '#ff0'); return; }
    currentPlayer = 'X';
    document.getElementById('ttt-status').textContent = 'Your turn (X)';
  }
  
  function checkWinner(player) {
    const patterns = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    return patterns.some(p => p.every(i => board[i] === player));
  }
  
  function endGame(message, color) {
    tttGameRunning = false;
    tttGameActive = false;
    document.getElementById('ttt-status').textContent = message;
    document.getElementById('ttt-status').style.color = color;
  }
  
  function restart() {
    board = ['', '', '', '', '', '', '', '', ''];
    tttGameRunning = true;
    tttGameActive = true;
    currentPlayer = 'X';
    updateBoard();
    document.getElementById('ttt-status').textContent = 'Your turn (X)';
    document.getElementById('ttt-status').style.color = '#0f0';
  }
  
  const controls = (e) => {
    if (e.key === 'Escape') {
      gameKeyboardActive = false;
      gameActive = false;
      currentGameType = null;
      tttGameActive = false;
      tttInitialized = false;
      document.removeEventListener('keydown', controls);
      initTicTacToe();
      e.preventDefault();
    }
    if (e.key === 'r' || e.key === 'R') { restart(); e.preventDefault(); }
  };
  
  // Clean up previous controls
  if (currentTTTControls) {
    document.removeEventListener('keydown', currentTTTControls);
  }
  
  currentTTTControls = controls;
  document.addEventListener('keydown', controls);
  updateMobileGameButtons();
}

function initMemoryGame() {
  if (memInitialized) return;
  memInitialized = true;
  
  const content = document.getElementById('mem-content');
  content.innerHTML = `
    <div><span class="prompt">root@ammz:~/games/memory$</span> cat README.md</div>
    <div style="margin: 0.8rem 0; font-size: 0.85rem;">
      <span class="keyword">🧠 MEMORY GAME</span><br>
      <span class="comment"># Match all pairs in 30 seconds!</span>
    </div>
    <div><span class="prompt">root@ammz:~/games/memory$</span> <span>python3 memory.py</span><span class="typing-cursor"></span></div><br><br>
    <div style="margin: 0.5rem 0; font-size: 0.8rem;">
      <span class="string">Press ENTER to start | ESC to exit</span>
    </div>
  `;
  
  const keyHandler = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startMemoryGame();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  document.addEventListener('keydown', keyHandler);
}

function startMemoryGame() {
  gameActive = true;
  currentGameType = 'memory';
  gameKeyboardActive = true;
  memoryGameActive = true;
  
  const content = document.getElementById('mem-content');
  
  const emojis = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎬', '🎸'];
  const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  
  let flipped = [], matched = [], moves = 0, canClick = true, timeLeft = 30;
  
  content.innerHTML = `
    <div><span class="prompt">root@ammz:~/games/memory$</span> python3 memory.py</div>
    <div style="margin: 0.5rem 0; font-size: 0.8rem;">
      Time: <span id="mem-timer" style="color: #0f0;">30s</span> | Moves: <span id="mem-moves">0</span> | Matched: <span id="mem-matched">0/8</span> | <span style="color: #0f08;">R=restart ESC=exit</span>
    </div>
    <div style="display: flex; justify-content: center; margin: 1rem 0;">
      <div id="mem-board" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; max-width: 300px; width: 100%;"></div>
    </div>
    <div style="margin-top: 0.5rem;"><span class="prompt">root@ammz:~/games/memory$</span> <span class="typing-cursor"></span></div>
  `;
  
  const boardEl = document.getElementById('mem-board');
  cards.forEach((emoji) => {
    const card = document.createElement('div');
    card.dataset.emoji = emoji;
    card.style.cssText = `aspect-ratio: 1; background: rgba(0, 255, 0, 0.1); border: 2px solid #0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: pointer; transition: all 0.3s;`;
    card.textContent = '?';
    
    card.addEventListener('click', () => {
      if (!canClick || flipped.includes(card) || matched.includes(card.dataset.emoji)) return;
      
      card.textContent = card.dataset.emoji;
      card.style.background = 'rgba(0, 255, 0, 0.3)';
      flipped.push(card);
      
      if (flipped.length === 2) {
        canClick = false;
        moves++;
        document.getElementById('mem-moves').textContent = moves;
        
        const [card1, card2] = flipped;
        
        if (card1.dataset.emoji === card2.dataset.emoji) {
          matched.push(card1.dataset.emoji);
          document.getElementById('mem-matched').textContent = `${matched.length}/8`;
          flipped = [];
          canClick = true;
          
          if (matched.length === 8) {
            if (currentMemoryTimer) {
              clearInterval(currentMemoryTimer);
              currentMemoryTimer = null;
            }
            memoryGameActive = false;
            setTimeout(() => {
              document.getElementById('mem-timer').parentElement.innerHTML = 
                `<span style="color: #0f0;">🎉 Won in ${moves} moves with ${timeLeft}s left!</span> | <span style="color: #0f08;">ESC=exit</span>`;
            }, 300);
          }
        } else {
          setTimeout(() => {
            card1.textContent = '?';
            card2.textContent = '?';
            card1.style.background = 'rgba(0, 255, 0, 0.1)';
            card2.style.background = 'rgba(0, 255, 0, 0.1)';
            flipped = [];
            canClick = true;
          }, 800);
        }
      }
    });
    
    boardEl.appendChild(card);
  });
  
  // Clear previous timer
  if (currentMemoryTimer) {
    clearInterval(currentMemoryTimer);
  }
  
  currentMemoryTimer = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('mem-timer');
    timerEl.textContent = timeLeft + 's';
    
    if (timeLeft <= 10) timerEl.style.color = '#ff0';
    if (timeLeft <= 5) timerEl.style.color = '#f00';
    
    if (timeLeft <= 0) {
      clearInterval(currentMemoryTimer);
      currentMemoryTimer = null;
      canClick = false;
      memoryGameActive = false;
      document.getElementById('mem-timer').parentElement.innerHTML = 
        `<span style="color: #f00;">⏰ Time's Up!</span> | <span style="color: #0f08;">R=retry ESC=exit</span>`;
    }
  }, 1000);
  
  function restart() {
    // Clear current timer
    if (currentMemoryTimer) {
      clearInterval(currentMemoryTimer);
      currentMemoryTimer = null;
    }
    
    gameActive = true;
    currentGameType = 'memory';
    gameKeyboardActive = true;
    memoryGameActive = true;
    
    // Reset game variables
    flipped = [];
    matched = [];
    moves = 0;
    canClick = true;
    timeLeft = 30;
    
    // Update UI
    document.getElementById('mem-moves').textContent = '0';
    document.getElementById('mem-matched').textContent = '0/8';
    document.getElementById('mem-timer').textContent = '30s';
    document.getElementById('mem-timer').style.color = '#0f0';
    
    // Clear the board and recreate cards
    boardEl.innerHTML = '';
    cards.sort(() => Math.random() - 0.5);
    
    cards.forEach((emoji) => {
      const card = document.createElement('div');
      card.dataset.emoji = emoji;
      card.style.cssText = `aspect-ratio: 1; background: rgba(0, 255, 0, 0.1); border: 2px solid #0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: pointer; transition: all 0.3s;`;
      card.textContent = '?';
      
      card.addEventListener('click', () => {
        if (!canClick || flipped.includes(card) || matched.includes(card.dataset.emoji)) return;
        
        card.textContent = card.dataset.emoji;
        card.style.background = 'rgba(0, 255, 0, 0.3)';
        flipped.push(card);
        
        if (flipped.length === 2) {
          canClick = false;
          moves++;
          document.getElementById('mem-moves').textContent = moves;
          
          const [card1, card2] = flipped;
          
          if (card1.dataset.emoji === card2.dataset.emoji) {
            matched.push(card1.dataset.emoji);
            document.getElementById('mem-matched').textContent = `${matched.length}/8`;
            flipped = [];
            canClick = true;
            
            if (matched.length === 8) {
              if (currentMemoryTimer) {
                clearInterval(currentMemoryTimer);
                currentMemoryTimer = null;
              }
              memoryGameActive = false;
              setTimeout(() => {
                document.getElementById('mem-timer').parentElement.innerHTML = 
                  `<span style="color: #0f0;">🎉 Won in ${moves} moves with ${timeLeft}s left!</span> | <span style="color: #0f08;">ESC=exit</span>`;
              }, 300);
            }
          } else {
            setTimeout(() => {
              card1.textContent = '?';
              card2.textContent = '?';
              card1.style.background = 'rgba(0, 255, 0, 0.1)';
              card2.style.background = 'rgba(0, 255, 0, 0.1)';
              flipped = [];
              canClick = true;
            }, 800);
          }
        }
      });
      
      boardEl.appendChild(card);
    });
    
    // Start new timer
    currentMemoryTimer = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('mem-timer');
      timerEl.textContent = timeLeft + 's';
      
      if (timeLeft <= 10) timerEl.style.color = '#ff0';
      if (timeLeft <= 5) timerEl.style.color = '#f00';
      
      if (timeLeft <= 0) {
        clearInterval(currentMemoryTimer);
        currentMemoryTimer = null;
        canClick = false;
        memoryGameActive = false;
        document.getElementById('mem-timer').parentElement.innerHTML = 
          `<span style="color: #f00;">⏰ Time's Up!</span> | <span style="color: #0f08;">R=retry ESC=exit</span>`;
      }
    }, 1000);
  }
  
  const controls = (e) => {
    if (e.key === 'Escape') {
      if (currentMemoryTimer) {
        clearInterval(currentMemoryTimer);
        currentMemoryTimer = null;
      }
      gameKeyboardActive = false;
      gameActive = false;
      currentGameType = null;
      memoryGameActive = false;
      memInitialized = false;
      document.removeEventListener('keydown', controls);
      initMemoryGame();
      e.preventDefault();
    }
    if (e.key === 'r' || e.key === 'R') { 
      restart(); 
      e.preventDefault(); 
    }
  };
  
  // Clean up previous controls
  if (currentMemoryControls) {
    document.removeEventListener('keydown', currentMemoryControls);
  }
  
  currentMemoryControls = controls;
  document.addEventListener('keydown', controls);
  updateMobileGameButtons();
}

// ============================================
// CERTIFICATE SYSTEM
// ============================================

const certImageMap = {
  'freecodecamp': '/static/portfolio/certificates/freecodecamp.jpg',
  'python': '/static/portfolio/certificates/python.jpg',
  'html': '/static/portfolio/certificates/html.jpg',
  'network': '/static/portfolio/certificates/networking.jpg',
  'repair': '/static/portfolio/certificates/repair.jpg'
};

let currentCertImage = null;
let hoverTimeout = null;
let currentCertPopup = null;

function setupCertificates() {
  if (currentX !== 1 || currentY !== 0) return;
  
  if (currentCertImage) {
    currentCertImage.remove();
    currentCertImage = null;
  }
  if (currentCertPopup) {
    currentCertPopup.remove();
    currentCertPopup = null;
  }
  
  const certCards = document.querySelectorAll('.cert-card');
  
  certCards.forEach(card => {
    card.replaceWith(card.cloneNode(true));
  });
  
  document.querySelectorAll('.cert-card').forEach(card => {
    card.style.cursor = 'pointer';
    
    if (window.innerWidth > 768) {
      card.addEventListener('mouseenter', function() {
        clearTimeout(hoverTimeout);
        
        const certName = this.getAttribute('data-cert');
        if (!certImageMap[certName]) return;
        
        if (!currentCertImage) {
          currentCertImage = document.createElement('img');
          currentCertImage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            max-height: 60vh;
            border: 2px solid #0f0;
            border-radius: 8px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.6);
            z-index: 5000;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
          `;
          document.body.appendChild(currentCertImage);
        }
        
        currentCertImage.src = certImageMap[certName];
        currentCertImage.style.opacity = '1';
      });
      
      card.addEventListener('mouseleave', function() {
        if (currentCertImage) {
          currentCertImage.style.opacity = '0';
          hoverTimeout = setTimeout(() => {
            if (currentCertImage && currentCertImage.style.opacity === '0') {
              currentCertImage.remove();
              currentCertImage = null;
            }
          }, 200);
        }
      });
    }
    
    card.addEventListener('click', function(e) {
      e.preventDefault();
      const certName = this.getAttribute('data-cert');
      if (!certImageMap[certName]) return;
      
      showCertPopup(certName, this);
    });
  });
}

function showCertPopup(certName, cardElement) {
  if (currentCertPopup) {
    currentCertPopup.remove();
    currentCertPopup = null;
  }
  
  const isMobile = window.innerWidth <= 768;
  
  const safeWidth = isMobile ? '90%' : '450px';
  const safeMaxHeight = isMobile ? '50vh' : '60vh';
  
  currentCertPopup = document.createElement('div');
  currentCertPopup.style.cssText = `
    position: fixed;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${safeWidth};
    max-width: 95vw;
    max-height: ${safeMaxHeight};
    background: rgba(0, 15, 0, 0.98);
    border: 2px solid #0f0;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 0 40px rgba(0, 255, 0, 0.7);
    overflow: hidden;
    font-family: 'JetBrains Mono', monospace;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid #0f0;
    background: rgba(0, 25, 0, 0.9);
  `;
  
  const title = document.createElement('div');
  title.textContent = 'CERTIFICATE VIEWER';
  title.style.cssText = `
    color: #0f0;
    font-size: 0.8rem;
    font-weight: bold;
  `;
  
  const closeBtn = document.createElement('div');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: rgba(255, 0, 0, 0.3);
    border: 1px solid #f00;
    color: #f00;
    width: 24px;
    height: 24px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: bold;
  `;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 1rem;
    max-height: calc(${safeMaxHeight} - 50px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  `;
  
  const img = new Image();
  img.src = certImageMap[certName];
  img.style.cssText = `
    max-width: 100%;
    max-height: ${isMobile ? '35vh' : '45vh'};
    border-radius: 4px;
    border: 1px solid #0f0;
  `;
  
  const fileName = document.createElement('div');
  fileName.textContent = `${certName}.jpg`;
  fileName.style.cssText = `
    color: #0f0;
    font-size: 0.7rem;
    opacity: 0.8;
  `;
  
  content.appendChild(img);
  content.appendChild(fileName);
  
  currentCertPopup.appendChild(header);
  currentCertPopup.appendChild(content);
  document.body.appendChild(currentCertPopup);
  
  function closePopup() {
    if (currentCertPopup) {
      currentCertPopup.remove();
      currentCertPopup = null;
    }
  }
  
  closeBtn.addEventListener('click', closePopup);
  
  currentCertPopup.addEventListener('click', (e) => {
    if (e.target === currentCertPopup) closePopup();
  });
  
  function handleKeydown(e) {
    if (e.key === 'Escape' && currentCertPopup) {
      closePopup();
    }
  }
  document.addEventListener('keydown', handleKeydown);
  
  if (isMobile) {
    let startY = 0;
    currentCertPopup.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });
    
    currentCertPopup.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      if (endY - startY > 50) {
        closePopup();
      }
    });
  }
}

function checkAndSetupCertificates() {
  if (currentX === 1 && currentY === 0) {
    setTimeout(setupCertificates, 100);
  } else {
    if (currentCertImage) {
      currentCertImage.remove();
      currentCertImage = null;
    }
    if (currentCertPopup) {
      currentCertPopup.remove();
      currentCertPopup = null;
    }
  }
}

const originalUpdateMinimap = updateMinimap;
updateMinimap = function(x, y) {
  originalUpdateMinimap(x, y);
  checkAndSetupCertificates();
};

// ============================================
// WINDOW RESIZE HANDLING
// ============================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  loadingCamera.aspect = window.innerWidth / window.innerHeight;
  loadingCamera.updateProjectionMatrix();
  loadingRenderer.setSize(window.innerWidth, window.innerHeight);
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
});

// ============================================
// MEMORY CLEANUP ON PAGE UNLOAD
// ============================================

window.addEventListener('beforeunload', () => {
  // Clear all intervals and timeouts
  if (matrixInterval) clearInterval(matrixInterval);
  if (currentGameLoop) clearTimeout(currentGameLoop);
  if (currentMemoryTimer) clearInterval(currentMemoryTimer);
  
  // Cancel animation frames
  if (loadingAnimationId) cancelAnimationFrame(loadingAnimationId);
  if (mainAnimationId) cancelAnimationFrame(mainAnimationId);
  
  // Remove event listeners
  if (currentGameControls) {
    document.removeEventListener('keydown', currentGameControls);
  }
  if (currentTTTControls) {
    document.removeEventListener('keydown', currentTTTControls);
  }
  if (currentMemoryControls) {
    document.removeEventListener('keydown', currentMemoryControls);
  }
  
  // Clean up Three.js resources
  threeSceneObjects.forEach(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  
  // Clear WebGL contexts
  if (matrixCtx) {
    matrixCanvas.width = 1;
    matrixCanvas.height = 1;
  }
});

// ============================================
// INITIALIZATION
// ============================================

updatePosition();
updateMinimap(0, 0);
setupMobileGameButtons();
setTimeout(checkAndSetupCertificates, 1000);