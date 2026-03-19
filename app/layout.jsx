import './globals.css';
import Sidebar from './components/Sidebar';
import AppErrorBoundary from './components/AppErrorBoundary';

export const metadata = {
  title: 'Fletcher — Mission Control',
  description: 'Fletcher agent dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppErrorBoundary>
          <div className="layout">
            <Sidebar />
            <main className="main">
              {children}
            </main>
          </div>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
