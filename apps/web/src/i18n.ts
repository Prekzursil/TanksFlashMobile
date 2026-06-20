export const STRINGS = {
  en: {
    app: {
      title: 'TANKS',
      subtitle: 'Flash revival (Ruffle wrapper)',
    },
    toolbar: {
      settings: 'Settings',
      help: 'Help',
      fullscreen: 'Fullscreen',
      loadSwf: 'Load SWF…',
    },
    common: {
      close: 'Close',
      enabled: 'Enable',
      disabled: 'Disabled.',
    },
    settings: {
      title: 'Settings',
      display: {
        title: 'Display',
        scale: 'Scale',
        uiScale: 'UI scale',
        uiScaleHint: 'Scales wrapper UI only (not the game canvas).',
        fullscreenTip: 'Tip: press',
        fullscreenTipSuffix: 'to toggle fullscreen.',
      },
      audio: {
        title: 'Audio',
        mute: 'Mute',
        volume: 'Volume',
      },
      touch: {
        title: 'Touch Controls',
        preset: 'Preset',
        presetCompact: 'Compact',
        presetComfortable: 'Comfortable',
        presetLeftHanded: 'Left-handed',
        presetTablet: 'Tablet',
        size: 'Size',
        opacity: 'Opacity',
        editLayout: 'Edit layout',
        resetLayout: 'Reset layout',
        editHint:
          'Enable “Edit layout”, close Settings, then drag the handles on the overlay to reposition controls.',
      },
      keybinds: {
        title: 'Keybinds',
        enableRemap: 'Enable remap',
        remapHint:
          'When enabled, the wrapper intercepts key presses and sends your mapped keys to the game. Disable if the SWF UI behaves oddly.',
        up: 'Up',
        down: 'Down',
        left: 'Left',
        right: 'Right',
        actionA: 'Action A',
        actionB: 'Action B',
        reset: 'Reset to defaults',
      },
      gamepad: {
        title: 'Gamepad',
        statusNotSupported: 'Gamepad not supported in this environment.',
        statusNoGamepad: 'No gamepad detected.',
        statusConnectedPrefix: 'Connected:',
        statusConnectedSuffixSingular: 'gamepad.',
        statusConnectedSuffixPlural: 'gamepads.',
        actionAButton: 'Action A button',
        actionBButton: 'Action B button',
        stickDeadzone: 'Stick deadzone',
        deadzoneHint: 'Higher = less jitter, but needs more stick travel to trigger movement.',
        mappingHint:
          'Mapping: D-pad/left stick = move. Action A = {actionA}. Action B = {actionB}.',
      },
      storage: {
        title: 'Storage',
        exportScope: 'Export scope',
        exportScopeTanks: 'Only tanks.* keys',
        exportScopeAll: 'All localStorage keys',
        export: 'Export',
        import: 'Import',
        clearWrapper: 'Clear wrapper settings',
        clearAll: 'Clear all site data (incl. saves)',
        hint: 'Export/import manages localStorage (wrapper settings). Clearing “all site data” also attempts to delete IndexedDB databases (where supported), which may remove game saves stored by Ruffle.',
      },
      debug: {
        title: 'Debug',
        enable: 'Enable',
        overlay: 'Overlay',
        copyDiagnostics: 'Copy diagnostics',
        downloadDiagnostics: 'Download diagnostics',
        downloadLogs: 'Download logs',
        clearLogs: 'Clear logs',
        hint: 'Diagnostics include wrapper settings + runtime info + recent wrapper logs. It does not include the SWF itself.',
      },
      about: {
        title: 'About',
        version: 'Wrapper version: {version}',
      },
    },
    help: {
      title: 'Controls & Tips',
      quickStart: {
        title: 'Quick Start',
        p1: 'This project is a wrapper around the original Flash game running inside Ruffle. The wrapper’s job is to provide clean input, scaling, and packaging across devices.',
        p2: 'If the game doesn’t load automatically, click',
        p2Suffix: 'and choose your .swf file.',
      },
      keyboard: {
        title: 'Keyboard',
        move: 'Move:',
        moveSuffix: 'keys (remappable in Settings)',
        actionA: 'Action A:',
        actionB: 'Action B:',
        fullscreen: 'Fullscreen:',
        note: 'If the SWF UI behaves oddly, try disabling “Enable remap” in Settings. When disabled, the wrapper won’t intercept keyboard events.',
      },
      touch: {
        title: 'Touch',
        p1: 'Enable the on-screen overlay in Settings → Touch Controls.',
        presets: 'Presets:',
        edit: 'Edit layout:',
        editSuffix: 'toggle “Edit layout”, close Settings, then drag the handles',
      },
      gamepad: {
        title: 'Gamepad',
        p1: 'Enable gamepad input in Settings → Gamepad.',
        move: 'Move:',
        moveSuffix: 'D-pad or left stick',
        actionA: 'Action A:',
        actionASuffix: 'configured in Settings → Gamepad',
        actionB: 'Action B:',
        actionBSuffix: 'configured in Settings → Gamepad',
        note: 'The wrapper uses the browser’s “standard” gamepad mapping when available. If your controller behaves strangely, try adjusting the button mapping and stick deadzone in Settings.',
      },
      troubleshooting: {
        title: 'Troubleshooting',
        stuck:
          'If inputs feel “stuck”, switch tabs/windows and come back (the wrapper releases all inputs on blur).',
        saves:
          'Saves are managed by Ruffle (typically via IndexedDB). Use Settings → Storage if you need to clear data.',
        bugReports: 'For bug reports, enable Settings → Debug and export diagnostics/logs.',
      },
    },
    status: {
      readyAutoLoad: 'Ready. Attempting to load default SWF…',
      loadingSwf: 'Loading SWF…',
      touchEditEnabled:
        'Touch layout edit mode enabled. Close Settings, then drag the handles to reposition controls.',
      touchLayoutReset: 'Touch layout reset.',
      importedWrapperKeysReloading: 'Imported {count} wrapper keys. Reloading…',
      clearedWrapperReloading: 'Cleared wrapper settings. Reloading…',
      clearingSiteData: 'Clearing site data…',
      reloading: 'Reloading…',
      reloadingWithNotes: '{notes}. Reloading…',
      diagnosticsCopied: 'Diagnostics copied to clipboard.',
      clipboardUnavailableDownloaded: 'Clipboard not available; downloaded diagnostics instead.',
    },
  },
} as const;

export type Locale = keyof typeof STRINGS;
export type Strings = (typeof STRINGS)[Locale];

export function getStrings(locale: Locale): Strings {
  return STRINGS[locale];
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value == null) return `{${key}}`;
    return String(value);
  });
}
