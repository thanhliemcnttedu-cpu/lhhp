import React, { useState, useRef, useEffect } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { 
  Sparkles, Download, Printer, Check, 
  Grid3X3, Calendar, Users, Award, Heart, Phone, 
  User, CheckSquare, Layers, FileText,
  School, Wand2, ArrowUp, ArrowDown, GripVertical,
  Edit3, RotateCcw, LayoutTemplate,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Type, Move, Palette, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { exportMultipleElementsToPdf, exportElementToPdf } from '../../utils/printHelper';
import { DAYS_OF_WEEK } from './ScheduleLinksView';
import { NavigationMenuId } from '../layout/Sidebar';

export type InfographicSeatingStyle = 
  | 'wood_3d' 
  | 'mint_3d' 
  | 'navy_3d' 
  | 'standard_2d' 
  | 'rainbow_2d';

export type InfographicTimetableStyle = 
  | 'pedagogical' 
  | 'rainbow' 
  | 'wood' 
  | 'sky' 
  | 'minimal';

// Yêu cầu người dùng: Thêm lựa chọn trình bày chế độ 3 trang:
// Trang 1: Thông tin lớp, slogan, giáo viên chủ nhiệm, ban phụ huynh, thời khóa biểu
// Trang 2: Sơ đồ lớp học đã tạo
// Trang 3: Danh sách thành viên lớp
export type InfographicPageMode = 'three_pages' | 'two_pages' | 'single_page';

export type InfographicSectionId = 'header' | 'slogan' | 'teacher_parent' | 'seating' | 'timetable';

export interface TextStyleFormat {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold' | '900';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  offsetX?: number;
  offsetY?: number;
}

export interface InfographicConfig {
  selectedClassId: string;
  pageMode: InfographicPageMode;
  includeHeader: boolean;
  includeSlogan: boolean;
  includeTeacherInfo: boolean;
  includeParentCommittee: boolean;
  includeStudentStats: boolean;
  includeSeatingChart: boolean;
  seatingChartDisplayMode: 'auto_snapshot' | 'snapshot' | 'full_render';
  seatingChartStyle: InfographicSeatingStyle;
  includeTimetable: boolean;
  timetableStyle: InfographicTimetableStyle;
}

const DEFAULT_SECTION_ORDER_PAGE1: InfographicSectionId[] = [
  'header',
  'slogan',
  'teacher_parent',
  'timetable'
];

const SECTION_LABELS: Record<InfographicSectionId, { title: string; icon: string }> = {
  header: { title: 'Đồ họa tiêu đề & Sĩ số lớp', icon: '🎨' },
  slogan: { title: 'Khẩu hiệu / Slogan của lớp', icon: '✨' },
  teacher_parent: { title: 'Giáo viên & Ban đại diện phụ huynh', icon: '👥' },
  seating: { title: 'Sơ đồ chỗ ngồi lớp học', icon: '🪑' },
  timetable: { title: 'Thời khóa biểu trong tuần', icon: '📅' }
};

const FONT_OPTIONS = [
  { label: 'Plus Jakarta (Chuẩn hiện đại)', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Cabinet Grotesk (Tiêu đề đậm)', value: "'Cabinet Grotesk', sans-serif" },
  { label: 'Be Vietnam Pro (Tiếng Việt)', value: "'Be Vietnam Pro', sans-serif" },
  { label: 'Roboto (Hình thức chuẩn)', value: "'Roboto', sans-serif" },
  { label: 'Serif Trang trọng (Playfair)', value: "'Playfair Display', Georgia, serif" },
  { label: 'Tiểu học nét chữ (Vở tập viết)', value: "'SVN-Andika', 'Comic Sans MS', cursive" },
  { label: 'Chữ viết tay nghệ thuật', value: "'Dancing Script', cursive" },
  { label: 'Monospace đánh máy', value: "'Courier New', monospace" }
];

const COLOR_PRESETS = [
  '#0f172a', // Đen / Xanh đen
  '#ffffff', // Trắng
  '#4338ca', // Indigo
  '#1d4ed8', // Xanh dương
  '#047857', // Xanh lục Emerald
  '#b45309', // Vàng đồng Amber
  '#be123c', // Đỏ Rose
  '#78350f', // Nâu gỗ
  '#6b21a8'  // Tím đậm
];

interface InfographicViewProps {
  onNavigate?: (view: NavigationMenuId) => void;
}

export const InfographicView: React.FC<InfographicViewProps> = ({ onNavigate }) => {
  const { 
    classes, activeClassId,
    students, teacherProfile,
    seatingColumns, seatingAssignments, doorPos,
    timetable
  } = useClassroom();

  const [targetClassId, setTargetClassId] = useState<string>(activeClassId || (classes[0]?.id || ''));

  useEffect(() => {
    if (activeClassId && !targetClassId) {
      setTargetClassId(activeClassId);
    }
  }, [activeClassId]);

  const targetClass = classes.find(c => c.id === targetClassId) || classes[0];

  const classStudents = students.filter(s => s.classId === targetClass?.id);
  const maleCount = classStudents.filter(s => s.gender === 'Nam').length;
  const femaleCount = classStudents.filter(s => s.gender === 'Nữ').length;

  // Snapshot image generated from SeatingChartView
  const [savedSeatingSnapshot, setSavedSeatingSnapshot] = useState<{
    image: string;
    classId: string;
    className: string;
    themeName: string;
    columns: number;
    createdAt: number;
  } | null>(null);

  useEffect(() => {
    const key = `lop_hoc_seating_infographic_img_${targetClass?.id || activeClassId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setSavedSeatingSnapshot(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    } else {
      setSavedSeatingSnapshot(null);
    }
  }, [targetClass?.id, activeClassId]);

  // Main Config: Mặc định là chế độ 3 trang A4 chuẩn theo yêu cầu người dùng
  const [config, setConfig] = useState<InfographicConfig>({
    selectedClassId: targetClass?.id || '',
    pageMode: 'three_pages', // Chế độ 3 Trang A4 Chuẩn
    includeHeader: true,
    includeSlogan: true,
    includeTeacherInfo: true,
    includeParentCommittee: true,
    includeStudentStats: true,
    includeSeatingChart: true,
    seatingChartDisplayMode: 'auto_snapshot',
    seatingChartStyle: 'wood_3d',
    includeTimetable: true,
    timetableStyle: 'pedagogical'
  });

  // Section Ordering & Drag-and-Drop state for Page 1
  const [sectionOrder, setSectionOrder] = useState<InfographicSectionId[]>(DEFAULT_SECTION_ORDER_PAGE1);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);

  // Direct Inline Text Editing & Typography Formatting state (Yêu cầu người dùng)
  const [editableTexts, setEditableTexts] = useState<Record<string, string>>({});
  const [textStyles, setTextStyles] = useState<Record<string, TextStyleFormat>>({});
  const [isTextEditMode, setIsTextEditMode] = useState<boolean>(true);
  const [activeFormatKey, setActiveFormatKey] = useState<string | null>('className');
  const [activeFormatLabel, setActiveFormatLabel] = useState<string>('Tiêu đề lớp học');

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'all' | 'page1' | 'page2_seating' | 'page3_students'>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const page1Ref = useRef<HTMLDivElement>(null);
  const pageSeatingRef = useRef<HTMLDivElement>(null);
  const pageStudentsRef = useRef<HTMLDivElement>(null);

  const parentCommittee = targetClass?.parentCommittee || {
    head: { name: 'Trần Văn Mạnh', phone: '0988 123 456' },
    deputy: { name: 'Nguyễn Thị Mai', phone: '0977 654 321' },
    member1: { name: 'Lê Hoàng Nam', phone: '0912 345 678' },
    member2: { name: 'Phạm Thị Lan', phone: '0903 890 123' }
  };

  const defaultSlogan = targetClass?.slogan || 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng';

  // Yêu cầu: Bổ sung tính năng xóa sửa định dạng, kéo giãn to nhỏ khung hình hoặc hình ảnh, di chuyển vị trí chỉnh sửa ngay trực tiếp
  const [frameTransforms, setFrameTransforms] = useState<Record<string, {
    scale: number;
    widthPercent: number;
    offsetX: number;
    offsetY: number;
  }>>({
    seating_p2: { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 },
    seating_p1: { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 },
    class_avatar: { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 },
    teacher_avatar: { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 }
  });

  const updateFrameTransform = (key: string, updates: Partial<{ scale: number; widthPercent: number; offsetX: number; offsetY: number }>) => {
    setFrameTransforms(prev => {
      const cur = prev[key] || { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 };
      return {
        ...prev,
        [key]: {
          ...cur,
          ...updates
        }
      };
    });
  };

  const resetFrameTransform = (key: string) => {
    setFrameTransforms(prev => ({
      ...prev,
      [key]: { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 }
    }));
  };

  const handleFrameDrag = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const cur = frameTransforms[key] || { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 };
    const initX = cur.offsetX || 0;
    const initY = cur.offsetY || 0;

    const onMouseMove = (moveEv: MouseEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      setFrameTransforms(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || { scale: 1, widthPercent: 100 }),
          offsetX: Math.round(initX + dx),
          offsetY: Math.round(initY + dy)
        }
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Helper for applying format styles
  const updateActiveStyle = (updates: Partial<TextStyleFormat>) => {
    if (!activeFormatKey) return;
    setTextStyles(prev => ({
      ...prev,
      [activeFormatKey]: {
        ...prev[activeFormatKey],
        ...updates
      }
    }));
  };

  const moveActiveText = (dx: number, dy: number) => {
    if (!activeFormatKey) return;
    const current = textStyles[activeFormatKey] || {};
    const newX = (current.offsetX || 0) + dx;
    const newY = (current.offsetY || 0) + dy;
    updateActiveStyle({ offsetX: newX, offsetY: newY });
  };

  const resetActiveFormat = () => {
    if (!activeFormatKey) return;
    setTextStyles(prev => {
      const next = { ...prev };
      delete next[activeFormatKey];
      return next;
    });
  };

  // Direct Mouse Drag Handler for moving text position anywhere on the page
  const handleMouseDownDrag = (e: React.MouseEvent, textKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const currentOffset = textStyles[textKey] || {};
    const initX = currentOffset.offsetX || 0;
    const initY = currentOffset.offsetY || 0;

    const onMouseMove = (moveEv: MouseEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      setTextStyles(prev => ({
        ...prev,
        [textKey]: {
          ...prev[textKey],
          offsetX: Math.round(initX + dx),
          offsetY: Math.round(initY + dy)
        }
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Inline Editable & Formattable Text Component
  const EditableText: React.FC<{
    textKey: string;
    label: string;
    defaultVal: string;
    className?: string;
    tagName?: 'span' | 'h1' | 'h2' | 'h3' | 'div' | 'p';
    placeholder?: string;
  }> = ({ textKey, label, defaultVal, className = '', tagName = 'span', placeholder }) => {
    const Tag = tagName as any;
    const currentVal = editableTexts[textKey] !== undefined ? editableTexts[textKey] : defaultVal;
    const style = textStyles[textKey] || {};
    const isSelected = activeFormatKey === textKey && isTextEditMode;

    return (
      <span className="inline-flex items-center align-middle relative group/edit-elem">
        <Tag
          contentEditable={isTextEditMode}
          suppressContentEditableWarning
          onClick={(e: React.MouseEvent) => {
            if (isTextEditMode) {
              e.stopPropagation();
              setActiveFormatKey(textKey);
              setActiveFormatLabel(label);
            }
          }}
          onFocus={() => {
            if (isTextEditMode) {
              setActiveFormatKey(textKey);
              setActiveFormatLabel(label);
            }
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (isTextEditMode && (e.altKey || e.ctrlKey || e.metaKey)) {
              const step = e.shiftKey ? 10 : 2;
              if (e.key === 'ArrowLeft') { e.preventDefault(); moveActiveText(-step, 0); }
              else if (e.key === 'ArrowRight') { e.preventDefault(); moveActiveText(step, 0); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); moveActiveText(0, -step); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); moveActiveText(0, step); }
            }
          }}
          onBlur={(e: React.FocusEvent<HTMLElement>) => {
            const text = e.currentTarget.textContent || '';
            setEditableTexts(prev => ({ ...prev, [textKey]: text }));
          }}
          style={{
            fontFamily: style.fontFamily,
            fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
            color: style.color,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textDecoration: style.textDecoration,
            textAlign: style.textAlign,
            transform: (style.offsetX || style.offsetY) ? `translate(${style.offsetX || 0}px, ${style.offsetY || 0}px)` : undefined,
            display: 'inline-block'
          }}
          className={`${className} ${
            isTextEditMode 
              ? isSelected
                ? 'ring-2 ring-indigo-500 bg-amber-50/80 rounded-xs shadow-xs px-0.5'
                : 'hover:outline-dashed hover:outline-1 hover:outline-indigo-400 cursor-text rounded-xs transition-colors' 
              : ''
          }`}
          title={isTextEditMode ? `Bấm để sửa chữ và chỉnh định dạng/vị trí: ${label}. (Nhấn Alt+Mũi tên để dịch chuyển)` : undefined}
        >
          {currentVal || placeholder || defaultVal}
        </Tag>

        {/* Drag handle for moving position directly on page with mouse */}
        {isSelected && isTextEditMode && (
          <span
            contentEditable={false}
            onMouseDown={(e) => handleMouseDownDrag(e, textKey)}
            className="no-print no-pdf ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-bold cursor-move select-none shadow-xs hover:bg-indigo-700 transition-colors align-middle"
            title="Giữ chuột và kéo để di chuyển vị trí chữ trên trang"
          >
            <Move className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Kéo</span>
          </span>
        )}
      </span>
    );
  };

  // Reordering functions for Page 1
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sectionOrder.length) return;
    const updated = [...sectionOrder];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setSectionOrder(updated);
  };

  const handleDragStart = (idx: number) => {
    setDraggedSectionIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverSectionIndex(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedSectionIndex !== null && draggedSectionIndex !== idx) {
      const updated = [...sectionOrder];
      const [moved] = updated.splice(draggedSectionIndex, 1);
      updated.splice(idx, 0, moved);
      setSectionOrder(updated);
    }
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  // Export PDF
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const elements: HTMLElement[] = [];

      if (config.pageMode === 'three_pages') {
        if (page1Ref.current) elements.push(page1Ref.current);
        if (pageSeatingRef.current) elements.push(pageSeatingRef.current);
        if (pageStudentsRef.current) elements.push(pageStudentsRef.current);
      } else if (config.pageMode === 'two_pages') {
        if (page1Ref.current) elements.push(page1Ref.current);
        if (pageStudentsRef.current) elements.push(pageStudentsRef.current);
      } else {
        if (page1Ref.current) elements.push(page1Ref.current);
      }

      const fileName = `Infographic_Lop_${targetClass?.name || '4A1'}_${elements.length}Trang_A4.pdf`;
      const title = `Infographic Lớp ${targetClass?.name || '4A1'} - Năm học ${targetClass?.academicYear || teacherProfile.academicYear}`;

      if (elements.length > 1) {
        const success = await exportMultipleElementsToPdf(elements, fileName, 'portrait', title);
        if (success) confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } else if (elements.length === 1) {
        const success = await exportElementToPdf(elements[0], fileName, 'portrait', title);
        if (success) confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Lỗi khi xuất PDF Infographic:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export PNG
  const handleExportPng = async (which: 'page1' | 'page2_seating' | 'page3_students' | 'both' = 'both') => {
    try {
      setIsExportingPng(true);

      const downloadOne = async (el: HTMLElement, label: string) => {
        const dataUrl = await toPng(el, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = `Infographic_Lop_${targetClass?.name || '4A1'}_${label}.png`;
        link.href = dataUrl;
        link.click();
      };

      if ((which === 'page1' || which === 'both') && page1Ref.current) {
        await downloadOne(page1Ref.current, 'Trang_1_TongQuan');
      }

      if (config.pageMode === 'three_pages' && (which === 'page2_seating' || which === 'both') && pageSeatingRef.current) {
        await new Promise(r => setTimeout(r, 400));
        await downloadOne(pageSeatingRef.current, 'Trang_2_SoDoLopHoc');
      }

      if ((which === 'page3_students' || which === 'both') && pageStudentsRef.current) {
        await new Promise(r => setTimeout(r, 400));
        await downloadOne(pageStudentsRef.current, config.pageMode === 'three_pages' ? 'Trang_3_DanhSachThanhVien' : 'Trang_2_DanhSachThanhVien');
      }

      confetti({ particleCount: 35, spread: 60 });
    } catch (err) {
      console.error('Lỗi khi xuất ảnh Infographic:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const daysToShow = DAYS_OF_WEEK.slice(0, 5);

  const getTimetableThemeClasses = (style: InfographicTimetableStyle) => {
    switch (style) {
      case 'rainbow':
        return {
          header: 'bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white',
          morningHeader: 'bg-amber-100 text-amber-900 border-amber-200',
          afternoonHeader: 'bg-indigo-100 text-indigo-900 border-indigo-200',
          cellBg: 'hover:bg-pink-50/50'
        };
      case 'wood':
        return {
          header: 'bg-gradient-to-r from-[#946338] via-[#7d512a] to-[#946338] text-white',
          morningHeader: 'bg-[#f4e7d4] text-[#7a4e21] border-[#cdae86]',
          afternoonHeader: 'bg-[#ebdcc8] text-[#7a4e21] border-[#cdae86]',
          cellBg: 'hover:bg-[#faf3e8]'
        };
      case 'sky':
        return {
          header: 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white',
          morningHeader: 'bg-sky-100 text-sky-900 border-sky-200',
          afternoonHeader: 'bg-cyan-100 text-cyan-900 border-cyan-200',
          cellBg: 'hover:bg-sky-50'
        };
      case 'minimal':
        return {
          header: 'bg-slate-800 text-white',
          morningHeader: 'bg-slate-100 text-slate-900 border-slate-300 font-black',
          afternoonHeader: 'bg-slate-200 text-slate-900 border-slate-300 font-black',
          cellBg: 'hover:bg-slate-50'
        };
      case 'pedagogical':
      default:
        return {
          header: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white',
          morningHeader: 'bg-blue-50 text-blue-900 border-blue-200',
          afternoonHeader: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          cellBg: 'hover:bg-blue-50/40'
        };
    }
  };

  const ttClasses = getTimetableThemeClasses(config.timetableStyle);

  const getSeatingStyleClasses = (style: InfographicSeatingStyle) => {
    switch (style) {
      case 'mint_3d':
        return {
          wrap: 'bg-[#eaf7f5] border-2 border-[#2dd4bf]',
          board: 'bg-gradient-to-b from-[#0f766e] to-[#134e4a] text-white border-2 border-[#2dd4bf]',
          desk: 'bg-white border-[#5eead4] text-teal-900',
          badge: 'bg-[#0f766e] text-white'
        };
      case 'navy_3d':
        return {
          wrap: 'bg-[#edf2fa] border-2 border-[#3b82f6]',
          board: 'bg-gradient-to-b from-[#0f172a] to-[#1e3a8a] text-white border-2 border-[#fbbf24]',
          desk: 'bg-white border-[#93c5fd] text-blue-900',
          badge: 'bg-[#1e3a8a] text-white'
        };
      case 'standard_2d':
        return {
          wrap: 'bg-white border-2 border-slate-300',
          board: 'bg-emerald-800 text-white border-2 border-emerald-950',
          desk: 'bg-slate-50 border-slate-300 text-slate-800',
          badge: 'bg-slate-700 text-white'
        };
      case 'rainbow_2d':
        return {
          wrap: 'bg-gradient-to-br from-indigo-50 via-pink-50 to-amber-50 border-2 border-purple-300',
          board: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-2 border-amber-300',
          desk: 'bg-white/90 border-purple-200 text-purple-900',
          badge: 'bg-purple-600 text-white'
        };
      case 'wood_3d':
      default:
        return {
          wrap: 'bg-[#f4ece1] border-2 border-[#c5a880]',
          board: 'bg-gradient-to-b from-[#1b5e39] to-[#124227] text-white border-2 border-[#8e6b3e]',
          desk: 'bg-[#fdf7ee] border-[#c5a880] text-[#7a4e21]',
          badge: 'bg-[#7d512a] text-white'
        };
    }
  };

  const seatingStyleConfig = getSeatingStyleClasses(config.seatingChartStyle);

  // Render Seating Grid Helper
  const renderSeatingDesks = (isEnlarged = true) => {
    return (
      <div 
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${seatingColumns}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: seatingColumns }).map((_, colIdx) => (
          <div key={colIdx} className="space-y-2 p-2 rounded-2xl bg-white/90 border border-slate-200 shadow-sm">
            <div className={`text-center py-1 text-[11px] font-black rounded-lg ${seatingStyleConfig.badge}`}>
              Dãy {colIdx + 1}
            </div>

            {Array.from({ length: 4 }).map((_, rIdx) => {
              const seatLKey = `${colIdx}-${rIdx}-0`;
              const seatRKey = `${colIdx}-${rIdx}-1`;
              const sLId = seatingAssignments[seatLKey];
              const sRId = seatingAssignments[seatRKey];
              const sL = classStudents.find(s => s.id === sLId);
              const sR = classStudents.find(s => s.id === sRId);

              return (
                <div key={rIdx} className={`p-1.5 rounded-xl border ${seatingStyleConfig.desk} grid grid-cols-2 gap-1.5 text-[9px] shadow-2xs`}>
                  {/* Left Seat */}
                  <div className="flex items-center gap-1.5 min-w-0 p-1 rounded-lg bg-white/70">
                    {sL ? (
                      <>
                        <img
                          src={sL.avatar}
                          alt={sL.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-300 shadow-xs"
                        />
                        <div className="min-w-0 truncate">
                          <div className="truncate font-black text-slate-900 leading-tight text-[10px]">
                            {sL.name.split(' ').pop()}
                          </div>
                          <div className="text-[8px] text-amber-700 font-bold font-mono">
                            🪙{sL.points}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-[8px] mx-auto">—</span>
                    )}
                  </div>

                  {/* Right Seat */}
                  <div className="flex items-center gap-1.5 min-w-0 p-1 rounded-lg bg-white/70 border-l border-slate-200">
                    {sR ? (
                      <>
                        <img
                          src={sR.avatar}
                          alt={sR.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-300 shadow-xs"
                        />
                        <div className="min-w-0 truncate">
                          <div className="truncate font-black text-slate-900 leading-tight text-[10px]">
                            {sR.name.split(' ').pop()}
                          </div>
                          <div className="text-[8px] text-amber-700 font-bold font-mono">
                            🪙{sR.points}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-[8px] mx-auto">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Section Content Renderers for Page 1
  const renderSectionContent = (secId: InfographicSectionId) => {
    switch (secId) {
      case 'header':
        if (!config.includeHeader) return null;
        return (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-5 shadow-md">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    <EditableText textKey="headerBadge" label="Thẻ tiêu đề trên cùng" defaultVal="INFOGRAPHIC LỚP HỌC HẠNH PHÚC" />
                  </span>
                  <span className="text-blue-200 text-xs font-bold">
                    • <EditableText textKey="academicYear" label="Năm học" defaultVal={targetClass?.academicYear || teacherProfile.academicYear || 'Năm học 2026 – 2027'} />
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>
                    <EditableText textKey="className" label="Tên lớp học" defaultVal={`LỚP ${targetClass?.name || '4A1'}`} />
                  </span>
                  <span className="text-sm font-bold text-blue-200 bg-white/20 px-2.5 py-0.5 rounded-xl">
                    <EditableText textKey="classGrade" label="Khối lớp" defaultVal={targetClass?.grade || 'Khối 4'} />
                  </span>
                </h1>
                <p className="text-xs text-blue-100/90 font-medium">
                  <EditableText textKey="schoolName" label="Tên trường học" defaultVal={teacherProfile.schoolName || 'Trường Tiểu học Số 1 TT Tân Uyên'} />
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center gap-3">
                <div className="text-center px-2">
                  <div className="text-2xl font-black text-amber-300 font-mono">
                    {classStudents.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-blue-100 font-bold">
                    Học sinh
                  </div>
                </div>
                <div className="h-8 w-px bg-white/30"></div>
                <div className="text-xs space-y-0.5 text-blue-100">
                  <div>👦 Nam: <strong>{maleCount}</strong></div>
                  <div>👧 Nữ: <strong>{femaleCount}</strong></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'slogan':
        if (!config.includeSlogan) return null;
        return (
          <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-3.5 text-center shadow-2xs">
            <div className="text-[11px] font-black uppercase text-amber-800 tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                <EditableText textKey="sloganHeader" label="Tiêu đề Slogan" defaultVal="SLOGAN & PHƯƠNG CHÂM HÀNH ĐỘNG" />
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-black text-[#78350f] mt-0.5 italic">
              "<EditableText textKey="classSlogan" label="Nội dung Slogan" defaultVal={defaultSlogan} />"
            </div>
          </div>
        );

      case 'teacher_parent':
        if (!config.includeTeacherInfo && !config.includeParentCommittee) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* GVCN */}
            {config.includeTeacherInfo && (
              <div className={`${config.includeParentCommittee ? 'md:col-span-5' : 'md:col-span-12'} p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5`}>
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    <EditableText textKey="teacherSectionTitle" label="Tiêu đề mục GVCN" defaultVal="Giáo Viên Chủ Nhiệm" />
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <img
                    src={teacherProfile.avatar}
                    alt="Avatar Giáo viên"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-indigo-300 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 truncate">
                      <EditableText 
                        textKey="teacherName" 
                        label="Họ tên Giáo viên"
                        defaultVal={targetClass?.teacherName ? `Cô ${targetClass.teacherName.replace(/^Cô\s+/i, '')}` : `Cô ${teacherProfile.name.replace(/^Cô\s+/i, '')}`} 
                      />
                    </div>
                    <div className="text-[11px] text-indigo-700 font-bold">
                      <EditableText textKey="teacherRole" label="Chức vụ GV" defaultVal={teacherProfile.role || 'Giáo viên phụ trách lớp'} />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>
                        <EditableText textKey="teacherPhone" label="SĐT Giáo viên" defaultVal={teacherProfile.phone || '0988 888 999'} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ban Phụ Huynh */}
            {config.includeParentCommittee && (
              <div className={`${config.includeTeacherInfo ? 'md:col-span-7' : 'md:col-span-12'} p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2`}>
                <div className="flex items-center justify-between text-xs font-black text-rose-950 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      <EditableText textKey="parentSectionTitle" label="Tiêu đề Ban phụ huynh" defaultVal="Ban Đại Diện Cha Mẹ Học Sinh Lớp" />
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-bold bg-white px-2 py-0.5 rounded-full border border-rose-200">
                    4 Thành viên
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Trưởng ban */}
                  <div className="bg-white p-2 rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] font-black text-rose-700 uppercase block">
                      Trưởng Ban Phụ Huynh:
                    </span>
                    <div className="font-bold text-slate-900 truncate">
                      <EditableText textKey="parentHeadName" label="Họ tên Trưởng ban PH" defaultVal={parentCommittee.head.name} />
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      <EditableText textKey="parentHeadPhone" label="SĐT Trưởng ban PH" defaultVal={parentCommittee.head.phone} />
                    </div>
                  </div>

                  {/* Phó ban */}
                  <div className="bg-white p-2 rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] font-black text-amber-700 uppercase block">
                      Phó Ban Phụ Huynh:
                    </span>
                    <div className="font-bold text-slate-900 truncate">
                      <EditableText textKey="parentDeputyName" label="Họ tên Phó ban PH" defaultVal={parentCommittee.deputy.name} />
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      <EditableText textKey="parentDeputyPhone" label="SĐT Phó ban PH" defaultVal={parentCommittee.deputy.phone} />
                    </div>
                  </div>

                  {/* Ủy viên 1 */}
                  <div className="bg-white p-2 rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] font-black text-slate-600 uppercase block">
                      Ủy Viên 1:
                    </span>
                    <div className="font-bold text-slate-900 truncate">
                      <EditableText textKey="parentMember1Name" label="Họ tên Ủy viên 1" defaultVal={parentCommittee.member1.name} />
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      <EditableText textKey="parentMember1Phone" label="SĐT Ủy viên 1" defaultVal={parentCommittee.member1.phone} />
                    </div>
                  </div>

                  {/* Ủy viên 2 */}
                  <div className="bg-white p-2 rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] font-black text-slate-600 uppercase block">
                      Ủy Viên 2:
                    </span>
                    <div className="font-bold text-slate-900 truncate">
                      <EditableText textKey="parentMember2Name" label="Họ tên Ủy viên 2" defaultVal={parentCommittee.member2.name} />
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      <EditableText textKey="parentMember2Phone" label="SĐT Ủy viên 2" defaultVal={parentCommittee.member2.phone} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'timetable':
        if (!config.includeTimetable) return null;
        return (
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-900 uppercase">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  <EditableText textKey="timetableTitle" label="Tiêu đề TKB" defaultVal="Thời Khóa Biểu Học Tập Trong Tuần" />
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 lowercase">
                (áp dụng học kỳ hiện tại)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-[10px] text-center border-collapse">
                <thead>
                  <tr className={ttClasses.header}>
                    <th className="py-1 px-1 border-r border-white/20 w-12">Buổi</th>
                    <th className="py-1 px-1 border-r border-white/20 w-8">Tiết</th>
                    {daysToShow.map(d => (
                      <th key={d.day} className="py-1 px-1 border-r border-white/20">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((period, idx) => (
                    <tr key={`m-${period}`} className="border-b border-slate-100">
                      {idx === 0 && (
                        <td rowSpan={5} className={`py-1 px-1 font-black ${ttClasses.morningHeader} border-r border-slate-200`}>
                          SÁNG
                        </td>
                      )}
                      <td className="py-1 px-1 font-bold text-slate-600 border-r border-slate-200 bg-slate-50">
                        {period}
                      </td>
                      {daysToShow.map(d => {
                        const slot = timetable.find(t => 
                          t.day === d.day && 
                          t.period === period && 
                          t.session === 'morning' &&
                          (!t.classId || t.classId === targetClass?.id)
                        );
                        return (
                          <td key={d.day} className={`py-1 px-1 border-r border-slate-100 font-semibold ${ttClasses.cellBg}`}>
                            {slot?.subject || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {[1, 2, 3, 4].map((period, idx) => (
                    <tr key={`a-${period}`} className="border-b border-slate-100">
                      {idx === 0 && (
                        <td rowSpan={4} className={`py-1 px-1 font-black ${ttClasses.afternoonHeader} border-r border-slate-200`}>
                          CHIỀU
                        </td>
                      )}
                      <td className="py-1 px-1 font-bold text-slate-600 border-r border-slate-200 bg-slate-50">
                        {period}
                      </td>
                      {daysToShow.map(d => {
                        const slot = timetable.find(t => 
                          t.day === d.day && 
                          t.period === period && 
                          t.session === 'afternoon' &&
                          (!t.classId || t.classId === targetClass?.id)
                        );
                        return (
                          <td key={d.day} className={`py-1 px-1 border-r border-slate-100 font-semibold ${ttClasses.cellBg}`}>
                            {slot?.subject || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'seating':
        // Trong chế độ 3 trang, Trang 1 không hiển thị sơ đồ để dành trọn vẹn cho Trang 2
        if (config.pageMode === 'three_pages') return null;
        if (!config.includeSeatingChart) return null;
        return (
          <div className={`p-3.5 rounded-2xl ${seatingStyleConfig.wrap} space-y-2.5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase">
              <div className="flex items-center gap-1.5 text-slate-900">
                <Grid3X3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  <EditableText 
                    textKey="seatingTitle" 
                    label="Tiêu đề sơ đồ chỗ ngồi"
                    defaultVal={`Sơ Đồ Chỗ Ngồi Lớp Học (${savedSeatingSnapshot ? savedSeatingSnapshot.columns : seatingColumns} Dãy Bàn)`} 
                  />
                </span>
              </div>
            </div>

            {savedSeatingSnapshot ? (
              <div className="rounded-2xl overflow-hidden border border-indigo-200 bg-white p-1">
                <img
                  src={savedSeatingSnapshot.image}
                  alt={`Sơ đồ lớp ${targetClass?.name}`}
                  className="w-full h-auto object-contain rounded-xl max-h-[380px]"
                />
              </div>
            ) : (
              renderSeatingDesks(false)
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const activeStyle = activeFormatKey ? (textStyles[activeFormatKey] || {}) : {};

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Banner Toolbar */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover-zoom-card">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight flex items-center gap-2">
                <span>Infographic Lớp Học</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  Lớp {targetClass?.name} • {
                    config.pageMode === 'three_pages' 
                      ? '⭐ Chế Độ 3 Trang A4 Chuẩn' 
                      : config.pageMode === 'two_pages' 
                      ? '2 Trang A4 Dọc' 
                      : '1 Trang A4'
                  }
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Poster tổng quan: Đồ họa thông tin, sơ đồ chỗ ngồi, TKB, ban phụ huynh & bảng vàng 100% học sinh đầy đủ
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Switcher */}
          {classes.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 pl-2">Lớp:</span>
              <select
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                  setConfig(prev => ({ ...prev, selectedClassId: e.target.value }));
                }}
                className="bg-white text-xs font-black text-indigo-900 py-1.5 px-3 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Inline Text Editing */}
          <button
            type="button"
            onClick={() => setIsTextEditMode(!isTextEditMode)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-2xl border transition-all cursor-pointer ${
              isTextEditMode 
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs ring-2 ring-amber-200' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Bật/Tắt chế độ sửa chữ trực tiếp và chỉnh định dạng/vị trí trên infographic"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>{isTextEditMode ? 'Đang Bật Sửa Chữ' : 'Bật Sửa Chữ'}</span>
          </button>

          {/* Mode Switcher 3 Trang / 2 Trang / 1 Trang */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setConfig(prev => ({ ...prev, pageMode: 'three_pages' }));
                confetti({ particleCount: 30, spread: 60 });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                config.pageMode === 'three_pages'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chế độ 3 Trang A4: Trang 1 (Thông tin & TKB) • Trang 2 (Sơ đồ lớp) • Trang 3 (Danh sách thành viên)"
            >
              ⭐ 3 Trang A4
            </button>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, pageMode: 'two_pages' }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                config.pageMode === 'two_pages'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chế độ 2 Trang A4 Dọc"
            >
              2 Trang
            </button>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, pageMode: 'single_page' }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                config.pageMode === 'single_page'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chế độ 1 Trang A4 Rút gọn"
            >
              1 Trang
            </button>
          </div>

          {/* Wizard Config Button */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 rounded-2xl shadow-md shadow-indigo-600/25 transition-all hover-zoom-btn cursor-pointer"
            title="Tùy biến sắp xếp thứ tự nội dung và mẫu sư phạm"
          >
            <Wand2 className="w-4 h-4 text-amber-300" />
            <span>Tạo Lại Infographic</span>
          </button>

          {/* Tải PNG */}
          <button
            onClick={() => handleExportPng('both')}
            disabled={isExportingPng}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl shadow-xs transition-all hover-zoom-btn disabled:opacity-50 cursor-pointer"
            title="Tải ảnh PNG các trang sắc nét"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isExportingPng ? 'Đang xuất PNG...' : 'Tải Ảnh PNG'}</span>
          </button>

          {/* Xuất PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md shadow-indigo-600/20 transition-all hover-zoom-btn disabled:opacity-50 cursor-pointer"
            title="Xuất file PDF toàn bộ các trang chuẩn A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Đang xuất PDF...' : `Xuất File In PDF (${config.pageMode === 'three_pages' ? '3 Trang' : config.pageMode === 'two_pages' ? '2 Trang' : '1 Trang'})`}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING TEXT FORMATTING & POSITION TOOLBAR (Yêu cầu người dùng) */}
      {/* ========================================================================= */}
      {isTextEditMode && activeFormatKey && (
        <div className="sticky top-3 z-40 bg-white/95 backdrop-blur-md rounded-3xl p-3.5 shadow-2xl border-2 border-indigo-400 animate-in fade-in slide-in-from-top-3 duration-150 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs font-black text-indigo-950">
                Đang định dạng mục: <strong className="text-indigo-600">{activeFormatLabel}</strong>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">({activeFormatKey})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditableTexts(prev => ({ ...prev, [activeFormatKey]: '' }));
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Xóa nội dung chữ này khỏi hiển thị"
              >
                <X className="w-3 h-3 text-rose-600" />
                <span>Xóa chữ</span>
              </button>

              <button
                type="button"
                onClick={resetActiveFormat}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Khôi phục lại kiểu chữ mặc định cho mục này"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại định dạng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormatKey(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                title="Đóng thanh định dạng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* 1. Chọn Font chữ */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Type className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={activeStyle.fontFamily || FONT_OPTIONS[0].value}
                onChange={(e) => updateActiveStyle({ fontFamily: e.target.value })}
                className="bg-white text-xs font-bold text-slate-800 py-1 px-2 rounded-lg border border-slate-200 focus:outline-none cursor-pointer max-w-[180px]"
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Cỡ chữ */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 pl-1">Cỡ chữ:</span>
              <button
                type="button"
                onClick={() => updateActiveStyle({ fontSize: Math.max(8, (activeStyle.fontSize || 14) - 2) })}
                className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 font-black text-slate-700 flex items-center justify-center cursor-pointer"
                title="Giảm cỡ chữ"
              >
                -
              </button>
              <span className="w-10 text-center font-mono font-bold text-indigo-900 text-xs">
                {activeStyle.fontSize || 14}px
              </span>
              <button
                type="button"
                onClick={() => updateActiveStyle({ fontSize: Math.min(64, (activeStyle.fontSize || 14) + 2) })}
                className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 font-black text-slate-700 flex items-center justify-center cursor-pointer"
                title="Tăng cỡ chữ"
              >
                +
              </button>
            </div>

            {/* 3. Màu chữ */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Palette className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateActiveStyle({ color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      activeStyle.color === c ? 'scale-125 ring-2 ring-indigo-500 border-white' : 'border-slate-300'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={activeStyle.color || '#0f172a'}
                  onChange={(e) => updateActiveStyle({ color: e.target.value })}
                  className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  title="Chọn màu tự do"
                />
              </div>
            </div>

            {/* 4. Định dạng Đậm, Nghiêng, Gạch chân */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => updateActiveStyle({ fontWeight: activeStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`w-7 h-7 rounded-lg font-black flex items-center justify-center transition-colors cursor-pointer ${
                  activeStyle.fontWeight === 'bold' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-700'
                }`}
                title="In đậm (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => updateActiveStyle({ fontStyle: activeStyle.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  activeStyle.fontStyle === 'italic' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-700'
                }`}
                title="In nghiêng (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => updateActiveStyle({ textDecoration: activeStyle.textDecoration === 'underline' ? 'none' : 'underline' })}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  activeStyle.textDecoration === 'underline' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-700'
                }`}
                title="Gạch chân (Underline)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5. Căn lề */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => updateActiveStyle({ textAlign: 'left' })}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  activeStyle.textAlign === 'left' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-700'
                }`}
                title="Căn lề trái"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateActiveStyle({ textAlign: 'center' })}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  activeStyle.textAlign === 'center' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-700'
                }`}
                title="Căn giữa"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateActiveStyle({ textAlign: 'right' })}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  activeStyle.textAlign === 'right' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-700'
                }`}
                title="Căn lề phải"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 6. Di chuyển vị trí trình bày trên trang (Yêu cầu người dùng) */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Move className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Dịch chuyển vị trí:</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveActiveText(-5, 0)}
                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                  title="Dịch sang trái 5px"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveActiveText(5, 0)}
                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                  title="Dịch sang phải 5px"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveActiveText(0, -4)}
                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                  title="Dịch lên trên 4px"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveActiveText(0, 4)}
                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                  title="Dịch xuống dưới 4px"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {(activeStyle.offsetX || activeStyle.offsetY) ? (
                <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                  <span>X:{activeStyle.offsetX || 0} Y:{activeStyle.offsetY || 0}</span>
                  <button
                    type="button"
                    onClick={() => updateActiveStyle({ offsetX: 0, offsetY: 0 })}
                    className="text-rose-500 hover:text-rose-700 font-bold ml-0.5 cursor-pointer"
                    title="Về vị trí gốc (0,0)"
                  >
                    ×
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-xs p-2 rounded-2xl border border-slate-200 max-w-4xl mx-auto shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📄 {config.pageMode === 'three_pages' ? 'Xem Cả 3 Trang A4' : config.pageMode === 'two_pages' ? 'Xem Cả 2 Trang A4' : 'Xem Trang A4'}
          </button>

          <button
            onClick={() => setActiveTab('page1')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'page1'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Trang 1: Thông Tin & TKB
          </button>

          {config.pageMode === 'three_pages' && (
            <button
              onClick={() => setActiveTab('page2_seating')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'page2_seating'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span>🪑 Trang 2: Sơ Đồ Lớp Học</span>
            </button>
          )}

          {(config.pageMode === 'three_pages' || config.pageMode === 'two_pages') && (
            <button
              onClick={() => setActiveTab('page3_students')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'page3_students'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {config.pageMode === 'three_pages' ? 'Trang 3: Danh Sách Thành Viên' : 'Trang 2: Danh Sách Thành Viên'} ({classStudents.length} em)
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 font-bold pr-2 hidden sm:block">
          Khổ A4 Chuẩn In Ấn
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHỔ GIẤY DỌC A4 CHUẨN: TRANG 1, TRANG 2 (SƠ ĐỒ), TRANG 3 (DANH SÁCH) */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center gap-8 bg-slate-200/50 p-3 sm:p-6 rounded-3xl border border-slate-300/80 overflow-x-auto">
        
        {/* ===================================================================== */}
        {/* TRANG 1: THÔNG TIN LỚP, SLOGAN, GVCN, BAN PHỤ HUYNH, THỜI KHÓA BIỂU */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'page1') && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-[800px] flex items-center justify-between text-xs font-black text-slate-600 mb-2 px-2">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>TRANG 1: THÔNG TIN LỚP, SLOGAN, GIÁO VIÊN & THỜI KHÓA BIỂU</span>
              </span>
              <button
                onClick={() => handleExportPng('page1')}
                className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Tải ảnh Trang 1</span>
              </button>
            </div>

            <div 
              ref={page1Ref}
              id="printable-infographic-page-1"
              className="bg-white text-slate-800 shadow-2xl rounded-2xl border border-slate-300 w-full max-w-[800px] min-h-[1130px] p-6 sm:p-8 space-y-4 relative overflow-hidden"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
              }}
            >
              {/* DYNAMIC DRAGGABLE SECTION RENDERING */}
              {sectionOrder.map((secId, idx) => {
                if (secId === 'header' && !config.includeHeader) return null;
                if (secId === 'slogan' && !config.includeSlogan) return null;
                if (secId === 'teacher_parent' && !config.includeTeacherInfo && !config.includeParentCommittee) return null;
                if (secId === 'seating' && config.pageMode === 'three_pages') return null; // Trang 2 riêng biệt trong chế độ 3 trang
                if (secId === 'timetable' && !config.includeTimetable) return null;

                return (
                  <div
                    key={secId}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => {
                      setDraggedSectionIndex(null);
                      setDragOverSectionIndex(null);
                    }}
                    className={`group/sec relative transition-all rounded-2xl ${
                      dragOverSectionIndex === idx ? 'ring-2 ring-indigo-500 scale-[1.01]' : ''
                    }`}
                  >
                    {/* Drag Handle & Up/Down Arrows */}
                    <div className="no-print no-pdf absolute top-2 right-2 z-20 opacity-0 group-hover/sec:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs px-2 py-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 text-[11px] font-bold text-slate-600">
                      <div className="cursor-grab active:cursor-grabbing flex items-center gap-1 text-slate-400 hover:text-indigo-600" title="Kéo thả để đổi thứ tự mục này">
                        <GripVertical className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Kéo</span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'up')}
                        className="p-1 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 rounded disabled:opacity-30 cursor-pointer"
                        title="Di chuyển lên trên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sectionOrder.length - 1}
                        onClick={() => moveSection(idx, 'down')}
                        className="p-1 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 rounded disabled:opacity-30 cursor-pointer"
                        title="Di chuyển xuống dưới"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {renderSectionContent(secId)}
                  </div>
                );
              })}

              {/* Chú thích chuyển tiếp sang Trang 2 Sơ đồ */}
              {config.pageMode === 'three_pages' && (
                <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                    <Grid3X3 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Sơ đồ chỗ ngồi toàn bộ lớp học được trình bày chi tiết tại <strong>Trang 2 (Khổ A4 lớn)</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('page2_seating')}
                    className="text-[11px] font-black text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs cursor-pointer"
                  >
                    Xem Trang 2 ➔
                  </button>
                </div>
              )}

              {/* FOOTER TRANG 1 */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-semibold">
                <div>
                  <EditableText textKey="footerSystemName" label="Chân trang hệ thống" defaultVal="Hệ Sinh Thái Quản Lý Lớp Học Hạnh Phúc • Bản quyền sư phạm" />
                </div>
                <div className="text-right">
                  <EditableText textKey="footerPage1Note" label="Ghi chú chân Trang 1" defaultVal={`Trang 1 / ${config.pageMode === 'three_pages' ? '3' : '2'} • Lớp ${targetClass?.name || '4A1'} • Năm học ${targetClass?.academicYear || teacherProfile.academicYear}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TRANG 2: SƠ ĐỒ LỚP HỌC ĐÃ TẠO (TRANG RIÊNG BIỆT KHỔ A4 RỘNG RÃI) */}
        {/* ===================================================================== */}
        {config.pageMode === 'three_pages' && (activeTab === 'all' || activeTab === 'page2_seating') && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-[800px] flex items-center justify-between text-xs font-black text-slate-600 mb-2 px-2">
              <span className="flex items-center gap-1.5">
                <Grid3X3 className="w-4 h-4 text-blue-600" />
                <span>TRANG 2 / 3: SƠ ĐỒ LỚP HỌC ĐÃ TẠO (TOÀN BỘ VÀ ĐẦY ĐỦ NỘI DUNG)</span>
              </span>
              <button
                onClick={() => handleExportPng('page2_seating')}
                className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Tải ảnh Trang 2 (Sơ Đồ)</span>
              </button>
            </div>

            <div 
              ref={pageSeatingRef}
              id="printable-infographic-page-seating"
              className="bg-white text-slate-800 shadow-2xl rounded-2xl border border-slate-300 w-full max-w-[800px] min-h-[1130px] p-6 sm:p-8 space-y-5 relative overflow-hidden"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
              }}
            >
              {/* Header Sơ Đồ Lớp Trang 2 */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-800 to-sky-700 text-white p-5 shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                      <EditableText textKey="seatingPageBadge" label="Thẻ tiêu đề Trang 2" defaultVal="SƠ ĐỒ BỐ TRÍ CHỖ NGỒI LỚP HỌC • TRANG 2" />
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                      <EditableText textKey="seatingPageTitle" label="Tiêu đề Sơ đồ lớp" defaultVal={`SƠ ĐỒ BỐ TRÍ CHỖ NGỒI LỚP ${targetClass?.name?.toUpperCase()}`} />
                    </h2>
                    <p className="text-xs text-blue-100 font-medium">
                      <EditableText textKey="seatingPageSubtitle" label="Phụ đề Sơ đồ lớp" defaultVal={`Năm học: ${targetClass?.academicYear || teacherProfile.academicYear} • GVCN: Cô ${targetClass?.teacherName || teacherProfile.name}`} />
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 text-right text-xs">
                    <div className="font-black text-amber-300">
                      QUY MÔ: {seatingColumns} DÃY BÀN
                    </div>
                    <div className="text-[11px] text-blue-100 mt-0.5">
                      Tổng số: {classStudents.length} học sinh
                    </div>
                  </div>
                </div>
              </div>

              {/* KHUNG SƠ ĐỒ LỚP HỌC TOÀN BỘ ĐẦY ĐỦ RỘNG RÃI - NGUYÊN BẢN ẢNH SƠ ĐỒ ĐÃ TẠO */}
              {(() => {
                const tr = frameTransforms.seating_p2 || { scale: 1, widthPercent: 100, offsetX: 0, offsetY: 0 };
                return (
                  <div className="relative group/seating-frame">
                    {/* Thanh công cụ kéo giãn to nhỏ và di chuyển vị trí sơ đồ lớp */}
                    <div className="no-print no-pdf flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-2xl border border-slate-200 mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Move className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Kéo giãn & Vị trí ảnh:</span>
                        </span>
                        
                        {/* Thu nhỏ / Phóng to */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateFrameTransform('seating_p2', { scale: Math.max(0.6, tr.scale - 0.05) })}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                            title="Thu nhỏ sơ đồ"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-indigo-900 w-10 text-center">
                            {Math.round(tr.scale * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => updateFrameTransform('seating_p2', { scale: Math.min(1.5, tr.scale + 0.05) })}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                            title="Phóng to sơ đồ"
                          >
                            +
                          </button>
                        </div>

                        {/* Kéo giãn chiều ngang */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold">Chiều rộng:</span>
                          <button
                            type="button"
                            onClick={() => updateFrameTransform('seating_p2', { widthPercent: Math.max(60, tr.widthPercent - 5) })}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                            title="Co hẹp chiều ngang"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-slate-800 w-9 text-center">
                            {tr.widthPercent}%
                          </span>
                          <button
                            type="button"
                            onClick={() => updateFrameTransform('seating_p2', { widthPercent: Math.min(100, tr.widthPercent + 5) })}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                            title="Kéo rộng chiều ngang"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Nút kéo chuột di chuyển trực tiếp */}
                        <button
                          type="button"
                          onMouseDown={(e) => handleFrameDrag(e, 'seating_p2')}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center gap-1 cursor-move select-none"
                          title="Giữ chuột và kéo để di chuyển vị trí khung sơ đồ trực tiếp"
                        >
                          <Move className="w-3 h-3" />
                          <span>Giữ để Kéo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => resetFrameTransform('seating_p2')}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-white text-[11px] font-bold cursor-pointer"
                          title="Đặt lại kích thước và vị trí mặc định"
                        >
                          Đặt lại
                        </button>
                      </div>
                    </div>

                    {/* Vùng hiển thị nguyên bản ảnh sơ đồ lớp đã tạo */}
                    <div 
                      className={`mx-auto transition-transform ${seatingStyleConfig.wrap} rounded-2xl p-3 shadow-md bg-white border-2 border-indigo-100 overflow-hidden relative`}
                      style={{
                        width: `${tr.widthPercent}%`,
                        transform: `translate(${tr.offsetX}px, ${tr.offsetY}px) scale(${tr.scale})`,
                        transformOrigin: 'top center'
                      }}
                    >
                      {savedSeatingSnapshot ? (
                        <img
                          src={savedSeatingSnapshot.image}
                          alt={`Sơ đồ nguyên bản lớp học ${targetClass?.name}`}
                          className="w-full h-auto object-contain rounded-xl block max-h-[720px] mx-auto shadow-xs"
                        />
                      ) : (
                        <div className="space-y-3 py-4 text-center">
                          {renderSeatingDesks(true)}
                          <div className="no-print no-pdf pt-3 border-t border-slate-200 flex items-center justify-center gap-2">
                            <span className="text-xs text-slate-500">Chưa có ảnh chụp nhanh từ trang Tạo Sơ Đồ Lớp?</span>
                            {onNavigate && (
                              <button
                                type="button"
                                onClick={() => onNavigate('seating')}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                              >
                                Mở Sơ Đồ Lớp để chụp ảnh mới ➔
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Chú giải và Kế hoạch chỗ ngồi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-black text-slate-900 text-xs">
                    <EditableText textKey="p2RulesTitle" label="Tiêu đề quy định chỗ ngồi" defaultVal="📌 Quy Định Chỗ Ngồi Lớp Học:" />
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>
                      <EditableText textKey="p2Rule1" label="Quy định 1" defaultVal="• Học sinh ngồi đúng vị trí quy định, bảo quản tài sản và bàn ghế ngăn nắp." />
                    </div>
                    <div>
                      <EditableText textKey="p2Rule2" label="Quy định 2" defaultVal="• Đôi bạn cùng tiến trao đổi, tương trợ tích cực trong giờ học." />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                  <div className="font-black text-indigo-950 text-xs">
                    <EditableText textKey="p2RotationTitle" label="Tiêu đề kế hoạch xoay vòng" defaultVal="🎯 Kế Hoạch Xoay Vòng Chỗ Ngồi:" />
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    <EditableText textKey="seatingRotationNote" label="Ghi chú xoay vòng chỗ ngồi" defaultVal="Xoay vòng dãy bàn định kỳ 2 tuần/lần để đảm bảo thị lực và cân bằng góc nhìn cho tất cả học sinh." />
                  </div>
                </div>
              </div>

              {/* FOOTER TRANG 2 */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-semibold">
                <div>
                  <EditableText textKey="p2FooterLeft" label="Chân trang 2 bên trái" defaultVal="Trang 2 / 3 • Sơ đồ chỗ ngồi lớp học • Lưu hành nội bộ" />
                </div>
                <div>
                  <EditableText textKey="p2FooterRight" label="Chân trang 2 bên phải" defaultVal={`Giáo viên chủ nhiệm: Cô ${targetClass?.teacherName || teacherProfile.name}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TRANG 3 (HOẶC TRANG 2 NẾU CHẾ ĐỘ 2 TRANG): DANH SÁCH THÀNH VIÊN LỚP */}
        {/* ===================================================================== */}
        {(config.pageMode === 'three_pages' || config.pageMode === 'two_pages') && (activeTab === 'all' || activeTab === 'page3_students') && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-[800px] flex items-center justify-between text-xs font-black text-slate-600 mb-2 px-2">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>{config.pageMode === 'three_pages' ? 'TRANG 3 / 3' : 'TRANG 2 / 2'}: DANH SÁCH THÀNH VIÊN LỚP HỌC (100% HỌC SINH ĐẦY ĐỦ)</span>
              </span>
              <button
                onClick={() => handleExportPng('page3_students')}
                className="text-emerald-600 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Tải ảnh Trang Danh Sách</span>
              </button>
            </div>

            <div 
              ref={pageStudentsRef}
              id="printable-infographic-page-students"
              className="bg-white text-slate-800 shadow-2xl rounded-2xl border border-slate-300 w-full max-w-[800px] min-h-[1130px] p-6 sm:p-8 space-y-4 relative overflow-hidden"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
              }}
            >
              {/* HEADER BẢNG VÀNG */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-800 text-white p-5 shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                      <EditableText textKey="page3Badge" label="Thẻ tiêu đề Danh sách" defaultVal="HỒ SƠ HỌC SINH LỚP HỌC" />
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                      <EditableText textKey="page3Title" label="Tiêu đề Danh sách lớp" defaultVal={`DANH SÁCH THÀNH VIÊN LỚP ${targetClass?.name?.toUpperCase()}`} />
                    </h2>
                    <p className="text-xs text-emerald-100 font-medium">
                      <EditableText textKey="page3Subtitle" label="Phụ đề Danh sách lớp" defaultVal={`Năm học: ${targetClass?.academicYear || teacherProfile.academicYear} • GVCN: Cô ${targetClass?.teacherName || teacherProfile.name}`} />
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 text-right text-xs">
                    <div className="font-black text-amber-300">
                      TỔNG SỐ: {classStudents.length} HỌC SINH
                    </div>
                    <div className="text-[11px] text-emerald-100 mt-0.5">
                      Nam: {maleCount} • Nữ: {femaleCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* BẢNG CHI TIẾT 100% HỌC SINH */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-200 text-[10px] uppercase font-black">
                      <th className="py-2 px-1.5 text-center w-8 border-r border-slate-200">STT</th>
                      <th className="py-2 px-1 text-center w-10 border-r border-slate-200">Ảnh</th>
                      <th className="py-2 px-2 text-center w-16 border-r border-slate-200">Mã HS</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">Họ và Tên</th>
                      <th className="py-2 px-2 text-center w-20 border-r border-slate-200">Ngày sinh</th>
                      <th className="py-2 px-1.5 text-center w-14 border-r border-slate-200">Giới tính</th>
                      <th className="py-2 px-1.5 text-center w-14 border-r border-slate-200">Tổ</th>
                      <th className="py-2 px-2 border-r border-slate-200">Chức vụ / Nhiệm vụ</th>
                      <th className="py-2 px-2 text-center w-16 border-r border-slate-200">Xu ⭐</th>
                      <th className="py-2 px-2 text-center w-20">Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((st, index) => {
                      let role = 'Thành viên';
                      if (st.stt === 1) role = 'Lớp trưởng';
                      else if (st.stt === 2) role = 'Lớp phó học tập';
                      else if (st.stt === 3) role = 'Lớp phó phong trào';
                      else if (st.stt === 4) role = 'Tổ trưởng Tổ 1';
                      else if (st.stt === 5) role = 'Tổ trưởng Tổ 2';
                      else if (st.stt === 6) role = 'Tổ trưởng Tổ 3';
                      else if (st.stt === 7) role = 'Tổ trưởng Tổ 4';

                      const groupName = st.group || `Tổ ${((st.stt - 1) % 4) + 1}`;
                      const ranking = st.points >= 25 ? 'Xuất sắc' : st.points >= 15 ? 'Tốt' : st.points >= 8 ? 'Khá' : 'Chăm ngoan';

                      return (
                        <tr 
                          key={st.id} 
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          }`}
                        >
                          <td className="py-1.5 px-1.5 text-center font-bold text-slate-500 border-r border-slate-100">
                            {st.stt}
                          </td>
                          <td className="py-1 px-1 text-center border-r border-slate-100">
                            <img
                              src={st.avatar}
                              alt={st.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 mx-auto shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80';
                              }}
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-600 text-[10px] border-r border-slate-100">
                            HS{String(st.stt).padStart(2, '0')}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-100">
                            {st.name}
                          </td>
                          <td className="py-1.5 px-2 text-center text-slate-600 font-mono text-[10px] border-r border-slate-100">
                            {st.birthDate || '—'}
                          </td>
                          <td className="py-1.5 px-1.5 text-center border-r border-slate-100">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${
                              st.gender === 'Nam' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {st.gender}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5 text-center text-slate-700 font-medium border-r border-slate-100 text-[10px]">
                            {groupName}
                          </td>
                          <td className="py-1.5 px-2 text-slate-700 border-r border-slate-100 text-[10px]">
                            <span className={`font-semibold ${
                              role !== 'Thành viên' ? 'text-indigo-700 font-bold' : 'text-slate-600'
                            }`}>
                              {role}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-100 font-mono font-black text-amber-700 text-[10px]">
                            {st.points} ⭐
                          </td>
                          <td className="py-1.5 px-2 text-center text-[10px] font-bold">
                            <span className={`px-1.5 py-0.5 rounded ${
                              ranking === 'Xuất sắc'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ranking === 'Tốt'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ranking}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PHẦN KÝ TÊN 3 BÊN */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-600 uppercase text-[10px]">
                      <EditableText textKey="signParentLabel" label="Tiêu đề Ký Đại diện PH" defaultVal="ĐẠI DIỆN BAN PHỤ HUYNH" />
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      (Ký và ghi rõ họ tên)
                    </div>
                    <div className="h-14"></div>
                    <div className="font-black text-slate-900 text-xs">
                      <EditableText textKey="signParentName" label="Họ tên người ký PH" defaultVal={parentCommittee.head.name} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-slate-600 uppercase text-[10px]">
                      <EditableText textKey="signSchoolLabel" label="Tiêu đề Ký BGH" defaultVal="BAN GIÁM HIỆU NHÀ TRƯỜNG" />
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      (Ký duyệt và đóng dấu)
                    </div>
                    <div className="h-14"></div>
                    <div className="font-black text-slate-900 text-xs">
                      <EditableText textKey="signSchoolLeader" label="Chức danh người ký BGH" defaultVal="Hiệu trưởng" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-slate-600 uppercase text-[10px]">
                      <EditableText textKey="signTeacherLabel" label="Tiêu đề Ký GVCN" defaultVal="GIÁO VIÊN CHỦ NHIỆM" />
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      (Ký và ghi rõ họ tên)
                    </div>
                    <div className="h-14"></div>
                    <div className="font-black text-slate-900 text-xs">
                      <EditableText textKey="signTeacherName" label="Họ tên người ký GVCN" defaultVal={`Cô ${targetClass?.teacherName || teacherProfile.name}`} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <div>
                    <EditableText textKey="p3FooterLeft" label="Chân trang 3 bên trái" defaultVal="Hồ sơ thành viên lớp học • Lưu hành nội bộ nhà trường" />
                  </div>
                  <div>
                    <EditableText textKey="p3FooterRight" label="Chân trang 3 bên phải" defaultVal={config.pageMode === 'three_pages' ? 'Trang 3 / 3 • Danh Sách Thành Viên Lớp Học' : 'Trang 2 / 2 • Danh Sách Thành Viên Lớp Học'} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* WIZARD MODAL: TẠO LẠI INFOGRAPHIC & BỐ TRÍ THỨ TỰ */}
      {/* ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-indigo-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Wand2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tùy Biến & Sắp Xếp Thứ Tự Infographic
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn chế độ 3 trang A4 chuẩn, kéo thả thứ tự và mẫu sư phạm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. CHỌN CHẾ ĐỘ TRANG (Yêu cầu người dùng: Thêm lựa chọn 3 trang A4) */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between font-black text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>1. Chế độ trình bày số trang Infographic:</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    Khuyên dùng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, pageMode: 'three_pages' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                      config.pageMode === 'three_pages'
                        ? 'bg-indigo-100/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">📑</span>
                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[8px] font-black">Chuẩn nhất</span>
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-xs">
                        3 Trang A4 Chuẩn
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                        T1: Thông tin & TKB • T2: Sơ đồ lớp • T3: Danh sách HS
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, pageMode: 'two_pages' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                      config.pageMode === 'two_pages'
                        ? 'bg-indigo-100/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="font-black text-slate-900 text-xs">
                        2 Trang A4 Dọc
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                        T1: Tổng quan & TKB & Sơ đồ • T2: Danh sách HS
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, pageMode: 'single_page' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                      config.pageMode === 'single_page'
                        ? 'bg-indigo-100/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">📋</span>
                    <div>
                      <div className="font-black text-slate-900 text-xs">
                        1 Trang A4 (Rút gọn)
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                        Tóm tắt toàn bộ lớp học trên 1 trang duy nhất
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. KÉO THẢ THỨ TỰ TRÊN TRANG 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 flex items-center gap-1.5">
                    <GripVertical className="w-4 h-4 text-indigo-600" />
                    <span>2. Thứ tự hiển thị các khối nội dung trên Trang 1:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Kéo thả hoặc bấm ⬆️/⬇️
                  </span>
                </div>

                <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                  {sectionOrder.map((secId, idx) => (
                    <div
                      key={secId}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-black text-slate-400 w-4">{idx + 1}.</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <span>{SECTION_LABELS[secId]?.icon}</span>
                          <span>{SECTION_LABELS[secId]?.title}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSection(idx, 'up')}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="Lên trên"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sectionOrder.length - 1}
                          onClick={() => moveSection(idx, 'down')}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="Xuống dưới"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. BẬT/TẮT CÁC MỤC NỘI DUNG */}
              <div className="space-y-2">
                <div className="font-black text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>3. Bật / Tắt các mục nội dung trên Infographic:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'includeHeader', label: 'Đồ họa tiêu đề & Sĩ số lớp', desc: 'Banner lớp, năm học, sĩ số' },
                    { key: 'includeSlogan', label: 'Khẩu hiệu / Slogan của lớp', desc: 'Slogan truyền cảm hứng' },
                    { key: 'includeTeacherInfo', label: 'Thông tin giáo viên chủ nhiệm', desc: 'Họ tên, avatar, liên lạc' },
                    { key: 'includeParentCommittee', label: 'Ban đại diện cha mẹ học sinh', desc: 'Trưởng ban, Phó ban, 2 Ủy viên' },
                    { key: 'includeSeatingChart', label: 'Sơ đồ chỗ ngồi của lớp', desc: 'Bố trí tại Trang 2 riêng biệt' },
                    { key: 'includeTimetable', label: 'Thời khóa biểu của lớp', desc: 'Lịch học Sáng & Chiều trong tuần' },
                    { key: 'includeStudentStats', label: 'Danh sách thành viên lớp học', desc: 'Bảng vàng 100% học sinh đầy đủ' }
                  ].map(item => (
                    <label 
                      key={item.key}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 flex items-start gap-2.5 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={config[item.key as keyof InfographicConfig] as boolean}
                        onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-500">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xong & Áp Dụng Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
