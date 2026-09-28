/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClassroomProvider, useClassroom } from './context/ClassroomContext';
import { TopBar } from './components/layout/TopBar';
import { Sidebar, NavigationMenuId } from './components/layout/Sidebar';

import { DashboardView } from './components/views/DashboardView';
import { ClassesStudentsView } from './components/views/ClassesStudentsView';
import { PointsAwardView } from './components/views/PointsAwardView';
import { RewardsShopView } from './components/views/RewardsShopView';
import { RandomStudentPickerView } from './components/views/RandomStudentPickerView';
import { LuckyWheelView } from './components/views/LuckyWheelView';
import { FilmReelView } from './components/views/FilmReelView';
import { TimerView } from './components/views/TimerView';
import { NoiseMeterView } from './components/views/NoiseMeterView';
import { SeatingChartView } from './components/views/SeatingChartView';
import { AttendanceView } from './components/views/AttendanceView';
import { ScheduleLinksView } from './components/views/ScheduleLinksView';
import { ReportsDataView } from './components/views/ReportsDataView';
import { InfographicView } from './components/views/InfographicView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { AdminSchoolDataView } from './components/views/AdminSchoolDataView';
import { RoleSelectionModal } from './components/modals/RoleSelectionModal';
import { AlertTriangle, Download, RefreshCw, X, ShieldAlert } from 'lucide-react';

function ClassroomApp() {
  const [currentView, setCurrentView] = useState<NavigationMenuId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { 
    currentRole, teacherAccount, isRoleModalOpen, setRoleModalOpen, 
    is30DayAlertDue, isAlertDismissed, dismiss30DayAlert, 
    resetMonthlyStatistics, exportFullSystemJson, daysIntoCycle,
    isImpersonating, adminImpersonateClass, exitImpersonation,
    activeClassId, classes
  } = useClassroom();

  const isTeacherUnassigned = currentRole === 'teacher' && (!teacherAccount?.assignedClassId || teacherAccount.assignedClassId === 'none');

  const renderUnassignedTeacherView = () => (
    <div className="p-8 max-w-2xl mx-auto my-auto text-center space-y-4 bg-white rounded-3xl border border-amber-200 shadow-md">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-3xl">
        🏫
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black text-slate-800">
          Chưa Phân Cấp Quản Lý Lớp Học
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          Tài khoản của bạn (<strong className="text-indigo-700 font-bold">{teacherAccount?.displayName || 'Giáo viên'}</strong>) hiện tại ở trạng thái <strong>Chưa phân công lớp (None)</strong>. Bạn chỉ có thể thao tác khi Quản trị viên phân quyền lớp phụ trách cho tài khoản của bạn.
        </p>
      </div>
      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-bold max-w-md mx-auto">
        👉 Vui lòng liên hệ Quản trị viên (Admin) để được gán lớp học hoặc bấm nút bên dưới để chuyển đổi tài khoản.
      </div>
      <div className="pt-2">
        <button
          onClick={() => setRoleModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer transition-transform hover:scale-105"
        >
          Đổi Tài Khoản / Đăng Nhập Lại
        </button>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    // Yêu cầu: Tài khoản giáo viên không có quyền quản lý số liệu
    if (currentView === 'admin_stats' && currentRole !== 'admin') {
      return (
        <DashboardView 
          onNavigate={setCurrentView} 
          onOpenAddStudent={() => setCurrentView('students')} 
        />
      );
    }

    // Yêu cầu: Nếu là giáo viên chưa phân công lớp (None), không hiển thị lớp học sinh
    if (isTeacherUnassigned && ['students', 'attendance', 'seating', 'schedule', 'infographic', 'rewards', 'picker', 'wheel', 'reel', 'reports'].includes(currentView)) {
      return renderUnassignedTeacherView();
    }

    switch (currentView) {
      case 'dashboard':
        if (currentRole === 'admin') {
          return <AdminSchoolDataView onNavigate={setCurrentView} />;
        }
        if (isTeacherUnassigned) {
          return renderUnassignedTeacherView();
        }
        return (
          <DashboardView 
            onNavigate={setCurrentView} 
            onOpenAddStudent={() => setCurrentView('students')} 
          />
        );
      case 'admin_stats':
        return <AdminSchoolDataView onNavigate={setCurrentView} />;
      case 'classes':
        return <ClassesStudentsView mode="classes" onNavigate={setCurrentView} />;
      case 'students':
        return <ClassesStudentsView mode="students" onNavigate={setCurrentView} />;
      case 'attendance':
        return <AttendanceView />;
      case 'seating':
        return <SeatingChartView onNavigate={setCurrentView} />;
      case 'schedule':
        return <ScheduleLinksView defaultTab="schedule" />;
      case 'infographic':
        return <InfographicView onNavigate={setCurrentView} />;
      case 'rewards':
        return <RewardsShopView />;
      case 'picker':
        return <RandomStudentPickerView initialGame="quick" />;
      case 'wheel':
        return <RandomStudentPickerView initialGame="wheel" />;
      case 'reel':
        return <RandomStudentPickerView initialGame="reel" />;
      case 'noise':
        return <NoiseMeterView />;
      case 'timer':
        return <TimerView />;
      case 'links':
        return <ScheduleLinksView defaultTab="links" />;
      case 'reports':
        return <ReportsDataView defaultTab="stats" />;
      case 'data':
        return <ReportsDataView defaultTab="data" />;
      case 'settings':
        return <ReportsDataView defaultTab="profile" />;
      case 'ai':
        return <AiAssistantView />;
      default:
        return (
          <DashboardView 
            onNavigate={setCurrentView} 
            onOpenAddStudent={() => setCurrentView('students')} 
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Exact Sidebar matching PDF navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header matching PDF */}
        <TopBar
          currentView={currentView}
          onNavigate={setCurrentView}
          onOpenQuickNoise={() => setCurrentView('noise')}
          onOpenProfile={() => setCurrentView('settings')}
        />

        {/* Admin Impersonation Banner: Chuyển đổi sang và xem thông tin từng lớp với vai trò giáo viên và ngược lại */}
        {isImpersonating && (
          <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs z-30 shrink-0 border-b border-purple-600/40 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded-xl bg-white/20 text-yellow-300 font-bold shrink-0">
                👁️
              </span>
              <div className="truncate">
                <span className="font-extrabold uppercase tracking-wide text-purple-200 text-[11px]">
                  QUYỀN QUẢN TRỊ VIÊN:
                </span>{' '}
                <span className="font-bold">
                  Bạn đang xem và làm việc với lớp{' '}
                  <strong className="text-yellow-300 font-black text-sm">
                    {classes.find(c => c.id === activeClassId)?.name || '4A1'}
                  </strong>{' '}
                  dưới vai trò Giáo viên
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Quick class switch for admin */}
              <div className="flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-xl border border-white/25">
                <span className="text-[11px] text-purple-200 font-semibold hidden sm:inline">Đổi lớp:</span>
                <select
                  value={activeClassId}
                  onChange={(e) => adminImpersonateClass(e.target.value)}
                  className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id} className="text-slate-800">
                      Lớp {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Return to Admin Button */}
              <button
                onClick={() => {
                  exitImpersonation();
                  setCurrentView('admin_stats');
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 font-black rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔙</span>
                <span>Quay Lại Quản Trị (Admin)</span>
              </button>
            </div>
          </div>
        )}

        {/* 30-Day Cycle Alert Sticky Banner */}
        {is30DayAlertDue && !isAlertDismissed && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-bold gap-3 z-20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded-lg bg-white/20 text-white shrink-0">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
              </span>
              <span className="truncate">
                <strong>Cảnh báo chu kỳ 30 ngày (Đã qua {daysIntoCycle} ngày):</strong> Vui lòng sao lưu file .JSON toàn bộ hệ thống về máy và bấm làm mới thống kê cho tháng mới (Bảo lưu toàn bộ dữ liệu lớp, học sinh và điểm xu thi đua).
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportFullSystemJson}
                className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-900 rounded-xl font-black text-[11px] shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                title="Tải tệp JSON sao lưu về máy tính"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File .JSON</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn làm mới thống kê cho tháng mới? (Toàn bộ danh sách lớp, học sinh, điểm xu và phần thưởng vẫn được giữ nguyên vẹn 100%)')) {
                    resetMonthlyStatistics();
                  }
                }}
                className="px-3 py-1 bg-amber-950/40 hover:bg-amber-950/60 text-white border border-white/30 rounded-xl font-black text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Đặt lại thống kê tháng mới mà không làm mất dữ liệu"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm Mới Tháng Mới</span>
              </button>

              <button
                onClick={dismiss30DayAlert}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/70">
          {renderCurrentView()}
        </main>
      </div>

      {/* Role Selection Modal (Giáo viên / Quản lý số liệu) */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        canClose={!!currentRole}
      />
    </div>
  );
}

export default function App() {
  return (
    <ClassroomProvider>
      <ClassroomApp />
    </ClassroomProvider>
  );
}
