/**
 * Character Sheet for Custom TTRPG V2
 * Handles the character sheet interface and interactions
 */

export class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["custom-ttrpg", "sheet", "actor"],
      template: `systems/${game.system.id}/templates/actors/character-sheet.html`,
      width: 800,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  getData() {
    const data = super.getData();
    const actorData = data.actor.system;
    
    // Add class info
    const classInfo = CONFIG.CustomTTRPG?.ClassInfo?.[actorData.class];
    data.classInfo = classInfo;
    
    // Add attribute effects
    if (classInfo?.attributeEffects) {
      data.attributeEffects = classInfo.attributeEffects;
    }
    
    // Add level progression
    if (classInfo?.levelProgression) {
      data.levelProgression = classInfo.levelProgression;
    }
    
    // Add class features
    if (classInfo?.classFeatures) {
      data.classFeatures = classInfo.classFeatures;
    }
    
    // Add spells
    if (classInfo?.spells) {
      data.spells = classInfo.spells;
    }

    // Abilities summarized for the sheet
    const abilities = this.actor.system.abilities || [];
    data.sheetAbilities = abilities.slice(0, 12); // show up to 12 quick abilities
    // Cooldowns if AbilitiesManager style data present
    data.abilityCooldowns = this.actor.system.abilityCooldowns || {};

    // Feats summarized for the sheet
    data.sheetFeats = Array.isArray(this.actor.system.feats) ? this.actor.system.feats : [];

    // Equipment bonuses summary (computed in prepareDerivedData)
    data.equipmentBonuses = actorData.equipmentBonuses || {
      attack: 0, defense: 0, magic: 0, health: 0, mana: 0, stamina: 0,
      critChance: 0, critDamage: 0, dodge: 0, block: 0
    };
    // Feat bonuses summary
    data.featBonuses = actorData.featBonuses || { attack: 0, defense: 0, damage: 0 };

    // Build set bonus descriptions with active thresholds
    const setCounts = actorData.setCounts || {};
    const setDefs = (CONFIG.CustomTTRPG && CONFIG.CustomTTRPG.SetBonuses) ? CONFIG.CustomTTRPG.SetBonuses : {};
    const setDescriptions = Object.entries(setCounts).map(([setName, count]) => {
      const defs = setDefs[setName] || {};
      const thresholds = Object.keys(defs).map(k => Number(k)).sort((a,b)=>a-b).map(th => ({
        threshold: th,
        desc: (defs[th]?.desc) ?? JSON.stringify(defs[th]?.stats || defs[th] || {}),
        active: count >= th
      }));
      return { name: setName, count, thresholds };
    });
    data.setDescriptions = setDescriptions;
    
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Class info button
    html.find('#ctt-btn-info').click(this._onShowClassInfo.bind(this));
    
    // Resource buttons
    html.find('.resource-btn').click(this._onResourceChange.bind(this));
    
    // Level up button
    html.find('.level-up').click(this._onLevelUp.bind(this));

    // Drag & Drop to sheet drop zone
    const dropZone = html.find('#sheet-drop-zone');
    if (dropZone.length) {
      const dz = dropZone[0];
      dz.addEventListener('dragover', (e) => {
        e.preventDefault();
        dz.classList.add('drag-over');
      });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
      dz.addEventListener('drop', (e) => this._onDropToSheet(e));
    }

    // Equipment slot drops
    html.find('.equip-slot').each((_, el) => {
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', (e) => this._onDropToEquipSlot(e));
    });

    // Unequip buttons
    html.find('.slot-unequip').on('click', async (ev) => {
      const slot = ev.currentTarget.dataset.slot;
      const equipment = foundry.utils.deepClone(this.actor.system.equipment || {});
      if (equipment[slot]) {
        equipment[slot] = null;
        await this.actor.update({ 'system.equipment': equipment });
        ui.notifications.info(`Unequipped ${slot}.`);
        this.render(true);
      }
    });

    // Auto-equip best
    html.find('.slot-auto').on('click', (ev) => this._onAutoEquip(ev));

    // Pick from backpack
    html.find('.slot-pick').on('click', (ev) => this._onPickFromBackpack(ev));

    // Compare current vs backpack items
    html.find('.slot-compare').on('click', (ev) => this._onCompareForSlot(ev));

    // Allow dragging from inline sheet inventory to equip
    html.find('.sheet-inv-item').on('dragstart', (ev) => {
      const el = ev.currentTarget;
      const itemId = el.dataset.itemId;
      const category = el.dataset.category;
      const inventory = this.actor.system.inventory || {};
      const item = (inventory[category] || []).find(i => i.id === itemId);
      const dt = ev.originalEvent?.dataTransfer;
      if (!item || !dt) return;
      dt.setData('application/json', JSON.stringify({ __cttType: 'item', item }));
      dt.setData('text/plain', itemId);
    });

    // Slot hover tooltip
    html.find('.equip-slot').on('mouseenter', (ev) => this._onSlotHoverIn(ev));
    html.find('.equip-slot').on('mouseleave', () => this._onSlotHoverOut());

    // Preferred equipment auto-apply (once per render)
    const autoApply = !!(this.actor.system.preferences?.autoApply ?? true);
    if (autoApply) this._applyPreferredEquipment().catch(console.error);

    // Preferences UI hooks
    html.find('#pref-auto-apply').on('change', async (ev) => {
      const checked = ev.currentTarget.checked;
      const prefs = foundry.utils.deepClone(this.actor.system.preferences || {});
      prefs.autoApply = checked;
      await this.actor.update({ 'system.preferences': prefs });
    });

    // Loadout buttons
    html.find('#btn-equip-preferred').on('click', () => this._applyPreferredEquipment());
    html.find('#btn-save-loadout').on('click', () => this._onSaveLoadout());
    html.find('#btn-load-loadout').on('click', () => this._onLoadLoadout());

    // Set info buttons
    html.find('.set-info').on('click', (ev) => this._onShowSetInfo(ev));

    // Theme preference
    html.find('#pref-theme').on('change', async (ev) => {
      const theme = ev.currentTarget.value;
      const prefs = foundry.utils.deepClone(this.actor.system.preferences || {});
      prefs.theme = theme;
      await this.actor.update({ 'system.preferences': prefs });
      this._applyTheme(theme);
    });
    this._applyTheme(this.actor.system.preferences?.theme || 'dark');

    // Macro buttons
    html.find('#btn-add-attack-macro').on('click', () => this._createAttackMacro());
    html.find('#btn-add-damage-macro').on('click', () => this._createDamageMacro());

    // Combat roll buttons
    html.find('#btn-attack-roll').on('click', (ev) => this._onAttackRoll(ev));
    html.find('#btn-damage-roll').on('click', (ev) => this._onDamageRoll(ev));

    // Abilities tab actions
    html.find('#btn-open-abilities').on('click', () => {
      if (game.customTTRPG?.AbilitiesManager) new game.customTTRPG.AbilitiesManager(this.actor).render(true);
      else ui.notifications.warn('Abilities Manager not available.');
    });
    // Feats tab actions
    html.find('#btn-open-feats').on('click', () => {
      if (game.customTTRPG?.FeatManager) new game.customTTRPG.FeatManager(this.actor).render(true);
      else ui.notifications.warn('Feat Manager not available.');
    });
    html.find('.feat-enabled').on('change', async (ev) => {
      const id = ev.currentTarget.closest('.sheet-feat-item')?.dataset?.featId;
      if (!id) return;
      const enabled = ev.currentTarget.checked;
      const feats = Array.isArray(this.actor.system.feats) ? foundry.utils.deepClone(this.actor.system.feats) : [];
      const idx = feats.findIndex(f => f.id === id);
      if (idx >= 0) {
        feats[idx].enabled = enabled;
        await this.actor.update({ 'system.feats': feats });
        this.render(true);
      }
    });
    html.find('.feat-remove').on('click', async (ev) => {
      const id = ev.currentTarget.closest('.sheet-feat-item')?.dataset?.featId;
      if (!id) return;
      const feats = Array.isArray(this.actor.system.feats) ? foundry.utils.deepClone(this.actor.system.feats) : [];
      const filtered = feats.filter(f => f.id !== id);
      await this.actor.update({ 'system.feats': filtered });
      ui.notifications.info('Feat removed.');
      this.render(true);
    });
    html.find('.feat-macro').on('click', async (ev) => {
      const el = ev.currentTarget.closest('.sheet-feat-item');
      const id = el?.dataset?.featId;
      const feat = (this.actor.system.feats || []).find(f => f.id === id);
      if (!feat) return;
      const name = `${this.actor.name}: ${feat.name} (Feat)`;
      const cmd = `(() => { const a=game.actors.get("${this.actor.id}"); const feat=(a.system.feats||[]).find(f=>f.id==="${id}"); if(!feat){return;} ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:a}), content: '<b>'+a.name+'</b> toggles <i>${feat.name}</i>.'}); })();`;
      await this._createHotbarMacro(name, cmd);
    });
    html.find('.sheet-ability-use').on('click', (ev) => this._onSheetAbilityUse(ev));
    html.find('.sheet-ability-remove').on('click', (ev) => this._onSheetAbilityRemove(ev));
    html.find('.sheet-ability-macro').on('click', (ev) => this._onSheetAbilityMacro(ev));
  }

  async _onShowClassInfo(event) {
    event.preventDefault();
    
    // Use the global function
    if (game.customTTRPG?.showClassInfo) {
      const className = this.actor.system?.class;
      if (className) {
        game.customTTRPG.showClassInfo(className);
      } else {
        ui.notifications.warn("No class set on this actor.");
      }
    }
  }

  async _onResourceChange(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const action = button.dataset.action;
    const resourceName = button.dataset.resource;
    
    const resource = this.actor.system.resources[resourceName];
    if (!resource) return;

    let newValue = resource.value;
    if (action === "increase" && newValue < resource.max) {
      newValue++;
    } else if (action === "decrease" && newValue > 0) {
      newValue--;
    }

    await this.actor.update({ 
      [`system.resources.${resourceName}.value`]: newValue 
    });
  }

  async _onLevelUp(event) {
    event.preventDefault();
    
    const currentLevel = this.actor.system.level;
    const newLevel = currentLevel + 1;
    
    // Check if level progression exists
    const classInfo = CONFIG.CustomTTRPG?.ClassInfo?.[this.actor.system.class];
    if (!classInfo?.levelProgression?.[newLevel]) {
      ui.notifications.warn("Maximum level reached!");
      return;
    }
    
    // Update level
    await this.actor.update({
      'system.level': newLevel
    });
    
    // Update resources based on new level
    if (classInfo.resources) {
      const updates = {};
      for (const [resourceName, resourceData] of Object.entries(classInfo.resources)) {
        // Simple level-based scaling for resource max values
        const newMax = Math.min(20, resourceData.max + Math.floor(newLevel / 2));
        updates[`system.resources.${resourceName}.max`] = newMax;
        updates[`system.resources.${resourceName}.value`] = newMax; // Refill on level up
      }
      
      if (Object.keys(updates).length > 0) {
        await this.actor.update(updates);
      }
    }
    
    ui.notifications.info(`${this.actor.name} reached level ${newLevel}!`);
  }

  // Accept drops from Equipment/Inventory/Compendium
  async _onDropToSheet(event) {
    event.preventDefault();
    const dz = event.currentTarget;
    dz.classList.remove('drag-over');

    try {
      const data = event.dataTransfer.getData('text/plain');
      if (!data) return;
      let payload = null;
      try { payload = JSON.parse(data); } catch (_) {}

      // Prefer structured payloads from our apps
      if (payload && payload.__cttType === 'item') {
        await this._addItemToActor(payload.item);
        return;
      }

      // Fallback: data is an ID from CompendiumManager list
      const fromId = data;
      if (fromId) {
        const item = window?.game?.customTTRPG?.__findCompendiumItemById
          ? await window.game.customTTRPG.__findCompendiumItemById(fromId)
          : null;
        if (item) {
          await this._addItemToActor(item);
          return;
        }
      }
    } catch (err) {
      console.error('Drop failed:', err);
      ui.notifications.error('Failed to add item.');
    }
  }

  async _addItemToActor(item) {
    const inventory = foundry.utils.deepClone(this.actor.system.inventory || {
      weapons: [], armor: [], equipment: [], consumables: [], valuables: []
    });
    const category = (item.category && inventory[item.category]) ? item.category : (item.type === 'weapon' ? 'weapons' : item.type === 'armor' ? 'armor' : item.type === 'consumable' ? 'consumables' : 'equipment');
    const newItem = {
      id: item.id || foundry.utils.randomID(),
      name: item.name,
      category,
      quantity: item.quantity || 1,
      weight: item.weight || 0,
      value: item.value || 0,
      description: item.description || '',
      type: item.type || 'equipment',
      stats: item.stats || undefined,
      equipped: false
    };
    inventory[category] = inventory[category] || [];
    inventory[category].push(newItem);
    await this.actor.update({ 'system.inventory': inventory });
    ui.notifications.info(`${newItem.name} added to inventory.`);
    this.render(true);
  }

  async _onDropToEquipSlot(event) {
    event.preventDefault();
    const slotEl = event.currentTarget;
    slotEl.classList.remove('drag-over');
    const slot = slotEl.dataset.slot;
    if (!slot) return;

    let payload = null;
    const json = event.dataTransfer.getData('application/json');
    if (json) {
      try { payload = JSON.parse(json); } catch (_) {}
    }
    if (!payload || payload.__cttType !== 'item') {
      const id = event.dataTransfer.getData('text/plain');
      if (id && window?.game?.customTTRPG?.__findCompendiumItemById) {
        const found = await window.game.customTTRPG.__findCompendiumItemById(id);
        if (found) payload = { __cttType: 'item', item: found };
      }
    }
    if (!payload) return;
    const item = payload.item;

    // Compatibility check (basic by type/slot name)
    const compatible = this._isItemCompatibleWithSlot(item, slot);
    if (!compatible) {
      ui.notifications.warn(`${item.name} cannot be equipped to ${slot}.`);
      return;
    }

    // Show stat delta preview
    this._showEquipDeltaPreview(item, slot);

    // Update equipment slot and persist
    const equipment = foundry.utils.deepClone(this.actor.system.equipment || {});
    equipment[slot] = item;
    await this.actor.update({ 'system.equipment': equipment });
    ui.notifications.info(`${item.name} equipped to ${slot}.`);
    this.render(true);
  }

  _isItemCompatibleWithSlot(item, slot) {
    const map = {
      head: ['armor','helmet','head'],
      chest: ['armor','chest','chestplate'],
      legs: ['armor','legs','greaves'],
      feet: ['armor','feet','boots'],
      ring1: ['accessory','ring'],
      ring2: ['accessory','ring'],
      trinket1: ['accessory','trinket'],
      magicItem: ['magic','accessory','trinket','magic'],
      mainHand: ['weapon','sword','axe','mace','staff','wand'],
      offHand: ['weapon','shield','sword','axe','mace','staff','wand'],
      ranged: ['weapon','bow','crossbow','gun','ranged']
    };
    const t = (item.type || '').toLowerCase();
    return (map[slot] || []).includes(t);
  }

  _showEquipDeltaPreview(newItem, slot) {
    const current = this.actor.system.equipment?.[slot] || null;
    const currentStats = current?.stats || {};
    const newStats = newItem?.stats || {};

    const keys = ['attack','defense','magic','health','mana','stamina','critChance','critDamage','dodge','block'];
    const rows = keys.map(k => {
      const oldV = Number(currentStats[k] || 0);
      const newV = Number(newStats[k] || 0);
      const delta = newV - oldV;
      const sign = delta > 0 ? '+' : (delta < 0 ? '-' : '');
      const cls = delta > 0 ? 'delta-pos' : (delta < 0 ? 'delta-neg' : '');
      return `<tr><td>${k}</td><td>${oldV}</td><td>${newV}</td><td class="${cls}">${sign}${Math.abs(delta)}</td></tr>`;
    }).join('');

    ui.notifications.info(`Previewing ${newItem.name} on ${slot}`);
    new Dialog({
      title: `Stat Changes: ${newItem.name} → ${slot}`,
      content: `
        <style>
          .delta-pos{ color:#2ecc71; font-weight:600; }
          .delta-neg{ color:#e74c3c; font-weight:600; }
          .equip-delta-table{ width:100%; border-collapse:collapse; }
          .equip-delta-table td, .equip-delta-table th{ border-bottom:1px solid var(--ctt-border); padding:4px 6px; }
          .equip-delta-table th{ text-align:left; }
        </style>
        <table class="equip-delta-table">
          <thead><tr><th>Stat</th><th>Current</th><th>New</th><th>Δ</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
      buttons: {
        ok: { label: 'OK' }
      }
    }).render(true);
  }

  _renderCompareTable(currentItem, newItem) {
    const cur = currentItem?.stats || {};
    const nxt = newItem?.stats || {};
    const keys = ['attack','defense','magic','health','mana','stamina','critChance','critDamage','dodge','block'];
    const rows = keys.map(k => {
      const oldV = Number(cur[k] || 0);
      const newV = Number(nxt[k] || 0);
      const delta = newV - oldV;
      const cls = delta > 0 ? 'delta-pos' : (delta < 0 ? 'delta-neg' : '');
      const sign = delta > 0 ? '+' : (delta < 0 ? '-' : '');
      return `<tr><td>${k}</td><td>${oldV}</td><td>${newV}</td><td class="${cls}">${sign}${Math.abs(delta)}</td></tr>`;
    }).join('');
    return `
      <style>
        .delta-pos{ color:#2ecc71; font-weight:600; }
        .delta-neg{ color:#e74c3c; font-weight:600; }
        .equip-delta-table{ width:100%; border-collapse:collapse; }
        .equip-delta-table td, .equip-delta-table th{ border-bottom:1px solid var(--ctt-border); padding:4px 6px; }
        .equip-delta-table th{ text-align:left; }
      </style>
      <table class="equip-delta-table">
        <thead><tr><th>Stat</th><th>Current</th><th>New</th><th>Δ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  _onCompareForSlot(ev) {
    const slot = ev.currentTarget.dataset.slot;
    const current = this.actor.system.equipment?.[slot] || null;
    const inv = this.actor.system.inventory || {};
    const candidates = [];
    Object.values(inv).forEach(arr => (arr || []).forEach(it => {
      if (this._isItemCompatibleWithSlot(it, slot)) candidates.push(it);
    }));
    if (candidates.length === 0) { ui.notifications.warn('No compatible items in backpack.'); return; }
    const options = candidates.map(it => `<option value="${it.id}">${it.name}</option>`).join('');
    const content = `
      <form>
        <div class="form-group">
          <label>Compare for ${slot}:</label>
          <select id="cmp-item">${options}</select>
        </div>
        <div id="cmp-table">${this._renderCompareTable(current, candidates[0])}</div>
      </form>`;
    const dlg = new Dialog({
      title: 'Compare Items',
      content,
      buttons: {
        equip: {
          label: 'Equip Selected',
          callback: async (html) => {
            const id = html.find('#cmp-item').val();
            const chosen = candidates.find(i => i.id === id);
            if (!chosen) return;
            const equipment = foundry.utils.deepClone(this.actor.system.equipment || {});
            equipment[slot] = chosen;
            await this.actor.update({ 'system.equipment': equipment });
            ui.notifications.info(`Equipped ${chosen.name} to ${slot}.`);
            this.render(true);
          }
        },
        close: { label: 'Close' }
      },
      render: (html) => {
        html.find('#cmp-item').on('change', (e) => {
          const id = e.currentTarget.value;
          const chosen = candidates.find(i => i.id === id);
          html.find('#cmp-table').html(this._renderCompareTable(current, chosen));
        });
      }
    });
    dlg.render(true);
  }

  async _onAutoEquip(ev) {
    const slot = ev.currentTarget.dataset.slot;
    const inv = this.actor.system.inventory || {};
    // Flatten inventory and find best by simple score (sum of stats)
    let candidates = [];
    Object.values(inv).forEach(arr => {
      (arr || []).forEach(it => candidates.push(it));
    });
    candidates = candidates.filter(it => this._isItemCompatibleWithSlot(it, slot));
    if (candidates.length === 0) {
      ui.notifications.warn('No compatible items in inventory.');
      return;
    }
    const score = (item) => {
      const s = item.stats || {};
      return ['attack','defense','magic','health','mana','stamina','critChance','critDamage','dodge','block']
        .reduce((a,k)=>a + Number(s[k]||0), 0);
    };
    candidates.sort((a,b)=>score(b)-score(a));
    const best = candidates[0];
    // Save preference
    const prefs = foundry.utils.deepClone(this.actor.system.preferences || { equipmentPreferred: {} });
    prefs.equipmentPreferred = prefs.equipmentPreferred || {};
    prefs.equipmentPreferred[slot] = best.id || best.name;
    await this.actor.update({ 'system.preferences': prefs });
    // Preview and apply
    this._showEquipDeltaPreview(best, slot);
    const equipment = foundry.utils.deepClone(this.actor.system.equipment || {});
    equipment[slot] = best;
    await this.actor.update({ 'system.equipment': equipment });
    ui.notifications.info(`Auto-equipped ${best.name} to ${slot}.`);
    this.render(true);
  }

  async _onPickFromBackpack(ev) {
    const slot = ev.currentTarget.dataset.slot;
    const inv = this.actor.system.inventory || {};
    // Build simple picker list of compatible items
    const items = [];
    Object.entries(inv).forEach(([cat, arr]) => {
      (arr || []).forEach(it => { if (this._isItemCompatibleWithSlot(it, slot)) items.push(it); });
    });
    if (items.length === 0) { ui.notifications.warn('No compatible items in backpack.'); return; }
    const list = items.map(it => `<option value="${it.id}">${it.name}</option>`).join('');
    const content = `
      <form>
        <div class="form-group">
          <label>Choose Item for ${slot}:</label>
          <select id="pick-item">${list}</select>
        </div>
      </form>`;
    new Dialog({
      title: 'Pick from Backpack',
      content,
      buttons: {
        equip: {
          label: 'Equip',
          callback: async (html) => {
            const id = html.find('#pick-item').val();
            const chosen = items.find(i => i.id === id);
            if (!chosen) return;
            this._showEquipDeltaPreview(chosen, slot);
            const equipment = foundry.utils.deepClone(this.actor.system.equipment || {});
            equipment[slot] = chosen;
            await this.actor.update({ 'system.equipment': equipment });
            ui.notifications.info(`Equipped ${chosen.name} to ${slot}.`);
            this.render(true);
          }
        },
        cancel: { label: 'Cancel' }
      }
    }).render(true);
  }

  _onSlotHoverIn(ev) {
    const slot = ev.currentTarget.dataset.slot;
    const item = this.actor.system.equipment?.[slot];
    if (!item) return;
    const stats = item.stats || {};
    const statRows = ['attack','defense','magic','health','mana','stamina','critChance','critDamage','dodge','block']
      .filter(k => stats[k] != null)
      .map(k => `<div>${k}</div><div>${stats[k]}</div>`)
      .join('');
    const tooltip = document.createElement('div');
    tooltip.className = 'equip-tooltip';
    tooltip.innerHTML = `
      <div class="tt-name">${item.name || 'Item'}</div>
      <div class="tt-type">${(item.type || '').toString()}</div>
      <div class="tt-stats">${statRows || '<div>—</div><div>—</div>'}</div>
      ${item.description ? `<div class="tt-desc">${item.description}</div>` : ''}
    `;
    document.body.appendChild(tooltip);
    const move = (e) => {
      tooltip.style.left = `${e.pageX + 14}px`;
      tooltip.style.top = `${e.pageY + 14}px`;
    };
    move(ev);
    document.addEventListener('mousemove', move);
    this._equipTooltip = { el: tooltip, move };
  }

  _onSlotHoverOut() {
    if (this._equipTooltip) {
      document.removeEventListener('mousemove', this._equipTooltip.move);
      this._equipTooltip.el.remove();
      this._equipTooltip = null;
    }
  }

  async _applyPreferredEquipment() {
    if (this._appliedPrefs) return;
    this._appliedPrefs = true;
    const prefs = this.actor.system.preferences || { equipmentPreferred: {} };
    const inv = this.actor.system.inventory || {};
    const equipment = foundry.utils.deepClone(this.actor.system.equipment || {});
    let changed = false;
    for (const [slot, prefIdOrName] of Object.entries(prefs.equipmentPreferred || {})) {
      if (equipment[slot]) continue;
      let found = null;
      for (const arr of Object.values(inv)) {
        const a = arr || [];
        found = a.find(i => i.id === prefIdOrName || i.name === prefIdOrName);
        if (found) break;
      }
      if (found && this._isItemCompatibleWithSlot(found, slot)) {
        equipment[slot] = found;
        changed = true;
      }
    }
    if (changed) await this.actor.update({ 'system.equipment': equipment });
  }

  _onShowSetInfo(ev) {
    const setName = ev.currentTarget.dataset.set;
    const setDefs = (CONFIG.CustomTTRPG && CONFIG.CustomTTRPG.SetBonuses) ? CONFIG.CustomTTRPG.SetBonuses : {};
    const defs = setDefs[setName] || {};
    const thresholds = Object.keys(defs).map(k => Number(k)).sort((a,b)=>a-b).map(th => ({
      threshold: th,
      desc: defs[th]?.desc ?? JSON.stringify(defs[th]?.stats || defs[th] || {})
    }));
    const rows = thresholds.map(t => `<div>${t.threshold}pc: ${t.desc}</div>`).join('');
    new Dialog({ title: `${setName} Set`, content: `<div>${rows || 'No details'}</div>`, buttons: { ok: { label: 'OK' } } }).render(true);
  }

  _onSaveLoadout() {
    const equipment = this.actor.system.equipment || {};
    const dataStr = JSON.stringify(equipment, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${this.actor.name}-loadout.json`; a.click();
    URL.revokeObjectURL(url);
  }

  _onLoadLoadout() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const equipment = JSON.parse(text);
        await this.actor.update({ 'system.equipment': equipment });
        ui.notifications.info('Loadout applied.');
        this.render(true);
      } catch (err) {
        console.error(err);
        ui.notifications.error('Invalid loadout file.');
      }
    };
    input.click();
  }

  async _onAttackRoll(event) {
    event?.preventDefault?.();
    const atk = Number(this.actor.system.combat?.attackBonus || 0);
    const eq = this.actor.system.equipmentBonuses || {};
    const setAtk = Number(eq.attack || 0);
    const extra = setAtk; // simple integration; expand later with buffs
    const crit = Number(this.actor.system.attributes?.crit || 20);
    const roll = await (new Roll(`1d20 + ${atk} + ${extra}`)).roll({ async: true });
    const d20 = roll.terms?.[0]?.results?.[0]?.result || roll.dice?.[0]?.total;
    const isCrit = d20 >= crit;
    const card = `
      <div class="ctt-roll-card">
        <div><b>Attack</b> ${isCrit ? '<span style="color:#ffd700">(CRIT!)</span>' : ''}</div>
        <div>Total: <b>${roll.total}</b></div>
        <div class="muted">Base ${atk} + Equip ${extra}</div>
      </div>`;
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: card });
  }

  async _onDamageRoll(event) {
    event?.preventDefault?.();
    const dice = this.actor.system.combat?.damageDice || '1d4';
    const bonus = Number(this.actor.system.combat?.damageBonus || 0);
    const eq = this.actor.system.equipmentBonuses || {};
    const extra = Number(eq.attack || 0);
    const roll = await (new Roll(`${dice} + ${bonus} + ${extra}`)).roll({ async: true });
    const card = `
      <div class="ctt-roll-card">
        <div><b>Damage</b></div>
        <div>Total: <b>${roll.total}</b></div>
        <div class="muted">Dice ${dice} + Bonus ${bonus} + Equip ${extra}</div>
      </div>`;
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: card });
  }

  async _onSheetAbilityUse(ev) {
    ev.preventDefault();
    const el = ev.currentTarget.closest('.sheet-ability-item');
    const abilityId = el?.dataset?.abilityId;
    if (!abilityId) return;
    // Try to delegate to AbilitiesManager logic if available
    try {
      const ability = (this.actor.system.abilities || []).find(a => a.id === abilityId);
      if (!ability) return ui.notifications.warn('Ability not found.');
      if (game.customTTRPG?.AbilitiesManager) {
        const mgr = new game.customTTRPG.AbilitiesManager(this.actor);
        if (mgr.useAbility) {
          await mgr.useAbility(ability);
          this.render(true);
          return;
        }
      }
      // Fallback: post to chat
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<b>${this.actor.name}</b> uses <i>${ability.name}</i>.`
      });
    } catch (err) {
      console.error(err);
      ui.notifications.error('Failed to use ability.');
    }
  }

  async _onSheetAbilityRemove(ev) {
    ev.preventDefault();
    const el = ev.currentTarget.closest('.sheet-ability-item');
    const abilityId = el?.dataset?.abilityId;
    if (!abilityId) return;
    const abilities = this.actor.system.abilities || [];
    const filtered = abilities.filter(a => a.id !== abilityId);
    await this.actor.update({ 'system.abilities': filtered });
    ui.notifications.info('Ability removed.');
    this.render(true);
  }

  _applyTheme(theme) {
    const el = this.element?.[0]?.closest('.app') || this.element?.[0];
    if (!el) return;
    const form = el.querySelector('.custom-sheet');
    if (!form) return;
    form.classList.toggle('light-theme', theme === 'light');
  }

  async _createAttackMacro() {
    const atk = Number(this.actor.system.combat?.attackBonus || 0);
    const crit = Number(this.actor.system.attributes?.crit || 20);
    const command = `const a=game.actors.get("${this.actor.id}"); const atk=${atk}; const crit=${crit}; const r=await(new Roll("1d20+"+atk)).roll({async:true}); const d20=r.terms?.[0]?.results?.[0]?.result||r.dice?.[0]?.total; const isCrit=d20>=crit; r.toMessage({speaker:ChatMessage.getSpeaker({actor:a}), flavor: 'Attack Roll'+(isCrit?' (CRIT!)':'')});`;
    await this._createHotbarMacro(`${this.actor.name} Attack`, command);
  }

  async _createDamageMacro() {
    const dice = this.actor.system.combat?.damageDice || '1d4';
    const bonus = Number(this.actor.system.combat?.damageBonus || 0);
    const command = `const a=game.actors.get("${this.actor.id}"); const r=await(new Roll("${dice}+${bonus}")).roll({async:true}); r.toMessage({speaker:ChatMessage.getSpeaker({actor:a}), flavor:'Damage Roll'});`;
    await this._createHotbarMacro(`${this.actor.name} Damage`, command);
  }

  async _createHotbarMacro(name, command) {
    let macro = game.macros?.find(m => m.name === name && m.command === command);
    if (!macro) macro = await Macro.create({ name, type: 'script', scope: 'global', command, img: 'icons/svg/sword.svg' });
    const slot = game.user.getHotbarMacros().findIndex(m => !m) + 1 || 1;
    await game.user.assignHotbarMacro(macro, slot);
    ui.notifications.info(`Macro "${name}" added to slot ${slot}.`);
  }

  async _onSheetAbilityMacro(ev) {
    ev.preventDefault();
    const el = ev.currentTarget.closest('.sheet-ability-item');
    const abilityId = el?.dataset?.abilityId;
    if (!abilityId) return;
    const ability = (this.actor.system.abilities || []).find(a => a.id === abilityId);
    if (!ability) return;
    const name = `${this.actor.name}: ${ability.name}`;
    const cmd = `(() => { const a=game.actors.get("${this.actor.id}"); const mgr=new (game.customTTRPG?.AbilitiesManager)(a); const ab=(a.system.abilities||[]).find(x=>x.id==="${abilityId}"); if(mgr&&mgr.useAbility&&ab){ mgr.useAbility(ab);} else { ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:a}), content: '<b>'+a.name+'</b> uses <i>${ability.name}</i>'}); } })();`;
    await this._createHotbarMacro(name, cmd);
  }
}

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
  if (max === 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

Handlebars.registerHelper('divide', function(a, b) {
  if (b === 0) return 0;
  return a / b;
});

Handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

Handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

Handlebars.registerHelper('formatNumber', function(num) {
  return num.toFixed(1);
});

Handlebars.registerHelper('capitalize', function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});
