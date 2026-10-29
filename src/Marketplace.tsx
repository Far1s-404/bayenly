import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, type AuthUser } from './api';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Download, FileText, Headphones, LayoutDashboard, Library, LockKeyhole, LogOut, Menu, MoreHorizontal, Play, Plus, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Star, TrendingUp, User, Users, Video, Wallet, X } from 'lucide-react';

import { videos, type Lesson } from './data';

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
type Screen = 'home' | 'lesson';
const copy = {
  en: { explore: 'Explore lessons', teacher: 'Become a teacher', signin: 'Sign in', signup: 'Get started', heroKicker: 'LEARNING, ON YOUR TERMS', heroTitle: 'Find your lesson.\nGet it. Keep it.', heroText: 'The exact explanation you need, from Egypt’s best teachers. Pay once, learn whenever.', search: 'Search lessons, subjects, teachers…', searchBtn: 'Find a lesson', browse: 'Browse by subject', browseText: 'A good place to start.', featured: 'Picked for you', featuredText: 'Small packages. Big “aha” moments.', viewAll: 'View all lessons', how: 'Learning that fits your life', howText: 'No subscriptions. No pressure. Just the lesson you need.', steps: ['Find your lesson', 'Pay once', 'Learn your way'], stepsText: ['Search by subject, grade, or teacher.', 'One simple payment unlocks the whole package.', 'Rewatch anytime. Your lessons stay yours.'], teacherCta: 'Teach what you love.', teacherSub: 'Turn your expertise into lessons students can keep coming back to.', startTeaching: 'Start teaching', footer: 'Made for curious minds, right here in Egypt.', details: 'View lesson', all: 'All subjects', empty: 'No lessons found', emptySub: 'Try another search or choose a different subject.', videos: 'videos', categories: ['All subjects','Mathematics','Science','Languages','Physics','Biology','History'] },
  ar: { explore: 'استكشف الدروس', teacher: 'كن معلّمًا', signin: 'دخول', signup: 'ابدأ الآن', heroKicker: 'تعلّم على طريقتك', heroTitle: 'الشرح اللي محتاجه\nبالظبط.', heroText: 'شرح واضح من أفضل المدرسين في مصر. ادفع مرة واحدة واتعلم وقت ما تحب.', search: 'ابحث عن درس، مادة، أو معلّم…', searchBtn: 'ابحث عن درس', browse: 'استكشف حسب المادة', browseText: 'بداية موفقة للتعلّم.', featured: 'اخترنا لك', featuredText: 'باقات صغيرة. لحظات فهم كبيرة.', viewAll: 'كل الدروس', how: 'تعلّم يناسب يومك', howText: 'من غير اشتراكات أو ضغط. الدرس اللي محتاجه وبس.', steps: ['اختار درسك', 'ادفع مرة واحدة', 'اتعلم بطريقتك'], stepsText: ['ابحث بالمادة أو الصف أو اسم المدرس.', 'دفعة واحدة تفتح لك الباقة كاملة.', 'شاهد في أي وقت. دروسك تفضل معاك.'], teacherCta: 'علّم اللي بتحبه.', teacherSub: 'حوّل خبرتك لدروس يرجعلها الطلاب وقت ما يحتاجوا.', startTeaching: 'ابدأ التدريس', footer: 'للعقول الفضولية، من قلب مصر.', details: 'عرض الدرس', all: 'كل المواد', empty: 'ملقيناش دروس', emptySub: 'جرّب بحث تاني أو اختار مادة مختلفة.', videos: 'فيديوهات', categories: ['كل المواد','رياضيات','علوم','لغات','فيزياء','أحياء','تاريخ'] }
};
const subjects = [
  { en: 'Mathematics', ar: 'رياضيات', icon: '∑', color: 'subject-violet', count: '120+' }, { en: 'Science', ar: 'علوم', icon: '⚗', color: 'subject-coral', count: '86' }, { en: 'Languages', ar: 'لغات', icon: 'Aa', color: 'subject-lime', count: '64' }, { en: 'Physics', ar: 'فيزياء', icon: '◌', color: 'subject-blue', count: '42' }, { en: 'Biology', ar: 'أحياء', icon: '⌬', color: 'subject-pink', count: '38' }, { en: 'History', ar: 'تاريخ', icon: '◷', color: 'subject-peach', count: '26' }
];
const teacherSections = ['Overview', 'My Packages', 'Content Library', 'Orders & Earnings', 'Profile'];

type MarketplaceProps = { lang?: Lang; setLang?: (language: Lang) => void; route?: string; onNavigate?: (path: string) => void; authUser?: AuthUser | null; onSignOut?: () => void };
export default function App({ lang: externalLang, setLang: externalSetLang, route = '/', onNavigate, authUser, onSignOut }: MarketplaceProps) {
  const [internalLang, setInternalLang] = useState<Lang>('en');
  const lang = externalLang ?? internalLang; const setLang = externalSetLang ?? setInternalLang;
  const [screen, setScreen] = useState<Screen>(() => route.startsWith('/lesson') ? 'lesson' : 'home');
  const [query, setQuery] = useState('');
  
  const [apiLessons, setApiLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonsError, setLessonsError] = useState('');

  const [category, setCategory] = useState(0);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const t = copy[lang]; const ar = lang === 'ar';
  useEffect(() => { setScreen(route.startsWith('/lesson') ? 'lesson' : 'home'); }, [route]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = ar ? 'rtl' : 'ltr'; }, [lang, ar]);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);
  
  
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

      const data = await response.json();

const packages: ApiLesson[] = Array.isArray(data)
  ? data
  : Array.isArray(data.lessons)
    ? data.lessons
    : Array.isArray(data.packages)
      ? data.packages
      : Array.isArray(data.data)
        ? data.data
        : [];

if (!Array.isArray(packages)) {
  throw new Error('Unexpected lessons API response.');
}

const mapped: Lesson[] = packages.map((item, index) => {
    const visual = videos[index % videos.length];

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
          color: '#EDE9FE',
          art: '🎓',
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
  const routeLessonMatch = route.match(/^\/lesson\/(\d+)$/);
  const routeLessonId = routeLessonMatch ? Number(routeLessonMatch[1]) : null;

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    routeLessonId
  );

  useEffect(() => {
    setSelectedLessonId(routeLessonId);
  }, [routeLessonId]);
  const go = (target: Screen) => { setScreen(target); setMobileNav(false); onNavigate?.(target === 'lesson' ? '/lesson/newton' : '/'); window.scrollTo({top:0,behavior:'smooth'}); };
  const workspacePath = authUser?.role === 'admin'
    ? '/admin/overview'
    : authUser?.role === 'teacher'
      ? '/teacher/overview'
      : '/student/overview';
  const teachingPath = authUser?.role === 'teacher'
    ? '/teacher/overview'
    : authUser?.role === 'admin'
      ? '/admin/overview'
      : '/teacher/apply';
  const openLesson = (id: number) => {
  setSelectedLessonId(id);
  setScreen('lesson');
  onNavigate?.(`/lesson/${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
  return <div className={`app ${ar?'rtl':'ltr'}`} dir={ar?'rtl':'ltr'}>
      <header className="topbar"><div className="topbar-inner"><button className="brand" onClick={()=>go('home')} aria-label="Bayyenly home"><span className="brand-mark">ب</span><span>bayyenly<span className="brand-dot">.</span></span></button>
        <nav className={`main-nav ${mobileNav?'nav-open':''}`}><button onClick={()=>go('home')}>{t.explore}</button><button onClick={()=>onNavigate?.(teachingPath)}>{t.teacher}</button></nav>
        <div className="nav-actions">
          <LanguageSwitch lang={lang} setLang={setLang} />
          {authUser ? (
            <>
              <button className="text-button hide-small" onClick={() => onNavigate?.(workspacePath)}>
                {authUser.name}
              </button>
              <div className="account-menu-container" ref={accountMenuRef}>
                <button
                  className="button button-outline nav-settings"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  aria-label={ar ? 'قائمة الحساب' : 'Account menu'}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  title={ar ? 'قائمة الحساب' : 'Account menu'}
                >
                  <Settings size={16} />
                  <span className="settings-label">{ar ? 'الحساب' : 'Account'}</span>
                </button>
                {accountMenuOpen && (
                  <div className="account-menu" role="menu">
                    <div className="account-menu-heading">{authUser.name}</div>
                    {authUser.role === 'student' ? (
                      <>
                        <button role="menuitem" onClick={() => { setAccountMenuOpen(false); onNavigate?.('/student/profile'); }}>
                          <User size={16} />{ar ? 'إعدادات الملف الشخصي' : 'Profile settings'}
                        </button>
                        <button role="menuitem" onClick={() => { setAccountMenuOpen(false); onNavigate?.('/student/overview'); }}>
                          <LayoutDashboard size={16} />{ar ? 'لوحة الطالب' : 'Student overview'}
                        </button>
                        <button role="menuitem" onClick={() => { setAccountMenuOpen(false); onNavigate?.('/student/learning'); }}>
                          <BookOpen size={16} />{ar ? 'تعلّمي' : 'My learning'}
                        </button>
                        <button role="menuitem" onClick={() => { setAccountMenuOpen(false); onNavigate?.('/student/orders'); }}>
                          <ShoppingBag size={16} />{ar ? 'سجل المشتريات' : 'Purchase history'}
                        </button>
                      </>
                    ) : (
                      <button role="menuitem" onClick={() => { setAccountMenuOpen(false); onNavigate?.(workspacePath); }}>
                        <LayoutDashboard size={16} />{ar ? 'مساحة العمل' : 'Workspace'}
                      </button>
                    )}
                    <div className="account-menu-divider" />
                    <button className="account-menu-signout" role="menuitem" onClick={() => { setAccountMenuOpen(false); onSignOut?.(); }}>
                      <LogOut size={16} />{ar ? 'تسجيل الخروج' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="text-button hide-small" onClick={() => onNavigate?.('/login')}>{t.signin}</button>
              <button className="button button-dark nav-cta" onClick={() => onNavigate?.('/register')}>
                {t.signup}<ArrowUpRight size={15} />
              </button>
            </>
          )}
        </div>
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
              <LessonCard key={item.id} lesson={item} lang={lang} onClick={() => openLesson(item.id)} />
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
        <section className="teacher-banner"><div className="teacher-doodle">✳</div><div className="teacher-content"><div className="eyebrow"><span className="eyebrow-dot coral-dot"/>{ar?'للمدرسين':'FOR TEACHERS'}</div><h2>{t.teacherCta}</h2><p>{t.teacherSub}</p><button className="button button-dark" onClick={()=>onNavigate?.(teachingPath)}>{t.startTeaching}<ArrowUpRight size={16}/></button></div><div className="teacher-stats"><div><strong>EGP</strong><span>{ar?'دخل مقابل خبرتك':'Your knowledge, valued'}</span></div><div className="stats-line"/><div><strong>∞</strong><span>{ar?'دروسك تفضل متاحة':'Lessons that last'}</span></div></div></section>
      </main> : <LessonDetails
  lang={lang}
  lessonId={selectedLessonId}
  onBack={() => go('home')}
  notify={notify}
/>}
      <Footer lang={lang} onTeacher={()=>onNavigate?.(teachingPath)} notify={notify}/>
    {toast&&<div className="toast" role="status"><span className="toast-check"><Check size={15}/></span>{toast}<button onClick={()=>setToast('')} aria-label="Close"><X size={15}/></button></div>}
  </div>;
}

function LanguageSwitch({lang,setLang}:{lang:Lang;setLang:(l:Lang)=>void}) { return <div className="lang-switch" aria-label="Choose language"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><span/> <button className={lang==='ar'?'active':''} onClick={()=>setLang('ar')}>AR</button></div>; }
function LessonCard({lesson,lang,onClick}:{lesson:Lesson;lang:Lang;onClick:()=>void}) { return <article className="lesson-card"><button className={`lesson-art art-${lesson.color}`} onClick={onClick} aria-label={`${lang==='ar'?'عرض':'View'} ${lesson.title}`}><span className="art-badge"><Sparkles size={12}/>{lesson.tag}</span><span className="art-symbol">{lesson.art}</span><span className="art-corner"><ArrowUpRight size={17}/></span><span className="art-stripe"/></button><div className="lesson-card-body"><div className="lesson-meta"><span>{lesson.subject}</span><span className="dot-sep"/>{lesson.grade}</div><button className="lesson-title" onClick={onClick}>{lesson.title}</button><div className="teacher-line"><span className="teacher-avatar">{lesson.teacher.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><span>{lesson.teacher}</span><span className="rating"><Star size={12} fill="currentColor"/>{lesson.rating}</span></div><div className="card-divider"/><div className="lesson-bottom"><span><Video size={14}/>{lesson.videos} {copy[lang].videos}<i/> <Clock3 size={14}/>{lesson.duration}</span><strong>EGP {lesson.price}</strong></div></div></article>; }
function Footer({lang,onTeacher,notify}:{lang:Lang;onTeacher:()=>void;notify:(message:string)=>void}) { const ar=lang==='ar';return <footer className="footer"><div className="footer-main"><div className="footer-brand"><span className="brand"><span className="brand-mark">ب</span><span>bayyenly<span className="brand-dot">.</span></span></span><p>{copy[lang].footer}</p></div><div className="footer-links"><div><strong>{ar?'اكتشف':'Discover'}</strong><a href="#lessons">{copy[lang].explore}</a><a href="#lessons">{ar?'المواد الدراسية':'Subjects'}</a></div><div><strong>{ar?'للمدرسين':'For teachers'}</strong><button onClick={onTeacher}>{copy[lang].teacher}</button><button onClick={onTeacher}>{ar?'لوحة التحكم':'Teacher workspace'}</button></div><div><strong>{ar?'مساعدة':'Help'}</strong><button onClick={()=>notify(ar?'تفاصيل التواصل ستتوفر قريبًا.':'Contact details will be available soon.')}>{ar?'تواصل معنا':'Contact us'}</button><button onClick={()=>notify(ar?'الأسئلة الشائعة ستتوفر قريبًا.':'FAQs will be available soon.')}>{ar?'الأسئلة الشائعة':'FAQs'}</button></div></div></div><div className="footer-bottom"><span>© 2025 Bayyenly. {ar?'جميع الحقوق محفوظة':'All rights reserved'}.</span><span>{ar?'مصنوع بحب في مصر':'Made with care in Egypt'} <span className="egypt-mark">✳</span></span></div></footer>; }

type ApiLessonDetail = {
  id: number;
  title: string;
  description?: string | null;
  subject: string;
  price: string | number;
  teacher_name?: string | null;
  teacher_specialization?: string | null;
  videos?: Array<{ id: number; title: string; duration_seconds?: number | null; position?: number }>;
};

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function LessonDetails({ lang, lessonId, onBack, notify }: {
  lang: Lang; lessonId: number | null; onBack: () => void; notify: (s: string) => void;
}) {
  const ar = lang === 'ar';
  const [detail, setDetail] = useState<ApiLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lessonId) {
      setDetail(null);
      setError(ar ? 'اختار درسًا من القائمة أولًا.' : 'Choose a lesson from the marketplace first.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    async function fetchLesson() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE}/lessons/${lessonId}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(response.status === 404
            ? (ar ? 'الدرس غير موجود أو لم يتم نشره.' : 'This lesson was not found or is not published.')
            : (ar ? 'تعذر تحميل تفاصيل الدرس.' : 'Could not load lesson details.'));
        }
        const data = await response.json();
        const item = data?.lesson ?? data?.package ?? data?.data ?? data;
        if (!item || typeof item !== 'object' || !item.id) {
          throw new Error(ar ? 'استجابة غير متوقعة من الخادم.' : 'Unexpected lesson API response.');
        }
        setDetail({
          ...item,
          videos: Array.isArray(data.videos)
            ? data.videos
            : Array.isArray(item.videos)
              ? item.videos
              : [],
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchLesson();
    return () => controller.abort();
  }, [lessonId, ar]);

  const packageVideos = detail?.videos ?? [];
  const totalDuration = packageVideos.reduce((sum, video) => sum + (Number(video.duration_seconds) || 0), 0);
  const teacherName = detail?.teacher_name || (ar ? 'المدرس' : 'Teacher');
  const initials = teacherName.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('');
  const price = Number(detail?.price ?? 0);

  if (loading) return <main className="details-page"><p role="status">{ar ? 'جارٍ تحميل تفاصيل الدرس...' : 'Loading lesson details...'}</p></main>;

  if (error || !detail) {
    return <main className="details-page">
      <button className="link-button" onClick={onBack}><ArrowLeft size={16}/>{ar ? 'العودة للدروس' : 'Back to lessons'}</button>
      <div className="empty-state">
        <strong>{ar ? 'تعذر فتح الدرس' : 'Could not open this lesson'}</strong>
        <span>{error || (ar ? 'الدرس غير متاح.' : 'This lesson is unavailable.')}</span>
        <button className="button button-outline" onClick={onBack}>{ar ? 'تصفح الدروس' : 'Browse lessons'}</button>
      </div>
    </main>;
  }

  return <main className="details-page">
    <div className="breadcrumbs">
      <button onClick={onBack}>{ar ? 'الرئيسية' : 'Home'}</button><ChevronRight size={14}/>
      <button onClick={onBack}>{ar ? 'الدروس' : 'Lessons'}</button><ChevronRight size={14}/><span>{detail.title}</span>
    </div>
    <div className="details-layout">
      <div className="details-main">
        <div className="detail-topline">
          <span className="pill-subject">{detail.subject}</span>
          {detail.teacher_specialization && <span className="pill-grade">{detail.teacher_specialization}</span>}
          <span className="detail-share">
            <button onClick={() => notify(ar ? 'تم حفظ الدرس في قائمتك.' : 'Lesson saved to your list.')} aria-label="Save lesson"><Bookmark size={17}/></button>
            <button onClick={() => {
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(window.location.href)
                  .then(() => notify(ar ? 'تم نسخ رابط الدرس.' : 'Lesson link copied.'))
                  .catch(() => notify(ar ? 'تعذر نسخ الرابط.' : 'Could not copy the link.'));
              } else notify(ar ? 'انسخ الرابط من شريط العنوان.' : 'Copy the link from your address bar.');
            }} aria-label="Share lesson"><ArrowUpRight size={17}/></button>
          </span>
        </div>
        <h1 className="details-title">{detail.title}</h1>
        <p className="details-description">{detail.description || (ar ? 'باقة تعليمية من المدرس. راجع تفاصيل الفيديوهات أدناه.' : 'A lesson package from your teacher. Review the included videos below.')}</p>
        <div className="teacher-profile">
          <span className="profile-avatar">{initials || 'T'}</span>
          <div><strong>{teacherName} <BadgeCheck className="verified" size={16}/></strong><span>{detail.teacher_specialization || (ar ? 'مدرس' : 'Teacher')}</span></div>
        </div>
        <div className="video-preview">
          <div className="video-art"><div className="video-orbit one"/><div className="video-orbit two"/><span className="video-atom">⊙</span><span className="video-equation">{detail.subject}</span><span className="video-caption">{ar ? 'باقة تعليمية' : 'LESSON PACKAGE'}</span></div>
          <span className="preview-label">{ar ? 'محتويات الباقة' : 'PACKAGE CONTENTS'}</span>
        </div>
        <div className="content-section">
          <div className="content-heading">
            <div><h2>{ar ? 'فيديوهات الباقة' : 'Package videos'}</h2><p>{ar ? 'الفيديوهات المتاحة ضمن هذه الباقة.' : 'Videos included in this lesson package.'}</p></div>
            <span className="content-summary">{packageVideos.length} {ar ? 'فيديوهات' : 'videos'}{totalDuration > 0 && <> <i/> {formatDuration(totalDuration)}</>}</span>
          </div>
          {packageVideos.length ? <div className="video-list">{packageVideos.slice().sort((a,b) => (a.position ?? 0) - (b.position ?? 0)).map((video,index) =>
            <div className="video-row" key={video.id}>
              <span className="video-index">{String(index + 1).padStart(2,'0')}</span>
              <span className="video-name">{video.title}</span>
              <span className="video-time">{formatDuration(video.duration_seconds)}</span><LockKeyhole size={14}/>
            </div>)}</div>
          : <div className="empty-state"><span>{ar ? 'لم يضف المدرس فيديوهات لهذه الباقة بعد.' : 'The teacher has not added videos to this package yet.'}</span></div>}
        </div>
        <div className="objectives">
          <h2>{ar ? 'معلومات الباقة' : 'Package information'}</h2>
          <p><Check size={16}/>{ar ? 'ادفع مرة واحدة للوصول إلى الباقة.' : 'Pay once to purchase this package.'}</p>
          <p><Check size={16}/>{ar ? 'ستظهر الفيديوهات بعد تأكيد الشراء.' : 'Videos become available after the purchase is confirmed.'}</p>
          <p><Check size={16}/>{ar ? 'تفاصيل الباقة محمّلة من الخادم.' : 'Package details are loaded from the API.'}</p>
        </div>
      </div>
      <aside className="purchase-column">
        <div className="purchase-card">
          <div className="purchase-card-top">
            <div className="eyebrow muted-eyebrow">{ar ? 'باقة تعليمية' : 'LESSON PACKAGE'}</div>
            <div className="purchase-price">EGP {price.toLocaleString('en-EG')}<small>{ar ? 'دفعة واحدة' : 'one-time payment'}</small></div>
            <p>{ar ? 'اشترِ الباقة للوصول إلى محتواها.' : 'Purchase this package to access its content.'}</p>
            <button className="button button-primary buy-button" disabled aria-describedby="payment-unavailable">
              {ar ? 'الشراء غير متاح حاليًا' : 'Purchases unavailable'}
            </button>
            <div className="access-note"><ShieldCheck size={18}/><span><strong>{ar ? 'وصول بعد تأكيد الدفع' : 'Access after payment'}</strong><small>{ar ? 'سيتم فتح المحتوى بعد تأكيد عملية الشراء.' : 'Package content unlocks after the purchase is confirmed.'}</small></span></div>
          </div>
          <div className="package-includes">
            <h3>{ar ? 'ماذا تتضمن الباقة' : 'This package includes'}</h3>
            <p><Video size={16}/><span>{packageVideos.length} {ar ? 'فيديوهات' : 'videos'}</span></p>
            {totalDuration > 0 && <p><Clock3 size={16}/><span>{formatDuration(totalDuration)}</span></p>}
            <p><Headphones size={16}/><span>{ar ? 'تعلم حسب وقتك' : 'Learn at your own pace'}</span></p>
            <p><LockKeyhole size={16}/><span>{ar ? 'محتوى محمي للمشترين' : 'Content protected for buyers'}</span></p>
          </div>
          <div className="purchase-teacher">
            <span className="profile-avatar">{initials || 'T'}</span><div><small>{ar ? 'مدرس الباقة' : 'YOUR TEACHER'}</small><strong>{teacherName}</strong>{detail.teacher_specialization && <span>{detail.teacher_specialization}</span>}</div><ChevronRight size={17}/>
          </div>
        </div>
        <div className="safe-note" id="payment-unavailable"><ShieldCheck size={15}/>{ar ? 'لم يتم إعداد الدفع بعد. لن يتم إنشاء طلب أو خصم مبلغ.' : 'Payments are not configured. No order or charge will be created.'}</div>
      </aside>
    </div>
  </main>;
}
