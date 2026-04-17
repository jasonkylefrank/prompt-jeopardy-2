'use client';

import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';

export default function Results({
  phase,
  gameData,
  contestantList,
  anyCorrect,
  autoAdvanceSeconds,
  startRound2Setup,
  endGame,
  advanceToNextPhase
}) {
  return (
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
  );
}
