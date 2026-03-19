'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/agents';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    // Try to validate the token by making an authenticated request
    try {
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Token is valid - store it
        localStorage.setItem('mc_auth_token', token);
        if (!localStorage.getItem('mc_actor')) {
          localStorage.setItem('mc_actor', 'sawyer');
        }
        router.push(redirectTo);
      } else if (response.status === 401) {
        setError('Invalid token. Please check and try again.');
      } else {
        // For other errors (like health being down), still allow login
        // This allows the user to proceed even if health check fails
        localStorage.setItem('mc_auth_token', token);
        if (!localStorage.getItem('mc_actor')) {
          localStorage.setItem('mc_actor', 'sawyer');
        }
        router.push(redirectTo);
      }
    } catch (err) {
      // Network error - still allow login attempt
      localStorage.setItem('mc_auth_token', token);
      if (!localStorage.getItem('mc_actor')) {
        localStorage.setItem('mc_actor', 'sawyer');
      }
      router.push(redirectTo);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f0f',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#1a1a1a',
        padding: '2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
      }}>
        <h1 style={{
          margin: '0 0 1.5rem',
          fontSize: '1.5rem',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          Mission Control
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#888'
            }}>
              Authentication Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your token"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                background: '#0f0f0f',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {error && (
            <div style={{
              color: '#ff6b6b',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: '500',
              background: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </form>
        
        <p style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: '#666',
          textAlign: 'center'
        }}>
          Contact your administrator for access
        </p>
      </div>
    </div>
  );
}
