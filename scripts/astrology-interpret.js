#!/usr/bin/env node
/**
 * Astrology Interpret - Transit Interpreter
 * Runs at 6:00 AM daily via cron (after signals job)
 * Reads uninterpreted transit life_signals and generates interpretations via Anthropic API
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from host .env
const envPath = path.join(process.env.HOME || '/Users/fletcheragent', '.openclaw', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'https://fletcher-mission-control-live.vercel.app';
const MC_API_TOKEN = process.env.MC_API_TOKEN || 'mc_test_token_12345';

// Load natal chart from immutable source
const NATAL_CHART_PATH = path.join(process.env.HOME || '/Users/fletcheragent', 'scripts', 'natal-chart.json');

// Confidence labels for interpretations
const CONFIDENCE_LABELS = {
  FACT: 'FACT - Astronomically verifiable position or aspect',
  ANALYSIS: 'ANALYSIS - Pattern recognition based on established astrological correlations',
  INTERPRETATION: 'INTERPRETATION - Synthesized meaning applying standard techniques',
  EXPLORATORY: 'EXPLORATORY - Speculative or experimental reading, lower confidence'
};

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function loadNatalChart() {
  try {
    const chartData = fs.readFileSync(NATAL_CHART_PATH, 'utf8');
    return JSON.parse(chartData);
  } catch (error) {
    log(`ERROR: Failed to load natal chart: ${error.message}`);
    process.exit(1);
  }
}

async function fetchUninterpretedTransits() {
  log('Fetching uninterpreted transit signals...');
  
  try {
    // Get recent astrology_transit signals that haven't been interpreted yet
    const response = await fetch(
      `${MISSION_CONTROL_URL}/api/life-signals?source=astrology_pipeline&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${MC_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const signals = await response.json();
    
    // Filter for transit signals that need interpretation
    const transitSignals = signals.filter(s => 
      s.signal_type === 'astrology_transit' && 
      s.metadata && 
      s.metadata.interpretation_ready === false
    );

    log(`Found ${transitSignals.length} uninterpreted transit signals`);
    return transitSignals;
  } catch (error) {
    log(`ERROR: Failed to fetch transit signals: ${error.message}`);
    throw error;
  }
}

function buildInterpretationPrompt(natalChart, transitData) {
  const today = new Date().toISOString().split('T')[0];
  
  return `You are an expert astrologer providing a daily transit interpretation. 

NATAL CHART (immutable source truth):
- Sun: ${natalChart.planets.sun.sign} ${natalChart.planets.sun.degree.toFixed(2)}° (House ${natalChart.planets.sun.house})
- Moon: ${natalChart.planets.moon.sign} ${natalChart.planets.moon.degree.toFixed(2)}° (House ${natalChart.planets.moon.house})
- Mercury: ${natalChart.planets.mercury.sign} ${natalChart.planets.mercury.degree.toFixed(2)}° (House ${natalChart.planets.mercury.house})
- Venus: ${natalChart.planets.venus.sign} ${natalChart.planets.venus.degree.toFixed(2)}° (House ${natalChart.planets.venus.house})
- Mars: ${natalChart.planets.mars.sign} ${natalChart.planets.mars.degree.toFixed(2)}° (House ${natalChart.planets.mars.house})
- Jupiter: ${natalChart.planets.jupiter.sign} ${natalChart.planets.jupiter.degree.toFixed(2)}° (House ${natalChart.planets.jupiter.house})
- Saturn: ${natalChart.planets.saturn.sign} ${natalChart.planets.saturn.degree.toFixed(2)}° (House ${natalChart.planets.saturn.house})
- Ascendant: ${natalChart.angles.ascendant.sign} ${natalChart.angles.ascendant.degree.toFixed(2)}°
- Midheaven: ${natalChart.angles.midheaven.sign} ${natalChart.angles.midheaven.degree.toFixed(2)}°

Key Natal Aspects:
${natalChart.natal_aspects.map(a => `- ${a.from} ${a.aspect} ${a.to} (orb: ${a.orb.toFixed(2)}°)`).join('\n')}

TODAY'S TRANSITS (${today}):
${JSON.stringify(transitData.transits || [], null, 2)}

Generate a daily transit interpretation with the following structure:

1. HEADLINE: One sentence summary of the day's energy (label with [ANALYSIS])

2. KEY TRANSITS: List the 2-3 most significant transits today with:
   - The exact transit (e.g., "Transiting Mars conjunct Natal Sun")
   - Confidence label [FACT, ANALYSIS, INTERPRETATION, or EXPLORATORY]
   - Brief meaning

3. THEMES: 2-3 major themes for the day with confidence labels

4. ADVICE: Practical guidance with confidence labels

Use these confidence labels consistently:
- [FACT] for astronomical positions/aspects
- [ANALYSIS] for pattern recognition
- [INTERPRETATION] for synthesized meaning
- [EXPLORATORY] for speculative insights

Keep the total response under 800 words. Be specific to the actual transits occurring today.`;
}

async function generateInterpretation(natalChart, transitData) {
  log('Generating interpretation via Anthropic API...');

  if (!ANTHROPIC_API_KEY) {
    log('WARNING: ANTHROPIC_API_KEY not found, using fallback interpretation');
    return generateFallbackInterpretation(transitData);
  }

  const prompt = buildInterpretationPrompt(natalChart, transitData);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const interpretation = data.content?.[0]?.text || data.completion;
    
    log('Successfully generated interpretation');
    return interpretation;
  } catch (error) {
    log(`ERROR: Anthropic API failed: ${error.message}`);
    log('Falling back to basic interpretation');
    return generateFallbackInterpretation(transitData);
  }
}

function generateFallbackInterpretation(transitData) {
  const today = new Date().toISOString().split('T')[0];
  const transitCount = transitData.transits?.length || 0;
  
  return `[ANALYSIS] Daily Energy Overview for ${today}

[FACT] ${transitCount} planetary transits are active today.

[ANALYSIS] Current planetary positions are interacting with your natal chart placements. The exact nature of these interactions depends on the specific degrees involved.

[INTERPRETATION] This is a day to observe how the current cosmic weather resonates with your personal patterns. Pay attention to:
- Opportunities that align with your natural strengths
- Challenges that invite growth
- Synchronicities that confirm you're on the right path

[EXPLORATORY] Consider journaling about any notable events or feelings today to build your personal transit database.

---
Note: This is a fallback interpretation. For detailed analysis, ensure ANTHROPIC_API_KEY is configured.`;
}

async function storeInterpretationSignal(transitSignalId, interpretation, transitData) {
  const today = new Date().toISOString().split('T')[0];
  
  const signal = {
    source: 'astrology_pipeline',
    category: 'system',
    signal_type: 'astrology_interpretation',
    title: `Daily Interpretation - ${today}`,
    body: interpretation.slice(0, 2000),
    metadata: {
      transit_date: today,
      parent_transit_signal_id: transitSignalId,
      interpretation_full: interpretation,
      planetary_positions: transitData.planetary_positions || {},
      confidence_breakdown: extractConfidenceLabels(interpretation)
    },
    priority: 'normal',
    status: 'unread'
  };

  log('Storing interpretation signal...');

  try {
    const response = await fetch(`${MISSION_CONTROL_URL}/api/life-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MC_API_TOKEN}`
      },
      body: JSON.stringify(signal)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`Successfully stored interpretation signal with ID: ${result.id}`);
    return result;
  } catch (error) {
    log(`ERROR: Failed to store interpretation signal: ${error.message}`);
    throw error;
  }
}

async function markTransitAsInterpreted(transitSignalId) {
  log(`Marking transit signal ${transitSignalId} as interpreted...`);
  
  try {
    const response = await fetch(`${MISSION_CONTROL_URL}/api/life-signals/${transitSignalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MC_API_TOKEN}`
      },
      body: JSON.stringify({
        metadata: { interpretation_ready: true }
      })
    });

    if (!response.ok) {
      // PATCH endpoint might not exist, log but don't fail
      log(`Note: Could not update transit signal status (endpoint may not exist)`);
      return;
    }

    log('Transit signal marked as interpreted');
  } catch (error) {
    log(`Note: Could not update transit signal: ${error.message}`);
  }
}

function extractConfidenceLabels(interpretation) {
  const counts = { FACT: 0, ANALYSIS: 0, INTERPRETATION: 0, EXPLORATORY: 0 };
  
  Object.keys(counts).forEach(label => {
    const regex = new RegExp(`\\[${label}\\]`, 'g');
    const matches = interpretation.match(regex);
    counts[label] = matches ? matches.length : 0;
  });
  
  return counts;
}

async function main() {
  log('=== Astrology Interpret Pipeline Starting ===');

  const natalChart = loadNatalChart();
  log(`Loaded natal chart for ${natalChart.name}`);

  try {
    const transitSignals = await fetchUninterpretedTransits();
    
    if (transitSignals.length === 0) {
      log('No uninterpreted transit signals found. Exiting.');
      process.exit(0);
    }

    // Process the most recent transit signal
    const transitSignal = transitSignals[0];
    log(`Processing transit signal: ${transitSignal.id}`);

    const transitData = transitSignal.metadata || {};
    const interpretation = await generateInterpretation(natalChart, transitData);
    
    await storeInterpretationSignal(transitSignal.id, interpretation, transitData);
    await markTransitAsInterpreted(transitSignal.id);

    log('=== Pipeline completed successfully ===');
    process.exit(0);
  } catch (error) {
    log(`=== Pipeline failed: ${error.message} ===`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  fetchUninterpretedTransits, 
  generateInterpretation, 
  storeInterpretationSignal,
  loadNatalChart 
};
