import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'Fletcher — Mission Control',
  description: 'Fletcher agent dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
