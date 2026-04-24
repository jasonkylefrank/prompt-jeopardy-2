'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { useAuth } from '../../components/AuthProvider';

// Local Components
import Header from '../components/Header';
import Questioning from '../components/Questioning';
import Answering from '../components/Answering';
import Results from '../components/Results';
import Setup from '../components/Setup';
import GameOver from '../components/GameOver';

const ANSWER_TIMER_SECONDS = 15;

export default function ContestantPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-[60vh] text-xl animate-pulse text-mystery-cyan font-black tracking-widest uppercase font-outfit">Initialing Clearing...</div>}>
      <ContestantContent />
    </Suspense>
  );
}

function ContestantContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contestantId = params.slug ? params.slug[0] : null;
  const gameId = searchParams.get('game');
  const { user } = useAuth();
  
  const [gameData, setGameData] = useState(null);
  const [contestants, setContestants] = useState({});
  const [questionInput, setQuestionInput] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [hasSubmittedGuess, setHasSubmittedGuess] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const timerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  useEffect(() => {
    // No longer using localStorage for ID tracking; auth.uid is the source of truth
  }, []);

  useEffect(() => {
    if (!gameId || !contestantId) return;

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameData(data);
        setContestants(data.players || {});
        setIsLoading(false);
      } else {
        setError("Mission data not found for this ID.");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [gameId, contestantId]);

  // Reset local state on phase change
  useEffect(() => {
    const state = gameData?.gameState || '';
    if (state.includes('QUESTIONING')) {
      setQuestionInput('');
      setSelectedPersona('');
      setSelectedAction('');
      setHasSubmittedGuess(false);
    }
  }, [gameData?.gameState]);

  // Logic: Live Broadcast of typing
  useEffect(() => {
    if (!gameId || !contestantId || gameData?.currentQuerentId !== contestantId) return;
    if (gameData?.questionStatus === 'submitted') return;

    const timer = setTimeout(async () => {
      await update(ref(db, `games/${gameId}`), {
        currentQuestion: questionInput,
        questionStatus: questionInput.trim() ? 'typing' : null,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [questionInput, gameId, contestantId, gameData?.currentQuerentId]);

  // Timer: Starts when we enter ANSWERING state AND reading is finished
  useEffect(() => {
    const gameState = gameData?.gameState || '';
    if (gameState.includes('ANSWERING') && gameData?.readingStatus === 'finished' && timerSeconds === null) {
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
  }, [gameData?.gameState, gameData?.readingStatus, gameData?.timerStartTime]);

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

  const submitQuestion = async () => {
    if (!questionInput.trim() || isSubmittingQuestion) return;
    setIsSubmittingQuestion(true);
    try {
      await update(ref(db, `games/${gameId}`), {
        currentQuestion: questionInput.trim(),
        questionStatus: 'submitted',
      });
    } catch (err) {
      console.error("Error submitting question:", err);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const submitGuess = async () => {
    if (!selectedPersona || !selectedAction) return;
    try {
      await update(ref(db, `games/${gameId}/submissions/${contestantId}`), {
        selectedPersona,
        selectedAction,
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

  // --- Helpers ---
  const parseState = () => {
    const match = (gameData?.gameState || '').match(/ROUND_(\d+)_PHASE_(\d+)_(\w+)/);
    if (!match) return { round: gameData?.round || 1, phase: gameData?.phase || 1, mode: '' };
    return { round: parseInt(match[1]), phase: parseInt(match[2]), mode: match[3] };
  };

  const contestant = contestants[contestantId];
  const contestantList = Object.entries(contestants).map(([id, data]) => ({ id, ...data }));
  const currentQuerent = contestants[gameData?.currentQuerentId];
  const currentQuerentName = currentQuerent?.name || 'Unknown';
  const isMyTurn = gameData?.currentQuerentId === contestantId;
  const gameState = gameData?.gameState || '';
  const isAuthorized = user?.uid === contestantId;

  if (isLoading) return <div className="flex justify-center items-center h-[60vh] text-xl animate-pulse text-mystery-cyan font-black tracking-widest uppercase font-outfit">Loading Portal...</div>;
  if (error) return <div className="text-mystery-pink mt-8 p-4 bg-red-900/40 border border-mystery-pink/30 rounded-lg text-center max-w-md mx-auto">{error}</div>;
  if (!contestant) return <div className="text-center mt-8 text-slate-400">Agent record not found. Please re-brief.</div>;

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 border-2 border-dashed border-red-500/20 rounded-3xl text-center bg-red-900/5">
        <h2 className="text-2xl font-black text-red-400 uppercase tracking-widest mb-4">Unauthorized Access</h2>
        <p className="text-slate-400 italic">You are attempting to access another agent's secure portal. Interception is prohibited.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full border border-red-500/20 transition-all font-bold">Return to Base</button>
      </div>
    );
  }

  // SETUP MODE
  if (gameState === 'SETUP' || gameState === 'ROUND_2_SETUP') {
    return <Setup gameState={gameState} contestant={contestant} />;
  }

  // GAME OVER
  if (gameState === 'GAME_OVER') {
    return <GameOver contestantList={contestantList} contestantId={contestantId} />;
  }

  const { round, phase, mode } = parseState();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 animate-in fade-in duration-500 font-inter text-slate-200">
      <Header
        round={round}
        phase={phase}
        contestant={contestant}
        contestantList={contestantList}
        contestantId={contestantId}
        gameData={gameData}
      />

      {mode === 'QUESTIONING' && (
        <Questioning
          isMyTurn={isMyTurn}
          currentQuerentName={currentQuerentName}
          questionInput={questionInput}
          setQuestionInput={setQuestionInput}
          submitQuestion={submitQuestion}
          isSubmittingQuestion={isSubmittingQuestion}
          gameData={gameData}
        />
      )}

      {mode === 'ANSWERING' && (
        <Answering
          gameData={gameData}
          currentQuerentName={currentQuerentName}
          timerSeconds={timerSeconds}
          hasSubmittedGuess={hasSubmittedGuess}
          selectedPersona={selectedPersona}
          setSelectedPersona={setSelectedPersona}
          selectedAction={selectedAction}
          setSelectedAction={setSelectedAction}
          submitGuess={submitGuess}
          submitAbstain={submitAbstain}
        />
      )}

      {mode === 'RESULTS' && (
        <Results
          gameData={gameData}
          contestantId={contestantId}
          contestantList={contestantList}
        />
      )}
    </div>
  );
}
