import './style.css'

/**
 * Minimal, responsive Flappy Bird clone on Canvas.
 * - Uses color theme: primary #70c5ce, secondary #ded895, accent #ffdf70.
 * - Handles start/game over overlays, score, restart, and instructions.
 * - Responsive canvas design.
 * - Only vanilla JS and CSS, no dependencies.
 */

// PUBLIC_INTERFACE
function flappyBirdInit() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="fb-wrapper">
      <canvas id="flappy-canvas" tabindex="0" aria-label="Flappy Bird Game"></canvas>
      <div id="score-overlay" class="fb-score">0</div>
      <div id="start-overlay" class="fb-modal fb-modal-visible">
        <div class="fb-modal-content">
          <h1>Flappy Bird</h1>
          <p>Tap <b>Space</b>, <b>Click</b>, or <b>Touch</b> to flap</p>
          <button id="start-btn" class="fb-btn">Start Game</button>
          <p class="fb-instructions">Score by passing through pipes.<br>Good luck!</p>
        </div>
      </div>
      <div id="gameover-overlay" class="fb-modal">
        <div class="fb-modal-content">
          <h1>Game Over</h1>
          <div id="final-score"></div>
          <button id="restart-btn" class="fb-btn">Restart</button>
        </div>
      </div>
    </div>
  `;

  // --- Canvas setup and game variables ---
  const canvas = document.getElementById('flappy-canvas');
  const ctx = canvas.getContext('2d');

  // --- Responsive design ---
  function resizeCanvas() {
    // Maintain a 9:16 (portrait) aspect ratio, scale with viewport
    const w = Math.min(window.innerWidth, 420);
    const h = Math.min(window.innerHeight, Math.round(w * 16/9), 750);
    canvas.width = w;
    canvas.height = h;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // --- Game Constants ---
  const theme = {
    primary: "#70c5ce",      // sky
    secondary: "#ded895",    // ground
    accent: "#ffdf70",       // pipe and bird
    bird: "#FF0000"          // fully red bird for customization
  };
  const PIPE_COLOR = theme.accent;
  const GROUND_COLOR = theme.secondary;
  const BG_COLOR = theme.primary;
  const BIRD_COLOR = theme.bird;
  // Reduced gravity and gentler flap for slower ascent/descent
  const GRAVITY = 0.40;  // was 0.58
  const FLAP = -5.0;     // was -7
  const BIRD_RADIUS = 17;
  const PIPE_WIDTH = 54;
  // Increased the vertical gap between pipes for an easier play experience
  const PIPE_GAP = 175;
  const BASE_HEIGHT = 60;

  // --- Game State ---
  let gameState = 'start'; // start, running, gameover
  let animationId = null;

  // --- Entities ---
  let bird, pipes, score;

  // --- UI Elements ---
  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const scoreOverlay = document.getElementById('score-overlay');
  const finalScoreEl = document.getElementById('final-score');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // --- Init/Reset Functions ---
  function resetGame() {
    const w = canvas.width, h = canvas.height;
    bird = {
      x: w * 0.23,
      y: h * 0.5,
      vy: 0,
      r: BIRD_RADIUS * (w/320), // responsive size
      alive: true
    };
    score = 0;
    pipes = [];
    let pipeX = w * 1.1;
    for (let i = 0; i < 3; i++) {
      let top = getRandomPipeY(h, BASE_HEIGHT, PIPE_GAP);
      pipes.push({
        x: pipeX + i * (w / 2), // evenly spread
        topY: top,
        passed: false,
      });
    }
    scoreOverlay.textContent = score;
  }

  function getRandomPipeY(h, base, gap) {
    // Generates a random pipe height for the gap position
    const margin = 44 * (h/480);
    return Math.floor(
      Math.random() * (h - gap - base - margin*2)
    ) + margin;
  }

  // --- Game Loop and Drawing ---
  function drawBackground() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGround() {
    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, canvas.height - BASE_HEIGHT, canvas.width, BASE_HEIGHT);
  }

  function drawBird() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2, false);
    ctx.fillStyle = BIRD_COLOR;
    ctx.shadowColor = "#aaa";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
    // Beak
    ctx.beginPath();
    ctx.moveTo(bird.x + bird.r, bird.y);
    ctx.lineTo(bird.x + bird.r + 10, bird.y - 5);
    ctx.lineTo(bird.x + bird.r + 10, bird.y + 5);
    ctx.closePath();
    ctx.fillStyle = PIPE_COLOR;
    ctx.fill();
    // Eye
    ctx.beginPath();
    ctx.arc(bird.x + bird.r / 2, bird.y - bird.r / 3, bird.r / 4, 0, Math.PI * 2);
    ctx.fillStyle = "#222";
    ctx.fill();
  }

  function drawPipes() {
    pipes.forEach(pipe => {
      ctx.fillStyle = PIPE_COLOR;
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topY);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.topY + PIPE_GAP, PIPE_WIDTH, canvas.height - BASE_HEIGHT - (pipe.topY + PIPE_GAP));
      // Pipe shadow/accent
      ctx.fillStyle = theme.secondary + "66";
      ctx.fillRect(pipe.x + PIPE_WIDTH - 7, 0, 7, canvas.height - BASE_HEIGHT);
    });
  }

  function drawScore() {
    ctx.save();
    ctx.font = `bold ${Math.floor(canvas.height/12)}px system-ui,Arial`;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.textAlign = "center";
    ctx.strokeText(score, canvas.width/2, canvas.height/6.5);
    ctx.fillText(score, canvas.width/2, canvas.height/6.5);
    ctx.restore();
  }

  function gameLoop() {
    // Update
    let w = canvas.width, h = canvas.height;
    bird.vy += GRAVITY * (h/480);
    bird.y += bird.vy;

    // Collisions
    if (bird.y + bird.r > h - BASE_HEIGHT) {
      bird.y = h - BASE_HEIGHT - bird.r;
      gameOver();
      return;
    }
    if (bird.y - bird.r < 0) {
      bird.y = bird.r;
      bird.vy = 0;
    }

    // Pipes
    for (let pipe of pipes) {
      pipe.x -= Math.max(2.5, w*0.008); // Responsive speed
      // Score
      if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
        score++;
        pipe.passed = true;
        scoreOverlay.textContent = score;
      }
      // Collision with pipes
      if (
        bird.x + bird.r > pipe.x && bird.x - bird.r < pipe.x + PIPE_WIDTH &&
        (
         bird.y - bird.r < pipe.topY ||
         bird.y + bird.r > pipe.topY + PIPE_GAP
        )
      ) {
        gameOver();
        return;
      }
    }
    // Remove pipes, add new
    if (pipes[0].x < -PIPE_WIDTH) {
      pipes.shift();
      const lastX = pipes[pipes.length - 1].x;
      pipes.push({
        x: lastX + (w / 2),
        topY: getRandomPipeY(h, BASE_HEIGHT, PIPE_GAP),
        passed: false,
      });
    }

    // Draw
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
    drawScore();

    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Game Control ---
  function flap() {
    if (gameState === 'running') {
      bird.vy = FLAP * (canvas.height/480);
    }
  }

  function startGame() {
    resetGame();
    startOverlay.classList.remove('fb-modal-visible');
    gameoverOverlay.classList.remove('fb-modal-visible');
    scoreOverlay.style.display = 'block';
    gameState = 'running';
    animationId = requestAnimationFrame(gameLoop);
    canvas.focus();
  }

  function gameOver() {
    cancelAnimationFrame(animationId);
    gameState = 'gameover';
    finalScoreEl.innerHTML = `<p>Your score: <b>${score}</b></p>`;
    gameoverOverlay.classList.add('fb-modal-visible');
    scoreOverlay.style.display = 'none';
  }

  function handleRestart() {
    gameoverOverlay.classList.remove('fb-modal-visible');
    startOverlay.classList.add('fb-modal-visible');
  }

  // --- Input Handlers ---
  function handleKey(e) {
    if (gameState === 'running' && (e.code === 'Space' || e.code === 'ArrowUp')) {
      flap();
      e.preventDefault();
    }
    if (gameState === 'start' && (e.code === 'Space' || e.code === 'Enter')) {
      startGame();
      e.preventDefault();
    }
    if (gameState === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
      handleRestart();
      e.preventDefault();
    }
  }
  function handlePointer() {
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'running') {
      flap();
    } else if (gameState === 'gameover') {
      handleRestart();
    }
  }

  // --- Button Events ---
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', handleRestart);

  // --- Keyboard / Pointer Events ---
  window.addEventListener('keydown', handleKey);
  canvas.addEventListener('mousedown', handlePointer);
  canvas.addEventListener('touchstart', handlePointer, {passive: false});

  // --- Show start overlay and focus canvas so keydown works immediately
  function showStartOverlay() {
    scoreOverlay.style.display = 'none';
    startOverlay.classList.add('fb-modal-visible');
    gameoverOverlay.classList.remove('fb-modal-visible');
    canvas.focus();
  }
  showStartOverlay();
  resetGame();
}

flappyBirdInit();
