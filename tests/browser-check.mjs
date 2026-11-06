import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createBoard,cellPosition,LEVELS} from '../src/board.ts';
import {tileHome,cameraPosition,portraitCameraPosition} from '../src/World.tsx';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.GAME_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:950},deviceScaleFactor:1});
const errors=[],passed=[];
page.on('pageerror',error=>errors.push(error.message));
const score=async n=>{await page.getByTestId('remaining').filter({hasText:new RegExp(`^${n}$`)}).waitFor();};
const ready=async()=>{await page.locator('.game-world canvas[data-ready="true"]').waitFor({timeout:60000});await page.waitForTimeout(3500);};
const spell=async word=>{await page.keyboard.type(word,{delay:100});await page.waitForTimeout(300);};
async function project(x,y,z){
  const bounds=await page.locator('.game-world').boundingBox(),aspect=bounds.width/bounds.height,portrait=aspect<.85;
  const size=portrait ? Math.max(10.7,6.05/aspect) : Math.max(8.4,13.15/aspect);
  const camera=new THREE.OrthographicCamera(-size*aspect,size*aspect,size,-size,.1,130);
  camera.position.copy(portrait?portraitCameraPosition:cameraPosition);camera.lookAt(0,.2,portrait?.7:0);camera.updateMatrixWorld();
  const p=new THREE.Vector3(x,y,z).project(camera);
  return{x:bounds.x+(p.x+1)*bounds.width/2,y:bounds.y+(1-p.y)*bounds.height/2};
}
try{
  await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});await ready();
  await page.screenshot({path:'artifacts/game-desktop.png'});
  assert.equal(await page.getByRole('button',{name:/^拼词区 \d/}).count(),6);
  assert.equal(await page.getByText('双人挑战',{exact:true}).count(),0);
  assert.equal(await page.locator('.game-hint').count(),0);
  const dimensions=await page.locator('.game-world').boundingBox();assert.equal(dimensions.width,1440);assert.equal(dimensions.height,950);
  passed.push('full-screen single-player scene with six word islands and no permanent prose');

  const first=createBoard().tiles[0],home=tileHome(first.id),at=cellPosition(0,0);
  const source=await project(home.x,1.36,home.z),target=await project(at.x,.54,at.z+.22);
  await page.mouse.move(source.x,source.y);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:18});await page.mouse.up();await page.waitForTimeout(1000);
  assert.match(await page.locator('.spell-status').textContent(),new RegExp(`${first.letter} 空位 空位`));
  const placed=await project(at.x,1.36,at.z+.22);await page.mouse.click(placed.x,placed.y);await page.waitForTimeout(900);
  assert.match(await page.locator('.spell-status').textContent(),/空位 空位 空位/);await score(24);
  passed.push('actual 3D dragging and clicking a placed block to return it');

  await spell('GAP');await score(21);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lexi-practice-v1')).at(-1).translation),'间隙');
  await page.getByRole('button',{name:'撤回',exact:true}).click();await score(24);
  await page.getByRole('button',{name:'提示',exact:true}).click();
  await page.locator('.hint-choices').getByRole('button',{name:'GAP',exact:true}).click();
  await page.getByRole('button',{name:'补一块',exact:true}).click();
  assert.match(await page.locator('.spell-status').textContent(),/G 空位 空位/);
  await page.getByRole('button',{name:'关闭提示'}).click();await spell('AP');await score(21);
  await page.keyboard.press('3');await page.getByRole('button',{name:'提示',exact:true}).click();
  assert.equal(await page.locator('.hint-word strong').textContent(),'BOOK');
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'补一块',exact:true}).click();
  await score(17);await page.getByRole('button',{name:'关闭提示'}).click();
  await spell('CAT');await score(14);await page.waitForTimeout(3000);
  await page.screenshot({path:'artifacts/game-built.png'});
  passed.push('GAP recognition, reversible completion, contextual hints and duplicate letters in BOOK');

  const orb=await project(9.35,1.1,-6.5);await page.mouse.click(orb.x,orb.y);
  await page.getByRole('dialog',{name:'学习记录',exact:true}).waitFor();
  await page.locator('.bar-chart').waitFor({timeout:45000});
  assert.equal(await page.locator('.performance-row').count(),3);
  await page.screenshot({path:'artifacts/game-analysis.png'});
  await page.getByRole('button',{name:'关闭学习分析'}).click();
  passed.push('clicking the 3D observatory runs AVA 4 in the browser');

  const gate=await project(0,1.5,-7.1);await page.mouse.click(gate.x,gate.y);
  await page.getByRole('dialog',{name:'关卡完成'}).waitFor();
  assert.match(await page.locator('.completion-count').textContent(),/14/);
  await page.getByRole('button',{name:'下一关',exact:true}).click();await ready();await score(24);
  assert.equal(await page.locator('.level-number').textContent(),'02');
  passed.push('the open gate advances with a personal remaining-letter score');

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(2000);
  await page.screenshot({path:'artifacts/game-mobile.png'});
  await page.getByRole('button',{name:'字母键盘',exact:true}).click();
  for(const letter of 'SUN')await page.getByRole('button',{name:`输入字母 ${letter}`,exact:true}).click();
  await score(21);await page.screenshot({path:'artifacts/game-mobile-keyboard.png'});
  await page.getByRole('button',{name:'关闭字母键盘'}).click();
  for(const word of LEVELS[1].targets.slice(1))await spell(word);
  await score(0);await page.getByRole('dialog',{name:'关卡完成'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'下一关',exact:true}).click();await ready();
  await page.setViewportSize({width:1440,height:950});await page.waitForTimeout(1000);
  for(const word of LEVELS[2].targets)await spell(word);
  await score(0);await page.getByText('已通关',{exact:true}).waitFor({timeout:10000});
  await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/game-complete.png'});
  passed.push('portrait composition, on-screen letter keyboard and all three levels');

  const stored=await page.evaluate(()=>({progress:JSON.parse(localStorage.getItem('lexi-islands-v3')),records:JSON.parse(localStorage.getItem('lexi-practice-v1'))}));
  assert.equal(stored.records.length,15);assert.equal(stored.progress.best['0'],14);assert.equal(stored.progress.best['1'],0);assert.equal(stored.progress.best['2'],0);
  await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await page.locator('.level-number').textContent(),'03');
  await page.getByRole('button',{name:'暂停',exact:true}).click();await page.getByRole('button',{name:'记录',exact:true}).click();
  await page.locator('.bar-chart').waitFor({timeout:45000});
  assert.match(await page.locator('.ava-footer').textContent(),/15 条记录/);
  passed.push('practice history and single-player progress persist across reloads');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({errors,passed},null,2));
}catch(error){await page.screenshot({path:'artifacts/browser-failure.png'});console.log(await page.locator('body').innerText());throw error;}
finally{await writeFile('artifacts/game-browser-report.json',JSON.stringify({errors,passed},null,2));await browser.close();}
