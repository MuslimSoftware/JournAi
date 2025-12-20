import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { FocusModeProvider } from '../../contexts/FocusModeContext';
import { SidebarProvider } from '../../contexts/SidebarContext';

interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  return (
    <ThemeProvider>
      <FocusModeProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </FocusModeProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}
