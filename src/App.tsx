
import { useEffect, useState } from 'react';
import Marketplace from './Marketplace';
import Flows, { type PackageDraft } from './Flows';
import { lessons } from './data';
import { teacherPackages as initialTeacherPackages } from './mockRepository';

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

export default function App() {
  const [route, setRoute] = useState(
    window.location.pathname + window.location.search || '/'
  );

  const [lang, setLang] = useState<AppLang>('en');
  const [draft, setDraft] = useState<PackageDraft>(emptyDraft);
  const [teacherPackageState, setTeacherPackageState] =
    useState(initialTeacherPackages);
  const [orderState, setOrderState] = useState<
    'success' | 'pending' | 'failed'
  >('success');

  const [orderRef] = useState(
    () => `BYN-DEMO-${Math.floor(24000 + Math.random() * 899)}`
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
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const isLessonRoute = /^\/lesson\/[^/]+$/.test(
    window.location.pathname
  );

  if (route === '/' || isLessonRoute) {
    return (
      <Marketplace
        key={isLessonRoute ? window.location.pathname : 'home'}
        route={window.location.pathname}
        lang={lang}
        setLang={setLang}
        onNavigate={nav}
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
      lesson={lessons[0]}
    />
  );
}
