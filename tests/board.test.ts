import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardReducer, candidates, createBoard, isEnglishWord, LEVELS, remaining, zoneLetters, type BoardState } from '../src/board';

function invariant(state:BoardState){
  assert.equal(state.tiles.length,24);assert.equal(new Set(state.tiles.map(t=>t.id)).size,24);
  const occupied=state.tiles.filter(t=>t.zone!==null);assert.equal(new Set(occupied.map(t=>`${t.zone}-${t.cell}`)).size,occupied.length);
  assert.equal(remaining(state)+state.tiles.filter(t=>t.consumed).length,24);
}
test('single-player levels have reproducible letters and six connected groups',()=>{
  assert.deepEqual(createBoard(32),createBoard(32));
  assert.deepEqual(createBoard().zones.map(z=>z.length),[3,3,4,4,5,5]);
  assert.notDeepEqual(createBoard(32).tiles.map(t=>t.letter),createBoard(33).tiles.map(t=>t.letter));
  assert.notDeepEqual(createBoard(32,0).tiles.map(t=>t.letter),createBoard(32,1).tiles.map(t=>t.letter));
});
test('every level has a complete solution using exactly 24 letters',()=>{
  LEVELS.forEach((level,index)=>{
    let s=createBoard(17,index);
    for(const target of level.targets){for(const letter of target){s=boardReducer(s,{type:'type',letter});invariant(s);}}
    assert.equal(remaining(s),0);assert.deepEqual(s.completed,level.targets);
    const first=s.tiles.find(t=>t.consumed)!;
    assert.equal(remaining(boardReducer(s,{type:'return',tile:first.id})),0);
  });
});

test('the public lexicon accepts GAP and common words beyond hint vocabulary',()=>{
  for(const word of ['GAP','AGE','GAME','OTHER','PEOPLE','FRIEND','HELLO','CIRCLE'])assert.equal(isEnglishWord(word),true,word);
  for(const word of ['AAA','ZZZZ','QZX','G4P','TO','TOOLONG'])assert.equal(isEnglishWord(word),false,word);
  let s=createBoard();for(const letter of 'GAP')s=boardReducer(s,{type:'type',letter});
  assert.equal(s.zones[0].word,'GAP');assert.equal(remaining(s),21);
});
test('an alternative valid word works in any matching group',()=>{
  let s=createBoard();for(const letter of 'TEA')s=boardReducer(s,{type:'type',letter});
  assert.equal(remaining(s),21);assert.equal(s.zones[0].word,'TEA');
});
test('placing, replacing and undoing a tile conserve the shared pool',()=>{
  let s=createBoard();s=boardReducer(s,{type:'place',tile:0,zone:0,cell:0});
  s=boardReducer(s,{type:'place',tile:1,zone:0,cell:0});
  assert.equal(s.tiles[0].zone,null);assert.equal(zoneLetters(s,0)[0],s.tiles[1].letter);
  s=boardReducer(s,{type:'place',tile:1,zone:4,cell:3});
  assert.equal(zoneLetters(s,0)[0],null);invariant(s);
  s=boardReducer(s,{type:'select',zone:4});s=boardReducer(s,{type:'undo'});assert.equal(s.tiles[1].zone,null);assert.equal(remaining(s),24);invariant(s);
});
test('hints respect actual letter stock and finish duplicate-letter words',()=>{
  let s=createBoard();s=boardReducer(s,{type:'select',zone:2});
  for(let i=0;i<4;i++){assert.ok(candidates(s).includes('BOOK'));s=boardReducer(s,{type:'hint',word:'BOOK'});invariant(s);}
  assert.equal(s.zones[2].word,'BOOK');assert.equal(s.zones[2].hints,4);assert.equal(remaining(s),20);
});
test('unknown words do not consume tiles; errors are counted once per spelling',()=>{
  let s=createBoard();for(const letter of 'AAA')s=boardReducer(s,{type:'type',letter});
  assert.equal(remaining(s),24);assert.equal(s.zones[0].mistakes,1);
  s=boardReducer(s,{type:'clear'});for(const letter of 'AAA')s=boardReducer(s,{type:'type',letter});
  assert.equal(s.zones[0].mistakes,1);invariant(s);
});
test('reserved letters are not recommended to another group',()=>{
  let s=createBoard();for(const letter of 'CA')s=boardReducer(s,{type:'type',letter});
  s=boardReducer(s,{type:'select',zone:1});assert.ok(!candidates(s).includes('CAT'));
});
test('undoing a completed word reverses construction and restores its letters',()=>{
  let s=createBoard();for(const letter of 'GAPCAT')s=boardReducer(s,{type:'type',letter});
  assert.equal(remaining(s),18);
  s=boardReducer(s,{type:'undo'});invariant(s);
  assert.equal(remaining(s),21);assert.deepEqual(s.completed,['GAP']);assert.equal(s.zones[1].word,null);assert.equal(s.active,1);
  for(const letter of 'CAT')s=boardReducer(s,{type:'type',letter});
  assert.equal(remaining(s),18);assert.equal(s.zones[1].word,'CAT');
});
