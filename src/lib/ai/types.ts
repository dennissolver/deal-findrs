// RAG Status types
export type RAGStatus = 'green' | 'amber' | 'red';

// Opportunity input data
export interface OpportunityInput {
  // Basics
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  
  // Property Details
  propertySize: number;
  propertySizeUnit: 'sqm' | 'acres' | 'sqft';
  landStage: 'da_approved' | 'needs_rezoning' | 'vacant' | 'redevelopment';
  currentZoning?: string;
  numLots: number;
  numDwellings: number;
  existingStructures?: string;
  
  // Financial
  landPurchasePrice: number;
  infrastructureCosts: number;
  constructionPerUnit: number;
  avgSalePrice: number;
  contingencyPercent: number;
  timeframeMonths: number;
  
  // Additional factors
  hasProofOfOwnership: boolean;
  hasLegalDisputes: boolean;
  hasPreviousLegalDisputes: boolean;
  hasDAApproval: boolean;
  hasVendorFinance: boolean;
  hasFixedPriceConstruction: boolean;
  hasExperiencedPM: boolean;
  hasClearTitle: boolean;
  isInGrowthCorridor: boolean;
  hasPreSales: boolean;
  preSalesPercent?: number;
}

// Criteria configuration (from promoter setup)
export interface AssessmentCriteria {
  // GM Thresholds
  greenGMThreshold: number;  // Default 25%
  amberGMThreshold: number;  // Default 18%
  
  // Critical criteria (must pass)
  requireProofOfOwnership: boolean;
  requireNoLegalDisputes: boolean;
  requireDAApproval: boolean;
  
  // De-risk factors with point values
  deRiskFactors: {
    daApproved: number;           // Default +15
    vendorFinance: number;        // Default +10
    fixedPriceConstruction: number; // Default +10
    experiencedPM: number;        // Default +5
    clearTitle: number;           // Default +5
    growthCorridor: number;       // Default +5
    preSales50Plus: number;       // Default +10
  };
  
  // Risk factors (negative points)
  riskFactors: {
    previousLegalDisputes: number;  // Default -5
    needsRezoning: number;          // Default -10
    noPreSales: number;             // Default -5
  };
}

// Individual criterion result
export interface CriterionResult {
  name: string;
  passed: boolean;
  points: number;
  detail?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

// Financial calculations
export interface FinancialSummary {
  totalCost: number;
  totalRevenue: number;
  grossMargin: number;
  grossMarginPercent: number;
  costPerUnit: number;
  revenuePerUnit: number;
  profitPerUnit: number;
}

// Assessment result
export interface AssessmentResult {
  // Overall
  status: RAGStatus;
  score: number;  // 0-100
  
  // Breakdown
  gmScore: number;  // GM% × 3 (max 75 points for 25%+)
  deRiskScore: number;  // Sum of de-risk points
  riskScore: number;  // Sum of risk penalties
  
  // Details
  financials: FinancialSummary;
  passedCriteria: CriterionResult[];
  failedCriteria: CriterionResult[];
  attentionItems: CriterionResult[];
  
  // AI insights
  summary: string;
  pathToGreen: string[];
  recommendations: string[];
  
  // Metadata
  assessedAt: string;
  criteriaVersion: string;
}

// Default criteria configuration
export const DEFAULT_CRITERIA: AssessmentCriteria = {
  greenGMThreshold: 25,
  amberGMThreshold: 18,
  
  requireProofOfOwnership: true,
  requireNoLegalDisputes: true,
  requireDAApproval: false,  // Not always required
  
  deRiskFactors: {
    daApproved: 15,
    vendorFinance: 10,
    fixedPriceConstruction: 10,
    experiencedPM: 5,
    clearTitle: 5,
    growthCorridor: 5,
    preSales50Plus: 10,
  },
  
  riskFactors: {
    previousLegalDisputes: -5,
    needsRezoning: -10,
    noPreSales: -5,
  },
};
