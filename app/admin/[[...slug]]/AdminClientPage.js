'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, onValue, update, get } from 'firebase/database';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import GpsFixedIcon from '../../components/icons/GpsFixedIcon';
import GpsNotFixedIcon from '../../components/icons/GpsNotFixedIcon';
import Tooltip from '../../components/Tooltip';
import { askLLM } from '../../lib/gemini';
import { processPhaseResults } from '../../lib/scoring';
import { useSpeechEngine } from '../../hooks/useSpeechEngine';

// Default pools that can be customized by the admin
const PERSONA_POOL = {
  "Sports & entertainment": ["Michael Jordan", "Mike Tyson", "Hulk Hogan", "The Rock", "Taylor Swift"],
  "Historical": ["Leonardo da Vinci", "Abraham Lincoln", "Jane Goodall", "Helen Keller", "Amelia Earhart"],
  "Political": ["Bill Clinton", "George Bush"]
};

const ACTION_POOL = [
  "Espouse a political party that they are not very comfortable with.",
  "Quote Michael Jackson songs during natural conversation.",
  "Appear a lot less competitive than they really are.",
  "Appear a lot less intelligent than they really are.",
  "Appear a lot less eloquent than they really are."
];

const ANSWER_TIMER_SECONDS = 15;

export default function AdminPage() {
  const params = useParams();
  const urlGameId = params.slug ? params.slug[0] : null;

  const [gameId, setGameId] = useState(urlGameId);
  const [gameUrl, setGameUrl] = useState('');

  // Setup state
  const [personaCount, setPersonaCount] = useState(6);
  const [actionCount, setActionCount] = useState(5);
  const [selectedRoundPersonas, setSelectedRoundPersonas] = useState([]);
  const [selectedRoundActions, setSelectedRoundActions] = useState([...ACTION_POOL]);
  const [secretPersona, setSecretPersona] = useState('');
  const [secretAction, setSecretAction] = useState('');

  // Game state (synced from Firebase)
  const [gameData, setGameData] = useState(null);
  const [contestants, setContestants] = useState({});
  const [copied, setCopied] = useState(false);

  // Gameplay state (local)
  // Use a ref for the LLM call guard — React state updates are async, but Firebase
  // onValue can fire multiple times rapidly, so we need an immediate guard.
  const isCallingLLMRef = useRef(false);
  const [isCallingLLMDisplay, setIsCallingLLMDisplay] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(null);
  const timerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  const { speak, stopSpeaking } = useSpeechEngine(gameId || '');

  const gameState = gameData?.gameState || 'SETUP';
  const isSetup = gameState === 'SETUP';

  useEffect(() => {
    if (gameId) {
      setGameUrl(`${window.location.origin}/join/${gameId}`);
    }
  }, [gameId]);

  // Real-time listener for full game data
  useEffect(() => {
    if (!gameId) return;

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameData(data);
        setContestants(data.players || {});
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // --- LLM Call: Admin's browser detects a submitted question and calls Gemini ---
  useEffect(() => {
    if (!gameData || isCallingLLMRef.current) return;

    const state = gameData.gameState || '';
    const isQuestioningPhase = state.includes('QUESTIONING');
    const isSubmitted = gameData.questionStatus === 'submitted';
    const hasQuestion = gameData.currentQuestion && !gameData.llmResponse;

    if (isQuestioningPhase && isSubmitted && hasQuestion) {
      handleLLMCall(gameData.currentQuestion);
    }
  }, [gameData?.currentQuestion, gameData?.gameState, gameData?.questionStatus]);

  const handleLLMCall = async (question) => {
    // Immediate guard via ref — prevents duplicate calls from rapid Firebase updates
    if (isCallingLLMRef.current) return;
    isCallingLLMRef.current = true;
    setIsCallingLLMDisplay(true);

    try {
      const response = await askLLM(question, {
        secretPersona: gameData.secretPersona,
        secretAction: gameData.secretAction,
        personaPool: gameData.personaPool,
        actionPool: gameData.actionPool,
      });

      // Transition to ANSWERING state and store the LLM response
      const currentState = gameData.gameState;
      const answeringState = currentState.replace('QUESTIONING', 'ANSWERING');

      await update(ref(db, `games/${gameId}`), {
        llmResponse: response,
        gameState: answeringState,
        submissions: null, // Clear previous submissions
      });
    } catch (error) {
      console.error('LLM call failed:', error);
      // Write error to Firebase so UI can show it
      await update(ref(db, `games/${gameId}`), {
        llmResponse: `[Error calling LLM: ${error.message}. Please try again.]`,
        gameState: gameData.gameState.replace('QUESTIONING', 'ANSWERING'),
        readingStatus: 'finished', // Bypasses reading so error is visible
        visibleWordIndex: 0,
      });
    } finally {
      isCallingLLMRef.current = false;
      setIsCallingLLMDisplay(false);
    }
  };

  // --- Timer: Starts when we enter ANSWERING state ---
  useEffect(() => {
    const state = gameData?.gameState || '';
    // Timer only starts in ANSWERING phase IF reading is finished
    if (state.includes('ANSWERING') && gameData?.readingStatus === 'finished' && timerSeconds === null) {
      setTimerSeconds(ANSWER_TIMER_SECONDS);
    }
    // Reset timer when leaving ANSWERING state
    if (!state.includes('ANSWERING')) {
      setTimerSeconds(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameData?.gameState, gameData?.readingStatus]);

  useEffect(() => {
    if (timerSeconds === null) return;
    if (timerSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleTimerExpired();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerSeconds]);

  const handleTimerExpired = async () => {
    const state = gameData.gameState;
    const roundMatch = state.match(/ROUND_(\d+)_PHASE_(\d+)/);
    if (!roundMatch) return;

    const round = parseInt(roundMatch[1]);
    const phase = parseInt(roundMatch[2]);

    const { results, anyCorrect, updatedPlayers } = processPhaseResults({
      players: gameData.players || {},
      submissions: gameData.submissions || {},
      secretPersona: gameData.secretPersona,
      secretAction: gameData.secretAction,
      phase,
      round,
    });

    const resultsState = state.replace('ANSWERING', 'RESULTS');

    await update(ref(db, `games/${gameId}`), {
      gameState: resultsState,
      phaseResults: results,
      players: updatedPlayers,
    });
  };

  // --- Setup handlers (preserved from original) ---
  const handlePersonaCountChange = (e) => {
    const count = parseInt(e.target.value);
    setPersonaCount(count);
    if (selectedRoundPersonas.length > count) {
      const newSelections = selectedRoundPersonas.slice(0, count);
      setSelectedRoundPersonas(newSelections);
      if (secretPersona && !newSelections.includes(secretPersona)) setSecretPersona('');
    }
  };

  const handleActionCountChange = (e) => {
    const count = parseInt(e.target.value);
    setActionCount(count);
    if (selectedRoundActions.length > count) {
      const newSelections = selectedRoundActions.slice(0, count);
      setSelectedRoundActions(newSelections);
      if (secretAction && !newSelections.includes(secretAction)) setSecretAction('');
    }
  };

  const handlePersonaToggle = (p) => {
    setSelectedRoundPersonas(prev => {
      const isRemoving = prev.includes(p);
      if (isRemoving && secretPersona === p) setSecretPersona('');
      return isRemoving ? prev.filter(x => x !== p)
        : (prev.length < personaCount ? [...prev, p] : prev);
    });
  };

  const handleActionToggle = (a) => {
    setSelectedRoundActions(prev => {
      const isRemoving = prev.includes(a);
      if (isRemoving && secretAction === a) setSecretAction('');
      return isRemoving ? prev.filter(x => x !== a)
        : (prev.length < actionCount ? [...prev, a] : prev);
    });
  };

  const startRound = async () => {
    if (selectedRoundPersonas.length !== personaCount || selectedRoundActions.length !== actionCount) {
      alert("Please complete the pool selection process first.");
      return;
    }
    if (!secretPersona || !secretAction) {
      alert("You must designate a Secret Persona and a Secret Action using the target icons.");
      return;
    }

    const contestantIds = Object.keys(contestants);
    if (contestantIds.length < 2) {
      alert("You need at least 2 contestants to start a round.");
      return;
    }

    try {
      const gameRef = ref(db, `games/${gameId}`);
      await update(gameRef, {
        gameState: 'ROUND_1_PHASE_1_QUESTIONING',
        round: 1,
        phase: 1,
        personaPool: selectedRoundPersonas,
        actionPool: selectedRoundActions,
        secretPersona,
        secretAction,
        currentQuerentIndex: 0,
        currentQuerentId: contestantIds[0],
        currentQuestion: null,
        questionStatus: null,
        llmResponse: null,
        readingStatus: null,
        visibleWordIndex: 0,
        submissions: null,
        phaseResults: null,
      });
    } catch (error) {
      console.error("Error starting round:", error);
      alert("Failed to start round. See console for details.");
    }
  };

  const advanceToNextPhase = async () => {
    const state = gameData.gameState;
    const roundMatch = state.match(/ROUND_(\d+)_PHASE_(\d+)/);
    if (!roundMatch) return;

    const round = parseInt(roundMatch[1]);
    const nextPhase = parseInt(roundMatch[2]) + 1;
    const contestantIds = Object.keys(contestants);
    const nextQuerentIndex = (gameData.currentQuerentIndex + 1) % contestantIds.length;

    // Clear auto-advance timer
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    setAutoAdvanceSeconds(null);

    await update(ref(db, `games/${gameId}`), {
      gameState: `ROUND_${round}_PHASE_${nextPhase}_QUESTIONING`,
      phase: nextPhase,
      currentQuerentIndex: nextQuerentIndex,
      currentQuerentId: contestantIds[nextQuerentIndex],
      currentQuestion: null,
      questionStatus: null,
      llmResponse: null,
      readingStatus: null,
      visibleWordIndex: 0,
      submissions: null,
      phaseResults: null,
    });
  };

  const startRound2Setup = async () => {
    await update(ref(db, `games/${gameId}`), {
      gameState: 'ROUND_2_SETUP',
      round: 2,
      phase: null,
      currentQuestion: null,
      questionStatus: null,
      llmResponse: null,
      readingStatus: null,
      visibleWordIndex: 0,
      submissions: null,
      phaseResults: null,
    });
    // Reset local setup state for round 2
    setSelectedRoundPersonas([]);
    setSelectedRoundActions([...ACTION_POOL]);
    setSecretPersona('');
    setSecretAction('');
  };

  const startRound2 = async () => {
    if (selectedRoundPersonas.length !== personaCount || selectedRoundActions.length !== actionCount) {
      alert("Please complete the pool selection process first.");
      return;
    }
    if (!secretPersona || !secretAction) {
      alert("You must designate a Secret Persona and a Secret Action using the target icons.");
      return;
    }

    const contestantIds = Object.keys(contestants);

    await update(ref(db, `games/${gameId}`), {
      gameState: 'ROUND_2_PHASE_1_QUESTIONING',
      round: 2,
      phase: 1,
      personaPool: selectedRoundPersonas,
      actionPool: selectedRoundActions,
      secretPersona,
      secretAction,
      currentQuerentIndex: 0,
      currentQuerentId: contestantIds[0],
      currentQuestion: null,
      questionStatus: null,
      llmResponse: null,
      readingStatus: null,
      visibleWordIndex: 0,
      submissions: null,
      phaseResults: null,
    });

    // Reset abstain counts for new round
    const playerUpdates = {};
    for (const id of contestantIds) {
      playerUpdates[`players/${id}/abstainCount`] = 0;
    }
    await update(ref(db, `games/${gameId}`), playerUpdates);
  };

  const endGame = async () => {
    await update(ref(db, `games/${gameId}`), {
      gameState: 'GAME_OVER',
    });
  };

  // Auto-advance timer for "Start Next Phase"
  const startAutoAdvanceTimer = useCallback(() => {
    setAutoAdvanceSeconds(10);
    autoAdvanceRef.current = setInterval(() => {
      setAutoAdvanceSeconds(prev => {
        if (prev <= 1) {
          clearInterval(autoAdvanceRef.current);
          advanceToNextPhase();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gameData, contestants]);

  // Start auto-advance when entering RESULTS with no correct answers
  useEffect(() => {
    const state = gameData?.gameState || '';
    if (state.includes('RESULTS') && gameData?.phaseResults) {
      const anyCorrect = Object.values(gameData.phaseResults).some(r => r.correct);
      if (!anyCorrect && autoAdvanceSeconds === null) {
        startAutoAdvanceTimer();
      }
    }
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [gameData?.gameState]);

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  if (!gameId) {
    return <div className="text-center mt-20 text-white font-bold animate-pulse">Initializing Portal...</div>;
  }

  // ---- HELPER: Parse round/phase from gameState ----
  const parseState = () => {
    const match = (gameData?.gameState || '').match(/ROUND_(\d+)_PHASE_(\d+)_(\w+)/);
    if (!match) return { round: gameData?.round || 1, phase: gameData?.phase || 1, mode: '' };
    return { round: parseInt(match[1]), phase: parseInt(match[2]), mode: match[3] };
  };

  // ---- HELPER: Get contestant list with IDs ----
  const contestantEntries = Object.entries(contestants);
  const contestantList = contestantEntries.map(([id, data]) => ({ id, ...data }));

  // ---- HELPER: Get current querent name ----
  const currentQuerent = contestants[gameData?.currentQuerentId];
  const currentQuerentName = currentQuerent?.name || 'Unknown';

  // ---- HELPER: Count submissions ----
  const submissionCount = gameData?.submissions ? Object.keys(gameData.submissions).length : 0;

  // ========================
  //    SETUP MODE RENDER
  // ========================
  const renderSetupUI = () => (
    <Card className="p-8 border-mystery-cyan/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-black font-outfit text-white mb-2">
            {gameState === 'ROUND_2_SETUP' ? 'Round 2 Setup' : 'Round 1 Setup'}
          </h3>
          <p className="text-slate-400">Configure the parameters and select the Secret targets.</p>
        </div>

        {/* Persona Pool Section */}
        <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-bold text-mystery-cyan">Persona Pool</h3>
              <p className="text-sm text-slate-500">Host sets quantity (4-6) and populates the pool.</p>
            </div>

            <div className="max-w-[200px] w-full">
              <label className="text-sm font-medium text-slate-300 mb-1 flex justify-between">
                <span>Pool Quantity</span>
                <span className="text-mystery-cyan font-bold">{personaCount}</span>
              </label>
              <input
                type="range" min="4" max="6" step="1"
                value={personaCount} onChange={handlePersonaCountChange}
                className="w-full accent-mystery-cyan cursor-pointer"
                list="persona-ticks"
              />
              <datalist id="persona-ticks" className="flex justify-between text-xs text-slate-500 mt-1 uppercase px-1">
                <option value="4" label="4"></option>
                <option value="5" label="5"></option>
                <option value="6" label="6"></option>
              </datalist>
            </div>
          </div>

          <div className="mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${selectedRoundPersonas.length === personaCount ? 'bg-mystery-cyan/20 text-mystery-cyan border border-mystery-cyan/50' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
              {selectedRoundPersonas.length} / {personaCount} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PERSONA_POOL).map(([category, people]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-slate-300 font-semibold border-b border-white/10 pb-2">{category}</h4>
                <div className="flex flex-col gap-2">
                  {people.map(p => {
                    const isSelected = selectedRoundPersonas.includes(p);
                    const isSecret = secretPersona === p;
                    const isAllowed = isSelected || selectedRoundPersonas.length < personaCount;

                    return (
                      <div key={p} className={`flex items-center justify-between p-2 rounded-lg transition-all ${isSelected ? (isSecret ? 'bg-mystery-cyan/20 border border-mystery-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-mystery-cyan/5 border border-mystery-cyan/30') : 'hover:bg-white/5 border border-transparent'} ${!isAllowed ? 'opacity-40' : ''}`}>
                        <label className={`flex items-center gap-3 cursor-pointer flex-1 ${!isAllowed ? 'cursor-not-allowed' : ''}`}>
                          <input
                            type="checkbox"
                            className="accent-mystery-cyan w-4 h-4 cursor-pointer disabled:cursor-not-allowed shrink-0"
                            checked={isSelected}
                            onChange={() => handlePersonaToggle(p)}
                            disabled={!isAllowed}
                          />
                          <span className={`text-sm ${isSecret ? 'text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : (isSelected ? 'text-mystery-cyan font-medium' : 'text-slate-400')}`}>
                            {p}
                          </span>
                        </label>
                        {isSelected && (
                          <Tooltip text="Toggle secret persona" position="top">
                            <button
                              onClick={() => setSecretPersona(p)}
                              className={`ml-2 w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer`}
                            >
                              {isSecret ? <GpsFixedIcon className="w-6 h-6 text-mystery-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> : <GpsNotFixedIcon className="w-6 h-6 text-gray-500 hover:text-white" />}
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Pool Section */}
        <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-bold text-mystery-pink">Action Selection</h3>
              <p className="text-sm text-slate-500">Host sets quantity (3-5) and populates the pool.</p>
            </div>

            <div className="max-w-[200px] w-full">
              <label className="text-sm font-medium text-slate-300 mb-1 flex justify-between">
                <span>Pool Quantity</span>
                <span className="text-mystery-pink font-bold">{actionCount}</span>
              </label>
              <input
                type="range" min="3" max="5" step="1"
                value={actionCount} onChange={handleActionCountChange}
                className="w-full accent-mystery-pink cursor-pointer"
                list="action-ticks"
              />
              <datalist id="action-ticks" className="flex justify-between text-xs text-slate-500 mt-1 uppercase px-1">
                <option value="3" label="3"></option>
                <option value="4" label="4"></option>
                <option value="5" label="5"></option>
              </datalist>
            </div>
          </div>

          <div className="mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${selectedRoundActions.length === actionCount ? 'bg-mystery-pink/20 text-mystery-pink border border-mystery-pink/50' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
              {selectedRoundActions.length} / {actionCount} Selected
            </span>
          </div>

          <p className="text-sm text-slate-300 font-medium mb-3 mt-4">The persona should try to:</p>
          <div className="flex flex-col gap-3">
            {ACTION_POOL.map(a => {
              const isSelected = selectedRoundActions.includes(a);
              const isSecret = secretAction === a;
              const isAllowed = isSelected || selectedRoundActions.length < actionCount;

              return (
                <div key={a} className={`flex items-start justify-between p-3 rounded-lg transition-all ${isSelected ? (isSecret ? 'bg-mystery-pink/20 border border-mystery-pink shadow-[0_0_15px_rgba(244,114,182,0.3)]' : 'bg-mystery-pink/5 border border-mystery-pink/30') : 'hover:bg-white/5 border border-transparent'} ${!isAllowed ? 'opacity-40' : ''}`}>
                  <label className={`flex items-start gap-3 cursor-pointer flex-1 ${!isAllowed ? 'cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="accent-mystery-pink w-4 h-4 mt-1 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      checked={isSelected}
                      onChange={() => handleActionToggle(a)}
                      disabled={!isAllowed}
                    />
                    <span className={`text-sm ${isSecret ? 'text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : (isSelected ? 'text-mystery-pink font-medium' : 'text-slate-400')}`}>
                      {a}
                    </span>
                  </label>
                  {isSelected && (
                    <Tooltip text="Toggle secret action" position="left">
                      <button
                        onClick={() => setSecretAction(a)}
                        className={`ml-3 mt-0.5 w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer`}
                      >
                        {isSecret ? <GpsFixedIcon className="w-6 h-6 text-mystery-pink drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" /> : <GpsNotFixedIcon className="w-6 h-6 text-gray-500 hover:text-white" />}
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex justify-end">
          <Button
            variant="primary"
            onClick={gameState === 'ROUND_2_SETUP' ? startRound2 : startRound}
            className="w-full md:w-auto min-w-[250px] text-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
            disabled={selectedRoundPersonas.length !== personaCount || selectedRoundActions.length !== actionCount || !secretPersona || !secretAction}
          >
            <span>{gameState === 'ROUND_2_SETUP' ? 'Start Round 2' : 'Start Round 1'}</span>
            <span>🚀</span>
          </Button>
        </div>
      </div>
    </Card>
  );

  // ========================
  //   GAMEPLAY MODE RENDER
  // ========================
  const renderGameplayUI = () => {
    const { round, phase, mode } = parseState();
    const anyCorrect = gameData?.phaseResults
      ? Object.values(gameData.phaseResults).some(r => r.correct)
      : false;

    return (
      <div className="space-y-6">
        {/* Round/Phase Header */}
        <Card className="p-6 border-mystery-cyan/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-3xl font-black font-outfit text-white">
                Round {round} — Phase {phase}
              </h3>
              <p className="text-slate-400 mt-1">
                {mode === 'QUESTIONING' && `Waiting for ${currentQuerentName} to ask a question...`}
                {mode === 'ANSWERING' && 'Answer period — contestants are guessing!'}
                {mode === 'RESULTS' && 'Phase results'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {mode === 'ANSWERING' && timerSeconds !== null && (
                <div className={`text-4xl font-black font-mono ${timerSeconds <= 5 ? 'text-mystery-pink animate-pulse' : 'text-mystery-cyan'}`}>
                  {timerSeconds}s
                </div>
              )}
              {isCallingLLMDisplay && (
                <span className="px-4 py-1.5 rounded-full bg-mystery-cyan/20 border border-mystery-cyan/50 text-mystery-cyan text-sm font-medium animate-pulse">
                  Calling LLM...
                </span>
              )}
            </div>
          </div>

          {/* Secret info (admin eyes only) */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs">
            <span className="px-2 py-1 rounded bg-mystery-cyan/10 text-mystery-cyan border border-mystery-cyan/30">
              🎭 Secret: {gameData?.secretPersona}
            </span>
            <span className="px-2 py-1 rounded bg-mystery-pink/10 text-mystery-pink border border-mystery-pink/30">
              🎯 Secret: {gameData?.secretAction}
            </span>
          </div>
        </Card>

        {/* Question & LLM Response */}
        {gameData?.currentQuestion && (
          <Card className={`p-6 border-white/10 relative overflow-hidden transition-all duration-500 ${gameData?.questionStatus === 'typing' ? 'border-mystery-cyan/30' : ''}`}>
            {gameData?.questionStatus === 'typing' && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-mystery-cyan/20 text-mystery-cyan text-[10px] font-black uppercase tracking-widest rounded-bl-lg animate-pulse border-l border-b border-mystery-cyan/30">
                Live Broadcast
              </div>
            )}
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-2">
              Question from {currentQuerentName}
            </h4>
            <p className="text-lg text-white font-medium italic">
              "{gameData.currentQuestion}"
            </p>
            {gameData?.questionStatus === 'typing' && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-mystery-cyan rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-mystery-cyan rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-mystery-cyan rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium italic">Agent is typing...</span>
              </div>
            )}
          </Card>
        )}

        {gameData?.llmResponse && (
          <Card className="p-6 border-mystery-pink/30 shadow-[0_0_15px_rgba(244,114,182,0.1)]">
            <h4 className="text-sm font-medium text-mystery-pink uppercase tracking-widest mb-2">
              LLM Response
            </h4>
            
            {/* Word reveal area */}
            <p className="text-lg leading-relaxed mb-4 min-h-[4rem]">
              {(gameData.llmResponse || '').split(/\s+/).map((word, i) => {
                const isError = gameData.llmResponse.startsWith('[Error');
                const isVisible = isError || (gameData.visibleWordIndex || 0) > i || gameData.readingStatus === 'finished';
                return (
                  <span 
                    key={i} 
                    className={`transition-all duration-300 ${isVisible ? 'text-slate-200' : 'text-slate-200/5 blur-[2px]'}`}
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              {/* Play / Reading Status */}
              {!gameData.readingStatus || gameData.readingStatus === 'waiting' ? (
                <Button
                  variant="primary"
                  onClick={() => speak(gameData.llmResponse)}
                  className="text-sm py-2 px-6 shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
                >
                  🔊 Read & Reveal
                </Button>
              ) : gameData.readingStatus === 'reading' ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mystery-pink/10 border border-mystery-pink/30 text-mystery-pink animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-mystery-pink"></span>
                  <span className="text-sm font-bold uppercase tracking-widest">Speaking...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400">
                  <span className="text-sm font-bold uppercase tracking-widest">✓ Reading Complete</span>
                </div>
              )}

              {/* Error Retry Fallback (Existing) */}
              {gameData.llmResponse.includes('[Error') && (
                <Button
                  variant="outline"
                  className="text-xs font-bold border-mystery-pink/50 text-mystery-pink hover:bg-mystery-pink/10 cursor-pointer"
                  onClick={() => handleLLMCall(gameData.currentQuestion)}
                  disabled={isCallingLLMDisplay}
                >
                  Retry AI Response ↺
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Submission Tracker (during ANSWERING) */}
        {mode === 'ANSWERING' && (
          <Card className="p-6 border-white/10">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-4">
              Contestant Submissions ({submissionCount} / {contestantList.length})
            </h4>
            <div className="flex flex-wrap gap-3">
              {contestantList.map(c => {
                const hasSubmitted = gameData?.submissions?.[c.id];
                return (
                  <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${hasSubmitted ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-slate-900/40 border-white/10 text-slate-500'}`}>
                    <Avatar emoji={c.avatar} size="sm" />
                    <span className="text-sm font-medium">{c.name}</span>
                    {hasSubmitted && <span className="text-green-400">✓</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Phase Results */}
        {mode === 'RESULTS' && gameData?.phaseResults && (
          <Card className="p-6 border-white/10">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-4">
              Phase {phase} Results
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contestantList.map(c => {
                const result = gameData.phaseResults[c.id];
                if (!result) return null;

                const pointStr = result.pointChange > 0 ? `+${result.pointChange}`
                  : result.pointChange < 0 ? `${result.pointChange}`
                  : '(no point change)';

                return (
                  <div key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border ${result.correct ? 'bg-green-900/30 border-green-500/50' : result.abstained ? 'bg-slate-900/40 border-white/10' : 'bg-red-900/20 border-red-500/30'}`}>
                    <Avatar emoji={c.avatar} size="sm" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-200">{c.name}</span>
                      <div className="text-sm mt-0.5">
                        <span className={result.correct ? 'text-green-400 font-bold' : result.abstained ? 'text-slate-500' : 'text-red-400'}>
                          {result.correct ? 'Answered correctly!' : result.abstained ? 'Abstained' : 'Answered incorrectly'}
                        </span>
                        <span className={`ml-2 font-mono font-bold ${result.pointChange > 0 ? 'text-green-400' : result.pointChange < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {pointStr}
                        </span>
                      </div>
                    </div>
                    <span className="text-xl font-black text-white">{c.score}</span>
                  </div>
                );
              })}
            </div>

            {/* Flow control */}
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-end gap-4">
              {anyCorrect && gameData.round === 1 && (
                <Button variant="primary" onClick={startRound2Setup} className="text-lg py-3 px-8 cursor-pointer">
                  Start Round 2 Setup →
                </Button>
              )}
              {anyCorrect && gameData.round === 2 && (
                <Button variant="primary" onClick={endGame} className="text-lg py-3 px-8 cursor-pointer">
                  Show Final Results 🏆
                </Button>
              )}
              {!anyCorrect && (
                <Button variant="outline" onClick={advanceToNextPhase} className="text-lg py-3 px-8 cursor-pointer relative overflow-hidden">
                  {autoAdvanceSeconds !== null && (
                    <div
                      className="absolute inset-0 bg-mystery-cyan/20 transition-all duration-1000 ease-linear"
                      style={{ width: `${((10 - autoAdvanceSeconds) / 10) * 100}%` }}
                    />
                  )}
                  <span className="relative z-10">
                    Start Next Phase {autoAdvanceSeconds !== null ? `(${autoAdvanceSeconds}s)` : ''}
                  </span>
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* GAME OVER */}
        {gameState === 'GAME_OVER' && (
          <Card className="p-8 border-mystery-cyan/30 text-center">
            <h3 className="text-4xl font-black font-outfit text-white mb-6">🏆 Game Over!</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contestantList
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border ${i === 0 ? 'bg-yellow-900/30 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-slate-900/40 border-white/10'}`}>
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
  };

  // ========================
  //      SIDEBAR RENDER
  // ========================
  const renderSidebar = () => (
    <div className="w-full lg:w-1/3 xl:w-1/4 space-y-8 lg:sticky lg:top-8">
      <div className="space-y-4 px-2 pt-2">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Game ID</p>
            <p className="font-mono text-sm text-slate-400 tracking-wider">{gameId}</p>
          </div>
          <div>
            <Button
              variant={copied ? "primary" : "outline"}
              onClick={copyJoinLink}
              className={`w-full text-sm py-3 transition-all flex justify-center items-center gap-2 cursor-pointer ${copied ? 'bg-green-500 hover:bg-green-400 text-white border-green-500' : ''}`}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : 'Copy Shareable Join URL'}
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-6 border-white/10 shadow-lg">
        <h2 className="text-xl font-bold text-slate-100 mb-4 border-b border-white/10 pb-4">
          Connected Agents ({contestantList.length})
        </h2>
        {contestantList.length === 0 ? (
          <p className="text-slate-500 italic py-4 text-center">Awaiting incoming connections...</p>
        ) : (
          <ul className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
            {contestantList.map(c => (
              <li key={c.id} className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-white/5 shadow-sm">
                <Avatar emoji={c.avatar} size="sm" />
                <span className="font-medium text-slate-200 truncate flex-1">{c.name}</span>
                {!isSetup && <span className="text-sm font-bold text-mystery-cyan">{c.score || 0}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );

  // ========================
  //       MAIN RENDER
  // ========================
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-4xl font-black font-outfit text-white">Mission Control</h1>
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium tracking-wide ${isSetup ? 'bg-mystery-cyan/20 border border-mystery-cyan/50 text-mystery-cyan' : 'bg-green-500/20 border border-green-500/50 text-green-400'}`}>
          {isSetup ? 'SESSION ACTIVE' : gameState === 'GAME_OVER' ? 'GAME COMPLETE' : `ROUND ${gameData?.round || 1} IN PROGRESS`}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {renderSidebar()}

        {/* Main Content Area */}
        <div className="w-full lg:w-2/3 xl:w-3/4">
          {(isSetup || gameState === 'ROUND_2_SETUP') ? renderSetupUI() : renderGameplayUI()}
        </div>
      </div>
    </div>
  );
}
