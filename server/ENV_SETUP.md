# AgriSphere environment setup

Create a file named `.env` in this `server` folder:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/agrisphere

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite

LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1

CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Do not commit `.env` or share the API key.

The server loads `server/.env` explicitly, so starting the project from the repository root works correctly.
