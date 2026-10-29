
import { useEffect, useState } from 'react';
import Marketplace from './Marketplace';
import Flows, { type PackageDraft } from './Flows';
import type { Lesson } from './data';
import type { TeacherPackage } from './mockRepository';
import { API_BASE, clearAuthSession, readAuthToken, type AuthUser } from './api';

export type AppLang = 'en' | 'ar';

const emptyDraft: PackageDraft = {
  title: '',
  description: '',
  subject: 'Physics',
  grade: 'Grade 10',
  language: 'English',
  objectives: '',
  price: 150,
  videos: [{ title: '', description: '', duration: '10:00' }],
  resources: [],
};

const emptyLesson: Lesson = {
  id: 0,
  title: '',
  teacher: '',
  subject: '',
  grade: '',
  videos: 0,
  duration: '',
  price: 0,
  rating: '',
  color: 'violet',
  art: '',
  tag: '',
};

export default function App() {
  const [route, setRoute] = useState(
    window.location.pathname + window.location.search || '/'
  );

  const [lang, setLangState] = useState<AppLang>(() => {
    try {
      return localStorage.getItem('bayenly_language') === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });
  const [authRevision, setAuthRevision] = useState(0);
  const [access, setAccess] = useState<{
    route: string;
    status: 'checking' | 'allowed' | 'public' | 'error';
    user: AuthUser | null;
    message?: string;
  }>({ route: '', status: 'checking', user: null });
  const [draft, setDraft] = useState<PackageDraft>(emptyDraft);
  const [teacherPackageState, setTeacherPackageState] =
    useState<TeacherPackage[]>([]);
  const [orderState, setOrderState] = useState<
    'success' | 'pending' | 'failed'
  >('success');

  const [orderRef] = useState(() =>
    import.meta.env.DEV ? `BYN-DEMO-${Math.floor(24000 + Math.random() * 899)}` : ''
  );

  const nav = (path: string) => {
    const currentPath =
      window.location.pathname + window.location.search;

    if (path !== currentPath) {
      window.history.pushState({}, '', path);
    }

    setRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setLang = (language: AppLang) => {
    setLangState(language);
    try {
      localStorage.setItem('bayenly_language', language);
    } catch {
      // Language remains available for the current page if storage is unavailable.
    }
  };

  useEffect(() => {
    const back = () => {
      setRoute(
        window.location.pathname + window.location.search || '/'
      );
    };

    window.addEventListener('popstate', back);

    return () => {
      window.removeEventListener('popstate', back);
    };
  }, []);

  useEffect(() => {
    const changed = () => setAuthRevision((revision) => revision + 1);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'bayenly_token' || event.key === 'bayenly_user') changed();
      if (event.key === 'bayenly_language' && event.newValue === 'ar') setLangState('ar');
      if (event.key === 'bayenly_language' && event.newValue === 'en') setLangState('en');
    };
    window.addEventListener('bayyenly:auth-changed', changed);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener('bayyenly:auth-changed', changed);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const path = window.location.pathname;
    const requiredRole = requiredRoleForPath(path);
    const token = readAuthToken();

    if (!token) {
      setAccess({ route: path, status: 'public', user: null });
      if (requiredRole) nav('/login');
      return () => { active = false; };
    }

    setAccess({ route: path, status: 'checking', user: null });

    async function verifySession() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401) {
            clearAuthSession();
            if (requiredRole) nav('/login');
            else if (active) setAccess({ route: path, status: 'public', user: null });
            return;
          }
          throw new Error(data?.message || 'Unable to verify your account.');
        }

        const user = data?.user as AuthUser | undefined;
        if (
          !user ||
          (user.role !== 'student' && user.role !== 'teacher' && user.role !== 'admin')
        ) {
          throw new Error('The server returned an invalid account.');
        }

        if (!active) return;
        try {
          localStorage.setItem('bayenly_user', JSON.stringify(user));
        } catch {
          // The verified user remains available in application state.
        }
        setAccess({ route: path, status: 'allowed', user });

        if (requiredRole && user.role !== requiredRole) {
          nav(homeForRole(user.role));
        }
      } catch (error) {
        if (!active) return;
        setAccess({
          route: path,
          status: requiredRole ? 'error' : 'public',
          user: null,
          message: error instanceof Error ? error.message : 'Unable to verify your account.',
        });
      }
    }

    void verifySession();
    return () => { active = false; };
  }, [route, authRevision]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const isLessonRoute = /^\/lesson\/[^/]+$/.test(
    window.location.pathname
  );
  const path = window.location.pathname;
  const requiredRole = requiredRoleForPath(path);

  if (requiredRole && access.route !== path) {
    return <AccessMessage lang={lang} message="Checking your account…" />;
  }

  if (requiredRole && access.status === 'checking') {
    return <AccessMessage lang={lang} message="Checking your account…" />;
  }

  if (requiredRole && access.status === 'error') {
    return (
      <AccessMessage
        lang={lang}
        message={access.message || 'Unable to verify your account.'}
        onRetry={() => setAuthRevision((revision) => revision + 1)}
      />
    );
  }

  if (requiredRole && (access.status !== 'allowed' || access.user?.role !== requiredRole)) {
    return <AccessMessage lang={lang} message="Redirecting to sign in…" />;
  }

  if (route === '/' || isLessonRoute) {
    return (
      <Marketplace
        key={isLessonRoute ? window.location.pathname : 'home'}
        route={window.location.pathname}
        lang={lang}
        setLang={setLang}
        onNavigate={nav}
        authUser={access.user}
        onSignOut={clearAuthSession}
      />
    );
  }

  return (
    <Flows
      route={route}
      lang={lang}
      setLang={setLang}
      navigate={nav}
      draft={draft}
      setDraft={setDraft}
      packages={teacherPackageState}
      setPackages={setTeacherPackageState}
      orderState={orderState}
      setOrderState={setOrderState}
      orderRef={orderRef}
      lesson={emptyLesson}
      authUser={access.user!}
    />
  );
}

function requiredRoleForPath(path: string): AuthUser['role'] | null {
  if (path === '/teacher/apply') return 'student';
  if (path.startsWith('/student/') || path.startsWith('/checkout') || path.startsWith('/learn/')) {
    return 'student';
  }
  if (path.startsWith('/teacher/')) return 'teacher';
  if (path.startsWith('/admin/')) return 'admin';
  return null;
}

function homeForRole(role: AuthUser['role']): string {
  return role === 'admin'
    ? '/admin/overview'
    : role === 'teacher'
      ? '/teacher/overview'
      : '/student/overview';
}

function AccessMessage({
  lang,
  message,
  onRetry,
}: {
  lang: AppLang;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="flow-empty not-found" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <p role="status">{message}</p>
      {onRetry && <button className="button button-primary" onClick={onRetry}>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>}
    </main>
  );
}
