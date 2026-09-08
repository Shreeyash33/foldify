import type { CraftPoint } from '@foldify/shared';

/** A fold being recorded: the point that moves, and where it lands once picked. */
export interface FoldDraft {
  origin: CraftPoint;
  /** The vertex id the origin end snapped to (sheet corner or author vertex), or null. */
  originVertexId: string | null;
  target: CraftPoint | null;
  /** The vertex id the destination end snapped to, or null. */
  targetVertexId: string | null;
}
