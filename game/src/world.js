// Emberwatch — the simulation: nights, drifting ships, the beam, rocks, wind and particles.
// Plain logic with a seeded RNG; nothing here touches the DOM.

export const W = 960;
export const H = 600;

export const LAMP = { x: 586, y: 539 };   // where the light lives, on the shore by the harbour
export const HARBOR = { x: 680, y: 618 }; // the mouth ships steer for when they are lit
export const APPROACH = { x: 680, y: 430 }; // lit ships line up here before diving for the mouth
export const DOCK_R = 40;                 // a ship this close to the mouth is brought home
export const BEAM_HALF = 0.34;            // half-width of the light cone, radians
export const BEAM_RANGE = 860;            // how far the light carries
export const TURN_RATE = 2.0;             // beam swing speed, rad/s

export const NIGHT_SECONDS = 28;
export const DAWN_SECONDS = 2.6;
export const LAST_NIGHT = 8;
export const WRECKS_ALLOWED = 5;          // lanterns you may lose before the watch fails
export const MAX_LANTERNS = 6;

const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const norm = (a) => ((a % TAU) + TAU) % TAU;

export function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function makeRocks(rand) {
  const rocks = [];
  let guard = 0;
  while (rocks.length < 9 && guard++ < 900) {
    const x = 150 + rand() * 660; // clear of the left and right spawn shelves
    const y = 130 + rand() * 350; // clear of the coast and the top spawn line
    if (Math.hypot(x - LAMP.x, y - LAMP.y) < 170) continue;
    if (Math.hypot(x - HARBOR.x, y - HARBOR.y) < 150) continue;
    if (Math.abs(x - HARBOR.x) < 115 && y > 280) continue; // keep an approach channel
    if (rocks.some((r) => Math.hypot(r.x - x, r.y - y) < 125)) continue;
    const r = 14 + rand() * 20;
    const pts = [];
    const n = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (0.7 + rand() * 0.5);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8]);
    }
    rocks.push({ x, y, r, pts });
  }
  return rocks;
}

function makeWind(rand, night) {
  const a = rand() * TAU;
  const s = 4 + night;
  // The wind always carries the ships down toward the coast; only the light can pull them off it.
  return { x: Math.cos(a) * s, y: Math.abs(Math.sin(a)) * s * 0.55 + 2 };
}

export function newGame(seed = (Math.random() * 2 ** 31) | 0) {
  const rand = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({ x: rand() * W, y: rand() * 320, r: 0.6 + rand() * 1.3, tw: rand() * TAU });
  }
  const world = {
    seed,
    rand,
    stars,
    rocks: makeRocks(rand),
    night: 1,
    score: 0,
    combo: 0,
    wrecksLeft: WRECKS_ALLOWED,
    beamAngle: -Math.PI / 2,
    ships: [],
    particles: [],
    toSpawn: 0,
    spawnTimer: 1,
    nightTime: 0,
    phase: 'night', // 'night' | 'dawn'
    dawnTimer: 0,
    wind: { x: 0, y: 0 },
    time: 0,
    saved: 0,
    lost: 0,
    toast: null,
    over: null, // 'gameover' | 'victory' once the watch ends
  };
  beginNight(world);
  return world;
}

export function beginNight(world) {
  world.toSpawn = Math.min(7, 2 + world.night);
  world.spawnTimer = 1.1;
  world.nightTime = 0;
  world.ships = [];
  world.wind = makeWind(world.rand, world.night);
  world.toast = { text: `Night ${world.night} — ${world.toSpawn} ships out in the dark`, t: 3, max: 3 };
}

export function isLit(world, x, y) {
  const dx = x - LAMP.x;
  const dy = y - LAMP.y;
  if (Math.hypot(dx, dy) > BEAM_RANGE) return false;
  return Math.abs(angleDiff(Math.atan2(dy, dx), world.beamAngle)) < BEAM_HALF;
}

function spawnShip(world) {
  const rand = world.rand;
  const edge = Math.floor(rand() * 3);
  let x;
  let y;
  if (edge === 0) { x = 70 + rand() * (W - 140); y = -34; }
  else if (edge === 1) { x = -34; y = 50 + rand() * 330; }
  else { x = W + 34; y = 50 + rand() * 330; }
  const heading = Math.atan2(HARBOR.y - y, HARBOR.x - x) + (rand() - 0.5) * 1.2;
  world.ships.push({
    x, y, heading, speed: 14 + rand() * 8,
    phase: rand() * TAU, bob: rand() * TAU, trail: 0, lit: false, sight: 0, dead: false,
  });
}

function burst(world, x, y, color, n, spread) {
  for (let i = 0; i < n; i++) {
    const a = world.rand() * TAU;
    const v = (0.25 + world.rand() * 0.75) * spread;
    const life = 0.5 + world.rand() * 0.7;
    world.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 24,
      life, max: life, size: 1.5 + world.rand() * 2.5, color,
    });
  }
}

function wreck(world, s, atSea) {
  s.dead = true;
  world.lost++;
  world.combo = 0;
  world.wrecksLeft--;
  burst(world, s.x, s.y, '#9fb4d8', 30, 130);
  burst(world, s.x, s.y, '#e8734a', 12, 60);
  world.toast = { text: atSea ? 'A ship drifted out to sea' : 'A ship broke on the rocks', t: 2.4, max: 2.4 };
  if (world.wrecksLeft <= 0) world.over = 'gameover';
}

function stepShip(world, s, dt) {
  s.lit = isLit(world, s.x, s.y);
  // A ship that has seen the light keeps steering for it a moment longer —
  // that memory is what lets one beam serve several ships.
  if (s.lit) s.sight = 2.4;
  else s.sight = Math.max(0, (s.sight ?? 0) - dt);
  const guided = s.lit || s.sight > 0;
  // Line up above the mouth first, then dive for it: a straight charge from far away
  // would cut the corner and drive onto the coast.
  const linedUp =
    (s.y > 470 && Math.abs(s.x - HARBOR.x) < 110) ||
    Math.hypot(s.x - APPROACH.x, s.y - APPROACH.y) < 70;
  const target = linedUp ? HARBOR : APPROACH;
  const toHarbor = Math.atan2(target.y - s.y, target.x - s.x);
  if (guided) {
    // The light reveals the rocks: a guided ship is pulled toward the harbour
    // and pushed away from anything the beam shows it, sliding around hazards.
    let ax = Math.cos(toHarbor);
    let ay = Math.sin(toHarbor);
    for (const r of world.rocks) {
      const dx = s.x - r.x;
      const dy = s.y - r.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < r.r + 55) {
        const wgt = (r.r + 55 - d) / (r.r + 55);
        ax += (dx / d) * wgt * 3;
        ay += (dy / d) * wgt * 3;
      }
    }
    if (s.y > 500 && Math.abs(s.x - HARBOR.x) > 70) ay -= Math.min(2.5, (s.y - 500) / 40);
    const desired = Math.atan2(ay, ax);
    const d = angleDiff(desired, s.heading);
    const grip = s.lit ? 1 : 0.5;
    s.heading += Math.max(-2.4, Math.min(2.4, d * 2.6)) * grip * dt;
    s.speed += (64 - s.speed) * Math.min(1, (s.lit ? 2.5 : 1.2) * dt);
  } else {
    s.heading += Math.sin(world.time * 0.6 + s.phase) * 0.55 * dt;
    s.speed += (8 - s.speed) * Math.min(1, 1.2 * dt);
    s.x += world.wind.x * dt;
    s.y += world.wind.y * dt;
  }
  s.heading = norm(s.heading);
  s.x += Math.cos(s.heading) * s.speed * dt;
  s.y += Math.sin(s.heading) * s.speed * dt;
  s.bob += dt * 2.2;

  // wake
  s.trail -= dt;
  if (s.trail <= 0) {
    s.trail = 0.16 + world.rand() * 0.12;
    const life = 0.9;
    world.particles.push({
      x: s.x - Math.cos(s.heading) * 14,
      y: s.y - Math.sin(s.heading) * 14,
      vx: (world.rand() - 0.5) * 10,
      vy: (world.rand() - 0.5) * 10 - 8,
      life,
      max: life,
      size: 1.4 + world.rand() * 1.6,
      color: 'rgba(190, 210, 240, 0.55)',
    });
  }

  // brought home through the harbour mouth
  if (Math.hypot(s.x - HARBOR.x, s.y - HARBOR.y) < DOCK_R) {
    s.dead = true;
    world.saved++;
    world.combo++;
    const pts = 100 * world.night + (world.combo - 1) * 25;
    world.score += pts;
    burst(world, HARBOR.x, 596, '#ffd982', 24, 70);
    world.toast = {
      text: `Ship brought home  +${pts}${world.combo > 1 ? `  ×${world.combo}` : ''}`,
      t: 2,
      max: 2,
    };
    return;
  }

  // the coast: land everywhere along the bottom except the harbour mouth
  if (s.y > 590 && Math.abs(s.x - HARBOR.x) > 78) {
    wreck(world, s, false);
    return;
  }

  // rocks
  for (const r of world.rocks) {
    if (Math.hypot(r.x - s.x, r.y - s.y) < r.r + 9) {
      wreck(world, s, false);
      return;
    }
  }

  // swept off the map
  if (s.x < -70 || s.x > W + 70 || s.y < -70 || s.y > H + 70) wreck(world, s, true);
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 42 * dt;
    p.vx *= 1 - Math.min(1, 1.6 * dt);
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}

export function update(world, dt) {
  world.time += dt;
  if (world.toast) world.toast.t -= dt;
  updateParticles(world, dt);

  if (world.over) return;

  if (world.phase === 'dawn') {
    world.dawnTimer -= dt;
    if (world.dawnTimer <= 0) {
      world.night++;
      if (world.night > LAST_NIGHT) {
        world.over = 'victory';
        return;
      }
      world.phase = 'night';
      beginNight(world);
    }
    return;
  }

  world.nightTime += dt;
  if (world.toSpawn > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      spawnShip(world);
      world.toSpawn--;
      const span = (NIGHT_SECONDS * 0.7) / Math.max(1, world.toSpawn + 1);
      world.spawnTimer = span * (0.6 + world.rand() * 0.8);
    }
  }

  for (const s of world.ships) stepShip(world, s, dt);
  world.ships = world.ships.filter((s) => !s.dead);

  if (world.toSpawn === 0 && world.ships.length === 0 && world.nightTime > 2) {
    world.phase = 'dawn';
    world.dawnTimer = DAWN_SECONDS;
    const bonus = 50 * world.night;
    world.score += bonus;
    const mended = world.wrecksLeft < MAX_LANTERNS;
    if (mended) world.wrecksLeft++;
    world.toast = {
      text: `Night ${world.night} survived  +${bonus}${mended ? '  ·  a lantern mended' : ''}`,
      t: DAWN_SECONDS + 0.4,
      max: DAWN_SECONDS + 0.4,
    };
  }
}
