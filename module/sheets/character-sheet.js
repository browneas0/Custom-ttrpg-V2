import { showClassInfo } from "../macros.js";

export class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["custom-ttrpg", "sheet", "actor"],
      template: `systems/${game.system.id}/templates/actors/character-sheet.html`,
      width: 750,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  getData() {
    const context = super.getData();
    const actorData = context.actor.system;
    const classInfo = CONFIG.CustomTTRPG.ClassInfo ? CONFIG.CustomTTRPG.ClassInfo[actorData.class] : null;
    
    // Basic actor data
    context.class = actorData.class || "";
    context.level = actorData.level || 1;
    context.experience = actorData.experience || 0;
    context.nextLevel = Math.min(20, (actorData.level || 1) + 1);
    context.attributes = actorData.attributes || {};
    context.combat = actorData.combat || {};
    context.resources = actorData.resources || {};
    context.notes = actorData.notes || "";
    context.unlockedFeatures = actorData.unlockedFeatures || [];
    context.availableSpells = actorData.availableSpells || [];
    context.currentAugmentation = actorData.currentAugmentation || "";

    // Add class-specific attribute effects
    if (classInfo && classInfo.attributeEffects) {
      context.strEffect = classInfo.attributeEffects.STR || "";
      context.dexEffect = classInfo.attributeEffects.DEX || "";
      context.endEffect = classInfo.attributeEffects.END || "";
      context.wisEffect = classInfo.attributeEffects.WIS || "";
      context.intEffect = classInfo.attributeEffects.INT || "";
      context.chaEffect = classInfo.attributeEffects.CHA || "";
    }

    // Process spell categories for Monks
    if (actorData.class === "Monk" && classInfo && classInfo.spells) {
      context.spellCategories = {};
      for (const category in classInfo.spells) {
        const spells = classInfo.spells[category];
        if (Array.isArray(spells)) {
          context.spellCategories[category.charAt(0).toUpperCase() + category.slice(1)] = spells;
        }
      }
    }

    // Add settings
    context.settings = game.settings.get("custom-ttrpg", "hpMultiplier");
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Class info button
    html.find("#ctt-btn-info").click(() => showClassInfo(this.actor.id));
    
    // Handle input changes with auto-save
    html.find('input, textarea, select').change(this._onInputChange.bind(this));
    
    // Handle number input spinners
    html.find('input[type="number"]').on('input', this._onInputChange.bind(this));

    // Resource management buttons
    html.find('.resource-btn').click(this._onResourceChange.bind(this));

    // Level up button
    html.find('#level-up-btn').click(this._onLevelUp.bind(this));

    // Spell/ability activation (placeholder for future)
    html.find('.spell-item').click(this._onSpellClick.bind(this));
  }

  async _onInputChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const field = element.name;
    let value = element.value;

    // Handle different input types
    if (element.type === "number") {
      value = parseInt(value) || 0;
    } else if (element.type === "checkbox") {
      value = element.checked;
    }
    
    // Update the actor with the new value
    await this.actor.update({ [field]: value });
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

    await this.actor.update({ [`system.resources.${resourceName}.value`]: newValue });

    // Handle special resource interactions
    await this._handleResourceInteractions(resourceName, newValue);
  }

  async _handleResourceInteractions(resourceName, newValue) {
    const actorData = this.actor.system;
    
    // Monk Harmony generation
    if (actorData.class === "Monk" && ["bushido", "chi", "zen"].includes(resourceName.toLowerCase())) {
      const bushido = actorData.resources.bushido ? actorData.resources.bushido.value : 0;
      const chi = actorData.resources.chi ? actorData.resources.chi.value : 0;
      const zen = actorData.resources.zen ? actorData.resources.zen.value : 0;

      // Check if we have one of each boon type
      if (bushido > 0 && chi > 0 && zen > 0) {
        const harmony = actorData.resources.harmony ? actorData.resources.harmony.value : 0;
        const maxHarmony = actorData.resources.harmony ? actorData.resources.harmony.max : 10;
        
        if (harmony < maxHarmony) {
          await this.actor.update({ 
            "system.resources.harmony.value": Math.min(maxHarmony, harmony + 1)
          });
          
          ui.notifications.info("Harmony gained from balanced boons!");
          
          // Check for Enlightenment
          if (harmony + 1 >= 10) {
            ui.notifications.warn("⚡ ENLIGHTENED STATE ACHIEVED! ⚡");
          }
        }
      }
    }
  }

  async _onLevelUp(event) {
    event.preventDefault();
    const currentLevel = this.actor.system.level || 1;
    const newLevel = Math.min(20, currentLevel + 1);
    
    if (newLevel === currentLevel) return;

    // Show level up confirmation
    const confirmed = await Dialog.confirm({
      title: "Level Up",
      content: `<p>Level up from ${currentLevel} to ${newLevel}?</p><p>This will unlock new class features and update your character.</p>`,
      defaultYes: true
    });

    if (confirmed) {
      await this.actor.update({ "system.level": newLevel });
      ui.notifications.info(`Leveled up to ${newLevel}! Check your Features tab for new abilities.`);
    }
  }

  async _onSpellClick(event) {
    event.preventDefault();
    const spellElement = event.currentTarget;
    const spellName = spellElement.querySelector("h5");
    
    if (!spellName) return;

    // Placeholder for spell casting
    ui.notifications.info(`Spell/Ability: ${spellName.textContent} (casting system coming soon!)`);
  }

  async _updateObject(event, formData) {
    // Handle form submission
    return super._updateObject(event, formData);
  }

  async _onDrop(event) {
    // Handle item drops in future
    return super._onDrop(event);
  }
}

// Register Handlebars helpers for the template
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
  if (!max || max === 0) return 0;
  return Math.round((current / max) * 100);
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

Handlebars.registerHelper('divide', function(a, b) {
  if (!b || b === 0) return 0;
  return a / b;
});

Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

Handlebars.registerHelper('and', function() {
  return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});

Handlebars.registerHelper('formatNumber', function(num) {
  return num.toLocaleString();
});

Handlebars.registerHelper('capitalize', function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});
