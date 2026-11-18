import { beforeEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ rpc:vi.fn(), revalidar:vi.fn() }));
vi.mock("server-only",()=>({}));vi.mock("next/cache",()=>({revalidatePath:dobles.revalidar}));vi.mock("next/navigation",()=>({redirect:vi.fn()}));
vi.mock("./sesion",()=>({inicioDeRol:(rol:string)=>"/"+rol}));
vi.mock("./supabase/server",()=>({crearClienteServidor:async()=>({rpc:dobles.rpc})}));
import { actualizarContacto } from "./acciones-perfil";
import { esquemaContacto } from "./validaciones-auth";
import { ESTADO_INICIAL } from "./estado-formulario";
function datos(nombre="  Nombre Correcto  ", telefono="300 123 4567"){const f=new FormData();f.set("nombre",nombre);f.set("telefono",telefono);return f}
beforeEach(()=>{vi.resetAllMocks();dobles.rpc.mockResolvedValue({error:null})});
describe("corregir el contacto propio",()=>{
  it.each(["3001234567","+573001234567","+57 300 123 4567"])("normaliza el celular %s",telefono=>expect(esquemaContacto.parse({nombre:"Nombre",telefono}).telefono).toBe("+573001234567"));
  it.each(["","2001234567","30012","+13001234567"])("rechaza el celular %s",telefono=>expect(esquemaContacto.safeParse({nombre:"Nombre",telefono}).success).toBe(false));
  it("guarda solo nombre y celular mediante la RPC",async()=>{const f=datos();f.set("correo","otro@ustavillavo.edu.co");f.set("rol","conductor");f.set("es_admin","true");f.set("id","otra-cuenta");expect(await actualizarContacto(ESTADO_INICIAL,f)).toMatchObject({resultado:"listo",valores:{nombre:"Nombre Correcto",telefono:"3001234567"}});expect(dobles.rpc.mock.calls).toEqual([["actualizar_contacto",{p_nombre:"Nombre Correcto",p_telefono:"+573001234567"}]]);expect(dobles.revalidar).toHaveBeenCalledWith("/","layout")});
  it("un dato inválido no escribe",async()=>{expect(await actualizarContacto(ESTADO_INICIAL,datos("a","123"))).toMatchObject({resultado:"error",errores:{nombre:expect.any(String),telefono:expect.any(String)}});expect(dobles.rpc).not.toHaveBeenCalled()});
  it("un fallo conserva lo escrito sin anunciar éxito",async()=>{dobles.rpc.mockResolvedValue({error:{code:"ERROR"}});expect(await actualizarContacto(ESTADO_INICIAL,datos())).toMatchObject({resultado:"error",valores:{nombre:"  Nombre Correcto  ",telefono:"300 123 4567"}});expect(dobles.revalidar).not.toHaveBeenCalled()});
  it("un fallo de transporte también se recupera",async()=>{dobles.rpc.mockRejectedValue(Error("Sin red"));expect(await actualizarContacto(ESTADO_INICIAL,datos())).toMatchObject({resultado:"error"})});
  it("no devuelve campos extra como una contraseña",async()=>{const f=datos("a");f.set("clave","ficticia");expect((await actualizarContacto(ESTADO_INICIAL,f)).valores).not.toHaveProperty("clave")});
});
