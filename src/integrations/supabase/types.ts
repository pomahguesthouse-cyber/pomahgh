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
      bookings: {
        Row: {
          allocated_room_number: string | null
          check_in: string
          check_in_time: string | null
          check_out: string
          check_out_time: string | null
          created_at: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          num_guests: number
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
          check_in: string
          check_in_time?: string | null
          check_out: string
          check_out_time?: string | null
          created_at?: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          num_guests?: number
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
          check_in?: string
          check_in_time?: string | null
          check_out?: string
          check_out_time?: string | null
          created_at?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          num_guests?: number
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
          image_url: string
          is_active: boolean | null
          overlay_subtext: string | null
          overlay_text: string
          text_align: string | null
          text_color: string | null
          transition_effect: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          duration?: number | null
          font_family?: string | null
          font_size?: string | null
          font_weight?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          overlay_subtext?: string | null
          overlay_text: string
          text_align?: string | null
          text_color?: string | null
          transition_effect?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          duration?: number | null
          font_family?: string | null
          font_size?: string | null
          font_weight?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          overlay_subtext?: string | null
          overlay_text?: string
          text_align?: string | null
          text_color?: string | null
          transition_effect?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotel_settings: {
        Row: {
          about_us: string | null
          address: string
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
          logo_url: string | null
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
          address?: string
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
          logo_url?: string | null
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
          address?: string
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
          logo_url?: string | null
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
          sunday_price: number | null
          thursday_price: number | null
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
          sunday_price?: number | null
          thursday_price?: number | null
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
          sunday_price?: number | null
          thursday_price?: number | null
          tuesday_price?: number | null
          updated_at?: string
          virtual_tour_url?: string | null
          wednesday_price?: number | null
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
