import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReflexGame, MathGame, StroopGame, CubeGame, MemoryGame } from './components/MicroGames';
import { GameState, GameType, GameDefinition, ScoreEntry } from './types';
import { Play, RotateCcw, Trophy, Heart, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Game Registry ---
const GAMES: GameDefinition[] = [
  { type: GameType.REFLEX, instruction: "WAIT... THEN TAP!", durationMs: 4000, Component: ReflexGame },
  { type: GameType.MATH, instruction: "IS IT TRUE?", durationMs: 5000, Component: MathGame },
  { type: GameType.STROOP, instruction: "MATCH THE COLOR!", durationMs: 3000, Component: StroopGame },
  { type: GameType.CUBE_3D, instruction: "STOP ON BOX!", durationMs: 5000, Component: CubeGame },
  { type: GameType.MEMORY, instruction: "WATCH CLOSELY!", durationMs: 6000, Component: MemoryGame },
];

// --- Main Component ---
export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(100); // Percentage
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE' | null>(null);

  // Difficulty increases every 5 points
  const difficulty = Math.min(10, Math.floor(score / 5) + 1);
  const speedMultiplier = 1 + (difficulty * 0.1); // 10% faster per difficulty level

  // Current Game Helper
  // We rotate through games randomly or sequentially. Let's do semi-random to ensure variety.
  // For simplicity in React render, we stick to one active at a time.
  const activeGameDef = GAMES[currentGameIndex % GAMES.length];

  // --- Loops & Timers ---

  // Timer Logic
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const startTime = Date.now();
    const duration = activeGameDef.durationMs / speedMultiplier;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = 100 - (elapsed / duration) * 100;
      
      if (remainingPct <= 0) {
        handleGameComplete(false); // Time out!
        clearInterval(interval);
      } else {
        setTimeLeft(remainingPct);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, activeGameDef, speedMultiplier]);

  const startGame = () => {
    setScore(0);
    setLives(3);
    setCurrentGameIndex(Math.floor(Math.random() * GAMES.length));
    startLevelTransition();
  };

  const startLevelTransition = () => {
    setGameState(GameState.INSTRUCTION);
    setTimeout(() => {
      setGameState(GameState.PLAYING);
    }, 1200); // Show instruction for 1.2s
  };

  const handleGameComplete = useCallback((success: boolean) => {
    setGameState(GameState.RESULT);
    setGameResult(success ? 'WIN' : 'LOSE');

    if (success) {
      setScore(s => s + 1);
      // Short pause before next level
      setTimeout(() => {
        const nextIndex = Math.floor(Math.random() * GAMES.length);
        setCurrentGameIndex(nextIndex);
        startLevelTransition();
      }, 1000);
    } else {
      setLives(l => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setTimeout(() => {
            setGameState(GameState.GAME_OVER);
            saveScore();
          }, 1000);
        } else {
          // Try again or next game? WarioWare usually moves to next game even on fail.
          setTimeout(() => {
            const nextIndex = Math.floor(Math.random() * GAMES.length);
            setCurrentGameIndex(nextIndex);
            startLevelTransition();
          }, 1000);
        }
        return newLives;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]); // Depend on score for difficulty updates implicitly

  const saveScore = () => {
    setHighScores(prev => {
      const newScores = [...prev, { date: new Date().toLocaleTimeString(), score: score + 1 }]; // score update is async, checking prev logic
      // Just use current score + success check. Actually score is updated before this calls usually.
      // Let's fix: We read state `score`.
      return [...prev, { date: new Date().toLocaleTimeString(), score: score }].sort((a,b) => b.score - a.score).slice(0, 5);
    });
  };

  // --- Renders ---

  const ActiveGameComponent = activeGameDef.Component;

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden select-none font-sans">
      {/* MENU */}
      {gameState === GameState.MENU && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900 p-6">
          <div className="mb-8 flex items-center justify-center w-24 h-24 bg-white rounded-full animate-bounce">
            <Zap size={48} className="text-yellow-500 fill-yellow-500" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2 text-center italic">
            NEURO<br/>FLASH
          </h1>
          <p className="text-blue-200 mb-12 text-lg font-medium">Micro-Games. Maximum Speed.</p>
          
          <button 
            onClick={startGame}
            className="group relative px-8 py-4 bg-yellow-400 text-black font-black text-2xl rounded-lg transform transition hover:scale-110 hover:rotate-2 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
          >
            <span className="flex items-center gap-2">
              <Play fill="black" /> START GAME
            </span>
          </button>

          {/* Mini Chart for Aesthetics */}
          <div className="mt-12 w-full max-w-xs h-32 opacity-50">
             <p className="text-center text-xs mb-2 uppercase tracking-widest text-white/60">Recent Brainwaves</p>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[{v:20}, {v:50}, {v:30}, {v:80}, {v:40}, {v:90}, {v:60}]}>
                 <Bar dataKey="v" fill="#F472B6" radius={[2,2,0,0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* INSTRUCTION (TRANSITION) */}
      {gameState === GameState.INSTRUCTION && (
        <div className="w-full h-full flex items-center justify-center bg-yellow-400 z-50 absolute top-0 left-0">
          <h1 className="text-6xl md:text-8xl font-black text-black text-center animate-pop px-4 leading-tight">
            {activeGameDef.instruction}
          </h1>
        </div>
      )}

      {/* GAMEPLAY */}
      {(gameState === GameState.PLAYING || gameState === GameState.RESULT) && (
        <div className="w-full h-full relative flex flex-col">
          {/* HUD */}
          <div className="h-20 bg-black flex items-center justify-between px-6 border-b border-gray-800 z-10">
             <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={24} className={`${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-700'}`} />
                ))}
             </div>
             <div className="text-4xl font-black font-mono text-white tracking-widest">
               {score.toString().padStart(2, '0')}
             </div>
          </div>
          
          {/* Timer Bar */}
          <div className="w-full h-4 bg-gray-800">
            <div 
              className={`h-full transition-all duration-75 ease-linear ${timeLeft < 30 ? 'bg-red-500' : 'bg-cyan-400'}`} 
              style={{ width: `${timeLeft}%` }} 
            />
          </div>

          {/* Game Container */}
          <div className="flex-1 relative overflow-hidden">
            <ActiveGameComponent 
              difficulty={difficulty} 
              onComplete={handleGameComplete} 
              isActive={gameState === GameState.PLAYING}
            />
            
            {/* Result Overlay */}
            {gameState === GameState.RESULT && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                 <div className={`text-8xl font-black transform rotate-[-10deg] animate-pop ${gameResult === 'WIN' ? 'text-green-400 drop-shadow-[0_5px_5px_rgba(0,0,0,1)]' : 'text-red-500 drop-shadow-[0_5px_5px_rgba(0,0,0,1)]'}`}>
                   {gameResult === 'WIN' ? 'NICE!' : 'FAIL'}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === GameState.GAME_OVER && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-8">
          <div className="text-red-500 font-black text-6xl mb-4 animate-shake">GAME OVER</div>
          <div className="text-white text-2xl mb-8">Final Score: <span className="text-yellow-400 font-bold">{score}</span></div>
          
          <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-gray-400 uppercase text-sm font-bold mb-4 tracking-wider flex items-center gap-2">
              <Trophy size={16} /> High Scores
            </h3>
            <div className="space-y-2">
              {highScores.map((entry, idx) => (
                <div key={idx} className="flex justify-between text-white font-mono border-b border-gray-700 pb-1 last:border-0">
                  <span>{idx + 1}. {entry.date}</span>
                  <span className="text-cyan-400">{entry.score}</span>
                </div>
              ))}
              {highScores.length === 0 && <div className="text-gray-600 italic">No scores yet!</div>}
            </div>
          </div>

          <button 
            onClick={startGame}
            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 active:scale-95 transition flex items-center gap-2"
          >
            <RotateCcw size={20} /> TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}