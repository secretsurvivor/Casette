declare module 'shaka-player/dist/shaka-player.ui' {
  export = shaka;
}

declare namespace shaka {
  function polyfill(): void;
  namespace polyfill {
    function installAll(): void;
  }

  class Player {
    constructor();
    attach(mediaElement: HTMLMediaElement): Promise<void>;
    configure(config: object): void;
    load(uri: string): Promise<void>;
    unload(): Promise<void>;
    destroy(): Promise<void>;
    getMediaElement(): HTMLMediaElement;
    isLive(): boolean;
    seekRange(): { start: number; end: number };
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
  }

  namespace ui {
    class Overlay {
      constructor(player: Player, container: HTMLElement, video: HTMLMediaElement);
      configure(config: object): void;
      getControls(): Controls;
      destroy(): Promise<void>;
    }

    class Controls {
      getPlayer(): Player;
      getVideo(): HTMLMediaElement;
      getVideoContainer(): HTMLElement;
      addEventListener(type: string, listener: (event: any) => void): void;
    }
  }

  namespace cast {
    class CastProxy {
      constructor(video: HTMLMediaElement, player: Player, receiverAppId: string);
      destroy(): Promise<void>;
      canCast(): boolean;
      isCasting(): boolean;
      cast(): Promise<void>;
      suggestDisconnect(): void;
      addEventListener(type: string, listener: (event: any) => void): void;
    }
  }
}
