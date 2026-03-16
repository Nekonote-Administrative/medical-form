interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady?: (() => void) | null;
}

declare namespace YT {
  class Player {
    constructor(
      element: HTMLElement | string,
      options: {
        videoId?: string;
        width?: string | number;
        height?: string | number;
        playerVars?: Record<string, unknown>;
        events?: {
          onReady?: (event: { target: Player }) => void;
          onStateChange?: (event: OnStateChangeEvent) => void;
        };
      },
    );
    destroy(): void;
    getIframe(): HTMLIFrameElement;
  }

  interface OnStateChangeEvent {
    data: number;
    target: Player;
  }
}
