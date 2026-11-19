import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const PERSONAS = 50;

// Se usa solo después de aplicar todas las migraciones en una base desechable.
export async function probarConcurrencia(consultar) {
  const cuentas = Array.from({ length: PERSONAS + 1 }, () => randomUUID());
  const [cuentaCompartida, ...individuales] = cuentas;
  await consultar(`
    update privado.ajustes_pago set secreto_eventos='test_events_concurrencia_ficticio',checkout_pausado=false;
    insert into auth.users(id,email,raw_user_meta_data) values
    ${cuentas.map(id => `('${id}','${id}@ustavillavo.edu.co','{"nombre":"Estudiante de prueba","rol":"estudiante"}')`).join(",\n")};
  `);

  async function abrir(id) {
    const inicio = performance.now();
    const respuesta = await consultar(`
      begin;
      set local statement_timeout='20s';
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${id}',true);
      select public.iniciar_recarga_wompi(20000,'test');
      commit;
    `);
    return { respuesta: respuesta.trim().split(/\r?\n/).at(-1), tiempo: Math.round(performance.now() - inicio) };
  }

  const resultados = await Promise.all(individuales.map(abrir));
  assert.equal(new Set(resultados.map(({ respuesta }) => respuesta)).size, PERSONAS);
  assert.ok(resultados.every(({ respuesta }) => /^[a-f0-9-]{36}$/.test(respuesta)));
  const tiempos = resultados.map(({ tiempo }) => tiempo).sort((a, b) => a - b);
  const guardadas = await consultar(`
    select count(*) from public.recargas where ambiente='test' and monto=20000
      and persona_id in (${individuales.map(id => `'${id}'`).join(",")});
  `);
  assert.equal(guardadas.trim(), String(PERSONAS));

  const competencia = await Promise.allSettled(individuales.map(() => abrir(cuentaCompartida)));
  assert.equal(competencia.filter(({ status }) => status === "fulfilled").length, 5);
  for (const resultado of competencia.filter(({ status }) => status === "rejected")) {
    assert.match(resultado.reason.message, /recargas sin terminar/);
  }
  assert.equal((await consultar(`select count(*) from public.recargas where persona_id='${cuentaCompartida}';`)).trim(), "5");
  return {
    simultaneas: PERSONAS, cuentasConReferenciaPropia: PERSONAS,
    p95MsAperturaIncluidaConexion: tiempos[Math.ceil(PERSONAS * 0.95) - 1],
    maximoMsAperturaIncluidaConexion: tiempos.at(-1), aceptadasEnLaMismaCuenta: 5,
  };
}

function psql(sql) {
  return new Promise((resolve, reject) => {
    const herramienta = spawn("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1"], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
    let salida = "";
    let error = "";
    herramienta.stdout.setEncoding("utf8").on("data", datos => { salida += datos; });
    herramienta.stderr.setEncoding("utf8").on("data", datos => { error += datos; });
    herramienta.stdin.on("error", reject);
    herramienta.on("error", reject);
    herramienta.on("close", codigo => codigo === 0 ? resolve(salida) : reject(new Error(error.trim())));
    herramienta.stdin.end(sql);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.UNIGO_BD_DESECHABLE !== "1") throw new Error("Usa una base local desechable y declara UNIGO_BD_DESECHABLE=1.");
  console.log(JSON.stringify(await probarConcurrencia(psql)));
}
