/**
 * Custom Actor class for Custom TTRPG V2
 * Handles character data and calculations
 */

export class CustomActor extends Actor {
  static get type() {
    // Declare the supported document type for clarity (Foundry uses schema);
    // we'll ensure registration allows 'character' in init.js
    return this.documentName;
  }
  prepareBaseData() {
    super.prepareBaseData();
    
    // Initialize system data if it doesn't exist
    if (!this.system) {
      this.system = {};
    }
    
    // Set default values
    const system = this.system;
    system.class = system.class || "Fighter";
    system.level = system.level || 1;
    system.experience = system.experience || 0;
    
    // Initialize attributes if they don't exist
    if (!system.attributes) {
      system.attributes = {
        hp: { value: 10, max: 10 },
        str: { value: 8, max: 8 },
        dex: { value: 8, max: 8 },
        end: { value: 8, max: 8 },
        wis: { value: 8, max: 8 },
        int: { value: 8, max: 8 },
        cha: { value: 8, max: 8 },
        crit: 20
      };
    }
    
    // Initialize combat stats if they don't exist
    if (!system.combat) {
      system.combat = {
        attackBonus: 0,
        defense: 10,
        damageBonus: 0,
        damageDice: "1d4",
        utilityDice: "1d4"
      };
    }
    
    // Initialize other system data
    system.notes = system.notes || "";
    system.resources = system.resources || {};
    system.unlockedFeatures = system.unlockedFeatures || [];
    system.availableSpells = system.availableSpells || [];
    system.feats = system.feats || [];
    system.preferences = system.preferences || { equipmentPreferred: {} };

    // Initialize equipment structure and bonuses
    system.equipment = system.equipment || {
      head: null, chest: null, legs: null, feet: null,
      ring1: null, ring2: null, trinket1: null, magicItem: null,
      mainHand: null, offHand: null, ranged: null
    };
    system.equipmentBonuses = system.equipmentBonuses || {
      attack: 0, defense: 0, magic: 0, health: 0, mana: 0, stamina: 0,
      critChance: 0, critDamage: 0, dodge: 0, block: 0
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    const system = this.system;
    const classInfo = CONFIG.CustomTTRPG?.ClassInfo?.[system.class];
    
    if (classInfo) {
      // Calculate derived stats based on class and attributes
      this._calculateDerivedStats(classInfo);
      
      // Initialize resources based on class
      this._initializeClassResources(classInfo);
    }

    // Recalculate equipment bonuses and apply to combat/attributes (additive for now)
    this._recalculateEquipmentBonuses();

    // Apply feat bonuses after equipment
    this._applyFeatBonuses();
  }

  _applyFeatBonuses() {
    const system = this.system;
    const feats = Array.isArray(system.feats) ? system.feats : [];
    const bonuses = { attack: 0, defense: 0, damage: 0 };
    for (const feat of feats) {
      // Only apply enabled feats (default enabled when flag absent)
      if (feat && feat.enabled === false) continue;
      const benefits = feat?.benefits || [];
      for (const benefit of benefits) {
        const text = String(benefit || '').toLowerCase();
        const numMatch = text.match(/([+\-]?\d+)/);
        const val = numMatch ? Number(numMatch[1]) : 0;
        if (text.includes('attack')) bonuses.attack += val;
        if (text.includes('ac') || text.includes('defense')) bonuses.defense += val;
        if (text.includes('damage')) bonuses.damage += val;
      }
    }
    system.featBonuses = bonuses;
    // Apply to combat
    system.combat.attackBonus = (system.combat.attackBonus || 0) + (bonuses.attack || 0);
    system.combat.defense = (system.combat.defense || 0) + (bonuses.defense || 0);
    system.combat.damageBonus = (system.combat.damageBonus || 0) + (bonuses.damage || 0);
  }

  _recalculateEquipmentBonuses() {
    const system = this.system;
    const bonuses = {
      attack: 0, defense: 0, magic: 0, health: 0, mana: 0, stamina: 0,
      critChance: 0, critDamage: 0, dodge: 0, block: 0
    };
    const equip = system.equipment || {};
    const setCounts = {};
    const applyStats = (stats) => {
      if (!stats) return;
      for (const [k, v] of Object.entries(stats)) {
        if (bonuses.hasOwnProperty(k)) bonuses[k] += Number(v) || 0;
      }
    };
    Object.values(equip).forEach(slot => {
      if (slot?.set) {
        const key = String(slot.set);
        setCounts[key] = (setCounts[key] || 0) + 1;
      }
      applyStats(slot?.stats);
    });
    // Apply set bonus definitions if present
    const setDefs = (CONFIG.CustomTTRPG && CONFIG.CustomTTRPG.SetBonuses) ? CONFIG.CustomTTRPG.SetBonuses : {};
    for (const [setName, count] of Object.entries(setCounts)) {
      const defs = setDefs[setName] || {};
      for (const [thresholdStr, def] of Object.entries(defs)) {
        const threshold = Number(thresholdStr);
        const stats = def?.stats ?? def;
        if (count >= threshold) applyStats(stats);
      }
    }
    system.equipmentBonuses = bonuses;
    system.setCounts = setCounts;

    // Apply simple effects: base values plus equipment bonuses
    const baseAttack = system.combat.attackBonus || 0;
    const baseDefense = system.combat.defense || 0;
    system.combat.attackBonus = baseAttack + (bonuses.attack || 0);
    system.combat.defense = baseDefense + (bonuses.defense || 0);
    // Also scale damage bonus a bit from equipment attack
    system.combat.damageBonus = (system.combat.damageBonus || 0) + Math.max(0, bonuses.attack || 0);
    // Health bonus increases max HP; clamp current value
    const hp = system.attributes?.hp;
    if (hp) {
      hp.max = (hp.max || 0) + (bonuses.health || 0);
      if (hp.value > hp.max) hp.value = hp.max;
    }
  }

  _calculateDerivedStats(classInfo) {
    const system = this.system;
    const attributes = system.attributes;
    
    // Calculate HP multiplier from settings
    const hpMultiplier = game.settings.get("custom-ttrpg", "hpMultiplier") || 2;
    
    // Calculate max HP based on class and END
    const baseHealth = classInfo.baseStats?.Health || 10;
    const endBonus = Math.floor((attributes.end.value - 10) / 2) * hpMultiplier;
    attributes.hp.max = Math.max(1, baseHealth + endBonus);
    
    // Ensure current HP doesn't exceed max
    if (attributes.hp.value > attributes.hp.max) {
      attributes.hp.value = attributes.hp.max;
    }
    
    // Calculate combat stats
    const strBonus = Math.floor((attributes.str.value - 10) / 2);
    const dexBonus = Math.floor((attributes.dex.value - 10) / 2);
    
    system.combat.attackBonus = strBonus + Math.floor(system.level / 2);
    system.combat.defense = 10 + dexBonus + Math.floor(system.level / 3);
    system.combat.damageBonus = strBonus;
    
    // Set damage dice from class
    if (classInfo.baseStats?.DamageDice) {
      system.combat.damageDice = classInfo.baseStats.DamageDice;
    }
    
    if (classInfo.baseStats?.UtilityDice) {
      system.combat.utilityDice = classInfo.baseStats.UtilityDice;
    }
    
    // Set crit roll from class
    if (classInfo.baseStats?.CritRoll) {
      attributes.crit = classInfo.baseStats.CritRoll;
    }
  }

  _initializeClassResources(classInfo) {
    const system = this.system;
    
    // Initialize resources based on class
    if (classInfo.resources) {
      for (const [resourceName, resourceData] of Object.entries(classInfo.resources)) {
        if (!system.resources[resourceName]) {
          system.resources[resourceName] = {
            description: resourceData.description,
            value: resourceData.value,
            max: resourceData.max,
            color: resourceData.color
          };
        }
      }
    }
  }
}
