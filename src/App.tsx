import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Star, Zap, Brain, RotateCcw, Lock, Coins, Heart, Eye, Target, MessageSquare, Clock, Trophy } from 'lucide-react';
import './App.css';

// --- Types & Constants ---
const VERSION = "v4.0.0";
const MULTIPLICATION_STATE_KEY = 'owen_overworld_math_v4';
const USER_STATS_KEY = 'owen_overworld_stats_v4';
const QUEST_LOG_KEY = 'owen_overworld_quests_v4';

type GameType = 'FactFluency' | 'ContextClues' | 'FocusForest' | 'AdvocacyCastle' | 'LexiaLink';

interface UserStats {
  xp: number;
  coins: number;
  level: number;
  inventory: string[];
}

interface MathQuestion {
  id: string;
  type: 'Multiplication' | 'Division';
  question: string;
  answer: string;
  correctCount: number;
  incorrectCount: number;
}

// --- Utilities ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const getLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;

const generateAllMultiplicationQuestions = (): MathQuestion[] => {
  const questions: MathQuestion[] = [];
  for (let i = 1; i <= 12; i++) {
    for (let j = 1; j <= 12; j++) {
      questions.push({
        id: `mul-${i}-${j}`,
        type: 'Multiplication',
        question: `${i} × ${j}`,
        answer: (i * j).toString(),
        correctCount: 0,
        incorrectCount: 0,
      });
      questions.push({
        id: `div-${i * j}-${i}`,
        type: 'Division',
        question: `${i * j} ÷ ${i}`,
        answer: j.toString(),
        correctCount: 0,
        incorrectCount: 0,
      });
    }
  }
  return questions;
};

const isQuestionSatisfied = (q: MathQuestion) => q.correctCount >= q.incorrectCount + 1;

// --- Components ---

function OverworldHUD({ stats, multiplier }: { stats: UserStats, multiplier: number }) {
  return (
    <div className="bg-black border-b-8 border-white p-6 sticky top-0 z-40 pixel-font text-white flex justify-between items-center overflow-x-auto gap-8">
      <div className="flex flex-col gap-1 shrink-0">
        <p className="text-blue-400 text-[10px]">TRAINER OWEN</p>
        <div className="flex items-center gap-4">
          <span className="text-xl">LV.{stats.level}</span>
          <div className="w-32 h-4 bg-gray-800 border-2 border-white relative">
            <div className="h-full bg-blue-500" style={{ width: `${(stats.xp % 100)}%` }}></div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center shrink-0">
        <p className="text-yellow-400 text-[10px]">COINS</p>
        <p className="text-xl flex items-center gap-2">
          <Coins className="text-yellow-400 fill-yellow-400" /> {stats.coins}
          {multiplier > 1 && <span className="text-green-400 text-xs">x{multiplier}</span>}
        </p>
      </div>

      <div className="flex gap-4 shrink-0">
        {stats.inventory.includes('glasses') && <Eye className="text-green-400" title="Super Glasses Active" />}
        {stats.inventory.includes('fireflower') && <Zap className="text-orange-500 fill-orange-500" title="Focus Active" />}
      </div>
    </div>
  );
}

function MorningPowerUp({ multiplier, onComplete }: { multiplier: number, onComplete: (items: string[]) => void }) {
  const [tasks, setTasks] = useState([
    { id: 'glasses', text: 'Glasses are ON', icon: Eye, done: false },
    { id: 'seat', text: 'Ready to move closer', icon: Target, done: false },
    { id: 'focus', text: 'Goal: No computer distractions', icon: Clock, done: false },
    { id: 'humor', text: 'Jokes saved for the right time', icon: MessageSquare, done: false },
  ]);

  const allDone = tasks.every(t => t.done);

  return (
    <div className="max-w-2xl mx-auto my-12 bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] pixel-font relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-red-600 text-white p-2 text-[8px] uppercase">Daily Quest</div>
      <h2 className="text-xl mb-8 uppercase flex items-center gap-4">
        <Heart className="fill-red-600 text-red-600 animate-pulse" /> Morning Buffs
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {tasks.map(t => (
          <button 
            key={t.id}
            onClick={() => setTasks(tasks.map(task => task.id === t.id ? { ...task, done: !task.done } : task))}
            className={`flex items-center gap-4 p-4 border-4 border-black transition-all ${t.done ? 'bg-green-100' : 'bg-white hover:bg-gray-50'}`}
          >
            <div className={`w-10 h-10 border-4 border-black flex items-center justify-center shrink-0 ${t.done ? 'bg-green-500' : 'bg-white'}`}>
              <t.icon size={20} className={t.done ? 'text-white' : 'text-black'} />
            </div>
            <span className={`text-[10px] text-left leading-tight uppercase ${t.done ? 'line-through text-gray-400' : 'text-black'}`}>
              {t.text}
            </span>
          </button>
        ))}
      </div>

      {allDone && (
        <button 
          onClick={() => onComplete(tasks.map(t => t.id))}
          className="w-full mario-brick bg-yellow-500 text-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce uppercase text-sm"
        >
          Activate 2x Multiplier!
        </button>
      )}
    </div>
  );
}

interface WorldCardProps {
  id: GameType;
  title: string;
  world: string;
  icon: any;
  color: string;
  desc: string;
  onSelect: (id: GameType) => void;
}

function WorldCard({ id, title, world, icon: Icon, color, desc, onSelect }: WorldCardProps) {
  return (
    <button 
      onClick={() => onSelect(id)}
      className="mario-card group relative bg-white border-8 border-black p-6 flex flex-col items-center text-center h-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
    >
      <span className="absolute -top-4 left-4 bg-black text-white text-[8px] px-2 py-1 uppercase">{world}</span>
      <div className={`p-6 rounded-lg mb-4 border-4 border-black ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={40} className="text-black" />
      </div>
      <h3 className="text-sm font-black text-black mb-2 uppercase pixel-font">{title}</h3>
      <p className="text-[8px] text-gray-500 uppercase leading-relaxed mb-4">{desc}</p>
      <div className="mt-auto pt-4 w-full border-t-4 border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-blue-600 font-bold uppercase italic">Enter World</span>
      </div>
    </button>
  );
}

// --- Main Application ---

export default function App() {
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem(USER_STATS_KEY);
    if (saved) return JSON.parse(saved);
    return { xp: 0, coins: 0, level: 1, inventory: [] };
  });

  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [lastQuestDate, setLastQuestDate] = useState(() => {
    const saved = localStorage.getItem(QUEST_LOG_KEY);
    return saved ? JSON.parse(saved).date : '';
  });

  // Persist Stats
  useEffect(() => {
    localStorage.setItem(USER_STATS_KEY, JSON.stringify({
      ...stats,
      level: getLevel(stats.xp)
    }));
  }, [stats]);

  const addRewards = (xp: number, coins: number) => {
    setStats(prev => ({
      ...prev,
      xp: prev.xp + xp,
      coins: prev.coins + (coins * multiplier)
    }));
  };

  const handleMorningComplete = (items: string[]) => {
    setMultiplier(2);
    setStats(prev => ({ ...prev, inventory: Array.from(new Set([...prev.inventory, ...items])) }));
    const today = new Date().toDateString();
    setLastQuestDate(today);
    localStorage.setItem(QUEST_LOG_KEY, JSON.stringify({ date: today }));
  };

  const isQuestDoneToday = lastQuestDate === new Date().toDateString();

  return (
    <div className="min-h-screen sky-bg pixel-font pb-20 selection:bg-red-600 selection:text-white relative flex flex-col">
      <OverworldHUD stats={stats} multiplier={multiplier} />

      <div className="bg-black py-2 overflow-hidden whitespace-nowrap z-10">
        <div className="animate-marquee inline-block">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-white text-[8px] uppercase mx-8 tracking-tighter">
              ★ SUPER OWEN OVERWORLD ★ MISSION: TRIMESTER 3 MASTERY ★ WITTY & CURIOUS ★
            </span>
          ))}
        </div>
      </div>

      <header className="pt-16 pb-8 px-6 text-center z-10">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-black border-4 border-white translate-x-2 translate-y-2"></div>
          <div className="relative bg-[#e76d42] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-2xl md:text-4xl text-white leading-tight uppercase tracking-tighter">
              SUPER <br /> OWEN HUB
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 z-10 flex-1">
        {!isQuestDoneToday && (
          <MorningPowerUp multiplier={multiplier} onComplete={handleMorningComplete} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <WorldCard 
            id="FactFluency"
            world="World 1"
            title="Fact Fortress"
            desc="Master Mul & Div to move from 2 -> 4!"
            icon={Zap}
            color="bg-yellow-400"
            onSelect={setActiveGame}
          />
          <WorldCard 
            id="ContextClues"
            world="World 2"
            title="Context Caves"
            desc="Solve word mysteries with text clues."
            icon={Brain}
            color="bg-green-400"
            onSelect={setActiveGame}
          />
          <WorldCard 
            id="FocusForest"
            world="World 3"
            title="Focus Forest"
            desc="Stay on task & complete assignments."
            icon={Clock}
            color="bg-orange-500"
            onSelect={setActiveGame}
          />
          <WorldCard 
            id="AdvocacyCastle"
            world="World 4"
            title="Advocacy Castle"
            desc="Self-advocacy & Social cue mastery."
            icon={Shield}
            color="bg-red-500"
            onSelect={setActiveGame}
          />
          <WorldCard 
            id="LexiaLink"
            world="Bonus"
            title="Lexia Power"
            desc="15-20 Mins of reading mastery."
            icon={Star}
            color="bg-purple-500"
            onSelect={setActiveGame}
          />
        </div>
      </main>

      {/* Game Overlays - To be modularized or kept here */}
      {activeGame === 'FactFluency' && (
        <FactFluencyGame 
          multiplier={multiplier} 
          onExit={() => setActiveGame(null)} 
          onReward={addRewards} 
        />
      )}
      
      {activeGame === 'FocusForest' && (
        <FocusTimer 
          onExit={() => setActiveGame(null)} 
          onComplete={() => {
            addRewards(500, 50);
            setActiveGame(null);
          }} 
        />
      )}

      {activeGame === 'LexiaLink' && (
        <LexiaOverlay onExit={() => setActiveGame(null)} />
      )}

      {(activeGame === 'ContextClues' || activeGame === 'AdvocacyCastle') && (
        <MasteryGame 
          id={activeGame} 
          onExit={() => setActiveGame(null)} 
          onReward={addRewards} 
        />
      )}

      <footer className="mt-32 border-t-8 border-black mario-ground py-20 px-6 relative shrink-0">
         <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
            <div className="w-24 h-40 mario-pipe mx-auto mb-8"></div>
            <p className="text-lg uppercase mb-4">You are growing, Owen!</p>
            <p className="text-[8px] uppercase mb-8">"Commendable progress in SEL skills." - Trimester 2</p>
            <p className="text-white/50 text-[10px] uppercase tracking-widest italic">{VERSION}</p>
            <button 
              onClick={() => {
                if (confirm("Owen, do you want to start your quest from the beginning?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="mt-8 bg-black border-4 border-white text-white text-[8px] px-4 py-2 hover:bg-red-600 transition-colors uppercase"
            >
              Reset Overworld
            </button>
         </div>
      </footer>
    </div>
  );
}

// --- Specific Game Implementations ---

function MasteryGame({ id, onExit, onReward }: { id: GameType, onExit: () => void, onReward: (xp: number, coins: number) => void }) {
  const [problem, setProblem] = useState(() => generateProblem(id));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<any>(null);

  const handleAnswer = (val: string) => {
    if (feedback !== 'idle' || !problem) return;
    clearInterval(timerRef.current);

    const isCorrect = val.trim().toLowerCase() === problem.answer.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      onReward(20, 15);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      
      if (nextProgress >= 5) {
        setTimeout(() => {
          alert("QUEST COMPLETE! You're getting stronger, Owen!");
          onExit();
        }, 800);
        return;
      }
    }

    setTimeout(() => {
      setProblem(generateProblem(id));
      setTimeLeft(15);
      setFeedback('idle');
    }, 800);
  };

  useEffect(() => {
    if (feedback === 'idle' && problem) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleAnswer("TIMEOUT");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [feedback, problem]);

  return (
    <BattleUI 
      gameId={id}
      problem={problem}
      feedback={feedback}
      progress={progress}
      totalProgress={5}
      timeLeft={timeLeft}
      onExit={onExit}
      onAnswer={handleAnswer}
      totalTimeLimit={15}
    />
  );
}

function FactFluencyGame({ onExit, onReward, multiplier }: { onExit: () => void, onReward: (xp: number, coins: number) => void, multiplier: number }) {
  const [questions, setQuestions] = useState<MathQuestion[]>(() => {
    const saved = localStorage.getItem(MULTIPLICATION_STATE_KEY);
    if (saved) return JSON.parse(saved);
    return generateAllMultiplicationQuestions();
  });

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [timeLeft, setTimeLeft] = useState(15);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  const pickNext = useCallback((qs: MathQuestion[]) => {
    const remaining = qs.filter(q => !isQuestionSatisfied(q));
    if (remaining.length === 0) return null;
    return remaining[getRandomInt(0, remaining.length - 1)];
  }, []);

  const handleAnswer = (val: string) => {
    if (feedback !== 'idle' || !currentQuestion) return;
    clearInterval(timerRef.current);
    
    const isCorrect = val.trim() === currentQuestion.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) onReward(10, 10);

    const updated = questions.map(q => q.id === currentQuestion.id ? {
      ...q,
      correctCount: isCorrect ? q.correctCount + 1 : q.correctCount,
      incorrectCount: isCorrect ? q.incorrectCount : q.incorrectCount + 1
    } : q);

    setQuestions(updated);
    localStorage.setItem(MULTIPLICATION_STATE_KEY, JSON.stringify(updated));

    setTimeout(() => {
      const next = pickNext(updated);
      if (next) {
        setCurrentQuestion(next);
        setTimeLeft(difficulty || 15);
        setFeedback('idle');
      } else {
        alert("WORLD CLEAR! You mastered all facts!");
        onExit();
      }
    }, 800);
  };

  useEffect(() => {
    if (difficulty && !currentQuestion) setCurrentQuestion(pickNext(questions));
  }, [difficulty, pickNext, questions, currentQuestion]);

  useEffect(() => {
    if (difficulty && feedback === 'idle' && currentQuestion) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleAnswer('WRONG');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [difficulty, feedback, currentQuestion]);

  if (!difficulty) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font">
        <div className="bg-white border-8 border-black p-10 max-w-md text-center">
          <h2 className="text-xl mb-4">SELECT DIFFICULTY</h2>
          <div className="grid gap-4">
            <button onClick={() => setDifficulty(15)} className="mario-brick bg-green-500 text-white p-4">W 1-1 (15s)</button>
            <button onClick={() => setDifficulty(10)} className="mario-brick bg-yellow-500 text-white p-4">W 1-2 (10s)</button>
            <button onClick={() => setDifficulty(5)} className="mario-brick bg-orange-500 text-white p-4">W 1-3 (5s)</button>
          </div>
          <button onClick={onExit} className="mt-8 text-[8px] text-gray-400">Exit Fortress</button>
        </div>
      </div>
    );
  }

  return (
    <BattleUI 
      gameId="FactFluency"
      problem={currentQuestion}
      feedback={feedback}
      score={0}
      progress={questions.filter(isQuestionSatisfied).length}
      totalProgress={questions.length}
      timeLeft={timeLeft}
      isGameOver={false}
      onExit={onExit}
      onAnswer={handleAnswer}
      totalTimeLimit={difficulty}
    />
  );
}

function FocusTimer({ onExit, onComplete }: { onExit: () => void, onComplete: () => void }) {
  const [seconds, setSeconds] = useState(600); // 10 minutes
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0) {
      onComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, onComplete]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font">
      <div className="bg-white border-8 border-black p-10 max-w-md text-center">
        <h2 className="text-xl mb-4">FOCUS FOREST</h2>
        <p className="text-[8px] text-gray-500 uppercase mb-8 leading-tight">
          "Stay focused on your task until the timer reaches zero. No switching tabs!"
        </p>
        <div className="text-6xl mb-8">{formatTime(seconds)}</div>
        <button 
          onClick={() => setIsActive(!isActive)}
          className={`w-full mario-brick text-white p-6 mb-4 ${isActive ? 'bg-red-500' : 'bg-green-500'}`}
        >
          {isActive ? 'PAUSE MISSION' : 'START FOCUS'}
        </button>
        <button onClick={onExit} className="text-[8px] text-gray-400 uppercase">Return to Overworld</button>
      </div>
    </div>
  );
}

function LexiaOverlay({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font">
      <div className="bg-white border-8 border-black p-10 max-w-md text-center">
         <h2 className="text-xl mb-4 text-purple-600">LEXIA POWER-UP</h2>
         <p className="text-[8px] uppercase mb-8 leading-tight text-gray-500">Teacher: "Dedicate 15-20 mins a few times a week to Lexia to accelerate reading fluency."</p>
         <button onClick={() => window.open('https://www.lexiacore5.com/', '_blank')} className="mario-brick bg-purple-600 text-white text-xs px-8 py-4 mb-4 block w-full border-4 border-black">OPEN LEXIA</button>
         <button onClick={onExit} className="text-[8px] uppercase text-gray-400">Back to Overworld</button>
      </div>
    </div>
  );
}

function BattleUI({ gameId, problem, feedback, progress, totalProgress, timeLeft, onExit, onAnswer, totalTimeLimit }: any) {
  const [inputValue, setInputValue] = useState('');
  const [isJumping, setIsJumping] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (feedback === 'idle' && !isStarting) {
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [feedback, problem?.question, isStarting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== 'idle' || !inputValue.trim()) return;
    setIsJumping(true);
    onAnswer(inputValue.trim().toLowerCase());
    setTimeout(() => setIsJumping(false), 500);
  };

  if (!problem && !isStarting) return null;

  if (isStarting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sky-bg pixel-font text-center">
        <div className="bg-white border-8 border-black p-10 max-w-lg shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)]">
          <h2 className="text-2xl mb-4 uppercase">Ready, Owen?</h2>
          <p className="text-[10px] text-gray-500 mb-8 leading-tight uppercase">"Your ideas are ALREADY good enough! Let's just do the first one."</p>
          <button onClick={() => setIsStarting(false)} className="mario-brick bg-green-500 text-white text-xl px-12 py-6 animate-bounce">START MISSION</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sky-bg pixel-font overflow-hidden">
      <div className="p-8 flex justify-between items-start text-white text-xl z-20">
        <div className="text-left">
          <p className="text-[10px] text-blue-400 mb-2">{gameId.toUpperCase()}</p>
          <p className="flex items-center gap-2 text-sm">
            <Trophy size={16} className="text-yellow-400" /> {progress}/{totalProgress}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-yellow-400 mb-2">TIME</p>
          <p className={timeLeft < 5 ? 'text-red-500 animate-pulse' : ''}>{timeLeft}</p>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center pb-32">
        <div className={`mb-12 transform transition-all ${feedback === 'wrong' ? 'shake' : ''}`}>
           <div className="bg-white border-8 border-black p-8 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] text-center relative max-w-md mx-auto">
              <h2 className="text-2xl text-black leading-tight uppercase">{problem.question}</h2>
              {feedback === 'correct' && (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 coin-animate">
                   <Coins size={60} className="text-yellow-400 fill-yellow-400" />
                </div>
              )}
           </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-sm px-4">
           <input
             ref={inputRef}
             type="text"
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             disabled={feedback !== 'idle'}
             placeholder="???"
             className="w-full bg-white border-8 border-black p-6 text-2xl text-center text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none mb-8 placeholder:opacity-20 uppercase"
           />
           <button type="submit" className="mario-brick bg-red-600 text-white text-xl px-12 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all uppercase">SUBMIT</button>
        </form>

        <div className={`absolute bottom-32 left-8 md:left-20 transition-all duration-300 ${isJumping ? 'mario-jump' : ''}`}>
           <div className="w-16 h-20 bg-red-600 border-4 border-black relative rounded-sm flex items-center justify-center">
              <div className="absolute top-0 w-full h-8 bg-red-800"></div>
              <div className="absolute top-4 w-12 h-8 bg-pink-200 rounded-sm"></div>
              <div className="absolute bottom-4 w-full h-8 bg-blue-600"></div>
              <span className="text-white text-[8px] z-10 font-bold">O</span>
           </div>
        </div>
      </div>

      <div className="h-32 w-full mario-ground shrink-0"></div>
      <button onClick={onExit} className="fixed bottom-4 right-4 p-4 bg-green-500 border-4 border-black text-white z-30"><RotateCcw size={24} /></button>
    </div>
  );
}
