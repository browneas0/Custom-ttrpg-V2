import { CompendiumLoader } from '../compendium-loader.js';

export class CompendiumManager extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "compendium-manager",
            template: `systems/${game.system.id}/templates/applications/compendium-manager.html`,
            title: "Compendium Manager",
            width: 800,
            height: 600,
            resizable: true,
            minimizable: true,
            popOut: true
        });
    }

    constructor(options = {}) {
        super(options);
        this.compendiumData = null;
        this.currentCategory = 'items';
        this.currentSubcategory = 'weapons';
        this.searchTerm = '';
        this.filterRarity = 'all';
        this.filterLevel = 'all';
        this.filterType = 'all';
        this.loadCompendiumData();
    }

    async loadCompendiumData() {
        try {
            this.compendiumData = await CompendiumLoader.loadCompendiumData();
        } catch (error) {
            console.error("Failed to load compendium data:", error);
            this.compendiumData = {};
        }
    }

    getData(options) {
        const categories = this.getCategories();
        const items = this.getFilteredItems();
        const searchResults = this.getSearchResults();
        
        return {
            categories,
            currentCategory: this.currentCategory,
            currentSubcategory: this.currentSubcategory,
            items: (searchResults && searchResults.length > 0) ? searchResults : items,
            searchTerm: this.searchTerm,
            filterRarity: this.filterRarity,
            filterLevel: this.filterLevel,
            filterType: this.filterType,
            rarities: ['all', 'common', 'uncommon', 'rare', 'very_rare', 'legendary'],
            levels: ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            types: this.getAvailableTypes()
        };
    }

    getCategories() {
        if (!this.compendiumData) return {};
        
        const categories = {};
        for (const [category, data] of Object.entries(this.compendiumData)) {
            if (typeof data === 'object' && data !== null) {
                categories[category] = {
                    name: this.capitalizeFirst(category),
                    subcategories: this.getSubcategories(category, data)
                };
            }
        }
        return categories;
    }

    getSubcategories(category, data) {
        const subcategories = {};
        for (const [subcategory, items] of Object.entries(data)) {
            if (typeof items === 'object' && items !== null) {
                subcategories[subcategory] = {
                    name: this.capitalizeFirst(subcategory),
                    count: Object.keys(items).length
                };
            }
        }
        return subcategories;
    }

    getFilteredItems() {
        if (!this.compendiumData || !this.compendiumData[this.currentCategory]) return [];
        
        const categoryData = this.compendiumData[this.currentCategory];
        if (!categoryData[this.currentSubcategory]) return [];
        
        const items = categoryData[this.currentSubcategory];
        return Object.entries(items).map(([id, item]) => ({
            id,
            ...item,
            category: this.currentCategory,
            subcategory: this.currentSubcategory
        })).filter(item => this.applyFilters(item));
    }

    getSearchResults() {
        if (!this.searchTerm || !this.compendiumData) return [];
        
        const results = [];
        const searchLower = this.searchTerm.toLowerCase();
        
        for (const [category, categoryData] of Object.entries(this.compendiumData)) {
            for (const [subcategory, items] of Object.entries(categoryData)) {
                if (typeof items === 'object' && items !== null) {
                    for (const [id, item] of Object.entries(items)) {
                        if (this.matchesSearch(item, searchLower)) {
                            results.push({
                                id,
                                ...item,
                                category,
                                subcategory
                            });
                        }
                    }
                }
            }
        }
        
        return results.filter(item => this.applyFilters(item));
    }

    matchesSearch(item, searchTerm) {
        const searchableFields = [
            item.name,
            item.description,
            item.type,
            item.category,
            item.school,
            item.damageType,
            item.properties?.join(' '),
            item.traits?.join(' ')
        ].filter(Boolean);
        
        return searchableFields.some(field => 
            field.toLowerCase().includes(searchTerm)
        );
    }

    applyFilters(item) {
        // Rarity filter
        if (this.filterRarity !== 'all' && item.rarity !== this.filterRarity) {
            return false;
        }
        
        // Level filter
        if (this.filterLevel !== 'all' && item.level !== parseInt(this.filterLevel)) {
            return false;
        }
        
        // Type filter
        if (this.filterType !== 'all' && item.type !== this.filterType) {
            return false;
        }
        
        return true;
    }

    getAvailableTypes() {
        if (!this.compendiumData) return ['all'];
        
        const types = new Set(['all']);
        for (const category of Object.values(this.compendiumData)) {
            for (const subcategory of Object.values(category)) {
                if (typeof subcategory === 'object' && subcategory !== null) {
                    for (const item of Object.values(subcategory)) {
                        if (item.type) {
                            types.add(item.type);
                        }
                    }
                }
            }
        }
        return Array.from(types);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.onRender();
        
        // Category navigation
        html.find('.category-nav').on('click', '.category-item', this._onCategorySelect.bind(this));
        html.find('.subcategory-nav').on('click', '.subcategory-item', this._onSubcategorySelect.bind(this));
        
        // Search functionality
        html.find('#compendium-search').on('input', this._onSearchInput.bind(this));
        
        // Filter controls
        html.find('#rarity-filter').on('change', this._onFilterChange.bind(this));
        html.find('#level-filter').on('change', this._onFilterChange.bind(this));
        html.find('#type-filter').on('change', this._onFilterChange.bind(this));
        
        // Item interactions
        html.find('.item-card').on('click', this._onItemClick.bind(this));
        // Allow dragging from compendium to sheet drop zone
        html.find('.item-card').attr('draggable', 'true');
        html.find('.item-card').on('dragstart', (e) => {
            const id = e.currentTarget.dataset.itemId;
            const item = this.findItemById(id);
            if (!item) return;
            const dt = e.originalEvent?.dataTransfer;
            if (dt) {
                dt.setData('text/plain', id);
                dt.setData('application/json', JSON.stringify({ __cttType: 'item', item }));
                dt.effectAllowed = 'copy';
            }
        });
        html.find('.item-card').on('click', '.add-to-inventory', this._onAddToInventory.bind(this));
        html.find('.item-card').on('click', '.add-to-spells', this._onAddToSpells.bind(this));
        html.find('.item-card').on('click', '.add-to-abilities', this._onAddToAbilities.bind(this));
        html.find('.item-card').on('click', '.copy-id', this._onCopyId.bind(this));
        
        // Export/Import buttons
        html.find('#export-compendium').on('click', this._onExport.bind(this));
        html.find('#import-compendium').on('click', this._onImport.bind(this));
        
        // Add new item button
        html.find('#add-item').on('click', this._onAddItem.bind(this));
    }

    _onCategorySelect(event) {
        event.preventDefault();
        const category = event.currentTarget.dataset.category;
        this.currentCategory = category;
        
        // Set first subcategory as default
        const categories = this.getCategories();
        if (categories[category] && Object.keys(categories[category].subcategories).length > 0) {
            this.currentSubcategory = Object.keys(categories[category].subcategories)[0];
        }
        
        this.render(true);
    }

    _onSubcategorySelect(event) {
        event.preventDefault();
        this.currentSubcategory = event.currentTarget.dataset.subcategory;
        this.render(true);
    }

    _onSearchInput(event) {
        this.searchTerm = event.target.value;
        this.render(true);
    }

    _onFilterChange(event) {
        const filterType = event.target.id.replace('-filter', '');
        this[`filter${this.capitalizeFirst(filterType)}`] = event.target.value;
        this.render(true);
    }

    _onItemClick(event) {
        event.preventDefault();
        // If a nested action button was clicked, don't also open details
        const target = event.target.closest('button');
        if (target && (target.classList.contains('add-to-inventory') || target.classList.contains('add-to-spells') || target.classList.contains('add-to-abilities') || target.classList.contains('copy-id') || target.classList.contains('item-details-btn'))) {
            return;
        }
        const card = event.currentTarget;
        const itemId = card.dataset.itemId;
        this.showItemDetails(itemId);
    }

    showItemDetails(itemId) {
        const item = this.findItemById(itemId);
        if (!item) return;
        
        const content = this.renderItemDetails(item);
        new Dialog({
            title: item.name,
            content: content,
            buttons: {
                close: {
                    label: "Close",
                    callback: () => {}
                },
                add: {
                    label: "Add to Character",
                    callback: () => this.addItemToCharacter(item)
                }
            },
            default: "close"
        }).render(true);
    }

    findItemById(itemId) {
        if (!this.compendiumData) return null;
        
        for (const [category, categoryData] of Object.entries(this.compendiumData)) {
            for (const [subcategory, items] of Object.entries(categoryData)) {
                if (typeof items === 'object' && items !== null && items[itemId]) {
                    return { ...items[itemId], id: itemId, category, subcategory };
                }
            }
        }
        return null;
    }

    // Helper exposed for drop fallback
    onRender() {
        window.game = window.game || {};
        window.game.customTTRPG = window.game.customTTRPG || {};
        window.game.customTTRPG.__findCompendiumItemById = async (id) => this.findItemById(id);
    }

    renderItemDetails(item) {
        let details = `<div class="item-details">`;
        details += `<h3>${item.name}</h3>`;
        
        if (item.description) {
            details += `<p><strong>Description:</strong> ${item.description}</p>`;
        }
        
        // Render different details based on item type
        if (item.type === 'weapon') {
            details += this.renderWeaponDetails(item);
        } else if (item.type === 'armor') {
            details += this.renderArmorDetails(item);
        } else if (item.type === 'spell') {
            details += this.renderSpellDetails(item);
        } else if (item.type === 'gear') {
            details += this.renderGearDetails(item);
        }
        
        details += `</div>`;
        return details;
    }

    renderWeaponDetails(item) {
        let details = `<div class="weapon-details">`;
        if (item.damage) details += `<p><strong>Damage:</strong> ${item.damage} ${item.damageType || ''}</p>`;
        if (item.range) details += `<p><strong>Range:</strong> ${item.range}</p>`;
        if (item.properties) details += `<p><strong>Properties:</strong> ${item.properties.join(', ')}</p>`;
        if (item.weight) details += `<p><strong>Weight:</strong> ${item.weight} lbs</p>`;
        if (item.cost) details += `<p><strong>Cost:</strong> ${item.cost}</p>`;
        if (item.rarity) details += `<p><strong>Rarity:</strong> ${this.capitalizeFirst(item.rarity)}</p>`;
        details += `</div>`;
        return details;
    }

    renderArmorDetails(item) {
        let details = `<div class="armor-details">`;
        if (item.ac) details += `<p><strong>Armor Class:</strong> ${item.ac}</p>`;
        if (item.dexBonus) details += `<p><strong>Dex Bonus:</strong> Yes</p>`;
        if (item.stealth) details += `<p><strong>Stealth:</strong> ${this.capitalizeFirst(item.stealth)}</p>`;
        if (item.weight) details += `<p><strong>Weight:</strong> ${item.weight} lbs</p>`;
        if (item.cost) details += `<p><strong>Cost:</strong> ${item.cost}</p>`;
        if (item.rarity) details += `<p><strong>Rarity:</strong> ${this.capitalizeFirst(item.rarity)}</p>`;
        details += `</div>`;
        return details;
    }

    renderSpellDetails(item) {
        let details = `<div class="spell-details">`;
        if (item.level) details += `<p><strong>Level:</strong> ${item.level}</p>`;
        if (item.school) details += `<p><strong>School:</strong> ${this.capitalizeFirst(item.school)}</p>`;
        if (item.castingTime) details += `<p><strong>Casting Time:</strong> ${item.castingTime}</p>`;
        if (item.range) details += `<p><strong>Range:</strong> ${item.range}</p>`;
        if (item.components) details += `<p><strong>Components:</strong> ${item.components.join(', ')}</p>`;
        if (item.duration) details += `<p><strong>Duration:</strong> ${item.duration}</p>`;
        if (item.damage) details += `<p><strong>Damage:</strong> ${item.damage} ${item.damageType || ''}</p>`;
        if (item.save) details += `<p><strong>Save:</strong> ${item.save}</p>`;
        if (item.higherLevels) details += `<p><strong>At Higher Levels:</strong> ${item.higherLevels}</p>`;
        details += `</div>`;
        return details;
    }

    renderGearDetails(item) {
        let details = `<div class="gear-details">`;
        if (item.capacity) details += `<p><strong>Capacity:</strong> ${item.capacity}</p>`;
        if (item.weight) details += `<p><strong>Weight:</strong> ${item.weight} lbs</p>`;
        if (item.cost) details += `<p><strong>Cost:</strong> ${item.cost}</p>`;
        if (item.rarity) details += `<p><strong>Rarity:</strong> ${this.capitalizeFirst(item.rarity)}</p>`;
        details += `</div>`;
        return details;
    }

    addItemToCharacter(item) {
        // This would integrate with the character sheet system
        ui.notifications.info(`Added ${item.name} to character inventory`);
    }

    // Placeholder handlers
    async _onAddToInventory(event) {
        event.stopPropagation();
        const itemId = event.currentTarget.dataset.itemId;
        const item = this.findItemById(itemId);
        if (!item) return;
        const actor = game.user.character || canvas.tokens.controlled[0]?.actor;
        if (!actor) { ui.notifications.warn('Select a character first.'); return; }
        try {
            const inv = foundry.utils.deepClone(actor.system.inventory || { weapons: [], armor: [], equipment: [], consumables: [], valuables: [] });
            const category = item.type === 'weapon' ? 'weapons' : item.type === 'armor' ? 'armor' : item.type === 'consumable' ? 'consumables' : 'equipment';
            const newItem = {
                id: item.id || foundry.utils.randomID(),
                name: item.name,
                category,
                quantity: 1,
                weight: item.weight || 0,
                value: item.cost || 0,
                description: item.description || '',
                type: item.type || 'equipment',
                stats: item.stats || undefined,
                equipped: false
            };
            inv[category] = inv[category] || [];
            inv[category].push(newItem);
            await actor.update({ 'system.inventory': inv });
            ui.notifications.info(`Added ${item.name} to ${actor.name}'s inventory.`);
        } catch (err) {
            console.error(err);
            ui.notifications.error('Failed to add to inventory.');
        }
    }
    async _onAddToSpells(event) {
        event.stopPropagation();
        const itemId = event.currentTarget.dataset.itemId;
        const item = this.findItemById(itemId);
        if (!item) return;
        const actor = game.user.character || canvas.tokens.controlled[0]?.actor;
        if (!actor) { ui.notifications.warn('Select a character first.'); return; }
        try {
            const spells = Array.isArray(actor.system.availableSpells) ? [...actor.system.availableSpells] : [];
            const spellName = item.name || item.id;
            if (!spells.includes(spellName)) spells.push(spellName);
            await actor.update({ 'system.availableSpells': spells });
            ui.notifications.info(`Added ${item.name} to ${actor.name}'s spells.`);
        } catch (err) {
            console.error(err);
            ui.notifications.error('Failed to add to spells.');
        }
    }
    async _onAddToAbilities(event) {
        event.stopPropagation();
        const itemId = event.currentTarget.dataset.itemId;
        const item = this.findItemById(itemId);
        if (!item) return;
        const actor = game.user.character || canvas.tokens.controlled[0]?.actor;
        if (!actor) { ui.notifications.warn('Select a character first.'); return; }
        try {
            const abilities = Array.isArray(actor.system.abilities) ? [...actor.system.abilities] : [];
            const ability = {
                id: item.id || foundry.utils.randomID(),
                name: item.name,
                category: item.subcategory || item.category || 'utility',
                type: item.type || 'ability',
                description: item.description || '',
                cost: item.costObj || undefined,
                cooldown: Number(item.cooldown || 0) || undefined,
                effects: item.effects || undefined
            };
            if (!abilities.find(a => a.id === ability.id)) abilities.push(ability);
            await actor.update({ 'system.abilities': abilities });
            ui.notifications.info(`Added ${item.name} to ${actor.name}'s abilities.`);
        } catch (err) {
            console.error(err);
            ui.notifications.error('Failed to add to abilities.');
        }
    }
    async _onCopyId(event) {
        event.stopPropagation();
        const itemId = event.currentTarget.dataset.itemId;
        try {
            await navigator.clipboard.writeText(itemId);
            ui.notifications.info('Copied ID to clipboard');
        } catch (_) {
            ui.notifications.warn(`ID: ${itemId}`);
        }
    }

    async _onExport() {
        try {
            const dataStr = JSON.stringify(this.compendiumData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compendium-export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.notifications.info("Compendium exported successfully!");
        } catch (error) {
            console.error("Export failed:", error);
            ui.notifications.error("Export failed!");
        }
    }

    async _onImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this.compendiumData = data;
                    this.render(true);
                    ui.notifications.info("Compendium imported successfully!");
                } catch (error) {
                    console.error("Import failed:", error);
                    ui.notifications.error("Import failed! Invalid JSON file.");
                }
            }
        };
        input.click();
    }

    _onAddItem() {
        // Open a dialog to add new items to the compendium
        this.showAddItemDialog();
    }

    showAddItemDialog() {
        const content = `
            <div class="add-item-form">
                <h3>Add New Item</h3>
                <div class="form-group">
                    <label>Category:</label>
                    <select id="new-item-category">
                        <option value="items">Items</option>
                        <option value="spells">Spells</option>
                        <option value="abilities">Abilities</option>
                        <option value="status_effects">Status Effects</option>
                        <option value="combat_keywords">Combat Keywords</option>
                        <option value="races">Races</option>
                        <option value="classes">Classes</option>
                        <option value="feats">Feats</option>
                        <option value="monsters">Monsters</option>
                        <option value="magic_items">Magic Items</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="new-item-name" placeholder="Item name">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="new-item-description" placeholder="Item description"></textarea>
                </div>
            </div>
        `;
        
        new Dialog({
            title: "Add New Item",
            content: content,
            buttons: {
                cancel: {
                    label: "Cancel",
                    callback: () => {}
                },
                add: {
                    label: "Add Item",
                    callback: () => this.addNewItem()
                }
            },
            default: "add"
        }).render(true);
    }

    addNewItem() {
        const category = document.getElementById('new-item-category').value;
        const name = document.getElementById('new-item-name').value;
        const description = document.getElementById('new-item-description').value;
        
        if (!name || !description) {
            ui.notifications.error("Name and description are required!");
            return;
        }
        
        // Initialize category if it doesn't exist
        if (!this.compendiumData[category]) {
            this.compendiumData[category] = {};
        }
        
        // Initialize subcategory (using 'misc' as default)
        if (!this.compendiumData[category]['misc']) {
            this.compendiumData[category]['misc'] = {};
        }
        
        // Add the new item
        const itemId = name.toLowerCase().replace(/\s+/g, '_');
        this.compendiumData[category]['misc'][itemId] = {
            name: name,
            description: description,
            type: category === 'spells' ? 'spell' : 'item'
        };
        
        this.render(true);
        ui.notifications.info(`Added ${name} to compendium!`);
    }
}
