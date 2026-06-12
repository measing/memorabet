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

  document.getElementById('best-game').textContent = `${best}/${K_MAX}`;
  document.getElementById('hist-games').textContent = games;
  document.getElementById('hist-avg').textContent = games ? (totalPairs/games).toFixed(2) : '0.00';
  document.getElementById('hist-best').textContent = `${best}/${K_MAX}`;
  document.getElementById('hist-profit').textContent = formatMoney(profit);
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
