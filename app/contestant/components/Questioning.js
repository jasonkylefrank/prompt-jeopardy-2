'use client';

import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Questioning({
  isMyTurn,
  currentQuerentName,
  questionInput,
  setQuestionInput,
  submitQuestion,
  isSubmittingQuestion,
  gameData
}) {
  return (
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
  );
}
