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
      classes: ["custom-ttrpg", "inventory-manager"],
      dragDrop: [{ dragSelector: ".item-entry", dropSelector: ".category-container" }]
    });
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedItem = null;
    this.selectedItems = new Set();
    this.filters = {
      search: '',
      category: 'all',
      equipped: 'all',
      rarity: 'all'
    };
    this.sortBy = 'name';
    this.sortOrder = 'asc';
  }

  getData() {
    const data = super.getData();
    const actorData = this.actor.system;
    
    data.actor = this.actor;
    data.class = actorData.class;
    data.level = actorData.level;
    
    let inventory = actorData.inventory || this._initializeInventory();
    
    // Apply filters and sorting
    inventory = this._filterAndSortInventory(inventory);
    
    data.inventory = inventory;
    data.selectedItem = this.selectedItem;
    data.selectedItems = Array.from(this.selectedItems);
    data.currency = actorData.currency || { gold: 0, silver: 0, copper: 0 };
    data.carryingCapacity = this._calculateCarryingCapacity(actorData);
    data.currentWeight = this._calculateCurrentWeight(inventory);
    
    // Add filter and sort states
    data.filters = this.filters;
    data.sortBy = this.sortBy;
    data.sortOrder = this.sortOrder;
    
    // Calculate category totals
    data.categoryTotals = this._calculateCategoryTotals(inventory);
    
    // Weight status
    const weightRatio = data.currentWeight / data.carryingCapacity;
    data.weightStatus = weightRatio >= 1 ? 'overloaded' : 
                       weightRatio >= 0.75 ? 'heavy' : 'normal';
    
    // Equipment slots info
    data.equipmentSlots = this._getEquipmentSlots(inventory);
    
    return data;
  }

  _filterAndSortInventory(inventory) {
    const filtered = {};
    
    Object.keys(inventory).forEach(category => {
      if (Array.isArray(inventory[category])) {
        let items = [...inventory[category]];
        
        // Apply search filter
        if (this.filters.search) {
          const search = this.filters.search.toLowerCase();
          items = items.filter(item => 
            item.name?.toLowerCase().includes(search) ||
            item.description?.toLowerCase().includes(search) ||
            item.type?.toLowerCase().includes(search)
          );
        }
        
        // Apply category filter
        if (this.filters.category !== 'all' && this.filters.category !== category) {
          items = [];
        }
        
        // Apply equipped filter
        if (this.filters.equipped === 'equipped') {
          items = items.filter(item => item.equipped);
        } else if (this.filters.equipped === 'unequipped') {
          items = items.filter(item => !item.equipped);
        }
        
        // Apply rarity filter
        if (this.filters.rarity !== 'all') {
          items = items.filter(item => item.rarity === this.filters.rarity);
        }
        
        // Apply sorting
        items.sort((a, b) => {
          let aVal = a[this.sortBy] || '';
          let bVal = b[this.sortBy] || '';
          
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          if (this.sortOrder === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          }
        });
        
        filtered[category] = items;
      } else {
        filtered[category] = inventory[category];
      }
    });
    
    return filtered;
  }

  _calculateCategoryTotals(inventory) {
    const totals = {};
    Object.keys(inventory).forEach(category => {
      if (Array.isArray(inventory[category])) {
        totals[category] = {
          count: inventory[category].length,
          weight: inventory[category].reduce((sum, item) => 
            sum + (item.weight || 0) * (item.quantity || 1), 0),
          value: inventory[category].reduce((sum, item) => 
            sum + (item.value || 0) * (item.quantity || 1), 0)
        };
      }
    });
    return totals;
  }

  _getEquipmentSlots(inventory) {
    const slots = {
      weapon: { main: null, offhand: null },
      armor: { head: null, body: null, feet: null, hands: null },
      accessories: { ring1: null, ring2: null, amulet: null }
    };
    
    // This would be more complex in a real implementation
    // For now, just track equipped items
    if (inventory.weapons) {
      const equippedWeapons = inventory.weapons.filter(w => w.equipped);
      if (equippedWeapons.length > 0) slots.weapon.main = equippedWeapons[0];
      if (equippedWeapons.length > 1) slots.weapon.offhand = equippedWeapons[1];
    }
    
    return slots;
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
    html.find('.item-entry').on('contextmenu', this._onItemRightClick.bind(this));
    
    // Multi-select with Ctrl/Shift
    html.find('.item-entry input[type="checkbox"]').change(this._onItemCheckbox.bind(this));
    
    // Add item button
    html.find('#add-item-btn').click(this._onAddItem.bind(this));
    
    // Remove item button
    html.find('#remove-item-btn').click(this._onRemoveItem.bind(this));
    html.find('#remove-selected-btn').click(this._onRemoveSelectedItems.bind(this));
    
    // Equip/Unequip buttons
    html.find('.equip-btn').click(this._onEquipItem.bind(this));
    html.find('.unequip-btn').click(this._onUnequipItem.bind(this));
    html.find('#equip-selected-btn').click(this._onEquipSelectedItems.bind(this));
    
    // Currency management
    html.find('.currency-input').change(this._onCurrencyChange.bind(this));
    
    // Filters and sorting
    html.find('#search-filter').on('input', this._onSearchFilter.bind(this));
    html.find('#category-filter').change(this._onCategoryFilter.bind(this));
    html.find('#equipped-filter').change(this._onEquippedFilter.bind(this));
    html.find('#rarity-filter').change(this._onRarityFilter.bind(this));
    html.find('.sort-option').click(this._onSort.bind(this));
    
    // Bulk actions
    html.find('#select-all-btn').click(this._onSelectAll.bind(this));
    html.find('#select-none-btn').click(this._onSelectNone.bind(this));
    html.find('#move-selected-btn').click(this._onMoveSelectedItems.bind(this));
    
    // Quick actions
    html.find('.quick-equip').click(this._onQuickEquip.bind(this));
    html.find('.quick-drop').click(this._onQuickDrop.bind(this));
    html.find('.item-split').click(this._onSplitItem.bind(this));
    html.find('.item-merge').click(this._onMergeItems.bind(this));
    
    // Weight management
    html.find('#optimize-weight-btn').click(this._onOptimizeWeight.bind(this));
    html.find('#drop-heaviest-btn').click(this._onDropHeaviest.bind(this));
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

  // Enhanced inventory methods for new functionality

  async _onItemCheckbox(event) {
    const itemId = event.currentTarget.dataset.itemId;
    if (event.currentTarget.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
  }

  async _onSearchFilter(event) {
    this.filters.search = event.target.value;
    this.render(true);
  }

  async _onCategoryFilter(event) {
    this.filters.category = event.target.value;
    this.render(true);
  }

  async _onEquippedFilter(event) {
    this.filters.equipped = event.target.value;
    this.render(true);
  }

  async _onRarityFilter(event) {
    this.filters.rarity = event.target.value;
    this.render(true);
  }

  async _onSort(event) {
    const sortBy = event.currentTarget.dataset.sort;
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
    this.render(true);
  }

  async _onSelectAll(event) {
    event.preventDefault();
    const inventory = this.getData().inventory;
    this.selectedItems.clear();
    
    Object.values(inventory).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(item => this.selectedItems.add(item.id));
      }
    });
    
    this.render(true);
  }

  async _onSelectNone(event) {
    event.preventDefault();
    this.selectedItems.clear();
    this.render(true);
  }

  async _onRemoveSelectedItems(event) {
    event.preventDefault();
    if (this.selectedItems.size === 0) {
      ui.notifications.warn("No items selected!");
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Delete Selected Items",
      content: `Are you sure you want to delete ${this.selectedItems.size} selected items?`,
      defaultYes: false
    });

    if (confirmed) {
      for (const itemId of this.selectedItems) {
        await this.actor.removeFromInventory(itemId);
      }
      this.selectedItems.clear();
      this.render(true);
    }
  }

  async _onEquipSelectedItems(event) {
    event.preventDefault();
    if (this.selectedItems.size === 0) {
      ui.notifications.warn("No items selected!");
      return;
    }

    for (const itemId of this.selectedItems) {
      const inventory = this.actor.system.inventory;
      for (const [category, items] of Object.entries(inventory)) {
        if (Array.isArray(items)) {
          const item = items.find(i => i.id === itemId);
          if (item && (category === 'weapons' || category === 'armor')) {
            await this.actor.toggleEquipped(itemId, category);
          }
        }
      }
    }
    
    this.selectedItems.clear();
    this.render(true);
  }

  async _onMoveSelectedItems(event) {
    event.preventDefault();
    if (this.selectedItems.size === 0) {
      ui.notifications.warn("No items selected!");
      return;
    }

    const content = `
      <form>
        <div class="form-group">
          <label>Move to category:</label>
          <select id="target-category">
            <option value="weapons">Weapons</option>
            <option value="armor">Armor</option>
            <option value="equipment">Equipment</option>
            <option value="consumables">Consumables</option>
            <option value="valuables">Valuables</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: "Move Items",
      content,
      buttons: {
        move: {
          icon: '<i class="fas fa-arrows-alt"></i>',
          label: 'Move Items',
          callback: async html => {
            const targetCategory = html.find('#target-category').val();
            await this._moveItemsToCategory(Array.from(this.selectedItems), targetCategory);
            this.selectedItems.clear();
            this.render(true);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'move'
    }).render(true);
  }

  async _moveItemsToCategory(itemIds, targetCategory) {
    const updateData = {};
    const inventory = foundry.utils.deepClone(this.actor.system.inventory);

    itemIds.forEach(itemId => {
      for (const [sourceCategory, items] of Object.entries(inventory)) {
        if (Array.isArray(items)) {
          const itemIndex = items.findIndex(i => i.id === itemId);
          if (itemIndex !== -1) {
            const item = items.splice(itemIndex, 1)[0];
            if (!inventory[targetCategory]) inventory[targetCategory] = [];
            inventory[targetCategory].push(item);
          }
        }
      }
    });

    updateData['system.inventory'] = inventory;
    await this.actor.update(updateData);
  }

  async _onQuickEquip(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const category = event.currentTarget.dataset.category;
    
    const inventory = foundry.utils.deepClone(this.actor.system.inventory);
    if (inventory[category]) {
      inventory[category].forEach(item => {
        if (item.id !== itemId) item.equipped = false;
      });
      const targetItem = inventory[category].find(i => i.id === itemId);
      if (targetItem) targetItem.equipped = true;
    }

    await this.actor.update({ 'system.inventory': inventory });
    this.render(true);
  }

  async _onQuickDrop(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    
    const confirmed = await Dialog.confirm({
      title: "Drop Item",
      content: "Drop this item permanently?",
      defaultYes: false
    });

    if (confirmed) {
      await this.actor.removeFromInventory(itemId);
      this.render(true);
    }
  }

  async _onOptimizeWeight(event) {
    event.preventDefault();
    
    const data = this.getData();
    if (data.weightStatus !== 'overloaded') {
      ui.notifications.info("Weight is already optimized!");
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Optimize Weight",
      content: "This will automatically drop low-value items to reduce weight. Continue?",
      defaultYes: false
    });

    if (confirmed) {
      await this._performWeightOptimization();
    }
  }

  async _performWeightOptimization() {
    const inventory = foundry.utils.deepClone(this.actor.system.inventory);
    const targetReduction = this._calculateCurrentWeight(inventory) - this._calculateCarryingCapacity(this.actor.system) * 0.75;
    
    const items = [];
    Object.entries(inventory).forEach(([category, categoryItems]) => {
      if (Array.isArray(categoryItems)) {
        categoryItems.forEach(item => {
          const weight = item.weight || 0;
          const value = item.value || 0;
          const valuePerWeight = weight > 0 ? value / weight : value;
          items.push({ ...item, category, valuePerWeight });
        });
      }
    });

    items.sort((a, b) => a.valuePerWeight - b.valuePerWeight);

    let removedWeight = 0;
    const toRemove = [];

    for (const item of items) {
      if (removedWeight >= targetReduction) break;
      if (!item.equipped && item.category !== 'currency') {
        toRemove.push(item);
        removedWeight += (item.weight || 0) * (item.quantity || 1);
      }
    }

    toRemove.forEach(item => {
      inventory[item.category] = inventory[item.category].filter(i => i.id !== item.id);
    });

    await this.actor.update({ 'system.inventory': inventory });
    this.render(true);
    
    ui.notifications.info(`Dropped ${toRemove.length} items, reducing weight by ${removedWeight.toFixed(1)} lbs.`);
  }

  async _onDropHeaviest(event) {
    event.preventDefault();
    
    const inventory = this.actor.system.inventory;
    let heaviestItem = null;
    let heaviestWeight = 0;
    let heaviestCategory = '';

    Object.entries(inventory).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          const totalWeight = (item.weight || 0) * (item.quantity || 1);
          if (totalWeight > heaviestWeight && !item.equipped) {
            heaviestWeight = totalWeight;
            heaviestItem = item;
            heaviestCategory = category;
          }
        });
      }
    });

    if (heaviestItem) {
      const confirmed = await Dialog.confirm({
        title: "Drop Heaviest Item",
        content: `Drop ${heaviestItem.name} (${heaviestWeight} lbs)?`,
        defaultYes: false
      });

      if (confirmed) {
        await this.actor.removeFromInventory(heaviestItem.id);
        this.render(true);
      }
    } else {
      ui.notifications.warn("No unequipped items to drop!");
    }
  }

  // Placeholder methods for template compatibility
  async _onItemRightClick(event) { /* Context menu implementation */ }
  async _onSplitItem(event) { /* Split stackable items */ }
  async _onMergeItems(event) { /* Merge similar items */ }

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
    
    const category = this._getItemCategory(item);
    await this.actor.addToInventory(item.toObject(), category);
    this.render(true);
    
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

// Register the application
Hooks.once("ready", () => {
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.InventoryManager = InventoryManager;
});
