export type Lesson = { id: number; title: string; teacher: string; subject: string; grade: string; videos: number; duration: string; price: number; rating: string; color: string; art: string; tag: string };
export const lessons: Lesson[] = import.meta.env.DEV ? [
  { id: 1, title: "Newton's Laws of Motion", teacher: 'Omar Hassan', subject: 'Physics', grade: 'Grade 10', videos: 8, duration: '2h 40m', price: 180, rating: '4.9', color: 'violet', art: '◉', tag: 'Bestseller' },
  { id: 2, title: 'Algebra, Made Simple', teacher: 'Mariam Adel', subject: 'Mathematics', grade: 'Grade 9', videos: 6, duration: '1h 55m', price: 140, rating: '4.8', color: 'coral', art: 'x²', tag: 'Popular' },
  { id: 3, title: 'The Cell: A Complete Guide', teacher: 'Dr. Salma Nabil', subject: 'Biology', grade: 'Grade 11', videos: 10, duration: '3h 10m', price: 220, rating: '5.0', color: 'lime', art: '⌬', tag: 'New' },
  { id: 4, title: 'English Grammar Essentials', teacher: 'Youssef Amin', subject: 'Languages', grade: 'Grade 8', videos: 7, duration: '2h 05m', price: 125, rating: '4.7', color: 'blue', art: 'Aa', tag: 'Top rated' },
  { id: 5, title: 'Chemistry: Atomic Structure', teacher: 'Nour El Din', subject: 'Science', grade: 'Grade 10', videos: 5, duration: '1h 40m', price: 160, rating: '4.9', color: 'peach', art: '⚛', tag: 'Popular' },
  { id: 6, title: 'Geometry Without Fear', teacher: 'Mariam Adel', subject: 'Mathematics', grade: 'Grade 8', videos: 9, duration: '2h 20m', price: 155, rating: '4.8', color: 'pink', art: '△', tag: 'Staff pick' },
  { id: 7, title: 'Ancient Egypt: The New Kingdom', teacher: 'Hana Fathy', subject: 'History', grade: 'Grade 10', videos: 6, duration: '1h 50m', price: 135, rating: '4.8', color: 'peach', art: '𓂀', tag: 'Staff pick' },
] : [];
export const categories = ['All subjects', 'Mathematics', 'Science', 'Languages', 'Physics', 'Biology', 'History'];
export const videos = [
  { title: 'What is motion? A quick recap', duration: '12:40', preview: true }, { title: 'Newton’s First Law — Inertia', duration: '21:15' }, { title: 'Newton’s Second Law — F = ma', duration: '24:30' }, { title: 'Newton’s Third Law — Action & reaction', duration: '19:05' }, { title: 'Solving force problems together', duration: '28:45' }, { title: 'Friction, free body diagrams & more', duration: '23:10' }, { title: 'A full exam-style walkthrough', duration: '18:20' }, { title: 'Quick revision & key takeaways', duration: '12:15' },
];
