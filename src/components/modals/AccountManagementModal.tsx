import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, Users, UserPlus, KeyRound, Trash2, Edit3, ShieldAlert,
  Database, Download, Upload, CheckCircle2, AlertCircle, RefreshCw, 
  School, Laptop, Check, Search, ShieldCheck, FileSpreadsheet,
  FileUp, ArrowDownToLine, AlertTriangle, Sparkles, History, Eye,
  Activity, Calendar, Clock, Filter, RotateCcw, GitBranch
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { databaseService, DatabaseStats, AuditLogItem, UserSummaryItem } from '../../services/databaseService';
import { useClassroom } from '../../context/ClassroomContext';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  allUsers: UserAccount[];
  onRefreshUsers: () => void;
  onSwitchToUser: (username: string) => Promise<boolean>;
}

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onRefreshUsers,
  onSwitchToUser
}) => {
  const { setIsGithubModalOpen } = useClassroom();
  const [activeTab, setActiveTab] = useState<'accounts' | 'add' | 'import' | 'real_data' | 'logs' | 'database'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Real data state
  const [userSummaries, setUserSummaries] = useState<UserSummaryItem[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLogUser, setSelectedLogUser] = useState<string>('ALL');
  const [selectedLogAction, setSelectedLogAction] = useState<string>('ALL');
  const [logSearchTerm, setLogSearchTerm] = useState<string>('');

  // Bulk import preview state
  const [importPreviewList, setImportPreviewList] = useState<Array<{
    stt: number;
    username: string;
    password?: string;
    fullName: string;
    role: UserRole;
    assignedClassName?: string;
    subjectName?: string;
    phone?: string;
    email?: string;
    schoolName?: string;
    statusText: string;
    isValid: boolean;
  }>>([]);

  // Form states for creating / editing user
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'homeroom' as UserRole,
    phone: '',
    email: '',
    assignedClassName: '4A1',
    subjectName: 'Tin học',
    schoolName: 'Trường Tiểu học số 1 Tân Uyên'
  });

  const [localUsage, setLocalUsage] = useState<{ bytes: number; sizeKB: number; formatted: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      onRefreshUsers();
      loadSummaries();
      loadAuditLogs();
      setLocalUsage(databaseService.getLocalStorageUsage());
    }
  }, [isOpen]);

  const handleCompactDatabase = async () => {
    setLoading(true);
    try {
      const res = await databaseService.compactDatabase();
      if (res.success) {
        showNotify('success', res.message || 'Đã nén và tối ưu hóa database thành công!');
        if (res.stats) setStats(res.stats);
        setLocalUsage(databaseService.getLocalStorageUsage());
      } else {
        showNotify('error', res.message || 'Lỗi khi tối ưu hóa database.');
      }
    } catch (err: any) {
      showNotify('error', err?.message || 'Lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'real_data') {
      loadSummaries();
    } else if (activeTab === 'logs') {
      loadAuditLogs();
    }
  }, [activeTab, selectedLogUser, selectedLogAction]);

  const loadStats = async () => {
    const s = await databaseService.getDatabaseStats();
    if (s) setStats(s);
  };

  const loadSummaries = async () => {
    setLoadingSummaries(true);
    try {
      const data = await databaseService.getUserDataSummaries();
      setUserSummaries(data);
    } catch (_) {}
    finally {
      setLoadingSummaries(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await databaseService.getAuditLogs({
        username: selectedLogUser !== 'ALL' ? selectedLogUser : undefined,
        actionType: selectedLogAction !== 'ALL' ? selectedLogAction : undefined,
        limit: 300
      });
      setAuditLogs(logs);
    } catch (_) {}
    finally {
      setLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thao tác không?')) return;
    const ok = await databaseService.clearAuditLogs();
    if (ok) {
      setAuditLogs([]);
      showNotify('success', 'Đã xóa toàn bộ lịch sử thao tác hệ thống!');
    } else {
      showNotify('error', 'Không thể xóa lịch sử thao tác.');
    }
  };

  const handleDownloadTeacherData = async (u: UserAccount | UserSummaryItem | any) => {
    try {
      const data = await databaseService.loadUserData(u.username);
      if (!data) {
        showNotify('error', `Tài khoản ${u.username} chưa có dữ liệu riêng.`);
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Du_Lieu_${u.username}_${u.role}_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotify('success', `Đã tải xuống file JSON dữ liệu thực tế của ${u.fullName}!`);
    } catch (err: any) {
      showNotify('error', err?.message || 'Lỗi khi tải dữ liệu.');
    }
  };

  if (!isOpen) return null;

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleStartCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '123456',
      fullName: '',
      role: 'homeroom',
      phone: '',
      email: '',
      assignedClassName: '4A1',
      subjectName: 'Tin học',
      schoolName: 'Trường Tiểu học số 1 Tân Uyên'
    });
    setActiveTab('add');
  };

  const handleStartEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName,
      role: user.role,
      phone: user.phone || '',
      email: user.email || '',
      assignedClassName: user.assignedClassName || '4A1',
      subjectName: user.subjectName || 'Tin học',
      schoolName: user.schoolName || 'Trường Tiểu học số 1 Tân Uyên'
    });
    setActiveTab('add');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showNotify('error', 'Vui lòng nhập họ và tên giáo viên.');
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        // Update user
        const res = await databaseService.updateUser(editingUser.id, {
          fullName: formData.fullName,
          role: formData.role,
          phone: formData.phone,
          email: formData.email,
          assignedClassName: formData.assignedClassName,
          subjectName: formData.subjectName,
          schoolName: formData.schoolName
        });
        if (res.success) {
          showNotify('success', 'Đã cập nhật thông tin tài khoản thành công!');
          onRefreshUsers();
          setActiveTab('accounts');
        } else {
          showNotify('error', res.message || 'Không thể cập nhật tài khoản.');
        }
      } else {
        // Create user
        if (!formData.username.trim()) {
          showNotify('error', 'Vui lòng nhập tên đăng nhập.');
          setLoading(false);
          return;
        }
        const res = await databaseService.createUser({
          username: formData.username.trim(),
          password: formData.password || '123456',
          fullName: formData.fullName.trim(),
          role: formData.role,
          phone: formData.phone,
          email: formData.email,
          assignedClassName: formData.assignedClassName,
          subjectName: formData.subjectName,
          schoolName: formData.schoolName
        });
        if (res.success) {
          showNotify('success', `Đã thêm tài khoản "${formData.username}" thành công!`);
          onRefreshUsers();
          setActiveTab('accounts');
        } else {
          showNotify('error', res.message || 'Không thể tạo tài khoản.');
        }
      }
    } catch (err: any) {
      showNotify('error', err?.message || 'Lỗi kết nối khi lưu tài khoản.');
    } finally {
      setLoading(false);
      loadStats();
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.username.toLowerCase() === 'admin') {
      showNotify('error', 'Không được phép xóa tài khoản quản trị tối cao.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.fullName}" (${user.username})?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await databaseService.deleteUser(user.id);
      if (res.success) {
        showNotify('success', `Đã xóa tài khoản "${user.username}" khỏi hệ thống.`);
        onRefreshUsers();
        loadStats();
      } else {
        showNotify('error', res.message || 'Không thể xóa tài khoản.');
      }
    } catch (err: any) {
      showNotify('error', err?.message || 'Lỗi khi xóa tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: UserAccount) => {
    const newPass = window.prompt(`Nhập mật khẩu mới cho tài khoản "${user.username}":`, '123456');
    if (!newPass) return;

    setLoading(true);
    try {
      const res = await databaseService.resetPassword(user.id, newPass);
      if (res.success) {
        showNotify('success', res.message || `Đã đặt lại mật khẩu cho ${user.username} thành công!`);
      } else {
        showNotify('error', res.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: any) {
      showNotify('error', err?.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (username: string) => {
    setLoading(true);
    try {
      await onSwitchToUser(username);
      showNotify('success', `Đã chuyển sang không gian làm việc của: ${username}`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      showNotify('error', err?.message || 'Không thể chuyển tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatabase = () => {
    databaseService.downloadDatabaseExport();
    showNotify('success', 'Đã tải xuống file cơ sở dữ liệu classroom_database.json thành công!');
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setLoading(true);
        const res = await databaseService.importDatabase(json);
        if (res.success) {
          showNotify('success', 'Đã nhập cơ sở dữ liệu thành công! Đang tải lại dữ liệu...');
          onRefreshUsers();
          loadStats();
        } else {
          showNotify('error', res.message || 'Lỗi khôi phục cơ sở dữ liệu.');
        }
      } catch (err: any) {
        showNotify('error', 'Tệp tin không đúng định dạng JSON cơ sở dữ liệu.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 1. Chức năng xuất file Excel tài khoản user của giáo viên (User requirement)
  const handleExportUsersToExcel = () => {
    try {
      const dataRows = allUsers.map((u, idx) => ({
        'STT': idx + 1,
        'Tên đăng nhập': u.username,
        'Mật khẩu': u.password || '123456',
        'Họ và tên giáo viên': u.fullName,
        'Vai trò': u.role === 'admin' ? 'Quản trị viên' : u.role === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn',
        'Lớp chủ nhiệm / Môn dạy': u.role === 'homeroom' ? (u.assignedClassName || 'Chưa gán') : (u.subjectName || 'Tin học'),
        'Số điện thoại': u.phone || '',
        'Email': u.email || '',
        'Đơn vị trường học': u.schoolName || 'Trường Tiểu học số 1 Tân Uyên',
        'Trạng thái': u.status === 'locked' ? 'Tạm khóa' : 'Đang hoạt động',
        'Ngày tạo': u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mặc định'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 12 },
        { wch: 26 },
        { wch: 18 },
        { wch: 24 },
        { wch: 15 },
        { wch: 26 },
        { wch: 32 },
        { wch: 16 },
        { wch: 16 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TaiKhoanGiaoVien');

      const fileName = `Danh_sach_tai_khoan_giao_vien_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showNotify('success', `Đã xuất thành công danh sách ${allUsers.length} tài khoản giáo viên ra file Excel!`);
    } catch (err: any) {
      showNotify('error', err?.message || 'Có lỗi xảy ra khi xuất file Excel tài khoản.');
    }
  };

  // 2. Chức năng tải biểu mẫu Excel mẫu để nhập đồng loạt
  const handleDownloadTemplate = () => {
    try {
      const templateRows = [
        {
          'STT': 1,
          'Tên đăng nhập': 'gvcn_1a1',
          'Mật khẩu': '123456',
          'Họ và tên giáo viên': 'Cô Trần Thị Lan',
          'Vai trò (GVCN hoặc GVBM)': 'GV Chủ nhiệm',
          'Lớp chủ nhiệm / Môn giảng dạy': '1A1',
          'Số điện thoại': '0912345671',
          'Email': 'co.lan@truong.edu.vn',
          'Đơn vị trường học': 'Trường Tiểu học số 1 Tân Uyên'
        },
        {
          'STT': 2,
          'Tên đăng nhập': 'gvcn_2a1',
          'Mật khẩu': '123456',
          'Họ và tên giáo viên': 'Thầy Hoàng Văn Bách',
          'Vai trò (GVCN hoặc GVBM)': 'GV Chủ nhiệm',
          'Lớp chủ nhiệm / Môn giảng dạy': '2A1',
          'Số điện thoại': '0912345672',
          'Email': 'thay.bach@truong.edu.vn',
          'Đơn vị trường học': 'Trường Tiểu học số 1 Tân Uyên'
        },
        {
          'STT': 3,
          'Tên đăng nhập': 'gvbm_anh01',
          'Mật khẩu': '123456',
          'Họ và tên giáo viên': 'Cô Lê Minh Thư',
          'Vai trò (GVCN hoặc GVBM)': 'GV Bộ môn',
          'Lớp chủ nhiệm / Môn giảng dạy': 'Tiếng Anh',
          'Số điện thoại': '0912345673',
          'Email': 'co.thu@truong.edu.vn',
          'Đơn vị trường học': 'Trường Tiểu học số 1 Tân Uyên'
        },
        {
          'STT': 4,
          'Tên đăng nhập': 'gvbm_nhac01',
          'Mật khẩu': '123456',
          'Họ và tên giáo viên': 'Thầy Phạm Quốc Huy',
          'Vai trò (GVCN hoặc GVBM)': 'GV Bộ môn',
          'Lớp chủ nhiệm / Môn giảng dạy': 'Âm nhạc',
          'Số điện thoại': '0912345674',
          'Email': 'thay.huy@truong.edu.vn',
          'Đơn vị trường học': 'Trường Tiểu học số 1 Tân Uyên'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateRows);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 12 },
        { wch: 24 },
        { wch: 24 },
        { wch: 28 },
        { wch: 16 },
        { wch: 26 },
        { wch: 32 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bieu_Mau_Tai_Khoan');
      XLSX.writeFile(workbook, 'Bieu_mau_tao_tai_khoan_giao_vien.xlsx');
      showNotify('success', 'Đã tải biểu mẫu Excel thành công! Mở file và điền danh sách giáo viên.');
    } catch (err: any) {
      showNotify('error', err?.message || 'Có lỗi khi tải biểu mẫu.');
    }
  };

  // 3. Đọc và phân tích file Excel import biểu mẫu
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawRows.length === 0) {
          showNotify('error', 'Tệp Excel không có dòng dữ liệu nào.');
          return;
        }

        const existingUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));
        const batchUsernames = new Set<string>();

        const parsedAccounts = rawRows.map((row, idx) => {
          const getVal = (candidates: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase();
              if (candidates.some(c => cleanKey.includes(c.toLowerCase()))) {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const usernameRaw = getVal(['tên đăng nhập', 'tài khoản', 'username', 'login']);
          const fullName = getVal(['họ và tên', 'họ tên', 'tên giáo viên', 'fullname', 'name']) || usernameRaw;
          const password = getVal(['mật khẩu', 'password', 'pass']) || '123456';
          const roleRaw = getVal(['vai trò', 'chức vụ', 'role']);
          const classOrSubject = getVal(['lớp', 'môn', 'phụ trách', 'bộ môn', 'chủ nhiệm']);
          const phone = getVal(['điện thoại', 'sđt', 'phone', 'mobile']);
          const email = getVal(['email', 'thư điện tử']);
          const schoolName = getVal(['trường', 'đơn vị', 'school']) || 'Trường Tiểu học số 1 Tân Uyên';

          // Chuẩn hóa username: không dấu, viết thường, không khoảng cách
          const cleanUsername = usernameRaw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'd')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .toLowerCase();

          // Chuẩn hóa vai trò
          const roleLower = roleRaw.toLowerCase();
          const isSubject = roleLower.includes('bộ môn') || roleLower.includes('gvbm') || roleLower.includes('subject');
          const role: UserRole = isSubject ? 'subject' : 'homeroom';

          let statusText = 'Hợp lệ';
          let isValid = true;
          if (!cleanUsername || cleanUsername.length < 3) {
            statusText = 'Tên đăng nhập không hợp lệ (< 3 ký tự)';
            isValid = false;
          } else if (existingUsernames.has(cleanUsername)) {
            statusText = 'Trùng tên đăng nhập đã có';
            isValid = false;
          } else if (batchUsernames.has(cleanUsername)) {
            statusText = 'Trùng tên đăng nhập trong file';
            isValid = false;
          } else if (!fullName) {
            statusText = 'Thiếu họ và tên giáo viên';
            isValid = false;
          }

          if (isValid) {
            batchUsernames.add(cleanUsername);
          }

          return {
            stt: idx + 1,
            username: cleanUsername,
            password,
            fullName,
            role,
            assignedClassName: role === 'homeroom' ? (classOrSubject || 'Lớp mới') : undefined,
            subjectName: role === 'subject' ? (classOrSubject || 'Tin học') : undefined,
            phone,
            email,
            schoolName,
            statusText,
            isValid
          };
        });

        setImportPreviewList(parsedAccounts);
        const validCount = parsedAccounts.filter(p => p.isValid).length;
        showNotify('success', `Đã phân tích ${parsedAccounts.length} dòng: ${validCount} hợp lệ sẵn sàng tạo!`);
      } catch (err: any) {
        showNotify('error', 'Lỗi khi đọc file Excel: ' + (err?.message || 'Tệp không đúng định dạng.'));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 4. Xác nhận tạo đồng loạt tài khoản từ danh sách hợp lệ
  const handleConfirmBulkCreate = async () => {
    const validItems = importPreviewList.filter(item => item.isValid);
    if (validItems.length === 0) {
      showNotify('error', 'Không có tài khoản hợp lệ nào trong danh sách xem trước.');
      return;
    }

    setLoading(true);
    try {
      const payload = validItems.map(item => ({
        username: item.username,
        password: item.password || '123456',
        fullName: item.fullName,
        role: item.role,
        phone: item.phone,
        email: item.email,
        assignedClassName: item.assignedClassName,
        subjectName: item.subjectName,
        schoolName: item.schoolName
      }));

      const res = await databaseService.createUsersBulk(payload);
      if (res.success) {
        showNotify('success', `Tạo thành công ${res.count} tài khoản giáo viên mới vào hệ thống!`);
        setImportPreviewList([]);
        onRefreshUsers();
        loadStats();
        setActiveTab('accounts');
      } else {
        showNotify('error', res.message || 'Lỗi khi tạo tài khoản đồng loạt.');
      }
    } catch (err: any) {
      showNotify('error', err?.message || 'Lỗi kết nối khi gửi dữ liệu tạo tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone && u.phone.includes(searchTerm)) ||
    (u.assignedClassName && u.assignedClassName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.subjectName && u.subjectName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] max-h-[820px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-5 md:px-7 md:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-tight">
                  Quản Trị Tài Khoản & Cơ Sở Dữ Liệu
                </h2>
                <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                  Admin Super
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Tài khoản độc lập • Lưu database trực tuyến trên ứng dụng • Đồng bộ GitHub Server
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation & quick action */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase ${
                activeTab === 'accounts'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tài Khoản ({allUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('real_data')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase ${
                activeTab === 'real_data'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Dữ Liệu Thực Tế</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase ${
                activeTab === 'logs'
                  ? 'bg-violet-600 text-white shadow-xs shadow-violet-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch Sử Thao Tác</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase ${
                activeTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Biểu Mẫu</span>
            </button>

            <button
              onClick={handleStartCreate}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase ${
                activeTab === 'add' && !editingUser
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm Mới</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase ${
                activeTab === 'database'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Database & GitHub</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              onRefreshUsers();
              loadStats();
              loadSummaries();
              loadAuditLogs();
              showNotify('success', 'Đã làm mới dữ liệu người dùng & nhật ký!');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Làm Mới</span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`mx-6 mt-3 p-3 rounded-2xl border text-xs font-black flex items-center justify-between animate-in slide-in-from-top-2 duration-150 ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Account List */}
        {activeTab === 'accounts' && (
          <div className="flex-1 overflow-y-auto p-5 md:p-7 flex flex-col">
            {/* Search Bar, Action Buttons & Summary Stats */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm tài khoản, họ tên, lớp, môn..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons: Export to Excel & Import Template (User requirements) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportUsersToExcel}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase shadow-xs transition-all hover-zoom-btn"
                  title="Xuất danh sách toàn bộ tài khoản giáo viên thành file Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>XUẤT EXCEL TÀI KHOẢN</span>
                </button>

                <button
                  onClick={() => setActiveTab('import')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-black uppercase shadow-2xs transition-all hover-zoom-btn"
                  title="Nhập biểu mẫu Excel để tạo tài khoản đồng loạt"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>IMPORT BIỂU MẪU</span>
                </button>

                <div className="flex items-center gap-1 text-xs font-bold text-slate-500 ml-1">
                  <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                    Tổng: <strong className="text-slate-900">{allUsers.length}</strong> TK
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hidden sm:inline">
                    GVCN: <strong>{allUsers.filter(u => u.role === 'homeroom').length}</strong>
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hidden sm:inline">
                    GVBM: <strong>{allUsers.filter(u => u.role === 'subject').length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Table of Users */}
            <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">STT</th>
                      <th className="py-3 px-3.5">Họ & Tên Giáo Viên</th>
                      <th className="py-3 px-3.5">Tên Đăng Nhập</th>
                      <th className="py-3 px-3.5 text-center">Vai Trò Được Gán</th>
                      <th className="py-3 px-3.5">Lớp / Môn Phụ Trách</th>
                      <th className="py-3 px-3.5">Số Điện Thoại</th>
                      <th className="py-3 px-3.5 text-right">Thao Tác Quản Trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredUsers.map((u, idx) => {
                      const isSelf = currentUser ? u.id === currentUser.id : false;
                      const isDefaultAdmin = u.username.toLowerCase() === 'admin';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username} 
                                alt={u.fullName}
                                className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-slate-50 shrink-0"
                              />
                              <div>
                                <div className="font-black text-slate-900 flex items-center gap-1.5">
                                  <span>{u.fullName}</span>
                                  {isSelf && (
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                      BẠN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{u.email || u.schoolName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <code className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border border-slate-200">
                              {u.username}
                            </code>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {u.role === 'admin' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                                <ShieldCheck className="w-3 h-3" />
                                Quản trị viên
                              </span>
                            )}
                            {u.role === 'homeroom' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <School className="w-3 h-3" />
                                GV Chủ nhiệm
                              </span>
                            )}
                            {u.role === 'subject' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <Laptop className="w-3 h-3" />
                                GV Bộ môn
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-700">
                            {u.role === 'homeroom' && (u.assignedClassName ? `Lớp ${u.assignedClassName}` : 'Chưa gán')}
                            {u.role === 'subject' && (u.subjectName ? `Môn ${u.subjectName}` : 'Chưa gán')}
                            {u.role === 'admin' && <span className="text-slate-400 italic">Toàn quyền hệ thống</span>}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 font-mono">
                            {u.phone || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Switch / View as user */}
                              <button
                                onClick={() => handleQuickSwitch(u.username)}
                                className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[11px] border border-indigo-200 transition-colors"
                                title="Đăng nhập / Xem không gian làm việc của tài khoản này"
                              >
                                Đăng nhập
                              </button>

                              {/* Edit details & Role */}
                              <button
                                onClick={() => handleStartEdit(u)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors"
                                title="Sửa thông tin hoặc gán lại quyền (GVCN / GVBM)"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Reset password */}
                              <button
                                onClick={() => handleResetPassword(u)}
                                className="p-1.5 rounded-xl hover:bg-amber-50 text-amber-600 hover:text-amber-800 border border-transparent hover:border-amber-200 transition-colors"
                                title="Đặt lại mật khẩu cho tài khoản này"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Delete account */}
                              {!isDefaultAdmin && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-500 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-colors"
                                  title="Xóa tài khoản này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Create / Edit User Form */}
        {activeTab === 'add' && (
          <div className="flex-1 overflow-y-auto p-5 md:p-8 flex justify-center">
            <form onSubmit={handleSaveUser} className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 uppercase">
                  {editingUser ? `Chỉnh Sửa Tài Khoản: ${editingUser.username}` : 'Thêm Mới Tài Khoản Giáo Viên'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập quyền hạn độc lập: Giáo viên chủ nhiệm (GVCN) hoặc Giáo viên bộ môn (GVBM)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Tên Đăng Nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!editingUser}
                    placeholder="Ví dụ: gvcn5a2, gvtienganh..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800 disabled:bg-slate-100"
                    required
                  />
                  {editingUser && <span className="text-[10px] text-slate-400">Không thể đổi tên đăng nhập</span>}
                </div>

                {/* Password (for new user) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Mật Khẩu Khởi Tạo
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Để trống nếu không đổi' : 'Mặc định: 123456'}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                {/* Full name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Họ Và Tên Giáo Viên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ví dụ: Thầy Trần Quang Vinh, Cô Phạm Thu Hà..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                    required
                  />
                </div>

                {/* Role selection (User requirement: Gán chức năng cho tài khoản là GVCN hay GVBM) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase mb-2">
                    Gán Vai Trò & Chức Năng Hoạt Động <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`p-3.5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      formData.role === 'homeroom' 
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-indigo-600" />
                          <span className="font-black text-xs text-slate-900 uppercase">GV CHỦ NHIỆM</span>
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={formData.role === 'homeroom'}
                          onChange={() => setFormData({ ...formData, role: 'homeroom' })}
                          className="w-4 h-4 text-indigo-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Quản lý lớp chủ nhiệm, điểm danh, infographic, sơ đồ lớp 3D, thi đua.
                      </p>
                    </label>

                    <label className={`p-3.5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      formData.role === 'subject' 
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-emerald-600" />
                          <span className="font-black text-xs text-slate-900 uppercase">GV BỘ MÔN</span>
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={formData.role === 'subject'}
                          onChange={() => setFormData({ ...formData, role: 'subject' })}
                          className="w-4 h-4 text-emerald-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Quản lý nhiều lớp dạy (lên đến 20 lớp), TKB bộ môn theo mẫu, chấm sao.
                      </p>
                    </label>

                    <label className={`p-3.5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      formData.role === 'admin' 
                        ? 'border-rose-600 bg-rose-50/60 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-rose-600" />
                          <span className="font-black text-xs text-slate-900 uppercase">QUẢN TRỊ VIÊN</span>
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={formData.role === 'admin'}
                          onChange={() => setFormData({ ...formData, role: 'admin' })}
                          className="w-4 h-4 text-rose-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Toàn quyền quản lý tài khoản, gán quyền, reset pass, quản trị database.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Conditional fields based on role */}
                {formData.role === 'homeroom' && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                      Lớp Chủ Nhiệm Phụ Trách
                    </label>
                    <input
                      type="text"
                      value={formData.assignedClassName}
                      onChange={(e) => setFormData({ ...formData, assignedClassName: e.target.value })}
                      placeholder="Ví dụ: 4A1, 5A2..."
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                    />
                  </div>
                )}

                {formData.role === 'subject' && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                      Môn Giảng Dạy Bộ Môn
                    </label>
                    <input
                      type="text"
                      value={formData.subjectName}
                      onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                      placeholder="Ví dụ: Tin học, Tiếng Anh, Mĩ thuật, Âm nhạc..."
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Số Điện Thoại / Zalo
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ví dụ: 0988 123 456"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Email Liên Hệ
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="giaovien@lophoc.edu.vn"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Đơn Vị Trường Học
                  </label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="Trường Tiểu học số 1 Tân Uyên"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('accounts')}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs uppercase"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase shadow-md shadow-indigo-600/25 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {loading ? 'Đang lưu...' : editingUser ? 'LƯU THAY ĐỔI' : 'TẠO TÀI KHOẢN MỚI'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab: Import Excel Template to Batch Create Teacher Accounts (User requirement) */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto p-5 md:p-8 flex flex-col space-y-6">
            {/* Intro banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
                  <FileSpreadsheet className="w-7 h-7 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black uppercase tracking-tight">
                    Tạo Tài Khoản Cho Giáo Viên Đồng Loạt Bằng Cách Import Biểu Mẫu
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5">
                    Tải biểu mẫu Excel chuẩn, điền danh sách giáo viên chủ nhiệm & bộ môn, sau đó tải lên để hệ thống tự động khởi tạo độc lập
                  </p>
                </div>
              </div>
            </div>

            {/* 2 Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Step 1: Download template */}
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Tải Biểu Mẫu Excel Chuẩn (.xlsx)</h4>
                      <p className="text-xs text-slate-500">Đã định dạng sẵn các cột thông tin và dữ liệu mẫu minh họa</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tải về biểu mẫu <code className="bg-slate-100 text-indigo-700 font-mono font-bold px-1.5 py-0.5 rounded">Bieu_mau_tao_tai_khoan_giao_vien.xlsx</code> chứa các trường: STT, Tên đăng nhập, Mật khẩu, Họ và tên giáo viên, Vai trò (GVCN/GVBM), Lớp/Môn, Số điện thoại, Email, Trường học.
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 hover-zoom-btn"
                  >
                    <Download className="w-4 h-4" />
                    <span>TẢI BIỂU MẪU MẪU .XLSX</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload Excel */}
              <div className="bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl p-6 shadow-2xs flex flex-col justify-between transition-colors bg-emerald-50/20">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Chọn Tệp Excel Đã Điền</h4>
                      <p className="text-xs text-slate-500">Hỗ trợ các định dạng .xlsx, .xls</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tải tệp bảng tính Excel chứa danh sách các thầy cô giáo viên cần tạo tài khoản lên để hệ thống tự động kiểm tra và hiển thị bản xem trước.
                  </p>
                </div>

                <div className="mt-5">
                  <label className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-center hover-zoom-btn">
                    <Upload className="w-4 h-4" />
                    <span>CHỌN TỆP EXCEL ĐỂ PHÂN TÍCH</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Step 3: Preview Table & Confirm Bulk Action */}
            {importPreviewList.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Kết Quả Kiểm Tra Dữ Liệu ({importPreviewList.length} Dòng)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vui lòng đối chiếu danh sách bên dưới trước khi bấm xác nhận tạo đồng loạt tài khoản.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                      Hợp lệ: {importPreviewList.filter(i => i.isValid).length}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black">
                      Lỗi/Trùng: {importPreviewList.filter(i => !i.isValid).length}
                    </span>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">STT</th>
                        <th className="py-2.5 px-3">Tên Đăng Nhập</th>
                        <th className="py-2.5 px-3">Họ & Tên Giáo Viên</th>
                        <th className="py-2.5 px-3 text-center">Vai Trò</th>
                        <th className="py-2.5 px-3">Lớp / Môn</th>
                        <th className="py-2.5 px-3">SĐT</th>
                        <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreviewList.map((item) => (
                        <tr key={item.stt} className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                          <td className="py-2 px-3 text-center font-bold text-slate-400">{item.stt}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{item.username || '—'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{item.fullName}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.role === 'homeroom'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.role === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-700">
                            {item.role === 'homeroom' ? item.assignedClassName : item.subjectName}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono">{item.phone || '—'}</td>
                          <td className="py-2 px-3 text-right">
                            {item.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                <Check className="w-3 h-3" /> Hợp lệ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                <AlertTriangle className="w-3 h-3" /> {item.statusText}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Confirm Button */}
                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setImportPreviewList([])}
                    className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold uppercase"
                  >
                    HỦY DANH SÁCH XEM TRƯỚC
                  </button>

                  <button
                    onClick={handleConfirmBulkCreate}
                    disabled={loading || importPreviewList.filter(i => i.isValid).length === 0}
                    className="py-2.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-md shadow-emerald-600/25 flex items-center gap-2 disabled:opacity-50 hover-zoom-btn"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>XÁC NHẬN TẠO ({importPreviewList.filter(i => i.isValid).length}) TÀI KHOẢN GIÁO VIÊN</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Real Teacher Data Summary */}
        {activeTab === 'real_data' && (
          <div className="flex-1 overflow-y-auto p-5 md:p-7 flex flex-col space-y-5">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-black text-blue-950 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Dữ Liệu Thực Tế Của Từng Giáo Viên Trên Hệ Thống</span>
                </h3>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  Dữ liệu được lưu trữ độc lập và cập nhật trực tuyến tức thì khi giáo viên thêm/xóa/sửa lớp hay học sinh.
                </p>
              </div>

              <button
                onClick={loadSummaries}
                disabled={loadingSummaries}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSummaries ? 'animate-spin' : ''}`} />
                <span>Cập Nhật Số Liệu Thực</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng Giáo Viên</div>
                <div className="text-lg font-black text-slate-800 mt-1">{allUsers.length} tài khoản</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng Lớp Đang Dạy</div>
                <div className="text-lg font-black text-blue-600 mt-1">
                  {userSummaries.reduce((sum, u) => sum + (u.classCount || 0), 0)} lớp
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng Học Sinh Thực Tế</div>
                <div className="text-lg font-black text-emerald-600 mt-1">
                  {userSummaries.reduce((sum, u) => sum + (u.studentCount || 0), 0)} học sinh
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nhật Ký Thao Tác</div>
                <div className="text-lg font-black text-violet-600 mt-1">{auditLogs.length} bản ghi</div>
              </div>
            </div>

            {/* Table of Real Teacher Data */}
            <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">STT</th>
                      <th className="py-3 px-3.5">Giáo Viên & Tài Khoản</th>
                      <th className="py-3 px-3.5 text-center">Vai Trò</th>
                      <th className="py-3 px-3.5">Lớp Học Thực Tế & Sĩ Số</th>
                      <th className="py-3 px-3.5 text-center">Tổng HS</th>
                      <th className="py-3 px-3.5">Cập Nhật Gần Nhất</th>
                      <th className="py-3 px-3.5 text-right">Xem & Tải Dữ Liệu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {userSummaries.map((u, idx) => {
                      const isCurrent = currentUser?.username.toLowerCase() === u.username.toLowerCase();
                      return (
                        <tr key={u.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}&backgroundColor=b6e3f4`}
                                alt={u.fullName}
                                className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-slate-50 shrink-0"
                              />
                              <div>
                                <div className="font-black text-slate-900 flex items-center gap-1.5">
                                  <span>{u.fullName}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 uppercase">
                                      ĐANG XEM
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              u.role === 'admin'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : u.role === 'subject'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}>
                              {u.role === 'admin' ? 'Quản trị' : u.role === 'subject' ? 'GV Bộ môn' : 'GV Chủ nhiệm'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {u.classes && u.classes.length > 0 ? (
                                u.classes.map((c, cIdx) => (
                                  <span 
                                    key={c.id || cIdx} 
                                    className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700"
                                    title={`Lớp ${c.name} - ${c.studentCount} học sinh`}
                                  >
                                    {c.name} ({c.studentCount} HS)
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Chưa khởi tạo lớp</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center font-black text-slate-800">
                            {u.studentCount || 0}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                            {u.lastUpdated ? new Date(u.lastUpdated).toLocaleString('vi-VN') : 'Mặc định'}
                          </td>
                          <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleQuickSwitch(u.username)}
                              disabled={loading || isCurrent}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-black uppercase transition-colors inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                              title="Chuyển vào xem trực tiếp toàn bộ dữ liệu, lớp và học sinh của giáo viên này"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Vào Xem</span>
                            </button>
                            <button
                              onClick={() => handleDownloadTeacherData(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-black uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Tải về file JSON sao lưu dữ liệu của riêng giáo viên này"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tải JSON</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Audit Logs (Lịch sử thao tác của các tài khoản) */}
        {activeTab === 'logs' && (
          <div className="flex-1 overflow-y-auto p-5 md:p-7 flex flex-col space-y-4">
            {/* Filter and search bar */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* User filter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Giáo viên:</span>
                  <select
                    value={selectedLogUser}
                    onChange={(e) => setSelectedLogUser(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Tất cả giáo viên</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.username}>
                        {u.fullName} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action filter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>Hành động:</span>
                  <select
                    value={selectedLogAction}
                    onChange={(e) => setSelectedLogAction(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Tất cả thao tác</option>
                    <option value="CREATE_CLASS">Mở thêm lớp học</option>
                    <option value="UPDATE_CLASS">Chỉnh sửa lớp học</option>
                    <option value="DELETE_CLASS">Xóa lớp học</option>
                    <option value="ADD_STUDENT">Thêm mới học sinh</option>
                    <option value="UPDATE_STUDENT">Chỉnh sửa học sinh</option>
                    <option value="DELETE_STUDENT">Xóa học sinh</option>
                    <option value="BATCH_STUDENTS">Thêm hàng loạt học sinh</option>
                    <option value="AWARD_POINTS">Cộng/trừ xu thi đua</option>
                    <option value="ATTENDANCE">Điểm danh lớp</option>
                    <option value="RESTORE_DATA">Khôi phục dữ liệu</option>
                    <option value="OTHER">Đăng nhập / Thao tác khác</option>
                  </select>
                </div>

                {/* Search input */}
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logSearchTerm}
                    onChange={(e) => setLogSearchTerm(e.target.value)}
                    placeholder="Tìm trong nhật ký..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={loadAuditLogs}
                  disabled={loadingLogs}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black uppercase transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>Làm mới</span>
                </button>
                <button
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa lịch sử</span>
                </button>
              </div>
            </div>

            {/* Log List */}
            <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">STT</th>
                      <th className="py-3 px-3.5 w-40">Thời Gian</th>
                      <th className="py-3 px-3.5 w-48">Tài Khoản Thao Tác</th>
                      <th className="py-3 px-3.5 w-36 text-center">Phân Loại</th>
                      <th className="py-3 px-3.5">Chi Tiết Thao Tác Thực Tế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {auditLogs
                      .filter(l => 
                        !logSearchTerm.trim() || 
                        l.description.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
                        l.username.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
                        l.userFullName.toLowerCase().includes(logSearchTerm.toLowerCase())
                      )
                      .map((log, idx) => {
                        const actionColor = 
                          log.actionType === 'DELETE_STUDENT' || log.actionType === 'DELETE_CLASS'
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : log.actionType === 'CREATE_CLASS' || log.actionType === 'ADD_STUDENT' || log.actionType === 'BATCH_STUDENTS'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : log.actionType === 'AWARD_POINTS'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : log.actionType === 'ATTENDANCE'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : log.actionType === 'RESTORE_DATA'
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200';

                        const actionLabel = 
                          log.actionType === 'CREATE_CLASS' ? 'Mở thêm lớp' :
                          log.actionType === 'UPDATE_CLASS' ? 'Chỉnh sửa lớp' :
                          log.actionType === 'DELETE_CLASS' ? 'Xóa lớp học' :
                          log.actionType === 'ADD_STUDENT' ? 'Thêm học sinh' :
                          log.actionType === 'UPDATE_STUDENT' ? 'Sửa học sinh' :
                          log.actionType === 'DELETE_STUDENT' ? 'Xóa học sinh' :
                          log.actionType === 'BATCH_STUDENTS' ? 'Thêm hàng loạt' :
                          log.actionType === 'AWARD_POINTS' ? 'Cộng/trừ xu' :
                          log.actionType === 'ATTENDANCE' ? 'Điểm danh' :
                          log.actionType === 'RESTORE_DATA' ? 'Khôi phục dữ liệu' : 'Hoạt động';

                        return (
                          <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3.5 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="font-bold text-slate-900 leading-tight">
                                {log.userFullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{log.username} ({log.role === 'admin' ? 'Quản trị' : log.role === 'subject' ? 'GV Bộ môn' : 'GVCN'})
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${actionColor}`}>
                                {actionLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-800 font-bold leading-relaxed">
                              {log.description}
                            </td>
                          </tr>
                        );
                      })}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                          Chưa có lịch sử thao tác nào được ghi nhận. Các hoạt động như tạo lớp, xóa học sinh, cho điểm... sẽ hiển thị tại đây theo thời gian thực.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Database & GitHub Sync */}
        {activeTab === 'database' && (
          <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
            {/* Database Storage & System Quota Stats Card (Yêu cầu 4) */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 md:p-7 shadow-xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base md:text-lg font-black uppercase tracking-tight">
                        Thống Kê Toàn Bộ Dung Lượng Database Hệ Thống
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Trực Tuyến
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Đo lường dung lượng tệp JSON máy chủ, phân bổ theo từng giáo viên và bộ nhớ cache trình duyệt
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadStats}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-xl border border-white/15 transition-all hover-zoom-btn flex items-center gap-1.5 uppercase"
                    title="Làm mới lại thống kê dung lượng database"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Làm Mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompactDatabase}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/25 transition-all hover-zoom-btn flex items-center gap-1.5 uppercase"
                    title="Nén và tối ưu hóa tệp dữ liệu database"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tối Ưu Hóa DB</span>
                  </button>
                </div>
              </div>

              {/* 4 Primary Storage Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Total File Size */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-[11px] text-slate-400 uppercase font-black flex items-center justify-between">
                    <span>Tổng Tệp Database</span>
                    <span>💾</span>
                  </div>
                  <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                    {stats?.formattedSize || `${stats?.fileSizeKB || 0} KB`}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {stats?.fileSizeBytes ? `${stats.fileSizeBytes.toLocaleString()} bytes` : 'data/classroom_database.json'}
                  </div>
                </div>

                {/* User Classroom Data Size */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-[11px] text-slate-400 uppercase font-black flex items-center justify-between">
                    <span>Dữ Liệu Giáo Viên</span>
                    <span>👥</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                    {stats?.storageBreakdown?.userData.sizeKB || 0} KB
                  </div>
                  <div className="text-[10px] text-emerald-300 font-bold mt-1">
                    Chiếm {stats?.storageBreakdown?.userData.percent || 0}% dung lượng
                  </div>
                </div>

                {/* Audit Logs Size */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-[11px] text-slate-400 uppercase font-black flex items-center justify-between">
                    <span>Nhật Ký Thao Tác</span>
                    <span>📜</span>
                  </div>
                  <div className="text-2xl font-black text-violet-400 mt-1 font-mono">
                    {stats?.storageBreakdown?.auditLogs.sizeKB || 0} KB
                  </div>
                  <div className="text-[10px] text-violet-300 font-bold mt-1">
                    {stats?.storageBreakdown?.auditLogs.count || 0} bản ghi thao tác
                  </div>
                </div>

                {/* Browser LocalStorage Cache */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-[11px] text-slate-400 uppercase font-black flex items-center justify-between">
                    <span>Bộ Nhớ Trình Duyệt</span>
                    <span>⚡</span>
                  </div>
                  <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                    {localUsage?.formatted || '0 KB'}
                  </div>
                  <div className="text-[10px] text-cyan-300 font-bold mt-1">
                    Cache offline trình duyệt
                  </div>
                </div>
              </div>

              {/* Visual Storage Meter & Quota Bar */}
              <div className="bg-black/30 rounded-2xl p-4 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-300 uppercase flex items-center gap-1.5">
                    <span>📊</span>
                    <span>Định Mức Sử Dụng Hệ Thống:</span>
                    <strong className="text-amber-400">{stats?.formattedSize || `${stats?.fileSizeKB || 0} KB`}</strong>
                    <span className="text-slate-400">/ Định mức {stats?.storageQuotaMB || 50} MB</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Đã dùng: {stats?.percentOfQuota || 0.1}%
                  </span>
                </div>

                {/* Multi-segment Progress Bar */}
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${Math.max(stats?.storageBreakdown?.userData.percent || 60, 5)}%` }}
                    title={`Dữ liệu Giáo viên: ${stats?.storageBreakdown?.userData.sizeKB || 0} KB`}
                  />
                  <div 
                    className="h-full bg-violet-500 transition-all duration-500" 
                    style={{ width: `${Math.max(stats?.storageBreakdown?.auditLogs.percent || 25, 5)}%` }}
                    title={`Nhật ký Audit: ${stats?.storageBreakdown?.auditLogs.sizeKB || 0} KB`}
                  />
                  <div 
                    className="h-full bg-amber-400 transition-all duration-500" 
                    style={{ width: `${Math.max(stats?.storageBreakdown?.users.percent || 15, 3)}%` }}
                    title={`Tài khoản người dùng: ${stats?.storageBreakdown?.users.sizeKB || 0} KB`}
                  />
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Dữ liệu học tập các lớp ({stats?.storageBreakdown?.userData.percent || 0}%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                      <span>Nhật ký Audit Logs ({stats?.storageBreakdown?.auditLogs.percent || 0}%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Hồ sơ Tài khoản ({stats?.storageBreakdown?.users.percent || 0}%)</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Đồng bộ lần cuối: <strong className="text-slate-200">{stats?.lastSync ? new Date(stats.lastSync).toLocaleString('vi-VN') : 'Vừa xong'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* BẢNG THỐNG KÊ CHI TIẾT DUNG LƯỢNG TỪNG TÀI KHOẢN GIÁO VIÊN (Yêu cầu 4) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span>Chi Tiết Dung Lượng Sử Dụng Theo Từng Tài Khoản Giáo Viên</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê số lượng lớp, số học sinh và dung lượng dữ liệu độc lập của từng giáo viên trong database
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200 uppercase">
                  {stats?.userBreakdown?.length || allUsers.length} Tài Khoản
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">Tài Khoản / Họ Tên</th>
                      <th className="py-3 px-3">Vai Trò</th>
                      <th className="py-3 px-3 text-center">Số Lớp</th>
                      <th className="py-3 px-3 text-center">Số Học Sinh</th>
                      <th className="py-3 px-3 text-right">Dung Lượng (KB)</th>
                      <th className="py-3 px-3 text-center">% Chiếm Dụng</th>
                      <th className="py-3 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {stats?.userBreakdown && stats.userBreakdown.length > 0 ? (
                      stats.userBreakdown.map((item) => (
                        <tr key={item.username} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-black text-slate-900">{item.fullName}</div>
                            <div className="text-[11px] font-mono text-indigo-600">@{item.username}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-block ${
                              item.role === 'admin'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : item.role === 'homeroom'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {item.role === 'admin' ? 'Quản Trị' : item.role === 'homeroom' ? 'Chủ Nhiệm' : 'Bộ Môn'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {item.classesCount} lớp
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {item.studentsCount} HS
                          </td>
                          <td className="py-3 px-3 text-right font-black font-mono text-indigo-900">
                            {item.sizeKB} KB
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold font-mono text-[11px]">
                              {item.percentOfTotal}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadTeacherData({ username: item.username, fullName: item.fullName, role: item.role })}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
                                title="Tải xuống tệp dữ liệu của giáo viên này"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSwitch(item.username)}
                                className="px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors uppercase"
                                title="Chuyển sang tài khoản này"
                              >
                                Xem
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      allUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-black text-slate-900">{u.fullName}</div>
                            <div className="text-[11px] font-mono text-indigo-600">@{u.username}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">1 lớp</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">30 HS</td>
                          <td className="py-3 px-3 text-right font-black font-mono text-indigo-900">~12 KB</td>
                          <td className="py-3 px-3 text-center font-mono">15%</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleQuickSwitch(u.username)}
                              className="px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors uppercase"
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GitHub Server Continuous Auto-Sync & Push Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                  <GitBranch className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                    <span>ĐỒNG BỘ TỰ ĐỘNG GITHUB SERVER & ĐA MÁY TÍNH</span>
                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">REALTIME</span>
                  </h4>
                  <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                    Hệ thống tự động lưu vết và đẩy dữ liệu lên GitHub sau mỗi thao tác. Mọi máy tính đăng nhập cùng lúc đều nhận cập nhật ngay lập tức mà không cần bấm thủ công.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGithubModalOpen(true)}
                className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-2 hover:scale-102"
              >
                <GitBranch className="w-4 h-4" />
                <span>MỞ BẢNG ĐIỀU KHIỂN GITHUB SYNC</span>
              </button>
            </div>

            {/* GitHub Storage & Backup / Restore Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Box 1: Export DB */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Xuất Cơ Sở Dữ Liệu (.json)</h4>
                      <p className="text-xs text-slate-500">Tải về toàn bộ tài khoản và dữ liệu để đồng bộ GitHub Server</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    Tải về tệp <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">classroom_database.json</code> chứa toàn bộ tài khoản giáo viên, điểm số, học sinh, thời khóa biểu để đưa lên kho lưu trữ GitHub của bạn.
                  </p>
                </div>
                <div className="mt-5">
                  <button
                    onClick={handleExportDatabase}
                    className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>TẢI VỀ FILE DATABASE ĐỒNG BỘ GITHUB</span>
                  </button>
                </div>
              </div>

              {/* Box 2: Import DB */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Khôi Phục Dữ Liệu Từ GitHub</h4>
                      <p className="text-xs text-slate-500">Nhập tệp sao lưu database JSON để cập nhật toàn hệ thống</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    Tải tệp database đã lưu từ GitHub Server hoặc từ máy tính lên để khôi phục nhanh mọi tài khoản và dữ liệu lớp học mà không mất thông tin.
                  </p>
                </div>
                <div className="mt-5">
                  <label className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>CHỌN FILE .JSON ĐỂ KHÔI PHỤC</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportDatabase}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Architecture note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
              <span className="font-black">📌 Hướng dẫn vận hành với GitHub Server:</span>
              <ul className="list-disc pl-5 mt-1.5 space-y-1">
                <li>Dữ liệu được lưu trữ tự động trong thư mục <code className="bg-amber-100 px-1 rounded font-mono font-bold">data/classroom_database.json</code> ngay trên máy chủ Node.js/Express.</li>
                <li>Khi bạn đẩy mã nguồn lên GitHub (git commit & git push), file database này được bảo toàn và mang theo đầy đủ thông tin các giáo viên và lớp học.</li>
                <li>Khi tắt trình duyệt hoặc đổi thiết bị, đăng nhập bằng tài khoản cá nhân sẽ truy xuất đúng dữ liệu độc lập của giáo viên đó.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
