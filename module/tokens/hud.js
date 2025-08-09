/**
 * Token and Scene Management System for Custom TTRPG V2
 * Handles token interactions, targeting, and scene utilities
 */

export class TokenManager {
  static targetedTokens = new Set();
  static hoveredToken = null;
  static draggedToken = null;
  static tokenAnimations = new Map();

  /**
   * Initialize the token system
   */
  static initialize() {
    this.setupEventListeners();
    this.registerTokenActions();
    this.initializeHUD();
    console.log("Token Manager | Initialized successfully");
  }

  /**
   * Setup event listeners for token interactions
   */
  static setupEventListeners() {
    // Token targeting
    Hooks.on('targetToken', (user, token, targeted) => {
      this.onTokenTargeted(token, targeted, user);
    });

    // Token hover
    Hooks.on('hoverToken', (token, hovered) => {
      this.onTokenHover(token, hovered);
    });

    // Token movement
    Hooks.on('updateToken', (tokenDocument, updateData, options, userId) => {
      this.onTokenUpdate(tokenDocument, updateData, options, userId);
    });

    // Combat updates
    Hooks.on('updateCombat', (combat, updateData) => {
      this.onCombatUpdate(combat, updateData);
    });

    // Click events
    canvas.stage.on('click', this.onCanvasClick.bind(this));
  }

  /**
   * Handle token targeting
   */
  static onTokenTargeted(token, targeted, user) {
    if (targeted) {
      this.targetedTokens.add(token.id);
      this.highlightToken(token, 'target');
    } else {
      this.targetedTokens.delete(token.id);
      this.clearTokenHighlight(token, 'target');
    }

    // Update UI elements that depend on targeting
    this.updateTargetingUI();
  }

  /**
   * Handle token hover
   */
  static onTokenHover(token, hovered) {
    if (hovered) {
      this.hoveredToken = token;
      this.showTokenTooltip(token);
      this.highlightToken(token, 'hover');
    } else {
      this.hoveredToken = null;
      this.hideTokenTooltip();
      this.clearTokenHighlight(token, 'hover');
    }
  }

  /**
   * Handle token updates
   */
  static onTokenUpdate(tokenDocument, updateData, options, userId) {
    // Handle position changes
    if (updateData.x !== undefined || updateData.y !== undefined) {
      this.onTokenMoved(tokenDocument, updateData);
    }

    // Handle HP changes
    if (updateData.actorData?.system?.attributes?.hp) {
      this.onTokenHealthChange(tokenDocument, updateData);
    }

    // Handle visibility changes
    if (updateData.hidden !== undefined) {
      this.onTokenVisibilityChange(tokenDocument, updateData.hidden);
    }
  }

  /**
   * Handle combat updates
   */
  static onCombatUpdate(combat, updateData) {
    if (updateData.turn !== undefined) {
      this.highlightCurrentTurn(combat);
    }
  }

  /**
   * Handle canvas clicks
   */
  static onCanvasClick(event) {
    const position = event.data.getLocalPosition(canvas.stage);
    this.lastClickPosition = { x: position.x, y: position.y };
    
    // Clear targeting if clicking empty space
    if (!event.target || !event.target.actor) {
      this.clearAllTargets();
    }
  }

  /**
   * Highlight token with specific type
   */
  static highlightToken(token, type) {
    if (!token?.mesh) return;

    const colors = {
      'target': 0xff0000,    // Red for targets
      'hover': 0x00ff00,     // Green for hover
      'current': 0xffff00,   // Yellow for current turn
      'ally': 0x0000ff,      // Blue for allies
      'enemy': 0xff8800      // Orange for enemies
    };

    // Remove existing highlights of this type
    this.clearTokenHighlight(token, type);

    // Create new highlight
    const highlight = new PIXI.Graphics();
    highlight.lineStyle(3, colors[type] || 0xffffff, 0.8);
    highlight.drawCircle(0, 0, token.w / 2 + 5);
    highlight.name = `highlight-${type}`;

    token.addChild(highlight);
    
    // Animate the highlight
    this.animateTokenHighlight(highlight, type);
  }

  /**
   * Clear token highlight
   */
  static clearTokenHighlight(token, type) {
    if (!token?.children) return;

    const highlight = token.children.find(child => child.name === `highlight-${type}`);
    if (highlight) {
      token.removeChild(highlight);
    }
  }

  /**
   * Animate token highlight
   */
  static animateTokenHighlight(highlight, type) {
    if (type === 'current') {
      // Pulse animation for current turn
      const pulse = () => {
        if (!highlight.parent) return;
        
        highlight.alpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.4;
        requestAnimationFrame(pulse);
      };
      pulse();
    } else if (type === 'target') {
      // Steady glow for targets
      highlight.alpha = 0.7;
    } else {
      // Fade in for others
      highlight.alpha = 0;
      const fadeIn = () => {
        if (!highlight.parent) return;
        
        highlight.alpha = Math.min(1, highlight.alpha + 0.1);
        if (highlight.alpha < 1) {
          requestAnimationFrame(fadeIn);
        }
      };
      fadeIn();
    }
  }

  /**
   * Show token tooltip
   */
  static showTokenTooltip(token) {
    if (!token.actor) return;

    const actor = token.actor;
    const tooltip = this.createTooltip(token, {
      name: actor.name,
      hp: `${actor.system.attributes?.hp?.value || 0}/${actor.system.attributes?.hp?.max || 0}`,
      ac: actor.system.combat?.ac || 10,
      status: this.getTokenStatusEffects(token)
    });

    this.currentTooltip = tooltip;
  }

  /**
   * Hide token tooltip
   */
  static hideTokenTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }

  /**
   * Create tooltip element
   */
  static createTooltip(token, data) {
    const tooltip = document.createElement('div');
    tooltip.className = 'token-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <strong>${data.name}</strong>
      </div>
      <div class="tooltip-stats">
        <div>HP: ${data.hp}</div>
        <div>AC: ${data.ac}</div>
        ${data.status.length > 0 ? `<div>Status: ${data.status.join(', ')}</div>` : ''}
      </div>
    `;

    // Position tooltip
    const rect = canvas.app.view.getBoundingClientRect();
    const tokenCenter = token.center;
    tooltip.style.position = 'absolute';
    tooltip.style.left = (rect.left + tokenCenter.x) + 'px';
    tooltip.style.top = (rect.top + tokenCenter.y - token.h / 2 - 60) + 'px';
    tooltip.style.zIndex = '1000';
    tooltip.style.pointerEvents = 'none';

    document.body.appendChild(tooltip);
    return tooltip;
  }

  /**
   * Get token status effects
   */
  static getTokenStatusEffects(token) {
    if (!token.actor?.system?.statusEffects) return [];
    return token.actor.system.statusEffects.map(effect => effect.name);
  }

  /**
   * Handle token movement
   */
  static onTokenMoved(tokenDocument, updateData) {
    const token = tokenDocument.object;
    if (!token) return;

    // Check for opportunity attacks
    if (game.settings.get('custom-ttrpg', 'combat.opportunityAttacks')) {
      this.checkOpportunityAttacks(token, updateData);
    }

    // Update visibility based on position
    this.updateTokenVisibility(token);

    // Animate movement if enabled
    if (game.settings.get('custom-ttrpg', 'ui.animationSpeed') !== 'instant') {
      this.animateTokenMovement(token, updateData);
    }
  }

  /**
   * Handle token health changes
   */
  static onTokenHealthChange(tokenDocument, updateData) {
    const token = tokenDocument.object;
    if (!token) return;

    const oldHp = token.actor.system.attributes.hp.value;
    const newHp = updateData.actorData.system.attributes.hp.value;
    const damage = oldHp - newHp;

    if (damage > 0) {
      // Show damage effect
      this.showDamageEffect(token, damage);
      if (game.effects) {
        game.effects.playEffect('fire-damage', token.mesh);
      }
    } else if (damage < 0) {
      // Show healing effect
      this.showHealingEffect(token, Math.abs(damage));
      if (game.effects) {
        game.effects.playEffect('healing', token.mesh);
      }
    }

    // Update health bar
    this.updateTokenHealthBar(token);
  }

  /**
   * Show damage effect on token
   */
  static showDamageEffect(token, damage) {
    const damageText = this.createFloatingText(token, `-${damage}`, '#ff4444');
    this.animateFloatingText(damageText, 'damage');
  }

  /**
   * Show healing effect on token
   */
  static showHealingEffect(token, healing) {
    const healText = this.createFloatingText(token, `+${healing}`, '#44ff44');
    this.animateFloatingText(healText, 'healing');
  }

  /**
   * Create floating text
   */
  static createFloatingText(token, text, color) {
    const textSprite = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: color,
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    textSprite.anchor.set(0.5);
    textSprite.x = token.x + token.w / 2;
    textSprite.y = token.y;
    
    canvas.interface.addChild(textSprite);
    return textSprite;
  }

  /**
   * Animate floating text
   */
  static animateFloatingText(textSprite, type) {
    const startY = textSprite.y;
    const endY = startY - 50;
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        canvas.interface.removeChild(textSprite);
        return;
      }

      // Move up and fade out
      textSprite.y = startY + (endY - startY) * progress;
      textSprite.alpha = 1 - progress;

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update token health bar
   */
  static updateTokenHealthBar(token) {
    if (!token.actor) return;

    const hp = token.actor.system.attributes.hp;
    const percentage = hp.max > 0 ? hp.value / hp.max : 0;

    // Remove existing health bar
    const existingBar = token.children.find(child => child.name === 'health-bar');
    if (existingBar) {
      token.removeChild(existingBar);
    }

    // Create new health bar
    if (percentage < 1) {
      const healthBar = this.createHealthBar(percentage);
      healthBar.name = 'health-bar';
      healthBar.y = -token.h / 2 - 10;
      token.addChild(healthBar);
    }
  }

  /**
   * Create health bar graphic
   */
  static createHealthBar(percentage) {
    const width = 40;
    const height = 6;
    
    const container = new PIXI.Container();
    
    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(-width/2, 0, width, height);
    bg.endFill();
    container.addChild(bg);
    
    // Health fill
    const fill = new PIXI.Graphics();
    const color = percentage > 0.5 ? 0x00ff00 : percentage > 0.25 ? 0xffff00 : 0xff0000;
    fill.beginFill(color, 0.8);
    fill.drawRect(-width/2, 0, width * percentage, height);
    fill.endFill();
    container.addChild(fill);
    
    return container;
  }

  /**
   * Highlight current turn token
   */
  static highlightCurrentTurn(combat) {
    // Clear previous current turn highlights
    canvas.tokens.placeables.forEach(token => {
      this.clearTokenHighlight(token, 'current');
    });

    // Highlight current combatant
    const currentCombatant = combat.combatant;
    if (currentCombatant?.token) {
      const token = currentCombatant.token.object;
      if (token) {
        this.highlightToken(token, 'current');
        
        // Pan to token if enabled
        if (game.settings.get('custom-ttrpg', 'combat.panToToken')) {
          canvas.animatePan({ x: token.x, y: token.y });
        }
      }
    }
  }

  /**
   * Clear all targets
   */
  static clearAllTargets() {
    this.targetedTokens.clear();
    canvas.tokens.placeables.forEach(token => {
      this.clearTokenHighlight(token, 'target');
    });
    this.updateTargetingUI();
  }

  /**
   * Update targeting UI elements
   */
  static updateTargetingUI() {
    // Update targeting info in combat tracker
    const targetInfo = document.querySelector('.target-info');
    if (targetInfo) {
      targetInfo.textContent = `Targets: ${this.targetedTokens.size}`;
    }

    // Enable/disable targeting-dependent buttons
    const targetButtons = document.querySelectorAll('.requires-target');
    targetButtons.forEach(button => {
      button.disabled = this.targetedTokens.size === 0;
    });
  }

  /**
   * Get targeted tokens
   */
  static getTargetedTokens() {
    return Array.from(this.targetedTokens).map(id => 
      canvas.tokens.get(id)
    ).filter(token => token);
  }

  /**
   * Apply damage to targeted tokens
   */
  static async applyDamageToTargets(damage, damageType = 'physical') {
    const targets = this.getTargetedTokens();
    if (targets.length === 0) {
      ui.notifications.warn("No targets selected!");
      return;
    }

    for (const token of targets) {
      if (token.actor) {
        await token.actor.takeDamage(damage, damageType);
      }
    }

    ui.notifications.info(`Applied ${damage} ${damageType} damage to ${targets.length} target(s)`);
  }

  /**
   * Apply healing to targeted tokens
   */
  static async applyHealingToTargets(healing) {
    const targets = this.getTargetedTokens();
    if (targets.length === 0) {
      ui.notifications.warn("No targets selected!");
      return;
    }

    for (const token of targets) {
      if (token.actor) {
        await token.actor.heal(healing);
      }
    }

    ui.notifications.info(`Applied ${healing} healing to ${targets.length} target(s)`);
  }

  /**
   * Register token context actions
   */
  static registerTokenActions() {
    // Add custom context menu items
    Hooks.on('getTokenHUDButtons', (hud, buttons, token) => {
      buttons.unshift({
        name: 'quick-damage',
        icon: 'fas fa-heart-broken',
        label: 'Quick Damage',
        onClick: () => this.showQuickDamageDialog(token)
      });

      buttons.unshift({
        name: 'quick-heal',
        icon: 'fas fa-heart',
        label: 'Quick Heal',
        onClick: () => this.showQuickHealDialog(token)
      });

      buttons.unshift({
        name: 'status-effects',
        icon: 'fas fa-magic',
        label: 'Status Effects',
        onClick: () => this.showStatusEffectsDialog(token)
      });
    });
  }

  /**
   * Show quick damage dialog
   */
  static showQuickDamageDialog(token) {
    const content = `
      <form>
        <div class="form-group">
          <label>Damage Amount:</label>
          <input type="number" id="damage-amount" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Damage Type:</label>
          <select id="damage-type">
            <option value="physical">Physical</option>
            <option value="fire">Fire</option>
            <option value="ice">Ice</option>
            <option value="lightning">Lightning</option>
            <option value="poison">Poison</option>
            <option value="psychic">Psychic</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: `Apply Damage - ${token.name}`,
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart-broken"></i>',
          label: 'Apply Damage',
          callback: async html => {
            const damage = parseInt(html.find('#damage-amount').val()) || 1;
            const damageType = html.find('#damage-type').val();
            
            if (token.actor) {
              await token.actor.takeDamage(damage, damageType);
            }
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'apply'
    }).render(true);
  }

  /**
   * Show quick heal dialog
   */
  static showQuickHealDialog(token) {
    const content = `
      <form>
        <div class="form-group">
          <label>Healing Amount:</label>
          <input type="number" id="heal-amount" value="1" min="1">
        </div>
      </form>
    `;

    new Dialog({
      title: `Apply Healing - ${token.name}`,
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart"></i>',
          label: 'Apply Healing',
          callback: async html => {
            const healing = parseInt(html.find('#heal-amount').val()) || 1;
            
            if (token.actor) {
              await token.actor.heal(healing);
            }
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'apply'
    }).render(true);
  }

  /**
   * Initialize HUD enhancements
   */
  static initializeHUD() {
    // Add targeting buttons to UI
    this.addTargetingControls();
    
    // Add quick action buttons
    this.addQuickActionButtons();
  }

  /**
   * Add targeting control buttons
   */
  static addTargetingControls() {
    const controls = `
      <div id="targeting-controls" class="control-buttons">
        <button id="clear-targets-btn" title="Clear All Targets">
          <i class="fas fa-times-circle"></i>
        </button>
        <span class="target-info">Targets: 0</span>
      </div>
    `;

    // Add to UI (exact location depends on your UI structure)
    if (document.querySelector('#ui-bottom')) {
      document.querySelector('#ui-bottom').insertAdjacentHTML('beforeend', controls);
      
      // Add event listeners
      document.querySelector('#clear-targets-btn')?.addEventListener('click', () => {
        this.clearAllTargets();
      });
    }
  }

  /**
   * Add quick action buttons
   */
  static addQuickActionButtons() {
    const actions = `
      <div id="quick-actions" class="control-buttons">
        <button id="quick-damage-targets" class="requires-target" disabled title="Damage Targets">
          <i class="fas fa-heart-broken"></i>
        </button>
        <button id="quick-heal-targets" class="requires-target" disabled title="Heal Targets">
          <i class="fas fa-heart"></i>
        </button>
      </div>
    `;

    if (document.querySelector('#ui-bottom')) {
      document.querySelector('#ui-bottom').insertAdjacentHTML('beforeend', actions);
      
      // Add event listeners
      document.querySelector('#quick-damage-targets')?.addEventListener('click', () => {
        this.showTargetDamageDialog();
      });
      
      document.querySelector('#quick-heal-targets')?.addEventListener('click', () => {
        this.showTargetHealDialog();
      });
    }
  }

  /**
   * Show target damage dialog
   */
  static showTargetDamageDialog() {
    const targets = this.getTargetedTokens();
    if (targets.length === 0) {
      ui.notifications.warn("No targets selected!");
      return;
    }

    const content = `
      <form>
        <div class="form-group">
          <label>Damage Amount:</label>
          <input type="number" id="damage-amount" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Damage Type:</label>
          <select id="damage-type">
            <option value="physical">Physical</option>
            <option value="fire">Fire</option>
            <option value="ice">Ice</option>
            <option value="lightning">Lightning</option>
            <option value="poison">Poison</option>
            <option value="psychic">Psychic</option>
          </select>
        </div>
        <div class="form-group">
          <label>Targets: ${targets.map(t => t.name).join(', ')}</label>
        </div>
      </form>
    `;

    new Dialog({
      title: 'Apply Damage to Targets',
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart-broken"></i>',
          label: 'Apply Damage',
          callback: async html => {
            const damage = parseInt(html.find('#damage-amount').val()) || 1;
            const damageType = html.find('#damage-type').val();
            
            await this.applyDamageToTargets(damage, damageType);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'apply'
    }).render(true);
  }

  /**
   * Show target heal dialog
   */
  static showTargetHealDialog() {
    const targets = this.getTargetedTokens();
    if (targets.length === 0) {
      ui.notifications.warn("No targets selected!");
      return;
    }

    const content = `
      <form>
        <div class="form-group">
          <label>Healing Amount:</label>
          <input type="number" id="heal-amount" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Targets: ${targets.map(t => t.name).join(', ')}</label>
        </div>
      </form>
    `;

    new Dialog({
      title: 'Apply Healing to Targets',
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart"></i>',
          label: 'Apply Healing',
          callback: async html => {
            const healing = parseInt(html.find('#heal-amount').val()) || 1;
            await this.applyHealingToTargets(healing);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'apply'
    }).render(true);
  }
}

// Auto-initialize when ready
Hooks.once('ready', () => {
  TokenManager.initialize();
});

// Export for module use
export default TokenManager;