import { NextResponse } from 'next/server';
const db = require('../../../lib/database');

export async function GET() {
  try {
    // Initialize and get backend status
    await db.initialize();
    const status = db.getBackendStatus();
    
    return NextResponse.json({
      supabaseConnected: status.supabaseConnected,
      backend: status.backend,
      tablesExist: status.tablesExist,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      supabaseConnected: false,
      backend: 'json',
      tablesExist: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
