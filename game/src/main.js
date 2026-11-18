// Emberwatch — bootstrapping, input, the state machine and the main loop.
import { W, H, LAMP, TURN_RATE, newGame, update, norm, angleDiff } from './world.js';
import { drawFrame } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// Read aloud, never shown: one line describing what just happened on screen.
function announce(msg) {
  status.textContent = msg;
}
let lastToast = null;

const ui = {
  mode: 'title', // title | playing | gameover | victory
  mouseAngle: -Math.PI / 2,
  mouseActive: false,
  keys: new Set(),
  prevT: 0,
};

let world = newGame(20261118); // a calm sea behind the title screen

function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}
addEventListener('resize', resize);
resize();

function startGame() {
  world = newGame();
  ui.mode = 'playing';
  ui.mouseActive = false;
  lastToast = null;
  announce('The lamp is lit. Night 1. Guide the ships home.');
}

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  ui.mouseAngle = Math.atan2(y - LAMP.y, x - LAMP.x);
  ui.mouseActive = true;
});

canvas.addEventListener('mousedown', () => {
  if (ui.mode !== 'playing') startGame();
});

addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    ui.keys.add('left');
    ui.mouseActive = false;
    e.preventDefault();
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    ui.keys.add('right');
    ui.mouseActive = false;
    e.preventDefault();
  } else if (e.code === 'Enter' || e.code === 'Space') {
    if (ui.mode !== 'playing') {
      startGame();
      e.preventDefault();
    }
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (ui.mode === 'playing') {
      ui.mode = 'paused';
      announce('Paused. Press P or Escape to resume.');
    } else if (ui.mode === 'paused') {
      ui.mode = 'playing';
      announce('Resumed.');
    }
  }
});
addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') ui.keys.delete('left');
  if (e.code === 'ArrowRight' || e.code === 'KeyD') ui.keys.delete('right');
});

function frame(t) {
  const dt = Math.min(0.05, Math.max(0, (t - ui.prevT) / 1000));
  ui.prevT = t;

  if (ui.mode === 'title') {
    world.time += dt;
    world.beamAngle = norm(-Math.PI / 2 + Math.sin(world.time * 0.25) * 1.15);
  } else if (ui.mode === 'playing') {
    let turn = 0;
    if (ui.keys.has('left')) turn -= 1;
    if (ui.keys.has('right')) turn += 1;
    if (turn !== 0) {
      world.beamAngle = norm(world.beamAngle + turn * TURN_RATE * dt);
    } else if (ui.mouseActive) {
      const d = angleDiff(ui.mouseAngle, world.beamAngle);
      const step = Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * 1.7 * dt);
      world.beamAngle = norm(world.beamAngle + step);
    }
    update(world, dt);
    if (world.over) {
      ui.mode = world.over; // 'gameover' | 'victory'
      announce(world.over === 'victory'
        ? `Dawn breaks. You kept the light through all eight nights. Final score ${world.score}.`
        : `The light has failed. You weathered ${world.night - 1} nights, score ${world.score}. Press Enter to try again.`);
    }
  }

  if (ui.mode === 'playing' && world.toast && world.toast !== lastToast) {
    lastToast = world.toast;
    announce(world.toast.text);
  }

  drawFrame(ctx, world, ui);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

announce('Emberwatch. Press Enter or click to light the lamp.');
