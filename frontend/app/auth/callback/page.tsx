"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('jwt_token', token);
            router.push('/dashboard');
        } else {
            console.error("OAuth callback did not receive a token.");
            router.push('/login?error=oauth_failed');
        }
    }, [router, searchParams]);

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gray-900 text-white flex items-center justify-center">
            {/* Animated Aurora Background */}
            <div 
                className="absolute inset-0 z-0 opacity-30 mix-blend-soft-light animate-aurora"
                style={{
                  backgroundImage: 'radial-gradient(at 27% 29%, hsla(215, 98%, 60%, 0.2) 0px, transparent 50%), radial-gradient(at 73% 44%, hsla(265, 98%, 60%, 0.2) 0px, transparent 50%), radial-gradient(at 49% 94%, hsla(315, 98%, 60%, 0.2) 0px, transparent 50%)',
                  backgroundSize: '300% 300%',
                }}
            ></div>
            <div className="relative z-10 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-400" />
                <p className="text-xl mt-4">Authenticating, please wait...</p>
            </div>
        </div>
    );
}