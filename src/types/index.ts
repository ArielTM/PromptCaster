export interface LLMConfig {
  id: string;
  name: string;
  url: string;
  selectors: {
    input: string;
    sendButton: string;
    responseContainer: string;
    loadingIndicator?: string;
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
}

export interface Message {
  type: 'INJECT_PROMPT' | 'INJECT_FILES' | 'GET_RESPONSE' | 'RESPONSE_UPDATE' | 'RESPONSE_COMPLETE' | 'PING' | 'EXECUTE_FILE_INJECTION';
  payload?: unknown;
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
  enabledLLMs: ['chatgpt', 'claude', 'gemini', 'perplexity'],
  llmOrder: ['chatgpt', 'claude', 'gemini', 'perplexity'],
  judgeId: null,
  theme: 'system',
  autoMaximizeJudge: false,
};
