const OpenAI = require("openai");

console.log("OPENAI_API_KEY loaded:", process.env.OPENAI_API_KEY);


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * Calls the LLM provider (OpenRouter) with the given model and message history.
 * @param {string} model - e.g., "gpt-4o" or "mistralai/mistral-7b-instruct"
 * @param {Array} messages - Chat history in OpenAI format
 * @returns {Promise<string>} - Assistant response
 */
async function callLLM(model, messages) {
    // Sending the conversation history to OpenAI API for content generation (and defining the model)    
  const completion = await openai.chat.completions.create({
    model,
    messages,
  });
  // Extracting the response. Atm the model only returns the first response. Can be changed to return multiple. 
  return completion.choices[0].message.content;
}

module.exports = { callLLM };
