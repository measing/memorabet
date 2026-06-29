import { ANIMAL_CARDS, K_MAX, TOTAL_PAIRS, G, C, ONLINE_WAGERS, ONLINE_WIN_CUPS, ONLINE_LOSE_CUPS } from './constants.js?v=72';
import { createLocalDuelState, gameState, session } from './state.js?v=72';
import { shuffle, wait, formatMoney } from './utils.js?v=71';
import {
  updateSaldo,
  applyOnlineResult,
  addLiveHistory,
  updateUserStats,
  addLeaderboardEntry,
  findWaitingOnlineRoom,
  createOnlineRoom,
  joinOnlineRoom,
  listenOnlineRoom,
  getOnlineRoom,
  updateOnlineRoom,
  removeOnlineRoom
} from './database.js?v=74';
import { renderBoard, updateCardClasses, updateStats, showMsg, hideMsg, clearBoard, renderUserStats, setNewGameButtonBusy, showVictoryAnimation, showOnlineVictoryAnimation, formatDuration, getSelectedAvatar } from './ui.js?v=78';
import { playCardFlip, playShuffle, playMatch, playMiss, playRivalFound } from './audio.js?v=71';

const GUEST_BALANCE_KEY = 'memorabetGuestBalance';
const GUEST_STATS_KEY = 'memorabetGuestStats';
let selectedGameMode = 'solo';
let selectedOnlineWager = ONLINE_WAGERS[0];
let selectedModeCategory = 'offline';
let onlineRoomUnsubscribe = null;
let activeOnlineRoom = null;
let onlineStartTimer = null;
let onlineClickPending = false;
let lastOnlineRoomStatus = null;
let handledOnlineFinishId = null;
let appliedOnlineEconomyRoomId = null;

function isGuestUser(){
  return !!session.currentUser?.isGuest;
}

function isOnlineDuelActive(){
  return !!gameState.onlineRoom?.id;
}

function getCurrentPlayerIndex(room = activeOnlineRoom){
  return room?.players?.findIndex(player => player.uid === session.currentUser?.uid) ?? -1;
}

function getOnlinePlayerProfile(){
  return {
    uid: session.currentUser.uid,
    name: session.currentUser.nickname || session.currentUser.email || 'Jugador',
    avatar: session.currentUser.avatar || getSelectedAvatar()
  };
}

function listFromFirebase(value){
  if(Array.isArray(value)) return value;
  if(value && typeof value === 'object') return Object.values(value);
  return [];
}

function normalizeOnlineWager(value){
  const wager = Number(value || 0);
  return ONLINE_WAGERS.includes(wager) ? wager : ONLINE_WAGERS[0];
}

function randomInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function syncCurrentUserEconomy(profile){
  if(!profile) return;
  if(Number.isFinite(Number(profile.saldo))) gameState.saldo = Number(profile.saldo);
  session.cups = Number(profile.cups ?? profile.goldCups ?? session.cups ?? 0);
  session.medals = Number(profile.medals ?? profile.silverCups ?? session.medals ?? 0);
  session.trophies = Number(profile.trophies ?? (session.cups + session.medals) ?? 0);
  if(session.currentUser){
    session.currentUser.saldo = gameState.saldo;
    session.currentUser.trophies = session.trophies;
    session.currentUser.cups = session.cups;
    session.currentUser.medals = session.medals;
  }
  renderUserStats(profile);
  updateStats();
}

function cardLayoutSignature(cards){
  return cards.map(card => `${card.id}:${card.animalId}:${card.src}`).join('|');
}

function canAdvanceOnlineRoom(room){
  const players = listFromFirebase(room.players);
  return players.length >= 2 && players.some(player => player.uid === session.currentUser?.uid);
}

function getOnlineWinner(room){
  const players = listFromFirebase(room.players);
  if(room.winnerUid){
    return players.find(player => player.uid === room.winnerUid) || { uid:room.winnerUid, name:room.winnerName || 'Jugador' };
  }
  return players[Number(room.current || 0)] || players[0] || { name:'Jugador' };
}

async function settleOnlineEconomy(room){
  const freshRoom = await getOnlineRoom(room.id);
  if(!freshRoom || freshRoom.economySettled || freshRoom.status !== 'finished') return null;

  const winner = getOnlineWinner(freshRoom);
  const players = listFromFirebase(freshRoom.players).slice(0, 2);
  const loser = players.find(player => player.uid && player.uid !== winner.uid);
  if(!winner?.uid || !loser?.uid) return null;

  const wager = normalizeOnlineWager(freshRoom.wager);
  const pot = Number(freshRoom.pot || wager * players.length || wager * 2);
  const winnerCups = randomInt(ONLINE_WIN_CUPS.min, ONLINE_WIN_CUPS.max);
  const loserCups = randomInt(ONLINE_LOSE_CUPS.min, ONLINE_LOSE_CUPS.max);
  const awardType = freshRoom.mode === 'memory' ? 'cup' : 'medal';
  const cupType = awardType === 'cup' ? 'gold' : 'silver';
  const economyRewards = {
    pot,
    wager,
    awardType,
    cupType,
    winnerUid:winner.uid,
    winnerName:winner.name || freshRoom.winnerName || 'Jugador',
    winnerCups,
    loserUid:loser.uid,
    loserName:loser.name || 'Jugador',
    loserCups
  };

  await updateOnlineRoom(freshRoom.id, {
    economySettled:true,
    economyRewards
  });

  const winnerProfile = await applyOnlineResult(winner.uid, { saldoDelta:pot, trophiesDelta:winnerCups, awardType, cupType });
  const loserProfile = await applyOnlineResult(loser.uid, { trophiesDelta:-loserCups, awardType, cupType });

  appliedOnlineEconomyRoomId = freshRoom.id;
  if(session.currentUser?.uid === winner.uid) syncCurrentUserEconomy(winnerProfile);
  if(session.currentUser?.uid === loser.uid) syncCurrentUserEconomy(loserProfile);
  return economyRewards;
}

function resetOnlineClientToLobby(message = 'Partida online terminada. Puedes buscar otra partida.'){
  gameState.gameToken++;
  gameState.playing = false;
  gameState.blocked = false;
  gameState.starting = false;
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.round = 1;
  gameState.gananciaPartida = 0;
  gameState.onlineWager = 0;
  gameState.onlinePot = 0;
  gameState.startTime = 0;
  gameState.endTime = 0;
  gameState.localDuel = createLocalDuelState();
  gameState.onlineRoom = null;
  activeOnlineRoom = null;
  clearOnlineTimer();
  onlineClickPending = false;
  lastOnlineRoomStatus = null;
  handledOnlineFinishId = null;
  appliedOnlineEconomyRoomId = null;
  if(onlineRoomUnsubscribe){
    onlineRoomUnsubscribe();
    onlineRoomUnsubscribe = null;
  }
  clearBoard();
  setNewGameButtonBusy(false);
  updateStats();
  document.body.classList.remove('game-round-active', 'game-controls-active', 'local-duel-active', 'online-duel-active');
  showMsg(message, 'info');
}

function confirmOnlineExit(){
  return new Promise(resolve => {
    const old = document.getElementById('online-exit-confirm');
    if(old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'online-exit-confirm';
    overlay.className = 'online-exit-confirm';
    overlay.innerHTML = `
      <div class="online-exit-box">
        <h2>Salir de la partida</h2>
        <p>Si sales ahora, el otro jugador gana automaticamente y pierdes la entrada.</p>
        <button class="btn btn-red" id="confirm-online-exit" type="button">Salir y dar victoria</button>
        <button class="btn btn-blue" id="cancel-online-exit" type="button">Cancelar</button>
      </div>`;

    const close = value => {
      overlay.remove();
      resolve(value);
    };

    overlay.addEventListener('click', event => {
      if(event.target === overlay) close(false);
    });
    document.body.appendChild(overlay);
    document.getElementById('confirm-online-exit')?.addEventListener('click', () => close(true));
    document.getElementById('cancel-online-exit')?.addEventListener('click', () => close(false));
  });
}

function isLocalDuelActive(){
  return !!gameState.localDuel?.active;
}

function isMemoryDuelActive(){
  return isLocalDuelActive() && gameState.localDuel.mode === 'memory';
}

function currentLocalPlayer(){
  return gameState.localDuel.players[gameState.localDuel.current];
}

function switchLocalTurn(){
  gameState.localDuel.current = gameState.localDuel.current === 0 ? 1 : 0;
}

function ensureLocalDuelMeta(){
  const duel = gameState.localDuel;
  duel.mode = duel.mode || 'classic';
  if(!Array.isArray(duel.roundWins)) duel.roundWins = [0, 0];
  if(!Number.isFinite(duel.round) || duel.round < 1) duel.round = 1;
  if(!Number.isFinite(duel.suddenDeathStep)) duel.suddenDeathStep = 0;
  if(![0, 1].includes(Number(duel.suddenDeathLead))) duel.suddenDeathLead = -1;
  duel.suddenDeath = !!duel.suddenDeath;
  duel.matchOver = !!duel.matchOver;
  duel.statusText = duel.statusText || '';
}

function resetLocalRoundScores(){
  gameState.localDuel.players.forEach(player => player.score = 0);
}

function startFreshLocalMatch(mode = 'classic'){
  gameState.localDuel.active = true;
  gameState.localDuel.mode = mode;
  gameState.localDuel.current = 0;
  gameState.localDuel.round = 1;
  gameState.localDuel.roundWins = [0, 0];
  gameState.localDuel.suddenDeath = false;
  gameState.localDuel.suddenDeathStep = 0;
  gameState.localDuel.suddenDeathLead = -1;
  gameState.localDuel.matchOver = false;
  gameState.localDuel.statusText = '';
  resetLocalRoundScores();
}

function resetMemoryDuelBoardForNextTurn(){
  gameState.cards = gameState.cards.map(card => ({
    ...card,
    flipped:false,
    matched:false
  }));
  gameState.flipped = [];
  gameState.matched = 0;
}

function buildOnlineDeck({ flipped = true } = {}){
  return shuffle([...ANIMAL_CARDS, ...ANIMAL_CARDS]).map((animal, i) => ({
    id:i,
    animalId:animal.id,
    name:animal.name,
    src:animal.src,
    flipped,
    matched:false
  }));
}

function getOnlineTurnText(room){
  const player = listFromFirebase(room.players)[room.current];
  return room.statusText || (player ? `Turno de ${player.name}` : 'Esperando rival online...');
}

function clearOnlineTimer(){
  if(onlineStartTimer?.id) clearTimeout(onlineStartTimer.id);
  onlineStartTimer = null;
}

async function cleanupOnlineRoom({ removeRoom = false, silent = false } = {}){
  const roomId = activeOnlineRoom?.id || gameState.onlineRoom?.id;
  clearOnlineTimer();
  onlineClickPending = false;
  lastOnlineRoomStatus = null;
  if(onlineRoomUnsubscribe){
    onlineRoomUnsubscribe();
    onlineRoomUnsubscribe = null;
  }
  activeOnlineRoom = null;
  gameState.onlineRoom = null;
  if(removeRoom && roomId){
    await removeOnlineRoom(roomId).catch(() => {});
  }
  if(!silent){
    gameState.localDuel = createLocalDuelState();
  }
}

async function refundPendingOnlineEntry(room = activeOnlineRoom){
  const wager = Number(gameState.onlineWager || room?.wager || 0);
  if(!session.currentUser || isGuestUser() || wager <= 0 || gameState.gananciaPartida !== -wager) return false;
  const players = listFromFirebase(room?.players);
  const hasOpponent = players.some(player => player.uid && player.uid !== session.currentUser.uid);
  const canRefund = !room || room.status === 'waiting' || room.status === 'searching' || !hasOpponent;
  if(!canRefund || room?.economySettled) return false;
  gameState.saldo += wager;
  gameState.gananciaPartida = 0;
  gameState.onlineWager = 0;
  gameState.onlinePot = 0;
  await updateSaldo(session.currentUser.uid, gameState.saldo);
  updateStats();
  return true;
}

async function startOnlinePreview(room){
  if(room.status !== 'ready' || !canAdvanceOnlineRoom(room)) return;
  const freshRoom = await getOnlineRoom(room.id);
  if(!freshRoom || freshRoom.status !== 'ready' || !canAdvanceOnlineRoom(freshRoom)) return;
  room = freshRoom;
  const players = listFromFirebase(room.players).slice(0, 2).map(player => ({ ...player, score:0 }));
  await updateOnlineRoom(room.id, {
    status:'preview',
    cards:buildOnlineDeck({ flipped:true }),
    flipped:[],
    matched:0,
    intentos:0,
    current:0,
    players,
    statusText:'Memoricen las cartas...',
    startedAt:Date.now()
  });
}

async function startOnlinePlaying(room){
  if(room.status !== 'preview' || !canAdvanceOnlineRoom(room)) return;
  const freshRoom = await getOnlineRoom(room.id);
  if(!freshRoom || freshRoom.status !== 'preview' || !canAdvanceOnlineRoom(freshRoom)) return;
  room = freshRoom;
  let cards = listFromFirebase(room.cards).map(card => ({ ...card, flipped:false, matched:false }));
  if(room.mode === 'classic'){
    cards = shuffle(cards).map((card, i) => ({ ...card, id:i }));
  }
  const players = listFromFirebase(room.players).slice(0, 2).map(player => ({ ...player, score:0 }));
  await updateOnlineRoom(room.id, {
    status:'playing',
    cards,
    flipped:[],
    matched:0,
    intentos:0,
    current:0,
    players,
    resolving:false,
    statusText:`Turno de ${players[0]?.name || 'Jugador 1'}`,
    startedAt:Date.now()
  });
}

function scheduleOnlineHostStep(room){
  if(!canAdvanceOnlineRoom(room)) return;
  const key = `${room.id}:${room.status}:${room.updatedAt || 0}`;
  if(onlineStartTimer?.key === key) return;
  clearOnlineTimer();
  if(room.status === 'ready'){
    onlineStartTimer = { key, id:setTimeout(() => startOnlinePreview(room).catch(() => {}), 450) };
  }else if(room.status === 'preview'){
    onlineStartTimer = { key, id:setTimeout(() => startOnlinePlaying(room).catch(() => {}), 5200) };
  }
}

function applyOnlineRoom(room){
  const previousStatus = lastOnlineRoomStatus;
  activeOnlineRoom = room;
  setNewGameButtonBusy(false);
  if(!room){
    refundPendingOnlineEntry(null).catch(() => {});
    clearOnlineTimer();
    onlineClickPending = false;
    activeOnlineRoom = null;
    gameState.onlineRoom = null;
    gameState.localDuel = createLocalDuelState();
    gameState.playing = false;
    gameState.blocked = false;
    gameState.starting = false;
    gameState.cards = [];
    gameState.flipped = [];
    gameState.matched = 0;
    gameState.onlineWager = 0;
    gameState.onlinePot = 0;
    lastOnlineRoomStatus = null;
    clearBoard();
    updateStats();
    showMsg('La sala online se cerrÃ³.', 'warning');
    return;
  }

  gameState.onlineRoom = { id:room.id, mode:room.mode, status:room.status };
  gameState.onlineWager = Number(room.wager || gameState.onlineWager || 0);
  gameState.onlinePot = Number(room.pot || (gameState.onlineWager * Math.max(1, listFromFirebase(room.players).length)) || 0);
  if(room.economySettled && room.economyRewards && appliedOnlineEconomyRoomId !== room.id){
    const rewards = room.economyRewards;
    const awardKey = (rewards.awardType === 'cup' || rewards.cupType === 'gold') ? 'cups' : 'medals';
    if(rewards.winnerUid === session.currentUser?.uid){
      gameState.saldo += Number(rewards.pot || 0);
      session[awardKey] = Number(session[awardKey] || 0) + Number(rewards.winnerCups || 0);
    }else if(rewards.loserUid === session.currentUser?.uid){
      session[awardKey] = Math.max(0, Number(session[awardKey] || 0) - Number(rewards.loserCups || 0));
    }
    session.trophies = Number(session.cups || 0) + Number(session.medals || 0);
    if(session.currentUser){
      session.currentUser.saldo = gameState.saldo;
      session.currentUser.trophies = session.trophies;
      session.currentUser.cups = session.cups;
      session.currentUser.medals = session.medals;
    }
    appliedOnlineEconomyRoomId = room.id;
    renderUserStats(session.currentUser || session);
  }
  if(previousStatus === 'waiting' && ['ready', 'preview', 'playing'].includes(room.status)){
    playRivalFound();
  }
  lastOnlineRoomStatus = room.status;
  if(room.status === 'finished' && !room.economySettled && session.currentUser?.uid === room.hostUid){
    settleOnlineEconomy(room).catch(() => {});
    return;
  }
  if(room.status === 'finished' && room.economySettled && handledOnlineFinishId !== room.id){
    handledOnlineFinishId = room.id;
    const winner = getOnlineWinner(room);
    const winnerName = winner.name || 'Jugador';
    const rewards = room.economyRewards || {};
    const isWinner = rewards.winnerUid === session.currentUser?.uid;
    const isLoser = rewards.loserUid === session.currentUser?.uid;
    const cupText = isWinner ? `+${Number(rewards.winnerCups || 0)}` : isLoser ? `-${Number(rewards.loserCups || 0)}` : '';
    const awardLabel = (rewards.awardType === 'cup' || rewards.cupType === 'gold') ? 'Copas' : 'Medallas';
    showOnlineVictoryAnimation({
      winnerName,
      reason: room.concededBy ? `${winnerName} gana por abandono.` : `${winnerName} gana la partida online.`,
      pot:Number(rewards.pot || room.pot || 0),
      cupText:cupText ? `${awardLabel} ${cupText}` : '',
      autoCloseMs: 3200
    });
    setTimeout(() => resetOnlineClientToLobby('Volviste al lobby online. Puedes buscar otra partida.'), 3300);
  }
  if(room.status !== 'playing' || room.resolving) onlineClickPending = false;
  gameState.localDuel.active = true;
  gameState.localDuel.mode = room.mode === 'memory' ? 'memory' : 'classic';
  gameState.localDuel.current = Number(room.current || 0);
  gameState.localDuel.round = Number(room.round || 1);
  gameState.localDuel.roundWins = listFromFirebase(room.roundWins).length ? listFromFirebase(room.roundWins) : [0, 0];
  gameState.localDuel.suddenDeath = !!room.suddenDeath;
  gameState.localDuel.suddenDeathLead = [0, 1].includes(Number(room.suddenDeathLead)) ? Number(room.suddenDeathLead) : -1;
  gameState.localDuel.matchOver = room.status === 'finished' || !!room.matchOver;
  gameState.localDuel.statusText = getOnlineTurnText(room);
  gameState.localDuel.players = listFromFirebase(room.players).map((player, index) => ({
    name:player.name || `Jugador ${index + 1}`,
    avatar:player.avatar || '',
    score:Number(player.score || 0),
    uid:player.uid
  }));
  while(gameState.localDuel.players.length < 2){
    gameState.localDuel.players.push({ name:`Jugador ${gameState.localDuel.players.length + 1}`, avatar:'', score:0 });
  }

  gameState.cards = listFromFirebase(room.cards);
  gameState.flipped = listFromFirebase(room.flipped);
  gameState.matched = Number(room.matched || 0);
  gameState.intentos = Number(room.intentos || 0);
  gameState.starting = ['waiting', 'ready', 'preview'].includes(room.status);
  gameState.playing = room.status === 'playing';
  gameState.blocked = room.status !== 'playing'
    || !!room.resolving
    || listFromFirebase(room.players)[room.current]?.uid !== session.currentUser?.uid;
  gameState.startTime = Number(room.startedAt || Date.now());
  gameState.endTime = room.status === 'finished' ? Date.now() : 0;

  if(gameState.cards.length){
    const board = document.getElementById('board');
    const nextSignature = cardLayoutSignature(gameState.cards);
    if(board?.dataset.layoutSignature === nextSignature){
      updateCardClasses();
    }else{
      renderBoard(handleOnlineCardClick);
      const renderedBoard = document.getElementById('board');
      if(renderedBoard) renderedBoard.dataset.layoutSignature = nextSignature;
    }
  }else{
    clearBoard();
  }
  updateStats();

  if(room.status === 'waiting') showMsg('Sala creada. Esperando rival online...', 'info');
  else if(room.status === 'ready') showMsg('Rival encontrado. Preparando partida...', 'success');
  else if(room.status === 'preview') showMsg('Memoricen las cartas. La partida empieza en unos segundos.', 'info');
  else if(room.status === 'finished') hideMsg();
  else hideMsg();

  scheduleOnlineHostStep(room);
}

async function resolveOnlinePair(roomId, firstId, secondId){
  const room = await getOnlineRoom(roomId);
  if(!room || room.status !== 'playing' || !room.resolving) return;
  const cards = listFromFirebase(room.cards).map(card => ({ ...card }));
  const a = cards.find(card => String(card.id) === String(firstId));
  const b = cards.find(card => String(card.id) === String(secondId));
  if(!a || !b) return;

  const players = listFromFirebase(room.players).map(player => ({ ...player, score:Number(player.score || 0) }));
  const current = Number(room.current || 0);
  const nextCurrent = current === 0 ? 1 : 0;
  const isMatch = a.animalId === b.animalId;
  const suddenLead = [0, 1].includes(Number(room.suddenDeathLead)) ? Number(room.suddenDeathLead) : -1;
  let matched = Number(room.matched || 0);
  let status = 'playing';
  let matchOver = false;
  let statusText = '';

  if(isMatch){
    a.matched = b.matched = true;
    a.flipped = b.flipped = false;
    players[current].score++;
    matched++;

    if(room.mode === 'memory' && players[current].score >= TOTAL_PAIRS){
      status = 'finished';
      matchOver = true;
      statusText = `Ganaste ${players[current].name}`;
    }else if(room.mode === 'classic' && matched >= TOTAL_PAIRS){
      const roundWins = listFromFirebase(room.roundWins).length ? [...listFromFirebase(room.roundWins)] : [0, 0];
      const round = Number(room.round || 1);
      let roundWinner = -1;
      if(players[0].score > players[1].score) roundWinner = 0;
      if(players[1].score > players[0].score) roundWinner = 1;
      if(roundWinner >= 0) roundWins[roundWinner]++;

      const hasMatchWinner = roundWins[0] === 2 || roundWins[1] === 2 || (round >= 3 && roundWins[0] !== roundWins[1]);
      if(hasMatchWinner){
        const winnerIndex = roundWins[0] > roundWins[1] ? 0 : 1;
        status = 'finished';
        matchOver = true;
        statusText = `${players[winnerIndex].name} gana el duelo online`;
        await updateOnlineRoom(roomId, {
          status,
          cards,
          players,
          current,
          flipped:[],
          matched,
          resolving:false,
          matchOver,
          roundWins,
          winnerUid:players[winnerIndex]?.uid || '',
          winnerName:players[winnerIndex]?.name || `Jugador ${winnerIndex + 1}`,
          statusText
        });
        return;
      }

      if(round >= 3 && roundWins[0] === roundWins[1]){
        statusText = 'Empate online: muerte subita';
      }else if(roundWinner >= 0){
        statusText = `${players[roundWinner].name} gana ronda ${round}`;
      }else{
        statusText = `Ronda ${round} empatada`;
      }

      await updateOnlineRoom(roomId, {
        status:'ready',
        cards:[],
        players:players.map(player => ({ ...player, score:0 })),
        current:0,
        flipped:[],
        matched:0,
        intentos:0,
        resolving:false,
        matchOver:false,
        round:round + 1,
        roundWins,
        suddenDeath:round >= 3 && roundWins[0] === roundWins[1],
        suddenDeathStep:0,
        suddenDeathLead:-1,
        statusText
      });
      return;
    }else if(room.mode === 'classic' && room.suddenDeath){
      let nextLead = suddenLead;
      if(nextLead < 0){
        nextLead = current;
        statusText = `${players[current].name} encontro un par. ${players[nextCurrent].name} debe defenderse`;
      }else if(nextLead !== current){
        nextLead = -1;
        statusText = `${players[current].name} defendio el par. Sigue ${players[nextCurrent].name}`;
      }else{
        statusText = `${players[current].name} encontro otro par. ${players[nextCurrent].name} debe defenderse`;
      }

      if(matched >= TOTAL_PAIRS){
        await updateOnlineRoom(roomId, {
          status:'ready',
          cards:[],
          players:players.map(player => ({ ...player, score:0 })),
          current:0,
          flipped:[],
          matched:0,
          intentos:0,
          resolving:false,
          matchOver:false,
          round:Number(room.round || 1) + 1,
          roundWins:listFromFirebase(room.roundWins).length ? listFromFirebase(room.roundWins) : [0, 0],
          suddenDeath:true,
          suddenDeathStep:Number(room.suddenDeathStep || 0) + 1,
          suddenDeathLead:-1,
          statusText:'Muerte subita online sin ganador. Otra ronda'
        });
        return;
      }

      await updateOnlineRoom(roomId, {
        status:'playing',
        cards,
        players,
        current:nextCurrent,
        flipped:[],
        matched,
        resolving:false,
        matchOver:false,
        suddenDeath:true,
        suddenDeathStep:Number(room.suddenDeathStep || 0) + 1,
        suddenDeathLead:nextLead,
        statusText
      });
      return;
    }else{
      statusText = room.mode === 'memory'
        ? `${players[current].name}: ${players[current].score}/${TOTAL_PAIRS} pares`
        : `Turno de ${players[current].name}`;
    }
  }else{
    a.flipped = false;
    b.flipped = false;
    if(room.mode === 'classic' && room.suddenDeath){
      if(suddenLead < 0 || suddenLead === current){
        await updateOnlineRoom(roomId, {
          status:'playing',
          cards,
          players,
          current:nextCurrent,
          flipped:[],
          matched,
          resolving:false,
          matchOver:false,
          suddenDeath:true,
          suddenDeathStep:Number(room.suddenDeathStep || 0) + 1,
          suddenDeathLead:suddenLead,
          statusText:`${players[current].name} fallo. Turno de ${players[nextCurrent]?.name || `Jugador ${nextCurrent + 1}`}`
        });
        return;
      }
      const winnerIndex = suddenLead;
      const roundWins = listFromFirebase(room.roundWins).length ? [...listFromFirebase(room.roundWins)] : [0, 0];
      roundWins[winnerIndex]++;
      await updateOnlineRoom(roomId, {
        status:'finished',
        cards,
        players,
        current:winnerIndex,
        flipped:[],
        matched,
        resolving:false,
        matchOver:true,
        roundWins,
        winnerUid:players[winnerIndex]?.uid || '',
        winnerName:players[winnerIndex]?.name || `Jugador ${winnerIndex + 1}`,
        statusText:`${players[winnerIndex].name} gana muerte subita online`
      });
      return;
    }
    if(room.mode === 'memory'){
      players[current].score = 0;
      cards.forEach(card => {
        card.flipped = false;
        card.matched = false;
      });
      matched = 0;
    }
    statusText = `Turno de ${players[nextCurrent]?.name || `Jugador ${nextCurrent + 1}`}`;
  }

  await updateOnlineRoom(roomId, {
    status,
    cards,
    players,
    current:(isMatch && !room.suddenDeath) ? current : nextCurrent,
    flipped:[],
    matched,
    resolving:false,
    matchOver,
    ...(status === 'finished' ? {
      winnerUid:players[current]?.uid || '',
      winnerName:players[current]?.name || `Jugador ${current + 1}`
    } : {}),
    suddenDeathStep:room.suddenDeath && isMatch ? Number(room.suddenDeathStep || 0) + 1 : Number(room.suddenDeathStep || 0),
    statusText
  });
}

async function handleOnlineCardClick(id){
  if(onlineClickPending) return;
  onlineClickPending = true;
  try{
    const roomId = activeOnlineRoom?.id || gameState.onlineRoom?.id;
    if(!roomId) return;
    const room = await getOnlineRoom(roomId);
    if(!room || room.status !== 'playing' || room.resolving) return;
    activeOnlineRoom = room;
    if(listFromFirebase(room.players)[room.current]?.uid !== session.currentUser?.uid) return;
    const cards = listFromFirebase(room.cards).map(card => ({ ...card }));
    const card = cards.find(item => String(item.id) === String(id));
    if(!card || card.flipped || card.matched) return;
    const flipped = listFromFirebase(room.flipped);
    if(flipped.some(item => String(item) === String(card.id))) return;
    if(flipped.length >= 2) return;

    playCardFlip();
    card.flipped = true;
    flipped.push(card.id);
    const el = document.querySelector(`.card-wrap[data-id="${card.id}"]`);
    if(el) el.classList.add('flipped');

    if(flipped.length < 2){
      await updateOnlineRoom(room.id, { cards, flipped, resolving:false });
      return;
    }

    await updateOnlineRoom(room.id, {
      cards,
      flipped,
      resolving:true,
      intentos:Number(room.intentos || 0) + 1
    });

    const first = flipped[0];
    const second = flipped[1];
    setTimeout(() => resolveOnlinePair(room.id, first, second).catch(() => {}), 760);
  }finally{
    onlineClickPending = false;
  }
}

async function concedeOnlineRoom(){
  const roomId = activeOnlineRoom?.id || gameState.onlineRoom?.id;
  if(!roomId) return false;
  const room = await getOnlineRoom(roomId);
  if(!room || room.status === 'finished') return false;
  const players = listFromFirebase(room.players);
  const myUid = session.currentUser?.uid;
  const myIndex = players.findIndex(player => player.uid === myUid);
  const opponent = players.find(player => player.uid !== myUid);
  if(myIndex < 0 || !opponent) return false;

  await updateOnlineRoom(roomId, {
    status:'finished',
    resolving:false,
    matchOver:true,
    winnerUid:opponent.uid,
    winnerName:opponent.name || 'Jugador',
    concededBy:myUid || '',
    statusText:`${opponent.name || 'Jugador'} gana por abandono`
  });
  return true;
}

function completeLocalDuelRound(){
  const duel = gameState.localDuel;
  ensureLocalDuelMeta();
  const [p1, p2] = duel.players;

  if(duel.suddenDeath){
    duel.suddenDeathStep++;
    duel.statusText = 'Muerte subita: nadie fallo. Otra ronda.';
    return;
  }

  const roundNumber = duel.round;
  let winnerIndex = -1;
  if(p1.score > p2.score) winnerIndex = 0;
  if(p2.score > p1.score) winnerIndex = 1;

  if(winnerIndex >= 0){
    duel.roundWins[winnerIndex]++;
    duel.statusText = `${duel.players[winnerIndex].name} gana ronda ${roundNumber}`;
  }else{
    duel.statusText = `Ronda ${roundNumber} empatada`;
  }

  const [w1, w2] = duel.roundWins;
  const hasWinner = w1 === 2 || w2 === 2 || (roundNumber >= 3 && w1 !== w2);
  if(hasWinner){
    const matchWinner = w1 > w2 ? 0 : 1;
    duel.matchOver = true;
    duel.statusText = `${duel.players[matchWinner].name} gana el mejor de 3`;
    return;
  }

  if(roundNumber >= 3 && w1 === w2){
    duel.suddenDeath = true;
    duel.suddenDeathStep = 0;
    duel.suddenDeathLead = -1;
    duel.round++;
    duel.statusText = 'Empate: muerte subita';
    return;
  }

  duel.round++;
}

function hasSuddenDeathLead(duel = gameState.localDuel){
  return [0, 1].includes(Number(duel.suddenDeathLead));
}

function finishSuddenDeathWinner(winnerIndex){
  const duel = gameState.localDuel;
  ensureLocalDuelMeta();
  duel.roundWins[winnerIndex]++;
  duel.matchOver = true;
  duel.statusText = `${duel.players[winnerIndex].name} gana muerte subita`;
  gameState.playing = false;
  gameState.blocked = true;
  gameState.starting = false;
  gameState.endTime = Date.now();
  hideMsg();
  updateStats();
}

function handleSuddenDeathMiss(){
  const duel = gameState.localDuel;
  ensureLocalDuelMeta();
  const missIndex = duel.current;
  const leadIndex = Number(duel.suddenDeathLead);

  if(hasSuddenDeathLead(duel) && leadIndex !== missIndex){
    finishSuddenDeathWinner(leadIndex);
    return;
  }

  duel.suddenDeathStep++;
  switchLocalTurn();
  duel.statusText = `${duel.players[missIndex].name} fallo. Turno de ${currentLocalPlayer().name}`;
  hideMsg();
  updateStats();
}

async function handleSuddenDeathMatch(token){
  const duel = gameState.localDuel;
  ensureLocalDuelMeta();
  const scorerIndex = duel.current;
  const nextIndex = scorerIndex === 0 ? 1 : 0;
  const leadIndex = Number(duel.suddenDeathLead);
  duel.suddenDeathStep++;

  if(!hasSuddenDeathLead(duel)){
    duel.suddenDeathLead = scorerIndex;
    duel.statusText = `${duel.players[scorerIndex].name} encontro un par. ${duel.players[nextIndex].name} debe defenderse`;
  }else if(leadIndex !== scorerIndex){
    duel.suddenDeathLead = -1;
    duel.statusText = `${duel.players[scorerIndex].name} defendio el par. Sigue ${duel.players[nextIndex].name}`;
  }else{
    duel.statusText = `${duel.players[scorerIndex].name} encontro otro par. ${duel.players[nextIndex].name} debe defenderse`;
  }

  switchLocalTurn();
  updateStats();

  if(gameState.matched >= TOTAL_PAIRS){
    gameState.playing = false;
    gameState.blocked = true;
    gameState.starting = false;
    gameState.endTime = Date.now();
    duel.suddenDeathLead = -1;
    duel.statusText = 'Muerte subita sin ganador. Presiona Muerte subita para otra ronda';
    hideMsg();
    updateStats();
    return;
  }

  gameState.blocked = true;
  await wait(300);
  const reshuffled = await animateShuffle(Math.max(.24, .72 - duel.suddenDeathStep * .08), false, token);
  if(!reshuffled || token !== gameState.gameToken) return;
  renderBoard(flipCard);
  gameState.blocked = false;
  updateStats();
  hideMsg();
}

function updateSelectedGameModeUI(){
  document.querySelectorAll('[data-game-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.gameMode === selectedGameMode);
  });
  document.querySelectorAll('[data-mode-tab]').forEach(button => {
    const isActive = button.dataset.modeTab === selectedModeCategory;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll('[data-mode-panel]').forEach(panel => {
    panel.hidden = panel.dataset.modePanel !== selectedModeCategory;
  });
  document.querySelectorAll('[data-online-wager]').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.onlineWager) === selectedOnlineWager);
  });
  const label = document.getElementById('selected-mode-label');
  if(label) label.textContent = '';
}

export function setSelectedGameMode(mode){
  selectedGameMode = ['duel', 'memory-duel', 'online-duel', 'online-memory-duel'].includes(mode) ? mode : 'solo';
  selectedModeCategory = selectedGameMode.startsWith('online') ? 'online' : 'offline';
  updateSelectedGameModeUI();
  const panel = document.getElementById('game-mode-panel');
  if(panel) panel.hidden = true;
}

export function setSelectedModeCategory(category){
  selectedModeCategory = category === 'online' ? 'online' : 'offline';
  updateSelectedGameModeUI();
}

export function setSelectedOnlineWager(value){
  selectedOnlineWager = normalizeOnlineWager(value);
  updateSelectedGameModeUI();
}

export function toggleGameModePanel(){
  const panel = document.getElementById('game-mode-panel');
  if(panel) panel.hidden = !panel.hidden;
  updateSelectedGameModeUI();
}

export function closeGameModePanel(){
  const panel = document.getElementById('game-mode-panel');
  if(panel) panel.hidden = true;
}

function saveGuestBalance(){
  if(isGuestUser()) localStorage.setItem(GUEST_BALANCE_KEY, String(gameState.saldo));
}

function updateGuestStats({ pares, net }){
  const saved = JSON.parse(localStorage.getItem(GUEST_STATS_KEY) || '{}');
  const games = Number(saved.games || 0) + 1;
  const totalPairs = Number(saved.totalPairs || 0) + pares;
  const best = Math.max(Number(saved.best || 0), pares);
  const profit = Number(saved.profit || 0) + net;
  const stats = { games, totalPairs, best, profit };
  localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
  renderUserStats(stats);
}

async function animateVisibleSwap(a, b, speed = 1, token = gameState.gameToken){
  if(token !== gameState.gameToken) return false;
  const board = document.getElementById('board');
  if(!board) return false;
  const cards = [...board.querySelectorAll('.card-wrap')];
  const elA = cards[a];
  const elB = cards[b];
  if(!elA || !elB || elA === elB) return false;
  playShuffle();

  const firstA = elA.getBoundingClientRect();
  const firstB = elB.getBoundingClientRect();

  if(token !== gameState.gameToken || !board.contains(elA) || !board.contains(elB)) return false;
  const marker = document.createComment('swap-marker');
  board.insertBefore(marker, elA);
  board.insertBefore(elA, elB);
  board.insertBefore(elB, marker);
  board.removeChild(marker);

  const lastA = elA.getBoundingClientRect();
  const lastB = elB.getBoundingClientRect();

  elA.style.transition = 'none';
  elB.style.transition = 'none';
  elA.style.transform = `translate(${firstA.left - lastA.left}px, ${firstA.top - lastA.top}px) scale(1.04)`;
  elB.style.transform = `translate(${firstB.left - lastB.left}px, ${firstB.top - lastB.top}px) scale(1.04)`;
  elA.style.zIndex = '50';
  elB.style.zIndex = '51';

  await wait(35 * speed);
  if(token !== gameState.gameToken) return false;

  elA.style.transition = `transform ${0.72 * speed}s cubic-bezier(.18,.86,.24,1)`;
  elB.style.transition = `transform ${0.72 * speed}s cubic-bezier(.18,.86,.24,1)`;
  elA.style.transform = 'translate(0, 0) scale(1)';
  elB.style.transform = 'translate(0, 0) scale(1)';

  await wait(760 * speed);
  if(token !== gameState.gameToken) return false;

  elA.style.transition = '';
  elB.style.transition = '';
  elA.style.transform = '';
  elB.style.transform = '';
  elA.style.zIndex = '';
  elB.style.zIndex = '';
  return true;
}

async function animateShuffle(speed = 1, resetMatched = true, token = gameState.gameToken){
  const board = document.getElementById('board');
  if(!board) return false;
  board.classList.add('shuffling');

  // Barajado visible: son pocos intercambios, lentos y reales.
  // El jugador puede seguir algunas cartas con la vista, no como casino turbio de caricatura.
  const visibleSwaps = [
    [0, 5], [3, 10], [12, 7], [15, 2],
    [1, 8], [6, 14], [4, 11], [9, 13],
    [5, 10], [2, 7], [0, 12], [3, 15]
  ];

  try{
    for(const [a, b] of visibleSwaps){
      if(token !== gameState.gameToken) return false;
      const moved = await animateVisibleSwap(a, b, speed, token);
      if(!moved || token !== gameState.gameToken) return false;
      if(!gameState.cards[a] || !gameState.cards[b]) return false;
      const tmp = gameState.cards[a];
      gameState.cards[a] = gameState.cards[b];
      gameState.cards[b] = tmp;
      await wait(80 * speed);
    }

    if(token !== gameState.gameToken) return false;
    gameState.cards = gameState.cards.map((card, i) => ({
      ...card,
      id: i,
      flipped: false,
      matched: resetMatched ? false : card.matched
    }));
    return true;
  }finally{
    board.classList.remove('shuffling');
  }
}

async function prepareGame({ localDuel = false, localDuelMode = 'classic' } = {}){
  // Bloqueamos solo mientras se prepara la partida, para evitar doble clics reales.
  // Si ya hay una partida en curso, Nueva partida cancela esa ronda y comienza otra limpia.
  if(gameState.starting){
    showMsg('Ya se está preparando una partida. Espera un momento.', 'warning');
    return;
  }

  gameState.gameToken++;
  gameState.playing = false;
  gameState.blocked = false;
  gameState.starting = true;
  gameState.flipped = [];
  gameState.startTime = 0;
  gameState.endTime = 0;
  if(localDuel){
    const preserveDuelMatch = gameState.localDuel.active
      && gameState.localDuel.mode === localDuelMode
      && !gameState.localDuel.matchOver;
    if(preserveDuelMatch){
      ensureLocalDuelMeta();
      gameState.localDuel.active = true;
      gameState.localDuel.mode = localDuelMode;
      gameState.localDuel.current = 0;
      gameState.localDuel.statusText = '';
      gameState.localDuel.suddenDeathLead = -1;
      resetLocalRoundScores();
    }else{
      startFreshLocalMatch(localDuelMode);
    }
    const authModal = document.getElementById('auth-modal');
    if(authModal) authModal.style.display = 'none';
  }else{
    gameState.localDuel.active = false;
  }
  setNewGameButtonBusy(true);

  if(!localDuel && !session.currentUser){
    gameState.starting = false;
    setNewGameButtonBusy(false);
    document.getElementById('auth-modal').style.display = 'flex';
    return;
  }
  if(!localDuel && gameState.saldo < C){
    gameState.starting = false;
    setNewGameButtonBusy(false);
    showMsg('No tienes saldo suficiente. Reinicia el juego.', 'danger');
    return;
  }

  const token = gameState.gameToken;
  const deck = shuffle([...ANIMAL_CARDS, ...ANIMAL_CARDS]);
  gameState.playing = false;
  gameState.cards = deck.map((animal,i)=>({
    id:i,
    animalId:animal.id,
    name:animal.name,
    src:animal.src,
    flipped:true,
    matched:false
  }));
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.gananciaPartida = localDuel ? 0 : -C;
  gameState.blocked = true;
  if(!localDuel){
    gameState.saldo -= C;
    if(isGuestUser()) saveGuestBalance();
    else await updateSaldo(session.currentUser.uid, gameState.saldo);
  }
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }

  renderBoard(flipCard);
  updateStats();
  if(localDuel) hideMsg();
  else showMsg('Memoriza las cartas. Tendrás unos segundos antes del mezclado visible.', 'info');

  await wait(5000);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }
  if(localDuel) hideMsg();
  else showMsg('Cartas ocultándose...', 'warning');
  gameState.cards.forEach(c => c.flipped = false);
  updateCardClasses();

  await wait(650);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }
  if(localDuel && localDuelMode === 'memory'){
    gameState.localDuel.statusText = `Turno de ${currentLocalPlayer().name}`;
  }else{
    if(localDuel) hideMsg();
    else showMsg('Mezclando cartas... sigue el movimiento con la vista.', 'warning');
    const shuffled = await animateShuffle(1, true, token);
    if(!shuffled || token !== gameState.gameToken){
      gameState.starting = false;
      gameState.blocked = false;
      setNewGameButtonBusy(false);
      updateStats();
      return;
    }
  }

  renderBoard(flipCard);
  await wait(250);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }

  gameState.playing = true;
  gameState.blocked = false;
  gameState.starting = false;
  gameState.startTime = Date.now();
  setNewGameButtonBusy(false);
  renderBoard(flipCard);
  updateStats();
  if(localDuel) hideMsg();
  else showMsg('Ahora sí: juega. Si seguiste el movimiento, deberías tener opciones reales.', 'success');
}

export async function newGame(){
  await prepareGame({ localDuel:false });
}

export async function newLocalDuel(){
  await prepareGame({ localDuel:true, localDuelMode:'classic' });
}

export async function newMemoryDuel(){
  await prepareGame({ localDuel:true, localDuelMode:'memory' });
}

export async function startOnlineGame(mode = 'classic'){
  if(!session.currentUser || isGuestUser()){
    showMsg('Para jugar online necesitas iniciar sesion o crear una cuenta.', 'warning');
    const authModal = document.getElementById('auth-modal');
    if(authModal) authModal.style.display = 'flex';
    return;
  }
  const wager = normalizeOnlineWager(selectedOnlineWager);
  if(gameState.saldo < wager){
    showMsg(`No tienes saldo suficiente para la entrada de ${formatMoney(wager)}.`, 'danger');
    return;
  }

  await cleanupOnlineRoom({ removeRoom:true, silent:true });
  gameState.gameToken++;
  gameState.playing = false;
  gameState.blocked = true;
  gameState.starting = true;
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.gananciaPartida = -wager;
  gameState.onlineWager = wager;
  gameState.onlinePot = wager;
  gameState.saldo -= wager;
  await updateSaldo(session.currentUser.uid, gameState.saldo);
  gameState.onlineRoom = { mode, status:'searching', wager, pot:wager };
  gameState.localDuel = createLocalDuelState();
  gameState.localDuel.active = true;
  gameState.localDuel.mode = mode === 'memory' ? 'memory' : 'classic';
  gameState.localDuel.players = [
    { ...getOnlinePlayerProfile(), score:0 },
    { name:'Esperando rival', avatar:'', score:0 }
  ];
  gameState.localDuel.statusText = `Buscando rival online... Entrada ${formatMoney(wager)}`;
  setNewGameButtonBusy(true);
  clearBoard();
  updateStats();
  showMsg('Buscando rival online...', 'info');

  try{
    const player = getOnlinePlayerProfile();
    const waitingRoom = await findWaitingOnlineRoom(mode, player.uid, wager);
    const room = waitingRoom
      ? await joinOnlineRoom(waitingRoom.id, player, wager)
      : await createOnlineRoom(mode, player, wager);
    activeOnlineRoom = room;
    gameState.onlineRoom = { id:room.id, mode:room.mode, status:room.status };
    gameState.onlinePot = Number(room.pot || wager);
    lastOnlineRoomStatus = waitingRoom ? 'waiting' : room.status;
    onlineRoomUnsubscribe = listenOnlineRoom(room.id, applyOnlineRoom);
  }catch(error){
    await refundPendingOnlineEntry(null).catch(() => {});
    await cleanupOnlineRoom({ removeRoom:false, silent:false });
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    clearBoard();
    updateStats();
    showMsg(error?.message || 'No se pudo entrar a una sala online.', 'danger');
  }
}

export async function startSelectedGame(){
  if(selectedGameMode === 'duel') await newLocalDuel();
  else if(selectedGameMode === 'memory-duel') await newMemoryDuel();
  else if(selectedGameMode === 'online-duel') await startOnlineGame('classic');
  else if(selectedGameMode === 'online-memory-duel') await startOnlineGame('memory');
  else await newGame();
}

export function flipCard(id){
  if(!gameState.playing || gameState.blocked) return;
  const token = gameState.gameToken;
  const card = gameState.cards[id];
  if(!card || card.flipped || card.matched || gameState.flipped.length >= 2) return;

  playCardFlip();
  card.flipped = true;
  gameState.flipped.push(id);
  const el = document.querySelector(`.card-wrap[data-id="${id}"]`);
  if(el) el.classList.add('flipped');

  if(gameState.flipped.length === 2){
    gameState.blocked = true;
    gameState.intentos++;
    updateStats();

    const [a,b] = gameState.flipped.map(i => gameState.cards[i]);
    if(a.animalId === b.animalId){
      playMatch();
      setTimeout(async ()=>{
        if(token !== gameState.gameToken) return;
        a.matched = b.matched = true;
        a.flipped = b.flipped = false;
        gameState.matched++;
        if(isLocalDuelActive()){
          currentLocalPlayer().score++;
        }else{
          gameState.gananciaPartida += G;
          gameState.saldo += G;
          if(isGuestUser()) saveGuestBalance();
          else await updateSaldo(session.currentUser.uid, gameState.saldo);
        }
        gameState.flipped = [];
        gameState.blocked = false;
        renderBoard(flipCard);
        updateStats();

        if(isMemoryDuelActive() && currentLocalPlayer().score >= TOTAL_PAIRS){
          const winner = currentLocalPlayer().name;
          gameState.playing = false;
          gameState.blocked = true;
          gameState.starting = false;
          gameState.endTime = Date.now();
          gameState.localDuel.matchOver = true;
          gameState.localDuel.statusText = `Ganaste ${winner}`;
          hideMsg();
          updateStats();
        }
        else if(isLocalDuelActive() && gameState.localDuel.suddenDeath){
          await handleSuddenDeathMatch(token);
        }
        else if(gameState.matched === TOTAL_PAIRS) endGame();
        else if(!isLocalDuelActive() && gameState.intentos >= K_MAX) endGame();
        else if(isMemoryDuelActive()){
          gameState.localDuel.statusText = `${currentLocalPlayer().name}: ${currentLocalPlayer().score}/${TOTAL_PAIRS} pares`;
          hideMsg();
          updateStats();
        }
        else if(isLocalDuelActive()) hideMsg();
        else showMsg(`Par encontrado. +${formatMoney(G)}.`, 'success');
      }, 520);
    }else{
      playMiss();
      const wA = document.querySelector(`.card-wrap[data-id="${gameState.flipped[0]}"]`);
      const wB = document.querySelector(`.card-wrap[data-id="${gameState.flipped[1]}"]`);
      wA && wA.classList.add('wrong');
      wB && wB.classList.add('wrong');

      setTimeout(async ()=>{
        if(token !== gameState.gameToken) return;
        a.flipped = b.flipped = false;
        gameState.flipped = [];
        gameState.blocked = false;
        wA && wA.classList.remove('wrong','flipped');
        wB && wB.classList.remove('wrong','flipped');

        if(isMemoryDuelActive()){
          currentLocalPlayer().score = 0;
          switchLocalTurn();
          resetMemoryDuelBoardForNextTurn();
          gameState.localDuel.statusText = `Turno de ${currentLocalPlayer().name}`;
          renderBoard(flipCard);
          updateStats();
          hideMsg();
        }else if(isLocalDuelActive() && gameState.localDuel.suddenDeath){
          handleSuddenDeathMiss();
        }else if(isLocalDuelActive()){
          switchLocalTurn();
          updateStats();
          hideMsg();
        }else if(gameState.intentos >= K_MAX) endGame();
        else showMsg(`Sin par. Intentos restantes: ${K_MAX - gameState.intentos}.`, 'warning');
      }, 820);
    }
  }
}

export async function endGame(){
  if(!gameState.playing && gameState.endTime) return;
  gameState.playing = false;
  gameState.blocked = true;
  gameState.starting = false;
  setNewGameButtonBusy(false);

  const completed = gameState.matched === TOTAL_PAIRS;
  gameState.endTime = Date.now();
  const tiempoMs = gameState.startTime ? gameState.endTime - gameState.startTime : 0;
  const premioRanking = 10000;
  const net = gameState.gananciaPartida;
  const type = completed ? 'success' : (net > 0 ? 'success' : net === 0 ? 'info' : 'danger');
  const avatar = getSelectedAvatar();

  if(isLocalDuelActive()){
    completeLocalDuelRound();
    hideMsg();
    updateStats();
    return;
  }

  gameState.round = Math.max(1, Number(gameState.round || 1)) + 1;

  if(completed){
    const guestNote = isGuestUser() ? ' · Crea una cuenta para entrar al ranking.' : '';
    showMsg(`¡Completaste los 8 pares! Tiempo: ${formatDuration(tiempoMs)} · Intentos: ${gameState.intentos} · Premio ficticio: ${formatMoney(premioRanking)}${guestNote}`, 'success');
    showVictoryAnimation({ tiempoMs, intentos: gameState.intentos, premio: premioRanking });
    if(!isGuestUser()){
      await addLeaderboardEntry({
        uid: session.currentUser.uid,
        user: session.currentUser.nickname,
        tiempoMs,
        intentos: gameState.intentos,
        pares: gameState.matched,
        premio: premioRanking,
        avatar
      });
    }
  }else{
    showMsg(`Partida terminada. ${gameState.matched}/${TOTAL_PAIRS} · Resultado: ${net >= 0 ? '+' : ''}${formatMoney(net)} · Saldo actual: ${formatMoney(gameState.saldo)}`, type);
  }

  if(isGuestUser()){
    saveGuestBalance();
    updateGuestStats({ pares: gameState.matched, net });
  }else{
    await addLiveHistory({
      user: session.currentUser.nickname,
      pares: gameState.matched,
      intentos: gameState.intentos,
      net,
      avatar
    });
    const updated = await updateUserStats(session.currentUser.uid, {
      pares: gameState.matched,
      net,
      saldo: gameState.saldo
    });
    renderUserStats(updated);
  }
  updateStats();
}


export async function resetGame(){
  if(isOnlineDuelActive()){
    const room = activeOnlineRoom || (gameState.onlineRoom?.id ? await getOnlineRoom(gameState.onlineRoom.id).catch(() => null) : null);
    await refundPendingOnlineEntry(room);
    await cleanupOnlineRoom({ removeRoom:true, silent:false });
    gameState.gameToken++;
    gameState.playing = false;
    gameState.blocked = false;
    gameState.starting = false;
    gameState.cards = [];
    gameState.flipped = [];
    gameState.matched = 0;
    gameState.intentos = 0;
    gameState.round = 1;
    gameState.gananciaPartida = 0;
    gameState.onlineWager = 0;
    gameState.onlinePot = 0;
    gameState.startTime = 0;
    gameState.endTime = 0;
    clearBoard();
    setNewGameButtonBusy(false);
    updateStats();
    showMsg('Sala online reiniciada. Elige modo o comienza otra vez.', 'info');
    return;
  }
  const wasLocalDuel = isLocalDuelActive();
  const localDuelMode = gameState.localDuel?.mode || 'classic';
  const previousSaldo = gameState.saldo;
  if(wasLocalDuel){
    gameState.gameToken++;
    gameState.playing = false;
    gameState.blocked = false;
    gameState.starting = false;
    gameState.cards = [];
    gameState.flipped = [];
    gameState.matched = 0;
    gameState.intentos = 0;
    gameState.endTime = 0;
    gameState.saldo = previousSaldo;
    hideMsg();
    clearBoard();
    setNewGameButtonBusy(false);
    updateStats();
    await prepareGame({ localDuel:true, localDuelMode });
    gameState.saldo = previousSaldo;
    updateStats();
    return;
  }
  gameState.gameToken++;
  gameState.playing = false;
  gameState.blocked = false;
  gameState.starting = false;
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.round = 1;
  gameState.gananciaPartida = 0;
  gameState.onlineWager = 0;
  gameState.onlinePot = 0;
  gameState.startTime = 0;
  gameState.endTime = 0;
  gameState.localDuel = createLocalDuelState();
  gameState.onlineRoom = null;
  saveGuestBalance();
  setNewGameButtonBusy(false);
  clearBoard();
  updateStats();
  showMsg('Juego reiniciado. Presiona Comenzar juego.', 'info');
}

export async function exitGame(){
  if(isOnlineDuelActive()){
    const room = activeOnlineRoom || (gameState.onlineRoom?.id ? await getOnlineRoom(gameState.onlineRoom.id) : null);
    const players = listFromFirebase(room?.players);
    const hasOpponent = players.some(player => player.uid !== session.currentUser?.uid);
    if(room?.status !== 'finished' && hasOpponent){
      const ok = await confirmOnlineExit();
      if(!ok) return;
      concedeOnlineRoom().catch(() => {});
      resetOnlineClientToLobby('Saliste de la partida online. Victoria para el rival.');
      return;
    }
    await refundPendingOnlineEntry(room);
    await cleanupOnlineRoom({ removeRoom:!hasOpponent, silent:false });
    resetOnlineClientToLobby('Saliste de la sala online. Puedes buscar otra partida.');
    return;
  }
  const shouldRefundEntry = !isLocalDuelActive()
    && gameState.gananciaPartida === -C
    && gameState.matched === 0
    && gameState.intentos === 0;
  const previousSaldo = shouldRefundEntry ? gameState.saldo + C : gameState.saldo;
  gameState.gameToken++;
  gameState.playing = false;
  gameState.blocked = false;
  gameState.starting = false;
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.round = 1;
  gameState.gananciaPartida = 0;
  gameState.onlineWager = 0;
  gameState.onlinePot = 0;
  gameState.startTime = 0;
  gameState.endTime = 0;
  gameState.saldo = previousSaldo;
  gameState.localDuel = createLocalDuelState();
  if(shouldRefundEntry){
    if(isGuestUser()) saveGuestBalance();
    else if(session.currentUser){
      setTimeout(() => updateSaldo(session.currentUser.uid, previousSaldo).catch(() => {}), 1200);
    }
  }
  setNewGameButtonBusy(false);
  clearBoard();
  updateStats();
  document.body.classList.remove('game-round-active', 'game-controls-active', 'local-duel-active');
  showMsg('Saliste de la partida. Elige modo o comienza otra vez.', 'info');
}
