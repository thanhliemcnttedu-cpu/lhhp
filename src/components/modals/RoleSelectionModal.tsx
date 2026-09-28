/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { googleSignIn } from '../../services/googleDriveService';
import { 
  GraduationCap, ShieldCheck, Lock, UserCheck, 
  ArrowRight, Sparkles, FolderSync, AlertCircle, CheckCircle2, User, KeyRound, ChevronDown, School
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ 
  isOpen, 
  onClose,
  canClose = false 
}) => {
  const { 
    currentRole, loginAsTeacher, loginTeacherWithCredentials, loginAsAdmin, 
    teacherAccount, adminAccount, setRoleModalOpen, registeredTeachers, classes
  } = useClassroom();

  const [selectedRoleTab, setSelectedRoleTab] = useState<'teacher' | 'admin'>('teacher');
  const [teacherUsername, setTeacherUsername] = useState('gv_4a1');
  const [teacherPassword, setTeacherPassword] = useState('123456');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleOAuthOption, setShowGoogleOAuthOption] = useState(false);

  if (!isOpen) return null;

  const handleTeacherCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = loginTeacherWithCredentials(teacherUsername, teacherPassword);
    if (res.success) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      if (onClose) onClose();
    } else {
      setLoginError(res.message || 'Tên đăng nhập hoặc mật khẩu giáo viên không chính xác!');
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result && result.user) {
        await loginAsTeacher(result.user, result.accessToken);
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error(err);
      // Detailed user-friendly guide if Google OAuth is blocked
      if (err.message && (err.message.includes('access_denied') || err.message.includes('chưa hoàn tất quy trình xác minh'))) {
        setLoginError('Google đang chặn đăng nhập OAuth do miền ứng dụng chưa xác minh. Vui lòng đăng nhập bằng Tên đăng nhập và Mật khẩu được Quản trị viên cấp ở phía trên.');
      } else {
        setLoginError(err.message || 'Đăng nhập Google không thành công. Bạn hãy sử dụng Tên đăng nhập và Mật khẩu giáo viên ở trên.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const res = loginAsAdmin(adminUsername, adminPassword);
    if (res.success) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      if (onClose) onClose();
    } else {
      setLoginError(res.message || 'Mật khẩu quản trị viên không chính xác!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-xl w-full p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Glow Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 text-indigo-700 font-black text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>HỆ THỐNG QUẢN LÝ LỚP HỌC HẠNH PHÚC</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Chọn Vai Trò Truy Cập
          </h2>
          <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">
            Vui lòng lựa chọn vai trò sử dụng là <strong className="text-indigo-600">Giáo viên</strong> hoặc <strong className="text-purple-600">Quản lý số liệu</strong> để bắt đầu làm việc.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => { setSelectedRoleTab('teacher'); setLoginError(null); }}
            className={`py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedRoleTab === 'teacher'
                ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-600/15'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>I. Vai Trò Giáo Viên</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRoleTab('admin'); setLoginError(null); }}
            className={`py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedRoleTab === 'admin'
                ? 'bg-white text-purple-700 shadow-sm shadow-purple-600/15'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>II. Quản Lý Số Liệu</span>
          </button>
        </div>

        {/* Error Notification */}
        {loginError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{loginError}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: GIÁO VIÊN (ĐĂNG NHẬP USERNAME & PASSWORD DO ADMIN CẤP) */}
        {/* =================================================================== */}
        {selectedRoleTab === 'teacher' && (
          <div className="space-y-4 pt-1">
            <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 p-4 rounded-2xl border border-indigo-100 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                  <KeyRound className="w-4 h-4 text-amber-300" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-black text-indigo-950 text-sm">
                    Đăng Nhập Tài Khoản Giáo Viên
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Sử dụng <strong>Tên đăng nhập (Username)</strong> và <strong>Mật khẩu</strong> do Quản trị viên (Admin) tạo và cấp cho lớp của bạn.
                  </p>
                </div>
              </div>
            </div>

            {/* Form đăng nhập Username & Password */}
            <form onSubmit={handleTeacherCredentialsSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tên đăng nhập giáo viên (Username) *</span>
                </label>
                <input
                  type="text"
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  placeholder="Ví dụ: gv_4a1 hoặc gv_liem..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mật khẩu giáo viên *</span>
                </label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Mật khẩu mặc định hệ thống: <strong className="font-mono text-indigo-700">123456</strong>
                </span>
              </div>

              {/* Quick Select Pre-configured Teacher Credentials */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Chọn nhanh tài khoản mẫu:</span>
                  </span>
                  <span className="text-[10px] text-slate-400">MK: 123456</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {registeredTeachers.filter(t => t.status === 'approved').slice(0, 3).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTeacherUsername(t.username || 'gv_4a1');
                        setTeacherPassword(t.password || '123456');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer border ${
                        teacherUsername === t.username
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200'
                      }`}
                    >
                      {t.displayName} ({t.assignedClassName ? t.assignedClassName.split(' ')[0] : '4A1'})
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Đăng Nhập Vào Lớp Học</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Optional Collapsible Google OAuth Sign-in */}
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGoogleOAuthOption(!showGoogleOAuthOption)}
                className="w-full py-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Hoặc đăng nhập bằng Google OAuth</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGoogleOAuthOption ? 'rotate-180' : ''}`} />
              </button>

              {showGoogleOAuthOption && (
                <div className="mt-2 space-y-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 animate-in fade-in duration-150">
                  <p className="text-[10px] text-amber-800 leading-relaxed">
                    <strong>Lưu ý:</strong> Nếu tài khoản Google báo lỗi <em>"403: access_denied / chưa hoàn tất quy trình xác minh"</em>, hãy sử dụng Tên đăng nhập và Mật khẩu ở trên để vào ngay.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 text-xs"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>{isGoogleLoading ? 'Đang kết nối...' : 'Thử đăng nhập Google'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick continue if already has teacher account */}
            {teacherAccount && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-600 font-bold">
                    Đang đăng nhập: <strong>{teacherAccount.displayName}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRoleModalOpen(false);
                    if (onClose) onClose();
                  }}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl cursor-pointer"
                >
                  Vào lớp ngay ➔
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: QUẢN LÝ SỐ LIỆU (admin / Tanuyen@2026) */}
        {/* =================================================================== */}
        {selectedRoleTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4 pt-1">
            <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs space-y-1 text-purple-950">
              <div className="font-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Bảng Quản Trị Số Liệu Toàn Trường & Thống Kê</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Tài khoản quản lý sở hữu thư mục <code className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded font-mono">THƯ MỤC QUẢN TRỊ</code>, xem tổng quan tất cả các lớp, khối, biểu đồ tròn/cột/đường, chuyên cần, bán trú, so sánh sự tiến bộ và top 5 học sinh xuất sắc.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tài khoản quản lý *
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                <span>Mật khẩu bảo mật *</span>
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Nhập mật khẩu quản trị..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500"
                required
                autoFocus
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Mật khẩu quản trị mặc định: <strong className="font-mono text-purple-700">Tanuyen@2026</strong>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Đăng Nhập Quản Lý Số Liệu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer close button if already logged in */}
        {canClose && (
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Đóng cửa sổ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
