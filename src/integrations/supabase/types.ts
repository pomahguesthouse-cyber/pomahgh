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
      availability_sync_logs: {
        Row: {
          channel_manager_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          http_status_code: number | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          room_id: string | null
          success: boolean | null
          sync_queue_id: string | null
        }
        Insert: {
          channel_manager_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          room_id?: string | null
          success?: boolean | null
          sync_queue_id?: string | null
        }
        Update: {
          channel_manager_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          room_id?: string | null
          success?: boolean | null
          sync_queue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_sync_logs_channel_manager_id_fkey"
            columns: ["channel_manager_id"]
            isOneToOne: false
            referencedRelation: "channel_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_sync_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_sync_logs_sync_queue_id_fkey"
            columns: ["sync_queue_id"]
            isOneToOne: false
            referencedRelation: "availability_sync_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_sync_queue: {
        Row: {
          availability_data: Json
          booking_id: string | null
          channel_manager_id: string | null
          created_at: string | null
          date_from: string
          date_to: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          retry_count: number | null
          room_id: string | null
          status: string | null
          triggered_by: string | null
          updated_at: string | null
        }
        Insert: {
          availability_data: Json
          booking_id?: string | null
          channel_manager_id?: string | null
          created_at?: string | null
          date_from: string
          date_to: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          retry_count?: number | null
          room_id?: string | null
          status?: string | null
          triggered_by?: string | null
          updated_at?: string | null
        }
        Update: {
          availability_data?: Json
          booking_id?: string | null
          channel_manager_id?: string | null
          created_at?: string | null
          date_from?: string
          date_to?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          retry_count?: number | null
          room_id?: string | null
          status?: string | null
          triggered_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_sync_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_sync_queue_channel_manager_id_fkey"
            columns: ["channel_manager_id"]
            isOneToOne: false
            referencedRelation: "channel_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_sync_queue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          allocated_room_number: string | null
          booking_source: string | null
          check_in: string
          check_in_time: string | null
          check_out: string
          check_out_time: string | null
          created_at: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          invoice_number: string | null
          last_invoice_sent_at: string | null
          num_guests: number
          ota_name: string | null
          other_source: string | null
          payment_amount: number | null
          payment_status: string | null
          room_id: string
          special_requests: string | null
          status: string
          total_nights: number
          total_price: number
          updated_at: string
        }
        Insert: {
          allocated_room_number?: string | null
          booking_source?: string | null
          check_in: string
          check_in_time?: string | null
          check_out: string
          check_out_time?: string | null
          created_at?: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          invoice_number?: string | null
          last_invoice_sent_at?: string | null
          num_guests?: number
          ota_name?: string | null
          other_source?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          room_id: string
          special_requests?: string | null
          status?: string
          total_nights: number
          total_price: number
          updated_at?: string
        }
        Update: {
          allocated_room_number?: string | null
          booking_source?: string | null
          check_in?: string
          check_in_time?: string | null
          check_out?: string
          check_out_time?: string | null
          created_at?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          invoice_number?: string | null
          last_invoice_sent_at?: string | null
          num_guests?: number
          ota_name?: string | null
          other_source?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          room_id?: string
          special_requests?: string | null
          status?: string
          total_nights?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_managers: {
        Row: {
          api_endpoint: string | null
          api_key_secret: string | null
          auth_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          max_retries: number | null
          name: string
          retry_delay_seconds: number | null
          type: string
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key_secret?: string | null
          auth_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          max_retries?: number | null
          name: string
          retry_delay_seconds?: number | null
          type: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key_secret?: string | null
          auth_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          max_retries?: number | null
          name?: string
          retry_delay_seconds?: number | null
          type?: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          booking_created: boolean | null
          ended_at: string | null
          guest_email: string | null
          id: string
          message_count: number | null
          session_id: string
          started_at: string | null
        }
        Insert: {
          booking_created?: boolean | null
          ended_at?: string | null
          guest_email?: string | null
          id?: string
          message_count?: number | null
          session_id: string
          started_at?: string | null
        }
        Update: {
          booking_created?: boolean | null
          ended_at?: string | null
          guest_email?: string | null
          id?: string
          message_count?: number | null
          session_id?: string
          started_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_settings: {
        Row: {
          bot_avatar_style: string | null
          bot_avatar_url: string | null
          bot_name: string | null
          created_at: string | null
          enable_availability_check: boolean | null
          enable_booking_assistance: boolean | null
          enable_facility_info: boolean | null
          greeting_message: string | null
          id: string
          max_message_length: number | null
          persona: string
          primary_color: string | null
          response_speed: string | null
          show_typing_indicator: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          widget_position: string | null
        }
        Insert: {
          bot_avatar_style?: string | null
          bot_avatar_url?: string | null
          bot_name?: string | null
          created_at?: string | null
          enable_availability_check?: boolean | null
          enable_booking_assistance?: boolean | null
          enable_facility_info?: boolean | null
          greeting_message?: string | null
          id?: string
          max_message_length?: number | null
          persona?: string
          primary_color?: string | null
          response_speed?: string | null
          show_typing_indicator?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          widget_position?: string | null
        }
        Update: {
          bot_avatar_style?: string | null
          bot_avatar_url?: string | null
          bot_name?: string | null
          created_at?: string | null
          enable_availability_check?: boolean | null
          enable_booking_assistance?: boolean | null
          enable_facility_info?: boolean | null
          greeting_message?: string | null
          id?: string
          max_message_length?: number | null
          persona?: string
          primary_color?: string | null
          response_speed?: string | null
          show_typing_indicator?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          widget_position?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          created_at: string | null
          description: string
          display_order: number | null
          icon_name: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          display_order?: number | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          display_order?: number | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string | null
          display_order: number | null
          duration: number | null
          font_family: string | null
          font_size: string | null
          font_weight: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          media_type: string | null
          overlay_subtext: string | null
          overlay_text: string
          subtitle_font_family: string | null
          subtitle_font_size: string | null
          subtitle_font_weight: string | null
          subtitle_text_color: string | null
          text_align: string | null
          text_color: string | null
          transition_effect: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          duration?: number | null
          font_family?: string | null
          font_size?: string | null
          font_weight?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          media_type?: string | null
          overlay_subtext?: string | null
          overlay_text: string
          subtitle_font_family?: string | null
          subtitle_font_size?: string | null
          subtitle_font_weight?: string | null
          subtitle_text_color?: string | null
          text_align?: string | null
          text_color?: string | null
          transition_effect?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          duration?: number | null
          font_family?: string | null
          font_size?: string | null
          font_weight?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          media_type?: string | null
          overlay_subtext?: string | null
          overlay_text?: string
          subtitle_font_family?: string | null
          subtitle_font_size?: string | null
          subtitle_font_weight?: string | null
          subtitle_text_color?: string | null
          text_align?: string | null
          text_color?: string | null
          transition_effect?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      hotel_settings: {
        Row: {
          about_us: string | null
          account_holder_name: string | null
          account_number: string | null
          address: string
          auto_send_invoice: boolean | null
          bank_name: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency_code: string | null
          currency_symbol: string | null
          description: string | null
          email_primary: string | null
          email_reservations: string | null
          facebook_url: string | null
          favicon_url: string | null
          hotel_name: string
          id: string
          instagram_url: string | null
          invoice_footer_text: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          max_stay_nights: number | null
          min_stay_nights: number | null
          payment_instructions: string | null
          phone_primary: string | null
          phone_secondary: string | null
          postal_code: string | null
          primary_color: string | null
          reception_hours_end: string | null
          reception_hours_start: string | null
          secondary_color: string | null
          state: string | null
          tagline: string | null
          tax_name: string | null
          tax_rate: number | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          about_us?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          address?: string
          auto_send_invoice?: boolean | null
          bank_name?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          description?: string | null
          email_primary?: string | null
          email_reservations?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          hotel_name?: string
          id?: string
          instagram_url?: string | null
          invoice_footer_text?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_stay_nights?: number | null
          min_stay_nights?: number | null
          payment_instructions?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          postal_code?: string | null
          primary_color?: string | null
          reception_hours_end?: string | null
          reception_hours_start?: string | null
          secondary_color?: string | null
          state?: string | null
          tagline?: string | null
          tax_name?: string | null
          tax_rate?: number | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_us?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          address?: string
          auto_send_invoice?: boolean | null
          bank_name?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          description?: string | null
          email_primary?: string | null
          email_reservations?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          hotel_name?: string
          id?: string
          instagram_url?: string | null
          invoice_footer_text?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_stay_nights?: number | null
          min_stay_nights?: number | null
          payment_instructions?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          postal_code?: string | null
          primary_color?: string | null
          reception_hours_end?: string | null
          reception_hours_start?: string | null
          secondary_color?: string | null
          state?: string | null
          tagline?: string | null
          tax_name?: string | null
          tax_rate?: number | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      invoice_logs: {
        Row: {
          booking_id: string
          created_at: string | null
          created_by: string | null
          email_sent: boolean | null
          error_message: string | null
          id: string
          invoice_number: string
          sent_at: string | null
          sent_to_email: string | null
          sent_to_whatsapp: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          created_by?: string | null
          email_sent?: boolean | null
          error_message?: string | null
          id?: string
          invoice_number: string
          sent_at?: string | null
          sent_to_email?: string | null
          sent_to_whatsapp?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          created_by?: string | null
          email_sent?: boolean | null
          error_message?: string | null
          id?: string
          invoice_number?: string
          sent_at?: string | null
          sent_to_email?: string | null
          sent_to_whatsapp?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          accent_color: string | null
          background_color: string | null
          border_style: string | null
          created_at: string | null
          custom_footer_text: string | null
          custom_header_text: string | null
          font_family: string | null
          font_size_base: number | null
          font_size_heading: number | null
          header_height: number | null
          id: string
          is_active: boolean | null
          layout_style: string | null
          logo_position: string | null
          logo_size: string | null
          payment_title: string | null
          primary_color: string | null
          secondary_color: string | null
          show_guest_details: boolean | null
          show_hotel_details: boolean | null
          show_logo: boolean | null
          show_payment_instructions: boolean | null
          show_special_requests: boolean | null
          spacing: string | null
          terms_and_conditions: string | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          border_style?: string | null
          created_at?: string | null
          custom_footer_text?: string | null
          custom_header_text?: string | null
          font_family?: string | null
          font_size_base?: number | null
          font_size_heading?: number | null
          header_height?: number | null
          id?: string
          is_active?: boolean | null
          layout_style?: string | null
          logo_position?: string | null
          logo_size?: string | null
          payment_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_guest_details?: boolean | null
          show_hotel_details?: boolean | null
          show_logo?: boolean | null
          show_payment_instructions?: boolean | null
          show_special_requests?: boolean | null
          spacing?: string | null
          terms_and_conditions?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          border_style?: string | null
          created_at?: string | null
          custom_footer_text?: string | null
          custom_header_text?: string | null
          font_family?: string | null
          font_size_base?: number | null
          font_size_heading?: number | null
          header_height?: number | null
          id?: string
          is_active?: boolean | null
          layout_style?: string | null
          logo_position?: string | null
          logo_size?: string | null
          payment_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_guest_details?: boolean | null
          show_hotel_details?: boolean | null
          show_logo?: boolean | null
          show_payment_instructions?: boolean | null
          show_special_requests?: boolean | null
          spacing?: string | null
          terms_and_conditions?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nearby_locations: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          distance_km: number
          icon_name: string
          id: string
          is_active: boolean | null
          name: string
          travel_time_minutes: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          distance_km: number
          icon_name?: string
          id?: string
          is_active?: boolean | null
          name: string
          travel_time_minutes: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          distance_km?: number
          icon_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          travel_time_minutes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      room_features: {
        Row: {
          created_at: string | null
          display_order: number | null
          feature_key: string
          icon_name: string
          id: string
          is_active: boolean | null
          label: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          feature_key: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          feature_key?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      room_hotspots: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          feature_key: string | null
          hotspot_type: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          panorama_id: string | null
          pitch: number
          room_id: string
          target_panorama_id: string | null
          target_room_id: string | null
          title: string
          updated_at: string | null
          yaw: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          feature_key?: string | null
          hotspot_type?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          panorama_id?: string | null
          pitch: number
          room_id: string
          target_panorama_id?: string | null
          target_room_id?: string | null
          title: string
          updated_at?: string | null
          yaw: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          feature_key?: string | null
          hotspot_type?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          panorama_id?: string | null
          pitch?: number
          room_id?: string
          target_panorama_id?: string | null
          target_room_id?: string | null
          title?: string
          updated_at?: string | null
          yaw?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_hotspots_panorama_id_fkey"
            columns: ["panorama_id"]
            isOneToOne: false
            referencedRelation: "room_panoramas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_hotspots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_hotspots_target_panorama_id_fkey"
            columns: ["target_panorama_id"]
            isOneToOne: false
            referencedRelation: "room_panoramas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_hotspots_target_room_id_fkey"
            columns: ["target_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_panoramas: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          floor_plan_icon: string | null
          floor_plan_x: number | null
          floor_plan_y: number | null
          id: string
          image_url: string
          is_active: boolean | null
          is_primary: boolean | null
          room_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          floor_plan_icon?: string | null
          floor_plan_x?: number | null
          floor_plan_y?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          is_primary?: boolean | null
          room_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          floor_plan_icon?: string | null
          floor_plan_x?: number | null
          floor_plan_y?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          room_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_panoramas_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_unavailable_dates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
          room_id: string
          unavailable_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          room_id: string
          unavailable_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          room_id?: string
          unavailable_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_unavailable_dates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          allotment: number
          available: boolean
          base_price: number | null
          created_at: string
          description: string
          features: string[]
          final_price: number | null
          floor_plan_enabled: boolean | null
          floor_plan_url: string | null
          friday_price: number | null
          id: string
          image_url: string
          image_urls: string[] | null
          max_guests: number
          monday_price: number | null
          name: string
          price_per_night: number
          promo_end_date: string | null
          promo_price: number | null
          promo_start_date: string | null
          room_count: number
          room_numbers: string[] | null
          saturday_price: number | null
          size_sqm: number | null
          slug: string | null
          sunday_price: number | null
          thursday_price: number | null
          transition_effect: string | null
          tuesday_price: number | null
          updated_at: string
          virtual_tour_url: string | null
          wednesday_price: number | null
        }
        Insert: {
          allotment?: number
          available?: boolean
          base_price?: number | null
          created_at?: string
          description: string
          features?: string[]
          final_price?: number | null
          floor_plan_enabled?: boolean | null
          floor_plan_url?: string | null
          friday_price?: number | null
          id?: string
          image_url: string
          image_urls?: string[] | null
          max_guests?: number
          monday_price?: number | null
          name: string
          price_per_night: number
          promo_end_date?: string | null
          promo_price?: number | null
          promo_start_date?: string | null
          room_count?: number
          room_numbers?: string[] | null
          saturday_price?: number | null
          size_sqm?: number | null
          slug?: string | null
          sunday_price?: number | null
          thursday_price?: number | null
          transition_effect?: string | null
          tuesday_price?: number | null
          updated_at?: string
          virtual_tour_url?: string | null
          wednesday_price?: number | null
        }
        Update: {
          allotment?: number
          available?: boolean
          base_price?: number | null
          created_at?: string
          description?: string
          features?: string[]
          final_price?: number | null
          floor_plan_enabled?: boolean | null
          floor_plan_url?: string | null
          friday_price?: number | null
          id?: string
          image_url?: string
          image_urls?: string[] | null
          max_guests?: number
          monday_price?: number | null
          name?: string
          price_per_night?: number
          promo_end_date?: string | null
          promo_price?: number | null
          promo_start_date?: string | null
          room_count?: number
          room_numbers?: string[] | null
          saturday_price?: number | null
          size_sqm?: number | null
          slug?: string | null
          sunday_price?: number | null
          thursday_price?: number | null
          transition_effect?: string | null
          tuesday_price?: number | null
          updated_at?: string
          virtual_tour_url?: string | null
          wednesday_price?: number | null
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          allow_indexing: boolean | null
          bing_verification: string | null
          business_type: string | null
          canonical_url: string | null
          created_at: string | null
          custom_head_scripts: string | null
          default_og_image: string | null
          facebook_app_id: string | null
          facebook_pixel_id: string | null
          follow_links: boolean | null
          geo_coordinates: string | null
          geo_placename: string | null
          geo_region: string | null
          google_analytics_id: string | null
          google_search_console_verification: string | null
          google_tag_manager_id: string | null
          id: string
          meta_description: string | null
          meta_keywords: string | null
          og_locale: string | null
          og_site_name: string | null
          price_range: string | null
          robots_txt_custom: string | null
          site_title: string | null
          sitemap_auto_generate: boolean | null
          sitemap_change_freq: string | null
          sitemap_priority_home: number | null
          sitemap_priority_rooms: number | null
          structured_data_enabled: boolean | null
          twitter_handle: string | null
          updated_at: string | null
        }
        Insert: {
          allow_indexing?: boolean | null
          bing_verification?: string | null
          business_type?: string | null
          canonical_url?: string | null
          created_at?: string | null
          custom_head_scripts?: string | null
          default_og_image?: string | null
          facebook_app_id?: string | null
          facebook_pixel_id?: string | null
          follow_links?: boolean | null
          geo_coordinates?: string | null
          geo_placename?: string | null
          geo_region?: string | null
          google_analytics_id?: string | null
          google_search_console_verification?: string | null
          google_tag_manager_id?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          og_locale?: string | null
          og_site_name?: string | null
          price_range?: string | null
          robots_txt_custom?: string | null
          site_title?: string | null
          sitemap_auto_generate?: boolean | null
          sitemap_change_freq?: string | null
          sitemap_priority_home?: number | null
          sitemap_priority_rooms?: number | null
          structured_data_enabled?: boolean | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_indexing?: boolean | null
          bing_verification?: string | null
          business_type?: string | null
          canonical_url?: string | null
          created_at?: string | null
          custom_head_scripts?: string | null
          default_og_image?: string | null
          facebook_app_id?: string | null
          facebook_pixel_id?: string | null
          follow_links?: boolean | null
          geo_coordinates?: string | null
          geo_placename?: string | null
          geo_region?: string | null
          google_analytics_id?: string | null
          google_search_console_verification?: string | null
          google_tag_manager_id?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          og_locale?: string | null
          og_site_name?: string | null
          price_range?: string | null
          robots_txt_custom?: string | null
          site_title?: string | null
          sitemap_auto_generate?: boolean | null
          sitemap_change_freq?: string | null
          sitemap_priority_home?: number | null
          sitemap_priority_rooms?: number | null
          structured_data_enabled?: boolean | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      allocate_room_number: {
        Args: { p_check_in: string; p_check_out: string; p_room_id: string }
        Returns: string
      }
      calculate_room_availability: {
        Args: { p_date_from: string; p_date_to: string; p_room_id: string }
        Returns: {
          availability_date: string
          available_count: number
          booked_count: number
          total_allotment: number
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
