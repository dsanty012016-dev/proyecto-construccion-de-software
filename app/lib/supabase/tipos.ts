// Tipos de la base de datos, sacados de los que genera Supabase para el
// proyecto (resumidos: Update y Relationships se escriben más corto). Cuando
// cambie una migración hay que regenerarlos (MCP de Supabase o
// `supabase gen types typescript`) y actualizar este archivo.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rol = Database["public"]["Enums"]["rol_usuario"];
type EstadoViaje = Database["public"]["Enums"]["estado_viaje"];
type EstadoOferta = Database["public"]["Enums"]["estado_oferta"];

type Relacion = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      calificaciones: {
        Row: {
          autor_id: string;
          calificado_id: string;
          comentario: string | null;
          creada_en: string;
          estrellas: number;
          id: string;
          viaje_id: string;
        };
        Insert: {
          autor_id: string;
          calificado_id: string;
          comentario?: string | null;
          creada_en?: string;
          estrellas: number;
          id?: string;
          viaje_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["calificaciones"]["Insert"]>;
        Relationships: Relacion[];
      };
      ofertas: {
        Row: {
          conductor_id: string;
          creada_en: string;
          estado: EstadoOferta;
          id: string;
          precio: number;
          viaje_id: string;
        };
        Insert: {
          conductor_id: string;
          creada_en?: string;
          estado?: EstadoOferta;
          id?: string;
          precio: number;
          viaje_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["ofertas"]["Insert"]>;
        Relationships: Relacion[];
      };
      perfiles: {
        Row: {
          creado_en: string;
          disponible: boolean;
          id: string;
          nombre: string;
          rol: Rol | null;
          telefono: string | null;
          universidad_id: number;
        };
        Insert: {
          creado_en?: string;
          disponible?: boolean;
          id: string;
          nombre: string;
          rol?: Rol | null;
          telefono?: string | null;
          universidad_id: number;
        };
        Update: Partial<Database["public"]["Tables"]["perfiles"]["Insert"]>;
        Relationships: Relacion[];
      };
      universidades: {
        Row: {
          activa: boolean;
          ciudad: string;
          creada_en: string;
          dominio_correo: string;
          id: number;
          lat: number | null;
          lng: number | null;
          nombre: string;
        };
        Insert: {
          activa?: boolean;
          ciudad: string;
          creada_en?: string;
          dominio_correo: string;
          id?: never;
          lat?: number | null;
          lng?: number | null;
          nombre: string;
        };
        Update: Partial<Database["public"]["Tables"]["universidades"]["Insert"]>;
        Relationships: [];
      };
      vehiculos: {
        Row: {
          color: string;
          conductor_id: string;
          creado_en: string;
          id: string;
          marca: string;
          modelo: string;
          placa: string;
        };
        Insert: {
          color: string;
          conductor_id: string;
          creado_en?: string;
          id?: string;
          marca: string;
          modelo: string;
          placa: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehiculos"]["Insert"]>;
        Relationships: Relacion[];
      };
      viajes: {
        Row: {
          aceptado_en: string | null;
          cancelado_en: string | null;
          cancelado_por: string | null;
          conductor_id: string | null;
          creado_en: string;
          destino_lat: number;
          destino_lng: number;
          destino_texto: string;
          estado: EstadoViaje;
          estudiante_id: string;
          id: string;
          iniciado_en: string | null;
          origen_lat: number;
          origen_lng: number;
          origen_texto: string;
          precio: number | null;
          terminado_en: string | null;
          universidad_id: number;
        };
        Insert: {
          aceptado_en?: string | null;
          cancelado_en?: string | null;
          cancelado_por?: string | null;
          conductor_id?: string | null;
          creado_en?: string;
          destino_lat: number;
          destino_lng: number;
          destino_texto: string;
          estado?: EstadoViaje;
          estudiante_id: string;
          id?: string;
          iniciado_en?: string | null;
          origen_lat: number;
          origen_lng: number;
          origen_texto: string;
          precio?: number | null;
          terminado_en?: string | null;
          universidad_id: number;
        };
        Update: Partial<Database["public"]["Tables"]["viajes"]["Insert"]>;
        Relationships: Relacion[];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      aceptar_oferta: { Args: { p_oferta: string }; Returns: undefined };
      calificar: {
        Args: { p_comentario?: string; p_estrellas: number; p_viaje: string };
        Returns: undefined;
      };
      cambiar_disponibilidad: { Args: { p_disponible: boolean }; Returns: undefined };
      cancelar_viaje: { Args: { p_viaje: string }; Returns: undefined };
      elegir_rol: { Args: { p_rol: Rol }; Returns: undefined };
      iniciar_viaje: { Args: { p_viaje: string }; Returns: undefined };
      ofertar: { Args: { p_precio: number; p_viaje: string }; Returns: string };
      perfiles_publicos: {
        Args: { p_ids: string[] };
        Returns: {
          calificacion: number;
          id: string;
          nombre: string;
          rol: Rol;
          total_calificaciones: number;
          viajes_terminados: number;
        }[];
      };
      retirar_oferta: { Args: { p_viaje: string }; Returns: undefined };
      solicitar_viaje: {
        Args: {
          p_destino_lat: number;
          p_destino_lng: number;
          p_destino_texto: string;
          p_origen_lat: number;
          p_origen_lng: number;
          p_origen_texto: string;
        };
        Returns: string;
      };
      terminar_viaje: { Args: { p_viaje: string }; Returns: undefined };
    };
    Enums: {
      estado_oferta: "activa" | "retirada" | "aceptada" | "rechazada";
      estado_viaje: "solicitado" | "aceptado" | "en_curso" | "terminado" | "cancelado";
      rol_usuario: "estudiante" | "conductor";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
