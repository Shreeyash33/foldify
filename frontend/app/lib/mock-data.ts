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
  { id: 1, slug: 'kami-150-classic-100', name: 'Kami 150mm — Classic 100 Sheets', description: 'Single-sided kami in a hundred colours. The default paper for practice: cheap enough to waste, crisp enough to hold a crease.', priceMinor: 45000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Origami Paper', stock: 120, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-02T10:00:00.000Z' },
  { id: 2, slug: 'kami-75-mini-200', name: 'Kami 75mm — Mini 200 Sheets', description: 'Small format for modular units and lucky stars. Two hundred sheets, twenty colours.', priceMinor: 38000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Origami Paper', stock: 90, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-02T10:05:00.000Z' },
  { id: 3, slug: 'tant-150-muted-48', name: 'Tant 150mm — Muted 48 Sheets', description: 'Textured Japanese tant with a faint tooth. Holds wet-folded curves without cracking.', priceMinor: 92000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Origami Paper', stock: 40, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-03T10:00:00.000Z' },
  { id: 4, slug: 'foil-paper-200-gold', name: 'Foil Paper 200mm — Gold', description: 'Aluminium-backed foil. Takes a sharp crease and stays where you put it; unforgiving of mistakes.', priceMinor: 78000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Origami Paper', stock: 35, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-04T10:00:00.000Z' },
  { id: 5, slug: 'washi-chiyogami-150', name: 'Washi Chiyogami 150mm — 24 Sheets', description: 'Screen-printed chiyogami patterns on soft washi. For finished pieces, not practice.', priceMinor: 165000, currency: 'NPR', imageUrl: null, categoryId: 1, categoryName: 'Origami Paper', stock: 18, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-05T10:00:00.000Z' },
  { id: 6, slug: 'kit-crane-starter', name: 'Crane Starter Kit', description: 'Thirty sheets, an illustrated card, and a bone folder. Folds one classic crane, then twenty-nine more.', priceMinor: 120000, currency: 'NPR', imageUrl: null, categoryId: 2, categoryName: 'Fold Kits', stock: 50, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-06T10:00:00.000Z' },
  { id: 7, slug: 'kit-kusudama-ball', name: 'Kusudama Ball Kit', description: 'Modular flower ball: thirty units, colour-sorted, with an assembly order that actually makes sense.', priceMinor: 185000, currency: 'NPR', imageUrl: null, categoryId: 2, categoryName: 'Fold Kits', stock: 28, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-07T10:00:00.000Z' },
  { id: 8, slug: 'kit-dragon-advanced', name: 'Advanced Dragon Kit', description: 'One large sheet of double-tissue, a crease pattern, and no hand-holding. Budget an afternoon.', priceMinor: 340000, currency: 'NPR', imageUrl: null, categoryId: 2, categoryName: 'Fold Kits', stock: 12, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-08T10:00:00.000Z' },
  { id: 9, slug: 'bone-folder-bamboo', name: 'Bamboo Bone Folder', description: 'Traditional shape, bamboo rather than bone. Flattens a crease without polishing a shine into the paper.', priceMinor: 65000, currency: 'NPR', imageUrl: null, categoryId: 3, categoryName: 'Tools', stock: 60, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-09T10:00:00.000Z' },
  { id: 10, slug: 'scoring-board-a4', name: 'A4 Scoring Board', description: 'Grooved board with a stylus. Turns guesswork about thirds and fifths into a measurement.', priceMinor: 210000, currency: 'NPR', imageUrl: null, categoryId: 3, categoryName: 'Tools', stock: 22, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-10T10:00:00.000Z' },
  { id: 11, slug: 'paper-trimmer-a4', name: 'A4 Paper Trimmer', description: 'Guillotine trimmer with a grid bed. Square paper is most of the battle; this makes it square.', priceMinor: 290000, currency: 'NPR', imageUrl: null, categoryId: 3, categoryName: 'Tools', stock: 15, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-11T10:00:00.000Z' },
  { id: 12, slug: 'book-classic-diagrams', name: 'Classic Diagrams, Vol. 1', description: 'Forty traditional models diagrammed in standard notation — valley, mountain, reverse, squash.', priceMinor: 145000, currency: 'NPR', imageUrl: null, categoryId: 4, categoryName: 'Books', stock: 33, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-12T10:00:00.000Z' },
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
