import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { YearProvider } from '@/hooks/useYear';
import { CurrencyProvider } from '@/hooks/useCurrency';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from '@/routes';

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <YearProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </YearProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
