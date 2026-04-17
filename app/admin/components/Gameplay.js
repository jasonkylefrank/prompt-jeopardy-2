'use client';

import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';

export default function Gameplay({
  round,
  phase,
  mode,
  gameData,
  currentQuerentName,
  timerSeconds,
  isCallingLLMDisplay,
  submissionCount,
  contestantList,
  speak,
  handleLLMCall
}) {
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

            {/* Error Retry Fallback */}
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
    </div>
  );
}
