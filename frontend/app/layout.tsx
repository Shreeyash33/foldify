import type { Metadata, Viewport } from 'next';
import { Fraunces, JetBrains_Mono, Karla } from 'next/font/google';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/app/contexts/ThemeContext';
import { Providers } from '@/app/providers';
import { Navbar } from '@/app/components/layout/Navbar';
import { Footer } from '@/app/components/layout/Footer';

/**
 * Three families, all subset to latin only — three font families on a slow
 * connection is already a lot, and the target machines are not fast.
 *
 * Display: Fraunces, using its SOFT and WONK axes (see globals.css) so it
 * reads as tactile rather than as a default serif.
 * Body: Karla.
 * Utility: JetBrains Mono, for step numbers, labels, prices and data —
 * origami instructions are technical diagrams and their labels belong in a
 * technical face.
 */

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const karla = Karla({
  variable: '--font-karla',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Foldify — origami paper, kits and folds',
    template: '%s · Foldify',
  },
  description:
    'Origami paper, kits and tools, with step-by-step fold tutorials for every model we sell.',
  applicationName: 'Foldify',
  openGraph: {
    title: 'Foldify — origami paper, kits and folds',
    description:
      'Origami paper, kits and tools, with step-by-step fold tutorials for every model we sell.',
    siteName: 'Foldify',
    type: 'website',
    locale: 'en_GB',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /**
   * The ONLY place a hex literal is allowed outside the token blocks in
   * globals.css. This becomes a <meta name="theme-color"> tag that the browser
   * reads before any stylesheet has loaded, so it cannot reference a CSS
   * variable. Keep both values in step with --paper in globals.css; without
   * them the browser chrome flashes white on a dark-mode load.
   */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#151413' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    /* suppressHydrationWarning: the inline script below adds `.dark` to this
       element before React ever runs, so the server's className and the
       client's will legitimately differ. Without it React would treat that as
       a hydration error, re-render the tree, and undo the script's work. */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${karla.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking, synchronous, and first: the browser runs this while
            parsing <head>, before the first paint. Reading localStorage in an
            effect instead would paint the light theme and then flip to dark,
            and a theme flash on every load is the most visible possible flaw
            in a design-led project. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
