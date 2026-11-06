import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ArrowRight, BarChart3, Box, CircleHelp, Keyboard, Lightbulb, Pause, Play, RotateCcw, Undo2, Volume2, VolumeX, X } from 'lucide-react';
import World from './World';
import AnalyticsPanel from './AnalyticsPanel';
import { DICTIONARY, LEVELS, boardReducer, candidates, createBoard, remaining, zoneLetters, type BoardAction } from './board';
import { readRecords, saveRecords, type PracticeRecord } from './game';
import { playSound } from './audio';

type Progress = { current: number; best: Record<string, number> };
function readProgress(): Progress {
  try {
    const value = JSON.parse(localStorage.getItem('lexi-islands-v3') || '{}');
    return { current: Number.isInteger(value.current) && value.current >= 0 && value.current < LEVELS.length ? value.current : 0, best: value.best && typeof value.best === 'object' ? value.best : {} };
  } catch { return { current: 0, best: {} }; }
}
function writeProgress(progress: Progress) { try { localStorage.setItem('lexi-islands-v3', JSON.stringify(progress)); } catch { /* Playing does not require storage. */ } }

export default function App() {
  const [progress, setProgress] = useState(readProgress);
  const [board, dispatch] = useReducer(boardReducer, progress.current, level => createBoard(17, level));
  const [round, setRound] = useState(0);
  const [records, setRecords] = useState<PracticeRecord[]>(readRecords);
  const [menu, setMenu] = useState<'pause' | 'help' | 'levels' | null>(null);
  const [analysis, setAnalysis] = useState(false);
  const [hints, setHints] = useState(false);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const [sound, setSound] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [wordToast, setWordToast] = useState<string | null>(null);
  const recorded = useRef(new Set<string>()), clock = useRef(0), lastWordTime = useRef(0);
  const boardRef = useRef(board); boardRef.current = board;
  const finishGuard = useRef(false);
  const left = remaining(board);
  const options = candidates(board);
  const selectedHint = hintTarget && options.includes(hintTarget) ? hintTarget : options[0];
  const letters = zoneLetters(board, board.active);
  const paused = !!menu || analysis || result !== null;
  const available = new Set(board.tiles.filter(tile => !tile.consumed && tile.zone === null).map(tile => tile.letter));

  const action = useCallback((next: BoardAction) => {
    if (next.type !== 'select' && next.type !== 'dismiss') playSound(sound);
    dispatch(next);
  }, [sound]);
  const openAnalysis = useCallback(() => setAnalysis(true), []);
  const finish = useCallback(() => {
    if (finishGuard.current || boardRef.current.completed.length < 3) return;
    finishGuard.current = true;
    const current = boardRef.current, remainingLetters = remaining(current);
    setResult(remainingLetters); setHints(false); setKeyboard(false); setMenu(null);
    setProgress(previous => {
      const next = { ...previous, current: current.level, best: { ...previous.best, [current.level]: Math.min(previous.best[current.level] ?? 24, remainingLetters) } };
      writeProgress(next); return next;
    });
  }, []);
  function startLevel(level: number) {
    finishGuard.current = false; recorded.current = new Set(); clock.current = 0; lastWordTime.current = 0;
    dispatch({ type: 'reset', seed: 17 + level * 11, level }); setRound(value => value + 1);
    setResult(null); setMenu(null); setHints(false); setKeyboard(false); setWordToast(null); setHintTarget(null);
    setProgress(previous => { const next = { ...previous, current: level }; writeProgress(next); return next; });
  }

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => clock.current++, 1000); return () => clearInterval(interval);
  }, [paused, round]);
  useEffect(() => {
    const fresh = board.completed.filter(word => !recorded.current.has(word));
    if (!fresh.length) return;
    const additions = fresh.map(word => {
      recorded.current.add(word); const zone = board.zones.find(zone => zone.word === word)!;
      const record: PracticeRecord = { id: crypto.randomUUID(), timestamp: Date.now(), word, translation: DICTIONARY[word] || '', category: LEVELS[board.level].name, seconds: Math.max(1, clock.current - lastWordTime.current), hints: zone.hints, mistakes: zone.mistakes };
      lastWordTime.current = clock.current; return record;
    });
    setRecords(previous => { const next = [...previous, ...additions]; saveRecords(next); return next; });
    setWordToast(fresh.at(-1)!); playSound(sound, true);
  }, [board.completed, board.zones, board.level, sound]);
  useEffect(() => { if (!wordToast) return; const timeout = setTimeout(() => setWordToast(null), 2100); return () => clearTimeout(timeout); }, [wordToast]);
  useEffect(() => { if (left !== 0) return; const timeout = setTimeout(finish, 2600); return () => clearTimeout(timeout); }, [left, finish]);
  useEffect(() => { setHintTarget(null); }, [board.active]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if (analysis) setAnalysis(false); else if (hints || keyboard) { setHints(false); setKeyboard(false); } else if (result === null) setMenu(value => value ? null : 'pause'); return; }
      if (paused || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement) return;
      if (/^[a-z]$/i.test(event.key)) { event.preventDefault(); action({ type: 'type', letter: event.key }); }
      if (event.key === 'Backspace') { event.preventDefault(); action({ type: 'undo' }); }
      if (event.key === ' ') { event.preventDefault(); if (hints && selectedHint) action({ type: 'hint', word: selectedHint }); else { setHints(true); setKeyboard(false); } }
      if (/^[1-6]$/.test(event.key)) action({ type: 'select', zone: Number(event.key) - 1 });
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) finish();
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [paused, analysis, result, hints, keyboard, selectedHint, action, finish]);
  useEffect(() => {
    if (!menu && !analysis && result === null) return;
    const previous = document.activeElement as HTMLElement;
    const timer = setTimeout(() => (document.querySelector('.game-dialog button,.analytics-panel button') as HTMLElement)?.focus(), 30);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = document.querySelector('.game-dialog,.analytics-panel');
      const focusable = root?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]'); if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap); return () => { clearTimeout(timer); document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [menu, analysis, result]);
  const speak = (word: string) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word); utterance.lang = 'en-US'; utterance.rate = .75; speechSynthesis.speak(utterance);
  };

  return <main className="island-game" style={{ '--sky': LEVELS[board.level].sky } as React.CSSProperties}>
    <World board={board} round={round} paused={paused} hintWord={hints ? selectedHint || null : null} onAction={action} onAnalysis={openAnalysis} onExit={finish}/>
    <div className="game-top-left"><span className="game-name">字间</span><button className="level-number" onClick={() => setMenu('levels')} aria-label="选择关卡">{String(board.level + 1).padStart(2, '0')}</button></div>
    <div className="game-top-right"><span className="remaining-count" title="剩余字母" aria-label={`剩余 ${left} 块字母`}><Box size={16}/><strong data-testid="remaining">{left}</strong></span><button className="game-icon" aria-label={sound ? '关闭音效' : '开启音效'} onClick={() => setSound(value => !value)}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button><button className="game-icon" aria-label="暂停" onClick={() => setMenu('pause')}><Pause size={19}/></button></div>
    {!paused && <div className="game-controls"><button className={`control-orb ${hints ? 'selected' : ''}`} aria-label="提示" title="提示 · 空格" onClick={() => { setHints(value => !value); setKeyboard(false); }}><Lightbulb size={20}/></button><button className="control-orb" aria-label="撤回" title="撤回 · Backspace" onClick={() => action({ type: 'undo' })}><Undo2 size={20}/></button><button className={`control-orb ${keyboard ? 'selected' : ''}`} aria-label="字母键盘" title="字母键盘" onClick={() => { setKeyboard(value => !value); setHints(false); }}><Keyboard size={20}/></button></div>}
    {!paused && board.completed.length >= 3 && <button className="portal-button" aria-label="进入下一关" title="进入下一关" onClick={finish}><ArrowRight size={24}/></button>}
    {hints && !paused && <section className="game-hint" aria-label="提示面板"><button className="panel-close" aria-label="关闭提示" onClick={() => setHints(false)}><X size={16}/></button>{selectedHint ? <><div className="hint-word"><strong>{selectedHint}</strong><button aria-label="朗读提示" onClick={() => speak(selectedHint)}><Volume2 size={17}/></button></div><p>{DICTIONARY[selectedHint]}</p><div className="hint-choices">{options.slice(0, 4).map(word => <button className={selectedHint === word ? 'selected' : ''} key={word} onClick={() => setHintTarget(word)}>{word}</button>)}</div><button className="hint-place" onClick={() => action({ type: 'hint', word: selectedHint })}>补一块<ArrowRight size={17}/></button></> : <><strong className="hint-empty">换一座岛试试</strong><button className="hint-place" onClick={() => action({ type: 'clear' })}>撤回这组字母<Undo2 size={17}/></button></>}</section>}
    {keyboard && !paused && <section className="game-keyboard" aria-label="字母键盘面板"><button className="panel-close" aria-label="关闭字母键盘" onClick={() => setKeyboard(false)}><X size={16}/></button><div className="keyboard-word">{letters.map((letter, i) => <span key={i}>{letter || '·'}</span>)}</div>{['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(row => <div className="keyboard-row" key={row}>{[...row].map(letter => <button key={letter} disabled={!available.has(letter)} aria-label={`输入字母 ${letter}`} onClick={() => action({ type: 'type', letter })}>{letter}</button>)}</div>)}</section>}
    {wordToast && !paused && <div className="word-flash" role="status"><strong>{wordToast}</strong>{DICTIONARY[wordToast] && <span>{DICTIONARY[wordToast]}</span>}</div>}
    <div className="sr-only spell-status" aria-live="polite">拼词区 {board.active + 1}：{letters.map(letter => letter || '空位').join(' ')}</div>
    <div className="sr-only">{board.zones.map(zone => <button key={zone.id} aria-label={`拼词区 ${zone.id + 1}，${zone.length} 格`} disabled={!!zone.word} onClick={() => action({ type: 'select', zone: zone.id })}>{zone.length}</button>)}<button aria-label="学习分析" onClick={openAnalysis}>记录</button></div>
    {analysis && <div className="panel-backdrop" onClick={() => setAnalysis(false)}><div role="dialog" aria-modal="true" aria-label="学习记录" onClick={event => event.stopPropagation()}><AnalyticsPanel records={records} onClose={() => setAnalysis(false)}/></div></div>}
    {(menu || result !== null) && <div className="game-shade" onClick={() => result === null && setMenu(null)}><section className={`game-dialog ${menu === 'levels' ? 'level-dialog' : ''}`} role="dialog" aria-modal="true" aria-label={result !== null ? '关卡完成' : menu === 'levels' ? '选择关卡' : menu === 'help' ? '玩法' : '暂停'} onClick={event => event.stopPropagation()}>
      {result !== null ? <><div className="completion-symbol">◇</div><h2>{board.level === LEVELS.length - 1 ? '已通关' : '完成'}</h2><p className="completion-count">剩余 <b>{result}</b> 块</p><button className="game-main-button" onClick={() => startLevel((board.level + 1) % LEVELS.length)}>{board.level === LEVELS.length - 1 ? '再玩一次' : '下一关'}<ArrowRight size={18}/></button></> :
      menu === 'levels' ? <><button className="dialog-close" aria-label="关闭窗口" onClick={() => setMenu(null)}><X size={20}/></button><div className="level-choices">{LEVELS.map((level, i) => <button className={board.level === i ? 'current' : ''} key={level.name} onClick={() => startLevel(i)}><span className="level-art" style={{ background: `linear-gradient(160deg,${level.sky},${level.horizon})` }}><i style={{ borderColor: level.stone }}/><b>{String(i + 1).padStart(2, '0')}</b></span><span>{level.name}</span></button>)}</div></> :
      menu === 'help' ? <><button className="dialog-close" aria-label="关闭窗口" onClick={() => setMenu(null)}><X size={20}/></button><h2>玩法</h2><p className="game-help">把字母放进岛上的格子，拼出单词。<br/>点击字母也能归位，点击空岛切换。<br/>拼出三个词后，拱门会亮起。</p><div className="key-guide"><span><Keyboard size={16}/>字母输入</span><span><Lightbulb size={16}/>空格提示</span><span><Undo2 size={16}/>退格撤回</span></div><button className="game-main-button" onClick={() => setMenu(null)}>继续<Play size={16}/></button></> :
      <><h2>暂停</h2><div className="pause-options"><button onClick={() => setMenu(null)}><Play size={17}/>继续</button><button onClick={() => startLevel(board.level)}><RotateCcw size={17}/>重来</button><button onClick={() => setMenu('levels')}><Box size={17}/>选关</button><button onClick={() => setMenu('help')}><CircleHelp size={17}/>玩法</button><button onClick={() => { setMenu(null); setAnalysis(true); }}><BarChart3 size={17}/>记录</button></div></>}
    </section></div>}
  </main>;
}
