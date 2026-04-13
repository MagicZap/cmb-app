export interface Appointment {
  id: string;
  realId?: string;
  nome: string;
  telefone: string;
  especialidade: string;
  medico: string;
  convenio: string;
  plano: string;
  cpf: string;
  dataAgendada: string;
  dataNasc: string;
  diaQueAgendou: string;
  horaAgendou: string;
  horario: string;
  conferido: boolean;
  aba: string;
}