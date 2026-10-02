import React, { useState, useRef, useEffect } from 'react';
import { Award, Download, RefreshCw, Wand2, CheckSquare, Square, Settings, Image as ImageIcon, Upload, X, Move, Type, Maximize, Trash2, Edit2, Zap } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useClassroom } from '../../context/ClassroomContext';
import confetti from 'canvas-confetti';
import Tesseract from 'tesseract.js';
interface CanvasElement {
  id: string;
  type: 'text' | 'avatar' | 'signature';
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  isEditing?: boolean;
  removeBg?: boolean; // For signature AI removal
}

const DEFAULT_TEMPLATES = [
  { id: 't1', name: 'Mẫu Học Tập', bgImage: '/templates/tpl_1.jpg', bgColor: 'bg-white' },
  { id: 't2', name: 'Mẫu Cổ Điển', bgImage: '/templates/tpl_2.jpg', bgColor: 'bg-white' },
  { id: 't3', name: 'Mẫu Bầu Trời', bgImage: '/templates/tpl_3.jpg', bgColor: 'bg-white' },
  { id: 't4', name: 'Mẫu Cắm Trại', bgImage: '/templates/tpl_4.jpg', bgColor: 'bg-white' },
];

const FONTS = [
  { name: 'Mặc định (Sans)', value: '"Plus Jakarta Sans", sans-serif' },
  { name: 'Có chân (Serif)', value: '"Times New Roman", serif' },
  { name: 'Nghệ thuật (Dancing)', value: '"Dancing Script", cursive' },
  { name: 'Sang trọng (Great Vibes)', value: '"Great Vibes", cursive' },
  { name: 'Trẻ trung (Comic)', value: '"Comic Sans MS", cursive' }
];

export const CertificateView: React.FC = () => {
  const { classes, activeClassId, setActiveClassId, students, currentUser } = useClassroom();
  
  const currentClassStudents = students.filter(s => s.classId === activeClassId);
  const activeClass = classes.find(c => c.id === activeClassId);

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATES[0].id);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);

  const [certType, setCertType] = useState('Tuần');
  const [certTypeDetail, setCertTypeDetail] = useState('1'); 
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));
  
  const [reason, setReason] = useState('Đã có nhiều tiến bộ trong học tập và rèn luyện');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [coinThreshold, setCoinThreshold] = useState(50);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // AI Processing State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProcessingText, setAiProcessingText] = useState('');
  const [isMagicScanning, setIsMagicScanning] = useState(false);

  // Dynamic Canvas Dimensions
  const [canvasDim, setCanvasDim] = useState({ width: 960, height: 540 });

  // Editor states
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scaleMultiplier, setScaleMultiplier] = useState(1); 

  const containerRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const containerHeight = containerRef.current.clientHeight - 32;
        const scaleX = containerWidth / canvasDim.width;
        const scaleY = containerHeight / canvasDim.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        setScaleMultiplier(newScale);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasDim.width, canvasDim.height]);

  useEffect(() => {
    const eligible = currentClassStudents.filter(s => s.points >= coinThreshold).map(s => s.id);
    setSelectedStudents(eligible);
    if (eligible.length > 0) setPreviewStudentId(eligible[0]);
    else if (currentClassStudents.length > 0) setPreviewStudentId(currentClassStudents[0].id);
  }, [activeClassId, currentClassStudents.length, coinThreshold]);

  useEffect(() => {
    const previewStudent = currentClassStudents.find(s => s.id === previewStudentId);
    const stuName = previewStudent ? previewStudent.name : 'Tên Học Sinh';
    const stuAvatar = previewStudent ? previewStudent.avatar : '';
    
    let fullTypeStr = `THƯ KHEN ${certType.toUpperCase()}`;
    if (certType === 'Tuần') fullTypeStr = `THƯ KHEN TUẦN ${certTypeDetail}`;
    if (certType === 'Tháng') fullTypeStr = `THƯ KHEN THÁNG ${certTypeDetail}`;
    if (certType === 'Học Kì') fullTypeStr = `THƯ KHEN HỌC KÌ ${certTypeDetail} - NĂM HỌC ${academicYear}`;
    if (certType === 'Năm Học') fullTypeStr = `THƯ KHEN NĂM HỌC ${academicYear}`;

    const dateSplit = date.split('-');
    const dateStr = `Ngày ${dateSplit[2]} tháng ${dateSplit[1]} năm ${dateSplit[0]}`;

    const initialElements: CanvasElement[] = [
      { id: 'title', type: 'text', content: 'THƯ KHEN', x: 280, y: 40, fontSize: 64, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#b91c1c', textAlign: 'center', width: 400 },
      { id: 'subtitle', type: 'text', content: fullTypeStr, x: 280, y: 120, fontSize: 24, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#c2410c', textAlign: 'center', width: 400 },
      { id: 'avatar', type: 'avatar', content: stuAvatar, x: 420, y: 170, width: 120, height: 120 },
      { id: 'khen_tang', type: 'text', content: 'Trân trọng khen ngợi em:', x: 280, y: 300, fontSize: 20, fontFamily: '"Times New Roman", serif', color: '#374151', textAlign: 'center', width: 400 },
      { id: 'studentName', type: 'text', content: stuName, x: 180, y: 340, fontSize: 56, fontFamily: '"Dancing Script", cursive', color: '#1e3a8a', textAlign: 'center', width: 600 },
      { id: 'reason', type: 'text', content: reason, x: 130, y: 420, fontSize: 28, fontFamily: '"Great Vibes", cursive', color: '#111827', textAlign: 'center', width: 700 },
      { id: 'classDate', type: 'text', content: `Lớp ${activeClass?.name || '...'} \n ${dateStr}`, x: 60, y: 460, fontSize: 18, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#4b5563', textAlign: 'center', width: 250 },
      { id: 'teacherLabel', type: 'text', content: 'Giáo Viên', x: 650, y: 460, fontSize: 18, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#4b5563', textAlign: 'center', width: 250 },
      { id: 'teacherName', type: 'text', content: currentUser?.fullName || 'Tên giáo viên', x: 650, y: 490, fontSize: 32, fontFamily: '"Dancing Script", cursive', color: '#1e3a8a', textAlign: 'center', width: 250 },
    ];
    
    setElements(prev => {
      if (prev.length === 0) return initialElements;
      return prev.map(p => {
        if (p.id === 'studentName') return { ...p, content: stuName };
        if (p.id === 'avatar') return { ...p, content: stuAvatar };
        if (p.id === 'subtitle') return { ...p, content: fullTypeStr };
        if (p.id === 'reason') return { ...p, content: reason };
        if (p.id === 'classDate') return { ...p, content: `Lớp ${activeClass?.name || '...'} \n ${dateStr}` };
        return p;
      });
    });
  }, [previewStudentId, certType, certTypeDetail, academicYear, date, reason, activeClass, currentUser]);


  const handleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
    setPreviewStudentId(id);
  };

  const handleSelectAllEligible = () => {
    const eligible = currentClassStudents.filter(s => s.points >= coinThreshold).map(s => s.id);
    setSelectedStudents(eligible);
    if (eligible.length > 0) setPreviewStudentId(eligible[0]);
  };

  const simulateAiProcessing = (stages: string[], onComplete: () => void) => {
    setIsAiProcessing(true);
    let currentStage = 0;
    
    const interval = setInterval(() => {
      if (currentStage >= stages.length) {
        clearInterval(interval);
        setIsAiProcessing(false);
        onComplete();
        return;
      }
      setAiProcessingText(stages[currentStage]);
      currentStage++;
    }, 800);
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        
        // Cập nhật tỉ lệ khung hình theo ảnh tải lên
        const img = new Image();
        img.onload = () => {
          // Tính toán width/height phù hợp, giới hạn chiều rộng max khoảng 1200px để không quá nặng
          let w = img.width;
          let h = img.height;
          if (w > 1200) {
            h = (1200 / w) * h;
            w = 1200;
          }
          setCanvasDim({ width: w, height: h });
          setCustomBgUrl(url);
          setTemplate('custom');
          setElements([]);
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setElements(prev => [
          ...prev, 
          { id: 'sig_' + Date.now(), type: 'signature', content: event.target?.result as string, x: 700, y: 380, width: 150, height: 100, removeBg: true }
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const addCustomText = () => {
    setElements(prev => [
      ...prev, 
      { id: 'txt_' + Date.now(), type: 'text', content: 'Văn bản mới', x: 400, y: 250, width: 200, fontSize: 24, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#000000', textAlign: 'center' }
    ]);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const el = elements.find(el => el.id === id);
    if (el) {
      setIsDragging(true);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX;
      const clickY = e.clientY;
      const unscaledClickX = clickX / scaleMultiplier;
      const unscaledClickY = clickY / scaleMultiplier;
      setDragOffset({ x: unscaledClickX - el.x, y: unscaledClickY - el.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedElementId) {
      const unscaledX = e.clientX / scaleMultiplier;
      const unscaledY = e.clientY / scaleMultiplier;
      updateElement(selectedElementId, {
        x: unscaledX - dragOffset.x,
        y: unscaledY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = () => {
    setSelectedElementId(null);
  };

  const aiSuggestions = [
    'Đã có nhiều tiến bộ trong học tập và rèn luyện',
    'Đạt thành tích xuất sắc trong học tập tuần qua',
    'Tích cực phát biểu, hăng hái xây dựng bài',
    'Hoàn thành tốt các bài tập, chăm ngoan học giỏi',
    'Có ý thức kỷ luật tốt, giúp đỡ bạn bè'
  ];

  // Helper for delaying loop to allow React to render avatar & text changes
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDownload = async () => {
    if (!certificateRef.current || selectedStudents.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setSelectedElementId(null); 
    
    const currentTransform = certificateRef.current.style.transform;
    certificateRef.current.style.transform = 'none';

    try {
      let count = 0;
      for (const studentId of selectedStudents) {
        setPreviewStudentId(studentId);
        // Wait for React to re-render the canvas with the new student's data
        await wait(500); 

        const dataUrl = await toPng(certificateRef.current, {
          quality: 1,
          pixelRatio: 2, 
          canvasWidth: 1920,
          canvasHeight: 1080,
        });
        
        const link = document.createElement('a');
        const stuName = currentClassStudents.find(s => s.id === studentId)?.name || 'HocSinh';
        link.download = `ThuKhen_${stuName}_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        count++;
        setGenerationProgress(Math.round((count / selectedStudents.length) * 100));
        await wait(200); // Small pause before next download to prevent browser freeze
      }
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Lỗi khi tạo ảnh:', err);
      alert('Có lỗi xảy ra khi tạo thư khen.');
    } finally {
      certificateRef.current.style.transform = currentTransform; 
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleMagicLayer = async () => {
    if (!customBgUrl) return;
    setIsMagicScanning(true);
    setAiProcessingText('Đang khởi tạo AI Engine...');
    
    try {
      const result = await Tesseract.recognize(
        customBgUrl,
        'vie', // Nhận diện tiếng Việt
        { 
          logger: m => {
            if (m.status === 'recognizing text') {
              setAiProcessingText(`Đang đọc văn bản... ${Math.round(m.progress * 100)}%`);
            } else {
              setAiProcessingText('Đang xử lý hình ảnh...');
            }
          } 
        }
      );

      const lines = (result.data as any).lines || [];
      const newElements: CanvasElement[] = [];

      lines.forEach((line: any, index: number) => {
        const text = line.text.trim();
        if (!text) return;

        // Tính tọa độ bbox theo tỷ lệ canvas hiện tại
        // Tesseract trả về tọa độ pixel thật của ảnh. Cần scale theo canvasDim nếu cần. 
        // Vì canvasDim đã được scale max width 1200 ở trên, ta cần lấy tỷ lệ.
        
        const bbox = line.bbox;
        // Tạm tính scale. Vì img được load vào Tesseract nguyên bản, ta cần so sánh với canvasDim
        const img = new Image();
        img.src = customBgUrl;
        
        // Wait for image size conceptually, but since it's sync here, we estimate:
        const scaleX = canvasDim.width / (img.width || canvasDim.width);
        const scaleY = canvasDim.height / (img.height || canvasDim.height);

        newElements.push({
          id: `ml_text_${index}`,
          type: 'text',
          content: text,
          x: bbox.x0 * scaleX,
          y: bbox.y0 * scaleY,
          fontSize: Math.max(16, (bbox.y1 - bbox.y0) * scaleY * 0.8), // Ước lượng fontSize từ chiều cao
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          color: '#1e3a8a', // Màu mặc định
          textAlign: 'left',
          width: (bbox.x1 - bbox.x0) * scaleX + 20,
        });
      });

      setElements(newElements);
      setAiProcessingText('Hoàn tất tách lớp!');
    } catch (error) {
      console.error(error);
      setAiProcessingText('Có lỗi xảy ra khi đọc ảnh.');
    } finally {
      setTimeout(() => {
        setIsMagicScanning(false);
      }, 1000);
    }
  };

  const activeTemplate = customBgUrl && template === 'custom' 
    ? { id: 'custom', name: 'Tùy chỉnh', bgImage: customBgUrl, bgColor: 'bg-white' }
    : DEFAULT_TEMPLATES.find(t => t.id === template) || DEFAULT_TEMPLATES[0];

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden select-none relative">
      
      {/* AI Processing Overlay */}
      {isAiProcessing && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-24 h-24 relative mb-6">
            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full animate-spin flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.6)]">
              <Wand2 className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">AI Tách Lớp Thông Minh</h2>
          <p className="text-indigo-200 font-medium animate-pulse">{aiProcessingText}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-md text-white">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight uppercase">Tạo Thư Khen Điện Tử Pro</h1>
            <p className="text-sm text-gray-500 font-medium">Chọn học sinh - Chỉnh sửa Canvas tự do - Xuất hàng loạt</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeClassId || ''}
            onChange={(e) => setActiveClassId(e.target.value)}
            className="border-2 border-indigo-200 rounded-xl px-4 py-2 text-indigo-700 font-bold bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>-- Chọn Lớp --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Config */}
        <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col overflow-y-auto shrink-0 z-10 shadow-lg">
          
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
              <ImageIcon className="w-4 h-4 mr-1.5" /> Mẫu Khung & Hình Nền
            </h3>
            
            <label className="cursor-pointer flex items-center justify-center p-2 border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors mb-3">
              <Wand2 className="w-4 h-4 mr-2" />
              <span className="text-xs font-bold uppercase">AI Tải lên Mẫu Tùy chỉnh</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleCustomBgUpload} />
            </label>

            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`p-1.5 rounded-xl border-2 text-[10px] text-center transition-all flex flex-col items-center justify-center h-16 relative overflow-hidden
                    ${template === t.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200'}
                  `}
                >
                  {t.bgImage ? (
                    <img src={t.bgImage} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
                  ) : (
                    <div className={`absolute inset-0 w-full h-full ${t.bgColor}`}></div>
                  )}
                  <span className="truncate w-full relative z-10 bg-white/80 px-1 py-0.5 rounded font-bold text-gray-800">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Loại & Chi tiết</label>
              <div className="flex gap-2">
                <select 
                  value={certType} 
                  onChange={e => setCertType(e.target.value)}
                  className="w-1/2 border border-gray-300 rounded p-1.5 text-xs font-medium outline-none focus:border-blue-500"
                >
                  <option value="Tuần">Khen Tuần</option>
                  <option value="Tháng">Khen Tháng</option>
                  <option value="Học Kì">Khen Học Kì</option>
                  <option value="Năm Học">Khen Năm học</option>
                  <option value="Đột Xuất">Đột xuất</option>
                </select>
                {certType !== 'Đột Xuất' && (
                  <input 
                    type="text" 
                    value={certTypeDetail}
                    onChange={e => setCertTypeDetail(e.target.value)}
                    placeholder="Số (VD: 1)"
                    className="w-1/2 border border-gray-300 rounded p-1.5 text-xs font-medium outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            {(certType === 'Học Kì' || certType === 'Năm Học') && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Năm Học</label>
                <input 
                  type="text" 
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5 text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Lý do (AI)</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs outline-none focus:border-blue-500 min-h-[60px] resize-none"
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {aiSuggestions.map((sug, i) => (
                  <button 
                    key={i}
                    onClick={() => setReason(sug)}
                    className="text-[9px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full hover:bg-indigo-100 border border-indigo-100"
                  >
                    {sug.substring(0, 15)}...
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ngày khen</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs font-medium outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Chọn Học sinh ({selectedStudents.length}/{currentClassStudents.length})
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="text-gray-400 hover:text-blue-600 p-1 bg-gray-100 rounded-md"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {isSettingsOpen && (
              <div className="mb-2 p-2 bg-blue-50 rounded text-xs border border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-800">&gt;=</span>
                  <input type="number" value={coinThreshold} onChange={e => setCoinThreshold(Number(e.target.value))} className="w-12 p-1 rounded border border-blue-200 text-center" />
                  <span className="text-blue-700">xu</span>
                  <button onClick={handleSelectAllEligible} className="ml-auto text-white bg-blue-600 px-2 rounded hover:bg-blue-700">Lọc</button>
                </div>
              </div>
            )}

            <div className="overflow-y-auto flex-1 bg-white border border-gray-200 rounded-lg shadow-inner">
              {currentClassStudents.map(st => {
                const isSelected = selectedStudents.includes(st.id);
                const isPreview = previewStudentId === st.id;
                return (
                  <div 
                    key={st.id}
                    className={`flex items-center p-1.5 border-b border-gray-50 cursor-pointer ${isPreview ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setPreviewStudentId(st.id)}
                  >
                    <button onClick={(e) => { e.stopPropagation(); handleSelectStudent(st.id); }} className="mr-2">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-300" />}
                    </button>
                    <div className="text-xs font-bold text-gray-700 flex-1 truncate">{st.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Main Canvas Editor Area */}
        <div 
          ref={containerRef}
          className="flex-1 bg-slate-800 p-8 flex flex-col items-center justify-center overflow-hidden relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
        >
          
          {/* Top Canvas Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl flex items-center gap-4 z-20" onClick={e => e.stopPropagation()}>
            {customBgUrl && template === 'custom' && (
              <>
                <button onClick={handleMagicLayer} className="flex items-center gap-1.5 text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105 transition-transform drop-shadow-sm">
                  <Wand2 className="w-4 h-4 text-purple-600"/> Magic Layer
                </button>
                <div className="w-px h-6 bg-slate-300"></div>
              </>
            )}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 cursor-pointer">
              <Upload className="w-4 h-4"/> Thêm ảnh chữ ký
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleSignatureUpload} />
            </label>
            <div className="w-px h-6 bg-slate-300"></div>
            <button onClick={addCustomText} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600">
              <Type className="w-4 h-4"/> Thêm chữ
            </button>
            <div className="w-px h-6 bg-slate-300"></div>
            <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-600" onClick={() => setElements([])}>
              <RefreshCw className="w-4 h-4"/> Đặt lại Canvas
            </button>
          </div>

          {/* Element Properties Toolbar (shows when element is selected) */}
          {selectedElement && (
            <div className="absolute right-4 top-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-xl w-64 z-20 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-black uppercase text-slate-700">Chỉnh sửa Lớp</span>
                <button onClick={() => removeElement(selectedElement.id)} className="text-rose-500 hover:text-rose-700 p-1 rounded-md bg-rose-50"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>

              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Nội dung</label>
                    <textarea 
                      value={selectedElement.content} 
                      onChange={e => updateElement(selectedElement.id, { content: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Font chữ</label>
                    <select 
                      value={selectedElement.fontFamily} 
                      onChange={e => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                      className="w-full border rounded p-1.5 text-xs"
                    >
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Cỡ chữ</label>
                      <input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full border rounded p-1 text-xs" />
                    </div>
                    <div className="w-1/2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Màu chữ</label>
                      <input type="color" value={selectedElement.color} onChange={e => updateElement(selectedElement.id, { color: e.target.value })} className="w-full h-7 rounded cursor-pointer" />
                    </div>
                  </div>
                </>
              )}

              {selectedElement.type === 'signature' && (
                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-800 flex items-center gap-1"><Zap className="w-3 h-3"/> AI Tách Nền Trắng</span>
                  <input 
                    type="checkbox" 
                    checked={selectedElement.removeBg || false} 
                    onChange={e => updateElement(selectedElement.id, { removeBg: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </div>
              )}

              {(selectedElement.type === 'avatar' || selectedElement.type === 'signature') && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Kích thước ảnh</label>
                  <input 
                    type="range" min="30" max="400" 
                    value={selectedElement.width} 
                    onChange={e => updateElement(selectedElement.id, { width: Number(e.target.value), height: selectedElement.type === 'avatar' ? Number(e.target.value) : undefined })}
                    className="w-full accent-indigo-500" 
                  />
                </div>
              )}
            </div>
          )}

          {/* Canvas Wrapper for scaling */}
          <div 
            className="relative shadow-2xl bg-white overflow-hidden ring-4 ring-white/10 flex-shrink-0 transition-transform origin-center"
            style={{ 
              width: `${canvasDim.width}px`, 
              height: `${canvasDim.height}px`,
              transform: `scale(${scaleMultiplier})`, 
            }}
          >
            {/* Capture Area */}
            <div 
              ref={certificateRef}
              className={`absolute inset-0 w-full h-full ${activeTemplate.bgColor}`}
              style={{
                backgroundImage: activeTemplate.bgImage ? `url(${activeTemplate.bgImage})` : 'none',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
              }}
            >
              
              {/* Magic Layer Scanning Animation */}
              {isMagicScanning && (
                <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none rounded-xl">
                  <div className="absolute inset-0 bg-purple-900/20 backdrop-blur-[1px]"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_15px_#a855f7] animate-[scan_2s_ease-in-out_infinite]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-900/80 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-3 backdrop-blur shadow-2xl border border-purple-500/30">
                      <Wand2 className="w-5 h-5 text-purple-400 animate-pulse" />
                      {aiProcessingText || 'AI Magic Layer đang xử lý...'}
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay Elements */}
              {elements.map(el => {
                const isSelected = selectedElementId === el.id;
                return (
                  <div
                    key={el.id}
                    className={`absolute cursor-move group ${isSelected ? 'ring-1 ring-purple-500 bg-purple-500/5' : 'hover:ring-1 hover:ring-purple-400/50'}`}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width ? `${el.width}px` : 'auto',
                      height: el.height ? `${el.height}px` : 'auto',
                      zIndex: isSelected ? 50 : 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                  >
                    {isSelected && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-purple-500 rounded-full cursor-nwse-resize"></div>
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-purple-500 rounded-full cursor-nesw-resize"></div>
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-purple-500 rounded-full cursor-nesw-resize"></div>
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-purple-500 rounded-full cursor-nwse-resize"></div>
                      </>
                    )}

                    {el.type === 'text' && (
                      <div 
                        style={{
                          fontSize: `${el.fontSize}px`,
                          fontFamily: el.fontFamily,
                          color: el.color,
                          fontWeight: el.fontWeight || 'normal',
                          fontStyle: el.fontStyle || 'normal',
                          textAlign: el.textAlign || 'left',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.2
                        }}
                      >
                        {el.content}
                      </div>
                    )}

                    {el.type === 'avatar' && (
                      <img 
                        src={el.content} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full border-4 border-white shadow-xl object-cover"
                        draggable={false}
                      />
                    )}

                    {el.type === 'signature' && (
                      <img 
                        src={el.content} 
                        alt="Signature" 
                        className="w-full h-auto object-contain drop-shadow"
                        style={el.removeBg ? { mixBlendMode: 'multiply', filter: 'contrast(1.5) grayscale(1)' } : {}}
                        draggable={false}
                      />
                    )}
                  </div>
                );
              })}

            </div>
          </div>

          <div className="absolute bottom-6 bg-white rounded-xl shadow-2xl p-2.5 flex space-x-3 items-center border border-slate-200 z-20" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-bold text-slate-500 px-3">
              Đã chọn: <span className="text-indigo-600">{selectedStudents.length}</span> HS
            </div>
            <button 
              onClick={handleDownload}
              disabled={!previewStudentId || isGenerating || selectedStudents.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase rounded-lg hover:shadow-lg transition-all flex items-center disabled:opacity-50 relative overflow-hidden"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 
                  ĐANG XUẤT ẢNH ({generationProgress}%)
                  <div className="absolute bottom-0 left-0 h-1 bg-white/50" style={{ width: `${generationProgress}%` }}></div>
                </>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> XUẤT HÀNG LOẠT {selectedStudents.length > 1 ? `(${selectedStudents.length})` : ''}</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
