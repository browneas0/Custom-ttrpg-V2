import { CompendiumLoader } from '../compendium-loader.js';

export class CompendiumManager extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "compendium-manager",
            template: "templates/applications/compendium-manager.html",
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
        this.currentCategory = 'items';
        this.currentSubcategory = null;
        this.searchTerm = '';
        this.filterRarity = 'all';
        this.filterLevel = 'all';
        this.filterType = 'all';
    }

    async getData(options) {
        const categories = await CompendiumLoader.getCategories();
        const subcategories = this.currentCategory ? await CompendiumLoader.getSubcategories(this.currentCategory) : [];
        const filters = await CompendiumLoader.getFilterOptions();

        if (!this.currentSubcategory && subcategories.length > 0) {
            this.currentSubcategory = subcategories[0].id;
        }

        const appliedFilters = {
            search: this.searchTerm,
            rarity: this.filterRarity,
            level: this.filterLevel,
            type: this.filterType
        };
        const items = (this.currentCategory && this.currentSubcategory)
            ? await CompendiumLoader.getItems(this.currentCategory, this.currentSubcategory, appliedFilters)
            : [];

        return {
            categories,
            subcategories,
            currentCategory: this.currentCategory,
            currentSubcategory: this.currentSubcategory,
            items,
            searchTerm: this.searchTerm,
            filterRarity: this.filterRarity,
            filterLevel: this.filterLevel,
            filterType: this.filterType,
            rarities: filters.rarities,
            levels: filters.levels,
            types: filters.types
        };
    }

    // previous local data/utilities removed in favor of CompendiumLoader helpers

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
    }

    activateListeners(html) {
        super.activateListeners(html);
        
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
        
        // Export/Import buttons
        html.find('#export-compendium').on('click', this._onExport.bind(this));
        html.find('#import-compendium').on('click', this._onImport.bind(this));
        
        // Add new item button
        html.find('#add-item').on('click', this._onAddItem.bind(this));
    }

    async _onCategorySelect(event) {
        event.preventDefault();
        this.currentCategory = event.currentTarget.dataset.category;
        const subs = await CompendiumLoader.getSubcategories(this.currentCategory);
        this.currentSubcategory = subs[0]?.id || null;
        this.render(true);
    }

    async _onSubcategorySelect(event) {
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
        const itemId = event.currentTarget.dataset.itemId;
        this.showItemDetails(itemId);
    }

    async showItemDetails(itemId) {
        if (!this.currentCategory) return;
        const item = await CompendiumLoader.getItem(this.currentCategory, this.currentSubcategory, itemId);
        if (!item) return;
        const content = this.renderItemDetails(item);
        new Dialog({
            title: item.name || item.id,
            content: content,
            buttons: {
                close: { label: 'Close', callback: () => {} }
            },
            default: 'close'
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

    renderItemDetails(item) {
        let details = `<div class="item-details">`;
        details += `<h3>${item.name || item.id}</h3>`;
        
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

    async _onExport() {
        try {
            const dataStr = await CompendiumLoader.exportData();
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
            if (!file) return;
            try {
                const text = await file.text();
                const ok = await CompendiumLoader.importData(text);
                if (ok) this.render(true);
                ui.notifications.info('Compendium imported successfully!');
            } catch (error) {
                console.error('Import failed:', error);
                ui.notifications.error('Import failed! Invalid JSON file.');
            }
        };
        input.click();
    }

    _onAddItem() {
        ui.notifications.info('Add Item dialog not yet implemented in new manager.');
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
