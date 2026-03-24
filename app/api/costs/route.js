import { NextResponse } from 'next/server';
const db = require('../../../lib/database');
const { authMiddleware } = require('../../../lib/auth');

function computeCostSummary(costs) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  
  // Handle both old format (timestamp, cost_est) and new format (created_at, calculated_cost)
  const dailyCosts = costs.filter(c => {
    const date = c.created_at || c.timestamp;
    return date?.startsWith(today);
  });
  const monthlyCosts = costs.filter(c => {
    const date = c.created_at || c.timestamp;
    return date?.startsWith(month);
  });
  
  const dailyTotal = dailyCosts.reduce((s, c) => s + Number(c.calculated_cost || c.cost_est || 0), 0);
  const monthlyTotal = monthlyCosts.reduce((s, c) => s + Number(c.calculated_cost || c.cost_est || 0), 0);
  
  // Group by date
  const byDate = {};
  costs.forEach(c => {
    const d = (c.created_at || c.timestamp)?.slice(0, 10) || 'unknown';
    if (!byDate[d]) byDate[d] = { date: d, total: 0, count: 0 };
    byDate[d].total += Number(c.calculated_cost || c.cost_est || 0);
    byDate[d].count++;
  });
  
  // Normalize entries for frontend
  const normalizedEntries = costs.map(c => ({
    ...c,
    timestamp: c.created_at || c.timestamp,
    cost_est: c.calculated_cost || c.cost_est || 0,
    provider: c.provider || '-',
    model: c.model || '-'
  }));
  
  return {
    dailyTotal,
    monthlyTotal,
    adjustedProjectedMonthlySpend: monthlyTotal,
    daily: Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    entries: normalizedEntries.slice(-20).reverse()
  };
}

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const costs = await db.getCosts();
    const summary = computeCostSummary(costs || []);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    
    // Store using Supabase schema field names (costs table)
    await db.addCostEntry({
      agent: body.agent,
      model: body.model,
      input_tokens: body.input_tokens || body.tokens_in || 0,
      output_tokens: body.output_tokens || body.tokens_out || 0,
      calculated_cost: body.calculated_cost || body.cost_est || 0,
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
