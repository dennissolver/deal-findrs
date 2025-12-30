'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Settings, LogOut, Bell, Mic } from 'lucide-react'

const mockDeals = [
  { id: 1, name: 'Brisbane ADU Portfolio', location: 'Brisbane, QLD', status: 'green', gm: '28.5%', score: 92, lots: 10, stage: 'DA Approved' },
  { id: 2, name: 'Gold Coast Mixed Use', location: 'Gold Coast, QLD', status: 'green', gm: '26.1%', score: 87, lots: 24, stage: 'Pre-Sales' },
  { id: 3, name: 'Branscomb Rd, Claremont', location: 'Claremont, TAS', status: 'amber', gm: '22.2%', score: 78, lots: 37, stage: 'DA Approved' },
  { id: 4, name: 'Georgetown Expansion', location: 'Georgetown, Guyana', status: 'amber', gm: '19.8%', score: 65, lots: 15, stage: 'Redevelopment' },
  { id: 5, name: 'Trinidad Roberts', location: 'Port of Spain, TT', status: 'red', gm: '12.4%', score: 38, lots: 8, stage: 'Vacant Land' },
]

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [voiceActive, setVoiceActive] = useState(false)

  const filteredDeals = mockDeals.filter(deal => {
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    green: mockDeals.filter(d => d.status === 'green').length,
    amber: mockDeals.filter(d => d.status === 'amber').length,
    red: mockDeals.filter(d => d.status === 'red').length,
    pipelineValue: '$42M',
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'green': return 'bg-emerald-500'
      case 'amber': return 'bg-amber-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">DF</span>
              </div>
              <span className="text-xl font-bold text-gray-900">DealFindrs</span>
            </Link>
            <div className="flex items-center gap-1">
              {[
                { name: 'Dashboard', href: '/dashboard', active: true },
                { name: 'Opportunities', href: '/opportunities', active: false },
                { name: 'Analytics', href: '/analytics', active: false },
                { name: 'Settings', href: '/settings', active: false },
              ].map((item) => (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <Link 
              href="/opportunities/new"
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Opportunity
            </Link>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Factory2Key</span>
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                UJ
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome back, Uwe! 👋</h1>
              <p className="text-white/80">You have {stats.amber} opportunities awaiting review and {stats.green} green-lit projects.</p>
            </div>
            <Link 
              href="/opportunities/new"
              className="px-6 py-3 bg-white text-violet-600 rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add New Opportunity
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Green Light', count: stats.green, color: 'emerald', icon: '🟢' },
            { label: 'Amber', count: stats.amber, color: 'amber', icon: '🟡' },
            { label: 'Red', count: stats.red, color: 'red', icon: '🔴' },
            { label: 'Pipeline Value', count: stats.pipelineValue, color: 'blue', icon: '💰' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => stat.label !== 'Pipeline Value' && setStatusFilter(stat.label.toLowerCase().replace(' light', ''))}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Opportunities List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Opportunities</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search deals..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-64"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Status</option>
                <option value="green">Green</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
              </select>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {filteredDeals.map((deal) => (
              <Link 
                key={deal.id} 
                href={`/opportunities/${deal.id}`}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4"
              >
                <div className={`w-4 h-4 rounded-full ${getStatusColor(deal.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                  <p className="text-sm text-gray-500">{deal.location}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {deal.stage}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{deal.gm}</p>
                  <p className="text-xs text-gray-500">GM</p>
                </div>
                <div className="text-right w-16">
                  <p className="font-semibold text-gray-900">{deal.score}</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="text-right w-12">
                  <p className="font-semibold text-gray-900">{deal.lots}</p>
                  <p className="text-xs text-gray-500">Lots</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>

          {filteredDeals.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No opportunities found matching your criteria.</p>
              <Link 
                href="/opportunities/new"
                className="inline-flex items-center gap-2 mt-4 text-amber-600 font-medium hover:underline"
              >
                <Plus className="w-4 h-4" /> Add your first opportunity
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Voice Assistant FAB */}
      <button 
        onClick={() => setVoiceActive(!voiceActive)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          voiceActive 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 scale-110' 
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-105'
        }`}
      >
        <Mic className={`w-6 h-6 text-white ${voiceActive ? 'animate-pulse' : ''}`} />
      </button>

      {/* Voice Dialog */}
      {voiceActive && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <span className="text-white font-medium flex items-center gap-2">
              <Mic className="w-4 h-4 animate-pulse" /> Voice Assistant
            </span>
            <button onClick={() => setVoiceActive(false)} className="text-white/80 hover:text-white">✕</button>
          </div>
          <div className="p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              &quot;Hi Uwe! I see you have 2 amber deals that could potentially be moved to green with some negotiation. 
              Would you like me to summarize the path to green for Branscomb Rd?&quot;
            </p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                🔊 Listen
              </button>
              <button className="flex-1 px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-200 transition-colors">
                Yes, summarize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
