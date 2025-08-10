import { CompendiumLoader } from '../compendium-loader.js';

export class AbilitiesManager extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "abilities-manager",
            template: `systems/${game.system.id}/templates/applications/abilities-manager.html`,
            title: "Abilities Manager",
            width: 1000,
            height: 800,
            resizable: true,
            minimizable: true,
            popOut: true
        });
    }

    constructor(actor, options = {}) {
        super(options);
        this.actor = actor;
        this.compendiumData = null;
        this.selectedAbility = null;
        this.abilityCategories = {
            combat: { name: "Combat Abilities", icon: "fas fa-sword", color: "#ff4444" },
            utility: { name: "Utility Abilities", icon: "fas fa-tools", color: "#44ff44" },
            defensive: { name: "Defensive Abilities", icon: "fas fa-shield", color: "#4444ff" },
            offensive: { name: "Offensive Abilities", icon: "fas fa-fire", color: "#ff8800" },
            support: { name: "Support Abilities", icon: "fas fa-heart", color: "#ff44ff" },
            movement: { name: "Movement Abilities", icon: "fas fa-running", color: "#44ffff" },
            class: { name: "Class Features", icon: "fas fa-star", color: "#ffff44" }
        };
    }

    async getData(options) {
        const data = await super.getData(options);
        
        // Load compendium data for abilities
        if (!this.compendiumData) {
            const loader = new CompendiumLoader();
            this.compendiumData = await loader.getCompendiumData();
        }

        return {
            ...data,
            actor: this.actor,
            abilityCategories: this.abilityCategories,
            abilities: this.getCharacterAbilities(),
            availableAbilities: this.getAvailableAbilities(),
            classFeatures: this.getClassFeatures(),
            abilityCooldowns: this.getAbilityCooldowns(),
            resourceTrackers: this.getResourceTrackers()
        };
    }

    getCharacterAbilities() {
        const abilities = this.actor.system.abilities || [];
        const categorized = {};

        for (const category of Object.keys(this.abilityCategories)) {
            categorized[category] = abilities.filter(ability => ability.category === category);
        }

        return categorized;
    }

    getAvailableAbilities() {
        if (!this.compendiumData || !this.compendiumData.abilities) return [];
        
        const abilities = [];
        for (const category of Object.values(this.compendiumData.abilities)) {
            for (const subcategory of Object.values(category)) {
                for (const [id, ability] of Object.entries(subcategory)) {
                    abilities.push({ id, ...ability });
                }
            }
        }
        return abilities;
    }

    getClassFeatures() {
        const classFeatures = {
            monk: {
                name: "Monk Features",
                features: [
                    {
                        name: "Ki Points",
                        current: this.actor.system.resources?.ki || 0,
                        max: this.actor.system.resources?.kiMax || 0,
                        icon: "fas fa-yin-yang",
                        color: "#ffd700"
                    },
                    {
                        name: "Martial Arts",
                        description: "Unarmed strikes deal 1d4 damage",
                        icon: "fas fa-fist-raised",
                        color: "#ff4444"
                    },
                    {
                        name: "Unarmored Defense",
                        description: "AC = 10 + DEX + WIS",
                        icon: "fas fa-shield-alt",
                        color: "#4444ff"
                    }
                ]
            },
            warlock: {
                name: "Warlock Features",
                features: [
                    {
                        name: "Eldritch Blast",
                        description: "Ranged spell attack, 1d10 force damage",
                        icon: "fas fa-magic",
                        color: "#ff44ff"
                    },
                    {
                        name: "Pact Magic",
                        current: this.actor.system.resources?.spellSlots || 0,
                        max: this.actor.system.resources?.spellSlotsMax || 0,
                        icon: "fas fa-book-dead",
                        color: "#8800ff"
                    },
                    {
                        name: "Pact Boon",
                        description: this.actor.system.pactBoon || "Choose your pact boon",
                        icon: "fas fa-handshake",
                        color: "#ff8800"
                    }
                ]
            },
            wizard: {
                name: "Wizard Features",
                features: [
                    {
                        name: "Spellcasting",
                        description: "Intelligence-based spellcasting",
                        icon: "fas fa-hat-wizard",
                        color: "#4444ff"
                    },
                    {
                        name: "Arcane Recovery",
                        description: "Recover spell slots on short rest",
                        icon: "fas fa-sync",
                        color: "#44ff44"
                    },
                    {
                        name: "Arcane Tradition",
                        description: this.actor.system.arcaneTradition || "Choose your tradition",
                        icon: "fas fa-graduation-cap",
                        color: "#ffd700"
                    }
                ]
            },
            fighter: {
                name: "Fighter Features",
                features: [
                    {
                        name: "Second Wind",
                        description: "Heal 1d10 + level on short rest",
                        icon: "fas fa-heart",
                        color: "#ff4444"
                    },
                    {
                        name: "Action Surge",
                        current: this.actor.system.resources?.actionSurge || 0,
                        max: this.actor.system.resources?.actionSurgeMax || 0,
                        icon: "fas fa-bolt",
                        color: "#ffff44"
                    },
                    {
                        name: "Fighting Style",
                        description: this.actor.system.fightingStyle || "Choose your style",
                        icon: "fas fa-sword",
                        color: "#ff8800"
                    }
                ]
            }
        };

        const characterClass = this.actor.system.class?.toLowerCase();
        return classFeatures[characterClass] || { name: "Class Features", features: [] };
    }

    getAbilityCooldowns() {
        const cooldowns = this.actor.system.abilityCooldowns || {};
        const currentTime = Date.now();
        const activeCooldowns = {};

        for (const [abilityId, cooldownData] of Object.entries(cooldowns)) {
            if (cooldownData.endTime > currentTime) {
                const remaining = Math.ceil((cooldownData.endTime - currentTime) / 1000);
                activeCooldowns[abilityId] = {
                    remaining,
                    total: cooldownData.duration,
                    percentage: Math.max(0, (remaining / cooldownData.duration) * 100)
                };
            }
        }

        return activeCooldowns;
    }

    getResourceTrackers() {
        const resources = this.actor.system.resources || {};
        const trackers = [];

        for (const [resourceName, resourceData] of Object.entries(resources)) {
            if (typeof resourceData === 'object' && resourceData.hasOwnProperty('value') && resourceData.hasOwnProperty('max')) {
                const max = Number(resourceData.max) || 0;
                const val = Math.min(max, Math.max(0, Number(resourceData.value) || 0));
                trackers.push({
                    name: resourceName.charAt(0).toUpperCase() + resourceName.slice(1),
                    current: val,
                    max: max,
                    percentage: max > 0 ? (val / max) * 100 : 0
                });
            }
        }

        return trackers;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Ability category tabs
        html.find('.ability-category-tab').on('click', this._onCategoryTabClick.bind(this));
        
        // Ability click handlers
        html.find('.ability-item').on('click', this._onAbilityClick.bind(this));
        
        // Use ability buttons
        html.find('.use-ability').on('click', this._onUseAbility.bind(this));
        
        // Add ability buttons
        html.find('.add-ability').on('click', this._onAddAbility.bind(this));
        
        // Remove ability buttons
        html.find('.remove-ability').on('click', this._onRemoveAbility.bind(this));
        
        // Resource tracker updates
        html.find('.resource-tracker').on('click', this._onResourceClick.bind(this));
        
        // Search functionality
        html.find('#ability-search').on('input', this._onSearchAbilities.bind(this));
        
        // Filter functionality
        html.find('#ability-filter').on('change', this._onFilterAbilities.bind(this));
    }

    _onCategoryTabClick(event) {
        const category = event.currentTarget.dataset.category;
        
        // Update active tab
        this.element.find('.ability-category-tab').removeClass('active');
        event.currentTarget.classList.add('active');
        
        // Show selected category
        this.element.find('.ability-category').hide();
        this.element.find(`.ability-category[data-category="${category}"]`).show();
    }

    _onAbilityClick(event) {
        const abilityId = event.currentTarget.dataset.abilityId;
        const ability = this.getAbilityById(abilityId);
        
        if (ability) {
            this.showAbilityDetails(ability);
        }
    }

    _onUseAbility(event) {
        event.stopPropagation();
        const abilityId = event.currentTarget.dataset.abilityId;
        const ability = this.getAbilityById(abilityId);
        
        if (ability) {
            this.useAbility(ability);
        }
    }

    _onAddAbility(event) {
        event.stopPropagation();
        const abilityId = event.currentTarget.dataset.abilityId;
        const ability = this.getAvailableAbilities().find(a => a.id === abilityId);
        
        if (ability) {
            this.addAbilityToCharacter(ability);
        }
    }

    _onRemoveAbility(event) {
        event.stopPropagation();
        const abilityId = event.currentTarget.dataset.abilityId;
        this.removeAbilityFromCharacter(abilityId);
    }

    _onResourceClick(event) {
        const resourceName = event.currentTarget.dataset.resource;
        this.showResourceEditor(resourceName);
    }

    _onSearchAbilities(event) {
        const searchTerm = event.target.value.toLowerCase();
        const abilityItems = this.element.find('.ability-item');
        
        abilityItems.each((index, element) => {
            const abilityName = element.dataset.abilityName.toLowerCase();
            if (abilityName.includes(searchTerm)) {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });
    }

    _onFilterAbilities(event) {
        const filterValue = event.target.value;
        const abilityItems = this.element.find('.ability-item');
        
        if (filterValue === 'all') {
            abilityItems.show();
        } else {
            abilityItems.each((index, element) => {
                const abilityCategory = element.dataset.abilityCategory;
                if (abilityCategory === filterValue) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            });
        }
    }

    getAbilityById(abilityId) {
        const allAbilities = this.getCharacterAbilities();
        for (const category of Object.values(allAbilities)) {
            const ability = category.find(a => a.id === abilityId);
            if (ability) return ability;
        }
        return null;
    }

    async useAbility(ability) {
        // Check if ability is on cooldown
        const now = Date.now();
        const cds = this.actor.system.abilityCooldowns || {};
        const cdData = cds[ability.id];
        if (cdData && cdData.endTime > now) {
            const remaining = Math.ceil((cdData.endTime - now) / 1000);
            ui.notifications.warn(`${ability.name} is on cooldown for ${remaining} seconds`);
            return;
        }

        // Check resource costs
        if (ability.cost) {
            const canAfford = await this.checkResourceCost(ability.cost);
            if (!canAfford) {
                ui.notifications.warn(`Not enough resources to use ${ability.name}`);
                return;
            }
            // Deduct costs
            const updates = {};
            for (const [resName, amt] of Object.entries(ability.cost)) {
                const path = `system.resources.${resName}.value`;
                const current = Number(this.actor.system.resources?.[resName]?.value || 0);
                updates[path] = Math.max(0, current - Number(amt || 0));
            }
            if (Object.keys(updates).length) await this.actor.update(updates);
        }

        // Apply ability effects
        await this.applyAbilityEffects(ability);

        // Set cooldown if applicable
        if (ability.cooldown) {
            await this.setAbilityCooldown(ability.id, ability.cooldown);
        }

        // Chat card
        const flavor = `Ability: <b>${ability.name}</b>${ability.description ? ` – ${ability.description}` : ''}`;
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: flavor });

        // Update display
        this.render(true);
    }

    async checkResourceCost(cost) {
        const resources = this.actor.system.resources || {};
        for (const [resourceName, amount] of Object.entries(cost)) {
            const res = resources[resourceName];
            if (!res || (Number(res.value || 0) < Number(amount || 0))) {
                return false;
            }
        }
        return true;
    }

    async applyAbilityEffects(ability) {
        const effects = ability.effects || [];
        
        for (const effect of effects) {
            switch (effect.type) {
                case 'heal':
                    await this.applyHealEffect(effect);
                    break;
                case 'damage':
                    await this.applyDamageEffect(effect);
                    break;
                case 'buff':
                    await this.applyBuffEffect(effect);
                    break;
                case 'debuff':
                    await this.applyDebuffEffect(effect);
                    break;
                case 'resource':
                    await this.applyResourceEffect(effect);
                    break;
            }
        }
    }

    async applyHealEffect(effect) {
        const healAmount = this.calculateEffectValue(effect.value);
        const currentHP = this.actor.system.attributes?.hp?.value || 0;
        const maxHP = this.actor.system.attributes?.hp?.max || 0;
        const newHP = Math.min(maxHP, currentHP + healAmount);
        await this.actor.update({ 'system.attributes.hp.value': newHP });
    }

    async applyDamageEffect(effect) {
        // This would typically target an enemy, but for now we'll just log it
        const damageAmount = this.calculateEffectValue(effect.value);
        console.log(`Dealing ${damageAmount} ${effect.damageType || 'damage'}`);
    }

    async applyBuffEffect(effect) {
        const buffs = this.actor.system.buffs || [];
        buffs.push({
            name: effect.name,
            type: effect.stat,
            value: effect.value,
            duration: effect.duration,
            startTime: Date.now()
        });
        
        await this.actor.update({ 'system.buffs': buffs });
    }

    async applyDebuffEffect(effect) {
        // Similar to buff but for enemies
        console.log(`Applying debuff: ${effect.name}`);
    }

    async applyResourceEffect(effect) {
        const resources = this.actor.system.resources || {};
        for (const [resourceName, amount] of Object.entries(effect.resources || {})) {
            const res = resources[resourceName];
            if (res) {
                const max = Number(res.max) || 0;
                const cur = Number(res.value) || 0;
                const next = Math.min(max, Math.max(0, cur + Number(amount || 0)));
                await this.actor.update({ [`system.resources.${resourceName}.value`]: next });
            }
        }
    }

    calculateEffectValue(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            // If it looks like dice, roll with Foundry Roll for consistency
            if (/^\d+d\d+(\s*[+\-]\s*\d+)?$/i.test(value.trim())) {
                try {
                    const roll = new Roll(value);
                    roll.evaluate({ async: false });
                    return roll.total || 0;
                } catch (_) { /* ignore */ }
            }
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) return parsed;
        }
        return 0;
    }

    async setAbilityCooldown(abilityId, duration) {
        const cooldowns = this.actor.system.abilityCooldowns || {};
        cooldowns[abilityId] = {
            startTime: Date.now(),
            endTime: Date.now() + (duration * 1000),
            duration: duration
        };
        
        await this.actor.update({ 'system.abilityCooldowns': cooldowns });
    }

    async addAbilityToCharacter(ability) {
        const abilities = this.actor.system.abilities || [];
        abilities.push(ability);
        
        await this.actor.update({ 'system.abilities': abilities });
        this.render(true);
        
        ui.notifications.info(`Added ${ability.name} to your abilities!`);
    }

    async removeAbilityFromCharacter(abilityId) {
        const abilities = this.actor.system.abilities || [];
        const filteredAbilities = abilities.filter(a => a.id !== abilityId);
        
        await this.actor.update({ 'system.abilities': filteredAbilities });
        this.render(true);
        
        ui.notifications.info(`Removed ability from your character!`);
    }

    showAbilityDetails(ability) {
        const content = `
            <div class="ability-details">
                <h3>${ability.name}</h3>
                <p><strong>Category:</strong> ${ability.category}</p>
                <p><strong>Type:</strong> ${ability.type}</p>
                ${ability.description ? `<p><strong>Description:</strong> ${ability.description}</p>` : ''}
                ${ability.cost ? `<div class="ability-cost">
                    <h4>Cost:</h4>
                    ${Object.entries(ability.cost).map(([resource, amount]) => 
                        `<div class="cost-item"><span class="resource-name">${resource}:</span> <span class="resource-amount">${amount}</span></div>`
                    ).join('')}
                </div>` : ''}
                ${ability.cooldown ? `<p><strong>Cooldown:</strong> ${ability.cooldown} seconds</p>` : ''}
                ${ability.effects ? `<div class="ability-effects">
                    <h4>Effects:</h4>
                    ${ability.effects.map(effect => 
                        `<div class="effect-item">
                            <span class="effect-type">${effect.type}:</span> 
                            <span class="effect-value">${effect.value}</span>
                            ${effect.damageType ? `<span class="effect-damage-type">(${effect.damageType})</span>` : ''}
                        </div>`
                    ).join('')}
                </div>` : ''}
            </div>
        `;
        
        new Dialog({
            title: ability.name,
            content: content,
            buttons: {
                close: {
                    label: "Close",
                    callback: () => {}
                }
            }
        }).render(true);
    }

    showResourceEditor(resourceName) {
        const resources = this.actor.system.resources || {};
        const resource = resources[resourceName];
        
        if (!resource) return;

        const content = `
            <div class="resource-editor">
                <h3>Edit ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}</h3>
                <div class="resource-inputs">
                    <div class="input-group">
                        <label>Current:</label>
                        <input type="number" id="resource-current" value="${resource.current}" min="0" max="${resource.max}">
                    </div>
                    <div class="input-group">
                        <label>Maximum:</label>
                        <input type="number" id="resource-max" value="${resource.max}" min="0">
                    </div>
                </div>
            </div>
        `;

        const dialog = new Dialog({
            title: `Edit ${resourceName}`,
            content: content,
            buttons: {
                save: {
                    label: "Save",
                    callback: () => {
                        const current = parseInt(document.getElementById('resource-current').value);
                        const max = parseInt(document.getElementById('resource-max').value);
                        
                        this.actor.update({
                            [`system.resources.${resourceName}.current`]: current,
                            [`system.resources.${resourceName}.max`]: max
                        });
                        
                        this.render(true);
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => {}
                }
            }
        });

        dialog.render(true);
    }
}

// Expose to global for macros and sheet actions
Hooks.once("ready", () => {
  game.customTTRPG = game.customTTRPG || {};
  game.customTTRPG.AbilitiesManager = AbilitiesManager;
});
