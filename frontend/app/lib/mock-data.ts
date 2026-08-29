import type { Product, StatusResponse, Tutorial, User } from '@foldify/shared';

/**
 * Fake data for USE_MOCK mode.
 *
 * NON-NEGOTIABLE: with USE_MOCK on and the backend stopped, the entire
 * frontend must still render. The API is two weeks out and page work cannot
 * block on it. Every mock below matches the real shared type exactly, so
 * switching to the live API changes nothing above api-client.ts.
 */

export const mockUser: User = {
  id: 1,
  email: 'admin@foldify.local',
  name: 'Foldify Admin',
  role: 'admin',
  avatarUrl: null,
  createdAt: '2026-07-01T09:00:00.000Z',
};

export const mockProducts: Product[] = [
  { id: 1, slug: 'crane-traditional-white', name: 'Traditional Crane', description: 'The classic tsuru, folded from crisp white kami and mounted on a small walnut block. The same model the crane tutorial teaches, if you would rather have one than fold one.', priceMinor: 45000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Animals', stock: 60, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-02T10:00:00.000Z' },
  { id: 2, slug: 'crane-flock-mobile', name: 'Crane Flock Mobile — Nine Cranes', description: 'Nine cranes in graded indigo, hung at staggered heights from a brass rod. Turns on its own in a draught.', priceMinor: 165000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Animals', stock: 24, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-03T10:00:00.000Z' },
  { id: 3, slug: 'koi-pair-red-white', name: 'Koi Pair', description: 'Two koi in red and white, wet-folded from tant so the bodies keep a curve instead of sitting flat.', priceMinor: 128000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Animals', stock: 30, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-04T10:00:00.000Z' },
  { id: 4, slug: 'dragon-western-black', name: 'Western Dragon', description: 'Folded from a single square of black double-tissue — no cuts, no glue, every spine and claw accounted for. Roughly four hundred steps.', priceMinor: 340000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Animals', stock: 8, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-05T10:00:00.000Z' },
  { id: 5, slug: 'lotus-blossom-pink', name: 'Lotus Blossom', description: 'Eight layers of soft pink washi opened petal by petal. Sits flat in the palm.', priceMinor: 52000, currency: 'NPR', imageUrl: null, categoryId: 2, categoryName: 'Flowers', stock: 55, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-06T10:00:00.000Z' },
  { id: 6, slug: 'tulip-trio-stems', name: 'Tulip Trio', description: 'Three tulips on folded stems, in yellow, coral and white. Blown into shape through the base, the traditional way.', priceMinor: 68000, currency: 'NPR', imageUrl: null, categoryId: 2, categoryName: 'Flowers', stock: 42, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-07T10:00:00.000Z' },
  { id: 7, slug: 'rose-kawasaki-crimson', name: 'Kawasaki Rose', description: 'The twist-fold rose in crimson chiyogami. The spiral at its centre is one continuous move — the reason this one is not for a first attempt.', priceMinor: 215000, currency: 'NPR', imageUrl: null, categoryId: 2, categoryName: 'Flowers', stock: 14, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-08T10:00:00.000Z' },
  { id: 8, slug: 'sonobe-cube-six-unit', name: 'Sonobe Cube', description: 'Six identical units slotted into one another, no glue anywhere. The modular tutorial folds this exact cube.', priceMinor: 88000, currency: 'NPR', imageUrl: null, categoryId: 3, categoryName: 'Modular', stock: 36, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-09T10:00:00.000Z' },
  { id: 9, slug: 'kusudama-flower-ball', name: 'Kusudama Flower Ball', description: 'Thirty flower units in five colours, threaded and tasselled. Hangs from a loop at the top.', priceMinor: 185000, currency: 'NPR', imageUrl: null, categoryId: 3, categoryName: 'Modular', stock: 20, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-10T10:00:00.000Z' },
  { id: 10, slug: 'star-cluster-icosahedron', name: 'Icosahedral Star Cluster', description: 'Thirty units, twenty points, one shape that holds itself together by tension alone. Drop it and it survives; pull one unit and it does not.', priceMinor: 295000, currency: 'NPR', imageUrl: null, categoryId: 3, categoryName: 'Modular', stock: 9, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-11T10:00:00.000Z' },
  { id: 11, slug: 'masu-box-nested-set', name: 'Nested Masu Boxes — Set of Three', description: 'Three lidded masu boxes that sit inside one another. Folded from patterned chiyogami, squared to the millimetre.', priceMinor: 74000, currency: 'NPR', imageUrl: null, categoryId: 4, categoryName: 'Boxes & Vessels', stock: 48, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-12T10:00:00.000Z' },
  { id: 12, slug: 'star-bowl-eight-point', name: 'Eight-Point Star Bowl', description: 'A shallow bowl that folds up into eight points, in deep green tant. Holds keys by the door, or nothing at all.', priceMinor: 112000, currency: 'NPR', imageUrl: null, categoryId: 4, categoryName: 'Boxes & Vessels', stock: 26, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-13T10:00:00.000Z' },
];

export const mockTutorials: Tutorial[] = [
  {
    id: 1,
    slug: 'traditional-crane',
    title: 'The Traditional Crane',
    summary: 'The model everyone learns first, and the one that teaches the bird base you will reuse forever.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    coverImageUrl: null,
    isPublished: true,
    createdAt: '2026-07-02T12:00:00.000Z',
    steps: [
      { id: 1, tutorialId: 1, stepNumber: 1, instruction: 'Start coloured side up. Fold in half along both diagonals and unfold.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 2, tutorialId: 1, stepNumber: 2, instruction: 'Turn the paper over. Fold in half horizontally and vertically, then unfold.', foldType: 'mountain', imageUrl: null, craftFileId: null },
      { id: 3, tutorialId: 1, stepNumber: 3, instruction: 'Collapse into a square base by bringing the four corners together.', foldType: 'squash', imageUrl: null, craftFileId: null },
      { id: 4, tutorialId: 1, stepNumber: 4, instruction: 'Fold the lower edges to the centre line on both sides.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 5, tutorialId: 1, stepNumber: 5, instruction: 'Petal-fold the front flap upward, then repeat behind.', foldType: 'petal', imageUrl: null, craftFileId: null },
      { id: 6, tutorialId: 1, stepNumber: 6, instruction: 'Inside-reverse-fold the two narrow points to form the head and tail.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 7, tutorialId: 1, stepNumber: 7, instruction: 'Reverse-fold the tip of the head, then round the wings.', foldType: 'reverse', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 2,
    slug: 'modular-sonobe-cube',
    title: 'Modular Sonobe Cube',
    summary: 'Six identical units, no glue. The gentlest possible introduction to modular origami.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    coverImageUrl: null,
    isPublished: true,
    createdAt: '2026-07-04T12:00:00.000Z',
    steps: [
      { id: 8, tutorialId: 2, stepNumber: 1, instruction: 'Fold a square in half and unfold to mark the centre.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 9, tutorialId: 2, stepNumber: 2, instruction: 'Fold both outer edges to the centre crease.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 10, tutorialId: 2, stepNumber: 3, instruction: 'Fold the top-right and bottom-left corners over at 45 degrees.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 11, tutorialId: 2, stepNumber: 4, instruction: 'Tuck the opposite corners into the resulting pockets to lock the unit.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 12, tutorialId: 2, stepNumber: 5, instruction: 'Repeat five more times — six units in total.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 13, tutorialId: 2, stepNumber: 6, instruction: 'Slot each unit tab into a neighbouring pocket until the cube closes.', foldType: 'other', imageUrl: null, craftFileId: null },
    ],
  },
];

/** What /api/status looks like when the real one is unreachable. */
export function mockStatus(): StatusResponse {
  return {
    service: 'foldify-api',
    version: '0.1.0',
    environment: 'mock',
    uptimeSeconds: 0,
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      path: '(mock — no database)',
      foreignKeys: false,
      journalMode: 'none',
      tables: 0,
    },
    modules: {
      status: 'degraded',
      auth: 'not-implemented',
      products: 'not-implemented',
      tutorials: 'not-implemented',
      orders: 'not-implemented',
      contact: 'not-implemented',
      payments: 'not-implemented',
      database: 'down',
    },
  };
}
