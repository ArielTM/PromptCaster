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
