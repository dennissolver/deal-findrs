import { NextRequest, NextResponse } from 'next/server'

interface IMRequest {
  opportunity: {
    name: string
    address: string
    city: string
    state: string
    numLots: number
    numDwellings: number
    landStage: string
    landownerName?: string
  }
  result: {
    status: 'green' | 'amber' | 'red'
    score: number
    gmScore: number
    deRiskScore: number
    riskScore: number
    financials: {
      totalCost: number
      totalRevenue: number
      grossMargin: number
      grossMarginPercent: number
    }
    passedCriteria: Array<{ name: string; points: number }>
    attentionItems: Array<{ name: string; detail: string; severity: string }>
    summary: string
    pathToGreen: string[]
    recommendations: string[]
  }
  companyName?: string
  generatedBy?: string
}

export async function POST(request: NextRequest) {
  try {
    const data: IMRequest = await request.json()
    const { opportunity, result, companyName, generatedBy } = data

    const statusColor = result.status === 'green' ? '#10B981' : 
                        result.status === 'amber' ? '#F59E0B' : '#EF4444'
    
    const statusEmoji = result.status === 'green' ? '🟢' : 
                        result.status === 'amber' ? '🟡' : '🔴'

    // Generate HTML for the Investment Memorandum
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Investment Memorandum - ${opportunity.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; line-height: 1.6; }
    .page { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 3px solid ${statusColor}; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1f2937; }
    .logo span { color: #f59e0b; }
    .title { font-size: 28px; font-weight: bold; margin-top: 20px; }
    .subtitle { color: #6b7280; font-size: 16px; margin-top: 5px; }
    .status-badge { 
      display: inline-block; 
      padding: 8px 16px; 
      background: ${statusColor}; 
      color: white; 
      border-radius: 20px; 
      font-weight: bold; 
      font-size: 14px;
      margin-top: 15px;
    }
    .section { margin-bottom: 30px; }
    .section-title { 
      font-size: 18px; 
      font-weight: bold; 
      color: #1f2937; 
      border-bottom: 2px solid #e5e7eb; 
      padding-bottom: 8px; 
      margin-bottom: 15px; 
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .card { background: #f9fafb; border-radius: 8px; padding: 15px; }
    .card-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .card-value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .card-value.green { color: #10b981; }
    .card-value.amber { color: #f59e0b; }
    .card-value.red { color: #ef4444; }
    .summary { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 0 8px 8px 0; }
    .criteria-item { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px; 
      background: #f0fdf4; 
      border-radius: 6px; 
      margin-bottom: 8px; 
    }
    .criteria-points { color: #10b981; font-weight: bold; }
    .attention-item { 
      padding: 12px; 
      border-radius: 6px; 
      margin-bottom: 8px; 
      border-left: 4px solid;
    }
    .attention-high { background: #fef2f2; border-color: #ef4444; }
    .attention-medium { background: #fffbeb; border-color: #f59e0b; }
    .attention-low { background: #f9fafb; border-color: #9ca3af; }
    .path-item { 
      display: flex; 
      align-items: flex-start; 
      gap: 12px; 
      margin-bottom: 12px; 
    }
    .path-number { 
      width: 24px; 
      height: 24px; 
      background: #10b981; 
      color: white; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 12px; 
      font-weight: bold;
      flex-shrink: 0;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb; 
      color: #9ca3af; 
      font-size: 12px; 
      text-align: center; 
    }
    .score-breakdown { display: flex; gap: 20px; margin-top: 15px; }
    .score-item { text-align: center; flex: 1; }
    .score-value { font-size: 32px; font-weight: bold; }
    .score-label { font-size: 12px; color: #6b7280; }
    @media print {
      .page { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">🏗️ Deal<span>Findrs</span></div>
      <div class="title">${opportunity.name}</div>
      <div class="subtitle">${opportunity.address}, ${opportunity.city}, ${opportunity.state}</div>
      <div class="status-badge">${statusEmoji} ${result.status.toUpperCase()} LIGHT - Score: ${result.score}/100</div>
    </div>

    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">${result.summary}</div>
    </div>

    <div class="section">
      <div class="section-title">Financial Overview</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Total Project Cost</div>
          <div class="card-value">$${(result.financials.totalCost / 1000000).toFixed(2)}M</div>
        </div>
        <div class="card">
          <div class="card-label">Total Revenue</div>
          <div class="card-value">$${(result.financials.totalRevenue / 1000000).toFixed(2)}M</div>
        </div>
        <div class="card">
          <div class="card-label">Gross Margin</div>
          <div class="card-value green">$${(result.financials.grossMargin / 1000000).toFixed(2)}M</div>
        </div>
        <div class="card">
          <div class="card-label">Gross Margin %</div>
          <div class="card-value ${result.financials.grossMarginPercent >= 25 ? 'green' : 'amber'}">${result.financials.grossMarginPercent.toFixed(1)}%</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Score Breakdown</div>
      <div class="score-breakdown">
        <div class="score-item">
          <div class="score-value">${result.gmScore}</div>
          <div class="score-label">GM Score</div>
        </div>
        <div class="score-item">
          <div class="score-value" style="color: #10b981">+${result.deRiskScore}</div>
          <div class="score-label">De-Risk Bonus</div>
        </div>
        <div class="score-item">
          <div class="score-value" style="color: #ef4444">${result.riskScore}</div>
          <div class="score-label">Risk Penalties</div>
        </div>
        <div class="score-item">
          <div class="score-value" style="color: ${statusColor}">${result.score}</div>
          <div class="score-label">Total Score</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Property Details</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Lots / Dwellings</div>
          <div class="card-value" style="font-size: 20px;">${opportunity.numLots || opportunity.numDwellings} units</div>
        </div>
        <div class="card">
          <div class="card-label">Land Stage</div>
          <div class="card-value" style="font-size: 20px;">${opportunity.landStage?.replace('_', ' ').toUpperCase() || 'TBC'}</div>
        </div>
      </div>
    </div>

    ${result.passedCriteria.length > 0 ? `
    <div class="section">
      <div class="section-title">De-Risk Factors Applied (${result.passedCriteria.length})</div>
      ${result.passedCriteria.map(c => `
        <div class="criteria-item">
          <span>✓ ${c.name}</span>
          <span class="criteria-points">+${c.points} pts</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${result.attentionItems.length > 0 ? `
    <div class="section">
      <div class="section-title">Requires Attention (${result.attentionItems.length})</div>
      ${result.attentionItems.map(item => `
        <div class="attention-item attention-${item.severity}">
          <strong>${item.name}</strong>
          <p style="margin-top: 5px; font-size: 14px; color: #6b7280;">${item.detail}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${result.status !== 'green' && result.pathToGreen.length > 0 ? `
    <div class="section">
      <div class="section-title">Path to GREEN</div>
      ${result.pathToGreen.map((item, i) => `
        <div class="path-item">
          <div class="path-number">${i + 1}</div>
          <div>${item}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${result.recommendations.length > 0 ? `
    <div class="section">
      <div class="section-title">Recommendations</div>
      <ul style="padding-left: 20px;">
        ${result.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by ${companyName || 'DealFindrs'} • ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="margin-top: 5px;">This assessment is for internal use only and does not constitute financial advice.</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Return HTML (client can use window.print() or a PDF library)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${opportunity.name.replace(/[^a-z0-9]/gi, '-')}-IM.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating IM:', error)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
