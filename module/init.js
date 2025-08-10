import { CombatTracker } from './applications/combat-tracker.js';
import { FeatManager } from './applications/feat-manager.js';
import { CompendiumManager } from './applications/compendium-manager.js';
import { SpellManager } from './applications/spell-manager.js';
import { InventoryManager } from './applications/inventory-manager.js';
import { EquipmentManager } from './applications/equipment-manager.js';
import { AbilitiesManager } from './applications/abilities-manager.js';
import { ResetSettingsApp } from './applications/reset-settings.js';
import { CustomActor } from '../Actor/Actor.js';
import { CharacterSheet } from './sheets/character-sheet.js';
import { NPCSheet } from './sheets/npc-sheet.js';
import { preloadClassInfo } from './class-loader.js';
import { DiceEngine } from './rolls/engine.js';
import { EffectsManager } from './effects/apply.js';
import { SettingsManager } from './settings.js';
import { TokenManager } from './tokens/hud.js';
import { ChatCommands } from './chat/cards.js';
import { AutomationEngine } from './automation/engine.js';
import { ResourceTracker } from './resources/tracker.js';

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
});

Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
});

Handlebars.registerHelper('resourcePercent', function(current, max) {
    return max > 0 ? Math.round((current / max) * 100) : 0;
});

Handlebars.registerHelper('add', function(a, b) {
    return a + b;
});

Handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
});

Handlebars.registerHelper('divide', function(a, b) {
    return b !== 0 ? a / b : 0;
});

Handlebars.registerHelper('or', function(a, b) {
    return a || b;
});

Handlebars.registerHelper('and', function(a, b) {
    return a && b;
});

Handlebars.registerHelper('formatNumber', function(num) {
    return num.toLocaleString();
});

Handlebars.registerHelper('capitalize', function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
});

// Initialize the system
Hooks.once('init', async function() {
    console.log('Custom TTRPG System | Initializing...');
    
    // Load templates
    await loadTemplates([
        `systems/${game.system.id}/templates/actors/character-sheet.html`,
        `systems/${game.system.id}/templates/partials/attribute-row.html`,
        `systems/${game.system.id}/templates/partials/class-menu.html`,
        `systems/${game.system.id}/templates/partials/spells-menu.html`,
        `systems/${game.system.id}/templates/partials/inventory-menu.html`,
        `systems/${game.system.id}/templates/partials/class-info-window.html`,
        `systems/${game.system.id}/templates/partials/reset-settings.html`,
        `systems/${game.system.id}/templates/applications/spell-manager.html`,
        `systems/${game.system.id}/templates/applications/inventory-manager.html`,
        `systems/${game.system.id}/templates/applications/combat-tracker.html`,
        `systems/${game.system.id}/templates/applications/feat-manager.html`,
        `systems/${game.system.id}/templates/applications/compendium-manager.html`,
        `systems/${game.system.id}/templates/applications/equipment-manager.html`,
        `systems/${game.system.id}/templates/applications/abilities-manager.html`
    ]);

    // Preload class information
    await preloadClassInfo();

    // Register document classes
    CONFIG.Actor.documentClass = CustomActor;
    // Register sheets per type
    Actors.unregisterSheet('core', ActorSheet);
    Actors.registerSheet('custom-ttrpg', CharacterSheet, { types: ['character'], makeDefault: true });
    Actors.registerSheet('custom-ttrpg', NPCSheet, { types: ['npc'], makeDefault: true });

    // Register applications and systems
    CONFIG.CustomTTRPG = {
        applications: {
            CombatTracker,
            FeatManager,
            CompendiumManager,
            SpellManager,
            InventoryManager,
            EquipmentManager,
            AbilitiesManager,
            ResetSettingsApp
        },
        DiceEngine,
        EffectsManager,
        SettingsManager,
        TokenManager,
        ChatCommands,
        AutomationEngine,
        ResourceTracker
    };

    // Make systems accessible under a safe namespace to avoid clobbering Foundry globals
    game.customTTRPG = {
        dice: DiceEngine,
        effects: EffectsManager,
        settings: SettingsManager,
        tokens: TokenManager,
        chatCommands: ChatCommands,
        automation: AutomationEngine,
        resources: ResourceTracker
    };

    console.log('Custom TTRPG System | Initialized successfully!');
});

// Bridge: Connect rest events to resource tracker
Hooks.on('shortRest', async function(actor) {
    try {
        if (game.customTTRPG?.resources?.processRest) await game.customTTRPG.resources.processRest(actor, 'shortRest');
    } catch (e) {
        console.warn('shortRest hook failed:', e);
    }
});

Hooks.on('longRest', async function(actor) {
    try {
        if (game.customTTRPG?.resources?.processRest) await game.customTTRPG.resources.processRest(actor, 'longRest');
    } catch (e) {
        console.warn('longRest hook failed:', e);
    }
});

// Bridge: On createChatMessage, allow automation and effects to react (redundant-safe)
Hooks.on('createChatMessage', function(message) {
    try {
        // EffectsManager already listens; this is a safe relay if needed later
        if (game.customTTRPG?.automation?.processTrigger && message?.isRoll) {
            // Relay critical/fumble triggers if they didn't fire from native hook
            const rolls = message.rolls || [];
            const isD20 = rolls.some(r => r.dice?.some(d => d.faces === 20));
            if (isD20) {
                // Let engine decide via its own conditions
                game.customTTRPG.automation.processTrigger('dice.critical', { message });
                game.customTTRPG.automation.processTrigger('dice.fumble', { message });
            }
        }
    } catch (e) {
        console.warn('createChatMessage bridge failed:', e);
    }
});

// Bridge: Initialize character resources on creation
Hooks.on('createActor', async function(actor, options, userId) {
    try {
        if (actor?.type !== 'character') return;
        const sys = actor.system || {};

        // Ensure base structures exist (CustomActor also guards this)
        const needsResources = !sys.resources || Object.keys(sys.resources).length === 0;
        if (needsResources && game.resources?.initializeActorResources) {
            const initialized = game.resources.initializeActorResources(actor);
            await actor.update({ 'system.resources': initialized });
        }
    } catch (e) {
        console.warn('createActor hook failed:', e);
    }
});

// Bridge: Recalculate resources when class/level changes, preserving current usage when possible
Hooks.on('updateActor', async function(actor, updateData) {
    try {
        if (actor?.type !== 'character') return;
        const changedClass = updateData?.system?.class !== undefined;
        const changedLevel = updateData?.system?.level !== undefined || updateData?.system?.progression?.level !== undefined;
        if (!changedClass && !changedLevel) return;

        if (!game.customTTRPG?.resources?.initializeActorResources) return;
        const newTemplate = game.customTTRPG.resources.initializeActorResources(actor);
        const current = actor.system?.resources || {};

        const merged = mergeResources(current, newTemplate);
        await actor.update({ 'system.resources': merged });
    } catch (e) {
        console.warn('updateActor hook failed:', e);
    }
});

function mergeResources(current, template) {
    // Preserve current values where keys match; cap to new max
    const out = foundry.utils.deepClone(template);
    for (const [key, tmpl] of Object.entries(template)) {
        const cur = current[key];
        if (!cur) continue;
        if (tmpl.slots && cur.slots) {
            for (const lvl of Object.keys(tmpl.slots)) {
                if (cur.slots[lvl]) {
                    out[key].slots[lvl].value = Math.min(out[key].slots[lvl].max, cur.slots[lvl].value);
                }
            }
        } else if (tmpl.abilities && cur.abilities) {
            for (const a of Object.keys(tmpl.abilities)) {
                if (cur.abilities[a]) {
                    out[key].abilities[a].value = Math.min(out[key].abilities[a].max, cur.abilities[a].value);
                }
            }
        } else if (tmpl.types && cur.types) {
            for (const t of Object.keys(tmpl.types)) {
                if (cur.types[t]) {
                    out[key].types[t].value = Math.min(out[key].types[t].max, cur.types[t].value);
                }
            }
        } else if (typeof tmpl.value === 'number' && typeof cur.value === 'number') {
            out[key].value = Math.min(out[key].max ?? tmpl.max ?? cur.max ?? 0, cur.value);
        }
    }
    return out;
}

// Add buttons to Actor Directory
Hooks.on('renderActorDirectory', function(app, html, data) {
    const $html = $(html);
    const header = $html.find('.directory-header');
    
    if (header.length) {
        const buttonContainer = $('<div class="custom-ttrpg-buttons"></div>');
        
        const buttons = [
            { id: 'open-my-sheet', label: 'My Sheet', icon: 'fas fa-id-badge', hotkey: 'C' },
            { id: 'class-menu', label: 'Class Menu', icon: 'fas fa-users', hotkey: 'M' },
            { id: 'spells-menu', label: 'Spells Menu', icon: 'fas fa-magic', hotkey: 'S' },
            { id: 'inventory-menu', label: 'Inventory', icon: 'fas fa-bag-shopping', hotkey: 'I' },
            { id: 'equipment-manager', label: 'Equipment', icon: 'fas fa-shield-alt', hotkey: 'E' },
            { id: 'abilities-manager', label: 'Abilities', icon: 'fas fa-star', hotkey: 'A' },
            { id: 'feats-menu', label: 'Feats', icon: 'fas fa-award', hotkey: 'F' },
            { id: 'combat-tracker', label: 'Combat Tracker', icon: 'fas fa-sword', hotkey: 'T' },
            { id: 'compendium-manager', label: 'Compendium', icon: 'fas fa-book', hotkey: 'U' },
            { id: 'create-actor', label: 'Create Actor', icon: 'fas fa-plus', hotkey: 'B' }
        ];

        buttons.forEach(button => {
            const buttonElement = $(`
                <button class="custom-ttrpg-button" data-action="${button.id}" title="${button.label} (${button.hotkey})">
                    <i class="${button.icon}"></i>
                    <span>${button.label}</span>
                </button>
            `);
            buttonContainer.append(buttonElement);
        });

        header.append(buttonContainer);
    }
});

// Handle button clicks
Hooks.on('renderActorDirectory', function(app, html, data) {
    const $html = $(html);
    $html.on('click', '.custom-ttrpg-button', function(event) {
        event.preventDefault();
        const action = $(this).data('action');
        
        switch (action) {
            case 'open-my-sheet':
                openMyCharacterSheet();
                break;
            case 'class-menu':
                openClassMenu();
                break;
            case 'spells-menu':
                openSpellsMenu();
                break;
            case 'inventory-menu':
                openInventoryMenu();
                break;
            case 'equipment-manager':
                openEquipmentManager();
                break;
            case 'abilities-manager':
                openAbilitiesManager();
                break;
            case 'feats-menu':
                openFeatsMenu();
                break;
            case 'combat-tracker':
                openCombatTracker();
                break;
            case 'compendium-manager':
                openCompendiumManager();
                break;
            case 'create-actor':
                chooseAndCreateClass();
                break;
        }
    });
});

// Add hotkey listeners
Hooks.once('ready', function() {
    // Register global functions
    window.openClassMenu = openClassMenu;
    window.openSpellsMenu = openSpellsMenu;
    window.openInventoryMenu = openInventoryMenu;
    window.openEquipmentManager = openEquipmentManager;
    window.openAbilitiesManager = openAbilitiesManager;
    window.openFeatsMenu = openFeatsMenu;
    window.openCombatTracker = openCombatTracker;
    window.openCompendiumManager = openCompendiumManager;
    window.chooseAndCreateClass = chooseAndCreateClass;
    window.showClassInfo = showClassInfo;
    window.openSubclassMenu = openSubclassMenu;

    // Add hotkey listeners
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey || event.metaKey) return; // Don't interfere with browser shortcuts
        
        switch (event.key.toLowerCase()) {
            case 'c':
                event.preventDefault();
                openMyCharacterSheet();
                break;
            case 'm':
                event.preventDefault();
                openClassMenu();
                break;
            case 's':
                event.preventDefault();
                openSpellsMenu();
                break;
            case 'i':
                event.preventDefault();
                openInventoryMenu();
                break;
            case 'e':
                event.preventDefault();
                openEquipmentManager();
                break;
            case 'a':
                event.preventDefault();
                openAbilitiesManager();
                break;
            case 'f':
                event.preventDefault();
                openFeatsMenu();
                break;
            case 't':
                event.preventDefault();
                openCombatTracker();
                break;
            case 'u':
                event.preventDefault();
                openCompendiumManager();
                break;
            case 'b':
                event.preventDefault();
                chooseAndCreateClass();
                break;
        }
    });

    console.log('Custom TTRPG System | Ready! Hotkeys registered.');
    try {
        const hasOwnedCharacter = game.actors.some(a => a.type === 'character' && a.isOwner);
        if (!game.user.isGM && !hasOwnedCharacter) {
            openClassMenu();
        }
    } catch (_) {}
});

// Function implementations
function openClassMenu() {
    const content = `
        <div class="class-menu">
            <h2>Choose Your Class</h2>
            <div class="class-options">
                <div class="class-option" data-class="Monk">
                    <h3>Monk</h3>
                    <p>A disciplined warrior who harnesses inner energy for martial arts and mystical abilities.</p>
                </div>
                <div class="class-option" data-class="Warlock">
                    <h3>Warlock</h3>
                    <p>A wielder of eldritch magic granted by powerful otherworldly patrons.</p>
                </div>
                <div class="class-option" data-class="Wizard">
                    <h3>Wizard</h3>
                    <p>A scholarly magic-user capable of manipulating the structures of reality.</p>
                </div>
                <div class="class-option" data-class="Fighter">
                    <h3>Fighter</h3>
                    <p>A master of martial combat, skilled with a variety of weapons and armor.</p>
                </div>
            </div>
        </div>
    `;

    new Dialog({
        title: 'Choose Your Class',
        content: content,
        buttons: {
            cancel: {
                label: 'Cancel',
                callback: () => {}
            }
        }
    }).render(true);

    // Add click handlers
    document.querySelectorAll('.class-option').forEach(option => {
        option.addEventListener('click', function() {
            const className = this.dataset.class;
            showClassInfo(className);
        });
    });
}

function openSpellsMenu() {
    const actors = game.actors.filter(a => a.type === 'character');
    if (actors.length === 0) {
        ui.notifications.warn('No characters found. Please create a character first.');
        return;
    }
    const actor = actors[0];
    const app = new SpellManager(actor);
    app.render(true);
}

function openInventoryMenu() {
    const actors = game.actors.filter(a => a.type === 'character');
    if (actors.length === 0) {
        ui.notifications.warn('No characters found. Please create a character first.');
        return;
    }
    const actor = actors[0];
    const app = new InventoryManager(actor);
    app.render(true);
}

function openEquipmentManager() {
    // Get the first actor or prompt user to select one
    const actors = game.actors.filter(a => a.type === 'character');
    if (actors.length === 0) {
        ui.notifications.warn('No characters found. Please create a character first.');
        return;
    }
    
    const actor = actors[0]; // For now, use the first character
    const equipmentManager = new EquipmentManager(actor);
    equipmentManager.render(true);
}

function openAbilitiesManager() {
    // Get the first actor or prompt user to select one
    const actors = game.actors.filter(a => a.type === 'character');
    if (actors.length === 0) {
        ui.notifications.warn('No characters found. Please create a character first.');
        return;
    }
    
    const actor = actors[0]; // For now, use the first character
    const abilitiesManager = new AbilitiesManager(actor);
    abilitiesManager.render(true);
}

function openFeatsMenu() {
    const actors = game.actors.filter(a => a.type === 'character');
    if (actors.length === 0) {
        ui.notifications.warn('No characters found. Please create a character first.');
        return;
    }
    const actor = actors[0];
    const app = new FeatManager(actor);
    app.render(true);
}

function openCombatTracker() {
    const app = new CombatTracker();
    app.render(true);
}

function openCompendiumManager() {
    const compendiumManager = new CompendiumManager();
    compendiumManager.render(true);
}

function openMyCharacterSheet() {
    let actor = game.user.character;
    if (!actor) {
        actor = game.actors.find(a => a.type === 'character' && a.isOwner) || null;
    }
    if (actor) {
        actor.sheet?.render(true);
    } else {
        ui.notifications.warn('No character found. Please create a character.');
        openClassMenu();
    }
}

function chooseAndCreateClass() {
    const content = `
        <div class="class-selection">
            <h2>Create New Character</h2>
            <p>Choose a class for your new character:</p>
            <div class="class-buttons">
                <button class="class-btn" data-class="Monk">Monk</button>
                <button class="class-btn" data-class="Warlock">Warlock</button>
                <button class="class-btn" data-class="Wizard">Wizard</button>
                <button class="class-btn" data-class="Fighter">Fighter</button>
            </div>
        </div>
    `;

    const dialog = new Dialog({
        title: 'Create New Character',
        content: content,
        buttons: {
            cancel: {
                label: 'Cancel',
                callback: () => {}
            }
        }
    });

    dialog.render(true);

    // Add click handlers
    dialog.element.find('.class-btn').on('click', function() {
        const className = this.dataset.class;
        createActorWithClass(className);
        dialog.close();
    });
}

function showClassInfo(className) {
    const classInfo = CONFIG.CustomTTRPG.ClassInfo[className];
    if (!classInfo) {
        ui.notifications.error(`Class information for ${className} not found.`);
        return;
    }

    const content = `
        <div class="class-info">
            <h2>${className}</h2>
            <p><strong>Description:</strong> ${classInfo.description}</p>
            <p><strong>Core Mechanics:</strong> ${classInfo.coreMechanics}</p>
            <p><strong>Playstyle:</strong> ${classInfo.playstyle}</p>
            <h3>Base Stats:</h3>
            <ul>
                ${Object.entries(classInfo.baseStats).map(([stat, value]) => 
                    `<li><strong>${stat}:</strong> ${value}</li>`
                ).join('')}
            </ul>
        </div>
    `;

    new Dialog({
        title: `${className} Information`,
        content: content,
        buttons: {
            create: {
                label: 'Create Character',
                callback: () => createActorWithClass(className)
            },
            close: {
                label: 'Close',
                callback: () => {}
            }
        }
    }).render(true);
}

function openSubclassMenu() {
    ui.notifications.info('Subclass Menu - Coming Soon!');
}

async function createActorWithClass(className) {
    try {
        const classInfo = CONFIG.CustomTTRPG.ClassInfo[className];
        if (!classInfo) {
            ui.notifications.error(`Class information for ${className} not found.`);
            return;
        }

        const bs = classInfo.baseStats || {};
        const initialHp = bs.Health || 10;
        const actorData = {
            name: `New ${className}`,
            type: 'character',
            system: {
                class: className,
                level: 1,
                experience: 0,
                attributes: {
                    hp: { value: initialHp, max: initialHp },
                    str: { value: bs.STR || 10, max: bs.STR || 10 },
                    dex: { value: bs.DEX || 10, max: bs.DEX || 10 },
                    end: { value: bs.END || 10, max: bs.END || 10 },
                    wis: { value: bs.WIS || 10, max: bs.WIS || 10 },
                    int: { value: bs.INT || 10, max: bs.INT || 10 },
                    cha: { value: bs.CHA || 10, max: bs.CHA || 10 },
                    crit: bs.CritRoll || 20
                },
                combat: {
                    attackBonus: 0,
                    defense: 10,
                    damageBonus: 0,
                    damageDice: bs.DamageDice || '1d4',
                    utilityDice: bs.UtilityDice || '1d4'
                },
                notes: '',
                resources: {},
                unlockedFeatures: [],
                availableSpells: [],
                inventory: [],
                abilities: [],
                equipment: {}
            }
        };

        const actor = await Actor.create(actorData);
        ui.notifications.info(`Created new ${className} character: ${actor.name}`);
        
        // Open the character sheet
        actor.sheet.render(true);
        
    } catch (error) {
        console.error('Error creating actor:', error);
        ui.notifications.error('Failed to create character. Please try again.');
    }
}
