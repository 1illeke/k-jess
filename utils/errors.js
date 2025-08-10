
export class AppError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// Error codes
export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  PHASE_CONFLICT: 'PHASE_CONFLICT',
  ROOM_FULL: 'ROOM_FULL',
  NOT_HOST: 'NOT_HOST',
  INVALID_INPUT: 'INVALID_INPUT',
  ALREADY_STARTED: 'ALREADY_STARTED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Human readable message
 * @param {*} details - Additional error details
 * @returns {AppError} Standardized error
 */
export function createError(code, message, details = null) {
  return new AppError(code, message, details);
}

/**
 * @param {Error} error - Error to convert
 * @returns {object} Safe error response
 */
export function toErrorResponse(error) {
  if (error instanceof AppError) {
    return {
      error: true,
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
  
  // Don't leak internal errors
  return {
    error: true,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An internal error occurred'
  };
}