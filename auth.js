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
  makeUniqueNickname
} from './database.js?v=74';
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
} from './ui.js?v=78';

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
  if(!email || !password) return 'Ingresa correo y contraseña.';
  if(password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return '';
}

function validateNickname(nickname){
  if(nickname.length < 3) return 'El nickname debe tener al menos 3 caracteres.';
  if(nickname.length > 16) return 'El nickname no puede superar los 16 caracteres.';
  if(!/^[a-zA-Z0-9_]+$/.test(nickname)) return 'El nickname solo puede usar letras, números y guion bajo.';
  if(isForbiddenNickname(nickname)) return 'Ese nickname no está permitido.';
  return '';
}

function mapAuthError(error){
  const map = {
    'auth/email-already-in-use':'Ese correo ya está registrado. Entra con Ingresar.',
    'auth/invalid-email':'El correo no es válido.',
    'auth/invalid-credential':'Correo o contraseña incorrectos.',
    'auth/wrong-password':'Contraseña incorrecta.',
    'auth/user-not-found':'No existe una cuenta con ese correo.',
    'auth/too-many-requests':'Demasiados intentos. Espera un poco.',
    'auth/network-request-failed':'Error de red. Revisa internet o Live Server.',
    'auth/popup-closed-by-user':'Se cerró la ventana de Google antes de terminar.',
    'auth/popup-blocked':'El navegador bloqueó la ventana de Google.',
    'auth/operation-not-allowed':'Google no está habilitado en Firebase Authentication.',
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
    if(hasAccount) status.textContent = `Conectado como ${session.currentUser.nickname || session.currentUser.email || 'Jugador'}.`;
    else status.textContent = 'Estas jugando como invitado. Enlaza una cuenta para guardar ranking, historial y compras.';
  }
  if(logout) logout.style.display = hasAccount ? 'block' : 'none';
  if(google) google.textContent = hasAccount ? 'Cambiar a Google' : 'Enlazar con Google';
  if(register) register.style.display = hasAccount ? 'none' : 'block';
  if(login) login.style.display = hasAccount ? 'none' : 'block';
}

function resetLoggedOutUI(){
  document.getElementById('player-name').textContent = 'Jugador';
  resetGameState();
  setNewGameButtonBusy(false);
  clearBoard();
  updateStats();
  resetAvatarDisplay();
  resetCardSkinDisplay();
  const profileName = document.getElementById('profile-name');
  if(profileName) profileName.textContent = 'Jugador';
  updateAccountButton();
  keepSettingsButtonLabel();
}

export async function enterGuestMode(){
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
  showMsg('Entraste como invitado. Puedes jugar ahora y crear una cuenta desde Configuración cuando quieras.', 'success');
  showRulesModalIfNeeded();
}

export function openAccountSettings(){
  showAuthModal();
  setAuthMode('login');
  const guestButton = document.getElementById('btn-guest');
  if(guestButton) guestButton.textContent = session.currentUser?.isGuest ? 'Seguir como invitado' : 'Jugar como invitado';
  showAuthError(session.currentUser?.isGuest ? 'Si inicias sesión o creas una cuenta, tu progreso se guardará en línea desde ese momento.' : '');
}

function openEmailAuth(mode){
  setSettingsVisible(false);
  showAuthModal();
  setAuthMode(mode);
  const guestButton = document.getElementById('btn-guest');
  if(guestButton) guestButton.textContent = 'Seguir como invitado';
  showAuthError(mode === 'register' ? 'Crea tu cuenta para guardar el progreso en línea.' : 'Ingresa para recuperar tu cuenta.');
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

async function handleGoogleAccount(){
  showSettingsStatus('Abriendo Google...', 'info');
  showAuthError('Abriendo Google...');
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
    updateStats();
    updateAccountButton();
  keepSettingsButtonLabel();
    updateSettingsAccountUI();
    setSettingsVisible(false);
    hideAuthModal();
    showMsg(`Cuenta conectada como ${escapeHTML(profile.nickname)}.`, 'success');
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
      updateStats();
      updateAccountButton();
  keepSettingsButtonLabel();
      showMsg(`Perfil creado como ${escapeHTML(profile.nickname)}. Presiona Comenzar juego para comenzar.`, 'success');
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
    if(await nicknameTaken(cleanNick)){
      showAuthError('Ese nickname ya está ocupado. La originalidad humana vuelve a estar bajo prueba.');
      return;
    }

    session.registering = true;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
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
      updateStats();
      updateAccountButton();
  keepSettingsButtonLabel();
      showMsg(`Cuenta creada como ${escapeHTML(profile.nickname)}. Presiona Comenzar juego para comenzar.`, 'success');
      showRulesModalIfNeeded();
    }catch(dbError){
      if(reserved) await releaseNickname(cleanNick).catch(() => {});
      await deleteUser(cred.user).catch(() => {});
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
      session.currentUser = null;
      session.pendingProfileUser = null;
      session.isGuestMode = false;
      showAuthModal();
      setAuthMode('choice');
      resetLoggedOutUI();
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
      updateStats();
      updateAccountButton();
  keepSettingsButtonLabel();
      showMsg(`Bienvenido, ${escapeHTML(profile.nickname)}. Presiona Comenzar juego para comenzar.`, 'info');
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

