/**
 * Main application file
 * Handles initialization and connects all components
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Load vocabulary data
    vocabularyManager.loadVocabulary()
        .then(words => {
            console.log(`Loaded ${words.length} vocabulary words`);
            
            // Show welcome notification
            setTimeout(() => {
                notificationManager.show('Welcome to French Vocabulary Flashcards!');
            }, 1000);
            
            // Make sure UI is set to the default language direction
            updateLanguageDirectionUI(vocabularyManager.getDirection());
            
            // Set up daily goals and progress
            setupDailyProgress();
        })
        .catch(error => {
            console.error('Error initializing app:', error);
            notificationManager.show('Error loading vocabulary data', 'error');
        });
        
    // Initialize event listeners not handled by the specific managers
    setupGlobalEventListeners();
    
    // Initialize dark mode
    initDarkMode();
    
    // Initialize audio pronunciation
    initAudioPronunciation();
    
    // Check for study reminders
    checkStudyReminders();
}

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
    // Language direction buttons
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const direction = e.currentTarget.id;
            updateLanguageDirectionUI(direction);
            vocabularyManager.setDirection(direction);
        });
    });
    
    // Multiple choice mode button
    const multipleChoiceBtn = document.getElementById('multiple-choice');
    if (multipleChoiceBtn) {
        multipleChoiceBtn.addEventListener('click', () => {
            flashcardManager.startMultipleChoiceMode();
        });
    }
    
    // Spaced repetition mode button
    const spacedRepetitionBtn = document.getElementById('spaced-repetition');
    if (spacedRepetitionBtn) {
        spacedRepetitionBtn.addEventListener('click', () => {
            flashcardManager.startSpacedRepetitionMode();
        });
    }
    
    // Word search functionality
    const searchBtn = document.getElementById('search-btn');
    const wordSearch = document.getElementById('word-search');
    if (searchBtn && wordSearch) {
        searchBtn.addEventListener('click', () => {
            const query = wordSearch.value.trim();
            if (query) {
                searchVocabulary(query);
            }
        });
        
        wordSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = wordSearch.value.trim();
                if (query) {
                    searchVocabulary(query);
                }
            }
        });
    }
    
    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // Study reminder toggle
    const reminderToggle = document.getElementById('reminder-toggle');
    if (reminderToggle) {
        reminderToggle.addEventListener('change', () => {
            toggleStudyReminders(reminderToggle.checked);
        });
        
        // Set initial state based on local storage
        reminderToggle.checked = localStorage.getItem('studyReminders') === 'true';
    }
    
    // Add mobile touch enhancements
    addMobileTouchEnhancements();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Update UI to reflect selected language direction
 */
function updateLanguageDirectionUI(direction) {
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'bg-secondary');
        btn.classList.add('bg-secondary');
    });
    
    const activeBtn = document.getElementById(direction);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-primary');
        activeBtn.classList.remove('bg-secondary');
    }
}

/**
 * Search vocabulary for matching words
 */
function searchVocabulary(query) {
    const results = vocabularyManager.searchVocabulary(query);
    
    if (results.length > 0) {
        flashcardManager.startSearchResultsMode(results);
    } else {
        notificationManager.show(`No words found matching "${query}"`, 'info');
    }
}

/**
 * Initialize dark mode
 */
function initDarkMode() {
    // Check for user preference in local storage
    const darkModeSetting = localStorage.getItem('darkMode');
    
    // Check for OS preference if no local storage setting
    if (darkModeSetting === null) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        }
    } else if (darkModeSetting === 'true') {
        document.documentElement.classList.add('dark');
    }
    
    // Update toggle button icon
    updateDarkModeToggle();
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDarkMode.toString());
    updateDarkModeToggle();
    
    // Show notification
    notificationManager.show(`Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`, 'info');
}

/**
 * Update dark mode toggle button appearance
 */
function updateDarkModeToggle() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const toggleBtn = document.getElementById('theme-toggle');
    
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            if (isDarkMode) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
}

/**
 * Initialize audio pronunciation feature
 */
function initAudioPronunciation() {
    const toggleBtn = document.getElementById('toggle-pronunciation');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isPronunciationEnabled = localStorage.getItem('pronunciationEnabled') !== 'false';
            localStorage.setItem('pronunciationEnabled', (!isPronunciationEnabled).toString());
            updatePronunciationButton(!isPronunciationEnabled);
            
            notificationManager.show(`Pronunciation ${!isPronunciationEnabled ? 'enabled' : 'disabled'}`, 'info');
        });
        
        // Set initial state
        const isPronunciationEnabled = localStorage.getItem('pronunciationEnabled') !== 'false';
        updatePronunciationButton(isPronunciationEnabled);
    }
}

/**
 * Update pronunciation button appearance
 */
function updatePronunciationButton(enabled) {
    const toggleBtn = document.getElementById('toggle-pronunciation');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            if (enabled) {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
                toggleBtn.classList.add('text-primary');
                toggleBtn.classList.remove('text-gray-400');
            } else {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute');
                toggleBtn.classList.remove('text-primary');
                toggleBtn.classList.add('text-gray-400');
            }
        }
    }
}

/**
 * Pronounce a French word using speech synthesis
 */
function pronounceWord(word) {
    if (localStorage.getItem('pronunciationEnabled') === 'false') {
        return;
    }
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Set up daily progress and goals
 */
function setupDailyProgress() {
    // Get today's date
    const today = new Date().toLocaleDateString();
    
    // Create or update daily tracking
    let dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
    
    if (!dailyStats[today]) {
        dailyStats[today] = {
            points: 0,
            wordsLearned: 0,
            timeSpent: 0,
            goalCompleted: false
        };
    }
    
    localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
    
    // Update UI
    updateDailyProgressUI();
    
    // Set a daily goal if not set already
    if (localStorage.getItem('dailyGoal') === null) {
        localStorage.setItem('dailyGoal', '20'); // Default goal: 20 points per day
    }
}

/**
 * Update daily progress UI
 */
function updateDailyProgressUI() {
    const today = new Date().toLocaleDateString();
    const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
    const todayStats = dailyStats[today] || { points: 0 };
    
    // Update streak display
    const streakCount = document.getElementById('streak-count');
    if (streakCount) {
        streakCount.textContent = statsManager.stats.currentStreak;
    }
    
    // Update points display
    const todayPoints = document.getElementById('today-points');
    if (todayPoints) {
        todayPoints.textContent = todayStats.points;
    }
    
    // Update progress bar
    const dailyGoal = parseInt(localStorage.getItem('dailyGoal') || '20', 10);
    const progressBar = document.getElementById('daily-goal-progress');
    if (progressBar) {
        const percentage = Math.min(100, Math.round((todayStats.points / dailyGoal) * 100));
        progressBar.style.width = `${percentage}%`;
        
        // Celebration if goal is reached today for the first time
        if (percentage >= 100 && !todayStats.goalCompleted) {
            celebrateDailyGoal();
            
            // Mark goal as completed for today
            todayStats.goalCompleted = true;
            dailyStats[today] = todayStats;
            localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
        }
    }
}

/**
 * Celebrate completing a daily goal
 */
function celebrateDailyGoal() {
    // Show celebration notification
    notificationManager.show('Daily goal reached! Keep up the good work!', 'success', 5000);
    
    // Create confetti effect
    createConfetti();
    
    // Add animation to the progress banner
    const progressBanner = document.querySelector('.bg-gradient-to-r');
    if (progressBanner) {
        progressBanner.classList.add('celebrate');
        setTimeout(() => {
            progressBanner.classList.remove('celebrate');
        }, 1000);
    }
}

/**
 * Create confetti animation
 */
function createConfetti() {
    const colors = ['#4F46E5', '#06B6D4', '#F59E0B', '#EC4899', '#10B981'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.setProperty('--confetti-color', colors[Math.floor(Math.random() * colors.length)]);
        
        document.body.appendChild(confetti);
        
        // Remove after animation completes
        setTimeout(() => {
            if (document.body.contains(confetti)) {
                document.body.removeChild(confetti);
            }
        }, 5000);
    }
}

/**
 * Add daily points
 * @param {number} points - Points to add to today's total
 */
function addDailyPoints(points) {
    const today = new Date().toLocaleDateString();
    const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
    
    if (!dailyStats[today]) {
        dailyStats[today] = { points: 0, wordsLearned: 0, timeSpent: 0 };
    }
    
    dailyStats[today].points += points;
    localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
    
    // Update UI
    updateDailyProgressUI();
}

/**
 * Toggle study reminders
 */
function toggleStudyReminders(enabled) {
    localStorage.setItem('studyReminders', enabled.toString());
    
    if (enabled) {
        // Set up notification permission if needed
        requestNotificationPermission();
        
        // Show notification
        notificationManager.show('Daily study reminders enabled', 'info');
    } else {
        notificationManager.show('Daily study reminders disabled', 'info');
    }
}

/**
 * Request notification permission
 */
function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
}

/**
 * Check for study reminders
 */
function checkStudyReminders() {
    if (localStorage.getItem('studyReminders') !== 'true') {
        return;
    }
    
    const lastReminder = localStorage.getItem('lastReminderDate');
    const today = new Date().toLocaleDateString();
    
    // Check if we already sent a reminder today
    if (lastReminder === today) {
        return;
    }
    
    // Check if the user has already studied today
    const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
    if (dailyStats[today] && dailyStats[today].points > 0) {
        return; // Already studied today
    }
    
    // Set a timeout to remind after a short delay (for demonstration)
    // In a real app, this would be based on time of day
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Time to study French!', {
                body: 'Keep your streak going and reach your daily goal.',
                icon: '/favicon.ico'
            });
            
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
        } else {
            notificationManager.show('Time to study! Keep your streak going.', 'info', 10000);
        }
        
        // Save that we sent a reminder today
        localStorage.setItem('lastReminderDate', today);
    }, 10000); // 10 seconds for demonstration
}

/**
 * Add touch enhancements for mobile devices
 */
function addMobileTouchEnhancements() {
    // Add touch feedback to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('touchstart', () => {
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('touchend', () => {
            btn.style.transform = 'scale(1)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 200);
        });
    });
    
    // Detect if device is mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        document.body.classList.add('mobile-device');
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Only handle shortcuts when not in an input field
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
    }
    
    switch (e.key) {
        case 'p':
        case 'P':
            // Practice mode
            if (document.getElementById('practice-mode') && 
                !document.getElementById('mode-selection').classList.contains('hidden')) {
                document.getElementById('practice-mode').click();
            }
            break;
            
        case 't':
        case 'T':
            // Test mode
            if (document.getElementById('test-mode') && 
                !document.getElementById('mode-selection').classList.contains('hidden')) {
                document.getElementById('test-mode').click();
            }
            break;
            
        case 'a':
        case 'A':
            // Time Attack mode
            if (document.getElementById('time-attack') && 
                !document.getElementById('mode-selection').classList.contains('hidden')) {
                document.getElementById('time-attack').click();
            }
            break;
            
        case 'd':
        case 'D':
            // Difficult words mode
            if (document.getElementById('difficult-words') && 
                !document.getElementById('mode-selection').classList.contains('hidden')) {
                document.getElementById('difficult-words').click();
            }
            break;
            
        case 'm':
        case 'M':
            // Multiple choice mode
            if (document.getElementById('multiple-choice') && 
                !document.getElementById('mode-selection').classList.contains('hidden')) {
                document.getElementById('multiple-choice').click();
            }
            break;
            
        case 'b':
        case 'B':
            // Spaced repetition mode
            if (document.getElementById('spaced-repetition') && 
                !document.getElementById('mode-selection').classList.contains('hidden')) {
                document.getElementById('spaced-repetition').click();
            }
            break;
            
        case 'k':
        case 'K':
            // Toggle dark mode
            document.getElementById('theme-toggle').click();
            break;
            
        case 'Escape':
            // Quit current session
            if (document.getElementById('quit-session')) {
                document.getElementById('quit-session').click();
            }
            break;
            
        case 'ArrowRight':
            // Next card in practice mode
            if (document.getElementById('next-card')) {
                document.getElementById('next-card').click();
            }
            break;
            
        case 'ArrowLeft':
            // Previous card in practice mode
            if (document.getElementById('prev-card')) {
                document.getElementById('prev-card').click();
            }
            break;
            
        case ' ':
            // Space to reveal answer in practice mode
            if (document.getElementById('show-answer')) {
                e.preventDefault(); // Prevent scrolling
                document.getElementById('show-answer').click();
            }
            break;
            
        case 'v':
        case 'V':
            // Toggle pronunciation
            document.getElementById('toggle-pronunciation').click();
            break;
            
        case '/':
            // Focus search box
            const searchBox = document.getElementById('word-search');
            if (searchBox && !document.getElementById('mode-selection').classList.contains('hidden')) {
                e.preventDefault();
                searchBox.focus();
            }
            break;
    }
}