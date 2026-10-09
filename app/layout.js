import './globals.css';

export const metadata = {
  title: 'Clean handoff between specialized agents',
  description: 'An application-owned handoff from a Sales agent to a Support agent.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
