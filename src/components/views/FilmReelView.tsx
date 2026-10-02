import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student, QuestionItem } from '../../types';
import { 
  Film, Play, Award, RotateCcw, Sparkles, Trash2, 
  Volume2, ArrowDown, ArrowUp, Check, HelpCircle, 
  BookOpen, ChevronRight, Clock, ShieldCheck, Eye, EyeOff, Edit3
} from 'lucide-react';
import { playTickSound, playFanfareSound, playCoinSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { QuestionBankModal } from '../modals/QuestionBankModal';
import { loadQuizBank, saveQuizBank } from '../../utils/quizParser';

const FRAME_WIDTH = 155; // Width of each 35mm film frame
const FRAME_GAP = 14; // Gap between frames
const TOTAL_FRAME_SPACE = FRAME_WIDTH + FRAME_GAP; // 169px

export const FilmReelView: React.FC = () => {
  const { currentClassStudents, awardPoints, quizBank, updateQuizBank } = useClassroom();
  
  // 3 Modes: 'random' | 'coins' | 'quiz'
  const [callMode, setCallMode] = useState<'random' | 'coins' | 'quiz'>('random');

  // Selectable Spin Duration (Default: 4 seconds as requested)
  const [spinDuration, setSpinDuration] = useState<number>(4);

  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<Student | null>(null);
  const [rewardXu, setRewardXu] = useState(2);
  const [hasAwarded, setHasAwarded] = useState(false);

  // Settings & History
  const [autoExclude, setAutoExclude] = useState(true);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ name: string; avatar: string; time: string; points: number }>>([]);

  // Animated sliding strip state (Transits from Right to Left)
  const [translateX, setTranslateX] = useState<number>(0);
  const [reelStudents, setReelStudents] = useState<Student[]>([]);

  // Question challenge state for Mode 3 (Gọi tên + Trả lời câu hỏi)
  const [selectedQuizSubject, setSelectedQuizSubject] = useState<string>('all');
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [oralStatus, setOralStatus] = useState<'pending' | 'correct' | 'incorrect'>('pending');
  const [customOralPoints, setCustomOralPoints] = useState<number>(2);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
  const [editTargetQuestion, setEditTargetQuestion] = useState<QuestionItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Available subjects in quizBank
  const quizSubjects = Array.from(new Set(quizBank.map(q => q.subject || 'Tổng hợp'))).filter(Boolean);

  const getCandidateQuestions = (subject = selectedQuizSubject) => {
    if (subject === 'all') return quizBank;
    const filtered = quizBank.filter(q => (q.subject || 'Tổng hợp') === subject);
    return filtered.length > 0 ? filtered : quizBank;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickFrameRef = useRef<number>(-1);

  // Eligible pool of students
  const activeStudents = currentClassStudents.filter(s => !excludedStudentIds.includes(s.id));
  const pool = activeStudents.length > 0 ? activeStudents : currentClassStudents;

  // Initialize reel with repeated students for continuous multiple visible frames display
  useEffect(() => {
    if (pool.length > 0 && reelStudents.length === 0) {
      const initial: Student[] = [];
      while (initial.length < 35) {
        initial.push(...pool);
      }
      setReelStudents(initial.slice(0, 45));
    }
  }, [pool, reelStudents.length]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Keyboard shortcut: Space to roll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isRolling && pool.length > 0) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        startFilmReel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRolling, pool, spinDuration]);

  // START FILM REEL: Slides from RIGHT to LEFT with selected duration (4s default)
  const startFilmReel = () => {
    if (isRolling || pool.length === 0) return;

    setIsRolling(true);
    setWinner(null);
    setHasAwarded(false);
    setSelectedOption(null);
    setShowTeacherKey(false);
    setIsAnswerCorrect(null);
    setOralStatus('pending');
    setCustomOralPoints(2);

    // Pick random winner from eligible pool
    const selectedWinner = pool[Math.floor(Math.random() * pool.length)];

    // Build strip sequence of 65 frames with winner located at index 50
    const sequenceLength = 65;
    const targetIndex = 50;
    const newReel: Student[] = [];

    for (let i = 0; i < sequenceLength; i++) {
      if (i === targetIndex) {
        newReel.push(selectedWinner);
      } else {
        const randomOther = pool[Math.floor(Math.random() * pool.length)];
        newReel.push(randomOther);
      }
    }
    setReelStudents(newReel);

    // Calculate center of viewport
    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 720;
    const centerPoint = containerWidth / 2;

    // Center of frame i is: i * TOTAL_FRAME_SPACE + (FRAME_WIDTH / 2)
    // Moving from right to left means translateX starts at initial position and decreases to finalOffset
    const startOffset = centerPoint - (FRAME_WIDTH / 2); // Initial Frame 0 at center
    const finalOffset = centerPoint - (targetIndex * TOTAL_FRAME_SPACE + FRAME_WIDTH / 2); // Final offset (negative)
    setTranslateX(startOffset);

    const startTime = performance.now();
    const duration = spinDuration * 1000; // 4000ms standard
    lastTickFrameRef.current = -1;

    // Authentic cubic bezier easing curve: rapid start, gradual silky stop
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3.6);
    };

    const animateRoll = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      // Slides from Right to Left as translateX decreases
      const currentX = startOffset + (finalOffset - startOffset) * easedProgress;
      setTranslateX(currentX);

      // Play tick sound when crossing each film frame boundary
      const currentPassedIndex = Math.floor(Math.abs(currentX - startOffset) / TOTAL_FRAME_SPACE);
      if (currentPassedIndex !== lastTickFrameRef.current) {
        lastTickFrameRef.current = currentPassedIndex;
        playTickSound(680 + (currentPassedIndex % 6) * 40);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateRoll);
      } else {
        // Animation finished at exact center!
        setTranslateX(finalOffset);
        setIsRolling(false);
        setWinner(selectedWinner);
        playFanfareSound();
        confetti({ particleCount: 95, spread: 85, origin: { y: 0.6 } });

        // Record history
        const nowTime = new Date();
        const timeStr = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;
        setHistory(prev => [
          { name: selectedWinner.name, avatar: selectedWinner.avatar, time: timeStr, points: selectedWinner.points },
          ...prev
        ]);

        // Auto exclude if checked
        if (autoExclude) {
          setExcludedStudentIds(prev => [...prev, selectedWinner.id]);
        }

        // If in Mode 3 (Quiz), randomly pick a question from the question bank or chosen subject
        if (callMode === 'quiz' && quizBank.length > 0) {
          const candidates = getCandidateQuestions(selectedQuizSubject);
          if (candidates.length > 0) {
            const q = candidates[Math.floor(Math.random() * candidates.length)];
            setCurrentQuestion(q);
            setCustomOralPoints(q.pointsReward || 2);
            setOralStatus('pending');
          }
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateRoll);
  };

  // Tự động tải câu hỏi nếu chuyển sang Chế độ 3 (Trả lời câu hỏi) khi đã có học sinh được chọn
  useEffect(() => {
    if (callMode === 'quiz' && winner && !currentQuestion && quizBank.length > 0) {
      const candidates = getCandidateQuestions(selectedQuizSubject);
      if (candidates.length > 0) {
        const q = candidates[Math.floor(Math.random() * candidates.length)];
        setCurrentQuestion(q);
        setCustomOralPoints(q.pointsReward || 2);
        setOralStatus('pending');
      }
    }
  }, [callMode, winner, currentQuestion, quizBank, selectedQuizSubject]);

  const handleChangeSubject = (newSubject: string) => {
    setSelectedQuizSubject(newSubject);
    const candidates = getCandidateQuestions(newSubject);
    if (candidates.length > 0) {
      const q = candidates[Math.floor(Math.random() * candidates.length)];
      setCurrentQuestion(q);
      setSelectedOption(null);
      setShowTeacherKey(false);
      setIsAnswerCorrect(null);
      setOralStatus('pending');
      setCustomOralPoints(q.pointsReward || 2);
      setHasAwarded(false);
    }
  };

  const handleAward = (amount = rewardXu, reason = 'Thưởng gọi tên qua Cuộn Phim 35mm') => {
    if (!winner || hasAwarded) return;
    const targetSub = currentQuestion?.subject || 'Ghi chung';
    awardPoints([winner.id], amount, reason, targetSub);
    playCoinSound();
    setHasAwarded(true);
    confetti({ particleCount: 50, spread: 60 });
  };

  // Trắc nghiệm: ĐÚNG được cộng xu, SAI KHÔNG ĐƯỢC CỘNG XU (User requirement)
  const handleSelectOption = (idx: number) => {
    if (!currentQuestion || selectedOption !== null || !winner) return;
    setSelectedOption(idx);
    const correct = idx === currentQuestion.correctOptionIndex;
    setIsAnswerCorrect(correct);

    if (correct) {
      // Trả lời ĐÚNG -> Tự động cộng xu cho học sinh!
      playFanfareSound();
      confetti({ particleCount: 65, spread: 75 });
      const ptsToAward = customOralPoints || currentQuestion.pointsReward || 2;
      handleAward(
        ptsToAward, 
        `Trả lời đúng trắc nghiệm môn ${currentQuestion.subject || 'Tổng hợp'}`
      );
    } else {
      // Trả lời SAI -> Tuyệt đối KHÔNG cộng xu (0 xu)!
      setShowTeacherKey(true);
      playTickSound(260);
    }
  };

  // Cho phép làm lại trắc nghiệm
  const handleRetryMultipleChoice = () => {
    setSelectedOption(null);
    setIsAnswerCorrect(null);
    setShowTeacherKey(false);
  };

  // Tự luận: Giáo viên xác nhận cộng xu nếu học sinh trả lời đúng (User requirement)
  const handleConfirmOralCorrect = (pts?: number) => {
    if (!winner || !currentQuestion || hasAwarded) return;
    const finalPts = pts ?? customOralPoints ?? currentQuestion.pointsReward ?? 2;
    setOralStatus('correct');
    handleAward(
      finalPts, 
      `Giáo viên xác nhận trả lời đúng câu tự luận môn ${currentQuestion.subject || 'Tổng hợp'}`
    );
    playFanfareSound();
    confetti({ particleCount: 65, spread: 75 });
  };

  // Tự luận: Giáo viên xác nhận trả lời sai / chưa đạt -> KHÔNG CỘNG XU
  const handleConfirmOralIncorrect = () => {
    if (!winner || !currentQuestion) return;
    setOralStatus('incorrect');
    setShowTeacherKey(true);
    playTickSound(260);
  };

  // Đặt lại trạng thái chấm tự luận
  const handleResetOralEvaluation = () => {
    setOralStatus('pending');
    setShowTeacherKey(false);
  };

  const handlePickAnotherQuestion = () => {
    const candidates = getCandidateQuestions(selectedQuizSubject);
    if (candidates.length === 0) return;
    const remaining = candidates.filter(q => q.id !== currentQuestion?.id);
    const poolQ = remaining.length > 0 ? remaining : candidates;
    const q = poolQ[Math.floor(Math.random() * poolQ.length)];
    setCurrentQuestion(q);
    setSelectedOption(null);
    setShowTeacherKey(false);
    setIsAnswerCorrect(null);
    setOralStatus('pending');
    setCustomOralPoints(q.pointsReward || 2);
    setHasAwarded(false);
  };

  const handleRestoreStudent = (id: string) => {
    setExcludedStudentIds(prev => prev.filter(x => x !== id));
  };

  const handleRestoreAll = () => {
    setExcludedStudentIds([]);
  };

  const excludedStudents = currentClassStudents.filter(s => excludedStudentIds.includes(s.id));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. TOP CONTROL BAR: 3 CALL MODES + SPIN DURATION (4s Standard) */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Film className="w-5 h-5 text-amber-700" />
            </span>
            <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">
              CUỘN PHIM GỌI TÊN ĐIỆN ẢNH 35MM
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Dải phim quay mượt mà từ Phải sang Trái • Hiển thị nhiều học sinh • 3 Chế độ gọi tên & Bộ đề thi linh hoạt
          </p>
        </div>

        {/* 3 Call Modes Switcher (User request: 1. Ngẫu nhiên, 2. Tặng xu, 3. Trả lời câu hỏi) */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setCallMode('random')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer uppercase text-center ${
              callMode === 'random' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="hidden sm:inline">1. Gọi Ngẫu Nhiên</span>
            <span className="sm:hidden">1. NGẪU NHIÊN</span>
          </button>
          <button
            type="button"
            onClick={() => setCallMode('coins')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer uppercase text-center ${
              callMode === 'coins' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="hidden sm:inline">2. Gọi + Tặng Xu</span>
            <span className="sm:hidden">2. TẶNG XU</span>
          </button>
          <button
            type="button"
            onClick={() => setCallMode('quiz')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer uppercase text-center ${
              callMode === 'quiz' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="hidden sm:inline">3. Gọi + Trả Lời Câu Hỏi</span>
            <span className="sm:hidden">3. CÂU HỎI</span>
          </button>
        </div>

        {/* Mode 3 Subject Selector (User requirement: lựa chọn bộ câu hỏi ngẫu nhiên từ kho đề hoặc theo môn học vừa tải lên) */}
        {callMode === 'quiz' && (
          <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-2xl border border-purple-200 animate-in fade-in duration-150">
            <BookOpen className="w-4 h-4 text-purple-700 shrink-0" />
            <span className="text-[11px] font-black uppercase text-purple-900 shrink-0">BỘ ĐỀ:</span>
            <select
              value={selectedQuizSubject}
              onChange={(e) => handleChangeSubject(e.target.value)}
              className="bg-transparent text-xs font-black text-purple-900 focus:outline-none cursor-pointer"
            >
              <option value="all">🎲 Ngẫu nhiên toàn kho ({quizBank.length} câu)</option>
              {quizSubjects.map(sub => {
                const count = quizBank.filter(q => (q.subject || 'Tổng hợp') === sub).length;
                return (
                  <option key={sub} value={sub}>
                    📖 Môn {sub} ({count} câu)
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => {
                setEditTargetQuestion(null);
                setIsQuestionBankOpen(true);
              }}
              className="ml-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all shadow-xs"
              title="Mở kho đề để tải lên bộ đề theo môn học mới"
            >
              + Nạp Bộ Đề Môn
            </button>
          </div>
        )}

        {/* Duration selection (User request: lựa chọn 4 giây) */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-[11px] font-bold text-slate-500">Thời gian quay:</span>
          <select
            value={spinDuration}
            onChange={(e) => setSpinDuration(parseInt(e.target.value) || 4)}
            className="bg-transparent text-xs font-black text-indigo-700 focus:outline-none cursor-pointer"
          >
            <option value={3}>3 giây</option>
            <option value={4}>4 giây (Chuẩn)</option>
            <option value={5}>5 giây</option>
            <option value={6}>6 giây</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Left Stage (Film Reel Strip) & Right Stage (History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Authentic 35mm Cinema Film Reel Stage */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Main Film Projector Strip Box */}
          <div className="bg-slate-950 rounded-3xl p-4 md:p-6 shadow-2xl border-4 border-amber-900/60 relative select-none hover-zoom-card overflow-hidden">
            
            {/* Top Header Label */}
            <div className="flex items-center justify-between pb-3 px-2 text-amber-400">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="font-mono text-xs font-black uppercase tracking-widest text-amber-300">
                  CUỘN PHIM TOÀN CẢNH • KODAK VISION3 35MM
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isRolling ? `Đang trượt từ phải sang trái (${spinDuration}s)...` : 'Sẵn sàng quay (Phím cách)'}
              </span>
            </div>

            {/* Mode 3 Subject Banner Indicator */}
            {callMode === 'quiz' && (
              <div className="mb-3 py-1.5 px-3 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-between text-[11px] text-purple-200">
                <div className="flex items-center gap-1.5 font-bold flex-wrap">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>BỘ ĐỀ ĐANG DÙNG:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-black">
                    {selectedQuizSubject === 'all' ? '🎲 Ngẫu nhiên toàn kho' : `📖 Môn ${selectedQuizSubject}`}
                  </span>
                  <span className="text-purple-300">({getCandidateQuestions().length} câu hỏi sẵn sàng)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditTargetQuestion(null);
                    setIsQuestionBankOpen(true);
                  }}
                  className="text-purple-300 hover:text-white underline cursor-pointer text-[10px] font-bold shrink-0 ml-2"
                >
                  + Nạp thêm câu hỏi
                </button>
              </div>
            )}

            {/* Sprocket Perforations - Top */}
            <div className="w-full flex items-center justify-between pb-3 border-b-2 border-dashed border-amber-600/30 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-3.5 h-4.5 rounded-xs bg-slate-900 border border-amber-600/40 shadow-inner shrink-0 mx-1" />
              ))}
            </div>

            {/* The Panoramic Cinematic Film Strip Viewport (Hiển thị nhiều học sinh cùng lúc) */}
            <div 
              ref={containerRef}
              className="relative my-4 overflow-hidden h-[245px] flex items-center bg-black/70 rounded-2xl border border-slate-800 shadow-inner"
            >
              {/* Stationary Center Target Indicator Frame (Khung Ngắm Trung Tâm) */}
              <div 
                className="absolute z-30 pointer-events-none top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-between"
                style={{ width: `${FRAME_WIDTH + 8}px` }}
              >
                {/* Top Indicator Arrow */}
                <div className="pt-1 flex flex-col items-center animate-bounce">
                  <div className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] uppercase tracking-wider shadow-md">
                    CHỌN
                  </div>
                  <ArrowDown className="w-5 h-5 text-amber-400 fill-amber-400 -mt-0.5" />
                </div>

                {/* Center Glowing Reticle */}
                <div className="w-full h-[180px] rounded-2xl border-4 border-amber-400/90 shadow-[0_0_35px_rgba(251,191,36,0.7)] bg-amber-400/10 pointer-events-none" />

                {/* Bottom Indicator Arrow */}
                <div className="pb-1 flex flex-col items-center animate-bounce">
                  <ArrowUp className="w-5 h-5 text-amber-400 fill-amber-400 -mb-0.5" />
                </div>
              </div>

              {/* The Sliding Strip of Student Frames (Chuyển động từ PHẢI SANG TRÁI) */}
              <div 
                className="flex items-center absolute left-0 top-0 bottom-0 will-change-transform"
                style={{
                  transform: `translateX(${translateX}px)`,
                  transition: isRolling ? 'none' : 'transform 0.15s ease-out'
                }}
              >
                {reelStudents.map((student, idx) => {
                  return (
                    <div
                      key={`${student.id}-${idx}`}
                      style={{ 
                        width: `${FRAME_WIDTH}px`, 
                        marginRight: `${FRAME_GAP}px` 
                      }}
                      className="shrink-0 h-[215px] rounded-2xl bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 border-2 border-slate-700 p-2.5 flex flex-col items-center justify-between shadow-lg relative group"
                    >
                      {/* Frame STT & Gender badge */}
                      <div className="w-full flex items-center justify-between text-[10px] font-mono px-1">
                        <span className="text-amber-400 font-bold">#{student.stt}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                          student.gender === 'Nam' ? 'bg-blue-900 text-blue-300' : 'bg-pink-900 text-pink-300'
                        }`}>
                          {student.gender}
                        </span>
                      </div>

                      {/* Large Clear Student Avatar */}
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400/60 bg-slate-800 shadow-md my-1 relative shrink-0">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Student Name */}
                      <div className="w-full text-center px-1">
                        <div className="text-xs font-black text-white truncate leading-tight" title={student.name}>
                          {student.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {student.group || 'Tổ 1'} • 🪙 {student.points}x
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sprocket Perforations - Bottom */}
            <div className="w-full flex items-center justify-between pt-3 border-t-2 border-dashed border-amber-600/30 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-3.5 h-4.5 rounded-xs bg-slate-900 border border-amber-600/40 shadow-inner shrink-0 mx-1" />
              ))}
            </div>
          </div>

          {/* Winner Celebration Card (Hiển thị khi phim dừng) */}
          {winner && (() => {
            const currentWinner = currentClassStudents.find(s => s.id === winner.id) || winner;
            return (
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 rounded-3xl p-5 md:p-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 hover-zoom-card">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="relative shrink-0">
                    <img 
                      src={currentWinner.avatar} 
                      alt={currentWinner.name} 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-4 border-amber-400 bg-white shadow-lg"
                    />
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full shadow-xs">
                      #{currentWinner.stt}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
                      <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>CHÚC MỪNG HỌC SINH ĐƯỢC CHỌN!</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-0.5">
                      {currentWinner.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {currentWinner.gender} • {currentWinner.group || 'Tổ 1'} • Hiện có: <strong className="text-amber-800 font-black">{currentWinner.points} xu</strong>
                    </p>
                  </div>
                </div>

                {/* Mode Actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {/* Mode 2: Tặng xu */}
                  {callMode === 'coins' && (
                    <>
                      <select
                        value={rewardXu}
                        onChange={(e) => setRewardXu(parseInt(e.target.value) || 2)}
                        className="px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none shadow-2xs"
                      >
                        <option value={1}>+1 xu</option>
                        <option value={2}>+2 xu</option>
                        <option value={5}>+5 xu</option>
                        <option value={10}>+10 xu</option>
                      </select>

                      <button
                        onClick={() => handleAward(rewardXu)}
                        disabled={hasAwarded}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover-zoom-btn uppercase ${
                          hasAwarded
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                        }`}
                      >
                        {hasAwarded ? <Check className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                        <span>{hasAwarded ? 'ĐÃ TRAO XU THƯỞNG!' : `TRAO +${rewardXu} XU`}</span>
                      </button>
                    </>
                  )}

                  {/* Reset/Dismiss winner */}
                  <button
                    onClick={() => {
                      setWinner(null);
                      setHasAwarded(false);
                      setCurrentQuestion(null);
                      setOralStatus('pending');
                    }}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold hover-zoom-btn"
                    title="Đóng kết quả"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode 3: Gọi Tên + Trả Lời Câu Hỏi (Question Challenge Box) */}
              {callMode === 'quiz' && currentQuestion && (
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-amber-200 shadow-sm space-y-3 mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                        {currentQuestion.type === 'multiple_choice' ? '📝 Trắc nghiệm' : '🗣️ Tự luận / Bằng lời'}
                      </span>

                      {/* Quick subject switcher right in card */}
                      <select
                        value={selectedQuizSubject}
                        onChange={(e) => handleChangeSubject(e.target.value)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md text-xs font-black text-slate-800 cursor-pointer"
                        title="Đổi bộ đề / môn học khác"
                      >
                        <option value="all">🎲 Toàn bộ môn</option>
                        {quizSubjects.map(sub => (
                          <option key={sub} value={sub}>📖 {sub}</option>
                        ))}
                      </select>

                      {/* Points Reward Selector for this question */}
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[10px] font-black text-amber-900 uppercase">Xu thưởng:</span>
                        {[1, 2, 3, 5, 10].map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            disabled={selectedOption !== null || (currentQuestion.type === 'oral' && oralStatus !== 'pending')}
                            onClick={() => setCustomOralPoints(pts)}
                            className={`px-1.5 py-0.2 rounded text-[11px] font-black transition-colors cursor-pointer ${
                              customOralPoints === pts 
                                ? 'bg-amber-500 text-white shadow-xs' 
                                : 'text-amber-800 hover:bg-amber-100'
                            }`}
                            title={`Đặt mức thưởng ${pts} xu`}
                          >
                            +{pts}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTargetQuestion(currentQuestion);
                          setIsQuestionBankOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        title="Chỉnh sửa nội dung câu hỏi, chèn thêm ảnh cho câu hỏi và từng đáp án"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" />
                        <span>Sửa câu hỏi & đáp án</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePickAnotherQuestion}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer transition-colors"
                      >
                        Đổi câu khác 🔄
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTargetQuestion(null);
                          setIsQuestionBankOpen(true);
                        }}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer"
                      >
                        Kho đề
                      </button>
                    </div>
                  </div>

                  {/* Explicit Rule Banner (User requirement) */}
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                    currentQuestion.type === 'multiple_choice'
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                      : 'bg-purple-50/70 border-purple-200 text-purple-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {currentQuestion.type === 'multiple_choice' ? '🎯' : '🗣️'}
                      </span>
                      <span>
                        {currentQuestion.type === 'multiple_choice' ? (
                          <>
                            <strong>Luật trắc nghiệm:</strong> Học sinh chọn đáp án <strong>ĐÚNG</strong> được tự động cộng <strong>+{customOralPoints} xu</strong> • Trả lời <strong>SAI</strong> không được cộng xu (0 xu).
                          </>
                        ) : (
                          <>
                            <strong>Luật tự luận:</strong> Học sinh trả lời trực tiếp trước lớp • Thầy/cô nghe và bấm <strong>xác nhận cộng +{customOralPoints} xu</strong> nếu học sinh trả lời đúng.
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm md:text-base font-black text-slate-900 leading-snug">
                    {currentQuestion.questionText}
                  </div>

                  {/* Question Image if exists */}
                  {currentQuestion.image && (
                    <div className="pt-1">
                      <div className="relative inline-block group">
                        <img 
                          src={currentQuestion.image} 
                          alt="Ảnh minh họa câu hỏi" 
                          onClick={() => setZoomedImage({ url: currentQuestion.image!, title: 'Ảnh minh họa câu hỏi' })}
                          className="max-h-56 rounded-xl border border-slate-200 object-contain bg-slate-50 shadow-2xs cursor-zoom-in hover:opacity-95 transition-opacity"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                          🔍 Phóng to
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice Options with Individual Option Images (User requirement: chèn hình ảnh cho từng đáp án) */}
                  {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentQuestion.options.map((opt, idx) => {
                          const isSelected = selectedOption === idx;
                          const isCorrect = currentQuestion.correctOptionIndex === idx;
                          const optImage = currentQuestion.optionImages?.[idx];
                          let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/20';

                          if (selectedOption !== null) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-400/40';
                            } else if (isSelected) {
                              btnStyle = 'bg-rose-50 border-rose-400 text-rose-950';
                            }
                          }

                          return (
                            <div
                              key={idx}
                              role="button"
                              tabIndex={selectedOption !== null ? -1 : 0}
                              onClick={() => {
                                if (selectedOption === null) handleSelectOption(idx);
                              }}
                              onKeyDown={(e) => {
                                if (selectedOption === null && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  handleSelectOption(idx);
                                }
                              }}
                              className={`p-3 rounded-2xl text-xs flex flex-col justify-between border text-left transition-all cursor-pointer shadow-2xs select-none ${btnStyle}`}
                            >
                              <div className="w-full flex items-start gap-2.5">
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  selectedOption !== null && isCorrect 
                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                    : selectedOption !== null && isSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="flex-1 font-semibold text-xs md:text-sm mt-0.5 leading-snug">{opt}</span>
                                {selectedOption !== null && isCorrect && (
                                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                                )}
                              </div>

                              {/* Option Image if available (User requirement: chèn hình ảnh cho từng đáp án) */}
                              {optImage && (
                                <div className="mt-2.5 w-full bg-white rounded-xl p-2 border border-slate-200/90 flex flex-col items-center justify-center overflow-hidden relative group/img">
                                  <img 
                                    src={optImage} 
                                    alt={`Ảnh đáp án ${String.fromCharCode(65 + idx)}`} 
                                    className="max-h-40 max-w-full rounded-lg object-contain cursor-zoom-in"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomedImage({ 
                                        url: optImage, 
                                        title: `Ảnh đáp án ${String.fromCharCode(65 + idx)}: ${opt}` 
                                      });
                                    }}
                                  />
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomedImage({ 
                                        url: optImage, 
                                        title: `Ảnh đáp án ${String.fromCharCode(65 + idx)}: ${opt}` 
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        setZoomedImage({ 
                                          url: optImage, 
                                          title: `Ảnh đáp án ${String.fromCharCode(65 + idx)}: ${opt}` 
                                        });
                                      }
                                    }}
                                    className="mt-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-indigo-50 px-2 py-0.5 rounded border border-slate-200"
                                    title="Xem phóng to ảnh đáp án này"
                                  >
                                    <span>🔍 Xem ảnh lớn</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* TRẮC NGHIỆM: ĐÚNG ĐƯỢC CỘNG XU, SAI KHÔNG ĐƯỢC CỘNG XU (User Requirement) */}
                      {selectedOption !== null && (
                        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                          {isAnswerCorrect ? (
                            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                                  <Check className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-xs font-black text-emerald-950 uppercase">
                                    🎉 CHÍNH XÁC! {currentWinner.name} ĐÃ ĐƯỢC CỘNG +{customOralPoints || currentQuestion.pointsReward || 2} XU!
                                  </div>
                                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                    Đáp án đúng: <strong>{String.fromCharCode(65 + (currentQuestion.correctOptionIndex || 0))}</strong>. Tổng điểm xu hiện tại: <strong className="text-emerald-950 font-black">{currentWinner.points} xu</strong>
                                  </p>
                                </div>
                              </div>
                              <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black shrink-0 shadow-xs uppercase">
                                +{customOralPoints || currentQuestion.pointsReward || 2} Xu 🪙
                              </span>
                            </div>
                          ) : (
                            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm text-sm">
                                  ✕
                                </div>
                                <div>
                                  <div className="text-xs font-black text-rose-950 uppercase">
                                    ❌ RẤT TIẾC, CHƯA CHÍNH XÁC! KHÔNG ĐƯỢC CỘNG XU (0 XU)
                                  </div>
                                  <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                                    Học sinh đã chọn: {String.fromCharCode(65 + selectedOption)}. Đáp án đúng là <strong>{String.fromCharCode(65 + (currentQuestion.correctOptionIndex || 0))}</strong>. Lượt này không cộng xu.
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={handleRetryMultipleChoice}
                                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Cho làm lại 🔄
                                </button>
                                <button
                                  type="button"
                                  onClick={handlePickAnotherQuestion}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                                >
                                  Đổi câu khác
                                </button>
                                <button
                                  type="button"
                                  disabled={hasAwarded}
                                  onClick={() => handleAward(1, `Thưởng động viên câu trắc nghiệm môn ${currentQuestion.subject || 'Tổng hợp'}`)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    hasAwarded 
                                      ? 'bg-slate-200 text-slate-500' 
                                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                                  }`}
                                  title="Thầy cô có thể tặng 1 xu động viên nếu học sinh đã cố gắng"
                                >
                                  {hasAwarded ? 'Đã tặng +1 xu động viên' : 'Động viên (+1 xu) 🪙'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation and Answer Image for Multiple Choice */}
                      {selectedOption !== null && (currentQuestion.teacherAnswerKey || currentQuestion.answerImage) && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1.5 animate-in fade-in duration-150">
                          {currentQuestion.teacherAnswerKey && (
                            <div>
                              <strong className="text-slate-900">Giải thích chi tiết:</strong> {currentQuestion.teacherAnswerKey}
                            </div>
                          )}
                          {currentQuestion.answerImage && (
                            <div className="pt-1">
                              <span className="text-[10px] font-black uppercase text-slate-600 block mb-1">Ảnh minh họa lời giải:</span>
                              <img
                                src={currentQuestion.answerImage}
                                alt="Ảnh minh họa đáp án"
                                onClick={() => setZoomedImage({ url: currentQuestion.answerImage!, title: 'Ảnh minh họa lời giải chi tiết' })}
                                className="max-h-48 rounded-xl border border-slate-300 object-contain bg-white shadow-2xs cursor-zoom-in"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CÂU HỎI TỰ LUẬN / BẰNG LỜI: GIÁO VIÊN XÁC NHẬN CỘNG XU NẾU TRẢ LỜI ĐÚNG (User Requirement) */}
                  {currentQuestion.type === 'oral' && (
                    <div className="space-y-3 pt-1">
                      {/* Teacher answer key toggle & point adjuster */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTeacherKey(!showTeacherKey)}
                          className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showTeacherKey ? 'Ẩn gợi ý đáp án' : '👁️ Xem đáp án & gợi ý chấm của giáo viên'}</span>
                        </button>

                        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Xu chấm đúng:</span>
                          {[1, 2, 3, 5].map((pts) => (
                            <button
                              key={pts}
                              type="button"
                              disabled={oralStatus !== 'pending'}
                              onClick={() => setCustomOralPoints(pts)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-black transition-colors ${
                                customOralPoints === pts ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              +{pts}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Teacher Answer Key Box */}
                      {showTeacherKey && (
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium space-y-2 animate-in fade-in duration-150">
                          {currentQuestion.teacherAnswerKey && (
                            <div>
                              <strong>Đáp án / Gợi ý chấm giáo viên:</strong> {currentQuestion.teacherAnswerKey}
                            </div>
                          )}
                          {currentQuestion.answerImage && (
                            <div className="pt-1">
                              <span className="text-[10px] font-black uppercase text-amber-900 block mb-1">Ảnh minh họa đáp án của giáo viên:</span>
                              <img
                                src={currentQuestion.answerImage}
                                alt="Ảnh đáp án giáo viên"
                                onClick={() => setZoomedImage({ url: currentQuestion.answerImage!, title: 'Ảnh đáp án giáo viên' })}
                                className="max-h-44 rounded-xl border border-amber-300 object-contain bg-white shadow-2xs cursor-zoom-in"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Giáo viên xác nhận kết quả tự luận */}
                      {oralStatus === 'pending' && (
                        <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-purple-950">
                            <strong className="block font-black uppercase">Học sinh đang trả lời trước lớp:</strong>
                            <span className="text-slate-600">Thầy/cô lắng nghe và chọn xác nhận kết quả để cộng xu:</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Nút xác nhận trả lời ĐÚNG */}
                            <button
                              type="button"
                              onClick={() => handleConfirmOralCorrect(customOralPoints)}
                              className="px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover-zoom-btn uppercase"
                            >
                              <Check className="w-4 h-4" />
                              <span>XÁC NHẬN TRẢ LỜI ĐÚNG (+{customOralPoints} XU)</span>
                            </button>

                            {/* Nút xác nhận trả lời CHƯA ĐÚNG */}
                            <button
                              type="button"
                              onClick={handleConfirmOralIncorrect}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>✕ Chưa đúng (0 xu)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Kết quả Tự luận: ĐÚNG */}
                      {oralStatus === 'correct' && (
                        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                              <Check className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-emerald-950 uppercase">
                                🎉 GIÁO VIÊN ĐÃ XÁC NHẬN: TRẢ LỜI ĐÚNG VÀ CỘNG +{customOralPoints} XU!
                              </div>
                              <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                                Đã cộng vào tài khoản của <strong>{currentWinner.name}</strong>. Tổng điểm xu hiện có: <strong className="text-emerald-950 font-black">{currentWinner.points} xu</strong>
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black shrink-0 shadow-xs uppercase">
                            +{customOralPoints} Xu 🪙
                          </span>
                        </div>
                      )}

                      {/* Kết quả Tự luận: CHƯA ĐÚNG */}
                      {oralStatus === 'incorrect' && (
                        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm text-sm">
                              ✕
                            </div>
                            <div>
                              <div className="text-xs font-black text-rose-950 uppercase">
                                ❌ GIÁO VIÊN XÁC NHẬN: CHƯA ĐẠT YÊU CẦU – KHÔNG CỘNG XU
                              </div>
                              <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                                Học sinh chưa hoàn thành đúng câu trả lời. Lượt này không cộng xu.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleResetOralEvaluation}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              Chấm lại 🔄
                            </button>
                            <button
                              type="button"
                              onClick={handlePickAnotherQuestion}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                            >
                              Đổi câu khác
                            </button>
                            <button
                              type="button"
                              disabled={hasAwarded}
                              onClick={() => handleAward(1, `Thưởng động viên trả lời câu tự luận môn ${currentQuestion.subject || 'Tổng hợp'}`)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                hasAwarded 
                                  ? 'bg-slate-200 text-slate-500' 
                                  : 'bg-amber-500 hover:bg-amber-600 text-white'
                              }`}
                              title="Thầy cô có thể tặng 1 xu động viên nếu học sinh đã nỗ lực trả lời"
                            >
                              {hasAwarded ? 'Đã tặng +1 xu động viên' : 'Động viên (+1 xu) 🪙'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
          })()}

          {/* Big Action Trigger Button: "BẤM QUAY CUỘN PHIM" */}
          <button
            onClick={startFilmReel}
            disabled={isRolling || pool.length === 0}
            className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-xs sm:text-base rounded-2xl sm:rounded-3xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all hover-zoom-btn disabled:opacity-50 uppercase cursor-pointer"
          >
            <Play className={`w-4 h-4 sm:w-5 sm:h-5 fill-white shrink-0 ${isRolling ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isRolling ? `🎬 CUỘN PHIM ĐANG TRƯỢT TỪ PHẢI SANG TRÁI (${spinDuration}S)...` : `🎬 BẤM QUAY CUỘN PHIM (${spinDuration} GIÂY • PHÍM CÁCH)`}
            </span>
            <span className="sm:hidden">
              {isRolling ? `🎬 ĐANG QUAY (${spinDuration}S)...` : `🎬 BẤM QUAY CUỘN PHIM (${spinDuration}S)`}
            </span>
          </button>

          {/* Controls & Exclude Checkbox */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover-zoom-interactive">
              <input
                type="checkbox"
                checked={autoExclude}
                onChange={(e) => setAutoExclude(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tự động loại học sinh sau khi gọi (để không trùng lặp)</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsQuestionBankOpen(true)}
                className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kho đề thi ({quizBank.length} câu)</span>
              </button>

              <span className="text-xs text-slate-500 font-semibold">
                Còn lại trong cuộn phim: <strong className="text-indigo-600 font-black">{pool.length}</strong> / {currentClassStudents.length} học sinh
              </span>
            </div>
          </div>

          {/* Excluded list pills */}
          {excludedStudents.length > 0 && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-2.5 hover-zoom-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  ĐÃ ĐƯỢC GỌI ({excludedStudents.length} EM) – BẤM TÊN ĐỂ ĐƯA LẠI VÀO CUỘN PHIM:
                </span>
                <button
                  onClick={handleRestoreAll}
                  className="text-xs font-black text-indigo-600 hover:underline hover-zoom-interactive uppercase"
                >
                  ĐƯA TẤT CẢ VÀO LẠI
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {excludedStudents.map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleRestoreStudent(st.id)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors hover-zoom-interactive"
                    title="Bấm để đưa học sinh này vào lại cuộn phim"
                  >
                    + {st.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: History of Called Students */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4 hover-zoom-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Lịch Sử Gọi Tên ({history.length})</span>
              </h3>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover-zoom-interactive cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa lịch sử</span>
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="space-y-2.5 mt-3 max-h-[460px] overflow-y-auto pr-1">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors hover-zoom-interactive"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={h.avatar}
                        alt={h.name}
                        className="w-9 h-9 rounded-xl object-cover bg-white ring-1 ring-slate-200 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-black text-slate-900 truncate">{h.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{h.time}</div>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <Film className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Chưa có lượt quay nào</p>
                <p className="text-[10px] text-slate-400">Bấm nút &quot;Quay Cuộn Phim&quot; để bắt đầu</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUESTION BANK MODAL */}
      <QuestionBankModal
        isOpen={isQuestionBankOpen}
        initialEditQuestion={editTargetQuestion}
        onClose={() => {
          setIsQuestionBankOpen(false);
          setEditTargetQuestion(null);
        }}
        questions={quizBank}
        onSaveQuestions={(updated, latestSubject) => {
          updateQuizBank(updated);
          saveQuizBank(updated);
          if (latestSubject) {
            setSelectedQuizSubject(latestSubject);
            const subQuestions = updated.filter(q => (q.subject || 'Tổng hợp') === latestSubject);
            if (subQuestions.length > 0) {
              const q = subQuestions[Math.floor(Math.random() * subQuestions.length)];
              setCurrentQuestion(q);
              setSelectedOption(null);
              setShowTeacherKey(false);
              setIsAnswerCorrect(null);
              setHasAwarded(false);
            }
          } else if (currentQuestion) {
            const updatedCur = updated.find(q => q.id === currentQuestion.id);
            if (updatedCur) {
              setCurrentQuestion(updatedCur);
            }
          }
        }}
      />

      {/* FULL-SCREEN ZOOMED IMAGE LIGHTBOX MODAL */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-zoom-out select-none animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-700"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-xs font-black text-slate-800 uppercase truncate pr-4">
                {zoomedImage.title}
              </h4>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img 
                src={zoomedImage.url} 
                alt={zoomedImage.title}
                className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
