import { Injectable } from '@angular/core';

const VOLUME_KEY = 'casette_volume';

/**
 * Lightweight wrapper around Shaka Player + Shaka UI.
 * Shared between the main player and the admin marker editor.
 */
@Injectable({ providedIn: 'root' })
export class ShakaPlayerService {
  private static polyfilled = false;
  private shaka: any;

  private player: any | null = null;
  private ui: any | null = null;

  /** Lazily import shaka-player/dist/shaka-player.ui (which bundles the UI). */
  private async loadShaka(): Promise<any> {
    if (this.shaka) return this.shaka;
    this.shaka = await import('shaka-player/dist/shaka-player.ui');
    // Some bundlers export { default }
    if (this.shaka.default) this.shaka = this.shaka.default;
    if (!ShakaPlayerService.polyfilled) {
      this.shaka.polyfill.installAll();
      ShakaPlayerService.polyfilled = true;
    }
    return this.shaka;
  }

  /**
   * Initialise Shaka Player + UI on the given container / video elements.
   * Returns a handle with convenience methods.
   *
   * @param container  The outer <div data-shaka-player-container>
   * @param video      The <video data-shaka-player> inside it
   * @param options    Optional overrides (e.g. disable cast for admin editor)
   */
  async init(
    container: HTMLElement,
    video: HTMLVideoElement,
    options?: { disableCast?: boolean },
  ): Promise<ShakaHandle> {
    const shaka = await this.loadShaka();

    // Shaka v5: create player without mediaElement, then attach
    const player = new shaka.Player();
    await player.attach(video);

    const controlPanelElements = [
      'play_pause',
      'time_and_duration',
      'spacer',
      'volume',
      'mute',
      ...(options?.disableCast ? [] : ['cast']),
      'fullscreen',
    ];

    const ui = new shaka.ui.Overlay(player, container, video);
    ui.configure({
      controlPanelElements,
      addSeekBar: true,
      // Use Google's default media receiver for Chromecast
      castReceiverAppId: 'CC1AD845',
    });

    // Restore persisted volume
    const savedVol = sessionStorage.getItem(VOLUME_KEY);
    if (savedVol !== null) {
      const vol = parseFloat(savedVol);
      if (!isNaN(vol)) {
        video.volume = Math.max(0, Math.min(1, vol));
      }
    }

    // Persist volume on change
    video.addEventListener('volumechange', () => {
      sessionStorage.setItem(VOLUME_KEY, String(video.volume));
    });

    this.player = player;
    this.ui = ui;

    return { player, ui, video, container };
  }

  /** Tear down any active player + UI. */
  async destroy(): Promise<void> {
    try { await this.ui?.destroy(); } catch (_) {}
    try { await this.player?.destroy(); } catch (_) {}
    this.player = null;
    this.ui = null;
  }
}

export interface ShakaHandle {
  player: any;
  ui: any;
  video: HTMLVideoElement;
  container: HTMLElement;
}
