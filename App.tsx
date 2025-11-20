import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ReflexHuntGame, 
  MemorySimonGame, 
  MathCompareGame, 
  VisualSpinGame, 
  LogicTrapGame,
  ActionMashGame, 
  MathCountGame,
  ReactionWaitGame,
  DirectionSwipeGame,
  AscendingOrderGame,
  SpatialFitGame,
  VisualOddGame,
  LogicMixGame,
  TimingChargeGame
} from './components/MicroGames';
import { GameState, GameType, GameDefinition, ScoreEntry, AssetPack } from './types';
import { RotateCcw, Trophy, Heart, Zap, Volume2, VolumeX, Play, Palette, Loader, Image as ImageIcon } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { GoogleGenAI, Modality } from "@google/genai";

// --- Sound Engine (Web Audio API) ---
class SoundEngine {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.error("AudioContext not supported");
    }
  }

  init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1, when: number = 0) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + when);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + when + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + when);
    osc.stop(this.ctx.currentTime + when + duration);
  }

  playWin() {
    // Arpeggio C-E-G-C
    this.playTone(523.25, 'square', 0.1, 0.1, 0);
    this.playTone(659.25, 'square', 0.1, 0.1, 0.1);
    this.playTone(783.99, 'square', 0.1, 0.1, 0.2);
    this.playTone(1046.50, 'square', 0.3, 0.1, 0.3);
  }

  playLose() {
    // Dissonant slide
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playTick() {
    // High hat tick
    this.playTone(800, 'square', 0.05, 0.05);
  }
  
  playStart() {
    // Whoosh up
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}

const sfx = new SoundEngine();

// --- Game Registry ---
const GAMES: GameDefinition[] = [
  { type: GameType.REFLEX_HUNT, instruction: "FIND TARGET!", durationMs: 4500, Component: ReflexHuntGame },
  { type: GameType.MEMORY_SIMON, instruction: "MEMORIZE!", durationMs: 7000, Component: MemorySimonGame },
  { type: GameType.MATH_COMPARE, instruction: "BIGGER?", durationMs: 4000, Component: MathCompareGame },
  { type: GameType.VISUAL_SPIN, instruction: "LOCK SHAPE!", durationMs: 5000, Component: VisualSpinGame },
  { type: GameType.LOGIC_TRAP, instruction: "JUDGE!", durationMs: 3500, Component: LogicTrapGame },
  { type: GameType.ACTION_MASH, instruction: "PUMP IT!", durationMs: 4000, Component: ActionMashGame },
  { type: GameType.MATH_COUNT, instruction: "COUNT!", durationMs: 5000, Component: MathCountGame },
  { type: GameType.REACTION_WAIT, instruction: "DON'T PRESS!", durationMs: 3000, Component: ReactionWaitGame },
  { type: GameType.DIRECTION_SWIPE, instruction: "SWIPE!", durationMs: 3000, Component: DirectionSwipeGame },
  { type: GameType.MATH_ORDER, instruction: "1 - 2 - 3", durationMs: 4500, Component: AscendingOrderGame },
  { type: GameType.SPATIAL_FIT, instruction: "FIT IT!", durationMs: 3500, Component: SpatialFitGame },
  { type: GameType.VISUAL_ODD, instruction: "FIND ODD!", durationMs: 4000, Component: VisualOddGame },
  { type: GameType.LOGIC_MIX, instruction: "MIX COLORS!", durationMs: 3500, Component: LogicMixGame },
  { type: GameType.TIMING_CHARGE, instruction: "CHARGE IT!", durationMs: 4000, Component: TimingChargeGame },
];

// --- Main Component ---
export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(100); 
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE' | null>(null);
  const [muted, setMuted] = useState(false);
  
  // --- Asset Lab State ---
  const [showAssetLab, setShowAssetLab] = useState(false);
  const [assetPrompt, setAssetPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [customAssets, setCustomAssets] = useState<AssetPack | null>(null);

  // Difficulty increases every 5 points
  const difficulty = Math.min(10, Math.floor(score / 5) + 1);
  // Slower speed ramp up. 
  const speedMultiplier = 1 + (difficulty * 0.08); 

  const activeGameDef = GAMES[currentGameIndex % GAMES.length];

  // --- Loops & Timers ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const startTime = Date.now();
    const duration = activeGameDef.durationMs / speedMultiplier;
    let lastTick = 0;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = 100 - (elapsed / duration) * 100;
      
      // Tick sound every second roughly
      if (Math.floor(elapsed / 1000) > lastTick) {
         sfx.playTick();
         lastTick = Math.floor(elapsed / 1000);
      }

      if (remainingPct <= 0) {
        handleGameComplete(false); 
        clearInterval(interval);
      } else {
        setTimeLeft(remainingPct);
      }
    }, 16); 

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, activeGameDef, speedMultiplier]);

  const toggleMute = () => {
    sfx.muted = !sfx.muted;
    setMuted(sfx.muted);
  };

  const startGame = () => {
    sfx.init();
    sfx.playStart();
    setScore(0);
    setLives(3);
    setCurrentGameIndex(Math.floor(Math.random() * GAMES.length));
    startLevelTransition();
  };

  const startLevelTransition = () => {
    setGameState(GameState.INSTRUCTION);
    setTimeLeft(100);
    setTimeout(() => {
      setGameState(GameState.PLAYING);
    }, 1200); 
  };

  const handleGameComplete = useCallback((success: boolean) => {
    setGameState(GameState.RESULT);
    setGameResult(success ? 'WIN' : 'LOSE');

    if (success) {
      sfx.playWin();
      setScore(s => s + 1);
      setTimeout(() => {
        // Pick next game randomly, try to avoid immediate repeat
        let nextIndex = Math.floor(Math.random() * GAMES.length);
        if (GAMES.length > 1 && nextIndex === currentGameIndex) {
             nextIndex = (nextIndex + 1) % GAMES.length;
        }
        setCurrentGameIndex(nextIndex);
        startLevelTransition();
      }, 1200); 
    } else {
      sfx.playLose();
      setLives(l => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setTimeout(() => {
            setGameState(GameState.GAME_OVER);
            saveScore();
          }, 1200);
        } else {
          setTimeout(() => {
            let nextIndex = Math.floor(Math.random() * GAMES.length);
            setCurrentGameIndex(nextIndex);
            startLevelTransition();
          }, 1200);
        }
        return newLives;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGameIndex]); 

  const saveScore = () => {
    setHighScores(prev => {
      const newEntry = { date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), score: score };
      return [...prev, newEntry].sort((a,b) => b.score - a.score).slice(0, 5);
    });
  };

  // --- Asset Generation ---
  const handleGenerateAssets = async () => {
    if (!assetPrompt.trim() || generating) return;
    setGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Generate Primary Icon
      const primaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `A high quality, simple vector game icon of ${assetPrompt}. White background. Centered. bold colors.` }] },
        config: { responseModalities: [Modality.IMAGE] }
      });

      // Generate Secondary Icon (Distractor)
      const secondaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `A high quality, simple vector game icon of something different from ${assetPrompt}, but matching the style. White background. Centered.` }] },
        config: { responseModalities: [Modality.IMAGE] }
      });

      // Extract Base64
      // The new SDK response format handling:
      const getBase64 = (resp: any) => {
        const p = resp.candidates?.[0]?.content?.parts?.[0];
        if (p?.inlineData) {
            return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
        }
        return '';
      };

      const primaryUrl = getBase64(primaryResponse);
      const secondaryUrl = getBase64(secondaryResponse);

      if (primaryUrl && secondaryUrl) {
        setCustomAssets({
          themeName: assetPrompt,
          primary: primaryUrl,
          secondary: secondaryUrl
        });
        setShowAssetLab(false);
      } else {
        alert("Failed to generate images. Try a simpler prompt.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating assets. Check API configuration.");
    } finally {
      setGenerating(false);
    }
  };

  const ActiveGameComponent = activeGameDef.Component;

  return (
    <div className="w-screen h-screen bg-neutral-900 text-white overflow-hidden select-none font-sans touch-none">
      {/* MENU */}
      {gameState === GameState.MENU && !showAssetLab && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80')] bg-cover bg-center relative">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6 flex items-center justify-center w-24 h-24 bg-yellow-400 rounded-full animate-float shadow-[0_0_30px_rgba(250,204,21,0.5)] overflow-hidden">
               {customAssets ? (
                 <img src={customAssets.primary} className="w-full h-full object-cover" alt="Custom" />
               ) : (
                 <Zap size={48} className="text-black fill-black" />
               )}
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white mb-2 text-center tracking-tighter italic drop-shadow-lg animate-pulse-fast" style={{ textShadow: '4px 4px 0px #F472B6' }}>
              NEURO<br/><span className="text-yellow-400">FLASH</span>
            </h1>
            <p className="text-gray-300 mb-12 text-xl font-bold uppercase tracking-widest animate-slide-up" style={{animationDelay: '0.2s'}}>Arcade Brain Training</p>
            
            <button 
              onClick={startGame}
              className="group relative px-12 py-6 bg-pink-500 text-white font-black text-4xl rounded-2xl transition-all duration-300 transform hover:scale-110 hover:-rotate-2 active:scale-95 shadow-[0_10px_0px_#9d174d] border-4 border-pink-300 active:shadow-none active:translate-y-2 overflow-hidden mb-6"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Play fill="currentColor" /> PLAY NOW
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              {/* Pulsing Ring */}
              <div className="absolute inset-0 rounded-2xl border-4 border-pink-200 opacity-0 group-hover:animate-ping" />
            </button>

            {/* Asset Lab Button */}
            <button
              onClick={() => setShowAssetLab(true)}
              className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-500 transition flex items-center gap-2 animate-slide-up"
              style={{animationDelay: '0.3s'}}
            >
              <Palette size={20} /> SKIN CREATOR
            </button>

            {/* Mini Chart */}
            <div className="mt-8 w-64 h-24 opacity-60 animate-slide-up" style={{animationDelay: '0.4s'}}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={[{v:2}, {v:5}, {v:3}, {v:8}, {v:4}, {v:9}, {v:6}]}>
                   <Bar dataKey="v" fill="#FACC15" radius={[4,4,0,0]} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
          
          {/* Mute Toggle on Menu */}
          <button onClick={toggleMute} className="absolute top-6 right-6 p-3 bg-black/50 rounded-full backdrop-blur-md hover:bg-black/70 transition">
             {muted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>
      )}

      {/* ASSET LAB OVERLAY */}
      {showAssetLab && (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-gray-800 p-8 rounded-3xl border-4 border-purple-500 shadow-2xl relative">
            <button 
              onClick={() => !generating && setShowAssetLab(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <VolumeX className="rotate-45" size={32} /> {/* Close X icon workaround */}
            </button>
            
            <h2 className="text-3xl font-black text-purple-400 mb-2 uppercase flex items-center gap-2">
              <Palette /> Asset Lab
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Enter a theme to generate custom game icons using Gemini Nano.
            </p>
            
            <input
              type="text"
              value={assetPrompt}
              onChange={(e) => setAssetPrompt(e.target.value)}
              placeholder="e.g., Space, Sushi, Cats, Horror..."
              className="w-full bg-black text-white p-4 rounded-xl border-2 border-gray-600 focus:border-purple-500 outline-none text-xl font-bold mb-4 placeholder-gray-600"
            />
            
            <button 
              onClick={handleGenerateAssets}
              disabled={generating || !assetPrompt}
              className="w-full py-4 bg-purple-600 rounded-xl font-black text-xl hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {generating ? <Loader className="animate-spin" /> : <ImageIcon />} 
              {generating ? 'GENERATING...' : 'GENERATE ASSETS'}
            </button>

            {customAssets && !generating && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                 <div className="bg-black p-2 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1 text-center uppercase">Primary</div>
                    <img src={customAssets.primary} className="w-full h-24 object-contain bg-white/5 rounded" alt="Gen 1" />
                 </div>
                 <div className="bg-black p-2 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1 text-center uppercase">Secondary</div>
                    <img src={customAssets.secondary} className="w-full h-24 object-contain bg-white/5 rounded" alt="Gen 2" />
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSTRUCTION */}
      {gameState === GameState.INSTRUCTION && (
        <div className="w-full h-full flex items-center justify-center bg-pink-600 z-50 absolute top-0 left-0 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent animate-pulse" />
          <div className="relative z-10 animate-zoom-in">
            <h1 className="text-7xl md:text-9xl font-black text-white text-center leading-none drop-shadow-[8px_8px_0px_rgba(0,0,0,0.3)] -rotate-3">
              {activeGameDef.instruction}
            </h1>
            <div className="mt-4 flex justify-center space-x-2">
              <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}} />
              <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
              <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
            </div>
          </div>
        </div>
      )}

      {/* GAMEPLAY */}
      {(gameState === GameState.PLAYING || gameState === GameState.RESULT) && (
        <div className="w-full h-full relative flex flex-col bg-gray-900 animate-fade-in">
          {/* TOP BAR */}
          <div className="h-16 bg-black flex items-center justify-between px-4 z-20 border-b-4 border-gray-800">
             <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={28} fill={i < lives ? "#EF4444" : "none"} className={`${i < lives ? 'text-red-500 animate-pulse-fast' : 'text-gray-700'}`} />
                ))}
             </div>
             <div className="flex items-center gap-4">
               <button onClick={toggleMute} className="text-gray-500 hover:text-white transition">
                 {muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
               </button>
               <div className="flex items-center gap-2">
                 <span className="text-xs text-gray-500 uppercase font-bold">Score</span>
                 <div className="text-3xl font-black font-mono text-yellow-400">
                   {score}
                 </div>
               </div>
             </div>
          </div>
          
          {/* TIMER */}
          <div className="w-full h-6 bg-gray-800 relative z-20">
            <div 
              className={`h-full transition-all duration-75 ease-linear ${timeLeft < 30 ? 'bg-red-500' : 'bg-cyan-400'}`} 
              style={{ width: `${timeLeft}%` }} 
            />
          </div>

          {/* GAME AREA */}
          <div className="flex-1 relative overflow-hidden">
            <ActiveGameComponent 
              difficulty={difficulty} 
              onComplete={handleGameComplete} 
              isActive={gameState === GameState.PLAYING}
              assets={customAssets}
            />
            
            {/* OVERLAY RESULT */}
            {gameState === GameState.RESULT && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-75">
                 <div className={`text-8xl font-black transform -rotate-6 animate-pop drop-shadow-[0_10px_0px_rgba(0,0,0,0.5)] ${gameResult === 'WIN' ? 'text-green-400' : 'text-red-500'}`}>
                   {gameResult === 'WIN' ? 'GOOD!' : 'MISS!'}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === GameState.GAME_OVER && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-6 text-center overflow-hidden">
          <h2 className="text-red-500 font-black text-7xl mb-2 animate-bounce-in" style={{ textShadow: '6px 6px 0px #7f1d1d' }}>
            GAME OVER
          </h2>
          <div className="text-white text-3xl mb-8 font-bold animate-slide-up" style={{animationDelay: '0.2s'}}>
            Score: <span className="text-yellow-400 text-5xl">{score}</span>
          </div>
          
          <div className="w-full max-w-sm bg-gray-800/80 rounded-2xl p-6 mb-8 border-2 border-gray-700 backdrop-blur animate-slide-up" style={{animationDelay: '0.4s'}}>
            <h3 className="text-gray-400 uppercase text-xs font-black mb-4 tracking-widest flex items-center justify-center gap-2">
              <Trophy size={14} /> Leaderboard
            </h3>
            <div className="space-y-3">
              {highScores.map((entry, idx) => (
                <div key={idx} className="flex justify-between text-lg font-bold border-b border-gray-700 pb-2 last:border-0">
                  <span className="text-gray-400">#{idx + 1}</span>
                  <span className="text-white">{entry.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={startGame}
            className="group px-12 py-4 bg-white text-black font-black text-xl rounded-full hover:bg-yellow-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl animate-slide-up"
            style={{animationDelay: '0.6s'}}
          >
            <RotateCcw size={24} className="group-hover:rotate-180 transition-transform duration-500" /> TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}