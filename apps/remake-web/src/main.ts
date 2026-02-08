import "./style.css";

declare const __APP_VERSION__: string;

const canvasEl = document.querySelector<HTMLCanvasElement>("#game-canvas");
const startBtnEl = document.querySelector<HTMLButtonElement>("#start-btn");
const resetBtnEl = document.querySelector<HTMLButtonElement>("#reset-btn");
const fullscreenBtnEl = document.querySelector<HTMLButtonElement>("#fullscreen-btn");
const hudEl = document.querySelector<HTMLDivElement>("#hud");

if (!canvasEl || !startBtnEl || !resetBtnEl || !fullscreenBtnEl || !hudEl) {
  throw new Error("Missing required DOM elements");
}

const canvas = canvasEl;
const startBtn = startBtnEl;
const resetBtn = resetBtnEl;
const fullscreenBtn = fullscreenBtnEl;
const hud = hudEl;

const ctxMaybe = canvas.getContext("2d");
if (!ctxMaybe) throw new Error("2D canvas context not available");
const ctx = ctxMaybe;

type Mode = "menu" | "playing" | "gameover";

type Weapon = {
  name: string;
  blastRadius: number;
  craterRadius: number;
  maxDamage: number;
  speedMultiplier: number;
  projectileRadius: number;
  projectileColor: string;
};

type Tank = {
  id: 0 | 1;
  x: number;
  y: number;
  vy: number;
  hp: number;
  aimDeg: number;
  power: number;
  weaponIdx: number;
  color: string;
};

type Projectile = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weaponIdx: number;
};

const WIDTH = 1280;
const HEIGHT = 720;
const TERRAIN_STEP = 4;
const GRAVITY = 900;
const TANK_R = 18;
const MOVE_SPEED = 210;
const TURN_FUEL_MAX = 180;
const FUEL_COST_PER_PX = 1.0;
const TURN_TIME_SEC = 20.0;
const WIND_ACCEL_MIN = -240;
const WIND_ACCEL_MAX = 240;

const ANGLE_MIN = 5;
const ANGLE_MAX = 85;
const ANGLE_SPEED_DEG_PER_SEC = 70;
const POWER_MIN = 180;
const POWER_MAX = 900;
const POWER_SPEED_PER_SEC = 360;

const EXPLOSION_COOLDOWN_SEC = 0.65;

const weapons: Weapon[] = [
  {
    name: "Cannon",
    blastRadius: 72,
    craterRadius: 56,
    maxDamage: 70,
    speedMultiplier: 1.0,
    projectileRadius: 4,
    projectileColor: "rgba(255, 230, 120, 0.95)",
  },
  {
    name: "Heavy",
    blastRadius: 92,
    craterRadius: 72,
    maxDamage: 90,
    speedMultiplier: 0.85,
    projectileRadius: 5,
    projectileColor: "rgba(255, 190, 110, 0.95)",
  },
  {
    name: "Sniper",
    blastRadius: 56,
    craterRadius: 36,
    maxDamage: 60,
    speedMultiplier: 1.25,
    projectileRadius: 3,
    projectileColor: "rgba(160, 220, 255, 0.95)",
  },
];

const state: {
  mode: Mode;
  message: string;
  windAccel: number;
  fuelLeft: number;
  timeLeft: number;
  cooldown: number;
  terrainY: number[];
  tanks: Tank[];
  currentTank: 0 | 1;
  projectile: Projectile;
} = {
  mode: "menu",
  message: "",
  windAccel: 0,
  fuelLeft: TURN_FUEL_MAX,
  timeLeft: TURN_TIME_SEC,
  cooldown: 0,
  terrainY: [],
  tanks: [],
  currentTank: 0,
  projectile: { active: false, x: 0, y: 0, vx: 0, vy: 0, weaponIdx: 0 },
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function randRange(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}

function terrainIndexCount() {
  return Math.floor(WIDTH / TERRAIN_STEP) + 1;
}

function surfaceYAt(x: number) {
  const cx = clamp(x, 0, WIDTH);
  const fx = cx / TERRAIN_STEP;
  const i0 = Math.max(0, Math.min(state.terrainY.length - 1, Math.floor(fx)));
  const i1 = Math.max(0, Math.min(state.terrainY.length - 1, i0 + 1));
  const t = fx - i0;
  return lerp(state.terrainY[i0] ?? HEIGHT, state.terrainY[i1] ?? HEIGHT, t);
}

function regenTerrain() {
  const baseY = 470;
  const amp = 140;
  const minY = 220;
  const maxY = HEIGHT - 60;

  const count = terrainIndexCount();
  state.terrainY = new Array(count);

  // Cheap coherent-ish noise: sum of a few sines w/ random phases.
  const p1 = randRange(0, Math.PI * 2);
  const p2 = randRange(0, Math.PI * 2);
  const p3 = randRange(0, Math.PI * 2);
  for (let i = 0; i < count; i++) {
    const x = i * TERRAIN_STEP;
    const n =
      Math.sin(x * 0.006 + p1) * 0.55 +
      Math.sin(x * 0.013 + p2) * 0.3 +
      Math.sin(x * 0.024 + p3) * 0.15;
    const y = clamp(baseY + n * amp, minY, maxY);
    state.terrainY[i] = y;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < count - 1; i++) {
      state.terrainY[i] = (state.terrainY[i - 1] + state.terrainY[i] + state.terrainY[i + 1]) / 3;
    }
  }
}

function initTanks() {
  const p1x = 240;
  const p2x = 1040;
  const p1y = surfaceYAt(p1x) - TANK_R;
  const p2y = surfaceYAt(p2x) - TANK_R;
  state.tanks = [
    { id: 0, x: p1x, y: p1y, vy: 0, hp: 100, aimDeg: 45, power: 520, weaponIdx: 0, color: "#44e38f" },
    { id: 1, x: p2x, y: p2y, vy: 0, hp: 100, aimDeg: 45, power: 520, weaponIdx: 0, color: "#ff6d6d" },
  ];
}

function startMatch() {
  regenTerrain();
  initTanks();
  state.mode = "playing";
  state.message = "";
  state.projectile = { active: false, x: 0, y: 0, vx: 0, vy: 0, weaponIdx: 0 };
  state.cooldown = 0;
  state.currentTank = 0;
  startTurn(0);
}

function startTurn(tankIdx: 0 | 1) {
  state.currentTank = tankIdx;
  state.fuelLeft = TURN_FUEL_MAX;
  state.timeLeft = TURN_TIME_SEC;
  state.windAccel = randRange(WIND_ACCEL_MIN, WIND_ACCEL_MAX);
  if (Math.abs(state.windAccel) < 25) state.windAccel = 0;
}

function facingSign(t: Tank) {
  return t.id === 0 ? 1 : -1;
}

function keyDown(code: string) {
  return pressed.has(code);
}

function tryMoveTank(t: Tank, dt: number) {
  if (state.fuelLeft <= 0) return;
  if (Math.abs(t.vy) > 0.01) return;

  const groundY = surfaceYAt(t.x) - TANK_R;
  if (Math.abs(t.y - groundY) > 0.75) return;

  let dir = 0;
  if (keyDown("KeyA")) dir -= 1;
  if (keyDown("KeyD")) dir += 1;
  if (dir === 0) return;

  let desiredX = clamp(t.x + dir * MOVE_SPEED * dt, TANK_R, WIDTH - TANK_R);
  desiredX = avoidOverlap(t, desiredX);
  desiredX = clamp(desiredX, TANK_R, WIDTH - TANK_R);

  let dist = Math.abs(desiredX - t.x);
  let cost = dist * FUEL_COST_PER_PX;
  if (cost > state.fuelLeft) {
    const allowedDist = state.fuelLeft / FUEL_COST_PER_PX;
    desiredX = clamp(t.x + dir * allowedDist, TANK_R, WIDTH - TANK_R);
    desiredX = avoidOverlap(t, desiredX);
    desiredX = clamp(desiredX, TANK_R, WIDTH - TANK_R);
    dist = Math.abs(desiredX - t.x);
    cost = dist * FUEL_COST_PER_PX;
  }

  t.x = desiredX;
  state.fuelLeft = Math.max(0, state.fuelLeft - cost);
}

function avoidOverlap(moving: Tank, desiredX: number) {
  const minSep = TANK_R * 2 + 10;
  for (const t of state.tanks) {
    if (t === moving) continue;
    if (t.hp <= 0) continue;
    const dx = desiredX - t.x;
    if (Math.abs(dx) < minSep) desiredX = t.x + (dx >= 0 ? minSep : -minSep);
  }
  return desiredX;
}

function tickTanks(dt: number) {
  for (const t of state.tanks) {
    if (t.hp <= 0) continue;
    const groundY = surfaceYAt(t.x) - TANK_R;
    if (t.y < groundY) {
      t.vy += GRAVITY * dt;
      t.y += t.vy * dt;
      if (t.y >= groundY) {
        t.y = groundY;
        t.vy = 0;
      }
    } else {
      t.y = groundY;
      t.vy = 0;
    }
  }
}

function aimAndPowerTick(t: Tank, dt: number) {
  const angleDelta = ANGLE_SPEED_DEG_PER_SEC * dt;
  if (keyDown("ArrowLeft")) t.aimDeg = clamp(t.aimDeg - angleDelta, ANGLE_MIN, ANGLE_MAX);
  if (keyDown("ArrowRight")) t.aimDeg = clamp(t.aimDeg + angleDelta, ANGLE_MIN, ANGLE_MAX);

  const powerDelta = POWER_SPEED_PER_SEC * dt;
  if (keyDown("ArrowDown")) t.power = clamp(t.power - powerDelta, POWER_MIN, POWER_MAX);
  if (keyDown("ArrowUp")) t.power = clamp(t.power + powerDelta, POWER_MIN, POWER_MAX);
}

function fire(t: Tank) {
  const w = weapons[clamp(t.weaponIdx, 0, weapons.length - 1)]!;
  const angleRad = (t.aimDeg * Math.PI) / 180;
  const dirX = Math.cos(angleRad) * facingSign(t);
  const dirY = -Math.sin(angleRad);
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;

  state.projectile.active = true;
  state.projectile.weaponIdx = t.weaponIdx;
  state.projectile.x = t.x + ux * (TANK_R + w.projectileRadius + 2);
  state.projectile.y = t.y + uy * (TANK_R + w.projectileRadius + 2);
  state.projectile.vx = ux * t.power * w.speedMultiplier;
  state.projectile.vy = uy * t.power * w.speedMultiplier;
  state.message = "";
}

function carveCrater(cx: number, cy: number, radius: number) {
  const r2 = radius * radius;
  const iCenter = Math.round(cx / TERRAIN_STEP);
  const iRadius = Math.ceil(radius / TERRAIN_STEP);
  const start = Math.max(0, iCenter - iRadius);
  const end = Math.min(state.terrainY.length - 1, iCenter + iRadius);
  for (let i = start; i <= end; i++) {
    const x = i * TERRAIN_STEP;
    const dx = x - cx;
    const dx2 = dx * dx;
    if (dx2 > r2) continue;
    const dy = Math.sqrt(r2 - dx2);
    const circleBottom = cy + dy;
    if (circleBottom > state.terrainY[i]) state.terrainY[i] = Math.min(circleBottom, HEIGHT);
  }
}

function applyExplosionDamage(cx: number, cy: number, radius: number, maxDamage: number) {
  for (const t of state.tanks) {
    if (t.hp <= 0) continue;
    const dist = Math.hypot(t.x - cx, t.y - cy);
    if (dist > radius) continue;
    const frac = clamp(dist / radius, 0, 1);
    const dmg = lerp(maxDamage, 0, frac);
    t.hp = Math.max(0, t.hp - dmg);
  }
}

function explodeAt(x: number, y: number) {
  state.projectile.active = false;
  state.cooldown = EXPLOSION_COOLDOWN_SEC;

  const weapon = weapons[clamp(state.projectile.weaponIdx, 0, weapons.length - 1)]!;
  carveCrater(x, y, weapon.craterRadius);
  applyExplosionDamage(x, y, weapon.blastRadius, weapon.maxDamage);

  state.message = `${weapon.name} impact!`;
}

function endTurnOrGame() {
  const alive = state.tanks.filter((t) => t.hp > 0);
  if (alive.length <= 1) {
    state.mode = "gameover";
    state.message = alive.length === 1 ? `Player ${alive[0]!.id + 1} wins!` : "Draw!";
    return;
  }

  const next: 0 | 1 = state.currentTank === 0 ? 1 : 0;
  startTurn(next);
}

function tickProjectile(dt: number) {
  const p = state.projectile;
  if (!p.active) return;

  p.vx += state.windAccel * dt;
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  const weapon = weapons[clamp(p.weaponIdx, 0, weapons.length - 1)]!;
  const pr = weapon.projectileRadius;

  if (p.x < -50 || p.x > WIDTH + 50) {
    explodeAt(clamp(p.x, 0, WIDTH), clamp(p.y, 0, HEIGHT));
    return;
  }
  if (p.y > HEIGHT + 50) {
    explodeAt(clamp(p.x, 0, WIDTH), HEIGHT);
    return;
  }

  for (const t of state.tanks) {
    if (t.hp <= 0) continue;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d <= TANK_R + pr) {
      explodeAt(p.x, p.y);
      return;
    }
  }

  const groundY = surfaceYAt(p.x);
  if (p.y >= groundY) explodeAt(p.x, groundY);
}

function tick(dt: number) {
  if (state.mode !== "playing") return;

  tickTanks(dt);

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (state.cooldown === 0) endTurnOrGame();
  }

  if (state.projectile.active) {
    tickProjectile(dt);
    return;
  }

  const t = state.tanks[state.currentTank];
  if (!t || t.hp <= 0) {
    endTurnOrGame();
    return;
  }

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    state.message = "Timer expired!";
    fire(t);
    return;
  }

  tryMoveTank(t, dt);
  aimAndPowerTick(t, dt);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#070a0f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Terrain fill
  ctx.fillStyle = "#162026";
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let i = 0; i < state.terrainY.length; i++) {
    ctx.lineTo(i * TERRAIN_STEP, state.terrainY[i]!);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Terrain stroke
  ctx.strokeStyle = "#3a4a55";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < state.terrainY.length; i++) {
    const x = i * TERRAIN_STEP;
    const y = state.terrainY[i]!;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Tanks
  for (const t of state.tanks) {
    if (t.hp <= 0) continue;
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, TANK_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(t.x, t.y, TANK_R - 6, 0, Math.PI * 2);
    ctx.fill();

    if (state.mode === "playing" && t.id === state.currentTank && !state.projectile.active) {
      const angleRad = (t.aimDeg * Math.PI) / 180;
      const dirX = Math.cos(angleRad) * facingSign(t);
      const dirY = -Math.sin(angleRad);
      const len = Math.hypot(dirX, dirY) || 1;
      const ux = dirX / len;
      const uy = dirY / len;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + ux * 48, t.y + uy * 48);
      ctx.stroke();
    }
  }

  // Projectile
  if (state.projectile.active) {
    const weapon = weapons[clamp(state.projectile.weaponIdx, 0, weapons.length - 1)]!;
    ctx.fillStyle = weapon.projectileColor;
    ctx.beginPath();
    ctx.arc(state.projectile.x, state.projectile.y, weapon.projectileRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.mode === "menu") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillText("Tanks (Web Remake Spike)", 110, 190);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "500 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillText("Press Start to begin. Prototype visuals, clean-room mechanics.", 110, 230);
  }

  if (state.mode === "gameover") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillText(state.message || "Game over", 110, 210);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "500 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillText("Press Reset or R to play again.", 110, 246);
  }
}

function fmtWind() {
  if (Math.abs(state.windAccel) < 0.001) return "calm";
  const arrow = state.windAccel > 0 ? "->" : "<-";
  return `${arrow} ${Math.round(Math.abs(state.windAccel))}`;
}

function updateHud() {
  const t = state.tanks[state.currentTank];
  const w = t ? weapons[clamp(t.weaponIdx, 0, weapons.length - 1)] : null;
  const lines: string[] = [];
  lines.push(`v${__APP_VERSION__}  mode=${state.mode}`);
  if (state.mode !== "menu") {
    lines.push(
      `turn=P${state.currentTank + 1}  hp=[${Math.round(state.tanks[0]!.hp)},${Math.round(
        state.tanks[1]!.hp,
      )}]`,
    );
    if (t && w) {
      lines.push(
        `weapon=${w.name}  angle=${Math.round(t.aimDeg)}  power=${Math.round(t.power)}  wind=${fmtWind()}`,
      );
      lines.push(
        `fuel=${Math.round(state.fuelLeft)}  timer=${Math.ceil(state.timeLeft)}  cooldown=${state.cooldown.toFixed(
          2,
        )}`,
      );
    }
  }
  if (state.message) lines.push(state.message);
  hud.textContent = lines.join(" | ");
}

const pressed = new Set<string>();
window.addEventListener("keydown", (e) => {
  pressed.add(e.code);

  if (e.code === "KeyF") {
    toggleFullscreen().catch(() => {});
  }

  if (e.code === "KeyR") {
    onReset();
  }

  if (state.mode === "playing" && !state.projectile.active && state.cooldown <= 0) {
    const t = state.tanks[state.currentTank];
    if (!t || t.hp <= 0) return;
    if (e.code === "Space") fire(t);
    if (e.code === "Digit1") t.weaponIdx = 0;
    if (e.code === "Digit2") t.weaponIdx = 1;
    if (e.code === "Digit3") t.weaponIdx = 2;
  }
});
window.addEventListener("keyup", (e) => pressed.delete(e.code));

function onStart() {
  startMatch();
  startBtn.disabled = true;
  resetBtn.disabled = false;
  updateHud();
  draw();
}

function onReset() {
  if (state.mode === "menu") return;
  startMatch();
  updateHud();
  draw();
}

async function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) await el.requestFullscreen();
  else await document.exitFullscreen();
}

startBtn.addEventListener("click", onStart);
resetBtn.addEventListener("click", onReset);
fullscreenBtn.addEventListener("click", () => toggleFullscreen().catch(() => {}));

function renderGameToText() {
  const t = state.tanks[state.currentTank];
  const payload = {
    coordinateSystem: "origin=(0,0) top-left, +x right, +y down",
    mode: state.mode,
    windAccel: state.windAccel,
    turn: {
      currentPlayer: state.currentTank + 1,
      fuelLeft: state.fuelLeft,
      timeLeft: state.timeLeft,
      cooldown: state.cooldown,
    },
    tanks: state.tanks.map((tank) => ({
      id: tank.id + 1,
      x: tank.x,
      y: tank.y,
      hp: tank.hp,
      aimDeg: tank.aimDeg,
      power: tank.power,
      weapon: weapons[clamp(tank.weaponIdx, 0, weapons.length - 1)]?.name ?? "?",
    })),
    projectile: state.projectile.active
      ? { x: state.projectile.x, y: state.projectile.y, vx: state.projectile.vx, vy: state.projectile.vy }
      : null,
    current: t
      ? {
          aimDeg: t.aimDeg,
          power: t.power,
          weapon: weapons[clamp(t.weaponIdx, 0, weapons.length - 1)]?.name ?? "?",
        }
      : null,
    message: state.message,
  };
  return JSON.stringify(payload);
}

// Hooks for the develop-web-game Playwright client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).render_game_to_text = renderGameToText;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).advanceTime = (ms: number) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  const dt = 1 / 60;
  for (let i = 0; i < steps; i++) tick(dt);
  updateHud();
  draw();
};

// Initial paint
regenTerrain();
initTanks();
updateHud();
draw();
