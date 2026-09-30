import React, { useState, useRef, useEffect } from 'react';
import { SYSTEM_AVATARS } from '../../data/initialData';
import { Upload, X, ZoomIn, ZoomOut, Check, Move, RotateCcw, Sparkles, Loader2, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playCoinSound } from '../../utils/audio';
import { compressImage, bakeCropFromFullImage } from '../../utils/imageCompressor';

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

const FRAME_SIZE = 260;

interface AvatarEditorModalProps {
  isOpen: boolean;
  studentName: string;
  currentAvatar: string;
  originalAvatar?: string;
  currentScale?: number;
  currentPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (croppedAvatarUrl: string, originalAvatarUrl: string, scale: number, position: { x: number; y: number }) => void;
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
  const [sourceImage, setSourceImage] = useState(originalAvatar || currentAvatar);
  const [scale, setScale] = useState(currentScale || 1);
  const [position, setPosition] = useState(currentPosition || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'Nam' | 'Nữ' | 'Linh vật'>('all');
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or props update
  useEffect(() => {
    if (isOpen) {
      const initial = originalAvatar || currentAvatar;
      setSourceImage(initial);
      setScale(currentScale || 1);
      setPosition(currentPosition || { x: 0, y: 0 });
    }
  }, [isOpen, originalAvatar, currentAvatar, currentScale, currentPosition]);

  // Load natural dimensions to preserve aspect ratio without pre-cropping
  useEffect(() => {
    if (!sourceImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgNaturalSize({
        width: img.naturalWidth || FRAME_SIZE,
        height: img.naturalHeight || FRAME_SIZE
      });
    };
    img.onerror = () => {
      setImgNaturalSize({ width: FRAME_SIZE, height: FRAME_SIZE });
    };
    img.src = sourceImage;
  }, [sourceImage]);

  if (!isOpen) return null;

  // Base cover scale preserving 100% natural photo ratio
  const s0 = imgNaturalSize.width > 0 && imgNaturalSize.height > 0
    ? Math.max(FRAME_SIZE / imgNaturalSize.width, FRAME_SIZE / imgNaturalSize.height)
    : 1;
  const baseWidth = Math.round((imgNaturalSize.width || FRAME_SIZE) * s0);
  const baseHeight = Math.round((imgNaturalSize.height || FRAME_SIZE) * s0);

  // Upload full uncropped photo from computer keeping original ratio with crisp 1200px Retina quality
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        // Nén tối ưu kích thước 1200x1200px chất lượng 90% (ảnh siêu nét Retina nhưng dung lượng nhẹ chỉ ~100KB, đồng bộ CSDL tức thì)
        const compressed = await compressImage(file, 1200, 1200, 0.9);
        if (compressed) {
          setSourceImage(compressed);
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
        setIsProcessing(false);
      } catch (err) {
        console.error('Lỗi khi nạp ảnh học sinh:', err);
        setIsProcessing(false);
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

  // Quick framing presets
  const handleFit = () => {
    if (imgNaturalSize.width > 0 && imgNaturalSize.height > 0) {
      const fitRatio = Math.min(FRAME_SIZE / imgNaturalSize.width, FRAME_SIZE / imgNaturalSize.height);
      const targetScale = fitRatio / s0;
      setScale(Math.max(0.2, Math.round(targetScale * 100) / 100));
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(0.8);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleCover = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCloseUp = () => {
    setScale(1.5);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setScale(prev => Math.min(3.5, Math.max(0.2, Math.round((prev + delta) * 100) / 100)));
  };

  // ONLY crop when user clicks confirm!
  const handleConfirmCrop = async () => {
    try {
      setIsProcessing(true);
      let finalCroppedUrl = sourceImage;
      // Bake the crop from the full uncropped image only now
      finalCroppedUrl = await bakeCropFromFullImage(sourceImage, FRAME_SIZE, position, scale, 360);

      onSave(finalCroppedUrl, sourceImage, scale, position);
      playCoinSound();
      confetti({ particleCount: 40, spread: 65, origin: { y: 0.6 } });
      onClose();
    } catch (err) {
      console.error('Lỗi khi crop ảnh học sinh:', err);
      onSave(sourceImage, sourceImage, scale, position);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight uppercase">
                Thu Phóng & Căn Chỉnh Ảnh Học Sinh
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Học sinh: <strong className="text-amber-300">{studentName || 'Học sinh'}</strong>
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Note: Explaining Uncut until confirm */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-950 flex items-start gap-2.5 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-black mt-0.5 shadow-xs">
              ✓
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-blue-900 block uppercase tracking-wide">
                ẢNH GỐC NGUYÊN VẸN 100% (CHƯA BỊ CẮT XÉN)
              </span>
              <p className="text-slate-600 leading-relaxed font-medium">
                Ảnh từ máy tính được giữ trọn vẹn toàn bộ chi tiết. Bạn có thể phóng to, thu nhỏ hoặc kéo rê khuôn mặt thoải mái. <strong>Hệ thống chỉ thực hiện cắt ảnh khi bạn bấm nút "XÁC NHẬN THU PHÓNG & CẮT ẢNH" bên dưới.</strong>
              </p>
            </div>
          </div>

          {/* Interactive Crop Stage */}
          <div className="flex flex-col items-center">
            <div 
              className="relative w-[260px] h-[260px] rounded-3xl border-4 border-indigo-600 overflow-hidden shadow-2xl bg-slate-900 cursor-grab active:cursor-grabbing select-none touch-none ring-4 ring-indigo-200"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onWheel={handleWheel}
              title="Cuộn chuột để zoom • Kéo rê để căn chỉnh ảnh"
            >
              {/* Full uncropped image rendered with its natural aspect ratio */}
              {imgNaturalSize.width > 0 ? (
                <img
                  src={sourceImage}
                  alt="Student Avatar Preview"
                  className="pointer-events-none select-none transition-transform duration-75"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: `${baseWidth}px`,
                    height: `${baseHeight}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center center'
                  }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              )}

              {/* Circular avatar framing guide overlay to show circular cut */}
              <div className="absolute inset-0 pointer-events-none rounded-full border-2 border-dashed border-indigo-500/60 shadow-[0_0_0_9999px_rgba(15,23,42,0.15)]" />

              {/* Rule of thirds grid overlay */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-indigo-300/40 rounded-3xl">
                <div className="border-r border-b border-indigo-300/30" />
                <div className="border-r border-b border-indigo-300/30" />
                <div className="border-b border-indigo-300/30" />
                <div className="border-r border-b border-indigo-300/30" />
                <div className="border-r border-b border-indigo-300/30" />
                <div className="border-b border-indigo-300/30" />
                <div className="border-r border-indigo-300/30" />
                <div className="border-r border-indigo-300/30" />
                <div />
              </div>

              {/* Floating Helper Pill */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-[10px] font-bold px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap shadow-md">
                <Move className="w-3 h-3 text-amber-300" />
                <span>Kéo di chuyển • Cuộn chuột để zoom</span>
              </div>
            </div>

            {/* Quick Framing Buttons (Yêu cầu: Vừa khít, Phủ đầy, Cận cảnh 150%, Căn giữa) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3 w-full max-w-md">
              <button
                type="button"
                onClick={handleFit}
                className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10.5px] font-black transition-all border border-slate-200 hover:border-indigo-300 uppercase shadow-2xs hover-zoom-btn text-center"
                title="Hiển thị trọn vẹn toàn bộ bức ảnh gốc không lẹm viền"
              >
                VỪA KHÍT (FIT TRỌN ẢNH)
              </button>
              <button
                type="button"
                onClick={handleCover}
                className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10.5px] font-black transition-all border border-slate-200 hover:border-indigo-300 uppercase shadow-2xs hover-zoom-btn text-center"
                title="Phủ đầy toàn bộ khung vuông"
              >
                PHỦ ĐẦY (COVER 100%)
              </button>
              <button
                type="button"
                onClick={handleCloseUp}
                className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10.5px] font-black transition-all border border-slate-200 hover:border-indigo-300 uppercase shadow-2xs hover-zoom-btn text-center"
                title="Phóng to 150% cận cảnh khuôn mặt"
              >
                CẬN CẢNH (150%)
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10.5px] font-black transition-all border border-slate-200 hover:border-indigo-300 uppercase shadow-2xs hover-zoom-btn flex items-center justify-center gap-1"
                title="Đặt lại vị trí căn giữa ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>CĂN GIỮA</span>
              </button>
            </div>

            {/* Zoom Slider and Controls */}
            <div className="w-full max-w-sm mt-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 100) / 100))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                  title="Thu nhỏ ảnh"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="0.2"
                  max="3.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                <button
                  type="button"
                  onClick={() => setScale(prev => Math.min(3.5, Math.round((prev + 0.1) * 100) / 100))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                  title="Phóng to ảnh"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-black text-indigo-700 w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
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
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all hover-zoom-btn shadow-xs uppercase"
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>CHỌN ẢNH TỪ MÁY TÍNH (ẢNH THẺ / CHÂN DUNG)</span>
            </button>
          </div>

          {/* Category Tabs & Presets */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Hoặc chọn nhanh ảnh đại diện mẫu:
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

            {/* Presets Grid */}
            <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl max-h-36 overflow-y-auto">
              {filteredAvatars.map((item, idx) => {
                const url = typeof item === 'string' ? item : item.url;
                const isSelected = sourceImage === url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSourceImage(url);
                      setScale(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                    title={typeof item === 'object' ? item.label : `Ảnh ${idx + 1}`}
                    className={`relative w-12 h-12 rounded-2xl border-2 p-0.5 overflow-hidden transition-all hover-zoom-btn ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-400 scale-105 shadow-md' 
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Preset ${idx + 1}`} 
                      className="w-full h-full object-cover rounded-xl" 
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

        {/* Footer with Explicit Confirmation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors uppercase"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirmCrop}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 rounded-2xl transition-all shadow-md shadow-indigo-600/30 hover-zoom-btn disabled:opacity-50 uppercase"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang cắt ảnh...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>XÁC NHẬN THU PHÓNG & CẮT ẢNH</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
