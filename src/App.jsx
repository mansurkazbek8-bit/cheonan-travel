import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import VideoEditor from './components/VideoEditor';
import VideoGallery from './components/VideoGallery';
import PreviewPlayer from './components/PreviewPlayer';
import useVideoStore from './store/useVideoStore';
import './App.css';

export default function App() {
  const { initSnapshotCount } = useVideoStore();
  const [thumbnails, setThumbnails] = useState({});

  useEffect(() => {
    initSnapshotCount();
  }, []);

  const handleSnapshotsReady = (videoId, snaps) => {
    const thumb = snaps[1]?.dataUrl;
    if (thumb) {
      setThumbnails((prev) => ({ ...prev, [videoId]: thumb }));
    }
  };

  return (
    <div className="app">
      <Header />
      <main className="main-layout">
        <div className="editor-column">
          <VideoEditor onSnapshotsReady={handleSnapshotsReady} />
        </div>
        <VideoGallery thumbnails={thumbnails} />
      </main>
      <PreviewPlayer />
      <Footer />
    </div>
  );
}
