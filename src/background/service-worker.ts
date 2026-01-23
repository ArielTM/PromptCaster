import type { Message } from '@/types';

// Register dynamic rules that only apply when the extension initiates requests
async function registerHeaderModificationRules() {
  const domains = [
    'chat.openai.com',
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com',
    'perplexity.ai',
  ];

  const rules: chrome.declarativeNetRequest.Rule[] = domains.map(
    (domain, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          {
            header: 'x-frame-options',
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
          },
          {
            header: 'content-security-policy',
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
          },
          {
            header: 'content-security-policy-report-only',
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
          },
        ],
      },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        ],
        initiatorDomains: [chrome.runtime.id], // Only extension-initiated requests
      },
    })
  );

  // Clear existing dynamic rules and add new ones
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: rules,
  });

  console.log('PromptCaster: Registered header modification rules');
}

// Register rules on service worker startup
registerHeaderModificationRules();

chrome.runtime.onInstalled.addListener(() => {
  console.log('PromptCaster extension installed');
});

chrome.runtime.onMessage.addListener(
  (message: Message & { tabId?: number; frameId?: number; filesData?: unknown }, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.type === 'RESPONSE_UPDATE' || message.type === 'RESPONSE_COMPLETE') {
      chrome.runtime.sendMessage(message).catch(() => {
        // Arena page might not be open
      });
    }

    if (message.type === 'EXECUTE_FILE_INJECTION') {
      const { filesData } = message;
      const tabId = sender.tab?.id;
      const frameId = sender.frameId;

      if (!tabId || frameId === undefined) {
        sendResponse({ success: false, error: 'Missing tabId or frameId from sender' });
        return true;
      }

      // Execute in main world to bypass CSP
      chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: 'MAIN',
        func: async (files: { name: string; type: string; data: string; lastModified: number }[]) => {
          // Reconstruct File objects in main world
          const reconstructedFiles = files.map(f => {
            const binary = atob(f.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return new File([bytes], f.name, { type: f.type, lastModified: f.lastModified });
          });

          const dataTransfer = new DataTransfer();
          reconstructedFiles.forEach(file => dataTransfer.items.add(file));

          // Helper to find all file inputs including in shadow DOMs
          const findAllFileInputs = (root: Document | ShadowRoot = document): HTMLInputElement[] => {
            const inputs: HTMLInputElement[] = [];

            // Find in current root
            root.querySelectorAll('input[type="file"]').forEach(el => {
              inputs.push(el as HTMLInputElement);
            });

            // Search in shadow roots
            root.querySelectorAll('*').forEach(el => {
              if (el.shadowRoot) {
                inputs.push(...findAllFileInputs(el.shadowRoot));
              }
            });

            return inputs;
          };

          // Helper to find the best file input for the given files
          const findBestFileInput = (inputs: HTMLInputElement[]): HTMLInputElement | null => {
            if (inputs.length === 0) return null;
            if (inputs.length === 1) return inputs[0];

            // Check if any file is NOT an image
            const hasNonImageFile = reconstructedFiles.some(f => !f.type.startsWith('image/'));

            if (hasNonImageFile) {
              // Prefer inputs that accept all files (empty accept or accept="*")
              const generalInput = inputs.find(input =>
                !input.accept || input.accept === '*' || input.accept === '*/*'
              );
              if (generalInput) {
                console.log('PromptCaster: Using general file input for non-image files');
                return generalInput;
              }
            }

            // For images or if no general input found, use the last one (ChatGPT pattern)
            return inputs[inputs.length - 1];
          };

          // Helper to try setting files on input
          const trySetFilesOnInput = () => {
            const fileInputs = findAllFileInputs();
            console.log('PromptCaster: Found', fileInputs.length, 'file inputs on', window.location.hostname);

            const fileInput = findBestFileInput(fileInputs);
            if (fileInput) {
              console.log('PromptCaster: Selected input with accept:', fileInput.accept || '(all)');
              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('input', { bubbles: true }));
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('PromptCaster: Set files on input', reconstructedFiles.map(f => f.name));
              return true;
            }
            return false;
          };

          // Try immediately
          if (trySetFilesOnInput()) {
            return { success: true, method: 'fileInput' };
          }

          // Helper to wait for file input (defined early for Gemini handling)
          const waitForFileInput = (timeout = 3000, interval = 100): Promise<HTMLInputElement | null> => {
            return new Promise((resolve) => {
              const startTime = Date.now();

              const poll = () => {
                const inputs = findAllFileInputs();
                const bestInput = findBestFileInput(inputs);
                if (bestInput) {
                  console.log('PromptCaster: Found file input via polling after', Date.now() - startTime, 'ms');
                  resolve(bestInput);
                  return;
                }

                if (Date.now() - startTime < timeout) {
                  setTimeout(poll, interval);
                } else {
                  console.log('PromptCaster: No file input found after', timeout, 'ms');
                  resolve(null);
                }
              };

              poll();
            });
          };

          // Gemini-specific: handle the two-step attachment menu
          if (window.location.hostname.includes('gemini.google.com')) {
            const menuButton = document.querySelector('button[aria-label="Open upload file menu"]') as HTMLButtonElement;

            if (menuButton) {
              console.log('PromptCaster: Gemini - clicking menu button');
              menuButton.click();

              // Wait for menu to appear
              await new Promise(r => setTimeout(r, 300));

              // Find and click "Upload files" option
              const menuGroup = document.querySelector('[aria-label="Upload file options"]');
              if (menuGroup) {
                const uploadBtn = menuGroup.querySelector('button') as HTMLButtonElement;
                if (uploadBtn) {
                  console.log('PromptCaster: Gemini - clicking Upload files option');

                  // Set up file input interception before clicking
                  let geminiInterceptedInput: HTMLInputElement | null = null;
                  const geminiOriginalClick = HTMLInputElement.prototype.click;
                  HTMLInputElement.prototype.click = function() {
                    if (this.type === 'file') {
                      geminiInterceptedInput = this;
                      return; // Don't open native picker
                    }
                    return geminiOriginalClick.call(this);
                  };

                  uploadBtn.click();

                  // Restore original
                  HTMLInputElement.prototype.click = geminiOriginalClick;

                  if (geminiInterceptedInput) {
                    (geminiInterceptedInput as HTMLInputElement).files = dataTransfer.files;
                    (geminiInterceptedInput as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('PromptCaster: Gemini - set files on intercepted input');
                    return { success: true, method: 'geminiMenu' };
                  }

                  // Fallback: wait for file input to appear
                  const fileInput = await waitForFileInput(2000);
                  if (fileInput) {
                    fileInput.files = dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('PromptCaster: Gemini - set files via fallback');
                    return { success: true, method: 'geminiMenuFallback' };
                  }
                }
              }
              // If menu didn't work as expected, close it and continue to generic handling
              console.log('PromptCaster: Gemini menu handling failed, falling back to generic');
              document.body.click(); // Close menu
              await new Promise(r => setTimeout(r, 100));
            }
          }

          // Try clicking attach buttons with file input interception
          const attachButtonSelectors = [
            'button[aria-label*="upload" i]',
            'button[aria-label*="attach" i]',
            'button[aria-label*="file" i]',
            'button[aria-label*="image" i]',
            'button[data-tooltip*="upload" i]',
            'button[data-tooltip*="file" i]',
            '[data-testid="attachment-button"]',
          ];

          // Intercept file input clicks to inject our files before the native picker opens
          let interceptedInput: HTMLInputElement | null = null;
          const originalClick = HTMLInputElement.prototype.click;

          HTMLInputElement.prototype.click = function() {
            if (this.type === 'file' && !interceptedInput) {
              console.log('PromptCaster: Intercepted file input click');
              interceptedInput = this;
              // Don't call original - we'll set files directly
              return;
            }
            return originalClick.call(this);
          };

          let clickedButton = false;
          for (const selector of attachButtonSelectors) {
            const btn = document.querySelector(selector) as HTMLButtonElement;
            if (btn) {
              console.log('PromptCaster: Clicking attach button', selector);
              btn.click();
              clickedButton = true;
              break;
            }
          }

          // Restore original click
          HTMLInputElement.prototype.click = originalClick;

          if (!clickedButton) {
            console.log('PromptCaster: No attach button found');
          }

          // If we intercepted a file input, use it
          if (interceptedInput) {
            const input = interceptedInput as HTMLInputElement;
            console.log('PromptCaster: Using intercepted file input');
            try {
              input.files = dataTransfer.files;
              console.log('PromptCaster: Set files on intercepted input, now has', input.files?.length, 'files');
            } catch (e) {
              console.log('PromptCaster: Failed to set files on intercepted input:', e);
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, method: 'interceptedFileInput' };
          }

          // Wait for file input using polling (fallback if interception didn't work)
          const fileInput = await waitForFileInput(3000);
          if (fileInput) {
            console.log('PromptCaster: Found file input:', fileInput.tagName, fileInput.accept, fileInput.multiple);
            try {
              fileInput.files = dataTransfer.files;
              console.log('PromptCaster: Set files property, now has', fileInput.files?.length, 'files');
            } catch (e) {
              console.log('PromptCaster: Failed to set files property:', e);
            }
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('PromptCaster: Dispatched input/change events');
            return { success: true, method: 'fileInputAfterClick' };
          }

          // Fallback: try paste event (works on many modern apps)
          const pasteTargetSelectors = [
            'rich-textarea',
            '.ql-editor',
            '.ProseMirror',
            '#prompt-textarea',
            '[contenteditable="true"]',
          ];

          for (const selector of pasteTargetSelectors) {
            const target = document.querySelector(selector);
            if (target) {
              // Focus the element first
              if (target instanceof HTMLElement) {
                target.focus();
              }

              // Create clipboard data with files
              const clipboardData = new DataTransfer();
              reconstructedFiles.forEach(file => clipboardData.items.add(file));

              const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: clipboardData,
              });

              target.dispatchEvent(pasteEvent);
              console.log('PromptCaster: Paste event dispatched on', selector);

              // Give the app time to process
              await new Promise(r => setTimeout(r, 500));

              // Check if the paste was handled (event was cancelled)
              if (pasteEvent.defaultPrevented) {
                console.log('PromptCaster: Paste event was handled');
                return { success: true, method: 'pasteEvent', selector };
              }
            }
          }

          // Fallback: try drop events on common elements
          const dropZoneSelectors = [
            // Gemini specific
            'rich-textarea',
            '.ql-editor',
            'div[contenteditable="true"][role="textbox"]',
            // Claude specific
            '.ProseMirror',
            // ChatGPT specific
            '#prompt-textarea',
            // Generic
            '[contenteditable="true"]',
            'textarea',
          ];

          for (const selector of dropZoneSelectors) {
            const dropZone = document.querySelector(selector);
            if (dropZone) {
              dropZone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
              dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
              dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
              console.log('PromptCaster: Drop event dispatched (unverified) on', selector);
              return { success: false, method: 'dropEventUnverified', selector, error: 'File upload could not be verified' };
            }
          }

          return { success: false, error: 'No file input or drop zone found' };
        },
        args: [filesData as { name: string; type: string; data: string; lastModified: number }[]],
      }).then((results) => {
        sendResponse(results[0]?.result || { success: false });
      }).catch((err) => {
        console.error('PromptCaster: executeScript failed', err);
        sendResponse({ success: false, error: err.message });
      });

      return true; // Will respond async
    }

    return false;
  }
);

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/pages/arena/index.html'),
  });
});
