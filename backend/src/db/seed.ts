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

const CATEGORIES = [
  { slug: 'paper', name: 'Origami Paper', description: 'Kami, tant, foil and washi in every size.' },
  { slug: 'kits', name: 'Fold Kits', description: 'Everything for one model, boxed.' },
  { slug: 'tools', name: 'Tools', description: 'Bone folders, scoring boards, trimmers.' },
  { slug: 'books', name: 'Books', description: 'Diagram collections and technique guides.' },
] as const;

interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  categorySlug: string;
  stock: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const PRODUCTS: SeedProduct[] = [
  { slug: 'kami-150-classic-100', name: 'Kami 150mm — Classic 100 Sheets', description: 'Single-sided kami in a hundred colours. The default paper for practice: cheap enough to waste, crisp enough to hold a crease.', priceMinor: 45000, categorySlug: 'paper', stock: 120, difficulty: 'beginner' },
  { slug: 'kami-75-mini-200', name: 'Kami 75mm — Mini 200 Sheets', description: 'Small format for modular units and lucky stars. Two hundred sheets, twenty colours.', priceMinor: 38000, categorySlug: 'paper', stock: 90, difficulty: 'beginner' },
  { slug: 'tant-150-muted-48', name: 'Tant 150mm — Muted 48 Sheets', description: 'Textured Japanese tant with a faint tooth. Holds wet-folded curves without cracking.', priceMinor: 92000, categorySlug: 'paper', stock: 40, difficulty: 'intermediate' },
  { slug: 'foil-paper-200-gold', name: 'Foil Paper 200mm — Gold', description: 'Aluminium-backed foil. Takes a sharp crease and stays where you put it; unforgiving of mistakes.', priceMinor: 78000, categorySlug: 'paper', stock: 35, difficulty: 'advanced' },
  { slug: 'washi-chiyogami-150', name: 'Washi Chiyogami 150mm — 24 Sheets', description: 'Screen-printed chiyogami patterns on soft washi. For finished pieces, not practice.', priceMinor: 165000, categorySlug: 'paper', stock: 18, difficulty: 'intermediate' },
  { slug: 'kit-crane-starter', name: 'Crane Starter Kit', description: 'Thirty sheets, an illustrated card, and a bone folder. Folds one classic crane, then twenty-nine more.', priceMinor: 120000, categorySlug: 'kits', stock: 50, difficulty: 'beginner' },
  { slug: 'kit-kusudama-ball', name: 'Kusudama Ball Kit', description: 'Modular flower ball: thirty units, colour-sorted, with an assembly order that actually makes sense.', priceMinor: 185000, categorySlug: 'kits', stock: 28, difficulty: 'intermediate' },
  { slug: 'kit-dragon-advanced', name: 'Advanced Dragon Kit', description: 'One large sheet of double-tissue, a crease pattern, and no hand-holding. Budget an afternoon.', priceMinor: 340000, categorySlug: 'kits', stock: 12, difficulty: 'advanced' },
  { slug: 'bone-folder-bamboo', name: 'Bamboo Bone Folder', description: 'Traditional shape, bamboo rather than bone. Flattens a crease without polishing a shine into the paper.', priceMinor: 65000, categorySlug: 'tools', stock: 60, difficulty: 'beginner' },
  { slug: 'scoring-board-a4', name: 'A4 Scoring Board', description: 'Grooved board with a stylus. Turns guesswork about thirds and fifths into a measurement.', priceMinor: 210000, categorySlug: 'tools', stock: 22, difficulty: 'intermediate' },
  { slug: 'paper-trimmer-a4', name: 'A4 Paper Trimmer', description: 'Guillotine trimmer with a grid bed. Square paper is most of the battle; this makes it square.', priceMinor: 290000, categorySlug: 'tools', stock: 15, difficulty: 'beginner' },
  { slug: 'book-classic-diagrams', name: 'Classic Diagrams, Vol. 1', description: 'Forty traditional models diagrammed in standard notation — valley, mountain, reverse, squash.', priceMinor: 145000, categorySlug: 'books', stock: 33, difficulty: 'intermediate' },
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
        imageUrl: null,
        categoryId,
        stock: product.stock,
        difficulty: product.difficulty,
      });
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

      tutorial.steps.forEach((step, index) => {
        upsertStep.run({
          tutorialId,
          stepNumber: index + 1,
          instruction: step.instruction,
          foldType: step.foldType,
        });
      });
    }
  });

  run();

  const counts = {
    users: (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c,
    categories: (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as { c: number }).c,
    products: (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c,
    tutorials: (db.prepare('SELECT COUNT(*) AS c FROM tutorials').get() as { c: number }).c,
    tutorialSteps: (db.prepare('SELECT COUNT(*) AS c FROM tutorial_steps').get() as { c: number }).c,
  };

  console.log('');
  console.log(`  Seeded ${config.dbPath}`);
  console.log(`     users           ${counts.users}`);
  console.log(`     categories      ${counts.categories}`);
  console.log(`     products        ${counts.products}`);
  console.log(`     tutorials       ${counts.tutorials}`);
  console.log(`     tutorial_steps  ${counts.tutorialSteps}`);
  console.log(`     admin login     ${config.seedAdminEmail}`);
  console.log('');
  console.log('  Re-running this is safe — every insert is an upsert.');
  console.log('');

  closeDb();
}

seed();
