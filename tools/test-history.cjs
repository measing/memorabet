const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadFunction(file, name, context){
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf(`export function ${name}(`);
  const end = source.indexOf('\nexport ', start + 1);
  vm.runInNewContext(source.slice(start, end).replace('export ', ''), context);
  return context[name];
}

// Two independent clients receive results from both players and live updates.
for(const base of ['', 'www/']){
  const listeners = [];
  const context = {
    session:{}, db:{}, readLocalHistory:() => [],
    entriesFromData:data => Object.values(data || {}),
    ref:(_, path) => path, orderByChild:key => ({order:key}),
    limitToLast:count => ({limit:count}), query:(...parts) => parts,
    onValue:(query, callback) => {
      assert.equal(query[1].order, 't');
      assert.equal(query[2].limit, 50);
      listeners.push({path:query[0], callback});
      return () => {};
    }
  };
  const listen = loadFunction(base+'database.js', 'listenLiveHistory', context);
  let first, second;
  const stopFirst = listen(items => first=items);
  const stopSecond = listen(items => second=items);
  const data = {a:{uid:'alice', t:1}, b:{uid:'bob', t:2}, online_duel_alice:{uid:'alice', t:4}, duel:{uid:'bob', mode:'memory', t:5}};
  const emit = () => listeners.filter(l => l.path === 'historial')
    .forEach(l => l.callback({val:() => data}));
  emit();
  assert.equal(first.map(i => i.uid).join(','), 'bob,alice');
  assert.equal(second.map(i => i.uid).join(','), 'bob,alice');
  data.c={uid:'alice', t:3}; emit();
  assert.equal(first[0].t, 3);
  assert.equal(second[0].t, 3);
  stopFirst(); stopSecond();

  const list = {};
  const render = loadFunction(base+'ui.js', 'renderLiveHistoryList', {
    session:{}, document:{getElementById:() => list},
    getEntryName:item => item.user, renderEntryAvatar:() => '',
    escapeHTML:value => value, TOTAL_PAIRS:8, t:key => key
  });
  render([{user:'Alice', pares:4, t:new Date(2026,8,30,12).getTime()}]);
  assert.match(list.innerHTML, /30\/09/);
  assert.doesNotMatch(list.innerHTML, /secondsAgo|Hace /);
  render([{user:'Bob', pares:2}]);
  assert.match(list.innerHTML, /—/);
}

// Exercise the actual write predicate: own new entries only, no impersonation.
const rules=JSON.parse(fs.readFileSync('firebase-rules.json','utf8')).rules;
const node = value => ({
  exists:() => value != null, val:() => value,
  child:key => node(value?.[key])
});
const canWrite = (auth, existing, entry) => vm.runInNewContext(
  rules.historial.$entry['.write'], {
    auth, data:node(existing), newData:node(entry),
    root:node({users:{alice:{nickname:'Alice'}}})
  });
const entry={uid:'alice', user:'Alice'};
assert.equal(canWrite({uid:'alice'}, null, entry), true);
assert.equal(canWrite({uid:'bob'}, null, entry), false);
assert.equal(canWrite(null, null, entry), false);
assert.equal(canWrite({uid:'alice'}, entry, entry), false);
assert.equal(canWrite({uid:'alice'}, entry, null), false);
assert.equal(canWrite({uid:'alice'}, null, {...entry, user:'Bob'}), false);
assert.equal(rules.ranking.$uid['.write'], false);
async function checkOnlineHistory(){
  const source = fs.readFileSync('functions/index.js', 'utf8');
  const start = source.indexOf('exports.settleOnlineRoom =');
  const end = source.indexOf('\nexports.', start + 1);
  const room = {
    economyVersion:1, hostUid:'alice', status:'finished', winnerUid:'alice', wager:500, pot:1000,
    intentos:14, players:{alice:{uid:'alice', score:5}, bob:{uid:'bob', score:3}}
  };
  let published, publications=0;
  const balances={alice:1500,bob:1500};
  const roomRef = {
    get:async () => ({exists:() => true, val:() => room}),
    child:() => ({transaction:async updater => {
      const next = updater(room.economySettled);
      if(next === undefined) return {committed:false};
      room.economySettled=next;
      return {committed:true};
    }}),
    update:async patch => Object.assign(room, patch)
  };
  const context = {
    exports:{}, onCall:(_, handler) => handler, PROTECTED_CALL_OPTIONS:{},
    assertAppCheck:() => {}, assertParticipant:() => {}, requireAuth:() => 'alice',
    db:{ref:path => path ? roomRef : {update:async entries => {
      published=entries; publications++;
    }}},
    ONLINE_WAGERS:new Set([500]), ONLINE_WIN_CUPS:{}, ONLINE_LOSE_CUPS:{},
    randomInt:() => 25, applyOnlineResult:async (uid, result) => {balances[uid]+=result.saldoDelta;}, now:() => 123,
    getProfile:async uid => ({nickname:uid, avatar:'avatar.png'}),
    safeName:p => p.nickname, safeAvatar:p => p.avatar
  };
  vm.runInNewContext(source.slice(start,end), context);
  await context.exports.settleOnlineRoom({data:{roomId:'duel'}});
  assert.equal(Object.keys(published).length, 2);
  assert.equal(Object.keys(published).some(key => key.startsWith('historial/')), false);
  assert.equal(published['profileDuels/alice/duel'].won, true);
  assert.equal(published['profileDuels/bob/duel'].won, false);
  assert.equal(published['profileDuels/alice/duel'].pares, 5);
  assert.equal(published['profileDuels/bob/duel'].pares, 3);
  assert.equal(published['profileDuels/alice/duel'].net, 500);
  assert.equal(published['profileDuels/bob/duel'].net, -500);
  await context.exports.settleOnlineRoom({data:{roomId:'duel'}});
  assert.equal(publications, 1);
  assert.equal(balances.alice,2500);
  assert.equal(balances.bob,1500);
}
checkOnlineHistory().then(() => {
  console.log('History checks passed: shared updates, DD/MM dates, write ownership, both duel players, no duplicate settlement.');
}).catch(error => { console.error(error); process.exitCode=1; });
