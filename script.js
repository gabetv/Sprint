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

const showRulesBtn = document.getElementById('showRulesBtn');
const rulesModal = document.getElementById('rulesModal');
const closeRulesModalBtn = document.getElementById('closeRulesModalBtn');

// --- SONS ---
const soundWordGuessed = new Audio('sounds/validation_ok.mp3');
const soundPassWord = new Audio('sounds/pass_word.mp3');
const soundGameOver = new Audio('sounds/game_over.mp3');

function playSound(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(error => {
            console.error("Erreur de lecture audio:", error);
        });
    }
}

// --- ÉTAT DU JEU ---
const FREE_THEMES_COUNT = 6;
let unlockedThemes = []; // Pour stocker les noms des thèmes débloqués

let gameState = {
    teams: [ { name: "Alpha", score: 0 }, { name: "Bravo", score: 0 } ],
    currentTeamIndex: 0, currentRound: 1, roundsToPlay: 1, timePerTurn: 60,
    currentWord: "", currentTurnScore: 0, timerInterval: null, timeLeft: 0,
    currentThemeWords: [], allWordsByTheme: {},
    usedWordsInGame: [],
    themesResetInCurrentGame: [],
    actionButtonLock: false,
    currentTurnActions: [],
};
const USED_WORDS_STORAGE_KEY_PREFIX = 'sprint_usedWords_';
const UNLOCKED_THEMES_STORAGE_KEY = 'sprint_unlockedThemes';

// --- FONCTIONS UTILITAIRES ---
function showScreen(screenName) {
    for (const key in screens) { screens[key].classList.add('hidden'); }
    if (screens[screenName]) { screens[screenName].classList.remove('hidden'); }
    else { console.error("Écran inconnu:", screenName); }
}

function loadUnlockedThemes() {
    const stored = localStorage.getItem(UNLOCKED_THEMES_STORAGE_KEY);
    unlockedThemes = stored ? JSON.parse(stored) : [];
    console.log("Thèmes débloqués chargés depuis localStorage:", unlockedThemes);
}

function saveUnlockedThemes() {
    localStorage.setItem(UNLOCKED_THEMES_STORAGE_KEY, JSON.stringify(unlockedThemes));
}

function unlockTheme(themeName) {
    if (!unlockedThemes.includes(themeName)) {
        unlockedThemes.push(themeName);
        saveUnlockedThemes();
        console.log(`Thème "${themeName}" marqué comme débloqué.`);
        return true;
    }
    return false;
}

// --- CHARGEMENT DES MOTS ET GESTION DES THÈMES ---
async function loadWordsAndSetupThemes() {
    loadingMessage.classList.remove('hidden'); startGameBtn.disabled = true;
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
        loadingMessage.classList.add('hidden'); startGameBtn.disabled = false;
    }
}

function populateThemeSelector() {
    themeSelect.innerHTML = '';
    if (Object.keys(gameState.allWordsByTheme).length === 0) {
        const errOpt = document.createElement('option'); errOpt.value = ""; errOpt.textContent = "Aucun thème";
        themeSelect.appendChild(errOpt); return;
    }

    let themeCounter = 0;
    for (const theme in gameState.allWordsByTheme) {
        const opt = document.createElement('option');
        opt.value = theme;
        opt.textContent = theme;

        if (themeCounter < FREE_THEMES_COUNT) {
            // Thèmes gratuits
        } else {
            if (unlockedThemes.includes(theme)) {
                opt.textContent += " ✅";
            } else {
                opt.textContent += " 🔒 (Déverrouiller)";
                opt.dataset.requiresUnlock = "true";
            }
        }
        themeSelect.appendChild(opt);
        themeCounter++;
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
        alert("Erreur : Aucun thème valide sélectionné pour démarrer.");
        return false;
    }
    // Vérification de sécurité si un thème nécessitant déverrouillage est passé par erreur
    const selectedOption = themeSelect.options[themeSelect.selectedIndex];
    if (selectedOption.dataset.requiresUnlock === "true" && !unlockedThemes.includes(selectedTheme)) {
        alert(`Erreur : Tentative de démarrage avec le thème premium "${selectedTheme}" non déverrouillé.`);
        return false;
    }


    gameState.currentThemeWords = [...gameState.allWordsByTheme[selectedTheme]];
    gameState.usedWordsInGame = [];
    gameState.themesResetInCurrentGame = [];
    gameState.teams[0].score = 0; gameState.teams[1].score = 0;
    gameState.currentTeamIndex = 0; gameState.currentRound = 1;
    gameState.roundsToPlay = parseInt(roundsToPlayInput.value) || 1;
    gameState.timePerTurn = parseInt(timePerTurnInput.value) || 60;
    gameState.actionButtonLock = false;
    gameState.currentTurnActions = [];
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
    gameState.currentTurnActions = [];
    gameState.currentTurnScore = 0;
    gameState.timeLeft = gameState.timePerTurn; displayTime();
    gameState.actionButtonLock = false;
    selectNewWord();
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
    
    let available = gameState.currentThemeWords.filter(w => 
        !gameState.usedWordsInGame.includes(w) && 
        !globallyUsed.includes(w)
    );

    if (available.length === 0) {
        available = gameState.currentThemeWords.filter(w => !gameState.usedWordsInGame.includes(w));
    }

    if (available.length === 0 && gameState.currentThemeWords.length > 0) {
        if (!gameState.themesResetInCurrentGame.includes(selectedTheme)) {
            alert(`Tous les mots du thème "${selectedTheme}" ont été joués pendant cette partie ! Les mots vont maintenant se répéter pour ce thème.`);
            gameState.themesResetInCurrentGame.push(selectedTheme);
        }
        gameState.usedWordsInGame = [];
        available = [...gameState.currentThemeWords];
        console.warn(`Réinitialisation des mots pour le thème "${selectedTheme}" pour la partie en cours.`);
    }

    if (available.length === 0) {
        wordToGuessDiv.textContent = "FIN DES MOTS !";
        gameState.currentWord = "";
        [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = true);
        if (gameState.currentThemeWords.length > 0) {
            console.warn(`Tous les mots du thème "${selectedTheme}" sont épuisés.`);
        } else {
            console.error(`Le thème "${selectedTheme}" est vide.`);
        }
        return;
    }

    if (!gameState.actionButtonLock) {
        [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = false);
    }

    const randIdx = Math.floor(Math.random() * available.length);
    gameState.currentWord = available[randIdx];
    gameState.usedWordsInGame.push(gameState.currentWord); 

    wordToGuessDiv.textContent = gameState.currentWord;
    console.log("Mot:", gameState.currentWord, `(Thème: ${selectedTheme})`);
}

function handleWordAttempt(points, methodName) {
    if (gameState.actionButtonLock) return;

    if (gameState.timeLeft > 0 && gameState.currentWord !== "" && gameState.currentWord !== "FIN DES MOTS !") {
        gameState.actionButtonLock = true;
        [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = true);

        playSound(soundWordGuessed);
        gameState.currentTurnActions.push({
            word: gameState.currentWord, method: methodName, points: points, status: "guessed_pending_validation"
        });
        gameState.currentTurnScore += points;
        console.log(`Mot "${gameState.currentWord}" déclaré (${methodName}, ${points} pts).`);
        
        selectNewWord();

        setTimeout(() => {
            gameState.actionButtonLock = false;
            if (gameState.currentWord !== "" && gameState.currentWord !== "FIN DES MOTS !") {
                 [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = false);
            }
        }, 1000);
    }
}

function handlePassWordGame() {
    if (gameState.actionButtonLock) return;

    if (gameState.timeLeft > 0 && gameState.currentWord !== "" && gameState.currentWord !== "FIN DES MOTS !") {
        gameState.actionButtonLock = true;
        [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = true);

        playSound(soundPassWord);
        gameState.currentTurnActions.push({
            word: gameState.currentWord, method: "Passé", points: 0, status: "passed"
        });
        console.log("Mot passé:", gameState.currentWord);
        
        selectNewWord();

        setTimeout(() => {
            gameState.actionButtonLock = false;
            if (gameState.currentWord !== "" && gameState.currentWord !== "FIN DES MOTS !") {
                [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = false);
            }
        }, 1000);
    }
}

function endTeamTurn() {
    clearInterval(gameState.timerInterval);
    const teamWhoPlayed = gameState.teams[gameState.currentTeamIndex];
    teamNameTurnEnd.textContent = teamWhoPlayed.name;
    turnEndMessageH2.textContent = `Temps écoulé pour l'équipe ${teamWhoPlayed.name} !`;
    turnScoreSummaryP.textContent = `Score déclaré : ${gameState.currentTurnScore} points.`;
    showScreen('turnEnd');
    [guessNormalBtn, guess3WordsBtn, guessMimeBtn, passWordBtnGame].forEach(btn => btn.disabled = true);
    gameState.actionButtonLock = false;
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
        if (typeof action.adjustedPoints === 'undefined') {
            if (action.status === "passed") {
                action.adjustedPoints = 0;
            } else {
                action.adjustedPoints = action.points;
            }
        }

        const item = document.createElement('div');
        item.className = 'validation-item';
        let statusTxt = '', pointsAdjustmentHtml = '';
        const statusBaseClass = 'status-';

        if (action.status === "passed") {
            statusTxt = `<span class="${statusBaseClass}passed">PASSÉ</span>`;
            action.adjustedPoints = 0;
        } else if (action.status === "contested_accepted") {
            statusTxt = `<span class="${statusBaseClass}contested-accepted">CONTESTÉ (0 pt)</span>`;
            action.adjustedPoints = 0;
             pointsAdjustmentHtml = `
                <button class="adjust-points-btn" data-action-index="${index}" data-new-points="1" title="Valider comme Normal (1pt)">1pt</button>
                <button class="adjust-points-btn" data-action-index="${index}" data-new-points="3" title="Valider comme 3 Mots (3pts)">3pts</button>
                <button class="adjust-points-btn" data-action-index="${index}" data-new-points="5" title="Valider comme Mime (5pts)">5pts</button>
                <small>(Initialement: ${action.points} pts)</small>
            `;
        } else { 
            statusTxt = `<span class="${statusBaseClass}validated">VALIDÉ (${action.adjustedPoints} pt${action.adjustedPoints !== 1 ? 's' : ''})</span>`;
            if (action.adjustedPoints !== action.points) {
                 statusTxt += ` <small>(Initial: ${action.points} pts)</small>`;
            }
            pointsAdjustmentHtml = `
                <button class="adjust-points-btn ${action.adjustedPoints === 1 ? 'active' : ''}" data-action-index="${index}" data-new-points="1">Normal (1pt)</button>
                <button class="adjust-points-btn ${action.adjustedPoints === 3 ? 'active' : ''}" data-action-index="${index}" data-new-points="3">3 Mots (3pts)</button>
                <button class="adjust-points-btn ${action.adjustedPoints === 5 ? 'active' : ''}" data-action-index="${index}" data-new-points="5">Mime (5pts)</button>
                <button class="contest-btn" data-action-index="${index}" data-new-points="0" title="Contester (0pt)">Contester (0pt)</button>
            `;
        }

        item.innerHTML = `
            <p>Mot: <strong>${action.word}</strong> (Déclaré: ${action.method} - ${action.points} pt${action.points !== 1 ? 's':''})</p>
            <p>Statut actuel: ${statusTxt}</p>
            <div class="validation-buttons">${pointsAdjustmentHtml}</div>
        `;
        validationListDiv.appendChild(item);
    });

    validationListDiv.querySelectorAll('.adjust-points-btn, .contest-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.actionIndex);
            const newPts = parseInt(e.target.dataset.newPoints);
            handlePointsAdjustment(idx, newPts);
        });
    });

    initialTurnScoreValidatorSpan.textContent = gameState.currentTurnScore;
    updateAdjustedScoreValidator();
    showScreen('validation');
}

function handlePointsAdjustment(actionIndex, newPoints) {
    const action = gameState.currentTurnActions[actionIndex];
    if (!action || action.status === "passed") return;
    action.adjustedPoints = newPoints;
    if (newPoints === 0) {
        action.status = "contested_accepted";
    } else {
        action.status = "contested_rejected"; 
    }
    setupAndShowValidationScreen(); 
}

function updateAdjustedScoreValidator() {
    let adjustedTotalScore = 0;
    gameState.currentTurnActions.forEach(act => {
        if (typeof act.adjustedPoints !== 'undefined') {
             adjustedTotalScore += act.adjustedPoints;
        } else if (act.status !== "passed") {
            adjustedTotalScore += act.points;
        }
    });
    adjustedTurnScoreValidatorSpan.textContent = adjustedTotalScore;
    return adjustedTotalScore;
}

confirmValidationBtn.addEventListener('click', () => {
    const teamIdx = gameState.currentTeamIndex;
    let finalPtsForTurn = 0;
    gameState.currentTurnActions.forEach(act => {
        if (typeof act.adjustedPoints !== 'undefined' && act.adjustedPoints > 0) {
            finalPtsForTurn += act.adjustedPoints;
            addWordToUsedForTheme(themeSelect.value, act.word);
        }
    });
    gameState.teams[teamIdx].score += finalPtsForTurn;
    console.log(`Tour validé. Score final tour:${finalPtsForTurn}. Score total ${gameState.teams[teamIdx].name}:${gameState.teams[teamIdx].score}`);
    updateGlobalScoreDisplays();
    advanceToNextPlayerOrRound();
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
startGameBtn.addEventListener('click', () => {
    const selectedOption = themeSelect.options[themeSelect.selectedIndex];
    const selectedThemeName = selectedOption.value;

    if (selectedOption.dataset.requiresUnlock === "true" && !unlockedThemes.includes(selectedThemeName)) {
        if (confirm(`Le thème "${selectedThemeName}" est un thème premium.\n\nSouhaitez-vous simuler le visionnage d'une publicité pour le déverrouiller gratuitement pour cette session ?\n(Cette fonctionnalité sera complète dans l'application.)`)) {
            unlockTheme(selectedThemeName);
            alert(`Thème "${selectedThemeName}" déverrouillé pour cette session ! Vous pouvez maintenant le sélectionner et cliquer à nouveau sur "Jouer !".`);
            populateThemeSelector(); 
            for (let i = 0; i < themeSelect.options.length; i++) { // Resélectionner le thème
                if (themeSelect.options[i].value === selectedThemeName) {
                    themeSelect.selectedIndex = i;
                    break;
                }
            }
            return; 
        } else {
            let firstFreeIndex = -1;
            for (let i = 0; i < themeSelect.options.length; i++) {
                if (themeSelect.options[i].dataset.requiresUnlock !== "true") {
                    firstFreeIndex = i;
                    break;
                }
            }
            if (firstFreeIndex !== -1) {
                themeSelect.selectedIndex = firstFreeIndex;
            }
            return; 
        }
    }

    // Si on arrive ici, le thème est jouable
    if (setupNewGame()) {
        prepareTeamTurn();
    }
});

teamReadyBtn.addEventListener('click', startPlayerTurn);

guessNormalBtn.addEventListener('click', () => handleWordAttempt(parseInt(guessNormalBtn.dataset.points), "Normal"));
guess3WordsBtn.addEventListener('click', () => handleWordAttempt(parseInt(guess3WordsBtn.dataset.points), "3 Mots Max"));
guessMimeBtn.addEventListener('click', () => handleWordAttempt(parseInt(guessMimeBtn.dataset.points), "En Mimant"));
passWordBtnGame.addEventListener('click', handlePassWordGame);

newGameBtn.addEventListener('click', () => { showScreen('config'); });

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadUnlockedThemes(); 
    loadWordsAndSetupThemes(); 
    showScreen('config');

    if (showRulesBtn && rulesModal && closeRulesModalBtn) {
        showRulesBtn.addEventListener('click', () => {
            rulesModal.style.display = 'block';
        });
        closeRulesModalBtn.addEventListener('click', () => {
            rulesModal.style.display = 'none';
        });
        window.addEventListener('click', (event) => {
            if (event.target === rulesModal) {
                rulesModal.style.display = 'none';
            }
        });
    } else {
        console.error("Éléments de la modale des règles non trouvés.");
    }
});