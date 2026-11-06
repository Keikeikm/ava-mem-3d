import lexicon from './lexicon.json';
const ENGLISH_WORDS = new Set(lexicon.map(word => word.toUpperCase()));
export const isEnglishWord = (word: string) => /^[A-Z]{3,6}$/.test(word) && (ENGLISH_WORDS.has(word) || Object.hasOwn(DICTIONARY, word));
export const DICTIONARY: Record<string, string> = {
  GAP:'间隙',AGE:'年龄',AGO:'以前',AID:'帮助',AIM:'目标',ALL:'全部',AND:'和',ANY:'任何',ASK:'问',BAD:'坏的',BAR:'条',BET:'打赌',BIT:'一点',BOW:'弓',CAN:'能够',CAP:'帽子',COW:'奶牛',DAD:'爸爸',DIG:'挖',DRY:'干的',END:'结束',FAR:'远的',FAT:'胖的',FEW:'少数',FIT:'合适',FIX:'修理',FOR:'为了',GAS:'气体',GUY:'人',HER:'她的',HIM:'他',HIS:'他的',HOW:'怎样',INK:'墨水',JOB:'工作',JET:'喷气式飞机',JOY:'快乐',KID:'孩子',LAW:'法律',LAY:'放下',LIE:'躺',LIP:'嘴唇',LOT:'很多',MAN:'男人',MAY:'可以',MUD:'泥',NOT:'不',NOW:'现在',NUT:'坚果',OFF:'离开',ONE:'一',OUR:'我们的',OUT:'外面',OWN:'自己的',PAY:'支付',PIE:'馅饼',PIG:'猪',PUT:'放',RAT:'老鼠',RAW:'生的',SAD:'难过',SAW:'锯',SAY:'说',SEE:'看见',SHE:'她',SHY:'害羞',SON:'儿子',TOO:'也',TWO:'二',USE:'使用',VAN:'面包车',WAY:'路',WHO:'谁',WHY:'为什么',YOU:'你',GAME:'游戏',FACE:'脸',FAST:'快的',FIRE:'火',FREE:'自由',GIVE:'给',GIRL:'女孩',HELP:'帮助',HIGH:'高的',KEEP:'保持',LIFE:'生命',LONG:'长的',MAKE:'制作',MORE:'更多',NAME:'名字',NEAR:'近的',NICE:'好的',ONLY:'只有',OVER:'上方',REAL:'真实',SAFE:'安全',SAVE:'保存',SING:'唱歌',SIZE:'尺寸',SOFT:'柔软',SOME:'一些',SURE:'确信',TALL:'高的',THEN:'然后',TRUE:'真实',VERY:'很',WELL:'好',WITH:'和',YEAR:'年',YOUNG:'年轻',MUSIC:'音乐',COLOR:'颜色',MAGIC:'魔法',RIVER:'河流',STONE:'石头',DANCE:'跳舞',SPACE:'空间',
  CAT:'猫',DOG:'狗',SUN:'太阳',CUP:'杯子',PEN:'笔',CAR:'汽车',BEE:'蜜蜂',TEA:'茶',RED:'红色',BED:'床',BAG:'包',BOX:'盒子',HAT:'帽子',MAP:'地图',TOP:'顶部',TOY:'玩具',KEY:'钥匙',SEA:'海',SKY:'天空',DAY:'一天',NEW:'新的',OLD:'旧的',BIG:'大的',HOT:'热的',ICE:'冰',EAT:'吃',GET:'得到',LET:'让',SET:'放置',PET:'宠物',ROW:'一排',LOW:'低的',EAR:'耳朵',ART:'艺术',APE:'猿',EGG:'蛋',LEG:'腿',LOG:'原木',NET:'网',OWL:'猫头鹰',POT:'锅',TAP:'水龙头',WEB:'网',WET:'湿的',YES:'是的',AIR:'空气',ANT:'蚂蚁',BAT:'蝙蝠',BOY:'男孩',BUS:'公交车',CUT:'切',FLY:'飞',FUN:'乐趣',HEN:'母鸡',HOP:'跳',JAM:'果酱',RUN:'跑',SIT:'坐',SIX:'六',TEN:'十',WIN:'赢',ZIP:'拉链',
  BOOK:'书',TREE:'树',HOME:'家',FISH:'鱼',BIRD:'鸟',STAR:'星星',MOON:'月亮',RAIN:'雨',SNOW:'雪',MILK:'牛奶',CAKE:'蛋糕',BALL:'球',DOOR:'门',DESK:'书桌',LAMP:'台灯',BLUE:'蓝色',LOVE:'爱',PLAY:'玩',READ:'读',GOOD:'好的',FOOD:'食物',HAND:'手',HEAD:'头',LEAF:'叶子',BEAR:'熊',DUCK:'鸭子',BOAT:'船',ROAD:'路',GOLD:'金色',DARK:'暗的',DEAR:'亲爱的',DATE:'日期',PEAR:'梨',TAPE:'胶带',ROSE:'玫瑰',WORD:'单词',WORK:'工作',WARM:'温暖的',WALK:'走',TALK:'说话',TAKE:'拿',LOOK:'看',OPEN:'打开',NOTE:'笔记',PARK:'公园',PART:'部分',PALE:'浅色的',PORT:'港口',LATE:'晚的',LAND:'土地',SAND:'沙子',SEAT:'座位',SALE:'出售',SALT:'盐',SOAP:'肥皂',STOP:'停止',STEP:'步骤',TEAM:'团队',TIME:'时间',TURN:'转动',WALL:'墙',WIND:'风',WOOD:'木头',ZERO:'零',
  APPLE:'苹果',WATER:'水',HOUSE:'房子',GREEN:'绿色',GRAPE:'葡萄',BREAD:'面包',CHAIR:'椅子',TABLE:'桌子',PLANT:'植物',LIGHT:'光',HAPPY:'快乐的',SMILE:'微笑',DREAM:'梦',SLEEP:'睡',SMALL:'小的',SWEET:'甜的',PAPER:'纸',EARTH:'地球',BEACH:'海滩',HEART:'心',LEARN:'学习',WORLD:'世界',WRITE:'写',PAINT:'画',TRAIN:'火车',STORE:'商店',HORSE:'马',MOUSE:'老鼠',SHEEP:'绵羊',CLOUD:'云',CLOCK:'时钟',BLOOM:'绽放',FOCUS:'专注',PEACE:'平静',GROW:'成长',
};
export type BoardTile = { id: number; letter: string; zone: number | null; cell: number | null; consumed: boolean };
export type Zone = { id: number; length: number; word: string | null; hints: number; mistakes: number; lastError: string };
export type BoardState = { tiles: BoardTile[]; zones: Zone[]; active: number; level: number; message: string; completed: string[]; revision: number; lastWord: string | null };
export type BoardAction = { type: 'reset'; seed: number; level?: number } | { type: 'select'; zone: number } | { type: 'place'; tile: number; zone: number; cell: number } | { type: 'click'; tile: number } | { type: 'return'; tile: number } | { type: 'type'; letter: string } | { type: 'hint'; word?: string } | { type: 'undo' | 'clear' | 'reveal' | 'dismiss' };
export const LEVELS = [
  {name:'晨光',targets:['GAP','CAT','BOOK','TREE','APPLE','WATER'],sky:'#6b6b94',horizon:'#bbb2b5',stone:'#ead8c4',edge:'#bd947e',accent:'#ebad72',arch:'#ca8070',water:'#78779c'},
  {name:'青岚',targets:['SUN','PEN','FISH','STAR','HOUSE','GREEN'],sky:'#385e76',horizon:'#92b0b1',stone:'#d3e1d2',edge:'#79a7a3',accent:'#e3b87d',arch:'#91bda9',water:'#568b98'},
  {name:'余晖',targets:['CUP','BEE','MILK','CAKE','BREAD','SMILE'],sky:'#604962',horizon:'#c698a0',stone:'#ead3c0',edge:'#b08083',accent:'#f1b170',arch:'#d08c78',water:'#936e85'},
];
export const TARGETS = LEVELS[0].targets;
export function createBoard(seed = 17, level = 0): BoardState {
  level = Math.max(0,Math.min(LEVELS.length-1,level));
  const targets = LEVELS[level].targets;
  const letters = [...targets.join('')]; let n = seed >>> 0;
  for (let i = letters.length - 1; i > 0; i--) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; const j = n % (i + 1); [letters[i], letters[j]] = [letters[j], letters[i]]; }
  return { tiles: letters.map((letter,id) => ({ id,letter,zone:null,cell:null,consumed:false })), zones: targets.map((w,id) => ({id,length:w.length,word:null,hints:0,mistakes:0,lastError:''})), active:0,level,message:'',completed:[],revision:0,lastWord:null };
}
export const remaining = (state: BoardState) => state.tiles.filter(t => !t.consumed).length;
export const zoneLetters = (state: BoardState, id: number) => Array.from({length:state.zones[id].length},(_,i) => state.tiles.find(t => !t.consumed && t.zone === id && t.cell === i)?.letter ?? null);
export function candidates(state: BoardState, id = state.active): string[] {
  if (state.zones[id].word) return [];
  const supply = state.tiles.filter(t => !t.consumed && (t.zone === null || t.zone === id));
  const counts: Record<string,number> = {}; supply.forEach(t => counts[t.letter] = (counts[t.letter] || 0) + 1);
  return Object.keys(DICTIONARY).filter(w => w.length === state.zones[id].length && !state.completed.includes(w) && [...new Set(w)].every(l => [...w].filter(c => c === l).length <= (counts[l] || 0)))
    .sort((a,b) => Number(LEVELS[state.level].targets.includes(b)) - Number(LEVELS[state.level].targets.includes(a)) || a.localeCompare(b));
}
function validate(state: BoardState, zoneId: number): BoardState {
  const values = zoneLetters(state, zoneId); if (!values.every(Boolean)) return state;
  const word = values.join(''); const zone = state.zones[zoneId];
  if (!isEnglishWord(word) || state.completed.includes(word)) {
    const message = state.completed.includes(word) ? '已经拼过' : '再试一次';
    return {...state,message,zones:state.zones.map(z => z.id === zoneId ? {...z,mistakes:z.mistakes + Number(z.lastError !== word),lastError:word} : z)};
  }
  const zones = state.zones.map(z => z.id === zoneId ? {...z,word} : z);
  return {...state,zones,tiles:state.tiles.map(t => t.zone === zoneId ? {...t,consumed:true} : t),completed:[...state.completed,word],active:zones.find(z => !z.word)?.id ?? zoneId,message:'',lastWord:word,revision:state.revision + 1};
}
function place(state: BoardState, tileId: number, zoneId: number, cell: number): BoardState {
  const zone = state.zones[zoneId]; const tile = state.tiles.find(t => t.id === tileId);
  if (!zone || zone.word || !tile || tile.consumed || cell < 0 || cell >= zone.length) return state;
  const tiles = state.tiles.map(t => t.id === tileId ? {...t,zone:zoneId,cell} : t.zone === zoneId && t.cell === cell && !t.consumed ? {...t,zone:null,cell:null} : t);
  return validate({...state,tiles,active:zoneId,message:''},zoneId);
}
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  const zoneId = state.active;
  switch (action.type) {
    case 'reset': return createBoard(action.seed,action.level ?? state.level);
    case 'select': return state.zones[action.zone] && !state.zones[action.zone].word ? {...state,active:action.zone,message:''} : state;
    case 'place': return place(state,action.tile,action.zone,action.cell);
    case 'return': return {...state,tiles:state.tiles.map(t => t.id === action.tile && !t.consumed ? {...t,zone:null,cell:null} : t),message:''};
    case 'click': {
      const tile = state.tiles.find(t => t.id === action.tile); if (!tile || tile.consumed) return state;
      if (tile.zone !== null) return boardReducer(state,{type:'return',tile:tile.id});
      const cell = zoneLetters(state,zoneId).indexOf(null); return cell >= 0 ? place(state,tile.id,zoneId,cell) : {...state,message:'这一组已填满，点击字母可以撤回。'};
    }
    case 'type': {
      const tile = state.tiles.find(t => !t.consumed && t.zone === null && t.letter === action.letter.toUpperCase());
      return tile ? boardReducer(state,{type:'click',tile:tile.id}) : {...state,message:`桌面上没有空闲的 ${action.letter.toUpperCase()}。可以从另一组撤回字母。`};
    }
    case 'undo': {
      const tile = state.tiles.filter(t => !t.consumed && t.zone === zoneId).sort((a,b) => b.cell! - a.cell!)[0];
      if (tile) return boardReducer(state,{type:'return',tile:tile.id});
      const last = state.completed.at(-1); const solved = state.zones.find(z => z.word === last);
      if (!last || !solved) return state;
      return {...state,active:solved.id,completed:state.completed.slice(0,-1),zones:state.zones.map(z=>z.id===solved.id?{...z,word:null}:z),tiles:state.tiles.map(t=>t.zone===solved.id?{...t,consumed:false,zone:null,cell:null}:t),lastWord:null,message:'',revision:state.revision+1};
    }
    case 'clear': return {...state,tiles:state.tiles.map(t => !t.consumed && t.zone === zoneId ? {...t,zone:null,cell:null} : t),message:''};
    case 'reveal': return {...state,zones:state.zones.map(z => z.id === zoneId ? {...z,hints:z.hints+1} : z)};
    case 'hint': {
      const options = candidates(state); if (!options.length) return {...state,message:'这一组暂时没有可拼的词。撤回其他组里的字母，或换一组试试。'};
      const current = zoneLetters(state,zoneId);
      const target = action.word && options.includes(action.word) ? action.word : options.find(w => current.every((l,i) => !l || w[i] === l)) ?? options[0];
      const cell = current.findIndex((l,i) => l !== target[i]); if (cell < 0) return state;
      let next = {...state,zones:state.zones.map(z => z.id === zoneId ? {...z,hints:z.hints+1} : z)};
      const tile = next.tiles.find(t => !t.consumed && t.letter === target[cell] && (t.zone === null || t.zone === zoneId && target[t.cell!] !== t.letter));
      if (tile) { next = place(next,tile.id,zoneId,cell); return {...next,message:next.lastWord !== state.lastWord ? next.message : `已补好 ${target[cell]}。提示：${DICTIONARY[target]}，${target.length} 个字母。`}; }
      return next;
    }
    case 'dismiss': return {...state,message:''};
  }
}
export const ZONE_POSITIONS = [ {x:-8.9,z:-4.55}, {x:5.2,z:-4.55}, {x:-9.7,z:0}, {x:5.15,z:0}, {x:-9.8,z:4.65}, {x:4.5,z:4.65} ];
export const PORTRAIT_ZONES = [ {x:-4.25,z:-7}, {x:1.75,z:-7}, {x:-4.8,z:5.5}, {x:1.2,z:5.5}, {x:-5.35,z:8.8}, {x:.65,z:8.8} ];
export const CELL_STEP = 1.1;
export function cellPosition(zone: number,cell: number,portrait = false) { const p=(portrait ? PORTRAIT_ZONES : ZONE_POSITIONS)[zone]; return {x:p.x + cell * CELL_STEP,z:p.z}; }
