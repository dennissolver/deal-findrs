'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Save, User, Building, Bell, Shield, CreditCard, Users } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'criteria', label: 'Assessment Criteria', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

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
                { name: 'Dashboard', href: '/dashboard', active: false },
                { name: 'Opportunities', href: '/opportunities', active: false },
                { name: 'Analytics', href: '/analytics', active: false },
                { name: 'Settings', href: '/settings', active: true },
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
            <Link 
              href="/opportunities/new"
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Opportunity
            </Link>
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
              UJ
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-amber-50 text-amber-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h2>
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        UJ
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Change Photo
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input 
                          type="text" 
                          defaultValue="Uwe"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input 
                          type="text" 
                          defaultValue="Jacobs"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input 
                        type="email" 
                        defaultValue="uwe@factory2key.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input 
                        type="tel" 
                        defaultValue="+61 400 000 000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'company' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                      <input 
                        type="text" 
                        defaultValue="Factory2Key"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <input 
                        type="text" 
                        defaultValue="Brisbane, QLD"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input 
                        type="url" 
                        defaultValue="https://factory2key.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'criteria' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Assessment Criteria</h2>
                  <p className="text-gray-600 mb-6">Configure the criteria used to assess opportunities</p>
                  <Link 
                    href="/setup"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
                  >
                    Edit Assessment Criteria
                  </Link>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Email notifications for new opportunities', checked: true },
                      { label: 'Email notifications for assessment results', checked: true },
                      { label: 'Weekly summary report', checked: false },
                      { label: 'Marketing updates from DealFindrs', checked: false },
                    ].map((item, i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          defaultChecked={item.checked}
                          className="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                        />
                        <span className="text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                    <button className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Invite Member
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center text-white font-medium">
                          UJ
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Uwe Jacobs</p>
                          <p className="text-sm text-gray-500">uwe@factory2key.com</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Admin</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing & Plan</h2>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-700 font-medium">Current Plan</p>
                        <p className="text-2xl font-bold text-gray-900">Free Trial</p>
                        <p className="text-sm text-gray-600 mt-1">14 days remaining</p>
                      </div>
                      <button className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600">
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Usage This Month</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">1 / 5</p>
                        <p className="text-sm text-gray-500">Opportunities</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">1 / 1</p>
                        <p className="text-sm text-gray-500">Team Members</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">0</p>
                        <p className="text-sm text-gray-500">IMs Generated</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {saved ? (
                    <>✓ Saved</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
