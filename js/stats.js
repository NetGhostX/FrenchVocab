/**
 * StatsManager
 * Handles tracking and displaying user statistics
 */
class StatsManager {
    constructor() {
        this.stats = {
            totalSessions: 0,
            totalCorrect: 0,
            totalAnswered: 0,
            totalTimeSecs: 0,
            currentStreak: 0,
            bestStreak: 0,
            wordsLearned: {},
            lastSessionDate: null
        };
        
        this.sessionStartTime = null;
        
        // Load stats from local storage
        this.loadStats();
    }
    
    /**
     * Load stats from local storage
     */
    loadStats() {
        const savedStats = localStorage.getItem('vocabStats');
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
        }
        this.updateStatsDisplay();
    }
    
    /**
     * Save stats to local storage
     */
    saveStats() {
        localStorage.setItem('vocabStats', JSON.stringify(this.stats));
        this.updateStatsDisplay();
    }
    
    /**
     * Start a new learning session
     */
    startSession() {
        this.sessionStartTime = new Date();
        
        // Check if this is a new day - reset streak if needed
        const today = new Date().toLocaleDateString();
        if (this.stats.lastSessionDate && this.stats.lastSessionDate !== today) {
            const lastDate = new Date(this.stats.lastSessionDate);
            const daysSinceLastSession = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            
            // If more than 1 day has passed, reset streak
            if (daysSinceLastSession > 1) {
                this.stats.currentStreak = 0;
            }
        }
        
        this.stats.lastSessionDate = today;
        this.saveStats();
    }
    
    /**
     * End a learning session
     * @param {number} correct - Number of correct answers
     * @param {number} total - Total number of questions
     */
    endSession(correct, total) {
        if (!this.sessionStartTime) return;
        
        // Calculate time spent
        const sessionTime = Math.round((new Date() - this.sessionStartTime) / 1000);
        
        // Update stats
        this.stats.totalSessions++;
        this.stats.totalCorrect += correct;
        this.stats.totalAnswered += total;
        this.stats.totalTimeSecs += sessionTime;
        
        // Update streak
        if (correct / total >= 0.6) { // At least 60% correct to count for streak
            this.stats.currentStreak++;
            if (this.stats.currentStreak > this.stats.bestStreak) {
                this.stats.bestStreak = this.stats.currentStreak;
            }
        } else if (correct === 0) {
            // Reset streak if all wrong
            this.stats.currentStreak = 0;
        }
        
        // Save updated stats
        this.saveStats();
        this.sessionStartTime = null;
    }
    
    /**
     * Mark a word as learned
     * @param {string} word - The word that was learned
     */
    markWordAsLearned(word) {
        if (!this.stats.wordsLearned[word]) {
            this.stats.wordsLearned[word] = 0;
        }
        this.stats.wordsLearned[word]++;
        this.saveStats();
    }
    
    /**
     * Get the count of unique words learned
     */
    getUniqueWordsLearned() {
        return Object.keys(this.stats.wordsLearned).length;
    }
    
    /**
     * Get user's accuracy rate
     */
    getAccuracy() {
        if (this.stats.totalAnswered === 0) return 0;
        return Math.round((this.stats.totalCorrect / this.stats.totalAnswered) * 100);
    }
    
    /**
     * Get formatted time spent
     */
    getFormattedTimeSpent() {
        const mins = Math.floor(this.stats.totalTimeSecs / 60);
        if (mins < 60) {
            return `${mins}m`;
        } else {
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return `${hours}h ${remainingMins}m`;
        }
    }
    
    /**
     * Update stats display on the page
     */
    updateStatsDisplay() {
        // Update accuracy
        const accuracyEl = document.getElementById('accuracy');
        if (accuracyEl) {
            accuracyEl.textContent = `${this.getAccuracy()}%`;
        }
        
        // Update streak
        const streakEl = document.getElementById('current-streak');
        if (streakEl) {
            streakEl.textContent = this.stats.currentStreak;
        }
        
        // Update total correct
        const correctEl = document.getElementById('total-correct');
        if (correctEl) {
            correctEl.textContent = this.stats.totalCorrect;
        }
        
        // Update time spent
        const timeEl = document.getElementById('time-spent');
        if (timeEl) {
            timeEl.textContent = this.getFormattedTimeSpent();
        }
        
        // Update words learned
        const wordsLearnedEl = document.getElementById('words-learned');
        if (wordsLearnedEl) {
            const totalVocab = vocabularyManager.vocabularyItems.length;
            wordsLearnedEl.textContent = `${this.getUniqueWordsLearned()}/${totalVocab}`;
            
            // Update progress bar
            const progressBar = document.getElementById('progress-bar');
            if (progressBar && totalVocab > 0) {
                const percentage = Math.min(100, Math.round((this.getUniqueWordsLearned() / totalVocab) * 100));
                progressBar.style.width = `${percentage}%`;
            }
        }
    }
    
    /**
     * Reset all stats
     */
    resetStats() {
        this.stats = {
            totalSessions: 0,
            totalCorrect: 0,
            totalAnswered: 0,
            totalTimeSecs: 0,
            currentStreak: 0,
            bestStreak: 0,
            wordsLearned: {},
            lastSessionDate: null
        };
        this.saveStats();
    }
}

// Create global instance
const statsManager = new StatsManager();