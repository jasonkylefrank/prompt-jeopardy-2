import './globals.css'
import { Outfit, Inter } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Prompt Jeopardy',
  description: 'A game to learn about LLMs',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
       <body className="font-inter bg-slate-950 text-slate-200 min-h-screen relative overflow-x-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-violet-900/20 to-transparent -z-10 pointer-events-none" />
          <div className="relative z-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            {children}
          </div>
       </body>
    </html>
  )
}