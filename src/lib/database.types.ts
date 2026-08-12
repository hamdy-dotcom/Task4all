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
      google_accounts: {
        Row: {
          access_token: string | null
          connected_at: string
          expires_at: string | null
          google_email: string
          refresh_token: string | null
          scopes: string[] | null
          scopes_text: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          expires_at?: string | null
          google_email: string
          refresh_token?: string | null
          scopes?: string[] | null
          scopes_text?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          expires_at?: string | null
          google_email?: string
          refresh_token?: string | null
          scopes?: string[] | null
          scopes_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "google_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "google_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          external_email: string | null
          external_name: string | null
          id: string
          is_required: boolean
          meeting_id: string
          response: Database["public"]["Enums"]["attendee_response"]
          user_id: string | null
        }
        Insert: {
          external_email?: string | null
          external_name?: string | null
          id?: string
          is_required?: boolean
          meeting_id: string
          response?: Database["public"]["Enums"]["attendee_response"]
          user_id?: string | null
        }
        Update: {
          external_email?: string | null
          external_name?: string | null
          id?: string
          is_required?: boolean
          meeting_id?: string
          response?: Database["public"]["Enums"]["attendee_response"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "v_my_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          meeting_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          meeting_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_minutes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_minutes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "v_my_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_topics: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          meeting_id: string
          notes: string | null
          sort_order: number
          work_item_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          notes?: string | null
          sort_order?: number
          work_item_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          notes?: string | null
          sort_order?: number
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_topics_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_topics_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_topics_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "v_my_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "meeting_topics_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          description: string | null
          ends_at: string
          google_calendar_id: string | null
          google_error: string | null
          google_event_id: string | null
          id: string
          is_online: boolean
          location: string | null
          meet_url: string | null
          organizer_id: string
          starts_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          google_calendar_id?: string | null
          google_error?: string | null
          google_event_id?: string | null
          id?: string
          is_online?: boolean
          location?: string | null
          meet_url?: string | null
          organizer_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          google_calendar_id?: string | null
          google_error?: string | null
          google_event_id?: string | null
          id?: string
          is_online?: boolean
          location?: string | null
          meet_url?: string | null
          organizer_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          email_sent_at: string | null
          id: string
          is_read: boolean
          meeting_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          work_item_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          meeting_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          work_item_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          meeting_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "v_my_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "notifications_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          locale: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
      role_cards: {
        Row: {
          branch: string | null
          branch_ar: string | null
          branch_note: string | null
          branch_note_ar: string | null
          created_at: string
          gives_up: string | null
          gives_up_ar: string | null
          id: string
          indicator: string | null
          indicator_ar: string | null
          is_line_lead: boolean
          is_vacant: boolean
          profile_id: string | null
          purpose: string | null
          purpose_ar: string | null
          reports_to: string | null
          risk: string | null
          risk_ar: string | null
          scope: string | null
          scope_ar: string | null
          sort_order: number
          team_id: string | null
          title_ar: string | null
          title_en: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          branch_ar?: string | null
          branch_note?: string | null
          branch_note_ar?: string | null
          created_at?: string
          gives_up?: string | null
          gives_up_ar?: string | null
          id?: string
          indicator?: string | null
          indicator_ar?: string | null
          is_line_lead?: boolean
          is_vacant?: boolean
          profile_id?: string | null
          purpose?: string | null
          purpose_ar?: string | null
          reports_to?: string | null
          risk?: string | null
          risk_ar?: string | null
          scope?: string | null
          scope_ar?: string | null
          sort_order?: number
          team_id?: string | null
          title_ar?: string | null
          title_en: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          branch_ar?: string | null
          branch_note?: string | null
          branch_note_ar?: string | null
          created_at?: string
          gives_up?: string | null
          gives_up_ar?: string | null
          id?: string
          indicator?: string | null
          indicator_ar?: string | null
          is_line_lead?: boolean
          is_vacant?: boolean
          profile_id?: string | null
          purpose?: string | null
          purpose_ar?: string | null
          reports_to?: string | null
          risk?: string | null
          risk_ar?: string | null
          scope?: string | null
          scope_ar?: string | null
          sort_order?: number
          team_id?: string | null
          title_ar?: string | null
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
      role_collaborations: {
        Row: {
          counterpart_id: string | null
          counterpart_label: string | null
          counterpart_label_ar: string | null
          exchange: string | null
          exchange_ar: string | null
          id: string
          role_card_id: string
          sort_order: number
          topic: string
          topic_ar: string | null
        }
        Insert: {
          counterpart_id?: string | null
          counterpart_label?: string | null
          counterpart_label_ar?: string | null
          exchange?: string | null
          exchange_ar?: string | null
          id?: string
          role_card_id: string
          sort_order?: number
          topic: string
          topic_ar?: string | null
        }
        Update: {
          counterpart_id?: string | null
          counterpart_label?: string | null
          counterpart_label_ar?: string | null
          exchange?: string | null
          exchange_ar?: string | null
          id?: string
          role_card_id?: string
          sort_order?: number
          topic?: string
          topic_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_collaborations_counterpart_id_fkey"
            columns: ["counterpart_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_collaborations_counterpart_id_fkey"
            columns: ["counterpart_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_collaborations_counterpart_id_fkey"
            columns: ["counterpart_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_collaborations_counterpart_id_fkey"
            columns: ["counterpart_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_collaborations_role_card_id_fkey"
            columns: ["role_card_id"]
            isOneToOne: false
            referencedRelation: "role_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_collaborations_role_card_id_fkey"
            columns: ["role_card_id"]
            isOneToOne: false
            referencedRelation: "v_org_chart"
            referencedColumns: ["id"]
          },
        ]
      }
      role_decisions: {
        Row: {
          body: string
          body_ar: string | null
          id: string
          kind: Database["public"]["Enums"]["decision_kind"]
          role_card_id: string
          sort_order: number
        }
        Insert: {
          body: string
          body_ar?: string | null
          id?: string
          kind: Database["public"]["Enums"]["decision_kind"]
          role_card_id: string
          sort_order?: number
        }
        Update: {
          body?: string
          body_ar?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["decision_kind"]
          role_card_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_decisions_role_card_id_fkey"
            columns: ["role_card_id"]
            isOneToOne: false
            referencedRelation: "role_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_decisions_role_card_id_fkey"
            columns: ["role_card_id"]
            isOneToOne: false
            referencedRelation: "v_org_chart"
            referencedColumns: ["id"]
          },
        ]
      }
      role_tasks: {
        Row: {
          body: string
          body_ar: string | null
          cadence: Database["public"]["Enums"]["task_cadence"]
          id: string
          role_card_id: string
          sort_order: number
        }
        Insert: {
          body: string
          body_ar?: string | null
          cadence: Database["public"]["Enums"]["task_cadence"]
          id?: string
          role_card_id: string
          sort_order?: number
        }
        Update: {
          body?: string
          body_ar?: string | null
          cadence?: Database["public"]["Enums"]["task_cadence"]
          id?: string
          role_card_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_tasks_role_card_id_fkey"
            columns: ["role_card_id"]
            isOneToOne: false
            referencedRelation: "role_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_tasks_role_card_id_fkey"
            columns: ["role_card_id"]
            isOneToOne: false
            referencedRelation: "v_org_chart"
            referencedColumns: ["id"]
          },
        ]
      }
      subtask_milestones: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          id: string
          is_done: boolean
          rejection_reason: string | null
          sort_order: number
          title: string
          title_ar: string | null
          work_item_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_done?: boolean
          rejection_reason?: string | null
          sort_order?: number
          title: string
          title_ar?: string | null
          work_item_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_done?: boolean
          rejection_reason?: string | null
          sort_order?: number
          title?: string
          title_ar?: string | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtask_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subtask_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subtask_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subtask_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subtask_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subtask_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subtask_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "subtask_milestones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtask_milestones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          name: string
          name_ar: string | null
          purpose: string | null
          purpose_ar: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          name_ar?: string | null
          purpose?: string | null
          purpose_ar?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          name_ar?: string | null
          purpose?: string | null
          purpose_ar?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          user_id: string
          work_item_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          user_id: string
          work_item_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          user_id?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignees_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignees_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_item_assignees_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignees_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
          work_item_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
          work_item_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_attachments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_attachments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_item_attachments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_attachments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
          work_item_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
          work_item_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_item_comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          field: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          work_item_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          field?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          work_item_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          field?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_item_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_history_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_history_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_item_history_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_history_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          classification:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          description_ar: string | null
          due_date: string | null
          id: string
          is_continuous: boolean
          parent_id: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          progress: number
          rejection_reason: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["work_status"]
          team_id: string | null
          title: string
          title_ar: string | null
          type: Database["public"]["Enums"]["work_item_type"]
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          classification?:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          id?: string
          is_continuous?: boolean
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          progress?: number
          rejection_reason?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          team_id?: string | null
          title: string
          title_ar?: string | null
          type: Database["public"]["Enums"]["work_item_type"]
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          classification?:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          id?: string
          is_continuous?: boolean
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          progress?: number
          rejection_reason?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          team_id?: string | null
          title?: string
          title_ar?: string | null
          type?: Database["public"]["Enums"]["work_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
    }
    Views: {
      v_approval_latency: {
        Row: {
          approved_count: number | null
          median_days: number | null
          pending_count: number | null
        }
        Relationships: []
      }
      v_classification_mix: {
        Row: {
          classification:
            | Database["public"]["Enums"]["classification_type"]
            | null
          count: number | null
          month: string | null
        }
        Relationships: []
      }
      v_cycle_time: {
        Row: {
          approved_count: number | null
          done_count: number | null
          median_days_to_approve: number | null
          median_days_to_done: number | null
          p90_days_to_approve: number | null
          p90_days_to_done: number | null
          type: Database["public"]["Enums"]["work_item_type"] | null
        }
        Relationships: []
      }
      v_health_signals: {
        Row: {
          overloaded_people: number | null
          recently_cancelled: number | null
          stale_experiments: number | null
          unassigned_initiatives: number | null
        }
        Relationships: []
      }
      v_item_path: {
        Row: {
          item_id: string | null
          path: Json | null
          path_label: string | null
        }
        Relationships: []
      }
      v_meeting_hours: {
        Row: {
          full_name: string | null
          hours: number | null
          profile_id: string | null
          team_id: string | null
          week: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_member_progress: {
        Row: {
          done_count: number | null
          full_name: string | null
          pct: number | null
          profile_id: string | null
          total: number | null
        }
        Relationships: []
      }
      v_monthly_throughput: {
        Row: {
          completed: number | null
          month: string | null
          type: Database["public"]["Enums"]["work_item_type"] | null
        }
        Relationships: []
      }
      v_my_meetings: {
        Row: {
          accepted_count: number | null
          agenda: string | null
          attendee_count: number | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          google_calendar_id: string | null
          google_error: string | null
          google_event_id: string | null
          id: string | null
          meet_url: string | null
          organizer_id: string | null
          organizer_name: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["meeting_status"] | null
          timezone: string | null
          title: string | null
          topic_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
        ]
      }
      v_org_chart: {
        Row: {
          id: string | null
          is_line_lead: boolean | null
          is_vacant: boolean | null
          profile_id: string | null
          reports_to: string | null
          sort_order: number | null
          team_id: string | null
          title_ar: string | null
          title_en: string | null
        }
        Insert: {
          id?: string | null
          is_line_lead?: boolean | null
          is_vacant?: boolean | null
          profile_id?: string | null
          reports_to?: string | null
          sort_order?: number | null
          team_id?: string | null
          title_ar?: string | null
          title_en?: string | null
        }
        Update: {
          id?: string | null
          is_line_lead?: boolean | null
          is_vacant?: boolean | null
          profile_id?: string | null
          reports_to?: string | null
          sort_order?: number | null
          team_id?: string | null
          title_ar?: string | null
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_cards_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_pending_approvals: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          approver_roles: string[] | null
          classification:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string | null
          is_continuous: boolean | null
          parent_id: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          progress: number | null
          rejection_reason: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["work_status"] | null
          team_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["work_item_type"] | null
          updated_at: string | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          approver_roles?: never
          classification?:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_continuous?: boolean | null
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          progress?: number | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["work_status"] | null
          team_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["work_item_type"] | null
          updated_at?: string | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          approver_roles?: never
          classification?:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_continuous?: boolean | null
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          progress?: number | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["work_status"] | null
          team_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["work_item_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_pending_milestones: {
        Row: {
          created_at: string | null
          created_by_name: string | null
          milestone_id: string | null
          milestone_title: string | null
          sort_order: number | null
          subtask_approval_status:
            | Database["public"]["Enums"]["approval_status"]
            | null
          subtask_id: string | null
          subtask_title: string | null
        }
        Relationships: []
      }
      v_person_load: {
        Row: {
          active_initiatives: number | null
          full_name: string | null
          id: string | null
          over_allocated: boolean | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_team_progress: {
        Row: {
          done_count: number | null
          pct: number | null
          sort_order: number | null
          team_id: string | null
          team_name: string | null
          total: number | null
        }
        Relationships: []
      }
      v_work_item_tree: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          child_count: number | null
          classification:
            | Database["public"]["Enums"]["classification_type"]
            | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          description: string | null
          description_ar: string | null
          done_child_count: number | null
          due_date: string | null
          id: string | null
          is_continuous: boolean | null
          milestone_count: number | null
          milestone_done_count: number | null
          milestone_pending_count: number | null
          milestone_rejected_count: number | null
          parent_id: string | null
          parent_title: string | null
          parent_type: Database["public"]["Enums"]["work_item_type"] | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          progress: number | null
          rejection_reason: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["work_status"] | null
          team_id: string | null
          team_name: string | null
          title: string | null
          title_ar: string | null
          type: Database["public"]["Enums"]["work_item_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_meeting_hours"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_person_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_pending_milestones"
            referencedColumns: ["subtask_id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_progress"
            referencedColumns: ["team_id"]
          },
        ]
      }
    }
    Functions: {
      approve_all_milestones: { Args: { p_item: string }; Returns: number }
      approve_milestone: { Args: { p_milestone: string }; Returns: undefined }
      approve_work_item: {
        Args: {
          p_item: string
          p_priority: Database["public"]["Enums"]["priority_level"]
        }
        Returns: undefined
      }
      can_read_role_card: { Args: { p_card: string }; Returns: boolean }
      can_view_item: { Args: { p_item: string }; Returns: boolean }
      completion_blockers: {
        Args: { p_item: string }
        Returns: {
          blocker_type: string
          child_id: string
          child_status: Database["public"]["Enums"]["work_status"]
          child_title: string
          child_type: Database["public"]["Enums"]["work_item_type"]
          detail: string
        }[]
      }
      is_assigned: { Args: { p_item: string }; Returns: boolean }
      is_continuous_item: { Args: { p_id: string }; Returns: boolean }
      is_meeting_organizer: { Args: { p_meeting: string }; Returns: boolean }
      is_meeting_participant: { Args: { p_meeting: string }; Returns: boolean }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      my_team: { Args: never; Returns: string }
      recalc_progress: { Args: { p_item: string }; Returns: undefined }
      reject_milestone: {
        Args: { p_milestone: string; p_reason: string }
        Returns: undefined
      }
      reject_work_item: {
        Args: { p_item: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      attendee_response: "pending" | "accepted" | "declined" | "tentative"
      classification_type:
        | "product"
        | "service"
        | "project"
        | "experiment"
        | "stopgap"
        | "internal_capability"
        | "process"
      decision_kind: "decides_alone" | "consults" | "stops_and_escalates"
      meeting_status: "scheduled" | "cancelled" | "completed"
      notification_type:
        | "assigned"
        | "unassigned"
        | "approval_required"
        | "approved"
        | "rejected"
        | "marked_done"
        | "status_changed"
        | "comment"
        | "attachment"
        | "meeting_invite"
        | "meeting_updated"
        | "meeting_cancelled"
      priority_level: "low" | "medium" | "high" | "critical"
      task_cadence: "daily" | "weekly" | "monthly" | "quarterly" | "founding"
      user_role: "super_admin" | "admin" | "team_leader" | "team_member"
      work_item_type: "objective" | "initiative" | "task" | "subtask"
      work_status:
        | "not_started"
        | "pending"
        | "in_progress"
        | "blocked"
        | "done"
        | "cancelled"
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
      approval_status: ["pending", "approved", "rejected"],
      attendee_response: ["pending", "accepted", "declined", "tentative"],
      classification_type: [
        "product",
        "service",
        "project",
        "experiment",
        "stopgap",
        "internal_capability",
        "process",
      ],
      decision_kind: ["decides_alone", "consults", "stops_and_escalates"],
      meeting_status: ["scheduled", "cancelled", "completed"],
      notification_type: [
        "assigned",
        "unassigned",
        "approval_required",
        "approved",
        "rejected",
        "marked_done",
        "status_changed",
        "comment",
        "attachment",
        "meeting_invite",
        "meeting_updated",
        "meeting_cancelled",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      task_cadence: ["daily", "weekly", "monthly", "quarterly", "founding"],
      user_role: ["super_admin", "admin", "team_leader", "team_member"],
      work_item_type: ["objective", "initiative", "task", "subtask"],
      work_status: [
        "not_started",
        "pending",
        "in_progress",
        "blocked",
        "done",
        "cancelled",
      ],
    },
  },
} as const
