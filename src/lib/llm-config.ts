import type { LLMConfig } from '@/types';

export const LLM_CONFIGS: Record<string, LLMConfig> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    selectors: {
      input: '#prompt-textarea',
      sendButton: 'button[data-testid="send-button"], button[aria-label="Send prompt"]',
      responseContainer: '[data-message-author-role="assistant"]',
      loadingIndicator: '[data-testid="send-button"][disabled]',
      userMessage: '[data-message-author-role="user"]',
    },
    color: '#10a37f',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    selectors: {
      input: '[contenteditable="true"].ProseMirror, div[contenteditable="true"]',
      sendButton: 'button[aria-label="Send message"], button[aria-label="Send Message"]',
      responseContainer: '[data-is-streaming], .font-claude-message',
      loadingIndicator: '[data-is-streaming="true"]',
      userMessage: '.font-user-message',
    },
    color: '#d97706',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    selectors: {
      input: '.ql-editor, rich-textarea .ql-editor',
      sendButton: 'button[aria-label="Send message"], .send-button',
      responseContainer: '.response-content, .model-response-text',
      loadingIndicator: '.loading-indicator',
      userMessage: '.user-query, [class*="user-message"]',
    },
    color: '#4285f4',
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    selectors: {
      input: 'textarea[placeholder*="Ask"]',
      sendButton: 'button[aria-label="Submit"], button[type="submit"]',
      responseContainer: '.prose, [class*="answer"]',
      loadingIndicator: '[class*="loading"]',
      userMessage: '[class*="query"], [class*="question"]',
    },
    color: '#20b8cd',
  },
};

export const getLLMConfig = (id: string): LLMConfig | undefined => {
  return LLM_CONFIGS[id];
};

export const getAllLLMConfigs = (): LLMConfig[] => {
  return Object.values(LLM_CONFIGS);
};

export const getLLMIds = (): string[] => {
  return Object.keys(LLM_CONFIGS);
};
