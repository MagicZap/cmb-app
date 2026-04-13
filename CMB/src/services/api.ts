import { Appointment } from "../types";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgb7vn4XR7StiupfdhzVd37ju7Soaelu2fZeqbrmYGV-KxK9Z5YP98t6Rb9dsf1oi80Q/exec";

console.log("SCRIPT_URL:", SCRIPT_URL);

export async function fetchData(): Promise<{ pendentes: Appointment[], historico: Appointment[] }> {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Sem detalhes");
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
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
    if (typeof h === "string" && /^\d{1,2}:\d{2}/.test(h)) {
      return h.substring(0, 5);
    }
    const date = new Date(h);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return String(h);
  })(),
  conferido: item.conferido === true || item.conferido === "true" || item.status === "Conferido",
          aba: item.aba || "Agendamentos"
        };
      }); 
    };

    const pendentes = formatarLista(data.pendentes || []);
    const historico = formatarLista(data.historico || []);

    console.log("PENDENTES:", pendentes.length);
    console.log("HISTORICO:", historico.length);

    return { pendentes, historico };

  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    return { pendentes: [], historico: [] };
  }
}

export async function updateStatus(id: string, status: boolean, aba: string = "Agendamentos"): Promise<boolean> {
  console.log("=== UPDATE STATUS ===");
  console.log("ID:", id, "| Status:", status, "| Aba:", aba);
  
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: Number(id),
        status: status,
        aba: aba
      }),
    });

    console.log("Requisição enviada com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return false;
  }
}