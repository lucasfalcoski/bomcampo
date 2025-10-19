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
      activities: {
        Row: {
          anexo_url: string | null
          clima_conforme: boolean | null
          created_at: string | null
          custo_estimado: number | null
          data: string
          descricao: string | null
          id: string
          observacoes: string | null
          planting_id: string | null
          plot_id: string
          realizado: boolean | null
          responsavel: string | null
          tipo: string
          updated_at: string | null
          weather_snapshot: Json | null
        }
        Insert: {
          anexo_url?: string | null
          clima_conforme?: boolean | null
          created_at?: string | null
          custo_estimado?: number | null
          data: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          planting_id?: string | null
          plot_id: string
          realizado?: boolean | null
          responsavel?: string | null
          tipo: string
          updated_at?: string | null
          weather_snapshot?: Json | null
        }
        Update: {
          anexo_url?: string | null
          clima_conforme?: boolean | null
          created_at?: string | null
          custo_estimado?: number | null
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          planting_id?: string | null
          plot_id?: string
          realizado?: boolean | null
          responsavel?: string | null
          tipo?: string
          updated_at?: string | null
          weather_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_items: {
        Row: {
          activity_id: string
          created_at: string | null
          custo_estimado_item: number | null
          id: string
          insumo: string
          quantidade: number | null
          unidade: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          custo_estimado_item?: number | null
          id?: string
          insumo: string
          quantidade?: number | null
          unidade?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          custo_estimado_item?: number | null
          id?: string
          insumo?: string
          quantidade?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          category: string
          code: string
          created_at: string | null
          display_name: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          display_name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          display_name?: string
        }
        Relationships: []
      }
      crop_profiles: {
        Row: {
          created_at: string | null
          crop_code: string
          default_rules: Json
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          crop_code: string
          default_rules: Json
          display_name: string
          id?: string
        }
        Update: {
          created_at?: string | null
          crop_code?: string
          default_rules?: Json
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      crops: {
        Row: {
          ciclo_dias: number | null
          created_at: string | null
          id: string
          nome: string
          variedade: string | null
        }
        Insert: {
          ciclo_dias?: number | null
          created_at?: string | null
          id?: string
          nome: string
          variedade?: string | null
        }
        Update: {
          ciclo_dias?: number | null
          created_at?: string | null
          id?: string
          nome?: string
          variedade?: string | null
        }
        Relationships: []
      }
      farm_crop_rules: {
        Row: {
          created_at: string | null
          crop_code: string
          farm_id: string
          id: string
          rules: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crop_code: string
          farm_id: string
          id?: string
          rules: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crop_code?: string
          farm_id?: string
          id?: string
          rules?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_crop_rules_crop_code_fkey"
            columns: ["crop_code"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["crop_code"]
          },
          {
            foreignKeyName: "farm_crop_rules_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          area_ha: number | null
          cidade: string | null
          created_at: string | null
          estado: string | null
          id: string
          nome: string
          pais: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_ha?: number | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nome: string
          pais?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_ha?: number | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nome?: string
          pais?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          created_at: string
          id: string
          referencia_data: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referencia_data: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referencia_data?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      plantings: {
        Row: {
          created_at: string | null
          crop_id: string
          data_plantio: string
          data_prev_colheita: string | null
          densidade: number | null
          expectativa_sacas_ha: number | null
          id: string
          plot_id: string
          stage: string | null
          stage_override: boolean | null
          status: Database["public"]["Enums"]["planting_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crop_id: string
          data_plantio: string
          data_prev_colheita?: string | null
          densidade?: number | null
          expectativa_sacas_ha?: number | null
          id?: string
          plot_id: string
          stage?: string | null
          stage_override?: boolean | null
          status?: Database["public"]["Enums"]["planting_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crop_id?: string
          data_plantio?: string
          data_prev_colheita?: string | null
          densidade?: number | null
          expectativa_sacas_ha?: number | null
          id?: string
          plot_id?: string
          stage?: string | null
          stage_override?: boolean | null
          status?: Database["public"]["Enums"]["planting_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantings_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantings_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          area_ha: number | null
          created_at: string | null
          farm_id: string
          id: string
          latitude: number | null
          longitude: number | null
          municipality_ibge_code: string | null
          municipality_name: string | null
          nome: string
          solo_tipo: string | null
          updated_at: string | null
        }
        Insert: {
          area_ha?: number | null
          created_at?: string | null
          farm_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality_ibge_code?: string | null
          municipality_name?: string | null
          nome: string
          solo_tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          area_ha?: number | null
          created_at?: string | null
          farm_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality_ibge_code?: string | null
          municipality_name?: string | null
          nome?: string
          solo_tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          active: boolean
          condition: string
          created_at: string
          id: string
          last_triggered_at: string | null
          market: string
          product: string
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          condition: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          market: string
          product: string
          threshold: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          condition?: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          market?: string
          product?: string
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_series: {
        Row: {
          created_at: string
          date: string
          id: string
          market: string
          price: number
          product: string
          source: string
          unit: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          market: string
          price: number
          product: string
          source: string
          unit?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          market?: string
          price?: number
          product?: string
          source?: string
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          activity_id: string | null
          categoria: Database["public"]["Enums"]["transaction_category"]
          created_at: string | null
          data: string
          descricao: string
          farm_id: string
          id: string
          origem: string | null
          plot_id: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          valor_brl: number
        }
        Insert: {
          activity_id?: string | null
          categoria: Database["public"]["Enums"]["transaction_category"]
          created_at?: string | null
          data: string
          descricao: string
          farm_id: string
          id?: string
          origem?: string | null
          plot_id?: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          valor_brl: number
        }
        Update: {
          activity_id?: string | null
          categoria?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string | null
          data?: string
          descricao?: string
          farm_id?: string
          id?: string
          origem?: string | null
          plot_id?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          valor_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
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
      weather_prefs: {
        Row: {
          alerta_chuva_limite_mm: number | null
          created_at: string | null
          disease_rain_24h_mm: number | null
          disease_rh_pct: number | null
          disease_temp_max_c: number | null
          disease_temp_min_c: number | null
          fonte_api: string | null
          frost_min_temp_c: number | null
          heat_stress_max_c: number | null
          id: string
          notif_alerta_chuva: boolean | null
          notif_lembretes_atividades: boolean | null
          spray_dry_window_h: number | null
          spray_rain_max_mm: number | null
          spray_rh_min_pct: number | null
          spray_temp_max_c: number | null
          spray_wind_max_kmh: number | null
          unidade_temp: Database["public"]["Enums"]["temp_unit"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerta_chuva_limite_mm?: number | null
          created_at?: string | null
          disease_rain_24h_mm?: number | null
          disease_rh_pct?: number | null
          disease_temp_max_c?: number | null
          disease_temp_min_c?: number | null
          fonte_api?: string | null
          frost_min_temp_c?: number | null
          heat_stress_max_c?: number | null
          id?: string
          notif_alerta_chuva?: boolean | null
          notif_lembretes_atividades?: boolean | null
          spray_dry_window_h?: number | null
          spray_rain_max_mm?: number | null
          spray_rh_min_pct?: number | null
          spray_temp_max_c?: number | null
          spray_wind_max_kmh?: number | null
          unidade_temp?: Database["public"]["Enums"]["temp_unit"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerta_chuva_limite_mm?: number | null
          created_at?: string | null
          disease_rain_24h_mm?: number | null
          disease_rh_pct?: number | null
          disease_temp_max_c?: number | null
          disease_temp_min_c?: number | null
          fonte_api?: string | null
          frost_min_temp_c?: number | null
          heat_stress_max_c?: number | null
          id?: string
          notif_alerta_chuva?: boolean | null
          notif_lembretes_atividades?: boolean | null
          spray_dry_window_h?: number | null
          spray_rain_max_mm?: number | null
          spray_rh_min_pct?: number | null
          spray_temp_max_c?: number | null
          spray_wind_max_kmh?: number | null
          unidade_temp?: Database["public"]["Enums"]["temp_unit"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_prices_series: {
        Args: { p_days?: number; p_market: string; p_product: string }
        Returns: {
          date: string
          price: number
          source: string
          unit: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      jsonb_merge: {
        Args: { a: Json; b: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "produtor"
      planting_status: "planejado" | "em_andamento" | "colhido"
      temp_unit: "C" | "F"
      transaction_category:
        | "insumo"
        | "mao_obra"
        | "maquinas"
        | "energia"
        | "transporte"
        | "venda"
        | "outros"
        | "adubacao"
      transaction_type: "receita" | "custo"
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
      app_role: ["admin", "produtor"],
      planting_status: ["planejado", "em_andamento", "colhido"],
      temp_unit: ["C", "F"],
      transaction_category: [
        "insumo",
        "mao_obra",
        "maquinas",
        "energia",
        "transporte",
        "venda",
        "outros",
        "adubacao",
      ],
      transaction_type: ["receita", "custo"],
    },
  },
} as const
