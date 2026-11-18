// Emberwatch — every pixel: sea, sky, rocks, ships, the coast, the beam, HUD and screens.
import {
  W, H, LAMP, HARBOR, DOCK_R, BEAM_HALF, BEAM_RANGE, DAWN_SECONDS, LAST_NIGHT, MAX_LANTERNS,
} from './world.js';

const TAU = Math.PI * 2;
const SANS = '"Segoe UI", system-ui, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// The dark is painted on an offscreen canvas and the light is punched out of it,
// so the beam reads as light in the dark rather than paint on the sea.
const dark = document.createElement('canvas');
dark.width = W;
dark.height = H;
const dctx = dark.getContext('2d');

function conePath(c, angle, half) {
  c.beginPath();
  c.moveTo(LAMP.x, LAMP.y);
  c.lineTo(LAMP.x + Math.cos(angle - half) * BEAM_RANGE, LAMP.y + Math.sin(angle - half) * BEAM_RANGE);
  c.lineTo(LAMP.x + Math.cos(angle + half) * BEAM_RANGE, LAMP.y + Math.sin(angle + half) * BEAM_RANGE);
  c.closePath();
}

function veil(ctx, a) {
  ctx.fillStyle = `rgba(4, 6, 15, ${a})`;
  ctx.fillRect(0, 0, W, H);
}

function drawSea(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0f24');
  g.addColorStop(0.55, '#101a38');
  g.addColorStop(1, '#152242');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(150, 180, 235, 0.055)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = 54 + i * 60;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 26) {
      const yy = y + Math.sin(x * 0.021 + world.time * (0.7 + i * 0.07) + i * 1.9) * 3.5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawSky(ctx, world) {
  for (const s of world.stars) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(world.time * 1.7 + s.tw);
    ctx.fillStyle = '#cfd8f2';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(768, 92, 6, 768, 92, 64);
  g.addColorStop(0, 'rgba(226, 232, 250, 0.45)');
  g.addColorStop(1, 'rgba(226, 232, 250, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(704, 28, 128, 128);
  ctx.fillStyle = 'rgba(232, 238, 250, 0.9)';
  ctx.beginPath();
  ctx.arc(768, 92, 17, 0, TAU);
  ctx.fill();
}

function drawRocks(ctx, world) {
  for (const r of world.rocks) {
    ctx.strokeStyle = 'rgba(190, 210, 240, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + 5 + Math.sin(world.time * 2 + r.x) * 1.5, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#1a2138';
    ctx.beginPath();
    ctx.moveTo(r.x + r.pts[0][0], r.y + r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.x + r.pts[i][0], r.y + r.pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 220, 245, 0.12)';
    ctx.beginPath();
    ctx.arc(r.x - r.r * 0.2, r.y - r.r * 0.25, r.r * 0.45, 0, TAU);
    ctx.fill();
  }
}

function drawShips(ctx, world) {
  for (const s of world.ships) {
    ctx.save();
    ctx.translate(s.x, s.y + Math.sin(s.bob) * 1.8);
    if (s.lit) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
      g.addColorStop(0, 'rgba(255, 214, 140, 0.4)');
      g.addColorStop(1, 'rgba(255, 214, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-34, -34, 68, 68);
    }
    ctx.rotate(s.heading);
    ctx.fillStyle = '#3d2f26';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.quadraticCurveTo(8, 8, -6, 7);
    ctx.lineTo(-15, 5);
    ctx.quadraticCurveTo(-17, 0, -15, -5);
    ctx.lineTo(-6, -7);
    ctx.quadraticCurveTo(8, -8, 18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#57453a';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.quadraticCurveTo(5, 5, -4, 4.5);
    ctx.lineTo(-12, 3);
    ctx.lineTo(-12, -3);
    ctx.lineTo(-4, -4.5);
    ctx.quadraticCurveTo(5, -5, 12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b2019';
    ctx.fillRect(-9, -3, 7, 6);
    ctx.fillStyle = '#ffd982';
    ctx.beginPath();
    ctx.arc(2, 0, 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawLand(ctx) {
  const edge = (x) => 586 + Math.sin(x * 0.02 + 2) * 7;
  ctx.fillStyle = '#151b2e';
  const piece = (x0, x1) => {
    ctx.beginPath();
    ctx.moveTo(x0, H + 4);
    ctx.lineTo(x0, edge(x0));
    for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, edge(x));
    ctx.lineTo(x1, edge(x1));
    ctx.lineTo(x1, H + 4);
    ctx.closePath();
    ctx.fill();
  };
  piece(-4, 600);
  piece(760, W + 4);
  ctx.strokeStyle = 'rgba(200, 210, 240, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -4; x <= 600; x += 24) {
    const y = edge(x) - 1;
    if (x === -4) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let x = 760; x <= W + 4; x += 24) ctx.lineTo(x, edge(x) - 1);
  ctx.stroke();
}

function drawLighthouse(ctx) {
  const yBase = 600;
  const yTop = 544;
  const hw = (y) => 9 + 7 * ((yBase - y) / (yBase - yTop));
  const band = (y0, y1, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(LAMP.x - hw(y0), y0);
    ctx.lineTo(LAMP.x + hw(y0), y0);
    ctx.lineTo(LAMP.x + hw(y1), y1);
    ctx.lineTo(LAMP.x - hw(y1), y1);
    ctx.closePath();
    ctx.fill();
  };
  band(yTop, yBase, '#ded7c8');
  band(576, 588, '#a83d2c');
  band(554, 560, '#a83d2c');
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(LAMP.x - 11, yTop - 5, 22, 6);
  ctx.fillStyle = '#12182c';
  ctx.fillRect(LAMP.x - 7, yTop - 13, 14, 9);
  ctx.fillStyle = '#a83d2c';
  ctx.beginPath();
  ctx.moveTo(LAMP.x - 10, yTop - 13);
  ctx.lineTo(LAMP.x, yTop - 23);
  ctx.lineTo(LAMP.x + 10, yTop - 13);
  ctx.closePath();
  ctx.fill();
}

function drawDarkness(ctx, world) {
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = 'rgba(4, 7, 18, 0.66)';
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const g = dctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0, 0, 0, ${a})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dctx.fillStyle = g;
    dctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  hole(LAMP.x, LAMP.y, 120, 0.9);   // the tower keeps its own light
  hole(768, 92, 64, 0.7);           // the moon rides above the dark
  hole(HARBOR.x, 596, 60, 0.55);    // warm lamps at the harbour mouth
  for (const [hw, a] of [[BEAM_HALF, 0.55], [BEAM_HALF * 0.7, 0.55], [BEAM_HALF * 0.45, 0.9]]) {
    dctx.globalAlpha = a;
    dctx.fillStyle = '#000';
    conePath(dctx, world.beamAngle, hw);
    dctx.fill();
  }
  dctx.globalAlpha = 1;
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(dark, 0, 0);
}

function drawBeam(ctx, world) {
  const flicker = 0.82 + 0.13 * Math.sin(world.time * 11) + 0.05 * Math.sin(world.time * 23.7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  conePath(ctx, world.beamAngle, BEAM_HALF);
  ctx.clip();
  const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 20, LAMP.x, LAMP.y, BEAM_RANGE);
  g.addColorStop(0, `rgba(255, 214, 140, ${0.5 * flicker})`);
  g.addColorStop(0.5, `rgba(255, 200, 120, ${0.22 * flicker})`);
  g.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawLamp(ctx) {
  const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 2, LAMP.x, LAMP.y, 26);
  g.addColorStop(0, 'rgba(255, 230, 170, 0.95)');
  g.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(LAMP.x - 26, LAMP.y - 26, 52, 52);
  ctx.fillStyle = '#fff3d0';
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y, 3.5, 0, TAU);
  ctx.fill();
}

function drawShipLights(ctx, world) {
  for (const s of world.ships) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
    g.addColorStop(0, 'rgba(255, 205, 120, 0.75)');
    g.addColorStop(1, 'rgba(255, 205, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x - 16, s.y - 16, 32, 32);
  }
}

function drawHarborLights(ctx) {
  for (const x of [600, 760]) {
    const g = ctx.createRadialGradient(x, 594, 0, x, 594, 22);
    g.addColorStop(0, 'rgba(255, 190, 110, 0.8)');
    g.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 22, 572, 44, 44);
    ctx.fillStyle = '#ffdca0';
    ctx.beginPath();
    ctx.arc(x, 594, 2.5, 0, TAU);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(HARBOR.x, 606, 0, HARBOR.x, 606, 46);
  g.addColorStop(0, 'rgba(255, 190, 110, 0.3)');
  g.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(HARBOR.x - 46, 560, 92, 40);
  ctx.strokeStyle = 'rgba(255, 214, 140, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(HARBOR.x, HARBOR.y, DOCK_R, Math.PI, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLantern(ctx, x, y, lit) {
  ctx.fillStyle = lit ? 'rgba(255, 200, 120, 0.25)' : 'rgba(120, 130, 160, 0.12)';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = lit ? '#3a2f1c' : '#232a3e';
  ctx.fillRect(x - 4, y - 7, 8, 14);
  ctx.fillStyle = lit ? '#ffd166' : '#4a5470';
  ctx.fillRect(x - 2.5, y - 4, 5, 8);
}

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
  ctx.fillRect(0, 0, W, 42);
  ctx.strokeStyle = 'rgba(255, 205, 130, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 42.5);
  ctx.lineTo(W, 42.5);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.font = `600 17px ${SANS}`;
  ctx.fillStyle = '#e8ddc8';
  ctx.textAlign = 'left';
  ctx.fillText(`NIGHT ${world.night} / ${LAST_NIGHT}`, 18, 22);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd982';
  ctx.fillText(`SCORE ${world.score}`, W / 2, 22);

  for (let i = 0; i < MAX_LANTERNS; i++) drawLantern(ctx, W - 22 - i * 26, 21, i < world.wrecksLeft);
}

function drawToast(ctx, world) {
  if (!world.toast || world.toast.t <= 0) return;
  const a = Math.max(0, Math.min(1, (world.toast.max - world.toast.t) * 3, world.toast.t / 0.4));
  ctx.globalAlpha = a;
  ctx.font = `600 18px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe6b0';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText(world.toast.text, W / 2, 88);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, world) {
  veil(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pulse = 0.55 + 0.45 * Math.sin(world.time * 2.6);

  ctx.font = `700 64px ${SERIF}`;
  ctx.fillStyle = '#ffd982';
  ctx.shadowColor = 'rgba(255, 180, 90, 0.45)';
  ctx.shadowBlur = 24;
  ctx.fillText('EMBERWATCH', W / 2, 168);
  ctx.shadowBlur = 0;

  ctx.font = `italic 20px ${SERIF}`;
  ctx.fillStyle = '#cfd8f2';
  ctx.fillText('the last lighthouse on the Grey Haven coast', W / 2, 218);

  ctx.font = `15px ${SANS}`;
  ctx.fillStyle = '#9fb0d8';
  const lines = [
    'Ships are lost in the dark, drifting with the wind toward the rocks.',
    'Catch them in your beam and they will follow the light home.',
    '',
    'Mouse — the beam follows your hand      ← / → or A / D — swing the light',
    'Survive 8 nights. Five lanterns may fail — each dawn mends one.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 296 + i * 26));

  ctx.font = `600 20px ${SANS}`;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe6b0';
  ctx.fillText('Press Enter or click to light the lamp', W / 2, 462);
  ctx.globalAlpha = 1;
}

function drawEnd(ctx, world, win) {
  veil(ctx, 0.62);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pulse = 0.55 + 0.45 * Math.sin(world.time * 2.6);

  ctx.font = `700 52px ${SERIF}`;
  ctx.fillStyle = win ? '#ffe1a0' : '#e8734a';
  ctx.shadowColor = win ? 'rgba(255, 200, 120, 0.4)' : 'rgba(232, 115, 74, 0.4)';
  ctx.shadowBlur = 22;
  ctx.fillText(win ? 'DAWN BREAKS' : 'THE LIGHT HAS FAILED', W / 2, 190);
  ctx.shadowBlur = 0;

  ctx.font = `17px ${SANS}`;
  ctx.fillStyle = '#cfd8f2';
  const rows = [
    win ? 'You kept the light through every night.' : `You weathered ${world.night - 1} of ${LAST_NIGHT} nights.`,
    `Ships brought home: ${world.saved}      Ships lost: ${world.lost}`,
    `Final score: ${world.score}`,
  ];
  rows.forEach((row, i) => ctx.fillText(row, W / 2, 260 + i * 30));

  ctx.font = `600 19px ${SANS}`;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe6b0';
  ctx.fillText('Press Enter or click to keep the light again', W / 2, 420);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  veil(ctx, 0.5);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 40px ${SERIF}`;
  ctx.fillStyle = '#e8ddc8';
  ctx.fillText('PAUSED', W / 2, 270);
  ctx.font = `600 16px ${SANS}`;
  ctx.fillStyle = '#9fb0d8';
  ctx.fillText('Press P or Esc to resume the watch', W / 2, 320);
}

export function drawFrame(ctx, world, ui) {
  drawSea(ctx, world);
  drawSky(ctx, world);
  drawRocks(ctx, world);
  drawShips(ctx, world);
  drawLand(ctx);
  drawLighthouse(ctx);
  drawDarkness(ctx, world);
  drawBeam(ctx, world);
  drawLamp(ctx);
  drawShipLights(ctx, world);
  drawHarborLights(ctx);
  drawParticles(ctx, world);

  if (world.phase === 'dawn' && ui.mode === 'playing') {
    const k = 1 - world.dawnTimer / DAWN_SECONDS;
    ctx.fillStyle = `rgba(255, 178, 120, ${0.16 * k})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (ui.mode === 'playing' || ui.mode === 'paused') {
    drawHud(ctx, world);
    drawToast(ctx, world);
  }
  if (ui.mode === 'title') drawTitle(ctx, world);
  else if (ui.mode === 'paused') drawPaused(ctx);
  else if (ui.mode === 'gameover') drawEnd(ctx, world, false);
  else if (ui.mode === 'victory') drawEnd(ctx, world, true);
}
