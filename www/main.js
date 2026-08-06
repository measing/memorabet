import { listenAuthState, handleAuthSubmit, setAuthMode, openSettingsPanel, enterGuestMode, initAccountSettings, handleGoogleAccount } from './auth.js?v=88';
import { claimCoinGift, closeGameModePanel, exitGame, resetGame, setSelectedGameMode, setSelectedModeCategory, setSelectedOnlineWager, startSelectedGame, toggleGameModePanel, updateCoinGiftButton } from './game.js?v=94';
import { listenLiveHistory, listenLeaderboard } from './database.js?v=84';
import { session } from './state.js?v=73';
import { renderLiveHistoryList, updateStats, renderLeaderboard, initRulesModal, initViewNavigation, initProfileAvatars, initCardSkinStore } from './ui.js?v=101';
import { initAudioControls } from './audio.js?v=73';
import { initI18n, translatePage } from './i18n.js?v=3';
import { initFriendsFeature, refreshFriendsFeature } from './friends.js?v=5';

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
    if(!session.currentUser) await enterGuestMode({ silent:true });
    await startSelectedGame();
  });
  document.getElementById('btn-coin-gift')?.addEventListener('click', claimCoinGift);
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
bindEvents();
initRulesModal();
initViewNavigation();
initProfileAvatars();
initCardSkinStore();
initAudioControls();
initAccountSettings();
initI18n();
initFriendsFeature();
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
