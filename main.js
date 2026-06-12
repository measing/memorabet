import { listenAuthState, handleAuthSubmit, setAuthMode, logoutUser } from './auth.js';
import { newGame, resetGame } from './game.js';
import { listenLiveHistory } from './database.js';
import { session } from './state.js';
import { renderLiveHistoryList, updateStats } from './ui.js';

function bindEvents(){
  document.getElementById('tab-login')?.addEventListener('click', () => setAuthMode('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => setAuthMode('register'));
  document.getElementById('auth-submit')?.addEventListener('click', handleAuthSubmit);
  document.getElementById('auth-password')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') handleAuthSubmit();
  });
  document.getElementById('auth-nickname')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') handleAuthSubmit();
  });
  document.getElementById('btn-change-user')?.addEventListener('click', logoutUser);
  document.getElementById('btn-new')?.addEventListener('click', newGame);
  document.getElementById('btn-reset')?.addEventListener('click', resetGame);
}

bindEvents();
setAuthMode('login');
updateStats();
listenAuthState();

listenLiveHistory(history => {
  session.cachedLiveHistory = history;
  renderLiveHistoryList(history);
});

setInterval(() => renderLiveHistoryList(), 5000);
