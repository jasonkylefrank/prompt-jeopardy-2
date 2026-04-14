'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, get } from 'firebase/database';

export default function ContestantPage({ params }) {
  const { contestantId } = params;
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game');

  const [contestant, setContestant] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <div>Loading contestant...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!contestant) {
    return <div>No contestant data found.</div>;
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
      <h1>Welcome, {contestant.name}!</h1>
      <p>Your avatar is:</p>
      <div style={{ fontSize: '100px' }}>
        {/* The avatar is already an emoji, so just display it */}
        {contestant.avatar}
      </div>
      {/* The rest of the contestant's game UI will go here */}
    </div>
  );
}
