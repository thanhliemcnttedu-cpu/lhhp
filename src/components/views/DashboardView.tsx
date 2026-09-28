import React, { useState } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { 
  Users, CheckSquare, Gift, Sparkles, Plus, 
  ArrowUpRight, Award, Calendar, BookOpen, ChevronRight,
  TrendingUp, Brain, School, Trophy, Flame, RotateCcw
} from 'lucide-react';
import { playPointClink, playFanfareSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { callGeminiAi } from '../../services/aiService';
import { APP_AUTHOR_INFO } from '../../data/initialData';

interface DashboardViewProps {
  onNavigate: (viewId: any) => void;
  onOpenAddStudent?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onNavigate,
  onOpenAddStudent 
}) => {
  const { 
    classes, activeClassId, setActiveClassId, students, currentClassStudents, 
    currentDateAttendance, timetable, awardPoints,
    teacherProfile, resetToDefaultData
  } = useClassroom();

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];

  // Selected class for Timetable view on Dashboard
  const [selectedTimetableClassId, setSelectedTimetableClassId] = useState<string>(activeClassId || (classes[0]?.id || ''));
  // Selected class for Top Students ranking view on Dashboard
  const [selectedRankingClassId, setSelectedRankingClassId] = useState<string>(activeClassId || (classes[0]?.id || ''));

  // Sync if activeClassId changes
  React.useEffect(() => {
    if (activeClassId) {
      setSelectedTimetableClassId(activeClassId);
      setSelectedRankingClassId(activeClassId);
    }
  }, [activeClassId]);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Chào buổi sáng';
    if (hour < 14) return 'Chào buổi trưa';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Metrics for active class
  const totalStudents = currentClassStudents.length;
  const presentCount = currentClassStudents.filter(
    s => currentDateAttendance[s.id] === 'present'
  ).length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 100;
  
  const totalCoins = currentClassStudents.reduce((acc, s) => acc + (s.points || 0), 0);
  const avgCoins = totalStudents > 0 ? (totalCoins / totalStudents).toFixed(1) : '0';

  // Ranking of all classes if multiple classes exist (Yêu cầu 1)
  const classesRanking = classes.map(cls => {
    const clsStudents = students.filter(s => s.classId === cls.id);
    const sumCoins = clsStudents.reduce((acc, s) => acc + (s.points || 0), 0);
    const avg = clsStudents.length > 0 ? (sumCoins / clsStudents.length).toFixed(1) : '0';
    const topSt = [...clsStudents].sort((a, b) => b.points - a.points)[0];
    return {
      ...cls,
      studentCount: clsStudents.length,
      totalCoins: sumCoins,
      avgCoins: avg,
      topStudent: topSt
    };
  }).sort((a, b) => b.totalCoins - a.totalCoins);

  // Top ranked students for the selected ranking class
  const rankingClassStudents = students.filter(s => s.classId === selectedRankingClassId);
  const sortedStudents = [...rankingClassStudents].sort((a, b) => b.points - a.points);
  const topStudents = sortedStudents.slice(0, 5);

  // Today timetable slots for selected timetable class (Yêu cầu 1: Cố định theo từng lớp)
  const currentDayOfWeek = new Date().getDay() + 1; // 2 = Mon, 3 = Tue...
  const selectedTimetableClass = classes.find(c => c.id === selectedTimetableClassId) || activeClass;
  const todaySlots = timetable.filter(t => 
    t.day === currentDayOfWeek && 
    (t.classId ? t.classId === selectedTimetableClassId : (selectedTimetableClassId === classes[0]?.id))
  ).sort((a, b) => {
    if (a.session === b.session) return a.period - b.period;
    return a.session === 'morning' ? -1 : 1;
  });

  // AI Daily Inspiration Quote
  const [dailyQuote, setDailyQuote] = useState<string>(
    '“Mỗi đứa trẻ là một bông hoa độc nhất vô nhị. Giáo dục hạnh phúc bắt đầu từ sự lắng nghe và yêu thương chân thành.”'
  );
  const [loadingQuote, setLoadingQuote] = useState(false);

  const fetchAiQuote = async () => {
    setLoadingQuote(true);
    try {
      const prompt = `Viết 1 câu châm ngôn sư phạm ngắn (1-2 câu) truyền cảm hứng và yêu thương cho thầy/cô giáo chủ nhiệm lớp ${activeClass?.name || 'tiểu học'} trong ngày hôm nay theo triết lý "Lớp Học Hạnh Phúc".`;
      const quote = await callGeminiAi({ prompt });
      if (quote) setDailyQuote(quote.trim());
    } catch {
      // Keep existing default
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleQuickAddCoin = (studentId: string, studentName: string, amount: number) => {
    awardPoints([studentId], amount, `Thưởng nhanh +${amount} xu đầu ngày`);
    playPointClink();
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Empty State Banner if no classes exist */}
      {classes.length === 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">Chưa có lớp học nào trong hệ thống</h4>
              <p className="text-xs text-amber-800 mt-0.5">Khôi phục ngay dữ liệu mẫu chuẩn: 1 Lớp 4A1, Cô giáo Nguyễn Thị Hoa và 30 học sinh.</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetToDefaultData();
              playFanfareSound();
              confetti({ particleCount: 60, spread: 70 });
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shrink-0 hover-zoom-btn flex items-center gap-2 shadow-md shadow-indigo-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi phục Lớp 4A1 ngay</span>
          </button>
        </div>
      )}

      {/* 1. Main Welcome Banner matching PDF Page 1 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-100 via-indigo-50 to-blue-100 p-6 md:p-8 border border-indigo-200/80 shadow-xs hover-zoom-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left Greeting & Avatar */}
          <div className="flex items-start md:items-center gap-4 md:gap-5">
            <div className="relative shrink-0">
              <img
                src={teacherProfile.avatar}
                alt={teacherProfile.name}
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white hover-zoom-interactive"
              />
              <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 bg-indigo-600 text-white font-extrabold text-[10px] rounded-full shadow-xs">
                {teacherProfile.role || 'GVCN'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-xs font-black text-indigo-700 shadow-2xs border border-indigo-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Năm học: <strong className="text-indigo-900 font-black">{teacherProfile.academicYear || activeClass?.academicYear || '2026 – 2027'}</strong></span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-xs font-black text-emerald-800 border border-emerald-200 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đơn vị: <strong className="text-emerald-950 font-black">{teacherProfile.schoolName || 'TRƯỜNG HỌC HẠNH PHÚC'}</strong></span>
                </div>
              </div>

              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-indigo-950 tracking-tight">
                {getGreeting()}, <span className="text-indigo-600">{teacherProfile.name}</span>! 👋
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-slate-600 font-semibold">
                <span>Giáo viên: <strong className="text-indigo-800 font-extrabold">{teacherProfile.name}</strong></span>
                <span>•</span>
                <span>Lớp phụ trách: <strong className="text-indigo-700 font-black">{activeClass ? `Lớp ${activeClass.name} (${activeClass.grade})` : 'Chưa có lớp'}</strong></span>
                {teacherProfile.phone && (
                  <>
                    <span>•</span>
                    <span>SĐT / Zalo: <a href={`https://zalo.me/${teacherProfile.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono font-bold">{teacherProfile.phone}</a></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right 4 Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap lg:grid lg:grid-cols-2 shrink-0">
            <button
              onClick={() => onNavigate('attendance')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 hover-zoom-btn"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Điểm danh ngay</span>
            </button>

            <button
              onClick={() => onOpenAddStudent ? onOpenAddStudent() : onNavigate('students')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 hover-zoom-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm học sinh</span>
            </button>

            <button
              onClick={() => onNavigate('wheel')}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 hover-zoom-btn"
            >
              <Sparkles className="w-4 h-4" />
              <span>Vòng quay may mắn</span>
            </button>

            <button
              onClick={() => onNavigate('rewards')}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 hover-zoom-btn"
            >
              <Gift className="w-4 h-4" />
              <span>Đổi xu phần thưởng</span>
            </button>

            <button
              onClick={() => onNavigate('infographic')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 hover-zoom-btn col-span-2 sm:col-span-1"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Infographic Lớp A4</span>
            </button>
          </div>
        </div>

        {/* AI Daily Inspiration banner & Permanent Author badge */}
        <div className="mt-5 pt-4 border-t border-indigo-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center gap-2.5 italic flex-1">
            <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">{dailyQuote}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchAiQuote}
              disabled={loadingQuote}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline hover-zoom-interactive"
            >
              {loadingQuote ? 'Đang tải...' : 'Lấy cảm hứng mới AI'}
            </button>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="text-[11px] text-slate-500 hidden md:inline font-medium">
              Tác giả: <strong className="text-indigo-700">{APP_AUTHOR_INFO.name}</strong> - {APP_AUTHOR_INFO.schoolName}
            </span>
            <span className="text-slate-300 hidden md:inline">|</span>
            <a 
              href={APP_AUTHOR_INFO.zaloUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline hidden lg:inline-flex items-center gap-1 font-mono"
            >
              <span>Zalo hỗ trợ: {APP_AUTHOR_INFO.zalo}</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. CLASS SELECTOR SWITCHER (When multiple classes exist - Yêu cầu 1) */}
      {classes.length > 1 && (
        <div className="bg-white rounded-3xl p-4 border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
              <School className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-indigo-900 block">CHỌN LỚP XEM BẢNG TIN:</span>
              <span className="text-[11px] text-slate-500">Hệ thống đang quản lý {classes.length} lớp học</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {classes.map(cls => {
              const isSelected = cls.id === activeClassId;
              const count = students.filter(s => s.classId === cls.id).length;
              return (
                <button
                  key={cls.id}
                  onClick={() => {
                    setActiveClassId(cls.id);
                    setSelectedTimetableClassId(cls.id);
                    setSelectedRankingClassId(cls.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 hover-zoom-btn ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25 scale-103 font-black'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-indigo-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white/60" style={{ backgroundColor: cls.color || '#3B82F6' }} />
                  <span>Lớp {cls.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count} HS
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sĩ số */}
        <div 
          onClick={() => onNavigate('students')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover-zoom-card cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500">Sĩ số học sinh</div>
          <div className="text-2xl font-black text-indigo-950 tracking-tight mt-0.5">
            {totalStudents} <span className="text-sm font-semibold text-slate-500">em ({activeClass ? `Lớp ${activeClass.name}` : 'Chưa có lớp'})</span>
          </div>
        </div>

        {/* Card 2: Hiện diện hôm nay */}
        <div 
          onClick={() => onNavigate('attendance')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover-zoom-card cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Điểm danh <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500">Hiện diện hôm nay</div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
            {presentCount}/{totalStudents} <span className="text-sm font-bold text-slate-500">({attendanceRate}%)</span>
          </div>
        </div>

        {/* Card 3: Tổng xu thi đua */}
        <div 
          onClick={() => onNavigate('rewards')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover-zoom-card cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Đổi quà <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500">Tổng xu thi đua</div>
          <div className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">
            {totalCoins} <span className="text-sm font-bold text-slate-500">xu toàn lớp</span>
          </div>
        </div>

        {/* Card 4: Trung bình / học sinh */}
        <div 
          onClick={() => onNavigate('reports')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover-zoom-card cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Báo cáo <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500">Trung bình / học sinh</div>
          <div className="text-2xl font-black text-purple-600 tracking-tight mt-0.5">
            {avgCoins} <span className="text-sm font-bold text-slate-500">xu / em</span>
          </div>
        </div>
      </div>

      {/* 4. TOP THI ĐUA NHẬN XU THEO LỚP (Hiển thị khi có nhiều lớp học - Yêu cầu 1) */}
      {classes.length > 1 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/60 to-yellow-50/70 rounded-3xl p-5 border border-amber-200/80 shadow-xs hover-zoom-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center font-black shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-black text-amber-950">
                  Bảng Xếp Hạng Thi Đua Nhận Xu Theo Lớp Học
                </h3>
                <p className="text-xs text-amber-800">
                  Thống kê tổng điểm xu thi đua, điểm trung bình và học sinh tiêu biểu của từng lớp
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 self-start sm:self-auto hover-zoom-interactive"
            >
              <span>Xem báo cáo chi tiết</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {classesRanking.map((cls, idx) => {
              const medalBadges = ['🥇 Hạng 1', '🥈 Hạng 2', '🥉 Hạng 3'];
              const medalStyles = [
                'bg-amber-100 text-amber-900 border-amber-300 font-black',
                'bg-slate-100 text-slate-800 border-slate-300 font-bold',
                'bg-orange-100 text-orange-900 border-orange-300 font-bold'
              ];

              return (
                <div
                  key={cls.id}
                  onClick={() => {
                    setActiveClassId(cls.id);
                    setSelectedTimetableClassId(cls.id);
                    setSelectedRankingClassId(cls.id);
                  }}
                  className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer hover-zoom-interactive shadow-xs ${
                    cls.id === activeClassId 
                      ? 'border-indigo-400 ring-2 ring-indigo-400/30' 
                      : 'border-amber-200/80 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${idx < 3 ? medalStyles[idx] : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {idx < 3 ? medalBadges[idx] : `Hạng ${idx + 1}`}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {cls.studentCount} học sinh
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-indigo-900">
                        Lớp {cls.name}
                      </h4>
                      <div className="text-xs text-slate-500 font-medium">
                        {cls.grade} · GV: {cls.teacherName || teacherProfile.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-amber-600">
                        🪙 {cls.totalCoins} xu
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        TB: {cls.avgCoins} xu/em
                      </div>
                    </div>
                  </div>

                  {cls.topStudent && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Dẫn đầu lớp:</span>
                      <span className="font-extrabold text-indigo-700 truncate max-w-[140px]">
                        ⭐ {cls.topStudent.name} ({cls.topStudent.points} xu)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Bottom Grid: Timetable today & Top Students ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Thời Khóa Biểu Cố Định Theo Từng Lớp (Yêu cầu 1) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover-zoom-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-black text-indigo-950">
                    Thời Khóa Biểu Hôm Nay
                  </h2>
                  <span className="text-[11px] text-indigo-600 font-bold block">
                    Cố định theo: <strong>Lớp {selectedTimetableClass?.name}</strong>
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('schedule')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover-zoom-interactive"
              >
                <span>Xem cả tuần</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Class switcher buttons for Timetable if multiple classes (Yêu cầu 1) */}
            {classes.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Lớp:</span>
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedTimetableClassId(cls.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 hover-zoom-btn ${
                      selectedTimetableClassId === cls.id
                        ? 'bg-blue-600 text-white font-black shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Lớp {cls.name}
                  </button>
                ))}
              </div>
            )}

            {todaySlots.length > 0 ? (
              <div className="space-y-2">
                {todaySlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-100 transition-all hover-zoom-interactive"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-white text-indigo-700 font-extrabold text-xs flex items-center justify-center shadow-2xs border border-indigo-100">
                        T{slot.period}
                      </span>
                      <div>
                        <div className="text-xs md:text-sm font-black text-indigo-950">{slot.subject}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {slot.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều'} · {slot.teacher || teacherProfile.name}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-black">
                      Tiết {slot.period}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs md:text-sm font-medium text-slate-600">
                  Hôm nay không có tiết học nào trong thời khóa biểu Lớp {selectedTimetableClass?.name}.
                </p>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="text-xs font-bold text-indigo-600 hover:underline inline-block mt-1 hover-zoom-interactive"
                >
                  + Cài đặt thời khóa biểu cố định lớp {selectedTimetableClass?.name}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Top Thi Đua Nhận Xu Theo Lớp (Yêu cầu 1) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover-zoom-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-black text-indigo-950">
                    Top Thi Đua Nhận Xu
                  </h2>
                  <span className="text-[11px] text-amber-700 font-bold block">
                    Đang xem: <strong>Lớp {classes.find(c => c.id === selectedRankingClassId)?.name || activeClass?.name}</strong>
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover-zoom-interactive"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Class switcher buttons for Top Students if multiple classes (Yêu cầu 1) */}
            {classes.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Lớp:</span>
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedRankingClassId(cls.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 hover-zoom-btn ${
                      selectedRankingClassId === cls.id
                        ? 'bg-amber-500 text-white font-black shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Lớp {cls.name}
                  </button>
                ))}
              </div>
            )}

            {topStudents.length > 0 ? (
              <div className="space-y-2.5">
                {topStudents.map((st, idx) => {
                  const medalColors = [
                    'bg-amber-100 text-amber-900 border-amber-300 font-black',
                    'bg-slate-200 text-slate-800 border-slate-300 font-bold',
                    'bg-orange-100 text-orange-950 border-orange-300 font-bold',
                  ];

                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-amber-50/40 rounded-2xl border border-slate-100 transition-all hover-zoom-interactive"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl text-xs flex items-center justify-center border ${
                          idx < 3 ? medalColors[idx] : 'bg-white text-slate-600 border-slate-200 font-bold'
                        }`}>
                          {idx + 1}
                        </span>

                        <img
                          src={st.avatar}
                          alt={st.name}
                          className="w-10 h-10 rounded-xl object-cover bg-white ring-2 ring-slate-100"
                        />

                        <div>
                          <div className="text-xs md:text-sm font-black text-indigo-950">{st.name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {st.gender} · {st.group || 'Tổ 1'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 font-black text-xs rounded-xl shadow-2xs">
                          🪙 {st.points} xu
                        </span>

                        {/* Quick +1, +5 buttons */}
                        <button
                          onClick={() => handleQuickAddCoin(st.id, st.name, 1)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[11px] rounded-lg border border-emerald-200 hover-zoom-btn"
                          title="Cộng +1 xu"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleQuickAddCoin(st.id, st.name, 5)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-black text-[11px] rounded-lg border border-blue-200 hover-zoom-btn"
                          title="Cộng +5 xu"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs md:text-sm font-medium text-slate-600">
                  Lớp này chưa có danh sách học sinh.
                </p>
                <button
                  onClick={() => onNavigate('students')}
                  className="text-xs font-bold text-indigo-600 hover:underline inline-block mt-1 hover-zoom-interactive"
                >
                  + Thêm học sinh cho lớp
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
