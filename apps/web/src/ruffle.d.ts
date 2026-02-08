export {};

declare global {
  type RufflePlayerElement = HTMLElement & {
    ruffle: () => {
      load: (options: string | { url: string }) => unknown;
    };
  };

  type RuffleApi = {
    createPlayer: () => RufflePlayerElement;
  };

  interface Window {
    RufflePlayer?: {
      newest: () => RuffleApi;
      config?: Record<string, unknown>;
    };
    render_game_to_text?: () => string;
  }
}

