"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const searchParams = useSearchParams();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            login(token); // Use the login function from context
        } else {
            // Handle error
            console.error("OAuth callback did not receive a token.");
            window.location.href = '/login?error=oauth_failed';
        }
    }, [searchParams, login]);

    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
             <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-400" />
                <p className="text-xl mt-4">Finalizing authentication...</p>
            </div>
        </div>
    );
}