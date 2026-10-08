import React, { useState, useEffect } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { 
  Maximize2, Minimize2, 
  Sparkles, Award, ShieldAlert,
  ChevronDown, School, ShieldCheck, Database, LogIn, LogOut, Users, RefreshCw, GitBranch,
  Menu, Monitor
} from 'lucide-react';
import { playNoiseAlertSound } from '../../utils/audio';
import { NavigationMenuId } from './Sidebar';

interface TopBarProps {
  currentView: NavigationMenuId;
  onNavigate: (viewId: NavigationMenuId) => void;
  onOpenQuickNoise?: () => void;
  onOpenProfile?: () => void;
  onToggleMobileSidebar?: () => void;
}

const VIEW_TITLES: Record<NavigationMenuId, { title: string; shortTitle: string; subtitle: string }> = {
  dashboard: {
    title: 'TRANG CHỦ',
    shortTitle: 'TRANG CHỦ',
    subtitle: 'TỔNG QUAN TÌNH HÌNH VÀ HOẠT ĐỘNG HỌC TẬP HÔM NAY'
  },
  certificate: {
    title: 'THƯ KHEN ĐIỆN TỬ',
    shortTitle: 'THƯ KHEN',
    subtitle: 'TẠO VÀ XUẤT THƯ KHEN NHANH CHÓNG'
  },
  classes: {
    title: 'QUẢN LÝ LỚP HỌC',
    shortTitle: 'LỚP HỌC',
    subtitle: 'DANH SÁCH CÁC LỚP HỌC, KHỐI LỚP VÀ THỐNG KÊ SĨ SỐ'
  },
  students: {
    title: 'HỌC SINH & THI ĐUA',
    shortTitle: 'HỌC SINH',
    subtitle: 'QUẢN LÝ THÀNH VIÊN, NỀ NẾP VÀ THƯỞNG XU THI ĐUA TRỰC TIẾP'
  },
  attendance: {
    title: 'ĐIỂM DANH HẰNG NGÀY',
    shortTitle: 'ĐIỂM DANH',
    subtitle: 'THEO DÕI SĨ SỐ, CHUYÊN CẦN VÀ TÌNH HÌNH ĐI HỌC HÀNG NGÀY'
  },
  seating: {
    title: 'SƠ ĐỒ CHỖ NGỒI KHÔNG GIAN 3D',
    shortTitle: 'SƠ ĐỒ LỚP',
    subtitle: 'HIỂN THỊ ĐẦY ĐỦ TẤT CẢ HỌC SINH THEO TỪNG DÃY BÀN VÀ HÀNG LỚP HỌC'
  },
  schedule: {
    title: 'THỜI KHÓA BIỂU',
    shortTitle: 'TKB',
    subtitle: 'THIẾT LẬP LỊCH DẠY SÁNG / CHIỀU VÀ BẤM TRỰC TIẾP VÀO TỪNG Ô ĐỂ XẾP MÔN HỌC'
  },
  rewards: {
    title: 'ĐỔI PHẦN THƯỞNG',
    shortTitle: 'ĐỔI THƯỞNG',
    subtitle: 'CỬA HÀNG PHẦN THƯỞNG ĐỔI XU TÍCH LŨY CHO HỌC SINH'
  },
  picker: {
    title: 'GỌI TÊN HỌC SINH',
    shortTitle: 'GỌI TÊN',
    subtitle: '6 TRÒ CHƠI GỌI TÊN HÀO HỨNG: VÒNG QUAY, CUỘN PHIM, TÀU VŨ TRỤ, HỘP QUÀ, ĐUA VỊT VÀ QUIZ NGHIÊNG ĐẦU'
  },
  wheel: {
    title: 'VÒNG QUAY MAY MẮN',
    shortTitle: 'VÒNG QUAY',
    subtitle: 'QUAY SỐ NGẪU NHIÊN GỌI TÊN HỌC SINH TRẢ LỜI HOẶC NHẬN QUÀ'
  },
  reel: {
    title: 'CUỘN PHIM MAY MẮN',
    shortTitle: 'CUỘN PHIM',
    subtitle: 'CUỘN BĂNG PHIM CHỌN NGẪU NHIÊN HỌC SINH VỚI AVATAR LỚN SINH ĐỘNG'
  },
  noise: {
    title: 'CÔNG CỤ CHỐNG ỒN',
    shortTitle: 'CHỐNG ỒN',
    subtitle: 'CẢNH BÁO TIẾNG ỒN LỚP HỌC – PHÁT HIỆN TỰ ĐỘNG QUA MICRO VÀ BẤM CẢNH BÁO'
  },
  timer: {
    title: 'ĐỒNG HỒ ĐẾM NGƯỢC',
    shortTitle: 'ĐỒNG HỒ',
    subtitle: 'THIẾT LẬP THỜI GIAN ĐẾM NGƯỢC ĐẸP MẮT – CHUÔNG BÁO KHI HẾT GIỜ'
  },
  links: {
    title: 'LIÊN KẾT HỮU ÍCH',
    shortTitle: 'LIÊN KẾT',
    subtitle: 'KHO TÀI LIỆU, TRANG WEB HỌC TẬP VÀ HỌC LIỆU SỐ DÙNG CHUNG'
  },
  reports: {
    title: 'BÁO CÁO & PHÂN TÍCH',
    shortTitle: 'BÁO CÁO',
    subtitle: 'THỐNG KÊ ĐIỂM XU, XẾP HẠNG VÀ LỊCH SỬ TÍCH ĐỔI CHI TIẾT'
  },
  data: {
    title: 'DỮ LIỆU HỆ THỐNG',
    shortTitle: 'DỮ LIỆU',
    subtitle: 'XUẤT FILE SAO LƯU .JSON, XUẤT BÁO CÁO HTML VÀ KHÔI PHỤC DỮ LIỆU'
  },
  settings: {
    title: 'CÀI ĐẶT HỆ THỐNG & HỒ SƠ GIÁO VIÊN',
    shortTitle: 'CÀI ĐẶT',
    subtitle: 'CẬP NHẬT THÔNG TIN CÁ NHÂN GIÁO VIÊN, TÀI KHOẢN ĐẠI DIỆN VÀ QUY CÁCH HIỂN THỊ'
  },
  infographic: {
    title: 'INFOGRAPHIC LỚP HỌC TOÀN DIỆN (A4 PDF)',
    shortTitle: 'INFOGRAPHIC',
    subtitle: 'TỔNG HỢP ĐỒ HỌA THÔNG TIN LỚP, GIÁO VIÊN, HỌC SINH, SƠ ĐỒ CHỖ NGỒI VÀ THỜI KHÓA BIỂU'
  },
  ai: {
    title: 'TRÍ TUỆ NHÂN TẠO AI LỚP HỌC HẠNH PHÚC',
    shortTitle: 'AI TRỢ LÝ',
    subtitle: 'SOẠN LỜI PHÊ, BỘ CÂU HỎI KHỞI ĐỘNG, XẾP CHỖ THÔNG MINH VÀ CỐ VẤN SƯ PHẠM'
  }
};

export const TopBar: React.FC<TopBarProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenProfile,
  onToggleMobileSidebar
}) => {
  const { 
    classes, activeClassId, setActiveClassId, teacherProfile, currentClassStudents,
    teacherRole, setTeacherRole, subjectTeacherConfig,
    currentUser, allUsers, switchUserAccount, logoutUser, 
    setIsAuthModalOpen, setIsAccountManagerOpen, isGithubModalOpen, setIsGithubModalOpen,
    dbSyncStatus, lastDbSyncTime, syncDatabaseNow, isAdmin,
    isDemo, isBgh, canManageAccounts, setIsRegistrationModalOpen, demoWarningMessage
  } = useClassroom();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('13:13');

  // Đảm bảo không áp dụng CSS zoom gây lỗi khoảng trắng
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.zoom = '';
      document.documentElement.removeAttribute('data-zoom-manual');
      localStorage.removeItem('classroom_display_zoom');
    }
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];
  let viewInfo = VIEW_TITLES[currentView] || VIEW_TITLES.dashboard;

  if (teacherRole === 'subject') {
    if (currentView === 'dashboard') {
      viewInfo = {
        title: `TRANG CHỦ – GV BỘ MÔN: ${subjectTeacherConfig.subjectName}`,
        shortTitle: 'TRANG CHỦ',
        subtitle: 'THỜI KHÓA BIỂU GIẢNG DẠY CÁC LỚP HÔM NAY VÀ THỐNG KÊ THI ĐUA BỘ MÔN'
      };
    } else if (currentView === 'schedule') {
      viewInfo = {
        title: `THỜI KHÓA BIỂU GIẢNG DẠY (${subjectTeacherConfig.subjectName})`,
        shortTitle: 'TKB BỘ MÔN',
        subtitle: 'SẮP THỜI KHÓA BIỂU NHIỀU LỚP DÙNG CHUNG CẢ HỌC KỲ HOẶC THEO THỜI ĐIỂM (LÊN TỚI 20 LỚP)'
      };
    } else if (currentView === 'reports') {
      viewInfo = {
        title: `BÁO CÁO & THỐNG KÊ BỘ MÔN (${subjectTeacherConfig.subjectName})`,
        shortTitle: 'BÁO CÁO',
        subtitle: 'TỔNG HỢP CHI TIẾT SỐ SAO, ĐIỂM XU TÍCH LŨY CỦA TẤT CẢ CÁC LỚP PHỤ TRÁCH'
      };
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handleQuickAlarm = () => {
    playNoiseAlertSound();
  };

  const handleSwitchRole = (role: 'homeroom' | 'subject') => {
    setTeacherRole(role);
    if (role === 'subject') {
      if (currentView === 'attendance' || currentView === 'seating' || currentView === 'infographic') {
        onNavigate('dashboard');
      }
    }
  };

  return (
    <>
      {demoWarningMessage && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-[11px] md:text-xs font-black py-1 px-3.5 flex items-center justify-between shadow-xs sticky top-0 z-31 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 truncate">
            <span className="animate-bounce">⚠️</span>
            <span className="truncate">{demoWarningMessage}</span>
          </div>
          <button
            onClick={() => setIsRegistrationModalOpen(true)}
            className="px-2.5 py-0.5 rounded-full bg-white text-slate-900 hover:bg-amber-100 font-black text-[10px] md:text-[11px] uppercase shrink-0 transition-transform active:scale-95 shadow-2xs ml-2 cursor-pointer"
          >
            ĐĂNG KÝ BẢN FULL
          </button>
        </div>
      )}

      <header className="h-13 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-4 md:px-5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Zone 1: Current Page Title & Subtitle Breadcrumb matching PDF with Mobile Menu Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 pr-1 sm:pr-2.5">
        {/* Mobile/Tablet Menu Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 -ml-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0 focus:outline-hidden"
          title="Mở menu điều hướng chức năng"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
            <span className="sm:hidden">{viewInfo.shortTitle || viewInfo.title}</span>
            <span className="hidden sm:inline">{viewInfo.title}</span>
            {currentView !== 'dashboard' && currentView !== 'classes' && activeClass && (
              <span className="text-indigo-600 font-extrabold ml-1.5 hidden md:inline-block">
                {activeClass.name.trim().toLowerCase().startsWith('lớp') ? activeClass.name.trim() : `Lớp ${activeClass.name.trim()}`}
              </span>
            )}
          </h2>
          <p className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium leading-tight truncate hidden sm:block mt-0.5">
            {viewInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Zone 2: Status Pill, Role Switcher, Class Selector, Profile & Quick Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
        {/* Role Control: ADMIN has switchable toggle to preview/inspect GVCN and GVBM views. TEACHERS have fixed locked role badges. */}
        {isAdmin ? (
          <div className="flex items-center p-0.5 sm:p-1 bg-slate-100 rounded-2xl border border-indigo-200/90 shadow-2xs">
            <span className="text-[10px] font-black text-indigo-700 px-2 uppercase hidden 2xl:inline">
              XEM THEO:
            </span>
            <button
              onClick={() => handleSwitchRole('homeroom')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-black rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 uppercase ${
                teacherRole === 'homeroom'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Quản trị viên xem giao diện Giáo viên chủ nhiệm: Điểm danh, Infographic, Sơ đồ lớp, Thời khóa biểu lớp"
            >
              <span>🏫</span>
              <span className="hidden 2xl:inline">GV CHỦ NHIỆM</span>
              <span className="2xl:hidden">GVCN</span>
            </button>
            <button
              onClick={() => handleSwitchRole('subject')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-black rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 uppercase ${
                teacherRole === 'subject'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Quản trị viên xem giao diện Giáo viên bộ môn: Khởi tạo lớp bộ môn, sắp TKB nhiều lớp, chấm sao thi đua"
            >
              <span>💻</span>
              <span className="hidden 2xl:inline">GV BỘ MÔN</span>
              <span className="2xl:hidden">GVBM</span>
            </button>
          </div>
        ) : (
          /* Teachers have locked role badge: cannot switch roles without logging out and logging in to proper account */
          <div className="flex items-center">
            {currentUser?.role === 'subject' ? (
              <div 
                className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs flex items-center gap-1 sm:gap-1.5 uppercase shrink-0"
                title="Tài khoản Giáo viên bộ môn cố định theo vai trò. Để dùng vai trò GV Chủ nhiệm, vui lòng Đăng xuất và đăng nhập tài khoản GVCN."
              >
                <span>💻</span>
                <span className="hidden sm:inline">GV BỘ MÔN: {subjectTeacherConfig.subjectName || 'TIN HỌC'}</span>
                <span className="sm:hidden">GVBM</span>
              </div>
            ) : (
              <div 
                className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs flex items-center gap-1 sm:gap-1.5 uppercase shrink-0"
                title="Tài khoản Giáo viên chủ nhiệm cố định theo vai trò. Để dùng vai trò GV Bộ môn, vui lòng Đăng xuất và đăng nhập tài khoản GVBM."
              >
                <span>🏫</span>
                <span className="hidden sm:inline">GV CHỦ NHIỆM {currentUser?.assignedClassName ? `(${currentUser.assignedClassName})` : ''}</span>
                <span className="sm:hidden">GVCN</span>
              </div>
            )}
          </div>
        )}

        {/* Realtime Database Sync Badge */}
        <button
          onClick={syncDatabaseNow}
          className={`hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black shadow-2xs hover-zoom-badge uppercase transition-all ${
            dbSyncStatus === 'synced'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : dbSyncStatus === 'syncing'
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
          }`}
          title="Nhấn để đồng bộ dữ liệu ngay lập tức lên cơ sở dữ liệu máy chủ"
        >
          {dbSyncStatus === 'syncing' ? (
            <RefreshCw className="w-2.5 h-2.5 text-amber-600 animate-spin" />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${dbSyncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          )}
          <span>{dbSyncStatus === 'syncing' ? 'ĐANG LƯU...' : `ĐÃ LƯU ${lastDbSyncTime || currentTimeStr}`}</span>
        </button>

        {/* GitHub Server Continuous Auto-Sync Badge & Config */}
        <button
          onClick={() => setIsGithubModalOpen(true)}
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black shadow-2xs hover-zoom-badge uppercase transition-all cursor-pointer"
          title="Xem trạng thái đồng bộ GitHub Server, cấu hình tự động đẩy (Auto-Push) và liên thông đa thiết bị"
        >
          <GitBranch className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span className="hidden 2xl:inline text-slate-300">GITHUB SERVER:</span>
          <span className="text-emerald-400 font-bold">TỰ ĐỘNG ĐẨY</span>
        </button>

        {/* Nút Đăng Ký Sử Dụng Phần Mềm Nổi Bật (Yêu cầu 4) */}
        <button
          onClick={() => setIsRegistrationModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-red-500/20 hover-zoom-btn uppercase shrink-0 border border-white/20 cursor-pointer animate-pulse"
          title="Đăng ký sử dụng bản quyền phần mềm Lớp học Hạnh phúc"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden xl:inline">ĐĂNG KÝ SỬ DỤNG</span>
          <span className="xl:hidden">ĐĂNG KÝ</span>
        </button>

        {/* Admin Super Button chỉ dành cho Quản trị viên (Ban Giám Hiệu không có quyền tạo tài khoản theo Yêu cầu 2d) */}
        {canManageAccounts && (
          <button
            onClick={() => setIsAccountManagerOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 hover-zoom-btn shadow-2xs uppercase"
            title="Quản lý tài khoản, gán quyền GVCN/GVBM & Cơ sở dữ liệu GitHub"
          >
            <ShieldCheck className="w-3 h-3 text-rose-600" />
            <span className="hidden 2xl:inline">QUẢN TRỊ ADMIN</span>
          </button>
        )}
        {isBgh && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-black text-amber-900 bg-amber-100/90 rounded-xl border border-amber-300 uppercase shadow-2xs"
            title="Tài khoản Ban Giám Hiệu (Toàn quyền giám sát & xem dữ liệu các lớp)"
          >
            <span>🏛️</span>
            <span className="hidden 2xl:inline">BAN GIÁM HIỆU</span>
            <span className="2xl:hidden">BGH</span>
          </span>
        )}

        {/* Class Selector Dropdown Pill matching PDF: Purple rounded-2xl */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm shadow-indigo-600/20 transition-all hover-zoom-btn uppercase shrink-0"
          >
            <div className="w-4 h-4 rounded-md bg-white/20 flex items-center justify-center font-black text-xs">
              <School className="w-3 h-3 text-white" />
            </div>
            <span>{activeClass?.name}</span>
            <span className="text-[10px] text-indigo-200 font-bold hidden 2xl:inline uppercase">
              {activeClass?.grade} • {currentClassStudents.length} HS
            </span>
            <ChevronDown className="w-3 h-3 text-indigo-200" />
          </button>

          {isClassDropdownOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setIsClassDropdownOpen(false)}
            >
              <div className="px-3.5 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                CHỌN LỚP HỌC
              </div>
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setActiveClassId(cls.id);
                    setIsClassDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs md:text-sm text-left hover:bg-slate-50 transition-colors uppercase ${
                    cls.id === activeClassId ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-700 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="font-black">{cls.name}</span>
                    <span className="text-xs text-slate-400 font-normal">· {cls.grade}</span>
                  </div>
                  {cls.id === activeClassId && (
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase">
                      ĐANG CHỌN
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1.5 pt-1.5 px-2">
                <button
                  onClick={() => {
                    setIsClassDropdownOpen(false);
                    onNavigate('classes');
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 font-black rounded-xl transition-colors uppercase"
                >
                  + QUẢN LÝ HOẶC TẠO LỚP MỚI
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick AI Assistant Button */}
        <button
          onClick={() => onNavigate('ai')}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200/80 hover-zoom-btn shadow-2xs uppercase"
          title="Mở Trợ lý Sư phạm Trí tuệ Nhân tạo AI"
        >
          <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
          <span className="hidden xl:inline">TRỢ LÝ AI</span>
        </button>

        {/* Quick Alarm */}
        <button
          onClick={handleQuickAlarm}
          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 hover-zoom-btn shadow-2xs"
          title="Phát chuông ổn định trật tự lớp học ngay lập tức"
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors hover-zoom-btn"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình giảng dạy'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Teacher / User Account Pill with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 p-0.5 pl-1 pr-2 rounded-xl hover:bg-slate-100 transition-all border border-slate-200/80 group hover-zoom-btn"
            title="Nhấn để đổi tài khoản hoặc xem thông tin giáo viên"
          >
            <img 
              src={currentUser?.avatar || teacherProfile.avatar} 
              alt={currentUser?.fullName || teacherProfile.name}
              className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover ring-2 ring-indigo-200 group-hover:ring-indigo-600 transition-all bg-slate-100 shadow-2xs shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="hidden md:block text-left">
              <div className="text-[11px] font-black text-slate-800 leading-tight flex items-center gap-1">
                <span>{currentUser?.fullName || teacherProfile.name}</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-700" />
              </div>
              <div className="text-[9.5px] text-slate-400 leading-none truncate max-w-[120px]">
                {currentUser?.role === 'admin' 
                  ? 'Tài khoản quản trị Cao nhất' 
                  : (currentUser?.role === 'bgh' || currentUser?.isBgh)
                  ? 'Ban Giám Hiệu'
                  : (currentUser?.role === 'school_admin' || currentUser?.isSchoolAdmin)
                  ? 'Quản trị Nhà trường'
                  : (currentUser?.role === 'guest_admin' || currentUser?.isGuestAdmin)
                  ? 'Quản trị GV Cá nhân'
                  : currentUser?.role === 'homeroom' 
                  ? 'GV Chủ nhiệm' 
                  : 'GV Bộ môn'}
              </div>
            </div>
          </button>

          {isUserMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 py-3 px-3 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setIsUserMenuOpen(false)}
            >
              {/* Current user card */}
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={currentUser?.avatar || teacherProfile.avatar} 
                    alt={currentUser?.fullName || teacherProfile.name}
                    className="w-10 h-10 rounded-full border border-indigo-200 object-cover bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {currentUser?.fullName || teacherProfile.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 font-bold truncate">
                      @{currentUser?.username}
                    </div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      currentUser?.role === 'admin' 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                        : (currentUser?.role === 'bgh' || currentUser?.isBgh)
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : (currentUser?.role === 'school_admin' || currentUser?.isSchoolAdmin)
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : (currentUser?.role === 'guest_admin' || currentUser?.isGuestAdmin)
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : currentUser?.role === 'homeroom'
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {currentUser?.role === 'admin' 
                        ? 'Tài khoản quản trị Cao nhất' 
                        : (currentUser?.role === 'bgh' || currentUser?.isBgh)
                        ? 'Ban Giám Hiệu'
                        : (currentUser?.role === 'school_admin' || currentUser?.isSchoolAdmin)
                        ? 'Quản trị Nhà trường'
                        : (currentUser?.role === 'guest_admin' || currentUser?.isGuestAdmin)
                        ? 'Quản trị GV Cá nhân'
                        : currentUser?.role === 'homeroom' 
                        ? 'Giáo viên chủ nhiệm' 
                        : 'Giáo viên bộ môn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* For ADMIN: Removed account switcher per user request */}

              {/* For TEACHERS: Notice that account is locked by role and requires explicit logout */}
              {!isAdmin && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl mb-2 text-[11px] text-amber-900 leading-snug">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950 mb-1">
                    <span>🔒</span>
                    <span>VAI TRÒ CỐ ĐỊNH THEO TÀI KHOẢN</span>
                  </div>
                  <span>
                    Giáo viên chủ nhiệm và Giáo viên bộ môn không thể chuyển đổi qua lại. Để dùng tài khoản khác, vui lòng <strong>Đăng xuất</strong> và đăng nhập bằng tài khoản được phân công.
                  </span>
                </div>
              )}

              {/* Action items */}
              <div className="border-t border-slate-100 pt-1.5 space-y-1">
                {canManageAccounts && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsAccountManagerOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black text-rose-700 hover:bg-rose-50 transition-colors uppercase"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Quản trị tài khoản & DB</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onOpenProfile) onOpenProfile();
                    else onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors uppercase"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Cài đặt & Hồ sơ cá nhân</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logoutUser();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors uppercase shadow-sm shadow-rose-600/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ĐĂNG XUẤT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  </>
  );
};
