import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Las rutas de IA cuestan dinero (Anthropic, Azure, Groq): cada una tiene que comprobar de verdad quién llama.
// proxy.ts solo mira que exista una cookie con ese nombre, así que NO sirve como control de acceso.

type Limite = { max: number; ventanaMs: number };

export const LIMITES = {
  enrich: { max: 30, ventanaMs: 60_000 },
  chat: { max: 30, ventanaMs: 60_000 },
  transcribe: { max: 20, ventanaMs: 60_000 },
  funnel: { max: 10, ventanaMs: 3_600_000 },
  research: { max: 5, ventanaMs: 3_600_000 },
} satisfies Record<string, Limite>;

// Límite en memoria, por usuario y por ruta. En Vercel cada instancia tiene la suya, así que frena el abuso
// pero no es exacto; si hiciera falta un tope duro habría que llevarlo a la base de datos.
const usos = new Map<string, number[]>();

/** Devuelve el usuario si hay sesión válida y no pasó el límite; si no, la respuesta de error lista para devolver. */
export async function guard(ruta: string, limite: Limite): Promise<{ userId: string } | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const clave = `${session.user.id}:${ruta}`, ahora = Date.now();
  const recientes = (usos.get(clave) ?? []).filter((t) => ahora - t < limite.ventanaMs);
  if (recientes.length >= limite.max) {
    const espera = Math.ceil((limite.ventanaMs - (ahora - recientes[0])) / 1000);
    usos.set(clave, recientes);
    return NextResponse.json(
      { error: `Demasiadas peticiones. Prueba de nuevo en ${espera} segundos.` },
      { status: 429, headers: { "Retry-After": String(espera) } },
    );
  }
  recientes.push(ahora);
  usos.set(clave, recientes);
  if (usos.size > 5000) for (const [k, v] of usos) if (!v.some((t) => ahora - t < 3_600_000)) usos.delete(k);
  return { userId: session.user.id };
}
