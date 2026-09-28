import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useClassroom } from '../../context/ClassroomContext';
import { Student, Classroom, Subject } from '../../types';
import { parseBulkStudentInput } from '../../utils/genderGuesser';
import { AvatarEditorModal } from '../modals/AvatarEditorModal';
import { ClassAvatarEditorModal } from '../modals/ClassAvatarEditorModal';
import { ExportStudentListModal } from '../modals/ExportStudentListModal';
import { 
  Users, UserPlus, ClipboardPaste, Camera, 
  Trash2, Edit3, Search, Check, Plus, Minus,
  Sparkles, School, ArrowRight, RotateCcw,
  Star, Award, CheckCircle2, ChevronRight, X,
  FileSpreadsheet, Download, Upload, Calendar, AlertTriangle, CheckSquare,
  Settings, BookOpen, Calculator, Globe, Atom, Map, Monitor, Palette, Music, Activity, Heart,
  Flame, HelpCircle, Layers, ZoomIn, Coins
} from 'lucide-react';
import { playCoinSound, playDeductSound, playFanfareSound } from '../../utils/audio';
import confetti from 'canvas-confetti';

const CLASS_COLORS = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6'  // Violet
];

// Presets for Class Avatars
const CLASS_AVATARS = [
  { id: 'ca-1', label: 'Tên Lửa', icon: '🚀', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=RocketClass&backgroundColor=6366f1' },
  { id: 'ca-2', label: 'Cúp Vàng', icon: '🏆', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ChampionCup&backgroundColor=f59e0b' },
  { id: 'ca-3', label: 'Sách Vở', icon: '📚', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=BookClass&backgroundColor=3b82f6' },
  { id: 'ca-4', label: 'Ngôi Sao', icon: '⭐', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=StarClass&backgroundColor=ec4899' },
  { id: 'ca-5', label: 'Khoa Học', icon: '🔬', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ScienceClass&backgroundColor=06b6d4' },
  { id: 'ca-6', label: 'Mầm Xanh', icon: '🌱', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=PlantClass&backgroundColor=10b981' },
  { id: 'ca-7', label: 'Trái Đất', icon: '🌍', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=EarthClass&backgroundColor=8b5cf6' },
  { id: 'ca-8', label: 'Họa Sĩ', icon: '🎨', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ArtClass&backgroundColor=ef4444' }
];

export const OFFICER_ROLE_OPTIONS = [
  { value: 'Thành viên', label: 'Thành viên (Học sinh)', icon: '🎒' },
  { value: 'Lớp trưởng', label: 'Lớp trưởng', icon: '⭐' },
  { value: 'Lớp phó học tập', label: 'Lớp phó học tập', icon: '📘' },
  { value: 'Lớp phó phong trào', label: 'Lớp phó phong trào', icon: '🚩' },
  { value: 'Lớp phó lao động', label: 'Lớp phó lao động', icon: '🌱' },
  { value: 'Tổ trưởng Tổ 1', label: 'Tổ trưởng Tổ 1', icon: '🏅' },
  { value: 'Tổ phó Tổ 1', label: 'Tổ phó Tổ 1', icon: '🎖️' },
  { value: 'Tổ trưởng Tổ 2', label: 'Tổ trưởng Tổ 2', icon: '🏅' },
  { value: 'Tổ phó Tổ 2', label: 'Tổ phó Tổ 2', icon: '🎖️' },
  { value: 'Tổ trưởng Tổ 3', label: 'Tổ trưởng Tổ 3', icon: '🏅' },
  { value: 'Tổ phó Tổ 3', label: 'Tổ phó Tổ 3', icon: '🎖️' },
  { value: 'Tổ trưởng Tổ 4', label: 'Tổ trưởng Tổ 4', icon: '🏅' },
  { value: 'Tổ phó Tổ 4', label: 'Tổ phó Tổ 4', icon: '🎖️' },
];

export const getRoleIcon = (roleName?: string) => {
  const match = OFFICER_ROLE_OPTIONS.find(o => o.value === roleName);
  return match ? match.icon : '🎖️';
};

interface ClassesStudentsViewProps {
  mode?: 'classes' | 'students';
  onNavigate?: (view: any) => void;
}

export const ClassesStudentsView: React.FC<ClassesStudentsViewProps> = ({ 
  mode = 'students',
  onNavigate 
}) => {
  const { 
    classes, activeClassId, setActiveClassId, addClass, updateClass, deleteClass, deleteAllClasses,
    students, currentClassStudents, addStudent, updateStudent, deleteStudent, 
    bulkAddStudents, clearClassStudents,
    awardPoints, deductPoints, resetStudentPoints, bulkSetPoints, subjects, addSubject, updateSubject, deleteSubject,
    criteria, teacherProfile, resetToDefaultData, attendanceRecords
  } = useClassroom();

  const [activeTabMode, setActiveTabMode] = useState<'classes' | 'students'>(mode);

  React.useEffect(() => {
    if (mode) setActiveTabMode(mode);
  }, [mode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  
  // Selection for bulk actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isDeleteAllClassesOpen, setIsDeleteAllClassesOpen] = useState(false);

  // Modal for Class Attendance & Overview Report (User Request)
  const [isClassReportModalOpen, setIsClassReportModalOpen] = useState(false);

  // Compute attendance metrics for active class today
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const currentAttendanceRec = attendanceRecords.find(r => r.classId === activeClassId && r.date === todayDateStr);
  const attMap = currentAttendanceRec?.records || {};
  const presentCount = currentClassStudents.filter(s => (attMap[s.id] || 'present') === 'present').length;
  const attendanceRate = currentClassStudents.length > 0
    ? Math.round((presentCount / currentClassStudents.length) * 100)
    : 100;

  // Modals for Coin Management (User Request: Xóa điểm xu & Gán điểm xu đồng loạt)
  const [isResetPointsModalOpen, setIsResetPointsModalOpen] = useState(false);
  const [isBulkSetPointsModalOpen, setIsBulkSetPointsModalOpen] = useState(false);
  const [bulkSetMode, setBulkSetMode] = useState<'fixed' | 'add' | 'deduct'>('fixed');
  const [bulkSetAmount, setBulkSetAmount] = useState<number>(10);
  const [bulkSetReason, setBulkSetReason] = useState<string>('Gán điểm xu đồng loạt');
  const [bulkSetSubject, setBulkSetSubject] = useState<string>('Toán');

  // Active Subject Selector for Quick Point Evaluation (User Request 2)
  const [activeEvalSubject, setActiveEvalSubject] = useState<string>('Toán');

  // Modals & form states for CLASS MANAGEMENT (User Request 1)
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Khối 4');
  const [newClassTeacher, setNewClassTeacher] = useState(teacherProfile.name || 'Cô Nguyễn Thị Hoa');
  const [newClassYear, setNewClassYear] = useState(teacherProfile.academicYear || '2026 – 2027');
  const [newClassColor, setNewClassColor] = useState(CLASS_COLORS[0]);
  const [newClassAvatar, setNewClassAvatar] = useState(CLASS_AVATARS[0].url);
  const [newClassAvatarScale, setNewClassAvatarScale] = useState(1);
  const [newClassAvatarPosition, setNewClassAvatarPosition] = useState({ x: 0, y: 0 });
  const [isNewClassAvatarEditorOpen, setIsNewClassAvatarEditorOpen] = useState(false);
  const [avatarEditingClass, setAvatarEditingClass] = useState<Classroom | null>(null);

  // Parent Committee & Slogan states for New Class
  const [newClassSlogan, setNewClassSlogan] = useState('Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng');
  const [newParentHeadName, setNewParentHeadName] = useState('Trần Văn Mạnh');
  const [newParentHeadPhone, setNewParentHeadPhone] = useState('0988 123 456');
  const [newParentDeputyName, setNewParentDeputyName] = useState('Nguyễn Thị Mai');
  const [newParentDeputyPhone, setNewParentDeputyPhone] = useState('0977 654 321');
  const [newParentMember1Name, setNewParentMember1Name] = useState('Lê Hoàng Nam');
  const [newParentMember1Phone, setNewParentMember1Phone] = useState('0912 345 678');
  const [newParentMember2Name, setNewParentMember2Name] = useState('Phạm Thị Lan');
  const [newParentMember2Phone, setNewParentMember2Phone] = useState('0903 890 123');

  const newClassAvatarInputRef = useRef<HTMLInputElement>(null);
  const editClassAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleUploadNewClassAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setNewClassAvatar(ev.target.result as string);
          setNewClassAvatarScale(1);
          setNewClassAvatarPosition({ x: 0, y: 0 });
          // Open interactive zoom & crop modal immediately
          setIsNewClassAvatarEditorOpen(true);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleUploadEditClassAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingClass) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newUrl = ev.target.result as string;
          const updated = {
            ...editingClass,
            avatar: newUrl,
            avatarScale: 1,
            avatarPosition: { x: 0, y: 0 }
          };
          setEditingClass(updated);
          // Open interactive zoom & crop modal immediately
          setAvatarEditingClass(updated);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // Edit Class Modal
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<Classroom | null>(null);

  // Subject Configuration Modal (User Request 2: "CẤU HÌNH NHẬN XU")
  const [isSubjectConfigOpen, setIsSubjectConfigOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#3B82F6');
  const [newSubjectIcon, setNewSubjectIcon] = useState('BookOpen');

  // Excel Import & Template Modal (User Request 9)
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [excelParsedStudents, setExcelParsedStudents] = useState<Array<{ name: string; gender: 'Nam' | 'Nữ'; birthDate?: string; group?: string }>>([]);
  const [isExcelPreviewOpen, setIsExcelPreviewOpen] = useState(false);
  const [isExportStudentListOpen, setIsExportStudentListOpen] = useState(false);

  // Single Add student modal
  const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
  const [singleName, setSingleName] = useState('');
  const [singleBirthDate, setSingleBirthDate] = useState('');
  const [singleGender, setSingleGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [singleGroup, setSingleGroup] = useState('Tổ 1');
  const [singleRole, setSingleRole] = useState('Thành viên');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Edit student modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Avatar editor modal
  const [avatarEditingStudent, setAvatarEditingStudent] = useState<Student | null>(null);

  // Quick Award / Tặng Sao / Trừ Xu Modal (User Request 3)
  const [rewardingStudent, setRewardingStudent] = useState<Student | null>(null);
  const [rewardMode, setRewardMode] = useState<'xu' | 'minus' | 'sao'>('xu');
  const [customCoins, setCustomCoins] = useState(1);
  const [selectedSubjectForAward, setSelectedSubjectForAward] = useState('Toán');
  const [customReason, setCustomReason] = useState('');

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];

  // Filtering students with Group and Officer Role filter
  const filteredStudents = currentClassStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.stt.toString().includes(searchQuery);
    if (!matchSearch) return false;
    if (selectedGroupFilter !== 'all' && (s.group || 'Tổ 1') !== selectedGroupFilter) return false;
    if (selectedRoleFilter !== 'all') {
      if (selectedRoleFilter === 'officers') {
        if (!s.role || s.role === 'Thành viên') return false;
      } else if (s.role !== selectedRoleFilter) {
        return false;
      }
    }
    return true;
  });

  // 1. CLASS MANAGEMENT HANDLERS (User Request 1 & 2)
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    addClass({
      name: newClassName.trim(),
      grade: newClassGrade,
      teacherName: newClassTeacher.trim() || teacherProfile.name || 'Cô Nguyễn Thị Hoa',
      academicYear: newClassYear.trim() || teacherProfile.academicYear || '2026 – 2027',
      color: newClassColor,
      avatar: newClassAvatar,
      avatarScale: newClassAvatarScale,
      avatarPosition: newClassAvatarPosition,
      slogan: newClassSlogan.trim(),
      parentCommittee: {
        head: { name: newParentHeadName.trim(), phone: newParentHeadPhone.trim(), roleTitle: 'Trưởng ban phụ huynh' },
        deputy: { name: newParentDeputyName.trim(), phone: newParentDeputyPhone.trim(), roleTitle: 'Phó ban phụ huynh' },
        member1: { name: newParentMember1Name.trim(), phone: newParentMember1Phone.trim(), roleTitle: 'Ủy viên ban phụ huynh' },
        member2: { name: newParentMember2Name.trim(), phone: newParentMember2Phone.trim(), roleTitle: 'Ủy viên ban phụ huynh' }
      }
    });
    setNewClassName('');
    setNewClassAvatarScale(1);
    setNewClassAvatarPosition({ x: 0, y: 0 });
    setIsCreateClassOpen(false);
    confetti({ particleCount: 40, spread: 60 });
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.name.trim()) return;
    updateClass(editingClass.id, {
      name: editingClass.name.trim(),
      grade: editingClass.grade,
      teacherName: editingClass.teacherName?.trim() || teacherProfile.name || 'Cô Nguyễn Thị Hoa',
      academicYear: editingClass.academicYear?.trim() || teacherProfile.academicYear || '2026 – 2027',
      color: editingClass.color,
      avatar: editingClass.avatar,
      avatarScale: editingClass.avatarScale || 1,
      avatarPosition: editingClass.avatarPosition || { x: 0, y: 0 },
      slogan: editingClass.slogan,
      parentCommittee: editingClass.parentCommittee
    });
    setEditingClass(null);
  };

  const handleConfirmDeleteClass = () => {
    if (!deleteConfirmClass) return;
    deleteClass(deleteConfirmClass.id);
    setDeleteConfirmClass(null);
  };

  const handleConfirmDeleteAllClasses = () => {
    deleteAllClasses();
    setIsDeleteAllClassesOpen(false);
    confetti({ particleCount: 40, spread: 60 });
  };

  // 2. SUBJECT CONFIGURATION HANDLERS (User Request 2: "CẤU HÌNH NHẬN XU")
  const handleAddNewSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    addSubject(newSubjectName.trim(), newSubjectColor, newSubjectIcon);
    setNewSubjectName('');
    confetti({ particleCount: 25, spread: 45 });
  };

  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editingSubject.name.trim()) return;
    updateSubject(editingSubject.id, {
      name: editingSubject.name.trim(),
      color: editingSubject.color,
      icon: editingSubject.icon
    });
    setEditingSubject(null);
  };

  // 3. EXCEL TEMPLATE DOWNLOAD (User Request 9)
  const handleDownloadExcelTemplate = () => {
    const templateRows = [
      {
        'STT': 1,
        'Họ và tên': 'Nguyễn Văn An',
        'Ngày tháng năm sinh': '15/09/2016',
        'Giới tính': 'Nam',
        'Tổ': 'Tổ 1'
      },
      {
        'STT': 2,
        'Họ và tên': 'Trần Thị Mai',
        'Ngày tháng năm sinh': '22/03/2016',
        'Giới tính': 'Nữ',
        'Tổ': 'Tổ 1'
      },
      {
        'STT': 3,
        'Họ và tên': 'Lê Hoàng Nam',
        'Ngày tháng năm sinh': '08/11/2016',
        'Giới tính': 'Nam',
        'Tổ': 'Tổ 2'
      },
      {
        'STT': 4,
        'Họ và tên': 'Phạm Quỳnh Chi',
        'Ngày tháng năm sinh': '14/06/2016',
        'Giới tính': 'Nữ',
        'Tổ': 'Tổ 2'
      },
      {
        'STT': 5,
        'Họ và tên': 'Vũ Đức Minh',
        'Ngày tháng năm sinh': '19/01/2016',
        'Giới tính': 'Nam',
        'Tổ': 'Tổ 3'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 8 },  // STT
      { wch: 26 }, // Họ và tên
      { wch: 22 }, // Ngày tháng năm sinh
      { wch: 12 }, // Giới tính
      { wch: 12 }  // Tổ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Sinh");
    XLSX.writeFile(wb, `Mau_Danh_Sach_Hoc_Sinh_${activeClass?.name || 'Lop'}.xlsx`);
  };

  // 4. EXCEL UPLOAD
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        const parsed: Array<{ name: string; gender: 'Nam' | 'Nữ'; birthDate?: string; group?: string }> = [];

        rawData.forEach((row) => {
          const nameVal = row['Họ và tên'] || row['Họ và Tên'] || row['Họ tên'] || row['Tên'] || row['Ho va ten'] || row['Name'] || row['name'];
          if (!nameVal || typeof nameVal !== 'string' || !nameVal.trim()) return;

          let birthVal = row['Ngày tháng năm sinh'] || row['Ngày sinh'] || row['Ngay sinh'] || row['NgayThangNamSinh'] || row['DOB'] || row['birthDate'] || '';
          if (typeof birthVal === 'number') {
            const dateObj = XLSX.SSF.parse_date_code(birthVal);
            if (dateObj) {
              birthVal = `${String(dateObj.d).padStart(2, '0')}/${String(dateObj.m).padStart(2, '0')}/${dateObj.y}`;
            }
          }

          const genderVal = row['Giới tính'] || row['Gioi tinh'] || row['Gender'] || row['Phái'] || '';
          let gender: 'Nam' | 'Nữ' = 'Nam';
          if (typeof genderVal === 'string') {
            const lower = genderVal.toLowerCase().trim();
            if (lower.includes('nữ') || lower.includes('nu') || lower === 'female' || lower === 'f') {
              gender = 'Nữ';
            }
          }

          const groupVal = row['Tổ'] || row['To'] || row['Group'] || row['Nhóm'] || 'Tổ 1';

          parsed.push({
            name: nameVal.trim(),
            gender,
            birthDate: String(birthVal).trim(),
            group: String(groupVal).trim()
          });
        });

        if (parsed.length > 0) {
          setExcelParsedStudents(parsed);
          setIsExcelPreviewOpen(true);
        } else {
          alert('Không tìm thấy dữ liệu học sinh trong file Excel. Vui lòng kiểm tra lại định dạng file mẫu.');
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi đọc file Excel. Vui lòng đảm bảo file có định dạng .xlsx, .xls hoặc .csv hợp lệ.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirmExcelImport = () => {
    if (excelParsedStudents.length > 0) {
      bulkAddStudents(excelParsedStudents);
      setIsExcelPreviewOpen(false);
      setExcelParsedStudents([]);
      confetti({ particleCount: 70, spread: 80 });
    }
  };

  // Yêu cầu: Mục chuyên cần của lớp thêm tỉ lệ % học sinh có mặt trên tổng số học sinh.
  // Cho phép xuất biểu tổng hợp thống kê báo cáo chi tiết pdf và excel theo từng lớp trong mục học sinh.
  const handleExportClassAttendanceReportExcel = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().slice(0, 10);
    const activeCls = classes.find(c => c.id === activeClassId);

    const summaryRows = [
      { 'Chỉ tiêu': 'Tên lớp học', 'Thông tin': activeCls?.name || '4A1' },
      { 'Chỉ tiêu': 'Khối', 'Thông tin': activeCls?.grade || 'Khối 4' },
      { 'Chỉ tiêu': 'Giáo viên chủ nhiệm', 'Thông tin': activeCls?.teacherName || teacherProfile.name },
      { 'Chỉ tiêu': 'Năm học', 'Thông tin': activeCls?.academicYear || teacherProfile.academicYear },
      { 'Chỉ tiêu': 'Tổng sĩ số', 'Thông tin': `${currentClassStudents.length} học sinh` },
      { 'Chỉ tiêu': 'Học sinh Nam', 'Thông tin': `${currentClassStudents.filter(s => s.gender === 'Nam').length} học sinh` },
      { 'Chỉ tiêu': 'Học sinh Nữ', 'Thông tin': `${currentClassStudents.filter(s => s.gender === 'Nữ').length} học sinh` },
      { 'Chỉ tiêu': 'Có mặt hôm nay', 'Thông tin': `${presentCount} / ${currentClassStudents.length} em` },
      { 'Chỉ tiêu': 'Tỉ lệ chuyên cần (%)', 'Thông tin': `${attendanceRate}%` },
      { 'Chỉ tiêu': 'Ngày xuất báo cáo', 'Thông tin': new Date().toLocaleDateString('vi-VN') }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Quan_Lop');

    const studentRows = currentClassStudents.map((st, idx) => {
      const stStatus = attMap[st.id] || 'present';
      const statusLabel = stStatus === 'present' ? 'Có mặt'
        : stStatus === 'late' ? 'Đi muộn'
        : stStatus === 'sick' ? 'Nghỉ ốm'
        : stStatus === 'excused' ? 'Vắng có phép'
        : stStatus === 'unexcused' ? 'Vắng không phép'
        : 'Lý do khác';

      return {
        'STT': idx + 1,
        'Họ và tên': st.name,
        'Ngày sinh': st.birthDate || '',
        'Giới tính': st.gender,
        'Tổ': st.group || 'Tổ 1',
        'Chức vụ': st.role || 'Thành viên',
        'Điểm xu thi đua': st.points || 0,
        'Trạng thái chuyên cần hôm nay': statusLabel,
        'Tỉ lệ có mặt cả lớp': `${attendanceRate}%`
      };
    });
    const wsStudents = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Danh_Sach_Chi_Tiet');

    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_Lop_${activeCls?.name || '4A1'}_${today}.xlsx`);
    confetti({ particleCount: 50, spread: 60 });
  };

  // Single Add
  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;
    addStudent({
      classId: activeClassId,
      name: singleName.trim(),
      birthDate: singleBirthDate.trim(),
      gender: singleGender,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(singleName)}&backgroundColor=b6e3f4`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      group: singleGroup,
      role: singleRole || 'Thành viên'
    });
    setSingleName('');
    setSingleBirthDate('');
    setSingleRole('Thành viên');
    setIsSingleAddOpen(false);
    confetti({ particleCount: 30, spread: 40 });
  };

  // Quick Points Handlers - Opens evaluation modal with subject selector (Yêu cầu 3)
  const handleQuickAdd = (student: Student) => {
    setRewardingStudent(student);
    setRewardMode('xu');
    setCustomCoins(1);
    setSelectedSubjectForAward(activeEvalSubject || subjects[0]?.name || 'Toán');
    setCustomReason('');
  };

  const handleQuickDeduct = (student: Student) => {
    setRewardingStudent(student);
    setRewardMode('minus');
    setCustomCoins(1);
    setSelectedSubjectForAward(activeEvalSubject || subjects[0]?.name || 'Toán');
    setCustomReason('');
  };

  const handleConfirmAward = (pts: number, reason: string) => {
    if (!rewardingStudent) return;
    if (rewardMode === 'minus') {
      const finalReason = reason.trim() || `Trừ -${pts} xu nề nếp môn ${selectedSubjectForAward}`;
      deductPoints([rewardingStudent.id], pts, finalReason, selectedSubjectForAward);
      playDeductSound();
    } else if (rewardMode === 'sao') {
      const finalReason = reason.trim() || `Tặng ${pts} ⭐ Ngôi sao khen ngợi môn ${selectedSubjectForAward}`;
      awardPoints([rewardingStudent.id], pts * 5, finalReason, selectedSubjectForAward);
      playCoinSound();
      confetti({ particleCount: 50, spread: 60 });
    } else {
      const finalReason = reason.trim() || `Khen thưởng +${pts} xu môn ${selectedSubjectForAward}`;
      awardPoints([rewardingStudent.id], pts, finalReason, selectedSubjectForAward);
      playCoinSound();
      confetti({ particleCount: 40, spread: 50 });
    }
    setRewardingStudent(null);
  };

  // Multi-select & Bulk Delete (User Request 9)
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkDeleteSelected = () => {
    selectedStudentIds.forEach(id => deleteStudent(id));
    setSelectedStudentIds([]);
    setIsBulkDeleteConfirmOpen(false);
  };

  const handleClearAllClassStudents = () => {
    clearClassStudents(activeClassId);
    setSelectedStudentIds([]);
    setIsClearAllConfirmOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Switch */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 md:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover-zoom-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black shadow-2xs">
            {activeTabMode === 'classes' ? <School className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-indigo-950 tracking-tight">
              {activeTabMode === 'classes' ? 'Quản Lý Lớp Học & Thống Kê Sĩ Số' : `Không Gian Học Sinh Lớp ${activeClass?.name || ''}`}
            </h2>
            <p className="text-xs text-indigo-700/80 font-medium">
              {activeTabMode === 'classes' 
                ? 'Ảnh đại diện lớp học, thống kê số lượng lớp và sĩ số học sinh từng lớp.' 
                : 'Thẻ 3D to rõ nét, đánh giá thi đua theo môn học, nhập Excel và điểm thưởng.'}
            </p>
          </div>
        </div>

        {/* Tab Toggle: Lớp Học vs Học Sinh */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTabMode('classes')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTabMode === 'classes' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-indigo-900/70 hover:text-indigo-950'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Lớp Học ({classes.length})</span>
          </button>

          <button
            onClick={() => setActiveTabMode('students')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 hover-zoom-btn ${
              activeTabMode === 'students' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-indigo-900/70 hover:text-indigo-950'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Học Sinh ({currentClassStudents.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW TAB: QUẢN LÝ LỚP HỌC (User Request 1) */}
      {/* ========================================================================= */}
      {activeTabMode === 'classes' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW: Tổng số lớp đang quản lý, mỗi lớp bao nhiêu học sinh (User Request 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Tổng số lớp */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-2xs shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Tổng Lớp Đang Quản Lý</span>
                <div className="text-2xl md:text-3xl font-black text-indigo-950 font-mono mt-0.5">
                  {classes.length} <span className="text-xs font-bold text-indigo-600">lớp học</span>
                </div>
              </div>
            </div>

            {/* Card 2: Tổng số học sinh toàn trường */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shadow-2xs shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Số Học Sinh Các Lớp</span>
                <div className="text-2xl md:text-3xl font-black text-emerald-700 font-mono mt-0.5">
                  {students.length} <span className="text-xs font-bold text-slate-400">em</span>
                </div>
              </div>
            </div>

            {/* Card 3: Thống kê nhanh sĩ số các lớp */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover-zoom-card flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi Tiết Sĩ Số Từng Lớp</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {classes.map(c => {
                  const num = students.filter(s => s.classId === c.id).length;
                  return (
                    <span 
                      key={c.id} 
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>Lớp {c.name}:</span>
                      <strong className="text-indigo-700">{num} em</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Class List Action Header (Yêu cầu 4: Cho phép xóa hết tất cả các lớp) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base md:text-lg font-black text-indigo-950">
                Danh Sách Không Gian Lớp Học ({classes.length} Lớp)
              </h3>
              <p className="text-xs text-indigo-700/80 font-medium mt-0.5">
                Mỗi lớp có ảnh đại diện, màu sắc nhận diện, giáo viên chủ nhiệm và sĩ số học sinh.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {classes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDeleteAllClassesOpen(true)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 transition-all hover-zoom-btn shadow-xs"
                  title="Xóa tất cả các lớp học trong hệ thống"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Xóa Hết Tất Cả Các Lớp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCreateClassOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover-zoom-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Lớp Học Mới</span>
              </button>
            </div>
          </div>

          {/* Grid Thẻ Lớp Học LỚN, RÕ NÉT kèm Ảnh Đại Diện To Rõ (User Request) */}
          {classes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-indigo-100 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <School className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-indigo-950">Chưa Có Lớp Học Nào Trong Hệ Thống</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Tất cả các lớp học đã được xóa hoặc chưa được tạo. Hãy bấm nút bên dưới để tạo lớp học bắt đầu năm học mới.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    resetToDefaultData();
                    playFanfareSound();
                    confetti({ particleCount: 60, spread: 70 });
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-600/25 transition-all hover-zoom-btn inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Khôi Phục Lớp Mẫu 4A1 (30 Học Sinh)</span>
                </button>
                <button
                  onClick={() => setIsCreateClassOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-md shadow-indigo-600/25 transition-all hover-zoom-btn inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Lớp Học Mới</span>
                </button>
              </div>
            </div>
          ) : (
          <div className={classes.length === 1 ? 'max-w-3xl mx-auto' : 'grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'}>
            {classes.map((cls) => {
              const isSelected = cls.id === activeClassId;
              const classStudents = students.filter(s => s.classId === cls.id);
              const count = classStudents.length;
              const maleCount = classStudents.filter(s => s.gender === 'Nam').length;
              const femaleCount = classStudents.filter(s => s.gender === 'Nữ').length;
              const trimmedName = cls.name.trim();
              const displayName = /^lớp\s+/i.test(trimmedName) ? trimmedName : `Lớp ${trimmedName}`;

              return (
                <div
                  key={cls.id}
                  className={`bg-white rounded-3xl p-5 md:p-6 border-2 transition-all hover-zoom-card flex flex-col justify-between space-y-5 ${
                    isSelected 
                      ? 'border-indigo-600 ring-4 ring-indigo-500/15 shadow-xl' 
                      : 'border-slate-200/90 shadow-sm hover:shadow-lg hover:border-indigo-300'
                  }`}
                >
                  {/* KHUNG ẢNH ĐẠI DIỆN LỚP TO RÕ & CÓ ZOOM TRỰC TIẾP (User Request) */}
                  <div className="relative w-full h-56 sm:h-64 md:h-72 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-950 shadow-md group/photo border border-slate-200">
                    {cls.avatar ? (
                      <img
                        src={cls.avatar}
                        alt={displayName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/photo:scale-102"
                        style={{
                          transform: `translate(${cls.avatarPosition?.x || 0}px, ${cls.avatarPosition?.y || 0}px) scale(${cls.avatarScale || 1})`,
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex flex-col items-center justify-center font-black text-white text-5xl shadow-md"
                        style={{ backgroundColor: cls.color || '#6366F1' }}
                      >
                        <span>{cls.name}</span>
                        <span className="text-xs font-semibold text-white/80 mt-2">Chưa cài đặt ảnh lớp</span>
                      </div>
                    )}

                    {/* Gradient overlay for badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/45 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                      <span 
                        className="px-3.5 py-1.5 rounded-full text-white text-xs font-black shadow-md flex items-center gap-1.5 backdrop-blur-md"
                        style={{ backgroundColor: cls.color ? `${cls.color}ee` : '#6366F1ee' }}
                      >
                        <span className="w-2 h-2 rounded-full bg-white ring-2 ring-white/40" />
                        <span>{cls.grade} • Năm học: {cls.academicYear || '2026 - 2027'}</span>
                      </span>

                      {isSelected ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs tracking-wide shadow-md flex items-center gap-1.5 backdrop-blur-md">
                          <Check className="w-3.5 h-3.5" />
                          <span>✓ Đang chọn</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setActiveClassId(cls.id)}
                          className="px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-indigo-700 font-black text-xs transition-all shadow-md hover-zoom-btn backdrop-blur-md"
                        >
                          Chọn lớp này
                        </button>
                      )}
                    </div>

                    {/* Bottom Floating Action: Zoom / Adjust Image Button (User Request) */}
                    <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2">
                      <button
                        onClick={() => setAvatarEditingClass(cls)}
                        className="px-3.5 py-2 bg-black/80 hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-white/25 transition-all hover-zoom-btn"
                        title="Phóng to, thu nhỏ và căn chỉnh vị trí ảnh lớp học"
                      >
                        <ZoomIn className="w-4 h-4 text-amber-300" />
                        <span>Phóng to & Căn chỉnh ảnh</span>
                      </button>
                    </div>
                  </div>

                  {/* THÔNG TIN CHI TIẾT LỚP HỌC TO RÕ NÉT */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-indigo-950 leading-tight">
                          {displayName}
                        </h3>
                        <p className="text-xs sm:text-sm text-indigo-600 font-bold mt-1 flex items-center gap-1.5">
                          <span>🏫</span>
                          <span>GVCN: <strong className="text-indigo-800">{cls.teacherName || teacherProfile.name}</strong></span>
                        </p>
                      </div>

                      {/* Quick Edit/Delete icon buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingClass(cls)}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors hover-zoom-btn"
                          title="Sửa thông tin lớp học"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmClass(cls)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors hover-zoom-btn"
                          title="Xóa lớp học này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sĩ số & Phân loại học sinh */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider block">Sĩ số học sinh</span>
                        <span className="text-base sm:text-lg font-black text-indigo-700 font-mono">
                          👥 {count} em
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider block">Cơ cấu giới tính</span>
                        <span className="text-xs sm:text-sm font-black text-indigo-900">
                          ♂ {maleCount} Nam • ♀ {femaleCount} Nữ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút to: Vào không gian lớp học */}
                  <button
                    onClick={() => {
                      setActiveClassId(cls.id);
                      setActiveTabMode('students');
                    }}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all hover-zoom-btn shadow-md ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/25'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <span>Vào Không Gian Lớp Học</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW TAB: QUẢN LÝ HỌC SINH & CẤU HÌNH NHẬN XU (User Request 2 & 9) */}
      {/* ========================================================================= */}
      {activeTabMode === 'students' && (
        <div className="space-y-6">
          {/* ACTIVE SUBJECT EVALUATION BAR: MÀU SẮC TƯƠI MỚI HIỆN ĐẠI (User Request 2) */}
          <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-indigo-50/70 rounded-3xl border border-emerald-200/70 p-4.5 shadow-xs space-y-3 hover-zoom-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                    MÔN HỌC ĐÁNH GIÁ NHẬN XU:
                  </span>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Đang chấm điểm cho: <strong className="text-indigo-800 font-black">{activeEvalSubject}</strong>
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs shadow-xs shadow-indigo-500/25">
                  {activeEvalSubject}
                </span>
              </div>

              {/* NÚT CẤU HÌNH NHẬN XU (User Request 2) */}
              <button
                onClick={() => setIsSubjectConfigOpen(true)}
                className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs transition-all hover-zoom-btn self-start sm:self-auto"
                title="Mở cấu hình các môn học đánh giá nhận xu"
              >
                <Settings className="w-4 h-4 text-indigo-600" />
                <span>⚙️ Cấu Hình Nhận Xu</span>
              </button>
            </div>

            {/* Scrolling list of subjects */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
              {subjects.map((sub) => {
                const isSelected = activeEvalSubject === sub.name;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveEvalSubject(sub.name)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 hover-zoom-btn ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30 scale-103 font-black'
                        : 'bg-white text-indigo-900 border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-300 font-bold'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white/60" style={{ backgroundColor: sub.color || '#3B82F6' }} />
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Bar: Search, Excel, Add, Bulk Delete (Gọn gàng trong khung, không tràn mép) */}
          <div className="bg-white rounded-3xl border border-indigo-100/90 p-4 md:p-5 shadow-xs space-y-3.5 hover-zoom-card overflow-hidden">
            {/* Hàng 1: Tìm kiếm, Bộ lọc & Tỉ lệ chuyên cần có mặt */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm học sinh theo tên hoặc STT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-indigo-50/40 border border-indigo-200/80 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="px-3 py-2 bg-indigo-50/50 border border-indigo-200/80 rounded-xl text-xs font-black text-indigo-900 focus:outline-none hover-zoom-btn cursor-pointer"
                >
                  <option value="all">Tất cả các Tổ</option>
                  <option value="Tổ 1">Tổ 1</option>
                  <option value="Tổ 2">Tổ 2</option>
                  <option value="Tổ 3">Tổ 3</option>
                  <option value="Tổ 4">Tổ 4</option>
                </select>

                {/* Lọc theo chức vụ cán bộ lớp */}
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-amber-50/70 border border-amber-200/90 rounded-xl text-xs font-black text-amber-950 focus:outline-none hover-zoom-btn cursor-pointer"
                  title="Lọc học sinh theo chức vụ cán bộ lớp"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="officers">🎖️ Ban cán sự lớp</option>
                  <option value="Lớp trưởng">⭐ Lớp trưởng</option>
                  <option value="Lớp phó học tập">📘 Lớp phó học tập</option>
                  <option value="Lớp phó phong trào">🚩 Lớp phó phong trào</option>
                  <option value="Lớp phó lao động">🌱 Lớp phó lao động</option>
                  <option value="Tổ trưởng Tổ 1">🏅 Tổ trưởng Tổ 1</option>
                  <option value="Tổ phó Tổ 1">🎖️ Tổ phó Tổ 1</option>
                  <option value="Tổ trưởng Tổ 2">🏅 Tổ trưởng Tổ 2</option>
                  <option value="Tổ phó Tổ 2">🎖️ Tổ phó Tổ 2</option>
                  <option value="Tổ trưởng Tổ 3">🏅 Tổ trưởng Tổ 3</option>
                  <option value="Tổ phó Tổ 3">🎖️ Tổ phó Tổ 3</option>
                  <option value="Tổ trưởng Tổ 4">🏅 Tổ trưởng Tổ 4</option>
                  <option value="Tổ phó Tổ 4">🎖️ Tổ phó Tổ 4</option>
                  <option value="Thành viên">🎒 Thành viên</option>
                </select>

                {filteredStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllStudents}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-black flex items-center gap-1.5 hover-zoom-btn border border-indigo-200/60 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedStudentIds.length === filteredStudents.length ? 'Bỏ chọn' : 'Chọn tất cả'}</span>
                  </button>
                )}
              </div>

              {/* Yêu cầu: Thêm tỉ lệ % học sinh có mặt trên tổng số học sinh */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Có mặt: <strong className="text-emerald-950 font-black">{presentCount}/{currentClassStudents.length}</strong> em</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-mono font-bold shadow-xs">
                    {attendanceRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Hàng 2: Các nút thao tác dữ liệu được nhóm gọn gàng, bao bọc trong khung, không tràn viền */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              {/* Nhóm 1: Nhập / Xuất & Báo cáo chuyên cần */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover-zoom-btn cursor-pointer"
                  title="Tải file mẫu Excel danh sách học sinh: Họ và tên, Ngày sinh, Giới tính, Tổ"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tải File Mẫu (.xlsx)</span>
                </button>

                <input
                  type="file"
                  ref={excelFileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelUpload}
                />
                <button
                  type="button"
                  onClick={() => excelFileInputRef.current?.click()}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all hover-zoom-btn cursor-pointer"
                  title="Nhập danh sách học sinh từ file Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nhập Từ File Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExportStudentListOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover-zoom-btn cursor-pointer"
                  title="Xuất danh sách học sinh ra file Excel hoặc in ấn bản A4"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span>Xuất DS Học Sinh</span>
                </button>

                {/* Yêu cầu: Cho phép xuất biểu tổng hợp thống kê báo cáo chi tiết pdf và excel theo từng lớp */}
                <button
                  type="button"
                  onClick={() => setIsClassReportModalOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all hover-zoom-btn cursor-pointer"
                  title="Xuất biểu tổng hợp thống kê báo cáo chi tiết PDF và Excel của lớp"
                >
                  <Award className="w-3.5 h-3.5 text-amber-200" />
                  <span>Báo Cáo Tổng Hợp & Chuyên Cần</span>
                </button>
              </div>

              {/* Nhóm 2: Infographic & Thêm học sinh */}
              <div className="flex flex-wrap items-center gap-2">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('infographic')}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover-zoom-btn cursor-pointer"
                    title="Tạo bản Infographic khổ dọc A4 xuất PDF cho lớp"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Infographic Lớp A4</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSingleAddOpen(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover-zoom-btn cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Học Sinh</span>
                </button>
              </div>

              {/* Nhóm 3: Thao tác Xu & Xóa */}
              <div className="flex flex-wrap items-center gap-2">
                {currentClassStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsBulkSetPointsModalOpen(true)}
                    className="px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all hover-zoom-btn cursor-pointer"
                    title="Gán điểm xu hoặc cộng/trừ xu đồng loạt"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-100" />
                    <span>
                      {selectedStudentIds.length > 0 ? `Gán Xu (${selectedStudentIds.length})` : 'Gán Điểm Xu'}
                    </span>
                  </button>
                )}

                {currentClassStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsResetPointsModalOpen(true)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all hover-zoom-btn cursor-pointer"
                    title="Xóa điểm xu về 0 cho học sinh"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      {selectedStudentIds.length > 0 ? `Xóa Xu (${selectedStudentIds.length})` : 'Xóa Điểm Xu'}
                    </span>
                  </button>
                )}

                {currentClassStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.length > 0) {
                        setIsBulkDeleteConfirmOpen(true);
                      } else {
                        setIsClearAllConfirmOpen(true);
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover-zoom-btn cursor-pointer"
                    title="Xóa học sinh đã chọn hoặc cả danh sách"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
                    <span>
                      {selectedStudentIds.length > 0 ? `Xóa (${selectedStudentIds.length})` : 'Xóa DS'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Student Grid: BIG, 3D MODERN STYLE, LARGE CRISP AVATARS (User Request 9) */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Chưa có học sinh nào trong lớp</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bấm "Nhập Từ File Excel" để nạp nhanh danh sách hoặc "Tải File Mẫu (.xlsx)" để chuẩn bị danh sách học sinh.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    resetToDefaultData();
                    playFanfareSound();
                    confetti({ particleCount: 60, spread: 70 });
                  }}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover-zoom-btn flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi Phục 30 Học Sinh Mẫu Lớp 4A1</span>
                </button>
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold hover-zoom-btn"
                >
                  Tải File Mẫu Excel
                </button>
                <button
                  onClick={() => setIsSingleAddOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover-zoom-btn"
                >
                  Thêm Thủ Công
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
              {filteredStudents.map((student) => {
                const isChecked = selectedStudentIds.includes(student.id);

                const groupStyles: Record<string, string> = {
                  'Tổ 1': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'Tổ 2': 'bg-sky-50 text-sky-700 border-sky-200',
                  'Tổ 3': 'bg-violet-50 text-violet-700 border-violet-200',
                  'Tổ 4': 'bg-amber-50 text-amber-800 border-amber-200',
                };
                const groupClass = groupStyles[student.group || 'Tổ 1'] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div
                    key={student.id}
                    className={`bg-gradient-to-b from-white via-white to-slate-50/70 rounded-3xl border transition-all duration-200 hover-zoom-card flex flex-col justify-between group relative overflow-hidden shadow-xs hover:shadow-md ${
                      isChecked 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md bg-indigo-50/30' 
                        : 'border-slate-200/90 hover:border-indigo-300'
                    }`}
                  >
                    {/* Top Row: STT Badge, Checkbox & Group */}
                    <div className="p-4 pb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectStudent(student.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-700 to-violet-700 text-amber-300 font-mono font-black text-xs shadow-xs ring-1 ring-indigo-500">
                          #{student.stt}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border font-black text-[10px] ${groupClass}`}>
                          {student.group || 'Tổ 1'}
                        </span>
                      </div>

                      {/* Gender Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs border ${
                        student.gender === 'Nam' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {student.gender === 'Nam' ? '♂ Nam' : '♀ Nữ'}
                      </span>
                    </div>

                    {/* Class Officer Role Badge & Quick Designation */}
                    <div className="px-4 py-1 flex items-center justify-between border-y border-slate-100 bg-slate-50/70">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {student.role && student.role !== 'Thành viên' && student.role !== 'none' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-yellow-400/25 border border-amber-300 text-amber-950 font-black text-[11px] shadow-2xs truncate">
                            <span>{getRoleIcon(student.role)}</span>
                            <span className="truncate">{student.role}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">
                            🎒 Thành viên
                          </span>
                        )}
                      </div>

                      {/* Quick 1-click Role Assignment selector */}
                      <select
                        value={student.role || 'Thành viên'}
                        onChange={(e) => {
                          updateStudent(student.id, { role: e.target.value });
                          confetti({ particleCount: 25, spread: 45 });
                        }}
                        className="text-[10px] font-black text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer shadow-2xs transition-colors"
                        title="Bấm để phân công hoặc đổi chức vụ cán bộ lớp cho học sinh"
                      >
                        {OFFICER_ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Middle Section: TO, RÕ NÉT, 3D AVATAR & STUDENT INFO */}
                    <div className="px-4 py-2 flex items-center gap-3.5">
                      {/* LARGE 3D CRISP AVATAR */}
                      <div className="relative shrink-0 group/avatar">
                        <div 
                          onClick={() => setAvatarEditingStudent(student)}
                          className="w-[74px] h-[74px] rounded-2xl overflow-hidden border-2 border-indigo-200/80 bg-gradient-to-tr from-indigo-50 via-white to-sky-50 shadow-md relative group-hover/avatar:border-indigo-500 transition-all cursor-pointer hover-zoom-btn"
                          title="Bấm để đổi ảnh đại diện cho học sinh"
                        >
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                            referrerPolicy="no-referrer"
                          />

                          <div className="absolute inset-0 bg-indigo-950/60 text-white text-[10px] font-black flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4 mb-0.5 text-amber-300" />
                            <span>ĐỔI ẢNH</span>
                          </div>

                          <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs border border-white">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 
                          className="text-base md:text-lg font-black text-indigo-950 truncate leading-snug tracking-tight" 
                          title={student.name}
                        >
                          {student.name}
                        </h4>

                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold text-indigo-700">{student.birthDate ? student.birthDate : 'Chưa có ngày sinh'}</span>
                        </div>

                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-black text-xs rounded-xl shadow-xs shadow-amber-400/25 border border-amber-300">
                            <span>🪙</span>
                            <span>{student.points} xu thi đua</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons: Fast in-class actions with active subject */}
                    <div className="p-3 mx-3 mb-3 mt-2 bg-gradient-to-r from-indigo-50/50 via-sky-50/40 to-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleQuickAdd(student)}
                          className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs shadow-emerald-500/25 transition-all hover-zoom-btn"
                          title={`Cộng xu khen thưởng cho học sinh theo môn học`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleQuickDeduct(student)}
                          className="w-9 h-9 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm flex items-center justify-center shadow-xs shadow-rose-500/25 transition-all hover-zoom-btn"
                          title={`Trừ xu nề nếp cho học sinh theo môn học`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        {/* NÚT TẶNG SAO / KHEN THƯỞNG THEO MÔN (Yêu cầu 3) */}
                        <button
                          onClick={() => {
                            setRewardingStudent(student);
                            setRewardMode('sao');
                            setCustomCoins(1);
                            setSelectedSubjectForAward(activeEvalSubject || subjects[0]?.name || 'Toán');
                          }}
                          className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-black text-sm flex items-center justify-center shadow-xs shadow-amber-500/30 transition-all hover-zoom-btn"
                          title="Tặng sao thi đua cho học sinh theo môn học"
                        >
                          <Star className="w-4 h-4 fill-white text-white" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors hover-zoom-btn"
                          title="Sửa thông tin học sinh"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa học sinh "${student.name}" khỏi lớp?`)) {
                              deleteStudent(student.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors hover-zoom-btn"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Action Bar when students are selected */}
          {selectedStudentIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-5">
              <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold whitespace-nowrap">
                  Đã chọn <strong className="text-amber-300 font-black text-sm">{selectedStudentIds.length}</strong> học sinh
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setIsBulkSetPointsModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/25 cursor-pointer hover-zoom-btn whitespace-nowrap"
              >
                <Coins className="w-3.5 h-3.5 text-amber-200" />
                <span>Gán Điểm Xu Đồng Loạt</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetPointsModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer hover-zoom-btn whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa Điểm Xu ({selectedStudentIds.length} em)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa học sinh</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="text-xs text-slate-400 hover:text-white font-medium pl-1 cursor-pointer whitespace-nowrap"
              >
                Bỏ chọn
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CẤU HÌNH NHẬN XU & MÔN HỌC ĐÁNH GIÁ (User Request 2) */}
      {/* ========================================================================= */}
      {isSubjectConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-indigo-950">
                    Cấu Hình Nhận Xu & Môn Học Đánh Giá
                  </h3>
                  <p className="text-xs text-indigo-700">
                    Thiết lập danh sách các môn học tiểu học đánh giá nhận xu đối với lớp và giáo viên
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsSubjectConfigOpen(false);
                  setEditingSubject(null);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Thêm Môn Học Mới */}
            <form onSubmit={handleAddNewSubject} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider block">
                + Thêm Môn Học Mới
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  placeholder="Tên môn học (Ví dụ: Tiếng Anh, Tin học...)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="sm:col-span-8 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <div className="sm:col-span-4 flex items-center gap-2">
                  <input
                    type="color"
                    value={newSubjectColor}
                    onChange={(e) => setNewSubjectColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-indigo-200 cursor-pointer p-0.5 bg-white shrink-0"
                    title="Màu sắc nhận diện môn học"
                  />
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs hover-zoom-btn flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Danh Sách Môn Học Hiện Tại */}
            <div className="space-y-2">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider block">
                Danh Sách Môn Học Đang Đánh Giá ({subjects.length} môn):
              </span>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 bg-white border border-indigo-100/90 rounded-2xl hover-zoom-interactive"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: sub.color || '#3B82F6' }} />
                      <span className="text-xs font-black text-indigo-950">{sub.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingSubject(sub)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors hover-zoom-btn"
                        title="Chỉnh sửa môn học"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {subjects.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Xóa môn học "${sub.name}" khỏi danh sách đánh giá?`)) {
                              deleteSubject(sub.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors hover-zoom-btn"
                          title="Xóa môn học"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Edit Subject */}
            {editingSubject && (
              <form onSubmit={handleSaveEditSubject} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                <span className="text-xs font-black text-indigo-900 block">Sửa Môn Học: {editingSubject.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingSubject.name}
                    onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold"
                    required
                  />
                  <input
                    type="color"
                    value={editingSubject.color || '#3B82F6'}
                    onChange={(e) => setEditingSubject({ ...editingSubject, color: e.target.value })}
                    className="w-8 h-8 rounded-xl border border-indigo-200 cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl hover-zoom-btn"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSubject(null)}
                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-xl"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSubjectConfigOpen(false);
                  setEditingSubject(null);
                }}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover-zoom-btn"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ĐÁNH GIÁ THI ĐUA - CỘNG XU, TRỪ XU HOẶC TẶNG SAO THEO MÔN HỌC (Yêu cầu 3) */}
      {/* ========================================================================= */}
      {rewardingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                  rewardMode === 'minus' 
                    ? 'bg-rose-100 text-rose-700' 
                    : rewardMode === 'sao' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {rewardMode === 'minus' ? <Minus className="w-5 h-5" /> : rewardMode === 'sao' ? <Star className="w-5 h-5 fill-amber-500" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-indigo-950">
                    {rewardMode === 'minus' ? 'Trừ Xu Nề Nếp Theo Môn Học' : rewardMode === 'sao' ? 'Tặng Sao Thi Đua Theo Môn Học' : 'Cộng Xu Khen Thưởng Theo Môn Học'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn môn học cụ thể được {rewardMode === 'minus' ? 'trừ xu' : rewardMode === 'sao' ? 'tặng sao' : 'cộng xu'} cho học sinh
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRewardingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student Preview */}
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <img
                  src={rewardingStudent.avatar}
                  alt={rewardingStudent.name}
                  className="w-12 h-12 rounded-xl object-cover bg-white ring-2 ring-indigo-200"
                />
                <div>
                  <div className="text-sm font-black text-indigo-950">#{rewardingStudent.stt} {rewardingStudent.name}</div>
                  <div className="text-xs text-indigo-700 font-semibold">{activeClass?.name} · {rewardingStudent.gender} · {rewardingStudent.group || 'Tổ 1'}</div>
                </div>
              </div>

              <div className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-black shadow-2xs">
                🪙 Hiện có: {rewardingStudent.points} xu
              </div>
            </div>

            {/* 3 HÌNH THỨC: CỘNG XU, TRỪ XU HOẶC TẶNG SAO (Yêu cầu 3) */}
            <div>
              <label className="block text-xs font-black text-indigo-900 mb-1.5 uppercase tracking-wider">
                1. HÌNH THỨC ĐÁNH GIÁ THI ĐUA:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRewardMode('xu');
                    setCustomCoins(1);
                  }}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn ${
                    rewardMode === 'xu' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-102' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cộng Xu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRewardMode('minus');
                    setCustomCoins(1);
                  }}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn ${
                    rewardMode === 'minus' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-102' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span>- Trừ Xu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRewardMode('sao');
                    setCustomCoins(1);
                  }}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn ${
                    rewardMode === 'sao' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-102' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>⭐ Tặng Sao</span>
                </button>
              </div>
            </div>

            {/* LỰA CHỌN MÔN HỌC CỤ THỂ (Bắt buộc chọn - Yêu cầu 3) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. CHỌN MÔN HỌC CỤ THỂ ({selectedSubjectForAward}):</span>
                </label>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  Đang chọn: {selectedSubjectForAward}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {subjects.map((sub) => {
                  const isChosen = selectedSubjectForAward === sub.name;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubjectForAward(sub.name)}
                      className={`p-2 rounded-xl text-xs font-bold text-left transition-all truncate hover-zoom-btn flex items-center gap-2 ${
                        isChosen
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/40 font-black'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-300'
                      }`}
                      title={sub.name}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/60" style={{ backgroundColor: sub.color || '#3B82F6' }} />
                      <span className="truncate">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MỨC ĐIỂM / MỨC SAO */}
            <div>
              <label className="block text-xs font-black text-indigo-900 mb-1.5 uppercase tracking-wider">
                3. {rewardMode === 'sao' ? 'SỐ SAO TẶNG (1 ⭐ = 5 xu):' : rewardMode === 'minus' ? 'SỐ XU TRỪ:' : 'SỐ XU CỘNG:'}
              </label>
              {rewardMode === 'sao' ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCustomCoins(num)}
                      className={`py-2.5 rounded-2xl text-xs font-black transition-all hover-zoom-btn ${
                        customCoins === num 
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {num === 1 ? '⭐ 1 Sao (+5 xu)' : num === 2 ? '⭐⭐ 2 Sao (+10 xu)' : '⭐⭐⭐ 3 Sao (+15 xu)'}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCustomCoins(num)}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all hover-zoom-btn ${
                        customCoins === num 
                          ? rewardMode === 'minus'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                            : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {rewardMode === 'minus' ? `-${num}` : `+${num}`} xu
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lý do khen thưởng / nhắc nhở */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do / Lời nhận xét:
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(rewardMode === 'minus' ? [
                  'Mất trật tự trong giờ',
                  'Quên sách vở / đồ dùng',
                  'Chưa hoàn thành bài tập',
                  'Nói chuyện riêng'
                ] : rewardMode === 'sao' ? [
                  'Học sinh xuất sắc trong tuần',
                  'Ngôi sao sáng tạo',
                  'Đạt điểm 10 bài kiểm tra',
                  'Việc tốt giúp đỡ bạn'
                ] : [
                  'Phát biểu hăng hái',
                  'Làm bài tập đầy đủ, sạch đẹp',
                  'Hiểu bài nhanh, tích cực',
                  'Đạt điểm 9, 10'
                ]).map((reason, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => setCustomReason(reason)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-[11px] font-bold text-slate-600 transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder={
                  rewardMode === 'minus'
                    ? `Lý do trừ điểm môn ${selectedSubjectForAward}...`
                    : `Lời khen ngợi môn ${selectedSubjectForAward}...`
                }
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRewardingStudent(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAward(customCoins, customReason)}
                className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md transition-all hover-zoom-btn flex items-center gap-1.5 ${
                  rewardMode === 'minus'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : rewardMode === 'sao'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {rewardMode === 'minus' ? <Minus className="w-4 h-4" /> : rewardMode === 'sao' ? <Star className="w-4 h-4 fill-white" /> : <Plus className="w-4 h-4" />}
                <span>
                  {rewardMode === 'minus' 
                    ? `Xác Nhận Trừ -${customCoins} Xu Môn ${selectedSubjectForAward}` 
                    : rewardMode === 'sao'
                    ? `Xác Nhận Tặng +${customCoins} ⭐ Môn ${selectedSubjectForAward} (+${customCoins * 5} xu)`
                    : `Xác Nhận Cộng +${customCoins} Xu Môn ${selectedSubjectForAward}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TẠO LỚP HỌC MỚI CÓ ẢNH ĐẠI DIỆN LỚP (User Request 1) */}
      {/* ========================================================================= */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div>
                <h3 className="text-base font-black text-indigo-950">Tạo Lớp Học Mới</h3>
                <p className="text-xs text-indigo-700 mt-0.5">Nhập tên lớp, giáo viên, năm học & ảnh đại diện lớp</p>
              </div>
              <button 
                onClick={() => setIsCreateClassOpen(false)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              {/* Chọn Ảnh đại diện của lớp & Tải từ máy tính (User Request 1) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Ảnh đại diện của lớp (To, rõ nét)</label>
                
                <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative shrink-0">
                    <img 
                      src={newClassAvatar} 
                      alt="Xem trước ảnh lớp" 
                      className="w-16 h-16 rounded-2xl object-cover border-2 shadow-md bg-white"
                      style={{ borderColor: newClassColor }}
                    />
                    <span 
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: newClassColor }}
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Tải ảnh đại diện lớp từ máy tính lên:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => newClassAvatarInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover-zoom-btn"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn ảnh từ máy tính...</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewClassAvatarEditorOpen(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover-zoom-btn"
                        title="Thu phóng và căn chỉnh góc nhìn ảnh lớp"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Phóng to & Căn chỉnh ảnh</span>
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={newClassAvatarInputRef}
                      accept="image/*"
                      onChange={handleUploadNewClassAvatar}
                      className="hidden"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Hoặc chọn nhanh từ các mẫu hoạt hình dưới đây:
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                  {CLASS_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setNewClassAvatar(av.url)}
                      className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-transform shrink-0 ${
                        newClassAvatar === av.url ? 'scale-110 ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp học *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3/1, 3/2, 4/1..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên giáo viên chủ nhiệm</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cô Nguyễn Thị Hoa"
                  value={newClassTeacher}
                  onChange={(e) => setNewClassTeacher(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {['Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                  <input
                    type="text"
                    value={newClassYear}
                    onChange={(e) => setNewClassYear(e.target.value)}
                    placeholder="2026 - 2027"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Slogan của lớp học (User request) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ⭐ Slogan của lớp học
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng"
                  value={newClassSlogan}
                  onChange={(e) => setNewClassSlogan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Thông tin Ban Phụ Huynh Lớp Học (User request) */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                    Ban Đại Diện Cha Mẹ Học Sinh (Ban Phụ Huynh)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Trưởng ban */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-indigo-700 text-[11px]">Trưởng ban phụ huynh:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={newParentHeadName}
                      onChange={(e) => setNewParentHeadName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={newParentHeadPhone}
                      onChange={(e) => setNewParentHeadPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Phó ban */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-indigo-700 text-[11px]">Phó ban phụ huynh:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={newParentDeputyName}
                      onChange={(e) => setNewParentDeputyName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={newParentDeputyPhone}
                      onChange={(e) => setNewParentDeputyPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Ủy viên 1 */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-slate-700 text-[11px]">Ủy viên phụ huynh 1:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={newParentMember1Name}
                      onChange={(e) => setNewParentMember1Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={newParentMember1Phone}
                      onChange={(e) => setNewParentMember1Phone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Ủy viên 2 */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-slate-700 text-[11px]">Ủy viên phụ huynh 2:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={newParentMember2Name}
                      onChange={(e) => setNewParentMember2Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={newParentMember2Phone}
                      onChange={(e) => setNewParentMember2Phone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Màu sắc nhận diện</label>
                <div className="flex items-center gap-2">
                  {CLASS_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewClassColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newClassColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateClassOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 hover-zoom-btn"
                >
                  Tạo Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SỬA LỚP HỌC CÓ ẢNH ĐẠI DIỆN LỚP (User Request 1) */}
      {/* ========================================================================= */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div>
                <h3 className="text-base font-black text-indigo-950">Sửa Thông Tin Lớp Học</h3>
                <p className="text-xs text-indigo-700 mt-0.5">Cập nhật tên lớp, giáo viên, năm học & ảnh đại diện</p>
              </div>
              <button 
                onClick={() => setEditingClass(null)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClass} className="space-y-4">
              {/* Chọn ảnh đại diện của lớp & Tải từ máy tính (User Request 1) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Ảnh đại diện của lớp (To, rõ nét)</label>
                
                <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative shrink-0">
                    <img 
                      src={editingClass.avatar || CLASS_AVATARS[0].url} 
                      alt="Xem trước ảnh lớp" 
                      className="w-16 h-16 rounded-2xl object-cover border-2 shadow-md bg-white"
                      style={{ borderColor: editingClass.color || '#6366F1' }}
                    />
                    <span 
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: editingClass.color || '#6366F1' }}
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Tải ảnh đại diện lớp từ máy tính lên:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editClassAvatarInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover-zoom-btn"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn ảnh từ máy tính...</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarEditingClass(editingClass)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover-zoom-btn"
                        title="Thu phóng và căn chỉnh góc nhìn ảnh lớp"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Phóng to & Căn chỉnh ảnh</span>
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={editClassAvatarInputRef}
                      accept="image/*"
                      onChange={handleUploadEditClassAvatar}
                      className="hidden"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Hoặc chọn nhanh từ các mẫu hoạt hình dưới đây:
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                  {CLASS_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditingClass({ ...editingClass, avatar: av.url })}
                      className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-transform shrink-0 ${
                        editingClass.avatar === av.url ? 'scale-110 ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp học *</label>
                <input
                  type="text"
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên giáo viên chủ nhiệm</label>
                <input
                  type="text"
                  value={editingClass.teacherName || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, teacherName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={editingClass.grade}
                    onChange={(e) => setEditingClass({ ...editingClass, grade: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {['Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                  <input
                    type="text"
                    value={editingClass.academicYear || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, academicYear: e.target.value })}
                    placeholder="2026 - 2027"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Slogan của lớp học */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ⭐ Slogan của lớp học
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng"
                  value={editingClass.slogan || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, slogan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Ban Phụ Huynh Lớp Học */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                    Ban Đại Diện Cha Mẹ Học Sinh (Ban Phụ Huynh)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Trưởng ban */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-indigo-700 text-[11px]">Trưởng ban phụ huynh:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={editingClass.parentCommittee?.head?.name || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: { name: e.target.value, phone: editingClass.parentCommittee?.head?.phone || '', roleTitle: 'Trưởng ban phụ huynh' },
                          deputy: editingClass.parentCommittee?.deputy || { name: '', phone: '' },
                          member1: editingClass.parentCommittee?.member1 || { name: '', phone: '' },
                          member2: editingClass.parentCommittee?.member2 || { name: '', phone: '' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={editingClass.parentCommittee?.head?.phone || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: { name: editingClass.parentCommittee?.head?.name || '', phone: e.target.value, roleTitle: 'Trưởng ban phụ huynh' },
                          deputy: editingClass.parentCommittee?.deputy || { name: '', phone: '' },
                          member1: editingClass.parentCommittee?.member1 || { name: '', phone: '' },
                          member2: editingClass.parentCommittee?.member2 || { name: '', phone: '' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Phó ban */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-indigo-700 text-[11px]">Phó ban phụ huynh:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={editingClass.parentCommittee?.deputy?.name || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: editingClass.parentCommittee?.head || { name: '', phone: '' },
                          deputy: { name: e.target.value, phone: editingClass.parentCommittee?.deputy?.phone || '', roleTitle: 'Phó ban phụ huynh' },
                          member1: editingClass.parentCommittee?.member1 || { name: '', phone: '' },
                          member2: editingClass.parentCommittee?.member2 || { name: '', phone: '' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={editingClass.parentCommittee?.deputy?.phone || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: editingClass.parentCommittee?.head || { name: '', phone: '' },
                          deputy: { name: editingClass.parentCommittee?.deputy?.name || '', phone: e.target.value, roleTitle: 'Phó ban phụ huynh' },
                          member1: editingClass.parentCommittee?.member1 || { name: '', phone: '' },
                          member2: editingClass.parentCommittee?.member2 || { name: '', phone: '' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Ủy viên 1 */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-slate-700 text-[11px]">Ủy viên phụ huynh 1:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={editingClass.parentCommittee?.member1?.name || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: editingClass.parentCommittee?.head || { name: '', phone: '' },
                          deputy: editingClass.parentCommittee?.deputy || { name: '', phone: '' },
                          member1: { name: e.target.value, phone: editingClass.parentCommittee?.member1?.phone || '', roleTitle: 'Ủy viên ban phụ huynh' },
                          member2: editingClass.parentCommittee?.member2 || { name: '', phone: '' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={editingClass.parentCommittee?.member1?.phone || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: editingClass.parentCommittee?.head || { name: '', phone: '' },
                          deputy: editingClass.parentCommittee?.deputy || { name: '', phone: '' },
                          member1: { name: editingClass.parentCommittee?.member1?.name || '', phone: e.target.value, roleTitle: 'Ủy viên ban phụ huynh' },
                          member2: editingClass.parentCommittee?.member2 || { name: '', phone: '' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Ủy viên 2 */}
                  <div className="space-y-1 p-2 rounded-xl bg-white border border-indigo-100">
                    <label className="block font-bold text-slate-700 text-[11px]">Ủy viên phụ huynh 2:</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={editingClass.parentCommittee?.member2?.name || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: editingClass.parentCommittee?.head || { name: '', phone: '' },
                          deputy: editingClass.parentCommittee?.deputy || { name: '', phone: '' },
                          member1: editingClass.parentCommittee?.member1 || { name: '', phone: '' },
                          member2: { name: e.target.value, phone: editingClass.parentCommittee?.member2?.phone || '', roleTitle: 'Ủy viên ban phụ huynh' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={editingClass.parentCommittee?.member2?.phone || ''}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        parentCommittee: {
                          head: editingClass.parentCommittee?.head || { name: '', phone: '' },
                          deputy: editingClass.parentCommittee?.deputy || { name: '', phone: '' },
                          member1: editingClass.parentCommittee?.member1 || { name: '', phone: '' },
                          member2: { name: editingClass.parentCommittee?.member2?.name || '', phone: e.target.value, roleTitle: 'Ủy viên ban phụ huynh' }
                        }
                      })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Màu sắc nhận diện</label>
                <div className="flex items-center gap-2">
                  {CLASS_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingClass({ ...editingClass, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editingClass.color === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 hover-zoom-btn"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÓA LỚP */}
      {deleteConfirmClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-rose-950">Xóa Lớp {deleteConfirmClass.name}?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Toàn bộ dữ liệu học sinh, điểm thi đua và sơ đồ của lớp này sẽ bị xóa.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmClass(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteClass}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 hover-zoom-btn"
              >
                Xóa Lớp Này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÓA HẾT TẤT CẢ CÁC LỚP HỌC (Yêu cầu 4) */}
      {isDeleteAllClassesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-rose-900">
                Xóa Hết Tất Cả Các Lớp Học?
              </h3>
              <p className="text-xs text-rose-700 leading-relaxed">
                Hành động này sẽ xóa vĩnh viễn toàn bộ <strong>{classes.length} lớp học</strong> hiện có cùng tất cả học sinh của các lớp này.
              </p>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <span className="font-black text-rose-950 block">Các lớp sẽ bị xóa:</span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map(c => (
                  <span key={c.id} className="px-2.5 py-1 bg-white border border-rose-200 text-rose-900 rounded-xl font-bold text-[11px] shadow-2xs">
                    Lớp {c.name} ({c.grade})
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteAllClassesOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllClasses}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 hover-zoom-btn flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác Nhận Xóa Hết</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCEL PREVIEW */}
      {isExcelPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-indigo-950">
                      Xem Trước Dữ Liệu Excel ({excelParsedStudents.length} học sinh)
                    </h3>
                    <p className="text-xs text-indigo-700">Đã nhận diện: Họ và tên, Ngày sinh, Giới tính, Tổ</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExcelPreviewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 border border-indigo-100 rounded-2xl overflow-hidden max-h-[45vh] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-indigo-50/80 text-indigo-950 font-black sticky top-0 border-b border-indigo-100">
                    <tr>
                      <th className="p-2.5 text-center w-12">STT</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">Ngày sinh</th>
                      <th className="p-2.5 text-center">Giới tính</th>
                      <th className="p-2.5 text-center">Tổ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50">
                    {excelParsedStudents.map((st, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/40 font-medium">
                        <td className="p-2.5 text-center font-mono text-indigo-600 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-indigo-950">{st.name}</td>
                        <td className="p-2.5 text-indigo-700 font-medium">{st.birthDate || '—'}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            st.gender === 'Nam' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {st.gender}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-indigo-900 font-bold">{st.group || 'Tổ 1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExcelPreviewOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmExcelImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 hover-zoom-btn flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Nạp {excelParsedStudents.length} Học Sinh Vào Lớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÓA CẢ DANH SÁCH LỚP */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-rose-950">
                Xóa Danh Sách Học Sinh Lớp {activeClass?.name}?
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed font-medium">
                Toàn bộ <strong className="text-rose-600 font-black">{currentClassStudents.length} học sinh</strong> trong lớp này sẽ bị xóa.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-indigo-900 font-bold text-xs rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleClearAllClassStudents}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 hover-zoom-btn"
              >
                Xóa Toàn Bộ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÓA CÁC HỌC SINH ĐÃ CHỌN */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-rose-950">
                Xóa {selectedStudentIds.length} Học Sinh Đã Chọn?
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed font-medium">
                Hành động này sẽ xóa các học sinh đã được tích chọn khỏi lớp.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-indigo-900 font-bold text-xs rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleBulkDeleteSelected}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 hover-zoom-btn"
              >
                Xóa Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM HỌC SINH */}
      {isSingleAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div>
                <h3 className="text-base font-black text-indigo-950">Thêm Học Sinh Mới</h3>
                <p className="text-xs text-indigo-700 mt-0.5">Họ tên, ngày sinh, giới tính và tổ sinh hoạt</p>
              </div>
              <button 
                onClick={() => setIsSingleAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSingleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên học sinh *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ngày tháng năm sinh</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 15/09/2016"
                  value={singleBirthDate}
                  onChange={(e) => setSingleBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={singleGender}
                    onChange={(e) => setSingleGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tổ</label>
                  <select
                    value={singleGroup}
                    onChange={(e) => setSingleGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Tổ 1">Tổ 1</option>
                    <option value="Tổ 2">Tổ 2</option>
                    <option value="Tổ 3">Tổ 3</option>
                    <option value="Tổ 4">Tổ 4</option>
                  </select>
                </div>
              </div>

              {/* Chức vụ cán bộ lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chức vụ cán bộ lớp</span>
                </label>
                <select
                  value={singleRole}
                  onChange={(e) => setSingleRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {OFFICER_ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSingleAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 hover-zoom-btn"
                >
                  Thêm Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SỬA HỌC SINH */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div>
                <h3 className="text-base font-black text-indigo-950">Sửa Thông Tin Học Sinh</h3>
                <p className="text-xs text-indigo-700 mt-0.5">Chỉnh sửa họ tên, ngày sinh, giới tính và điểm xu</p>
              </div>
              <button 
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingStudent.name.trim()) return;
                updateStudent(editingStudent.id, {
                  name: editingStudent.name.trim(),
                  birthDate: editingStudent.birthDate?.trim() || '',
                  gender: editingStudent.gender,
                  group: editingStudent.group,
                  points: editingStudent.points,
                  role: editingStudent.role || 'Thành viên',
                  avatar: editingStudent.avatar,
                  originalAvatar: editingStudent.originalAvatar,
                  avatarScale: editingStudent.avatarScale,
                  avatarPosition: editingStudent.avatarPosition
                });
                setEditingStudent(null);
                confetti({ particleCount: 30, spread: 50 });
              }}
              className="space-y-4"
            >
              {/* Student Avatar Editor in Edit Modal */}
              <div className="flex items-center gap-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-200 bg-white shrink-0 shadow-xs relative">
                  <img
                    src={editingStudent.avatar}
                    alt={editingStudent.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-indigo-950">Ảnh đại diện học sinh</div>
                  <p className="text-[11px] text-indigo-600">Đổi ảnh chụp thật hoặc chọn ảnh hoạt hình</p>
                  <button
                    type="button"
                    onClick={() => setAvatarEditingStudent(editingStudent)}
                    className="mt-1.5 px-3 py-1 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 flex items-center gap-1.5 transition-colors shadow-2xs hover-zoom-btn"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Chỉnh sửa / Đổi ảnh</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ngày tháng năm sinh</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 15/09/2016"
                  value={editingStudent.birthDate || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, birthDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as 'Nam' | 'Nữ' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tổ</label>
                  <select
                    value={editingStudent.group || 'Tổ 1'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, group: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số xu</label>
                  <input
                    type="number"
                    value={editingStudent.points}
                    onChange={(e) => setEditingStudent({ ...editingStudent, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-900"
                  />
                </div>
              </div>

              {/* Chức vụ cán bộ lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chức vụ cán bộ lớp</span>
                </label>
                <select
                  value={editingStudent.role || 'Thành viên'}
                  onChange={(e) => setEditingStudent({ ...editingStudent, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {OFFICER_ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 hover-zoom-btn"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT AVATAR EDITOR */}
      {avatarEditingStudent && (
        <AvatarEditorModal
          isOpen={!!avatarEditingStudent}
          studentName={avatarEditingStudent.name}
          currentAvatar={avatarEditingStudent.avatar}
          originalAvatar={avatarEditingStudent.originalAvatar || avatarEditingStudent.avatar}
          currentScale={avatarEditingStudent.avatarScale || 1}
          currentPosition={avatarEditingStudent.avatarPosition || { x: 0, y: 0 }}
          onClose={() => setAvatarEditingStudent(null)}
          onSave={(avatarUrl, scale, position, originalAvatar) => {
            updateStudent(avatarEditingStudent.id, {
              avatar: avatarUrl,
              originalAvatar: originalAvatar || avatarEditingStudent.originalAvatar || avatarUrl,
              avatarScale: scale,
              avatarPosition: position
            });
            if (editingStudent && editingStudent.id === avatarEditingStudent.id) {
              setEditingStudent({
                ...editingStudent,
                avatar: avatarUrl,
                originalAvatar: originalAvatar || editingStudent.originalAvatar || avatarUrl,
                avatarScale: scale,
                avatarPosition: position
              });
            }
            setAvatarEditingStudent(null);
          }}
        />
      )}

      {/* MODAL: CLASS AVATAR EDITOR WITH ZOOM & PAN (User Request) */}
      {avatarEditingClass && (
        <ClassAvatarEditorModal
          isOpen={!!avatarEditingClass}
          classNameTitle={avatarEditingClass.name}
          currentAvatar={avatarEditingClass.avatar || CLASS_AVATARS[0].url}
          currentScale={avatarEditingClass.avatarScale || 1}
          currentPosition={avatarEditingClass.avatarPosition || { x: 0, y: 0 }}
          colorTheme={avatarEditingClass.color || '#6366F1'}
          onClose={() => setAvatarEditingClass(null)}
          onSave={(avatarUrl, scale, position) => {
            updateClass(avatarEditingClass.id, {
              avatar: avatarUrl,
              avatarScale: scale,
              avatarPosition: position
            });
            if (editingClass && editingClass.id === avatarEditingClass.id) {
              setEditingClass({
                ...editingClass,
                avatar: avatarUrl,
                avatarScale: scale,
                avatarPosition: position
              });
            }
            setAvatarEditingClass(null);
            confetti({ particleCount: 35, spread: 60 });
          }}
        />
      )}

      {/* MODAL: EXPORT STUDENT LIST */}
      {isExportStudentListOpen && activeClass && (
        <ExportStudentListModal
          isOpen={isExportStudentListOpen}
          onClose={() => setIsExportStudentListOpen(false)}
          classroom={activeClass}
          students={currentClassStudents}
          teacherProfile={teacherProfile}
        />
      )}

      {/* MODAL: NEW CLASS AVATAR EDITOR WITH ZOOM & PAN */}
      {isNewClassAvatarEditorOpen && (
        <ClassAvatarEditorModal
          isOpen={isNewClassAvatarEditorOpen}
          classNameTitle={newClassName || 'Lớp mới'}
          currentAvatar={newClassAvatar}
          currentScale={newClassAvatarScale}
          currentPosition={newClassAvatarPosition}
          colorTheme={newClassColor}
          onClose={() => setIsNewClassAvatarEditorOpen(false)}
          onSave={(avatarUrl, scale, position) => {
            setNewClassAvatar(avatarUrl);
            setNewClassAvatarScale(scale);
            setNewClassAvatarPosition(position);
            setIsNewClassAvatarEditorOpen(false);
            confetti({ particleCount: 30, spread: 50 });
          }}
        />
      )}

      {/* MODAL: XÓA ĐIỂM XU (Yêu cầu người dùng) */}
      {isResetPointsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Xác Nhận Xóa Điểm Xu Về 0
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đưa số xu tích lũy của học sinh về 0 xu
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs text-rose-950">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  {selectedStudentIds.length > 0 
                    ? `Sẽ xóa điểm xu của ${selectedStudentIds.length} học sinh đang được chọn.` 
                    : `Sẽ xóa điểm xu của TẤT CẢ ${currentClassStudents.length} học sinh Lớp ${activeClass?.name}.`}
                </span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Tất cả điểm xu thi đua của các em được chọn sẽ trở về <strong>0 xu</strong>. Lịch sử giao dịch sẽ được ghi nhận để đối chiếu khi cần thiết.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetPointsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetIds = selectedStudentIds.length > 0 ? selectedStudentIds : currentClassStudents.map(s => s.id);
                  resetStudentPoints(targetIds);
                  playDeductSound();
                  confetti({ particleCount: 35, spread: 50 });
                  setIsResetPointsModalOpen(false);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/25 transition-all hover-zoom-btn cursor-pointer"
              >
                Xác Nhận Xóa Về 0 Xu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GÁN ĐIỂM XU ĐỒNG LOẠT (Yêu cầu người dùng) */}
      {isBulkSetPointsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                  <Coins className="w-5 h-5 text-amber-100" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Gán Điểm Xu Đồng Loạt
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentIds.length > 0
                      ? `Áp dụng cho ${selectedStudentIds.length} học sinh đang được chọn`
                      : `Áp dụng cho tất cả ${currentClassStudents.length} học sinh Lớp ${activeClass?.name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkSetPointsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chế độ gán điểm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Hình thức gán điểm:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBulkSetMode('fixed')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    bulkSetMode === 'fixed'
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  🎯 Đặt Giá Trị Cố Định
                </button>
                <button
                  type="button"
                  onClick={() => setBulkSetMode('add')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    bulkSetMode === 'add'
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ➕ Cộng Thêm Xu
                </button>
                <button
                  type="button"
                  onClick={() => setBulkSetMode('deduct')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    bulkSetMode === 'deduct'
                      ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ➖ Trừ Bớt Xu
                </button>
              </div>
            </div>

            {/* Nhập số xu */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                {bulkSetMode === 'fixed' 
                  ? 'Số xu muốn gán thành (mỗi học sinh sẽ có đúng số xu này):' 
                  : bulkSetMode === 'add' 
                  ? 'Số xu cộng thêm cho mỗi học sinh:' 
                  : 'Số xu trừ bớt cho mỗi học sinh:'}
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={bulkSetAmount}
                  onChange={(e) => setBulkSetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-amber-900 focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <span className="text-xs font-bold text-slate-500">xu thi đua</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 self-center mr-1">Chọn nhanh:</span>
                {[0, 5, 10, 15, 20, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBulkSetAmount(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      bulkSetAmount === val
                        ? 'bg-amber-500 text-white font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn môn học */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Theo môn học:</span>
              </label>
              <select
                value={bulkSetSubject}
                onChange={(e) => setBulkSetSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lý do / Ghi chú */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do / Lời nhận xét:
              </label>
              <input
                type="text"
                value={bulkSetReason}
                onChange={(e) => setBulkSetReason(e.target.value)}
                placeholder="Ví dụ: Khen thưởng tuần, Đạt kết quả tốt, v.v."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkSetPointsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetIds = selectedStudentIds.length > 0 ? selectedStudentIds : currentClassStudents.map(s => s.id);
                  if (bulkSetMode === 'fixed') {
                    bulkSetPoints(targetIds, bulkSetAmount, bulkSetReason, bulkSetSubject);
                  } else if (bulkSetMode === 'add') {
                    awardPoints(targetIds, bulkSetAmount, bulkSetReason, bulkSetSubject);
                  } else {
                    deductPoints(targetIds, bulkSetAmount, bulkSetReason, bulkSetSubject);
                  }
                  playCoinSound();
                  confetti({ particleCount: 50, spread: 60 });
                  setIsBulkSetPointsModalOpen(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/25 transition-all hover-zoom-btn cursor-pointer"
              >
                Xác Nhận Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: BÁO CÁO TỔNG HỢP & CHUYÊN CẦN LỚP (PDF & EXCEL) (Yêu cầu người dùng) */}
      {/* ========================================================================= */}
      {isClassReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Báo Cáo Tổng Hợp & Chuyên Cần Lớp {classes.find(c => c.id === activeClassId)?.name || '4A1'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thống kê chuyên cần tỉ lệ % có mặt, sĩ số, giới tính và điểm xu thi đua
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsClassReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Attendance & Class KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-center">
                <span className="text-[11px] font-black text-indigo-700 uppercase block">Tổng Sĩ Số</span>
                <div className="text-2xl font-black text-indigo-950 mt-0.5">{currentClassStudents.length}</div>
                <span className="text-[10px] text-slate-500 font-bold">
                  Nam: {currentClassStudents.filter(s => s.gender === 'Nam').length} • Nữ: {currentClassStudents.filter(s => s.gender === 'Nữ').length}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center">
                <span className="text-[11px] font-black text-emerald-800 uppercase block">Có Mặt Hôm Nay</span>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">{presentCount}</div>
                <span className="text-[10px] text-emerald-700 font-bold">
                  Vắng: {currentClassStudents.length - presentCount} em
                </span>
              </div>

              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-center">
                <span className="text-[11px] font-black text-teal-800 uppercase block">Tỉ Lệ Chuyên Cần</span>
                <div className="text-2xl font-black text-teal-700 mt-0.5">{attendanceRate}%</div>
                <span className="text-[10px] text-teal-700 font-bold">
                  {presentCount}/{currentClassStudents.length} học sinh
                </span>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <span className="text-[11px] font-black text-amber-800 uppercase block">Tổng Xu Thi Đua</span>
                <div className="text-2xl font-black text-amber-700 mt-0.5">
                  {currentClassStudents.reduce((sum, s) => sum + (s.points || 0), 0)}
                </div>
                <span className="text-[10px] text-amber-700 font-bold">Xu toàn lớp</span>
              </div>
            </div>

            {/* Preview Table of Students */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Bảng Chi Tiết Học Sinh & Trạng Thái Chuyên Cần:
              </span>
              <div className="overflow-x-auto max-h-[300px] border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">STT</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3 text-center">Giới tính</th>
                      <th className="py-2.5 px-3 text-center">Tổ</th>
                      <th className="py-2.5 px-3 text-center">Chức vụ</th>
                      <th className="py-2.5 px-3 text-center">Xu thi đua</th>
                      <th className="py-2.5 px-3 text-center">Chuyên cần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentClassStudents.map((st, idx) => {
                      const stStatus = attMap[st.id] || 'present';
                      const isPresent = stStatus === 'present';
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{st.name}</td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-600">{st.gender}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{st.group || 'Tổ 1'}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{st.role || 'Thành viên'}</td>
                          <td className="py-2 px-3 text-center font-black text-amber-700">🪙 {st.points || 0}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isPresent ? '✓ Có mặt' : 'Vắng mặt'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClassReportModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleExportClassAttendanceReportExcel();
                    setIsClassReportModalOpen(false);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất File Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Xuất Báo Cáo PDF (A4)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
