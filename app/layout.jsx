import './globals.css';
import Sidebar from './components/Sidebar';
import AppErrorBoundary from './components/AppErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmProvider';
import AuthGate from './components/AuthGate';
import { InteractModeProvider } from './components/InteractModeProvider';

export const metadata = {
  title: 'Fletcher — Mission Control',
  description: 'Fletcher agent dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppErrorBoundary>
          <ToastProvider>
            <ConfirmProvider>
              <InteractModeProvider>
                <AuthGate>
                  <div className="layout">
                    <Sidebar />
                    <main className="main">
                      {children}
                    </main>
                  </div>
                </AuthGate>
              </InteractModeProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
