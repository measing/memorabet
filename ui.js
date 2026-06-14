import { K_MAX, TOTAL_PAIRS, C } from './constants.js';
import { gameState, session } from './state.js';
import { escapeHTML, formatMoney } from './utils.js';

export function setAuthModeUI(mode){
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isRepair = mode === 'repair';

  document.getElementById('tab-login')?.classList.toggle('active', isLogin);
  document.getElementById('tab-register')?.classList.toggle('active', isRegister);

  const tabs = document.querySelector('.auth-tabs');
  if(tabs) tabs.style.display = isRepair ? 'none' : 'flex';

  const email = document.getElementById('auth-email');
  const pass = document.getElementById('auth-password');
  const nick = document.getElementById('auth-nickname');

  if(email) email.style.display = isRepair ? 'none' : 'block';
  if(pass) pass.style.display = isRepair ? 'none' : 'block';
  if(nick){
    nick.style.display = (isRegister || isRepair) ? 'block' : 'none';
    if(isRepair) nick.placeholder = 'Elige tu nickname definitivo';
    else nick.placeholder = 'Nickname único';
  }

  const submit = document.getElementById('auth-submit');
  if(submit){
    if(isRepair) submit.textContent = 'Guardar nickname';
    else submit.textContent = isRegister ? 'Crear cuenta' : 'Ingresar';
  }
  showAuthError('');
}

export function showAuthModal(){
  const modal = document.getElementById('auth-modal');
  if(modal) modal.style.display = 'flex';
}

export function hideAuthModal(){
  const modal = document.getElementById('auth-modal');
  if(modal) modal.style.display = 'none';
}

export function showAuthError(text){
  const el = document.getElementById('nickname-error');
  if(el) el.textContent = text;
}

export function showMsg(text, type='info'){
  const m = document.getElementById('msg');
  if(!m) return;
  m.className = `message visible ${type}`;
  m.innerHTML = text;
}

export function renderBoard(onCardClick){
  const board = document.getElementById('board');
  if(!board) return;
  board.innerHTML = '';

  gameState.cards.forEach(card => {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap' + ((card.flipped || card.matched) ? ' flipped':'') + (card.matched ? ' matched':'');
    wrap.dataset.id = card.id;
    wrap.innerHTML = `<div class="card-inner"><div class="card-face card-back"></div><div class="card-face card-front">${card.emoji}</div></div>`;
    if(!card.matched && gameState.playing && !gameState.blocked){
      wrap.addEventListener('click', () => onCardClick(card.id));
    }
    board.appendChild(wrap);
  });
}

export function updateCardClasses(){
  gameState.cards.forEach(card => {
    const wrap = document.querySelector(`.card-wrap[data-id="${card.id}"]`);
    if(!wrap) return;
    wrap.classList.toggle('flipped', card.flipped || card.matched);
    wrap.classList.toggle('matched', card.matched);
  });
}

export function updateStats(){
  const remaining = Math.max(0, K_MAX - gameState.intentos);
  const pares = document.getElementById('pares');
  const intentos = document.getElementById('intentos');
  const ganancia = document.getElementById('ganancia');

  if(pares) pares.textContent = `${gameState.matched} / ${TOTAL_PAIRS}`;
  if(intentos) intentos.textContent = gameState.playing ? remaining : K_MAX;
  if(ganancia){
    ganancia.textContent = formatMoney(gameState.saldo);
    ganancia.className = gameState.saldo >= C ? 'success' : 'danger';
  }
}

export function renderUser(profile){
  if(!profile) return;
  document.getElementById('player-name').textContent = profile.nickname || 'Jugador';
  renderUserStats(profile);
}

export function renderUserStats(stats = {}){
  const games = Number(stats.games || 0);
  const totalPairs = Number(stats.totalPairs || 0);
  const best = Number(stats.best || 0);
  const profit = Number(stats.profit || 0);

  document.getElementById('best-game').textContent = `${best}/${TOTAL_PAIRS}`;
  document.getElementById('hist-games').textContent = games;
  document.getElementById('hist-avg').textContent = games ? (totalPairs/games).toFixed(2) : '0.00';
  document.getElementById('hist-best').textContent = `${best}/${TOTAL_PAIRS}`;
  document.getElementById('hist-profit').textContent = formatMoney(profit);
}


export function setNewGameButtonBusy(isBusy, text = 'Preparando partida...'){
  const btn = document.getElementById('btn-new');
  if(!btn) return;
  btn.disabled = !!isBusy;
  btn.classList.toggle('btn-disabled', !!isBusy);
  btn.textContent = isBusy ? text : '▶ Nueva partida';
}

export function formatDuration(ms){
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function showVictoryAnimation({ tiempoMs, intentos, premio }){
  const old = document.getElementById('victory-overlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'victory-overlay';
  overlay.className = 'victory-overlay';
  overlay.innerHTML = `
    <div class="confetti-layer">${Array.from({ length: 42 }, (_, i) => `<span style="--i:${i}">★</span>`).join('')}</div>
    <div class="victory-box">
      <div class="victory-trophy">🏆</div>
      <h2>¡Felicidades!</h2>
      <p>Encontraste los 8 pares.</p>
      <div class="victory-prize">Premio ficticio: ${formatMoney(premio)}</div>
      <div class="victory-details">
        <span>Tiempo: <strong>${formatDuration(tiempoMs)}</strong></span>
        <span>Intentos: <strong>${intentos}</strong></span>
      </div>
      <button class="btn btn-green" id="victory-close">Cerrar</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('victory-close')?.addEventListener('click', () => overlay.remove());
  setTimeout(() => overlay.classList.add('show'), 20);
}

export function renderLeaderboard(ranking = session.cachedLeaderboard){
  const list = document.getElementById('leaderboard-list');
  if(!list) return;
  if(!ranking.length){
    list.innerHTML = '<p class="empty">Aún nadie completa los 8 pares.</p>';
    return;
  }

  list.innerHTML = ranking.map((item, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
    const isCurrent = session.currentUser && item.uid === session.currentUser.uid;
    return `<div class="ranking-item">
      <div class="ranking-pos">${medal}</div>
      <div>
        <div class="ranking-name ${isCurrent ? 'current':''}">${escapeHTML(item.user || 'Jugador')}</div>
        <div class="ranking-meta">${formatDuration(Number(item.tiempoMs || 0))} · ${Number(item.intentos || 0)} intentos</div>
      </div>
      <div class="ranking-prize">${formatMoney(Number(item.premio || 10000))}</div>
    </div>`;
  }).join('');
}

export function renderLiveHistoryList(history = session.cachedLiveHistory){
  const list = document.getElementById('live-history-list');
  if(!list) return;
  if(!history.length){
    list.innerHTML = '<p class="empty">Sin partidas registradas.</p>';
    return;
  }

  list.innerHTML = history.map(item => {
    const isCurrent = session.currentUser && item.user === session.currentUser.nickname;
    const secs = Math.max(0, Math.floor((Date.now() - (item.t || Date.now()))/1000));
    const when = secs < 8 ? 'Ahora mismo' : `Hace ${secs} seg`;
    return `<div class="live-item">
      <div class="live-avatar">${item.avatar || '🟡'}</div>
      <div><div class="live-name ${isCurrent ? 'current':''}">${escapeHTML(item.user)}</div><div class="live-time">${when}</div></div>
      <div class="live-score">${item.pares}/${K_MAX}</div>
    </div>`;
  }).join('');
}

export function clearBoard(){
  const board = document.getElementById('board');
  if(board) board.innerHTML = '';
}
