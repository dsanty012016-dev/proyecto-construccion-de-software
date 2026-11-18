import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const dobles=vi.hoisted(()=>({reenviar:vi.fn(),registrar:vi.fn()}));
vi.mock("server-only",()=>({}));vi.mock("next/navigation",()=>({redirect:vi.fn()}));
vi.mock("next/headers",()=>({headers:async()=>new Map([["origin","https://unigo.test"]])}));
vi.mock("./supabase/server",()=>({crearClienteServidor:async()=>({auth:{resend:dobles.reenviar,signUp:dobles.registrar}})}));
import { reenviarConfirmacion, registrarse } from "./acciones-auth";
import { ESTADO_INICIAL } from "./estado-formulario";
import { segundosParaReenviar } from "./confirmacion-correo";
function formulario(correo="persona@ustavillavo.edu.co"){const f=new FormData();f.set("correo",correo);return f}
beforeEach(()=>{vi.resetAllMocks();vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));dobles.reenviar.mockResolvedValue({error:null});dobles.registrar.mockResolvedValue({error:null})});
afterEach(()=>vi.useRealTimers());
describe("recuperar la confirmación del correo",()=>{
  it("solo reenvía una confirmación, con retorno al sitio",async()=>{const r=await reenviarConfirmacion(ESTADO_INICIAL,formulario(" PERSONA@ustavillavo.edu.co "));expect(dobles.reenviar).toHaveBeenCalledWith({type:"signup",email:"persona@ustavillavo.edu.co",options:{emailRedirectTo:"https://unigo.test/auth/confirmar"}});expect(r).toMatchObject({resultado:"listo",valores:{correo:"persona@ustavillavo.edu.co"},reintentarEn:Date.now()+60000});expect(dobles.registrar).not.toHaveBeenCalled()});
  it.each([{status:400,code:"user_not_found"},{status:400,code:"email_exists"},{status:429,code:"over_email_send_rate_limit"}])("no revela si existe la cuenta: %s",async error=>{const normal=await reenviarConfirmacion(ESTADO_INICIAL,formulario());dobles.reenviar.mockResolvedValue({error});expect(await reenviarConfirmacion(ESTADO_INICIAL,formulario())).toEqual(normal)});
  it.each(["","incorrecto","persona@gmail.com"])("un correo inválido no solicita envíos: %s",async correo=>{expect(await reenviarConfirmacion(ESTADO_INICIAL,formulario(correo))).toMatchObject({resultado:"error",errores:{correo:expect.any(String)}});expect(dobles.reenviar).not.toHaveBeenCalled()});
  it("un fallo del servicio permite recuperarse sin afirmar envío",async()=>{dobles.reenviar.mockResolvedValue({error:{status:503}});expect(await reenviarConfirmacion(ESTADO_INICIAL,formulario())).toMatchObject({resultado:"error",valores:{correo:"persona@ustavillavo.edu.co"},reintentarEn:Date.now()+60000})});
  it("una interrupción de red no rompe el formulario",async()=>{dobles.reenviar.mockRejectedValue(Error("Sin conexión"));expect(await reenviarConfirmacion(ESTADO_INICIAL,formulario())).toMatchObject({resultado:"error"})});
  it("el registro conserva solo el correo y la espera para recuperar el enlace",async()=>{const f=formulario();for(const[k,v]of Object.entries({nombre:"Persona Prueba",telefono:"3001234567",rol:"conductor",clave:"Prueba1234",confirmacion:"Prueba1234",terminos:"on"}))f.set(k,v);const r=await registrarse(ESTADO_INICIAL,f);expect(r).toMatchObject({resultado:"listo",valores:{correo:"persona@ustavillavo.edu.co"},reintentarEn:Date.now()+60000});expect(r.valores).not.toHaveProperty("clave")});
  it("la espera termina sin permitir valores negativos",()=>{expect(segundosParaReenviar(Date.now()+60000,Date.now())).toBe(60);expect(segundosParaReenviar(Date.now()+60000,Date.now()+1000)).toBe(59);expect(segundosParaReenviar(Date.now(),Date.now()+1000)).toBe(0)});
  it.each([undefined,NaN,Infinity])("una espera inválida no bloquea el formulario: %s",limite=>expect(segundosParaReenviar(limite,Date.now())).toBe(0));
});
