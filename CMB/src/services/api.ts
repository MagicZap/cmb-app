import { Appointment } from "../types";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbziL8YrV89jR_-XqqSitUT-mv_MVkSl88FzygFRIQZ04HkJXAFZg0G0pf0QAredcXricQ/exec";

interface ApiResponse {
  pendentes: ApiAppointment[];
  historico: ApiAppointment[];
}

interface ApiAppointment {
  id: number | string;
  dataAgendada: string;
  nome: string;
  telefone: string;
  especialidade: string;
  medico: string;
  convenio: string;
  plano: string;
  cpf: string;
  horario: string;
  dataNasc: string;
  diaAgendou: string;
  horaAgendou: string;
  conferido: boolean;
  retorno: string;
}

function formatarLista(lista: ApiAppointment[], aba: string): Appointment[] {
  return lista.map((item, index) => ({
    id: `${item.id}-${aba}-${index}`,
    realId: String(item.id),
    nome: item.nome || "",
    telefone: item.telefone || "",
    especialidade: item.especialidade || "",
    medico: item.medico || "",
    convenio: item.convenio || "",
    plano: item.plano || "",
    cpf: item.cpf || "",
    dataAgendada: item.dataAgendada || "",
    dataNasc: item.dataNasc || "",
    diaQueAgendou: item.diaAgendou || "",
    horaAgendou: item.horaAgendou || "",
    horario: item.horario || "",
    conferido: item.conferido || false,
    aba: aba,
    retorno: item.retorno || "",
  }));
}

export async function fetchData(): Promise<{ pendentes: Appointment[]; historico: Appointment[] }> {
  const response = await fetch(SCRIPT_URL);
  if (!response.ok) throw new Error("Erro ao buscar dados");
  const data: ApiResponse = await response.json();
  return {
    pendentes: formatarLista(data.pendentes, "pendentes"),
    historico: formatarLista(data.historico, "historico"),
  };
}

export async function updateStatus(id: string, status: boolean): Promise<boolean> {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return false;
  }
}
