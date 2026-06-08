import { useRef, useEffect, useState, useCallback } from 'react';
import useVideoStore from '../store/useVideoStore';

const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map((x) => String(x).padStart(2, '0')).join(':');
};

export default function VideoEditor({ onSnapshotsReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timelineRef = useRef(null);
  const isDragging = useRef(false);

  const { videos, currentIndex, snapshotCount, setCurrentIndex,
    setDuration, setInPoint, setOutPoint, clearInOut, prev, next,
    removeCurrentVideo, addVideos, setSnapshotCount } = useVideoStore();

  const current = videos[currentIndex];
  const [currentTime, setCurrentTime] = useState(0);
  const [snapshots, setSnapshots] = useState([]);
  const [snapsLoading, setSnapsLoading] = useState(false);

  // Load video when currentIndex changes
  useEffect(() => {
    if (!current || !videoRef.current) return;
    videoRef.current.src = current.url;
    videoRef.current.load();
    setCurrentTime(0);
    setSnapshots([]);
  }, [currentIndex, current?.id]);

  // Generate snapshots when duration known
  const generateSnapshots = useCallback(async () => {
    if (!current || !videoRef.current) return;
    const vid = videoRef.current;
    const dur = vid.duration;
    if (!isFinite(dur) || dur <= 0) return;

    setSnapsLoading(true);
    const count = 10;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    const snaps = [];

    for (let i = 0; i < count; i++) {
      const t = (dur / count) * i;
      await new Promise((res) => {
        vid.currentTime = t;
        const handler = () => { vid.removeEventListener('seeked', handler); res(); };
        vid.addEventListener('seeked', handler);
      });
      ctx.drawImage(vid, 0, 0, 160, 90);
      snaps.push({ time: t, dataUrl: canvas.toDataURL('image/jpeg', 0.7) });
    }

    vid.currentTime = 0;
    setSnapshots(snaps);
    setSnapsLoading(false);
    if (onSnapshotsReady) onSnapshotsReady(current.id, snaps);
  }, [current?.id, current?.url]);

  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid || !current) return;
    setDuration(current.id, vid.duration);
    generateSnapshots();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  // Timeline click/drag
  const seekFromEvent = (e) => {
    const vid = videoRef.current;
    const el = timelineRef.current;
    if (!vid || !el || !current) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    vid.currentTime = ratio * current.duration;
  };

  const handleTimelineMouseDown = (e) => { isDragging.current = true; seekFromEvent(e); };
  const handleTimelineMouseMove = (e) => { if (isDragging.current) seekFromEvent(e); };
  const handleTimelineMouseUp = () => { isDragging.current = false; };

  useEffect(() => {
    window.addEventListener('mouseup', handleTimelineMouseUp);
    return () => window.removeEventListener('mouseup', handleTimelineMouseUp);
  }, []);

  // Keyboard shortcuts — use e.code (раскладка не важна) + e.key toLowerCase
  useEffect(() => {
    const handler = (e) => {
      // Игнорируем поля ввода
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Снимаем фокус с видео чтобы пробел не вызывал play/pause браузера
      // но сначала получаем currentTime
      const t = videoRef.current?.currentTime ?? 0;

      // Используем e.code (не зависит от раскладки клавиатуры)
      // и e.key.toLowerCase() как запасной вариант
      const code = e.code; // KeyF, KeyI, KeyO, KeyR, KeyD
      const key = e.key.toLowerCase();

      if (code === 'KeyF' || key === 'f') {
        e.preventDefault();
        document.getElementById('file-input')?.click();
      } else if (code === 'KeyI' || key === 'i') {
        e.preventDefault();
        if (current) setInPoint(current.id, t);
      } else if (code === 'KeyO' || key === 'o') {
        e.preventDefault();
        if (current) setOutPoint(current.id, t);
      } else if (code === 'KeyR' || key === 'r') {
        e.preventDefault();
        if (current) clearInOut(current.id);
      } else if (code === 'KeyD' || key === 'd') {
        e.preventDefault();
        removeCurrentVideo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current?.id, current?.duration, setInPoint, setOutPoint, clearInOut, removeCurrentVideo]);

  const handleFileChange = (e) => {
    if (e.target.files?.length) addVideos(e.target.files);
    e.target.value = '';
  };

  const dur = current?.duration || 0;
  const inP = current?.inPoint;
  const outP = current?.outPoint;
  const curRatio = dur > 0 ? currentTime / dur : 0;
  const inRatio = inP !== null && dur > 0 ? inP / dur : null;
  const outRatio = outP !== null && dur > 0 ? outP / dur : null;
  const displayedSnaps = snapshots.slice(0, snapshotCount);

  return (
    <div className="editor">
      <input type="file" id="file-input" accept="video/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Navigation bar */}
      <div className="editor-nav">
        <button className="nav-btn" onClick={prev} disabled={currentIndex <= 0}>&#8249;</button>
        <span className="video-counter">
          {videos.length > 0 ? `[${currentIndex + 1} / ${videos.length}]` : '[0 / 0]'}
          {current && <span className="video-name">&nbsp;{current.name}</span>}
        </span>
        <button className="nav-btn" onClick={next} disabled={currentIndex >= videos.length - 1}>&#8250;</button>
      </div>

      {/* Video element */}
      <div className="video-wrapper">
        {current ? (
          <video
            ref={videoRef}
            className="main-video"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            controls
            onKeyDown={(e) => {
              // Перехватываем клавиши на самом видео тоже
              const code = e.code;
              const key = e.key.toLowerCase();
              const t = videoRef.current?.currentTime ?? 0;
              if (['KeyI','KeyO','KeyR','KeyD','KeyF'].includes(code) ||
                  ['i','o','r','d','f'].includes(key)) {
                e.preventDefault();
                window.dispatchEvent(new KeyboardEvent('keydown', { code, key: e.key, bubbles: false }));
              }
            }}
          />
        ) : (
          <div className="no-video">
            <p>Нет загруженных видео</p>
            <button
              className="upload-btn"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              📂 Загрузить видео
            </button>
          </div>
        )}
      </div>

      {/* Кнопки горячих клавиш */}
      {current && (
        <div className="shortcut-buttons">
          <button
            className="sc-btn"
            onClick={() => { if (current) setInPoint(current.id, videoRef.current?.currentTime ?? 0); }}
            title="Установить In Point"
          >
            [I] In
          </button>
          <button
            className="sc-btn"
            onClick={() => { if (current) setOutPoint(current.id, videoRef.current?.currentTime ?? 0); }}
            title="Установить Out Point"
          >
            [O] Out
          </button>
          <button
            className="sc-btn sc-btn-reset"
            onClick={() => { if (current) clearInOut(current.id); }}
            title="Сбросить In/Out"
          >
            [R] Сброс
          </button>
          <button
            className="sc-btn sc-btn-del"
            onClick={() => removeCurrentVideo()}
            title="Удалить видео"
          >
            [D] Удалить
          </button>
          <button
            className="sc-btn sc-btn-add"
            onClick={() => document.getElementById('file-input')?.click()}
            title="Добавить видео"
          >
            [F] Добавить
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-area">
        <div
          className="timeline"
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
        >
          {inRatio !== null && (
            <div className="timeline-dim" style={{ left: 0, width: `${inRatio * 100}%` }} />
          )}
          {inRatio !== null && outRatio !== null && (
            <div className="timeline-selected" style={{ left: `${inRatio * 100}%`, width: `${(outRatio - inRatio) * 100}%` }} />
          )}
          {outRatio !== null && (
            <div className="timeline-dim" style={{ left: `${outRatio * 100}%`, right: 0 }} />
          )}
          <div className="current-bar" style={{ left: `${curRatio * 100}%` }} />
          {inRatio !== null && <div className="marker marker-in" style={{ left: `${inRatio * 100}%` }}>I</div>}
          {outRatio !== null && <div className="marker marker-out" style={{ left: `${outRatio * 100}%` }}>O</div>}
        </div>
        <div className="time-display">
          <span>{fmt(currentTime)}</span>
          <span> / </span>
          <span>{fmt(dur)}</span>
          <select
            className="snap-select"
            value={snapshotCount}
            onChange={(e) => setSnapshotCount(Number(e.target.value))}
          >
            <option value={5}>5 снимков</option>
            <option value={10}>10 снимков</option>
            <option value={15}>15 снимков</option>
          </select>
        </div>
      </div>

      {/* Snapshots */}
      <div className="snapshots-area">
        {snapsLoading && <div className="snap-loading">Генерация снимков…</div>}
        {!snapsLoading && displayedSnaps.map((snap, i) => (
          <div
            key={i}
            className="snapshot-item"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = snap.time;
            }}
          >
            <img src={snap.dataUrl} alt={`frame ${i}`} />
            <span>{fmt(snap.time)}</span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
