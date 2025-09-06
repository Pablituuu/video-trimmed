import { create } from 'zustand';
import type { VideoTransform } from '../types';

interface MainStore {
  file: File | undefined;
  transform: VideoTransform;
  loadError: string | undefined;
  video: HTMLVideoElement | undefined;

  // Actions
  setFile: (file: File | undefined) => void;
  setTransform: (transform: VideoTransform) => void;
  setLoadError: (error: string | undefined) => void;
  setVideo: (video: HTMLVideoElement | undefined) => void;
  reset: () => void;
  loadVideo: (file: File) => void;
}

export const useMainStore = create<MainStore>((set, get) => ({
  // State
  file: undefined,
  transform: {},
  loadError: undefined,
  video: undefined,

  // Actions
  setFile: file => set({ file }),
  setTransform: transform => set({ transform }),
  setLoadError: loadError => set({ loadError }),
  setVideo: video => set({ video }),

  reset: () => {
    const { video } = get();
    const newTransform = {};

    if (video) {
      video.pause();
      video.currentTime = 0.1;
    }

    set({ transform: newTransform });
  },

  loadVideo: async file => {
    const { video: currentVideo, reset } = get();

    currentVideo?.pause();
    set({
      video: undefined,
      file,
      loadError: undefined,
    });
    reset();

    const video = document.createElement('video');

    video.setAttribute('playsinline', '');
    video.preload = 'metadata';
    video.autoplay = false;
    video.crossOrigin = 'anonymous';

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = 0.01;
      set({ video });
    });

    video.addEventListener('error', () => {
      set({
        loadError:
          'Unable to load this video format. Please try a different file (MP4, WebM, etc.).',
      });
    });

    video.addEventListener('ended', () => {
      const { transform } = get();
      const start = transform.time?.[0] || 0;
      video.currentTime = start;
    });

    video.addEventListener('timeupdate', () => {
      const { transform } = get();
      const start = transform.time?.[0] || 0;
      const end = transform.time?.[1] || video.duration;

      if (video.currentTime > end) {
        video.currentTime = start;
      } else if (video.currentTime < start - 1) {
        video.currentTime = start;
      }
    });

    video.src = URL.createObjectURL(file);
  },
}));
