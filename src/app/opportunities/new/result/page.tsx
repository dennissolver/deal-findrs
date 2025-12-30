'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mic, FileText, CheckCircle, AlertTriangle, TrendingUp, DollarSign, RefreshCw } from 'lucide-react'

interface AssessmentData {
  opportunity: any
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
    failedCriteria: Array<{ name: string; severity: string }>
    attentionItems: Array<{ name: string; detail: string; severity: string }>
    summary: string
    pathToGreen: string[]
    recommendations: string[]
  }
}

export default function AssessmentResultPage() {
  const router = useRouter()
  const [data, setData] = useState<AssessmentData | null>(null)
  const [voiceActive, setVoiceActive] = useState(false)

  useEffect(() => {
    // Load assessment from sessionStorage
    const stored = sessionStorage.getItem('lastAssessment')
    if (stored) {
      setData(JSON.parse(stored))
    } else {
      // No assessment data, redirect back
      router.push('/opportunities/new')
    }
  }, [router])

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const { opportunity, result } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center gap-2">
            <Link 
              href="/opportunities/new"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> New Assessment
            </Link>
            <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Generate IM
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Assessment Result Header */}
        <div className={`rounded-2xl p-8 mb-8 ${
          result.status === 'green' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
          result.status === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
                {result.status === 'green' ? '🟢' : result.status === 'amber' ? '🟡' : '🔴'}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium uppercase">
                    {result.status} Light
                  </span>
                  <span className="text-white/80">Score: {result.score}/100</span>
                </div>
                <h1 className="text-3xl font-bold mb-1">{opportunity.name}</h1>
                <p className="text-white/80">
                  {opportunity.address}, {opportunity.city}, {opportunity.state} • {opportunity.numLots} lots
                </p>
              </div>
            </div>
            <button 
              onClick={() => setVoiceActive(!voiceActive)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 flex items-center gap-2"
            >
              <Mic className={`w-4 h-4 ${voiceActive ? 'animate-pulse' : ''}`} />
              {voiceActive ? 'Listening...' : 'Discuss Assessment'}
            </button>
          </div>
        </div>

        {/* AI Summary */}
        {voiceActive && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-violet-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-violet-600 animate-pulse" />
              </div>
              <div>
                <p className="text-gray-800 leading-relaxed">{result.summary}</p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setVoiceActive(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Got it, thanks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Criteria */}
          <div className="col-span-2 space-y-6">
            {/* AI Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">AI Assessment Summary</h3>
              <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Passed Criteria */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Passed Criteria ({result.passedCriteria.length})
              </h3>
              <div className="space-y-2">
                {result.passedCriteria.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-gray-700 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {item.name}
                    </span>
                    {item.points > 0 && (
                      <span className="text-emerald-600 font-medium">+{item.points} pts</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Attention Items */}
            {result.attentionItems.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Requires Attention ({result.attentionItems.length})
                </h3>
                <div className="space-y-3">
                  {result.attentionItems.map((item, i) => (
                    <div key={i} className={`p-4 rounded-lg ${
                      item.severity === 'high' ? 'bg-red-50 border border-red-200' :
                      item.severity === 'medium' ? 'bg-amber-50 border border-amber-200' : 
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Path to Green */}
            {result.status !== 'green' && result.pathToGreen.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Path to GREEN
                </h3>
                <div className="space-y-3">
                  {result.pathToGreen.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">💡 Recommendations</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-amber-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Financial Summary */}
          <div className="space-y-6">
            {/* Score Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">GM Score</span>
                  <span className="font-bold text-gray-900">+{result.gmScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">De-risk Bonus</span>
                  <span className="font-bold text-emerald-600">+{result.deRiskScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Risk Penalties</span>
                  <span className="font-bold text-red-600">{result.riskScore}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Score</span>
                  <span className="text-2xl font-bold text-gray-900">{result.score}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                Financial Summary
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(result.financials.totalCost / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(result.financials.totalRevenue / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-500">Gross Margin</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${(result.financials.grossMargin / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${
                  result.financials.grossMarginPercent >= 25 ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  <p className="text-sm text-gray-500">Gross Margin %</p>
                  <p className={`text-2xl font-bold ${
                    result.financials.grossMarginPercent >= 25 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {result.financials.grossMarginPercent.toFixed(1)}%
                  </p>
                  {result.financials.grossMarginPercent < 25 && (
                    <p className="text-xs text-amber-600 mt-1">Below 25% threshold</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all">
                💾 Save to Pipeline
              </button>
              <button className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all">
                📄 Generate Investment Memo
              </button>
              <Link 
                href="/opportunities/new"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Assess Another
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
