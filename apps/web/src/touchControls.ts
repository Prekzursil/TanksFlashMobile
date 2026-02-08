import type { InputMapper, KeyCode } from "./input";

export type TouchPreset = "compact" | "comfortable";

export type TouchControls = {
  el: HTMLDivElement;
  setEnabled: (enabled: boolean) => void;
  setPreset: (preset: TouchPreset) => void;
};

type TouchButton = {
  id: string;
  label: string;
  code: KeyCode;
  className?: string;
};

const BUTTONS: TouchButton[] = [
  { id: "up", label: "▲", code: "ArrowUp" },
  { id: "left", label: "◀", code: "ArrowLeft" },
  { id: "down", label: "▼", code: "ArrowDown" },
  { id: "right", label: "▶", code: "ArrowRight" },
  { id: "a", label: "A", code: "Space", className: "action actionA" },
  { id: "b", label: "B", code: "Enter", className: "action actionB" },
];

function createButton(btn: TouchButton, input: InputMapper): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `touchBtn ${btn.className ?? ""}`.trim();
  el.textContent = btn.label;
  el.setAttribute("aria-label", btn.id);

  const activePointerIds = new Set<number>();

  function press(pointerId: number) {
    activePointerIds.add(pointerId);
    input.press(btn.code);
    el.dataset.pressed = "1";
  }

  function release(pointerId: number) {
    activePointerIds.delete(pointerId);
    if (activePointerIds.size === 0) {
      input.release(btn.code);
      delete el.dataset.pressed;
    }
  }

  el.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    el.setPointerCapture(ev.pointerId);
    press(ev.pointerId);
  });

  el.addEventListener("pointerup", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    release(ev.pointerId);
  });

  el.addEventListener("pointercancel", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    release(ev.pointerId);
  });

  el.addEventListener("lostpointercapture", () => {
    // Safety: if capture is lost mid-press, release the key.
    input.release(btn.code);
    delete el.dataset.pressed;
    activePointerIds.clear();
  });

  return el;
}

export function createTouchControls(input: InputMapper): TouchControls {
  const root = document.createElement("div");
  root.className = "touchOverlay";
  root.dataset.enabled = "0";
  root.dataset.preset = "compact";

  const leftCluster = document.createElement("div");
  leftCluster.className = "touchCluster clusterLeft";

  const dpad = document.createElement("div");
  dpad.className = "dpad";

  const btnUp = createButton(BUTTONS.find((b) => b.id === "up")!, input);
  const btnDown = createButton(BUTTONS.find((b) => b.id === "down")!, input);
  const btnLeft = createButton(BUTTONS.find((b) => b.id === "left")!, input);
  const btnRight = createButton(BUTTONS.find((b) => b.id === "right")!, input);

  btnUp.classList.add("dpadUp");
  btnDown.classList.add("dpadDown");
  btnLeft.classList.add("dpadLeft");
  btnRight.classList.add("dpadRight");

  dpad.append(btnUp, btnLeft, btnRight, btnDown);
  leftCluster.append(dpad);

  const rightCluster = document.createElement("div");
  rightCluster.className = "touchCluster clusterRight";

  const btnA = createButton(BUTTONS.find((b) => b.id === "a")!, input);
  const btnB = createButton(BUTTONS.find((b) => b.id === "b")!, input);
  rightCluster.append(btnA, btnB);

  root.append(leftCluster, rightCluster);

  return {
    el: root,
    setEnabled(enabled) {
      root.dataset.enabled = enabled ? "1" : "0";
      if (!enabled) input.releaseAll();
    },
    setPreset(preset) {
      root.dataset.preset = preset;
    },
  };
}
