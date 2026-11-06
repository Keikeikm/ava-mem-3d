import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, makeLetters, summary, WORDS } from '../src/game';
import { analyzePractice } from '../src/analytics';

test('a repeated letter can be represented twice and missing letters cannot pass', () => {
  assert.equal(isCorrect(['B', 'L', 'O', 'O', 'M'], 'BLOOM'), true);
  assert.equal(isCorrect(['B', 'L', 'O', null, 'M'], 'BLOOM'), false);
  assert.equal(isCorrect(['B', 'O', 'L', 'O', 'M'], 'BLOOM'), false);
  for (const word of WORDS) {
    const letters = makeLetters(word.word);
    assert.equal(new Set(letters.map(l => l.id)).size, letters.length);
    for (const letter of new Set(word.word)) assert.ok(letters.filter(l => l.letter === letter).length >= [...word.word].filter(l => l === letter).length);
  }
});

const records = [
  { id: '1', word: 'BLOOM', translation: '绽放', category: '自然', timestamp: Date.now(), seconds: 20, mistakes: 1, hints: 0 },
  { id: '2', word: 'BLOOM', translation: '绽放', category: '自然', timestamp: Date.now(), seconds: 10, mistakes: 0, hints: 1 },
  { id: '3', word: 'DREAM', translation: '梦想', category: '自然', timestamp: Date.now(), seconds: 30, mistakes: 0, hints: 0 },
];
test('practice summary counts attempts, unique words and mistakes separately', () => {
  assert.deepEqual(summary(records), { count: 3, unique: 2, accuracy: 75, average: 20, seconds: 60 });
  assert.deepEqual(summary([]), { count: 0, unique: 0, accuracy: 0, average: 0, seconds: 0 });
});
test('AVA 4 executes actual practice aggregation without a model request', async () => {
  const result = await analyzePractice(records);
  assert.equal(result.rows, 3);
  assert.equal(result.fields, 5);
  assert.equal(result.daily[0].count, 3);
  assert.equal(result.daily[0].accuracy, 75);
  assert.equal(result.words.find(w => w.word === 'BLOOM')?.seconds, 15);
  assert.equal(result.words[0].word, 'DREAM');
});
