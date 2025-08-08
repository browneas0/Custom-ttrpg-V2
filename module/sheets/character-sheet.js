import { showClassInfo } from "../macros.js";

export class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["custom-ttrpg", "sheet", "actor"],
      template: `systems/${game.system.id}/templates/actors/character-sheet.html`,
      width: 650,
      height: 500,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  getData() {
    const context = super.getData();
    
    // Fix data access for templates
    context.class = context.actor.system?.class || "";
    context.attributes = context.actor.system?.attributes || {};
    context.combat = context.actor.system?.combat || {};
    context.notes = context.actor.system?.notes || "";
    context.settings = game.settings.get("custom-ttrpg", "hpMultiplier");
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Class info button
    html.find("#ctt-btn-info").click(() => showClassInfo(this.actor.id));
    
    // Handle input changes with auto-save
    html.find('input, textarea').change(this._onInputChange.bind(this));
    
    // Handle number input spinners
    html.find('input[type="number"]').on('input', this._onInputChange.bind(this));
  }

  async _onInputChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const field = element.name;
    const value = element.type === "number" ? parseInt(element.value) : element.value;
    
    // Update the actor with the new value
    await this.actor.update({ [field]: value });
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