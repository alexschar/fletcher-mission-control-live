'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [groupedEntries, setGroupedEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    fetchJournalData();
  }, [days]);

  async function fetchJournalData() {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/api/journal?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      setEntries(data.entries || []);
      setGroupedEntries(data.grouped_by_date || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'unknown') return 'Unknown Date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  function formatShortDate(dateStr) {
    if (!dateStr || dateStr === 'unknown') return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
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
    
    const parts = text.split(/(\[[A-Z]+\])/g);
    
    return parts.map((part, i) => {
      const match = part.match(/^\[([A-Z]+)\]$/);
      if (match) {
        return <span key={i} className="mr-2">{renderConfidenceBadge(match[1])}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  function getEntryIcon(type) {
    return type === 'transit' ? '🌟' : '📖';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-red-800 mb-2">Error Loading Journal</h1>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchJournalData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Astrology Journal</h1>
              <p className="text-gray-600 mt-1">Historical archive of daily transits and interpretations</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Link 
                href="/astrology"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                ← Today's View
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-indigo-600">{entries.length}</div>
            <div className="text-sm text-gray-600">Total Entries</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-amber-600">
              {entries.filter(e => e.type === 'transit').length}
            </div>
            <div className="text-sm text-gray-600">Transit Records</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">
              {entries.filter(e => e.type === 'interpretation').length}
            </div>
            <div className="text-sm text-gray-600">Interpretations</div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📓</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Journal is Empty</h3>
            <p className="text-gray-600 mb-4">
              No astrology entries found for the last {days} days.
            </p>
            <p className="text-sm text-gray-500">
              The pipeline runs daily at 5:30 AM and 6:00 AM. Check back tomorrow!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Entry List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">History</h2>
              {groupedEntries.map((group) => (
                <div key={group.date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">{formatShortDate(group.date)}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.transits.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedEntry?.id === entry.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{getEntryIcon(entry.type)}</span>
                          <span className="text-sm font-medium text-gray-900">Transits</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {entry.metadata?.transit_count || 0}
                          </span>
                        </div>
                      </button>
                    ))}
                    {group.interpretations.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedEntry?.id === entry.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{getEntryIcon(entry.type)}</span>
                          <span className="text-sm font-medium text-gray-900">Interpretation</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Entry Detail */}
            <div className="lg:col-span-2">
              {selectedEntry ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getEntryIcon(selectedEntry.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedEntry.title}</h3>
                        <p className="text-sm text-gray-500">{formatDate(selectedEntry.date)}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedEntry.type === 'transit' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedEntry.type === 'transit' ? 'Transit Data' : 'Interpretation'}
                    </span>
                  </div>

                  <div className="prose prose-gray max-w-none">
                    {selectedEntry.type === 'transit' ? (
                      <div className="space-y-4">
                        <p className="text-gray-700">{selectedEntry.summary}</p>
                        {selectedEntry.metadata?.planetary_positions && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Planetary Positions</h4>
                            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                              {JSON.stringify(selectedEntry.metadata.planetary_positions, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {renderInterpretationContent(selectedEntry.metadata?.interpretation_full || selectedEntry.summary)}
                      </div>
                    )}
                  </div>

                  {selectedEntry.metadata?.confidence_breakdown && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence Breakdown</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedEntry.metadata.confidence_breakdown).map(([label, count]) => 
                          count > 0 ? (
                            <div key={label} className="flex items-center gap-1">
                              {renderConfidenceBadge(label)}
                              <span className="text-sm text-gray-600">×{count}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    <p>Entry ID: {selectedEntry.id}</p>
                    <p>Created: {new Date(selectedEntry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">🔮</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Entry</h3>
                  <p className="text-gray-600">
                    Click on any entry from the history to view its details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Astrology Intelligence Pipeline • Phase 1</p>
          <p className="mt-1">Natal Chart: Waco, TX • Feb 12, 1998 • 11:00 PM CST</p>
        </div>
      </div>
    </div>
  );
}
