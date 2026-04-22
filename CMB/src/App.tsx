import { useState, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchData, updateStatus } from "./services/api";
import { Appointment } from "./types";
import { format, parseISO, isValid } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, User, CreditCard, Stethoscope, RefreshCcw, LayoutGrid, List, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import Login from "./Login";
import { ErrorBoundary } from "../components/ErrorBoundary";

// ✅ CORREÇÃO 4 — Proteção contra datas inválidas
function formatarDataSeguro(dataStr: string | undefined | null): string {
  try {
    if (!dataStr || dataStr.trim() === "" || dataStr === "0001-01-01") return "-";
    const d = parseISO(dataStr);
    if (!isValid(d)) return "-";
    return format(d, "dd/MM/yyyy");
  } catch {
    return "-";
  }
}

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [pendentes, setPendentes] = useState<Appointment[]>([]);
  const [historico, setHistorico] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterMedico, setFilterMedico] = useState("all");
  const [filterEspecialidade, setFilterEspecialidade] = useState("all");
  const [filterConvenio, setFilterConvenio] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Appointment | "data"; direction: "asc" | "desc" } | null>({ key: "data", direction: "asc" });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleSort = (key: keyof Appointment | "data") => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await fetchData();
      setPendentes(data.pendentes);
      setHistorico(data.historico);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      if (!silent) setError("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleConferido = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const inPendentes = pendentes.find(app => app.id === id);
    const appointment = inPendentes || historico.find(app => app.id === id);
    if (!appointment) return;
    if (inPendentes) {
      setPendentes(prev => prev.filter(app => app.id !== id));
      setHistorico(prev => [...prev, { ...appointment, conferido: newStatus }]);
    } else {
      setHistorico(prev => prev.filter(app => app.id !== id));
      setPendentes(prev => [...prev, { ...appointment, conferido: newStatus }]);
    }
    const success = await updateStatus(appointment.realId || appointment.id.split("-")[0], newStatus);
    if (!success) loadData(true);
  };

  const allAppointments = useMemo(() => [...pendentes, ...historico], [pendentes, historico]);
  const uniqueFilters = useMemo(() => ({
    medicos: Array.from(new Set(allAppointments.map(a => a.medico))).filter(Boolean).sort(),
    especialidades: Array.from(new Set(allAppointments.map(a => a.especialidade))).filter(Boolean).sort(),
    convenios: Array.from(new Set(allAppointments.map(a => a.convenio))).filter(Boolean).sort(),
  }), [allAppointments]);

  const filterList = (list: Appointment[]) => list.filter(app => {
    if (debouncedSearch && !app.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) && !app.cpf.includes(debouncedSearch)) return false;
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

  const pendingAppointments = useMemo(
    () => sortList(filterList(pendentes)),
    [pendentes, debouncedSearch, filterMedico, filterEspecialidade, filterConvenio, sortConfig]
  );
  const historyAppointments = useMemo(
    () => sortList(filterList(historico)),
    [historico, debouncedSearch, filterMedico, filterEspecialidade, filterConvenio, sortConfig]
  );

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
              <Button variant="ghost" size="sm" onClick={() => setViewMode("card")} className={`px-3 py-1 h-8 rounded-md transition-all ${viewMode === "card" ? "bg-white shadow-sm text-red-600" : "text-slate-500"}`}><LayoutGrid className="w-4 h-4 mr-2" />Cards</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMode("list")} className={`px-3 py-1 h-8 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-red-600" : "text-slate-500"}`}><List className="w-4 h-4 mr-2" />Lista</Button>
            </div>
            <div className="flex items-center gap-2">
              {isRefreshing && <RefreshCcw className="w-4 h-4 text-red-600 animate-spin" />}
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">{isRefreshing ? "Atualizando..." : "Sincronizado"}</span>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-full mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <RefreshCcw className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadData()} className="ml-auto bg-white border-red-200 text-red-700 hover:bg-red-50">Tentar Novamente</Button>
          </div>
        )}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por nome ou CPF..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" value={filterMedico} onChange={(e) => setFilterMedico(e.target.value)}>
                  <option value="all">Todos os Médicos</option>
                  {uniqueFilters.medicos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" value={filterEspecialidade} onChange={(e) => setFilterEspecialidade(e.target.value)}>
                <option value="all">Todas Especialidades</option>
                {uniqueFilters.especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" value={filterConvenio} onChange={(e) => setFilterConvenio(e.target.value)}>
                <option value="all">Todos Convênios</option>
                {uniqueFilters.convenios.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(searchTerm || filterMedico !== "all" || filterEspecialidade !== "all" || filterConvenio !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setDebouncedSearch(""); setFilterMedico("all"); setFilterEspecialidade("all"); setFilterConvenio("all"); }} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-3">Limpar Filtros</Button>
              )}
            </div>
          </div>
        </div>
        <Tabs defaultValue="pending" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-200/50 p-1 rounded-xl max-w-4xl mx-auto">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all py-2.5">Pendentes<Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">{pendingAppointments.length}</Badge></TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all py-2.5">Histórico<Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">{historyAppointments.length}</Badge></TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-0">
            <AppointmentList appointments={pendingAppointments} loading={loading} onToggle={handleToggleConferido} emptyMessage="Nenhum agendamento pendente." viewMode={viewMode} sortConfig={sortConfig} onSort={handleSort} />
          </TabsContent>
          {/* ✅ CORREÇÃO 1 — ErrorBoundary no histórico */}
          <TabsContent value="history" className="mt-0">
            <ErrorBoundary>
              <AppointmentList appointments={historyAppointments} loading={loading} onToggle={handleToggleConferido} emptyMessage="O histórico está vazio." viewMode={viewMode} sortConfig={sortConfig} onSort={handleSort} />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface ListProps {
  appointments: Appointment[];
  loading: boolean;
  onToggle: (id: string, status: boolean) => void;
  emptyMessage: string;
  viewMode: "card" | "list";
  sortConfig: { key: keyof Appointment | "data"; direction: "asc" | "desc" } | null;
  onSort: (key: keyof Appointment | "data") => void;
}

const ROW_HEIGHT = 37;
const OVERSCAN = 15;

// ✅ CORREÇÃO 5 — Larguras fixas sincronizadas entre header e corpo
const COL_WIDTHS = [110, 75, 160, 105, 115, 105, 135, 145, 135, 115, 150, 95, 80];
const Colgroup = () => (
  <colgroup>
    {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
  </colgroup>
);

function VirtualTable({ appointments, onToggle, sortConfig, onSort }: {
  appointments: Appointment[];
  onToggle: (id: string, status: boolean) => void;
  sortConfig: { key: keyof Appointment | "data"; direction: "asc" | "desc" } | null;
  onSort: (key: keyof Appointment | "data") => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  // ✅ CORREÇÃO 3 — ResizeObserver para detectar altura real do container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (h > 0) setContainerHeight(h);
      }
    });
    observer.observe(el);

    const handleScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const totalHeight = appointments.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(appointments.length, startIndex + visibleCount);
  const visibleItems = appointments.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const SortIcon = ({ column }: { column: keyof Appointment | "data" }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 text-slate-500" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-slate-500" /> : <ArrowDown className="w-3 h-3 ml-1 text-slate-500" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 320px)", minHeight: 500 }}>

      {/* ✅ CORREÇÃO 5 — Header com Colgroup sincronizado */}
      <div className="overflow-x-hidden shrink-0 border-b border-slate-200">
        <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
          <Colgroup />
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("data")}><div className="flex items-center">Data Agendada<SortIcon column="data" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("horario")}><div className="flex items-center">Horário<SortIcon column="horario" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("nome")}><div className="flex items-center">Nome<SortIcon column="nome" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("telefone")}><div className="flex items-center">Telefone<SortIcon column="telefone" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("cpf")}><div className="flex items-center">CPF<SortIcon column="cpf" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("dataNasc")}><div className="flex items-center">Data Nasc<SortIcon column="dataNasc" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("especialidade")}><div className="flex items-center">Especialidade<SortIcon column="especialidade" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("medico")}><div className="flex items-center">Médico<SortIcon column="medico" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("convenio")}><div className="flex items-center">Convênio<SortIcon column="convenio" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("plano")}><div className="flex items-center">Plano<SortIcon column="plano" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("diaQueAgendou")}><div className="flex items-center">Dia Agendou<SortIcon column="diaQueAgendou" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => onSort("retorno")}><div className="flex items-center">Retorno<SortIcon column="retorno" /></div></th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Conferido</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ✅ CORREÇÃO 3 — Corpo com minHeight e ResizeObserver */}
      <div ref={containerRef} className="overflow-auto flex-1" style={{ minHeight: 500 }}>
        <div style={{ height: totalHeight, position: "relative" }}>
          <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed", position: "absolute", top: offsetY, width: "100%" }}>
            <Colgroup />
            <tbody className="divide-y divide-slate-100">
              {visibleItems.map((app) => {
                const isRemarcar = app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR");
                const isParticular = app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular";
                return (
                  <tr key={app.id} style={{ height: ROW_HEIGHT }} className={`transition-colors ${isRemarcar ? "bg-red-100 hover:bg-red-200" : isParticular ? "bg-green-100 hover:bg-green-200" : "hover:bg-slate-50/50"}`}>
                    {/* ✅ CORREÇÃO 4 — formatarDataSeguro em todas as datas */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{formatarDataSeguro(app.dataAgendada)}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-red-600 truncate">{app.horario || "-"}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-800 truncate">{app.nome}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.telefone}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.cpf}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{formatarDataSeguro(app.dataNasc)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.especialidade}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{app.medico}</td>
                    <td className={`px-3 py-2.5 text-xs font-medium truncate ${app.convenio?.toLowerCase() === "particular" ? "text-green-600" : "text-slate-600"}`}>{app.convenio?.toLowerCase() === "particular" && <span className="mr-1">⭐</span>}{app.convenio}</td>
                    <td className={`px-3 py-2.5 text-xs font-medium truncate ${app.plano?.toLowerCase() === "particular" ? "text-green-600" : "text-slate-600"}`}>{app.plano?.toLowerCase() === "particular" && <span className="mr-1">⭐</span>}{app.plano}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 truncate">{formatarDataSeguro(app.diaQueAgendou)}{app.horaAgendou ? ` às ${app.horaAgendou}` : ""}</td>
                    <td className={`px-3 py-2.5 text-xs font-medium truncate ${app.retorno === "A realizar" ? "text-red-600" : app.retorno === "≤ 15 dias" ? "text-green-600" : app.retorno === "≤ 30 dias" ? "text-yellow-600" : app.retorno === "Fora" ? "text-red-800" : "text-slate-400"}`}>{app.retorno || "-"}</td>
                    <td className="px-3 py-2.5 text-sm text-center"><div className="flex justify-center"><Checkbox checked={app.conferido} onCheckedChange={() => onToggle(app.id, app.conferido)} className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 shrink-0">
        {appointments.length} registros
      </div>
    </div>
  );
}

function AppointmentList({ appointments, loading, onToggle, emptyMessage, viewMode, sortConfig, onSort }: ListProps) {
  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4].map(i => (
        <Card key={i} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-2 flex-1"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-1/2" /></div>
            <Skeleton className="h-6 w-6 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (appointments.length === 0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
      <p className="text-slate-400 font-medium">{emptyMessage}</p>
    </div>
  );

  if (viewMode === "list") {
    return <VirtualTable appointments={appointments} onToggle={onToggle} sortConfig={sortConfig} onSort={onSort} />;
  }

  // ✅ CORREÇÃO 2 — Sem animação para listas grandes, remove o slice(0,100)
  const usarAnimacao = appointments.length <= 150;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {usarAnimacao ? (
        <AnimatePresence mode="popLayout">
          {appointments.map((app, index) => (
            <motion.div key={`${app.id}-${index}`} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
              <Card className={`border-none shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col ${app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR") ? "bg-red-100" : app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular" ? "bg-green-100" : ""}`}>
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
                        <span className="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded"><Calendar className="w-3.5 h-3.5" />{formatarDataSeguro(app.dataAgendada)}</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2 text-slate-600 text-xs"><Stethoscope className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><div className="flex flex-col"><span className="font-bold text-slate-700">{app.medico}</span><span className="text-slate-500">{app.especialidade}</span></div></div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs"><CreditCard className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate font-medium">{app.convenio} {app.plano && <span className={`font-normal ${app.plano?.toLowerCase() === "particular" ? "text-green-600 font-medium" : "text-slate-400"}`}>{app.plano?.toLowerCase() === "particular" && " ⭐"}({app.plano})</span>}</span></div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs"><User className="w-4 h-4 text-slate-400 shrink-0" /><span className="font-medium">{app.telefone}</span></div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">CPF: {app.cpf}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">Nasc: {formatarDataSeguro(app.dataNasc)}</span>
                      </div>
                      <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-medium">Agendado: {formatarDataSeguro(app.diaQueAgendou)}{app.horaAgendou ? ` às ${app.horaAgendou}` : ""}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      ) : (
        appointments.map((app, index) => (
          <div key={`${app.id}-${index}`}>
            <Card className={`border-none shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col ${app.convenio?.includes("REMARCAR / CANCELAR") || app.plano?.includes("REMARCAR / CANCELAR") ? "bg-red-100" : app.convenio?.toLowerCase() === "particular" || app.plano?.toLowerCase() === "particular" ? "bg-green-100" : ""}`}>
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
                      <span className="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded"><Calendar className="w-3.5 h-3.5" />{formatarDataSeguro(app.dataAgendada)}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2 text-slate-600 text-xs"><Stethoscope className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><div className="flex flex-col"><span className="font-bold text-slate-700">{app.medico}</span><span className="text-slate-500">{app.especialidade}</span></div></div>
                      <div className="flex items-center gap-2 text-slate-600 text-xs"><CreditCard className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate font-medium">{app.convenio} {app.plano && <span className={`font-normal ${app.plano?.toLowerCase() === "particular" ? "text-green-600 font-medium" : "text-slate-400"}`}>{app.plano?.toLowerCase() === "particular" && " ⭐"}({app.plano})</span>}</span></div>
                      <div className="flex items-center gap-2 text-slate-600 text-xs"><User className="w-4 h-4 text-slate-400 shrink-0" /><span className="font-medium">{app.telefone}</span></div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">CPF: {app.cpf}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">Nasc: {formatarDataSeguro(app.dataNasc)}</span>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-medium">Agendado: {formatarDataSeguro(app.diaQueAgendou)}{app.horaAgendou ? ` às ${app.horaAgendou}` : ""}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
