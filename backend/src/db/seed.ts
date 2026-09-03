import bcrypt from 'bcryptjs';
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
}

const PRODUCTS: SeedProduct[] = [
  { slug: 'crane-traditional-white', name: 'Traditional Crane', description: 'The classic tsuru, folded from crisp white kami and mounted on a small walnut block. The same model the crane tutorial teaches, if you would rather have one than fold one.', priceMinor: 45000, categorySlug: 'animals', stock: 60, difficulty: 'beginner' },
  { slug: 'crane-flock-mobile', name: 'Crane Flock Mobile — Nine Cranes', description: 'Nine cranes in graded indigo, hung at staggered heights from a brass rod. Turns on its own in a draught.', priceMinor: 165000, compareAtPriceMinor: 190000, categorySlug: 'animals', stock: 24, difficulty: 'intermediate' },
  { slug: 'koi-pair-red-white', name: 'Koi Pair', description: 'Two koi in red and white, wet-folded from tant so the bodies keep a curve instead of sitting flat.', priceMinor: 128000, compareAtPriceMinor: 150000, categorySlug: 'animals', stock: 30, difficulty: 'intermediate' },
  { slug: 'dragon-western-black', name: 'Western Dragon', description: 'Folded from a single square of black double-tissue — no cuts, no glue, every spine and claw accounted for. Roughly four hundred steps.', priceMinor: 340000, categorySlug: 'animals', stock: 8, difficulty: 'advanced' },
  { slug: 'lotus-blossom-pink', name: 'Lotus Blossom', description: 'Eight layers of soft pink washi opened petal by petal. Sits flat in the palm.', priceMinor: 52000, compareAtPriceMinor: 60000, categorySlug: 'flowers', stock: 55, difficulty: 'beginner' },
  { slug: 'tulip-trio-stems', name: 'Tulip Trio', description: 'Three tulips on folded stems, in yellow, coral and white. Blown into shape through the base, the traditional way.', priceMinor: 68000, categorySlug: 'flowers', stock: 42, difficulty: 'beginner' },
  { slug: 'rose-kawasaki-crimson', name: 'Kawasaki Rose', description: 'The twist-fold rose in crimson chiyogami. The spiral at its centre is one continuous move — the reason this one is not for a first attempt.', priceMinor: 215000, categorySlug: 'flowers', stock: 14, difficulty: 'advanced' },
  { slug: 'sonobe-cube-six-unit', name: 'Sonobe Cube', description: 'Six identical units slotted into one another, no glue anywhere. The modular tutorial folds this exact cube.', priceMinor: 88000, categorySlug: 'modular', stock: 36, difficulty: 'intermediate' },
  { slug: 'kusudama-flower-ball', name: 'Kusudama Flower Ball', description: 'Thirty flower units in five colours, threaded and tasselled. Hangs from a loop at the top.', priceMinor: 185000, compareAtPriceMinor: 210000, categorySlug: 'modular', stock: 20, difficulty: 'intermediate' },
  { slug: 'star-cluster-icosahedron', name: 'Icosahedral Star Cluster', description: 'Thirty units, twenty points, one shape that holds itself together by tension alone. Drop it and it survives; pull one unit and it does not.', priceMinor: 295000, categorySlug: 'modular', stock: 9, difficulty: 'advanced' },
  { slug: 'masu-box-nested-set', name: 'Nested Masu Boxes — Set of Three', description: 'Three lidded masu boxes that sit inside one another. Folded from patterned chiyogami, squared to the millimetre.', priceMinor: 74000, categorySlug: 'vessels', stock: 48, difficulty: 'beginner' },
  { slug: 'star-bowl-eight-point', name: 'Eight-Point Star Bowl', description: 'A shallow bowl that folds up into eight points, in deep green tant. Holds keys by the door, or nothing at all.', priceMinor: 112000, compareAtPriceMinor: 130000, categorySlug: 'vessels', stock: 26, difficulty: 'intermediate' },
];

interface SeedStep {
  instruction: string;
  foldType: 'valley' | 'mountain' | 'reverse' | 'squash' | 'petal' | 'other';
}

const TUTORIALS: { slug: string; title: string; summary: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; estimatedMinutes: number; steps: SeedStep[] }[] = [
  {
    slug: 'traditional-crane',
    title: 'The Traditional Crane',
    summary: 'The model everyone learns first, and the one that teaches the bird base you will reuse forever.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
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
    steps: [
      { instruction: 'Fold a square in half and unfold to mark the centre.', foldType: 'valley' },
      { instruction: 'Fold both outer edges to the centre crease.', foldType: 'valley' },
      { instruction: 'Fold the top-right and bottom-left corners over at 45 degrees.', foldType: 'valley' },
      { instruction: 'Tuck the opposite corners into the resulting pockets to lock the unit.', foldType: 'other' },
      { instruction: 'Repeat five more times — six units in total.', foldType: 'other' },
      { instruction: 'Slot each unit tab into a neighbouring pocket until the cube closes.', foldType: 'other' },
    ],
  },
];

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
        imageUrl: null,
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
      `INSERT INTO tutorials (slug, title, summary, difficulty, estimated_minutes)
       VALUES (@slug, @title, @summary, @difficulty, @estimatedMinutes)
       ON CONFLICT (slug) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         difficulty = excluded.difficulty,
         estimated_minutes = excluded.estimated_minutes`,
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

    // Product ↔ tutorial pairings: the folded models sold in the shop, and the
    // tutorials teaching that same fold, joined so the two pages can point at
    // each other. Rebuilt wholesale every run, so the seed stays the single
    // source of truth for which fold pairs appear on the site.
    const PRODUCT_TUTORIAL_PAIRS: ReadonlyArray<readonly [productSlug: string, tutorialSlug: string]> = [
      ['crane-traditional-white', 'traditional-crane'],
      ['sonobe-cube-six-unit', 'modular-sonobe-cube'],
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
  });

  run();

  const counts = {
    users: (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c,
    categories: (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as { c: number }).c,
    products: (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c,
    tutorials: (db.prepare('SELECT COUNT(*) AS c FROM tutorials').get() as { c: number }).c,
    tutorialSteps: (db.prepare('SELECT COUNT(*) AS c FROM tutorial_steps').get() as { c: number }).c,
    links: (db.prepare('SELECT COUNT(*) AS c FROM tutorial_product_links').get() as { c: number }).c,
  };

  console.log('');
  console.log(`  Seeded ${config.dbPath}`);
  console.log(`     users           ${counts.users}`);
  console.log(`     categories      ${counts.categories}`);
  console.log(`     products        ${counts.products}`);
  console.log(`     tutorials       ${counts.tutorials}`);
  console.log(`     tutorial_steps  ${counts.tutorialSteps}`);
  console.log(`     product↔tutorial links ${counts.links}`);
  console.log(`     admin login     ${config.seedAdminEmail}`);
  console.log('');
  console.log('  Re-running this is safe — every insert is an upsert.');
  console.log('');

  closeDb();
}

seed();
