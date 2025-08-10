/**
 * Chat Commands and Automation System for Custom TTRPG V2
 * Handles slash commands, automated responses, and chat enhancements
 */

export class ChatCommands {
  static commands = new Map();
  static aliases = new Map();
  static enabled = true;
  static commandHistory = [];

  /**
   * Initialize the chat command system
   */
  static initialize() {
    this.registerDefaultCommands();
    this.setupEventListeners();
    this.enhanceChatInterface();
    console.log("Chat Commands | Initialized successfully");
  }

  /**
   * Register default chat commands
   */
  static registerDefaultCommands() {
    // Dice rolling commands
    this.registerCommand('roll', {
      description: 'Roll dice with advanced notation',
      usage: '/roll 3d6+2 [advantage|disadvantage]',
      category: 'dice',
      execute: async (args, options) => {
        const expression = args.join(' ');
        if (!expression) {
          return "Usage: /roll <dice expression>";
        }

        const rollOptions = { speaker: options.speaker };
        if (options.flags.includes('advantage')) rollOptions.advantage = true;
        if (options.flags.includes('disadvantage')) rollOptions.disadvantage = true;

        const result = await game.dice.roll(expression, rollOptions);
        return `Rolled ${expression}: **${result.total}**`;
      }
    });

    this.registerCommand('damage', {
      description: 'Roll damage to targets',
      usage: '/damage 2d6+4 [fire|ice|lightning|etc]',
      category: 'combat',
      execute: async (args, options) => {
        const expression = args[0];
        const damageType = args[1] || 'physical';
        
        if (!expression) {
          return "Usage: /damage <expression> [type]";
        }

        const result = await game.dice.rollDamage(expression, damageType, { 
          speaker: options.speaker 
        });

        // Apply to targets if any
        if (game.tokens && game.tokens.getTargetedTokens().length > 0) {
          await game.tokens.applyDamageToTargets(result.total, damageType);
          return `Applied ${result.total} ${damageType} damage to targets`;
        }

        return `Rolled ${expression} ${damageType} damage: **${result.total}**`;
      }
    });

    this.registerCommand('heal', {
      description: 'Roll healing to targets',
      usage: '/heal 2d4+2',
      category: 'combat',
      execute: async (args, options) => {
        const expression = args[0];
        
        if (!expression) {
          return "Usage: /heal <expression>";
        }

        const result = await game.dice.roll(expression, { 
          speaker: options.speaker,
          flavor: 'Healing'
        });

        // Apply to targets if any
        if (game.tokens && game.tokens.getTargetedTokens().length > 0) {
          await game.tokens.applyHealingToTargets(result.total);
          return `Applied ${result.total} healing to targets`;
        }

        return `Rolled ${expression} healing: **${result.total}**`;
      }
    });

    // Character commands
    this.registerCommand('save', {
      description: 'Make a saving throw',
      usage: '/save str|dex|end|int|wis|cha [DC]',
      category: 'character',
      execute: async (args, options) => {
        const attribute = args[0];
        const dc = parseInt(args[1]) || 15;
        
        if (!attribute || !['str', 'dex', 'end', 'int', 'wis', 'cha'].includes(attribute)) {
          return "Usage: /save <attribute> [DC]";
        }

        const speaker = options.speaker;
        const actor = game.actors.get(speaker.actor);
        
        if (!actor) {
          return "No character selected";
        }

        const bonus = actor.getSkillBonus(attribute) || actor.getAttributeModifier(attribute);
        const result = await game.dice.roll(`1d20+${bonus}`, {
          speaker: options.speaker,
          flavor: `${attribute.toUpperCase()} Save (DC ${dc})`
        });

        const success = result.total >= dc;
        return `${attribute.toUpperCase()} Save: **${result.total}** vs DC ${dc} - ${success ? '**SUCCESS**' : '**FAILURE**'}`;
      }
    });

    this.registerCommand('check', {
      description: 'Make an ability check',
      usage: '/check athletics|stealth|etc [advantage|disadvantage]',
      category: 'character',
      execute: async (args, options) => {
        const skill = args[0];
        
        if (!skill) {
          return "Usage: /check <skill> [advantage|disadvantage]";
        }

        const speaker = options.speaker;
        const actor = game.actors.get(speaker.actor);
        
        if (!actor) {
          return "No character selected";
        }

        const bonus = actor.getSkillBonus(skill) || 0;
        let expression = `1d20+${bonus}`;
        
        if (options.flags.includes('advantage')) {
          expression = `2d20kh1+${bonus}`;
        } else if (options.flags.includes('disadvantage')) {
          expression = `2d20kl1+${bonus}`;
        }

        const result = await game.dice.roll(expression, {
          speaker: options.speaker,
          flavor: `${skill.charAt(0).toUpperCase() + skill.slice(1)} Check`
        });

        return `${skill} check: **${result.total}**`;
      }
    });

    // Combat commands
    this.registerCommand('initiative', {
      description: 'Roll initiative',
      usage: '/initiative [bonus]',
      category: 'combat',
      execute: async (args, options) => {
        const bonus = parseInt(args[0]) || 0;
        const speaker = options.speaker;
        const actor = game.actors.get(speaker.actor);
        
        let totalBonus = bonus;
        if (actor) {
          totalBonus += actor.getAttributeModifier('dex');
        }

        const result = await game.dice.roll(`1d20+${totalBonus}`, {
          speaker: options.speaker,
          flavor: 'Initiative'
        });

        return `Initiative: **${result.total}**`;
      }
    });

    // Utility commands
    this.registerCommand('detectmagic', {
      description: 'Detect magical auras on targeted NPCs (glimpse of loot)',
      usage: '/detectmagic',
      category: 'utility',
      execute: async (args, options) => {
        const targets = game.tokens?.getTargetedTokens?.() || [];
        if (targets.length === 0) return 'No targets selected.';
        const lines = [];
        for (const t of targets) {
          const actor = t.actor;
          if (!actor || actor.type !== 'npc') continue;
          const inv = actor.system?.inventory || {};
          const magical = [];
          Object.values(inv).forEach(category => {
            if (!Array.isArray(category)) return;
            category.forEach(item => {
              if (!item?.equipped) return;
              const rarity = (item.rarity || '').toLowerCase();
              const type = (item.type || '').toLowerCase();
              const looksMagical = ['uncommon','rare','very_rare','legendary','epic'].includes(rarity) || ['wondrous_item','ring','scroll','wand','rod','staff','potion'].includes(type) || (Array.isArray(item.properties) && item.properties.length > 0);
              if (looksMagical) magical.push(item.name || item.id);
            });
          });
          lines.push(`${actor.name}: ${magical.length ? magical.join(', ') : 'No strong auras'}`);
        }
        return lines.join('<br>');
      }
    });

    this.registerCommand('identify', {
      description: 'Identify a single equipped item of a targeted NPC',
      usage: '/identify',
      category: 'utility',
      execute: async (args, options) => {
        const targets = game.tokens?.getTargetedTokens?.() || [];
        if (targets.length === 0) return 'No targets selected.';
        const t = targets[0];
        const actor = t.actor;
        if (!actor || actor.type !== 'npc') return 'Target is not an NPC.';
        const inv = actor.system?.inventory || {};
        const equipped = [];
        Object.values(inv).forEach(category => {
          if (!Array.isArray(category)) return;
          category.forEach(item => { if (item?.equipped) equipped.push(item); });
        });
        if (equipped.length === 0) return `${actor.name} has nothing equipped.`;
        const item = equipped[Math.floor(Math.random() * equipped.length)];
        const parts = [
          `<strong>${item.name || item.id}</strong>`,
          item.type ? `Type: ${item.type}` : '',
          item.rarity ? `Rarity: ${item.rarity}` : '',
          item.damage ? `Damage: ${item.damage}${item.damageType ? ' ('+item.damageType+')' : ''}` : '',
          item.ac ? `AC: ${item.ac}` : '',
          item.description ? `${item.description}` : ''
        ].filter(Boolean).join('<br>');
        return parts;
      }
    });
    this.registerCommand('help', {
      description: 'Show available commands',
      usage: '/help [command]',
      category: 'utility',
      execute: async (args, options) => {
        if (args[0]) {
          const command = this.commands.get(args[0]);
          if (command) {
            return `**${args[0]}**: ${command.description}\nUsage: ${command.usage}`;
          } else {
            return `Command '${args[0]}' not found`;
          }
        }

        const categories = {};
        this.commands.forEach((cmd, name) => {
          if (!categories[cmd.category]) categories[cmd.category] = [];
          categories[cmd.category].push(name);
        });

        let help = "**Available Commands:**\n";
        Object.entries(categories).forEach(([category, commands]) => {
          help += `\n**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;
          commands.forEach(cmd => {
            help += `- /${cmd}: ${this.commands.get(cmd).description}\n`;
          });
        });

        return help;
      }
    });

    this.registerCommand('clear', {
      description: 'Clear chat history',
      usage: '/clear',
      category: 'utility',
      execute: async (args, options) => {
        const messages = game.messages.contents;
        for (const message of messages) {
          await message.delete();
        }
        return "Chat cleared";
      }
    });

    this.registerCommand('macro', {
      description: 'Execute a macro',
      usage: '/macro <macro-name>',
      category: 'utility',
      execute: async (args, options) => {
        const macroName = args.join(' ');
        if (!macroName) {
          return "Usage: /macro <macro-name>";
        }

        const macro = game.macros.find(m => m.name.toLowerCase() === macroName.toLowerCase());
        if (!macro) {
          return `Macro '${macroName}' not found`;
        }

        try {
          await macro.execute();
          return `Executed macro: ${macro.name}`;
        } catch (error) {
          return `Error executing macro: ${error.message}`;
        }
      }
    });

    // Quick actions
    this.registerCommand('rest', {
      description: 'Take a short or long rest',
      usage: '/rest short|long',
      category: 'character',
      execute: async (args, options) => {
        const restType = args[0] || 'short';
        const speaker = options.speaker;
        const actor = game.actors.get(speaker.actor);
        
        if (!actor) {
          return "No character selected";
        }

        if (restType === 'long') {
          await actor.longRest();
          return `${actor.name} takes a long rest and recovers fully`;
        } else {
          // Implement short rest logic
          const updates = {};
          const resources = actor.system.resources;
          
          Object.keys(resources).forEach(resource => {
            if (resources[resource].max > 0) {
              const restored = Math.floor(resources[resource].max / 2);
              updates[`system.resources.${resource}.value`] = Math.min(
                resources[resource].max,
                resources[resource].value + restored
              );
            }
          });
          
          if (Object.keys(updates).length > 0) {
            await actor.update(updates);
          }
          
          return `${actor.name} takes a short rest and recovers some resources`;
        }
      }
    });

    // Register aliases
    this.registerAlias('r', 'roll');
    this.registerAlias('d', 'damage');
    this.registerAlias('h', 'heal');
    this.registerAlias('s', 'save');
    this.registerAlias('c', 'check');
    this.registerAlias('init', 'initiative');
  }

  /**
   * Register a new command
   */
  static registerCommand(name, config) {
    this.commands.set(name.toLowerCase(), {
      name,
      description: config.description || 'No description',
      usage: config.usage || `/${name}`,
      category: config.category || 'misc',
      execute: config.execute,
      permissions: config.permissions || []
    });
  }

  /**
   * Register command alias
   */
  static registerAlias(alias, command) {
    this.aliases.set(alias.toLowerCase(), command.toLowerCase());
  }

  /**
   * Setup event listeners
   */
  static setupEventListeners() {
    // Intercept chat messages
    Hooks.on('preCreateChatMessage', (message, data, options, userId) => {
      return this.handleChatMessage(message, data, options, userId);
    });

    // Add chat input enhancements
    Hooks.on('renderChatLog', (app, html, data) => {
      this.enhanceChatInput(html);
    });
  }

  /**
   * Handle incoming chat messages
   */
  static handleChatMessage(message, data, options, userId) {
    if (!this.enabled) return true;

    const content = data.content?.trim();
    if (!content || !content.startsWith('/')) return true;

    // Parse command
    const parts = content.slice(1).split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check for alias
    const resolvedCommand = this.aliases.get(commandName) || commandName;
    const command = this.commands.get(resolvedCommand);

    if (!command) {
      // Not a recognized command, let it through
      return true;
    }

    // Prevent the original message from being created
    setTimeout(async () => {
      await this.executeCommand(command, args, {
        speaker: data.speaker,
        user: game.users.get(userId),
        flags: this.parseFlags(content)
      });
    }, 0);

    return false; // Prevent original message creation
  }

  /**
   * Execute a command
   */
  static async executeCommand(command, args, options) {
    try {
      // Add to command history
      this.commandHistory.unshift({
        command: command.name,
        args,
        timestamp: Date.now(),
        user: options.user.name
      });

      if (this.commandHistory.length > 50) {
        this.commandHistory.pop();
      }

      // Execute command
      const result = await command.execute(args, options);

      // Send result to chat
      if (result) {
        await ChatMessage.create({
          speaker: options.speaker,
          content: result,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          flags: {
            'custom-ttrpg': {
              isCommandResult: true
            }
          }
        });
      }

    } catch (error) {
      console.error(`Error executing command ${command.name}:`, error);
      
      await ChatMessage.create({
        speaker: options.speaker,
        content: `Error executing command: ${error.message}`,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        flags: {
          'custom-ttrpg': {
            isCommandError: true
          }
        }
      });
    }
  }

  /**
   * Parse flags from command string
   */
  static parseFlags(content) {
    const flags = [];
    const flagRegex = /--(\w+)/g;
    let match;

    while ((match = flagRegex.exec(content)) !== null) {
      flags.push(match[1]);
    }

    // Also check for common flags as words
    if (content.includes('advantage')) flags.push('advantage');
    if (content.includes('disadvantage')) flags.push('disadvantage');

    return flags;
  }

  /**
   * Enhance chat interface
   */
  static enhanceChatInterface() {
    // Add command palette button
    Hooks.on('renderChatLog', (app, html) => {
      const chatControls = html.find('#chat-controls');
      if (chatControls.length && !chatControls.find('.command-palette').length) {
        const button = $(`
          <a class="command-palette" title="Command Palette">
            <i class="fas fa-terminal"></i>
          </a>
        `);
        
        button.click(() => this.showCommandPalette());
        chatControls.prepend(button);
      }
    });
  }

  /**
   * Enhance chat input with autocomplete
   */
  static enhanceChatInput(html) {
    const textarea = html.find('#chat-message');
    if (!textarea.length) return;

    // Add autocomplete functionality
    textarea.on('input', (event) => {
      const value = event.target.value;
      if (value.startsWith('/')) {
        this.showAutocomplete(event.target, value);
      } else {
        this.hideAutocomplete();
      }
    });

    // Handle tab completion
    textarea.on('keydown', (event) => {
      if (event.key === 'Tab' && event.target.value.startsWith('/')) {
        event.preventDefault();
        this.handleTabCompletion(event.target);
      }
    });
  }

  /**
   * Show autocomplete suggestions
   */
  static showAutocomplete(input, value) {
    const commandPart = value.slice(1).toLowerCase();
    const suggestions = [];

    // Find matching commands
    this.commands.forEach((cmd, name) => {
      if (name.startsWith(commandPart)) {
        suggestions.push({
          name: `/${name}`,
          description: cmd.description,
          usage: cmd.usage
        });
      }
    });

    // Find matching aliases
    this.aliases.forEach((cmd, alias) => {
      if (alias.startsWith(commandPart)) {
        const command = this.commands.get(cmd);
        suggestions.push({
          name: `/${alias}`,
          description: `Alias for /${cmd}: ${command?.description}`,
          usage: command?.usage?.replace(`/${cmd}`, `/${alias}`)
        });
      }
    });

    if (suggestions.length > 0) {
      this.displayAutocomplete(input, suggestions);
    } else {
      this.hideAutocomplete();
    }
  }

  /**
   * Display autocomplete popup
   */
  static displayAutocomplete(input, suggestions) {
    this.hideAutocomplete();

    const popup = document.createElement('div');
    popup.className = 'command-autocomplete';
    popup.innerHTML = suggestions.map((suggestion, index) => `
      <div class="suggestion ${index === 0 ? 'selected' : ''}" data-command="${suggestion.name}">
        <strong>${suggestion.name}</strong>
        <div class="description">${suggestion.description}</div>
        <div class="usage">${suggestion.usage}</div>
      </div>
    `).join('');

    // Position popup
    const rect = input.getBoundingClientRect();
    popup.style.position = 'absolute';
    popup.style.left = rect.left + 'px';
    popup.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
    popup.style.minWidth = rect.width + 'px';
    popup.style.zIndex = '1000';

    document.body.appendChild(popup);
    this.currentAutocomplete = popup;

    // Add click handlers
    popup.addEventListener('click', (event) => {
      const suggestion = event.target.closest('.suggestion');
      if (suggestion) {
        input.value = suggestion.dataset.command + ' ';
        input.focus();
        this.hideAutocomplete();
      }
    });
  }

  /**
   * Hide autocomplete popup
   */
  static hideAutocomplete() {
    if (this.currentAutocomplete) {
      this.currentAutocomplete.remove();
      this.currentAutocomplete = null;
    }
  }

  /**
   * Handle tab completion
   */
  static handleTabCompletion(input) {
    const value = input.value;
    const commandPart = value.slice(1).toLowerCase().split(' ')[0];

    // Find first matching command
    let match = null;
    this.commands.forEach((cmd, name) => {
      if (!match && name.startsWith(commandPart)) {
        match = name;
      }
    });

    // Check aliases too
    if (!match) {
      this.aliases.forEach((cmd, alias) => {
        if (!match && alias.startsWith(commandPart)) {
          match = alias;
        }
      });
    }

    if (match) {
      const remainingValue = value.slice(commandPart.length + 1);
      input.value = `/${match} ${remainingValue}`;
      
      // Position cursor after command
      const position = match.length + 2;
      input.setSelectionRange(position, position);
    }
  }

  /**
   * Show command palette
   */
  static showCommandPalette() {
    const categories = {};
    this.commands.forEach((cmd, name) => {
      if (!categories[cmd.category]) categories[cmd.category] = [];
      categories[cmd.category].push({ name, ...cmd });
    });

    let content = '<div class="command-palette-content">';
    
    Object.entries(categories).forEach(([category, commands]) => {
      content += `
        <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
        <div class="command-list">
      `;
      
      commands.forEach(cmd => {
        content += `
          <div class="command-item" data-command="/${cmd.name}">
            <strong>/${cmd.name}</strong>
            <div class="description">${cmd.description}</div>
            <div class="usage">${cmd.usage}</div>
          </div>
        `;
      });
      
      content += '</div>';
    });
    
    content += '</div>';

    new Dialog({
      title: 'Command Palette',
      content,
      buttons: {
        close: { icon: '<i class="fas fa-times"></i>', label: 'Close' }
      },
      render: (html) => {
        html.find('.command-item').click((event) => {
          const command = event.currentTarget.dataset.command;
          const textarea = document.querySelector('#chat-message');
          if (textarea) {
            textarea.value = command + ' ';
            textarea.focus();
          }
        });
      }
    }, {
      width: 600,
      height: 500,
      resizable: true
    }).render(true);
  }

  /**
   * Get command history
   */
  static getCommandHistory(limit = 10) {
    return this.commandHistory.slice(0, limit);
  }

  /**
   * Clear command history
   */
  static clearCommandHistory() {
    this.commandHistory = [];
  }

  /**
   * Enable/disable command system
   */
  static setEnabled(enabled) {
    this.enabled = enabled;
    ui.notifications.info(`Chat commands ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Auto-initialize when ready
Hooks.once('ready', () => {
  ChatCommands.initialize();
});

// Export for module use
export default ChatCommands;