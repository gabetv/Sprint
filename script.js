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
// Suppression des divs et boutons pour joueurs individuels
const themeSelect = document.getElementById('themeSelect');
const roundsToPlayInput = document.getElementById('roundsToPlay');
const timePerTurnInput = document.getElementById('timePerTurn');
const startGameBtn = document.getElementById('startGameBtn');
const loadingMessage = document.getElementById('loadingMessage');

const currentTeamTurnH2 = document.getElementById('currentTeamTurnH2'); // Modifié
const currentTeamNameReady = document.getElementById('currentTeamNameReady');
const passPhoneInstructionP = document.getElementById('passPhoneInstruction');
const currentTeamNameInstruction = document.getElementById('currentTeamNameInstruction');
const teamReadyBtn = document.getElementById('teamReadyBtn'); // Renommé

const timerDisplay = document.getElementById('timerDisplay');
const wordToGuessDiv = document.getElementById('wordToGuess');
const guessNormalBtn = document.getElementById('guessNormalBtn');
const guess3WordsBtn = document.getElementById('guess3WordsBtn');
const guessMimeBtn = document.getElementById('guessMimeBtn');
const passWordBtnGame = document.getElementById('passWordBtnGame');
const currentTurnScoreDiv = document.getElementById('currentTurnScore');

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

// --- ÉTAT DU JEU ---
let gameState = {
    teams: [
        { name: "Alpha", score: 0 }, // Plus de 'players' ni 'currentPlayerIndex'
        { name: "Bravo", score: 0 }
    ],
    currentTeamIndex: 0,
    currentRound: 1,
    roundsToPlay: 1, // Mis à 1 par défaut pour faciliter les tests
    timePerTurn: 60,
    currentWord: "",
    currentTurnScore: 0,
    timerInterval: null,
    timeLeft: 0,
    currentThemeWords: [],
    allWordsByTheme: {},
    usedWordsInGame: [],
    currentTurnActions: [],
};

const USED_WORDS_STORAGE_KEY_PREFIX = 'sprint_usedWords_';

// --- FONCTIONS UTILITAIRES ---
function showScreen(screenName) {
    for (const key in screens) { screens[key].classList.add('hidden'); }
    if (screens[screenName]) { screens[screenName].classList.remove('hidden'); }
    else { console.error("Écran inconnu:", screenName); }
}
// Suppression de addPlayerInput et updateTeamNameDisplays (simplifié dans setup)

// --- CHARGEMENT DES MOTS ET GESTION DES THÈMES ---
async function loadWordsAndSetupThemes() {
    loadingMessage.classList.remove('hidden');
    startGameBtn.disabled = true;
    try {
        const response = await fetch('mots.json');
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        gameState.allWordsByTheme = await response.json();
        populateThemeSelector();
        console.log("Mots et thèmes chargés.");
    } catch (error) {
        console.error("Impossible de charger mots.json:", error);
        alert("Erreur: Impossible de charger la liste de mots.");
        themeSelect.innerHTML = '<option value="">Erreur</option>';
    } finally {
        loadingMessage.classList.add('hidden');
        startGameBtn.disabled = false;
    }
}

function populateThemeSelector() {
    themeSelect.innerHTML = '';
    if (Object.keys(gameState.allWordsByTheme).length === 0) {
        const errOpt = document.createElement('option');
        errOpt.value = ""; errOpt.textContent = "Aucun thème";
        themeSelect.appendChild(errOpt); return;
    }
    for (const theme in gameState.allWordsByTheme) {
        const opt = document.createElement('option');
        opt.value = theme; opt.textContent = theme;
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
    // Plus besoin de récupérer les joueurs individuels

    const selectedTheme = themeSelect.value;
    if (!selectedTheme || !gameState.allWordsByTheme[selectedTheme]) {
        alert("Veuillez choisir un thème valide !"); return false;
    }
    gameState.currentThemeWords = [...gameState.allWordsByTheme[selectedTheme]];
    gameState.usedWordsInGame = [];
    gameState.teams[0].score = 0; gameState.teams[1].score = 0;
    gameState.currentTeamIndex = 0; // L'équipe 0 (Alpha) commence toujours
    gameState.currentRound = 1;
    gameState.roundsToPlay = parseInt(roundsToPlayInput.value) || 1;
    gameState.timePerTurn = parseInt(timePerTurnInput.value) || 60;
    updateGlobalScoreDisplays();
    console.log("Jeu configuré pour le thème:", selectedTheme, gameState);
    return true;
}

function prepareTeamTurn() { // Anciennement startNextTurn, simplifié
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    currentTeamTurnH2.textContent = `Au tour de l'équipe ${currentTeam.name} !`;
    currentTeamNameReady.textContent = currentTeam.name; // Pour le H2
    currentTeamNameInstruction.textContent = currentTeam.name; // Pour les instructions
    passPhoneInstructionP.textContent = `Passez le téléphone à un membre de l'équipe ${currentTeam.name}. Les autres membres de l'équipe devinent. L'équipe ${gameState.teams[(gameState.currentTeamIndex + 1) % 2].name} surveille !`;
    showScreen('ready');
}

function startPlayerTurn() { // Le nom est conservé mais c'est le tour de l'équipe
    gameState.currentTurnActions = [];
    gameState.currentTurnScore = 0;
    currentTurnScoreDiv.textContent = `Points ce tour : 0`;
    gameState.timeLeft = gameState.timePerTurn;
    displayTime();
    selectNewWord();
    showScreen('game');
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        displayTime();
        if (gameState.timeLeft <= 0) { endTeamTurn(); } // Renommé
    }, 1000);
}

function displayTime() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function selectNewWord() {
    const selectedTheme = themeSelect.value;
    const globallyUsedWordsForTheme = getUsedWordsForTheme(selectedTheme);
    let availableWords = gameState.currentThemeWords.filter(word => 
        !globallyUsedWordsForTheme.includes(word) && !gameState.usedWordsInGame.includes(word)
    );
    if (availableWords.length === 0) {
        console.warn(`Plus de mots inédits pour "${selectedTheme}". Recherche mots non utilisés DANS CETTE PARTIE.`);
        availableWords = gameState.currentThemeWords.filter(word => !gameState.usedWordsInGame.includes(word));
        if (availableWords.length === 0) {
            wordToGuessDiv.textContent = "FIN DES MOTS !"; gameState.currentWord = "";
            [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = true);
            alert(`Tous les mots du thème "${selectedTheme}" ont été joués dans cette partie !`); return;
        }
        alert(`Attention, les mots du thème "${selectedTheme}" commencent à se répéter (par rapport aux parties précédentes).`);
    }
    [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = false);
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    gameState.currentWord = availableWords[randomIndex];
    gameState.usedWordsInGame.push(gameState.currentWord);
    wordToGuessDiv.textContent = gameState.currentWord;
    console.log("Nouveau mot:", gameState.currentWord, `(Thème: ${selectedTheme})`);
}

function handleWordAttempt(points, methodName) {
    if (gameState.timeLeft > 0 && gameState.currentWord !== "") {
        gameState.currentTurnActions.push({
            word: gameState.currentWord, method: methodName, points: points, status: "guessed_pending_validation"
        });
        gameState.currentTurnScore += points;
        currentTurnScoreDiv.textContent = `Points ce tour : ${gameState.currentTurnScore}`;
        console.log(`Mot "${gameState.currentWord}" déclaré (${methodName}, ${points} pts)`);
        selectNewWord();
    }
}

function handlePassWordGame() {
    if (gameState.timeLeft > 0 && gameState.currentWord !== "") {
        gameState.currentTurnActions.push({
            word: gameState.currentWord, method: "Passé", points: 0, status: "passed"
        });
        console.log("Mot passé:", gameState.currentWord);
        selectNewWord();
    }
}

function endTeamTurn() { // Renommé de endPlayerTurn
    clearInterval(gameState.timerInterval);
    const teamWhoPlayed = gameState.teams[gameState.currentTeamIndex];
    teamNameTurnEnd.textContent = teamWhoPlayed.name; // Pour l'écran de fin de tour
    turnEndMessageH2.textContent = `Temps écoulé pour l'équipe ${teamWhoPlayed.name} !`;
    turnScoreSummaryP.textContent = `Score déclaré : ${gameState.currentTurnScore} points.`;
    showScreen('turnEnd');
    setTimeout(setupAndShowValidationScreen, 2000);
}

function setupAndShowValidationScreen() {
    const teamPlayingIndex = gameState.currentTeamIndex;
    const opponentTeamIndex = (teamPlayingIndex + 1) % 2;
    const teamPlaying = gameState.teams[teamPlayingIndex];
    const opponentTeam = gameState.teams[opponentTeamIndex];

    validatingTeamNameSpan.textContent = teamPlaying.name; // Plus de nom de joueur
    opponentTeamNameValidatorSpan.textContent = opponentTeam.name;
    validationListDiv.innerHTML = '';
    
    gameState.currentTurnActions.forEach((action, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'validation-item';
        let statusText = '', buttonsHtml = '';
        const statusClass = `status-${action.status.replace(/_/g, '-')}`; // ex: status-guessed-pending-validation

        if (action.status === "guessed_pending_validation") {
            statusText = `<span class="${statusClass}">DÉCLARÉ TROUVÉ</span>`;
            buttonsHtml = `<button class="contest-btn" data-action-index="${index}">Contester (${action.points} pts)</button>`;
        } else if (action.status === "passed") {
            statusText = `<span class="${statusClass}">PASSÉ</span>`;
        } else if (action.status === "contested_rejected") { // Contestation rejetée = mot validé
            statusText = `<span class="${statusClass}">CONTESTATION ANNULÉE (Validé)</span>`;
            buttonsHtml = `<button class="contest-btn" data-action-index="${index}">Re-Contester (${action.points} pts)</button>`;
        } else if (action.status === "contested_accepted") { // Contestation acceptée = 0 point
            statusText = `<span class="${statusClass}">CONTESTÉ (0 pt)</span>`;
            buttonsHtml = `<button class="undo-contest-btn" data-action-index="${index}">Annuler Contestation (${action.points} pts)</button>`;
        }
        itemDiv.innerHTML = `
            <p>Mot : <strong>${action.word}</strong></p>
            <p>Méthode déclarée : <strong>${action.method} (${action.points} pt${action.points > 1 ? 's' : ''})</strong></p>
            <p>Statut : ${statusText}</p>
            <div class="validation-buttons">${buttonsHtml}</div>`;
        validationListDiv.appendChild(itemDiv);
    });

    validationListDiv.querySelectorAll('.contest-btn, .undo-contest-btn').forEach(btn => {
        // Supprimer l'ancien écouteur s'il existe pour éviter les duplications
        const newBtn = btn.cloneNode(true); // Cloner pour supprimer les anciens écouteurs
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const actionIndex = parseInt(e.target.dataset.actionIndex);
            const isContestingFromScratch = e.target.classList.contains('contest-btn');
            handleContestAction(actionIndex, isContestingFromScratch);
        });
    });
    initialTurnScoreValidatorSpan.textContent = gameState.currentTurnScore;
    updateAdjustedScoreValidator();
    showScreen('validation');
}

function handleContestAction(actionIndex, isContestingFromScratch) {
    const action = gameState.currentTurnActions[actionIndex];
    if (!action || action.status === "passed") return;

    if (isContestingFromScratch) {
        action.status = "contested_accepted";
    } else {
        action.status = "contested_rejected";
    }
    setupAndShowValidationScreen(); // Redessine la liste et réattache les écouteurs
}

function updateAdjustedScoreValidator() {
    let adjustedScore = 0;
    gameState.currentTurnActions.forEach(action => {
        if (action.status === "guessed_pending_validation" || action.status === "contested_rejected") {
            adjustedScore += action.points;
        }
    });
    adjustedTurnScoreValidatorSpan.textContent = adjustedScore;
    return adjustedScore;
}

confirmValidationBtn.addEventListener('click', () => {
    const teamPlayingIndex = gameState.currentTeamIndex;
    let finalPointsForTurn = 0;
    gameState.currentTurnActions.forEach(action => {
        if (action.status === "guessed_pending_validation" || action.status === "contested_rejected") {
            finalPointsForTurn += action.points;
            addWordToUsedForTheme(themeSelect.value, action.word);
        }
    });
    gameState.teams[teamPlayingIndex].score += finalPointsForTurn;
    console.log(`Tour validé. Score final tour: ${finalPointsForTurn}. Score total ${gameState.teams[teamPlayingIndex].name}: ${gameState.teams[teamPlayingIndex].score}`);
    updateGlobalScoreDisplays();
    advanceToNextPlayerOrRound(); // C'est ici qu'on avance
});

function updateGlobalScoreDisplays() {
    finalTeam1ScoreP.textContent = `${gameState.teams[0].name} : ${gameState.teams[0].score}`;
    finalTeam2ScoreP.textContent = `${gameState.teams[1].name} : ${gameState.teams[1].score}`;
}

function advanceToNextPlayerOrRound() {
    // On change d'équipe
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % 2;

    // Si on revient à l'équipe 0, une manche complète est terminée
    if (gameState.currentTeamIndex === 0) {
        gameState.currentRound++;
        console.log(`FIN DE MANCHE. Passage à la manche ${gameState.currentRound}.`);
    }
    
    console.log(`Prochain tour: Équipe ${gameState.teams[gameState.currentTeamIndex].name}, Manche ${gameState.currentRound}`);

    if (gameState.currentRound > gameState.roundsToPlay) {
        console.log("Nombre de manches atteint. Fin de partie.");
        endGame();
    } else {
        prepareTeamTurn();
    }
}

function endGame() {
    updateGlobalScoreDisplays();
    let winnerText = "";
    if (gameState.teams[0].score > gameState.teams[1].score) {
        winnerText = `L'équipe ${gameState.teams[0].name} remporte la partie ! 🎉`;
    } else if (gameState.teams[1].score > gameState.teams[0].score) {
        winnerText = `L'équipe ${gameState.teams[1].name} remporte la partie ! 🎉`;
    } else {
        winnerText = "Égalité ! Bien joué aux deux équipes ! 🤝";
    }
    winnerMessageH3.textContent = winnerText;
    console.log("Fin de partie. Scores:", gameState.teams[0].name, gameState.teams[0].score, ";", gameState.teams[1].name, gameState.teams[1].score);
    showScreen('gameOver');
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---
// Suppression des addPlayerTeamXBtn des écouteurs
// team1NameInput et team2NameInput ne sont plus nécessaires ici s'ils ne font qu'updater un affichage qui n'existe plus.
// Mais on les garde si on veut quand même permettre de changer les noms d'équipe affichés ailleurs.

startGameBtn.addEventListener('click', () => {
    if (setupNewGame()) { prepareTeamTurn(); }
});

teamReadyBtn.addEventListener('click', startPlayerTurn); // Reste startPlayerTurn car c'est le début du tour d'action

guessNormalBtn.addEventListener('click', () => handleWordAttempt(parseInt(guessNormalBtn.dataset.points), "Normal"));
guess3WordsBtn.addEventListener('click', () => handleWordAttempt(parseInt(guess3WordsBtn.dataset.points), "3 Mots Max"));
guessMimeBtn.addEventListener('click', () => handleWordAttempt(parseInt(guessMimeBtn.dataset.points), "En Mimant"));
passWordBtnGame.addEventListener('click', handlePassWordGame);

newGameBtn.addEventListener('click', () => {
    // Pas besoin de gérer les divs de joueurs ici
    showScreen('config');
});

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadWordsAndSetupThemes();
    showScreen('config');
    // Plus besoin d'ajouter des champs de joueurs par défaut
    screens.validation.classList.add('hidden');
});