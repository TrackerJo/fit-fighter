import { useState, useRef, useEffect } from 'react';
import { calculateSetScore } from '../utils/scoring';

const EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
  'Barbell Row', 'Pull-Up', 'Dip', 'Curl', 'Leg Press',
  'Romanian Deadlift', 'Lateral Raise', 'Tricep Extension'
];

export default function SetLogForm({ onSubmit, disabled }) {
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [preview, setPreview] = useState(null);
  const weightRef = useRef(null);

  useEffect(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (w > 0 && r > 0) {
      setPreview(calculateSetScore(w, r));
    } else {
      setPreview(null);
    }
  }, [weight, reps]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!w || !r || w <= 0 || r <= 0) return;

    onSubmit({ exercise, weight: w, reps: r });
    setWeight('');
    setReps('');
    setPreview(null);
    weightRef.current?.focus();
  };

  return (
    <form className="set-log-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="form-select"
          disabled={disabled}
        >
          {EXERCISES.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
      </div>
      <div className="form-row form-row-inline">
        <div className="form-field">
          <label>Weight (lbs)</label>
          <input
            ref={weightRef}
            type="number"
            min="1"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="135"
            disabled={disabled}
          />
        </div>
        <div className="form-field">
          <label>Reps</label>
          <input
            type="number"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="8"
            disabled={disabled}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || !weight || !reps}
        >
          Log{preview !== null && ` (+${preview})`}
        </button>
      </div>
    </form>
  );
}
