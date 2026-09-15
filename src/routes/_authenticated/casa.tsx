import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Home, UserPlus, Copy, Check, LogOut, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAceitarConviteCasa,
  useCriarCasa,
  useGerarConviteCasa,
  useMinhaCasa,
  useSairDaCasa,
} from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/casa")({
  head: () => ({
    meta: [
      { title: "Casa — MercadoIQ" },
      { name: "description", content: "Compartilhe sua lista de compras com outra pessoa." },
      { property: "og:title", content: "Casa — MercadoIQ" },
      { property: "og:description", content: "Compartilhe sua lista de compras com outra pessoa." },
    ],
  }),
  component: CasaPage,
});

function CasaPage() {
  const { data: membros, isLoading } = useMinhaCasa();
  const estaEmCasa = (membros?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Casa</h1>
        <p className="text-sm text-muted-foreground">
          Conecte sua conta com a de outra pessoa pra dividir a mesma lista de compras.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && (estaEmCasa ? <PainelDaCasa membros={membros!} /> : <SemCasa />)}
    </div>
  );
}

function SemCasa() {
  const criar = useCriarCasa();
  const entrar = useAceitarConviteCasa();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");

  async function aoCriar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await criar.mutateAsync(nome.trim() || "Minha Casa");
      toast.success("Casa criada! Gere um convite pra outra pessoa entrar.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu pra criar a Casa.");
    }
  }

  async function aoEntrar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await entrar.mutateAsync(codigo.trim());
      toast.success("Pronto! Agora vocês dividem a mesma lista.");
      setCodigo("");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Código inválido ou expirado.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-soft space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Home className="size-4" /> Criar uma Casa
        </div>
        <form onSubmit={aoCriar} className="flex gap-2">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome (ex.: Casa do Luis e da Ana)"
          />
          <Button type="submit" disabled={criar.isPending}>
            {criar.isPending ? <Loader2 className="size-4 animate-spin" /> : "Criar"}
          </Button>
        </form>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="card-soft space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4" /> Entrar com um código
        </div>
        <form onSubmit={aoEntrar} className="flex gap-2">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Código de 8 letras"
            maxLength={8}
            className="tracking-widest"
          />
          <Button type="submit" disabled={entrar.isPending || codigo.trim().length < 4}>
            {entrar.isPending ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PainelDaCasa({ membros }: { membros: { membro_user_id: string; papel: string; nome: string }[] }) {
  const gerarConvite = useGerarConviteCasa();
  const sair = useSairDaCasa();
  const [codigoGerado, setCodigoGerado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  async function gerar() {
    try {
      const codigo = await gerarConvite.mutateAsync();
      setCodigoGerado(codigo);
      setCopiado(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu pra gerar o convite.");
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(codigoGerado);
    setCopiado(true);
    toast.success("Código copiado!");
  }

  async function confirmarSaida() {
    try {
      await sair.mutateAsync();
      toast.success("Você saiu da Casa.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu pra sair da Casa.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <p className="text-sm font-semibold">Quem está na Casa</p>
        <ul className="mt-3 space-y-2">
          {membros.map((m) => (
            <li key={m.membro_user_id} className="flex items-center gap-2 text-sm">
              {m.papel === "dono" && <Crown className="size-4 text-accent-foreground" />}
              <span>{m.nome}</span>
              <span className="text-xs text-muted-foreground">
                {m.papel === "dono" ? "dono(a)" : "membro"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {membros.length < 2 && (
        <div className="card-soft space-y-3 p-4">
          <p className="text-sm font-semibold">Convidar mais alguém</p>
          <p className="text-xs text-muted-foreground">
            Gere um código e mande pra pessoa — ela cola na tela "Entrar com um código".
            Vale por 7 dias.
          </p>
          {codigoGerado ? (
            <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <span className="font-display text-lg font-semibold tracking-widest">
                {codigoGerado}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={copiar}>
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={gerar} disabled={gerarConvite.isPending}>
              {gerarConvite.isPending && <Loader2 className="size-4 animate-spin" />}
              Gerar código de convite
            </Button>
          )}
        </div>
      )}

      <div className="card-soft p-4">
        {!confirmandoSaida ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-destructive"
            onClick={() => setConfirmandoSaida(true)}
          >
            <LogOut className="size-4" /> Sair da Casa
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              Tem certeza? Você deixa de ver as compras compartilhadas — as suas continuam
              com você.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" size="sm" onClick={confirmarSaida} disabled={sair.isPending}>
                {sair.isPending && <Loader2 className="size-4 animate-spin" />}
                Sim, sair
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmandoSaida(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
