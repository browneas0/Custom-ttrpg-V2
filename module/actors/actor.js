/**
 * Custom Actor Document for Custom TTRPG V2
 * Enhanced with modern patterns from VTT research
 */

export class CustomActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
    this.prepareBaseData();
    this.prepareDerivedData();
  }

  /** @override */
  prepareBaseData() {
    const actorData = this.system;
    
    // Initialize default structure if needed
    if (!actorData.attributes) {
      actorData.attributes = this._getDefaultAttributes();
    }
    
    if (!actorData.inventory) {
      actorData.inventory = this._getDefaultInventory();
    }
    
    if (!actorData.combat) {
      actorData.combat = this._getDefaultCombat();
    }

    if (!actorData.resources) {
      actorData.resources = this._getDefaultResources();
    }

    if (!actorData.progression) {
      actorData.progression = this._getDefaultProgression();
    }
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this.system;
    
    // Calculate derived attributes
    this._calculateHealthPool(actorData);
    this._calculateDefenses(actorData);
    this._calculateMovement(actorData);
    this._calculateCarryingCapacity(actorData);
    this._calculateSkillBonuses(actorData);
    this._applyClassFeatures(actorData);
    this._applyEquipmentBonuses(actorData);
    this._applyEquipmentSpellSlots(actorData);
  }

  /**
   * Default attribute structure
   */
  _getDefaultAttributes() {
    return {
      hp: { value: 20, max: 20, temp: 0 },
      str: { value: 10, max: 20, modifier: 0 },
      dex: { value: 10, max: 20, modifier: 0 },
      end: { value: 10, max: 20, modifier: 0 },
      int: { value: 10, max: 20, modifier: 0 },
      wis: { value: 10, max: 20, modifier: 0 },
      cha: { value: 10, max: 20, modifier: 0 },
      crit: 20
    };
  }

  /**
   * Default inventory structure
   */
  _getDefaultInventory() {
    return {
      weapons: [],
      armor: [],
      equipment: [],
      consumables: [],
      valuables: [],
      currency: { gold: 0, silver: 0, copper: 0 }
    };
  }

  /**
   * Default combat stats
   */
  _getDefaultCombat() {
    return {
      ac: 10,
      attackBonus: 0,
      damageBonus: 0,
      initiative: 0,
      speed: 30,
      proficiencyBonus: 2
    };
  }

  /**
   * Default resources (mana, stamina, etc.)
   */
  _getDefaultResources() {
    return {
      mana: { value: 0, max: 0 },
      stamina: { value: 0, max: 0 },
      focus: { value: 0, max: 0 }
    };
  }

  /**
   * Default progression data
   */
  _getDefaultProgression() {
    return {
      level: 1,
      experience: 0,
      experienceToNext: 1000,
      class: '',
      subclass: '',
      classFeatures: [],
      proficiencies: {
        weapons: [],
        armor: [],
        skills: [],
        languages: [],
        tools: []
      }
    };
  }

  /**
   * Calculate health pool based on class and endurance
   */
  _calculateHealthPool(actorData) {
    const level = actorData.progression?.level || 1;
    const endurance = actorData.attributes.end.value || 10;
    const endModifier = Math.floor((endurance - 10) / 2);
    
    // Base HP calculation (can be overridden by class features)
    const baseHP = 10 + endModifier;
    const levelHP = (level - 1) * (6 + endModifier);
    
    actorData.attributes.hp.max = Math.max(1, baseHP + levelHP);
    
    // Ensure current HP doesn't exceed max
    if (actorData.attributes.hp.value > actorData.attributes.hp.max) {
      actorData.attributes.hp.value = actorData.attributes.hp.max;
    }
  }

  /**
   * Calculate armor class and other defenses
   */
  _calculateDefenses(actorData) {
    const dexModifier = Math.floor((actorData.attributes.dex.value - 10) / 2);
    
    // Base AC (10 + Dex modifier)
    let ac = 10 + dexModifier;
    
    // Add armor bonuses from equipped items
    const equippedArmor = actorData.inventory.armor?.filter(item => item.equipped) || [];
    equippedArmor.forEach(armor => {
      if (armor.acBonus) ac += armor.acBonus;
    });
    
    actorData.combat.ac = ac;
  }

  /**
   * Apply equipment-based bonuses to combat stats (attack/damage)
   */
  _applyEquipmentBonuses(actorData) {
    const weapons = actorData.inventory.weapons?.filter(w => w.equipped) || [];
    const strMod = Math.floor(((actorData.attributes.str?.value ?? 10) - 10) / 2);
    const dexMod = Math.floor(((actorData.attributes.dex?.value ?? 10) - 10) / 2);

    let bestAttack = actorData.combat.attackBonus || 0;
    let bestDamage = actorData.combat.damageBonus || 0;

    for (const weapon of weapons) {
      const isRanged = (weapon.category || '').toLowerCase() === 'ranged' || weapon.properties?.includes('thrown');
      const finesse = weapon.properties?.includes('finesse');
      const attrMod = finesse ? Math.max(strMod, dexMod) : (isRanged ? dexMod : strMod);

      const proficiency = this.isProficientWith(weapon.name || weapon.id, 'weapons') ? (actorData.combat.proficiencyBonus || 0) : 0;
      const weaponAttack = (weapon.attackBonus || 0) + attrMod + proficiency;
      const weaponDamage = (weapon.damageBonus || 0) + attrMod;

      if (weaponAttack > bestAttack) bestAttack = weaponAttack;
      if (weaponDamage > bestDamage) bestDamage = weaponDamage;
    }

    actorData.combat.attackBonus = bestAttack;
    actorData.combat.damageBonus = bestDamage;
  }

  /**
   * Apply equipment-based spell slot bonuses to resources.spellSlots
   */
  _applyEquipmentSpellSlots(actorData) {
    const resources = actorData.resources || {};
    const spellSlots = resources.spellSlots;
    if (!spellSlots || !spellSlots.slots) return;

    // Aggregate bonuses from equipped items exposing spellSlotsBonus: { level:number, bonus:number }[] or object map
    const equippedItems = [];
    Object.entries(actorData.inventory).forEach(([category, list]) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (item?.equipped) equippedItems.push(item);
      }
    });

    const bonuses = {};
    for (const item of equippedItems) {
      const bonus = item.spellSlotsBonus;
      if (!bonus) continue;
      if (Array.isArray(bonus)) {
        for (const entry of bonus) {
          const lvl = String(entry.level);
          bonuses[lvl] = (bonuses[lvl] || 0) + (entry.bonus || 0);
        }
      } else if (typeof bonus === 'object') {
        for (const [lvl, amount] of Object.entries(bonus)) {
          bonuses[String(lvl)] = (bonuses[String(lvl)] || 0) + (Number(amount) || 0);
        }
      }
    }

    // Apply bonuses to max, clamp value to new max
    Object.entries(bonuses).forEach(([lvl, add]) => {
      const slot = spellSlots.slots[lvl];
      if (!slot) return;
      slot.max = (slot.max || 0) + add;
      slot.value = Math.min(slot.value, slot.max);
    });
  }

  /**
   * Calculate movement speed
   */
  _calculateMovement(actorData) {
    // Base speed is 30, modified by equipment and effects
    let speed = 30;
    
    // Apply armor penalties if any
    const equippedArmor = actorData.inventory.armor?.filter(item => item.equipped) || [];
    equippedArmor.forEach(armor => {
      if (armor.speedPenalty) speed -= armor.speedPenalty;
    });
    
    actorData.combat.speed = Math.max(0, speed);
  }

  /**
   * Calculate carrying capacity
   */
  _calculateCarryingCapacity(actorData) {
    const strength = actorData.attributes.str.value || 10;
    actorData.carryingCapacity = strength * 15; // 15 lbs per STR point
    
    // Calculate current weight
    let currentWeight = 0;
    Object.values(actorData.inventory).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(item => {
          currentWeight += (item.weight || 0) * (item.quantity || 1);
        });
      }
    });
    actorData.currentWeight = currentWeight;
  }

  /**
   * Calculate skill bonuses based on attributes
   */
  _calculateSkillBonuses(actorData) {
    const attributes = actorData.attributes;
    const profBonus = actorData.combat.proficiencyBonus || 2;
    
    // Define skill-to-attribute mapping
    const skillAttributes = {
      acrobatics: 'dex',
      athletics: 'str',
      deception: 'cha',
      history: 'int',
      insight: 'wis',
      intimidation: 'cha',
      investigation: 'int',
      medicine: 'wis',
      nature: 'int',
      perception: 'wis',
      performance: 'cha',
      persuasion: 'cha',
      religion: 'int',
      sleightOfHand: 'dex',
      stealth: 'dex',
      survival: 'wis'
    };
    
    if (!actorData.skills) actorData.skills = {};
    
    Object.entries(skillAttributes).forEach(([skill, attr]) => {
      const attrValue = attributes[attr]?.value || 10;
      const modifier = Math.floor((attrValue - 10) / 2);
      const isProficient = actorData.progression?.proficiencies?.skills?.includes(skill) || false;
      
      actorData.skills[skill] = {
        modifier: modifier,
        proficient: isProficient,
        bonus: modifier + (isProficient ? profBonus : 0)
      };
    });
  }

  /**
   * Apply class-specific features and bonuses
   */
  _applyClassFeatures(actorData) {
    const className = actorData.progression?.class;
    const level = actorData.progression?.level || 1;
    
    if (!className) return;
    
    // Apply proficiency bonus based on level
    actorData.combat.proficiencyBonus = Math.ceil(level / 4) + 1;
    
    // Class-specific calculations can be added here
    // This would typically load from class data files
  }

  /**
   * Enhanced attribute modifier calculation
   */
  getAttributeModifier(attribute) {
    const value = this.system.attributes[attribute]?.value || 10;
    return Math.floor((value - 10) / 2);
  }

  /**
   * Get skill bonus including proficiency
   */
  getSkillBonus(skill) {
    return this.system.skills?.[skill]?.bonus || 0;
  }

  /**
   * Check if actor is proficient with a weapon/armor/tool
   */
  isProficientWith(item, type = 'weapons') {
    const proficiencies = this.system.progression?.proficiencies?.[type] || [];
    return proficiencies.includes(item.toLowerCase());
  }

  /**
   * Add item to inventory
   */
  async addToInventory(itemData, category = 'equipment') {
    const updateData = {};
    const inventory = foundry.utils.deepClone(this.system.inventory);
    
    if (!inventory[category]) inventory[category] = [];
    
    // Generate unique ID if not provided
    if (!itemData.id) {
      itemData.id = foundry.utils.randomID();
    }
    
    inventory[category].push(itemData);
    updateData[`system.inventory`] = inventory;
    
    return await this.update(updateData);
  }

  /**
   * Remove item from inventory
   */
  async removeFromInventory(itemId) {
    const updateData = {};
    const inventory = foundry.utils.deepClone(this.system.inventory);
    
    // Find and remove item from all categories
    Object.keys(inventory).forEach(category => {
      if (Array.isArray(inventory[category])) {
        inventory[category] = inventory[category].filter(item => item.id !== itemId);
      }
    });
    
    updateData[`system.inventory`] = inventory;
    return await this.update(updateData);
  }

  /**
   * Equip/unequip item
   */
  async toggleEquipped(itemId, category) {
    const updateData = {};
    const inventory = foundry.utils.deepClone(this.system.inventory);
    
    const item = inventory[category]?.find(i => i.id === itemId);
    if (item) {
      item.equipped = !item.equipped;
      updateData[`system.inventory`] = inventory;
      
      await this.update(updateData);
      
      // Recalculate derived data after equipment change
      this.prepareDerivedData();
    }
  }

  /**
   * Apply damage with type resistance/vulnerability
   */
  async takeDamage(amount, damageType = 'physical') {
    const currentHP = this.system.attributes.hp.value;
    const newHP = Math.max(0, currentHP - amount);
    
    await this.update({
      'system.attributes.hp.value': newHP
    });
    
    // Check for unconsciousness
    if (newHP <= 0) {
      ui.notifications.warn(`${this.name} is unconscious!`);
    }
    
    return newHP;
  }

  /**
   * Heal damage
   */
  async heal(amount) {
    const currentHP = this.system.attributes.hp.value;
    const maxHP = this.system.attributes.hp.max;
    const newHP = Math.min(maxHP, currentHP + amount);
    
    await this.update({
      'system.attributes.hp.value': newHP
    });
    
    return newHP;
  }

  /**
   * Long rest - restore resources
   */
  async longRest() {
    const updateData = {
      'system.attributes.hp.value': this.system.attributes.hp.max
    };
    
    // Restore all resources to max
    if (this.system.resources.mana) {
      updateData['system.resources.mana.value'] = this.system.resources.mana.max;
    }
    if (this.system.resources.stamina) {
      updateData['system.resources.stamina.value'] = this.system.resources.stamina.max;
    }
    if (this.system.resources.focus) {
      updateData['system.resources.focus.value'] = this.system.resources.focus.max;
    }
    
    await this.update(updateData);
    ui.notifications.info(`${this.name} completes a long rest and recovers fully!`);
  }

  /**
   * Level up the character
   */
  async levelUp() {
    const currentLevel = this.system.progression.level;
    const newLevel = currentLevel + 1;
    
    if (newLevel > 20) {
      ui.notifications.warn("Maximum level reached!");
      return;
    }
    
    const updateData = {
      'system.progression.level': newLevel,
      'system.progression.experience': 0
    };
    
    await this.update(updateData);
    
    // Trigger level up dialog or automation
    ui.notifications.info(`${this.name} reaches level ${newLevel}!`);
  }
}


