'use client'

import { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Edit, Archive, CheckCircle, AlertTriangle, TrendingUp, DollarSign, X, Loader2 } from 'lucide-react'
import { VoiceAssistant } from '@/components/voice/VoiceAssistant'

// Edit Modal Component
function EditOpportunityModal({
  opportunity,
  onClose,
  onSave,
}: {
  opportunity: any
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: opportunity.name,
    location: opportunity.location,
    lots: opportunity.lots,
    dwellings: opportunity.dwellings,
    landSize: opportunity.landSize,
    stage: opportunity.stage,
    totalCost: opportunity.totalCost,
    totalRevenue: opportunity.totalRevenue,
    timeframe: opportunity.timeframe,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Simulate API call - replace with actual Supabase update
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    onSave(formData)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Opportunity</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="Raw Land">Raw Land</option>
                <option value="DA Lodged">DA Lodged</option>
                <option value="DA Approved">DA Approved</option>
                <option value="Construction Ready">Construction Ready</option>
              </select>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lots
              </label>
              <input
                type="number"
                value={formData.lots}
                onChange={(e) => setFormData(prev => ({ ...prev, lots: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dwellings
              </label>
              <input
                type="number"
                value={formData.dwellings}
                onChange={(e) => setFormData(prev => ({ ...prev, dwellings: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Land Size
              </label>
              <input
                type="text"
                value={formData.landSize}
                onChange={(e) => setFormData(prev => ({ ...prev, landSize: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost ($)
              </label>
              <input
                type="number"
                value={formData.totalCost}
                onChange={(e) => setFormData(prev => ({ ...prev, totalCost: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Revenue ($)
              </label>
              <input
                type="number"
                value={formData.totalRevenue}
                onChange={(e) => setFormData(prev => ({ ...prev, totalRevenue: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <input
              type="text"
              value={formData.timeframe}
              onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
              placeholder="e.g., 18 months"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Re-assess'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const opportunityId = params.id as string
  
  const [showVoice, setShowVoice] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // Sample data - would come from Supabase
  const [opportunity, setOpportunity] = useState({
    id: opportunityId || '1',
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
  })

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

  // Handle Edit - opens modal
  const handleEdit = useCallback(() => {
    setShowEditModal(true)
  }, [])

  // Handle Save from edit modal
  const handleSaveEdit = useCallback((updatedData: any) => {
    // Update local state
    setOpportunity(prev => ({
      ...prev,
      ...updatedData,
      // Recalculate gross margin
      grossMargin: updatedData.totalRevenue - updatedData.totalCost,
      gm: ((updatedData.totalRevenue - updatedData.totalCost) / updatedData.totalRevenue * 100).toFixed(1),
      assessedAt: new Date().toISOString().split('T')[0],
    }))
    
    setShowEditModal(false)
    
    // TODO: Call API to update in Supabase and re-run assessment
    // await fetch(`/api/opportunities/${opportunityId}`, { method: 'PUT', body: JSON.stringify(updatedData) })
  }, [])

  // Handle Archive
  const handleArchive = useCallback(async () => {
    if (!confirm('Are you sure you want to archive this opportunity?')) return
    
    setArchiving(true)
    
    // TODO: Call API to archive
    // await fetch(`/api/opportunities/${opportunityId}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    router.push('/opportunities')
  }, [router])

  // Handle Generate IM
  const handleGenerateIM = useCallback(() => {
    router.push(`/opportunities/${opportunityId}/im`)
  }, [router, opportunityId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleArchive}
              disabled={archiving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              Archive
            </button>
            <button 
              onClick={handleEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button 
              onClick={handleGenerateIM}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2"
            >
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
          <div className="mb-8">
            <VoiceAssistant
              context="assessment"
              contextData={{
                opportunity,
                passedCriteria,
                attentionItems,
                pathToGreen,
              }}
              customInitialPrompt={`This opportunity scored ${opportunity.status.toUpperCase()} with ${opportunity.score} points. The gross margin is ${opportunity.gm}%, which is ${Number(opportunity.gm) >= 25 ? 'meeting' : 'below'} your 25% green threshold. Would you like me to explain the score breakdown or discuss the path to green?`}
              onClose={() => setShowVoice(false)}
            />
          </div>
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
                <div className={`p-4 rounded-lg ${Number(opportunity.gm) >= 25 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className="text-sm text-gray-500">Gross Margin %</p>
                  <p className={`text-2xl font-bold ${Number(opportunity.gm) >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {opportunity.gm}%
                  </p>
                  {Number(opportunity.gm) < 25 && (
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
              <button 
                onClick={handleEdit}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit & Re-assess
              </button>
              <button 
                onClick={handleGenerateIM}
                className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Investment Memo
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <EditOpportunityModal
          opportunity={opportunity}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
