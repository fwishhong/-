import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicroGameProps } from '../types';
import { Shuffle, Box, AlertTriangle, Activity, Brain } from 'lucide-react';

// --- Helper for Random ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomColor = () => ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][randomInt(0, 4)];

// ------------------------------------------------------------------
// GAME 1: REFLEX (Reaction)
// Wait for the signal, then tap!
// ------------------------------------------------------------------
export const ReflexGame: React.FC<MicroGameProps> = ({ isActive, onComplete }) => {
  const [status, setStatus] = useState<'WAIT' | 'GO'>('WAIT');
  const [bg, setBg] = useState('bg-gray-900');
  const hasClicked = useRef(false);

  useEffect(() => {
    if (!isActive) return;
    const delay = randomInt(1000, 2500);
    const timeout = setTimeout(() => {
      setStatus('GO');
      setBg('bg-green-500');
    }, delay);
    return () => clearTimeout(timeout);
  }, [isActive]);

  const handleClick = () => {
    if (hasClicked.current) return;
    hasClicked.current = true;

    if (status === 'WAIT') {
      onComplete(false); // Too early
    } else {
      onComplete(true); // Success
    }
  };

  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center transition-colors duration-100 cursor-pointer ${bg}`}
      onPointerDown={handleClick}
    >
      <Activity size={64} className="text-white mb-4 animate-bounce" />
      <h1 className="text-6xl font-black text-white tracking-tighter uppercase select-none">
        {status === 'WAIT' ? 'WAIT...' : 'TAP NOW!'}
      </h1>
      <p className="text-white/50 mt-4 text-lg">Tap when green</p>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 2: QUICK MATH (Logic)
// True or False equations
// ------------------------------------------------------------------
export const MathGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [equation, setEquation] = useState({ text: '', isCorrect: false });

  useEffect(() => {
    const a = randomInt(2, 9 + difficulty);
    const b = randomInt(2, 9 + difficulty);
    const realSum = a + b;
    const isCorrect = Math.random() > 0.5;
    const displaySum = isCorrect ? realSum : realSum + (Math.random() > 0.5 ? 1 : -1) * randomInt(1, 3);
    
    setEquation({
      text: `${a} + ${b} = ${displaySum}`,
      isCorrect
    });
  }, [difficulty]);

  const handleAnswer = (choice: boolean) => {
    onComplete(choice === equation.isCorrect);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-600 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl mb-8 transform rotate-1">
        <h2 className="text-6xl font-bold text-indigo-900">{equation.text}</h2>
      </div>
      <div className="flex gap-4 w-full max-w-md">
        <button 
          onClick={() => handleAnswer(true)}
          className="flex-1 bg-green-500 hover:bg-green-400 active:scale-95 transition-transform h-24 rounded-xl text-4xl font-black text-white shadow-lg border-b-4 border-green-700"
        >
          TRUE
        </button>
        <button 
          onClick={() => handleAnswer(false)}
          className="flex-1 bg-red-500 hover:bg-red-400 active:scale-95 transition-transform h-24 rounded-xl text-4xl font-black text-white shadow-lg border-b-4 border-red-700"
        >
          FALSE
        </button>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 3: STROOP TEST (Judgment)
// Pick the COLOR of the text, not the word
// ------------------------------------------------------------------
export const StroopGame: React.FC<MicroGameProps> = ({ onComplete }) => {
  const colors = [
    { name: 'RED', hex: 'text-red-500', bg: 'bg-red-500' },
    { name: 'BLUE', hex: 'text-blue-500', bg: 'bg-blue-500' },
    { name: 'GREEN', hex: 'text-green-500', bg: 'bg-green-500' },
    { name: 'YELLOW', hex: 'text-yellow-400', bg: 'bg-yellow-400' },
  ];

  const [target, setTarget] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);

  useEffect(() => {
    const wordIdx = randomInt(0, 3);
    const colorIdx = randomInt(0, 3); // Can be same or different
    
    // The correct answer corresponds to the COLOR (colorIdx)
    const correctColor = colors[colorIdx];
    
    // Generate options (one correct, one wrong)
    let wrongIdx = randomInt(0, 3);
    while (wrongIdx === colorIdx) wrongIdx = randomInt(0, 3);
    
    const opts = Math.random() > 0.5 
      ? [correctColor, colors[wrongIdx]] 
      : [colors[wrongIdx], correctColor];

    setTarget({
      word: colors[wordIdx].name,
      colorClass: colors[colorIdx].hex,
      answerName: correctColor.name
    });
    setOptions(opts);
  }, []);

  if (!target) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100">
      <h3 className="text-xl font-bold text-gray-400 mb-4 uppercase tracking-widest">Match the Ink Color</h3>
      <h1 className={`text-8xl font-black mb-12 ${target.colorClass} drop-shadow-sm`}>
        {target.word}
      </h1>
      <div className="flex gap-6">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onComplete(opt.name === target.answerName)}
            className={`w-32 h-32 rounded-full shadow-xl border-4 border-white transform transition-transform active:scale-90 ${opt.bg}`}
          />
        ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 4: SPINNING CUBE (3D / Observation)
// Stop the cube when the diamond faces front
// ------------------------------------------------------------------
export const CubeGame: React.FC<MicroGameProps> = ({ onComplete, isActive }) => {
  const [rotation, setRotation] = useState(0);
  const requestRef = useRef<number>();
  const isStopped = useRef(false);

  const animate = useCallback(() => {
    if (isStopped.current) return;
    setRotation(r => (r + 4) % 360); // Speed 
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, animate]);

  const handleStop = () => {
    if (isStopped.current) return;
    isStopped.current = true;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    // Logic: Success if rotation is within a range where the front face is visible
    // Front face is visible around 0 (360)
    // Let's say tolerance is +/- 40 degrees
    // Normalized rotation 0-360.
    // Front face is at 0. Back at 180. Right -90 (270). Left 90.
    // Since we rotate Y axis.
    
    const normalized = rotation % 360;
    // We want the 'DIAMOND' face which we will place at 0 deg.
    const isSuccess = (normalized >= 0 && normalized <= 45) || (normalized >= 315 && normalized <= 360);
    
    onComplete(isSuccess);
  };

  return (
    <div 
      className="w-full h-full bg-purple-900 flex flex-col items-center justify-center overflow-hidden"
      onPointerDown={handleStop}
    >
      <div className="scene w-48 h-48">
        <div 
          className="cube" 
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          {/* Front - The Target */}
          <div className="cube-face bg-yellow-400 text-black text-6xl translate-z-[6rem] border-4 border-black" style={{ transform: 'translateZ(6rem)' }}>
             <Box size={64} />
          </div>
          {/* Back */}
          <div className="cube-face bg-red-500 text-white translate-z-[-6rem]" style={{ transform: 'rotateY(180deg) translateZ(6rem)' }}>
            <AlertTriangle size={64} />
          </div>
          {/* Right */}
          <div className="cube-face bg-blue-500 text-white" style={{ transform: 'rotateY(90deg) translateZ(6rem)' }}>
             <Shuffle size={64} />
          </div>
          {/* Left */}
          <div className="cube-face bg-green-500 text-white" style={{ transform: 'rotateY(-90deg) translateZ(6rem)' }}>
            <Brain size={64} />
          </div>
        </div>
      </div>
      <p className="text-yellow-300 font-bold mt-12 text-2xl animate-pulse pointer-events-none">
        TAP ON BOX!
      </p>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 5: MEMORY GRID (Memory)
// Remember the blue pattern
// ------------------------------------------------------------------
export const MemoryGame: React.FC<MicroGameProps> = ({ onComplete, isActive }) => {
  const [grid, setGrid] = useState<boolean[]>(Array(9).fill(false));
  const [phase, setPhase] = useState<'MEMORIZE' | 'RECALL'>('MEMORIZE');
  const [userSelection, setUserSelection] = useState<boolean[]>(Array(9).fill(false));

  // Init grid
  useEffect(() => {
    const newGrid = Array(9).fill(false);
    const count = 3; // Always 3 items to remember
    let placed = 0;
    while (placed < count) {
      const idx = randomInt(0, 8);
      if (!newGrid[idx]) {
        newGrid[idx] = true;
        placed++;
      }
    }
    setGrid(newGrid);

    // Show for 1 second then hide
    const timer = setTimeout(() => {
      setPhase('RECALL');
    }, 1000); // Fast!

    return () => clearTimeout(timer);
  }, []);

  const handleTileClick = (index: number) => {
    if (phase !== 'RECALL') return;

    const newSelection = [...userSelection];
    newSelection[index] = true;
    setUserSelection(newSelection);

    // Check if wrong click
    if (!grid[index]) {
      onComplete(false);
      return;
    }

    // Check if all correct found
    const correctFound = newSelection.filter((s, i) => s && grid[i]).length;
    const totalCorrect = grid.filter(Boolean).length;
    
    if (correctFound === totalCorrect) {
      onComplete(true);
    }
  };

  return (
    <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
      <h2 className="text-white text-2xl font-bold mb-6">
        {phase === 'MEMORIZE' ? 'MEMORIZE!' : 'REPEAT!'}
      </h2>
      <div className="grid grid-cols-3 gap-2 w-64 h-64">
        {grid.map((isTarget, i) => {
          // Visual logic:
          // In Memorize phase: Show targets as Cyan, others dark.
          // In Recall phase: Show clicked correct as Cyan, clicked wrong (handled by fail immediately but for frame), unclicked as dark.
          
          let bgColor = 'bg-gray-700';
          if (phase === 'MEMORIZE' && isTarget) bgColor = 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]';
          if (phase === 'RECALL' && userSelection[i] && isTarget) bgColor = 'bg-cyan-400';
          
          return (
            <button
              key={i}
              onPointerDown={() => handleTileClick(i)}
              className={`rounded-lg transition-all duration-75 active:scale-95 ${bgColor}`}
              disabled={phase === 'MEMORIZE'}
            />
          );
        })}
      </div>
    </div>
  );
};