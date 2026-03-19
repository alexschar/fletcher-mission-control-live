import './globals.css';
import Sidebar from './components/Sidebar';
import AppErrorBoundary from './components/AppErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmProvider';

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
              <div className="layout">
                <Sidebar />
                <main className="main">
                  {children}
                </main>
              </div>
            </ConfirmProvider>
          </ToastProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
