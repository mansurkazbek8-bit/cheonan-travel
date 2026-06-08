import { useState, useRef } from 'react';
import useVideoStore from '../store/useVideoStore';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ video, index, isActive, thumbnails, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const thumb = thumbnails[video.id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`gallery-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      {...attributes}
    >
      <div className="gallery-drag-handle" {...listeners}>⠿</div>
      <div className="gallery-thumb">
        {thumb ? (
          <img src={thumb} alt={video.name} />
        ) : (
          <div className="thumb-placeholder">🎬</div>
        )}
      </div>
      <div className="gallery-info">
        <div className="gallery-name">{video.name}</div>
        {(video.inPoint !== null || video.outPoint !== null) && (
          <div className="gallery-segment">✂ сегмент задан</div>
        )}
      </div>
    </div>
  );
}

export default function VideoGallery({ thumbnails = {} }) {
  const { videos, currentIndex, setCurrentIndex, reorderVideos } = useVideoStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = videos.findIndex((v) => v.id === active.id);
    const newIdx = videos.findIndex((v) => v.id === over.id);
    const newVideos = arrayMove(videos, oldIdx, newIdx);
    // Keep currentIndex pointing to the same video
    const currentId = videos[currentIndex]?.id;
    reorderVideos(newVideos);
    const newCurrentIdx = newVideos.findIndex((v) => v.id === currentId);
    if (newCurrentIdx >= 0) setCurrentIndex(newCurrentIdx);
  };

  return (
    <aside className="gallery">
      <div className="gallery-header">📋 Список видео ({videos.length})</div>
      {videos.length === 0 ? (
        <div className="gallery-empty">Нажмите <kbd>F</kbd> для загрузки</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            {videos.map((video, index) => (
              <SortableItem
                key={video.id}
                video={video}
                index={index}
                isActive={index === currentIndex}
                thumbnails={thumbnails}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </aside>
  );
}
