import React, { createContext, useContext, useReducer, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

// Music player state actions
const MUSIC_ACTIONS = {
  SET_PLAYLIST: 'SET_PLAYLIST',
  SET_CURRENT_TRACK: 'SET_CURRENT_TRACK',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  NEXT_TRACK: 'NEXT_TRACK',
  PREVIOUS_TRACK: 'PREVIOUS_TRACK',
  SET_VOLUME: 'SET_VOLUME',
  SET_CURRENT_TIME: 'SET_CURRENT_TIME',
  SET_DURATION: 'SET_DURATION',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  playlist: [],
  currentTrackIndex: 0,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null
};

// Reducer function
function musicReducer(state, action) {
  switch (action.type) {
    case MUSIC_ACTIONS.SET_PLAYLIST:
      return {
        ...state,
        playlist: action.payload,
        currentTrackIndex: 0,
        error: null
      };
    
    case MUSIC_ACTIONS.SET_CURRENT_TRACK:
      return {
        ...state,
        currentTrackIndex: action.payload,
        currentTime: 0,
        error: null
      };
    
    case MUSIC_ACTIONS.PLAY:
      return {
        ...state,
        isPlaying: true,
        error: null
      };
    
    case MUSIC_ACTIONS.PAUSE:
      return {
        ...state,
        isPlaying: false
      };
    
    case MUSIC_ACTIONS.NEXT_TRACK: {
      const nextIndex = (state.currentTrackIndex + 1) % state.playlist.length;
      return {
        ...state,
        currentTrackIndex: nextIndex,
        currentTime: 0,
        error: null
      };
    }
    
    case MUSIC_ACTIONS.PREVIOUS_TRACK: {
      const prevIndex = state.currentTrackIndex === 0 
        ? state.playlist.length - 1 
        : state.currentTrackIndex - 1;
      return {
        ...state,
        currentTrackIndex: prevIndex,
        currentTime: 0,
        error: null
      };
    }
    
    case MUSIC_ACTIONS.SET_VOLUME:
      return {
        ...state,
        volume: Math.max(0, Math.min(1, action.payload))
      };
    
    case MUSIC_ACTIONS.SET_CURRENT_TIME:
      return {
        ...state,
        currentTime: action.payload
      };
    
    case MUSIC_ACTIONS.SET_DURATION:
      return {
        ...state,
        duration: action.payload
      };
    
    case MUSIC_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case MUSIC_ACTIONS.SET_ERROR:
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
const MusicContext = createContext();

// Music provider component
export function MusicProvider({ children }) {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      
      // Audio event listeners
      audioRef.current.addEventListener('loadstart', () => {
        dispatch({ type: MUSIC_ACTIONS.SET_LOADING, payload: true });
      });
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        dispatch({ type: MUSIC_ACTIONS.SET_DURATION, payload: audioRef.current.duration });
        dispatch({ type: MUSIC_ACTIONS.SET_LOADING, payload: false });
      });
      
      audioRef.current.addEventListener('error', (e) => {
        dispatch({ type: MUSIC_ACTIONS.SET_ERROR, payload: 'Failed to load audio' });
      });
      
      audioRef.current.addEventListener('ended', () => {
        dispatch({ type: MUSIC_ACTIONS.NEXT_TRACK });
      });
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update audio source when track changes
  useEffect(() => {
    if (state.playlist.length > 0 && audioRef.current) {
      const currentTrack = state.playlist[state.currentTrackIndex];
      if (currentTrack) {
        audioRef.current.src = currentTrack.src;
        audioRef.current.volume = state.volume;
        
        if (state.isPlaying) {
          audioRef.current.play().catch(e => {
            dispatch({ type: MUSIC_ACTIONS.SET_ERROR, payload: 'Failed to play audio' });
          });
        }
      }
    }
  }, [state.currentTrackIndex, state.playlist]);

  // Handle play/pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (state.isPlaying) {
        audioRef.current.play().catch(e => {
          dispatch({ type: MUSIC_ACTIONS.SET_ERROR, payload: 'Failed to play audio' });
        });
        
        // Start time tracking
        intervalRef.current = setInterval(() => {
          if (audioRef.current) {
            dispatch({ 
              type: MUSIC_ACTIONS.SET_CURRENT_TIME, 
              payload: audioRef.current.currentTime 
            });
          }
        }, 1000);
      } else {
        audioRef.current.pause();
        
        // Stop time tracking
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [state.isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // Load playlist from music directory
  const loadPlaylist = async () => {
    try {
      dispatch({ type: MUSIC_ACTIONS.SET_LOADING, payload: true });
      
      // Try to load playlist from JSON file
      try {
        const response = await fetch('/music/playlist.json');
        if (response.ok) {
          const data = await response.json();
          dispatch({ type: MUSIC_ACTIONS.SET_PLAYLIST, payload: data.tracks });
          dispatch({ type: MUSIC_ACTIONS.SET_LOADING, payload: false });
          return;
        }
      } catch (fetchError) {
        console.warn('Could not load playlist.json, using fallback playlist:', fetchError.message);
      }
      
      // Fallback playlist if JSON file is not available
      const fallbackPlaylist = [
        {
          id: 1,
          album: "K/Jess OST",
          title: "Season 7 OST",
          src: "/music/season-7-ost.mp3",
          coverArt: "/kjess.png"
        },
        {
          id: 2,
          album: "K/Jess OST",
          title: "Battle Theme",
          src: "/music/battle-theme.mp3",
          coverArt: "/kj.svg"
        }
      ];
      
      dispatch({ type: MUSIC_ACTIONS.SET_PLAYLIST, payload: fallbackPlaylist });
      dispatch({ type: MUSIC_ACTIONS.SET_LOADING, payload: false });
    } catch (error) {
      console.error('Failed to load playlist:', error);
      dispatch({ type: MUSIC_ACTIONS.SET_ERROR, payload: 'Failed to load playlist' });
    }
  };

  // Actions
  const actions = {
    loadPlaylist,
    play: () => dispatch({ type: MUSIC_ACTIONS.PLAY }),
    pause: () => dispatch({ type: MUSIC_ACTIONS.PAUSE }),
    togglePlay: () => {
      if (state.isPlaying) {
        dispatch({ type: MUSIC_ACTIONS.PAUSE });
      } else {
        dispatch({ type: MUSIC_ACTIONS.PLAY });
      }
    },
    nextTrack: () => dispatch({ type: MUSIC_ACTIONS.NEXT_TRACK }),
    previousTrack: () => dispatch({ type: MUSIC_ACTIONS.PREVIOUS_TRACK }),
    setVolume: (volume) => dispatch({ type: MUSIC_ACTIONS.SET_VOLUME, payload: volume }),
    setCurrentTrack: (index) => dispatch({ type: MUSIC_ACTIONS.SET_CURRENT_TRACK, payload: index }),
    seekTo: (time) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        dispatch({ type: MUSIC_ACTIONS.SET_CURRENT_TIME, payload: time });
      }
    }
  };

  const value = useMemo(() => ({
    ...state,
    actions,
    currentTrack: state.playlist[state.currentTrackIndex] || null
  }), [state, actions]);

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

MusicProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Hook to use music context
export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}

export default MusicContext;
