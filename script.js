// --- ÉLÉMENTS DU DOM ---
const screens = {
    config: document.getElementById('configScreen'),
    ready: document.getElementById('readyScreen'),
    game: document.getElementById('gameScreen'),
    turnEnd: document.getElementById('turnEndScreen'),
    gameOver: document.getElementById('gameOverScreen')
};

// Configuration
const team1NameInput = document.getElementById('team1Name');
const team2NameInput = document.getElementById('team2Name');
const team1PlayersDiv = document.getElementById('team1Players');
const team2PlayersDiv = document.getElementById('team2Players');
const team1DisplayN = document.getElementById('team1DisplayN');
const team2DisplayN = document.getElementById('team2DisplayN');
const addPlayerTeam1Btn = document.getElementById('addPlayerTeam1Btn'); // ID Corrigé
const addPlayerTeam2Btn = document.getElementById('addPlayerTeam2Btn'); // ID Corrigé
const roundsToPlayInput = document.getElementById('roundsToPlay');
const timePerTurnInput = document.getElementById('timePerTurn');
const startGameBtn = document.getElementById('startGameBtn');

// Écran Prêt
const currentPlayerTurnH2 = document.getElementById('currentPlayerTurn');
const passPhoneInstructionP = document.getElementById('passPhoneInstruction');
const playerReadyBtn = document.getElementById('playerReadyBtn');

// Écran de Jeu
const timerDisplay = document.getElementById('timerDisplay');
const wordToGuessDiv = document.getElementById('wordToGuess');
const guessNormalBtn = document.getElementById('guessNormalBtn');
const guess3WordsBtn = document.getElementById('guess3WordsBtn');
const guessMimeBtn = document.getElementById('guessMimeBtn');
const passWordBtnGame = document.getElementById('passWordBtnGame');
const currentTurnScoreDiv = document.getElementById('currentTurnScore');

// Écran Fin de Tour
const turnEndMessageH2 = document.getElementById('turnEndMessage');
const turnScoreSummaryP = document.getElementById('turnScoreSummary');
const team1ScoreDisplayP = document.getElementById('team1ScoreDisplay');
const team2ScoreDisplayP = document.getElementById('team2ScoreDisplay');
const nextPlayerBtn = document.getElementById('nextPlayerBtn');

// Écran Fin de Partie
const finalTeam1ScoreP = document.getElementById('finalTeam1Score');
const finalTeam2ScoreP = document.getElementById('finalTeam2Score');
const winnerMessageH3 = document.getElementById('winnerMessage');
const newGameBtn = document.getElementById('newGameBtn');

// --- ÉTAT DU JEU ---
let gameState = {
    teams: [
        { name: "Alpha", players: [], score: 0, currentPlayerIndex: 0 },
        { name: "Bravo", players: [], score: 0, currentPlayerIndex: 0 }
    ],
    currentTeamIndex: 0,
    currentRound: 1,
    roundsToPlay: 2,
    timePerTurn: 60,
    currentWord: "",
    currentTurnScore: 0,
    timerInterval: null,
    timeLeft: 0,
    words: [ // Exemple de liste de mots - À remplacer/améliorer avec mots.json
        "Banane", "Ordinateur", "Château", "Montagne", "Télescope", "Avion", "Bibliothèque", "Pizza", "Jardin", "Robot",
        "Peinture", "Danse", "Musique", "Océan", "Désert", "Forêt", "Volcan", "Éléphant", "Girafe", "Crocodile",
        "Astronaute", "Scientifique", "Détective", "Pirate", "Magicien", "Super-héros", "Dragon", "Licorne", "Fantôme",
        "Plage", "Neige", "Arc-en-ciel", "Étoile filante", "Lune", "Soleil", "Planète", "Galaxie", "Livre", "Film",
        "Chaussette", "Lampadaire", "Bicyclette", "Fromage", "Confiture", "Papillon", "Crayon", "Fenêtre", "Nuage", "Cascade"
    ],
    usedWords: []
};

// Simuler le chargement depuis mots.json pour l'instant
// Si vous implémentez mots.json, décommentez et adaptez la logique de chargement
// let toutesLesListesDeMots = {};
// async function chargerMots() { ... voir implémentation précédente ... }


// --- FONCTIONS UTILITAIRES ---
function showScreen(screenName) {
    for (const key in screens) {
        screens[key].classList.add('hidden');
    }
    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
    } else {
        console.error("Tentative d'affichage d'un écran inconnu:", screenName);
    }
}

function addPlayerInput(teamIndex) {
    const teamPlayersDiv = teamIndex === 0 ? team1PlayersDiv : team2PlayersDiv;
    const playerInputs = teamPlayersDiv.getElementsByTagName('input');
    const playerNumber = playerInputs.length + 1;

    // Limiter le nombre de joueurs (optionnel)
    if (playerInputs.length >= 10) { // Limite à 10 joueurs par équipe
        alert("Maximum 10 joueurs par équipe.");
        return;
    }

    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.placeholder = `Nom Joueur ${playerNumber}`;
    newInput.className = `player-name-input team${teamIndex + 1}-player`;
    teamPlayersDiv.appendChild(newInput);
}


function updateTeamNameDisplays() {
    team1DisplayN.textContent = team1NameInput.value.trim() || "Équipe 1";
    team2DisplayN.textContent = team2NameInput.value.trim() || "Équipe 2";
}

// --- LOGIQUE DU JEU ---

function setupNewGame() {
    gameState.teams[0].name = team1NameInput.value.trim() || "Alpha";
    gameState.teams[1].name = team2NameInput.value.trim() || "Bravo";

    gameState.teams[0].players = Array.from(team1PlayersDiv.getElementsByClassName('player-name-input'))
                                     .map(input => input.value.trim())
                                     .filter(name => name !== "");
    gameState.teams[1].players = Array.from(team2PlayersDiv.getElementsByClassName('player-name-input'))
                                     .map(input => input.value.trim())
                                     .filter(name => name !== "");

    if (gameState.teams[0].players.length === 0 || gameState.teams[1].players.length === 0) {
        alert("Chaque équipe doit avoir au moins un joueur !");
        return false;
    }

    // Si vous utilisez mots.json, assurez-vous que gameState.words est peuplé ici
    // Par exemple, si vous avez un menu de sélection de catégorie:
    // gameState.words = toutesLesListesDeMots[selectedCategory] || toutesLesListesDeMots.facile;
    // Pour l'instant, on utilise la liste fixe.

    gameState.teams[0].score = 0;
    gameState.teams[1].score = 0;
    gameState.teams[0].currentPlayerIndex = 0;
    gameState.teams[1].currentPlayerIndex = 0;
    gameState.currentTeamIndex = 0;
    gameState.currentRound = 1;
    gameState.roundsToPlay = parseInt(roundsToPlayInput.value) || 2;
    gameState.timePerTurn = parseInt(timePerTurnInput.value) || 60;
    gameState.usedWords = [];

    console.log("Jeu configuré:", gameState);
    return true;
}

function startNextTurn() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    const currentPlayer = currentTeam.players[currentTeam.currentPlayerIndex];

    if (!currentPlayer) {
        console.error("Erreur: Joueur actuel indéfini.", currentTeam, currentTeam.currentPlayerIndex);
        alert("Erreur dans la configuration des joueurs. Veuillez recommencer.");
        showScreen('config');
        return;
    }

    currentPlayerTurnH2.textContent = `Au tour de ${currentPlayer} de l'équipe ${currentTeam.name} !`;
    passPhoneInstructionP.textContent = `Passez le téléphone à ${currentPlayer}. Les autres membres de son équipe devinent. L'équipe ${gameState.teams[(gameState.currentTeamIndex + 1) % 2].name} surveille !`;
    showScreen('ready');
}

function startPlayerTurn() {
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
        if (gameState.timeLeft <= 0) {
            endPlayerTurn();
        }
    }, 1000);
}

function displayTime() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function selectNewWord() {
    if (gameState.words.length === 0) {
        wordToGuessDiv.textContent = "PLUS DE MOTS !";
        gameState.currentWord = "";
        // Potentiellement désactiver les boutons de jeu si aucun mot n'est disponible
        guessNormalBtn.disabled = true;
        guess3WordsBtn.disabled = true;
        guessMimeBtn.disabled = true;
        passWordBtnGame.disabled = true;
        return;
    } else {
        guessNormalBtn.disabled = false;
        guess3WordsBtn.disabled = false;
        guessMimeBtn.disabled = false;
        passWordBtnGame.disabled = false;
    }


    let availableWords = gameState.words.filter(word => !gameState.usedWords.includes(word));
    if (availableWords.length === 0) {
        console.warn("Tous les mots ont été utilisés dans cette partie. Réinitialisation de la liste des mots disponibles.");
        gameState.usedWords = []; // Réinitialiser pour permettre de réutiliser les mots
        availableWords = [...gameState.words];
        if (availableWords.length === 0) { // Double vérification si la liste initiale était vide
             wordToGuessDiv.textContent = "LISTE VIDE !";
             gameState.currentWord = "";
             return;
        }
        alert("Tous les mots de la liste ont été joués ! Les mots vont commencer à se répéter.");
    }
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    gameState.currentWord = availableWords[randomIndex];
    gameState.usedWords.push(gameState.currentWord);
    wordToGuessDiv.textContent = gameState.currentWord;
    console.log("Nouveau mot:", gameState.currentWord);
}

function handleWordAttempt(points) {
    if (gameState.timeLeft > 0 && gameState.currentWord !== "") { // S'assurer qu'il y a un mot à deviner
        gameState.currentTurnScore += points;
        gameState.teams[gameState.currentTeamIndex].score += points;
        currentTurnScoreDiv.textContent = `Points ce tour : ${gameState.currentTurnScore}`;
        console.log(`Mot trouvé (${points} pts)! Score équipe ${gameState.teams[gameState.currentTeamIndex].name}: ${gameState.teams[gameState.currentTeamIndex].score}`);
        selectNewWord();
    }
}

function handlePassWordGame() {
    if (gameState.timeLeft > 0 && gameState.currentWord !== "") {
        console.log("Mot passé:", gameState.currentWord);
        selectNewWord();
    }
}

function endPlayerTurn() {
    clearInterval(gameState.timerInterval);
    turnEndMessageH2.textContent = `Temps écoulé pour ${gameState.teams[gameState.currentTeamIndex].players[gameState.teams[gameState.currentTeamIndex].currentPlayerIndex]} !`;
    turnScoreSummaryP.textContent = `L'équipe a marqué ${gameState.currentTurnScore} points pendant ce tour.`;
    
    updateScoreDisplaysTurnEnd();
    showScreen('turnEnd');
}

function updateScoreDisplaysTurnEnd() {
    team1ScoreDisplayP.textContent = `${gameState.teams[0].name} : ${gameState.teams[0].score}`;
    team2ScoreDisplayP.textContent = `${gameState.teams[1].name} : ${gameState.teams[1].score}`;
}

function advanceToNextPlayerOrRound() {
    gameState.teams[gameState.currentTeamIndex].currentPlayerIndex++;

    if (gameState.teams[gameState.currentTeamIndex].currentPlayerIndex >= gameState.teams[gameState.currentTeamIndex].players.length) {
        gameState.teams[gameState.currentTeamIndex].currentPlayerIndex = 0;
        gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % 2;

        if (gameState.currentTeamIndex === 0) { // Un tour complet de table (les deux équipes ont joué)
            gameState.currentRound++;
            console.log("Manche terminée. Passage à la manche", gameState.currentRound);
        }
    }

    if (gameState.currentRound > gameState.roundsToPlay) {
        endGame();
    } else {
        startNextTurn();
    }
}

function endGame() {
    finalTeam1ScoreP.textContent = `${gameState.teams[0].name} : ${gameState.teams[0].score}`;
    finalTeam2ScoreP.textContent = `${gameState.teams[1].name} : ${gameState.teams[1].score}`;

    if (gameState.teams[0].score > gameState.teams[1].score) {
        winnerMessageH3.textContent = `L'équipe ${gameState.teams[0].name} remporte la partie ! 🎉`;
    } else if (gameState.teams[1].score > gameState.teams[0].score) {
        winnerMessageH3.textContent = `L'équipe ${gameState.teams[1].name} remporte la partie ! 🎉`;
    } else {
        winnerMessageH3.textContent = "Égalité ! Bien joué aux deux équipes ! 🤝";
    }
    showScreen('gameOver');
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---
addPlayerTeam1Btn.addEventListener('click', () => addPlayerInput(0));
addPlayerTeam2Btn.addEventListener('click', () => addPlayerInput(1));
team1NameInput.addEventListener('input', updateTeamNameDisplays);
team2NameInput.addEventListener('input', updateTeamNameDisplays);

startGameBtn.addEventListener('click', async () => {
    // Si vous implémentez le chargement de mots.json, attendez-le ici :
    // if (Object.keys(toutesLesListesDeMots).length === 0) {
    //    await chargerMots();
    // }
    // if (gameState.words.length === 0 && toutesLesListesDeMots.facile) {
    //    gameState.words = [...toutesLesListesDeMots.facile];
    // } // etc.

    if (setupNewGame()) {
        startNextTurn();
    }
});

playerReadyBtn.addEventListener('click', startPlayerTurn);

guessNormalBtn.addEventListener('click', () => {
    const points = parseInt(guessNormalBtn.dataset.points);
    handleWordAttempt(points);
});
guess3WordsBtn.addEventListener('click', () => {
    const points = parseInt(guess3WordsBtn.dataset.points);
    handleWordAttempt(points);
});
guessMimeBtn.addEventListener('click', () => {
    const points = parseInt(guessMimeBtn.dataset.points);
    handleWordAttempt(points);
});
passWordBtnGame.addEventListener('click', handlePassWordGame);

nextPlayerBtn.addEventListener('click', advanceToNextPlayerOrRound);

newGameBtn.addEventListener('click', () => {
    // Ne pas réinitialiser les noms d'équipes et de joueurs pour plus de commodité
    // mais réinitialiser les affichages des joueurs au cas où ils auraient été vidés
    // Si les divs sont vides, on les repeuple avec les H3
    if (!team1PlayersDiv.querySelector('h3')) {
        team1PlayersDiv.innerHTML = `<h3>Joueurs Équipe 1 (<span id="team1DisplayN">${team1NameInput.value || "Alpha"}</span>)</h3>`;
    }
    if (!team2PlayersDiv.querySelector('h3')) {
        team2PlayersDiv.innerHTML = `<h3>Joueurs Équipe 2 (<span id="team2DisplayN">${team2NameInput.value || "Bravo"}</span>)</h3>`;
    }
    // Conserver les champs de joueurs existants, ne pas en ajouter par défaut à chaque nouvelle partie.
    // Les joueurs peuvent les modifier s'ils le souhaitent sur l'écran de config.
    showScreen('config');
});

// --- INITIALISATION ---
showScreen('config');
// Ajouter 2 champs de joueurs par défaut pour chaque équipe au démarrage initial
if (team1PlayersDiv.getElementsByTagName('input').length === 0) {
    addPlayerInput(0);
    addPlayerInput(0);
}
if (team2PlayersDiv.getElementsByTagName('input').length === 0) {
    addPlayerInput(1);
    addPlayerInput(1);
}
updateTeamNameDisplays();