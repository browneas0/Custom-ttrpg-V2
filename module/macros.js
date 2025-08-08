/**
 * Macro registration and utilities
 */
export async function registerMacros() {
  const defs = [
    {name:"Create Character",type:"script",command:"chooseAndCreateClass();",img:"icons/svg/hands.svg"},
    {name:"Class Info",type:"script",command:"showClassInfo();",img:"icons/svg/book.svg"}
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
  const classes = Object.keys(CONFIG.CustomTTRPG.ClassInfo || {});
  if (!classes.length) return ui.notifications.warn('No classes defined.');

  const options = classes.map(c => `<option value='${c}'>${c}</option>`).join('');
  const content = `<form><div class='form-group'>
    <label for='cls'>Class:</label>
    <select id='cls'>${options}</select>
  </div></form>`;

  new Dialog({
    title: 'Create New Character',
    content,
    buttons: {
      create: {
        icon: '<i class="fas fa-user-plus"></i>',
        label: 'Create',
        callback: html => {
          const cls = html.find('#cls').val();
          Actor.create({ 
            name: `New ${cls}`, 
            type: 'character', 
            system: { 
              class: cls,
              attributes: {
                hp: { value: 10, max: 10 },
                str: { value: 8, max: 8 },
                dex: { value: 8, max: 8 },
                end: { value: 8, max: 8 }
              }
            }
          }).then(a => a.sheet.render(true));
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
  const actor = game.actors.get(actorId) || game.user.character;
  if (!actor) return ui.notifications.warn('No actor selected.');

  const cls = actor.system.class;
  const info = CONFIG.CustomTTRPG.ClassInfo?.[cls];
  if (!info) return ui.notifications.error(`Class '${cls}' not found.`);

  let html = `<h2>${cls}</h2><p>${info.description}</p><table><tr><th>Stat</th><th>Base</th></tr>`;
  for (const [k,v] of Object.entries(info.baseStats)) html += `<tr><td>${k}</td><td>${v}</td></tr>`;
  html += '</table>';

  new Dialog({ title: `${cls} Info`, content: html, buttons: { ok: { label: 'Close' } } }).render(true);
}

export function openClassMenu(){ return chooseAndCreateClass(); }

export function openSpellsMenu(){ 
  new Dialog({
    title: "Spells (Coming Soon)",
    content: `<p>Your Spells menu will go here.</p>`,
    buttons: { close: { label: "Close" } }
  }).render(true);
}

export function openInventoryMenu(){ 
  new Dialog({
    title: "Inventory (Coming Soon)",
    content: `<p>Your Inventory menu will go here.</p>`,
    buttons: { close: { label: "Close" } }
  }).render(true);
}

export function openFeatsMenu() {
  new Dialog({
    title: "Feats (Coming Soon)",
    content: `<p>Your Feats menu will go here.</p>`,
    buttons: { close: { label: "Close" } }
  }).render(true);
}

export function openSubclassMenu() {
  new Dialog({
    title: "Subclasses (Coming Soon)",
    content: `<p>Your Subclasses menu will go here.</p>`,
    buttons: { close: { label: "Close" } }
  }).render(true);
}