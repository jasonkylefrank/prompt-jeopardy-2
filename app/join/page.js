'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase';
import { ref, get } from 'firebase/database';

export default function JoinPage() {
  const [gameId, setGameId] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFindGame = async () => {
    const trimmedId = gameId.trim();
    if (!trimmedId) {
      setError('Please enter a Game ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gameRef = ref(db, `games/${trimmedId}`);
      const snapshot = await get(gameRef);

      if (snapshot.exists()) {
        // Game found, redirect to the specific join page
        router.push(`/join/${trimmedId}`);
      } else {
        setError('No game found with that ID. Please check the ID and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error finding game:", err);
      setError('An unexpected error occurred. Please check the console.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h1>Find a Game to Join</h1>
      <p>Please enter the Game ID provided by the host.</p>
      <div style={{ margin: '10px 0' }}>
        <input
          type="text"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="Enter Game ID"
          style={{ width: '100%', padding: '8px' }}
          disabled={isLoading}
        />
      </div>
      <button onClick={handleFindGame} disabled={isLoading} style={{ width: '100%', padding: '10px' }}>
        {isLoading ? 'Finding Game...' : 'Find Game'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}
