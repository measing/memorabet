const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

admin.initializeApp();

const db = admin.database();

const INITIAL_SALDO = 2000;
const TOTAL_PAIRS = 8;
const SOLO_ENTRY_COST = 500;
const PAIR_REWARD = 300;
const SOLO_RANKING_PRIZE = 10000;
const ONLINE_WAGERS = new Set([500, 1000, 2500, 5000, 10000, 20000]);
const ONLINE_WIN_CUPS = { min:25, max:30 };
const ONLINE_LOSE_CUPS = { min:20, max:26 };

function requireAuth(request){
  if(!request.auth?.uid) throw new HttpsError('unauthenticated', 'Inicia sesion para continuar.');
  return request.auth.uid;
}

function assertAppCheck(request){
  if(!request.app) throw new HttpsError('failed-precondition', 'App Check requerido.');
}

function now(){
  return Date.now();
}

function clampNumber(value, min, max){
  const number = Number(value);
  if(!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function randomInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function safeName(profile = {}){
  const raw = String(profile.nickname || profile.user || profile.email || 'Jugador').trim();
  const name = raw.slice(0, 20);
  return name.length >= 3 ? name : 'Jugador';
}

function safeAvatar(profile = {}){
  const avatar = String(profile.avatar || '');
  return avatar.length <= 120 ? avatar : '';
}

async function getProfile(uid){
  const snap = await db.ref(`users/${uid}`).get();
  return snap.exists() ? snap.val() : {};
}

async function setAwardRanking({ uid, profile, awardType, cups }){
  const path = awardType === 'cup' ? 'rankingCups' : 'rankingMedals';
  const rankingRef = db.ref(`${path}/${uid}`);
  if(cups > 0){
    await rankingRef.set({
      uid,
      user:safeName(profile),
      avatar:safeAvatar(profile),
      cups,
      t:now()
    });
  }else{
    await rankingRef.remove();
  }
}

async function applyOnlineResult(uid, { saldoDelta = 0, trophiesDelta = 0, awardType = 'medal' } = {}){
  const userRef = db.ref(`users/${uid}`);
  let nextProfile = {};

  await userRef.transaction(profile => {
    if(!profile) return profile;
    const isCup = awardType === 'cup';
    const awardField = isCup ? 'cups' : 'medals';
    const legacyField = isCup ? 'goldCups' : 'silverCups';
    const saldo = Math.max(0, Number(profile.saldo ?? INITIAL_SALDO) + Number(saldoDelta || 0));
    const nextAwards = Math.max(0, Number(profile[awardField] ?? profile[legacyField] ?? 0) + Number(trophiesDelta || 0));
    nextProfile = {
      ...profile,
      saldo,
      [awardField]:nextAwards,
      [legacyField]:nextAwards,
      updatedAt:now()
    };
    return nextProfile;
  }, undefined, false);

  await setAwardRanking({
    uid,
    profile:nextProfile,
    awardType,
    cups:Number(nextProfile[awardType === 'cup' ? 'cups' : 'medals'] || 0)
  });
  return nextProfile;
}

exports.startSoloGame = onCall({ enforceAppCheck:true }, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const userRef = db.ref(`users/${uid}`);
  const sessionRef = db.ref(`gameSessions/${uid}`).push();
  let nextSaldo = 0;

  const result = await userRef.transaction(profile => {
    if(!profile) return profile;
    const saldo = Number(profile.saldo ?? INITIAL_SALDO);
    if(saldo < SOLO_ENTRY_COST) return;
    nextSaldo = saldo - SOLO_ENTRY_COST;
    return {
      ...profile,
      saldo:nextSaldo,
      updatedAt:now()
    };
  }, undefined, false);

  if(!result.committed) throw new HttpsError('failed-precondition', 'Saldo insuficiente.');

  await sessionRef.set({
    id:sessionRef.key,
    uid,
    type:'solo',
    status:'started',
    entryCost:SOLO_ENTRY_COST,
    startedAt:now(),
    updatedAt:now()
  });

  return { sessionId:sessionRef.key, saldo:nextSaldo };
});

exports.cancelSoloGame = onCall({ enforceAppCheck:true }, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const sessionId = String(request.data?.sessionId || '');
  if(!sessionId) return { ok:false };

  const sessionRef = db.ref(`gameSessions/${uid}/${sessionId}`);
  const snap = await sessionRef.get();
  if(!snap.exists()) return { ok:false };
  const session = snap.val();
  if(session.status !== 'started') return { ok:false };

  const userRef = db.ref(`users/${uid}`);
  let nextSaldo = 0;
  await userRef.transaction(profile => {
    if(!profile) return profile;
    nextSaldo = Number(profile.saldo ?? INITIAL_SALDO) + Number(session.entryCost || SOLO_ENTRY_COST);
    return { ...profile, saldo:nextSaldo, updatedAt:now() };
  }, undefined, false);

  await sessionRef.update({ status:'cancelled', updatedAt:now() });
  return { ok:true, saldo:nextSaldo };
});

exports.finishSoloGame = onCall({ enforceAppCheck:true }, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const sessionId = String(request.data?.sessionId || '');
  const pares = clampNumber(request.data?.pares, 0, TOTAL_PAIRS);
  const intentos = clampNumber(request.data?.intentos, 0, 10);
  const tiempoMs = clampNumber(request.data?.tiempoMs, 0, 60 * 60 * 1000);
  const completed = pares === TOTAL_PAIRS;
  if(!sessionId) throw new HttpsError('invalid-argument', 'Falta sessionId.');

  const sessionRef = db.ref(`gameSessions/${uid}/${sessionId}`);
  const sessionSnap = await sessionRef.get();
  if(!sessionSnap.exists()) throw new HttpsError('not-found', 'Partida no encontrada.');
  const session = sessionSnap.val();
  if(session.status !== 'started') throw new HttpsError('failed-precondition', 'Partida ya cerrada.');

  const profile = await getProfile(uid);
  const net = (pares * PAIR_REWARD) - Number(session.entryCost || SOLO_ENTRY_COST);
  const finalSaldo = Math.max(0, Number(profile.saldo ?? INITIAL_SALDO) + (pares * PAIR_REWARD));
  const games = Number(profile.games || 0) + 1;
  const totalPairs = Number(profile.totalPairs || 0) + pares;
  const best = Math.max(Number(profile.best || 0), pares);
  const profit = Number(profile.profit || 0) + net;
  const user = safeName(profile);
  const avatar = safeAvatar(profile);

  await db.ref(`users/${uid}`).update({
    saldo:finalSaldo,
    games,
    totalPairs,
    best,
    profit,
    updatedAt:now()
  });

  await db.ref('historial').push({
    uid,
    user,
    pares,
    intentos,
    net,
    t:now(),
    avatar
  });

  if(completed){
    const rankingRef = db.ref(`ranking/${uid}`);
    const rankingSnap = await rankingRef.get();
    const current = rankingSnap.exists() ? rankingSnap.val() : null;
    const isBetter = !current
      || tiempoMs < Number(current.tiempoMs || Infinity)
      || (tiempoMs === Number(current.tiempoMs || Infinity) && intentos < Number(current.intentos || Infinity));
    if(isBetter){
      await rankingRef.set({
        uid,
        user,
        tiempoMs,
        segundos:Math.round(tiempoMs / 100) / 10,
        intentos,
        pares,
        premio:SOLO_RANKING_PRIZE,
        t:now(),
        avatar
      });
    }
  }

  await sessionRef.update({
    status:'finished',
    pares,
    intentos,
    tiempoMs,
    net,
    updatedAt:now()
  });

  return { saldo:finalSaldo, games, totalPairs, best, profit };
});

exports.settleOnlineRoom = onCall({ enforceAppCheck:true }, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const roomId = String(request.data?.roomId || '');
  if(!roomId) throw new HttpsError('invalid-argument', 'Falta roomId.');

  const roomRef = db.ref(`onlineRooms/${roomId}`);
  const roomSnap = await roomRef.get();
  if(!roomSnap.exists()) throw new HttpsError('not-found', 'Sala no encontrada.');
  const room = roomSnap.val();
  if(room.hostUid !== uid) throw new HttpsError('permission-denied', 'Solo el host puede cerrar economia.');
  if(room.status !== 'finished') throw new HttpsError('failed-precondition', 'La sala no termino.');
  if(room.economySettled && room.economyRewards) return room.economyRewards;

  const players = Object.values(room.players || {}).sort((a, b) => Number(a.seat || 0) - Number(b.seat || 0)).slice(0, 2);
  const winner = players.find(player => player.uid === room.winnerUid) || players[Number(room.current || 0)] || players[0];
  const loser = players.find(player => player.uid && player.uid !== winner?.uid);
  if(!winner?.uid || !loser?.uid) throw new HttpsError('failed-precondition', 'Faltan jugadores.');

  const wager = ONLINE_WAGERS.has(Number(room.wager || 0)) ? Number(room.wager || 0) : 500;
  const pot = Math.max(wager * 2, Number(room.pot || 0));
  const awardType = room.mode === 'memory' ? 'cup' : 'medal';
  const rewards = {
    pot,
    wager,
    awardType,
    cupType:awardType === 'cup' ? 'gold' : 'silver',
    winnerUid:winner.uid,
    winnerName:winner.name || room.winnerName || 'Jugador',
    winnerCups:randomInt(ONLINE_WIN_CUPS.min, ONLINE_WIN_CUPS.max),
    loserUid:loser.uid,
    loserName:loser.name || 'Jugador',
    loserCups:randomInt(ONLINE_LOSE_CUPS.min, ONLINE_LOSE_CUPS.max)
  };

  await applyOnlineResult(winner.uid, {
    saldoDelta:pot,
    trophiesDelta:rewards.winnerCups,
    awardType
  });
  await applyOnlineResult(loser.uid, {
    saldoDelta:0,
    trophiesDelta:-rewards.loserCups,
    awardType
  });

  await roomRef.update({
    economySettled:true,
    economyRewards:rewards,
    updatedAt:now()
  });

  return rewards;
});
