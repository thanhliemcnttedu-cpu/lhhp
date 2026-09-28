import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, Check, Move, RotateCw, RotateCcw, Sparkles } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';

export const CLASS_AVATARS_PRESET = [
  { id: 'ca-1', label: 'Tên Lửa', icon: '🚀', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=RocketClass&backgroundColor=6366f1' },
  { id: 'ca-2', label: 'Cúp Vàng', icon: '🏆', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ChampionCup&backgroundColor=f59e0b' },
  { id: 'ca-3', label: 'Sách Vở', icon: '📚', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=BookClass&backgroundColor=3b82f6' },
  { id: 'ca-4', label: 'Ngôi Sao', icon: '⭐', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=StarClass&backgroundColor=ec4899' },
  { id: 'ca-5', label: 'Khoa Học', icon: '🔬', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ScienceClass&backgroundColor=06b6d4' },
  { id: 'ca-6', label: 'Mầm Xanh', icon: '🌱', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=PlantClass&backgroundColor=10b981' },
  { id: 'ca-7', label: 'Trái Đất', icon: '🌍', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=EarthClass&backgroundColor=8b5cf6' },
  { id: 'ca-8', label: 'Họa Sĩ', icon: '🎨', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ArtClass&backgroundColor=ef4444' }
];

interface ClassAvatarEditorModalProps {
  isOpen: boolean;
  classNameTitle: string;
  currentAvatar: string;
  currentScale?: number;
  currentPosition?: { x: number; y: number };
  colorTheme?: string;
  onClose: () => void;
  onSave: (avatarUrl: string, scale: number, position: { x: number; y: number }) => void;
}

export const ClassAvatarEditorModal: React.FC<ClassAvatarEditorModalProps> = ({
  isOpen,
  classNameTitle,
  currentAvatar,
  currentScale = 1,
  currentPosition = { x: 0, y: 0 },
  colorTheme = '#6366F1',
  onClose,
  onSave
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [scale, setScale] = useState(currentScale);
  const [position, setPosition] = useState(currentPosition);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Sync state whenever modal opens with new props
  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatar);
      setScale(currentScale || 1);
      setPosition(currentPosition || { x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, currentAvatar, currentScale, currentPosition]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 800, 600, 0.88);
        setSelectedAvatar(compressedBase64);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      } catch (err) {
        console.error('Lỗi khi nén ảnh lớp:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setSelectedAvatar(event.target.result as string);
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setRotation(0);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile / touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        posX: position.x,
        posY: position.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.startX;
    const dy = e.touches[0].clientY - dragStartRef.current.startY;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleResetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Canvas export to generate crisp cropped image
  const handleConfirmAndCrop = () => {
    // If it's a vector SVG from DiceBear or no canvas needed, we still export cleanly
    const img = imageElementRef.current;
    const container = previewBoxRef.current;

    if (!img || !container || selectedAvatar.includes('api.dicebear.com')) {
      onSave(selectedAvatar, scale, position);
      onClose();
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const targetWidth = 600;
      const targetHeight = 400;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.save();
        // Translate to center
        ctx.translate(targetWidth / 2, targetHeight / 2);
        // Apply rotation
        ctx.rotate((rotation * Math.PI) / 180);
        // Apply scale
        ctx.scale(scale, scale);

        // Account for container aspect vs canvas aspect
        const containerRect = container.getBoundingClientRect();
        const ratioX = targetWidth / containerRect.width;
        const ratioY = targetHeight / containerRect.height;
        ctx.translate(position.x * ratioX, position.y * ratioY);

        // Draw image centered
        const naturalWidth = img.naturalWidth || 600;
        const naturalHeight = img.naturalHeight || 400;
        const aspect = naturalWidth / naturalHeight;

        let drawW = targetWidth;
        let drawH = targetWidth / aspect;
        if (drawH < targetHeight) {
          drawH = targetHeight;
          drawW = targetHeight * aspect;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        onSave(croppedDataUrl, 1, { x: 0, y: 0 });
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Canvas crop fallback:', err);
    }

    // Fallback save with scale & position
    onSave(selectedAvatar, scale, position);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 overflow-y-auto"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-auto"
        onMouseUp={handleMouseUp}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs font-black"
              style={{ backgroundColor: colorTheme }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Chỉnh Sửa & Thu Phóng Ảnh Lớp Học
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lớp: <strong className="text-slate-800 font-bold">{classNameTitle}</strong> • Kéo di chuyển và thanh trượt để zoom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 space-y-5">
          {/* Large Preview Stage */}
          <div className="flex flex-col items-center">
            <div 
              ref={previewBoxRef}
              className="relative w-full max-w-md h-56 md:h-64 rounded-3xl overflow-hidden shadow-lg border-4 bg-slate-950 cursor-grab active:cursor-grabbing select-none transition-shadow"
              style={{ borderColor: colorTheme }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <img
                ref={imageElementRef}
                src={selectedAvatar}
                alt="Xem trước ảnh lớp"
                className="w-full h-full object-cover pointer-events-none transition-transform duration-75 select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
                referrerPolicy="no-referrer"
                draggable={false}
              />

              {/* Grid Guide Overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none" />
              
              {/* Badge instruction */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[11px] font-bold px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                <Move className="w-3 h-3 text-amber-400" />
                <span>Nhấp & kéo ảnh để chỉnh góc nhìn đẹp nhất</span>
              </div>

              {/* Zoom & Rotation indicator */}
              <div className="absolute top-2.5 right-2.5 bg-black/65 text-white text-[10px] font-mono px-2 py-0.5 rounded-lg pointer-events-none backdrop-blur-xs">
                {Math.round(scale * 100)}% {rotation !== 0 ? `• ${rotation}°` : ''}
              </div>
            </div>

            {/* Quick action buttons row below preview */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Xoay ảnh 90 độ"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Xoay 90°</span>
              </button>

              <button
                type="button"
                onClick={handleResetPosition}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Căn giữa lại ảnh và đặt zoom 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Căn giữa & 100%</span>
              </button>

              <button
                type="button"
                onClick={() => setScale(prev => Math.min(prev + 0.25, 3.5))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                title="Phóng to"
              >
                +25%
              </button>

              <button
                type="button"
                onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                title="Thu nhỏ"
              >
                -25%
              </button>
            </div>

            {/* Zoom Slider Control */}
            <div className="w-full max-w-md mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-4 h-4 text-indigo-600" />
                  <span>ĐIỀU CHỈNH ĐỘ PHÓNG TO / THU NHỎ (ZOOM):</span>
                </span>
                <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <ZoomOut 
                  className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0" 
                  onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
                />
                <input
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <ZoomIn 
                  className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0" 
                  onClick={() => setScale(prev => Math.min(prev + 0.1, 3.5))}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>50% (Thu nhỏ)</span>
                <span>100% (Chuẩn)</span>
                <span>200%</span>
                <span>350% (Phóng to cực đại)</span>
              </div>
            </div>
          </div>

          {/* Upload Button from Computer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Tải ảnh mới từ máy tính:
              </span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-2 transition-all hover-zoom-btn"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Chọn tệp ảnh khác từ máy tính...</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                Hoặc chọn biểu tượng lớp học sinh động có sẵn:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CLASS_AVATARS_PRESET.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(av.url);
                      setScale(1);
                      setPosition({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-transform shrink-0 ${
                      selectedAvatar === av.url ? 'scale-110 ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                    }`}
                    title={av.label}
                  >
                    <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirmAndCrop}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-600/20 hover-zoom-btn transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Lưu & Cập Nhật Ảnh Lớp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
