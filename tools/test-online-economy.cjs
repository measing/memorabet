const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function load(file, name, context){
  const source=fs.readFileSync(file,'utf8');
  const start=source.search(new RegExp(`^(?:export )?(?:async )?function ${name}\\(`,'m'));
  assert.ok(start >= 0, name);
  const tail=source.slice(start);
  const next=tail.slice(1).search(/^(?:export )?(?:async )?function /m);
  vm.runInNewContext((next < 0 ? tail : tail.slice(0,next+1)).replace(/^export /,''),context);
  return context[name];
}

async function run(){
  for(const base of ['', 'www/']){
    const create=load(base+'database.js','createOnlineRoom',{
      createOnlineRoomServer:async ({wager}) => ({room:{id:'room'},saldo:2000-wager})
    });
    assert.equal((await create('classic',{uid:'alice'},500)).saldoAfterEntry,1500);
    const join=load(base+'database.js','joinOnlineRoom',{
      joinOnlineRoomServer:async ({roomId,wager}) => ({room:{id:roomId},saldo:2000-wager})
    });
    assert.equal((await join('room',{uid:'bob'},500)).saldoAfterEntry,1500);
    const unavailable=load(base+'database.js','createOnlineRoom',{
      createOnlineRoomServer:async () => {throw Error('unavailable');}
    });
    await assert.rejects(unavailable('classic',{uid:'alice'},500),/unavailable/);
    let settled;
    const settle=load(base+'game.js','settleOnlineEconomy',{
      settleOnlineRoomServer:async id => {settled=id; return {pot:1000};}
    });
    assert.equal((await settle({id:'room'})).pot,1000);
    assert.equal(settled,'room');

    const state={saldo:2000,onlineWager:500,gananciaPartida:-500};
    const context={gameState:state,session:{currentUser:{uid:'alice'}},
      isGuestUser:() => false, listFromFirebase:players => Object.values(players || {}),
      updateStats:() => {}, activeOnlineRoom:null,
      getUserProfile:async () => ({saldo:2000}),
      syncCurrentUserEconomy:profile => {state.saldo=profile.saldo;},
      removeOnlineRoom:async () => ({ok:true,saldo:2000})};
    const refund=load(base+'game.js','refundPendingOnlineEntry',context);
    await refund(null);
    assert.equal(state.saldo,2000,'failed entry must not mint a refund');
    state.saldo=1500; state.onlineWager=500; state.gananciaPartida=-500;
    await refund({id:'room',status:'waiting',players:{alice:{uid:'alice'}}});
    assert.equal(state.saldo,2000);
    await refund({id:'room',status:'waiting',players:{alice:{uid:'alice'}}});
    assert.equal(state.saldo,2000,'repeat cancellation cannot add coins');
    state.onlineWager=500; state.gananciaPartida=-500; state.saldo=1500;
    context.removeOnlineRoom=async () => {throw Error('offline');};
    await assert.rejects(refund({id:'room',status:'waiting'}),/offline/);
    assert.equal(state.saldo,1500,'failed refund cannot change balance');
  }
  console.log('Online economy passed: server entry charges, server settlement, no phantom or duplicate refunds.');
}
run().catch(error => {console.error(error);process.exitCode=1;});
