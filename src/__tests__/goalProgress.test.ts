import { LightColors } from '../theme/colors';
import {
  goalProgressColor,
  goalEncouragement,
  goalEncouragementSecondary,
} from '../components/peggy/PeggyGoalCard';

const C = LightColors;

// ── Milestone bands (Design System §5) ──────────────────────────────────────
describe('goalProgressColor — discrete milestone bands', () => {
  it('0–24% is coral (danger)', () => {
    expect(goalProgressColor(0, C)).toBe(C.danger);
    expect(goalProgressColor(0.24, C)).toBe(C.danger);
  });
  it('25–49% is orange (warning)', () => {
    expect(goalProgressColor(0.25, C)).toBe(C.warning);
    expect(goalProgressColor(0.49, C)).toBe(C.warning);
  });
  it('50–74% is PeggyBank purple (primary)', () => {
    expect(goalProgressColor(0.5, C)).toBe(C.primary);
    expect(goalProgressColor(0.74, C)).toBe(C.primary);
  });
  it('75–99% is teal/green (success)', () => {
    expect(goalProgressColor(0.75, C)).toBe(C.success);
    expect(goalProgressColor(0.99, C)).toBe(C.success);
  });
  it('100% is gold', () => {
    expect(goalProgressColor(1, C)).toBe(C.gold);
    expect(goalProgressColor(1.5, C)).toBe(C.gold); // clamps
  });
});

// ── Encouragement copy ──────────────────────────────────────────────────────
describe('goalEncouragement', () => {
  it('completed primary is the approved "You did it!"', () => {
    expect(goalEncouragement(1)).toBe('You did it!');
  });
  it('completed secondary is the approved message', () => {
    expect(goalEncouragementSecondary(1)).toBe('Goal complete — amazing work! 🎉');
  });
  it('non-completed goals have no secondary line', () => {
    expect(goalEncouragementSecondary(0.5)).toBeNull();
    expect(goalEncouragementSecondary(0)).toBeNull();
  });
  it('in-progress phrases are the Bible phrases', () => {
    expect(goalEncouragement(0.1)).toBe('Every dollar gets you closer!');
    expect(goalEncouragement(0.5)).toBe("You're doing great!");
    expect(goalEncouragement(0.8)).toBe('Almost there!');
  });
});
