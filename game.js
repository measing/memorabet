import { EMOJIS, K_MAX, TOTAL_PAIRS, G, C, INITIAL_SALDO } from './constants.js';
import { gameState, session, resetGameState } from './state.js';
import { shuffle, wait, formatMoney } from './utils.js';
import { updateSaldo, resetOnlineStats, addLiveHistory, updateUserStats, addLeaderboardEntry } from './database.js';
import { renderBoard, updateCardClasses, updateStats, showMsg, clearBoard, renderUserStats, setNewGameButtonBusy, showVictoryAnimation, formatDuration } from './ui.js';

async function animateVisibleSwap(a, b){
  const board = document.getElementById('board');
  const cards = [...board.querySelectorAll('.card-wrap')];
  const elA = cards[a];
  const elB = cards[b];
  if(!elA || !elB || elA === elB) return;

  const firstA = elA.getBoundingClientRect();
  const firstB = elB.getBoundingClientRect();

  const marker = document.createComment('swap-marker');
  board.insertBefore(marker, elA);
  board.insertBefore(elA, elB);
  board.insertBefore(elB, marker);
  board.removeChild(marker);

  const lastA = elA.getBoundingClientRect();
  const lastB = elB.getBoundingClientRect();

  elA.style.transition = 'none';
  elB.style.transition = 'none';
  elA.style.transform = `translate(${firstA.left - lastA.left}px, ${firstA.top - lastA.top}px) scale(1.04)`;
  elB.style.transform = `translate(${firstB.left - lastB.left}px, ${firstB.top - lastB.top}px) scale(1.04)`;
  elA.style.zIndex = '50';
  elB.style.zIndex = '51';

  await wait(35);

  elA.style.transition = 'transform 1.05s cubic-bezier(.18,.86,.24,1)';
  elB.style.transition = 'transform 1.05s cubic-bezier(.18,.86,.24,1)';
  elA.style.transform = 'translate(0, 0) scale(1)';
  elB.style.transform = 'translate(0, 0) scale(1)';

  await wait(1080);

  elA.style.transition = '';
  elB.style.transition = '';
  elA.style.transform = '';
  elB.style.transform = '';
  elA.style.zIndex = '';
  elB.style.zIndex = '';
}

async function animateShuffle(){
  const board = document.getElementById('board');
  board.classList.add('shuffling');

  // Barajado visible: son pocos intercambios, lentos y reales.
  // El jugador puede seguir algunas cartas con la vista, no como casino turbio de caricatura.
  const visibleSwaps = [
    [0, 5], [3, 10], [12, 7], [15, 2],
    [1, 8], [6, 14], [4, 11], [9, 13],
    [5, 10], [2, 7], [0, 12], [3, 15]
  ];

  for(const [a, b] of visibleSwaps){
    await animateVisibleSwap(a, b);
    const tmp = gameState.cards[a];
    gameState.cards[a] = gameState.cards[b];
    gameState.cards[b] = tmp;
    await wait(160);
  }

  gameState.cards = gameState.cards.map((card, i) => ({
    ...card,
    id: i,
    flipped: false,
    matched: false
  }));

  board.classList.remove('shuffling');
}

export async function newGame(){
  // Bloqueamos solo mientras se prepara la partida, para evitar doble clics reales.
  // Si ya hay una partida en curso, Nueva partida cancela esa ronda y comienza otra limpia.
  if(gameState.starting){
    showMsg('Ya se está preparando una partida. Espera un momento.', 'warning');
    return;
  }

  gameState.gameToken++;
  gameState.playing = false;
  gameState.blocked = false;
  gameState.starting = true;
  gameState.flipped = [];
  gameState.startTime = 0;
  gameState.endTime = 0;
  setNewGameButtonBusy(true);

  if(!session.currentUser){
    gameState.starting = false;
    setNewGameButtonBusy(false);
    document.getElementById('auth-modal').style.display = 'flex';
    return;
  }
  if(gameState.saldo < C){
    gameState.starting = false;
    setNewGameButtonBusy(false);
    showMsg('No tienes saldo suficiente. Reinicia el juego.', 'danger');
    return;
  }

  const token = gameState.gameToken;
  const deck = shuffle([...EMOJIS, ...EMOJIS]);
  gameState.playing = false;
  gameState.cards = deck.map((emoji,i)=>({ id:i, emoji, flipped:true, matched:false }));
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.gananciaPartida = -C;
  gameState.blocked = true;
  gameState.saldo -= C;
  await updateSaldo(session.currentUser.uid, gameState.saldo);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }

  renderBoard(flipCard);
  updateStats();
  showMsg('Memoriza las cartas. Tendrás unos segundos antes del mezclado visible.', 'info');

  await wait(5000);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }
  showMsg('Cartas ocultándose...', 'warning');
  gameState.cards.forEach(c => c.flipped = false);
  updateCardClasses();

  await wait(900);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }
  showMsg('Mezclando cartas... sigue el movimiento con la vista.', 'warning');
  await animateShuffle();
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }

  renderBoard(flipCard);
  await wait(250);
  if(token !== gameState.gameToken){
    gameState.starting = false;
    gameState.blocked = false;
    setNewGameButtonBusy(false);
    return;
  }

  gameState.playing = true;
  gameState.blocked = false;
  gameState.starting = false;
  gameState.startTime = Date.now();
  setNewGameButtonBusy(false);
  renderBoard(flipCard);
  updateStats();
  showMsg('Ahora sí: juega. Si seguiste el movimiento, deberías tener opciones reales.', 'success');
}

export function flipCard(id){
  if(!gameState.playing || gameState.blocked) return;
  const token = gameState.gameToken;
  const card = gameState.cards[id];
  if(!card || card.flipped || card.matched || gameState.flipped.length >= 2) return;

  card.flipped = true;
  gameState.flipped.push(id);
  const el = document.querySelector(`.card-wrap[data-id="${id}"]`);
  if(el) el.classList.add('flipped');

  if(gameState.flipped.length === 2){
    gameState.blocked = true;
    gameState.intentos++;
    updateStats();

    const [a,b] = gameState.flipped.map(i => gameState.cards[i]);
    if(a.emoji === b.emoji){
      setTimeout(async ()=>{
        if(token !== gameState.gameToken) return;
        a.matched = b.matched = true;
        a.flipped = b.flipped = false;
        gameState.matched++;
        gameState.gananciaPartida += G;
        gameState.saldo += G;
        await updateSaldo(session.currentUser.uid, gameState.saldo);
        gameState.flipped = [];
        gameState.blocked = false;
        renderBoard(flipCard);
        updateStats();

        if(gameState.matched === TOTAL_PAIRS) endGame();
        else if(gameState.intentos >= K_MAX) endGame();
        else showMsg(`Par encontrado. +${formatMoney(G)}.`, 'success');
      }, 520);
    }else{
      const wA = document.querySelector(`.card-wrap[data-id="${gameState.flipped[0]}"]`);
      const wB = document.querySelector(`.card-wrap[data-id="${gameState.flipped[1]}"]`);
      wA && wA.classList.add('wrong');
      wB && wB.classList.add('wrong');

      setTimeout(()=>{
        if(token !== gameState.gameToken) return;
        a.flipped = b.flipped = false;
        gameState.flipped = [];
        gameState.blocked = false;
        wA && wA.classList.remove('wrong','flipped');
        wB && wB.classList.remove('wrong','flipped');

        if(gameState.intentos >= K_MAX) endGame();
        else showMsg(`Sin par. Intentos restantes: ${K_MAX - gameState.intentos}.`, 'warning');
      }, 820);
    }
  }
}

export async function endGame(){
  if(!gameState.playing && gameState.endTime) return;
  gameState.playing = false;
  gameState.blocked = true;
  gameState.starting = false;
  setNewGameButtonBusy(false);

  const completed = gameState.matched === TOTAL_PAIRS;
  gameState.endTime = Date.now();
  const tiempoMs = gameState.startTime ? gameState.endTime - gameState.startTime : 0;
  const premioRanking = 10000;
  const net = gameState.gananciaPartida;
  const type = completed ? 'success' : (net > 0 ? 'success' : net === 0 ? 'info' : 'danger');

  if(completed){
    showMsg(`¡Completaste los 8 pares! Tiempo: ${formatDuration(tiempoMs)} · Intentos: ${gameState.intentos} · Premio ficticio: ${formatMoney(premioRanking)}`, 'success');
    showVictoryAnimation({ tiempoMs, intentos: gameState.intentos, premio: premioRanking });
    await addLeaderboardEntry({
      uid: session.currentUser.uid,
      user: session.currentUser.nickname,
      tiempoMs,
      intentos: gameState.intentos,
      pares: gameState.matched,
      premio: premioRanking
    });
  }else{
    showMsg(`Partida terminada. ${gameState.matched}/${TOTAL_PAIRS} · Resultado: ${net >= 0 ? '+' : ''}${formatMoney(net)} · Saldo actual: ${formatMoney(gameState.saldo)}`, type);
  }

  await addLiveHistory({
    user: session.currentUser.nickname,
    pares: gameState.matched,
    intentos: gameState.intentos,
    net
  });
  const updated = await updateUserStats(session.currentUser.uid, {
    pares: gameState.matched,
    net,
    saldo: gameState.saldo
  });
  renderUserStats(updated);
  updateStats();
}


export async function resetGame(){
  resetGameState();
  gameState.saldo = INITIAL_SALDO;
  setNewGameButtonBusy(false);
  clearBoard();
  if(session.currentUser) await resetOnlineStats(session.currentUser.uid);
  updateStats();
  showMsg('Juego reiniciado. Presiona Nueva partida.', 'info');
}
