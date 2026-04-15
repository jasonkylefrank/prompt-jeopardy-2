import GameClientPage from "./GameClientPage";

// Tell Next.js which paths to pre-render (required for export)
export function generateStaticParams() {
    // We provide an empty slug so it generates an index.html
    return [{ slug: [''] }];
}
  
// Server Component shell
export default function Page() {
    return <GameClientPage />;
}