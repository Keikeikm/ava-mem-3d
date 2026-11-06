export type Word = { word: string; translation: string; description: string; phonetic: string; example: string; exampleZh: string; category: string };
export const WORDS: Word[] = [
  { word: 'BLOOM', translation: '绽放 · 生长', description: '像花一样，慢慢打开自己。', phonetic: '/bluːm/', example: 'Every flower blooms in its own time.', exampleZh: '每朵花都有自己的花期。', category: '自然与生活' },
  { word: 'DREAM', translation: '梦想 · 梦见', description: '一切美好，都从一个小小的梦开始。', phonetic: '/driːm/', example: 'Never stop following your dream.', exampleZh: '永远不要停止追寻你的梦想。', category: '自然与生活' },
  { word: 'FOCUS', translation: '专注 · 焦点', description: '把注意力放回此刻正在做的事。', phonetic: '/ˈfəʊkəs/', example: 'Focus on one small thing at a time.', exampleZh: '一次专注于一件小事。', category: '自然与生活' },
  { word: 'LIGHT', translation: '光 · 轻盈的', description: '让普通的一天，也有一点光亮。', phonetic: '/laɪt/', example: 'Let the morning light into your room.', exampleZh: '让晨光照进你的房间。', category: '自然与生活' },
  { word: 'PEACE', translation: '平静 · 安宁', description: '桌面整齐一点，内心也安静一点。', phonetic: '/piːs/', example: 'Find a little peace in everyday life.', exampleZh: '在日常生活中找到一点平静。', category: '自然与生活' },
  { word: 'GROW', translation: '成长 · 种植', description: '每天的一点点，终会变成很多。', phonetic: '/ɡrəʊ/', example: 'We grow a little every day.', exampleZh: '我们每天都在成长一点点。', category: '自然与生活' },
];
export const EXTRA_WORDS: Word[] = [
  { word: 'BOOK', translation: '书 · 预订', description: '翻开一本书，进入一个新世界。', phonetic: '/bʊk/', example: 'A good book is a quiet friend.', exampleZh: '一本好书是一位安静的朋友。', category: '桌面小物' },
  { word: 'PLANT', translation: '植物 · 栽种', description: '陪伴你的小小绿色朋友。', phonetic: '/plɑːnt/', example: 'Water the plant every morning.', exampleZh: '每天早晨给植物浇水。', category: '桌面小物' },
  { word: 'PAPER', translation: '纸 · 论文', description: '记下脑海中一闪而过的灵感。', phonetic: '/ˈpeɪpə/', example: 'Write your ideas on paper.', exampleZh: '把你的想法写在纸上。', category: '桌面小物' },
  { word: 'CUP', translation: '杯子', description: '一杯温暖，开启今天的小仪式。', phonetic: '/kʌp/', example: 'Enjoy a cup of tea.', exampleZh: '享用一杯茶。', category: '桌面小物' },
  { word: 'CLOCK', translation: '时钟', description: '时间滴答，给自己一点耐心。', phonetic: '/klɒk/', example: 'The clock on my desk is green.', exampleZh: '我桌上的时钟是绿色的。', category: '桌面小物' },
  { word: 'PEN', translation: '笔', description: '让文字在笔尖生长。', phonetic: '/pen/', example: 'May I borrow your pen?', exampleZh: '我可以借你的笔吗？', category: '桌面小物' },
];
export type PracticeRecord = { id: string; word: string; translation: string; category: string; timestamp: number; seconds: number; mistakes: number; hints: number };
export const STORAGE_KEY = 'lexi-practice-v1';
export function readRecords(): PracticeRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((r): r is PracticeRecord => !!r && typeof r.word === 'string' && typeof r.timestamp === 'number' && Number.isFinite(r.seconds) && r.seconds >= 0 && Number.isFinite(r.mistakes) && r.mistakes >= 0 && Number.isFinite(r.hints) && r.hints >= 0).slice(-1000) : [];
  } catch { return []; }
}
export function saveRecords(records: PracticeRecord[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-1000))); return true; } catch { return false; } }
export function isCorrect(letters: (string | null)[], word: string) { return letters.length === word.length && letters.join('') === word && letters.every(Boolean); }
export function summary(records: PracticeRecord[]) {
  const mistakes = records.reduce((n, r) => n + r.mistakes, 0);
  return { count: records.length, unique: new Set(records.map(r => r.word)).size, accuracy: records.length ? Math.round(records.length / (records.length + mistakes) * 100) : 0, average: records.length ? Math.round(records.reduce((n, r) => n + r.seconds, 0) / records.length) : 0, seconds: records.reduce((n, r) => n + r.seconds, 0) };
}
export function todayRecords(records: PracticeRecord[]) { const today = new Date().toLocaleDateString('sv-SE'); return records.filter(r => new Date(r.timestamp).toLocaleDateString('sv-SE') === today); }
export function makeLetters(word: string, seed = 0) {
  const extras = 'ASETRN';
  const chars = [...word, ...extras].map((letter, i) => ({ id: `${seed}-${i}`, letter }));
  for (let i = chars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars;
}
