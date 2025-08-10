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
    // New: roll when clicking attribute labels in the new HTML
    html.find('.attributes-grid .attribute-block > label').click(this._onAttributeLabelClick.bind(this));

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
    // New: quick HP adjust via click/wheel on HP input
    html.find('input[name="system.attributes.hp.value"]').on('click', this._onHpClick.bind(this));
    html.find('input[name="system.attributes.hp.value"]').on('wheel', this._onHpWheel.bind(this));

    // Initiative roll
    html.find('.initiative-roll').click(this._onInitiativeRoll.bind(this));
    // New: double-click combat grid to roll initiative
    html.find('.combat-grid').on('dblclick', this._onInitiativeRoll.bind(this));

    // Quick dice roller
    html.find('.quick-roll').click(this._onQuickRoll.bind(this));

    // Rest buttons
    html.find('.short-rest').click(this._onShortRest.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));

    // Spells: double-click a spell card to post to chat (non-destructive)
    html.find('.spells .spell-item').on('dblclick', this._onSpellItemActivate.bind(this));
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

  async _onAttributeRoll(event) {
    event.preventDefault();
    const attribute = event.currentTarget.dataset.attribute;
    const modifier = this.actor.getAttributeModifier(attribute);
    
    await game.dice.rollAttributeCheck(attribute.toUpperCase(), modifier, {
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async _onSkillRoll(event) {
    event.preventDefault();
    const skill = event.currentTarget.dataset.skill;
    const bonus = this.actor.getSkillBonus(skill);
    
    await game.dice.roll(`1d20+${bonus}`, {
      flavor: `${skill.charAt(0).toUpperCase() + skill.slice(1)} Check`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async _onAttackRoll(event) {
    event.preventDefault();
    const weapon = event.currentTarget.dataset.weapon;
    const attackBonus = this.actor.system.combat.attackBonus || 0;
    
    await game.dice.roll(`1d20+${attackBonus}`, {
      flavor: `${weapon || 'Weapon'} Attack`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async _onDamageRoll(event) {
    event.preventDefault();
    const damageExpression = event.currentTarget.dataset.damage || '1d6';
    const damageType = event.currentTarget.dataset.damageType || 'physical';
    
    await game.dice.rollDamage(damageExpression, damageType, {
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async _onItemEquip(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const category = event.currentTarget.dataset.category;
    
    await this.actor.toggleEquipped(itemId, category);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    
    const confirmed = await Dialog.confirm({
      title: "Delete Item",
      content: "Are you sure you want to delete this item?",
      defaultYes: false
    });

    if (confirmed) {
      await this.actor.removeFromInventory(itemId);
    }
  }

  async _onHealthChange(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const amount = parseInt(event.currentTarget.dataset.amount) || 1;
    
    if (action === 'damage') {
      await this.actor.takeDamage(amount);
    } else if (action === 'heal') {
      await this.actor.heal(amount);
    }
  }

  async _onInitiativeRoll(event) {
    event.preventDefault();
    const dexModifier = this.actor.getAttributeModifier('dex');
    const initiativeBonus = this.actor.system.combat.initiative || 0;
    const totalBonus = dexModifier + initiativeBonus;
    
    await game.dice.roll(`1d20+${totalBonus}`, {
      flavor: 'Initiative',
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  // Map attribute label clicks to rolls
  async _onAttributeLabelClick(event) {
    event.preventDefault();
    const label = event.currentTarget.textContent?.trim() || '';
    const attribute = this._attributeLabelToKey(label);
    if (!attribute) return;
    const modifier = this.actor.getAttributeModifier(attribute);
    await game.dice.rollAttributeCheck(attribute.toUpperCase(), modifier, {
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  _attributeLabelToKey(label) {
    const map = {
      'strength': 'str',
      'dexterity': 'dex',
      'endurance': 'end',
      'intelligence': 'int',
      'wisdom': 'wis',
      'charisma': 'cha',
      'health': null,
      'critical roll': null
    };
    return map[label.toLowerCase()] ?? null;
  }

  async _onHpClick(event) {
    // Ctrl-click to heal 1, Alt-click to damage 1
    if (event.ctrlKey || event.metaKey) {
      await this.actor.heal(1);
    } else if (event.altKey) {
      await this.actor.takeDamage(1);
    }
  }

  async _onHpWheel(event) {
    // Scroll up to heal, down to damage (Shift for x5)
    event.preventDefault();
    const delta = event.originalEvent?.deltaY ?? event.deltaY ?? 0;
    const magnitude = (event.shiftKey ? 5 : 1);
    if (delta < 0) {
      await this.actor.heal(magnitude);
    } else if (delta > 0) {
      await this.actor.takeDamage(magnitude);
    }
  }

  async _onSpellItemActivate(event) {
    event.preventDefault();
    const spellEl = event.currentTarget;
    const name = spellEl.querySelector('h5')?.textContent?.trim() || 'Spell';
    const type = spellEl.querySelector('.spell-type')?.textContent?.trim();
    const tier = spellEl.querySelector('.spell-tier')?.textContent?.trim();
    const cost = spellEl.querySelector('.spell-cost')?.textContent?.trim();
    const effect = spellEl.querySelector('.spell-effect')?.textContent?.trim();
    const scaling = spellEl.querySelector('.spell-scaling')?.textContent?.trim();

    const parts = [
      type ? `<div><strong>Type:</strong> ${type}</div>` : '',
      tier ? `<div><strong>${tier}</strong></div>` : '',
      cost ? `<div>${cost}</div>` : '',
      effect ? `<div>${effect}</div>` : '',
      scaling ? `<div>${scaling}</div>` : ''
    ].filter(Boolean).join('');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="spell-chat"><h3>${name}</h3>${parts}</div>`
    });
  }

  async _onQuickRoll(event) {
    event.preventDefault();
    const expression = event.currentTarget.dataset.roll;
    const flavor = event.currentTarget.dataset.flavor || '';
    
    await game.dice.roll(expression, {
      flavor: flavor,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async _onShortRest(event) {
    event.preventDefault();
    
    // Simple short rest - restore some resources
    const updates = {};
    const resources = this.actor.system.resources;
    
    Object.keys(resources).forEach(resource => {
      if (resources[resource].max > 0) {
        const restored = Math.floor(resources[resource].max / 2);
        updates[`system.resources.${resource}.value`] = Math.min(
          resources[resource].max,
          resources[resource].value + restored
        );
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await this.actor.update(updates);
      ui.notifications.info(`${this.actor.name} takes a short rest and recovers some resources.`);
    }
  }

  async _onLongRest(event) {
    event.preventDefault();
    await this.actor.longRest();
  }

  // Drag and drop support
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    
    if (data.type === "Item") {
      return this._onDropItem(event, data);
    }
    
    return super._onDrop(event);
  }

  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;
    
    // Add item to appropriate inventory category
    const category = this._getItemCategory(item);
    await this.actor.addToInventory(item.toObject(), category);
    
    return true;
  }

  _getItemCategory(item) {
    switch (item.type) {
      case 'weapon': return 'weapons';
      case 'armor': return 'armor';
      case 'consumable': return 'consumables';
      case 'valuable': return 'valuables';
      default: return 'equipment';
    }
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
