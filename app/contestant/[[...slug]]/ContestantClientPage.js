'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, get, onValue } from 'firebase/database';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

// This allows us to use a single-page application (static export) and satisfies the 'output: export' requirement
export function generateStaticParams() {
  return [{ slug: [''] }]; 
}

export default function ContestantClientPage() {
  const params = useParams();
  const contestantId = params.slug ? params.slug[0] : null;
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game');

  const [contestant, setContestant] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState('SETUP');

  useEffect(() => {
    if (!contestantId || !gameId) return;

    const fetchContestantData = async () => {
      try {
        // Correctly reference the contestant within the game's players list
        const contestantRef = ref(db, `games/${gameId}/players/${contestantId}`);
        const snapshot = await get(contestantRef);

        if (snapshot.exists()) {
          setContestant(snapshot.val());
        } else {
          setError('Contestant not found in this game.');
        }
      } catch (err) {
        console.error("Error fetching contestant data:", err);
        setError('Failed to load contestant data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContestantData();
  }, [contestantId, gameId]);

  useEffect(() => {
    if (!gameId) return;
    
    const gameStateRef = ref(db, `games/${gameId}/gameState`);
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameState(snapshot.val());
      }
    });
    
    return () => unsubscribe();
  }, [gameId]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-xl animate-pulse text-mystery-cyan">Loading portal...</div>;
  }

  if (error) {
    return <div className="text-mystery-pink mt-8 p-4 bg-red-900/40 rounded-lg text-center max-w-md mx-auto">{error}</div>;
  }

  if (!contestant) {
    return <div className="text-center mt-8 text-slate-400">No contestant data found.</div>;
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[70vh] px-4 animate-in fade-in zoom-in-95 duration-500">
      <Card className="w-full max-w-lg p-8 text-center flex flex-col items-center">
        <h1 className="text-3xl font-black font-outfit text-white mb-6 tracking-wide">Welcome, Agent {contestant.name}</h1>
        
        <Avatar emoji={contestant.avatar} size="lg" className="mb-8" />
        
        <div className="w-full pt-8 border-t border-white/10">
          {gameState === 'SETUP' && (
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-mystery-cyan animate-pulse">Awaiting Host Configuration...</h2>
              <p className="text-slate-400">Stand by. The mission parameters are being finalized.</p>
            </div>
          )}
          
          {gameState === 'ROUND_1_PHASE_1' && (
            <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <h2 className="text-3xl font-black font-outfit text-mystery-pink drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]">Round 1 Commencing!</h2>
              <p className="text-slate-300">Prepare your queries carefully...</p>
              {/* Future iteration will place the QA UI here */}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
