Project Design Notes (Quick Reference)

Rarity palette (badges)
- Simple: translucent glass badge, border rgba(255,255,255,0.25)
- Common: #FFFFFF text #222
- Un-common: #28A745 white text
- Rare: #007BFF white text
- Epic: #6F42C1 white text
- Mythic: #DC3545 white text
- Legendary: #F1C40F black text

Schools of magic (color accents)
- Abjuration: #4FC3F7 (light blue)
- Conjuration: #26A69A (teal)
- Divination: #FFC107 (amber)
- Enchantment: #E91E63 (pink)
- Evocation: #FF5722 (deep orange)
- Illusion: #9C27B0 (purple)
- Necromancy:rgb(62, 92, 74) (charcoal green/black)
- Transmutation: #FF9800 (orange)

Category/type icons (Font Awesome)
- Spells: fas fa-magic
- Weapons: fas fa-sword
- Armor: fas fa-shield-alt
- Gear: fas fa-toolbox
- Consumables/Potions: fas fa-flask
- Scrolls: fas fa-scroll
- Rings: fas fa-ring
- Wands/Staffs: fas fa-wand-magic (fallback: fas fa-magic)
- Status/Effects: fas fa-magic (generic), poison: fas fa-skull-crossbones, invisible: fas fa-eye-slash, stunned: fas fa-bolt
- Loot/Drop: fas fa-gem
- Compendium: fas fa-book
- Abilities/Feats: fas fa-star
- Inventory: fas fa-boxes
- Equipment: fas fa-shield-alt
- Combat: fas fa-sword

HUD quick actions (icons)
- Quick Damage: fas fa-heart-broken
- Quick Heal: fas fa-heart
- Status Effects: fas fa-magic
- Use ID (Compendium Key): fas fa-bolt

Chat/FX conventions
- Damage floating text: -N, color #FF4444
- Healing floating text: +N, color #44FF44
- HIT/MISS floating text: HITrgb(200, 255, 0), MISS #FF4444

Compendium keys & normalization
- Key format: category[.subcategory[.group...]].id (e.g., spells.evocation.fireball, items.weapons.sword)
- Normalized rarities: simple, common, un-common, rare, epic, mythic, legendary
- Inferred fields: rangeFeet (parsed from range), requiresAttack (true if no save and weapon/item)

Color quick list (hex)
- Primary blue: #3498DB
- Accent green: #2ECC71
- Border gray: #666666
- Rarity: Un-common #28A745, Rare #007BFF, Epic #6F42C1, Mythic #DC3545, Legendary #F1C40F

Notes
- Badge CSS is in templates/applications/compendium-manager.html
- Rarity chances configurable at settings: loot.rarityChances (JSON map)

