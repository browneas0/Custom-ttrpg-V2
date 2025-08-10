export class NPCSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["custom-ttrpg", "sheet", "actor", "npc"],
      template: `systems/${game.system.id}/templates/actors/npc-sheet.html`,
      width: 520,
      height: 560,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  getData(options) {
    const base = super.getData(options);
    const sys = this.actor.system || {};
    const equipment = sys.equipment || {};
    const inventory = sys.inventory || {};

    // Normalize loot slots similar to character but minimal
    const slots = {
      weaponMain: equipment.weaponMain || null,
      weaponOff: equipment.weaponOff || null,
      armor: equipment.armor || null,
      accessory: equipment.accessory || null
    };

    return {
      ...base,
      actor: this.actor,
      system: sys,
      stats: sys.attributes || {},
      combat: sys.combat || {},
      slots,
      inventory
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('[data-action="toggle-equip"]').on('click', this._onToggleEquip.bind(this));
    html.find('[data-action="roll-attack"]').on('click', this._onAttack.bind(this));
  }

  async _onToggleEquip(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const slot = el.dataset.slot;
    const itemId = el.dataset.itemId;
    if (!slot || !itemId) return;

    const equipment = foundry.utils.duplicate(this.actor.system.equipment || {});
    equipment[slot] = equipment[slot]?.id === itemId ? null : { id: itemId };
    await this.actor.update({ 'system.equipment': equipment });
  }

  async _onAttack(event) {
    event.preventDefault();
    const attackBonus = this.actor.system?.combat?.attackBonus || 0;
    await game.dice.roll(`1d20+${attackBonus}`, {
      flavor: `${this.actor.name} Attack`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }
}

export default NPCSheet;

