"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const searchParams = useSearchParams();
    const { login, isLoading } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            login(token);
        }
    }, [searchParams, login]);

    // Show a loading spinner while the login process is happening
    if (isLoading) {
        return (
             <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
                 <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-400" />
                    <p className="text-xl mt-4">Finalizing authentication...</p>
                </div>
            </div>
        );
    }

    return null; // Render nothing once loading is done, as a redirect will have occurred
}