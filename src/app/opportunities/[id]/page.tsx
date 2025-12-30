'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Edit, Archive, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { VoiceAssistant } from '@/components/voice/VoiceAssistant'

export default function OpportunityDetailPage() {
  const [showVoice, setShowVoice] = useState(false)

  // Sample data - would come from Supabase
  const opportunity = {
    id: '1',
    name: 'Branscomb Rd, Claremont',
    location: 'Claremont, TAS',
    status: 'amber',
    score: 78,
    gm: 22.2,
    lots: 37,
    dwellings: 37,
    landSize: '19,900 sqm',
    stage: 'DA Approved',
    totalCost: 18000000,
    totalRevenue: 22200000,
    grossMargin: 4200000,
    timeframe: '18 months',
    assessedAt: '2024-12-28',
  }

  const passedCriteria = [
    { label: 'Proof of Ownership Verified', points: 0 },
    { label: 'No Legal Disputes', points: 0 },
    { label: 'DA Approved', points: 15 },
    { label: 'Vendor Finance Available', points: 10 },
    { label: 'Fixed-Price Construction (F2K)', points: 10 },
    { label: 'Experienced PM Available', points: 5 },
    { label: 'Clear Title', points: 5 },
  ]

  const attentionItems = [
    { label: 'Gross Margin below 25% threshold', severity: 'amber', detail: 'Current: 22.2% | Required: 25%' },
    { label: 'Previous legal dispute (resolved)', severity: 'low', detail: '-5 points deducted' },
  ]

  const pathToGreen = [
    'Negotiate purchase price reduction from $2.5M to $2.0M (saves $500K)',
    'OR increase average sale price by $22K per unit ($600K → $622K)',
    'OR reduce construction costs by 3% through value engineering',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Archive className="w-4 h-4" /> Archive
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Generate IM
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Assessment Result Header */}
        <div className={`rounded-2xl p-8 mb-8 ${
          opportunity.status === 'green' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
          opportunity.status === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
                {opportunity.status === 'green' ? '🟢' : opportunity.status === 'amber' ? '🟡' : '🔴'}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium uppercase">
                    {opportunity.status} Light
                  </span>
                  <span className="text-white/80">Score: {opportunity.score}/100</span>
                </div>
                <h1 className="text-3xl font-bold mb-1">{opportunity.name}</h1>
                <p className="text-white/80">{opportunity.location} • {opportunity.lots} lots • {opportunity.landSize}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowVoice(!showVoice)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 flex items-center gap-2"
            >
              🎙️ {showVoice ? 'Hide Assistant' : 'Discuss Assessment'}
            </button>
          </div>
        </div>

        {/* Voice Assistant */}
        {showVoice && (
          <VoiceAssistant
            context="assessment"
            contextData={{
              opportunity,
              passedCriteria,
              attentionItems,
              pathToGreen,
            }}
            initialMessage={`This opportunity scored ${opportunity.status.toUpperCase()} with ${opportunity.score} points. The gross margin is ${opportunity.gm}%, which is ${opportunity.gm >= 25 ? 'meeting' : 'below'} your 25% green threshold. Would you like me to explain the score breakdown or discuss the path to green?`}
            variant="modal"
            className="mb-8"
            onClose={() => setShowVoice(false)}
          />
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Criteria */}
          <div className="col-span-2 space-y-6">
            {/* Passed Criteria */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Passed Criteria
              </h3>
              <div className="space-y-2">
                {passedCriteria.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-gray-700 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {item.label}
                    </span>
                    {item.points > 0 && (
                      <span className="text-emerald-600 font-medium">+{item.points} pts</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Attention Items */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Requires Attention
              </h3>
              <div className="space-y-3">
                {attentionItems.map((item, i) => (
                  <div key={i} className={`p-4 rounded-lg ${
                    item.severity === 'amber' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Path to Green */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Path to GREEN
              </h3>
              <div className="space-y-3">
                {pathToGreen.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Financial Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                Financial Summary
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">${(opportunity.totalCost / 1000000).toFixed(1)}M</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${(opportunity.totalRevenue / 1000000).toFixed(1)}M</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-500">Gross Margin</p>
                  <p className="text-2xl font-bold text-emerald-600">${(opportunity.grossMargin / 1000000).toFixed(1)}M</p>
                </div>
                <div className={`p-4 rounded-lg ${opportunity.gm >= 25 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className="text-sm text-gray-500">Gross Margin %</p>
                  <p className={`text-2xl font-bold ${opportunity.gm >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {opportunity.gm}%
                  </p>
                  {opportunity.gm < 25 && (
                    <p className="text-xs text-amber-600 mt-1">Below 25% threshold</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Land Stage</span>
                  <span className="font-medium text-gray-900">{opportunity.stage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lots</span>
                  <span className="font-medium text-gray-900">{opportunity.lots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dwellings</span>
                  <span className="font-medium text-gray-900">{opportunity.dwellings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Land Size</span>
                  <span className="font-medium text-gray-900">{opportunity.landSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timeframe</span>
                  <span className="font-medium text-gray-900">{opportunity.timeframe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assessed</span>
                  <span className="font-medium text-gray-900">{opportunity.assessedAt}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all">
                ✏️ Edit & Re-assess
              </button>
              <button className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all">
                📄 Generate Investment Memo
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
