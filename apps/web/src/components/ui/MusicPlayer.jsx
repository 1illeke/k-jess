import React, { useState, useEffect } from 'react';
import { useMusic } from '../../contexts/MusicContext';
import './MusicPlayer.css';

function MusicPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    isLoading,
    error,
    actions 
  } = useMusic();
  
  const [isHovered, setIsHovered] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Load playlist on component mount
  useEffect(() => {
    actions.loadPlaylist();
  }, []);

  // Format time in MM:SS format
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Helper function to render volume icon
  const renderVolumeIcon = (volumeLevel) => {
    if (volumeLevel === 0) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      );
    } else if (volumeLevel < 0.5) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      );
    }
  };

  if (!currentTrack) {
    return null; // Don't render if no track is loaded
  }

  return (
    <div 
      className={`music-player ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowVolumeSlider(false);
      }}
    >
      {/* Background gradient similar to the image */}
      <div className="music-player-background"></div>
      
      {/* Main content */}
      <div className="music-player-content">
        {/* Album art */}
        <div className="album-art">
          <img 
            src={currentTrack.coverArt} 
            alt={`${currentTrack.album} cover`}
            onError={(e) => {
              e.target.src = '/kj.svg'; // Fallback image
            }}
          />
          {isLoading && <div className="loading-spinner"></div>}
        </div>

        {/* Track info */}
        <div className="track-info">
          <div className="track-album">{currentTrack.album}</div>
          <div className="track-title">{currentTrack.title}</div>
        </div>

        {/* Time display */}
        <div className="time-display">
          {formatTime(currentTime)}
        </div>

        {/* Progress bar (always visible) */}
        <div className="progress-bar-container">
          <progress 
            className="progress-bar"
            value={currentTime}
            max={duration}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newTime = (clickX / rect.width) * duration;
              actions.seekTo(newTime);
            }}
          >
            {Math.round(progressPercentage)}%
          </progress>
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Control buttons (visible on hover) */}
        <div className={`control-buttons ${isHovered ? 'visible' : ''}`}>
          {!showVolumeSlider ? (
            <>
              <button 
                className="control-btn previous-btn"
                onClick={actions.previousTrack}
                title="Previous track"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              <button 
                className="control-btn play-pause-btn"
                onClick={actions.togglePlay}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button 
                className="control-btn next-btn"
                onClick={actions.nextTrack}
                title="Next track"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>

              <button 
                className="control-btn volume-btn"
                onClick={() => setShowVolumeSlider(true)}
                title="Volume"
              >
                {renderVolumeIcon(volume)}
              </button>
            </>
          ) : (
            <div className="volume-control-panel">
              <button 
                className="control-btn back-btn"
                onClick={() => setShowVolumeSlider(false)}
                title="Back to controls"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>

              <div className="volume-slider-inline">
                <span className="volume-label">Volume</span>
                <input
                  type="range"
                  className="volume-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => actions.setVolume(parseFloat(e.target.value))}
                />
                <span className="volume-value">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
