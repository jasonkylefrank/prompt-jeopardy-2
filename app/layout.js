import './globals.css'

export const metadata = {
  title: 'Prompt Jeopardy',
  description: 'A game to learn about LLMs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}