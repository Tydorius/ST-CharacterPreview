import { eventSource, event_types, characters, selectCharacterById, saveSettingsDebounced } from '../../../../script.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { power_user } from '../../../power-user.js';

const extensionName = 'third-party/ST-CharacterPreview';
const extensionFolder = 'third-party/ST-CharacterPreview';

// Store reference to currently open modal and event handler
let currentModal = null;
let escapeKeyHandler = null;

// Markdown library reference
let marked = null;

// Extension settings with defaults
let extensionSettings = {
    modalWidth: 80,
    modalHeight: 80,
    modalPadding: 2,
    modalBorderRadius: 12,
    overlayOpacity: 70,
    primaryButtonColor: '#4a9eff',
    secondaryButtonColor: '#999999',
    contentWidth: 50,
    imageMaxHeight: 400,
    responsiveBreakpoint: 700,
};

/**
 * Helper function to log messages with extension prefix
 * @param {string} message - The message to log
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

    // If marked isn't loaded, return plain text
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
 * Close and cleanup the modal
 */
function closeModal() {
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
    }

    if (escapeKeyHandler) {
        document.removeEventListener('keydown', escapeKeyHandler);
        escapeKeyHandler = null;
    }

    log('Modal closed');
}

/**
 * Open the character modal
 * @param {HTMLElement} modalElement - The modal element to display
 * @param {number} characterId - The character ID for Start Chat functionality
 */
function openModal(modalElement, characterId) {
    // Close any existing modal first
    closeModal();

    // Store reference to current modal
    currentModal = modalElement;

    // Append modal to body
    document.body.appendChild(modalElement);

    // Setup Close button
    const closeButton = modalElement.querySelector('#cdp-close');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    // Setup overlay click (close only if clicking on the overlay itself)
    modalElement.addEventListener('click', function(event) {
        if (event.target === modalElement) {
            closeModal();
        }
    });

    // Setup Escape key handler
    escapeKeyHandler = function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', escapeKeyHandler);

    // Setup Start Chat button
    const startChatButton = modalElement.querySelector('#cdp-start-chat');
    if (startChatButton) {
        startChatButton.addEventListener('click', function() {
            handleStartChat(characterId);
        });
    }

    log('Modal opened');
}

/**
 * Handle Start Chat button click
 * @param {number} characterId - The character ID to load
 */
async function handleStartChat(characterId) {
    log(`Starting chat with character ID: ${characterId}`);

    // Close the modal first
    closeModal();

    // Select the character
    try {
        await selectCharacterById(String(characterId));
        log('Chat started successfully');
    } catch (error) {
        console.error('[Character Details Popup] Unable to start chat:', error);
    }
}

/**
 * Create modal HTML structure for character details
 * @param {Object} characterData - Character data object
 * @returns {HTMLElement} Modal overlay element
 */
function createCharacterModal(characterData) {
    // Use optional chaining and nullish coalescing for safety
    const name = characterData?.name ?? 'Unnamed Character';
    const description = characterData?.description ?? 'No description available.';
    const creatorNotes = characterData?.creator_notes ?? '';
    const scenario = characterData?.scenario ?? '';
    const avatar = characterData?.avatar ?? '';
    const firstMessage = characterData?.first_mes ?? '';
    const personality = characterData?.personality ?? '';
    const exampleMessages = characterData?.mes_example ?? '';

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'cdp-modal__overlay';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'cdp-modal';

    // Create scrollable content wrapper
    const content = document.createElement('div');
    content.className = 'cdp-modal__content';

    // Create header section (image + name)
    const header = document.createElement('div');
    header.className = 'cdp-modal__header';

    // Create character image only if avatar is available
    if (avatar) {
        const img = document.createElement('img');
        img.className = 'cdp-modal__image';
        img.src = `/characters/${encodeURIComponent(avatar)}`;
        img.alt = name;

        // Add error handler for broken images
        img.onerror = function() {
            this.src = '/img/default-avatars/aventura.png';
            log(`Failed to load avatar: ${avatar}, using default`);
        };

        header.appendChild(img);
    }

    // Create character name heading
    const nameHeading = document.createElement('h2');
    nameHeading.className = 'cdp-modal__name';
    nameHeading.textContent = name;
    header.appendChild(nameHeading);

    // Append header to content
    content.appendChild(header);

    // Create body section (all description fields)
    const body = document.createElement('div');
    body.className = 'cdp-modal__body';

    // Create description field with markdown support
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'cdp-field cdp-description';
    const descLabel = document.createElement('strong');
    descLabel.textContent = 'Description:';
    const descContent = document.createElement('div');
    descContent.className = 'cdp-markdown-content';
    descContent.innerHTML = renderMarkdown(description);
    descriptionDiv.appendChild(descLabel);
    descriptionDiv.appendChild(descContent);
    body.appendChild(descriptionDiv);

    // Add creator notes only if non-empty
    if (creatorNotes && creatorNotes.trim()) {
        const creatorNotesDiv = document.createElement('div');
        creatorNotesDiv.className = 'cdp-field cdp-creator-notes';
        const creatorLabel = document.createElement('strong');
        creatorLabel.textContent = 'Creator Notes:';
        const creatorContent = document.createElement('p');
        creatorContent.textContent = creatorNotes.trim();
        creatorNotesDiv.appendChild(creatorLabel);
        creatorNotesDiv.appendChild(creatorContent);
        body.appendChild(creatorNotesDiv);
    }

    // Add scenario only if non-empty
    if (scenario && scenario.trim()) {
        const scenarioDiv = document.createElement('div');
        scenarioDiv.className = 'cdp-field cdp-scenario';
        const scenarioLabel = document.createElement('strong');
        scenarioLabel.textContent = 'Scenario:';
        const scenarioContent = document.createElement('p');
        scenarioContent.textContent = scenario.trim();
        scenarioDiv.appendChild(scenarioLabel);
        scenarioDiv.appendChild(scenarioContent);
        body.appendChild(scenarioDiv);
    }

    // Add personality only if non-empty (collapsible)
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

    // Add first message only if non-empty (collapsible, with markdown)
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

    // Add example messages only if non-empty (collapsible)
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

    // Append body to content
    content.appendChild(body);

    // Append content to modal
    modal.appendChild(content);

    // Create footer with buttons (fixed at bottom)
    const footer = document.createElement('div');
    footer.className = 'cdp-modal__footer';

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
    modal.appendChild(footer);

    // Append modal to overlay
    overlay.appendChild(modal);

    return overlay;
}

/**
 * Setup click interception for character cards
 */
function setupCharacterClickInterception() {
    // Get the character list container
    const characterListContainer = document.getElementById('rm_print_characters_block');

    if (!characterListContainer) {
        console.error('[Character Details Popup] Character list container not found');
        return;
    }

    // Use event delegation to intercept character card clicks
    characterListContainer.addEventListener('click', function(event) {
        // Check if bulk edit mode is active
        // When bulk edit is enabled, the container has the 'bulk_select' class
        const isBulkEditMode = characterListContainer.classList.contains('bulk_select');

        if (isBulkEditMode) {
            // Don't interfere with bulk edit mode - let SillyTavern handle the click
            log('Bulk edit mode active - skipping popup');
            return;
        }

        // Find the .character_select element (could be the target or an ancestor)
        const characterCard = event.target.closest('.character_select');

        if (characterCard) {
            // Prevent default behavior and stop propagation
            event.preventDefault();
            event.stopPropagation();

            // Extract character ID from data attribute
            const characterId = characterCard.getAttribute('data-chid');

            if (characterId) {
                log(`Character clicked - ID: ${characterId}`);

                // Get the character object by ID
                const character = characters[Number(characterId)];

                if (!character) {
                    console.error(`[Character Details Popup] Character not found for ID: ${characterId}`);
                    return;
                }

                // Extract character data
                const characterData = {
                    name: character.name,
                    description: character.description,
                    creator_notes: character.creator_notes,
                    scenario: character.scenario,
                    avatar: character.avatar,
                    first_mes: character.first_mes,
                    personality: character.personality,
                    mes_example: character.mes_example,
                };

                log(`Character data loaded: ${characterData.name}`);

                // Create and open the modal
                const modal = createCharacterModal(characterData);
                openModal(modal, Number(characterId));
            } else {
                log('Character card clicked but no data-chid found');
            }
        }
    }, true); // Use capture phase to intercept before other handlers

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
 * Apply current settings to the modal CSS
 */
function applySettings() {
    // Create or update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--cdp-modal-width', `${extensionSettings.modalWidth}vw`);
    root.style.setProperty('--cdp-modal-height', `${extensionSettings.modalHeight}vh`);
    root.style.setProperty('--cdp-modal-padding', `${extensionSettings.modalPadding}rem`);
    root.style.setProperty('--cdp-modal-border-radius', `${extensionSettings.modalBorderRadius}px`);
    root.style.setProperty('--cdp-overlay-opacity', `${extensionSettings.overlayOpacity / 100}`);
    root.style.setProperty('--cdp-primary-button-color', extensionSettings.primaryButtonColor);
    root.style.setProperty('--cdp-secondary-button-color', extensionSettings.secondaryButtonColor);
    root.style.setProperty('--cdp-content-width', `${extensionSettings.contentWidth}%`);
    root.style.setProperty('--cdp-image-max-height', `${extensionSettings.imageMaxHeight}px`);
    root.style.setProperty('--cdp-responsive-breakpoint', `${extensionSettings.responsiveBreakpoint}px`);
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    extensionSettings = {
        modalWidth: 80,
        modalHeight: 80,
        modalPadding: 2,
        modalBorderRadius: 12,
        overlayOpacity: 70,
        primaryButtonColor: '#4a9eff',
        secondaryButtonColor: '#999999',
        contentWidth: 50,
        imageMaxHeight: 400,
        responsiveBreakpoint: 700,
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
    $('#cdp-modal-width').val(extensionSettings.modalWidth);
    $('#cdp-modal-width-value').text(`${extensionSettings.modalWidth}%`);

    $('#cdp-modal-height').val(extensionSettings.modalHeight);
    $('#cdp-modal-height-value').text(`${extensionSettings.modalHeight}%`);

    $('#cdp-modal-padding').val(extensionSettings.modalPadding);
    $('#cdp-modal-padding-value').text(`${extensionSettings.modalPadding}rem`);

    $('#cdp-modal-border-radius').val(extensionSettings.modalBorderRadius);
    $('#cdp-modal-border-radius-value').text(`${extensionSettings.modalBorderRadius}px`);

    $('#cdp-overlay-opacity').val(extensionSettings.overlayOpacity);
    $('#cdp-overlay-opacity-value').text(`${extensionSettings.overlayOpacity}%`);

    $('#cdp-primary-button-color').val(extensionSettings.primaryButtonColor);
    $('#cdp-secondary-button-color').val(extensionSettings.secondaryButtonColor);

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

    // Setup event listeners for all settings controls
    $('#cdp-modal-width').on('input', function() {
        extensionSettings.modalWidth = Number($(this).val());
        $('#cdp-modal-width-value').text(`${extensionSettings.modalWidth}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-modal-height').on('input', function() {
        extensionSettings.modalHeight = Number($(this).val());
        $('#cdp-modal-height-value').text(`${extensionSettings.modalHeight}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-modal-padding').on('input', function() {
        extensionSettings.modalPadding = Number($(this).val());
        $('#cdp-modal-padding-value').text(`${extensionSettings.modalPadding}rem`);
        applySettings();
        saveSettings();
    });

    $('#cdp-modal-border-radius').on('input', function() {
        extensionSettings.modalBorderRadius = Number($(this).val());
        $('#cdp-modal-border-radius-value').text(`${extensionSettings.modalBorderRadius}px`);
        applySettings();
        saveSettings();
    });

    $('#cdp-overlay-opacity').on('input', function() {
        extensionSettings.overlayOpacity = Number($(this).val());
        $('#cdp-overlay-opacity-value').text(`${extensionSettings.overlayOpacity}%`);
        applySettings();
        saveSettings();
    });

    $('#cdp-primary-button-color').on('change', function() {
        extensionSettings.primaryButtonColor = $(this).val();
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

    // Initialize UI with current settings
    updateSettingsUI();
}

/**
 * Initialize the extension
 */
async function init() {
    log('Initializing extension...');

    // Load markdown library
    await loadMarkedLibrary();

    // Listen for APP_READY event
    eventSource.on(event_types.APP_READY, () => {
        log('Extension loaded and SillyTavern is ready.');
        setupCharacterClickInterception();
    });
}

// jQuery initialization
jQuery(async () => {
    loadSettings();
    applySettings();
    await addExtensionSettings();
    init();
});
