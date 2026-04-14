'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { debounce } from 'lodash';

const CUTE_ANIMALS = ['🦁', '🐯', '🐻', '🐼', '🦊', '🐨', '🐒', '🦛', '🦒', '🦓'];

export default function JoinSpecificGamePage() {
  const router = useRouter();
  const params = useParams();
  const { gameId } = params;

  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNameChecking, setIsNameChecking] = useState(false);
  const [isNameUnique, setIsNameUnique] = useState(true);
  const [gameExists, setGameExists] = useState(false);

  useEffect(() => {
    const checkGame = async () => {
      if (!gameId) return;
      const gameRef = ref(db, `games/${gameId}`);
      const snapshot = await get(gameRef);
      if (snapshot.exists()) {
        setGameExists(true);
      } else {
        setError('This game does not exist. Please check the Game ID.');
      }
      setIsLoading(false);
    };
    checkGame();
  }, [gameId]);

  const checkNameUniqueness = useCallback(debounce(async (name) => {
    if (!name) {
      setIsNameUnique(true);
      setIsNameChecking(false);
      return;
    }
    setIsNameChecking(true);
    const playersRef = ref(db, `games/${gameId}/players`);
    const nameQuery = query(playersRef, orderByChild('name'), equalTo(name.trim()));
    const nameSnapshot = await get(nameQuery);
    setIsNameUnique(!nameSnapshot.exists());
    setIsNameChecking(false);
  }, 500), [gameId]);

  useEffect(() => {
    checkNameUniqueness(name);
  }, [name, checkNameUniqueness]);

  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (!name.trim() || !isNameUnique) {
      setError('Please enter a unique name.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const playersRef = ref(db, `games/${gameId}/players`);
      const playersSnapshot = await get(playersRef);
      const usedAvatars = playersSnapshot.exists() ? Object.values(playersSnapshot.val()).map(p => p.avatar) : [];
      let assignedAvatar = CUTE_ANIMALS.find(animal => !usedAvatars.includes(animal));
      if (!assignedAvatar) {
        setError('Sorry, all avatars are currently in use for this game!');
        setIsLoading(false);
        return;
      }

      const newPlayerRef = push(playersRef);
      const newContestant = {
        id: newPlayerRef.key,
        name: name.trim(),
        avatar: assignedAvatar,
        score: 0,
      };
      await set(newPlayerRef, newContestant);

      router.push(`/contestant/${newContestant.id}?game=${gameId}`);

    } catch (err) {
      console.error("Error joining game:", err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading && !gameExists) {
    return <div className="flex justify-center items-center min-h-screen">Verifying game...</div>;
  }

  if (!gameExists) {
    return <div className="text-red-500 p-8 text-center">{error || 'Game not found.'}</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-lg">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Join Game</h1>
        <p className="text-gray-600 mb-6">You are about to join Game ID: <strong className="font-mono">{gameId}</strong></p>
        <form onSubmit={handleJoinGame}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className={`w-full p-3 border rounded-md ${!isNameUnique && name ? 'border-red-500' : 'border-gray-300'}`}
            disabled={isLoading}
            aria-label="Your name"
          />
          {!isNameUnique && name && <p className="text-red-500 text-sm mt-1">This name is already taken.</p>}
          {isNameChecking && <p className="text-sm text-gray-500 mt-1">Checking name...</p>}
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md mt-4 disabled:bg-gray-400" disabled={!name.trim() || !isNameUnique || isLoading || isNameChecking}>
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
}
