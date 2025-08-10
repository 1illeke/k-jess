/**
 * Utilities for generating and validating lobby codes
 */

/**
 * @param {Set<string>} existingCodes - Set of existing codes to avoid collisions
 * @returns {string} A unique 5-digit code
 */
export function generate5DigitCode(existingCodes = new Set()) {
  const MAX_RETRIES = 100;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  
  // Fallback: sequential search if random fails
  for (let code = 10000; code <= 99999; code++) {
    const codeStr = code.toString();
    if (!existingCodes.has(codeStr)) {
      return codeStr;
    }
  }
  
  throw new Error('Unable to generate unique lobby code');
}

/**
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid
 */
export function isValidCode(code) {
  return typeof code === 'string' && /^\d{5}$/.test(code);
}