import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Helper: load videos from localStorage (files can't be persisted, only metadata)
const loadPersistedMeta = () => {
  try {
    const raw = localStorage.getItem('cheonan-video-meta');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const savePersistedMeta = (videos) => {
  const meta = {};
  videos.forEach((v) => {
    meta[v.id] = {
      inPoint: v.inPoint,
      outPoint: v.outPoint,
      name: v.name,
      duration: v.duration,
    };
  });
  localStorage.setItem('cheonan-video-meta', JSON.stringify(meta));
};

let idCounter = Date.now();
const nextId = () => String(++idCounter);

const useVideoStore = create((set, get) => ({
  videos: [],           // { id, name, url, duration, inPoint, outPoint }
  currentIndex: 0,
  snapshotCount: 10,

  addVideos: (fileList) => {
    const persisted = loadPersistedMeta();
    const newVideos = Array.from(fileList).map((file) => {
      const id = nextId();
      const url = URL.createObjectURL(file);
      const meta = persisted[file.name] || {};
      return {
        id,
        name: file.name,
        url,
        duration: 0,
        inPoint: meta.inPoint ?? null,
        outPoint: meta.outPoint ?? null,
      };
    });
    set((state) => {
      const videos = [...state.videos, ...newVideos];
      savePersistedMeta(videos);
      return { videos, currentIndex: state.videos.length > 0 ? state.currentIndex : 0 };
    });
  },

  removeCurrentVideo: () => {
    const { videos, currentIndex } = get();
    if (videos.length === 0) return;
    const newVideos = videos.filter((_, i) => i !== currentIndex);
    const newIndex = Math.min(currentIndex, newVideos.length - 1);
    savePersistedMeta(newVideos);
    set({ videos: newVideos, currentIndex: Math.max(0, newIndex) });
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  next: () => {
    const { videos, currentIndex } = get();
    if (currentIndex < videos.length - 1) set({ currentIndex: currentIndex + 1 });
  },

  setDuration: (id, duration) => {
    set((state) => ({
      videos: state.videos.map((v) => (v.id === id ? { ...v, duration } : v)),
    }));
  },

  setInPoint: (id, time) => {
    set((state) => {
      const videos = state.videos.map((v) => {
        if (v.id !== id) return v;
        const outPoint = v.outPoint !== null && time > v.outPoint ? null : v.outPoint;
        return { ...v, inPoint: time, outPoint };
      });
      savePersistedMeta(videos);
      return { videos };
    });
  },

  setOutPoint: (id, time) => {
    set((state) => {
      const videos = state.videos.map((v) => {
        if (v.id !== id) return v;
        const inPoint = v.inPoint !== null && time < v.inPoint ? null : v.inPoint;
        return { ...v, outPoint: time, inPoint };
      });
      savePersistedMeta(videos);
      return { videos };
    });
  },

  clearInOut: (id) => {
    set((state) => {
      const videos = state.videos.map((v) =>
        v.id === id ? { ...v, inPoint: null, outPoint: null } : v
      );
      savePersistedMeta(videos);
      return { videos };
    });
  },

  setSnapshotCount: (count) => {
    localStorage.setItem('cheonan-snapshot-count', String(count));
    set({ snapshotCount: count });
  },

  reorderVideos: (newVideos) => {
    set({ videos: newVideos });
    savePersistedMeta(newVideos);
  },

  initSnapshotCount: () => {
    const saved = localStorage.getItem('cheonan-snapshot-count');
    if (saved) set({ snapshotCount: Number(saved) });
  },
}));

export default useVideoStore;
