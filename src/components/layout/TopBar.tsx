import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { 
  Maximize2, Minimize2, 
  Sparkles, Award, ShieldAlert,
  ChevronDown, School, FolderSync, ShieldCheck, GraduationCap,
  LogOut, LogIn, User, Settings, Download, KeyRound, ExternalLink, X, Eye
} from 'lucide-react';
import { playNoiseAlertSound } from '../../utils/audio';
import { NavigationMenuId } from './Sidebar';

interface TopBarProps {
  currentView: NavigationMenuId;
  onNavigate: (viewId: NavigationMenuId) => void;
  onOpenQuickNoise?: () => void;
  onOpenProfile?: () => void;
}

const VIEW_TITLES: Record<NavigationMenuId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Trang chủ',
    subtitle: 'Tổng quan tình hình và hoạt động học tập hôm nay'
  },
  admin_stats: {
    title: 'Quản Lý Số Liệu Toàn Trường',
    subtitle: 'Bảng số liệu tổng hợp các khối lớp, chuyên cần, bán trú và biểu đồ phân tích'
  },
  classes: {
    title: 'Quản lý Lớp học',
    subtitle: 'Danh sách các lớp học, khối lớp và thông tin chung'
  },
  students: {
    title: 'Học sinh & Thi Đua',
    subtitle: 'Quản lý thành viên, nề nếp và thưởng xu thi đua trực tiếp'
  },
  attendance: {
    title: 'Điểm Danh Hằng Ngày',
    subtitle: 'Theo dõi sĩ số, chuyên cần và tình hình đi học hàng ngày'
  },
  seating: {
    title: 'Sơ Đồ Chỗ Ngồi Không Gian 3D',
    subtitle: 'Hiển thị đầy đủ tất cả học sinh theo từng Dãy bàn và Hàng lớp học'
  },
  schedule: {
    title: 'Thời Khóa Biểu',
    subtitle: 'Thiết lập lịch dạy Sáng / Chiều và bấm trực tiếp vào từng ô để xếp môn học'
  },
  rewards: {
    title: 'Đổi phần thưởng',
    subtitle: 'Cửa hàng phần thưởng đổi xu tích lũy cho học sinh'
  },
  picker: {
    title: 'Gọi Tên Học Sinh',
    subtitle: '5 trò chơi gọi tên sôi nổi: Vòng quay, Cuộn phim, Đua vịt, Lật thẻ ảnh và Ống kính may mắn'
  },
  wheel: {
    title: 'Vòng quay may mắn',
    subtitle: 'Quay số ngẫu nhiên gọi tên học sinh trả lời hoặc nhận quà'
  },
  reel: {
    title: 'Cuộn Phim May Mắn',
    subtitle: 'Cuộn băng phim chọn ngẫu nhiên học sinh với avatar lớn sinh động'
  },
  noise: {
    title: 'Công Cụ Chống Ồn',
    subtitle: 'Cảnh báo tiếng ồn lớp học – phát hiện tự động qua micro và bấm cảnh báo'
  },
  timer: {
    title: 'Đồng Hồ Đếm Ngược',
    subtitle: 'Thiết lập thời gian đếm ngược đẹp mắt – chuông báo khi hết giờ'
  },
  links: {
    title: 'Liên kết hữu ích',
    subtitle: 'Kho tài liệu, trang web học tập và học liệu số dùng chung'
  },
  reports: {
    title: 'Báo Cáo & Phân Tích',
    subtitle: 'Thống kê điểm xu, xếp hạng và lịch sử tích đổi chi tiết'
  },
  data: {
    title: 'Dữ liệu hệ thống',
    subtitle: 'Xuất file sao lưu .JSON, xuất báo cáo HTML và khôi phục dữ liệu'
  },
  settings: {
    title: 'Cài Đặt Hệ Thống & Hồ Sơ Giáo Viên',
    subtitle: 'Cập nhật thông tin cá nhân giáo viên, tài khoản đại diện và quy cách hiển thị'
  },
  infographic: {
    title: 'Infographic Lớp Học Toàn Diện (A4 PDF)',
    subtitle: 'Tổng hợp đồ họa thông tin lớp, giáo viên, học sinh, sơ đồ chỗ ngồi, thời khóa biểu và ban phụ huynh'
  },
  ai: {
    title: 'Trí Tuệ Nhân Tạo AI Lớp Học Hạnh Phúc',
    subtitle: 'Soạn lời phê, bộ câu hỏi khởi động, xếp chỗ thông minh và cố vấn sư phạm'
  }
};

export const TopBar: React.FC<TopBarProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenProfile 
}) => {
  const { 
    classes, activeClassId, setActiveClassId, teacherProfile, 
    currentClassStudents, currentRole, setCurrentRole, setRoleModalOpen, 
    teacherAccount, adminAccount, logoutRole, exportBackupJson, exportFullSystemJson,
    syncToDriveNow, isDriveSyncing, driveSyncStatus,
    isImpersonating, exitImpersonation
  } = useClassroom();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('13:13');
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  const viewInfo = VIEW_TITLES[currentView] || VIEW_TITLES.dashboard;

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

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Zone 1: Current Page Title & Subtitle Breadcrumb matching PDF */}
      <div className="flex flex-col justify-center min-w-0 pr-4">
        <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
          {viewInfo.title}
          {currentView !== 'dashboard' && currentView !== 'classes' && activeClass && (
            <span className="text-indigo-600 font-extrabold ml-1.5">
              {activeClass.name.trim().toLowerCase().startsWith('lớp') ? activeClass.name.trim() : `Lớp ${activeClass.name.trim()}`}
            </span>
          )}
        </h2>
        <p className="text-[11px] text-slate-500 font-medium leading-tight truncate hidden sm:block mt-0.5">
          {viewInfo.subtitle}
        </p>
      </div>

      {/* Zone 2: Status Pill, Class Selector, Profile & Quick Actions */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* If Admin is impersonating a class as teacher, show quick return button */}
        {isImpersonating && (
          <button
            onClick={() => {
              exitImpersonation();
              onNavigate('admin_stats');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500 text-xs font-black transition-all shadow-xs cursor-pointer hover:scale-105"
            title="Quay lại bảng quản lý số liệu toàn trường (Admin)"
          >
            <span>🔙</span>
            <span className="hidden sm:inline">Về Quản Trị</span>
          </button>
        )}

        {/* Role Badge & Switcher Button */}
        <button
          onClick={() => setRoleModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-black transition-all hover-zoom-btn cursor-pointer ${
            currentRole === 'admin'
              ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-xs'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
          title="Bấm để đổi vai trò Giáo viên / Quản lý số liệu hoặc đăng nhập Google"
        >
          {currentRole === 'admin' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Toàn Trường</span>
            </>
          ) : (
            <>
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>{teacherAccount?.displayName ? teacherAccount.displayName : 'Giáo Viên'}</span>
            </>
          )}
        </button>

        {/* Auto-save Status Pill matching PDF: "Đã lưu 13:13" */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 shadow-2xs hover-zoom-badge">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Đã lưu {currentTimeStr}</span>
        </div>

        {/* Class Selector Dropdown Pill matching PDF */}
        {currentRole === 'teacher' && (!teacherAccount?.assignedClassId || teacherAccount.assignedClassId === 'none') ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500 text-white font-bold text-xs shadow-md">
            <School className="w-3.5 h-3.5 text-white" />
            <span>Chưa phân công lớp (None)</span>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => {
                if (currentRole === 'admin' || isImpersonating) {
                  setIsClassDropdownOpen(!isClassDropdownOpen);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs md:text-sm shadow-md shadow-indigo-600/20 transition-all ${
                (currentRole === 'admin' || isImpersonating) ? 'hover:bg-indigo-700 hover-zoom-btn cursor-pointer' : 'cursor-default'
              }`}
              title={(currentRole === 'admin' || isImpersonating) ? 'Bấm để đổi lớp' : `Lớp phụ trách: ${activeClass?.name || '4A1'}`}
            >
              <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">
                <School className="w-3.5 h-3.5 text-white" />
              </div>
              <span>{activeClass?.name || 'Chưa chọn'}</span>
              <span className="text-[11px] text-indigo-200 font-semibold hidden sm:inline">
                {activeClass?.grade} • {currentClassStudents.length} HS
              </span>
              {(currentRole === 'admin' || isImpersonating) && (
                <ChevronDown className="w-3.5 h-3.5 text-indigo-200" />
              )}
            </button>

            {isClassDropdownOpen && (currentRole === 'admin' || isImpersonating) && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsClassDropdownOpen(false)}
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn Lớp Học (Admin)
                </div>
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setActiveClassId(cls.id);
                      setIsClassDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs md:text-sm text-left hover:bg-slate-50 transition-colors ${
                      cls.id === activeClassId ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: cls.color }}
                      />
                      <span className="font-extrabold">{cls.name}</span>
                      <span className="text-xs text-slate-400 font-normal">· {cls.grade}</span>
                    </div>
                    {cls.id === activeClassId && (
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                        Đang chọn
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
                    className="w-full text-left px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl transition-colors"
                  >
                    + Quản lý hoặc tạo lớp mới
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick AI Assistant Button */}
        <button
          onClick={() => onNavigate('ai')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-all border border-indigo-200/80 hover-zoom-btn shadow-2xs"
          title="Mở Trợ lý Sư phạm Trí tuệ Nhân tạo AI"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span className="hidden sm:inline">Trợ lý AI</span>
        </button>

        {/* Quick Alarm */}
        <button
          onClick={handleQuickAlarm}
          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl border border-rose-200 hover-zoom-btn shadow-2xs"
          title="Phát chuông ổn định trật tự lớp học ngay lập tức"
        >
          <ShieldAlert className="w-4 h-4 animate-pulse" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-colors hover-zoom-btn"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình giảng dạy'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Account Profile Pill with Dropdown Menu (User Request) */}
        <div className="relative" ref={accountMenuRef}>
          <button 
            type="button"
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className={`flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl transition-all border group hover-zoom-btn cursor-pointer ${
              isAccountMenuOpen 
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' 
                : 'hover:bg-slate-100/90 border-slate-200/80 bg-white'
            }`}
            title="Bấm để xem thông tin tài khoản, đăng nhập hoặc đăng xuất"
          >
            <div className="relative shrink-0">
              <img 
                src={teacherProfile.avatar} 
                alt={teacherProfile.name}
                className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover ring-2 ring-indigo-200 group-hover:ring-indigo-600 transition-all bg-slate-100 shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                currentRole === 'admin' ? 'bg-purple-600' : 'bg-emerald-500'
              }`} />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-black text-slate-800 leading-tight flex items-center gap-1">
                <span>{currentRole === 'admin' ? 'Quản Trị Viên (Admin)' : (teacherAccount?.displayName || teacherProfile.name)}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
              </div>
              <div className="text-[10px] text-slate-400 leading-none truncate max-w-[130px]">
                {currentRole === 'admin' ? 'Quản trị toàn trường' : (activeClass ? `GVCN Lớp ${activeClass.name}` : teacherProfile.role)}
              </div>
            </div>
          </button>

          {/* DROPDOWN MENU */}
          {isAccountMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5">
              {/* Account Header */}
              <div className="p-3 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/70 rounded-2xl border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <img
                    src={teacherProfile.avatar}
                    alt="User"
                    className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-300 shadow-xs bg-white shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {currentRole === 'admin' ? 'Quản Trị Viên (Admin)' : (teacherAccount?.displayName || teacherProfile.name)}
                    </div>
                    <div className="text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                      {currentRole === 'admin' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Quản trị toàn trường</span>
                        </>
                      ) : (
                        <>
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>GVCN Lớp {activeClass?.name || '4A1'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono bg-white/80 px-2 py-1 rounded-lg border border-slate-200/70 truncate">
                  Tài khoản: <strong className="text-slate-700">{teacherAccount?.username || (currentRole === 'admin' ? 'admin' : 'gv_4a1')}</strong>
                </div>
              </div>

              {/* Action Buttons List */}
              <div className="space-y-1 text-xs">
                {/* 1. NÚT ĐĂNG NHẬP / CHỌN TÀI KHOẢN KHÁC */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setRoleModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-indigo-700 hover:bg-indigo-50 font-black rounded-xl transition-colors cursor-pointer text-left"
                >
                  <LogIn className="w-4 h-4 text-indigo-600" />
                  <div className="flex-1">
                    <div>Đăng Nhập / Đổi Tài Khoản</div>
                    <div className="text-[10px] text-slate-400 font-normal">Đăng nhập tài khoản GV hoặc Quản trị viên</div>
                  </div>
                </button>

                {/* 2. CHUYỂN ĐỔI VAI TRÒ NHANH (GIÁO VIÊN <-> ADMIN) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    if (currentRole === 'admin') {
                      setCurrentRole('teacher');
                      onNavigate('dashboard');
                    } else {
                      setCurrentRole('admin');
                      onNavigate('admin_stats');
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-purple-700 hover:bg-purple-50 font-bold rounded-xl transition-colors cursor-pointer text-left"
                >
                  {currentRole === 'admin' ? (
                    <>
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <div className="flex-1">
                        <div className="font-black text-indigo-700">Chuyển Sang Vai Trò Giáo Viên</div>
                        <div className="text-[10px] text-slate-400 font-normal">Quản lý trực tiếp lớp {activeClass?.name}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <div className="flex-1">
                        <div className="font-black text-purple-700">Chuyển Sang Quản Trị Viên (Admin)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Xem số liệu toàn trường & tài khoản GV</div>
                      </div>
                    </>
                  )}
                </button>

                {/* 3. TẢI FILE DATA .JSON THEO VAI TRÒ */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    if (currentRole === 'admin') {
                      exportFullSystemJson();
                    } else {
                      exportBackupJson();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-slate-900 font-black">
                      {currentRole === 'admin' ? 'Tải Dữ Liệu .JSON Cả Trường' : `Tải Dữ Liệu .JSON Lớp ${activeClass?.name}`}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {currentRole === 'admin' ? 'Xuất toàn bộ các lớp & học sinh' : 'Chỉ xuất thông tin lớp của bạn'}
                    </div>
                  </div>
                </button>

                {/* 4. HỒ SƠ & CÀI ĐẶT */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    if (onOpenProfile) onOpenProfile();
                    else onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <div>Cài Đặt Hồ Sơ Giáo Viên</div>
                    <div className="text-[10px] text-slate-400 font-normal">Đổi ảnh thẻ, tên, trường công tác</div>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 5. NÚT ĐĂNG XUẤT */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsAccountMenuOpen(false);
                    await logoutRole();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 font-black rounded-xl transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <div className="flex-1">
                    <div>Đăng Xuất Khỏi Hệ Thống</div>
                    <div className="text-[10px] text-rose-400 font-normal">Thoát phiên làm việc hiện tại</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
