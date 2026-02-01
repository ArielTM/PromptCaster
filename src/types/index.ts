export interface LLMConfig {
  id: string;
  name: string;
  url: string;
  selectors: {
    input: string;
    sendButton: string;
    responseContainer: string;
    loadingIndicator?: string;
    userMessage?: string;
  };
  color: string;
}

export interface LLMResponse {
  llmId: string;
  text: string;
  timestamp: number;
  isComplete: boolean;
}

export interface AppSettings {
  enabledLLMs: string[];
  llmOrder: string[];
  judgeId: string | null;
  theme: 'light' | 'dark' | 'system';
  autoMaximizeJudge: boolean;
  judgeFullConversation: boolean;
}

export interface Message {
  type: 'INJECT_PROMPT' | 'INJECT_FILES' | 'GET_RESPONSE' | 'RESPONSE_UPDATE' | 'RESPONSE_COMPLETE' | 'PING' | 'EXECUTE_FILE_INJECTION' | 'GET_CONVERSATION';
  payload?: unknown;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationPayload {
  llmId: string;
  messages: ConversationMessage[];
}

export interface InjectPromptPayload {
  prompt: string;
}

export interface SerializedFile {
  name: string;
  type: string;
  size: number;
  data: string; // Base64 encoded
  lastModified: number;
}

export interface InjectFilesPayload {
  files: SerializedFile[];
}

export interface ResponsePayload {
  llmId: string;
  text: string;
  isComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  enabledLLMs: ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok'],
  llmOrder: ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok'],
  judgeId: null,
  theme: 'system',
  autoMaximizeJudge: false,
  judgeFullConversation: false,
};
