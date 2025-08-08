import { CompendiumLoader } from '../compendium-loader.js';

export class EquipmentManager extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "equipment-manager",
            template: "templates/applications/equipment-manager.html",
            title: "Equipment Manager",
            width: 900,
            height: 700,
            resizable: true,
            minimizable: true,
            popOut: true
        });
    }

    constructor(actor, options = {}) {
        super(options);
        this.actor = actor;
        this.compendiumData = null;
        this.draggedItem = null;
        this.equipmentSlots = {
            head: { name: "Head", item: null, icon: "fas fa-helmet-battle" },
            neck: { name: "Neck", item: null, icon: "fas fa-gem" },
            shoulders: { name: "Shoulders", item: null, icon: "fas fa-shield-alt" },
            chest: { name: "Chest", item: null, icon: "fas fa-tshirt" },
            back: { name: "Back", item: null, icon: "fas fa-scroll" },
            wrists: { name: "Wrists", item: null, icon: "fas fa-bracelet" },
            hands: { name: "Hands", item: null, icon: "fas fa-hand-paper" },
            waist: { name: "Waist", item: null, icon: "fas fa-belt" },
            legs: { name: "Legs", item: null, icon: "fas fa-socks" },
            feet: { name: "Feet", item: null, icon: "fas fa-boot" },
            mainHand: { name: "Main Hand", item: null, icon: "fas fa-sword" },
            offHand: { name: "Off Hand", item: null, icon: "fas fa-shield" },
            ring1: { name: "Ring 1", item: null, icon: "fas fa-ring" },
            ring2: { name: "Ring 2", item: null, icon: "fas fa-ring" },
            trinket1: { name: "Trinket 1", item: null, icon: "fas fa-gem" },
            trinket2: { name: "Trinket 2", item: null, icon: "fas fa-gem" }
        };
    }

    async getData(options) {
        const data = await super.getData(options);
        
        // Load compendium data for item search
        if (!this.compendiumData) {
            const loader = new CompendiumLoader();
            this.compendiumData = await loader.getCompendiumData();
        }

        // Load current equipment from actor
        this.loadEquipmentFromActor();

        return {
            ...data,
            actor: this.actor,
            equipmentSlots: this.equipmentSlots,
            inventory: this.actor.system.inventory || [],
            stats: this.calculateEquipmentStats(),
            availableItems: this.getAvailableItems()
        };
    }

    loadEquipmentFromActor() {
        const equipment = this.actor.system.equipment || {};
        
        for (const [slot, slotData] of Object.entries(this.equipmentSlots)) {
            if (equipment[slot]) {
                slotData.item = equipment[slot];
            }
        }
    }

    calculateEquipmentStats() {
        const baseStats = {
            attack: 0,
            defense: 0,
            magic: 0,
            health: 0,
            mana: 0,
            stamina: 0,
            critChance: 0,
            critDamage: 0,
            dodge: 0,
            block: 0
        };

        for (const slotData of Object.values(this.equipmentSlots)) {
            if (slotData.item && slotData.item.stats) {
                for (const [stat, value] of Object.entries(slotData.item.stats)) {
                    if (baseStats.hasOwnProperty(stat)) {
                        baseStats[stat] += value;
                    }
                }
            }
        }

        return baseStats;
    }

    getAvailableItems() {
        if (!this.compendiumData || !this.compendiumData.items) return [];
        
        const items = [];
        for (const category of Object.values(this.compendiumData.items)) {
            for (const subcategory of Object.values(category)) {
                for (const [id, item] of Object.entries(subcategory)) {
                    if (item.type === 'equipment' || item.type === 'weapon' || item.type === 'armor') {
                        items.push({ id, ...item });
                    }
                }
            }
        }
        return items;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Equipment slot click handlers
        html.find('.equipment-slot').on('click', this._onSlotClick.bind(this));
        
        // Drag and drop handlers
        html.find('.equipment-slot').on('dragover', this._onDragOver.bind(this));
        html.find('.equipment-slot').on('drop', this._onDrop.bind(this));
        html.find('.equipment-slot').on('dragenter', this._onDragEnter.bind(this));
        html.find('.equipment-slot').on('dragleave', this._onDragLeave.bind(this));

        // Item list drag handlers
        html.find('.item-entry').on('dragstart', this._onItemDragStart.bind(this));
        html.find('.item-entry').on('dragend', this._onItemDragEnd.bind(this));

        // Unequip buttons
        html.find('.unequip-item').on('click', this._onUnequipItem.bind(this));

        // Search functionality
        html.find('#item-search').on('input', this._onSearchItems.bind(this));
    }

    _onSlotClick(event) {
        const slot = event.currentTarget.dataset.slot;
        const slotData = this.equipmentSlots[slot];
        
        if (slotData.item) {
            this.showItemDetails(slotData.item);
        } else {
            this.showItemSelection(slot);
        }
    }

    _onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    _onDragEnter(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    _onDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    _onDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const slot = event.currentTarget.dataset.slot;
        const itemId = event.dataTransfer.getData('text/plain');
        
        if (itemId && this.draggedItem) {
            this.equipItem(slot, this.draggedItem);
        }
    }

    _onItemDragStart(event) {
        const itemId = event.currentTarget.dataset.itemId;
        this.draggedItem = this.getItemById(itemId);
        event.dataTransfer.setData('text/plain', itemId);
        event.dataTransfer.effectAllowed = 'move';
    }

    _onItemDragEnd(event) {
        this.draggedItem = null;
    }

    _onUnequipItem(event) {
        event.stopPropagation();
        const slot = event.currentTarget.dataset.slot;
        this.unequipItem(slot);
    }

    _onSearchItems(event) {
        const searchTerm = event.target.value.toLowerCase();
        const itemEntries = this.element.find('.item-entry');
        
        itemEntries.each((index, element) => {
            const itemName = element.dataset.itemName.toLowerCase();
            if (itemName.includes(searchTerm)) {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });
    }

    getItemById(itemId) {
        return this.getAvailableItems().find(item => item.id === itemId);
    }

    async equipItem(slot, item) {
        // Check if slot is compatible with item type
        if (!this.isSlotCompatible(slot, item)) {
            ui.notifications.warn(`Cannot equip ${item.name} in ${this.equipmentSlots[slot].name} slot`);
            return;
        }

        // Unequip current item if any
        if (this.equipmentSlots[slot].item) {
            await this.unequipItem(slot);
        }

        // Equip new item
        this.equipmentSlots[slot].item = item;
        
        // Update actor data
        await this.updateActorEquipment();
        
        // Refresh display
        this.render(true);
        
        ui.notifications.info(`Equipped ${item.name}`);
    }

    async unequipItem(slot) {
        const item = this.equipmentSlots[slot].item;
        if (!item) return;

        // Add to inventory
        const inventory = this.actor.system.inventory || [];
        inventory.push(item);
        await this.actor.update({ 'system.inventory': inventory });

        // Remove from equipment
        this.equipmentSlots[slot].item = null;
        
        // Update actor data
        await this.updateActorEquipment();
        
        // Refresh display
        this.render(true);
        
        ui.notifications.info(`Unequipped ${item.name}`);
    }

    isSlotCompatible(slot, item) {
        const slotType = this.getSlotType(slot);
        const itemType = item.type;
        
        const compatibility = {
            head: ['armor', 'helmet'],
            neck: ['accessory', 'necklace'],
            shoulders: ['armor', 'pauldrons'],
            chest: ['armor', 'chestplate'],
            back: ['armor', 'cloak'],
            wrists: ['armor', 'bracers'],
            hands: ['armor', 'gauntlets'],
            waist: ['armor', 'belt'],
            legs: ['armor', 'greaves'],
            feet: ['armor', 'boots'],
            mainHand: ['weapon', 'sword', 'axe', 'mace', 'staff', 'wand'],
            offHand: ['weapon', 'shield', 'sword', 'axe', 'mace', 'staff', 'wand'],
            ring1: ['accessory', 'ring'],
            ring2: ['accessory', 'ring'],
            trinket1: ['accessory', 'trinket'],
            trinket2: ['accessory', 'trinket']
        };

        return compatibility[slot]?.includes(itemType) || false;
    }

    getSlotType(slot) {
        const slotTypes = {
            head: 'armor',
            neck: 'accessory',
            shoulders: 'armor',
            chest: 'armor',
            back: 'armor',
            wrists: 'armor',
            hands: 'armor',
            waist: 'armor',
            legs: 'armor',
            feet: 'armor',
            mainHand: 'weapon',
            offHand: 'weapon',
            ring1: 'accessory',
            ring2: 'accessory',
            trinket1: 'accessory',
            trinket2: 'accessory'
        };
        return slotTypes[slot];
    }

    async updateActorEquipment() {
        const equipment = {};
        for (const [slot, slotData] of Object.entries(this.equipmentSlots)) {
            if (slotData.item) {
                equipment[slot] = slotData.item;
            }
        }
        
        await this.actor.update({ 'system.equipment': equipment });
    }

    showItemDetails(item) {
        // Create a detailed item tooltip or modal
        const content = `
            <div class="item-details">
                <h3>${item.name}</h3>
                <p><strong>Type:</strong> ${item.type}</p>
                <p><strong>Rarity:</strong> ${item.rarity}</p>
                ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}
                ${item.stats ? `<div class="item-stats">
                    <h4>Stats:</h4>
                    ${Object.entries(item.stats).map(([stat, value]) => 
                        `<div class="stat-row"><span class="stat-name">${stat}:</span> <span class="stat-value">${value}</span></div>`
                    ).join('')}
                </div>` : ''}
            </div>
        `;
        
        new Dialog({
            title: item.name,
            content: content,
            buttons: {
                close: {
                    label: "Close",
                    callback: () => {}
                }
            }
        }).render(true);
    }

    showItemSelection(slot) {
        const availableItems = this.getAvailableItems().filter(item => 
            this.isSlotCompatible(slot, item)
        );
        
        if (availableItems.length === 0) {
            ui.notifications.warn("No compatible items available");
            return;
        }

        const content = `
            <div class="item-selection">
                <h3>Select Item for ${this.equipmentSlots[slot].name}</h3>
                <div class="item-list">
                    ${availableItems.map(item => `
                        <div class="item-option" data-item-id="${item.id}">
                            <span class="item-name">${item.name}</span>
                            <span class="item-type">${item.type}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const dialog = new Dialog({
            title: `Select Item for ${this.equipmentSlots[slot].name}`,
            content: content,
            buttons: {
                cancel: {
                    label: "Cancel",
                    callback: () => {}
                }
            }
        });

        dialog.render(true);

        // Add click handlers for item selection
        dialog.element.find('.item-option').on('click', (event) => {
            const itemId = event.currentTarget.dataset.itemId;
            const item = this.getItemById(itemId);
            if (item) {
                this.equipItem(slot, item);
                dialog.close();
            }
        });
    }
}
