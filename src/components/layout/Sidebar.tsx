import React from 'react';
import { 
  LayoutDashboard, School, Users, CheckSquare, 
  Grid3X3, Calendar, Gift, Sparkles, Film, 
  Volume2, Timer, Link, BarChart3, Database, 
  Settings, Brain, ChevronLeft, ChevronRight, BookOpen,
  ShieldCheck, LogIn, UserCheck, X, Award
} from 'lucide-react';
import { useClassroom } from '../../context/ClassroomContext';
import { APP_AUTHOR_INFO } from '../../data/initialData';

export type NavigationMenuId = 
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'attendance'
  | 'seating'
  | 'schedule'
  | 'infographic'
  | 'rewards'
  | 'certificate'
  | 'picker'
  | 'wheel'
  | 'reel'
  | 'noise'
  | 'timer'
  | 'links'
  | 'reports'
  | 'data'
  | 'settings'
  | 'ai';

interface SidebarProps {
  currentView: NavigationMenuId;
  onNavigate: (view: NavigationMenuId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: NavigationMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: 'hot' | 'new' | 'count' | 'ai';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { 
    currentClassStudents, teacherProfile, teacherRole, setTeacherRole, 
    subjectTeacherConfig, currentUser, isAdmin, canManageAccounts,
    setIsAuthModalOpen, setIsAccountManagerOpen, setIsRegistrationModalOpen 
  } = useClassroom();

  const ALL_MENU_ITEMS: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Trang chủ',
      icon: LayoutDashboard,
    },
    {
      id: 'classes',
      label: 'Lớp học',
      icon: School,
    },
    {
      id: 'students',
      label: 'Học sinh',
      icon: Users,
      badge: currentClassStudents.length > 0 ? currentClassStudents.length.toString() : '30',
      badgeType: 'count'
    },
    {
      id: 'attendance',
      label: 'Điểm danh',
      icon: CheckSquare,
    },
    {
      id: 'seating',
      label: 'Sơ đồ lớp',
      icon: Grid3X3,
    },
    {
      id: 'schedule',
      label: teacherRole === 'subject' ? 'TKB Bộ môn' : 'Thời khóa biểu',
      icon: Calendar,
      badge: teacherRole === 'subject' ? 'BỘ MÔN' : undefined,
      badgeType: 'hot'
    },
    {
      id: 'infographic',
      label: 'Infographic Lớp',
      icon: Sparkles,
      badge: 'A4 PDF',
      badgeType: 'hot'
    },
    {
      id: 'rewards',
      label: 'Đổi quà',
      icon: Gift,
      badge: 'HOT',
      badgeType: 'hot'
    },
    {
      id: 'certificate',
      label: 'Tạo thư khen',
      icon: Award,
      badge: 'NEW',
      badgeType: 'new'
    },
    {
      id: 'picker',
      label: 'Gọi tên học sinh',
      icon: Sparkles,
      badge: '6 GAME',
      badgeType: 'hot'
    },
    {
      id: 'noise',
      label: 'Chống ồn',
      icon: Volume2,
    },
    {
      id: 'timer',
      label: 'Đếm ngược',
      icon: Timer,
    },
    {
      id: 'links',
      label: 'Liên kết',
      icon: Link,
    },
    {
      id: 'reports',
      label: teacherRole === 'subject' ? 'Thống kê Bộ môn' : 'Thống kê',
      icon: BarChart3,
    },
    {
      id: 'data',
      label: 'Dữ liệu',
      icon: Database,
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      icon: Settings,
    },
    {
      id: 'ai',
      label: 'Trợ lý AI',
      icon: Brain,
      badge: 'AI',
      badgeType: 'ai'
    }
  ];

  // User requirement: Nếu chọn là giáo viên bộ môn sẽ không có các menu chức năng: ĐIỂM DANH, INFOGRAPHIC, SƠ ĐỒ LỚP
  const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => {
    if (teacherRole === 'subject') {
      if (item.id === 'attendance' || item.id === 'seating' || item.id === 'infographic') {
        return false;
      }
    }
    return true;
  });

  const renderSidebarContent = (isMobileDrawer = false) => {
    const isEffectivelyCollapsed = isMobileDrawer ? false : collapsed;
    const handleItemClick = (id: NavigationMenuId) => {
      onNavigate(id);
      if (isMobileDrawer && onCloseMobile) {
        onCloseMobile();
      }
    };

    return (
      <div className="flex flex-col h-full overflow-hidden select-none">
        {/* Brand Header: LỚP HỌC HẠNH PHÚC (Yêu cầu 6) */}
        <div className="h-13 border-b border-slate-200/80 flex items-center px-3 justify-between shrink-0">
          {!isEffectivelyCollapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs shrink-0 hover-zoom-interactive">
                <BookOpen className="w-4 h-4 text-amber-950" />
              </div>
              <div className="truncate">
                <h1 className="text-[11px] font-black text-indigo-900 tracking-tight leading-tight truncate flex items-center gap-1 uppercase">
                  LỚP HỌC HẠNH PHÚC
                </h1>
                <p className="text-[9.5px] text-indigo-600 font-semibold leading-none mt-0.5">
                  Hệ sinh thái thông minh
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs hover-zoom-interactive">
                <BookOpen className="w-4 h-4 text-amber-950" />
              </div>
            </div>
          )}

          {isMobileDrawer ? (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto hover-zoom-btn"
              title="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto hover-zoom-btn"
              title={collapsed ? 'Mở rộng bảng điều khiển' : 'Thu gọn bảng điều khiển'}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Role Selection Switcher (User requirement: Chọn vai trò GVCN hay GVBM) */}
        {!isEffectivelyCollapsed ? (
          <div className="px-2.5 pt-2 pb-0.5 shrink-0">
            <div className="p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/80 flex items-center gap-1">
              <button
                onClick={() => setTeacherRole('homeroom')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[9.5px] font-black tracking-tight transition-all flex items-center justify-center gap-1 uppercase ${
                  teacherRole === 'homeroom'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Chế độ Giáo viên chủ nhiệm: Đầy đủ điểm danh, sơ đồ lớp 3D, infographic"
              >
                <span>🏫</span>
                <span>GVCN</span>
              </button>
              <button
                onClick={() => {
                  setTeacherRole('subject');
                  if (currentView === 'attendance' || currentView === 'seating' || currentView === 'infographic') {
                    onNavigate('dashboard');
                  }
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[9.5px] font-black tracking-tight transition-all flex items-center justify-center gap-1 uppercase ${
                  teacherRole === 'subject'
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Chế độ Giáo viên bộ môn: Quản lý lớp dạy bộ môn, TKB bộ môn theo mẫu, chấm sao thi đua"
              >
                <span>💻</span>
                <span>GV BỘ MÔN</span>
              </button>
            </div>
            {teacherRole === 'subject' && (
              <div className="mt-0.5 text-center">
                <span className="inline-block px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[8.5px] font-black uppercase tracking-wider">
                  Môn: {subjectTeacherConfig.subjectName}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-1.5 flex justify-center shrink-0">
            <button
              onClick={() => {
                const nextRole = teacherRole === 'homeroom' ? 'subject' : 'homeroom';
                setTeacherRole(nextRole);
                if (nextRole === 'subject' && (currentView === 'attendance' || currentView === 'seating' || currentView === 'infographic')) {
                  onNavigate('dashboard');
                }
              }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shadow-2xs hover-zoom-btn ${
                teacherRole === 'subject' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
              }`}
              title={`Đang là ${teacherRole === 'subject' ? 'GV Bộ môn' : 'GV Chủ nhiệm'}. Nhấn để đổi vai trò.`}
            >
              {teacherRole === 'subject' ? 'BM' : 'CN'}
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 scrollbar-thin">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left normal-case sidebar-nav-item sidebar-float-item group select-none transition-all duration-200 ${
                  isActive 
                    ? 'sidebar-active bg-[#4f46e5] text-white font-bold border-2 border-slate-950 shadow-[0_8px_20px_-3px_rgba(79,70,229,0.38)]' 
                    : item.badgeType === 'ai'
                    ? 'bg-gradient-to-r from-indigo-50/70 to-purple-50/70 text-indigo-950 font-semibold border border-indigo-100/60 hover:bg-white hover:border-slate-200/80 hover:text-slate-950'
                    : 'text-slate-700 font-semibold border border-transparent hover:border-slate-200/80 hover:bg-white hover:text-slate-950'
                }`}
                title={isEffectivelyCollapsed ? item.label : undefined}
              >
                <div className={`p-1.5 rounded-xl shrink-0 transition-all duration-200 flex items-center justify-center ${
                  isActive 
                    ? 'bg-white/20 text-white shadow-2xs' 
                    : item.badgeType === 'ai'
                    ? 'bg-indigo-600 text-white group-hover:scale-110 shadow-xs shadow-indigo-600/20'
                    : 'text-slate-500 group-hover:text-indigo-600 group-hover:scale-110'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {!isEffectivelyCollapsed && (
                  <div className="truncate flex-1 flex items-center justify-between">
                    <span className={`text-[13px] tracking-tight truncate leading-tight normal-case ${
                      isActive ? 'font-bold text-white' : 'font-semibold text-slate-700 group-hover:text-slate-950'
                    }`}>
                      {item.label}
                    </span>

                    {/* Badges matching screenshot exactly */}
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0 ml-1.5 transition-transform duration-200 group-hover:scale-105 ${
                        isActive 
                          ? 'bg-white/25 text-white backdrop-blur-xs font-bold'
                          : item.badgeType === 'count'
                          ? 'bg-blue-100 text-blue-700 shadow-2xs font-bold'
                          : item.badgeType === 'hot'
                          ? 'bg-rose-100 text-rose-600 shadow-2xs font-bold'
                          : item.badgeType === 'new'
                          ? 'bg-emerald-100 text-emerald-700 shadow-2xs font-bold'
                          : item.badgeType === 'ai'
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20 font-bold'
                          : 'bg-rose-100 text-rose-600 shadow-2xs font-bold'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Quick Action Button: Chỉ hiển thị cho Quản trị viên nhà trường hoặc Quản trị tối cao (BGH không có chức năng này) */}
        {!isEffectivelyCollapsed && canManageAccounts && (
          <div className="px-2 mb-1.5 shrink-0">
            <button
              onClick={() => {
                setIsAccountManagerOpen(true);
                if (isMobileDrawer && onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 transition-colors shadow-2xs group"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black uppercase tracking-tight leading-tight">QUẢN TRỊ ADMIN</div>
                  <div className="text-[9px] text-rose-600 font-bold leading-tight">Tài khoản & DB</div>
                </div>
              </div>
              <span className="text-[8.5px] font-black uppercase bg-rose-200 text-rose-800 px-1 py-0.2 rounded">SUPER</span>
            </button>
          </div>
        )}

        {/* User Account Card */}
        {!isEffectivelyCollapsed && (
          <div className="px-2 mb-1.5 shrink-0">
            <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <img 
                  src={currentUser?.avatar || teacherProfile.avatar} 
                  alt={currentUser?.fullName || teacherProfile.name}
                  className="w-6 h-6 rounded-full border border-slate-200 object-cover bg-white shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[10.5px] font-black text-slate-800 truncate leading-tight">
                    {currentUser?.fullName || teacherProfile.name}
                  </div>
                  <div className="text-[8.5px] font-bold text-slate-400 truncate leading-tight">
                    {currentUser?.role === 'admin' 
                      ? 'Quản trị Tối cao' 
                      : (currentUser?.role === 'bgh' || currentUser?.isBgh)
                      ? 'Ban Giám Hiệu'
                      : (currentUser?.role === 'school_admin' || currentUser?.isSchoolAdmin)
                      ? 'Quản trị Nhà trường'
                      : (currentUser?.role === 'guest_admin' || currentUser?.isGuestAdmin)
                      ? 'Quản trị GV Cá nhân'
                      : currentUser?.role === 'homeroom' 
                      ? 'GVCN Lớp ' + (currentUser?.assignedClassName || '4A1') 
                      : 'GVBM ' + (currentUser?.subjectName || 'Tin học')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAuthModalOpen(true);
                  if (isMobileDrawer && onCloseMobile) onCloseMobile();
                }}
                className="p-1 rounded-lg hover:bg-white text-indigo-600 border border-transparent hover:border-slate-200 transition-colors shrink-0"
                title="Đổi tài khoản đăng nhập"
              >
                <LogIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Nút Đăng Ký Sử Dụng Bản Quyền */}
        <div className="px-2 mb-1.5 shrink-0">
          {!isEffectivelyCollapsed ? (
            <button
              onClick={() => {
                setIsRegistrationModalOpen(true);
                if (isMobileDrawer && onCloseMobile) onCloseMobile();
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-[10.5px] uppercase tracking-wide shadow-xs hover:shadow-md hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer"
              title="Đăng ký sử dụng bản quyền phần mềm Lớp Học Hạnh Phúc"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
              <span>ĐĂNG KÝ SỬ DỤNG</span>
            </button>
          ) : (
            <button
              onClick={() => setIsRegistrationModalOpen(true)}
              className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Đăng ký sử dụng bản quyền"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
            </button>
          )}
        </div>

        {/* Author Footer: CỐ ĐỊNH THEO YÊU CẦU 6 - KHÔNG LẤY TỪ CÀI ĐẶT */}
        {!isEffectivelyCollapsed && (
          <div className={`p-1.5 mx-2 rounded-xl bg-gradient-to-br from-indigo-50/90 via-sky-50/80 to-blue-50/80 border border-indigo-200/80 text-left hover-zoom-interactive shadow-xs shrink-0 ${
            isMobileDrawer ? 'mb-10' : 'mb-1.5'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-black text-indigo-700 uppercase tracking-wider">
                TÁC GIẢ ỨNG DỤNG
              </span>
              <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[8px] font-black uppercase">
                CỐ ĐỊNH
              </span>
            </div>
            <div className="text-[10px] font-black text-indigo-950 mt-0.5 uppercase leading-tight truncate">
              {APP_AUTHOR_INFO.name}
            </div>
            <div className="text-[9px] text-slate-700 font-bold uppercase leading-tight truncate">
              {APP_AUTHOR_INFO.schoolName}
            </div>
            <div className="text-[9px] text-blue-700 font-bold mt-1 flex items-center justify-between pt-0.5 border-t border-indigo-100/90">
              <span className="text-slate-600 font-bold uppercase text-[8.5px]">ZALO HỖ TRỢ:</span>
              <a 
                href={APP_AUTHOR_INFO.zaloUrl} 
                target="_blank" 
                rel="noreferrer"
                className="font-mono bg-white hover:bg-blue-50 px-1.5 py-0.2 rounded text-blue-700 font-black shadow-2xs border border-blue-200 transition-colors text-[9px]"
              >
                {APP_AUTHOR_INFO.zalo}
              </a>
            </div>
            <div className="text-[9px] text-blue-700 font-bold mt-0.5 flex items-center justify-between">
              <span className="text-slate-600 font-bold uppercase text-[8.5px] flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[7px] font-black">f</span>
                <span>FACEBOOK:</span>
              </span>
              <a 
                href={APP_AUTHOR_INFO.facebook} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-white hover:bg-blue-50 px-1.5 py-0.2 rounded text-blue-700 font-black shadow-2xs border border-blue-200 transition-colors text-[8.5px] uppercase font-bold"
              >
                XEM TRANG
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden lg:flex h-full max-h-screen overflow-hidden bg-[#f8fafc]/90 border-r border-slate-200/90 flex-col transition-all duration-300 z-40 relative select-none shrink-0 ${
          collapsed ? 'w-20' : 'w-60'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
            onClick={onCloseMobile} 
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-left duration-250 select-none">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
