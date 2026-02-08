export const DEFAULT_SWF_URL = "/original/tanks.swf";

// The original SWF stage size varies by game; many Flash games are 4:3.
// We use this as a layout baseline for scaling modes.
export const DEFAULT_STAGE_SIZE = {
  width: 800,
  height: 600,
} as const;

export const STORAGE_KEYS = {
  scaleMode: "tanks.scaleMode",
  touchEnabled: "tanks.touchEnabled",
  touchPreset: "tanks.touchPreset",
} as const;
