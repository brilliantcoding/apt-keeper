import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native'
import { supabase } from '../../src/lib/supabase'

interface Invoice {
  id: string
  amount_due: number
  amount_paid: number
  status: string
  due_date: string
  bills: { bill_types: { name: string } } | null
}

export default function BillsScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    const { data } = await supabase
      .from('invoices')
      .select('*, bills(bill_types(name))')
      .order('due_date', { ascending: false })
    setInvoices((data as any) ?? [])
    setLoading(false)
  }

  async function payInvoice(id: string, amount: number) {
    const appUrl = process.env.EXPO_PUBLIC_APP_URL
    const res = await fetch(`${appUrl}/api/v1/invoices/${id}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    })
    const { url } = await res.json()
    if (url) Linking.openURL(url)
    else Alert.alert('Error', 'Could not initiate payment')
  }

  function formatCurrency(cents: number) {
    return '$' + (cents / 100).toFixed(2)
  }

  const statusColors: Record<string, string> = {
    pending: '#d97706',
    overdue: '#dc2626',
    paid: '#16a34a',
    partial: '#2563eb',
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={invoices}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={loadInvoices}
      ListEmptyComponent={
        !loading ? <Text style={styles.empty}>No invoices found</Text> : null
      }
      renderItem={({ item }) => {
        const remaining = item.amount_due - item.amount_paid
        return (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>
                  {(item.bills as any)?.bill_types?.name ?? 'Bill'}
                </Text>
                <Text style={styles.cardDate}>Due {new Date(item.due_date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.statusBadge, { color: statusColors[item.status] ?? '#64748b' }]}>
                  {item.status.toUpperCase()}
                </Text>
                <Text style={styles.amount}>{formatCurrency(remaining)}</Text>
              </View>
            </View>
            {item.status !== 'paid' && remaining > 0 && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => payInvoice(item.id, remaining)}
              >
                <Text style={styles.payButtonText}>Pay {formatCurrency(remaining)}</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#94a3b8' },
  statusBadge: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  amount: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  payButton: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
