import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { ref, query, orderByChild, limitToLast, onValue } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { auth, db } from './firebase-config.js?v=72';
import { t } from './i18n.js?v=8';

export function initProfileDuels(){
  const list = document.getElementById('profile-duels-list');
  const title = document.getElementById('profile-duels-title');
  if(!list || !title) return;
  let stopHistory = null;
  let generation = 0;
  let entries = [];
  let status = 'duels.signIn';
  const render = () => {
    title.textContent = t('duels.title');
    list.replaceChildren();
    if(!entries.length){
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = t(status);
      list.append(empty);
      return;
    }
    for(const item of entries){
      const row = document.createElement('div');
      row.className = 'live-item';
      const icon = document.createElement('span');
      icon.textContent = item.won ? '🏆' : '🎮';
      icon.setAttribute('aria-hidden', 'true');
      const details = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'live-name';
      name.textContent = t('duels.opponent', {name:item.opponent || t('common.player')});
      const meta = document.createElement('div');
      meta.className = 'live-time';
      const date = new Date(Number(item.t));
      const when = item.t && Number.isFinite(date.getTime())
        ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2, '0')}` : '—';
      meta.textContent = `${t(item.mode === 'memory' ? 'ranking.memory' : 'ranking.pairs')} · ${when}`;
      details.append(name, meta);
      const result = document.createElement('div');
      result.className = 'live-score';
      result.textContent = t(item.won ? 'duels.won' : 'duels.lost');
      row.append(icon, details, result);
      list.append(row);
    }
  };
  const stopAuth = onAuthStateChanged(auth, user => {
    const currentGeneration = ++generation;
    stopHistory?.();
    stopHistory = null;
    entries = [];
    status = user ? 'duels.loading' : 'duels.signIn';
    render();
    if(!user) return;
    stopHistory = onValue(query(ref(db, `profileDuels/${user.uid}`), orderByChild('t'), limitToLast(50)), snapshot => {
      if(currentGeneration !== generation) return;
      entries = Object.values(snapshot.val() || {}).sort((a,b) => b.t-a.t);
      status = 'duels.empty';
      render();
    }, () => {
      if(currentGeneration !== generation) return;
      entries = [];
      status = 'duels.error';
      render();
    });
  });
  document.addEventListener('memorabet-language-change', render);
  return () => {
    generation++;
    stopAuth();
    stopHistory?.();
    document.removeEventListener('memorabet-language-change', render);
  };
}
