import { useState } from 'react';
import { Languages, Utensils, History, Play, ChefHat, ExternalLink, Globe } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    title: "Wuhan Three-Fresh Doupi",
    subtitle: "The King of Wuhan Breakfast (Guo Zao)",
    tagline: "Crispy Golden Skin, Fragrant Sticky Rice, Savory Filling.",
    about: "About Doupi",
    history: "A Rich History",
    recipe: "Authentic Recipe",
    gallery: "Watch the Magic (Street Food & Tutorials)",
    intro_text: "Wuhan Doupi (三鲜豆皮) is a legendary breakfast dish from Hubei. It's a savory, multi-layered masterpiece consisting of a golden egg crepe, aromatic glutinous rice, and a rich filling of pork, mushrooms, and bamboo shoots.",
    history_text: "With a history of nearly 400 years, Doupi evolved from a rural Lunar New Year delicacy to the urban staple it is today. In 1931, chef Gao Jinan opened 'Lao Tong Cheng', perfecting the 'Three-Fresh' (pork, mushroom, bamboo) version that even Chairman Mao praised in 1958.",
    ingredients: "Key Ingredients",
    steps: "Preparation Steps",
    ingredients_list: ["Mung Bean & Rice Batter", "Eggs", "Glutinous Rice", "Diced Pork Belly", "Shiitake Mushrooms", "Bamboo Shoots", "Firm Tofu", "Scallions"],
    steps_list: [
      "Steam the glutinous rice until perfectly soft yet chewy.",
      "Sauté the 'Three-Fresh' filling with savory seasonings.",
      "Spread the thin batter in a giant wok to form the skin.",
      "Crack an egg over the skin for that golden finish.",
      "Flip the skin, layer the rice and filling, then fold and cut into squares."
    ],
    video_caption: "Wuhan street food is best experienced visually. Watch how the massive pans are flipped with rhythm and skill.",
    footer: "Built for doupi.us - Celebrating Wuhan Street Food Culture"
  },
  zh: {
    title: "武汉三鲜豆皮",
    subtitle: "武汉过早之王",
    tagline: "金黄脆皮，软糯米香，鲜美馅料。",
    about: "关于豆皮",
    history: "历史渊源",
    recipe: "正宗做法",
    gallery: "现场盛况 (街头美食与教程)",
    intro_text: "武汉豆皮是湖北武汉极具代表性的传统小吃。它由三层组成：最外层是绿豆大米浆加鸡蛋摊成的金黄脆皮；中间是软糯的糯米；里层是猪肉、香菇和笋丁组成的“三鲜”馅料。",
    history_text: "豆皮已有近400年历史，最初是农村过年时的节日佳肴。1931年，厨师高金安创办“老通城”酒楼，改良了三鲜豆皮的做法。1958年，毛泽东主席曾两次品尝并给予高度评价。",
    ingredients: "主要原料",
    steps: "制作步骤",
    ingredients_list: ["绿豆大米浆", "鲜鸡蛋", "糯米", "五花肉丁", "干香菇", "冬笋", "香干丁", "葱花"],
    steps_list: [
      "将糯米蒸熟，要求颗粒饱满，软糯入味。",
      "将三鲜馅料下锅煸炒，加入调料焖煮。",
      "在大平底锅中摊开浆水，抹上蛋液，摊成金黄脆皮。",
      "翻面铺上糯米和馅料，折叠整齐。",
      "煎至底部焦脆，切成小方块，撒上葱花即可。"
    ],
    video_caption: "武汉街头美食的魅力在于现场感。看师傅们如何有节奏地翻动巨大的炒锅。",
    footer: "为 doupi.us 制作 - 传播武汉街头美食文化"
  }
};

const VIDEOS = [
  { id: 'Yh2HQk-yFJA', title: 'Goldthread: Carbs on Carbs', zhTitle: '武汉三鲜豆皮：碳水快乐之源 (Goldthread)' },
  { id: 'G4Xfu2sI3If', title: 'Shanhaiguan Road Tour', zhTitle: '2026武汉山海关路探店：三鲜豆皮 & 鸡冠饺' },
  { id: 'GZ0qXeyq_0s', title: 'Food Ranger in Wuhan', zhTitle: '美食大王：武汉街头三鲜豆皮盛况 (Food Ranger)' },
  { id: 'Gp7xQVIkujv', title: 'POV Making Doupi', zhTitle: '第一视角：看老师傅如何摊豆皮 (POV Street Food)' },
  { id: '6IZ8NJLfuhQ', title: 'Authentic Recipe Tutorial', zhTitle: '正宗武汉三鲜豆皮做法详解 (Rocky\'s Chinese Food)' },
  { id: 'cxnEqk1tnJ4', title: 'Homemade Version', zhTitle: '家庭版武汉豆皮：平底锅也能做出街头味' },
  { id: '1MWcrTM1eZ2', title: 'Vegan Doupi', zhTitle: '素食版武汉豆皮：鲜香软糯不打折 (Vegan Doupi)' },
  { id: 'Exsy30xCii9', title: 'Quick Assembly', zhTitle: '1分钟看懂武汉豆皮制作全过程 (#Shorts)' },
  { id: 'EnDlG1L9MHo', title: 'Market Morning', zhTitle: '武汉晨光：充满活力的豆皮摊位 (New China TV)' },
  { id: 'YyvSlyB-R3E', title: 'Master Chef Technique', zhTitle: '非遗传承：大师级三鲜豆皮技巧展示' },
  { id: '4UuYvU6kXnE', title: 'Wuhan Breakfast Tour', zhTitle: '武汉过早巡礼：豆皮是永远的主角' },
  { id: 'vX9F0_lT43E', title: 'Massive Pan Flip', zhTitle: '震撼！看武汉师傅单手翻动巨型豆皮锅' },
  { id: 'Z5fM0uMvXIk', title: 'Crispy Bottom ASMR', zhTitle: '酥脆预警！三鲜豆皮制作ASMR' },
  { id: 'P7fL509y_yQ', title: 'Lao Tong Cheng Legacy', zhTitle: '老通城传奇：武汉三鲜豆皮的历史与传承' },
  { id: 'U_Wp7W3vY-0', title: 'Modern Street Vendor', zhTitle: '现代街头：守护传统味道的年轻摊主' }
];

export default function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen bg-[#fff9f0] text-gray-800 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Utensils className="text-orange-500" />
          <h1 className="text-xl font-bold tracking-tight text-orange-900">DOUPI.US</h1>
        </div>
        <button 
          onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full transition-all shadow-md active:scale-95"
        >
          <Languages size={18} />
          <span className="font-semibold">{lang === 'en' ? '中文' : 'English'}</span>
        </button>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-extrabold text-orange-950 mb-4 animate-fade-in">
            {t.title}
          </h2>
          <p className="text-xl md:text-2xl text-orange-800 font-medium mb-8">
            {t.subtitle}
          </p>
          <div className="bg-orange-100 text-orange-900 px-6 py-3 rounded-full inline-block font-bold text-lg mb-12 border-2 border-orange-200">
            {t.tagline}
          </div>
        </div>
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl -z-10 translate-x-1/4 translate-y-1/4"></div>
      </section>

      {/* Content Grid */}
      <main className="max-w-6xl mx-auto px-6 grid gap-12 pb-24">
        
        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-50">
            <div className="flex items-center gap-3 mb-6 text-orange-600">
              <ChefHat size={32} />
              <h3 className="text-2xl font-bold">{t.about}</h3>
            </div>
            <p className="text-lg leading-relaxed text-gray-700">{t.intro_text}</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-50">
            <div className="flex items-center gap-3 mb-6 text-orange-600">
              <History size={32} />
              <h3 className="text-2xl font-bold">{t.history}</h3>
            </div>
            <p className="text-lg leading-relaxed text-gray-700">{t.history_text}</p>
          </div>
        </div>

        {/* Recipe Section */}
        <section className="bg-orange-900 text-white p-10 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="relative z-10 grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Utensils /> {t.ingredients}
              </h3>
              <ul className="grid grid-cols-2 gap-4">
                {t.ingredients_list.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-orange-100">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <ChefHat /> {t.steps}
              </h3>
              <ol className="space-y-4">
                {t.steps_list.map((step, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="bg-orange-700 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      {i + 1}
                    </span>
                    <span className="text-orange-100">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="absolute top-0 right-0 opacity-10 -translate-y-1/4 translate-x-1/4">
             <Utensils size={400} />
          </div>
        </section>

        {/* Video Gallery */}
        <section>
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-orange-950 mb-4 flex items-center justify-center gap-3">
              <Play className="fill-orange-600 text-orange-600" /> {t.gallery}
            </h3>
            <p className="text-xl text-orange-800 max-w-2xl mx-auto">{t.video_caption}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VIDEOS.map((vid) => (
              <div key={vid.id} className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-orange-100">
                <div className="aspect-video relative">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${vid.id}`}
                    title={lang === 'en' ? vid.title : vid.zhTitle}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="font-semibold text-gray-700 truncate">
                    {lang === 'en' ? vid.title : vid.zhTitle}
                  </span>
                  <a 
                    href={`https://youtube.com/watch?v=${vid.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-700"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-orange-950 text-orange-200 py-12 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-6 mb-8">
            <Globe className="hover:text-white transition-colors cursor-pointer" />
            <ChefHat className="hover:text-white transition-colors cursor-pointer" />
            <Utensils className="hover:text-white transition-colors cursor-pointer" />
          </div>
          <p className="text-lg font-medium opacity-80">{t.footer}</p>
          <div className="mt-4 text-sm opacity-50">© 2026 doupi.us - Three-Fresh Doupi (三鲜豆皮)</div>
        </div>
      </footer>

      {/* Custom Styles for Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
