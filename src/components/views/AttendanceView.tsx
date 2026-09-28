import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useClassroom } from '../../context/ClassroomContext';
import { AttendanceStatus, BoardingStatus } from '../../types';
import { 
  CheckSquare, Calendar, Check, Clock, 
  Download, Save, Sparkles, AlertCircle, HeartPulse, 
  HelpCircle, UserCheck, Filter, Search, RotateCcw,
  Utensils, Copy, FileSpreadsheet, TrendingUp, BarChart3,
  ChevronLeft, ChevronRight, MessageSquare, AlertTriangle, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; activeClass: string; inactiveClass: string; dotColor: string }> = {
  present: {
    label: 'Có mặt & Đúng giờ',
    short: 'Có mặt',
    activeClass: 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-600/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
    dotColor: '#10B981'
  },
  late: {
    label: 'Đi học muộn',
    short: 'Đi muộn',
    activeClass: 'bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-500/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700',
    dotColor: '#F59E0B'
  },
  sick: {
    label: 'Nghỉ ốm',
    short: 'Nghỉ ốm',
    activeClass: 'bg-purple-600 text-white font-black shadow-xs ring-2 ring-purple-600/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700',
    dotColor: '#9333EA'
  },
  excused: {
    label: 'Vắng có phép',
    short: 'Có phép',
    activeClass: 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-600/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700',
    dotColor: '#2563EB'
  },
  unexcused: {
    label: 'Vắng không phép',
    short: 'Không phép',
    activeClass: 'bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-600/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700',
    dotColor: '#E11D48'
  },
  other: {
    label: 'Lý do khác',
    short: 'Khác',
    activeClass: 'bg-slate-700 text-white font-black shadow-xs ring-2 ring-slate-700/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800',
    dotColor: '#475569'
  }
};

const BOARDING_CONFIG: Record<'eating' | 'not_eating', { label: string; activeClass: string; inactiveClass: string; icon: string }> = {
  eating: {
    label: 'Ăn bán trú',
    activeClass: 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-600/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
    icon: '🍱'
  },
  not_eating: {
    label: 'Không ăn / Về nhà',
    activeClass: 'bg-slate-700 text-white font-black shadow-xs ring-2 ring-slate-700/30',
    inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    icon: '🏠'
  }
};

export const AttendanceView: React.FC = () => {
  const { 
    currentClassStudents, attendanceRecords, setStudentAttendance, 
    batchSetAttendance, activeClassId, classes, teacherProfile,
    boardingRecords, setStudentBoarding, batchSetBoarding 
  } = useClassroom();
  
  const activeClass = classes.find(c => c.id === activeClassId);

  // Sub-tabs: 'daily' (Điểm danh chuyên cần) vs 'boarding' (Điểm danh ăn bán trú)
  const [activeTab, setActiveTab] = useState<'daily' | 'boarding'>('daily');

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [boardingFilterType, setBoardingFilterType] = useState<'all' | 'eating' | 'not_eating'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedReportToast, setCopiedReportToast] = useState(false);
  // Multi-select for boarding meal (User Request)
  const [selectedBoardingStudentIds, setSelectedBoardingStudentIds] = useState<string[]>([]);

  // Current day's attendance record
  const currentRecord = attendanceRecords.find(r => r.date === selectedDate && r.classId === activeClassId);
  const currentStatusMap = currentRecord?.records || {};

  // Current day's boarding meal record
  const currentBoardingRecord = boardingRecords.find(r => r.date === selectedDate && r.classId === activeClassId);
  const currentBoardingMap = currentBoardingRecord?.records || {};

  // Helper check if student is absent on selected date
  const isStudentAbsent = (studentId: string) => {
    const status = currentStatusMap[studentId];
    return status === 'sick' || status === 'excused' || status === 'unexcused' || status === 'other';
  };

  const getStudentAbsentReason = (studentId: string) => {
    const status = currentStatusMap[studentId];
    if (status === 'sick') return 'Nghỉ ốm';
    if (status === 'excused') return 'Vắng có phép';
    if (status === 'unexcused') return 'Vắng không phép';
    if (status === 'other') return 'Vắng lý do khác';
    return null;
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(studentId, status, selectedDate);
  };

  const handleBoardingChange = (studentId: string, status: BoardingStatus) => {
    // If student is absent, prevent marking 'eating'
    if (status === 'eating' && isStudentAbsent(studentId)) {
      const reason = getStudentAbsentReason(studentId) || 'Vắng mặt';
      setSaveToast(`⚠️ Học sinh này đã được tích chọn chuyên cần là "${reason}". Không thể điểm danh ăn bán trú!`);
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }
    setStudentBoarding(studentId, status, selectedDate);
  };

  // 1. Điểm danh đồng loạt cả lớp
  const handleSelectAllPresent = () => {
    batchSetAttendance('present', selectedDate);
    confetti({ particleCount: 40, spread: 50 });
  };

  // 2. Điểm danh thông minh (tự động điền Có mặt)
  const handleSmartCompleteAttendance = () => {
    currentClassStudents.forEach(student => {
      const currentStatus = currentStatusMap[student.id];
      if (!currentStatus || (currentStatus !== 'sick' && currentStatus !== 'excused' && currentStatus !== 'unexcused' && currentStatus !== 'other' && currentStatus !== 'late')) {
        setStudentAttendance(student.id, 'present', selectedDate);
      }
    });

    confetti({ particleCount: 50, spread: 60 });
    setSaveToast(`Đã tự động ghi nhận Có mặt & Đúng giờ cho tất cả học sinh còn lại ngày ${selectedDate}!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // 3. Điểm danh đồng loạt ăn bán trú (chỉ áp dụng cho học sinh có mặt / đi muộn, không áp dụng cho học sinh nghỉ ốm, có phép, không phép, khác)
  const handleSelectAllBoarding = () => {
    let eatingCount = 0;
    currentClassStudents.forEach(st => {
      if (!isStudentAbsent(st.id)) {
        setStudentBoarding(st.id, 'eating', selectedDate);
        eatingCount++;
      } else {
        setStudentBoarding(st.id, 'not_eating', selectedDate);
      }
    });
    confetti({ particleCount: 40, spread: 50 });
    const absentCount = currentClassStudents.length - eatingCount;
    setSaveToast(
      absentCount > 0
        ? `Đã ghi nhận ${eatingCount} học sinh có mặt ăn bán trú ngày ${selectedDate} (${absentCount} học sinh vắng được giữ không ăn)!`
        : `Đã ghi nhận toàn bộ ${eatingCount} học sinh ăn bán trú ngày ${selectedDate}!`
    );
    setTimeout(() => setSaveToast(null), 3500);
  };

  // 3.1 Điểm danh nhanh cả lớp không ăn (User Request mới)
  const handleSelectAllNotEating = () => {
    batchSetBoarding('not_eating', selectedDate);
    confetti({ particleCount: 30, spread: 45 });
    setSaveToast(`Đã ghi nhận toàn bộ ${currentClassStudents.length} học sinh KHÔNG ĂN / VỀ NHÀ ngày ${selectedDate}!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // 3.2 Tích chọn nhiều học sinh ăn bán trú & cập nhật nhanh chóng (User Request mới)
  const toggleSelectBoardingStudent = (id: string) => {
    setSelectedBoardingStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllBoardingFiltered = () => {
    if (selectedBoardingStudentIds.length === filteredBoardingStudents.length) {
      setSelectedBoardingStudentIds([]);
    } else {
      setSelectedBoardingStudentIds(filteredBoardingStudents.map(s => s.id));
    }
  };

  const handleBatchSetSelectedBoarding = (status: 'eating' | 'not_eating') => {
    if (selectedBoardingStudentIds.length === 0) return;

    if (status === 'eating') {
      let applied = 0;
      let blocked = 0;
      selectedBoardingStudentIds.forEach(id => {
        if (!isStudentAbsent(id)) {
          setStudentBoarding(id, 'eating', selectedDate);
          applied++;
        } else {
          blocked++;
        }
      });
      const label = BOARDING_CONFIG['eating'].label;
      if (blocked > 0) {
        setSaveToast(`Đã cập nhật "${label}" cho ${applied} em (${blocked} em vắng chuyên cần không được ăn bán trú)!`);
      } else {
        setSaveToast(`Đã cập nhật trạng thái "${label}" cho ${applied} học sinh được chọn!`);
      }
    } else {
      selectedBoardingStudentIds.forEach(id => {
        setStudentBoarding(id, 'not_eating', selectedDate);
      });
      setSaveToast(`Đã cập nhật trạng thái "Không ăn / Về nhà" cho ${selectedBoardingStudentIds.length} học sinh được chọn!`);
    }

    setSelectedBoardingStudentIds([]);
    confetti({ particleCount: 40, spread: 60 });
    setTimeout(() => setSaveToast(null), 3000);
  };

  // 4. THỐNG KÊ CHUYÊN CẦN TUẦN NÀY, TUẦN TRƯỚC, CẢ THÁNG (User Request 3)
  const statsOverview = useMemo(() => {
    const totalStudents = currentClassStudents.length;

    // Helper: calculate week and month bounds accurately without mutating dates
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

    const thisWeekMonday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
    const thisWeekSunday = new Date(thisWeekMonday.getFullYear(), thisWeekMonday.getMonth(), thisWeekMonday.getDate() + 6);

    const lastWeekMonday = new Date(thisWeekMonday.getFullYear(), thisWeekMonday.getMonth(), thisWeekMonday.getDate() - 7);
    const lastWeekSunday = new Date(lastWeekMonday.getFullYear(), lastWeekMonday.getMonth(), lastWeekMonday.getDate() + 6);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const calcPeriod = (startDateStr: string, endDateStr: string) => {
      const records = attendanceRecords.filter(r => 
        r.classId === activeClassId && r.date >= startDateStr && r.date <= endDateStr
      );

      let totalSessions = records.length;
      let presentCount = 0;
      let lateCount = 0;
      let sickCount = 0;
      let excusedCount = 0;
      let unexcusedCount = 0;

      records.forEach(r => {
        Object.values(r.records).forEach(status => {
          if (status === 'present') presentCount++;
          else if (status === 'late') lateCount++;
          else if (status === 'sick') sickCount++;
          else if (status === 'excused') excusedCount++;
          else if (status === 'unexcused') unexcusedCount++;
        });
      });

      const totalStudentSlots = totalSessions * totalStudents;
      const rate = totalStudentSlots > 0 ? Math.round((presentCount / totalStudentSlots) * 100) : 100;

      return {
        sessions: totalSessions,
        rate,
        present: presentCount,
        late: lateCount,
        sick: sickCount,
        excused: excusedCount,
        unexcused: unexcusedCount
      };
    };

    const thisWeekStats = calcPeriod(fmt(thisWeekMonday), fmt(thisWeekSunday));
    const lastWeekStats = calcPeriod(fmt(lastWeekMonday), fmt(lastWeekSunday));
    const thisMonthStats = calcPeriod(fmt(startOfMonth), fmt(endOfMonth));

    return {
      thisWeek: thisWeekStats,
      lastWeek: lastWeekStats,
      thisMonth: thisMonthStats
    };
  }, [attendanceRecords, activeClassId, currentClassStudents.length]);

  // 5. XUẤT BẢNG TỔNG HỢP CHUYÊN CẦN (User Request 3)
  const handleExportSummaryReport = () => {
    const totalRecords = attendanceRecords.filter(r => r.classId === activeClassId);

    const summaryRows = currentClassStudents.map((st, idx) => {
      let presentDays = 0;
      let lateDays = 0;
      let sickDays = 0;
      let excusedDays = 0;
      let unexcusedDays = 0;

      totalRecords.forEach(rec => {
        const s = rec.records[st.id] || 'present';
        if (s === 'present') presentDays++;
        else if (s === 'late') lateDays++;
        else if (s === 'sick') sickDays++;
        else if (s === 'excused') excusedDays++;
        else if (s === 'unexcused') unexcusedDays++;
      });

      const totalLogged = totalRecords.length;
      const rate = totalLogged > 0 ? Math.round((presentDays / totalLogged) * 100) : 100;

      return {
        'STT': idx + 1,
        'Họ và tên': st.name,
        'Giới tính': st.gender,
        'Tổ': st.group || 'Tổ 1',
        'Tổng số buổi đã điểm danh': totalLogged,
        'Số buổi có mặt đúng giờ': presentDays,
        'Số buổi đi muộn': lateDays,
        'Số buổi nghỉ ốm': sickDays,
        'Vắng có phép': excusedDays,
        'Vắng không phép': unexcusedDays,
        'Tỷ lệ chuyên cần (%)': `${rate}%`,
        'Xếp loại chuyên cần': rate >= 95 ? 'Tốt' : rate >= 85 ? 'Khá' : 'Cần chấn chỉnh'
      };
    });

    const ws = XLSX.utils.json_to_sheet(summaryRows);
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 24 }, // Họ tên
      { wch: 10 }, // Giới tính
      { wch: 10 }, // Tổ
      { wch: 15 }, // Tổng buổi
      { wch: 15 }, // Có mặt
      { wch: 12 }, // Muộn
      { wch: 12 }, // Nghỉ ốm
      { wch: 14 }, // Có phép
      { wch: 14 }, // Không phép
      { wch: 14 }, // Tỷ lệ
      { wch: 16 }  // Xếp loại
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tong_Hop_Chuyen_Can");
    XLSX.writeFile(wb, `Bang_Tong_Hop_Chuyen_Can_${activeClass?.name || 'Lop'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 6. XUẤT BẢNG BÁO ĂN BÁN TRÚ (User Request: 2 lựa chọn Ăn bán trú & Không ăn/Về nhà)
  const handleExportBoardingReport = () => {
    const boardingRows = currentClassStudents.map((st, idx) => {
      const isAbsent = isStudentAbsent(st.id);
      const absentReason = getStudentAbsentReason(st.id);
      const status = isAbsent ? 'not_eating' : (currentBoardingMap[st.id] || 'eating');
      const statusLabel = status === 'eating' ? 'Ăn bán trú' : 'Không ăn / Về nhà';

      return {
        'STT': idx + 1,
        'Họ và tên': st.name,
        'Giới tính': st.gender,
        'Tổ': st.group || 'Tổ 1',
        'Ngày báo ăn': selectedDate,
        'Trạng thái ăn bán trú': statusLabel,
        'Ghi chú chuyên cần': isAbsent ? `Vắng mặt (${absentReason})` : 'Có mặt tại lớp'
      };
    });

    const ws = XLSX.utils.json_to_sheet(boardingRows);
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 24 }, // Họ tên
      { wch: 10 }, // Giới tính
      { wch: 10 }, // Tổ
      { wch: 15 }, // Ngày
      { wch: 22 }, // Trạng thái
      { wch: 26 }  // Ghi chú
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao_An_Ban_Tru");
    XLSX.writeFile(wb, `Danh_Sach_Bao_An_Ban_Tru_${activeClass?.name || 'Lop'}_${selectedDate}.xlsx`);
  };

  // Copy kitchen message
  const handleCopyKitchenReport = () => {
    const eatingStudents = currentClassStudents.filter(s => !isStudentAbsent(s.id) && (currentBoardingMap[s.id] || 'eating') === 'eating');
    const absentStudents = currentClassStudents.filter(s => isStudentAbsent(s.id));
    const notEatingStudents = currentClassStudents.filter(s => !isStudentAbsent(s.id) && currentBoardingMap[s.id] === 'not_eating');

    const msg = `🍱 BÁO CÁO SUẤT ĂN BÁN TRÚ 🍱\n` +
      `📅 Ngày: ${selectedDate}\n` +
      `🏫 Trường: ${teacherProfile.schoolName || 'Trường Tiểu học số 1 Tân Uyên'}\n` +
      `👥 Lớp: ${activeClass?.name || 'Lớp học'} (GVCN: ${teacherProfile.name})\n` +
      `--------------------------------\n` +
      `🍽️ TỔNG SỐ SUẤT ĂN ĐĂNG KÝ: ${eatingStudents.length} suất\n` +
      `🏠 Không ăn / Về nhà: ${notEatingStudents.length + absentStudents.length} em\n` +
      (absentStudents.length > 0 
        ? `   ↳ Trong đó có ${absentStudents.length} em vắng chuyên cần (${absentStudents.map(s => `${s.name} - ${getStudentAbsentReason(s.id)}`).join(', ')})\n` 
        : '') +
      `--------------------------------\n` +
      `Xin cảm ơn bộ phận cấp dưỡng & nhà bếp!`;

    navigator.clipboard.writeText(msg);
    setCopiedReportToast(true);
    setTimeout(() => setCopiedReportToast(false), 3000);
  };

  // Counts for Daily Attendance
  const totalStudents = currentClassStudents.length;
  const presentCount = currentClassStudents.filter(s => (currentStatusMap[s.id] || 'present') === 'present').length;
  const lateCount = currentClassStudents.filter(s => currentStatusMap[s.id] === 'late').length;
  const sickCount = currentClassStudents.filter(s => currentStatusMap[s.id] === 'sick').length;
  const excusedCount = currentClassStudents.filter(s => currentStatusMap[s.id] === 'excused').length;
  const unexcusedCount = currentClassStudents.filter(s => currentStatusMap[s.id] === 'unexcused').length;
  const otherCount = currentClassStudents.filter(s => currentStatusMap[s.id] === 'other').length;
  const totalAbsent = sickCount + excusedCount + unexcusedCount + otherCount;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 100;

  // Counts for Boarding Meal Attendance (2 lựa chọn: Ăn bán trú & Không ăn/Về nhà)
  // Học sinh vắng chuyên cần luôn tính vào Không ăn
  const boardingEatingCount = currentClassStudents.filter(s => !isStudentAbsent(s.id) && (currentBoardingMap[s.id] || 'eating') === 'eating').length;
  const boardingNotEatingCount = totalStudents - boardingEatingCount;
  const boardingAbsentCount = currentClassStudents.filter(s => isStudentAbsent(s.id)).length;

  // Filtered Students for Attendance
  const filteredAttendanceStudents = currentClassStudents.filter(st => {
    const nameMatch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.stt.toString().includes(searchQuery);
    if (!nameMatch) return false;

    const stStatus = currentStatusMap[st.id] || 'present';
    if (filterType === 'present') return stStatus === 'present';
    if (filterType === 'late') return stStatus === 'late';
    if (filterType === 'absent') return stStatus === 'sick' || stStatus === 'excused' || stStatus === 'unexcused' || stStatus === 'other';
    return true;
  });

  // Filtered Students for Boarding
  const filteredBoardingStudents = currentClassStudents.filter(st => {
    const nameMatch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.stt.toString().includes(searchQuery);
    if (!nameMatch) return false;

    const isAbsent = isStudentAbsent(st.id);
    const bStatus = isAbsent ? 'not_eating' : (currentBoardingMap[st.id] || 'eating');
    if (boardingFilterType !== 'all' && bStatus !== boardingFilterType) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Mode Toggle: Chuyên Cần vs Ăn Bán Trú */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover-zoom-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs shrink-0">
            {activeTab === 'daily' ? <CheckSquare className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-900 leading-tight">
              {activeTab === 'daily' 
                ? `Điểm Danh & Thống Kê Chuyên Cần Lớp ${activeClass?.name}` 
                : `Điểm Danh Ăn Bán Trú & Báo Suất Ăn Lớp ${activeClass?.name}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'daily'
                ? 'Thống kê chuyên cần tuần này, tuần trước, cả tháng & xuất file tổng hợp.'
                : 'Điểm danh đăng ký ăn bán trú hằng ngày, tự động tính số suất và báo cho nhà bếp.'}
            </p>
          </div>
        </div>

        {/* 2 Main Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTab === 'daily' 
                ? 'bg-white text-emerald-800 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Chuyên Cần Lớp</span>
          </button>

          <button
            onClick={() => setActiveTab('boarding')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTab === 'boarding' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Điểm Danh Bán Trú</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{saveToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VIEW TAB: ĐIỂM DANH & THỐNG KÊ CHUYÊN CẦN (User Request 3) */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* THỐNG KÊ CHUYÊN CẦN: TUẦN NÀY, TUẦN TRƯỚC, CẢ THÁNG (User Request 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Chuyên cần tuần này */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Chuyên Cần Tuần Này</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                  {statsOverview.thisWeek.rate}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-emerald-700 font-mono">
                  {statsOverview.thisWeek.rate}% <span className="text-xs font-bold text-slate-400">chuyên cần</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Có mặt: <strong className="text-slate-800">{statsOverview.thisWeek.present} lượt</strong> • Muộn: {statsOverview.thisWeek.late} • Nghỉ: {statsOverview.thisWeek.sick + statsOverview.thisWeek.excused + statsOverview.thisWeek.unexcused}
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${statsOverview.thisWeek.rate}%` }} />
              </div>
            </div>

            {/* 2. Chuyên cần tuần trước */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Chuyên Cần Tuần Trước</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-xs">
                  {statsOverview.lastWeek.rate}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-blue-700 font-mono">
                  {statsOverview.lastWeek.rate}% <span className="text-xs font-bold text-slate-400">chuyên cần</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Có mặt: <strong className="text-slate-800">{statsOverview.lastWeek.present} lượt</strong> • Muộn: {statsOverview.lastWeek.late} • Nghỉ: {statsOverview.lastWeek.sick + statsOverview.lastWeek.excused + statsOverview.lastWeek.unexcused}
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${statsOverview.lastWeek.rate}%` }} />
              </div>
            </div>

            {/* 3. Chuyên cần của tháng */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Chuyên Cần Của Tháng</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-black text-xs">
                  {statsOverview.thisMonth.rate}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-purple-700 font-mono">
                  {statsOverview.thisMonth.rate}% <span className="text-xs font-bold text-slate-400">toàn tháng</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Đã ghi nhận: <strong className="text-slate-800">{statsOverview.thisMonth.sessions} ngày học</strong> trong tháng này
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${statsOverview.thisMonth.rate}%` }} />
              </div>
            </div>
          </div>

          {/* Date Selector & Action Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 md:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover-zoom-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Ngày điểm danh:</span>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-black text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Export & Smart Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* NÚT XUẤT BẢNG TỔNG HỢP CHUYÊN CẦN (User Request 3) */}
              <button
                onClick={handleExportSummaryReport}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all hover-zoom-btn"
                title="Xuất bảng Excel tổng hợp chuyên cần cả lớp"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Xuất Bảng Tổng Hợp Chuyên Cần</span>
              </button>

              {/* Nút Điểm danh thông minh: Tự điền có mặt */}
              <button
                onClick={handleSmartCompleteAttendance}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover-zoom-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Tự Điền Có Mặt</span>
              </button>

              {/* Nút Tất cả có mặt */}
              <button
                onClick={handleSelectAllPresent}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all hover-zoom-btn"
              >
                <span>Cả Lớp Có Mặt</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 shadow-2xs hover-zoom-card">
              <span className="text-[10px] font-black uppercase text-emerald-700">Có mặt đúng giờ</span>
              <div className="text-2xl font-black font-mono text-emerald-800 mt-1">
                {presentCount} <span className="text-xs font-bold text-emerald-600">/ {totalStudents}</span>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 shadow-2xs hover-zoom-card">
              <span className="text-[10px] font-black uppercase text-amber-700">Đi học muộn</span>
              <div className="text-2xl font-black font-mono text-amber-800 mt-1">
                {lateCount} <span className="text-xs font-bold text-amber-600">em</span>
              </div>
            </div>

            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 shadow-2xs hover-zoom-card">
              <span className="text-[10px] font-black uppercase text-purple-700">Nghỉ ốm</span>
              <div className="text-2xl font-black font-mono text-purple-800 mt-1">
                {sickCount} <span className="text-xs font-bold text-purple-600">em</span>
              </div>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 shadow-2xs hover-zoom-card">
              <span className="text-[10px] font-black uppercase text-blue-700">Vắng có phép</span>
              <div className="text-2xl font-black font-mono text-blue-800 mt-1">
                {excusedCount} <span className="text-xs font-bold text-blue-600">em</span>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 shadow-2xs hover-zoom-card">
              <span className="text-[10px] font-black uppercase text-rose-700">Không phép</span>
              <div className="text-2xl font-black font-mono text-rose-800 mt-1">
                {unexcusedCount} <span className="text-xs font-bold text-rose-600">em</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-2xs hover-zoom-card">
              <span className="text-[10px] font-black uppercase text-slate-600">Lý do khác</span>
              <div className="text-2xl font-black font-mono text-slate-800 mt-1">
                {otherCount} <span className="text-xs font-bold text-slate-500">em</span>
              </div>
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover-zoom-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    filterType === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả ({totalStudents})
                </button>
                <button
                  onClick={() => setFilterType('present')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    filterType === 'present' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Có mặt ({presentCount})
                </button>
                <button
                  onClick={() => setFilterType('absent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    filterType === 'absent' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Vắng / Ốm ({totalAbsent})
                </button>
                <button
                  onClick={() => setFilterType('late')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    filterType === 'late' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Đi muộn ({lateCount})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {filteredAttendanceStudents.map((student) => {
                const currentStatus = currentStatusMap[student.id] || 'present';

                return (
                  <div
                    key={student.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl gap-3 transition-colors hover-zoom-interactive"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                        {student.stt}
                      </span>
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs md:text-sm font-black text-slate-900 truncate">
                          {student.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{student.gender}</span>
                          <span>• {student.group || 'Tổ 1'}</span>
                          {student.birthDate && <span>• NS: {student.birthDate}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['present', 'late', 'sick', 'excused', 'unexcused', 'other'] as AttendanceStatus[]).map((statusKey) => {
                        const cfg = STATUS_CONFIG[statusKey];
                        const isSelected = currentStatus === statusKey;

                        return (
                          <button
                            key={statusKey}
                            onClick={() => handleStatusChange(student.id, statusKey)}
                            className={`px-3 py-1.5 rounded-xl text-xs transition-all hover-zoom-btn ${
                              isSelected ? cfg.activeClass : cfg.inactiveClass
                            }`}
                          >
                            {cfg.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW TAB: ĐIỂM DANH ĂN BÁN TRÚ (User Request 3) */}
      {/* ========================================================================= */}
      {activeTab === 'boarding' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW: Số lượng học sinh ăn bán trú ngày hôm đó (2 Lựa chọn theo yêu cầu) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Tổng số suất ăn bán trú hôm nay */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl p-6 shadow-md hover-zoom-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
                  TỔNG SỐ SUẤT ĂN BÁN TRÚ HÔM NAY
                </span>
                <span className="p-2 bg-white/20 rounded-2xl">
                  <Utensils className="w-5 h-5 text-white" />
                </span>
              </div>
              <div className="my-2">
                <div className="text-4xl font-black font-mono tracking-tight">
                  {boardingEatingCount} <span className="text-base font-bold text-emerald-100">suất ăn</span>
                </div>
                <p className="text-xs text-emerald-100 mt-1">
                  Đạt {totalStudents > 0 ? Math.round((boardingEatingCount / totalStudents) * 100) : 0}% trên tổng số {totalStudents} học sinh
                </p>
              </div>
              <div className="text-[11px] text-emerald-200">
                Ngày ghi nhận: <strong>{selectedDate}</strong>
              </div>
            </div>

            {/* Card 2: Không ăn / Về nhà buổi trưa */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Không Ăn / Về Nhà Buổi Trưa
              </span>
              <div className="text-3xl font-black text-slate-800 font-mono mt-2">
                {boardingNotEatingCount} <span className="text-xs font-bold text-slate-400">em</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Gia đình đón về ăn trưa tại nhà hoặc học sinh vắng mặt
              </p>
            </div>

            {/* Card 3: Vắng chuyên cần (Không được điểm danh ăn) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Vắng Chuyên Cần Trong Ngày
                </span>
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-rose-600 font-mono mt-2">
                {boardingAbsentCount} <span className="text-xs font-bold text-slate-400">em nghỉ</span>
              </div>
              <p className="text-xs text-rose-600/90 mt-1 font-semibold">
                Nghỉ ốm / Có phép / Không phép / Khác (Khóa điểm danh ăn)
              </p>
            </div>
          </div>

          {/* Date Selector & Kitchen Report Message Box */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover-zoom-card">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Ngày ăn bán trú:</span>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-black text-slate-800 focus:outline-none"
                />
              </div>

              {/* Fast Button: Cả lớp ăn bán trú */}
              <button
                onClick={handleSelectAllBoarding}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black transition-all hover-zoom-btn flex items-center gap-1.5"
                title="Ghi nhận tất cả học sinh có mặt trong lớp ăn bán trú (tự động loại trừ học sinh vắng)"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Cả Lớp Ăn Bán Trú</span>
              </button>

              {/* Fast Button: Cả lớp không ăn / về nhà */}
              <button
                onClick={handleSelectAllNotEating}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black transition-all hover-zoom-btn flex items-center gap-1.5"
                title="Ghi nhận tất cả học sinh không ăn / về nhà buổi trưa"
              >
                <span>🏠</span>
                <span>Cả Lớp Không Ăn / Về Nhà</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Copy Report to Kitchen */}
              <button
                onClick={handleCopyKitchenReport}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover-zoom-btn"
                title="Sao chép nội dung báo suất ăn gửi Zalo cho nhà bếp"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedReportToast ? '✓ Đã Sao Chép Báo Bếp!' : '📋 Copy Báo Cáo Nhà Bếp'}</span>
              </button>

              {/* Export Boarding Report Excel */}
              <button
                onClick={handleExportBoardingReport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover-zoom-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Báo Cáo Excel</span>
              </button>
            </div>
          </div>

          {/* Student Boarding List */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover-zoom-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setBoardingFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    boardingFilterType === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả ({totalStudents})
                </button>
                <button
                  onClick={() => setBoardingFilterType('eating')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    boardingFilterType === 'eating' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Ăn bán trú ({boardingEatingCount})
                </button>
                <button
                  onClick={() => setBoardingFilterType('not_eating')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover-zoom-btn ${
                    boardingFilterType === 'not_eating' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Không ăn / Về nhà ({boardingNotEatingCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Nút Chọn Tất Cả / Bỏ Chọn */}
                {filteredBoardingStudents.length > 0 && (
                  <button
                    onClick={handleSelectAllBoardingFiltered}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 hover-zoom-btn shrink-0"
                    title="Chọn tất cả học sinh đang hiển thị để đổi trạng thái hàng loạt"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedBoardingStudentIds.length === filteredBoardingStudents.length && filteredBoardingStudents.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                  </button>
                )}

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm học sinh theo tên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* THANH THAO TÁC NHANH KHI ĐÃ TÍCH CHỌN NHIỀU HỌC SINH */}
            {selectedBoardingStudentIds.length > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {selectedBoardingStudentIds.length}
                  </span>
                  <div>
                    <span className="text-xs font-black text-indigo-950 block">
                      Đang chọn {selectedBoardingStudentIds.length} học sinh
                    </span>
                    <span className="text-[10px] text-indigo-700">
                      Chọn nhanh trạng thái ăn bán trú áp dụng đồng loạt:
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBatchSetSelectedBoarding('eating')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover-zoom-btn"
                  >
                    <span>🍱</span>
                    <span>Đánh dấu Ăn bán trú</span>
                  </button>

                  <button
                    onClick={() => handleBatchSetSelectedBoarding('not_eating')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover-zoom-btn"
                  >
                    <span>🏠</span>
                    <span>Đánh dấu Không ăn / Về nhà</span>
                  </button>

                  <button
                    onClick={() => setSelectedBoardingStudentIds([])}
                    className="px-3 py-2 text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    Hủy chọn
                  </button>
                </div>
              </div>
            )}

            {/* Rows */}
            <div className="space-y-2 pt-1">
              {filteredBoardingStudents.map((student) => {
                const isAbsent = isStudentAbsent(student.id);
                const absentReason = getStudentAbsentReason(student.id);
                const currentStatus = isAbsent ? 'not_eating' : (currentBoardingMap[student.id] || 'eating');
                const isChecked = selectedBoardingStudentIds.includes(student.id);

                return (
                  <div
                    key={student.id}
                    className={`flex flex-col lg:flex-row lg:items-center justify-between p-3.5 rounded-2xl gap-3 transition-all hover-zoom-interactive border ${
                      isAbsent
                        ? 'bg-rose-50/40 border-rose-200 opacity-90'
                        : isChecked 
                        ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' 
                        : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox tích chọn nhiều học sinh */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectBoardingStudent(student.id)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                        title="Tích chọn để đổi trạng thái hàng loạt"
                      />

                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                        {student.stt}
                      </span>
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs md:text-sm font-black text-slate-900 truncate flex items-center gap-2">
                          <span>{student.name}</span>
                          {isAbsent && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-extrabold text-[10px] border border-rose-200">
                              Chuyên cần: {absentReason}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{student.gender}</span>
                          <span>• {student.group || 'Tổ 1'}</span>
                          {student.birthDate && <span>• NS: {student.birthDate}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-7 lg:pl-0">
                      {/* Khi học sinh vắng mặt: Hiển thị thông báo khóa điểm danh ăn bán trú */}
                      {isAbsent ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Học sinh {(absentReason || 'vắng mặt').toLowerCase()} - Tự động không ăn / về nhà</span>
                        </div>
                      ) : (
                        // Khi học sinh có mặt / đi muộn: Có 2 lựa chọn Ăn bán trú & Không ăn/Về nhà
                        ((['eating', 'not_eating'] as const)).map((statusKey) => {
                          const cfg = BOARDING_CONFIG[statusKey];
                          const isSelected = currentStatus === statusKey;

                          return (
                            <button
                              key={statusKey}
                              onClick={() => handleBoardingChange(student.id, statusKey)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all hover-zoom-btn ${
                                isSelected ? cfg.activeClass : cfg.inactiveClass
                              }`}
                            >
                              <span>{cfg.icon}</span>
                              <span>{cfg.label}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
