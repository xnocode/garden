/**
 * Centralized AI model identifiers.
 * Update here when Google deprecates a model — one change fixes all features.
 */

/** Gemini model used for all generative tasks (vision, text, PDF, voice, etc.) */
export const GEMINI_MODEL = "gemini-3.6-flash";

/** Groq model used for fast text generation / task extraction */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

/** Gemini API base URL helper */
export function geminiUrl(apiKey: string, action = "generateContent") {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:${action}?key=${apiKey}`;
}
