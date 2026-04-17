'use client';

import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Answering({
  gameData,
  currentQuerentName,
  timerSeconds,
  hasSubmittedGuess,
  selectedPersona,
  setSelectedPersona,
  selectedAction,
  setSelectedAction,
  submitGuess,
  submitAbstain
}) {
  return (
    <div className="space-y-6">
      {/* Context: The Question */}
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
  );
}
