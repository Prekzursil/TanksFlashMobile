export const DEFAULT_SWF_URL = `${import.meta.env.BASE_URL}original/tanks.swf`;

// The original SWF stage size varies by game; many Flash games are 4:3.
// We use this as a layout baseline for scaling modes.
export const DEFAULT_STAGE_SIZE = {
  width: 800,
  height: 600,
} as const;

export const STORAGE_KEYS = {
  scaleMode: "tanks.scaleMode",
  uiScale: "tanks.uiScale",
  touchEnabled: "tanks.touchEnabled",
  touchPreset: "tanks.touchPreset",
  touchLayouts: "tanks.touchLayouts",
  touchSize: "tanks.touchSize",
  touchOpacity: "tanks.touchOpacity",
  volume: "tanks.volume",
  gamepadEnabled: "tanks.gamepadEnabled",
  gamepadActionAButton: "tanks.gamepadActionAButton",
  gamepadActionBButton: "tanks.gamepadActionBButton",
  gamepadAxisDeadzone: "tanks.gamepadAxisDeadzone",
  keyRemapEnabled: "tanks.keyRemapEnabled",
  keybinds: "tanks.keybinds",
  debugEnabled: "tanks.debugEnabled",
  debugOverlay: "tanks.debugOverlay",
} as const;
