// Seems like I need to unset the OPENAI_API_KEY before loading dotenv, otherwise it will not work
// unset OPENAI_API_KEY
require('dotenv').config({ path: './.env' });
console.log("OPENAI_API_KEY loaded:", process.env.OPENAI_API_KEY);

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
// Creating a unique identifier for each conversation
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

// Including LLM wrapper
const { callLLM } = require('./llm');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// System prompt for the model

const systemPrompt = "You are an expert in public speaking, and you know how to create engaging and powerful talks. You understand how to structure them, and put them in simple language. Help me create a new talk by starting a conversation with me about what the talk will be about.";

// Function to generate a unique user ID
// Note that we will look to extend this function to link to a user's account with username and password
function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

// Function to log conversation
function logConversation(userId, conversation) {
  const logDir = path.join(__dirname, 'logs');
  // Make sure the log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  const logFile = path.join(logDir, `${userId}.json`);
  fs.writeFileSync(logFile, JSON.stringify(conversation, null, 2));
}

// Socket.io connection for client interactions 
io.on('connection', (socket) => {
  console.log('New client connected');

  // Generate a unique user ID for this session
  const userId = generateUserId();
  console.log(`Assigned user ID: ${userId}`);

  // Send initial message when a client connects
  socket.emit('chat response', "Hello! I'm here to help you create an engaging and powerful talk. Let's start by discussing what your talk will be about. What topic or idea would you like to present?");

  // Initialize conversation history with the system prompt
  let conversationHistory = [
    { role: "system", content: systemPrompt }
  ];

  // Log initial conversation state
  logConversation(userId, conversationHistory);

  socket.on('chat message', async (message) => {
    try {
      // While waiting for content generation emit 'thinking' status 
      socket.emit('thinking', true);

      // Add user message to conversation history
      conversationHistory.push({ role: "user", content: message });

      // Log the conversation history again now it has changed
      logConversation(userId, conversationHistory);

      // Getting the response from the LLM API defined in llm.js
      const response = await callLLM("gpt-4o", conversationHistory);

      // Add assistant response to conversation history
      conversationHistory.push({ role: "assistant", content: response });

      // Log conversation history after the assistant's response
      logConversation(userId, conversationHistory);

      // Emit 'thinking' status as false
      socket.emit('thinking', false);

      socket.emit('chat response', response);
    } catch (error) {
      console.error('Error:', error);
      // Emit 'thinking' status as false in case of error
      socket.emit('thinking', false);
      socket.emit('chat response', 'Sorry, there was an error processing your request.');
    }
  });

  // Disconnect and log out event for user
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Final log of the conversation when the user disconnects
    logConversation(userId, conversationHistory);
  });
});

// Start the server and log the server is running on the specified port
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});