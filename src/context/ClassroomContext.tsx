import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Classroom, Student, Subject, PointCriterion, PointTransaction, 
  Reward, RewardRedemption, DailyAttendance, TimetableSlot, 
  TimetableConfig, QuickLink, TeacherProfile, AttendanceStatus,
  SeatingColumnsCount, TeacherDeskPosition, DoorPosition, BlackboardPosition,
  DeskNumberingOrder, BoardingStatus, DailyBoardingMeal,
  TeacherRole, SubjectTimetableSlot, SubjectTeacherConfig, InitSubjectClassItem,
  UserAccount, UserRole, UserClassroomData, QuestionItem
} from '../types';
import { generateStudentsForClass } from '../utils/studentGenerator';
import { 
  INITIAL_CLASSES, INITIAL_STUDENTS_CLASS_4A1, INITIAL_SUBJECTS, 
  INITIAL_CRITERIA, INITIAL_REWARDS, INITIAL_TIMETABLE, 
  INITIAL_QUICK_LINKS, DEFAULT_TEACHER, DEFAULT_CORE_SUBJECTS,
  DEFAULT_SUBJECT_TEACHER_CONFIG, INITIAL_SUBJECT_TIMETABLE, PRESET_SUBJECT_CLASS_NAMES,
  SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE, SAMPLE_SUBJECT_CLASSES_BY_IMAGE
} from '../data/initialData';
import { playCoinSound, playDeductSound } from '../utils/audio';
import { DEFAULT_QUESTIONS, loadQuizBank } from '../utils/quizParser';
import { databaseService, FALLBACK_USERS, LOCAL_AUTH_KEY, LOCAL_DB_PREFIX } from '../services/databaseService';

interface ClassroomContextType {
  classes: Classroom[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  addClass: (cls: Omit<Classroom, 'id'>) => void;
  updateClass: (id: string, cls: Partial<Classroom>) => void;
  deleteClass: (id: string) => void;
  bulkDeleteClasses: (ids: string[]) => void;
  bulkUpdateClasses: (ids: string[], updates: Partial<Classroom>) => void;
  deleteAllClasses: () => void;

  students: Student[];
  currentClassStudents: Student[];
  addStudent: (student: Omit<Student, 'id' | 'points' | 'stt'>) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  bulkDeleteStudents: (studentIds: string[]) => void;
  clearClassStudents: (classId: string) => void;
  bulkAddStudents: (students: Array<{ name: string; gender: 'Nam' | 'Nữ'; birthDate?: string; group?: string; role?: string; roles?: string[] }>) => void;
  resetStudentsCoins: (studentIds?: string[], classId?: string) => void;

  subjects: Subject[];
  addSubject: (name: string, color?: string, icon?: string) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  toggleSubjectApplied: (id: string, enabled?: boolean) => void;
  setAppliedSubjects: (subjectIds: string[]) => void;
  resetDefaultSubjects: () => void;

  criteria: PointCriterion[];
  addCriterion: (crit: Omit<PointCriterion, 'id'>) => void;

  transactions: PointTransaction[];
  awardPoints: (studentIds: string[], amount: number, reason: string, subjectName?: string) => void;
  deductPoints: (studentIds: string[], amount: number, reason: string, subjectName?: string) => void;

  rewards: Reward[];
  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (id: string, data: Partial<Reward>) => void;
  deleteReward: (id: string) => void;
  redemptions: RewardRedemption[];
  redeemReward: (studentId: string, rewardId: string) => { success: boolean; message: string };

  seatingColumns: SeatingColumnsCount;
  setSeatingColumns: (cols: SeatingColumnsCount) => void;
  deskCountsPerColumn: number[];
  setDeskCountsPerColumn: (counts: number[]) => void;
  updateDeskCountForColumn: (colIndex: number, count: number) => void;
  deskNumberingOrder: DeskNumberingOrder;
  setDeskNumberingOrder: (order: DeskNumberingOrder) => void;
  teacherDeskPos: TeacherDeskPosition;
  setTeacherDeskPos: (pos: TeacherDeskPosition) => void;
  doorPos: DoorPosition;
  setDoorPos: (pos: DoorPosition) => void;
  blackboardPos: BlackboardPosition;
  setBlackboardPos: (pos: BlackboardPosition) => void;
  seatingAssignments: Record<string, string>; // seatKey -> studentId
  assignSeat: (seatKey: string, studentId: string | null) => void;
  autoAssignSeating: (mode?: 'random' | 'boy_girl' | 'name') => void;
  clearSeating: () => void;

  attendanceRecords: DailyAttendance[];
  currentDateAttendance: Record<string, AttendanceStatus>;
  setStudentAttendance: (studentId: string, status: AttendanceStatus, date?: string) => void;
  batchSetAttendance: (status: AttendanceStatus, date?: string) => void;

  boardingRecords: DailyBoardingMeal[];
  currentDateBoarding: Record<string, BoardingStatus>;
  setStudentBoarding: (studentId: string, status: BoardingStatus, date?: string) => void;
  batchSetBoarding: (status: BoardingStatus, date?: string) => void;

  timetable: TimetableSlot[];
  timetableConfig: TimetableConfig;
  setTimetableConfig: (config: TimetableConfig) => void;
  updateTimetableSlot: (day: number, session: 'morning' | 'afternoon', period: number, subject: string, classId?: string) => void;

  // Vai trò giáo viên & Quản lý nhiều lớp của Giáo viên bộ môn (User request)
  teacherRole: TeacherRole;
  setTeacherRole: (role: TeacherRole) => void;
  subjectTeacherConfig: SubjectTeacherConfig;
  updateSubjectTeacherConfig: (cfg: Partial<SubjectTeacherConfig>) => void;
  subjectTimetable: SubjectTimetableSlot[];
  updateSubjectTimetableSlot: (slot: Omit<SubjectTimetableSlot, 'id'> & { id?: string }) => void;
  deleteSubjectTimetableSlot: (id: string) => void;
  clearSubjectTimetable: () => void;
  seedSample20SubjectClasses: () => void;
  loadSampleTimetableByImage: (autoCreateClasses?: boolean) => void;
  initSubjectClasses: (items: InitSubjectClassItem[], replaceExisting?: boolean) => void;
  applySubjectTimetableSlots: (slots: SubjectTimetableSlot[]) => void;

  quickLinks: QuickLink[];
  addQuickLink: (link: Omit<QuickLink, 'id'>) => void;
  deleteQuickLink: (id: string) => void;
  updateQuickLink: (id: string, data: Partial<Omit<QuickLink, 'id'>>) => void;
  reorderQuickLinks: (links: QuickLink[]) => void;

  teacherProfile: TeacherProfile;
  updateTeacherProfile: (profile: Partial<TeacherProfile>) => void;

  // Kho câu hỏi độc lập & Infographic lưu trực tuyến theo tài khoản
  quizBank: QuestionItem[];
  setQuizBank: React.Dispatch<React.SetStateAction<QuestionItem[]>>;
  updateQuizBank: (questions: QuestionItem[]) => void;
  infographicConfig: any;
  updateInfographicConfig: (cfg: any) => void;

  exportBackupJson: () => void;
  importBackupJson: (file: File) => Promise<boolean>;
  exportBackupZip: () => Promise<void>;
  importBackupZip: (file: File) => Promise<boolean>;
  resetToDefaultData: () => void;
  clearAllData: () => void;

  // Quản lý người dùng, phân quyền & Cơ sở dữ liệu đồng bộ
  currentUser: UserAccount | null;
  allUsers: UserAccount[];
  allTeachers: UserAccount[];
  loginUser: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => void;
  switchUserAccount: (username: string) => Promise<boolean>;
  refreshUsersList: () => Promise<void>;
  logUserActivity: (actionType: string, description: string, details?: any) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAccountManagerOpen: boolean;
  setIsAccountManagerOpen: (open: boolean) => void;
  isGithubModalOpen: boolean;
  setIsGithubModalOpen: (open: boolean) => void;
  dbSyncStatus: 'synced' | 'syncing' | 'offline';
  lastDbSyncTime: string;
  syncDatabaseNow: (overrideStudents?: any, overrideClasses?: any) => Promise<void>;
  isAdmin: boolean;
  isHomeroom: boolean;
  isSubject: boolean;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

export const ClassroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 0. User Authentication & Independent Workspace
  // Mặc định khi truy cập lần đầu tiên hoặc quá 300 phút: yêu cầu đăng nhập lại
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (!databaseService.isSessionValid()) {
      return null;
    }
    return databaseService.getCurrentUser();
  });
  const [allUsers, setAllUsers] = useState<UserAccount[]>(FALLBACK_USERS);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    return !databaseService.isSessionValid();
  });
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastDbSyncTime, setLastDbSyncTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const currentUserRef = useRef<UserAccount | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Flag to prevent echo loops when remote updates are applied
  const isApplyingRemoteUpdateRef = useRef(false);

  // Purge any legacy browser localStorage to ensure zero data stored in user browser
  useEffect(() => {
    databaseService.purgeLocalStorageUserData();
  }, []);

  // 1. Initial In-Memory State (Authoritative data is fetched directly from Server)
  const [classes, setClasses] = useState<Classroom[]>(INITIAL_CLASSES);
  const [activeClassId, setActiveClassId] = useState<string>('class-4a1');
  const [students, setStudents] = useState<Student[]>(() => INITIAL_STUDENTS_CLASS_4A1.map(s => ({
    ...s,
    subjectPoints: { 'GHI CHUNG / NỀ NẾP': s.points }
  })));

  // Always retain the latest synchronous references to avoid stale closure updates
  const studentsRef = useRef<Student[]>(students);
  const classesRef = useRef<Classroom[]>(classes);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);
  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  // ⚡ Instant synchronization across browser tabs and windows via local BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      const bc = new BroadcastChannel('lop_hoc_realtime_local');
      bc.onmessage = (event) => {
        const msg = event.data;
        if (msg && msg.type === 'STUDENT_UPDATED' && msg.studentId && msg.studentData) {
          setStudents(prev => {
            const next = prev.map(s => s.id === msg.studentId ? { ...s, ...msg.studentData } : s);
            studentsRef.current = next;
            return next;
          });
        } else if (msg && msg.type === 'CLASS_UPDATED' && msg.classId && msg.classData) {
          setClasses(prev => {
            const next = prev.map(c => c.id === msg.classId ? { ...c, ...msg.classData } : c);
            classesRef.current = next;
            return next;
          });
        }
      };
      return () => {
        bc.close();
      };
    } catch (_) {}
  }, []);

  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [criteria, setCriteria] = useState<PointCriterion[]>(INITIAL_CRITERIA);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>(INITIAL_REWARDS);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [seatingColumns, setSeatingColumnsState] = useState<SeatingColumnsCount>(4);
  const [deskCountsPerColumn, setDeskCountsPerColumn] = useState<number[]>([4, 4, 4, 4]);
  const [deskNumberingOrder, setDeskNumberingOrder] = useState<DeskNumberingOrder>('vertical');

  const setSeatingColumns = (cols: SeatingColumnsCount) => {
    setSeatingColumnsState(cols);
    setDeskCountsPerColumn(prev => {
      const next = [...prev];
      while (next.length < cols) {
        next.push(4);
      }
      return next.slice(0, cols);
    });
  };

  const updateDeskCountForColumn = (colIndex: number, count: number) => {
    const clamped = Math.max(1, Math.min(8, count));
    setDeskCountsPerColumn(prev => {
      const next = [...prev];
      while (next.length <= colIndex) {
        next.push(4);
      }
      next[colIndex] = clamped;
      return next;
    });
  };

  const [teacherDeskPos, setTeacherDeskPos] = useState<TeacherDeskPosition>('left');
  const [doorPos, setDoorPos] = useState<DoorPosition>('right');
  const [blackboardPos, setBlackboardPos] = useState<BlackboardPosition>('center');
  const [seatingAssignments, setSeatingAssignments] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    INITIAL_STUDENTS_CLASS_4A1.slice(0, 16).forEach((s, idx) => {
      const col = Math.floor(idx / 8);
      const rowInCol = Math.floor((idx % 8) / 2);
      const sub = idx % 2;
      initialMap[`${col}-${rowInCol}-${sub}`] = s.id;
    });
    return initialMap;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);
  const [boardingRecords, setBoardingRecords] = useState<DailyBoardingMeal[]>([]);
  const [timetableConfig, setTimetableConfig] = useState<TimetableConfig>({ morningPeriods: 4, afternoonPeriods: 3, hasSaturday: false });
  const [timetable, setTimetable] = useState<TimetableSlot[]>(INITIAL_TIMETABLE);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(INITIAL_QUICK_LINKS);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(DEFAULT_TEACHER);

  // Vai trò giáo viên (homeroom = Chủ nhiệm, subject = Bộ môn)
  const [teacherRole, setTeacherRoleState] = useState<TeacherRole>(() => {
    if (currentUser && currentUser.role !== 'admin') {
      return currentUser.role === 'subject' ? 'subject' : 'homeroom';
    }
    return 'homeroom';
  });

  const setTeacherRole = (role: TeacherRole) => {
    if (currentUser && currentUser.role !== 'admin') {
      const fixed = currentUser.role === 'subject' ? 'subject' : 'homeroom';
      setTeacherRoleState(fixed);
      return;
    }
    setTeacherRoleState(role);
  };

  const [subjectTeacherConfig, setSubjectTeacherConfig] = useState<SubjectTeacherConfig>(DEFAULT_SUBJECT_TEACHER_CONFIG);
  const updateSubjectTeacherConfig = (cfg: Partial<SubjectTeacherConfig>) => {
    setSubjectTeacherConfig(prev => ({ ...prev, ...cfg }));
  };

  const [subjectTimetable, setSubjectTimetable] = useState<SubjectTimetableSlot[]>(INITIAL_SUBJECT_TIMETABLE);
  const [quizBank, setQuizBank] = useState<QuestionItem[]>(DEFAULT_QUESTIONS);
  const updateQuizBank = (questions: QuestionItem[]) => {
    setQuizBank(questions);
  };

  const [infographicConfig, setInfographicConfig] = useState<any>(null);
  const updateInfographicConfig = (cfg: any) => {
    setInfographicConfig(cfg);
  };

  // Helper to construct complete dataset snapshot
  const getCurrentUserData = (): UserClassroomData => ({
    classes,
    activeClassId,
    students,
    subjects,
    criteria,
    transactions,
    rewards,
    redemptions,
    seatingColumns,
    deskCountsPerColumn,
    deskNumberingOrder,
    teacherDeskPos,
    doorPos,
    blackboardPos,
    seatingAssignments,
    attendanceRecords,
    boardingRecords,
    timetable,
    timetableConfig,
    teacherRole,
    subjectTeacherConfig,
    subjectTimetable,
    quickLinks,
    teacherProfile,
    quizBank,
    infographicConfig
  });

  // Helper to apply dataset snapshot into state hooks
  const applyUserClassroomData = (data: Partial<UserClassroomData>) => {
    if (data.classes && Array.isArray(data.classes)) {
      setClasses(data.classes);
    }
    if (data.activeClassId) {
      setActiveClassId(data.activeClassId);
    }
    if (data.students && Array.isArray(data.students)) {
      setStudents(data.students);
    }
    if (data.subjects && Array.isArray(data.subjects) && data.subjects.length > 0) {
      setSubjects(data.subjects);
    }
    if (data.criteria && Array.isArray(data.criteria)) {
      setCriteria(data.criteria);
    }
    if (data.transactions && Array.isArray(data.transactions)) {
      setTransactions(data.transactions);
    }
    if (data.rewards && Array.isArray(data.rewards)) {
      setRewards(data.rewards);
    }
    if (data.redemptions && Array.isArray(data.redemptions)) {
      setRedemptions(data.redemptions);
    }
    if (data.seatingColumns) {
      setSeatingColumns(data.seatingColumns);
    }
    if (data.deskCountsPerColumn && Array.isArray(data.deskCountsPerColumn)) {
      setDeskCountsPerColumn(data.deskCountsPerColumn);
    }
    if (data.deskNumberingOrder) {
      setDeskNumberingOrder(data.deskNumberingOrder);
    }
    if (data.teacherDeskPos) {
      setTeacherDeskPos(data.teacherDeskPos);
    }
    if (data.doorPos) {
      setDoorPos(data.doorPos);
    }
    if (data.blackboardPos) {
      setBlackboardPos(data.blackboardPos);
    }
    if (data.seatingAssignments) {
      setSeatingAssignments(data.seatingAssignments);
    }
    if (data.attendanceRecords && Array.isArray(data.attendanceRecords)) {
      setAttendanceRecords(data.attendanceRecords);
    }
    if (data.boardingRecords && Array.isArray(data.boardingRecords)) {
      setBoardingRecords(data.boardingRecords);
    }
    if (data.timetable && Array.isArray(data.timetable)) {
      setTimetable(data.timetable);
    }
    if (data.timetableConfig) {
      setTimetableConfig(data.timetableConfig);
    }
    if (data.teacherRole) {
      setTeacherRoleState(data.teacherRole);
    }
    if (data.subjectTeacherConfig) {
      setSubjectTeacherConfig(data.subjectTeacherConfig);
    }
    if (data.subjectTimetable && Array.isArray(data.subjectTimetable)) {
      setSubjectTimetable(data.subjectTimetable);
    }
    if (data.quickLinks && Array.isArray(data.quickLinks)) {
      setQuickLinks(data.quickLinks);
    }
    if (data.teacherProfile) {
      setTeacherProfile(data.teacherProfile);
    }
    if (data.quizBank && Array.isArray(data.quizBank)) {
      setQuizBank(data.quizBank);
    }
    if (data.infographicConfig) {
      setInfographicConfig(data.infographicConfig);
    }
  };

  // Helper to build initial independent default data for a user
  const buildDefaultDataForUser = (user: UserAccount): UserClassroomData => {
    if (user.role === 'subject') {
      // Yêu cầu: Mặc định tài khoản giáo viên bộ môn sẽ có 1 lớp demo là lớp 3A1 với 20 học sinh
      const demoClass3A1: Classroom = {
        id: 'class-sub-3a1',
        name: '3A1',
        grade: 'Khối 3',
        color: '#3B82F6',
        academicYear: '2026–2027',
        teacherName: user.fullName || 'Nguyễn Thanh Liêm',
        avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=SubClass_3A1&backgroundColor=3b82f6',
        slogan: 'Lớp 3A1 • Học tập hăng say, rèn luyện chăm chỉ'
      };
      const subClasses: Classroom[] = [demoClass3A1];

      const allSubStudents: Student[] = generateStudentsForClass(
        'class-sub-3a1',
        '3A1',
        20,
        'Khối 3',
        user.subjectName || 'Tin học'
      );

      const profile: TeacherProfile = {
        name: user.fullName || 'NGUYỄN THANH LIÊM',
        role: 'GIÁO VIÊN BỘ MÔN',
        teachingSubject: user.subjectName || 'Tin học',
        schoolName: user.schoolName || 'Trường Tiểu học số 1 Tân Uyên',
        avatar: user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ThayNguyenThanhLiem&backgroundColor=b6e3f4',
        phone: user.phone || '0888358363',
        zalo: user.phone || '0888358363',
        academicYear: '2026–2027'
      };

      const cfg: SubjectTeacherConfig = {
        ...DEFAULT_SUBJECT_TEACHER_CONFIG,
        subjectName: user.subjectName || 'Tin học',
        teacherDisplayName: user.fullName || 'Nguyễn Thanh Liêm'
      };

      return {
        classes: subClasses,
        activeClassId: subClasses[0]?.id || 'class-sub-3a1',
        students: allSubStudents,
        subjects: INITIAL_SUBJECTS,
        criteria: INITIAL_CRITERIA,
        transactions: [],
        rewards: INITIAL_REWARDS,
        redemptions: [],
        seatingColumns: 4,
        deskCountsPerColumn: [4, 4, 4, 4],
        deskNumberingOrder: 'vertical',
        teacherDeskPos: 'left',
        doorPos: 'right',
        blackboardPos: 'center',
        seatingAssignments: {},
        attendanceRecords: [],
        boardingRecords: [],
        timetable: INITIAL_TIMETABLE,
        timetableConfig: { morningPeriods: 4, afternoonPeriods: 3, hasSaturday: false },
        teacherRole: 'subject',
        subjectTeacherConfig: cfg,
        subjectTimetable: SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE,
        quickLinks: INITIAL_QUICK_LINKS,
        teacherProfile: profile,
        quizBank: [...DEFAULT_QUESTIONS],
        infographicConfig: null
      };
    }

    const homeroomClass: Classroom = {
      id: `class-${(user.assignedClassName || '4a1').toLowerCase().replace(/\s+/g, '')}`,
      name: user.assignedClassName || '4A1',
      grade: 'Khối 4',
      color: '#3B82F6',
      academicYear: '2026–2027',
      teacherName: user.fullName || 'NGUYỄN THỊ HOA',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1&backgroundColor=3b82f6',
      slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng'
    };

    const initialStds = user.username.toLowerCase() === 'gvcn4a1'
      ? INITIAL_STUDENTS_CLASS_4A1
      : generateStudentsForClass(homeroomClass.id, homeroomClass.name, 32, 'Khối 4', 'GHI CHUNG / NỀ NẾP');

    const profile: TeacherProfile = {
      ...DEFAULT_TEACHER,
      name: user.fullName || DEFAULT_TEACHER.name,
      role: 'GIÁO VIÊN CHỦ NHIỆM',
      teachingSubject: 'Giáo viên chủ nhiệm',
      phone: user.phone || DEFAULT_TEACHER.phone,
      zalo: user.phone || DEFAULT_TEACHER.zalo,
      schoolName: user.schoolName || DEFAULT_TEACHER.schoolName,
      avatar: user.avatar || DEFAULT_TEACHER.avatar
    };

    return {
      classes: [homeroomClass],
      activeClassId: homeroomClass.id,
      students: initialStds.map(s => ({
        ...s,
        subjectPoints: s.subjectPoints || { 'GHI CHUNG / NỀ NẾP': s.points || 0 }
      })),
      subjects: INITIAL_SUBJECTS,
      criteria: INITIAL_CRITERIA,
      transactions: [],
      rewards: INITIAL_REWARDS,
      redemptions: [],
      seatingColumns: 4,
      deskCountsPerColumn: [4, 4, 4, 4],
      deskNumberingOrder: 'vertical',
      teacherDeskPos: 'left',
      doorPos: 'right',
      blackboardPos: 'center',
      seatingAssignments: {},
      attendanceRecords: [],
      boardingRecords: [],
      timetable: INITIAL_TIMETABLE,
      timetableConfig: { morningPeriods: 4, afternoonPeriods: 3, hasSaturday: false },
      teacherRole: 'homeroom',
      subjectTeacherConfig: DEFAULT_SUBJECT_TEACHER_CONFIG,
      subjectTimetable: SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE,
      quickLinks: INITIAL_QUICK_LINKS,
      teacherProfile: profile,
      quizBank: [...DEFAULT_QUESTIONS],
      infographicConfig: null
    };
  };

  // Refresh users from database
  const refreshUsersList = async () => {
    try {
      const uList = await databaseService.getUsers();
      if (Array.isArray(uList) && uList.length > 0) {
        setAllUsers(uList);
      }
    } catch (_) {}
  };

  // Helper ghi nhật ký thao tác trực tuyến vào audit log
  const logUserActivity = (actionType: string, description: string, details?: any) => {
    const user = currentUserRef.current;
    if (!user) return;
    databaseService.addAuditLog({
      username: user.username,
      userFullName: user.fullName,
      role: user.role,
      actionType,
      description,
      details
    });
  };

  // Multi-browser synchronization refs
  const isRemoteDataLoadedRef = useRef(false);
  const lastRemoteTimestampRef = useRef<number>(0);
  const remoteUpdateLockUntilRef = useRef<number>(0);

  const markRemoteUpdateActive = (durationMs = 1200) => {
    isApplyingRemoteUpdateRef.current = true;
    remoteUpdateLockUntilRef.current = Date.now() + durationMs;
    setTimeout(() => {
      if (Date.now() >= remoteUpdateLockUntilRef.current) {
        isApplyingRemoteUpdateRef.current = false;
      }
    }, durationMs + 50);
  };

  // Load user data on startup or when currentUser changes
  useEffect(() => {
    refreshUsersList();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      isRemoteDataLoadedRef.current = false;
      return;
    }

    isRemoteDataLoadedRef.current = false;

    const initUserData = async () => {
      setDbSyncStatus('syncing');
      try {
        if (currentUser.role === 'admin') {
          // Admin Unified Sync: load all classes and students from all teachers
          const adminAll = await databaseService.getAdminAllData();
          if (adminAll && Array.isArray(adminAll.classes)) {
            markRemoteUpdateActive(1200);
            lastRemoteTimestampRef.current = adminAll.timestamp || Date.now();
            setClasses(adminAll.classes);
            setStudents(adminAll.students);
            if (adminAll.classes.length > 0) {
              setActiveClassId(prev => {
                const exists = adminAll.classes.some(c => c.id === prev);
                return exists ? prev : adminAll.classes[0].id;
              });
            }
          }
        } else {
          const savedData = await databaseService.loadUserData(currentUser.username);
          if (savedData) {
            markRemoteUpdateActive(1200);
            lastRemoteTimestampRef.current = savedData.updatedAt || Date.now();
            applyUserClassroomData(savedData);
          } else {
            // If no data saved for this user yet, seed initial default and save to DB
            const initialData = buildDefaultDataForUser(currentUser);
            markRemoteUpdateActive(1200);
            applyUserClassroomData(initialData);
            await databaseService.saveUserData(currentUser.username, initialData);
            lastRemoteTimestampRef.current = Date.now();
          }
        }
        isRemoteDataLoadedRef.current = true;
        setDbSyncStatus('synced');
        const now = new Date();
        setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      } catch (err) {
        console.warn('Initial data load warning:', err);
        setDbSyncStatus('offline');
        // Still allow editing if offline
        isRemoteDataLoadedRef.current = true;
      }
    };

    initUserData();
  }, [currentUser?.username]);

  // ⚡ Live Real-time Continuous Multi-computer / Multi-browser Synchronization via SSE
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = databaseService.subscribeRealtimeUpdates(currentUser.username, async (event) => {
      try {
        if (currentUser.role === 'admin') {
          const adminAll = await databaseService.getAdminAllData();
          if (adminAll && Array.isArray(adminAll.classes)) {
            markRemoteUpdateActive(1200);
            lastRemoteTimestampRef.current = adminAll.timestamp || Date.now();
            setClasses(adminAll.classes);
            setStudents(adminAll.students);
            setDbSyncStatus('synced');
            const now = new Date();
            setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
          }
        } else {
          const target = event.username?.toLowerCase();
          const me = currentUser.username.toLowerCase();
          if (!target || target === me || target === 'all' || target === 'admin' || event.targetUsername === me) {
            const fresh = await databaseService.loadUserData(currentUser.username);
            if (fresh) {
              markRemoteUpdateActive(1200);
              lastRemoteTimestampRef.current = fresh.updatedAt || Date.now();
              applyUserClassroomData(fresh);
              setDbSyncStatus('synced');
              const now = new Date();
              setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
            }
          }
        }
      } catch (err) {
        console.warn('Realtime event handler error:', err);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.username, currentUser?.role]);

  // Real-time Multi-browser & Multi-tab sync polling (Fallback layer)
  useEffect(() => {
    if (!currentUser) return;

    let isChecking = false;
    const checkRemoteChanges = async () => {
      if (!isRemoteDataLoadedRef.current || isChecking) return;
      if (Date.now() < remoteUpdateLockUntilRef.current) return;
      isChecking = true;
      try {
        if (currentUser.role === 'admin') {
          const adminAll = await databaseService.getAdminAllData();
          if (adminAll && adminAll.timestamp && adminAll.timestamp > (lastRemoteTimestampRef.current + 50)) {
            markRemoteUpdateActive(1200);
            lastRemoteTimestampRef.current = adminAll.timestamp;
            setClasses(adminAll.classes);
            setStudents(adminAll.students);
            setDbSyncStatus('synced');
            const now = new Date();
            setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
          }
        } else {
          const remote = await databaseService.loadUserData(currentUser.username);
          if (remote && remote.updatedAt && remote.updatedAt > (lastRemoteTimestampRef.current + 50)) {
            markRemoteUpdateActive(1200);
            lastRemoteTimestampRef.current = remote.updatedAt;
            applyUserClassroomData(remote);
            setDbSyncStatus('synced');
            const now = new Date();
            setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
          }
        }
      } catch (_) {
        // silent
      } finally {
        isChecking = false;
      }
    };

    // Polling every 2.5 seconds
    const pollInterval = setInterval(checkRemoteChanges, 2500);

    // Sync immediately when tab gains focus
    const onFocus = () => {
      checkRemoteChanges();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUser?.username]);

  // Kiểm tra thời hạn phiên đăng nhập 300 phút liên tục
  useEffect(() => {
    const sessionTimer = setInterval(() => {
      if (!databaseService.isSessionValid()) {
        if (currentUserRef.current) {
          console.warn('Phiên làm việc 300 phút đã kết thúc. Vui lòng đăng nhập lại.');
          logoutUser();
        } else {
          setIsAuthModalOpen(true);
        }
      }
    }, 20000); // 20 giây kiểm tra một lần

    return () => clearInterval(sessionTimer);
  }, []);

  // Debounced auto-save & database synchronization (Super-fast 200ms debounce with remote echo protection)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Do NOT auto-save if remote data is still loading
    if (!isRemoteDataLoadedRef.current || !currentUser) return;

    // Do NOT auto-save if this state update was triggered by receiving data from server (breaks echo loops)
    if (Date.now() < remoteUpdateLockUntilRef.current || isApplyingRemoteUpdateRef.current) {
      return;
    }

    setDbSyncStatus('syncing');
    const timer = setTimeout(() => {
      const nowTs = Date.now();
      lastRemoteTimestampRef.current = nowTs;

      if (currentUser.role === 'admin') {
        databaseService.syncAdminAllData(classes, students).then(() => {
          setDbSyncStatus('synced');
          const now = new Date();
          setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }).catch(() => {
          setDbSyncStatus('offline');
        });
      } else {
        const payload: UserClassroomData = {
          ...getCurrentUserData(),
          updatedAt: nowTs
        };
        databaseService.saveUserData(currentUser.username, payload).then(() => {
          setDbSyncStatus('synced');
          const now = new Date();
          setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }).catch(() => {
          setDbSyncStatus('offline');
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [
    classes, activeClassId, students, subjects, criteria, transactions,
    rewards, redemptions, seatingColumns, deskCountsPerColumn, deskNumberingOrder,
    teacherDeskPos, doorPos, blackboardPos, seatingAssignments, attendanceRecords,
    boardingRecords, timetable, timetableConfig, teacherRole, subjectTeacherConfig,
    subjectTimetable, quickLinks, teacherProfile, quizBank, infographicConfig,
    currentUser?.username
  ]);

  // User Auth Actions
  const loginUser = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // 1. Save current workspace before switching if logged in
    if (currentUser) {
      const currentData = getCurrentUserData();
      await databaseService.saveUserData(currentUser.username, currentData);
    }

    // 2. Perform login
    const res = await databaseService.login(username, password);
    if (res.success && res.user) {
      const newUser = res.user;
      setCurrentUser(newUser);

      // Ghi nhật ký đăng nhập
      databaseService.addAuditLog({
        username: newUser.username,
        userFullName: newUser.fullName,
        role: newUser.role,
        actionType: 'OTHER',
        description: `Đăng nhập vào hệ thống (${newUser.fullName})`
      });

      // Gán vai trò chính xác theo tài khoản được phân quyền (GVCN / GVBM)
      if (newUser.role === 'homeroom') {
        setTeacherRoleState('homeroom');
      } else if (newUser.role === 'subject') {
        setTeacherRoleState('subject');
      }

      // 3. Load target user's workspace
      const targetData = await databaseService.loadUserData(newUser.username);
      if (targetData) {
        applyUserClassroomData(targetData);
      } else {
        const defaultData = buildDefaultDataForUser(newUser);
        applyUserClassroomData(defaultData);
        await databaseService.saveUserData(newUser.username, defaultData);
      }

      await refreshUsersList();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const logoutUser = () => {
    // Save current data & record logout
    if (currentUser) {
      databaseService.addAuditLog({
        username: currentUser.username,
        userFullName: currentUser.fullName,
        role: currentUser.role,
        actionType: 'OTHER',
        description: `Đăng xuất khỏi hệ thống (${currentUser.fullName})`
      });
      const currentData = getCurrentUserData();
      databaseService.saveUserData(currentUser.username, currentData);
    }
    databaseService.logout();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const switchUserAccount = async (username: string): Promise<boolean> => {
    // Yêu cầu: Tài khoản giáo viên chủ nhiệm và giáo viên bộ môn không thể chuyển đổi qua lại với các tài khoản khác
    // mà bắt buộc phải đăng xuất và đăng nhập với tài khoản được gán đúng vai trò.
    // Chỉ tài khoản quản trị (admin) mới có chức năng xem toàn bộ thông tin và chuyển đổi qua lại.
    if (currentUser?.role !== 'admin') {
      console.warn('Tài khoản giáo viên không thể chuyển đổi nhanh sang tài khoản khác. Vui lòng đăng xuất để đăng nhập.');
      return false;
    }

    const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!targetUser) return false;

    // 1. Save current workspace
    if (currentUser) {
      const currentData = getCurrentUserData();
      await databaseService.saveUserData(currentUser.username, currentData);
    }

    // 2. Switch current user
    setCurrentUser(targetUser);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(targetUser));
    databaseService.touchSession();

    // 3. Load target data
    const targetData = await databaseService.loadUserData(targetUser.username);
    if (targetData) {
      applyUserClassroomData(targetData);
    } else {
      const defaultData = buildDefaultDataForUser(targetUser);
      applyUserClassroomData(defaultData);
      await databaseService.saveUserData(targetUser.username, defaultData);
    }

    return true;
  };

  const syncDatabaseNow = async (overrideStudents?: any, overrideClasses?: any): Promise<void> => {
    if (!currentUser) return;
    // Release any anti-echo locks immediately so user-triggered sync always wins
    isApplyingRemoteUpdateRef.current = false;
    remoteUpdateLockUntilRef.current = 0;

    const curStudents = Array.isArray(overrideStudents)
      ? overrideStudents
      : (studentsRef.current.length > 0 ? studentsRef.current : students);
    const curClasses = Array.isArray(overrideClasses)
      ? overrideClasses
      : (classesRef.current.length > 0 ? classesRef.current : classes);
    const nowTs = Date.now();
    lastRemoteTimestampRef.current = nowTs;

    setDbSyncStatus('syncing');
    if (currentUser.role === 'admin') {
      const ok = await databaseService.syncAdminAllData(curClasses, curStudents);
      setDbSyncStatus(ok ? 'synced' : 'offline');
    } else {
      const payload: UserClassroomData = {
        ...getCurrentUserData(),
        classes: curClasses,
        students: curStudents,
        updatedAt: nowTs
      };
      const ok = await databaseService.saveUserData(currentUser.username, payload);
      setDbSyncStatus(ok ? 'synced' : 'offline');
    }
    const now = new Date();
    setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  // Auto-heal activeClassId if it becomes invalid or empty when classes exist
  const effectiveActiveClassId = activeClassId && classes.some(c => c.id === activeClassId)
    ? activeClassId
    : (classes[0]?.id || '');

  useEffect(() => {
    if (classes.length > 0 && (!activeClassId || !classes.some(c => c.id === activeClassId))) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId]);

  // Derived students for active class
  const currentClassStudents = students
    .filter(s => s.classId === (effectiveActiveClassId || activeClassId))
    .sort((a, b) => a.stt - b.stt);

  // Class methods
  const addClass = (cls: Omit<Classroom, 'id'>) => {
    const newId = `class-${Date.now()}`;
    const newCls: Classroom = { ...cls, id: newId };
    setClasses(prev => [...prev, newCls]);
    setActiveClassId(newId);
    logUserActivity('CREATE_CLASS', `Mở thêm lớp học mới: ${newCls.name} (${newCls.grade || ''})`, { classId: newId, name: newCls.name });
  };

  const updateClass = (id: string, updated: Partial<Classroom>) => {
    // Release anti-echo locks immediately so user actions always take precedence
    isApplyingRemoteUpdateRef.current = false;
    remoteUpdateLockUntilRef.current = 0;

    const currentList = classesRef.current.length > 0 ? classesRef.current : classes;
    const nextClasses = currentList.map(c => c.id === id ? { ...c, ...updated } : c);
    setClasses(nextClasses);
    classesRef.current = nextClasses;

    const target = nextClasses.find(c => c.id === id) || ({} as Classroom);
    logUserActivity('UPDATE_CLASS', `Chỉnh sửa thông tin lớp: ${updated.name || target?.name || id}`);

    const nowTs = Date.now();
    lastRemoteTimestampRef.current = nowTs;

    // Immediate database synchronization
    if (currentUser) {
      setDbSyncStatus('syncing');
      if (currentUser.role === 'admin') {
        databaseService.updateAdminClass(target).catch(() => {});
        databaseService.syncAdminAllData(nextClasses, studentsRef.current.length > 0 ? studentsRef.current : students).then(() => {
          setDbSyncStatus('synced');
          const now = new Date();
          setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }).catch(() => {
          setDbSyncStatus('offline');
        });
      } else {
        const payload: UserClassroomData = {
          ...getCurrentUserData(),
          classes: nextClasses,
          updatedAt: nowTs
        };
        databaseService.saveUserData(currentUser.username, payload).then(() => {
          setDbSyncStatus('synced');
          const now = new Date();
          setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }).catch(() => {
          setDbSyncStatus('offline');
        });
      }
    }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('lop_hoc_realtime_local');
        bc.postMessage({ type: 'CLASS_UPDATED', classId: id, classData: updated, timestamp: nowTs });
        bc.close();
      }
    } catch (_) {}
  };

  const deleteClass = (id: string) => {
    const target = classes.find(c => c.id === id);
    const remaining = classes.filter(c => c.id !== id);
    setClasses(remaining);
    if (activeClassId === id) {
      setActiveClassId(remaining.length > 0 ? remaining[0].id : '');
    }
    // Clean up students belonging to deleted class
    setStudents(prev => prev.filter(s => s.classId !== id));
    // Clean up seating
    setSeatingAssignments(prev => {
      const next = { ...prev };
      const targetIds = new Set(students.filter(s => s.classId === id).map(s => s.id));
      Object.keys(next).forEach(k => {
        if (targetIds.has(next[k])) delete next[k];
      });
      return next;
    });
    // Clean up timetable slots for deleted class (Requirement 2 synchronization)
    const targetNameLower = (target?.name || '').toLowerCase().trim();
    setSubjectTimetable(prev => prev.filter(slot => {
      if (slot.classId === id) return false;
      if (targetNameLower && slot.className.toLowerCase().trim() === targetNameLower) return false;
      return true;
    }));
    logUserActivity('DELETE_CLASS', `Xóa lớp học: ${target?.name || id}`, { classId: id, name: target?.name });
  };

  const bulkDeleteClasses = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetSet = new Set(ids);
    const targetClasses = classes.filter(c => targetSet.has(c.id));
    const targetNamesLower = new Set(targetClasses.map(c => c.name.toLowerCase().trim()));

    const remaining = classes.filter(c => !targetSet.has(c.id));
    setClasses(remaining);

    if (targetSet.has(activeClassId)) {
      setActiveClassId(remaining.length > 0 ? remaining[0].id : '');
    }

    // Clean up students belonging to deleted classes
    setStudents(prev => prev.filter(s => !targetSet.has(s.classId)));

    // Clean up seating
    setSeatingAssignments(prev => {
      const next = { ...prev };
      const studentIdsToDelete = new Set(students.filter(s => targetSet.has(s.classId)).map(s => s.id));
      Object.keys(next).forEach(k => {
        if (studentIdsToDelete.has(next[k])) delete next[k];
      });
      return next;
    });

    // Clean up timetable slots for deleted classes (Requirement 2 synchronization)
    setSubjectTimetable(prev => prev.filter(slot => {
      if (targetSet.has(slot.classId)) return false;
      if (targetNamesLower.has(slot.className.toLowerCase().trim())) return false;
      return true;
    }));

    // Clean up attendance & boarding records
    setAttendanceRecords(prev => prev.filter(r => !targetSet.has(r.classId)));
    setBoardingRecords(prev => prev.filter(r => !targetSet.has(r.classId)));

    const deletedNames = targetClasses.map(c => c.name).join(', ');
    logUserActivity('DELETE_CLASS', `Xóa đồng loạt ${ids.length} lớp học: ${deletedNames}`, { classIds: ids });
  };

  const bulkUpdateClasses = (ids: string[], updates: Partial<Classroom>) => {
    if (!ids || ids.length === 0) return;
    const targetSet = new Set(ids);
    setClasses(prev => prev.map(c => targetSet.has(c.id) ? { ...c, ...updates } : c));
    logUserActivity('UPDATE_CLASS', `Cập nhật thông tin đồng loạt cho ${ids.length} lớp học`, { classIds: ids, updates });
  };

  const deleteAllClasses = () => {
    setClasses([]);
    setActiveClassId('');
    setStudents([]);
    setSeatingAssignments({});
    setAttendanceRecords([]);
    setBoardingRecords([]);
    setSubjectTimetable([]);
    logUserActivity('DELETE_CLASS', 'Xóa toàn bộ danh sách lớp học');
  };

  // Student methods
  const addStudent = (st: Omit<Student, 'id' | 'points' | 'stt'>) => {
    const classStudents = students.filter(s => s.classId === activeClassId);
    const newStt = classStudents.length + 1;
    const newStudent: Student = {
      ...st,
      id: `hs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stt: newStt,
      points: 0,
      avatarScale: st.avatarScale || 1,
      avatarPosition: st.avatarPosition || { x: 0, y: 0 }
    };
    setStudents(prev => [...prev, newStudent]);
    const currentClass = classes.find(c => c.id === activeClassId);
    logUserActivity('ADD_STUDENT', `Thêm mới học sinh: ${newStudent.name} (STT ${newStt}) vào lớp ${currentClass?.name || ''}`);
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    // Release anti-echo locks immediately so user actions always take precedence
    isApplyingRemoteUpdateRef.current = false;
    remoteUpdateLockUntilRef.current = 0;

    const currentList = studentsRef.current.length > 0 ? studentsRef.current : students;
    const nextStudents = currentList.map(s => s.id === id ? { ...s, ...data } : s);
    setStudents(nextStudents);
    studentsRef.current = nextStudents;

    const targetStudent = nextStudents.find(s => s.id === id) || ({} as Student);
    logUserActivity('UPDATE_STUDENT', `Chỉnh sửa thông tin học sinh: ${data.name || targetStudent.name || id}`);

    const nowTs = Date.now();
    lastRemoteTimestampRef.current = nowTs;

    // Immediate database synchronization to Server & Supabase Cloud
    if (currentUser) {
      setDbSyncStatus('syncing');
      if (currentUser.role === 'admin') {
        databaseService.updateAdminStudent(targetStudent).catch(() => {});
        databaseService.syncAdminAllData(classesRef.current.length > 0 ? classesRef.current : classes, nextStudents).then(() => {
          setDbSyncStatus('synced');
          const now = new Date();
          setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }).catch(() => {
          setDbSyncStatus('offline');
        });
      } else {
        const payload: UserClassroomData = {
          ...getCurrentUserData(),
          students: nextStudents,
          updatedAt: nowTs
        };
        databaseService.saveUserData(currentUser.username, payload).then(() => {
          setDbSyncStatus('synced');
          const now = new Date();
          setLastDbSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }).catch(() => {
          setDbSyncStatus('offline');
        });
      }
    }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('lop_hoc_realtime_local');
        bc.postMessage({ type: 'STUDENT_UPDATED', studentId: id, studentData: data, timestamp: nowTs });
        bc.close();
      }
    } catch (_) {}
  };

  const deleteStudent = (id: string) => {
    const st = students.find(s => s.id === id);
    const currentClass = classes.find(c => c.id === st?.classId);
    setStudents(prev => prev.filter(s => s.id !== id));
    // also clean up seating assignment
    setSeatingAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k] === id) delete next[k];
      });
      return next;
    });
    logUserActivity('DELETE_STUDENT', `Xóa học sinh: ${st?.name || id} khỏi lớp ${currentClass?.name || ''}`);
  };

  const bulkDeleteStudents = (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    const idSet = new Set(studentIds);
    const currentClass = classes.find(c => c.id === activeClassId);
    setStudents(prev => prev.filter(s => !idSet.has(s.id)));
    setSeatingAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (idSet.has(next[k])) delete next[k];
      });
      return next;
    });
    logUserActivity('DELETE_STUDENT', `Xóa ${studentIds.length} học sinh khỏi lớp ${currentClass?.name || ''}`);
  };

  const clearClassStudents = (classId: string) => {
    const targetClass = classes.find(c => c.id === classId);
    const count = students.filter(s => s.classId === classId).length;
    setStudents(prev => prev.filter(s => s.classId !== classId));
    setSeatingAssignments(prev => {
      const next = { ...prev };
      const targetIds = new Set(students.filter(s => s.classId === classId).map(s => s.id));
      Object.keys(next).forEach(k => {
        if (targetIds.has(next[k])) delete next[k];
      });
      return next;
    });
    logUserActivity('DELETE_STUDENT', `Xóa toàn bộ ${count} học sinh của lớp ${targetClass?.name || classId}`);
  };

  const resetStudentsCoins = (studentIds?: string[], classId?: string) => {
    const targetClassId = classId || activeClassId;
    setStudents(prev => prev.map(s => {
      if (s.classId !== targetClassId) return s;
      if (studentIds && studentIds.length > 0 && !studentIds.includes(s.id)) return s;
      return { ...s, points: 0, subjectPoints: {} };
    }));
    logUserActivity('AWARD_POINTS', 'Đặt lại điểm xu về 0 cho học sinh');
  };

  const bulkAddStudents = (items: Array<{ name: string; gender: 'Nam' | 'Nữ'; birthDate?: string; group?: string; role?: string; roles?: string[] }>) => {
    const currentList = students.filter(s => s.classId === activeClassId);
    let startStt = currentList.length + 1;

    const newItems: Student[] = items.map((item, idx) => {
      const roles = item.roles && item.roles.length > 0
        ? item.roles.slice(0, 3)
        : (item.role ? item.role.split(/[•,;\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 3) : []);
      const roleStr = roles.join(' • ') || item.role || '';

      return {
        id: `hs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        classId: activeClassId,
        stt: startStt++,
        name: item.name,
        birthDate: item.birthDate || '',
        gender: item.gender,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=b6e3f4`,
        avatarScale: 1,
        avatarPosition: { x: 0, y: 0 },
        points: 0,
        subjectPoints: {},
        group: item.group || `Tổ ${Math.floor(idx / 8) + 1}`,
        role: roleStr,
        roles
      };
    });

    setStudents(prev => [...prev, ...newItems]);
    const currentClass = classes.find(c => c.id === activeClassId);
    logUserActivity('BATCH_STUDENTS', `Thêm mới danh sách ${newItems.length} học sinh vào lớp ${currentClass?.name || ''}`);
  };

  // Subjects (Cấu hình nhận xu: Thêm, sửa, xóa, thiết lập áp dụng cho lớp/giáo viên)
  const addSubject = (name: string, color = '#3B82F6', icon = 'BookOpen') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      name: trimmed,
      color,
      icon,
      enabled: true,
      isDefault: false
    };
    setSubjects(prev => {
      if (prev.some(s => s.name.trim().toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, newSub];
    });
  };

  const updateSubject = (id: string, data: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const toggleSubjectApplied = (id: string, enabled?: boolean) => {
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, enabled: enabled !== undefined ? enabled : !s.enabled };
      }
      return s;
    }));
  };

  const setAppliedSubjects = (subjectIds: string[]) => {
    const idSet = new Set(subjectIds);
    setSubjects(prev => prev.map(s => ({
      ...s,
      enabled: idSet.has(s.id)
    })));
  };

  const resetDefaultSubjects = () => {
    setSubjects([...INITIAL_SUBJECTS]);
  };

  // Criteria
  const addCriterion = (crit: Omit<PointCriterion, 'id'>) => {
    const newCrit: PointCriterion = {
      ...crit,
      id: `crit-${Date.now()}`
    };
    setCriteria(prev => [...prev, newCrit]);
  };

  // Points Award / Deduct (Lưu theo học sinh và theo môn, không làm mất tổng xu hiện tại)
  const awardPoints = (studentIds: string[], amount: number, reason: string, subjectName?: string) => {
    if (studentIds.length === 0 || amount <= 0) return;
    playCoinSound();

    const timestamp = Date.now();
    const newTxns: PointTransaction[] = [];
    const targetSubject = (subjectName && subjectName.trim()) ? subjectName.trim() : 'GHI CHUNG / NỀ NẾP';

    setStudents(prev => prev.map(s => {
      if (studentIds.includes(s.id)) {
        newTxns.push({
          id: `tx-${timestamp}-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          amount,
          reason,
          subjectName: targetSubject,
          timestamp
        });
        const currentSubPoints = s.subjectPoints || (s.points > 0 ? { 'GHI CHUNG / NỀ NẾP': s.points } : {});
        const oldXu = currentSubPoints[targetSubject] || 0;
        return { 
          ...s, 
          points: s.points + amount,
          subjectPoints: {
            ...currentSubPoints,
            [targetSubject]: oldXu + amount
          }
        };
      }
      return s;
    }));

    setTransactions(prev => [...newTxns, ...prev]);
    logUserActivity('AWARD_POINTS', `Cộng ${amount} xu cho ${studentIds.length} học sinh (Lý do: ${reason}, Môn: ${targetSubject})`);
  };

  const deductPoints = (studentIds: string[], amount: number, reason: string, subjectName?: string) => {
    if (studentIds.length === 0 || amount <= 0) return;
    playDeductSound();

    const timestamp = Date.now();
    const newTxns: PointTransaction[] = [];
    const targetSubject = (subjectName && subjectName.trim()) ? subjectName.trim() : 'GHI CHUNG / NỀ NẾP';

    setStudents(prev => prev.map(s => {
      if (studentIds.includes(s.id)) {
        newTxns.push({
          id: `tx-${timestamp}-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          amount: -amount,
          reason,
          subjectName: targetSubject,
          timestamp
        });
        const currentSubPoints = s.subjectPoints || (s.points > 0 ? { 'GHI CHUNG / NỀ NẾP': s.points } : {});
        const oldXu = currentSubPoints[targetSubject] || 0;
        return { 
          ...s, 
          points: Math.max(0, s.points - amount),
          subjectPoints: {
            ...currentSubPoints,
            [targetSubject]: Math.max(0, oldXu - amount)
          }
        };
      }
      return s;
    }));

    setTransactions(prev => [...newTxns, ...prev]);
    logUserActivity('AWARD_POINTS', `Trừ ${amount} xu của ${studentIds.length} học sinh (Lý do: ${reason}, Môn: ${targetSubject})`);
  };

  // Rewards
  const addReward = (reward: Omit<Reward, 'id'>) => {
    const newReward: Reward = {
      ...reward,
      id: `rew-${Date.now()}`,
      classId: reward.classId || activeClassId
    };
    setRewards(prev => [...prev, newReward]);
  };

  const updateReward = (id: string, data: Partial<Reward>) => {
    setRewards(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteReward = (id: string) => {
    setRewards(prev => prev.filter(r => r.id !== id));
  };

  const redeemReward = (studentId: string, rewardId: string): { success: boolean; message: string } => {
    const student = students.find(s => s.id === studentId);
    const reward = rewards.find(r => r.id === rewardId);

    if (!student || !reward) {
      return { success: false, message: 'Không tìm thấy học sinh hoặc phần thưởng.' };
    }

    if (reward.stock <= 0) {
      return { success: false, message: 'Món quà này trong kho hiện đã hết!' };
    }

    if (student.points < reward.cost) {
      return { success: false, message: `Học sinh ${student.name} chưa đủ xu (Cần ${reward.cost} xu, hiện có ${student.points} xu).` };
    }

    // Deduct points
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, points: s.points - reward.cost } : s));
    // Deduct stock
    setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, stock: r.stock - 1 } : r));
    // Record redemption
    const redemption: RewardRedemption = {
      id: `rdm-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      rewardId: reward.id,
      rewardName: reward.name,
      cost: reward.cost,
      timestamp: Date.now(),
      status: 'Đã nhận'
    };
    setRedemptions(prev => [redemption, ...prev]);

    // Record transaction
    const txn: PointTransaction = {
      id: `tx-${Date.now()}-${student.id}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      amount: -reward.cost,
      reason: `Đổi quà: ${reward.name}`,
      timestamp: Date.now()
    };
    setTransactions(prev => [txn, ...prev]);

    playCoinSound();
    return { success: true, message: `Đã đổi thành công "${reward.name}" cho em ${student.name}!` };
  };

  // Seating
  const assignSeat = (seatKey: string, studentId: string | null) => {
    setSeatingAssignments(prev => {
      const next = { ...prev };
      if (!studentId) {
        delete next[seatKey];
      } else {
        // Remove from any prior seat
        Object.keys(next).forEach(k => {
          if (next[k] === studentId) delete next[k];
        });
        next[seatKey] = studentId;
      }
      return next;
    });
  };

  const autoAssignSeating = (mode: 'random' | 'boy_girl' | 'name' = 'random') => {
    const list = [...currentClassStudents];
    if (mode === 'random') {
      list.sort(() => Math.random() - 0.5);
    } else if (mode === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } else if (mode === 'boy_girl') {
      const boys = list.filter(s => s.gender === 'Nam');
      const girls = list.filter(s => s.gender === 'Nữ');
      const alternating: Student[] = [];
      const max = Math.max(boys.length, girls.length);
      for (let i = 0; i < max; i++) {
        if (boys[i]) alternating.push(boys[i]);
        if (girls[i]) alternating.push(girls[i]);
      }
      list.splice(0, list.length, ...alternating);
    }

    const newMap: Record<string, string> = {};
    const cols = seatingColumns;
    let idx = 0;

    if (deskNumberingOrder === 'horizontal') {
      const maxRows = Math.max(...deskCountsPerColumn.slice(0, cols), 4);
      for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < cols; c++) {
          const colLimit = deskCountsPerColumn[c] || 4;
          if (r < colLimit) {
            for (let sub = 0; sub < 2; sub++) {
              if (idx < list.length) {
                newMap[`${c}-${r}-${sub}`] = list[idx].id;
                idx++;
              }
            }
          }
        }
      }
    } else {
      // 'vertical' (THEO DỌC)
      for (let c = 0; c < cols; c++) {
        const colLimit = deskCountsPerColumn[c] || 4;
        for (let r = 0; r < colLimit; r++) {
          for (let sub = 0; sub < 2; sub++) {
            if (idx < list.length) {
              newMap[`${c}-${r}-${sub}`] = list[idx].id;
              idx++;
            }
          }
        }
      }
    }
    setSeatingAssignments(newMap);
  };

  const clearSeating = () => {
    setSeatingAssignments({});
  };

  // Attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDateRecord = attendanceRecords.find(r => r.date === todayStr && r.classId === activeClassId);
  const currentDateAttendance = currentDateRecord?.records || {};

  const setStudentAttendance = (studentId: string, status: AttendanceStatus, date = todayStr) => {
    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(r => r.date === date && r.classId === activeClassId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          records: {
            ...updated[existingIdx].records,
            [studentId]: status
          }
        };
        return updated;
      } else {
        const newRecord: DailyAttendance = {
          date,
          classId: activeClassId,
          records: {
            [studentId]: status
          }
        };
        return [...prev, newRecord];
      }
    });

    // Nếu học sinh vắng mặt (Nghỉ ốm, Có phép, Không phép, Khác) -> tự động chuyển sang Không ăn/Về nhà
    const isAbsent = status === 'sick' || status === 'excused' || status === 'unexcused' || status === 'other';
    if (isAbsent) {
      setStudentBoarding(studentId, 'not_eating', date);
    }
  };

  const batchSetAttendance = (status: AttendanceStatus, date = todayStr) => {
    const map: Record<string, AttendanceStatus> = {};
    currentClassStudents.forEach(s => {
      map[s.id] = status;
    });

    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(r => r.date === date && r.classId === activeClassId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          records: map
        };
        return updated;
      } else {
        return [...prev, { date, classId: activeClassId, records: map }];
      }
    });
  };

  // Boarding Meals (Ăn bán trú)
  const currentDateBoardingRecord = boardingRecords.find(r => r.date === todayStr && r.classId === activeClassId);
  const currentDateBoarding = currentDateBoardingRecord?.records || {};

  const setStudentBoarding = (studentId: string, status: BoardingStatus, date = todayStr) => {
    setBoardingRecords(prev => {
      const existingIdx = prev.findIndex(r => r.date === date && r.classId === activeClassId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          records: {
            ...updated[existingIdx].records,
            [studentId]: status
          }
        };
        return updated;
      } else {
        const newRecord: DailyBoardingMeal = {
          date,
          classId: activeClassId,
          records: {
            [studentId]: status
          }
        };
        return [...prev, newRecord];
      }
    });
  };

  const batchSetBoarding = (status: BoardingStatus, date = todayStr) => {
    const map: Record<string, BoardingStatus> = {};
    currentClassStudents.forEach(s => {
      map[s.id] = status;
    });

    setBoardingRecords(prev => {
      const existingIdx = prev.findIndex(r => r.date === date && r.classId === activeClassId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          records: map
        };
        return updated;
      } else {
        return [...prev, { date, classId: activeClassId, records: map }];
      }
    });
  };

  // Timetable
  const updateTimetableSlot = (day: number, session: 'morning' | 'afternoon', period: number, subject: string, targetClassId?: string) => {
    const targetId = targetClassId || activeClassId;
    setTimetable(prev => {
      const filtered = prev.filter(t => !(t.day === day && t.session === session && t.period === period && (t.classId ? t.classId === targetId : true)));
      if (!subject.trim()) return filtered;
      return [...filtered, { day, session, period, subject: subject.trim(), classId: targetId }];
    });
  };

  // Subject Teacher Methods (User request: Sắp TKB nhiều lớp dùng chung học kì / thời điểm)
  const updateSubjectTimetableSlot = (slotData: Omit<SubjectTimetableSlot, 'id'> & { id?: string }) => {
    const id = slotData.id || `sbj-${slotData.day}-${slotData.session}-${slotData.period}-${Date.now()}`;
    const newSlot: SubjectTimetableSlot = { ...slotData, id };
    setSubjectTimetable(prev => {
      const filtered = prev.filter(s => !(s.day === newSlot.day && s.session === newSlot.session && s.period === newSlot.period));
      return [...filtered, newSlot];
    });
  };

  const deleteSubjectTimetableSlot = (slotId: string) => {
    setSubjectTimetable(prev => prev.filter(s => s.id !== slotId));
  };

  const clearSubjectTimetable = () => {
    setSubjectTimetable([]);
  };

  const seedSample20SubjectClasses = () => {
    const classNames = PRESET_SUBJECT_CLASS_NAMES;
    const newClassesList: Classroom[] = [...classes];
    const newStudentsList: Student[] = [...students];

    classNames.forEach((cName, idx) => {
      let existingClass = newClassesList.find(c => c.name.trim().toLowerCase() === cName.trim().toLowerCase());
      const classId = existingClass ? existingClass.id : `class-${cName.toLowerCase()}`;
      
      if (!existingClass) {
        const gradeNum = cName.charAt(0);
        existingClass = {
          id: classId,
          name: cName,
          grade: `Khối ${gradeNum}`,
          color: ['#3B82F6', '#EC4899', '#06B6D4', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 8],
          academicYear: teacherProfile.academicYear || '2026–2027',
          teacherName: `GVCN Lớp ${cName}`,
          slogan: `Tập thể ${cName} chăm ngoan, đoàn kết, say mê Tin học!`,
          avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=Class${cName}&backgroundColor=3b82f6`
        };
        newClassesList.push(existingClass);
      }

      const hasStudents = newStudentsList.some(s => s.classId === classId);
      if (!hasStudents) {
        const SAMPLE_NAMES = [
          'Nguyễn Văn An', 'Trần Thị Ngọc Ánh', 'Lê Gia Bảo', 'Phạm Minh Châu', 'Hoàng Quốc Cường',
          'Vũ Mai Dung', 'Đặng Tuấn Đạt', 'Bùi Thùy Dương', 'Đỗ Tiến Đức', 'Hồ Mỹ Hạnh',
          'Ngô Đức Huy', 'Dương Thu Hương', 'Lâm Tuấn Kiệt', 'Phan Thảo Linh', 'Võ Minh Long',
          'Mai Khánh Ly', 'Trịnh Hoàng Nam', 'Lý Kim Ngân', 'Đoàn Hải Phong', 'Đinh Hồng Phúc'
        ];
        SAMPLE_NAMES.forEach((name, sIdx) => {
          const gender: 'Nam' | 'Nữ' = sIdx % 2 === 0 ? 'Nam' : 'Nữ';
          const points = Math.floor(Math.random() * 25) + 5;
          newStudentsList.push({
            id: `hs-${classId}-${sIdx + 1}`,
            classId: classId,
            stt: sIdx + 1,
            name: `${name}`,
            birthDate: `1${(sIdx % 9) + 1}/0${(sIdx % 8) + 1}/2016`,
            gender,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cName}-${sIdx}&backgroundColor=b6e3f4`,
            avatarScale: 1,
            avatarPosition: { x: 0, y: 0 },
            points,
            subjectPoints: {
              'Tin học': points,
              'GHI CHUNG / NỀ NẾP': 5
            },
            group: `Tổ ${(sIdx % 4) + 1}`,
            role: sIdx === 0 ? 'LỚP TRƯỞNG' : (sIdx === 1 ? 'LỚP PHÓ HỌC TẬP' : undefined),
            roles: sIdx === 0 ? ['LỚP TRƯỞNG'] : (sIdx === 1 ? ['LỚP PHÓ HỌC TẬP'] : [])
          });
        });
      }
    });

    setClasses(newClassesList);
    setStudents(newStudentsList);
    setSubjectTimetable(SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE);
    if (!newClassesList.some(c => c.id === activeClassId)) {
      setActiveClassId(newClassesList[0].id);
    }
  };

  const loadSampleTimetableByImage = (autoCreateClasses: boolean = true) => {
    setSubjectTimetable(SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE);
    updateSubjectTeacherConfig({
      subjectName: 'Tin học',
      teacherDisplayName: 'Nguyễn Thanh Liêm',
      semester: 'I',
      effectiveStartDate: '05/9/2026',
      morningPeriods: 4,
      afternoonPeriods: 3
    });

    if (autoCreateClasses) {
      initSubjectClasses(SAMPLE_SUBJECT_CLASSES_BY_IMAGE, false);
    }
  };

  const initSubjectClasses = (items: InitSubjectClassItem[], replaceExisting: boolean = false) => {
    let newClassesList: Classroom[] = replaceExisting ? [] : [...classes];
    let newStudentsList: Student[] = replaceExisting ? [] : [...students];

    const currentSubjectName = subjectTeacherConfig.subjectName || 'TIN HỌC';

    items.forEach((item, idx) => {
      const trimmedName = item.name.trim();
      if (!trimmedName) return;

      const grade = item.grade || (trimmedName.match(/\d+/) ? `Khối ${trimmedName.match(/\d+/)![0]}` : 'Khối 4');
      const classId = `class-${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // Check if class already exists
      const existingClassIdx = newClassesList.findIndex(
        c => c.id === classId || c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      
      const classObj: Classroom = {
        id: classId,
        name: trimmedName,
        grade,
        color: ['#3B82F6', '#EC4899', '#06B6D4', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 8],
        academicYear: teacherProfile.academicYear || '2026–2027',
        teacherName: item.teacherName || `GVCN Lớp ${trimmedName}`,
        slogan: item.slogan || `Tập thể ${trimmedName} chăm ngoan, đoàn kết, học tốt môn ${currentSubjectName}!`,
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=Class${trimmedName}&backgroundColor=3b82f6`
      };

      if (existingClassIdx >= 0) {
        newClassesList[existingClassIdx] = classObj;
      } else {
        newClassesList.push(classObj);
      }

      // Generate students
      const studentCount = Math.max(1, Math.min(item.studentCount || 32, 60));
      // Remove any existing students of this class
      newStudentsList = newStudentsList.filter(s => s.classId !== classId);
      
      const generated = generateStudentsForClass(classId, trimmedName, studentCount, grade, currentSubjectName);
      newStudentsList.push(...generated);
    });

    setClasses(newClassesList);
    setStudents(newStudentsList);
    if (newClassesList.length > 0) {
      setActiveClassId(newClassesList[0].id);
    }
  };

  const applySubjectTimetableSlots = (slots: SubjectTimetableSlot[]) => {
    setSubjectTimetable(slots);
  };

  // Quick Links
  const addQuickLink = (link: Omit<QuickLink, 'id'>) => {
    const newLink: QuickLink = {
      ...link,
      id: `link-${Date.now()}`
    };
    setQuickLinks(prev => [...prev, newLink]);
  };

  const deleteQuickLink = (id: string) => {
    setQuickLinks(prev => prev.filter(l => l.id !== id));
  };

  const updateQuickLink = (id: string, data: Partial<Omit<QuickLink, 'id'>>) => {
    setQuickLinks(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
  };

  const reorderQuickLinks = (newLinks: QuickLink[]) => {
    setQuickLinks(newLinks);
  };

  // Teacher Profile
  const updateTeacherProfile = (data: Partial<TeacherProfile>) => {
    setTeacherProfile(prev => ({ ...prev, ...data }));
  };

  // Backup & Restore
  const exportBackupJson = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      account: currentUser ? {
        username: currentUser.username,
        fullName: currentUser.fullName,
        role: currentUser.role
      } : undefined,
      classes,
      activeClassId,
      students,
      subjects,
      criteria,
      transactions,
      rewards,
      redemptions,
      seatingColumns,
      deskCountsPerColumn,
      deskNumberingOrder,
      teacherDeskPos,
      doorPos,
      blackboardPos,
      seatingAssignments,
      attendanceRecords,
      boardingRecords,
      timetableConfig,
      timetable,
      teacherRole,
      subjectTeacherConfig,
      subjectTimetable,
      quickLinks,
      teacherProfile,
      quizBank,
      infographicConfig
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileSuffix = currentUser ? `_${currentUser.username}_${currentUser.role}` : '';
    link.download = `Sao_Luu_Lop_Hoc_Hanh_Phuc${fileSuffix}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportBackupZip = async () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      account: currentUser ? {
        username: currentUser.username,
        fullName: currentUser.fullName,
        role: currentUser.role
      } : undefined,
      classes,
      activeClassId,
      students,
      subjects,
      criteria,
      transactions,
      rewards,
      redemptions,
      seatingColumns,
      deskCountsPerColumn,
      deskNumberingOrder,
      teacherDeskPos,
      doorPos,
      blackboardPos,
      seatingAssignments,
      attendanceRecords,
      boardingRecords,
      timetableConfig,
      timetable,
      teacherRole,
      subjectTeacherConfig,
      subjectTimetable,
      quickLinks,
      teacherProfile,
      quizBank,
      infographicConfig
    };

    const zip = new JSZip();
    zip.file("lop_hoc_hanh_phuc_data.json", JSON.stringify(backupData, null, 2));
    zip.file("THONG_TIN_SAO_LUU.txt", `=== SAO LƯU DỮ LIỆU HỆ THỐNG LỚP HỌC HẠNH PHÚC ===\n` +
      `Tài khoản: ${currentUser ? `${currentUser.fullName} (@${currentUser.username})` : 'Mặc định'}\n` +
      `Vai trò: ${teacherRole === 'homeroom' ? 'Giáo viên chủ nhiệm' : 'Giáo viên bộ môn'}\n` +
      `Năm học: ${teacherProfile.academicYear || '2026 - 2027'}\n` +
      `Giáo viên: ${teacherProfile.name}\n` +
      `Đơn vị công tác: ${teacherProfile.schoolName}\n` +
      `Zalo hỗ trợ hệ thống: 0888358363 (https://zalo.me/0888358363)\n` +
      `Thời gian xuất file: ${new Date().toLocaleString('vi-VN')}\n` +
      `Số lượng lớp học: ${classes.length} lớp\n` +
      `Tổng số học sinh: ${students.length} học sinh\n\n` +
      `Hướng dẫn khôi phục:\n` +
      `Để nạp lại dữ liệu, vào mục "DỮ LIỆU" trong ứng dụng, chọn "Nạp Vào Khôi Phục Dữ Liệu" và tải file .ZIP này lên.`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileSuffix = currentUser ? `_${currentUser.username}_${currentUser.role}` : '';
    link.download = `Sao_Luu_Lop_Hoc_Hanh_Phuc${fileSuffix}_${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackupZip = async (file: File): Promise<boolean> => {
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      let jsonFile = loadedZip.file("lop_hoc_hanh_phuc_data.json");
      if (!jsonFile) {
        const jsonKeys = Object.keys(loadedZip.files).filter(k => k.endsWith('.json'));
        if (jsonKeys.length > 0) {
          jsonFile = loadedZip.file(jsonKeys[0]);
        }
      }
      if (!jsonFile) return false;
      const text = await jsonFile.async('text');
      const data = JSON.parse(text);

      applyUserClassroomData(data);

      if (currentUser) {
        logUserActivity('RESTORE_DATA', `Khôi phục độc lập dữ liệu từ file zip ${file.name}`);
        const currentData = {
          ...getCurrentUserData(),
          ...data
        };
        await databaseService.saveUserData(currentUser.username, currentData);
      }

      return true;
    } catch (e) {
      console.error('Lỗi giải nén và nạp zip:', e);
      return false;
    }
  };

  const importBackupJson = async (file: File): Promise<boolean> => {
    try {
      // Check if it's a zip file
      if (file.name.toLowerCase().endsWith('.zip')) {
        return await importBackupZip(file);
      }
      const text = await file.text();
      const data = JSON.parse(text);

      applyUserClassroomData(data);

      if (currentUser) {
        logUserActivity('RESTORE_DATA', `Khôi phục độc lập dữ liệu từ file JSON ${file.name}`);
        const currentData = {
          ...getCurrentUserData(),
          ...data
        };
        await databaseService.saveUserData(currentUser.username, currentData);
      }

      return true;
    } catch (err) {
      console.error('Lỗi nạp sao lưu:', err);
      return false;
    }
  };

  const resetToDefaultData = () => {
    // 1. Fresh independent copies of Class 4A1 and 30 students
    const freshClass: Classroom = {
      id: 'class-4a1',
      name: '4A1',
      grade: 'Khối 4',
      color: '#3B82F6',
      academicYear: '2026–2027',
      teacherName: 'NGUYỄN THỊ HOA',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1&backgroundColor=3b82f6',
      slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng',
      parentCommittee: {
        head: { name: 'Trần Văn Mạnh', phone: '0988 123 456', roleTitle: 'Trưởng ban phụ huynh' },
        deputy: { name: 'Nguyễn Thị Mai', phone: '0977 654 321', roleTitle: 'Phó ban phụ huynh' },
        member1: { name: 'Lê Hoàng Nam', phone: '0912 345 678', roleTitle: 'Ủy viên ban phụ huynh 1' },
        member2: { name: 'Phạm Thị Lan', phone: '0903 890 123', roleTitle: 'Ủy viên ban phụ huynh 2' }
      }
    };
    const freshClasses = [freshClass];

    const freshStudents: Student[] = INITIAL_STUDENTS_CLASS_4A1.map(s => ({
      ...s,
      classId: 'class-4a1'
    }));

    const freshTimetable: TimetableSlot[] = INITIAL_TIMETABLE.map(t => ({
      ...t,
      classId: 'class-4a1'
    }));

    const initialMap: Record<string, string> = {};
    freshStudents.slice(0, 16).forEach((s, idx) => {
      const col = Math.floor(idx / 8);
      const rowInCol = Math.floor((idx % 8) / 2);
      const sub = idx % 2;
      initialMap[`${col}-${rowInCol}-${sub}`] = s.id;
    });

    // 2. Update React states
    setClasses(freshClasses);
    setActiveClassId('class-4a1');
    setStudents(freshStudents);
    setSubjects([...INITIAL_SUBJECTS]);
    setCriteria([...INITIAL_CRITERIA]);
    setRewards([...INITIAL_REWARDS]);
    setTimetable(freshTimetable);
    setQuickLinks([...INITIAL_QUICK_LINKS]);
    setTeacherProfile({ ...DEFAULT_TEACHER });
    setTransactions([]);
    setRedemptions([]);
    setAttendanceRecords([]);
    setBoardingRecords([]);
    setSeatingColumns(2);
    setSeatingAssignments(initialMap);
  };

  const clearAllData = () => {
    setClasses([]);
    setActiveClassId('');
    setStudents([]);
    setTimetable([]);
    setTransactions([]);
    setRewards([]);
    setRedemptions([]);
    setAttendanceRecords([]);
    setBoardingRecords([]);
    setSeatingAssignments({});
  };

  return (
    <ClassroomContext.Provider value={{
      classes,
      activeClassId,
      setActiveClassId,
      addClass,
      updateClass,
      deleteClass,
      bulkDeleteClasses,
      bulkUpdateClasses,
      deleteAllClasses,

      students,
      currentClassStudents,
      addStudent,
      updateStudent,
      deleteStudent,
      bulkDeleteStudents,
      clearClassStudents,
      bulkAddStudents,
      resetStudentsCoins,

      subjects,
      addSubject,
      updateSubject,
      deleteSubject,
      toggleSubjectApplied,
      setAppliedSubjects,
      resetDefaultSubjects,

      criteria,
      addCriterion,

      transactions,
      awardPoints,
      deductPoints,

      rewards,
      addReward,
      updateReward,
      deleteReward,
      redemptions,
      redeemReward,

      seatingColumns,
      setSeatingColumns,
      deskCountsPerColumn,
      setDeskCountsPerColumn,
      updateDeskCountForColumn,
      deskNumberingOrder,
      setDeskNumberingOrder,
      teacherDeskPos,
      setTeacherDeskPos,
      doorPos,
      setDoorPos,
      blackboardPos,
      setBlackboardPos,
      seatingAssignments,
      assignSeat,
      autoAssignSeating,
      clearSeating,

      attendanceRecords,
      currentDateAttendance,
      setStudentAttendance,
      batchSetAttendance,

      boardingRecords,
      currentDateBoarding,
      setStudentBoarding,
      batchSetBoarding,

      timetable,
      timetableConfig,
      setTimetableConfig,
      updateTimetableSlot,

      teacherRole,
      setTeacherRole,
      subjectTeacherConfig,
      updateSubjectTeacherConfig,
      subjectTimetable,
      updateSubjectTimetableSlot,
      deleteSubjectTimetableSlot,
      clearSubjectTimetable,
      seedSample20SubjectClasses,
      loadSampleTimetableByImage,
      initSubjectClasses,
      applySubjectTimetableSlots,

      quickLinks,
      addQuickLink,
      deleteQuickLink,
      updateQuickLink,
      reorderQuickLinks,

      teacherProfile,
      updateTeacherProfile,

      // Kho câu hỏi độc lập & Infographic lưu trực tuyến theo tài khoản
      quizBank,
      setQuizBank,
      updateQuizBank,
      infographicConfig,
      updateInfographicConfig,

      exportBackupJson,
      importBackupJson,
      exportBackupZip,
      importBackupZip,
      resetToDefaultData,
      clearAllData,

      // Quản lý người dùng, phân quyền & Cơ sở dữ liệu đồng bộ
      currentUser,
      allUsers,
      allTeachers: allUsers.filter(u => u.role === 'homeroom' || u.role === 'subject'),
      loginUser,
      logoutUser,
      switchUserAccount,
      refreshUsersList,
      logUserActivity,
      isAuthModalOpen,
      setIsAuthModalOpen,
      isAccountManagerOpen,
      setIsAccountManagerOpen,
      isGithubModalOpen,
      setIsGithubModalOpen,
      dbSyncStatus,
      lastDbSyncTime,
      syncDatabaseNow,
      isAdmin: currentUser?.role === 'admin',
      isHomeroom: currentUser?.role === 'homeroom',
      isSubject: currentUser?.role === 'subject'
    }}>
      {children}
    </ClassroomContext.Provider>
  );
};

export const useClassroom = () => {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error('useClassroom must be used within a ClassroomProvider');
  }
  return context;
};
