'use client';

import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

export default function GameOver({
  contestantList,
  contestantId
}) {
  return (
    <div className="max-w-xl mx-auto py-10 px-4 animate-in fade-in zoom-in-95 duration-1000">
      <Card className="p-10 border-mystery-cyan/40 text-center shadow-[0_0_60px_rgba(34,211,238,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mystery-cyan to-transparent"></div>
        
        <h1 className="text-4xl font-black font-outfit text-white mb-2 tracking-widest uppercase">
          🏆 Final Ranking
        </h1>
        <p className="text-slate-500 mb-10 text-sm tracking-[0.3em] uppercase">Operations Concluded</p>
        
        <div className="space-y-4">
          {contestantList
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((c, i) => {
              const isMe = c.id === contestantId;
              const isWinner = i === 0;
              
              return (
                <div 
                  key={c.id} 
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all duration-700 ${isWinner ? 'bg-yellow-900/20 border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.2)] scale-105 z-10' : 'bg-slate-900/60 border-white/5 opacity-80'}`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-lg ${isWinner ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                    {i + 1}
                  </div>
                  <Avatar emoji={c.avatar} size="sm" />
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${isMe ? 'text-mystery-cyan' : 'text-slate-200'}`}>
                      {c.name} {isMe && <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded border border-mystery-cyan/30">YOU</span>}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Field Agent</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${isWinner ? 'text-yellow-500' : 'text-white'}`}>
                      {c.score || 0}
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase">Points</p>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-slate-400 italic text-sm">Thank you for playing Prompt Jeopardy.</p>
        </div>
      </Card>
    </div>
  );
}
