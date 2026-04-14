'use client';

import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, set, push, onValue } from 'firebase/database';

// Default pools that can be customized by the admin
const DEFAULT_PERSONAS = 'Pirate, Shakespearean Actor, Valley Girl, Hard-boiled Detective, Alien Tourist';
const DEFAULT_ACTIONS = 'Ordering a pizza, Describing a sunset, Explaining a meme to a grandparent, Trying to sell a used car, Leading a meditation session';

// Basic styling - Moved here to be accessible by the component
const styles = {
    container: { padding: '20px', maxWidth: '800px', margin: 'auto' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    label: { fontWeight: 'bold' },
    textarea: { minHeight: '100px', padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '5px' },
    button: { padding: '10px 20px', fontSize: '1.2rem', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#007bff', color: 'white' },
    infoBox: { border: '1px solid #ccc', padding: '15px', margin: '20px 0', background: '#f9f9f9', borderRadius: '5px' },
    contestantList: { listStyle: 'none', padding: 0, columns: 2, gap: '10px' },
};

export default function AdminPage() {
  // State for game setup
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);
  const [actions, setActions] = useState(DEFAULT_ACTIONS);
  
  // State for the active game
  const [gameId, setGameId] = useState(null);
  const [gameUrl, setGameUrl] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [isGameCreated, setIsGameCreated] = useState(false);

  // Real-time listener for contestants joining the game
  useEffect(() => {
    if (!gameId) return;

    const contestantsRef = ref(db, `games/${gameId}/players`);
    const unsubscribe = onValue(contestantsRef, (snapshot) => {
      const players = snapshot.val();
      const playerList = players ? Object.values(players) : [];
      setContestants(playerList);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [gameId]);

  const setupNewGame = async () => {
    try {
      const gamesRef = ref(db, 'games');
      const newGameRef = push(gamesRef);
      const newGameId = newGameRef.key;

      const personaPool = personas.split(',').map(p => p.trim()).filter(p => p);
      const actionPool = actions.split(',').map(a => a.trim()).filter(a => a);

      if (personaPool.length < 2 || actionPool.length < 2) {
        alert('You must have at least two personas and two actions.');
        return;
      }

      await set(newGameRef, {
        gameId: newGameId,
        gameState: 'SETUP', // Initial state
        personaPool,
        actionPool,
        players: {},
      });

      setGameId(newGameId);
      setGameUrl(`${window.location.origin}/join/${newGameId}`);
      setIsGameCreated(true);

    } catch (error) {
      console.error("Error creating new game:", error);
      alert("Failed to create new game. See console for details.");
    }
  };
  
  const startRound = () => { alert('Starting Round 1! (Functionality to be built)'); };

  if (isGameCreated) {
    return (
      <div style={styles.container}>
        <h1>Game Created!</h1>
        <div style={styles.infoBox}>
          <p><strong>Game ID:</strong> {gameId}</p>
          <p><strong>Shareable Join URL:</strong> <a href={gameUrl} target="_blank" rel="noopener noreferrer">{gameUrl}</a></p>
        </div>

        <h2>Contestants ({contestants.length})</h2>
        <ul style={styles.contestantList}>
          {contestants.map(c => (
            <li key={c.id} style={{ marginBottom: '10px' }}><span>{c.avatar}</span> {c.name}</li>
          ))}
        </ul>
        
        <button style={styles.button} onClick={startRound} disabled={contestants.length === 0}>
          Start Round 1
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Set Up a New Game</h1>
      <div style={styles.form}>
        <label style={styles.label}>Persona Pool (comma-separated)</label>
        <textarea 
          style={styles.textarea}
          value={personas}
          onChange={(e) => setPersonas(e.target.value)}
        />
        
        <label style={styles.label}>Action Pool (comma-separated)</label>
        <textarea 
          style={styles.textarea}
          value={actions}
          onChange={(e) => setActions(e.target.value)}
        />

        <button style={styles.button} onClick={setupNewGame}>Create New Game</button>
      </div>
    </div>
  );
}
