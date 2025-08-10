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
    html.find('#import-selected-btn').click(this._onImportSelected.bind(this));
    html.find('#import-all-btn').click(this._onImportAll.bind(this));
    
    // Combatant management
    html.find('#add-combatant-btn').click(this._onAddCombatant.bind(this));
    html.find('.remove-combatant-btn').click(this._onRemoveCombatant.bind(this));
    html.find('.edit-initiative-btn').click(this._onEditInitiative.bind(this));
    html.find('.link-actor-btn').click(this._onLinkActor.bind(this));
    
    // Health management
    html.find('.damage-btn').click(this._onDamage.bind(this));
    html.find('.heal-btn').click(this._onHeal.bind(this));
    html.find('.quick-atk-btn').click(this._onQuickAttack.bind(this));
    html.find('.quick-dmg-btn').click(this._onQuickDamage.bind(this));
    
    // Status effects
    html.find('.add-status-btn').click(this._onAddStatus.bind(this));
    html.find('.remove-status-btn').click(this._onRemoveStatus.bind(this));
  }

  _linkedActorOf(combatant) {
    if (!combatant?.actorId) return null;
    return game.actors.get(combatant.actorId) || null;
  }

  async _onImportSelected(event) {
    event.preventDefault();
    const tokens = canvas?.tokens?.controlled || [];
    if (!tokens.length) return ui.notifications.warn('Select tokens to import.');
    for (const t of tokens) {
      const a = t.actor;
      const name = t.name || a?.name || 'Token';
      const maxHp = a?.system?.attributes?.hp?.max ?? 20;
      const curHp = a?.system?.attributes?.hp?.value ?? maxHp;
      const ac = a?.system?.combat?.defense ?? 10;
      this.combatants.push({
        id: foundry.utils.randomID(),
        name, type: (a ? 'player' : 'npc'),
        maxHp: maxHp, currentHp: curHp,
        initiativeBonus: 0, initiative: 0, ac,
        statusEffects: [], isActive: true,
        actorId: a?.id || null
      });
    }
    this.render(true);
  }

  async _onImportAll(event) {
    event.preventDefault();
    const tokens = canvas?.tokens?.placeables || [];
    if (!tokens.length) return ui.notifications.warn('No tokens on scene.');
    for (const t of tokens) {
      const a = t.actor;
      const name = t.name || a?.name || 'Token';
      const maxHp = a?.system?.attributes?.hp?.max ?? 20;
      const curHp = a?.system?.attributes?.hp?.value ?? maxHp;
      const ac = a?.system?.combat?.defense ?? 10;
      this.combatants.push({
        id: foundry.utils.randomID(),
        name, type: (a ? 'player' : 'npc'),
        maxHp: maxHp, currentHp: curHp,
        initiativeBonus: 0, initiative: 0, ac,
        statusEffects: [], isActive: true,
        actorId: a?.id || null
      });
    }
    this.render(true);
  }

  async _onLinkActor(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.combatantId;
    const c = this.combatants.find(x => x.id === id);
    if (!c) return;
    const actors = game.actors.filter(a => a.type === 'character');
    if (!actors.length) return ui.notifications.warn('No actors available.');
    const opts = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    const content = `<form><div class="form-group"><label>Actor:</label><select id="lnk">${opts}</select></div></form>`;
    new Dialog({ title: `Link Actor - ${c.name}`, content, buttons: {
      link: { label: 'Link', callback: async html => { c.actorId = html.find('#lnk').val(); this.render(true); }},
      close: { label: 'Close' }
    }}).render(true);
  }

  async _onQuickAttack(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.combatantId;
    const c = this.combatants.find(x => x.id === id);
    if (!c) return;
    const actor = this._linkedActorOf(c);
    const atk = Number(actor?.system?.combat?.attackBonus ?? 0);
    const eq = actor?.system?.equipmentBonuses || {};
    const extra = Number(eq.attack || 0);
    const crit = Number(actor?.system?.attributes?.crit ?? 20);
    const roll = await (new Roll(`1d20 + ${atk} + ${extra}`)).roll({ async: true });
    const d20 = roll.terms?.[0]?.results?.[0]?.result || roll.dice?.[0]?.total;
    const isCrit = d20 >= crit;
    const card = `<div class="ctt-roll-card"><div><b>${c.name} Attack</b> ${isCrit ? '<span style="color:#ffd700">(CRIT!)</span>' : ''}</div><div>Total: <b>${roll.total}</b></div><div class="muted">Base ${atk} + Equip ${extra}</div></div>`;
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: card });
  }

  async _onQuickDamage(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.combatantId;
    const c = this.combatants.find(x => x.id === id);
    if (!c) return;
    const actor = this._linkedActorOf(c);
    const dice = actor?.system?.combat?.damageDice || '1d4';
    const bonus = Number(actor?.system?.combat?.damageBonus || 0);
    const eq = actor?.system?.equipmentBonuses || {};
    const extra = Number(eq.attack || 0);
    const roll = await (new Roll(`${dice} + ${bonus} + ${extra}`)).roll({ async: true });
    const card = `<div class="ctt-roll-card"><div><b>${c.name} Damage</b></div><div>Total: <b>${roll.total}</b></div><div class="muted">Dice ${dice} + Bonus ${bonus} + Equip ${extra}</div></div>`;
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: card });
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
    
    // Process end of turn effects for current combatant
    await this._processEndOfTurnEffects();
    
    this.currentTurn = (this.currentTurn + 1) % this.combatants.length;
    
    // If we've completed a full round
    if (this.currentTurn === 0) {
      this.round++;
      await this._processRoundEnd();
    }
    
    // Process start of turn effects for new combatant
    await this._processStartOfTurnEffects();
    
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
            // Sync to linked actor if available
            const actor = this._linkedActorOf(combatant);
            if (actor?.system?.attributes?.hp) {
              const cur = Number(actor.system.attributes.hp.value || 0);
              await actor.update({ 'system.attributes.hp.value': Math.max(0, cur - damage) });
            }
            
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
            // Sync to linked actor if available
            const actor = this._linkedActorOf(combatant);
            if (actor?.system?.attributes?.hp) {
              const cur = Number(actor.system.attributes.hp.value || 0);
              const max = Number(actor.system.attributes.hp.max || combatant.maxHp || 0);
              await actor.update({ 'system.attributes.hp.value': Math.min(max, cur + healing) });
            }
            
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
      const result = await game.dice.roll(`1d20+${combatant.initiativeBonus}`, {
        flavor: `${combatant.name} Initiative`,
        sendToChat: false
      });
      combatant.initiative = result.total;
      combatant.initiativeRoll = result;
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

  async _processEndOfTurnEffects() {
    if (this.combatants.length === 0) return;
    
    const currentCombatant = this.combatants[this.currentTurn];
    if (!currentCombatant) return;

    // Process damage over time effects
    for (const effect of currentCombatant.statusEffects) {
      if (effect.name === 'poisoned' && effect.damagePerTurn) {
        currentCombatant.currentHp = Math.max(0, currentCombatant.currentHp - effect.damagePerTurn);
        ui.notifications.warn(`${currentCombatant.name} takes ${effect.damagePerTurn} poison damage!`);
      }
    }

    // Regeneration effects
    if (currentCombatant.regeneration) {
      const healAmount = currentCombatant.regeneration;
      currentCombatant.currentHp = Math.min(currentCombatant.maxHp, currentCombatant.currentHp + healAmount);
      ui.notifications.info(`${currentCombatant.name} regenerates ${healAmount} HP!`);
    }
  }

  async _processStartOfTurnEffects() {
    if (this.combatants.length === 0) return;
    
    const currentCombatant = this.combatants[this.currentTurn];
    if (!currentCombatant) return;

    // Check for incapacitating effects
    const incapacitatingEffects = ['stunned', 'paralyzed', 'unconscious'];
    const hasIncapacitatingEffect = currentCombatant.statusEffects.some(effect => 
      incapacitatingEffects.includes(effect.name)
    );

    if (hasIncapacitatingEffect) {
      ui.notifications.warn(`${currentCombatant.name} is incapacitated and loses their turn!`);
      // Auto-skip turn if incapacitated
      setTimeout(() => this._onNextTurn({ preventDefault: () => {} }), 1500);
    }

    // Apply ongoing beneficial effects
    for (const effect of currentCombatant.statusEffects) {
      if (effect.name === 'blessed' && effect.bonus) {
        ui.notifications.info(`${currentCombatant.name} has +${effect.bonus} to rolls this turn!`);
      }
    }
  }

  async _processRoundEnd() {
    // Update all status effects
    this._updateStatusEffects();
    
    // Check for combat end conditions
    const activeCombatants = this.combatants.filter(c => c.currentHp > 0);
    const playerTypes = activeCombatants.filter(c => c.type === 'player');
    const enemyTypes = activeCombatants.filter(c => c.type === 'enemy');
    
    if (playerTypes.length === 0) {
      ui.notifications.error("All players are down! Combat continues...");
    } else if (enemyTypes.length === 0) {
      ui.notifications.info("All enemies defeated! Consider ending combat.");
    }

    // Apply round-based effects
    for (const combatant of this.combatants) {
      // Concentration checks for spell casters
      if (combatant.concentrating) {
        ui.notifications.info(`${combatant.name} must maintain concentration...`);
      }
    }
  }

  // Enhanced attack rolling with modifiers
  async rollAttack(combatantId, attackBonus = 0, advantage = false, disadvantage = false) {
    const combatant = this.combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    let expression = '1d20';
    if (advantage && !disadvantage) {
      expression = '2d20kh1';
    } else if (disadvantage && !advantage) {
      expression = '2d20kl1';
    }

    if (attackBonus !== 0) {
      expression += (attackBonus >= 0 ? '+' : '') + attackBonus;
    }

    const result = await game.dice.roll(expression, {
      flavor: `${combatant.name} Attack Roll`,
      speaker: { alias: combatant.name }
    });

    return result;
  }

  // Enhanced damage rolling
  async rollDamage(combatantId, damageExpression, damageType = 'physical') {
    const combatant = this.combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const result = await game.dice.rollDamage(damageExpression, damageType, {
      speaker: { alias: combatant.name }
    });

    return result;
  }

  // Apply damage with resistance/vulnerability calculations
  async applyDamage(combatantId, damage, damageType = 'physical') {
    const combatant = this.combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    let finalDamage = damage;

    // Apply resistances/vulnerabilities (simplified)
    if (combatant.resistances?.includes(damageType)) {
      finalDamage = Math.floor(damage / 2);
      ui.notifications.info(`${combatant.name} resists ${damageType} damage!`);
    } else if (combatant.vulnerabilities?.includes(damageType)) {
      finalDamage = damage * 2;
      ui.notifications.warn(`${combatant.name} is vulnerable to ${damageType} damage!`);
    }

    combatant.currentHp = Math.max(0, combatant.currentHp - finalDamage);
    
    if (combatant.currentHp <= 0) {
      ui.notifications.warn(`${combatant.name} is unconscious!`);
      // Add unconscious status effect
      combatant.statusEffects.push({
        name: 'unconscious',
        duration: 999,
        appliedRound: this.round
      });
    }

    this.render(true);
    return finalDamage;
  }

  // Automated saving throw
  async rollSavingThrow(combatantId, attribute, dc, advantage = false, disadvantage = false) {
    const combatant = this.combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    // Simple attribute bonus calculation (would be more complex in real implementation)
    const attributeBonus = Math.floor((combatant[attribute] || 10 - 10) / 2);
    
    let expression = '1d20';
    if (advantage && !disadvantage) {
      expression = '2d20kh1';
    } else if (disadvantage && !advantage) {
      expression = '2d20kl1';
    }

    if (attributeBonus !== 0) {
      expression += (attributeBonus >= 0 ? '+' : '') + attributeBonus;
    }

    const result = await game.dice.roll(expression, {
      flavor: `${combatant.name} ${attribute.toUpperCase()} Save (DC ${dc})`,
      speaker: { alias: combatant.name }
    });

    const success = result.total >= dc;
    
    setTimeout(() => {
      if (success) {
        ui.notifications.info(`${combatant.name} succeeds the saving throw!`);
      } else {
        ui.notifications.warn(`${combatant.name} fails the saving throw!`);
      }
    }, 1000);

    return { result: result.total, success: success };
  }

  // Bulk initiative rolling for NPCs
  async rollBulkInitiative(combatantIds) {
    const combatants = this.combatants.filter(c => combatantIds.includes(c.id));
    
    for (const combatant of combatants) {
      const result = await game.dice.roll(`1d20+${combatant.initiativeBonus}`, {
        flavor: `${combatant.name} Initiative`,
        sendToChat: false
      });
      combatant.initiative = result.total;
      combatant.initiativeRoll = result;
    }

    // Re-sort by initiative
    this.combatants.sort((a, b) => b.initiative - a.initiative);
    this.render(true);
  }
}

// Register the application
Hooks.once("ready", () => {
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.CombatTracker = CombatTracker;
});
