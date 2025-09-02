"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GoogleIcon, GitHubIcon } from '@/components/ui/icons';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const response = await fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('jwt_token', data.access_token);
            router.push('/dashboard');
        } else {
            const errorData = await response.json();
            setError(errorData.detail || 'Failed to login');
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gray-900 text-white flex items-center justify-center p-4">
            {/* Animated Aurora Background */}
            <div 
                className="absolute inset-0 z-0 opacity-30 mix-blend-soft-light animate-aurora"
                style={{
                  backgroundImage: 'radial-gradient(at 27% 29%, hsla(215, 98%, 60%, 0.2) 0px, transparent 50%), radial-gradient(at 73% 44%, hsla(265, 98%, 60%, 0.2) 0px, transparent 50%), radial-gradient(at 49% 94%, hsla(315, 98%, 60%, 0.2) 0px, transparent 50%)',
                  backgroundSize: '300% 300%',
                }}
            ></div>

            <motion.div 
                className="relative z-10 w-full max-w-md p-8 space-y-6 bg-gray-800/80 rounded-2xl shadow-2xl backdrop-blur-lg border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <h1 className="text-3xl font-bold text-center text-white">Login to Logicortex</h1>
                
                <div className="space-y-4">
                    <a href="http://localhost:8000/api/v1/auth/google/login" className="block">
                        <Button variant="outline" className="w-full bg-white text-gray-700 hover:bg-gray-100 font-medium">
                            <GoogleIcon /> Continue with Google
                        </Button>
                    </a>
                    <a href="http://localhost:8000/api/v1/auth/github/login" className="block">
                        <Button variant="outline" className="w-full bg-gray-900/80 text-white hover:bg-gray-700 font-medium border-gray-600">
                            <GitHubIcon /> Continue with GitHub
                        </Button>
                    </a>
                </div>

                <div className="flex items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="mx-4 text-gray-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 transition-colors font-semibold">
                        Login
                    </Button>
                </form>
                <p className="text-center text-sm text-gray-400">
                    Don't have an account?{" "}
                    <Link href="/signup" className="font-medium text-blue-400 hover:underline">
                        Sign up
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}