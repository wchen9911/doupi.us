import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Star, Zap, Brain, RotateCcw, Lock, Coins, Heart } from 'lucide-react';
import './App.css';

// --- Types ---
type GradeRange = string;
type GameType = 'FactFluency' | 'ContextClues' | 'ScienceLab' | 'DailyQuest' | 'LexiaLink';

interface GameInfo {
  id: GameType;
  title: string;
  grades: GradeRange;
  icon: any;
  color: string;
  reportContext: string;
}

interface MathQuestion {
  id: string;
  type: 'Multiplication' | 'Division';
  question: string;
  answer: string;
  correctCount: number;
  incorrectCount: number;
}

const GAMES: GameInfo[] = [
  { 
    id: 'FactFluency', 
    title: 'Fluency Fortress', 
    grades: 'Math Fact 2 -> 3', 
    icon: Zap, 
    color: 'bg-yellow-400',
    reportContext: "Teacher says: 'Play games to practice fact fluency!'"
  },
  { 
    id: 'ContextClues', 
    title: 'Context Cave', 
    grades: 'Reading 2 -> 3', 
    icon: Brain, 
    color: 'bg-green-400',
    reportContext: "Master the meaning of words using clues."
  },
  { 
    id: 'ScienceLab', 
    title: 'Science Sage', 
    grades: 'Proficient (4)', 
    icon: Star, 
    color: 'bg-blue-400',
    reportContext: "You excel at arguing organism survival!"
  },
  { 
    id: 'DailyQuest', 
    title: 'Daily Quest', 
    grades: 'Self-Advocacy', 
    icon: Shield, 
    color: 'bg-red-500',
    reportContext: "Glasses? Desk move? You have a standing invitation!"
  },
  { 
    id: 'LexiaLink', 
    title: 'Lexia Power', 
    grades: '15-20 Mins', 
    icon: Zap, 
    color: 'bg-purple-500',
    reportContext: "Daily practice for reading & phonics."
  },
];

const STORAGE_KEY = 'owen_math_unlock_level';
const MULTIPLICATION_STATE_KEY = 'owen_math_multiplication_state_v2';
const QUEST_LOG_KEY = 'owen_daily_quest_v1';
const VERSION = "v3.0.0";
const DEFAULT_TIME_LIMIT = 10;

// --- Math Utilities ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

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

const generateProblem = (type: GameType) => {
  let prob: any;
  switch (type) {
    case 'FactFluency': return null;
    case 'ContextClues': {
      const clues = [
        { q: "The sun was so [blank] I had to wear glasses.", a: "bright" },
        { q: "Owen is very [blank] and tells great jokes.", a: "witty" },
        { q: "I used a [blank] to see the tiny bacteria.", a: "microscope" },
        { q: "The [blank] of the mountain was covered in snow.", a: "peak" },
        { q: "He felt [blank] after getting a 4 on his test.", a: "proud" },
        { q: "The [blank] old man gave us some candy.", a: "kind" },
        { q: "The cat was very [blank] and hid under the bed.", a: "shy" },
        { q: "I was [blank] because I didn't get enough sleep.", a: "tired" }
      ];
      const selected = clues[getRandomInt(0, clues.length - 1)];
      prob = { question: selected.q, answer: selected.a };
      break;
    }
    case 'ScienceLab': {
      const science = [
        { q: "Organisms with thick fur survive in the [blank].", a: "cold" },
        { q: "Deserts have very little [blank].", a: "water" },
        { q: "Plants get energy from the [blank].", a: "sun" },
        { q: "A [blank] is an animal that only eats plants.", a: "herbivore" },
        { q: "The study of Earth is called [blank].", a: "geography" },
        { q: "Animals that eat both plants and meat are [blank].", a: "omnivore" },
        { q: "The [blank] is the natural home of an organism.", a: "habitat" }
      ];
      const selected = science[getRandomInt(0, science.length - 1)];
      prob = { question: selected.q, answer: selected.a };
      break;
    }
    default:
      prob = { question: "1 + 1", answer: "2" };
  }
  return prob;
};

// --- Components ---

function DailyQuestLog() {
  const [quests, setQuests] = useState(() => {
    const saved = localStorage.getItem(QUEST_LOG_KEY);
    const today = new Date().toDateString();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) return parsed.items;
      } catch (e) {}
    }
    return [
      { id: 'glasses', text: 'I have my glasses on!', done: false },
      { id: 'seating', text: 'I will move closer if I can\'t see!', done: false },
      { id: 'joke', text: 'I will share jokes at the RIGHT time!', done: false },
      { id: 'focus', text: 'I will start my task right away!', done: false },
    ];
  });

  const toggleQuest = (id: string) => {
    const newQuests = quests.map((q: any) => q.id === id ? { ...q, done: !q.done } : q);
    setQuests(newQuests);
    localStorage.setItem(QUEST_LOG_KEY, JSON.stringify({ date: new Date().toDateString(), items: newQuests }));
  };

  return (
    <div className="max-w-xl mx-auto mb-12 bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] pixel-font">
      <h2 className="text-xl mb-6 uppercase text-red-600 flex items-center gap-4">
        <Heart className="animate-pulse fill-red-600" /> Morning Buffs
      </h2>
      <div className="space-y-4 text-left">
        {quests.map((q: any) => (
          <div key={q.id} onClick={() => toggleQuest(q.id)} className="flex items-center gap-4 cursor-pointer group">
            <div className={`w-8 h-8 border-4 border-black flex items-center justify-center shrink-0 ${q.done ? 'bg-green-500' : 'bg-white'}`}>
               {q.done && <span className="text-white text-xs">✔</span>}
            </div>
            <span className={`text-[10px] uppercase leading-tight ${q.done ? 'line-through text-gray-400' : 'text-black'}`}>
              {q.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BattleUIProps {
  gameId: GameType;
  problem: any;
  feedback: 'idle' | 'correct' | 'wrong';
  score: number;
  progress: number;
  totalProgress?: number;
  timeLeft: number;
  isGameOver: boolean;
  onExit: () => void;
  onAnswer: (answer: string) => void;
  totalTimeLimit?: number;
}

function BattleUI({ gameId, problem, feedback, score, progress, totalProgress = 20, timeLeft, isGameOver, onExit, onAnswer, totalTimeLimit = DEFAULT_TIME_LIMIT }: BattleUIProps) {
  const [inputValue, setInputValue] = useState('');
  const [isJumping, setIsJumping] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (feedback === 'idle' && !isGameOver && !isStarting) {
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [feedback, isGameOver, problem.question, isStarting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== 'idle' || isGameOver || !inputValue.trim()) return;
    setIsJumping(true);
    onAnswer(inputValue.trim().toLowerCase());
    setTimeout(() => setIsJumping(false), 500);
  };

  if (isStarting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sky-bg pixel-font">
        <div className="w-full max-w-lg bg-white border-8 border-black p-10 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] text-center">
          <h2 className="text-2xl font-black text-black mb-4 uppercase leading-tight">FOCUS POWER-UP!</h2>
          <p className="text-gray-500 text-[10px] mb-8 uppercase leading-tight">
            "Owen, your ideas are ALREADY good enough! Let's start with just one."
          </p>
          <button
            onClick={() => setIsStarting(false)}
            className="mario-brick bg-green-500 text-white text-xl px-12 py-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none animate-bounce uppercase"
          >
            START TASK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sky-bg pixel-font overflow-hidden">
      {/* HUD */}
      <div className="p-8 flex justify-between items-start text-white text-xl z-20">
        <div className="text-left">
          <p className="mb-2">OWEN</p>
          <p>{score.toString().padStart(6, '0')}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="mb-2">PROGRESS</p>
          <p className="flex items-center gap-2">
            <Coins className="text-yellow-400" /> {progress}/{totalProgress}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-2">TIME</p>
          <p className={timeLeft < 5 ? 'text-red-500 animate-pulse' : ''}>{timeLeft}</p>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center pb-32">
        <div className={`mb-12 transform transition-all ${feedback === 'wrong' ? 'shake' : ''}`}>
           <div className="bg-white border-8 border-black p-8 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] text-center relative max-w-md mx-auto">
              <p className="text-gray-400 text-[10px] mb-4 uppercase tracking-tighter">Question Block</p>
              <h2 className="text-xl md:text-2xl text-black leading-tight uppercase">{problem.question}</h2>
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
             disabled={feedback !== 'idle' || isGameOver}
             autoFocus
             placeholder="???"
             className="w-full bg-white border-8 border-black p-6 text-2xl text-center text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none mb-8 placeholder:opacity-20 uppercase"
           />
           <button
             type="submit"
             disabled={feedback !== 'idle' || isGameOver || !inputValue.trim()}
             className="mario-brick text-white text-xl px-12 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none hover:-translate-y-1 transition-all uppercase"
           >
             SUBMIT
           </button>
        </form>

        {/* Owen Character - Moved to side */}
        <div className={`absolute bottom-32 left-8 md:left-20 transition-all duration-300 ${isJumping ? 'mario-jump' : ''}`}>
           <div className="w-16 h-20 bg-red-600 border-4 border-black relative rounded-sm flex items-center justify-center">
              <div className="absolute top-0 w-full h-8 bg-red-800"></div>
              <div className="absolute top-4 w-12 h-8 bg-pink-200 rounded-sm"></div>
              <div className="absolute bottom-4 w-full h-8 bg-blue-600"></div>
              <span className="text-white text-xs z-10 font-bold">O</span>
           </div>
        </div>
      </div>

      <div className="h-32 w-full mario-ground shrink-0"></div>
      <button onClick={onExit} className="fixed bottom-4 right-4 p-4 bg-green-500 border-4 border-black text-white hover:bg-green-400 z-30"><RotateCcw size={24} /></button>
    </div>
  );
}

function GameCard({ game, onSelect, isLocked }: { game: GameInfo; onSelect: (id: GameType) => void; isLocked: boolean }) {
  return (
    <div 
      onClick={() => !isLocked && onSelect(game.id)}
      className={`mario-card relative ${isLocked ? 'locked' : 'cursor-pointer group'}`}
    >
      <div className={`relative bg-white border-8 border-black p-6 flex flex-col items-center text-center h-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all`}>
        <div className={`p-4 rounded-lg shrink-0 ${isLocked ? 'bg-gray-400' : 'mario-question-block'} border-4 border-black mb-4`}>
          {isLocked ? <Lock size={40} className="text-black" /> : <game.icon size={40} className="text-black" />}
        </div>
        <h3 className="text-[10px] font-black text-black mb-2 uppercase pixel-font leading-tight shrink-0">{game.title}</h3>
        <p className="text-[8px] text-gray-400 uppercase pixel-font mb-4 shrink-0">{game.grades}</p>
        <div className="mt-auto border-t-4 border-gray-100 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <p className="text-[7px] text-blue-600 uppercase italic leading-tight">{game.reportContext}</p>
        </div>
      </div>
    </div>
  );
}

function FactFluencyGame({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const gameId = 'FactFluency';
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [questions, setQuestions] = useState<MathQuestion[]>(() => {
    const saved = localStorage.getItem(MULTIPLICATION_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return generateAllMultiplicationQuestions();
  });

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const pickNextQuestion = useCallback((qs: MathQuestion[]) => {
    const remaining = qs.filter(q => !isQuestionSatisfied(q));
    if (remaining.length === 0) return null;
    return remaining[getRandomInt(0, remaining.length - 1)];
  }, []);

  useEffect(() => {
    setProgress(questions.filter(isQuestionSatisfied).length);
  }, [questions]);

  const startBattle = (seconds: number) => {
    setDifficulty(seconds);
    setTimeLeft(seconds);
    const next = pickNextQuestion(questions);
    if (next) {
      setCurrentQuestion(next);
    } else {
      setIsGameOver(true);
      onComplete();
    }
  };

  const moveToNext = (updatedQs: MathQuestion[]) => {
    const next = pickNextQuestion(updatedQs);
    if (next) {
      setCurrentQuestion(next);
      setTimeLeft(difficulty || 10);
      setFeedback('idle');
    } else {
      setIsGameOver(true);
      setTimeout(() => onComplete(), 1200);
    }
  };

  const handleTimeOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('wrong');

    setQuestions(prev => {
      const updated = prev.map(q => q.id === currentQuestion.id ? { ...q, incorrectCount: q.incorrectCount + 1 } : q);
      localStorage.setItem(MULTIPLICATION_STATE_KEY, JSON.stringify(updated));
      setTimeout(() => moveToNext(updated), 800);
      return updated;
    });
  }, [currentQuestion, pickNextQuestion, onComplete, difficulty]);

  useEffect(() => {
    if (!isGameOver && feedback === 'idle' && currentQuestion && difficulty !== null) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGameOver, feedback, handleTimeOut, currentQuestion, difficulty]);

  const handleAnswer = (val: string) => {
    if (feedback !== 'idle' || isGameOver || !currentQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const isCorrect = val.trim() === currentQuestion.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore(s => s + 100);

    setQuestions(prev => {
      const updated = prev.map(q => {
        if (q.id === currentQuestion.id) {
          return isCorrect 
            ? { ...q, correctCount: q.correctCount + 1 } 
            : { ...q, incorrectCount: q.incorrectCount + 1 };
        }
        return q;
      });
      localStorage.setItem(MULTIPLICATION_STATE_KEY, JSON.stringify(updated));
      setTimeout(() => moveToNext(updated), 800);
      return updated;
    });
  };

  if (difficulty === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sky-bg pixel-font">
        <div className="w-full max-w-md bg-white border-8 border-black p-10 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] text-center">
          <h2 className="text-xl font-black text-black mb-4 uppercase">WORLD SELECTION</h2>
          <p className="text-gray-500 text-[10px] mb-8 uppercase leading-tight">Practice Fact Fluency (Goal: Satisfactory!)</p>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'W 1-1 (15s)', time: 15, color: 'bg-green-500' },
              { label: 'W 1-2 (10s)', time: 10, color: 'bg-yellow-500' },
              { label: 'W 1-3 (5s)', time: 5, color: 'bg-orange-600' },
              { label: 'W 1-4 (3s)', time: 3, color: 'bg-red-700' }
            ].map((mode) => (
              <button key={mode.time} onClick={() => startBattle(mode.time)} className={`${mode.color} text-white text-[10px] py-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase`}>
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion && !isGameOver) return null;

  return <BattleUI gameId={gameId} problem={currentQuestion || { question: 'LEVEL CLEAR!' }} feedback={feedback} score={score} progress={progress} totalProgress={questions.length} timeLeft={timeLeft} isGameOver={isGameOver} onExit={onExit} onAnswer={handleAnswer} totalTimeLimit={difficulty} />;
}

function ReportAreaGame({ id, onExit, onComplete }: { id: GameType, onExit: () => void; onComplete: () => void }) {
  const [problem, setProblem] = useState(() => generateProblem(id));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const handleTimeOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('wrong');
    setTimeout(() => {
      setProblem(generateProblem(id));
      setTimeLeft(DEFAULT_TIME_LIMIT);
      setFeedback('idle');
    }, 800);
  }, [id]);

  useEffect(() => {
    if (!isGameOver && feedback === 'idle') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGameOver, feedback, handleTimeOut]);

  const handleAnswer = (val: string) => {
    if (feedback !== 'idle' || isGameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = val.trim().toLowerCase() === problem.answer.toLowerCase();
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 100);
      const newProgress = progress + 1;
      setProgress(newProgress);
      if (newProgress >= 10) {
        setIsGameOver(true);
        setTimeout(() => onComplete(), 1200);
      } else {
        setTimeout(() => {
          setProblem(generateProblem(id));
          setTimeLeft(DEFAULT_TIME_LIMIT);
          setFeedback('idle');
        }, 800);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => { setFeedback('idle'); setTimeLeft(DEFAULT_TIME_LIMIT); }, 800);
    }
  };

  return <BattleUI gameId={id} problem={problem} feedback={feedback} score={score} progress={progress} totalProgress={10} timeLeft={timeLeft} isGameOver={isGameOver} onExit={onExit} onAnswer={handleAnswer} />;
}

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);

  useEffect(() => {
    const storedLevel = localStorage.getItem(STORAGE_KEY);
    if (storedLevel) setUnlockedLevel(parseInt(storedLevel, 10));
  }, []);

  const handleComplete = useCallback(() => {
    const currentIndex = GAMES.findIndex(g => g.id === activeGame);
    if (currentIndex === unlockedLevel && unlockedLevel < GAMES.length - 1) {
      const newLevel = unlockedLevel + 1;
      setUnlockedLevel(newLevel);
      localStorage.setItem(STORAGE_KEY, newLevel.toString());
    }
    setActiveGame(null);
  }, [activeGame, unlockedLevel]);

  return (
    <div className="min-h-screen sky-bg pixel-font pb-20 selection:bg-red-600 selection:text-white relative">
      <div className="bg-black border-b-4 border-white py-2 overflow-hidden whitespace-nowrap relative z-10">
        <div className="animate-marquee inline-block">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-white text-[8px] uppercase mx-8 tracking-tighter">
              ★ TRIMESTER 3 QUEST ★ SUPER OWEN HUB ★ WITTY & CURIOUS ★
            </span>
          ))}
        </div>
      </div>

      <header className="pt-20 pb-12 px-6 text-center relative z-10">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-black border-4 border-white translate-x-2 translate-y-2"></div>
          <div className="relative bg-[#e76d42] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-2xl md:text-4xl text-white leading-tight uppercase tracking-tighter">
              SUPER <br /> OWEN QUEST
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 relative z-10">
        <DailyQuestLog />
        <div className="grid-5-cols">
          {GAMES.map((game, index) => (
            <GameCard key={game.id} game={game} onSelect={setActiveGame} isLocked={index > unlockedLevel} />
          ))}
        </div>
      </main>

      {activeGame === 'FactFluency' && <FactFluencyGame onExit={() => setActiveGame(null)} onComplete={handleComplete} />}
      {(activeGame === 'ContextClues' || activeGame === 'ScienceLab') && <ReportAreaGame id={activeGame} onExit={() => setActiveGame(null)} onComplete={handleComplete} />}
      {activeGame === 'LexiaLink' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md sky-bg pixel-font">
          <div className="bg-white border-8 border-black p-10 max-w-md text-center">
             <h2 className="text-xl mb-4">LEXia POWER-UP</h2>
             <p className="text-[10px] uppercase mb-8 leading-tight text-gray-500">Teacher: "Dedicate 15-20 mins a few times a week to Lexia to accelerate reading fluency."</p>
             <button onClick={() => window.open('https://www.lexiacore5.com/', '_blank')} className="mario-brick bg-purple-600 text-white text-xs px-8 py-4 mb-4 block w-full border-4 border-black">OPEN LEXIA</button>
             <button onClick={() => setActiveGame(null)} className="text-[8px] uppercase text-gray-400">Back to Hub</button>
          </div>
        </div>
      )}
      {activeGame === 'DailyQuest' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md sky-bg pixel-font">
          <div className="bg-white border-8 border-black p-10 max-w-md text-center">
             <h2 className="text-xl mb-4 text-red-600">DAILY QUESTS</h2>
             <p className="text-[10px] uppercase mb-8 leading-tight text-gray-500">"Active strategies to regulate energy and emotions."</p>
             <DailyQuestLog />
             <button onClick={() => setActiveGame(null)} className="mario-brick bg-green-500 text-white text-xs px-8 py-4 border-4 border-black block w-full uppercase">QUESTS COMPLETE</button>
          </div>
        </div>
      )}

      <footer className="mt-32 border-t-8 border-black mario-ground py-20 px-6 relative">
         <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
            <div className="w-24 h-40 mario-pipe mx-auto mb-8"></div>
            <p className="text-lg uppercase mb-4 text-white">Mastery in Sight!</p>
            <p className="text-[8px] uppercase mb-8 text-white/80">"Active strategies to regulate energy and emotions." - Trimester 2 Report</p>
            <p className="text-white/50 text-[10px] uppercase tracking-widest italic">{VERSION}</p>
            <button 
              onClick={() => {
                if (confirm("Reset all your progress? Owen, are you sure?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="mt-8 bg-black border-4 border-white text-white text-[8px] px-4 py-2 hover:bg-red-600 transition-colors uppercase"
            >
              Reset All Progress
            </button>
         </div>
      </footer>
    </div>
  );
}
