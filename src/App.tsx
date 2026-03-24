import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Star, Zap, Brain, RotateCcw, Lock, Coins, Heart, Eye, Target, MessageSquare, Clock, Trophy, Music } from 'lucide-react';
import './App.css';

// --- Types & Constants ---
const VERSION = "v4.3.3";
const MULTIPLICATION_STATE_KEY = 'owen_overworld_math_v4';
const USER_STATS_KEY = 'owen_overworld_stats_v4';
const QUEST_LOG_KEY = 'owen_overworld_quests_v4';
const ACTIVITY_HISTORY_KEY = 'owen_overworld_history_v4';
const TOTP_SECRET = "JBSWY3DPEBLW64TMMQ"; 

type GameType = 'FactFluency' | 'ContextClues' | 'FocusForest' | 'AdvocacyCastle' | 'LexiaLink' | 'PianoPractice' | 'Journal' | 'Admin';

interface UserStats {
  xp: number;
  coins: number;
  level: number;
  inventory: string[];
}

interface ActivityEntry {
  [date: string]: {
    [activity: string]: number;
  };
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
const getTodayKey = () => new Date().toDateString();

function base32tohex(base32: string) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substr(i, 4);
    hex = hex + parseInt(chunk, 2).toString(16);
  }
  return hex;
}

async function getTOTPCode(secret: string) {
  try {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const time = Math.floor(epoch / 30).toString(16).padStart(16, '0');
    const hexSecret = base32tohex(secret);
    const keyBytes = new Uint8Array(hexSecret.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const timeBytes = new Uint8Array(time.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const cryptoKey = await window.crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, timeBytes);
    const hmac = new Uint8Array(signature);
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
    return (code % 1000000).toString().padStart(6, '0');
  } catch (e) { return null; }
}

const generateAllMultiplicationQuestions = (): MathQuestion[] => {
  const questions: MathQuestion[] = [];
  for (let i = 1; i <= 12; i++) {
    for (let j = 1; j <= 12; j++) {
      questions.push({ id: `mul-${i}-${j}`, type: 'Multiplication', question: `${i} × ${j}`, answer: (i * j).toString(), correctCount: 0, incorrectCount: 0 });
      questions.push({ id: `div-${i * j}-${i}`, type: 'Division', question: `${i * j} ÷ ${i}`, answer: j.toString(), correctCount: 0, incorrectCount: 0 });
    }
  }
  return questions;
};

const isQuestionSatisfied = (q: MathQuestion) => q.correctCount >= q.incorrectCount + 1;

const generateProblem = (type: string) => {
  if (type === 'ContextClues') {
    const clues = [
      { q: "The sun was so [blank] I had to wear glasses.", a: "bright" },
      { q: "Owen is very [blank] and tells great jokes.", a: "witty" },
      { q: "I used a [blank] to see the tiny bacteria.", a: "microscope" },
      { q: "The [blank] of the mountain was covered in snow.", a: "peak" },
      { q: "He felt [blank] after getting a 4 on his test.", a: "proud" }
    ];
    return clues[getRandomInt(0, clues.length - 1)];
  }
  if (type === 'AdvocacyCastle') {
    const scenarios = [
      { q: "I can't see the board well. What should I do?", a: "move closer" },
      { q: "I forgot my [blank] at home. I need them to see.", a: "glasses" },
      { q: "The teacher is talking. Is it joke time? (yes/no)", a: "no" },
      { q: "I have a 'standing [blank]' to move closer anytime.", a: "invitation" }
    ];
    return scenarios[getRandomInt(0, scenarios.length - 1)];
  }
  return { question: "1 + 1", answer: "2" };
};

// --- Components ---

function OverworldHUD({ stats, multiplier, onOpenJournal, onOpenAdmin }: any) {
  return (
    <div className="bg-black border-b-8 border-white p-6 sticky top-0 z-40 pixel-font text-white flex justify-between items-center overflow-x-auto gap-8 shrink-0">
      <div className="flex flex-col gap-1 shrink-0 cursor-pointer" onClick={onOpenAdmin}>
        <p className="text-blue-400 text-[10px]">TRAINER OWEN</p>
        <div className="flex items-center gap-4">
          <span className="text-xl">LV.{stats.level}</span>
          <div className="w-32 h-4 bg-gray-800 border-2 border-white relative"><div className="h-full bg-blue-500" style={{ width: `${(stats.xp % 100)}%` }}></div></div>
        </div>
      </div>
      <div className="flex items-center gap-8 shrink-0">
        <div className="flex flex-col items-center">
          <p className="text-yellow-400 text-[10px]">COINS</p>
          <p className="text-xl flex items-center gap-2"><Coins className="text-yellow-400 fill-yellow-400" /> {stats.coins}{multiplier > 1 && <span className="text-green-400 text-xs">x{multiplier}</span>}</p>
        </div>
        <button onClick={onOpenJournal} className="bg-white text-black p-2 border-4 border-black hover:bg-yellow-400 transition-colors flex flex-col items-center gap-1"><Clock size={20} /><span className="text-[8px] uppercase">Journal</span></button>
      </div>
      <div className="flex gap-4 shrink-0">{stats.inventory.includes('glasses') && <Eye className="text-green-400" />}{stats.inventory.includes('focus') && <Zap className="text-orange-500 fill-orange-500" />}</div>
    </div>
  );
}

function AdminPanel({ stats, history, onUpdateStats, onUpdateHistory, onExit }: any) {
  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<'Stats' | 'History' | 'Nuclear'>('Stats');
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = await getTOTPCode(TOTP_SECRET);
    if (code === expected) setIsVerified(true);
    else { alert("Invalid Authenticator Code!"); setCode(''); }
  };
  if (!isVerified) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 sky-bg pixel-font">
      <div className="bg-white border-8 border-black p-10 max-w-md text-center text-black">
        <h2 className="text-xl mb-8 uppercase text-black">Admin Access</h2>
        <form onSubmit={handleVerify}>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" className="w-full border-4 border-black p-4 mb-8 text-center text-xl focus:outline-none" autoFocus />
          <button type="submit" className="w-full bg-red-600 text-white p-4 border-4 border-black uppercase text-xs font-bold">Verify Code</button>
        </form>
        <div className="mt-12 p-4 bg-gray-100 border-2 border-black text-[6px] uppercase leading-tight text-black">
           Scan in Google Authenticator:<br /><span className="font-bold text-blue-600 break-all">{TOTP_SECRET}</span><br />
           <a href={`https://quickchart.io/chart?cht=qr&chs=200x200&chl=otpauth://totp/SuperOwen:Admin?secret=${TOTP_SECRET}%26issuer=SuperOwen`} target="_blank" rel="noreferrer" className="underline mt-2 block italic text-red-600">Get QR Code</a>
        </div>
        <button onClick={onExit} className="mt-8 text-[8px] text-gray-400 uppercase underline">Cancel</button>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 sky-bg pixel-font">
      <div className="bg-white border-8 border-black p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-black">
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4 text-black text-left"><h2 className="text-xl uppercase flex items-center gap-2 text-black font-bold"><Target className="text-red-600" /> Admin Console</h2><button onClick={onExit} className="text-red-600 uppercase text-xs">[ Exit ]</button></div>
        <div className="flex gap-4 mb-8 text-black">
          {['Stats', 'History', 'Nuclear'].map((t: any) => (<button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 border-4 border-black text-[10px] uppercase font-bold ${activeTab === t ? 'bg-yellow-400' : 'bg-gray-100'}`}>{t}</button>))}
        </div>
        {activeTab === 'Stats' && (
          <div className="space-y-6 text-black text-left">
            <div className="grid grid-cols-2 gap-8 text-black">
              <div><label className="text-[8px] uppercase block mb-2 text-black font-bold">Coins</label><input type="number" value={stats.coins} onChange={(e) => onUpdateStats({ ...stats, coins: parseInt(e.target.value) || 0 })} className="w-full border-4 border-black p-2 text-black" /></div>
              <div><label className="text-[8px] uppercase block mb-2 text-black font-bold">XP</label><input type="number" value={stats.xp} onChange={(e) => onUpdateStats({ ...stats, xp: parseInt(e.target.value) || 0 })} className="w-full border-4 border-black p-2 text-black" /></div>
            </div>
            <div>
              <label className="text-[8px] uppercase block mb-2 text-black font-bold">Inventory</label>
              <div className="flex gap-4">
                {['glasses', 'focus'].map(item => (<button key={item} onClick={() => { const newInv = stats.inventory.includes(item) ? stats.inventory.filter((i: string) => i !== item) : [...stats.inventory, item]; onUpdateStats({ ...stats, inventory: newInv }); }} className={`p-4 border-4 border-black uppercase text-[8px] font-bold ${stats.inventory.includes(item) ? 'bg-green-400' : 'bg-gray-100'}`}>{item}</button>))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'History' && (
          <div className="space-y-4 text-black text-left">
            {Object.entries(history).map(([date, data]: any) => (
              <div key={date} className="border-4 border-black p-4 text-black mb-4">
                <div className="text-[10px] uppercase border-b-2 border-black mb-4 pb-2 text-black font-bold">{date}</div>
                {Object.entries(data).map(([act, mins]: any) => (
                  <div key={act} className="flex justify-between items-center mb-2 text-black">
                    <span className="text-[8px] uppercase text-black">{act}</span>
                    <input type="number" value={Math.round(mins)} onChange={(e) => { const newHistory = { ...history }; newHistory[date][act] = parseInt(e.target.value) || 0; onUpdateHistory(newHistory); }} className="w-16 border-2 border-black p-1 text-[8px] text-black" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Nuclear' && (
          <div className="p-8 text-center bg-red-50 border-4 border-red-600 text-black">
            <h3 className="text-red-600 mb-4 uppercase text-sm font-bold">Nuclear Option</h3>
            <p className="text-[8px] mb-8 uppercase text-gray-500">This will wipe ALL progress. No undo.</p>
            <button onClick={() => { if (confirm("Destroy EVERYTHING?")) { localStorage.clear(); window.location.reload(); } }} className="bg-red-600 text-white p-6 border-4 border-black uppercase text-xs hover:bg-red-700 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Destroy Data</button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestJournal({ history, onExit }: any) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate(); const offset = new Date(year, month, 1).getDay();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 sky-bg pixel-font">
      <div className="bg-white border-8 border-black p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-black text-center">
        <div className="flex justify-between items-center mb-8"><h2 className="text-xl uppercase font-bold text-black">Quest Journal</h2><button onClick={onExit} className="text-red-600 uppercase text-xs font-bold text-black">[ Close ]</button></div>
        <div className="flex justify-between items-center mb-4 text-xs uppercase text-black"><button onClick={() => setViewDate(new Date(year, month - 1))}>&lt; Prev</button><span className="font-bold text-black">{viewDate.toLocaleString('default', { month: 'long' })} {year}</span><button onClick={() => setViewDate(new Date(year, month + 1))}>Next &gt;</button></div>
        <div className="grid grid-cols-7 gap-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[10px] text-gray-400 font-bold">{d}</div>)}
          {[...Array(offset)].map((_, i) => <div key={`off-${i}`}></div>)}
          {[...Array(days)].map((_, i) => {
            const dStr = new Date(year, month, i + 1).toDateString(); const data = history[dStr];
            const total = data ? Object.values(data).reduce((a: any, b: any) => a + b, 0) : 0;
            return (
              <div key={i} className={`aspect-square border-2 border-black flex flex-col items-center justify-center relative group ${total > 0 ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                <span className="text-[8px] text-black">{i + 1}</span>
                {total > 0 && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                {data && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black text-white p-2 text-[6px] uppercase hidden group-hover:block border-2 border-white z-50">{Object.entries(data).map(([a, m]: any) => <div key={a} className="flex justify-between"><span>{a}</span><span>{Math.round(m)}m</span></div>)}<div className="border-t border-white/20 pt-1 mt-1 text-blue-400 font-bold">Total: {Math.round(total)}m</div></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MorningPowerUp({ onComplete }: { onComplete: (items: string[]) => void }) {
  const [tasks, setTasks] = useState([
    { id: 'glasses', text: 'Glasses are ON', icon: Eye, done: false },
    { id: 'seat', text: 'Ready to move closer', icon: Target, done: false },
    { id: 'focus', text: 'Goal: No computer distractions', icon: Clock, done: false },
    { id: 'humor', text: 'Jokes saved for the right time', icon: MessageSquare, done: false },
  ]);
  const allDone = tasks.every(t => t.done);
  return (
    <div className="max-w-2xl mx-auto my-12 bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] pixel-font relative text-black text-left">
      <div className="absolute top-0 right-0 bg-red-600 text-white p-2 text-[8px] uppercase">Daily Quest</div>
      <h2 className="text-xl mb-8 uppercase flex items-center gap-4 text-black font-bold"><Heart className="fill-red-600 text-red-600 animate-pulse" /> Morning Buffs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {tasks.map(t => (
          <button key={t.id} onClick={() => setTasks(tasks.map(task => task.id === t.id ? { ...task, done: !task.done } : task))} className={`flex items-center gap-4 p-4 border-4 border-black transition-all ${t.done ? 'bg-green-100' : 'bg-white hover:bg-gray-50'}`}><div className={`w-10 h-10 border-4 border-black flex items-center justify-center shrink-0 ${t.done ? 'bg-green-500' : 'bg-white'}`}><t.icon size={20} /></div><span className={`text-[10px] text-left leading-tight uppercase ${t.done ? 'line-through text-gray-400' : 'text-black font-bold'}`}>{t.text}</span></button>
        ))}
      </div>
      {allDone && <button onClick={() => onComplete(tasks.map(t => t.id))} className="w-full bg-yellow-500 text-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce uppercase text-sm border-4 border-black font-bold">Activate Multiplier!</button>}
    </div>
  );
}

function BattleUI({ gameId, problem, feedback, progress, totalProgress, timeLeft, onExit, onAnswer }: any) {
  const [inputValue, setInputValue] = useState('');
  const [isJumping, setIsJumping] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (feedback === 'idle' && !isStarting) { setInputValue(''); inputRef.current?.focus(); } }, [feedback, problem?.question, isStarting]);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (feedback !== 'idle' || !inputValue.trim()) return; setIsJumping(true); onAnswer(inputValue.trim()); setTimeout(() => setIsJumping(false), 500); };
  if (isStarting) return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sky-bg pixel-font text-center text-black"><div className="bg-white border-8 border-black p-10 max-w-lg shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] text-black"><h2 className="text-2xl mb-4 uppercase text-black font-bold text-center">READY?</h2><button onClick={() => setIsStarting(false)} className="bg-green-500 text-white p-6 border-4 border-black uppercase animate-bounce w-full font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-pixel">START MISSION</button></div></div>);
  return (
    <div className="fixed inset-0 z-50 flex flex-col sky-bg pixel-font overflow-hidden text-white">
      <div className="p-8 flex justify-between items-start z-20 shrink-0 text-white"><div className="text-left text-white"><p className="text-[10px] text-blue-400 mb-2 font-bold">{gameId.toUpperCase()}</p><p className="flex items-center gap-2 text-sm text-white font-bold"><Trophy size={16} className="text-yellow-400" /> {progress}/{totalProgress}</p></div><div className="text-right text-white"><p className="text-[10px] text-yellow-400 mb-2 font-bold">TIME</p><p className={timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-white'}>{timeLeft}</p></div></div>
      <div className="flex-1 relative flex flex-col items-center justify-center pb-32 text-black">
        <div className={`mb-12 transform transition-all ${feedback === 'wrong' ? 'shake' : ''}`}><div className="bg-white border-8 border-black p-8 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] text-center relative max-w-md mx-auto text-black"><h2 className="text-xl md:text-2xl leading-tight uppercase text-black font-bold">{problem?.question}</h2>{feedback === 'correct' && <div className="absolute -top-20 left-1/2 -translate-x-1/2 coin-animate"><Coins size={60} className="text-yellow-400 fill-yellow-400" /></div>}</div></div>
        <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-sm px-4">
           <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={feedback !== 'idle'} placeholder="???" className="w-full bg-white border-8 border-black p-6 text-2xl text-center text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none mb-8 placeholder:opacity-20 uppercase font-bold" />
           <button type="submit" className="bg-red-600 text-white px-12 py-4 border-4 border-black uppercase font-bold text-xl w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">SUBMIT</button>
        </form>
        <div className={`absolute bottom-32 left-8 md:left-20 transition-all duration-300 ${isJumping ? 'mario-jump' : ''}`}><div className="w-16 h-20 bg-red-600 border-4 border-black relative rounded-sm flex items-center justify-center text-white font-bold"><div className="absolute top-0 w-full h-8 bg-red-800"></div><div className="absolute top-4 w-12 h-8 bg-pink-200 rounded-sm"></div><div className="absolute bottom-4 w-full h-8 bg-blue-600"></div><span className="text-white text-[8px] z-10 font-bold uppercase">O</span></div></div>
      </div>
      <div className="h-32 w-full mario-ground shrink-0"></div>
      <button onClick={onExit} className="fixed bottom-4 right-4 p-4 bg-green-500 border-4 border-black text-white z-30 uppercase font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><RotateCcw size={24} /></button>
    </div>
  );
}

function FactFluencyGame({ onExit, onReward, onLogTime }: any) {
  const [questions, setQuestions] = useState<MathQuestion[]>(() => { const saved = localStorage.getItem(MULTIPLICATION_STATE_KEY); return saved ? JSON.parse(saved) : generateAllMultiplicationQuestions(); });
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [timeLeft, setTimeLeft] = useState(15);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const startRef = useRef(Date.now());
  const timerRef = useRef<any>(null);
  const handleAnswer = (val: string) => {
    if (feedback !== 'idle' || !currentQuestion) return; clearInterval(timerRef.current);
    const isCorrect = val.trim() === currentQuestion.answer; setFeedback(isCorrect ? 'correct' : 'wrong'); if (isCorrect) onReward(10, 10);
    const updated = questions.map(q => q.id === currentQuestion.id ? { ...q, correctCount: isCorrect ? q.correctCount + 1 : q.correctCount, incorrectCount: isCorrect ? q.incorrectCount : q.incorrectCount + 1 } : q);
    setQuestions(updated); localStorage.setItem(MULTIPLICATION_STATE_KEY, JSON.stringify(updated));
    setTimeout(() => { const remaining = updated.filter(q => !isQuestionSatisfied(q)); const next = remaining.length > 0 ? remaining[getRandomInt(0, remaining.length - 1)] : null; if (next) { setCurrentQuestion(next); setTimeLeft(difficulty || 15); setFeedback('idle'); } else { onLogTime((Date.now() - startRef.current) / 60000); alert("WORLD CLEAR!"); onExit(); } }, 800);
  };
  useEffect(() => { if (difficulty && !currentQuestion) { const rem = questions.filter(q => !isQuestionSatisfied(q)); if (rem.length > 0) setCurrentQuestion(rem[getRandomInt(0, rem.length - 1)]); } }, [difficulty, questions, currentQuestion]);
  useEffect(() => { if (difficulty && feedback === 'idle' && currentQuestion) { timerRef.current = setInterval(() => { setTimeLeft(t => { if (t <= 1) { handleAnswer('WRONG'); return 0; } return t - 1; }); }, 1000); } return () => clearInterval(timerRef.current); }, [difficulty, feedback, currentQuestion]);
  if (!difficulty) return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font text-black text-center"><div className="bg-white border-8 border-black p-10 max-w-md text-black text-center"><h2 className="text-xl mb-4 text-black uppercase font-bold text-center font-pixel">Difficulty</h2><div className="grid gap-4">{[15, 10, 5].map(t => <button key={t} onClick={() => setDifficulty(t)} className="mario-brick bg-yellow-500 text-white p-4 border-4 border-black uppercase font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">W 1-{4-t/5} ({t}s)</button>)}</div><button onClick={onExit} className="mt-8 text-[8px] text-gray-400 uppercase font-bold">Exit</button></div></div>);
  return <BattleUI gameId="FactFluency" problem={currentQuestion} feedback={feedback} progress={questions.filter(isQuestionSatisfied).length} totalProgress={questions.length} timeLeft={timeLeft} onExit={onExit} onAnswer={handleAnswer} />;
}

function MasteryGame({ id, onExit, onReward, onLogTime }: any) {
  const [problem, setProblem] = useState(() => generateProblem(id));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const startRef = useRef(Date.now());
  const timerRef = useRef<any>(null);
  const handleAnswer = (val: string) => {
    if (feedback !== 'idle' || !problem) return; clearInterval(timerRef.current);
    const isCorrect = val.trim().toLowerCase() === problem.answer.toLowerCase(); setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) { onReward(20, 15); const next = progress + 1; setProgress(next); if (next >= 5) { onLogTime((Date.now() - startRef.current) / 60000); setTimeout(() => onExit(), 800); return; } }
    setTimeout(() => { setProblem(generateProblem(id)); setTimeLeft(15); setFeedback('idle'); }, 800);
  };
  useEffect(() => { if (feedback === 'idle' && problem) { timerRef.current = setInterval(() => { setTimeLeft(t => { if (t <= 1) { handleAnswer("TIMEOUT"); return 0; } return t - 1; }); }, 1000); } return () => clearInterval(timerRef.current); }, [feedback, problem]);
  return <BattleUI gameId={id} problem={problem} feedback={feedback} progress={progress} totalProgress={5} timeLeft={timeLeft} onExit={onExit} onAnswer={handleAnswer} />;
}

function FocusTimer({ title, targetMins, onExit, onComplete, onLogTime }: any) {
  const [seconds, setSeconds] = useState(targetMins * 60);
  const [isActive, setIsActive] = useState(false);
  const startRef = useRef(Date.now());
  useEffect(() => { let i: any; if (isActive && seconds > 0) { i = setInterval(() => setSeconds(s => s - 1), 1000); } else if (seconds === 0) onComplete(targetMins); return () => clearInterval(i); }, [isActive, seconds, onComplete, targetMins]);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font text-black text-center"><div className="bg-white border-8 border-black p-10 max-w-md text-black text-center"><h2 className="text-xl mb-4 uppercase text-black font-bold text-center">{title}</h2><div className="text-6xl mb-8 text-black font-bold text-center font-pixel">{formatTime(seconds)}</div><button onClick={() => setIsActive(!isActive)} className={`w-full text-white p-6 border-4 border-black mb-4 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isActive ? 'bg-red-500' : 'bg-green-500'}`}>{isActive ? 'PAUSE' : 'START'}</button><button onClick={() => { onLogTime((Date.now() - startRef.current) / 60000); onExit(); }} className="text-[8px] text-gray-400 uppercase w-full font-bold">Exit Mission</button></div></div>);
}

function LexiaOverlay({ onExit, onLog }: any) {
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font text-black text-center"><div className="bg-white border-8 border-black p-10 max-w-md text-black text-center"><h2 className="text-xl mb-4 text-purple-600 uppercase font-bold text-center">LEXIA POWER-UP</h2><button onClick={() => { onLog(); window.open('https://www.lexiacore5.com/', '_blank'); }} className="bg-purple-600 text-white p-6 border-4 border-black uppercase w-full mb-4 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">OPEN</button><button onClick={onExit} className="text-[8px] text-gray-400 uppercase font-bold">Back to Overworld</button></div></div>);
}

export default function App() {
  const [stats, setStats] = useState<UserStats>(() => { const saved = localStorage.getItem(USER_STATS_KEY); return saved ? JSON.parse(saved) : { xp: 0, coins: 0, level: 1, inventory: [] }; });
  const [history, setHistory] = useState<ActivityEntry>(() => { const saved = localStorage.getItem(ACTIVITY_HISTORY_KEY); return saved ? JSON.parse(saved) : {}; });
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [lastQuestDate, setLastQuestDate] = useState(() => { const saved = localStorage.getItem(QUEST_LOG_KEY); return saved ? JSON.parse(saved).date : ''; });
  useEffect(() => { localStorage.setItem(USER_STATS_KEY, JSON.stringify({ ...stats, level: getLevel(stats.xp) })); }, [stats]);
  useEffect(() => { localStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(history)); }, [history]);
  const addRewards = (xp: number, coins: number) => { setStats(prev => ({ ...prev, xp: prev.xp + xp, coins: prev.coins + (coins * multiplier) })); };
  const logActivityTime = (activity: string, minutes: number) => { const today = getTodayKey(); setHistory(prev => { const dayData = prev[today] || {}; return { ...prev, [today]: { ...dayData, [activity]: (dayData[activity] || 0) + minutes } }; }); };
  const handleMorningComplete = (items: string[]) => { setMultiplier(2); setStats(prev => ({ ...prev, inventory: Array.from(new Set([...prev.inventory, ...items])) })); const today = getTodayKey(); setLastQuestDate(today); localStorage.setItem(QUEST_LOG_KEY, JSON.stringify({ date: today })); logActivityTime('Morning Prep', 5); };
  function WorldCard({ id, title, world, icon: Icon, color, desc }: any) { return (<button onClick={() => setActiveGame(id)} className="mario-card group relative bg-white border-8 border-black p-6 flex flex-col items-center text-center h-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-black"><span className="absolute -top-4 left-4 bg-black text-white text-[8px] px-2 py-1 uppercase font-bold">{world}</span><div className={`p-6 rounded-lg mb-4 border-4 border-black ${color}`}><Icon size={40} /></div><h3 className="text-sm font-black mb-2 uppercase font-bold text-black">{title}</h3><p className="text-[8px] text-gray-500 uppercase leading-relaxed font-bold">{desc}</p></button>); }
  return (
    <div className="min-h-screen sky-bg pixel-font pb-20 selection:bg-red-600 selection:text-white relative flex flex-col text-black">
      <OverworldHUD stats={stats} multiplier={multiplier} onOpenJournal={() => setActiveGame('Journal')} onOpenAdmin={() => setActiveGame('Admin')} />
      <div className="bg-black py-2 overflow-hidden whitespace-nowrap z-10 shrink-0 text-white text-[8px] uppercase font-bold"><div className="animate-marquee inline-block">★ SUPER OWEN OVERWORLD ★ MISSION: TRIMESTER 3 MASTERY ★ WITTY & CURIOUS ★</div></div>
      <header className="pt-16 pb-8 px-6 text-center z-10 shrink-0 text-black">
        <div className="relative inline-block"><div className="absolute -inset-4 bg-black border-4 border-white translate-x-2 translate-y-2"></div><div className="relative bg-[#e76d42] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white"><h1 className="text-2xl md:text-4xl leading-tight uppercase tracking-tighter font-bold">SUPER <br /> OWEN WORLD</h1></div></div>
      </header>
      <main className="max-w-7xl mx-auto px-6 z-10 flex-1 w-full text-center text-black">
        {lastQuestDate !== getTodayKey() && <MorningPowerUp onComplete={handleMorningComplete} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-black">
          <WorldCard id="FactFluency" world="W1" title="Fact Fortress" desc="Master Mul & Div!" icon={Zap} color="bg-yellow-400" />
          <WorldCard id="ContextClues" world="W2" title="Context Caves" desc="Solve word mysteries!" icon={Brain} color="bg-green-400" />
          <WorldCard id="FocusForest" world="W3" title="Focus Forest" desc="Stay on task!" icon={Clock} color="bg-orange-500" />
          <WorldCard id="AdvocacyCastle" world="W4" title="Advocacy Castle" desc="Social mastery!" icon={Shield} color="bg-red-500" />
          <WorldCard id="PianoPractice" world="W5" title="Piano Pavilion" desc="Practice pieces!" icon={Music} color="bg-blue-400" />
          <WorldCard id="LexiaLink" world="Bonus" title="Lexia Power" desc="Reading mastery!" icon={Star} color="bg-purple-500" />
        </div>
      </main>
      {activeGame === 'Admin' && <AdminPanel stats={stats} history={history} onUpdateStats={setStats} onUpdateHistory={setHistory} onExit={() => setActiveGame(null)} />}
      {activeGame === 'Journal' && <QuestJournal history={history} onExit={() => setActiveGame(null)} />}
      {activeGame === 'FactFluency' && <FactFluencyGame onExit={() => setActiveGame(null)} onReward={addRewards} onLogTime={(m: number) => logActivityTime('Math Facts', m)} />}
      {(activeGame === 'ContextClues' || activeGame === 'AdvocacyCastle') && <MasteryGame id={activeGame} onExit={() => setActiveGame(null)} onReward={addRewards} onLogTime={(m: number) => logActivityTime(activeGame === 'ContextClues' ? 'Context Clues' : 'Advocacy', m)} />}
      {(activeGame === 'FocusForest' || activeGame === 'PianoPractice') && <FocusTimer title={activeGame === 'FocusForest' ? 'FOCUS FOREST' : 'PIANO PAVILION'} targetMins={activeGame === 'FocusForest' ? 10 : 20} onExit={() => setActiveGame(null)} onLogTime={(m: number) => logActivityTime(activeGame === 'FocusForest' ? 'Task Focus' : 'Piano Practice', m)} onComplete={(m: number) => { addRewards(activeGame === 'FocusForest' ? 500 : 1000, 50); logActivityTime(activeGame === 'FocusForest' ? 'Task Focus' : 'Piano Practice', m); setActiveGame(null); }} />}
      {activeGame === 'LexiaLink' && <LexiaOverlay onExit={() => setActiveGame(null)} onLog={() => logActivityTime('Lexia Reading', 20)} />}
      <footer className="mt-32 border-t-8 border-black mario-ground py-20 px-6 relative shrink-0 text-white text-center">
         <div className="max-w-4xl mx-auto text-center relative z-10 text-white"><div className="w-24 h-40 mario-pipe mx-auto mb-8"></div><p className="text-white/50 text-[10px] uppercase tracking-widest italic font-bold">{VERSION}</p><button onClick={() => setActiveGame('Admin')} className="mt-8 text-[8px] uppercase text-white/20 hover:text-white font-bold">Admin Console</button></div>
      </footer>
    </div>
  );
}
