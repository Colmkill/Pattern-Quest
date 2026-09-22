    <script>
// ============================================
// PATTERN QUEST - Core Game State Implementation
// Fixed: Timer visible, response options visible, continue visible
// ============================================

// ===== Game Configuration =====
const CONFIG = {
    initialPeaceCoins: 100,
    initialSanityScraps: 0,
    initialMadness: 0,
    initialCycle: 1,
    initialLevel: 1,
    initialPuzzle: 1,
    
    puzzlesPerLevel: 10,
    puzzlesPerCycle: 10,
    
    madness: {
        wrongAnswer: 15,
        timeMultiplier: 0.1,
        correctReduction: 2,
        sanityScrapValue: 10,
        timeout: 20 // Madness increase when the timer reaches zero
    },
    
    timer: {
        seconds: 20 // Countdown duration per puzzle (20 -> 0)
    },
    
    baseTax: 10,
    taxIncreasePerCycle: 5
};

// ===== Game State =====
const gameState = {
    peaceCoins: CONFIG.initialPeaceCoins,
    sanityScraps: CONFIG.initialSanityScraps,
    madness: CONFIG.initialMadness,
    currentCycle: CONFIG.initialCycle,
    currentLevel: CONFIG.initialLevel,
    currentPuzzle: CONFIG.initialPuzzle,
    
    puzzleStartTime: null,
    puzzleStarted: false,
    puzzleActive: false,
    puzzleTimedOut: false,
    secondsLeft: CONFIG.timer.seconds,
    
    // Milliseconds to pause after an answer before auto-advancing (0 = no reprieve)
    reprieveTime: 2000,
    
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalResponseTime: 0,
    coinsEarned: 0,
    coinsLost: 0,
    highestLevelReached: CONFIG.initialLevel,
    
    currentPuzzleCategory: 'quantitative',
    currentPuzzleDifficulty: 1,
    
    gameActive: false
};

// ===== DOM Elements =====
const elements = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    ledgerScreen: document.getElementById('ledger-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    
    peaceCoins: document.getElementById('peace-coins'),
    sanityScraps: document.getElementById('sanity-scraps'),
    madnessMeter: document.getElementById('madness-meter'),
    currentCycle: document.getElementById('current-cycle'),
    currentLevel: document.getElementById('current-level'),
    currentPuzzle: document.getElementById('current-puzzle'),
    
    puzzleContainer: document.getElementById('puzzle-container'),
    puzzleQuestion: document.getElementById('puzzle-question'),
    puzzleInstruction: document.getElementById('puzzle-instruction'),
    puzzleTimer: document.getElementById('puzzle-timer'),
    optionsContainer: document.getElementById('options-container'),
    
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackMessage: document.getElementById('feedback-message'),
    feedbackExplanation: document.getElementById('feedback-explanation'),
    
    startBtn: document.getElementById('start-btn'),
    continueBtn: document.getElementById('continue-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    resetGameBtn: document.getElementById('reset-game-btn'),
    
    taxAmount: document.getElementById('tax-amount'),
    ledgerCoins: document.getElementById('ledger-coins'),
    ledgerSanity: document.getElementById('ledger-sanity'),
    ledgerMadness: document.getElementById('ledger-madness'),
    buySanityBtn: document.getElementById('buy-sanity-btn'),
    buySanity5Btn: document.getElementById('buy-sanity-5-btn'),
    leaveLedgerBtn: document.getElementById('leave-ledger-btn'),
    
    finalCoins: document.getElementById('final-coins'),
    finalSanity: document.getElementById('final-sanity'),
    finalMadness: document.getElementById('final-madness'),
    finalLevel: document.getElementById('final-level'),
    finalCycles: document.getElementById('final-cycles'),
    finalPuzzles: document.getElementById('final-puzzles'),
    
    progressFill: document.getElementById('progress-fill')
};

// ===== Game Engine =====
class PatternQuest {
    constructor() {
        this.setupEventListeners();
        this.renderOptions(); // FIX: Render options immediately
        this.updateUI();
    }
    
    setupEventListeners() {
        elements.startBtn.addEventListener('click', () => this.startGame());
        elements.continueBtn.addEventListener('click', () => this.continuePuzzle());
        elements.playAgainBtn.addEventListener('click', () => this.resetAndStart());
        elements.resetGameBtn.addEventListener('click', () => this.resetGame());
        
        elements.leaveLedgerBtn.addEventListener('click', () => this.leaveLedger());
        elements.buySanityBtn.addEventListener('click', () => this.purchaseSanityScrap(1));
        elements.buySanity5Btn.addEventListener('click', () => this.purchaseSanityScrap(5));
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        elements.optionsContainer.addEventListener('click', (e) => {
            const optionCard = e.target.closest('.option-card');
            if (optionCard && !optionCard.disabled) {
                this.selectOption(optionCard);
            }
        });
        
        // FIX: Click on puzzle container to start
        elements.puzzleContainer.addEventListener('click', () => {
            if (!gameState.puzzleStarted && gameState.puzzleActive && gameState.gameActive) {
                this.startPuzzle();
            }
        });
    }
    
    handleKeyDown(e) {
        if (e.key === 'Enter') {
            if (!gameState.puzzleStarted && gameState.puzzleActive && gameState.gameActive) {
                e.preventDefault();
                this.startPuzzle();
            } else if (!elements.continueBtn.classList.contains('hidden')) {
                e.preventDefault();
                this.continuePuzzle();
            }
        }
        
        if (gameState.puzzleStarted && !gameState.puzzleActive && gameState.gameActive) {
            const optionCards = document.querySelectorAll('.option-card:not(:disabled)');
            if (e.key >= '1' && e.key <= '6' && optionCards.length > 0) {
                const index = parseInt(e.key) - 1;
                if (index < optionCards.length) {
                    this.selectOption(optionCards[index]);
                }
            }
        }
        
        if (e.key === 'Escape' && !elements.ledgerScreen.classList.contains('hidden')) {
            this.leaveLedger();
        }
    }
    
    // ===== GAME FLOW =====
    startGame() {
        // Stop any stray timer from a previous run
        this.stopTimer();
        
        gameState.puzzleStartTime = null;
        gameState.puzzleStarted = false;
        gameState.puzzleActive = true;
        gameState.gameActive = true;
        
        elements.startScreen.classList.add('hidden');
        elements.gameScreen.classList.remove('hidden');
        elements.ledgerScreen.classList.add('hidden');
        elements.gameOverScreen.classList.add('hidden');
        
        // Prevent Enter on the still-focused Start button from re-running startGame
        elements.startBtn.blur();
        
        this.updateUI();
        this.renderOptions(); // FIX: Ensure options are rendered
    }
    
    // ===== CORE FUNCTIONS =====
    startPuzzle() {
        if (gameState.puzzleStarted) return;
        
        gameState.puzzleStarted = true;
        gameState.puzzleStartTime = Date.now();
        gameState.puzzleActive = false;
        gameState.puzzleTimedOut = false;
        
        elements.puzzleContainer.classList.remove('puzzle-ready');
        elements.puzzleContainer.classList.add('puzzle-started');
        elements.puzzleInstruction.textContent = 'Select your answer before the timer hits zero!';
        
        this.startTimerCountdown();
        
        console.log('Puzzle timer started (countdown from ' + CONFIG.timer.seconds + 's)');
    }
    
    // Always clear any existing timer before starting a new one
    startTimerCountdown() {
        this.stopTimer();
        
        gameState.secondsLeft = CONFIG.timer.seconds;
        this.renderTimer();
        
        this.timerInterval = setInterval(() => {
            gameState.secondsLeft--;
            this.renderTimer();
            
            if (gameState.secondsLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }
    
    // Stop any running timer
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    renderTimer() {
        if (!gameState.puzzleStarted) {
            return;
        }
        
        const secondsLeft = Math.max(0, gameState.secondsLeft);
        elements.puzzleTimer.textContent = `Time: ${secondsLeft}s`;
        
        // Highlight when time is running low
        elements.puzzleTimer.style.color = secondsLeft <= 5 ? 'var(--error-color)' : 'var(--secondary-color)';
    }
    
    handleTimeout() {
        this.stopTimer();
        gameState.secondsLeft = 0;
        this.renderTimer();
        
        gameState.puzzleTimedOut = true;
        gameState.puzzleActive = true; // Lock out further answers for this puzzle
        
        // Increase Madness for letting the timer run out
        gameState.madness += CONFIG.madness.timeout;
        gameState.incorrectAnswers++;
        this.updateUI();
        
        // Disable all options
        document.querySelectorAll('.option-card').forEach(card => {
            card.disabled = true;
        });
        
        // Show feedback
        elements.feedbackContainer.classList.remove('hidden');
        elements.feedbackMessage.textContent = "Time's up! 😵";
        elements.feedbackMessage.className = 'feedback-message incorrect';
        elements.feedbackExplanation.textContent =
            `The clock ran out. Madness +${CONFIG.madness.timeout}. The next puzzle is coming...`;
        
        // Reprieve pause, then continue automatically to the next puzzle
        this.startReprieve();
        
        console.log(`Time out! Madness +${CONFIG.madness.timeout}`);
    }
    
    selectOption(optionCard) {
        if (!gameState.puzzleStarted || gameState.puzzleActive) return;
        
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        optionCard.classList.add('selected');
        this.checkAnswer(optionCard);
    }
    
    checkAnswer(optionCard) {
        if (!gameState.puzzleStarted || !gameState.puzzleStartTime || gameState.puzzleTimedOut) return;
        
        const selectedValue = parseInt(optionCard.dataset.value);
        const isCorrect = selectedValue === 2;
        
        this.stopTimer();
        
        const responseTime = Date.now() - gameState.puzzleStartTime;
        
        if (isCorrect) {
            this.applyCorrectResult(responseTime);
        } else {
            this.applyWrongResult(responseTime);
        }
        
        this.showFeedback(isCorrect, responseTime);
        
        document.querySelectorAll('.option-card').forEach(card => {
            card.disabled = true;
        });
        
        // Start the reprieve: feedback is shown now, next puzzle loads automatically
        this.startReprieve();
    }
    
    // ===== REPRIEVE =====
    // Pauses briefly after an answer, then continues automatically.
    // Duration always comes from gameState.reprieveTime (0 = advance immediately).
    startReprieve() {
        // Prevent multiple answer selections from stacking timers
        this.clearReprieve();
        
        const duration = gameState.reprieveTime;
        
        if (!duration || duration <= 0) {
            // No reprieve - continue immediately
            this.continuePuzzle();
            return;
        }
        
        this.reprieveTimeout = setTimeout(() => {
            this.reprieveTimeout = null;
            this.continuePuzzle();
        }, duration);
    }
    
    clearReprieve() {
        if (this.reprieveTimeout) {
            clearTimeout(this.reprieveTimeout);
            this.reprieveTimeout = null;
        }
    }
    
    continuePuzzle() {
        // Guard: ignore repeat calls (e.g. Enter firing click on a focused button)
        if (this._advancing) return;
        this._advancing = true;
        setTimeout(() => { this._advancing = false; }, 200);
        
        this.clearReprieve();
        this.stopTimer();
        elements.continueBtn.classList.add('hidden');
        elements.feedbackContainer.classList.add('hidden');
        
        const puzzleNumber = gameState.currentPuzzle;
        
        if (puzzleNumber === CONFIG.puzzlesPerLevel) {
            this.completeLevel();
        } else if (puzzleNumber === CONFIG.puzzlesPerLevel * 2) {
            this.completeLevel();
        } else if (puzzleNumber === CONFIG.puzzlesPerCycle) {
            this.completeCycle();
            return;
        }
        
        gameState.currentPuzzle++;
        
        gameState.puzzleStarted = false;
        gameState.puzzleStartTime = null;
        gameState.puzzleActive = true;
        gameState.puzzleTimedOut = false;
        
        this.updateUI();
        this.resetPuzzleDisplay();
        this.renderOptions(); // FIX: Re-render options
    }
    
    // ===== REQUIRED CORE FUNCTIONS =====
    completePuzzle() {
        // Puzzle completion logic
    }
    
    applyCorrectResult(responseTime) {
        gameState.correctAnswers++;
        gameState.totalResponseTime += responseTime;
        
        const coinsEarned = 5;
        gameState.peaceCoins += coinsEarned;
        gameState.coinsEarned += coinsEarned;
        
        gameState.madness = Math.max(0, gameState.madness - CONFIG.madness.correctReduction);
        
        console.log(`Correct! +${coinsEarned} Peace Coins, Madness -${CONFIG.madness.correctReduction}`);
    }
    
    applyWrongResult(responseTime) {
        gameState.incorrectAnswers++;
        gameState.totalResponseTime += responseTime;
        
        const coinsLost = 1;
        gameState.peaceCoins = Math.max(0, gameState.peaceCoins - coinsLost);
        gameState.coinsLost += coinsLost;
        
        gameState.madness += CONFIG.madness.wrongAnswer;
        this.applyMadnessFromTime(responseTime);
        
        console.log(`Wrong! -${coinsLost} Peace Coins, Madness +${CONFIG.madness.wrongAnswer + Math.floor(responseTime * CONFIG.madness.timeMultiplier / 1000)}`);
    }
    
    applyMadnessFromTime(elapsedTime) {
        const madnessIncrease = Math.floor(elapsedTime * CONFIG.madness.timeMultiplier / 1000);
        gameState.madness += madnessIncrease;
    }
    
    applyOverlordTax() {
        const tax = this.calculateOverlordTax();
        gameState.peaceCoins = Math.max(0, gameState.peaceCoins - tax);
        gameState.coinsLost += tax;
        return tax;
    }
    
    calculateOverlordTax() {
        return CONFIG.baseTax + (CONFIG.taxIncreasePerCycle * (gameState.currentCycle - 1));
    }
    
    purchaseSanityScrap(amount) {
        const cost = amount === 1 ? 50 : 200;
        
        if (gameState.peaceCoins < cost) {
            alert('Not enough Peace Coins!');
            return false;
        }
        
        gameState.peaceCoins -= cost;
        gameState.sanityScraps += amount;
        gameState.coinsLost += cost;
        
        this.updateLedgerUI();
        return true;
    }
    
    completeLevel() {
        gameState.currentLevel++;
        if (gameState.currentLevel > gameState.highestLevelReached) {
            gameState.highestLevelReached = gameState.currentLevel;
        }
        
        this.enterSanityLedger();
    }
    
    completeCycle() {
        gameState.currentCycle++;
        gameState.currentLevel = 1;
        gameState.currentPuzzle = 1;
        
        this.enterSanityLedger();
    }
    
    resetGame() {
        if (gameState.currentPuzzle > 1 || gameState.peaceCoins !== CONFIG.initialPeaceCoins) {
            if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
                this.doReset();
            }
        } else {
            this.doReset();
        }
    }
    
    doReset() {
        gameState.peaceCoins = CONFIG.initialPeaceCoins;
        gameState.sanityScraps = CONFIG.initialSanityScraps;
        gameState.madness = CONFIG.initialMadness;
        gameState.currentCycle = CONFIG.initialCycle;
        gameState.currentLevel = CONFIG.initialLevel;
        gameState.currentPuzzle = CONFIG.initialPuzzle;
        gameState.puzzleStartTime = null;
        gameState.puzzleStarted = false;
        gameState.puzzleActive = false;
        gameState.puzzleTimedOut = false;
        gameState.secondsLeft = CONFIG.timer.seconds;
        gameState.correctAnswers = 0;
        gameState.incorrectAnswers = 0;
        gameState.totalResponseTime = 0;
        gameState.coinsEarned = 0;
        gameState.coinsLost = 0;
        gameState.highestLevelReached = CONFIG.initialLevel;
        gameState.gameActive = false;
        
        this.stopTimer();
        this.clearReprieve();
        
        this.updateUI();
        
        elements.startScreen.classList.remove('hidden');
        elements.gameScreen.classList.add('hidden');
        elements.ledgerScreen.classList.add('hidden');
        elements.gameOverScreen.classList.add('hidden');
        
        this.resetPuzzleDisplay();
    }
    
    // ===== UI FUNCTIONS =====
    updateUI() {
        elements.peaceCoins.textContent = gameState.peaceCoins;
        elements.sanityScraps.textContent = gameState.sanityScraps;
        elements.madnessMeter.textContent = gameState.madness;
        elements.currentCycle.textContent = gameState.currentCycle;
        elements.currentLevel.textContent = gameState.currentLevel;
        elements.currentPuzzle.textContent = gameState.currentPuzzle;
        
        const maxPuzzle = CONFIG.puzzlesPerCycle;
        const progressPercent = ((gameState.currentPuzzle - 1) / maxPuzzle) * 100;
        elements.progressFill.style.width = progressPercent + '%';
    }
    
    updateLedgerUI() {
        elements.ledgerCoins.textContent = gameState.peaceCoins;
        elements.ledgerSanity.textContent = gameState.sanityScraps;
        elements.ledgerMadness.textContent = gameState.madness;
        
        const tax = this.calculateOverlordTax();
        elements.taxAmount.textContent = tax;
        
        elements.buySanityBtn.disabled = gameState.peaceCoins < 50;
        elements.buySanity5Btn.disabled = gameState.peaceCoins < 200;
    }
    
    renderOptions() {
        elements.optionsContainer.innerHTML = '';
        
        const options = [1, 2, 3, 4, 5, 6];
        
        options.forEach((option, index) => {
            const optionCard = document.createElement('button');
            optionCard.className = 'option-card';
            optionCard.dataset.value = option;
            optionCard.dataset.index = index;
            optionCard.setAttribute('role', 'option');
            optionCard.setAttribute('aria-label', `Option ${option}`);
            optionCard.setAttribute('tabindex', '0');
            
            const content = document.createElement('div');
            content.className = 'option-content';
            content.textContent = option;
            
            optionCard.appendChild(content);
            
            const label = document.createElement('span');
            label.className = 'option-label';
            label.textContent = String.fromCharCode(65 + index);
            optionCard.appendChild(label);
            
            optionCard.addEventListener('click', () => this.selectOption(optionCard));
            
            optionCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectOption(optionCard);
                }
            });
            
            elements.optionsContainer.appendChild(optionCard);
        });
        
        console.log('Options rendered');
    }
    
    resetPuzzleDisplay() {
        elements.puzzleContainer.classList.add('puzzle-ready');
        elements.puzzleContainer.classList.remove('puzzle-started');
        elements.puzzleInstruction.textContent = 'Press Enter or click to start the puzzle';
        elements.puzzleTimer.textContent = `Time: ${CONFIG.timer.seconds}s`;
        elements.puzzleTimer.style.color = 'var(--secondary-color)';
        elements.optionsContainer.innerHTML = '';
        elements.feedbackContainer.classList.add('hidden');
        elements.continueBtn.classList.add('hidden');
        
        this.renderOptions(); // FIX: Re-render options
    }
    
    showFeedback(isCorrect, responseTime) {
        elements.feedbackContainer.classList.remove('hidden');
        
        elements.feedbackMessage.textContent = isCorrect ? 'Correct! ✓' : 'Wrong! ✗';
        elements.feedbackMessage.className = 'feedback-message ' + (isCorrect ? 'correct' : 'incorrect');
        
        const elapsedSeconds = Math.floor(responseTime / 1000);
        elements.feedbackExplanation.textContent = 
            `Answered in ${elapsedSeconds}s. ${isCorrect ? 'Well done!' : 'Try again.'}`;
        
        document.querySelectorAll('.option-card').forEach((option) => {
            const optionValue = parseInt(option.dataset.value);
            if (optionValue === 2) {
                option.classList.add('correct');
            }
        });
    }
    
    enterSanityLedger() {
        const tax = this.applyOverlordTax();
        this.updateLedgerUI();
        
        elements.gameScreen.classList.add('hidden');
        elements.ledgerScreen.classList.remove('hidden');
    }
    
    leaveLedger() {
        if (gameState.currentPuzzle > CONFIG.puzzlesPerCycle) {
            gameState.currentCycle++;
            gameState.currentLevel = 1;
            gameState.currentPuzzle = 1;
        }
        
        elements.ledgerScreen.classList.add('hidden');
        elements.gameScreen.classList.remove('hidden');
        
        gameState.puzzleStarted = false;
        gameState.puzzleStartTime = null;
        gameState.puzzleActive = true;
        
        this.updateUI();
        this.resetPuzzleDisplay();
        
        if (gameState.currentPuzzle === 1) {
            this.startPuzzle();
        }
    }
    
    resetAndStart() {
        this.doReset();
        this.startGame();
    }
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    window.patternQuest = new PatternQuest();
    console.log('Pattern Quest Core initialized - FIXED VERSION');
    console.log('Timer, options, and continue button should now be visible and working');
});
    </script>
