const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onValueCreated } = require('firebase-functions/v2/database');

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
const COIN_GIFT_AMOUNT = 1000;
const COIN_GIFT_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const REQUIRE_APP_CHECK = process.env.REQUIRE_APP_CHECK === 'true';
const PROTECTED_CALL_OPTIONS = REQUIRE_APP_CHECK ? { enforceAppCheck:true } : {};

function requireAuth(request){
  if(!request.auth?.uid) throw new HttpsError('unauthenticated', 'Inicia sesion para continuar.');
  return request.auth.uid;
}

function assertAppCheck(request){
  if(!REQUIRE_APP_CHECK) return;
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

function listPlayers(players = {}){
  return Object.values(players || {})
    .filter(player => player && player.uid)
    .sort((a, b) => Number(a.seat || 0) - Number(b.seat || 0));
}

function assertParticipant(room, uid){
  if(!room?.players?.[uid]) throw new HttpsError('permission-denied', 'No perteneces a esta sala.');
}

function allowedWager(value){
  const wager = Number(value || 0);
  if(!ONLINE_WAGERS.has(wager)) throw new HttpsError('invalid-argument', 'Entrada online no valida.');
  return wager;
}

async function adjustSaldo(uid, delta){
  const userRef = db.ref(`users/${uid}`);
  let nextProfile = null;
  const result = await userRef.transaction(profile => {
    if(!profile) return profile;
    const current = Number(profile.saldo ?? INITIAL_SALDO);
    const nextSaldo = current + Number(delta || 0);
    if(nextSaldo < 0) return;
    nextProfile = {
      ...profile,
      saldo:nextSaldo,
      updatedAt:now()
    };
    return nextProfile;
  }, undefined, false);
  if(!result.committed || !nextProfile) throw new HttpsError('failed-precondition', 'Saldo insuficiente.');
  return nextProfile;
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

async function removeUserHistory(uid){
  const historyPaths = ['historial', 'liveHistory'];
  for(const path of historyPaths){
    const snap = await db.ref(path).orderByChild('uid').equalTo(uid).get();
    const updates = {};
    snap.forEach(child => {
      updates[child.key] = null;
    });
    if(Object.keys(updates).length) await db.ref(path).update(updates);
  }
}

async function removeUserSocialData(uid){
  const updates = {
    [`publicProfiles/${uid}`]: null,
    [`friendRequests/${uid}`]: null,
    [`friends/${uid}`]: null
  };

  const friendsSnap = await db.ref(`friends/${uid}`).get();
  friendsSnap.forEach(friendSnap => {
    updates[`friends/${friendSnap.key}/${uid}`] = null;
  });

  const requestsSnap = await db.ref('friendRequests').get();
  requestsSnap.forEach(userRequestsSnap => {
    if(userRequestsSnap.key !== uid && userRequestsSnap.child(uid).exists()){
      updates[`friendRequests/${userRequestsSnap.key}/${uid}`] = null;
    }
  });

  await db.ref().update(updates);
}

exports.deleteAccount = onCall(async request => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  const cleanNickname = String(profile.cleanNickname || '').trim();

  const deletes = [
    db.ref(`users/${uid}`).remove(),
    db.ref(`gameSessions/${uid}`).remove(),
    db.ref(`ranking/${uid}`).remove(),
    db.ref(`leaderboard/${uid}`).remove(),
    db.ref(`rankingMedals/${uid}`).remove(),
    db.ref(`rankingCups/${uid}`).remove()
  ];
  if(cleanNickname) deletes.push(db.ref(`nicknames/${cleanNickname}`).remove());

  await Promise.all(deletes);
  await removeUserHistory(uid);
  await removeUserSocialData(uid);

  const roomsSnap = await db.ref('onlineRooms').get();
  const roomUpdates = {};
  roomsSnap.forEach(roomSnap => {
    const room = roomSnap.val() || {};
    if(room.hostUid === uid || room.players?.[uid]){
      roomUpdates[roomSnap.key] = null;
    }
  });
  if(Object.keys(roomUpdates).length) await db.ref('onlineRooms').update(roomUpdates);

  await admin.auth().deleteUser(uid);
  return { ok:true };
});

exports.claimCoinGift = onCall(PROTECTED_CALL_OPTIONS, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const userRef = db.ref(`users/${uid}`);
  const claimAt = now();
  let nextProfile = null;

  const result = await userRef.transaction(profile => {
    if(!profile) return profile;
    const nextAt = Number(profile.coinGiftNextAt || 0);
    if(nextAt > claimAt) return;
    nextProfile = {
      ...profile,
      saldo:Number(profile.saldo ?? INITIAL_SALDO) + COIN_GIFT_AMOUNT,
      coinGiftNextAt:claimAt + COIN_GIFT_COOLDOWN_MS,
      updatedAt:claimAt
    };
    return nextProfile;
  }, undefined, false);

  if(!result.committed || !nextProfile){
    const profile = await getProfile(uid);
    return {
      ok:false,
      saldo:Number(profile.saldo ?? INITIAL_SALDO),
      coinGiftNextAt:Number(profile.coinGiftNextAt || 0)
    };
  }

  return {
    ok:true,
    saldo:Number(nextProfile.saldo || 0),
    coinGiftNextAt:Number(nextProfile.coinGiftNextAt || 0)
  };
});

exports.startSoloGame = onCall(PROTECTED_CALL_OPTIONS, async request => {
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

exports.cancelSoloGame = onCall(PROTECTED_CALL_OPTIONS, async request => {
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

exports.finishSoloGame = onCall(PROTECTED_CALL_OPTIONS, async request => {
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

exports.settleOnlineRoom = onCall(PROTECTED_CALL_OPTIONS, async request => {
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
  if(room.economySettled && !room.economyRewards) throw new HttpsError('aborted', 'La economia de esta sala se esta cerrando.');

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

  const settlementLock = await roomRef.child('economySettled').transaction(current => {
    if(current === true) return;
    return true;
  }, undefined, false);
  if(!settlementLock.committed){
    const freshSnap = await roomRef.get();
    const freshRoom = freshSnap.exists() ? freshSnap.val() : {};
    if(freshRoom.economyRewards) return freshRoom.economyRewards;
    throw new HttpsError('aborted', 'La economia de esta sala ya fue procesada.');
  }

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
    economyRewards:rewards,
    updatedAt:now()
  });

  return rewards;
});

exports.createOnlineRoom = onCall(PROTECTED_CALL_OPTIONS, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const mode = request.data?.mode === 'memory' ? 'memory' : 'classic';
  const wager = allowedWager(request.data?.wager);
  const invitedUid = String(request.data?.invitedUid || '').trim().slice(0, 128);
  const profile = await adjustSaldo(uid, -wager);
  const roomRef = db.ref('onlineRooms').push();
  const room = {
    id:roomRef.key,
    mode,
    wager,
    pot:wager,
    economySettled:false,
    status:'waiting',
    players:{
      [uid]:{
        uid,
        name:safeName(profile),
        avatar:safeAvatar(profile),
        score:0,
        wager,
        seat:0
      }
    },
    current:0,
    cards:[],
    flipped:[],
    matched:0,
    intentos:0,
    round:1,
    roundWins:[0, 0],
    suddenDeath:false,
    suddenDeathStep:0,
    suddenDeathLead:-1,
    matchOver:false,
    turnStartedAt:0,
    turnDurationMs:10000,
    turnDeadlineAt:0,
    resolving:false,
    statusText:'Esperando rival online...',
    hostUid:uid,
    invitedUid,
    inviteOnly:!!invitedUid,
    createdAt:now(),
    updatedAt:now()
  };
  try{
    await roomRef.set(room);
  }catch(error){
    await adjustSaldo(uid, wager).catch(() => {});
    throw error;
  }
  return { room, saldo:Number(profile.saldo || 0) };
});

exports.joinOnlineRoom = onCall(PROTECTED_CALL_OPTIONS, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const roomId = String(request.data?.roomId || '');
  const wager = allowedWager(request.data?.wager);
  if(!roomId) throw new HttpsError('invalid-argument', 'Falta sala.');

  const roomRef = db.ref(`onlineRooms/${roomId}`);
  const roomSnap = await roomRef.get();
  if(!roomSnap.exists()) throw new HttpsError('not-found', 'La sala ya no existe.');
  const room = roomSnap.val();
  if(room.status !== 'waiting') throw new HttpsError('failed-precondition', 'La sala ya empezo.');
  if(room.inviteOnly && room.invitedUid && room.invitedUid !== uid && room.hostUid !== uid){
    throw new HttpsError('permission-denied', 'Esta sala privada es para otro jugador.');
  }
  if(Number(room.wager || 0) !== wager) throw new HttpsError('failed-precondition', 'La entrada de esa sala ya no coincide.');

  const players = listPlayers(room.players);
  if(players.some(player => player.uid === uid)) return { room, saldo:Number((await getProfile(uid)).saldo ?? INITIAL_SALDO) };
  if(players.length >= 2) throw new HttpsError('failed-precondition', 'La sala esta llena.');

  const profile = await adjustSaldo(uid, -wager);
  let nextRoom = null;
  let failure = '';
  const joinResult = await roomRef.transaction(current => {
    if(!current){
      failure = 'La sala ya no existe.';
      return;
    }
    if(current.status !== 'waiting'){
      failure = 'La sala ya empezo.';
      return;
    }
    if(current.inviteOnly && current.invitedUid && current.invitedUid !== uid && current.hostUid !== uid){
      failure = 'Esta sala privada es para otro jugador.';
      return;
    }
    if(Number(current.wager || 0) !== wager){
      failure = 'La entrada de esa sala ya no coincide.';
      return;
    }
    const currentPlayers = listPlayers(current.players);
    if(currentPlayers.some(player => player.uid === uid)){
      nextRoom = current;
      return current;
    }
    if(currentPlayers.length >= 2){
      failure = 'La sala esta llena.';
      return;
    }
    nextRoom = {
      ...current,
      players:{
        ...(current.players || {}),
        [uid]:{
          uid,
          name:safeName(profile),
          avatar:safeAvatar(profile),
          score:0,
          wager,
          seat:currentPlayers.length
        }
      },
      pot:wager * (currentPlayers.length + 1),
      status:'ready',
      statusText:'Rival encontrado. Preparando partida...',
      updatedAt:now()
    };
    return nextRoom;
  }, undefined, false);

  if(!joinResult.committed || !nextRoom){
    await adjustSaldo(uid, wager).catch(() => {});
    throw new HttpsError('failed-precondition', failure || 'No se pudo entrar a la sala.');
  }
  return { room:nextRoom, saldo:Number(profile.saldo || 0) };
});

exports.updateOnlineRoom = onCall(PROTECTED_CALL_OPTIONS, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const roomId = String(request.data?.roomId || '');
  const patch = request.data?.patch || {};
  if(!roomId || !patch || typeof patch !== 'object' || Array.isArray(patch)){
    throw new HttpsError('invalid-argument', 'Actualizacion de sala no valida.');
  }

  const blocked = ['economySettled', 'economyRewards', 'wager', 'pot', 'hostUid', 'invitedUid', 'inviteOnly', 'createdAt'];
  if(Object.keys(patch).some(key => blocked.includes(key))){
    throw new HttpsError('permission-denied', 'Ese campo de sala solo lo modifica el servidor.');
  }

  const roomRef = db.ref(`onlineRooms/${roomId}`);
  const snap = await roomRef.get();
  if(!snap.exists()) throw new HttpsError('not-found', 'Sala no encontrada.');
  const room = snap.val();
  assertParticipant(room, uid);

  if(patch.concededBy || patch.status === 'finished'){
    const players = listPlayers(room.players);
    const opponent = players.find(player => player.uid !== uid);
    if(patch.concededBy && (!opponent || patch.concededBy !== uid || patch.winnerUid !== opponent.uid)){
      throw new HttpsError('permission-denied', 'Abandono online no valido.');
    }
  }

  await roomRef.update({
    ...patch,
    updatedAt:now()
  });
  const nextSnap = await roomRef.get();
  return { room:nextSnap.exists() ? nextSnap.val() : null };
});

exports.concedeOnlineRoom = onCall(PROTECTED_CALL_OPTIONS, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const roomId = String(request.data?.roomId || '');
  if(!roomId) throw new HttpsError('invalid-argument', 'Falta sala.');

  const roomRef = db.ref(`onlineRooms/${roomId}`);
  const snap = await roomRef.get();
  if(!snap.exists()) return { ok:false };
  const room = snap.val();
  if(room.status === 'finished') return { ok:false };
  assertParticipant(room, uid);

  const players = listPlayers(room.players);
  const opponent = players.find(player => player.uid !== uid);
  if(!opponent) return { ok:false };

  await roomRef.update({
    status:'finished',
    resolving:false,
    matchOver:true,
    turnStartedAt:0,
    turnDeadlineAt:0,
    winnerUid:opponent.uid,
    winnerName:opponent.name || 'Jugador',
    concededBy:uid,
    statusText:`${opponent.name || 'Jugador'} gana por abandono`,
    updatedAt:now()
  });
  return { ok:true };
});

exports.removeOnlineRoom = onCall(PROTECTED_CALL_OPTIONS, async request => {
  assertAppCheck(request);
  const uid = requireAuth(request);
  const roomId = String(request.data?.roomId || '');
  if(!roomId) return { ok:false };

  const roomRef = db.ref(`onlineRooms/${roomId}`);
  const snap = await roomRef.get();
  if(!snap.exists()) return { ok:false };
  const room = snap.val();
  assertParticipant(room, uid);
  const players = listPlayers(room.players);
  const hasOpponent = players.some(player => player.uid && player.uid !== uid);
  if(hasOpponent && room.status !== 'waiting' && room.status !== 'searching'){
    throw new HttpsError('failed-precondition', 'No se puede borrar una sala activa con rival.');
  }
  const wager = Number(room.players?.[uid]?.wager || room.wager || 0);
  let removedRoom = false;
  const removeResult = await roomRef.transaction(current => {
    if(!current) return;
    const currentPlayers = listPlayers(current.players);
    const currentHasOpponent = currentPlayers.some(player => player.uid && player.uid !== uid);
    if(currentHasOpponent && current.status !== 'waiting' && current.status !== 'searching') return;
    removedRoom = true;
    return null;
  }, undefined, false);
  if(!removeResult.committed || !removedRoom) throw new HttpsError('failed-precondition', 'No se pudo cancelar esa sala.');
  if(wager > 0 && !room.economySettled){
    await adjustSaldo(uid, wager);
  }
  const profile = await getProfile(uid);
  return { ok:true, saldo:Number(profile.saldo ?? INITIAL_SALDO) };
});

exports.processOnlineConcede = onValueCreated('/onlineConcedes/{roomId}/{uid}', async event => {
  const { roomId, uid } = event.params;
  const roomRef = db.ref(`onlineRooms/${roomId}`);
  const snap = await roomRef.get();
  if(!snap.exists()){
    await event.data.ref.remove();
    return;
  }

  const room = snap.val();
  if(room.status === 'finished' || !room.players?.[uid]){
    await event.data.ref.remove();
    return;
  }

  const players = listPlayers(room.players);
  const opponent = players.find(player => player.uid !== uid);
  if(!opponent){
    await event.data.ref.remove();
    return;
  }

  await roomRef.update({
    status:'finished',
    resolving:false,
    matchOver:true,
    turnStartedAt:0,
    turnDeadlineAt:0,
    winnerUid:opponent.uid,
    winnerName:opponent.name || 'Jugador',
    concededBy:uid,
    statusText:`${opponent.name || 'Jugador'} gana por abandono`,
    updatedAt:now()
  });
  await event.data.ref.remove();
});
