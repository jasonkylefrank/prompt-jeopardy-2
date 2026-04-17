'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '../../../firebase';
import { ref, onValue, update } from 'firebase/database';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import GpsFixedIcon from '../../components/icons/GpsFixedIcon';
import GpsNotFixedIcon from '../../components/icons/GpsNotFixedIcon';
import Tooltip from '../../components/Tooltip';

// Default pools that can be customized by the admin
const PERSONA_POOL = {
  "Sports & entertainment": ["Michael Jordan", "Mike Tyson", "Hulk Hogan", "The Rock", "Taylor Swift"],
  "Historical": ["Leonardo da Vinci", "Abraham Lincoln", "Jane Goodall", "Helen Keller", "Amelia Earhart"],
  "Political": ["Bill Clinton", "George Bush"]
};

const ACTION_POOL = [
  "Espouse a political party that they are not very comfortable with.",
  "Quote Michael Jackson songs during natural conversation.",
  "Appear a lot less competitive than they really are.",
  "Appear a lot less intelligent than they really are.",
  "Appear a lot less eloquent than they really are."
];

export default function AdminPage() {
  const params = useParams();
  const urlGameId = params.slug ? params.slug[0] : null;

  const [gameId, setGameId] = useState(urlGameId);
  const [gameUrl, setGameUrl] = useState('');

  // State for game setup capabilities
  const [personaCount, setPersonaCount] = useState(6);
  const [actionCount, setActionCount] = useState(5);

  const [selectedRoundPersonas, setSelectedRoundPersonas] = useState([]);
  const [selectedRoundActions, setSelectedRoundActions] = useState([...ACTION_POOL]);

  const [secretPersona, setSecretPersona] = useState('');
  const [secretAction, setSecretAction] = useState('');

  const [contestants, setContestants] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (gameId) {
      setGameUrl(`${window.location.origin}/join/${gameId}`);
    }
  }, [gameId]);

  // Real-time listener for contestants joining the game
  useEffect(() => {
    if (!gameId) return;

    const contestantsRef = ref(db, `games/${gameId}/players`);
    const unsubscribe = onValue(contestantsRef, (snapshot) => {
      const players = snapshot.val();
      const playerList = players ? Object.values(players) : [];
      setContestants(playerList);
    });

    return () => unsubscribe();
  }, [gameId]);

  const handlePersonaCountChange = (e) => {
    const count = parseInt(e.target.value);
    setPersonaCount(count);
    if (selectedRoundPersonas.length > count) {
      const newSelections = selectedRoundPersonas.slice(0, count);
      setSelectedRoundPersonas(newSelections);
      if (secretPersona && !newSelections.includes(secretPersona)) setSecretPersona('');
    }
  };

  const handleActionCountChange = (e) => {
    const count = parseInt(e.target.value);
    setActionCount(count);
    if (selectedRoundActions.length > count) {
      const newSelections = selectedRoundActions.slice(0, count);
      setSelectedRoundActions(newSelections);
      if (secretAction && !newSelections.includes(secretAction)) setSecretAction('');
    }
  };

  const handlePersonaToggle = (p) => {
    setSelectedRoundPersonas(prev => {
      const isRemoving = prev.includes(p);
      if (isRemoving && secretPersona === p) setSecretPersona('');
      return isRemoving ? prev.filter(x => x !== p)
        : (prev.length < personaCount ? [...prev, p] : prev);
    });
  };

  const handleActionToggle = (a) => {
    setSelectedRoundActions(prev => {
      const isRemoving = prev.includes(a);
      if (isRemoving && secretAction === a) setSecretAction('');
      return isRemoving ? prev.filter(x => x !== a)
        : (prev.length < actionCount ? [...prev, a] : prev);
    });
  };

  const startRound = async () => {
    if (selectedRoundPersonas.length !== personaCount || selectedRoundActions.length !== actionCount) {
      alert("Please complete the pool selection process first.");
      return;
    }
    if (!secretPersona || !secretAction) {
      alert("You must designate a Secret Persona and a Secret Action using the target icons.");
      return;
    }

    try {
      const gameRef = ref(db, `games/${gameId}`);
      await update(gameRef, {
        gameState: 'ROUND_1_PHASE_1',
        personaPool: selectedRoundPersonas,
        actionPool: selectedRoundActions,
        secretPersona,
        secretAction
      });
      alert("Round 1 Initialized! Contestants are syncing to the new state.");
    } catch (error) {
      console.error("Error starting round:", error);
      alert("Failed to start round. See console for details.");
    }
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  if (!gameId) {
    return <div className="text-center mt-20 text-white font-bold animate-pulse">Initializing Portal...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-4xl font-black font-outfit text-white">Mission Control</h1>
        <span className="px-4 py-1.5 rounded-full bg-mystery-cyan/20 border border-mystery-cyan/50 text-mystery-cyan text-sm font-medium tracking-wide">
          SESSION ACTIVE
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sticky Sidebar */}
        <div className="w-full lg:w-1/3 xl:w-1/4 space-y-8 lg:sticky lg:top-8">
          <div className="space-y-4 px-2 pt-2">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Game ID</p>
                <p className="font-mono text-sm text-slate-400 tracking-wider">{gameId}</p>
              </div>
              <div>
                <Button
                  variant={copied ? "primary" : "outline"}
                  onClick={copyJoinLink}
                  className={`w-full text-sm py-3 transition-all flex justify-center items-center gap-2 ${copied ? 'bg-green-500 hover:bg-green-400 text-white border-green-500' : ''}`}
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : 'Copy Shareable Join URL'}
                </Button>
              </div>
            </div>
          </div>

          <Card className="p-6 border-white/10 shadow-lg">
            <h2 className="text-xl font-bold text-slate-100 mb-4 border-b border-white/10 pb-4">
              Connected Agents ({contestants.length})
            </h2>
            {contestants.length === 0 ? (
              <p className="text-slate-500 italic py-4 text-center">Awaiting incoming connections...</p>
            ) : (
              <ul className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
                {contestants.map(c => (
                  <li key={c.id} className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-white/5 shadow-sm">
                    <Avatar emoji={c.avatar} size="sm" />
                    <span className="font-medium text-slate-200 truncate">{c.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="w-full lg:w-2/3 xl:w-3/4">
          <Card className="p-8 border-mystery-cyan/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-black font-outfit text-white mb-2">Round 1 Setup</h3>
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
                  onClick={startRound}
                  className="w-full md:w-auto min-w-[250px] text-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                  disabled={selectedRoundPersonas.length !== personaCount || selectedRoundActions.length !== actionCount || !secretPersona || !secretAction}
                >
                  <span>Start Round 1</span>
                  <span>🚀</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
