'use client';

import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { FontSizeProvider } from '@/app/contexts/FontSizeContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { CartProvider } from '@/app/contexts/CartContext';
import { ToastProvider } from '@/app/contexts/ToastContext';

/**
 * All five contexts, composed once.
 *
 * Order matters a little: Theme and FontSize are outermost because everything
 * renders inside them, and Toast is innermost because its own UI uses
 * PaperSurface and wants to sit above the rest of the tree.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartProvider>
        </AuthProvider>
      </FontSizeProvider>
    </ThemeProvider>
  );
}
