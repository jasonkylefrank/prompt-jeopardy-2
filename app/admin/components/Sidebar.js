'use client';

import Button from '../../components/Button';
import Avatar from '../../components/Avatar';

export default function Sidebar({
  gameId,
  gameUrl,
  copyJoinLink,
  copied,
  contestantList,
  isSetup
}) {
  return (
    <div className="w-full lg:w-1/3 xl:w-1/4 space-y-8 lg:sticky lg:top-8">
      <div className="space-y-4 px-2 pt-2">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Game ID</p>
            <p className="font-mono text-sm text-slate-400 tracking-wider font-bold">{gameId}</p>
          </div>
          <div>
            <Button
              variant={copied ? "primary" : "outline"}
              onClick={copyJoinLink}
              className={`w-full text-sm py-3 transition-all flex justify-center items-center gap-2 cursor-pointer ${copied ? 'bg-green-500 hover:bg-green-400 text-white border-green-500' : ''}`}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012 2v1m-6-10a2 2 0 00-2 2v1m2-3a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" />
                  </svg>
                  Copy Join Link
                </>
              )}
            </Button>
            <p className="mt-2 text-[10px] text-slate-500 break-all opacity-50">{gameUrl}</p>
          </div>
        </div>

        {/* Contestant List Section */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Joined Agents</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
              {contestantList.length}
            </span>
          </div>

          <div className="space-y-3">
            {contestantList.length > 0 ? (
              contestantList.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5 transition-all hover:border-mystery-cyan/30 group">
                  <Avatar emoji={c.avatar} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {c.score || 0} Points
                    </p>
                  </div>
                  {isSetup && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 px-4 rounded-xl border border-dashed border-white/10 text-center">
                <p className="text-xs text-slate-600 font-medium italic">
                  {isSetup ? "Awaiting field agents..." : "No agents in session"}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
