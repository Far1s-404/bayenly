import { useEffect, useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Download, FileText, Headphones, LayoutDashboard, Library, LockKeyhole, Menu, MoreHorizontal, Play, Plus, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Star, TrendingUp, Users, Video, Wallet, X } from 'lucide-react';
import { lessons, videos, type Lesson } from './data';


const API_BASE = 'http://localhost:3000/api';

type ApiLesson = {
  id: number;
  title: string;
  description: string;
  subject: string;
  price: string | number;
  language: 'ar' | 'en';
  teacher_name: string;
  teacher_specialization?: string | null;
  video_count: number;
};


type Lang = 'en' | 'ar';
type Screen = 'home' | 'lesson' | 'dashboard';
const copy = {
  en: { explore: 'Explore lessons', teacher: 'Become a teacher', signin: 'Sign in', signup: 'Get started', heroKicker: 'LEARNING, ON YOUR TERMS', heroTitle: 'Find your lesson.\nGet it. Keep it.', heroText: 'The exact explanation you need, from Egypt’s best teachers. Pay once, learn whenever.', search: 'Search lessons, subjects, teachers…', searchBtn: 'Find a lesson', browse: 'Browse by subject', browseText: 'A good place to start.', featured: 'Picked for you', featuredText: 'Small packages. Big “aha” moments.', viewAll: 'View all lessons', how: 'Learning that fits your life', howText: 'No subscriptions. No pressure. Just the lesson you need.', steps: ['Find your lesson', 'Pay once', 'Learn your way'], stepsText: ['Search by subject, grade, or teacher.', 'One simple payment unlocks the whole package.', 'Rewatch anytime. Your lessons stay yours.'], teacherCta: 'Teach what you love.', teacherSub: 'Turn your expertise into lessons students can keep coming back to.', startTeaching: 'Start teaching', footer: 'Made for curious minds, right here in Egypt.', details: 'View lesson', all: 'All subjects', empty: 'No lessons found', emptySub: 'Try another search or choose a different subject.', videos: 'videos', categories: ['All subjects','Mathematics','Science','Languages','Physics','Biology','History'] },
  ar: { explore: 'استكشف الدروس', teacher: 'كن معلّمًا', signin: 'دخول', signup: 'ابدأ الآن', heroKicker: 'تعلّم على طريقتك', heroTitle: 'الشرح اللي محتاجه\nبالظبط.', heroText: 'شرح واضح من أفضل المدرسين في مصر. ادفع مرة واحدة واتعلم وقت ما تحب.', search: 'ابحث عن درس، مادة، أو معلّم…', searchBtn: 'ابحث عن درس', browse: 'استكشف حسب المادة', browseText: 'بداية موفقة للتعلّم.', featured: 'اخترنا لك', featuredText: 'باقات صغيرة. لحظات فهم كبيرة.', viewAll: 'كل الدروس', how: 'تعلّم يناسب يومك', howText: 'من غير اشتراكات أو ضغط. الدرس اللي محتاجه وبس.', steps: ['اختار درسك', 'ادفع مرة واحدة', 'اتعلم بطريقتك'], stepsText: ['ابحث بالمادة أو الصف أو اسم المدرس.', 'دفعة واحدة تفتح لك الباقة كاملة.', 'شاهد في أي وقت. دروسك تفضل معاك.'], teacherCta: 'علّم اللي بتحبه.', teacherSub: 'حوّل خبرتك لدروس يرجعلها الطلاب وقت ما يحتاجوا.', startTeaching: 'ابدأ التدريس', footer: 'للعقول الفضولية، من قلب مصر.', details: 'عرض الدرس', all: 'كل المواد', empty: 'ملقيناش دروس', emptySub: 'جرّب بحث تاني أو اختار مادة مختلفة.', videos: 'فيديوهات', categories: ['كل المواد','رياضيات','علوم','لغات','فيزياء','أحياء','تاريخ'] }
};
const subjects = [
  { en: 'Mathematics', ar: 'رياضيات', icon: '∑', color: 'subject-violet', count: '120+' }, { en: 'Science', ar: 'علوم', icon: '⚗', color: 'subject-coral', count: '86' }, { en: 'Languages', ar: 'لغات', icon: 'Aa', color: 'subject-lime', count: '64' }, { en: 'Physics', ar: 'فيزياء', icon: '◌', color: 'subject-blue', count: '42' }, { en: 'Biology', ar: 'أحياء', icon: '⌬', color: 'subject-pink', count: '38' }, { en: 'History', ar: 'تاريخ', icon: '◷', color: 'subject-peach', count: '26' }
];
const teacherSections = ['Overview', 'My Packages', 'Content Library', 'Orders & Earnings', 'Profile'];

type MarketplaceProps = { lang?: Lang; setLang?: (language: Lang) => void; route?: string; onNavigate?: (path: string) => void };
export default function App({ lang: externalLang, setLang: externalSetLang, route = '/', onNavigate }: MarketplaceProps) {
  const [internalLang, setInternalLang] = useState<Lang>('en');
  const lang = externalLang ?? internalLang; const setLang = externalSetLang ?? setInternalLang;
  const [screen, setScreen] = useState<Screen>(() => route.startsWith('/lesson') ? 'lesson' : route.startsWith('/teacher') ? 'dashboard' : 'home');
  const [query, setQuery] = useState('');
  
  const [apiLessons, setApiLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonsError, setLessonsError] = useState('');

  const [category, setCategory] = useState(0);
  const [toast, setToast] = useState('');
  const [activeSection, setActiveSection] = useState('Overview');
  const [mobileNav, setMobileNav] = useState(false);
  const t = copy[lang]; const ar = lang === 'ar';
  useEffect(() => { setScreen(route.startsWith('/lesson') ? 'lesson' : route.startsWith('/teacher') ? 'dashboard' : 'home'); }, [route]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = ar ? 'rtl' : 'ltr'; }, [lang, ar]);
  
  
useEffect(() => {
  const controller = new AbortController();

  async function fetchLessons() {
    try {
      setLoadingLessons(true);
      setLessonsError('');

      const response = await fetch(`${API_BASE}/lessons`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Could not load lessons.');
      }

      const data: { lessons: ApiLesson[] } | ApiLesson[] =
        await response.json();

      const packages = Array.isArray(data) ? data : data.lessons;

      const mapped: Lesson[] = packages.map((item, index) => {
        const visual = lessons[index % lessons.length];

        return {
          id: item.id,
          title: item.title,
          teacher: item.teacher_name,
          subject: item.subject,
          grade: item.teacher_specialization || 'All levels',
          videos: item.video_count,
          duration: '—',
          price: Number(item.price),
          rating: '—',
          color: visual.color,
          art: visual.art,
          tag: 'Lesson package',
        };
      });

      setApiLessons(mapped);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setLessonsError(error.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingLessons(false);
      }
    }
  }

  fetchLessons();

  return () => controller.abort();
}, []);


  const filtered = useMemo(() => apiLessons.filter(l => {
    const q = query.trim().toLowerCase(); const matchesQuery = !q || [l.title,l.teacher,l.subject,l.grade].some(v=>v.toLowerCase().includes(q));
    const selected = t.categories[category]; const subjectMap: Record<string,string> = { 'رياضيات':'Mathematics','علوم':'Science','لغات':'Languages','فيزياء':'Physics','أحياء':'Biology','تاريخ':'History' };
    const c = subjectMap[selected] || selected; return matchesQuery && (category === 0 || l.subject === c || (c === 'Science' && ['Biology','Physics'].includes(l.subject)));
  }), [apiLessons,query,category,t]);
  const notify = (msg: string) => { setToast(msg); window.setTimeout(()=>setToast(''), 3200); };
  const go = (target: Screen) => { setScreen(target); setMobileNav(false); onNavigate?.(target === 'lesson' ? '/lesson/newton' : target === 'dashboard' ? '/teacher/overview' : '/'); window.scrollTo({top:0,behavior:'smooth'}); };

  return <div className={`app ${ar?'rtl':'ltr'}`} dir={ar?'rtl':'ltr'}>
    {screen === 'dashboard' ? <Dashboard lang={lang} setLang={setLang} ar={ar} active={activeSection} setActive={setActiveSection} onHome={()=>go('home')} onCreate={()=>notify(ar?'إنشاء الباقات متاح قريبًا في النموذج التجريبي.':'Package creation is coming soon in this demo.')} /> : <>
      <header className="topbar"><div className="topbar-inner"><button className="brand" onClick={()=>go('home')} aria-label="Bayyenly home"><span className="brand-mark">ب</span><span>bayyenly<span className="brand-dot">.</span></span></button>
        <nav className={`main-nav ${mobileNav?'nav-open':''}`}><button onClick={()=>go('home')}>{t.explore}</button><button onClick={()=>go('dashboard')}>{t.teacher}</button></nav>
        <div className="nav-actions"><LanguageSwitch lang={lang} setLang={setLang}/><button className="text-button hide-small" onClick={()=>onNavigate?.('/login')}>{t.signin}</button><button className="button button-dark nav-cta" onClick={()=>onNavigate?.('/register')}>{t.signup}<ArrowUpRight size={15}/></button></div>
        <button className="mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav?<X/>:<Menu/>}</button>
      </div></header>
      {screen === 'home' ? <main>
        <section className="hero"><div className="hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/>{t.heroKicker}</div><h1>{t.heroTitle.split('\n').map((line,i)=><span key={line}>{line}{i===0&&<br/>}</span>)}</h1><p className="hero-sub">{t.heroText}</p><form className="search-box" onSubmit={e=>{e.preventDefault();document.getElementById('lessons')?.scrollIntoView({behavior:'smooth'});}}><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} aria-label={t.search}/><button className="button button-primary" type="submit">{t.searchBtn}<ArrowRight className={ar?'flip':''} size={16}/></button></form><div className="hero-proof"><div className="avatar-stack"><span>م</span><span>ع</span><span>س</span><span>+</span></div><div><strong>12,000+</strong><small>{ar?'طالب بدأوا يتعلموا':'students learning their way'}</small></div><div className="proof-stars"><Star size={14} fill="currentColor"/> 4.9</div></div></div>
          <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-note note-top"><Sparkles size={15}/><span>{ar?'خطوة بخطوة':'One concept at a time'}</span></div><div className="study-card"><div className="study-head"><div className="tiny-brand">ب</div><span>{ar?'باقة فيزياء':'PHYSICS · GRADE 10'}</span><Bookmark size={16}/></div><div className="atom-art"><div className="atom-core"/><i/><i/><i/></div><div className="study-title">Newton’s<br/>laws of motion</div><div className="study-footer"><span><Play size={12} fill="currentColor"/> 8 {t.videos}</span><b>EGP 180</b></div></div><div className="hero-note note-bottom"><span className="note-icon"><Check size={16}/></span><span><strong>{ar?'تملك دروسك':'Yours to keep'}</strong><small>{ar?'وصول دائم بعد الدفع':'One payment. Ongoing access.'}</small></span></div><div className="hero-scribble">✳</div></div>
        </div><div className="hero-bottom"><span>{ar?'المنصة التعليمية اللي بتفهمك':'A better way to understand'}</span><div className="hero-brands"><span>Maths</span><i/> <span>Science</span><i/> <span>Languages</span><i/> <span>Humanities</span></div></div></section>
        <section className="section subject-section"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">{ar?'اختار طريقك':'MAKE IT YOURS'}</div><h2>{t.browse}</h2><p>{t.browseText}</p></div><button className="link-button" onClick={()=>{setCategory(0);document.getElementById('lessons')?.scrollIntoView({behavior:'smooth'});}}>{t.viewAll}<ArrowRight className={ar?'flip':''} size={16}/></button></div><div className="subject-grid">{subjects.map((s,i)=><button key={s.en} className={`subject-card ${s.color}`} onClick={()=>{setCategory(i===0?1:i===1?2:i===2?3:i===3?4:i===4?5:i===5?6:0);document.getElementById('lessons')?.scrollIntoView({behavior:'smooth'});}}><span className="subject-icon">{s.icon}</span><span className="subject-info"><strong>{ar?s.ar:s.en}</strong><small>{s.count} {ar?'درس':'lessons'}</small></span><ArrowUpRight size={16} className="subject-arrow"/></button>)}</div></section>
        <section className="section featured-section" id="lessons"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">{ar?'دروس تستاهل وقتك':'GOOD THINGS TO LEARN'}</div><h2>{t.featured}</h2><p>{t.featuredText}</p></div><button className="link-button" onClick={()=>{setCategory(0);setQuery('');}}>{t.viewAll}<ArrowRight className={ar?'flip':''} size={16}/></button></div><div className="filter-row">{t.categories.map((c,i)=><button key={c} onClick={()=>setCategory(i)} className={`filter-chip ${category===i?'selected':''}`}>{c}</button>)}</div>{loadingLessons ? (
          <p role="status">Loading lessons...</p>
        ) : lessonsError ? (
          <div className="empty-state">
            <strong>Could not load lessons</strong>
            <span>{lessonsError}</span>
            <button className="button button-outline" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : filtered.length ? (
          <div className="lesson-grid">
            {filtered.slice(0, 4).map(item => (
              <LessonCard key={item.id} lesson={item} lang={lang} onClick={() => go('lesson')} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><Search /></span>
            <strong>{t.empty}</strong>
            <span>{t.emptySub}</span>
            <button className="button button-outline" onClick={() => { setQuery(''); setCategory(0); }}>
              {ar ? 'مسح البحث' : 'Clear search'}
            </button>
          </div>
        )}</section>
        <section className="how-section"><div className="how-intro"><div className="eyebrow"><span className="eyebrow-dot lime-dot"/>{ar?'تعلم من غير تعقيد':'SIMPLE BY DESIGN'}</div><h2>{t.how}</h2><p>{t.howText}</p><button className="button button-lime" onClick={()=>document.getElementById('lessons')?.scrollIntoView({behavior:'smooth'})}>{ar?'استكشف الدروس':'Explore lessons'}<ArrowRight className={ar?'flip':''} size={16}/></button><div className="how-deco">✳</div></div><div className="step-list">{t.steps.map((step,i)=><div className="step-item" key={step}><span className={`step-number ${i===1?'step-coral':''}`}>0{i+1}</span><div><h3>{step}</h3><p>{t.stepsText[i]}</p></div><ArrowDownLeft className="step-arrow" size={18}/></div>)}</div></section>
        <section className="teacher-banner"><div className="teacher-doodle">✳</div><div className="teacher-content"><div className="eyebrow"><span className="eyebrow-dot coral-dot"/>{ar?'للمدرسين':'FOR TEACHERS'}</div><h2>{t.teacherCta}</h2><p>{t.teacherSub}</p><button className="button button-dark" onClick={()=>go('dashboard')}>{t.startTeaching}<ArrowUpRight size={16}/></button></div><div className="teacher-stats"><div><strong>EGP</strong><span>{ar?'دخل مقابل خبرتك':'Your knowledge, valued'}</span></div><div className="stats-line"/><div><strong>∞</strong><span>{ar?'دروسك تفضل متاحة':'Lessons that last'}</span></div></div></section>
      </main> : <LessonDetails lang={lang} onBack={()=>go('home')} notify={notify} onBuy={()=>onNavigate?.('/checkout')} />}
      <Footer lang={lang} onTeacher={()=>go('dashboard')} notify={notify}/>
    </>}
    {toast&&<div className="toast" role="status"><span className="toast-check"><Check size={15}/></span>{toast}<button onClick={()=>setToast('')} aria-label="Close"><X size={15}/></button></div>}
  </div>;
}

function LanguageSwitch({lang,setLang}:{lang:Lang;setLang:(l:Lang)=>void}) { return <div className="lang-switch" aria-label="Choose language"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><span/> <button className={lang==='ar'?'active':''} onClick={()=>setLang('ar')}>AR</button></div>; }
function LessonCard({lesson,lang,onClick}:{lesson:Lesson;lang:Lang;onClick:()=>void}) { return <article className="lesson-card"><button className={`lesson-art art-${lesson.color}`} onClick={onClick} aria-label={`${lang==='ar'?'عرض':'View'} ${lesson.title}`}><span className="art-badge"><Sparkles size={12}/>{lesson.tag}</span><span className="art-symbol">{lesson.art}</span><span className="art-corner"><ArrowUpRight size={17}/></span><span className="art-stripe"/></button><div className="lesson-card-body"><div className="lesson-meta"><span>{lesson.subject}</span><span className="dot-sep"/>{lesson.grade}</div><button className="lesson-title" onClick={onClick}>{lesson.title}</button><div className="teacher-line"><span className="teacher-avatar">{lesson.teacher.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><span>{lesson.teacher}</span><span className="rating"><Star size={12} fill="currentColor"/>{lesson.rating}</span></div><div className="card-divider"/><div className="lesson-bottom"><span><Video size={14}/>{lesson.videos} {copy[lang].videos}<i/> <Clock3 size={14}/>{lesson.duration}</span><strong>EGP {lesson.price}</strong></div></div></article>; }
function Footer({lang,onTeacher,notify}:{lang:Lang;onTeacher:()=>void;notify:(message:string)=>void}) { const ar=lang==='ar';return <footer className="footer"><div className="footer-main"><div className="footer-brand"><span className="brand"><span className="brand-mark">ب</span><span>bayyenly<span className="brand-dot">.</span></span></span><p>{copy[lang].footer}</p></div><div className="footer-links"><div><strong>{ar?'اكتشف':'Discover'}</strong><a href="#lessons">{copy[lang].explore}</a><a href="#lessons">{ar?'المواد الدراسية':'Subjects'}</a></div><div><strong>{ar?'للمدرسين':'For teachers'}</strong><button onClick={onTeacher}>{copy[lang].teacher}</button><button onClick={onTeacher}>{ar?'لوحة التحكم':'Teacher workspace'}</button></div><div><strong>{ar?'مساعدة':'Help'}</strong><button onClick={()=>notify(ar?'تفاصيل التواصل ستتوفر قريبًا.':'Contact details will be available soon.')}>{ar?'تواصل معنا':'Contact us'}</button><button onClick={()=>notify(ar?'الأسئلة الشائعة ستتوفر قريبًا.':'FAQs will be available soon.')}>{ar?'الأسئلة الشائعة':'FAQs'}</button></div></div></div><div className="footer-bottom"><span>© 2025 Bayyenly. {ar?'جميع الحقوق محفوظة':'All rights reserved'}.</span><span>{ar?'مصنوع بحب في مصر':'Made with care in Egypt'} <span className="egypt-mark">✳</span></span></div></footer>; }

function LessonDetails({lang,onBack,notify,onBuy}:{lang:Lang;onBack:()=>void;notify:(s:string)=>void;onBuy:()=>void}) { const ar=lang==='ar'; const featured=lessons[0]; return <main className="details-page"><div className="breadcrumbs"><button onClick={onBack}>{ar?'الرئيسية':'Home'}</button><ChevronRight size={14}/><button onClick={onBack}>{ar?'الدروس':'Lessons'}</button><ChevronRight size={14}/><span>{featured.title}</span></div><div className="details-layout"><div className="details-main"><div className="detail-topline"><span className="pill-subject">{ar?'فيزياء':'Physics'}</span><span className="pill-grade">{ar?'الصف الأول الثانوي':'Grade 10'}</span><span className="detail-share"><button onClick={()=>notify(ar?'تم حفظ الدرس في قائمتك.':'Lesson saved to your list.')} aria-label="Save lesson"><Bookmark size={17}/></button><button onClick={()=>notify(ar?'الرابط جاهز للمشاركة.':'Share link copied in this demo.')} aria-label="Share lesson"><ArrowUpRight size={17}/></button></span></div><h1 className="details-title">Newton’s Laws<br className="desktop-break"/> of Motion</h1><p className="details-description">A clear, visual walkthrough of the three laws that explain how everything moves. Build real understanding, then put it to work with guided examples and exam-style questions.</p><div className="teacher-profile"><span className="profile-avatar">OH</span><div><strong>Omar Hassan <BadgeCheck className="verified" size={16}/></strong><span>{ar?'مدرس فيزياء':'Physics teacher'} <i/> 8 {ar?'سنوات خبرة':'years teaching'}</span></div><div className="profile-rating"><Star size={14} fill="currentColor"/><strong>4.9</strong><span>(126 {ar?'تقييم':'reviews'})</span></div></div><button className="video-preview" onClick={()=>notify(ar?'هذا معاينة تجريبية للفيديو.':'This is a demo video preview.')}><div className="video-art"><div className="video-orbit one"/><div className="video-orbit two"/><span className="video-atom">⊙</span><span className="video-equation">F = m × a</span><span className="video-caption">NEWTON’S<br/>SECOND LAW</span></div><span className="play-button"><Play fill="currentColor" size={21}/></span><span className="preview-label">{ar?'معاينة الدرس':'PREVIEW LESSON'}</span><span className="preview-duration">02:14</span></button><div className="content-section"><div className="content-heading"><div><h2>{ar?'ماذا ستتعلم':'What you’ll learn'}</h2><p>{ar?'شرح كامل للقوانين مع تطبيق عملي':'A complete toolkit for understanding force and motion.'}</p></div><span className="content-summary">8 {ar?'فيديوهات':'videos'} <i/> 2h 40m</span></div><div className="video-list">{videos.map((v,i)=><div className={`video-row ${v.preview?'preview-row':''}`} key={v.title}><span className="video-index">{v.preview?<Play size={13}/>:String(i+1).padStart(2,'0')}</span><span className="video-name">{v.title}{v.preview&&<small>{ar?'متاح للمعاينة':'Free preview'}</small>}</span><span className="video-time">{v.duration}</span><LockKeyhole size={14} className={v.preview?'unlocked':''}/></div>)}</div></div><div className="resources-section"><h2>{ar?'موارد إضافية':'Learning resources'}</h2><div className="resource-row"><span className="resource-icon"><FileText size={19}/></span><span><strong>Newton’s Laws — Quick Notes</strong><small>PDF · 4 pages</small></span><Download size={17} className="resource-download"/></div><div className="resource-row"><span className="resource-icon coral-resource"><FileText size={19}/></span><span><strong>Practice Questions + Answers</strong><small>PDF · 12 questions</small></span><Download size={17} className="resource-download"/></div></div><div className="objectives"><h2>{ar?'ما ستتمكن من فعله':'By the end, you can…'}</h2><p><Check size={16}/>Explain inertia and predict motion using Newton’s first law</p><p><Check size={16}/>Apply F = ma to calculate forces in real situations</p><p><Check size={16}/>Draw free body diagrams and solve exam questions</p></div><div className="same-teacher"><div className="section-heading"><div><h2>{ar?'دروس أخرى من عمر':'More from Omar'}</h2><p>{ar?'واصل التعلّم مع عمر':'Keep learning with this teacher.'}</p></div><button className="link-button" onClick={onBack}>{ar?'عرض الكل':'View all'}<ArrowRight size={15}/></button></div><div className="teacher-more-cards">{lessons.slice(4,6).map(l=><LessonCard key={l.id} lesson={l} lang={lang} onClick={()=>notify(ar?'تفاصيل الدرس ستظهر هنا.':'Lesson detail view is shown above.')}/>)}</div></div></div><aside className="purchase-column"><div className="purchase-card"><div className="purchase-card-top"><div className="eyebrow muted-eyebrow">{ar?'باقة تعليمية':'LESSON PACKAGE'}</div><div className="purchase-price">EGP 180 <small>{ar?'دفعة واحدة':'one-time payment'}</small></div><p>{ar?'وصول دائم لكل دروس الباقة':'Unlock the full package. Keep it for good.'}</p><button className="button button-primary buy-button" onClick={onBuy}>{ar?'شراء الباقة':'Buy Lesson Package'}<ArrowRight className={ar?'flip':''} size={17}/></button><div className="access-note"><ShieldCheck size={18}/><span><strong>{ar?'وصول دائم':'Ongoing access'}</strong><small>{ar?'ادفع مرة واحدة وافتح كل الدروس. شاهدها في أي وقت.':'One purchase unlocks every lesson. Revisit anytime.'}</small></span></div></div><div className="package-includes"><h3>{ar?'ماذا تتضمن الباقة':'This package includes'}</h3><p><Video size={16}/><span>8 video lessons</span><strong>2h 40m</strong></p><p><FileText size={16}/><span>2 downloadable PDFs</span></p><p><Headphones size={16}/><span>Lifetime access</span></p><p><LockKeyhole size={16}/><span>Watch on any device</span></p></div><div className="purchase-teacher"><span className="profile-avatar">OH</span><div><small>{ar?'مدرس الباقة':'YOUR TEACHER'}</small><strong>Omar Hassan</strong><span><Star size={11} fill="currentColor"/> 4.9 · 126 reviews</span></div><ChevronRight size={17}/></div></div><div className="safe-note"><ShieldCheck size={15}/>{ar?'دفع آمن عند تفعيل الدفع':'Secure checkout when payments go live'}</div></aside></div></main>; }









