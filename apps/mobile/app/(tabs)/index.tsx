import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { supabase } from '../../src/lib/supabase'

interface DashboardData {
  totalDue: number
  overdueCount: number
  openRequests: number
}

export default function HomeScreen() {
  const [data, setData] = useState<DashboardData>({ totalDue: 0, overdueCount: 0, openRequests: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: invoices }, { data: requests }] = await Promise.all([
      supabase.from('invoices').select('amount_due, amount_paid, status').in('status', ['pending', 'overdue']),
      supabase.from('maintenance_requests').select('id').eq('resident_id', user.id).in('status', ['open', 'in_progress']),
    ])

    const totalDue = (invoices ?? []).reduce((s, i) => s + (i.amount_due - i.amount_paid), 0)
    const overdueCount = (invoices ?? []).filter((i) => i.status === 'overdue').length

    setData({ totalDue, overdueCount, openRequests: requests?.length ?? 0 })
    setLoading(false)
  }

  function formatCurrency(cents: number) {
    return '$' + (cents / 100).toFixed(2)
  }

  if (loading) return <View style={styles.center}><Text style={styles.loading}>Loading…</Text></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Welcome back 👋</Text>
      <Text style={styles.subtitle}>Here's your apartment overview</Text>

      <View style={styles.statsRow}>
        <StatCard label="Total Due" value={formatCurrency(data.totalDue)} accent="#16a34a" />
        <StatCard label="Overdue" value={String(data.overdueCount)} accent={data.overdueCount > 0 ? '#dc2626' : '#64748b'} />
        <StatCard label="Open Requests" value={String(data.openRequests)} accent="#d97706" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <QuickAction label="Pay Bills" emoji="💳" />
        <QuickAction label="New Request" emoji="🔧" />
        <QuickAction label="Notifications" emoji="🔔" />
      </View>
    </ScrollView>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: accent }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function QuickAction({ label, emoji }: { label: string; emoji: string }) {
  return (
    <TouchableOpacity style={styles.actionCard}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#64748b', fontSize: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionEmoji: { fontSize: 24, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
})
