import { EMOJIS, K_MAX, TOTAL_PAIRS, G, C, INITIAL_SALDO } from './constants.js';
import { gameState, session, resetGameState } from './state.js';
import { shuffle, wait, formatMoney } from './utils.js';
import { updateSaldo, resetOnlineStats, addLiveHistory, updateUserStats } from './database.js';
import { renderBoard, updateCardClasses, updateStats, showMsg, clearBoard, renderUserStats } from './ui.js';

async function animateShuffle(){
  const board = document.getElementById('board');
  const wraps = [...board.querySelectorAll('.card-wrap')];
  board.classList.add('shuffling');

  wraps.forEach((wrap,i)=>{
    const x = (1.5 - (i % 4)) * 92;
    const y = (1.5 - Math.floor(i / 4)) * 68;
    const r = (i % 2 === 0 ? 1 : -1) * (160 + i*9);
    wrap.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(.88)`;
    wrap.style.zIndex = String(30 + i);
  });
  await wait(820);

  for(let step=0; step<3; step++){
    wraps.forEach((wrap)=>{
      const x = Math.round(Math.random()*240 - 120);
      const y = Math.round(Math.random()*180 - 90);
      const r = Math.round(Math.random()*720 - 360);
      wrap.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${.9 + Math.random()*0.18})`;
      wrap.style.zIndex = String(30 + Math.floor(Math.random()*20));
    });
    await wait(520);
  }

  wraps.forEach(wrap=>{ wrap.style.transform=''; wrap.style.zIndex=''; });
  await wait(650);
  board.classList.remove('shuffling');
}

export async function newGame(){
  if(!session.currentUser){
    document.getElementById('auth-modal').style.display = 'flex';
    return;
  }
  if(gameState.saldo < C){
    showMsg('No tienes saldo suficiente. Reinicia el juego.', 'danger');
    return;
  }

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

  renderBoard(flipCard);
  updateStats();
  showMsg('Memoriza las cartas. Después se darán vuelta y se mezclarán.', 'info');

  await wait(2800);
  showMsg('Cartas ocultándose...', 'warning');
  gameState.cards.forEach(c => c.flipped = false);
  updateCardClasses();

  await wait(900);
  showMsg('Mezclando cartas...', 'warning');
  await animateShuffle();

  gameState.cards = shuffle(gameState.cards).map((card,i)=>({ ...card, id:i, flipped:false, matched:false }));
  renderBoard(flipCard);
  await wait(250);

  gameState.playing = true;
  gameState.blocked = false;
  renderBoard(flipCard);
  updateStats();
  showMsg('Ahora sí: juega.', 'success');
}

export function flipCard(id){
  if(!gameState.playing || gameState.blocked) return;
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
  gameState.playing = false;
  const net = gameState.gananciaPartida;
  const type = net > 0 ? 'success' : net === 0 ? 'info' : 'danger';
  showMsg(`Partida terminada. ${gameState.matched}/${K_MAX} · Resultado: ${net >= 0 ? '+' : ''}${formatMoney(net)} · Saldo actual: ${formatMoney(gameState.saldo)}`, type);

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
  clearBoard();
  if(session.currentUser) await resetOnlineStats(session.currentUser.uid);
  updateStats();
  showMsg('Juego reiniciado. Presiona Nueva partida.', 'info');
}
