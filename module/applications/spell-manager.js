/**
 * Spell Manager Application for Custom TTRPG V2
 * Handles spell casting, resource management, and spell effects
 */

export class SpellManager extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "spell-manager",
      template: `systems/${game.system.id}/templates/applications/spell-manager.html`,
      title: "Spell Manager",
      width: 800,
      height: 600,
      resizable: true,
      classes: ["custom-ttrpg", "spell-manager"]
    });
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedSpell = null;
    this.castingMode = null;
  }

  getData() {
    const data = super.getData();
    const actorData = this.actor.system;
    const classInfo = CONFIG.CustomTTRPG.ClassInfo?.[actorData.class];
    
    data.actor = this.actor;
    data.class = actorData.class;
    data.level = actorData.level;
    data.resources = actorData.resources || {};
    data.availableSpells = this._getAvailableSpells(classInfo, actorData.class);
    data.selectedSpell = this.selectedSpell;
    data.castingMode = this.castingMode;
    data.canCast = this._canCastSpell();
    
    return data;
  }

  _getAvailableSpells(classInfo, className) {
    if (!classInfo?.spells) return [];
    
    if (className === "Monk" && typeof classInfo.spells === "object") {
      // Return categorized spells for Monk
      return Object.entries(classInfo.spells).map(([category, spells]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        spells: Array.isArray(spells) ? spells : []
      }));
    } else if (Array.isArray(classInfo.spells)) {
      // Return simple spell list for other classes
      return [{
        category: "Spells",
        spells: classInfo.spells.map(spell => ({ name: spell, type: "Spell", cost: "1", effect: "Basic spell effect" }))
      }];
    }
    
    return [];
  }

  _canCastSpell() {
    if (!this.selectedSpell) return false;
    
    const actorData = this.actor.system;
    const spell = this.selectedSpell;
    
    // Check resource costs
    if (spell.cost) {
      const costMatch = spell.cost.match(/(\d+)\s+(\w+)/);
      if (costMatch) {
        const [, amount, resource] = costMatch;
        const resourceData = actorData.resources[resource.toLowerCase()];
        if (!resourceData || resourceData.value < parseInt(amount)) {
          return false;
        }
      }
    }
    
    return true;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Spell selection
    html.find('.spell-item').click(this._onSpellSelect.bind(this));
    
    // Cast spell button
    html.find('#cast-spell-btn').click(this._onCastSpell.bind(this));
    html.find('#spell-macro-btn').click(this._onCreateMacro.bind(this));
    
    // Cancel button
    html.find('#cancel-cast-btn').click(this._onCancelCast.bind(this));
    
    // Resource management
    html.find('.resource-btn').click(this._onResourceChange.bind(this));
  }

  async _onCreateMacro(event) {
    event.preventDefault();
    if (!this.selectedSpell) return ui.notifications.warn('Select a spell first.');
    const s = this.selectedSpell;
    const name = `${this.actor.name}: ${s.name}`;
    const cmd = `(() => { const a=game.actors.get("${this.actor.id}"); const mgr=new game.customTTRPG.SpellManager(a); mgr.selectedSpell=${JSON.stringify(s)}; mgr._onCastSpell(new Event('cast')); })();`;
    let macro = game.macros?.find(m => m.name === name && m.command === cmd);
    if (!macro) macro = await Macro.create({ name, type: 'script', scope: 'global', command: cmd, img: 'icons/svg/book.svg' });
    const slot = game.user.getHotbarMacros().findIndex(m => !m) + 1 || 1;
    await game.user.assignHotbarMacro(macro, slot);
    ui.notifications.info(`Macro "${name}" added to slot ${slot}.`);
  }

  async _onSpellSelect(event) {
    event.preventDefault();
    const spellElement = event.currentTarget;
    const spellName = spellElement.dataset.spellName;
    const category = spellElement.dataset.category;
    
    // Find the spell data
    const categoryData = this.getData().availableSpells.find(cat => cat.category === category);
    const spell = categoryData?.spells.find(s => s.name === spellName);
    
    if (spell) {
      this.selectedSpell = spell;
      this.render(true);
    }
  }

  async _onCastSpell(event) {
    event.preventDefault();
    
    if (!this.selectedSpell || !this._canCastSpell()) {
      ui.notifications.warn("Cannot cast this spell!");
      return;
    }
    
    const spell = this.selectedSpell;
    const actorData = this.actor.system;
    
    // Deduct resources
    if (spell.cost) {
      const costMatch = spell.cost.match(/(\d+)\s+(\w+)/);
      if (costMatch) {
        const [, amount, resource] = costMatch;
        const resourceKey = resource.toLowerCase();
        const currentValue = actorData.resources[resourceKey]?.value || 0;
        const newValue = Math.max(0, currentValue - parseInt(amount));
        
        await this.actor.update({
          [`system.resources.${resourceKey}.value`]: newValue
        });
      }
    }
    
    // Apply spell effects
    await this._applySpellEffects(spell);
    
    // Show casting notification
    ui.notifications.info(`Casting ${spell.name}!`);
    
    // Reset selection
    this.selectedSpell = null;
    this.render(true);
  }

  async _applySpellEffects(spell) {
    // This is a placeholder for spell effect application
    // In a full implementation, this would handle:
    // - Damage/healing calculations
    // - Status effects
    // - Area of effect targeting
    // - Duration tracking
    
    console.log(`Applying effects for ${spell.name}:`, spell.effect);
    
    // For now, just show the effect description
    new Dialog({
      title: `Spell Effect: ${spell.name}`,
      content: `
        <div class="spell-effect-dialog">
          <p><strong>Effect:</strong> ${spell.effect}</p>
          ${spell.scaling ? `<p><strong>Scaling:</strong> ${spell.scaling}</p>` : ''}
          <p><em>Spell effect system coming soon!</em></p>
        </div>
      `,
      buttons: { ok: { label: "Close" } }
    }).render(true);
  }

  async _onCancelCast(event) {
    event.preventDefault();
    this.selectedSpell = null;
    this.render(true);
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
    
    this.render(true);
  }
}

// Register the application
Hooks.once("ready", () => {
  // Add spell manager to the global scope for easy access
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.SpellManager = SpellManager;
});
