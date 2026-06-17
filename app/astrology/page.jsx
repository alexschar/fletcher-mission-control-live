'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AstrologyPage() {
  const [todayData, setTodayData] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodayData();
  }, []);

  async function fetchTodayData() {
    try {
      setLoading(true);
      
      // Fetch today's transit and interpretation signals
      const response = await fetch(`${API_BASE}/api/life-signals?source=astrology_pipeline&limit=10`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const signals = await response.json();
      
      // Find today's transit and interpretation
      const today = new Date().toISOString().split('T')[0];
      
      const transit = signals.find(s => 
        s.signal_type === 'astrology_transit' && 
        s.metadata?.transit_date === today
      );
      
      const interp = signals.find(s => 
        s.signal_type === 'astrology_interpretation' &&
        s.metadata?.transit_date === today
      );
      
      setTodayData(transit || null);
      setInterpretation(interp || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Today';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  function renderConfidenceBadge(label) {
    const colors = {
      FACT: 'bg-green-100 text-green-800 border-green-200',
      ANALYSIS: 'bg-blue-100 text-blue-800 border-blue-200',
      INTERPRETATION: 'bg-purple-100 text-purple-800 border-purple-200',
      EXPLORATORY: 'bg-amber-100 text-amber-800 border-amber-200'
    };
    
    const colorClass = colors[label] || colors.EXPLORATORY;
    
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${colorClass}`}>
        {label}
      </span>
    );
  }

  function renderInterpretationContent(text) {
    if (!text) return null;
    
    // Split by confidence labels and render with badges
    const parts = text.split(/(\[[A-Z]+\])/g);
    
    return parts.map((part, i) => {
      const match = part.match(/^\[([A-Z]+)\]$/);
      if (match) {
        return <span key={i} className="mr-2">{renderConfidenceBadge(match[1])}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-red-800 mb-2">Error Loading Astrology Data</h1>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchTodayData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const hasData = todayData || interpretation;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Astrology Intelligence</h1>
              <p className="text-gray-600 mt-1">Daily transits and interpretations based on natal chart</p>
            </div>
            <Link 
              href="/journal"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View Journal →
            </Link>
          </div>
        </div>

        {/* Today's Date */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{formatDate(today)}</h2>
        </div>

        {!hasData ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4">🌙</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transit Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Today's astrology data hasn't been generated yet. The pipeline runs at 5:30 AM and 6:00 AM daily.
            </p>
            <div className="text-sm text-gray-500">
              <p>Pipeline schedule:</p>
              <ul className="mt-2 space-y-1">
                <li>5:30 AM - Transit calculation</li>
                <li>6:00 AM - Interpretation generation</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Transit Data Card */}
            {todayData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🌟 Planetary Transits</h3>
                  <span className="text-sm text-gray-500">
                    {todayData.metadata?.transits?.length || 0} active transits
                  </span>
                </div>
                
                {todayData.metadata?.transits && todayData.metadata.transits.length > 0 ? (
                  <div className="space-y-3">
                    {todayData.metadata.transits.slice(0, 5).map((transit, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="font-medium text-gray-900">{transit.transiting_planet}</span>
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="text-gray-700">{transit.aspect}</span>
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="font-medium text-gray-900">{transit.natal_planet}</span>
                        </div>
                        <span className="text-sm text-gray-500">orb: {transit.orb?.toFixed(1)}°</span>
                      </div>
                    ))}
                    {todayData.metadata.transits.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        +{todayData.metadata.transits.length - 5} more transits
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No major transits detected for today.</p>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                  <p>Chart hash: {todayData.metadata?.natal_chart_hash || 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Interpretation Card */}
            {interpretation ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">📖 Daily Interpretation</h3>
                  {interpretation.metadata?.confidence_breakdown && (
                    <div className="flex gap-2 text-xs">
                      {Object.entries(interpretation.metadata.confidence_breakdown).map(([label, count]) => 
                        count > 0 ? (
                          <span key={label} className="text-gray-500">
                            {label}: {count}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
                
                <div className="prose prose-gray max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {renderInterpretationContent(interpretation.metadata?.interpretation_full || interpretation.body)}
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence Labels:</h4>
                  <div className="flex flex-wrap gap-2">
                    {renderConfidenceBadge('FACT')}
                    <span className="text-sm text-gray-600">Astronomically verifiable</span>
                    {renderConfidenceBadge('ANALYSIS')}
                    <span className="text-sm text-gray-600">Pattern recognition</span>
                    {renderConfidenceBadge('INTERPRETATION')}
                    <span className="text-sm text-gray-600">Synthesized meaning</span>
                    {renderConfidenceBadge('EXPLORATORY')}
                    <span className="text-sm text-gray-600">Speculative insights</span>
                  </div>
                </div>
              </div>
            ) : todayData ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">⏳ Interpretation Pending</h3>
                <p className="text-amber-800">
                  Transit data has been recorded. The interpretation will be generated at 6:00 AM.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Based on natal chart: Waco, TX • Feb 12, 1998 • 11:00 PM CST</p>
          <p className="mt-1">Data source: FreeAstroAPI • Interpretation: Claude (Anthropic)</p>
        </div>
      </div>
    </div>
  );
}
