import React, { useState, useEffect, useRef } from 'react';

const VoiceInput = ({ onTranscript, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop listening automatically after user pauses
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Set to English/Hinglish compatible English locale

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && onTranscript) {
        onTranscript(transcript);
      }
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const toggleListening = () => {
    if (!supported || disabled) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  };

  if (!supported) {
    return (
      <button
        className="btn btn-outline-secondary rounded-circle ms-2"
        type="button"
        title="Voice input not supported in this browser"
        disabled
      >
        <i className="bi bi-mic-mute-fill"></i>
      </button>
    );
  }

  return (
    <button
      className={`btn ${isListening ? 'btn-danger border-danger-subtle pulse-mic' : 'btn-outline-primary'} rounded-circle ms-2 d-flex align-items-center justify-content-center`}
      style={{ width: '45px', height: '45px', transition: 'all 0.3s ease' }}
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? 'Stop listening' : 'Start voice ordering'}
    >
      <i className={`bi ${isListening ? 'bi-mic-fill text-white animate-pulse' : 'bi-mic-fill'}`}></i>
      
      {/* Styles for pulsing mic */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .pulse-mic {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </button>
  );
};

export default VoiceInput;
