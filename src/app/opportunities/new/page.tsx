'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mic, MicOff, Upload, X, Check, AlertCircle } from 'lucide-react'

type Step = 'basics' | 'property' | 'financial' | 'documents' | 'review'

export default function NewOpportunityPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('basics')
  const [voiceActive, setVoiceActive] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    // Basics
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'Australia',
    landownerName: '',
    landownerPhone: '',
    landownerEmail: '',
    source: '',
    
    // Property Details
    propertySize: '',
    propertySizeUnit: 'sqm',
    landStage: '',
    currentZoning: '',
    numLots: '',
    numDwellings: '',
    existingStructures: '',
    
    // Financial
    landPurchasePrice: '',
    infrastructureCosts: '',
    constructionPerUnit: '',
    avgSalePrice: '',
    contingencyPercent: '5',
    timeframeMonths: '',
    targetStartDate: '',
    
    // Vision
    developmentGoals: '',
    developmentType: '',
    briefDescription: '',
  })

  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'basics', label: 'Basics', icon: '📍' },
    { key: 'property', label: 'Property', icon: '🏗️' },
    { key: 'financial', label: 'Financial', icon: '💰' },
    { key: 'documents', label: 'Documents', icon: '📄' },
    { key: 'review', label: 'Review', icon: '✓' },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key)
    }
  }

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // Convert form data to API format
      const opportunity = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        propertySize: Number(formData.propertySize) || 0,
        propertySizeUnit: formData.propertySizeUnit as 'sqm' | 'acres' | 'sqft',
        landStage: formData.landStage as 'da_approved' | 'needs_rezoning' | 'vacant' | 'redevelopment',
        currentZoning: formData.currentZoning,
        numLots: Number(formData.numLots) || 0,
        numDwellings: Number(formData.numDwellings) || Number(formData.numLots) || 0,
        existingStructures: formData.existingStructures,
        landPurchasePrice: Number(formData.landPurchasePrice) || 0,
        infrastructureCosts: Number(formData.infrastructureCosts) || 0,
        constructionPerUnit: Number(formData.constructionPerUnit) || 0,
        avgSalePrice: Number(formData.avgSalePrice) || 0,
        contingencyPercent: Number(formData.contingencyPercent) || 5,
        timeframeMonths: Number(formData.timeframeMonths) || 18,
        // De-risk factors - these would come from checkboxes in a full form
        hasProofOfOwnership: true,
        hasLegalDisputes: false,
        hasPreviousLegalDisputes: false,
        hasDAApproval: formData.landStage === 'da_approved',
        hasVendorFinance: false,
        hasFixedPriceConstruction: true, // Factory2Key default
        hasExperiencedPM: true,
        hasClearTitle: true,
        isInGrowthCorridor: false,
        hasPreSales: false,
        preSalesPercent: 0,
      }

      // Call assessment API
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity }),
      })

      if (!response.ok) {
        throw new Error('Assessment failed')
      }

      const data = await response.json()
      
      // Store result in sessionStorage for now (would use Supabase in production)
      sessionStorage.setItem('lastAssessment', JSON.stringify({
        opportunity,
        result: data.result,
      }))

      // Redirect to result page
      router.push('/opportunities/new/result')
    } catch (error) {
      console.error('Assessment error:', error)
      alert('Assessment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const voicePrompts: Record<Step, string> = {
    basics: "Tell me about this opportunity. What's the address and who's the landowner?",
    property: "What's the property size and current zoning? How many lots are you planning?",
    financial: "What's the purchase price and expected sale price per unit?",
    documents: "Do you have any documents to upload? Title deeds, DA approval, surveys?",
    review: "I'll now run the assessment. Would you like me to explain anything first?",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => i <= currentStepIndex && setCurrentStep(step.key)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < currentStepIndex 
                      ? 'bg-emerald-500 text-white' 
                      : i === currentStepIndex 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : step.icon}
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${i < currentStepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">New Opportunity</h1>
          <p className="text-gray-600">Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Voice Assistant Banner */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setVoiceActive(!voiceActive)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  voiceActive ? 'bg-white text-violet-600' : 'bg-white/20 text-white'
                }`}
              >
                {voiceActive ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
              </button>
              <div className="text-white">
                <p className="font-medium">Voice Assistant</p>
                <p className="text-sm text-white/80">"{voicePrompts[currentStep]}"</p>
              </div>
            </div>
            <button 
              onClick={() => setVoiceActive(!voiceActive)}
              className="px-4 py-2 bg-white text-violet-600 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
            >
              🎙️ {voiceActive ? 'Listening...' : 'Speak Details'}
            </button>
          </div>

          <div className="p-8">
            {/* Step: Basics */}
            {currentStep === 'basics' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opportunity Name *</label>
                  <input 
                    type="text"
                    placeholder="e.g., Branscomb Rd, Claremont TAS"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Address *</label>
                  <input 
                    type="text"
                    placeholder="122-124 Branscomb St"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input 
                      type="text"
                      placeholder="Claremont"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input 
                      type="text"
                      placeholder="TAS"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <select 
                      value={formData.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option>Australia</option>
                      <option>New Zealand</option>
                      <option>United States</option>
                      <option>Trinidad and Tobago</option>
                      <option>Guyana</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Landowner Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input 
                        type="text"
                        value={formData.landownerName}
                        onChange={(e) => updateField('landownerName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input 
                        type="tel"
                        value={formData.landownerPhone}
                        onChange={(e) => updateField('landownerPhone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input 
                        type="email"
                        value={formData.landownerEmail}
                        onChange={(e) => updateField('landownerEmail', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How did you find this opportunity?</label>
                  <select 
                    value={formData.source}
                    onChange={(e) => updateField('source', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">Select source...</option>
                    <option>Real estate listing</option>
                    <option>Agent referral</option>
                    <option>Direct approach</option>
                    <option>Network contact</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step: Property */}
            {currentStep === 'property' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Size *</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        placeholder="19900"
                        value={formData.propertySize}
                        onChange={(e) => updateField('propertySize', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <select 
                        value={formData.propertySizeUnit}
                        onChange={(e) => updateField('propertySizeUnit', e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      >
                        <option value="sqm">sqm</option>
                        <option value="acres">acres</option>
                        <option value="sqft">sqft</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Land Stage *</label>
                    <select 
                      value={formData.landStage}
                      onChange={(e) => updateField('landStage', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="">Select stage...</option>
                      <option value="da_approved">DA Approved</option>
                      <option value="needs_rezoning">Needs Rezoning</option>
                      <option value="vacant">Vacant Land</option>
                      <option value="redevelopment">Redevelopment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Zoning</label>
                  <input 
                    type="text"
                    placeholder="e.g., General Residential"
                    value={formData.currentZoning}
                    onChange={(e) => updateField('currentZoning', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Lots</label>
                    <input 
                      type="number"
                      placeholder="37"
                      value={formData.numLots}
                      onChange={(e) => updateField('numLots', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Dwellings</label>
                    <input 
                      type="number"
                      placeholder="37"
                      value={formData.numDwellings}
                      onChange={(e) => updateField('numDwellings', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Existing Structures</label>
                  <textarea 
                    rows={2}
                    placeholder="Describe any existing buildings or structures..."
                    value={formData.existingStructures}
                    onChange={(e) => updateField('existingStructures', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Development Vision</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe your vision for this development..."
                    value={formData.briefDescription}
                    onChange={(e) => updateField('briefDescription', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Step: Financial */}
            {currentStep === 'financial' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Financial Accuracy Matters</p>
                      <p className="text-sm text-amber-700">These figures directly impact your RAG assessment. Be as accurate as possible.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Land Purchase Price *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="2,500,000"
                        value={formData.landPurchasePrice}
                        onChange={(e) => updateField('landPurchasePrice', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Infrastructure Costs</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="2,000,000"
                        value={formData.infrastructureCosts}
                        onChange={(e) => updateField('infrastructureCosts', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Construction Cost Per Unit</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="330,000"
                        value={formData.constructionPerUnit}
                        onChange={(e) => updateField('constructionPerUnit', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Average Sale Price Per Unit *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="600,000"
                        value={formData.avgSalePrice}
                        onChange={(e) => updateField('avgSalePrice', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contingency %</label>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="5"
                        value={formData.contingencyPercent}
                        onChange={(e) => updateField('contingencyPercent', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe (months)</label>
                    <input 
                      type="number"
                      placeholder="18"
                      value={formData.timeframeMonths}
                      onChange={(e) => updateField('timeframeMonths', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Start Date</label>
                  <input 
                    type="date"
                    value={formData.targetStartDate}
                    onChange={(e) => updateField('targetStartDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Step: Documents */}
            {currentStep === 'documents' && (
              <div className="space-y-6">
                <p className="text-gray-600">Upload relevant documents to support your opportunity assessment.</p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-amber-500 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Drag & drop files here, or click to browse</p>
                  <p className="text-sm text-gray-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG up to 10MB each</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {['Title Deed', 'DA Approval', 'Survey/Plans', 'Photos', 'Financial Model', 'Other'].map((docType) => (
                    <div key={docType} className="p-4 border border-gray-200 rounded-xl hover:border-amber-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          📄
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{docType}</p>
                          <p className="text-sm text-gray-500">No file uploaded</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="font-medium text-emerald-800">Ready to assess!</p>
                  <p className="text-sm text-emerald-700">Review your details below, then submit for AI assessment.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-700 mb-2">Basics</h4>
                    <p className="text-gray-900">{formData.name || 'Not provided'}</p>
                    <p className="text-gray-600">{formData.address}, {formData.city}, {formData.state}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-700 mb-2">Property</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Size</p>
                        <p className="text-gray-900 font-medium">{formData.propertySize} {formData.propertySizeUnit}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Lots</p>
                        <p className="text-gray-900 font-medium">{formData.numLots || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Stage</p>
                        <p className="text-gray-900 font-medium">{formData.landStage || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-700 mb-2">Financial Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Land Price</p>
                        <p className="text-gray-900 font-medium">${Number(formData.landPurchasePrice || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Sale Price</p>
                        <p className="text-gray-900 font-medium">${Number(formData.avgSalePrice || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button 
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            
            {currentStep === 'review' ? (
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running Assessment...
                  </>
                ) : (
                  <>
                    🚦 Submit for Assessment
                  </>
                )}
              </button>
            ) : (
              <button 
                onClick={nextStep}
                className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
