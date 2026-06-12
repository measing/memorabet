import { INITIAL_SALDO } from './constants.js';

export const session = {
  currentUser: null,
  authMode: 'login',
  pendingProfileUser: null,
  cachedLiveHistory: []
};

export const gameState = {
  playing:false,
  cards:[],
  flipped:[],
  matched:0,
  intentos:0,
  saldo:INITIAL_SALDO,
  gananciaPartida:0,
  blocked:false
};

export function resetGameState(){
  gameState.playing = false;
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.saldo = INITIAL_SALDO;
  gameState.gananciaPartida = 0;
  gameState.blocked = false;
}
