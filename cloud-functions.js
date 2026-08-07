import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";
import { app } from './firebase-config.js?v=72';

const functions = getFunctions(app);

function callable(name){
  return httpsCallable(functions, name);
}

export async function startSoloGameServer(){
  const result = await callable('startSoloGame')({});
  return result.data || {};
}

export async function cancelSoloGameServer(sessionId){
  if(!sessionId) return { ok:false };
  const result = await callable('cancelSoloGame')({ sessionId });
  return result.data || {};
}

export async function finishSoloGameServer({ sessionId, pares, intentos, tiempoMs }){
  const result = await callable('finishSoloGame')({ sessionId, pares, intentos, tiempoMs });
  return result.data || {};
}

export async function settleOnlineRoomServer(roomId){
  const result = await callable('settleOnlineRoom')({ roomId });
  return result.data || {};
}

export async function claimCoinGiftServer(){
  const result = await callable('claimCoinGift')({});
  return result.data || {};
}

export async function createOnlineRoomServer({ mode, wager, invitedUid = '' } = {}){
  const result = await callable('createOnlineRoom')({ mode, wager, invitedUid });
  return result.data || {};
}

export async function joinOnlineRoomServer({ roomId, wager } = {}){
  const result = await callable('joinOnlineRoom')({ roomId, wager });
  return result.data || {};
}

export async function updateOnlineRoomServer(roomId, patch){
  const result = await callable('updateOnlineRoom')({ roomId, patch });
  return result.data || {};
}

export async function concedeOnlineRoomServer(roomId){
  const result = await callable('concedeOnlineRoom')({ roomId });
  return result.data || {};
}

export async function removeOnlineRoomServer(roomId){
  const result = await callable('removeOnlineRoom')({ roomId });
  return result.data || {};
}

export async function deleteAccountServer(){
  const result = await callable('deleteAccount')({});
  return result.data || {};
}
