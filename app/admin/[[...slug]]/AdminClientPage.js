'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, onValue, update } from 'firebase/database';

// Local Components
import Setup from '../components/Setup';
import Gameplay from '../components/Gameplay';
import Results from '../components/Results';
import Sidebar from '../components/Sidebar';
import GameOver from '../components/GameOver';

import { askLLM } from '../../lib/gemini';
import { processPhaseResults } from '../../lib/scoring';
import { useSpeechEngine } from '../../hooks/useSpeechEngine';

// Default pools
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
  const gameId = params.slug ? params.slug[0] : null;
  const gameUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${gameId}` : '';

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
  const isCallingLLMRef = useRef(false);
  const [isCallingLLMDisplay, setIsCallingLLMDisplay] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(null);
  const timerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  const { speak } = useSpeechEngine(gameId || '');
  const gameState = gameData?.gameState || 'SETUP';

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

  // --- LLM Call Logic ---
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

      const currentState = gameData.gameState;
      const answeringState = currentState.replace('QUESTIONING', 'ANSWERING');

      await update(ref(db, `games/${gameId}`), {
        llmResponse: response,
        gameState: answeringState,
        readingStatus: 'waiting',
        visibleWordIndex: 0,
        submissions: null,
      });
    } catch (error) {
      console.error('LLM call failed:', error);
      await update(ref(db, `games/${gameId}`), {
        llmResponse: `[Error calling LLM: ${error.message}. Please try again.]`,
        gameState: gameData.gameState.replace('QUESTIONING', 'ANSWERING'),
        readingStatus: 'finished',
        visibleWordIndex: 0,
      });
    } finally {
      isCallingLLMRef.current = false;
      setIsCallingLLMDisplay(false);
    }
  };

  // --- Timer Logic ---
  useEffect(() => {
    const state = gameData?.gameState || '';
    if (state.includes('ANSWERING') && gameData?.readingStatus === 'finished' && timerSeconds === null) {
      setTimerSeconds(ANSWER_TIMER_SECONDS);
    }
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

    const { results, updatedPlayers } = processPhaseResults({
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

  // --- Setup Handlers ---
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
      return isRemoving ? prev.filter(x => x !== p) : (prev.length < personaCount ? [...prev, p] : prev);
    });
  };

  const handleActionToggle = (a) => {
    setSelectedRoundActions(prev => {
      const isRemoving = prev.includes(a);
      if (isRemoving && secretAction === a) setSecretAction('');
      return isRemoving ? prev.filter(x => x !== a) : (prev.length < actionCount ? [...prev, a] : prev);
    });
  };

  const startRound = async () => {
    const contestantIds = Object.keys(contestants);
    if (contestantIds.length < 2) {
      alert("You need at least 2 contestants to start a round.");
      return;
    }

    try {
      await update(ref(db, `games/${gameId}`), {
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
    setSelectedRoundPersonas([]);
    setSelectedRoundActions([...ACTION_POOL]);
    setSecretPersona('');
    setSecretAction('');
  };

  const startRound2 = async () => {
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

  // --- Helpers ---
  const parseState = () => {
    const match = (gameData?.gameState || '').match(/ROUND_(\d+)_PHASE_(\d+)_(\w+)/);
    if (!match) return { round: gameData?.round || 1, phase: gameData?.phase || 1, mode: '' };
    return { round: parseInt(match[1]), phase: parseInt(match[2]), mode: match[3] };
  };

  const contestantList = Object.entries(contestants).map(([id, data]) => ({ id, ...data }));
  const currentQuerent = contestants[gameData?.currentQuerentId];
  const currentQuerentName = currentQuerent?.name || 'Unknown';
  const submissionCount = gameData?.submissions ? Object.keys(gameData.submissions).length : 0;

  if (!gameId) {
    return <div className="text-center mt-20 text-white font-bold animate-pulse font-outfit uppercase tracking-widest">Initializing Admin Portal...</div>;
  }

  const { round, phase, mode } = parseState();
  const isSetup = gameState === 'SETUP' || gameState === 'ROUND_2_SETUP';

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8 px-4 font-inter text-slate-200">
      {/* Sidebar - Persistent */}
      {/* Sidebar - Persistent */}
      <Sidebar 
        gameId={gameId} 
        gameUrl={gameUrl} 
        copyJoinLink={copyJoinLink} 
        copied={copied} 
        contestantList={contestantList}
        isSetup={isSetup}
      />

      {/* Main Command Area */}
      <main className="flex-1 space-y-8 animate-in fade-in duration-500">
        {isSetup ? (
          <Setup
            gameState={gameState}
            personaCount={personaCount}
            actionCount={actionCount}
            handlePersonaCountChange={handlePersonaCountChange}
            handleActionCountChange={handleActionCountChange}
            selectedRoundPersonas={selectedRoundPersonas}
            selectedRoundActions={selectedRoundActions}
            handlePersonaToggle={handlePersonaToggle}
            handleActionToggle={handleActionToggle}
            secretPersona={secretPersona}
            secretAction={secretAction}
            setSecretPersona={setSecretPersona}
            setSecretAction={setSecretAction}
            startRound={startRound}
            startRound2={startRound2}
            PERSONA_POOL={PERSONA_POOL}
            ACTION_POOL={ACTION_POOL}
          />
        ) : mode === 'RESULTS' ? (
          <Results
            phase={phase}
            gameData={gameData}
            contestantList={contestantList}
            anyCorrect={Object.values(gameData?.phaseResults || {}).some(r => r.correct)}
            autoAdvanceSeconds={autoAdvanceSeconds}
            startRound2Setup={startRound2Setup}
            endGame={endGame}
            advanceToNextPhase={advanceToNextPhase}
          />
        ) : gameState === 'GAME_OVER' ? (
          <GameOver contestantList={contestantList} />
        ) : (
          <Gameplay
            round={round}
            phase={phase}
            mode={mode}
            gameData={gameData}
            currentQuerentName={currentQuerentName}
            timerSeconds={timerSeconds}
            isCallingLLMDisplay={isCallingLLMDisplay}
            submissionCount={submissionCount}
            contestantList={contestantList}
            speak={speak}
            handleLLMCall={handleLLMCall}
          />
        )}
      </main>
    </div>
  );
}
