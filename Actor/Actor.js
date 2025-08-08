/**
 * CustomActor extends the base Actor and injects class-based data.
 */
export class CustomActor extends Actor {
  
  prepareBaseData() {
    super.prepareBaseData();
    if (this.type !== 'character') return;

    // Ensure default data structure exists
    this.system.class ||= "";
    this.system.attributes ||= {
      hp: { value: 10, max: 10 },
      str: { value: 8, max: 8 },
      dex: { value: 8, max: 8 },
      end: { value: 8, max: 8 },
      crit: 20
    };
    
    // Initialize combat stats
    this.system.combat ||= {
      attackBonus: 0,
      defense: 10,
      damageBonus: 0
    };
    
    // Initialize notes
    this.system.notes ||= "";
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type !== 'character') return;

    const cls = this.system.class;
    const info = CONFIG.CustomTTRPG.ClassInfo?.[cls];
    if (!info) return;

    // 1) Base stats from class
    for (const [stat, value] of Object.entries(info.baseStats)) {
      const key = stat.toLowerCase();
      if (key === 'health') {
        // Don't override HP max here, calculate it below
        continue;
      }
      const attr = this.system.attributes[key];
      if (attr && key !== 'critroll') {
        attr.max = value;
        // Set value to max if it's not set or exceeds max
        if (!attr.value || attr.value > value) {
          attr.value = value;
        }
      }
    }

    // 2) Derived HP calculation
    const end = this.system.attributes.end.value || 0;
    const baseHP = info.baseStats.Health || 10;
    const hpMultiplier = game.settings.get("custom-ttrpg","hpMultiplier") || 2;
    this.system.attributes.hp.max = baseHP + Math.floor(end * hpMultiplier);
    
    // Ensure current HP doesn't exceed max
    if (this.system.attributes.hp.value > this.system.attributes.hp.max) {
      this.system.attributes.hp.value = this.system.attributes.hp.max;
    }

    // 3) Crit threshold calculation
    const dex = this.system.attributes.dex.value || 0;
    const baseCrit = info.baseStats.CritRoll || 20;
    this.system.attributes.crit = Math.max(1, baseCrit - Math.floor(dex / 10));
    
    // 4) Derived combat stats
    const str = this.system.attributes.str.value || 0;
    this.system.combat.attackBonus = Math.floor((str + dex) / 4);
    this.system.combat.defense = 10 + Math.floor(dex / 2);
    this.system.combat.damageBonus = Math.floor(str / 3);
  }
}