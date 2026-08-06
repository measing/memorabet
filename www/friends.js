import { session } from './state.js?v=73';
import { escapeHTML, formatMoney } from './utils.js?v=71';
import { ONLINE_WAGERS } from './constants.js?v=72';
import {
  acceptFriendRequest,
  listenFriendsBundle,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest
} from './database.js?v=81';
import { joinOnlineGameByRoom, startFriendOnlineGame } from './game.js?v=89';

const PENDING_FRIEND_KEY = 'memorabetPendingFriend';
const PENDING_ROOM_KEY = 'memorabetPendingRoom';
let friendsUnsubscribe = null;
let listeningUid = '';
let lastDuelLink = '';

const $ = id => document.getElementById(id);

function isRealAccount(){
  return !!session.currentUser?.uid && !session.isGuestMode && !String(session.currentUser.uid).startsWith('guest-');
}

function getAppBaseUrl(){
  if(location.protocol === 'file:') return 'https://memorabet.site/';
  const path = location.pathname.replace(/[^/]*$/, '');
  return `${location.origin}${path || '/'}`;
}

function makeFriendLink(uid){
  return `${getAppBaseUrl()}?friend=${encodeURIComponent(uid)}`;
}

function makeRoomLink(roomId){
  return `${getAppBaseUrl()}?room=${encodeURIComponent(roomId)}`;
}

function makeQrUrl(value, size = 220){
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(value)}`;
}

function getCurrentProfile(){
  return {
    uid: session.currentUser?.uid || '',
    nickname: session.currentUser?.nickname || session.currentUser?.email || 'Jugador',
    avatar: session.currentUser?.avatar || ''
  };
}

function setStatus(message = '', type = 'info'){
  const status = $('friends-status');
  if(!status) return;
  status.textContent = message;
  status.className = `friends-status ${message ? 'visible' : ''} ${type}`;
}

function extractValueParam(rawValue, key){
  const value = String(rawValue || '').trim();
  if(!value) return '';
  try{
    const url = new URL(value, getAppBaseUrl());
    return url.searchParams.get(key) || value;
  }catch{
    return value;
  }
}

function extractFriendUid(rawValue){
  return extractValueParam(rawValue, 'friend').trim();
}

function extractRoomId(rawValue){
  return extractValueParam(rawValue, 'room').trim();
}

async function copyText(value){
  if(!value) return false;
  try{
    await navigator.clipboard.writeText(value);
    return true;
  }catch{
    return false;
  }
}

async function shareText(title, text, url){
  if(navigator.share){
    try{
      await navigator.share({ title, text, url });
      return true;
    }catch{
      return false;
    }
  }
  return copyText(url);
}

function openAuth(mode){
  const modal = document.getElementById('auth-modal');
  window.dispatchEvent(new CustomEvent('memorabet-open-auth', { detail:{ mode } }));
  if(modal) modal.style.display = 'flex';
}

function renderGate(){
  const gate = $('friends-auth-gate');
  const content = $('friends-content');
  if(gate) gate.hidden = isRealAccount();
  if(content) content.hidden = !isRealAccount();
}

function renderShareCard(){
  if(!isRealAccount()) return;
  const link = makeFriendLink(session.currentUser.uid);
  const input = $('friend-share-link');
  const qr = $('friend-qr');
  if(input) input.value = link;
  if(qr) qr.src = makeQrUrl(link);
}

function hidePrivateDuelPanel(){
  lastDuelLink = '';
  const panel = $('friend-duel-panel');
  const input = $('friend-duel-link');
  const qr = $('friend-duel-qr');
  if(panel) panel.hidden = true;
  if(input) input.value = '';
  if(qr) qr.removeAttribute('src');
  const status = $('friends-status');
  if(status && status.textContent.toLowerCase().includes('duelo')){
    setStatus('');
  }
}

function avatarMarkup(friend){
  const avatar = friend?.avatar || '';
  if(avatar) return `<img src="${escapeHTML(avatar)}" alt="" />`;
  return '<span aria-hidden="true">&#128100;</span>';
}

function renderRequests(requests = []){
  const list = $('friend-requests-list');
  const count = $('friend-request-count');
  if(count) count.textContent = String(requests.length);
  if(!list) return;
  if(!requests.length){
    list.innerHTML = '<p class="empty">No tienes solicitudes pendientes.</p>';
    return;
  }
  list.innerHTML = requests.map(request => `
    <article class="friend-row">
      <div class="entry-avatar">${avatarMarkup(request)}</div>
      <div>
        <h3>${escapeHTML(request.nickname || 'Jugador')}</h3>
        <p>Quiere agregarte como amigo.</p>
      </div>
      <div class="friend-row-actions">
        <button class="friend-mini-action primary" type="button" data-accept-friend="${escapeHTML(request.uid)}">Aceptar</button>
        <button class="friend-mini-action danger" type="button" data-reject-friend="${escapeHTML(request.uid)}">Rechazar</button>
      </div>
    </article>
  `).join('');
}

function friendPresence(friend = {}){
  const lastSeen = Number(friend.lastSeen || 0);
  const freshOnline = friend.online === true && (!lastSeen || Date.now() - lastSeen < 120000);
  if(freshOnline){
    return '<p class="friend-presence online"><span></span>Conectado</p>';
  }
  return '<p class="friend-presence offline"><span></span>Desconectado</p>';
}

function renderFriends(friends = []){
  const list = $('friends-list');
  const count = $('friend-count');
  if(count) count.textContent = String(friends.length);
  if(!list) return;
  if(!friends.length){
    list.innerHTML = '<p class="empty">Aun no has agregado amigos.</p>';
    return;
  }
  list.innerHTML = friends.map(friend => `
    <article class="friend-row">
      <div class="entry-avatar">${avatarMarkup(friend)}</div>
      <div>
        <h3>${escapeHTML(friend.nickname || 'Jugador')}</h3>
        ${friendPresence(friend)}
      </div>
      <div class="friend-row-actions">
        <button class="friend-mini-action primary" type="button" data-duel-friend="${escapeHTML(friend.uid)}">Pares</button>
        <button class="friend-mini-action blue" type="button" data-memory-friend="${escapeHTML(friend.uid)}">Memoria</button>
        <button class="friend-mini-action danger" type="button" data-remove-friend="${escapeHTML(friend.uid)}">Quitar</button>
      </div>
    </article>
  `).join('');
}

function renderFriendsBundle(bundle = { friends:[], requests:[] }){
  renderGate();
  renderShareCard();
  renderRequests(bundle.requests || []);
  renderFriends(bundle.friends || []);
}

function refreshFriendsListener(){
  renderGate();
  if(!isRealAccount()){
    listeningUid = '';
    if(friendsUnsubscribe){
      friendsUnsubscribe();
      friendsUnsubscribe = null;
    }
    return;
  }

  renderShareCard();
  const uid = session.currentUser.uid;
  if(uid === listeningUid && friendsUnsubscribe) return;
  if(friendsUnsubscribe) friendsUnsubscribe();
  listeningUid = uid;
  friendsUnsubscribe = listenFriendsBundle(uid, renderFriendsBundle);
}

async function handleAddFriend(rawValue){
  if(!isRealAccount()){
    localStorage.setItem(PENDING_FRIEND_KEY, extractFriendUid(rawValue));
    openAuth('login');
    return;
  }
  hidePrivateDuelPanel();
  const friendTarget = extractFriendUid(rawValue);
  if(!friendTarget){
    setStatus('Pega un enlace, ID o nickname.', 'warning');
    return;
  }
  try{
    const target = await sendFriendRequest(getCurrentProfile(), friendTarget);
    setStatus(`Solicitud enviada a ${target.nickname || 'Jugador'}.`, 'success');
    const input = $('friend-code-input');
    if(input) input.value = '';
  }catch(error){
    setStatus(error?.message || 'No se pudo enviar la solicitud.', 'danger');
  }
}

async function createPrivateDuel(friendUid, mode){
  setStatus('Creando sala privada...', 'info');
  const room = await startFriendOnlineGame(friendUid, mode);
  if(!room?.id){
    setStatus('No se pudo crear la sala privada.', 'danger');
    return;
  }
  lastDuelLink = makeRoomLink(room.id);
  const panel = $('friend-duel-panel');
  const input = $('friend-duel-link');
  const qr = $('friend-duel-qr');
  const text = $('friend-duel-text');
  if(panel) panel.hidden = false;
  if(input) input.value = lastDuelLink;
  if(qr) qr.src = makeQrUrl(lastDuelLink);
  if(text) text.textContent = `Entrada: ${formatMoney(room.wager || ONLINE_WAGERS[0])}. Comparte el enlace con tu amigo.`;
  setStatus('Sala privada creada. Comparte el QR o enlace.', 'success');
}

async function consumePendingFriend(){
  const pending = localStorage.getItem(PENDING_FRIEND_KEY);
  if(!pending || !isRealAccount()) return;
  localStorage.removeItem(PENDING_FRIEND_KEY);
  await handleAddFriend(pending);
}

async function consumePendingRoom(){
  const pending = localStorage.getItem(PENDING_ROOM_KEY);
  if(!pending || !isRealAccount()) return;
  localStorage.removeItem(PENDING_ROOM_KEY);
  setStatus('Entrando a duelo privado...', 'info');
  const room = await joinOnlineGameByRoom(pending);
  if(room?.id) setStatus('Entraste a la sala privada.', 'success');
}

function captureIncomingLinks(){
  const params = new URLSearchParams(location.search);
  const friendUid = params.get('friend');
  const roomId = params.get('room');
  if(friendUid) localStorage.setItem(PENDING_FRIEND_KEY, friendUid);
  if(roomId) localStorage.setItem(PENDING_ROOM_KEY, roomId);
}

export function refreshFriendsFeature(){
  refreshFriendsListener();
  consumePendingFriend().catch(() => {});
  consumePendingRoom().catch(() => {});
}

export function initFriendsFeature(){
  captureIncomingLinks();
  renderGate();
  renderShareCard();
  hidePrivateDuelPanel();
  if((localStorage.getItem(PENDING_FRIEND_KEY) || localStorage.getItem(PENDING_ROOM_KEY)) && !isRealAccount()){
    document.querySelector('[data-view-target="friends"]')?.click();
    openAuth('login');
  }

  document.querySelector('[data-friends-login]')?.addEventListener('click', () => openAuth('login'));
  document.querySelector('[data-friends-register]')?.addEventListener('click', () => openAuth('register'));
  $('btn-add-friend')?.addEventListener('click', () => handleAddFriend($('friend-code-input')?.value || ''));
  $('friend-code-input')?.addEventListener('keydown', event => {
    if(event.key === 'Enter') handleAddFriend(event.currentTarget.value);
  });
  $('btn-copy-friend-link')?.addEventListener('click', async () => {
    const ok = await copyText($('friend-share-link')?.value || '');
    setStatus(ok ? 'Enlace copiado.' : 'No se pudo copiar el enlace.', ok ? 'success' : 'danger');
  });
  $('btn-share-friend-link')?.addEventListener('click', async () => {
    const link = $('friend-share-link')?.value || '';
    const ok = await shareText('Agregame en MemoraBet', 'Agregame como amigo en MemoraBet.', link);
    setStatus(ok ? 'Invitacion lista para compartir.' : 'No se pudo compartir.', ok ? 'success' : 'warning');
  });
  $('btn-copy-duel-link')?.addEventListener('click', async () => {
    const ok = await copyText(lastDuelLink || $('friend-duel-link')?.value || '');
    setStatus(ok ? 'Enlace del duelo copiado.' : 'No se pudo copiar el duelo.', ok ? 'success' : 'danger');
  });
  $('btn-share-duel-link')?.addEventListener('click', async () => {
    const link = lastDuelLink || $('friend-duel-link')?.value || '';
    const ok = await shareText('Duelo privado MemoraBet', 'Entra a mi duelo privado de MemoraBet.', link);
    setStatus(ok ? 'Duelo listo para compartir.' : 'No se pudo compartir el duelo.', ok ? 'success' : 'warning');
  });

  $('friend-requests-list')?.addEventListener('click', async event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if(!button || !isRealAccount()) return;
    const acceptUid = button.dataset.acceptFriend;
    const rejectUid = button.dataset.rejectFriend;
    try{
      if(acceptUid){
        await acceptFriendRequest(getCurrentProfile(), acceptUid);
        setStatus('Solicitud aceptada.', 'success');
      }else if(rejectUid){
        await rejectFriendRequest(session.currentUser.uid, rejectUid);
        setStatus('Solicitud rechazada.', 'info');
      }
    }catch(error){
      setStatus(error?.message || 'No se pudo procesar la solicitud.', 'danger');
    }
  });

  $('friends-list')?.addEventListener('click', async event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if(!button || !isRealAccount()) return;
    try{
      if(button.dataset.duelFriend){
        await createPrivateDuel(button.dataset.duelFriend, 'classic');
      }else if(button.dataset.memoryFriend){
        await createPrivateDuel(button.dataset.memoryFriend, 'memory');
      }else if(button.dataset.removeFriend){
        await removeFriend(session.currentUser.uid, button.dataset.removeFriend);
        setStatus('Amigo eliminado.', 'info');
      }
    }catch(error){
      setStatus(error?.message || 'No se pudo completar la accion.', 'danger');
    }
  });

  window.addEventListener('memorabet-friends-view', refreshFriendsFeature);
  setInterval(refreshFriendsFeature, 1200);
}
