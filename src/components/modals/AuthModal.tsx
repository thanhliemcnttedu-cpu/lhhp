import React, { useState } from 'react';
import { 
  X, Lock, User, Eye, EyeOff, 
  CheckCircle2, AlertCircle, LogIn
} from 'lucide-react';
import { UserAccount } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await onLogin(username.trim(), password);
      if (res.success) {
        setSuccessMessage('Đăng nhập thành công! Đang tải dữ liệu...');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-6 text-white relative">
          {currentUser && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Lock className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">
                Đăng Nhập Tài Khoản
              </h3>
              <p className="text-xs text-indigo-100 font-medium mt-0.5">
                Cơ sở dữ liệu độc lập lưu trực tuyến & chạy trên GitHub Server
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: admin, gvcn4a1, gvbm01..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Đang xử lý đăng nhập...' : 'ĐĂNG NHẬP VÀO HỆ THỐNG'}
            </button>
          </form>

          {/* Database & Sync Note */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-3.5 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">💾 Cơ chế lưu trữ trực tuyến:</span> Mỗi tài khoản giáo viên có một cơ sở dữ liệu riêng biệt. Khi bạn thêm học sinh, cho điểm, đổi quà hay sửa TKB, mọi dữ liệu được tự động lưu lên máy chủ và lưu trữ tại file <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">data/classroom_database.json</code>, đảm bảo đồng bộ 100% khi đóng trình duyệt mở lại hoặc đồng bộ lên GitHub Server.
          </div>
        </div>
      </div>
    </div>
  );
};
