// --- ÉLÉMENTS DU DOM ---
const screens = {
    config: document.getElementById('configScreen'),
    ready: document.getElementById('readyScreen'),
    game: document.getElementById('gameScreen'),
    turnEnd: document.getElementById('turnEndScreen'),
    validation: document.getElementById('validationScreen'),
    gameOver: document.getElementById('gameOverScreen')
};

const team1NameInput = document.getElementById('team1Name');
const team2NameInput = document.getElementById('team2Name');
const themeSelect = document.getElementById('themeSelect');
const roundsToPlayInput = document.getElementById('roundsToPlay');
const timePerTurnInput = document.getElementById('timePerTurn');
const startGameBtn = document.getElementById('startGameBtn');
const loadingMessage = document.getElementById('loadingMessage');

const currentTeamTurnH2 = document.getElementById('currentTeamTurnH2');
const currentTeamNameReady = document.getElementById('currentTeamNameReady');
const passPhoneInstructionP = document.getElementById('passPhoneInstruction');
const currentTeamNameInstruction = document.getElementById('currentTeamNameInstruction');
const teamReadyBtn = document.getElementById('teamReadyBtn');

const timerDisplay = document.getElementById('timerDisplay');
const wordToGuessDiv = document.getElementById('wordToGuess');
const guessNormalBtn = document.getElementById('guessNormalBtn');
const guess3WordsBtn = document.getElementById('guess3WordsBtn');
const guessMimeBtn = document.getElementById('guessMimeBtn');
const passWordBtnGame = document.getElementById('passWordBtnGame');
// const currentTurnScoreDiv = document.getElementById('currentTurnScore'); // Masqué

const turnEndMessageH2 = document.getElementById('turnEndMessage');
const teamNameTurnEnd = document.getElementById('teamNameTurnEnd');
const turnScoreSummaryP = document.getElementById('turnScoreSummary');

const validatingTeamNameSpan = document.getElementById('validatingTeamName');
const opponentTeamNameValidatorSpan = document.getElementById('opponentTeamNameValidator');
const validationListDiv = document.getElementById('validationList');
const initialTurnScoreValidatorSpan = document.getElementById('initialTurnScoreValidator');
const adjustedTurnScoreValidatorSpan = document.getElementById('adjustedTurnScoreValidator');
const confirmValidationBtn = document.getElementById('confirmValidationBtn');

const finalTeam1ScoreP = document.getElementById('finalTeam1Score');
const finalTeam2ScoreP = document.getElementById('finalTeam2Score');
const winnerMessageH3 = document.getElementById('winnerMessage');
const newGameBtn = document.getElementById('newGameBtn');

// --- SONS ---
const soundWordGuessed = new Audio('sounds/validation_ok.mp3'); // Joué quand le joueur actif trouve un mot
const soundPassWord = new Audio('sounds/pass_word.mp3');
const soundGameOver = new Audio('sounds/game_over.mp3');
// Optionnel: un son distinct pour la confirmation finale du tour par l'équipe adverse
// const soundTurnConfirmedByOpponent = new Audio('sounds/turn_validated.mp3'); 

function playSound(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0; 
        audioElement.play().catch(error => {
            console.error("Erreur de lecture audio:", error);
        });
    }
}

// --- ÉTAT DU JEU ---
let gameState = {
    teams: [ { name: "Alpha", score: 0 }, { name: "Bravo", score: 0 } ],
    currentTeamIndex: 0, currentRound: 1, roundsToPlay: 1, timePerTurn: 60,
    currentWord: "", currentTurnScore: 0, timerInterval: null, timeLeft: 0,
    currentThemeWords: [], allWordsByTheme: {}, usedWordsInGame: [], currentTurnActions: [],
};
const USED_WORDS_STORAGE_KEY_PREFIX = 'sprint_usedWords_';

// --- FONCTIONS UTILITAIRES ---
function showScreen(screenName) {
    for (const key in screens) { screens[key].classList.add('hidden'); }
    if (screens[screenName]) { screens[screenName].classList.remove('hidden'); }
    else { console.error("Écran inconnu:", screenName); }
}

// --- CHARGEMENT DES MOTS ET GESTION DES THÈMES ---
async function loadWordsAndSetupThemes() {
    loadingMessage.classList.remove('hidden'); startGameBtn.disabled = true;
    try {
        const response = await fetch('mots.json');
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        gameState.allWordsByTheme = await response.json();
        populateThemeSelector(); console.log("Mots et thèmes chargés.");
    } catch (error) {
        console.error("Impossible de charger mots.json:", error);
        alert("Erreur: Impossible de charger la liste de mots.");
        themeSelect.innerHTML = '<option value="">Erreur</option>';
    } finally {
        loadingMessage.classList.add('hidden'); startGameBtn.disabled = false;
    }
}
function populateThemeSelector() {
    themeSelect.innerHTML = '';
    if (Object.keys(gameState.allWordsByTheme).length === 0) {
        const errOpt = document.createElement('option'); errOpt.value = ""; errOpt.textContent = "Aucun thème";
        themeSelect.appendChild(errOpt); return;
    }
    for (const theme in gameState.allWordsByTheme) {
        const opt = document.createElement('option'); opt.value = theme; opt.textContent = theme;
        themeSelect.appendChild(opt);
    }
}
function getUsedWordsForTheme(theme) {
    const stored = localStorage.getItem(USED_WORDS_STORAGE_KEY_PREFIX + theme);
    return stored ? JSON.parse(stored) : [];
}
function addWordToUsedForTheme(theme, word) {
    const usedWords = getUsedWordsForTheme(theme);
    if (!usedWords.includes(word)) {
        usedWords.push(word);
        localStorage.setItem(USED_WORDS_STORAGE_KEY_PREFIX + theme, JSON.stringify(usedWords));
    }
}

// --- LOGIQUE DU JEU ---
function setupNewGame() {
    gameState.teams[0].name = team1NameInput.value.trim() || "Alpha";
    gameState.teams[1].name = team2NameInput.value.trim() || "Bravo";
    const selectedTheme = themeSelect.value;
    if (!selectedTheme || !gameState.allWordsByTheme[selectedTheme]) {
        alert("Veuillez choisir un thème valide !"); return false;
    }
    gameState.currentThemeWords = [...gameState.allWordsByTheme[selectedTheme]];
    gameState.usedWordsInGame = []; gameState.teams[0].score = 0; gameState.teams[1].score = 0;
    gameState.currentTeamIndex = 0; gameState.currentRound = 1;
    gameState.roundsToPlay = parseInt(roundsToPlayInput.value) || 1;
    gameState.timePerTurn = parseInt(timePerTurnInput.value) || 60;
    updateGlobalScoreDisplays(); console.log("Jeu configuré:", selectedTheme, gameState);
    return true;
}
function prepareTeamTurn() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    currentTeamTurnH2.textContent = `Au tour de l'équipe ${currentTeam.name} !`;
    currentTeamNameReady.textContent = currentTeam.name;
    currentTeamNameInstruction.textContent = currentTeam.name;
    passPhoneInstructionP.textContent = `Passez le téléphone à un membre de l'équipe ${currentTeam.name}. Les autres de l'équipe devinent. L'équipe ${gameState.teams[(gameState.currentTeamIndex + 1) % 2].name} surveille !`;
    showScreen('ready');
}
function startPlayerTurn() {
    gameState.currentTurnActions = []; gameState.currentTurnScore = 0;
    gameState.timeLeft = gameState.timePerTurn; displayTime(); selectNewWord();
    showScreen('game'); clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--; displayTime();
        if (gameState.timeLeft <= 0) { endTeamTurn(); }
    }, 1000);
}
function displayTime() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function selectNewWord() {
    const selectedTheme = themeSelect.value;
    const globallyUsed = getUsedWordsForTheme(selectedTheme);
    let available = gameState.currentThemeWords.filter(w => !globallyUsed.includes(w) && !gameState.usedWordsInGame.includes(w));
    if (available.length === 0) {
        available = gameState.currentThemeWords.filter(w => !gameState.usedWordsInGame.includes(w));
        if (available.length === 0) {
            wordToGuessDiv.textContent = "FIN DES MOTS !"; gameState.currentWord = "";
            [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = true);
            alert(`Tous les mots du thème "${selectedTheme}" joués!`); return;
        }
        alert(`Attention, mots du thème "${selectedTheme}" vont se répéter (vus en parties précédentes).`);
    }
    [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = false);
    const randIdx = Math.floor(Math.random() * available.length);
    gameState.currentWord = available[randIdx];
    gameState.usedWordsInGame.push(gameState.currentWord);
    wordToGuessDiv.textContent = gameState.currentWord;
    console.log("Mot:", gameState.currentWord, `(Thème: ${selectedTheme})`);
}
function handleWordAttempt(points, methodName) {
    if (gameState.timeLeft > 0 && gameState.currentWord !== "") {
        playSound(soundWordGuessed); // SON JOUÉ LORSQUE LE JOUEUR CLIQUE SUR UN BOUTON DE POINTS
        gameState.currentTurnActions.push({
            word: gameState.currentWord, method: methodName, points: points, status: "guessed_pending_validation"
        });
        gameState.currentTurnScore += points;
        console.log(`Mot "${gameState.currentWord}" déclaré (${methodName}, ${points} pts). Score tour (non affiché): ${gameState.currentTurnScore}`);
        selectNewWord();
    }
}
function handlePassWordGame() {
    if (gameState.timeLeft > 0 && gameState.currentWord !== "") {
        playSound(soundPassWord);
        gameState.currentTurnActions.push({
            word: gameState.currentWord, method: "Passé", points: 0, status: "passed"
        });
        console.log("Mot passé:", gameState.currentWord);
        selectNewWord();
    }
}
function endTeamTurn() {
    clearInterval(gameState.timerInterval);
    const teamWhoPlayed = gameState.teams[gameState.currentTeamIndex];
    teamNameTurnEnd.textContent = teamWhoPlayed.name;
    turnEndMessageH2.textContent = `Temps écoulé pour l'équipe ${teamWhoPlayed.name} !`;
    turnScoreSummaryP.textContent = `Score déclaré : ${gameState.currentTurnScore} points.`;
    showScreen('turnEnd');
    setTimeout(setupAndShowValidationScreen, 2000);
}
function setupAndShowValidationScreen() {
    const teamPlayingIdx = gameState.currentTeamIndex;
    const opponentTeamIdx = (teamPlayingIdx + 1) % 2;
    const teamPlaying = gameState.teams[teamPlayingIdx];
    const opponentTeam = gameState.teams[opponentTeamIdx];
    validatingTeamNameSpan.textContent = teamPlaying.name;
    opponentTeamNameValidatorSpan.textContent = opponentTeam.name;
    validationListDiv.innerHTML = '';
    gameState.currentTurnActions.forEach((action, index) => {
        const item = document.createElement('div'); item.className = 'validation-item';
        let statusTxt = '', btnsHtml = '';
        const statusCls = `status-${action.status.replace(/_/g, '-')}`;
        if (action.status === "guessed_pending_validation") {
            statusTxt = `<span class="${statusCls}">DÉCLARÉ TROUVÉ</span>`;
            btnsHtml = `<button class="contest-btn" data-action-index="${index}">Contester (${action.points} pts)</button>`;
        } else if (action.status === "passed") {
            statusTxt = `<span class="${statusCls}">PASSÉ</span>`;
        } else if (action.status === "contested_rejected") {
            statusTxt = `<span class="${statusCls}">CONTESTATION ANNULÉE</span>`;
            btnsHtml = `<button class="contest-btn" data-action-index="${index}">Re-Contester (${action.points} pts)</button>`;
        } else if (action.status === "contested_accepted") {
            statusTxt = `<span class="${statusCls}">CONTESTÉ (0 pt)</span>`;
            btnsHtml = `<button class="undo-contest-btn" data-action-index="${index}">Annuler Contestation (${action.points} pts)</button>`;
        }
        item.innerHTML = `<p>Mot:<strong>${action.word}</strong></p><p>Méthode:${action.method}(${action.points}pt${action.points>1?'s':''})</p><p>Statut:${statusTxt}</p><div class="validation-buttons">${btnsHtml}</div>`;
        validationListDiv.appendChild(item);
    });
    validationListDiv.querySelectorAll('.contest-btn, .undo-contest-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.actionIndex);
            const isContesting = e.target.classList.contains('contest-btn');
            handleContestAction(idx, isContesting);
        });
    });
    initialTurnScoreValidatorSpan.textContent = gameState.currentTurnScore;
    updateAdjustedScoreValidator(); showScreen('validation');
}
function handleContestAction(actionIndex, isContesting) {
    const action = gameState.currentTurnActions[actionIndex];
    if (!action || action.status === "passed") return;
    action.status = isContesting ? "contested_accepted" : "contested_rejected";
    setupAndShowValidationScreen();
}
function updateAdjustedScoreValidator() {
    let adjusted = 0;
    gameState.currentTurnActions.forEach(act => {
        if (act.status === "guessed_pending_validation" || act.status === "contested_rejected") { adjusted += act.points; }
    });
    adjustedTurnScoreValidatorSpan.textContent = adjusted; return adjusted;
}
confirmValidationBtn.addEventListener('click', () => {
    const teamIdx = gameState.currentTeamIndex; let finalPts = 0;
    gameState.currentTurnActions.forEach(act => {
        if (act.status === "guessed_pending_validation" || act.status === "contested_rejected") {
            finalPts += act.points; addWordToUsedForTheme(themeSelect.value, act.word);
        }
    });
    gameState.teams[teamIdx].score += finalPts;
    // playSound(soundTurnConfirmedByOpponent); // Si vous voulez un son distinct pour cette action
    console.log(`Tour validé. Score tour:${finalPts}. Score total ${gameState.teams[teamIdx].name}:${gameState.teams[teamIdx].score}`);
    updateGlobalScoreDisplays(); advanceToNextPlayerOrRound();
});
function updateGlobalScoreDisplays() {
    finalTeam1ScoreP.textContent = `${gameState.teams[0].name} : ${gameState.teams[0].score}`;
    finalTeam2ScoreP.textContent = `${gameState.teams[1].name} : ${gameState.teams[1].score}`;
}
function advanceToNextPlayerOrRound() {
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % 2;
    if (gameState.currentTeamIndex === 0) {
        gameState.currentRound++; console.log(`FIN MANCHE. Passage à manche ${gameState.currentRound}.`);
    }
    console.log(`Prochain tour: Équipe ${gameState.teams[gameState.currentTeamIndex].name}, Manche ${gameState.currentRound}`);
    if (gameState.currentRound > gameState.roundsToPlay) {
        console.log("Manches atteintes. Fin partie."); endGame();
    } else { prepareTeamTurn(); }
}
function endGame() {
    updateGlobalScoreDisplays(); let winner = "";
    if (gameState.teams[0].score > gameState.teams[1].score) { winner = `L'équipe ${gameState.teams[0].name} gagne! 🎉`; }
    else if (gameState.teams[1].score > gameState.teams[0].score) { winner = `L'équipe ${gameState.teams[1].name} gagne! 🎉`; }
    else { winner = "Égalité ! Bien joué ! 🤝"; }
    winnerMessageH3.textContent = winner; playSound(soundGameOver);
    console.log("Fin partie. Scores:", gameState.teams[0].name, gameState.teams[0].score, ";", gameState.teams[1].name, gameState.teams[1].score);
    showScreen('gameOver');
}
// --- ÉCOUTEURS D'ÉVÉNEMENTS ---
startGameBtn.addEventListener('click', () => { if (setupNewGame()) { prepareTeamTurn(); }});
teamReadyBtn.addEventListener('click', startPlayerTurn);
guessNormalBtn.addEventListener('click', () => handleWordAttempt(parseInt(guessNormalBtn.dataset.points), "Normal"));
guess3WordsBtn.addEventListener('click', () => handleWordAttempt(parseInt(guess3WordsBtn.dataset.points), "3 Mots Max"));
guessMimeBtn.addEventListener('click', () => handleWordAttempt(parseInt(guessMimeBtn.dataset.points), "En Mimant"));
passWordBtnGame.addEventListener('click', handlePassWordGame);
newGameBtn.addEventListener('click', () => { showScreen('config'); });
// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadWordsAndSetupThemes(); showScreen('config');
    screens.validation.classList.add('hidden');
});