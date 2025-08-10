export class LootSystem {
  static normalizeRarity(raw) {
    if (!raw) return 'simple';
    const r = String(raw).toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    if (r === 'very-rare' || r === 'veryrare') return 'epic';
    if (r === 'uncommon') return 'un-common';
    return r; // simple, common, un-common, rare, epic, mythic, legendary
  }

  static getRarityChances() {
    try {
      const raw = game.settings.get('custom-ttrpg', 'loot.rarityChances');
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed;
    } catch (e) {
      console.warn('Invalid loot.rarityChances setting, using defaults');
      return null;
    }
  }

  static isMagicalItem(item) {
    const rarity = this.normalizeRarity(item.rarity);
    const type = (item.type || '').toLowerCase();
    if (['un-common', 'rare', 'epic', 'mythic', 'legendary'].includes(rarity)) return true;
    if (['wondrous_item', 'ring', 'scroll', 'wand', 'rod', 'staff', 'potion'].includes(type)) return true;
    if (Array.isArray(item.properties) && item.properties.length > 0) return true;
    return false;
  }

  static getDropChance(item) {
    const rarity = this.normalizeRarity(item.rarity);
    const table = this.getRarityChances() || {
      simple: 0.8,
      common: 0.6,
      'un-common': 0.45,
      rare: 0.25,
      epic: 0.12,
      mythic: 0.08,
      legendary: 0.05
    };
    return table[rarity] ?? 0.3;
  }

  static extractEquippedItems(actor) {
    const inv = actor.system?.inventory || {};
    const equipped = [];
    Object.values(inv).forEach(category => {
      if (!Array.isArray(category)) return;
      category.forEach(item => {
        if (item?.equipped) equipped.push(item);
      });
    });
    return equipped;
  }

  static async dropLootForActor(actor) {
    if (!actor || actor.type !== 'npc') return;
    const alreadyDropped = actor.getFlag('custom-ttrpg', 'lootDropped');
    if (alreadyDropped) return;

    const equipped = this.extractEquippedItems(actor);
    const dropped = [];
    for (const item of equipped) {
      const chance = this.getDropChance(item);
      if (Math.random() <= chance) {
        dropped.push(item);
      }
    }

    // Mark as processed
    await actor.setFlag('custom-ttrpg', 'lootDropped', true);

    // Post to chat
    const header = `<h3>Loot Dropped from ${actor.name}</h3>`;
    let body = '';
    if (dropped.length === 0) {
      body = '<div>No loot dropped.</div>';
    } else {
      body = `<ul>${dropped.map(i => {
        const magical = this.isMagicalItem(i);
        const label = `${i.name || i.id} ${i.rarity ? `(<em>${i.rarity}</em>)` : ''}`;
        return `<li>${magical ? '⭐ ' : ''}${label}</li>`;
      }).join('')}</ul>`;
    }
    const content = `<div class="loot-drop" data-npc-id="${actor.id}">${header}${body}
      ${dropped.length ? '<div><small>Click an item to transfer to a player (GM only)</small></div>' : ''}
    </div>`;
    const msg = await ChatMessage.create({
      speaker: { alias: 'Loot' },
      content
    });

    // After render, attach click handlers for GM to transfer items
    Hooks.once('renderChatMessage', (app, html, data) => {
      if (!game.user.isGM) return;
      const container = html[0];
      if (!container) return;
      container.querySelectorAll('.loot-drop li').forEach((li, idx) => {
        li.style.cursor = 'pointer';
        li.title = 'Click to transfer to selected player character';
        li.addEventListener('click', async () => {
          const targets = game.actors?.filter(a => a.type === 'character' && a.isOwner) || [];
          const pc = targets[0];
          if (!pc) return ui.notifications.warn('No player character owned by you found.');
          const item = dropped[idx];
          if (!item) return;
          await pc.addToInventory(foundry.utils.duplicate(item), 'equipment');
          ui.notifications.info(`Transferred ${item.name || item.id} to ${pc.name}`);
        });
      });
    });
  }
}

export default LootSystem;

