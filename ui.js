import { K_MAX, TOTAL_PAIRS, C } from './constants.js?v=71';
import { gameState, session } from './state.js?v=72';
import { escapeHTML, formatMoney } from './utils.js?v=71';
import { updateSaldo, updateUserAvatar, updateUserCardSkins } from './database.js?v=74';

const AVATAR_STORAGE_KEY = 'memorabetSelectedAvatar';
const AVATARS = Array.from({ length: 36 }, (_, i) => `assets/avatars/avatar-${String(i + 1).padStart(2, '0')}.png`);
const DEFAULT_AVATAR = AVATARS[0];
const CARD_SKIN_OWNED_KEY = 'memorabetOwnedCardSkins';
const CARD_SKIN_SELECTED_KEY = 'memorabetSelectedCardSkin';
const DEFAULT_CARD_SKIN_ID = 'default';
const CARD_SKINS = [
  { id:DEFAULT_CARD_SKIN_ID, name:'Predeterminado', price:0, src:'', default:true },
  { id:'red', name:'Carta Roja', price:15000, src:'assets/card-backs/skin-red.png' },
  { id:'green', name:'Carta Verde', price:15000, src:'assets/card-backs/skin-green.png' },
  { id:'blue', name:'Carta Azul', price:15000, src:'assets/card-backs/skin-blue.png' },
  { id:'gold', name:'Carta Dorada', price:20000, src:'assets/card-backs/skin-gold.png' }
];
let selectedRankingBoard = 'solo';

function isGuestUser(){
  return !!session.currentUser?.isGuest;
}

export function getSelectedAvatar(){
  if(AVATARS.includes(session.currentUser?.avatar)) return session.currentUser.avatar;
  const saved = localStorage.getItem(getAvatarStorageKey());
  return AVATARS.includes(saved) ? saved : DEFAULT_AVATAR;
}

function applySelectedAvatar(src = getSelectedAvatar()){
  document.querySelectorAll('[data-avatar-display]').forEach(el => {
    el.style.backgroundImage = `url("${src}")`;
  });

  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.avatar === src);
  });
}

function getAvatarStorageKey(){
  return session.currentUser?.uid ? `${AVATAR_STORAGE_KEY}:${session.currentUser.uid}` : `${AVATAR_STORAGE_KEY}:guest`;
}

function getOwnedCardSkins(){
  const profileOwned = session.currentUser?.ownedCardSkins;
  if(Array.isArray(profileOwned)) return [...new Set(profileOwned.filter(id => CARD_SKINS.some(skin => skin.id === id && !skin.default)))];

  try{
    const owned = JSON.parse(localStorage.getItem(getCardSkinStorageKey(CARD_SKIN_OWNED_KEY)) || '[]');
    return Array.isArray(owned) ? owned.filter(id => CARD_SKINS.some(skin => skin.id === id && !skin.default)) : [];
  }catch{
    return [];
  }
}

function setOwnedCardSkins(owned){
  const clean = [...new Set(owned.filter(id => CARD_SKINS.some(skin => skin.id === id && !skin.default)))];
  if(session.currentUser) session.currentUser.ownedCardSkins = clean;
  localStorage.setItem(getCardSkinStorageKey(CARD_SKIN_OWNED_KEY), JSON.stringify(clean));
}

function getSelectedCardSkin(){
  const owned = getOwnedCardSkins();
  const selected = session.currentUser?.selectedCardSkin || localStorage.getItem(getCardSkinStorageKey(CARD_SKIN_SELECTED_KEY)) || DEFAULT_CARD_SKIN_ID;
  const skin = CARD_SKINS.find(item => item.id === selected);
  if(!skin) return CARD_SKINS[0];
  if(skin.default || owned.includes(skin.id)) return skin;
  return CARD_SKINS[0];
}

function getCardSkinStorageKey(base){
  return session.currentUser?.uid ? `${base}:${session.currentUser.uid}` : `${base}:guest`;
}

async function saveCardSkinState(owned, selectedId){
  const cleanOwned = [...new Set(owned.filter(id => CARD_SKINS.some(skin => skin.id === id && !skin.default)))];
  const cleanSelected = CARD_SKINS.some(skin => skin.id === selectedId) ? selectedId : DEFAULT_CARD_SKIN_ID;

  setOwnedCardSkins(cleanOwned);
  if(session.currentUser) session.currentUser.selectedCardSkin = cleanSelected;
  localStorage.setItem(getCardSkinStorageKey(CARD_SKIN_SELECTED_KEY), cleanSelected);

  if(session.currentUser && !isGuestUser()){
    await updateUserCardSkins(session.currentUser.uid, cleanOwned, cleanSelected);
  }
}

function showStoreStatus(text, type='info'){
  const status = document.getElementById('store-status');
  if(!status) return;
  status.textContent = text;
  status.className = `store-status visible ${type}`;
}

function applySelectedCardSkin(){
  const selected = getSelectedCardSkin();
  if(selected && !selected.default) document.documentElement.style.setProperty('--card-back-skin', `url("${selected.src}")`);
  else document.documentElement.style.removeProperty('--card-back-skin');

  document.querySelectorAll('.skin-card').forEach(card => {
    card.classList.toggle('equipped', card.dataset.skinId === selected?.id);
  });
}

function renderCardSkinStore(){
  const store = document.getElementById('card-skin-store');
  if(!store) return;

  const owned = getOwnedCardSkins();
  const selected = getSelectedCardSkin();

  store.innerHTML = CARD_SKINS.map(skin => {
    const isOwned = skin.default || owned.includes(skin.id);
    const isEquipped = selected?.id === skin.id;
    const action = isEquipped ? 'En uso' : isOwned ? (skin.default ? 'Usar' : 'Equipar') : 'Comprar';
    const price = skin.default ? 'Gratis' : formatMoney(skin.price);
    return `
      <article class="shop-item skin-card ${isEquipped ? 'equipped' : ''}" data-skin-id="${skin.id}">
        <div class="skin-preview">
          <div class="skin-art ${skin.default ? 'default-skin-preview' : ''}" ${skin.default ? '' : `style="background-image:url('${skin.src}')"`}>
            ${skin.default ? '<span>✧</span>' : ''}
          </div>
        </div>
        <div class="skin-info">
          <strong>${escapeHTML(skin.name)}</strong>
          <span>${price}</span>
        </div>
        <button class="skin-action" type="button" data-skin-action="${skin.id}" ${isEquipped ? 'disabled' : ''}>${action}</button>
      </article>
    `;
  }).join('');

  store.querySelectorAll('[data-skin-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const skin = CARD_SKINS.find(item => item.id === btn.dataset.skinAction);
      if(!skin) return;
      const currentOwned = getOwnedCardSkins();

      if(skin.default || currentOwned.includes(skin.id)){
        await saveCardSkinState(currentOwned, skin.id);
        applySelectedCardSkin();
        renderCardSkinStore();
        showStoreStatus(`${skin.name} equipado.`, 'success');
        return;
      }

      if(!session.currentUser || isGuestUser()){
        showStoreStatus('Inicia sesión para comprar cartas.', 'warning');
        return;
      }

      if(gameState.saldo < skin.price){
        showStoreStatus(`Saldo insuficiente. Necesitas ${formatMoney(skin.price)}.`, 'danger');
        return;
      }

      gameState.saldo -= skin.price;
      await updateSaldo(session.currentUser.uid, gameState.saldo);
      currentOwned.push(skin.id);
      await saveCardSkinState(currentOwned, skin.id);
      updateStats();
      applySelectedCardSkin();
      renderCardSkinStore();
      showStoreStatus(`${skin.name} comprada y equipada.`, 'success');
    });
  });
}

function renderEntryAvatar(avatar, label){
  const value = String(avatar || '');
  if(value.startsWith('assets/avatars/')){
    return `<img src="${escapeHTML(value)}" alt="${escapeHTML(label)}" />`;
  }
  return `<span>${escapeHTML(value || '●')}</span>`;
}

export function setAuthModeUI(mode){
  const isChoice = mode === 'choice';
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isRepair = mode === 'repair';

  document.getElementById('tab-login')?.classList.toggle('active', isLogin);
  document.getElementById('tab-register')?.classList.toggle('active', isRegister);

  const tabs = document.querySelector('.auth-tabs');
  if(tabs){
    tabs.style.display = isRepair ? 'none' : 'grid';
    tabs.classList.toggle('choice-mode', isChoice);
  }

  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  if(loginTab) loginTab.textContent = isChoice ? 'Iniciar sesion' : 'Ingresar';
  if(registerTab) registerTab.textContent = 'Crear cuenta';

  const email = document.getElementById('auth-email');
  const pass = document.getElementById('auth-password');
  const nick = document.getElementById('auth-nickname');

  if(email) email.style.display = (isChoice || isRepair) ? 'none' : 'block';
  if(pass) pass.style.display = (isChoice || isRepair) ? 'none' : 'block';
  if(nick){
    nick.style.display = (isRegister || isRepair) ? 'block' : 'none';
    if(isRepair) nick.placeholder = 'Elige tu nickname definitivo';
    else nick.placeholder = 'Nickname único';
  }

  const submit = document.getElementById('auth-submit');
  if(submit){
    submit.style.display = isChoice ? 'none' : 'flex';
    if(isRepair) submit.textContent = 'Guardar nickname';
    else submit.textContent = isRegister ? 'Crear cuenta' : 'Ingresar';
  }

  const guest = document.getElementById('btn-guest');
  if(guest) guest.style.display = (isChoice || isLogin) ? 'flex' : 'none';
  const google = document.getElementById('auth-google');
  if(google) google.style.display = 'none';
  const googleChoice = document.getElementById('auth-google-choice');
  if(googleChoice) googleChoice.style.display = isChoice ? 'flex' : 'none';
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

export function hideMsg(){
  const m = document.getElementById('msg');
  if(!m) return;
  m.className = 'message';
  m.textContent = '';
}

export function setStartPanelVisible(isVisible){
  const panel = document.getElementById('start-game-panel');
  if(panel) panel.classList.toggle('hidden', !isVisible);
}

export function renderBoard(onCardClick){
  const board = document.getElementById('board');
  if(!board) return;
  setStartPanelVisible(false);
  board.innerHTML = '';

  gameState.cards.forEach(card => {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap' + ((card.flipped || card.matched) ? ' flipped':'') + (card.matched ? ' matched':'');
    wrap.dataset.id = card.id;
    wrap.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front">
          <img class="animal-card-img" src="${escapeHTML(card.src)}" alt="${escapeHTML(card.name)}" />
        </div>
      </div>`;
    if(onCardClick){
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
  const localDuel = !!gameState.localDuel?.active;
  const onlineDuel = !!gameState.onlineRoom?.id;
  const onlineStatus = gameState.onlineRoom?.status || '';
  const onlineSearching = ['searching', 'waiting', 'ready'].includes(onlineStatus);
  const roundActive = gameState.starting || gameState.playing || gameState.cards.length > 0;
  const startPanel = document.getElementById('start-game-panel');
  const onlineWaiting = document.getElementById('online-waiting');
  const onlineWaitingText = document.getElementById('online-waiting-text');
  const controlsActive = roundActive && (!!startPanel?.classList.contains('hidden') || onlineDuel);
  const duel = gameState.localDuel || {};
  const pares = document.getElementById('pares');
  const roundNumber = document.getElementById('round-number');
  const intentos = document.getElementById('intentos');
  const ganancia = document.getElementById('ganancia');
  const profileBalance = document.getElementById('profile-balance');
  const tiempo = document.getElementById('tiempo');
  const duelPanel = document.getElementById('local-duel-panel');
  const duelPlayer1 = document.getElementById('duel-player-1');
  const duelPlayer2 = document.getElementById('duel-player-2');
  const duelName1 = document.getElementById('duel-name-1');
  const duelName2 = document.getElementById('duel-name-2');
  const duelAvatar1 = document.getElementById('duel-avatar-1');
  const duelAvatar2 = document.getElementById('duel-avatar-2');
  const duelScore1 = document.getElementById('duel-score-1');
  const duelScore2 = document.getElementById('duel-score-2');
  const duelTurn = document.getElementById('duel-turn');
  document.body.classList.toggle('game-round-active', roundActive);
  document.body.classList.toggle('game-controls-active', controlsActive);
  document.body.classList.toggle('local-duel-active', localDuel);
  document.body.classList.toggle('online-duel-active', onlineDuel);
  startPanel?.classList.toggle('online-searching', onlineSearching);
  if(onlineWaiting) onlineWaiting.hidden = !onlineSearching;
  if(onlineWaitingText){
    onlineWaitingText.textContent = onlineStatus === 'ready'
      ? 'Rival encontrado'
      : 'Buscando rival online...';
  }

  if(roundNumber){
    const visibleRound = localDuel
      ? (duel.mode === 'memory' ? '1' : (duel.suddenDeath ? 'SD' : String(duel.round || 1)))
      : String(gameState.round || 1);
    roundNumber.textContent = visibleRound;
  }
  if(pares) pares.textContent = `${gameState.matched} / ${TOTAL_PAIRS}`;
  if(intentos) intentos.textContent = localDuel ? gameState.intentos : (gameState.playing ? remaining : K_MAX);
  if(tiempo){
    const end = gameState.endTime || Date.now();
    const elapsed = gameState.startTime ? end - gameState.startTime : 0;
    tiempo.textContent = formatDuration(elapsed);
  }
  if(duelPanel){
    duelPanel.hidden = !localDuel;
    if(localDuel){
      const [p1, p2] = duel.players;
      duelPlayer1?.classList.toggle('active', gameState.localDuel.current === 0);
      duelPlayer2?.classList.toggle('active', gameState.localDuel.current === 1);
      if(duelName1) duelName1.textContent = p1?.name || 'Jugador 1';
      if(duelName2) duelName2.textContent = p2?.name || 'Jugador 2';
      if(duelAvatar1) duelAvatar1.style.backgroundImage = p1?.avatar ? `url("${p1.avatar}")` : '';
      if(duelAvatar2) duelAvatar2.style.backgroundImage = p2?.avatar ? `url("${p2.avatar}")` : '';
      if(duelScore1) duelScore1.textContent = p1?.score ?? 0;
      if(duelScore2) duelScore2.textContent = p2?.score ?? 0;
      if(duelTurn){
        const wins = Array.isArray(duel.roundWins) ? duel.roundWins : [0, 0];
        const activePlayer = duel.players[duel.current] || duel.players[0] || { name:'Jugador 1' };
        const baseTurn = duel.suddenDeath
          ? `Muerte subita: turno de ${activePlayer.name}`
          : `Turno de ${activePlayer.name}`;
        const turnText = duel.statusText || (roundActive
          ? (duel.mode === 'memory' ? `${baseTurn} · Primero a 8 pares` : `${baseTurn} · Rondas ${wins[0]}-${wins[1]}`)
          : '');
        duelTurn.textContent = turnText;
        duelTurn.hidden = !turnText;
      }
    }
  }
  if(ganancia){
    ganancia.textContent = formatMoney(gameState.saldo);
    ganancia.className = gameState.saldo >= C ? 'success' : 'danger';
  }
  if(profileBalance) profileBalance.textContent = localDuel ? (onlineDuel ? 'Modo online' : 'Modo offline') : formatMoney(gameState.saldo);

  const newBtn = document.getElementById('btn-new');
  if(newBtn && !newBtn.disabled){
    if(localDuel){
      if(duel.matchOver) newBtn.textContent = '▶ Nueva partida';
      else if(!gameState.playing && !gameState.starting && gameState.cards.length){
        newBtn.textContent = duel.mode === 'memory' ? '▶ Nueva partida' : (duel.suddenDeath ? '▶ Muerte subita' : `▶ Ronda ${duel.round || 1}`);
      }else newBtn.textContent = '▶ Nueva partida';
    }else newBtn.textContent = '▶ Nueva partida';
  }
}

export function renderUser(profile){
  if(!profile) return;
  document.getElementById('player-name').textContent = profile.nickname || 'Jugador';
  session.cups = Number(profile.cups ?? profile.goldCups ?? 0);
  session.medals = Number(profile.medals ?? profile.silverCups ?? 0);
  session.trophies = Number(profile.trophies ?? (session.cups + session.medals) ?? 0);
  const profileName = document.getElementById('profile-name');
  if(profileName) profileName.textContent = profile.nickname || 'Jugador';
  const profileAvatar = AVATARS.includes(profile.avatar) ? profile.avatar : getSelectedAvatar();
  if(session.currentUser) session.currentUser.avatar = profileAvatar;
  localStorage.setItem(getAvatarStorageKey(), profileAvatar);
  applySelectedAvatar(profileAvatar);
  if(session.currentUser){
    session.currentUser.ownedCardSkins = Array.isArray(profile.ownedCardSkins) ? profile.ownedCardSkins : [];
    session.currentUser.selectedCardSkin = profile.selectedCardSkin || DEFAULT_CARD_SKIN_ID;
    localStorage.setItem(getCardSkinStorageKey(CARD_SKIN_OWNED_KEY), JSON.stringify(session.currentUser.ownedCardSkins));
    localStorage.setItem(getCardSkinStorageKey(CARD_SKIN_SELECTED_KEY), session.currentUser.selectedCardSkin);
  }
  applySelectedCardSkin();
  renderCardSkinStore();
  renderUserStats(profile);
}

export function renderUserStats(stats = {}){
  const games = Number(stats.games || 0);
  const totalPairs = Number(stats.totalPairs || 0);
  const best = Number(stats.best || 0);
  const profit = Number(stats.profit || 0);
  const cups = Number(stats.cups ?? stats.goldCups ?? session.cups ?? 0);
  const medals = Number(stats.medals ?? stats.silverCups ?? session.medals ?? 0);

  const playerCups = document.getElementById('player-cups');
  const playerMedals = document.getElementById('player-medals');
  const histCups = document.getElementById('hist-cups');
  const histMedals = document.getElementById('hist-medals');
  const histGames = document.getElementById('hist-games');
  const histAvg = document.getElementById('hist-avg');
  const histBest = document.getElementById('hist-best');
  const histProfit = document.getElementById('hist-profit');

  if(playerCups) playerCups.textContent = cups;
  if(playerMedals) playerMedals.textContent = medals;
  if(histCups) histCups.textContent = cups;
  if(histMedals) histMedals.textContent = medals;
  if(histGames) histGames.textContent = games;
  if(histAvg) histAvg.textContent = games ? (totalPairs/games).toFixed(2) : '0.00';
  if(histBest) histBest.textContent = `${best}/${TOTAL_PAIRS}`;
  if(histProfit) histProfit.textContent = formatMoney(profit);
}


export function setNewGameButtonBusy(isBusy, text = 'Preparando partida...'){
  const buttons = [
    document.getElementById('btn-start-center'),
    document.getElementById('btn-new')
  ].filter(Boolean);
  buttons.forEach(btn => {
    btn.disabled = !!isBusy;
    btn.classList.toggle('btn-disabled', !!isBusy);
    btn.textContent = isBusy ? text : (btn.id === 'btn-start-center' ? 'Comenzar juego' : '▶ Nueva partida');
  });
  const picker = document.getElementById('btn-mode-picker');
  if(picker){
    picker.disabled = !!isBusy;
    picker.classList.toggle('btn-disabled', !!isBusy);
  }
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

export function showOnlineVictoryAnimation({ winnerName = 'Jugador', reason = 'Partida online terminada.', pot = 0, cupText = '', autoCloseMs = 3200 } = {}){
  const old = document.getElementById('victory-overlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'victory-overlay';
  overlay.className = 'victory-overlay';
  overlay.innerHTML = `
    <div class="confetti-layer">${Array.from({ length: 42 }, (_, i) => `<span style="--i:${i}">*</span>`).join('')}</div>
    <div class="victory-box">
      <div class="victory-trophy">🏆</div>
      <h2>Ganador</h2>
      <p>${escapeHTML(reason)}</p>
      <div class="victory-prize">${escapeHTML(winnerName)}</div>
      <div class="victory-details">
        ${pot ? `<span>Pozo: <strong>${formatMoney(pot)}</strong></span>` : ''}
        ${cupText ? `<span>Premio: <strong>${escapeHTML(cupText)}</strong></span>` : ''}
        <span>Volviendo al lobby...</span>
      </div>
      <button class="btn btn-green" id="victory-close">Buscar partida</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('victory-close')?.addEventListener('click', () => overlay.remove());
  setTimeout(() => overlay.classList.add('show'), 20);
  if(autoCloseMs > 0) setTimeout(() => overlay.remove(), autoCloseMs);
}

export function renderLeaderboard(ranking = session.cachedLeaderboard){
  const list = document.getElementById('leaderboard-list');
  if(!list) return;
  const boards = Array.isArray(ranking) ? { solo:ranking, silver:[], gold:[] } : {
    solo:ranking?.solo || [],
    silver:ranking?.silver || [],
    gold:ranking?.gold || []
  };

  const renderSolo = items => {
    if(!items.length) return '<p class="empty">Aun nadie completa los 8 pares.</p>';
    return items.map((item, idx) => {
      const isCurrent = session.currentUser && item.uid === session.currentUser.uid;
      return `<div class="ranking-item">
        <div class="entry-avatar ranking-avatar">${renderEntryAvatar(item.avatar, item.user || 'Jugador')}</div>
        <div>
          <div class="ranking-name ${isCurrent ? 'current':''}">#${idx + 1} ${escapeHTML(item.user || 'Jugador')}</div>
          <div class="ranking-meta">${formatDuration(Number(item.tiempoMs || 0))} &middot; ${Number(item.intentos || 0)} intentos</div>
        </div>
        <div class="ranking-prize">${formatMoney(Number(item.premio || 10000))}</div>
      </div>`;
    }).join('');
  };

  const renderCups = (items, type) => {
    const isGold = type === 'gold';
    const label = isGold ? 'Copa dorada' : 'Medalla';
    const empty = isGold ? 'Aun no hay copas en este modo.' : 'Aun no hay medallas en este modo.';
    const icon = isGold ? '&#127942;' : '&#127941;';
    if(!items.length) return `<p class="empty">${empty}</p>`;
    return items.map((item, idx) => {
      const isCurrent = session.currentUser && item.uid === session.currentUser.uid;
      return `<div class="ranking-item">
        <div class="entry-avatar ranking-avatar">${renderEntryAvatar(item.avatar, item.user || 'Jugador')}</div>
        <div>
          <div class="ranking-name ${isCurrent ? 'current':''}">#${idx + 1} ${escapeHTML(item.user || 'Jugador')}</div>
          <div class="ranking-meta">${label}</div>
        </div>
        <div class="ranking-cups ranking-cups-${type}"><span>${icon}</span>${Number(item.cups || 0)}</div>
      </div>`;
    }).join('');
  };

  const views = {
    solo:{
      title:'Solo: 8 pares acertados',
      label:'Solo',
      body:renderSolo(boards.solo)
    },
    silver:{
      title:'Duelo de Pares',
      label:'Pares',
      badge:'Medallas',
      body:renderCups(boards.silver, 'silver')
    },
    gold:{
      title:'Duelo de Memoria',
      label:'Memoria',
      badge:'Copas doradas',
      body:renderCups(boards.gold, 'gold')
    }
  };
  if(!views[selectedRankingBoard]) selectedRankingBoard = 'solo';
  const current = views[selectedRankingBoard];

  list.innerHTML = `
    <div class="ranking-switcher" role="tablist" aria-label="Ranking de juego">
      ${Object.entries(views).map(([key, view]) => `
        <button class="ranking-switch ${key === selectedRankingBoard ? 'active' : ''}" type="button" data-ranking-board="${key}" role="tab" aria-selected="${key === selectedRankingBoard}">
          ${escapeHTML(view.label)}
        </button>
      `).join('')}
    </div>
    <section class="ranking-section ranking-section-${selectedRankingBoard}">
      <h2>${escapeHTML(current.title)}${current.badge ? `<span>${escapeHTML(current.badge)}</span>` : ''}</h2>
      ${current.body}
    </section>
  `;

  list.querySelectorAll('[data-ranking-board]').forEach(button => {
    button.addEventListener('click', () => {
      selectedRankingBoard = button.dataset.rankingBoard || 'solo';
      renderLeaderboard(ranking);
    });
  });
}

function renderLeaderboardLegacy(ranking = session.cachedLeaderboard){
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
      <div class="entry-avatar ranking-avatar">${renderEntryAvatar(item.avatar, item.user || 'Jugador')}</div>
      <div>
        <div class="ranking-name ${isCurrent ? 'current':''}">${medal} ${escapeHTML(item.user || 'Jugador')}</div>
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
      <div class="entry-avatar live-avatar">${renderEntryAvatar(item.avatar, item.user || 'Jugador')}</div>
      <div><div class="live-name ${isCurrent ? 'current':''}">${escapeHTML(item.user)}</div><div class="live-time">${when}</div></div>
      <div class="live-score">${item.pares}/${TOTAL_PAIRS}</div>
    </div>`;
  }).join('');
}

export function clearBoard(){
  const board = document.getElementById('board');
  if(board){
    board.innerHTML = '';
    delete board.dataset.layoutSignature;
  }
  setStartPanelVisible(true);
}

export function showView(viewName){
  const target = viewName || 'game';
  document.querySelectorAll('.screen-view').forEach(view => {
    view.classList.toggle('active', view.dataset.view === target);
  });

  document.querySelectorAll('[data-view-target]').forEach(btn => {
    const isActive = btn.dataset.viewTarget === target;
    btn.classList.toggle('active', isActive);
    if(isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  if(target === 'store') renderCardSkinStore();
}

export function initViewNavigation(){
  document.querySelectorAll('[data-view-target]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.viewTarget));
  });
}

export function initProfileAvatars(){
  const picker = document.getElementById('avatar-picker');
  if(picker){
    picker.innerHTML = AVATARS.map((src, idx) => `
      <button class="avatar-option" type="button" data-avatar="${src}" aria-label="Avatar ${idx + 1}">
        <img src="${src}" alt="" />
      </button>
    `).join('');

    picker.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const avatar = btn.dataset.avatar;
        localStorage.setItem(getAvatarStorageKey(), avatar);
        if(session.currentUser){
          session.currentUser.avatar = avatar;
          if(!isGuestUser()) await updateUserAvatar(session.currentUser.uid, avatar).catch(() => {
            showMsg('No se pudo guardar el avatar en línea, pero quedó aplicado en este navegador.', 'warning');
          });
        }
        applySelectedAvatar(avatar);
      });
    });
  }

  applySelectedAvatar();
}

export function resetAvatarDisplay(){
  applySelectedAvatar(DEFAULT_AVATAR);
}

export function resetCardSkinDisplay(){
  document.documentElement.style.removeProperty('--card-back-skin');
  renderCardSkinStore();
}

export function initCardSkinStore(){
  renderCardSkinStore();
  applySelectedCardSkin();
}


export function initRulesModal(){
  const btn = document.getElementById('rules-accept');
  const modal = document.getElementById('rules-modal');
  if(!btn || !modal) return;
  btn.addEventListener('click', () => {
    localStorage.setItem('memorabetRulesAccepted', 'true');
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
  });
}

export function showRulesModalIfNeeded(){
  const modal = document.getElementById('rules-modal');
  if(!modal) return;
  const accepted = localStorage.getItem('memorabetRulesAccepted') === 'true';
  if(accepted) return;
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}
