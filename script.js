    <script>
// ============================================
// PATTERN QUEST - Core Game State Implementation
// ============================================

// ===== Game Configuration =====
const CONFIG = {
    // Starting values
    initialPeaceCoins: 100,
    initialSanityScraps: 0,
    initialMadness: 0,
    initialCycle: 1,
    initialLevel: 1,
    initialPuzzle: 1,
    
    // Puzzle thresholds
    puzzlesPerLevel: 100, // Puzzles 1-100 = Level 1, 101-200 = Level 2, etc.
    puzzlesPerCycle: 500, // 500 puzzles per cycle
    
    // Madness configuration
    madness: {
        wrongAnswer: 15,      // Madness increase for wrong answer
        timeMultiplier: 0.1,  // Madness per second (0.1 * seconds)
        correctReduction: 2,  // Madness reduction for correct answer
        sanityScrapValue: 10  // Madness reduction per sanity scrap
    },
    
    // Tax configuration
    baseTax: 10,            // Starting tax for Cycle 1
    taxIncreasePerCycle: 5 // Tax increases by 5 each cycle
};

// ===== Game State =====
const gameState = {
    // Core state
    peaceCoins: CONFIG.initialPeaceCoins,
    sanityScraps: CONFIG.initialSanityScraps,
    madness: CONFIG.initialMadness,
    currentCycle: CONFIG.initialCycle,
    currentLevel: CONFIG.initialLevel,
    currentPuzzle: CONFIG.initialPuzzle,
    
    // Puzzle tracking
    puzzleStartTime: null,
    puzzleStarted: false,
    puzzleActive: false,
    
    // Performance tracking
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalResponseTime: 0,
    coinsEarned: 0,
    coinsLost: 0,
    highestLevelReached: CONFIG.initialLevel,
    
    // Current puzzle info
    currentPuzzleCategory: 'quantitative',
    currentPuzzleDifficulty: 1,
    
    // Game flow
    gameActive: false
};

// ===== DOM Elements =====
const elements = {
    // Screens
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    ledgerScreen: document.getElementById('ledger-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    
    // Header stats
    peaceCoins: document.getElementById('peace-coins'),
    sanityScraps: document.getElementById('sanity-scraps'),
    madnessMeter: document.getElementById('madness-meter'),
    currentCycle: document.getElementById('current-cycle'),
    currentLevel: document.getElementById('current-level'),
    currentPuzzle: document.getElementById('current-puzzle'),
    
    // Puzzle elements
    puzzleContainer: document.getElementById('puzzle-container'),
    puzzleQuestion: document.getElementById('puzzle-question'),
    puzzleInstruction: document.getElementById('puzzle-instruction'),
    puzzleTimer: document.getElementById('puzzle-timer'),
    optionsContainer: document.getElementById('options-container'),
    
    // Feedback
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackMessage: document.getElementById('feedback-message'),
    feedbackExplanation: document.getElementById('feedback-explanation'),
    
    // Buttons
    startBtn: document.getElementById('start-btn'),
    continueBtn: document.getElementById('continue-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    resetGameBtn: document.getElementById('reset-game-btn'),
    
    // Ledger elements
    taxAmount: document.getElementById('tax-amount'),
    ledgerCoins: document.getElementById('ledger-coins'),
    ledgerSanity: document.getElementById('ledger-sanity'),
    ledgerMadness: document.getElementById('ledger-madness'),
    buySanityBtn: document.getElementById('buy-sanity-btn'),
    buySanity5Btn: document.getElementById('buy-sanity-5-btn'),
    leaveLedgerBtn: document.getElementById('leave-ledger-btn'),
    
    // Game over elements
    finalCoins: document.getElementById('final-coins'),
    finalSanity: document.getElementById('final-sanity'),
    finalMadness: document.getElementById('final-madness'),
    finalLevel: document.getElementById('final-level'),
    finalCycles: document.getElementById('final-cycles'),
    finalPuzzles: document.getElementById('final-puzzles'),
    
    // Progress
    progressFill: document.getElementById('progress-fill')
};

// ===== Game Engine =====
class PatternQuest {
    constructor() {
        this.setupEventListeners();
        this.updateUI();
    }
    
    // ===== Event Listeners =====
    setupEventListeners() {
        // Start button
        elements.startBtn.addEventListener('click', () => this.startGame());
        
        // Continue button
        elements.continueBtn.addEventListener('click', () => this.continuePuzzle());
        
        // Play again button
        elements.playAgainBtn.addEventListener('click', () => this.resetAndStart());
        
        // Reset game button
        elements.resetGameBtn.addEventListener('click', () => this.resetGame());
        
        // Ledger buttons
        elements.leaveLedgerBtn.addEventListener('click', () => this.leaveLedger());
        elements.buySanityBtn.addEventListener('click', () => this.purchaseSanityScrap(1));
        elements.buySanity5Btn.addEventListener('click', () => this.purchaseSanityScrap(5));
        
        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Option selection
        elements.optionsContainer.addEventListener('click', (e) => {
            const optionCard = e.target.closest('.option-card');
            if (optionCard && !optionCard.disabled) {
                this.selectOption(optionCard);
            }
        });
        
        // Puzzle container click (for starting puzzle)
        elements.puzzleContainer.addEventListener('click', () => {
            if (!gameState.puzzleStarted && gameState.puzzleActive) {
                this.startPuzzle();
            }
        });
    }
    
    handleKeyDown(e) {
        // Enter key to start puzzle or continue
        if (e.key === 'Enter') {
            if (!gameState.puzzleStarted && gameState.puzzleActive) {
                e.preventDefault();
                this.startPuzzle();
            } else if (elements.continueBtn.style.display !== 'none') {
                e.preventDefault();
                this.continuePuzzle();
            }
        }
        
        // Number keys for options
        if (gameState.puzzleStarted && !gameState.puzzleActive) {
            const optionCards = document.querySelectorAll('.option-card:not(:disabled)');
            if (e.key >= '1' && e.key <= '9' && optionCards.length > 0) {
                const index = parseInt(e.key) - 1;
                if (index < optionCards.length) {
                    this.selectOption(optionCards[index]);
                }
            }
        }
        
        // Escape to leave ledger
        if (e.key === 'Escape' && !elements.ledgerScreen.classList.contains('hidden')) {
            this.leaveLedger();
        }
    }
    
    // ===== Game Flow =====
    startGame() {
        // Reset puzzle-specific state
        gameState.puzzleStartTime = null;
        gameState.puzzleStarted = false;
        gameState.puzzleActive = true;
        gameState.gameActive = true;
        
        // Hide start screen, show game screen
        elements.startScreen.classList.add('hidden');
        elements.gameScreen.classList.remove('hidden');
        elements.ledgerScreen.classList.add('hidden');
        elements.gameOverScreen.classList.add('hidden');
        
        // Start first puzzle
        this.startPuzzle();
        
        // Update UI
        this.updateUI();
    }
    
    // ===== CORE FUNCTIONS =====
    
    // Start the puzzle timer
    startPuzzle() {
        if (gameState.puzzleStarted) return;
        
        gameState.puzzleStarted = true;
        gameState.puzzleStartTime = Date.now();
        gameState.puzzleActive = false; // Puzzle is now active for answering
        
        // Update UI
        elements.puzzleContainer.classList.remove('puzzle-ready');
        elements.puzzleContainer.classList.add('puzzle-started');
        elements.puzzleInstruction.textContent = 'Select your answer';
        
        // Start timer display
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        
        // Enable options
        this.renderOptions();
        
        console.log('Puzzle started. Timer recording...');
    }
    
    // Update timer display
    updateTimer() {
        if (!gameState.puzzleStarted || !gameState.puzzleStartTime) return;
        
        const elapsed = Math.floor((Date.now() - gameState.puzzleStartTime) / 1000);
        elements.puzzleTimer.textContent = `Time: ${elapsed}s`;
    }
    
    // Select an option
    selectOption(optionCard) {
        if (!gameState.puzzleStarted || gameState.puzzleActive) return;
        
        // Remove selection from all options
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Select this option
        optionCard.classList.add('selected');
        
        // Check answer
        this.checkAnswer(optionCard);
    }
    
    // Check if answer is correct
    checkAnswer(optionCard) {
        if (!gameState.puzzleStarted || !gameState.puzzleStartTime) return;
        
        const selectedIndex = parseInt(optionCard.dataset.index);
        const selectedValue = parseInt(optionCard.dataset.value);
        const isCorrect = selectedValue === 2; // 1 + 1 = 2
        
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Calculate response time
        const responseTime = Date.now() - gameState.puzzleStartTime;
        
        // Process result
        if (isCorrect) {
            this.applyCorrectResult(responseTime);
        } else {
            this.applyWrongResult(responseTime);
        }
        
        // Show feedback
        this.showFeedback(isCorrect, responseTime);
        
        // Disable all options
        document.querySelectorAll('.option-card').forEach(card => {
            card.disabled = true;
        });
        
        // Show continue button (for testing, but auto-advance would be here)
        elements.continueBtn.style.display = 'block';
        setTimeout(() => elements.continueBtn.focus(), 100);
    }
    
    // Continue to next puzzle
    continuePuzzle() {
        elements.continueBtn.style.display = 'none';
        elements.feedbackContainer.classList.add('hidden');
        
        // Check for level/cycle transitions
        const puzzleNumber = gameState.currentPuzzle;
        
        if (puzzleNumber === CONFIG.puzzlesPerLevel) {
            // Level 1 -> Level 2 transition
            this.completeLevel();
        } else if (puzzleNumber === CONFIG.puzzlesPerLevel * 2) {
            // Level 2 -> Level 3 transition
            this.completeLevel();
        } else if (puzzleNumber === CONFIG.puzzlesPerCycle) {
            // Cycle completion
            this.completeCycle();
            return; // Don't increment puzzle, cycle handles it
        }
        
        // Increment puzzle number
        gameState.currentPuzzle++;
        
        // Reset puzzle state
        gameState.puzzleStarted = false;
        gameState.puzzleStartTime = null;
        gameState.puzzleActive = true;
        
        // Update UI
        this.updateUI();
        
        // Start next puzzle
        this.resetPuzzleDisplay();
        this.startPuzzle();
        
        console.log(`Advanced to puzzle ${gameState.currentPuzzle}`);
    }
    
    // ===== CORE FUNCTIONS (Required) =====
    
    // Start puzzle timer
    startPuzzle() {
        if (gameState.puzzleStarted) return;
        
        gameState.puzzleStarted = true;
        gameState.puzzleStartTime = Date.now();
        gameState.puzzleActive = false;
        
        elements.puzzleContainer.classList.remove('puzzle-ready');
        elements.puzzleContainer.classList.add('puzzle-started');
        elements.puzzleInstruction.textContent = 'Select your answer';
        
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        
        this.renderOptions();
    }
    
    // Complete puzzle and process results
    completePuzzle() {
        // This is called when puzzle is answered
        // The actual completion logic is in checkAnswer
    }
    
    // Apply correct answer result
    applyCorrectResult(responseTime) {
        gameState.correctAnswers++;
        gameState.totalResponseTime += responseTime;
        
        // Award Peace Coins (simple reward for now)
        const coinsEarned = 5; // Base reward
        gameState.peaceCoins += coinsEarned;
        gameState.coinsEarned += coinsEarned;
        
        // Reduce Madness minimally
        gameState.madness = Math.max(0, gameState.madness - CONFIG.madness.correctReduction);
        
        console.log(`Correct! +${coinsEarned} Peace Coins, Madness -${CONFIG.madness.correctReduction}`);
    }
    
    // Apply wrong answer result
    applyWrongResult(responseTime) {
        gameState.incorrectAnswers++;
        gameState.totalResponseTime += responseTime;
        
        // Deduct Peace Coins
        const coinsLost = 1; // Base penalty
        gameState.peaceCoins = Math.max(0, gameState.peaceCoins - coinsLost);
        gameState.coinsLost += coinsLost;
        
        // Increase Madness for wrong answer
        gameState.madness += CONFIG.madness.wrongAnswer;
        
        // Increase Madness from time
        this.applyMadnessFromTime(responseTime);
        
        console.log(`Wrong! -${coinsLost} Peace Coins, Madness +${CONFIG.madness.wrongAnswer + Math.floor(responseTime * CONFIG.madness.timeMultiplier / 1000)}`);
    }
    
    // Apply Madness from elapsed time
    applyMadnessFromTime(elapsedTime) {
        const madnessIncrease = Math.floor(elapsedTime * CONFIG.madness.timeMultiplier / 1000);
        gameState.madness += madnessIncrease;
        console.log(`Madness from time: +${madnessIncrease} (${elapsedTime}ms)`);
    }
    
    // Apply Overlord tax
    applyOverlordTax() {
        const tax = this.calculateOverlordTax();
        gameState.peaceCoins = Math.max(0, gameState.peaceCoins - tax);
        gameState.coinsLost += tax;
        return tax;
    }
    
    // Calculate Overlord tax
    calculateOverlordTax() {
        return CONFIG.baseTax + (CONFIG.taxIncreasePerCycle * (gameState.currentCycle - 1));
    }
    
    // Purchase Sanity Scraps
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
    
    // Use Sanity Scrap to reduce Madness
    useSanityScrap() {
        if (gameState.sanityScraps <= 0) return false;
        
        gameState.sanityScraps--;
        gameState.madness = Math.max(0, gameState.madness - CONFIG.madness.sanityScrapValue);
        
        this.updateLedgerUI();
        return true;
    }
    
    // Complete current level
    completeLevel() {
        console.log(`Level ${gameState.currentLevel} completed!`);
        
        gameState.currentLevel++;
        if (gameState.currentLevel > gameState.highestLevelReached) {
            gameState.highestLevelReached = gameState.currentLevel;
        }
        
        // Show Sanity Ledger at level transitions
        this.enterSanityLedger();
    }
    
    // Complete current cycle
    completeCycle() {
        console.log(`Cycle ${gameState.currentCycle} completed!`);
        
        gameState.currentCycle++;
        gameState.currentLevel = 1;
        gameState.currentPuzzle = 1;
        
        // Increase base difficulty (for future implementation)
        // Increase base Madness pressure (for future implementation)
        
        // Show Sanity Ledger at cycle transitions
        this.enterSanityLedger();
    }
    
    // Reset game to initial state
    resetGame() {
        // Show confirmation
        if (gameState.currentPuzzle > 1 || gameState.peaceCoins !== CONFIG.initialPeaceCoins) {
            if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
                this.doReset();
            }
        } else {
            this.doReset();
        }
    }
    
    doReset() {
        // Reset all state
        gameState.peaceCoins = CONFIG.initialPeaceCoins;
        gameState.sanityScraps = CONFIG.initialSanityScraps;
        gameState.madness = CONFIG.initialMadness;
        gameState.currentCycle = CONFIG.initialCycle;
        gameState.currentLevel = CONFIG.initialLevel;
        gameState.currentPuzzle = CONFIG.initialPuzzle;
        gameState.puzzleStartTime = null;
        gameState.puzzleStarted = false;
        gameState.puzzleActive = false;
        gameState.correctAnswers = 0;
        gameState.incorrectAnswers = 0;
        gameState.totalResponseTime = 0;
        gameState.coinsEarned = 0;
        gameState.coinsLost = 0;
        gameState.highestLevelReached = CONFIG.initialLevel;
        gameState.gameActive = false;
        
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Update UI
        this.updateUI();
        
        // Show start screen
        elements.startScreen.classList.remove('hidden');
        elements.gameScreen.classList.add('hidden');
        elements.ledgerScreen.classList.add('hidden');
        elements.gameOverScreen.classList.add('hidden');
        
        // Reset puzzle display
        this.resetPuzzleDisplay();
        
        console.log('Game reset to initial state');
    }
    
    // ===== UI Functions =====
    
    // Update all UI elements
    updateUI() {
        // Update header stats
        elements.peaceCoins.textContent = gameState.peaceCoins;
        elements.sanityScraps.textContent = gameState.sanityScraps;
        elements.madnessMeter.textContent = gameState.madness;
        elements.currentCycle.textContent = gameState.currentCycle;
        elements.currentLevel.textContent = gameState.currentLevel;
        elements.currentPuzzle.textContent = gameState.currentPuzzle;
        
        // Update progress bar
        const maxPuzzle = CONFIG.puzzlesPerCycle;
        const progressPercent = ((gameState.currentPuzzle - 1) / maxPuzzle) * 100;
        elements.progressFill.style.width = progressPercent + '%';
    }
    
    // Update ledger UI
    updateLedgerUI() {
        elements.ledgerCoins.textContent = gameState.peaceCoins;
        elements.ledgerSanity.textContent = gameState.sanityScraps;
        elements.ledgerMadness.textContent = gameState.madness;
        
        // Update tax display
        const tax = this.calculateOverlordTax();
        elements.taxAmount.textContent = tax;
        
        // Update purchase buttons
        elements.buySanityBtn.disabled = gameState.peaceCoins < 50;
        elements.buySanity5Btn.disabled = gameState.peaceCoins < 200;
    }
    
    // Render options for current puzzle
    renderOptions() {
        elements.optionsContainer.innerHTML = '';
        
        // For testing: 1 + 1 = ? with options
        const options = [1, 2, 3, 4, 5, 6]; // 2 is correct
        
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
            
            // Add option label
            const label = document.createElement('span');
            label.className = 'option-label';
            label.textContent = String.fromCharCode(65 + index); // A, B, C, etc.
            optionCard.appendChild(label);
            
            // Add click handler
            optionCard.addEventListener('click', () => this.selectOption(optionCard));
            
            // Add keyboard support
            optionCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectOption(optionCard);
                }
            });
            
            elements.optionsContainer.appendChild(optionCard);
        });
    }
    
    // Reset puzzle display
    resetPuzzleDisplay() {
        elements.puzzleContainer.classList.add('puzzle-ready');
        elements.puzzleContainer.classList.remove('puzzle-started');
        elements.puzzleInstruction.textContent = 'Press Enter or click to start the puzzle';
        elements.puzzleTimer.textContent = '';
        elements.optionsContainer.innerHTML = '';
        elements.feedbackContainer.classList.add('hidden');
        elements.continueBtn.style.display = 'none';
    }
    
    // Show feedback
    showFeedback(isCorrect, responseTime) {
        elements.feedbackContainer.classList.remove('hidden');
        
        elements.feedbackMessage.textContent = isCorrect ? 'Correct! ✓' : 'Wrong! ✗';
        elements.feedbackMessage.className = 'feedback-message ' + (isCorrect ? 'correct' : 'incorrect');
        
        const elapsedSeconds = Math.floor(responseTime / 1000);
        elements.feedbackExplanation.textContent = 
            `Answered in ${elapsedSeconds}s. ${isCorrect ? 'Well done!' : 'Try again.'}`;
        
        // Highlight correct option
        const options = document.querySelectorAll('.option-card');
        options.forEach((option, index) => {
            const optionValue = parseInt(option.dataset.value);
            if (optionValue === 2) {
                option.classList.add('correct');
            } else if (!isCorrect && parseInt(option.dataset.value) !== 2) {
                // Don't highlight wrong selection, only correct answer
            }
        });
    }
    
    // Enter Sanity Ledger
    enterSanityLedger() {
        // Apply tax
        const tax = this.applyOverlordTax();
        
        // Update UI
        this.updateLedgerUI();
        
        // Hide game screen, show ledger
        elements.gameScreen.classList.add('hidden');
        elements.ledgerScreen.classList.remove('hidden');
        
        console.log(`Entered Sanity Ledger. Tax paid: ${tax} Peace Coins`);
    }
    
    // Leave Sanity Ledger
    leaveLedger() {
        // Check if we need to start a new cycle
        if (gameState.currentPuzzle > CONFIG.puzzlesPerCycle) {
            // This shouldn't happen, but reset to new cycle
            gameState.currentCycle++;
            gameState.currentLevel = 1;
            gameState.currentPuzzle = 1;
        }
        
        // Hide ledger, show game screen
        elements.ledgerScreen.classList.add('hidden');
        elements.gameScreen.classList.remove('hidden');
        
        // Reset puzzle state for new level/cycle
        gameState.puzzleStarted = false;
        gameState.puzzleStartTime = null;
        gameState.puzzleActive = true;
        
        // Update UI
        this.updateUI();
        
        // Reset and start next puzzle
        this.resetPuzzleDisplay();
        
        // If we're at puzzle 1 of a new cycle, start immediately
        if (gameState.currentPuzzle === 1) {
            // No need to press Enter for first puzzle after ledger
            this.startPuzzle();
        }
        
        console.log('Left Sanity Ledger');
    }
    
    // Reset and start new game
    resetAndStart() {
        this.doReset();
        this.startGame();
    }
}

// ============================================
// INITIALIZE GAME
// ============================================

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.patternQuest = new PatternQuest();
    console.log('Pattern Quest Core initialized!');
    console.log('Press Enter to start puzzles. Test with 1+1=2.');
});
    </script>
