import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Swords, Star, Zap, Brain, Trophy, RotateCcw, ChevronRight, Lock } from 'lucide-react';
import './App.css';

// --- Types ---
type GradeRange = string;
type GameType = 'Multiplication' | 'Fraction' | 'Decimal' | 'PEMDAS' | 'Algebra';

interface GameInfo {
  id: GameType;
  title: string;
  grades: GradeRange;
  icon: any;
  color: string;
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
  { id: 'Multiplication', title: 'Mul & Div', grades: 'Grades 2-4', icon: Zap, color: 'bg-yellow-400' },
  { id: 'Fraction', title: 'Fraction Quest', grades: 'Grades 4-6', icon: Star, color: 'bg-blue-400' },
  { id: 'Decimal', title: 'Decimal Dash', grades: 'Grades 4-6', icon: Brain, color: 'bg-green-400' },
  { id: 'PEMDAS', title: 'PEMDAS Puzzle', grades: 'Grades 5-6', icon: Swords, color: 'bg-red-500' },
  { id: 'Algebra', title: 'Algebra Arena', grades: 'Grades 6+', icon: Shield, color: 'bg-purple-500' },
];

const STORAGE_KEY = 'owen_math_unlock_level';
const MULTIPLICATION_STATE_KEY = 'owen_math_multiplication_state_v2';
const VERSION = "v1.3.0";
const TIME_LIMIT = 20;

// --- Math Utilities ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateAllMultiplicationQuestions = (): MathQuestion[] => {
  const questions: MathQuestion[] = [];
  for (let i = 1; i <= 12; i++) {
    for (let j = 1; j <= 12; j++) {
      // Multiplication
      questions.push({
        id: `mul-${i}-${j}`,
        type: 'Multiplication',
        question: `${i} × ${j} = ?`,
        answer: (i * j).toString(),
        correctCount: 0,
        incorrectCount: 0,
      });
      // Division
      questions.push({
        id: `div-${i * j}-${i}`,
        type: 'Division',
        question: `${i * j} ÷ ${i} = ?`,
        answer: j.toString(),
        correctCount: 0,
        incorrectCount: 0,
      });
    }
  }
  return questions;
};

const isQuestionSatisfied = (q: MathQuestion) => q.correctCount >= q.incorrectCount + 1;

const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const simplifyFraction = (n: number, d: number): [number, number] => {
  const common = Math.abs(gcd(n, d));
  return [n / common, d / common];
};

const generateOptions = (answer: string, type: string): string[] => {
  const options = new Set<string>();
  options.add(answer);
  
  while (options.size < 6) {
    let wrong: string;
    const isFraction = answer.includes('/');
    
    if (isFraction) {
      const [n, d] = answer.split('/').map(Number);
      const offset = getRandomInt(-3, 3);
      if (offset === 0) continue;
      const newN = Math.max(1, n + offset);
      wrong = `${newN}/${d}`;
    } else {
      const correctNum = parseFloat(answer);
      const offset = (type === 'Decimal') ? (getRandomInt(-20, 20) / 10) : getRandomInt(-10, 10);
      if (offset === 0) continue;
      wrong = (type === 'Decimal') ? Math.max(0.1, correctNum + offset).toFixed(1) : Math.max(0, Math.round(correctNum + offset)).toString();
    }
    
    if (wrong !== answer) {
      options.add(wrong);
    }
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
};

const generateProblem = (type: GameType) => {
  let prob: any;
  switch (type) {
    case 'Multiplication': {
      // This is now handled inside MultiplicationGame
      return null;
    }
    case 'Fraction': {
      const den = getRandomInt(2, 8);
      let n1 = getRandomInt(1, den);
      let n2 = getRandomInt(1, den);
      const op = Math.random() > 0.5 ? '+' : '-';
      if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
      const resN = op === '+' ? n1 + n2 : n1 - n2;
      const [sn, sd] = simplifyFraction(resN, den);
      prob = { 
        question: `${n1}/${den} ${op} ${n2}/${den} = ?`, 
        answer: `${sn}/${sd}`, 
        rawAnswer: `${resN}/${den}`,
        placeholder: "n/d (simplified)" 
      };
      break;
    }
    case 'Decimal': {
      const a = (getRandomInt(10, 100) / 10).toFixed(1);
      const b = (getRandomInt(10, 100) / 10).toFixed(1);
      const op = Math.random() > 0.5 ? '+' : '-';
      const ans = op === '+' ? parseFloat(a) + parseFloat(b) : parseFloat(a) - parseFloat(b);
      prob = { question: `${a} ${op} ${b} = ?`, answer: ans.toFixed(1), placeholder: "0.0" };
      break;
    }
    case 'PEMDAS': {
      const a = getRandomInt(2, 10);
      const b = getRandomInt(2, 10);
      const c = getRandomInt(2, 5);
      const useParen = Math.random() > 0.5;
      if (useParen) {
        prob = { question: `(${a} + ${b}) × ${c} = ?`, answer: ((a + b) * c).toString(), placeholder: "Result" };
      } else {
        prob = { question: `${a} + ${b} × ${c} = ?`, answer: (a + b * c).toString(), placeholder: "Result" };
      }
      break;
    }
    case 'Algebra': {
      const x = getRandomInt(1, 10);
      const a = getRandomInt(2, 5);
      const b = getRandomInt(1, 15);
      const c = a * x + b;
      prob = { question: `${a}x + ${b} = ${c}, x = ?`, answer: x.toString(), placeholder: "x = ?" };
      break;
    }
    default:
      prob = { question: "1 + 1 = ?", answer: "2", placeholder: "" };
  }
  return { ...prob, options: generateOptions(prob.answer, type) };
};

// --- Components ---

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
  onAnswer: (option: string) => void;
  totalTimeLimit?: number;
}

function BattleUI({ gameId, problem, feedback, score, progress, totalProgress = 20, timeLeft, isGameOver, onExit, onAnswer, totalTimeLimit = TIME_LIMIT }: BattleUIProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md battle-overlay">
      <div className="w-full max-w-lg bg-white border-8 border-gray-900 rounded-[3rem] p-8 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] relative overflow-hidden">
        {/* PokeBall Header */}
        <div className="absolute top-0 left-0 w-full h-32 bg-red-600 border-b-8 border-gray-900 -z-10"></div>
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-24 h-24 bg-white border-8 border-gray-900 rounded-full flex items-center justify-center -z-10">
          <div className="w-12 h-12 border-4 border-gray-900 rounded-full bg-gray-200"></div>
        </div>
        
        <div className="flex justify-between items-start mb-10">
          <div className="bg-yellow-400 border-4 border-gray-900 px-4 py-1 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <span className="text-xl font-black italic">LV. {Math.floor(score / 10) + 1}</span>
          </div>
          <div className="bg-white border-4 border-gray-900 px-4 py-1 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <span className="text-lg font-black uppercase">Goal: {progress}/{totalProgress}</span>
          </div>
          <button 
            onClick={onExit}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-6 bg-gray-200 border-4 border-gray-900 rounded-full mb-8 overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${
              timeLeft > 10 ? 'bg-green-400' : timeLeft > 5 ? 'bg-yellow-400' : 'bg-red-500'
            }`}
            style={{ width: `${(timeLeft / totalTimeLimit) * 100}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-[10px] font-black uppercase italic">Time Left: {timeLeft}s</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className={`bg-gray-100 border-8 border-gray-900 rounded-[2rem] p-10 w-full mb-8 text-center shadow-inner relative overflow-hidden transition-all ${
            feedback === 'correct' ? 'bg-green-100 border-green-700' : 
            feedback === 'wrong' ? 'bg-red-100 border-red-700' : ''
          }`}>
            <div className="absolute top-2 left-2 flex gap-1">
              {[...Array(3)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-gray-400"></div>)}
            </div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 wild-appear">
              {feedback === 'correct' ? 'Excellent!' : feedback === 'wrong' ? 'Try Again!' : 'Wild Problem Appears!'}
            </p>
            <h2 className={`text-5xl font-black text-gray-900 tracking-tighter ${feedback === 'wrong' ? 'shake' : ''}`}>
              {problem.question}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {problem.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => onAnswer(option)}
                disabled={feedback !== 'idle' || isGameOver}
                className={`bg-white hover:bg-gray-100 text-gray-900 font-black text-2xl py-6 rounded-2xl border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase italic ${
                  feedback === 'correct' && (option === problem.answer || option === problem.rawAnswer) ? 'bg-green-400' : ''
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, onSelect, isLocked }: { game: GameInfo; onSelect: (id: GameType) => void; isLocked: boolean }) {
  return (
    <div 
      onClick={() => !isLocked && onSelect(game.id)}
      className={`pokemon-card relative ${isLocked ? 'locked' : 'cursor-pointer group'}`}
    >
      <div className={`absolute inset-0 ${isLocked ? 'bg-gray-400' : game.color} rounded-3xl opacity-20 ${!isLocked && 'group-hover:opacity-40'} transition-opacity border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}></div>
      <div className={`relative bg-white border-4 border-gray-900 rounded-3xl p-6 flex flex-col items-center text-center h-full`}>
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-4 border-gray-900 bg-gray-100 flex items-center justify-center opacity-30">
          <div className="w-4 h-4 rounded-full bg-gray-400"></div>
        </div>
        <div className={`p-4 rounded-full ${isLocked ? 'bg-gray-400' : game.color} border-4 border-gray-900 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
          {isLocked ? <Lock size={40} className="text-gray-900" /> : <game.icon size={40} className="text-gray-900" />}
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tighter leading-none">{game.title}</h3>
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{game.grades}</p>
        {!isLocked && (
          <div className="mt-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black italic">BATTLE!</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiplicationGame({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const gameId = 'Multiplication';
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [questions, setQuestions] = useState<MathQuestion[]>(() => {
    const saved = localStorage.getItem(MULTIPLICATION_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        return generateAllMultiplicationQuestions();
      }
    }
    return generateAllMultiplicationQuestions();
  });

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const pickNextQuestion = useCallback((qs: MathQuestion[]) => {
    const remaining = qs.filter(q => !isQuestionSatisfied(q));
    if (remaining.length === 0) {
      return null;
    }
    const q = remaining[getRandomInt(0, remaining.length - 1)];
    return { ...q, options: generateOptions(q.answer, 'Multiplication') };
  }, []);

  // Initial progress setup
  useEffect(() => {
    setProgress(questions.filter(isQuestionSatisfied).length);
  }, []);

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
      setTimeLeft(difficulty || 20);
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

  const handleAnswer = (selectedOption: string) => {
    if (feedback !== 'idle' || isGameOver || !currentQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const isCorrect = selectedOption === currentQuestion.answer;
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore(s => s + 10);

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
      setProgress(updated.filter(isQuestionSatisfied).length);
      
      setTimeout(() => moveToNext(updated), 800);
      return updated;
    });
  };

  if (difficulty === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-white border-8 border-gray-900 rounded-[3rem] p-10 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Choose Difficulty</h2>
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs mb-8">How much time do you need per battle?</p>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'EASY (15s)', time: 15, color: 'bg-green-400' },
              { label: 'NORMAL (10s)', time: 10, color: 'bg-yellow-400' },
              { label: 'HARD (5s)', time: 5, color: 'bg-orange-500' },
              { label: 'TRAINER (3s)', time: 3, color: 'bg-red-600' }
            ].map((mode) => (
              <button
                key={mode.time}
                onClick={() => startBattle(mode.time)}
                className={`${mode.color} text-gray-900 font-black text-xl py-4 rounded-2xl border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase italic`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button 
            onClick={onExit}
            className="mt-8 text-gray-500 font-black uppercase tracking-widest text-xs hover:text-gray-900 transition-colors"
          >
            Cancel Battle
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion && !isGameOver) return null;

  return (
    <BattleUI 
      gameId={gameId} 
      problem={currentQuestion || { question: 'Done!', options: [] }} 
      feedback={feedback} 
      score={score} 
      progress={progress} 
      totalProgress={questions.length}
      timeLeft={timeLeft} 
      isGameOver={isGameOver} 
      onExit={onExit} 
      onAnswer={handleAnswer} 
      totalTimeLimit={difficulty}
    />
  );
}

function FractionGame({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const gameId = 'Fraction';
  const [problem, setProblem] = useState(() => generateProblem(gameId));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const handleTimeOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('wrong');
    setTimeout(() => {
      setProblem(generateProblem(gameId));
      setTimeLeft(TIME_LIMIT);
      setFeedback('idle');
    }, 800);
  }, [gameId]);

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

  const handleAnswer = (selectedOption: string) => {
    if (feedback !== 'idle' || isGameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = selectedOption === problem.answer || (problem.rawAnswer && selectedOption === problem.rawAnswer);
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 10);
      const newProgress = progress + 1;
      setProgress(newProgress);
      if (newProgress >= 20) {
        setIsGameOver(true);
        setTimeout(() => onComplete(), 1200);
      } else {
        setTimeout(() => {
          setProblem(generateProblem(gameId));
          setTimeLeft(TIME_LIMIT);
          setFeedback('idle');
        }, 800);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback('idle');
        setTimeLeft(TIME_LIMIT);
      }, 800);
    }
  };

  return <BattleUI gameId={gameId} problem={problem} feedback={feedback} score={score} progress={progress} timeLeft={timeLeft} isGameOver={isGameOver} onExit={onExit} onAnswer={handleAnswer} />;
}

function DecimalGame({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const gameId = 'Decimal';
  const [problem, setProblem] = useState(() => generateProblem(gameId));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const handleTimeOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('wrong');
    setTimeout(() => {
      setProblem(generateProblem(gameId));
      setTimeLeft(TIME_LIMIT);
      setFeedback('idle');
    }, 800);
  }, [gameId]);

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

  const handleAnswer = (selectedOption: string) => {
    if (feedback !== 'idle' || isGameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = selectedOption === problem.answer || (problem.rawAnswer && selectedOption === problem.rawAnswer);
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 10);
      const newProgress = progress + 1;
      setProgress(newProgress);
      if (newProgress >= 20) {
        setIsGameOver(true);
        setTimeout(() => onComplete(), 1200);
      } else {
        setTimeout(() => {
          setProblem(generateProblem(gameId));
          setTimeLeft(TIME_LIMIT);
          setFeedback('idle');
        }, 800);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback('idle');
        setTimeLeft(TIME_LIMIT);
      }, 800);
    }
  };

  return <BattleUI gameId={gameId} problem={problem} feedback={feedback} score={score} progress={progress} timeLeft={timeLeft} isGameOver={isGameOver} onExit={onExit} onAnswer={handleAnswer} />;
}

function PEMDASGame({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const gameId = 'PEMDAS';
  const [problem, setProblem] = useState(() => generateProblem(gameId));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const handleTimeOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('wrong');
    setTimeout(() => {
      setProblem(generateProblem(gameId));
      setTimeLeft(TIME_LIMIT);
      setFeedback('idle');
    }, 800);
  }, [gameId]);

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

  const handleAnswer = (selectedOption: string) => {
    if (feedback !== 'idle' || isGameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = selectedOption === problem.answer || (problem.rawAnswer && selectedOption === problem.rawAnswer);
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 10);
      const newProgress = progress + 1;
      setProgress(newProgress);
      if (newProgress >= 20) {
        setIsGameOver(true);
        setTimeout(() => onComplete(), 1200);
      } else {
        setTimeout(() => {
          setProblem(generateProblem(gameId));
          setTimeLeft(TIME_LIMIT);
          setFeedback('idle');
        }, 800);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback('idle');
        setTimeLeft(TIME_LIMIT);
      }, 800);
    }
  };

  return <BattleUI gameId={gameId} problem={problem} feedback={feedback} score={score} progress={progress} timeLeft={timeLeft} isGameOver={isGameOver} onExit={onExit} onAnswer={handleAnswer} />;
}

function AlgebraGame({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const gameId = 'Algebra';
  const [problem, setProblem] = useState(() => generateProblem(gameId));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef<any>(null);

  const handleTimeOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('wrong');
    setTimeout(() => {
      setProblem(generateProblem(gameId));
      setTimeLeft(TIME_LIMIT);
      setFeedback('idle');
    }, 800);
  }, [gameId]);

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

  const handleAnswer = (selectedOption: string) => {
    if (feedback !== 'idle' || isGameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = selectedOption === problem.answer || (problem.rawAnswer && selectedOption === problem.rawAnswer);
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 10);
      const newProgress = progress + 1;
      setProgress(newProgress);
      if (newProgress >= 20) {
        setIsGameOver(true);
        setTimeout(() => onComplete(), 1200);
      } else {
        setTimeout(() => {
          setProblem(generateProblem(gameId));
          setTimeLeft(TIME_LIMIT);
          setFeedback('idle');
        }, 800);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback('idle');
        setTimeLeft(TIME_LIMIT);
      }, 800);
    }
  };

  return <BattleUI gameId={gameId} problem={problem} feedback={feedback} score={score} progress={progress} timeLeft={timeLeft} isGameOver={isGameOver} onExit={onExit} onAnswer={handleAnswer} />;
}

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);

  useEffect(() => {
    const storedLevel = localStorage.getItem(STORAGE_KEY);
    if (storedLevel) {
      setUnlockedLevel(parseInt(storedLevel, 10));
    }
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
    <div className="min-h-screen bg-yellow-400 font-mono pb-20 selection:bg-red-600 selection:text-white">
      {/* Branding Banner */}
      <div className="bg-gray-900 border-b-4 border-red-600 py-3 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-white font-black text-xl uppercase mx-8 tracking-tighter flex items-center gap-4">
              <span className="text-red-600">★</span> Authorized Access: Owen Only <span className="text-red-600">★</span>
            </span>
          ))}
        </div>
      </div>

      <header className="pt-20 pb-20 px-6 text-center relative">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-24 h-24 border-8 border-gray-900 rounded-full opacity-10"></div>
        <div className="absolute top-40 right-20 w-16 h-16 border-8 border-gray-900 rotate-45 opacity-10"></div>
        
        <div className="relative inline-block">
          <div className="absolute -inset-6 bg-red-600 border-8 border-gray-900 rounded-[2rem] -rotate-2"></div>
          <div className="absolute -inset-6 bg-white border-8 border-gray-900 rounded-[2rem] rotate-1"></div>
          <h1 className="relative text-6xl md:text-8xl font-black text-gray-900 italic tracking-tighter uppercase leading-none">
            Owen's <br className="md:hidden" /> Math Hub
          </h1>
        </div>
        <div className="mt-8">
           <span className="bg-gray-900 text-white px-6 py-2 rounded-full text-lg font-black uppercase tracking-widest italic">Trainer Owen Edition</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        <div className="grid-5-cols">
          {GAMES.map((game, index) => (
            <GameCard 
              key={game.id} 
              game={game} 
              onSelect={setActiveGame} 
              isLocked={index > unlockedLevel}
            />
          ))}
        </div>
      </main>

      {activeGame === 'Multiplication' && (
        <MultiplicationGame 
          onExit={() => setActiveGame(null)} 
          onComplete={handleComplete}
        />
      )}
      {activeGame === 'Fraction' && (
        <FractionGame 
          onExit={() => setActiveGame(null)} 
          onComplete={handleComplete}
        />
      )}
      {activeGame === 'Decimal' && (
        <DecimalGame 
          onExit={() => setActiveGame(null)} 
          onComplete={handleComplete}
        />
      )}
      {activeGame === 'PEMDAS' && (
        <PEMDASGame 
          onExit={() => setActiveGame(null)} 
          onComplete={handleComplete}
        />
      )}
      {activeGame === 'Algebra' && (
        <AlgebraGame 
          onExit={() => setActiveGame(null)} 
          onComplete={handleComplete}
        />
      )}

      {/* Footer Decoration */}
      <footer className="mt-32 border-t-8 border-gray-900 bg-red-600 py-20 px-6 overflow-hidden relative">
         <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="w-20 h-20 bg-white border-8 border-gray-900 rounded-full mx-auto mb-8 flex items-center justify-center">
               <div className="w-8 h-8 bg-gray-200 border-4 border-gray-900 rounded-full"></div>
            </div>
            <p className="text-white font-black text-2xl uppercase tracking-tighter mb-2 italic">Gotta Solve 'Em All!</p>
            <p className="text-white font-black text-xl uppercase tracking-tighter mb-4 italic">Owen's Hub {VERSION}</p>
            <div className="flex justify-center gap-4">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="w-12 h-12 bg-white/20 border-4 border-white/40 rounded-full"></div>
               ))}
            </div>
         </div>
         {/* Abstract background circles */}
         <div className="absolute -bottom-20 -left-20 w-64 h-64 border-[16px] border-black/10 rounded-full"></div>
         <div className="absolute -top-20 -right-20 w-80 h-80 border-[24px] border-black/10 rounded-full"></div>
      </footer>
    </div>
  );
}
