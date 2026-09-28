import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, Check, Move, RotateCcw, Sparkles, Loader2, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playCoinSound } from '../../utils/audio';
import { compressImage, bakeCroppedAvatar } from '../../utils/imageCompressor';

// Elegant teacher avatar presets
const TEACHER_PRESET_AVATARS = [
  { id: 't-1', label: 'Cô giáo tươi vui', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherHoa&backgroundColor=ffd5dc' },
  { id: 't-2', label: 'Cô giáo kính cận', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherMai&backgroundColor=c0aede' },
  { id: 't-3', label: 'Cô giáo tóc dài', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherLan&backgroundColor=ffdfbf' },
  { id: 't-4', label: 'Thầy giáo thanh lịch', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherMinh&backgroundColor=b6e3f4' },
  { id: 't-5', label: 'Thầy giáo tri thức', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherHung&backgroundColor=d1d4f9' },
  { id: 't-6', label: 'Biểu tượng lớp học', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=TeacherCrown&backgroundColor=6366f1' }
];

interface TeacherAvatarEditorModalProps {
  isOpen: boolean;
  teacherName: string;
  currentAvatar: string;
  currentScale?: number;
  currentPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (avatarUrl: string, scale: number, position: { x: number; y: number }) => void;
}

export const TeacherAvatarEditorModal: React.FC<TeacherAvatarEditorModalProps> = ({
  isOpen,
  teacherName,
  currentAvatar,
  currentScale = 1,
  currentPosition = { x: 0, y: 0 },
  onClose,
  onSave
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [scale, setScale] = useState(currentScale || 1);
  const [position, setPosition] = useState(currentPosition || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedAvatar(currentAvatar);
    setScale(currentScale || 1);
    setPosition(currentPosition || { x: 0, y: 0 });
  }, [currentAvatar, currentScale, currentPosition, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        const compressedDataUrl = await compressImage(file, 500, 500, 0.88);
        if (compressedDataUrl) {
          setSelectedAvatar(compressedDataUrl);
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      } catch (err) {
        console.error('Lỗi khi nén ảnh giáo viên:', err);
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

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      let finalAvatarUrl = selectedAvatar;
      if (selectedAvatar.startsWith('data:image/')) {
        finalAvatarUrl = await bakeCroppedAvatar(selectedAvatar, scale, position, 320);
      }
      onSave(finalAvatarUrl, 1, { x: 0, y: 0 });
      playCoinSound();
      confetti({ particleCount: 35, spread: 60 });
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu ảnh giáo viên:', err);
      onSave(selectedAvatar, scale, position);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        onMouseUp={handleMouseUp}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Căn Chỉnh & Thu Phóng Ảnh Giáo Viên
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Giáo viên: <strong className="text-amber-300">{teacherName || 'Chủ nhiệm'}</strong>
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
          {/* Avatar Preview Stage */}
          <div className="flex flex-col items-center">
            <div 
              className="relative w-48 h-48 rounded-2xl border-4 border-indigo-500 overflow-hidden shadow-xl bg-slate-100 cursor-grab active:cursor-grabbing select-none touch-none ring-4 ring-indigo-100"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={selectedAvatar}
                alt="Teacher Avatar Preview"
                className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center'
                }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/75 text-white text-[10px] font-bold px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap shadow-md">
                <Move className="w-3 h-3 text-amber-300" />
                <span>Kéo di chuyển khuôn mặt</span>
              </div>
            </div>

            {/* Zoom Slider and Reset */}
            <div className="w-full max-w-xs mt-4 space-y-2">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-600 w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
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
              <span>Tải ảnh chân dung từ máy tính (Ảnh thẻ / Ảnh thật)</span>
            </button>
          </div>

          {/* Presets */}
          <div className="pt-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              Hoặc chọn ảnh đại diện mẫu sư phạm:
            </label>
            <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
              {TEACHER_PRESET_AVATARS.map((item) => {
                const isSelected = selectedAvatar === item.url;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(item.url);
                      setScale(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                    title={item.label}
                    className={`relative w-12 h-12 rounded-xl border-2 p-0.5 overflow-hidden transition-all hover-zoom-btn ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-400 scale-105 shadow-md' 
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <img 
                      src={item.url} 
                      alt={item.label} 
                      className="w-full h-full object-cover rounded-lg" 
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
                <span>Lưu Ảnh Giáo Viên</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
