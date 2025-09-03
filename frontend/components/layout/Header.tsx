"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BrainCircuit } from 'lucide-react';

export const Header = () => {
    const { isAuthenticated, user, logout, isLoading } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                <Link href="/" className="flex items-center space-x-2">
                    <BrainCircuit className="h-7 w-7 text-blue-400" />
                    <span className="text-xl font-bold text-white">Logicortex</span>
                </Link>

                <div className="hidden md:flex items-center space-x-6 text-gray-300">
                    <Link href="/features" className="hover:text-white transition-colors">Features</Link>
                    <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </div>

                <div className="flex items-center space-x-4">
                    {/* --- THIS LOGIC IS NOW CHANGED --- */}
                    {!isLoading && isAuthenticated && (
                        <>
                            <span className="text-sm text-gray-400 hidden sm:block">Welcome, {user?.email}</span>
                            <Link href="/dashboard" passHref>
                                <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">Dashboard</Button>
                            </Link>
                            <Button onClick={logout} variant="ghost" className="text-gray-400 hover:text-white">Logout</Button>
                        </>
                    )}
                    {/* If loading or not authenticated, this section will be empty */}
                </div>
            </nav>
        </header>
    );
};