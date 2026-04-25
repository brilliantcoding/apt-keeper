export type UserRole = 'super_admin' | 'manager' | 'staff' | 'resident'
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'closed'
export type MaintenancePriority = 'P1' | 'P2' | 'P3' | 'P4'
export type BillSplitMethod =
  | 'equal'
  | 'sq_ft'
  | 'occupancy'
  | 'percentage'
  | 'fixed'
  | 'metered'
  | 'tiered'
export type NotificationChannel = 'push' | 'email' | 'sms'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type LeaseStatus = 'active' | 'expired' | 'terminated'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          full_name: string
          role: UserRole
          avatar_url: string | null
          fcm_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      properties: {
        Row: {
          id: string
          name: string
          address: string
          manager_id: string
          settings: Record<string, unknown>
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
      }
      units: {
        Row: {
          id: string
          property_id: string
          unit_number: string
          floor: number | null
          sq_ft: number | null
          bedrooms: number
          bathrooms: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['units']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['units']['Insert']>
      }
      leases: {
        Row: {
          id: string
          unit_id: string
          resident_id: string
          start_date: string
          end_date: string | null
          status: LeaseStatus
          monthly_rent: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['leases']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['leases']['Insert']>
      }
      bill_types: {
        Row: {
          id: string
          name: string
          category: string
          is_metered: boolean
          unit_of_measure: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bill_types']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['bill_types']['Insert']>
      }
      bills: {
        Row: {
          id: string
          property_id: string
          bill_type_id: string
          amount: number
          billing_period_start: string
          billing_period_end: string
          due_date: string
          split_rule_id: string | null
          status: 'active' | 'inactive' | 'draft'
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bills']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['bills']['Insert']>
      }
      split_rules: {
        Row: {
          id: string
          property_id: string
          bill_type_id: string | null
          method: BillSplitMethod
          config: Record<string, unknown>
          effective_date: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['split_rules']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['split_rules']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          unit_id: string
          lease_id: string
          bill_id: string
          amount_due: number
          amount_paid: number
          status: InvoiceStatus
          due_date: string
          generation_batch_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_method: string
          stripe_payment_intent_id: string | null
          status: PaymentStatus
          paid_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          channel: NotificationChannel
          event_type: string
          enabled: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notification_preferences']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>
      }
      reminders: {
        Row: {
          id: string
          invoice_id: string
          stage: number
          scheduled_at: string
          sent_at: string | null
          channel: string
          status: 'queued' | 'sent' | 'partial' | 'failed'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>
      }
      maintenance_requests: {
        Row: {
          id: string
          unit_id: string
          resident_id: string
          title: string
          description: string
          priority: MaintenancePriority
          status: MaintenanceStatus
          assigned_to: string | null
          sla_deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['maintenance_requests']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['maintenance_requests']['Insert']>
      }
      maintenance_comments: {
        Row: {
          id: string
          request_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['maintenance_comments']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['maintenance_comments']['Insert']>
      }
      maintenance_photos: {
        Row: {
          id: string
          request_id: string
          storage_path: string
          uploaded_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['maintenance_photos']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['maintenance_photos']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
