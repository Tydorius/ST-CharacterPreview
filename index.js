import { eventSource, event_types, characters, selectCharacterById } from '../../../../script.js';

const extensionName = 'character-details-popup';

// Store reference to currently open modal and event handler
let currentModal = null;
let escapeKeyHandler = null;

/**
 * Helper function to log messages with extension prefix
 * @param {string} message - The message to log
 */
function log(message) {
    console.log(`[Character Details Popup] ${message}`);
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

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'cdp-modal__overlay';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'cdp-modal';

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

        modal.appendChild(img);
    }

    // Create character name heading
    const nameHeading = document.createElement('h2');
    nameHeading.className = 'cdp-modal__name';
    nameHeading.textContent = name;

    // Create description field
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'cdp-field cdp-description';
    const descLabel = document.createElement('strong');
    descLabel.textContent = 'Description:';
    const descContent = document.createElement('p');
    descContent.textContent = description;
    descriptionDiv.appendChild(descLabel);
    descriptionDiv.appendChild(descContent);

    // Append basic elements
    modal.appendChild(nameHeading);
    modal.appendChild(descriptionDiv);

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
        modal.appendChild(creatorNotesDiv);
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
        modal.appendChild(scenarioDiv);
    }

    // Create footer with buttons
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
 * Initialize the extension
 */
function init() {
    log('Initializing extension...');

    // Listen for APP_READY event
    eventSource.on(event_types.APP_READY, () => {
        log('Extension loaded and SillyTavern is ready.');
        setupCharacterClickInterception();
    });
}

// Start initialization
init();
