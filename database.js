import { ref, get, set, update, push, onValue, query, limitToLast, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { db } from './firebase-config.js?v=71';
import { INITIAL_SALDO, avatarPool } from './constants.js?v=71';
import { normalizeNickname } from './utils.js?v=71';

function now(){
  return Date.now();
}

function fallbackAvatar(avatar){
  return avatar || avatarPool[Math.floor(Math.random() * avatarPool.length)];
}

function publicName(item = {}){
  return item.user || item.name || item.nickname || item.winnerName || 'Jugador';
}

function normalizePublicEntry(item = {}, key = ''){
  return {
    ...item,
    uid:item.uid || key,
    user:publicName(item),
    avatar:item.avatar || ''
  };
}

function publicAwardCount(item = {}){
  return Number(item.cups ?? item.goldCups ?? item.medals ?? item.silverCups ?? item.trophies ?? 0);
}

function publicRankingName(profile = {}){
  const rawName = String(profile.nickname || profile.user || profile.name || profile.email || 'Jugador').trim();
  const name = rawName.length > 20 ? rawName.slice(0, 20) : rawName;
  return name.length >= 3 ? name : 'Jugador';
}

function entriesFromData(data){
  if(!data) return [];
  if(Array.isArray(data)) return data.map((item, index) => normalizePublicEntry(item, String(index)));
  if(typeof data === 'object'){
    return Object.entries(data).map(([key, item]) => normalizePublicEntry(item, key));
  }
  return [];
}

function sortSoloRanking(items){
  return items
    .filter(item => Number(item.pares || 0) >= 8)
    .sort((a,b) => {
      const tiempoDiff = Number(a.tiempoMs || Infinity) - Number(b.tiempoMs || Infinity);
      if(tiempoDiff !== 0) return tiempoDiff;
      const intentosDiff = Number(a.intentos || Infinity) - Number(b.intentos || Infinity);
      if(intentosDiff !== 0) return intentosDiff;
      return Number(b.t || 0) - Number(a.t || 0);
    })
    .slice(0, 10);
}

function listFromFirebase(value){
  if(Array.isArray(value)) return value;
  if(value && typeof value === 'object'){
    return Object.entries(value)
      .map(([key, item], index) => item && typeof item === 'object'
        ? { ...item, uid:item.uid || key, seat:Number(item.seat ?? index) }
        : item)
      .sort((a, b) => Number(a?.seat ?? 99) - Number(b?.seat ?? 99));
  }
  return [];
}

function playersToMap(players){
  if(!players) return {};
  if(Array.isArray(players)){
    return players.reduce((acc, player, index) => {
      if(player?.uid) acc[player.uid] = { ...player, seat:Number(player.seat ?? index) };
      return acc;
    }, {});
  }
  if(typeof players === 'object'){
    return Object.entries(players).reduce((acc, [uid, player], index) => {
      if(player && typeof player === 'object'){
        const playerUid = player.uid || uid;
        acc[playerUid] = { ...player, uid:playerUid, seat:Number(player.seat ?? index) };
      }
      return acc;
    }, {});
  }
  return {};
}

function normalizeRoomPatch(patch){
  if(!patch || !Object.prototype.hasOwnProperty.call(patch, 'players')) return patch;
  return { ...patch, players:playersToMap(patch.players) };
}

export async function getNicknameOwner(cleanNick){
  const snap = await get(ref(db, `nicknames/${cleanNick}`));
  return snap.exists() ? snap.val() : null;
}

export async function nicknameTaken(cleanNick, uid = null){
  const owner = await getNicknameOwner(cleanNick);
  if(!owner) return false;
  return uid ? owner !== uid : true;
}

export async function reserveNickname(cleanNick, uid){
  const nickRef = ref(db, `nicknames/${cleanNick}`);
  const result = await runTransaction(nickRef, current => {
    if(current && current !== uid) return;
    return uid;
  }, { applyLocally:false });
  if(!result.committed || result.snapshot.val() !== uid){
    throw new Error('Ese nickname ya esta ocupado.');
  }
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
    cups: 0,
    medals: 0,
    silverCups: 0,
    goldCups: 0,
    createdAt: now(),
    updatedAt: now()
  };
  await set(ref(db, `users/${uid}`), profile);
  return profile;
}

export async function updateSaldo(uid, saldo){
  await update(ref(db, `users/${uid}`), { saldo, updatedAt: now() });
}

async function updatePublicAvatar(uid, avatar){
  const paths = [`ranking/${uid}`, `rankingMedals/${uid}`, `rankingCups/${uid}`];
  await Promise.all(paths.map(async path => {
    const nodeRef = ref(db, path);
    const snap = await get(nodeRef);
    if(snap.exists()) await update(nodeRef, { avatar, t:now() });
  }));
}

export async function applyOnlineResult(uid, { saldoDelta = 0, trophiesDelta = 0, awardType = '', cupType = 'silver' } = {}){
  const profile = await getUserProfile(uid) || {};
  const saldo = Math.max(0, Number(profile.saldo ?? INITIAL_SALDO) + Number(saldoDelta || 0));
  const isCup = awardType === 'cup' || cupType === 'gold';
  const awardField = isCup ? 'cups' : 'medals';
  const legacyField = isCup ? 'goldCups' : 'silverCups';
  const delta = Number(trophiesDelta || 0);
  const currentAwards = Number(profile[awardField] ?? profile[legacyField] ?? 0);
  const nextAwards = Math.max(0, currentAwards + delta);
  const patch = {
    saldo,
    [awardField]: nextAwards,
    [legacyField]: nextAwards,
    updatedAt: now()
  };
  await update(ref(db, `users/${uid}`), patch);

  const nextProfile = { ...profile, ...patch };
  const rankingRef = ref(db, `${isCup ? 'rankingCups' : 'rankingMedals'}/${uid}`);
  if(nextAwards > 0){
    await set(rankingRef, {
      uid,
      user: nextProfile.nickname || nextProfile.email || 'Jugador',
      avatar: nextProfile.avatar || '',
      cups: nextAwards,
      t: now()
    });
  }else{
    await remove(rankingRef);
  }
  return nextProfile;
}

export async function syncPublicAwardRankings(uid, profile = {}){
  if(!uid) return;
  const user = publicRankingName(profile);
  const avatar = profile.avatar || '';
  const cups = Number(profile.cups ?? profile.goldCups ?? 0);
  const medals = Number(profile.medals ?? profile.silverCups ?? 0);
  const updates = [];
  if(cups > 0){
    updates.push(set(ref(db, `rankingCups/${uid}`), { uid, user, avatar, cups, t:now() }));
  }
  if(medals > 0){
    updates.push(set(ref(db, `rankingMedals/${uid}`), { uid, user, avatar, cups:medals, t:now() }));
  }
  await Promise.all(updates);
}

export async function updateUserAvatar(uid, avatar){
  await update(ref(db, `users/${uid}`), { avatar, updatedAt: now() });
  await updatePublicAvatar(uid, avatar).catch(() => {});
}

export async function updateUserCardSkins(uid, ownedCardSkins, selectedCardSkin){
  await update(ref(db, `users/${uid}`), { ownedCardSkins, selectedCardSkin, updatedAt: now() });
}

export async function resetOnlineStats(uid){
  await update(ref(db, `users/${uid}`), {
    saldo: INITIAL_SALDO,
    updatedAt: now()
  });
}

export async function updateUserStats(uid, { pares, net, saldo }){
  const profile = await getUserProfile(uid) || {};
  const games = Number(profile.games || 0) + 1;
  const totalPairs = Number(profile.totalPairs || 0) + pares;
  const best = Math.max(Number(profile.best || 0), pares);
  const profit = Number(profile.profit || 0) + net;

  const patch = { games, totalPairs, best, profit, saldo, updatedAt: now() };
  await update(ref(db, `users/${uid}`), patch);
  return { ...profile, ...patch };
}

export async function addLiveHistory({ uid, user, pares, intentos, net, avatar }){
  await push(ref(db, 'historial'), {
    uid,
    user:user || 'Jugador',
    pares,
    intentos,
    net,
    t: now(),
    avatar: fallbackAvatar(avatar)
  });
}

export async function addLeaderboardEntry({ uid, user, tiempoMs, intentos, pares, premio, avatar }){
  const entryRef = ref(db, `ranking/${uid}`);
  const snap = await get(entryRef);
  const current = snap.exists() ? snap.val() : null;
  const nextPairs = Number(pares || 0);
  const nextTime = Number(tiempoMs || Infinity);
  const nextTries = Number(intentos || Infinity);
  const isBetter = !current
    || nextPairs > Number(current.pares || 0)
    || (nextPairs === Number(current.pares || 0)
      && (nextTime < Number(current.tiempoMs || Infinity)
        || (nextTime === Number(current.tiempoMs || Infinity)
          && nextTries < Number(current.intentos || Infinity))));

  if(!isBetter) return;
  await set(entryRef, {
    uid,
    user:user || 'Jugador',
    tiempoMs,
    segundos: Math.round(tiempoMs / 100) / 10,
    intentos,
    pares,
    premio,
    t: now(),
    avatar: fallbackAvatar(avatar)
  });
}

export function listenLeaderboard(callback){
  const state = { solo: [], legacySolo: [], silver: [], gold: [] };
  const emit = () => callback({
    solo:sortSoloRanking([...state.solo, ...state.legacySolo]),
    silver:[...state.silver],
    gold:[...state.gold]
  });

  const stopSolo = onValue(query(ref(db, 'ranking'), limitToLast(80)), snapshot => {
    state.solo = entriesFromData(snapshot.val());
    emit();
  });

  const stopLegacySolo = onValue(query(ref(db, 'leaderboard'), limitToLast(80)), snapshot => {
    state.legacySolo = entriesFromData(snapshot.val());
    emit();
  }, () => {
    state.legacySolo = [];
    emit();
  });

  const stopMedals = onValue(ref(db, 'rankingMedals'), snapshot => {
    state.silver = entriesFromData(snapshot.val())
      .map(item => ({ ...item, cups:publicAwardCount(item) }))
      .filter(item => Number(item.cups || 0) > 0)
      .sort((a,b) => Number(b.cups || 0) - Number(a.cups || 0) || String(a.user).localeCompare(String(b.user)))
      .slice(0, 10);
    emit();
  });

  const stopCups = onValue(ref(db, 'rankingCups'), snapshot => {
    state.gold = entriesFromData(snapshot.val())
      .map(item => ({ ...item, cups:publicAwardCount(item) }))
      .filter(item => Number(item.cups || 0) > 0)
      .sort((a,b) => Number(b.cups || 0) - Number(a.cups || 0) || String(a.user).localeCompare(String(b.user)))
      .slice(0, 10);
    emit();
  });

  return () => {
    stopSolo();
    stopLegacySolo();
    stopMedals();
    stopCups();
  };
}

export function listenLiveHistory(callback){
  const state = { current: [], legacy: [] };
  const emit = () => callback([...state.current, ...state.legacy]
    .sort((a,b)=>(b.t||0)-(a.t||0))
    .slice(0, 12));

  const stopCurrent = onValue(query(ref(db, 'historial'), limitToLast(12)), snapshot => {
    state.current = entriesFromData(snapshot.val());
    emit();
  });

  const stopLegacy = onValue(query(ref(db, 'liveHistory'), limitToLast(12)), snapshot => {
    state.legacy = entriesFromData(snapshot.val());
    emit();
  }, () => {
    state.legacy = [];
    emit();
  });

  return () => {
    stopCurrent();
    stopLegacy();
  };
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
    players: {
      [player.uid]: { ...player, score:0, wager:entry, seat:0 }
    },
    current: 0,
    cards: [],
    flipped: [],
    matched: 0,
    intentos: 0,
    round: 1,
    roundWins: [0, 0],
    suddenDeath: false,
    suddenDeathStep: 0,
    suddenDeathLead: -1,
    matchOver: false,
    statusText: 'Esperando rival online...',
    hostUid: player.uid,
    createdAt: now(),
    updatedAt: now()
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

  const nextPlayers = [...players, { ...player, score:0, wager:entry, seat:players.length }];
  const nextPlayersMap = playersToMap(nextPlayers);
  await update(roomRef, {
    players: nextPlayersMap,
    pot: entry * nextPlayers.length,
    status: 'ready',
    statusText: 'Rival encontrado. Preparando partida...',
    updatedAt: now()
  });
  return { id: roomId, ...room, players: nextPlayersMap, wager:entry, pot:entry * nextPlayers.length, status:'ready' };
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
  await update(ref(db, `onlineRooms/${roomId}`), { ...normalizeRoomPatch(patch), updatedAt: now() });
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
