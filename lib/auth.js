/**
 * Authentication middleware for Mission Control
 * Checks for valid Bearer token in Authorization header
 */

import { NextResponse } from 'next/server';

/**
 * Validates the Authorization header against MC_AUTH_TOKEN
 * @param {Request} request - The incoming request
 * @returns {NextResponse|null} - Returns 401 response if invalid, null if valid
 */
export function authMiddleware(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authorization header missing' },
      { status: 401 }
    );
  }
  
  // Check for Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Invalid authorization format. Use: Bearer <token>' },
      { status: 401 }
    );
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // WORKAROUND: Accept both the hardcoded test token AND MC_AUTH_TOKEN from env
  // This resolves the deployment mismatch where production has MC_AUTH_TOKEN
  // but some clients still use mc_test_token_12345
  const validTokens = [
    'mc_test_token_12345',
    process.env.MC_AUTH_TOKEN
  ].filter(Boolean);
  
  if (!validTokens.includes(token)) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
  
  // Token is valid
  return null;
}

/**
 * Higher-order function to wrap API route handlers with auth
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with auth
 */
export function withAuth(handler) {
  return async function (request) {
    const authError = authMiddleware(request);
    if (authError) {
      return authError;
    }
    return handler(request);
  };
}
