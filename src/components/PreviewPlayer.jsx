import { useRef, useState, useEffect } from 'react';
import useVideoStore from '../store/useVideoStore';

const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map((x) => String(x).padStart(2, '0')).join(':');
};

export default function PreviewPlayer() {
  const { videos } = useVideoStore();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Segments = videos that have both inPoint and outPoint
  const segments = videos.filter((v) => v.inPoint !== null && v.outPoint !== null);

  const playSegment = (index) => {
    const seg = segments[index];
    if (!seg || !videoRef.current) return;
    const vid = videoRef.current;
    vid.src = seg.url;
    vid.load();
    vid.addEventListener('loadedmetadata', () => {
      vid.currentTime = seg.inPoint;
      vid.play();
    }, { once: true });
  };

  const handlePlay = () => {
    if (segments.length === 0) return;
    if (!isPlaying) {
      setIsPlaying(true);
      if (segmentIndex >= segments.length) {
        setSegmentIndex(0);
        playSegment(0);
      } else {
        const vid = videoRef.current;
        if (vid.paused) vid.play();
        else playSegment(segmentIndex);
      }
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    const seg = segments[segmentIndex];
    if (seg && vid.currentTime >= seg.outPoint) {
      const next = segmentIndex + 1;
      if (next < segments.length) {
        setSegmentIndex(next);
        playSegment(next);
      } else {
        vid.pause();
        setIsPlaying(false);
        setSegmentIndex(0);
      }
    }
  };

  useEffect(() => {
    setIsPlaying(false);
    setSegmentIndex(0);
  }, [segments.length]);

  const totalDuration = segments.reduce((acc, s) => acc + (s.outPoint - s.inPoint), 0);

  return (
    <section className="preview-player">
      <div className="preview-header">
        🎞 Предварительный просмотр монтажа
        {segments.length > 0 && (
          <span className="preview-meta">
            &nbsp;({segments.length} сегм., ~{fmt(totalDuration)})
          </span>
        )}
      </div>

      {segments.length === 0 ? (
        <div className="preview-empty">
          Задайте точки <kbd>I</kbd> и <kbd>O</kbd> для видео чтобы создать сегменты
        </div>
      ) : (
        <div className="preview-body">
          <video
            ref={videoRef}
            className="preview-video"
            onTimeUpdate={handleTimeUpdate}
          />
          <div className="preview-controls">
            <button className="play-btn" onClick={handlePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="preview-segments">
              {segments.map((seg, i) => (
                <div
                  key={seg.id}
                  className={`seg-chip ${i === segmentIndex ? 'active' : ''}`}
                  onClick={() => { setSegmentIndex(i); setIsPlaying(false); playSegment(i); setIsPlaying(true); }}
                >
                  {seg.name.replace(/\.[^.]+$/, '')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
