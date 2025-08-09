/**
 * Resource Tracking System for Custom TTRPG V2
 * Handles spell slots, abilities, consumables, and other limited-use resources
 */

export class ResourceTracker {
  static resources = new Map();
  static trackers = new Map();
  static history = [];

  /**
   * Initialize the resource tracking system
   */
  static initialize() {
    this.registerDefaultResources();
    this.setupEventListeners();
    console.log("Resource Tracker | Initialized successfully");
  }

  /**
   * Register default resource types
   */
  static registerDefaultResources() {
    // Spell slots
    this.registerResourceType('spellSlots', {
      name: 'Spell Slots',
      category: 'magic',
      icon: 'fas fa-magic',
      description: 'Daily spell casting slots',
      resetOn: 'longRest',
      levels: {
        1: { name: '1st Level', max: 4 },
        2: { name: '2nd Level', max: 3 },
        3: { name: '3rd Level', max: 3 },
        4: { name: '4th Level', max: 3 },
        5: { name: '5th Level', max: 2 },
        6: { name: '6th Level', max: 1 },
        7: { name: '7th Level', max: 1 },
        8: { name: '8th Level', max: 1 },
        9: { name: '9th Level', max: 1 }
      }
    });

    // Class abilities
    this.registerResourceType('classAbilities', {
      name: 'Class Abilities',
      category: 'abilities',
      icon: 'fas fa-fist-raised',
      description: 'Limited-use class features',
      resetOn: 'longRest',
      abilities: {
        rage: { name: 'Rage', max: 3, resetOn: 'longRest' },
        kiPoints: { name: 'Ki Points', max: 5, resetOn: 'shortRest' },
        bardic: { name: 'Bardic Inspiration', max: 3, resetOn: 'shortRest' },
        channel: { name: 'Channel Divinity', max: 1, resetOn: 'shortRest' },
        wildShape: { name: 'Wild Shape', max: 2, resetOn: 'shortRest' }
      }
    });

    // Consumables
    this.registerResourceType('consumables', {
      name: 'Consumables',
      category: 'items',
      icon: 'fas fa-flask',
      description: 'Potions, scrolls, and other consumable items',
      resetOn: 'never',
      trackIndividually: true
    });

    // Ammunition
    this.registerResourceType('ammunition', {
      name: 'Ammunition',
      category: 'equipment',
      icon: 'fas fa-crosshairs',
      description: 'Arrows, bolts, bullets, etc.',
      resetOn: 'never',
      trackByType: true,
      types: {
        arrows: { name: 'Arrows', max: 60 },
        bolts: { name: 'Crossbow Bolts', max: 40 },
        bullets: { name: 'Sling Bullets', max: 40 },
        darts: { name: 'Darts', max: 20 }
      }
    });

    // Hit Dice
    this.registerResourceType('hitDice', {
      name: 'Hit Dice',
      category: 'recovery',
      icon: 'fas fa-dice-d6',
      description: 'Used for healing during short rests',
      resetOn: 'longRest',
      resetPercent: 0.5, // Half on long rest
      levelBased: true
    });

    // Daily powers
    this.registerResourceType('dailyPowers', {
      name: 'Daily Powers',
      category: 'abilities',
      icon: 'fas fa-star',
      description: 'Once-per-day abilities and powers',
      resetOn: 'longRest'
    });

    // Short rest abilities
    this.registerResourceType('shortRestAbilities', {
      name: 'Short Rest Abilities',
      category: 'abilities',
      icon: 'fas fa-hourglass-half',
      description: 'Abilities that recharge on short rest',
      resetOn: 'shortRest'
    });
  }

  /**
   * Register a resource type
   */
  static registerResourceType(id, config) {
    this.resources.set(id, {
      id,
      name: config.name,
      category: config.category || 'misc',
      icon: config.icon || 'fas fa-circle',
      description: config.description || '',
      resetOn: config.resetOn || 'longRest',
      resetPercent: config.resetPercent || 1.0,
      trackIndividually: config.trackIndividually || false,
      trackByType: config.trackByType || false,
      levelBased: config.levelBased || false,
      levels: config.levels || {},
      abilities: config.abilities || {},
      types: config.types || {}
    });
  }

  /**
   * Setup event listeners
   */
  static setupEventListeners() {
    // Track resource usage
    Hooks.on('updateActor', (actor, updateData) => {
      this.trackResourceChanges(actor, updateData);
    });

    // Rest events
    Hooks.on('shortRest', (actor) => {
      this.processRest(actor, 'shortRest');
    });

    Hooks.on('longRest', (actor) => {
      this.processRest(actor, 'longRest');
    });

    // Combat events for automatic tracking
    Hooks.on('createChatMessage', (message) => {
      this.trackCombatResourceUsage(message);
    });
  }

  /**
   * Initialize resources for an actor
   */
  static initializeActorResources(actor) {
    const level = actor.system.progression?.level || 1;
    const className = actor.system.progression?.class || '';
    const resources = {};

    this.resources.forEach((resourceType, id) => {
      resources[id] = this.createResourceInstance(resourceType, level, className);
    });

    return resources;
  }

  /**
   * Create a resource instance
   */
  static createResourceInstance(resourceType, level, className) {
    const instance = {
      type: resourceType.id,
      name: resourceType.name,
      category: resourceType.category,
      resetOn: resourceType.resetOn
    };

    if (resourceType.levelBased) {
      // Calculate based on level
      instance.max = Math.max(1, Math.floor(level / 2));
      instance.value = instance.max;
    } else if (resourceType.levels) {
      // Spell slots by level
      instance.slots = {};
      Object.entries(resourceType.levels).forEach(([slotLevel, config]) => {
        const maxSlots = this.calculateSpellSlots(parseInt(slotLevel), level, className);
        instance.slots[slotLevel] = {
          max: maxSlots,
          value: maxSlots,
          name: config.name
        };
      });
    } else if (resourceType.abilities) {
      // Class abilities
      instance.abilities = {};
      Object.entries(resourceType.abilities).forEach(([abilityId, config]) => {
        const maxUses = this.calculateAbilityUses(abilityId, level, className);
        instance.abilities[abilityId] = {
          max: maxUses,
          value: maxUses,
          name: config.name,
          resetOn: config.resetOn
        };
      });
    } else if (resourceType.trackByType) {
      // Ammunition types
      instance.types = {};
      Object.entries(resourceType.types).forEach(([typeId, config]) => {
        instance.types[typeId] = {
          max: config.max,
          value: config.max,
          name: config.name
        };
      });
    } else {
      // Simple resource
      instance.max = 1;
      instance.value = 1;
    }

    return instance;
  }

  /**
   * Calculate spell slots for level and class
   */
  static calculateSpellSlots(slotLevel, characterLevel, className) {
    // Simplified spell slot calculation
    const spellcasterLevel = this.getSpellcasterLevel(className, characterLevel);
    
    if (spellcasterLevel === 0) return 0;

    // Basic spell slot progression table
    const spellTable = {
      1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
      3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
      7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
      8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
      9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
      10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
      11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
      12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
      13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
      14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
      15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
      16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
      17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
      18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
      19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
      20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
    };

    const slots = spellTable[Math.min(spellcasterLevel, 20)];
    return slots ? slots[slotLevel - 1] || 0 : 0;
  }

  /**
   * Get spellcaster level for class
   */
  static getSpellcasterLevel(className, characterLevel) {
    const fullCasters = ['wizard', 'sorcerer', 'bard', 'cleric', 'druid'];
    const halfCasters = ['paladin', 'ranger'];
    const thirdCasters = ['fighter', 'rogue']; // With subclass

    if (fullCasters.includes(className.toLowerCase())) {
      return characterLevel;
    } else if (halfCasters.includes(className.toLowerCase())) {
      return Math.floor(characterLevel / 2);
    } else if (thirdCasters.includes(className.toLowerCase())) {
      return Math.floor(characterLevel / 3);
    }

    return 0;
  }

  /**
   * Calculate ability uses
   */
  static calculateAbilityUses(abilityId, level, className) {
    // Simplified ability use calculation
    switch (abilityId) {
      case 'rage':
        return className.toLowerCase() === 'barbarian' ? Math.max(1, Math.floor(level / 3)) : 0;
      case 'kiPoints':
        return className.toLowerCase() === 'monk' ? level : 0;
      case 'bardic':
        return className.toLowerCase() === 'bard' ? Math.max(1, Math.floor((level + 2) / 6)) : 0;
      case 'channel':
        return ['cleric', 'paladin'].includes(className.toLowerCase()) ? 1 + Math.floor(level / 6) : 0;
      case 'wildShape':
        return className.toLowerCase() === 'druid' ? Math.max(1, Math.floor(level / 2)) : 0;
      default:
        return 1;
    }
  }

  /**
   * Track resource changes
   */
  static trackResourceChanges(actor, updateData) {
    const resourceChanges = updateData.system?.resources;
    if (!resourceChanges) return;

    Object.entries(resourceChanges).forEach(([resourceId, changes]) => {
      this.logResourceUsage(actor, resourceId, changes);
    });
  }

  /**
   * Track combat resource usage from chat
   */
  static trackCombatResourceUsage(message) {
    if (!message.isRoll) return;

    const flavor = message.flavor?.toLowerCase() || '';
    const speaker = message.speaker;

    // Track spell casting
    if (flavor.includes('spell') || flavor.includes('cantrip')) {
      const spellLevel = this.extractSpellLevel(flavor);
      if (spellLevel > 0) {
        this.useResource(speaker.actor, 'spellSlots', { level: spellLevel, amount: 1 });
      }
    }

    // Track ammunition usage
    if (flavor.includes('attack') && (flavor.includes('bow') || flavor.includes('crossbow'))) {
      const ammoType = flavor.includes('crossbow') ? 'bolts' : 'arrows';
      this.useResource(speaker.actor, 'ammunition', { type: ammoType, amount: 1 });
    }
  }

  /**
   * Extract spell level from flavor text
   */
  static extractSpellLevel(flavor) {
    const match = flavor.match(/(\d+)(?:st|nd|rd|th)?\s*level/i);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Use a resource
   */
  static async useResource(actorId, resourceType, options = {}) {
    const actor = game.actors.get(actorId);
    if (!actor) return false;

    const resources = actor.system.resources || {};
    const resource = resources[resourceType];

    if (!resource) {
      ui.notifications.warn(`Resource type ${resourceType} not found`);
      return false;
    }

    const amount = options.amount || 1;
    let updated = false;

    if (resource.slots && options.level) {
      // Spell slots
      const slot = resource.slots[options.level];
      if (slot && slot.value >= amount) {
        slot.value -= amount;
        updated = true;
      }
    } else if (resource.abilities && options.ability) {
      // Class abilities
      const ability = resource.abilities[options.ability];
      if (ability && ability.value >= amount) {
        ability.value -= amount;
        updated = true;
      }
    } else if (resource.types && options.type) {
      // Typed resources (ammunition)
      const type = resource.types[options.type];
      if (type && type.value >= amount) {
        type.value -= amount;
        updated = true;
      }
    } else if (resource.value !== undefined) {
      // Simple resource
      if (resource.value >= amount) {
        resource.value -= amount;
        updated = true;
      }
    }

    if (updated) {
      await actor.update({ [`system.resources.${resourceType}`]: resource });
      this.logResourceUsage(actor, resourceType, { used: amount, options });
      ui.notifications.info(`Used ${amount} ${resourceType}`);
      return true;
    } else {
      ui.notifications.warn(`Not enough ${resourceType} remaining`);
      return false;
    }
  }

  /**
   * Restore a resource
   */
  static async restoreResource(actorId, resourceType, options = {}) {
    const actor = game.actors.get(actorId);
    if (!actor) return false;

    const resources = actor.system.resources || {};
    const resource = resources[resourceType];

    if (!resource) return false;

    const amount = options.amount || 1;
    let updated = false;

    if (resource.slots && options.level) {
      // Spell slots
      const slot = resource.slots[options.level];
      if (slot) {
        slot.value = Math.min(slot.max, slot.value + amount);
        updated = true;
      }
    } else if (resource.abilities && options.ability) {
      // Class abilities
      const ability = resource.abilities[options.ability];
      if (ability) {
        ability.value = Math.min(ability.max, ability.value + amount);
        updated = true;
      }
    } else if (resource.types && options.type) {
      // Typed resources
      const type = resource.types[options.type];
      if (type) {
        type.value = Math.min(type.max, type.value + amount);
        updated = true;
      }
    } else if (resource.value !== undefined) {
      // Simple resource
      resource.value = Math.min(resource.max, resource.value + amount);
      updated = true;
    }

    if (updated) {
      await actor.update({ [`system.resources.${resourceType}`]: resource });
      return true;
    }

    return false;
  }

  /**
   * Process rest events
   */
  static async processRest(actor, restType) {
    const resources = actor.system.resources || {};
    const updates = {};

    this.resources.forEach((resourceDef, resourceId) => {
      const resource = resources[resourceId];
      if (!resource) return;

      if (resourceDef.resetOn === restType || (restType === 'longRest' && resourceDef.resetOn === 'shortRest')) {
        updates[`system.resources.${resourceId}`] = this.resetResource(resource, resourceDef);
      }
    });

    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
      ui.notifications.info(`${actor.name} recovers resources from ${restType}`);
    }
  }

  /**
   * Reset a resource
   */
  static resetResource(resource, resourceDef) {
    const resetAmount = resourceDef.resetPercent || 1.0;
    const newResource = foundry.utils.deepClone(resource);

    if (newResource.slots) {
      Object.values(newResource.slots).forEach(slot => {
        slot.value = Math.floor(slot.max * resetAmount);
      });
    }

    if (newResource.abilities) {
      Object.values(newResource.abilities).forEach(ability => {
        if (ability.resetOn === resourceDef.resetOn) {
          ability.value = Math.floor(ability.max * resetAmount);
        }
      });
    }

    if (newResource.types) {
      // Ammunition doesn't reset on rest
      if (resourceDef.resetOn !== 'never') {
        Object.values(newResource.types).forEach(type => {
          type.value = Math.floor(type.max * resetAmount);
        });
      }
    }

    if (newResource.value !== undefined && newResource.max !== undefined) {
      newResource.value = Math.floor(newResource.max * resetAmount);
    }

    return newResource;
  }

  /**
   * Log resource usage
   */
  static logResourceUsage(actor, resourceType, changes) {
    this.history.unshift({
      timestamp: Date.now(),
      actor: actor.name,
      actorId: actor.id,
      resourceType,
      changes
    });

    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history.pop();
    }
  }

  /**
   * Get resource summary for actor
   */
  static getResourceSummary(actor) {
    const resources = actor.system.resources || {};
    const summary = {};

    Object.entries(resources).forEach(([resourceId, resource]) => {
      const resourceDef = this.resources.get(resourceId);
      if (!resourceDef) return;

      summary[resourceId] = {
        name: resource.name,
        category: resource.category,
        icon: resourceDef.icon,
        status: this.getResourceStatus(resource)
      };
    });

    return summary;
  }

  /**
   * Get resource status
   */
  static getResourceStatus(resource) {
    if (resource.slots) {
      const totalUsed = Object.values(resource.slots).reduce((sum, slot) => 
        sum + (slot.max - slot.value), 0);
      const totalMax = Object.values(resource.slots).reduce((sum, slot) => 
        sum + slot.max, 0);
      return { used: totalUsed, max: totalMax, percentage: totalMax > 0 ? (totalMax - totalUsed) / totalMax : 0 };
    }

    if (resource.abilities) {
      const totalUsed = Object.values(resource.abilities).reduce((sum, ability) => 
        sum + (ability.max - ability.value), 0);
      const totalMax = Object.values(resource.abilities).reduce((sum, ability) => 
        sum + ability.max, 0);
      return { used: totalUsed, max: totalMax, percentage: totalMax > 0 ? (totalMax - totalUsed) / totalMax : 0 };
    }

    if (resource.types) {
      const totalUsed = Object.values(resource.types).reduce((sum, type) => 
        sum + (type.max - type.value), 0);
      const totalMax = Object.values(resource.types).reduce((sum, type) => 
        sum + type.max, 0);
      return { used: totalUsed, max: totalMax, percentage: totalMax > 0 ? (totalMax - totalUsed) / totalMax : 0 };
    }

    if (resource.value !== undefined && resource.max !== undefined) {
      return { 
        used: resource.max - resource.value, 
        max: resource.max, 
        percentage: resource.max > 0 ? resource.value / resource.max : 0 
      };
    }

    return { used: 0, max: 0, percentage: 0 };
  }

  /**
   * Get usage history
   */
  static getUsageHistory(actorId = null, limit = 20) {
    let history = this.history;
    
    if (actorId) {
      history = history.filter(entry => entry.actorId === actorId);
    }
    
    return history.slice(0, limit);
  }

  /**
   * Clear usage history
   */
  static clearHistory() {
    this.history = [];
  }
}

// Auto-initialize when ready
Hooks.once('ready', () => {
  ResourceTracker.initialize();
});

// Export for module use
export default ResourceTracker;