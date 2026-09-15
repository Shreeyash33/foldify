import bcrypt from 'bcryptjs';
import type { CraftFileData } from '@foldify/shared';
import { config } from '../config.ts';
import { applySchema, closeDb, db } from './index.ts';
import { upsertUserByEmail } from './queries/users.queries.ts';
import { upsertProductBySlug } from './queries/products.queries.ts';

/**
 * Idempotent seed. Every insert is an upsert keyed on a natural unique column,
 * so `npm run seed` twice leaves the same rows, not two of everything.
 *
 * bcryptjs, not bcrypt — pure JS, no native compile step, so nobody has to
 * install Visual Studio Build Tools to get the project running.
 */

/**
 * Foldify sells folded origami, not the supplies for folding it. Categories
 * group finished models by what they are, so the shop reads as a catalogue of
 * crafts alongside the tutorials that teach the same folds.
 */
const CATEGORIES = [
  { slug: 'animals', name: 'Animals', description: 'Cranes, koi and dragons, folded from a single sheet.' },
  { slug: 'flowers', name: 'Flowers', description: 'Lotus, tulips and roses that never wilt.' },
  { slug: 'modular', name: 'Modular', description: 'Many identical units, locked together without glue.' },
  { slug: 'vessels', name: 'Boxes & Vessels', description: 'Masu boxes, star bowls and lidded trays.' },
] as const;

interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  /** The struck-through "original" price when this model is on sale; omit for no discount. */
  compareAtPriceMinor?: number;
  categorySlug: string;
  stock: number;
  /**
   * How hard the model is TO FOLD — the same scale the tutorials use, so
   * "beginner" means the same thing whether you buy the crane or fold it.
   * It describes the origami, never the object's quality or price.
   */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  imageUrl: string | null;
}

const PRODUCTS: SeedProduct[] = [
  { slug: 'crane-traditional-white', name: 'Traditional Crane', description: 'The classic tsuru, folded from crisp white kami and mounted on a small walnut block. The same model the crane tutorial teaches, if you would rather have one than fold one.', priceMinor: 45000, categorySlug: 'animals', stock: 60, difficulty: 'beginner', imageUrl: '/products/crane-traditional-white.svg' },
  { slug: 'crane-flock-mobile', name: 'Crane Flock Mobile — Nine Cranes', description: 'Nine cranes in graded indigo, hung at staggered heights from a brass rod. Turns on its own in a draught.', priceMinor: 165000, compareAtPriceMinor: 190000, categorySlug: 'animals', stock: 24, difficulty: 'intermediate', imageUrl: '/products/crane-flock-mobile.svg' },
  { slug: 'koi-pair-red-white', name: 'Koi Pair', description: 'Two koi in red and white, wet-folded from tant so the bodies keep a curve instead of sitting flat.', priceMinor: 128000, compareAtPriceMinor: 150000, categorySlug: 'animals', stock: 30, difficulty: 'intermediate', imageUrl: '/products/koi-pair-red-white.svg' },
  { slug: 'dragon-western-black', name: 'Western Dragon', description: 'Folded from a single square of black double-tissue — no cuts, no glue, every spine and claw accounted for. Roughly four hundred steps.', priceMinor: 340000, categorySlug: 'animals', stock: 8, difficulty: 'advanced', imageUrl: '/products/dragon-western-black.svg' },
  { slug: 'lotus-blossom-pink', name: 'Lotus Blossom', description: 'Eight layers of soft pink washi opened petal by petal. Sits flat in the palm.', priceMinor: 52000, compareAtPriceMinor: 60000, categorySlug: 'flowers', stock: 55, difficulty: 'beginner', imageUrl: '/products/lotus-blossom-pink.svg' },
  { slug: 'tulip-trio-stems', name: 'Tulip Trio', description: 'Three tulips on folded stems, in yellow, coral and white. Blown into shape through the base, the traditional way.', priceMinor: 68000, categorySlug: 'flowers', stock: 42, difficulty: 'beginner', imageUrl: '/products/tulip-trio-stems.svg' },
  { slug: 'rose-kawasaki-crimson', name: 'Kawasaki Rose', description: 'The twist-fold rose in crimson chiyogami. The spiral at its centre is one continuous move — the reason this one is not for a first attempt.', priceMinor: 215000, categorySlug: 'flowers', stock: 14, difficulty: 'advanced', imageUrl: '/products/rose-kawasaki-crimson.svg' },
  { slug: 'sonobe-cube-six-unit', name: 'Sonobe Cube', description: 'Six identical units slotted into one another, no glue anywhere. The modular tutorial folds this exact cube.', priceMinor: 88000, categorySlug: 'modular', stock: 36, difficulty: 'intermediate', imageUrl: '/products/sonobe-cube-six-unit.svg' },
  { slug: 'kusudama-flower-ball', name: 'Kusudama Flower Ball', description: 'Thirty flower units in five colours, threaded and tasselled. Hangs from a loop at the top.', priceMinor: 185000, compareAtPriceMinor: 210000, categorySlug: 'modular', stock: 20, difficulty: 'intermediate', imageUrl: '/products/kusudama-flower-ball.svg' },
  { slug: 'star-cluster-icosahedron', name: 'Icosahedral Star Cluster', description: 'Thirty units, twenty points, one shape that holds itself together by tension alone. Drop it and it survives; pull one unit and it does not.', priceMinor: 295000, categorySlug: 'modular', stock: 9, difficulty: 'advanced', imageUrl: '/products/star-cluster-icosahedron.svg' },
  { slug: 'masu-box-nested-set', name: 'Nested Masu Boxes — Set of Three', description: 'Three lidded masu boxes that sit inside one another. Folded from patterned chiyogami, squared to the millimetre.', priceMinor: 74000, categorySlug: 'vessels', stock: 48, difficulty: 'beginner', imageUrl: '/products/masu-box-nested-set.svg' },
  { slug: 'star-bowl-eight-point', name: 'Eight-Point Star Bowl', description: 'A shallow bowl that folds up into eight points, in deep green tant. Holds keys by the door, or nothing at all.', priceMinor: 112000, compareAtPriceMinor: 130000, categorySlug: 'vessels', stock: 26, difficulty: 'intermediate', imageUrl: '/products/star-bowl-eight-point.svg' },
  { slug: 'pigeon-city-white', name: 'City Pigeon', description: 'The little bird of every rooftop, folded from silver-grey kami with a white breast. Simple enough that the tutorial is over in a coffee break, charming enough that nobody minds.', priceMinor: 38000, categorySlug: 'animals', stock: 50, difficulty: 'beginner', imageUrl: '/products/pigeon-city-white.svg' },
  { slug: 'lily-white-washi', name: 'White Lily', description: 'A stemless lily in brilliant white washi, opened by curling each petal around a pencil. One sheet, six petals, no glue.', priceMinor: 82000, compareAtPriceMinor: 95000, categorySlug: 'flowers', stock: 34, difficulty: 'intermediate', imageUrl: '/products/lily-white-washi.svg' },
  { slug: 'twist-bowl-teal', name: 'Twist Bowl', description: 'A low bowl that starts flat and rises when the centre is twisted — a single sheet in teal tant, water-resist folded for the kitchen.', priceMinor: 96000, compareAtPriceMinor: 110000, categorySlug: 'vessels', stock: 28, difficulty: 'intermediate', imageUrl: '/products/twist-bowl-teal.svg' },
];

interface SeedStep {
  instruction: string;
  foldType: 'valley' | 'mountain' | 'reverse' | 'squash' | 'petal' | 'other';
}

const TUTORIALS: { slug: string; title: string; summary: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; estimatedMinutes: number; coverImageUrl: string; steps: SeedStep[] }[] = [
  {
    slug: 'traditional-crane',
    title: 'The Traditional Crane',
    summary: 'The model everyone learns first, and the one that teaches the bird base you will reuse forever.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    coverImageUrl: '/products/crane-traditional-white.svg',
    steps: [
      { instruction: 'Start coloured side up. Fold in half along both diagonals and unfold.', foldType: 'valley' },
      { instruction: 'Turn the paper over. Fold in half horizontally and vertically, then unfold.', foldType: 'mountain' },
      { instruction: 'Collapse into a square base by bringing the four corners together.', foldType: 'squash' },
      { instruction: 'Fold the lower edges to the centre line on both sides.', foldType: 'valley' },
      { instruction: 'Petal-fold the front flap upward, then repeat behind.', foldType: 'petal' },
      { instruction: 'Inside-reverse-fold the two narrow points to form the head and tail.', foldType: 'reverse' },
      { instruction: 'Reverse-fold the tip of the head, then round the wings.', foldType: 'reverse' },
    ],
  },
  {
    slug: 'modular-sonobe-cube',
    title: 'Modular Sonobe Cube',
    summary: 'Six identical units, no glue. The gentlest possible introduction to modular origami.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    coverImageUrl: '/products/sonobe-cube-six-unit.svg',
    steps: [
      { instruction: 'Fold a square in half and unfold to mark the centre.', foldType: 'valley' },
      { instruction: 'Fold both outer edges to the centre crease.', foldType: 'valley' },
      { instruction: 'Fold the top-right and bottom-left corners over at 45 degrees.', foldType: 'valley' },
      { instruction: 'Tuck the opposite corners into the resulting pockets to lock the unit.', foldType: 'other' },
      { instruction: 'Repeat five more times — six units in total.', foldType: 'other' },
      { instruction: 'Slot each unit tab into a neighbouring pocket until the cube closes.', foldType: 'other' },
    ],
  },
  {
    slug: 'city-pigeon',
    title: 'The City Pigeon',
    summary: 'The unkillable little bird of every square, and the fastest route to a first origami that stands on its own two feet.',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    coverImageUrl: '/products/pigeon-city-white.svg',
    steps: [
      { instruction: 'Start coloured side up. Fold both diagonals and unfold to mark the centre.', foldType: 'valley' },
      { instruction: 'Bring the top corner down to the centre, then fold that same point back up to the top edge.', foldType: 'valley' },
      { instruction: 'Fold the model in half along the vertical crease.', foldType: 'mountain' },
      { instruction: 'Inside-reverse-fold the front point down to form the head.', foldType: 'reverse' },
      { instruction: 'Fold the front wing down on an angle, then repeat behind.', foldType: 'valley' },
      { instruction: 'Open the base slightly so the pigeon stands, and round the breast.', foldType: 'other' },
    ],
  },
  {
    slug: 'white-lily',
    title: 'The White Lily',
    summary: 'Six petals, one sheet, and a twist that opens them. The lily teaches the petal fold the crane starts but never finishes.',
    difficulty: 'intermediate',
    estimatedMinutes: 25,
    coverImageUrl: '/products/lily-white-washi.svg',
    steps: [
      { instruction: 'Start white side up. Fold and unfold both diagonals and both mid-lines.', foldType: 'valley' },
      { instruction: 'Collapse the creases into a square base with all four corners meeting at the bottom.', foldType: 'squash' },
      { instruction: 'Fold the lower edges of one flap to the centre crease, unfold, then petal-fold the flap upward.', foldType: 'petal' },
      { instruction: 'Repeat the petal fold on the remaining three flaps so the model becomes four pointed diamonds.', foldType: 'petal' },
      { instruction: 'Fold both outer edges of each diamond to the centre line so the petals narrow.', foldType: 'valley' },
      { instruction: 'Open each petal outward and curl it around a pencil.', foldType: 'other' },
      { instruction: 'Twist the centre gently so the six petals settle into a circle.', foldType: 'other' },
    ],
  },
  {
    slug: 'twist-bowl',
    title: 'The Twist Bowl',
    summary: 'A flat sheet that becomes a bowl when the centre is twisted — a small lesson in collapse folds that looks like magic.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    coverImageUrl: '/products/twist-bowl-teal.svg',
    steps: [
      { instruction: 'Start coloured side up. Fold both diagonals and unfold to mark the centre.', foldType: 'valley' },
      { instruction: 'Fold all four corners to the centre point, then unfold two of them again.', foldType: 'valley' },
      { instruction: 'Pull the corner creases outward until the sheet collapses into a flat pinwheel.', foldType: 'reverse' },
      { instruction: 'Fold every point of the pinwheel to the centre and unfold to precrease the walls.', foldType: 'valley' },
      { instruction: 'Lift the centre and twist it a quarter turn so the walls rise around it.', foldType: 'other' },
      { instruction: 'Press each wall outward so the rim points lock the shape.', foldType: 'squash' },
      { instruction: 'Turn the bowl over and press the base flat on the table.', foldType: 'mountain' },
    ],
  },
  {
    slug: 'masu-box',
    title: 'The Masu Box',
    summary: 'The traditional Japanese gift box — perfectly square, glue-free, and the fold behind the nested set in the shop.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    coverImageUrl: '/products/masu-box-nested-set.svg',
    steps: [
      { instruction: 'Start coloured side down. Fold in half both ways and unfold to mark the centre.', foldType: 'valley' },
      { instruction: 'Fold all four corners to the centre point.', foldType: 'valley' },
      { instruction: 'Fold the top and bottom edges to meet the centre line, then unfold.', foldType: 'valley' },
      { instruction: 'Unfold the two long flaps again, leaving the end triangles folded.', foldType: 'valley' },
      { instruction: 'Lift the short edges upward and pinch the corners so the first walls stand.', foldType: 'reverse' },
      { instruction: 'Tuck the remaining corners inside and press the rim square.', foldType: 'other' },
    ],
  },
  {
    slug: 'blown-tulip',
    title: 'The Blown Tulip',
    summary: 'A garden tulip folded in under ten minutes and inflated the traditional way — the simplest thing in the catalogue that still surprises people.',
    difficulty: 'beginner',
    estimatedMinutes: 12,
    coverImageUrl: '/products/tulip-trio-stems.svg',
    steps: [
      { instruction: 'Start coloured side up. Blintz-fold all four corners to the centre.', foldType: 'valley' },
      { instruction: 'Turn the paper over and fold the four corners to the centre again.', foldType: 'valley' },
      { instruction: 'Tuck the corner points under the folded layers so the packet holds.', foldType: 'other' },
      { instruction: 'Fold the side points inward to form the stem hole, then turn the packet over.', foldType: 'valley' },
      { instruction: 'Blow into the opening at the base so the tulip inflates.', foldType: 'other' },
      { instruction: 'Peel the four petal points outward so the bloom opens.', foldType: 'mountain' },
    ],
  },
  {
    slug: 'folded-koi',
    title: 'The Folded Koi',
    summary: 'The koi that swims across a desk, neck curved not cut — a neat run of reverse folds you will reuse on a dozen other models.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    coverImageUrl: '/products/koi-pair-red-white.svg',
    steps: [
      { instruction: 'Start coloured side up. Fold both diagonals and unfold, then turn the paper over.', foldType: 'valley' },
      { instruction: 'Squash-fold the top corner down so the sheet becomes a diamond base.', foldType: 'squash' },
      { instruction: 'Fold both upper edges to the centre line to shape the back.', foldType: 'valley' },
      { instruction: 'Inside-reverse-fold the lower point back up to start the head.', foldType: 'reverse' },
      { instruction: 'Reverse-fold the point at the other end into the curved tail.', foldType: 'reverse' },
      { instruction: 'Fold the two side fins out, then open the body slightly so the koi stands.', foldType: 'other' },
      { instruction: 'Round the spine with a soft mountain crease down the centre.', foldType: 'mountain' },
    ],
  },
  {
    slug: 'kawasaki-rose',
    title: 'The Kawasaki Rose',
    summary: 'One continuous spiral at its centre — and the reason this is where folders learn to precrease before they fold.',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    coverImageUrl: '/products/rose-kawasaki-crimson.svg',
    steps: [
      { instruction: 'Start coloured side up. Precrease the sheet: fold each corner to the centre and unfold.', foldType: 'valley' },
      { instruction: 'Fold each edge to the centre line and unfold, then rotate 45 degrees and repeat.', foldType: 'valley' },
      { instruction: 'Bring the corners together along the creases and collapse the sheet into a pinwheel.', foldType: 'reverse' },
      { instruction: 'Flatten each pinwheel arm into a diamond by pressing on the existing crease lines.', foldType: 'squash' },
      { instruction: 'Fold the arms inward to narrow the petals, then open the pinwheel partway.', foldType: 'valley' },
      { instruction: 'Twist the centre clockwise so the petals spiral upward.', foldType: 'other' },
      { instruction: 'Curl each petal layer outward around a pencil to open the bloom.', foldType: 'mountain' },
      { instruction: 'Tuck the loose layer on the underside into the base and settle the central spiral.', foldType: 'other' },
    ],
  },
  {
    slug: 'western-dragon',
    title: 'The Western Dragon',
    summary: 'Four hundred steps in the showroom version, forty-five patient minutes in this one. The waterbomb base hides the whole skeleton.',
    difficulty: 'advanced',
    estimatedMinutes: 45,
    coverImageUrl: '/products/dragon-western-black.svg',
    steps: [
      { instruction: 'Start coloured side up. Fold both diagonals and collapse the creases into a waterbomb base.', foldType: 'squash' },
      { instruction: 'Fold both upper edges of the front flap to the centre, unfold, and petal-fold the flap upward.', foldType: 'petal' },
      { instruction: 'Inside-reverse-fold both lower points outward to form the shoulders and hips.', foldType: 'reverse' },
      { instruction: 'Reverse-fold the top point down and forward to start the neck.', foldType: 'reverse' },
      { instruction: 'Reverse-fold the neck at its midpoint to raise the head, then at the tip to shape the snout.', foldType: 'reverse' },
      { instruction: 'Fold the shoulder flaps forward and reverse-fold their tips into the front claws.', foldType: 'reverse' },
      { instruction: 'Fold the tail along the spine, then reverse-fold it twice into an S curve.', foldType: 'reverse' },
      { instruction: 'Sink the wing layer on each side and spread the membranes outward.', foldType: 'other' },
    ],
  },
];

/**
 * The demo fold shipped with the crane tutorial, so the player has a real
 * sequence to animate on a fresh database instead of an empty sheet.
 *
 * Origami is square, so the sheet is 200×200 millimetres with the origin at the
 * top-left. Every step is a straight line across that square; `side` names the
 * half that swings over, by the rule in shared/types.ts — 'left' is the half
 * where (to.x−from.x)(p.y−from.y) − (to.y−from.y)(p.x−from.x) is positive. The
 * sequence is deliberately plain — the four corners in, then three edge folds
 * — because its job is to look like folding, not to be a faithful crane. The
 * instructions and fold types are the crane tutorial's own seven steps, verbatim.
 *
 * Two properties were checked against the replay engine, and BOTH matter:
 *
 *   1. every line actually crosses the shape the previous fold left behind. A
 *      line that misses is not an error anywhere — it folds nothing, and the
 *      step silently plays as a dead frame.
 *   2. every step leaves BOTH faces of the paper visible. Folding a shape
 *      exactly in half covers the stationary half completely, so the flap's
 *      back face becomes the only thing on screen and the model reads as one
 *      flat colour however the two faces are painted. These folds are corners
 *      and offset edges for exactly that reason; the worst step still shows
 *      22% of the minority face.
 */
const CRANE_CRAFT: { id: string; name: string; tutorialSlug: string; data: CraftFileData } = {
  id: 'craft-traditional-crane',
  name: 'Traditional Crane — demo fold',
  tutorialSlug: 'traditional-crane',
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

const DEMO_EMAIL = 'demo@foldify.local';

function seed(): void {
  applySchema();

  const run = db.transaction(() => {
    // Prune rows that are no longer part of the seed, so a changed catalogue
    // REPLACES instead of accumulating over time. Products are pruned before
    // categories because categories RESTRICT on delete. A product referenced
    // by an order cannot be deleted, so it is soft-deleted (unpublished)
    // instead — the row must survive for the order's line items.
    const seedProductSlugs = PRODUCTS.map((product) => product.slug);
    const pSlugs = seedProductSlugs.map(() => '?').join(',');
    db.prepare(
      `DELETE FROM products
       WHERE slug NOT IN (${pSlugs})
         AND id NOT IN (SELECT DISTINCT product_id FROM order_items)`,
    ).run(...seedProductSlugs);
    db.prepare(`UPDATE products SET is_published = 0 WHERE slug NOT IN (${pSlugs})`).run(
      ...seedProductSlugs,
    );

    const seedCategorySlugs = CATEGORIES.map((category) => category.slug);
    const cSlugs = seedCategorySlugs.map(() => '?').join(',');
    db.prepare(`DELETE FROM categories WHERE slug NOT IN (${cSlugs})`).run(...seedCategorySlugs);

    // Tutorials prune the same way; steps cascade away with their tutorial.
    const seedTutorialSlugs = TUTORIALS.map((tutorial) => tutorial.slug);
    const tSlugs = seedTutorialSlugs.map(() => '?').join(',');
    db.prepare(`DELETE FROM tutorials WHERE slug NOT IN (${tSlugs})`).run(...seedTutorialSlugs);

    // Craft files prune by id, so a renamed or retired demo fold is replaced
    // rather than left behind holding its tutorial's UNIQUE tutorial_id.
    db.prepare('DELETE FROM craft_files WHERE id NOT IN (?)').run(CRANE_CRAFT.id);

    // Admin user
    const passwordHash = bcrypt.hashSync(config.seedAdminPassword, 10);
    upsertUserByEmail({
      email: config.seedAdminEmail,
      name: 'Foldify Admin',
      passwordHash,
      role: 'admin',
    });

    // Categories
    const upsertCategory = db.prepare(
      `INSERT INTO categories (slug, name, description)
       VALUES (@slug, @name, @description)
       ON CONFLICT (slug) DO UPDATE SET name = excluded.name, description = excluded.description`,
    );
    for (const category of CATEGORIES) upsertCategory.run(category);

    const categoryIdBySlug = new Map<string, number>();
    for (const row of db.prepare('SELECT id, slug FROM categories').all() as { id: number; slug: string }[]) {
      categoryIdBySlug.set(row.slug, row.id);
    }

    // Products
    for (const product of PRODUCTS) {
      const categoryId = categoryIdBySlug.get(product.categorySlug);
      if (categoryId === undefined) throw new Error(`Unknown category slug: ${product.categorySlug}`);

      upsertProductBySlug({
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceMinor: product.priceMinor,
        compareAtPriceMinor: product.compareAtPriceMinor ?? null,
        imageUrl: product.imageUrl ?? null,
        categoryId,
        stock: product.stock,
        difficulty: product.difficulty,
      });
    }

    const productIdBySlug = new Map<string, number>();
    for (const row of db.prepare('SELECT id, slug FROM products').all() as { id: number; slug: string }[]) {
      productIdBySlug.set(row.slug, row.id);
    }

    // Tutorials and their steps
    const upsertTutorial = db.prepare(
      `INSERT INTO tutorials (slug, title, summary, difficulty, estimated_minutes, cover_image_url)
       VALUES (@slug, @title, @summary, @difficulty, @estimatedMinutes, @coverImageUrl)
       ON CONFLICT (slug) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         difficulty = excluded.difficulty,
         estimated_minutes = excluded.estimated_minutes,
         cover_image_url = excluded.cover_image_url`,
    );
    const upsertStep = db.prepare(
      `INSERT INTO tutorial_steps (tutorial_id, step_number, instruction, fold_type)
       VALUES (@tutorialId, @stepNumber, @instruction, @foldType)
       ON CONFLICT (tutorial_id, step_number) DO UPDATE SET
         instruction = excluded.instruction,
         fold_type = excluded.fold_type`,
    );

    const tutorialIdBySlug = new Map<string, number>();

    for (const tutorial of TUTORIALS) {
      upsertTutorial.run({
        slug: tutorial.slug,
        title: tutorial.title,
        summary: tutorial.summary,
        difficulty: tutorial.difficulty,
        estimatedMinutes: tutorial.estimatedMinutes,
        coverImageUrl: tutorial.coverImageUrl,
      });

      const { id: tutorialId } = db
        .prepare('SELECT id FROM tutorials WHERE slug = ?')
        .get(tutorial.slug) as { id: number };
      tutorialIdBySlug.set(tutorial.slug, tutorialId);

      tutorial.steps.forEach((step, index) => {
        upsertStep.run({
          tutorialId,
          stepNumber: index + 1,
          instruction: step.instruction,
          foldType: step.foldType,
        });
      });
    }

    // The demo fold, and the tutorial_steps pointer back to it. Written after
    // the tutorials so the tutorial id exists; upserted by id so re-running the
    // seed replaces the fold in place instead of colliding on tutorial_id.
    const craftTutorialId = tutorialIdBySlug.get(CRANE_CRAFT.tutorialSlug);
    if (craftTutorialId === undefined) {
      throw new Error(`Unknown tutorial slug for craft file: ${CRANE_CRAFT.tutorialSlug}`);
    }

    db.prepare(
      `INSERT INTO craft_files (id, name, version, tutorial_id, status, data)
       VALUES (@id, @name, 1, @tutorialId, 'deployed', @data)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         tutorial_id = excluded.tutorial_id,
         status = excluded.status,
         data = excluded.data,
         updated_at = datetime('now')`,
    ).run({
      id: CRANE_CRAFT.id,
      name: CRANE_CRAFT.name,
      tutorialId: craftTutorialId,
      data: JSON.stringify(CRANE_CRAFT.data),
    });

    // Revision 1 of the demo fold, so its history is not empty out of the box.
    // Upserted on (craft_file_id, revision) rather than appended, or a reseed
    // would stack an identical snapshot on every run.
    db.prepare(
      `INSERT INTO craft_file_versions (craft_file_id, revision, name, data)
       VALUES (@id, 1, @name, @data)
       ON CONFLICT (craft_file_id, revision) DO UPDATE SET
         name = excluded.name,
         data = excluded.data`,
    ).run({
      id: CRANE_CRAFT.id,
      name: CRANE_CRAFT.name,
      data: JSON.stringify(CRANE_CRAFT.data),
    });

    db.prepare('UPDATE tutorial_steps SET craft_file_id = ? WHERE tutorial_id = ?').run(
      CRANE_CRAFT.id,
      craftTutorialId,
    );

    // Product ↔ tutorial pairings: the folded models sold in the shop, and the
    // tutorials teaching that same fold, joined so the two pages can point at
    // each other. Rebuilt wholesale every run, so the seed stays the single
    // source of truth for which fold pairs appear on the site.
    const PRODUCT_TUTORIAL_PAIRS: ReadonlyArray<readonly [productSlug: string, tutorialSlug: string]> = [
      ['crane-traditional-white', 'traditional-crane'],
      ['sonobe-cube-six-unit', 'modular-sonobe-cube'],
      ['pigeon-city-white', 'city-pigeon'],
      ['lily-white-washi', 'white-lily'],
      ['twist-bowl-teal', 'twist-bowl'],
      ['masu-box-nested-set', 'masu-box'],
      ['tulip-trio-stems', 'blown-tulip'],
      ['koi-pair-red-white', 'folded-koi'],
      ['rose-kawasaki-crimson', 'kawasaki-rose'],
      ['dragon-western-black', 'western-dragon'],
    ];

    db.prepare('DELETE FROM tutorial_product_links').run();
    const linkTutorialToProduct = db.prepare(
      `INSERT INTO tutorial_product_links (tutorial_id, product_id)
       VALUES (@tutorialId, @productId)
       ON CONFLICT (tutorial_id, product_id) DO NOTHING`,
    );
    for (const [productSlug, tutorialSlug] of PRODUCT_TUTORIAL_PAIRS) {
      const productId = productIdBySlug.get(productSlug);
      const tutorialId = tutorialIdBySlug.get(tutorialSlug);
      if (productId === undefined || tutorialId === undefined) {
        throw new Error(`Unknown product/tutorial link pair: ${productSlug} ↔ ${tutorialSlug}`);
      }
      linkTutorialToProduct.run({ tutorialId, productId });
    }

    // ─── Demo customer ───────────────────────────────────────────────
    const demoPasswordHash = bcrypt.hashSync('foldify-demo', 10);
    const demoUser = upsertUserByEmail({
      email: DEMO_EMAIL,
      name: 'Sita Rai',
      passwordHash: demoPasswordHash,
      role: 'customer',
    });
    const demoUserId = demoUser.id;

    // ─── Demo orders ─────────────────────────────────────────────────
    // Idempotency: look up existing orders by user_id + payment_ref and
    // skip re-insertion if the order already exists.
    const existingOrders = db
      .prepare('SELECT id, payment_ref FROM orders WHERE user_id = ?')
      .all(demoUserId) as { id: number; payment_ref: string | null }[];
    const existingOrderRefs = new Set(
      existingOrders.filter((o) => o.payment_ref !== null).map((o) => o.payment_ref),
    );

    type OrderSeed = {
      status: string;
      totalMinor: number;
      paymentRef: string;
      shippingName: string;
      shippingPhone: string;
      shippingAddress: string;
      shippingCity: string;
      createdAt: string;
      items: { productSlug: string; productName: string; unitPriceMinor: number; quantity: number }[];
    };

    const ORDERS: OrderSeed[] = [
      {
        status: 'delivered',
        totalMinor: 128000,
        paymentRef: 'SIM-demo-001',
        shippingName: 'Sita Rai',
        shippingPhone: '9841000001',
        shippingAddress: '12 Battisputali Road',
        shippingCity: 'Kathmandu',
        createdAt: '2026-08-20 10:30:00',
        items: [
          { productSlug: 'koi-pair-red-white', productName: 'Koi Pair', unitPriceMinor: 128000, quantity: 1 },
        ],
      },
      {
        status: 'pending',
        totalMinor: 140000,
        paymentRef: 'SIM-demo-002',
        shippingName: 'Sita Rai',
        shippingPhone: '9841000001',
        shippingAddress: '12 Battisputali Road',
        shippingCity: 'Kathmandu',
        createdAt: '2026-09-05 14:15:00',
        items: [
          { productSlug: 'lotus-blossom-pink', productName: 'Lotus Blossom', unitPriceMinor: 52000, quantity: 1 },
          { productSlug: 'masu-box-nested-set', productName: 'Nested Masu Boxes — Set of Three', unitPriceMinor: 74000, quantity: 1 },
        ],
      },
      {
        status: 'cancelled',
        totalMinor: 45000,
        paymentRef: 'SIM-demo-003',
        shippingName: 'Sita Rai',
        shippingPhone: '9841000001',
        shippingAddress: '12 Battisputali Road',
        shippingCity: 'Kathmandu',
        createdAt: '2026-09-08 09:00:00',
        items: [
          { productSlug: 'crane-traditional-white', productName: 'Traditional Crane', unitPriceMinor: 45000, quantity: 1 },
        ],
      },
    ];

    const insertDemoOrder = db.prepare(
      `INSERT INTO orders (user_id, status, total_minor, currency, payment_ref,
                          shipping_name, shipping_phone, shipping_address, shipping_city, created_at)
       VALUES (@userId, @status, @totalMinor, 'NPR', @paymentRef,
               @shippingName, @shippingPhone, @shippingAddress, @shippingCity, @createdAt)`,
    );
    const insertDemoOrderItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price_minor, quantity)
       VALUES (@orderId, @productId, @productName, @unitPriceMinor, @quantity)`,
    );

    for (const order of ORDERS) {
      if (existingOrderRefs.has(order.paymentRef)) continue;

      const result = insertDemoOrder.run({
        userId: demoUserId,
        status: order.status,
        totalMinor: order.totalMinor,
        paymentRef: order.paymentRef,
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        createdAt: order.createdAt,
      });
      const orderId = Number(result.lastInsertRowid);

      for (const item of order.items) {
        const productId = productIdBySlug.get(item.productSlug);
        if (productId === undefined) throw new Error(`Unknown product slug for demo order: ${item.productSlug}`);
        insertDemoOrderItem.run({
          orderId,
          productId,
          productName: item.productName,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
        });
      }
    }

    // ─── Demo reviews ────────────────────────────────────────────────
    // UNIQUE(product_id, user_id) lets us use INSERT … ON CONFLICT DO NOTHING.
    type ReviewSeed = {
      productSlug: string;
      rating: number;
      body: string;
      createdAt: string;
    };

    const REVIEWS: ReviewSeed[] = [
      {
        productSlug: 'koi-pair-red-white',
        rating: 5,
        body: 'Absolutely stunning. The wet-fold technique gives the koi a lifelike curve I did not expect from paper.',
        createdAt: '2026-08-25 16:40:00',
      },
      {
        productSlug: 'lotus-blossom-pink',
        rating: 4,
        body: 'Beautiful layers of pink washi. A small crease showed on one petal but overall very happy.',
        createdAt: '2026-09-07 11:20:00',
      },
      {
        productSlug: 'crane-traditional-white',
        rating: 4,
        body: 'Clean fold on a nice walnut base. Simple and elegant — exactly what I wanted for my desk.',
        createdAt: '2026-09-09 08:10:00',
      },
      {
        productSlug: 'masu-box-nested-set',
        rating: 3,
        body: 'The boxes are well made but the smallest one arrived with a slightly lifted lid. Acceptable for the price.',
        createdAt: '2026-09-10 13:55:00',
      },
    ];

    const insertReview = db.prepare(
      `INSERT INTO reviews (product_id, user_id, rating, body, created_at)
       VALUES (@productId, @userId, @rating, @body, @createdAt)
       ON CONFLICT (product_id, user_id) DO NOTHING`,
    );

    for (const review of REVIEWS) {
      const productId = productIdBySlug.get(review.productSlug);
      if (productId === undefined) throw new Error(`Unknown product slug for demo review: ${review.productSlug}`);
      insertReview.run({
        productId,
        userId: demoUserId,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
      });
    }

    // ─── Demo customer: Anil Sharma ─────────────────────────────────
    // A second demo account with the same shared demo password, so the admin
    // has more than one customer to look at. Orders guard on user_id +
    // payment_ref and reviews on CONFLICT, exactly like Sita's above.
    const anilUser = upsertUserByEmail({
      email: 'anil.sharma@foldify.local',
      name: 'Anil Sharma',
      passwordHash: demoPasswordHash,
      role: 'customer',
    });
    const anilUserId = anilUser.id;

    const anilExistingOrders = db
      .prepare('SELECT id, payment_ref FROM orders WHERE user_id = ?')
      .all(anilUserId) as { id: number; payment_ref: string | null }[];
    const anilExistingOrderRefs = new Set(
      anilExistingOrders.filter((o) => o.payment_ref !== null).map((o) => o.payment_ref),
    );

    const ANIL_ORDERS: OrderSeed[] = [
      {
        status: 'delivered',
        totalMinor: 38000,
        paymentRef: 'SIM-demo-004',
        shippingName: 'Anil Sharma',
        shippingPhone: '9841000002',
        shippingAddress: '45 Thamel Marg',
        shippingCity: 'Kathmandu',
        createdAt: '2026-08-22 11:00:00',
        items: [
          { productSlug: 'pigeon-city-white', productName: 'City Pigeon', unitPriceMinor: 38000, quantity: 1 },
        ],
      },
      {
        status: 'pending',
        totalMinor: 82000,
        paymentRef: 'SIM-demo-005',
        shippingName: 'Anil Sharma',
        shippingPhone: '9841000002',
        shippingAddress: '45 Thamel Marg',
        shippingCity: 'Kathmandu',
        createdAt: '2026-09-06 16:45:00',
        items: [
          { productSlug: 'lily-white-washi', productName: 'White Lily', unitPriceMinor: 82000, quantity: 1 },
        ],
      },
    ];

    for (const order of ANIL_ORDERS) {
      if (anilExistingOrderRefs.has(order.paymentRef)) continue;

      const result = insertDemoOrder.run({
        userId: anilUserId,
        status: order.status,
        totalMinor: order.totalMinor,
        paymentRef: order.paymentRef,
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        createdAt: order.createdAt,
      });
      const orderId = Number(result.lastInsertRowid);

      for (const item of order.items) {
        const productId = productIdBySlug.get(item.productSlug);
        if (productId === undefined) throw new Error(`Unknown product slug for demo order: ${item.productSlug}`);
        insertDemoOrderItem.run({
          orderId,
          productId,
          productName: item.productName,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
        });
      }
    }

    const ANIL_REVIEWS: ReviewSeed[] = [
      {
        productSlug: 'pigeon-city-white',
        rating: 5,
        body: 'A tiny grey pigeon with a lot of personality. I followed the tutorial the same evening and made my own.',
        createdAt: '2026-08-27 09:30:00',
      },
      {
        productSlug: 'lily-white-washi',
        rating: 4,
        body: 'Gorgeous petals and the twist opened cleanly. The washi is very fine, so handle the rim gently.',
        createdAt: '2026-09-08 18:10:00',
      },
    ];

    for (const review of ANIL_REVIEWS) {
      const productId = productIdBySlug.get(review.productSlug);
      if (productId === undefined) throw new Error(`Unknown product slug for demo review: ${review.productSlug}`);
      insertReview.run({
        productId,
        userId: anilUserId,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
      });
    }

    // ─── Demo customer: Pooja Karki ─────────────────────────────────
    const poojaUser = upsertUserByEmail({
      email: 'pooja.karki@foldify.local',
      name: 'Pooja Karki',
      passwordHash: demoPasswordHash,
      role: 'customer',
    });
    const poojaUserId = poojaUser.id;

    const poojaExistingOrders = db
      .prepare('SELECT id, payment_ref FROM orders WHERE user_id = ?')
      .all(poojaUserId) as { id: number; payment_ref: string | null }[];
    const poojaExistingOrderRefs = new Set(
      poojaExistingOrders.filter((o) => o.payment_ref !== null).map((o) => o.payment_ref),
    );

    const POOJA_ORDERS: OrderSeed[] = [
      {
        status: 'delivered',
        totalMinor: 340000,
        paymentRef: 'SIM-demo-006',
        shippingName: 'Pooja Karki',
        shippingPhone: '9841000003',
        shippingAddress: '8 Durbar Marg',
        shippingCity: 'Kathmandu',
        createdAt: '2026-08-18 13:20:00',
        items: [
          { productSlug: 'dragon-western-black', productName: 'Western Dragon', unitPriceMinor: 340000, quantity: 1 },
        ],
      },
      {
        status: 'processing',
        totalMinor: 96000,
        paymentRef: 'SIM-demo-007',
        shippingName: 'Pooja Karki',
        shippingPhone: '9841000003',
        shippingAddress: '8 Durbar Marg',
        shippingCity: 'Kathmandu',
        createdAt: '2026-09-10 10:05:00',
        items: [
          { productSlug: 'twist-bowl-teal', productName: 'Twist Bowl', unitPriceMinor: 96000, quantity: 1 },
        ],
      },
    ];

    for (const order of POOJA_ORDERS) {
      if (poojaExistingOrderRefs.has(order.paymentRef)) continue;

      const result = insertDemoOrder.run({
        userId: poojaUserId,
        status: order.status,
        totalMinor: order.totalMinor,
        paymentRef: order.paymentRef,
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        createdAt: order.createdAt,
      });
      const orderId = Number(result.lastInsertRowid);

      for (const item of order.items) {
        const productId = productIdBySlug.get(item.productSlug);
        if (productId === undefined) throw new Error(`Unknown product slug for demo order: ${item.productSlug}`);
        insertDemoOrderItem.run({
          orderId,
          productId,
          productName: item.productName,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
        });
      }
    }

    const POOJA_REVIEWS: ReviewSeed[] = [
      {
        productSlug: 'dragon-western-black',
        rating: 5,
        body: 'Every spine and claw is in place and it sits beautifully on the shelf. The most dramatic thing I own that is made of paper.',
        createdAt: '2026-08-25 12:00:00',
      },
      {
        productSlug: 'twist-bowl-teal',
        rating: 4,
        body: 'The twist is tidy and the teal is richer in person. Give the base a press if the walls sit a touch tall.',
        createdAt: '2026-09-12 19:40:00',
      },
    ];

    for (const review of POOJA_REVIEWS) {
      const productId = productIdBySlug.get(review.productSlug);
      if (productId === undefined) throw new Error(`Unknown product slug for demo review: ${review.productSlug}`);
      insertReview.run({
        productId,
        userId: poojaUserId,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
      });
    }

    // ─── Demo contact messages ───────────────────────────────────────
    // No natural unique key — guard with a SELECT on (email, subject) to
    // stay idempotent without adding a unique index.
    type ContactSeed = {
      name: string;
      email: string;
      subject: string;
      body: string;
      isHandled: number;
      createdAt: string;
    };

    const CONTACTS: ContactSeed[] = [
      {
        name: 'Hiro Tanaka',
        email: 'hiro@example.com',
        subject: 'International shipping to Japan',
        body: 'Do you ship internationally? I am in Tokyo and would love to order a Kawasaki Rose for a friend. Could you let me know about shipping costs and estimated delivery time?',
        isHandled: 1,
        createdAt: '2026-08-28 07:45:00',
      },
      {
        name: 'Maya Gurung',
        email: 'maya.gurung@example.com',
        subject: 'Custom order — dragon model',
        body: 'Hi there, I saw the Western Dragon on your site and was wondering if you take custom orders. I would like one in deep blue paper instead of black for a birthday gift next month. Is that possible and what would the lead time be?',
        isHandled: 0,
        createdAt: '2026-09-09 19:30:00',
      },
      {
        name: 'Anil Sharma',
        email: 'anil.sharma@foldify.local',
        subject: 'Gift wrap for the lily order',
        body: 'I have a White Lily on the way and would love it gift-wrapped for my mother\'s birthday. Is that possible on the pending order, and do you include a handwritten note?',
        isHandled: 0,
        createdAt: '2026-09-07 17:20:00',
      },
      {
        name: 'Pooja Karki',
        email: 'pooja.karki@foldify.local',
        subject: 'Restock question — star bowl',
        body: 'The Eight-Point Star Bowl in deep green is lovely but appears out of stock. Will it be restocked, and has my Twist Bowl order shipped yet? Thank you!',
        isHandled: 0,
        createdAt: '2026-09-11 08:50:00',
      },
    ];

    const existingContacts = db
      .prepare('SELECT email, subject FROM contact_messages')
      .all() as { email: string; subject: string }[];
    const existingContactKeys = new Set(existingContacts.map((c) => `${c.email}|${c.subject}`));

    const insertContact = db.prepare(
      `INSERT INTO contact_messages (name, email, subject, body, is_handled, created_at)
       VALUES (@name, @email, @subject, @body, @isHandled, @createdAt)`,
    );

    for (const msg of CONTACTS) {
      const key = `${msg.email}|${msg.subject}`;
      if (existingContactKeys.has(key)) continue;
      insertContact.run(msg);
    }
  });

  run();

  const counts = {
    users: (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c,
    categories: (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as { c: number }).c,
    products: (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c,
    tutorials: (db.prepare('SELECT COUNT(*) AS c FROM tutorials').get() as { c: number }).c,
    tutorialSteps: (db.prepare('SELECT COUNT(*) AS c FROM tutorial_steps').get() as { c: number }).c,
    links: (db.prepare('SELECT COUNT(*) AS c FROM tutorial_product_links').get() as { c: number }).c,
    craftFiles: (db.prepare('SELECT COUNT(*) AS c FROM craft_files').get() as { c: number }).c,
    craftVersions: (db.prepare('SELECT COUNT(*) AS c FROM craft_file_versions').get() as { c: number }).c,
    orders: (db.prepare('SELECT COUNT(*) AS c FROM orders').get() as { c: number }).c,
    orderItems: (db.prepare('SELECT COUNT(*) AS c FROM order_items').get() as { c: number }).c,
    reviews: (db.prepare('SELECT COUNT(*) AS c FROM reviews').get() as { c: number }).c,
    contactMessages: (db.prepare('SELECT COUNT(*) AS c FROM contact_messages').get() as { c: number }).c,
  };

  console.log('');
  console.log(`  Seeded ${config.dbPath}`);
  console.log(`     users           ${counts.users}`);
  console.log(`     categories      ${counts.categories}`);
  console.log(`     products        ${counts.products}`);
  console.log(`     tutorials       ${counts.tutorials}`);
  console.log(`     tutorial_steps  ${counts.tutorialSteps}`);
  console.log(`     product↔tutorial links ${counts.links}`);
  console.log(`     craft_files     ${counts.craftFiles}`);
  console.log(`     craft_versions  ${counts.craftVersions}`);
  console.log(`     orders          ${counts.orders}`);
  console.log(`     order_items     ${counts.orderItems}`);
  console.log(`     reviews         ${counts.reviews}`);
  console.log(`     contact_messages ${counts.contactMessages}`);
  console.log(`     admin login     ${config.seedAdminEmail}`);
  console.log(`     demo logins     ${DEMO_EMAIL} / foldify-demo`);
  console.log(`                     anil.sharma@foldify.local / foldify-demo`);
  console.log(`                     pooja.karki@foldify.local / foldify-demo`);
  console.log('');
  console.log('  Re-running this is safe — every insert is an upsert.');
  console.log('');

  closeDb();
}

seed();
