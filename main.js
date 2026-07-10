import { listenAuthState, handleAuthSubmit, setAuthMode, openSettingsPanel, enterGuestMode, initAccountSettings } from './auth.js?v=78';
import { closeGameModePanel, exitGame, resetGame, setSelectedGameMode, setSelectedModeCategory, setSelectedOnlineWager, startSelectedGame, toggleGameModePanel } from './game.js?v=79';
import { listenLiveHistory, listenLeaderboard } from './database.js?v=75';
import { session } from './state.js?v=72';
import { renderLiveHistoryList, updateStats, renderLeaderboard, initRulesModal, initViewNavigation, initProfileAvatars, initCardSkinStore } from './ui.js?v=88';
import { initAudioControls } from './audio.js?v=71';

window.__memorabetMainLoaded = true;

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
  document.getElementById('btn-start-center')?.addEventListener('click', () => {
    if(!session.currentUser) openAuth('choice');
    else startSelectedGame();
  });
  document.getElementById('btn-start-login')?.addEventListener('click', () => openAuth('login'));
  document.getElementById('btn-start-register')?.addEventListener('click', () => openAuth('register'));
  document.getElementById('btn-start-guest')?.addEventListener('click', enterGuestMode);
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
}

initMobileAppSupport();
registerServiceWorker();
bindEvents();
initRulesModal();
initViewNavigation();
initProfileAvatars();
initCardSkinStore();
initAudioControls();
initAccountSettings();
setAuthMode('choice');
updateStats();
listenAuthState();

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
  renderLiveHistoryList();
}, 1000);
