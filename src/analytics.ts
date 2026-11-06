import type { PracticeRecord } from './game';
export type AnalysisResult = { daily: { day: string; count: number; accuracy: number }[]; words: { word: string; seconds: number; mistakes: number; count: number }[]; rows: number; fields: number };

export async function analyzePractice(records: PracticeRecord[]): Promise<AnalysisResult> {
  const { AVA } = await import('@antv/ava');
  // AVA 4's browser JavaScript engine runs these fixed queries locally.
  // No language-model operation is invoked and no practice data is sent away.
  const ava = new AVA({ llm: { model: 'local-analysis' }, engine: { type: 'javascript' } });
  try {
    await ava.source({ type: 'json', options: { data: records.map(r => ({ word: r.word, day: new Date(r.timestamp).toLocaleDateString('sv-SE'), seconds: r.seconds, mistakes: r.mistakes, hints: r.hints })) } });
    const schema = await ava.schema();
    await ava.profile({ metrics: ['row_count', 'null_count', 'min', 'max'] });
    const daily = await ava.query(`
      const groups = {};
      for (const r of data) {
        if (!groups[r.day]) groups[r.day] = { day: r.day, count: 0, mistakes: 0 };
        groups[r.day].count++; groups[r.day].mistakes += r.mistakes;
      }
      const result = Object.values(groups).map(r => ({ day: r.day, count: r.count, accuracy: Math.round(r.count / (r.count + r.mistakes) * 100) })).sort((a,b) => a.day.localeCompare(b.day));
    `, { maxRows: 1000 });
    const words = await ava.query(`
      const groups = {};
      for (const r of data) {
        if (!groups[r.word]) groups[r.word] = { word: r.word, total: 0, mistakes: 0, count: 0 };
        groups[r.word].total += r.seconds; groups[r.word].mistakes += r.mistakes; groups[r.word].count++;
      }
      const result = Object.values(groups).map(r => ({ word: r.word, seconds: Math.round(r.total / r.count), mistakes: r.mistakes, count: r.count })).sort((a,b) => b.seconds - a.seconds);
    `, { maxRows: 1000 });
    return { daily: daily.data as AnalysisResult['daily'], words: words.data as AnalysisResult['words'], rows: records.length, fields: schema.models?.[0]?.columns?.length ?? 5 };
  } finally { await ava.dispose(); }
}
