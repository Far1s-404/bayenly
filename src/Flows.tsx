import { useEffect, useMemo, useState, type FormEvent, type Dispatch, type SetStateAction, type ChangeEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, CreditCard, FileText, GraduationCap, Headphones, Home, Image, LayoutDashboard, Library, LockKeyhole, LogOut, Menu, MoreHorizontal, Package, Play, Plus, Search, ShieldCheck, ShoppingBag, Star, TrendingUp, Upload, User, Users, Wallet, Video, X } from 'lucide-react';
import type { AppLang } from './App';
import type { Lesson } from './data';
import { studentPurchases, teacherPackages, mediaLibrary, adminQueue } from './mockRepository';
import { API_BASE, authenticatedFetch, clearAuthSession, saveAuthSession, saveAuthUser, type AuthUser } from './api';
import AdminDashboard from './AdminDashboard';

type VideoDraft = { id?: number | string; title: string; description: string; duration: string; url?: string };
export type PackageDraft = { title: string; description: string; subject: string; grade: string; language: string; objectives: string; price: number; videos: VideoDraft[]; resources: string[]; thumbnail?: string };
type Props = { route: string; lang: AppLang; setLang: (l: AppLang) => void; navigate: (path: string) => void; draft: PackageDraft; setDraft: Dispatch<SetStateAction<PackageDraft>>; packages: typeof teacherPackages; setPackages: Dispatch<SetStateAction<typeof teacherPackages>>; orderState: 'success'|'pending'|'failed'; setOrderState: (s:'success'|'pending'|'failed')=>void; orderRef: string; lesson: Lesson; authUser: AuthUser | null };
const T = { en: { home:'Marketplace', student:'Student', teacher:'Teacher', admin:'Admin', login:'Log in', register:'Create account', forgot:'Forgot password?', back:'Back to Bayyenly',  overview:'Overview', learning:'My Learning', orders:'Purchase history', profile:'Profile & settings', packages:'My Packages', library:'Content Library', earnings:'Orders & Earnings', create:'Create lesson package', save:'Save changes', search:'Search', all:'All', inProgress:'In Progress', completed:'Completed', continue:'Continue learning', demoNote:'Prototype only. All names, analytics, and activity are illustrative.', status:'Status', price:'Price', videos:'Videos', students:'Students', action:'Action', cancel:'Cancel', confirm:'Confirm', close:'Close', draft:'Draft', published:'Published', review:'Under Review', teacherSpace:'Teacher Space', studentSpace:'Student Space', adminSpace:'Admin Space', required:'This field is required.', oneTime:'One-time payment · no subscriptions' }, ar: { home:'السوق', student:'طالب', teacher:'مدرّس', admin:'إدارة', login:'تسجيل الدخول', register:'إنشاء حساب', forgot:'نسيت كلمة المرور؟', back:'العودة إلى بيّنلي', demo:'حالة التطوير · الدفع وبعض أدوات مساحة العمل غير متاحة', overview:'نظرة عامة', learning:'تعلّمي', orders:'سجل المشتريات', profile:'الملف والإعدادات', packages:'باقاتي', library:'مكتبة المحتوى', earnings:'الطلبات والأرباح', create:'إنشاء باقة دروس', save:'حفظ التغييرات', search:'بحث', all:'الكل', inProgress:'قيد التعلّم', completed:'مكتمل', continue:'متابعة التعلّم', demoNote:'نموذج تجريبي. كل الأسماء والإحصاءات والأنشطة للعرض فقط.', status:'الحالة', price:'السعر', videos:'فيديوهات', students:'طلاب', action:'إجراء', cancel:'إلغاء', confirm:'تأكيد', close:'إغلاق', draft:'مسودة', published:'منشور', review:'قيد المراجعة', demoAccounts:'حسابات تجريبية', teacherSpace:'مساحة المدرّس', studentSpace:'مساحة الطالب', adminSpace:'مساحة الإدارة', signOut:'تبديل الدور', selectRole:'اختر دورًا تجريبيًا', required:'هذا الحقل مطلوب.', oneTime:'دفعة واحدة · بدون اشتراك' } };
const tx = (lang:AppLang,en:string,ar:string) => lang==='ar'?ar:en;
const pathSection = (route:string) => route.split('/').filter(Boolean).at(-1) || 'overview';

export default function Flows(p:Props) {
  const { route, lang, setLang, navigate, draft, setDraft, packages, setPackages, orderState, setOrderState, orderRef, lesson, authUser } = p; const ar=lang==='ar'; const c=T[lang];
  let content;
  if (['/login','/register','/forgot-password'].includes(route)) content=<Auth route={route} lang={lang} navigate={navigate}/>;
  else if (['/student/overview','/student/learning','/student/orders','/student/profile'].includes(route)) content=<StudentWorkspace route={route} lang={lang} navigate={navigate} authUser={authUser!}/>;
  else if (route==='/teacher/apply') content=<TeacherApplication lang={lang} navigate={navigate}/>;
  else if (route.startsWith('/checkout')) content=<CheckoutUnavailable lang={lang} navigate={navigate}/>;
  else if (route==='/confirmation') content=import.meta.env.DEV?<Confirmation lang={lang} lesson={lesson} orderRef={orderRef} navigate={navigate}/>:<NotFound lang={lang} navigate={navigate}/>;
  else if (/^\/learn\/\d+$/.test(route)) content=<LearningAccess lang={lang} packageId={route.split('/')[2]} navigate={navigate}/>;
  else if (route==='/learn/demo'&&import.meta.env.DEV) content=<Learning lang={lang} lesson={lesson} navigate={navigate}/>;
  else if (route==='/teacher/package/new'||/^\/teacher\/package\/[^/]+\/(edit|preview)$/.test(route)) content=<WizardLive lang={lang} draft={draft} setDraft={setDraft} packages={packages} setPackages={setPackages} navigate={navigate} route={route}/>;
  else if (['/teacher/overview','/teacher/packages','/teacher/content','/teacher/orders','/teacher/profile'].includes(route)) content=<TeacherWorkspaceLive route={route} lang={lang} navigate={navigate} draft={draft} setDraft={setDraft} packages={packages} setPackages={setPackages} authUser={authUser!}/>;
  else if (route.startsWith('/admin/')) content=<AdminDashboard route={route} lang={lang} navigate={navigate} authUser={authUser!}/>;
  else content=<NotFound lang={lang} navigate={navigate}/>;
  const role = route==='/teacher/apply'?c.studentSpace:route.startsWith('/teacher')?c.teacherSpace:route.startsWith('/admin')?c.adminSpace:route.startsWith('/student')?c.studentSpace:'Bayyenly';
  return <div className={`flow-app app ${ar?'rtl':'ltr'}`} dir={ar?'rtl':'ltr'}><header className="flow-topbar"><button className="brand" onClick={()=>navigate('/')}><span className="brand-mark">ب</span><span>bayyenly<span className="brand-dot">.</span></span></button><span className="flow-role-label">{role}</span><div className="flow-top-right">{authUser&&<span className="flow-user-name">{authUser.name}</span>}<div className="lang-switch"><button className={!ar?'active':''} onClick={()=>setLang('en')}>EN</button><span/><button className={ar?'active':''} onClick={()=>setLang('ar')}>AR</button></div>{authUser&&<button className="flow-home" onClick={()=>{clearAuthSession();navigate('/');}} aria-label={tx(lang,'Sign out','تسجيل الخروج')} title={tx(lang,'Sign out','تسجيل الخروج')}><LogOut size={17}/></button>}<button className="flow-home" onClick={()=>navigate('/')} aria-label={c.home}><Home size={17}/></button></div></header><div className="flow-content">{content}</div></div>;
}

function Auth({route,lang,navigate}:{route:string;lang:AppLang;navigate:(p:string)=>void}) { const ar=lang==='ar'; const c=T[lang]; const [show,setShow]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('');const [values,setValues]=useState({name:'',email:'',phone:'',password:'',confirm:'',terms:false});const register=route==='/register',forgot=route==='/forgot-password';const set=(key:string,value:string|boolean)=>setValues(v=>({...v,[key]:value}));
  
const submit = async (e: FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  if (forgot) {
    setError('Password reset is not connected yet.');
    return;
  }

  if (register) {
    if (
      !values.name.trim() ||
      !values.email.trim() ||
      !values.password ||
      !values.confirm
    ) {
      setError(c.required);
      return;
    }

    if (values.password !== values.confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!values.terms) {
      setError('Please accept the terms and conditions.');
      return;
    }
  } else if (!values.email.trim() || !values.password) {
    setError(c.required);
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/auth/${register ? 'register' : 'login'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          register
            ? {
                name: values.name.trim(),
                email: values.email.trim(),
              phone: values.phone.trim(),
              password: values.password,
            }
            : {
                email: values.email.trim(),
                password: values.password,
              }
        ),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Something went wrong.');
      return;
    }

    if (register) {
      setSuccess('Account created! You can now log in.');
      navigate('/login');
      return;
    }

    if (
      typeof data?.token !== 'string' ||
      !data.user ||
      !['student', 'teacher', 'admin'].includes(data.user.role)
    ) {
      setError('The server returned an invalid login response.');
      return;
    }

    saveAuthSession({ token: data.token, user: data.user });

    navigate(
      data.user.role === 'admin'
        ? '/admin/overview'
        : data.user.role === 'teacher'
          ? '/teacher/overview'
          : '/student/overview'
    );
  } catch {
    setError(
      'Cannot connect to the server. Make sure the Bayenly backend is running.'
    );
  }
};

  return <div className="auth-wrap"><div className="auth-aside"><div className="auth-visual-mark">ب</div><div className="eyebrow">{tx(lang,'LEARN ON YOUR TERMS','تعلّم على طريقتك')}</div><h1>{register?tx(lang,'Your next “aha” moment starts here.','لحظة الفهم التالية تبدأ من هنا.'):forgot?tx(lang,'A fresh start, coming up.','بداية جديدة قادمة.'):tx(lang,'Welcome back to learning.','أهلًا بعودتك للتعلّم.')}</h1><p>{tx(lang,'One-time lesson packages from teachers who make the hard stuff click.','باقات دروس بدفعة واحدة من مدرسين يبسّطون أصعب الأفكار.')}</p><div className="auth-quote"><Star size={15} fill="currentColor"/> {tx(lang,'Create an account to save your learning and access your purchases.','أنشئ حسابًا لحفظ تعلّمك والوصول إلى مشترياتك.')}</div></div><section className="auth-card"><div className="auth-card-heading"><div><span className="eyebrow muted-eyebrow">{forgot?c.forgot:register?tx(lang,'JOIN BAYYENLY','انضم إلى بيّنلي'):tx(lang,'YOUR LEARNING SPACE','مساحة تعلّمك')}</span><h2>{forgot?tx(lang,'Reset your password','استعادة كلمة المرور'):register?tx(lang,'Create your account','أنشئ حسابك'):tx(lang,'Sign in','تسجيل الدخول')}</h2><p>{forgot?tx(lang,'Password reset is unavailable until an email service is configured.','استعادة كلمة المرور غير متاحة حتى يتم إعداد خدمة البريد الإلكتروني.'):register?tx(lang,'A few details and you’re ready to explore.','بعض التفاصيل وبعدها يمكنك الاستكشاف.'):tx(lang,'Sign in with your account.','سجّل الدخول بحسابك.')}</p></div></div>
    <form className="flow-form" onSubmit={submit} noValidate>{register&&<Field label={tx(lang,'Full name','الاسم الكامل')} value={values.name} onChange={v=>set('name',v)} placeholder={tx(lang,'Your name','اسمك')} required/>}<Field label={tx(lang,'Email address','البريد الإلكتروني')} value={values.email} onChange={v=>set('email',v)} placeholder="you@example.com" type="email" required/>{register&&<Field label={tx(lang,'Phone number','رقم الهاتف')} value={values.phone} onChange={v=>set('phone',v)} placeholder="+20 10 0000 0000" type="tel" required prefix="🇪🇬 +20"/>}{!forgot&&<Field label={tx(lang,'Password','كلمة المرور')} value={values.password} onChange={v=>set('password',v)} placeholder="••••••••" type={show?'text':'password'} required trailing={<button type="button" className="inline-toggle" onClick={()=>setShow(!show)}>{show?tx(lang,'Hide','إخفاء'):tx(lang,'Show','إظهار')}</button>}/>} {register&&<Field label={tx(lang,'Confirm password','تأكيد كلمة المرور')} value={values.confirm} onChange={v=>set('confirm',v)} placeholder="••••••••" type={show?'text':'password'} required/>}
      {!register&&!forgot&&<div className="form-row spread"><span className="check-label">{tx(lang,'Your session stays active on this device.','سيظل تسجيل الدخول نشطًا على هذا الجهاز.')}</span><button type="button" className="inline-link" onClick={()=>navigate('/forgot-password')}>{c.forgot}</button></div>}{register&&<label className="check-label"><input type="checkbox" checked={values.terms} onChange={e=>set('terms',e.target.checked)}/>{tx(lang,'I agree to the Terms and Privacy Policy','أوافق على الشروط وسياسة الخصوصية')}</label>}
      {error&&<div className="inline-error" role="alert">{error}</div>}{success&&<div className="inline-success" role="status"><Check size={16}/><span>{success}</span></div>}<button className="button button-primary flow-submit" type="submit" disabled={forgot}>{forgot?tx(lang,'Password reset unavailable','استعادة كلمة المرور غير متاحة'):register?c.register:c.login}<ArrowRight className={ar?'flip':''} size={16}/></button></form>
    <div className="auth-bottom">{forgot?<button className="inline-link" onClick={()=>navigate('/login')}>{tx(lang,'Back to sign in','العودة لتسجيل الدخول')}</button>:register?<>{tx(lang,'Already have an account?','لديك حساب بالفعل؟')} <button className="inline-link" onClick={()=>navigate('/login')}>{c.login}</button></>:<>{tx(lang,'New to Bayyenly?','جديد في بيّنلي؟')} <button className="inline-link" onClick={()=>navigate('/register')}>{c.register}</button></>}</div><div className="auth-privacy"><LockKeyhole size={13}/>{tx(lang,'Your password is protected and never displayed.','كلمة المرور محمية ولا يتم عرضها.')}</div></section></div>;
}
function TeacherApplication({lang,navigate}:{lang:AppLang;navigate:(path:string)=>void}) {
  const [specialization,setSpecialization]=useState('');
  const [bio,setBio]=useState('');
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [application,setApplication]=useState<{status:string}|null>(null);
  const [error,setError]=useState('');
  const [authenticated,setAuthenticated]=useState(Boolean(localStorage.getItem('bayenly_token')));

  useEffect(()=>{
    let active=true;
    const token=localStorage.getItem('bayenly_token');
    setAuthenticated(Boolean(token));
    if(!token){setLoading(false);return ()=>{active=false;};}
    async function loadApplication(){
      try{
        const response=await authenticatedFetch(`${API_BASE}/teacher-applications/my`,{headers:{Authorization:`Bearer ${token}`}});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to check application status.','تعذر التحقق من حالة الطلب.'));
        if(active)setApplication(data.application);
      }catch(loadError){
        if(active)setError(loadError instanceof Error?loadError.message:tx(lang,'Unable to check application status.','تعذر التحقق من حالة الطلب.'));
      }finally{if(active)setLoading(false);}
    }
    void loadApplication();
    return ()=>{active=false;};
  },[lang]);

  async function submit(event:FormEvent){
    event.preventDefault();
    setError('');
    if(specialization.trim().length<2||specialization.trim().length>150||bio.trim().length<20||bio.trim().length>5000){
      setError(tx(lang,'Enter a specialization (2–150 characters) and a biography (20–5000 characters).','أدخل التخصص (من حرفين إلى 150) والسيرة (من 20 إلى 5000 حرف).'));
      return;
    }
    const token=localStorage.getItem('bayenly_token');
    if(!token){setAuthenticated(false);return;}
    setSubmitting(true);
    try{
      const response=await authenticatedFetch(`${API_BASE}/teacher-applications`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({specialization:specialization.trim(),bio:bio.trim()}),
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to submit teacher application.','تعذر إرسال طلب التدريس.'));
      setApplication(data.application);
    }catch(submitError){
      setError(submitError instanceof Error?submitError.message:tx(lang,'Unable to submit teacher application.','تعذر إرسال طلب التدريس.'));
    }finally{setSubmitting(false);}
  }

  const statusText=application?.status==='pending'
    ?tx(lang,'Your application is pending review. Your account remains a student until an authorized approval process changes your role.','طلبك قيد المراجعة. سيظل حسابك طالبًا حتى تغيّر جهة مخوّلة دورك بعد الموافقة.')
    :application?.status==='approved'
      ?tx(lang,'Your application was approved. Sign in again if your account role has been updated.','تمت الموافقة على طلبك. سجّل الدخول مجددًا إذا تم تحديث دور حسابك.')
      :tx(lang,'Your application was not approved. Contact support for next steps.','لم تتم الموافقة على طلبك. تواصل مع الدعم لمعرفة الخطوات التالية.');

  return <div className="workspace-content" style={{maxWidth:720,margin:'32px auto'}}>
    <div className="panel profile-form">
      <button className="inline-link" onClick={()=>navigate('/')}><ArrowLeft size={15}/>{tx(lang,'Back to marketplace','العودة إلى السوق')}</button>
      <h2>{tx(lang,'Become a teacher','كن معلّمًا')}</h2>
      <p>{tx(lang,'Submit your teaching background for review. Applying does not change your account role or grant teacher access.','أرسل نبذة عن خبرتك التعليمية للمراجعة. تقديم الطلب لا يغيّر دور حسابك ولا يمنحك صلاحية المدرّس.')}</p>
      {!authenticated?<><p>{tx(lang,'Sign in to your student account before applying.','سجّل الدخول بحساب الطالب قبل التقديم.')}</p><button className="button button-primary" onClick={()=>navigate('/login')}>{T[lang].login}</button></>
        :loading?<p>{tx(lang,'Checking application status…','جارٍ التحقق من حالة الطلب…')}</p>
        :error&&!application?<div className="inline-error" role="alert">{error}</div>
        :application?<div className="inline-success" role="status">{statusText}</div>
        :<form className="flow-form" onSubmit={submit}>
          <Field label={tx(lang,'Teaching specialization','التخصص التعليمي')} value={specialization} onChange={setSpecialization} required/>
          <label className="field"><span>{tx(lang,'Teaching background','الخبرة التعليمية')}</span><textarea value={bio} onChange={event=>setBio(event.target.value)} required minLength={20} maxLength={5000}/></label>
          {error&&<div className="inline-error" role="alert">{error}</div>}
          <button className="button button-primary" type="submit" disabled={submitting}>{submitting?tx(lang,'Submitting…','جارٍ الإرسال…'):tx(lang,'Submit application','إرسال الطلب')}</button>
        </form>}
    </div>
  </div>;
}

function Field({label,value,onChange,placeholder,type='text',required=false,trailing,prefix,disabled=false}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string;required?:boolean;trailing?:React.ReactNode;prefix?:string;disabled?:boolean}){return <label className="field"><span>{label}{required&&<i> *</i>}</span><div className={`field-control ${prefix?'has-prefix':''}`}>{prefix&&<span className="field-prefix">{prefix}</span>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} disabled={disabled}/>{trailing}</div></label>;}

type BayyenlyUser = {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'student' | 'teacher' | 'admin';
};

function getCurrentUser(): BayyenlyUser | null {
  try {
    const stored = localStorage.getItem('bayenly_user');

    if (!stored) return null;

    return JSON.parse(stored) as BayyenlyUser;
  } catch {
    return null;
  }
}


function WorkspaceShell({
  lang,
  title,
  sections,
  active,
  navigate,
  identity,
  children,
}: {
  lang: AppLang;
  title: string;
  sections: { label: string; path: string; icon: typeof Home }[];
  active: string;
  navigate: (p: string) => void;
  identity?: Pick<AuthUser, 'name' | 'email'>;
  children: ReactNode;
}) {
  const ar = lang === 'ar';
  const [open, setOpen] = useState(false);

  const role = sections[0]?.path.split('/')[1] || 'student';
  const admin = role === 'admin';
  const fallbackName =
    role === 'teacher'
      ? 'Teacher'
      : role === 'admin'
        ? 'Admin reviewer'
        : 'Student';

  const roleName = identity?.name?.trim() || identity?.email || fallbackName;

  const roleInitial = roleName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const roleSpace =
    role === 'teacher'
      ? T[lang].teacherSpace
      : role === 'admin'
        ? T[lang].adminSpace
        : T[lang].studentSpace;

  return (
    <div className={`workspace-shell ${admin ? 'admin-workspace' : ''}`}>
      <aside className={`workspace-sidebar ${open ? 'open' : ''}`}>
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">ب</span>
          <span>
            bayyenly<span className="brand-dot">.</span>
          </span>
        </button>

        <div className="workspace-user">
          <span className="workspace-avatar">{roleInitial}</span>
          <div>
            <strong>{roleName}</strong>
            <small>{roleSpace}</small>
          </div>
        </div>

        <nav>
          {sections.map((s) => {
            const Icon = s.icon;

            return (
              <button
                className={active === s.path ? 'active' : ''}
                onClick={() => {
                  navigate(s.path);
                  setOpen(false);
                }}
                key={s.path}
              >
                <Icon size={17} />
                {s.label}
                <ChevronRight
                  className={ar ? 'flip' : ''}
                  size={14}
                />
              </button>
            );
          })}
        </nav>

        <button className="side-return" onClick={() => navigate('/')}>
          <ArrowLeft className={ar ? 'flip' : ''} size={16} />
          {T[lang].home}
        </button>
      </aside>

      <main className="workspace-main">
        <header className="workspace-heading">
          <button
            className="workspace-mobile-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <Menu />
          </button>

          <div>
            <span className="eyebrow muted-eyebrow">{roleSpace}</span>
            <h1>
              {role === 'student'
                ? sections.find((s) => s.path === active)?.label || title
                : title}
            </h1>
          </div>

        </header>

        {children}
      </main>
    </div>
  );
}
type StudentPurchaseRecord = {
  purchase_id: number | string;
  package_id: number | string;
  amount: number | string;
  status: string;
  purchased_at: string | null;
  title: string;
  subject: string;
  teacher_name: string;
  video_count: number;
  completed_count: number;
  progress_percent: number;
};

function StudentWorkspace({route,lang,navigate,authUser}:{route:string;lang:AppLang;navigate:(p:string)=>void;authUser:AuthUser}) {
  const ar = lang === 'ar';
  const sec = pathSection(route);
  const sections = [
    {label:T[lang].overview,path:'/student/overview',icon:LayoutDashboard},
    {label:T[lang].learning,path:'/student/learning',icon:BookOpen},
    {label:T[lang].orders,path:'/student/orders',icon:ShoppingBag},
    {label:T[lang].profile,path:'/student/profile',icon:User},
  ];
  const [filter,setFilter] = useState<'all'|'progress'|'completed'>('all');
  const [search,setSearch] = useState('');
  const [reloadKey,setReloadKey] = useState(0);
  const [purchases,setPurchases] = useState<StudentPurchaseRecord[]>([]);
  const [purchasesLoading,setPurchasesLoading] = useState(true);
  const [purchasesError,setPurchasesError] = useState('');
  const [profile,setProfile] = useState({name:'',email:'',phone:''});
  const [profileLoading,setProfileLoading] = useState(false);
  const [profileError,setProfileError] = useState('');
  const [saved,setSaved] = useState(false);
  const [saving,setSaving] = useState(false);
  const [saveError,setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('bayenly_token');

    async function loadPurchases() {
      setPurchasesLoading(true);
      setPurchasesError('');
      if (!token) {
        setPurchasesError(tx(lang,'Sign in to view your purchases and learning.','سجّلي الدخول لعرض مشترياتك وتعلّمك.'));
        setPurchasesLoading(false);
        return;
      }

      try {
        const response = await authenticatedFetch(`${API_BASE}/purchases/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || tx(lang,'Unable to retrieve your purchases.','تعذر تحميل مشترياتك.'));
        if (!Array.isArray(data?.purchases)) throw new Error(tx(lang,'The server returned invalid purchase data.','أعاد الخادم بيانات مشتريات غير صالحة.'));
        if (active) setPurchases(data.purchases);
      } catch (error) {
        if (active) setPurchasesError(error instanceof Error ? error.message : tx(lang,'Unable to retrieve your purchases.','تعذر تحميل مشترياتك.'));
      } finally {
        if (active) setPurchasesLoading(false);
      }
    }

    void loadPurchases();
    return () => { active = false; };
  }, [lang, route, reloadKey]);

  useEffect(() => {
    if (sec !== 'profile') return;
    let active = true;
    const token = localStorage.getItem('bayenly_token');

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError('');
      if (!token) {
        setProfileError(tx(lang,'Sign in to view your profile.','سجّلي الدخول لعرض ملفك الشخصي.'));
        setProfileLoading(false);
        return;
      }

      try {
        const response = await authenticatedFetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || tx(lang,'Unable to retrieve your profile.','تعذر تحميل ملفك الشخصي.'));
        if (!data?.user || typeof data.user.name !== 'string' || typeof data.user.email !== 'string') {
          throw new Error(tx(lang,'The server returned invalid profile data.','أعاد الخادم بيانات ملف شخصي غير صالحة.'));
        }
        if (active) {
          const user = data.user;
          setProfile({name:user.name,email:user.email,phone:user.phone ?? ''});
          saveAuthUser(user);
        }
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : tx(lang,'Unable to retrieve your profile.','تعذر تحميل ملفك الشخصي.'));
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, [lang, route, sec, reloadKey]);

  const initials = profile.name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase() || '?';

  async function handleSaveProfile() {
    const token = localStorage.getItem('bayenly_token');
    setSaved(false);
    setSaveError('');
    if (!token) {
      setSaveError(tx(lang,'Please log in before saving your profile.','يرجى تسجيل الدخول قبل حفظ الملف الشخصي.'));
      return;
    }
    setSaving(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/auth/me`, {
        method:'PATCH',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({name:profile.name.trim(),email:profile.email.trim(),phone:profile.phone.trim()}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || tx(lang,'Unable to save profile changes.','تعذر حفظ تغييرات الملف الشخصي.'));
      if (!data?.user) throw new Error(tx(lang,'The server returned an invalid profile response.','أعاد الخادم بيانات ملف شخصي غير صالحة.'));
      saveAuthUser(data.user);
      setProfile({name:data.user.name,email:data.user.email,phone:data.user.phone ?? ''});
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : tx(lang,'Unable to save profile changes.','تعذر حفظ تغييرات الملف الشخصي.'));
    } finally {
      setSaving(false);
    }
  }

  const paidPurchases = purchases.filter(p=>p.status==='paid');
  const filtered = paidPurchases.filter(p=>
    (filter==='all'||(filter==='progress'?p.progress_percent<100:p.progress_percent===100)) &&
    p.title.toLowerCase().includes(search.toLowerCase())
  );
  const completedLessons = paidPurchases.reduce((count,p)=>count+p.completed_count,0);
  const renderLoadError = (message:string) =>
    <div className="inline-error" role="alert">{message} <button className="inline-link" onClick={()=>setReloadKey(key=>key+1)}>{tx(lang,'Retry','إعادة المحاولة')}</button></div>;

  let content:ReactNode;
  if (sec==='overview') {
    content=<>
      <div className="welcome-card"><div><span className="eyebrow muted-eyebrow">{tx(lang,'YOUR LEARNING SPACE','مساحة تعلّمك')}</span><h2>{tx(lang,'Welcome back.','أهلًا بعودتك.')}</h2><p>{tx(lang,'Your purchased lessons and saved progress appear here.','تظهر هنا دروسك المشتراة وتقدّمك المحفوظ.')}</p><button className="button button-primary" onClick={()=>navigate('/student/learning')}>{T[lang].continue}<ArrowRight className={ar?'flip':''} size={15}/></button></div><span className="welcome-mark">✳</span></div>
      {purchasesError&&renderLoadError(purchasesError)}
      <div className="summary-grid"><Summary icon={Package} label={tx(lang,'Packages purchased','الباقات المشتراة')} value={String(paidPurchases.length)} color="violet"/><Summary icon={Check} label={tx(lang,'Lessons completed','الدروس المكتملة')} value={String(completedLessons)} color="lime"/><Summary icon={Video} label={tx(lang,'Lessons available','الدروس المتاحة')} value={String(paidPurchases.reduce((count,p)=>count+p.video_count,0))} color="coral"/></div>
      <SectionHeader title={tx(lang,'Continue learning','تابعي التعلّم')} action={tx(lang,'See all','عرض الكل')} onAction={()=>navigate('/student/learning')}/>
      {purchasesLoading?<div className="panel">{tx(lang,'Loading your learning…','جارٍ تحميل تعلّمك…')}</div>:paidPurchases.filter(p=>p.progress_percent<100).length?<div className="learning-grid">{paidPurchases.filter(p=>p.progress_percent<100).slice(0,2).map(p=><DatabaseLearningCard key={p.purchase_id} item={p} lang={lang} navigate={navigate}/>)}</div>:<Empty icon={BookOpen} title={tx(lang,'No lessons to continue yet','لا توجد دروس للمتابعة بعد')} text={tx(lang,'Purchased lesson packages will appear here.','ستظهر باقات الدروس التي اشتريتها هنا.')} button={T[lang].home} action={()=>navigate('/')}/>}
    </>;
  } else if (sec==='learning') {
    content=<>
      <div className="panel-heading flow-panel-heading"><div><h2>{T[lang].learning}</h2><p>{tx(lang,'Your purchased lesson packages and saved progress.','باقات الدروس المشتراة وتقدّمك المحفوظ.')}</p></div><span className="count-pill">{paidPurchases.length} {tx(lang,'packages','باقات')}</span></div>
      <div className="toolbar"><div className="search-field"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tx(lang,'Search your lessons…','ابحثي في دروسك…')}/></div><div className="filter-tabs">{(['all','progress','completed'] as const).map((f,i)=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{[T[lang].all,T[lang].inProgress,T[lang].completed][i]}</button>)}</div></div>
      {purchasesError&&renderLoadError(purchasesError)}
      {purchasesLoading?<div className="panel">{tx(lang,'Loading your lessons…','جارٍ تحميل دروسك…')}</div>:filtered.length?<div className="learning-grid">{filtered.map(item=><DatabaseLearningCard key={item.purchase_id} item={item} lang={lang} navigate={navigate}/>)}</div>:<Empty icon={BookOpen} title={tx(lang,'Nothing in this view yet','لا توجد دروس هنا بعد')} text={tx(lang,'Purchased lesson packages with paid access appear here.','تظهر هنا باقات الدروس التي تم دفعها.')} button={T[lang].home} action={()=>navigate('/')}/>}
    </>;
  } else if (sec==='orders') {
    const date=(value:string|null)=>value?new Date(value).toLocaleDateString(ar?'ar':'en'):'—';
    const statusLabel=(value:string)=>value==='paid'?tx(lang,'Paid','مدفوع'):value==='pending'?tx(lang,'Pending','قيد الانتظار'):value==='refunded'?tx(lang,'Refunded','مسترد'):value==='cancelled'?tx(lang,'Cancelled','ملغى'):value;
    content=<><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].orders}</h2><p>{tx(lang,'Your purchase and payment status from the account record.','مشترياتك وحالة الدفع المسجلة في الحساب.')}</p></div></div>{purchasesError&&renderLoadError(purchasesError)}{purchasesLoading?<div className="panel">{tx(lang,'Loading your purchase history…','جارٍ تحميل سجل مشترياتك…')}</div>:purchases.length?<DataTable headers={[tx(lang,'PACKAGE','الباقة'),tx(lang,'PURCHASE DATE','تاريخ الشراء'),tx(lang,'AMOUNT','المبلغ'),tx(lang,'PAYMENT','الدفع'),tx(lang,'REFERENCE','المرجع')]} rows={purchases.map(p=>[p.title,date(p.purchased_at),String(p.amount),statusLabel(p.status),`#${p.purchase_id}`])}/>:<Empty icon={ShoppingBag} title={tx(lang,'No purchases yet','لا توجد مشتريات بعد')} text={tx(lang,'Your order history will appear here.','سيظهر سجل طلباتك هنا.')} button={T[lang].home} action={()=>navigate('/')}/>}</>;
  } else {
    content=<div className="panel profile-form"><h2>{tx(lang,'Account details','بيانات الحساب')}</h2><p>{tx(lang,'Update the profile details saved to your account.','حدّثي بيانات الملف الشخصي المحفوظة في حسابك.')}</p>{profileLoading?<p>{tx(lang,'Loading your profile…','جارٍ تحميل ملفك الشخصي…')}</p>:profileError?<div className="inline-error" role="alert">{profileError}</div>:<><div className="profile-avatar-large">{initials}</div><Field label={tx(lang,'Full name','الاسم الكامل')} value={profile.name} onChange={v=>setProfile({...profile,name:v})}/><Field label={tx(lang,'Email address','البريد الإلكتروني')} value={profile.email} onChange={v=>setProfile({...profile,email:v})}/><Field label={tx(lang,'Phone number','رقم الهاتف')} value={profile.phone} onChange={v=>setProfile({...profile,phone:v})}/>{saveError&&<div className="inline-error" role="alert">{saveError}</div>}<button className="button button-primary" onClick={handleSaveProfile} disabled={saving}>{saving?tx(lang,'Saving…','جارٍ الحفظ…'):saved?<><Check size={15}/>{tx(lang,'Saved','تم الحفظ')}</>:T[lang].save}</button></>}</div>;
  }

  return <WorkspaceShell lang={lang} title={tx(lang,'My Learning','تعلّمي')} sections={sections} active={route} navigate={navigate} identity={authUser}><div className="workspace-content">{content}</div></WorkspaceShell>;
}

function StudentWorkspaceLegacy({route,lang,navigate}:{route:string;lang:AppLang;navigate:(p:string)=>void}){const ar=lang==='ar';const sec=pathSection(route);const sections=[{label:T[lang].overview,path:'/student/overview',icon:LayoutDashboard},{label:T[lang].learning,path:'/student/learning',icon:BookOpen},{label:T[lang].orders,path:'/student/orders',icon:ShoppingBag},{label:T[lang].profile,path:'/student/profile',icon:User}];const [filter,setFilter]=useState<'all'|'progress'|'completed'>('all');const [search,setSearch]=useState('');const currentUser = getCurrentUser();

const [profile, setProfile] = useState(() => ({
  name: currentUser?.name ?? '',
  email: currentUser?.email ?? '',
  phone: currentUser?.phone ?? '',
}));

const [saved, setSaved] = useState(false);
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState('');

const initials =
  profile.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

async function handleSaveProfile() {
  const user = getCurrentUser();
  const token = localStorage.getItem('bayenly_token');

  setSaved(false);
  setSaveError('');

  if (!user || !token) {
    setSaveError(tx(lang, 'Please log in before saving your profile.', 'يرجى تسجيل الدخول قبل حفظ الملف الشخصي.'));
    return;
  }

  setSaving(true);

  try {
    const response = await authenticatedFetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || tx(lang, 'Unable to save profile changes.', 'تعذر حفظ تغييرات الملف الشخصي.'));
    }

    if (!data?.user) {
      throw new Error(tx(lang, 'The server returned an invalid profile response.', 'أعاد الخادم بيانات ملف شخصي غير صالحة.'));
    }

    const updatedUser = { ...user, ...data.user };
    saveAuthUser(updatedUser);
    setProfile({
      name: updatedUser.name ?? '',
      email: updatedUser.email ?? '',
      phone: updatedUser.phone ?? '',
    });
    setSaved(true);
  } catch (error) {
    setSaveError(error instanceof Error ? error.message : tx(lang, 'Unable to save profile changes.', 'تعذر حفظ تغييرات الملف الشخصي.'));
  } finally {
    setSaving(false);
  }
}

const current = studentPurchases.filter(
  (p) =>
    (filter === 'all' ||
      (filter === 'progress' ? p.progress < 100 : p.progress === 100)) &&
    p.title.toLowerCase().includes(search.toLowerCase())
);const content=sec==='overview'?<><div className="welcome-card"><div><span className="eyebrow muted-eyebrow">{tx(lang,'TUESDAY · 27 OCT 2026','الثلاثاء · ٢٧ أكتوبر ٢٠٢٦')}</span><h2>{tx(lang,'A little progress goes a long way, Sara.','كل خطوة صغيرة تقرّبك يا سارة.')}</h2><p>{tx(lang,'Pick up right where you left off. Your lessons are here whenever you are.','كمّلي من آخر نقطة. دروسك هنا وقت ما تحتاجيها.')}</p><button className="button button-primary" onClick={()=>navigate('/student/learning')}>{T[lang].continue}<ArrowRight className={ar?'flip':''} size={15}/></button></div><span className="welcome-mark">✳</span></div><div className="summary-grid"><Summary icon={Package} label={tx(lang,'Packages purchased','الباقات المشتراة')} value="3" color="violet"/><Summary icon={Check} label={tx(lang,'Lessons completed','الدروس المكتملة')} value="14" color="lime"/><Summary icon={Clock3} label={tx(lang,'Learning streak','أيام التعلّم المتتالية')} value={tx(lang,'4 days','٤ أيام')} color="coral"/></div><SectionHeader title={tx(lang,'Continue learning','تابعي التعلّم')} action={tx(lang,'See all','عرض الكل')} onAction={()=>navigate('/student/learning')}/><div className="learning-grid">{studentPurchases.filter(p=>p.progress<100).slice(0,2).map(p=><LearningCard key={p.id} item={p} lang={lang} navigate={navigate}/>)}</div><p className="demo-disclaimer"><ShieldCheck size={14}/>{T[lang].demoNote}</p></>:sec==='learning'?<><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].learning}</h2><p>{tx(lang,'Packages you have in your demo library.','الباقات الموجودة في مكتبتك التجريبية.')}</p></div><span className="count-pill">{studentPurchases.length} {tx(lang,'packages','باقات')}</span></div><div className="toolbar"><div className="search-field"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tx(lang,'Search your lessons…','ابحثي في دروسك…')}/></div><div className="filter-tabs">{(['all','progress','completed'] as const).map((f,i)=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{[T[lang].all,T[lang].inProgress,T[lang].completed][i]}</button>)}</div></div>{current.length?<div className="learning-grid">{current.map(item=><LearningCard key={item.id} item={item} lang={lang} navigate={navigate}/>)}</div>:<Empty icon={BookOpen} title={tx(lang,'Nothing in this view yet','لا توجد دروس هنا بعد')} text={tx(lang,'Try another filter or browse packages in the marketplace.','جرّبي فلترًا آخر أو استكشفي باقات السوق.')} button={T[lang].home} action={()=>navigate('/')}/>}</>:sec==='orders'?<><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].orders}</h2><p>{tx(lang,'A record of your demo orders.','سجل طلباتك التجريبية.')}</p></div></div><DataTable headers={[tx(lang,'PACKAGE','الباقة'),tx(lang,'PURCHASE DATE','تاريخ الشراء'),tx(lang,'AMOUNT','المبلغ'),tx(lang,'PAYMENT','الدفع'),tx(lang,'ORDER REFERENCE','رقم الطلب')]} rows={studentPurchases.map(p=>[p.title,p.purchasedAt,`EGP ${p.price}`,tx(lang,'Paid · Demo','مدفوع · تجريبي'),p.orderRef])}/></>:<><div className="panel profile-form"><h2>{tx(lang,'Account details','بيانات الحساب')}</h2><p>{tx(lang,'Update the profile details saved to your account.','حدّثي بيانات الملف الشخصي المحفوظة في حسابك.')}</p><div className="profile-avatar-large">{initials}</div><Field label={tx(lang,'Full name','الاسم الكامل')} value={profile.name} onChange={v=>setProfile({...profile,name:v})}/><Field label={tx(lang,'Email address','البريد الإلكتروني')} value={profile.email} onChange={v=>setProfile({...profile,email:v})}/><Field label={tx(lang,'Phone number','رقم الهاتف')} value={profile.phone} onChange={v=>setProfile({...profile,phone:v})}/>{saveError&&<div className="inline-error" role="alert">{saveError}</div>}<button className="button button-primary" onClick={handleSaveProfile} disabled={saving}>{saving?tx(lang,'Saving…','جارٍ الحفظ…'):saved?<><Check size={15}/>{tx(lang,'Saved','تم الحفظ')}</>:T[lang].save}</button></div></>;
 return <WorkspaceShell lang={lang} title={tx(lang,'My Learning','تعلّمي')} sections={sections} active={route} navigate={navigate}><div className="workspace-content">{content}</div></WorkspaceShell>}
function DatabaseLearningCard({item,lang,navigate}:{item:StudentPurchaseRecord;lang:AppLang;navigate:(p:string)=>void}) {
  const ar=lang==='ar';
  const colors=['violet','coral','lime','blue','peach','pink'];
  const color=colors[Math.abs(item.title.split('').reduce((value,char)=>value+char.charCodeAt(0),0))%colors.length];
  const progress=Math.max(0,Math.min(100,item.progress_percent));
  const initials=item.teacher_name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  return <article className="learning-card">
    <div className={`learning-art art-${color}`}><span>{item.subject.slice(0,2).toUpperCase()}</span><span className="learning-art-videos"><Video size={13}/>{item.video_count} {T[lang].videos}</span></div>
    <div className="learning-card-body"><span className="lesson-meta"><b>{item.subject}</b></span><h3>{item.title}</h3><p className="learning-teacher"><span className="teacher-avatar">{initials}</span>{item.teacher_name}<span className="last-access">{ar?'الدروس المكتملة: ':'Completed: '}{item.completed_count}/{item.video_count}</span></p><div className="progress-line"><span style={{width:`${progress}%`}}/></div><div className="progress-caption"><span>{progress}% {ar?'مكتمل':'complete'}</span><button className="button button-primary" onClick={()=>navigate(`/learn/${item.package_id}`)}>{progress===100?tx(lang,'Review lessons','مراجعة الدروس'):T[lang].continue}<ArrowRight className={ar?'flip':''} size={14}/></button></div></div>
  </article>;
}

function LearningCard({item,lang,navigate}:{item:typeof studentPurchases[number];lang:AppLang;navigate:(p:string)=>void}){const ar=lang==='ar';return <article className="learning-card"><div className={`learning-art art-${item.color}`}><span>{item.art}</span><span className="learning-art-videos"><Video size={13}/>{item.videos} {T[lang].videos}</span></div><div className="learning-card-body"><span className="lesson-meta"><b>{item.subject}</b><i/> {item.grade}</span><h3>{item.title}</h3><p className="learning-teacher"><span className="teacher-avatar">{item.teacher.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>{item.teacher}<span className="last-access">{ar?'آخر دخول: ':'Last viewed: '}{item.lastAccessed}</span></p><div className="progress-line"><span style={{width:`${item.progress}%`}}/></div><div className="progress-caption"><span>{item.progress}% {ar?'مكتمل':'complete'}</span><button className="button button-primary" onClick={()=>navigate('/learn/demo')}>{item.progress===100?tx(lang,'Review lessons','مراجعة الدروس'):T[lang].continue}<ArrowRight className={ar?'flip':''} size={14}/></button></div></div></article>}
function Summary({icon:Icon,label,value,color}:{icon:typeof Package;label:string;value:string;color:string}){return <div className="summary-card"><span className={`summary-icon metric-${color}`}><Icon size={18}/></span><span>{label}</span><strong>{value}</strong></div>}
function SectionHeader({title,action,onAction}:{title:string;action:string;onAction:()=>void}){return <div className="section-header"><h2>{title}</h2><button className="inline-link" onClick={onAction}>{action}<ArrowRight size={14}/></button></div>}
function Empty({icon:Icon,title,text,button,action}:{icon:typeof BookOpen;title:string;text:string;button:string;action:()=>void}){return <div className="flow-empty"><span><Icon size={23}/></span><strong>{title}</strong><p>{text}</p><button className="button button-outline" onClick={action}>{button}</button></div>}
function DataTable({headers,rows}:{headers:string[];rows:string[][]}){return <div className="data-table-wrap"><table className="flow-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}

function TeacherWorkspace({route,lang,navigate,draft,setDraft,packages,setPackages}:{route:string;lang:AppLang;navigate:(p:string)=>void;draft:PackageDraft;setDraft:Dispatch<SetStateAction<PackageDraft>>;packages:typeof teacherPackages;setPackages:Dispatch<SetStateAction<typeof teacherPackages>>}){const ar=lang==='ar';const sec=pathSection(route);const [query,setQuery]=useState('');const [status,setStatus]=useState('All');const [profile,setProfile]=useState({bio:'Physics teacher helping students see the logic behind every equation.',subjects:'Physics, Mathematics',education:'BSc Physics · Cairo University',email:'omar@example.com',phone:'+20 10 2222 1212'});const [notice,setNotice]=useState('');const [modal,setModal]=useState<{title:string;message:string;action:()=>void}|null>(null);const sections=[{label:T[lang].overview,path:'/teacher/overview',icon:LayoutDashboard},{label:T[lang].packages,path:'/teacher/packages',icon:Package},{label:T[lang].library,path:'/teacher/content',icon:Library},{label:T[lang].earnings,path:'/teacher/orders',icon:Wallet},{label:T[lang].profile,path:'/teacher/profile',icon:User}];const shown=packages.filter(p=>(status==='All'||p.status===status)&&p.title.toLowerCase().includes(query.toLowerCase()));const done=()=>{setModal(null);setNotice(tx(lang,'Demo action completed. No public data was changed.','اكتمل الإجراء التجريبي. لم يتم تغيير بيانات عامة.'));setTimeout(()=>setNotice(''),2800)};const c=tx(lang,'Recent sales','آخر المبيعات');let body;
 if(sec==='overview')body=<><div className="teacher-metric-grid"><Summary icon={Package} label={tx(lang,'Published packages','الباقات المنشورة')} value="12" color="violet"/><Summary icon={TrendingUp} label={tx(lang,'Gross sales · demo','إجمالي المبيعات · تجريبي')} value="EGP 18,450" color="lime"/><Summary icon={Wallet} label={tx(lang,'Estimated earnings','الأرباح التقديرية')} value="EGP 14,760" color="coral"/><Summary icon={Users} label={tx(lang,'Students with access','طلاب لديهم وصول')} value="286" color="blue"/></div><div className="teacher-dash-grid"><section className="panel"><div className="section-header"><div><h2>{tx(lang,'Sales overview','نظرة على المبيعات')}</h2><p>{tx(lang,'Illustrative weekly performance','أداء أسبوعي توضيحي')}</p></div><span className="demo-pill">DEMO</span></div><div className="demo-chart">{[36,55,44,73,61,88,69].map((v,i)=><div key={i}><span style={{height:`${v}%`}}/><small>{['M','T','W','T','F','S','S'][i]}</small></div>)}</div></section><section className="panel"><div className="section-header"><div><h2>{c}</h2><p>{tx(lang,'Latest demo activity','أحدث النشاطات التجريبية')}</p></div></div>{[['Sara Ahmed',"Newton's Laws of Motion",'EGP 180'],['Mohamed Hany','Algebra, Made Simple','EGP 140'],['Laila Mostafa','The Cell: A Complete Guide','EGP 220']].map(r=><div className="mini-order" key={r[0]}><span className="teacher-avatar">{r[0].split(' ').map(x=>x[0]).join('')}</span><div><strong>{r[0]}</strong><small>{r[1]}</small></div><b>{r[2]}</b></div>)}</section></div><p className="demo-disclaimer">{T[lang].demoNote}</p></>;
 else if(sec==='packages')body=<><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].packages}</h2><p>{tx(lang,'Search, review, and manage your lesson packages.','ابحث عن باقات الدروس وأدرها.')}</p></div><button className="button button-primary" onClick={()=>{setDraft({title:'',description:'',subject:'Physics',grade:'Grade 10',language:'English',objectives:'',price:150,videos:[{title:'',description:'',duration:'10:00'}],resources:[]});navigate('/teacher/package/new')}}><Plus size={16}/>{T[lang].create}</button></div><div className="toolbar"><div className="search-field"><Search size={15}/><input placeholder={tx(lang,'Search packages…','ابحث عن الباقات…')} value={query} onChange={e=>setQuery(e.target.value)}/></div><select className="select-button" value={status} onChange={e=>setStatus(e.target.value)}><option value="All">{tx(lang,'All statuses','كل الحالات')}</option><option value="Draft">{T[lang].draft}</option><option value="Published">{T[lang].published}</option><option value="Under review">{T[lang].review}</option></select></div>{shown.length?<div className="teacher-package-grid">{shown.map((p,i)=><article className="teacher-package-card" key={p.id}><div className={`learning-art art-${p.color}`}><span>{['F=ma','x²','⌬','◉'][i%4]}</span><span className={`status-pill ${p.status==='Published'?'good':p.status==='Draft'?'neutral':'review'}`}>{p.status==='Draft'?T[lang].draft:p.status==='Published'?T[lang].published:T[lang].review}</span></div><div className="teacher-package-body"><small>{p.subject} · {p.grade}</small><h3>{p.title}</h3><p>{p.videos} {T[lang].videos} <i/> EGP {p.price} <i/> {p.sales} {T[lang].students}</p><div className="teacher-package-actions"><button className="button button-outline" onClick={()=>{const lesson=packages.find(x=>x.id===p.id);if(!lesson)return;setDraft({title:lesson.title,description:'A clear, step-by-step lesson package.',subject:lesson.subject,grade:lesson.grade,language:'English',objectives:'Understand the core ideas and practise exam questions.',price:lesson.price,videos:Array.from({length:Math.max(1,lesson.videos)},(_,j)=>({title:j===0?'Introduction':'Lesson '+(j+1),description:'',duration:'12:00'})),resources:[]});navigate(`/teacher/package/${p.id}/edit`)}}>{tx(lang,'Edit','تعديل')}</button><button className="button button-outline" onClick={()=>navigate(`/teacher/package/${p.id}/preview`)}>{tx(lang,'Preview','معاينة')}</button>{p.status==='Draft'&&<button className="button button-primary" onClick={()=>setModal({title:tx(lang,'Submit for review?','إرسال للمراجعة؟'),message:tx(lang,'This only changes the local demo state. No package is published online.','سيغيّر هذا حالة النموذج محليًا فقط. لن تُنشر الباقة على الإنترنت.'),action:()=>{setPackages(old=>old.map(x=>x.id===p.id?{...x,status:'Under review' as const}:x));done()}})}>{tx(lang,'Submit','إرسال')}</button>}</div></div></article>)}</div>:<Empty icon={Package} title={tx(lang,'No packages match','لا توجد باقات مطابقة')} text={tx(lang,'Change the search or status filter, or start a new package.','عدّل البحث أو الحالة، أو أنشئ باقة جديدة.')} button={T[lang].create} action={()=>navigate('/teacher/package/new')}/>}</>;
 else if(sec==='content')body=<ContentLibrary lang={lang}/>;
 else if(sec==='orders')body=<TeacherOrders lang={lang}/>;
 else body=<div className="panel profile-form"><div className="profile-avatar-large">OH</div><span className="verification-status"><BadgeCheck size={16}/>{tx(lang,'Verified teacher · demo status','مدرّس موثّق · حالة تجريبية')}</span><h2>Omar Hassan</h2><p>{tx(lang,'Edit profile details in temporary page state.','عدّل الملف الشخصي ضمن حالة الصفحة المؤقتة.')}</p><Field label={tx(lang,'Biography','نبذة')} value={profile.bio} onChange={v=>setProfile({...profile,bio:v})}/><Field label={tx(lang,'Subjects','المواد')} value={profile.subjects} onChange={v=>setProfile({...profile,subjects:v})}/><Field label={tx(lang,'Education & qualifications','التعليم والمؤهلات')} value={profile.education} onChange={v=>setProfile({...profile,education:v})}/><Field label={tx(lang,'Contact email','البريد للتواصل')} value={profile.email} onChange={v=>setProfile({...profile,email:v})}/><Field label={tx(lang,'Phone','الهاتف')} value={profile.phone} onChange={v=>setProfile({...profile,phone:v})}/><button className="button button-primary" onClick={()=>{setNotice(tx(lang,'Profile saved in temporary demo state.','تم حفظ الملف مؤقتًا في النموذج.'));setTimeout(()=>setNotice(''),2500)}}>{T[lang].save}</button></div>;
 return <><WorkspaceShell lang={lang} title={tx(lang,'Teacher Workspace','مساحة المدرّس')} sections={sections} active={route} navigate={navigate}><div className="workspace-content">{notice&&<div className="inline-success"><Check size={15}/>{notice}</div>}{body}</div></WorkspaceShell>{modal&&<Modal title={modal.title} message={modal.message} cancel={T[lang].cancel} confirm={T[lang].confirm} onCancel={()=>setModal(null)} onConfirm={modal.action}/>}</>}

function ContentLibrary({lang}:{lang:AppLang}){const ar=lang==='ar';const [files,setFiles]=useState(mediaLibrary);const [progress,setProgress]=useState(0);const [message,setMessage]=useState('');const select=(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const ext=f.name.split('.').pop()?.toLowerCase();if(!['mp4','mov','pdf'].includes(ext||'')){setMessage(tx(lang,'Choose an MP4, MOV, or PDF file.','اختر ملف MP4 أو MOV أو PDF.'));e.target.value='';return;}if(f.size>500*1024*1024){setMessage(tx(lang,'Demo file limit is 500 MB.','الحد التجريبي للملف ٥٠٠ ميجابايت.'));e.target.value='';return;}setProgress(8);setMessage(tx(lang,'Simulating a local upload. The file is not sent anywhere.','جارٍ محاكاة رفع محلي. لا يتم إرسال الملف إلى أي جهة.'));const timer=window.setInterval(()=>setProgress(v=>{if(v>=90){window.clearInterval(timer);setTimeout(()=>{setFiles(old=>[{name:f.name,type:ext==='pdf'?'PDF resource':`${ext?.toUpperCase()} video`,detail:ext==='pdf'?'PDF · local demo':'Duration not set · local demo',uploaded:tx(lang,'Just now','الآن'),state:'Ready (demo)'},...old]);setProgress(100);},300);return 90;}return v+18}),180);};return <><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].library}</h2><p>{tx(lang,'Demo assets available for package creation.','ملفات تجريبية متاحة لإنشاء الباقات.')}</p></div></div><div className="upload-panel"><div className="upload-symbol"><Upload size={22}/></div><div><strong>{tx(lang,'Add videos or learning resources','أضف فيديوهات أو موارد تعليمية')}</strong><p>{tx(lang,'MP4 / MOV / PDF · up to 500 MB. This prototype does not upload real files.','MP4 / MOV / PDF · حتى ٥٠٠ ميجابايت. لا يتم رفع ملفات حقيقية.')}</p></div><label className="button button-primary upload-button"><Plus size={15}/>{tx(lang,'Choose a file','اختر ملفًا')}<input type="file" accept="video/mp4,video/quicktime,application/pdf,.mp4,.mov,.pdf" onChange={select}/></label></div>{progress>0&&<div className="upload-progress"><div><span>{progress<100?tx(lang,'Upload simulation','محاكاة الرفع'):tx(lang,'Simulation finished','انتهت المحاكاة')}</span><b>{progress}%</b></div><span><i style={{width:`${progress}%`}}/></span></div>}{message&&<p className="upload-message">{message}</p>}<div className="data-table-wrap"><table className="flow-table"><thead><tr>{[tx(lang,'FILE','الملف'),tx(lang,'TYPE','النوع'),tx(lang,'DURATION / SIZE','المدة / الحجم'),tx(lang,'ADDED','تاريخ الإضافة'),tx(lang,'PROCESSING','المعالجة')].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{files.map(f=><tr key={f.name}><td><div className="file-name"><span>{f.type.includes('PDF')?<FileText size={16}/>:<Video size={16}/>}</span>{f.name}</div></td><td>{f.type}</td><td>{f.detail}</td><td>{f.uploaded}</td><td><span className={`status-pill ${f.state==='Ready'?'good':'review'}`}>{f.state}</span></td></tr>)}</tbody></table></div><p className="demo-disclaimer"><ShieldCheck size={14}/>{tx(lang,'Actual media storage and secure video hosting will be connected later.','سيتم ربط التخزين واستضافة الفيديو الآمنة لاحقًا.')}</p></>}

function TeacherOrders({lang}:{lang:AppLang}){const ar=lang==='ar';return <><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].earnings}</h2><p>{tx(lang,'Illustrative amounts only. No funds are received or paid out.','مبالغ توضيحية فقط. لا يتم استلام أو دفع أموال.')}</p></div><span className="demo-pill">DEMO ONLY</span></div><div className="teacher-metric-grid"><Summary icon={TrendingUp} label={tx(lang,'Gross sales','إجمالي المبيعات')} value="EGP 18,450" color="violet"/><Summary icon={CreditCard} label={tx(lang,'Platform commission · 10%','عمولة المنصة · ١٠٪')} value="EGP 1,845" color="coral"/><Summary icon={CreditCard} label={tx(lang,'Processing estimate · 2%','رسوم معالجة تقديرية · ٢٪')} value="EGP 369" color="blue"/><Summary icon={Wallet} label={tx(lang,'Estimated earnings','الأرباح التقديرية')} value="EGP 16,236" color="lime"/></div><div className="fee-note"><ShieldCheck size={17}/>{tx(lang,'Illustrative 10% platform rate. Processing fees and final commercial terms will be set by the backend later.','معدل توضيحي للمنصة ١٠٪. ستُحدد رسوم المعالجة والشروط التجارية النهائية لاحقًا.')}</div><SectionHeader title={tx(lang,'Recent orders','الطلبات الأخيرة')} action={tx(lang,'Payout review · demo','مراجعة المستحقات · تجريبي')} onAction={()=>window.alert(tx(lang,'Demo only. No payout can be initiated.','للعرض فقط. لا يمكن تنفيذ أي مستحقات.'))}/><DataTable headers={[tx(lang,'ORDER','الطلب'),tx(lang,'STUDENT','الطالب'),tx(lang,'PACKAGE','الباقة'),tx(lang,'GROSS','الإجمالي'),tx(lang,'PAYOUT','المستحقات')]} rows={[["BYN-DEMO-24018",'Sara Ahmed',"Newton's Laws",'EGP 180',tx(lang,'Pending · demo','معلّق · تجريبي')],["BYN-DEMO-24017",'Omar Farid','Algebra, Made Simple','EGP 140',tx(lang,'Reviewed · demo','تمت المراجعة · تجريبي')],["BYN-DEMO-24016",'Laila Mostafa','The Cell: A Complete Guide','EGP 220',tx(lang,'Pending · demo','معلّق · تجريبي')]]}/></>}

function Wizard({lang,draft,setDraft,packages,setPackages,navigate,route}:{lang:AppLang;draft:PackageDraft;setDraft:Dispatch<SetStateAction<PackageDraft>>;packages:typeof teacherPackages;setPackages:Dispatch<SetStateAction<typeof teacherPackages>>;navigate:(p:string)=>void;route:string}){
 const ar=lang==='ar'; const [step,setStep]=useState(route.endsWith('/preview')?4:1); const [error,setError]=useState(''); const [confirm,setConfirm]=useState(false); const [confirmStatus,setConfirmStatus]=useState<'Published'|'Under review'>('Under review');
 const put=(key:keyof PackageDraft,value:unknown)=>setDraft(d=>({...d,[key]:value}));
 const updateVideo=(i:number,key:keyof VideoDraft,value:string)=>put('videos',draft.videos.map((v,n)=>i===n?{...v,[key]:value}:v));
 const next=()=>{setError('');if(step===1&&(!draft.title.trim()||!draft.description.trim()||!draft.objectives.trim())){setError(tx(lang,'Add a title, description, and objectives.','أضف العنوان والوصف وأهداف التعلّم.'));return;}if(step===2&&(!draft.videos.length||draft.videos.some(v=>!v.title.trim()))){setError(tx(lang,'Add at least one video and title every video.','أضف فيديو واحدًا على الأقل واكتب عنوان كل فيديو.'));return;}if(step===3&&draft.price<1){setError(tx(lang,'Set a price greater than zero.','حدد سعرًا أكبر من صفر.'));return;}setStep(Math.min(4,step+1));};
 const names=[tx(lang,'Package details','تفاصيل الباقة'),tx(lang,'Videos & resources','الفيديوهات والموارد'),tx(lang,'Pricing','التسعير'),tx(lang,'Preview & publish','المعاينة والنشر')];
 const savePackage=(status:'Draft'|'Under review'|'Published')=>{const key=route.split('/')[3]||'new';const id=key==='new'?'draft-'+Date.now():key;const record={id,title:draft.title,subject:draft.subject,grade:draft.grade,price:draft.price,sales:0,status,videos:draft.videos.length,updated:tx(lang,'Just now','الآن'),color:'violet',description:draft.description,objectives:draft.objectives,language:draft.language,resources:draft.resources,videoDetails:draft.videos,thumbnail:draft.thumbnail};setPackages(old=>old.some(x=>x.id===id)?old.map(x=>x.id===id?{...x,...record}:x):[record,...old]);navigate('/teacher/packages')};
 useEffect(()=>{const match=route.match(/^\/teacher\/package\/([^/]+)\/(edit|preview)$/);if(!match)return;const saved=packages.find(item=>item.id===match[1]);if(!saved)return;setStep(match[2]==='preview'?4:1);setDraft({title:saved.title,description:saved.description??'A clear, step-by-step lesson package.',subject:saved.subject,grade:saved.grade,language:saved.language??'English',objectives:saved.objectives??'Understand the core ideas and practise exam questions.',price:saved.price,videos:saved.videoDetails?.length?saved.videoDetails:Array.from({length:Math.max(1,saved.videos)},(_,j)=>({title:j===0?'Introduction':'Lesson '+(j+1),description:'',duration:'12:00'})),resources:saved.resources??[],thumbnail:saved.thumbnail})},[route]);
 return <div className="wizard-page"><button className="inline-link" onClick={()=>navigate('/teacher/packages')}><ArrowLeft className={ar?'flip':''}/>{tx(lang,'Back to packages','العودة إلى الباقات')}</button><div className="wizard-title"><span className="eyebrow muted-eyebrow">TEACHER WORKSPACE · DEMO</span><h1>{route.includes('/edit')?tx(lang,'Edit lesson package','تعديل باقة الدروس'):tx(lang,'Create lesson package','إنشاء باقة دروس')}</h1><p>{tx(lang,'One-time lesson access. Changes stay in temporary frontend state.','وصول للدروس بدفعة واحدة. تبقى التغييرات ضمن حالة مؤقتة.')}</p></div><div className="wizard-steps">{names.map((n,i)=><button key={n} className={step===i+1?'active':step>i+1?'complete':''} onClick={()=>i+1<step&&setStep(i+1)}><span>{step>i+1?<Check size={14}/>:i+1}</span><b>{n}</b></button>)}</div><div className="wizard-card">
 {step===1&&<><h2>{tx(lang,'Package details','تفاصيل الباقة')}</h2><div className="wizard-form-grid"><Field label={tx(lang,'Package title','عنوان الباقة')} value={draft.title} onChange={v=>put('title',v)} required/><label className="field"><span>{tx(lang,'Subject','المادة')}</span><select value={draft.subject} onChange={e=>put('subject',e.target.value)}>{['Physics','Mathematics','Biology','Chemistry','Languages','History'].map(x=><option key={x}>{x}</option>)}</select></label><Field label={tx(lang,'Grade','الصف')} value={draft.grade} onChange={v=>put('grade',v)} required/><label className="field"><span>{tx(lang,'Language','اللغة')}</span><select value={draft.language} onChange={e=>put('language',e.target.value)}><option>English</option><option>العربية</option><option>Bilingual</option></select></label><label className="field field-wide"><span>{tx(lang,'Description','الوصف')}</span><textarea value={draft.description} onChange={e=>put('description',e.target.value)}/></label><label className="field field-wide"><span>{tx(lang,'Learning objectives','أهداف التعلّم')}</span><textarea value={draft.objectives} onChange={e=>put('objectives',e.target.value)}/></label><label className="thumbnail-picker field-wide"><Image size={17}/>{tx(lang,'Choose a thumbnail · local preview','اختر صورة غلاف · معاينة محلية')}<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){const reader=new FileReader();reader.onload=()=>put('thumbnail',String(reader.result));reader.readAsDataURL(f)}}}/></label>{draft.thumbnail&&<img className="thumbnail-preview" src={draft.thumbnail} alt="Package thumbnail"/>}</div></>}
 {step===2&&<><h2>{tx(lang,'Videos and resources','الفيديوهات والموارد')}</h2><p className="muted-copy">{tx(lang,'Local file selection only. Nothing is uploaded to a server.','اختيار محلي فقط. لا يتم رفع ملفات إلى خادم.')}</p>{draft.videos.map((v,i)=><div className="video-editor" key={i}><div className="video-editor-head"><span><Video size={15}/>{tx(lang,'Video','فيديو')} {i+1}</span><div className="video-order-actions"><button title={tx(lang,'Move up','تحريك لأعلى')} aria-label="Move video up" disabled={i===0} onClick={()=>{if(i>0){const a=[...draft.videos];[a[i-1],a[i]]=[a[i],a[i-1]];put('videos',a)}}}>↑</button><button title={tx(lang,'Move down','تحريك لأسفل')} aria-label="Move video down" disabled={i===draft.videos.length-1} onClick={()=>{if(i<draft.videos.length-1){const a=[...draft.videos];[a[i+1],a[i]]=[a[i],a[i+1]];put('videos',a)}}}>↓</button><button disabled={draft.videos.length===1} aria-label="Remove video" onClick={()=>put('videos',draft.videos.filter((_,n)=>n!==i))}><X size={14}/></button></div></div><div className="wizard-form-grid"><Field label={tx(lang,'Video title','عنوان الفيديو')} value={v.title} onChange={x=>updateVideo(i,'title',x)} required/><Field label={tx(lang,'Duration','المدة')} value={v.duration} onChange={x=>updateVideo(i,'duration',x)}/><Field label={tx(lang,'Description','الوصف')} value={v.description} onChange={x=>updateVideo(i,'description',x)}/><label className="field"><span>{tx(lang,'Select local video · demo','اختر فيديو محلي · تجريبي')}</span><input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={e=>e.target.files?.[0]&&setError(tx(lang,'Video selected locally; not uploaded.','تم اختيار الفيديو محليًا؛ لم يتم رفعه.'))}/></label></div></div>)}<button className="button button-outline" onClick={()=>put('videos',[...draft.videos,{title:'',description:'',duration:'10:00'}])}><Plus size={15}/>{tx(lang,'Add video','أضف فيديو')}</button><div className="resource-add"><h3>{tx(lang,'Learning resources','موارد التعلّم')}</h3>{draft.resources.map((x,i)=><p className="resource-chip" key={x+i}><FileText size={14}/>{x}<button onClick={()=>put('resources',draft.resources.filter((_,n)=>n!==i))}><X size={13}/></button></p>)}<label className="inline-upload">{tx(lang,'Choose PDF resource · demo','اختر مورد PDF · تجريبي')}<input type="file" accept="application/pdf,.pdf" onChange={e=>{const f=e.target.files?.[0];if(f)put('resources',[...draft.resources,f.name])}}/></label></div></>}
 {step===3&&<><h2>{tx(lang,'One-time pricing','تسعير لمرة واحدة')}</h2><p className="muted-copy">{T[lang].oneTime}</p><label className="field price-field"><span>{tx(lang,'Price in EGP','السعر بالجنيه المصري')}</span><div className="field-control"><span className="field-prefix">EGP</span><input type="number" min="1" value={draft.price} onChange={e=>put('price',Number(e.target.value))}/></div></label><div className="commission-card"><div><span>{tx(lang,'Student pays once','يدفع الطالب مرة واحدة')}</span><strong>EGP {draft.price.toFixed(2)}</strong></div><div><span>{tx(lang,'Illustrative platform commission · 10%','عمولة توضيحية للمنصة · ١٠٪')}</span><strong>− EGP {(draft.price*.1).toFixed(2)}</strong></div><div><span>{tx(lang,'Estimate before processing fees','تقدير قبل رسوم المعالجة')}</span><strong>EGP {(draft.price*.9).toFixed(2)}</strong></div></div><div className="fee-note"><ShieldCheck size={16}/>{tx(lang,'Processing fees and final terms will be set later. Estimate is illustrative.','ستحدد رسوم المعالجة والشروط لاحقًا. التقدير توضيحي.')}</div></>}
 {step===4&&<><h2>{tx(lang,'Student page preview','معاينة صفحة الطالب')}</h2><p className="muted-copy">{tx(lang,'Submitting simulates review only. Nothing is publicly published.','الإرسال يحاكي المراجعة فقط. لا يتم النشر للعامة.')}</p><div className="student-preview"><div className="preview-art art-violet"><span>◉</span></div><div className="preview-copy"><span className="lesson-meta">{draft.subject} · {draft.grade}</span><h3>{draft.title||tx(lang,'Your package title','عنوان الباقة')}</h3><p>{draft.description}</p><p>{draft.videos.length} {T[lang].videos} · EGP {draft.price} · {T[lang].oneTime}</p></div></div><p className="review-objectives"><strong>{tx(lang,'Learning objectives','أهداف التعلّم')}</strong><br/>{draft.objectives}</p><div className="wizard-final-actions"><button className="button button-outline" onClick={()=>savePackage('Draft')}>{tx(lang,'Save as Draft','حفظ كمسودة')}</button><button className="button button-outline" onClick={()=>{setConfirmStatus('Under review');setConfirm(true)}}>{tx(lang,'Submit for review','إرسال للمراجعة')}</button><button className="button button-primary" onClick={()=>{setConfirmStatus('Published');setConfirm(true)}}>{tx(lang,'Publish in demo','نشر تجريبي')}</button></div></>}
 {error&&<p role="alert" className="inline-error">{error}</p>}{step<4&&<div className="wizard-footer">{step>1&&<button className="button button-outline" onClick={()=>setStep(step-1)}>{tx(lang,'Previous','السابق')}</button>}<button className="button button-primary" onClick={next}>{tx(lang,'Continue','متابعة')}<ArrowRight className={ar?'flip':''}/></button></div>}</div>{confirm&&<Modal title={confirmStatus==='Published'?tx(lang,'Publish package in this demo?','نشر الباقة في النموذج؟'):tx(lang,'Submit for review?','إرسال للمراجعة؟')} message={tx(lang,'This changes only temporary demo state. No package is actually published.','سيغيّر هذا الحالة التجريبية فقط. لن يتم نشر الباقة فعليًا.')} cancel={T[lang].cancel} confirm={T[lang].confirm} onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);savePackage(confirmStatus)}}/>}</div>
}


function Checkout({
  lang,
  lesson,
  navigate,
  orderState,
  setOrderState,
}: {
  lang: AppLang;
  lesson: Lesson;
  navigate: (p: string) => void;
  orderState: 'success' | 'pending' | 'failed';
  setOrderState: (s: 'success' | 'pending' | 'failed') => void;
}) {
  const ar = lang === 'ar';
  const [method, setMethod] = useState('card');
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [checkoutLesson, setCheckoutLesson] = useState<Lesson>(lesson);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const packageId = new URLSearchParams(window.location.search).get('packageId');

  useEffect(() => {
    let cancelled = false;

    async function loadPackage() {
      if (!packageId || !/^\d+$/.test(packageId)) {
        setFeedback('No valid lesson package was selected.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/lessons/${packageId}`);

        if (!response.ok) {
          throw new Error('Could not load this lesson package.');
        }

        const data = await response.json();
        const item = data.package ?? data.lesson ?? data.data ?? data;

        if (!cancelled) {
          setCheckoutLesson({
            ...lesson,
            id: Number(item.id),
            title: item.title,
            teacher: item.teacher_name ?? lesson.teacher,
            subject: item.subject ?? lesson.subject,
            grade: item.teacher_specialization ?? lesson.grade,
            videos: Number(item.video_count ?? 0),
            price: Number(item.price),
          });
          setFeedback('');
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error
              ? error.message
              : 'Could not load this lesson package.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPackage();

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  if (import.meta.env.PROD) {
    return (
      <div className="checkout-page">
        <button
          className="inline-link"
          onClick={() => navigate(`/lesson/${packageId ?? checkoutLesson.id}`)}
        >
          <ArrowLeft className={ar ? 'flip' : ''} />
          {tx(lang, 'Back to lesson', 'العودة إلى الدرس')}
        </button>
        <div className="panel">
          <span className="eyebrow muted-eyebrow">
            {tx(lang, 'PAYMENTS NOT CONFIGURED', 'الدفع غير مهيأ')}
          </span>
          <h1>{tx(lang, 'Checkout is unavailable', 'إتمام الشراء غير متاح')}</h1>
          <p>
            {tx(
              lang,
              'No payment provider is configured, so no order or charge was created. Please try again later.',
              'لم يتم إعداد مزود للدفع، لذلك لم يتم إنشاء طلب أو تحصيل أي مبلغ. يرجى المحاولة لاحقًا.'
            )}
          </p>
          <button className="button button-outline" onClick={() => navigate('/')}>
            {tx(lang, 'Browse lessons', 'تصفح الدروس')}
          </button>
        </div>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (!accepted) {
      setFeedback(
        tx(lang, 'Accept the demo terms to continue.', 'وافق على الشروط التجريبية للمتابعة.')
      );
      return;
    }

    if (!packageId || !/^\d+$/.test(packageId)) {
      setFeedback(
        tx(lang, 'Please select a valid lesson package first.', 'يرجى اختيار باقة دروس صالحة أولاً.')
      );
      return;
    }

    setFeedback('');
    setStep(2);
  };

  const confirmOrder = async () => {
    if (orderState !== 'success') {
      setFeedback(
        orderState === 'pending'
          ? tx(lang, 'Pending demo. No charge was made.', 'الطلب معلّق تجريبيًا. لم يتم تحصيل مبلغ.')
          : tx(lang, 'Payment failed in the demo. No charge was made.', 'فشلت المحاكاة. لم يتم تحصيل مبلغ.')
      );
      return;
    }

    const token = localStorage.getItem('bayenly_token');

    if (!token) {
      setFeedback(
        tx(lang, 'Please log in before purchasing.', 'يرجى تسجيل الدخول قبل الشراء.')
      );
      return;
    }

    if (!packageId || !/^\d+$/.test(packageId)) {
      setFeedback(
        tx(lang, 'Please select a valid lesson package first.', 'يرجى اختيار باقة دروس صالحة أولاً.')
      );
      return;
    }

    setProcessing(true);
    setFeedback('');

    try {
      const purchaseResponse = await authenticatedFetch(`${API_BASE}/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ package_id: Number(packageId) }),
      });

      const purchaseData = await purchaseResponse.json();

      if (!purchaseResponse.ok) {
        throw new Error(
          purchaseData.message || purchaseData.error || 'Could not create the purchase.'
        );
      }

      const purchaseId =
        purchaseData.purchase?.id ??
        purchaseData.id ??
        purchaseData.purchase_id;

      if (!purchaseId) {
        throw new Error('Purchase created, but the server did not return its ID.');
      }

      const paymentResponse = await authenticatedFetch(`${API_BASE}/payments/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchase_id: purchaseId }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          paymentData.message || paymentData.error || 'Simulated payment failed.'
        );
      }

      navigate('/confirmation');
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Something went wrong while processing the demo purchase.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="checkout-page">
      <button
        className="inline-link"
        onClick={() => navigate(`/lesson/${packageId ?? checkoutLesson.id}`)}
      >
        <ArrowLeft className={ar ? 'flip' : ''} />
        {tx(lang, 'Back to lesson', 'العودة إلى الدرس')}
      </button>

      <div className="checkout-grid">
        <section>
          <span className="eyebrow muted-eyebrow">
            {tx(lang, 'DEMO CHECKOUT', 'إتمام تجريبي')}
          </span>

          <h1>{tx(lang, 'Get the full lesson package', 'احصل على باقة الدروس')}</h1>

          <p className="muted-copy">
            {tx(
              lang,
              'This uses simulated payment only. No real money will be charged.',
              'يستخدم هذا النظام محاكاة للدفع فقط. لن يتم تحصيل أي أموال حقيقية.'
            )}
          </p>

          {loading ? (
            <div className="panel">{tx(lang, 'Loading package...', 'جارٍ تحميل الباقة...')}</div>
          ) : (
            <>
              {step === 1 ? (
                <form onSubmit={submit}>
                  <div className="panel payment-panel">
                    <h2>{tx(lang, 'Choose a demo payment method', 'اختر وسيلة دفع تجريبية')}</h2>

                    {[
                      ['card', tx(lang, 'Bank card', 'بطاقة بنكية'), CreditCard],
                      ['wallet', tx(lang, 'Mobile wallet', 'محفظة إلكترونية'), Wallet],
                      ['meeza', 'Meeza', BadgeCheck],
                    ].map(([id, label, Icon]) => {
                      const I = Icon as typeof CreditCard;

                      return (
                        <button
                          type="button"
                          key={String(id)}
                          className={`payment-method ${method === id ? 'selected' : ''}`}
                          onClick={() => setMethod(String(id))}
                        >
                          <I size={18} />
                          <span>
                            {String(label)}
                            <small>
                              {tx(lang, 'Demo selection only; no payment details', 'اختيار تجريبي فقط؛ لا توجد بيانات دفع')}
                            </small>
                          </span>
                          {method === id && <Check size={15} />}
                        </button>
                      );
                    })}

                    <div className="checkout-no-card">
                      <LockKeyhole size={16} />
                      {tx(lang, 'Never enter a card number or wallet PIN in this prototype.', 'لا تدخل رقم البطاقة أو الرقم السري للمحفظة في هذا النموذج.')}
                    </div>

                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                      />
                      {tx(lang, 'I accept the demo order terms; no charge will be made.', 'أوافق على شروط الطلب التجريبي؛ لن يتم تحصيل أي مبلغ.')}
                    </label>

                    {feedback && <p className="inline-error">{feedback}</p>}

                    <button className="button button-primary flow-submit" type="submit">
                      {tx(lang, 'Review order', 'مراجعة الطلب')}
                      <ArrowRight className={ar ? 'flip' : ''} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="panel confirmation-panel">
                  <span className="confirmation-icon">
                    <ShieldCheck size={26} />
                  </span>

                  <h2>{tx(lang, 'Confirm demo order', 'تأكيد الطلب التجريبي')}</h2>
                  <p>
                    {tx(lang, 'Choose a simulated payment result. No real payment provider is contacted.', 'اختر نتيجة دفع محاكاة. لن يتم التواصل مع مزود دفع حقيقي.')}
                  </p>

                  <label className="field">
                    <span>{tx(lang, 'Demo result', 'النتيجة التجريبية')}</span>
                    <select
                      value={orderState}
                      onChange={(e) =>
                        setOrderState(e.target.value as 'success' | 'pending' | 'failed')
                      }
                    >
                      <option value="success">{tx(lang, 'Successful demo', 'نجاح تجريبي')}</option>
                      <option value="pending">{tx(lang, 'Pending demo', 'قيد الانتظار')}</option>
                      <option value="failed">{tx(lang, 'Failed demo', 'فشل تجريبي')}</option>
                    </select>
                  </label>

                  <div className="confirm-actions">
                    <button
                      className="button button-outline"
                      onClick={() => {
                        setFeedback('');
                        setStep(1);
                      }}
                      disabled={processing}
                    >
                      {tx(lang, 'Back', 'رجوع')}
                    </button>

                    <button
                      className="button button-primary"
                      onClick={confirmOrder}
                      disabled={processing}
                    >
                      {processing
                        ? tx(lang, 'Processing...', 'جارٍ التنفيذ...')
                        : tx(lang, 'Confirm demo purchase', 'تأكيد الشراء التجريبي')}
                    </button>
                  </div>

                  {feedback && (
                    <p role="status" className="inline-error">
                      {feedback}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="panel order-summary">
          <span className="eyebrow muted-eyebrow">
            {tx(lang, 'ORDER SUMMARY', 'ملخص الطلب')}
          </span>

          <div className="order-product">
            <span className="order-art art-violet">◉</span>
            <div>
              <strong>{checkoutLesson.title}</strong>
              <small>{checkoutLesson.teacher} · {checkoutLesson.subject}</small>
              <small>
                {checkoutLesson.videos} {T[lang].videos}
              </small>
            </div>
          </div>

          <div className="summary-line">
            <span>{tx(lang, 'One-time package price', 'سعر الباقة لمرة واحدة')}</span>
            <strong>EGP {checkoutLesson.price}</strong>
          </div>

          <div className="summary-total">
            <span>{tx(lang, 'Total · EGP', 'الإجمالي · ج.م')}</span>
            <strong>EGP {checkoutLesson.price}</strong>
          </div>

          <p>
            {tx(lang, 'One purchase. Ongoing access. No recurring charges.', 'شراء مرة واحدة ووصول مستمر. بلا رسوم متكررة.')}
          </p>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({lang,lesson,orderRef,navigate}:{lang:AppLang;lesson:Lesson;orderRef:string;navigate:(p:string)=>void}){const ar=lang==='ar';return <div className="success-page"><span className="success-seal"><Check size={34}/></span><span className="eyebrow muted-eyebrow">{tx(lang,'DEMO ORDER CONFIRMED','تم تأكيد الطلب التجريبي')}</span><h1>{tx(lang,'Your lesson is ready to explore.','درسك جاهز للاستكشاف.')}</h1><p>{tx(lang,'Simulated order only. No money was charged and no real account access was unlocked.','طلب محاكى فقط. لم يتم تحصيل أموال أو فتح وصول حقيقي.')}</p><div className="panel confirmation-receipt"><div><span>{tx(lang,'Package','الباقة')}</span><strong>{lesson.title}</strong></div><div><span>{tx(lang,'Teacher','المدرس')}</span><strong>Omar Hassan</strong></div><div><span>{tx(lang,'Amount','المبلغ')}</span><strong>EGP {lesson.price}</strong></div><div><span>{tx(lang,'Demo reference','الرقم التجريبي')}</span><strong>{orderRef}</strong></div></div><div className="success-actions"><button className="button button-primary" onClick={()=>navigate('/learn/demo')}>{tx(lang,'Open sample learning page','افتح صفحة التعلّم التجريبية')}<ArrowRight className={ar?'flip':''}/></button><button className="button button-outline" onClick={()=>navigate('/student/learning')}>{tx(lang,'Go to My Learning','الذهاب إلى تعلّمي')}</button></div><p className="demo-disclaimer"><ShieldCheck size={14}/>{tx(lang,'The learning page is an access-control demo.','صفحة التعلم توضيحية للتحكم بالوصول.')}</p></div>}

function Learning({lang,lesson,navigate}:{lang:AppLang;lesson:Lesson;navigate:(p:string)=>void}){const ar=lang==='ar';const [current,setCurrent]=useState(0);const [done,setDone]=useState<number[]>([]);const [listOpen,setListOpen]=useState(true);const [demoMessage,setDemoMessage]=useState('');const titles=['What is motion? A quick recap','Newton’s First Law — Inertia','Newton’s Second Law — F = ma','Newton’s Third Law — Action & reaction','Solving force problems together','Friction and free body diagrams','Exam-style walkthrough','Quick revision and key takeaways'];const complete=()=>setDone(d=>d.includes(current)?d:[...d,current]);return <div className="learning-page"><button className="inline-link" onClick={()=>navigate('/student/learning')}><ArrowLeft className={ar?'flip':''}/>{tx(lang,'Back to My Learning','العودة إلى تعلّمي')}</button><div className="learning-banner"><ShieldCheck size={17}/>{tx(lang,'DEMO LEARNING PAGE · Real access control will be implemented on the backend.','صفحة تعلّم تجريبية · سيتم تنفيذ التحكم الحقيقي بالخلفية.')}</div><div className="learning-page-grid"><main><div className="video-player-demo"><div className="video-player-art"><span className="video-atom">⊙</span><span>F = m × a</span></div><button className="play-button" onClick={()=>setDemoMessage(tx(lang,'No video file is attached to this visual demo.','لا يوجد ملف فيديو مرفق بهذا النموذج التوضيحي.'))} aria-label={tx(lang,'Demo video placeholder','عنصر فيديو تجريبي')}><Play fill="currentColor"/></button><span className="video-demo-label">{tx(lang,'VIDEO PREVIEW PLACEHOLDER','مساحة معاينة الفيديو')}</span>{demoMessage&&<p role="status" className="inline-success">{demoMessage}</p>}</div><div className="player-controls"><button className="button button-outline" disabled={current===0} onClick={()=>setCurrent(Math.max(0,current-1))}><ArrowLeft className={ar?'flip':''}/>{tx(lang,'Previous','السابق')}</button><button className="button button-outline" disabled={current===titles.length-1} onClick={()=>setCurrent(Math.min(titles.length-1,current+1))}>{tx(lang,'Next lesson','الدرس التالي')}<ArrowRight className={ar?'flip':''}/></button></div><div className="learning-description"><span className="lesson-meta">{lesson.subject} · {lesson.grade}</span><h1>{lesson.title}</h1><p>{tx(lang,'Learn the core ideas through short guided videos and worked examples. This page is a visual learning demo.','تعلّم المفاهيم الأساسية عبر فيديوهات قصيرة وأمثلة محلولة. هذه الصفحة نموذج توضيحي.')}</p><button className={'button '+(done.includes(current)?'button-lime':'button-primary')} onClick={complete}>{done.includes(current)?<><Check size={15}/>{tx(lang,'Lesson completed','اكتمل الدرس')}</>:tx(lang,'Mark lesson complete','وضع علامة إكمال')}</button></div><div className="panel resources-list"><h2>{tx(lang,'Learning resources','موارد التعلّم')}</h2><p><FileText size={15}/>Newton’s Laws — Quick Notes.pdf <button className="inline-link" onClick={()=>setDemoMessage(tx(lang,'Resource previews are not attached in this visual demo.','معاينة الموارد غير متاحة في هذا النموذج التوضيحي.'))}>{tx(lang,'Preview','معاينة')}</button></p><p><FileText size={15}/>Practice Questions + Answers.pdf <button className="inline-link" onClick={()=>setDemoMessage(tx(lang,'Resource previews are not attached in this visual demo.','معاينة الموارد غير متاحة في هذا النموذج التوضيحي.'))}>{tx(lang,'Preview','معاينة')}</button></p></div></main><aside className="panel lesson-playlist"><button className="playlist-toggle" onClick={()=>setListOpen(!listOpen)}><span><BookOpen size={17}/>{tx(lang,'Course content','محتوى الباقة')}</span>{listOpen?<ChevronDown/>:<ChevronRight/>}</button>{listOpen&&<><p>{done.length} / {titles.length} {tx(lang,'completed','مكتمل')}</p><div className="playlist-progress"><i style={{width:(done.length/titles.length*100)+'%'}}/></div>{titles.map((title,i)=><button key={title} className={'playlist-item '+(current===i?'active':'')} onClick={()=>setCurrent(i)}><span>{done.includes(i)?<Check size={14}/>:<Play size={12}/>}</span><span>{title}<small>{['12:40','21:15','24:30','19:05','28:45','23:10','18:20','12:15'][i]}</small></span>{done.includes(i)&&<Check size={14}/>}</button>)}</>}</aside></div></div>}


type LearningVideoRecord = {
  id: number | string;
  title: string;
  video_url: string;
  duration_seconds: number | null;
  position: number;
  completed_at: string | null;
};

function LearningAccess({lang,packageId,navigate}:{lang:AppLang;packageId:string;navigate:(p:string)=>void}) {
  const ar=lang==='ar';
  const [packageTitle,setPackageTitle]=useState('');
  const [videos,setVideos]=useState<LearningVideoRecord[]>([]);
  const [selected,setSelected]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [reloadKey,setReloadKey]=useState(0);

  useEffect(()=>{
    let active=true;
    async function loadLearning(){
      setLoading(true);
      setError('');
      const token=localStorage.getItem('bayenly_token');
      if(!token){
        setError(tx(lang,'Sign in to access this lesson package.','سجّلي الدخول للوصول إلى هذه الباقة.'));
        setLoading(false);
        return;
      }
      try{
        const response=await authenticatedFetch(`${API_BASE}/learning/${packageId}`,{headers:{Authorization:`Bearer ${token}`}});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to load lesson content.','تعذر تحميل محتوى الدروس.'));
        if(typeof data?.package_title!=='string'||!Array.isArray(data.videos))throw new Error(tx(lang,'The server returned invalid lesson data.','أعاد الخادم بيانات دروس غير صالحة.'));
        if(active){setPackageTitle(data.package_title);setVideos(data.videos);setSelected(0);}
      }catch(loadError){
        if(active)setError(loadError instanceof Error?loadError.message:tx(lang,'Unable to load lesson content.','تعذر تحميل محتوى الدروس.'));
      }finally{
        if(active)setLoading(false);
      }
    }
    void loadLearning();
    return ()=>{active=false;};
  },[lang,packageId,reloadKey]);

  const current=videos[selected];
  const completed=videos.filter(video=>video.completed_at).length;
  async function markComplete(){
    const token=localStorage.getItem('bayenly_token');
    if(!token||!current)return;
    setSaving(true);
    setError('');
    try{
      const response=await authenticatedFetch(`${API_BASE}/learning/${packageId}/videos/${current.id}/complete`,{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`},
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to save lesson progress.','تعذر حفظ تقدّم الدرس.'));
      if(!data?.progress?.completed_at)throw new Error(tx(lang,'The server did not confirm saved progress.','لم يؤكد الخادم حفظ التقدّم.'));
      setVideos(items=>items.map(video=>String(video.id)===String(current.id)?{...video,completed_at:data.progress.completed_at}:video));
    }catch(saveError){
      setError(saveError instanceof Error?saveError.message:tx(lang,'Unable to save lesson progress.','تعذر حفظ تقدّم الدرس.'));
    }finally{
      setSaving(false);
    }
  }
  const duration=(seconds:number|null)=>seconds===null?tx(lang,'Duration unavailable','المدة غير متاحة'):`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

  return <div className="learning-page">
    <button className="inline-link" onClick={()=>navigate('/student/learning')}><ArrowLeft className={ar?'flip':''}/>{tx(lang,'Back to My Learning','العودة إلى تعلّمي')}</button>
    <div className="learning-banner"><ShieldCheck size={17}/>{tx(lang,'PURCHASED LESSONS · Access is verified by your account.','دروس مشتراة · يتم التحقق من الوصول عبر حسابك.')}</div>
    {error&&<div className="inline-error" role="alert">{error} <button className="inline-link" onClick={()=>setReloadKey(key=>key+1)}>{tx(lang,'Retry','إعادة المحاولة')}</button></div>}
    {loading?<div className="panel">{tx(lang,'Loading lesson content…','جارٍ تحميل محتوى الدروس…')}</div>:<div className="learning-page-grid">
      <main>
        {current?<><div className="video-player-demo">{current.video_url?<video key={current.video_url} src={current.video_url} controls preload="metadata" aria-label={current.title} style={{position:'relative',zIndex:1,width:'100%',height:'100%',objectFit:'contain'}}/>:<p>{tx(lang,'No video file is available for this lesson.','لا يتوفر ملف فيديو لهذا الدرس.')}</p>}</div>
          <div className="player-controls"><button className="button button-outline" disabled={selected===0} onClick={()=>setSelected(index=>Math.max(0,index-1))}><ArrowLeft className={ar?'flip':''}/>{tx(lang,'Previous','السابق')}</button><button className="button button-outline" disabled={selected>=videos.length-1} onClick={()=>setSelected(index=>Math.min(videos.length-1,index+1))}>{tx(lang,'Next lesson','الدرس التالي')}<ArrowRight className={ar?'flip':''}/></button></div>
          <div className="learning-description"><span className="lesson-meta">{packageTitle}</span><h1>{current.title}</h1><p>{duration(current.duration_seconds)}</p><button className={`button ${current.completed_at?'button-lime':'button-primary'}`} disabled={saving||Boolean(current.completed_at)} onClick={markComplete}>{saving?tx(lang,'Saving…','جارٍ الحفظ…'):current.completed_at?<><Check size={15}/>{tx(lang,'Lesson completed','اكتمل الدرس')}</>:tx(lang,'Mark lesson complete','وضع علامة إكمال')}</button></div>
        </>:<div className="panel"><h2>{packageTitle}</h2><p>{tx(lang,'This package does not have any lesson videos yet.','لا تحتوي هذه الباقة على فيديوهات دروس حتى الآن.')}</p></div>}
      </main>
      <aside className="panel lesson-playlist"><div className="playlist-toggle"><span><BookOpen size={17}/>{tx(lang,'Course content','محتوى الباقة')}</span></div><p>{completed} / {videos.length} {tx(lang,'completed','مكتمل')}</p><div className="playlist-progress"><i style={{width:`${videos.length?completed/videos.length*100:0}%`}}/></div>{videos.map((video,index)=><button key={video.id} className={`playlist-item ${selected===index?'active':''}`} onClick={()=>setSelected(index)}><span>{video.completed_at?<Check size={14}/>:<Play size={12}/>}</span><span>{video.title}<small>{duration(video.duration_seconds)}</small></span></button>)}</aside>
    </div>}
  </div>;
}

type TeacherPackageRecord = {
  id: string;
  title: string;
  description: string;
  subject: string;
  price: number;
  language: 'ar'|'en';
  status: 'draft'|'published'|'archived';
  video_count: number;
};

function TeacherWorkspaceLive({route,lang,navigate,setDraft,setPackages,authUser}:{route:string;lang:AppLang;navigate:(p:string)=>void;draft:PackageDraft;setDraft:Dispatch<SetStateAction<PackageDraft>>;packages:typeof teacherPackages;setPackages:Dispatch<SetStateAction<typeof teacherPackages>>;authUser:AuthUser}) {
  const sec=pathSection(route);
  const [records,setRecords]=useState<TeacherPackageRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('all');
  const [reloadKey,setReloadKey]=useState(0);
  const sections=[
    {label:T[lang].overview,path:'/teacher/overview',icon:LayoutDashboard},
    {label:T[lang].packages,path:'/teacher/packages',icon:Package},
    {label:T[lang].library,path:'/teacher/content',icon:Library},
    {label:T[lang].earnings,path:'/teacher/orders',icon:Wallet},
    {label:T[lang].profile,path:'/teacher/profile',icon:User},
  ];

  useEffect(()=>{
    let active=true;
    async function loadPackages(){
      setLoading(true);
      setError('');
      const token=localStorage.getItem('bayenly_token');
      if(!token){setError(tx(lang,'Sign in with a teacher account to manage packages.','سجّل الدخول بحساب مدرّس لإدارة الباقات.'));setLoading(false);return;}
      try{
        const response=await authenticatedFetch(`${API_BASE}/lessons/my`,{headers:{Authorization:`Bearer ${token}`}});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to retrieve your packages.','تعذر تحميل باقاتك.'));
        if(!Array.isArray(data?.packages))throw new Error(tx(lang,'The server returned invalid package data.','أعاد الخادم بيانات باقات غير صالحة.'));
        if(active){
          const next:TeacherPackageRecord[]=data.packages;
          setRecords(next);
          setPackages(next.map(item=>({
            id:String(item.id),title:item.title,subject:item.subject,grade:'',
            price:Number(item.price),sales:0,
            status:item.status==='published'?'Published':item.status==='archived'?'Archived':'Draft',
            videos:item.video_count,updated:'',color:'violet',
            description:item.description,language:item.language==='ar'?'العربية':'English',
          })));
        }
      }catch(loadError){
        if(active)setError(loadError instanceof Error?loadError.message:tx(lang,'Unable to retrieve your packages.','تعذر تحميل باقاتك.'));
      }finally{if(active)setLoading(false);}
    }
    void loadPackages();
    return ()=>{active=false;};
  },[lang,route,reloadKey,setPackages]);

  const visible=records.filter(item=>(status==='all'||item.status===status)&&item.title.toLowerCase().includes(query.toLowerCase()));
  const labelStatus=(value:TeacherPackageRecord['status'])=>value==='published'?T[lang].published:value==='archived'?tx(lang,'Archived','مؤرشفة'):T[lang].draft;
  let content:ReactNode;
  if(sec==='overview'){
    content=<>{error&&<div className="inline-error" role="alert">{error} <button className="inline-link" onClick={()=>setReloadKey(key=>key+1)}>{tx(lang,'Retry','إعادة المحاولة')}</button></div>}{loading?<div className="panel">{tx(lang,'Loading your packages…','جارٍ تحميل باقاتك…')}</div>:<><div className="teacher-metric-grid"><Summary icon={Package} label={tx(lang,'Your packages','باقاتك')} value={String(records.length)} color="violet"/><Summary icon={BadgeCheck} label={T[lang].published} value={String(records.filter(item=>item.status==='published').length)} color="lime"/><Summary icon={FileText} label={T[lang].draft} value={String(records.filter(item=>item.status==='draft').length)} color="coral"/><Summary icon={Wallet} label={tx(lang,'Sales and payouts','المبيعات والمستحقات')} value="—" color="blue"/></div><div className="panel"><h2>{tx(lang,'Sales and payouts unavailable','المبيعات والمستحقات غير متاحة')}</h2><p>{tx(lang,'Payment processing and teacher payouts are not configured. No sales or earnings are being reported.','لم يتم إعداد الدفع أو مستحقات المدرّسين؛ لا يتم عرض مبيعات أو أرباح.')}</p></div></>}</>;
  }else if(sec==='packages'){
    content=<><div className="panel-heading flow-panel-heading"><div><h2>{T[lang].packages}</h2><p>{tx(lang,'Packages loaded from your teacher account.','الباقات المحمّلة من حساب المدرّس.')}</p></div><button className="button button-primary" onClick={()=>{setDraft({title:'',description:'',subject:'Physics',grade:'',language:'English',objectives:'',price:150,videos:[],resources:[]});navigate('/teacher/package/new')}}><Plus size={16}/>{T[lang].create}</button></div><div className="toolbar"><div className="search-field"><Search size={15}/><input placeholder={tx(lang,'Search packages…','ابحث عن الباقات…')} value={query} onChange={event=>setQuery(event.target.value)}/></div><select className="select-button" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">{tx(lang,'All statuses','كل الحالات')}</option><option value="draft">{T[lang].draft}</option><option value="published">{T[lang].published}</option><option value="archived">{tx(lang,'Archived','مؤرشفة')}</option></select></div>
      {error&&<div className="inline-error" role="alert">{error} <button className="inline-link" onClick={()=>setReloadKey(key=>key+1)}>{tx(lang,'Retry','إعادة المحاولة')}</button></div>}
      {loading?<div className="panel">{tx(lang,'Loading your packages…','جارٍ تحميل باقاتك…')}</div>:visible.length?<div className="teacher-package-grid">{visible.map((item,index)=><article className="teacher-package-card" key={item.id}><div className={`learning-art art-${['violet','coral','lime','blue'][index%4]}`}><span>{item.subject.slice(0,2).toUpperCase()}</span><span className={`status-pill ${item.status==='published'?'good':'neutral'}`}>{labelStatus(item.status)}</span></div><div className="teacher-package-body"><small>{item.subject} · {item.language==='ar'?'العربية':'English'}</small><h3>{item.title}</h3><p>{item.video_count} {T[lang].videos} <i/> {item.price} EGP</p><div className="teacher-package-actions"><button className="button button-outline" onClick={()=>navigate(`/teacher/package/${item.id}/edit`)}>{tx(lang,'Edit','تعديل')}</button>{item.status==='published'&&<button className="button button-outline" onClick={()=>navigate(`/lesson/${item.id}`)}>{tx(lang,'View published page','عرض الصفحة المنشورة')}</button>}</div></div></article>)}</div>:<Empty icon={Package} title={tx(lang,'No packages found','لا توجد باقات')} text={tx(lang,'Create a package to get started.','أنشئ باقة للبدء.')} button={T[lang].create} action={()=>navigate('/teacher/package/new')}/>}</>;
  }else{
    const message=sec==='content'?tx(lang,'Video hosting and resource uploads are not configured. Add hosted video URLs while creating a package.','استضافة الفيديوهات ورفع الموارد غير متاحين. أضف روابط فيديو مستضافة عند إنشاء باقة.'):sec==='orders'?tx(lang,'Order reporting and payouts are unavailable until a payment provider is configured.','تقارير الطلبات والمستحقات غير متاحة حتى إعداد مزود دفع.'):tx(lang,'Teacher profile editing is not implemented by the current API.','تعديل ملف المدرّس غير مدعوم في واجهة API الحالية.');
    content=<div className="panel"><h2>{tx(lang,'Not available yet','غير متاح حاليًا')}</h2><p>{message}</p></div>;
  }
  return <WorkspaceShell lang={lang} title={tx(lang,'Teacher Workspace','مساحة المدرّس')} sections={sections} active={route} navigate={navigate} identity={authUser}><div className="workspace-content">{content}</div></WorkspaceShell>;
}

function WizardLive({lang,draft,setDraft,packages,setPackages,navigate,route}:{lang:AppLang;draft:PackageDraft;setDraft:Dispatch<SetStateAction<PackageDraft>>;packages:typeof teacherPackages;setPackages:Dispatch<SetStateAction<typeof teacherPackages>>;navigate:(p:string)=>void;route:string}) {
  const [packageId,setPackageId]=useState<string|null>(null);
  const [packageStatus,setPackageStatus]=useState<TeacherPackageRecord['status']>('draft');
  const [loading,setLoading]=useState(route.includes('/edit')||route.includes('/preview'));
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const preview=route.endsWith('/preview');

  useEffect(()=>{
    const match=route.match(/^\/teacher\/package\/([^/]+)\/(edit|preview)$/);
    if(!match){setPackageId(null);setPackageStatus('draft');setLoading(false);return;}
    const requestedId=match[1];
    let active=true;
    async function loadPackage(){
      setLoading(true);
      setError('');
      const token=localStorage.getItem('bayenly_token');
      if(!token){setError(tx(lang,'Sign in with a teacher account to edit packages.','سجّل الدخول بحساب مدرّس لتعديل الباقات.'));setLoading(false);return;}
      try{
        const response=await authenticatedFetch(`${API_BASE}/lessons/my`,{headers:{Authorization:`Bearer ${token}`}});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to load this package.','تعذر تحميل هذه الباقة.'));
        const saved=data?.packages?.find((item:TeacherPackageRecord)=>String(item.id)===requestedId) as TeacherPackageRecord|undefined;
        if(!saved)throw new Error(tx(lang,'Package not found in your account.','لم يتم العثور على الباقة في حسابك.'));
        const videoResponse=await authenticatedFetch(`${API_BASE}/lessons/${saved.id}/videos`,{headers:{Authorization:`Bearer ${token}`}});
        const videoData=await videoResponse.json().catch(()=>null);
        if(!videoResponse.ok)throw new Error(videoData?.message||tx(lang,'Unable to load package videos.','تعذر تحميل فيديوهات الباقة.'));
        if(!Array.isArray(videoData?.videos))throw new Error(tx(lang,'The server returned invalid video data.','أعاد الخادم بيانات فيديو غير صالحة.'));
        if(!active)return;
        setPackageId(String(saved.id));
        setPackageStatus(saved.status);
        setDraft({
          title:saved.title,description:saved.description,subject:saved.subject,grade:'',
          language:saved.language==='ar'?'العربية':'English',objectives:'',
          price:Number(saved.price),resources:[],
          videos:videoData.videos.map((video:{id:number|string;title:string;video_url:string;duration_seconds:number|null})=>({
            id:video.id,title:video.title,url:video.video_url,description:'',
            duration:video.duration_seconds===null?'':`${Math.floor(video.duration_seconds/60)}:${String(video.duration_seconds%60).padStart(2,'0')}`,
          })),
        });
      }catch(loadError){if(active)setError(loadError instanceof Error?loadError.message:tx(lang,'Unable to load this package.','تعذر تحميل هذه الباقة.'));}
      finally{if(active)setLoading(false);}
    }
    void loadPackage();
    return ()=>{active=false;};
  },[lang,route,setDraft]);

  const updateVideo=(index:number,key:'title'|'url'|'duration',value:string)=>setDraft(current=>({...current,videos:current.videos.map((video,i)=>i===index?{...video,[key]:value}:video)}));
  const setField=(key:'title'|'description'|'subject'|'language'|'price',value:string|number)=>setDraft(current=>({...current,[key]:value}));

  async function savePackage(publish:boolean){
    setError('');
    const token=localStorage.getItem('bayenly_token');
    if(!token){setError(tx(lang,'Sign in with a teacher account before saving.','سجّل الدخول بحساب مدرّس قبل الحفظ.'));return;}
    if(!draft.title.trim()||!draft.description.trim()||!draft.subject.trim()||!Number.isFinite(draft.price)||draft.price<=0){setError(tx(lang,'Provide a title, description, subject, and positive price.','أدخل العنوان والوصف والمادة وسعرًا موجبًا.'));return;}
    const videos=draft.videos.filter(video=>video.title.trim()||video.url?.trim());
    if(videos.some(video=>!video.title.trim()||!video.url?.trim())){setError(tx(lang,'Each video needs both a title and a hosted URL.','يحتاج كل فيديو إلى عنوان ورابط مستضاف.'));return;}
    if(publish&&videos.length===0&&draft.videos.every(video=>video.id===undefined)){setError(tx(lang,'Add at least one video before publishing.','أضف فيديو واحدًا على الأقل قبل النشر.'));return;}
    for(const video of videos){
      try{const parsed=new URL(video.url!);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error();}
      catch{setError(tx(lang,'Video links must be valid HTTP or HTTPS URLs.','يجب أن تكون روابط الفيديو صالحة ببروتوكول HTTP أو HTTPS.'));return;}
      const pieces=video.duration.trim()?video.duration.split(':').map(Number):[];
      if(pieces.length&&(!pieces.every(Number.isInteger)||pieces.some(value=>value<0)||pieces.length>2||(pieces.length===2&&pieces[1]>=60))){setError(tx(lang,'Enter video duration as minutes:seconds.','أدخل مدة الفيديو بالدقائق:الثواني.'));return;}
    }
    if(publish&&draft.videos.some(video=>video.id===undefined)&&videos.length===0){setError(tx(lang,'Add at least one video before publishing.','أضف فيديو واحدًا على الأقل قبل النشر.'));return;}
    setSaving(true);
    try{
      const payload={title:draft.title.trim(),description:draft.description.trim(),subject:draft.subject.trim(),price:draft.price,language:draft.language==='العربية'?'ar':'en'};
      let id=packageId;
      if(id){
        const response=await authenticatedFetch(`${API_BASE}/lessons/${id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to save package details.','تعذر حفظ تفاصيل الباقة.'));
      }else{
        const response=await authenticatedFetch(`${API_BASE}/lessons`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
        const data=await response.json().catch(()=>null);
        if(!response.ok||!data?.package?.id)throw new Error(data?.message||tx(lang,'Unable to create package.','تعذر إنشاء الباقة.'));
        id=String(data.package.id);
        setPackageId(id);
      }

      const tokenHeaders={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
      const videoRows=videos.filter(video=>video.id!==undefined);
      const newVideos=videos.filter(video=>video.id===undefined);
      if(packageStatus==='draft'){
        for(const video of videoRows){
          const parts=video.duration.trim()?video.duration.split(':').map(Number):[];
          const durationSeconds=parts.length===2?parts[0]*60+parts[1]:parts.length===1?parts[0]:null;
          const response=await authenticatedFetch(`${API_BASE}/lessons/${id}/videos/${video.id}`,{
            method:'PUT',headers:tokenHeaders,
            body:JSON.stringify({title:video.title.trim(),video_url:video.url?.trim(),duration_seconds:durationSeconds}),
          });
          const data=await response.json().catch(()=>null);
          if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to update a lesson video.','تعذر تحديث فيديو الدرس.'));
        }
      }
      for(let index=0;index<newVideos.length;index++){
        const video=newVideos[index];
        const parts=video.duration.trim()?video.duration.split(':').map(Number):[];
        const durationSeconds=parts.length===2?parts[0]*60+parts[1]:parts.length===1?parts[0]:null;
        const response=await authenticatedFetch(`${API_BASE}/lessons/${id}/videos`,{
          method:'POST',headers:tokenHeaders,
          body:JSON.stringify({title:video.title.trim(),video_url:video.url?.trim(),duration_seconds:durationSeconds,position:videoRows.length+index+1}),
        });
        const data=await response.json().catch(()=>null);
        if(!response.ok||!data?.video?.id)throw new Error(data?.message||tx(lang,'Package saved, but a video could not be added. Retry saving to continue.','حُفظت الباقة، لكن تعذرت إضافة فيديو. أعد الحفظ للمتابعة.'));
        const videoIndex=draft.videos.indexOf(video);
        setDraft(current=>({...current,videos:current.videos.map((item,index)=>index===videoIndex?{...item,id:data.video.id}:item)}));
      }
      if(publish){
        const response=await authenticatedFetch(`${API_BASE}/lessons/${id}/publish`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`}});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to publish package.','تعذر نشر الباقة.'));
      }
      const currentStatus=publish?'Published':packageStatus==='published'?'Published':'Draft';
      const updated={id:String(id),title:payload.title,subject:payload.subject,grade:'',price:payload.price,sales:0,status:currentStatus as 'Published'|'Draft',videos:videoRows.length+newVideos.length,updated:'',color:'violet',description:payload.description,language:draft.language};
      setPackages(existing=>existing.some(item=>item.id===String(id)?true:false)?existing.map(item=>item.id===String(id)?updated:item):[updated,...existing]);
      navigate('/teacher/packages');
    }catch(saveError){
      setError(saveError instanceof Error?saveError.message:tx(lang,'Unable to save package.','تعذر حفظ الباقة.'));
    }finally{setSaving(false);}
  }

  return <div className="wizard-page">
    <button className="inline-link" onClick={()=>navigate('/teacher/packages')}><ArrowLeft/>{tx(lang,'Back to packages','العودة إلى الباقات')}</button>
    <div className="wizard-title"><span className="eyebrow muted-eyebrow">{tx(lang,'TEACHER WORKSPACE','مساحة المدرّس')}</span><h1>{packageId?tx(lang,'Edit lesson package','تعديل باقة الدروس'):tx(lang,'Create lesson package','إنشاء باقة دروس')}</h1><p>{tx(lang,'Package details and hosted lesson videos are saved to your account.','يتم حفظ تفاصيل الباقة وفيديوهات الدروس المستضافة في حسابك.')}</p></div>
    {loading?<div className="panel">{tx(lang,'Loading package…','جارٍ تحميل الباقة…')}</div>:<div className="wizard-card">
      {error&&<p role="alert" className="inline-error">{error}</p>}
      <div className="wizard-form-grid">
        <Field label={tx(lang,'Package title','عنوان الباقة')} value={draft.title} onChange={value=>setField('title',value)} required disabled={preview}/>
        <label className="field"><span>{tx(lang,'Subject','المادة')}</span><select disabled={preview} value={draft.subject} onChange={event=>setField('subject',event.target.value)}>{['Physics','Mathematics','Biology','Chemistry','Languages','History'].map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="field"><span>{tx(lang,'Language','اللغة')}</span><select disabled={preview} value={draft.language} onChange={event=>setField('language',event.target.value)}><option>English</option><option>العربية</option></select></label>
        <label className="field price-field"><span>{tx(lang,'Price in EGP','السعر بالجنيه المصري')}</span><input disabled={preview} type="number" min="0.01" step="0.01" value={draft.price} onChange={event=>setField('price',Number(event.target.value))}/></label>
        <label className="field field-wide"><span>{tx(lang,'Description','الوصف')}</span><textarea disabled={preview} value={draft.description} onChange={event=>setField('description',event.target.value)}/></label>
      </div>
      <h2>{tx(lang,'Lesson videos','فيديوهات الدروس')}</h2>
      {draft.videos.map((video,index)=><div className="video-editor" key={video.id??index}><div className="video-editor-head"><span><Video size={15}/>{tx(lang,'Video','فيديو')} {index+1}{video.id?` · ${tx(lang,'Saved','محفوظ')}`:''}</span></div><div className="wizard-form-grid"><Field label={tx(lang,'Video title','عنوان الفيديو')} value={video.title} onChange={value=>updateVideo(index,'title',value)} required disabled={preview||Boolean(video.id&&packageStatus!=='draft')}/><Field label={tx(lang,'Duration (minutes:seconds)','المدة (دقائق:ثوانٍ)')} value={video.duration} onChange={value=>updateVideo(index,'duration',value)} disabled={preview||Boolean(video.id&&packageStatus!=='draft')}/><Field label={tx(lang,'Hosted video URL','رابط فيديو مستضاف')} value={video.url??''} onChange={value=>updateVideo(index,'url',value)} disabled={preview||Boolean(video.id&&packageStatus!=='draft')}/></div></div>)}
      {!preview&&packageStatus==='draft'&&<button className="button button-outline" onClick={()=>setDraft(current=>({...current,videos:[...current.videos,{title:'',description:'',duration:'',url:''}]}))}><Plus size={15}/>{tx(lang,'Add video','أضف فيديو')}</button>}
      {!preview&&<div className="wizard-final-actions"><button className="button button-outline" disabled={saving} onClick={()=>savePackage(false)}>{saving?tx(lang,'Saving…','جارٍ الحفظ…'):packageStatus==='published'?tx(lang,'Update package','تحديث الباقة'):tx(lang,'Save draft','حفظ كمسودة')}</button>{packageStatus==='draft'&&<button className="button button-primary" disabled={saving} onClick={()=>savePackage(true)}>{saving?tx(lang,'Publishing…','جارٍ النشر…'):tx(lang,'Publish package','نشر الباقة')}</button>}</div>}
      {!preview&&<p className="muted-copy">{tx(lang,'Only the fields and video URLs supported by the current database are collected. Video uploads, resources, and grade-level fields are not configured.','يتم جمع الحقول وروابط الفيديو المدعومة في قاعدة البيانات فقط. رفع الفيديو والموارد والصف الدراسي غير مهيأ.')}</p>}
    </div>}
  </div>;
}

type AdminTeacherApplication = {
  id: number | string;
  name: string;
  email: string;
  specialization: string;
  bio: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

function AdminApplications({lang,route}:{lang:AppLang;route:string}) {
  const [applications,setApplications]=useState<AdminTeacherApplication[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [pendingId,setPendingId]=useState<string|null>(null);
  const [reloadKey,setReloadKey]=useState(0);
  const ar=lang==='ar';

  useEffect(()=>{
    let active=true;
    async function loadApplications(){
      setLoading(true);
      setError('');
      const token=localStorage.getItem('bayenly_token');
      if(!token){
        if(active){setError(tx(lang,'Sign in with an admin account to review applications.','سجّل الدخول بحساب مسؤول لمراجعة الطلبات.'));setLoading(false);}
        return;
      }
      try{
        const response=await authenticatedFetch(`${API_BASE}/admin/teacher-applications`,{headers:{Authorization:`Bearer ${token}`}});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||tx(lang,'Unable to retrieve teacher applications.','تعذر تحميل طلبات المدرسين.'));
        if(!Array.isArray(data?.applications))throw new Error(tx(lang,'The server returned invalid application data.','أعاد الخادم بيانات طلبات غير صالحة.'));
        if(active)setApplications(data.applications);
      }catch(loadError){
        if(active)setError(loadError instanceof Error?loadError.message:tx(lang,'Unable to retrieve teacher applications.','تعذر تحميل طلبات المدرسين.'));
      }finally{if(active)setLoading(false);}
    }
    void loadApplications();
    return ()=>{active=false;};
  },[lang,route,reloadKey]);

  async function review(application:AdminTeacherApplication,status:'approved'|'rejected'){
    setPendingId(String(application.id));
    setError('');
    try{
      const token=localStorage.getItem('bayenly_token');
      const response=await authenticatedFetch(`${API_BASE}/admin/teacher-applications/${application.id}`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({status}),
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.application)throw new Error(data?.message||tx(lang,'Unable to update teacher application.','تعذر تحديث طلب المدرس.'));
      setApplications(current=>current.map(item=>String(item.id)===String(data.application.id)?{...item,...data.application}:item));
    }catch(reviewError){
      setError(reviewError instanceof Error?reviewError.message:tx(lang,'Unable to update teacher application.','تعذر تحديث طلب المدرس.'));
    }finally{setPendingId(null);}
  }

  return <section className="workspace-content">
    <div className="panel-heading flow-panel-heading"><div><h1>{tx(lang,'Teacher applications','طلبات المدرسين')}</h1><p>{tx(lang,'Only an admin decision changes an applicant’s account role.','قرار المسؤول وحده يغيّر دور حساب المتقدم.')}</p></div><button className="button button-outline" onClick={()=>setReloadKey(value=>value+1)}>{tx(lang,'Refresh','تحديث')}</button></div>
    {error&&<div className="inline-error" role="alert">{error}</div>}
    {loading?<div className="panel" role="status">{tx(lang,'Loading applications…','جارٍ تحميل الطلبات…')}</div>:applications.length===0?<div className="empty-state"><strong>{tx(lang,'No teacher applications yet.','لا توجد طلبات تدريس حتى الآن.')}</strong></div>:applications.map(application=><article className="panel" key={application.id} style={{marginBottom:16}}>
      <div className="panel-heading"><div><h2>{application.name}</h2><p>{application.email} · {application.specialization}</p></div><span className={`status-pill ${application.status==='approved'?'good':application.status==='pending'?'review':'neutral'}`}>{application.status}</span></div>
      <p>{application.bio}</p>
      {application.status==='pending'&&<div className="teacher-package-actions">
        <button className="button button-outline" disabled={pendingId===String(application.id)} onClick={()=>void review(application,'rejected')}>{tx(lang,'Reject application','رفض الطلب')}</button>
        <button className="button button-primary" disabled={pendingId===String(application.id)} onClick={()=>void review(application,'approved')}>{pendingId===String(application.id)?tx(lang,'Saving…','جارٍ الحفظ…'):tx(lang,'Approve and grant teacher access','الموافقة ومنح صلاحية المدرّس')}</button>
      </div>}
    </article>)}
  </section>;
}

function AdminUnavailable({lang}:{lang:AppLang}) {
  return <div className="flow-empty not-found"><h1>{tx(lang,'Unavailable','غير متاح')}</h1><p>{tx(lang,'This administrative workflow is not connected to a persistent backend yet. No action was performed.','مسار الإدارة هذا غير متصل بقاعدة البيانات بعد. لم يتم تنفيذ أي إجراء.')}</p></div>;
}

function CheckoutUnavailable({lang,navigate}:{lang:AppLang;navigate:(path:string)=>void}) {
  return <div className="flow-empty not-found">
    <h1>{tx(lang,'Checkout is unavailable','الشراء غير متاح حاليًا')}</h1>
    <p>{tx(lang,'Payments are not configured yet. No order or charge was created.','لم يتم إعداد الدفع بعد. لم يتم إنشاء طلب أو خصم أي مبلغ.')}</p>
    <button className="button button-primary" onClick={()=>navigate('/')}>{tx(lang,'Back to marketplace','العودة إلى السوق')}</button>
  </div>;
}

function AdminWorkspace({route,lang,navigate}:{route:string;lang:AppLang;navigate:(p:string)=>void}) {
 const sec=pathSection(route),[teachers,setTeachers]=useState(adminQueue.teachers),[packages,setPackages]=useState(adminQueue.packages),[modal,setModal]=useState<{name:string;act:()=>void}|null>(null),[toast,setToast]=useState('');
 const sections=[{label:T[lang].overview,path:'/admin/overview',icon:LayoutDashboard},{label:tx(lang,'Teacher review','مراجعة المدرسين'),path:'/admin/teachers',icon:Users},{label:tx(lang,'Package moderation','مراجعة الباقات'),path:'/admin/packages',icon:Package},{label:tx(lang,'Orders & payments','الطلبات والمدفوعات'),path:'/admin/orders',icon:ShoppingBag},{label:tx(lang,'Refund requests','طلبات الاسترداد'),path:'/admin/refunds',icon:CreditCard},{label:tx(lang,'Teacher payouts','مستحقات المدرسين'),path:'/admin/payouts',icon:Wallet}];
 const ask=(name:string,act:()=>void)=>setModal({name,act});let body:ReactNode;
 if(sec==='overview')body=<><div className="teacher-metric-grid"><Summary icon={Users} label={tx(lang,'Teacher reviews pending','مدرسون بانتظار المراجعة')} value={String(teachers.length)} color="violet"/><Summary icon={Package} label={tx(lang,'Packages to review','باقات للمراجعة')} value={String(packages.length)} color="coral"/><Summary icon={ShoppingBag} label={tx(lang,'Demo orders','طلبات تجريبية')} value="18" color="lime"/><Summary icon={CreditCard} label={tx(lang,'Refund requests','طلبات الاسترداد')} value="2" color="blue"/></div><div className="panel admin-note"><ShieldCheck size={20}/><div><strong>{tx(lang,'Admin prototype only','نموذج إدارة تجريبي فقط')}</strong><p>{tx(lang,'No real administrative access or financial action is available here.','لا توجد صلاحيات إدارية حقيقية أو إجراءات مالية.')}</p></div></div></>;
 else if(sec==='teachers')body=<Moderation title={tx(lang,'Teacher verification queue','قائمة توثيق المدرسين')} records={teachers.map(x=>({name:x.name,meta:x.subject+' · '+x.submitted}))} lang={lang} act={(i,decision)=>ask(decision==='approve'?tx(lang,'Approve teacher?','اعتماد المدرس؟'):tx(lang,'Reject teacher review?','رفض توثيق المدرس؟'),()=>{setTeachers(a=>a.filter((_,n)=>n!==i));setModal(null);setToast(tx(lang,'Recorded in temporary demo state.','تم التسجيل في الحالة التجريبية.'))})}/>;
 else if(sec==='packages')body=<Moderation title={tx(lang,'Package moderation queue','قائمة مراجعة الباقات')} records={packages.map(x=>({name:x.title,meta:x.teacher+' · '+x.subject+' · '+x.submitted}))} lang={lang} act={(i,decision)=>ask(decision==='approve'?tx(lang,'Approve package?','اعتماد الباقة؟'):tx(lang,'Reject package?','رفض الباقة؟'),()=>{setPackages(a=>a.filter((_,n)=>n!==i));setModal(null);setToast(tx(lang,'Recorded in temporary demo state.','تم التسجيل في الحالة التجريبية.'))})}/>;
 else if(sec==='orders')body=<><h2>{tx(lang,'Orders and payment status','الطلبات وحالة الدفع')}</h2><p className="muted-copy">{tx(lang,'Illustrative records. No provider is connected.','سجلات توضيحية. لا يوجد مزود دفع متصل.')}</p><DataTable headers={['REFERENCE','BUYER','PACKAGE','AMOUNT','STATUS'].map((x,i)=>tx(lang,x,['الرقم','المشتري','الباقة','المبلغ','الحالة'][i]))} rows={adminQueue.orders.map(x=>[x.ref,x.buyer,x.item,'EGP '+x.amount,x.state])}/></>;
 else if(sec==='refunds')body=<><h2>{tx(lang,'Refund requests','طلبات الاسترداد')}</h2><Moderation title="" records={[{name:'REFUND-DEMO-04 · Nour Khaled',meta:'Algebra, Made Simple · EGP 140'},{name:'REFUND-DEMO-03 · Hassan Ali',meta:'Newton’s Laws · EGP 180'}]} lang={lang} act={()=>ask(tx(lang,'Mark request reviewed?','تحديد الطلب كمراجع؟'),()=>{setModal(null);setToast(tx(lang,'Reviewed locally; no refund was issued.','تمت المراجعة محليًا؛ لم يصدر أي استرداد.'))})}/></>;
 else if(sec==='payouts')body=<><h2>{tx(lang,'Teacher payout review','مراجعة مستحقات المدرسين')}</h2><p className="fee-note"><ShieldCheck size={15}/>{tx(lang,'No money transfers can be made in this prototype.','لا يمكن تنفيذ تحويلات مالية في هذا النموذج.')}</p><Moderation title="" records={[{name:'PAYOUT-DEMO-018 · Omar Hassan',meta:'Demo amount · EGP 2,450 · Pending'},{name:'PAYOUT-DEMO-017 · Mariam Adel',meta:'Demo amount · EGP 1,680 · Pending'}]} lang={lang} act={()=>ask(tx(lang,'Mark payout reviewed?','تحديد المستحقات كمراجعة؟'),()=>{setModal(null);setToast(tx(lang,'Marked reviewed locally; no payout was made.','تم التحديد محليًا؛ لم يتم دفع أي مبلغ.'))})}/></>;
 else body=<Empty icon={CircleHelp} title={tx(lang,'Section not found','القسم غير موجود')} text={tx(lang,'Choose a section from this workspace.','اختر قسمًا من مساحة العمل.')} button={T[lang].overview} action={()=>navigate('/admin/overview')}/>;
 return <><WorkspaceShell lang={lang} title={tx(lang,'Admin Prototype','نموذج الإدارة')} sections={sections} active={route} navigate={navigate}><div className="workspace-content">{toast&&<div className="inline-success"><Check size={15}/>{toast}</div>}{body}</div></WorkspaceShell>{modal&&<Modal title={modal.name} message={tx(lang,'This changes only this temporary view. No real teacher, package, or payment is affected.','سيغيّر هذا العرض المؤقت فقط. لن يتأثر مدرس أو باقة أو دفع حقيقي.')} cancel={T[lang].cancel} confirm={T[lang].confirm} onCancel={()=>setModal(null)} onConfirm={modal.act}/>}</>;
}
function Moderation({title,records,lang,act}:{title:string;records:{name:string;meta:string}[];lang:AppLang;act:(i:number,decision:'reject'|'approve')=>void}){return <section className="queue-block">{title&&<h2>{title}</h2>}{records.length?records.map((r,i)=><div className="review-row" key={r.name}><div><strong>{r.name}</strong><small>{r.meta}</small></div><div><button className="button button-outline" onClick={()=>act(i,'reject')}>{tx(lang,'Reject / review','رفض / مراجعة')}</button><button className="button button-primary" onClick={()=>act(i,'approve')}>{tx(lang,'Approve / mark reviewed','اعتماد / تحديد كمراجع')}</button></div></div>):<p className="muted-copy">{tx(lang,'Queue clear in the demo.','قائمة المراجعة فارغة في النموذج.')}</p>}</section>}
function Modal({title,message,cancel,confirm,onCancel,onConfirm}:{title:string;message:string;cancel:string;confirm:string;onCancel:()=>void;onConfirm:()=>void}){return <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onCancel} aria-label="Close"><X size={17}/></button><span className="modal-mark"><ShieldCheck size={21}/></span><h2 id="modal-title">{title}</h2><p>{message}</p><div><button className="button button-outline" onClick={onCancel}>{cancel}</button><button className="button button-primary" onClick={onConfirm}>{confirm}</button></div></section></div>}
function NotFound({lang,navigate}:{lang:AppLang;navigate:(p:string)=>void}){return <div className="flow-empty not-found"><span>404</span><h1>{tx(lang,'This page wandered off.','هذه الصفحة غير موجودة.')}</h1><p>{tx(lang,'The address may be incomplete or out of date.','قد يكون الرابط غير مكتمل أو قديمًا.')}</p><button className="button button-primary" onClick={()=>navigate('/')}>{tx(lang,'Go to marketplace','العودة إلى السوق')}</button></div>}
