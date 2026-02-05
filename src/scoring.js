/**
 * Scoring algorithm for Fit Fighter competitions.
 *
 * The score is based on total workout **volume** (weight × reps) but applies
 * diminishing returns on reps to reward intensity (heavier weight, fewer reps)
 * over endless light-weight reps.
 *
 * Formula per set:
 *   setScore = weight × reps^0.8
 *
 * Using reps^0.8 instead of raw reps means:
 *   – 5 reps  → effective multiplier ≈ 3.62  (72 % of raw)
 *   – 10 reps → effective multiplier ≈ 6.31  (63 % of raw)
 *   – 20 reps → effective multiplier ≈ 10.99 (55 % of raw)
 *
 * This naturally pushes higher-weight / lower-rep training to yield a better
 * ratio, which is the "intensity emphasis" the product calls for.
 *
 * Total score = sum of all setScores in the competition.
 */

const DIMINISHING_EXPONENT = 0.8;

/**
 * Calculate the score for a single set.
 * @param {number} weight – weight lifted (any unit, as long as consistent)
 * @param {number} reps   – number of repetitions
 * @returns {number} rounded score for this set
 */
function calculateSetScore(weight, reps) {
    if (weight <= 0 || reps <= 0) return 0;
    return Math.round(weight * Math.pow(reps, DIMINISHING_EXPONENT) * 100) / 100;
}

/**
 * Calculate the total competition score for an array of sets.
 * @param {{ weight: number, reps: number }[]} sets
 * @returns {number}
 */
function calculateTotalScore(sets) {
    return (
        Math.round(
            sets.reduce((sum, s) => sum + calculateSetScore(s.weight, s.reps), 0) * 100
        ) / 100
    );
}

module.exports = { calculateSetScore, calculateTotalScore, DIMINISHING_EXPONENT };
