/**
 * Scoring logic for Prompt Jeopardy.
 *
 * Point values per the game instructions (Round 1 values; all doubled in Round 2):
 *
 * Phase 1: Correct +3, Incorrect -1
 * Phase 2: Correct +2, Incorrect -2
 * Phase 3+: Correct +1, Incorrect -3
 * Abstain (3+ times in a round): -4 per phase
 *
 * Edge case: If a winner would end up with a negative score for the round,
 * they receive +1 in Round 1 or +2 in Round 2 instead.
 */

const POINT_TABLE = {
  1: { correct: 3, incorrect: -1 },
  2: { correct: 2, incorrect: -2 },
  // Phase 3 and beyond all use the same values
};

function getPhasePoints(phase) {
  return POINT_TABLE[phase] || { correct: 1, incorrect: -3 };
}

const ABSTAIN_PENALTY = -4;
const ABSTAIN_THRESHOLD = 3; // Penalty kicks in on 3rd abstain and beyond

/**
 * Calculate the point change for a single contestant in a single phase.
 *
 * @param {Object} params
 * @param {number} params.phase - Current phase number (1-indexed)
 * @param {number} params.round - Current round (1 or 2)
 * @param {boolean} params.correct - Did they guess both persona AND action correctly?
 * @param {boolean} params.abstained - Did they abstain (or not submit)?
 * @param {number} params.abstainCount - Total abstains this round (including this one if abstaining)
 * @returns {number} The point change for this phase
 */
export function calculatePointChange({ phase, round, correct, abstained, abstainCount }) {
  const multiplier = round === 2 ? 2 : 1;

  if (abstained) {
    // Penalty only applies on 3rd+ abstain in the round
    if (abstainCount >= ABSTAIN_THRESHOLD) {
      return ABSTAIN_PENALTY * multiplier;
    }
    return 0; // No penalty for first two abstains
  }

  const { correct: correctPts, incorrect: incorrectPts } = getPhasePoints(phase);

  if (correct) {
    return correctPts * multiplier;
  } else {
    return incorrectPts * multiplier;
  }
}

/**
 * Process all submissions for a phase and return the results.
 *
 * @param {Object} params
 * @param {Object} params.players - All players { playerId: { score, abstainCount, ... } }
 * @param {Object} params.submissions - Submissions { playerId: { persona, action, abstained } }
 * @param {string} params.secretPersona
 * @param {string} params.secretAction
 * @param {number} params.phase
 * @param {number} params.round
 * @returns {{ results: Object, anyCorrect: boolean, updatedPlayers: Object }}
 */
export function processPhaseResults({ players, submissions, secretPersona, secretAction, phase, round }) {
  const results = {};
  const updatedPlayers = JSON.parse(JSON.stringify(players)); // deep clone
  let anyCorrect = false;

  const playerIds = Object.keys(players);

  for (const playerId of playerIds) {
    const submission = submissions?.[playerId];
    const player = updatedPlayers[playerId];

    const abstained = !submission || submission.abstained;
    let correct = false;

    if (!abstained) {
      correct = submission.persona === secretPersona && submission.action === secretAction;
    }

    // Update abstain count for the round
    if (abstained) {
      player.abstainCount = (player.abstainCount || 0) + 1;
    }

    const pointChange = calculatePointChange({
      phase,
      round,
      correct,
      abstained,
      abstainCount: player.abstainCount || 0,
    });

    if (correct) anyCorrect = true;

    results[playerId] = {
      correct,
      abstained,
      pointChange,
    };

    player.score = (player.score || 0) + pointChange;
  }

  // Edge case: If a winner's cumulative score is negative after winning,
  // override their point change so they end up with the minimum reward.
  if (anyCorrect) {
    const minReward = round === 2 ? 2 : 1;
    for (const playerId of playerIds) {
      if (results[playerId].correct && updatedPlayers[playerId].score < 0) {
        // Recalculate: set their score to minReward instead
        const currentScore = players[playerId].score || 0;
        results[playerId].pointChange = minReward - currentScore;
        updatedPlayers[playerId].score = minReward;
      }
    }
  }

  return { results, anyCorrect, updatedPlayers };
}
