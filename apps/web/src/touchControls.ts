import type { InputMapper, KeyCode } from "./input";

export type TouchPreset = "compact" | "comfortable" | "leftHanded" | "tablet";

export type TouchClusterId = "left" | "right";

export type TouchLayout = Record<TouchClusterId, { x: number; y: number }>;

export type TouchControls = {
  el: HTMLDivElement;
  setEnabled: (enabled: boolean) => void;
  setPreset: (preset: TouchPreset) => void;
  setEditMode: (editing: boolean) => void;
  setLayout: (layout: TouchLayout) => void;
  getLayout: () => TouchLayout;
};

export type TouchControlsOptions = {
  onLayoutChange?: (layout: TouchLayout) => void;
};

type TouchButton = {
  id: string;
  label: string;
  ariaLabel: string;
  code: KeyCode;
  className?: string;
};

type TouchButtonInstance = {
  el: HTMLButtonElement;
  cancel: () => void;
};

const BUTTONS: TouchButton[] = [
  { id: "up", label: "▲", ariaLabel: "Up", code: "ArrowUp" },
  { id: "left", label: "◀", ariaLabel: "Left", code: "ArrowLeft" },
  { id: "down", label: "▼", ariaLabel: "Down", code: "ArrowDown" },
  { id: "right", label: "▶", ariaLabel: "Right", code: "ArrowRight" },
  { id: "a", label: "A", ariaLabel: "Action A", code: "Space", className: "action actionA" },
  { id: "b", label: "B", ariaLabel: "Action B", code: "Enter", className: "action actionB" },
];

function defaultLayout(): TouchLayout {
  return {
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  };
}

function cloneLayout(layout: TouchLayout): TouchLayout {
  return {
    left: { x: layout.left.x, y: layout.left.y },
    right: { x: layout.right.x, y: layout.right.y },
  };
}

function createButton(
  btn: TouchButton,
  input: InputMapper,
  isEditing: () => boolean,
): TouchButtonInstance {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `touchBtn ${btn.className ?? ""}`.trim();
  el.textContent = btn.label;
  el.setAttribute("aria-label", btn.ariaLabel);
  el.setAttribute("aria-pressed", "false");

  const activePointerIds = new Set<number>();
  const sourceId = `touch:${btn.id}`;

  function press(pointerId: number) {
    activePointerIds.add(pointerId);
    input.pressFrom(sourceId, btn.code);
    el.dataset.pressed = "1";
    el.setAttribute("aria-pressed", "true");
  }

  function release(pointerId: number) {
    activePointerIds.delete(pointerId);
    if (activePointerIds.size === 0) {
      input.releaseFrom(sourceId, btn.code);
      delete el.dataset.pressed;
      el.setAttribute("aria-pressed", "false");
    }
  }

  function cancel() {
    for (const pointerId of activePointerIds) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    activePointerIds.clear();
    input.releaseFrom(sourceId, btn.code);
    delete el.dataset.pressed;
    el.setAttribute("aria-pressed", "false");
  }

  el.addEventListener("pointerdown", (ev) => {
    if (isEditing()) return;
    ev.preventDefault();
    ev.stopPropagation();
    el.setPointerCapture(ev.pointerId);
    press(ev.pointerId);
  });

  el.addEventListener("pointerup", (ev) => {
    if (isEditing()) return;
    ev.preventDefault();
    ev.stopPropagation();
    release(ev.pointerId);
  });

  el.addEventListener("pointercancel", (ev) => {
    if (isEditing()) return;
    ev.preventDefault();
    ev.stopPropagation();
    release(ev.pointerId);
  });

  el.addEventListener("lostpointercapture", () => {
    // Safety: if capture is lost mid-press, release the key.
    input.releaseFrom(sourceId, btn.code);
    delete el.dataset.pressed;
    el.setAttribute("aria-pressed", "false");
    activePointerIds.clear();
  });

  return { el, cancel };
}

export function createTouchControls(
  input: InputMapper,
  options: TouchControlsOptions = {},
): TouchControls {
  const root = document.createElement("div");
  root.className = "touchOverlay";
  root.dataset.enabled = "0";
  root.dataset.preset = "compact";
  root.dataset.editing = "0";

  let editing = false;
  let layout: TouchLayout = defaultLayout();

  function applyLayout() {
    const left = layout.left;
    const right = layout.right;
    leftCluster.style.transform = left.x || left.y ? `translate(${left.x}px, ${left.y}px)` : "";
    rightCluster.style.transform =
      right.x || right.y ? `translate(${right.x}px, ${right.y}px)` : "";
  }

  const leftCluster = document.createElement("div");
  leftCluster.className = "touchCluster clusterLeft";

  const leftHandle = document.createElement("button");
  leftHandle.type = "button";
  leftHandle.className = "touchDragHandle dragHandleLeft";
  leftHandle.textContent = "Drag";
  leftHandle.setAttribute("aria-label", "Drag D-pad");

  const dpad = document.createElement("div");
  dpad.className = "dpad";

  const isEditing = () => editing;

  const btnUp = createButton(BUTTONS.find((b) => b.id === "up")!, input, isEditing);
  const btnDown = createButton(BUTTONS.find((b) => b.id === "down")!, input, isEditing);
  const btnLeft = createButton(BUTTONS.find((b) => b.id === "left")!, input, isEditing);
  const btnRight = createButton(BUTTONS.find((b) => b.id === "right")!, input, isEditing);

  btnUp.el.classList.add("dpadUp");
  btnDown.el.classList.add("dpadDown");
  btnLeft.el.classList.add("dpadLeft");
  btnRight.el.classList.add("dpadRight");

  dpad.append(btnUp.el, btnLeft.el, btnRight.el, btnDown.el);
  leftCluster.append(leftHandle, dpad);

  const rightCluster = document.createElement("div");
  rightCluster.className = "touchCluster clusterRight";

  const rightHandle = document.createElement("button");
  rightHandle.type = "button";
  rightHandle.className = "touchDragHandle dragHandleRight";
  rightHandle.textContent = "Drag";
  rightHandle.setAttribute("aria-label", "Drag action buttons");

  const btnA = createButton(BUTTONS.find((b) => b.id === "a")!, input, isEditing);
  const btnB = createButton(BUTTONS.find((b) => b.id === "b")!, input, isEditing);
  rightCluster.append(rightHandle, btnA.el, btnB.el);

  root.append(leftCluster, rightCluster);

  const buttons: TouchButtonInstance[] = [btnUp, btnDown, btnLeft, btnRight, btnA, btnB];

  function cancelAllButtons() {
    for (const btn of buttons) btn.cancel();
  }

  function makeClusterDraggable(
    clusterId: TouchClusterId,
    clusterEl: HTMLDivElement,
    handleEl: HTMLButtonElement,
  ) {
    handleEl.addEventListener("pointerdown", (ev) => {
      if (!editing) return;
      ev.preventDefault();
      ev.stopPropagation();
      handleEl.setPointerCapture(ev.pointerId);

      const startPointer = { x: ev.clientX, y: ev.clientY };
      const startOffset = { ...layout[clusterId] };

      const overlayRect = root.getBoundingClientRect();
      const clusterRect = clusterEl.getBoundingClientRect();
      const margin = 8;

      function onMove(moveEv: PointerEvent) {
        if (!editing) return;
        if (moveEv.pointerId !== ev.pointerId) return;
        moveEv.preventDefault();
        moveEv.stopPropagation();

        const dxRaw = moveEv.clientX - startPointer.x;
        const dyRaw = moveEv.clientY - startPointer.y;

        const minDx = overlayRect.left + margin - clusterRect.left;
        const maxDx = overlayRect.right - margin - clusterRect.right;
        const minDy = overlayRect.top + margin - clusterRect.top;
        const maxDy = overlayRect.bottom - margin - clusterRect.bottom;

        const dx = Math.min(maxDx, Math.max(minDx, dxRaw));
        const dy = Math.min(maxDy, Math.max(minDy, dyRaw));

        const next = { x: Math.round(startOffset.x + dx), y: Math.round(startOffset.y + dy) };
        if (next.x === layout[clusterId].x && next.y === layout[clusterId].y) return;

        layout = { ...layout, [clusterId]: next };
        applyLayout();
        options.onLayoutChange?.(cloneLayout(layout));
      }

      function onEnd(endEv: PointerEvent) {
        if (endEv.pointerId !== ev.pointerId) return;
        handleEl.removeEventListener("pointermove", onMove);
        handleEl.removeEventListener("pointerup", onEnd);
        handleEl.removeEventListener("pointercancel", onEnd);
      }

      handleEl.addEventListener("pointermove", onMove);
      handleEl.addEventListener("pointerup", onEnd);
      handleEl.addEventListener("pointercancel", onEnd);
    });
  }

  makeClusterDraggable("left", leftCluster, leftHandle);
  makeClusterDraggable("right", rightCluster, rightHandle);

  return {
    el: root,
    setEnabled(enabled) {
      root.dataset.enabled = enabled ? "1" : "0";
      if (!enabled) {
        editing = false;
        root.dataset.editing = "0";
        cancelAllButtons();
      }
    },
    setPreset(preset) {
      root.dataset.preset = preset;
    },
    setEditMode(next) {
      editing = next;
      root.dataset.editing = editing ? "1" : "0";
      if (editing) {
        cancelAllButtons();
      }
    },
    setLayout(next) {
      layout = cloneLayout(next);
      applyLayout();
    },
    getLayout() {
      return cloneLayout(layout);
    },
  };
}
