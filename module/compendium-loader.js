/**
 * Compendium Data Loader and Manager
 * Handles loading, caching, and accessing compendium data
 */

let compendiumCache = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class CompendiumLoader {
  /**
   * Load compendium data with caching
   */
  static async loadCompendiumData() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (compendiumCache && (now - lastLoadTime) < CACHE_DURATION) {
      return compendiumCache;
    }
    
    try {
      const response = await fetch(`systems/${game.system.id}/data/compendium.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      compendiumCache = await response.json();
      lastLoadTime = now;
      
      console.log("CustomTTRPG | Compendium data loaded successfully");
      return compendiumCache;
    } catch (error) {
      console.error("CustomTTRPG | Failed to load compendium data:", error);
      ui.notifications.error("Failed to load compendium data");
      return {};
    }
  }
  
  /**
   * Get all categories from compendium
   */
  static async getCategories() {
    const data = await this.loadCompendiumData();
    return Object.keys(data).map(category => ({
      id: category,
      name: this._capitalize(category.replace(/_/g, ' ')),
      count: this._getCategoryCount(data[category])
    }));
  }
  
  /**
   * Get subcategories for a specific category
   */
  static async getSubcategories(category) {
    const data = await this.loadCompendiumData();
    const categoryData = data[category];
    
    if (!categoryData || typeof categoryData !== 'object') {
      return [];
    }
    
    return Object.keys(categoryData).map(subcategory => ({
      id: subcategory,
      name: this._capitalize(subcategory.replace(/_/g, ' ')),
      count: Object.keys(categoryData[subcategory] || {}).length
    }));
  }
  
  /**
   * Get items from a specific category and subcategory
   */
  static async getItems(category, subcategory, filters = {}) {
    const data = await this.loadCompendiumData();
    const categoryData = data[category];
    
    if (!categoryData || !categoryData[subcategory]) {
      return [];
    }
    
    let items = Object.entries(categoryData[subcategory]).map(([id, item]) => ({
      id,
      ...item,
      category,
      subcategory
    }));
    
    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.type?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.rarity && filters.rarity !== 'all') {
      items = items.filter(item => item.rarity === filters.rarity);
    }
    
    if (filters.level && filters.level !== 'all') {
      items = items.filter(item => item.level?.toString() === filters.level);
    }
    
    if (filters.type && filters.type !== 'all') {
      items = items.filter(item => item.type === filters.type);
    }
    
    return items;
  }
  
  /**
   * Get a specific item by ID
   */
  static async getItem(category, subcategory, itemId) {
    const data = await this.loadCompendiumData();
    const categoryData = data[category];
    
    if (!categoryData || !categoryData[subcategory] || !categoryData[subcategory][itemId]) {
      return null;
    }
    
    return {
      id: itemId,
      ...categoryData[subcategory][itemId],
      category,
      subcategory
    };
  }
  
  /**
   * Search across all categories
   */
  static async searchAll(searchTerm, filters = {}) {
    const data = await this.loadCompendiumData();
    const results = [];
    
    for (const [category, categoryData] of Object.entries(data)) {
      for (const [subcategory, subcategoryData] of Object.entries(categoryData)) {
        for (const [itemId, item] of Object.entries(subcategoryData)) {
          const searchLower = searchTerm.toLowerCase();
          if (item.name?.toLowerCase().includes(searchLower) ||
              item.description?.toLowerCase().includes(searchLower) ||
              item.type?.toLowerCase().includes(searchLower)) {
            
            const resultItem = {
              id: itemId,
              ...item,
              category,
              subcategory
            };
            
            // Apply additional filters
            let include = true;
            if (filters.rarity && filters.rarity !== 'all') {
              include = include && resultItem.rarity === filters.rarity;
            }
            if (filters.level && filters.level !== 'all') {
              include = include && resultItem.level?.toString() === filters.level;
            }
            if (filters.type && filters.type !== 'all') {
              include = include && resultItem.type === filters.type;
            }
            
            if (include) {
              results.push(resultItem);
            }
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Get available filter options
   */
  static async getFilterOptions() {
    const data = await this.loadCompendiumData();
    const rarities = new Set();
    const levels = new Set();
    const types = new Set();
    
    for (const categoryData of Object.values(data)) {
      for (const subcategoryData of Object.values(categoryData)) {
        for (const item of Object.values(subcategoryData)) {
          if (item.rarity) rarities.add(item.rarity);
          if (item.level) levels.add(item.level.toString());
          if (item.type) types.add(item.type);
        }
      }
    }
    
    return {
      rarities: ['all', ...Array.from(rarities).sort()],
      levels: ['all', ...Array.from(levels).sort((a, b) => parseInt(a) - parseInt(b))],
      types: ['all', ...Array.from(types).sort()]
    };
  }
  
  /**
   * Clear the cache
   */
  static clearCache() {
    compendiumCache = null;
    lastLoadTime = 0;
  }
  
  /**
   * Export compendium data
   */
  static async exportData() {
    const data = await this.loadCompendiumData();
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Import compendium data
   */
  static async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      compendiumCache = data;
      lastLoadTime = Date.now();
      console.log("CustomTTRPG | Compendium data imported successfully");
      return true;
    } catch (error) {
      console.error("CustomTTRPG | Failed to import compendium data:", error);
      return false;
    }
  }
  
  /**
   * Utility function to capitalize strings
   */
  static _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Get count of items in a category
   */
  static _getCategoryCount(categoryData) {
    if (!categoryData || typeof categoryData !== 'object') {
      return 0;
    }
    
    let count = 0;
    for (const subcategoryData of Object.values(categoryData)) {
      count += Object.keys(subcategoryData || {}).length;
    }
    return count;
  }
}
