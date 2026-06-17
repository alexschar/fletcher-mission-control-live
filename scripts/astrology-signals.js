#!/usr/bin/env node
/**
 * Astrology Signals - Daily Transit Fetcher
 * Runs at 5:30 AM daily via cron
 * Fetches transit data from FreeAstroAPI and stores as life_signal
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

async function fetchTransits(natalChart) {
  const today = new Date().toISOString().split('T')[0];
  
  const payload = {
    birth_date: natalChart.birth_date,
    birth_time: natalChart.birth_time,
    birth_time_known: natalChart.birth_time_known,
    latitude: natalChart.latitude,
    longitude: natalChart.longitude,
    timezone: natalChart.timezone,
    house_system: natalChart.house_system,
    transit_date: today,
    planets: natalChart.planets,
    angles: natalChart.angles,
    houses: natalChart.houses
  };

  log('Fetching transits from FreeAstroAPI...');
  
  try {
    const response = await fetch(FREEASTRO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FREEASTRO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    log(`Successfully fetched ${data.transits?.length || 0} transits`);
    return data;
  } catch (error) {
    log(`ERROR: Failed to fetch transits: ${error.message}`);
    throw error;
  }
}

async function storeTransitSignal(transitData) {
  const today = new Date().toISOString().split('T')[0];
  
  const signal = {
    source: 'astrology_pipeline',
    category: 'system',
    signal_type: 'astrology_transit',
    title: `Daily Transits - ${today}`,
    body: `Raw transit data for ${today}. ${transitData.transits?.length || 0} active transits detected.`,
    metadata: {
      transit_date: today,
      transits: transitData.transits || [],
      planetary_positions: transitData.planetary_positions || {},
      interpretation_ready: false,
      natal_chart_hash: require('crypto').createHash('md5').update(JSON.stringify(transitData)).digest('hex').slice(0, 8)
    },
    priority: 'normal',
    status: 'unread'
  };

  log('Storing transit signal to Mission Control...');

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

  try {
    const transitData = await fetchTransits(natalChart);
    const signal = await storeTransitSignal(transitData);
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

module.exports = { fetchTransits, storeTransitSignal, loadNatalChart };
