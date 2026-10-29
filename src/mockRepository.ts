import { lessons, type Lesson } from './data';

export type PurchasedPackage = Lesson & { progress: number; lastAccessed: string; purchasedAt: string; orderRef: string; paymentStatus: 'Paid' };
export const studentPurchases: PurchasedPackage[] = import.meta.env.DEV ? [
  { ...lessons[0], progress: 42, lastAccessed: 'Today · 10:24 AM', purchasedAt: '18 Oct 2026', orderRef: 'BYN-DEMO-24018', paymentStatus: 'Paid' },
  { ...lessons[1], progress: 100, lastAccessed: 'Yesterday', purchasedAt: '03 Oct 2026', orderRef: 'BYN-DEMO-24003', paymentStatus: 'Paid' },
  { ...lessons[3], progress: 18, lastAccessed: '22 Oct 2026', purchasedAt: '21 Oct 2026', orderRef: 'BYN-DEMO-24021', paymentStatus: 'Paid' },
] : [];
export type TeacherPackage = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  price: number;
  sales: number;
  status: 'Published' | 'Under review' | 'Draft' | 'Archived';
  videos: number;
  updated: string;
  color: string;
  description?: string;
  objectives?: string;
  language?: string;
  resources?: string[];
  videoDetails?: { title: string; description: string; duration: string }[];
  thumbnail?: string;
};
export const teacherPackages: TeacherPackage[] = import.meta.env.DEV ? [
  { id: 'tp-1', title: "Newton's Laws of Motion", subject: 'Physics', grade: 'Grade 10', price: 180, sales: 74, status: 'Published' as const, videos: 8, updated: '24 Oct 2026', color: 'violet' },
  { id: 'tp-2', title: 'Algebra, Made Simple', subject: 'Mathematics', grade: 'Grade 9', price: 140, sales: 52, status: 'Published' as const, videos: 6, updated: '20 Oct 2026', color: 'coral' },
  { id: 'tp-3', title: 'The Cell: A Complete Guide', subject: 'Biology', grade: 'Grade 11', price: 220, sales: 0, status: 'Under review' as const, videos: 10, updated: '19 Oct 2026', color: 'lime' },
  { id: 'tp-4', title: 'Forces — first draft', subject: 'Physics', grade: 'Grade 10', price: 150, sales: 0, status: 'Draft' as const, videos: 2, updated: '16 Oct 2026', color: 'blue' },
] : [];
export const mediaLibrary = import.meta.env.DEV ? [
  { name: 'Newton’s First Law — Inertia.mp4', type: 'MP4 video', detail: '18:42 · 184 MB', uploaded: '24 Oct 2026', state: 'Ready' },
  { name: 'Motion — Quick Notes.pdf', type: 'PDF resource', detail: '8 pages · 1.2 MB', uploaded: '22 Oct 2026', state: 'Ready' },
  { name: 'F = ma worked examples.mp4', type: 'MP4 video', detail: 'Processing demo · 96 MB', uploaded: 'Today', state: 'Processing' },
] : [];
export const adminQueue = import.meta.env.DEV ? {
  teachers: [{ name: 'Hana Fathy', subject: 'History', submitted: '24 Oct 2026' }, { name: 'Karim Mostafa', subject: 'Chemistry', submitted: '23 Oct 2026' }],
  packages: [{ title: 'Organic Chemistry: Reactions', teacher: 'Karim Mostafa', subject: 'Chemistry', submitted: '23 Oct 2026' }, { title: 'Ancient Egypt: The New Kingdom', teacher: 'Hana Fathy', subject: 'History', submitted: '24 Oct 2026' }],
  orders: [{ ref: 'BYN-DEMO-24018', buyer: 'Sara Ahmed', item: "Newton's Laws of Motion", amount: 180, state: 'Demo paid' }, { ref: 'BYN-DEMO-24017', buyer: 'Omar Farid', item: 'Algebra, Made Simple', amount: 140, state: 'Pending demo' }],
} : { teachers: [], packages: [], orders: [] };
