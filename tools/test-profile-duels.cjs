const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function element(){
  return {children:[], textContent:'', append(...children){this.children.push(...children);},
    replaceChildren(){this.children=[];}, setAttribute(){}};
}
for(const base of ['', 'www/']){
  const list=element(), title=element();
  let authChanged, cancelled=0;
  const subscriptions=[];
  const context={
    auth:{}, db:{}, t:(key, params) => params?.name || key,
    document:{getElementById:id => id.endsWith('title') ? title : list,
      createElement:element, addEventListener(){}, removeEventListener(){}},
    onAuthStateChanged:(_, callback) => {authChanged=callback; return () => {};},
    ref:(_, path) => path, query:(...parts) => parts,
    orderByChild:key => key, limitToLast:n => n,
    onValue:(query, callback, error) => {
      subscriptions.push({query, callback, error});
      return () => {cancelled++;};
    }
  };
  const source=fs.readFileSync(base+'profile-duels.js','utf8')
    .replace(/^import .*;\r?\n/gm,'').replace('export function','function');
  vm.runInNewContext(source,context);
  const stop=context.initProfileDuels();
  authChanged({uid:'alice'});
  assert.equal(subscriptions[0].query[0], 'profileDuels/alice');
  const data={a:{opponent:'<img src=x>', mode:'memory', won:true, t:new Date(2026,8,30,12).getTime()}};
  subscriptions[0].callback({val:() => data});
  assert.equal(list.children[0].children[1].children[0].textContent, '<img src=x>');
  assert.match(list.children[0].children[1].children[1].textContent, /30\/09/);
  assert.equal(list.children[0].children[2].textContent, 'duels.won');
  authChanged({uid:'bob'});
  assert.equal(cancelled,1);
  assert.equal(subscriptions[1].query[0], 'profileDuels/bob');
  subscriptions[0].callback({val:() => data});
  assert.equal(list.children[0].textContent,'duels.loading');
  subscriptions[1].error();
  assert.equal(list.children[0].textContent,'duels.error');
  authChanged(null);
  assert.equal(list.children[0].textContent,'duels.signIn');
  stop();
}
const rule=JSON.parse(fs.readFileSync('firebase-rules.json','utf8')).rules.profileDuels.$uid;
for(const [auth, allowed] of [[{uid:'alice'},true],[{uid:'bob'},false],[null,false]]){
  assert.equal(vm.runInNewContext(rule['.read'],{auth,$uid:'alice'}),allowed);
}
assert.equal(rule['.write'],false);
console.log('Profile duels passed: display, account switching, stale callbacks, errors, private access.');
