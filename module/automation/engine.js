/**
 * Automation Engine for Custom TTRPG V2
 * Handles rule automation, triggers, and game logic automation
 */

export class AutomationEngine {
  static triggers = new Map();
  static rules = new Map();
  static queues = new Map();
  static enabled = true;
  static processing = false;

  /**
   * Initialize the automation engine
   */
  static initialize() {
    this.registerDefaultTriggers();
    this.registerDefaultRules();
    this.setupEventListeners();
    console.log("Automation Engine | Initialized successfully");
  }

  /**
   * Register default triggers
   */
  static registerDefaultTriggers() {
    // Combat triggers
    this.registerTrigger('combat.start', {
      name: 'Combat Start',
      description: 'Triggered when combat begins',
      event: 'createCombat'
    });

    this.registerTrigger('combat.end', {
      name: 'Combat End',
      description: 'Triggered when combat ends',
      event: 'deleteCombat'
    });

    this.registerTrigger('combat.turnStart', {
      name: 'Turn Start',
      description: 'Triggered at the start of each turn',
      event: 'updateCombat',
      condition: (combat, updateData) => updateData.turn !== undefined
    });

    this.registerTrigger('combat.roundEnd', {
      name: 'Round End',
      description: 'Triggered at the end of each round',
      event: 'updateCombat',
      condition: (combat, updateData) => updateData.turn !== undefined && updateData.turn === 0
    });

    // Actor triggers
    this.registerTrigger('actor.damage', {
      name: 'Actor Takes Damage',
      description: 'Triggered when an actor takes damage',
      event: 'updateActor',
      condition: (actor, updateData) => {
        const oldHp = actor.system.attributes?.hp?.value || 0;
        const newHp = updateData.system?.attributes?.hp?.value;
        return newHp !== undefined && newHp < oldHp;
      }
    });

    this.registerTrigger('actor.heal', {
      name: 'Actor Healed',
      description: 'Triggered when an actor is healed',
      event: 'updateActor',
      condition: (actor, updateData) => {
        const oldHp = actor.system.attributes?.hp?.value || 0;
        const newHp = updateData.system?.attributes?.hp?.value;
        return newHp !== undefined && newHp > oldHp;
      }
    });

    this.registerTrigger('actor.unconscious', {
      name: 'Actor Unconscious',
      description: 'Triggered when an actor becomes unconscious',
      event: 'updateActor',
      condition: (actor, updateData) => {
        const newHp = updateData.system?.attributes?.hp?.value;
        return newHp !== undefined && newHp <= 0;
      }
    });

    this.registerTrigger('actor.levelUp', {
      name: 'Level Up',
      description: 'Triggered when an actor levels up',
      event: 'updateActor',
      condition: (actor, updateData) => {
        const oldLevel = actor.system.progression?.level || 1;
        const newLevel = updateData.system?.progression?.level;
        return newLevel !== undefined && newLevel > oldLevel;
      }
    });

    // Dice triggers
    this.registerTrigger('dice.critical', {
      name: 'Critical Roll',
      description: 'Triggered on critical success (natural 20)',
      event: 'createChatMessage',
      condition: (message) => {
        if (!message.isRoll) return false;
        const roll = message.rolls?.[0];
        return roll?.dice?.some(d => d.results?.some(r => r.result === 20 && d.faces === 20));
      }
    });

    this.registerTrigger('dice.fumble', {
      name: 'Fumble Roll',
      description: 'Triggered on critical failure (natural 1)',
      event: 'createChatMessage',
      condition: (message) => {
        if (!message.isRoll) return false;
        const roll = message.rolls?.[0];
        return roll?.dice?.some(d => d.results?.some(r => r.result === 1 && d.faces === 20));
      }
    });

    // Item triggers
    this.registerTrigger('item.equip', {
      name: 'Item Equipped',
      description: 'Triggered when an item is equipped',
      event: 'updateActor',
      condition: (actor, updateData) => {
        // Check if any inventory item's equipped status changed to true
        const inventory = updateData.system?.inventory;
        if (!inventory) return false;
        
        for (const category of Object.values(inventory)) {
          if (Array.isArray(category)) {
            for (const item of category) {
              if (item.equipped && !actor.system.inventory?.[category]?.find(i => i.id === item.id)?.equipped) {
                return true;
              }
            }
          }
        }
        return false;
      }
    });
  }

  /**
   * Register default automation rules
   */
  static registerDefaultRules() {
    // Death saving throws
    this.registerRule('unconscious.deathSaves', {
      name: 'Death Saving Throws',
      description: 'Automatically prompt for death saving throws when unconscious',
      trigger: 'actor.unconscious',
      condition: (data) => {
        const actor = data.actor;
        return actor.type === 'character' && actor.system.attributes.hp.value <= 0;
      },
      action: async (data) => {
        const actor = data.actor;
        
        // Add unconscious status effect
        const statusEffects = actor.system.statusEffects || [];
        if (!statusEffects.find(effect => effect.name === 'unconscious')) {
          statusEffects.push({
            name: 'unconscious',
            duration: -1,
            appliedRound: game.combat?.round || 0
          });
          
          await actor.update({ 'system.statusEffects': statusEffects });
        }

        // Notify about death saves
        ui.notifications.warn(`${actor.name} is unconscious and must make death saving throws!`);
        
        // Auto-roll if setting enabled
        if (game.settings.get('custom-ttrpg', 'automation.autoDeathSaves')) {
          this.rollDeathSave(actor);
        }
      }
    });

    // Critical hit effects
    this.registerRule('critical.extraDamage', {
      name: 'Critical Hit Extra Damage',
      description: 'Apply extra damage on critical hits',
      trigger: 'dice.critical',
      condition: (data) => {
        const message = data.message;
        return message.flavor?.toLowerCase().includes('attack');
      },
      action: async (data) => {
        const message = data.message;
        
        // Show critical hit effect
        if (game.effects) {
          setTimeout(() => {
            game.effects.playEffect('critical-hit', '.chat-message:last-child');
          }, 100);
        }

        // Auto-roll damage if enabled
        if (game.settings.get('custom-ttrpg', 'automation.autoCritDamage')) {
          await ChatMessage.create({
            speaker: message.speaker,
            content: "🎯 **CRITICAL HIT!** Roll damage dice twice!",
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
          });
        }
      }
    });

    // Level up benefits
    this.registerRule('levelUp.benefits', {
      name: 'Auto Level Up Benefits',
      description: 'Automatically apply level up benefits',
      trigger: 'actor.levelUp',
      condition: (data) => {
        return game.settings.get('custom-ttrpg', 'character.autoLevelBenefits');
      },
      action: async (data) => {
        const actor = data.actor;
        const newLevel = data.updateData.system.progression.level;
        
        await this.applyLevelUpBenefits(actor, newLevel);
        
        // Show celebration effect
        if (game.effects) {
          game.effects.playEffect('level-up', `[data-actor-id="${actor.id}"]`);
        }
      }
    });

    // Status effect automation
    this.registerRule('turnStart.statusEffects', {
      name: 'Process Status Effects',
      description: 'Process status effects at turn start',
      trigger: 'combat.turnStart',
      action: async (data) => {
        const combat = data.combat;
        const currentCombatant = combat.combatant;
        
        if (currentCombatant?.actor) {
          await this.processStatusEffects(currentCombatant.actor, 'turnStart');
        }
      }
    });

    // Resource tracking
    this.registerRule('combat.trackResources', {
      name: 'Track Combat Resources',
      description: 'Automatically track resources during combat',
      trigger: 'combat.turnStart',
      condition: () => game.settings.get('custom-ttrpg', 'combat.trackResources'),
      action: async (data) => {
        const combat = data.combat;
        const currentCombatant = combat.combatant;
        
        if (currentCombatant?.actor) {
          await this.updateResourceTracking(currentCombatant.actor);
        }
      }
    });

    // Opportunity attacks
    this.registerRule('movement.opportunityAttacks', {
      name: 'Opportunity Attacks',
      description: 'Check for opportunity attacks on movement',
      trigger: 'token.move',
      condition: () => game.settings.get('custom-ttrpg', 'combat.opportunityAttacks'),
      action: async (data) => {
        const token = data.token;
        await this.checkOpportunityAttacks(token, data.updateData);
      }
    });
  }

  /**
   * Register a trigger
   */
  static registerTrigger(id, config) {
    this.triggers.set(id, {
      id,
      name: config.name,
      description: config.description,
      event: config.event,
      condition: config.condition || (() => true)
    });
  }

  /**
   * Register a rule
   */
  static registerRule(id, config) {
    this.rules.set(id, {
      id,
      name: config.name,
      description: config.description,
      trigger: config.trigger,
      condition: config.condition || (() => true),
      action: config.action,
      priority: config.priority || 0,
      enabled: config.enabled !== false
    });
  }

  /**
   * Setup event listeners
   */
  static setupEventListeners() {
    // Combat events
    Hooks.on('createCombat', (...args) => this.processTrigger('combat.start', { combat: args[0] }));
    Hooks.on('deleteCombat', (...args) => this.processTrigger('combat.end', { combat: args[0] }));
    Hooks.on('updateCombat', (...args) => {
      if (this.triggers.get('combat.turnStart').condition(...args)) {
        this.processTrigger('combat.turnStart', { combat: args[0], updateData: args[1] });
      }
      if (this.triggers.get('combat.roundEnd').condition(...args)) {
        this.processTrigger('combat.roundEnd', { combat: args[0], updateData: args[1] });
      }
    });

    // Actor events
    Hooks.on('updateActor', (...args) => {
      const actor = args[0];
      const updateData = args[1];
      
      // Check all actor triggers
      ['actor.damage', 'actor.heal', 'actor.unconscious', 'actor.levelUp', 'item.equip'].forEach(triggerId => {
        const trigger = this.triggers.get(triggerId);
        if (trigger && trigger.condition(actor, updateData)) {
          this.processTrigger(triggerId, { actor, updateData });
        }
      });
    });

    // Chat/dice events
    Hooks.on('createChatMessage', (...args) => {
      const message = args[0];
      
      // Check dice triggers
      ['dice.critical', 'dice.fumble'].forEach(triggerId => {
        const trigger = this.triggers.get(triggerId);
        if (trigger && trigger.condition(message)) {
          this.processTrigger(triggerId, { message });
        }
      });
    });

    // Token events
    Hooks.on('updateToken', (...args) => {
      const tokenDocument = args[0];
      const updateData = args[1];
      
      if (updateData.x !== undefined || updateData.y !== undefined) {
        this.processTrigger('token.move', { token: tokenDocument.object, updateData });
      }
    });
  }

  /**
   * Process a trigger
   */
  static async processTrigger(triggerId, data) {
    if (!this.enabled) return;

    // Find all rules that respond to this trigger
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.trigger === triggerId)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of applicableRules) {
      try {
        // Check rule condition
        if (rule.condition(data)) {
          await this.executeRule(rule, data);
        }
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Execute a rule
   */
  static async executeRule(rule, data) {
    console.log(`Executing automation rule: ${rule.name}`);
    
    try {
      await rule.action(data);
    } catch (error) {
      console.error(`Error executing rule ${rule.id}:`, error);
      ui.notifications.error(`Automation rule "${rule.name}" failed: ${error.message}`);
    }
  }

  /**
   * Roll death saving throw
   */
  static async rollDeathSave(actor) {
    const result = await game.dice.roll('1d20', {
      speaker: { alias: actor.name },
      flavor: 'Death Saving Throw'
    });

    const roll = result.total;
    let message = '';

    if (roll === 20) {
      // Natural 20 - regain 1 HP
      await actor.heal(1);
      message = `${actor.name} rolls a natural 20 and regains 1 HP!`;
    } else if (roll >= 10) {
      // Success
      message = `${actor.name} succeeds the death saving throw.`;
    } else if (roll === 1) {
      // Natural 1 - two failures
      message = `${actor.name} rolls a natural 1 - critical failure!`;
    } else {
      // Failure
      message = `${actor.name} fails the death saving throw.`;
    }

    await ChatMessage.create({
      speaker: { alias: actor.name },
      content: message,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Apply level up benefits
   */
  static async applyLevelUpBenefits(actor, newLevel) {
    const updates = {};
    
    // Calculate new proficiency bonus
    const profBonus = Math.ceil(newLevel / 4) + 1;
    updates['system.combat.proficiencyBonus'] = profBonus;
    
    // Increase HP (simplified - would need class data for proper calculation)
    const endModifier = actor.getAttributeModifier('end');
    const hpIncrease = 6 + endModifier; // Average of d6 + CON mod
    updates['system.attributes.hp.max'] = actor.system.attributes.hp.max + hpIncrease;
    updates['system.attributes.hp.value'] = actor.system.attributes.hp.max + hpIncrease;
    
    // Update spell slots or other resources based on level
    if (newLevel % 2 === 0) {
      // Every even level, increase mana
      const currentMana = actor.system.resources.mana?.max || 0;
      updates['system.resources.mana.max'] = currentMana + 2;
      updates['system.resources.mana.value'] = currentMana + 2;
    }
    
    await actor.update(updates);
    
    ui.notifications.info(`${actor.name} gains level ${newLevel} benefits!`);
  }

  /**
   * Process status effects
   */
  static async processStatusEffects(actor, timing) {
    const statusEffects = actor.system.statusEffects || [];
    const updates = [];
    let hasChanges = false;

    for (let i = statusEffects.length - 1; i >= 0; i--) {
      const effect = statusEffects[i];
      
      if (timing === 'turnStart') {
        // Process ongoing effects
        switch (effect.name) {
          case 'poisoned':
            if (effect.damagePerTurn) {
              await actor.takeDamage(effect.damagePerTurn, 'poison');
              ui.notifications.warn(`${actor.name} takes ${effect.damagePerTurn} poison damage!`);
            }
            break;
            
          case 'regenerating':
            if (effect.healingPerTurn) {
              await actor.heal(effect.healingPerTurn);
              ui.notifications.info(`${actor.name} regenerates ${effect.healingPerTurn} HP!`);
            }
            break;
        }
        
        // Reduce duration
        if (effect.duration > 0) {
          effect.duration--;
          if (effect.duration <= 0) {
            statusEffects.splice(i, 1);
            hasChanges = true;
            ui.notifications.info(`${effect.name} effect on ${actor.name} has ended.`);
          }
        }
      }
    }

    if (hasChanges) {
      await actor.update({ 'system.statusEffects': statusEffects });
    }
  }

  /**
   * Update resource tracking
   */
  static async updateResourceTracking(actor) {
    // This would track things like spell slot usage, daily abilities, etc.
    // For now, just log that we're tracking
    console.log(`Tracking resources for ${actor.name}`);
  }

  /**
   * Check for opportunity attacks
   */
  static async checkOpportunityAttacks(token, updateData) {
    if (!game.combat?.started) return;
    
    const actor = token.actor;
    if (!actor) return;

    // Simple opportunity attack check - would be more complex in practice
    const nearbyEnemies = canvas.tokens.placeables.filter(t => 
      t.actor && 
      t.actor.type !== actor.type && 
      t.actor.system.attributes.hp.value > 0 &&
      canvas.grid.measureDistance(token, t) <= 5
    );

    if (nearbyEnemies.length > 0) {
      ui.notifications.info(`${actor.name} may provoke opportunity attacks from ${nearbyEnemies.length} enemies!`);
    }
  }

  /**
   * Enable/disable automation
   */
  static setEnabled(enabled) {
    this.enabled = enabled;
    ui.notifications.info(`Automation engine ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable specific rule
   */
  static setRuleEnabled(ruleId, enabled) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      ui.notifications.info(`Rule "${rule.name}" ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get all rules by category
   */
  static getRulesByCategory() {
    const categories = {};
    this.rules.forEach(rule => {
      const category = rule.trigger.split('.')[0];
      if (!categories[category]) categories[category] = [];
      categories[category].push(rule);
    });
    return categories;
  }

  /**
   * Execute custom automation
   */
  static async executeCustom(script, data = {}) {
    try {
      // Simple sandboxed execution
      const func = new Function('data', 'game', 'ui', 'canvas', script);
      return await func(data, game, ui, canvas);
    } catch (error) {
      console.error('Custom automation error:', error);
      throw error;
    }
  }
}

// Auto-initialize when ready
Hooks.once('ready', () => {
  AutomationEngine.initialize();
});

// Export for module use
export default AutomationEngine;