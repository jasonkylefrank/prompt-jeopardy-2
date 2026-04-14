'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
      <h1 className="text-5xl font-bold text-gray-800 mb-8">Welcome to the Game!</h1>
      <div className="flex gap-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl cursor-pointer"
          onClick={() => router.push('/join')}
        >
          Join Game
        </button>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl cursor-pointer"
          onClick={() => router.push('/admin')}
        >
          Start a New Game (as Host)
        </button>
      </div>
    </div>
  );
}
