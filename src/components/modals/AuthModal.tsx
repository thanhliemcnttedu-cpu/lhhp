import React, { useState, useEffect } from 'react';
import { 
  X, Lock, User, Eye, EyeOff, 
  CheckCircle2, AlertCircle, LogIn, Sparkles,
  School, ShieldCheck, UserCheck, Crown, Users,
  ArrowRight, Phone, Globe, ChevronDown, ChevronUp
} from 'lucide-react';
import { UserAccount, LoginRoleScope, SchoolEntity } from '../../types';
import { useClassroom } from '../../context/ClassroomContext';
import { databaseService } from '../../services/databaseService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (username: string, password: string, selectedRoleScope?: LoginRoleScope, selectedSchoolName?: string) => Promise<{ success: boolean; message?: string }>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout: _onLogout
}) => {
  const { setIsRegistrationModalOpen } = useClassroom();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 🎯 5 VAI TRÒ ĐĂNG NHẬP THEO YÊU CẦU
  const [selectedRoleScope, setSelectedRoleScope] = useState<LoginRoleScope>('school_teacher');
  const [schools, setSchools] = useState<SchoolEntity[]>([]);
  const [selectedSchoolName, setSelectedSchoolName] = useState<string>('TRƯỜNG HỌC HẠNH PHÚC DEMO');

  useEffect(() => {
    if (isOpen) {
      databaseService.getSchools().then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setSchools(list);
          const isLegacy = selectedSchoolName.toLowerCase().includes('(th1_tu)') || 
                           selectedSchoolName.toLowerCase().includes('(th_tn)') || 
                           selectedSchoolName === 'Trường Tiểu học số 1 Tân Uyên';
          if (!selectedSchoolName || isLegacy || !list.some(s => s.name === selectedSchoolName)) {
            setSelectedSchoolName(list[0].name);
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    const isSchoolRole = selectedRoleScope === 'school_teacher' || selectedRoleScope === 'school_admin';
    if (isSchoolRole && !selectedSchoolName.trim()) {
      setErrorMessage('Vui lòng chọn trường học trực thuộc của bạn.');
      return;
    }

    setLoading(true);
    try {
      const res = await onLogin(
        username.trim(), 
        password, 
        selectedRoleScope, 
        isSchoolRole ? selectedSchoolName : undefined
      );
      if (res.success) {
        setSuccessMessage('Đăng nhập thành công! Đang tải dữ liệu...');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.message || 'Bạn đã nhập sai tài khoản mật khẩu.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: Array<{
    id: LoginRoleScope;
    title: string;
    sub: string;
    icon: React.ReactNode;
    color: string;
    activeBorder: string;
    activeBg: string;
    dotColor: string;
  }> = [
    {
      id: 'personal_teacher',
      title: 'Vai trò Cá Nhân',
      sub: 'Giáo viên tỉnh thành lẻ / tự do, quản lý bởi Quản trị Cá nhân',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'text-emerald-700',
      activeBorder: 'border-emerald-400',
      activeBg: 'bg-emerald-50/80',
      dotColor: 'bg-emerald-500'
    },
    {
      id: 'school_teacher',
      title: 'Vai trò Giáo viên thuộc Nhà trường',
      sub: 'Giáo viên chính khóa / bộ môn thuộc trường học trên hệ thống',
      icon: <School className="w-5 h-5" />,
      color: 'text-blue-700',
      activeBorder: 'border-blue-400',
      activeBg: 'bg-blue-50/80',
      dotColor: 'bg-blue-500'
    },
    {
      id: 'school_admin',
      title: 'Vai trò Quản trị Nhà Trường',
      sub: 'Quản lý toàn diện GV, lớp, HS trường, tải/nạp JSON & dọn năm học mới',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'text-amber-700',
      activeBorder: 'border-amber-400',
      activeBg: 'bg-amber-50/80',
      dotColor: 'bg-amber-500'
    },
    {
      id: 'guest_admin',
      title: 'Vai Trò Quản trị Tài khoản Cá Nhân',
      sub: 'Quản lý các thầy cô giáo viên cá nhân, tải/nạp JSON & dọn năm học mới',
      icon: <Users className="w-5 h-5" />,
      color: 'text-purple-700',
      activeBorder: 'border-purple-400',
      activeBg: 'bg-purple-50/80',
      dotColor: 'bg-purple-500'
    },
    {
      id: 'admin',
      title: 'Vai Trò Admin (Quản trị Tối cao)',
      sub: 'Quyền tối cao nhất: quản trị cây thư mục CSDL trường & mọi tài khoản',
      icon: <Crown className="w-5 h-5" />,
      color: 'text-rose-700',
      activeBorder: 'border-rose-400',
      activeBg: 'bg-rose-50/80',
      dotColor: 'bg-rose-500'
    }
  ];



  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 30%, #3d7ab5 60%, #4a90c4 100%)' }}
    >
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 0%, transparent 50%),
                          radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
      }} />

      {/* Main container */}
      <div 
        className="relative w-full max-w-5xl flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────────── TOP HEADER BAR ─────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Logo */}
            <div className="w-14 h-14 sm:w-[120px] sm:h-[120px] rounded-full border-[3px] border-white/40 overflow-hidden shadow-2xl bg-white shrink-0 flex items-center justify-center">
              <img 
                src="/assets/school_db_logo.png" 
                alt="Logo Hệ Quản Trị CSDL Trường Học" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl lg:text-xl font-black text-white tracking-tight drop-shadow-lg leading-tight whitespace-nowrap" style={{
                textShadow: '0 2px 12px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255,0.1)'
              }}>
                HỆ THỐNG QUẢN TRỊ CSDL LỚP HỌC HẠNH PHÚC
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-100/80 font-medium mt-0.5 hidden sm:block">
                SCHOOL DATABASE MANAGEMENT SYSTEM • Phiên bản chuyên nghiệp
              </p>
            </div>
          </div>
          
          {/* Close button (only when logged in) */}
          {currentUser && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ─────────── REGISTRATION BUTTON ─────────── */}
        <div className="flex justify-center px-4 pb-3 sm:pb-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              setIsRegistrationModalOpen(true);
            }}
            className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #e11d48 50%, #7c3aed 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.35)'
            }}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>ĐĂNG KÝ MUA TÀI KHOẢN MỚI (TRƯỜNG / CÁ NHÂN)</span>
          </button>
        </div>

        {/* ─────────── MAIN SPLIT PANEL ─────────── */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 px-3 sm:px-4 pb-3 sm:pb-4 overflow-hidden min-h-0">
          
          {/* ═══════════ LEFT PANEL - LOGIN FORM ═══════════ */}
          <div className="md:w-[42%] shrink-0 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{
            background: 'linear-gradient(160deg, #1e3a5f 0%, #2d5a87 40%, #1a2f4a 100%)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <div className="flex-1 p-4 sm:p-5 flex flex-col overflow-y-auto">
              {/* Error & Success Alerts */}
              {errorMessage && (
                <div className="mb-3.5 p-3.5 rounded-2xl bg-rose-600/35 border-2 border-rose-400 text-white text-xs sm:text-sm font-black flex items-start gap-2.5 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top duration-200">
                  <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-200 mb-0.5">
                      BẢNG THÔNG BÁO HỆ THỐNG
                    </div>
                    <div className="text-white text-xs sm:text-[13px] font-black leading-snug">
                      {errorMessage}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setErrorMessage('')}
                    className="text-rose-200 hover:text-white p-0.5 transition-colors cursor-pointer"
                    title="Đóng thông báo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {successMessage && (
                <div className="mb-3.5 p-3.5 rounded-2xl bg-emerald-500/25 border-2 border-emerald-400 text-emerald-100 text-xs sm:text-sm font-black flex items-center gap-2.5 backdrop-blur-md shadow-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-black text-blue-100/90 uppercase mb-2 tracking-wider">
                    2. Tên Đăng Nhập
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-blue-300/60 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ví dụ: adminquantri, adminths1, admin_canhan, nguyenthitrangtu1..."
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-bold text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-black text-blue-100/90 uppercase mb-2 tracking-wider">
                    3. Mật Khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-300/60 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-11 pr-12 py-2.5 rounded-xl text-sm font-bold text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* School Selection - for school_teacher and school_admin */}
                {(selectedRoleScope === 'school_teacher' || selectedRoleScope === 'school_admin') && (
                  <div className="p-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200" style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.25)'
                  }}>
                    <label className="block text-xs font-black text-blue-200 uppercase mb-1.5 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5" />
                      <span>Chọn Tên Trường:</span>
                    </label>
                    <select
                      value={selectedSchoolName}
                      onChange={(e) => setSelectedSchoolName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}
                    >
                      {schools.map((s) => (
                        <option key={s.id} value={s.name}>
                          🏫 {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 mt-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
                    color: 'white',
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  <ArrowRight className="w-5 h-5" />
                  {loading ? 'Đang xử lý đăng nhập...' : 'ĐĂNG NHẬP VÀO HỆ THỐNG'}
                </button>
              </form>


            </div>

            {/* Author Footer */}
            <div className="shrink-0 px-4 py-2" style={{
              background: 'linear-gradient(to right, rgba(245,158,11,0.15), rgba(234,179,8,0.1))',
              borderTop: '1px solid rgba(245,158,11,0.2)'
            }}>
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300/80 mb-0.5">
                Tác giả ứng dụng
              </div>
              <div className="text-sm font-black text-white tracking-tight">
                NGUYỄN THANH LIÊM
              </div>
              <div className="text-[10.5px] font-bold text-blue-200/70 mt-0.5">
                TRƯỜNG TIỂU HỌC SỐ 1 TÂN UYÊN
              </div>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <a 
                  href="https://zalo.me/0888358363" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-blue-200/60 hover:text-amber-300 transition-colors group"
                >
                  <Phone className="w-3 h-3" />
                  <span className="font-bold">Zalo Hỗ trợ:</span>
                  <span className="text-amber-300/90 font-mono font-bold group-hover:underline underline-offset-2">0888.358.363</span>
                </a>
                <a 
                  href="https://www.facebook.com/nguyenthanhliemautotech/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-blue-200/60 hover:text-blue-300 transition-colors group"
                >
                  <Globe className="w-3 h-3" />
                  <span className="font-bold">Facebook:</span>
                  <span className="text-blue-300/80 font-bold group-hover:underline underline-offset-2">XEM TRANG</span>
                </a>
              </div>
            </div>
          </div>

          {/* ═══════════ RIGHT PANEL - ROLE SELECTION ═══════════ */}
          <div className="flex-1 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-white" style={{
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
          }}>
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
              {/* Section title */}
              <div className="mb-2 sm:mb-3">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black">1</span>
                  CHỌN VAI TRÒ ĐĂNG NHẬP:
                </h2>
              </div>

              {/* Role Cards */}
              <div className="space-y-1.5 sm:space-y-2">
                {roleOptions.map((opt) => {
                  const isSelected = selectedRoleScope === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedRoleScope(opt.id)}
                      className={`group relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 cursor-pointer flex items-start gap-2.5 sm:gap-3 ${
                        isSelected 
                          ? `${opt.activeBorder} ${opt.activeBg} shadow-md` 
                          : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                      style={isSelected ? {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                      } : undefined}
                    >
                      {/* Radio indicator */}
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? `${opt.activeBorder} border-current` 
                            : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <div className={`w-2.5 h-2.5 rounded-full ${opt.dotColor} animate-in zoom-in duration-150`} />
                          )}
                        </div>
                      </div>

                      {/* Icon */}
                      <div className={`p-1.5 rounded-xl shrink-0 transition-all ${
                        isSelected 
                          ? `${opt.activeBg} ${opt.color}` 
                          : 'bg-slate-100 text-slate-400 group-hover:text-slate-500'
                      }`}>
                        {opt.icon}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-black transition-colors ${
                          isSelected ? opt.color : 'text-slate-700 group-hover:text-slate-900'
                        }`}>
                          {opt.title}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight mt-0.5">
                          {opt.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>


            </div>

            {/* Bottom note */}
            <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-slate-100">
              <div className="text-[10px] sm:text-[10.5px] text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-700">💾 Cơ chế phân quyền:</span>{' '}
                Mỗi vai trò được cấp quyền thao tác an toàn, phân vùng tách biệt giữa Nhà trường và Giáo viên vãng lai.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
