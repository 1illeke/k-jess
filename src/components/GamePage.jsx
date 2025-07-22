import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Button, ThemeToggle, TwoPlayerBoard, ThreePlayerBoard, FourPlayerBoard } from './ui';
import './GamePage.css';

const SOCKET_URL = 'http://localhost:3001';

function GamePage() {
  const location = useLocation();
  const { gameId } = useParams();
  const { gameMode = '1v1' } = location.state || {};
  const playerName = location.state?.playerName || localStorage.getItem('playerName') || 'Player1';

  const [gameTime, setGameTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [pausedBy, setPausedBy] = useState('');
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem(`chat_${gameId || 'default'}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [newMessage, setNewMessage] = useState('');
  const [players, setPlayers] = useState([]);
  const chatMessagesRef = useRef(null);
  const socketRef = useRef(null);

  // Get that game mode
  const getPlayerCount = () => {
    switch(gameMode) {
      case '1v1': return 2;
      case '1v1v1': return 3;
      case '1v1v1v1': return 4;
      default: return 2;
    }
  };

  // Connect to socket.io server
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit('joinGame', { gameId: gameId || 'default', playerName });

    socket.on('playerList', (playerList) => {
      setPlayers(playerList);
    });
    socket.on('chat', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });
    // TODO: socket.on('move', ...)

    return () => {
      socket.disconnect();
    };
  }, [gameId, playerName]);

  // Persist chat messages to localStorage
  useEffect(() => {
    localStorage.setItem(`chat_${gameId || 'default'}`, JSON.stringify(chatMessages));
  }, [chatMessages, gameId]);
  // On gameId change, load chat from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${gameId || 'default'}`);
    if (saved) setChatMessages(JSON.parse(saved));
  }, [gameId]);

  // Timer
  useEffect(() => {
    let interval = null;
    if (!isPaused) {
      interval = setInterval(() => {
        setGameTime(time => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-scroll
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handlePause = () => {
    if (!isPaused) {
      setIsPaused(true);
      setPausedBy(playerName);
      setModalType('pause');
      setShowModal(true);
      // Add pause message to chat
      socketRef.current.emit('chat', { gameId: gameId || 'default', message: `${playerName} paused the game`, player: 'System' });
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    setShowModal(false);
    setModalType('');
    // Add resume message to chat
    socketRef.current.emit('chat', { gameId: gameId || 'default', message: `Game resumed`, player: 'System' });
  };

  const handleQuit = () => {
    setModalType('quit');
    setShowModal(true);
  };

  const handleConfirmQuit = () => {
    socketRef.current.emit('chat', { gameId: gameId || 'default', message: `${playerName} left the game`, player: 'System' });
    setTimeout(() => {
      window.history.back();
    }, 500);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType('');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketRef.current.emit('chat', { gameId: gameId || 'default', message: newMessage.trim(), player: playerName });
      setNewMessage('');
    }
  };

  // Show that game mode
  const renderBoard = () => {
    switch(gameMode) {
      case '1v1':
        return <TwoPlayerBoard />;
      case '1v1v1':
        return <ThreePlayerBoard />;
      case '1v1v1v1':
        return <FourPlayerBoard />;
      default:
        return <TwoPlayerBoard />;
    }
  };

  return (
    <div className="game-page">
      <ThemeToggle />
      <div className="game-container">
        {/* Left Column - Players and Chat */}
        <aside className="players-chat-section">
          {/* Players */}
          <div className="players-section">
            {players.map((player) => (
              <div key={player.id} className="player-info">
                <div className="player-name">{player.name}</div>
                <div className="player-score">Score: 0001</div>
              </div>
            ))}
          </div>
          {/* Chat */}
          <div className="chat-section">
            <div 
              className="chat-messages"
              ref={chatMessagesRef}
            >
              {chatMessages.map((msg) => (
                <div key={msg.id} className="chat-message">
                  <span className="chat-player">{msg.player}:</span>
                  <span className="chat-text">{msg.message}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type message..."
                className="chat-input"
                maxLength={100}
              />
            </form>
          </div>
        </aside>
        {/* Center Column - Game Board */}
        <main className="chess-section">
          {renderBoard()}
        </main>
        {/* Right Column - Timer and Controls */}
        <aside className="controls-section">
          <div className="timer-section">
            <div className="timer-display">{formatTime(gameTime)}</div>
          </div>
          <div className="game-controls">
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={handlePause}
              className="control-btn"
              disabled={isPaused}
            >
              [ {isPaused ? 'Game Paused' : 'Pause'} ]
            </Button>
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={handleQuit}
              className="control-btn"
            >
              [ Quit ]
            </Button>
          </div>
        </aside>
      </div>
      {/* Game Modal */}
      {showModal && (
        <div className="pause-overlay">
          <div className="pause-modal-content">
            <h2 className="pause-title">
              {modalType === 'pause' 
                ? `${pausedBy} paused the game`
                : 'Do you want to quit?'
              }
            </h2>
            <div className="pause-buttons">
              <Button
                variant="primary"
                borderStyle="solid"
                onClick={modalType === 'pause' ? handleResume : handleCloseModal}
                className="pause-btn"
              >
                [ Resume ]
              </Button>
              <Button
                variant="secondary"
                borderStyle="solid"
                onClick={modalType === 'pause' ? handleQuit : handleConfirmQuit}
                className="pause-btn"
              >
                [ Quit ]
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamePage; 