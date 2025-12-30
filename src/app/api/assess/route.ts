import { NextRequest, NextResponse } from 'next/server';
import { assessOpportunity, quickAssess, OpportunityInput, DEFAULT_CRITERIA } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunity, criteria, quick } = body as {
      opportunity: OpportunityInput;
      criteria?: typeof DEFAULT_CRITERIA;
      quick?: boolean;
    };

    // Validate required fields
    if (!opportunity || !opportunity.name) {
      return NextResponse.json(
        { error: 'Missing required opportunity data' },
        { status: 400 }
      );
    }

    // Use quick assessment if requested (no AI call)
    if (quick) {
      const result = quickAssess(opportunity, criteria || DEFAULT_CRITERIA);
      return NextResponse.json({ success: true, result });
    }

    // Full assessment with AI insights
    const result = await assessOpportunity(opportunity, criteria || DEFAULT_CRITERIA);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Assessment error:', error);
    return NextResponse.json(
      { 
        error: 'Assessment failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'DealFindrs Assessment API',
    endpoints: {
      POST: {
        description: 'Assess an opportunity',
        body: {
          opportunity: 'OpportunityInput object (required)',
          criteria: 'AssessmentCriteria object (optional)',
          quick: 'boolean - skip AI insights (optional)',
        },
      },
    },
  });
}
