import { chat } from './client';
import {
  OpportunityInput,
  AssessmentCriteria,
  AssessmentResult,
  CriterionResult,
  FinancialSummary,
  RAGStatus,
  DEFAULT_CRITERIA,
} from './types';

// Calculate financial summary
function calculateFinancials(input: OpportunityInput): FinancialSummary {
  const units = input.numDwellings || input.numLots;
  
  const landCost = input.landPurchasePrice;
  const infraCost = input.infrastructureCosts;
  const constructionCost = input.constructionPerUnit * units;
  const contingency = (landCost + infraCost + constructionCost) * (input.contingencyPercent / 100);
  
  const totalCost = landCost + infraCost + constructionCost + contingency;
  const totalRevenue = input.avgSalePrice * units;
  const grossMargin = totalRevenue - totalCost;
  const grossMarginPercent = (grossMargin / totalRevenue) * 100;
  
  return {
    totalCost,
    totalRevenue,
    grossMargin,
    grossMarginPercent,
    costPerUnit: totalCost / units,
    revenuePerUnit: input.avgSalePrice,
    profitPerUnit: grossMargin / units,
  };
}

// Evaluate all criteria
function evaluateCriteria(
  input: OpportunityInput,
  financials: FinancialSummary,
  criteria: AssessmentCriteria
): {
  passed: CriterionResult[];
  failed: CriterionResult[];
  attention: CriterionResult[];
  gmScore: number;
  deRiskScore: number;
  riskScore: number;
} {
  const passed: CriterionResult[] = [];
  const failed: CriterionResult[] = [];
  const attention: CriterionResult[] = [];
  
  let deRiskScore = 0;
  let riskScore = 0;
  
  // GM Score: GM% × 3 (capped at 75 for 25%+)
  const gmScore = Math.min(financials.grossMarginPercent * 3, 75);
  
  // Check GM thresholds
  if (financials.grossMarginPercent >= criteria.greenGMThreshold) {
    passed.push({
      name: `Gross Margin ≥${criteria.greenGMThreshold}%`,
      passed: true,
      points: 0,
      detail: `Current: ${financials.grossMarginPercent.toFixed(1)}%`,
    });
  } else if (financials.grossMarginPercent >= criteria.amberGMThreshold) {
    attention.push({
      name: `Gross Margin below ${criteria.greenGMThreshold}% threshold`,
      passed: false,
      points: 0,
      severity: 'medium',
      detail: `Current: ${financials.grossMarginPercent.toFixed(1)}% | Required: ${criteria.greenGMThreshold}%`,
    });
  } else {
    failed.push({
      name: `Gross Margin below ${criteria.amberGMThreshold}% minimum`,
      passed: false,
      points: 0,
      severity: 'critical',
      detail: `Current: ${financials.grossMarginPercent.toFixed(1)}% | Minimum: ${criteria.amberGMThreshold}%`,
    });
  }
  
  // Critical criteria
  if (criteria.requireProofOfOwnership) {
    if (input.hasProofOfOwnership) {
      passed.push({ name: 'Proof of Ownership Verified', passed: true, points: 0 });
    } else {
      failed.push({ name: 'Proof of Ownership Required', passed: false, points: 0, severity: 'critical' });
    }
  }
  
  if (criteria.requireNoLegalDisputes) {
    if (!input.hasLegalDisputes) {
      passed.push({ name: 'No Legal Disputes', passed: true, points: 0 });
    } else {
      failed.push({ name: 'Active Legal Disputes', passed: false, points: 0, severity: 'critical' });
    }
  }
  
  // De-risk factors
  if (input.hasDAApproval) {
    const pts = criteria.deRiskFactors.daApproved;
    deRiskScore += pts;
    passed.push({ name: 'DA Approved', passed: true, points: pts });
  }
  
  if (input.hasVendorFinance) {
    const pts = criteria.deRiskFactors.vendorFinance;
    deRiskScore += pts;
    passed.push({ name: 'Vendor Finance Available', passed: true, points: pts });
  }
  
  if (input.hasFixedPriceConstruction) {
    const pts = criteria.deRiskFactors.fixedPriceConstruction;
    deRiskScore += pts;
    passed.push({ name: 'Fixed-Price Construction (F2K)', passed: true, points: pts });
  }
  
  if (input.hasExperiencedPM) {
    const pts = criteria.deRiskFactors.experiencedPM;
    deRiskScore += pts;
    passed.push({ name: 'Experienced PM Available', passed: true, points: pts });
  }
  
  if (input.hasClearTitle) {
    const pts = criteria.deRiskFactors.clearTitle;
    deRiskScore += pts;
    passed.push({ name: 'Clear Title', passed: true, points: pts });
  }
  
  if (input.isInGrowthCorridor) {
    const pts = criteria.deRiskFactors.growthCorridor;
    deRiskScore += pts;
    passed.push({ name: 'Located in Growth Corridor', passed: true, points: pts });
  }
  
  if (input.hasPreSales && (input.preSalesPercent || 0) >= 50) {
    const pts = criteria.deRiskFactors.preSales50Plus;
    deRiskScore += pts;
    passed.push({ name: 'Pre-sales ≥50%', passed: true, points: pts, detail: `${input.preSalesPercent}% pre-sold` });
  }
  
  // Risk factors
  if (input.hasPreviousLegalDisputes) {
    const pts = criteria.riskFactors.previousLegalDisputes;
    riskScore += pts;
    attention.push({ 
      name: 'Previous legal dispute (resolved)', 
      passed: false, 
      points: pts, 
      severity: 'low',
      detail: `${pts} points deducted`
    });
  }
  
  if (input.landStage === 'needs_rezoning') {
    const pts = criteria.riskFactors.needsRezoning;
    riskScore += pts;
    attention.push({ 
      name: 'Requires rezoning', 
      passed: false, 
      points: pts, 
      severity: 'high',
      detail: `${pts} points deducted - adds time and risk`
    });
  }
  
  if (!input.hasPreSales) {
    const pts = criteria.riskFactors.noPreSales;
    riskScore += pts;
    attention.push({ 
      name: 'No pre-sales secured', 
      passed: false, 
      points: pts, 
      severity: 'low',
      detail: `${pts} points deducted`
    });
  }
  
  return { passed, failed, attention, gmScore, deRiskScore, riskScore };
}

// Determine RAG status
function determineStatus(
  score: number,
  gmPercent: number,
  criteria: AssessmentCriteria,
  hasCriticalFailures: boolean
): RAGStatus {
  // Critical failures = automatic RED
  if (hasCriticalFailures) return 'red';
  
  // GM below minimum = RED
  if (gmPercent < criteria.amberGMThreshold) return 'red';
  
  // Score ≥80 AND GM ≥25% = GREEN
  if (score >= 80 && gmPercent >= criteria.greenGMThreshold) return 'green';
  
  // Score 60-79 OR GM 18-24.9% = AMBER
  if (score >= 60 || gmPercent >= criteria.amberGMThreshold) return 'amber';
  
  // Otherwise RED
  return 'red';
}

// Generate AI insights
async function generateAIInsights(
  input: OpportunityInput,
  financials: FinancialSummary,
  status: RAGStatus,
  criteria: AssessmentCriteria,
  attentionItems: CriterionResult[]
): Promise<{ summary: string; pathToGreen: string[]; recommendations: string[] }> {
  const prompt = `You are a property development assessment AI for DealFindrs. Analyze this opportunity and provide insights.

## Opportunity Details
- Name: ${input.name}
- Location: ${input.address}, ${input.city}, ${input.state}
- Property Size: ${input.propertySize} ${input.propertySizeUnit}
- Land Stage: ${input.landStage}
- Number of Lots/Units: ${input.numLots || input.numDwellings}

## Financial Summary
- Total Cost: $${financials.totalCost.toLocaleString()}
- Total Revenue: $${financials.totalRevenue.toLocaleString()}
- Gross Margin: $${financials.grossMargin.toLocaleString()} (${financials.grossMarginPercent.toFixed(1)}%)
- Land Purchase: $${input.landPurchasePrice.toLocaleString()}
- Avg Sale Price/Unit: $${input.avgSalePrice.toLocaleString()}

## Assessment Result
- Status: ${status.toUpperCase()}
- Green GM Threshold: ${criteria.greenGMThreshold}%
- Current GM: ${financials.grossMarginPercent.toFixed(1)}%

## Attention Items
${attentionItems.map(item => `- ${item.name}: ${item.detail || ''}`).join('\n')}

## Your Task
Provide a JSON response with:
1. "summary": A 2-3 sentence explanation of the ${status.toUpperCase()} rating
2. "pathToGreen": Array of 2-3 specific actions to reach GREEN status (with numbers)
3. "recommendations": Array of 2-3 general recommendations for this opportunity

Be specific with numbers. For example, if GM needs to increase from 22% to 25%, calculate the exact dollar change needed.

Respond ONLY with valid JSON, no markdown.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      { 
        temperature: 0.3,
        metadata: { task: 'assessment', opportunity: input.name }
      }
    );
    
    // Parse JSON response
    const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const insights = JSON.parse(cleanedResponse);
    
    return {
      summary: insights.summary || `This opportunity received an ${status.toUpperCase()} rating.`,
      pathToGreen: insights.pathToGreen || [],
      recommendations: insights.recommendations || [],
    };
  } catch (error) {
    console.error('AI insights error:', error);
    // Fallback insights
    return {
      summary: `This opportunity scored ${status.toUpperCase()} with a gross margin of ${financials.grossMarginPercent.toFixed(1)}%.`,
      pathToGreen: status !== 'green' ? [
        `Increase gross margin to ${criteria.greenGMThreshold}% or higher`,
        'Secure additional de-risk factors (DA approval, vendor finance, pre-sales)',
      ] : [],
      recommendations: [
        'Review financial projections with current market data',
        'Verify all due diligence items before proceeding',
      ],
    };
  }
}

// Main assessment function
export async function assessOpportunity(
  input: OpportunityInput,
  criteria: AssessmentCriteria = DEFAULT_CRITERIA
): Promise<AssessmentResult> {
  // Calculate financials
  const financials = calculateFinancials(input);
  
  // Evaluate criteria
  const { passed, failed, attention, gmScore, deRiskScore, riskScore } = evaluateCriteria(
    input,
    financials,
    criteria
  );
  
  // Calculate total score
  const totalScore = Math.max(0, Math.min(100, gmScore + deRiskScore + riskScore));
  
  // Check for critical failures
  const hasCriticalFailures = failed.some(f => f.severity === 'critical');
  
  // Determine RAG status
  const status = determineStatus(
    totalScore,
    financials.grossMarginPercent,
    criteria,
    hasCriticalFailures
  );
  
  // Generate AI insights
  const insights = await generateAIInsights(input, financials, status, criteria, attention);
  
  return {
    status,
    score: Math.round(totalScore),
    gmScore: Math.round(gmScore),
    deRiskScore,
    riskScore,
    financials,
    passedCriteria: passed,
    failedCriteria: failed,
    attentionItems: attention,
    summary: insights.summary,
    pathToGreen: insights.pathToGreen,
    recommendations: insights.recommendations,
    assessedAt: new Date().toISOString(),
    criteriaVersion: '1.0.0',
  };
}

// Quick assessment without AI (for previews)
export function quickAssess(
  input: OpportunityInput,
  criteria: AssessmentCriteria = DEFAULT_CRITERIA
): Omit<AssessmentResult, 'summary' | 'pathToGreen' | 'recommendations'> {
  const financials = calculateFinancials(input);
  const { passed, failed, attention, gmScore, deRiskScore, riskScore } = evaluateCriteria(
    input,
    financials,
    criteria
  );
  
  const totalScore = Math.max(0, Math.min(100, gmScore + deRiskScore + riskScore));
  const hasCriticalFailures = failed.some(f => f.severity === 'critical');
  const status = determineStatus(totalScore, financials.grossMarginPercent, criteria, hasCriticalFailures);
  
  return {
    status,
    score: Math.round(totalScore),
    gmScore: Math.round(gmScore),
    deRiskScore,
    riskScore,
    financials,
    passedCriteria: passed,
    failedCriteria: failed,
    attentionItems: attention,
    assessedAt: new Date().toISOString(),
    criteriaVersion: '1.0.0',
  };
}
