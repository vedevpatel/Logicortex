"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { GoogleIcon, GitHubIcon } from '@/components/ui/icons';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const response = await fetch('http://localhost:8000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) router.push('/login');
        else {
            const errorData = await response.json();
            setError(errorData.detail || 'Failed to sign up');
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
                <h1 className="text-3xl font-bold text-center text-white">Create your Account</h1>
                
                 {/* ... (social login buttons and separator are the same as login page) ... */}

                <form onSubmit={handleSubmit} className="space-y-6">
                   {/* ... (email and password inputs are unchanged) ... */}
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 transition-colors">
                        Create Account
                    </Button>
                </form>
                <p className="text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-blue-400 hover:underline">
                        Log in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
