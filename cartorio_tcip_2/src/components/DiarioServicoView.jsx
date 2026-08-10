import React, { useState, useEffect } from "react";
import {
  getDiarioAtual,
  salvarDiario,
  getDiariosPorData,
  getUserProfile,
  uploadAnexoDiario,
  deleteAnexoDiario,
  assumirDiario,
  liberarDiario,
} from "../services/api";
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

  // Confirmação de Escala
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [recusou, setRecusou] = useState(false);

  // Consulta histórica
  const [dataConsulta, setDataConsulta] = useState("");
  const [diariosConsultados, setDiariosConsultados] = useState([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [itemParaImprimir, setItemParaImprimir] = useState(null);

  // Upload e Visualização de Anexos
  const [uploading, setUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);

  // Usuário autenticado e Permissões
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const podeEditar = React.useMemo(() => {
    if (!diario || !usuarioLogado) return false;
    if (usuarioLogado.is_superuser || usuarioLogado.is_staff || usuarioLogado.role === "admin") {
      return true;
    }
    if (!diario.operador) return false;
    return diario.operador === usuarioLogado.id;
  }, [diario, usuarioLogado]);

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

        // Obter nome formatado e dados do operador logado
        let perfilUser = null;
        let nome = "";
        let patente = "";
        try {
          perfilUser = await getUserProfile();
          setUsuarioLogado(perfilUser);
          nome = perfilUser.full_name || perfilUser.username || "OPERADOR";
        } catch {
          perfilUser = getUsuario();
          setUsuarioLogado(perfilUser);
          nome = perfilUser?.username?.toUpperCase() || "OPERADOR";
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

        // Verificar se este operador já recusou a escala desta jornada
        const keyRecusa = data && perfilUser ? `recusou_diario_${data.id}_user_${perfilUser.id}` : null;
        const jaRecusou = keyRecusa ? localStorage.getItem(keyRecusa) === "true" : false;
        setRecusou(jaRecusou);

        // O modal de confirmação só deve abrir se:
        // 1. Ninguém assumiu o diário ainda (operador é null)
        // 2. O operador atual ainda NÃO recusou esta jornada
        if (data && !data.operador && perfilUser && !jaRecusou) {
          setShowConfirmModal(true);
        } else {
          setShowConfirmModal(false);
        }
      } catch (err) {
        console.error(err);
        setErro("Erro ao inicializar página de diário. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const handleAssumirEscala = async () => {
    if (!diario) return;
    setConfirmingAction(true);
    setErro(null);
    try {
      const updated = await assumirDiario(diario.id);
      setDiario(updated);
      setShowConfirmModal(false);
    } catch (err) {
      console.error(err);
      setErro(err?.message || "Erro ao assumir escala da jornada.");
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleNaoAssumir = () => {
    if (diario && usuarioLogado) {
      const keyRecusa = `recusou_diario_${diario.id}_user_${usuarioLogado.id}`;
      localStorage.setItem(keyRecusa, "true");
    }
    setRecusou(true);
    setShowConfirmModal(false);
  };

  // Autosave com debounce de 1.5s
  useEffect(() => {
    if (!diario || !podeEditar) return;

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
  }, [alteracoesText, podeEditar]);

  // Função para salvar manualmente (backup)
  const handleSalvarManual = async () => {
    if (!diario || !podeEditar) return;
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !diario || !podeEditar) return;

    setUploading(true);
    setErro(null);
    try {
      const newAnexo = await uploadAnexoDiario(diario.id, file);
      setDiario((prev) => ({
        ...prev,
        anexos: [...(prev.anexos || []), newAnexo],
      }));
    } catch (err) {
      console.error(err);
      setErro(
        "Erro ao enviar anexo de diário. Verifique o tamanho e o tipo do arquivo."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAnexoDelete = async (anexoId) => {
    if (!podeEditar) {
      alert("Você não tem permissão para excluir anexos deste diário.");
      return;
    }
    if (!window.confirm("Deseja realmente remover este anexo?")) return;
    setErro(null);
    try {
      await deleteAnexoDiario(anexoId);
      setDiario((prev) => ({
        ...prev,
        anexos: (prev.anexos || []).filter((a) => a.id !== anexoId),
      }));
    } catch (err) {
      console.error(err);
      setErro("Erro ao remover o anexo.");
    }
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
    <div className="diario-view-root" style={{ padding: "10px", paddingBottom: "80px" }}>
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
          
          .diario-view-root {
            padding: 0 !important;
            margin: 0 !important;
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

        {!diario?.operador ? (
          recusou ? (
            <div style={{ marginBottom: "15px", padding: "14px 18px", background: "#f8fafc", color: "#475569", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔒 <strong>Modo Leitura:</strong> Você confirmou que não está de serviço nesta jornada. Aguardando a assunção pelo operador escalado.</span>
            </div>
          ) : (
            <div style={{ marginBottom: "15px", padding: "14px 18px", background: "#eff6ff", color: "#1e40af", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span>⚠️ <strong>Escala Não Assumida:</strong> Nenhum operador confirmou a escala desta jornada ainda. Se você está de serviço hoje, confirme abaixo.</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleAssumirEscala}
                  disabled={confirmingAction}
                  style={{ padding: "8px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                >
                  ✓ SIM, Assumir Escala
                </button>
                <button
                  onClick={handleNaoAssumir}
                  style={{ padding: "8px 12px", background: "#cbd5e1", color: "#334155", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
                >
                  ✖️ NÃO, Apenas Visualizar
                </button>
              </div>
            </div>
          )
        ) : (diario.operador !== usuarioLogado?.id) ? (
          <div style={{ marginBottom: "15px", padding: "14px 18px", background: "#fef3c7", color: "#92400e", borderRadius: "8px", border: "1px solid #fcd34d", fontSize: "13px" }}>
            <span>🔒 <strong>Modo Leitura:</strong> Este diário foi assumido pelo operador <strong>{diario?.operador_nome || "outro usuário"}</strong>. Você não pode alterar as informações deste registro.</span>
          </div>
        ) : (
          <div style={{ marginBottom: "15px", padding: "12px 16px", background: "#f0fdf4", color: "#166534", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "13px", fontWeight: "600" }}>
            <span>✅ <strong>Você assumiu a escala desta jornada.</strong> Suas alterações serão salvas automaticamente.</span>
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
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>OPERADOR ATUAL DA ESCALA</span>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
                👮 {diario?.operador ? (diario.operador === usuarioLogado?.id ? `${operadorPatente} ${operadorNome}` : diario.operador_nome) : "Nenhum (Pendente Confirmação)"}
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
              disabled={!podeEditar}
              placeholder={
                podeEditar
                  ? "Descreva as alterações do serviço da jornada, imprevistos, substituições, ordens especiais, ou registre 'SEM ALTERAÇÕES' se a jornada transcorreu normalmente."
                  : "Registro do serviço em modo somente leitura (pertence a outro operador)."
              }
              rows="12"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#1e293b",
                background: podeEditar ? "#ffffff" : "#f8fafc",
                resize: "vertical",
                fontFamily: "inherit",
                cursor: podeEditar ? "text" : "not-allowed"
              }}
            />
          </div>

          {/* Seção de Anexos da Jornada */}
          <div style={{ marginTop: "25px", borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#475569", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📎</span> ANEXOS DA JORNADA (Fotos, PDFs, Áudios ou Vídeos)
            </h4>

            {(!diario.anexos || diario.anexos.length === 0) ? (
              <p style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", margin: "10px 0" }}>
                Nenhum documento ou arquivo anexado a esta jornada.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px", marginBottom: "20px" }}>
                {diario.anexos.map((anexo) => {
                  const isImage = anexo.tipo_arquivo.startsWith("image/");
                  const isAudio = anexo.tipo_arquivo.startsWith("audio/");
                  const isVideo = anexo.tipo_arquivo.startsWith("video/");
                  const isPdf = anexo.tipo_arquivo === "application/pdf" || anexo.nome_arquivo.toLowerCase().endsWith(".pdf");

                  return (
                    <div
                      key={anexo.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        position: "relative"
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "#334155",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          paddingRight: "25px"
                        }}
                        title={anexo.nome_arquivo}
                      >
                        {anexo.nome_arquivo}
                      </div>

                      {podeEditar && (
                        <button
                          onClick={() => handleAnexoDelete(anexo.id)}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: "2px"
                          }}
                          title="Excluir anexo"
                        >
                          🗑️
                        </button>
                      )}

                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80px", background: "white", borderRadius: "6px", border: "1px solid #f1f5f9", padding: "6px", overflow: "hidden" }}>
                        {isImage && (
                          <img
                            src={anexo.arquivo_url}
                            alt={anexo.nome_arquivo}
                            onClick={() => setExpandedImage(anexo.arquivo_url)}
                            style={{ maxHeight: "120px", maxWidth: "100%", objectFit: "contain", cursor: "pointer", borderRadius: "4px", transition: "transform 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        )}

                        {isAudio && (
                          <audio
                            src={anexo.arquivo_url}
                            controls
                            style={{ width: "100%", height: "32px" }}
                          />
                        )}

                        {isVideo && (
                          <video
                            src={anexo.arquivo_url}
                            controls
                            style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "4px" }}
                          />
                        )}

                        {isPdf && (
                          <a
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", textDecoration: "none", color: "#1e293b", fontWeight: "600", fontSize: "12px" }}
                          >
                            <span style={{ fontSize: "36px" }}>📄</span>
                            Visualizar PDF
                          </a>
                        )}

                        {!isImage && !isAudio && !isVideo && !isPdf && (
                          <a
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", textDecoration: "none", color: "#1e293b", fontWeight: "600", fontSize: "12px" }}
                          >
                            <span style={{ fontSize: "36px" }}>💾</span>
                            Baixar Arquivo
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {podeEditar && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label
                  style={{
                    padding: "8px 16px",
                    background: uploading ? "#cbd5e1" : "#475569",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: uploading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.background = "#334155"; }}
                  onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.background = "#475569"; }}
                >
                  {uploading ? (
                    <>
                      <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }}></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      Selecionar e Anexar Arquivo
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: "none" }}
                    accept="image/*,video/*,audio/*,application/pdf"
                  />
                </label>
                <span style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                  Formatos aceitos: PDF, Imagens, Áudios (máx. 10MB) e Vídeos (máx. 100MB). <br />
                  <span style={{ color: "#0284c7" }}>💡 Recomendação: Vídeos até 20MB para uploads e carregamentos mais rápidos.</span>
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
            {podeEditar && (
              <button
                onClick={handleSalvarManual}
                className="btn-blue"
                style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", cursor: "pointer" }}
              >
                💾 Salvar Registro
              </button>
            )}
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
                    {item.anexos && item.anexos.length > 0 && (
                      <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {item.anexos.map((anexo) => (
                          <a
                            key={anexo.id}
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "4px 8px",
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "#475569",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>📎</span> {anexo.nome_arquivo}
                          </a>
                        ))}
                      </div>
                    )}
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

          {/* Anexos (Somente indicando a presença para registro físico) */}
          {itemParaImprimir.anexos && itemParaImprimir.anexos.length > 0 && (
            <div style={{ marginBottom: "40px", fontSize: "10pt", color: "#333", borderTop: "1px dashed #000", paddingTop: "10px", pageBreakInside: "avoid" }}>
              <strong>DOCUMENTOS ANEXADOS DIGITALMENTE:</strong>
              <ul style={{ margin: "5px 0 0 0", paddingLeft: "20px" }}>
                {itemParaImprimir.anexos.map((anexo) => (
                  <li key={anexo.id}>{anexo.nome_arquivo} ({anexo.tipo_arquivo})</li>
                ))}
              </ul>
            </div>
          )}

          {/* Espaço para Assinaturas (Centralizado no final) */}
          <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", pageBreakInside: "avoid" }}>
            <div style={{ borderTop: "1px solid #000000", width: "300px", textAlign: "center", paddingTop: "6px" }}>
              <div style={{ fontSize: "12pt", fontWeight: "bold", color: "#000" }}>{itemParaImprimir.operador_nome}</div>
              <div style={{ fontSize: "10pt", color: "#000", marginTop: "2px" }}>Operador do 1º Cartório - TCIP</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Zoom para Imagem */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
            cursor: "zoom-out"
          }}
        >
          <img
            src={expandedImage}
            alt="Anexo ampliado"
            style={{
              maxHeight: "90vh",
              maxWidth: "90vw",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
            }}
          />
        </div>
      )}

      {/* Modal de Confirmação de Escala de Serviço */}
      {showConfirmModal && diario && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              padding: "24px",
              border: "1px solid #e2e8f0"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "40px" }}>👮‍♂️</span>
              <h3 style={{ margin: "10px 0 6px 0", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                Confirmação de Escala de Serviço
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                Jornada: {formatarDataHora(diario.data_inicio)} às {formatarDataHora(diario.data_fim)}
              </p>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px", fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "600" }}>
                Você é o operador que está cumprindo a escala desta jornada de trabalho?
              </p>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#475569" }}>
                <li><strong>SIM:</strong> Você assumirá o Diário de Serviço e poderá registrar as ocorrências e anexos da sua escala.</li>
                <li><strong>NÃO:</strong> Você visualizará o registro em modo somente leitura sem assumir a escala do colega.</li>
              </ul>
            </div>

            {diario.operador && diario.operador !== usuarioLogado?.id && (
              <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "12px", border: "1px solid #fcd34d" }}>
                ⚠️ Atualmente este diário consta como assumido por: <strong>{diario.operador_nome}</strong>. Se você é o operador escalado hoje, confirme em "SIM" para assumir a escala.
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={handleNaoAssumir}
                disabled={confirmingAction}
                style={{
                  padding: "10px 18px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ✖️ NÃO (Apenas Visualizar)
              </button>
              <button
                onClick={handleAssumirEscala}
                disabled={confirmingAction}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)"
                }}
              >
                {confirmingAction ? (
                  <>
                    <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px", borderColor: "#ffffff transparent" }}></span>
                    Confirmando...
                  </>
                ) : (
                  <>✓ SIM (Assumir Escala)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
