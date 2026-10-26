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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      design_events: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          design_id: string | null
          event: string
          id: number
          outlet_id: string | null
          transfer_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          design_id?: string | null
          event: string
          id?: number
          outlet_id?: string | null
          transfer_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          design_id?: string | null
          event?: string
          id?: number
          outlet_id?: string | null
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_events_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_events_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_events_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["open_transfer_id"]
          },
          {
            foreignKeyName: "design_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      design_locations: {
        Row: {
          arrived_at: string
          design_id: string
          id: number
          left_at: string | null
          outlet_id: string
        }
        Insert: {
          arrived_at: string
          design_id: string
          id?: number
          left_at?: string | null
          outlet_id: string
        }
        Update: {
          arrived_at?: string
          design_id?: string
          id?: number
          left_at?: string | null
          outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_locations_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_locations_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_locations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      design_media: {
        Row: {
          bytes: number | null
          created_at: string
          design_id: string
          duration_s: number | null
          height: number | null
          id: string
          is_current: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          mime: string | null
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          design_id: string
          duration_s?: number | null
          height?: number | null
          id?: string
          is_current?: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          mime?: string | null
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          design_id?: string
          duration_s?: number | null
          height?: number | null
          id?: string
          is_current?: boolean
          kind?: Database["public"]["Enums"]["media_kind"]
          mime?: string | null
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "design_media_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_media_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          barcode: string
          category_id: string
          created_at: string
          created_by: string
          current_outlet_id: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          location_since: string
          media_flag: boolean
          mrp: number
          notes: string | null
          origin_outlet_id: string
          sku: string
          sold_amount: number | null
          sold_at: string | null
          sold_by: string | null
          sold_invoice_no: string | null
          sold_invoice_path: string | null
          status: Database["public"]["Enums"]["design_status"]
          title: string | null
          unclear_votes: number
          updated_at: string
        }
        Insert: {
          barcode: string
          category_id: string
          created_at?: string
          created_by: string
          current_outlet_id: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          location_since?: string
          media_flag?: boolean
          mrp: number
          notes?: string | null
          origin_outlet_id: string
          sku: string
          sold_amount?: number | null
          sold_at?: string | null
          sold_by?: string | null
          sold_invoice_no?: string | null
          sold_invoice_path?: string | null
          status?: Database["public"]["Enums"]["design_status"]
          title?: string | null
          unclear_votes?: number
          updated_at?: string
        }
        Update: {
          barcode?: string
          category_id?: string
          created_at?: string
          created_by?: string
          current_outlet_id?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          location_since?: string
          media_flag?: boolean
          mrp?: number
          notes?: string | null
          origin_outlet_id?: string
          sku?: string
          sold_amount?: number | null
          sold_at?: string | null
          sold_by?: string | null
          sold_invoice_no?: string | null
          sold_invoice_path?: string | null
          status?: Database["public"]["Enums"]["design_status"]
          title?: string | null
          unclear_votes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_current_outlet_id_fkey"
            columns: ["current_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_origin_outlet_id_fkey"
            columns: ["origin_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holds: {
        Row: {
          days: number
          design_id: string
          doc_path: string
          expires_at: string
          expiry_notified: boolean
          held_at: string
          held_by: string
          hold_no: number
          id: string
          outlet_id: string
          reason: string
          release_note: string | null
          released_at: string | null
          released_by: string | null
          source: string
          transfer_id: string | null
        }
        Insert: {
          days: number
          design_id: string
          doc_path: string
          expires_at: string
          expiry_notified?: boolean
          held_at?: string
          held_by: string
          hold_no: number
          id?: string
          outlet_id: string
          reason: string
          release_note?: string | null
          released_at?: string | null
          released_by?: string | null
          source?: string
          transfer_id?: string | null
        }
        Update: {
          days?: number
          design_id?: string
          doc_path?: string
          expires_at?: string
          expiry_notified?: boolean
          held_at?: string
          held_by?: string
          hold_no?: number
          id?: string
          outlet_id?: string
          reason?: string
          release_note?: string | null
          released_at?: string | null
          released_by?: string | null
          source?: string
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holds_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_held_by_fkey"
            columns: ["held_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_held_by_fkey"
            columns: ["held_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["open_transfer_id"]
          },
          {
            foreignKeyName: "holds_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      image_corrections: {
        Row: {
          design_id: string
          id: string
          kinds: Database["public"]["Enums"]["media_kind"][]
          note: string
          requested_at: string
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          design_id: string
          id?: string
          kinds: Database["public"]["Enums"]["media_kind"][]
          note: string
          requested_at?: string
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          design_id?: string
          id?: string
          kinds?: Database["public"]["Enums"]["media_kind"][]
          note?: string
          requested_at?: string
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_corrections_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_corrections_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_corrections_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_corrections_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_corrections_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_corrections_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_votes: {
        Row: {
          created_at: string
          design_id: string
          id: string
          kinds: Database["public"]["Enums"]["media_kind"][] | null
          note: string | null
          owner_outlet_id: string
          resolved_at: string | null
          resolved_by: string | null
          voter_id: string
          voter_outlet_id: string | null
          withdrawn: boolean
        }
        Insert: {
          created_at?: string
          design_id: string
          id?: string
          kinds?: Database["public"]["Enums"]["media_kind"][] | null
          note?: string | null
          owner_outlet_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          voter_id: string
          voter_outlet_id?: string | null
          withdrawn?: boolean
        }
        Update: {
          created_at?: string
          design_id?: string
          id?: string
          kinds?: Database["public"]["Enums"]["media_kind"][] | null
          note?: string | null
          owner_outlet_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          voter_id?: string
          voter_outlet_id?: string | null
          withdrawn?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "image_votes_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_owner_outlet_id_fkey"
            columns: ["owner_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_votes_voter_outlet_id_fkey"
            columns: ["voter_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: number
          ip: string
          ok: boolean
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          ip: string
          ok: boolean
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          ip?: string
          ok?: boolean
          username?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          design_id: string | null
          id: number
          kind: string
          read_at: string | null
          title: string
          transfer_id: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          design_id?: string | null
          id?: number
          kind: string
          read_at?: string | null
          title: string
          transfer_id?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          design_id?: string | null
          id?: number
          kind?: string
          read_at?: string | null
          title?: string
          transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["open_transfer_id"]
          },
          {
            foreignKeyName: "notifications_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          active: boolean
          address: string | null
          code: string
          created_at: string
          id: string
          is_head_office: boolean
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_head_office?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_head_office?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          created_by: string | null
          email: string
          failed_logins: number
          full_name: string
          id: string
          last_login_at: string | null
          locked_until: string | null
          must_change_password: boolean
          outlet_id: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          failed_logins?: number
          full_name: string
          id: string
          last_login_at?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          outlet_id?: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          failed_logins?: number
          full_name?: string
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          outlet_id?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          decided_at: string | null
          decided_by: string | null
          design_id: string
          from_outlet_id: string
          ho_dispatched_at: string | null
          ho_dispatched_by: string | null
          ho_note: string | null
          ho_received_at: string | null
          ho_received_by: string | null
          id: string
          prev_location_since: string | null
          received_at: string | null
          received_by: string | null
          reject_doc_path: string | null
          reject_hold_days: number | null
          reject_reason: string | null
          request_note: string | null
          requested_at: string
          requested_by: string
          sent_to_ho_at: string | null
          sent_to_ho_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_outlet_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          design_id: string
          from_outlet_id: string
          ho_dispatched_at?: string | null
          ho_dispatched_by?: string | null
          ho_note?: string | null
          ho_received_at?: string | null
          ho_received_by?: string | null
          id?: string
          prev_location_since?: string | null
          received_at?: string | null
          received_by?: string | null
          reject_doc_path?: string | null
          reject_hold_days?: number | null
          reject_reason?: string | null
          request_note?: string | null
          requested_at?: string
          requested_by: string
          sent_to_ho_at?: string | null
          sent_to_ho_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_outlet_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          design_id?: string
          from_outlet_id?: string
          ho_dispatched_at?: string | null
          ho_dispatched_by?: string | null
          ho_note?: string | null
          ho_received_at?: string | null
          ho_received_by?: string | null
          id?: string
          prev_location_since?: string | null
          received_at?: string | null
          received_by?: string | null
          reject_doc_path?: string | null
          reject_hold_days?: number | null
          reject_reason?: string | null
          request_note?: string | null
          requested_at?: string
          requested_by?: string
          sent_to_ho_at?: string | null
          sent_to_ho_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_outlet_id_fkey"
            columns: ["from_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_ho_dispatched_by_fkey"
            columns: ["ho_dispatched_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_ho_dispatched_by_fkey"
            columns: ["ho_dispatched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_ho_received_by_fkey"
            columns: ["ho_received_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_ho_received_by_fkey"
            columns: ["ho_received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_sent_to_ho_by_fkey"
            columns: ["sent_to_ho_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_sent_to_ho_by_fkey"
            columns: ["sent_to_ho_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_outlet_id_fkey"
            columns: ["to_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      designs_v: {
        Row: {
          age_days: number | null
          at_head_office: boolean | null
          barcode: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          current_outlet_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          hold_expires_at: string | null
          hold_id: string | null
          hold_no: number | null
          hold_reason: string | null
          hold_source: string | null
          id: string | null
          location_since: string | null
          media_flag: boolean | null
          mrp: number | null
          notes: string | null
          open_transfer_id: string | null
          origin_outlet_id: string | null
          origin_outlet_name: string | null
          outlet_code: string | null
          outlet_name: string | null
          sku: string | null
          sold_amount: number | null
          sold_at: string | null
          sold_by: string | null
          sold_invoice_no: string | null
          sold_invoice_path: string | null
          status: Database["public"]["Enums"]["design_status"] | null
          status_group: number | null
          thumb_path: string | null
          title: string | null
          transfer_from_outlet_id: string | null
          transfer_status: Database["public"]["Enums"]["transfer_status"] | null
          transfer_to_outlet_id: string | null
          transit_days: number | null
          unclear_votes: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_current_outlet_id_fkey"
            columns: ["current_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_origin_outlet_id_fkey"
            columns: ["origin_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_outlet_id_fkey"
            columns: ["transfer_from_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_outlet_id_fkey"
            columns: ["transfer_to_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          active: boolean | null
          full_name: string | null
          id: string | null
          outlet_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          full_name?: string | null
          id?: string | null
          outlet_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          full_name?: string | null
          id?: string | null
          outlet_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _can_manage: {
        Args: { d: Database["public"]["Tables"]["designs"]["Row"] }
        Returns: boolean
      }
      _fail: { Args: { p_msg: string }; Returns: undefined }
      _insert_hold: {
        Args: {
          d: Database["public"]["Tables"]["designs"]["Row"]
          p_days: number
          p_doc: string
          p_reason: string
          p_source: string
          p_transfer: string
        }
        Returns: number
      }
      _lock_design: {
        Args: { p_id: string }
        Returns: {
          barcode: string
          category_id: string
          created_at: string
          created_by: string
          current_outlet_id: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          location_since: string
          media_flag: boolean
          mrp: number
          notes: string | null
          origin_outlet_id: string
          sku: string
          sold_amount: number | null
          sold_at: string | null
          sold_by: string | null
          sold_invoice_no: string | null
          sold_invoice_path: string | null
          status: Database["public"]["Enums"]["design_status"]
          title: string | null
          unclear_votes: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "designs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _lock_transfer: {
        Args: { p_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          decided_at: string | null
          decided_by: string | null
          design_id: string
          from_outlet_id: string
          ho_dispatched_at: string | null
          ho_dispatched_by: string | null
          ho_note: string | null
          ho_received_at: string | null
          ho_received_by: string | null
          id: string
          prev_location_since: string | null
          received_at: string | null
          received_by: string | null
          reject_doc_path: string | null
          reject_hold_days: number | null
          reject_reason: string | null
          request_note: string | null
          requested_at: string
          requested_by: string
          sent_to_ho_at: string | null
          sent_to_ho_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_outlet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _log: {
        Args: {
          p_data?: Json
          p_design: string
          p_event: string
          p_outlet: string
          p_transfer: string
        }
        Returns: undefined
      }
      _move_location: {
        Args: { p_design: string; p_outlet: string }
        Returns: undefined
      }
      _notify_outlet: {
        Args: {
          p_body: string
          p_design: string
          p_kind: string
          p_outlet: string
          p_title: string
          p_transfer: string
        }
        Returns: undefined
      }
      _notify_staff: {
        Args: {
          p_body: string
          p_design: string
          p_kind: string
          p_title: string
          p_transfer: string
        }
        Returns: undefined
      }
      _notify_user: {
        Args: {
          p_body: string
          p_design: string
          p_kind: string
          p_title: string
          p_transfer: string
          p_user: string
        }
        Returns: undefined
      }
      _object_exists: {
        Args: { p_bucket: string; p_path: string }
        Returns: boolean
      }
      _recount_votes: { Args: { p_id: string }; Returns: number }
      _release_active_hold: {
        Args: { p_design: string; p_note: string }
        Returns: undefined
      }
      _require_role: {
        Args: { p_roles: Database["public"]["Enums"]["app_role"][] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      _sku: { Args: { p_design: string }; Returns: string }
      auth_outlet: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      barcode_exists: {
        Args: { p_barcode: string; p_exclude?: string }
        Returns: boolean
      }
      can_read_document: {
        Args: { p_name: string; p_owner: string }
        Returns: boolean
      }
      can_write_design_media: { Args: { p_design: string }; Returns: boolean }
      cancel_request: { Args: { p_transfer: string }; Returns: undefined }
      create_design: { Args: { p: Json }; Returns: string }
      decide_transfer: {
        Args: {
          p_accept: boolean
          p_doc_path?: string
          p_hold_days?: number
          p_reason?: string
          p_transfer: string
        }
        Returns: undefined
      }
      head_office_id: { Args: never; Returns: string }
      ho_dispatch: {
        Args: { p_note?: string; p_target: string; p_transfer: string }
        Returns: undefined
      }
      ho_receive: { Args: { p_transfer: string }; Returns: undefined }
      ho_relocate: {
        Args: { p_id: string; p_outlet: string; p_reason: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      mark_notifications_read: {
        Args: { p_ids?: number[] }
        Returns: undefined
      }
      mark_sold: {
        Args: {
          p_amount?: number
          p_id: string
          p_invoice_no: string
          p_invoice_path: string
        }
        Returns: undefined
      }
      place_hold: {
        Args: {
          p_days: number
          p_doc_path: string
          p_id: string
          p_reason: string
        }
        Returns: number
      }
      receive_transfer: { Args: { p_transfer: string }; Returns: undefined }
      release_expired_holds: { Args: never; Returns: number }
      release_hold: {
        Args: { p_id: string; p_note?: string }
        Returns: undefined
      }
      replace_media: {
        Args: {
          p_bytes?: number
          p_duration?: number
          p_height?: number
          p_id: string
          p_kind: Database["public"]["Enums"]["media_kind"]
          p_mime?: string
          p_path: string
          p_width?: number
        }
        Returns: undefined
      }
      request_image_correction: {
        Args: {
          p_id: string
          p_kinds: Database["public"]["Enums"]["media_kind"][]
          p_note: string
        }
        Returns: string
      }
      request_transfer: {
        Args: { p_id: string; p_note?: string }
        Returns: string
      }
      resolve_image_correction: { Args: { p_id: string }; Returns: undefined }
      resolve_image_votes: { Args: { p_id: string }; Returns: undefined }
      restore_design: { Args: { p_id: string }; Returns: undefined }
      send_to_ho: { Args: { p_transfer: string }; Returns: undefined }
      sku_exists: {
        Args: { p_exclude?: string; p_sku: string }
        Returns: boolean
      }
      soft_delete_design: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      unmark_sold: { Args: { p_id: string }; Returns: undefined }
      update_design: { Args: { p: Json; p_id: string }; Returns: undefined }
      vote_image_unclear: {
        Args: {
          p_id: string
          p_kinds?: Database["public"]["Enums"]["media_kind"][]
          p_note?: string
        }
        Returns: number
      }
      withdraw_vote: { Args: { p_id: string }; Returns: number }
    }
    Enums: {
      app_role: "super_admin" | "head_office" | "shop_user"
      design_status:
        | "available"
        | "on_hold"
        | "requested"
        | "in_transfer"
        | "sold"
        | "deleted"
      media_kind:
        | "thumbnail"
        | "front"
        | "angle_1"
        | "angle_2"
        | "angle_3"
        | "video"
        | "barcode_front"
        | "barcode_back"
      transfer_status:
        | "requested"
        | "rejected"
        | "cancelled"
        | "accepted"
        | "sent_to_ho"
        | "received_at_ho"
        | "dispatched_to_requester"
        | "dispatched_to_origin"
        | "completed"
        | "returned"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "head_office", "shop_user"],
      design_status: [
        "available",
        "on_hold",
        "requested",
        "in_transfer",
        "sold",
        "deleted",
      ],
      media_kind: [
        "thumbnail",
        "front",
        "angle_1",
        "angle_2",
        "angle_3",
        "video",
        "barcode_front",
        "barcode_back",
      ],
      transfer_status: [
        "requested",
        "rejected",
        "cancelled",
        "accepted",
        "sent_to_ho",
        "received_at_ho",
        "dispatched_to_requester",
        "dispatched_to_origin",
        "completed",
        "returned",
      ],
    },
  },
} as const
