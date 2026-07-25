/**
 * Re-export of the shared API contract, so app code imports from one place:
 *
 *   import type { Product } from '@/app/lib/types';
 *
 * Do not add frontend-only types to @foldify/shared — put them at the bottom
 * of this file instead. shared/ is the network contract and nothing else.
 */
export type * from '@foldify/shared';
