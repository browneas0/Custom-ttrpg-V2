/**
 * Show a dialog to choose a class and create a new character.
 */
async function chooseAndCreateClass() {
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
          Actor.create({ name: `New ${cls}`, type: 'character', data: { class: cls } })
            .then(a => a.sheet.render(true));
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
function showClassInfo(actorId) {
  const actor = game.actors.get(actorId) || game.user.character;
  if (!actor) return ui.notifications.warn('No actor selected.');

  const cls = actor.data.data.class;
  const info = CONFIG.CustomTTRPG.ClassInfo?.[cls];
  if (!info) return ui.notifications.error(`Class '${cls}' not found.`);

  let html = `<h2>${cls}</h2><p>${info.description}</p><table><tr><th>Stat</th><th>Base</th></tr>`;
  for (const [k,v] of Object.entries(info.baseStats)) html += `<tr><td>${k}</td><td>${v}</td></tr>`;
  html += '</table>';

  new Dialog({ title: `${cls} Info`, content: html, buttons: { ok: { label: 'Close' } } }).render(true);
}

window.chooseAndCreateClass = chooseAndCreateClass;
window.showClassInfo = showClassInfo;
