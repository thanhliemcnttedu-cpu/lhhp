import React, { useState, useRef, useEffect } from 'react';
import { SYSTEM_AVATARS } from '../../data/initialData';
import { Upload, X, ZoomIn, ZoomOut, Check, Move, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playCoinSound } from '../../utils/audio';
import { compressImage, bakeCroppedAvatar } from '../../utils/imageCompressor';

// Additional cute avatar presets for elementary students
const EXTENDED_AVATARS = [
  ...SYSTEM_AVATARS,
  // More Boys
  { id: 'av-boy-6', label: 'Cậu bé thể thao', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SportBoy&backgroundColor=b6e3f4', gender: 'Nam' },
  { id: 'av-boy-7', label: 'Cậu bé thông thái', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SmartBoy&backgroundColor=c0aede', gender: 'Nam' },
  { id: 'av-boy-8', label: 'Cậu bé cười tươi', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=HappyBoy&backgroundColor=d1d4f9', gender: 'Nam' },
  // More Girls
  { id: 'av-girl-6', label: 'Cô bé bím tóc', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BraidGirl&backgroundColor=ffd5dc', gender: 'Nữ' },
  { id: 'av-girl-7', label: 'Cô bé ngoan ngoãn', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SweetGirl&backgroundColor=ffdfbf', gender: 'Nữ' },
  { id: 'av-girl-8', label: 'Cô bé năng động', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ActiveGirl&backgroundColor=c0aede', gender: 'Nữ' },
  // More Mascots
  { id: 'av-pet-3', label: 'Mèo Con Vàng', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=YellowCat&backgroundColor=ffdfbf', gender: 'Linh vật' },
  { id: 'av-pet-4', label: 'Cún Cưng Đốm', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SpottedPuppy&backgroundColor=b6e3f4', gender: 'Linh vật' },
  { id: 'av-pet-5', label: 'Chim Cánh Cụt', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PenguinHero&backgroundColor=d1d4f9', gender: 'Linh vật' }
];

interface AvatarEditorModalProps {
  isOpen: boolean;
  studentName: string;
  currentAvatar: string;
  originalAvatar?: string;
  currentScale?: number;
  currentPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (avatarUrl: string, scale: number, position: { x: number; y: number }, originalAvatar?: string) => void;
}

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  isOpen,
  studentName,
  currentAvatar,
  originalAvatar,
  currentScale = 1,
  currentPosition = { x: 0, y: 0 },
  onClose,
  onSave
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(originalAvatar || currentAvatar);
  const [rawOriginalImage, setRawOriginalImage] = useState(originalAvatar || currentAvatar);
  const [scale, setScale] = useState(currentScale);
  const [position, setPosition] = useState(currentPosition);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'Nam' | 'Nữ' | 'Linh vật'>('all');

  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Function to compute aspect ratio safely
  const updateAspectFromImg = (img: HTMLImageElement) => {
    if (img && img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  // Re-sync whenever student/avatar or modal open status changes
  useEffect(() => {
    const baseImg = originalAvatar || currentAvatar;
    setSelectedAvatar(baseImg);
    setRawOriginalImage(baseImg);
    setScale(currentScale || 1);
    setPosition(currentPosition || { x: 0, y: 0 });

    if (imgRef.current && imgRef.current.complete) {
      updateAspectFromImg(imgRef.current);
    }
  }, [currentAvatar, originalAvatar, currentScale, currentPosition, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        // Compress while preserving 100% full original aspect ratio (up to 800x800)
        const compressedDataUrl = await compressImage(file, 800, 800, 0.88);
        if (compressedDataUrl) {
          setSelectedAvatar(compressedDataUrl);
          setRawOriginalImage(compressedDataUrl);
          setScale(1);
          setPosition({ x: 0, y: 0 });
          // Pre-measure image
          const testImg = new Image();
          testImg.onload = () => {
            if (testImg.naturalWidth && testImg.naturalHeight) {
              setAspectRatio(testImg.naturalWidth / testImg.naturalHeight);
            }
          };
          testImg.src = compressedDataUrl;
        }
      } catch (err) {
        console.error('Lỗi khi nén ảnh đại diện:', err);
      } finally {
        setIsProcessing(false);
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const cropDirectFromElement = (): string | null => {
    const img = imgRef.current;
    if (!img) return null;

    try {
      const outputSize = 320;
      const containerSize = 192;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);

      const nw = img.naturalWidth || containerSize;
      const nh = img.naturalHeight || containerSize;
      const aspect = nw / nh;

      let baseW = containerSize;
      let baseH = containerSize;
      if (aspect < 1) {
        baseW = containerSize;
        baseH = containerSize / aspect;
      } else {
        baseH = containerSize;
        baseW = containerSize * aspect;
      }

      const ratio = outputSize / containerSize;
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.translate(position.x * ratio, position.y * ratio);
      ctx.scale(scale, scale);
      const drawW = baseW * ratio;
      const drawH = baseH * ratio;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.warn('cropDirectFromElement error:', err);
      return null;
    }
  };

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const baseSource = rawOriginalImage || selectedAvatar;
      
      // Try direct crop from element first (synchronous & exact match to what user sees)
      let finalAvatarUrl = cropDirectFromElement();

      // Fallback to bakeCroppedAvatar if element crop wasn't possible
      if (!finalAvatarUrl) {
        if (baseSource.startsWith('data:image/') || baseSource.startsWith('blob:')) {
          finalAvatarUrl = await bakeCroppedAvatar(baseSource, scale, position, 320, 192);
        } else {
          finalAvatarUrl = selectedAvatar;
        }
      }

      // Save both the baked final avatar (for fast, accurate display) and the uncropped original
      onSave(finalAvatarUrl, scale, position, baseSource);
      playCoinSound();
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu ảnh học sinh:', err);
      onSave(selectedAvatar, scale, position, rawOriginalImage || selectedAvatar);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAvatars = EXTENDED_AVATARS.filter(a => {
    if (activeCategory === 'all') return true;
    return a.gender === activeCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        onMouseUp={handleMouseUp}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Đổi Ảnh Đại Diện Học Sinh
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                Học sinh: <strong className="text-amber-300">{studentName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors hover-zoom-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Avatar Preview Stage: 192px (w-48 h-48) without CSS object-cover pre-cutting */}
          <div className="flex flex-col items-center">
            <div 
              className="relative w-48 h-48 rounded-full border-4 border-indigo-500 overflow-hidden shadow-xl bg-slate-100 cursor-grab active:cursor-grabbing select-none touch-none ring-4 ring-indigo-100 flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              title="Kéo chuột hoặc ngón tay để di chuyển khuôn mặt vào đúng khung tròn"
            >
              <img
                ref={imgRef}
                src={selectedAvatar}
                alt="Avatar Preview"
                crossOrigin="anonymous"
                onLoad={(e) => {
                  updateAspectFromImg(e.currentTarget);
                }}
                className="pointer-events-none transition-transform duration-75 select-none shrink-0"
                style={{
                  width: aspectRatio < 1 ? '192px' : `${Math.round(192 * aspectRatio)}px`,
                  height: aspectRatio < 1 ? `${Math.round(192 / aspectRatio)}px` : '192px',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center'
                }}
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/70 rounded-full pointer-events-none shadow-inner" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/75 text-white text-[10px] font-bold px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap shadow-md">
                <Move className="w-3 h-3 text-amber-300" />
                <span>Kéo di chuyển khuôn mặt</span>
              </div>
            </div>

            {/* Zoom Slider and Controls */}
            <div className="w-full max-w-xs mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.max(0.4, parseFloat((prev - 0.1).toFixed(2))))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-black transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.4"
                  max="3"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.min(3, parseFloat((prev + 0.1).toFixed(2))))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-black transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-slate-500">
                <button
                  type="button"
                  onClick={handleReset}
                  className="hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Căn giữa mặc định (100%)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex items-center justify-center pt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all hover-zoom-btn shadow-xs"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Tải ảnh từ máy tính lên (Ảnh chân dung/thẻ)</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Bộ sưu tập ảnh mẫu học sinh:
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${activeCategory === 'all' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-600'}`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('Nam')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${activeCategory === 'Nam' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'}`}
                >
                  Bé trai
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('Nữ')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${activeCategory === 'Nữ' ? 'bg-white shadow-xs text-pink-700' : 'text-slate-600'}`}
                >
                  Bé gái
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('Linh vật')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${activeCategory === 'Linh vật' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600'}`}
                >
                  Linh vật
                </button>
              </div>
            </div>

            {/* System Presets Grid */}
            <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl max-h-44 overflow-y-auto">
              {filteredAvatars.map((item, idx) => {
                const url = typeof item === 'string' ? item : item.url;
                const isSelected = selectedAvatar === url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(url);
                      setRawOriginalImage(url);
                      setScale(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                    title={typeof item === 'object' ? item.label : `Ảnh ${idx + 1}`}
                    className={`relative w-12 h-12 rounded-full border-2 p-0.5 overflow-hidden transition-all hover-zoom-btn ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-400 scale-105 shadow-md' 
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Preset ${idx + 1}`} 
                      className="w-full h-full object-cover rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                    {isSelected && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/25 hover-zoom-btn disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý ảnh...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Lưu Thay Đổi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
