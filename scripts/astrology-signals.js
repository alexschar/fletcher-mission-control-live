#!/usr/bin/env node
/**
 * Astrology Signals - Daily Transit Fetcher
 * Runs at 5:30 AM daily via cron
 * Fetches transit data from FreeAstroAPI and stores as life_signal
 * 
 * Cron: 30 5 * * * /usr/local/bin/node ~/scripts/astrology-signals.js
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

const FREEASTRO_API_KEY = process.env.FREEASTRO_API_KEY;
const FREEASTRO_API_URL = 'https://api.freeastroapi.com/api/v1/transits/calculate';
const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'https://fletcher-mission-control-live.vercel.app';
const MC_API_TOKEN = process.env.MC_API_TOKEN || 'mc_test_token_12345';

// Load natal chart from immutable source
const NATAL_CHART_PATH = path.join(process.env.HOME || '/Users/fletcheragent', 'scripts', 'natal-chart.json');

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

function parseBirthDate(birthDate) {
  const [year, month, day] = birthDate.split('-').map(Number);
  return { year, month, day };
}

function parseBirthTime(birthTime) {
  const [hour, minute] = birthTime.split(':').map(Number);
  return { hour, minute };
}

async function fetchTransits(natalChart) {
  const { year, month, day } = parseBirthDate(natalChart.birth_date);
  const { hour, minute } = parseBirthTime(natalChart.birth_time);
  
  // Build payload per FreeAstroAPI schema
  const payload = {
    natal: {
      name: natalChart.name || 'Alex',
      year: year,
      month: month,
      day: day,
      time_known: natalChart.birth_time_known !== false,
      hour: hour,
      minute: minute,
      lat: natalChart.latitude,
      lng: natalChart.longitude
    },
    current_city: natalChart.birth_place || 'Waco, Texas, USA',
    current_lat: natalChart.latitude,
    current_lng: natalChart.longitude,
    transit_date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
    tz_str: natalChart.timezone || 'America/Chicago'
  };

  log('Fetching transits from FreeAstroAPI...');
  log(`Payload: ${JSON.stringify(payload, null, 2)}`);
  
  try {
    const response = await fetch(FREEASTRO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FREEASTRO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.text();
    
    if (!response.ok) {
      log(`API error response: ${responseData}`);
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const data = JSON.parse(responseData);
    
    // Count transits from response
    const transitCount = data.transits?.length || 
                        data.aspects?.length || 
                        data.transit_planets?.length || 
                        0;
    
    log(`Successfully fetched ${transitCount} transits`);
    return data;
  } catch (error) {
    log(`ERROR: Failed to fetch transits: ${error.message}`);
    throw error;
  }
}

async function storeTransitSignal(transitData) {
  const today = new Date().toISOString().split('T')[0];
  
  // Extract transits/aspects from various possible response formats
  const transits = transitData.transits || 
                   transitData.aspects || 
                   [];
  
  const transitPlanets = transitData.transit_planets || 
                         transitData.current_planets || 
                         {};
  
  const natalPlanets = transitData.natal_planets || 
                       {};
  
  // Build a summary of key aspects
  const aspectSummary = transits.slice(0, 5).map(t => {
    // Handle FreeAstroAPI response format: p1, p2, type, orb
    const p1 = t.p1 || t.transiting_planet || t.planet1 || t.transit_planet || 'Unknown';
    const p2 = t.p2 || t.natal_planet || t.planet2 || 'Unknown';
    const aspect = t.type || t.aspect_type || t.aspect || 'aspect';
    const orb = t.orb || t.orb_degrees || 0;
    // Clean up planet names (remove (N) and (T) suffixes for readability)
    const cleanP1 = p1.replace(/\s*\(T\)$/, '').replace(/\s*\(N\)$/, '');
    const cleanP2 = p2.replace(/\s*\(T\)$/, '').replace(/\s*\(N\)$/, '');
    // Determine which is transit vs natal based on suffix or position
    const transitingPlanet = p1.includes('(T)') ? cleanP1 : p2.includes('(T)') ? cleanP2 : cleanP1;
    const natalPlanet = p1.includes('(N)') ? cleanP1 : p2.includes('(N)') ? cleanP2 : cleanP2;
    return `${transitingPlanet} ${aspect} ${natalPlanet} (orb ${parseFloat(orb).toFixed(1)}°)`;
  }).join('; ');
  
  const signal = {
    source: 'astrology',
    category: 'system',
    signal_type: 'astrology_transit',
    title: `Daily Transits - ${today}`,
    body: aspectSummary || `Transit data for ${today}. ${transits.length} aspects calculated.`,
    metadata: {
      transit_date: today,
      transits: transits,
      transit_planets: transitPlanets,
      natal_planets: natalPlanets,
      planetary_positions: transitData.planetary_positions || transitPlanets,
      houses: transitData.houses || {},
      angles: transitData.angles || {},
      interpretation_ready: false,
      api_response_hash: require('crypto').createHash('md5').update(JSON.stringify(transitData)).digest('hex').slice(0, 8)
    },
    priority: 'normal',
    status: 'unread'
  };

  log('Storing transit signal to Mission Control...');
  log(`Signal body: ${signal.body}`);

  try {
    const response = await fetch(`${MISSION_CONTROL_URL}/api/life-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MC_API_TOKEN}`
      },
      body: JSON.stringify(signal)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      log(`Store error response: ${responseText}`);
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const result = JSON.parse(responseText);
    log(`Successfully stored transit signal with ID: ${result.id}`);
    return result;
  } catch (error) {
    log(`ERROR: Failed to store transit signal: ${error.message}`);
    throw error;
  }
}

async function main() {
  log('=== Astrology Signals Pipeline Starting ===');
  
  if (!FREEASTRO_API_KEY) {
    log('ERROR: FREEASTRO_API_KEY not found in environment');
    process.exit(1);
  }

  const natalChart = loadNatalChart();
  log(`Loaded natal chart for ${natalChart.name} (${natalChart.birth_date})`);
  log(`Birth: ${natalChart.birth_place} (${natalChart.latitude}, ${natalChart.longitude})`);

  try {
    const transitData = await fetchTransits(natalChart);
    const signal = await storeTransitSignal(transitData);
    log('=== Pipeline completed successfully ===');
    log(`Signal ID: ${signal.id}`);
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

module.exports = { fetchTransits, storeTransitSignal, loadNatalChart };
