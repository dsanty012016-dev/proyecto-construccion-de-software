import postgres from "npm:postgres@3.4.7";
import { EventoInvalido, manejadorDePagos } from "./procesar.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });

Deno.serve(manejadorDePagos({
  llavePrivada: () => Deno.env.get("WOMPI_LLAVE_PRIVADA"),
  validar: async (evento) => {
    try {
      const filas = await sql<{ transaccion: string; ambiente: "test" | "prod" }[]>`
        select * from privado.validar_evento_pago(${sql.json(evento as postgres.JSONValue)})`;
      return filas[0] ?? null;
    } catch (error) {
      const fallo = error as { code?: string; message?: string };
      if (fallo.code === "P0001" && !fallo.message?.includes("configurada") && !fallo.message?.includes("saldos de prueba")) throw new EventoInvalido();
      throw error;
    }
  },
  confirmar: async (evento, transaccion) => {
    const filas = await sql<{ resultado: string }[]>`
      select privado.confirmar_pago_verificado(${sql.json(evento as postgres.JSONValue)}, ${sql.json(transaccion as unknown as postgres.JSONValue)}) as resultado`;
    return filas[0].resultado;
  },
}));
