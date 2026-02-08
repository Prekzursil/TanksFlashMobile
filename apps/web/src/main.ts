import "./style.css";
import { DEFAULT_STAGE_SIZE, DEFAULT_SWF_URL, STORAGE_KEYS } from "./config";
import { createInputMapper } from "./input";
import { createTouchControls, type TouchPreset } from "./touchControls";
import { computeStageLayout, type ScaleMode } from "./viewport";

type LoadState = "idle" | "loading" | "ready" | "error";
type SwfSource =
  | { type: "none" }
  | { type: "url"; url: string }
  | { type: "file"; name: string; url: string };

const state: {
  loadState: LoadState;
  swf: SwfSource;
  scaleMode: ScaleMode;
  isFullscreen: boolean;
  touchEnabled: boolean;
  touchPreset: TouchPreset;
  lastError: string | null;
} = {
  loadState: "idle",
  swf: { type: "none" },
  scaleMode: (localStorage.getItem(STORAGE_KEYS.scaleMode) as ScaleMode) ?? "fit",
  isFullscreen: Boolean(document.fullscreenElement),
  touchEnabled: false,
  touchPreset: (localStorage.getItem(STORAGE_KEYS.touchPreset) as TouchPreset) ?? "compact",
  lastError: null,
};

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
        <label class="field">
          <span class="label">Scale</span>
          <select id="scaleMode">
            <option value="fit">Fit</option>
            <option value="fill">Fill</option>
            <option value="integer">Integer</option>
          </select>
        </label>

        <button id="fullscreenBtn" type="button" class="btn">Fullscreen</button>
        <label class="field">
          <span class="label">Touch</span>
          <input id="touchEnabled" type="checkbox" />
        </label>
        <label class="field" id="touchPresetField">
          <span class="label">Preset</span>
          <select id="touchPreset">
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
          </select>
        </label>
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
const scaleSelect = required<HTMLSelectElement>("#scaleMode");
const fullscreenBtn = required<HTMLButtonElement>("#fullscreenBtn");
const touchEnabledEl = required<HTMLInputElement>("#touchEnabled");
const touchPresetField = required<HTMLLabelElement>("#touchPresetField");
const touchPresetEl = required<HTMLSelectElement>("#touchPreset");
const loadFileBtn = required<HTMLButtonElement>("#loadFileBtn");
const fileInput = required<HTMLInputElement>("#fileInput");

let playerEl: RufflePlayerElement | null = null;
let lastObjectUrl: string | null = null;
const inputMapper = createInputMapper(() => {
  const targets: (Window | Document | HTMLElement)[] = [window, document];
  if (playerEl) targets.push(playerEl);
  return targets;
});
const touchControls = createTouchControls(inputMapper);
viewport.appendChild(touchControls.el);

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

scaleSelect.value = state.scaleMode;
resizeStage();
updateFullscreenState();

function detectDefaultTouchEnabled(): boolean {
  const persisted = localStorage.getItem(STORAGE_KEYS.touchEnabled);
  if (persisted === "1") return true;
  if (persisted === "0") return false;
  return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
}

state.touchEnabled = detectDefaultTouchEnabled();
touchEnabledEl.checked = state.touchEnabled;
touchPresetEl.value = state.touchPreset;
touchPresetField.style.display = state.touchEnabled ? "" : "none";
touchControls.setEnabled(state.touchEnabled);
touchControls.setPreset(state.touchPreset);

scaleSelect.addEventListener("change", () => {
  state.scaleMode = scaleSelect.value as ScaleMode;
  localStorage.setItem(STORAGE_KEYS.scaleMode, state.scaleMode);
  resizeStage();
});

fullscreenBtn.addEventListener("click", () => {
  void toggleFullscreen();
});

touchEnabledEl.addEventListener("change", () => {
  state.touchEnabled = Boolean(touchEnabledEl.checked);
  localStorage.setItem(STORAGE_KEYS.touchEnabled, state.touchEnabled ? "1" : "0");
  touchPresetField.style.display = state.touchEnabled ? "" : "none";
  touchControls.setEnabled(state.touchEnabled);
});

touchPresetEl.addEventListener("change", () => {
  state.touchPreset = touchPresetEl.value as TouchPreset;
  localStorage.setItem(STORAGE_KEYS.touchPreset, state.touchPreset);
  touchControls.setPreset(state.touchPreset);
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
  const target = ev.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  ev.preventDefault();
  void toggleFullscreen();
});

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
    touch: {
      enabled: state.touchEnabled,
      preset: state.touchPreset,
    },
    lastError: state.lastError,
  });

setStatus("Ready. Attempting to load default SWF…");
void tryAutoLoadDefaultSwf();
