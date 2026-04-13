import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchData, updateStatus } from "./services/api";
import { Appointment } from "./types";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, User, CreditCard, Stethoscope, RefreshCcw, LayoutGrid, List, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function App() {
  const [pendentes, setPendentes] = useState<Appointment[]>([]);
  const [historico, setHistorico] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedico, setFilterMedico] = useState("all");
  const [filterEspecialidade, setFilterEspecialidade] = useState("all");
  const [filterConvenio, setFilterConvenio] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Appointment | "data"; direction: "asc" | "desc" } | null>(null);

  const handleSort = (key: keyof Appointment | "data") => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
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
      if (!silent) setError("Não foi possível carregar os dados. Verifique sua conexão ou a URL da planilha.");
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

  // Atualização otimista na UI
  if (inPendentes) {
    setPendentes(prev => prev.filter(app => app.id !== id));
    setHistorico(prev => [...prev, { ...appointment, conferido: newStatus, aba: "Historico" }]);
  } else {
    setHistorico(prev => prev.filter(app => app.id !== id));
    setPendentes(prev => [...prev, { ...appointment, conferido: newStatus, aba: "Agendamentos" }]);
  }

  // Envia para o servidor com a aba correta
  const success = await updateStatus(
    appointment.realId || appointment.id.split("-")[0], 
    newStatus, 
    appointment.aba
  );
  
  if (!success) {
    loadData(true);
  }
};

  const allAppointments = useMemo(() => [...pendentes, ...historico], [pendentes, historico]);

  const uniqueFilters = useMemo(() => {
    return {
      medicos: Array.from(new Set(allAppointments.map(a => a.medico))).filter(Boolean).sort(),
      especialidades: Array.from(new Set(allAppointments.map(a => a.especialidade))).filter(Boolean).sort(),
      convenios: Array.from(new Set(allAppointments.map(a => a.convenio))).filter(Boolean).sort(),
    };
  }, [allAppointments]);

  const filterList = (list: Appointment[]) => {
    return list.filter(app => {
      if (searchTerm && !app.nome.toLowerCase().includes(searchTerm.toLowerCase()) && !app.cpf.includes(searchTerm)) {
        return false;
      }
      if (filterMedico !== "all" && app.medico !== filterMedico) return false;
      if (filterEspecialidade !== "all" && app.especialidade !== filterEspecialidade) return false;
      if (filterConvenio !== "all" && app.convenio !== filterConvenio) return false;
      return true;
    });
  };

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

  const pendingAppointments = useMemo(() => {
    return sortList(filterList(pendentes));
  }, [pendentes, searchTerm, filterMedico, filterEspecialidade, filterConvenio, sortConfig]);

  const historyAppointments = useMemo(() => {
    return sortList(filterList(historico));
  }, [historico, searchTerm, filterMedico, filterEspecialidade, filterConvenio, sortConfig]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calendar className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Agendamentos</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode("card")}
                className={`px-3 py-1 h-8 rounded-md transition-all ${viewMode === "card" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Cards
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 h-8 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isRefreshing && <RefreshCcw className="w-4 h-4 text-blue-500 animate-spin" />}
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">
                {isRefreshing ? "Atualizando..." : "Sincronizado"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <RefreshCcw className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadData()} className="ml-auto bg-white border-red-200 text-red-700 hover:bg-red-50">
              Tentar Novamente
            </Button>
          </div>
        )}
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome ou CPF..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterMedico}
                  onChange={(e) => setFilterMedico(e.target.value)}
                >
                  <option value="all">Todos os Médicos</option>
                  {uniqueFilters.medicos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <select 
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterEspecialidade}
                onChange={(e) => setFilterEspecialidade(e.target.value)}
              >
                <option value="all">Todas Especialidades</option>
                {uniqueFilters.especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select 
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterConvenio}
                onChange={(e) => setFilterConvenio(e.target.value)}
              >
                <option value="all">Todos Convênios</option>
                {uniqueFilters.convenios.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(searchTerm || filterMedico !== "all" || filterEspecialidade !== "all" || filterConvenio !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm("");
                    setFilterMedico("all");
                    setFilterEspecialidade("all");
                    setFilterConvenio("all");
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-9 px-3"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-200/50 p-1 rounded-xl max-w-4xl mx-auto">
            <TabsTrigger 
              value="pending" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all py-2.5"
            >
              Pendentes
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                {pendingAppointments.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all py-2.5"
            >
              Histórico
              <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 hover:bg-slate-100">
                {historyAppointments.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-0 focus-visible:outline-none">
            <AppointmentList 
              appointments={pendingAppointments} 
              loading={loading} 
              onToggle={handleToggleConferido}
              emptyMessage="Nenhum agendamento pendente para o período."
              viewMode={viewMode}
              tab="pending"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0 focus-visible:outline-none">
            <AppointmentList 
              appointments={historyAppointments} 
              loading={loading} 
              onToggle={handleToggleConferido}
              emptyMessage="O histórico está vazio."
              viewMode={viewMode}
              tab="history"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
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
  tab: "pending" | "history";
  sortConfig: { key: keyof Appointment | "data"; direction: "asc" | "desc" } | null;
  onSort: (key: keyof Appointment | "data") => void;
}

function AppointmentList({ appointments, loading, onToggle, emptyMessage, viewMode, tab, sortConfig, onSort }: ListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 w-full">
        <p className="text-slate-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  if (viewMode === "list") {
    const SortIcon = ({ column }: { column: keyof Appointment | "data" }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
      return sortConfig.direction === "asc" ? 
        <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> : 
        <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th 
                className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort("data")}
              >
                <div className="flex items-center">
                  {tab === "pending" ? "Data Agendada" : "Data"}
                  <SortIcon column="data" />
                </div>
              </th>
              <th 
                className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort("nome")}
              >
                <div className="flex items-center">
                  Nome
                  <SortIcon column="nome" />
                </div>
              </th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Telefone</th>
              <th 
                className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort("especialidade")}
              >
                <div className="flex items-center">
                  Especialidade
                  <SortIcon column="especialidade" />
                </div>
              </th>
              <th 
                className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort("medico")}
              >
                <div className="flex items-center">
                  Médico
                  <SortIcon column="medico" />
                </div>
              </th>
              <th 
                className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort("convenio")}
              >
                <div className="flex items-center">
                  Convênio
                  <SortIcon column="convenio" />
                </div>
              </th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plano</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">CPF</th>
              <th 
                className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort("horario")}
              >
                <div className="flex items-center">
                  Horário
                  <SortIcon column="horario" />
                </div>
              </th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data Nasc</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dia Agendou</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">
                {tab === "pending" ? "Conferido" : "Garantia"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map((app, index) => (
              <tr key={`${app.id}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                  {format(parseISO(app.dataAgendada), "dd/MM/yyyy")}
                </td>
                <td className="px-3 py-2.5 text-xs font-bold text-slate-800 min-w-[150px]">{app.nome}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.telefone}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{app.especialidade}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{app.medico}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{app.convenio}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{app.plano}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{app.cpf}</td>
                <td className="px-3 py-2.5 text-xs font-bold text-blue-600 whitespace-nowrap">{app.horario}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                  {app.dataNasc ? format(parseISO(app.dataNasc), "dd/MM/yyyy") : "-"}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                  {app.diaQueAgendou ? format(parseISO(app.diaQueAgendou), "dd/MM/yyyy") : "-"}{app.horaAgendou ? ` às ${app.horaAgendou}` : ""}
                </td>
                <td className="px-3 py-2.5 text-sm text-center">
                  <div className="flex justify-center">
                    <Checkbox 
                      checked={app.conferido}
                      onCheckedChange={() => onToggle(app.id, app.conferido)}
                      className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" : "space-y-4"}>
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
            <Card className={`border-none shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col`}>
              <CardContent className="p-0 flex flex-1 items-stretch">
                <div className={`w-1.5 shrink-0 ${app.conferido ? 'bg-slate-300' : 'bg-blue-500'}`} />
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                        {app.nome}
                      </h3>
                      <Checkbox 
                        checked={app.conferido}
                        onCheckedChange={() => onToggle(app.id, app.conferido)}
                        className="h-5 w-5 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all shrink-0 mt-0.5"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {app.horario}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(parseISO(app.dataAgendada), "dd/MM/yyyy")}
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
                        <span className="truncate font-medium">{app.convenio} {app.plano && <span className="text-slate-400 font-normal">({app.plano})</span>}</span>
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}