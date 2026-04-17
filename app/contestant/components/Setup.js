'use client';

import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

export default function Setup({
  gameState,
  contestant
}) {
  const isRound2 = gameState === 'ROUND_2_SETUP';

  return (
    <div className="flex flex-col justify-center items-center min-h-[70vh] px-4 animate-in fade-in zoom-in-95 duration-500">
      <Card className="w-full max-w-lg p-8 text-center flex flex-col items-center">
        <h1 className="text-3xl font-black font-outfit text-white mb-6 tracking-wide uppercase">
          Welcome, Agent {contestant?.name}
        </h1>

        <Avatar emoji={contestant?.avatar} size="lg" className="mb-8" />

        <div className="w-full pt-8 border-t border-white/10">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-mystery-cyan animate-pulse">
              {isRound2 ? 'Round 2 Setup in Progress...' : 'Awaiting Host Configuration...'}
            </h2>
            <p className="text-slate-400">Stand by. The mission parameters are being finalized by the Host.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
