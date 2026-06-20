import './style.css';

declare const __APP_VERSION__: string;

const canvasEl = document.querySelector<HTMLCanvasElement>('#game-canvas');
const startBtnEl = document.querySelector<HTMLButtonElement>('#start-btn');
const resetBtnEl = document.querySelector<HTMLButtonElement>('#reset-btn');
const pauseBtnEl = document.querySelector<HTMLButtonElement>('#pause-btn');
const settingsBtnEl = document.querySelector<HTMLButtonElement>('#settings-btn');
const fullscreenBtnEl = document.querySelector<HTMLButtonElement>('#fullscreen-btn');
const hudEl = document.querySelector<HTMLDivElement>('#hud');
const hudPanelEl = document.querySelector<HTMLElement>('#hud-panel');
const hudStatsEl = document.querySelector<HTMLElement>('#hud-stats');
const hudMessageEl = document.querySelector<HTMLElement>('#hud-message');

const touchControlsEl = document.querySelector<HTMLElement>('#touch-controls');

const modalLayerEl = document.querySelector<HTMLElement>('#modal-layer');
const pauseModalEl = document.querySelector<HTMLElement>('#pause-modal');
const pauseResumeBtnEl = document.querySelector<HTMLButtonElement>('#pause-resume-btn');
const pauseRestartBtnEl = document.querySelector<HTMLButtonElement>('#pause-restart-btn');
const pauseSettingsBtnEl = document.querySelector<HTMLButtonElement>('#pause-settings-btn');
const pauseMainMenuBtnEl = document.querySelector<HTMLButtonElement>('#pause-main-menu-btn');

const settingsModalEl = document.querySelector<HTMLElement>('#settings-modal');
const settingsTouchEnabledEl = document.querySelector<HTMLInputElement>('#settings-touch-enabled');
const settingsTouchLayoutEl = document.querySelector<HTMLSelectElement>('#settings-touch-layout');
const settingsCameraIntensityEl = document.querySelector<HTMLSelectElement>(
  '#settings-camera-intensity',
);
const settingsCloseBtnEl = document.querySelector<HTMLButtonElement>('#settings-close-btn');

if (
  !canvasEl ||
  !startBtnEl ||
  !resetBtnEl ||
  !pauseBtnEl ||
  !settingsBtnEl ||
  !fullscreenBtnEl ||
  !hudEl ||
  !hudPanelEl ||
  !hudStatsEl ||
  !hudMessageEl ||
  !touchControlsEl ||
  !modalLayerEl ||
  !pauseModalEl ||
  !pauseResumeBtnEl ||
  !pauseRestartBtnEl ||
  !pauseSettingsBtnEl ||
  !pauseMainMenuBtnEl ||
  !settingsModalEl ||
  !settingsTouchEnabledEl ||
  !settingsTouchLayoutEl ||
  !settingsCameraIntensityEl ||
  !settingsCloseBtnEl
) {
  throw new Error('Missing required DOM elements');
}

const canvas = canvasEl;
const startBtn = startBtnEl;
const resetBtn = resetBtnEl;
const pauseBtn = pauseBtnEl;
const settingsBtn = settingsBtnEl;
const fullscreenBtn = fullscreenBtnEl;
const hud = hudEl;
const hudPanel = hudPanelEl;
const hudStats = hudStatsEl;
const hudMessage = hudMessageEl;

const touchControls = touchControlsEl;

const modalLayer = modalLayerEl;
const pauseModal = pauseModalEl;
const pauseResumeBtn = pauseResumeBtnEl;
const pauseRestartBtn = pauseRestartBtnEl;
const pauseSettingsBtn = pauseSettingsBtnEl;
const pauseMainMenuBtn = pauseMainMenuBtnEl;

const settingsModal = settingsModalEl;
const settingsTouchEnabled = settingsTouchEnabledEl;
const settingsTouchLayout = settingsTouchLayoutEl;
const settingsCameraIntensity = settingsCameraIntensityEl;
const settingsCloseBtn = settingsCloseBtnEl;

const ctxMaybe = canvas.getContext('2d');
if (!ctxMaybe) throw new Error('2D canvas context not available');
const ctx = ctxMaybe;

type Mode = 'menu' | 'playing' | 'paused' | 'gameover';

type TouchLayout = 'right' | 'left';
type CameraIntensity = 'off' | 'low' | 'default';

type UiModal = null | 'pause' | 'settings';
type Phase = 'aim' | 'firing' | 'impact' | 'gameover';

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

type TrajectoryPoint = {
  x: number;
  y: number;
  impact: boolean;
};

type CameraState = {
  offsetX: number;
  offsetY: number;
  zoom: number;
  shakePhase: number;
  shakeTimeLeft: number;
  shakeDuration: number;
  shakeStrength: number;
  cueTimeLeft: number;
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
const TRAJECTORY_STEP_DT = 1 / 30;
const TRAJECTORY_MAX_STEPS = 110;
const CAMERA_MAX_OFFSET_X = 22;
const CAMERA_MAX_OFFSET_Y = 14;
const CAMERA_TRACK_LERP = 7.5;
const CAMERA_BASE_SHOT_ZOOM = 0.02;
const CAMERA_CUE_MAX_ZOOM = 0.024;
const CAMERA_CUE_DECAY_SEC = 0.35;

const weapons: Weapon[] = [
  {
    name: 'Cannon',
    blastRadius: 72,
    craterRadius: 56,
    maxDamage: 70,
    speedMultiplier: 1.0,
    projectileRadius: 4,
    projectileColor: 'rgba(255, 230, 120, 0.95)',
  },
  {
    name: 'Heavy',
    blastRadius: 92,
    craterRadius: 72,
    maxDamage: 90,
    speedMultiplier: 0.85,
    projectileRadius: 5,
    projectileColor: 'rgba(255, 190, 110, 0.95)',
  },
  {
    name: 'Sniper',
    blastRadius: 56,
    craterRadius: 36,
    maxDamage: 60,
    speedMultiplier: 1.25,
    projectileRadius: 3,
    projectileColor: 'rgba(160, 220, 255, 0.95)',
  },
];

const ORIGINAL_ASSETS = {
  imageBg: '/original/images/char_318.png',
  imageP1: '/original/images/char_230.png',
  imageP2: '/original/images/char_237.png',
  sfxUiClick: '/original/sounds/sound_121.mp3',
  sfxFire: '/original/sounds/sound_35.mp3',
  sfxImpact: '/original/sounds/sound_12.mp3',
} as const;

const state: {
  mode: Mode;
  phase: Phase;
  message: string;
  windAccel: number;
  fuelLeft: number;
  timeLeft: number;
  cooldown: number;
  terrainY: number[];
  tanks: Tank[];
  currentTank: 0 | 1;
  projectile: Projectile;
  camera: CameraState;
} = {
  mode: 'menu',
  phase: 'aim',
  message: '',
  windAccel: 0,
  fuelLeft: TURN_FUEL_MAX,
  timeLeft: TURN_TIME_SEC,
  cooldown: 0,
  terrainY: [],
  tanks: [],
  currentTank: 0,
  projectile: { active: false, x: 0, y: 0, vx: 0, vy: 0, weaponIdx: 0 },
  camera: {
    offsetX: 0,
    offsetY: 0,
    zoom: 0,
    shakePhase: 0,
    shakeTimeLeft: 0,
    shakeDuration: 0,
    shakeStrength: 0,
    cueTimeLeft: 0,
  },
};

const UI_SETTINGS_KEY = 'tanks.remakeWeb.settings.v1';

function defaultTouchEnabled() {
  // Good heuristic for phones/tablets; also fine for 2-in-1 devices.
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function normalizeCameraIntensity(raw: unknown): CameraIntensity {
  if (raw === 'off' || raw === 'low' || raw === 'default') return raw;
  return 'default';
}

function loadUiSettings(): {
  touchEnabled: boolean;
  touchLayout: TouchLayout;
  cameraIntensity: CameraIntensity;
} {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw)
      return {
        touchEnabled: defaultTouchEnabled(),
        touchLayout: 'right',
        cameraIntensity: 'default',
      };
    const parsed = JSON.parse(raw) as Partial<{
      touchEnabled: boolean;
      touchLayout: TouchLayout;
      cameraIntensity: CameraIntensity;
    }>;
    return {
      touchEnabled:
        typeof parsed.touchEnabled === 'boolean' ? parsed.touchEnabled : defaultTouchEnabled(),
      touchLayout: parsed.touchLayout === 'left' ? 'left' : 'right',
      cameraIntensity: normalizeCameraIntensity(parsed.cameraIntensity),
    };
  } catch {
    return {
      touchEnabled: defaultTouchEnabled(),
      touchLayout: 'right',
      cameraIntensity: 'default',
    };
  }
}

function saveUiSettings(settings: {
  touchEnabled: boolean;
  touchLayout: TouchLayout;
  cameraIntensity: CameraIntensity;
}) {
  try {
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

const ui: {
  modal: UiModal;
  modalReturnMode: Mode;
  touchEnabled: boolean;
  touchLayout: TouchLayout;
  cameraIntensity: CameraIntensity;
} = {
  modal: null,
  modalReturnMode: 'menu',
  ...loadUiSettings(),
};

function persistUiSettings() {
  saveUiSettings({
    touchEnabled: ui.touchEnabled,
    touchLayout: ui.touchLayout,
    cameraIntensity: ui.cameraIntensity,
  });
}

function cameraMotionProfile() {
  if (ui.cameraIntensity === 'off') return { followScale: 0, zoomScale: 0, shakeScale: 0 };
  if (ui.cameraIntensity === 'low') return { followScale: 0.5, zoomScale: 0.45, shakeScale: 0.4 };
  return { followScale: 1, zoomScale: 1, shakeScale: 1 };
}

const imageCache: {
  bg?: HTMLImageElement;
  p1?: HTMLImageElement;
  p2?: HTMLImageElement;
} = {};
const imageReady = {
  bg: false,
  p1: false,
  p2: false,
};

function createLoadedImage(src: string, onReady: () => void): HTMLImageElement {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => onReady();
  img.onerror = () => onReady();
  img.src = src;
  return img;
}

imageCache.bg = createLoadedImage(ORIGINAL_ASSETS.imageBg, () => {
  imageReady.bg = true;
});
imageCache.p1 = createLoadedImage(ORIGINAL_ASSETS.imageP1, () => {
  imageReady.p1 = true;
});
imageCache.p2 = createLoadedImage(ORIGINAL_ASSETS.imageP2, () => {
  imageReady.p2 = true;
});

const audioCache = {
  uiClick: new Audio(ORIGINAL_ASSETS.sfxUiClick),
  fire: new Audio(ORIGINAL_ASSETS.sfxFire),
  impact: new Audio(ORIGINAL_ASSETS.sfxImpact),
};

audioCache.uiClick.volume = 0.28;
audioCache.fire.volume = 0.35;
audioCache.impact.volume = 0.4;

function playSfx(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

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
    {
      id: 0,
      x: p1x,
      y: p1y,
      vy: 0,
      hp: 100,
      aimDeg: 45,
      power: 520,
      weaponIdx: 0,
      color: '#44e38f',
    },
    {
      id: 1,
      x: p2x,
      y: p2y,
      vy: 0,
      hp: 100,
      aimDeg: 45,
      power: 520,
      weaponIdx: 0,
      color: '#ff6d6d',
    },
  ];
}

function startMatch() {
  regenTerrain();
  initTanks();
  state.mode = 'playing';
  state.phase = 'aim';
  state.message = '';
  state.projectile = { active: false, x: 0, y: 0, vx: 0, vy: 0, weaponIdx: 0 };
  state.cooldown = 0;
  state.currentTank = 0;
  state.camera.offsetX = 0;
  state.camera.offsetY = 0;
  state.camera.zoom = 0;
  state.camera.shakePhase = 0;
  state.camera.shakeTimeLeft = 0;
  state.camera.shakeDuration = 0;
  state.camera.shakeStrength = 0;
  state.camera.cueTimeLeft = 0;
  startTurn(0);
}

function startTurn(tankIdx: 0 | 1) {
  state.currentTank = tankIdx;
  state.phase = 'aim';
  state.fuelLeft = TURN_FUEL_MAX;
  state.timeLeft = TURN_TIME_SEC;
  state.windAccel = randRange(WIND_ACCEL_MIN, WIND_ACCEL_MAX);
  if (Math.abs(state.windAccel) < 25) state.windAccel = 0;
}

function facingSign(t: Tank) {
  return t.id === 0 ? 1 : -1;
}

function getAimUnit(t: Tank) {
  const angleRad = (t.aimDeg * Math.PI) / 180;
  const dirX = Math.cos(angleRad) * facingSign(t);
  const dirY = -Math.sin(angleRad);
  const len = Math.hypot(dirX, dirY) || 1;
  return { x: dirX / len, y: dirY / len };
}

function getMuzzleState(t: Tank, weapon: Weapon) {
  const aim = getAimUnit(t);
  const muzzleX = t.x + aim.x * (TANK_R + weapon.projectileRadius + 2);
  const muzzleY = t.y + aim.y * (TANK_R + weapon.projectileRadius + 2);
  const speed = t.power * weapon.speedMultiplier;
  return {
    muzzleX,
    muzzleY,
    velX: aim.x * speed,
    velY: aim.y * speed,
  };
}

function buildTrajectoryPreview(t: Tank): TrajectoryPoint[] {
  if (state.mode !== 'playing' || state.phase !== 'aim') return [];
  const weapon = weapons[clamp(t.weaponIdx, 0, weapons.length - 1)]!;
  const muzzle = getMuzzleState(t, weapon);

  let x = muzzle.muzzleX;
  let y = muzzle.muzzleY;
  let vx = muzzle.velX;
  let vy = muzzle.velY;
  const points: TrajectoryPoint[] = [];

  for (let i = 0; i < TRAJECTORY_MAX_STEPS; i++) {
    vx += state.windAccel * TRAJECTORY_STEP_DT;
    vy += GRAVITY * TRAJECTORY_STEP_DT;
    x += vx * TRAJECTORY_STEP_DT;
    y += vy * TRAJECTORY_STEP_DT;

    if (x < -40 || x > WIDTH + 40 || y > HEIGHT + 40) {
      points.push({ x: clamp(x, 0, WIDTH), y: clamp(y, 0, HEIGHT), impact: true });
      break;
    }

    let impact = false;
    const groundY = surfaceYAt(x);
    if (y >= groundY) {
      y = groundY;
      impact = true;
    } else {
      for (const other of state.tanks) {
        if (other.hp <= 0) continue;
        const dist = Math.hypot(other.x - x, other.y - y);
        if (dist <= TANK_R + weapon.projectileRadius) {
          impact = true;
          break;
        }
      }
    }

    points.push({ x, y, impact });
    if (impact) break;
  }

  return points;
}

type HoldAction = 'move_left' | 'move_right' | 'aim_left' | 'aim_right' | 'power_up' | 'power_down';

const touchHeld = new Set<HoldAction>();

function actionDown(action: HoldAction) {
  return touchHeld.has(action);
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
  if (keyDown('KeyA') || actionDown('move_left')) dir -= 1;
  if (keyDown('KeyD') || actionDown('move_right')) dir += 1;
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
  if (keyDown('ArrowLeft') || actionDown('aim_left'))
    t.aimDeg = clamp(t.aimDeg - angleDelta, ANGLE_MIN, ANGLE_MAX);
  if (keyDown('ArrowRight') || actionDown('aim_right'))
    t.aimDeg = clamp(t.aimDeg + angleDelta, ANGLE_MIN, ANGLE_MAX);

  const powerDelta = POWER_SPEED_PER_SEC * dt;
  if (keyDown('ArrowDown') || actionDown('power_down'))
    t.power = clamp(t.power - powerDelta, POWER_MIN, POWER_MAX);
  if (keyDown('ArrowUp') || actionDown('power_up'))
    t.power = clamp(t.power + powerDelta, POWER_MIN, POWER_MAX);
}

function triggerCameraShake(durationSec: number, strengthPx: number) {
  if (cameraMotionProfile().shakeScale <= 0) return;
  state.camera.shakeDuration = Math.max(state.camera.shakeDuration, durationSec);
  state.camera.shakeTimeLeft = Math.max(state.camera.shakeTimeLeft, durationSec);
  state.camera.shakeStrength = Math.max(state.camera.shakeStrength, strengthPx);
}

function triggerCameraCue(durationSec = CAMERA_CUE_DECAY_SEC) {
  if (cameraMotionProfile().zoomScale <= 0) return;
  state.camera.cueTimeLeft = Math.max(state.camera.cueTimeLeft, durationSec);
}

function tickCamera(dt: number) {
  const motion = cameraMotionProfile();
  let targetX = WIDTH * 0.5;
  let targetY = HEIGHT * 0.5;

  if (state.mode === 'playing') {
    if (state.projectile.active) {
      targetX = clamp(state.projectile.x, 0, WIDTH);
      targetY = clamp(state.projectile.y, 0, HEIGHT);
    } else {
      const t = state.tanks[state.currentTank];
      if (t && t.hp > 0) {
        targetX = t.x;
        targetY = t.y - 70;
      }
    }
  }

  const targetOffsetX = clamp(
    (targetX - WIDTH * 0.5) * 0.16 * motion.followScale,
    -CAMERA_MAX_OFFSET_X,
    CAMERA_MAX_OFFSET_X,
  );
  const targetOffsetY = clamp(
    (targetY - HEIGHT * 0.5) * 0.12 * motion.followScale,
    -CAMERA_MAX_OFFSET_Y,
    CAMERA_MAX_OFFSET_Y,
  );
  const lerpFactor = clamp(CAMERA_TRACK_LERP * dt, 0, 1);
  state.camera.offsetX = lerp(state.camera.offsetX, targetOffsetX, lerpFactor);
  state.camera.offsetY = lerp(state.camera.offsetY, targetOffsetY, lerpFactor);

  if (state.camera.shakeTimeLeft > 0) {
    state.camera.shakeTimeLeft = Math.max(0, state.camera.shakeTimeLeft - dt);
    state.camera.shakePhase += dt * 34;
  } else {
    state.camera.shakeDuration = 0;
    state.camera.shakeStrength = 0;
  }

  state.camera.cueTimeLeft = Math.max(0, state.camera.cueTimeLeft - dt);
  const cueFrac =
    state.camera.cueTimeLeft > 0 ? state.camera.cueTimeLeft / CAMERA_CUE_DECAY_SEC : 0;
  const targetZoom =
    ((state.projectile.active ? CAMERA_BASE_SHOT_ZOOM : 0) + cueFrac * CAMERA_CUE_MAX_ZOOM) *
    motion.zoomScale;
  state.camera.zoom = lerp(state.camera.zoom, targetZoom, clamp(8 * dt, 0, 1));
}

function fire(t: Tank) {
  const w = weapons[clamp(t.weaponIdx, 0, weapons.length - 1)]!;
  const muzzle = getMuzzleState(t, w);

  state.projectile.active = true;
  state.projectile.weaponIdx = t.weaponIdx;
  state.projectile.x = muzzle.muzzleX;
  state.projectile.y = muzzle.muzzleY;
  state.projectile.vx = muzzle.velX;
  state.projectile.vy = muzzle.velY;
  state.phase = 'firing';
  state.message = '';
  triggerCameraCue(0.22);
  triggerCameraShake(0.12, 3.2);
  playSfx(audioCache.fire);
}

function requestFire() {
  if (state.mode !== 'playing') return;
  if (state.phase !== 'aim') return;
  if (ui.modal !== null) return;
  if (state.projectile.active) return;
  if (state.cooldown > 0) return;
  const t = state.tanks[state.currentTank];
  if (!t || t.hp <= 0) return;
  fire(t);
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
  state.phase = 'impact';
  state.cooldown = EXPLOSION_COOLDOWN_SEC;
  triggerCameraCue(0.32);
  triggerCameraShake(0.28, 11.5);
  playSfx(audioCache.impact);

  const weapon = weapons[clamp(state.projectile.weaponIdx, 0, weapons.length - 1)]!;
  carveCrater(x, y, weapon.craterRadius);
  applyExplosionDamage(x, y, weapon.blastRadius, weapon.maxDamage);

  state.message = `${weapon.name} impact!`;
}

function endTurnOrGame() {
  const alive = state.tanks.filter((t) => t.hp > 0);
  if (alive.length <= 1) {
    state.mode = 'gameover';
    state.phase = 'gameover';
    state.message = alive.length === 1 ? `Player ${alive[0]!.id + 1} wins!` : 'Draw!';
    ui.modal = null;
    pauseBtn.disabled = true;
    syncUi();
    return;
  }

  const next: 0 | 1 = state.currentTank === 0 ? 1 : 0;
  startTurn(next);
}

function tickProjectile(dt: number) {
  const p = state.projectile;
  if (!p.active) return;
  state.phase = 'firing';

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
  if (state.mode !== 'playing') return;

  tickTanks(dt);

  if (state.cooldown > 0) {
    state.phase = 'impact';
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
    state.message = 'Timer expired!';
    fire(t);
    return;
  }

  state.phase = 'aim';
  tryMoveTank(t, dt);
  aimAndPowerTick(t, dt);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const motion = cameraMotionProfile();
  const shakeFrac =
    state.camera.shakeDuration > 0
      ? clamp(state.camera.shakeTimeLeft / state.camera.shakeDuration, 0, 1)
      : 0;
  const shakeAmp = state.camera.shakeStrength * shakeFrac * motion.shakeScale;
  const shakeX = Math.sin(state.camera.shakePhase * 1.7) * shakeAmp;
  const shakeY = Math.cos(state.camera.shakePhase * 2.3) * shakeAmp * 0.8;
  const zoom = 1 + state.camera.zoom;

  ctx.save();
  ctx.translate(WIDTH * 0.5, HEIGHT * 0.5);
  ctx.scale(zoom, zoom);
  // Positive camera offset means "look right/down"; the world shifts in the opposite direction.
  ctx.translate(
    -WIDTH * 0.5 - state.camera.offsetX + shakeX,
    -HEIGHT * 0.5 - state.camera.offsetY + shakeY,
  );

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(1, '#070a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (imageReady.bg && imageCache.bg && imageCache.bg.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.drawImage(imageCache.bg, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  // Terrain fill
  ctx.fillStyle = '#162026';
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let i = 0; i < state.terrainY.length; i++) {
    ctx.lineTo(i * TERRAIN_STEP, state.terrainY[i]!);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Terrain stroke
  ctx.strokeStyle = '#3a4a55';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < state.terrainY.length; i++) {
    const x = i * TERRAIN_STEP;
    const y = state.terrainY[i]!;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const activeTank =
    state.mode === 'playing' && !state.projectile.active
      ? (state.tanks[state.currentTank] ?? null)
      : null;
  const trajectoryPreview =
    activeTank && activeTank.hp > 0 ? buildTrajectoryPreview(activeTank) : [];

  // Tanks
  for (const t of state.tanks) {
    if (t.hp <= 0) continue;
    const sprite = t.id === 0 ? imageCache.p1 : imageCache.p2;
    const spriteReady = t.id === 0 ? imageReady.p1 : imageReady.p2;
    if (spriteReady && sprite && sprite.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(t.x, t.y, TANK_R, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(sprite, t.x - TANK_R, t.y - TANK_R, TANK_R * 2, TANK_R * 2);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TANK_R, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TANK_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, TANK_R - 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.mode === 'playing' && t.id === state.currentTank && !state.projectile.active) {
      const weapon = weapons[clamp(t.weaponIdx, 0, weapons.length - 1)]!;
      const aim = getAimUnit(t);
      const muzzle = getMuzzleState(t, weapon);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + aim.x * 48, t.y + aim.y * 48);
      ctx.stroke();

      if (trajectoryPreview.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 235, 170, 0.6)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.moveTo(muzzle.muzzleX, muzzle.muzzleY);
        for (const point of trajectoryPreview) ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 0; i < trajectoryPreview.length; i++) {
          const point = trajectoryPreview[i]!;
          const fade = 1 - i / Math.max(1, trajectoryPreview.length);
          const alpha = 0.2 + fade * 0.55;
          ctx.fillStyle = `rgba(255, 244, 190, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.impact ? 3.6 : 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        const last = trajectoryPreview[trajectoryPreview.length - 1]!;
        if (last.impact) {
          ctx.strokeStyle = 'rgba(255, 168, 122, 0.85)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
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

  ctx.restore();

  if (state.mode === 'menu') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font =
      '700 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillText('Tanks (Web Remake v1)', 110, 190);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font =
      '500 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillText(
      'Press Start to begin. Reimplemented rules with imported original assets.',
      110,
      230,
    );
  }

  if (state.mode === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font =
      '700 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillText(state.message || 'Game over', 110, 210);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font =
      '500 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillText('Press Reset or R to play again.', 110, 246);
  }
}

function fmtWind() {
  if (Math.abs(state.windAccel) < 0.001) return 'calm';
  const arrow = state.windAccel > 0 ? '->' : '<-';
  return `${arrow} ${Math.round(Math.abs(state.windAccel))}`;
}

function updateHud() {
  const t = state.tanks[state.currentTank];
  const w = t ? weapons[clamp(t.weaponIdx, 0, weapons.length - 1)] : null;
  const lines: string[] = [];
  lines.push(`v${__APP_VERSION__}  mode=${state.mode}`);
  if (state.mode !== 'menu') {
    lines.push(`phase=${state.phase}`);
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
  hud.textContent = lines.join(' | ');

  // In-game HUD panel (more readable than the footer debug line).
  hudPanel.hidden = state.mode === 'menu';
  if (state.mode === 'menu') {
    hudStats.textContent = '';
    hudMessage.textContent = '';
    return;
  }

  const statLines: string[] = [];
  if (t && w) {
    statLines.push(`Phase: ${state.phase}`);
    statLines.push(`Turn: Player ${state.currentTank + 1}    Weapon: ${w.name}`);
    statLines.push(`Angle: ${Math.round(t.aimDeg)}°    Power: ${Math.round(t.power)}`);
    statLines.push(
      `Wind: ${fmtWind()}    Fuel: ${Math.round(state.fuelLeft)}    Timer: ${Math.ceil(state.timeLeft)}`,
    );
    statLines.push(
      `HP: P1 ${Math.round(state.tanks[0]!.hp)}    P2 ${Math.round(state.tanks[1]!.hp)}`,
    );
  } else {
    statLines.push(`Mode: ${state.mode}`);
  }
  hudStats.textContent = statLines.join('\n');
  hudMessage.textContent = state.message || '';
}

let settingsReturnToPause = false;

function syncUi() {
  const hasModal = ui.modal !== null;
  modalLayer.hidden = !hasModal;
  pauseModal.hidden = ui.modal !== 'pause';
  settingsModal.hidden = ui.modal !== 'settings';

  // Topbar buttons
  pauseBtn.disabled = state.mode === 'menu' || state.mode === 'gameover' || ui.modal === 'settings';
  pauseBtn.textContent = state.mode === 'paused' ? 'Resume' : 'Pause';
  settingsBtn.disabled = ui.modal === 'settings';

  // Settings form state
  settingsTouchEnabled.checked = ui.touchEnabled;
  settingsTouchLayout.value = ui.touchLayout;
  settingsCameraIntensity.value = ui.cameraIntensity;

  // Touch overlay
  touchControls.hidden = !ui.touchEnabled || state.mode !== 'playing' || hasModal;
  touchControls.dataset.layout = ui.touchLayout;
  if (state.mode !== 'playing' || hasModal) touchHeld.clear();
}

function openPauseMenu() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  ui.modal = 'pause';
  syncUi();
  updateHud();
  draw();
}

function resumeFromPause() {
  if (state.mode !== 'paused') return;
  ui.modal = null;
  state.mode = 'playing';
  syncUi();
  updateHud();
  draw();
}

function togglePause() {
  if (ui.modal === 'settings') return;
  if (state.mode === 'playing') openPauseMenu();
  else if (state.mode === 'paused') resumeFromPause();
}

function openSettings(returnToPause: boolean) {
  settingsReturnToPause = returnToPause;
  ui.modalReturnMode = state.mode;
  ui.modal = 'settings';
  if (state.mode === 'playing') state.mode = 'paused';
  syncUi();
  updateHud();
  draw();
}

function closeSettings() {
  ui.modal = null;
  state.mode = ui.modalReturnMode;

  if (settingsReturnToPause && state.mode === 'paused') {
    ui.modal = 'pause';
  }
  settingsReturnToPause = false;

  syncUi();
  updateHud();
  draw();
}

function goToMainMenu() {
  ui.modal = null;
  settingsReturnToPause = false;

  state.mode = 'menu';
  state.phase = 'aim';
  state.message = '';
  state.cooldown = 0;
  state.projectile.active = false;
  state.camera.offsetX = 0;
  state.camera.offsetY = 0;
  state.camera.zoom = 0;
  state.camera.shakeTimeLeft = 0;
  state.camera.shakeDuration = 0;
  state.camera.shakeStrength = 0;
  state.camera.cueTimeLeft = 0;

  startBtn.disabled = false;
  resetBtn.disabled = true;
  pauseBtn.disabled = true;

  syncUi();
  updateHud();
  draw();
}

const pressed = new Set<string>();
window.addEventListener('keydown', (e) => {
  pressed.add(e.code);

  if (e.code === 'KeyF') {
    toggleFullscreen().catch(() => {});
  }

  if (e.code === 'Escape') {
    // Close modals first; otherwise toggle pause.
    if (ui.modal === 'settings') closeSettings();
    else togglePause();
  }

  if (e.code === 'KeyR') {
    onReset();
  }

  if (state.mode === 'playing' && ui.modal === null && state.phase === 'aim') {
    const t = state.tanks[state.currentTank];
    if (!t || t.hp <= 0) return;
    if (e.code === 'Space') requestFire();
    if (e.code === 'Digit1') t.weaponIdx = 0;
    if (e.code === 'Digit2') t.weaponIdx = 1;
    if (e.code === 'Digit3') t.weaponIdx = 2;
  }
});
window.addEventListener('keyup', (e) => pressed.delete(e.code));

function onStart() {
  startMatch();
  startBtn.disabled = true;
  resetBtn.disabled = false;
  pauseBtn.disabled = false;
  ui.modal = null;
  updateHud();
  syncUi();
  draw();
}

function onReset() {
  if (state.mode === 'menu') return;
  startMatch();
  ui.modal = null;
  pauseBtn.disabled = false;
  updateHud();
  syncUi();
  draw();
}

async function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) await el.requestFullscreen();
  else await document.exitFullscreen();
}

startBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  onStart();
});
resetBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  onReset();
});
pauseBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  togglePause();
});
settingsBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  openSettings(false);
});
fullscreenBtn.addEventListener('click', () => toggleFullscreen().catch(() => {}));

pauseResumeBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  resumeFromPause();
});
pauseRestartBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  onReset();
});
pauseSettingsBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  openSettings(true);
});
pauseMainMenuBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  goToMainMenu();
});

settingsTouchEnabled.addEventListener('change', () => {
  playSfx(audioCache.uiClick);
  ui.touchEnabled = settingsTouchEnabled.checked;
  persistUiSettings();
  syncUi();
});
settingsTouchLayout.addEventListener('change', () => {
  playSfx(audioCache.uiClick);
  ui.touchLayout = settingsTouchLayout.value === 'left' ? 'left' : 'right';
  persistUiSettings();
  syncUi();
});
settingsCameraIntensity.addEventListener('change', () => {
  playSfx(audioCache.uiClick);
  ui.cameraIntensity = normalizeCameraIntensity(settingsCameraIntensity.value);
  if (ui.cameraIntensity === 'off') {
    state.camera.offsetX = 0;
    state.camera.offsetY = 0;
    state.camera.zoom = 0;
    state.camera.shakeTimeLeft = 0;
    state.camera.shakeDuration = 0;
    state.camera.shakeStrength = 0;
    state.camera.cueTimeLeft = 0;
  }
  persistUiSettings();
  syncUi();
});
settingsCloseBtn.addEventListener('click', () => {
  playSfx(audioCache.uiClick);
  closeSettings();
});

function bindHoldButton(button: HTMLElement, action: HoldAction) {
  const press = (event: Event) => {
    event.preventDefault();
    touchHeld.add(action);
  };
  const release = (event: Event) => {
    event.preventDefault();
    touchHeld.delete(action);
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

function bindTouchControls() {
  const holdButtons = touchControls.querySelectorAll<HTMLElement>('[data-hold]');
  holdButtons.forEach((el) => {
    const actionRaw = el.dataset.hold as HoldAction | undefined;
    if (!actionRaw) return;
    bindHoldButton(el, actionRaw);
  });

  const weaponButtons = touchControls.querySelectorAll<HTMLElement>('[data-weapon]');
  weaponButtons.forEach((el) => {
    el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (state.mode !== 'playing' || state.phase !== 'aim' || ui.modal !== null) return;
      const t = state.tanks[state.currentTank];
      if (!t || t.hp <= 0) return;
      const raw = Number(el.dataset.weapon ?? '0');
      t.weaponIdx = clamp(Math.trunc(raw), 0, weapons.length - 1);
      playSfx(audioCache.uiClick);
      updateHud();
      draw();
    });
  });

  const fireBtn = document.querySelector<HTMLElement>('#touch-fire');
  if (fireBtn) {
    fireBtn.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      requestFire();
    });
  }
}

function renderGameToText() {
  const t = state.tanks[state.currentTank];
  const payload = {
    coordinateSystem: 'origin=(0,0) top-left, +x right, +y down',
    mode: state.mode,
    phase: state.phase,
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
      weapon: weapons[clamp(tank.weaponIdx, 0, weapons.length - 1)]?.name ?? '?',
    })),
    projectile: state.projectile.active
      ? {
          x: state.projectile.x,
          y: state.projectile.y,
          vx: state.projectile.vx,
          vy: state.projectile.vy,
        }
      : null,
    current: t
      ? {
          aimDeg: t.aimDeg,
          power: t.power,
          weapon: weapons[clamp(t.weaponIdx, 0, weapons.length - 1)]?.name ?? '?',
        }
      : null,
    ui: {
      modal: ui.modal,
      touchEnabled: ui.touchEnabled,
      touchLayout: ui.touchLayout,
      cameraIntensity: ui.cameraIntensity,
    },
    camera: {
      offsetX: state.camera.offsetX,
      offsetY: state.camera.offsetY,
      zoom: state.camera.zoom,
      shakeTimeLeft: state.camera.shakeTimeLeft,
      cueTimeLeft: state.camera.cueTimeLeft,
    },
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
  for (let i = 0; i < steps; i++) {
    tick(dt);
    tickCamera(dt);
  }
  updateHud();
  syncUi();
  draw();
};

function frame(now: number) {
  const prev = (frame as unknown as { prev?: number }).prev ?? now;
  (frame as unknown as { prev?: number }).prev = now;
  const dt = clamp((now - prev) / 1000, 0, 0.05);
  tick(dt);
  tickCamera(dt);
  updateHud();
  syncUi();
  draw();
  requestAnimationFrame(frame);
}

bindTouchControls();

// Initial state
regenTerrain();
initTanks();
updateHud();
syncUi();
draw();
requestAnimationFrame(frame);
