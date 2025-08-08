/**
 * Reset Settings Application for Custom TTRPG V2
 * Allows users to reset system settings to defaults
 */

export class ResetSettingsApp extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "reset-settings",
      template: `systems/${game.system.id}/templates/partials/reset-settings.html`,
      title: "Reset Settings",
      width: 400,
      height: 300,
      classes: ["custom-ttrpg", "reset-settings"]
    });
  }

  getData() {
    return {
      settings: [
        { key: "hpMultiplier", name: "HP Multiplier", current: game.settings.get("custom-ttrpg", "hpMultiplier"), default: 2 },
        { key: "showWelcome", name: "Show Welcome Guide", current: game.settings.get("custom-ttrpg", "showWelcome"), default: true }
      ]
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    html.find('#reset-all-btn').click(this._onResetAll.bind(this));
    html.find('.reset-setting-btn').click(this._onResetSetting.bind(this));
  }

  async _onResetAll(event) {
    event.preventDefault();
    
    const confirmed = await Dialog.confirm({
      title: "Reset All Settings",
      content: "Are you sure you want to reset all settings to their default values?",
      defaultYes: false
    });

    if (confirmed) {
      // Reset all settings to defaults
      await game.settings.set("custom-ttrpg", "hpMultiplier", 2);
      await game.settings.set("custom-ttrpg", "showWelcome", true);
      
      ui.notifications.info("All settings have been reset to default values!");
      this.render(true);
    }
  }

  async _onResetSetting(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const settingKey = button.dataset.setting;
    const settingName = button.dataset.name;
    const defaultValue = button.dataset.default;
    
    const confirmed = await Dialog.confirm({
      title: `Reset ${settingName}`,
      content: `Are you sure you want to reset "${settingName}" to its default value (${defaultValue})?`,
      defaultYes: false
    });

    if (confirmed) {
      await game.settings.set("custom-ttrpg", settingKey, defaultValue);
      ui.notifications.info(`${settingName} has been reset to default!`);
      this.render(true);
    }
  }

  async _updateObject(event, formData) {
    // This form doesn't use the standard form submission
    return;
  }
}
