# PromptCaster

**Compare ChatGPT, Claude, Gemini & Perplexity side-by-side in one interface.**

A Chrome extension that lets you send the same prompt to multiple AI chatbots simultaneously and compare their responses. Use Judge mode to have one LLM synthesize the best answer from all responses.

## Features

- **Side-by-side comparison** - View responses from ChatGPT, Claude, Gemini, and Perplexity in real-time
- **Judge mode** - Select any LLM as a judge to synthesize the best response from all models
- **Maximize panels** - Focus on a single LLM response with one click
- **Customizable layout** - Enable/disable LLMs and reorder panels in settings
- **Theme support** - Light, dark, and system-based themes
- **PWA support** - Install as a standalone app via GitHub Pages

## Installation

### From source

1. Clone this repository
2. Install dependencies and build:
   ```bash
   pnpm install
   pnpm build
   ```
3. Open Chrome and navigate to `chrome://extensions`
4. Enable **Developer mode** (toggle in top-right)
5. Click **Load unpacked** and select the `dist` folder

## Quick Start

1. Click the PromptCaster extension icon to open the Arena
2. Enter your prompt in the text field at the bottom
3. Press **Enter** to send to all enabled LLMs
4. Compare responses as they stream in
5. (Optional) Click the **Judge** button to synthesize the best response

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send prompt |
| `Shift+Enter` | New line |
| `Cmd/Ctrl+Shift+O` | New chat |
| `Escape` | Exit maximized view |

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

### Loading in Chrome

1. Run `pnpm build`
2. Navigate to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist` folder
5. Click the extension icon to open the Arena

### Project Structure

```
src/
├── background/     # Service worker
├── content/        # Content scripts for LLM sites
├── pages/
│   ├── arena/      # Main comparison interface
│   └── options/    # Settings page
└── types/          # TypeScript types
```

## Supported LLMs

| LLM | URL |
|-----|-----|
| ChatGPT | chatgpt.com |
| Claude | claude.ai |
| Gemini | gemini.google.com |
| Perplexity | perplexity.ai |

## License

MIT
