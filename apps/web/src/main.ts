import "./style.css";
import { DEFAULT_STAGE_SIZE, DEFAULT_SWF_URL, STORAGE_KEYS } from "./config";
import { createInputMapper, type KeyCode } from "./input";
import { createTouchControls, type TouchPreset } from "./touchControls";
import { computeStageLayout, type ScaleMode } from "./viewport";

type LoadState = "idle" | "loading" | "ready" | "error";
type SwfSource =
  | { type: "none" }
  | { type: "url"; url: string }
  | { type: "file"; name: string; url: string };

type Keybinds = Record<KeyCode, string>;

const DEFAULT_KEYBINDS: Keybinds = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Space: "Space",
  Enter: "Enter",
};

const KEY_OPTIONS: { code: string; label: string }[] = [
  { code: "ArrowUp", label: "Arrow Up" },
  { code: "ArrowDown", label: "Arrow Down" },
  { code: "ArrowLeft", label: "Arrow Left" },
  { code: "ArrowRight", label: "Arrow Right" },
  { code: "KeyW", label: "W" },
  { code: "KeyA", label: "A" },
  { code: "KeyS", label: "S" },
  { code: "KeyD", label: "D" },
  { code: "KeyI", label: "I" },
  { code: "KeyJ", label: "J" },
  { code: "KeyK", label: "K" },
  { code: "KeyL", label: "L" },
  { code: "KeyZ", label: "Z" },
  { code: "KeyX", label: "X" },
  { code: "Space", label: "Space" },
  { code: "Enter", label: "Enter" },
];

const VALID_KEY_CODES = new Set(KEY_OPTIONS.map((o) => o.code));

const PRESET_TOUCH_SIZE: Record<TouchPreset, number> = {
  compact: 56,
  comfortable: 72,
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function loadInt(key: string, fallback: number, min: number, max: number) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clampInt(parsed, min, max);
}

function loadKeybinds(): Keybinds {
  const raw = localStorage.getItem(STORAGE_KEYS.keybinds);
  if (!raw) return { ...DEFAULT_KEYBINDS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<KeyCode, unknown>>;
    const next: Keybinds = { ...DEFAULT_KEYBINDS };
    (Object.keys(DEFAULT_KEYBINDS) as KeyCode[]).forEach((targetKey) => {
      const value = parsed[targetKey];
      if (typeof value === "string" && VALID_KEY_CODES.has(value)) {
        next[targetKey] = value;
      }
    });
    return next;
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

const state: {
  loadState: LoadState;
  swf: SwfSource;
  scaleMode: ScaleMode;
  isFullscreen: boolean;
  volume: number;
  touchEnabled: boolean;
  touchPreset: TouchPreset;
  touchSize: number;
  touchOpacity: number;
  keybinds: Keybinds;
  lastError: string | null;
} = {
  loadState: "idle",
  swf: { type: "none" },
  scaleMode: (localStorage.getItem(STORAGE_KEYS.scaleMode) as ScaleMode) ?? "fit",
  isFullscreen: Boolean(document.fullscreenElement),
  volume: loadInt(STORAGE_KEYS.volume, 100, 0, 100),
  touchEnabled: false,
  touchPreset: (localStorage.getItem(STORAGE_KEYS.touchPreset) as TouchPreset) ?? "compact",
  touchSize: 56,
  touchOpacity: loadInt(STORAGE_KEYS.touchOpacity, 90, 20, 100),
  keybinds: loadKeybinds(),
  lastError: null,
};

state.touchSize = loadInt(
  STORAGE_KEYS.touchSize,
  PRESET_TOUCH_SIZE[state.touchPreset] ?? 56,
  40,
  96,
);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root element");

app.innerHTML = `
  <div class="layout">
    <header class="topbar">
      <div class="brand">
        <div class="title">TANKS</div>
        <div class="subtitle">Flash revival (Ruffle wrapper)</div>
      </div>

      <div class="toolbar">
        <button id="settingsBtn" type="button" class="btn">Settings</button>
        <button id="fullscreenBtn" type="button" class="btn">Fullscreen</button>
        <button id="loadFileBtn" type="button" class="btn">Load SWF…</button>
        <input id="fileInput" type="file" accept=".swf" class="hidden" />
      </div>
    </header>

    <main class="main">
      <div id="viewport" class="viewport">
        <div id="stage" class="stage">
          <div id="playerContainer" class="playerContainer"></div>
        </div>
      </div>
      <div id="status" class="status" role="status" aria-live="polite"></div>
    </main>

    <dialog id="settingsDialog" class="dialog">
      <div class="dialogHeader">
        <div class="dialogTitle">Settings</div>
        <button id="settingsCloseBtn" type="button" class="btn btnSecondary">Close</button>
      </div>

      <div class="dialogBody">
        <section class="panel">
          <div class="panelTitle">Display</div>
          <label class="field">
            <span class="label">Scale</span>
            <select id="scaleMode">
              <option value="fit">Fit</option>
              <option value="fill">Fill</option>
              <option value="integer">Integer</option>
            </select>
          </label>
          <div class="hint">Tip: press <kbd>f</kbd> to toggle fullscreen.</div>
        </section>

        <section class="panel">
          <div class="panelTitle">Audio</div>
          <label class="field">
            <span class="label">Mute</span>
            <input id="mute" type="checkbox" />
          </label>

          <label class="field rangeField">
            <span class="label">Volume</span>
            <input id="volume" type="range" min="0" max="100" step="1" />
            <span id="volumeValue" class="value"></span>
          </label>
        </section>

        <section class="panel">
          <div class="panelTitle">Touch Controls</div>

          <label class="field">
            <span class="label">Enable</span>
            <input id="touchEnabled" type="checkbox" />
          </label>

          <div id="touchControlsFields" class="stack">
            <label class="field">
              <span class="label">Preset</span>
              <select id="touchPreset">
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </label>

            <label class="field rangeField">
              <span class="label">Size</span>
              <input id="touchSize" type="range" min="40" max="96" step="1" />
              <span id="touchSizeValue" class="value"></span>
            </label>

            <label class="field rangeField">
              <span class="label">Opacity</span>
              <input id="touchOpacity" type="range" min="20" max="100" step="1" />
              <span id="touchOpacityValue" class="value"></span>
            </label>
          </div>
        </section>

        <section class="panel">
          <div class="panelTitle">Keybinds</div>
          <div class="grid2">
            <label class="field">
              <span class="label">Up</span>
              <select id="keyUp"></select>
            </label>
            <label class="field">
              <span class="label">Down</span>
              <select id="keyDown"></select>
            </label>
            <label class="field">
              <span class="label">Left</span>
              <select id="keyLeft"></select>
            </label>
            <label class="field">
              <span class="label">Right</span>
              <select id="keyRight"></select>
            </label>
            <label class="field">
              <span class="label">Action A</span>
              <select id="keyA"></select>
            </label>
            <label class="field">
              <span class="label">Action B</span>
              <select id="keyB"></select>
            </label>
          </div>

          <div class="row">
            <button id="resetKeybindsBtn" type="button" class="btn btnSecondary">
              Reset to defaults
            </button>
          </div>
        </section>
      </div>
    </dialog>
  </div>
`;

function required<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing required element: ${selector}`);
  return el as T;
}

const viewport = required<HTMLDivElement>("#viewport");
const stage = required<HTMLDivElement>("#stage");
const playerContainer = required<HTMLDivElement>("#playerContainer");
const status = required<HTMLDivElement>("#status");
const settingsBtn = required<HTMLButtonElement>("#settingsBtn");
const settingsDialog = required<HTMLDialogElement>("#settingsDialog");
const settingsCloseBtn = required<HTMLButtonElement>("#settingsCloseBtn");
const scaleSelect = required<HTMLSelectElement>("#scaleMode");
const fullscreenBtn = required<HTMLButtonElement>("#fullscreenBtn");
const touchEnabledEl = required<HTMLInputElement>("#touchEnabled");
const touchPresetEl = required<HTMLSelectElement>("#touchPreset");
const touchControlsFields = required<HTMLDivElement>("#touchControlsFields");
const touchSizeEl = required<HTMLInputElement>("#touchSize");
const touchSizeValueEl = required<HTMLSpanElement>("#touchSizeValue");
const touchOpacityEl = required<HTMLInputElement>("#touchOpacity");
const touchOpacityValueEl = required<HTMLSpanElement>("#touchOpacityValue");
const muteEl = required<HTMLInputElement>("#mute");
const volumeEl = required<HTMLInputElement>("#volume");
const volumeValueEl = required<HTMLSpanElement>("#volumeValue");
const keyUpEl = required<HTMLSelectElement>("#keyUp");
const keyDownEl = required<HTMLSelectElement>("#keyDown");
const keyLeftEl = required<HTMLSelectElement>("#keyLeft");
const keyRightEl = required<HTMLSelectElement>("#keyRight");
const keyAEl = required<HTMLSelectElement>("#keyA");
const keyBEl = required<HTMLSelectElement>("#keyB");
const resetKeybindsBtn = required<HTMLButtonElement>("#resetKeybindsBtn");
const loadFileBtn = required<HTMLButtonElement>("#loadFileBtn");
const fileInput = required<HTMLInputElement>("#fileInput");

let playerEl: RufflePlayerElement | null = null;
let lastObjectUrl: string | null = null;
let lastNonZeroVolume = Math.max(1, state.volume);
const inputMapper = createInputMapper(() => {
  const targets: (Window | Document | HTMLElement)[] = [window, document];
  if (playerEl) targets.push(playerEl);
  return targets;
});
const touchControls = createTouchControls(inputMapper);
viewport.appendChild(touchControls.el);

function openSettings() {
  if (!settingsDialog.open) settingsDialog.showModal();
}

function closeSettings() {
  if (settingsDialog.open) settingsDialog.close();
}

function isTextInputLike(el: EventTarget | null): boolean {
  const target = el as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function setStatus(message: string) {
  status.textContent = message;
}

function setError(message: string) {
  state.loadState = "error";
  state.lastError = message;
  setStatus(message);
}

function setReady(message?: string) {
  state.loadState = "ready";
  state.lastError = null;
  if (message) setStatus(message);
}

function updateFullscreenState() {
  state.isFullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.textContent = state.isFullscreen ? "Exit Fullscreen" : "Fullscreen";
}

function resizeStage() {
  const layout = computeStageLayout({
    viewportWidth: viewport.clientWidth,
    viewportHeight: viewport.clientHeight,
    baseWidth: DEFAULT_STAGE_SIZE.width,
    baseHeight: DEFAULT_STAGE_SIZE.height,
    mode: state.scaleMode,
  });

  stage.style.width = `${layout.width}px`;
  stage.style.height = `${layout.height}px`;

  viewport.dataset.scaleMode = state.scaleMode;
}

function applyTouchStyle() {
  touchControls.el.style.setProperty("--touch-opacity", String(state.touchOpacity / 100));
  touchControls.el.style.setProperty("--touch-size", `${state.touchSize}px`);
  const gap = Math.max(8, Math.round(state.touchSize * 0.18));
  const font = Math.max(14, Math.round(state.touchSize * 0.32));
  touchControls.el.style.setProperty("--touch-gap", `${gap}px`);
  touchControls.el.style.setProperty("--touch-font", `${font}px`);
}

function applyVolume() {
  if (!playerEl) return;
  try {
    const vol = Math.min(1, Math.max(0, state.volume / 100));
    playerEl.volume = vol;
  } catch {
    // ignore
  }
}

function ensurePlayer(): RufflePlayerElement {
  if (playerEl) return playerEl;

  const ruffle = window.RufflePlayer?.newest?.();
  if (!ruffle) {
    throw new Error(
      "Ruffle runtime not found. Run `npm install` then `npm run dev` (it syncs Ruffle into /public/ruffle).",
    );
  }

  const el = ruffle.createPlayer();
  el.classList.add("rufflePlayer");
  playerContainer.replaceChildren(el);
  playerEl = el;
  applyVolume();
  return el;
}

async function loadSwfUrl(url: string, source: SwfSource) {
  state.loadState = "loading";
  state.lastError = null;
  setStatus(`Loading SWF…`);

  try {
    const el = ensurePlayer();
    const result = el.ruffle().load(url);
    await Promise.resolve(result);
    state.swf = source;
    setReady(source.type === "file" ? `Loaded: ${source.name}` : `Loaded: ${url}`);
  } catch (err) {
    setError(`Failed to load SWF: ${String(err)}`);
  }
}

async function tryAutoLoadDefaultSwf() {
  try {
    const resp = await fetch(DEFAULT_SWF_URL, { method: "HEAD" });
    if (!resp.ok) {
      setError(
        [
          `Missing SWF at ${DEFAULT_SWF_URL}`,
          "Run `npm run sync:swf` from apps/web/ or use “Load SWF…” to select a file.",
        ].join(" — "),
      );
      return;
    }
  } catch {
    setError(
      [`Could not check SWF at ${DEFAULT_SWF_URL}`, "Use “Load SWF…” to select a file."].join(
        " — ",
      ),
    );
    return;
  }

  await loadSwfUrl(DEFAULT_SWF_URL, { type: "url", url: DEFAULT_SWF_URL });
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await viewport.requestFullscreen?.({ navigationUI: "hide" } as unknown as FullscreenOptions);
    } else {
      await document.exitFullscreen?.();
    }
  } catch (err) {
    setError(`Fullscreen failed: ${String(err)}`);
  }
}

updateFullscreenState();
resizeStage();

function detectDefaultTouchEnabled(): boolean {
  const persisted = localStorage.getItem(STORAGE_KEYS.touchEnabled);
  if (persisted === "1") return true;
  if (persisted === "0") return false;
  return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
}

state.touchEnabled = detectDefaultTouchEnabled();
touchControls.setEnabled(state.touchEnabled);
touchControls.setPreset(state.touchPreset);
applyTouchStyle();

function persistKeybinds() {
  localStorage.setItem(STORAGE_KEYS.keybinds, JSON.stringify(state.keybinds));
}

function populateKeySelect(select: HTMLSelectElement) {
  select.replaceChildren(
    ...KEY_OPTIONS.map((opt) => {
      const o = document.createElement("option");
      o.value = opt.code;
      o.textContent = opt.label;
      return o;
    }),
  );
}

function updateKeybindSelectDisabledOptions() {
  const selects = [keyUpEl, keyDownEl, keyLeftEl, keyRightEl, keyAEl, keyBEl];
  const selected = new Map(selects.map((s) => [s, s.value]));

  for (const select of selects) {
    for (const option of select.options) {
      const usedByOther = [...selected.entries()].some(
        ([s, v]) => s !== select && v === option.value,
      );
      option.disabled = usedByOther;
    }
  }
}

function setKeybindValue(target: KeyCode, physicalCode: string) {
  if (!VALID_KEY_CODES.has(physicalCode)) return;
  state.keybinds[target] = physicalCode;
  persistKeybinds();
  inputMapper.releaseAll();
  updateKeybindSelectDisabledOptions();
}

function lookupMappedKey(physicalCode: string): KeyCode | null {
  const entries = Object.entries(state.keybinds) as [KeyCode, string][];
  for (const [targetKey, srcCode] of entries) {
    if (srcCode === physicalCode) return targetKey;
  }
  return null;
}

function syncSettingsUi() {
  scaleSelect.value = state.scaleMode;

  muteEl.checked = state.volume === 0;
  volumeEl.value = String(state.volume);
  volumeValueEl.textContent = `${state.volume}%`;

  touchEnabledEl.checked = state.touchEnabled;
  touchControlsFields.style.display = state.touchEnabled ? "" : "none";

  touchPresetEl.value = state.touchPreset;
  touchSizeEl.value = String(state.touchSize);
  touchSizeValueEl.textContent = `${state.touchSize}px`;
  touchOpacityEl.value = String(state.touchOpacity);
  touchOpacityValueEl.textContent = `${state.touchOpacity}%`;

  keyUpEl.value = state.keybinds.ArrowUp;
  keyDownEl.value = state.keybinds.ArrowDown;
  keyLeftEl.value = state.keybinds.ArrowLeft;
  keyRightEl.value = state.keybinds.ArrowRight;
  keyAEl.value = state.keybinds.Space;
  keyBEl.value = state.keybinds.Enter;

  updateKeybindSelectDisabledOptions();
}

populateKeySelect(keyUpEl);
populateKeySelect(keyDownEl);
populateKeySelect(keyLeftEl);
populateKeySelect(keyRightEl);
populateKeySelect(keyAEl);
populateKeySelect(keyBEl);

syncSettingsUi();

scaleSelect.addEventListener("change", () => {
  state.scaleMode = scaleSelect.value as ScaleMode;
  localStorage.setItem(STORAGE_KEYS.scaleMode, state.scaleMode);
  resizeStage();
});

fullscreenBtn.addEventListener("click", () => {
  void toggleFullscreen();
});

settingsBtn.addEventListener("click", () => openSettings());
settingsCloseBtn.addEventListener("click", () => closeSettings());
settingsDialog.addEventListener("click", (ev) => {
  if (ev.target === settingsDialog) closeSettings();
});

muteEl.addEventListener("change", () => {
  if (muteEl.checked) {
    if (state.volume > 0) lastNonZeroVolume = state.volume;
    state.volume = 0;
  } else {
    state.volume = lastNonZeroVolume || 80;
  }
  localStorage.setItem(STORAGE_KEYS.volume, String(state.volume));
  syncSettingsUi();
  applyVolume();
});

volumeEl.addEventListener("input", () => {
  const next = clampInt(Number(volumeEl.value), 0, 100);
  if (next > 0) lastNonZeroVolume = next;
  state.volume = next;
  localStorage.setItem(STORAGE_KEYS.volume, String(state.volume));
  syncSettingsUi();
  applyVolume();
});

touchEnabledEl.addEventListener("change", () => {
  state.touchEnabled = Boolean(touchEnabledEl.checked);
  localStorage.setItem(STORAGE_KEYS.touchEnabled, state.touchEnabled ? "1" : "0");
  touchControls.setEnabled(state.touchEnabled);
  syncSettingsUi();
});

touchPresetEl.addEventListener("change", () => {
  state.touchPreset = touchPresetEl.value as TouchPreset;
  localStorage.setItem(STORAGE_KEYS.touchPreset, state.touchPreset);
  state.touchSize = PRESET_TOUCH_SIZE[state.touchPreset] ?? state.touchSize;
  localStorage.setItem(STORAGE_KEYS.touchSize, String(state.touchSize));
  touchControls.setPreset(state.touchPreset);
  applyTouchStyle();
  syncSettingsUi();
});

touchSizeEl.addEventListener("input", () => {
  state.touchSize = clampInt(Number(touchSizeEl.value), 40, 96);
  localStorage.setItem(STORAGE_KEYS.touchSize, String(state.touchSize));
  applyTouchStyle();
  syncSettingsUi();
});

touchOpacityEl.addEventListener("input", () => {
  state.touchOpacity = clampInt(Number(touchOpacityEl.value), 20, 100);
  localStorage.setItem(STORAGE_KEYS.touchOpacity, String(state.touchOpacity));
  applyTouchStyle();
  syncSettingsUi();
});

keyUpEl.addEventListener("change", () => setKeybindValue("ArrowUp", keyUpEl.value));
keyDownEl.addEventListener("change", () => setKeybindValue("ArrowDown", keyDownEl.value));
keyLeftEl.addEventListener("change", () => setKeybindValue("ArrowLeft", keyLeftEl.value));
keyRightEl.addEventListener("change", () => setKeybindValue("ArrowRight", keyRightEl.value));
keyAEl.addEventListener("change", () => setKeybindValue("Space", keyAEl.value));
keyBEl.addEventListener("change", () => setKeybindValue("Enter", keyBEl.value));

resetKeybindsBtn.addEventListener("click", () => {
  state.keybinds = { ...DEFAULT_KEYBINDS };
  persistKeybinds();
  inputMapper.releaseAll();
  syncSettingsUi();
});

document.addEventListener("fullscreenchange", () => {
  updateFullscreenState();
  resizeStage();
});

window.addEventListener("resize", () => {
  resizeStage();
});

loadFileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
  lastObjectUrl = URL.createObjectURL(file);

  void loadSwfUrl(lastObjectUrl, { type: "file", name: file.name, url: lastObjectUrl });
});

document.addEventListener("keydown", (ev) => {
  if (ev.key.toLowerCase() !== "f") return;
  if (!ev.isTrusted) return;
  if (isTextInputLike(ev.target)) return;
  ev.preventDefault();
  void toggleFullscreen();
});

function handleRemapKey(ev: KeyboardEvent, type: "down" | "up") {
  if (!ev.isTrusted) return;
  if (isTextInputLike(ev.target)) return;

  const mapped = lookupMappedKey(ev.code);
  if (!mapped) return;
  if (ev.code === "KeyF") return;

  ev.preventDefault();
  ev.stopPropagation();

  if (type === "down") inputMapper.press(mapped);
  else inputMapper.release(mapped);
}

document.addEventListener(
  "keydown",
  (ev) => {
    handleRemapKey(ev, "down");
  },
  { capture: true },
);
document.addEventListener(
  "keyup",
  (ev) => {
    handleRemapKey(ev, "up");
  },
  { capture: true },
);

window.addEventListener("blur", () => {
  inputMapper.releaseAll();
});

window.render_game_to_text = () =>
  JSON.stringify({
    note: "Wrapper state only (SWF runs inside Ruffle).",
    loadState: state.loadState,
    swf: state.swf,
    scaleMode: state.scaleMode,
    isFullscreen: state.isFullscreen,
    volume: state.volume,
    touch: {
      enabled: state.touchEnabled,
      preset: state.touchPreset,
      size: state.touchSize,
      opacity: state.touchOpacity,
    },
    keybinds: state.keybinds,
    lastError: state.lastError,
  });

setStatus("Ready. Attempting to load default SWF…");
void tryAutoLoadDefaultSwf();
