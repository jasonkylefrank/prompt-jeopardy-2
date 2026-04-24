'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { auth } from '../../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Silently sign in anonymously if not already signed in
    const signIn = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Authentication failed:", error);
      }
    };

    signIn();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? (
        <div className="flex justify-center items-center h-screen bg-slate-950 text-mystery-cyan font-outfit animate-pulse uppercase tracking-[0.3em]">
          Accessing Secure Network...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
