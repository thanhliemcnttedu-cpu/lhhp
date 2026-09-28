/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useClassroom } from '../../context/ClassroomContext';
import { Student, Classroom, RegisteredTeacher, TeacherApprovalStatus } from '../../types';
import { 
  Building2, Users, PieChart as PieIcon, BarChart3, TrendingUp,
  Download, Printer, AlertTriangle, RefreshCw, Calendar, 
  UtensilsCrossed, Award, CheckCircle2, ShieldCheck, ChevronRight,
  Sparkles, FileSpreadsheet, FolderSync, Star, ArrowUpRight, ArrowDownRight,
  UserCheck, UserX, UserPlus, Edit3, Trash2, Check, X, ShieldAlert,
  Search, Filter, Mail, Phone, Eye, ArrowRight, ExternalLink, Lock,
  GraduationCap, School, CheckSquare, KeyRound
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportElementToPdf, printHtmlElement } from '../../utils/printHelper';
import { NavigationMenuId } from '../layout/Sidebar';

type TimeFilterMode = 'day' | 'week' | 'month';
type ChartTab = 'all' | 'pie' | 'bar' | 'line';
type AdminMainTab = 'stats' | 'teachers';

interface AdminSchoolDataViewProps {
  onNavigate?: (view: NavigationMenuId) => void;
  defaultTab?: AdminMainTab;
}

export const AdminSchoolDataView: React.FC<AdminSchoolDataViewProps> = ({ 
  onNavigate,
  defaultTab = 'stats' 
}) => {
  const { 
    classes, students, attendanceRecords, boardingRecords,
    cycleStartDate, daysIntoCycle, is30DayAlertDue, dismiss30DayAlert,
    resetMonthlyStatistics, exportFullSystemJson, syncToDriveNow,
    isDriveSyncing, driveSyncStatus, setCurrentRole, setRoleModalOpen,
    registeredTeachers, addRegisteredTeacher, updateRegisteredTeacher,
    deleteRegisteredTeacher, approveTeacher, rejectTeacher, resetTeacherPassword,
    adminImpersonateClass, exitImpersonation, isImpersonating,
    activeClassId, setActiveClassId
  } = useClassroom();

  const [activeMainTab, setActiveMainTab] = useState<AdminMainTab>(defaultTab);
  const [timeFilter, setTimeFilter] = useState<TimeFilterMode>('month');
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Quick class switcher in admin view
  const [selectedQuickClassId, setSelectedQuickClassId] = useState<string>(() => classes[0]?.id || 'class-4a1');

  // Teacher accounts state & filters
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | TeacherApprovalStatus>('all');
  const [teacherClassFilter, setTeacherClassFilter] = useState<string>('all');

  // Modals for Teacher Management
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<RegisteredTeacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<RegisteredTeacher | null>(null);
  const [approvingTeacher, setApprovingTeacher] = useState<RegisteredTeacher | null>(null);
  const [selectedAssignClassId, setSelectedAssignClassId] = useState<string>(classes[0]?.id || 'class-4a1');

  // Reset Password Modal State (User Request: cho phép đặt mật khẩu tùy chọn hoặc mật khẩu ngẫu nhiên)
  const [resettingTeacher, setResettingTeacher] = useState<RegisteredTeacher | null>(null);
  const [customNewPassword, setCustomNewPassword] = useState('123456');
  const [resetPasswordTab, setResetPasswordTab] = useState<'random' | 'custom'>('random');

  // Add teacher form state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('123456');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherClassId, setNewTeacherClassId] = useState(classes[0]?.id || 'class-4a1');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherStatus, setNewTeacherStatus] = useState<TeacherApprovalStatus>('approved');
  const [newTeacherNote, setNewTeacherNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Group classes by grade
  const gradesList = ['Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5'];

  // Switch to class as Teacher
  const handleImpersonateClass = (classId: string) => {
    adminImpersonateClass(classId);
    confetti({ particleCount: 60, spread: 60 });
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  // Metrics computation for stats tab
  const metrics = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudents = students.length;
    const totalMale = students.filter(s => s.gender === 'Nam').length;
    const totalFemale = students.filter(s => s.gender === 'Nữ').length;

    // Boarding students
    const boardingStudentIds = new Set<string>();
    boardingRecords.forEach(rec => {
      Object.entries(rec.records).forEach(([sId, status]) => {
        if (status === 'eating') boardingStudentIds.add(sId);
      });
    });
    const totalBoarding = boardingStudentIds.size > 0 
      ? boardingStudentIds.size 
      : Math.round(totalStudents * 0.75);
    const boardingRate = totalStudents > 0 ? Math.round((totalBoarding / totalStudents) * 100) : 0;

    // Attendance computation
    let excused = 0;
    let unexcused = 0;
    let sick = 0;
    let other = 0;
    let present = 0;

    attendanceRecords.forEach(rec => {
      Object.values(rec.records).forEach(status => {
        if (status === 'present') present++;
        else if (status === 'excused') excused++;
        else if (status === 'unexcused') unexcused++;
        else if (status === 'sick') sick++;
        else if (status === 'other') other++;
      });
    });

    // Tỉ lệ chuyên cần cả trường = ((Tổng số học sinh - Tổng số vắng) / Tổng số học sinh) * 100%
    const totalAbsence = excused + unexcused + sick + other;
    const totalPresent = Math.max(0, totalStudents - totalAbsence);
    const attendanceRate = totalStudents > 0
      ? Math.max(0, Math.min(100, Math.round((totalPresent / totalStudents) * 100)))
      : 100;

    // Class overviews
    const classDetails = classes.map(cls => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      const male = clsStudents.filter(s => s.gender === 'Nam').length;
      const female = clsStudents.filter(s => s.gender === 'Nữ').length;
      const boarding = Math.round(clsStudents.length * 0.76);
      
      let clsExcused = 0;
      let clsUnexcused = 0;
      let clsSick = 0;
      let clsOther = 0;
      let clsPresent = 0;

      attendanceRecords.filter(r => r.classId === cls.id).forEach(r => {
        Object.values(r.records).forEach(st => {
          if (st === 'present') clsPresent++;
          else if (st === 'excused') clsExcused++;
          else if (st === 'unexcused') clsUnexcused++;
          else if (st === 'sick') clsSick++;
          else if (st === 'other') clsOther++;
        });
      });

      const clsTotalAbsence = clsExcused + clsUnexcused + clsSick + clsOther;
      const clsActualPresent = Math.max(0, clsStudents.length - clsTotalAbsence);
      const clsAttendanceRate = clsStudents.length > 0
        ? Math.max(0, Math.min(100, Math.round((clsActualPresent / clsStudents.length) * 100)))
        : 100;

      const totalPoints = clsStudents.reduce((sum, s) => sum + s.points, 0);
      const avgPoints = clsStudents.length > 0 ? Math.round(totalPoints / clsStudents.length) : 0;
      const top5 = [...clsStudents].sort((a, b) => b.points - a.points).slice(0, 5);

      return {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        teacherName: cls.teacherName || 'Chưa phân công',
        totalStudents: clsStudents.length,
        present: clsActualPresent,
        male,
        female,
        boarding,
        boardingRate: clsStudents.length > 0 ? Math.round((boarding / clsStudents.length) * 100) : 0,
        excused: clsExcused,
        unexcused: clsUnexcused,
        sick: clsSick,
        other: clsOther,
        totalAbsence: clsTotalAbsence,
        attendanceRate: clsAttendanceRate,
        avgPoints,
        topStudents: top5
      };
    });

    const gradeBreakdown = gradesList.map(grd => {
      const grClasses = classDetails.filter(c => c.grade === grd);
      const studentCount = grClasses.reduce((sum, c) => sum + c.totalStudents, 0);
      const presentCount = grClasses.reduce((sum, c) => sum + c.present, 0);
      const maleCount = grClasses.reduce((sum, c) => sum + c.male, 0);
      const femaleCount = grClasses.reduce((sum, c) => sum + c.female, 0);
      const boardingCount = grClasses.reduce((sum, c) => sum + c.boarding, 0);
      const avgRate = studentCount > 0
        ? Math.round((presentCount / studentCount) * 100)
        : 100;

      return {
        grade: grd,
        classCount: grClasses.length,
        studentCount,
        presentCount,
        maleCount,
        femaleCount,
        boardingCount,
        attendanceRate: avgRate
      };
    });

    return {
      totalClasses,
      totalStudents,
      totalPresent,
      totalMale,
      totalFemale,
      totalBoarding,
      boardingRate,
      excused,
      unexcused,
      sick,
      other,
      totalAbsence,
      attendanceRate,
      classDetails,
      gradeBreakdown
    };
  }, [classes, students, attendanceRecords, boardingRecords]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return registeredTeachers.filter(t => {
      // Search
      const matchSearch = teacherSearchQuery.trim() === '' || 
        t.displayName.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        (t.phone && t.phone.includes(teacherSearchQuery));
      
      // Status
      const matchStatus = teacherStatusFilter === 'all' || t.status === teacherStatusFilter;

      // Class
      const matchClass = teacherClassFilter === 'all' || t.assignedClassId === teacherClassFilter;

      return matchSearch && matchStatus && matchClass;
    });
  }, [registeredTeachers, teacherSearchQuery, teacherStatusFilter, teacherClassFilter]);

  // Teacher statistics count
  const pendingTeachersCount = registeredTeachers.filter(t => t.status === 'pending').length;
  const approvedTeachersCount = registeredTeachers.filter(t => t.status === 'approved').length;
  const rejectedTeachersCount = registeredTeachers.filter(t => t.status === 'rejected').length;

  // Handle Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const overviewData = [
      { 'Chỉ tiêu': 'Tổng số lớp học', 'Số lượng': metrics.totalClasses, 'Ghi chú': 'Toàn trường' },
      { 'Chỉ tiêu': 'Tổng số học sinh', 'Số lượng': metrics.totalStudents, 'Ghi chú': 'Toàn trường' },
      { 'Chỉ tiêu': 'Tổng số học sinh có mặt', 'Số lượng': metrics.totalPresent, 'Ghi chú': `Đạt ${metrics.attendanceRate}% chuyên cần` },
      { 'Chỉ tiêu': 'Học sinh Nam', 'Số lượng': metrics.totalMale, 'Ghi chú': `${Math.round((metrics.totalMale / (metrics.totalStudents || 1)) * 100)}%` },
      { 'Chỉ tiêu': 'Học sinh Nữ', 'Số lượng': metrics.totalFemale, 'Ghi chú': `${Math.round((metrics.totalFemale / (metrics.totalStudents || 1)) * 100)}%` },
      { 'Chỉ tiêu': 'Đăng ký ăn bán trú', 'Số lượng': metrics.totalBoarding, 'Ghi chú': `${metrics.boardingRate}%` },
      { 'Chỉ tiêu': 'Tỉ lệ chuyên cần chung', 'Số lượng': `${metrics.attendanceRate}%`, 'Ghi chú': 'Đúng giờ, đầy đủ' },
      { 'Chỉ tiêu': 'Tổng số học sinh vắng', 'Số lượng': metrics.totalAbsence, 'Ghi chú': 'Gồm phép, không phép, ốm, khác' },
      { 'Chỉ tiêu': 'Vắng có phép', 'Số lượng': metrics.excused, 'Ghi chú': 'Đơn xin phép' },
      { 'Chỉ tiêu': 'Vắng không phép', 'Số lượng': metrics.unexcused, 'Ghi chú': 'Không thông báo' },
      { 'Chỉ tiêu': 'Nghỉ ốm', 'Số lượng': metrics.sick, 'Ghi chú': 'Sức khỏe' },
      { 'Chỉ tiêu': 'Lí do khác', 'Số lượng': metrics.other, 'Ghi chú': 'Gia đình' }
    ];
    const ws1 = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Tong_Quan_So_Lieu');

    const classesData = metrics.classDetails.map((cls, idx) => ({
      'STT': idx + 1,
      'Tên lớp': cls.name,
      'Khối': cls.grade,
      'GVCN': cls.teacherName,
      'Sĩ số': cls.totalStudents,
      'Có mặt': cls.present,
      'Tổng vắng': cls.totalAbsence,
      'Nam': cls.male,
      'Nữ': cls.female,
      'Bán trú': cls.boarding,
      'Tỉ lệ Bán trú': `${cls.boardingRate}%`,
      'Tỉ lệ Chuyên cần': `${cls.attendanceRate}%`,
      'Điểm thi đua TB': cls.avgPoints
    }));
    const ws2 = XLSX.utils.json_to_sheet(classesData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Thong_Ke_Cac_Lop');

    // Sheet 3: Danh sách tài khoản Giáo Viên & Mật Khẩu
    const teachersData = registeredTeachers.map((t, idx) => ({
      'STT': idx + 1,
      'Họ và tên giáo viên': t.displayName,
      'Tên đăng nhập (Username)': t.username || t.email.split('@')[0],
      'Mật khẩu': t.password || '123456',
      'Lớp phụ trách': t.assignedClassName || t.assignedClassId,
      'Trạng thái': t.status === 'approved' ? 'Đã duyệt' : t.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa',
      'Email': t.email,
      'Số điện thoại': t.phone || '',
      'Ghi chú': t.note || ''
    }));
    const ws3 = XLSX.utils.json_to_sheet(teachersData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Tai_Khoan_Giao_Vien');

    XLSX.writeFile(wb, `BaoCao_QuanLySoLieu_Truong_${new Date().toISOString().split('T')[0]}.xlsx`);
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleExportTeachersExcel = () => {
    const wb = XLSX.utils.book_new();
    const teachersData = registeredTeachers.map((t, idx) => ({
      'STT': idx + 1,
      'Họ và tên giáo viên': t.displayName,
      'Tên đăng nhập (Username)': t.username || t.email.split('@')[0],
      'Mật khẩu': t.password || '123456',
      'Lớp phụ trách': t.assignedClassName || t.assignedClassId,
      'Trạng thái': t.status === 'approved' ? 'Đã duyệt' : t.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa',
      'Email liên hệ': t.email || '',
      'Số điện thoại': t.phone || '',
      'Ghi chú': t.note || ''
    }));
    const ws = XLSX.utils.json_to_sheet(teachersData);
    XLSX.utils.book_append_sheet(wb, ws, 'Tai_Khoan_Giao_Vien');
    XLSX.writeFile(wb, `Danh_Sach_Tai_Khoan_Giao_Vien_${new Date().toISOString().split('T')[0]}.xlsx`);
    confetti({ particleCount: 50, spread: 60 });
    showToast('Đã xuất thành công file Excel danh sách tài khoản & mật khẩu giáo viên!');
  };

  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePrintPdf = () => {
    setIsPrintReportModalOpen(true);
  };

  const handlePrintA4Direct = () => {
    printHtmlElement('school-stats-report-a4', 'Bao_Cao_Tong_Quan_So_Lieu_Toan_Truong', 'portrait');
  };

  const handleDirectExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      // Ensure element exists: if modal not open, open it first or export hidden
      const el = document.getElementById('school-stats-report-a4') || document.getElementById('school-stats-report-a4-hidden');
      if (!el) {
        setIsPrintReportModalOpen(true);
        setTimeout(async () => {
          await exportElementToPdf(
            'school-stats-report-a4',
            `Bao_Cao_Tong_Quan_So_Lieu_Toan_Truong_${new Date().toISOString().split('T')[0]}.pdf`,
            'portrait',
            'BÁO CÁO TỔNG QUAN VÀ THỐNG KÊ SỐ LIỆU TOÀN TRƯỜNG'
          );
          setIsExportingPdf(false);
        }, 300);
        return;
      }
      const success = await exportElementToPdf(
        el,
        `Bao_Cao_Tong_Quan_So_Lieu_Toan_Truong_${new Date().toISOString().split('T')[0]}.pdf`,
        'portrait',
        'BÁO CÁO TỔNG QUAN VÀ THỐNG KÊ SỐ LIỆU TOÀN TRƯỜNG'
      );
      if (success) {
        confetti({ particleCount: 50, spread: 60 });
        showToast('Đã xuất thành công file PDF báo cáo toàn trường!');
      }
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleConfirmResetMonth = () => {
    resetMonthlyStatistics();
    setIsResetConfirmOpen(false);
    confetti({ particleCount: 70, spread: 70 });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenResetPasswordModal = (teacher: RegisteredTeacher) => {
    setResettingTeacher(teacher);
    setResetPasswordTab('random');
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomNewPassword(randomPass);
  };

  const handleGenerateRandomPassword = () => {
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomNewPassword(randomPass);
  };

  const handleConfirmResetPassword = () => {
    if (!resettingTeacher) return;
    const finalPass = customNewPassword.trim() || '123456';
    resetTeacherPassword(resettingTeacher.id, finalPass);
    confetti({ particleCount: 40, spread: 50 });
    showToast(`Đã đổi mật khẩu cho ${resettingTeacher.displayName} thành: ${finalPass}`);
    setResettingTeacher(null);
  };

  // Add teacher submission
  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameTrimmed = newTeacherName.trim();
    if (!nameTrimmed) {
      setFormError('Vui lòng nhập Họ và tên giáo viên');
      return;
    }

    const isNone = !newTeacherClassId || newTeacherClassId === 'none';
    const assignedCls = isNone ? null : classes.find(c => c.id === newTeacherClassId);
    let usernameTrimmed = newTeacherUsername.trim().toLowerCase();
    if (!usernameTrimmed) {
      usernameTrimmed = assignedCls ? `gv_${assignedCls.name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : `gv_${Date.now().toString().slice(-4)}`;
    }

    // Check duplicate username
    if (registeredTeachers.some(t => t.username && t.username.toLowerCase() === usernameTrimmed)) {
      setFormError(`Tên đăng nhập "${usernameTrimmed}" đã tồn tại! Vui lòng chọn Tên đăng nhập khác.`);
      return;
    }

    const passwordTrimmed = (newTeacherPassword || '123456').trim();
    const emailTrimmed = newTeacherEmail.trim().toLowerCase() || `${usernameTrimmed}@lophoc.edu.vn`;

    addRegisteredTeacher({
      displayName: nameTrimmed,
      username: usernameTrimmed,
      password: passwordTrimmed,
      email: emailTrimmed,
      assignedClassId: isNone ? 'none' : newTeacherClassId,
      assignedClassName: isNone ? 'Chưa phân công (None)' : (assignedCls ? `${assignedCls.name} (${assignedCls.grade})` : '4A1'),
      status: newTeacherStatus,
      phone: newTeacherPhone.trim(),
      note: newTeacherNote.trim() || 'Khởi tạo bởi quản trị viên'
    });

    confetti({ particleCount: 50, spread: 50 });
    setIsAddTeacherModalOpen(false);
    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPassword('123456');
    setNewTeacherEmail('');
    setNewTeacherPhone('');
    setNewTeacherNote('');
    setNewTeacherStatus('approved');
    showToast(`Đã tạo tài khoản cho ${nameTrimmed} (Username: ${usernameTrimmed}, MK: ${passwordTrimmed})`);
  };

  // Edit teacher submission
  const handleUpdateTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const usernameTrimmed = (editingTeacher.username || '').trim().toLowerCase();
    if (!usernameTrimmed) {
      setFormError('Tên đăng nhập không được để trống');
      return;
    }

    // Check duplicate username with other teachers
    if (registeredTeachers.some(t => t.id !== editingTeacher.id && t.username && t.username.toLowerCase() === usernameTrimmed)) {
      setFormError(`Tên đăng nhập "${usernameTrimmed}" đã được sử dụng bởi tài khoản khác!`);
      return;
    }

    const isNone = !editingTeacher.assignedClassId || editingTeacher.assignedClassId === 'none';
    const assignedCls = isNone ? null : classes.find(c => c.id === editingTeacher.assignedClassId);

    updateRegisteredTeacher(editingTeacher.id, {
      displayName: editingTeacher.displayName.trim(),
      username: usernameTrimmed,
      password: (editingTeacher.password || '123456').trim(),
      email: (editingTeacher.email || `${usernameTrimmed}@lophoc.edu.vn`).trim().toLowerCase(),
      assignedClassId: isNone ? 'none' : editingTeacher.assignedClassId,
      assignedClassName: isNone ? 'Chưa phân công (None)' : (assignedCls ? `${assignedCls.name} (${assignedCls.grade})` : editingTeacher.assignedClassName),
      status: editingTeacher.status,
      phone: editingTeacher.phone?.trim(),
      note: editingTeacher.note?.trim()
    });

    confetti({ particleCount: 40, spread: 50 });
    setEditingTeacher(null);
    showToast(`Đã cập nhật thông tin tài khoản cho ${editingTeacher.displayName}`);
  };

  // Approve teacher with assigned class
  const handleConfirmApproval = () => {
    if (!approvingTeacher) return;
    approveTeacher(approvingTeacher.id, selectedAssignClassId);
    confetti({ particleCount: 60, spread: 60 });
    setApprovingTeacher(null);
  };

  const filteredClasses = selectedGradeFilter === 'all'
    ? metrics.classDetails
    : metrics.classDetails.filter(c => c.grade === selectedGradeFilter);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 30-Day Alert Banner */}
      {is30DayAlertDue && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-5 text-white shadow-xl shadow-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm md:text-base">
                  CẢNH BÁO CHU KỲ 30 NGÀY ({daysIntoCycle} ngày)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-[11px] font-bold">
                  Định kỳ sao lưu
                </span>
              </div>
              <p className="text-xs md:text-sm text-amber-100 font-medium">
                Đã đến hạn chu kỳ 30 ngày! Vui lòng tải tệp .JSON sao lưu toàn bộ hệ thống về máy tính trước khi chuyển sang chu kỳ tháng mới.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              onClick={exportFullSystemJson}
              className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-900 font-black text-xs rounded-xl shadow-md transition-all hover:scale-102 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Tải Tệp .JSON Toàn Bộ</span>
            </button>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2 bg-amber-950/40 hover:bg-amber-950/60 text-white font-black text-xs rounded-xl border border-white/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm Mới Tháng Mới</span>
            </button>

            <button
              onClick={dismiss30DayAlert}
              className="p-2 text-white/80 hover:text-white text-xs font-bold"
              title="Tạm ẩn cảnh báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-600/25">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 block">
                  VAI TRÒ QUẢN LÝ SỐ LIỆU (ADMIN) • TOÀN TRƯỜNG
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Quản Trị Hệ Thống & Phê Duyệt Tài Khoản Giáo Viên
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Chuyển đổi linh hoạt sang vai trò giáo viên của từng lớp, duyệt quyền đăng nhập Google và quản lý số liệu toàn trường
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-transform hover:scale-102"
              title="Xuất file Excel (.xlsx) báo cáo số liệu toàn trường"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setIsPrintReportModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer transition-transform hover:scale-102"
              title="In báo cáo chi tiết toàn trường khổ A4"
            >
              <Printer className="w-3.5 h-3.5 text-purple-100" />
              <span>In Báo Cáo A4</span>
            </button>

            <button
              onClick={handleDirectExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-transform hover:scale-102 disabled:opacity-50"
              title="Xuất file PDF báo cáo số liệu toàn trường"
            >
              <Download className="w-3.5 h-3.5 text-indigo-100" />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Xuất File PDF'}</span>
            </button>

            <button
              onClick={() => setRoleModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              title="Đổi vai trò hoặc đăng xuất"
            >
              Chuyển Vai Trò
            </button>
          </div>
        </div>

        {/* FEATURE 1: Chuyển đổi nhanh sang và xem thông tin từng lớp với vai trò giáo viên */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-blue-50/80 border border-purple-200/90 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/20 font-bold">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-purple-950 flex items-center gap-2">
                <span>CHUYỂN ĐỔI SANG VAI TRÒ GIÁO VIÊN CỦA TỪNG LỚP</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900 font-extrabold text-[10px]">
                  Quyền Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Quản trị viên có thể vào xem, quản lý học sinh, điểm danh, gọi tên, sơ đồ lớp của từng lớp như một giáo viên thực thụ và quay lại bất cứ lúc nào.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <select
              value={selectedQuickClassId}
              onChange={(e) => setSelectedQuickClassId(e.target.value)}
              className="flex-1 md:flex-none px-3.5 py-2 bg-white border border-purple-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Lớp {c.name} ({c.grade}) {c.teacherName ? `• GV: ${c.teacherName}` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleImpersonateClass(selectedQuickClassId)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all hover:scale-102 cursor-pointer shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vào Xem Lớp (Vai Trò GV)</span>
            </button>
          </div>
        </div>

        {/* MAIN NAVIGATION TABS: 1. Thống kê số liệu | 2. Quản lý duyệt tài khoản giáo viên */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl gap-1.5">
          <button
            onClick={() => setActiveMainTab('stats')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'stats'
                ? 'bg-white text-purple-900 shadow-sm shadow-purple-600/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>I. Tổng Quan & Thống Kê Số Liệu Các Lớp</span>
          </button>

          <button
            onClick={() => setActiveMainTab('teachers')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeMainTab === 'teachers'
                ? 'bg-white text-indigo-900 shadow-sm shadow-indigo-600/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>II. Quản Lý Duyệt Tài Khoản Google Giáo Viên</span>
            {pendingTeachersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] animate-pulse">
                {pendingTeachersCount} chờ duyệt
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: TỔNG QUAN & THỐNG KÊ SỐ LIỆU */}
      {/* ===================================================================== */}
      {activeMainTab === 'stats' && (
        <div className="space-y-6">
          {/* KPI Cards: Big Visual Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Tổng số lớp</span>
              <div className="text-2xl font-black text-indigo-950">{metrics.totalClasses}</div>
              <span className="text-[10px] text-slate-500 font-bold">5 khối tiểu học</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Tổng học sinh</span>
              <div className="text-2xl font-black text-indigo-600">{metrics.totalStudents}</div>
              <span className="text-[10px] text-slate-500 font-bold">Toàn trường</span>
            </div>

            {/* BỔ SUNG TỔNG SỐ HỌC SINH CÓ MẶT THEO YÊU CẦU */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 rounded-3xl border-2 border-emerald-300 shadow-sm space-y-1">
              <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>HS Có Mặt</span>
              </span>
              <div className="text-2xl font-black text-emerald-700">{metrics.totalPresent}</div>
              <span className="text-[10px] text-emerald-700 font-bold block">
                {metrics.attendanceRate}% chuyên cần
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-blue-500 uppercase tracking-wider block">Học sinh Nam</span>
              <div className="text-2xl font-black text-blue-700">{metrics.totalMale}</div>
              <span className="text-[10px] text-blue-600 font-bold">
                {metrics.totalStudents > 0 ? Math.round((metrics.totalMale / metrics.totalStudents) * 100) : 0}%
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider block">Học sinh Nữ</span>
              <div className="text-2xl font-black text-rose-700">{metrics.totalFemale}</div>
              <span className="text-[10px] text-rose-600 font-bold">
                {metrics.totalStudents > 0 ? Math.round((metrics.totalFemale / metrics.totalStudents) * 100) : 0}%
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider block">Ăn bán trú</span>
              <div className="text-2xl font-black text-amber-700">{metrics.totalBoarding}</div>
              <span className="text-[10px] text-amber-600 font-bold">{metrics.boardingRate}% đăng ký</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wider block">Tỉ lệ chuyên cần</span>
              <div className="text-2xl font-black text-indigo-700">{metrics.attendanceRate}%</div>
              <span className="text-[10px] text-rose-600 font-bold">Vắng: {metrics.totalAbsence} em</span>
            </div>
          </div>

          {/* DETAILED ATTENDANCE BREAKDOWN */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Thống Kê Chuyên Cần & Phân Loại Học Sinh Vắng ({timeFilter === 'day' ? 'Hôm nay' : timeFilter === 'week' ? 'Tuần này' : 'Tháng này'})</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Tỉ lệ chuyên cần = <strong className="text-emerald-700">({metrics.totalStudents} HS - {metrics.totalAbsence} vắng) / {metrics.totalStudents} = {metrics.attendanceRate}%</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-black rounded-xl border border-emerald-200">
                  Có mặt: <strong>{metrics.totalPresent}</strong> / {metrics.totalStudents} em
                </span>
                <span className="px-3 py-1 bg-rose-50 text-rose-800 font-black rounded-xl border border-rose-200">
                  Tổng vắng: <strong>{metrics.totalAbsence}</strong> em
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                <span className="text-xs font-black text-blue-900 block">Có phép:</span>
                <div className="text-xl font-black text-blue-700">{metrics.excused} lượt</div>
                <span className="text-[10px] text-blue-600 font-medium">Đơn xin phép của phụ huynh</span>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl">
                <span className="text-xs font-black text-rose-900 block">Không phép:</span>
                <div className="text-xl font-black text-rose-700">{metrics.unexcused} lượt</div>
                <span className="text-[10px] text-rose-600 font-medium">Chưa có liên hệ phụ huynh</span>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <span className="text-xs font-black text-amber-900 block">Nghỉ ốm:</span>
                <div className="text-xl font-black text-amber-700">{metrics.sick} lượt</div>
                <span className="text-[10px] text-amber-600 font-medium">Lý do sức khỏe</span>
              </div>

              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <span className="text-xs font-black text-purple-900 block">Khác:</span>
                <div className="text-xl font-black text-purple-700">{metrics.other} lượt</div>
                <span className="text-[10px] text-purple-600 font-medium">Việc riêng gia đình</span>
              </div>
            </div>
          </div>

          {/* VISUAL CHARTS SECTION: PIE, BAR & PROGRESS LINE */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-purple-600" />
                  <span>Hệ Thống Biểu Đồ Trực Quan Toàn Trường</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  So sánh cơ cấu giới tính, tỷ lệ ăn bán trú, sĩ số các khối và xu hướng chuyên cần
                </p>
              </div>

              <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  onClick={() => setActiveChartTab('all')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    activeChartTab === 'all' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setActiveChartTab('pie')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    activeChartTab === 'pie' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Biểu đồ Tròn
                </button>
                <button
                  onClick={() => setActiveChartTab('bar')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    activeChartTab === 'bar' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Biểu đồ Cột
                </button>
                <button
                  onClick={() => setActiveChartTab('line')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    activeChartTab === 'line' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Biểu đồ Đường
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. BIỂU ĐỒ TRÒN: Cơ cấu Học sinh Nam & Nữ + Bán trú */}
              {(activeChartTab === 'all' || activeChartTab === 'pie') && (
                <div className="p-5 bg-gradient-to-b from-purple-50/40 to-slate-50/60 rounded-3xl border border-purple-100/80 space-y-4">
                  <span className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                    1. Cơ Cấu Học Sinh Nam & Nữ
                  </span>
                  
                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3.8" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3.8"
                          strokeDasharray={`${Math.round((metrics.totalMale / (metrics.totalStudents || 1)) * 100)} 100`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke="#F43F5E"
                          strokeWidth="3.8"
                          strokeDasharray={`${Math.round((metrics.totalFemale / (metrics.totalStudents || 1)) * 100)} 100`}
                          strokeDashoffset={`-${Math.round((metrics.totalMale / (metrics.totalStudents || 1)) * 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-black text-indigo-950">{metrics.totalStudents}</span>
                        <span className="text-[10px] text-slate-500 font-bold">Học sinh</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-bold pt-1">
                    <div className="flex items-center justify-between text-blue-700">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                        <span>Nam: {metrics.totalMale} em</span>
                      </span>
                      <span>{metrics.totalStudents > 0 ? Math.round((metrics.totalMale / metrics.totalStudents) * 100) : 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-700">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                        <span>Nữ: {metrics.totalFemale} em</span>
                      </span>
                      <span>{metrics.totalStudents > 0 ? Math.round((metrics.totalFemale / metrics.totalStudents) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. BIỂU ĐỒ CỘT: So sánh Sĩ số từng Khối */}
              {(activeChartTab === 'all' || activeChartTab === 'bar') && (
                <div className="p-5 bg-gradient-to-b from-indigo-50/40 to-slate-50/60 rounded-3xl border border-indigo-100/80 space-y-4">
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wider block">
                    2. Sĩ Số Học Sinh Từng Khối (K1 - K5)
                  </span>

                  <div className="h-40 flex items-end justify-between gap-2 pt-4 px-1">
                    {metrics.gradeBreakdown.map((grd) => {
                      const maxStudents = Math.max(...metrics.gradeBreakdown.map(g => g.studentCount), 30);
                      const heightPercent = Math.max(12, Math.round((grd.studentCount / (maxStudents || 1)) * 100));
                      return (
                        <div key={grd.grade} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          <span className="text-[10px] font-black text-purple-700 group-hover:scale-110 transition-transform">
                            {grd.studentCount}
                          </span>
                          <div
                            className="w-full max-w-[32px] rounded-t-xl bg-gradient-to-t from-purple-600 to-indigo-500 shadow-sm group-hover:brightness-110 transition-all cursor-pointer"
                            style={{ height: `${heightPercent}%` }}
                            title={`${grd.grade}: ${grd.studentCount} học sinh (${grd.classCount} lớp)`}
                          />
                          <span className="text-[10px] font-bold text-slate-600 truncate w-full text-center">
                            {grd.grade.replace('Khối ', 'K')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-2xl border border-purple-100 text-[11px] text-purple-900 font-semibold flex items-center justify-between">
                    <span>Chuyên cần trung bình các khối:</span>
                    <strong className="text-emerald-700 font-black">{metrics.attendanceRate}%</strong>
                  </div>
                </div>
              )}

              {/* 3. BIỂU ĐỒ ĐƯỜNG: Diễn biến Chuyên cần & Tiến bộ */}
              {(activeChartTab === 'all' || activeChartTab === 'line') && (
                <div className="p-5 bg-gradient-to-b from-teal-50/30 to-slate-50/50 rounded-3xl border border-teal-100/80 space-y-4">
                  <span className="text-xs font-black text-teal-950 uppercase tracking-wider block">
                    3. Biểu Đồ Đường: Diễn Biến Tiến Bộ ({timeFilter === 'month' ? '4 Tuần' : '7 Ngày'})
                  </span>

                  <div className="h-44 relative pt-2">
                    <svg viewBox="0 0 280 120" className="w-full h-full overflow-visible">
                      <line x1="0" y1="20" x2="280" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="0" y1="60" x2="280" y2="60" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="0" y1="100" x2="280" y2="100" stroke="#e2e8f0" strokeDasharray="3 3" />

                      <path
                        d="M 10 90 Q 70 70, 140 45 T 270 30 L 270 110 L 10 110 Z"
                        fill="rgba(20, 184, 166, 0.15)"
                      />

                      <path
                        d="M 10 90 Q 70 70, 140 45 T 270 30"
                        fill="none"
                        stroke="#0D9488"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      <circle cx="10" cy="90" r="4.5" fill="#0D9488" stroke="#fff" strokeWidth="2" />
                      <circle cx="75" cy="72" r="4.5" fill="#0D9488" stroke="#fff" strokeWidth="2" />
                      <circle cx="140" cy="45" r="4.5" fill="#0D9488" stroke="#fff" strokeWidth="2" />
                      <circle cx="205" cy="38" r="4.5" fill="#0D9488" stroke="#fff" strokeWidth="2" />
                      <circle cx="270" cy="30" r="5.5" fill="#F59E0B" stroke="#fff" strokeWidth="2.5" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 font-semibold text-slate-600">
                    <span className="flex items-center gap-1 text-emerald-700 font-black">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Tiến bộ: +4.2%</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Xu hướng thi đua tăng dần đều
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TOP 5 HỌC SINH CHUYÊN CẦN XUẤT SẮC CỦA MỖI LỚP */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Top 5 Học Sinh Chuyên Cần & Tích Cực Xuất Sắc Của Mỗi Lớp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghi nhận các tấm gương học sinh chăm ngoan, chuyên cần 100% và đạt thành tích thi đua cao nhất
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-black text-xs">
                ⭐ Vinh danh định kỳ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.classDetails.map((cls) => (
                <div key={cls.id} className="p-4 bg-gradient-to-br from-amber-50/30 via-white to-slate-50/60 rounded-2xl border border-amber-200/70 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-950 text-sm">
                        Lớp {cls.name} ({cls.grade})
                      </span>
                      <span className="text-xs text-slate-500">GVCN: <strong>{cls.teacherName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {cls.attendanceRate}% Chuyên cần
                      </span>
                      <button
                        onClick={() => handleImpersonateClass(cls.id)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded-lg border border-purple-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Vào xem lớp này với vai trò giáo viên"
                      >
                        <Eye className="w-3 h-3 text-purple-600" />
                        <span>Xem lớp</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {cls.topStudents.map((st, idx) => (
                      <div key={st.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-2xs hover:border-amber-300 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <img
                            src={st.avatar}
                            alt={st.name}
                            className="w-7 h-7 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0 truncate">
                            <div className="text-xs font-black text-slate-800 truncate">{st.name}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">{st.role || st.group || 'Học sinh'} · {st.gender}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 font-black text-[11px] rounded-lg border border-amber-300">
                            <span>🪙</span>
                            <span>{st.points} xu</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            100%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FULL CLASSES TABLE VIEW (User requirement: GVCN, nam, nu, vang, ban tru & chuyển đổi xem lớp) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Bảng Tổng Hợp Chi Tiết Từng Lớp Học
                </h3>
                <p className="text-xs text-slate-500">
                  Thống kê GVCN, sĩ số, giới tính, ăn bán trú, chuyên cần và liên kết trực tiếp vào xem lớp với vai trò Giáo viên
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Lọc khối:</label>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
                >
                  <option value="all">Tất cả khối</option>
                  {gradesList.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-y border-slate-200">
                    <th className="py-3 px-3">Lớp</th>
                    <th className="py-3 px-3">Khối</th>
                    <th className="py-3 px-3">Giáo Viên Chủ Nhiệm</th>
                    <th className="py-3 px-3 text-center">Sĩ số</th>
                    <th className="py-3 px-3 text-center text-emerald-800 bg-emerald-50/60">Có Mặt</th>
                    <th className="py-3 px-3 text-center">Nam / Nữ</th>
                    <th className="py-3 px-3 text-center">Bán Trú</th>
                    <th className="py-3 px-3 text-center">Chuyên Cần</th>
                    <th className="py-3 px-3 text-center">Vắng (Có/K.Phép)</th>
                    <th className="py-3 px-3 text-center">Điểm TB</th>
                    <th className="py-3 px-3 text-center">Thao tác Quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-3 px-3 font-black text-indigo-950">Lớp {cls.name}</td>
                      <td className="py-3 px-3 font-bold text-slate-600">{cls.grade}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{cls.teacherName}</td>
                      <td className="py-3 px-3 text-center font-black text-indigo-700">{cls.totalStudents}</td>
                      <td className="py-3 px-3 text-center font-black text-emerald-700 bg-emerald-50/40">
                        {cls.present} / {cls.totalStudents}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span className="text-blue-700">{cls.male}</span> / <span className="text-rose-700">{cls.female}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-800">
                        {cls.boarding} ({cls.boardingRate}%)
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px]">
                          {cls.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        <span className="text-blue-600 font-bold">{cls.excused}</span> / <span className="text-rose-600 font-bold">{cls.unexcused}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-amber-700">
                        🪙 {cls.avgPoints}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleImpersonateClass(cls.id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-105 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          title={`Chuyển sang xem lớp ${cls.name} với vai trò Giáo viên`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Lớp (Vai trò GV)</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: QUẢN LÝ DUYỆT TÀI KHOẢN GOOGLE GIÁO VIÊN */}
      {/* ===================================================================== */}
      {activeMainTab === 'teachers' && (
        <div className="space-y-6">
          {/* Summary Cards of Teacher Accounts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Tổng tài khoản Google</span>
              <div className="text-2xl font-black text-indigo-950">{registeredTeachers.length}</div>
              <span className="text-[10px] text-slate-500 font-bold">Giáo viên đã đăng ký</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-amber-200/80 shadow-xs space-y-1 bg-amber-50/30">
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider block flex items-center justify-between">
                <span>Chờ Phê Duyệt</span>
                {pendingTeachersCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
              </span>
              <div className="text-2xl font-black text-amber-700">{pendingTeachersCount}</div>
              <span className="text-[10px] text-amber-700 font-bold">Cần Admin phê duyệt & phân lớp</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-emerald-200/80 shadow-xs space-y-1 bg-emerald-50/30">
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider block">Đã Phê Duyệt</span>
              <div className="text-2xl font-black text-emerald-700">{approvedTeachersCount}</div>
              <span className="text-[10px] text-emerald-700 font-bold">Được phép đăng nhập vào lớp</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-rose-200/80 shadow-xs space-y-1 bg-rose-50/30">
              <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider block">Đã Từ Chối / Khóa</span>
              <div className="text-2xl font-black text-rose-700">{rejectedTeachersCount}</div>
              <span className="text-[10px] text-rose-600 font-bold">Tài khoản bị tạm khóa quyền</span>
            </div>
          </div>

          {/* Teacher Management Toolbar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Danh Sách & Phê Duyệt Tài Khoản Google Giáo Viên</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Quản trị viên có toàn quyền: duyệt đăng nhập, phân công phụ trách lớp mấy, sửa thông tin và xóa tài khoản giáo viên
                </p>
              </div>

              {/* Teacher Table Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTeachersExcel}
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs rounded-2xl flex items-center gap-1.5 transition-all hover:scale-102 cursor-pointer shadow-xs"
                  title="Xuất file Excel đầy đủ tên đăng nhập & mật khẩu giáo viên"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Xuất DS Tài Khoản (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setNewTeacherName('');
                    setNewTeacherUsername('');
                    setNewTeacherPassword('123456');
                    setNewTeacherEmail('');
                    setNewTeacherPhone('');
                    setNewTeacherNote('');
                    setNewTeacherStatus('approved');
                    setIsAddTeacherModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-2xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all hover:scale-102 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Khởi Tạo Tài Khoản Giáo Viên Mới</span>
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên giáo viên, username, email, SĐT..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0">Trạng thái:</label>
                <select
                  value={teacherStatusFilter}
                  onChange={(e) => setTeacherStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái ({registeredTeachers.length})</option>
                  <option value="pending">⏳ Chờ duyệt ({pendingTeachersCount})</option>
                  <option value="approved">✓ Đã duyệt ({approvedTeachersCount})</option>
                  <option value="rejected">🚫 Đã khóa / Từ chối ({rejectedTeachersCount})</option>
                </select>
              </div>

              {/* Class filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0">Lớp phụ trách:</label>
                <select
                  value={teacherClassFilter}
                  onChange={(e) => setTeacherClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
                >
                  <option value="all">Tất cả lớp học</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Lớp {c.name} ({c.grade})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Teacher Accounts Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Hiển thị <strong>{filteredTeachers.length}</strong> / <strong>{registeredTeachers.length}</strong> tài khoản giáo viên
              </span>

              {pendingTeachersCount > 0 && (
                <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-xs flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Có {pendingTeachersCount} tài khoản giáo viên đang chờ phê duyệt</span>
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-y border-slate-200">
                    <th className="py-3 px-3 text-center w-10">STT</th>
                    <th className="py-3 px-3">Giáo Viên</th>
                    <th className="py-3 px-3">Tên Đăng Nhập (Username)</th>
                    <th className="py-3 px-3">Mật Khẩu</th>
                    <th className="py-3 px-3 text-center">Phụ Trách Lớp</th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                    <th className="py-3 px-3 text-center">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Không tìm thấy tài khoản giáo viên nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher, idx) => {
                      const assignedClass = classes.find(c => c.id === teacher.assignedClassId);
                      const displayUsername = teacher.username || teacher.email.split('@')[0];
                      const displayPassword = teacher.password || '123456';

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={teacher.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${teacher.displayName}&backgroundColor=d1d4f9`}
                                alt={teacher.displayName}
                                className="w-8 h-8 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                              />
                              <div>
                                <div className="font-black text-slate-900 text-xs">
                                  {teacher.displayName}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                                  {teacher.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Username with 1-click Copy */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-900 font-black">
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200">
                                {displayUsername}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(displayUsername);
                                  showToast(`Đã sao chép Username: ${displayUsername}`);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Sao chép tên đăng nhập"
                              >
                                📋
                              </button>
                            </div>
                          </td>

                          {/* Password with 1-click Copy */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800 font-bold">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                                {displayPassword}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(displayPassword);
                                  showToast(`Đã sao chép Mật khẩu: ${displayPassword}`);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Sao chép mật khẩu"
                              >
                                📋
                              </button>
                            </div>
                          </td>

                          {/* Assigned Class */}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl font-black text-xs">
                              <School className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{assignedClass ? `Lớp ${assignedClass.name}` : (teacher.assignedClassName || 'Chưa gán')}</span>
                            </span>
                            {assignedClass && (
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {assignedClass.grade}
                              </div>
                            )}
                          </td>

                          {/* Approval Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {teacher.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Đã duyệt (Cho phép)</span>
                              </span>
                            )}
                            {teacher.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-[11px] animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Chờ phê duyệt</span>
                              </span>
                            )}
                            {teacher.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-black text-[11px]">
                                <UserX className="w-3 h-3 text-rose-600" />
                                <span>Đã khóa / Từ chối</span>
                              </span>
                            )}
                          </td>

                          {/* Admin Action Buttons */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Quick Approve or Reject */}
                              {teacher.status === 'pending' && (
                                <button
                                  onClick={() => {
                                    setApprovingTeacher(teacher);
                                    setSelectedAssignClassId(teacher.assignedClassId || classes[0]?.id || 'class-4a1');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-transform hover:scale-105"
                                  title="Phê duyệt tài khoản và gán lớp phụ trách"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Duyệt</span>
                                </button>
                              )}

                              {teacher.status === 'approved' && (
                                <>
                                  {/* View class as teacher shortcut */}
                                  <button
                                    onClick={() => handleImpersonateClass(teacher.assignedClassId || classes[0]?.id || 'class-4a1')}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Chuyển sang xem lớp này với vai trò giáo viên"
                                  >
                                    <Eye className="w-3 h-3 text-purple-600" />
                                    <span>Vào lớp</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenResetPasswordModal(teacher)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Đặt lại mật khẩu (tùy chọn hoặc ngẫu nhiên)"
                                  >
                                    <KeyRound className="w-3 h-3 text-amber-600" />
                                    <span>Reset MK</span>
                                  </button>

                                  <button
                                    onClick={() => rejectTeacher(teacher.id)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Khóa quyền đăng nhập của tài khoản này"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>Khóa</span>
                                  </button>
                                </>
                              )}

                              {teacher.status === 'rejected' && (
                                <button
                                  onClick={() => approveTeacher(teacher.id)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Mở lại quyền cho tài khoản này"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Mở khóa</span>
                                </button>
                              )}

                              {/* Edit Teacher Modal Button */}
                              <button
                                onClick={() => setEditingTeacher({ ...teacher })}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                title="Sửa tên đăng nhập, mật khẩu & lớp phụ trách"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Teacher Modal Button */}
                              <button
                                onClick={() => setTeacherToDelete(teacher)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                                title="Xóa tài khoản giáo viên khỏi phần mềm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: THÊM MỚI TÀI KHOẢN GOOGLE GIÁO VIÊN */}
      {/* ===================================================================== */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Thêm Tài Khoản Google Giáo Viên Mới
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cấp quyền đăng nhập và phân công lớp phụ trách cho giáo viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTeacherModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddTeacherSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên giáo viên *
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Ví dụ: Thầy Trần Quang Huy, Cô Nguyễn Mai Lan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email Google của giáo viên (Dùng để đăng nhập) *</span>
                </label>
                <input
                  type="email"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  placeholder="giaovien@gmail.com..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Giáo viên khi bấm "Đăng nhập với Google" có email này sẽ được hệ thống tự động nhận diện và cấp quyền.
                </span>
              </div>

              {/* Username & Password for Teacher */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tên User đăng nhập *</span>
                  </label>
                  <input
                    type="text"
                    value={newTeacherUsername}
                    onChange={(e) => setNewTeacherUsername(e.target.value)}
                    placeholder="gv_4a1, gv_lan..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Mật khẩu *</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewTeacherPassword(Math.floor(100000 + Math.random() * 900000).toString())}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      🎲 Ngẫu nhiên
                    </button>
                  </label>
                  <input
                    type="text"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    placeholder="Mật khẩu đăng nhập..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Phụ trách lớp mấy *</span>
                  </label>
                  <select
                    value={newTeacherClassId}
                    onChange={(e) => setNewTeacherClassId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                    required
                  >
                    <option value="none">-- Chưa phân công quản lý lớp nào (None) --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name} ({c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái duyệt *
                  </label>
                  <select
                    value={newTeacherStatus}
                    onChange={(e) => setNewTeacherStatus(e.target.value as TeacherApprovalStatus)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 focus:outline-none"
                  >
                    <option value="approved">✓ Đã duyệt (Cho phép đăng nhập ngay)</option>
                    <option value="pending">⏳ Chờ duyệt</option>
                    <option value="rejected">🚫 Khóa quyền truy cập</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Số điện thoại liên hệ</span>
                </label>
                <input
                  type="text"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  placeholder="0988 123 456..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú quản trị
                </label>
                <input
                  type="text"
                  value={newTeacherNote}
                  onChange={(e) => setNewTeacherNote(e.target.value)}
                  placeholder="Ví dụ: Giáo viên chủ nhiệm mới bổ nhiệm kỳ 2..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-xl shadow-md cursor-pointer"
                >
                  Lưu & Thêm Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SỬA TÀI KHOẢN GIÁO VIÊN TRÊN PHẦN MỀM */}
      {/* ===================================================================== */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Sửa Tài Khoản Giáo Viên
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cập nhật họ tên, email Google, phân công lớp và trạng thái phê duyệt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeacher(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTeacherSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên giáo viên *
                </label>
                <input
                  type="text"
                  value={editingTeacher.displayName}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tên User đăng nhập *</span>
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.username || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, username: e.target.value })}
                    placeholder="gv_toan4, gv_lan..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                    <span>Mật khẩu đăng nhập *</span>
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.password || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                    placeholder="Mật khẩu..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>Email Google đăng nhập *</span>
                </label>
                <input
                  type="email"
                  value={editingTeacher.email}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-purple-600" />
                    <span>Lớp phụ trách *</span>
                  </label>
                  <select
                    value={editingTeacher.assignedClassId || 'none'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isNone = !val || val === 'none';
                      const cls = isNone ? null : classes.find(c => c.id === val);
                      setEditingTeacher({
                        ...editingTeacher,
                        assignedClassId: val,
                        assignedClassName: isNone ? 'Chưa phân công (None)' : (cls ? `${cls.name} (${cls.grade})` : '4A1')
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                    required
                  >
                    <option value="none">-- Chưa phân công quản lý lớp nào (None) --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name} ({c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái phê duyệt *
                  </label>
                  <select
                    value={editingTeacher.status}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, status: e.target.value as TeacherApprovalStatus })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 focus:outline-none"
                  >
                    <option value="approved">✓ Đã duyệt (Cho phép đăng nhập)</option>
                    <option value="pending">⏳ Chờ duyệt</option>
                    <option value="rejected">🚫 Đã khóa / Từ chối</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Số điện thoại</span>
                </label>
                <input
                  type="text"
                  value={editingTeacher.phone || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                  placeholder="0988 123 456..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={editingTeacher.note || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, note: e.target.value })}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-md cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: PHÊ DUYỆT TÀI KHOẢN VÀ CHỌN LỚP PHỤ TRÁCH */}
      {/* ===================================================================== */}
      {approvingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Phê Duyệt Tài Khoản Google Giáo Viên
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Xác nhận phê duyệt cho <strong>{approvingTeacher.displayName}</strong> ({approvingTeacher.email}) có quyền đăng nhập vào phần mềm với vai trò giáo viên.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <label className="block font-bold text-slate-700">
                Chọn lớp giáo viên sẽ phụ trách:
              </label>
              <select
                value={selectedAssignClassId}
                onChange={(e) => setSelectedAssignClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-indigo-950 focus:outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} ({c.grade}) {c.teacherName ? `• GV hiện tại: ${c.teacherName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingTeacher(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Xác Nhận Phê Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: XÁC NHẬN XÓA TÀI KHOẢN GOOGLE GIÁO VIÊN */}
      {/* ===================================================================== */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Xóa Tài Khoản Google Giáo Viên?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Bạn có chắc chắn muốn xóa tài khoản của giáo viên{' '}
                <strong className="text-rose-700 font-black">{teacherToDelete.displayName}</strong>{' '}
                (<span className="font-mono text-[11px]">{teacherToDelete.email}</span>)?
                <br />
                Giáo viên này sẽ không thể đăng nhập vào lớp học cho đến khi được thêm lại hoặc phê duyệt mới.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteRegisteredTeacher(teacherToDelete.id);
                  setTeacherToDelete(null);
                  confetti({ particleCount: 30, spread: 40 });
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RESET MẬT KHẨU GIÁO VIÊN (Tùy chọn hoặc Ngẫu nhiên) */}
      {/* ===================================================================== */}
      {resettingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Đặt Lại Mật Khẩu
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cấp lại mật khẩu đăng nhập cho giáo viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResettingTeacher(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Teacher Profile Info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm shrink-0">
                {resettingTeacher.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 text-xs truncate">
                  {resettingTeacher.displayName}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                  <span>User: <strong className="text-indigo-700">{resettingTeacher.username || 'Chưa đặt'}</strong></span>
                  <span>•</span>
                  <span className="truncate">{resettingTeacher.email}</span>
                </div>
              </div>
            </div>

            {/* Choice: Random vs Custom */}
            <div className="space-y-3 text-xs">
              <label className="block font-black text-slate-800">
                Phương thức đặt mật khẩu mới:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordTab('random');
                    handleGenerateRandomPassword();
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    resetPasswordTab === 'random'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 font-black text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600 font-bold hover:bg-slate-50'
                  }`}
                >
                  <div className="text-base mb-1">🎲</div>
                  <div>Mật Khẩu Ngẫu Nhiên</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">Tạo 6 số tự động</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordTab('custom');
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    resetPasswordTab === 'custom'
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300 font-black text-indigo-900'
                      : 'bg-white border-slate-200 text-slate-600 font-bold hover:bg-slate-50'
                  }`}
                >
                  <div className="text-base mb-1">✍️</div>
                  <div>Mật Khẩu Tùy Chọn</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">Tự nhập theo ý muốn</div>
                </button>
              </div>

              {/* Input or Random Generator display */}
              {resetPasswordTab === 'random' ? (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800">Mã mật khẩu ngẫu nhiên vừa tạo:</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[11px] text-amber-900 font-black flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Tạo mã khác</span>
                    </button>
                  </div>
                  <div className="text-2xl font-mono font-black text-center text-amber-950 tracking-widest py-1 bg-white rounded-xl border border-amber-300">
                    {customNewPassword}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">
                    Nhập mật khẩu mới tùy chọn:
                  </label>
                  <input
                    type="text"
                    value={customNewPassword}
                    onChange={(e) => setCustomNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới cho GV..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <div className="text-[10px] text-slate-400">
                    Gợi ý: Mật khẩu nên dễ nhớ (ví dụ: gv123456, lop4a1@2025,...)
                  </div>
                </div>
              )}

              {/* Copy preview box */}
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-[11px] text-slate-700 space-y-1 font-mono">
                <div className="font-sans font-bold text-slate-500 text-[10px] uppercase">Thông tin bàn giao cho GV:</div>
                <div className="flex justify-between items-center">
                  <span>Tài khoản: <strong>{resettingTeacher.username || resettingTeacher.email}</strong></span>
                  <span>MK: <strong>{customNewPassword}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Tài khoản: ${resettingTeacher.username || resettingTeacher.email}\nMật khẩu: ${customNewPassword}`;
                      navigator.clipboard.writeText(text);
                      showToast('Đã sao chép tài khoản & mật khẩu!');
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded font-sans text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                  >
                    Sao chép
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResettingTeacher(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Xác Nhận Đổi Mật Khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: CONFIRM RESET FOR NEW MONTH (30 Days Cycle) */}
      {/* ===================================================================== */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Làm Mới Thống Kê Cho Tháng Mới?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Hành động này sẽ thiết lập lại chu kỳ thống kê chuyên cần và bán trú cho tháng mới.
                <br />
                <strong className="text-emerald-700 font-black">
                  ✓ Toàn bộ dữ liệu lớp học, danh sách học sinh và điểm số xu tích lũy sẽ được giữ nguyên 100%!
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetMonth}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Xác Nhận Làm Mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: IN BÁO CÁO CHI TIẾT & XUẤT PDF KHỔ A4 TOÀN TRƯỜNG */}
      {/* ===================================================================== */}
      {isPrintReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Báo Cáo Chi Tiết Số Liệu Toàn Trường (Khổ A4 Chuẩn Sư Phạm)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Bao gồm bảng biểu phân tích số liệu và biểu đồ so sánh thông tin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: The A4 Document */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
              <div
                id="school-stats-report-a4"
                className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 sm:p-8 space-y-5 text-slate-800 text-xs max-w-[780px] mx-auto"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
              >
                {/* Formal Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                  <div className="text-center space-y-0.5">
                    <div className="text-[11px] font-bold uppercase text-slate-600">PHÒNG GD&ĐT HUYỆN / THÀNH PHỐ</div>
                    <div className="text-xs font-black uppercase text-indigo-950">TRƯỜNG TIỂU HỌC SỐ 1 TÂN UYÊN</div>
                    <div className="text-[10px] text-slate-500 font-semibold">HỆ SINH THÁI LỚP HỌC HẠNH PHÚC</div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-xs font-black uppercase tracking-tight text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="text-[11px] font-bold text-slate-700 italic">Độc lập - Tự do - Hạnh phúc</div>
                    <div className="text-[10px] text-slate-500">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-1 pt-1">
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">
                    BÁO CÁO TỔNG QUAN & THỐNG KÊ SỐ LIỆU TOÀN TRƯỜNG
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium italic">
                    (Số liệu cập nhật chuyên cần, sĩ số, giới tính, ăn bán trú và điểm thi đua phong trào)
                  </p>
                </div>

                {/* KPI Summary Grid */}
                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Tổng Số Lớp</span>
                    <div className="text-lg font-black text-slate-900">{metrics.totalClasses}</div>
                    <span className="text-[9px] text-slate-400">5 Khối lớp</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-center">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase block">Tổng Sĩ Số</span>
                    <div className="text-lg font-black text-indigo-900">{metrics.totalStudents}</div>
                    <span className="text-[9px] text-indigo-600">Nam: {metrics.totalMale} • Nữ: {metrics.totalFemale}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase block">Có Mặt Hôm Nay</span>
                    <div className="text-lg font-black text-emerald-800">{metrics.totalPresent}</div>
                    <span className="text-[9px] text-emerald-700 font-bold">{metrics.attendanceRate}% chuyên cần</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-700 font-bold uppercase block">Ăn Bán Trú</span>
                    <div className="text-lg font-black text-amber-800">{metrics.totalBoarding}</div>
                    <span className="text-[9px] text-amber-700 font-bold">{metrics.boardingRate}% học sinh</span>
                  </div>
                </div>

                {/* Table 1: Detailed Classes Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                    I. BẢNG TỔNG HỢP CHI TIẾT SỐ LIỆU CÁC LỚP HỌC:
                  </div>
                  <table className="w-full border-collapse text-[11px] border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                        <th className="p-1.5 border border-slate-300 text-center w-8">STT</th>
                        <th className="p-1.5 border border-slate-300 text-left">Tên Lớp</th>
                        <th className="p-1.5 border border-slate-300 text-center">Khối</th>
                        <th className="p-1.5 border border-slate-300 text-left">GV Chủ Nhiệm</th>
                        <th className="p-1.5 border border-slate-300 text-center">Sĩ số</th>
                        <th className="p-1.5 border border-slate-300 text-center">Có mặt</th>
                        <th className="p-1.5 border border-slate-300 text-center">Vắng</th>
                        <th className="p-1.5 border border-slate-300 text-center">Tỉ lệ CC</th>
                        <th className="p-1.5 border border-slate-300 text-center">Nam/Nữ</th>
                        <th className="p-1.5 border border-slate-300 text-center">Bán trú</th>
                        <th className="p-1.5 border border-slate-300 text-center">Điểm TB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {metrics.classDetails.map((cls, idx) => (
                        <tr key={cls.id} className="hover:bg-slate-50">
                          <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-200 font-black text-slate-900">{cls.name}</td>
                          <td className="p-1.5 border border-slate-200 text-center font-semibold text-slate-600">{cls.grade}</td>
                          <td className="p-1.5 border border-slate-200 font-medium text-slate-700">{cls.teacherName || '—'}</td>
                          <td className="p-1.5 border border-slate-200 text-center font-black">{cls.totalStudents}</td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold text-emerald-700">{cls.present}</td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold text-rose-700">{cls.totalAbsence}</td>
                          <td className="p-1.5 border border-slate-200 text-center font-black text-emerald-800">{cls.attendanceRate}%</td>
                          <td className="p-1.5 border border-slate-200 text-center font-medium">{cls.male}/{cls.female}</td>
                          <td className="p-1.5 border border-slate-200 text-center font-medium">{cls.boarding} ({cls.boardingRate}%)</td>
                          <td className="p-1.5 border border-slate-200 text-center font-black text-amber-700">🪙 {cls.avgPoints}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <td colSpan={4} className="p-1.5 border border-slate-300 text-center uppercase">Tổng cộng toàn trường:</td>
                        <td className="p-1.5 border border-slate-300 text-center">{metrics.totalStudents}</td>
                        <td className="p-1.5 border border-slate-300 text-center text-emerald-800">{metrics.totalPresent}</td>
                        <td className="p-1.5 border border-slate-300 text-center text-rose-800">{metrics.totalAbsence}</td>
                        <td className="p-1.5 border border-slate-300 text-center text-emerald-800">{metrics.attendanceRate}%</td>
                        <td className="p-1.5 border border-slate-300 text-center">{metrics.totalMale}/{metrics.totalFemale}</td>
                        <td className="p-1.5 border border-slate-300 text-center">{metrics.totalBoarding} ({metrics.boardingRate}%)</td>
                        <td className="p-1.5 border border-slate-300 text-center">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section II: Comparison Charts (Biểu đồ so sánh thông tin) */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                    II. HỆ THỐNG BIỂU ĐỒ SO SÁNH THÔNG TIN:
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Biểu đồ 1: Sĩ số & Có mặt các lớp */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-700 block text-center">
                        So sánh Sĩ số và Có mặt theo Lớp
                      </span>
                      <div className="space-y-1.5 pt-1">
                        {metrics.classDetails.slice(0, 6).map((c) => (
                          <div key={c.id} className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>Lớp {c.name}</span>
                              <span className="text-emerald-700">{c.present}/{c.totalStudents} em ({c.attendanceRate}%)</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${c.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Biểu đồ 2: Cơ cấu giới tính & Bán trú */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-700 block text-center">
                        Cơ cấu Giới tính & Bán trú toàn trường
                      </span>
                      <div className="flex items-center justify-around py-1">
                        <div className="text-center">
                          <div className="text-base font-black text-blue-700">{metrics.totalMale}</div>
                          <span className="text-[10px] font-bold text-blue-600 block">Nam ({metrics.totalStudents > 0 ? Math.round((metrics.totalMale / metrics.totalStudents) * 100) : 0}%)</span>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-black text-rose-700">{metrics.totalFemale}</div>
                          <span className="text-[10px] font-bold text-rose-600 block">Nữ ({metrics.totalStudents > 0 ? Math.round((metrics.totalFemale / metrics.totalStudents) * 100) : 0}%)</span>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-black text-amber-700">{metrics.totalBoarding}</div>
                          <span className="text-[10px] font-bold text-amber-600 block">Bán trú ({metrics.boardingRate}%)</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
                        <div>• Vắng có phép: <strong>{metrics.excused} lượt</strong> • Vắng không phép: <strong>{metrics.unexcused} lượt</strong></div>
                        <div>• Nghỉ ốm: <strong>{metrics.sick} lượt</strong> • Việc riêng khác: <strong>{metrics.other} lượt</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-6 text-center">
                  <div className="space-y-12">
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900">NGƯỜI LẬP BÁO CÁO</div>
                      <div className="text-[10px] text-slate-500 italic">(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div className="text-xs font-bold text-slate-800">Quản Trị Viên Hệ Thống</div>
                  </div>
                  <div className="space-y-12">
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900">HIỆU TRƯỞNG PHÊ DUYỆT</div>
                      <div className="text-[10px] text-slate-500 italic">(Ký tên, đóng dấu)</div>
                    </div>
                    <div className="text-xs font-bold text-slate-800">Ban Giám Hiệu Nhà Trường</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPrintReportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất File Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={handleDirectExportPdf}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải File PDF (A4)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintA4Direct}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Bản A4 Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
