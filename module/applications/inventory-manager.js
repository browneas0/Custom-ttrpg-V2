/**
 * Inventory Manager Application for Custom TTRPG V2
 * Handles equipment, weapons, armor, and item management
 */

export class InventoryManager extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "inventory-manager",
      template: `systems/${game.system.id}/templates/applications/inventory-manager.html`,
      title: "Inventory Manager",
      width: 900,
      height: 700,
      resizable: true,
      classes: ["custom-ttrpg", "inventory-manager"]
    });
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedItem = null;
  }

  getData() {
    const data = super.getData();
    const actorData = this.actor.system;
    
    data.actor = this.actor;
    data.class = actorData.class;
    data.level = actorData.level;
    data.inventory = actorData.inventory || this._initializeInventory();
    data.selectedItem = this.selectedItem;
    data.currency = actorData.currency || { gold: 0, silver: 0, copper: 0 };
    data.carryingCapacity = this._calculateCarryingCapacity(actorData);
    data.currentWeight = this._calculateCurrentWeight(data.inventory);
    
    return data;
  }

  _initializeInventory() {
    return {
      weapons: [],
      armor: [],
      equipment: [],
      consumables: [],
      valuables: []
    };
  }

  _calculateCarryingCapacity(actorData) {
    const str = actorData.attributes?.str?.value || 0;
    return Math.floor(str * 15); // 15 lbs per STR point
  }

  _calculateCurrentWeight(inventory) {
    let weight = 0;
    Object.values(inventory).forEach(category => {
      category.forEach(item => {
        weight += (item.weight || 0) * (item.quantity || 1);
      });
    });
    return weight;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Item selection
    html.find('.item-entry').click(this._onItemSelect.bind(this));
    
    // Add item button
    html.find('#add-item-btn').click(this._onAddItem.bind(this));
    
    // Remove item button
    html.find('#remove-item-btn').click(this._onRemoveItem.bind(this));
    
    // Equip/Unequip buttons
    html.find('.equip-btn').click(this._onEquipItem.bind(this));
    html.find('.unequip-btn').click(this._onUnequipItem.bind(this));
    
    // Currency management
    html.find('.currency-input').change(this._onCurrencyChange.bind(this));
  }

  async _onItemSelect(event) {
    event.preventDefault();
    const itemElement = event.currentTarget;
    const itemId = itemElement.dataset.itemId;
    const category = itemElement.dataset.category;
    
    const inventory = this.getData().inventory;
    const item = inventory[category]?.find(i => i.id === itemId);
    
    if (item) {
      this.selectedItem = { ...item, category };
      this.render(true);
    }
  }

  async _onAddItem(event) {
    event.preventDefault();
    
    const content = `
      <form>
        <div class="form-group">
          <label>Item Name:</label>
          <input type="text" id="item-name" required>
        </div>
        <div class="form-group">
          <label>Category:</label>
          <select id="item-category">
            <option value="weapons">Weapons</option>
            <option value="armor">Armor</option>
            <option value="equipment">Equipment</option>
            <option value="consumables">Consumables</option>
            <option value="valuables">Valuables</option>
          </select>
        </div>
        <div class="form-group">
          <label>Quantity:</label>
          <input type="number" id="item-quantity" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Weight (lbs):</label>
          <input type="number" id="item-weight" value="0" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Value (gold):</label>
          <input type="number" id="item-value" value="0" min="0">
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea id="item-description" rows="3"></textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Item",
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: 'Add Item',
          callback: async html => {
            const itemData = {
              id: foundry.utils.randomID(),
              name: html.find('#item-name').val(),
              category: html.find('#item-category').val(),
              quantity: parseInt(html.find('#item-quantity').val()) || 1,
              weight: parseFloat(html.find('#item-weight').val()) || 0,
              value: parseInt(html.find('#item-value').val()) || 0,
              description: html.find('#item-description').val(),
              equipped: false
            };

            await this._addItemToInventory(itemData);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'add'
    }).render(true);
  }

  async _addItemToInventory(itemData) {
    const actorData = this.actor.system;
    const inventory = actorData.inventory || this._initializeInventory();
    const category = itemData.category;
    
    if (!inventory[category]) {
      inventory[category] = [];
    }
    
    inventory[category].push(itemData);
    
    await this.actor.update({
      'system.inventory': inventory
    });
    
    this.render(true);
    ui.notifications.info(`Added ${itemData.name} to inventory!`);
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    
    if (!this.selectedItem) {
      ui.notifications.warn("Please select an item to remove!");
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Remove Item",
      content: `Are you sure you want to remove ${this.selectedItem.name}?`,
      defaultYes: false
    });

    if (confirmed) {
      const actorData = this.actor.system;
      const inventory = actorData.inventory;
      const category = this.selectedItem.category;
      
      inventory[category] = inventory[category].filter(item => item.id !== this.selectedItem.id);
      
      await this.actor.update({
        'system.inventory': inventory
      });
      
      this.selectedItem = null;
      this.render(true);
      ui.notifications.info("Item removed from inventory!");
    }
  }

  async _onEquipItem(event) {
    event.preventDefault();
    
    if (!this.selectedItem) {
      ui.notifications.warn("Please select an item to equip!");
      return;
    }

    const actorData = this.actor.system;
    const inventory = actorData.inventory;
    const category = this.selectedItem.category;
    
    // Find the item and toggle equipped status
    const item = inventory[category].find(i => i.id === this.selectedItem.id);
    if (item) {
      item.equipped = !item.equipped;
      
      await this.actor.update({
        'system.inventory': inventory
      });
      
      this.selectedItem.equipped = item.equipped;
      this.render(true);
      
      const status = item.equipped ? "equipped" : "unequipped";
      ui.notifications.info(`${item.name} ${status}!`);
    }
  }

  async _onUnequipItem(event) {
    // This is handled by _onEquipItem as a toggle
    this._onEquipItem(event);
  }

  async _onCurrencyChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const currencyType = element.dataset.currency;
    const value = parseInt(element.value) || 0;
    
    const actorData = this.actor.system;
    const currency = actorData.currency || { gold: 0, silver: 0, copper: 0 };
    currency[currencyType] = value;
    
    await this.actor.update({
      'system.currency': currency
    });
  }
}

// Register the application
Hooks.once("ready", () => {
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.InventoryManager = InventoryManager;
});
