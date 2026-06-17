import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const { getLifeSignals } = require('../../../lib/supabase');

/**
 * GET /api/journal
 * Returns astrology journal entries (transits and interpretations)
 * Query params:
 *   - days: number of days to look back (default: 30)
 *   - type: 'transit', 'interpretation', or 'all' (default: all)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const days = parseInt(searchParams.get('days') || '30', 10);
    const type = searchParams.get('type') || 'all';
    
    // Calculate cutoff date
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Fetch astrology-related life signals
    const filters = {
      since: cutoff,
      source: 'astrology_pipeline',
      limit: 100
    };
    
    const signals = await getLifeSignals(filters);
    
    // Filter by type if specified
    let filteredSignals = signals;
    if (type !== 'all') {
      filteredSignals = signals.filter(s => {
        if (type === 'transit') return s.signal_type === 'astrology_transit';
        if (type === 'interpretation') return s.signal_type === 'astrology_interpretation';
        return true;
      });
    }
    
    // Transform signals into journal entries
    const journalEntries = filteredSignals.map(signal => {
      const metadata = signal.metadata || {};
      
      return {
        id: signal.id,
        date: metadata.transit_date || signal.created_at?.split('T')[0],
        type: signal.signal_type === 'astrology_transit' ? 'transit' : 'interpretation',
        title: signal.title,
        summary: signal.body,
        created_at: signal.created_at,
        metadata: {
          transit_count: metadata.transits?.length,
          planetary_positions: metadata.planetary_positions,
          confidence_breakdown: metadata.confidence_breakdown,
          parent_transit_signal_id: metadata.parent_transit_signal_id
        }
      };
    });
    
    // Group by date
    const groupedByDate = journalEntries.reduce((acc, entry) => {
      const date = entry.date || 'unknown';
      if (!acc[date]) {
        acc[date] = { date, transits: [], interpretations: [] };
      }
      
      if (entry.type === 'transit') {
        acc[date].transits.push(entry);
      } else {
        acc[date].interpretations.push(entry);
      }
      
      return acc;
    }, {});
    
    return NextResponse.json({
      entries: journalEntries,
      grouped_by_date: Object.values(groupedByDate).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      ),
      total: journalEntries.length,
      days_queried: days
    });
    
  } catch (error) {
    console.error('[journal GET]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
