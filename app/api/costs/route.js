import { NextResponse } from 'next/server';
const db = require('../../../lib/database');

function computeCostSummary(costs) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  
  const dailyCosts = costs.filter(c => c.created_at?.startsWith(today));
  const monthlyCosts = costs.filter(c => c.created_at?.startsWith(month));
  
  const dailyTotal = dailyCosts.reduce((s, c) => s + Number(c.calculated_cost || 0), 0);
  const monthlyTotal = monthlyCosts.reduce((s, c) => s + Number(c.calculated_cost || 0), 0);
  
  // Group by date
  const byDate = {};
  costs.forEach(c => {
    const d = c.created_at?.slice(0, 10) || 'unknown';
    if (!byDate[d]) byDate[d] = { date: d, total: 0, count: 0 };
    byDate[d].total += Number(c.calculated_cost || 0);
    byDate[d].count++;
  });
  
  return {
    dailyTotal,
    monthlyTotal,
    adjustedProjectedMonthlySpend: monthlyTotal, // For compatibility with existing code
    daily: Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    entries: costs.slice(-20).reverse()
  };
}

export async function GET() {
  try {
    const costs = await db.getCosts();
    const summary = computeCostSummary(costs || []);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    await db.addCostEntry({
      agent: body.agent,
      model: body.model,
      input_tokens: body.input_tokens || 0,
      output_tokens: body.output_tokens || 0,
      calculated_cost: body.cost_est || body.calculated_cost || 0
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
