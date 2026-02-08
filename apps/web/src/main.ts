import "./style.css";
import { DEFAULT_STAGE_SIZE, DEFAULT_SWF_URL, STORAGE_KEYS } from "./config";
import { createLogBuffer, hookGlobalErrors, type LogLevel } from "./debug";
import { createGamepadInput } from "./gamepad";
import { format, getStrings } from "./i18n";
import { createInputMapper, type KeyCode } from "./input";
import { createTouchControls, type TouchLayout, type TouchPreset } from "./touchControls";
import { computeStageLayout, type ScaleMode } from "./viewport";

declare const __APP_VERSION__: string;

type LoadState = "idle" | "loading" | "ready" | "error";
type SwfSource =
  | { type: "none" }
  | { type: "url"; url: string }
  | { type: "file"; name: string; url: string };

type Keybinds = Record<KeyCode, string>;
type TouchLayouts = Partial<Record<TouchPreset, TouchLayout>>;

const S = getStrings("en");

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

const GAMEPAD_BUTTON_OPTIONS: { index: number; label: string }[] = [
  { index: 0, label: "Button 0 (Bottom / A / Cross)" },
  { index: 1, label: "Button 1 (Right / B / Circle)" },
  { index: 2, label: "Button 2 (Left / X / Square)" },
  { index: 3, label: "Button 3 (Top / Y / Triangle)" },
  { index: 4, label: "Button 4 (Left bumper)" },
  { index: 5, label: "Button 5 (Right bumper)" },
  { index: 6, label: "Button 6 (Left trigger)" },
  { index: 7, label: "Button 7 (Right trigger)" },
  { index: 8, label: "Button 8 (Back / Share)" },
  { index: 9, label: "Button 9 (Start / Options)" },
  { index: 10, label: "Button 10 (Left stick click)" },
  { index: 11, label: "Button 11 (Right stick click)" },
  { index: 12, label: "Button 12 (D-pad Up)" },
  { index: 13, label: "Button 13 (D-pad Down)" },
  { index: 14, label: "Button 14 (D-pad Left)" },
  { index: 15, label: "Button 15 (D-pad Right)" },
];

const GAMEPAD_BUTTON_LABELS = new Map(GAMEPAD_BUTTON_OPTIONS.map((o) => [o.index, o.label]));

function gamepadButtonLabel(index: number): string {
  return GAMEPAD_BUTTON_LABELS.get(index) ?? `Button ${index}`;
}

const PRESET_TOUCH_SIZE: Record<TouchPreset, number> = {
  compact: 56,
  comfortable: 72,
  leftHanded: 56,
  tablet: 80,
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const VALID_TOUCH_PRESETS = new Set<TouchPreset>([
  "compact",
  "comfortable",
  "leftHanded",
  "tablet",
]);

function defaultTouchLayout(): TouchLayout {
  return {
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  };
}

function parseTouchLayout(raw: unknown): TouchLayout | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const left = (raw as { left?: unknown }).left;
  const right = (raw as { right?: unknown }).right;
  if (typeof left !== "object" || left === null || Array.isArray(left)) return null;
  if (typeof right !== "object" || right === null || Array.isArray(right)) return null;

  const clampOffset = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    // Layout offsets are relative to screen CSS px; clamp to avoid absurd values.
    return clampInt(value, -5000, 5000);
  };

  const leftX = clampOffset((left as { x?: unknown }).x);
  const leftY = clampOffset((left as { y?: unknown }).y);
  const rightX = clampOffset((right as { x?: unknown }).x);
  const rightY = clampOffset((right as { y?: unknown }).y);
  if (leftX == null || leftY == null || rightX == null || rightY == null) return null;

  return { left: { x: leftX, y: leftY }, right: { x: rightX, y: rightY } };
}

function loadTouchPreset(): TouchPreset {
  const raw = localStorage.getItem(STORAGE_KEYS.touchPreset);
  if (!raw) return "compact";
  if (VALID_TOUCH_PRESETS.has(raw as TouchPreset)) return raw as TouchPreset;
  return "compact";
}

function loadTouchLayouts(): TouchLayouts {
  const raw = localStorage.getItem(STORAGE_KEYS.touchLayouts);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const out: TouchLayouts = {};
    for (const [preset, value] of Object.entries(parsed)) {
      if (!VALID_TOUCH_PRESETS.has(preset as TouchPreset)) continue;
      const layout = parseTouchLayout(value);
      if (layout) out[preset as TouchPreset] = layout;
    }
    return out;
  } catch {
    return {};
  }
}

function jsonDownload(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadInt(key: string, fallback: number, min: number, max: number) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clampInt(parsed, min, max);
}

function loadBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
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
  uiScale: number;
  isFullscreen: boolean;
  volume: number;
  gamepadEnabled: boolean;
  gamepadActionAButtonIndex: number;
  gamepadActionBButtonIndex: number;
  gamepadAxisDeadzone: number;
  touchEnabled: boolean;
  touchPreset: TouchPreset;
  touchSize: number;
  touchOpacity: number;
  touchEditing: boolean;
  touchLayouts: TouchLayouts;
  keyRemapEnabled: boolean;
  keybinds: Keybinds;
  debugEnabled: boolean;
  debugOverlay: boolean;
  lastError: string | null;
} = {
  loadState: "idle",
  swf: { type: "none" },
  scaleMode: (localStorage.getItem(STORAGE_KEYS.scaleMode) as ScaleMode) ?? "fit",
  uiScale: loadInt(STORAGE_KEYS.uiScale, 100, 80, 140),
  isFullscreen: Boolean(document.fullscreenElement),
  volume: loadInt(STORAGE_KEYS.volume, 100, 0, 100),
  gamepadEnabled: loadBool(STORAGE_KEYS.gamepadEnabled, true),
  gamepadActionAButtonIndex: loadInt(STORAGE_KEYS.gamepadActionAButton, 0, 0, 15),
  gamepadActionBButtonIndex: loadInt(STORAGE_KEYS.gamepadActionBButton, 1, 0, 15),
  gamepadAxisDeadzone: loadInt(STORAGE_KEYS.gamepadAxisDeadzone, 45, 20, 80),
  touchEnabled: false,
  touchPreset: loadTouchPreset(),
  touchSize: 56,
  touchOpacity: loadInt(STORAGE_KEYS.touchOpacity, 90, 20, 100),
  touchEditing: false,
  touchLayouts: loadTouchLayouts(),
  keyRemapEnabled: loadBool(STORAGE_KEYS.keyRemapEnabled, true),
  keybinds: loadKeybinds(),
  debugEnabled: loadBool(STORAGE_KEYS.debugEnabled, false),
  debugOverlay: loadBool(STORAGE_KEYS.debugOverlay, false),
  lastError: null,
};

state.touchSize = loadInt(
  STORAGE_KEYS.touchSize,
  PRESET_TOUCH_SIZE[state.touchPreset] ?? 56,
  40,
  96,
);

// Keep gamepad action buttons distinct by default to avoid accidental double-binding.
if (state.gamepadActionAButtonIndex === state.gamepadActionBButtonIndex) {
  state.gamepadActionBButtonIndex = state.gamepadActionAButtonIndex === 0 ? 1 : 0;
  localStorage.setItem(STORAGE_KEYS.gamepadActionBButton, String(state.gamepadActionBButtonIndex));
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root element");

function applyUiScale() {
  const scale = clampInt(state.uiScale, 80, 140) / 100;
  document.documentElement.style.setProperty("--ui-scale", String(scale));
}

applyUiScale();

app.innerHTML = `
  <div class="layout">
    <header class="topbar">
      <div class="brand">
        <div class="title">${S.app.title}</div>
        <div class="subtitle">${S.app.subtitle}</div>
      </div>

      <div class="toolbar">
        <button id="settingsBtn" type="button" class="btn">${S.toolbar.settings}</button>
        <button id="helpBtn" type="button" class="btn btnSecondary">${S.toolbar.help}</button>
        <button id="fullscreenBtn" type="button" class="btn">${S.toolbar.fullscreen}</button>
        <button id="loadFileBtn" type="button" class="btn">${S.toolbar.loadSwf}</button>
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
        <div class="dialogTitle">${S.settings.title}</div>
        <button id="settingsCloseBtn" type="button" class="btn btnSecondary">${S.common.close}</button>
      </div>

      <div class="dialogBody">
        <section class="panel">
          <div class="panelTitle">${S.settings.display.title}</div>
          <label class="field">
            <span class="label">${S.settings.display.scale}</span>
            <select id="scaleMode">
              <option value="fit">Fit</option>
              <option value="fill">Fill</option>
              <option value="integer">Integer</option>
            </select>
          </label>
          <label class="field rangeField">
            <span class="label">${S.settings.display.uiScale}</span>
            <input id="uiScale" type="range" min="80" max="140" step="5" />
            <span id="uiScaleValue" class="value"></span>
          </label>
          <div class="hint">${S.settings.display.uiScaleHint}</div>
          <div class="hint">${S.settings.display.fullscreenTip} <kbd>f</kbd> ${S.settings.display.fullscreenTipSuffix}</div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.settings.audio.title}</div>
          <label class="field">
            <span class="label">${S.settings.audio.mute}</span>
            <input id="mute" type="checkbox" />
          </label>

          <label class="field rangeField">
            <span class="label">${S.settings.audio.volume}</span>
            <input id="volume" type="range" min="0" max="100" step="1" />
            <span id="volumeValue" class="value"></span>
          </label>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.settings.touch.title}</div>

          <label class="field">
            <span class="label">${S.common.enabled}</span>
            <input id="touchEnabled" type="checkbox" />
          </label>

	          <div id="touchControlsFields" class="stack">
	            <label class="field">
	              <span class="label">${S.settings.touch.preset}</span>
	              <select id="touchPreset">
	                <option value="compact">${S.settings.touch.presetCompact}</option>
	                <option value="comfortable">${S.settings.touch.presetComfortable}</option>
	                <option value="leftHanded">${S.settings.touch.presetLeftHanded}</option>
	                <option value="tablet">${S.settings.touch.presetTablet}</option>
	              </select>
	            </label>

            <label class="field rangeField">
              <span class="label">${S.settings.touch.size}</span>
              <input id="touchSize" type="range" min="40" max="96" step="1" />
              <span id="touchSizeValue" class="value"></span>
            </label>

	            <label class="field rangeField">
	              <span class="label">${S.settings.touch.opacity}</span>
	              <input id="touchOpacity" type="range" min="20" max="100" step="1" />
	              <span id="touchOpacityValue" class="value"></span>
	            </label>

	            <label class="field">
	              <span class="label">${S.settings.touch.editLayout}</span>
	              <input id="touchEditLayout" type="checkbox" />
	            </label>

	            <div class="row rowWrap">
	              <button id="touchResetLayoutBtn" type="button" class="btn btnSecondary">
	                ${S.settings.touch.resetLayout}
	              </button>
	            </div>

	            <div class="hint">
	              ${S.settings.touch.editHint}
	            </div>
	          </div>
	        </section>

	        <section class="panel">
	          <div class="panelTitle">${S.settings.keybinds.title}</div>

	          <label class="field">
	            <span class="label">${S.settings.keybinds.enableRemap}</span>
	            <input id="keyRemapEnabled" type="checkbox" />
	          </label>
	          <div class="hint">
	            ${S.settings.keybinds.remapHint}
	          </div>

	          <div class="grid2">
	            <label class="field">
	              <span class="label">${S.settings.keybinds.up}</span>
	              <select id="keyUp"></select>
	            </label>
            <label class="field">
              <span class="label">${S.settings.keybinds.down}</span>
              <select id="keyDown"></select>
            </label>
            <label class="field">
              <span class="label">${S.settings.keybinds.left}</span>
              <select id="keyLeft"></select>
            </label>
            <label class="field">
              <span class="label">${S.settings.keybinds.right}</span>
              <select id="keyRight"></select>
            </label>
            <label class="field">
              <span class="label">${S.settings.keybinds.actionA}</span>
              <select id="keyA"></select>
            </label>
            <label class="field">
              <span class="label">${S.settings.keybinds.actionB}</span>
              <select id="keyB"></select>
            </label>
	          </div>

	          <div class="row">
	            <button id="resetKeybindsBtn" type="button" class="btn btnSecondary">
	              ${S.settings.keybinds.reset}
	            </button>
	          </div>
	        </section>

        <section class="panel">
          <div class="panelTitle">${S.settings.gamepad.title}</div>

          <label class="field">
            <span class="label">${S.common.enabled}</span>
            <input id="gamepadEnabled" type="checkbox" />
          </label>
          <div id="gamepadStatus" class="hint"></div>

          <div class="grid2">
            <label class="field">
              <span class="label">${S.settings.gamepad.actionAButton}</span>
              <select id="gamepadActionA"></select>
            </label>
            <label class="field">
              <span class="label">${S.settings.gamepad.actionBButton}</span>
              <select id="gamepadActionB"></select>
            </label>
          </div>

          <label class="field rangeField">
            <span class="label">${S.settings.gamepad.stickDeadzone}</span>
            <input id="gamepadDeadzone" type="range" min="20" max="80" step="5" />
            <span id="gamepadDeadzoneValue" class="value"></span>
          </label>
          <div class="hint">${S.settings.gamepad.deadzoneHint}</div>
          <div id="gamepadMappingHint" class="hint"></div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.settings.storage.title}</div>

          <label class="field">
            <span class="label">${S.settings.storage.exportScope}</span>
            <select id="storageExportScope">
              <option value="tanks">${S.settings.storage.exportScopeTanks}</option>
              <option value="all">${S.settings.storage.exportScopeAll}</option>
            </select>
          </label>

          <div class="row rowWrap">
            <button id="exportStorageBtn" type="button" class="btn btnSecondary">${S.settings.storage.export}</button>
            <button id="importStorageBtn" type="button" class="btn btnSecondary">${S.settings.storage.import}</button>
            <input
              id="importStorageInput"
              type="file"
              accept="application/json,.json"
              class="hidden"
            />
          </div>

          <div class="row rowWrap">
            <button id="clearWrapperBtn" type="button" class="btn btnDanger">
              ${S.settings.storage.clearWrapper}
            </button>
            <button id="clearAllBtn" type="button" class="btn btnDanger">
              ${S.settings.storage.clearAll}
            </button>
          </div>

          <div class="hint">
            ${S.settings.storage.hint}
          </div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.settings.about.title}</div>
          <div class="hint">${format(S.settings.about.version, { version: __APP_VERSION__ })}</div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.settings.debug.title}</div>

          <label class="field">
            <span class="label">${S.settings.debug.enable}</span>
            <input id="debugEnabled" type="checkbox" />
          </label>

          <label class="field">
            <span class="label">${S.settings.debug.overlay}</span>
            <input id="debugOverlay" type="checkbox" />
          </label>

          <div class="row rowWrap">
            <button id="copyDiagnosticsBtn" type="button" class="btn btnSecondary">
              ${S.settings.debug.copyDiagnostics}
            </button>
            <button id="downloadDiagnosticsBtn" type="button" class="btn btnSecondary">
              ${S.settings.debug.downloadDiagnostics}
            </button>
          </div>

          <div class="row rowWrap">
            <button id="downloadLogsBtn" type="button" class="btn btnSecondary">${S.settings.debug.downloadLogs}</button>
            <button id="clearLogsBtn" type="button" class="btn btnDanger">${S.settings.debug.clearLogs}</button>
          </div>

          <div id="logCounts" class="hint"></div>
          <div class="hint">
            ${S.settings.debug.hint}
          </div>
        </section>
      </div>
    </dialog>

    <dialog id="helpDialog" class="dialog">
      <div class="dialogHeader">
        <div class="dialogTitle">${S.help.title}</div>
        <button id="helpCloseBtn" type="button" class="btn btnSecondary">${S.common.close}</button>
      </div>

      <div class="dialogBody">
        <section class="panel">
          <div class="panelTitle">${S.help.quickStart.title}</div>
          <div class="helpText">
            <p>
              ${S.help.quickStart.p1}
            </p>
            <p>
              ${S.help.quickStart.p2} <strong>${S.toolbar.loadSwf}</strong> ${S.help.quickStart.p2Suffix}
            </p>
          </div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.help.keyboard.title}</div>
          <div class="helpText">
            <ul>
              <li>${S.help.keyboard.move} <kbd>Arrow</kbd> ${S.help.keyboard.moveSuffix}</li>
              <li>${S.help.keyboard.actionA} <kbd>Space</kbd></li>
              <li>${S.help.keyboard.actionB} <kbd>Enter</kbd></li>
              <li>${S.help.keyboard.fullscreen} <kbd>f</kbd></li>
            </ul>
            <p class="helpNote">
              ${S.help.keyboard.note}
            </p>
          </div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.help.touch.title}</div>
          <div class="helpText">
            <p>${S.help.touch.p1}</p>
            <ul>
              <li>${S.help.touch.presets} ${S.settings.touch.presetCompact} / ${S.settings.touch.presetComfortable} / ${S.settings.touch.presetLeftHanded} / ${S.settings.touch.presetTablet}</li>
              <li>${S.help.touch.edit} ${S.help.touch.editSuffix}</li>
            </ul>
          </div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.help.gamepad.title}</div>
          <div class="helpText">
            <p>${S.help.gamepad.p1}</p>
            <ul>
              <li>${S.help.gamepad.move} ${S.help.gamepad.moveSuffix}</li>
              <li>${S.help.gamepad.actionA} ${S.help.gamepad.actionASuffix}</li>
              <li>${S.help.gamepad.actionB} ${S.help.gamepad.actionBSuffix}</li>
            </ul>
            <p class="helpNote">
              ${S.help.gamepad.note}
            </p>
          </div>
        </section>

        <section class="panel">
          <div class="panelTitle">${S.help.troubleshooting.title}</div>
          <div class="helpText">
            <ul>
              <li>${S.help.troubleshooting.stuck}</li>
              <li>${S.help.troubleshooting.saves}</li>
              <li>${S.help.troubleshooting.bugReports}</li>
            </ul>
          </div>
        </section>
      </div>
    </dialog>

    <div id="debugOverlayEl" class="debugOverlay hidden" aria-hidden="true"></div>
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
const helpBtn = required<HTMLButtonElement>("#helpBtn");
const settingsDialog = required<HTMLDialogElement>("#settingsDialog");
const settingsCloseBtn = required<HTMLButtonElement>("#settingsCloseBtn");
const helpDialog = required<HTMLDialogElement>("#helpDialog");
const helpCloseBtn = required<HTMLButtonElement>("#helpCloseBtn");
const scaleSelect = required<HTMLSelectElement>("#scaleMode");
const uiScaleEl = required<HTMLInputElement>("#uiScale");
const uiScaleValueEl = required<HTMLSpanElement>("#uiScaleValue");
const fullscreenBtn = required<HTMLButtonElement>("#fullscreenBtn");
const touchEnabledEl = required<HTMLInputElement>("#touchEnabled");
const touchPresetEl = required<HTMLSelectElement>("#touchPreset");
const touchControlsFields = required<HTMLDivElement>("#touchControlsFields");
const touchSizeEl = required<HTMLInputElement>("#touchSize");
const touchSizeValueEl = required<HTMLSpanElement>("#touchSizeValue");
const touchOpacityEl = required<HTMLInputElement>("#touchOpacity");
const touchOpacityValueEl = required<HTMLSpanElement>("#touchOpacityValue");
const touchEditLayoutEl = required<HTMLInputElement>("#touchEditLayout");
const touchResetLayoutBtn = required<HTMLButtonElement>("#touchResetLayoutBtn");
const muteEl = required<HTMLInputElement>("#mute");
const volumeEl = required<HTMLInputElement>("#volume");
const volumeValueEl = required<HTMLSpanElement>("#volumeValue");
const gamepadEnabledEl = required<HTMLInputElement>("#gamepadEnabled");
const gamepadStatusEl = required<HTMLDivElement>("#gamepadStatus");
const gamepadActionAEl = required<HTMLSelectElement>("#gamepadActionA");
const gamepadActionBEl = required<HTMLSelectElement>("#gamepadActionB");
const gamepadDeadzoneEl = required<HTMLInputElement>("#gamepadDeadzone");
const gamepadDeadzoneValueEl = required<HTMLSpanElement>("#gamepadDeadzoneValue");
const gamepadMappingHintEl = required<HTMLDivElement>("#gamepadMappingHint");
const keyRemapEnabledEl = required<HTMLInputElement>("#keyRemapEnabled");
const keyUpEl = required<HTMLSelectElement>("#keyUp");
const keyDownEl = required<HTMLSelectElement>("#keyDown");
const keyLeftEl = required<HTMLSelectElement>("#keyLeft");
const keyRightEl = required<HTMLSelectElement>("#keyRight");
const keyAEl = required<HTMLSelectElement>("#keyA");
const keyBEl = required<HTMLSelectElement>("#keyB");
const resetKeybindsBtn = required<HTMLButtonElement>("#resetKeybindsBtn");
const storageExportScopeEl = required<HTMLSelectElement>("#storageExportScope");
const exportStorageBtn = required<HTMLButtonElement>("#exportStorageBtn");
const importStorageBtn = required<HTMLButtonElement>("#importStorageBtn");
const importStorageInput = required<HTMLInputElement>("#importStorageInput");
const clearWrapperBtn = required<HTMLButtonElement>("#clearWrapperBtn");
const clearAllBtn = required<HTMLButtonElement>("#clearAllBtn");
const debugEnabledEl = required<HTMLInputElement>("#debugEnabled");
const debugOverlayCheckboxEl = required<HTMLInputElement>("#debugOverlay");
const copyDiagnosticsBtn = required<HTMLButtonElement>("#copyDiagnosticsBtn");
const downloadDiagnosticsBtn = required<HTMLButtonElement>("#downloadDiagnosticsBtn");
const downloadLogsBtn = required<HTMLButtonElement>("#downloadLogsBtn");
const clearLogsBtn = required<HTMLButtonElement>("#clearLogsBtn");
const logCountsEl = required<HTMLDivElement>("#logCounts");
const debugOverlayEl = required<HTMLDivElement>("#debugOverlayEl");
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

function touchLayoutForPreset(preset: TouchPreset): TouchLayout {
  return state.touchLayouts[preset] ?? defaultTouchLayout();
}

let persistTouchLayoutsRaf = 0;
function schedulePersistTouchLayouts() {
  if (persistTouchLayoutsRaf) return;
  persistTouchLayoutsRaf = window.requestAnimationFrame(() => {
    persistTouchLayoutsRaf = 0;
    localStorage.setItem(STORAGE_KEYS.touchLayouts, JSON.stringify(state.touchLayouts));
  });
}

const touchControls = createTouchControls(inputMapper, {
  onLayoutChange(layout) {
    state.touchLayouts[state.touchPreset] = layout;
    schedulePersistTouchLayouts();
    scheduleDebugOverlayRender();
  },
});
viewport.appendChild(touchControls.el);

const logs = createLogBuffer(250);
function addLog(level: LogLevel, msg: string, data?: unknown) {
  logs.add(level, msg, data);
  const c = logs.counts();
  logCountsEl.textContent = `Logs: ${c.total} (errors ${c.error}, warnings ${c.warn})`;
  scheduleDebugOverlayRender();
}
hookGlobalErrors(addLog);

function currentGamepadSettings() {
  const press = clampInt(state.gamepadAxisDeadzone, 20, 80) / 100;
  const release = Math.max(0.05, Math.min(press - 0.01, press - 0.1));
  return {
    actionAButtonIndex: clampInt(state.gamepadActionAButtonIndex, 0, 15),
    actionBButtonIndex: clampInt(state.gamepadActionBButtonIndex, 0, 15),
    axisPressThreshold: press,
    axisReleaseThreshold: release,
  };
}

const gamepadInput = createGamepadInput(inputMapper, {
  log: addLog,
  onStatusChange: renderGamepadStatus,
  getSettings: currentGamepadSettings,
});
gamepadInput.setEnabled(state.gamepadEnabled);

let debugOverlayRaf = 0;
function scheduleDebugOverlayRender() {
  if (!(state.debugEnabled && state.debugOverlay)) return;
  if (debugOverlayRaf) return;
  debugOverlayRaf = window.requestAnimationFrame(() => {
    debugOverlayRaf = 0;
    renderDebugOverlay();
  });
}

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function renderDebugOverlay() {
  const visible = state.debugEnabled && state.debugOverlay;
  debugOverlayEl.classList.toggle("hidden", !visible);
  if (!visible) return;

  const counts = logs.counts();
  const swfLabel =
    state.swf.type === "url"
      ? state.swf.url
      : state.swf.type === "file"
        ? state.swf.name
        : "(none)";

  const lastErr = state.lastError ? truncate(state.lastError) : "-";
  debugOverlayEl.textContent = [
    "TANKS debug",
    `version: ${__APP_VERSION__}`,
    `load: ${state.loadState}`,
    `swf: ${swfLabel}`,
    `scale: ${state.scaleMode}  full: ${state.isFullscreen ? "yes" : "no"}`,
    `touch: ${state.touchEnabled ? "on" : "off"}  pad: ${state.gamepadEnabled ? "on" : "off"} (${gamepadInput.getConnectedCount()})  vol: ${state.volume}`,
    `logs: ${counts.total} (err ${counts.error}, warn ${counts.warn})`,
    `error: ${lastErr}`,
  ].join("\n");
}

function persistDebugSettings() {
  localStorage.setItem(STORAGE_KEYS.debugEnabled, state.debugEnabled ? "1" : "0");
  localStorage.setItem(STORAGE_KEYS.debugOverlay, state.debugOverlay ? "1" : "0");
}

function applyDebugUi() {
  debugEnabledEl.checked = state.debugEnabled;
  debugOverlayCheckboxEl.checked = state.debugOverlay;

  debugOverlayCheckboxEl.disabled = !state.debugEnabled;
  copyDiagnosticsBtn.disabled = !state.debugEnabled;
  downloadDiagnosticsBtn.disabled = !state.debugEnabled;
  downloadLogsBtn.disabled = !state.debugEnabled;
  clearLogsBtn.disabled = !state.debugEnabled;

  debugOverlayEl.classList.toggle("hidden", !(state.debugEnabled && state.debugOverlay));
  scheduleDebugOverlayRender();
}

// Init debug UI state
addLog("info", "wrapper.start", {
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  version: __APP_VERSION__,
});
applyDebugUi();

function openSettings() {
  if (!settingsDialog.open) settingsDialog.showModal();
}

function closeSettings() {
  if (settingsDialog.open) settingsDialog.close();
}

function openHelp() {
  if (!helpDialog.open) helpDialog.showModal();
}

function closeHelp() {
  if (helpDialog.open) helpDialog.close();
}

function isTextInputLike(el: EventTarget | null): boolean {
  const target = el as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function listLocalStorageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) keys.push(k);
  }
  keys.sort();
  return keys;
}

function tanksKeysOnly(entries: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) {
    if (k.startsWith("tanks.")) out[k] = v;
  }
  return out;
}

function readLocalStorage(scope: "tanks" | "all"): Record<string, string> {
  const keys = listLocalStorageKeys();
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (scope === "tanks" && !k.startsWith("tanks.")) continue;
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

function removeLocalStorageKeys(scope: "tanks" | "all") {
  if (scope === "all") {
    localStorage.clear();
    return;
  }
  for (const k of listLocalStorageKeys()) {
    if (k.startsWith("tanks.")) localStorage.removeItem(k);
  }
}

async function deleteIndexedDb(name: string): Promise<"ok" | "blocked" | "error"> {
  return await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve("ok");
    req.onerror = () => resolve("error");
    req.onblocked = () => resolve("blocked");
  });
}

async function clearSiteData() {
  sessionStorage.clear();
  localStorage.clear();

  const deleted: string[] = [];
  const blocked: string[] = [];
  const errors: string[] = [];

  const idbAny = indexedDB as unknown as { databases?: () => Promise<Array<{ name?: string }>> };
  if (typeof idbAny.databases === "function") {
    const dbs = await idbAny.databases();
    const names = dbs
      .map((d) => d.name)
      .filter((n): n is string => Boolean(n))
      .sort();

    for (const name of names) {
      const result = await deleteIndexedDb(name);
      if (result === "ok") deleted.push(name);
      else if (result === "blocked") blocked.push(name);
      else errors.push(name);
    }
  }

  return { deleted, blocked, errors };
}

function setStatus(message: string) {
  status.textContent = message;
}

function setError(message: string) {
  state.loadState = "error";
  state.lastError = message;
  setStatus(message);
  addLog("error", "wrapper.error", { message });
  scheduleDebugOverlayRender();
}

function setReady(message?: string) {
  state.loadState = "ready";
  state.lastError = null;
  if (message) setStatus(message);
  addLog("info", "wrapper.ready", { message: message ?? null });
  scheduleDebugOverlayRender();
}

function updateFullscreenState() {
  state.isFullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.textContent = state.isFullscreen ? "Exit Fullscreen" : "Fullscreen";
  scheduleDebugOverlayRender();
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
  scheduleDebugOverlayRender();
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
  setStatus(S.status.loadingSwf);
  addLog("info", "swf.load.start", {
    urlType: url.startsWith("blob:") ? "blob" : url.startsWith("http") ? "http" : "other",
    source: source.type === "file" ? { type: "file", name: source.name } : source,
  });

  try {
    const el = ensurePlayer();
    const result = el.ruffle().load(url);
    await Promise.resolve(result);
    state.swf = source;
    addLog("info", "swf.load.ok", { source: source.type });
    setReady(source.type === "file" ? `Loaded: ${source.name}` : `Loaded: ${url}`);
  } catch (err) {
    addLog("error", "swf.load.failed", { err: String(err) });
    setError(`Failed to load SWF: ${String(err)}`);
  }
}

async function tryAutoLoadDefaultSwf() {
  addLog("info", "swf.autoload.check", { url: DEFAULT_SWF_URL });
  try {
    const resp = await fetch(DEFAULT_SWF_URL, { method: "HEAD" });
    if (!resp.ok) {
      addLog("warn", "swf.autoload.missing", { url: DEFAULT_SWF_URL, status: resp.status });
      setError(
        [
          `Missing SWF at ${DEFAULT_SWF_URL}`,
          "Run `npm run sync:swf` from apps/web/ or use “Load SWF…” to select a file.",
        ].join(" — "),
      );
      return;
    }
  } catch {
    addLog("warn", "swf.autoload.check_failed", { url: DEFAULT_SWF_URL });
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
    addLog("info", "fullscreen.toggle", { from: Boolean(document.fullscreenElement) });
    if (!document.fullscreenElement) {
      await viewport.requestFullscreen?.({ navigationUI: "hide" } as unknown as FullscreenOptions);
    } else {
      await document.exitFullscreen?.();
    }
  } catch (err) {
    addLog("error", "fullscreen.failed", { err: String(err) });
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
touchControls.setLayout(touchLayoutForPreset(state.touchPreset));
touchControls.setEditMode(state.touchEditing);
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

function populateGamepadButtonSelect(select: HTMLSelectElement) {
  select.replaceChildren(
    ...GAMEPAD_BUTTON_OPTIONS.map((opt) => {
      const o = document.createElement("option");
      o.value = String(opt.index);
      o.textContent = opt.label;
      return o;
    }),
  );
}

function updateGamepadButtonSelectDisabledOptions() {
  const selects = [gamepadActionAEl, gamepadActionBEl];
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
  inputMapper.releaseAllFrom("keyboard");
  updateKeybindSelectDisabledOptions();
}

function lookupMappedKey(physicalCode: string): KeyCode | null {
  const entries = Object.entries(state.keybinds) as [KeyCode, string][];
  for (const [targetKey, srcCode] of entries) {
    if (srcCode === physicalCode) return targetKey;
  }
  return null;
}

function renderGamepadStatus() {
  const supported = gamepadInput.isSupported();
  gamepadEnabledEl.disabled = !supported;

  if (!supported) {
    gamepadStatusEl.textContent = S.settings.gamepad.statusNotSupported;
    return;
  }

  if (!state.gamepadEnabled) {
    gamepadStatusEl.textContent = S.common.disabled;
    return;
  }

  const count = gamepadInput.getConnectedCount();
  if (!count) {
    gamepadStatusEl.textContent = S.settings.gamepad.statusNoGamepad;
    return;
  }

  const suffix =
    count === 1
      ? S.settings.gamepad.statusConnectedSuffixSingular
      : S.settings.gamepad.statusConnectedSuffixPlural;
  gamepadStatusEl.textContent = `${S.settings.gamepad.statusConnectedPrefix} ${count} ${suffix}`;
}

function syncSettingsUi() {
  scaleSelect.value = state.scaleMode;
  uiScaleEl.value = String(state.uiScale);
  uiScaleValueEl.textContent = `${state.uiScale}%`;

  muteEl.checked = state.volume === 0;
  volumeEl.value = String(state.volume);
  volumeValueEl.textContent = `${state.volume}%`;

  gamepadEnabledEl.checked = state.gamepadEnabled;
  renderGamepadStatus();

  gamepadActionAEl.value = String(state.gamepadActionAButtonIndex);
  gamepadActionBEl.value = String(state.gamepadActionBButtonIndex);
  gamepadDeadzoneEl.value = String(state.gamepadAxisDeadzone);
  gamepadDeadzoneValueEl.textContent = `${state.gamepadAxisDeadzone}%`;

  const gamepadSupported = gamepadInput.isSupported();
  gamepadActionAEl.disabled = !gamepadSupported;
  gamepadActionBEl.disabled = !gamepadSupported;
  gamepadDeadzoneEl.disabled = !gamepadSupported;
  gamepadMappingHintEl.textContent = format(S.settings.gamepad.mappingHint, {
    actionA: gamepadButtonLabel(state.gamepadActionAButtonIndex),
    actionB: gamepadButtonLabel(state.gamepadActionBButtonIndex),
  });
  updateGamepadButtonSelectDisabledOptions();

  touchEnabledEl.checked = state.touchEnabled;
  touchControlsFields.style.display = state.touchEnabled ? "" : "none";

  touchPresetEl.value = state.touchPreset;
  touchSizeEl.value = String(state.touchSize);
  touchSizeValueEl.textContent = `${state.touchSize}px`;
  touchOpacityEl.value = String(state.touchOpacity);
  touchOpacityValueEl.textContent = `${state.touchOpacity}%`;

  touchEditLayoutEl.checked = state.touchEditing;
  touchEditLayoutEl.disabled = !state.touchEnabled;
  touchResetLayoutBtn.disabled = !state.touchEnabled;

  keyRemapEnabledEl.checked = state.keyRemapEnabled;

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

populateGamepadButtonSelect(gamepadActionAEl);
populateGamepadButtonSelect(gamepadActionBEl);

syncSettingsUi();

scaleSelect.addEventListener("change", () => {
  state.scaleMode = scaleSelect.value as ScaleMode;
  localStorage.setItem(STORAGE_KEYS.scaleMode, state.scaleMode);
  resizeStage();
});

uiScaleEl.addEventListener("input", () => {
  state.uiScale = clampInt(Number(uiScaleEl.value), 80, 140);
  localStorage.setItem(STORAGE_KEYS.uiScale, String(state.uiScale));
  applyUiScale();
  syncSettingsUi();
});

fullscreenBtn.addEventListener("click", () => {
  void toggleFullscreen();
});

settingsBtn.addEventListener("click", () => openSettings());
settingsCloseBtn.addEventListener("click", () => closeSettings());
settingsDialog.addEventListener("click", (ev) => {
  if (ev.target === settingsDialog) closeSettings();
});

helpBtn.addEventListener("click", () => openHelp());
helpCloseBtn.addEventListener("click", () => closeHelp());
helpDialog.addEventListener("click", (ev) => {
  if (ev.target === helpDialog) closeHelp();
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

gamepadEnabledEl.addEventListener("change", () => {
  state.gamepadEnabled = Boolean(gamepadEnabledEl.checked);
  localStorage.setItem(STORAGE_KEYS.gamepadEnabled, state.gamepadEnabled ? "1" : "0");
  addLog("info", "gamepad.enabled", { enabled: state.gamepadEnabled });
  gamepadInput.setEnabled(state.gamepadEnabled);
  syncSettingsUi();
});

gamepadActionAEl.addEventListener("change", () => {
  state.gamepadActionAButtonIndex = clampInt(Number(gamepadActionAEl.value), 0, 15);
  localStorage.setItem(STORAGE_KEYS.gamepadActionAButton, String(state.gamepadActionAButtonIndex));
  addLog("info", "gamepad.map.actionA", { index: state.gamepadActionAButtonIndex });
  updateGamepadButtonSelectDisabledOptions();
  syncSettingsUi();
});

gamepadActionBEl.addEventListener("change", () => {
  state.gamepadActionBButtonIndex = clampInt(Number(gamepadActionBEl.value), 0, 15);
  localStorage.setItem(STORAGE_KEYS.gamepadActionBButton, String(state.gamepadActionBButtonIndex));
  addLog("info", "gamepad.map.actionB", { index: state.gamepadActionBButtonIndex });
  updateGamepadButtonSelectDisabledOptions();
  syncSettingsUi();
});

gamepadDeadzoneEl.addEventListener("input", () => {
  state.gamepadAxisDeadzone = clampInt(Number(gamepadDeadzoneEl.value), 20, 80);
  localStorage.setItem(STORAGE_KEYS.gamepadAxisDeadzone, String(state.gamepadAxisDeadzone));
  addLog("info", "gamepad.deadzone", { deadzone: state.gamepadAxisDeadzone });
  syncSettingsUi();
});

touchEnabledEl.addEventListener("change", () => {
  state.touchEnabled = Boolean(touchEnabledEl.checked);
  localStorage.setItem(STORAGE_KEYS.touchEnabled, state.touchEnabled ? "1" : "0");
  touchControls.setEnabled(state.touchEnabled);
  if (!state.touchEnabled && state.touchEditing) {
    state.touchEditing = false;
    touchControls.setEditMode(false);
  }
  syncSettingsUi();
});

touchPresetEl.addEventListener("change", () => {
  state.touchPreset = touchPresetEl.value as TouchPreset;
  localStorage.setItem(STORAGE_KEYS.touchPreset, state.touchPreset);
  state.touchSize = PRESET_TOUCH_SIZE[state.touchPreset] ?? state.touchSize;
  localStorage.setItem(STORAGE_KEYS.touchSize, String(state.touchSize));
  touchControls.setPreset(state.touchPreset);
  touchControls.setLayout(touchLayoutForPreset(state.touchPreset));
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

touchEditLayoutEl.addEventListener("change", () => {
  state.touchEditing = Boolean(touchEditLayoutEl.checked);
  touchControls.setEditMode(state.touchEditing);
  if (state.touchEditing) {
    setStatus(S.status.touchEditEnabled);
  }
  syncSettingsUi();
});

touchResetLayoutBtn.addEventListener("click", () => {
  state.touchLayouts[state.touchPreset] = defaultTouchLayout();
  schedulePersistTouchLayouts();
  touchControls.setLayout(touchLayoutForPreset(state.touchPreset));
  setStatus(S.status.touchLayoutReset);
});

keyRemapEnabledEl.addEventListener("change", () => {
  state.keyRemapEnabled = Boolean(keyRemapEnabledEl.checked);
  localStorage.setItem(STORAGE_KEYS.keyRemapEnabled, state.keyRemapEnabled ? "1" : "0");
  addLog("info", "keyremap.enabled", { enabled: state.keyRemapEnabled });
  inputMapper.releaseAllFrom("keyboard");
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
  inputMapper.releaseAllFrom("keyboard");
  syncSettingsUi();
});

exportStorageBtn.addEventListener("click", () => {
  const scope = storageExportScopeEl.value === "all" ? "all" : "tanks";
  addLog("info", "storage.export", { scope });
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    origin: window.location.origin,
    scope,
    note: "Export includes localStorage only (not IndexedDB).",
    localStorage: readLocalStorage(scope),
  };
  addLog("info", "storage.export.ok", { scope, keys: Object.keys(payload.localStorage).length });
  jsonDownload(payload, `tanks-storage-${scope}-${new Date().toISOString().slice(0, 19)}.json`);
});

importStorageBtn.addEventListener("click", () => {
  addLog("info", "storage.import.open", {});
  importStorageInput.value = "";
  importStorageInput.click();
});

importStorageInput.addEventListener("change", async () => {
  const file = importStorageInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const rawMap =
      typeof parsed === "object" && parsed !== null && "localStorage" in parsed
        ? (parsed as { localStorage?: unknown }).localStorage
        : parsed;

    if (typeof rawMap !== "object" || rawMap === null || Array.isArray(rawMap)) {
      throw new Error("Invalid import format. Expected { localStorage: { key: value } }.");
    }

    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawMap as Record<string, unknown>)) {
      if (typeof v === "string") entries[k] = v;
    }

    // Safety default: import wrapper keys only.
    removeLocalStorageKeys("tanks");
    const tanksOnly = tanksKeysOnly(entries);
    for (const [k, v] of Object.entries(tanksOnly)) localStorage.setItem(k, v);

    addLog("info", "storage.import.ok", { keys: Object.keys(tanksOnly).length });
    setStatus(
      format(S.status.importedWrapperKeysReloading, { count: Object.keys(tanksOnly).length }),
    );
    window.location.reload();
  } catch (err) {
    addLog("error", "storage.import.failed", { err: String(err) });
    setError(`Import failed: ${String(err)}`);
  }
});

clearWrapperBtn.addEventListener("click", () => {
  const ok = window.confirm("Clear wrapper settings (tanks.* keys) and reload?");
  if (!ok) return;
  addLog("warn", "storage.clear_wrapper", {});
  removeLocalStorageKeys("tanks");
  setStatus(S.status.clearedWrapperReloading);
  window.location.reload();
});

clearAllBtn.addEventListener("click", async () => {
  const ok = window.confirm(
    "Clear ALL site data (localStorage + IndexedDB where supported) and reload?\n\nThis may remove game saves.",
  );
  if (!ok) return;
  addLog("warn", "storage.clear_all", {});
  setStatus(S.status.clearingSiteData);
  try {
    const result = await clearSiteData();
    addLog("info", "storage.clear_all.ok", {
      deleted: result.deleted.length,
      blocked: result.blocked.length,
      errors: result.errors.length,
    });
    const noteParts = [
      result.deleted.length ? `Deleted DBs: ${result.deleted.length}` : null,
      result.blocked.length ? `Blocked DBs: ${result.blocked.length}` : null,
      result.errors.length ? `Failed DBs: ${result.errors.length}` : null,
    ].filter(Boolean);
    setStatus(
      noteParts.length
        ? format(S.status.reloadingWithNotes, { notes: noteParts.join(" — ") })
        : S.status.reloading,
    );
    window.location.reload();
  } catch (err) {
    addLog("error", "storage.clear_all.failed", { err: String(err) });
    setError(`Clear failed: ${String(err)}`);
  }
});

function safeJsonValue(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

async function listIndexedDbNames(): Promise<string[] | null> {
  const idbAny = indexedDB as unknown as { databases?: () => Promise<Array<{ name?: string }>> };
  if (typeof idbAny.databases !== "function") return null;
  try {
    const dbs = await idbAny.databases();
    return dbs
      .map((d) => d.name)
      .filter((n): n is string => Boolean(n))
      .sort();
  } catch {
    return null;
  }
}

async function collectDiagnostics() {
  const idbNames = await listIndexedDbNames();
  const hasRuffle = typeof window.RufflePlayer?.newest === "function";
  const ruffleConfig = safeJsonValue(window.RufflePlayer?.config ?? null);
  const logEntries = logs.snapshot();

  return {
    kind: "tanks-diagnostics",
    generatedAt: new Date().toISOString(),
    location: {
      href: window.location.href,
      origin: window.location.origin,
      protocol: window.location.protocol,
    },
    env: {
      appVersion: __APP_VERSION__,
      mode: import.meta.env.MODE,
      baseUrl: import.meta.env.BASE_URL,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
    },
    runtime: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: Array.isArray(navigator.languages) ? navigator.languages : [],
      deviceMemory:
        "deviceMemory" in navigator
          ? (navigator as unknown as { deviceMemory?: number }).deviceMemory
          : null,
      hardwareConcurrency: navigator.hardwareConcurrency,
    },
    display: {
      devicePixelRatio: window.devicePixelRatio,
      screen: { width: window.screen.width, height: window.screen.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      stage: {
        base: DEFAULT_STAGE_SIZE,
        cssPx: { width: stage.clientWidth, height: stage.clientHeight },
      },
    },
    wrapper: {
      loadState: state.loadState,
      swf: state.swf,
      scaleMode: state.scaleMode,
      uiScale: state.uiScale,
      isFullscreen: state.isFullscreen,
      volume: state.volume,
      gamepad: {
        supported: gamepadInput.isSupported(),
        enabled: state.gamepadEnabled,
        connected: gamepadInput.getConnectedCount(),
        mapping: {
          actionAButtonIndex: state.gamepadActionAButtonIndex,
          actionBButtonIndex: state.gamepadActionBButtonIndex,
          axisDeadzone: state.gamepadAxisDeadzone,
        },
      },
      pressed: inputMapper.snapshotPressed(),
      touch: {
        enabled: state.touchEnabled,
        preset: state.touchPreset,
        size: state.touchSize,
        opacity: state.touchOpacity,
        editing: state.touchEditing,
        layout: touchLayoutForPreset(state.touchPreset),
      },
      keyRemapEnabled: state.keyRemapEnabled,
      keybinds: state.keybinds,
      lastError: state.lastError,
      debug: { enabled: state.debugEnabled, overlay: state.debugOverlay },
    },
    ruffle: {
      hasRuffle,
      config: ruffleConfig,
    },
    storage: {
      localStorageWrapperKeys: listLocalStorageKeys().filter((k) => k.startsWith("tanks.")),
      indexedDbNames: idbNames,
    },
    logs: {
      counts: logs.counts(),
      entries: logEntries,
    },
  };
}

function diagnosticsFilename(prefix: string) {
  const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
  return `${prefix}-${stamp}.json`;
}

async function copyToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

debugEnabledEl.addEventListener("change", () => {
  state.debugEnabled = Boolean(debugEnabledEl.checked);
  persistDebugSettings();
  addLog("info", "debug.enabled", { enabled: state.debugEnabled });
  applyDebugUi();
});

debugOverlayCheckboxEl.addEventListener("change", () => {
  state.debugOverlay = Boolean(debugOverlayCheckboxEl.checked);
  persistDebugSettings();
  addLog("info", "debug.overlay", { overlay: state.debugOverlay });
  applyDebugUi();
});

copyDiagnosticsBtn.addEventListener("click", async () => {
  if (!state.debugEnabled) return;
  try {
    const payload = await collectDiagnostics();
    const text = JSON.stringify(payload, null, 2);
    const ok = await copyToClipboard(text);
    if (ok) {
      setStatus(S.status.diagnosticsCopied);
      addLog("info", "debug.diagnostics.copied", { bytes: text.length });
    } else {
      jsonDownload(payload, diagnosticsFilename("tanks-diagnostics"));
      setStatus(S.status.clipboardUnavailableDownloaded);
      addLog("warn", "debug.diagnostics.copy_failed", {});
    }
  } catch (err) {
    setError(`Diagnostics failed: ${String(err)}`);
    addLog("error", "debug.diagnostics.failed", { err: String(err) });
  }
});

downloadDiagnosticsBtn.addEventListener("click", async () => {
  if (!state.debugEnabled) return;
  try {
    const payload = await collectDiagnostics();
    jsonDownload(payload, diagnosticsFilename("tanks-diagnostics"));
    addLog("info", "debug.diagnostics.downloaded", {});
  } catch (err) {
    setError(`Diagnostics failed: ${String(err)}`);
    addLog("error", "debug.diagnostics.failed", { err: String(err) });
  }
});

downloadLogsBtn.addEventListener("click", () => {
  if (!state.debugEnabled) return;
  const payload = {
    kind: "tanks-logs",
    generatedAt: new Date().toISOString(),
    counts: logs.counts(),
    entries: logs.snapshot(),
  };
  jsonDownload(payload, diagnosticsFilename("tanks-logs"));
  addLog("info", "debug.logs.downloaded", {});
});

clearLogsBtn.addEventListener("click", () => {
  if (!state.debugEnabled) return;
  logs.clear();
  addLog("info", "debug.logs.cleared", {});
  applyDebugUi();
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

  addLog("info", "swf.file.selected", { name: file.name, size: file.size, type: file.type });
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
  if (!state.keyRemapEnabled) return;

  const mapped = lookupMappedKey(ev.code);
  if (!mapped) return;
  if (ev.code === "KeyF") return;

  ev.preventDefault();
  ev.stopPropagation();

  if (type === "down") inputMapper.pressFrom("keyboard", mapped);
  else inputMapper.releaseFrom("keyboard", mapped);
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
    uiScale: state.uiScale,
    isFullscreen: state.isFullscreen,
    volume: state.volume,
    gamepad: {
      supported: gamepadInput.isSupported(),
      enabled: state.gamepadEnabled,
      connected: gamepadInput.getConnectedCount(),
      mapping: {
        actionAButtonIndex: state.gamepadActionAButtonIndex,
        actionBButtonIndex: state.gamepadActionBButtonIndex,
        axisDeadzone: state.gamepadAxisDeadzone,
      },
    },
    pressed: inputMapper.snapshotPressed(),
    touch: {
      enabled: state.touchEnabled,
      preset: state.touchPreset,
      size: state.touchSize,
      opacity: state.touchOpacity,
      editing: state.touchEditing,
      layout: touchLayoutForPreset(state.touchPreset),
    },
    keyRemapEnabled: state.keyRemapEnabled,
    keybinds: state.keybinds,
    debug: {
      enabled: state.debugEnabled,
      overlay: state.debugOverlay,
      logs: logs.counts(),
    },
    lastError: state.lastError,
  });

setStatus(S.status.readyAutoLoad);
void tryAutoLoadDefaultSwf();
