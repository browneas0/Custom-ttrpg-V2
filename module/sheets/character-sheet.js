/**
 * Enhanced Character Sheet for Custom TTRPG V2
 * Integrated with advanced dice engine and modern VTT patterns
 */

export class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["custom-ttrpg", "sheet", "actor"],
      template: `systems/${game.system.id}/templates/actors/character-sheet.html`,
      width: 900,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }],
      dragDrop: [{ dragSelector: ".item", dropSelector: null }],
      resizable: true
    });
  }

  getData() {
    const data = super.getData();
    const actorData = data.actor.system;
    
    // Add class info
    const classInfo = CONFIG.CustomTTRPG?.ClassInfo?.[actorData.class];
    data.classInfo = classInfo;
    
    // Add attribute effects
    if (classInfo?.attributeEffects) {
      data.attributeEffects = classInfo.attributeEffects;
    }
    
    // Add level progression
    if (classInfo?.levelProgression) {
      data.levelProgression = classInfo.levelProgression;
    }
    
    // Add class features
    if (classInfo?.classFeatures) {
      data.classFeatures = classInfo.classFeatures;
    }
    
    // Add spells
    if (classInfo?.spells) {
      data.spells = classInfo.spells;
    }

    // Calculate attribute modifiers for display
    data.attributeModifiers = {};
    const attributes = ['str', 'dex', 'end', 'int', 'wis', 'cha'];
    attributes.forEach(attr => {
      const value = actorData.attributes?.[attr]?.value || 10;
      data.attributeModifiers[attr] = Math.floor((value - 10) / 2);
    });

    // Add skills data if available
    data.skills = actorData.skills || {};

    // Add inventory with categories
    data.inventory = actorData.inventory || {};
    data.equippedItems = this._getEquippedItems(actorData.inventory);

    // Add carrying capacity info
    data.carryingInfo = {
      current: actorData.currentWeight || 0,
      max: actorData.carryingCapacity || 150,
      percentage: actorData.carryingCapacity ? 
        Math.round((actorData.currentWeight || 0) / actorData.carryingCapacity * 100) : 0
    };

    // Add health percentage for visual bars
    data.healthPercentage = actorData.attributes?.hp?.max ? 
      Math.round((actorData.attributes.hp.value / actorData.attributes.hp.max) * 100) : 100;

    return data;
  }

  _getEquippedItems(inventory) {
    const equipped = { weapons: [], armor: [] };
    if (inventory?.weapons) {
      equipped.weapons = inventory.weapons.filter(item => item.equipped);
    }
    if (inventory?.armor) {
      equipped.armor = inventory.armor.filter(item => item.equipped);
    }
    return equipped;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Class info button
    html.find('#ctt-btn-info').click(this._onShowClassInfo.bind(this));
    
    // Resource buttons
    html.find('.resource-btn').click(this._onResourceChange.bind(this));
    
    // Level up button
    html.find('.level-up').click(this._onLevelUp.bind(this));

    // Attribute roll buttons
    html.find('.attribute-roll').click(this._onAttributeRoll.bind(this));

    // Skill check buttons
    html.find('.skill-roll').click(this._onSkillRoll.bind(this));

    // Attack roll buttons
    html.find('.attack-roll').click(this._onAttackRoll.bind(this));

    // Damage roll buttons
    html.find('.damage-roll').click(this._onDamageRoll.bind(this));

    // Item management
    html.find('.item-equip').click(this._onItemEquip.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Health management
    html.find('.health-change').click(this._onHealthChange.bind(this));

    // Initiative roll
    html.find('.initiative-roll').click(this._onInitiativeRoll.bind(this));

    // Quick dice roller
    html.find('.quick-roll').click(this._onQuickRoll.bind(this));

    // Rest buttons
    html.find('.short-rest').click(this._onShortRest.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));
  }

  async _onShowClassInfo(event) {
    event.preventDefault();
    
    // Use the global function
    if (game.customTTRPG?.showClassInfo) {
      game.customTTRPG.showClassInfo(this.actor.id);
    }
  }

  async _onResourceChange(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const action = button.dataset.action;
    const resourceName = button.dataset.resource;
    
    const resource = this.actor.system.resources[resourceName];
    if (!resource) return;

    let newValue = resource.value;
    if (action === "increase" && newValue < resource.max) {
      newValue++;
    } else if (action === "decrease" && newValue > 0) {
      newValue--;
    }

    await this.actor.update({ 
      [`system.resources.${resourceName}.value`]: newValue 
    });
  }

  async _onLevelUp(event) {
    event.preventDefault();
    
    const currentLevel = this.actor.system.level;
    const newLevel = currentLevel + 1;
    
    // Check if level progression exists
    const classInfo = CONFIG.CustomTTRPG?.ClassInfo?.[this.actor.system.class];
    if (!classInfo?.levelProgression?.[newLevel]) {
      ui.notifications.warn("Maximum level reached!");
      return;
    }
    
    // Update level
    await this.actor.update({
      'system.level': newLevel
    });
    
    // Update resources based on new level
    if (classInfo.resources) {
      const updates = {};
      for (const [resourceName, resourceData] of Object.entries(classInfo.resources)) {
        // Simple level-based scaling for resource max values
        const newMax = Math.min(20, resourceData.max + Math.floor(newLevel / 2));
        updates[`system.resources.${resourceName}.max`] = newMax;
        updates[`system.resources.${resourceName}.value`] = newMax; // Refill on level up
      }
      
      if (Object.keys(updates).length > 0) {
        await this.actor.update(updates);
      }
    }
    
    ui.notifications.info(`${this.actor.name} reached level ${newLevel}!`);
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});

Handlebars.registerHelper('resourcePercent', function(current, max) {
  if (max === 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

Handlebars.registerHelper('divide', function(a, b) {
  if (b === 0) return 0;
  return a / b;
});

Handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

Handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

Handlebars.registerHelper('formatNumber', function(num) {
  return num.toFixed(1);
});

Handlebars.registerHelper('capitalize', function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});
