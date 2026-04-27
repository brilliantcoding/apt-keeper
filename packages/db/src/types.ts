export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_types: {
        Row: {
          category: string
          created_at: string
          id: string
          is_metered: boolean
          name: string
          unit_of_measure: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_metered?: boolean
          name: string
          unit_of_measure?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_metered?: boolean
          name?: string
          unit_of_measure?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          bill_type_id: string
          billing_period_end: string
          billing_period_start: string
          created_at: string
          created_by: string
          due_date: string
          id: string
          property_id: string
          split_rule_id: string | null
          status: Database["public"]["Enums"]["bill_status"]
        }
        Insert: {
          amount: number
          bill_type_id: string
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          created_by: string
          due_date: string
          id?: string
          property_id: string
          split_rule_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
        }
        Update: {
          amount?: number
          bill_type_id?: string
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          property_id?: string
          split_rule_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bills_bill_type_id_fkey"
            columns: ["bill_type_id"]
            isOneToOne: false
            referencedRelation: "bill_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_split_rule_id_fkey"
            columns: ["split_rule_id"]
            isOneToOne: false
            referencedRelation: "split_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          bill_id: string
          created_at: string
          due_date: string
          generation_batch_id: string | null
          id: string
          lease_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          unit_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          bill_id: string
          created_at?: string
          due_date: string
          generation_batch_id?: string | null
          id?: string
          lease_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          unit_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          bill_id?: string
          created_at?: string
          due_date?: string
          generation_batch_id?: string | null
          id?: string
          lease_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          monthly_rent: number
          resident_id: string
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          unit_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_rent: number
          resident_id: string
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          unit_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_rent?: number
          resident_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_photos: {
        Row: {
          created_at: string
          id: string
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_photos_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          resident_id: string
          sla_deadline: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          resident_id: string
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          resident_id?: string
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          paid_at: string | null
          payment_method: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          paid_at?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          paid_at?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          created_at: string
          id: string
          manager_id: string
          name: string
          settings: Json
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          manager_id: string
          name: string
          settings?: Json
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          manager_id?: string
          name?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "properties_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          channel: string
          created_at: string
          id: string
          invoice_id: string
          scheduled_at: string
          sent_at: string | null
          stage: number
          status: Database["public"]["Enums"]["reminder_status"]
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          invoice_id: string
          scheduled_at: string
          sent_at?: string | null
          stage: number
          status?: Database["public"]["Enums"]["reminder_status"]
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          invoice_id?: string
          scheduled_at?: string
          sent_at?: string | null
          stage?: number
          status?: Database["public"]["Enums"]["reminder_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      split_rules: {
        Row: {
          bill_type_id: string | null
          config: Json
          created_at: string
          effective_date: string
          id: string
          method: Database["public"]["Enums"]["bill_split_method"]
          property_id: string
        }
        Insert: {
          bill_type_id?: string | null
          config?: Json
          created_at?: string
          effective_date?: string
          id?: string
          method?: Database["public"]["Enums"]["bill_split_method"]
          property_id: string
        }
        Update: {
          bill_type_id?: string | null
          config?: Json
          created_at?: string
          effective_date?: string
          id?: string
          method?: Database["public"]["Enums"]["bill_split_method"]
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_rules_bill_type_id_fkey"
            columns: ["bill_type_id"]
            isOneToOne: false
            referencedRelation: "bill_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bathrooms: number
          bedrooms: number
          created_at: string
          floor: number | null
          id: string
          property_id: string
          sq_ft: number | null
          unit_number: string
        }
        Insert: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          floor?: number | null
          id?: string
          property_id: string
          sq_ft?: number | null
          unit_number: string
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          floor?: number | null
          id?: string
          property_id?: string
          sq_ft?: number | null
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          fcm_token: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          fcm_token?: string | null
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          fcm_token?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_manager_or_above: { Args: never; Returns: boolean }
    }
    Enums: {
      bill_split_method:
        | "equal"
        | "sq_ft"
        | "occupancy"
        | "percentage"
        | "fixed"
        | "metered"
        | "tiered"
      bill_status: "draft" | "active" | "inactive"
      invoice_status: "pending" | "partial" | "paid" | "overdue" | "cancelled"
      lease_status: "active" | "expired" | "terminated"
      maintenance_priority: "P1" | "P2" | "P3" | "P4"
      maintenance_status: "open" | "in_progress" | "completed" | "closed"
      notification_channel: "push" | "email" | "sms"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      reminder_status: "queued" | "sent" | "partial" | "failed"
      user_role: "super_admin" | "manager" | "staff" | "resident"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bill_split_method: [
        "equal",
        "sq_ft",
        "occupancy",
        "percentage",
        "fixed",
        "metered",
        "tiered",
      ],
      bill_status: ["draft", "active", "inactive"],
      invoice_status: ["pending", "partial", "paid", "overdue", "cancelled"],
      lease_status: ["active", "expired", "terminated"],
      maintenance_priority: ["P1", "P2", "P3", "P4"],
      maintenance_status: ["open", "in_progress", "completed", "closed"],
      notification_channel: ["push", "email", "sms"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      reminder_status: ["queued", "sent", "partial", "failed"],
      user_role: ["super_admin", "manager", "staff", "resident"],
    },
  },
} as const
