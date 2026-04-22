import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setErro("");
    if (usuario === "berrini" && senha === "123456") {
      setLoading(true);
      setTimeout(() => {
        onLogin();
      }, 800);
    } else {
      setErro("Usuário ou senha incorretos.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
      >
        <div className="h-1 w-full bg-red-600" />

        <div className="px-8 py-10 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <img
              src="https://centromedicoberrini.com.br/images/2022/logo.png"
              alt="Centro Médico Berrini"
              className="h-12 object-contain"
            />
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <div className="bg-red-600 p-1.5 rounded-md">
                  <Calendar className="text-white w-4 h-4" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-800">Agendamentos</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Acesso Restrito</p>
            </div>
          </div>

          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuário</label>
              <input
                type="text"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-transparent transition-all"
              />
            </div>

            <AnimatePresence>
              {erro && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                >
                  {erro}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <span>→</span> ENTRAR
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
