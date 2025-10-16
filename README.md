# Character Details Popup

SillyTavern extension that displays character information in a popup modal when clicking character cards.

## Features

- Popup modal displays character details before starting a chat
- Collapsible sections for spoiler-sensitive content (first message, scenario, etc.)
- Markdown rendering support for description and first message fields
- Full character data display: name, avatar, description, first message, scenario, personality, creator notes, example messages
- Theme integration with customizable colors and blur effects
- Bulk edit mode compatibility
- Lazy loading support for large character libraries
- Keyboard shortcuts (Escape to close)
- Click outside modal or use Close button to dismiss

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

Click any character card to open the preview modal. The Description section is expanded by default. Other sections (First Message, Scenario, Personality, Creator Notes, Example Messages) are collapsed to prevent spoilers.

Click Start Chat to begin conversation or Close to dismiss the modal.

## Configuration

Access settings via Extensions panel. Available options:

### Display Settings
- Modal width and height
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

### Content
- Configurable image size
- Responsive layout breakpoint

## Compatibility

- SillyTavern 1.13.4 or higher
- Compatible with all SillyTavern themes
- Supports lazy loading configuration (lazyLoadCharacters: true)
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
