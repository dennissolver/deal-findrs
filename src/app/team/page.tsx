'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, UserPlus, Mail, Shield, Eye, Trash2, Copy, Check, 
  ArrowLeft, Loader2, Clock, AlertCircle, Building2 
} from 'lucide-react'

interface TeamMember {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  joined_at: string
  last_active_at: string
  is_active: boolean
}

interface PendingInvite {
  id: string
  email: string
  role: string
  invite_code: string
  created_at: string
  expires_at: string
  inviter: {
    first_name: string
    last_name: string
  }
}

interface Company {
  id: string
  name: string
  slug: string
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('deal_finder')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState<{ code: string; url: string } | null>(null)

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    setLoading(true)
    try {
      // In production, fetch from API
      // For demo, use mock data
      setCompany({
        id: '1',
        name: 'Factory2Key',
        slug: 'factory2key',
      })

      setMembers([
        {
          id: '1',
          email: 'admin@factory2key.com',
          first_name: 'John',
          last_name: 'Smith',
          role: 'owner',
          joined_at: '2024-01-15T00:00:00Z',
          last_active_at: '2024-12-30T10:00:00Z',
          is_active: true,
        },
        {
          id: '2',
          email: 'sarah@factory2key.com',
          first_name: 'Sarah',
          last_name: 'Johnson',
          role: 'admin',
          joined_at: '2024-02-20T00:00:00Z',
          last_active_at: '2024-12-29T15:30:00Z',
          is_active: true,
        },
        {
          id: '3',
          email: 'mike@factory2key.com',
          first_name: 'Mike',
          last_name: 'Williams',
          role: 'deal_finder',
          joined_at: '2024-03-10T00:00:00Z',
          last_active_at: '2024-12-28T09:00:00Z',
          is_active: true,
        },
      ])

      setInvites([
        {
          id: '1',
          email: 'newuser@example.com',
          role: 'deal_finder',
          invite_code: 'abc123def456',
          created_at: '2024-12-28T00:00:00Z',
          expires_at: '2025-01-04T00:00:00Z',
          inviter: { first_name: 'John', last_name: 'Smith' },
        },
      ])
    } catch (error) {
      console.error('Error fetching team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteSuccess(null)

    try {
      const response = await fetch('/api/company/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setInviteSuccess({
        code: data.invite.inviteCode,
        url: data.invite.inviteUrl,
      })
      setInviteEmail('')
      
      // Refresh invites list
      fetchTeamData()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInviting(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const revokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return

    try {
      await fetch(`/api/company/invite?id=${inviteId}`, { method: 'DELETE' })
      setInvites(invites.filter(i => i.id !== inviteId))
    } catch (error) {
      console.error('Error revoking invite:', error)
    }
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      promoter: 'bg-amber-100 text-amber-800',
      deal_finder: 'bg-emerald-100 text-emerald-800',
      viewer: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      owner: 'Owner',
      admin: 'Admin',
      promoter: 'Promoter',
      deal_finder: 'Deal Finder',
      viewer: 'Viewer',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || styles.viewer}`}>
        {labels[role] || role}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Team Management</h1>
              {company && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {company.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600"
          >
            <UserPlus className="w-5 h-5" />
            Invite User
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
                <p className="text-sm text-gray-500">Team Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{invites.length}</p>
                <p className="text-sm text-gray-500">Pending Invites</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
                </p>
                <p className="text-sm text-gray-500">Admins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Team Members</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map(member => (
              <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getRoleBadge(member.role)}
                  <span className="text-sm text-gray-500">
                    Joined {formatDate(member.joined_at)}
                  </span>
                  {member.role !== 'owner' && (
                    <button className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Pending Invites</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {invites.map(invite => (
                <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invite.email}</p>
                      <p className="text-sm text-gray-500">
                        Invited by {invite.inviter.first_name} {invite.inviter.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getRoleBadge(invite.role)}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Expires {formatDate(invite.expires_at)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(invite.invite_code, invite.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      {copiedCode === invite.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Code
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => revokeInvite(invite.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role Descriptions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role Permissions
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-900">Owner / Admin</p>
              <p className="text-blue-700">Full access: manage team, settings, delete opportunities</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Promoter</p>
              <p className="text-blue-700">Create & edit opportunities, run assessments, view financials</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Deal Finder</p>
              <p className="text-blue-700">Create opportunities, run assessments</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Viewer</p>
              <p className="text-blue-700">View opportunities only (read-only)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>
            
            {inviteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                {inviteError}
              </div>
            )}

            {inviteSuccess ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-emerald-800 font-medium mb-2">✓ Invite Created!</p>
                  <p className="text-sm text-emerald-700 mb-4">
                    Share this link or code with your team member:
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-emerald-600 font-medium">Invite Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteSuccess.code}
                          className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(inviteSuccess.code, 'new-code')}
                          className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          {copiedCode === 'new-code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-emerald-600 font-medium">Invite URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteSuccess.url}
                          className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(inviteSuccess.url, 'new-url')}
                          className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          {copiedCode === 'new-url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setInviteSuccess(null)
                      setShowInviteModal(false)
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => setInviteSuccess(null)}
                    className="flex-1 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600"
                  >
                    Invite Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="deal_finder">Deal Finder - Create opportunities</option>
                    <option value="promoter">Promoter - Full opportunity access</option>
                    <option value="admin">Admin - Manage team & settings</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}