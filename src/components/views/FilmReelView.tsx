import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student } from '../../types';
import { Film, Play, Award, RotateCcw, Sparkles, Trash2, Volume2, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { playTickSound, playFanfareSound, playCoinSound } from '../../utils/audio';
import confetti from 'canvas-confetti';

const FRAME_WIDTH = 150; // Width of each film frame in pixels
const FRAME_GAP = 16; // Gap between frames
const TOTAL_FRAME_SPACE = FRAME_WIDTH + FRAME_GAP; // 166px

export const FilmReelView: React.FC = () => {
  const { currentClassStudents, awardPoints } = useClassroom();
  
  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<Student | null>(null);
  const [rewardXu, setRewardXu] = useState(2);
  const [hasAwarded, setHasAwarded] = useState(false);

  // Settings & History
  const [autoExclude, setAutoExclude] = useState(true);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ name: string; avatar: string; time: string; points: number }>>([]);

  // Animated sliding strip state
  const [translateX, setTranslateX] = useState<number>(0);
  const [reelStudents, setReelStudents] = useState<Student[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickFrameRef = useRef<number>(-1);

  // Eligible pool of students
  const activeStudents = currentClassStudents.filter(s => !excludedStudentIds.includes(s.id));
  const pool = activeStudents.length > 0 ? activeStudents : currentClassStudents;

  // Initialize reel with repeated students for initial display
  useEffect(() => {
    if (pool.length > 0 && reelStudents.length === 0) {
      // Repeat pool to make initial strip
      const initial: Student[] = [];
      while (initial.length < 30) {
        initial.push(...pool);
      }
      setReelStudents(initial.slice(0, 40));
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
        e.preventDefault();
        startFilmReel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRolling, pool]);

  const startFilmReel = () => {
    if (isRolling || pool.length === 0) return;

    setIsRolling(true);
    setWinner(null);
    setHasAwarded(false);

    // Pick a random winner from the pool
    const selectedWinner = pool[Math.floor(Math.random() * pool.length)];

    // Build a sequence of 60 frames, placing the winner at index 50
    const sequenceLength = 60;
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

    // Calculate exact target offset so that targetIndex lands exactly at center of viewport
    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 700;
    const centerPoint = containerWidth / 2;
    // The center of frame i is: i * TOTAL_FRAME_SPACE + (FRAME_WIDTH / 2)
    // We want: targetTranslateX + (targetIndex * TOTAL_FRAME_SPACE + FRAME_WIDTH / 2) = centerPoint
    const finalOffset = centerPoint - (targetIndex * TOTAL_FRAME_SPACE + FRAME_WIDTH / 2);

    // Start sliding from current position (or 0) to finalOffset (sliding right-to-left)
    const startOffset = centerPoint - (FRAME_WIDTH / 2); // Frame 0 centered initially
    setTranslateX(startOffset);

    const startTime = performance.now();
    const duration = 5200; // 5.2 seconds of thrilling roll
    lastTickFrameRef.current = -1;

    // Smooth cubic bezier easing function: fast start, gradual silky stop
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3.5);
    };

    const animateRoll = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentX = startOffset + (finalOffset - startOffset) * easedProgress;
      setTranslateX(currentX);

      // Play tick sound when crossing each frame boundary
      const currentPassedIndex = Math.floor(Math.abs(currentX - startOffset) / TOTAL_FRAME_SPACE);
      if (currentPassedIndex !== lastTickFrameRef.current) {
        lastTickFrameRef.current = currentPassedIndex;
        // Pitch variation for authentic arcade feel
        playTickSound(650 + (currentPassedIndex % 6) * 45);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateRoll);
      } else {
        // Animation finished!
        setTranslateX(finalOffset);
        setIsRolling(false);
        setWinner(selectedWinner);
        playFanfareSound();
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });

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
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateRoll);
  };

  const handleAward = () => {
    if (!winner || hasAwarded) return;
    awardPoints([winner.id], rewardXu, 'Thưởng gọi tên qua Cuộn Phim', 'Ghi chung');
    playCoinSound();
    setHasAwarded(true);
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleRestoreStudent = (id: string) => {
    setExcludedStudentIds(prev => prev.filter(x => x !== id));
  };

  const handleRestoreAll = () => {
    setExcludedStudentIds([]);
  };

  const excludedStudents = currentClassStudents.filter(s => excludedStudentIds.includes(s.id));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
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
                  CUỘN PHIM GỌI TÊN ĐIỆN ẢNH 35MM
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isRolling ? 'Đang trượt từ phải sang trái...' : 'Sẵn sàng quay (Phím cách)'}
              </span>
            </div>

            {/* Sprocket Perforations - Top */}
            <div className="w-full flex items-center justify-between pb-3 border-b-2 border-dashed border-amber-600/30 overflow-hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-4 h-5 rounded-xs bg-slate-900 border border-slate-700 shadow-inner shrink-0 mx-1" />
              ))}
            </div>

            {/* The Cinematic Film Strip Viewport */}
            <div 
              ref={containerRef}
              className="relative my-4 overflow-hidden h-[240px] flex items-center bg-black/60 rounded-2xl border border-slate-800 shadow-inner"
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
                <div className="w-full h-[180px] rounded-2xl border-4 border-amber-400/90 shadow-[0_0_30px_rgba(251,191,36,0.6)] bg-amber-400/10 pointer-events-none" />

                {/* Bottom Indicator Arrow */}
                <div className="pb-1 flex flex-col items-center animate-bounce">
                  <ArrowUp className="w-5 h-5 text-amber-400 fill-amber-400 -mb-0.5" />
                </div>
              </div>

              {/* The Sliding Strip of Student Frames (Trượt từ phải qua trái) */}
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
                      className="shrink-0 h-[210px] rounded-2xl bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 border-2 border-slate-700 p-2.5 flex flex-col items-center justify-between shadow-lg relative group"
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
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-4 h-5 rounded-xs bg-slate-900 border border-slate-700 shadow-inner shrink-0 mx-1" />
              ))}
            </div>
          </div>

          {/* Winner Celebration Card (Hiển thị khi phim dừng) */}
          {winner && (
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 rounded-3xl p-5 md:p-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 hover-zoom-card">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="relative shrink-0">
                    <img 
                      src={winner.avatar} 
                      alt={winner.name} 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-4 border-amber-400 bg-white shadow-lg"
                    />
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full shadow-xs">
                      #{winner.stt}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
                      <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>CHÚC MỪNG HỌC SINH ĐƯỢC CHỌN!</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-0.5">
                      {winner.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {winner.gender} • {winner.group || 'Tổ 1'} • Hiện có: <strong className="text-amber-800 font-black">{winner.points} xu</strong>
                    </p>
                  </div>
                </div>

                {/* Reward xu action */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
                    onClick={handleAward}
                    disabled={hasAwarded}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover-zoom-btn ${
                      hasAwarded
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                    }`}
                  >
                    {hasAwarded ? <Check className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                    <span>{hasAwarded ? 'Đã trao xu thưởng!' : `Trao +${rewardXu} Xu`}</span>
                  </button>

                  <button
                    onClick={() => {
                      setWinner(null);
                      setHasAwarded(false);
                    }}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold hover-zoom-btn"
                    title="Đóng kết quả"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Big Action Trigger Button: "BẤM QUAY CUỘN PHIM" */}
          <button
            onClick={startFilmReel}
            disabled={isRolling || pool.length === 0}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm md:text-base rounded-3xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2.5 transition-all hover-zoom-btn disabled:opacity-50"
          >
            <Play className={`w-5 h-5 fill-white ${isRolling ? 'animate-spin' : ''}`} />
            <span>{isRolling ? '🎬 Cuộn phim đang trượt từ phải sang trái...' : '🎬 Bấm Quay Cuộn Phim (Phím Cách)'}</span>
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

            <span className="text-xs text-slate-500 font-semibold">
              Còn lại trong cuộn phim: <strong className="text-indigo-600 font-black">{pool.length}</strong> / {currentClassStudents.length} học sinh
            </span>
          </div>

          {/* Excluded list pills */}
          {excludedStudents.length > 0 && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-2.5 hover-zoom-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Đã được gọi ({excludedStudents.length} em) – bấm tên để đưa lại vào cuộn phim:
                </span>
                <button
                  onClick={handleRestoreAll}
                  className="text-xs font-bold text-indigo-600 hover:underline hover-zoom-interactive"
                >
                  Đưa tất cả vào lại
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
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover-zoom-interactive"
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
                <p className="text-[10px] text-slate-400">Bấm nút "Quay Cuộn Phim" để bắt đầu</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
