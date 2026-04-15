'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, get, query, orderByChild, equalTo, push, set } from 'firebase/database';
import { debounce } from 'lodash';
import { useParams } from 'next/navigation';

// This allows us to use a single-page application (static export) and satisfies the 'output: export' requirement
export function generateStaticParams() {
  return [{ slug: [''] }]; 
}

const CUTE_ANIMALS = ['🦁', '🐯', '🐻', '🐼', '🦊', '🐨', '🐒', '🦛', '🦒', '🦓'];

export default function JoinClientPage() {
  const params = useParams();
  const router = useRouter();
  const gameIdFromUrl = params.slug ? params.slug[0] : null;

  const [gameIdInput, setGameIdInput] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNameChecking, setIsNameChecking] = useState(false);
  const [isNameUnique, setIsNameUnique] = useState(true);
  const [gameExists, setGameExists] = useState(false);

  const gameId = gameIdFromUrl || gameIdInput;

  useEffect(() => {
    const checkGame = async () => {
      if (!gameIdFromUrl) {
        setIsLoading(false);
        return;
      }
      const gameRef = ref(db, `games/${gameIdFromUrl}`);
      const snapshot = await get(gameRef);
      if (snapshot.exists()) {
        setGameExists(true);
      } else {
        setError('This game does not exist. Please check the Game ID.');
      }
      setIsLoading(false);
    };
    checkGame();
  }, [gameIdFromUrl]);

  const checkNameUniqueness = useCallback(debounce(async (name) => {
    if (!name || !gameId) {
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

  const handleFindGame = () => {
    router.push(`/join/${gameIdInput}`);
  };

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

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (gameIdFromUrl && !gameExists) {
    return <div className="text-red-500 p-8 text-center">{error || 'Game not found.'}</div>;
  }

  if (!gameIdFromUrl) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
        <h1>Find a Game to Join</h1>
        <p>Please enter the Game ID provided by the host.</p>
        <div style={{ margin: '10px 0' }}>
          <input
            type="text"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            placeholder="Enter Game ID"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button onClick={handleFindGame} style={{ width: '100%', padding: '10px' }}>
          Find Game
        </button>
      </div>
    );
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
