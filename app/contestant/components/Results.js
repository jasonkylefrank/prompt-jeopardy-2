'use client';

import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

export default function Results({
  gameData,
  contestantId,
  contestantList
}) {
  const myResult = gameData?.phaseResults[contestantId];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
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

      {/* Your Result */}
      {myResult && (
        <Card className={`p-8 text-center border-t-4 ${myResult.correct ? 'border-t-green-500 bg-green-900/20' : myResult.abstained ? 'border-t-slate-500 bg-slate-900/40' : 'border-t-red-500 bg-red-900/20'}`}>
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${myResult.correct ? 'bg-green-500 animate-bounce' : myResult.abstained ? 'bg-slate-600' : 'bg-red-500'}`}>
              {myResult.correct ? '✨' : myResult.abstained ? '⏸' : '❌'}
            </div>
          </div>
          <h2 className={`text-3xl font-black font-outfit mb-2 ${myResult.correct ? 'text-green-400' : myResult.abstained ? 'text-slate-400' : 'text-red-400'}`}>
            {myResult.correct ? 'Target identified!' : myResult.abstained ? 'Neutral Stance' : 'Mission Failed'}
          </h2>
          <p className="text-slate-400 mb-6">
            {myResult.correct ? 'You correctly deducing the identity and action.' : myResult.abstained ? 'You chose not to compromise your position.' : 'The agent slipped past your detection.'}
          </p>
          <div className="inline-block px-6 py-2 rounded-full bg-black/40 border border-white/10">
            <span className="text-sm uppercase tracking-widest text-slate-500 mr-2">Payoff:</span>
            <span className={`text-xl font-black ${myResult.pointChange > 0 ? 'text-green-400' : myResult.pointChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {myResult.pointChange > 0 ? `+${myResult.pointChange}` : myResult.pointChange} pts
            </span>
          </div>
        </Card>
      )}

      {/* Group Summary */}
      <Card className="p-6 border-white/10">
        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-4">Field Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contestantList.map(c => {
            const res = gameData.phaseResults[c.id];
            if (!res) return null;
            return (
              <div key={c.id} className={`flex items-center gap-2 p-3 rounded-lg border ${res.correct ? 'bg-green-900/20 border-green-500/30' : 'bg-slate-900/40 border-white/5'}`}>
                <Avatar emoji={c.avatar} size="xs" />
                <span className="text-sm flex-1 text-slate-300 font-medium">{c.name}</span>
                <span className={`text-xs font-bold ${res.correct ? 'text-green-400' : 'text-slate-500'}`}>
                  {res.correct ? 'SYNCED' : 'FAILED'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
