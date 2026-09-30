import { listenAuthState, handleAuthSubmit, setAuthMode, openSettingsPanel, enterGuestMode, initAccountSettings, handleGoogleAccount } from './auth.js?v=90';
import { claimCoinGift, closeCoinGiftModal, closeGameModePanel, exitGame, openCoinGiftModal, resetGame, setSelectedGameMode, setSelectedModeCategory, setSelectedOnlineWager, startSelectedGame, toggleGameModePanel, updateCoinGiftButton } from './game.js?v=104';
import { listenLiveHistory, listenLeaderboard } from './database.js?v=92';
import { session } from './state.js?v=73';
import { renderLiveHistoryList, updateStats, renderLeaderboard, initRulesModal, initViewNavigation, initProfileAvatars, initCardSkinStore } from './ui.js?v=105';
import { initAudioControls } from './audio.js?v=75';
import { initI18n, translatePage } from './i18n.js?v=7';
import { initFriendsFeature, refreshFriendsFeature } from './friends.js?v=5';

import { initProfileDuels } from './profile-duels.js?v=1';

window.__memorabetMainLoaded = true;

function initMobileLoadingScreen(){
  const screen = document.getElementById('mobile-loading-screen');
  if(!screen) return;

  const isMobile = matchMedia('(max-width:720px), (hover:none) and (pointer:coarse)').matches;
  if(!isMobile){
    screen.classList.add('done');
    return;
  }

  const fill = document.getElementById('mobile-loading-fill');
  const percent = document.getElementById('mobile-loading-percent');
  const text = document.getElementById('mobile-loading-text');
  const phrases = [
    'Barajando cartas...',
    'Preparando la mesa...',
    'Cargando suerte...',
    'Listo para jugar...'
  ];
  let progress = 0;
  let phraseIndex = 0;
  const startedAt = performance.now();
  document.body.classList.add('mobile-loading-active');

  const setProgress = value => {
    progress = Math.max(progress, Math.min(100, value));
    if(fill) fill.style.width = `${progress}%`;
    if(percent) percent.textContent = `${Math.round(progress)}%`;
    const nextPhrase = Math.min(phrases.length - 1, Math.floor(progress / 28));
    if(text && nextPhrase !== phraseIndex){
      phraseIndex = nextPhrase;
      text.textContent = phrases[phraseIndex];
    }
  };

  const timer = setInterval(() => {
    const cap = document.readyState === 'complete' ? 100 : 92;
    setProgress(Math.min(cap, progress + Math.random() * 9 + 4));
  }, 160);

  const finish = () => {
    const waitMs = Math.max(0, 1650 - (performance.now() - startedAt));
    window.setTimeout(() => {
      clearInterval(timer);
      setProgress(100);
      window.setTimeout(() => {
        screen.classList.add('done');
        document.body.classList.remove('mobile-loading-active');
      }, 320);
    }, waitMs);
  };

  if(document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once:true });
}

function openAuth(mode = 'choice'){
  setAuthMode(mode);
  const modal = document.getElementById('auth-modal');
  document.body.classList.add('auth-modal-open');
  if(modal) modal.style.display = 'flex';
}

function initMobileAppSupport(){
  const setAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  };

  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.visualViewport?.addEventListener('resize', setAppHeight);

  const updateInputMode = () => {
    document.documentElement.classList.toggle('touch-device', matchMedia('(hover: none), (pointer: coarse)').matches);
  };
  updateInputMode();
  matchMedia('(hover: none), (pointer: coarse)').addEventListener?.('change', updateInputMode);

  document.addEventListener('pointerup', event => {
    if(event.target instanceof HTMLElement && event.target.matches('button')){
      event.target.blur();
    }
  });
}

function registerServiceWorker(){
  if(!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

function initPwaInstall(){
  const section = document.getElementById('pwa-install-section');
  const settingsButton = document.getElementById('pwa-install-button');
  const settingsStatus = document.getElementById('pwa-install-status');
  const banner = document.getElementById('pwa-install-banner');
  const bannerButton = document.getElementById('pwa-install-banner-button');
  const bannerStatus = document.getElementById('pwa-install-banner-status');
  const dismissButton = document.getElementById('pwa-install-dismiss');
  if(!section || !settingsButton || !settingsStatus || !banner || !bannerButton || !bannerStatus) return;

  let installPrompt = null;
  let bannerDismissed = sessionStorage.getItem('memorabetPwaBannerDismissed') === '1';
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  const setStatus = message => {
    settingsStatus.textContent = message;
    bannerStatus.textContent = message;
  };

  const setBannerVisible = visible => {
    banner.hidden = !visible;
    window.requestAnimationFrame(() => banner.classList.toggle('visible', visible));
  };

  const render = () => {
    if(standalone()){
      settingsButton.hidden = true;
      setBannerVisible(false);
      setStatus('MemoraBet ya esta instalado.');
      return;
    }

    settingsButton.hidden = false;
    settingsButton.disabled = false;
    bannerButton.disabled = false;
    settingsButton.textContent = installPrompt ? 'Instalar MemoraBet' : 'Como instalar MemoraBet';
    bannerButton.textContent = installPrompt ? 'Instalar aplicacion' : 'Ver como instalar';
    setBannerVisible(!bannerDismissed && location.protocol !== 'file:');

    if(installPrompt) setStatus('Listo para instalar en este dispositivo.');
    else if(isIos) setStatus('En Safari: Compartir > Agregar a pantalla de inicio.');
    else if(isAndroid) setStatus('En Chrome: menu > Instalar aplicacion.');
    else setStatus('En Chrome o Edge: abre el menu y elige Instalar MemoraBet.');
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    render();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    bannerDismissed = true;
    render();
  });

  const requestInstall = async () => {
    if(isIos && !installPrompt){
      setStatus('En Safari: toca Compartir y luego Agregar a pantalla de inicio.');
      return;
    }
    if(!installPrompt){
      setStatus(isAndroid
        ? 'En Chrome: abre el menu y toca Instalar aplicacion.'
        : 'En Chrome o Edge: abre el menu y elige Instalar MemoraBet.');
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    if(choice.outcome === 'accepted'){
      bannerDismissed = true;
      setStatus('Instalacion iniciada.');
    }else{
      setStatus('Puedes instalarlo mas tarde.');
    }
    render();
  };

  settingsButton.addEventListener('click', requestInstall);
  bannerButton.addEventListener('click', requestInstall);
  dismissButton?.addEventListener('click', () => {
    bannerDismissed = true;
    sessionStorage.setItem('memorabetPwaBannerDismissed', '1');
    setBannerVisible(false);
  });

  render();
}

function bindEvents(){
  document.getElementById('tab-login')?.addEventListener('click', () => setAuthMode('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => setAuthMode('register'));
  document.getElementById('auth-back')?.addEventListener('click', () => setAuthMode('choice'));
  document.getElementById('auth-submit')?.addEventListener('click', handleAuthSubmit);
  document.getElementById('btn-guest')?.addEventListener('click', enterGuestMode);
  document.getElementById('auth-password')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') handleAuthSubmit();
  });
  document.getElementById('auth-nickname')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') handleAuthSubmit();
  });
  document.getElementById('btn-change-user')?.addEventListener('click', openSettingsPanel);
  document.getElementById('btn-start-center')?.addEventListener('click', async () => {
    try{
      if(!session.currentUser) await enterGuestMode({ silent:true });
      await startSelectedGame();
    }catch(error){
      console.warn('MemoraBet center start failed:', error);
      await startSelectedGame();
    }
  });
  document.getElementById('btn-coin-gift')?.addEventListener('click', openCoinGiftModal);
  document.getElementById('coin-gift-close')?.addEventListener('click', closeCoinGiftModal);
  document.getElementById('coin-gift-claim')?.addEventListener('click', claimCoinGift);
  document.getElementById('coin-gift-modal')?.addEventListener('click', event => {
    if(event.target === event.currentTarget) closeCoinGiftModal();
  });
  document.getElementById('btn-start-login')?.addEventListener('click', () => openAuth('login'));
  document.getElementById('btn-start-google')?.addEventListener('click', handleGoogleAccount);
  document.getElementById('btn-start-register')?.addEventListener('click', () => openAuth('register'));
  document.getElementById('btn-mode-picker')?.addEventListener('click', toggleGameModePanel);
  document.getElementById('mode-close-button')?.addEventListener('click', closeGameModePanel);
  document.getElementById('game-mode-panel')?.addEventListener('click', event => {
    if(event.target === event.currentTarget) closeGameModePanel();
  });
  document.querySelectorAll('[data-game-mode]').forEach(btn => {
    btn.addEventListener('click', () => setSelectedGameMode(btn.dataset.gameMode));
  });
  document.querySelectorAll('[data-mode-tab]').forEach(btn => {
    btn.addEventListener('click', () => setSelectedModeCategory(btn.dataset.modeTab));
  });
  document.querySelectorAll('[data-online-wager]').forEach(btn => {
    btn.addEventListener('click', () => setSelectedOnlineWager(btn.dataset.onlineWager));
  });
  document.getElementById('btn-new')?.addEventListener('click', startSelectedGame);
  document.getElementById('btn-reset')?.addEventListener('click', resetGame);
  document.getElementById('btn-exit')?.addEventListener('click', exitGame);
  window.addEventListener('memorabet-open-auth', event => openAuth(event.detail?.mode || 'choice'));
}

initMobileLoadingScreen();
initMobileAppSupport();
registerServiceWorker();
initPwaInstall();
bindEvents();
initRulesModal();
initViewNavigation();
initProfileAvatars();
initCardSkinStore();
initAudioControls();
initAccountSettings();
initI18n();
initFriendsFeature();
initProfileDuels();
setAuthMode('choice');
updateStats();
updateCoinGiftButton();
listenAuthState();

document.addEventListener('memorabet-language-change', () => {
  translatePage();
  setAuthMode(session.authMode || 'choice');
  updateStats();
  updateCoinGiftButton();
  renderLiveHistoryList();
  renderLeaderboard();
});

listenLiveHistory(history => {
  session.cachedLiveHistory = history;
  renderLiveHistoryList(history);
});

listenLeaderboard(ranking => {
  session.cachedLeaderboard = ranking;
  renderLeaderboard(ranking);
});

setInterval(() => {
  updateStats();
  updateCoinGiftButton();
  renderLiveHistoryList();
  refreshFriendsFeature();
}, 1000);
