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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bank_transactions: {
        Row: {
          amount: number
          assigned_at: string | null
          assigned_by: string | null
          assigned_category_id: string | null
          assigned_donor_id: string | null
          assigned_need_id: string | null
          created_at: string
          created_by: string | null
          id: string
          narration: string | null
          payment_mode: string
          reconciled_at: string | null
          reconciled_by: string | null
          reference_number: string | null
          remarks: string | null
          source: string
          status: string
          transaction_date: string
          trust_id: string
        }
        Insert: {
          amount: number
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_category_id?: string | null
          assigned_donor_id?: string | null
          assigned_need_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          narration?: string | null
          payment_mode?: string
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          remarks?: string | null
          source?: string
          status?: string
          transaction_date: string
          trust_id: string
        }
        Update: {
          amount?: number
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_category_id?: string | null
          assigned_donor_id?: string | null
          assigned_need_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          narration?: string | null
          payment_mode?: string
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          remarks?: string | null
          source?: string
          status?: string
          transaction_date?: string
          trust_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_assigned_category_id_fkey"
            columns: ["assigned_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_assigned_donor_id_fkey"
            columns: ["assigned_donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_assigned_need_id_fkey"
            columns: ["assigned_need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      corpus_fund_contributions: {
        Row: {
          amount: number
          contribution_date: string
          contribution_mode: string | null
          created_at: string | null
          declaration_agreed: boolean | null
          declaration_agreed_at: string | null
          donor_address: string | null
          donor_id: string | null
          donor_name: string | null
          donor_pan: string | null
          id: string
          notes: string | null
          purpose: string | null
          reference_number: string | null
          trust_id: string
        }
        Insert: {
          amount: number
          contribution_date: string
          contribution_mode?: string | null
          created_at?: string | null
          declaration_agreed?: boolean | null
          declaration_agreed_at?: string | null
          donor_address?: string | null
          donor_id?: string | null
          donor_name?: string | null
          donor_pan?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          reference_number?: string | null
          trust_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          contribution_mode?: string | null
          created_at?: string | null
          declaration_agreed?: boolean | null
          declaration_agreed_at?: string | null
          donor_address?: string | null
          donor_id?: string | null
          donor_name?: string | null
          donor_pan?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          reference_number?: string | null
          trust_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpus_fund_contributions_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corpus_fund_contributions_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_payments: {
        Row: {
          amount: number
          created_at: string | null
          donation_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          donation_id: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          donation_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donation_payments_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_pledged: number
          created_at: string | null
          donor_id: string
          home_id: string
          id: string
          in_kind_details: string | null
          last_paid_date: string | null
          need_id: string | null
          next_due_date: string | null
          occasion_note: string | null
          occasion_type: Database["public"]["Enums"]["occasion_type"] | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          sponsorship_type: Database["public"]["Enums"]["donation_type"]
          start_date: string
          status: Database["public"]["Enums"]["donation_status"] | null
          trust_id: string
          updated_at: string | null
        }
        Insert: {
          amount_pledged: number
          created_at?: string | null
          donor_id: string
          home_id: string
          id?: string
          in_kind_details?: string | null
          last_paid_date?: string | null
          need_id?: string | null
          next_due_date?: string | null
          occasion_note?: string | null
          occasion_type?: Database["public"]["Enums"]["occasion_type"] | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          sponsorship_type?: Database["public"]["Enums"]["donation_type"]
          start_date: string
          status?: Database["public"]["Enums"]["donation_status"] | null
          trust_id: string
          updated_at?: string | null
        }
        Update: {
          amount_pledged?: number
          created_at?: string | null
          donor_id?: string
          home_id?: string
          id?: string
          in_kind_details?: string | null
          last_paid_date?: string | null
          need_id?: string | null
          next_due_date?: string | null
          occasion_note?: string | null
          occasion_type?: Database["public"]["Enums"]["occasion_type"] | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          sponsorship_type?: Database["public"]["Enums"]["donation_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["donation_status"] | null
          trust_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      food_slot_pricing: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          price: number
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          price?: number
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          price?: number
          time_slot?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      food_slots: {
        Row: {
          amount: number | null
          completion_notes: string | null
          completion_photos: string[] | null
          completion_status: string | null
          created_at: string | null
          created_by: string | null
          current_sponsors_count: number | null
          date: string
          donate_on_behalf_of: string | null
          donor_id: string | null
          home_id: string
          id: string
          max_sponsors_allowed: number | null
          meal_type: string | null
          note: string | null
          payment_status: string | null
          payment_mode: string | null
          amount_paid: number | null
          donation_id: string | null
          cheque_number: string | null
          bank_name: string | null
          cheque_image_url: string | null
          cheque_status: string | null
          reason: string | null
          report_sent_at: string | null
          sponsor_for: string | null
          status: Database["public"]["Enums"]["food_slot_status"]
          time_slot: Database["public"]["Enums"]["food_time_slot"]
          trust_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          current_sponsors_count?: number | null
          date: string
          donate_on_behalf_of?: string | null
          donor_id?: string | null
          home_id: string
          id?: string
          max_sponsors_allowed?: number | null
          meal_type?: string | null
          note?: string | null
          payment_status?: string | null
          payment_mode?: string | null
          amount_paid?: number | null
          donation_id?: string | null
          cheque_number?: string | null
          bank_name?: string | null
          cheque_image_url?: string | null
          cheque_status?: string | null
          reason?: string | null
          report_sent_at?: string | null
          sponsor_for?: string | null
          status?: Database["public"]["Enums"]["food_slot_status"]
          time_slot: Database["public"]["Enums"]["food_time_slot"]
          trust_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          current_sponsors_count?: number | null
          date?: string
          donate_on_behalf_of?: string | null
          donor_id?: string | null
          home_id?: string
          id?: string
          max_sponsors_allowed?: number | null
          meal_type?: string | null
          note?: string | null
          payment_status?: string | null
          payment_mode?: string | null
          amount_paid?: number | null
          donation_id?: string | null
          cheque_number?: string | null
          bank_name?: string | null
          cheque_image_url?: string | null
          cheque_status?: string | null
          reason?: string | null
          report_sent_at?: string | null
          sponsor_for?: string | null
          status?: Database["public"]["Enums"]["food_slot_status"]
          time_slot?: Database["public"]["Enums"]["food_time_slot"]
          trust_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_slots_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_slots_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_slots_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      home_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          home_id: string
          id: string
          is_primary: boolean | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          home_id: string
          id?: string
          is_primary?: boolean | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          home_id?: string
          id?: string
          is_primary?: boolean | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_photos_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      home_types: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      homes: {
        Row: {
          address: string
          capacity_children_female: number | null
          capacity_children_male: number | null
          capacity_elderly_female: number | null
          capacity_elderly_male: number | null
          city: string
          contact_details: string | null
          country: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          pincode: string
          primary_warden_id: string | null
          state: string
          supported_by: string | null
          trust_id: string
          type: Database["public"]["Enums"]["home_type"]
          updated_at: string | null
          year_established: number | null
        }
        Insert: {
          address: string
          capacity_children_female?: number | null
          capacity_children_male?: number | null
          capacity_elderly_female?: number | null
          capacity_elderly_male?: number | null
          city: string
          contact_details?: string | null
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          pincode: string
          primary_warden_id?: string | null
          state: string
          supported_by?: string | null
          trust_id: string
          type: Database["public"]["Enums"]["home_type"]
          updated_at?: string | null
          year_established?: number | null
        }
        Update: {
          address?: string
          capacity_children_female?: number | null
          capacity_children_male?: number | null
          capacity_elderly_female?: number | null
          capacity_elderly_male?: number | null
          city?: string
          contact_details?: string | null
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          pincode?: string
          primary_warden_id?: string | null
          state?: string
          supported_by?: string | null
          trust_id?: string
          type?: Database["public"]["Enums"]["home_type"]
          updated_at?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homes_primary_warden_id_fkey"
            columns: ["primary_warden_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homes_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      kind_donations: {
        Row: {
          completion_notes: string | null
          completion_photos: string[] | null
          created_at: string | null
          delivery_mode: string | null
          donor_id: string | null
          donor_name: string | null
          estimated_value: number | null
          home_id: string
          id: string
          item_description: string | null
          item_type: string
          need_id: string | null
          notes: string | null
          quantity: number | null
          received_date: string
          report_sent_at: string | null
          status: string | null
          trust_id: string
        }
        Insert: {
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string | null
          delivery_mode?: string | null
          donor_id?: string | null
          donor_name?: string | null
          estimated_value?: number | null
          home_id: string
          id?: string
          item_description?: string | null
          item_type: string
          need_id?: string | null
          notes?: string | null
          quantity?: number | null
          received_date: string
          report_sent_at?: string | null
          status?: string | null
          trust_id: string
        }
        Update: {
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string | null
          delivery_mode?: string | null
          donor_id?: string | null
          donor_name?: string | null
          estimated_value?: number | null
          home_id?: string
          id?: string
          item_description?: string | null
          item_type?: string
          need_id?: string | null
          notes?: string | null
          quantity?: number | null
          received_date?: string
          report_sent_at?: string | null
          status?: string | null
          trust_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kind_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_donations_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_donations_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_donations_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          collected_amount: number | null
          created_at: string | null
          created_by: string | null
          current_sponsors_count: number | null
          date: string
          description: string | null
          donation_mode: string | null
          estimated_unit_price: number | null
          fulfilled_product_qty: number | null
          fulfillment_details: string | null
          help_mode: Database["public"]["Enums"]["help_mode"]
          home_id: string
          id: string
          max_sponsors_allowed: number | null
          photo_urls: string[] | null
          product_link: string | null
          product_name: string | null
          product_specification: string | null
          product_unit: string | null
          quantity: number
          quotation_urls: string[] | null
          recurring_end_date: string | null
          recurring_frequency:
            | Database["public"]["Enums"]["recurring_frequency"]
            | null
          report_sent_at: string | null
          required_amount: number | null
          required_product_qty: number | null
          staff_name: string | null
          status: Database["public"]["Enums"]["need_status"] | null
          sub_subcategory_id: string | null
          subcategory_id: string | null
          submitter_email: string | null
          trust_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          collected_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          current_sponsors_count?: number | null
          date: string
          description?: string | null
          donation_mode?: string | null
          estimated_unit_price?: number | null
          fulfilled_product_qty?: number | null
          fulfillment_details?: string | null
          help_mode?: Database["public"]["Enums"]["help_mode"]
          home_id: string
          id?: string
          max_sponsors_allowed?: number | null
          photo_urls?: string[] | null
          product_link?: string | null
          product_name?: string | null
          product_specification?: string | null
          product_unit?: string | null
          quantity?: number
          quotation_urls?: string[] | null
          recurring_end_date?: string | null
          recurring_frequency?:
            | Database["public"]["Enums"]["recurring_frequency"]
            | null
          report_sent_at?: string | null
          required_amount?: number | null
          required_product_qty?: number | null
          staff_name?: string | null
          status?: Database["public"]["Enums"]["need_status"] | null
          sub_subcategory_id?: string | null
          subcategory_id?: string | null
          submitter_email?: string | null
          trust_id: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          collected_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          current_sponsors_count?: number | null
          date?: string
          description?: string | null
          donation_mode?: string | null
          estimated_unit_price?: number | null
          fulfilled_product_qty?: number | null
          fulfillment_details?: string | null
          help_mode?: Database["public"]["Enums"]["help_mode"]
          home_id?: string
          id?: string
          max_sponsors_allowed?: number | null
          photo_urls?: string[] | null
          product_link?: string | null
          product_name?: string | null
          product_specification?: string | null
          product_unit?: string | null
          quantity?: number
          quotation_urls?: string[] | null
          recurring_end_date?: string | null
          recurring_frequency?:
            | Database["public"]["Enums"]["recurring_frequency"]
            | null
          report_sent_at?: string | null
          required_amount?: number | null
          required_product_qty?: number | null
          staff_name?: string | null
          status?: Database["public"]["Enums"]["need_status"] | null
          sub_subcategory_id?: string | null
          subcategory_id?: string | null
          submitter_email?: string | null
          trust_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "needs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_sub_subcategory_id_fkey"
            columns: ["sub_subcategory_id"]
            isOneToOne: false
            referencedRelation: "sub_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhar_number: string | null
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          designation: string | null
          donor_category: string | null
          donor_type: string | null
          email: string
          home_id: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          pan_number: string | null
          phone: string | null
          pincode: string | null
          referred_by: string | null
          religion: string | null
          requires_80g: boolean | null
          state: string | null
          status: string | null
          trust_id: string | null
          updated_at: string | null
          working_sector: string | null
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          designation?: string | null
          donor_category?: string | null
          donor_type?: string | null
          email: string
          home_id?: string | null
          id: string
          name: string
          notes?: string | null
          organization?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          referred_by?: string | null
          religion?: string | null
          requires_80g?: boolean | null
          state?: string | null
          status?: string | null
          trust_id?: string | null
          updated_at?: string | null
          working_sector?: string | null
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          designation?: string | null
          donor_category?: string | null
          donor_type?: string | null
          email?: string
          home_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          referred_by?: string | null
          religion?: string | null
          requires_80g?: boolean | null
          state?: string | null
          status?: string | null
          trust_id?: string | null
          updated_at?: string | null
          working_sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      religions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          age: number
          category: Database["public"]["Enums"]["resident_category"]
          created_at: string | null
          gender: string
          home_id: string
          id: string
          name: string
          photo_url: string | null
          special_needs: string | null
          status: Database["public"]["Enums"]["resident_status"] | null
          updated_at: string | null
        }
        Insert: {
          age: number
          category: Database["public"]["Enums"]["resident_category"]
          created_at?: string | null
          gender: string
          home_id: string
          id?: string
          name: string
          photo_url?: string | null
          special_needs?: string | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
        }
        Update: {
          age?: number
          category?: Database["public"]["Enums"]["resident_category"]
          created_at?: string | null
          gender?: string
          home_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          special_needs?: string | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_subcategories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          subcategory_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          home_id: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          related_donor_id: string | null
          related_need_id: string | null
          report_sent_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          trust_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          home_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_donor_id?: string | null
          related_need_id?: string | null
          report_sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          trust_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          home_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_donor_id?: string | null
          related_need_id?: string | null
          report_sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          trust_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_donor_id_fkey"
            columns: ["related_donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_need_id_fkey"
            columns: ["related_need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      trusts: {
        Row: {
          address: string
          city: string
          contact_email: string
          contact_phone: string
          country: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          pincode: string
          registration_number: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          contact_email: string
          contact_phone: string
          country?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          pincode: string
          registration_number?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          contact_email?: string
          contact_phone?: string
          country?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          pincode?: string
          registration_number?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trusts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_overdue_payments: {
        Args: never
        Returns: {
          amount: number
          days_overdue: number
          donation_id: string
          donor_id: string
          home_name: string
          next_due_date: string
        }[]
      }
      check_recurring_payment_due: {
        Args: never
        Returns: {
          amount: number
          days_until_due: number
          donation_id: string
          donor_id: string
          home_name: string
          next_due_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "employee"
        | "warden"
        | "donor"
        | "finance"
      donation_status:
        | "PLEDGED"
        | "ACTIVE"
        | "PAUSED"
        | "COMPLETED"
        | "CANCELLED"
        | "OVERDUE"
      donation_type: "ONE_TIME" | "RECURRING"
      food_slot_status: "NEED" | "BOOKED" | "PAID"
      food_time_slot: "MORNING" | "REFRESHMENTS" | "AFTERNOON" | "EVENING" | "OUTSIDE_FOOD"
      help_mode: "ONE_TIME" | "RECURRING"
      home_type:
        | "children_home"
        | "old_age_home"
        | "mixed"
        | "others"
        | "special_children"
      need_status:
        | "OPEN"
        | "PARTIAL"
        | "FULLY_SPONSORED"
        | "COMPLETED"
        | "CANCELLED"
      notification_type:
        | "donation_reminder"
        | "new_need_posted"
        | "task_assigned"
        | "task_due"
        | "recurring_payment_due"
        | "payment_awaiting_assignment"
        | "payment_assigned"
        | "payment_reconciled"
      occasion_type: "birthday" | "ancestor_remembrance" | "festival" | "other"
      payment_mode: "online" | "offline" | "in_kind"
      recurring_frequency: "monthly" | "quarterly" | "yearly" | "none"
      resident_category: "child" | "old_age" | "others"
      resident_status: "active" | "moved_out" | "deceased"
      task_priority: "low" | "medium" | "high"
      task_status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
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
      app_role: [
        "super_admin",
        "admin",
        "employee",
        "warden",
        "donor",
        "finance",
      ],
      donation_status: [
        "PLEDGED",
        "ACTIVE",
        "PAUSED",
        "COMPLETED",
        "CANCELLED",
        "OVERDUE",
      ],
      donation_type: ["ONE_TIME", "RECURRING"],
      food_slot_status: ["NEED", "BOOKED", "PAID"],
      food_time_slot: ["MORNING", "REFRESHMENTS", "AFTERNOON", "EVENING", "OUTSIDE_FOOD"],
      help_mode: ["ONE_TIME", "RECURRING"],
      home_type: [
        "children_home",
        "old_age_home",
        "mixed",
        "others",
        "special_children",
      ],
      need_status: [
        "OPEN",
        "PARTIAL",
        "FULLY_SPONSORED",
        "COMPLETED",
        "CANCELLED",
      ],
      notification_type: [
        "donation_reminder",
        "new_need_posted",
        "task_assigned",
        "task_due",
        "recurring_payment_due",
        "payment_awaiting_assignment",
        "payment_assigned",
        "payment_reconciled",
      ],
      occasion_type: ["birthday", "ancestor_remembrance", "festival", "other"],
      payment_mode: ["online", "offline", "in_kind"],
      recurring_frequency: ["monthly", "quarterly", "yearly", "none"],
      resident_category: ["child", "old_age", "others"],
      resident_status: ["active", "moved_out", "deceased"],
      task_priority: ["low", "medium", "high"],
      task_status: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
    },
  },
} as const
