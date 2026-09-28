import React, { useState, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student, SeatingColumnsCount, TeacherDeskPosition, DoorPosition } from '../../types';
import { 
  Grid3X3, Users, Shuffle, Trash2, Sliders, 
  ZoomIn, ZoomOut, Check, X, Compass, Download,
  Layers, Eye, Sparkles, Image as ImageIcon, Palette
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { exportElementToPdf } from '../../utils/printHelper';
import { NavigationMenuId } from '../layout/Sidebar';

export type SeatingPerspectiveTheme = 
  | 'wood_3d' 
  | 'modern_mint_3d' 
  | 'royal_navy_3d' 
  | 'standard_2d' 
  | 'rainbow_2d';

interface ThemeConfig {
  id: SeatingPerspectiveTheme;
  name: string;
  type: '3d' | '2d';
  icon: string;
  badge: string;
  containerBg: string;
  containerBorder: string;
  headerBg: string;
  headerBorder: string;
  podiumBg: string;
  podiumBorder: string;
  boardBg: string;
  boardBorder: string;
  boardText: string;
  deskHeaderBg: string;
  deskBorder: string;
  deskSurface: string;
  columnBg: string;
  columnBorder: string;
  columnBadge: string;
}

export const SEATING_THEMES: Record<SeatingPerspectiveTheme, ThemeConfig> = {
  wood_3d: {
    id: 'wood_3d',
    name: '3D Gỗ Tự Nhiên (Ấm cúng - Mẫu ảnh)',
    type: '3d',
    icon: '🪵',
    badge: 'Mẫu ảnh gốc',
    containerBg: 'bg-[#f4ece1]',
    containerBorder: 'border-4 border-[#c5a880]',
    headerBg: 'bg-gradient-to-r from-[#173059] via-[#1e3a6c] to-[#173059] text-white border-2 border-[#d4af37]',
    headerBorder: 'border-[#d4af37]',
    podiumBg: 'bg-[#e4cfb4] border-2 border-[#b89870]',
    podiumBorder: 'border-[#b89870]',
    boardBg: 'bg-gradient-to-b from-[#1b5e39] to-[#124227] border-4 border-[#8e6b3e] text-white',
    boardBorder: 'border-[#8e6b3e]',
    boardText: 'text-amber-300',
    deskHeaderBg: 'bg-[#ecd6ba] text-[#7a4e21] border-[#cdae86]',
    deskBorder: 'border-[#c5a880]',
    deskSurface: 'bg-gradient-to-b from-[#fdf7ee] to-[#f4e7d4]',
    columnBg: 'bg-[#ebdcc8]/60 border-[#d6be9f]',
    columnBorder: 'border-[#d6be9f]',
    columnBadge: 'bg-gradient-to-r from-[#946338] via-[#7d512a] to-[#946338] text-white border-[#c59c72]'
  },
  modern_mint_3d: {
    id: 'modern_mint_3d',
    name: '3D Hiện Đại Xanh Ngọc (Mint & Cyan)',
    type: '3d',
    icon: '🌿',
    badge: 'Châu Âu',
    containerBg: 'bg-[#eaf7f5]',
    containerBorder: 'border-4 border-[#2dd4bf]',
    headerBg: 'bg-gradient-to-r from-[#0f766e] via-[#0d9488] to-[#115e59] text-white border-2 border-[#5eead4]',
    headerBorder: 'border-[#5eead4]',
    podiumBg: 'bg-[#ccfbf1] border-2 border-[#99f6e4]',
    podiumBorder: 'border-[#99f6e4]',
    boardBg: 'bg-gradient-to-b from-[#0f766e] to-[#134e4a] border-4 border-[#2dd4bf] text-white',
    boardBorder: 'border-[#2dd4bf]',
    boardText: 'text-teal-200',
    deskHeaderBg: 'bg-[#ccfbf1] text-teal-900 border-[#99f6e4]',
    deskBorder: 'border-[#5eead4]',
    deskSurface: 'bg-gradient-to-b from-[#ffffff] to-[#f0fdfa]',
    columnBg: 'bg-[#ccfbf1]/40 border-[#99f6e4]',
    columnBorder: 'border-[#99f6e4]',
    columnBadge: 'bg-gradient-to-r from-[#0f766e] via-[#14b8a6] to-[#0f766e] text-white border-[#5eead4]'
  },
  royal_navy_3d: {
    id: 'royal_navy_3d',
    name: '3D Hoàng Gia Xanh Navy & Ánh Kim',
    type: '3d',
    icon: '👑',
    badge: 'Sang trọng',
    containerBg: 'bg-[#edf2fa]',
    containerBorder: 'border-4 border-[#3b82f6]',
    headerBg: 'bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#0f172a] text-white border-2 border-[#fbbf24]',
    headerBorder: 'border-[#fbbf24]',
    podiumBg: 'bg-[#dbeafe] border-2 border-[#bfdbfe]',
    podiumBorder: 'border-[#bfdbfe]',
    boardBg: 'bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-4 border-[#fbbf24] text-white',
    boardBorder: 'border-[#fbbf24]',
    boardText: 'text-amber-400',
    deskHeaderBg: 'bg-[#dbeafe] text-blue-900 border-[#bfdbfe]',
    deskBorder: 'border-[#93c5fd]',
    deskSurface: 'bg-gradient-to-b from-[#ffffff] to-[#eff6ff]',
    columnBg: 'bg-[#dbeafe]/40 border-[#bfdbfe]',
    columnBorder: 'border-[#bfdbfe]',
    columnBadge: 'bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#1e3a8a] text-white border-[#60a5fa]'
  },
  standard_2d: {
    id: 'standard_2d',
    name: '2D Sư Phạm Tiêu Chuẩn (Dễ in ấn A4)',
    type: '2d',
    icon: '📄',
    badge: 'Tối ưu in ấn',
    containerBg: 'bg-white',
    containerBorder: 'border-4 border-slate-300',
    headerBg: 'bg-slate-800 text-white border-2 border-slate-700',
    headerBorder: 'border-slate-700',
    podiumBg: 'bg-slate-100 border-2 border-slate-200',
    podiumBorder: 'border-slate-200',
    boardBg: 'bg-emerald-800 border-4 border-emerald-950 text-white',
    boardBorder: 'border-emerald-950',
    boardText: 'text-emerald-200',
    deskHeaderBg: 'bg-slate-100 text-slate-800 border-slate-300',
    deskBorder: 'border-slate-300',
    deskSurface: 'bg-white',
    columnBg: 'bg-slate-50/80 border-slate-200',
    columnBorder: 'border-slate-200',
    columnBadge: 'bg-slate-700 text-white border-slate-600'
  },
  rainbow_2d: {
    id: 'rainbow_2d',
    name: '2D Cầu Vồng Phân Tổ (Sinh động)',
    type: '2d',
    icon: '🌈',
    badge: 'Đa sắc màu',
    containerBg: 'bg-gradient-to-br from-indigo-50/70 via-pink-50/50 to-amber-50/70',
    containerBorder: 'border-4 border-purple-300',
    headerBg: 'bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white border-2 border-white',
    headerBorder: 'border-white',
    podiumBg: 'bg-white/90 border-2 border-purple-200',
    podiumBorder: 'border-purple-200',
    boardBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 border-4 border-amber-300 text-white',
    boardBorder: 'border-amber-300',
    boardText: 'text-amber-200',
    deskHeaderBg: 'bg-purple-100 text-purple-900 border-purple-200',
    deskBorder: 'border-purple-200',
    deskSurface: 'bg-white/95',
    columnBg: 'bg-white/80 border-purple-200',
    columnBorder: 'border-purple-200',
    columnBadge: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-300'
  }
};

interface SeatingChartViewProps {
  onNavigate?: (view: NavigationMenuId) => void;
}

export const SeatingChartView: React.FC<SeatingChartViewProps> = ({ onNavigate }) => {
  const { 
    currentClassStudents, activeClassId, classes,
    seatingColumns, setSeatingColumns,
    seatingAssignments, assignSeat, clearSeating,
    autoAssignSeating, teacherDeskPos, setTeacherDeskPos,
    doorPos, setDoorPos,
    teacherProfile
  } = useClassroom();

  const activeClass = classes.find(c => c.id === activeClassId);

  const [perspectiveTheme, setPerspectiveTheme] = useState<SeatingPerspectiveTheme>('wood_3d');
  const [selectedStudentToSeat, setSelectedStudentToSeat] = useState<Student | null>(null);
  const [tiltAngle, setTiltAngle] = useState(18); // 10 to 35 deg
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isGeneratingInfographicImage, setIsGeneratingInfographicImage] = useState(false);
  const [infographicSuccess, setInfographicSuccess] = useState(false);

  // Yêu cầu: Tùy chọn số bàn của từng dãy, số dãy, đánh số bàn theo dãy dọc hoặc ngang
  const [desksPerColumn, setDesksPerColumn] = useState<Record<number, number>>({
    0: 4, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4
  });
  const [numberingDirection, setNumberingDirection] = useState<'vertical' | 'horizontal'>('vertical');

  const getDeskNumber = (colIdx: number, rowIdx: number): number => {
    if (numberingDirection === 'vertical') {
      let prevCount = 0;
      for (let c = 0; c < colIdx; c++) {
        prevCount += (desksPerColumn[c] || 4);
      }
      return prevCount + rowIdx + 1;
    } else {
      let count = 0;
      for (let r = 0; r < rowIdx; r++) {
        for (let c = 0; c < seatingColumns; c++) {
          if (r < (desksPerColumn[c] || 4)) count++;
        }
      }
      for (let c = 0; c <= colIdx; c++) {
        if (c === colIdx) {
          count++;
        } else if (rowIdx < (desksPerColumn[c] || 4)) {
          count++;
        }
      }
      return count;
    }
  };

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const printableAreaRef = useRef<HTMLDivElement | null>(null);

  const currentTheme = SEATING_THEMES[perspectiveTheme];
  const is3D = currentTheme.type === '3d';

  // 4 or 5 standard rows
  const rows = 4;

  // Unseated students list
  const assignedStudentIds = new Set(Object.values(seatingAssignments));
  const unseatedStudents = currentClassStudents.filter(s => !assignedStudentIds.has(s.id));

  const handleSeatClick = (seatKey: string) => {
    if (selectedStudentToSeat) {
      assignSeat(seatKey, selectedStudentToSeat.id);
      setSelectedStudentToSeat(null);
    } else {
      const currentStudentId = seatingAssignments[seatKey];
      if (currentStudentId) {
        const student = currentClassStudents.find(s => s.id === currentStudentId);
        if (student) {
          setSelectedStudentToSeat(student);
          assignSeat(seatKey, null);
        }
      }
    }
  };

  // Export high-res PNG image matching the exact attached visual
  const handleExportPng = async () => {
    if (!printableAreaRef.current) return;
    try {
      setIsExportingPng(true);
      const dataUrl = await toPng(printableAreaRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#f8fafc'
      });
      const link = document.createElement('a');
      link.download = `So_Do_Lop_Hoc_${activeClass?.name || '4A1'}_${perspectiveTheme}.png`;
      link.href = dataUrl;
      link.click();
      confetti({ particleCount: 35, spread: 60 });
    } catch (err) {
      console.error('Lỗi khi xuất ảnh sơ đồ:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  // Export PDF (Khổ A4)
  const handleExportPdf = async () => {
    if (!printableAreaRef.current) return;
    try {
      setIsExportingPdf(true);
      const fileName = `So_Do_Lop_Hoc_${activeClass?.name || '4A1'}_A4.pdf`;
      const title = `Sơ Đồ Lớp Học - Lớp ${activeClass?.name || '4A1'}`;
      const success = await exportElementToPdf(printableAreaRef.current, fileName, 'portrait', title);
      if (success) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Lỗi khi xuất PDF sơ đồ:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Tạo ảnh sơ đồ chuyên dụng cho Infographic (Yêu cầu: Mục sơ đồ lớp có thêm chức năng tạo ảnh sơ đồ cho infographic)
  const handleGenerateInfographicImage = async () => {
    if (!printableAreaRef.current) return;
    try {
      setIsGeneratingInfographicImage(true);
      const dataUrl = await toPng(printableAreaRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const key = `lop_hoc_seating_infographic_img_${activeClass?.id || activeClassId}`;
      const payload = {
        image: dataUrl,
        classId: activeClass?.id || activeClassId,
        className: activeClass?.name || '4A1',
        themeId: perspectiveTheme,
        themeName: currentTheme.name,
        columns: seatingColumns,
        createdAt: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(payload));

      confetti({ particleCount: 65, spread: 75, origin: { y: 0.6 } });
      setInfographicSuccess(true);
    } catch (err) {
      console.error('Lỗi khi tạo ảnh sơ đồ cho Infographic:', err);
    } finally {
      setIsGeneratingInfographicImage(false);
    }
  };

  // Switch perspective theme
  const handleSelectTheme = (themeId: SeatingPerspectiveTheme) => {
    setPerspectiveTheme(themeId);
    if (SEATING_THEMES[themeId].type === '2d') {
      setTiltAngle(0);
    } else {
      setTiltAngle(18);
    }
  };

  // =========================================================================
  // PODIUM COMPONENTS (Matching attached 3D classroom photo)
  // Reactive to teacherDeskPos ('left' | 'center' | 'right') and doorPos ('left' | 'right')
  // Slogan banner removed completely per user request
  // =========================================================================
  const renderTeacherDesk = (colSpan: string = 'col-span-4') => (
    <div className={`${colSpan} h-full min-h-[90px] bg-[#f8ebd7] rounded-xl border-2 border-[#c5a880] p-2.5 shadow-sm text-center transition-all duration-300 hover-zoom-interactive flex flex-col justify-between`}>
      <div className="text-[10px] font-black text-[#5c3a1e] uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
        <span>⭐ BÀN GIÁO VIÊN ({teacherDeskPos === 'left' ? 'BÊN TRÁI' : teacherDeskPos === 'center' ? 'Ở GIỮA' : 'BÊN PHẢI'})</span>
      </div>
      <div className="flex items-center justify-center gap-2.5">
        <div className="relative shrink-0">
          <img 
            src={teacherProfile.avatar} 
            alt="Avatar Giáo viên"
            className="w-12 h-12 rounded-xl object-cover border-2 border-[#a77e53] shadow-xs bg-white" 
          />
          <span className="absolute -bottom-1 -right-1 text-xs">💻</span>
        </div>
        <div className="text-left min-w-0">
          <div className="text-xs font-black text-slate-900 truncate">
            {activeClass?.teacherName ? `Cô ${activeClass.teacherName.replace(/^Cô\s+/i, '')}` : `Cô ${teacherProfile.name.replace(/^Cô\s+/i, '')}`}
          </div>
          <div className="text-[10px] text-amber-900 font-bold flex items-center gap-1">
            <span>📚 Sổ giáo án & Bục giảng</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChalkboard = (colSpan: string = 'col-span-5') => (
    <div className={`${colSpan} h-full min-h-[90px] bg-gradient-to-b from-[#1b5e39] to-[#124227] rounded-xl border-4 border-[#8e6b3e] p-2.5 text-center shadow-lg relative transition-all duration-300 flex flex-col justify-center`}>
      <div className="text-xs sm:text-sm md:text-base font-black tracking-wide text-white drop-shadow-md uppercase">
        BẢNG LỚP HỌC HẠNH PHÚC
      </div>
      <div className="text-[10px] text-amber-300 font-bold truncate px-1 mt-1">
        - LỚP {activeClass?.name || '4A1'} • {activeClass?.slogan || 'Chăm ngoan, sáng tạo, tự tin'} -
      </div>
    </div>
  );

  const renderDoor = (colSpan: string = 'col-span-3') => (
    <div className={`${colSpan} h-full min-h-[90px] bg-[#e8d2b7] rounded-xl border-2 border-[#b89870] p-2 text-center shadow-sm relative overflow-hidden flex flex-col justify-between hover-zoom-interactive`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-amber-900 uppercase">CỬA LỚP</span>
        <span className="px-1 py-0.2 bg-blue-600 text-white rounded text-[8px] font-black">3D</span>
      </div>
      <div className="text-2xl my-0.5">🚪</div>
      <span className="text-[8px] font-bold text-amber-800 block">
        {doorPos === 'left' ? '← Cửa Ra Vào (Trái)' : 'Cửa Ra Vào (Phải) →'}
      </span>
    </div>
  );

  // Layout Podium dynamically based on doorPos & teacherDeskPos (No slogan banner per request)
  const renderPodiumLayout = () => {
    if (doorPos === 'left') {
      if (teacherDeskPos === 'left') {
        return (
          <div className="grid grid-cols-12 gap-3 items-stretch animate-in fade-in duration-200">
            {renderDoor('col-span-3')}
            {renderTeacherDesk('col-span-4')}
            {renderChalkboard('col-span-5')}
          </div>
        );
      } else if (teacherDeskPos === 'center') {
        return (
          <div className="grid grid-cols-12 gap-3 items-stretch animate-in fade-in duration-200">
            {renderDoor('col-span-3')}
            {renderChalkboard('col-span-5')}
            {renderTeacherDesk('col-span-4')}
          </div>
        );
      } else {
        return (
          <div className="grid grid-cols-12 gap-3 items-stretch animate-in fade-in duration-200">
            {renderDoor('col-span-3')}
            {renderChalkboard('col-span-5')}
            {renderTeacherDesk('col-span-4')}
          </div>
        );
      }
    } else {
      // doorPos === 'right'
      if (teacherDeskPos === 'left') {
        return (
          <div className="grid grid-cols-12 gap-3 items-stretch animate-in fade-in duration-200">
            {renderTeacherDesk('col-span-4')}
            {renderChalkboard('col-span-5')}
            {renderDoor('col-span-3')}
          </div>
        );
      } else if (teacherDeskPos === 'center') {
        return (
          <div className="grid grid-cols-12 gap-3 items-stretch animate-in fade-in duration-200">
            {renderChalkboard('col-span-5')}
            {renderTeacherDesk('col-span-4')}
            {renderDoor('col-span-3')}
          </div>
        );
      } else {
        return (
          <div className="grid grid-cols-12 gap-3 items-stretch animate-in fade-in duration-200">
            {renderChalkboard('col-span-5')}
            {renderTeacherDesk('col-span-4')}
            {renderDoor('col-span-3')}
          </div>
        );
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & High-End Action Controls */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover-zoom-card">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/25">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Sơ Đồ Lớp Học Không Gian</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {seatingColumns} Dãy Bàn • Lớp {activeClass?.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {currentTheme.name} • Vị trí bàn GV và Cửa lớp cập nhật theo thời gian thực
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Config Button */}
          <button
            onClick={() => setIsConfigDrawerOpen(!isConfigDrawerOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-2xl border transition-all hover-zoom-btn ${
              isConfigDrawerOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tùy Biến Bố Trí ({seatingColumns} Dãy)</span>
          </button>

          {/* Auto Assign */}
          <button
            onClick={() => autoAssignSeating('boy_girl')}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all hover-zoom-btn shadow-2xs"
            title="Xếp xen kẽ Nam Nữ vào các bàn"
          >
            <Shuffle className="w-3.5 h-3.5 text-blue-600" />
            <span>Xếp Nam/Nữ</span>
          </button>

          <button
            onClick={clearSeating}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 rounded-2xl transition-all hover-zoom-btn"
            title="Gỡ tất cả học sinh khỏi chỗ ngồi"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa chỗ</span>
          </button>

          {/* Nút Tạo Ảnh Sơ Đồ Cho Infographic */}
          <button
            onClick={handleGenerateInfographicImage}
            disabled={isGeneratingInfographicImage}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-2xl shadow-md shadow-purple-600/25 transition-all hover-zoom-btn disabled:opacity-50 cursor-pointer ring-2 ring-purple-300"
            title="Tạo ảnh sơ đồ chỗ ngồi chuẩn để chèn tự động vào trang Infographic của lớp"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isGeneratingInfographicImage ? 'Đang tạo ảnh Infographic...' : 'Tạo Ảnh Sơ Đồ Cho Infographic'}</span>
          </button>

          {/* Nút Xuất Ảnh PNG */}
          <button
            onClick={handleExportPng}
            disabled={isExportingPng}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl shadow-xs transition-all hover-zoom-btn disabled:opacity-50"
            title="Tải ảnh PNG sơ đồ lớp học sắc nét gửi Zalo"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isExportingPng ? 'Đang xuất PNG...' : 'Xuất Ảnh PNG'}</span>
          </button>

          {/* Nút Xuất File Sơ Đồ PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md shadow-indigo-600/25 transition-all hover-zoom-btn disabled:opacity-50"
            title="Xuất file sơ đồ lớp học dạng PDF chuẩn khổ A4"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Xuất File Sơ Đồ PDF'}</span>
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER: ĐÃ TẠO ẢNH SƠ ĐỒ CHO INFOGRAPHIC */}
      {infographicSuccess && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-4 rounded-2xl shadow-lg border border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold shrink-0 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black">
                ĐÃ TẠO VÀ LƯU ẢNH SƠ ĐỒ CHỖ NGỒI CHO INFOGRAPHIC THÀNH CÔNG!
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">
                Ảnh sơ đồ lớp <strong>{activeClass?.name}</strong> (Mẫu: {currentTheme.name}, {seatingColumns} dãy bàn) đã được lưu và sẵn sàng chèn tự động vào mục Infographic của lớp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                onClick={() => onNavigate('infographic')}
                className="px-4 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105"
              >
                <span>Xem Trên Infographic</span>
                <span>➔</span>
              </button>
            )}
            <button
              onClick={() => setInfographicSuccess(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg text-xs cursor-pointer"
              title="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SELECT PERSPECTIVE THEME BAR (User Request: Bổ sung thêm nhiều phối cảnh 2D & 3D) */}
      <div className="bg-white/95 p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Palette className="w-4 h-4 text-indigo-600" />
          <span>Chọn Mẫu Phối Cảnh Lớp Học ({Object.keys(SEATING_THEMES).length} kiểu):</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.values(SEATING_THEMES).map((theme) => {
            const isSelected = perspectiveTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover-zoom-btn ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-102 ring-2 ring-indigo-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{theme.icon}</span>
                <span>{theme.name.split(' (')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {theme.type.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customizable Layout Panel Drawer */}
      {isConfigDrawerOpen && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-blue-200/80 p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Thiết lập thông số không gian & bố trí phòng học (Vị trí cập nhật tức thì)
              </h3>
            </div>
            <button
              onClick={() => setIsConfigDrawerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 font-bold"
            >
              ✕ Đóng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* 1. Columns Count */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <label className="block font-bold text-slate-800">
                1. Số dãy bàn học sinh:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {([2, 3, 4, 5, 6] as (SeatingColumnsCount | 6)[]).map((cols) => (
                  <button
                    key={cols}
                    onClick={() => setSeatingColumns(cols as SeatingColumnsCount)}
                    className={`py-1.5 rounded-xl font-black text-xs transition-all hover-zoom-btn ${
                      seatingColumns === cols
                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cols} Dãy
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Lớp tiêu chuẩn thường bố trí <strong>4 Dãy Bàn</strong>.
              </p>
            </div>

            {/* 2. Numbering Direction (Dọc vs Ngang) */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800">
                  2. Đánh số bàn theo:
                </label>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {numberingDirection === 'vertical' ? 'Dãy Dọc' : 'Hàng Ngang'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNumberingDirection('vertical')}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all text-center ${
                    numberingDirection === 'vertical'
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>Dãy Dọc ⬇</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Dãy 1: 1, 2, 3...</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberingDirection('horizontal')}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all text-center ${
                    numberingDirection === 'horizontal'
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>Hàng Ngang ➔</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Hàng 1: 1, 2, 3...</div>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Thứ tự số bàn sẽ tự động cập nhật trên từng chiếc bàn.
              </p>
            </div>

            {/* 3. Desks per Column Configuration */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <label className="block font-bold text-slate-800">
                3. Tùy chọn số bàn của từng dãy:
              </label>
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[10px] text-slate-500 font-bold">Đặt nhanh tất cả:</span>
                {[3, 4, 5, 6].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      const updated: Record<number, number> = {};
                      for (let c = 0; c < 6; c++) updated[c] = cnt;
                      setDesksPerColumn(updated);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold"
                  >
                    {cnt} bàn
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                {Array.from({ length: seatingColumns }).map((_, cIdx) => {
                  const currentDeskCount = desksPerColumn[cIdx] || 4;
                  return (
                    <div key={cIdx} className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-slate-200 text-[11px]">
                      <span className="font-bold text-slate-700">Dãy {cIdx + 1}:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDesksPerColumn(prev => ({
                            ...prev,
                            [cIdx]: Math.max(1, (prev[cIdx] || 4) - 1)
                          }))}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 font-black flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-blue-700 w-5 text-center">
                          {currentDeskCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDesksPerColumn(prev => ({
                            ...prev,
                            [cIdx]: Math.min(8, (prev[cIdx] || 4) + 1)
                          }))}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 font-black flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Teacher Desk Position (Reactive) */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800">
                  4. Vị trí Bàn Giáo viên:
                </label>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {teacherDeskPos === 'left' ? 'Bên Trái' : teacherDeskPos === 'center' ? 'Ở Giữa' : 'Bên Phải'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'left', label: 'Bên Trái' },
                  { id: 'center', label: 'Ở Giữa' },
                  { id: 'right', label: 'Bên Phải' }
                ].map(pos => (
                  <button
                    key={pos.id}
                    onClick={() => setTeacherDeskPos(pos.id as TeacherDeskPosition)}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all hover-zoom-btn ${
                      teacherDeskPos === pos.id
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Bàn giáo viên sẽ <strong>nhảy vị trí tương ứng</strong> trên bục giảng.
              </p>
            </div>

            {/* 5. Door Position (Reactive) */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800">
                  5. Vị trí Cửa ra vào:
                </label>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {doorPos === 'left' ? 'Cửa Trái' : 'Cửa Phải'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'left', label: 'Cửa Trái' },
                  { id: 'right', label: 'Cửa Phải' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDoorPos(p.id as DoorPosition)}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all hover-zoom-btn ${
                      doorPos === p.id
                        ? 'bg-amber-500 text-white shadow-xs font-black'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Cửa lớp học sẽ <strong>chuyển sang cánh tương ứng</strong> trên phối cảnh.
              </p>
            </div>

            {/* 6. 3D Camera Tilt */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>6. Góc nghiêng ({is3D ? `${tiltAngle}°` : '2D phẳng'}):</span>
                <button
                  onClick={() => { setTiltAngle(is3D ? 18 : 0); setZoomLevel(1); }}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Mặc định
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                disabled={!is3D}
                value={tiltAngle}
                onChange={(e) => setTiltAngle(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-40"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Thu phóng:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.1))}
                    className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="font-mono">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(1.25, prev + 0.1))}
                    className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Classroom Layout & Unseated Students */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* CLASSROOM ARENA CANVAS (Rendered according to active theme & dynamic positions) */}
        {/* ========================================================================= */}
        <div 
          ref={chartContainerRef}
          className="lg:col-span-9 bg-slate-200/60 border border-slate-300 rounded-3xl p-4 sm:p-6 shadow-inner relative overflow-x-auto min-h-[640px]"
        >
          {/* PRINTABLE CONTAINER CAPTURED FOR PNG & PDF EXPORT */}
          <div 
            ref={printableAreaRef}
            id="printable-seating-chart"
            className={`w-full ${currentTheme.containerBg} ${currentTheme.containerBorder} rounded-2xl shadow-xl p-4 sm:p-6 space-y-4 transition-all duration-300`}
            style={{
              backgroundImage: perspectiveTheme === 'wood_3d' 
                ? 'radial-gradient(#e9dac6 1px, transparent 1px)' 
                : perspectiveTheme === 'modern_mint_3d'
                ? 'radial-gradient(#ccfbf1 1px, transparent 1px)'
                : undefined,
              backgroundSize: '20px 20px'
            }}
          >
            {/* 1. HEADER KHUNG TIÊU ĐỀ */}
            <div className={`relative overflow-hidden rounded-2xl ${currentTheme.headerBg} p-3.5 sm:p-4 text-center shadow-md`}>
              <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-wide uppercase drop-shadow-sm">
                SƠ ĐỒ LỚP HỌC - KHÔNG GIAN BỤC GIẢNG CHÍNH
              </h1>
              <p className="text-xs sm:text-sm font-bold opacity-90 tracking-wider mt-0.5 uppercase">
                - BẢNG LỚP HỌC HẠNH PHÚC • LỚP {activeClass?.name?.toUpperCase() || '4A1'} -
              </p>
            </div>

            {/* 2. BỤC GIẢNG CHÍNH DYNAMIC THEO VỊ TRÍ CHỌN (Không còn Địa cầu, Kính hiển vi, Thước đo, Tủ sách theo yêu cầu) */}
            <div className={`rounded-2xl ${currentTheme.podiumBg} p-3.5 sm:p-4 shadow-sm space-y-2.5`}>
              {/* Bàn Giáo Viên, Bảng Lớp Xanh, Khung ảnh cô giáo & Cửa Ra Vào (DYNAMIC ORDER) */}
              {renderPodiumLayout()}
            </div>

            {/* 3. KHÔNG GIAN CÁC DÃY BÀN (Có vách chia lối đi & ghế gỗ như ảnh 3D mẫu) */}
            <div 
              className="transition-all duration-300 py-2"
              style={{
                transform: is3D ? `rotateX(${tiltAngle}deg) scale(${zoomLevel})` : `scale(${zoomLevel})`,
                transformOrigin: '50% 5%'
              }}
            >
              {/* Columns container */}
              <div 
                className="grid gap-3 sm:gap-4.5"
                style={{
                  gridTemplateColumns: `repeat(${seatingColumns}, minmax(0, 1fr))`
                }}
              >
                {Array.from({ length: seatingColumns }).map((_, colIdx) => (
                  <div 
                    key={colIdx} 
                    className={`space-y-3 p-2 rounded-2xl ${currentTheme.columnBg} relative ${
                      colIdx < seatingColumns - 1 ? 'border-r-2 border-[#8a5b28]/25' : ''
                    }`}
                  >
                    {/* Column Badge: Dãy Bàn X */}
                    <div className={`text-center py-1.5 px-3 rounded-xl font-black text-xs shadow-md uppercase tracking-wider ${currentTheme.columnBadge}`}>
                      Dãy Bàn {colIdx + 1}
                    </div>

                    {/* Desks Rows */}
                    {(() => {
                      const colRowCount = desksPerColumn[colIdx] || 4;
                      return Array.from({ length: colRowCount }).map((_, rowIdx) => {
                        const seatLeftKey = `${colIdx}-${rowIdx}-0`;
                        const seatRightKey = `${colIdx}-${rowIdx}-1`;

                        const studentLeftId = seatingAssignments[seatLeftKey];
                        const studentRightId = seatingAssignments[seatRightKey];

                        const studentLeft = currentClassStudents.find(s => s.id === studentLeftId);
                        const studentRight = currentClassStudents.find(s => s.id === studentRightId);

                        return (
                          <div key={rowIdx} className="space-y-1">
                            <div
                              className={`rounded-2xl p-2 sm:p-2.5 border-2 ${currentTheme.deskBorder} ${currentTheme.deskSurface} shadow-md hover:border-blue-500 transition-all card-lift`}
                            >
                              {/* Desk Header Badge */}
                              <div className="flex items-center justify-between text-[10px] font-black mb-1.5 px-1">
                                <span className={`px-2 py-0.5 rounded-md border ${currentTheme.deskHeaderBg}`}>
                                  Bàn {getDeskNumber(colIdx, rowIdx)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md border ${currentTheme.deskHeaderBg}`}>
                                  2 Chỗ
                                </span>
                              </div>

                            {/* Desk Surface with 2 Student Seats */}
                            <div className="grid grid-cols-2 gap-2">
                              {/* Left Seat */}
                              <button
                                type="button"
                                onClick={() => handleSeatClick(seatLeftKey)}
                                className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative select-none hover-zoom-btn ${
                                  studentLeft
                                    ? 'border-amber-200 bg-white shadow-xs'
                                    : selectedStudentToSeat
                                    ? 'border-dashed border-emerald-500 bg-emerald-50 animate-pulse'
                                    : 'border-dashed border-slate-300 bg-white/60 hover:bg-white'
                                }`}
                              >
                                {studentLeft ? (
                                  <>
                                    <div className="relative mb-1">
                                      <img 
                                        src={studentLeft.avatar} 
                                        alt={studentLeft.name}
                                        className="w-11 h-11 rounded-full object-cover border-2 border-amber-300 bg-sky-100 shadow-xs" 
                                      />
                                      <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center shadow-xs ${
                                        studentLeft.gender === 'Nam' ? 'bg-blue-600' : 'bg-pink-600'
                                      }`}>
                                        {studentLeft.gender === 'Nam' ? 'N' : 'G'}
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-900 line-clamp-2 leading-tight text-center px-0.5">
                                      {studentLeft.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-800 font-mono mt-0.5">
                                      🪙 {studentLeft.points} xu
                                    </span>
                                  </>
                                ) : (
                                  <div className="py-2.5 text-center text-slate-400">
                                    <Users className="w-4 h-4 mx-auto mb-0.5 opacity-40" />
                                    <span className="text-[10px] font-semibold">Ghế Trái</span>
                                  </div>
                                )}
                              </button>

                              {/* Right Seat */}
                              <button
                                type="button"
                                onClick={() => handleSeatClick(seatRightKey)}
                                className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative select-none hover-zoom-btn ${
                                  studentRight
                                    ? 'border-amber-200 bg-white shadow-xs'
                                    : selectedStudentToSeat
                                    ? 'border-dashed border-emerald-500 bg-emerald-50 animate-pulse'
                                    : 'border-dashed border-slate-300 bg-white/60 hover:bg-white'
                                }`}
                              >
                                {studentRight ? (
                                  <>
                                    <div className="relative mb-1">
                                      <img 
                                        src={studentRight.avatar} 
                                        alt={studentRight.name}
                                        className="w-11 h-11 rounded-full object-cover border-2 border-amber-300 bg-sky-100 shadow-xs" 
                                      />
                                      <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center shadow-xs ${
                                        studentRight.gender === 'Nam' ? 'bg-blue-600' : 'bg-pink-600'
                                      }`}>
                                        {studentRight.gender === 'Nam' ? 'N' : 'G'}
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-900 line-clamp-2 leading-tight text-center px-0.5">
                                      {studentRight.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-800 font-mono mt-0.5">
                                      🪙 {studentRight.points} xu
                                    </span>
                                  </>
                                ) : (
                                  <div className="py-2.5 text-center text-slate-400">
                                    <Users className="w-4 h-4 mx-auto mb-0.5 opacity-40" />
                                    <span className="text-[10px] font-semibold">Ghế Phải</span>
                                  </div>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 2 Wooden Chair Backrests tucked underneath (matching image.png) */}
                          <div className="flex justify-around px-3 -mt-0.5">
                            <div className="w-9 h-2.5 rounded-b-md bg-[#c5a880] border border-[#a38054] shadow-2xs"></div>
                            <div className="w-9 h-2.5 rounded-b-md bg-[#c5a880] border border-[#a38054] shadow-2xs"></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                ))}
              </div>
            </div>

            {/* SƠ ĐỒ CHÚ THÍCH PHÒNG HỌC */}
            <div className="pt-3 border-t-2 border-dashed border-slate-300/80 flex flex-wrap items-center justify-between text-xs text-slate-600 font-bold px-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center">N</span>
                  <span>Nam ({currentClassStudents.filter(s => s.gender === 'Nam').length})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-pink-600 text-white text-[9px] flex items-center justify-center">G</span>
                  <span>Nữ ({currentClassStudents.filter(s => s.gender === 'Nữ').length})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span>
                  <span>Đã xếp: {Object.keys(seatingAssignments).length} / {currentClassStudents.length}</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Lớp {activeClass?.name} • Năm học {activeClass?.academicYear || teacherProfile.academicYear} • GVCN: {activeClass?.teacherName || teacherProfile.name}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* UNSEATED STUDENTS SIDEBAR */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover-zoom-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Học sinh chưa xếp chỗ ({unseatedStudents.length})
                </h3>
              </div>
              {selectedStudentToSeat && (
                <button
                  onClick={() => setSelectedStudentToSeat(null)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold"
                >
                  Hủy chọn
                </button>
              )}
            </div>

            {selectedStudentToSeat && (
              <div className="mt-3 p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold">
                  Đang chọn: <strong>{selectedStudentToSeat.name}</strong>. Hãy bấm vào một ghế trống trên sơ đồ để xếp chỗ!
                </span>
              </div>
            )}

            <div className="mt-3 max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {unseatedStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Check className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-bold text-slate-700">Tất cả học sinh đã có chỗ ngồi!</p>
                  <p className="text-[11px] text-slate-400">Bạn có thể bấm trực tiếp vào từng chỗ trên sơ đồ để đổi vị trí.</p>
                </div>
              ) : (
                unseatedStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentToSeat(student)}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all hover-zoom-btn ${
                      selectedStudentToSeat?.id === student.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-102 font-black'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <img 
                      src={student.avatar} 
                      alt={student.name}
                      className="w-8 h-8 rounded-xl object-cover bg-white border border-slate-200" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{student.name}</div>
                      <div className={`text-[10px] ${selectedStudentToSeat?.id === student.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                        #{student.stt} • {student.gender} • {student.group || 'Tổ 1'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      🪙 {student.points}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
