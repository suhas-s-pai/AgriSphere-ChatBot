const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const { seedInitialData } = require('./utils/seedData');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Start server and initialize DB connection & seed data
async function startServer() {
  await connectDB();
  await seedInitialData();

  app.listen(PORT, () => {
    console.log(`
======================================================
  🐽 ScamSniff Server is running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  LLM Integration: ${process.env.LLM_API_KEY ? 'Active API' : 'Rule-based Offline Fallback'}
  API Base: http://localhost:${PORT}/api
======================================================
    `);
  });
}

startServer();

module.exports = app;
