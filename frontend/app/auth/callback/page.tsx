"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            // Store the token and redirect to the dashboard
            localStorage.setItem('jwt_token', token);
            router.push('/dashboard');
        } else {
            // Handle error case, maybe redirect to login with an error message
            console.error("OAuth callback did not receive a token.");
            router.push('/login?error=oauth_failed');
        }
    }, [router, searchParams]);

    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
            <div className="text-center">
                <p className="text-xl">Authenticating, please wait...</p>
            </div>
        </div>
    );
}