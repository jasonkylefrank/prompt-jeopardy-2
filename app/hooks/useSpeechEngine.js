'use client';

import { useRef, useCallback } from 'react';
import { db } from '../../firebase';
import { ref, update } from 'firebase/database';

export function useSpeechEngine(gameId) {
  const utteranceRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback(async (text) => {
    if (!window.speechSynthesis || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Split text into words to track progress
    // Regexp handles spaces and punctuation roughly for indexing
    const words = text.split(/\s+/);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Select a good voice (optional, defaults to system)
    const voices = window.speechSynthesis.getVoices();
    // Prefer a clear, natural-sounding voice if available
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;

    // Update Firebase as we speak
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Calculate which word we are on based on character index
        const charIndex = event.charIndex;
        const spokenText = text.substring(0, charIndex + event.charLength);
        const wordCount = spokenText.trim().split(/\s+/).length;
        
        update(ref(db, `games/${gameId}`), {
          visibleWordIndex: wordCount
        });
      }
    };

    utterance.onend = () => {
      update(ref(db, `games/${gameId}`), {
        readingStatus: 'finished',
        visibleWordIndex: words.length,
        timerStartTime: Date.now()
      });
    };

    utterance.onerror = (err) => {
      console.error("SpeechSynthesis error:", err);
      // Fallback: Just finish immediately so the game isn't stuck
      update(ref(db, `games/${gameId}`), {
        readingStatus: 'finished',
        visibleWordIndex: words.length,
        timerStartTime: Date.now()
      });
    };

    // Set status to reading before starting
    await update(ref(db, `games/${gameId}`), {
      readingStatus: 'reading',
      visibleWordIndex: 0
    });

    window.speechSynthesis.speak(utterance);
  }, [gameId]);

  return { speak, stopSpeaking };
}
