import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../src/lib/supabase'

interface Request {
  id: string
  title: string
  description: string
  priority: string
  status: string
  created_at: string
}

export default function MaintenanceScreen() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('P3')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('resident_id', user!.id)
      .order('created_at', { ascending: false })
    setRequests((data as any) ?? [])
    setLoading(false)
  }

  async function submitRequest() {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Title and description are required')
      return
    }
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const appUrl = process.env.EXPO_PUBLIC_APP_URL

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('priority', priority)

    const res = await fetch(`${appUrl}/api/v1/maintenance-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: formData,
    })

    if (res.ok) {
      setModalOpen(false)
      setTitle('')
      setDescription('')
      setPriority('P3')
      loadRequests()
    } else {
      Alert.alert('Error', 'Failed to submit request')
    }
    setSubmitting(false)
  }

  const priorityColors: Record<string, string> = {
    P1: '#dc2626', P2: '#ea580c', P3: '#d97706', P4: '#2563eb',
  }

  const statusColors: Record<string, string> = {
    open: '#2563eb', in_progress: '#d97706', completed: '#16a34a', closed: '#64748b',
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={requests}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadRequests}
        ListHeaderComponent={
          <TouchableOpacity style={styles.newButton} onPress={() => setModalOpen(true)}>
            <Text style={styles.newButtonText}>+ New Request</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No maintenance requests yet</Text> : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: priorityColors[item.priority] ?? '#64748b' }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.priority, { color: priorityColors[item.priority] }]}>
                {item.priority}
              </Text>
              <Text style={[styles.status, { color: statusColors[item.status] ?? '#64748b' }]}>
                {item.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Maintenance Request</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Leaking faucet"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue…"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {['P1', 'P2', 'P3', 'P4'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  priority === p && { backgroundColor: priorityColors[p], borderColor: priorityColors[p] },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityChipText, priority === p && { color: '#fff' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            onPress={submitRequest}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  newButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  newButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priority: { fontSize: 11, fontWeight: '700' },
  status: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  cardDate: { fontSize: 11, color: '#94a3b8' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalContent: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  closeBtn: { fontSize: 18, color: '#64748b' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#0f172a',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  priorityChipText: { fontWeight: '700', color: '#475569' },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
