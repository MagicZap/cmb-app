# Correções — Tela Branca no Histórico

Aplique os 5 trechos abaixo no seu projeto. Cada um é independente e pode ser aplicado separadamente.

---

## 1️⃣ Error Boundary — nunca mais tela branca silenciosa

Crie um arquivo novo: `src/components/ErrorBoundary.tsx`

```tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("🔴 ErrorBoundary capturou:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-red-200">
          <p className="text-red-700 font-bold text-base mb-2">Erro ao renderizar os dados</p>
          <p className="text-red-500 text-sm mb-4">{this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Como usar no App.tsx** — envolva o `AppointmentList` do histórico:

```tsx
// Adicione o import no topo do App.tsx
import { ErrorBoundary } from "./components/ErrorBoundary";

// Na aba de histórico (TabsContent value="history"):
<TabsContent value="history" className="mt-0">
  <ErrorBoundary>
    <AppointmentList
      appointments={historyAppointments}
      loading={loading}
      onToggle={handleToggleConferido}
      emptyMessage="O histórico está vazio."
      viewMode={viewMode}
      sortConfig={sortConfig}
      onSort={handleSort}
    />
  </ErrorBoundary>
</TabsContent>
```

---

## 2️⃣ Desativar AnimatePresence no histórico

No `AppointmentList`, dentro do `return` do modo card, substitua o bloco atual por este:

```tsx
// ANTES (causa travamento com 450 itens):
return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
    <AnimatePresence mode="popLayout">
      {appointments.slice(0, 100).map((app, index) => (
        <motion.div key={`${app.id}-${index}`} layout ...>
          ...
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// DEPOIS — animação só para listas pequenas (pendentes), direto para listas grandes (histórico):
const usarAnimacao = appointments.length <= 150;

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
    {usarAnimacao ? (
      <AnimatePresence mode="popLayout">
        {appointments.map((app, index) => (
          <motion.div
            key={`${app.id}-${index}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <AppCard app={app} onToggle={onToggle} />
          </motion.div>
        ))}
      </AnimatePresence>
    ) : (
      // Sem animação para listas grandes — renderização direta
      appointments.map((app, index) => (
        <div key={`${app.id}-${index}`}>
          <AppCard app={app} onToggle={onToggle} />
        </div>
      ))
    )}
  </div>
);
```

> ⚠️ Note que o `.slice(0, 100)` foi **removido** — agora todas as linhas aparecem.

Para manter o código limpo, extraia o card para um componente separado `AppCard`:

```tsx
// Cole isso logo acima do AppointmentList
function AppCard({ app, onToggle }: { app: Appointment; onToggle: (id: string, status: boolean) => void }) {
  return (
    <Card className={`border-none shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col
      ${app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR")
        ? "bg-red-100"
        : app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular"
        ? "bg-green-100"
        : ""
      }`}>
      <CardContent className="p-0 flex flex-1 items-stretch">
        <div className={`w-1.5 shrink-0 ${app.conferido ? "bg-slate-300" : "bg-red-600"}`} />
        <div className="p-5 flex-1 flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-red-700 transition-colors line-clamp-2">
                {app.nome}
              </h3>
              <Checkbox
                checked={app.conferido}
                onCheckedChange={() => onToggle(app.id, app.conferido)}
                className="h-5 w-5 rounded border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 transition-all shrink-0 mt-0.5"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                <Clock className="w-3.5 h-3.5" />{app.horario}
              </span>
              <span className="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded">
                <Calendar className="w-3.5 h-3.5" />{formatarDataSeguro(app.dataAgendada)}
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 text-slate-600 text-xs">
                <Stethoscope className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700">{app.medico}</span>
                  <span className="text-slate-500">{app.especialidade}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate font-medium">
                  {app.convenio}
                  {app.plano && (
                    <span className={`font-normal ${app.plano?.toLowerCase() === "particular" ? "text-green-600 font-medium" : "text-slate-400"}`}>
                      {app.plano?.toLowerCase() === "particular" && " ⭐"}({app.plano})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">{app.telefone}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                CPF: {app.cpf}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                Nasc: {formatarDataSeguro(app.dataNasc)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">
                Agendado: {formatarDataSeguro(app.diaQueAgendou)}
                {app.horaAgendou ? ` às ${app.horaAgendou}` : ""}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 3️⃣ min-height fixo + ResizeObserver na VirtualTable

Substitua o `useEffect` atual e o estado `containerHeight` no `VirtualTable`:

```tsx
// ANTES:
const [containerHeight, setContainerHeight] = useState(600);

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  setContainerHeight(el.clientHeight);
  const handleScroll = () => setScrollTop(el.scrollTop);
  el.addEventListener("scroll", handleScroll, { passive: true });
  return () => el.removeEventListener("scroll", handleScroll);
}, []);

// DEPOIS:
const [containerHeight, setContainerHeight] = useState(500); // fallback seguro

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  // ResizeObserver: detecta quando o container realmente tem altura
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const h = entry.contentRect.height;
      if (h > 0) setContainerHeight(h);
    }
  });
  observer.observe(el);

  // Scroll
  const handleScroll = () => setScrollTop(el.scrollTop);
  el.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    observer.disconnect();
    el.removeEventListener("scroll", handleScroll);
  };
}, []); // roda uma vez, o ResizeObserver cuida do resto
```

E adicione `style={{ minHeight: 500 }}` no container de scroll:

```tsx
// Troque:
<div ref={containerRef} className="overflow-auto" style={{ height: "calc(100vh - 320px)" }}>

// Por:
<div
  ref={containerRef}
  className="overflow-auto"
  style={{ height: "calc(100vh - 320px)", minHeight: 500 }}
>
```

---

## 4️⃣ formatarDataSeguro — protege contra datas inválidas

Cole esta função **antes** do componente `VirtualTable` (ou em um arquivo `src/utils/dates.ts`):

```tsx
// src/utils/dates.ts  (ou direto no App.tsx antes dos componentes)
import { format, parseISO, isValid } from "date-fns";

export function formatarDataSeguro(dataStr: string | undefined | null): string {
  try {
    if (!dataStr || dataStr.trim() === "" || dataStr === "0001-01-01") return "-";
    const d = parseISO(dataStr);
    if (!isValid(d)) return "-";
    return format(d, "dd/MM/yyyy");
  } catch {
    return "-";
  }
}
```

Agora substitua **todos** os `format(parseISO(...), "dd/MM/yyyy")` no código por `formatarDataSeguro(...)`:

```tsx
// Antes (VirtualTable — linha da tabela):
{app.dataAgendada ? format(parseISO(app.dataAgendada), "dd/MM/yyyy") : "-"}
{app.dataNasc ? format(parseISO(app.dataNasc), "dd/MM/yyyy") : "-"}
{app.diaQueAgendou ? format(parseISO(app.diaQueAgendou), "dd/MM/yyyy") : "-"}

// Depois:
{formatarDataSeguro(app.dataAgendada)}
{formatarDataSeguro(app.dataNasc)}
{formatarDataSeguro(app.diaQueAgendou)}
```

---

## 5️⃣ table-layout: fixed com colgroup sincronizado

Substitua toda a estrutura do `return` do `VirtualTable` por esta versão com as duas tabelas sincronizadas:

```tsx
// Larguras fixas para cada coluna — ajuste conforme necessário
const COL_WIDTHS = [110, 75, 160, 105, 115, 105, 135, 145, 135, 115, 150, 95, 80];

const Colgroup = () => (
  <colgroup>
    {COL_WIDTHS.map((w, i) => (
      <col key={i} style={{ width: w }} />
    ))}
  </colgroup>
);

return (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
       style={{ height: "calc(100vh - 320px)", minHeight: 500 }}>

    {/* ── Header fixo ── */}
    <div className="overflow-x-hidden shrink-0 border-b border-slate-200">
      <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
        <Colgroup />
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("data")}>
              <div className="flex items-center">Data Agendada<SortIcon column="data" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("horario")}>
              <div className="flex items-center">Horário<SortIcon column="horario" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("nome")}>
              <div className="flex items-center">Nome<SortIcon column="nome" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("telefone")}>
              <div className="flex items-center">Telefone<SortIcon column="telefone" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("cpf")}>
              <div className="flex items-center">CPF<SortIcon column="cpf" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("dataNasc")}>
              <div className="flex items-center">Data Nasc<SortIcon column="dataNasc" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("especialidade")}>
              <div className="flex items-center">Especialidade<SortIcon column="especialidade" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("medico")}>
              <div className="flex items-center">Médico<SortIcon column="medico" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("convenio")}>
              <div className="flex items-center">Convênio<SortIcon column="convenio" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("plano")}>
              <div className="flex items-center">Plano<SortIcon column="plano" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("diaQueAgendou")}>
              <div className="flex items-center">Dia Agendou<SortIcon column="diaQueAgendou" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("retorno")}>
              <div className="flex items-center">Retorno<SortIcon column="retorno" /></div>
            </th>
            <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Conferido
            </th>
          </tr>
        </thead>
      </table>
    </div>

    {/* ── Corpo virtualizado com scroll ── */}
    <div
      ref={containerRef}
      className="overflow-auto flex-1"
      style={{ minHeight: 500 }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <table
          className="w-full text-left border-collapse"
          style={{ tableLayout: "fixed", position: "absolute", top: offsetY, width: "100%" }}
        >
          <Colgroup />
          <tbody className="divide-y divide-slate-100">
            {visibleItems.map((app) => {
              const isRemarcar = app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR");
              const isParticular = app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular";
              return (
                <tr
                  key={app.id}
                  style={{ height: ROW_HEIGHT }}
                  className={`transition-colors ${
                    isRemarcar
                      ? "bg-red-100 hover:bg-red-200"
                      : isParticular
                      ? "bg-green-100 hover:bg-green-200"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{formatarDataSeguro(app.dataAgendada)}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-red-600 truncate">{app.horario || "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-800 truncate">{app.nome}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.telefone}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.cpf}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{formatarDataSeguro(app.dataNasc)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.especialidade}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.medico}</td>
                  <td className={`px-3 py-2.5 text-xs font-medium truncate ${app.convenio?.toLowerCase() === "particular" ? "text-green-600" : "text-slate-600"}`}>
                    {app.convenio?.toLowerCase() === "particular" && <span className="mr-1">⭐</span>}
                    {app.convenio}
                  </td>
                  <td className={`px-3 py-2.5 text-xs font-medium truncate ${app.plano?.toLowerCase() === "particular" ? "text-green-600" : "text-slate-600"}`}>
                    {app.plano?.toLowerCase() === "particular" && <span className="mr-1">⭐</span>}
                    {app.plano}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate">
                    {formatarDataSeguro(app.diaQueAgendou)}
                    {app.horaAgendou ? ` às ${app.horaAgendou}` : ""}
                  </td>
                  <td className={`px-3 py-2.5 text-xs font-medium truncate ${
                    app.retorno === "A realizar" ? "text-red-600"
                    : app.retorno === "≤ 15 dias" ? "text-green-600"
                    : app.retorno === "≤ 30 dias" ? "text-yellow-600"
                    : app.retorno === "Fora" ? "text-red-800"
                    : "text-slate-400"
                  }`}>
                    {app.retorno || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={app.conferido}
                        onCheckedChange={() => onToggle(app.id, app.conferido)}
                        className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* ── Rodapé ── */}
    <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 shrink-0">
      {appointments.length} registros
    </div>
  </div>
);
```

---

## ✅ Checklist de aplicação

- [ ] 1. Criar `src/components/ErrorBoundary.tsx` e envolver o histórico
- [ ] 2. Substituir o bloco `AnimatePresence` por versão condicional + extrair `AppCard`
- [ ] 3. Trocar o `useEffect` do `VirtualTable` pelo com `ResizeObserver`
- [ ] 4. Criar `formatarDataSeguro` e substituir todos os `format(parseISO(...))`
- [ ] 5. Substituir o `return` do `VirtualTable` pela versão com `Colgroup` sincronizado

**Ordem recomendada:** aplique o item 1 primeiro. Ele vai te mostrar no navegador qual dos outros problemas está causando o erro exato, antes mesmo de corrigir todos.
