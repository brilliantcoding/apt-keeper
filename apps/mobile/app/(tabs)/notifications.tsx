import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Switch } from 'react-native'
import { supabase } from '../../src/lib/supabase'

interface Preference {
  id: string
  channel: string
  event_type: string
  enabled: boolean
}

const EVENT_TYPES = [
  { key: 'bill_reminder', label: 'Bill Reminders' },
  { key: 'bill_overdue', label: 'Overdue Notices' },
  { key: 'maintenance_update', label: 'Maintenance Updates' },
  { key: 'payment_confirmed', label: 'Payment Confirmations' },
]

const CHANNELS = ['email', 'push', 'sms']

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrefs()
  }, [])

  async function loadPrefs() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user!.id)

    const map: Record<string, boolean> = {}
    for (const pref of (data ?? []) as Preference[]) {
      map[`${pref.channel}:${pref.event_type}`] = pref.enabled
    }
    setPrefs(map)
    setLoading(false)
  }

  async function togglePref(channel: string, eventType: string, enabled: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    const key = `${channel}:${eventType}`
    setPrefs((prev) => ({ ...prev, [key]: enabled }))

    await supabase.from('notification_preferences').upsert(
      { user_id: user!.id, channel, event_type: eventType, enabled },
      { onConflict: 'user_id,channel,event_type' }
    )
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={EVENT_TYPES}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={
        <View>
          <Text style={styles.description}>
            Manage which notifications you receive and through which channels.
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel} />
            {CHANNELS.map((c) => (
              <Text key={c} style={styles.channelLabel}>{c}</Text>
            ))}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.eventLabel}>{item.label}</Text>
          {CHANNELS.map((channel) => (
            <Switch
              key={channel}
              value={prefs[`${channel}:${item.key}`] ?? true}
              onValueChange={(v) => togglePref(channel, item.key, v)}
              trackColor={{ true: '#16a34a', false: '#e2e8f0' }}
              thumbColor="#fff"
              style={styles.switch}
            />
          ))}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  description: { fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
  },
  headerLabel: { flex: 1 },
  channelLabel: { width: 56, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0f172a' },
  switch: { width: 56, transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
})
