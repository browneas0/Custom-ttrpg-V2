/**
 * Macro registration and utilities for Custom TTRPG V2
 */

/**
 * Register system macros
 */
export async function registerMacros() {
  const defs = [
    {name:"Create Character",type:"script",command:"game.customTTRPG.chooseAndCreateClass();",img:"icons/svg/hands.svg"},
    {name:"Class Info",type:"script",command:"game.customTTRPG.showClassInfo();",img:"icons/svg/book.svg"}
  ];
  for (let def of defs) {
    if (!game.macros.getName(def.name)) {
      await Macro.create(def, {displaySheet:false});
    }
  }
}

/**
 * Show a dialog to choose a class and create a new character.
 */
export async function chooseAndCreateClass() {
  const classes = Object.keys(CONFIG.CustomTTRPG?.ClassInfo || {});
  if (!classes.length) return ui.notifications.warn('No classes defined.');

  const options = classes.map(c => `<option value='${c}'>${c}</option>`).join('');
  const content = `<form><div class='form-group'>
    <label for='cls'>Choose Your Class:</label>
    <select id='cls'>${options}</select>
  </div></form>`;

  new Dialog({
    title: 'Create New Character',
    content,
    buttons: {
      create: {
        icon: '<i class="fas fa-user-plus"></i>',
        label: 'Create Character',
        callback: async html => {
          const cls = html.find('#cls').val();
          const classInfo = CONFIG.CustomTTRPG.ClassInfo[cls];
          if (!classInfo) return;
          
          // Get base stats from class
          const baseStats = classInfo.baseStats || {};
          
          const actor = await Actor.create({ 
            name: `New ${cls}`, 
            type: 'character', 
            system: { 
              class: cls,
              level: 1,
              experience: 0,
              attributes: {
                hp: { value: baseStats.Health || 10, max: baseStats.Health || 10 },
                str: { value: baseStats.STR || 8, max: baseStats.STR || 8 },
                dex: { value: baseStats.DEX || 8, max: baseStats.DEX || 8 },
                end: { value: baseStats.END || 8, max: baseStats.END || 8 },
                wis: { value: baseStats.WIS || 8, max: baseStats.WIS || 8 },
                int: { value: baseStats.INT || 8, max: baseStats.INT || 8 },
                cha: { value: baseStats.CHA || 8, max: baseStats.CHA || 8 },
                crit: baseStats.CritRoll || 20
              },
              combat: {
                attackBonus: 0,
                defense: 10,
                damageBonus: 0,
                damageDice: baseStats.DamageDice || "1d4",
                utilityDice: baseStats.UtilityDice || "1d4"
              },
              notes: "",
              resources: {},
              unlockedFeatures: [],
              availableSpells: []
            }
          });
          
          if (actor) {
            actor.sheet.render(true);
          }
        }
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
    },
    default: 'create'
  }).render(true);
}

/**
 * Show class info dialog for selected actor.
 */
export async function showClassInfo(actorId) {
  const actor = actorId ? game.actors.get(actorId) : (game.user.character || canvas.tokens.controlled[0]?.actor);
  if (!actor) return ui.notifications.warn('No actor selected.');

  const cls = actor.system.class;
  const info = CONFIG.CustomTTRPG?.ClassInfo?.[cls];
  if (!info) return ui.notifications.error(`Class '${cls}' not found.`);

  let html = `
    <div class="class-info-dialog">
      <h2>${cls}</h2>
      <p><em>${info.description}</em></p>
      <p><strong>Core Mechanic:</strong> ${info.coreMechanic || 'N/A'}</p>
      <p><strong>Playstyle:</strong> ${info.playstyle || 'N/A'}</p>
      <table>
        <thead>
          <tr><th>Attribute</th><th>Base Value</th></tr>
        </thead>
        <tbody>
  `;
  
  // Display base stats
  if (info.baseStats) {
    for (const [k,v] of Object.entries(info.baseStats)) {
      html += `<tr><td>${k}</td><td>${v}</td></tr>`;
    }
  }
  
  html += `
        </tbody>
      </table>
  `;

  // Handle spells - check if it's an array or object with categories
  if (info.spells) {
    html += `<h4>Available Spells:</h4>`;
    
    if (Array.isArray(info.spells)) {
      // For classes with simple spell arrays (Warlock, Wizard)
      html += `<ul>`;
      for (const spell of info.spells) {
        html += `<li>${spell}</li>`;
      }
      html += `</ul>`;
    } else if (typeof info.spells === 'object') {
      // For classes with categorized spells (Monk)
      for (const [category, spells] of Object.entries(info.spells)) {
        html += `<h5>${category.charAt(0).toUpperCase() + category.slice(1)}:</h5>`;
        html += `<ul>`;
        if (Array.isArray(spells)) {
          for (const spell of spells) {
            if (typeof spell === 'string') {
              html += `<li>${spell}</li>`;
            } else if (spell?.name) {
              // Handle spell objects with properties
              html += `<li><strong>${spell.name}</strong> (${spell.type}) - ${spell.effect}</li>`;
            }
          }
        }
        html += `</ul>`;
      }
    }
  }

  // Add class features if available
  if (info.classFeatures) {
    html += `<h4>Key Features:</h4><ul>`;
    const sortedFeatures = Object.entries(info.classFeatures).sort((a,b) => a[1].level - b[1].level);
    for (const [featureName, featureData] of sortedFeatures) {
      html += `<li><strong>${featureName}</strong> (Level ${featureData.level}): ${featureData.description}</li>`;
    }
    html += `</ul>`;
  }

  html += `</div>`;

  new Dialog({ 
    title: `${cls} Class Information`, 
    content: html, 
    buttons: { ok: { label: 'Close' } },
    default: 'ok',
    render: html => {
      // Add some styling to the dialog
      html.find(".class-info-dialog").css({
        "max-height": "600px",
        "overflow-y": "auto",
        "padding": "10px"
      });
    }
  }).render(true);
}

/**
 * Menu functions
 */
export function openClassMenu() { 
  return chooseAndCreateClass(); 
}

export function openSpellsMenu() { 
  const selectedActor = game.user.character || canvas.tokens.controlled[0]?.actor;
  
  if (!selectedActor) {
    ui.notifications.warn("Please select a character first!");
    return;
  }
  
  // Check if SpellManager is available
  if (game.customTTRPG?.SpellManager) {
    new game.customTTRPG.SpellManager(selectedActor).render(true);
  } else {
    // Fallback to placeholder dialog
    new Dialog({
      title: "Spell System (Coming Soon)",
      content: `<div class="spell-preview">
        <p>The spell system will include:</p>
        <ul>
          <li>🔮 Spell crafting and combinations</li>
          <li>⚡ Elemental magic systems</li>
          <li>📚 Spell books and learning</li>
          <li>🎯 Targeting and area effects</li>
        </ul>
        <p><em>Stay tuned for magical updates!</em></p>
      </div>`,
      buttons: { close: { label: "Close" } }
    }).render(true);
  }
}

export function openInventoryMenu() { 
  const selectedActor = game.user.character || canvas.tokens.controlled[0]?.actor;
  
  if (!selectedActor) {
    ui.notifications.warn("Please select a character first!");
    return;
  }
  
  // Check if InventoryManager is available
  if (game.customTTRPG?.InventoryManager) {
    new game.customTTRPG.InventoryManager(selectedActor).render(true);
  } else {
    // Fallback to placeholder dialog
    new Dialog({
      title: "Inventory System (Coming Soon)",
      content: `<div class="inventory-preview">
        <p>The inventory system will feature:</p>
        <ul>
          <li>🎒 Equipment management</li>
          <li>⚔️ Weapon and armor systems</li>
          <li>💰 Currency and trading</li>
          <li>🔧 Item crafting and upgrades</li>
        </ul>
        <p><em>Prepare your adventuring gear!</em></p>
      </div>`,
      buttons: { close: { label: "Close" } }
    }).render(true);
  }
}

export function openFeatsMenu() {
  new Dialog({
    title: "Feats & Abilities (Coming Soon)",
    content: `<div class="feats-preview">
      <p>The feat system will include:</p>
      <ul>
        <li>🏆 Character progression feats</li>
        <li>💪 Combat specializations</li>
        <li>🧠 Skill-based abilities</li>
        <li>🌟 Unique class features</li>
      </ul>
      <p><em>Customize your character's growth!</em></p>
    </div>`,
    buttons: { close: { label: "Close" } }
  }).render(true);
}

export function openSubclassMenu() {
  new Dialog({
    title: "Subclasses (Coming Soon)",
    content: `<div class="subclass-preview">
      <p>Subclass specializations will offer:</p>
      <ul>
        <li>🎭 Unique role variations</li>
        <li>📈 Specialized progression paths</li>
        <li>🎯 Focus-specific abilities</li>
        <li>🔄 Multiclassing options</li>
      </ul>
      <p><em>Define your character's specialty!</em></p>
    </div>`,
    buttons: { close: { label: "Close" } }
  }).render(true);
}

// Register global functions for macros
Hooks.once("ready", () => {
  game.customTTRPG = {
    chooseAndCreateClass,
    showClassInfo,
    openClassMenu,
    openSpellsMenu,
    openInventoryMenu,
    openFeatsMenu,
    openSubclassMenu
  };
});
