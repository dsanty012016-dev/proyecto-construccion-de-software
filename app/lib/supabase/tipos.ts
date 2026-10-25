// Tipos de la base de datos, sacados de los que genera Supabase para el
// proyecto (resumidos: Update y Relationships se escriben más corto). Cuando
// cambie una migración hay que regenerarlos (MCP de Supabase o
// `supabase gen types typescript`) y actualizar este archivo.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rol = Database["public"]["Enums"]["rol_usuario"];
type EstadoViaje = Database["public"]["Enums"]["estado_viaje"];
type EstadoOferta = Database["public"]["Enums"]["estado_oferta"];
type EstadoCupo = Database["public"]["Enums"]["estado_cupo"];
type EstadoPuesto = Database["public"]["Enums"]["estado_puesto"];
type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];
type EstadoDocumento = Database["public"]["Enums"]["estado_documento"];
type TipoMovimiento = Database["public"]["Enums"]["tipo_movimiento"];

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
          puesto_id: string | null;
          viaje_id: string | null;
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
      billeteras: {
        Row: { actualizado_en: string; persona_id: string; saldo: number };
        Insert: { persona_id: string; saldo?: number };
        Update: Partial<Database["public"]["Tables"]["billeteras"]["Insert"]>;
        Relationships: Relacion[];
      };
      movimientos: {
        Row: {
          creado_en: string;
          descripcion: string;
          id: string;
          monto: number;
          persona_id: string;
          puesto_id: string | null;
          saldo_despues: number;
          tipo: TipoMovimiento;
          viaje_id: string | null;
        };
        Insert: { persona_id: string; tipo: TipoMovimiento; monto: number; saldo_despues: number; descripcion: string };
        Update: Partial<Database["public"]["Tables"]["movimientos"]["Insert"]>;
        Relationships: Relacion[];
      };
      strikes: {
        Row: { creado_en: string; cupo_id: string | null; id: string; motivo: string; persona_id: string; viaje_id: string | null; vigente: boolean };
        Insert: { persona_id: string; motivo: string };
        Update: Partial<Database["public"]["Tables"]["strikes"]["Insert"]>;
        Relationships: Relacion[];
      };
      suspensiones: {
        Row: { desde: string; hasta: string; id: string; nivel: number; persona_id: string };
        Insert: { persona_id: string; nivel: number; hasta: string };
        Update: Partial<Database["public"]["Tables"]["suspensiones"]["Insert"]>;
        Relationships: Relacion[];
      };
      ubicaciones_cupo: {
        Row: { actualizado_en: string; conductor_id: string; cupo_id: string; lat: number; lng: number; precision_m: number | null };
        Insert: { cupo_id: string; conductor_id: string; lat: number; lng: number; precision_m?: number | null };
        Update: Partial<Database["public"]["Tables"]["ubicaciones_cupo"]["Insert"]>;
        Relationships: Relacion[];
      };
      ubicaciones_viaje: {
        Row: { actualizado_en: string; conductor_id: string; lat: number; lng: number; precision_m: number | null; viaje_id: string };
        Insert: { viaje_id: string; conductor_id: string; lat: number; lng: number; precision_m?: number | null };
        Update: Partial<Database["public"]["Tables"]["ubicaciones_viaje"]["Insert"]>;
        Relationships: Relacion[];
      };
      reportes: {
        Row: { autor_id: string; creado_en: string; id: string; motivo: string; revisado_en: string | null; sobre_id: string; viaje_id: string | null };
        Insert: { autor_id: string; sobre_id: string; motivo: string };
        Update: Partial<Database["public"]["Tables"]["reportes"]["Insert"]>;
        Relationships: Relacion[];
      };
      cupos: {
        Row: {
          cancelado_en: string | null;
          conductor_id: string;
          creado_en: string;
          destino_lat: number;
          destino_lng: number;
          destino_texto: string;
          estado: EstadoCupo;
          id: string;
          iniciado_en: string | null;
          precio: number;
          puestos: number;
          sale_en: string;
          salida_lat: number;
          salida_lng: number;
          salida_texto: string;
          terminado_en: string | null;
          universidad_id: number;
        };
        Insert: {
          conductor_id: string;
          destino_lat: number;
          destino_lng: number;
          destino_texto: string;
          precio: number;
          puestos: number;
          sale_en: string;
          salida_lat: number;
          salida_lng: number;
          salida_texto: string;
          universidad_id: number;
          estado?: EstadoCupo;
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cupos"]["Insert"]>;
        Relationships: Relacion[];
      };
      puestos: {
        Row: {
          creado_en: string;
          cupo_id: string;
          decidido_en: string | null;
          estado: EstadoPuesto;
          estudiante_id: string;
          id: string;
          pagado: number;
          pagado_en: string | null;
          recogida_lat: number;
          recogida_lng: number;
          recogida_texto: string;
        };
        Insert: {
          cupo_id: string;
          estudiante_id: string;
          recogida_lat: number;
          recogida_lng: number;
          recogida_texto: string;
          estado?: EstadoPuesto;
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["puestos"]["Insert"]>;
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
      documentos_conductor: {
        Row: {
          autorizado_en: string;
          conductor_id: string;
          enviado_en: string;
          estado: EstadoDocumento;
          id: string;
          motivo: string | null;
          revisado_en: string | null;
          revisado_por: string | null;
          ruta: string;
          tipo: TipoDocumento;
        };
        Insert: {
          autorizado_en: string;
          conductor_id: string;
          ruta: string;
          tipo: TipoDocumento;
          estado?: EstadoDocumento;
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documentos_conductor"]["Insert"]>;
        Relationships: Relacion[];
      };
      perfiles: {
        Row: {
          creado_en: string;
          disponible: boolean;
          es_admin: boolean;
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
          pago_retenido: number;
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
      reportar_ubicacion: { Args: { p_viaje: string; p_lat: number; p_lng: number; p_precision?: number }; Returns: undefined };
      compartir_viaje: { Args: { p_viaje: string }; Returns: string };
      viaje_compartido: {
        Args: { p_token: string };
        Returns: {
          estado: EstadoViaje;
          origen_texto: string | null;
          destino_texto: string | null;
          origen_lat: number | null;
          origen_lng: number | null;
          destino_lat: number | null;
          destino_lng: number | null;
          estudiante: string | null;
          conductor: string | null;
          vehiculo: string | null;
          placa: string | null;
          ubicacion_lat: number | null;
          ubicacion_lng: number | null;
          ubicacion_en: string | null;
        }[];
      };
      calificar: {
        Args: { p_comentario?: string; p_estrellas: number; p_viaje: string };
        Returns: undefined;
      };
      calificar_puesto: { Args: { p_puesto: string; p_estrellas: number; p_comentario?: string }; Returns: undefined };
      reportar_ubicacion_cupo: { Args: { p_cupo: string; p_lat: number; p_lng: number; p_precision?: number }; Returns: undefined };
      compartir_puesto: { Args: { p_cupo: string }; Returns: string };
      cupo_compartido: {
        Args: { p_token: string };
        Returns: {
          estado: EstadoCupo;
          activo: boolean;
          sale_en: string | null;
          recogida_texto: string | null;
          destino_texto: string | null;
          recogida_lat: number | null;
          recogida_lng: number | null;
          destino_lat: number | null;
          destino_lng: number | null;
          estudiante: string | null;
          conductor: string | null;
          vehiculo: string | null;
          placa: string | null;
          ubicacion_lat: number | null;
          ubicacion_lng: number | null;
          ubicacion_en: string | null;
        }[];
      };
      cambiar_disponibilidad: { Args: { p_disponible: boolean }; Returns: undefined };
      cambiar_modo: { Args: { p_modo: Rol }; Returns: undefined };
      cancelar_cupo: { Args: { p_cupo: string }; Returns: undefined };
      cancelar_viaje: { Args: { p_viaje: string; p_justificacion?: string }; Returns: undefined };
      iniciar_cupo: { Args: { p_cupo: string }; Returns: undefined };
      pagar_puesto: { Args: { p_cupo: string }; Returns: undefined };
      recargar: { Args: { p_monto: number }; Returns: number };
      pedir_puesto: {
        Args: { p_cupo: string; p_recogida_lat: number; p_recogida_lng: number; p_recogida_texto: string };
        Returns: string;
      };
      publicar_cupo: {
        Args: {
          p_salida_lat: number;
          p_salida_lng: number;
          p_salida_texto: string;
          p_sale_en: string;
          p_puestos: number;
          p_precio: number;
        };
        Returns: string;
      };
      puestos_libres: { Args: { p_cupos: string[] }; Returns: { cupo_id: string; libres: number }[] };
      responder_puesto: { Args: { p_puesto: string; p_aprobar: boolean }; Returns: undefined };
      retirar_puesto: { Args: { p_cupo: string }; Returns: undefined };
      revisar_documento: { Args: { p_documento: string; p_aprobar: boolean; p_motivo?: string }; Returns: undefined };
      terminar_cupo: { Args: { p_cupo: string }; Returns: undefined };
      elegir_rol: { Args: { p_rol: Rol }; Returns: undefined };
      enviar_documento: { Args: { p_tipo: TipoDocumento; p_ruta: string; p_autorizo: boolean }; Returns: undefined };
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
      estado_cupo: "publicado" | "en_curso" | "terminado" | "cancelado";
      estado_documento: "pendiente" | "aprobado" | "rechazado";
      estado_oferta: "activa" | "retirada" | "aceptada" | "rechazada";
      estado_puesto: "pendiente" | "aprobado" | "rechazado" | "retirado" | "cancelado" | "sin_pago";
      tipo_movimiento: "recarga" | "pago_viaje" | "reembolso_viaje" | "ganancia" | "pago_puesto" | "reembolso_puesto";
      estado_viaje: "solicitado" | "aceptado" | "en_curso" | "terminado" | "cancelado";
      rol_usuario: "estudiante" | "conductor";
      tipo_documento: "cedula" | "licencia" | "tarjeta_propiedad";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
