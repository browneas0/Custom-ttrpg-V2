/**
 * Compendium Data Loader and Manager
 * Handles loading, caching, and accessing compendium data
 */

let compendiumCache = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class CompendiumLoader {
  /** Normalize rarity values to system taxonomy */
  static _normalizeRarity(raw) {
    if (!raw) return 'simple';
    const r = String(raw).toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    if (r === 'very-rare' || r === 'veryrare' || r === 'very_rare') return 'epic';
    if (r === 'uncommon') return 'un-common';
    return r;
  }

  /** Apply normalization and quick action metadata to an item */
  static _normalizeItem(category, subcategory, id, item) {
    const copy = { id, category, subcategory, ...item };
    if (copy.rarity) copy.rarity = this._normalizeRarity(copy.rarity);
    // Infer action metadata used by HUD flow
    if (copy.rangeFeet == null) {
      const rangeStr = copy.range || copy.Range || '';
      if (String(rangeStr).toLowerCase().includes('touch')) copy.rangeFeet = 5;
      else {
        const m = String(rangeStr).toLowerCase().match(/(\d+)(?:\s*\/\s*(\d+))?\s*(ft|feet)/);
        copy.rangeFeet = m ? parseInt(m[1], 10) : 0;
      }
    }
    if (copy.requiresAttack == null) {
      copy.requiresAttack = !copy.save && (copy.type === 'weapon' || copy.category === 'items');
    }
    return copy;
  }
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
      count: this._countItemsRecursive(categoryData[subcategory])
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
    
    let items = this._flattenItems(category, subcategory, categoryData[subcategory]);
    
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
      items = items.filter(item => (this._normalizeRarity(item.rarity) === filters.rarity));
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
    
    if (!categoryData) return null;
    // If subcategory provided and direct hit
    if (subcategory && categoryData[subcategory] && categoryData[subcategory][itemId]) {
      return this._normalizeItem(category, subcategory, itemId, categoryData[subcategory][itemId]);
    }
    // Recursive search within category
    const found = this._findItemRecursive(categoryData, itemId, subcategory);
    if (!found) return null;
    return this._normalizeItem(category, found.subcategory, itemId, found.item);
  }
  
  /**
   * Search across all categories
   */
  static async searchAll(searchTerm, filters = {}) {
    const data = await this.loadCompendiumData();
    const results = [];
    
    for (const [category, categoryData] of Object.entries(data)) {
      const flat = this._flattenAll(category, categoryData);
      const searchLower = searchTerm.toLowerCase();
      for (const it of flat) {
        if (it.name?.toLowerCase().includes(searchLower) || it.description?.toLowerCase().includes(searchLower) || it.type?.toLowerCase().includes(searchLower)) {
          let include = true;
          if (filters.rarity && filters.rarity !== 'all') include = include && (this._normalizeRarity(it.rarity) === filters.rarity);
          if (filters.level && filters.level !== 'all') include = include && it.level?.toString() === filters.level;
          if (filters.type && filters.type !== 'all') include = include && it.type === filters.type;
          if (include) results.push(it);
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
    
    for (const [category, categoryData] of Object.entries(data)) {
      const flat = this._flattenAll(category, categoryData);
      for (const item of flat) {
        if (item.rarity) rarities.add(this._normalizeRarity(item.rarity));
        if (item.level) levels.add(String(item.level));
        if (item.type) types.add(item.type);
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
    
    return this._countItemsRecursive(categoryData);
  }

  /** Recursively count leaf items under a node */
  static _countItemsRecursive(node) {
    if (!node || typeof node !== 'object') return 0;
    // If values look like items (object with name or type), count them
    const values = Object.values(node);
    const looksLikeItems = values.every(v => v && typeof v === 'object' && (v.name || v.type));
    if (looksLikeItems) return values.length;
    // Else, recurse
    return values.reduce((sum, v) => sum + this._countItemsRecursive(v), 0);
  }

  /** Flatten a subcategory possibly with nested groups into item array */
  static _flattenItems(category, subcategory, node, path = []) {
    if (!node || typeof node !== 'object') return [];
    const out = [];
    const entries = Object.entries(node);
    const looksLikeItems = entries.every(([_, v]) => v && typeof v === 'object' && (v.name || v.type));
    if (looksLikeItems) {
      for (const [id, item] of entries) out.push(this._normalizeItem(category, subcategory, id, item));
      return out;
    }
    for (const [key, child] of entries) {
      out.push(...this._flattenItems(category, subcategory, child, [...path, key]));
    }
    return out;
  }

  /** Flatten all items for a category across all subcategories and nested groups */
  static _flattenAll(category, categoryData) {
    const all = [];
    for (const [subcat, node] of Object.entries(categoryData)) {
      all.push(...this._flattenItems(category, subcat, node));
    }
    return all;
  }

  /** Find item by id recursively; if startSubcat provided, prefer it */
  static _findItemRecursive(categoryNode, itemId, startSubcat) {
    const entries = Object.entries(categoryNode);
    const scan = (node, subcat) => {
      if (!node || typeof node !== 'object') return null;
      if (node[itemId] && (node[itemId].name || node[itemId].type)) {
        return { subcategory: subcat, item: node[itemId] };
      }
      for (const [k, v] of Object.entries(node)) {
        if (!v || typeof v !== 'object') continue;
        const found = scan(v, subcat ?? k);
        if (found) return found;
      }
      return null;
    };
    if (startSubcat && categoryNode[startSubcat]) {
      const hit = scan(categoryNode[startSubcat], startSubcat);
      if (hit) return hit;
    }
    for (const [subcat, node] of entries) {
      const found = scan(node, subcat);
      if (found) return found;
    }
    return null;
  }

  /** Get item by dotted key: category[.subgroups].id */
  static async getByKey(key) {
    const parts = String(key).split('.').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const category = parts[0];
    const itemId = parts[parts.length - 1];
    const maybeSubcat = parts.length > 2 ? parts[1] : null;
    return await this.getItem(category, maybeSubcat, itemId);
  }
}
