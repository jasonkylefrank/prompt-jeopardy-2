'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, get, query, orderByChild, equalTo, push, set } from 'firebase/database';
import { debounce } from 'lodash';
import { useParams } from 'next/navigation';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../components/AuthProvider';

// This allows us to use a single-page application (static export) and satisfies the 'output: export' requirement
export function generateStaticParams() {
  return [{ slug: [''] }];
}

const CUTE_ANIMALS = ['🦁', '🐯', '🐻', '🐼', '🦊', '🐨', '🐒', '🦛', '🦒', '🦓'];

export default function JoinClientPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const gameIdFromUrl = params.slug ? params.slug[0] : null;

  const BrandingHeader = () => (
    <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <h1 className="text-3xl md:text-4xl font-black font-outfit text-transparent bg-clip-text bg-gradient-to-r from-mystery-cyan via-white to-mystery-pink tracking-tight">
        Prompt Jeopardy
      </h1>
      <p className="text-mystery-cyan mt-3 font-medium tracking-widest text-xs uppercase">An AI Deduction Game</p>
    </div>
  );

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


      const newPlayerRef = ref(db, `games/${gameId}/players/${user.uid}`);
      const newContestant = {
        id: user.uid,
        name: name.trim(),
        avatar: assignedAvatar,
        score: 0,
      };
      await set(newPlayerRef, newContestant);
      
      router.push(`/contestant/${user.uid}?game=${gameId}`);

    } catch (err) {
      console.error("Error joining game:", err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-xl animate-pulse text-mystery-cyan">Loading portal...</div>;
  }

  if (gameIdFromUrl && !gameExists) {
    return <div className="text-red-500 p-8 text-center">{error || 'Game not found.'}</div>;
  }

  if (!gameIdFromUrl) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8 relative">
        <BrandingHeader />
        <Card className="w-full max-w-md p-8 border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.05)] animate-in zoom-in-95 duration-500 delay-100">
          <h2 className="text-2xl font-bold font-outfit mb-4 text-white">Find a Session</h2>
          <p className="text-slate-400 mb-6 font-light text-sm">Please enter the Game ID provided by the host to connect to the session.</p>
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              placeholder="Enter Game ID..."
              label="Game ID"
            />
            <Button onClick={handleFindGame} className="w-full mt-2 py-3" variant="primary">
              Initialize Connection
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8 relative">
      <BrandingHeader />
      <Card className="w-full max-w-md p-8 border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.05)] animate-in zoom-in-95 duration-500 delay-100">
        <h2 className="text-2xl font-bold font-outfit mb-2 text-white">Join Session</h2>
        <p className="text-slate-400 mb-8 font-light text-sm">
          Entering gateway: <strong className="font-mono text-mystery-cyan ml-1 tracking-wider">{gameId}</strong>
        </p>

        <form onSubmit={handleJoinGame} className="flex flex-col gap-5">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Agent Smith"
            label="Your Alias"
            className={!isNameUnique && name ? 'border-mystery-pink shadow-[0_0_10px_rgba(244,114,182,0.3)] rounded-lg' : ''}
            disabled={isLoading}
          />
          {!isNameUnique && name && <p className="text-mystery-pink text-xs mt-1 -translate-y-2">This alias is already registered in the session.</p>}
          {isNameChecking && <p className="text-xs text-mystery-cyan mt-1 -translate-y-2 animate-pulse">Running clearance check...</p>}

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 py-4 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            disabled={!name.trim() || !isNameUnique || isLoading || isNameChecking}
          >
            {isLoading ? 'Establishing Connection...' : 'Enter Game'}
          </Button>
        </form>
        {error && <p className="text-mystery-pink text-sm mt-6 p-4 bg-red-950/40 border border-mystery-pink/30 rounded-lg animate-in fade-in">{error}</p>}
      </Card>
    </div>
  );
}
