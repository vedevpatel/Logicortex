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
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const verifyToken = useCallback(async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, [verifyToken]);

  const login = (token: string) => {
    localStorage.setItem('jwt_token', token);
    verifyToken(token);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};