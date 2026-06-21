import { useState, useRef, useEffect, useCallback } from 'react';
import { useReviewStore } from '@/store/useReviewStore';
import type { ImageData, MarkType } from '@/types';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Circle, Square, Trash2, ChevronLeft, ChevronRight, Move, Eye } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface ImageViewerProps {
  image: ImageData;
  imageIndex: number;
  totalImages: number;
}

type ToolType = 'move' | 'stain' | 'shadow' | 'magnifier';

export function ImageViewer({ image, imageIndex, totalImages }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<ToolType>('move');
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, visible: false });
  const [magnifierZoom, setMagnifierZoom] = useState(3);
  const [markSize, setMarkSize] = useState(24);

  const { 
    addMark, 
    removeMark, 
    clearMarks, 
    rotateCurrentImage,
    setCurrentImageIndex,
    currentDraft 
  } = useReviewStore();

  const marks = image.marks;

  const drawMarks = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    marks.forEach((mark) => {
      const x = (mark.x / 100) * rect.width;
      const y = (mark.y / 100) * rect.height;
      const size = mark.size;

      if (mark.type === 'stain') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    });
  }, [marks]);

  const drawMagnifier = useCallback((clientX: number, clientY: number) => {
    const canvas = magnifierCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const imgRect = img.getBoundingClientRect();
    const x = clientX - imgRect.left;
    const y = clientY - imgRect.top;

    if (x < 0 || x > imgRect.width || y < 0 || y > imgRect.height) {
      setMagnifierPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    setMagnifierPos({ x: clientX, y: clientY, visible: true });

    const magnifierSize = 180;
    canvas.width = magnifierSize;
    canvas.height = magnifierSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, magnifierSize, magnifierSize);

    const sourceX = (x / imgRect.width) * img.naturalWidth;
    const sourceY = (y / imgRect.height) * img.naturalHeight;
    const sourceSize = (magnifierSize / magnifierZoom) * (img.naturalWidth / imgRect.width);

    ctx.save();
    ctx.beginPath();
    ctx.arc(magnifierSize / 2, magnifierSize / 2, magnifierSize / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      img,
      sourceX - sourceSize / 2,
      sourceY - sourceSize / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      magnifierSize,
      magnifierSize
    );

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(magnifierSize / 2 - 10, magnifierSize / 2);
    ctx.lineTo(magnifierSize / 2 + 10, magnifierSize / 2);
    ctx.moveTo(magnifierSize / 2, magnifierSize / 2 - 10);
    ctx.lineTo(magnifierSize / 2, magnifierSize / 2 + 10);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(magnifierSize / 2, magnifierSize / 2, magnifierSize / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [magnifierZoom]);

  useEffect(() => {
    drawMarks();
  }, [drawMarks, scale, position]);

  const handleImageLoad = () => {
    drawMarks();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const img = imageRef.current;
    if (!img) return;

    if (isDragging && activeTool === 'move') {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (activeTool === 'magnifier') {
      drawMagnifier(e.clientX, e.clientY);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'move') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'stain' || activeTool === 'shadow') {
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      addMark(activeTool as MarkType, percentX, percentY, markSize);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (activeTool === 'magnifier') {
      setMagnifierPos((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  const handleRotate = (degrees: number) => {
    rotateCurrentImage(degrees);
  };

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrevImage = () => {
    if (imageIndex > 0) {
      setCurrentImageIndex(imageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (imageIndex < totalImages - 1) {
      setCurrentImageIndex(imageIndex + 1);
    }
  };

  const handleMarkClick = (e: React.MouseEvent, markId: string) => {
    e.stopPropagation();
    removeMark(markId);
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex flex-col gap-2 w-14">
        <Button
          variant={activeTool === 'move' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTool('move')}
          title="移动/拖拽"
        >
          <Move size={18} />
        </Button>
        <Button
          variant={activeTool === 'magnifier' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTool('magnifier')}
          title="放大镜"
        >
          <Eye size={18} />
        </Button>
        <Button
          variant={activeTool === 'stain' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTool('stain')}
          title="污点标记"
          className={activeTool === 'stain' ? 'bg-red-500 hover:bg-red-600' : ''}
        >
          <Circle size={18} />
        </Button>
        <Button
          variant={activeTool === 'shadow' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTool('shadow')}
          title="阴影标记"
          className={activeTool === 'shadow' ? 'bg-blue-500 hover:bg-blue-600' : ''}
        >
          <Square size={18} />
        </Button>
        <div className="border-t border-gray-200 my-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleZoom(0.2)}
          title="放大"
        >
          <ZoomIn size={18} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleZoom(-0.2)}
          title="缩小"
        >
          <ZoomOut size={18} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleRotate(-90)}
          title="逆时针旋转"
        >
          <RotateCcw size={18} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleRotate(90)}
          title="顺时针旋转"
        >
          <RotateCw size={18} />
        </Button>
        <div className="border-t border-gray-200 my-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          title="重置视图"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={clearMarks}
          title="清除所有标记"
        >
          <Trash2 size={18} />
        </Button>
        <div className="mt-2 text-xs text-gray-500 text-center">
          {Math.round(scale * 100)}%
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <img
            ref={imageRef}
            src={image.dataUrl}
            alt={image.name}
            onLoad={handleImageLoad}
            style={{
              transform: `rotate(${image.rotation}deg)`,
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
            }}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="absolute pointer-events-none"
            style={{
              transform: `rotate(${image.rotation}deg)`,
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          />
          
          {marks.map((mark) => {
            const img = imageRef.current;
            if (!img) return null;
            const rect = img.getBoundingClientRect();
            return (
              <button
                key={mark.id}
                onClick={(e) => handleMarkClick(e, mark.id)}
                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"
                style={{
                  left: `${mark.x}%`,
                  top: `${mark.y}%`,
                }}
                title="点击删除标记"
              >
                <Trash2 size={12} className="text-red-500" />
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white px-4 py-2 rounded-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevImage}
            disabled={imageIndex === 0}
            className="bg-transparent border-white/30 text-white hover:bg-white/20"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm min-w-[60px] text-center">
            {imageIndex + 1} / {totalImages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextImage}
            disabled={imageIndex === totalImages - 1}
            className="bg-transparent border-white/30 text-white hover:bg-white/20"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {activeTool === 'magnifier' && (
          <div className="absolute right-4 top-4 flex flex-col gap-2 bg-white/90 p-2 rounded-lg">
            <div className="text-xs text-gray-600 text-center">放大倍数</div>
            <input
              type="range"
              min="2"
              max="4"
              step="0.5"
              value={magnifierZoom}
              onChange={(e) => setMagnifierZoom(Number(e.target.value))}
              className="w-24"
            />
            <div className="text-xs text-center font-medium">{magnifierZoom}x</div>
          </div>
        )}

        {(activeTool === 'stain' || activeTool === 'shadow') && (
          <div className="absolute right-4 top-4 flex flex-col gap-2 bg-white/90 p-2 rounded-lg">
            <div className="text-xs text-gray-600 text-center">标记大小</div>
            <input
              type="range"
              min="12"
              max="48"
              value={markSize}
              onChange={(e) => setMarkSize(Number(e.target.value))}
              className="w-24"
            />
            <div className="text-xs text-center font-medium">{markSize}px</div>
          </div>
        )}
      </div>

      {activeTool === 'magnifier' && magnifierPos.visible && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: magnifierPos.x + 20,
            top: magnifierPos.y - 90,
          }}
        >
          <canvas
            ref={magnifierCanvasRef}
            width={180}
            height={180}
            className="rounded-full shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
