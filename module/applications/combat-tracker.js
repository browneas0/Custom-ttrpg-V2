/**
 * Combat Tracker Application for Custom TTRPG V2
 * Handles initiative, turn management, and combat automation
 */

export class CombatTracker extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "combat-tracker",
      template: `systems/${game.system.id}/templates/applications/combat-tracker.html`,
      title: "Combat Tracker",
      width: 1000,
      height: 700,
      resizable: true,
      classes: ["custom-ttrpg", "combat-tracker"]
    });
  }

  constructor(options = {}) {
    super(options);
    this.combatants = [];
    this.currentTurn = 0;
    this.round = 1;
    this.isActive = false;
    this.initiativeOrder = [];
  }

  getData() {
    const data = super.getData();
    
    data.combatants = this.combatants;
    data.currentTurn = this.currentTurn;
    data.round = this.round;
    data.isActive = this.isActive;
    data.currentCombatant = this.combatants[this.currentTurn] || null;
    data.nextCombatant = this.combatants[(this.currentTurn + 1) % this.combatants.length] || null;
    
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Combat control buttons
    html.find('#start-combat-btn').click(this._onStartCombat.bind(this));
    html.find('#end-combat-btn').click(this._onEndCombat.bind(this));
    html.find('#next-turn-btn').click(this._onNextTurn.bind(this));
    html.find('#previous-turn-btn').click(this._onPreviousTurn.bind(this));
    
    // Combatant management
    html.find('#add-combatant-btn').click(this._onAddCombatant.bind(this));
    html.find('.remove-combatant-btn').click(this._onRemoveCombatant.bind(this));
    html.find('.edit-initiative-btn').click(this._onEditInitiative.bind(this));
    
    // Health management
    html.find('.damage-btn').click(this._onDamage.bind(this));
    html.find('.heal-btn').click(this._onHeal.bind(this));
    
    // Status effects
    html.find('.add-status-btn').click(this._onAddStatus.bind(this));
    html.find('.remove-status-btn').click(this._onRemoveStatus.bind(this));
  }

  async _onStartCombat(event) {
    event.preventDefault();
    
    if (this.combatants.length === 0) {
      ui.notifications.warn("No combatants added to combat!");
      return;
    }

    // Roll initiative for all combatants
    await this._rollInitiative();
    
    // Sort by initiative
    this.combatants.sort((a, b) => b.initiative - a.initiative);
    
    this.isActive = true;
    this.currentTurn = 0;
    this.round = 1;
    
    this.render(true);
    
    // Announce combat start
    const firstCombatant = this.combatants[0];
    ui.notifications.info(`Combat started! ${firstCombatant.name} goes first with initiative ${firstCombatant.initiative}!`);
  }

  async _onEndCombat(event) {
    event.preventDefault();
    
    this.isActive = false;
    this.combatants = [];
    this.currentTurn = 0;
    this.round = 1;
    
    this.render(true);
    ui.notifications.info("Combat ended!");
  }

  async _onNextTurn(event) {
    event.preventDefault();
    
    if (!this.isActive || this.combatants.length === 0) return;
    
    this.currentTurn = (this.currentTurn + 1) % this.combatants.length;
    
    // If we've completed a full round
    if (this.currentTurn === 0) {
      this.round++;
    }
    
    const currentCombatant = this.combatants[this.currentTurn];
    this.render(true);
    
    ui.notifications.info(`${currentCombatant.name}'s turn! (Round ${this.round})`);
  }

  async _onPreviousTurn(event) {
    event.preventDefault();
    
    if (!this.isActive || this.combatants.length === 0) return;
    
    this.currentTurn = (this.currentTurn - 1 + this.combatants.length) % this.combatants.length;
    
    // If we've gone back a full round
    if (this.currentTurn === this.combatants.length - 1) {
      this.round = Math.max(1, this.round - 1);
    }
    
    this.render(true);
  }

  async _onAddCombatant(event) {
    event.preventDefault();
    
    const content = `
      <form>
        <div class="form-group">
          <label>Name:</label>
          <input type="text" id="combatant-name" required>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <select id="combatant-type">
            <option value="player">Player Character</option>
            <option value="npc">NPC</option>
            <option value="enemy">Enemy</option>
          </select>
        </div>
        <div class="form-group">
          <label>Max HP:</label>
          <input type="number" id="combatant-max-hp" value="20" min="1">
        </div>
        <div class="form-group">
          <label>Initiative Bonus:</label>
          <input type="number" id="combatant-initiative-bonus" value="0">
        </div>
        <div class="form-group">
          <label>AC (Armor Class):</label>
          <input type="number" id="combatant-ac" value="10" min="0">
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Combatant",
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: 'Add Combatant',
          callback: async html => {
            const combatantData = {
              id: foundry.utils.randomID(),
              name: html.find('#combatant-name').val(),
              type: html.find('#combatant-type').val(),
              maxHp: parseInt(html.find('#combatant-max-hp').val()) || 20,
              currentHp: parseInt(html.find('#combatant-max-hp').val()) || 20,
              initiativeBonus: parseInt(html.find('#combatant-initiative-bonus').val()) || 0,
              initiative: 0,
              ac: parseInt(html.find('#combatant-ac').val()) || 10,
              statusEffects: [],
              isActive: true
            };

            this.combatants.push(combatantData);
            this.render(true);
            ui.notifications.info(`Added ${combatantData.name} to combat!`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'add'
    }).render(true);
  }

  async _onRemoveCombatant(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const combatantId = button.dataset.combatantId;
    
    const confirmed = await Dialog.confirm({
      title: "Remove Combatant",
      content: "Are you sure you want to remove this combatant from combat?",
      defaultYes: false
    });

    if (confirmed) {
      this.combatants = this.combatants.filter(c => c.id !== combatantId);
      
      // Adjust current turn if necessary
      if (this.currentTurn >= this.combatants.length) {
        this.currentTurn = Math.max(0, this.combatants.length - 1);
      }
      
      this.render(true);
      ui.notifications.info("Combatant removed from combat!");
    }
  }

  async _onEditInitiative(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const combatantId = button.dataset.combatantId;
    const combatant = this.combatants.find(c => c.id === combatantId);
    
    if (!combatant) return;

    const content = `
      <form>
        <div class="form-group">
          <label>Initiative Roll:</label>
          <input type="number" id="initiative-roll" value="${combatant.initiative - combatant.initiativeBonus}" min="1" max="20">
        </div>
        <div class="form-group">
          <label>Initiative Bonus:</label>
          <input type="number" id="initiative-bonus" value="${combatant.initiativeBonus}">
        </div>
      </form>
    `;

    new Dialog({
      title: `Edit Initiative - ${combatant.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: 'Save',
          callback: async html => {
            const roll = parseInt(html.find('#initiative-roll').val()) || 0;
            const bonus = parseInt(html.find('#initiative-bonus').val()) || 0;
            const total = roll + bonus;
            
            combatant.initiative = total;
            combatant.initiativeBonus = bonus;
            
            // Re-sort if combat is active
            if (this.isActive) {
              this.combatants.sort((a, b) => b.initiative - a.initiative);
              // Find new position of current combatant
              this.currentTurn = this.combatants.findIndex(c => c.id === combatantId);
            }
            
            this.render(true);
            ui.notifications.info(`${combatant.name}'s initiative updated to ${total}!`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'save'
    }).render(true);
  }

  async _onDamage(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const combatantId = button.dataset.combatantId;
    const combatant = this.combatants.find(c => c.id === combatantId);
    
    if (!combatant) return;

    const content = `
      <form>
        <div class="form-group">
          <label>Damage Amount:</label>
          <input type="number" id="damage-amount" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Damage Type:</label>
          <select id="damage-type">
            <option value="physical">Physical</option>
            <option value="fire">Fire</option>
            <option value="ice">Ice</option>
            <option value="lightning">Lightning</option>
            <option value="poison">Poison</option>
            <option value="psychic">Psychic</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: `Apply Damage - ${combatant.name}`,
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart-broken"></i>',
          label: 'Apply Damage',
          callback: async html => {
            const damage = parseInt(html.find('#damage-amount').val()) || 1;
            const type = html.find('#damage-type').val();
            
            combatant.currentHp = Math.max(0, combatant.currentHp - damage);
            
            this.render(true);
            
            if (combatant.currentHp <= 0) {
              ui.notifications.warn(`${combatant.name} is unconscious!`);
            } else {
              ui.notifications.info(`${combatant.name} takes ${damage} ${type} damage! (${combatant.currentHp}/${combatant.maxHp} HP)`);
            }
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'apply'
    }).render(true);
  }

  async _onHeal(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const combatantId = button.dataset.combatantId;
    const combatant = this.combatants.find(c => c.id === combatantId);
    
    if (!combatant) return;

    const content = `
      <form>
        <div class="form-group">
          <label>Healing Amount:</label>
          <input type="number" id="heal-amount" value="1" min="1">
        </div>
      </form>
    `;

    new Dialog({
      title: `Apply Healing - ${combatant.name}`,
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart"></i>',
          label: 'Apply Healing',
          callback: async html => {
            const healing = parseInt(html.find('#heal-amount').val()) || 1;
            
            combatant.currentHp = Math.min(combatant.maxHp, combatant.currentHp + healing);
            
            this.render(true);
            ui.notifications.info(`${combatant.name} heals ${healing} HP! (${combatant.currentHp}/${combatant.maxHp} HP)`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'apply'
    }).render(true);
  }

  async _onAddStatus(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const combatantId = button.dataset.combatantId;
    const combatant = this.combatants.find(c => c.id === combatantId);
    
    if (!combatant) return;

    const content = `
      <form>
        <div class="form-group">
          <label>Status Effect:</label>
          <select id="status-effect">
            <option value="poisoned">Poisoned</option>
            <option value="stunned">Stunned</option>
            <option value="paralyzed">Paralyzed</option>
            <option value="charmed">Charmed</option>
            <option value="frightened">Frightened</option>
            <option value="invisible">Invisible</option>
            <option value="blessed">Blessed</option>
            <option value="hasted">Hasted</option>
          </select>
        </div>
        <div class="form-group">
          <label>Duration (rounds):</label>
          <input type="number" id="status-duration" value="1" min="1">
        </div>
      </form>
    `;

    new Dialog({
      title: `Add Status Effect - ${combatant.name}`,
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: 'Add Status',
          callback: async html => {
            const effect = html.find('#status-effect').val();
            const duration = parseInt(html.find('#status-duration').val()) || 1;
            
            combatant.statusEffects.push({
              name: effect,
              duration: duration,
              appliedRound: this.round
            });
            
            this.render(true);
            ui.notifications.info(`${combatant.name} is now ${effect} for ${duration} round(s)!`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'add'
    }).render(true);
  }

  async _onRemoveStatus(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const combatantId = button.dataset.combatantId;
    const statusIndex = parseInt(button.dataset.statusIndex);
    const combatant = this.combatants.find(c => c.id === combatantId);
    
    if (!combatant || !combatant.statusEffects[statusIndex]) return;

    const status = combatant.statusEffects[statusIndex];
    combatant.statusEffects.splice(statusIndex, 1);
    
    this.render(true);
    ui.notifications.info(`${combatant.name} is no longer ${status.name}!`);
  }

  async _rollInitiative() {
    for (const combatant of this.combatants) {
      const roll = Math.floor(Math.random() * 20) + 1;
      combatant.initiative = roll + combatant.initiativeBonus;
    }
  }

  _updateStatusEffects() {
    for (const combatant of this.combatants) {
      combatant.statusEffects = combatant.statusEffects.filter(status => {
        const roundsElapsed = this.round - status.appliedRound;
        return roundsElapsed < status.duration;
      });
    }
  }
}

// Register the application
Hooks.once("ready", () => {
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.CombatTracker = CombatTracker;
});
