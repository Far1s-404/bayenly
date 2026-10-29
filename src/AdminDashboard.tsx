import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  Archive,
  LayoutDashboard,
  LogOut,
  Package,
  Shield,
  ShoppingBag,
  User,
  Users,
  Video,
} from 'lucide-react';
import type { AppLang } from './App';
import { apiRequest, clearAuthSession, type AuthUser } from './api';

type AdminRoute =
  | 'overview'
  | 'teachers'
  | 'users'
  | 'packages'
  | 'videos'
  | 'orders'
  | 'audit';

type Metrics = {
  users: number;
  suspended_users: number;
  published_packages: number;
  active_videos: number;
  pending_purchases: number;
  paid_purchases: number;
  pending_applications: number;
};

type AdminUser = {
  id: number | string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
  suspended_at: string | null;
};

type AdminPackage = {
  id: number | string;
  title: string;
  subject: string;
  status: 'draft' | 'published' | 'archived';
  price: string | number;
  teacher_name: string;
  active_video_count: number;
  archived_video_count: number;
};

type AdminVideo = {
  id: number | string;
  title: string;
  package_id: number | string;
  package_title: string;
  teacher_name: string;
  archived_at: string | null;
};

type AdminOrder = {
  id: number | string;
  student_name: string;
  package_title: string;
  amount: string | number;
  status: string;
  created_at: string;
};

type TeacherApplication = {
  id: number | string;
  name: string;
  email: string;
  specialization: string;
  bio: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type AuditEntry = {
  id: number | string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number | string;
  created_at: string;
};

type AdminPayload =
  | { kind: 'overview'; metrics: Metrics }
  | { kind: 'users'; users: AdminUser[] }
  | { kind: 'packages'; packages: AdminPackage[] }
  | { kind: 'videos'; videos: AdminVideo[] }
  | { kind: 'orders'; orders: AdminOrder[] }
  | { kind: 'teachers'; applications: TeacherApplication[] }
  | { kind: 'audit'; entries: AuditEntry[] };

const routeNames: AdminRoute[] = [
  'overview',
  'teachers',
  'users',
  'packages',
  'videos',
  'orders',
  'audit',
];

const labels = {
  en: {
    overview: 'Overview',
    teachers: 'Teacher applications',
    users: 'Accounts',
    packages: 'Packages',
    videos: 'Videos',
    orders: 'Purchases',
    audit: 'Audit log',
    adminSpace: 'Admin workspace',
    loading: 'Loading admin data…',
    retry: 'Retry',
    usersTotal: 'Accounts',
    suspended: 'Suspended accounts',
    published: 'Published packages',
    videosActive: 'Available videos',
    pendingPurchases: 'Pending purchases',
    paidPurchases: 'Paid purchases',
    pendingApplications: 'Pending applications',
    noRows: 'No records found.',
    refresh: 'Refresh',
    suspend: 'Suspend',
    restore: 'Restore',
    archive: 'Archive',
    approve: 'Approve',
    reject: 'Reject',
    pending: 'Pending',
    status: 'Status',
    account: 'Account',
    role: 'Role',
    joined: 'Joined',
    package: 'Package',
    teacher: 'Teacher',
    videosCount: 'Videos',
    price: 'Price',
    applicant: 'Applicant',
    specialization: 'Specialization',
    purchase: 'Purchase',
    buyer: 'Buyer',
    amount: 'Amount',
    date: 'Date',
    action: 'Action',
    target: 'Target',
    admin: 'Admin',
    workspace: 'Workspace',
    signOut: 'Sign out',
    adminRestriction: 'Administrator accounts cannot be suspended here.',
    confirmation: 'This change is reversible. Continue?',
    restorePackageNote: 'Restored packages return as drafts and must be republished.',
  },
  ar: {
    overview: 'نظرة عامة',
    teachers: 'طلبات المدرسين',
    users: 'الحسابات',
    packages: 'الباقات',
    videos: 'الفيديوهات',
    orders: 'المشتريات',
    audit: 'سجل الإجراءات',
    adminSpace: 'مساحة الإدارة',
    loading: 'جارٍ تحميل بيانات الإدارة…',
    retry: 'إعادة المحاولة',
    usersTotal: 'الحسابات',
    suspended: 'الحسابات الموقوفة',
    published: 'الباقات المنشورة',
    videosActive: 'الفيديوهات المتاحة',
    pendingPurchases: 'المشتريات المعلّقة',
    paidPurchases: 'المشتريات المدفوعة',
    pendingApplications: 'الطلبات المعلّقة',
    noRows: 'لا توجد سجلات.',
    refresh: 'تحديث',
    suspend: 'إيقاف',
    restore: 'استعادة',
    archive: 'أرشفة',
    approve: 'موافقة',
    reject: 'رفض',
    pending: 'معلّق',
    status: 'الحالة',
    account: 'الحساب',
    role: 'الدور',
    joined: 'تاريخ الانضمام',
    package: 'الباقة',
    teacher: 'المدرس',
    videosCount: 'الفيديوهات',
    price: 'السعر',
    applicant: 'المتقدم',
    specialization: 'التخصص',
    purchase: 'الشراء',
    buyer: 'المشتري',
    amount: 'المبلغ',
    date: 'التاريخ',
    action: 'الإجراء',
    target: 'العنصر',
    admin: 'المسؤول',
    workspace: 'مساحة العمل',
    signOut: 'تسجيل الخروج',
    adminRestriction: 'لا يمكن إيقاف حسابات المسؤولين من هنا.',
    confirmation: 'هذا التغيير قابل للاستعادة. هل تريد المتابعة؟',
    restorePackageNote: 'تعود الباقة كمسودة ويجب نشرها مجددًا.',
  },
};

export default function AdminDashboard({
  route,
  lang,
  navigate,
  authUser,
}: {
  route: string;
  lang: AppLang;
  navigate: (path: string) => void;
  authUser: AuthUser;
}) {
  const section = route.split('/').filter(Boolean).at(-1) as AdminRoute;
  const validSection = routeNames.includes(section) ? section : 'overview';
  const text = labels[lang];
  const rtl = lang === 'ar';
  const [payload, setPayload] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busyKey, setBusyKey] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    async function load() {
      try {
        let next: AdminPayload;
        if (validSection === 'overview') {
          const result = await apiRequest<{ metrics: Metrics }>('/admin/overview');
          next = { kind: 'overview', metrics: result.metrics };
        } else if (validSection === 'users') {
          const result = await apiRequest<{ users: AdminUser[] }>('/admin/users');
          next = { kind: 'users', users: result.users };
        } else if (validSection === 'packages') {
          const result = await apiRequest<{ packages: AdminPackage[] }>('/admin/packages');
          next = { kind: 'packages', packages: result.packages };
        } else if (validSection === 'videos') {
          const result = await apiRequest<{ videos: AdminVideo[] }>('/admin/videos');
          next = { kind: 'videos', videos: result.videos };
        } else if (validSection === 'orders') {
          const result = await apiRequest<{ orders: AdminOrder[] }>('/admin/orders');
          next = { kind: 'orders', orders: result.orders };
        } else if (validSection === 'teachers') {
          const result = await apiRequest<{ applications: TeacherApplication[] }>('/admin/teacher-applications');
          next = { kind: 'teachers', applications: result.applications };
        } else {
          const result = await apiRequest<{ entries: AuditEntry[] }>('/admin/audit');
          next = { kind: 'audit', entries: result.entries };
        }
        if (active) setPayload(next);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [validSection, reloadKey]);

  async function update(path: string, method: 'PATCH', body: unknown, key: string) {
    setBusyKey(key);
    setError('');
    try {
      await apiRequest(path, { method, body: JSON.stringify(body) });
      setReloadKey((value) => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to complete admin action.');
    } finally {
      setBusyKey('');
    }
  }

  const nav = [
    { key: 'overview', icon: LayoutDashboard },
    { key: 'teachers', icon: Users },
    { key: 'users', icon: User },
    { key: 'packages', icon: Package },
    { key: 'videos', icon: Video },
    { key: 'orders', icon: ShoppingBag },
    { key: 'audit', icon: Activity },
  ] as const;
  const goTo = (key: AdminRoute) => navigate(`/admin/${key}`);

  return (
    <div className={`workspace-shell admin-console${rtl ? ' rtl' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
      <aside className="workspace-sidebar">
        <button className="brand" onClick={() => navigate('/')} aria-label="Bayyenly home">
          <span className="brand-mark">ب</span><span>bayyenly<span className="brand-dot">.</span></span>
        </button>
        <div className="admin-console-user">
          <span className="admin-console-avatar">{authUser.name.slice(0, 1).toUpperCase()}</span>
          <span><strong>{authUser.name}</strong><small>{text.adminSpace}</small></span>
        </div>
        <nav aria-label={text.workspace}>
          {nav.map(({ key, icon: Icon }) => (
            <button key={key} className={validSection === key ? 'active' : ''} onClick={() => goTo(key)}>
              <Icon size={17} />{text[key]}
            </button>
          ))}
        </nav>
        <button className="side-return" onClick={() => { clearAuthSession(); navigate('/'); }}>
          <LogOut size={16} />{text.signOut}
        </button>
      </aside>
      <main className="workspace-main">
        <header className="workspace-heading">
          <div><span className="eyebrow muted-eyebrow">{text.adminSpace}</span><h1>{text[validSection]}</h1></div>
          <button className="button button-outline" onClick={() => setReloadKey((value) => value + 1)}>{text.refresh}</button>
        </header>
        <section className="workspace-content">
          {error && <div className="inline-error" role="alert">{error}</div>}
          {loading ? <div className="panel" role="status">{text.loading}</div> : payload && renderPayload(
            payload,
            text,
            String(authUser.id),
            busyKey,
            update,
          )}
        </section>
      </main>
    </div>
  );
}

function renderPayload(
  payload: AdminPayload,
  text: (typeof labels)['en'],
  currentAdminId: string,
  busyKey: string,
  update: (path: string, method: 'PATCH', body: unknown, key: string) => Promise<void>,
) {
  if (payload.kind === 'overview') {
    const metrics = [
      [Users, text.usersTotal, payload.metrics.users],
      [Shield, text.suspended, payload.metrics.suspended_users],
      [Package, text.published, payload.metrics.published_packages],
      [Video, text.videosActive, payload.metrics.active_videos],
      [ShoppingBag, text.pendingPurchases, payload.metrics.pending_purchases],
      [ShoppingBag, text.paidPurchases, payload.metrics.paid_purchases],
      [Users, text.pendingApplications, payload.metrics.pending_applications],
    ] as const;
    return <div className="admin-metric-grid">{metrics.map(([Icon, label, value]) => (
      <article className="admin-metric-card" key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></article>
    ))}</div>;
  }
  if (payload.kind === 'users') {
    return <DataTable headers={[text.account, text.role, text.joined, text.status, text.action]} rows={payload.users.map((user) => {
      const self = String(user.id) === currentAdminId;
      const protectedAdmin = user.role === 'admin';
      const suspended = Boolean(user.suspended_at);
      const key = `user-${user.id}`;
      return [
        <span><strong>{user.name}</strong><small>{user.email}</small></span>,
        user.role,
        formatDate(user.created_at),
        <Status value={suspended ? text.suspended : 'Active'} />,
        <button className="button button-outline admin-action-button" disabled={self || protectedAdmin || busyKey === key}
          title={protectedAdmin ? text.adminRestriction : undefined}
          onClick={() => {
            if (window.confirm(text.confirmation)) void update(`/admin/users/${user.id}/status`, 'PATCH', { suspended: !suspended }, key);
          }}>{busyKey === key ? '…' : suspended ? text.restore : text.suspend}</button>,
      ];
    })} empty={text.noRows} />;
  }
  if (payload.kind === 'packages') {
    return <DataTable headers={[text.package, text.teacher, text.videosCount, text.price, text.status, text.action]} rows={payload.packages.map((item) => {
      const archived = item.status === 'archived';
      const key = `package-${item.id}`;
      return [
        <span><strong>{item.title}</strong><small>{item.subject}</small></span>,
        item.teacher_name,
        `${item.active_video_count} active · ${item.archived_video_count} archived`,
        `EGP ${item.price}`,
        <Status value={item.status} />,
        <button className="button button-outline admin-action-button" disabled={busyKey === key}
          title={archived ? text.restorePackageNote : undefined}
          onClick={() => {
            if (window.confirm(text.confirmation)) void update(`/admin/packages/${item.id}/archive`, 'PATCH', { archived: !archived }, key);
          }}>{busyKey === key ? '…' : archived ? text.restore : text.archive}</button>,
      ];
    })} empty={text.noRows} />;
  }
  if (payload.kind === 'videos') {
    return <DataTable headers={[text.package, text.teacher, text.status, text.action]} rows={payload.videos.map((video) => {
      const archived = Boolean(video.archived_at);
      const key = `video-${video.id}`;
      return [
        <span><strong>{video.title}</strong><small>{video.package_title}</small></span>,
        video.teacher_name,
        <Status value={archived ? 'archived' : 'active'} />,
        <button className="button button-outline admin-action-button" disabled={busyKey === key}
          onClick={() => {
            if (window.confirm(text.confirmation)) void update(`/admin/videos/${video.id}/archive`, 'PATCH', { archived: !archived }, key);
          }}>{busyKey === key ? '…' : archived ? text.restore : text.archive}</button>,
      ];
    })} empty={text.noRows} />;
  }
  if (payload.kind === 'teachers') {
    return <div className="admin-card-list">{payload.applications.length ? payload.applications.map((application) => {
      const key = `application-${application.id}`;
      return <article className="panel admin-record" key={application.id}>
        <div><h2>{application.name}</h2><p>{application.email} · {application.specialization}</p><p>{application.bio}</p></div>
        <Status value={application.status} />
        {application.status === 'pending' && <div className="admin-record-actions">
          <button className="button button-outline" disabled={busyKey === key} onClick={() => void update(`/admin/teacher-applications/${application.id}`, 'PATCH', { status: 'rejected' }, key)}>{text.reject}</button>
          <button className="button button-primary" disabled={busyKey === key} onClick={() => void update(`/admin/teacher-applications/${application.id}`, 'PATCH', { status: 'approved' }, key)}>{text.approve}</button>
        </div>}
      </article>;
    }) : <EmptyState text={text.noRows} />}</div>;
  }
  if (payload.kind === 'orders') {
    return <DataTable headers={[text.purchase, text.buyer, text.package, text.amount, text.status, text.date]} rows={payload.orders.map((order) => [
      `#${order.id}`,
      order.student_name,
      order.package_title,
      `EGP ${order.amount}`,
      <Status value={order.status} />,
      formatDate(order.created_at),
    ])} empty={text.noRows} />;
  }
  return <DataTable headers={[text.date, text.admin, text.action, text.target]} rows={payload.entries.map((entry) => [
    formatDate(entry.created_at),
    entry.admin_name,
    entry.action,
    `${entry.target_type} #${entry.target_id}`,
  ])} empty={text.noRows} />;
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: (string | number | ReactNode)[][];
  empty: string;
}) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return <div className="data-table-wrap"><table className="flow-table admin-table">
    <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
    <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Status({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const style = normalized === 'active' || normalized === 'published' || normalized === 'approved' || normalized === 'paid'
    ? 'good'
    : normalized === 'pending'
      ? 'review'
      : 'neutral';
  return <span className={`status-pill ${style}`}>{value}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="panel admin-empty"><Archive size={20} /><span>{text}</span></div>;
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}
