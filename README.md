# Character Details Popup

A SillyTavern extension that displays a detailed preview modal when clicking on character cards, allowing users to review character information before starting a chat.

## Features

- **Character Preview Modal**: Shows character details in a popup instead of immediately starting a chat
- **Complete Character Information**: Displays character name, avatar, description, creator notes, and scenario
- **Smooth User Experience**:
  - Click "Start Chat" to begin conversation with the character
  - Click "Close" or press Escape to dismiss the modal
  - Click outside the modal to close it
- **Responsive Design**: Works on desktop and mobile devices
- **Theme Compatible**: Adapts to SillyTavern's theme colors

## Installation

### Via Extension Manager (Recommended)

1. Open SillyTavern
2. Go to **Extensions** menu (puzzle icon)
3. Click **Install Extension**
4. Paste the GitHub repository URL
5. Click **Save**

### Manual Installation

1. Navigate to your SillyTavern installation folder
2. Go to `public/scripts/extensions/third-party/`
3. Copy the `character-details-popup` folder into this directory
4. Restart SillyTavern

## Usage

1. Navigate to the character list in SillyTavern
2. Click on any character card
3. A modal will appear showing:
   - Character avatar
   - Character name
   - Description
   - Creator notes (if available)
   - Scenario (if available)
4. Click **Start Chat** to begin chatting with the character
5. Click **Close**, press **Escape**, or click outside the modal to dismiss it

## Compatibility

- **Minimum SillyTavern Version**: 1.13.4
- **Works with**: All SillyTavern themes
- **Tested on**: Desktop and mobile browsers

## Technical Details

- **Extension Type**: UI Extension
- **Loading Order**: 100
- **Files**:
  - `manifest.json` - Extension metadata
  - `script.js` - Main functionality
  - `style.css` - Modal styling
  - `README.md` - Documentation

## Development

This extension uses:
- Event delegation for efficient click handling
- SillyTavern's context API for character data access
- CSS custom properties for theme compatibility
- Defensive coding with optional chaining and nullish coalescing

## License

AGPL-3.0

## Support

For issues, feature requests, or contributions, please visit the project repository.

---

**Character Details Popup** - Enhancing character selection in SillyTavern
