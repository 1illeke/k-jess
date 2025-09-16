import React, { createContext, useContext, useReducer, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

// Sound effects state actions
const SOUND_ACTIONS = {
  SET_MUTED: 'SET_MUTED',
  SET_VOLUME: 'SET_VOLUME',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  isMuted: localStorage.getItem('chessSoundMuted') === 'true',
  volume: 0.7,
  isLoading: false,
  error: null
};

// Reducer function
function soundReducer(state, action) {
  switch (action.type) {
    case SOUND_ACTIONS.SET_MUTED:
      // Persist mute state to localStorage
      localStorage.setItem('chessSoundMuted', action.payload.toString());
      return {
        ...state,
        isMuted: action.payload
      };
    
    case SOUND_ACTIONS.SET_VOLUME:
      return {
        ...state,
        volume: Math.max(0, Math.min(1, action.payload))
      };
    
    case SOUND_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case SOUND_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    default:
      return state;
  }
}

// Create context
const SoundContext = createContext();

// Sound provider component
export function SoundProvider({ children }) {
  const [state, dispatch] = useReducer(soundReducer, initialState);
  const moveAudioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!moveAudioRef.current) {
      moveAudioRef.current = new Audio();
      moveAudioRef.current.src = '/SFX/move.wav';
      moveAudioRef.current.preload = 'auto';
      moveAudioRef.current.volume = state.volume;
      
      // Audio event listeners
      moveAudioRef.current.addEventListener('loadstart', () => {
        dispatch({ type: SOUND_ACTIONS.SET_LOADING, payload: true });
      });
      
      moveAudioRef.current.addEventListener('canplaythrough', () => {
        dispatch({ type: SOUND_ACTIONS.SET_LOADING, payload: false });
      });
      
      moveAudioRef.current.addEventListener('error', (e) => {
        console.warn('Failed to load move sound effect:', e);
        dispatch({ type: SOUND_ACTIONS.SET_ERROR, payload: 'Failed to load move sound' });
      });
    }
  }, []);

  // Update audio volume when state changes
  useEffect(() => {
    if (moveAudioRef.current) {
      moveAudioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // Play move sound effect
  const playMoveSound = () => {
    if (state.isMuted || !moveAudioRef.current || state.error) {
      return;
    }

    try {
      // Reset audio to beginning for rapid successive plays
      moveAudioRef.current.currentTime = 0;
      
      // Play the sound
      const playPromise = moveAudioRef.current.play();
      
      // Handle browsers that return a promise
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Handle autoplay restrictions gracefully
          if (error.name === 'NotAllowedError') {
            console.warn('Audio autoplay blocked by browser. Sound will play after user interaction.');
          } else {
            console.warn('Failed to play move sound:', error);
          }
        });
      }
    } catch (error) {
      console.warn('Error playing move sound:', error);
    }
  };

  // Actions
  const actions = {
    playMoveSound,
    toggleMute: () => {
      dispatch({ type: SOUND_ACTIONS.SET_MUTED, payload: !state.isMuted });
    },
    setMuted: (muted) => {
      dispatch({ type: SOUND_ACTIONS.SET_MUTED, payload: muted });
    },
    setVolume: (volume) => {
      dispatch({ type: SOUND_ACTIONS.SET_VOLUME, payload: volume });
    }
  };

  const value = useMemo(() => ({
    ...state,
    actions
  }), [state]);

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

SoundProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Hook to use sound context
export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}

export default SoundContext;