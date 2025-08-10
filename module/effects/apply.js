/**
 * Visual Effects and Animation System for Custom TTRPG V2
 * Inspired by JB2A and modern VTT visual enhancement patterns
 */

export class EffectsManager {
  static effects = new Map();
  static animations = new Map();
  static sounds = new Map();

  /**
   * Initialize the effects system
   */
  static initialize() {
    this.loadDefaultEffects();
    this.setupEventListeners();
    console.log("Effects Manager | Initialized successfully");
  }

  /**
   * Load default spell and ability effects
   */
  static loadDefaultEffects() {
    // Damage type effects
    this.registerEffect('fire-damage', {
      type: 'particle',
      duration: 1500,
      particles: {
        count: 15,
        color: '#ff4500',
        size: { min: 2, max: 8 },
        velocity: { min: 50, max: 150 },
        gravity: -0.5,
        fadeOut: true
      },
      sound: 'fire-whoosh'
    });

    this.registerEffect('ice-damage', {
      type: 'particle',
      duration: 2000,
      particles: {
        count: 12,
        color: '#87ceeb',
        size: { min: 3, max: 6 },
        velocity: { min: 30, max: 100 },
        gravity: 0.3,
        fadeOut: true,
        shape: 'snowflake'
      },
      sound: 'ice-crack'
    });

    this.registerEffect('lightning-damage', {
      type: 'flash',
      duration: 800,
      flash: {
        color: '#ffff00',
        intensity: 0.8,
        flickers: 3
      },
      shake: {
        intensity: 5,
        duration: 300
      },
      sound: 'thunder'
    });

    this.registerEffect('healing', {
      type: 'glow',
      duration: 2500,
      glow: {
        color: '#90ee90',
        intensity: 0.6,
        pulse: true,
        pulseSpeed: 0.05
      },
      particles: {
        count: 8,
        color: '#90ee90',
        size: { min: 1, max: 4 },
        velocity: { min: 20, max: 80 },
        gravity: -0.8,
        fadeOut: true,
        shape: 'sparkle'
      },
      sound: 'healing-chime'
    });

    // Status effect visuals
    this.registerEffect('poisoned', {
      type: 'overlay',
      duration: -1, // Persistent
      overlay: {
        color: '#9932cc',
        opacity: 0.2,
        pulse: true,
        pulseSpeed: 0.03
      },
      particles: {
        count: 3,
        color: '#9932cc',
        size: { min: 2, max: 5 },
        velocity: { min: 10, max: 30 },
        gravity: 0.1,
        continuous: true,
        shape: 'bubble'
      }
    });

    this.registerEffect('blessed', {
      type: 'aura',
      duration: -1,
      aura: {
        color: '#ffd700',
        intensity: 0.4,
        radius: 20,
        pulse: true,
        pulseSpeed: 0.02
      },
      sound: 'blessing-bell'
    });

    // Combat effects
    this.registerEffect('critical-hit', {
      type: 'burst',
      duration: 1200,
      burst: {
        color: '#ff0000',
        intensity: 1.0,
        radius: 30,
        expandSpeed: 5
      },
      shake: {
        intensity: 8,
        duration: 400
      },
      flash: {
        color: '#ffffff',
        intensity: 0.9,
        duration: 200
      },
      sound: 'critical-impact'
    });

    this.registerEffect('level-up', {
      type: 'celebration',
      duration: 3000,
      celebration: {
        particles: {
          count: 25,
          colors: ['#ffd700', '#ff69b4', '#00ff00', '#87ceeb'],
          size: { min: 3, max: 10 },
          velocity: { min: 100, max: 300 },
          gravity: -0.3,
          fadeOut: true,
          shapes: ['star', 'circle', 'sparkle']
        },
        fireworks: true,
        confetti: true
      },
      sound: 'level-up-fanfare'
    });
  }

  /**
   * Register a new effect
   */
  static registerEffect(name, config) {
    this.effects.set(name, config);
  }

  /**
   * Play an effect
   */
  static async playEffect(effectName, target, options = {}) {
    const effect = this.effects.get(effectName);
    if (!effect) {
      console.warn(`Effect "${effectName}" not found`);
      return;
    }

    const element = this.getTargetElement(target);
    if (!element) return;

    // Create effect container
    const effectContainer = this.createEffectContainer(element, options);
    
    // Apply effect based on type
    switch (effect.type) {
      case 'particle':
        await this.playParticleEffect(effect, effectContainer, options);
        break;
      case 'flash':
        await this.playFlashEffect(effect, effectContainer, options);
        break;
      case 'glow':
        await this.playGlowEffect(effect, effectContainer, options);
        break;
      case 'overlay':
        await this.playOverlayEffect(effect, effectContainer, options);
        break;
      case 'aura':
        await this.playAuraEffect(effect, effectContainer, options);
        break;
      case 'burst':
        await this.playBurstEffect(effect, effectContainer, options);
        break;
      case 'celebration':
        await this.playCelebrationEffect(effect, effectContainer, options);
        break;
    }

    // Play sound if specified
    if (effect.sound && options.playSound !== false) {
      this.playSound(effect.sound, options.volume);
    }

    // Clean up after duration (if not persistent)
    if (effect.duration > 0) {
      setTimeout(() => {
        this.removeEffectContainer(effectContainer);
      }, effect.duration);
    }

    return effectContainer;
  }

  /**
   * Get target element for effect
   */
  static getTargetElement(target) {
    if (typeof target === 'string') {
      return document.querySelector(target);
    } else if (target instanceof HTMLElement) {
      return target;
    } else if (target && target.element) {
      return target.element;
    }
    return null;
  }

  /**
   * Create effect container
   */
  static createEffectContainer(targetElement, options = {}) {
    const container = document.createElement('div');
    container.className = 'vtt-effect-container';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: hidden;
    `;

    // Position relative to target
    const rect = targetElement.getBoundingClientRect();
    if (options.absolute) {
      container.style.position = 'fixed';
      container.style.top = rect.top + 'px';
      container.style.left = rect.left + 'px';
      container.style.width = rect.width + 'px';
      container.style.height = rect.height + 'px';
      document.body.appendChild(container);
    } else {
      targetElement.style.position = 'relative';
      targetElement.appendChild(container);
    }

    return container;
  }

  /**
   * Play particle effect
   */
  static async playParticleEffect(effect, container, options = {}) {
    const particles = effect.particles;
    const count = particles.count || 10;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'vtt-particle';
      
      const size = this.randomBetween(particles.size.min, particles.size.max);
      const velocity = this.randomBetween(particles.velocity.min, particles.velocity.max);
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;

      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${particles.color};
        border-radius: 50%;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        opacity: 1;
      `;

      container.appendChild(particle);

      // Animate particle
      this.animateParticle(particle, vx, vy, particles.gravity || 0, effect.duration);
    }
  }

  /**
   * Animate a single particle
   */
  static animateParticle(particle, vx, vy, gravity, duration) {
    let x = 0, y = 0;
    let currentVy = vy;
    const startTime = Date.now();
    const startOpacity = 1;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        particle.remove();
        return;
      }

      x += vx * 0.016; // Assume 60fps
      y += currentVy * 0.016;
      currentVy += gravity;

      const opacity = startOpacity * (1 - progress);

      particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      particle.style.opacity = opacity;

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  /**
   * Play flash effect
   */
  static async playFlashEffect(effect, container, options = {}) {
    const flash = effect.flash;
    const overlay = document.createElement('div');
    overlay.className = 'vtt-flash-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${flash.color};
      opacity: 0;
      pointer-events: none;
    `;

    container.appendChild(overlay);

    // Flash animation
    const flickers = flash.flickers || 1;
    const flickerDuration = effect.duration / (flickers * 2);

    for (let i = 0; i < flickers; i++) {
      await this.animateProperty(overlay, 'opacity', 0, flash.intensity, flickerDuration / 2);
      await this.animateProperty(overlay, 'opacity', flash.intensity, 0, flickerDuration / 2);
    }

    // Screen shake if specified
    if (effect.shake) {
      this.applyScreenShake(effect.shake.intensity, effect.shake.duration);
    }
  }

  /**
   * Play glow effect
   */
  static async playGlowEffect(effect, container, options = {}) {
    const glow = effect.glow;
    container.style.boxShadow = `0 0 20px ${glow.color}`;
    container.style.filter = `drop-shadow(0 0 10px ${glow.color})`;

    if (glow.pulse) {
      this.startPulseAnimation(container, glow.pulseSpeed || 0.05);
    }

    // Add particles if specified
    if (effect.particles) {
      await this.playParticleEffect(effect, container, options);
    }
  }

  /**
   * Start pulse animation
   */
  static startPulseAnimation(element, speed) {
    let opacity = 1;
    let direction = -1;

    const pulse = () => {
      opacity += direction * speed;
      if (opacity <= 0.3) {
        opacity = 0.3;
        direction = 1;
      } else if (opacity >= 1) {
        opacity = 1;
        direction = -1;
      }

      element.style.opacity = opacity;
      
      if (element.parentNode) {
        requestAnimationFrame(pulse);
      }
    };

    requestAnimationFrame(pulse);
  }

  /**
   * Apply screen shake
   */
  static applyScreenShake(intensity, duration) {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const originalTransform = canvas.style.transform;
    const startTime = Date.now();

    const shake = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        canvas.style.transform = originalTransform;
        return;
      }

      const currentIntensity = intensity * (1 - progress);
      const x = (Math.random() - 0.5) * currentIntensity;
      const y = (Math.random() - 0.5) * currentIntensity;

      canvas.style.transform = `translate(${x}px, ${y}px) ${originalTransform}`;

      requestAnimationFrame(shake);
    };

    requestAnimationFrame(shake);
  }

  /**
   * Animate a CSS property
   */
  static animateProperty(element, property, from, to, duration) {
    return new Promise(resolve => {
      const startTime = Date.now();
      const startValue = from;
      const targetValue = to;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = startValue + (targetValue - startValue) * progress;

        element.style[property] = value;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Play sound effect
   */
  static playSound(soundName, volume = 0.5) {
    // This would integrate with Foundry's audio system
    // For now, just log the sound effect
    console.log(`Playing sound: ${soundName} at volume ${volume}`);
    
    // In a real implementation:
    // AudioHelper.play({ src: `sounds/effects/${soundName}.ogg`, volume });
  }

  /**
   * Remove effect container
   */
  static removeEffectContainer(container) {
    if (container && container.parentNode) {
      container.style.transition = 'opacity 0.3s ease-out';
      container.style.opacity = '0';
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 300);
    }
  }

  /**
   * Utility: Random number between min and max
   */
  static randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Setup event listeners for automatic effects
   */
  static setupEventListeners() {
    // Listen for dice rolls to add visual flair
    Hooks.on('createChatMessage', (message) => {
      if (message.isRoll) {
        const total = message.rolls?.[0]?.total;
        if (total === 20) {
          // Critical success effect
          this.playEffect('critical-hit', '.chat-message:last-child');
        }
      }
    });

    // Listen for actor updates for status effects and loot drops
    Hooks.on('updateActor', async (actor, updateData) => {
      if (updateData.system?.attributes?.hp) {
        const hpChange = updateData.system.attributes.hp.value - (actor.system.attributes.hp.value || 0);
        
        if (hpChange < 0) {
          // Damage effect
          this.playEffect('fire-damage', `[data-actor-id="${actor.id}"]`);
        } else if (hpChange > 0) {
          // Healing effect
          this.playEffect('healing', `[data-actor-id="${actor.id}"]`);
        }

        // Loot drop when NPC dies
        try {
          const newHp = updateData.system.attributes.hp.value;
          if (actor.type === 'npc' && newHp <= 0) {
            const { LootSystem } = await import('../automation/loot.js');
            if (LootSystem?.dropLootForActor) await LootSystem.dropLootForActor(actor);
          }
        } catch (e) {
          console.warn('Loot drop handling failed:', e);
        }
      }
    });
  }

  /**
   * Play overlay effect (for status effects)
   */
  static async playOverlayEffect(effect, container, options = {}) {
    const overlay = effect.overlay;
    const overlayElement = document.createElement('div');
    overlayElement.className = 'vtt-status-overlay';
    overlayElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${overlay.color};
      opacity: ${overlay.opacity || 0.2};
      pointer-events: none;
      mix-blend-mode: multiply;
    `;

    container.appendChild(overlayElement);

    if (overlay.pulse) {
      this.startPulseAnimation(overlayElement, overlay.pulseSpeed || 0.03);
    }

    // Add continuous particles if specified
    if (effect.particles && effect.particles.continuous) {
      this.startContinuousParticles(effect.particles, container);
    }
  }

  /**
   * Start continuous particle emission
   */
  static startContinuousParticles(particles, container) {
    const emitParticle = () => {
      if (!container.parentNode) return;

      const particle = document.createElement('div');
      const size = this.randomBetween(particles.size.min, particles.size.max);
      
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${particles.color};
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: 100%;
        opacity: 0.7;
      `;

      container.appendChild(particle);

      // Animate upward
      const velocity = this.randomBetween(particles.velocity.min, particles.velocity.max);
      this.animateParticle(particle, 0, -velocity, particles.gravity || 0, 3000);

      // Schedule next particle
      setTimeout(emitParticle, 500 + Math.random() * 1000);
    };

    emitParticle();
  }

  /**
   * Play aura effect
   */
  static async playAuraEffect(effect, container, options = {}) {
    const aura = effect.aura;
    const auraElement = document.createElement('div');
    auraElement.className = 'vtt-aura';
    auraElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${aura.radius * 2}px;
      height: ${aura.radius * 2}px;
      border: 2px solid ${aura.color};
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: ${aura.intensity || 0.5};
      box-shadow: 0 0 ${aura.radius}px ${aura.color};
    `;

    container.appendChild(auraElement);

    if (aura.pulse) {
      this.startPulseAnimation(auraElement, aura.pulseSpeed || 0.02);
    }
  }

  /**
   * Play burst effect
   */
  static async playBurstEffect(effect, container, options = {}) {
    const burst = effect.burst;
    const burstElement = document.createElement('div');
    burstElement.className = 'vtt-burst';
    burstElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: radial-gradient(circle, ${burst.color} 0%, transparent 70%);
      transform: translate(-50%, -50%);
      opacity: ${burst.intensity || 1};
    `;

    container.appendChild(burstElement);

    // Expand burst
    await this.animateProperty(burstElement, 'width', 0, burst.radius * 2, effect.duration / 2);
    await this.animateProperty(burstElement, 'height', 0, burst.radius * 2, effect.duration / 2);
    
    // Fade out
    await this.animateProperty(burstElement, 'opacity', burst.intensity, 0, effect.duration / 2);

    // Screen shake and flash
    if (effect.shake) {
      this.applyScreenShake(effect.shake.intensity, effect.shake.duration);
    }
    if (effect.flash) {
      this.playFlashEffect({ flash: effect.flash, duration: effect.flash.duration }, container);
    }
  }

  /**
   * Play celebration effect
   */
  static async playCelebrationEffect(effect, container, options = {}) {
    const celebration = effect.celebration;
    
    // Confetti and particles
    for (let i = 0; i < celebration.particles.count; i++) {
      const particle = document.createElement('div');
      const size = this.randomBetween(celebration.particles.size.min, celebration.particles.size.max);
      const color = celebration.particles.colors[Math.floor(Math.random() * celebration.particles.colors.length)];
      
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${Math.random() * 100}%;
        top: 100%;
        opacity: 1;
      `;

      // Random shape
      const shapes = celebration.particles.shapes || ['circle'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      if (shape === 'star') {
        particle.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
      } else {
        particle.style.borderRadius = '50%';
      }

      container.appendChild(particle);

      // Animate with celebration physics
      const velocity = this.randomBetween(celebration.particles.velocity.min, celebration.particles.velocity.max);
      const angle = Math.random() * Math.PI - Math.PI / 2; // Upward bias
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      
      this.animateParticle(particle, vx, vy, celebration.particles.gravity || -0.3, effect.duration);
    }
  }
}

// Auto-initialize when module loads
Hooks.once('ready', () => {
  EffectsManager.initialize();
});

export default EffectsManager;