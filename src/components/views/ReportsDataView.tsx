import React, { useState, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student } from '../../types';
import { APP_AUTHOR_INFO } from '../../data/initialData';
import { 
  BarChart3, Download, Upload, Trash2, 
  RotateCcw, AlertTriangle, UserCheck, Award, 
  BookOpen, Check, User, Camera, Sparkles, 
  TrendingUp, Star, Filter, Search, ChevronRight, PieChart, ShieldCheck,
  LineChart, FileArchive, Globe, Phone, MessageCircle, Calendar, Hash, X, CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playFanfareSound } from '../../utils/audio';
import { TeacherAvatarEditorModal } from '../modals/TeacherAvatarEditorModal';
import { compressImage } from '../../utils/imageCompressor';
import { ZoomIn, Heart } from 'lucide-react';

interface ReportsDataViewProps {
  defaultTab?: 'stats' | 'data' | 'profile';
}

type ChartType = 'pie' | 'bar' | 'line';
type MetricType = 'tier' | 'group' | 'subjects' | 'top_students';

export const ReportsDataView: React.FC<ReportsDataViewProps> = ({ defaultTab = 'stats' }) => {
  const { 
    currentClassStudents, transactions, subjects, 
    activeClassId, classes, updateClass, exportBackupJson, importBackupJson,
    exportBackupZip, importBackupZip, currentRole,
    resetToDefaultData, clearAllData, teacherProfile, updateTeacherProfile 
  } = useClassroom();

  const [activeTab, setActiveTab] = useState<'stats' | 'data' | 'profile'>(defaultTab);

  React.useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  // Chart configuration
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [metricType, setMetricType] = useState<MetricType>('tier');
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  // Table filters
  const [filterTier, setFilterTier] = useState<'all' | 'excellent' | 'good' | 'average' | 'needs_help'>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);

  // In-app Modals for Reset and Clear Data (Replaces window.confirm)
  const [isResetDefaultModalOpen, setIsResetDefaultModalOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);

  // Teacher Profile form state (User request 4)
  const [profileName, setProfileName] = useState(teacherProfile.name);
  const [profileBirthDate, setProfileBirthDate] = useState(teacherProfile.birthDate || '15/08/1988');
  const [profileRole, setProfileRole] = useState(teacherProfile.role);
  const [profileSchool, setProfileSchool] = useState(teacherProfile.schoolName);
  const [profileAvatar, setProfileAvatar] = useState(teacherProfile.avatar);
  const [profileAcademicYear, setProfileAcademicYear] = useState(teacherProfile.academicYear || '2026 – 2027');
  const [profilePhone, setProfilePhone] = useState(teacherProfile.phone || '0977058363');
  const [profileZalo, setProfileZalo] = useState(teacherProfile.zalo || '0977058363');
  const [profileFacebook, setProfileFacebook] = useState(teacherProfile.facebook || 'https://www.facebook.com/tieuhocso1tanuyen/');
  const [profileSocialLink, setProfileSocialLink] = useState(teacherProfile.socialLink || 'https://zalo.me/0977058363');
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [isTeacherAvatarEditorOpen, setIsTeacherAvatarEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);

  const activeClass = classes.find(c => c.id === activeClassId);

  // Parent committee states for active class
  const [classSlogan, setClassSlogan] = useState(activeClass?.slogan || 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng');
  const [parentHeadName, setParentHeadName] = useState(activeClass?.parentCommittee?.head?.name || 'Trần Văn Mạnh');
  const [parentHeadPhone, setParentHeadPhone] = useState(activeClass?.parentCommittee?.head?.phone || '0988 123 456');
  const [parentDeputyName, setParentDeputyName] = useState(activeClass?.parentCommittee?.deputy?.name || 'Nguyễn Thị Mai');
  const [parentDeputyPhone, setParentDeputyPhone] = useState(activeClass?.parentCommittee?.deputy?.phone || '0977 654 321');
  const [parentMember1Name, setParentMember1Name] = useState(activeClass?.parentCommittee?.member1?.name || 'Lê Hoàng Nam');
  const [parentMember1Phone, setParentMember1Phone] = useState(activeClass?.parentCommittee?.member1?.phone || '0912 345 678');
  const [parentMember2Name, setParentMember2Name] = useState(activeClass?.parentCommittee?.member2?.name || 'Phạm Thị Lan');
  const [parentMember2Phone, setParentMember2Phone] = useState(activeClass?.parentCommittee?.member2?.phone || '0903 890 123');
  const [parentSavedToast, setParentSavedToast] = useState(false);

  React.useEffect(() => {
    if (activeClass) {
      setClassSlogan(activeClass.slogan || 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng');
      setParentHeadName(activeClass.parentCommittee?.head?.name || '');
      setParentHeadPhone(activeClass.parentCommittee?.head?.phone || '');
      setParentDeputyName(activeClass.parentCommittee?.deputy?.name || '');
      setParentDeputyPhone(activeClass.parentCommittee?.deputy?.phone || '');
      setParentMember1Name(activeClass.parentCommittee?.member1?.name || '');
      setParentMember1Phone(activeClass.parentCommittee?.member1?.phone || '');
      setParentMember2Name(activeClass.parentCommittee?.member2?.name || '');
      setParentMember2Phone(activeClass.parentCommittee?.member2?.phone || '');
    }
  }, [activeClass]);

  const handleSaveParentCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    updateClass(activeClass.id, {
      slogan: classSlogan.trim(),
      parentCommittee: {
        head: { name: parentHeadName.trim(), phone: parentHeadPhone.trim(), roleTitle: 'Trưởng ban phụ huynh' },
        deputy: { name: parentDeputyName.trim(), phone: parentDeputyPhone.trim(), roleTitle: 'Phó ban phụ huynh' },
        member1: { name: parentMember1Name.trim(), phone: parentMember1Phone.trim(), roleTitle: 'Ủy viên ban phụ huynh' },
        member2: { name: parentMember2Name.trim(), phone: parentMember2Phone.trim(), roleTitle: 'Ủy viên ban phụ huynh' }
      }
    });
    setParentSavedToast(true);
    confetti({ particleCount: 35, spread: 50 });
    setTimeout(() => setParentSavedToast(false), 3000);
  };

  // Calculations for stats
  const totalCoins = currentClassStudents.reduce((acc, s) => acc + s.points, 0);
  const avgCoins = currentClassStudents.length > 0 ? (totalCoins / currentClassStudents.length).toFixed(1) : '0';
  
  // Tier breakdown
  const excellentStudents = currentClassStudents.filter(s => s.points >= 30);
  const goodStudents = currentClassStudents.filter(s => s.points >= 15 && s.points < 30);
  const averageStudents = currentClassStudents.filter(s => s.points > 0 && s.points < 15);
  const lowCoinStudents = currentClassStudents.filter(s => s.points <= 0);

  // Group breakdown
  const groupsList = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];
  const groupStats = groupsList.map(g => {
    const mems = currentClassStudents.filter(s => (s.group || 'Tổ 1') === g);
    const sumPoints = mems.reduce((a, b) => a + b.points, 0);
    const avg = mems.length > 0 ? Math.round((sumPoints / mems.length) * 10) / 10 : 0;
    return { name: g, count: mems.length, total: sumPoints, avg };
  });

  // Subject breakdown
  const classTransactions = transactions.filter(t => t.classId === activeClassId);
  const subjectPointsMap: Record<string, { positive: number; negative: number; count: number }> = {};
  subjects.forEach(sub => {
    subjectPointsMap[sub.name] = { positive: 0, negative: 0, count: 0 };
  });
  classTransactions.forEach(tx => {
    const sName = tx.subjectName || 'Chung';
    if (!subjectPointsMap[sName]) {
      subjectPointsMap[sName] = { positive: 0, negative: 0, count: 0 };
    }
    subjectPointsMap[sName].count += 1;
    if (tx.amount > 0) {
      subjectPointsMap[sName].positive += tx.amount;
    } else {
      subjectPointsMap[sName].negative += Math.abs(tx.amount);
    }
  });

  const subjectData = Object.entries(subjectPointsMap)
    .map(([name, data]) => ({ name, value: data.positive, count: data.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Top 10 students
  const top10Students = [...currentClassStudents]
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map(s => ({ name: s.name, value: s.points, stt: s.stt }));

  // Dynamic Chart Datasets based on selected metric
  const getChartData = () => {
    switch (metricType) {
      case 'tier':
        return [
          { label: 'Xuất sắc (≥30 xu)', value: excellentStudents.length, color: '#F59E0B', sub: `${excellentStudents.length} em` },
          { label: 'Tích cực (15-29 xu)', value: goodStudents.length, color: '#10B981', sub: `${goodStudents.length} em` },
          { label: 'Cần phát huy (1-14 xu)', value: averageStudents.length, color: '#3B82F6', sub: `${averageStudents.length} em` },
          { label: 'Cần rèn luyện (≤0 xu)', value: lowCoinStudents.length, color: '#EF4444', sub: `${lowCoinStudents.length} em` },
        ];
      case 'group':
        return groupStats.map((g, idx) => {
          const colors = ['#6366F1', '#EC4899', '#06B6D4', '#F59E0B'];
          return { label: g.name, value: g.total, color: colors[idx % colors.length], sub: `TB: ${g.avg} xu (${g.count} em)` };
        });
      case 'subjects':
        const subColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];
        return subjectData.map((s, idx) => ({
          label: s.name,
          value: s.value,
          color: subColors[idx % subColors.length],
          sub: `${s.count} lượt khen`
        }));
      case 'top_students':
        const topColors = ['#F59E0B', '#EAB308', '#F97316', '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#14B8A6', '#8B5CF6', '#A855F7'];
        return top10Students.map((s, idx) => ({
          label: `#${s.stt} ${s.name}`,
          value: s.value,
          color: topColors[idx % topColors.length],
          sub: `${s.value} xu thi đua`
        }));
    }
  };

  const chartData = getChartData();
  const totalChartValue = chartData.reduce((a, b) => a + b.value, 0);
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  // Filtered students for Leaderboard
  const filteredStudents = currentClassStudents
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchStudent.toLowerCase()) || s.stt.toString().includes(searchStudent);
      if (!matchSearch) return false;
      if (filterGroup !== 'all' && (s.group || 'Tổ 1') !== filterGroup) return false;
      if (filterTier === 'excellent') return s.points >= 30;
      if (filterTier === 'good') return s.points >= 15 && s.points < 30;
      if (filterTier === 'average') return s.points > 0 && s.points < 15;
      if (filterTier === 'needs_help') return s.points <= 0;
      return true;
    })
    .sort((a, b) => b.points - a.points);

  // Export full report CSV for Zalo/Parents
  const handleExportReportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += 'STT,Họ và tên,Ngày sinh,Giới tính,Tổ,Số xu thi đua,Xếp loại thi đua,Khuyến nghị giáo viên\n';

    currentClassStudents.forEach(st => {
      const evaluation = st.points >= 30 ? 'Xuất sắc' : st.points >= 15 ? 'Tích cực' : st.points > 0 ? 'Cần phát huy' : 'Cần rèn luyện thêm';
      const advice = st.points >= 30 
        ? 'Phát huy tinh thần gương mẫu dẫn đầu' 
        : st.points >= 15 
          ? 'Hăng hái, chăm ngoan' 
          : st.points > 0 
            ? 'Cần tự tin phát biểu nhiều hơn' 
            : 'Cần giáo viên và gia đình khích lệ tích cực';

      csv += `${st.stt},"${st.name}","${st.birthDate || ''}","${st.gender}","${st.group || 'Chưa chia'}","${st.points}","${evaluation}","${advice}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Thi_Dua_${activeClass?.name || 'Lop'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImportLoading(true);
      const isZip = file.name.toLowerCase().endsWith('.zip');
      const ok = isZip ? await importBackupZip(file) : await importBackupJson(file);
      setIsImportLoading(false);
      if (ok) {
        setImportStatus(`Khôi phục thành công toàn bộ dữ liệu từ file ${file.name}!`);
        confetti({ particleCount: 60, spread: 70 });
      } else {
        setImportStatus('Lỗi: File sao lưu không hợp lệ hoặc bị hỏng.');
      }
      setTimeout(() => setImportStatus(null), 4000);
      e.target.value = '';
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 600, 600, 0.88);
        setProfileAvatar(compressedBase64);
        setIsTeacherAvatarEditorOpen(true);
      } catch (err) {
        console.error('Lỗi khi nén ảnh giáo viên:', err);
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setProfileAvatar(ev.target.result as string);
            setIsTeacherAvatarEditorOpen(true);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeacherProfile({
      name: profileName.trim(),
      birthDate: profileBirthDate.trim(),
      role: profileRole.trim(),
      schoolName: profileSchool.trim(),
      avatar: profileAvatar,
      academicYear: profileAcademicYear.trim(),
      phone: profilePhone.trim(),
      zalo: profileZalo.trim(),
      facebook: profileFacebook.trim(),
      socialLink: profileSocialLink.trim()
    });

    setProfileSavedToast(true);
    confetti({ particleCount: 35, spread: 50 });
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Navigation Tabs */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-4 md:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover-zoom-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
              {activeTab === 'stats' && 'Báo Cáo & Thống Kê Tổng Quan Lớp Học'}
              {activeTab === 'data' && 'Quản Lý Sao Lưu & Khôi Phục Dữ Liệu (.JSON & .ZIP)'}
              {activeTab === 'profile' && 'Cài Đặt Hồ Sơ Giáo Viên & Thông Tin Hệ Thống'}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTab === 'stats' && 'Biểu đồ trực quan, phân tích đa chiều và bảng xếp hạng thi đua.'}
              {activeTab === 'data' && 'Tải về sao lưu định dạng .JSON / nén .ZIP hoặc khôi phục an toàn tuyệt đối.'}
              {activeTab === 'profile' && 'Cập nhật tên giáo viên, đơn vị công tác, năm học, số điện thoại và Zalo hỗ trợ.'}
            </p>
          </div>
        </div>

        {/* 3 Main Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTab === 'stats' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống Kê</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTab === 'data' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Dữ Liệu</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTab === 'profile' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Cài Đặt</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in duration-150 shadow-xs border ${
          importStatus.includes('Lỗi') 
            ? 'bg-rose-50 border-rose-300 text-rose-900' 
            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}>
          {importStatus.includes('Lỗi') ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span className="font-bold">{importStatus}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: THỐNG KÊ (User request 6) */}
      {/* ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* 4 Quick KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng Xu Tích Lũy</span>
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-amber-600 mt-2">
                {totalCoins} <span className="text-xs font-bold text-slate-400">xu</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-bold">● {classTransactions.length}</span> lượt khen thưởng & rèn luyện
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Điểm Trung Bình</span>
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-blue-600 mt-2">
                {avgCoins} <span className="text-xs font-bold text-slate-400">xu/em</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Sĩ số lớp: <strong className="text-slate-800">{currentClassStudents.length} học sinh</strong>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Học Sinh Xuất Sắc</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <Star className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-600 mt-2">
                {excellentStudents.length} <span className="text-xs font-bold text-slate-400">em (≥30 xu)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tỷ lệ: <strong className="text-emerald-700">{currentClassStudents.length > 0 ? Math.round((excellentStudents.length / currentClassStudents.length) * 100) : 0}%</strong> sĩ số cả lớp
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cần Khích Lệ Thêm</span>
                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-rose-600 mt-2">
                {lowCoinStudents.length} <span className="text-xs font-bold text-slate-400">em (≤0 xu)</span>
              </div>
              <div className="text-[11px] text-rose-600 mt-1 font-semibold">
                Cần giáo viên tạo cơ hội phát biểu
              </div>
            </div>
          </div>

          {/* MAIN DYNAMIC CHART CARD WITH VIEW SELECTORS (User Request 6) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6 hover-zoom-card">
            {/* Chart Toolbar: Metric Selector & Chart Type Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm md:text-base font-black text-slate-900">
                    Biểu Đồ Tổng Quan & Phân Tích Đa Chiều Lớp {activeClass?.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Lựa chọn thông tin phân tích và chuyển đổi linh hoạt giữa biểu đồ tròn, biểu đồ cột hoặc biểu đồ đường.
                </p>
              </div>

              {/* Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Metric Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Thông tin:</span>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value as MetricType)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover-zoom-btn"
                  >
                    <option value="tier">🏆 Phân bố Xếp loại Thi đua</option>
                    <option value="group">👥 Điểm tích lũy theo từng Tổ</option>
                    <option value="subjects">📚 Khen thưởng theo Môn học</option>
                    <option value="top_students">⭐ Top 10 Học sinh dẫn đầu</option>
                  </select>
                </div>

                {/* 2. Chart Type Selector (Bar, Pie/Donut, Line) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                      chartType === 'bar' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Biểu đồ cột hiện đại"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Cột</span>
                  </button>

                  <button
                    onClick={() => setChartType('pie')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                      chartType === 'pie' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Biểu đồ tròn / Donut sinh động"
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    <span>Tròn</span>
                  </button>

                  <button
                    onClick={() => setChartType('line')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                      chartType === 'line' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Biểu đồ đường xu hướng"
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    <span>Đường</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CHART DISPLAY AREA */}
            <div className="min-h-[300px] flex flex-col justify-center">
              {/* --- MODE 1: BAR CHART --- */}
              {chartType === 'bar' && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chartData.map((item, idx) => {
                      const percent = totalChartValue > 0 ? Math.round((item.value / totalChartValue) * 100) : 0;
                      const barPercent = Math.max(8, Math.round((item.value / maxChartValue) * 100));
                      const isHovered = hoveredDataIndex === idx;

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredDataIndex(idx)}
                          onMouseLeave={() => setHoveredDataIndex(null)}
                          className={`p-4 rounded-2xl border transition-all duration-200 hover-zoom-interactive ${
                            isHovered 
                              ? 'bg-slate-50 border-indigo-300 shadow-sm scale-102' 
                              : 'bg-white border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {item.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900 font-mono">
                                {item.value}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold ml-1">
                                ({percent}%)
                              </span>
                            </div>
                          </div>

                          {/* Bar Graphic with 3D gradient look */}
                          <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-500 shadow-xs"
                              style={{ 
                                width: `${barPercent}%`,
                                backgroundColor: item.color
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                            <span>{item.sub}</span>
                            <span className="font-semibold text-slate-600">{percent}% tổng thể</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- MODE 2: PIE / DONUT CHART --- */}
              {chartType === 'pie' && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
                  {/* SVG Donut Chart */}
                  <div className="relative w-64 h-64 shrink-0 flex items-center justify-center hover-zoom-interactive">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {chartData.map((item, idx) => {
                        let accumulated = 0;
                        for (let i = 0; i < idx; i++) {
                          accumulated += chartData[i].value;
                        }
                        const startRatio = totalChartValue > 0 ? accumulated / totalChartValue : 0;
                        const valueRatio = totalChartValue > 0 ? item.value / totalChartValue : 0;
                        const strokeDasharray = `${valueRatio * 283} ${283 - valueRatio * 283}`;
                        const strokeDashoffset = `${-startRatio * 283}`;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth={hoveredDataIndex === idx ? "15" : "12"}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredDataIndex(idx)}
                            onMouseLeave={() => setHoveredDataIndex(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {hoveredDataIndex !== null && chartData[hoveredDataIndex] ? (
                        <>
                          <div className="text-[10px] font-black uppercase text-slate-400">
                            {chartData[hoveredDataIndex].label}
                          </div>
                          <div className="text-2xl font-black text-slate-900 font-mono">
                            {chartData[hoveredDataIndex].value}
                          </div>
                          <div className="text-[11px] font-bold text-indigo-600">
                            {totalChartValue > 0 ? Math.round((chartData[hoveredDataIndex].value / totalChartValue) * 100) : 0}%
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            TỔNG CỘNG
                          </div>
                          <div className="text-3xl font-black text-slate-900 font-mono">
                            {totalChartValue}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            {currentClassStudents.length} học sinh
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex-1 max-w-md space-y-2.5">
                    {chartData.map((item, idx) => {
                      const percent = totalChartValue > 0 ? Math.round((item.value / totalChartValue) * 100) : 0;
                      const isHovered = hoveredDataIndex === idx;

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredDataIndex(idx)}
                          onMouseLeave={() => setHoveredDataIndex(null)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover-zoom-btn ${
                            isHovered 
                              ? 'bg-slate-50 border-indigo-300 shadow-xs' 
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span 
                              className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs" 
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 truncate block">
                                {item.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {item.sub}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              {item.value}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold ml-1">
                              ({percent}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- MODE 3: LINE / AREA CHART --- */}
              {chartType === 'line' && (
                <div className="py-4 space-y-4">
                  <div className="h-64 relative bg-slate-50/60 rounded-2xl p-4 border border-slate-100 flex flex-col justify-end">
                    {/* SVG Curve */}
                    <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                      <defs>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#E2E8F0" strokeDasharray="3 3" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#E2E8F0" strokeDasharray="3 3" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="#E2E8F0" strokeDasharray="3 3" />

                      {/* Line Points calculation */}
                      {(() => {
                        const stepX = 500 / Math.max(chartData.length - 1, 1);
                        const points = chartData.map((d, i) => {
                          const x = i * stepX;
                          const y = 180 - (d.value / maxChartValue) * 140;
                          return { x, y, ...d };
                        });

                        const pathD = points.reduce((acc, p, i) => {
                          return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                        }, '');

                        const areaD = `${pathD} L ${points[points.length - 1].x} 190 L 0 190 Z`;

                        return (
                          <>
                            <path d={areaD} fill="url(#lineGrad)" />
                            <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round" />
                            {points.map((p, i) => (
                              <g 
                                key={i} 
                                className="cursor-pointer group"
                                onMouseEnter={() => setHoveredDataIndex(i)}
                                onMouseLeave={() => setHoveredDataIndex(null)}
                              >
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={hoveredDataIndex === i ? "7" : "5"} 
                                  fill="#FFFFFF" 
                                  stroke={p.color} 
                                  strokeWidth="3" 
                                  className="transition-all duration-200"
                                />
                                <text 
                                  x={p.x} 
                                  y={p.y - 12} 
                                  textAnchor="middle" 
                                  className="text-[10px] font-mono font-bold fill-slate-700"
                                >
                                  {p.value}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    {/* X-axis labels */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-500 overflow-x-auto">
                      {chartData.map((d, i) => (
                        <div key={i} className="text-center truncate px-1">
                          <span className={hoveredDataIndex === i ? 'text-indigo-600 font-extrabold' : ''}>
                            {d.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Leaderboard & Export CSV */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover-zoom-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Bảng Xếp Hạng Thi Đua & Báo Cáo Học Sinh</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tìm kiếm theo tên, lọc theo tổ hoặc mức thi đua</p>
              </div>

              <button
                onClick={handleExportReportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl transition-all hover-zoom-btn shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file Báo cáo Excel/CSV</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên hoặc STT..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả các Tổ</option>
                <option value="Tổ 1">Tổ 1</option>
                <option value="Tổ 2">Tổ 2</option>
                <option value="Tổ 3">Tổ 3</option>
                <option value="Tổ 4">Tổ 4</option>
              </select>

              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả xếp loại</option>
                <option value="excellent">Xuất sắc (≥30 xu)</option>
                <option value="good">Tích cực (15-29 xu)</option>
                <option value="average">Cần phát huy (1-14 xu)</option>
                <option value="needs_help">Cần rèn luyện (≤0 xu)</option>
              </select>
            </div>

            {/* Student List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {filteredStudents.map((st, idx) => (
                <div 
                  key={st.id}
                  className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex items-center justify-between hover-zoom-interactive"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-900 shadow-xs' :
                      idx === 2 ? 'bg-amber-700 text-white shadow-xs' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {idx + 1}
                    </span>
                    <img 
                      src={st.avatar} 
                      alt={st.name} 
                      className="w-9 h-9 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-xs font-black text-slate-900 truncate">{st.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">#{st.stt} • {st.group || 'Tổ 1'}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono font-black text-xs rounded-lg shrink-0 ml-2">
                    🪙 {st.points} xu
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DỮ LIỆU (User request 5: Hỗ trợ .JSON và .ZIP) */}
      {/* ========================================================================= */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Backup Download (.JSON & .ZIP) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-5 hover-zoom-card">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Tải Về Sao Lưu Dữ Liệu (.JSON & .ZIP)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {currentRole === 'teacher' ? (
                    <>
                      Tài khoản giáo viên: Xuất file <strong>.JSON</strong> chứa toàn bộ dữ liệu <strong>Lớp {activeClass?.name}</strong> của bạn (danh sách học sinh, điểm xu, khen thưởng, thời khóa biểu).
                    </>
                  ) : (
                    <>
                      Tài khoản Quản trị (Admin): Xuất file <strong>.JSON</strong> chứa toàn bộ cơ sở dữ liệu <strong>TOÀN TRƯỜNG</strong> chi tiết đầy đủ tất cả các khối và các lớp.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Option 1: .JSON */}
                <button
                  onClick={exportBackupJson}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all hover-zoom-btn flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {currentRole === 'teacher'
                      ? `Tải File .JSON Lớp ${activeClass?.name || '4A1'}`
                      : 'Tải File .JSON Toàn Trường (Chi Tiết Đầy Đủ)'}
                  </span>
                </button>

                {/* Option 2: .ZIP */}
                <button
                  onClick={exportBackupZip}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all hover-zoom-btn flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileArchive className="w-4 h-4 text-indigo-600" />
                  <span>Tải về FILE nén .ZIP</span>
                </button>
              </div>
            </div>

            {/* Card 2: Restore Upload (.JSON & .ZIP) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-5 hover-zoom-card">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Nạp Vào Khôi Phục Dữ Liệu (.JSON & .ZIP)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hỗ trợ tải lên file dạng <strong className="text-emerald-700">.JSON</strong> hoặc FILE nén <strong className="text-emerald-700">.ZIP</strong> để khôi phục nguyên vẹn dữ liệu hệ thống.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.zip"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImportLoading}
                  className="w-full py-3.5 px-4 rounded-2xl text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 transition-all hover-zoom-btn flex flex-col items-center justify-center gap-1.5"
                >
                  <Upload className="w-5 h-5 text-emerald-600 animate-bounce" />
                  <span>{isImportLoading ? 'Đang giải nén & nạp dữ liệu...' : 'Chọn file .JSON hoặc .ZIP từ máy tính'}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">Bấm để duyệt file hoặc kéo thả</span>
                </button>
              </div>
            </div>

            {/* Card 3: System Reset & Cleanup */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-5 hover-zoom-card">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Làm Mới Năm Học / Xóa Dữ Liệu
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Xóa sạch thông tin các lớp học, danh sách học sinh, thời khóa biểu và điểm số khi bắt đầu năm học mới; hoặc khôi phục dữ liệu ban đầu có 1 lớp 4A1 với 30 học sinh.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setIsClearDataModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-2xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all hover-zoom-btn"
                >
                  Xóa sạch danh sách & điểm số
                </button>

                <button
                  onClick={() => setIsResetDefaultModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all hover-zoom-btn flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục dữ liệu mẫu ban đầu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÀI ĐẶT HỒ SƠ GIÁO VIÊN (User request 4) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs max-w-2xl mx-auto space-y-6 hover-zoom-card">
          {/* THÔNG TIN TÁC GIẢ ỨNG DỤNG - CỐ ĐỊNH KHÔNG THỂ SỬA (Yêu cầu 5) */}
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-sky-50 to-blue-50 border-2 border-indigo-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                  THÔNG TIN TÁC GIẢ ỨNG DỤNG (BẢN QUYỀN CỐ ĐỊNH)
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black border border-indigo-200">
                Không thể sửa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">Tác giả phần mềm:</span>
                <span className="text-sm font-black text-indigo-950">{APP_AUTHOR_INFO.name}</span>
                <div className="text-[11px] text-indigo-700 font-bold mt-0.5">{APP_AUTHOR_INFO.schoolName}</div>
              </div>

              <div className="space-y-1">
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Zalo hỗ trợ kỹ thuật:</span>
                  <a 
                    href={APP_AUTHOR_INFO.zaloUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>💬 {APP_AUTHOR_INFO.zalo}</span>
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Facebook kết nối:</span>
                  <a 
                    href={APP_AUTHOR_INFO.facebook} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-bold text-blue-700 hover:underline truncate block max-w-[240px]"
                  >
                    facebook.com/nguyenthanhliemautotech
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Cài Đặt Thông Tin & Hồ Sơ Giáo Viên</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông tin sẽ hiển thị trang trọng trên Trang chủ, Thanh điều hướng và chân menu ứng dụng.
            </p>
          </div>

          {profileSavedToast && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-2xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">Đã lưu thành công thông tin hồ sơ giáo viên!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="relative shrink-0">
                <img
                  src={profileAvatar}
                  alt="Teacher Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white bg-white shadow-md hover-zoom-interactive"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setIsTeacherAvatarEditorOpen(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-md hover-zoom-btn"
                  title="Thu phóng và căn chỉnh ảnh giáo viên"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2 flex-1">
                <div>
                  <div className="font-black text-slate-900">Ảnh đại diện giáo viên</div>
                  <div className="text-[11px] text-slate-500">Tải ảnh chân dung từ máy tính và căn chỉnh góc nhìn, thu phóng trực tiếp.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTeacherAvatarEditorOpen(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover-zoom-btn"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Thu Phóng & Căn Chỉnh Ảnh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => profileAvatarInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Chọn ảnh từ máy...</span>
                  </button>
                  <input
                    type="file"
                    ref={profileAvatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </div>
              </div>
            </div>

            {/* Field 1 & 1.1: Họ và tên & Ngày tháng năm sinh của giáo viên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Họ và tên giáo viên:</span>
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Ví dụ: Cô Nguyễn Thị Hoa"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ngày tháng năm sinh:</span>
                </label>
                <input
                  type="text"
                  value={profileBirthDate}
                  onChange={(e) => setProfileBirthDate(e.target.value)}
                  placeholder="Ví dụ: 15/08/1988"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-indigo-700"
                />
              </div>
            </div>

            {/* Field 2 & 3: Đơn vị công tác & Chức vụ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đơn vị công tác / Trường:</span>
                </label>
                <input
                  type="text"
                  value={profileSchool}
                  onChange={(e) => setProfileSchool(e.target.value)}
                  placeholder="Ví dụ: Trường Tiểu học số 1 Tân Uyên"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chức vụ / Nhiệm vụ:</span>
                </label>
                <input
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  placeholder="Ví dụ: Giáo viên chủ nhiệm & Tin học"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  required
                />
              </div>
            </div>

            {/* Field 4: Năm học (User request 4) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Năm học hiện tại:</span>
              </label>
              <input
                type="text"
                value={profileAcademicYear}
                onChange={(e) => setProfileAcademicYear(e.target.value)}
                placeholder="Ví dụ: 2026 - 2027"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                required
              />
            </div>

            {/* Field 5 & 6: SĐT & Zalo giáo viên (User request 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Số điện thoại giáo viên:</span>
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="Ví dụ: 0977058363"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Zalo giáo viên:</span>
                </label>
                <input
                  type="text"
                  value={profileZalo}
                  onChange={(e) => setProfileZalo(e.target.value)}
                  placeholder="Ví dụ: 0977058363"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Field 7: Địa chỉ liên kết Facebook (User request: Mục cài đặt bổ sung thêm 1 dòng địa chỉ liên kết mạng xã hội Facebook) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">f</span>
                <span>Địa chỉ liên kết mạng xã hội Facebook:</span>
              </label>
              <input
                type="text"
                value={profileFacebook}
                onChange={(e) => setProfileFacebook(e.target.value)}
                placeholder="Ví dụ: https://www.facebook.com/tieuhocso1tanuyen/"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-blue-700"
              />
            </div>

            {/* Field 8: Địa chỉ liên kết Mạng xã hội khác */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Địa chỉ liên kết Mạng xã hội khác (Zalo / Website / Trang cá nhân):</span>
              </label>
              <input
                type="text"
                value={profileSocialLink}
                onChange={(e) => setProfileSocialLink(e.target.value)}
                placeholder="Ví dụ: https://zalo.me/0977058363"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md shadow-indigo-600/20 transition-all hover-zoom-btn flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Cài Đặt Hồ Sơ Giáo Viên</span>
              </button>
            </div>
          </form>

          {/* ========================================================================= */}
          {/* BAN ĐẠI DIỆN CHA MẸ HỌC SINH (BAN PHỤ HUYNH) & SLOGAN LỚP HỌC (User Request) */}
          {/* ========================================================================= */}
          {activeClass && (
            <div className="pt-6 border-t-2 border-dashed border-indigo-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Heart className="w-4 h-4 fill-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Ban Đại Diện Cha Mẹ Học Sinh & Slogan Lớp {activeClass.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bổ sung Trưởng ban, Phó ban, 2 Ủy viên và Slogan lớp hiển thị trên Infographic
                    </p>
                  </div>
                </div>

                {parentSavedToast && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã lưu!</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveParentCommittee} className="space-y-4">
                {/* Slogan của lớp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Khẩu hiệu / SLOGAN của lớp học:</span>
                  </label>
                  <input
                    type="text"
                    value={classSlogan}
                    onChange={(e) => setClassSlogan(e.target.value)}
                    placeholder="Ví dụ: Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-amber-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* 4 Thành viên Ban Phụ Huynh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Trưởng ban */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-black text-indigo-700 uppercase block">
                      1. Trưởng ban phụ huynh:
                    </span>
                    <input
                      type="text"
                      value={parentHeadName}
                      onChange={(e) => setParentHeadName(e.target.value)}
                      placeholder="Họ và tên Trưởng ban..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={parentHeadPhone}
                      onChange={(e) => setParentHeadPhone(e.target.value)}
                      placeholder="Số điện thoại liên lạc..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                    />
                  </div>

                  {/* Phó ban */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-black text-indigo-700 uppercase block">
                      2. Phó ban phụ huynh:
                    </span>
                    <input
                      type="text"
                      value={parentDeputyName}
                      onChange={(e) => setParentDeputyName(e.target.value)}
                      placeholder="Họ và tên Phó ban..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={parentDeputyPhone}
                      onChange={(e) => setParentDeputyPhone(e.target.value)}
                      placeholder="Số điện thoại liên lạc..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                    />
                  </div>

                  {/* Ủy viên 1 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-black text-slate-700 uppercase block">
                      3. Ủy viên ban phụ huynh 1:
                    </span>
                    <input
                      type="text"
                      value={parentMember1Name}
                      onChange={(e) => setParentMember1Name(e.target.value)}
                      placeholder="Họ và tên Ủy viên 1..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                    <input
                      type="text"
                      value={parentMember1Phone}
                      onChange={(e) => setParentMember1Phone(e.target.value)}
                      placeholder="Số điện thoại..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                    />
                  </div>

                  {/* Ủy viên 2 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-black text-slate-700 uppercase block">
                      4. Ủy viên ban phụ huynh 2:
                    </span>
                    <input
                      type="text"
                      value={parentMember2Name}
                      onChange={(e) => setParentMember2Name(e.target.value)}
                      placeholder="Họ và tên Ủy viên 2..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                    <input
                      type="text"
                      value={parentMember2Phone}
                      onChange={(e) => setParentMember2Phone(e.target.value)}
                      placeholder="Số điện thoại..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-md shadow-emerald-600/20 transition-all hover-zoom-btn flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Thông Tin Ban Phụ Huynh Lớp {activeClass.name}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: XÁC NHẬN KHÔI PHỤC DỮ LIỆU MẪU BAN ĐẦU (LỚP 4A1, CÔ NGUYỄN THỊ HOA, 30 HỌC SINH) */}
      {isResetDefaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-br from-indigo-50 via-sky-50 to-blue-50 border-b border-indigo-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Khôi Phục Dữ Liệu Mẫu Ban Đầu
                  </h3>
                  <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                    1 Lớp 4A1 • Cô giáo Nguyễn Thị Hoa • 30 Học sinh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetDefaultModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Dữ liệu sẽ được thiết lập gồm có:</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Lớp học mặc định: <strong className="text-slate-900 font-bold">Lớp 4A1</strong> (Khối 4, Năm học 2026 – 2027)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Giáo viên chủ nhiệm: <strong className="text-slate-900 font-bold">Cô giáo Nguyễn Thị Hoa</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Danh sách học sinh: <strong className="text-slate-900 font-bold">30 học sinh</strong> (15 Nam, 15 Nữ, đủ 4 Tổ, điểm xu mẫu)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Thời khóa biểu: <strong className="text-slate-900 font-bold">Lịch học chuẩn lớp 4A1</strong> từ Thứ Hai đến Thứ Sáu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Danh mục phần thưởng & tiêu chí thi đua mẫu phong phú</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetDefaultModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetToDefaultData();
                    playFanfareSound();
                    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
                    setImportStatus('🎉 Khôi phục thành công: Lớp 4A1 với 30 học sinh và Cô giáo Nguyễn Thị Hoa!');
                    setIsResetDefaultModalOpen(false);
                    setTimeout(() => setImportStatus(null), 5000);
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all hover-zoom-btn flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Xác Nhận Khôi Phục Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: XÁC NHẬN XÓA SẠCH DỮ LIỆU ĐỂ LÀM MỚI */}
      {isClearDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 border-b border-rose-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Xóa Sạch Danh Sách & Điểm Số?
                  </h3>
                  <p className="text-xs text-rose-700 font-semibold mt-0.5">
                    Chuẩn bị bắt đầu năm học mới
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsClearDataModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Toàn bộ danh sách lớp học, học sinh, thời khóa biểu và điểm số tích lũy sẽ được xóa sạch.
                <br /><br />
                <span className="text-slate-500 font-medium">
                  💡 Gợi ý: Bạn luôn có thể bấm nút <strong>"Khôi phục dữ liệu mẫu ban đầu"</strong> bất cứ lúc nào để tải lại Lớp 4A1 (30 học sinh).
                </span>
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClearDataModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllData();
                    confetti({ particleCount: 30, spread: 50 });
                    setImportStatus('Đã xóa sạch danh sách lớp học và điểm số thành công.');
                    setIsClearDataModalOpen(false);
                    setTimeout(() => setImportStatus(null), 4000);
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 transition-all hover-zoom-btn flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa Toàn Bộ Dữ Liệu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Avatar Zoom & Crop Modal */}
      <TeacherAvatarEditorModal
        isOpen={isTeacherAvatarEditorOpen}
        teacherName={profileName}
        currentAvatar={profileAvatar}
        currentScale={teacherProfile.avatarScale || 1}
        currentPosition={teacherProfile.avatarPosition || { x: 0, y: 0 }}
        onClose={() => setIsTeacherAvatarEditorOpen(false)}
        onSave={(url, scale, pos) => {
          setProfileAvatar(url);
          updateTeacherProfile({
            avatar: url,
            avatarScale: scale,
            avatarPosition: pos
          });
        }}
      />
    </div>
  );
};
