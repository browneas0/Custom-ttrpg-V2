/**
 * ResetSettingsApp using V2 framework
 */
export class ResetSettingsApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ctt-reset-settings",
      title: "Reset Custom TTRPG Settings",
      template: "systems/custom-ttrpg/templates/partials/reset-settings.html",
      width: 400
    });
  }
  getData() { return {}; }
  activateListeners(html) {
    super.activateListeners(html);
    html.find("#reset-confirm").click(() => {
      game.settings.set("custom-ttrpg","hpMultiplier",2);
      game.settings.set("custom-ttrpg","showWelcome",true);
      ui.notifications.info("Settings reset.");
      this.close();
    });
  }
}
