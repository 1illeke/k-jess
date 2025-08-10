/**
 * REST endpoints
 */

import { Router } from 'express';
import { lobbyService } from '../services/lobby.service.js';
import { toErrorResponse } from '../utils/errors.js';
import { validatePayloadSize } from '../utils/validate.js';
import { now } from '../utils/time.js';

const router = Router();

// POST /api/lobbies
router.post('/lobbies', (req, res) => {
  try {
    validatePayloadSize(req.body, 2048);
    
    const { playerId, name, settings } = req.body;
    
    if (!playerId || !name) {
      return res.status(400).json({
        error: true,
        code: 'INVALID_INPUT',
        message: 'playerId and name are required'
      });
    }

    const code = lobbyService.createLobby({
      hostSocketId: `temp_${Date.now()}`, // temp id for now, will be replaced on connection
      playerId,
      name,
      settings
    });

    res.status(201).json({ code });
  } catch (error) {
    console.error('Error creating lobby:', error);
    const errorResponse = toErrorResponse(error);
    const statusCode = error.code === 'INVALID_INPUT' ? 400 : 500;
    res.status(statusCode).json(errorResponse);
  }
});

// GET /api/lobbies/:code
router.get('/lobbies/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    const lobbyPublic = lobbyService.getPublicView(code);
    
    if (!lobbyPublic) {
      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: 'Lobby not found or has ended'
      });
    }

    // timestamp for client sync
    res.json({
      ...lobbyPublic,
      serverNow: now()
    });
  } catch (error) {
    console.error('Error getting lobby:', error);
    const errorResponse = toErrorResponse(error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/lobbies (admin)
router.get('/lobbies', (req, res) => {
  try {
    const stats = lobbyService.getStats();
    res.json({
      stats,
      serverNow: now()
    });
  } catch (error) {
    console.error('Error getting lobby stats:', error);
    const errorResponse = toErrorResponse(error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/admin/lobbies
router.get('/admin/lobbies', (req, res) => {
  try {
    const allLobbies = [];
    
    // Get all lobbies from the service
    for (const [code, lobby] of lobbyService.lobbies.entries()) {
      const lobbyData = {
        code: lobby.code,
        phase: lobby.phase,
        createdAt: lobby.createdAt,
        startedAt: lobby.startedAt || null,
        endedAt: lobby.endedAt || null,
        settings: { ...lobby.settings },
        hostPlayerId: null,
        players: []
      };

      // Get host info
      const host = lobby.players.get(lobby.hostId);
      if (host) {
        lobbyData.hostPlayerId = host.playerId;
      }

      // Get all players
      for (const player of lobby.players.values()) {
        lobbyData.players.push({
          playerId: player.playerId,
          socketId: player.socketId,
          name: player.name,
          connected: player.connected,
          joinedAt: player.joinedAt,
          disconnectedAt: player.disconnectedAt || null,
        });
      }

      allLobbies.push(lobbyData);
    }

    res.json({
      lobbies: allLobbies,
      totalCount: allLobbies.length,
      serverNow: now()
    });
  } catch (error) {
    console.error('Error getting admin lobbies:', error);
    const errorResponse = toErrorResponse(error);
    res.status(500).json(errorResponse);
  }
});

// DELETE /api/admin/lobbies/:code
router.delete('/admin/lobbies/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    const lobby = lobbyService.getLobby(code);
    if (!lobby) {
      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: 'Lobby not found'
      });
    }
    lobbyService.endLobby({
      code,
      byPlayerId: 'ADMIN',
      reason: 'Lobby terminated by admin'
    });

    res.json({
      success: true,
      message: `Lobby ${code} has been terminated`,
      serverNow: now()
    });
  } catch (error) {
    console.error('Error deleting lobby:', error);
    const errorResponse = toErrorResponse(error);
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
    res.status(statusCode).json(errorResponse);
  }
});

export default router;