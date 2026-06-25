export type ScaleMode = "fit" | "fill" | "integer";

export type StageLayout = {
  width: number;
  height: number;
  scale: number;
};

function clampPositiveInt(value: number) {
  return Math.max(1, Math.floor(value));
}

export function computeStageLayout(params: {
  viewportWidth: number;
  viewportHeight: number;
  baseWidth: number;
  baseHeight: number;
  mode: ScaleMode;
}): StageLayout {
  const { viewportWidth, viewportHeight, baseWidth, baseHeight, mode } = params;

  const vw = Math.max(1, viewportWidth);
  const vh = Math.max(1, viewportHeight);
  const bw = Math.max(1, baseWidth);
  const bh = Math.max(1, baseHeight);

  const aspect = bw / bh;

  if (mode === "fill") {
    const width = Math.ceil(Math.max(vw, vh * aspect));
    const height = Math.ceil(width / aspect);
    const scale = width / bw;
    return { width, height, scale };
  }

  if (mode === "integer") {
    const maxScale = Math.min(vw / bw, vh / bh);
    if (maxScale >= 1) {
      const scaleInt = clampPositiveInt(maxScale);
      return { width: bw * scaleInt, height: bh * scaleInt, scale: scaleInt };
    }
    // If the viewport is smaller than the base stage, fall back to fit.
  }

  // fit
  const width = Math.floor(Math.min(vw, vh * aspect));
  const height = Math.floor(width / aspect);
  const scale = width / bw;
  return { width, height, scale };
}
