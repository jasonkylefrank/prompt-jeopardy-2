'use client';

import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

export default function GameOver({ contestantList }) {
  return (
    <Card className="p-8 border-mystery-cyan/30 text-center shadow-[0_0_50px_rgba(34,211,238,0.1)]">
      <h3 className="text-4xl font-black font-outfit text-white mb-6 tracking-widest uppercase">
        🏆 Mission Complete
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contestantList
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .map((c, i) => (
            <div 
              key={c.id} 
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-500 ${i === 0 ? 'bg-yellow-900/30 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-105' : 'bg-slate-900/40 border-white/10 opacity-80'}`}
            >
              <span className="text-2xl w-8 h-8 flex items-center justify-center bg-white/5 rounded-full select-none">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <Avatar emoji={c.avatar} size="sm" />
              <span className="font-bold text-slate-200 flex-1 text-left">{c.name}</span>
              <span className="text-2xl font-black text-white">{c.score || 0}</span>
            </div>
          ))}
      </div>
    </Card>
  );
}
