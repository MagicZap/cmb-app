import { Appointment } from "../types";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbziL8YrV89jR_-XqqSitUT-mv_MVkSl88FzygFRIQZ04HkJXAFZg0G0pf0QAredcXricQ/exec";

console.log("SCRIPT_URL:", SCRIPT_URL);

const formatarLista = (lista: any[]) => {
  return lista.map((item: any, index: number) => {
    const baseId = item.id || item.ID || index;
    const uniqueId = `${baseId}-${index}`;
    return {
      id: uniqueId,
      realId: String(item.id || item.ID || index + 1),
      nome: item.nome || item.Nome || "",
      telefone: item.telefone || item.Telefone || "",
      especialidade: item.especialidade || item.Especialidade || "",
      medico: item.medico || item.Medico || "",
      convenio: item.convenio || item.Convenio || "",
      plano: item.plano || item.Plano || "",
      cpf: item.cpf || item.CPF || "",
      dataAgendada: (item.dataAgendada || item.data_agendada || item.DataAgendada || "").toString().split("T")[0],
      dataNasc: (item.dataNasc || item.data_nasc || item.DataNasc || "").toString().split("T")[0],
      diaQueAgendou: (() => {
        const raw = item.diaQueAgendou || item.diaAgendou || item.dia_agendou || "";
        const str = raw.toString().split("T")[0];
        return str.split(" ")[0];
      })(),
      horaAgendou: item.horaAgendou || "",
      horario: (() => {
        const h = item.horario;
        if (!h) return "";
        if (typeof h === "string" && /^\d{1,2}:\d{2}/.test(h)) return h.substring(0, 5);
        const date = new Date(h);
        if (!isNaN(date.getTime())) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return String(h);
      })(),
      conferido: item.conferido === true || item.conferido === "true" || item.status === "Conferido",
      aba: item.aba || "Agendamentos",
      retorno: item.retorno || ""
    };
  });
};

export async function fetchPage(
  aba: "pendentes" | "historico",
  pagina: number = 1,
  limite: number = 50,
  busca: string = ""
): Promise<{ registros: Appointment[]; total: number; totalPaginas: number }> {
  const params = new URLSearchParams({
    aba,
    pagina: String(pagina),
    limite: String(limite),
    ...(busca ? { busca } : {}),
  });

  // redirect: "follow" garante que os parâmetros não se percam no redirecionamento do Google
  const response = await fetch(`${SCRIPT_URL}?${params}`, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`);
  }

  const data = await response.json();

  console.log(`[fetchPage] aba=${aba} pagina=${pagina} total=${data.total} registros=${data.registros?.length}`);

  return {
    registros: formatarLista(data.registros || []),
    total: data.total || 0,
    totalPaginas: data.totalPaginas || 1,
  };
}

export async function updateStatus(id: string, status: boolean, aba: string = "Agendamentos"): Promise<boolean> {
  console.log("=== UPDATE STATUS ===", "ID:", id, "Status:", status);
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id), status, aba }),
    });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return false;
  }
}
