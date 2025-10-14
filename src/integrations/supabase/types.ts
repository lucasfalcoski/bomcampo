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
          created_at: string | null
          custo_estimado: number | null
          data: string
          descricao: string | null
          id: string
          observacoes: string | null
          plot_id: string
          realizado: boolean | null
          tipo: Database["public"]["Enums"]["activity_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custo_estimado?: number | null
          data: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          plot_id: string
          realizado?: boolean | null
          tipo: Database["public"]["Enums"]["activity_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custo_estimado?: number | null
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          plot_id?: string
          realizado?: boolean | null
          tipo?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
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
          fonte_api: string | null
          id: string
          unidade_temp: Database["public"]["Enums"]["temp_unit"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerta_chuva_limite_mm?: number | null
          created_at?: string | null
          fonte_api?: string | null
          id?: string
          unidade_temp?: Database["public"]["Enums"]["temp_unit"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerta_chuva_limite_mm?: number | null
          created_at?: string | null
          fonte_api?: string | null
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "pulverizacao"
        | "irrigacao"
        | "adubacao"
        | "manejo_fitossanitario"
        | "colheita"
        | "outro"
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
      activity_type: [
        "pulverizacao",
        "irrigacao",
        "adubacao",
        "manejo_fitossanitario",
        "colheita",
        "outro",
      ],
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
      ],
      transaction_type: ["receita", "custo"],
    },
  },
} as const
