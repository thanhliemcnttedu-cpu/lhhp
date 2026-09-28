export type Gender = 'Nam' | 'Nữ';

export type ClassOfficerRoleId = 
  | 'none'
  | 'monitor'           // Lớp trưởng
  | 'academic_deputy'   // Lớp phó học tập
  | 'activity_deputy'   // Lớp phó phong trào
  | 'labor_deputy'      // Lớp phó lao động
  | 'team_leader_1'     // Tổ trưởng Tổ 1
  | 'team_deputy_1'     // Tổ phó Tổ 1
  | 'team_leader_2'     // Tổ trưởng Tổ 2
  | 'team_deputy_2'     // Tổ phó Tổ 2
  | 'team_leader_3'     // Tổ trưởng Tổ 3
  | 'team_deputy_3'     // Tổ phó Tổ 3
  | 'team_leader_4'     // Tổ trưởng Tổ 4
  | 'team_deputy_4';    // Tổ phó Tổ 4

export interface ClassOfficerRoleDef {
  id: ClassOfficerRoleId;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const CLASS_OFFICER_ROLES: ClassOfficerRoleDef[] = [
  { id: 'monitor', label: 'Lớp trưởng', icon: '👑', color: 'from-amber-500 to-yellow-600', badgeBg: 'bg-amber-100', badgeText: 'text-amber-900', badgeBorder: 'border-amber-300' },
  { id: 'academic_deputy', label: 'Lớp phó học tập', icon: '📘', color: 'from-blue-500 to-indigo-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-900', badgeBorder: 'border-blue-300' },
  { id: 'activity_deputy', label: 'Lớp phó phong trào', icon: '🚩', color: 'from-orange-500 to-red-600', badgeBg: 'bg-orange-100', badgeText: 'text-orange-900', badgeBorder: 'border-orange-300' },
  { id: 'labor_deputy', label: 'Lớp phó lao động', icon: '🌱', color: 'from-emerald-500 to-green-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-900', badgeBorder: 'border-emerald-300' },
  { id: 'team_leader_1', label: 'Tổ trưởng Tổ 1', icon: '🏅', color: 'from-purple-500 to-indigo-600', badgeBg: 'bg-purple-100', badgeText: 'text-purple-900', badgeBorder: 'border-purple-300' },
  { id: 'team_deputy_1', label: 'Tổ phó Tổ 1', icon: '🎖️', color: 'from-purple-400 to-indigo-500', badgeBg: 'bg-purple-50', badgeText: 'text-purple-800', badgeBorder: 'border-purple-200' },
  { id: 'team_leader_2', label: 'Tổ trưởng Tổ 2', icon: '🏅', color: 'from-teal-500 to-emerald-600', badgeBg: 'bg-teal-100', badgeText: 'text-teal-900', badgeBorder: 'border-teal-300' },
  { id: 'team_deputy_2', label: 'Tổ phó Tổ 2', icon: '🎖️', color: 'from-teal-400 to-emerald-500', badgeBg: 'bg-teal-50', badgeText: 'text-teal-800', badgeBorder: 'border-teal-200' },
  { id: 'team_leader_3', label: 'Tổ trưởng Tổ 3', icon: '🏅', color: 'from-yellow-500 to-amber-600', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-900', badgeBorder: 'border-yellow-300' },
  { id: 'team_deputy_3', label: 'Tổ phó Tổ 3', icon: '🎖️', color: 'from-yellow-400 to-amber-500', badgeBg: 'bg-yellow-50', badgeText: 'text-yellow-800', badgeBorder: 'border-yellow-200' },
  { id: 'team_leader_4', label: 'Tổ trưởng Tổ 4', icon: '🏅', color: 'from-rose-500 to-pink-600', badgeBg: 'bg-rose-100', badgeText: 'text-rose-900', badgeBorder: 'border-rose-300' },
  { id: 'team_deputy_4', label: 'Tổ phó Tổ 4', icon: '🎖️', color: 'from-rose-400 to-pink-500', badgeBg: 'bg-rose-50', badgeText: 'text-rose-800', badgeBorder: 'border-rose-200' },
];

export interface Student {
  id: string;
  classId: string;
  stt: number;
  name: string;
  birthDate?: string; // Ngày tháng năm sinh (dd/mm/yyyy hoặc yyyy-mm-dd)
  gender: Gender;
  avatar: string;
  originalAvatar?: string; // Tấm ảnh gốc trước khi căn chỉnh để khi mở lại không bị mất/cắt ảnh gốc
  avatarScale: number; // 0.8 - 2.5
  avatarPosition: { x: number; y: number };
  points: number;
  group?: string; // Tổ 1, Tổ 2, Tổ 3, Tổ 4
  role?: string;  // Chức vụ cán bộ lớp: Lớp trưởng, Lớp phó học tập, Lớp phó phong trào, Tổ trưởng Tổ 1 -> 4
}

// Question types for Random Picker & Classroom Quiz Challenges
export type QuestionType = 'multiple_choice' | 'oral'; // Trắc nghiệm hoặc Tự luận/Trả lời bằng lời

export interface QuestionItem {
  id: string;
  type: QuestionType;
  questionText: string;
  image?: string; // Tùy chọn ảnh minh họa câu hỏi
  options?: string[]; // Cho dạng trắc nghiệm (A, B, C, D)
  correctOptionIndex?: number; // 0, 1, 2, 3
  teacherAnswerKey?: string; // Đáp án/hướng dẫn của giáo viên (cho dạng câu hỏi bằng lời hoặc giải thích)
  pointsReward?: number; // Số xu thưởng khi trả lời đúng (mặc định 2 xu)
  subject?: string; // Môn học (Toán, Tiếng Việt, Tiếng Anh, Đố vui, v.v.)
}

export interface QuestionBank {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  questions: QuestionItem[];
  createdAt: number;
}

export interface ParentCommitteeMember {
  name: string;
  phone: string;
  roleTitle?: string;
  note?: string;
}

export interface ParentCommittee {
  head: ParentCommitteeMember;    // Trưởng ban phụ huynh
  deputy: ParentCommitteeMember;  // Phó ban phụ huynh
  member1: ParentCommitteeMember; // Ủy viên 1
  member2: ParentCommitteeMember; // Ủy viên 2
}

export interface Classroom {
  id: string;
  name: string;
  grade: string; // Khối 1 -> Khối 5, Khối 6...
  color: string; // Hex or tailwind badge
  academicYear: string; // e.g. "2026 - 2027"
  teacherName?: string; // Tên giáo viên chủ nhiệm
  avatar?: string; // Ảnh đại diện của lớp học
  avatarScale?: number; // Tỉ lệ zoom ảnh đại diện (0.5 - 3)
  avatarPosition?: { x: number; y: number }; // Vị trí căn chỉnh ảnh (x, y)
  slogan?: string; // Slogan lớp học
  parentCommittee?: ParentCommittee; // Ban đại diện phụ huynh học sinh
}

export interface Subject {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface PointCriterion {
  id: string;
  title: string;
  points: number; // e.g. +3, +4, -2
  type: 'positive' | 'negative';
  category?: string;
}

export interface PointTransaction {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  amount: number;
  reason: string;
  subjectName?: string;
  timestamp: number;
}

export interface Reward {
  id: string;
  classId?: string;
  name: string;
  cost: number;
  stock: number;
  image: string;
  description?: string;
}

export interface RewardRedemption {
  id: string;
  studentId: string;
  studentName: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  timestamp: number;
  status: 'Đã nhận' | 'Chờ trao';
}

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'unexcused' | 'sick' | 'other';

export interface DailyAttendance {
  date: string; // YYYY-MM-DD
  classId: string;
  records: Record<string, AttendanceStatus>; // studentId -> status
  notes?: string;
}

export type BoardingStatus = 'eating' | 'not_eating' | 'absent_meal'; // 'eating' (Ăn bán trú), 'not_eating' (Không ăn/Về nhà)

export interface DailyBoardingMeal {
  date: string; // YYYY-MM-DD
  classId: string;
  records: Record<string, BoardingStatus>; // studentId -> status (ăn bán trú / không ăn / báo cắt suất)
  notes?: string;
}

export interface DeskPosition {
  row: number;
  col: number; // aisle/dãy: 0, 1, 2, 3, 4
  subCol: number; // 0 = ghế trái, 1 = ghế phải của bàn đôi
}

export type SeatingColumnsCount = 2 | 3 | 4 | 5 | 6;
export type TeacherDeskPosition = 'left' | 'center' | 'right';
export type DoorPosition = 'left' | 'right';
export type BlackboardPosition = 'center' | 'left' | 'right';

export interface SeatingDeskAssignment {
  seatKey: string; // e.g. "col-row-sub"
  studentId: string;
}

export interface TimetableConfig {
  morningPeriods: number; // default 5
  afternoonPeriods: number; // default 4
  hasSaturday: boolean;
}

export interface TimetableSlot {
  day: number; // 2 -> 7 (Thứ 2 - Thứ 7)
  period: number; // 1 -> 5
  session: 'morning' | 'afternoon';
  subject: string;
  room?: string;
  note?: string;
  teacher?: string;
  classId?: string; // Cố định theo từng lớp
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
  isPinned?: boolean;
}

export interface TeacherProfile {
  name: string;
  role: string;
  birthDate?: string; // Ngày tháng năm sinh của giáo viên (dd/mm/yyyy hoặc yyyy-mm-dd)
  teachingSubject: string;
  schoolName: string;
  avatar: string;
  avatarScale?: number;
  avatarPosition?: { x: number; y: number };
  phone?: string;
  zalo?: string;
  facebook?: string; // Địa chỉ liên kết mạng xã hội Facebook
  socialLink?: string;
  academicYear?: string;
}

export interface AiQuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AiStudentRemark {
  studentId: string;
  studentName: string;
  summary: string;
  strengths: string[];
  recommendations: string[];
  parentNote: string;
}

// -----------------------------------------------------------------------------
// APP ROLE & AUTHENTICATION TYPES
// -----------------------------------------------------------------------------
export type AppUserRole = 'teacher' | 'admin';

export type TeacherApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface RegisteredTeacher {
  id: string;
  username: string; // Tên đăng nhập do Admin cấp (e.g. gv_4a1, hoa_nguyen)
  password: string; // Mật khẩu đăng nhập (e.g. 123456)
  email: string; // Email liên kết (hoặc Google email)
  displayName: string; // Tên giáo viên
  photoURL?: string;
  assignedClassId: string; // Lớp phụ trách (e.g. 'class-4a1')
  assignedClassName?: string; // Tên lớp (e.g. '4A1')
  status: TeacherApprovalStatus; // 'approved' | 'pending' | 'rejected'
  registeredAt: number; // Timestamp
  lastLoginAt?: number;
  phone?: string;
  note?: string;
}

export interface TeacherAccount {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  assignedClassId?: string;
  folderName: string; // "THƯ MỤC GIÁO VIÊN: [Name]"
  folderId?: string;
  lastSyncTime?: number;
}

export interface AdminAccount {
  username: string; // 'admin'
  role: 'admin';
  folderName: string; // "THƯ MỤC QUẢN TRỊ"
  folderId?: string;
  cycleStartDate: string; // YYYY-MM-DD
  lastBackupDate?: string;
}

export interface ClassStatisticsOverview {
  classId: string;
  className: string;
  grade: string;
  teacherName: string;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  boardingCount: number;
  boardingRate: number; // %
  presentCount: number;
  excusedAbsence: number;
  unexcusedAbsence: number;
  sickAbsence: number;
  otherAbsence: number;
  totalAbsence: number;
  attendanceRate: number; // %
  averagePoints: number;
  topExcellingStudents: Student[]; // 5 học sinh chuyên cần xuất sắc nhất
}

export interface SchoolDataMetrics {
  totalClasses: number;
  totalStudents: number;
  totalMale: number;
  totalFemale: number;
  totalBoarding: number;
  totalBoardingRate: number;
  totalPresent: number;
  totalExcused: number;
  totalUnexcused: number;
  totalSick: number;
  totalOther: number;
  overallAttendanceRate: number;
  gradeBreakdown: {
    grade: string;
    classCount: number;
    studentCount: number;
    maleCount: number;
    femaleCount: number;
    boardingCount: number;
    attendanceRate: number;
  }[];
  classesOverview: ClassStatisticsOverview[];
}

