import type { CraftPoint } from '@foldify/shared';

/** A fold being recorded: the point that moves, and where it lands once picked. */
export interface FoldDraft {
  origin: CraftPoint;
  target: CraftPoint | null;
}
