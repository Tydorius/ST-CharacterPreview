# Character Details Popup

SillyTavern extension that displays character information in a popup when clicking character cards.

## Author's Note

My biggest complaint about SillyTavern has long been the fact that clicking on a character card to examine it immediately launches a chat. This plugin is my attempt to circumvent this issue by creating a popup box with options to start a chat. This way I can look at a character properly before I make my decision. I made additional adjustments so that it works with lazy loading, as I have 1,000+ cards (I'm a data hoarder leave me alone) and so lazy loading is a requirement for my container not to overload itself on every refresh.

I hope this works for others. No promises on mobile functionality. I tested this in Firefox 1.44 x64 on Windows 11, I do not have the time or patience to test it elsewhere.

Please consider [supporting me](https://ko-fi.com/tydorius) if you like what I'm doing.

## Features

- Character details displayed in popup before starting chat
- Collapsible sections for all character fields
- Multiple first message support with swipe navigation (or accordion style)
- Markdown rendering for description and first message fields
- Configurable default expanded tabs
- Full character data: name, avatar, description, first message, scenario, personality, creator notes, example messages
- Theme integration with customizable colors and blur effects
- Bulk edit mode compatibility
- Lazy loading support for large character libraries
- Character panel state preservation when closing popup
- Keyboard shortcuts: Escape to close, SHIFT+click to bypass popup

## Installation

### Via Extension Manager

1. Open SillyTavern Extensions menu
2. Click Install Extension
3. Enter repository URL
4. Click Save

### Manual Installation

1. Copy extension folder to `SillyTavern/public/scripts/extensions/third-party/`
2. Restart SillyTavern

## Usage

Click any character card to open the preview popup. Use the collapsible sections to view different parts of the character card.

**Actions:**
- Click Start Chat to begin conversation
- Click Close, press Escape, or click outside popup to dismiss
- Hold SHIFT while clicking character card to bypass popup and start chat directly

**Multiple First Messages:**
Characters with alternate greetings display navigation arrows in the First Message section. Click the arrows to cycle through available messages. The counter shows your position (e.g., "First Message (2/5)").

## Configuration

Access settings via Extensions panel. Available options:

### Display Settings
- Box width and height
- Content width
- Padding and border radius
- Image maximum height
- Responsive breakpoint

### Colors & Effects
- Overlay opacity
- Font color (theme or custom)
- Background color (theme or custom)
- Background opacity
- Blur strength
- Primary and secondary button colors (theme or custom)

### Behavior
- Accordion style first message(s): Shows all first messages as separate collapsible sections instead of swipe navigation
- Default expanded tabs: Choose which sections are expanded when the popup opens

## Compatibility

- SillyTavern 1.13.4 or higher
- Compatible with all SillyTavern themes
- Supports lazy loading configuration
- Works with user profile directories

## Technical Details

- Type: UI Extension
- Loading order: 100
- Files:
  - `manifest.json` - Extension metadata
  - `index.js` - Main logic
  - `style.css` - Styling
  - `settings.html` - Configuration UI

Uses ES6 modules, SillyTavern API imports, and marked.js for markdown rendering.

## License

AGPL-3.0
