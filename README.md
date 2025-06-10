# AI Chat UI Frontend

This is the frontend for the AI Chat Interface application, built with React and integrated with the Vercel AI SDK.

## Vercel AI SDK Integration

This project uses the [Vercel AI SDK](https://www.npmjs.com/package/ai) for handling AI chat interactions. The AI SDK provides:

- A unified API to interact with multiple LLM providers (OpenAI, Anthropic, Google, etc.)
- React hooks for building chat interfaces (`useChat`)
- Streaming responses
- Multi-modal capabilities (text, image, video)

### Key Components

1. **AI SDK Hooks**: We use `useChat` from `@ai-sdk/react` in our Chat component to handle:
   - Message state management
   - Input handling
   - Streaming responses
   - API communication

2. **Model Providers**: We've integrated multiple model providers:
   - OpenAI (`@ai-sdk/openai`)
   - Anthropic (`@ai-sdk/anthropic`)
   - Google (`@ai-sdk/google`)

3. **Model Selection**: The chat interface includes a model selector that allows users to:
   - Choose from available models across different providers
   - See model capabilities
   - Save preferred models per conversation

4. **API Integration**: The frontend simulates API endpoints for development:
   - `/api/chat` - Handles chat requests using the AI SDK
   - Messages are saved to Appwrite after generation
   - API keys are retrieved from user settings

### Usage

To use the AI chat functionality:

1. Set up your API keys in the user settings for each provider you want to use
2. Select your preferred provider and model from the dropdown in the chat interface
3. Start chatting!

The app will automatically:
- Stream responses in real-time
- Save conversations to Appwrite
- Support text, image, and video generation based on the selected model's capabilities

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in your browser. 