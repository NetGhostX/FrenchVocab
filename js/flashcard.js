/**
 * FlashcardManager
 * Handles the creation and management of flashcards
 */
class FlashcardManager {
    constructor() {
        this.currentItems = [];
        this.currentIndex = 0;
        this.currentMode = 'practice'; // practice, test, time-attack, difficult, multiple-choice
        this.isShowingAnswer = false;
        this.testAnswers = [];
        this.testStartTime = null;
        this.timeAttackTimeLimit = 60; // 60 seconds default for time attack
        this.timeAttackTimer = null;
        this.seenWords = new Set(); // Track words we've seen in this session
        
        // DOM elements
        this.flashcardContainer = document.getElementById('flashcard-container');
        this.resultsContainer = document.getElementById('results-container');
        this.studyModesContainer = document.querySelector('.study-modes');
        this.backButton = document.getElementById('back-to-modes');
        this.studyBanner = document.querySelector('.study-banner');
        this.languageSelection = document.querySelector('.language-selection');
        this.mainHeader = document.querySelector('.main-header');
        this.testStatsBanner = document.querySelector('.test-stats-banner');
        this.correctAnswersDisplay = document.getElementById('correct-answers');
        this.wrongAnswersDisplay = document.getElementById('wrong-answers');
        
        // Initialize
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for flashcard interactions
     */
    setupEventListeners() {
        // Mode selection buttons
        document.getElementById('practice-mode').addEventListener('click', () => this.startPracticeMode());
        document.getElementById('test-mode').addEventListener('click', () => this.startTestMode());
        document.getElementById('time-attack').addEventListener('click', () => this.startTimeAttackMode());
        document.getElementById('difficult-words').addEventListener('click', () => this.startDifficultWordsMode());
        document.getElementById('multiple-choice').addEventListener('click', () => this.startMultipleChoiceMode());
        document.getElementById('spaced-repetition').addEventListener('click', () => this.startSpacedRepetitionMode());
        
        // Language direction buttons
        document.getElementById('french-to-german').addEventListener('click', () => this.changeLanguageDirection('french-to-german'));
        document.getElementById('german-to-french').addEventListener('click', () => this.changeLanguageDirection('german-to-french'));
        
        // Back button
        this.backButton?.addEventListener('click', () => this.showModeSelection());
    }
    
    /**
     * Change the language direction
     * @param {string} direction - The new language direction
     */
    changeLanguageDirection(direction) {
        vocabularyManager.setDirection(direction);
        
        // Update UI to reflect the active language direction
        document.querySelectorAll('.language-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(direction).classList.add('active');
        
        // Update styles for buttons
        if (direction === 'french-to-german') {
            document.getElementById('french-to-german').classList.add('bg-primary');
            document.getElementById('french-to-german').classList.remove('bg-secondary');
            document.getElementById('german-to-french').classList.add('bg-secondary');
            document.getElementById('german-to-french').classList.remove('bg-primary');
        } else {
            document.getElementById('french-to-german').classList.add('bg-secondary');
            document.getElementById('french-to-german').classList.remove('bg-primary');
            document.getElementById('german-to-french').classList.add('bg-primary');
            document.getElementById('german-to-french').classList.remove('bg-secondary');
        }
        
        // If we're in the middle of a session, restart with the new direction
        if (this.flashcardContainer.classList.contains('hidden') === false) {
            this.startMode(this.currentMode);
        }
    }
    
    /**
     * Start the selected mode
     * @param {string} mode - The mode to start
     */
    startMode(mode) {
        this.currentMode = mode;
        this.currentIndex = 0;
        this.testAnswers = [];
        this.isShowingAnswer = false;
        this.seenWords.clear(); // Reset seen words for new session
        
        // Hide non-essential UI elements
        this.studyBanner?.classList.add('hidden');
        this.mainHeader?.classList.add('hidden');
        this.languageSelection?.classList.add('hidden');
        document.querySelectorAll('.bg-slate-50').forEach(container => {
            if (container.querySelector('h2')?.textContent.includes('Select Mode')) {
                container.classList.add('hidden');
            }
        });

        // Show test stats for test modes
        if (mode === 'test' || mode === 'time-attack' || mode === 'multiple-choice') {
            this.testStatsBanner?.classList.remove('hidden');
            this.updateTestStats(0, 0);
        }

        // Show back button
        this.backButton?.classList.remove('hidden');
        
        // Show flashcard container
        this.resultsContainer.classList.add('hidden');
        this.flashcardContainer.classList.remove('hidden');
        
        // Scroll to flashcard container
        this.flashcardContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Load initial batch of items based on mode
        if (mode === 'difficult') {
            this.currentItems = vocabularyManager.getDifficultWords();
        } else if (mode === 'multiple-choice') {
            // For multiple choice, get all vocabulary items
            this.currentItems = vocabularyManager.getVocabularyItems();
            // Shuffle them for random order
            this.shuffleArray(this.currentItems);
        } else if (mode === 'spaced-repetition') {
            this.currentItems = vocabularyManager.getSpacedRepetitionItems();
        } else {
            this.currentItems = vocabularyManager.getVocabularyItems();
        }

        // Track these words as seen
        this.currentItems.forEach(item => this.seenWords.add(item.french));
        
        // For test and time attack modes, track stats
        if (mode === 'test' || mode === 'time-attack' || mode === 'multiple-choice') {
            this.testStartTime = new Date();
            statsManager.startSession();
        }
        
        // For time attack mode, start the timer
        if (mode === 'time-attack') {
            this.startTimeAttackTimer();
        }
        
        // Display the first flashcard
        this.displayCurrentFlashcard();
    }
    
    /**
     * Start practice mode
     */
    startPracticeMode() {
        this.startMode('practice');
    }
    
    /**
     * Start test mode
     */
    startTestMode() {
        this.startMode('test');
    }
    
    /**
     * Start time attack mode
     */
    startTimeAttackMode() {
        this.startMode('time-attack');
    }
    
    /**
     * Start difficult words mode
     */
    startDifficultWordsMode() {
        this.startMode('difficult');
    }
    
    /**
     * Start multiple choice mode
     */
    startMultipleChoiceMode() {
        this.startMode('multiple-choice');
    }
    
    /**
     * Start spaced repetition mode
     */
    startSpacedRepetitionMode() {
        this.startMode('spaced-repetition');
    }
    
    /**
     * Start timer for time attack mode
     */
    startTimeAttackTimer() {
        let timeLeft = this.timeAttackTimeLimit;
        
        const updateTimer = () => {
            const timerElement = document.getElementById('time-attack-timer');
            if (timerElement) {
                timerElement.textContent = timeLeft;
                
                // Make timer red when time is running out
                if (timeLeft <= 10) {
                    timerElement.classList.add('text-red-500');
                    timerElement.classList.add('animate-pulse');
                }
            }
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(this.timeAttackTimer);
                this.endSession();
            }
        };
        
        // Update timer every second
        updateTimer();
        this.timeAttackTimer = setInterval(updateTimer, 1000);
    }
    
    /**
     * Display the current flashcard
     */
    displayCurrentFlashcard() {
        if (!this.currentItems.length) {
            this.showNoWordsMessage();
            return;
        }
        
        const item = this.currentItems[this.currentIndex];
        const direction = vocabularyManager.getDirection();
        
        let content = '';
        
        // Determine the question and answer based on the direction
        const questionLanguage = direction === 'french-to-german' ? 'french' : 'german';
        const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
        
        // Show card progress
        const progress = `<div class="text-sm text-gray-500 mb-4">
            Card ${this.currentIndex + 1} of ${this.currentItems.length}
        </div>`;
        
        // For time attack mode, show timer
        const timer = this.currentMode === 'time-attack' 
            ? `<div class="text-xl font-bold mb-4">Time: <span id="time-attack-timer">${this.timeAttackTimeLimit}</span>s</div>` 
            : '';
        
        // Show question
        content += `
            ${progress}
            ${timer}
            <div class="bg-gray-100 rounded-lg p-8 mb-6 shadow-inner-lg transform hover:scale-[1.01] transition-all">
                <h3 class="text-xl mb-2">${questionLanguage === 'french' ? 'Français' : 'Deutsch'}</h3>
                <p class="text-3xl font-bold">${item[questionLanguage]}</p>
                ${item.phonetic && questionLanguage === 'french' ? 
                    `<p class="phonetic text-gray-600 mt-2">[${item.phonetic}]</p>` : ''}
            </div>
        `;
        
        // For practice mode, provide option to show answer
        if (this.currentMode === 'practice') {
            if (!this.isShowingAnswer) {
                content += `
                    <div class="flex justify-center">
                        <button id="show-answer" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition shadow-md hover:shadow-lg">
                            <i class="fas fa-eye mr-2"></i>Show Answer
                        </button>
                    </div>
                `;
            } else {
                // Show answer area
                content += `
                    <div class="bg-gray-100 rounded-lg p-8 mb-6 shadow-inner-lg transform hover:scale-[1.01] transition-all">
                        <h3 class="text-xl mb-2">${answerLanguage === 'french' ? 'Français' : 'Deutsch'}</h3>
                        <p class="text-3xl font-bold">${item[answerLanguage]}</p>
                        ${item.phonetic && answerLanguage === 'french' ? 
                            `<p class="phonetic text-gray-600 mt-2">[${item.phonetic}]</p>` : ''}
                        ${item.tip ? `<div class="mt-4 p-3 bg-accent bg-opacity-20 rounded-md"><i class="fas fa-lightbulb text-accent mr-2"></i>${item.tip}</div>` : ''}
                    </div>
                    
                    <div class="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                        <button id="mark-difficult" class="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle mr-2"></i>Mark as Difficult
                        </button>
                        <div class="flex gap-2">
                            <button id="prev-card" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center" 
                                ${this.currentIndex === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                <i class="fas fa-arrow-left mr-2"></i>Previous
                            </button>
                            <button id="next-card" class="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center">
                                ${this.currentIndex === this.currentItems.length - 1 ? 'Finish' : 'Next'}<i class="fas fa-arrow-right ml-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        // For multiple choice mode, show options
        else if (this.currentMode === 'multiple-choice') {
            const correctAnswer = item[answerLanguage];
            
            // Get all other vocabulary items for wrong options
            const allOtherItems = vocabularyManager.getVocabularyItems()
                .filter(w => w[answerLanguage] !== correctAnswer)
                .map(w => w[answerLanguage]);
            
            // Randomly select 3 wrong answers from all possibilities
            const shuffledWrongAnswers = this.shuffleArray([...allOtherItems]).slice(0, 3);
            
            // Create options array with correct answer and wrong answers
            const options = this.shuffleArray([correctAnswer, ...shuffledWrongAnswers]);
            
            content += `
                <div class="mb-6">
                    <h3 class="text-xl mb-4">Select the correct ${answerLanguage === 'french' ? 'French' : 'German'} translation:</h3>
                    <div class="flex flex-col gap-3">
            `;
            
            options.forEach(option => {
                content += `
                    <label class="multiple-choice-option bg-gray-100 p-4 rounded-lg cursor-pointer hover:bg-gray-200 transition flex items-center shadow-md">
                        <input type="radio" name="multiple-choice" value="${option}" class="mr-3">
                        <span>${option}</span>
                    </label>
                `;
            });
            
            content += `
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                    <button id="skip-question" class="bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                        <i class="fas fa-forward mr-2"></i>Skip
                    </button>
                    <button id="submit-answer" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                        Submit<i class="fas fa-paper-plane ml-2"></i>
                    </button>
                </div>
            `;
        }
        // For test and time attack modes, provide answer input field
        else if (this.currentMode === 'test' || this.currentMode === 'time-attack' || this.currentMode === 'difficult') {
            content += this.getTextInputContent(answerLanguage, item);
        }
        
        // Add quit button for all modes
        content += `
            <div class="mt-6 text-center pt-4 border-t border-slate-200">
                <button id="quit-session" class="text-gray-500 hover:text-red-500 transition flex items-center justify-center mx-auto">
                    <i class="fas fa-times mr-1"></i>Quit Session
                </button>
            </div>
        `;
        
        // Set the content
        this.flashcardContainer.innerHTML = content;
        
        // Add event listeners for buttons
        this.addFlashcardEventListeners();
    }

    /**
     * Get text input content for test modes
     * @param {string} answerLanguage - The language of the answer
     * @param {object} item - The vocabulary item
     * @returns {string} HTML content
     */
    getTextInputContent(answerLanguage, item) {
        return `
            <div class="mb-6">
                <label for="answer-input" class="block text-xl mb-2">${answerLanguage === 'french' ? 'Français' : 'Deutsch'}</label>
                <input type="text" id="answer-input" class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent shadow-md" 
                    placeholder="Type your answer here..." autocomplete="off">
                ${item.tip ? `<div class="mt-2 text-sm text-gray-500"><i class="fas fa-lightbulb text-yellow-500 mr-1"></i>Hint: ${item.tip}</div>` : ''}
            </div>
            
            <div class="flex flex-col sm:flex-row justify-between gap-4">
                <button id="skip-question" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                    <i class="fas fa-forward mr-2"></i>Skip
                </button>
                <button id="submit-answer" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                    Submit<i class="fas fa-paper-plane ml-2"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * Check the user's answer for multiple choice questions
     */
    checkMultipleChoiceAnswer() {
        const selectedOption = document.querySelector('input[name="multiple-choice"]:checked');
        if (!selectedOption) {
            notificationManager.show('Please select an option', 'error');
            return;
        }
        
        const userAnswer = selectedOption.value;
        const item = this.currentItems[this.currentIndex];
        const direction = vocabularyManager.getDirection();
        const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
        const correctAnswer = item[answerLanguage];
        
        // Check if answer is correct
        const isCorrect = userAnswer === correctAnswer;
        
        // Record the answer
        this.recordAnswer(isCorrect, userAnswer);
        
        // Show feedback
        this.showMultipleChoiceFeedback(isCorrect, correctAnswer, item.tip);
    }
    
    /**
     * Start practice mode
     */
    startPracticeMode() {
        this.startMode('practice');
    }
    
    /**
     * Start test mode
     */
    startTestMode() {
        this.startMode('test');
    }
    
    /**
     * Start time attack mode
     */
    startTimeAttackMode() {
        this.startMode('time-attack');
    }
    
    /**
     * Start difficult words mode
     */
    startDifficultWordsMode() {
        this.startMode('difficult');
    }
    
    /**
     * Start multiple choice mode
     */
    startMultipleChoiceMode() {
        this.startMode('multiple-choice');
    }
    
    /**
     * Start spaced repetition mode
     */
    startSpacedRepetitionMode() {
        this.startMode('spaced-repetition');
    }
    
    /**
     * Start timer for time attack mode
     */
    startTimeAttackTimer() {
        let timeLeft = this.timeAttackTimeLimit;
        
        const updateTimer = () => {
            const timerElement = document.getElementById('time-attack-timer');
            if (timerElement) {
                timerElement.textContent = timeLeft;
                
                // Make timer red when time is running out
                if (timeLeft <= 10) {
                    timerElement.classList.add('text-red-500');
                    timerElement.classList.add('animate-pulse');
                }
            }
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(this.timeAttackTimer);
                this.endSession();
            }
        };
        
        // Update timer every second
        updateTimer();
        this.timeAttackTimer = setInterval(updateTimer, 1000);
    }
    
    /**
     * Display the current flashcard
     */
    displayCurrentFlashcard() {
        if (!this.currentItems.length) {
            this.showNoWordsMessage();
            return;
        }
        
        const item = this.currentItems[this.currentIndex];
        const direction = vocabularyManager.getDirection();
        
        let content = '';
        
        // Determine the question and answer based on the direction
        const questionLanguage = direction === 'french-to-german' ? 'french' : 'german';
        const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
        
        // Show card progress
        const progress = `<div class="text-sm text-gray-500 mb-4">
            Card ${this.currentIndex + 1} of ${this.currentItems.length}
        </div>`;
        
        // For time attack mode, show timer
        const timer = this.currentMode === 'time-attack' 
            ? `<div class="text-xl font-bold mb-4">Time: <span id="time-attack-timer">${this.timeAttackTimeLimit}</span>s</div>` 
            : '';
        
        // Show question
        content += `
            ${progress}
            ${timer}
            <div class="bg-gray-100 rounded-lg p-8 mb-6 shadow-inner-lg transform hover:scale-[1.01] transition-all">
                <h3 class="text-xl mb-2">${questionLanguage === 'french' ? 'Français' : 'Deutsch'}</h3>
                <p class="text-3xl font-bold">${item[questionLanguage]}</p>
                ${item.phonetic && questionLanguage === 'french' ? 
                    `<p class="phonetic text-gray-600 mt-2">[${item.phonetic}]</p>` : ''}
            </div>
        `;
        
        // For practice mode, provide option to show answer
        if (this.currentMode === 'practice') {
            if (!this.isShowingAnswer) {
                content += `
                    <div class="flex justify-center">
                        <button id="show-answer" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition shadow-md hover:shadow-lg">
                            <i class="fas fa-eye mr-2"></i>Show Answer
                        </button>
                    </div>
                `;
            } else {
                // Show answer area
                content += `
                    <div class="bg-gray-100 rounded-lg p-8 mb-6 shadow-inner-lg transform hover:scale-[1.01] transition-all">
                        <h3 class="text-xl mb-2">${answerLanguage === 'french' ? 'Français' : 'Deutsch'}</h3>
                        <p class="text-3xl font-bold">${item[answerLanguage]}</p>
                        ${item.phonetic && answerLanguage === 'french' ? 
                            `<p class="phonetic text-gray-600 mt-2">[${item.phonetic}]</p>` : ''}
                        ${item.tip ? `<div class="mt-4 p-3 bg-accent bg-opacity-20 rounded-md"><i class="fas fa-lightbulb text-accent mr-2"></i>${item.tip}</div>` : ''}
                    </div>
                    
                    <div class="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                        <button id="mark-difficult" class="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle mr-2"></i>Mark as Difficult
                        </button>
                        <div class="flex gap-2">
                            <button id="prev-card" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center" 
                                ${this.currentIndex === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                <i class="fas fa-arrow-left mr-2"></i>Previous
                            </button>
                            <button id="next-card" class="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center">
                                ${this.currentIndex === this.currentItems.length - 1 ? 'Finish' : 'Next'}<i class="fas fa-arrow-right ml-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        // For multiple choice mode, show options
        else if (this.currentMode === 'multiple-choice') {
            const correctAnswer = item[answerLanguage];
            
            // Get all other vocabulary items for wrong options
            const allOtherItems = vocabularyManager.getVocabularyItems()
                .filter(w => w[answerLanguage] !== correctAnswer)
                .map(w => w[answerLanguage]);
            
            // Randomly select 3 wrong answers from all possibilities
            const shuffledWrongAnswers = this.shuffleArray([...allOtherItems]).slice(0, 3);
            
            // Create options array with correct answer and wrong answers
            const options = this.shuffleArray([correctAnswer, ...shuffledWrongAnswers]);
            
            content += `
                <div class="mb-6">
                    <h3 class="text-xl mb-4">Select the correct ${answerLanguage === 'french' ? 'French' : 'German'} translation:</h3>
                    <div class="flex flex-col gap-3">
            `;
            
            options.forEach(option => {
                content += `
                    <label class="multiple-choice-option bg-gray-100 p-4 rounded-lg cursor-pointer hover:bg-gray-200 transition flex items-center shadow-md">
                        <input type="radio" name="multiple-choice" value="${option}" class="mr-3">
                        <span>${option}</span>
                    </label>
                `;
            });
            
            content += `
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                    <button id="skip-question" class="bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                        <i class="fas fa-forward mr-2"></i>Skip
                    </button>
                    <button id="submit-answer" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition shadow-md flex items-center justify-center">
                        Submit<i class="fas fa-paper-plane ml-2"></i>
                    </button>
                </div>
            `;
        }
        // For test and time attack modes, provide answer input field
        else if (this.currentMode === 'test' || this.currentMode === 'time-attack' || this.currentMode === 'difficult') {
            content += this.getTextInputContent(answerLanguage, item);
        }
        
        // Add quit button for all modes
        content += `
            <div class="mt-6 text-center pt-4 border-t border-slate-200">
                <button id="quit-session" class="text-gray-500 hover:text-red-500 transition flex items-center justify-center mx-auto">
                    <i class="fas fa-times mr-1"></i>Quit Session
                </button>
            </div>
        `;
        
        // Set the content
        this.flashcardContainer.innerHTML = content;
        
        // Add event listeners for buttons
        this.addFlashcardEventListeners();
    }

    /**
     * Check the user's answer for multiple choice questions
     */
    checkMultipleChoiceAnswer() {
        const selectedOption = document.querySelector('input[name="multiple-choice"]:checked');
        if (!selectedOption) {
            notificationManager.show('Please select an option', 'error');
            return;
        }
        
        const userAnswer = selectedOption.value;
        const item = this.currentItems[this.currentIndex];
        const direction = vocabularyManager.getDirection();
        const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
        const correctAnswer = item[answerLanguage];
        
        // Check if answer is correct
        const isCorrect = userAnswer === correctAnswer;
        
        // Record the answer
        this.recordAnswer(isCorrect, userAnswer);
        
        // Show feedback
        this.showMultipleChoiceFeedback(isCorrect, correctAnswer, item.tip);
    }
    
    /**
     * Add event listeners to the current flashcard
     */
    addFlashcardEventListeners() {
        // Show answer button (Practice mode)
        const showAnswerBtn = document.getElementById('show-answer');
        if (showAnswerBtn) {
            showAnswerBtn.addEventListener('click', () => {
                this.isShowingAnswer = true;
                this.displayCurrentFlashcard();
            });
        }
        
        // Next card button (Practice mode)
        const nextCardBtn = document.getElementById('next-card');
        if (nextCardBtn) {
            nextCardBtn.addEventListener('click', () => {
                this.isShowingAnswer = false;
                
                if (this.currentIndex === this.currentItems.length - 1) {
                    this.endSession();
                } else {
                    this.currentIndex++;
                    this.displayCurrentFlashcard();
                }
            });
        }
        
        // Previous card button (Practice mode)
        const prevCardBtn = document.getElementById('prev-card');
        if (prevCardBtn) {
            prevCardBtn.addEventListener('click', () => {
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                    this.isShowingAnswer = false;
                    this.displayCurrentFlashcard();
                }
            });
        }
        
        // Mark as difficult button
        const markDifficultBtn = document.getElementById('mark-difficult');
        if (markDifficultBtn) {
            markDifficultBtn.addEventListener('click', () => {
                const item = this.currentItems[this.currentIndex];
                vocabularyManager.markAsDifficult(item.french);
                
                // Show notification
                notificationManager.show('Word marked as difficult!');
                
                // Update button to show it was clicked
                markDifficultBtn.textContent = 'Marked as Difficult';
                markDifficultBtn.disabled = true;
                markDifficultBtn.classList.add('opacity-50');
            });
        }
        
        // Submit answer button
        const submitBtn = document.getElementById('submit-answer');
        if (submitBtn) {
            if (this.currentMode === 'multiple-choice') {
                submitBtn.addEventListener('click', () => this.checkMultipleChoiceAnswer());
            } else {
                submitBtn.addEventListener('click', () => this.checkAnswer());
                
                // Also allow pressing Enter to submit for text input
                const answerInput = document.getElementById('answer-input');
                if (answerInput) {
                    answerInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            this.checkAnswer();
                        }
                    });
                    
                    // Focus the input field
                    answerInput.focus();
                }
            }
        }
        
        // Add click event for multiple choice options to highlight selection
        const multipleChoiceOptions = document.querySelectorAll('.multiple-choice-option');
        multipleChoiceOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Check the radio button
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Remove active class from all options and add to the selected one
                multipleChoiceOptions.forEach(opt => opt.classList.remove('bg-primary', 'bg-opacity-20'));
                option.classList.add('bg-primary', 'bg-opacity-20');
            });
        });
        
        // Skip question button
        const skipBtn = document.getElementById('skip-question');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.recordAnswer(false, '');
                this.moveToNextQuestion();
            });
        }
        
        // Quit session button (All modes)
        const quitBtn = document.getElementById('quit-session');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                // For test modes, record stats before quitting
                if (this.currentMode === 'test' || this.currentMode === 'time-attack' || this.currentMode === 'multiple-choice') {
                    statsManager.endSession(this.testAnswers.filter(a => a.correct).length, this.testAnswers.length);
                }
                
                // Clear timer if in time attack mode
                if (this.timeAttackTimer) {
                    clearInterval(this.timeAttackTimer);
                    this.timeAttackTimer = null;
                }
                
                this.showModeSelection();
            });
        }
    }
    
    /**
     * Check the user's answer for text input
     */
    checkAnswer() {
        const answerInput = document.getElementById('answer-input');
        if (!answerInput) return;
        
        const userAnswer = answerInput.value.trim();
        if (!userAnswer) return; // Don't submit empty answers
        
        const item = this.currentItems[this.currentIndex];
        const direction = vocabularyManager.getDirection();
        
        // Determine which field to check against
        const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
        const correctAnswer = item[answerLanguage];
        
        // Simple equality check (could be enhanced with more sophisticated checks)
        const isCorrect = this.compareAnswers(userAnswer, correctAnswer);
        
        // Record the answer for stats
        this.recordAnswer(isCorrect, userAnswer);
        
        // Show immediate feedback
        this.showAnswerFeedback(isCorrect, correctAnswer, item.tip);
    }
    
    /**
     * Check the user's answer for multiple choice questions
     */
    checkMultipleChoiceAnswer() {
        const selectedOption = document.querySelector('input[name="multiple-choice"]:checked');
        if (!selectedOption) {
            notificationManager.show('Please select an option', 'error');
            return;
        }
        
        const userAnswer = selectedOption.value;
        const item = this.currentItems[this.currentIndex];
        const direction = vocabularyManager.getDirection();
        const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
        const correctAnswer = item[answerLanguage];
        
        // Check if answer is correct
        const isCorrect = userAnswer === correctAnswer;
        
        // Record the answer
        this.recordAnswer(isCorrect, userAnswer);
        
        // Show feedback
        this.showMultipleChoiceFeedback(isCorrect, correctAnswer, item.tip);
    }
    
    /**
     * Show feedback for multiple choice answers
     * @param {boolean} isCorrect - Whether the answer was correct
     * @param {string} correctAnswer - The correct answer
     * @param {string} tip - Optional tip to show
     */
    showMultipleChoiceFeedback(isCorrect, correctAnswer, tip) {
        const submitBtn = document.getElementById('submit-answer');
        const options = document.querySelectorAll('.multiple-choice-option');
        
        // Disable all radio buttons
        options.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            radio.disabled = true;
            option.classList.add('opacity-75');
            
            // Highlight the correct answer
            if (option.querySelector('span').textContent === correctAnswer) {
                option.classList.add('bg-green-200');
                option.classList.remove('bg-primary', 'bg-opacity-20');
            }
            
            // If selected and incorrect, highlight in red
            if (radio.checked && !isCorrect) {
                option.classList.add('bg-red-200');
                option.classList.remove('bg-primary', 'bg-opacity-20');
            }
        });
        
        if (isCorrect) {
            // Update button
            submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Correct!';
            submitBtn.classList.remove('bg-primary');
            submitBtn.classList.add('bg-green-500');
            
            // Show notification
            notificationManager.show('Correct! Well done!', 'success');
            
            // Award points for correct answer
            rewardsManager.addPoints(10);
        } else {
            // Update button
            submitBtn.innerHTML = 'Continue';
            
            // Add a feedback message
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'mt-4 p-3 bg-red-100 rounded-md';
            feedbackDiv.innerHTML = `
                <p class="text-red-600">Incorrect. The correct answer is: ${correctAnswer}</p>
                ${tip ? `<p class="mt-2 text-sm"><i class="fas fa-lightbulb mr-1 text-yellow-500"></i>${tip}</p>` : ''}
            `;
            
            submitBtn.parentNode.insertBefore(feedbackDiv, submitBtn);
            
            // Show notification
            notificationManager.show('Incorrect. Try to remember this one!', 'error');
        }
        
        // Update button to move to next question
        submitBtn.removeEventListener('click', () => this.checkMultipleChoiceAnswer());
        submitBtn.addEventListener('click', () => this.moveToNextQuestion());
        
        // Move to next question automatically after delay if correct
        if (isCorrect) {
            setTimeout(() => {
                this.moveToNextQuestion();
            }, 1500);
        }
    }
    
    /**
     * Compare user answer with correct answer
     * @param {string} userAnswer - The user's answer
     * @param {string} correctAnswer - The correct answer
     * @returns {boolean} - Whether the answer is correct
     */
    compareAnswers(userAnswer, correctAnswer) {
        // Make comparison case-insensitive and remove punctuation
        const normalizeAnswer = (answer) => {
            return answer.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
                .replace(/\s+/g, ' ').trim();
        };
        
        const normalizedUserAnswer = normalizeAnswer(userAnswer);
        const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
        
        // Check if answers match
        return normalizedUserAnswer === normalizedCorrectAnswer;
    }
    
    /**
     * Record the user's answer for statistics
     * @param {boolean} isCorrect - Whether the answer was correct
     * @param {string} userAnswer - The user's answer
     */
    recordAnswer(isCorrect, userAnswer) {
        const item = this.currentItems[this.currentIndex];
        
        this.testAnswers.push({
            word: item,
            userAnswer,
            correct: isCorrect
        });
        
        // Update spaced repetition data
        if (userAnswer !== '') { // Only update if the user actually attempted the word
            vocabularyManager.updateSpacedRepetition(item.french, isCorrect);
        }
        
        // If answer is incorrect, mark word as difficult
        if (!isCorrect && userAnswer !== '') {
            vocabularyManager.markAsDifficult(item.french);
        }
        
        // Update test stats if in a test mode
        if (this.currentMode === 'test' || this.currentMode === 'time-attack' || this.currentMode === 'multiple-choice') {
            const correct = this.testAnswers.filter(a => a.correct).length;
            const wrong = this.testAnswers.filter(a => !a.correct).length;
            this.updateTestStats(correct, wrong);
        }
    }
    
    /**
     * Show feedback for the user's answer
     * @param {boolean} isCorrect - Whether the answer was correct
     * @param {string} correctAnswer - The correct answer
     * @param {string} tip - Optional tip to show
     */
    showAnswerFeedback(isCorrect, correctAnswer, tip) {
        const answerInput = document.getElementById('answer-input');
        const submitBtn = document.getElementById('submit-answer');
        
        if (isCorrect) {
            // Visual indication of correct answer
            answerInput.classList.add('bg-green-100', 'border-green-500');
            answerInput.disabled = true;
            
            // Update button
            submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Correct!';
            submitBtn.classList.remove('bg-primary');
            submitBtn.classList.add('bg-green-500');
            
            // Show notification
            notificationManager.show('Correct! Well done!', 'success');
            
            // Award points for correct answer
            rewardsManager.addPoints(10);
            
            // Move to next question after a short delay
            setTimeout(() => {
                this.moveToNextQuestion();
            }, 1500);
        } else {
            // Visual indication of incorrect answer
            answerInput.classList.add('bg-red-100', 'border-red-500');
            
            // Show correct answer
            const item = this.currentItems[this.currentIndex];
            const answerArea = document.createElement('div');
            answerArea.className = 'mt-4 p-3 bg-red-100 rounded-md';
            answerArea.innerHTML = `
                <p class="text-red-600">Incorrect. The correct answer is:</p>
                <p class="font-bold mt-1">${correctAnswer}</p>
                ${tip ? `<p class="mt-2 text-sm"><i class="fas fa-lightbulb mr-1 text-yellow-500"></i>${tip}</p>` : ''}
            `;
            
            submitBtn.parentNode.insertBefore(answerArea, submitBtn);
            
            // Update button
            submitBtn.innerHTML = 'Continue';
            submitBtn.removeEventListener('click', () => this.checkAnswer());
            submitBtn.addEventListener('click', () => this.moveToNextQuestion());
            
            // Show notification
            notificationManager.show('Incorrect. Try to remember this one!', 'error');
        }
    }
    
    /**
     * Move to the next question or load more items if needed
     */
    moveToNextQuestion() {
        // Check if we're at the end of our current batch
        if (this.currentIndex === this.currentItems.length - 1) {
            // For all modes except time attack, load more items
            if (this.currentMode !== 'time-attack') {
                // Get more items based on the current mode
                let newItems = [];
                if (this.currentMode === 'difficult') {
                    newItems = vocabularyManager.getDifficultWords();
                } else if (this.currentMode === 'spaced-repetition') {
                    newItems = vocabularyManager.getSpacedRepetitionItems();
                } else {
                    // For other modes, get more random items we haven't seen
                    const remainingItems = vocabularyManager.getVocabularyItems().filter(item => !this.seenWords.has(item.french));
                    if (remainingItems.length > 0) {
                        // Shuffle remaining items
                        newItems = vocabularyManager.shuffleArray(remainingItems);
                    } else {
                        // If we've seen all words, reset and start over
                        this.seenWords.clear();
                        newItems = vocabularyManager.getVocabularyItems();
                    }
                }
                
                // Add new items and continue
                if (newItems.length > 0) {
                    newItems.forEach(item => this.seenWords.add(item.french));
                    this.currentItems = this.currentItems.concat(newItems);
                    this.currentIndex++;
                    this.isShowingAnswer = false;
                    this.displayCurrentFlashcard();
                }
            } else {
                // For time attack, end the session
                this.endSession();
            }
        } else {
            // Move to next card
            this.currentIndex++;
            this.isShowingAnswer = false;
            this.displayCurrentFlashcard();
        }
    }
    
    /**
     * End the current session and show results
     */
    endSession() {
        // Clear timer if in time attack mode
        if (this.timeAttackTimer) {
            clearInterval(this.timeAttackTimer);
            this.timeAttackTimer = null;
        }
        
        // Only show results if this was a test or time attack
        if (this.currentMode === 'test' || this.currentMode === 'time-attack') {
            const timeTaken = Math.round((new Date() - this.testStartTime) / 1000); // in seconds
            const correctAnswers = this.testAnswers.filter(a => a.correct).length;
            const totalAnswers = this.testAnswers.length;
            const percentage = Math.round((correctAnswers / totalAnswers) * 100) || 0;
            
            // Record stats
            statsManager.endSession(correctAnswers, totalAnswers);
            
            // Award points and possibly badges
            rewardsManager.addPoints(correctAnswers * 10);
            rewardsManager.checkForAchievements(correctAnswers, totalAnswers, percentage);
            
            // Prepare results content
            let content = '';
            
            // Results header and summary
            content += `
                <h2 class="text-2xl font-bold mb-6 text-center">${this.currentMode === 'time-attack' ? 'Time Attack' : 'Test'} Results</h2>
                
                <div class="grid grid-cols-2 gap-4 mb-8">
                    <div class="bg-gray-100 p-4 rounded-lg text-center">
                        <p class="text-3xl font-bold ${percentage >= 70 ? 'text-green-500' : percentage >= 40 ? 'text-yellow-500' : 'text-red-500'}">${percentage}%</p>
                        <p class="text-sm text-gray-600">Score</p>
                    </div>
                    <div class="bg-gray-100 p-4 rounded-lg text-center">
                        <p class="text-3xl font-bold text-primary">${correctAnswers}/${totalAnswers}</p>
                        <p class="text-sm text-gray-600">Correct Answers</p>
                    </div>
                    <div class="bg-gray-100 p-4 rounded-lg text-center">
                        <p class="text-3xl font-bold text-secondary">${timeTaken}s</p>
                        <p class="text-sm text-gray-600">Time Taken</p>
                    </div>
                    <div class="bg-gray-100 p-4 rounded-lg text-center">
                        <p class="text-3xl font-bold text-accent">+${correctAnswers * 10}</p>
                        <p class="text-sm text-gray-600">Points Earned</p>
                    </div>
                </div>
                
                <h3 class="text-xl font-bold mb-4">Review Your Answers:</h3>
                <div class="mb-8">
            `;
            
            // List all questions and answers
            this.testAnswers.forEach((answer, index) => {
                const direction = vocabularyManager.getDirection();
                const questionLanguage = direction === 'french-to-german' ? 'french' : 'german';
                const answerLanguage = direction === 'french-to-german' ? 'german' : 'french';
                
                content += `
                    <div class="border-b border-gray-200 py-4 ${answer.correct ? 'bg-green-50' : 'bg-red-50'} rounded-md px-4 mb-2">
                        <div class="flex justify-between">
                            <div>
                                <p class="font-bold">${index + 1}. ${answer.word[questionLanguage]}</p>
                                <p class="text-sm text-gray-600 mt-1">Your answer: ${answer.userAnswer || '(skipped)'}</p>
                                ${!answer.correct ? `<p class="text-sm font-medium mt-1">Correct answer: ${answer.word[answerLanguage]}</p>` : ''}
                            </div>
                            <div class="flex items-center">
                                ${answer.correct ? 
                                    '<span class="text-green-500"><i class="fas fa-check-circle"></i></span>' : 
                                    '<span class="text-red-500"><i class="fas fa-times-circle"></i></span>'
                                }
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Add buttons to return to menu or try again
            content += `
                </div>
                
                <div class="flex justify-center gap-4">
                    <button id="return-to-menu" class="bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition">
                        <i class="fas fa-home mr-2"></i>Return to Menu
                    </button>
                    <button id="try-again" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;
            
            // Show the results
            this.flashcardContainer.classList.add('hidden');
            this.resultsContainer.classList.remove('hidden');
            this.resultsContainer.innerHTML = content;
            
            // Add event listeners for the result buttons
            document.getElementById('return-to-menu').addEventListener('click', () => {
                this.showModeSelection();
            });
            
            document.getElementById('try-again').addEventListener('click', () => {
                this.startMode(this.currentMode);
            });
        } else {
            // For practice mode, just go back to the mode selection
            this.showModeSelection();
        }
    }
    
    /**
     * Show the mode selection screen
     */
    showModeSelection() {
        this.flashcardContainer.classList.add('hidden');
        this.resultsContainer.classList.add('hidden');
        
        // Show all UI elements
        this.studyBanner?.classList.remove('hidden');
        this.mainHeader?.classList.remove('hidden');
        this.languageSelection?.classList.remove('hidden');
        this.testStatsBanner?.classList.add('hidden');
        document.querySelectorAll('.bg-slate-50').forEach(container => {
            if (container.querySelector('h2')?.textContent.includes('Select Mode')) {
                container.classList.remove('hidden');
            }
        });

        // Hide back button
        this.backButton?.classList.add('hidden');
        
        // Reset test stats
        this.updateTestStats(0, 0);
        
        // Scroll to study modes
        document.querySelector('.study-modes')?.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Show message when no words are available
     */
    showNoWordsMessage() {
        this.flashcardContainer.innerHTML = `
            <div class="text-center py-10">
                <i class="fas fa-exclamation-circle text-4xl text-yellow-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">No Words Available</h3>
                <p class="text-gray-600 mb-6">There are no vocabulary words to display.</p>
                <button id="return-to-menu" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-80 transition">
                    <i class="fas fa-home mr-2"></i>Return to Menu
                </button>
            </div>
        `;
        
        document.getElementById('return-to-menu').addEventListener('click', () => {
            this.showModeSelection();
        });
    }
    
    /**
     * Fisher-Yates shuffle algorithm
     * @param {Array} array - The array to shuffle
     * @returns {Array} - The shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array]; // Create a copy to avoid modifying original
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled; // Return the shuffled array
    }
    
    /**
     * Update the test statistics display
     */
    updateTestStats(correct, wrong) {
        if (this.correctAnswersDisplay) {
            this.correctAnswersDisplay.textContent = correct;
        }
        if (this.wrongAnswersDisplay) {
            this.wrongAnswersDisplay.textContent = wrong;
        }
    }
}

// Create a global instance
const flashcardManager = new FlashcardManager();