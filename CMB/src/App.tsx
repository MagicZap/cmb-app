import { useState, useEffect, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPage, updateStatus } from "./services/api";
import { Appointment } from "./types";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, User, CreditCard, Stethoscope, RefreshCcw, LayoutGrid, List, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import Login from "./Login";

// ─── Hook: gerencia uma aba com paginação server-side ────────────────────────
function useTabData(aba: "pendentes" | "historico", debouncedSearch: string) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMore = items.length < total;

  // Carrega página 1 sempre que busca mudar
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setPage(1);
    fetchPage(aba, 1, 50, debouncedSearch)
      .then(res => {
        if (cancelled) return;
        setItems(res.registros);
        setTotal(res.total);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar dados.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [aba, debouncedSearch]);

  // Carrega próxima página
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    fetchPage(aba, nextPage, 50, debouncedSearch)
      .then(res => {
        setItems(prev => [...prev, ...res.registros]);
        setTotal(res.total);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [aba, page, debouncedSearch, loadingMore, hasMore]);

  // Refresh silencioso — recarrega só a página 1 e atualiza total
  const refresh = useCallback(() => {
    fetchPage(aba, 1, 50, debouncedSearch)
      .then(res => {
        setItems(res.registros);
        setTotal(res.total);
        setPage(1);
      })
      .catch(() => {});
  }, [aba, debouncedSearch]);

  return { items, total, loading, loadingMore, hasMore, error, loadMore, refresh };
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterMedico, setFilterMedico] = useState("all");
  const [filterEspecialidade, setFilterEspecialidade] = useState("all");
  const [filterConvenio, setFilterConvenio] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Appointment | "data"; direction: "asc" | "desc" } | null>({ key: "data", direction: "asc" });

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const pendentesData = useTabData("pendentes", debouncedSearch);
  const historicoData = useTabData("historico", debouncedSearch);

  // Refresh a cada 10s na aba ativa
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      const data = activeTab === "pending" ? pendentesData : historicoData;
      data.refresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleToggleConferido = async (id: string, currentStatus: boolean, aba: "pendentes" | "historico") => {
    const newStatus = !currentStatus;
    const source = aba === "pendentes" ? pendentesData : historicoData;
    const appointment = source.items.find(a => a.id === id);
    if (!appointment) return;
    await updateStatus(appointment.realId || appointment.id.split("-")[0], newStatus);
    // Recarrega ambas as abas para refletir a mudança
    pendentesData.refresh();
    historicoData.refresh();
  };

  // Filtros client-side (médico, especialidade, convênio) aplicados sobre o que já veio do servidor
  const applyFilters = (list: Appointment[]) => list.filter(app => {
    if (filterMedico !== "all" && app.medico !== filterMedico) return false;
    if (filterEspecialidade !== "all" && app.especialidade !== filterEspecialidade) return false;
    if (filterConvenio !== "all" && app.convenio !== filterConvenio) return false;
    return true;
  });

  const sortList = (list: Appointment[]) => {
    if (!sortConfig) return list;
    return [...list].sort((a, b) => {
      const key = sortConfig.key === "data" ? "dataAgendada" : sortConfig.key as keyof Appointment;
      const valA = String(a[key] || "").toLowerCase();
      const valB = String(b[key] || "").toLowerCase();
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const pendingFiltered = sortList(applyFilters(pendentesData.items));
  const historyFiltered = sortList(applyFilters(historicoData.items));

  // Unique filter options
  const allItems = [...pendentesData.items, ...historicoData.items];
  const uniqueFilters = {
    medicos: Array.from(new Set(allItems.map(a => a.medico))).filter(Boolean).sort(),
    especialidades: Array.from(new Set(allItems.map(a => a.especialidade))).filter(Boolean).sort(),
    convenios: Array.from(new Set(allItems.map(a => a.convenio))).filter(Boolean).sort(),
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFilterMedico("all");
    setFilterEspecialidade("all");
    setFilterConvenio("all");
  };

  const handleSort = (key: keyof Appointment | "data") => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b-2 border-red-600 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg"><Calendar className="text-white w-6 h-6" /></div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Agendamentos</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setViewMode("card")} className={`flex items-center px-3 py-1 h-8 rounded-md text-sm transition-all ${viewMode === "card" ? "bg-white shadow-sm text-red-600" : "text-slate-500"}`}><LayoutGrid className="w-4 h-4 mr-2" />Cards</button>
              <button onClick={() => setViewMode("list")} className={`flex items-center px-3 py-1 h-8 rounded-md text-sm transition-all ${viewMode === "list" ? "bg-white shadow-sm text-red-600" : "text-slate-500"}`}><List className="w-4 h-4 mr-2" />Lista</button>
            </div>
            <div className="flex items-center gap-2">
              {isRefreshing && <RefreshCcw className="w-4 h-4 text-red-600 animate-spin" />}
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">{isRefreshing ? "Atualizando..." : "Sincronizado"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" value={filterMedico} onChange={e => setFilterMedico(e.target.value)}>
                  <option value="all">Todos os Médicos</option>
                  {uniqueFilters.medicos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" value={filterEspecialidade} onChange={e => setFilterEspecialidade(e.target.value)}>
                <option value="all">Todas Especialidades</option>
                {uniqueFilters.especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" value={filterConvenio} onChange={e => setFilterConvenio(e.target.value)}>
                <option value="all">Todos Convênios</option>
                {uniqueFilters.convenios.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(searchTerm || filterMedico !== "all" || filterEspecialidade !== "all" || filterConvenio !== "all") && (
                <button onClick={handleClearFilters} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-3 rounded-lg text-sm">Limpar Filtros</button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending" onValueChange={v => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-200/50 p-1 rounded-xl max-w-4xl mx-auto">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all py-2.5">
              Pendentes
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">{pendentesData.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all py-2.5">
              Histórico
              <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">{historicoData.total}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-0">
            <AppointmentList
              appointments={pendingFiltered}
              loading={pendentesData.loading}
              loadingMore={pendentesData.loadingMore}
              hasMore={pendentesData.hasMore}
              onLoadMore={pendentesData.loadMore}
              onToggle={(id, status) => handleToggleConferido(id, status, "pendentes")}
              emptyMessage="Nenhum agendamento pendente."
              viewMode={viewMode}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <AppointmentList
              appointments={historyFiltered}
              loading={historicoData.loading}
              loadingMore={historicoData.loadingMore}
              hasMore={historicoData.hasMore}
              onLoadMore={historicoData.loadMore}
              onToggle={(id, status) => handleToggleConferido(id, status, "historico")}
              emptyMessage="O histórico está vazio."
              viewMode={viewMode}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── AppointmentList ──────────────────────────────────────────────────────────
interface ListProps {
  appointments: Appointment[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onToggle: (id: string, status: boolean) => void;
  emptyMessage: string;
  viewMode: "card" | "list";
  sortConfig: { key: keyof Appointment | "data"; direction: "asc" | "desc" } | null;
  onSort: (key: keyof Appointment | "data") => void;
}

function AppointmentList({ appointments, loading, loadingMore, hasMore, onLoadMore, onToggle, emptyMessage, viewMode, sortConfig, onSort }: ListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: quando chega no fim, pede próxima página ao servidor
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        onLoadMore();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  const SortIcon = ({ column }: { column: keyof Appointment | "data" }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 text-slate-500" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-slate-500" /> : <ArrowDown className="w-3 h-3 ml-1 text-slate-500" />;
  };

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 flex gap-4 items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  );

  if (appointments.length === 0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
      <p className="text-slate-400 font-medium">{emptyMessage}</p>
    </div>
  );

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("data")}><div className="flex items-center">Data Agendada<SortIcon column="data" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("horario")}><div className="flex items-center">Horário<SortIcon column="horario" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("nome")}><div className="flex items-center">Nome<SortIcon column="nome" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("telefone")}><div className="flex items-center">Telefone<SortIcon column="telefone" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("cpf")}><div className="flex items-center">CPF<SortIcon column="cpf" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("dataNasc")}><div className="flex items-center">Data Nasc<SortIcon column="dataNasc" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("especialidade")}><div className="flex items-center">Especialidade<SortIcon column="especialidade" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("medico")}><div className="flex items-center">Médico<SortIcon column="medico" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("convenio")}><div className="flex items-center">Convênio<SortIcon column="convenio" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("plano")}><div className="flex items-center">Plano<SortIcon column="plano" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("diaQueAgendou")}><div className="flex items-center">Dia Agendou<SortIcon column="diaQueAgendou" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => onSort("retorno")}><div className="flex items-center">Retorno<SortIcon column="retorno" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Conferido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map((app, index) => {
              const isRemarcar = app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR");
              const isParticular = app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular";
              return (
                <tr key={`${app.id}-${index}`} className={`transition-colors ${isRemarcar ? "bg-red-100 hover:bg-red-200" : isParticular ? "bg-green-100 hover:bg-green-200" : "hover:bg-slate-50/50"}`}>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.dataAgendada ? format(parseISO(app.dataAgendada), "dd/MM/yyyy") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-red-600 whitespace-nowrap">{app.horario || "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-800 min-w-[150px]">{app.nome}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.telefone}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.cpf}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.dataNasc ? format(parseISO(app.dataNasc), "dd/MM/yyyy") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{app.especialidade}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{app.medico}</td>
                  <td className={`px-3 py-2.5 text-xs font-medium ${app.convenio?.toLowerCase() === "particular" ? "text-green-600" : "text-slate-600"}`}>{app.convenio?.toLowerCase() === "particular" && <span className="mr-1">⭐</span>}{app.convenio}</td>
                  <td className={`px-3 py-2.5 text-xs font-medium ${app.plano?.toLowerCase() === "particular" ? "text-green-600" : "text-slate-600"}`}>{app.plano?.toLowerCase() === "particular" && <span className="mr-1">⭐</span>}{app.plano}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.diaQueAgendou ? format(parseISO(app.diaQueAgendou), "dd/MM/yyyy") : "-"}{app.horaAgendou ? ` às ${app.horaAgendou}` : ""}</td>
                  <td className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap ${app.retorno === "A realizar" ? "text-red-600" : app.retorno === "≤ 15 dias" ? "text-green-600" : app.retorno === "≤ 30 dias" ? "text-yellow-600" : app.retorno === "Fora" ? "text-red-800" : "text-slate-400"}`}>{app.retorno || "-"}</td>
                  <td className="px-3 py-2.5 text-sm text-center">
                    <div className="flex justify-center">
                      <Checkbox checked={app.conferido} onCheckedChange={() => onToggle(app.id, app.conferido)} className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Sentinel — quando aparecer na tela, busca próxima página no servidor */}
        {hasMore && <div ref={sentinelRef} className="h-10" />}
        {loadingMore && (
          <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCcw className="w-3 h-3 animate-spin" /> Carregando mais...
          </div>
        )}
        {!hasMore && appointments.length >= 50 && (
          <div className="py-3 text-center text-xs text-slate-400">Todos os registros carregados</div>
        )}
      </div>
    );
  }

  // Card view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {appointments.map((app, index) => (
        <AppointmentCard key={`${app.id}-${index}`} app={app} onToggle={onToggle} />
      ))}
      {hasMore && <div ref={sentinelRef} className="col-span-full h-10" />}
      {loadingMore && (
        <div className="col-span-full py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCcw className="w-3 h-3 animate-spin" /> Carregando mais...
        </div>
      )}
    </div>
  );
}

// ─── AppointmentCard ──────────────────────────────────────────────────────────
function AppointmentCard({ app, onToggle }: { app: Appointment; onToggle: (id: string, status: boolean) => void }) {
  const isRemarcar = app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR");
  const isParticular = app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular";

  return (
    <Card className={`border-none shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col ${isRemarcar ? "bg-red-100" : isParticular ? "bg-green-100" : ""}`}>
      <CardContent className="p-0 flex flex-1 items-stretch">
        <div className={`w-1.5 shrink-0 ${app.conferido ? "bg-slate-300" : "bg-red-600"}`} />
        <div className="p-5 flex-1 flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-red-700 transition-colors line-clamp-2">{app.nome}</h3>
              <Checkbox checked={app.conferido} onCheckedChange={() => onToggle(app.id, app.conferido)} className="h-5 w-5 rounded border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 transition-all shrink-0 mt-0.5" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-1 rounded text-xs"><Clock className="w-3.5 h-3.5" />{app.horario}</span>
              <span className="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded"><Calendar className="w-3.5 h-3.5" />{app.dataAgendada ? format(parseISO(app.dataAgendada), "dd/MM/yyyy") : "-"}</span>
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
                <span className="truncate font-medium">{app.convenio}{app.plano && <span className={`font-normal ${app.plano?.toLowerCase() === "particular" ? "text-green-600 font-medium" : "text-slate-400"}`}>{app.plano?.toLowerCase() === "particular" && " ⭐"}({app.plano})</span>}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">{app.telefone}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">CPF: {app.cpf}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">Nasc: {app.dataNasc ? format(parseISO(app.dataNasc), "dd/MM/yyyy") : "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Agendado: {app.diaQueAgendou ? format(parseISO(app.diaQueAgendou), "dd/MM/yyyy") : "-"}{app.horaAgendou ? ` às ${app.horaAgendou}` : ""}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
