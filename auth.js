import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth } from './firebase-config.js';
import { INITIAL_SALDO, forbiddenNames } from './constants.js';
import { session, gameState, resetGameState } from './state.js';
import { normalizeNickname, escapeHTML } from './utils.js';
import {
  nicknameTaken,
  reserveNickname,
  releaseNickname,
  getUserProfile,
  createUserProfile
} from './database.js';
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
} from './ui.js';

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
    'auth/network-request-failed':'Error de red. Revisa internet o Live Server.'
  };
  return map[error.code] || `Error: ${error.message}`;
}

export function setAuthMode(mode){
  session.authMode = mode;
  setAuthModeUI(mode);
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
      session.currentUser = { uid: user.uid, email: user.email, nickname: profile.nickname, avatar: profile.avatar || '', ownedCardSkins: profile.ownedCardSkins || [], selectedCardSkin: profile.selectedCardSkin || 'default' };
      gameState.saldo = Number(profile.saldo ?? INITIAL_SALDO);
      hideAuthModal();
      renderUser(profile);
      updateStats();
      showMsg(`Perfil creado como ${escapeHTML(profile.nickname)}. Presiona Nueva partida para comenzar.`, 'success');
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
      session.currentUser = { uid, email: cred.user.email, nickname: profile.nickname, avatar: profile.avatar || '', ownedCardSkins: profile.ownedCardSkins || [], selectedCardSkin: profile.selectedCardSkin || 'default' };
      gameState.saldo = Number(profile.saldo ?? INITIAL_SALDO);
      hideAuthModal();
      renderUser(profile);
      updateStats();
      showMsg(`Cuenta creada como ${escapeHTML(profile.nickname)}. Presiona Nueva partida para comenzar.`, 'success');
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
      session.currentUser = null;
      session.pendingProfileUser = null;
      showAuthModal();
      setAuthMode('login');
      document.getElementById('player-name').textContent = 'Jugador';
      resetGameState();
      setNewGameButtonBusy(false);
      clearBoard();
      updateStats();
      resetAvatarDisplay();
      resetCardSkinDisplay();
      const profileName = document.getElementById('profile-name');
      if(profileName) profileName.textContent = 'Jugador';
      return;
    }

    try{
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
      showMsg(`Bienvenido, ${escapeHTML(profile.nickname)}. Presiona Nueva partida para comenzar.`, 'info');
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
