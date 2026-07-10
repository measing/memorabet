import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth } from './firebase-config.js?v=71';
import { INITIAL_SALDO, forbiddenNames } from './constants.js?v=71';
import { session, gameState, resetGameState } from './state.js?v=72';
import { normalizeNickname, escapeHTML } from './utils.js?v=71';
import {
  nicknameTaken,
  reserveNickname,
  releaseNickname,
  getUserProfile,
  createUserProfile,
  syncPublicAwardRankings,
  makeUniqueNickname
} from './database.js?v=77';
import {
  setAuthModeUI,
  showAuthModal,
  hideAuthModal,
  showAuthError,
  showMsg,
  renderUser,
  updateStats,
  clearBoard,
  setNewGameButtonBusy,
  showRulesModalIfNeeded,
  resetAvatarDisplay,
  resetCardSkinDisplay
} from './ui.js?v=92';
import { t } from './i18n.js?v=1';

const GUEST_BALANCE_KEY = 'memorabetGuestBalance';
const GUEST_STATS_KEY = 'memorabetGuestStats';
const GUEST_PROFILE = {
  uid: 'guest-local',
  email: '',
  nickname: 'Invitado',
  avatar: 'assets/avatars/avatar-01.png',
  ownedCardSkins: [],
  selectedCardSkin: 'default',
  isGuest: true
};

function isForbiddenNickname(name){
  const clean = normalizeNickname(name);
  return forbiddenNames.some(w => clean.includes(w));
}

function validateEmailPassword(email, password){
  if(!email || !password) return t('auth.emailPasswordRequired');
  if(password.length < 6) return t('auth.passwordLength');
  return '';
}

function validateNickname(nickname){
  if(nickname.length < 3 || nickname.length > 16) return t('auth.nicknameLength');
  if(!/^[a-zA-Z0-9_]+$/.test(nickname)) return t('auth.nicknameChars');
  if(isForbiddenNickname(nickname)) return t('auth.nicknameForbidden');
  return '';
}

function mapAuthError(error){
  const map = {
    'auth/email-already-in-use':t('auth.emailInUse'),
    'auth/invalid-email':t('auth.invalidEmail'),
    'auth/invalid-credential':t('auth.invalidCredential'),
    'auth/wrong-password':t('auth.wrongPassword'),
    'auth/user-not-found':t('auth.invalidCredential'),
    'auth/too-many-requests':t('auth.tooMany'),
    'auth/network-request-failed':'Error de red. Revisa internet o Live Server.',
    'auth/popup-closed-by-user':t('auth.popupClosed'),
    'auth/popup-blocked':t('auth.popupBlocked'),
    'auth/operation-not-allowed':t('auth.googleDisabled'),
    'auth/unauthorized-domain':'Este dominio no esta autorizado en Firebase. Agrega 127.0.0.1, localhost y la IP del computador en Authentication > Settings > Authorized domains.'
  };
  return map[error.code] || `Error: ${error.message}`;
}

export function setAuthMode(mode){
  session.authMode = mode;
  setAuthModeUI(mode);
}

function getGuestBalance(){
  const saved = Number(localStorage.getItem(GUEST_BALANCE_KEY));
  return Number.isFinite(saved) && saved > 0 ? saved : INITIAL_SALDO;
}

function getGuestStats(){
  try{
    const stats = JSON.parse(localStorage.getItem(GUEST_STATS_KEY) || '{}');
    return stats && typeof stats === 'object' ? stats : {};
  }catch{
    return {};
  }
}

function updateAccountButton(){
  const btn = document.getElementById('btn-change-user');
  if(!btn) return;
  btn.innerHTML = '&#9881;&#65039;';
}

function keepSettingsButtonLabel(){
  const btn = document.getElementById('btn-change-user');
  if(btn) btn.innerHTML = '&#9881;&#65039;';
}

function setSettingsVisible(isVisible){
  const modal = document.getElementById('settings-modal');
  if(!modal) return;
  modal.classList.toggle('visible', isVisible);
  modal.setAttribute('aria-hidden', String(!isVisible));
}

function showSettingsStatus(text, type='info'){
  const status = document.getElementById('settings-status');
  if(!status) return;
  status.textContent = text;
  status.className = `settings-status ${type}`;
}

function updateSettingsAccountUI(){
  const status = document.getElementById('settings-account-status');
  const logout = document.getElementById('btn-logout-account');
  const google = document.getElementById('btn-google-account');
  const register = document.getElementById('btn-email-register');
  const login = document.getElementById('btn-email-login');
  const isGuest = session.currentUser?.isGuest;
  const hasAccount = session.currentUser && !isGuest;

  if(status){
    if(hasAccount) status.textContent = t('settings.connectedStatus', { name:session.currentUser.nickname || session.currentUser.email || t('common.player') });
    else status.textContent = t(session.currentUser?.isGuest ? 'settings.guestLinkedStatus' : 'settings.guestStatus');
  }
  if(logout) logout.style.display = hasAccount ? 'block' : 'none';
  if(google) google.textContent = hasAccount ? t('settings.googleChange') : t('settings.googleLink');
  if(register) register.style.display = hasAccount ? 'none' : 'block';
  if(login) login.style.display = hasAccount ? 'none' : 'block';
}

function resetLoggedOutUI(){
  document.getElementById('player-name').textContent = t('common.player');
  resetGameState();
  setNewGameButtonBusy(false);
  clearBoard();
  updateStats();
  resetAvatarDisplay();
  resetCardSkinDisplay();
  const profileName = document.getElementById('profile-name');
  if(profileName) profileName.textContent = t('common.player');
  updateAccountButton();
  keepSettingsButtonLabel();
}

export async function enterGuestMode({ silent = false } = {}){
  session.currentUser = { ...GUEST_PROFILE };
  session.pendingProfileUser = null;
  session.isGuestMode = true;
  if(auth.currentUser) await signOut(auth);
  gameState.saldo = getGuestBalance();
  hideAuthModal();
  renderUser({
    ...GUEST_PROFILE,
    ...getGuestStats(),
    saldo: gameState.saldo
  });
  updateStats();
  updateAccountButton();
  keepSettingsButtonLabel();
  if(silent){
    showMsg(t('msg.start'), 'info');
  }else{
    showMsg(t('auth.enteredGuest'), 'success');
    showRulesModalIfNeeded();
  }
}

export function openAccountSettings(){
  showAuthModal();
  setAuthMode('login');
  const guestButton = document.getElementById('btn-guest');
  if(guestButton) guestButton.textContent = session.currentUser?.isGuest ? t('auth.keepGuest') : t('auth.guest');
  showAuthError(session.currentUser?.isGuest ? t('auth.guestProgress') : '');
}

function openEmailAuth(mode){
  setSettingsVisible(false);
  showAuthModal();
  setAuthMode(mode);
  const guestButton = document.getElementById('btn-guest');
  if(guestButton) guestButton.textContent = t('auth.keepGuest');
  showAuthError(mode === 'register' ? t('auth.createProgress') : t('auth.loginRecover'));
}

async function ensureGoogleProfile(user){
  let profile = await getUserProfile(user.uid);
  if(profile) return profile;

  const base = user.displayName || (user.email || '').split('@')[0] || 'jugador';
  const cleanNickname = await makeUniqueNickname(base);
  await reserveNickname(cleanNickname, user.uid);
  profile = await createUserProfile(user.uid, {
    nickname: cleanNickname,
    email: user.email || ''
  });
  return profile;
}

export async function handleGoogleAccount(){
  showSettingsStatus(t('auth.openingGoogle'), 'info');
  showAuthError(t('auth.openingGoogle'));
  try{
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt:'select_account' });
    session.registering = true;
    const result = await signInWithPopup(auth, provider);
    const profile = await ensureGoogleProfile(result.user);
    session.isGuestMode = false;
    session.currentUser = {
      uid: result.user.uid,
      email: result.user.email,
      nickname: profile.nickname,
      avatar: profile.avatar || '',
      ownedCardSkins: profile.ownedCardSkins || [],
      selectedCardSkin: profile.selectedCardSkin || 'default'
    };
    gameState.saldo = Number(profile.saldo ?? INITIAL_SALDO);
    renderUser(profile);
    syncPublicAwardRankings(result.user.uid, profile).catch(() => {});
    updateStats();
    updateAccountButton();
  keepSettingsButtonLabel();
    updateSettingsAccountUI();
    setSettingsVisible(false);
    hideAuthModal();
    showMsg(t('auth.connected', { name:escapeHTML(profile.nickname) }), 'success');
  }catch(error){
    const message = error.code ? mapAuthError(error) : error.message;
    showSettingsStatus(message, 'danger');
    showAuthError(message);
  }finally{
    session.registering = false;
  }
}

export function openSettingsPanel(){
  updateSettingsAccountUI();
  showSettingsStatus('');
  keepSettingsButtonLabel();
  setSettingsVisible(true);
}

export function initAccountSettings(){
  document.addEventListener('memorabet-language-change', updateSettingsAccountUI);
  document.getElementById('settings-close')?.addEventListener('click', () => setSettingsVisible(false));
  document.getElementById('settings-modal')?.addEventListener('click', event => {
    if(event.target?.id === 'settings-modal') setSettingsVisible(false);
  });
  document.getElementById('btn-google-account')?.addEventListener('click', handleGoogleAccount);
  document.getElementById('auth-google')?.addEventListener('click', handleGoogleAccount);
  document.getElementById('auth-google-choice')?.addEventListener('click', handleGoogleAccount);
  document.getElementById('btn-email-register')?.addEventListener('click', () => openEmailAuth('register'));
  document.getElementById('btn-email-login')?.addEventListener('click', () => openEmailAuth('login'));
  document.getElementById('btn-logout-account')?.addEventListener('click', async () => {
    setSettingsVisible(false);
    await logoutUser();
  });
}

export async function handleAuthSubmit(){
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const nickname = document.getElementById('auth-nickname').value.trim();

  try{
    if(session.authMode === 'repair'){
      const user = session.pendingProfileUser || auth.currentUser;
      if(!user){
        showAuthError('No hay una sesión activa para crear el perfil. Inicia sesión nuevamente.');
        setAuthMode('login');
        return;
      }

      const nickError = validateNickname(nickname);
      if(nickError){ showAuthError(nickError); return; }

      const cleanNick = normalizeNickname(nickname);
      if(await nicknameTaken(cleanNick, user.uid)){
        showAuthError('Ese nickname ya está ocupado. Elige otro, la creatividad aún no está prohibida.');
        return;
      }

      await reserveNickname(cleanNick, user.uid);
      const profile = await createUserProfile(user.uid, { nickname, email: user.email || '' });
      session.pendingProfileUser = null;
      session.isGuestMode = false;
      session.currentUser = { uid: user.uid, email: user.email, nickname: profile.nickname, avatar: profile.avatar || '', ownedCardSkins: profile.ownedCardSkins || [], selectedCardSkin: profile.selectedCardSkin || 'default' };
      gameState.saldo = Number(profile.saldo ?? INITIAL_SALDO);
      hideAuthModal();
      renderUser(profile);
      syncPublicAwardRankings(user.uid, profile).catch(() => {});
      updateStats();
      updateAccountButton();
  keepSettingsButtonLabel();
      showMsg(t('auth.profileCreated', { name:escapeHTML(profile.nickname) }), 'success');
      showRulesModalIfNeeded();
      return;
    }

    const baseError = validateEmailPassword(email, password);
    if(baseError){ showAuthError(baseError); return; }

    if(session.authMode === 'login'){
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }

    const nickError = validateNickname(nickname);
    if(nickError){ showAuthError(nickError); return; }

    const cleanNick = normalizeNickname(nickname);
    if(false && await nicknameTaken(cleanNick)){
      showAuthError('Ese nickname ya está ocupado. La originalidad humana vuelve a estar bajo prueba.');
      return;
    }

    session.registering = true;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await cred.user.getIdToken(true).catch(() => {});
    let reserved = false;

    try{
      await reserveNickname(cleanNick, uid);
      reserved = true;
      const profile = await createUserProfile(uid, { nickname, email });
      session.isGuestMode = false;
      session.currentUser = { uid, email: cred.user.email, nickname: profile.nickname, avatar: profile.avatar || '', ownedCardSkins: profile.ownedCardSkins || [], selectedCardSkin: profile.selectedCardSkin || 'default' };
      gameState.saldo = Number(profile.saldo ?? INITIAL_SALDO);
      hideAuthModal();
      renderUser(profile);
      syncPublicAwardRankings(uid, profile).catch(() => {});
      updateStats();
      updateAccountButton();
  keepSettingsButtonLabel();
      showMsg(t('auth.accountCreated', { name:escapeHTML(profile.nickname) }), 'success');
      showRulesModalIfNeeded();
    }catch(dbError){
      if(reserved) await releaseNickname(cleanNick).catch(() => {});
      await deleteUser(cred.user).catch(() => {});
      if(String(dbError?.message || '').toLowerCase().includes('nickname')){
        throw new Error('Ese nickname ya esta ocupado. Elige otro e intenta crear la cuenta nuevamente.');
      }
      if(dbError?.code === 'PERMISSION_DENIED' || String(dbError?.message || '').toLowerCase().includes('permission')){
        throw new Error('Firebase rechazo guardar el perfil. Revisa que hayas pegado las reglas nuevas de Realtime Database.');
      }
      throw new Error('La cuenta se creó, pero falló el perfil. Se limpió automáticamente. Intenta nuevamente.');
    }
  }catch(error){
    session.registering = false;
    // Caso común durante pruebas: el correo ya existe en Authentication,
    // pero el perfil quedó incompleto en Realtime Database. En vez de dejarte
    // atrapado, intentamos iniciar sesión y luego el listener pedirá nickname.
    if(session.authMode === 'register' && error.code === 'auth/email-already-in-use'){
      try{
        await signInWithEmailAndPassword(auth, email, password);
        return;
      }catch(loginError){
        showAuthError('Ese correo ya existe. Si es tuyo, entra desde Ingresar con la contraseña correcta.');
        return;
      }
    }
    showAuthError(error.code ? mapAuthError(error) : error.message);
  }finally{
    session.registering = false;
  }
}

async function rebuildMissingProfile(user){
  session.currentUser = null;
  session.pendingProfileUser = user;
  showAuthModal();
  setAuthMode('repair');
  showAuthError('Tu cuenta existe, pero falta elegir nickname. Escríbelo y guarda para entrar al juego.');
}

export function listenAuthState(){
  onAuthStateChanged(auth, async (user) => {
    if(!user){
      if(session.isGuestMode && session.currentUser?.isGuest){
        updateAccountButton();
  keepSettingsButtonLabel();
        return;
      }
      await enterGuestMode({ silent:true });
      return;
    }

    try{
      session.isGuestMode = false;
      let profile = await getUserProfile(user.uid);
      if(!profile && session.registering){
        // Espera breve para evitar que el listener se adelante al guardado del perfil.
        await new Promise(resolve => setTimeout(resolve, 900));
        profile = await getUserProfile(user.uid);
      }
      if(!profile){
        await rebuildMissingProfile(user);
        return;
      }

      session.pendingProfileUser = null;
      session.currentUser = { uid: user.uid, email: user.email, nickname: profile.nickname, avatar: profile.avatar || '', ownedCardSkins: profile.ownedCardSkins || [], selectedCardSkin: profile.selectedCardSkin || 'default' };
      gameState.saldo = Number(profile.saldo ?? INITIAL_SALDO);
      hideAuthModal();
      renderUser(profile);
      syncPublicAwardRankings(user.uid, profile).catch(() => {});
      updateStats();
      updateAccountButton();
  keepSettingsButtonLabel();
      showMsg(t('auth.welcome', { name:escapeHTML(profile.nickname) }), 'info');
      showRulesModalIfNeeded();
    }catch(error){
      showAuthError(`No se pudo cargar el perfil: ${error.message}`);
      showAuthModal();
    }
  });
}

export async function logoutUser(){
  await signOut(auth);
}

