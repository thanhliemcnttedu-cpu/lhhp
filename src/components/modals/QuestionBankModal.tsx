import React, { useState, useRef, useEffect } from 'react';
import { QuestionItem, QuestionType } from '../../types';
import { 
  X, Plus, Trash2, Edit3, Upload, Image as ImageIcon, 
  Check, HelpCircle, Sparkles, BookOpen, Award, 
  RotateCcw, Save, Search, FileType, Layers, Tag
} from 'lucide-react';
import { 
  parseDocxFile, parsePdfFile, parseImageFileWithAi, 
  parseQuestionsFromRawText, DEFAULT_QUESTIONS, saveQuizBank 
} from '../../utils/quizParser';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionItem[];
  onSaveQuestions: (updated: QuestionItem[], latestSubject?: string) => void;
  initialEditQuestion?: QuestionItem | null;
}

const PRESET_SUBJECTS = [
  'Toán học',
  'Tiếng Việt',
  'Tiếng Anh',
  'Khoa học',
  'Lịch sử & Địa lý',
  'Tin học',
  'Đạo đức & Kỹ năng sống',
  'Âm nhạc',
  'Mỹ thuật',
  'Hoạt động trải nghiệm',
  'Giáo dục thể chất',
  'Đố vui IQ'
];

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  questions,
  onSaveQuestions,
  initialEditQuestion
}) => {
  const [bank, setBank] = useState<QuestionItem[]>(questions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'multiple_choice' | 'oral'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Subject selector for uploading question sets (User requirement: đưa lên bộ đề theo môn)
  const [uploadSubject, setUploadSubject] = useState<string>('Toán học');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  // Edit / Add state
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Raw text paste modal state
  const [isPastingText, setIsPastingText] = useState(false);
  const [pastedContent, setPastedContent] = useState('');

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const answerImageInputRef = useRef<HTMLInputElement>(null);
  const optionImageInputRef = useRef<HTMLInputElement>(null);
  const activeOptionIndexForImageRef = useRef<number | null>(null);

  // Sync questions from props and open initialEditQuestion if provided
  useEffect(() => {
    setBank(questions);
  }, [questions]);

  useEffect(() => {
    if (isOpen && initialEditQuestion) {
      setEditingQuestion(initialEditQuestion);
      setIsCreatingNew(false);
    }
  }, [isOpen, initialEditQuestion]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Determine current target subject for upload
  const effectiveTargetSubject = isCustomSubject && customSubjectName.trim()
    ? customSubjectName.trim()
    : uploadSubject;

  // Filtered questions
  const filteredList = bank.filter(q => {
    const matchSearch = searchTerm.trim() === '' || 
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSubject = selectedSubject === 'all' || (q.subject || 'Tổng hợp') === selectedSubject;
    const matchType = selectedType === 'all' || q.type === selectedType;
    return matchSearch && matchSubject && matchType;
  });

  const allSubjects = Array.from(new Set(bank.map(q => q.subject || 'Tổng hợp'))).filter(Boolean);

  // Handle file uploads (Word, PDF, Images) with Subject tag
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    const fileName = file.name.toLowerCase();
    const targetSubject = effectiveTargetSubject;

    try {
      let newQuestions: QuestionItem[] = [];

      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        newQuestions = await parseDocxFile(file, targetSubject);
        showToast(`Đã nhập thành công ${newQuestions.length} câu hỏi môn [${targetSubject}] từ file Word!`);
      } else if (fileName.endsWith('.pdf')) {
        newQuestions = await parsePdfFile(file, targetSubject);
        showToast(`Đã nhập thành công ${newQuestions.length} câu hỏi môn [${targetSubject}] từ file PDF!`);
      } else if (file.type.startsWith('image/')) {
        newQuestions = await parseImageFileWithAi(file, targetSubject);
        showToast(`Đã nhận diện thành công ${newQuestions.length} câu hỏi môn [${targetSubject}] từ Hình ảnh!`);
      } else {
        throw new Error('Định dạng file chưa được hỗ trợ. Vui lòng chọn file Word (.docx), PDF (.pdf) hoặc Hình ảnh (.png, .jpg).');
      }

      if (newQuestions.length > 0) {
        const updated = [...newQuestions, ...bank];
        setBank(updated);
        onSaveQuestions(updated, targetSubject);
        saveQuizBank(updated);
        setSelectedSubject(targetSubject); // Switch view to newly uploaded subject
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Lỗi khi nhập file câu hỏi.');
    } finally {
      setIsLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Text Paste import with Subject tag
  const handleImportPastedText = () => {
    if (!pastedContent.trim()) return;
    const targetSubject = effectiveTargetSubject;
    const parsed = parseQuestionsFromRawText(pastedContent, targetSubject);
    if (parsed.length === 0) {
      alert('Không nhận diện được câu hỏi nào. Hãy đảm bảo có cú pháp: "Câu 1: ... A. ... B. ... C. ... D. ... Đáp án: A"');
      return;
    }
    const tagged = parsed.map(q => ({ ...q, subject: targetSubject }));
    const updated = [...tagged, ...bank];
    setBank(updated);
    onSaveQuestions(updated, targetSubject);
    saveQuizBank(updated);
    setIsPastingText(false);
    setPastedContent('');
    setSelectedSubject(targetSubject);
    showToast(`Đã thêm thành công ${tagged.length} câu hỏi môn [${targetSubject}] từ văn bản dán!`);
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    const updated = bank.filter(q => q.id !== id);
    setBank(updated);
    onSaveQuestions(updated);
    saveQuizBank(updated);
    showToast('Đã xóa câu hỏi khỏi bộ đề.');
  };

  // Delete all questions of selected subject
  const handleClearSubjectQuestions = () => {
    if (selectedSubject === 'all') return;
    if (window.confirm(`Bạn có chắc muốn xóa tất cả câu hỏi của môn [${selectedSubject}]?`)) {
      const updated = bank.filter(q => (q.subject || 'Tổng hợp') !== selectedSubject);
      setBank(updated);
      onSaveQuestions(updated);
      saveQuizBank(updated);
      setSelectedSubject('all');
      showToast(`Đã xóa bộ đề môn [${selectedSubject}].`);
    }
  };

  // Export questions of selected subject
  const handleExportSubjectJson = () => {
    const toExport = selectedSubject === 'all' ? bank : bank.filter(q => (q.subject || 'Tổng hợp') === selectedSubject);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(toExport, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `bo-de-${selectedSubject.replace(/\s+/g, '_')}.json`);
    dlAnchor.click();
    showToast(`Đã xuất ${toExport.length} câu hỏi môn [${selectedSubject}] thành công!`);
  };

  // Reset to default sample questions
  const handleResetDefaults = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục kho câu hỏi mẫu phong phú ban đầu?')) {
      setBank(DEFAULT_QUESTIONS);
      onSaveQuestions(DEFAULT_QUESTIONS);
      saveQuizBank(DEFAULT_QUESTIONS);
      setSelectedSubject('all');
      showToast('Đã khôi phục bộ câu hỏi chuẩn!');
    }
  };

  // Save an edited or newly created question
  const handleSaveQuestionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.questionText.trim()) return;

    let updatedList: QuestionItem[];
    if (isCreatingNew) {
      updatedList = [editingQuestion, ...bank];
    } else {
      updatedList = bank.map(q => q.id === editingQuestion.id ? editingQuestion : q);
    }

    const savedSub = editingQuestion.subject || effectiveTargetSubject;
    setBank(updatedList);
    onSaveQuestions(updatedList, savedSub);
    saveQuizBank(updatedList);
    setEditingQuestion(null);
    setIsCreatingNew(false);
    showToast('Đã lưu câu hỏi và hình ảnh thành công!');
  };

  const handleStartCreateNew = () => {
    const defaultSub = selectedSubject !== 'all' ? selectedSubject : effectiveTargetSubject;
    const newQ: QuestionItem = {
      id: `q-custom-${Date.now()}`,
      type: 'multiple_choice',
      subject: defaultSub,
      questionText: '',
      options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
      optionImages: ['', '', '', ''],
      correctOptionIndex: 0,
      teacherAnswerKey: 'Đáp án là A',
      pointsReward: 2
    };
    setEditingQuestion(newQ);
    setIsCreatingNew(true);
  };

  // Handle Question Image & Answer Image
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'answerImage') => {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh không vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setEditingQuestion(prev => prev ? { ...prev, [field]: base64 } : null);
        showToast(field === 'image' ? 'Đã tải ảnh câu hỏi!' : 'Đã tải ảnh đáp án giáo viên!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = (field: 'image' | 'answerImage') => {
    if (!editingQuestion) return;
    setEditingQuestion(prev => prev ? { ...prev, [field]: undefined } : null);
  };

  // Handle Option Image upload for each option A, B, C, D (User requirement)
  const handleOptionImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const optIdx = activeOptionIndexForImageRef.current;
    if (!file || !editingQuestion || optIdx === null) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh không vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setEditingQuestion(prev => {
          if (!prev) return null;
          const currentOptImages = [...(prev.optionImages || ['', '', '', ''])];
          currentOptImages[optIdx] = base64;
          return { ...prev, optionImages: currentOptImages };
        });
        showToast(`Đã tải hình ảnh cho đáp án ${String.fromCharCode(65 + optIdx)}!`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSetOptionImageUrl = (optIdx: number, url: string) => {
    setEditingQuestion(prev => {
      if (!prev) return null;
      const currentOptImages = [...(prev.optionImages || ['', '', '', ''])];
      currentOptImages[optIdx] = url;
      return { ...prev, optionImages: currentOptImages };
    });
  };

  const handleRemoveOptionImage = (optIdx: number) => {
    setEditingQuestion(prev => {
      if (!prev) return null;
      const currentOptImages = [...(prev.optionImages || ['', '', '', ''])];
      currentOptImages[optIdx] = '';
      return { ...prev, optionImages: currentOptImages };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-5 select-none overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-wide">
                  QUẢN LÝ BỘ CÂU HỎI & KHO ĐỀ THEO MÔN HỌC
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase">
                  {bank.length} Câu hỏi
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 font-medium">
                Tải lên bộ đề theo môn • Chèn hình ảnh riêng cho từng câu hỏi và từng phương án A, B, C, D
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {toastMessage && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in duration-150">
            {toastMessage}
          </div>
        )}

        {/* 1. MỤC ĐƯA LÊN BỘ ĐỀ THEO MÔN (User requirement 1) */}
        <div className="px-4 py-3 bg-amber-50/70 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-amber-100/80 px-2.5 py-1 rounded-xl text-amber-950 font-black uppercase text-[11px]">
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              <span>BỘ ĐỀ THEO MÔN:</span>
            </div>

            <select
              value={isCustomSubject ? '__custom__' : uploadSubject}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomSubject(true);
                } else {
                  setIsCustomSubject(false);
                  setUploadSubject(e.target.value);
                }
              }}
              className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 cursor-pointer text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
            >
              {PRESET_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              {allSubjects.filter(s => !PRESET_SUBJECTS.includes(s) && s !== 'Tổng hợp').map(s => (
                <option key={s} value={s}>📂 {s}</option>
              ))}
              <option value="__custom__">➕ Tự nhập môn học khác...</option>
            </select>

            {isCustomSubject && (
              <input
                type="text"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                placeholder="Nhập tên môn mới (VD: Âm nhạc, GDCD...)"
                className="px-2.5 py-1.5 bg-white border border-amber-400 rounded-xl text-xs font-bold text-slate-800 w-48 shadow-2xs focus:outline-none"
                autoFocus
              />
            )}

            <span className="text-[11px] text-amber-900 font-semibold hidden sm:inline">
              👉 Khi tải file Word / PDF / Ảnh, bộ câu hỏi sẽ tự động gắn vào môn <strong className="text-indigo-700 underline font-black">{effectiveTargetSubject}</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-bold ml-auto flex items-center gap-1">
            <Tag className="w-3 h-3 text-indigo-500" />
            <span>Môn đang chọn: </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black">
              {effectiveTargetSubject}
            </span>
          </div>
        </div>

        {/* 2. Action Toolbar: Upload Buttons, Paste & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Left Actions: Upload files & add manually */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".docx,.doc,.pdf,image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={questionImageInputRef}
              onChange={(e) => handleImageFileChange(e, 'image')}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={answerImageInputRef}
              onChange={(e) => handleImageFileChange(e, 'answerImage')}
              accept="image/*"
              className="hidden"
            />
            {/* Hidden file input for option images */}
            <input
              type="file"
              ref={optionImageInputRef}
              onChange={handleOptionImageFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover-zoom-btn uppercase cursor-pointer"
              title={`Tải file Word (.docx), PDF hoặc Hình ảnh bài tập vào môn [${effectiveTargetSubject}]`}
            >
              <Upload className="w-4 h-4" />
              <span>{isLoadingFile ? 'Đang đọc file...' : `Tải Bộ Đề Môn ${effectiveTargetSubject}`}</span>
            </button>

            {/* Paste Text Button */}
            <button
              onClick={() => setIsPastingText(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover-zoom-btn uppercase cursor-pointer"
              title="Dán văn bản câu hỏi trực tiếp"
            >
              <FileType className="w-4 h-4" />
              <span>Dán Văn Bản</span>
            </button>

            {/* Add Manually */}
            <button
              onClick={handleStartCreateNew}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover-zoom-btn uppercase cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Câu Mới</span>
            </button>

            {/* Restore Default */}
            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Nạp lại bộ câu hỏi mẫu chuẩn"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Khôi Phục Mẫu</span>
            </button>
          </div>

          {/* Right Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm câu hỏi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 w-32 sm:w-44"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">Tất cả loại</option>
              <option value="multiple_choice">Trắc nghiệm</option>
              <option value="oral">Trả lời bằng lời</option>
            </select>
          </div>
        </div>

        {/* 3. Subject Filter Navigation Pills */}
        <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-black uppercase text-slate-600 mr-1 shrink-0">LỌC MÔN HỌC:</span>
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 cursor-pointer ${
              selectedSubject === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            Tất cả ({bank.length})
          </button>
          {allSubjects.map(sub => {
            const count = bank.filter(q => (q.subject || 'Tổng hợp') === sub).length;
            const isCurrent = selectedSubject === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>{sub}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  isCurrent ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {selectedSubject !== 'all' && (
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleExportSubjectJson}
                className="px-2 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                title={`Tải xuống file đề môn ${selectedSubject}`}
              >
                <span>📥 Xuất file môn</span>
              </button>
              <button
                type="button"
                onClick={handleClearSubjectQuestions}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title={`Xóa tất cả câu hỏi của môn ${selectedSubject}`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa bộ đề môn này</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Content Body: Question List or Editor Modal */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-3">
          {editingQuestion ? (
            /* IN-PLACE QUESTION EDITOR FORM */
            <form onSubmit={handleSaveQuestionForm} className="bg-slate-50 p-5 rounded-2xl border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-black text-indigo-950 uppercase flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>{isCreatingNew ? 'THÊM MỚI CÂU HỎI THỬ THÁCH' : 'CHỈNH SỬA CÂU HỎI & CHÈN HÌNH ẢNH'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setEditingQuestion(null); setIsCreatingNew(false); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy bỏ
                </button>
              </div>

              {/* Type, Subject & Points */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Loại câu hỏi:</label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setEditingQuestion({
                        ...editingQuestion,
                        type: t,
                        options: t === 'multiple_choice' ? (editingQuestion.options || ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D']) : undefined,
                        optionImages: t === 'multiple_choice' ? (editingQuestion.optionImages || ['', '', '', '']) : undefined
                      });
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
                  >
                    <option value="multiple_choice">📝 Câu hỏi Trắc nghiệm (A, B, C, D)</option>
                    <option value="oral">🗣️ Câu hỏi Trả lời bằng lời</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Môn học / Bộ đề:</label>
                  <input
                    type="text"
                    value={editingQuestion.subject || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                    placeholder="Toán học, Tiếng Việt, Tiếng Anh, Khoa học..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Xu thưởng khi đúng:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingQuestion.pointsReward || 2}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, pointsReward: parseInt(e.target.value) || 2 })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Nội dung câu hỏi:</label>
                <textarea
                  rows={3}
                  value={editingQuestion.questionText}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi muốn gọi học sinh trả lời..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              {/* Question Image (Chèn ảnh câu hỏi) */}
              <div className="space-y-1.5 p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hình ảnh minh họa câu hỏi (Tùy chọn):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => questionImageInputRef.current?.click()}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                    {editingQuestion.image && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('image')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={editingQuestion.image || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, image: e.target.value })}
                  placeholder="Hoặc dán đường dẫn link ảnh (https://...)..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-700 focus:outline-none"
                />

                {editingQuestion.image && (
                  <div className="pt-1 flex items-center gap-3">
                    <img
                      src={editingQuestion.image}
                      alt="Ảnh câu hỏi xem trước"
                      className="max-h-28 rounded-lg border border-slate-300 object-contain bg-white shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 font-medium">Xem trước ảnh minh họa câu hỏi</span>
                  </div>
                )}
              </div>

              {/* Multiple Choice Options WITH INDIVIDUAL OPTION IMAGES (User requirement 2) */}
              {editingQuestion.type === 'multiple_choice' && (
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>CÁC PHƯƠNG ÁN LỰA CHỌN & CHÈN HÌNH ẢNH CHO TỪNG ĐÁP ÁN (A, B, C, D):</span>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Đáp án đúng: {String.fromCharCode(65 + (editingQuestion.correctOptionIndex || 0))}
                    </span>
                  </div>

                  {(editingQuestion.options || ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D']).map((opt, idx) => {
                    const optImage = editingQuestion.optionImages?.[idx];
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={editingQuestion.correctOptionIndex === idx}
                              onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: idx })}
                              className="accent-indigo-600 cursor-pointer w-4 h-4"
                            />
                            <span className="w-5 font-black text-indigo-700">{String.fromCharCode(65 + idx)}.</span>
                          </label>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(editingQuestion.options || [])];
                              newOpts[idx] = e.target.value;
                              setEditingQuestion({ ...editingQuestion, options: newOpts });
                            }}
                            className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 font-medium focus:outline-none focus:border-indigo-400"
                            placeholder={`Nội dung phương án ${String.fromCharCode(65 + idx)}...`}
                            required
                          />

                          {/* Image upload button for this specific option */}
                          <button
                            type="button"
                            onClick={() => {
                              activeOptionIndexForImageRef.current = idx;
                              optionImageInputRef.current?.click();
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            title={`Tải ảnh từ máy tính cho đáp án ${String.fromCharCode(65 + idx)}`}
                          >
                            <ImageIcon className="w-3 h-3 text-indigo-600" />
                            <span>{optImage ? 'Đổi ảnh' : `Chèn ảnh ${String.fromCharCode(65 + idx)}`}</span>
                          </button>

                          {optImage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionImage(idx)}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase cursor-pointer shrink-0"
                              title={`Xóa ảnh đáp án ${String.fromCharCode(65 + idx)}`}
                            >
                              Xóa ảnh
                            </button>
                          )}
                        </div>

                        {/* Optional URL input and preview thumbnail for this option */}
                        {optImage && (
                          <div className="pl-7 flex items-center gap-3 pt-1">
                            <img
                              src={optImage}
                              alt={`Ảnh đáp án ${String.fromCharCode(65 + idx)}`}
                              className="max-h-20 max-w-[120px] rounded-lg border border-slate-300 object-contain bg-white shadow-2xs"
                            />
                            <div className="flex-1">
                              <span className="text-[10px] text-slate-600 font-bold block">
                                Ảnh minh họa đáp án {String.fromCharCode(65 + idx)}:
                              </span>
                              <input
                                type="text"
                                value={optImage.startsWith('data:') ? '' : optImage}
                                onChange={(e) => handleSetOptionImageUrl(idx, e.target.value)}
                                placeholder="Hoặc dán URL link ảnh..."
                                className="w-full text-[10px] bg-white border border-slate-200 rounded px-2 py-1 mt-0.5 font-mono text-slate-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Teacher Answer Key / Explanation */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  {editingQuestion.type === 'multiple_choice' ? 'Giải thích / Hướng dẫn của giáo viên:' : 'Đáp án đối chiếu & Gợi ý chấm điểm của giáo viên:'}
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.teacherAnswerKey || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, teacherAnswerKey: e.target.value })}
                  placeholder="Gợi ý câu trả lời đúng để giáo viên đối chiếu khi học sinh trả lời..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800"
                />
              </div>

              {/* Teacher Answer Image (Chèn ảnh câu trả lời / đáp án của giáo viên) */}
              <div className="space-y-1.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                    <span>Hình ảnh đáp án / Lời giải chi tiết của giáo viên (Tùy chọn):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => answerImageInputRef.current?.click()}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                    {editingQuestion.answerImage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('answerImage')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={editingQuestion.answerImage || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answerImage: e.target.value })}
                  placeholder="Hoặc dán đường dẫn link ảnh lời giải (https://...)..."
                  className="w-full text-xs bg-white border border-amber-200 rounded-lg p-2 font-mono text-slate-700 focus:outline-none"
                />

                {editingQuestion.answerImage && (
                  <div className="pt-1 flex items-center gap-3">
                    <img
                      src={editingQuestion.answerImage}
                      alt="Ảnh đáp án xem trước"
                      className="max-h-28 rounded-lg border border-amber-300 object-contain bg-white shadow-2xs"
                    />
                    <span className="text-[10px] text-amber-800 font-medium">Xem trước ảnh đáp án giáo viên</span>
                  </div>
                )}
              </div>

              {/* Action Save/Cancel */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingQuestion(null); setIsCreatingNew(false); }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Câu Hỏi</span>
                </button>
              </div>
            </form>
          ) : isPastingText ? (
            /* PASTE TEXT MODAL VIEW */
            <div className="bg-slate-50 p-5 rounded-2xl border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-purple-950 uppercase flex items-center gap-2">
                  <FileType className="w-4 h-4 text-purple-600" />
                  <span>DÁN VĂN BẢN ĐỀ THI VÀO MÔN: [{effectiveTargetSubject}]</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Dán nội dung câu hỏi từ Word, PDF hoặc website vào đây. Hệ thống tự động nhận diện câu hỏi và đáp án A, B, C, D:
              </p>
              <textarea
                rows={8}
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder={`Ví dụ:\nCâu 1: Thủ đô nước ta là gì?\nA. Hà Nội\nB. Đà Nẵng\nC. Cần Thơ\nD. Huế\nĐáp án: A\n\nCâu 2: Kể 3 việc tốt em đã làm tuần này?\nĐáp án: Quét nhà, giúp bạn, học bài`}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 font-mono text-slate-800 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsPastingText(false); setPastedContent(''); }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleImportPastedText}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Nhận Diện & Nhập Vào Môn [{effectiveTargetSubject}]</span>
                </button>
              </div>
            </div>
          ) : (
            /* QUESTIONS LIST */
            <div className="space-y-3">
              {filteredList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <HelpCircle className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-sm font-bold">Không tìm thấy câu hỏi phù hợp trong môn này.</p>
                  <p className="text-xs text-slate-500">Hãy bấm &quot;Tải Bộ Đề&quot; hoặc &quot;Thêm Câu Mới&quot; để bổ sung vào môn {effectiveTargetSubject}!</p>
                </div>
              ) : (
                filteredList.map((q, idx) => (
                  <div 
                    key={q.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          q.type === 'multiple_choice' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Trả lời bằng lời'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[10px] font-black border border-indigo-200">
                          {q.subject || 'Tổng hợp'}
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                          <Award className="w-3 h-3 text-amber-500" />
                          +{q.pointsReward || 2} xu
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => { setEditingQuestion(q); setIsCreatingNew(false); }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          title="Chỉnh sửa câu hỏi & hình ảnh"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-xs md:text-sm font-black text-slate-900 leading-snug">
                      {q.questionText}
                    </div>

                    {/* Optional Question Image */}
                    {q.image && (
                      <div className="pt-1">
                        <img 
                          src={q.image} 
                          alt="Ảnh câu hỏi" 
                          className="max-h-36 rounded-xl border border-slate-200 object-contain bg-slate-50 shadow-2xs"
                        />
                      </div>
                    )}

                    {/* Options WITH OPTION IMAGES DISPLAY (User requirement 2) */}
                    {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx;
                          const optImage = q.optionImages?.[optIdx];
                          return (
                            <div 
                              key={optIdx}
                              className={`p-2.5 rounded-xl text-xs flex flex-col justify-between border ${
                                isCorrect 
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="font-semibold">{opt}</span>
                                {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                              </div>

                              {/* Option image thumbnail if present */}
                              {optImage && (
                                <div className="mt-2 pl-7">
                                  <img 
                                    src={optImage} 
                                    alt={`Ảnh đáp án ${String.fromCharCode(65 + optIdx)}`}
                                    className="max-h-24 rounded-lg border border-slate-200 object-contain bg-white p-0.5 shadow-2xs"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Teacher Answer Key */}
                    {q.teacherAnswerKey && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-start gap-1.5">
                        <strong className="text-slate-800 shrink-0">Đáp án GV:</strong>
                        <span className="italic">{q.teacherAnswerKey}</span>
                      </div>
                    )}

                    {/* Teacher Answer Image */}
                    {q.answerImage && (
                      <div className="pt-0.5 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-800 shrink-0">Ảnh đáp án GV:</span>
                        <img 
                          src={q.answerImage} 
                          alt="Ảnh đáp án giáo viên" 
                          className="max-h-24 rounded-lg border border-amber-200 object-contain bg-amber-50/40 p-0.5"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Đang hiển thị {filteredList.length} / {bank.length} câu hỏi
            {selectedSubject !== 'all' && ` • Môn: ${selectedSubject}`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
          >
            Đóng & Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
};
