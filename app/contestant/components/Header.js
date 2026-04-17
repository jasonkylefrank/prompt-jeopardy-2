'use client';

import Avatar from '../../components/Avatar';

export default function Header({
  round,
  phase,
  contestant,
  contestantList,
  contestantId,
  gameData
}) {
  return (
    <>
      {/* Top Banner */}
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

      {/* Scoreboard Cards */}
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
    </>
  );
}
