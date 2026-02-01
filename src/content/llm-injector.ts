import type { Message, InjectPromptPayload, SerializedFile, InjectFilesPayload, ConversationMessage } from '@/types';
import { LLM_CONFIGS } from '@/lib/llm-config';

const injectFiles = async (serializedFiles: SerializedFile[]): Promise<boolean> => {
  const llmId = getCurrentLLMId();
  if (!llmId) return false;

  const filesData = serializedFiles.map(s => ({
    name: s.name,
    type: s.type,
    data: s.data,
    lastModified: s.lastModified,
  }));

  // Send to service worker which will execute in main world via chrome.scripting
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'EXECUTE_FILE_INJECTION', filesData },
      (response) => {
        if (response?.success) {
          console.log(`PromptCaster: File injection succeeded for ${llmId}`, response);
          resolve(true);
        } else {
          console.warn(`PromptCaster: File injection failed for ${llmId}`, response);
          resolve(false);
        }
      }
    );
  });
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
  if (hostname.includes('grok.com')) {
    return 'grok';
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
    // For ProseMirror / contenteditable editors (ChatGPT, Claude, etc.)
    (inputEl as HTMLElement).focus();
    // Clear existing content
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(inputEl);
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Insert text via execCommand which ProseMirror recognizes
    document.execCommand('insertText', false, prompt);
  } else {
    // Try setting innerText as fallback
    (inputEl as HTMLElement).innerText = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Small delay before clicking send
  await new Promise((r) => setTimeout(r, 100));

  const sendBtn = await waitForElement(config.selectors.sendButton);
  if (sendBtn && !sendBtn.hasAttribute('disabled')) {
    // Prefer form.requestSubmit() for submit buttons inside forms (e.g. Grok)
    const form = (sendBtn as HTMLButtonElement).type === 'submit' && sendBtn.closest('form');
    if (form) {
      form.requestSubmit(sendBtn as HTMLButtonElement);
    } else {
      (sendBtn as HTMLButtonElement).click();
    }
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

const extractConversation = (): ConversationMessage[] => {
  const llmId = getCurrentLLMId();
  if (!llmId) return [];

  const config = LLM_CONFIGS[llmId];
  if (!config) return [];

  const userSelector = config.selectors.userMessage;
  const assistantSelector = config.selectors.responseContainer;

  if (!userSelector) return [];

  // Get all user and assistant messages
  const userElements = Array.from(document.querySelectorAll(userSelector));
  const assistantElements = Array.from(document.querySelectorAll(assistantSelector));

  // Create a combined list with DOM order for interleaving
  interface MessageElement {
    role: 'user' | 'assistant';
    element: Element;
  }

  const allMessages: MessageElement[] = [
    ...userElements.map((el) => ({ role: 'user' as const, element: el })),
    ...assistantElements.map((el) => ({ role: 'assistant' as const, element: el })),
  ];

  // Sort by DOM position
  allMessages.sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  // Convert to ConversationMessage array
  return allMessages
    .map(({ role, element }) => ({
      role,
      content: element.textContent?.trim() || '',
    }))
    .filter((msg) => msg.content.length > 0);
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

    if (message.type === 'GET_CONVERSATION') {
      sendResponse({
        messages: extractConversation(),
        llmId: getCurrentLLMId(),
      });
      return true;
    }

    return false;
  }
);

console.log('PromptCaster: Content script loaded for', getCurrentLLMId());
