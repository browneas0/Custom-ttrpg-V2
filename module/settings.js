/**
 * Settings and Configuration System for Custom TTRPG V2
 * Handles all game settings, automation preferences, and user configurations
 */

export class SettingsManager {
  static settings = new Map();
  static categories = new Map();
  static watchers = new Map();

  /**
   * Initialize the settings system
   */
  static initialize() {
    this.registerDefaultSettings();
    this.loadSettings();
    this.setupEventListeners();
    console.log("Settings Manager | Initialized successfully");
  }

  /**
   * Register all default game settings
   */
  static registerDefaultSettings() {
    // Core System Settings
    this.registerCategory('core', {
      name: 'Core System',
      icon: 'fas fa-cog',
      description: 'Basic system functionality'
    });

    this.registerSetting('core', 'autoCalculateStats', {
      name: 'Auto-Calculate Stats',
      hint: 'Automatically calculate derived statistics when attributes change',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true
    });

    this.registerSetting('core', 'criticalFailures', {
      name: 'Critical Failure Rules',
      hint: 'How to handle natural 1s on d20 rolls',
      type: String,
      choices: {
        'none': 'No special rules',
        'fumble': 'Fumble table',
        'automatic': 'Automatic failure'
      },
      default: 'automatic',
      scope: 'world',
      config: true
    });

    // Dice and Rolling Settings
    this.registerCategory('dice', {
      name: 'Dice & Rolling',
      icon: 'fas fa-dice',
      description: 'Dice rolling and randomization settings'
    });

    this.registerSetting('dice', 'showAllRolls', {
      name: 'Show All Dice Results',
      hint: 'Display individual die results in chat',
      type: Boolean,
      default: true,
      scope: 'client',
      config: true
    });

    this.registerSetting('dice', 'enableVisualEffects', {
      name: 'Enable Visual Effects',
      hint: 'Show particle effects and animations for rolls',
      type: Boolean,
      default: true,
      scope: 'client',
      config: true
    });

    this.registerSetting('dice', 'rollSound', {
      name: 'Roll Sound Effects',
      hint: 'Play sounds when rolling dice',
      type: Boolean,
      default: true,
      scope: 'client',
      config: true
    });

    this.registerSetting('dice', 'advantageMode', {
      name: 'Advantage/Disadvantage Method',
      hint: 'How to handle advantage and disadvantage',
      type: String,
      choices: {
        'manual': 'Manual selection',
        'situational': 'Situational modifiers',
        'automatic': 'Automatic detection'
      },
      default: 'manual',
      scope: 'world',
      config: true
    });

    // Combat Settings
    this.registerCategory('combat', {
      name: 'Combat',
      icon: 'fas fa-sword',
      description: 'Combat and initiative settings'
    });

    this.registerSetting('combat', 'autoRollInitiative', {
      name: 'Auto-Roll Initiative',
      hint: 'Automatically roll initiative when combat starts',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true
    });

    this.registerSetting('combat', 'skipDefeated', {
      name: 'Skip Defeated Combatants',
      hint: 'Automatically skip turns for unconscious/dead combatants',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true
    });

    this.registerSetting('combat', 'trackResources', {
      name: 'Track Resources in Combat',
      hint: 'Automatically track spell slots, ammo, etc. during combat',
      type: Boolean,
      default: false,
      scope: 'world',
      config: true
    });

    this.registerSetting('combat', 'statusEffectAutomation', {
      name: 'Status Effect Automation',
      hint: 'Automatically apply status effect rules',
      type: String,
      choices: {
        'none': 'No automation',
        'basic': 'Basic effects only',
        'full': 'Full automation'
      },
      default: 'basic',
      scope: 'world',
      config: true
    });

    // Character Settings
    this.registerCategory('character', {
      name: 'Characters',
      icon: 'fas fa-user',
      description: 'Character sheet and progression settings'
    });

    this.registerSetting('character', 'encumbranceRules', {
      name: 'Encumbrance Rules',
      hint: 'How to handle carrying capacity',
      type: String,
      choices: {
        'none': 'No encumbrance',
        'simple': 'Simple weight limits',
        'variant': 'Variant encumbrance rules'
      },
      default: 'simple',
      scope: 'world',
      config: true
    });

    this.registerSetting('character', 'autoLevelBenefits', {
      name: 'Auto-Apply Level Benefits',
      hint: 'Automatically apply HP, proficiency, and other level benefits',
      type: Boolean,
      default: false,
      scope: 'world',
      config: true
    });

    this.registerSetting('character', 'skillVariant', {
      name: 'Skill System Variant',
      hint: 'Which skill system to use',
      type: String,
      choices: {
        'standard': 'Standard skills',
        'backgrounds': 'Background-based',
        'custom': 'Custom skill list'
      },
      default: 'standard',
      scope: 'world',
      config: true
    });

    // Automation Settings
    this.registerCategory('automation', {
      name: 'Automation',
      icon: 'fas fa-robot',
      description: 'Automation and scripting preferences'
    });

    this.registerSetting('automation', 'autoApplyDamage', {
      name: 'Auto-Apply Damage',
      hint: 'Automatically apply damage to targeted tokens',
      type: Boolean,
      default: false,
      scope: 'world',
      config: true
    });

    this.registerSetting('automation', 'chatCommands', {
      name: 'Enable Chat Commands',
      hint: 'Allow slash commands in chat',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true
    });

    this.registerSetting('automation', 'macroSecurity', {
      name: 'Macro Security Level',
      hint: 'Security level for user macros',
      type: String,
      choices: {
        'strict': 'Strict (limited API)',
        'moderate': 'Moderate (most API)',
        'permissive': 'Permissive (full API)'
      },
      default: 'moderate',
      scope: 'world',
      config: true
    });

    // UI Settings
    this.registerCategory('ui', {
      name: 'User Interface',
      icon: 'fas fa-desktop',
      description: 'Interface and display preferences'
    });

    this.registerSetting('ui', 'compactMode', {
      name: 'Compact UI Mode',
      hint: 'Use compact interface layouts',
      type: Boolean,
      default: false,
      scope: 'client',
      config: true
    });

    this.registerSetting('ui', 'animationSpeed', {
      name: 'Animation Speed',
      hint: 'Speed of UI animations and effects',
      type: String,
      choices: {
        'slow': 'Slow',
        'normal': 'Normal',
        'fast': 'Fast',
        'instant': 'Instant'
      },
      default: 'normal',
      scope: 'client',
      config: true
    });

    this.registerSetting('ui', 'autoCollapse', {
      name: 'Auto-Collapse Panels',
      hint: 'Automatically collapse unused interface panels',
      type: Boolean,
      default: false,
      scope: 'client',
      config: true
    });
  }

  /**
   * Register a settings category
   */
  static registerCategory(id, config) {
    this.categories.set(id, {
      id,
      ...config,
      settings: []
    });
  }

  /**
   * Register a setting
   */
  static registerSetting(category, key, config) {
    const fullKey = `${category}.${key}`;
    
    // Add to Foundry's game settings
    game.settings.register('custom-ttrpg', fullKey, {
      name: config.name,
      hint: config.hint,
      scope: config.scope || 'world',
      config: config.config || false,
      type: config.type,
      choices: config.choices,
      default: config.default,
      onChange: (value) => this.onSettingChange(fullKey, value)
    });

    // Store in our system
    this.settings.set(fullKey, {
      category,
      key,
      fullKey,
      ...config
    });

    // Add to category
    if (this.categories.has(category)) {
      this.categories.get(category).settings.push(fullKey);
    }
  }

  /**
   * Get a setting value
   */
  static get(category, key) {
    const fullKey = typeof category === 'string' && key ? `${category}.${key}` : category;
    return game.settings.get('custom-ttrpg', fullKey);
  }

  /**
   * Set a setting value
   */
  static async set(category, key, value) {
    const fullKey = typeof category === 'string' && key ? `${category}.${key}` : category;
    return await game.settings.set('custom-ttrpg', fullKey, value);
  }

  /**
   * Watch for setting changes
   */
  static watch(settingKey, callback) {
    if (!this.watchers.has(settingKey)) {
      this.watchers.set(settingKey, []);
    }
    this.watchers.get(settingKey).push(callback);
  }

  /**
   * Handle setting changes
   */
  static onSettingChange(settingKey, newValue) {
    console.log(`Setting changed: ${settingKey} = ${newValue}`);
    
    // Notify watchers
    if (this.watchers.has(settingKey)) {
      this.watchers.get(settingKey).forEach(callback => {
        try {
          callback(newValue, settingKey);
        } catch (error) {
          console.error(`Error in setting watcher for ${settingKey}:`, error);
        }
      });
    }

    // Handle specific setting changes
    this.handleSpecificChanges(settingKey, newValue);
  }

  /**
   * Handle specific setting changes that need immediate action
   */
  static handleSpecificChanges(settingKey, newValue) {
    switch (settingKey) {
      case 'dice.enableVisualEffects':
        // Toggle visual effects system
        if (game.effects) {
          game.effects.enabled = newValue;
        }
        break;

      case 'combat.autoRollInitiative':
        // Update combat tracker behavior
        if (game.combat) {
          game.combat.settings.autoRoll = newValue;
        }
        break;

      case 'ui.compactMode':
        // Toggle compact UI mode
        document.body.classList.toggle('compact-mode', newValue);
        break;

      case 'ui.animationSpeed':
        // Update animation speed
        document.documentElement.style.setProperty('--animation-speed', 
          this.getAnimationSpeedValue(newValue));
        break;

      case 'automation.chatCommands':
        // Enable/disable chat command processing
        if (game.chatCommands) {
          game.chatCommands.enabled = newValue;
        }
        break;
    }
  }

  /**
   * Get animation speed CSS value
   */
  static getAnimationSpeedValue(speed) {
    const speeds = {
      'slow': '1.5',
      'normal': '1',
      'fast': '0.5',
      'instant': '0'
    };
    return speeds[speed] || '1';
  }

  /**
   * Load and apply settings
   */
  static loadSettings() {
    // Apply UI settings immediately
    const compactMode = this.get('ui', 'compactMode');
    if (compactMode) {
      document.body.classList.add('compact-mode');
    }

    const animationSpeed = this.get('ui', 'animationSpeed');
    document.documentElement.style.setProperty('--animation-speed', 
      this.getAnimationSpeedValue(animationSpeed));

    console.log("Settings loaded and applied");
  }

  /**
   * Setup event listeners
   */
  static setupEventListeners() {
    // Listen for settings menu requests
    Hooks.on('renderSettingsConfig', (app, html) => {
      this.enhanceSettingsMenu(html);
    });
  }

  /**
   * Enhance the settings menu with custom organization
   */
  static enhanceSettingsMenu(html) {
    // Group our settings by category
    const ourSettings = html.find('[data-module="custom-ttrpg"]');
    if (ourSettings.length === 0) return;

    // Create category headers
    this.categories.forEach((category, categoryId) => {
      const categorySettings = ourSettings.filter((i, el) => {
        const setting = $(el).find('input, select').attr('name');
        return setting && setting.startsWith(`custom-ttrpg.${categoryId}.`);
      });

      if (categorySettings.length > 0) {
        const header = $(`
          <h3 class="settings-category">
            <i class="${category.icon}"></i>
            ${category.name}
            <small>${category.description}</small>
          </h3>
        `);
        categorySettings.first().before(header);
      }
    });
  }

  /**
   * Export settings to JSON
   */
  static exportSettings() {
    const settings = {};
    this.settings.forEach((config, key) => {
      settings[key] = this.get(key);
    });
    
    const data = {
      version: game.system.version,
      timestamp: Date.now(),
      settings: settings
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import settings from JSON
   */
  static async importSettings(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      const imported = [];
      const failed = [];

      for (const [key, value] of Object.entries(data.settings)) {
        try {
          await this.set(key, value);
          imported.push(key);
        } catch (error) {
          failed.push({ key, error: error.message });
        }
      }

      return {
        imported: imported.length,
        failed: failed.length,
        details: { imported, failed }
      };
    } catch (error) {
      throw new Error(`Invalid settings data: ${error.message}`);
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(category = null) {
    const toReset = category ? 
      Array.from(this.settings.keys()).filter(key => key.startsWith(`${category}.`)) :
      Array.from(this.settings.keys());

    for (const key of toReset) {
      const config = this.settings.get(key);
      await this.set(key, config.default);
    }

    ui.notifications.info(`Reset ${toReset.length} settings to defaults`);
  }

  /**
   * Get all settings in a category
   */
  static getCategorySettings(categoryId) {
    const category = this.categories.get(categoryId);
    if (!category) return {};

    const settings = {};
    category.settings.forEach(key => {
      settings[key.split('.')[1]] = this.get(key);
    });

    return settings;
  }

  /**
   * Get settings summary for display
   */
  static getSettingsSummary() {
    const summary = {
      categories: this.categories.size,
      settings: this.settings.size,
      modified: 0
    };

    this.settings.forEach((config, key) => {
      const current = this.get(key);
      if (current !== config.default) {
        summary.modified++;
      }
    });

    return summary;
  }
}

// Auto-initialize when ready
Hooks.once('ready', () => {
  SettingsManager.initialize();
});

// Export for module use
export default SettingsManager;