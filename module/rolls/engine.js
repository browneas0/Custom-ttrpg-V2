/**
 * Enhanced Dice Rolling Engine for Custom TTRPG V2
 * Inspired by advanced VTT dice systems with support for complex expressions
 */

export class DiceEngine {
  static dicePool = [];
  static lastRoll = null;
  static rollHistory = [];

  /**
   * Parse and roll dice expression
   * Supports: 3d6+2, 4d6dl1, 2d10kh1, 1d20+5, etc.
   */
  static async roll(expression, options = {}) {
    try {
      const parsed = this.parseExpression(expression);
      const result = await this.executeRoll(parsed, options);
      
      // Store in history
      this.lastRoll = result;
      this.rollHistory.unshift(result);
      if (this.rollHistory.length > 50) this.rollHistory.pop();
      
      // Send to chat if enabled
      if (options.sendToChat !== false) {
        await this.sendToChat(result, options);
      }
      
      return result;
    } catch (error) {
      console.error("Dice roll error:", error);
      ui.notifications.error(`Invalid dice expression: ${expression}`);
      return null;
    }
  }

  /**
   * Parse dice expression into components
   */
  static parseExpression(expression) {
    // Clean the expression
    const cleaned = expression.replace(/\s+/g, '').toLowerCase();
    
    // Match patterns like: 3d6+2, 4d6dl1, 2d10kh1, etc.
    const diceRegex = /(\d*)d(\d+)([dklhc]*\d*)?([+-]\d+)?/g;
    const parts = [];
    let modifierSum = 0;
    let match;

    while ((match = diceRegex.exec(cleaned)) !== null) {
      const [full, count, sides, special, modifier] = match;
      
      parts.push({
        count: parseInt(count) || 1,
        sides: parseInt(sides),
        special: special || '',
        modifier: modifier ? parseInt(modifier) : 0,
        original: full
      });

      if (modifier) {
        modifierSum += parseInt(modifier);
      }
    }

    // Handle simple modifiers (like +5 without dice)
    const modifierRegex = /([+-]\d+)(?!d)/g;
    while ((match = modifierRegex.exec(cleaned)) !== null) {
      modifierSum += parseInt(match[1]);
    }

    return {
      expression: expression,
      parts: parts,
      totalModifier: modifierSum
    };
  }

  /**
   * Execute the parsed dice roll
   */
  static async executeRoll(parsed, options = {}) {
    const results = [];
    let grandTotal = 0;

    for (const part of parsed.parts) {
      const rollResult = await this.rollDicePart(part, options);
      results.push(rollResult);
      grandTotal += rollResult.total;
    }

    grandTotal += parsed.totalModifier;

    const result = {
      expression: parsed.expression,
      parts: results,
      modifier: parsed.totalModifier,
      total: grandTotal,
      timestamp: new Date(),
      rolled: results.map(r => r.dice).flat(),
      formula: this.buildFormula(results, parsed.totalModifier)
    };

    return result;
  }

  /**
   * Roll a single dice part (e.g., 4d6dl1)
   */
  static async rollDicePart(part, options = {}) {
    const dice = [];
    
    // Roll all dice
    for (let i = 0; i < part.count; i++) {
      const roll = Math.floor(Math.random() * part.sides) + 1;
      dice.push({
        result: roll,
        sides: part.sides,
        kept: true,
        exploded: false
      });
    }

    // Apply special rules
    this.applySpecialRules(dice, part.special);

    // Calculate total
    const total = dice
      .filter(d => d.kept)
      .reduce((sum, d) => sum + d.result, 0) + part.modifier;

    return {
      count: part.count,
      sides: part.sides,
      special: part.special,
      modifier: part.modifier,
      dice: dice,
      total: total,
      formula: this.buildPartFormula(dice, part)
    };
  }

  /**
   * Apply special dice rules (drop lowest, keep highest, etc.)
   */
  static applySpecialRules(dice, special) {
    if (!special) return;

    // Drop lowest: dl1, dl2, etc.
    if (special.includes('dl')) {
      const dropCount = parseInt(special.match(/dl(\d+)/)?.[1]) || 1;
      const sorted = [...dice].sort((a, b) => a.result - b.result);
      for (let i = 0; i < Math.min(dropCount, dice.length - 1); i++) {
        const original = dice.find(d => d === sorted[i]);
        if (original) original.kept = false;
      }
    }

    // Drop highest: dh1, dh2, etc.
    if (special.includes('dh')) {
      const dropCount = parseInt(special.match(/dh(\d+)/)?.[1]) || 1;
      const sorted = [...dice].sort((a, b) => b.result - a.result);
      for (let i = 0; i < Math.min(dropCount, dice.length - 1); i++) {
        const original = dice.find(d => d === sorted[i]);
        if (original) original.kept = false;
      }
    }

    // Keep highest: kh1, kh2, etc.
    if (special.includes('kh')) {
      const keepCount = parseInt(special.match(/kh(\d+)/)?.[1]) || 1;
      const sorted = [...dice].sort((a, b) => b.result - a.result);
      dice.forEach(d => d.kept = false);
      for (let i = 0; i < Math.min(keepCount, dice.length); i++) {
        const original = dice.find(d => d === sorted[i] && !d.kept);
        if (original) original.kept = true;
      }
    }

    // Keep lowest: kl1, kl2, etc.
    if (special.includes('kl')) {
      const keepCount = parseInt(special.match(/kl(\d+)/)?.[1]) || 1;
      const sorted = [...dice].sort((a, b) => a.result - b.result);
      dice.forEach(d => d.kept = false);
      for (let i = 0; i < Math.min(keepCount, dice.length); i++) {
        const original = dice.find(d => d === sorted[i] && !d.kept);
        if (original) original.kept = true;
      }
    }

    // Exploding dice: x or x>n
    if (special.includes('x')) {
      // Simple implementation - explode on max
      dice.forEach(die => {
        if (die.result === die.sides && !die.exploded) {
          die.exploded = true;
          // Add explosion roll
          const explodedRoll = Math.floor(Math.random() * die.sides) + 1;
          dice.push({
            result: explodedRoll,
            sides: die.sides,
            kept: true,
            exploded: false
          });
        }
      });
    }
  }

  /**
   * Build formula string for display
   */
  static buildFormula(results, modifier) {
    let formula = results.map(r => r.formula).join(' + ');
    if (modifier > 0) formula += ` + ${modifier}`;
    if (modifier < 0) formula += ` - ${Math.abs(modifier)}`;
    return formula;
  }

  /**
   * Build formula for a single part
   */
  static buildPartFormula(dice, part) {
    const kept = dice.filter(d => d.kept);
    const dropped = dice.filter(d => !d.kept);
    
    let formula = `[${kept.map(d => d.result).join(', ')}]`;
    if (dropped.length > 0) {
      formula += ` (dropped: ${dropped.map(d => d.result).join(', ')})`;
    }
    
    return formula;
  }

  /**
   * Send roll to chat with enhanced formatting and visual effects
   */
  static async sendToChat(result, options = {}) {
    const speaker = options.speaker || ChatMessage.getSpeaker();
    const flavor = options.flavor || '';
    
    const content = this.formatRollForChat(result, flavor);
    
    const message = await ChatMessage.create({
      speaker: speaker,
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      flags: {
        'custom-ttrpg': {
          rollData: result
        }
      }
    });

    // Add visual effects based on roll results
    setTimeout(() => {
      this._addRollEffects(result, message);
    }, 100);

    return message;
  }

  /**
   * Add visual effects based on roll results
   */
  static _addRollEffects(result, message) {
    const target = `.chat-message[data-message-id="${message.id}"]`;
    
    // Check for critical rolls
    const hasCritical = result.rolled.some(die => 
      die.result === die.sides && die.sides === 20
    );
    const hasFumble = result.rolled.some(die => 
      die.result === 1 && die.sides === 20
    );

    if (hasCritical) {
      // Critical success effect
      if (game.effects) {
        game.effects.playEffect('critical-hit', target);
      }
    } else if (hasFumble) {
      // Fumble effect - could add a specific fumble effect
      console.log('Fumble rolled!');
    }

    // High damage rolls get extra effects
    if (result.flavor?.toLowerCase().includes('damage') && result.total >= 15) {
      if (game.effects) {
        if (result.flavor.toLowerCase().includes('fire')) {
          game.effects.playEffect('fire-damage', target);
        } else if (result.flavor.toLowerCase().includes('ice')) {
          game.effects.playEffect('ice-damage', target);
        } else if (result.flavor.toLowerCase().includes('lightning')) {
          game.effects.playEffect('lightning-damage', target);
        }
      }
    }

    // Healing effects
    if (result.flavor?.toLowerCase().includes('healing')) {
      if (game.effects) {
        game.effects.playEffect('healing', target);
      }
    }
  }

  /**
   * Format roll result for chat display
   */
  static formatRollForChat(result, flavor = '') {
    let content = `<div class="dice-roll">`;
    
    if (flavor) {
      content += `<div class="dice-flavor">${flavor}</div>`;
    }
    
    content += `<div class="dice-formula">${result.expression}</div>`;
    content += `<div class="dice-tooltip">`;
    
    // Show individual rolls
    result.parts.forEach(part => {
      content += `<div class="dice-part">`;
      content += `<div class="part-formula">${part.count}d${part.sides}${part.special}</div>`;
      content += `<div class="part-result">${part.formula}</div>`;
      content += `</div>`;
    });
    
    if (result.modifier !== 0) {
      content += `<div class="dice-modifier">Modifier: ${result.modifier}</div>`;
    }
    
    content += `</div>`;
    content += `<h4 class="dice-total">Total: ${result.total}</h4>`;
    content += `</div>`;
    
    return content;
  }

  /**
   * Roll attribute check with advantage/disadvantage
   */
  static async rollAttributeCheck(attribute, bonus = 0, options = {}) {
    let expression = '1d20';
    
    if (options.advantage) {
      expression = '2d20kh1';
    } else if (options.disadvantage) {
      expression = '2d20kl1';
    }
    
    if (bonus !== 0) {
      expression += (bonus >= 0 ? '+' : '') + bonus;
    }
    
    return await this.roll(expression, {
      ...options,
      flavor: `${attribute} Check${options.advantage ? ' (Advantage)' : ''}${options.disadvantage ? ' (Disadvantage)' : ''}`
    });
  }

  /**
   * Roll damage with type
   */
  static async rollDamage(expression, damageType = 'physical', options = {}) {
    return await this.roll(expression, {
      ...options,
      flavor: `${damageType.charAt(0).toUpperCase() + damageType.slice(1)} Damage`
    });
  }

  /**
   * Get roll history
   */
  static getRollHistory(limit = 10) {
    return this.rollHistory.slice(0, limit);
  }

  /**
   * Clear roll history
   */
  static clearHistory() {
    this.rollHistory = [];
    this.lastRoll = null;
  }
}

// Register global functions for easy access
globalThis.rollDice = DiceEngine.roll.bind(DiceEngine);
globalThis.rollAttribute = DiceEngine.rollAttributeCheck.bind(DiceEngine);
globalThis.rollDamage = DiceEngine.rollDamage.bind(DiceEngine);

// Export for module use
export default DiceEngine;