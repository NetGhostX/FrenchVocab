/**
 * Vocabulary Manager
 * Handles loading, organizing, and retrieving vocabulary data
 */
class VocabularyManager {
    constructor() {
        this.vocabularyItems = [];
        this.direction = localStorage.getItem('direction') || 'french-to-german';
        this.sortMethod = localStorage.getItem('sortMethod') || 'default';
        this.spacedRepetitionData = {}; // Stores SRS data for each word
        this.lastReviewDate = null; // Last review session date
    }

    /**
     * Load vocabulary data from JSON file
     */
    async loadVocabulary() {
        try {
            const response = await fetch('data/vocabulary.json');
            if (!response.ok) {
                throw new Error('Failed to load vocabulary data');
            }
            
            this.vocabularyItems = await response.json();
            
            // Load spaced repetition data if exists
            this.loadSpacedRepetitionData();
            
            console.log('Vocabulary loaded successfully:', this.vocabularyItems.length, 'items');
            return this.vocabularyItems;
        } catch (error) {
            console.error('Error loading vocabulary:', error);
            throw error;
        }
    }

    /**
     * Get vocabulary items based on current direction
     */
    getVocabularyItems() {
        // Sort the items based on current sort method
        return this.sortVocabularyItems([...this.vocabularyItems]);
    }

    /**
     * Sort vocabulary items based on current sort method
     * @param {Array} items - Array of vocabulary items to sort
     */
    sortVocabularyItems(items) {
        switch (this.sortMethod) {
            case 'alphabetical':
                return items.sort((a, b) => {
                    const aText = this.direction === 'french-to-german' ? a.french : a.german;
                    const bText = this.direction === 'french-to-german' ? b.french : b.german;
                    return aText.localeCompare(bText);
                });
                
            case 'difficulty':
                return items.sort((a, b) => {
                    // Sort by difficulty level (hard first)
                    if (a.difficulty === b.difficulty) {
                        return 0;
                    }
                    return a.difficulty === 'hard' ? -1 : 1;
                });
                
            case 'recently-learned':
                // Sort by last review date from spaced repetition data
                return items.sort((a, b) => {
                    const aData = this.spacedRepetitionData[a.french] || { lastReview: 0 };
                    const bData = this.spacedRepetitionData[b.french] || { lastReview: 0 };
                    return bData.lastReview - aData.lastReview;
                });
                
            case 'spaced-repetition':
                // Sort by words due for review first
                return this.getSRSDueItems();
                
            default:
                return items; // Default order as in original data
        }
    }

    /**
     * Get a random set of vocabulary items
     * @param {number} count - Number of items to retrieve
     */
    getRandomItems(count = 10) {
        // Create a copy of the array to avoid modifying the original
        const itemsCopy = [...this.vocabularyItems];
        
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = itemsCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itemsCopy[i], itemsCopy[j]] = [itemsCopy[j], itemsCopy[i]];
        }
        
        // Return the requested number of items or all if count is larger
        return itemsCopy.slice(0, Math.min(count, itemsCopy.length));
    }

    /**
     * Set the learning direction
     * @param {string} direction - 'french-to-german' or 'german-to-french'
     */
    setDirection(direction) {
        if (direction === 'french-to-german' || direction === 'german-to-french') {
            this.direction = direction;
            localStorage.setItem('direction', direction);
        }
    }

    /**
     * Get the current learning direction
     */
    getDirection() {
        return this.direction;
    }

    /**
     * Set the sorting method
     * @param {string} method - Sorting method name
     */
    setSortMethod(method) {
        this.sortMethod = method;
        localStorage.setItem('sortMethod', method);
    }

    /**
     * Search vocabulary for matching words
     * @param {string} query - The search query
     * @returns {Array} - Matching vocabulary items
     */
    searchVocabulary(query) {
        if (!query) return [];
        
        query = query.toLowerCase();
        
        return this.vocabularyItems.filter(item => {
            // Search in both French and German words
            return (
                item.french.toLowerCase().includes(query) ||
                item.german.toLowerCase().includes(query) ||
                (item.tip && item.tip.toLowerCase().includes(query))
            );
        });
    }

    /**
     * Get difficult vocabulary items
     * @param {number} count - Maximum number of items to return
     */
    getDifficultItems(count = 10) {
        // Filter for items marked as hard or with low success rate in SRS
        const difficultItems = this.vocabularyItems.filter(item => {
            // Check if item is marked as hard
            if (item.difficulty === 'hard') return true;
            
            // Check if item has low success rate in spaced repetition
            const srsData = this.spacedRepetitionData[item.french];
            if (srsData && srsData.successRate < 0.6 && srsData.reviews > 2) {
                return true;
            }
            
            return false;
        });
        
        // Shuffle the difficult items
        return this.shuffleArray(difficultItems).slice(0, Math.min(count, difficultItems.length));
    }

    /**
     * Alias for getDifficultItems for backward compatibility
     */
    getDifficultWords(count = 10) {
        return this.getDifficultItems(count);
    }

    /**
     * Fisher-Yates shuffle algorithm
     * @param {Array} array - The array to shuffle
     * @returns {Array} - The shuffled array
     */
    shuffleArray(array) {
        const arrayCopy = [...array];
        for (let i = arrayCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
        }
        return arrayCopy;
    }

    /**
     * Initialize spaced repetition data for a word
     * @param {string} word - The French word to initialize
     */
    initializeSpacedRepetition(word) {
        if (!this.spacedRepetitionData[word]) {
            this.spacedRepetitionData[word] = {
                interval: 1, // Days until next review
                ease: 2.5, // Ease factor
                reviews: 0, // Number of times reviewed
                lastReview: Date.now(), // Timestamp of last review
                nextReview: Date.now() + 86400000, // Next review time (24 hours later)
                successRate: 1.0, // Success rate for this word
                history: [] // Review history
            };
        }
    }

    /**
     * Update spaced repetition data for a word based on user performance
     * @param {string} word - The French word
     * @param {boolean} wasCorrect - Whether user got the word correct
     */
    updateSpacedRepetition(word, wasCorrect) {
        // Initialize if not exists
        if (!this.spacedRepetitionData[word]) {
            this.initializeSpacedRepetition(word);
        }
        
        const data = this.spacedRepetitionData[word];
        data.reviews++;
        
        // Calculate new success rate
        const allReviews = data.history.length;
        const successfulReviews = data.history.filter(h => h.wasCorrect).length;
        data.successRate = allReviews > 0 ? (successfulReviews / allReviews) : (wasCorrect ? 1.0 : 0.0);
        
        // Update interval based on SuperMemo SM-2 algorithm
        if (wasCorrect) {
            if (data.reviews === 1) {
                data.interval = 1;
            } else if (data.reviews === 2) {
                data.interval = 6;
            } else {
                data.interval = Math.round(data.interval * data.ease);
            }
            
            // Adjust ease factor
            data.ease = Math.max(1.3, data.ease + 0.1);
        } else {
            // Reset interval on failure
            data.interval = 1;
            
            // Decrease ease factor
            data.ease = Math.max(1.3, data.ease - 0.2);
        }
        
        // Update timestamps
        data.lastReview = Date.now();
        data.nextReview = Date.now() + (data.interval * 86400000); // interval in days
        
        // Add to history
        data.history.push({
            timestamp: Date.now(),
            wasCorrect: wasCorrect,
            interval: data.interval
        });
        
        // Limit history to last 50 reviews to keep storage manageable
        if (data.history.length > 50) {
            data.history = data.history.slice(data.history.length - 50);
        }
        
        // Save the updated data
        this.saveSpacedRepetitionData();
        
        return data;
    }

    /**
     * Get items that are due for review in spaced repetition
     * @param {number} count - Maximum number of items to return
     */
    getSRSDueItems(count = 10) {
        const now = Date.now();
        const dueItems = [];
        
        // First get items that are overdue for review
        for (const word in this.spacedRepetitionData) {
            const data = this.spacedRepetitionData[word];
            if (data.nextReview <= now) {
                const item = this.vocabularyItems.find(i => i.french === word);
                if (item) {
                    dueItems.push(item);
                }
            }
        }
        
        // If we don't have enough overdue items, add new items that haven't been studied
        if (dueItems.length < count) {
            const newItems = this.vocabularyItems.filter(item => {
                return !this.spacedRepetitionData[item.french];
            });
            
            // Shuffle and add new items
            const shuffledNewItems = this.shuffleArray(newItems);
            dueItems.push(...shuffledNewItems.slice(0, count - dueItems.length));
        }
        
        // Return shuffled due items
        return this.shuffleArray(dueItems).slice(0, count);
    }

    /**
     * Save spaced repetition data to local storage
     */
    saveSpacedRepetitionData() {
        localStorage.setItem('spacedRepetitionData', JSON.stringify(this.spacedRepetitionData));
        this.lastReviewDate = new Date().toLocaleDateString();
        localStorage.setItem('lastReviewDate', this.lastReviewDate);
    }

    /**
     * Load spaced repetition data from local storage
     */
    loadSpacedRepetitionData() {
        const savedData = localStorage.getItem('spacedRepetitionData');
        if (savedData) {
            this.spacedRepetitionData = JSON.parse(savedData);
        }
        
        this.lastReviewDate = localStorage.getItem('lastReviewDate');
    }

    /**
     * Get statistics about learning progress
     */
    getLearningStatistics() {
        const totalWords = this.vocabularyItems.length;
        const studiedWords = Object.keys(this.spacedRepetitionData).length;
        
        // Calculate average success rate
        let totalSuccessRate = 0;
        let wordsWithReviews = 0;
        
        for (const word in this.spacedRepetitionData) {
            const data = this.spacedRepetitionData[word];
            if (data.reviews > 0) {
                totalSuccessRate += data.successRate;
                wordsWithReviews++;
            }
        }
        
        const avgSuccessRate = wordsWithReviews > 0 ? totalSuccessRate / wordsWithReviews : 0;
        
        return {
            totalWords,
            studiedWords,
            progress: Math.round((studiedWords / totalWords) * 100),
            avgSuccessRate: Math.round(avgSuccessRate * 100),
            lastReviewDate: this.lastReviewDate
        };
    }

    /**
     * Mark a word as learned
     * @param {string} word - The French word to mark as learned
     */
    markWordAsLearned(word) {
        // If the word has no SRS data yet, initialize it
        if (!this.spacedRepetitionData[word]) {
            this.initializeSpacedRepetition(word);
            this.saveSpacedRepetitionData();
        }
        
        // Also notify stats manager to track this
        if (statsManager) {
            statsManager.markWordAsLearned(word);
        }
    }

    /**
     * Mark a word as difficult
     * @param {string} word - The French word to mark as difficult
     */
    markAsDifficult(word) {
        const item = this.vocabularyItems.find(i => i.french === word);
        if (item) {
            item.difficulty = 'hard';
            
            // Also adjust spaced repetition data to review this word more frequently
            if (this.spacedRepetitionData[word]) {
                const data = this.spacedRepetitionData[word];
                data.interval = Math.max(1, Math.floor(data.interval / 2)); // Halve the interval
                data.ease = Math.max(1.3, data.ease - 0.1); // Make it slightly harder
                data.nextReview = Date.now() + (data.interval * 86400000); // Update next review
                this.saveSpacedRepetitionData();
            } else {
                // If no SRS data exists, initialize it with shorter intervals
                this.initializeSpacedRepetition(word);
                const data = this.spacedRepetitionData[word];
                data.interval = 1;
                data.ease = 1.5; // Start with lower ease factor
                this.saveSpacedRepetitionData();
            }
        }
    }

    /**
     * Reset all vocabulary learning progress
     */
    resetProgress() {
        this.spacedRepetitionData = {};
        localStorage.removeItem('spacedRepetitionData');
        localStorage.removeItem('lastReviewDate');
        this.lastReviewDate = null;
        
        // Show confirmation
        notificationManager.show('All vocabulary progress has been reset', 'info');
    }
}

// Create global instance
const vocabularyManager = new VocabularyManager();

// Load vocabulary when the page loads
document.addEventListener('DOMContentLoaded', () => {
    vocabularyManager.loadVocabulary()
        .catch(error => {
            console.error('Failed to load vocabulary:', error);
            notificationManager.show('Failed to load vocabulary data', 'error');
        });
});