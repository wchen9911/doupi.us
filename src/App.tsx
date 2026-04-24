import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Star, Zap, Brain, RotateCcw, Lock, Coins, Heart, Eye, Target, MessageSquare, Clock, Trophy, Music, Volume2, Type, Globe, Plus, Calendar, Gamepad2, Palette, Bike, Construction, Utensils, Smile, Sparkles, AlertTriangle, Gift, Flame } from 'lucide-react';
import './App.css';

// --- Types & Constants ---
const VERSION = "v4.4.0";
const MULTIPLICATION_STATE_KEY = 'owen_overworld_math_v4';
const USER_STATS_KEY = 'owen_overworld_stats_v4';
const QUEST_LOG_KEY = 'owen_overworld_quests_v4';
const ACTIVITY_HISTORY_KEY = 'owen_overworld_history_v4';
const TOTP_SECRET = "JBSWY3DPEBLW64TMMQ"; 

type GameType = 'FactFluency' | 'ContextClues' | 'FocusForest' | 'AdvocacyCastle' | 'LexiaLink' | 'PianoPractice' | 'Journal' | 'Admin' | 'SpellingBee' | 'ScienceLab' | 'GeoGlobe' | 'FunEvents';

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

interface GameEvent {
  id: string;
  type: 'Invasion' | 'DoubleCoins' | 'Mystery' | 'Flash';
  worldId: string;
  title: string;
  multiplier: number;
  icon: any;
}

interface MathQuestion {
  id: string;
  type: 'Multiplication' | 'Division';
  question: string;
  answer: string;
  correctCount: number;
  incorrectCount: number;
}

interface Problem {
  question: string | React.ReactNode;
  answer: string;
  options?: string[];
}

const SPELLING_WORDS = [
  "achieve", "against", "answer", "autumn", "beautiful", "believe", "between", "bicycle", "boundary", "business",
  "caught", "calendar", "character", "child", "clothes", "column", "complete", "country", "daughter", "decide",
  "describe", "dictionary", "different", "disappeared", "early", "education", "embarrass", "enough", "examine",
  "exercise", "experience", "experiment", "extreme", "famous", "favorite", "February", "forward", "grammar",
  "group", "guard", "guide", "heard", "heart", "height", "history", "imagine", "important", "increase",
  "interest", "island", "knowledge", "library", "material", "medicine", "mention", "minute", "natural",
  "naughty", "notice", "occasion", "often", "opposite", "ordinary", "particular", "peculiar", "perhaps",
  "popular", "position", "possess", "possible", "potatoes", "pressure", "probably", "promise", "purpose",
  "quarter", "question", "recent", "regular", "reign", "remember", "sentence", "separate", "special",
  "straight", "strange", "strength", "suppose", "surprise", "therefore", "though", "thought", "through",
  "together", "weight", "woman", "women"
];

const FUN_ACTIVITIES = [
  { name: 'LEGO Building', icon: Construction, color: 'bg-orange-400' },
  { name: 'Video Games', icon: Gamepad2, color: 'bg-purple-500' },
  { name: 'Drawing/Art', icon: Palette, color: 'bg-pink-400' },
  { name: 'Outside Play', icon: Bike, color: 'bg-green-500' },
  { name: 'Cooking', icon: Utensils, color: 'bg-yellow-500' },
  { name: 'Just Chilling', icon: Smile, color: 'bg-blue-400' }
];

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

const generateProblem = (type: string): Problem => {
  if (type === 'ContextClues') {
    const clues = [
      { q: "The sun was so [blank] I had to wear glasses.", a: "bright", o: ["dark", "bright", "cold", "wet"] },
      { q: "Owen is very [blank] and tells great jokes.", a: "witty", o: ["sad", "witty", "angry", "slow"] },
      { q: "I used a [blank] to see the tiny bacteria.", a: "microscope", o: ["telescope", "microscope", "glasses", "mirror"] },
      { q: "The [blank] of the mountain was covered in snow.", a: "peak", o: ["base", "peak", "valley", "cave"] },
      { q: "He felt [blank] after getting a 4 on his test.", a: "proud", o: ["scared", "proud", "tired", "bored"] },
      { q: "The cat was so [blank] it slept for ten hours.", a: "lethargic", o: ["energetic", "lethargic", "noisy", "hungry"] },
      { q: "It was [blank] that Owen would win the race.", a: "evident", o: ["hidden", "evident", "unlikely", "secret"] },
      { q: "The [blank] smell of flowers filled the room.", a: "fragrant", o: ["stinky", "fragrant", "sour", "bitter"] },
      { q: "The book was so [blank] that I couldn't put it down.", a: "engrossing", o: ["boring", "engrossing", "short", "heavy"] },
      { q: "The spider's web was [blank] and delicate.", a: "intricate", o: ["strong", "heavy", "intricate", "simple"] },
      { q: "She was [blank] about the news, smiling ear to ear.", a: "jubilant", o: ["sad", "jubilant", "angry", "scared"] },
      { q: "The desert is a [blank] and dry environment.", a: "parched", o: ["wet", "cold", "parched", "lush"] }
    ];
    const item = clues[getRandomInt(0, clues.length - 1)];
    return { question: item.q, answer: item.a, options: item.o };
  }
  if (type === 'AdvocacyCastle') {
    const scenarios = [
      { q: "I can't see the board well. What should I do?", a: "move closer", o: ["stay put", "move closer", "close eyes", "go home"] },
      { q: "I forgot my glasses at home. What should I do?", a: "tell teacher", o: ["hide it", "tell teacher", "ignore it", "cry"] },
      { q: "The teacher is talking. Is it joke time?", a: "no", o: ["yes", "no"] },
      { q: "I have a 'standing [blank]' to move closer anytime.", a: "invitation", o: ["order", "invitation", "rule", "ban"] },
      { q: "If the text is too small, I should ask for a [blank].", a: "large print", o: ["magnifier", "large print", "new book", "break"] },
      { q: "I'm having trouble focusing. What can I use?", a: "focus cloak", o: ["glasses", "focus cloak", "radio", "toy"] },
      { q: "When I advocate, I speak up for my [blank].", a: "needs", o: ["wants", "needs", "friends", "toys"] },
      { q: "It is [blank] to ask for help when I need it.", a: "brave", o: ["weak", "brave", "silly", "wrong"] }
    ];
    const item = scenarios[getRandomInt(0, scenarios.length - 1)];
    return { question: item.q, answer: item.a, options: item.o };
  }
  if (type === 'ScienceLab') {
    const facts = [
      { q: "Which planet is known as the Red Planet?", a: "Mars", o: ["Venus", "Mars", "Jupiter", "Saturn"] },
      { q: "What is the boiling point of water (C)?", a: "100", o: ["0", "50", "100", "200"] },
      { q: "What do bees collect from flowers?", a: "nectar", o: ["honey", "nectar", "water", "dirt"] },
      { q: "The force that pulls objects to Earth is [blank].", a: "gravity", o: ["magnetism", "gravity", "friction", "wind"] },
      { q: "Which gas do plants breathe in?", a: "CO2", o: ["oxygen", "CO2", "nitrogen", "helium"] },
      { q: "How many bones are in the adult human body?", a: "206", o: ["100", "206", "300", "500"] }
    ];
    const item = facts[getRandomInt(0, facts.length - 1)];
    return { question: item.q, answer: item.a, options: item.o };
  }
  if (type === 'GeoGlobe') {
    const geo = [
      { q: "Which is the largest continent?", a: "Asia", o: ["Africa", "Asia", "Europe", "N. America"] },
      { q: "Which ocean is the largest?", a: "Pacific", o: ["Atlantic", "Pacific", "Indian", "Arctic"] },
      { q: "What is the capital of the USA?", a: "Washington DC", o: ["New York", "Washington DC", "Los Angeles", "Chicago"] },
      { q: "Which country is also a continent?", a: "Australia", o: ["Brazil", "Australia", "India", "Canada"] },
      { q: "Which river is the longest in the world?", a: "Nile", o: ["Amazon", "Nile", "Mississippi", "Yangtze"] }
    ];
    const item = geo[getRandomInt(0, geo.length - 1)];
    return { question: item.q, answer: item.a, options: item.o };
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
  const [secretSequence, setSecretSequence] = useState('');
  const [newEntry, setNewEntry] = useState({ date: getTodayKey(), activity: '', mins: 15 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSeq = (secretSequence + e.key).slice(-4).toLowerCase();
      setSecretSequence(newSeq);
      if (newSeq === 'owen') setIsVerified(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [secretSequence]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = await getTOTPCode(TOTP_SECRET);
    if (code === expected) setIsVerified(true);
    else { alert("Invalid Code!"); setCode(''); }
  };

  const addManualEntry = (act?: string) => {
    const activity = act || newEntry.activity;
    if (!activity) return;
    const dayData = history[newEntry.date] || {};
    onUpdateHistory({ ...history, [newEntry.date]: { ...dayData, [activity]: (dayData[activity] || 0) + newEntry.mins } });
    setNewEntry({ ...newEntry, activity: '' });
    alert("Event Added!");
  };

  if (!isVerified) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 sky-bg pixel-font overflow-y-auto">
      <div className="bg-white border-8 border-black p-10 max-w-md text-center text-black my-auto">
        <h2 className="text-xl mb-8 uppercase font-bold">Admin Access</h2>
        <form onSubmit={handleVerify}>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" className="w-full border-4 border-black p-4 mb-8 text-center text-xl focus:outline-none text-black" autoFocus />
          <button type="submit" className="w-full bg-red-600 text-white p-4 border-4 border-black uppercase text-xs font-bold font-pixel">Verify Code</button>
        </form>
        <button onClick={onExit} className="mt-8 text-[8px] text-gray-400 uppercase underline">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 sky-bg pixel-font overflow-y-auto">
      <div className="bg-white border-8 border-black p-8 w-full max-w-2xl text-black my-auto">
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4 text-left"><h2 className="text-xl uppercase flex items-center gap-2 font-bold"><Target className="text-red-600" /> Admin Console</h2><button onClick={onExit} className="text-red-600 uppercase text-xs">[ Exit ]</button></div>
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['Stats', 'History', 'Nuclear'].map((t: any) => (<button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 border-4 border-black text-[10px] uppercase font-bold ${activeTab === t ? 'bg-yellow-400' : 'bg-gray-100'}`}>{t}</button>))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {activeTab === 'Stats' && (
            <div className="space-y-6">
              <div><label className="block text-[10px] uppercase font-bold mb-2">XP: {stats.xp}</label><input type="range" min="0" max="10000" value={stats.xp} onChange={(e) => onUpdateStats({ ...stats, xp: parseInt(e.target.value) })} className="w-full accent-black" /></div>
              <div><label className="block text-[10px] uppercase font-bold mb-2">Coins: {stats.coins}</label><input type="range" min="0" max="5000" value={stats.coins} onChange={(e) => onUpdateStats({ ...stats, coins: parseInt(e.target.value) })} className="w-full accent-black" /></div>
              <div><label className="block text-[10px] uppercase font-bold mb-2">Inventory</label><div className="grid grid-cols-2 gap-2">{['glasses', 'focus'].map(item => (<button key={item} onClick={() => { const newInv = stats.inventory.includes(item) ? stats.inventory.filter((i: string) => i !== item) : [...stats.inventory, item]; onUpdateStats({ ...stats, inventory: newInv }); }} className={`p-4 border-4 border-black uppercase text-[8px] font-bold ${stats.inventory.includes(item) ? 'bg-green-400' : 'bg-gray-100'}`}>{item}</button>))}</div></div>
            </div>
          )}

          {activeTab === 'History' && (
            <div className="space-y-8">
              <div className="bg-blue-50 border-4 border-black p-4">
                <h3 className="text-[10px] font-bold mb-4 uppercase">Add New Event</h3>
                <div className="grid gap-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {['LEGO', 'Drawing', 'Gaming', 'Outside', 'Reading'].map(fun => (
                      <button key={fun} onClick={() => addManualEntry(fun)} className="bg-white border-2 border-black p-2 text-[6px] uppercase hover:bg-yellow-100 shrink-0">{fun}</button>
                    ))}
                  </div>
                  <input type="text" placeholder="Or type activity..." value={newEntry.activity} onChange={e => setNewEntry({...newEntry, activity: e.target.value})} className="border-4 border-black p-2 text-[10px] uppercase w-full bg-white" />
                  <div className="flex gap-4 items-center">
                    <input type="number" value={newEntry.mins} onChange={e => setNewEntry({...newEntry, mins: parseInt(e.target.value) || 0})} className="border-4 border-black p-2 text-[10px] w-24 bg-white" />
                    <span className="text-[8px] uppercase">MINS</span>
                    <button onClick={() => addManualEntry()} className="flex-1 bg-blue-600 text-white p-2 border-4 border-black uppercase text-[10px] font-bold hover:bg-blue-700">Add Custom</button>
                  </div>
                </div>
              </div>
              {Object.entries(history).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, data]: any) => (
                <div key={date} className="border-4 border-black p-4 bg-gray-50">
                  <h3 className="text-[10px] font-bold border-b-2 border-black mb-2 pb-1 uppercase">{date}</h3>
                  {Object.entries(data).map(([act, mins]: any) => (
                    <div key={act} className="flex justify-between items-center mb-2">
                      <span className="text-[8px] uppercase">{act}</span>
                      <div className="flex items-center gap-2"><input type="number" value={Math.round(mins)} onChange={(e) => { const newMins = parseInt(e.target.value) || 0; onUpdateHistory({ ...history, [date]: { ...data, [act]: newMins } }); }} className="w-12 border-2 border-black p-1 text-[8px] text-center bg-white" /><span className="text-[6px]">MIN</span></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Nuclear' && (
            <div className="text-center p-8">
              <div className="bg-red-100 border-4 border-black p-6 mb-8"><p className="text-red-600 font-black uppercase text-xs mb-4">Danger Zone</p><p className="text-[8px] uppercase leading-relaxed">Delete all progress forever?</p></div>
              <button onClick={() => { if (window.confirm("RESET ALL?")) { localStorage.clear(); window.location.reload(); } }} className="bg-red-600 text-white p-6 border-4 border-black uppercase font-black text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full text-center">RESET ALL DATA</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FunEventsGame({ onExit, onReward, onLogTime }: any) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mins, setMins] = useState(30);

  const handleLog = () => {
    if (!selected) return;
    onLogTime(selected, mins);
    onReward(mins * 5, mins * 2);
    alert(`Logged ${mins}m of ${selected}! Joy Bonus Active!`);
    onExit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 sky-bg pixel-font overflow-y-auto">
      <div className="bg-white border-8 border-black p-10 w-full max-w-2xl my-auto text-black text-center">
        <h2 className="text-2xl mb-8 uppercase font-black flex items-center justify-center gap-4 text-pink-500"><Sparkles className="animate-pulse" /> Fun Factory <Sparkles className="animate-pulse" /></h2>
        <p className="text-[8px] mb-8 uppercase text-gray-500">What fun thing did Owen do today?</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {FUN_ACTIVITIES.map(act => (
            <button key={act.name} onClick={() => setSelected(act.name)} className={`p-4 border-4 border-black flex flex-col items-center gap-2 transition-all ${selected === act.name ? 'bg-yellow-400 scale-110' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <act.icon size={24} className={selected === act.name ? 'animate-bounce' : ''} />
              <span className="text-[6px] uppercase font-bold">{act.name}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="bg-blue-50 border-4 border-dashed border-black p-6 mb-8 animate-popIn">
            <p className="text-[10px] mb-4 uppercase font-bold tracking-tight">How long was the fun?</p>
            <div className="flex justify-center gap-4 mb-6">
              {[15, 30, 60, 120].map(m => (
                <button key={m} onClick={() => setMins(m)} className={`p-2 border-2 border-black text-[8px] uppercase font-bold ${mins === m ? 'bg-black text-white' : 'bg-white'}`}>{m}m</button>
              ))}
            </div>
            <button onClick={handleLog} className="bg-pink-500 text-white p-4 border-4 border-black w-full uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-600 active:translate-y-1 active:shadow-none">Log Fun & Earn XP!</button>
          </div>
        )}

        <button onClick={onExit} className="mt-4 text-[8px] text-gray-400 uppercase underline">Go Back</button>
      </div>
    </div>
  );
}

function QuestJournal({ history, onExit }: any) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate(); const offset = new Date(year, month, 1).getDay();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 sky-bg pixel-font overflow-y-auto text-black">
      <div className="bg-white border-8 border-black p-8 w-full max-w-4xl my-auto text-center">
        <div className="flex justify-between items-center mb-8"><h2 className="text-xl uppercase font-bold">Quest Journal</h2><button onClick={onExit} className="text-red-600 uppercase text-xs font-bold">[ Close ]</button></div>
        <div className="flex justify-between items-center mb-4 text-xs uppercase"><button onClick={() => setViewDate(new Date(year, month - 1))}>&lt; Prev</button><span className="font-bold">{viewDate.toLocaleString('default', { month: 'long' })} {year}</span><button onClick={() => setViewDate(new Date(year, month + 1))}>Next &gt;</button></div>
        <div className="grid grid-cols-7 gap-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[10px] text-gray-400 font-bold">{d}</div>)}
          {[...Array(offset)].map((_, i) => <div key={`off-${i}`}></div>)}
          {[...Array(days)].map((_, i) => {
            const dStr = new Date(year, month, i + 1).toDateString(); const data = history[dStr];
            const total = data ? Object.values(data).reduce((acc: number, val: any) => acc + (val as number), 0) : 0;
            return (
              <div key={i} className={`aspect-square border-2 border-black flex flex-col items-center justify-center relative group ${total > 0 ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                <span className="text-[8px]">{i + 1}</span>
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
    { id: 'focus', text: 'Goal: No distractions', icon: Clock, done: false },
    { id: 'humor', text: 'Jokes for right time', icon: MessageSquare, done: false },
  ]);
  const allDone = tasks.every(t => t.done);
  return (
    <div className="max-w-2xl mx-auto my-12 bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] pixel-font relative text-left text-black">
      <div className="absolute top-0 right-0 bg-red-600 text-white p-2 text-[8px] uppercase font-bold">Daily Quest</div>
      <h2 className="text-xl mb-8 uppercase flex items-center gap-4 font-bold text-center"><Heart className="fill-red-600 text-red-600 animate-pulse" /> Morning Buffs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {tasks.map(t => (
          <button key={t.id} onClick={() => setTasks(tasks.map(task => task.id === t.id ? { ...task, done: !task.done } : task))} className={`flex items-center gap-4 p-4 border-4 border-black transition-all ${t.done ? 'bg-green-100' : 'bg-white hover:bg-gray-50'}`}><div className={`w-10 h-10 border-4 border-black flex items-center justify-center shrink-0 ${t.done ? 'bg-green-500' : 'bg-white'}`}><t.icon size={20} /></div><span className={`text-[10px] text-left leading-tight uppercase ${t.done ? 'line-through text-gray-400' : 'font-bold'}`}>{t.text}</span></button>
        ))}
      </div>
      {allDone && <button onClick={() => onComplete(tasks.map(t => t.id))} className="w-full bg-yellow-500 text-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce uppercase text-sm border-4 border-black font-bold">Activate Multiplier!</button>}
    </div>
  );
}

interface BattleUIProps {
  gameId: string;
  problem: any;
  feedback: 'idle' | 'correct' | 'wrong';
  progress: number;
  totalProgress: number;
  timeLeft: number;
  onExit: () => void;
  onAnswer: (val: string, mult?: number) => void;
  onStart?: () => void;
  stats: UserStats;
}

function BattleUI({ gameId, problem, feedback, progress, totalProgress, timeLeft, onExit, onAnswer, onStart, stats }: BattleUIProps) {
  const [inputValue, setInputValue] = useState('');
  const [isJumping, setIsJumping] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [combo, setCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [damageDealt, setDamageDealt] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGlasses = stats.inventory.includes('glasses');
  const hasFocus = stats.inventory.includes('focus');

  const getBossIcon = () => {
    switch(gameId) {
      case 'FactFluency': return <Brain size={80} className={`${isFever ? 'animate-spin' : ''} text-red-500`} />;
      case 'SpellingBee': return <Type size={80} className={`${isFever ? 'animate-bounce' : ''} text-cyan-500`} />;
      default: return <Target size={80} className="text-purple-500" />;
    }
  };

  useEffect(() => { 
    if (feedback === 'idle' && !isStarting) { setInputValue(''); inputRef.current?.focus(); setDamageDealt(null); } 
    else if (feedback === 'correct') { const newCombo = combo + 1; setCombo(newCombo); setDamageDealt(isFever ? 30 : 10); if (newCombo >= 5) setIsFever(true); } 
    else if (feedback === 'wrong') { setCombo(0); setIsFever(false); }
  }, [feedback, isStarting, isFever, combo]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (feedback !== 'idle' || !inputValue.trim()) return; setIsJumping(true); onAnswer(inputValue.trim(), isFever ? 3 : 1); setTimeout(() => setIsJumping(false), 500); };

  if (isStarting) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sky-bg pixel-font overflow-y-auto text-black">
      <div className="bg-white border-8 border-black p-10 max-w-lg shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] my-auto">
        <h2 className="text-4xl mb-6 uppercase font-black italic tracking-tighter text-black text-center">BOSS INCOMING!</h2>
        <div className="mb-8 p-8 bg-gray-100 border-4 border-black flex flex-col items-center gap-4">
           <div className="animate-bounce p-4 bg-white border-4 border-black">{getBossIcon()}</div>
           <p className="text-red-600 font-bold uppercase text-xs">Danger Level: EXTREME</p>
           {hasFocus && <p className="text-orange-500 text-[8px] uppercase">Focus Active: Timer Slowed!</p>}
        </div>
        <button onClick={() => { setIsStarting(false); onStart?.(); }} className="bg-red-600 text-white p-6 border-4 border-black uppercase animate-bounce w-full font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl">ENGAGE BATTLE</button>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isFever ? 'bg-yellow-400' : 'sky-bg'} pixel-font overflow-y-auto text-white transition-colors duration-500`}>
      {isFever && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none z-10"></div>}
      <div className="p-8 flex justify-between items-start z-20 shrink-0">
        <div className="text-left text-white"><p className="text-[10px] text-blue-400 mb-2 font-bold uppercase tracking-widest text-left">{gameId.toUpperCase()}</p><div className="flex items-center gap-4"><p className="flex items-center gap-2 text-sm font-bold"><Trophy size={16} className="text-yellow-400" /> {progress}/{totalProgress}</p>{combo > 1 && (<div className={`px-2 py-1 text-[10px] font-black italic animate-bounce border-2 border-black ${isFever ? 'bg-red-600 text-white scale-150' : 'bg-yellow-400 text-black'}`}>{isFever ? 'FEVER MODE!' : `${combo}X COMBO!`}</div>)}</div></div>
        <div className="text-right text-white"><p className="text-[10px] text-yellow-400 mb-2 font-bold uppercase tracking-widest text-right">TIME</p><p className={`text-xl font-bold ${timeLeft < 5 ? 'text-red-500 animate-pulse scale-125' : 'text-white'}`}>{timeLeft}s</p></div>
      </div>
      <div className="flex-1 relative flex flex-col items-center justify-center pb-32 text-black min-h-[500px]">
        <div className={`absolute top-20 transition-all duration-300 transform ${feedback === 'correct' ? 'scale-150 opacity-0 -translate-y-20' : feedback === 'wrong' ? 'scale-110 translate-y-4' : 'animate-pulse'}`}>
          <div className={`relative p-8 bg-white border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] ${feedback === 'wrong' ? 'bg-red-100' : ''}`}>{getBossIcon()}<div className="absolute -top-12 left-0 w-full h-4 bg-gray-200 border-4 border-black"><div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${Math.max(0, 100 - (progress/totalProgress * 100))}%` }}></div></div>{damageDealt && (<div className="absolute -right-8 top-0 text-red-600 font-black text-xl animate-bounce">-{damageDealt} HP</div>)}</div>
        </div>
        <div className={`mt-40 mb-12 transform transition-all duration-300 ${feedback === 'wrong' ? 'shake scale-110' : ''}`}><div className="bg-white border-8 border-black p-10 rounded-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] text-center relative max-w-md mx-auto"><div className="text-3xl md:text-5xl leading-tight uppercase font-black italic tracking-tighter text-black">{problem?.question}</div>{feedback === 'correct' && (<div className="absolute -top-20 left-1/2 -translate-x-1/2 coin-animate"><div className="text-yellow-500 font-black text-2xl drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">{isFever ? 'ULTRA KILL!' : 'BOOM!'}</div><Coins size={60} className="text-yellow-400 fill-yellow-400 mx-auto" /></div>)}{hasGlasses && feedback === 'idle' && timeLeft < 5 && (<div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] px-2 py-1 border-2 border-black animate-pulse">HINT: {problem?.answer}</div>)}</div></div>
        {problem && problem.options ? (<div className="grid grid-cols-2 gap-4 w-full max-w-xl px-4">{problem.options.map((opt: string) => (<button key={opt} onClick={() => onAnswer(opt, isFever ? 3 : 1)} disabled={feedback !== 'idle'} className="bg-white border-8 border-black p-6 text-sm uppercase font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none hover:bg-yellow-400 transition-colors transform hover:scale-105 text-black">{opt}</button>))}</div>) : (<form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-sm px-4"><input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={feedback !== 'idle'} placeholder={isFever ? "OVERDRIVE!" : "ATTACK!"} className="w-full bg-white border-8 border-black p-6 text-3xl text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] focus:outline-none mb-8 placeholder:opacity-30 uppercase font-black italic text-black" /><button type="submit" className={`${isFever ? 'bg-yellow-400' : 'bg-red-600'} text-white px-12 py-6 border-4 border-black uppercase font-black text-2xl w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 active:translate-y-1 active:shadow-none transition-all`}>{isFever ? 'FEVER STRIKE!' : 'STRIKE!'}</button></form>)}
        <div className={`absolute bottom-32 left-8 md:left-20 transition-all duration-300 ${isJumping ? 'mario-jump' : ''} ${feedback === 'correct' ? 'translate-x-20' : ''}`}><div className={`w-16 h-20 bg-red-600 border-4 border-black relative rounded-sm flex items-center justify-center text-white font-bold text-center ${feedback === 'correct' || isFever ? 'scale-125' : ''} ${isFever ? 'animate-pulse shadow-[0_0_30px_rgba(255,255,0,0.8)] bg-yellow-500' : ''}`}><div className="absolute top-0 w-full h-8 bg-red-800"></div><div className="absolute top-4 w-12 h-8 bg-pink-200 rounded-sm"></div><div className="absolute bottom-4 w-full h-8 bg-blue-600"></div><span className="text-white text-[8px] z-10 font-bold uppercase">O</span>{(feedback === 'correct' || isFever) && <Zap className="absolute -right-8 -top-8 text-yellow-400 animate-pulse" size={40} />}{isFever && <Star className="absolute -left-8 -top-8 text-white animate-spin" size={30} />}</div></div>
      </div>
      <div className="h-32 w-full mario-ground shrink-0"></div>
      <button onClick={onExit} className="fixed bottom-4 right-4 p-4 bg-green-500 border-4 border-black text-white z-30 uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-all text-black"><RotateCcw size={24} /></button>
    </div>
  );
}

function FactFluencyGame({ onExit, onReward, onLogTime, stats }: any) {
  const [questions, setQuestions] = useState<MathQuestion[]>(() => { const saved = localStorage.getItem(MULTIPLICATION_STATE_KEY); if (saved) try { return JSON.parse(saved); } catch(e) {} return generateAllMultiplicationQuestions(); });
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [timeLeft, setTimeLeft] = useState(15);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const startRef = useRef(Date.now());
  const timerRef = useRef<any>(null);
  const hasFocus = stats.inventory.includes('focus');

  const handleAnswer = (val: string, mult = 1) => {
    if (feedback !== 'idle' || !currentQuestion) return; clearInterval(timerRef.current);
    const isCorrect = val.trim() === currentQuestion.answer; setFeedback(isCorrect ? 'correct' : 'wrong'); if (isCorrect) onReward(10 * mult, 10 * mult);
    const updated = questions.map(q => q.id === currentQuestion.id ? { ...q, correctCount: isCorrect ? q.correctCount + 1 : q.correctCount, incorrectCount: isCorrect ? q.incorrectCount : q.incorrectCount + 1 } : q);
    setQuestions(updated); localStorage.setItem(MULTIPLICATION_STATE_KEY, JSON.stringify(updated));
    setTimeout(() => { const remaining = updated.filter(q => !isQuestionSatisfied(q)); const next = remaining.length > 0 ? remaining[getRandomInt(0, remaining.length - 1)] : null; if (next) { setCurrentQuestion(next); setTimeLeft(difficulty || 15); setFeedback('idle'); } else { onLogTime((Date.now() - startRef.current) / 60000); alert("WIN!"); onExit(); } }, 800);
  };
  useEffect(() => { if (difficulty && !currentQuestion) { const rem = questions.filter(q => !isQuestionSatisfied(q)); if (rem.length > 0) setCurrentQuestion(rem[getRandomInt(0, rem.length - 1)]); } }, [difficulty, questions, currentQuestion]);
  useEffect(() => { if (difficulty && feedback === 'idle' && currentQuestion) { timerRef.current = setInterval(() => { setTimeLeft(t => { if (t <= 1) { handleAnswer('WRONG'); return 0; } return t - 1; }); }, hasFocus ? 1500 : 1000); } return () => clearInterval(timerRef.current); }, [difficulty, feedback, currentQuestion, hasFocus]);
  if (!difficulty) return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font overflow-y-auto text-black"><div className="bg-white border-8 border-black p-10 max-w-md text-center my-auto"><h2 className="text-xl mb-4 uppercase font-bold text-black">Difficulty</h2><div className="grid gap-4 text-black">{[15, 10, 5].map(t => <button key={t} onClick={() => setDifficulty(t)} className="mario-brick bg-yellow-500 text-white p-4 border-4 border-black uppercase font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">W 1-{4-t/5} ({t}s)</button>)}</div><button onClick={onExit} className="mt-8 text-[8px] text-gray-400 uppercase font-bold text-center underline">Exit</button></div></div>);
  return <BattleUI gameId="FactFluency" problem={currentQuestion} feedback={feedback} progress={questions.filter(isQuestionSatisfied).length} totalProgress={questions.length} timeLeft={timeLeft} onExit={onExit} onAnswer={handleAnswer} stats={stats} />;
}

function MasteryGame({ id, onExit, onReward, onLogTime, stats }: any) {
  const [problem, setProblem] = useState(() => generateProblem(id));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const startRef = useRef(Date.now());
  const timerRef = useRef<any>(null);
  const hasFocus = stats.inventory.includes('focus');

  const handleAnswer = (val: string, mult = 1) => {
    if (feedback !== 'idle' || !problem) return; clearInterval(timerRef.current);
    const isCorrect = val.trim().toLowerCase() === problem.answer.toLowerCase(); setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) { onReward(20 * mult, 15 * mult); const next = progress + 1; setProgress(next); if (next >= 5) { onLogTime((Date.now() - startRef.current) / 60000); setTimeout(() => onExit(), 800); return; } }
    setTimeout(() => { setProblem(generateProblem(id)); setTimeLeft(15); setFeedback('idle'); }, 800);
  };
  useEffect(() => { if (feedback === 'idle' && problem) { timerRef.current = setInterval(() => { setTimeLeft(t => { if (t <= 1) { handleAnswer("TIMEOUT"); return 0; } return t - 1; }); }, hasFocus ? 1500 : 1000); } return () => clearInterval(timerRef.current); }, [feedback, problem, hasFocus]);
  return <BattleUI gameId={id} problem={problem} feedback={feedback} progress={progress} totalProgress={5} timeLeft={timeLeft} onExit={onExit} onAnswer={handleAnswer} stats={stats} />;
}

function FocusTimer({ title, targetMins, onExit, onComplete, onLogTime }: any) {
  const [seconds, setSeconds] = useState(targetMins * 60);
  const [isActive, setIsActive] = useState(false);
  const startRef = useRef(Date.now());
  useEffect(() => { let i: any; if (isActive && seconds > 0) { i = setInterval(() => setSeconds(s => s - 1), 1000); return () => clearInterval(i); } else if (seconds === 0) onComplete(targetMins); }, [isActive, seconds, onComplete, targetMins]);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font overflow-y-auto text-black"><div className="bg-white border-8 border-black p-10 max-w-md text-center my-auto"><h2 className="text-xl mb-4 uppercase font-bold text-black text-center">{title}</h2><div className="text-6xl mb-8 font-bold text-black text-center">{formatTime(seconds)}</div><button onClick={() => setIsActive(!isActive)} className={`w-full text-white p-6 border-4 border-black mb-4 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isActive ? 'bg-red-500' : 'bg-green-500'} uppercase text-center`}>{isActive ? 'PAUSE' : 'START'}</button><button onClick={() => { onLogTime((Date.now() - startRef.current) / 60000); onExit(); }} className="text-[8px] text-gray-400 uppercase w-full font-bold underline text-center">Exit Mission</button></div></div>);
}

function LexiaOverlay({ onExit, onLog }: any) {
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sky-bg pixel-font overflow-y-auto text-black"><div className="bg-white border-8 border-black p-10 max-w-md text-center my-auto"><h2 className="text-xl mb-4 text-purple-600 uppercase font-bold text-center">LEXIA POWER-UP</h2><button onClick={() => { onLog(); window.open('https://www.lexiacore5.com/', '_blank'); }} className="bg-purple-600 text-white p-6 border-4 border-black uppercase w-full mb-4 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">OPEN</button><button onClick={onExit} className="text-[8px] text-gray-400 uppercase font-bold underline text-center">Back</button></div></div>);
}

function SpellingBoardGame({ onExit, onReward, onLogTime }: any) {
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [playerPosition, setPlayerPosition] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [showChallenge, setShowChallenge] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const startRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const totalTiles = 12;
  const [voiceIndex, setVoiceIndex] = useState(0);

  const speak = useCallback((text: string) => {
    if (!text || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    setIsSpeaking(true);
    synth.resume();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const allVoices = synth.getVoices();
    const enVoices = allVoices.filter(v => v.lang.startsWith('en'));
    const voicesToUse = enVoices.length > 0 ? enVoices : allVoices;
    const selectedVoice = voicesToUse[voiceIndex % voicesToUse.length];
    if (selectedVoice) { utterance.voice = selectedVoice; utterance.lang = selectedVoice.lang; }
    utterance.rate = 0.9; utterance.volume = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    (window as any)._activeUtterance = utterance;
    setTimeout(() => { synth.speak(utterance); synth.resume(); }, 100);
  }, [voiceIndex]);

  const startTurn = () => {
    if (window.speechSynthesis) window.speechSynthesis.resume();
    if (isRolling) return;
    setIsRolling(true);
    const roll = getRandomInt(1, 3);
    setDiceValue(roll);
    setTimeout(() => {
      setIsRolling(false);
      const newWord = SPELLING_WORDS[getRandomInt(0, SPELLING_WORDS.length - 1)];
      setWord(newWord);
      setShowChallenge(true);
      setInputValue('');
      speak(newWord);
    }, 600);
  };

  const handleAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== 'idle' || !inputValue.trim()) return;
    const isCorrect = inputValue.trim().toLowerCase() === word.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      onReward(20 * diceValue, 10 * diceValue);
      setTimeout(() => {
        setPlayerPosition(prev => Math.min(prev + diceValue, totalTiles - 1));
        setShowChallenge(false);
        setFeedback('idle');
        if (playerPosition + diceValue >= totalTiles - 1) {
          onLogTime((Date.now() - startRef.current) / 60000);
          alert("WIN!");
          onExit();
        }
      }, 1000);
    } else { setTimeout(() => setFeedback('idle'), 1000); }
  };

  useEffect(() => { if (showChallenge) inputRef.current?.focus(); }, [showChallenge]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col sky-bg pixel-font overflow-y-auto text-black">
      <div className="p-8 flex justify-between items-center z-20 shrink-0">
        <div className="text-left"><p className="text-[10px] text-blue-400 mb-2 font-bold uppercase tracking-widest text-left">SPELL QUEST</p><p className="flex items-center gap-2 text-sm text-white font-bold"><Trophy size={16} className="text-yellow-400" /> {playerPosition}/{totalTiles - 1}</p></div>
        <button onClick={onExit} className="p-4 bg-red-600 border-4 border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase text-[10px] font-bold">Exit</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[500px]">
        <div className="relative w-full max-w-4xl h-64 flex items-center justify-between px-12">
          <div className="absolute top-1/2 left-24 right-24 h-4 bg-black/20 -translate-y-1/2 z-0"></div>
          {Array.from({ length: totalTiles }).map((_, i) => (
            <div key={i} className={`w-12 h-12 border-4 border-black relative z-10 flex items-center justify-center transition-all ${i === totalTiles - 1 ? 'bg-red-500 scale-125' : i <= playerPosition ? 'bg-green-400' : 'bg-white'} ${i === playerPosition ? 'shadow-[0_0_20px_rgba(255,255,255,0.8)]' : ''}`}>
              {i === totalTiles - 1 && <Shield className="text-white" size={20} />}
              {i === 0 && <Star className="text-yellow-400" size={20} />}
              {i === playerPosition && (<div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce"><div className="w-10 h-12 bg-red-600 border-4 border-black relative rounded-sm flex items-center justify-center text-white font-bold"><div className="absolute top-0 w-full h-4 bg-red-800"></div><span className="text-[8px] z-10">O</span></div></div>)}
            </div>
          ))}
        </div>
        {!showChallenge && (
          <div className="mt-12 flex flex-col items-center gap-8">
            <div className={`w-24 h-24 bg-white border-8 border-black flex items-center justify-center text-4xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isRolling ? 'animate-spin' : ''}`}>{isRolling ? '?' : diceValue || '🎲'}</div>
            <button onClick={startTurn} disabled={isRolling} className="bg-yellow-500 text-white px-12 py-6 border-4 border-black uppercase font-bold text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 text-center">Roll Dice!</button>
          </div>
        )}
      </div>
      {showChallenge && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-white border-8 border-black p-10 w-full max-w-md shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] text-center my-auto text-black">
            <div className="flex flex-col items-center gap-6 mb-8">
              <button type="button" onClick={() => speak(word)} className={`p-6 rounded-full text-white transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none ${isSpeaking ? 'bg-yellow-400 scale-110' : 'bg-blue-500'}`}><Volume2 size={48} className={isSpeaking ? 'animate-pulse' : ''} /></button>
              <span className="text-xs uppercase font-bold text-black">{isSpeaking ? 'Speaking...' : 'Hear word'}</span>
              <button type="button" onClick={() => setVoiceIndex(v => v + 1)} className="text-[6px] text-blue-500 underline uppercase text-center">(Switch Voice)</button>
            </div>
            <form onSubmit={handleAnswer} className="space-y-6">
              <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="TYPE HERE" disabled={feedback !== 'idle'} className={`w-full border-8 border-black p-4 text-xl text-center uppercase focus:outline-none text-black ${feedback === 'correct' ? 'bg-green-100' : feedback === 'wrong' ? 'bg-red-100 shake' : 'bg-gray-50'}`} />
              <button type="submit" disabled={feedback !== 'idle'} className="w-full bg-red-600 text-white p-4 border-4 border-black uppercase font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">Submit</button>
            </form>
          </div>
        </div>
      )}
      <div className="h-32 w-full mario-ground shrink-0"></div>
    </div>
  );
}

function WorldCard({ id, title, world, icon: Icon, color, desc, onSelect, event }: any) { 
  return (
    <button onClick={() => onSelect(id)} className={`mario-card group relative bg-white border-8 border-black p-6 flex flex-col items-center text-center h-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-black ${event ? 'border-yellow-400 animate-pulse' : ''}`}>
      <span className="absolute -top-4 left-4 bg-black text-white text-[8px] px-2 py-1 uppercase font-bold tracking-widest">{world}</span>
      {event && <div className="absolute -top-6 right-0 bg-yellow-400 border-4 border-black p-1 text-[6px] font-black uppercase text-black animate-bounce flex items-center gap-1"><event.icon size={10} /> {event.title}</div>}
      <div className={`p-6 rounded-lg mb-4 border-4 border-black ${color} text-black shrink-0`}><Icon size={40} className="text-black" /></div>
      <h3 className="text-sm font-black mb-2 uppercase font-bold text-center text-black">{title}</h3>
      <p className="text-[8px] text-gray-500 uppercase leading-relaxed font-bold text-center">{desc}</p>
    </button>
  ); 
}

export default function App() {
  const [stats, setStats] = useState<UserStats>(() => { 
    const saved = localStorage.getItem(USER_STATS_KEY); 
    if (saved) { try { return JSON.parse(saved); } catch(e) { console.error(e); } }
    return { xp: 0, coins: 0, level: 1, inventory: [] }; 
  });
  const [history, setHistory] = useState<ActivityEntry>(() => { 
    const saved = localStorage.getItem(ACTIVITY_HISTORY_KEY); 
    if (saved) { try { return JSON.parse(saved); } catch(e) { console.error(e); } }
    return {}; 
  });
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [lastQuestDate, setLastQuestDate] = useState(() => { 
    const saved = localStorage.getItem(QUEST_LOG_KEY); 
    if (saved) { try { return JSON.parse(saved).date; } catch(e) { console.error(e); } }
    return ''; 
  });
  const [showLevelUp, setShowLevelUp] = useState(false);

  // --- Game Event System ---
  useEffect(() => {
    const generateEvent = () => {
      const worlds = ['FactFluency', 'ContextClues', 'SpellingBee', 'ScienceLab', 'GeoGlobe'];
      const world = worlds[getRandomInt(0, worlds.length - 1)];
      const types: any[] = [
        { id: '1', title: 'BOSS INVASION', multiplier: 2, icon: AlertTriangle, type: 'Invasion' },
        { id: '2', title: 'DOUBLE COINS', multiplier: 2, icon: Flame, type: 'DoubleCoins' },
        { id: '3', title: 'MYSTERY QUEST', multiplier: 1.5, icon: Gift, type: 'Mystery' }
      ];
      const selected = types[getRandomInt(0, types.length - 1)];
      setEvents([{ ...selected, worldId: world }]);
    };
    generateEvent();
    const timer = setInterval(generateEvent, 300000); // New event every 5 mins
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { 
    const newLevel = getLevel(stats.xp);
    if (newLevel > stats.level) { 
      setStats(prev => ({ ...prev, level: newLevel }));
      setShowLevelUp(true); 
      setTimeout(() => setShowLevelUp(false), 3000); 
    }
  }, [stats.xp, stats.level]);

  useEffect(() => { localStorage.setItem(USER_STATS_KEY, JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(history)); }, [history]);

  const addRewards = (xp: number, coins: number) => { 
    const event = events.find(e => e.worldId === activeGame);
    const m = event ? event.multiplier : 1;
    setStats(prev => ({ ...prev, xp: prev.xp + (xp * m), coins: prev.coins + (coins * multiplier * m) })); 
  };
  const logActivityTime = (activity: string, minutes: number) => { const today = getTodayKey(); setHistory(prev => { const dayData = prev[today] || {}; return { ...prev, [today]: { ...dayData, [activity]: (dayData[activity] || 0) + minutes } }; }); };
  const handleMorningComplete = (items: string[]) => { setMultiplier(2); setStats(prev => ({ ...prev, inventory: Array.from(new Set([...prev.inventory, ...items])) })); const today = getTodayKey(); setLastQuestDate(today); localStorage.setItem(QUEST_LOG_KEY, JSON.stringify({ date: today })); logActivityTime('Morning Prep', 5); };
  
  return (
    <div className="min-h-screen bg-[#5c94fc] pixel-font pb-20 selection:bg-red-600 selection:text-white relative flex flex-col text-black overflow-y-auto">
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
          <div className="bg-yellow-400 border-8 border-black p-12 animate-bounce text-center shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-5xl font-black uppercase text-black italic tracking-tighter mb-4 text-center">LEVEL UP!</h2>
            <p className="text-xl font-bold uppercase text-black text-center">REACHED LEVEL {stats.level}!</p>
            <div className="mt-4 flex justify-center gap-4"><Star size={40} className="text-white fill-white animate-spin" /><Star size={40} className="text-white fill-white animate-spin" /><Star size={40} className="text-white fill-white animate-spin" /></div>
          </div>
        </div>
      )}
      <OverworldHUD stats={stats} multiplier={multiplier} onOpenJournal={() => setActiveGame('Journal')} onOpenAdmin={() => setActiveGame('Admin')} />
      
      {/* Event Banner */}
      <div className="bg-red-600 py-3 overflow-hidden whitespace-nowrap z-10 shrink-0 text-white text-[10px] uppercase font-black border-b-4 border-black">
        <div className="animate-marquee inline-block">
          {events.length > 0 ? (
            events.map(e => `★ LIVE EVENT: ${e.title} IN ${e.worldId.toUpperCase()}! ${e.multiplier}X REWARDS! ★ `).join('     ')
          ) : (
            '★ SUPER OWEN OVERWORLD ★ MISSION: TRIMESTER 3 MASTERY ★ WITTY & CURIOUS ★ '
          )}
        </div>
      </div>

      <header className="pt-16 pb-8 px-6 text-center z-10 shrink-0 text-black">
        <div className="relative inline-block"><div className="absolute -inset-4 bg-black border-4 border-white translate-x-2 translate-y-2"></div><div className="relative bg-[#e76d42] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white font-bold"><h1 className="text-2xl md:text-4xl leading-tight uppercase tracking-tighter font-bold text-center text-white">SUPER <br /> OWEN WORLD</h1></div></div>
      </header>
      <main className="max-w-7xl mx-auto px-6 z-10 flex-1 w-full text-center text-black mb-12">
        {lastQuestDate !== getTodayKey() && <MorningPowerUp onComplete={handleMorningComplete} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-black mb-20">
          <WorldCard id="FactFluency" world="W1" title="Fact Fortress" desc="Master Math!" icon={Zap} color="bg-yellow-400" onSelect={setActiveGame} event={events.find(e => e.worldId === 'FactFluency')} />
          <WorldCard id="ContextClues" world="W2" title="Context Caves" desc="Word mysteries!" icon={Brain} color="bg-green-400" onSelect={setActiveGame} event={events.find(e => e.worldId === 'ContextClues')} />
          <WorldCard id="FocusForest" world="W3" title="Focus Forest" desc="Stay on task!" icon={Clock} color="bg-orange-500" onSelect={setActiveGame} />
          <WorldCard id="AdvocacyCastle" world="W4" title="Advocacy Castle" desc="Speak up!" icon={Shield} color="bg-red-500" onSelect={setActiveGame} />
          <WorldCard id="ScienceLab" world="W5" title="Science Lab" desc="Explore space!" icon={Zap} color="bg-indigo-400" onSelect={setActiveGame} event={events.find(e => e.worldId === 'ScienceLab')} />
          <WorldCard id="GeoGlobe" world="W6" title="Geo Globe" desc="Travel world!" icon={Globe} color="bg-emerald-400" onSelect={setActiveGame} event={events.find(e => e.worldId === 'GeoGlobe')} />
          <WorldCard id="FunEvents" world="W7" title="Fun Factory" desc="Log fun stuff!" icon={Sparkles} color="bg-pink-400" onSelect={setActiveGame} />
          <WorldCard id="PianoPractice" world="W8" title="Piano Pavilion" desc="Music mastery!" icon={Music} color="bg-blue-400" onSelect={setActiveGame} />
          <WorldCard id="SpellingBee" world="W9" title="Spell Sprint" desc="Grade 4 Spell!" icon={Type} color="bg-cyan-400" onSelect={setActiveGame} event={events.find(e => e.worldId === 'SpellingBee')} />
          <WorldCard id="LexiaLink" world="Bonus" title="Lexia Power" desc="Reading level!" icon={Star} color="bg-purple-500" onSelect={setActiveGame} />
        </div>
      </main>
      {activeGame === 'Admin' && <AdminPanel stats={stats} history={history} onUpdateStats={setStats} onUpdateHistory={setHistory} onExit={() => setActiveGame(null)} />}
      {activeGame === 'Journal' && <QuestJournal history={history} onExit={() => setActiveGame(null)} />}
      {activeGame === 'FunEvents' && <FunEventsGame onExit={() => setActiveGame(null)} onReward={addRewards} onLogTime={logActivityTime} />}
      {activeGame === 'FactFluency' && <FactFluencyGame stats={stats} onExit={() => setActiveGame(null)} onReward={addRewards} onLogTime={(m: number) => logActivityTime('Math Facts', m)} />}
      {(activeGame === 'ContextClues' || activeGame === 'AdvocacyCastle' || activeGame === 'ScienceLab' || activeGame === 'GeoGlobe') && <MasteryGame stats={stats} id={activeGame} onExit={() => setActiveGame(null)} onReward={addRewards} onLogTime={(m: number) => logActivityTime(activeGame === 'ContextClues' ? 'Context Clues' : activeGame === 'ScienceLab' ? 'Science' : activeGame === 'GeoGlobe' ? 'Geography' : 'Advocacy', m)} />}
      {(activeGame === 'FocusForest' || activeGame === 'PianoPractice') && <FocusTimer title={activeGame === 'FocusForest' ? 'FOCUS FOREST' : 'PIANO PAVILION'} targetMins={activeGame === 'FocusForest' ? 10 : 20} onExit={() => setActiveGame(null)} onLogTime={(m: number) => logActivityTime(activeGame === 'FocusForest' ? 'Task Focus' : 'Piano Practice', m)} onComplete={(m: number) => { addRewards(activeGame === 'FocusForest' ? 500 : 1000, 50); logActivityTime(activeGame === 'FocusForest' ? 'Task Focus' : 'Piano Practice', m); setActiveGame(null); }} />}
      {activeGame === 'LexiaLink' && <LexiaOverlay onExit={() => setActiveGame(null)} onLog={() => logActivityTime('Lexia Reading', 20)} />}
      {activeGame === 'SpellingBee' && <SpellingBoardGame onExit={() => setActiveGame(null)} onReward={addRewards} onLogTime={(m: number) => logActivityTime('Spelling', m)} />}
      <footer className="mt-32 border-t-8 border-black mario-ground py-20 px-6 relative shrink-0 text-white text-center">
         <div className="max-w-4xl mx-auto text-center relative z-10 text-white text-center"><div className="w-24 h-40 mario-pipe mx-auto mb-8 text-center"></div><p className="text-white/50 text-[10px] uppercase tracking-widest italic font-bold text-center">{VERSION}</p><button onClick={() => setActiveGame('Admin')} className="mt-8 text-[8px] uppercase text-white/20 hover:text-white font-bold text-center underline">Admin Console</button></div>
      </footer>
    </div>
  );
}
