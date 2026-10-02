import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student } from '../../types';
import { 
  Sparkles, Film, Trophy, Camera, LayoutGrid, 
  RotateCcw, Play, Check, Award, Volume2, 
  VolumeX, Star, Users, ArrowRight, ShieldAlert,
  ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import { LuckyWheelView } from './LuckyWheelView';
import { FilmReelView } from './FilmReelView';
import { RocketMissionGame } from './picker/RocketMissionGame';
import { MysteryGiftBoxGame } from './picker/MysteryGiftBoxGame';
import { DuckRaceGame } from './picker/DuckRaceGame';
import { playTickSound, playFanfareSound, playCoinSound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export type PickerGameMode = 'wheel' | 'reel' | 'rocket' | 'mystery_box' | 'duck_race';

interface RandomStudentPickerViewProps {
  initialGame?: PickerGameMode;
}

export const RandomStudentPickerView: React.FC<RandomStudentPickerViewProps> = ({ 
  initialGame = 'wheel' 
}) => {
  const { currentClassStudents, awardPoints, classes, activeClassId } = useClassroom();
  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];
  const [activeGame, setActiveGame] = useState<PickerGameMode>(
    (initialGame as string) === 'lucky_lens' || (initialGame as string) === 'photo_cards' ? 'reel' : initialGame
  );

  useEffect(() => {
    if (initialGame) {
      setActiveGame(
        (initialGame as string) === 'lucky_lens' || (initialGame as string) === 'photo_cards' ? 'reel' : initialGame
      );
    }
  }, [initialGame]);


  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Main Top Header & Mode Navigation */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                GỌI TÊN HỌC SINH
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase">
                LỚP <span className="text-indigo-600 font-black">{activeClass?.name || '4A1'}</span> • SĨ SỐ: {currentClassStudents.length} HỌC SINH • 5 TRÒ CHƠI GỌI TÊN HÀO HỨNG!
              </p>
            </div>
          </div>
        </div>

        {/* 5 Tab Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          {/* Tab 1: Vòng quay */}
          <button
            onClick={() => setActiveGame('wheel')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'wheel'
                ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎡</span>
            <span>VÒNG QUAY</span>
          </button>

          {/* Tab 2: Cuộn phim */}
          <button
            onClick={() => setActiveGame('reel')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'reel'
                ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎬</span>
            <span>CUỘN PHIM</span>
          </button>

          {/* Tab 3: Tàu vũ trụ (Mới) */}
          <button
            onClick={() => setActiveGame('rocket')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'rocket'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚀</span>
            <span>TÀU VŨ TRỤ</span>
            <span className="px-1.5 py-0.2 bg-cyan-400 text-indigo-950 rounded-md text-[9px] font-black">MỚI</span>
          </button>

          {/* Tab 4: Hộp quà bí mật (Mới) */}
          <button
            onClick={() => setActiveGame('mystery_box')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'mystery_box'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎁</span>
            <span>HỘP QUÀ</span>
            <span className="px-1.5 py-0.2 bg-amber-400 text-rose-950 rounded-md text-[9px] font-black">MỚI</span>
          </button>

          {/* Tab 5: Đua vịt (trải đều 2 cột trên mobile) */}
          <button
            onClick={() => setActiveGame('duck_race')}
            className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'duck_race'
                ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🦆</span>
            <span>ĐUA VỊT MAY MẮN</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. VÒNG QUAY MAY MẮN (LUCKY WHEEL)                                    */}
      {/* ===================================================================== */}
      {activeGame === 'wheel' && (
        <LuckyWheelView />
      )}

      {/* ===================================================================== */}
      {/* 2. CUỘN PHIM GỌI TÊN (FILM REEL)                                     */}
      {/* ===================================================================== */}
      {activeGame === 'reel' && (
        <FilmReelView />
      )}

      {/* ===================================================================== */}
      {/* 3. TÀU VŨ TRỤ KHÁM PHÁ (ROCKET LAUNCH)                               */}
      {/* ===================================================================== */}
      {activeGame === 'rocket' && (
        <RocketMissionGame />
      )}

      {/* ===================================================================== */}
      {/* 4. HỘP QUÀ BÍ MẬT (MYSTERY GIFT BOX)                                 */}
      {/* ===================================================================== */}
      {activeGame === 'mystery_box' && (
        <MysteryGiftBoxGame />
      )}

      {/* ===================================================================== */}
      {/* 5. ĐUA VỊT MAY MẮN (DUCK RACE 3D)                                     */}
      {/* ===================================================================== */}
      {activeGame === 'duck_race' && (
        <DuckRaceGame />
      )}

    </div>
  );
};
