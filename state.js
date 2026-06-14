import { INITIAL_SALDO } from './constants.js';

export const session = {
  currentUser: null,
  authMode: 'login',
  pendingProfileUser: null,
  registering: false,
  cachedLiveHistory: [],
  cachedLeaderboard: []
};

export const gameState = {
  playing:false,
  cards:[],
  flipped:[],
  matched:0,
  intentos:0,
  saldo:INITIAL_SALDO,
  gananciaPartida:0,
  blocked:false,
  starting:false,
  startTime:0,
  endTime:0,
  gameToken:0
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
  gameState.starting = false;
  gameState.startTime = 0;
  gameState.endTime = 0;
  gameState.gameToken++;
}
