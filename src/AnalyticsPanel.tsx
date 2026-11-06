import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, BarChart3, Check, Clock3, BookOpen, Target, X } from 'lucide-react';
import { analyzePractice, type AnalysisResult } from './analytics';
import { summary, type PracticeRecord } from './game';

export default function AnalyticsPanel({ records, onClose }: { records: PracticeRecord[]; onClose: () => void }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const filtered = period === 'week' ? records.filter(r => r.timestamp >= Date.now() - 7 * 86400000) : records;
  const stats = summary(filtered);
  useEffect(() => {
    let active = true; setResult(null); setError('');
    if (!filtered.length) return;
    analyzePractice(filtered).then(r => { if (active) setResult(r); }).catch(e => { console.error('AVA analysis failed', e); if (active) setError('分析暂时没有完成，请关闭后重试。你的练习记录已保留。'); });
    return () => { active = false; };
  }, [records, period]);
  const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - 6 + i); const day = date.toLocaleDateString('sv-SE'); return { day, label: `${date.getMonth() + 1}/${date.getDate()}`, count: result?.daily.find(d => d.day === day)?.count ?? 0 }; });
  const chartData = period === 'week' ? days : result?.daily.map(d => ({ ...d, label: d.day.slice(5).replace('-', '/') })) ?? [];
  const max = Math.max(...chartData.map(d => d.count), 3);
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), records: filtered, analysis: result }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `lexi-practice-${new Date().toLocaleDateString('sv-SE')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <aside className="analytics-panel" aria-label="学习数据分析">
    <div className="panel-header"><div className="panel-icon"><BarChart3 size={23}/></div><button className="icon-button" onClick={onClose} aria-label="关闭学习分析"><X size={20}/></button></div>
    <h2>学习记录</h2>
    <div className="analytics-toolbar"><div className="segmented"><button className={period === 'week' ? 'selected' : ''} onClick={() => setPeriod('week')}>最近 7 天</button><button className={period === 'all' ? 'selected' : ''} onClick={() => setPeriod('all')}>全部记录</button></div><button className="icon-button" aria-label="导出练习记录" onClick={exportData} disabled={!filtered.length}><ArrowDownToLine size={17}/></button></div>
    <div className="stat-grid"><div><BookOpen size={17}/><strong>{stats.unique}<small> 个</small></strong><span>已拼单词</span></div><div><Target size={17}/><strong>{stats.count ? stats.accuracy : '—'}<small>{stats.count ? '%' : ''}</small></strong><span>正确率</span></div><div><Clock3 size={17}/><strong>{stats.count ? stats.average : '—'}<small> 秒</small></strong><span>平均用时</span></div></div>
    {!filtered.length ? <div className="analysis-empty"><h3>暂无记录</h3><button className="primary-button" onClick={onClose}>继续游戏<ArrowUpRight size={16}/></button></div> : <>
      <section className="chart-section"><div className="section-title"><h3>每日拼词</h3><span>个</span></div>{error ? <p className="analysis-error" role="alert">{error}</p> : !result ? <div className="chart-loading">分析中…</div> : <div className="bar-chart"><div className="chart-grid"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div><div className="bars">{chartData.map(d => <div className="bar-column" key={d.day} title={`${d.day}：完成 ${d.count} 个单词`}><div className="bar-space"><span className="bar-value">{d.count || ''}</span><div className="bar" style={{ height: `${d.count / max * 100}%`, minHeight: d.count ? 8 : 3 }}/></div><span>{d.label}</span></div>)}</div></div>}</section>
      {result && <section className="word-performance"><div className="section-title"><h3>单词熟悉度</h3><span>平均用时</span></div>{result.words.slice(0, 6).map(w => <div className="performance-row" key={w.word}><span>{w.word}</span><div><i style={{ width: `${Math.min(w.seconds / Math.max(...result.words.map(r => r.seconds), 1) * 100, 100)}%` }}/></div><small>{w.seconds}s</small>{w.mistakes === 0 && <Check size={13}/>}</div>)}</section>}
    </>}
    <div className="ava-footer"><span className="ava-logo">AVA<span>✳</span></span><span>Powered by AVA 4.0<br/><small>本地数据分析 · {result ? `${result.rows} 条记录，${result.fields} 个字段` : '记录只保存在你的浏览器'}</small></span><a href="https://github.com/antvis/AVA" target="_blank" rel="noreferrer" aria-label="访问 AVA GitHub"><ArrowUpRight size={16}/></a></div>
  </aside>;
}
