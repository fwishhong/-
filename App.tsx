import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ReflexHuntGame, 
  MemorySimonGame, 
  MathCompareGame, 
  VisualSpinGame, 
  LogicTrapGame,
  ActionMashGame, 
  ReflexMoleGame,
  ReactionWaitGame, 
  DirectionSwipeGame,
  AscendingOrderGame,
  SpatialFitGame,
  VisualOddGame,
  LogicMixGame,
  TimingChargeGame,
  VisualShadowGame,
  MemoryMatchGame
} from './components/MicroGames';
import { GameState, GameType, GameDefinition, ScoreEntry, AssetPack, Language } from './types';
import { RotateCcw, Trophy, Heart, Zap, Volume2, VolumeX, Play, Palette, Loader, Image as ImageIcon, Globe } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { GoogleGenAI, Modality } from "@google/genai";
import { sfx } from './sound';

// --- Game Registry ---
const GAMES: GameDefinition[] = [
  { type: GameType.REFLEX_HUNT, instructionEn: "FIND TARGET!", instructionCn: "寻找目标!", durationMs: 4500, Component: ReflexHuntGame },
  { type: GameType.MEMORY_SIMON, instructionEn: "MEMORIZE!", instructionCn: "记住顺序!", durationMs: 7000, Component: MemorySimonGame },
  { type: GameType.MATH_COMPARE, instructionEn: "BIGGER?", instructionCn: "哪个大?", durationMs: 4000, Component: MathCompareGame },
  { type: GameType.VISUAL_SPIN, instructionEn: "LOCK SHAPE!", instructionCn: "锁定形状!", durationMs: 5000, Component: VisualSpinGame },
  { type: GameType.LOGIC_TRAP, instructionEn: "JUDGE!", instructionCn: "判断!", durationMs: 3500, Component: LogicTrapGame },
  { type: GameType.ACTION_MASH, instructionEn: "PUMP IT!", instructionCn: "疯狂充气!", durationMs: 4000, Component: ActionMashGame },
  { type: GameType.REFLEX_MOLE, instructionEn: "WHACK!", instructionCn: "打地鼠!", durationMs: 4500, Component: ReflexMoleGame },
  { type: GameType.REACTION_WAIT, instructionEn: "DON'T PRESS!", instructionCn: "忍住别按!", durationMs: 3000, Component: ReactionWaitGame },
  { type: GameType.DIRECTION_SWIPE, instructionEn: "SWIPE!", instructionCn: "滑动!", durationMs: 3000, Component: DirectionSwipeGame },
  { type: GameType.MATH_ORDER, instructionEn: "1 - 2 - 3", instructionCn: "1 - 2 - 3", durationMs: 4500, Component: AscendingOrderGame },
  { type: GameType.SPATIAL_FIT, instructionEn: "FIT IT!", instructionCn: "形状匹配!", durationMs: 3500, Component: SpatialFitGame },
  { type: GameType.VISUAL_ODD, instructionEn: "FIND ODD!", instructionCn: "找不同!", durationMs: 4000, Component: VisualOddGame },
  { type: GameType.LOGIC_MIX, instructionEn: "MIX COLORS!", instructionCn: "混合颜色!", durationMs: 3500, Component: LogicMixGame },
  { type: GameType.TIMING_CHARGE, instructionEn: "CHARGE IT!", instructionCn: "充电!", durationMs: 4000, Component: TimingChargeGame },
  { type: GameType.VISUAL_SHADOW, instructionEn: "MATCH SHADOW!", instructionCn: "匹配影子!", durationMs: 4000, Component: VisualShadowGame },
  { type: GameType.MEMORY_MATCH, instructionEn: "MATCH PAIRS!", instructionCn: "匹配对子！", durationMs: 5000, Component: MemoryMatchGame },
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
  const [language, setLanguage] = useState<Language>('CN'); // Default to CN
  
  // --- Asset Lab State ---
  const [showAssetLab, setShowAssetLab] = useState(false);
  const [assetPrompt, setAssetPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [customAssets, setCustomAssets] = useState<AssetPack | null>(null);

  const difficulty = Math.min(10, Math.floor(score / 5) + 1);
  const speedMultiplier = 1 + (difficulty * 0.08); 
  const activeGameDef = GAMES[currentGameIndex % GAMES.length];

  // --- UI Text Dictionary ---
  const UI_TEXT = {
    EN: {
      subtitle: "Arcade Brain Training",
      playNow: "PLAY NOW",
      skinCreator: "SKIN CREATOR",
      score: "Score",
      good: "GOOD!",
      miss: "MISS!",
      gameOver: "GAME OVER",
      leaderboard: "Leaderboard",
      tryAgain: "TRY AGAIN",
      assetLab: "Asset Lab",
      enterTheme: "Enter a theme to generate custom game icons using Gemini Nano.",
      generate: "GENERATE ASSETS",
      generating: "GENERATING...",
      primary: "Primary",
      secondary: "Secondary",
      error: "Failed to generate images. Try a simpler prompt."
    },
    CN: {
      subtitle: "街机脑力训练",
      playNow: "开始游戏",
      skinCreator: "皮肤工坊",
      score: "分数",
      good: "不错!",
      miss: "失败!",
      gameOver: "游戏结束",
      leaderboard: "排行榜",
      tryAgain: "再来一次",
      assetLab: "资产实验室",
      enterTheme: "输入主题，使用 Gemini Nano 生成自定义游戏图标。",
      generate: "生成资产",
      generating: "生成中...",
      primary: "主要",
      secondary: "次要",
      error: "生成失败，请尝试更简单的提示词."
    }
  };

  const t = UI_TEXT[language];

  // --- Loops & Timers ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const startTime = Date.now();
    const duration = activeGameDef.durationMs / speedMultiplier;
    let lastTick = 0;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = 100 - (elapsed / duration) * 100;
      
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
  }, [gameState, activeGameDef, speedMultiplier]);

  const toggleMute = () => {
    sfx.playClick();
    sfx.muted = !sfx.muted;
    setMuted(sfx.muted);
  };

  const toggleLanguage = () => {
    sfx.playClick();
    setLanguage(prev => prev === 'EN' ? 'CN' : 'EN');
  };

  const startGame = () => {
    sfx.playClick();
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
  }, [currentGameIndex]); 

  const saveScore = () => {
    setHighScores(prev => {
      const newEntry = { date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), score: score };
      return [...prev, newEntry].sort((a,b) => b.score - a.score).slice(0, 5);
    });
  };

  const handleGenerateAssets = async () => {
    if (!assetPrompt.trim() || generating) return;
    sfx.playClick();
    setGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const primaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `A high quality, simple vector game icon of ${assetPrompt}. White background. Centered. bold colors.` }] },
        config: { responseModalities: [Modality.IMAGE] }
      });
      const secondaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `A high quality, simple vector game icon of something different from ${assetPrompt}, but matching the style. White background. Centered.` }] },
        config: { responseModalities: [Modality.IMAGE] }
      });

      const getBase64 = (resp: any) => {
        const p = resp.candidates?.[0]?.content?.parts?.[0];
        if (p?.inlineData) return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
        return '';
      };

      const primaryUrl = getBase64(primaryResponse);
      const secondaryUrl = getBase64(secondaryResponse);

      if (primaryUrl && secondaryUrl) {
        setCustomAssets({ themeName: assetPrompt, primary: primaryUrl, secondary: secondaryUrl });
        setShowAssetLab(false);
      } else {
        alert(t.error);
      }
    } catch (e) {
      console.error(e);
      alert(t.error);
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
            <p className="text-gray-300 mb-12 text-xl font-bold uppercase tracking-widest animate-slide-up" style={{animationDelay: '0.2s'}}>{t.subtitle}</p>
            
            <button 
              onClick={startGame}
              className="group relative px-12 py-6 bg-pink-500 text-white font-black text-4xl rounded-2xl transition-all duration-300 transform hover:scale-110 hover:-rotate-2 active:scale-95 shadow-[0_10px_0px_#9d174d] border-4 border-pink-300 active:shadow-none active:translate-y-2 overflow-hidden mb-6"
            >
              <span className="relative z-10 flex items-center gap-3"><Play fill="currentColor" /> {t.playNow}</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="absolute inset-0 rounded-2xl border-4 border-pink-200 opacity-0 group-hover:animate-ping" />
            </button>

            <button
              onClick={() => { sfx.playClick(); setShowAssetLab(true); }}
              className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-500 transition flex items-center gap-2 animate-slide-up"
              style={{animationDelay: '0.3s'}}
            >
              <Palette size={20} /> {t.skinCreator}
            </button>

            <div className="mt-8 w-64 h-24 opacity-60 animate-slide-up" style={{animationDelay: '0.4s'}}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={[{v:2}, {v:5}, {v:3}, {v:8}, {v:4}, {v:9}, {v:6}]}>
                   <Bar dataKey="v" fill="#FACC15" radius={[4,4,0,0]} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
          
          <div className="absolute top-6 right-6 flex gap-3">
            <button onClick={toggleLanguage} className="p-3 bg-black/50 rounded-full backdrop-blur-md hover:bg-black/70 transition font-bold w-12 h-12 flex items-center justify-center border border-white/20">
               {language}
            </button>
            <button onClick={toggleMute} className="p-3 bg-black/50 rounded-full backdrop-blur-md hover:bg-black/70 transition border border-white/20">
               {muted ? <VolumeX /> : <Volume2 />}
            </button>
          </div>
        </div>
      )}

      {/* ASSET LAB OVERLAY */}
      {showAssetLab && (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full bg-gray-800 p-8 rounded-3xl border-4 border-purple-500 shadow-2xl relative">
            <button 
              onClick={() => { if(!generating) { sfx.playClick(); setShowAssetLab(false); } }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <VolumeX className="rotate-45" size={32} />
            </button>
            
            <h2 className="text-3xl font-black text-purple-400 mb-2 uppercase flex items-center gap-2"><Palette /> {t.assetLab}</h2>
            <p className="text-gray-400 mb-6 text-sm">{t.enterTheme}</p>
            
            <input
              type="text"
              value={assetPrompt}
              onChange={(e) => setAssetPrompt(e.target.value)}
              placeholder="e.g., Space, Sushi, Horror..."
              className="w-full bg-black text-white p-4 rounded-xl border-2 border-gray-600 focus:border-purple-500 outline-none text-xl font-bold mb-4 placeholder-gray-600"
            />
            
            <button 
              onClick={handleGenerateAssets}
              disabled={generating || !assetPrompt}
              className="w-full py-4 bg-purple-600 rounded-xl font-black text-xl hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {generating ? <Loader className="animate-spin" /> : <ImageIcon />} 
              {generating ? t.generating : t.generate}
            </button>

            {customAssets && !generating && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                 <div className="bg-black p-2 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1 text-center uppercase">{t.primary}</div>
                    <img src={customAssets.primary} className="w-full h-24 object-contain bg-white/5 rounded" alt="Gen 1" />
                 </div>
                 <div className="bg-black p-2 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1 text-center uppercase">{t.secondary}</div>
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
              {language === 'CN' ? activeGameDef.instructionCn : activeGameDef.instructionEn}
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
          <div className="h-16 bg-black flex items-center justify-between px-4 z-20 border-b-4 border-gray-800">
             <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={28} fill={i < lives ? "#EF4444" : "none"} className={`${i < lives ? 'text-red-500 animate-pulse-fast' : 'text-gray-700'}`} />
                ))}
             </div>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t.score}</span>
                 <div className="text-3xl font-black font-mono text-yellow-400">
                   {score}
                 </div>
               </div>
             </div>
          </div>
          
          <div className="w-full h-6 bg-gray-800 relative z-20">
            <div 
              className={`h-full transition-all duration-75 ease-linear ${timeLeft < 30 ? 'bg-red-500' : 'bg-cyan-400'}`} 
              style={{ width: `${timeLeft}%` }} 
            />
          </div>

          <div className="flex-1 relative overflow-hidden">
            <ActiveGameComponent 
              difficulty={difficulty} 
              score={score}
              onComplete={handleGameComplete} 
              isActive={gameState === GameState.PLAYING}
              assets={customAssets}
              language={language}
            />
            
            {gameState === GameState.RESULT && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-75">
                 <div className={`text-8xl font-black transform -rotate-6 animate-pop drop-shadow-[0_10px_0px_rgba(0,0,0,0.5)] ${gameResult === 'WIN' ? 'text-green-400' : 'text-red-500'}`}>
                   {gameResult === 'WIN' ? t.good : t.miss}
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
            {t.gameOver}
          </h2>
          <div className="text-white text-3xl mb-8 font-bold animate-slide-up" style={{animationDelay: '0.2s'}}>
            {t.score}: <span className="text-yellow-400 text-5xl">{score}</span>
          </div>
          
          <div className="w-full max-w-sm bg-gray-800/80 rounded-2xl p-6 mb-8 border-2 border-gray-700 backdrop-blur animate-slide-up" style={{animationDelay: '0.4s'}}>
            <h3 className="text-gray-400 uppercase text-xs font-black mb-4 tracking-widest flex items-center justify-center gap-2">
              <Trophy size={14} /> {t.leaderboard}
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
            <RotateCcw size={24} className="group-hover:rotate-180 transition-transform duration-500" /> {t.tryAgain}
          </button>
        </div>
      )}
    </div>
  );
}