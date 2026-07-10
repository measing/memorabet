const LANGUAGE_KEY = 'memorabetLanguage';
export const SUPPORTED_LANGUAGES = [
  { code:'es', label:'Español' },
  { code:'en', label:'English' },
  { code:'de', label:'Deutsch' },
  { code:'pt', label:'Português' },
  { code:'fr', label:'Français' },
  { code:'it', label:'Italiano' }
];

const DICTIONARY = {
  es:{
    'common.player':'Jugador',
    'common.guest':'Invitado',
    'common.loading':'Preparando partida...',
    'common.close':'Cerrar',
    'common.free':'Gratis',
    'common.use':'Usar',
    'common.equip':'Equipar',
    'common.buy':'Comprar',
    'common.equipped':'En uso',
    'common.now':'Ahora mismo',
    'common.secondsAgo':'Hace {seconds} seg',

    'nav.play':'Jugar',
    'nav.store':'Tienda',
    'nav.profile':'Perfil',
    'nav.ranking':'Ranking',
    'nav.history':'Historial',

    'settings.title':'Configuración',
    'settings.account':'Cuenta',
    'settings.audio':'Audio',
    'settings.language':'Idioma',
    'settings.languageLabel':'Idioma del juego',
    'settings.guestStatus':'Juega como invitado o guarda tu progreso con una cuenta.',
    'settings.guestLinkedStatus':'Estás jugando como invitado. Enlaza una cuenta para guardar ranking, historial y compras.',
    'settings.connectedStatus':'Conectado como {name}.',
    'settings.googleContinue':'Continuar con Google',
    'settings.googleChange':'Cambiar a Google',
    'settings.googleLink':'Enlazar con Google',
    'settings.emailRegister':'Crear cuenta con correo',
    'settings.emailLogin':'Ingresar con correo',
    'settings.logout':'Cerrar sesión',
    'settings.master':'General',
    'settings.music':'Música',
    'settings.effects':'Efectos',

    'auth.title':'Cuenta MemoraBet',
    'auth.subtitle':'Crea tu cuenta o inicia sesión para guardar saldo, historial y ranking en línea.',
    'auth.login':'Ingresar',
    'auth.loginShort':'Iniciar sesión',
    'auth.register':'Crear cuenta',
    'auth.google':'Ingresar con Google',
    'auth.back':'Volver',
    'auth.email':'Correo electrónico',
    'auth.password':'Contraseña',
    'auth.nickname':'Nickname único',
    'auth.nicknameFinal':'Elige tu nickname definitivo',
    'auth.saveNickname':'Guardar nickname',
    'auth.guest':'Jugar como invitado',
    'auth.keepGuest':'Seguir como invitado',
    'auth.emailPasswordRequired':'Ingresa correo y contraseña.',
    'auth.passwordLength':'La contraseña debe tener al menos 6 caracteres.',
    'auth.nicknameLength':'El nickname debe tener entre 3 y 16 caracteres.',
    'auth.nicknameChars':'El nickname solo puede usar letras, números y guion bajo.',
    'auth.nicknameForbidden':'Ese nickname no está permitido.',
    'auth.emailInUse':'Ese correo ya está registrado. Entra con Ingresar.',
    'auth.invalidEmail':'El correo no es válido.',
    'auth.invalidCredential':'Correo o contraseña incorrectos.',
    'auth.wrongPassword':'Contraseña incorrecta.',
    'auth.tooMany':'Demasiados intentos. Espera un momento.',
    'auth.popupClosed':'Se cerró la ventana de Google antes de terminar.',
    'auth.popupBlocked':'El navegador bloqueó la ventana de Google.',
    'auth.googleDisabled':'Google no está habilitado en Firebase Authentication.',
    'auth.unknown':'No se pudo entrar. Revisa los datos e intenta de nuevo.',
    'auth.openingGoogle':'Abriendo Google...',
    'auth.guestProgress':'Si inicias sesión o creas una cuenta, tu progreso se guardará en línea desde ese momento.',
    'auth.createProgress':'Crea tu cuenta para guardar el progreso en línea.',
    'auth.loginRecover':'Ingresa para recuperar tu cuenta.',
    'auth.connected':'Cuenta conectada como {name}.',
    'auth.enteredGuest':'Entraste como invitado. Puedes jugar ahora y crear una cuenta desde Configuración cuando quieras.',
    'auth.profileCreated':'Perfil creado como {name}. Presiona Comenzar juego para comenzar.',
    'auth.accountCreated':'Cuenta creada como {name}. Presiona Comenzar juego para comenzar.',
    'auth.welcome':'Bienvenido, {name}. Presiona Comenzar juego para comenzar.',

    'rules.title':'Reglas del juego',
    'rules.close':'Cerrar reglas',
    'rules.one':'Encuentra todas las parejas de cartas iguales.',
    'rules.two':'Entre menos intentos hagas, mayor será tu recompensa.',
    'rules.three':'Ganas dinero por cada pareja encontrada.',
    'rules.four':'Si completas los 8 pares, entras al ranking global.',
    'rules.five':'Si reinicias antes de terminar, pierdes el avance de esa partida.',
    'rules.dontShow':'No volver a mostrar estas reglas',
    'rules.accept':'Entendido, no volver a mostrar',

    'hud.round':'Ronda:',
    'hud.pairs':'Parejas:',
    'hud.tries':'Intentos',
    'hud.time':'Tiempo',
    'button.newGame':'▶ Nueva partida',
    'button.suddenDeath':'▶ Muerte súbita',
    'button.round':'▶ Ronda {round}',
    'button.reset':'↻ Reiniciar',
    'button.exit':'↩ Salir',
    'button.start':'Comenzar juego',
    'button.mode':'Elegir modo de juego',

    'page.store':'Tienda',
    'page.profile':'Perfil',
    'page.history':'Historial',
    'profile.avatars':'Avatares',
    'profile.cups':'Copas:',
    'profile.medals':'Medallas:',
    'profile.games':'Partidas:',
    'profile.average':'Promedio:',
    'profile.best':'Mejor:',
    'profile.total':'Total:',

    'mode.title':'Modo de juego',
    'mode.close':'Cerrar modos',
    'mode.type':'Tipo de juego',
    'mode.offline':'Offline',
    'mode.online':'Online',
    'mode.solo.title':'Jugar solo',
    'mode.solo.desc':'Memoriza las cartas, sigue el mezclado y encuentra los 8 pares antes de quedarte sin intentos.',
    'mode.duel.title':'2 jugadores',
    'mode.duel.desc':'Compartan el celular por turnos. Gana el mejor de 3 rondas; si empatan, entran a muerte súbita hasta que alguien falle.',
    'mode.memory.title':'Duelo memoria',
    'mode.memory.desc':'2 jugadores sin mezclado. Memoriza las cartas y gana quien encuentre los 8 pares en un solo turno; si falla, vuelve a 0.',
    'mode.onlineDuel.title':'Duelo de Pares',
    'mode.onlineDuel.desc':'Busca rival en línea. Se juega por turnos con nombres y fotos de perfil, igual que el duelo de 2 jugadores.',
    'mode.onlineMemory.title':'Duelo de Memoria',
    'mode.onlineMemory.desc':'Las cartas se muestran una vez y luego quedan ocultas. Gana quien encuentre los 8 pares en su turno.',
    'mode.wager':'Entrada online',
    'mode.wagerInfo':'El ganador se lleva el pozo y gana copas. El perdedor pierde la entrada y baja copas.',

    'ranking.emptySolo':'Aún nadie completa los 8 pares.',
    'ranking.emptyCups':'Aún no hay copas en este modo.',
    'ranking.emptyMedals':'Aún no hay medallas en este modo.',
    'ranking.game':'Ranking de juego',
    'ranking.solo':'Solo',
    'ranking.pairs':'Pares',
    'ranking.memory':'Memoria',
    'ranking.soloTitle':'Solo: 8 pares acertados',
    'ranking.pairsTitle':'Duelo de Pares',
    'ranking.memoryTitle':'Duelo de Memoria',
    'ranking.medals':'Medallas',
    'ranking.goldenCups':'Copas doradas',
    'ranking.goldenCup':'Copa dorada',
    'ranking.medal':'Medalla',
    'ranking.tries':'{count} intentos',

    'history.empty':'Sin partidas registradas.',

    'store.default':'Predeterminado',
    'store.galaxy':'Galaxia dorada',
    'store.arcane':'Runas moradas',
    'store.forest':'Bosque esmeralda',
    'store.storm':'Tormenta azul',
    'store.royal':'Corona negra',
    'store.inferno':'Fuego infernal',
    'store.radiant':'Luz radiante',
    'store.tech':'Esmeralda tech',
    'store.login':'Inicia sesión para comprar cartas.',
    'store.noMoney':'Saldo insuficiente. Necesitas {price}.',
    'store.equipped':'{name} equipado.',
    'store.bought':'{name} comprada y equipada.',

    'msg.start':'Presiona Comenzar juego para comenzar.',
    'msg.preparing':'Ya se está preparando una partida. Espera un momento.',
    'msg.memorize':'Memoriza las cartas. Tendrás unos segundos antes del mezclado visible.',
    'msg.hiding':'Cartas ocultándose...',
    'msg.shuffling':'Mezclando cartas... sigue el movimiento con la vista.',
    'msg.play':'Ahora sí: juega. Si seguiste el movimiento, deberías tener opciones reales.',
    'msg.onlineLogin':'Para jugar online necesitas iniciar sesión o crear una cuenta.',
    'msg.noBalance':'No tienes saldo suficiente. Reinicia el juego.',
    'msg.noWagerBalance':'No tienes saldo suficiente para la entrada de {amount}.',
    'msg.searchingOnline':'Buscando rival online...',
    'msg.leftOnlineWin':'Saliste de la partida online. Victoria para el rival.',
    'msg.leftOnlineRoom':'Saliste de la sala online. Puedes buscar otra partida.',
    'msg.leftGame':'Saliste de la partida. Elige modo o comienza otra vez.',
    'msg.pairFound':'Par encontrado. +{amount}.',
    'msg.noPair':'Sin par. Intentos restantes: {count}.',
    'msg.completed':'¡Completaste los 8 pares! Tiempo: {time} · Intentos: {tries} · Premio ficticio: {prize}{guestNote}',
    'msg.guestRank':' · Crea una cuenta para entrar al ranking.',
    'msg.finished':'Partida terminada. {matched}/{total} · Resultado: {result} · Saldo actual: {balance}',
    'msg.reset':'Juego reiniciado. Presiona Comenzar juego.',
    'msg.avatarSaveFailed':'No se pudo guardar el avatar en línea, pero quedó aplicado en este navegador.',

    'online.searching':'Buscando rival online...',
    'online.found':'Rival encontrado',
    'online.closed':'La sala online se cerró.',
    'online.waiting':'Sala creada. Esperando rival online...',
    'online.ready':'Rival encontrado. Preparando partida...',
    'online.preview':'Memoricen las cartas. La partida empieza en unos segundos.',
    'online.lobby':'Volviste al lobby online. Puedes buscar otra partida.',
    'online.finished':'Partida online terminada. Puedes buscar otra partida.',
    'online.turn':'Turno de {name}',
    'online.waitingRival':'Esperando rival online...',
    'online.win':'Ganaste {name}',
    'online.winner':'Ganador',
    'online.winsGame':'{name} gana la partida online.',
    'online.winsLeave':'{name} gana por abandono.',
    'online.backLobby':'Volviendo al lobby...',
    'online.findGame':'Buscar partida',
    'online.pot':'Pozo',
    'online.prize':'Premio',
    'exit.title':'Salir de la partida',
    'exit.body':'Si sales ahora, el otro jugador gana automáticamente y pierdes la entrada.',
    'exit.cancel':'Cancelar',
    'exit.confirm':'Salir',

    'duel.turn':'Turno de {name}',
    'duel.suddenTurn':'Muerte súbita: turno de {name}',
    'duel.firstToEight':'Primero a 8 pares',
    'duel.rounds':'Rondas {a}-{b}',
    'duel.winner':'Ganaste {name}',
    'duel.roundTie':'Ronda {round} empatada',
    'duel.missTurn':'{name} falló. Turno de {next}',
    'duel.suddenAgain':'Muerte súbita sin ganador. Presiona Muerte súbita para otra ronda',

    'victory.title':'¡Felicidades!',
    'victory.found':'Encontraste los 8 pares.',
    'victory.fakePrize':'Premio ficticio: {prize}',
    'victory.time':'Tiempo',
    'victory.tries':'Intentos'
  },
  en:{
    'settings.title':'Settings','settings.account':'Account','settings.audio':'Audio','settings.language':'Language','settings.languageLabel':'Game language','settings.guestStatus':'Play as guest or save your progress with an account.','settings.guestLinkedStatus':'You are playing as guest. Link an account to save ranking, history, and purchases.','settings.connectedStatus':'Connected as {name}.','settings.googleContinue':'Continue with Google','settings.googleChange':'Switch to Google','settings.googleLink':'Link with Google','settings.emailRegister':'Create account with email','settings.emailLogin':'Sign in with email','settings.logout':'Log out','settings.master':'Master','settings.music':'Music','settings.effects':'Effects',
    'nav.play':'Play','nav.store':'Store','nav.profile':'Profile','nav.ranking':'Ranking','nav.history':'History','common.player':'Player','common.guest':'Guest','common.loading':'Preparing game...','common.close':'Close','common.free':'Free','common.use':'Use','common.equip':'Equip','common.buy':'Buy','common.equipped':'Equipped','common.now':'Right now','common.secondsAgo':'{seconds} sec ago',
    'auth.title':'MemoraBet Account','auth.subtitle':'Create an account or sign in to save balance, history, and online ranking.','auth.login':'Sign in','auth.loginShort':'Sign in','auth.register':'Create account','auth.google':'Sign in with Google','auth.back':'Back','auth.email':'Email','auth.password':'Password','auth.nickname':'Unique nickname','auth.nicknameFinal':'Choose your final nickname','auth.saveNickname':'Save nickname','auth.guest':'Play as guest','auth.keepGuest':'Keep playing as guest','auth.emailPasswordRequired':'Enter email and password.','auth.passwordLength':'Password must have at least 6 characters.','auth.nicknameLength':'Nickname must be 3 to 16 characters.','auth.nicknameChars':'Nickname can only use letters, numbers, and underscore.','auth.nicknameForbidden':'That nickname is not allowed.','auth.emailInUse':'That email is already registered. Use Sign in.','auth.invalidEmail':'The email is not valid.','auth.invalidCredential':'Wrong email or password.','auth.wrongPassword':'Wrong password.','auth.tooMany':'Too many attempts. Wait a moment.','auth.popupClosed':'The Google window was closed before finishing.','auth.popupBlocked':'The browser blocked the Google window.','auth.googleDisabled':'Google is not enabled in Firebase Authentication.','auth.unknown':'Could not sign in. Check your data and try again.','auth.openingGoogle':'Opening Google...','auth.guestProgress':'If you sign in or create an account, your progress will be saved online from now on.','auth.createProgress':'Create your account to save progress online.','auth.loginRecover':'Sign in to recover your account.','auth.connected':'Account connected as {name}.','auth.enteredGuest':'You entered as guest. You can play now and create an account from Settings whenever you want.','auth.profileCreated':'Profile created as {name}. Press Start game to begin.','auth.accountCreated':'Account created as {name}. Press Start game to begin.','auth.welcome':'Welcome, {name}. Press Start game to begin.',
    'rules.title':'Game rules','rules.close':'Close rules','rules.one':'Find all matching card pairs.','rules.two':'The fewer tries you use, the bigger your reward.','rules.three':'You earn money for each pair found.','rules.four':'Complete all 8 pairs to enter the global ranking.','rules.five':'If you restart before finishing, you lose that game progress.','rules.dontShow':'Do not show these rules again','rules.accept':'Got it, do not show again',
    'hud.round':'Round:','hud.pairs':'Pairs:','hud.tries':'Tries','hud.time':'Time','button.newGame':'▶ New game','button.suddenDeath':'▶ Sudden death','button.round':'▶ Round {round}','button.reset':'↻ Restart','button.exit':'↩ Exit','button.start':'Start game','button.mode':'Choose game mode',
    'page.store':'Store','page.profile':'Profile','page.history':'History','profile.avatars':'Avatars','profile.cups':'Cups:','profile.medals':'Medals:','profile.games':'Games:','profile.average':'Average:','profile.best':'Best:','profile.total':'Total:',
    'mode.title':'Game mode','mode.close':'Close modes','mode.type':'Game type','mode.offline':'Offline','mode.online':'Online','mode.solo.title':'Solo play','mode.solo.desc':'Memorize the cards, follow the shuffle, and find all 8 pairs before you run out of tries.','mode.duel.title':'2 players','mode.duel.desc':'Share the device by turns. Best of 3 rounds wins; if tied, sudden death starts until someone misses.','mode.memory.title':'Memory duel','mode.memory.desc':'2 players without shuffle. Memorize the cards and win by finding all 8 pairs in one turn; miss and you reset to 0.','mode.onlineDuel.title':'Pairs Duel','mode.onlineDuel.desc':'Find an online rival. Play by turns with names and profile pictures, like 2-player duel.','mode.onlineMemory.title':'Memory Duel','mode.onlineMemory.desc':'Cards are shown once and then hidden. Whoever finds all 8 pairs on their turn wins.','mode.wager':'Online entry','mode.wagerInfo':'The winner takes the pot and earns cups. The loser loses the entry and drops cups.',
    'ranking.emptySolo':'Nobody has completed all 8 pairs yet.','ranking.emptyCups':'No cups in this mode yet.','ranking.emptyMedals':'No medals in this mode yet.','ranking.game':'Game ranking','ranking.solo':'Solo','ranking.pairs':'Pairs','ranking.memory':'Memory','ranking.soloTitle':'Solo: 8 pairs found','ranking.pairsTitle':'Pairs Duel','ranking.memoryTitle':'Memory Duel','ranking.medals':'Medals','ranking.goldenCups':'Golden cups','ranking.goldenCup':'Golden cup','ranking.medal':'Medal','ranking.tries':'{count} tries','history.empty':'No games recorded.',
    'store.default':'Default','store.galaxy':'Golden galaxy','store.arcane':'Purple runes','store.forest':'Emerald forest','store.storm':'Blue storm','store.royal':'Black crown','store.inferno':'Infernal fire','store.radiant':'Radiant light','store.tech':'Tech emerald','store.login':'Sign in to buy cards.','store.noMoney':'Insufficient balance. You need {price}.','store.equipped':'{name} equipped.','store.bought':'{name} bought and equipped.',
    'msg.start':'Press Start game to begin.','msg.preparing':'A game is already being prepared. Wait a moment.','msg.memorize':'Memorize the cards. You have a few seconds before the visible shuffle.','msg.hiding':'Hiding cards...','msg.shuffling':'Shuffling cards... follow the movement.','msg.play':'Now play. If you followed the movement, you should have real options.','msg.onlineLogin':'To play online you need to sign in or create an account.','msg.noBalance':'Insufficient balance. Restart the game.','msg.noWagerBalance':'You do not have enough balance for the {amount} entry.','msg.searchingOnline':'Searching for online rival...','msg.leftOnlineWin':'You left the online game. Victory goes to the rival.','msg.leftOnlineRoom':'You left the online room. You can search for another game.','msg.leftGame':'You left the game. Choose a mode or start again.','msg.pairFound':'Pair found. +{amount}.','msg.noPair':'No pair. Tries left: {count}.','msg.completed':'You completed all 8 pairs! Time: {time} · Tries: {tries} · Fake prize: {prize}{guestNote}','msg.guestRank':' · Create an account to enter the ranking.','msg.finished':'Game over. {matched}/{total} · Result: {result} · Current balance: {balance}','msg.reset':'Game restarted. Press Start game.','msg.avatarSaveFailed':'Could not save avatar online, but it was applied in this browser.',
    'online.searching':'Searching for online rival...','online.found':'Rival found','online.closed':'The online room was closed.','online.waiting':'Room created. Waiting for online rival...','online.ready':'Rival found. Preparing game...','online.preview':'Memorize the cards. The game starts in a few seconds.','online.lobby':'Back to online lobby. You can search for another game.','online.finished':'Online game finished. You can search for another game.','online.turn':'Turn of {name}','online.waitingRival':'Waiting for online rival...','online.win':'You won, {name}','online.winner':'Winner','online.winsGame':'{name} wins the online game.','online.winsLeave':'{name} wins by forfeit.','online.backLobby':'Returning to lobby...','online.findGame':'Find game','online.pot':'Pot','online.prize':'Prize',
    'exit.title':'Leave game','exit.body':'If you leave now, the other player wins automatically and you lose the entry.','exit.cancel':'Cancel','exit.confirm':'Leave',
    'duel.turn':'Turn of {name}','duel.suddenTurn':'Sudden death: turn of {name}','duel.firstToEight':'First to 8 pairs','duel.rounds':'Rounds {a}-{b}','duel.winner':'You won, {name}','duel.roundTie':'Round {round} tied','duel.missTurn':'{name} missed. Turn of {next}','duel.suddenAgain':'Sudden death with no winner. Press Sudden death for another round',
    'victory.title':'Congratulations!','victory.found':'You found all 8 pairs.','victory.fakePrize':'Fake prize: {prize}','victory.time':'Time','victory.tries':'Tries'
  },
  de:{
    'settings.title':'Einstellungen','settings.account':'Konto','settings.audio':'Audio','settings.language':'Sprache','settings.languageLabel':'Sprache des Spiels','nav.play':'Spielen','nav.store':'Shop','nav.profile':'Profil','nav.ranking':'Rangliste','nav.history':'Verlauf','button.start':'Spiel starten','button.mode':'Spielmodus wählen','common.player':'Spieler','common.guest':'Gast',
    'settings.guestStatus':'Spiele als Gast oder speichere deinen Fortschritt mit einem Konto.','settings.connectedStatus':'Verbunden als {name}.','settings.googleContinue':'Mit Google fortfahren','settings.googleChange':'Zu Google wechseln','settings.googleLink':'Mit Google verknüpfen','settings.emailRegister':'Konto mit E-Mail erstellen','settings.emailLogin':'Mit E-Mail anmelden','settings.logout':'Abmelden','settings.master':'Allgemein','settings.music':'Musik','settings.effects':'Effekte',
    'auth.login':'Anmelden','auth.loginShort':'Anmelden','auth.register':'Konto erstellen','auth.google':'Mit Google anmelden','auth.guest':'Als Gast spielen','auth.email':'E-Mail','auth.password':'Passwort','auth.nickname':'Einzigartiger Nickname','auth.title':'MemoraBet-Konto','auth.subtitle':'Erstelle ein Konto oder melde dich an, um Guthaben, Verlauf und Rangliste online zu speichern.','auth.back':'Zurück',
    'hud.round':'Runde:','hud.pairs':'Paare:','hud.tries':'Versuche','hud.time':'Zeit','page.store':'Shop','page.profile':'Profil','page.history':'Verlauf','ranking.solo':'Solo','ranking.pairs':'Paare','ranking.memory':'Gedächtnis','ranking.memoryTitle':'Gedächtnisduell','ranking.pairsTitle':'Paarduell','ranking.goldenCups':'Goldene Pokale','ranking.emptySolo':'Noch niemand hat alle 8 Paare geschafft.','ranking.emptyCups':'Noch keine Pokale in diesem Modus.','ranking.emptyMedals':'Noch keine Medaillen in diesem Modus.','history.empty':'Keine Spiele registriert.',
    'mode.title':'Spielmodus','mode.offline':'Offline','mode.online':'Online','mode.solo.title':'Solo spielen','mode.duel.title':'2 Spieler','mode.memory.title':'Gedächtnisduell','mode.onlineDuel.title':'Paarduell','mode.onlineMemory.title':'Gedächtnisduell','mode.wager':'Online-Einsatz',
    'msg.start':'Drücke Spiel starten, um zu beginnen.','msg.memorize':'Merke dir die Karten. Danach werden sie sichtbar gemischt.','msg.hiding':'Karten werden verdeckt...','msg.shuffling':'Karten werden gemischt... folge der Bewegung.','msg.play':'Jetzt spielen. Wenn du die Bewegung verfolgt hast, hast du echte Chancen.','button.newGame':'▶ Neues Spiel','button.reset':'↻ Neustart','button.exit':'↩ Beenden'
  },
  pt:{
    'settings.title':'Configuração','settings.account':'Conta','settings.audio':'Áudio','settings.language':'Idioma','settings.languageLabel':'Idioma do jogo','nav.play':'Jogar','nav.store':'Loja','nav.profile':'Perfil','nav.ranking':'Ranking','nav.history':'Histórico','button.start':'Começar jogo','button.mode':'Escolher modo de jogo','common.player':'Jogador','common.guest':'Convidado',
    'settings.guestStatus':'Jogue como convidado ou salve seu progresso com uma conta.','settings.connectedStatus':'Conectado como {name}.','settings.googleContinue':'Continuar com Google','settings.googleChange':'Mudar para Google','settings.googleLink':'Vincular com Google','settings.emailRegister':'Criar conta com e-mail','settings.emailLogin':'Entrar com e-mail','settings.logout':'Sair','settings.master':'Geral','settings.music':'Música','settings.effects':'Efeitos',
    'auth.login':'Entrar','auth.loginShort':'Entrar','auth.register':'Criar conta','auth.google':'Entrar com Google','auth.guest':'Jogar como convidado','auth.email':'E-mail','auth.password':'Senha','auth.nickname':'Nickname único','auth.title':'Conta MemoraBet','auth.subtitle':'Crie uma conta ou entre para salvar saldo, histórico e ranking online.','auth.back':'Voltar',
    'hud.round':'Rodada:','hud.pairs':'Pares:','hud.tries':'Tentativas','hud.time':'Tempo','page.store':'Loja','page.profile':'Perfil','page.history':'Histórico','ranking.solo':'Solo','ranking.pairs':'Pares','ranking.memory':'Memória','ranking.memoryTitle':'Duelo de Memória','ranking.pairsTitle':'Duelo de Pares','ranking.goldenCups':'Copas douradas','ranking.emptySolo':'Ainda ninguém completou os 8 pares.','ranking.emptyCups':'Ainda não há copas neste modo.','ranking.emptyMedals':'Ainda não há medalhas neste modo.','history.empty':'Sem partidas registradas.',
    'mode.title':'Modo de jogo','mode.offline':'Offline','mode.online':'Online','mode.solo.title':'Jogar solo','mode.duel.title':'2 jogadores','mode.memory.title':'Duelo memória','mode.onlineDuel.title':'Duelo de Pares','mode.onlineMemory.title':'Duelo de Memória','mode.wager':'Entrada online',
    'msg.start':'Pressione Começar jogo para começar.','msg.memorize':'Memorize as cartas. Você terá alguns segundos antes do embaralhamento visível.','msg.hiding':'Escondendo cartas...','msg.shuffling':'Embaralhando cartas... siga o movimento.','msg.play':'Agora jogue. Se você seguiu o movimento, terá chances reais.','button.newGame':'▶ Nova partida','button.reset':'↻ Reiniciar','button.exit':'↩ Sair'
  },
  fr:{
    'settings.title':'Configuration','settings.account':'Compte','settings.audio':'Audio','settings.language':'Langue','settings.languageLabel':'Langue du jeu','nav.play':'Jouer','nav.store':'Boutique','nav.profile':'Profil','nav.ranking':'Classement','nav.history':'Historique','button.start':'Commencer','button.mode':'Choisir le mode','common.player':'Joueur','common.guest':'Invité',
    'settings.guestStatus':'Joue en invité ou sauvegarde ta progression avec un compte.','settings.connectedStatus':'Connecté comme {name}.','settings.googleContinue':'Continuer avec Google','settings.googleChange':'Changer vers Google','settings.googleLink':'Lier avec Google','settings.emailRegister':'Créer un compte par e-mail','settings.emailLogin':'Connexion par e-mail','settings.logout':'Déconnexion','settings.master':'Général','settings.music':'Musique','settings.effects':'Effets',
    'auth.login':'Connexion','auth.loginShort':'Connexion','auth.register':'Créer un compte','auth.google':'Connexion avec Google','auth.guest':'Jouer en invité','auth.email':'E-mail','auth.password':'Mot de passe','auth.nickname':'Pseudo unique','auth.title':'Compte MemoraBet','auth.subtitle':'Crée un compte ou connecte-toi pour sauvegarder solde, historique et classement en ligne.','auth.back':'Retour',
    'hud.round':'Manche :','hud.pairs':'Paires :','hud.tries':'Essais','hud.time':'Temps','page.store':'Boutique','page.profile':'Profil','page.history':'Historique','ranking.solo':'Solo','ranking.pairs':'Paires','ranking.memory':'Mémoire','ranking.memoryTitle':'Duel de Mémoire','ranking.pairsTitle':'Duel de Paires','ranking.goldenCups':'Coupes dorées','ranking.emptySolo':'Personne n’a encore complété les 8 paires.','ranking.emptyCups':'Aucune coupe dans ce mode.','ranking.emptyMedals':'Aucune médaille dans ce mode.','history.empty':'Aucune partie enregistrée.',
    'mode.title':'Mode de jeu','mode.offline':'Hors ligne','mode.online':'En ligne','mode.solo.title':'Jouer solo','mode.duel.title':'2 joueurs','mode.memory.title':'Duel mémoire','mode.onlineDuel.title':'Duel de Paires','mode.onlineMemory.title':'Duel de Mémoire','mode.wager':'Entrée en ligne',
    'msg.start':'Appuie sur Commencer pour jouer.','msg.memorize':'Mémorise les cartes. Tu as quelques secondes avant le mélange visible.','msg.hiding':'Cartes cachées...','msg.shuffling':'Mélange des cartes... suis le mouvement.','msg.play':'À toi de jouer. Si tu as suivi le mouvement, tu as de vraies options.','button.newGame':'▶ Nouvelle partie','button.reset':'↻ Recommencer','button.exit':'↩ Sortir'
  },
  it:{
    'settings.title':'Impostazioni','settings.account':'Account','settings.audio':'Audio','settings.language':'Lingua','settings.languageLabel':'Lingua del gioco','nav.play':'Gioca','nav.store':'Negozio','nav.profile':'Profilo','nav.ranking':'Classifica','nav.history':'Cronologia','button.start':'Inizia gioco','button.mode':'Scegli modalità','common.player':'Giocatore','common.guest':'Ospite',
    'settings.guestStatus':'Gioca come ospite o salva i progressi con un account.','settings.connectedStatus':'Connesso come {name}.','settings.googleContinue':'Continua con Google','settings.googleChange':'Passa a Google','settings.googleLink':'Collega con Google','settings.emailRegister':'Crea account con email','settings.emailLogin':'Accedi con email','settings.logout':'Esci','settings.master':'Generale','settings.music':'Musica','settings.effects':'Effetti',
    'auth.login':'Accedi','auth.loginShort':'Accedi','auth.register':'Crea account','auth.google':'Accedi con Google','auth.guest':'Gioca come ospite','auth.email':'Email','auth.password':'Password','auth.nickname':'Nickname unico','auth.title':'Account MemoraBet','auth.subtitle':'Crea un account o accedi per salvare saldo, cronologia e classifica online.','auth.back':'Indietro',
    'hud.round':'Round:','hud.pairs':'Coppie:','hud.tries':'Tentativi','hud.time':'Tempo','page.store':'Negozio','page.profile':'Profilo','page.history':'Cronologia','ranking.solo':'Solo','ranking.pairs':'Coppie','ranking.memory':'Memoria','ranking.memoryTitle':'Duello di Memoria','ranking.pairsTitle':'Duello di Coppie','ranking.goldenCups':'Coppe dorate','ranking.emptySolo':'Nessuno ha ancora completato le 8 coppie.','ranking.emptyCups':'Ancora nessuna coppa in questa modalità.','ranking.emptyMedals':'Ancora nessuna medaglia in questa modalità.','history.empty':'Nessuna partita registrata.',
    'mode.title':'Modalità di gioco','mode.offline':'Offline','mode.online':'Online','mode.solo.title':'Gioca solo','mode.duel.title':'2 giocatori','mode.memory.title':'Duello memoria','mode.onlineDuel.title':'Duello di Coppie','mode.onlineMemory.title':'Duello di Memoria','mode.wager':'Ingresso online',
    'msg.start':'Premi Inizia gioco per cominciare.','msg.memorize':'Memorizza le carte. Avrai alcuni secondi prima del mescolamento visibile.','msg.hiding':'Carte nascoste...','msg.shuffling':'Mescolo le carte... segui il movimento.','msg.play':'Ora gioca. Se hai seguito il movimento, hai vere possibilità.','button.newGame':'▶ Nuova partita','button.reset':'↻ Riavvia','button.exit':'↩ Esci'
  }
};

function dictionaryFor(lang){
  return DICTIONARY[lang] || DICTIONARY.es;
}

export function getLanguage(){
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return SUPPORTED_LANGUAGES.some(item => item.code === saved) ? saved : 'es';
}

export function t(key, params = {}){
  const lang = getLanguage();
  const value = dictionaryFor(lang)[key] ?? DICTIONARY.es[key] ?? key;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '');
}

function setText(selector, key){
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = t(key);
  });
}

function setAttr(selector, attr, key){
  document.querySelectorAll(selector).forEach(el => {
    el.setAttribute(attr, t(key));
  });
}

function setPlaceholder(selector, key){
  document.querySelectorAll(selector).forEach(el => {
    el.placeholder = t(key);
  });
}

export function translatePage(){
  const lang = getLanguage();
  document.documentElement.lang = lang;

  setText('#settings-title', 'settings.title');
  setText('#settings-modal .settings-section:nth-of-type(1) h3', 'settings.account');
  setText('#settings-modal .settings-section:nth-of-type(2) h3', 'settings.language');
  setText('#settings-modal .settings-section:nth-of-type(3) h3', 'settings.audio');
  setText('#settings-language-label', 'settings.languageLabel');
  setText('#btn-email-register', 'settings.emailRegister');
  setText('#btn-email-login', 'settings.emailLogin');
  setText('#btn-logout-account', 'settings.logout');
  setText('[for="volume-master"], #volume-master-label', 'settings.master');
  setText('#volume-master-text', 'settings.master');
  setText('#volume-music-text', 'settings.music');
  setText('#volume-effects-text', 'settings.effects');
  setAttr('#settings-close', 'aria-label', 'common.close');
  setAttr('#btn-change-user', 'aria-label', 'settings.title');

  setText('[data-view-target="game"] .menu-label', 'nav.play');
  setText('[data-view-target="store"] .menu-label', 'nav.store');
  setText('[data-view-target="profile"] .menu-label', 'nav.profile');
  setText('[data-view-target="ranking"] .menu-label', 'nav.ranking');
  setText('[data-view-target="history"] .menu-label', 'nav.history');

  setText('#auth-modal h2', 'auth.title');
  setText('#auth-modal p', 'auth.subtitle');
  setText('#tab-register', 'auth.register');
  setText('#auth-google-choice', 'auth.google');
  setText('#auth-back', 'auth.back');
  setText('#auth-google', 'auth.google');
  setPlaceholder('#auth-email', 'auth.email');
  setPlaceholder('#auth-password', 'auth.password');
  setPlaceholder('#auth-nickname', 'auth.nickname');

  setText('#rules-modal h2', 'rules.title');
  setAttr('#rules-accept', 'aria-label', 'rules.close');
  const ruleRows = document.querySelectorAll('#rules-modal .rule-row p');
  ['rules.one','rules.two','rules.three','rules.four','rules.five'].forEach((key, index) => {
    if(ruleRows[index]) ruleRows[index].textContent = t(key);
  });
  setText('.dont-show-row span', 'rules.dontShow');
  setText('.rules-accept', 'rules.accept');

  setText('.top-hud .hud-cell:nth-child(1) span', 'hud.round');
  setText('.top-hud .hud-cell:nth-child(2) span', 'hud.pairs');
  setText('.bottom-hud .bottom-stat:nth-child(1) span', 'hud.tries');
  setText('.bottom-hud .bottom-stat:nth-child(2) span', 'hud.time');
  setText('#btn-reset', 'button.reset');
  setText('#btn-exit', 'button.exit');
  setText('#btn-start-login', 'auth.loginShort');
  setText('#btn-start-register', 'auth.register');
  setText('#btn-start-center', 'button.start');
  setText('#btn-mode-picker', 'button.mode');

  setText('#store-view .view-heading h1', 'page.store');
  setText('#profile-view .view-heading h1', 'page.profile');
  setText('#history-view .view-heading h1', 'page.history');
  setText('.avatar-section h2', 'profile.avatars');
  const profileLabels = document.querySelectorAll('.profile-history span');
  ['profile.cups','profile.medals','profile.games','profile.average','profile.best','profile.total'].forEach((key, index) => {
    if(profileLabels[index]) profileLabels[index].textContent = t(key);
  });

  setText('#game-mode-panel h2', 'mode.title');
  setAttr('#mode-close-button', 'aria-label', 'mode.close');
  setAttr('.mode-tabs', 'aria-label', 'mode.type');
  setText('[data-mode-tab="offline"]', 'mode.offline');
  setText('[data-mode-tab="online"]', 'mode.online');
  setText('.mode-group-offline h3', 'mode.offline');
  setText('.mode-group-online h3', 'mode.online');
  setText('[data-game-mode="solo"] strong', 'mode.solo.title');
  setText('[data-game-mode="solo"] small', 'mode.solo.desc');
  setText('[data-game-mode="duel"] strong', 'mode.duel.title');
  setText('[data-game-mode="duel"] small', 'mode.duel.desc');
  setText('[data-game-mode="memory-duel"] strong', 'mode.memory.title');
  setText('[data-game-mode="memory-duel"] small', 'mode.memory.desc');
  setText('[data-game-mode="online-duel"] strong', 'mode.onlineDuel.title');
  setText('[data-game-mode="online-duel"] small', 'mode.onlineDuel.desc');
  setText('[data-game-mode="online-memory-duel"] strong', 'mode.onlineMemory.title');
  setText('[data-game-mode="online-memory-duel"] small', 'mode.onlineMemory.desc');
  setText('.online-wager-panel h3', 'mode.wager');
  setText('.online-wager-panel p', 'mode.wagerInfo');

  const languageSelect = document.getElementById('language-select');
  if(languageSelect) languageSelect.value = lang;
}

export function setLanguage(lang){
  const next = SUPPORTED_LANGUAGES.some(item => item.code === lang) ? lang : 'es';
  localStorage.setItem(LANGUAGE_KEY, next);
  translatePage();
  document.dispatchEvent(new CustomEvent('memorabet-language-change', { detail:{ language:next } }));
}

export function initI18n(){
  const select = document.getElementById('language-select');
  if(select){
    select.innerHTML = SUPPORTED_LANGUAGES.map(item => `<option value="${item.code}">${item.label}</option>`).join('');
    select.value = getLanguage();
    select.addEventListener('change', () => setLanguage(select.value));
  }
  translatePage();
}
