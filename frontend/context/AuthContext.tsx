"use client";

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>; // Return a promise
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading by default
  const router = useRouter();

  const verifyToken = useCallback(async (token: string) => {
    setIsLoading(true); // Set loading true at the start of verification
    try {
      const response = await fetch('http://localhost:8888/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('jwt_token');
        setUser(null);
      }
    } catch (error) {
      console.error("Token verification failed", error);
      localStorage.removeItem('jwt_token');
      setUser(null);
    } finally {
      setIsLoading(false); // Set loading false at the end
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false); // If no token, we're done loading
    }
  }, [verifyToken]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem('jwt_token', token);
    await verifyToken(token); // Wait for verification to complete
    router.push('/dashboard');
  }, [verifyToken, router]);

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setUser(null);
    router.push('/');
  };


  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      // Handle case where user is logged out or token is missing
      logout();
      throw new Error('User is not authenticated.');
    }

    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    return fetch(url, { ...options, headers });
  }, []); // We can add logout to dependency array if linter complains


  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};