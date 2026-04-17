'use client';

import { useEffect, useState } from 'react';
import { db } from '../../../firebase';
import { ref, onValue, set, runTransaction } from 'firebase/database';
import { useParams } from 'next/navigation';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {gameState?.players && Object.values(gameState.players).map((p, i) => (
            <Card key={i} className={`p-4 ${gameState.currentQuerent === Object.keys(gameState.players)[i] ? 'border-mystery-cyan' : ''}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-white">{p.name}</span>
                  <span className="text-mystery-pink font-bold">Score: {p.score}</span>
                </div>
                <div className="text-sm text-slate-400 mt-2">Abstains: {p.abstainCount || 0}</div>
            </Card>
        ))}
    </div>
  );

  const renderQuestionPhase = () => (
    <Card className="p-6 my-6">
        <h2 className="text-2xl font-bold font-outfit mb-4 text-mystery-cyan">
          {isMyTurn ? "It's your turn to ask!" : `Waiting for ${gameState?.players[gameState?.currentQuerent]?.name} to ask...`}
        </h2>
        {isMyTurn ? (
            <form onSubmit={e => { e.preventDefault(); handleAskQuestion(); }} className="flex flex-col gap-4">
                <Input 
                    type="text" 
                    value={currentQuestion} 
                    onChange={e => handleQuestionChange(e.target.value)} 
                    placeholder="Type your question here to ascertain the persona..." 
                />
                <Button type="submit" variant="primary" className="self-end">Ask LLM</Button>
            </form>
        ) : (
            <p className="italic bg-slate-900/60 p-4 border border-white/5 rounded-lg text-slate-300">
              Question being typed: "{currentQuestion}"
            </p>
        )}
    </Card>
  );

  const renderAnsweringPhase = () => (
    <Card className="p-6 my-6 border-mystery-pink/30">
      <h2 className="text-2xl font-bold font-outfit mb-4 text-mystery-pink">The AI Agent Responds:</h2>
      <p className="italic bg-slate-900/60 p-6 border border-white/5 rounded-lg text-slate-200 text-lg leading-relaxed shadow-inner">
        {gameState.llmResponse}
      </p>
      
      <div className="mt-8 pt-8 border-t border-white/10">
        <h3 className="text-xl font-bold text-white mb-6">What is the LLM's Persona and Action?</h3>
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="w-full">
            <label className="text-sm font-medium text-mystery-cyan mb-2 block">Guessed Persona</label>
            <select 
              className="w-full bg-slate-900 border border-white/20 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-mystery-cyan"
              value={myGuess.persona} 
              onChange={e => setMyGuess({...myGuess, persona: e.target.value})}
            >
              <option value="">-- Select a Persona --</option>
              {gameState.roundConfig.personaPool.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="w-full">
            <label className="text-sm font-medium text-mystery-pink mb-2 block">Guessed Action</label>
            <select 
              className="w-full bg-slate-900 border border-white/20 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-mystery-pink"
              value={myGuess.action} 
              onChange={e => setMyGuess({...myGuess, action: e.target.value})}
            >
              <option value="">-- Select an Action --</option>
              {gameState.roundConfig.actionPool.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={() => submitGuess(false)} variant="primary" className="flex-1">Submit Guess</Button>
          <Button onClick={() => submitGuess(true)} variant="outline">Abstain</Button>
        </div>
      </div>
    </Card>
  );
  
  if (!player.id) { 
    // Join Game screen (legacy fallback)
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="p-8">
          <form onSubmit={handleJoinGame} className="flex flex-col gap-4">
            <Input name="playerName" placeholder="Enter name" label="Your Name" />
            <Button type="submit" variant="primary">Join</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <h1 className="text-4xl font-black font-outfit text-white tracking-wider">Prompt Jeopardy</h1>
        <div className="text-right">
          <p className="text-mystery-cyan font-bold">Agent: {player.name}</p>
          <p className="text-slate-500 text-sm font-mono">Session ID: {gameId}</p>
        </div>
      </div>
      
      {renderPlayerList()}
      
      {gameState?.gameState === 'STARTED' && renderQuestionPhase()}
      {gameState?.gameState === 'ANSWERING' && renderAnsweringPhase()}
    </div>
  );
}
