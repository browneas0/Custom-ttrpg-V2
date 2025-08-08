# Custom TTRPG System V2 - Professional Edition

**A fully-featured, professional Foundry VTT system with editable character sheets, dynamic class progression, and extensive customization options.**

![Version](https://img.shields.io/badge/version-0.1.0--v2-blue)
![Foundry](https://img.shields.io/badge/foundry-v10%20%7C%20v11-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## ✨ Features

### 🎯 **Core System**
- **Professional character sheets** with tabbed interface (Stats, Combat, Notes)
- **Fully editable attributes** with auto-save functionality
- **Dynamic class system** with stat injection and progression
- **Custom buttons & hotkeys** for seamless gameplay
- **Dark theme styling** with professional UI/UX

### ⚔️ **Character Management**
- **Class-based character creation** (Monk, Warlock, easily expandable)
- **Automatic stat calculations** (HP, crit thresholds, combat bonuses)
- **Combat statistics** (Attack, Defense, Damage bonuses)
- **Character notes** and background tracking
- **Real-time stat updates** based on class and attributes

### 🎮 **User Experience**
- **Hotkey support** (C for classes, S for spells, I for inventory)
- **Custom Actor Directory buttons** for quick access
- **Professional styling** with hover effects and transitions
- **Responsive design** that works on different screen sizes
- **Error-free loading** with proper Foundry integration

## 🚀 Installation

### Method 1: Direct Download
1. Download this repository as ZIP
2. Extract to `FoundryVTT/Data/systems/custom-ttrpg/`
3. Enable **Custom TTRPG System** in Foundry
4. Create a new world using the system

### Method 2: Git Clone
```bash
cd FoundryVTT/Data/systems/
git clone https://github.com/browneas0/Custom-ttrpg-V2.git custom-ttrpg
```

## 🎲 Quick Start

1. **Create a World** using Custom TTRPG System
2. **Click the "Create Actor" button** in the Actor Directory (or press 'C')
3. **Choose your class** (Monk or Warlock)
4. **Open the character sheet** and explore the tabbed interface
5. **Edit attributes** - they save automatically!
6. **Click "Class Info"** to see detailed class information

## 📋 System Overview

### Character Classes
- **Monk**: Martial arts specialist with high DEX, unarmed combat focus
- **Warlock**: Dark magic wielder with high END, ritual-based abilities

### Attribute System
- **Strength (STR)**: Physical power, affects attack and damage
- **Dexterity (DEX)**: Agility and reflexes, affects defense and crit chance
- **Endurance (END)**: Stamina and health, multiplies HP pool
- **Health Points (HP)**: Base health + (END × multiplier)

### Combat Mechanics
- **Attack Bonus**: Calculated from STR + DEX
- **Defense Rating**: Base 10 + DEX modifier
- **Damage Bonus**: Derived from STR
- **Critical Hit Threshold**: Base class value - DEX modifier

## 🛠️ Customization

### Adding New Classes
Edit `data/Classinfo.json`:
```json
{
  "YourClass": {
    "description": "Your class description",
    "coreMechanic": "Unique mechanic",
    "baseStats": {
      "Health": 12,
      "STR": 10,
      "DEX": 8,
      "END": 14,
      "CritRoll": 18
    },
    "spells": ["Spell 1", "Spell 2"]
  }
}
```

### Modifying HP Calculation
Change the HP multiplier in Foundry Settings → System Settings

### Styling Customization
Edit `styles/custom-ttrpg.css` to modify colors, layouts, and themes

## 🔮 Roadmap

### Phase 1: Core Expansion
- [ ] **Spell System**: Casting, spell slots, elemental combinations
- [ ] **Inventory Management**: Equipment, weapons, armor
- [ ] **Item System**: Drag-and-drop functionality

### Phase 2: Advanced Features
- [ ] **Feat System**: Character progression and abilities
- [ ] **Subclasses**: Specialization paths
- [ ] **Multiclassing**: Mix and match class features

### Phase 3: World Building
- [ ] **NPC Templates**: Quick NPC generation
- [ ] **Encounter System**: Combat automation
- [ ] **Quest Management**: Story progression tools

## 🤝 Contributing

This is an open-source project! Feel free to:
- Report bugs via GitHub Issues
- Suggest features and improvements
- Submit pull requests
- Share your custom classes and modifications

## 📚 Documentation

### File Structure
```
custom-ttrpg/
├── system.json           # System manifest
├── Actor/
│   └── Actor.js         # Custom actor class with stat calculations
├── data/
│   └── Classinfo.json   # Class definitions and stats
├── module/
│   ├── init.js          # System initialization
│   ├── macros.js        # Character creation and UI functions
│   ├── class-loader.js  # Dynamic class loading
│   └── sheets/
│       └── character-sheet.js  # Character sheet logic
├── styles/
│   └── custom-ttrpg.css # Professional styling
└── templates/
    ├── actors/
    │   └── character-sheet.html  # Main character sheet
    └── partials/         # Reusable UI components
```

### Key Classes
- **CustomActor**: Handles stat calculations and derived values
- **CharacterSheet**: Manages the character sheet UI and interactions
- **Class System**: Dynamic loading from JSON configuration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Built for **Foundry Virtual Tabletop**
- Inspired by classic TTRPG systems
- Community-driven development
- Special thanks to the Foundry development community

## 📞 Support

- **GitHub Issues**: For bugs and feature requests
- **Foundry Discord**: Community support and discussion
- **Documentation**: Check this README for common questions

---

**Ready to embark on your custom TTRPG adventure?** 🎭⚔️✨
