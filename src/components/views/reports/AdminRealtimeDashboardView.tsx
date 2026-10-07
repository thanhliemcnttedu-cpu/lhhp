import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useClassroom } from '../../../context/ClassroomContext';
import { databaseService } from '../../../services/databaseService';
import { 
  School, Building2, MapPin, Users, CheckSquare, Utensils, Coins, 
  TrendingUp, RefreshCw, Calendar, Award, Sparkles, Filter, 
  Download, ChevronRight, Wifi, Bell, Volume2, VolumeX, ArrowUpRight,
  ShieldCheck, AlertCircle, PieChart, BarChart3, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { playPointClink } from '../../../utils/audio';

export const AdminRealtimeDashboardView: React.FC = () => {
  const { 
    classes, students, attendanceRecords, boardingRecords, transactions,
    currentUser, isAdmin, isBgh, isSchoolAdmin, syncDatabaseNow, lastDbSyncTime,
    dbSyncStatus
  } = useClassroom();

  // 1. Bộ lọc phân cấp 3 tầng (Multi-level Filter)
  // Cấp 1: 'all' (Toàn trường) | Tên Phân hiệu cụ thể
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  // Cấp 2: 'all' (Tất cả điểm trường) | Tên Điểm trường cụ thể
  const [selectedCampus, setSelectedCampus] = useState<string>('all');

  // Ngày thanh tra / giám sát (Mặc định hôm nay YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Trạng thái Realtime Engine
  const [lastEventTime, setLastEventTime] = useState<string>('');
  const [isPulseActive, setIsPulseActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  // =========================================================================
  // 🌟 BƯỚC 1: THUẬT TOÁN LỌC DỮ LIỆU CỐT LÕI (CORE AGGREGATION FILTER)
  // Chỉ tổng hợp từ các lớp Giáo Viên Chủ Nhiệm (GVCN).
  // TUYỆT ĐỐI LOẠI TRỪ các lớp Giáo Viên Bộ Môn (GVBM) để chống trùng lặp học sinh toàn trường!
  // =========================================================================
  const homeroomClasses = useMemo(() => {
    return classes.filter(cls => {
      if (!cls) return false;
      // 1. Kiểm tra cờ tường minh isHomeroom
      if (cls.isHomeroom === true) return true;
      if (cls.isHomeroom === false) return false;

      // 2. Kiểm tra teacherRole: 'homeroom' | 'GVCN' vs 'subject' | 'GVBM'
      const role = String(cls.teacherRole || '').trim().toLowerCase();
      if (role === 'homeroom' || role === 'gvcn') return true;
      if (role === 'subject' || role === 'gvbm') return false;

      // 3. Kiểm tra tên lớp học (loại trừ các lớp ghép/bộ môn Tin học, Ngoại ngữ, v.v.)
      const lowerName = (cls.name || '').toLowerCase();
      if (
        lowerName.includes('tin học') || 
        lowerName.includes('bộ môn') || 
        lowerName.includes('tiếng anh') || 
        lowerName.includes('mỹ thuật') || 
        lowerName.includes('âm nhạc') ||
        lowerName.includes('thể dục')
      ) {
        return false;
      }

      // 4. Mặc định các lớp chính khóa văn hóa tiêu chuẩn (1A1, 2B, 3C, 4A1...) là lớp chủ nhiệm
      return true;
    });
  }, [classes]);

  const excludedSubjectClassesCount = classes.length - homeroomClasses.length;

  // 2. Tự động trích xuất danh sách Phân hiệu & Điểm trường CHỈ TỪ CÁC LỚP GVCN
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    homeroomClasses.forEach(c => {
      if (c.branch && c.branch.trim()) {
        set.add(c.branch.trim());
      }
    });
    return Array.from(set).sort();
  }, [homeroomClasses]);

  // Danh sách Điểm trường chỉ thuộc Phân hiệu đã chọn (Nếu chọn 'all' thì lấy tất cả điểm trường GVCN)
  const availableCampuses = useMemo(() => {
    const set = new Set<string>();
    homeroomClasses.forEach(c => {
      const b = (c.branch || '').trim();
      if (selectedBranch === 'all' || b === selectedBranch) {
        if (c.campus && c.campus.trim()) {
          set.add(c.campus.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [homeroomClasses, selectedBranch]);

  // Tự động reset Điểm trường về 'all' khi đổi Phân hiệu nếu điểm trường đó không thuộc phân hiệu mới
  useEffect(() => {
    if (selectedCampus !== 'all' && !availableCampuses.includes(selectedCampus)) {
      setSelectedCampus('all');
    }
  }, [selectedBranch, availableCampuses, selectedCampus]);

  // =========================================================================
  // 3. THUẬT TOÁN AUTO-AGGREGATION CHẶT CHẼ THEO ĐẶC TẢ:
  // let filtered = allClassrooms.filter(isHomeroom);
  // if (selectedBranch !== 'all') filtered = filtered.filter(checkBranch);
  // if (selectedCampus !== 'all') filtered = filtered.filter(checkCampus);
  // return calculateStats(filtered);
  // =========================================================================
  const filteredClasses = useMemo(() => {
    let list = homeroomClasses; // Đã cô lập hoàn toàn GVBM từ Bước 1
    if (selectedBranch !== 'all') {
      list = list.filter(c => (c.branch || '').trim() === selectedBranch);
    }
    if (selectedCampus !== 'all') {
      list = list.filter(c => (c.campus || '').trim() === selectedCampus);
    }
    return list;
  }, [homeroomClasses, selectedBranch, selectedCampus]);

  const filteredClassIds = useMemo(() => {
    return new Set(filteredClasses.map(c => c.id));
  }, [filteredClasses]);

  // Lọc học sinh thuộc các lớp đã lọc
  const filteredStudents = useMemo(() => {
    return students.filter(s => filteredClassIds.has(s.classId));
  }, [students, filteredClassIds]);

  // Tổng hợp số liệu Sĩ số
  const totalStudents = filteredStudents.length;
  const totalBoys = filteredStudents.filter(s => s.gender === 'Nam').length;
  const totalGirls = filteredStudents.filter(s => s.gender === 'Nữ').length;

  // Tổng hợp Điểm danh / Chuyên cần trong ngày selectedDate
  const dayAttendance = useMemo(() => {
    const recordsForDay = attendanceRecords.filter(r => 
      r.date === selectedDate && filteredClassIds.has(r.classId)
    );

    let present = 0;
    let late = 0;
    let excused = 0;
    let unexcused = 0;
    let sick = 0;
    const countedStudents = new Set<string>();

    recordsForDay.forEach(record => {
      if (!record.records) return;
      Object.entries(record.records).forEach(([studentId, status]) => {
        if (countedStudents.has(studentId)) return;
        countedStudents.add(studentId);

        if (status === 'present') present++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
        else if (status === 'unexcused') unexcused++;
        else if (status === 'sick') sick++;
      });
    });

    const absentTotal = late + excused + unexcused + sick;
    const totalLogged = present + absentTotal;
    const rate = totalLogged > 0 ? Math.round((present / totalLogged) * 100) : (totalStudents > 0 ? 100 : 0);

    return { present, late, excused, unexcused, sick, absentTotal, totalLogged, rate };
  }, [attendanceRecords, filteredClassIds, selectedDate, totalStudents]);

  // Tổng hợp Bán trú (Bữa ăn trưa) trong ngày selectedDate
  const dayBoarding = useMemo(() => {
    const recordsForDay = boardingRecords.filter(r => 
      r.date === selectedDate && filteredClassIds.has(r.classId)
    );

    let eating = 0;
    let notEating = 0;
    let absentMeal = 0;
    const countedStudents = new Set<string>();

    recordsForDay.forEach(record => {
      if (!record.records) return;
      Object.entries(record.records).forEach(([studentId, status]) => {
        if (countedStudents.has(studentId)) return;
        countedStudents.add(studentId);

        if (status === 'eating') eating++;
        else if (status === 'not_eating') notEating++;
        else if (status === 'absent_meal') absentMeal++;
      });
    });

    const totalLogged = eating + notEating + absentMeal;
    const rate = totalLogged > 0 ? Math.round((eating / totalLogged) * 100) : (totalStudents > 0 ? 0 : 0);

    return { eating, notEating, absentMeal, totalLogged, rate };
  }, [boardingRecords, filteredClassIds, selectedDate, totalStudents]);

  // Tổng hợp Xu thi đua & Điểm thưởng
  const totalCoins = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + (s.points || 0), 0);
  }, [filteredStudents]);

  const avgCoins = totalStudents > 0 ? (totalCoins / totalStudents).toFixed(1) : '0';

  // Thống kê chi tiết theo từng lớp trong phạm vi lọc
  const perClassStatistics = useMemo(() => {
    return filteredClasses.map(cls => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      const clsCoins = clsStudents.reduce((sum, s) => sum + (s.points || 0), 0);
      const clsAvgCoins = clsStudents.length > 0 ? (clsCoins / clsStudents.length).toFixed(1) : '0';

      // Chuyên cần lớp
      const attRecord = attendanceRecords.find(r => r.classId === cls.id && r.date === selectedDate);
      let clsPresent = 0;
      let clsAbsent = 0;
      if (attRecord && attRecord.records) {
        Object.values(attRecord.records).forEach(st => {
          if (st === 'present') clsPresent++;
          else clsAbsent++;
        });
      } else {
        clsPresent = clsStudents.length;
      }
      const attRate = clsStudents.length > 0 ? Math.round((clsPresent / clsStudents.length) * 100) : 100;

      // Bán trú lớp
      const mealRecord = boardingRecords.find(r => r.classId === cls.id && r.date === selectedDate);
      let clsEating = 0;
      if (mealRecord && mealRecord.records) {
        Object.values(mealRecord.records).forEach(st => {
          if (st === 'eating') clsEating++;
        });
      }

      return {
        ...cls,
        studentCount: clsStudents.length,
        coins: clsCoins,
        avgCoins: clsAvgCoins,
        present: clsPresent,
        absent: clsAbsent,
        attendanceRate: attRate,
        eatingCount: clsEating
      };
    }).sort((a, b) => b.coins - a.coins);
  }, [filteredClasses, students, attendanceRecords, boardingRecords, selectedDate]);

  // 4. ĐỘNG CƠ ĐỒNG BỘ TRỰC TUYẾN 2 CHIỀU (Two-way Realtime Engine)
  useEffect(() => {
    if (!currentUser) return;

    const username = currentUser.username || 'admin';
    const unsubscribe = databaseService.subscribeRealtimeUpdates(username, (event) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastEventTime(timeStr);
      setIsPulseActive(true);

      if (soundEnabled) {
        try { playPointClink(); } catch (_) {}
      }

      // Tắt vi sóng sau 2.5 giây
      const timer = setTimeout(() => {
        setIsPulseActive(false);
      }, 2500);

      return () => clearTimeout(timer);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, soundEnabled]);

  // Nút đồng bộ tức thì
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await syncDatabaseNow();
      const now = new Date();
      setLastEventTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
      setIsPulseActive(true);
      setTimeout(() => setIsPulseActive(false), 2000);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Xuất file Báo cáo Excel cho BGH
  const handleExportExcel = () => {
    const rows = perClassStatistics.map((cls, idx) => ({
      'STT': idx + 1,
      'Lớp': cls.name,
      'Khối': cls.grade,
      'Phân hiệu': cls.branch || 'Khu chính',
      'Điểm trường': cls.campus || 'Điểm Trung tâm',
      'Giáo viên chủ nhiệm': cls.teacherName || 'Chưa cập nhật',
      'Sĩ số': cls.studentCount,
      'Có mặt': cls.present,
      'Vắng': cls.absent,
      'Tỷ lệ chuyên cần (%)': `${cls.attendanceRate}%`,
      'Ăn bán trú': cls.eatingCount,
      'Tổng xu thi đua': cls.coins,
      'Điểm trung bình': cls.avgCoins
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCao_Realtime');

    const scopeTitle = selectedBranch === 'all' 
      ? 'Toan_Truong' 
      : `${selectedBranch}_${selectedCampus === 'all' ? 'Tat_Ca' : selectedCampus}`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Bao_Cao_Ban_Giam_Hieu_${scopeTitle}_${selectedDate}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Banner & Realtime Connection Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-4 sm:p-5 text-white border border-indigo-500/30 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10.5px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>BAN GIÁM HIỆU & QUẢN TRỊ VIÊN</span>
              </span>

              {/* Anti-Duplication Protocol Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10.5px] font-black uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>CHỐNG TRÙNG LẶP: {homeroomClasses.length} LỚP GVCN</span>
                {excludedSubjectClassesCount > 0 && (
                  <span className="text-amber-300 font-bold lowercase">
                    (loại trừ {excludedSubjectClassesCount} lớp GVBM)
                  </span>
                )}
              </span>

              {/* Realtime Live Pulse Badge */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all ${
                isPulseActive 
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-sm shadow-emerald-500/50 scale-105'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isPulseActive ? 'duration-500' : ''}`} />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Wifi className="w-3 h-3" />
                <span>SUPABASE REALTIME 2 CHIỀU</span>
              </div>

              {lastEventTime && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span>Vừa nhận: <strong className="text-emerald-400">{lastEventTime}</strong></span>
                </span>
              )}
            </div>

            <h1 className="text-base sm:text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>HỆ THỐNG BÁO CÁO ĐA TẦNG THỜI GIAN THỰC</span>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            </h1>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Tự động cộng dồn số liệu Phân hiệu & Điểm trường • Giám sát trực tiếp Sĩ số, Điểm danh, Bán trú và Thi đua
            </p>
          </div>

          {/* Action buttons on Header */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                soundEnabled 
                  ? 'bg-indigo-600/40 text-indigo-200 border-indigo-400/40 hover:bg-indigo-600/60' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={soundEnabled ? 'Đang bật chuông thông báo Realtime' : 'Đã tắt chuông thông báo'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px] font-bold">{soundEnabled ? 'Bật chuông' : 'Tắt chuông'}</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all hover:scale-102 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Đang nạp...' : 'Làm mới ngay'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all hover:scale-102 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel BGH</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Thanh Công Cụ Bộ Lọc Đa Tầng (Multi-Level Hierarchy Toolbar) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-indigo-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-tight">
                BỘ LỌC ĐA TẦNG PHÂN HIỆU & ĐIỂM TRƯỜNG
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn cấp lọc để động cơ toán học tự động quét và cộng dồn số liệu chính xác
              </p>
            </div>
          </div>

          {/* Ngày thanh tra */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-600 hidden sm:inline">Ngày giám sát:</span>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10.5px] font-bold"
              >
                Hôm nay
              </button>
            )}
          </div>
        </div>

        {/* 3 Cột Bộ lọc: Cấp 1 (Toàn trường), Cấp 2 (Phân hiệu), Cấp 3 (Điểm trường) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Cấp 1: Phân hiệu */}
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>CẤP 1: CHỌN PHÂN HIỆU</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedCampus('all');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">🌐 Toàn trường (Tất cả phân hiệu)</option>
              {availableBranches.map(branch => (
                <option key={branch} value={branch}>
                  🏛️ {branch}
                </option>
              ))}
            </select>
          </div>

          {/* Cấp 2: Điểm trường */}
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>CẤP 2: CHỌN ĐIỂM TRƯỜNG</span>
            </label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">📍 Tất cả điểm trường ({availableCampuses.length} điểm)</option>
              {availableCampuses.map(campus => (
                <option key={campus} value={campus}>
                  📍 {campus}
                </option>
              ))}
            </select>
          </div>

          {/* Thông tin phạm vi áp dụng & Nút Reset */}
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-emerald-600" />
              <span>PHẠM VI ĐANG THEO DÕI</span>
            </label>
            <div className="flex items-center justify-between p-1.5 px-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl">
              <div className="truncate">
                <span className="text-[11px] font-black text-indigo-950 block truncate">
                  {selectedBranch === 'all' ? 'TOÀN TRƯỜNG' : selectedBranch}
                  {selectedCampus !== 'all' && ` • ${selectedCampus}`}
                </span>
                <span className="text-[10px] text-indigo-700 font-bold">
                  {filteredClasses.length} lớp học • {totalStudents} học sinh
                </span>
              </div>
              {(selectedBranch !== 'all' || selectedCampus !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedBranch('all');
                    setSelectedCampus('all');
                  }}
                  className="px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-[10px] font-black shadow-xs shrink-0 cursor-pointer"
                >
                  Đặt lại
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Thẻ Chỉ Số Tổng Hợp (Executive KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tổng Sĩ Số */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-indigo-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-600 uppercase">TỔNG SĨ SỐ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono">
              {totalStudents}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-600">
              <span className="text-blue-700">👦 {totalBoys} Nam</span>
              <span>•</span>
              <span className="text-pink-600">👧 {totalGirls} Nữ</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{filteredClasses.length} lớp học trực thuộc</span>
            <span className="text-indigo-600 font-black">{selectedBranch === 'all' ? '100% trường' : 'Theo phân hệ'}</span>
          </div>
        </div>

        {/* Card 2: Chuyên Cần & Điểm Danh Hôm Nay */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-emerald-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-800 uppercase">CHUYÊN CẦN HÔM NAY</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                {dayAttendance.rate}%
              </span>
              <span className="text-xs font-bold text-emerald-700">
                ({dayAttendance.present}/{totalStudents || 0})
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-600">
              <span className="text-emerald-700">✓ Có mặt: {dayAttendance.present}</span>
              <span>•</span>
              <span className="text-rose-600">✕ Vắng: {dayAttendance.absentTotal}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>Phép: {dayAttendance.excused} • K.Phép: {dayAttendance.unexcused}</span>
            <span className={`font-black ${dayAttendance.rate >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {dayAttendance.rate >= 95 ? 'Đạt chuẩn' : 'Cần lưu ý'}
            </span>
          </div>
        </div>

        {/* Card 3: Ăn Bán Trú */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-amber-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-800 uppercase">ĂN BÁN TRÚ HÔM NAY</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
                {dayBoarding.eating}
              </span>
              <span className="text-xs font-bold text-amber-700">
                suất ăn ({dayBoarding.rate}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-600">
              <span className="text-amber-700">Ăn trưa: {dayBoarding.eating}</span>
              <span>•</span>
              <span className="text-slate-500">Về nhà: {dayBoarding.notEating}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>Cắt suất: {dayBoarding.absentMeal}</span>
            <span className="text-amber-700 font-black">Nhà bếp đã chốt</span>
          </div>
        </div>

        {/* Card 4: Xu Thi Đua Lớp Học */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-purple-800 uppercase">THI ĐUA TÍCH ĐIỂM</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-purple-950 font-mono">
              {totalCoins} <span className="text-sm font-bold text-amber-500">🪙</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-purple-700">
              <span>Trung bình:</span>
              <strong className="text-purple-900 font-black">{avgCoins} xu / học sinh</strong>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-purple-100 text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>Thi đua hạnh phúc</span>
            <span className="text-purple-600 font-black">Xếp hạng realtime</span>
          </div>
        </div>
      </div>

      {/* 4. Biểu Đồ Tròn Trực Quan Sinh Động (Realtime Donut Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Biểu đồ 1: Tỷ lệ Chuyên cần */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>CƠ CẤU CHUYÊN CẦN ({selectedDate})</span>
            </h4>
            <span className="text-[10.5px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              Tỷ lệ: {dayAttendance.rate}%
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
            {/* SVG Circular Progress */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * (dayAttendance.rate || 0)) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {dayAttendance.rate}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Có mặt</span>
              </div>
            </div>

            {/* Chi tiết các chỉ số */}
            <div className="space-y-2 text-xs w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Có mặt đúng giờ:
                </span>
                <strong className="text-emerald-950 font-mono">{dayAttendance.present} em</strong>
              </div>
              <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Nghỉ có phép / Ốm:
                </span>
                <strong className="text-amber-950 font-mono">{dayAttendance.excused + dayAttendance.sick} em</strong>
              </div>
              <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="flex items-center gap-1.5 font-bold text-rose-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Nghỉ không phép:
                </span>
                <strong className="text-rose-950 font-mono">{dayAttendance.unexcused} em</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ 2: Cơ cấu Bán trú */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-600" />
              <span>CƠ CẤU BÁN TRÚ ({selectedDate})</span>
            </h4>
            <span className="text-[10.5px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
              {dayBoarding.eating} suất ăn
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
            {/* SVG Circular Progress */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="12"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * (dayBoarding.rate || 0)) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {dayBoarding.eating}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Suất ăn</span>
              </div>
            </div>

            {/* Chi tiết bán trú */}
            <div className="space-y-2 text-xs w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Ăn bán trú tại trường:
                </span>
                <strong className="text-amber-950 font-mono">{dayBoarding.eating} em</strong>
              </div>
              <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Về nhà ăn cơm:
                </span>
                <strong className="text-slate-900 font-mono">{dayBoarding.notEating} em</strong>
              </div>
              <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="flex items-center gap-1.5 font-bold text-rose-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Báo cắt suất hôm nay:
                </span>
                <strong className="text-rose-950 font-mono">{dayBoarding.absentMeal} em</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bảng Giám Sát Chi Tiết Từng Lớp Trong Phân Hệ (Per-Class Grid) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-tight flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>BẢNG XẾP HẠNG & THEO DÕI THỜI GIAN THỰC TỪNG LỚP ({filteredClasses.length} LỚP)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Dữ liệu được cập nhật tự động khi bất kỳ GVCN nào điểm danh, báo ăn hoặc cộng điểm
            </p>
          </div>
          <span className="text-[11px] font-black bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-xl self-start sm:self-auto">
            {selectedBranch === 'all' ? 'Toàn trường' : selectedBranch}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-black text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                <th className="py-2.5 px-3">Lớp & Khối</th>
                <th className="py-2.5 px-3">Phân hiệu / Điểm trường</th>
                <th className="py-2.5 px-3">Giáo viên chủ nhiệm</th>
                <th className="py-2.5 px-3 text-center">Sĩ số</th>
                <th className="py-2.5 px-3 text-center">Chuyên cần</th>
                <th className="py-2.5 px-3 text-center">Bán trú</th>
                <th className="py-2.5 px-3 text-right">Tổng xu thi đua</th>
                <th className="py-2.5 px-3 text-right">Trung bình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perClassStatistics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                    Không tìm thấy lớp học nào trong phân hệ đã chọn.
                  </td>
                </tr>
              ) : (
                perClassStatistics.map((cls, idx) => (
                  <tr key={cls.id} className="hover:bg-indigo-50/30 transition-colors">
                    {/* Hạng */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                        idx === 0 
                          ? 'bg-amber-400 text-white shadow-xs' 
                          : idx === 1 
                          ? 'bg-slate-300 text-slate-800' 
                          : idx === 2 
                          ? 'bg-amber-600 text-white' 
                          : 'text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>

                    {/* Lớp & Khối */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: cls.color || '#6366f1' }}
                        />
                        <div>
                          <strong className="text-indigo-950 font-black text-xs block">
                            Lớp {cls.name}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-bold">{cls.grade}</span>
                        </div>
                      </div>
                    </td>

                    {/* Phân hiệu / Điểm trường */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          🏛️ {cls.branch || 'Khu chính'}
                        </span>
                        {cls.campus && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 block w-fit">
                            📍 {cls.campus}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* GVCN */}
                    <td className="py-2.5 px-3">
                      <span className="text-slate-800 font-bold">
                        {cls.teacherName || 'Chưa phân công'}
                      </span>
                    </td>

                    {/* Sĩ số */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                      {cls.studentCount}
                    </td>

                    {/* Chuyên cần */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
                        cls.attendanceRate >= 95 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cls.attendanceRate}% ({cls.present})
                      </span>
                    </td>

                    {/* Bán trú */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-900">
                      {cls.eatingCount} suất
                    </td>

                    {/* Tổng xu */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950">
                      {cls.coins} <span className="text-amber-500 text-[11px]">🪙</span>
                    </td>

                    {/* Điểm TB */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                      {cls.avgCoins}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
