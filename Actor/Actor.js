/**
 * CustomActor with full class progression, resource tracking, and level-based features
 */
export class CustomActor extends Actor {
  
  prepareBaseData() {
    super.prepareBaseData();
    if (this.type !== 'character') return;

    // Initialize core character data
    this.system.class ||= "";
    this.system.level ||= 1;
    this.system.experience ||= 0;

    // Initialize base attributes
    this.system.attributes ||= {
      hp: { value: 10, max: 10 },
      str: { value: 8, max: 8 },
      dex: { value: 8, max: 8 },
      end: { value: 8, max: 8 },
      wis: { value: 8, max: 8 },
      int: { value: 8, max: 8 },
      cha: { value: 8, max: 8 },
      crit: 20
    };
    
    // Initialize combat stats
    this.system.combat ||= {
      attackBonus: 0,
      defense: 10,
      damageBonus: 0,
      damageDice: "1d4",
      utilityDice: "1d4"
    };

    // Initialize class-specific resources
    this.system.resources ||= {};
    
    // Initialize character notes and features
    this.system.notes ||= "";
    this.system.unlockedFeatures ||= [];
    this.system.availableSpells ||= [];
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type !== 'character') return;

    const cls = this.system.class;
    const level = this.system.level;
    const classInfo = CONFIG.CustomTTRPG.ClassInfo?.[cls];
    
    if (!classInfo) return;

    // Apply base stats from class
    this._applyBaseStats(classInfo);
    
    // Apply level progression
    this._applyLevelProgression(classInfo, level);
    
    // Calculate derived combat stats
    this._calculateCombatStats(classInfo);
    
    // Initialize class-specific resources
    this._initializeClassResources(classInfo, cls);
    
    // Update unlocked features
    this._updateUnlockedFeatures(classInfo, level);
    
    // Update available spells
    this._updateAvailableSpells(classInfo, cls);
  }

  _applyBaseStats(classInfo) {
    const baseStats = classInfo.baseStats;
    
    // Set attribute maximums from class base stats
    for (const [stat, value] of Object.entries(baseStats)) {
      const key = stat.toLowerCase();
      
      if (key === 'health') continue; // Handle HP separately
      if (key === 'critroll') {
        this.system.attributes.crit = value;
        continue;
      }
      if (key.includes('dice')) {
        this.system.combat[key.toLowerCase()] = value;
        continue;
      }
      
      const attr = this.system.attributes[key];
      if (attr) {
        attr.max = value;
        // Set current value to max if not set or if it exceeds max
        if (!attr.value || attr.value > value) {
          attr.value = value;
        }
      }
    }
  }

  _applyLevelProgression(classInfo, level) {
    const progression = classInfo.levelProgression?.[level.toString()];
    if (!progression) return;

    // Set HP from level progression
    const baseHP = progression.hp || classInfo.baseStats.Health || 15;
    
    // Special case for Warlock - Dark Hunger prevents HP growth
    if (this.system.class === "Warlock") {
      this.system.attributes.hp.max = 15; // Always stays at 15
    } else {
      // For other classes, use progression HP + END modifier
      const end = this.system.attributes.end.value || 0;
      const hpMultiplier = game.settings.get("custom-ttrpg","hpMultiplier") || 2;
      this.system.attributes.hp.max = baseHP + Math.floor(end * hpMultiplier);
    }
    
    // Ensure current HP doesn't exceed max
    if (this.system.attributes.hp.value > this.system.attributes.hp.max) {
      this.system.attributes.hp.value = this.system.attributes.hp.max;
    }
  }

  _calculateCombatStats(classInfo) {
    const str = this.system.attributes.str.value || 0;
    const dex = this.system.attributes.dex.value || 0;
    const end = this.system.attributes.end.value || 0;

    // Calculate attack bonus (varies by class)
    this.system.combat.attackBonus = Math.floor((str + dex) / 4);
    
    // Calculate defense rating
    this.system.combat.defense = 10 + Math.floor(dex / 2);
    
    // Calculate damage bonus
    this.system.combat.damageBonus = Math.floor(str / 3);

    // Update crit threshold based on DEX and class features
    const baseCrit = classInfo.baseStats.CritRoll || 20;
    let critReduction = Math.floor(dex / 10);
    
    // Apply Monk's Deft Hands feature
    if (this.system.class === "Monk") {
      const level = this.system.level;
      if (level >= 12) critReduction += 1;
      if (level >= 16) critReduction += 1;  
      if (level >= 18) critReduction += 1;
      if (level >= 19) critReduction += 1;
      if (level >= 20) critReduction += 1;
    }
    
    this.system.attributes.crit = Math.max(1, baseCrit - critReduction);
  }

  _initializeClassResources(classInfo, cls) {
    const resources = classInfo.resources || {};
    
    for (const [resourceName, resourceData] of Object.entries(resources)) {
      if (!this.system.resources[resourceName]) {
        this.system.resources[resourceName] = {
          value: 0,
          max: resourceData.max,
          description: resourceData.description,
          color: resourceData.color
        };
      }
      // Update max in case it changed
      this.system.resources[resourceName].max = resourceData.max;
    }

    // Special resource calculations
    if (cls === "Wizard") {
      // Calculate spell slots based on level and WIS
      const level = this.system.level;
      const wis = this.system.attributes.wis.value || 0;
      const progression = classInfo.levelProgression?.[level.toString()];
      
      let baseSlots = 0;
      for (let i = 1; i <= level; i++) {
        const levelData = classInfo.levelProgression?.[i.toString()];
        if (levelData?.features) {
          for (const feature of levelData.features) {
            if (feature.includes("Spell Slot")) {
              const match = feature.match(/\+(\d+)/);
              if (match) baseSlots += parseInt(match[1]);
            }
          }
        }
      }
      
      const wisBonus = Math.floor(wis / 20); // +1 slot per 20 WIS
      this.system.resources.spellSlots = this.system.resources.spellSlots || {};
      this.system.resources.spellSlots.max = baseSlots + wisBonus;
      this.system.resources.spellSlots.value = this.system.resources.spellSlots.value || this.system.resources.spellSlots.max;
    }

    if (cls === "Warlock" && this.system.level >= 20) {
      // Ritualist feature increases ritual slots
      if (this.system.resources.activeRituals) {
        this.system.resources.activeRituals.max = 5;
      }
    }
  }

  _updateUnlockedFeatures(classInfo, level) {
    const allFeatures = classInfo.classFeatures || {};
    const unlockedFeatures = [];
    
    for (const [featureName, featureData] of Object.entries(allFeatures)) {
      if (level >= featureData.level) {
        unlockedFeatures.push({
          name: featureName,
          level: featureData.level,
          description: featureData.description
        });
      }
    }
    
    this.system.unlockedFeatures = unlockedFeatures;
  }

  _updateAvailableSpells(classInfo, cls) {
    let spells = [];
    
    if (cls === "Monk" && classInfo.spells) {
      // Monks get spells from all categories
      Object.values(classInfo.spells).forEach(category => {
        if (Array.isArray(category)) {
          spells = spells.concat(category);
        }
      });
    } else if (classInfo.spells) {
      // Other classes get their spell list
      spells = Array.isArray(classInfo.spells) ? classInfo.spells : [];
    }
    
    this.system.availableSpells = spells;
  }

  // Utility methods for resource management
  adjustResource(resourceName, amount) {
    const resource = this.system.resources[resourceName];
    if (!resource) return false;
    
    const newValue = Math.max(0, Math.min(resource.max, resource.value + amount));
    return this.update({[`system.resources.${resourceName}.value`]: newValue});
  }

  canCastSpell(spellName, cost = 1) {
    // Check if character has required resources for spell
    const cls = this.system.class;
    
    if (cls === "Wizard") {
      return this.system.resources.spellSlots?.value >= cost;
    } else if (cls === "Monk") {
      // Check for harmony or specific boons
      return this.system.resources.harmony?.value >= cost;
    } else if (cls === "Warlock") {
      // Warlock magic depends on pacts/rituals
      return true; // Simplified for now
    }
    
    return false;
  }

  levelUp() {
    const newLevel = this.system.level + 1;
    if (newLevel > 20) return false;
    
    return this.update({
      "system.level": newLevel,
      "system.experience": 0 // Reset XP for next level
    });
  }
}