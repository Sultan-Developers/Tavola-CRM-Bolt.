export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          role: 'business_owner' | 'super_admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          avatar_url?: string | null
          role?: 'business_owner' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'business_owner' | 'super_admin'
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          type: 'hotel' | 'restaurant' | 'cafe' | 'other'
          phone: string | null
          google_review_url: string | null
          status: 'active' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          type?: 'hotel' | 'restaurant' | 'cafe' | 'other'
          phone?: string | null
          google_review_url?: string | null
          status?: 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'hotel' | 'restaurant' | 'cafe' | 'other'
          phone?: string | null
          google_review_url?: string | null
          status?: 'active' | 'suspended'
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          business_id: string
          plan: 'monthly' | 'yearly'
          status: 'active' | 'expired' | 'suspended' | 'trial'
          starts_at: string
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          plan?: 'monthly' | 'yearly'
          status?: 'active' | 'expired' | 'suspended' | 'trial'
          starts_at?: string
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan?: 'monthly' | 'yearly'
          status?: 'active' | 'expired' | 'suspended' | 'trial'
          ends_at?: string | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          business_id: string
          name: string
          phone: string
          email: string | null
          birthday: string | null
          notes: string | null
          consent_status: 'yes' | 'no' | 'pending'
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          phone: string
          email?: string | null
          birthday?: string | null
          notes?: string | null
          consent_status?: 'yes' | 'no' | 'pending'
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string
          email?: string | null
          birthday?: string | null
          notes?: string | null
          consent_status?: 'yes' | 'no' | 'pending'
          deleted_at?: string | null
          updated_at?: string
        }
      }
      customer_tags: {
        Row: {
          id: string
          business_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
      }
      customer_tag_relations: {
        Row: {
          customer_id: string
          tag_id: string
        }
        Insert: {
          customer_id: string
          tag_id: string
        }
        Update: Record<string, never>
      }
      campaigns: {
        Row: {
          id: string
          business_id: string
          name: string
          type: 'review' | 'custom'
          message_template: string
          status: 'draft' | 'sent' | 'deleted'
          sent_at: string | null
          recipient_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          type?: 'review' | 'custom'
          message_template: string
          status?: 'draft' | 'sent' | 'deleted'
          sent_at?: string | null
          recipient_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'review' | 'custom'
          message_template?: string
          status?: 'draft' | 'sent' | 'deleted'
          sent_at?: string | null
          recipient_count?: number
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          business_id: string
          subscription_id: string | null
          plan: 'monthly' | 'yearly'
          amount: number
          currency: string
          screenshot_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          upi_ref: string | null
          notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          subscription_id?: string | null
          plan: 'monthly' | 'yearly'
          amount: number
          currency?: string
          screenshot_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          upi_ref?: string | null
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          screenshot_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          upi_ref?: string | null
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          business_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          business_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
      }
    }
    Views: Record<string, never>
    Functions: {
      check_is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}
