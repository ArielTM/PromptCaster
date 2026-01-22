import type { Message, InjectPromptPayload, ResponsePayload } from '@/types';

export const sendToTab = async (
  tabId: number,
  message: Message
): Promise<unknown> => {
  return chrome.tabs.sendMessage(tabId, message);
};

export const sendToFrame = async (
  tabId: number,
  frameId: number,
  message: Message
): Promise<unknown> => {
  return chrome.tabs.sendMessage(tabId, message, { frameId });
};

export const broadcastToFrames = async (
  tabId: number,
  message: Message
): Promise<void> => {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames) return;

  await Promise.allSettled(
    frames.map((frame) =>
      chrome.tabs.sendMessage(tabId, message, { frameId: frame.frameId })
    )
  );
};

export const createInjectPromptMessage = (prompt: string): Message => ({
  type: 'INJECT_PROMPT',
  payload: { prompt } as InjectPromptPayload,
});

export const createResponseUpdateMessage = (
  llmId: string,
  text: string,
  isComplete: boolean
): Message => ({
  type: 'RESPONSE_UPDATE',
  payload: { llmId, text, isComplete } as ResponsePayload,
});

export const onMessage = (
  handler: (message: Message, sender: chrome.runtime.MessageSender) => void | Promise<unknown>
): void => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as Message, sender);
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true;
    }
  });
};
