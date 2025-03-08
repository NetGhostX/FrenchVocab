/**
 * RewardsManager
 * Handles rewards, points, and badges for the user
 */
class RewardsManager {
    constructor() {
        this.points = 0;
        this.badges = [];
        this.badgeDefinitions = [
            {
                id: 'first-session',
                name: 'First Steps',
                description: 'Complete your first learning session',
                icon: 'fa-solid fa-shoe-prints',
                color: 'bg-blue-500'
            },
            {
                id: 'perfect-score',
                name: 'Perfect Score',
                description: 'Get 100% in a test',
                icon: 'fa-solid fa-star',
                color: 'bg-yellow-500'
            },
            {
                id: 'streak-3',
                name: 'On Fire',
                description: 'Reach a 3-day streak',
                icon: 'fa-solid fa-fire',
                color: 'bg-red-500'
            },
            {
                id: 'streak-7',
                name: 'Unstoppable',
                description: 'Reach a 7-day streak',
                icon: 'fa-solid fa-trophy',
                color: 'bg-purple-500'
            },
            {
                id: 'time-attack',
                name: 'Speed Demon',
                description: 'Score over 80% in Time Attack mode',
                icon: 'fa-solid fa-bolt',
                color: 'bg-yellow-600'
            },
            {
                id: 'vocabulary-25',
                name: 'Vocabulary Builder',
                description: 'Learn 25% of the vocabulary',
                icon: 'fa-solid fa-book',
                color: 'bg-green-500'
            },
            {
                id: 'vocabulary-50',
                name: 'Word Master',
                description: 'Learn 50% of the vocabulary',
                icon: 'fa-solid fa-graduation-cap',
                color: 'bg-indigo-500'
            },
            {
                id: 'vocabulary-100',
                name: 'Language Expert',
                description: 'Learn 100% of the vocabulary',
                icon: 'fa-solid fa-crown',
                color: 'bg-amber-500'
            }
        ];
        
        // Load rewards data from local storage
        this.loadRewards();
    }
    
    /**
     * Load rewards data from local storage
     */
    loadRewards() {
        const savedPoints = localStorage.getItem('vocabPoints');
        if (savedPoints) {
            this.points = parseInt(savedPoints);
        }
        
        const savedBadges = localStorage.getItem('vocabBadges');
        if (savedBadges) {
            this.badges = JSON.parse(savedBadges);
        }
        
        this.updateRewardsDisplay();
    }
    
    /**
     * Save rewards data to local storage
     */
    saveRewards() {
        localStorage.setItem('vocabPoints', this.points.toString());
        localStorage.setItem('vocabBadges', JSON.stringify(this.badges));
        this.updateRewardsDisplay();
    }
    
    /**
     * Add points to user's total
     * @param {number} points - Points to add
     */
    addPoints(points) {
        this.points += points;
        this.saveRewards();
    }
    
    /**
     * Award a badge to the user
     * @param {string} badgeId - The ID of the badge to award
     */
    awardBadge(badgeId) {
        // Check if user already has this badge
        if (this.badges.includes(badgeId)) {
            return false;
        }
        
        // Add badge to user's collection
        this.badges.push(badgeId);
        this.saveRewards();
        
        // Find badge definition
        const badge = this.badgeDefinitions.find(b => b.id === badgeId);
        if (badge) {
            // Show notification
            notificationManager.show(`New Badge: ${badge.name}!`, 'success', 5000);
            
            // Add animation to badge in display
            const badgeElement = document.querySelector(`[data-badge-id="${badgeId}"]`);
            if (badgeElement) {
                badgeElement.classList.add('animate-bounce');
                setTimeout(() => {
                    badgeElement.classList.remove('animate-bounce');
                }, 3000);
            }
        }
        
        return true;
    }
    
    /**
     * Check for achievement milestones
     * @param {number} correct - Number of correct answers in session
     * @param {number} total - Total number of questions in session
     * @param {number} percentage - Percentage score
     */
    checkForAchievements(correct, total, percentage) {
        // First session badge
        if (statsManager.stats.totalSessions === 1) {
            this.awardBadge('first-session');
        }
        
        // Perfect score badge
        if (percentage === 100 && total >= 5) {
            this.awardBadge('perfect-score');
        }
        
        // Streak badges
        if (statsManager.stats.currentStreak >= 3) {
            this.awardBadge('streak-3');
        }
        if (statsManager.stats.currentStreak >= 7) {
            this.awardBadge('streak-7');
        }
        
        // Time attack badge
        if (flashcardManager.currentMode === 'time-attack' && percentage >= 80) {
            this.awardBadge('time-attack');
        }
        
        // Vocabulary progress badges
        const wordsLearned = statsManager.getUniqueWordsLearned();
        const totalVocab = vocabularyManager.vocabularyItems.length;
        const learnedPercentage = Math.round((wordsLearned / totalVocab) * 100);
        
        if (learnedPercentage >= 25) {
            this.awardBadge('vocabulary-25');
        }
        if (learnedPercentage >= 50) {
            this.awardBadge('vocabulary-50');
        }
        if (learnedPercentage >= 100) {
            this.awardBadge('vocabulary-100');
        }
    }
    
    /**
     * Update rewards display on the page
     */
    updateRewardsDisplay() {
        const badgesContainer = document.getElementById('badges-container');
        if (!badgesContainer) return;
        
        // Clear existing badges
        badgesContainer.innerHTML = '';
        
        // Add earned badges
        this.badges.forEach(badgeId => {
            const badge = this.badgeDefinitions.find(b => b.id === badgeId);
            if (badge) {
                const badgeElement = document.createElement('div');
                badgeElement.className = `relative group cursor-pointer ${badge.color} text-white rounded-lg p-3 flex items-center justify-center`;
                badgeElement.setAttribute('data-badge-id', badgeId);
                badgeElement.innerHTML = `<i class="${badge.icon} text-xl"></i>`;
                
                // Add tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'absolute bottom-full left-1/2 transform -translate-x-1/2 bg-dark text-white text-xs rounded py-1 px-2 mb-2 hidden group-hover:block w-32 text-center z-10';
                tooltip.innerHTML = `
                    <strong>${badge.name}</strong>
                    <p class="text-xs">${badge.description}</p>
                `;
                
                badgeElement.appendChild(tooltip);
                badgesContainer.appendChild(badgeElement);
            }
        });
        
        // Add placeholder badges
        const earnedCount = this.badges.length;
        const placeholdersToAdd = Math.min(6, this.badgeDefinitions.length - earnedCount);
        
        for (let i = 0; i < placeholdersToAdd; i++) {
            const placeholderElement = document.createElement('div');
            placeholderElement.className = 'bg-gray-200 text-gray-400 rounded-lg p-3 flex items-center justify-center';
            placeholderElement.innerHTML = '<i class="fas fa-question"></i>';
            badgesContainer.appendChild(placeholderElement);
        }
    }
}

/**
 * NotificationManager
 * Handles displaying notifications to the user
 */
class NotificationManager {
    constructor() {
        this.notificationElement = document.getElementById('notification');
        this.notificationMessage = document.getElementById('notification-message');
        this.timeout = null;
    }
    
    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - The type of notification ('success', 'error', or 'info')
     * @param {number} duration - How long to show the notification (in ms)
     */
    show(message, type = 'info', duration = 3000) {
        // Clear any existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        // Set the message
        this.notificationMessage.textContent = message;
        
        // Set the appropriate styling based on type
        this.notificationElement.className = 'fixed bottom-5 right-5 p-4 rounded-md shadow-lg transform transition-all duration-300 z-50';
        
        if (type === 'success') {
            this.notificationElement.classList.add('bg-green-500', 'text-white');
        } else if (type === 'error') {
            this.notificationElement.classList.add('bg-red-500', 'text-white');
        } else {
            this.notificationElement.classList.add('bg-dark', 'text-white');
        }
        
        // Show the notification
        this.notificationElement.classList.remove('translate-y-20', 'opacity-0');
        
        // Hide after duration
        this.timeout = setTimeout(() => {
            this.notificationElement.classList.add('translate-y-20', 'opacity-0');
        }, duration);
    }
}

// Create global instances
const rewardsManager = new RewardsManager();
const notificationManager = new NotificationManager();