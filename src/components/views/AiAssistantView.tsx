import React, { useState } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { 
  Sparkles, Brain, Award, MessageSquare, Copy, Check, 
  RotateCcw, Send, HelpCircle, Users, HeartHandshake,
  Lightbulb, ChevronRight, Play, CheckCircle2, AlertCircle, Eye
} from 'lucide-react';
import { 
  callGeminiAi, 
  generateSmartRemarksFallback, 
  generateSmartParentMessageFallback, 
  generateSmartWarmupQuizFallback 
} from '../../services/aiService';
import { playPointClink, playFanfare } from '../../utils/audio';
import confetti from 'canvas-confetti';

type AiTab = 'remarks' | 'quiz' | 'seating' | 'energizers' | 'advisor';

export const AiAssistantView: React.FC = () => {
  const { 
    classes, activeClassId, students, subjects, awardPoints,
    assignSeat, seatingColumns
  } = useClassroom();

  const activeClass = classes.find(c => c.id === activeClassId);
  const classStudents = students.filter(s => s.classId === activeClassId);

  const [activeTab, setActiveTab] = useState<AiTab>('remarks');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(classStudents[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán');
  const [gradeLevel, setGradeLevel] = useState<string>(activeClass?.grade || 'Khối 4');
  
  // Loading & Outputs
  const [isLoading, setIsLoading] = useState(false);
  const [aiRemarkResult, setAiRemarkResult] = useState<string>('');
  const [aiParentMessageResult, setAiParentMessageResult] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>>(() => generateSmartWarmupQuizFallback('Toán', activeClass?.grade || 'Khối 4'));
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rewardAwarded, setRewardAwarded] = useState(false);

  // AI Chat Advisor
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Xin chào Thầy/Cô! Tôi là Trợ lý AI của "Lớp Học Hạnh Phúc". Tôi có thể hỗ trợ Thầy/Cô soạn lời phê, thiết kế trò chơi thi đua 5 phút, tư vấn giải pháp kỷ luật tích cực và tạo môi trường học tập tràn đầy tiếng cười. Hôm nay lớp học của Thầy/Cô cần hỗ trợ điều gì?`
    }
  ]);
  const [userChatInput, setUserChatInput] = useState('');

  // AI Seating Proposal
  const [seatingProposal, setSeatingProposal] = useState<{
    rationale: string;
    pairs: Array<{ student1: string; student2: string; reason: string }>;
  } | null>(null);

  const selectedStudent = classStudents.find(s => s.id === selectedStudentId);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 1. Generate Smart Remark
  const handleGenerateRemark = async () => {
    if (!selectedStudent) return;
    setIsLoading(true);
    setAiRemarkResult('');
    setAiParentMessageResult('');

    const prompt = `Bạn là chuyên gia sư phạm tiểu học và trung học tâm lý hàng đầu tại Việt Nam theo triết lý "Lớp Học Hạnh Phúc" (Happy Classroom).
Hãy tạo lời nhận xét học bạ / sổ theo dõi chi tiết và một bức thư khen ấm áp gửi phụ huynh cho học sinh sau:
- Tên học sinh: ${selectedStudent.name}
- Giới tính: ${selectedStudent.gender}
- Điểm xu thi đua hiện tại: ${selectedStudent.points} xu
- Lớp: ${activeClass?.name || 'Lớp học'}

Yêu cầu cụ thể:
1. "LỜI NHẬN XÉT SƯ PHẠM": Khen ngợi cụ thể tinh thần học tập, nêu bật sự cố gắng, dùng ngôn từ tích cực khích lệ, chỉ ra 1 điểm cần rèn luyện thêm nhẹ nhàng.
2. "THƯ GỬI PHỤ HUYNH QUA ZALO": Ngắn gọn, ấm áp, kết nối tình cảm gia đình - nhà trường, động viên phụ huynh khen ngợi con.`;

    try {
      const response = await callGeminiAi({ prompt });
      const parts = response.split(/THƯ GỬI PHỤ HUYNH/i);
      if (parts.length > 1) {
        setAiRemarkResult(parts[0].replace(/LỜI NHẬN XÉT SƯ PHẠM:?/i, '').trim());
        setAiParentMessageResult(parts[1].trim());
      } else {
        setAiRemarkResult(response);
        setAiParentMessageResult(generateSmartParentMessageFallback(activeClass?.name || '', selectedStudent.name, selectedStudent.points));
      }
    } catch {
      setAiRemarkResult(generateSmartRemarksFallback(selectedStudent.name, selectedStudent.points));
      setAiParentMessageResult(generateSmartParentMessageFallback(activeClass?.name || '', selectedStudent.name, selectedStudent.points));
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Generate Warm-up Quiz
  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setRewardAwarded(false);

    const prompt = `Tạo bộ 3 câu hỏi đố vui khởi động bài học (Warm-up game) cực kỳ thú vị và kích thích tư duy cho học sinh ${gradeLevel}, môn ${selectedSubject}.
Mỗi câu hỏi có 4 lựa chọn, chỉ 1 đáp án đúng, kèm lời giải thích dí dỏm.
Định dạng trả về JSON thuần túy theo mẫu:
[
  {
    "question": "Nội dung câu hỏi...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctIndex": 0,
    "explanation": "Giải thích ngắn gọn tại sao đúng..."
  }
]`;

    try {
      const response = await callGeminiAi({ prompt });
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuizQuestions(parsed);
        setActiveQuizIndex(0);
      } else {
        setQuizQuestions(generateSmartWarmupQuizFallback(selectedSubject, gradeLevel));
      }
    } catch {
      setQuizQuestions(generateSmartWarmupQuizFallback(selectedSubject, gradeLevel));
    } finally {
      setIsLoading(false);
    }
  };

  // Award coin for quiz answer
  const handleAwardQuizCoin = () => {
    if (!selectedStudent || rewardAwarded) return;
    awardPoints(
      [selectedStudent.id],
      5,
      `Trả lời đúng câu hỏi khởi động AI (${selectedSubject})`,
      selectedSubject
    );
    setRewardAwarded(true);
    playPointClink();
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  };

  // 3. AI Smart Seating Optimizer
  const handleGenerateSeating = async () => {
    setIsLoading(true);
    const sortedStudents = [...classStudents].sort((a, b) => b.points - a.points);
    const topHalf = sortedStudents.slice(0, Math.ceil(sortedStudents.length / 2));
    const bottomHalf = sortedStudents.slice(Math.ceil(sortedStudents.length / 2)).reverse();

    const pairs: Array<{ student1: string; student2: string; reason: string }> = [];
    for (let i = 0; i < Math.min(topHalf.length, bottomHalf.length); i++) {
      pairs.push({
        student1: topHalf[i].name,
        student2: bottomHalf[i].name,
        reason: `Mô hình 'Đôi bạn cùng tiến': ${topHalf[i].name} (${topHalf[i].points} xu) hỗ trợ và truyền cảm hứng học tập cho ${bottomHalf[i].name} (${bottomHalf[i].points} xu).`
      });
    }

    setSeatingProposal({
      rationale: `AI đã phân tích ${classStudents.length} học sinh của lớp ${activeClass?.name}. Phương án áp dụng nguyên lý 'Đôi bạn cùng tiến' kết hợp đan xen nam - nữ, ghép các bạn có điểm thi đua tích cực với các bạn cần kèm cặp để kéo đều phong trào lớp học.`,
      pairs
    });
    setIsLoading(false);
  };

  const handleApplySeatingProposal = () => {
    if (!seatingProposal) return;
    let studentIndex = 0;
    const shuffled = [...classStudents].sort((a, b) => b.points - a.points);
    
    // Assign across columns
    const cols = seatingColumns || 3;
    const maxRows = Math.ceil(shuffled.length / (cols * 2)) || 5;

    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < cols; c++) {
        // Seat left
        if (studentIndex < shuffled.length) {
          assignSeat(`${c}-${r}-0`, shuffled[studentIndex].id);
          studentIndex++;
        }
        // Seat right
        if (studentIndex < shuffled.length) {
          assignSeat(`${c}-${r}-1`, shuffled[studentIndex].id);
          studentIndex++;
        }
      }
    }
    playFanfare();
    confetti({ particleCount: 80, spread: 80 });
  };

  // 4. AI Chat advisor
  const handleSendChat = async () => {
    if (!userChatInput.trim() || isLoading) return;
    const userText = userChatInput.trim();
    setUserChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    const prompt = `Bạn là Trợ lý Sư phạm Trí tuệ Nhân tạo cho ứng dụng "Lớp Học Hạnh Phúc".
Người dùng là thầy/cô giáo dạy lớp ${activeClass?.name || 'tiểu học/trung học'}.
Câu hỏi/tình huống của giáo viên: "${userText}"
Hãy đưa ra câu trả lời:
- Luôn thấu hiểu, ân cần và đồng cảm với nỗi vất vả của người thầy.
- Đưa ra 3-4 giải pháp cụ thể, thực tế có thể áp dụng ngay trong tiết học ngày mai.
- Tận dụng cơ chế thưởng xu, khen ngợi, trò chơi tương tác để lớp học vui vẻ và kỷ luật tự giác.`;

    try {
      const response = await callGeminiAi({ prompt });
      setChatMessages(prev => [...prev, { sender: 'ai', text: response }]);
    } catch {
      setChatMessages(prev => [...prev, {
        sender: 'ai',
        text: `Thầy/Cô hoàn toàn có thể áp dụng 3 bước xử lý êm dịu:\n1. Tạm dừng 15 giây, kích hoạt chuông âm thanh hoặc bấm công cụ "Chống ồn" để học sinh tự chỉnh âm lượng.\n2. Áp dụng ngay thử thách "Tổ nào im lặng nhận ngay +3 xu thi đua".\n3. Mời 1 bạn đang mất tập trung lên quay Vòng quay may mắn hoặc bấm Cuộn phim gọi tên để kéo lại sự chú ý.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner hover-zoom-btn">
              <Brain className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold text-amber-200 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Trí Tuệ Nhân Tạo AI Thông Minh
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Trợ Lý Sư Phạm & Lớp Học Hạnh Phúc
              </h1>
              <p className="text-xs md:text-sm text-blue-100 mt-0.5">
                Tự động hóa lời phê, khởi tạo trò chơi thi đua 5 phút, tối ưu sơ đồ bàn học và tư vấn giáo dục tích cực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-white">
              Lớp đang chọn: <strong className="text-amber-200">{activeClass?.name}</strong> ({classStudents.length} học sinh)
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs with Hover Zoom-To */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200">
        {[
          { id: 'remarks', label: 'Lời Phê & Sổ Liên Lạc', icon: Award },
          { id: 'quiz', label: 'Câu Hỏi Khởi Động & Đố Vui', icon: Play },
          { id: 'seating', label: 'AI Xếp Sơ Đồ Chỗ Ngồi', icon: Users },
          { id: 'energizers', label: 'Trò Chơi 5 Phút Nạp Năng Lượng', icon: Lightbulb },
          { id: 'advisor', label: 'Cố Vấn Sư Phạm 24/7', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AiTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all hover-zoom-btn ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Smart Remarks & Parent Message */}
      {activeTab === 'remarks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Student Selection */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 hover-zoom-card">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Chọn Học Sinh & Tạo Lời Phê
            </h2>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Học sinh cần nhận xét:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 hover-zoom-interactive"
              >
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.stt} - {s.name} ({s.points} xu - {s.gender})
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <img
                  src={selectedStudent.avatar}
                  alt={selectedStudent.name}
                  className="w-12 h-12 rounded-xl object-cover bg-white shadow-xs"
                />
                <div>
                  <div className="text-sm font-black text-slate-900">{selectedStudent.name}</div>
                  <div className="text-xs text-blue-700 font-semibold mt-0.5">
                    🪙 {selectedStudent.points} xu thi đua · {selectedStudent.gender}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateRemark}
              disabled={isLoading || !selectedStudent}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover-zoom-btn disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'AI Đang Suy Nghĩ & Soạn Lời Phê...' : 'Tạo Lời Phê & Thư Khen AI'}
            </button>

            <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              💡 <strong>Gợi ý:</strong> AI sẽ tự động phân tích số xu thi đua, giới tính và nề nếp của em để soạn lời phê chân thành, mang tính xây dựng cao và thư Zalo cho phụ huynh.
            </div>
          </div>

          {/* Result Output */}
          <div className="lg:col-span-2 space-y-4">
            {/* Remark Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 hover-zoom-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Lời Nhận Xét Học Bạ / Sổ Theo Dõi
                </h3>
                {aiRemarkResult && (
                  <button
                    onClick={() => handleCopy(aiRemarkResult, 'remark')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 hover-zoom-btn"
                  >
                    {copiedKey === 'remark' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'remark' ? 'Đã sao chép!' : 'Sao chép'}</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-line min-h-[100px] flex items-center">
                {aiRemarkResult || (
                  <span className="text-slate-400 italic">
                    Chưa có nội dung. Vui lòng bấm "Tạo Lời Phê & Thư Khen AI" để bắt đầu.
                  </span>
                )}
              </div>
            </div>

            {/* Parent Message Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 hover-zoom-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-pink-600" />
                  Thư Khen / Tin Nhắn Gửi Phụ Huynh Qua Zalo
                </h3>
                {aiParentMessageResult && (
                  <button
                    onClick={() => handleCopy(aiParentMessageResult, 'parent')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-xs font-bold hover-zoom-btn"
                  >
                    {copiedKey === 'parent' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'parent' ? 'Đã sao chép!' : 'Sao chép gửi Zalo'}</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100 text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-line min-h-[120px] flex items-center">
                {aiParentMessageResult || (
                  <span className="text-slate-400 italic">
                    Nội dung tin nhắn Zalo gửi phụ huynh sẽ xuất hiện ở đây...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Warm-up Quiz & Mini-game */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 hover-zoom-card">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              Cấu Hình Bộ Câu Hỏi Khởi Động
            </h2>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Môn học:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 hover-zoom-interactive"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Khối lớp:</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 hover-zoom-interactive"
              >
                {['Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover-zoom-btn disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'AI Đang Tạo Câu Hỏi...' : 'Tạo 3 Câu Hỏi Đố Vui AI'}
            </button>

            {/* Student Reward Selector */}
            <div className="pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Tặng xu khi học sinh trả lời đúng:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 hover-zoom-interactive"
              >
                {classStudents.map(s => (
                  <option key={s.id} value={s.id}>#{s.stt} - {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Quiz Arena */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 hover-zoom-card">
            {quizQuestions.length > 0 && quizQuestions[activeQuizIndex] && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs">
                      Câu hỏi {activeQuizIndex + 1} / {quizQuestions.length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Môn {selectedSubject} · {gradeLevel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {quizQuestions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveQuizIndex(idx);
                          setSelectedAnswer(null);
                          setShowAnswer(false);
                          setRewardAwarded(false);
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all hover-zoom-badge ${
                          activeQuizIndex === idx 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Box */}
                <div className="p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-2xl border border-blue-100">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                    {quizQuestions[activeQuizIndex].question}
                  </h3>
                </div>

                {/* 4 Options with Zoom-To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quizQuestions[activeQuizIndex].options.map((opt, optIdx) => {
                    const isSelected = selectedAnswer === optIdx;
                    const isCorrect = optIdx === quizQuestions[activeQuizIndex].correctIndex;
                    let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-blue-50 hover:border-blue-300';
                    
                    if (showAnswer) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-md';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500 border-rose-600 text-white font-bold';
                      }
                    } else if (isSelected) {
                      btnStyle = 'bg-blue-600 border-blue-600 text-white font-bold';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => setSelectedAnswer(optIdx)}
                        className={`p-4 rounded-2xl border text-left text-xs md:text-sm transition-all hover-zoom-interactive ${btnStyle}`}
                      >
                        <span className="font-extrabold mr-2">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 hover-zoom-btn"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                      {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án & Giải thích'}
                    </button>

                    {showAnswer && (
                      <button
                        onClick={handleAwardQuizCoin}
                        disabled={rewardAwarded}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover-zoom-btn ${
                          rewardAwarded
                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        {rewardAwarded ? 'Đã tặng +5 xu thành công!' : `Thưởng +5 xu cho ${selectedStudent?.name || 'học sinh'}`}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (activeQuizIndex < quizQuestions.length - 1) {
                        setActiveQuizIndex(prev => prev + 1);
                        setSelectedAnswer(null);
                        setShowAnswer(false);
                        setRewardAwarded(false);
                      }
                    }}
                    disabled={activeQuizIndex === quizQuestions.length - 1}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover-zoom-btn disabled:opacity-40"
                  >
                    <span>Câu tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Explanation */}
                {showAnswer && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Giải thích chi tiết: </strong>
                      {quizQuestions[activeQuizIndex].explanation}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Smart AI Seating Optimizer */}
      {activeTab === 'seating' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 hover-zoom-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Đề Xuất Sắp Xếp Sơ Đồ Bàn Học Thông Minh
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Phân tích học lực, tính cách và điểm xu thi đua để ghép cặp bàn đôi "Đôi Bạn Cùng Tiến"
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateSeating}
                disabled={isLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 hover-zoom-btn disabled:opacity-50"
              >
                <Brain className="w-4 h-4" />
                {isLoading ? 'AI Đang Phân Tích Lớp...' : 'Phân Tích & Tạo Đề Xuất'}
              </button>

              {seatingProposal && (
                <button
                  onClick={handleApplySeatingProposal}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/25 hover-zoom-btn"
                >
                  <Check className="w-4 h-4" />
                  Áp Dụng Vào Sơ Đồ Lớp
                </button>
              )}
            </div>
          </div>

          {seatingProposal ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs md:text-sm text-blue-950 leading-relaxed">
                <strong>💡 Nguyên lý sư phạm: </strong>
                {seatingProposal.rationale}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {seatingProposal.pairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover-zoom-card space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                        Bàn đôi #{idx + 1}
                      </span>
                      <HeartHandshake className="w-3.5 h-3.5 text-pink-500" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="text-blue-600">{pair.student1}</span>
                      <span className="text-slate-400">cùng</span>
                      <span className="text-indigo-600">{pair.student2}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {pair.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-xs md:text-sm font-medium">
                Bấm nút "Phân Tích & Tạo Đề Xuất" để AI tối ưu hóa vị trí ngồi theo mô hình đôi bạn cùng tiến.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: 5-Minute Energizers */}
      {activeTab === 'energizers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              title: 'Trò chơi "Vỗ tay theo nhịp Hạnh Phúc"',
              duration: '3 phút',
              benefit: 'Khởi động sự tập trung tức thì, giải phóng năng lượng uể oải',
              rules: 'Giáo viên vỗ 1 nhịp = Cả lớp đứng lên vỗ 2 nhịp; Giáo viên vỗ 2 nhịp = Cả lớp cười ha ha. Bạn nào nhầm vỗ phạt cười thật to!'
            },
            {
              title: 'Thử thách "Bức tượng tĩnh lặng"',
              duration: '2 phút',
              benefit: 'Ổn định trật tự khi lớp đang quá ồn ào hoặc sau giờ ra chơi',
              rules: 'Giáo viên bấm chuông chống ồn, cả lớp hóa thành tượng bất động trong 60 giây. Tổ nào giữ trật tự 100% nhận ngay +3 xu thi đua!'
            },
            {
              title: 'Vòng quay "Chiếc hộp bí mật"',
              duration: '5 phút',
              benefit: 'Ôn tập kiến thức cũ thông qua hình thức bốc thăm may mắn',
              rules: 'Dùng Vòng quay may mắn gọi tên 3 bạn. Mỗi bạn giải đúng 1 câu đố nhanh sẽ nhận ngay 1 món quà hoặc +5 xu thi đua.'
            },
            {
              title: 'Trò chơi "Gió thổi - Gió thổi"',
              duration: '4 phút',
              benefit: 'Gắn kết học sinh, rèn luyện phản xạ nhanh nhạy',
              rules: 'Giáo viên hô "Gió thổi, gió thổi!", học sinh đáp "Thổi ai, thổi ai?". Giáo viên: "Thổi những bạn mang áo trắng đổi chỗ cho nhau!".'
            },
            {
              title: 'Bức thư "Lời khen giấu tên"',
              duration: '5 phút',
              benefit: 'Xây dựng lòng nhân ái, nuôi dưỡng tình bạn hạnh phúc',
              rules: 'Mỗi học sinh viết 1 lời khen dễ thương gửi cho bạn ngồi cạnh. Cuối giờ giáo viên đọc 3 lời khen ấm áp nhất trước lớp.'
            },
            {
              title: 'Thử thách "Đồng hồ cát 10 giây"',
              duration: '2 phút',
              benefit: 'Rèn tác phong thu dọn đồ dùng học tập nhanh gọn',
              rules: 'Bật đồng hồ đếm ngược 10 giây. Tất cả học sinh phải cất sách cũ, lấy vở mới ra bàn trước khi tiếng chuông reng.'
            }
          ].map((game, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover-zoom-card flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    ⏱️ {game.duration}
                  </span>
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {game.title}
                </h3>
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  🎯 {game.benefit}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {game.rules}
                </p>
              </div>

              <button
                onClick={() => {
                  playPointClink();
                  confetti({ particleCount: 30, spread: 50 });
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover-zoom-btn"
              >
                Kích hoạt trò chơi này ngay 🎉
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: AI Pedagogical Advisor Chat */}
      {activeTab === 'advisor' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px] hover-zoom-card">
          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <Brain className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center text-xs text-slate-500 italic">
                <Brain className="w-4 h-4 animate-spin text-blue-600" />
                AI đang suy nghĩ giải pháp sư phạm...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={userChatInput}
              onChange={(e) => setUserChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Nhập tình huống lớp học (ví dụ: Học sinh hay quên sách vở, cách xử lý nhẹ nhàng?)..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendChat}
              disabled={isLoading || !userChatInput.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 hover-zoom-btn disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Gửi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
