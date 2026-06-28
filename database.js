import { ref, get, set, update, push, onValue, query, limitToLast, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { db } from './firebase-config.js?v=71';
import { INITIAL_SALDO, avatarPool } from './constants.js?v=71';
import { normalizeNickname } from './utils.js?v=71';

export async function getNicknameOwner(cleanNick){
  const snap = await get(ref(db, `nicknames/${cleanNick}`));
  return snap.exists() ? snap.val() : null;
}

export async function nicknameTaken(cleanNick, uid = null){
  const owner = await getNicknameOwner(cleanNick);
  if(!owner) return false;
  // Si el nickname ya esta reservado por el mismo usuario, no lo tratamos como ocupado.
  // Esto evita el falso error despues de crear una cuenta mientras Firebase termina de sincronizar.
  return uid ? owner !== uid : true;
}

export async function reserveNickname(cleanNick, uid){
  const owner = await getNicknameOwner(cleanNick);
  if(owner && owner !== uid){
    throw new Error('Ese nickname ya está ocupado.');
  }
  await set(ref(db, `nicknames/${cleanNick}`), uid);
}

export async function releaseNickname(cleanNick){
  await remove(ref(db, `nicknames/${cleanNick}`));
}

export async function getUserProfile(uid){
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export async function createUserProfile(uid, { nickname, email }){
  const profile = {
    nickname,
    cleanNickname: normalizeNickname(nickname),
    email,
    avatar: 'assets/avatars/avatar-01.png',
    ownedCardSkins: [],
    selectedCardSkin: 'default',
    saldo: INITIAL_SALDO,
    games: 0,
    totalPairs: 0,
    best: 0,
    profit: 0,
    trophies: 0,
    silverCups: 0,
    goldCups: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(ref(db, `users/${uid}`), profile);
  return profile;
}

export async function updateSaldo(uid, saldo){
  await update(ref(db, `users/${uid}`), { saldo, updatedAt: Date.now() });
}

export async function applyOnlineResult(uid, { saldoDelta = 0, trophiesDelta = 0, cupType = 'silver' } = {}){
  const profile = await getUserProfile(uid) || {};
  const saldo = Math.max(0, Number(profile.saldo ?? INITIAL_SALDO) + Number(saldoDelta || 0));
  const trophies = Math.max(0, Number(profile.trophies || 0) + Number(trophiesDelta || 0));
  const cupField = cupType === 'gold' ? 'goldCups' : 'silverCups';
  const currentCups = Number(profile[cupField] || 0);
  const patch = {
    saldo,
    trophies,
    [cupField]: Math.max(0, currentCups + Number(trophiesDelta || 0)),
    updatedAt: Date.now()
  };
  await update(ref(db, `users/${uid}`), patch);
  return { ...profile, ...patch };
}

export async function updateUserAvatar(uid, avatar){
  await update(ref(db, `users/${uid}`), { avatar, updatedAt: Date.now() });
}

export async function updateUserCardSkins(uid, ownedCardSkins, selectedCardSkin){
  await update(ref(db, `users/${uid}`), { ownedCardSkins, selectedCardSkin, updatedAt: Date.now() });
}

export async function resetOnlineStats(uid){
  await update(ref(db, `users/${uid}`), {
    saldo: INITIAL_SALDO,
    updatedAt: Date.now()
  });
}

export async function updateUserStats(uid, { pares, net, saldo }){
  const profile = await getUserProfile(uid) || {};
  const games = Number(profile.games || 0) + 1;
  const totalPairs = Number(profile.totalPairs || 0) + pares;
  const best = Math.max(Number(profile.best || 0), pares);
  const profit = Number(profile.profit || 0) + net;

  const patch = { games, totalPairs, best, profit, saldo, updatedAt: Date.now() };
  await update(ref(db, `users/${uid}`), patch);
  return { ...profile, ...patch };
}

export async function addLiveHistory({ user, pares, intentos, net, avatar }){
  await push(ref(db, 'liveHistory'), {
    user,
    pares,
    intentos,
    net,
    t: Date.now(),
    avatar: avatar || avatarPool[Math.floor(Math.random() * avatarPool.length)]
  });
}


export async function addLeaderboardEntry({ uid, user, tiempoMs, intentos, pares, premio, avatar }){
  await push(ref(db, 'leaderboard'), {
    uid,
    user,
    tiempoMs,
    segundos: Math.round(tiempoMs / 100) / 10,
    intentos,
    pares,
    premio,
    t: Date.now(),
    avatar: avatar || avatarPool[Math.floor(Math.random() * avatarPool.length)]
  });
}

export function listenLeaderboard(callback){
  const state = { solo: [], silver: [], gold: [] };
  const emit = () => callback({ ...state });
  const soloQuery = query(ref(db, 'leaderboard'), limitToLast(80));
  const stopSolo = onValue(soloQuery, snapshot => {
    const data = snapshot.val();
    state.solo = data ? Object.values(data)
      .filter(item => Number(item.pares || 0) >= 8)
      .sort((a,b) => {
        const tiempoDiff = Number(a.tiempoMs || Infinity) - Number(b.tiempoMs || Infinity);
        if(tiempoDiff !== 0) return tiempoDiff;
        const intentosDiff = Number(a.intentos || Infinity) - Number(b.intentos || Infinity);
        if(intentosDiff !== 0) return intentosDiff;
        return Number(b.t || 0) - Number(a.t || 0);
      })
      .slice(0, 10) : [];
    emit();
  });
  const stopUsers = onValue(ref(db, 'users'), snapshot => {
    const data = snapshot.val();
    const users = data ? Object.entries(data).map(([uid, profile]) => ({ uid, ...profile })) : [];
    const cupRanking = field => users
      .map(profile => ({
        uid:profile.uid,
        user:profile.nickname || profile.email || 'Jugador',
        avatar:profile.avatar,
        cups:Number(profile[field] || 0)
      }))
      .filter(item => item.cups > 0)
      .sort((a,b) => b.cups - a.cups || String(a.user).localeCompare(String(b.user)))
      .slice(0, 10);
    state.silver = cupRanking('silverCups');
    state.gold = cupRanking('goldCups');
    emit();
  });
  return () => {
    stopSolo();
    stopUsers();
  };
}

export function listenLiveHistory(callback){
  const q = query(ref(db, 'liveHistory'), limitToLast(12));
  return onValue(q, snapshot => {
    const data = snapshot.val();
    const history = data ? Object.values(data).sort((a,b)=>(b.t||0)-(a.t||0)) : [];
    callback(history);
  });
}

function listFromFirebase(value){
  if(Array.isArray(value)) return value;
  if(value && typeof value === 'object') return Object.values(value);
  return [];
}

export async function findWaitingOnlineRoom(mode, uid, wager = 0){
  const snap = await get(ref(db, 'onlineRooms'));
  if(!snap.exists()) return null;
  const rooms = snap.val();
  const candidates = Object.entries(rooms)
    .map(([id, room]) => ({ id, ...room, players:listFromFirebase(room.players) }))
    .filter(room => room.mode === mode
      && Number(room.wager || 0) === Number(wager || 0)
      && room.status === 'waiting'
      && room.players.length === 1
      && room.players[0]?.uid !== uid)
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  return candidates[0] || null;
}

export async function createOnlineRoom(mode, player, wager = 0){
  const roomRef = push(ref(db, 'onlineRooms'));
  const entry = Math.max(0, Number(wager || 0));
  const room = {
    id: roomRef.key,
    mode,
    wager: entry,
    pot: entry,
    economySettled: false,
    status: 'waiting',
    players: [{ ...player, score:0, wager:entry }],
    current: 0,
    cards: [],
    flipped: [],
    matched: 0,
    intentos: 0,
    round: 1,
    roundWins: [0, 0],
    suddenDeath: false,
    suddenDeathStep: 0,
    matchOver: false,
    statusText: 'Esperando rival online...',
    hostUid: player.uid,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(roomRef, room);
  return room;
}

export async function joinOnlineRoom(roomId, player, wager = 0){
  const roomRef = ref(db, `onlineRooms/${roomId}`);
  const snap = await get(roomRef);
  if(!snap.exists()) throw new Error('La sala ya no existe.');
  const room = snap.val();
  if(room.status !== 'waiting') throw new Error('La sala ya empezo.');
  const entry = Math.max(0, Number(wager || 0));
  if(Number(room.wager || 0) !== entry) throw new Error('La entrada de esa sala ya no coincide.');
  const players = listFromFirebase(room.players);
  if(players.some(item => item.uid === player.uid)) return { id: roomId, ...room };
  if(players.length >= 2) throw new Error('La sala esta llena.');
  const nextPlayers = [...players, { ...player, score:0, wager:entry }];
  await update(roomRef, {
    players: nextPlayers,
    pot: entry * nextPlayers.length,
    status: 'ready',
    statusText: 'Rival encontrado. Preparando partida...',
    updatedAt: Date.now()
  });
  return { id: roomId, ...room, players: nextPlayers, wager:entry, pot:entry * nextPlayers.length, status:'ready' };
}

export function listenOnlineRoom(roomId, callback){
  return onValue(ref(db, `onlineRooms/${roomId}`), snapshot => {
    callback(snapshot.exists() ? { id: roomId, ...snapshot.val() } : null);
  });
}

export async function getOnlineRoom(roomId){
  const snap = await get(ref(db, `onlineRooms/${roomId}`));
  return snap.exists() ? { id: roomId, ...snap.val() } : null;
}

export async function updateOnlineRoom(roomId, patch){
  await update(ref(db, `onlineRooms/${roomId}`), { ...patch, updatedAt: Date.now() });
}

export async function removeOnlineRoom(roomId){
  await remove(ref(db, `onlineRooms/${roomId}`));
}

export async function makeUniqueNickname(base){
  let candidate = normalizeNickname(base) || 'jugador';
  if(candidate.length < 3) candidate = `jugador_${candidate}`;
  candidate = candidate.slice(0, 14);

  let clean = candidate;
  let suffix = 1;
  while(await nicknameTaken(clean)){
    clean = `${candidate}_${suffix}`.slice(0, 16);
    suffix++;
  }
  return clean;
}
