import { INITIAL_SALDO } from './constants.js';

export const session = {
  currentUser: null,
  authMode: 'login',
  pendingProfileUser: null,
  registering: false,
  isGuestMode: false,
  cachedLiveHistory: [],
  cachedLeaderboard: [],
  trophies: 0,
  cups: 0,
  medals: 0
};

export function createLocalDuelState(){
  return {
    active:false,
    mode:'classic',
    current:0,
    round:1,
    roundWins:[0, 0],
    suddenDeath:false,
    suddenDeathStep:0,
    suddenDeathLead:-1,
    matchOver:false,
    statusText:'',
    players:[
      { name:'Jugador 1', score:0 },
      { name:'Jugador 2', score:0 }
    ]
  };
}

export const gameState = {
  playing:false,
  cards:[],
  flipped:[],
  matched:0,
  intentos:0,
  round:1,
  saldo:INITIAL_SALDO,
  gananciaPartida:0,
  onlineWager:0,
  onlinePot:0,
  blocked:false,
  starting:false,
  startTime:0,
  endTime:0,
  gameToken:0,
  localDuel:createLocalDuelState(),
  onlineRoom:null
};

export function resetGameState(){
  gameState.playing = false;
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = 0;
  gameState.intentos = 0;
  gameState.round = 1;
  gameState.saldo = INITIAL_SALDO;
  gameState.gananciaPartida = 0;
  gameState.onlineWager = 0;
  gameState.onlinePot = 0;
  gameState.blocked = false;
  gameState.starting = false;
  gameState.startTime = 0;
  gameState.endTime = 0;
  gameState.gameToken++;
  gameState.localDuel = createLocalDuelState();
  gameState.onlineRoom = null;
}
