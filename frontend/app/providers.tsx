'use client';

import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { CartProvider } from '@/app/contexts/CartContext';
import { ToastProvider } from '@/app/contexts/ToastContext';

/**
 * All four contexts, composed once.
 *
 * Order matters a little: Theme is outermost because everything renders inside
 * it, and Toast is innermost because its own UI uses PaperSurface and wants to
 * sit above the rest of the tree.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
