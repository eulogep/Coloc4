
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_logs": {
                  Row: {
                    "action": string,"actor_member_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"household_id": string,"id": number,"summary": NonNullable<Json>
                  }
                  Insert: {
                    "action": string,"actor_member_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"household_id": string,"id"?: never,"summary"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_member_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"household_id"?: string,"id"?: never,"summary"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_logs_household_id_actor_member_id_fkey"
      columns: ["household_id","actor_member_id"]
isOneToOne: false
      referencedRelation: "household_members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "activity_logs_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"household_invitations": {
                  Row: {
                    "created_at": string,"created_by_member_id": string,"expires_at": string,"household_id": string,"id": string,"max_uses": number,"revoked_at": string | null,"token_hash": string,"use_count": number
                  }
                  Insert: {
                    "created_at"?: string,"created_by_member_id": string,"expires_at": string,"household_id": string,"id"?: string,"max_uses": number,"revoked_at"?: string | null,"token_hash": string,"use_count"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by_member_id"?: string,"expires_at"?: string,"household_id"?: string,"id"?: string,"max_uses"?: number,"revoked_at"?: string | null,"token_hash"?: string,"use_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_invitations_household_id_created_by_member_id_fkey"
      columns: ["household_id","created_by_member_id"]
isOneToOne: false
      referencedRelation: "household_members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "household_invitations_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"household_members": {
                  Row: {
                    "anonymized_at": string | null,"created_at": string,"display_name_snapshot": string,"household_id": string,"id": string,"joined_at": string,"left_at": string | null,"role": Database["public"]['Enums']["member_role"],"status": Database["public"]['Enums']["member_status"],"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "anonymized_at"?: string | null,"created_at"?: string,"display_name_snapshot": string,"household_id": string,"id"?: string,"joined_at"?: string,"left_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "anonymized_at"?: string | null,"created_at"?: string,"display_name_snapshot"?: string,"household_id"?: string,"id"?: string,"joined_at"?: string,"left_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "anonymized_member_seq": number,"archived_at": string | null,"created_at": string,"currency": string,"id": string,"name": string,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "anonymized_member_seq"?: number,"archived_at"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"name": string,"timezone": string,"updated_at"?: string
                  }
                  Update: {
                    "anonymized_member_seq"?: number,"archived_at"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_household":
{ Args: { "p_name": string,"p_timezone": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_household_id": string }; Returns: {
              "expires_at": string,"invitation_id": string,"max_uses": number,"token": string
            }[]
                           },
"join_household":
{ Args: { "p_token": string }; Returns: {
              "result_code": string,"target_household_id": string
            }[]
                           },
"preview_invitation":
{ Args: { "p_token": string }; Returns: {
              "household_name": string,"result_code": string,"target_household_id": string
            }[]
                           },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "member_role": "owner"|"member","member_status": "active"|"left"|"anonymized"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "member_role": ["owner", "member"],"member_status": ["active", "left", "anonymized"]
          }
        }
} as const
