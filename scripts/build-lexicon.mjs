import { readFile, writeFile } from 'node:fs/promises';
import wordListPath from 'word-list';
const text = await readFile(wordListPath, 'utf8');
const words = text.split(/\r?\n/).filter(w => /^[a-z]{3,6}$/.test(w));
await writeFile(new URL('../src/lexicon.json', import.meta.url), JSON.stringify(words));
console.log(`Generated ${words.length} English words from word-list.`);
