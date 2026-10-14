const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createStore}=require('../server/store.cjs');
const seed=name=>({v:3,name,coins:500,owned:{1:{at:1,from:'starter'}},shiny:{},partner:1,partnerShiny:false,pupg:{1:{health:2}},stats:{runs:3,bestTime:10},tickets:{t1:2,t10:1},profile:{favs:[],title:''},ach:{},legends:{}});
test('existing and future accounts receive exactly one million, once per account',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-reward-')),file=path.join(dir,'game.sqlite');let store;
 try{
  store=createStore(file,{campaigns:[]});const oldUser=await store.credentials('OldAlice','reward-test-password',true),emptyUser=await store.credentials('OldEmpty','reward-test-password',true);
  const original=store.putSave(oldUser,seed('OldAlice'),0,'a'.repeat(32));store.close();
  store=createStore(file);let old=store.getSave(oldUser.id);assert.equal(old.save.coins,1000500);assert.equal(old.rev,original.rev+1);assert.deepEqual(old.save.owned,original.save.owned);assert.deepEqual(old.save.stats,original.save.stats);
  assert.throws(()=>store.putSave(oldUser,seed('OldAlice'),0,'a'.repeat(32)),e=>e.status===409&&e.current.save.coins===1000500);
  assert.throws(()=>store.putSave(oldUser,original.save,old.rev),e=>e.status===409&&e.current.save.coins===1000500);
  assert.equal(store.getSave(emptyUser.id).save,null);const empty=store.putSave(emptyUser,seed('OldEmpty'),0);assert.equal(empty.save.coins,1000500);
  const freshUser=await store.credentials('NewBob','reward-test-password',true),fresh=store.putSave(freshUser,seed('NewBob'),0,'b'.repeat(32));assert.equal(fresh.save.coins,1000500);
  assert.deepEqual(store.putSave(freshUser,seed('NewBob'),0,'b'.repeat(32)),fresh);
  const spent={...fresh.save,coins:fresh.save.coins-123};assert.equal(store.putSave(freshUser,spent,fresh.rev).save.coins,1000377);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts').get().n,3);
  for(let i=0;i<3;i++)await store.credentials('NewBob','reward-test-password');
  store.close();store=createStore(file);assert.equal(store.getSave(freshUser.id).save.coins,1000377);assert.equal(store.getSave(oldUser.id).save.coins,1000500);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts').get().n,3);
  const forged={...store.getSave(freshUser.id).save,serverRewards:[...store.getSave(freshUser.id).save.serverRewards,{id:'fake-million',coins:999999999}]};const updated=store.putSave(freshUser,forged,store.getSave(freshUser.id).rev);assert.equal(updated.save.coins,1000377);assert.equal(updated.save.serverRewards.length,1);assert.notEqual(updated.save.serverRewards[0].id,'fake-million');
  const rich=await store.credentials('RichUser','reward-test-password',true);const richSave=store.putSave(rich,{...seed('RichUser'),coins:1000000000},0);assert.equal(richSave.save.coins,1001000000);
 }finally{if(store)store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('receipt and credited save roll back together on an interrupted write',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-reward-')),store=createStore(path.join(dir,'game.sqlite'));
 try{
  const user=await store.credentials('AtomicUser','reward-test-password',true);
  store.db.exec("CREATE TRIGGER interrupt_save BEFORE INSERT ON saves BEGIN SELECT RAISE(ABORT, 'test interruption'); END");
  assert.throws(()=>store.putSave(user,seed('AtomicUser'),0),/test interruption/);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts').get().n,0);assert.equal(store.getSave(user.id).save,null);
  store.db.exec('DROP TRIGGER interrupt_save');assert.equal(store.putSave(user,seed('AtomicUser'),0).save.coins,1000500);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts').get().n,1);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
