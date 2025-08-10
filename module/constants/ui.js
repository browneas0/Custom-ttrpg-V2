export const RARITY = {
  SIMPLE: { key: 'simple', label: 'Simple', badgeClass: 'rarity-simple', bg: 'rgba(255,255,255,0.08)', text: '#e8e8e8', border: 'rgba(255,255,255,0.25)' },
  COMMON: { key: 'common', label: 'Common', badgeClass: 'rarity-common', bg: '#ffffff', text: '#222222' },
  UNCOMMON: { key: 'un-common', label: 'Un-common', badgeClass: 'rarity-un-common', bg: '#28a745', text: '#ffffff' },
  RARE: { key: 'rare', label: 'Rare', badgeClass: 'rarity-rare', bg: '#007bff', text: '#ffffff' },
  EPIC: { key: 'epic', label: 'Epic', badgeClass: 'rarity-epic', bg: '#6f42c1', text: '#ffffff' },
  MYTHIC: { key: 'mythic', label: 'Mythic', badgeClass: 'rarity-mythic', bg: '#dc3545', text: '#ffffff' },
  LEGENDARY: { key: 'legendary', label: 'Legendary', badgeClass: 'rarity-legendary', bg: '#f1c40f', text: '#000000' }
};

export const SCHOOL_COLORS = {
  abjuration: '#4FC3F7',
  conjuration: '#26A69A',
  divination: '#FFC107',
  enchantment: '#E91E63',
  evocation: '#FF5722',
  illusion: '#9C27B0',
  necromancy: '#263238',
  transmutation: '#FF9800'
};

export const TYPE_ICONS = {
  spell: 'fas fa-magic',
  weapon: 'fas fa-sword',
  armor: 'fas fa-shield-alt',
  gear: 'fas fa-toolbox',
  consumable: 'fas fa-flask',
  potion: 'fas fa-flask',
  scroll: 'fas fa-scroll',
  ring: 'fas fa-ring',
  wand: 'fas fa-wand-magic',
  staff: 'fas fa-wand-magic',
  effect: 'fas fa-magic',
  loot: 'fas fa-gem',
  compendium: 'fas fa-book',
  ability: 'fas fa-star',
  inventory: 'fas fa-boxes',
  equipment: 'fas fa-shield-alt',
  combat: 'fas fa-sword'
};

export const HUD_ICONS = {
  quickDamage: 'fas fa-heart-broken',
  quickHeal: 'fas fa-heart',
  statusEffects: 'fas fa-magic',
  useCompendium: 'fas fa-bolt'
};

export const FLOATING_TEXT = {
  damage: '#FF4444',
  heal: '#44FF44',
  hit: '#44FF44',
  miss: '#FF4444'
};

export const PALETTE = {
  primaryBlue: '#3498DB',
  accentGreen: '#2ECC71',
  borderGray: '#666666'
};

export default {
  RARITY,
  SCHOOL_COLORS,
  TYPE_ICONS,
  HUD_ICONS,
  FLOATING_TEXT,
  PALETTE
};

