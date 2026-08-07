import React, { useState, useEffect } from "react";
import { getDiarioAtual, salvarDiario, getDiariosPorData, getUserProfile } from "../services/api";
import { getUsuario } from "../services/auth";
import brasaoParana from "../assets/brasao_parana.png";
import brasaoPM from "../assets/brasao.png";

export default function DiarioServicoView() {
  const [diario, setDiario] = useState(null);
  const [alteracoesText, setAlteracoesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(""); // "", "salvando", "salvo", "erro"
  const [operadorNome, setOperadorNome] = useState("");
  const [operadorPatente, setOperadorPatente] = useState("");
  const [erro, setErro] = useState(null);

  // Consulta histórica
  const [dataConsulta, setDataConsulta] = useState("");
  const [diariosConsultados, setDiariosConsultados] = useState([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [itemParaImprimir, setItemParaImprimir] = useState(null);

  // Carregar dados iniciais (diário atual e operador)
  useEffect(() => {
    async function initData() {
      setLoading(true);
      setErro(null);
      try {
        // Obter diário atual
        const data = await getDiarioAtual();
        setDiario(data);
        setAlteracoesText(data.alteracoes || "");

        // Obter nome formatado do operador
        let nome = "";
        let patente = "";
        try {
          const perfil = await getUserProfile();
          nome = perfil.full_name || perfil.username || "OPERADOR";
        } catch {
          const usuario = getUsuario();
          nome = usuario?.username?.toUpperCase() || "OPERADOR";
        }

        const userLocal = getUsuario();
        const usernameParts = (userLocal?.username || "").split("_");
        if (usernameParts.length >= 2 && nome === (userLocal?.username || "").toUpperCase()) {
          patente = usernameParts[0].toUpperCase() + ".";
          nome = usernameParts.slice(1).join(" ").toUpperCase();
        } else {
          nome = nome.toUpperCase();
        }
        setOperadorNome(nome);
        setOperadorPatente(patente);
      } catch (err) {
        console.error(err);
        setErro("Erro ao inicializar página de diário. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Autosave com debounce de 1.5s
  useEffect(() => {
    if (!diario) return;

    // Se o texto é idêntico ao já salvo no estado local da API, ignora
    if (alteracoesText === diario.alteracoes) {
      return;
    }

    setSavingStatus("salvando");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const updated = await salvarDiario(diario.id, alteracoesText);
        setDiario(updated);
        setSavingStatus("salvo");
        // Limpa o indicador de sucesso após 3 segundos
        setTimeout(() => setSavingStatus(""), 3000);
      } catch (err) {
        console.error(err);
        setSavingStatus("erro");
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [alteracoesText]);

  // Função para salvar manualmente (backup)
  const handleSalvarManual = async () => {
    if (!diario) return;
    setSavingStatus("salvando");
    try {
      const updated = await salvarDiario(diario.id, alteracoesText);
      setDiario(updated);
      setSavingStatus("salvo");
      setTimeout(() => setSavingStatus(""), 3000);
    } catch (err) {
      console.error(err);
      setSavingStatus("erro");
    }
  };

  // Buscar diários históricos
  const handleBuscarHistorico = async (e) => {
    e.preventDefault();
    if (!dataConsulta) return;
    setLoadingConsulta(true);
    try {
      const resultados = await getDiariosPorData(dataConsulta);
      setDiariosConsultados(resultados);
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar histórico.");
    } finally {
      setLoadingConsulta(false);
    }
  };

  // Formatação amigável de datas
  const formatarDataHora = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${d}/${m}/${y} às ${h}h${min}`;
    } catch (e) {
      return isoString;
    }
  };

  // Impressão
  const handleImprimir = (item) => {
    setItemParaImprimir(item);
    // Pequeno delay para garantir que o DOM de impressão renderizou com as informações corretas
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "70vh", flexDirection: "column", gap: "10px" }}>
        <span className="spinner" style={{ width: "40px", height: "40px" }}></span>
        <p style={{ color: "#64748b", fontWeight: "600" }}>Carregando diário de serviço...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px", paddingBottom: "80px" }}>
      {/* Estilos para impressão local A4 */}
      <style>{`
        @media print {
          /* Oculta a barra lateral, menu de navegação e controles */
          .sidebar, .no-print {
            display: none !important;
          }
          
          /* Reseta o layout do app e do container principal */
          .app-layout {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
            position: static !important;
          }
          
          /* Oculta tudo que estiver dentro da main-content exceto a folha de impressão */
          .main-content > *:not(.printable-sheet) {
            display: none !important;
          }
          
          /* Configura as margens físicas da página A4 no padrão do ofício (ABNT: Sup/Esq 3cm, Inf/Dir 2cm) */
          @page {
            size: A4;
            margin: 30mm 20mm 20mm 30mm;
          }
          
          .printable-sheet {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            font-family: "Arial", "Helvetica", sans-serif !important;
            font-size: 12pt !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>

      {/* ────────────────────────────────────────────────────────────────────────
          1. FORMULÁRIO PRINCIPAL E DIÁRIO ATUAL (NO-PRINT)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "700" }}>📒 DIÁRIO DE SERVIÇO</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Registro de ocorrências e jornada de trabalho dos operadores do cartório.
            </p>
          </div>
        </div>

        {erro && (
          <div style={{ marginBottom: "15px", padding: "12px 15px", background: "#fef2f2", color: "#b91c1c", borderRadius: "6px", border: "1px solid #fca5a5", fontSize: "13px", fontWeight: "600" }}>
            ⚠️ {erro}
          </div>
        )}

        <div className="card" style={{ position: "relative" }}>
          {/* Cabeçalho do Diário com Brasões Oficiais */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #cbd5e1", paddingBottom: "15px", marginBottom: "20px" }}>
            <img src={brasaoParana} alt="Brasão Paraná" style={{ height: "65px", width: "auto" }} />
            <div style={{ textAlign: "center", flex: 1, padding: "0 10px" }}>
              <h4 style={{ margin: "2px 0", fontSize: "12px", fontWeight: "700", color: "#334155", letterSpacing: "0.5px" }}>ESTADO DO PARANÁ</h4>
              <h4 style={{ margin: "2px 0", fontSize: "12px", fontWeight: "700", color: "#334155", letterSpacing: "0.5px" }}>POLÍCIA MILITAR</h4>
              <h5 style={{ margin: "2px 0", fontSize: "11px", fontWeight: "600", color: "#475569" }}>5º COMANDO REGIONAL</h5>
              <h5 style={{ margin: "2px 0", fontSize: "11px", fontWeight: "600", color: "#475569" }}>SEXTO BATALHÃO DE POLÍCIA MILITAR</h5>
              <h6 style={{ margin: "2px 0", fontSize: "10px", fontWeight: "600", color: "#64748b" }}>PRIMEIRO CARTORIO - TCIP</h6>
            </div>
            <img src={brasaoPM} alt="Brasão PMPR" style={{ height: "65px", width: "auto" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "20px", background: "#f8fafc", padding: "12px 15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>JORNADA DE TRABALHO</span>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
                📅 {formatarDataHora(diario?.data_inicio)} às {formatarDataHora(diario?.data_fim)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>OPERADOR ATUAL</span>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
                👮 {operadorPatente} {operadorNome}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="alteracoes" style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                Alterações no Serviço / Ocorrências da Jornada:
              </label>
              
              {/* Indicador de Salvamento Automático */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {savingStatus === "salvando" && (
                  <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }}></span>
                    Salvando...
                  </span>
                )}
                {savingStatus === "salvo" && (
                  <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
                    ✓ Salvo automaticamente
                  </span>
                )}
                {savingStatus === "erro" && (
                  <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>
                    ⚠️ Erro ao salvar!
                  </span>
                )}
              </div>
            </div>

            <textarea
              id="alteracoes"
              value={alteracoesText}
              onChange={(e) => setAlteracoesText(e.target.value)}
              placeholder="Descreva as alterações do serviço da jornada, imprevistos, substituições, ordens especiais, ou registre 'SEM ALTERAÇÕES' se a jornada transcorreu normalmente."
              rows="12"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#1e293b",
                background: "#ffffff",
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
            <button
              onClick={handleSalvarManual}
              className="btn-blue"
              style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", cursor: "pointer" }}
            >
              💾 Salvar Registro
            </button>
            <button
              onClick={() => handleImprimir(diario)}
              className="btn-green"
              style={{
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "600",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              🖨️ Imprimir Diário
            </button>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            2. SEÇÃO DE CONSULTA HISTÓRICA (NO-PRINT)
            ──────────────────────────────────────────────────────────────────────── */}
        <div className="card" style={{ marginTop: "30px" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
            🔍 Consultar Diários de Datas Anteriores
          </h3>
          <form onSubmit={handleBuscarHistorico} style={{ display: "flex", gap: "15px", alignItems: "flex-end", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="dataConsulta" style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                Selecione a Data de Início da Jornada:
              </label>
              <input
                type="date"
                id="dataConsulta"
                value={dataConsulta}
                onChange={(e) => setDataConsulta(e.target.value)}
                style={{
                  padding: "10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  color: "#1e293b",
                  background: "white",
                  fontSize: "14px"
                }}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-blue"
              disabled={loadingConsulta}
              style={{ padding: "10px 24px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", height: "40px" }}
            >
              {loadingConsulta ? "Buscando..." : "Buscar Registros"}
            </button>
          </form>

          {diariosConsultados.length === 0 ? (
            dataConsulta && !loadingConsulta && (
              <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "14px", marginTop: "10px" }}>
                Nenhum diário registrado com início na data {dataConsulta.split("-").reverse().join("/")}.
              </p>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#475569", margin: "0 0 5px 0" }}>
                Resultados encontrados ({diariosConsultados.length}):
              </h4>
              {diariosConsultados.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "15px",
                    background: "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                      Jornada: {formatarDataHora(item.data_inicio)} até {formatarDataHora(item.data_fim)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Operador no registro: <strong>{item.operador_nome}</strong>
                    </div>
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "13px",
                        color: "#334155",
                        whiteSpace: "pre-line",
                        background: "#ffffff",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        maxHeight: "100px",
                        overflowY: "auto"
                      }}
                    >
                      {item.alteracoes || "(Sem alterações registradas)"}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleImprimir(item)}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        background: "#475569",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      🖨️ Imprimir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          3. FOLHA DE IMPRESSÃO (OCULTA NA TELA, VISÍVEL APENAS NA IMPRESSÃO)
          ──────────────────────────────────────────────────────────────────────── */}
      {itemParaImprimir && (
        <div className="printable-sheet" style={{ display: "none" }}>
          {/* Cabeçalho idêntico ao Ofício */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid #000000", paddingBottom: "10px", marginBottom: "25px" }}>
            <img src={brasaoParana} alt="" style={{ height: "80px", width: "auto" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "12pt", fontWeight: "bold", fontFamily: "Arial" }}>ESTADO DO PARANÁ</div>
              <div style={{ fontSize: "12pt", fontWeight: "bold", fontFamily: "Arial", marginTop: "2px" }}>POLÍCIA MILITAR</div>
              <div style={{ fontSize: "11pt", fontWeight: "bold", fontFamily: "Arial", color: "#000", marginTop: "2px" }}>5º COMANDO REGIONAL</div>
              <div style={{ fontSize: "11pt", fontWeight: "bold", fontFamily: "Arial", color: "#000", marginTop: "2px" }}>SEXTO BATALHÃO DE POLÍCIA MILITAR</div>
              <div style={{ fontSize: "10pt", fontWeight: "bold", fontFamily: "Arial", color: "#000", marginTop: "2px" }}>PRIMEIRO CARTÓRIO - TCIP</div>
            </div>
            <img src={brasaoPM} alt="" style={{ height: "80px", width: "auto" }} />
          </div>

          {/* Local e Data (Alinhado à direita, padrão oficial) */}
          <div style={{ textAlign: "right", fontSize: "12pt", fontFamily: "Arial", marginBottom: "30px", color: "#000" }}>
            Cascavel, PR, {new Date(itemParaImprimir.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.
          </div>

          {/* Título e Metadados da Jornada */}
          <div style={{ marginBottom: "30px", fontSize: "12pt", fontFamily: "Arial", color: "#000", lineHeight: "1.5" }}>
            <p style={{ margin: "0 0 8px 0" }}><strong>DOCUMENTO:</strong> REGISTRO DE DIÁRIO DE SERVIÇO</p>
            <p style={{ margin: "0 0 8px 0" }}><strong>JORNADA:</strong> {formatarDataHora(itemParaImprimir.data_inicio)} a {formatarDataHora(itemParaImprimir.data_fim)}</p>
            <p style={{ margin: "0" }}><strong>OPERADOR RESPONSÁVEL:</strong> {itemParaImprimir.operador_nome}</p>
          </div>

          {/* Linha Divisória */}
          <div style={{ borderBottom: "1px solid #000000", marginBottom: "25px" }}></div>

          {/* Alterações / Ocorrências (Justificado e com recuo de parágrafo de 2.5cm) */}
          <div style={{ fontSize: "12pt", fontFamily: "Arial", lineHeight: "1.8", textAlign: "justify", color: "#000", minHeight: "350px", marginBottom: "60px" }}>
            {itemParaImprimir.alteracoes ? (
              itemParaImprimir.alteracoes.split("\n").map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                return (
                  <p key={index} style={{ textIndent: "2.5cm", margin: "0 0 15px 0" }}>
                    {paragraph}
                  </p>
                );
              })
            ) : (
              <p style={{ textIndent: "2.5cm", margin: "0" }}>
                SEM ALTERAÇÕES RELEVANTES NESTA JORNADA DE SERVIÇO.
              </p>
            )}
          </div>

          {/* Espaço para Assinaturas (Centralizado no final) */}
          <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", pageBreakInside: "avoid" }}>
            <div style={{ borderTop: "1px solid #000000", width: "300px", textAlign: "center", paddingTop: "6px" }}>
              <div style={{ fontSize: "12pt", fontWeight: "bold", color: "#000" }}>{itemParaImprimir.operador_nome}</div>
              <div style={{ fontSize: "10pt", color: "#000", marginTop: "2px" }}>Operador do 1º Cartório - TCIP</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
