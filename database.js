import { ref, get, set, update, push, onValue, query, limitToLast, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { db } from './firebase-config.js';
import { INITIAL_SALDO, avatarPool } from './constants.js';
import { normalizeNickname } from './utils.js';

export async function getNicknameOwner(cleanNick){
  const snap = await get(ref(db, `nicknames/${cleanNick}`));
  return snap.exists() ? snap.val() : null;
}

export async function nicknameTaken(cleanNick, uid = null){
  const owner = await getNicknameOwner(cleanNick);
  if(!owner) return false;
  // Si el nickname ya está reservado por el mismo usuario, no lo tratamos como ocupado.
  // Esto evita el falso error después de crear una cuenta mientras Firebase termina de sincronizar.
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
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(ref(db, `users/${uid}`), profile);
  return profile;
}

export async function updateSaldo(uid, saldo){
  await update(ref(db, `users/${uid}`), { saldo, updatedAt: Date.now() });
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
  const q = query(ref(db, 'leaderboard'), limitToLast(80));
  return onValue(q, snapshot => {
    const data = snapshot.val();
    const ranking = data ? Object.values(data)
      .filter(item => Number(item.pares || 0) >= 8)
      .sort((a,b) => {
        const tiempoDiff = Number(a.tiempoMs || Infinity) - Number(b.tiempoMs || Infinity);
        if(tiempoDiff !== 0) return tiempoDiff;
        const intentosDiff = Number(a.intentos || Infinity) - Number(b.intentos || Infinity);
        if(intentosDiff !== 0) return intentosDiff;
        return Number(b.t || 0) - Number(a.t || 0);
      })
      .slice(0, 10) : [];
    callback(ranking);
  });
}

export function listenLiveHistory(callback){
  const q = query(ref(db, 'liveHistory'), limitToLast(12));
  return onValue(q, snapshot => {
    const data = snapshot.val();
    const history = data ? Object.values(data).sort((a,b)=>(b.t||0)-(a.t||0)) : [];
    callback(history);
  });
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
