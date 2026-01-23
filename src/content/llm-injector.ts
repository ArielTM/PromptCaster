import type { Message, InjectPromptPayload, SerializedFile, InjectFilesPayload } from '@/types';
import { LLM_CONFIGS } from '@/lib/llm-config';

const deserializeFile = (serialized: SerializedFile): File => {
  const binary = atob(serialized.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], serialized.name, {
    type: serialized.type,
    lastModified: serialized.lastModified,
  });
};

const injectFiles = async (serializedFiles: SerializedFile[]): Promise<boolean> => {
  const llmId = getCurrentLLMId();
  if (!llmId) return false;

  const files = serializedFiles.map(deserializeFile);
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));

  // Simulate native drag-and-drop sequence on document body
  const dragEnterEvent = new DragEvent('dragenter', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });

  const dragOverEvent = new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });

  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });

  document.body.dispatchEvent(dragEnterEvent);
  document.body.dispatchEvent(dragOverEvent);
  document.body.dispatchEvent(dropEvent);

  console.log(`PromptCaster: Simulated file drop for ${llmId}`, files.map((f) => f.name));
  return true;
};

const getCurrentLLMId = (): string | null => {
  const hostname = window.location.hostname;

  if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
    return 'chatgpt';
  }
  if (hostname.includes('claude.ai')) {
    return 'claude';
  }
  if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  }
  if (hostname.includes('perplexity.ai')) {
    return 'perplexity';
  }

  return null;
};

const waitForElement = (selector: string, timeout = 10000): Promise<Element | null> => {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
};

const injectPrompt = async (prompt: string): Promise<boolean> => {
  const llmId = getCurrentLLMId();
  if (!llmId) return false;

  const config = LLM_CONFIGS[llmId];
  if (!config) return false;

  const inputEl = await waitForElement(config.selectors.input);
  if (!inputEl) {
    console.error('PromptCaster: Input element not found');
    return false;
  }

  // Handle different input types
  if (inputEl.tagName === 'TEXTAREA') {
    (inputEl as HTMLTextAreaElement).value = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (inputEl.getAttribute('contenteditable') === 'true') {
    // For contenteditable divs (Claude, etc.)
    inputEl.textContent = prompt;
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: prompt }));
  } else {
    // Try setting innerText as fallback
    (inputEl as HTMLElement).innerText = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Small delay before clicking send
  await new Promise((r) => setTimeout(r, 100));

  const sendBtn = await waitForElement(config.selectors.sendButton);
  if (sendBtn && !sendBtn.hasAttribute('disabled')) {
    (sendBtn as HTMLButtonElement).click();
    return true;
  }

  return true;
};

const extractResponse = (): string => {
  const llmId = getCurrentLLMId();
  if (!llmId) return '';

  const config = LLM_CONFIGS[llmId];
  if (!config) return '';

  const containers = document.querySelectorAll(config.selectors.responseContainer);
  if (!containers.length) return '';

  // Get the last response container
  const lastContainer = containers[containers.length - 1];
  return lastContainer.textContent?.trim() || '';
};

const isResponseComplete = (): boolean => {
  const llmId = getCurrentLLMId();
  if (!llmId) return true;

  const config = LLM_CONFIGS[llmId];
  if (!config?.selectors.loadingIndicator) return true;

  const loadingEl = document.querySelector(config.selectors.loadingIndicator);
  return !loadingEl;
};

// Set up response observer
let responseObserver: MutationObserver | null = null;

const startResponseObserver = () => {
  if (responseObserver) {
    responseObserver.disconnect();
  }

  let lastText = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  responseObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const text = extractResponse();
      const isComplete = isResponseComplete();

      if (text !== lastText || isComplete) {
        lastText = text;
        const llmId = getCurrentLLMId();

        chrome.runtime.sendMessage({
          type: isComplete ? 'RESPONSE_COMPLETE' : 'RESPONSE_UPDATE',
          payload: {
            llmId,
            text,
            isComplete,
          },
        }).catch(() => {
          // Extension context might be invalidated
        });
      }
    }, 200);
  });

  responseObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

// Message listener
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'ok', llmId: getCurrentLLMId() });
      return true;
    }

    if (message.type === 'INJECT_PROMPT') {
      const payload = message.payload as InjectPromptPayload;
      startResponseObserver();
      injectPrompt(payload.prompt).then((success) => {
        sendResponse({ success });
      });
      return true;
    }

    if (message.type === 'GET_RESPONSE') {
      sendResponse({
        text: extractResponse(),
        isComplete: isResponseComplete(),
        llmId: getCurrentLLMId(),
      });
      return true;
    }

    if (message.type === 'INJECT_FILES') {
      const payload = message.payload as InjectFilesPayload;
      injectFiles(payload.files).then((success) => {
        sendResponse({ success });
      });
      return true;
    }

    return false;
  }
);

console.log('PromptCaster: Content script loaded for', getCurrentLLMId());
