import { Suspense } from 'react';
import ContestantClientPage from "./ContestantClientPage";

// Tell Next.js which paths to pre-render (required for export)
export function generateStaticParams() {
    // We provide an empty slug so it generates an index.html
    return [{ slug: [''] }];
}
  
// Server Component shell
export default function Page({ params }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ContestantClientPage params={params} />
        </Suspense>
    );
}