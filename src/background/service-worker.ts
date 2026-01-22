import type { Message } from '@/types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('PromptCaster extension installed');
});

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.type === 'RESPONSE_UPDATE' || message.type === 'RESPONSE_COMPLETE') {
      chrome.runtime.sendMessage(message).catch(() => {
        // Arena page might not be open
      });
    }

    return false;
  }
);

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/pages/arena/index.html'),
  });
});
