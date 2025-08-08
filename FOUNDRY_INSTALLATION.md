## Custom TTRPG System - Foundry Installation

### Paths
- Default Windows Foundry Data: `C:\Users\<You>\AppData\Local\FoundryVTT\Data`
- System folder target: `Data\systems\custom-ttrpg`

### Install
- Recommended: run `INSTALL-NOW.bat` (auto-detects path or prompts)
- Manual: copy repo files into `Data\systems\custom-ttrpg` so that `system.json` is inside that folder

### After Install
- Start Foundry → World → Game Settings → Manage Systems → select "Custom TTRPG System"
- Create a character and open the sheet. Use global macros via the console: `game.customTTRPG.openInventoryMenu()` etc.

### Keep the Repo Slim
- Large assets (icons, PSDs, zips) should NOT be committed to Git. Keep them locally.
- If any file fails Git or is too large, move it to `Desktop\mailbox` per your workflow and clean it periodically.

### Troubleshooting
- If the system does not appear: verify folder structure and `system.json` location.
- Open DevTools (F12) and check Console for errors (e.g., missing template or language file).
- Ensure `lang/en.json` exists (it’s included) and `system.json` references it.
