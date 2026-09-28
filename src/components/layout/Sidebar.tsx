import React from 'react';
import { 
  LayoutDashboard, School, Users, CheckSquare, 
  Grid3X3, Calendar, Gift, Sparkles, Film, 
  Volume2, Timer, Link, BarChart3, Database, 
  Settings, Brain, ChevronLeft, ChevronRight, BookOpen,
  Building2, ShieldCheck, GraduationCap, FolderSync, RefreshCw
} from 'lucide-react';
import { useClassroom } from '../../context/ClassroomContext';
import { APP_AUTHOR_INFO } from '../../data/initialData';

export type NavigationMenuId = 
  | 'dashboard'
  | 'admin_stats'
  | 'classes'
  | 'students'
  | 'attendance'
  | 'seating'
  | 'schedule'
  | 'infographic'
  | 'rewards'
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
  onToggleCollapse
}) => {
  const { 
    currentClassStudents, teacherProfile, currentRole, 
    teacherAccount, adminAccount, setRoleModalOpen, logoutRole 
  } = useClassroom();

  const ALL_MENU_ITEMS: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Trang chủ',
      icon: LayoutDashboard,
    },
    {
      id: 'admin_stats',
      label: 'Quản lý số liệu',
      icon: Building2,
      badge: 'ADMIN',
      badgeType: 'hot'
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
      badge: currentClassStudents.length.toString(),
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
      label: 'Thời khóa biểu',
      icon: Calendar,
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
      id: 'picker',
      label: 'Gọi tên học sinh',
      icon: Sparkles,
      badge: '5 GAME',
      badgeType: 'hot'
    },
    {
      id: 'noise',
      label: 'Chống Ồn',
      icon: Volume2,
    },
    {
      id: 'timer',
      label: 'Đếm Ngược',
      icon: Timer,
    },
    {
      id: 'links',
      label: 'Liên kết',
      icon: Link,
    },
    {
      id: 'reports',
      label: 'Thống kê',
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

  // Yêu cầu: Tài khoản đăng nhập giáo viên sẽ không có menu mục Quản lý số liệu (Chức năng này chỉ dành cho admin)
  const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => {
    if (item.id === 'admin_stats') {
      return currentRole === 'admin';
    }
    return true;
  });

  return (
    <aside 
      className={`bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 z-40 relative select-none shrink-0 ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Brand Header: LỚP HỌC HẠNH PHÚC (Yêu cầu 6) */}
      <div className="h-16 border-b border-slate-200/80 flex items-center px-4 justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs shrink-0 hover-zoom-interactive">
              <BookOpen className="w-5 h-5 text-amber-950" />
            </div>
            <div className="truncate">
              <h1 className="text-xs font-black text-indigo-900 tracking-tight leading-tight truncate flex items-center gap-1 uppercase">
                LỚP HỌC HẠNH PHÚC
              </h1>
              <p className="text-[10px] text-indigo-600 font-semibold leading-none mt-0.5">
                Hệ sinh thái thông minh
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs hover-zoom-interactive">
              <BookOpen className="w-5 h-5 text-amber-950" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto hover-zoom-btn"
          title={collapsed ? 'Mở rộng bảng điều khiển' : 'Thu gọn bảng điều khiển'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left transition-all group hover-zoom-btn ${
                isActive 
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25' 
                  : item.badgeType === 'ai'
                  ? 'bg-gradient-to-r from-indigo-50/80 to-purple-50/80 text-indigo-900 hover:from-indigo-100 hover:to-purple-100 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className={`p-1.5 rounded-xl shrink-0 transition-colors ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : item.badgeType === 'ai'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              {!collapsed && (
                <div className="truncate flex-1 flex items-center justify-between">
                  <span className="text-xs tracking-tight truncate leading-tight font-semibold">
                    {item.label}
                  </span>

                  {/* Badges matching screenshot */}
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ml-1.5 ${
                      isActive 
                        ? 'bg-white/25 text-white'
                        : item.badgeType === 'hot'
                        ? 'bg-rose-100 text-rose-600'
                        : item.badgeType === 'new'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.badgeType === 'ai'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-blue-100 text-blue-700'
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

      {/* Role Indicator & Switcher Card */}
      {!collapsed && (
        <div className="px-2.5 pb-2">
          <div className={`p-2.5 rounded-2xl border text-left transition-all ${
            currentRole === 'admin'
              ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
              : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {currentRole === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  {currentRole === 'admin' ? 'Quản Lý Số Liệu' : 'Tài Khoản GV'}
                </span>
              </div>
              <button
                onClick={() => setRoleModalOpen(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:underline cursor-pointer"
                title="Chuyển đổi vai trò Giáo viên / Quản lý số liệu"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Đổi vai trò</span>
              </button>
            </div>
            
            <div className="mt-1 text-[11px] font-extrabold text-slate-800 truncate">
              {currentRole === 'admin' 
                ? 'admin (Toàn Trường)' 
                : (teacherAccount?.displayName || teacherProfile.name || 'Chưa đăng nhập')}
            </div>

            {teacherAccount?.email && currentRole === 'teacher' && (
              <div className="text-[10px] text-slate-500 font-mono truncate">
                {teacherAccount.email}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Author Footer: CỐ ĐỊNH THEO YÊU CẦU 5 - KHÔNG LẤY TỪ CÀI ĐẶT */}
      {!collapsed && (
        <div className="p-3 mx-2.5 mb-2.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-sky-50/80 to-blue-50/80 border border-indigo-200/80 text-left hover-zoom-interactive shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
              TÁC GIẢ ỨNG DỤNG
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 text-[9px] font-black">
              Cố định
            </span>
          </div>
          <div className="text-xs font-black text-indigo-950 mt-1">
            {APP_AUTHOR_INFO.name}
          </div>
          <div className="text-[11px] text-slate-700 font-semibold mt-0.5">
            {APP_AUTHOR_INFO.schoolName}
          </div>
          <div className="text-[11px] text-blue-700 font-bold mt-2 flex items-center justify-between pt-1.5 border-t border-indigo-100/90">
            <span className="text-slate-600 font-medium">Zalo hỗ trợ:</span>
            <a 
              href={APP_AUTHOR_INFO.zaloUrl} 
              target="_blank" 
              rel="noreferrer"
              className="font-mono bg-white hover:bg-blue-50 px-2 py-0.5 rounded-md text-blue-700 font-black shadow-2xs border border-blue-200 transition-colors"
            >
              {APP_AUTHOR_INFO.zalo}
            </a>
          </div>
          <div className="text-[11px] text-blue-700 font-bold mt-1.5 flex items-center justify-between">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">f</span>
              <span>Facebook:</span>
            </span>
            <a 
              href={APP_AUTHOR_INFO.facebook} 
              target="_blank" 
              rel="noreferrer"
              className="bg-white hover:bg-blue-50 px-2 py-0.5 rounded-md text-blue-700 font-black shadow-2xs border border-blue-200 transition-colors text-[10px]"
            >
              Xem trang
            </a>
          </div>
        </div>
      )}
    </aside>
  );
};
