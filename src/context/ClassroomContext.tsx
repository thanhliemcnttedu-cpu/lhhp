import React, { createContext, useContext, useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Classroom, Student, Subject, PointCriterion, PointTransaction, 
  Reward, RewardRedemption, DailyAttendance, TimetableSlot, 
  TimetableConfig, QuickLink, TeacherProfile, AttendanceStatus,
  SeatingColumnsCount, TeacherDeskPosition, DoorPosition, BlackboardPosition,
  BoardingStatus, DailyBoardingMeal, AppUserRole, TeacherAccount, AdminAccount,
  QuestionBank, QuestionItem, RegisteredTeacher
} from '../types';
import { 
  INITIAL_CLASSES, INITIAL_STUDENTS_CLASS_4A1, INITIAL_SUBJECTS, 
  INITIAL_CRITERIA, INITIAL_REWARDS, INITIAL_TIMETABLE, 
  INITIAL_QUICK_LINKS, DEFAULT_TEACHER, INITIAL_QUESTION_BANKS,
  INITIAL_REGISTERED_TEACHERS
} from '../data/initialData';
import { playCoinSound, playDeductSound } from '../utils/audio';
import { 
  ensureDriveTree, saveJsonToDrive, readJsonFromDrive, 
  listFilesInFolder, logoutGoogle, getCachedAccessToken, setCachedAccessToken, initAuth
} from '../services/googleDriveService';

interface ClassroomContextType {
  // Role & Auth
  currentRole: AppUserRole | null;
  setCurrentRole: (role: AppUserRole | null) => void;
  teacherAccount: TeacherAccount | null;
  adminAccount: AdminAccount | null;
  isRoleModalOpen: boolean;
  setRoleModalOpen: (open: boolean) => void;
  loginAsTeacher: (user: any, token: string) => Promise<void>;
  loginTeacherWithCredentials: (username: string, password: string) => { success: boolean; message?: string };
  loginAsAdmin: (username: string, password: string) => { success: boolean; message?: string };
  logoutRole: () => Promise<void>;

  // Registered Teachers Management (Admin control)
  registeredTeachers: RegisteredTeacher[];
  addRegisteredTeacher: (teacher: Omit<RegisteredTeacher, 'id' | 'registeredAt'>) => void;
  updateRegisteredTeacher: (id: string, data: Partial<RegisteredTeacher>) => void;
  deleteRegisteredTeacher: (id: string) => void;
  approveTeacher: (id: string, classId?: string) => void;
  rejectTeacher: (id: string) => void;
  resetTeacherPassword: (id: string, newPassword?: string) => void;

  // Admin Impersonation (View as teacher of any class and back)
  isImpersonating: boolean;
  adminImpersonateClass: (classId: string) => void;
  exitImpersonation: () => void;

  // Google Drive Sync
  isDriveSyncing: boolean;
  driveSyncStatus: string;
  syncToDriveNow: () => Promise<{ success: boolean; message: string }>;
  loadFromDriveNow: () => Promise<{ success: boolean; message: string }>;

  // 30-Day Cycle Alert & Month Reset
  cycleStartDate: string;
  daysIntoCycle: number;
  is30DayAlertDue: boolean;
  isAlertDismissed: boolean;
  dismiss30DayAlert: () => void;
  resetMonthlyStatistics: () => void;
  exportFullSystemJson: () => void;

  // Question Banks for Calling & Quiz
  questionBanks: QuestionBank[];
  addQuestionBank: (bank: Omit<QuestionBank, 'id' | 'createdAt'>) => void;
  updateQuestionBank: (id: string, bank: Partial<QuestionBank>) => void;
  deleteQuestionBank: (id: string) => void;
  addQuestionToBank: (bankId: string, question: Omit<QuestionItem, 'id'>) => void;
  deleteQuestionFromBank: (bankId: string, questionId: string) => void;

  classes: Classroom[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  addClass: (cls: Omit<Classroom, 'id'>) => void;
  updateClass: (id: string, cls: Partial<Classroom>) => void;
  deleteClass: (id: string) => void;
  deleteAllClasses: () => void;

  students: Student[];
  currentClassStudents: Student[];
  addStudent: (student: Omit<Student, 'id' | 'points' | 'stt'>) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  clearClassStudents: (classId: string) => void;
  bulkAddStudents: (students: Array<{ name: string; gender: 'Nam' | 'Nữ'; birthDate?: string; group?: string; role?: string }>) => void;

  subjects: Subject[];
  addSubject: (name: string, color?: string, icon?: string) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  criteria: PointCriterion[];
  addCriterion: (crit: Omit<PointCriterion, 'id'>) => void;

  transactions: PointTransaction[];
  awardPoints: (studentIds: string[], amount: number, reason: string, subjectName?: string) => void;
  deductPoints: (studentIds: string[], amount: number, reason: string, subjectName?: string) => void;
  resetStudentPoints: (studentIds: string[]) => void;
  bulkSetPoints: (studentIds: string[], points: number, reason?: string, subjectName?: string) => void;

  rewards: Reward[];
  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (id: string, data: Partial<Reward>) => void;
  deleteReward: (id: string) => void;
  redemptions: RewardRedemption[];
  redeemReward: (studentId: string, rewardId: string) => { success: boolean; message: string };

  seatingColumns: SeatingColumnsCount;
  setSeatingColumns: (cols: SeatingColumnsCount) => void;
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

  quickLinks: QuickLink[];
  addQuickLink: (link: Omit<QuickLink, 'id'>) => void;
  deleteQuickLink: (id: string) => void;

  teacherProfile: TeacherProfile;
  updateTeacherProfile: (profile: Partial<TeacherProfile>) => void;

  exportBackupJson: () => void;
  importBackupJson: (file: File) => Promise<boolean>;
  exportBackupZip: () => Promise<void>;
  importBackupZip: (file: File) => Promise<boolean>;
  resetToDefaultData: () => void;
  clearAllData: () => void;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

const STORAGE_KEY = 'lop_hoc_hanh_phuc_state_v3';

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`localStorage save warning for ${key}:`, err);
  }
};

export const ClassroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage or defaults
  const [classes, setClasses] = useState<Classroom[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_classes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CLASSES;
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_activeClassId');
    if (saved && saved.trim() !== '') return saved;
    return 'class-4a1';
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_students');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STUDENTS_CLASS_4A1;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_subjects');
    return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
  });

  const [criteria, setCriteria] = useState<PointCriterion[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_criteria');
    return saved ? JSON.parse(saved) : INITIAL_CRITERIA;
  });

  const [transactions, setTransactions] = useState<PointTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [rewards, setRewards] = useState<Reward[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_rewards');
    return saved ? JSON.parse(saved) : INITIAL_REWARDS;
  });

  const [redemptions, setRedemptions] = useState<RewardRedemption[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_redemptions');
    return saved ? JSON.parse(saved) : [];
  });

  const [seatingColumns, setSeatingColumns] = useState<SeatingColumnsCount>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_seatingColumns');
    return saved ? (parseInt(saved) as SeatingColumnsCount) : 2;
  });

  const [teacherDeskPos, setTeacherDeskPos] = useState<TeacherDeskPosition>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_teacherDeskPos');
    return (saved as TeacherDeskPosition) || 'left';
  });

  const [doorPos, setDoorPos] = useState<DoorPosition>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_doorPos');
    return (saved as DoorPosition) || 'right';
  });

  const [blackboardPos, setBlackboardPos] = useState<BlackboardPosition>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_blackboardPos');
    return (saved as BlackboardPosition) || 'center';
  });

  const [seatingAssignments, setSeatingAssignments] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_seatingAssignments');
    if (saved) return JSON.parse(saved);
    // Initial placement for class 4A1: 2 columns, 4 rows, 2 seats each = 16 desks
    const initialMap: Record<string, string> = {};
    INITIAL_STUDENTS_CLASS_4A1.slice(0, 16).forEach((s, idx) => {
      const col = Math.floor(idx / 8); // 0 or 1
      const rowInCol = Math.floor((idx % 8) / 2); // 0, 1, 2, 3
      const sub = idx % 2; // 0 or 1
      initialMap[`${col}-${rowInCol}-${sub}`] = s.id;
    });
    return initialMap;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [boardingRecords, setBoardingRecords] = useState<DailyBoardingMeal[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_boarding');
    return saved ? JSON.parse(saved) : [];
  });

  const [timetableConfig, setTimetableConfig] = useState<TimetableConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_timetableConfig');
    return saved ? JSON.parse(saved) : { morningPeriods: 4, afternoonPeriods: 3, hasSaturday: false };
  });

  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_timetable');
    return saved ? JSON.parse(saved) : INITIAL_TIMETABLE;
  });

  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_quickLinks');
    return saved ? JSON.parse(saved) : INITIAL_QUICK_LINKS;
  });

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_teacherProfile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TEACHER;
  });

  // ---------------------------------------------------------------------------
  // ROLE & AUTHENTICATION STATES (Teacher with Google / Admin with Tanuyen@2026)
  // ---------------------------------------------------------------------------
  const [currentRole, setCurrentRole] = useState<AppUserRole | null>(() => {
    return (localStorage.getItem(STORAGE_KEY + '_currentRole') as AppUserRole) || null;
  });

  const [teacherAccount, setTeacherAccount] = useState<TeacherAccount | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_teacherAccount');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_adminAccount');
    return saved ? JSON.parse(saved) : null;
  });

  const [isRoleModalOpen, setRoleModalOpen] = useState<boolean>(() => {
    const savedRole = localStorage.getItem(STORAGE_KEY + '_currentRole');
    return !savedRole;
  });

  // Google Drive Sync State
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<string>('Sẵn sàng');

  // 30-Day Cycle Alert State
  const [cycleStartDate, setCycleStartDate] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_cycleStartDate');
    if (saved) return saved;
    // Default: 30 days cycle baseline
    const d = new Date();
    d.setDate(d.getDate() - 3); // 3 days into cycle
    const iso = d.toISOString().split('T')[0];
    safeLocalStorageSet(STORAGE_KEY + '_cycleStartDate', iso);
    return iso;
  });

  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Question Banks for Random Call & Classroom Quiz
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_questionBanks');
    return saved ? JSON.parse(saved) : INITIAL_QUESTION_BANKS;
  });

  // Registered Teachers Management (Admin control)
  const [registeredTeachers, setRegisteredTeachers] = useState<RegisteredTeacher[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_registeredTeachers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any) => ({
            ...t,
            username: t.username || (t.email ? t.email.split('@')[0] : 'gv_' + (t.id ? t.id.slice(-4) : 'user')),
            password: t.password || '123456'
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_REGISTERED_TEACHERS;
  });

  // Admin Impersonation State (Admin viewing class as teacher)
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY + '_isImpersonating') === 'true';
  });

  // 2. Persist to localStorage safely
  useEffect(() => {
    if (currentRole) safeLocalStorageSet(STORAGE_KEY + '_currentRole', currentRole);
    else localStorage.removeItem(STORAGE_KEY + '_currentRole');
  }, [currentRole]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_registeredTeachers', JSON.stringify(registeredTeachers));
  }, [registeredTeachers]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_isImpersonating', isImpersonating ? 'true' : 'false');
  }, [isImpersonating]);

  useEffect(() => {
    if (teacherAccount) safeLocalStorageSet(STORAGE_KEY + '_teacherAccount', JSON.stringify(teacherAccount));
    else localStorage.removeItem(STORAGE_KEY + '_teacherAccount');
  }, [teacherAccount]);

  useEffect(() => {
    if (adminAccount) safeLocalStorageSet(STORAGE_KEY + '_adminAccount', JSON.stringify(adminAccount));
    else localStorage.removeItem(STORAGE_KEY + '_adminAccount');
  }, [adminAccount]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_cycleStartDate', cycleStartDate);
  }, [cycleStartDate]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_questionBanks', JSON.stringify(questionBanks));
  }, [questionBanks]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_classes', JSON.stringify(classes));
  }, [classes]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_activeClassId', activeClassId);
  }, [activeClassId]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_students', JSON.stringify(students));
  }, [students]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_subjects', JSON.stringify(subjects));
  }, [subjects]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_criteria', JSON.stringify(criteria));
  }, [criteria]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_transactions', JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_rewards', JSON.stringify(rewards));
  }, [rewards]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_redemptions', JSON.stringify(redemptions));
  }, [redemptions]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_seatingColumns', JSON.stringify(seatingColumns));
  }, [seatingColumns]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_teacherDeskPos', teacherDeskPos);
  }, [teacherDeskPos]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_doorPos', doorPos);
  }, [doorPos]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_blackboardPos', blackboardPos);
  }, [blackboardPos]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_seatingAssignments', JSON.stringify(seatingAssignments));
  }, [seatingAssignments]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_boarding', JSON.stringify(boardingRecords));
  }, [boardingRecords]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_timetableConfig', JSON.stringify(timetableConfig));
  }, [timetableConfig]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_timetable', JSON.stringify(timetable));
  }, [timetable]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_quickLinks', JSON.stringify(quickLinks));
  }, [quickLinks]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY + '_teacherProfile', JSON.stringify(teacherProfile));
  }, [teacherProfile]);

  // Auto-heal activeClassId if it becomes invalid or empty when classes exist
  // Yêu cầu: Lớp phụ trách thêm mục Non (none) tức là chưa phân cấp quản lý lớp nào.
  // Tài khoản nào được phân quyền quản lý lớp nào thì được thao tác hiển thị với lớp đó, còn nếu không khi đăng nhập sẽ không hiển thị lớp.
  const isTeacherUnassigned = currentRole === 'teacher' && (!teacherAccount?.assignedClassId || teacherAccount.assignedClassId === 'none');

  const effectiveActiveClassId = isTeacherUnassigned
    ? ''
    : (currentRole === 'teacher' && teacherAccount?.assignedClassId && classes.some(c => c.id === teacherAccount.assignedClassId))
    ? teacherAccount.assignedClassId
    : (activeClassId && classes.some(c => c.id === activeClassId))
    ? activeClassId
    : (classes[0]?.id || '');

  useEffect(() => {
    if (isTeacherUnassigned) {
      if (activeClassId !== '') setActiveClassId('');
    } else if (currentRole === 'teacher' && teacherAccount?.assignedClassId && teacherAccount.assignedClassId !== 'none') {
      if (activeClassId !== teacherAccount.assignedClassId) {
        setActiveClassId(teacherAccount.assignedClassId);
      }
    } else if (classes.length > 0 && (!activeClassId || !classes.some(c => c.id === activeClassId))) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId, currentRole, teacherAccount, isTeacherUnassigned]);

  // Derived students for active class
  const currentClassStudents = !effectiveActiveClassId
    ? []
    : students
        .filter(s => s.classId === effectiveActiveClassId)
        .sort((a, b) => a.stt - b.stt);

  // Class methods
  const addClass = (cls: Omit<Classroom, 'id'>) => {
    const newId = `class-${Date.now()}`;
    const newCls: Classroom = { ...cls, id: newId };
    setClasses(prev => [...prev, newCls]);
    setActiveClassId(newId);
  };

  const updateClass = (id: string, updated: Partial<Classroom>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const deleteClass = (id: string) => {
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
  };

  const deleteAllClasses = () => {
    setClasses([]);
    setActiveClassId('');
    setStudents([]);
    setSeatingAssignments({});
    setAttendanceRecords([]);
    setBoardingRecords([]);
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
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    // also clean up seating assignment
    setSeatingAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k] === id) delete next[k];
      });
      return next;
    });
  };

  const clearClassStudents = (classId: string) => {
    setStudents(prev => prev.filter(s => s.classId !== classId));
    setSeatingAssignments(prev => {
      const next = { ...prev };
      const targetIds = new Set(students.filter(s => s.classId === classId).map(s => s.id));
      Object.keys(next).forEach(k => {
        if (targetIds.has(next[k])) delete next[k];
      });
      return next;
    });
  };

  const bulkAddStudents = (items: Array<{ name: string; gender: 'Nam' | 'Nữ'; birthDate?: string; group?: string; role?: string }>) => {
    const currentList = students.filter(s => s.classId === activeClassId);
    let startStt = currentList.length + 1;

    const newItems: Student[] = items.map((item, idx) => {
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
        group: item.group || `Tổ ${Math.floor(idx / 8) + 1}`,
        role: item.role || ''
      };
    });

    setStudents(prev => [...prev, ...newItems]);
  };

  // Subjects
  const addSubject = (name: string, color = '#3B82F6', icon = 'BookOpen') => {
    if (!name.trim()) return;
    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      name: name.trim(),
      color,
      icon
    };
    setSubjects(prev => [...prev, newSub]);
  };

  const updateSubject = (id: string, data: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  // Criteria
  const addCriterion = (crit: Omit<PointCriterion, 'id'>) => {
    const newCrit: PointCriterion = {
      ...crit,
      id: `crit-${Date.now()}`
    };
    setCriteria(prev => [...prev, newCrit]);
  };

  // Points Award / Deduct
  const awardPoints = (studentIds: string[], amount: number, reason: string, subjectName?: string) => {
    if (studentIds.length === 0 || amount <= 0) return;
    playCoinSound();

    const timestamp = Date.now();
    const newTxns: PointTransaction[] = [];

    setStudents(prev => prev.map(s => {
      if (studentIds.includes(s.id)) {
        newTxns.push({
          id: `tx-${timestamp}-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          amount,
          reason,
          subjectName,
          timestamp
        });
        return { ...s, points: s.points + amount };
      }
      return s;
    }));

    setTransactions(prev => [...newTxns, ...prev]);
  };

  const deductPoints = (studentIds: string[], amount: number, reason: string, subjectName?: string) => {
    if (studentIds.length === 0 || amount <= 0) return;
    playDeductSound();

    const timestamp = Date.now();
    const newTxns: PointTransaction[] = [];

    setStudents(prev => prev.map(s => {
      if (studentIds.includes(s.id)) {
        newTxns.push({
          id: `tx-${timestamp}-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          amount: -amount,
          reason,
          subjectName,
          timestamp
        });
        return { ...s, points: s.points - amount };
      }
      return s;
    }));

    setTransactions(prev => [...newTxns, ...prev]);
  };

  const resetStudentPoints = (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    const timestamp = Date.now();
    const newTxns: PointTransaction[] = [];
    setStudents(prev => prev.map(s => {
      if (studentIds.includes(s.id)) {
        if (s.points !== 0) {
          newTxns.push({
            id: `tx-${timestamp}-${s.id}`,
            studentId: s.id,
            studentName: s.name,
            classId: s.classId,
            amount: -s.points,
            reason: 'Xóa điểm xu về 0',
            timestamp
          });
        }
        return { ...s, points: 0 };
      }
      return s;
    }));
    if (newTxns.length > 0) {
      setTransactions(prev => [...newTxns, ...prev]);
    }
  };

  const bulkSetPoints = (studentIds: string[], targetPoints: number, reason = 'Gán điểm xu đồng loạt', subjectName?: string) => {
    if (studentIds.length === 0) return;
    const timestamp = Date.now();
    const newTxns: PointTransaction[] = [];
    setStudents(prev => prev.map(s => {
      if (studentIds.includes(s.id)) {
        const diff = targetPoints - s.points;
        newTxns.push({
          id: `tx-${timestamp}-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          amount: diff,
          reason,
          subjectName,
          timestamp
        });
        return { ...s, points: targetPoints };
      }
      return s;
    }));
    setTransactions(prev => [...newTxns, ...prev]);
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
    const cols = seatingColumns; // 2 or 3
    const rows = 5; // 5 rows
    const desksPerRowPerCol = 2; // 2 seats per desk

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let sub = 0; sub < desksPerRowPerCol; sub++) {
          if (idx < list.length) {
            newMap[`${c}-${r}-${sub}`] = list[idx].id;
            idx++;
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

  // Teacher Profile
  const updateTeacherProfile = (data: Partial<TeacherProfile>) => {
    setTeacherProfile(prev => ({ ...prev, ...data }));
  };

  // Backup & Restore
  // Yêu cầu: Đối với tài khoản giáo viên sau khi đăng nhập chỉ tải được thông tin data file .JSON của lớp mình
  // Còn tài khoản quản trị khi tải file data .JSON sẽ tải thông tin toàn bộ cả trường chi tiết đầy đủ.
  const exportBackupJson = () => {
    const today = new Date().toISOString().slice(0, 10);
    const isTeacher = currentRole === 'teacher';

    if (isTeacher) {
      const targetClassId = teacherAccount?.assignedClassId || activeClassId;
      const targetClass = classes.find(c => c.id === targetClassId) || classes[0];
      const classStudents = students.filter(s => s.classId === targetClassId);
      const classStudentIds = classStudents.map(s => s.id);

      const teacherClassBackup = {
        exportType: 'TEACHER_CLASS_DATA',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        role: 'teacher',
        teacher: teacherProfile,
        classInfo: targetClass,
        classes: targetClass ? [targetClass] : classes,
        activeClassId: targetClassId,
        students: classStudents,
        subjects,
        criteria,
        transactions: transactions.filter(t => classStudentIds.includes(t.studentId)),
        rewards,
        redemptions: redemptions.filter(r => classStudentIds.includes(r.studentId)),
        seatingColumns,
        seatingAssignments: Object.fromEntries(
          Object.entries(seatingAssignments).filter(([_, sId]) => classStudentIds.includes(sId))
        ),
        attendanceRecords: attendanceRecords.filter(a => a.classId === targetClassId),
        boardingRecords: boardingRecords.filter(b => b.classId === targetClassId),
        timetableConfig,
        timetable: timetable.filter(t => !t.classId || t.classId === targetClassId),
        quickLinks
      };

      const blob = new Blob([JSON.stringify(teacherClassBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Du_Lieu_Lop_${(targetClass?.name || '4A1').replace(/\s+/g, '_')}_${today}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Role Admin: Tải dữ liệu toàn bộ trường chi tiết đầy đủ
    const fullBackup = {
      exportType: 'ADMIN_FULL_SCHOOL_DATA',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      system: 'LỚP HỌC HẠNH PHÚC - QUẢN LÝ TOÀN TRƯỜNG',
      role: 'admin',
      cycleStartDate,
      totalClasses: classes.length,
      totalStudents: students.length,
      registeredTeachers,
      classes,
      activeClassId,
      students,
      subjects,
      criteria,
      transactions,
      rewards,
      redemptions,
      seatingColumns,
      seatingAssignments,
      attendanceRecords,
      boardingRecords,
      timetableConfig,
      timetable,
      quickLinks,
      teacherProfile,
      questionBanks
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Du_Lieu_Toan_Truong_Backup_${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportBackupZip = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const isTeacher = currentRole === 'teacher';

    if (isTeacher) {
      const targetClassId = teacherAccount?.assignedClassId || activeClassId;
      const targetClass = classes.find(c => c.id === targetClassId) || classes[0];
      const classStudents = students.filter(s => s.classId === targetClassId);
      const classStudentIds = classStudents.map(s => s.id);

      const teacherClassBackup = {
        exportType: 'TEACHER_CLASS_DATA',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        role: 'teacher',
        teacher: teacherProfile,
        classInfo: targetClass,
        classes: [targetClass],
        activeClassId: targetClassId,
        students: classStudents,
        subjects,
        criteria,
        transactions: transactions.filter(t => classStudentIds.includes(t.studentId)),
        rewards,
        redemptions: redemptions.filter(r => classStudentIds.includes(r.studentId)),
        seatingColumns,
        seatingAssignments: Object.fromEntries(
          Object.entries(seatingAssignments).filter(([_, sId]) => classStudentIds.includes(sId))
        ),
        attendanceRecords: attendanceRecords.filter(a => a.classId === targetClassId),
        boardingRecords: boardingRecords.filter(b => b.classId === targetClassId),
        timetableConfig,
        timetable: timetable.filter(t => !t.classId || t.classId === targetClassId),
        quickLinks
      };

      const zip = new JSZip();
      zip.file(`Du_Lieu_Lop_${(targetClass?.name || '4A1').replace(/\s+/g, '_')}_data.json`, JSON.stringify(teacherClassBackup, null, 2));
      zip.file("THONG_TIN_SAO_LUU_LOP.txt", `=== SAO LƯU DỮ LIỆU LỚP HỌC HẠNH PHÚC (GIÁO VIÊN) ===\n` +
        `Lớp học: ${targetClass?.name || '4A1'} (${targetClass?.grade || 'Khối 4'})\n` +
        `Giáo viên chủ nhiệm: ${teacherProfile.name}\n` +
        `Sĩ số lớp: ${classStudents.length} học sinh\n` +
        `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sao_Luu_Lop_${(targetClass?.name || '4A1').replace(/\s+/g, '_')}_${today}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Role Admin: Toàn trường
    const backupData = {
      version: '2.0.0',
      exportType: 'ADMIN_FULL_SCHOOL_DATA',
      exportedAt: new Date().toISOString(),
      classes,
      activeClassId,
      students,
      registeredTeachers,
      subjects,
      criteria,
      transactions,
      rewards,
      redemptions,
      seatingColumns,
      seatingAssignments,
      attendanceRecords,
      boardingRecords,
      timetableConfig,
      timetable,
      quickLinks,
      teacherProfile,
      questionBanks
    };

    const zip = new JSZip();
    zip.file("lop_hoc_hanh_phuc_data_toan_truong.json", JSON.stringify(backupData, null, 2));
    zip.file("THONG_TIN_SAO_LUU_TOAN_TRUONG.txt", `=== SAO LƯU DỮ LIỆU HỆ THỐNG LỚP HỌC HẠNH PHÚC TOÀN TRƯỜNG ===\n` +
      `Đơn vị công tác: ${teacherProfile.schoolName}\n` +
      `Thời gian xuất file: ${new Date().toLocaleString('vi-VN')}\n` +
      `Tổng số lớp học: ${classes.length} lớp\n` +
      `Tổng số học sinh: ${students.length} học sinh\n` +
      `Số tài khoản giáo viên: ${registeredTeachers.length} tài khoản\n\n` +
      `Hướng dẫn khôi phục:\n` +
      `Để nạp lại dữ liệu, vào mục "DỮ LIỆU" trong ứng dụng, chọn "Nạp Vào Khôi Phục DỮ LIỆU" và tải file .ZIP này lên.`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sao_Luu_Toan_Truong_${today}.zip`;
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

      if (data.classes && Array.isArray(data.classes)) setClasses(data.classes);
      if (data.activeClassId) setActiveClassId(data.activeClassId);
      if (data.students && Array.isArray(data.students)) setStudents(data.students);
      if (data.subjects && Array.isArray(data.subjects)) setSubjects(data.subjects);
      if (data.criteria && Array.isArray(data.criteria)) setCriteria(data.criteria);
      if (data.transactions && Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (data.rewards && Array.isArray(data.rewards)) setRewards(data.rewards);
      if (data.redemptions && Array.isArray(data.redemptions)) setRedemptions(data.redemptions);
      if (data.seatingColumns) setSeatingColumns(data.seatingColumns);
      if (data.seatingAssignments) setSeatingAssignments(data.seatingAssignments);
      if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords);
      if (data.boardingRecords) setBoardingRecords(data.boardingRecords);
      if (data.timetableConfig) setTimetableConfig(data.timetableConfig);
      if (data.timetable) setTimetable(data.timetable);
      if (data.quickLinks) setQuickLinks(data.quickLinks);
      if (data.teacherProfile) setTeacherProfile(data.teacherProfile);

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

      if (data.classes && Array.isArray(data.classes)) setClasses(data.classes);
      if (data.activeClassId) setActiveClassId(data.activeClassId);
      if (data.students && Array.isArray(data.students)) setStudents(data.students);
      if (data.subjects && Array.isArray(data.subjects)) setSubjects(data.subjects);
      if (data.criteria && Array.isArray(data.criteria)) setCriteria(data.criteria);
      if (data.transactions && Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (data.rewards && Array.isArray(data.rewards)) setRewards(data.rewards);
      if (data.redemptions && Array.isArray(data.redemptions)) setRedemptions(data.redemptions);
      if (data.seatingColumns) setSeatingColumns(data.seatingColumns);
      if (data.seatingAssignments) setSeatingAssignments(data.seatingAssignments);
      if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords);
      if (data.boardingRecords) setBoardingRecords(data.boardingRecords);
      if (data.timetableConfig) setTimetableConfig(data.timetableConfig);
      if (data.timetable) setTimetable(data.timetable);
      if (data.quickLinks) setQuickLinks(data.quickLinks);
      if (data.teacherProfile) setTeacherProfile(data.teacherProfile);

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
      academicYear: '2026 – 2027',
      teacherName: 'Nguyễn Thị Hoa',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1&backgroundColor=3b82f6',
      slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng',
      parentCommittee: {
        head: { name: 'Trần Văn Mạnh', phone: '0988 123 456', roleTitle: 'Trưởng ban phụ huynh' },
        deputy: { name: 'Nguyễn Thị Mai', phone: '0977 654 321', roleTitle: 'Phó ban phụ huynh' },
        member1: { name: 'Lê Hoàng Nam', phone: '0912 345 678', roleTitle: 'Ủy viên ban phụ huynh' },
        member2: { name: 'Phạm Thị Lan', phone: '0903 890 123', roleTitle: 'Ủy viên ban phụ huynh' }
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

    // 2. Synchronous localStorage writes to eliminate any state race conditions
    safeLocalStorageSet(STORAGE_KEY + '_classes', JSON.stringify(freshClasses));
    safeLocalStorageSet(STORAGE_KEY + '_activeClassId', 'class-4a1');
    safeLocalStorageSet(STORAGE_KEY + '_students', JSON.stringify(freshStudents));
    safeLocalStorageSet(STORAGE_KEY + '_subjects', JSON.stringify(INITIAL_SUBJECTS));
    safeLocalStorageSet(STORAGE_KEY + '_criteria', JSON.stringify(INITIAL_CRITERIA));
    safeLocalStorageSet(STORAGE_KEY + '_rewards', JSON.stringify(INITIAL_REWARDS));
    safeLocalStorageSet(STORAGE_KEY + '_timetable', JSON.stringify(freshTimetable));
    safeLocalStorageSet(STORAGE_KEY + '_quickLinks', JSON.stringify(INITIAL_QUICK_LINKS));
    safeLocalStorageSet(STORAGE_KEY + '_teacherProfile', JSON.stringify(DEFAULT_TEACHER));
    safeLocalStorageSet(STORAGE_KEY + '_transactions', JSON.stringify([]));
    safeLocalStorageSet(STORAGE_KEY + '_redemptions', JSON.stringify([]));
    safeLocalStorageSet(STORAGE_KEY + '_attendance', JSON.stringify([]));
    safeLocalStorageSet(STORAGE_KEY + '_boarding', JSON.stringify([]));
    safeLocalStorageSet(STORAGE_KEY + '_seatingColumns', '2');
    safeLocalStorageSet(STORAGE_KEY + '_seatingAssignments', JSON.stringify(initialMap));

    // 3. Update React states
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
    // Synchronous localStorage writes
    localStorage.setItem(STORAGE_KEY + '_classes', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_activeClassId', '');
    localStorage.setItem(STORAGE_KEY + '_students', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_timetable', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_transactions', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_rewards', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_redemptions', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_attendance', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_boarding', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY + '_seatingAssignments', JSON.stringify({}));

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

  // ---------------------------------------------------------------------------
  // AUTH & ROLE HANDLERS
  // ---------------------------------------------------------------------------
  const loginAsTeacher = async (user: any, token: string) => {
    setCachedAccessToken(token);

    const userEmail = (user.email || '').toLowerCase().trim();
    const existing = registeredTeachers.find(t => t.email.toLowerCase() === userEmail);

    if (existing) {
      if (existing.status === 'pending') {
        throw new Error(`Tài khoản Google (${user.email}) đang ở trạng thái CHỜ PHÊ DUYỆT từ Quản trị viên. Vui lòng liên hệ Admin để được cấp quyền vào lớp.`);
      }
      if (existing.status === 'rejected') {
        throw new Error(`Tài khoản Google (${user.email}) đã bị Quản trị viên TỪ CHỐI quyền truy cập.`);
      }
      // If approved, assign to class if not yet set
      if (existing.assignedClassId && classes.some(c => c.id === existing.assignedClassId)) {
        setActiveClassId(existing.assignedClassId);
      }
      // Update last login timestamp
      setRegisteredTeachers(prev => prev.map(t => t.id === existing.id ? { ...t, lastLoginAt: Date.now() } : t));
    } else {
      // Auto-register as pending for administrator review!
      const newPendingTeacher: RegisteredTeacher = {
        id: 'gv-' + Date.now(),
        email: user.email || '',
        username: user.email ? user.email.split('@')[0] : 'gv_' + Date.now().toString().slice(-4),
        password: '123456',
        displayName: user.displayName || teacherProfile.name || 'Giáo viên mới',
        photoURL: user.photoURL,
        assignedClassId: classes[0]?.id || 'class-4a1',
        assignedClassName: classes[0]?.name ? `${classes[0].name} (${classes[0].grade})` : '4A1 (Khối 4)',
        status: 'pending',
        registeredAt: Date.now(),
        lastLoginAt: Date.now(),
        note: 'Đăng ký lần đầu bằng Google - Chờ quản trị viên duyệt và phân công lớp'
      };
      setRegisteredTeachers(prev => [newPendingTeacher, ...prev]);
      throw new Error(`Tài khoản Google (${user.email}) vừa đăng ký và đang ở trạng thái CHỜ QUẢN TRỊ VIÊN DUYỆT. Vui lòng đăng nhập tài khoản Quản trị để duyệt hoặc liên hệ Admin.`);
    }

    const displayName = user.displayName || existing?.displayName || teacherProfile.name || 'Cô Nguyễn Thị Hoa';
    const folderName = `THƯ MỤC GIÁO VIÊN: ${displayName}`;
    const account: TeacherAccount = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL,
      folderName,
      lastSyncTime: Date.now()
    };
    setTeacherAccount(account);
    setCurrentRole('teacher');
    setIsImpersonating(false);
    setRoleModalOpen(false);

    if (user.displayName) {
      setTeacherProfile(prev => ({
        ...prev,
        name: displayName,
        avatar: user.photoURL || prev.avatar
      }));
    }

    try {
      setIsDriveSyncing(true);
      setDriveSyncStatus(`Đang tạo và đồng bộ "${folderName}" trên Google Drive...`);
      const { teacherFolderId } = await ensureDriveTree(token, displayName);
      account.folderId = teacherFolderId;
      setTeacherAccount({ ...account });

      // Save class JSON to this teacher's folder
      const teacherClassJson = {
        updatedAt: new Date().toISOString(),
        teacher: { ...teacherProfile, name: displayName, avatar: user.photoURL || teacherProfile.avatar },
        classes,
        students,
        subjects,
        timetable,
        transactions,
        attendanceRecords,
        boardingRecords
      };
      await saveJsonToDrive(
        token, 
        teacherFolderId, 
        `LopHoc_${displayName.replace(/\s+/g, '_')}_data.json`, 
        teacherClassJson
      );
      setDriveSyncStatus(`Đã đồng bộ vào Google Drive: ${folderName}`);
    } catch (err: any) {
      console.warn('Drive sync warning:', err);
      setDriveSyncStatus('Đã đăng nhập Google');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Đăng nhập giáo viên bằng Username & Password do Quản trị viên cấp
  // (Khắc phục hoàn toàn lỗi bị Google chặn OAuth 403 access_denied)
  const loginTeacherWithCredentials = (
    usernameInput: string, 
    passwordInput: string
  ): { success: boolean; message?: string } => {
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    if (!u || !p) {
      return { success: false, message: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu giáo viên.' };
    }

    const teacher = registeredTeachers.find(t => 
      (t.username && t.username.toLowerCase() === u) || 
      (t.email && t.email.toLowerCase() === u)
    );

    if (!teacher) {
      return { 
        success: false, 
        message: 'Tên đăng nhập không tồn tại trên hệ thống. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.' 
      };
    }

    if (teacher.password && teacher.password !== p) {
      return { success: false, message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' };
    }

    if (teacher.status === 'pending') {
      return { 
        success: false, 
        message: `Tài khoản (${teacher.displayName}) đang ở trạng thái CHỜ PHÊ DUYỆT từ Quản trị viên.` 
      };
    }

    if (teacher.status === 'rejected') {
      return { 
        success: false, 
        message: 'Tài khoản này đã bị Quản trị viên TẠM KHÓA quyền truy cập.' 
      };
    }

    // Active approved teacher
    // Yêu cầu: Lớp phụ trách thêm mục Non tức là chưa phân cấp quản lý lớp nào.
    // Tài khoản nào được phân quyền quản lý lớp nào thì được thao tác hiển thị với lớp đó, còn nếu không khi đăng nhập sẽ không hiển thị lớp.
    const isAssignedNone = !teacher.assignedClassId || teacher.assignedClassId === 'none';
    const targetClassId = isAssignedNone ? 'none' : teacher.assignedClassId;
    setActiveClassId(isAssignedNone ? '' : targetClassId);
    const targetClass = isAssignedNone ? null : classes.find(c => c.id === targetClassId);

    const account: TeacherAccount = {
      uid: teacher.id,
      username: teacher.username,
      email: teacher.email,
      displayName: teacher.displayName,
      assignedClassId: targetClassId,
      photoURL: teacher.photoURL,
      folderName: `THƯ MỤC GIÁO VIÊN: ${teacher.displayName}`,
      lastSyncTime: Date.now()
    };

    setTeacherAccount(account);
    setCurrentRole('teacher');
    setIsImpersonating(false);
    setRoleModalOpen(false);

    setTeacherProfile(prev => ({
      ...prev,
      name: teacher.displayName || prev.name,
      role: targetClass ? `Giáo viên chủ nhiệm lớp ${targetClass.name}` : 'Chưa phân công lớp',
      avatar: teacher.photoURL || prev.avatar
    }));

    // Update last login
    setRegisteredTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, lastLoginAt: Date.now() } : t));

    return { success: true };
  };

  const loginAsAdmin = (username: string, password: string): { success: boolean; message?: string } => {
    const u = username.trim().toLowerCase();
    const p = password.trim();
    if (u === 'admin' && (p === 'Tanuyen@2026' || p === 'admin123' || p === 'admin')) {
      const account: AdminAccount = {
        username: 'admin',
        role: 'admin',
        folderName: 'THƯ MỤC QUẢN TRỊ',
        cycleStartDate
      };
      setAdminAccount(account);
      setCurrentRole('admin');
      setIsImpersonating(false);
      setRoleModalOpen(false);
      return { success: true };
    }
    return { success: false, message: 'Tên đăng nhập hoặc mật khẩu quản trị không đúng! (Mật khẩu mặc định: Tanuyen@2026 hoặc admin123)' };
  };

  const logoutRole = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.error(e);
    }
    setCurrentRole(null);
    setTeacherAccount(null);
    setAdminAccount(null);
    setIsImpersonating(false);
    localStorage.removeItem(STORAGE_KEY + '_currentRole');
    localStorage.removeItem(STORAGE_KEY + '_teacherAccount');
    localStorage.removeItem(STORAGE_KEY + '_adminAccount');
    localStorage.removeItem(STORAGE_KEY + '_isImpersonating');
    setRoleModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // REGISTERED TEACHERS MANAGEMENT (ADMIN CONTROL)
  // ---------------------------------------------------------------------------
  const addRegisteredTeacher = (teacherData: Omit<RegisteredTeacher, 'id' | 'registeredAt'>) => {
    const isNone = !teacherData.assignedClassId || teacherData.assignedClassId === 'none';
    const assignedCls = isNone ? null : classes.find(c => c.id === teacherData.assignedClassId);
    const newTeacher: RegisteredTeacher = {
      ...teacherData,
      id: 'gv-' + Date.now(),
      username: teacherData.username || (teacherData.email ? teacherData.email.split('@')[0] : 'gv_' + Date.now().toString().slice(-4)),
      password: teacherData.password || '123456',
      assignedClassId: isNone ? 'none' : teacherData.assignedClassId,
      assignedClassName: isNone ? 'Chưa phân công (None)' : (assignedCls ? `${assignedCls.name} (${assignedCls.grade})` : (teacherData.assignedClassName || '4A1')),
      registeredAt: Date.now()
    };
    setRegisteredTeachers(prev => [newTeacher, ...prev]);
  };

  const updateRegisteredTeacher = (id: string, data: Partial<RegisteredTeacher>) => {
    setRegisteredTeachers(prev => prev.map(t => {
      if (t.id === id) {
        let assignedClassName = t.assignedClassName;
        if (data.assignedClassId !== undefined) {
          if (data.assignedClassId === 'none' || !data.assignedClassId) {
            assignedClassName = 'Chưa phân công (None)';
          } else {
            const cls = classes.find(c => c.id === data.assignedClassId);
            if (cls) assignedClassName = `${cls.name} (${cls.grade})`;
          }
        }
        return { ...t, ...data, assignedClassName };
      }
      return t;
    }));
  };

  const deleteRegisteredTeacher = (id: string) => {
    setRegisteredTeachers(prev => prev.filter(t => t.id !== id));
  };

  const approveTeacher = (id: string, classId?: string) => {
    setRegisteredTeachers(prev => prev.map(t => {
      if (t.id === id) {
        const assignedClassId = classId !== undefined ? classId : (t.assignedClassId || 'none');
        const isNone = assignedClassId === 'none' || !assignedClassId;
        const cls = isNone ? null : classes.find(c => c.id === assignedClassId);
        return {
          ...t,
          status: 'approved' as const,
          assignedClassId: isNone ? 'none' : assignedClassId,
          assignedClassName: isNone ? 'Chưa phân công (None)' : (cls ? `${cls.name} (${cls.grade})` : t.assignedClassName)
        };
      }
      return t;
    }));
  };

  const rejectTeacher = (id: string) => {
    setRegisteredTeachers(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' as const } : t));
  };

  const resetTeacherPassword = (id: string, newPassword = '123456') => {
    setRegisteredTeachers(prev => prev.map(t => t.id === id ? { ...t, password: newPassword } : t));
  };

  // ---------------------------------------------------------------------------
  // ADMIN IMPERSONATION (View and interact with class as teacher and back)
  // ---------------------------------------------------------------------------
  const adminImpersonateClass = (classId: string) => {
    const targetClass = classes.find(c => c.id === classId) || classes[0];
    if (targetClass) {
      setActiveClassId(targetClass.id);
      if (targetClass.teacherName) {
        setTeacherProfile(prev => ({
          ...prev,
          name: targetClass.teacherName || prev.name,
          role: `Giáo viên chủ nhiệm lớp ${targetClass.name}`
        }));
      }
    }
    setCurrentRole('teacher');
    setIsImpersonating(true);
  };

  const exitImpersonation = () => {
    setCurrentRole('admin');
    setIsImpersonating(false);
  };

  // ---------------------------------------------------------------------------
  // GOOGLE DRIVE SYNC ACTIONS
  // ---------------------------------------------------------------------------
  const syncToDriveNow = async (): Promise<{ success: boolean; message: string }> => {
    const token = getCachedAccessToken();
    if (!token) {
      return { 
        success: false, 
        message: 'Chưa có phiên kết nối Google Drive. Vui lòng bấm Đăng nhập Google để cấp quyền lưu trữ.' 
      };
    }

    setIsDriveSyncing(true);
    setDriveSyncStatus('Đang đồng bộ dữ liệu lên Google Drive...');
    try {
      const teacherName = teacherAccount?.displayName || teacherProfile.name || 'GiaoVien';
      const { teacherFolderId, adminFolderId } = await ensureDriveTree(token, teacherName);

      if (currentRole === 'teacher' || teacherAccount) {
        const teacherData = {
          updatedAt: new Date().toISOString(),
          teacher: teacherProfile,
          classes,
          students,
          subjects,
          timetable,
          transactions,
          attendanceRecords,
          boardingRecords
        };
        await saveJsonToDrive(
          token, 
          teacherFolderId, 
          `LopHoc_${teacherName.replace(/\s+/g, '_')}_data.json`, 
          teacherData
        );
      }

      if (currentRole === 'admin' || adminAccount) {
        const adminData = {
          updatedAt: new Date().toISOString(),
          totalClasses: classes.length,
          totalStudents: students.length,
          classes,
          students,
          attendanceRecords,
          boardingRecords
        };
        await saveJsonToDrive(token, adminFolderId, 'DuLieu_TongQuan_QuanTri.json', adminData);
      }

      setDriveSyncStatus('Đồng bộ Google Drive thành công');
      setIsDriveSyncing(false);
      return { success: true, message: 'Dữ liệu đã được lưu trữ và đồng bộ an toàn trên Google Drive!' };
    } catch (err: any) {
      setIsDriveSyncing(false);
      setDriveSyncStatus(`Lỗi đồng bộ: ${err.message || err}`);
      return { success: false, message: err.message || 'Lỗi khi lưu lên Google Drive' };
    }
  };

  const loadFromDriveNow = async (): Promise<{ success: boolean; message: string }> => {
    const token = getCachedAccessToken();
    if (!token) {
      return { success: false, message: 'Chưa có phiên kết nối Google Drive.' };
    }

    setIsDriveSyncing(true);
    setDriveSyncStatus('Đang tìm tệp sao lưu trên Google Drive...');
    try {
      const teacherName = teacherAccount?.displayName || teacherProfile.name || 'GiaoVien';
      const { teacherFolderId } = await ensureDriveTree(token, teacherName);
      const files = await listFilesInFolder(token, teacherFolderId);
      const jsonFile = files.find(f => f.name.endsWith('.json'));

      if (!jsonFile) {
        setIsDriveSyncing(false);
        return { success: false, message: `Chưa có tệp JSON nào trong "THƯ MỤC GIÁO VIÊN: ${teacherName}"` };
      }

      const driveData = await readJsonFromDrive(token, jsonFile.id);
      if (driveData.classes && Array.isArray(driveData.classes)) {
        setClasses(driveData.classes);
      }
      if (driveData.students && Array.isArray(driveData.students)) {
        setStudents(driveData.students);
      }
      if (driveData.subjects && Array.isArray(driveData.subjects)) {
        setSubjects(driveData.subjects);
      }
      if (driveData.timetable && Array.isArray(driveData.timetable)) {
        setTimetable(driveData.timetable);
      }
      if (driveData.attendanceRecords && Array.isArray(driveData.attendanceRecords)) {
        setAttendanceRecords(driveData.attendanceRecords);
      }
      if (driveData.boardingRecords && Array.isArray(driveData.boardingRecords)) {
        setBoardingRecords(driveData.boardingRecords);
      }

      setIsDriveSyncing(false);
      setDriveSyncStatus('Đã khôi phục dữ liệu từ Google Drive');
      return { success: true, message: `Đã nạp thành công dữ liệu từ "${jsonFile.name}" trên Google Drive!` };
    } catch (err: any) {
      setIsDriveSyncing(false);
      return { success: false, message: err.message || 'Lỗi khi đọc Google Drive' };
    }
  };

  // ---------------------------------------------------------------------------
  // 30-DAY CYCLE ALERT & MONTHLY RESET
  // ---------------------------------------------------------------------------
  const cycleDateObj = new Date(cycleStartDate || '2026-09-01');
  const diffDays = Math.floor(Math.abs(Date.now() - cycleDateObj.getTime()) / (1000 * 60 * 60 * 24));
  const daysIntoCycle = Math.max(0, diffDays);
  const is30DayAlertDue = daysIntoCycle >= 30 && !isAlertDismissed;

  const dismiss30DayAlert = () => {
    setIsAlertDismissed(true);
  };

  const resetMonthlyStatistics = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCycleStartDate(todayStr);
    setIsAlertDismissed(false);
    safeLocalStorageSet(STORAGE_KEY + '_cycleStartDate', todayStr);

    // Xóa làm mới dữ liệu chuyên cần và bán trú cho chu kỳ tháng mới
    // Giữ nguyên 100% lớp học, danh sách học sinh và điểm xu thi đua
    setAttendanceRecords([]);
    setBoardingRecords([]);
    safeLocalStorageSet(STORAGE_KEY + '_attendance', JSON.stringify([]));
    safeLocalStorageSet(STORAGE_KEY + '_boarding', JSON.stringify([]));
  };

  const exportFullSystemJson = () => {
    exportBackupJson();
  };

  // ---------------------------------------------------------------------------
  // QUESTION BANKS MANAGEMENT
  // ---------------------------------------------------------------------------
  const addQuestionBank = (bank: Omit<QuestionBank, 'id' | 'createdAt'>) => {
    const newBank: QuestionBank = {
      ...bank,
      id: `qb-${Date.now()}`,
      createdAt: Date.now()
    };
    setQuestionBanks(prev => [newBank, ...prev]);
  };

  const updateQuestionBank = (id: string, bank: Partial<QuestionBank>) => {
    setQuestionBanks(prev => prev.map(b => b.id === id ? { ...b, ...bank } : b));
  };

  const deleteQuestionBank = (id: string) => {
    setQuestionBanks(prev => prev.filter(b => b.id !== id));
  };

  const addQuestionToBank = (bankId: string, question: Omit<QuestionItem, 'id'>) => {
    const newQ: QuestionItem = {
      ...question,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    setQuestionBanks(prev => prev.map(b => {
      if (b.id === bankId) {
        return { ...b, questions: [...b.questions, newQ] };
      }
      return b;
    }));
  };

  const deleteQuestionFromBank = (bankId: string, questionId: string) => {
    setQuestionBanks(prev => prev.map(b => {
      if (b.id === bankId) {
        return { ...b, questions: b.questions.filter(q => q.id !== questionId) };
      }
      return b;
    }));
  };

  return (
    <ClassroomContext.Provider value={{
      currentRole,
      setCurrentRole,
      teacherAccount,
      adminAccount,
      isRoleModalOpen,
      setRoleModalOpen,
      loginAsTeacher,
      loginTeacherWithCredentials,
      loginAsAdmin,
      logoutRole,

      registeredTeachers,
      addRegisteredTeacher,
      updateRegisteredTeacher,
      deleteRegisteredTeacher,
      approveTeacher,
      rejectTeacher,
      resetTeacherPassword,

      isImpersonating,
      adminImpersonateClass,
      exitImpersonation,

      isDriveSyncing,
      driveSyncStatus,
      syncToDriveNow,
      loadFromDriveNow,

      cycleStartDate,
      daysIntoCycle,
      is30DayAlertDue,
      isAlertDismissed,
      dismiss30DayAlert,
      resetMonthlyStatistics,
      exportFullSystemJson,

      questionBanks,
      addQuestionBank,
      updateQuestionBank,
      deleteQuestionBank,
      addQuestionToBank,
      deleteQuestionFromBank,

      classes,
      activeClassId,
      setActiveClassId,
      addClass,
      updateClass,
      deleteClass,
      deleteAllClasses,

      students,
      currentClassStudents,
      addStudent,
      updateStudent,
      deleteStudent,
      clearClassStudents,
      bulkAddStudents,

      subjects,
      addSubject,
      updateSubject,
      deleteSubject,

      criteria,
      addCriterion,

      transactions,
      awardPoints,
      deductPoints,
      resetStudentPoints,
      bulkSetPoints,

      rewards,
      addReward,
      updateReward,
      deleteReward,
      redemptions,
      redeemReward,

      seatingColumns,
      setSeatingColumns,
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

      quickLinks,
      addQuickLink,
      deleteQuickLink,

      teacherProfile,
      updateTeacherProfile,

      exportBackupJson,
      importBackupJson,
      exportBackupZip,
      importBackupZip,
      resetToDefaultData,
      clearAllData
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
