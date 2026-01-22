# PromptCaster

**Compare ChatGPT, Claude, Gemini & Perplexity side-by-side — No API Keys Needed**

Tired of switching between AI chatbot tabs? PromptCaster lets you query all four AI assistants with a single prompt and compare their responses in real-time.

Just log into your free AI accounts in Chrome — that's it! No API keys, no subscriptions, no extra setup.

**Why compare?** No single AI has all the answers. Each model has different strengths, biases, and blind spots. By comparing responses side-by-side, you can spot inconsistencies, verify facts, and make better decisions.

### Features

- **One Prompt, Four Answers** — Type once, send to all AI chatbots simultaneously
- **Real-Time Streaming** — Watch responses appear in parallel as they're generated
- **Side-by-Side Comparison** — Clean grid layout shows all responses at once
- **Judge Mode** — Let one AI synthesize the best answer from all responses
- **Customizable** — Enable/disable models, reorder panels, choose your theme

### Supported AI Models

- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Perplexity AI

### Judge Mode

Can't decide which AI gave the best answer? Use Judge Mode to have one model analyze all responses and create a synthesized "best answer" combining the strongest elements from each.

### Perfect For

- Researchers comparing AI capabilities
- Students fact-checking AI responses
- Writers seeking diverse perspectives
- Developers testing prompt variations
- Anyone who wants the best AI answer

### Privacy

- No API keys required — uses your free AI chat accounts
- Works with your existing browser logins
- No data collection — everything stays on your device
- Open source — inspect the code yourself

---

## Installation

### Chrome Web Store

*Coming soon*

### From Source

1. Clone this repository
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open Chrome → `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** → select the `dist` folder

## Quick Start

1. Click the PromptCaster extension icon to open the Arena
2. Enter your prompt in the text field at the bottom
3. Press **Enter** to send to all enabled LLMs
4. Compare responses as they stream in
5. (Optional) Click **Judge** to synthesize the best response

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send prompt |
| `Shift+Enter` | New line |
| `Cmd/Ctrl+Shift+O` | New chat |
| `Escape` | Exit maximized view |

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm run package  # Build and create ZIP for Chrome Web Store
npm run lint     # Lint code
```

### Project Structure

```
src/
├── background/     # Service worker
├── content/        # Content scripts for LLM sites
├── pages/
│   ├── arena/      # Main comparison interface
│   └── options/    # Settings page
└── lib/            # Shared utilities and config
```

## License

MIT
