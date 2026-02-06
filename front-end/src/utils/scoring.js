const DIMINISHING_EXPONENT = 0.8;

export function calculateSetScore(weight, reps) {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * Math.pow(reps, DIMINISHING_EXPONENT) * 100) / 100;
}

export function calculateTotalScore(sets) {
  if (!sets || sets.length === 0) return 0;
  return sets.reduce((total, set) => total + calculateSetScore(set.weight, set.reps), 0);
}
