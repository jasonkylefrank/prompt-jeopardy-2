'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../firebase';
import { ref, push, set } from 'firebase/database';
import { useAuth } from './components/AuthProvider';

import Button from './components/Button';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const newGameRef = push(ref(db, 'games'));
      await set(newGameRef, {
        gameId: newGameRef.key,
        hostUid: user?.uid,
        gameState: 'SETUP',
        players: {}
      });
      router.push(`/admin/${newGameRef.key}`);
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-black font-outfit tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-mystery-cyan via-white to-mystery-pink drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          Prompt Jeopardy
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 font-light max-w-2xl mx-auto">
          Can you narrow down the secret persona and action from the LLM's answers?
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
          <Button
            variant="primary"
            onClick={() => router.push('/join')}
            className="w-full sm:w-auto text-xl py-4 px-10"
          >
            Join Game
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateGame}
            disabled={isCreating}
            className="w-full sm:w-auto text-xl py-4 px-10"
          >
            {isCreating ? 'Accessing Secure Network...' : 'Host a Game'}
          </Button>
        </div>
      </div>
    </div>
  );
}
