import { isValidCode } from './code.js';
import { createError, ERROR_CODES } from './errors.js';

/**
 * @param {string} code - Code to validate
 * @throws {AppError} If code is invalid
 */
export function validateCode(code) {
  if (!isValidCode(code)) {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Code must be a 5-digit string');
  }
}

/**
 * @param {string} name - Name to validate
 * @throws {AppError} If name is invalid
 */
export function validateName(name) {
  if (typeof name !== 'string') {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Name must be a string');
  }
  
  if (name.length < 1 || name.length > 32) {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Name must be 1-32 characters long');
  }
  
  // sanitization
  if (!/^[\p{L}\p{N}\s\-_'.]+$/u.test(name)) {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Name contains invalid characters');
  }
}

/**
 * @param {string} playerId - Player ID to validate
 * @throws {AppError} If player ID is invalid
 */
export function validatePlayerId(playerId) {
  if (typeof playerId !== 'string' || playerId.length < 1 || playerId.length > 64) {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Player ID must be a 1-64 character string');
  }
}

/**
 * @param {object} settings - Settings to validate
 * @throws {AppError} If settings are invalid
 */
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Settings must be an object');
  }
  
  const { mode, cooldownMs, maxPlayers, randomColors } = settings;
  
  if (mode !== undefined && mode !== '2 Player') {
    throw createError(ERROR_CODES.INVALID_INPUT, 'Mode must be "2 Player"');
  }
  
  if (cooldownMs !== undefined) {
    if (!Number.isInteger(cooldownMs) || cooldownMs < 500 || cooldownMs > 60000) {
      throw createError(ERROR_CODES.INVALID_INPUT, 'Cooldown must be between 500-60000ms');
    }
  }
  
  if (maxPlayers !== undefined) {
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
      throw createError(ERROR_CODES.INVALID_INPUT, 'Max players must be between 2-4');
    }
  }
  
  if (randomColors !== undefined) {
    if (typeof randomColors !== 'boolean') {
      throw createError(ERROR_CODES.INVALID_INPUT, 'Random colors must be a boolean');
    }
  }
}

/**
 * @param {*} payload - Payload to validate
 * @param {number} maxSize - Maximum size in bytes
 * @throws {AppError} If payload is too large
 */
export function validatePayloadSize(payload, maxSize = 1024) {
  const size = JSON.stringify(payload).length;
  if (size > maxSize) {
    throw createError(ERROR_CODES.INVALID_INPUT, `Payload too large: ${size}/${maxSize} bytes`);
  }
}