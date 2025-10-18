import { eventSource, event_types, characters, selectCharacterById, saveSettingsDebounced, getRequestHeaders } from '../../../../script.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { power_user } from '../../../power-user.js';

const extensionName = 'third-party/ST-CharacterPreview';
const extensionFolder = 'third-party/ST-CharacterPreview';

// Store reference to currently open box and event handler
let currentBox = null;
let escapeKeyHandler = null;
let drawerWasOpen = false;

// Markdown library reference
let marked = null;

// Extension settings with defaults
let extensionSettings = {
    boxWidth: 80,
    boxHeight: 80,
    boxPadding: 2,
    boxBorderRadius: 12,
    overlayOpacity: 70,
    primaryButtonColor: '#4a9eff',
    secondaryButtonColor: '#999999',
    contentWidth: 50,
    imageMaxHeight: 400,
    responsiveBreakpoint: 700,
    useThemePrimaryColor: true,
    useThemeSecondaryColor: true,
    fontColor: '#ffffff',
    backgroundColor: '#1a1a1a',
    backgroundOpacity: 95,
    blurStrength: 10,
    useThemeFontColor: true,
    useThemeBackgroundColor: true,
};

/**
 * Log message with extension prefix
 * @param {string} message - Message to log
 */
function log(message) {
    console.log(`[Character Details Popup] ${message}`);
}

/**
 * Load the marked markdown library
 */
async function loadMarkedLibrary() {
    if (marked) {
        return marked;
    }

    try {
        // Dynamically load marked.js from CDN
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // Access the global marked object
        marked = window.marked;

        // Configure marked for safe rendering
        marked.setOptions({
            breaks: true,
            gfm: true,
        });

        log('Marked library loaded successfully');
        return marked;
    } catch (error) {
        console.error('[Character Details Popup] Failed to load marked library:', error);
        return null;
    }
}

/**
 * Convert markdown to HTML safely
 * @param {string} text - The markdown text to convert
 * @returns {string} HTML string
 */
function renderMarkdown(text) {
    if (!text) return '';

    if (!marked) {
        return text;
    }

    try {
        return marked.parse(text);
    } catch (error) {
        console.error('[Character Details Popup] Markdown parsing error:', error);
        return text;
    }
}

/**
 * Fetch full character data from the server
 * @param {string} avatarUrl - The avatar filename/URL of the character
 * @returns {Promise<Object>} Full character data object
 */
async function fetchCharacterData(avatarUrl) {
    try {
        const response = await fetch('/api/characters/get', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ avatar_url: avatarUrl }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.character || data;
    } catch (error) {
        console.error('[Character Details Popup] Failed to fetch character data:', error);
        throw error;
    }
}

/**
 * Close and cleanup the box
 */
function closeBox() {
    if (currentBox) {
        currentBox.remove();
        currentBox = null;
    }

    if (escapeKeyHandler) {
        document.removeEventListener('keydown', escapeKeyHandler);
        escapeKeyHandler = null;
    }

    if (drawerWasOpen) {
        const drawer = document.getElementById('right-nav-panel');
        if (drawer && drawer.classList.contains('closedDrawer')) {
            const drawerIcon = document.querySelector('#rightNavDrawerIcon');
            drawer.classList.remove('closedDrawer');
            drawer.classList.add('openDrawer');
            if (drawerIcon) {
                drawerIcon.classList.remove('closedIcon');
                drawerIcon.classList.add('openIcon');
            }
            log('Restored character panel state');
        }
        drawerWasOpen = false;
    }

    log('Box closed');
}

/**
 * Open the character box
 * @param {HTMLElement} boxElement - The box element to display
 * @param {number} characterId - The character ID for Start Chat functionality
 */
function openBox(boxElement, characterId) {
    closeBox();

    const drawer = document.getElementById('right-nav-panel');
    drawerWasOpen = drawer && drawer.classList.contains('openDrawer');

    currentBox = boxElement;
    document.body.appendChild(boxElement);

    const closeButton = boxElement.querySelector('#cdp-close');
    if (closeButton) {
        closeButton.addEventListener('click', function(event) {
            event.stopPropagation();
            closeBox();
        });
    }

    boxElement.addEventListener('click', function(event) {
        if (event.target === boxElement) {
            event.stopPropagation();
            closeBox();
        }
    });

    escapeKeyHandler = function(event) {
        if (event.key === 'Escape') {
            event.stopPropagation();
            closeBox();
        }
    };
    document.addEventListener('keydown', escapeKeyHandler);

    const startChatButton = boxElement.querySelector('#cdp-start-chat');
    if (startChatButton) {
        startChatButton.addEventListener('click', function(event) {
            event.stopPropagation();
            handleStartChat(characterId);
        });
    }

    log('Box opened');
}

/**
 * Handle Start Chat button click
 * @param {number} characterId - The character ID to load
 */
async function handleStartChat(characterId) {
    log(`Starting chat with character ID: ${characterId}`);

    closeBox();

    try {
        await selectCharacterById(String(characterId));
        log('Chat started');
    } catch (error) {
        console.error('[Character Details Popup] Unable to start chat:', error);
    }
}

/**
 * Create box HTML structure for character details
 * @param {Object} characterData - Character data object
 * @param {string} localAvatar - Local avatar filename (not the source URL)
 * @returns {HTMLElement} Box overlay element
 */
function createCharacterBox(characterData, localAvatar) {
    const data = characterData?.data || characterData;

    const name = data?.name ?? 'Unnamed Character';
    const description = data?.description ?? 'No description available.';
    const creatorNotes = data?.creator_notes ?? '';
    const scenario = data?.scenario ?? '';
    const avatar = localAvatar ?? data?.avatar ?? '';
    const firstMessage = data?.first_mes ?? '';
    const personality = data?.personality ?? '';
    const exampleMessages = data?.mes_example ?? '';

    const overlay = document.createElement('div');
    overlay.className = 'cdp-box__overlay';

    const box = document.createElement('div');
    box.className = 'cdp-box';

    const content = document.createElement('div');
    content.className = 'cdp-box__content';

    const header = document.createElement('div');
    header.className = 'cdp-box__header';

    if (avatar) {
        const img = document.createElement('img');
        img.className = 'cdp-box__image';
        img.src = `/characters/${encodeURIComponent(avatar)}`;
        img.alt = name;

        img.onerror = function() {
            this.src = 'img/ai4.png';
            log(`Failed to load avatar: ${avatar}, using default`);
        };

        header.appendChild(img);
    }

    const nameHeading = document.createElement('h2');
    nameHeading.className = 'cdp-box__name';
    nameHeading.textContent = name;
    header.appendChild(nameHeading);

    content.appendChild(header);

    const body = document.createElement('div');
    body.className = 'cdp-box__body';

    const descriptionDetails = document.createElement('details');
    descriptionDetails.className = 'cdp-collapsible';
    descriptionDetails.open = true;
    const descriptionSummary = document.createElement('summary');
    descriptionSummary.className = 'cdp-collapsible__summary';
    descriptionSummary.textContent = 'Description';
    const descContent = document.createElement('div');
    descContent.className = 'cdp-collapsible__content cdp-markdown-content';
    descContent.innerHTML = renderMarkdown(description);
    descriptionDetails.appendChild(descriptionSummary);
    descriptionDetails.appendChild(descContent);
    body.appendChild(descriptionDetails);

    if (firstMessage && firstMessage.trim()) {
        const firstMessageDetails = document.createElement('details');
        firstMessageDetails.className = 'cdp-collapsible';
        const firstMessageSummary = document.createElement('summary');
        firstMessageSummary.className = 'cdp-collapsible__summary';
        firstMessageSummary.textContent = 'First Message';
        const firstMessageContent = document.createElement('div');
        firstMessageContent.className = 'cdp-collapsible__content cdp-markdown-content';
        firstMessageContent.innerHTML = renderMarkdown(firstMessage.trim());
        firstMessageDetails.appendChild(firstMessageSummary);
        firstMessageDetails.appendChild(firstMessageContent);
        body.appendChild(firstMessageDetails);
    }

    if (scenario && scenario.trim()) {
        const scenarioDetails = document.createElement('details');
        scenarioDetails.className = 'cdp-collapsible';
        const scenarioSummary = document.createElement('summary');
        scenarioSummary.className = 'cdp-collapsible__summary';
        scenarioSummary.textContent = 'Scenario';
        const scenarioContent = document.createElement('div');
        scenarioContent.className = 'cdp-collapsible__content';
        const scenarioText = document.createElement('p');
        scenarioText.textContent = scenario.trim();
        scenarioContent.appendChild(scenarioText);
        scenarioDetails.appendChild(scenarioSummary);
        scenarioDetails.appendChild(scenarioContent);
        body.appendChild(scenarioDetails);
    }

    if (personality && personality.trim()) {
        const personalityDetails = document.createElement('details');
        personalityDetails.className = 'cdp-collapsible';
        const personalitySummary = document.createElement('summary');
        personalitySummary.className = 'cdp-collapsible__summary';
        personalitySummary.textContent = 'Personality';
        const personalityContent = document.createElement('div');
        personalityContent.className = 'cdp-collapsible__content';
        const personalityText = document.createElement('p');
        personalityText.textContent = personality.trim();
        personalityContent.appendChild(personalityText);
        personalityDetails.appendChild(personalitySummary);
        personalityDetails.appendChild(personalityContent);
        body.appendChild(personalityDetails);
    }

    if (creatorNotes && creatorNotes.trim()) {
        const creatorNotesDetails = document.createElement('details');
        creatorNotesDetails.className = 'cdp-collapsible';
        const creatorNotesSummary = document.createElement('summary');
        creatorNotesSummary.className = 'cdp-collapsible__summary';
        creatorNotesSummary.textContent = 'Creator Notes';
        const creatorNotesContent = document.createElement('div');
        creatorNotesContent.className = 'cdp-collapsible__content';
        const creatorNotesText = document.createElement('p');
        creatorNotesText.textContent = creatorNotes.trim();
        creatorNotesContent.appendChild(creatorNotesText);
        creatorNotesDetails.appendChild(creatorNotesSummary);
        creatorNotesDetails.appendChild(creatorNotesContent);
        body.appendChild(creatorNotesDetails);
    }

    if (exampleMessages && exampleMessages.trim()) {
        const exampleDetails = document.createElement('details');
        exampleDetails.className = 'cdp-collapsible';
        const exampleSummary = document.createElement('summary');
        exampleSummary.className = 'cdp-collapsible__summary';
        exampleSummary.textContent = 'Example Messages';
        const exampleContent = document.createElement('div');
        exampleContent.className = 'cdp-collapsible__content';
        const exampleText = document.createElement('p');
        exampleText.textContent = exampleMessages.trim();
        exampleContent.appendChild(exampleText);
        exampleDetails.appendChild(exampleSummary);
        exampleDetails.appendChild(exampleContent);
        body.appendChild(exampleDetails);
    }

    content.appendChild(body);
    box.appendChild(content);

    const footer = document.createElement('div');
    footer.className = 'cdp-box__footer';

    const startChatButton = document.createElement('button');
    startChatButton.id = 'cdp-start-chat';
    startChatButton.className = 'cdp-button cdp-button--primary';
    startChatButton.textContent = 'Start Chat';

    const closeButton = document.createElement('button');
    closeButton.id = 'cdp-close';
    closeButton.className = 'cdp-button cdp-button--secondary';
    closeButton.textContent = 'Close';

    footer.appendChild(startChatButton);
    footer.appendChild(closeButton);
    box.appendChild(footer);

    overlay.appendChild(box);

    return overlay;
}

/**
 * Setup click interception for character cards
 */
function setupCharacterClickInterception() {
    const characterListContainer = document.getElementById('rm_print_characters_block');

    if (!characterListContainer) {
        console.error('[Character Details Popup] Character list container not found');
        return;
    }

    characterListContainer.addEventListener('click', async function(event) {
        const isBulkEditMode = characterListContainer.classList.contains('bulk_select');

        if (isBulkEditMode) {
            log('Bulk edit mode active');
            return;
        }

        const characterCard = event.target.closest('.character_select');

        if (characterCard) {
            const characterId = characterCard.getAttribute('data-chid');

            if (characterId) {
                if (event.shiftKey) {
                    log(`SHIFT+click - bypassing popup for character ${characterId}`);
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                log(`Character clicked - ID: ${characterId}`);

                const character = characters[Number(characterId)];

                if (!character) {
                    console.error(`[Character Details Popup] Character not found for ID: ${characterId}`);
                    return;
                }

                try {
                    log(`Fetching character data: ${character.avatar}`);
                    const fullCharacterData = await fetchCharacterData(character.avatar);

                    log(`Character data loaded: ${fullCharacterData.name || character.name}`);

                    const box = createCharacterBox(fullCharacterData, character.avatar);
                    openBox(box, Number(characterId));
                } catch (error) {
                    console.error('[Character Details Popup] Failed to load character:', error);
                    alert('Failed to load character details. Please try again.');
                }
            } else {
                log('Character card clicked but no data-chid found');
            }
        }
    }, true);

    log('Character click interception setup complete');
}

/**
 * Loads the extension settings from power_user
 */
function loadSettings() {
    if (power_user.extensions && power_user.extensions[extensionName]) {
        Object.assign(extensionSettings, power_user.extensions[extensionName]);
        log('Settings loaded');
    }
}

/**
 * Saves the extension settings to power_user
 */
function saveSettings() {
    if (!power_user.extensions) {
        power_user.extensions = {};
    }
    power_user.extensions[extensionName] = extensionSettings;
    saveSettingsDebounced();
    log('Settings saved');
}

/**
 * Apply current settings to the box CSS
 */
function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--cdp-box-width', `${extensionSettings.boxWidth}vw`);
    root.style.setProperty('--cdp-box-height', `${extensionSettings.boxHeight}vh`);
    root.style.setProperty('--cdp-box-padding', `${extensionSettings.boxPadding}rem`);
    root.style.setProperty('--cdp-box-border-radius', `${extensionSettings.boxBorderRadius}px`);
    root.style.setProperty('--cdp-overlay-opacity', `${extensionSettings.overlayOpacity / 100}`);

    const primaryColor = extensionSettings.useThemePrimaryColor
        ? 'var(--active)'
        : extensionSettings.primaryButtonColor;
    const secondaryColor = extensionSettings.useThemeSecondaryColor
        ? 'var(--SmartThemeBlurTintColor)'
        : extensionSettings.secondaryButtonColor;
    const fontColor = extensionSettings.useThemeFontColor
        ? 'var(--SmartThemeEmColor)'
        : extensionSettings.fontColor;
    const backgroundColor = extensionSettings.useThemeBackgroundColor
        ? 'var(--SmartThemeBlurTintColor)'
        : extensionSettings.backgroundColor;

    root.style.setProperty('--cdp-primary-button-color', primaryColor);
    root.style.setProperty('--cdp-secondary-button-color', secondaryColor);
    root.style.setProperty('--cdp-font-color', fontColor);
    root.style.setProperty('--cdp-background-color', backgroundColor);
    root.style.setProperty('--cdp-background-opacity', `${extensionSettings.backgroundOpacity / 100}`);
    root.style.setProperty('--cdp-blur-strength', `${extensionSettings.blurStrength}px`);
    root.style.setProperty('--cdp-content-width', `${extensionSettings.contentWidth}%`);
    root.style.setProperty('--cdp-image-max-height', `${extensionSettings.imageMaxHeight}px`);
    root.style.setProperty('--cdp-responsive-breakpoint', `${extensionSettings.responsiveBreakpoint}px`);
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    extensionSettings = {
        boxWidth: 80,
        boxHeight: 80,
        boxPadding: 2,
        boxBorderRadius: 12,
        overlayOpacity: 70,
        primaryButtonColor: '#4a9eff',
        secondaryButtonColor: '#999999',
        contentWidth: 50,
        imageMaxHeight: 400,
        responsiveBreakpoint: 700,
        useThemePrimaryColor: true,
        useThemeSecondaryColor: true,
        fontColor: '#ffffff',
        backgroundColor: '#1a1a1a',
        backgroundOpacity: 95,
        blurStrength: 10,
        useThemeFontColor: true,
        useThemeBackgroundColor: true,
    };
    saveSettings();
    applySettings();
    updateSettingsUI();
    log('Settings reset to defaults');
}

/**
 * Update the settings UI to reflect current values
 */
function updateSettingsUI() {
    $('#cdp-box-width').val(extensionSettings.boxWidth);
    $('#cdp-box-width-value').text(`${extensionSettings.boxWidth}%`);

    $('#cdp-box-height').val(extensionSettings.boxHeight);
    $('#cdp-box-height-value').text(`${extensionSettings.boxHeight}%`);

    $('#cdp-box-padding').val(extensionSettings.boxPadding);
    $('#cdp-box-padding-value').text(`${extensionSettings.boxPadding}rem`);

    $('#cdp-box-border-radius').val(extensionSettings.boxBorderRadius);
    $('#cdp-box-border-radius-value').text(`${extensionSettings.boxBorderRadius}px`);

    $('#cdp-overlay-opacity').val(extensionSettings.overlayOpacity);
    $('#cdp-overlay-opacity-value').text(`${extensionSettings.overlayOpacity}%`);

    $('#cdp-use-theme-font-color').prop('checked', extensionSettings.useThemeFontColor);
    $('#cdp-font-color').val(extensionSettings.fontColor);
    $('#cdp-font-color').prop('disabled', extensionSettings.useThemeFontColor);

    $('#cdp-use-theme-background-color').prop('checked', extensionSettings.useThemeBackgroundColor);
    $('#cdp-background-color').val(extensionSettings.backgroundColor);
    $('#cdp-background-color').prop('disabled', extensionSettings.useThemeBackgroundColor);

    $('#cdp-background-opacity').val(extensionSettings.backgroundOpacity);
    $('#cdp-background-opacity-value').text(`${extensionSettings.backgroundOpacity}%`);

    $('#cdp-blur-strength').val(extensionSettings.blurStrength);
    $('#cdp-blur-strength-value').text(`${extensionSettings.blurStrength}px`);

    $('#cdp-use-theme-primary-color').prop('checked', extensionSettings.useThemePrimaryColor);
    $('#cdp-primary-button-color').val(extensionSettings.primaryButtonColor);
    $('#cdp-primary-button-color').prop('disabled', extensionSettings.useThemePrimaryColor);

    $('#cdp-use-theme-secondary-color').prop('checked', extensionSettings.useThemeSecondaryColor);
    $('#cdp-secondary-button-color').val(extensionSettings.secondaryButtonColor);
    $('#cdp-secondary-button-color').prop('disabled', extensionSettings.useThemeSecondaryColor);

    $('#cdp-content-width').val(extensionSettings.contentWidth);
    $('#cdp-content-width-value').text(`${extensionSettings.contentWidth}%`);

    $('#cdp-image-max-height').val(extensionSettings.imageMaxHeight);
    $('#cdp-image-max-height-value').text(`${extensionSettings.imageMaxHeight}px`);

    $('#cdp-responsive-breakpoint').val(extensionSettings.responsiveBreakpoint);
    $('#cdp-responsive-breakpoint-value').text(`${extensionSettings.responsiveBreakpoint}px`);
}

/**
 * Add extension settings to the Extensions panel
 */
async function addExtensionSettings() {
    const settingsHtml = await renderExtensionTemplateAsync(extensionFolder, 'settings');
    $('#extensions_settings2').append(settingsHtml);

    $('#cdp-box-width').on('input', function() {
        extensionSettings.boxWidth = Number($(this).val());
        $('#cdp-box-width-value').text(`${extensionSettings.boxWidth}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-box-height').on('input', function() {
        extensionSettings.boxHeight = Number($(this).val());
        $('#cdp-box-height-value').text(`${extensionSettings.boxHeight}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-box-padding').on('input', function() {
        extensionSettings.boxPadding = Number($(this).val());
        $('#cdp-box-padding-value').text(`${extensionSettings.boxPadding}rem`);
        applySettings();
        saveSettings();
    });

    $('#cdp-box-border-radius').on('input', function() {
        extensionSettings.boxBorderRadius = Number($(this).val());
        $('#cdp-box-border-radius-value').text(`${extensionSettings.boxBorderRadius}px`);
        applySettings();
        saveSettings();
    });

    $('#cdp-overlay-opacity').on('input', function() {
        extensionSettings.overlayOpacity = Number($(this).val());
        $('#cdp-overlay-opacity-value').text(`${extensionSettings.overlayOpacity}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-use-theme-font-color').on('change', function() {
        extensionSettings.useThemeFontColor = $(this).prop('checked');
        $('#cdp-font-color').prop('disabled', extensionSettings.useThemeFontColor);
        applySettings();
        saveSettings();
    });

    $('#cdp-font-color').on('change', function() {
        extensionSettings.fontColor = $(this).val();
        applySettings();
        saveSettings();
    });

    $('#cdp-use-theme-background-color').on('change', function() {
        extensionSettings.useThemeBackgroundColor = $(this).prop('checked');
        $('#cdp-background-color').prop('disabled', extensionSettings.useThemeBackgroundColor);
        applySettings();
        saveSettings();
    });

    $('#cdp-background-color').on('change', function() {
        extensionSettings.backgroundColor = $(this).val();
        applySettings();
        saveSettings();
    });

    $('#cdp-background-opacity').on('input', function() {
        extensionSettings.backgroundOpacity = Number($(this).val());
        $('#cdp-background-opacity-value').text(`${extensionSettings.backgroundOpacity}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-blur-strength').on('input', function() {
        extensionSettings.blurStrength = Number($(this).val());
        $('#cdp-blur-strength-value').text(`${extensionSettings.blurStrength}px`);
        applySettings();
        saveSettings();
    });

    $('#cdp-use-theme-primary-color').on('change', function() {
        extensionSettings.useThemePrimaryColor = $(this).prop('checked');
        $('#cdp-primary-button-color').prop('disabled', extensionSettings.useThemePrimaryColor);
        applySettings();
        saveSettings();
    });

    $('#cdp-primary-button-color').on('change', function() {
        extensionSettings.primaryButtonColor = $(this).val();
        applySettings();
        saveSettings();
    });

    $('#cdp-use-theme-secondary-color').on('change', function() {
        extensionSettings.useThemeSecondaryColor = $(this).prop('checked');
        $('#cdp-secondary-button-color').prop('disabled', extensionSettings.useThemeSecondaryColor);
        applySettings();
        saveSettings();
    });

    $('#cdp-secondary-button-color').on('change', function() {
        extensionSettings.secondaryButtonColor = $(this).val();
        applySettings();
        saveSettings();
    });

    $('#cdp-content-width').on('input', function() {
        extensionSettings.contentWidth = Number($(this).val());
        $('#cdp-content-width-value').text(`${extensionSettings.contentWidth}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-image-max-height').on('input', function() {
        extensionSettings.imageMaxHeight = Number($(this).val());
        $('#cdp-image-max-height-value').text(`${extensionSettings.imageMaxHeight}px`);
        applySettings();
        saveSettings();
    });

    $('#cdp-responsive-breakpoint').on('input', function() {
        extensionSettings.responsiveBreakpoint = Number($(this).val());
        $('#cdp-responsive-breakpoint-value').text(`${extensionSettings.responsiveBreakpoint}px`);
        applySettings();
        saveSettings();
    });

    $('#cdp-reset-settings').on('click', function() {
        resetSettings();
    });

    updateSettingsUI();
}

/**
 * Initialize the extension
 */
async function init() {
    log('Initializing extension');

    await loadMarkedLibrary();

    eventSource.on(event_types.APP_READY, () => {
        log('Extension loaded');
        setupCharacterClickInterception();
    });
}

jQuery(async () => {
    loadSettings();
    applySettings();
    await addExtensionSettings();
    init();
});
