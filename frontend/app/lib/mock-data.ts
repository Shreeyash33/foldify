import type { CraftFile, Product, StatusResponse, Tutorial, User } from '@foldify/shared';

/**
 * Fake data for USE_MOCK mode.
 *
 * NON-NEGOTIABLE: with USE_MOCK on and the backend stopped, the entire
 * frontend must still render, so mock mode renders the full frontend while
 * the backend is stopped. Every mock below matches the real shared type
 * exactly, so switching to the live API changes nothing above api-client.ts.
 */

/**
 * The four accounts the backend seed creates, mirroring live mode: one admin
 * and three customers. mockUser stays the admin reference used for the sign-in
 * stubs below.
 */
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'admin@foldify.local',
    name: 'Foldify Admin',
    role: 'admin',
    avatarUrl: null,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 2,
    email: 'demo@foldify.local',
    name: 'Sita Rai',
    role: 'customer',
    avatarUrl: null,
    createdAt: '2026-07-10T09:00:00.000Z',
  },
  {
    id: 3,
    email: 'anil.sharma@foldify.local',
    name: 'Anil Sharma',
    role: 'customer',
    avatarUrl: null,
    createdAt: '2026-07-12T09:00:00.000Z',
  },
  {
    id: 4,
    email: 'pooja.karki@foldify.local',
    name: 'Pooja Karki',
    role: 'customer',
    avatarUrl: null,
    createdAt: '2026-07-15T09:00:00.000Z',
  },
];

export const mockUser: User = mockUsers[0]!;

export const mockProducts: Product[] = [
  { id: 1, slug: 'crane-traditional-white', name: 'Traditional Crane', description: 'The classic tsuru, folded from crisp white kami and mounted on a small walnut block. The same model the crane tutorial teaches, if you would rather have one than fold one.', priceMinor: 45000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/crane-traditional-white.svg', categoryId: 1, categoryName: 'Animals', stock: 60, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-02T10:00:00.000Z' },
  { id: 2, slug: 'crane-flock-mobile', name: 'Crane Flock Mobile — Nine Cranes', description: 'Nine cranes in graded indigo, hung at staggered heights from a brass rod. Turns on its own in a draught.', priceMinor: 165000, compareAtPriceMinor: 190000, currency: 'NPR', imageUrl: '/products/crane-flock-mobile.svg', categoryId: 1, categoryName: 'Animals', stock: 24, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-03T10:00:00.000Z' },
  { id: 3, slug: 'koi-pair-red-white', name: 'Koi Pair', description: 'Two koi in red and white, wet-folded from tant so the bodies keep a curve instead of sitting flat.', priceMinor: 128000, compareAtPriceMinor: 150000, currency: 'NPR', imageUrl: '/products/koi-pair-red-white.svg', categoryId: 1, categoryName: 'Animals', stock: 30, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-04T10:00:00.000Z' },
  { id: 4, slug: 'dragon-western-black', name: 'Western Dragon', description: 'Folded from a single square of black double-tissue — no cuts, no glue, every spine and claw accounted for. Roughly four hundred steps.', priceMinor: 340000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/dragon-western-black.svg', categoryId: 1, categoryName: 'Animals', stock: 8, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-05T10:00:00.000Z' },
  { id: 5, slug: 'lotus-blossom-pink', name: 'Lotus Blossom', description: 'Eight layers of soft pink washi opened petal by petal. Sits flat in the palm.', priceMinor: 52000, compareAtPriceMinor: 60000, currency: 'NPR', imageUrl: '/products/lotus-blossom-pink.svg', categoryId: 2, categoryName: 'Flowers', stock: 55, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-06T10:00:00.000Z' },
  { id: 6, slug: 'tulip-trio-stems', name: 'Tulip Trio', description: 'Three tulips on folded stems, in yellow, coral and white. Blown into shape through the base, the traditional way.', priceMinor: 68000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/tulip-trio-stems.svg', categoryId: 2, categoryName: 'Flowers', stock: 42, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-07T10:00:00.000Z' },
  { id: 7, slug: 'rose-kawasaki-crimson', name: 'Kawasaki Rose', description: 'The twist-fold rose in crimson chiyogami. The spiral at its centre is one continuous move — the reason this one is not for a first attempt.', priceMinor: 215000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/rose-kawasaki-crimson.svg', categoryId: 2, categoryName: 'Flowers', stock: 14, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-08T10:00:00.000Z' },
  { id: 8, slug: 'sonobe-cube-six-unit', name: 'Sonobe Cube', description: 'Six identical units slotted into one another, no glue anywhere. The modular tutorial folds this exact cube.', priceMinor: 88000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/sonobe-cube-six-unit.svg', categoryId: 3, categoryName: 'Modular', stock: 36, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-09T10:00:00.000Z' },
  { id: 9, slug: 'kusudama-flower-ball', name: 'Kusudama Flower Ball', description: 'Thirty flower units in five colours, threaded and tasselled. Hangs from a loop at the top.', priceMinor: 185000, compareAtPriceMinor: 210000, currency: 'NPR', imageUrl: '/products/kusudama-flower-ball.svg', categoryId: 3, categoryName: 'Modular', stock: 20, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-10T10:00:00.000Z' },
  { id: 10, slug: 'star-cluster-icosahedron', name: 'Icosahedral Star Cluster', description: 'Thirty units, twenty points, one shape that holds itself together by tension alone. Drop it and it survives; pull one unit and it does not.', priceMinor: 295000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/star-cluster-icosahedron.svg', categoryId: 3, categoryName: 'Modular', stock: 9, difficulty: 'advanced', isPublished: true, createdAt: '2026-07-11T10:00:00.000Z' },
  { id: 11, slug: 'masu-box-nested-set', name: 'Nested Masu Boxes — Set of Three', description: 'Three lidded masu boxes that sit inside one another. Folded from patterned chiyogami, squared to the millimetre.', priceMinor: 74000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/masu-box-nested-set.svg', categoryId: 4, categoryName: 'Boxes & Vessels', stock: 48, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-12T10:00:00.000Z' },
  { id: 12, slug: 'star-bowl-eight-point', name: 'Eight-Point Star Bowl', description: 'A shallow bowl that folds up into eight points, in deep green tant. Holds keys by the door, or nothing at all.', priceMinor: 112000, compareAtPriceMinor: 130000, currency: 'NPR', imageUrl: '/products/star-bowl-eight-point.svg', categoryId: 4, categoryName: 'Boxes & Vessels', stock: 26, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-13T10:00:00.000Z' },
  { id: 13, slug: 'pigeon-city-white', name: 'City Pigeon', description: 'The little bird of every rooftop, folded from silver-grey kami with a white breast. Simple enough that the tutorial is over in a coffee break, charming enough that nobody minds.', priceMinor: 38000, compareAtPriceMinor: null, currency: 'NPR', imageUrl: '/products/pigeon-city-white.svg', categoryId: 1, categoryName: 'Animals', stock: 50, difficulty: 'beginner', isPublished: true, createdAt: '2026-07-14T10:00:00.000Z' },
  { id: 14, slug: 'lily-white-washi', name: 'White Lily', description: 'A stemless lily in brilliant white washi, opened by curling each petal around a pencil. One sheet, six petals, no glue.', priceMinor: 82000, compareAtPriceMinor: 95000, currency: 'NPR', imageUrl: '/products/lily-white-washi.svg', categoryId: 2, categoryName: 'Flowers', stock: 34, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-15T10:00:00.000Z' },
  { id: 15, slug: 'twist-bowl-teal', name: 'Twist Bowl', description: 'A low bowl that starts flat and rises when the centre is twisted — a single sheet in teal tant, water-resist folded for the kitchen.', priceMinor: 96000, compareAtPriceMinor: 110000, currency: 'NPR', imageUrl: '/products/twist-bowl-teal.svg', categoryId: 4, categoryName: 'Boxes & Vessels', stock: 28, difficulty: 'intermediate', isPublished: true, createdAt: '2026-07-16T10:00:00.000Z' },
];

/**
 * The same demo fold the backend seeds for the crane, so the player animates a
 * real sequence with USE_MOCK on. Sheet millimetres, origin top-left; keep the
 * numbers in step with CRANE_CRAFT in backend/src/db/seed.ts.
 */
const mockCraneCraftFile: CraftFile = {
  id: 'craft-traditional-crane',
  name: 'Traditional Crane — demo fold',
  version: 1,
  tutorialId: 1,
  status: 'deployed',
  createdAt: '2026-07-02T12:00:00.000Z',
  updatedAt: '2026-07-02T12:00:00.000Z',
  data: {
    sheet: { preset: 'square', width: 200, height: 200 },
    vertices: [
      { id: 'corner-0', x: 0, y: 0 },
      { id: 'corner-1', x: 200, y: 0 },
      { id: 'corner-2', x: 200, y: 200 },
      { id: 'corner-3', x: 0, y: 200 },
    ],
    steps: [
      { id: 'fold-1', from: { x: 120, y: 0 }, to: { x: 0, y: 120 }, side: 'left', foldType: 'valley', instruction: 'Start coloured side up. Fold in half along both diagonals and unfold.', durationMs: 900 },
      { id: 'fold-2', from: { x: 130, y: 0 }, to: { x: 200, y: 70 }, side: 'right', foldType: 'mountain', instruction: 'Turn the paper over. Fold in half horizontally and vertically, then unfold.', durationMs: 900 },
      { id: 'fold-3', from: { x: 200, y: 130 }, to: { x: 130, y: 200 }, side: 'right', foldType: 'squash', instruction: 'Collapse into a square base by bringing the four corners together.', durationMs: 900 },
      { id: 'fold-4', from: { x: 70, y: 200 }, to: { x: 0, y: 130 }, side: 'right', foldType: 'valley', instruction: 'Fold the lower edges to the centre line on both sides.', durationMs: 900 },
      { id: 'fold-5', from: { x: 0, y: 50 }, to: { x: 200, y: 50 }, side: 'right', foldType: 'petal', instruction: 'Petal-fold the front flap upward, then repeat behind.', durationMs: 900 },
      { id: 'fold-6', from: { x: 0, y: 150 }, to: { x: 200, y: 150 }, side: 'left', foldType: 'reverse', instruction: 'Inside-reverse-fold the two narrow points to form the head and tail.', durationMs: 900 },
      { id: 'fold-7', from: { x: 50, y: 0 }, to: { x: 50, y: 200 }, side: 'left', foldType: 'reverse', instruction: 'Reverse-fold the tip of the head, then round the wings.', durationMs: 900 },
    ],
  },
};

export const mockTutorials: Tutorial[] = [
  {
    id: 1,
    slug: 'traditional-crane',
    title: 'The Traditional Crane',
    summary: 'The model everyone learns first, and the one that teaches the bird base you will reuse forever.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    coverImageUrl: '/products/crane-traditional-white.svg',
    isPublished: true,
    createdAt: '2026-07-02T12:00:00.000Z',
    steps: [
      { id: 1, tutorialId: 1, stepNumber: 1, instruction: 'Start coloured side up. Fold in half along both diagonals and unfold.', foldType: 'valley', imageUrl: null, craftFileId: 'craft-traditional-crane' },
      { id: 2, tutorialId: 1, stepNumber: 2, instruction: 'Turn the paper over. Fold in half horizontally and vertically, then unfold.', foldType: 'mountain', imageUrl: null, craftFileId: 'craft-traditional-crane' },
      { id: 3, tutorialId: 1, stepNumber: 3, instruction: 'Collapse into a square base by bringing the four corners together.', foldType: 'squash', imageUrl: null, craftFileId: 'craft-traditional-crane' },
      { id: 4, tutorialId: 1, stepNumber: 4, instruction: 'Fold the lower edges to the centre line on both sides.', foldType: 'valley', imageUrl: null, craftFileId: 'craft-traditional-crane' },
      { id: 5, tutorialId: 1, stepNumber: 5, instruction: 'Petal-fold the front flap upward, then repeat behind.', foldType: 'petal', imageUrl: null, craftFileId: 'craft-traditional-crane' },
      { id: 6, tutorialId: 1, stepNumber: 6, instruction: 'Inside-reverse-fold the two narrow points to form the head and tail.', foldType: 'reverse', imageUrl: null, craftFileId: 'craft-traditional-crane' },
      { id: 7, tutorialId: 1, stepNumber: 7, instruction: 'Reverse-fold the tip of the head, then round the wings.', foldType: 'reverse', imageUrl: null, craftFileId: 'craft-traditional-crane' },
    ],
    craftFile: mockCraneCraftFile,
  },
  {
    id: 2,
    slug: 'modular-sonobe-cube',
    title: 'Modular Sonobe Cube',
    summary: 'Six identical units, no glue. The gentlest possible introduction to modular origami.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    coverImageUrl: '/products/sonobe-cube-six-unit.svg',
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
  {
    id: 3,
    slug: 'city-pigeon',
    title: 'The City Pigeon',
    summary: 'The unkillable little bird of every square, and the fastest route to a first origami that stands on its own two feet.',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    coverImageUrl: '/products/pigeon-city-white.svg',
    isPublished: true,
    createdAt: '2026-07-16T12:00:00.000Z',
    steps: [
      { id: 14, tutorialId: 3, stepNumber: 1, instruction: 'Start coloured side up. Fold both diagonals and unfold to mark the centre.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 15, tutorialId: 3, stepNumber: 2, instruction: 'Bring the top corner down to the centre, then fold that same point back up to the top edge.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 16, tutorialId: 3, stepNumber: 3, instruction: 'Fold the model in half along the vertical crease.', foldType: 'mountain', imageUrl: null, craftFileId: null },
      { id: 17, tutorialId: 3, stepNumber: 4, instruction: 'Inside-reverse-fold the front point down to form the head.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 18, tutorialId: 3, stepNumber: 5, instruction: 'Fold the front wing down on an angle, then repeat behind.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 19, tutorialId: 3, stepNumber: 6, instruction: 'Open the base slightly so the pigeon stands, and round the breast.', foldType: 'other', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 4,
    slug: 'white-lily',
    title: 'The White Lily',
    summary: 'Six petals, one sheet, and a twist that opens them. The lily teaches the petal fold the crane starts but never finishes.',
    difficulty: 'intermediate',
    estimatedMinutes: 25,
    coverImageUrl: '/products/lily-white-washi.svg',
    isPublished: true,
    createdAt: '2026-07-17T12:00:00.000Z',
    steps: [
      { id: 20, tutorialId: 4, stepNumber: 1, instruction: 'Start white side up. Fold and unfold both diagonals and both mid-lines.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 21, tutorialId: 4, stepNumber: 2, instruction: 'Collapse the creases into a square base with all four corners meeting at the bottom.', foldType: 'squash', imageUrl: null, craftFileId: null },
      { id: 22, tutorialId: 4, stepNumber: 3, instruction: 'Fold the lower edges of one flap to the centre crease, unfold, then petal-fold the flap upward.', foldType: 'petal', imageUrl: null, craftFileId: null },
      { id: 23, tutorialId: 4, stepNumber: 4, instruction: 'Repeat the petal fold on the remaining three flaps so the model becomes four pointed diamonds.', foldType: 'petal', imageUrl: null, craftFileId: null },
      { id: 24, tutorialId: 4, stepNumber: 5, instruction: 'Fold both outer edges of each diamond to the centre line so the petals narrow.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 25, tutorialId: 4, stepNumber: 6, instruction: 'Open each petal outward and curl it around a pencil.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 26, tutorialId: 4, stepNumber: 7, instruction: 'Twist the centre gently so the six petals settle into a circle.', foldType: 'other', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 5,
    slug: 'twist-bowl',
    title: 'The Twist Bowl',
    summary: 'A flat sheet that becomes a bowl when the centre is twisted — a small lesson in collapse folds that looks like magic.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    coverImageUrl: '/products/twist-bowl-teal.svg',
    isPublished: true,
    createdAt: '2026-07-18T12:00:00.000Z',
    steps: [
      { id: 27, tutorialId: 5, stepNumber: 1, instruction: 'Start coloured side up. Fold both diagonals and unfold to mark the centre.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 28, tutorialId: 5, stepNumber: 2, instruction: 'Fold all four corners to the centre point, then unfold two of them again.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 29, tutorialId: 5, stepNumber: 3, instruction: 'Pull the corner creases outward until the sheet collapses into a flat pinwheel.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 30, tutorialId: 5, stepNumber: 4, instruction: 'Fold every point of the pinwheel to the centre and unfold to precrease the walls.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 31, tutorialId: 5, stepNumber: 5, instruction: 'Lift the centre and twist it a quarter turn so the walls rise around it.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 32, tutorialId: 5, stepNumber: 6, instruction: 'Press each wall outward so the rim points lock the shape.', foldType: 'squash', imageUrl: null, craftFileId: null },
      { id: 33, tutorialId: 5, stepNumber: 7, instruction: 'Turn the bowl over and press the base flat on the table.', foldType: 'mountain', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 6,
    slug: 'masu-box',
    title: 'The Masu Box',
    summary: 'The traditional Japanese gift box — perfectly square, glue-free, and the fold behind the nested set in the shop.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    coverImageUrl: '/products/masu-box-nested-set.svg',
    isPublished: true,
    createdAt: '2026-07-19T12:00:00.000Z',
    steps: [
      { id: 34, tutorialId: 6, stepNumber: 1, instruction: 'Start coloured side down. Fold in half both ways and unfold to mark the centre.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 35, tutorialId: 6, stepNumber: 2, instruction: 'Fold all four corners to the centre point.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 36, tutorialId: 6, stepNumber: 3, instruction: 'Fold the top and bottom edges to meet the centre line, then unfold.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 37, tutorialId: 6, stepNumber: 4, instruction: 'Unfold the two long flaps again, leaving the end triangles folded.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 38, tutorialId: 6, stepNumber: 5, instruction: 'Lift the short edges upward and pinch the corners so the first walls stand.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 39, tutorialId: 6, stepNumber: 6, instruction: 'Tuck the remaining corners inside and press the rim square.', foldType: 'other', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 7,
    slug: 'blown-tulip',
    title: 'The Blown Tulip',
    summary: 'A garden tulip folded in under ten minutes and inflated the traditional way — the simplest thing in the catalogue that still surprises people.',
    difficulty: 'beginner',
    estimatedMinutes: 12,
    coverImageUrl: '/products/tulip-trio-stems.svg',
    isPublished: true,
    createdAt: '2026-07-20T12:00:00.000Z',
    steps: [
      { id: 40, tutorialId: 7, stepNumber: 1, instruction: 'Start coloured side up. Blintz-fold all four corners to the centre.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 41, tutorialId: 7, stepNumber: 2, instruction: 'Turn the paper over and fold the four corners to the centre again.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 42, tutorialId: 7, stepNumber: 3, instruction: 'Tuck the corner points under the folded layers so the packet holds.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 43, tutorialId: 7, stepNumber: 4, instruction: 'Fold the side points inward to form the stem hole, then turn the packet over.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 44, tutorialId: 7, stepNumber: 5, instruction: 'Blow into the opening at the base so the tulip inflates.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 45, tutorialId: 7, stepNumber: 6, instruction: 'Peel the four petal points outward so the bloom opens.', foldType: 'mountain', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 8,
    slug: 'folded-koi',
    title: 'The Folded Koi',
    summary: 'The koi that swims across a desk, neck curved not cut — a neat run of reverse folds you will reuse on a dozen other models.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    coverImageUrl: '/products/koi-pair-red-white.svg',
    isPublished: true,
    createdAt: '2026-07-21T12:00:00.000Z',
    steps: [
      { id: 46, tutorialId: 8, stepNumber: 1, instruction: 'Start coloured side up. Fold both diagonals and unfold, then turn the paper over.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 47, tutorialId: 8, stepNumber: 2, instruction: 'Squash-fold the top corner down so the sheet becomes a diamond base.', foldType: 'squash', imageUrl: null, craftFileId: null },
      { id: 48, tutorialId: 8, stepNumber: 3, instruction: 'Fold both upper edges to the centre line to shape the back.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 49, tutorialId: 8, stepNumber: 4, instruction: 'Inside-reverse-fold the lower point back up to start the head.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 50, tutorialId: 8, stepNumber: 5, instruction: 'Reverse-fold the point at the other end into the curved tail.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 51, tutorialId: 8, stepNumber: 6, instruction: 'Fold the two side fins out, then open the body slightly so the koi stands.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 52, tutorialId: 8, stepNumber: 7, instruction: 'Round the spine with a soft mountain crease down the centre.', foldType: 'mountain', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 9,
    slug: 'kawasaki-rose',
    title: 'The Kawasaki Rose',
    summary: 'One continuous spiral at its centre — and the reason this is where folders learn to precrease before they fold.',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    coverImageUrl: '/products/rose-kawasaki-crimson.svg',
    isPublished: true,
    createdAt: '2026-07-22T12:00:00.000Z',
    steps: [
      { id: 53, tutorialId: 9, stepNumber: 1, instruction: 'Start coloured side up. Precrease the sheet: fold each corner to the centre and unfold.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 54, tutorialId: 9, stepNumber: 2, instruction: 'Fold each edge to the centre line and unfold, then rotate 45 degrees and repeat.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 55, tutorialId: 9, stepNumber: 3, instruction: 'Bring the corners together along the creases and collapse the sheet into a pinwheel.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 56, tutorialId: 9, stepNumber: 4, instruction: 'Flatten each pinwheel arm into a diamond by pressing on the existing crease lines.', foldType: 'squash', imageUrl: null, craftFileId: null },
      { id: 57, tutorialId: 9, stepNumber: 5, instruction: 'Fold the arms inward to narrow the petals, then open the pinwheel partway.', foldType: 'valley', imageUrl: null, craftFileId: null },
      { id: 58, tutorialId: 9, stepNumber: 6, instruction: 'Twist the centre clockwise so the petals spiral upward.', foldType: 'other', imageUrl: null, craftFileId: null },
      { id: 59, tutorialId: 9, stepNumber: 7, instruction: 'Curl each petal layer outward around a pencil to open the bloom.', foldType: 'mountain', imageUrl: null, craftFileId: null },
      { id: 60, tutorialId: 9, stepNumber: 8, instruction: 'Tuck the loose layer on the underside into the base and settle the central spiral.', foldType: 'other', imageUrl: null, craftFileId: null },
    ],
  },
  {
    id: 10,
    slug: 'western-dragon',
    title: 'The Western Dragon',
    summary: 'Four hundred steps in the showroom version, forty-five patient minutes in this one. The waterbomb base hides the whole skeleton.',
    difficulty: 'advanced',
    estimatedMinutes: 45,
    coverImageUrl: '/products/dragon-western-black.svg',
    isPublished: true,
    createdAt: '2026-07-23T12:00:00.000Z',
    steps: [
      { id: 61, tutorialId: 10, stepNumber: 1, instruction: 'Start coloured side up. Fold both diagonals and collapse the creases into a waterbomb base.', foldType: 'squash', imageUrl: null, craftFileId: null },
      { id: 62, tutorialId: 10, stepNumber: 2, instruction: 'Fold both upper edges of the front flap to the centre, unfold, and petal-fold the flap upward.', foldType: 'petal', imageUrl: null, craftFileId: null },
      { id: 63, tutorialId: 10, stepNumber: 3, instruction: 'Inside-reverse-fold both lower points outward to form the shoulders and hips.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 64, tutorialId: 10, stepNumber: 4, instruction: 'Reverse-fold the top point down and forward to start the neck.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 65, tutorialId: 10, stepNumber: 5, instruction: 'Reverse-fold the neck at its midpoint to raise the head, then at the tip to shape the snout.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 66, tutorialId: 10, stepNumber: 6, instruction: 'Fold the shoulder flaps forward and reverse-fold their tips into the front claws.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 67, tutorialId: 10, stepNumber: 7, instruction: 'Fold the tail along the spine, then reverse-fold it twice into an S curve.', foldType: 'reverse', imageUrl: null, craftFileId: null },
      { id: 68, tutorialId: 10, stepNumber: 8, instruction: 'Sink the wing layer on each side and spread the membranes outward.', foldType: 'other', imageUrl: null, craftFileId: null },
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
