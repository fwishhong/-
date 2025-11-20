import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicroGameProps } from '../types';
import { Star, Circle, Square, Triangle, Hexagon, Check, X, Diamond, Heart, Zap, Coins, Bomb, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Box, Disc, Smile, Frown, Battery, BatteryCharging, Droplet } from 'lucide-react';

// --- Helpers ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

// ------------------------------------------------------------------
// GAME 1: HUNT THE TARGET (Reflex - 2D)
// ------------------------------------------------------------------
export const ReflexHuntGame: React.FC<MicroGameProps> = ({ difficulty, onComplete, assets }) => {
  const [grid, setGrid] = useState<{id: number, type: string, isTarget: boolean}[]>([]);
  const [targetType, setTargetType] = useState<string>('STAR');

  useEffect(() => {
    // Cap grid size to prevent it becoming impossible on small screens
    const size = difficulty < 4 ? 3 : 4;
    const totalCells = size * size; 
    
    const types = ['STAR', 'CIRCLE', 'SQUARE', 'TRIANGLE', 'HEX'];
    const target = pickRandom(types);
    setTargetType(target);

    const newGrid = Array(totalCells).fill(null).map((_, i) => {
      return { id: i, type: '', isTarget: false };
    });

    const targetIdx = randomInt(0, totalCells - 1);
    
    const finalGrid = newGrid.map((cell, idx) => {
      if (idx === targetIdx) {
        return { ...cell, type: target, isTarget: true };
      } else {
        let type = pickRandom(types);
        while (type === target) type = pickRandom(types);
        return { ...cell, type, isTarget: false };
      }
    });

    setGrid(finalGrid);
  }, [difficulty]);

  const getIcon = (type: string, isTarget: boolean) => {
    // Custom Asset Rendering
    if (assets && assets.primary && assets.secondary) {
      return (
        <img 
          src={isTarget ? assets.primary : assets.secondary} 
          alt="asset" 
          className="w-full h-full object-contain p-2"
        />
      );
    }

    // Fallback Icons
    const props = { size: 40, fill: "currentColor" };
    switch(type) {
      case 'STAR': return <Star {...props} />;
      case 'CIRCLE': return <Circle {...props} />;
      case 'SQUARE': return <Square {...props} />;
      case 'TRIANGLE': return <Triangle {...props} />;
      case 'HEX': return <Hexagon {...props} />;
      default: return <Zap {...props} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-400 p-4">
      <div className="bg-black text-yellow-400 px-6 py-2 rounded-full font-black text-2xl mb-6 shadow-lg border-4 border-white uppercase animate-pop max-w-full text-center leading-tight">
        {assets ? `TAP THE ${assets.themeName}!` : `TAP THE ${targetType}!`}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.sqrt(grid.length)}, minmax(0, 1fr))` }}>
        {grid.map((cell) => (
          <button
            key={cell.id}
            onPointerDown={() => onComplete(cell.isTarget)}
            className={`
              w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] border-4 border-black transition-transform active:scale-90 active:shadow-none active:translate-x-[4px] active:translate-y-[4px] overflow-hidden
              ${cell.isTarget ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-white text-gray-800 hover:bg-gray-100'}
            `}
          >
            {getIcon(cell.type, cell.isTarget)}
          </button>
        ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 2: SIMON 3D (Memory - 3D)
// ------------------------------------------------------------------
export const MemorySimonGame: React.FC<MicroGameProps> = ({ difficulty, onComplete, isActive }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userStep, setUserStep] = useState(0);
  const [litPad, setLitPad] = useState<number | null>(null);
  const [phase, setPhase] = useState<'WATCH' | 'REPEAT'>('WATCH');

  const pads = [0, 1, 2, 3];
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];

  useEffect(() => {
    if (!isActive) return;

    const length = Math.min(5, 3 + Math.floor(difficulty / 3)); 
    const newSeq = Array(length).fill(0).map(() => randomInt(0, 3));
    setSequence(newSeq);
    
    let i = 0;
    const interval = setInterval(() => {
      setLitPad(newSeq[i]);
      setTimeout(() => setLitPad(null), 400);
      
      i++;
      if (i >= newSeq.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('REPEAT'), 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isActive, difficulty]);

  const handlePadClick = (idx: number) => {
    if (phase !== 'REPEAT') return;

    setLitPad(idx);
    setTimeout(() => setLitPad(null), 200);

    if (idx === sequence[userStep]) {
      const nextStep = userStep + 1;
      if (nextStep === sequence.length) {
        onComplete(true);
      } else {
        setUserStep(nextStep);
      }
    } else {
      onComplete(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 overflow-hidden perspective-1000">
      <h2 className={`mb-8 font-bold text-4xl tracking-wider transition-colors ${phase === 'WATCH' ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
        {phase === 'WATCH' ? 'WATCH...' : 'REPEAT!'}
      </h2>
      
      <div 
        className="relative w-64 h-64 preserve-3d transition-transform duration-500"
        style={{ transform: 'rotateX(45deg) rotateZ(0deg)' }}
      >
        <div className="grid grid-cols-2 gap-4 w-full h-full">
          {pads.map((idx) => (
            <div
              key={idx}
              onPointerDown={() => handlePadClick(idx)}
              className={`
                simon-pad rounded-2xl border-b-[8px] border-r-[8px] border-black/30 shadow-xl cursor-pointer
                ${colors[idx]}
                ${litPad === idx ? 'lit' : 'opacity-80'}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 3: COMPARE (Math - 2D)
// ------------------------------------------------------------------
export const MathCompareGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [left, setLeft] = useState({ text: '', val: 0 });
  const [right, setRight] = useState({ text: '', val: 0 });

  useEffect(() => {
    const genExpr = () => {
      const op = Math.random() > 0.5 ? '+' : '*';
      const a = randomInt(2, 9 + difficulty);
      const b = randomInt(2, 9 + difficulty);
      return {
        text: `${a} ${op} ${b}`,
        val: op === '+' ? a + b : a * b
      };
    };

    let l = genExpr();
    let r = genExpr();
    while (l.val === r.val) r = genExpr();

    setLeft(l);
    setRight(r);
  }, [difficulty]);

  const handleSelect = (side: 'L' | 'R') => {
    const isLeftBigger = left.val > right.val;
    if (side === 'L') onComplete(isLeftBigger);
    else onComplete(!isLeftBigger);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      <button 
        onClick={() => handleSelect('L')}
        className="flex-1 bg-pink-500 flex items-center justify-center border-b-8 md:border-b-0 md:border-r-8 border-black hover:bg-pink-400 active:bg-pink-600 transition-colors group relative overflow-hidden"
      >
        <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <h2 className="text-5xl md:text-7xl font-black text-white drop-shadow-md">{left.text}</h2>
      </button>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white rounded-full w-16 h-16 flex items-center justify-center font-bold z-10 border-4 border-white">
        VS
      </div>
      <button 
        onClick={() => handleSelect('R')}
        className="flex-1 bg-indigo-500 flex items-center justify-center border-t-8 md:border-t-0 md:border-l-8 border-black hover:bg-indigo-400 active:bg-indigo-600 transition-colors group relative overflow-hidden"
      >
        <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <h2 className="text-5xl md:text-7xl font-black text-white drop-shadow-md">{right.text}</h2>
      </button>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 4: SPIN LOCK (Visual - 3D)
// ------------------------------------------------------------------
export const VisualSpinGame: React.FC<MicroGameProps> = ({ isActive, difficulty, onComplete }) => {
  const [rotation, setRotation] = useState(0);
  const [targetShape, setTargetShape] = useState<'DIAMOND' | 'HEART'>('DIAMOND');
  const requestRef = useRef<number>(0);
  const stopped = useRef(false);

  useEffect(() => {
    setTargetShape(Math.random() > 0.5 ? 'DIAMOND' : 'HEART');
  }, []);

  const animate = useCallback(() => {
    if (stopped.current) return;
    // Much slower speed: 1.5 base.
    const speed = 1.5 + (Math.min(difficulty, 10) * 0.15);
    setRotation(r => (r + speed) % 360);
    requestRef.current = requestAnimationFrame(animate);
  }, [difficulty]);

  useEffect(() => {
    if (isActive) requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive, animate]);

  const handleStop = () => {
    if (stopped.current) return;
    stopped.current = true;
    cancelAnimationFrame(requestRef.current);

    const r = rotation % 360;
    // Wide tolerance to make it feel fair
    const tolerance = 45; 

    const isDiamondPos = (r < tolerance || r > 360 - tolerance) || (r > 180 - tolerance && r < 180 + tolerance);
    const isHeartPos = (r > 90 - tolerance && r < 90 + tolerance) || (r > 270 - tolerance && r < 270 + tolerance);

    if (targetShape === 'DIAMOND') onComplete(isDiamondPos);
    else onComplete(isHeartPos);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-purple-800" onPointerDown={handleStop}>
      <div className="mb-12 flex flex-col items-center z-10">
        <span className="text-purple-200 font-bold tracking-widest text-sm mb-2">STOP WHEN YOU SEE</span>
        <div className="bg-white text-purple-900 p-4 rounded-lg shadow-lg border-4 border-purple-900">
           {targetShape === 'DIAMOND' ? <Diamond size={48} fill="currentColor"/> : <Heart size={48} fill="currentColor"/>}
        </div>
      </div>

      <div className="tumbler-scene w-40 h-40">
        <div className="tumbler w-full h-full" style={{ transform: `rotateX(${rotation}deg)` }}>
          {/* Front (0) - Diamond */}
          <div className="tumbler-face bg-cyan-400 translate-z-[5rem]" style={{ transform: 'translateZ(5rem)' }}>
            <Diamond size={80} className="text-white" fill="white" />
          </div>
          {/* Top (90) - Heart */}
          <div className="tumbler-face bg-pink-500" style={{ transform: 'rotateX(90deg) translateZ(5rem)' }}>
            <Heart size={80} className="text-white" fill="white" />
          </div>
          {/* Back (180) - Diamond */}
          <div className="tumbler-face bg-cyan-600" style={{ transform: 'rotateX(180deg) translateZ(5rem)' }}>
             <Diamond size={80} className="text-white" fill="white" />
          </div>
          {/* Bottom (270) - Heart */}
          <div className="tumbler-face bg-pink-700" style={{ transform: 'rotateX(-90deg) translateZ(5rem)' }}>
             <Heart size={80} className="text-white" fill="white" />
          </div>
        </div>
      </div>
      {/* Indicator Line */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-[2px] bg-yellow-400/50 pointer-events-none z-0" />
      
      <div className="mt-16 text-white/50 text-sm uppercase font-bold animate-pulse">Tap to Lock</div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 5: LOGIC TRAP (Judgment - 2D)
// ------------------------------------------------------------------
export const LogicTrapGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    const colors = [
      { name: 'RED', class: 'text-red-600' },
      { name: 'BLUE', class: 'text-blue-600' },
      { name: 'GREEN', class: 'text-green-600' }
    ];
    const word = pickRandom(colors);
    const ink = pickRandom(colors);
    const qType = Math.random() > 0.5 ? 'WORD' : 'INK';
    const isCorrect = Math.random() > 0.5;
    
    let queryVal;
    if (isCorrect) {
      queryVal = qType === 'WORD' ? word.name : ink.name;
    } else {
      const actual = qType === 'WORD' ? word.name : ink.name;
      const others = colors.map(c => c.name).filter(n => n !== actual);
      queryVal = pickRandom(others);
    }

    setState({ word, ink, qType, queryVal, isCorrect });
  }, [difficulty]);

  if (!state) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
      <div className="flex-1 flex items-center justify-center w-full">
        <h1 className={`text-8xl md:text-9xl font-black ${state.ink.class} drop-shadow-sm`}>
          {state.word.name}
        </h1>
      </div>
      
      <div className="bg-white w-full py-8 flex flex-col items-center shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <p className="text-gray-500 text-lg font-bold uppercase tracking-widest mb-2">
          {state.qType === 'WORD' ? 'READ THE WORD' : 'CHECK INK COLOR'}
        </p>
        <h2 className="text-3xl font-bold text-black mb-6">
          Is it <span className="text-black underline decoration-4 decoration-yellow-400">{state.queryVal}</span>?
        </h2>
        
        <div className="flex gap-4 w-full max-w-md px-4">
          <button 
            onClick={() => onComplete(state.isCorrect === true)}
            className="flex-1 h-20 bg-green-500 rounded-xl border-b-4 border-green-700 text-white text-3xl font-black hover:bg-green-400 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
          >
            <Check size={32} strokeWidth={4} /> YES
          </button>
          <button 
            onClick={() => onComplete(state.isCorrect === false)}
            className="flex-1 h-20 bg-red-500 rounded-xl border-b-4 border-red-700 text-white text-3xl font-black hover:bg-red-400 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
          >
            <X size={32} strokeWidth={4} /> NO
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 6: ACTION MASH (Action - 2D)
// ------------------------------------------------------------------
export const ActionMashGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const requiredClicks = 5 + difficulty; 

  const handleTap = () => {
    const newProg = progress + 1;
    setProgress(newProg);
    if (newProg >= requiredClicks) {
      onComplete(true);
    }
  };

  const scale = 0.5 + (progress / requiredClicks) * 1.5;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-sky-300 overflow-hidden">
      <div 
        className="transition-transform duration-75 ease-out flex items-center justify-center"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="w-48 h-60 bg-red-500 rounded-[50%] relative shadow-[inset_-10px_-10px_0px_rgba(0,0,0,0.2)] border-4 border-black">
           <div className="absolute top-4 right-8 w-8 h-12 bg-white/30 rounded-full rotate-12" />
           <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black" />
           <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-1 h-12 bg-black" />
        </div>
      </div>

      <button 
        onPointerDown={handleTap}
        className="absolute bottom-12 px-12 py-6 bg-yellow-400 text-black font-black text-4xl rounded-2xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all shadow-xl z-10"
      >
        PUMP!
      </button>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 7: MATH COUNT (Math - 2D)
// ------------------------------------------------------------------
export const MathCountGame: React.FC<MicroGameProps> = ({ difficulty, onComplete, assets }) => {
  const [items, setItems] = useState<{id:number, type:string, x:number, y:number}[]>([]);
  const [targetType, setTargetType] = useState('COIN');
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    const types = ['COIN', 'GEM'];
    const target = pickRandom(types);
    setTargetType(target);

    const totalItems = randomInt(5, 12);
    const newItems = [];
    let count = 0;
    for(let i=0; i<totalItems; i++) {
      const t = Math.random() > 0.5 ? 'COIN' : 'GEM';
      if (t === target) count++;
      newItems.push({
        id: i,
        type: t,
        x: randomInt(10, 90),
        y: randomInt(10, 90)
      });
    }
    // Ensure at least one match
    if (count === 0) {
      newItems[0].type = target;
      count = 1;
    }

    setItems(newItems);
    setCorrectCount(count);
  }, [difficulty]);

  const checkAnswer = (ans: number) => {
    onComplete(ans === correctCount);
  };

  const options = [correctCount, correctCount + 1, Math.max(0, correctCount - 1)].sort(() => Math.random() - 0.5);
  const uniqueOptions = Array.from(new Set(options));

  const getIcon = (type: string) => {
    if (assets && assets.primary) {
       // Use Primary for Coin, Secondary for Gem
       const src = type === 'COIN' ? assets.primary : (assets.secondary || assets.primary);
       return <img src={src} alt="item" className="w-12 h-12 object-contain drop-shadow-md" />;
    }

    if (type === 'COIN') return <Coins className="text-yellow-400" size={48} />;
    return <Diamond className="text-cyan-400" size={48} />;
  };

  const targetName = assets ? assets.themeName.toUpperCase() : targetType;

  return (
    <div className="w-full h-full bg-green-800 relative overflow-hidden">
      {items.map(item => (
        <div 
          key={item.id} 
          className="absolute animate-pulse-fast"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        >
          {getIcon(item.type)}
        </div>
      ))}

      <div className="absolute bottom-0 w-full bg-black/80 p-4 flex justify-center gap-4 items-center z-10">
         <div className="text-white font-bold text-xl mr-4">HOW MANY {targetName}?</div>
         {uniqueOptions.map(opt => (
           <button 
             key={opt}
             onClick={() => checkAnswer(opt)}
             className="w-16 h-16 bg-white rounded-lg text-3xl font-black flex items-center justify-center hover:bg-gray-200 active:scale-90"
           >
             {opt}
           </button>
         ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 8: REACTION WAIT (Reflex - 3D)
// ------------------------------------------------------------------
export const ReactionWaitGame: React.FC<MicroGameProps> = ({ difficulty, onComplete, isActive }) => {
  const [exploded, setExploded] = useState(false);
  
  useEffect(() => {
    if (!isActive) return;
    const winTimer = setTimeout(() => {
      if (!exploded) onComplete(true);
    }, 2500);

    return () => clearTimeout(winTimer);
  }, [isActive, exploded, onComplete]);

  const handlePress = () => {
    setExploded(true);
    onComplete(false);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-red-900 perspective-1000 overflow-hidden">
       {exploded ? (
         <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
           <h1 className="text-6xl font-black text-red-600">BOOM!</h1>
         </div>
       ) : (
         <>
           <div className="mb-12 text-white font-black text-4xl animate-shake">DON'T PRESS!</div>
           
           <div className="relative w-64 h-64 preserve-3d transition-transform active:scale-95" style={{ transform: 'rotateX(30deg)' }}>
             {/* Button Base */}
             <div className="absolute inset-0 bg-gray-800 rounded-full translate-z-[-20px]" style={{ transform: 'translateZ(-20px)' }} />
             {/* Button Top */}
             <button 
               onPointerDown={handlePress}
               className="absolute inset-0 bg-red-600 rounded-full flex items-center justify-center shadow-[0_10px_0px_#7f1d1d] active:shadow-none active:translate-y-[10px] transition-all cursor-pointer group"
             >
                <Bomb size={80} className="text-red-900 group-hover:text-red-800" />
             </button>
           </div>
         </>
       )}
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 9: DIRECTION SWIPE (Reflex - 2D)
// ------------------------------------------------------------------
export const DirectionSwipeGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [targetDir, setTargetDir] = useState<'UP'|'DOWN'|'LEFT'|'RIGHT'>('UP');

  useEffect(() => {
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
    setTargetDir(pickRandom([...dirs]));
  }, [difficulty]);

  const checkDir = (dir: string) => {
    onComplete(dir === targetDir);
  };

  const getArrow = () => {
    const size = 140;
    switch(targetDir) {
      case 'UP': return <ArrowUp size={size} strokeWidth={3} />;
      case 'DOWN': return <ArrowDown size={size} strokeWidth={3} />;
      case 'LEFT': return <ArrowLeft size={size} strokeWidth={3} />;
      case 'RIGHT': return <ArrowRight size={size} strokeWidth={3} />;
    }
  };

  return (
    <div className="w-full h-full bg-orange-500 flex flex-col items-center justify-center relative">
      <div className="bg-white text-orange-600 p-8 rounded-full shadow-[0_8px_0px_rgba(0,0,0,0.2)] animate-pop">
        {getArrow()}
      </div>
      
      {/* Interaction Zones - simulate swipe with large tap areas */}
      <button onPointerDown={() => checkDir('UP')} className="absolute top-0 w-full h-24 bg-white/20 hover:bg-white/40 flex items-start justify-center pt-4 text-white font-bold">UP</button>
      <button onPointerDown={() => checkDir('DOWN')} className="absolute bottom-0 w-full h-24 bg-white/20 hover:bg-white/40 flex items-end justify-center pb-4 text-white font-bold">DOWN</button>
      <button onPointerDown={() => checkDir('LEFT')} className="absolute left-0 h-full w-24 bg-white/20 hover:bg-white/40 flex items-center justify-start pl-4 text-white font-bold">LEFT</button>
      <button onPointerDown={() => checkDir('RIGHT')} className="absolute right-0 h-full w-24 bg-white/20 hover:bg-white/40 flex items-center justify-end pr-4 text-white font-bold">RIGHT</button>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 10: ASCENDING ORDER (Math/Logic - 2D)
// ------------------------------------------------------------------
export const AscendingOrderGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [nums, setNums] = useState<{val:number, x:number, y:number, clicked:boolean}[]>([]);
  const [nextVal, setNextVal] = useState(1);

  useEffect(() => {
    // Generate 3 numbers at random positions
    // Prevent overlap by using grid slots
    const slots = [
      {x: 20, y: 30}, {x: 80, y: 30},
      {x: 50, y: 50},
      {x: 20, y: 70}, {x: 80, y: 70}
    ];
    
    // Shuffle slots
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    const newNums = [1, 2, 3].map((val, idx) => ({
      val,
      x: slots[idx].x,
      y: slots[idx].y,
      clicked: false
    }));
    setNums(newNums);
    setNextVal(1);
  }, [difficulty]);

  const handleTap = (val: number) => {
    if (val === nextVal) {
      setNums(prev => prev.map(n => n.val === val ? { ...n, clicked: true } : n));
      if (val === 3) {
        onComplete(true);
      } else {
        setNextVal(val + 1);
      }
    } else {
      onComplete(false);
    }
  };

  return (
    <div className="w-full h-full bg-teal-700 relative">
      {nums.map((n) => !n.clicked && (
        <button
          key={n.val}
          onPointerDown={() => handleTap(n.val)}
          className="absolute w-20 h-20 rounded-full bg-white border-4 border-teal-900 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center text-4xl font-black text-teal-900 active:scale-90 transition-transform"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          {n.val}
        </button>
      ))}
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 11: SPATIAL FIT (Spatial - 3D)
// ------------------------------------------------------------------
export const SpatialFitGame: React.FC<MicroGameProps> = ({ difficulty, onComplete, isActive }) => {
  const [shape, setShape] = useState<'CUBE'|'SPHERE'|'PYRAMID'>('CUBE');

  useEffect(() => {
    setShape(pickRandom(['CUBE', 'SPHERE', 'PYRAMID']));
  }, [difficulty]);

  const checkMatch = (selected: string) => {
    onComplete(selected === shape);
  };

  return (
    <div className="w-full h-full flex flex-col bg-indigo-900 perspective-800 overflow-hidden">
       {/* Floating 3D Shape */}
       <div className="flex-1 flex items-center justify-center">
         <div className={`relative w-32 h-32 preserve-3d ${isActive ? 'animate-spin-slow' : ''}`}>
            {shape === 'CUBE' && (
               <div className="w-full h-full bg-blue-400 opacity-90 border-2 border-white shadow-[0_0_30px_rgba(59,130,246,0.5)] transform rotate-45" />
            )}
            {shape === 'SPHERE' && (
               <div className="w-full h-full rounded-full bg-red-400 opacity-90 border-2 border-white shadow-[0_0_30px_rgba(248,113,113,0.5)]" />
            )}
            {shape === 'PYRAMID' && (
               <div className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[100px] border-b-yellow-400 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            )}
         </div>
       </div>

       {/* Options */}
       <div className="h-32 bg-black/50 flex items-center justify-around px-4 pb-4 backdrop-blur-sm">
          <button onClick={() => checkMatch('CUBE')} className="w-20 h-20 border-2 border-dashed border-white/50 hover:bg-white/10 flex items-center justify-center">
             <Box className="text-white/50" />
          </button>
          <button onClick={() => checkMatch('SPHERE')} className="w-20 h-20 rounded-full border-2 border-dashed border-white/50 hover:bg-white/10 flex items-center justify-center">
             <Disc className="text-white/50" />
          </button>
          <button onClick={() => checkMatch('PYRAMID')} className="w-20 h-20 border-2 border-dashed border-white/50 hover:bg-white/10 flex items-center justify-center transform rotate-180">
             <Triangle className="text-white/50" />
          </button>
       </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 12: FIND ODD (Visual - 2D)
// ------------------------------------------------------------------
export const VisualOddGame: React.FC<MicroGameProps> = ({ difficulty, onComplete, assets }) => {
  const [grid, setGrid] = useState<{id:number, isOdd:boolean}[]>([]);
  const [emojiType, setEmojiType] = useState<'SMILE'|'FROWN'>('SMILE');

  useEffect(() => {
    // Difficulty 1-3: 3x3 (9), 4-7: 4x4 (16), 8+: 5x5 (25)
    const size = difficulty < 4 ? 3 : difficulty < 8 ? 4 : 5;
    const total = size * size;
    const oddIdx = randomInt(0, total - 1);
    
    const main = Math.random() > 0.5 ? 'SMILE' : 'FROWN';
    setEmojiType(main);

    const newGrid = Array(total).fill(null).map((_, i) => ({
      id: i,
      isOdd: i === oddIdx
    }));
    setGrid(newGrid);
  }, [difficulty]);

  const getIcon = (isOdd: boolean) => {
    if (assets && assets.primary && assets.secondary) {
      // Odd is Primary, Normal is Secondary
      return (
        <img 
          src={isOdd ? assets.primary : assets.secondary} 
          alt="asset" 
          className="w-full h-full object-contain p-2" 
        />
      );
    }
    
    // Fallback
    if (isOdd) return emojiType === 'SMILE' ? <Frown size={32} className="text-red-500"/> : <Smile size={32} className="text-green-500"/>;
    return emojiType === 'SMILE' ? <Smile size={32} className="text-yellow-600"/> : <Frown size={32} className="text-yellow-600"/>;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-200 p-4">
      <div className="grid gap-2 md:gap-4" style={{ gridTemplateColumns: `repeat(${Math.sqrt(grid.length)}, minmax(0, 1fr))` }}>
        {grid.map(cell => (
           <button
             key={cell.id}
             onPointerDown={() => onComplete(cell.isOdd)}
             className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-full shadow-md border-2 border-yellow-400 flex items-center justify-center active:scale-90 overflow-hidden"
           >
             {getIcon(cell.isOdd)}
           </button>
        ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 13: COLOR MIX (Logic - 2D)
// ------------------------------------------------------------------
export const LogicMixGame: React.FC<MicroGameProps> = ({ difficulty, onComplete }) => {
  const [colors, setColors] = useState<string[]>([]);
  const [target, setTarget] = useState<string>('');

  useEffect(() => {
    // R+B=Purple, R+Y=Orange, B+Y=Green
    const combos = [
      { c1: 'bg-red-500', c2: 'bg-blue-500', res: 'PURPLE', resClass: 'bg-purple-500' },
      { c1: 'bg-red-500', c2: 'bg-yellow-400', res: 'ORANGE', resClass: 'bg-orange-500' },
      { c1: 'bg-blue-500', c2: 'bg-yellow-400', res: 'GREEN', resClass: 'bg-green-500' },
    ];
    
    const task = pickRandom(combos);
    setColors([task.c1, task.c2]);
    setTarget(task.res);
  }, [difficulty]);

  const check = (ans: string) => {
    onComplete(ans === target);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
      <div className="flex items-center justify-center gap-4 mb-12">
        <div className={`w-24 h-24 rounded-full ${colors[0]} border-4 border-white shadow-lg`} />
        <span className="text-4xl font-black text-gray-400">+</span>
        <div className={`w-24 h-24 rounded-full ${colors[1]} border-4 border-white shadow-lg`} />
        <span className="text-4xl font-black text-gray-400">=</span>
        <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-400 flex items-center justify-center text-4xl text-gray-400">?</div>
      </div>

      <div className="flex gap-4">
         <button onClick={() => check('PURPLE')} className="w-24 h-24 bg-purple-500 rounded-xl border-b-8 border-purple-800 active:border-b-0 active:translate-y-2" />
         <button onClick={() => check('ORANGE')} className="w-24 h-24 bg-orange-500 rounded-xl border-b-8 border-orange-800 active:border-b-0 active:translate-y-2" />
         <button onClick={() => check('GREEN')} className="w-24 h-24 bg-green-500 rounded-xl border-b-8 border-green-800 active:border-b-0 active:translate-y-2" />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// GAME 14: CHARGE IT (Timing - 2D)
// ------------------------------------------------------------------
export const TimingChargeGame: React.FC<MicroGameProps> = ({ isActive, difficulty, onComplete }) => {
  const [level, setLevel] = useState(0);
  const reqRef = useRef<number>(0);
  const stopped = useRef(false);

  useEffect(() => {
    if(!isActive) return;

    // Speed varies by difficulty
    const speed = 1.5 + (difficulty * 0.2); 

    const loop = () => {
      if (stopped.current) return;
      setLevel(prev => {
        if (prev >= 105) {
          stopped.current = true;
          onComplete(false); // Exploded
          return prev;
        }
        return prev + speed;
      });
      reqRef.current = requestAnimationFrame(loop);
    };
    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, [isActive, difficulty, onComplete]);

  const handleTap = () => {
    if (stopped.current) return;
    stopped.current = true;
    cancelAnimationFrame(reqRef.current);

    // Target zone: 80% to 95%
    if (level >= 80 && level <= 98) {
      onComplete(true);
    } else {
      onComplete(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800" onPointerDown={handleTap}>
       <div className="relative w-32 h-64 border-8 border-gray-500 rounded-2xl p-2 bg-black">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-6 bg-gray-500 rounded-t-md" />
          
          {/* Target Zone Marker */}
          <div className="absolute bottom-[80%] w-full h-[18%] border-y-2 border-green-400 bg-green-500/20 left-0 z-10 flex items-center justify-center">
            <span className="text-green-400 text-xs font-bold ml-36 whitespace-nowrap">STOP HERE</span>
          </div>

          {/* Fill */}
          <div 
            className={`w-full absolute bottom-2 left-2 right-2 rounded-lg transition-colors duration-75
              ${level > 98 ? 'bg-red-600' : level > 80 ? 'bg-green-500' : 'bg-yellow-400'}
            `}
            style={{ height: `${Math.min(level, 100)}%`, width: 'calc(100% - 16px)' }}
          />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <BatteryCharging className="text-white/20 w-20 h-20" />
          </div>
       </div>
       <div className="mt-8 text-white font-mono text-xl animate-pulse">
         {level > 100 ? "OVERLOAD!" : `${Math.floor(level)}%`}
       </div>
    </div>
  );
};