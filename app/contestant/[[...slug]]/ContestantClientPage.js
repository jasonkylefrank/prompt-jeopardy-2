'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, get, onValue, update } from 'firebase/database';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import Input from '../../components/Input';

// This allows us to use a single-page application (static export) and satisfies the 'output: export' requirement
export function generateStaticParams() {
  return [{ slug: [''] }];
}

const ANSWER_TIMER_SECONDS = 15;

export default function ContestantClientPage() {
  const params = useParams();
  const contestantId = params.slug ? params.slug[0] : null;
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game');

  const [contestant, setContestant] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameData, setGameData] = useState(null);

  // Gameplay state
  const [questionInput, setQuestionInput] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [hasSubmittedGuess, setHasSubmittedGuess] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const timerRef = useRef(null);

  const gameState = gameData?.gameState || 'SETUP';

  // Fetch initial contestant data
  useEffect(() => {
    if (!contestantId || !gameId) return;

    const fetchContestantData = async () => {
      try {
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

  // Real-time listener for full game data
  useEffect(() => {
    if (!gameId) return;

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameData(data);
        // Keep contestant data in sync
        if (data.players?.[contestantId]) {
          setContestant(data.players[contestantId]);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, contestantId]);

  // Reset guess state when phase changes
  useEffect(() => {
    if (!gameState) return;
    if (gameState.includes('QUESTIONING')) {
      setSelectedPersona('');
      setSelectedAction('');
      setHasSubmittedGuess(false);
      setQuestionInput('');
      setTimerSeconds(null);
    }
  }, [gameState]);

  // Timer: Starts when we enter ANSWERING state
  // Timer: Starts when we enter ANSWERING state AND reading is finished
  useEffect(() => {
    if (gameState.includes('ANSWERING') && gameData?.readingStatus === 'finished' && timerSeconds === null) {
      // Calculate remaining time based on timerStartTime from Firebase for sync
      if (gameData.timerStartTime) {
        const elapsed = (Date.now() - gameData.timerStartTime) / 1000;
        const remaining = Math.max(0, Math.ceil(ANSWER_TIMER_SECONDS - elapsed));
        setTimerSeconds(remaining);
      } else {
        setTimerSeconds(ANSWER_TIMER_SECONDS);
      }
    }
    if (!gameState.includes('ANSWERING')) {
      setTimerSeconds(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState, gameData?.readingStatus, gameData?.timerStartTime]);

  useEffect(() => {
    if (timerSeconds === null || timerSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerSeconds]);

  // ---- Derived state ----
  const isMyTurn = gameData?.currentQuerentId === contestantId;
  const currentQuerent = gameData?.players?.[gameData?.currentQuerentId];
  const currentQuerentName = currentQuerent?.name || 'Someone';
  const contestantEntries = Object.entries(gameData?.players || {});
  const contestantList = contestantEntries.map(([id, data]) => ({ id, ...data }));

  const parseState = () => {
    const match = (gameState || '').match(/ROUND_(\d+)_PHASE_(\d+)_(\w+)/);
    if (!match) return { round: gameData?.round || 1, phase: gameData?.phase || 1, mode: '' };
    return { round: parseInt(match[1]), phase: parseInt(match[2]), mode: match[3] };
  };

  // ---- Real-time Broadcast: Typing Sync ----
  useEffect(() => {
    const { mode } = parseState();
    if (!isMyTurn || !gameId || mode !== 'QUESTIONING' || isSubmittingQuestion) return;

    // Debounce typing to Firebase
    const timeoutId = setTimeout(async () => {
      // If user cleared the input, sync that too so others see it
      const currentText = questionInput.trim();
      
      try {
        await update(ref(db, `games/${gameId}`), {
          currentQuestion: currentText,
          questionStatus: currentText ? 'typing' : null
        });
      } catch (err) {
        console.error("Typing sync failed:", err);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [questionInput, isMyTurn, gameId, isSubmittingQuestion]);

  // ---- Actions ----
  const submitQuestion = async () => {
    if (!questionInput.trim()) return;
    setIsSubmittingQuestion(true);

    try {
      await update(ref(db, `games/${gameId}`), {
        currentQuestion: questionInput.trim(),
        questionStatus: 'submitted'
      });
    } catch (err) {
      console.error("Error submitting question:", err);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const submitGuess = async () => {
    if (!selectedPersona || !selectedAction) {
      return;
    }

    try {
      await update(ref(db, `games/${gameId}/submissions/${contestantId}`), {
        persona: selectedPersona,
        action: selectedAction,
        abstained: false,
      });
      setHasSubmittedGuess(true);
    } catch (err) {
      console.error("Error submitting guess:", err);
    }
  };

  const submitAbstain = async () => {
    try {
      await update(ref(db, `games/${gameId}/submissions/${contestantId}`), {
        abstained: true,
      });
      setHasSubmittedGuess(true);
    } catch (err) {
      console.error("Error submitting abstain:", err);
    }
  };

  // ---- Loading / Error states ----
  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-xl animate-pulse text-mystery-cyan">Loading portal...</div>;
  }

  if (error) {
    return <div className="text-mystery-pink mt-8 p-4 bg-red-900/40 rounded-lg text-center max-w-md mx-auto">{error}</div>;
  }

  if (!contestant) {
    return <div className="text-center mt-8 text-slate-400">No contestant data found.</div>;
  }

  // ---- SETUP: Waiting screen ----
  if (gameState === 'SETUP' || gameState === 'ROUND_2_SETUP') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] px-4 animate-in fade-in zoom-in-95 duration-500">
        <Card className="w-full max-w-lg p-8 text-center flex flex-col items-center">
          <h1 className="text-3xl font-black font-outfit text-white mb-6 tracking-wide">Welcome, Agent {contestant.name}</h1>

          <Avatar emoji={contestant.avatar} size="lg" className="mb-8" />

          <div className="w-full pt-8 border-t border-white/10">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-mystery-cyan animate-pulse">
                {gameState === 'ROUND_2_SETUP' ? 'Round 2 Setup in Progress...' : 'Awaiting Host Configuration...'}
              </h2>
              <p className="text-slate-400">Stand by. The mission parameters are being finalized.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ---- GAMEPLAY ----
  const { round, phase, mode } = parseState();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-black font-outfit text-white">Prompt Jeopardy</h1>
          <p className="text-sm text-slate-500">Round {round} — Phase {phase}</p>
        </div>
        <div className="text-right flex items-center gap-3">
          <Avatar emoji={contestant.avatar} size="sm" />
          <div>
            <p className="text-mystery-cyan font-bold text-sm">{contestant.name}</p>
            <p className="text-xl font-black text-white">{contestant.score || 0} pts</p>
          </div>
        </div>
      </div>

      {/* Contestant Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {contestantList.map(c => (
          <div key={c.id} className={`flex items-center gap-2 p-3 rounded-xl border ${c.id === contestantId ? 'border-mystery-cyan/50 bg-mystery-cyan/5' : 'border-white/5 bg-slate-900/40'} ${c.id === gameData?.currentQuerentId ? 'ring-2 ring-mystery-cyan/50' : ''}`}>
            <Avatar emoji={c.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{c.name}</p>
              <p className="text-xs font-bold text-slate-400">{c.score || 0} pts</p>
            </div>
          </div>
        ))}
      </div>

      {/* QUESTIONING PHASE */}
      {mode === 'QUESTIONING' && (
        <Card className="p-6 border-mystery-cyan/30">
          {isMyTurn ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-outfit text-mystery-cyan">
                🎤 It's your turn to ask!
              </h2>
              <p className="text-slate-400 text-sm">
                Ask the LLM a question to try to figure out their secret persona and action.
              </p>
              {gameData?.questionStatus !== 'submitted' ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                    placeholder="Type your question here..."
                    className="flex-1 bg-slate-900 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-mystery-cyan focus:border-transparent"
                    disabled={isSubmittingQuestion}
                  />
                  <Button
                    variant="primary"
                    onClick={submitQuestion}
                    disabled={!questionInput.trim() || isSubmittingQuestion}
                    className="cursor-pointer"
                  >
                    {isSubmittingQuestion ? '...' : 'Ask'}
                  </Button>
                </div>
              ) : (
                <div className="bg-slate-900/60 p-4 rounded-lg border border-white/10">
                  <p className="text-slate-300 italic">"{gameData.currentQuestion}"</p>
                  <p className="text-mystery-cyan text-sm mt-2 animate-pulse">Waiting for the LLM to respond...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <h2 className="text-2xl font-bold font-outfit text-white">
                Waiting for {currentQuerentName}...
              </h2>
              <p className="text-slate-400">They are formulating a question for the LLM.</p>
              
              {gameData?.currentQuestion && (
                <div className="bg-slate-900/60 p-4 rounded-lg border border-white/10 mt-4 text-left relative overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      {gameData?.questionStatus === 'submitted' ? 'Question submitted — awaiting LLM response' : 'Live Broadcast from Agent'}
                    </p>
                    {gameData?.questionStatus === 'typing' && (
                      <span className="flex gap-1">
                        <span className="w-1 h-1 bg-mystery-cyan rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-mystery-cyan rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1 h-1 bg-mystery-cyan rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 italic">"{gameData.currentQuestion}"</p>
                  
                  {gameData?.questionStatus === 'typing' && (
                    <div className="absolute bottom-0 left-0 h-[2px] bg-mystery-cyan/30 animate-pulse w-full"></div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ANSWERING PHASE */}
      {mode === 'ANSWERING' && (
        <div className="space-y-6">
          {/* Question */}
          {gameData?.currentQuestion && (
            <Card className="p-4 border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Question from {currentQuerentName}</p>
              <p className="text-white italic">"{gameData.currentQuestion}"</p>
            </Card>
          )}

          {/* LLM Response (Synchronized Reveal) */}
          <Card className="p-6 border-mystery-pink/30 shadow-[0_0_15px_rgba(244,114,182,0.1)] relative overflow-hidden">
            <h4 className="text-sm font-medium text-mystery-pink uppercase tracking-widest mb-2 flex justify-between items-center">
              <span>LLM Response</span>
              {gameData?.readingStatus === 'reading' && (
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-mystery-pink animate-pulse"></span>
                  <span className="text-[10px] text-mystery-pink font-black animate-pulse uppercase tracking-[0.2em]">Receiving Intel...</span>
                </span>
              )}
            </h4>
            
            <p className="text-lg leading-relaxed min-h-[5rem]">
              {(gameData?.llmResponse || '').split(/\s+/).map((word, i) => {
                const isError = gameData?.llmResponse?.startsWith('[Error');
                const isVisible = isError || (gameData?.visibleWordIndex || 0) > i || gameData?.readingStatus === 'finished';
                const isCurrent = (gameData?.visibleWordIndex || 0) - 1 === i && gameData?.readingStatus === 'reading';
                
                return (
                  <span 
                    key={i} 
                    className={`transition-all duration-300 ${isVisible ? 'text-slate-200' : 'text-slate-200/5 blur-[2px]'} ${isCurrent ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`}
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </p>

            {/* Reading indicator footer */}
            {gameData?.readingStatus === 'reading' && (
              <div className="absolute bottom-0 left-0 h-[2px] bg-mystery-pink/30 animate-pulse w-full"></div>
            )}
          </Card>

          {/* Timer */}
          {timerSeconds !== null && (
            <div className="text-center">
              <div className={`text-5xl font-black font-mono inline-block ${timerSeconds <= 5 ? 'text-mystery-pink animate-pulse' : 'text-mystery-cyan'}`}>
                {timerSeconds}s
              </div>
              <p className="text-slate-500 text-sm mt-1">Time remaining to submit your guess</p>
            </div>
          )}

          {/* Guess Form */}
          {!hasSubmittedGuess && timerSeconds > 0 ? (
            <Card className="p-6 border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">What is the LLM's secret?</h4>

              {/* Persona Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium text-mystery-cyan mb-3">Select Persona:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(gameData?.personaPool || []).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPersona(p)}
                      className={`p-3 rounded-lg text-sm text-left transition-all cursor-pointer border ${selectedPersona === p ? 'bg-mystery-cyan/20 border-mystery-cyan text-mystery-cyan font-bold' : 'bg-slate-900/40 border-white/10 text-slate-300 hover:bg-white/5'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium text-mystery-pink mb-3">Select Action — The persona should try to:</p>
                <div className="flex flex-col gap-2">
                  {(gameData?.actionPool || []).map(a => (
                    <button
                      key={a}
                      onClick={() => setSelectedAction(a)}
                      className={`p-3 rounded-lg text-sm text-left transition-all cursor-pointer border ${selectedAction === a ? 'bg-mystery-pink/20 border-mystery-pink text-mystery-pink font-bold' : 'bg-slate-900/40 border-white/10 text-slate-300 hover:bg-white/5'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit / Abstain */}
              <div className="flex gap-4">
                <Button
                  variant="primary"
                  onClick={submitGuess}
                  disabled={!selectedPersona || !selectedAction}
                  className="flex-1 py-3 cursor-pointer"
                >
                  Submit Guess
                </Button>
                <Button
                  variant="outline"
                  onClick={submitAbstain}
                  className="py-3 cursor-pointer"
                >
                  Abstain
                </Button>
              </div>
            </Card>
          ) : hasSubmittedGuess ? (
            <Card className="p-6 border-green-500/30 text-center">
              <p className="text-green-400 font-bold text-lg">✓ Guess submitted!</p>
              <p className="text-slate-400 text-sm mt-1">Waiting for the timer to expire and results...</p>
            </Card>
          ) : null}
        </div>
      )}

      {/* RESULTS PHASE */}
      {mode === 'RESULTS' && gameData?.phaseResults && (
        <div className="space-y-6">
          {/* Show the Q&A for context */}
          {gameData?.currentQuestion && (
            <Card className="p-4 border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Question</p>
              <p className="text-white italic">"{gameData.currentQuestion}"</p>
            </Card>
          )}
          {gameData?.llmResponse && (
            <Card className="p-4 border-mystery-pink/20">
              <p className="text-xs text-mystery-pink uppercase tracking-widest mb-1">LLM Response</p>
              <p className="text-slate-200">{gameData.llmResponse}</p>
            </Card>
          )}

          {/* My result */}
          {(() => {
            const myResult = gameData.phaseResults[contestantId];
            if (!myResult) return null;

            const pointStr = myResult.pointChange > 0 ? `+${myResult.pointChange}`
              : myResult.pointChange < 0 ? `${myResult.pointChange}`
              : '(no point change)';

            return (
              <Card className={`p-6 text-center ${myResult.correct ? 'border-green-500/50 bg-green-900/20' : myResult.abstained ? 'border-white/10' : 'border-red-500/30 bg-red-900/10'}`}>
                <p className={`text-2xl font-black ${myResult.correct ? 'text-green-400' : myResult.abstained ? 'text-slate-400' : 'text-red-400'}`}>
                  {myResult.correct ? '🎉 Answered correctly!' : myResult.abstained ? 'Abstained' : 'Answered incorrectly'}
                </p>
                <p className={`text-3xl font-black font-mono mt-2 ${myResult.pointChange > 0 ? 'text-green-400' : myResult.pointChange < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {pointStr}
                </p>
                <p className="text-slate-400 text-sm mt-2">Your total: {contestant.score || 0} points</p>
              </Card>
            );
          })()}

          {/* All results */}
          <Card className="p-6 border-white/10">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-4">All Results</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contestantList.map(c => {
                const result = gameData.phaseResults[c.id];
                if (!result) return null;
                const pointStr = result.pointChange > 0 ? `+${result.pointChange}`
                  : result.pointChange < 0 ? `${result.pointChange}`
                  : '—';

                return (
                  <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border ${result.correct ? 'bg-green-900/30 border-green-500/50' : result.abstained ? 'bg-slate-900/40 border-white/10' : 'bg-red-900/20 border-red-500/30'}`}>
                    <Avatar emoji={c.avatar} size="sm" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-200 text-sm">{c.name}</span>
                      <span className={`ml-2 font-mono font-bold text-sm ${result.pointChange > 0 ? 'text-green-400' : result.pointChange < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {pointStr}
                      </span>
                    </div>
                    <span className="text-lg font-black text-white">{c.score || 0}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <p className="text-center text-slate-500 text-sm animate-pulse">Waiting for the host to advance...</p>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === 'GAME_OVER' && (
        <Card className="p-8 text-center">
          <h3 className="text-4xl font-black font-outfit text-white mb-6">🏆 Game Over!</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {contestantList
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((c, i) => (
                <div key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border ${i === 0 ? 'bg-yellow-900/30 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-slate-900/40 border-white/10'} ${c.id === contestantId ? 'ring-2 ring-mystery-cyan/50' : ''}`}>
                  <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</span>
                  <Avatar emoji={c.avatar} size="sm" />
                  <span className="font-medium text-slate-200 flex-1">{c.name}</span>
                  <span className="text-2xl font-black text-white">{c.score || 0}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
