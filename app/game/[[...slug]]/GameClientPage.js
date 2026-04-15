'use client';

import { useEffect, useState } from 'react';
import { db } from '../../../firebase';
import { ref, onValue, set, runTransaction } from 'firebase/database';
import { useParams } from 'next/navigation';

// This allows us to use a single-page application (static export) and satisfies the 'output: export' requirement
export function generateStaticParams() {
  return [{ slug: [''] }]; 
}

export default function GameClientPage() {
  const params = useParams();
  const gameId = params.slug ? params.slug[0] : null;
  const [player, setPlayer] = useState({ id: null, name: '' });
  const [gameState, setGameState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [myGuess, setMyGuess] = useState({ persona: '', action: '' });

  useEffect(() => {
    if (!gameId) return;
    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      setGameState(data);
      setCurrentQuestion(data?.currentQuestion || '');
    });
    return () => unsubscribe();
  }, [gameId]);

  const handleJoinGame = (e) => {
    e.preventDefault();
    const playerName = e.target.elements.playerName.value;
    if (playerName.trim() && gameId) {
        const newPlayerId = `player_${Math.random().toString(36).substring(2, 9)}`;
        const playerRef = ref(db, `games/${gameId}/players/${newPlayerId}`);
        set(playerRef, { name: playerName, score: 0, abstainCount: 0 });
        setPlayer({ id: newPlayerId, name: playerName });
        // On joining, set the first player as the current querent if none is set
        runTransaction(ref(db, `games/${gameId}/currentQuerent`), (currentData) => {
            return currentData || newPlayerId;
        });
    }
  };

  const handleQuestionChange = (text) => {
    setCurrentQuestion(text);
    set(ref(db, `games/${gameId}/currentQuestion`), text);
  };

  const handleAskQuestion = async () => {
    // SIMULATE LLM RESPONSE
    const { secretPersona, secretAction } = gameState.roundConfig;
    const response = `(As ${secretPersona} who is ${secretAction}) ... "${currentQuestion}" ... Hmm, a fascinating query! I shall ponder and respond thusly...`;
    
    const updates = {};
    updates[`games/${gameId}/llmResponse`] = response;
    updates[`games/${gameId}/gameState`] = 'ANSWERING';
    updates[`games/${gameId}/submissions`] = {}; // Clear old submissions
    // In a real app, updates would be pushed to a Cloud Function task queue
    set(ref(db), updates);
  };

  const submitGuess = (isAbstaining = false) => {
    if (!isAbstaining && (!myGuess.persona || !myGuess.action)) {
        alert('Please select both a persona and an action.');
        return;
    }
    const guess = isAbstaining ? { abstained: true } : myGuess;
    set(ref(db, `games/${gameId}/submissions/${player.id}`), { ...guess, playerName: player.name });
    // Maybe show a "Waiting for other players..." message here
  };
  
  // --- RENDER FUNCTIONS ---
  const isMyTurn = gameState?.currentQuerent === player.id;

  const renderPlayerList = () => (
    <ul>
        {gameState?.players && Object.values(gameState.players).map((p, i) => (
            <li key={i} style={{fontWeight: gameState.currentQuerent === Object.keys(gameState.players)[i] ? 'bold' : 'normal'}}>
                {p.name}: {p.score} (Abstains: {p.abstainCount || 0})
            </li>
        ))}
    </ul>
  );

  const renderQuestionPhase = () => (
    <div>
        <h2>{isMyTurn ? "It's your turn to ask!" : `Waiting for ${gameState?.players[gameState?.currentQuerent]?.name} to ask...`}</h2>
        {isMyTurn ? (
            <form onSubmit={e => { e.preventDefault(); handleAskQuestion(); }}>
                <input 
                    type="text" 
                    value={currentQuestion} 
                    onChange={e => handleQuestionChange(e.target.value)} 
                    placeholder="Type your question here..." 
                    style={{width: '80%', padding: '8px'}}
                />
                <button type="submit">Ask LLM</button>
            </form>
        ) : (
            <p style={{fontStyle: 'italic', background: '#eee', padding: '1em'}}>Question being typed: "{currentQuestion}"</p>
        )}
    </div>
  );

  const renderAnsweringPhase = () => (
    <div>
      <h2>The LLM Responds:</h2>
      <p style={{ fontStyle: 'italic', background: '#f0f0f0', padding: '1em' }}>{gameState.llmResponse}</p>
      <hr />
      <h3>What is the LLM's Persona and Action?</h3>
      <div>
        <select value={myGuess.persona} onChange={e => setMyGuess({...myGuess, persona: e.target.value})}>
          <option value="">-- Select a Persona --</option>
          {gameState.roundConfig.personaPool.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={myGuess.action} onChange={e => setMyGuess({...myGuess, action: e.target.value})} style={{marginLeft: '1em'}}>
          <option value="">-- Select an Action --</option>
          {gameState.roundConfig.actionPool.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <button onClick={() => submitGuess(false)} style={{marginTop: '1em'}}>Submit Guess</button>
      <button onClick={() => submitGuess(true)} style={{marginLeft: '1em'}}>Abstain</button>
    </div>
  );
  
  if (!player.id) { /* Join Game screen */ }

  return (
    <div>
      <h1>Prompt Jeopardy!</h1>
      <p>Welcome, {player.name}! (Game ID: {gameId})</p>
      {renderPlayerList()}
      <hr />
      {gameState?.gameState === 'STARTED' && renderQuestionPhase()}
      {gameState?.gameState === 'ANSWERING' && renderAnsweringPhase()}
      {/* A screen for when you have submitted but others haven't could go here */}
    </div>
  );
}
