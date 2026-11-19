/**
 * YouTube's IFrame Player API (https://developers.google.com/youtube/iframe_api_reference), loaded once
 * in the browser. No Data API and no key: the players report their own state and position, which is all
 * the watch tracking needs. Only the bits this site calls are typed.
 */

export const PLAYING = 1;
export const ENDED = 0;
export const PAUSED = 2;
export const BUFFERING = 3;

export type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  pauseVideo(): void;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: { target: YTPlayer }) => void; onStateChange?: (e: { data: number; target: YTPlayer }) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ready: Promise<YTNamespace> | null = null;

export function loadYouTube(): Promise<YTNamespace> {
  ready ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const before = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      before?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      ready = null;
      reject(new Error("YouTube's player didn't load."));
    };
    document.head.appendChild(script);
  });
  return ready;
}
