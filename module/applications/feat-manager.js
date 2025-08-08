/**
 * Feat Manager Application for Custom TTRPG V2
 * Handles character feats, abilities, and progression
 */

export class FeatManager extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "feat-manager",
      template: `systems/${game.system.id}/templates/applications/feat-manager.html`,
      title: "Feat Manager",
      width: 900,
      height: 700,
      resizable: true,
      classes: ["custom-ttrpg", "feat-manager"]
    });
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedFeat = null;
    this.availableFeats = this._getAvailableFeats();
  }

  getData() {
    const data = super.getData();
    const actorData = this.actor.system;
    
    data.actor = this.actor;
    data.class = actorData.class;
    data.level = actorData.level;
    data.availableFeats = this.availableFeats;
    data.selectedFeat = this.selectedFeat;
    data.characterFeats = actorData.feats || [];
    data.featPoints = this._calculateFeatPoints(actorData);
    data.canTakeFeat = this._canTakeFeat();
    
    return data;
  }

  _getAvailableFeats() {
    return {
      "Combat": [
        {
          id: "weapon-mastery",
          name: "Weapon Mastery",
          category: "Combat",
          prerequisites: "Level 4, Proficiency with weapon type",
          description: "Choose a weapon type. You gain +2 to attack and damage rolls with that weapon type.",
          benefits: ["+2 attack bonus", "+2 damage bonus", "Weapon specialization"],
          cost: 1
        },
        {
          id: "critical-strike",
          name: "Critical Strike",
          category: "Combat",
          prerequisites: "Level 6, Weapon Mastery",
          description: "Your critical hits deal additional damage equal to your weapon's damage dice.",
          benefits: ["Enhanced critical damage", "Improved combat effectiveness"],
          cost: 2
        },
        {
          id: "defensive-stance",
          name: "Defensive Stance",
          category: "Combat",
          prerequisites: "Level 3",
          description: "As a bonus action, you can enter a defensive stance that grants +2 AC until the start of your next turn.",
          benefits: ["+2 AC bonus action", "Improved survivability"],
          cost: 1
        }
      ],
      "Magic": [
        {
          id: "spell-focus",
          name: "Spell Focus",
          category: "Magic",
          prerequisites: "Level 4, Ability to cast spells",
          description: "Choose a school of magic. Spells from that school have their save DC increased by 1.",
          benefits: ["+1 spell save DC", "School specialization"],
          cost: 1
        },
        {
          id: "metamagic",
          name: "Metamagic",
          category: "Magic",
          prerequisites: "Level 6, Spell Focus",
          description: "You can modify your spells with metamagic effects like Empower, Extend, or Quicken.",
          benefits: ["Spell modification", "Enhanced casting"],
          cost: 2
        },
        {
          id: "magical-resistance",
          name: "Magical Resistance",
          category: "Magic",
          prerequisites: "Level 5",
          description: "You have advantage on saving throws against spells and magical effects.",
          benefits: ["Advantage on spell saves", "Magic resistance"],
          cost: 2
        }
      ],
      "Skills": [
        {
          id: "skill-expertise",
          name: "Skill Expertise",
          category: "Skills",
          prerequisites: "Level 3",
          description: "Choose a skill you are proficient in. You gain expertise in that skill, doubling your proficiency bonus.",
          benefits: ["Double proficiency bonus", "Skill mastery"],
          cost: 1
        },
        {
          id: "jack-of-all-trades",
          name: "Jack of All Trades",
          category: "Skills",
          prerequisites: "Level 4",
          description: "You can add half your proficiency bonus to any ability check that doesn't already include your proficiency bonus.",
          benefits: ["Half proficiency to all skills", "Versatility"],
          cost: 1
        },
        {
          id: "reliable-talent",
          name: "Reliable Talent",
          category: "Skills",
          prerequisites: "Level 8, Skill Expertise",
          description: "Whenever you make an ability check with a skill you have expertise in, you can treat a d20 roll of 9 or lower as a 10.",
          benefits: ["Minimum roll of 10", "Consistent performance"],
          cost: 2
        }
      ],
      "Social": [
        {
          id: "charismatic-leader",
          name: "Charismatic Leader",
          category: "Social",
          prerequisites: "Level 4, Charisma 14+",
          description: "You can inspire your allies with words of encouragement. As an action, grant allies within 30 feet temporary HP.",
          benefits: ["Inspire allies", "Temporary HP granting"],
          cost: 1
        },
        {
          id: "diplomat",
          name: "Diplomat",
          category: "Social",
          prerequisites: "Level 5, Charismatic Leader",
          description: "You have advantage on Charisma checks when interacting with NPCs and can sense their true intentions.",
          benefits: ["Advantage on social checks", "Insight into intentions"],
          cost: 2
        }
      ],
      "Survival": [
        {
          id: "survivalist",
          name: "Survivalist",
          category: "Survival",
          prerequisites: "Level 3",
          description: "You are adept at surviving in the wilderness. You can find food and water for yourself and up to 5 others.",
          benefits: ["Wilderness survival", "Resource finding"],
          cost: 1
        },
        {
          id: "tracker",
          name: "Tracker",
          category: "Survival",
          prerequisites: "Level 4, Survivalist",
          description: "You can track creatures across any terrain and determine their number, size, and how long ago they passed.",
          benefits: ["Enhanced tracking", "Environmental awareness"],
          cost: 1
        }
      ]
    };
  }

  _calculateFeatPoints(actorData) {
    const level = actorData.level || 1;
    // Grant feat points at levels 4, 8, 12, 16, 20
    let featPoints = 0;
    if (level >= 4) featPoints++;
    if (level >= 8) featPoints++;
    if (level >= 12) featPoints++;
    if (level >= 16) featPoints++;
    if (level >= 20) featPoints++;
    
    // Subtract points spent on feats
    const characterFeats = actorData.feats || [];
    featPoints -= characterFeats.length;
    
    return Math.max(0, featPoints);
  }

  _canTakeFeat() {
    const actorData = this.actor.system;
    const featPoints = this._calculateFeatPoints(actorData);
    return featPoints > 0 && this.selectedFeat;
  }

  _checkPrerequisites(feat) {
    const actorData = this.actor.system;
    const level = actorData.level || 1;
    const attributes = actorData.attributes || {};
    
    if (!feat.prerequisites) return true;
    
    const prereqs = feat.prerequisites.split(', ');
    for (const prereq of prereqs) {
      if (prereq.includes('Level')) {
        const requiredLevel = parseInt(prereq.match(/\d+/)[0]);
        if (level < requiredLevel) return false;
      } else if (prereq.includes('+')) {
        const attr = prereq.split(' ')[0].toLowerCase();
        const requiredValue = parseInt(prereq.match(/\d+/)[0]);
        const currentValue = attributes[attr]?.value || 0;
        if (currentValue < requiredValue) return false;
      } else if (prereq.includes('Proficiency') || prereq.includes('Ability')) {
        // Check if character has the required feat/ability
        const characterFeats = actorData.feats || [];
        const hasPrereq = characterFeats.some(f => f.name.toLowerCase().includes(prereq.toLowerCase()));
        if (!hasPrereq) return false;
      }
    }
    
    return true;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Feat selection
    html.find('.feat-item').click(this._onFeatSelect.bind(this));
    
    // Take feat button
    html.find('#take-feat-btn').click(this._onTakeFeat.bind(this));
    
    // Remove feat button
    html.find('.remove-feat-btn').click(this._onRemoveFeat.bind(this));
    
    // Category filtering
    html.find('.category-filter').click(this._onCategoryFilter.bind(this));
  }

  async _onFeatSelect(event) {
    event.preventDefault();
    const featElement = event.currentTarget;
    const featId = featElement.dataset.featId;
    const category = featElement.dataset.category;
    
    // Find the feat data
    const categoryFeats = this.availableFeats[category] || [];
    const feat = categoryFeats.find(f => f.id === featId);
    
    if (feat) {
      this.selectedFeat = feat;
      this.render(true);
    }
  }

  async _onTakeFeat(event) {
    event.preventDefault();
    
    if (!this.selectedFeat || !this._canTakeFeat()) {
      ui.notifications.warn("Cannot take this feat!");
      return;
    }
    
    // Check prerequisites
    if (!this._checkPrerequisites(this.selectedFeat)) {
      ui.notifications.error("You do not meet the prerequisites for this feat!");
      return;
    }
    
    const actorData = this.actor.system;
    const characterFeats = actorData.feats || [];
    
    // Check if already taken
    if (characterFeats.some(f => f.id === this.selectedFeat.id)) {
      ui.notifications.warn("You already have this feat!");
      return;
    }
    
    // Add the feat
    characterFeats.push({
      id: this.selectedFeat.id,
      name: this.selectedFeat.name,
      category: this.selectedFeat.category,
      description: this.selectedFeat.description,
      benefits: this.selectedFeat.benefits,
      levelTaken: actorData.level
    });
    
    await this.actor.update({
      'system.feats': characterFeats
    });
    
    this.render(true);
    ui.notifications.info(`Feat "${this.selectedFeat.name}" acquired!`);
  }

  async _onRemoveFeat(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const featId = button.dataset.featId;
    
    const confirmed = await Dialog.confirm({
      title: "Remove Feat",
      content: "Are you sure you want to remove this feat? This action cannot be undone.",
      defaultYes: false
    });

    if (confirmed) {
      const actorData = this.actor.system;
      const characterFeats = actorData.feats || [];
      
      const updatedFeats = characterFeats.filter(f => f.id !== featId);
      
      await this.actor.update({
        'system.feats': updatedFeats
      });
      
      this.render(true);
      ui.notifications.info("Feat removed!");
    }
  }

  async _onCategoryFilter(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const category = button.dataset.category;
    
    // Toggle category visibility
    const categorySection = button.closest('.feat-category');
    const featList = categorySection.querySelector('.feats-list');
    
    if (featList.style.display === 'none') {
      featList.style.display = 'block';
      button.innerHTML = '<i class="fas fa-chevron-down"></i>';
    } else {
      featList.style.display = 'none';
      button.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }
  }
}

// Register the application
Hooks.once("ready", () => {
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.FeatManager = FeatManager;
});
