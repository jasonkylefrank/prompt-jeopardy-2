import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

/**
 * Builds the combined prompt including mission parameters and contestant question.
 */
function buildCombinedPrompt(question, { secretPersona, secretAction, personaPool, actionPool }) {
  return `SYSTEM MISSION PARAMETERS:
You are playing a guessing game called "Prompt Jeopardy". Contestants are trying to figure out your secret persona and secret action from your answers.

YOUR SECRET PERSONA: ${secretPersona}
YOUR SECRET ACTION: You are trying to ${secretAction.toLowerCase()}

RULES FOR YOUR RESPONSES:
1. Answer the contestant's question from the point of view and personality of your secret persona (${secretPersona}), incorporating their historical time period, known quotes, capabilities, and mannerisms.
2. While answering, subtly incorporate the secret action into your response.
3. Do NOT reveal your persona or action directly. This is a guessing game — be subtle.
4. Try to formulate your answer such that it could plausibly indicate at least 2 of the personas from this pool: ${personaPool.join(', ')}
5. Similarly, try to make your answer ambiguous enough that it could indicate at least 2 of these actions: ${actionPool.join(', ')}
6. Keep your response to approximately 50 words. Be concise but informative.
7. Stay in character at all times. Never break character or acknowledge that you are an AI playing a game.

CONTESTANT QUESTION:
"${question}"

YOUR RESPONSE (As ${secretPersona}):`;
}

/**
 * Sends a contestant's question to the Gemini LLM and returns the response.
 * Implements an aggressive fallback strategy across all likely 2025 models.
 */
export async function askLLM(question, roundConfig) {
  const prompt = buildCombinedPrompt(question, roundConfig);
  
  // Broad list of 2025 models from the user's actual diagnostic list
  const modelsToTry = [
    'gemini-2.0-flash', 
    'gemini-2.5-flash', 
    'gemini-2.0-flash-lite', 
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash' // Old faithful fallback
  ];
  
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      // Trying both v1 and v1beta as different models might be on different paths
      const apiVersions = ['v1', 'v1beta'];
      
      for (const apiVersion of apiVersions) {
        try {
          const model = genAI.getGenerativeModel(
            { model: modelName },
            { apiVersion }
          );
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (innerError) {
          // If it's a 404, just try the next API version or next model
          if (innerError.message?.includes('404')) continue;
          throw innerError; // If it's 429 or other, throw to change model
        }
      }
    } catch (error) {
      console.warn(`Model ${modelName} call failed:`, error);
      lastError = error;
      
      // If we hit a rate limit, wait 1s before trying the NEXT model
      if (error.message?.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  const errorMsg = lastError?.message || "Unknown error";
  throw new Error(`LLM Failure: ${errorMsg}`);
}
