"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signUp.email({ name, email, password });
    if (err) {
      setError(err.message ?? "Error al registrarte");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="grid-bg flex min-h-dvh items-center justify-center bg-[#04060d] px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="bg-blob bg-blob-cyan" />
        <div className="bg-blob bg-blob-violet" />
      </div>

      <div className="glass relative z-10 w-full max-w-sm rounded-3xl p-8">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="glow-cyan flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-400/10">
            <span className="font-display bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-base font-bold text-transparent">
              ID
            </span>
          </span>
          <h1 className="font-display text-lg font-semibold text-slate-100">Crear cuenta</h1>
          <p className="text-xs text-slate-500">Ideas Descontroladas</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass h-11 rounded-xl px-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/60"
              placeholder="Tu nombre"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass h-11 rounded-xl px-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/60"
              placeholder="tu@email.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass h-11 rounded-xl px-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/60"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="font-display h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-sm font-semibold text-slate-950 transition hover:shadow-[0_0_18px_rgba(0,242,255,0.35)] disabled:opacity-50"
          >
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
