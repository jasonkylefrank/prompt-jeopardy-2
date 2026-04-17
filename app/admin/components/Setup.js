'use client';

import Card from '../../components/Card';
import Button from '../../components/Button';
import Tooltip from '../../components/Tooltip';
import GpsFixedIcon from '../../components/icons/GpsFixedIcon';
import GpsNotFixedIcon from '../../components/icons/GpsNotFixedIcon';

export default function Setup({
  gameState,
  personaCount,
  actionCount,
  handlePersonaCountChange,
  handleActionCountChange,
  selectedRoundPersonas,
  selectedRoundActions,
  handlePersonaToggle,
  handleActionToggle,
  secretPersona,
  secretAction,
  setSecretPersona,
  setSecretAction,
  startRound,
  startRound2,
  PERSONA_POOL,
  ACTION_POOL
}) {
  const isRound2 = gameState === 'ROUND_2_SETUP';

  return (
    <Card className="p-8 border-mystery-cyan/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-black font-outfit text-white mb-2">
            {isRound2 ? 'Round 2 Setup' : 'Round 1 Setup'}
          </h3>
          <p className="text-slate-400">Configure the parameters and select the Secret targets.</p>
        </div>

        {/* Persona Pool Section */}
        <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-bold text-mystery-cyan">Persona Pool</h3>
              <p className="text-sm text-slate-500">Host sets quantity (4-6) and populates the pool.</p>
            </div>

            <div className="max-w-[200px] w-full">
              <label className="text-sm font-medium text-slate-300 mb-1 flex justify-between">
                <span>Pool Quantity</span>
                <span className="text-mystery-cyan font-bold">{personaCount}</span>
              </label>
              <input
                type="range" min="4" max="6" step="1"
                value={personaCount} onChange={handlePersonaCountChange}
                className="w-full accent-mystery-cyan cursor-pointer"
                list="persona-ticks"
              />
              <datalist id="persona-ticks" className="flex justify-between text-xs text-slate-500 mt-1 uppercase px-1">
                <option value="4" label="4"></option>
                <option value="5" label="5"></option>
                <option value="6" label="6"></option>
              </datalist>
            </div>
          </div>

          <div className="mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${selectedRoundPersonas.length === personaCount ? 'bg-mystery-cyan/20 text-mystery-cyan border border-mystery-cyan/50' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
              {selectedRoundPersonas.length} / {personaCount} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PERSONA_POOL).map(([category, people]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-slate-300 font-semibold border-b border-white/10 pb-2">{category}</h4>
                <div className="flex flex-col gap-2">
                  {people.map(p => {
                    const isSelected = selectedRoundPersonas.includes(p);
                    const isSecret = secretPersona === p;
                    const isAllowed = isSelected || selectedRoundPersonas.length < personaCount;

                    return (
                      <div key={p} className={`flex items-center justify-between p-2 rounded-lg transition-all ${isSelected ? (isSecret ? 'bg-mystery-cyan/20 border border-mystery-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-mystery-cyan/5 border border-mystery-cyan/30') : 'hover:bg-white/5 border border-transparent'} ${!isAllowed ? 'opacity-40' : ''}`}>
                        <label className={`flex items-center gap-3 cursor-pointer flex-1 ${!isAllowed ? 'cursor-not-allowed' : ''}`}>
                          <input
                            type="checkbox"
                            className="accent-mystery-cyan w-4 h-4 cursor-pointer disabled:cursor-not-allowed shrink-0"
                            checked={isSelected}
                            onChange={() => handlePersonaToggle(p)}
                            disabled={!isAllowed}
                          />
                          <span className={`text-sm ${isSecret ? 'text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : (isSelected ? 'text-mystery-cyan font-medium' : 'text-slate-400')}`}>
                            {p}
                          </span>
                        </label>
                        {isSelected && (
                          <Tooltip text="Toggle secret persona" position="top">
                            <button
                              onClick={() => setSecretPersona(p)}
                              className={`ml-2 w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer`}
                            >
                              {isSecret ? <GpsFixedIcon className="w-6 h-6 text-mystery-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> : <GpsNotFixedIcon className="w-6 h-6 text-gray-500 hover:text-white" />}
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Pool Section */}
        <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-bold text-mystery-pink">Action Selection</h3>
              <p className="text-sm text-slate-500">Host sets quantity (3-5) and populates the pool.</p>
            </div>

            <div className="max-w-[200px] w-full">
              <label className="text-sm font-medium text-slate-300 mb-1 flex justify-between">
                <span>Pool Quantity</span>
                <span className="text-mystery-pink font-bold">{actionCount}</span>
              </label>
              <input
                type="range" min="3" max="5" step="1"
                value={actionCount} onChange={handleActionCountChange}
                className="w-full accent-mystery-pink cursor-pointer"
                list="action-ticks"
              />
              <datalist id="action-ticks" className="flex justify-between text-xs text-slate-500 mt-1 uppercase px-1">
                <option value="3" label="3"></option>
                <option value="4" label="4"></option>
                <option value="5" label="5"></option>
              </datalist>
            </div>
          </div>

          <div className="mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${selectedRoundActions.length === actionCount ? 'bg-mystery-pink/20 text-mystery-pink border border-mystery-pink/50' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
              {selectedRoundActions.length} / {actionCount} Selected
            </span>
          </div>

          <p className="text-sm text-slate-300 font-medium mb-3 mt-4">The persona should try to:</p>
          <div className="flex flex-col gap-3">
            {ACTION_POOL.map(a => {
              const isSelected = selectedRoundActions.includes(a);
              const isSecret = secretAction === a;
              const isAllowed = isSelected || selectedRoundActions.length < actionCount;

              return (
                <div key={a} className={`flex items-start justify-between p-3 rounded-lg transition-all ${isSelected ? (isSecret ? 'bg-mystery-pink/20 border border-mystery-pink shadow-[0_0_15px_rgba(244,114,182,0.3)]' : 'bg-mystery-pink/5 border border-mystery-pink/30') : 'hover:bg-white/5 border border-transparent'} ${!isAllowed ? 'opacity-40' : ''}`}>
                  <label className={`flex items-start gap-3 cursor-pointer flex-1 ${!isAllowed ? 'cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="accent-mystery-pink w-4 h-4 mt-1 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      checked={isSelected}
                      onChange={() => handleActionToggle(a)}
                      disabled={!isAllowed}
                    />
                    <span className={`text-sm ${isSecret ? 'text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : (isSelected ? 'text-mystery-pink font-medium' : 'text-slate-400')}`}>
                      {a}
                    </span>
                  </label>
                  {isSelected && (
                    <Tooltip text="Toggle secret action" position="left">
                      <button
                        onClick={() => setSecretAction(a)}
                        className={`ml-3 mt-0.5 w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer`}
                      >
                        {isSecret ? <GpsFixedIcon className="w-6 h-6 text-mystery-pink drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" /> : <GpsNotFixedIcon className="w-6 h-6 text-gray-500 hover:text-white" />}
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex justify-end">
          <Button
            variant="primary"
            onClick={isRound2 ? startRound2 : startRound}
            className="w-full md:w-auto min-w-[250px] text-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
            disabled={selectedRoundPersonas.length !== personaCount || selectedRoundActions.length !== actionCount || !secretPersona || !secretAction}
          >
            <span>{isRound2 ? 'Start Round 2' : 'Start Round 1'}</span>
            <span>🚀</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
