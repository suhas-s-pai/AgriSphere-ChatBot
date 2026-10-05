const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the server folder first.
// This works correctly whether the project is started from the root
// with `npm --prefix server ...` or directly from the server folder.
dotenv.config({
  path: path.join(__dirname, '.env')
});

// If server/.env does not exist, also allow a root .env as a fallback.
dotenv.config();

const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for development and cross-origin requests
app.use(cors());

// Body parsing middleware (higher limit for base64 image uploads)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Path to compiled React production build
const clientDistPath = path.join(__dirname, '../client/dist');

// Serve static assets from React build directory
app.use(express.static(clientDistPath));

// Fallback: Serve React SPA index.html for all non-API GET routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const indexPath = path.join(clientDistPath, 'index.html');

  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send(
        'AgriSphere Frontend build not found. Please build the client project first.'
      );
    }
  });
});

// Error Handler Middleware
app.use(errorHandler);

// Start server and initialize DB connection
async function startServer() {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const genericLlmConfigured = Boolean(process.env.LLM_API_KEY && process.env.LLM_API_KEY.trim());

  console.log(`
======================================================
  🌱 AgriSphere Server is running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'production'}
  Gemini Integration: ${geminiConfigured ? 'Active' : 'Not Configured'}
  Alternative LLM: ${genericLlmConfigured ? 'Active' : 'Not Configured'}
  Agriculture fallback: Active when an AI API call fails
  Single Web Service Mode: Active (Serving Frontend + API)
======================================================
    `);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;