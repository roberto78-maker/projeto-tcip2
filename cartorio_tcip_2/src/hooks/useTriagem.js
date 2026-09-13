import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { excluirApreensao, updateApreensao, removerPdf, invalidateApreensaoCache, getApreensoesPaginado } from "../services/api.js";
import { getUsuario } from "../services/auth.js";
import { usePagedList } from "./usePagedList.js";

function buildFilters(abaAtiva, busca) {
  const filters = { status: "conferencia" };

  filters.triagem_aba = abaAtiva;

  if (busca.trim()) {
    filters.search = busca.trim();
  }

  return filters;
}

export function verificarPossuiApreensao(item) {
  if (!item) return false;
  if (item.tem_apreensao === false) return false;
  const sub = String(item.substancia || "").toUpperCase().trim();
  if (sub === "NAO HA APREENSAO" || sub === "NÃO HÁ APREENSÃO") return false;
  if (item.natureza === "AMEACA" && !sub && (!item.peso || item.peso === 0)) return false;
  return true;
}

export function obterLocalProcesso(item) {
  if (!item) return "CARTÓRIO TCIP";
  if (item.status === "conferencia") {
    const isPendencia =
      item.is_pendencia ||
      item.processo === "(ERRO - DATA DE AUDIENCIA)" ||
      (item.processo && item.processo.includes("ERRO")) ||
      (item.vara && item.vara.includes("ERRO"));
    return isPendencia ? "TRIAGEM (PENDÊNCIAS)" : "TRIAGEM (CONFERÊNCIA)";
  }
  if (item.status === "cofre") {
    return item.natureza === "DROGAS" ? "DEPÓSITO (ENTORPECENTES)" : "DEPÓSITO (OBJETOS DIVERSOS)";
  }
  if (item.status === "incineracao") {
    return "PRONTO PARA INCINERAÇÃO";
  }
  if (item.status === "arquivado") {
    return "ARQUIVAMENTO DEFINITIVO";
  }
  return item.status ? String(item.status).toUpperCase() : "CARTÓRIO TCIP";
}

export function obterNomeOperadorLogado() {
  const user = getUsuario();
  if (!user?.username) return "OPERADOR";
  const raw = user.username.toUpperCase();
  const parts = raw.split("_");
  if (parts.length >= 2) {
    return `${parts[0]}. ${parts.slice(1).join(" ")}`;
  }
  return raw;
}

export function useTriagem() {
  const [abaAtiva, setAbaAtiva] = useState("CORRETOS");
  const [valorBusca, setValorBusca] = useState("");
  const [busca, setBusca] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
  const [itemObservacao, setItemObservacao] = useState(null);
  const [totalPendencias, setTotalPendencias] = useState(0);
  const debounceRef = useRef(null);

  const filters = useMemo(() => buildFilters(abaAtiva, busca), [abaAtiva, busca]);

  const {
    itens,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    erro,
    carregarMais,
    recarregar,
  } = usePagedList(filters);

  const carregarTotalPendencias = useCallback(async () => {
    try {
      const res = await getApreensoesPaginado({
        filters: { status: "conferencia", triagem_aba: "PENDENCIAS" }
      });
      setTotalPendencias(res.count || 0);
    } catch (e) {
      console.error("Erro ao carregar total de pendências:", e);
    }
  }, []);

  useEffect(() => {
    carregarTotalPendencias();
  }, [carregarTotalPendencias]);

  useEffect(() => {
    if (abaAtiva === "PENDENCIAS" && totalCount !== null) {
      setTotalPendencias(totalCount);
    }
  }, [abaAtiva, totalCount]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleBuscaChange = (value) => {
    setValorBusca(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setBusca(value);
    }, 400);
  };

  const abrirModalDespacho = (item) => setItemSelecionado(item);
  const fecharModalDespacho = () => setItemSelecionado(null);
  const abrirModalExclusao = (item) => setItemParaExcluir(item);
  const fecharModalExclusao = () => setItemParaExcluir(null);
  const abrirModalObservacao = (item) => setItemObservacao(item);
  const fecharModalObservacao = () => setItemObservacao(null);

  const confirmarDespacho = async (observacao, dadosCorrecao = {}) => {
    if (!itemSelecionado) return;

    const temApreensao = verificarPossuiApreensao(itemSelecionado);
    const novoStatus = temApreensao ? "cofre" : "arquivado";
    const obsAnterior = itemSelecionado.observacao_cofre ? itemSelecionado.observacao_cofre.trim() : "";
    const dt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const localDestino = temApreensao ? "DEPÓSITO" : "ARQUIVAMENTO";
    const operador = obterNomeOperadorLogado();

    let obsFinal = obsAnterior;
    if (observacao && observacao.trim()) {
      const stamp = `[RESOLUÇÃO / OBS TRIAGEM - ${dt} | LOCAL: ${localDestino} | OPERADOR: ${operador}]:\n${observacao.trim()}`;
      obsFinal = obsAnterior
        ? `${obsAnterior}\n\n${stamp}`
        : stamp;
    }

    const payload = {
      ...itemSelecionado,
      status: novoStatus,
      is_pendencia: false,
      observacao_cofre: obsFinal,
    };

    if (dadosCorrecao.processo) {
      payload.processo = dadosCorrecao.processo;
    }
    if (dadosCorrecao.vara) {
      payload.vara = dadosCorrecao.vara;
    }

    try {
      await updateApreensao(itemSelecionado.id, payload);
      fecharModalDespacho();
      recarregar();
      carregarTotalPendencias();
    } catch (error) {
      console.error(error);
      alert("Erro ao despachar item.");
    }
  };

  const marcarComoPendente = async (motivoErro) => {
    if (!itemSelecionado) return;

    const dt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const operador = obterNomeOperadorLogado();
    const obsAnterior = itemSelecionado.observacao_cofre ? itemSelecionado.observacao_cofre.trim() + "\n\n" : "";
    const detalheMotivo = motivoErro && motivoErro.trim() ? motivoErro.trim() : "Constatado erro na triagem para averiguação.";
    const novaObs = `${obsAnterior}[ ⚠️ PENDÊNCIA REGISTRADA NA TRIAGEM - ${dt} | LOCAL: TRIAGEM (PENDÊNCIAS) | OPERADOR: ${operador} ]\nMotivo: ${detalheMotivo}`;

    try {
      await updateApreensao(itemSelecionado.id, {
        ...itemSelecionado,
        is_pendencia: true,
        observacao_cofre: novaObs,
      });
      fecharModalDespacho();
      recarregar();
      carregarTotalPendencias();
      alert("Registro movido para a aba PENDÊNCIAS com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao mover registro para pendências.");
    }
  };

  const confirmarExclusao = async (motivo) => {
    if (!itemParaExcluir) return;

    try {
      await excluirApreensao(itemParaExcluir.id, motivo);
      fecharModalExclusao();
      recarregar();
      carregarTotalPendencias();
      alert("Registro excluido com sucesso.");
    } catch (error) {
      alert(error.message);
    }
  };

  const confirmarArquivamento = async (id, item) => {
    try {
      await updateApreensao(id, {
        ...item,
        status: "arquivado",
      });
      recarregar();
      carregarTotalPendencias();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const salvarObservacao = async (texto, modoEdicaoCompleta = false) => {
    if (!itemObservacao) return;

    let textoFinal = texto;
    if (!modoEdicaoCompleta && texto && texto.trim()) {
      const dt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const operador = obterNomeOperadorLogado();
      const local = obterLocalProcesso(itemObservacao);
      const obsAnterior = itemObservacao.observacao_cofre ? itemObservacao.observacao_cofre.trim() : "";
      const carimbo = `[ 📝 OBSERVAÇÃO - ${dt} | LOCAL: ${local} | OPERADOR: ${operador} ]\n${texto.trim()}`;
      textoFinal = obsAnterior ? `${obsAnterior}\n\n${carimbo}` : carimbo;
    }

    try {
      await updateApreensao(itemObservacao.id, {
        ...itemObservacao,
        observacao_cofre: textoFinal,
      });
      fecharModalObservacao();
      recarregar();
      carregarTotalPendencias();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar observação.");
    }
  };

  const handleFileUpload = async (id, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("arquivo_pdf", file);
      const user = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/apreensoes/${id}/upload_pdf/`, {
        method: "POST",
        headers: user.access ? { Authorization: `Bearer ${user.access}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao fazer upload.");
      }
      alert("Documento anexado com sucesso!");
      invalidateApreensaoCache();
      recarregar();
      carregarTotalPendencias();
    } catch (e) {
      alert(e.message || "Erro ao fazer upload.");
    }
  };

  const handleRemoverPdf = async (id) => {
    if (!window.confirm("Deseja realmente remover o PDF anexado?")) return;
    try {
      await removerPdf(id);
      alert("PDF removido com sucesso!");
      invalidateApreensaoCache();
      recarregar();
      carregarTotalPendencias();
    } catch (e) {
      alert(e.message || "Erro ao remover PDF.");
    }
  };

  return {
    abaAtiva,
    setAbaAtiva,
    busca: valorBusca,
    itemSelecionado,
    itemParaExcluir,
    itemObservacao,
    itens,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    totalPendencias,
    erro,
    carregarMais,
    handleBuscaChange,
    abrirModalDespacho,
    fecharModalDespacho,
    abrirModalExclusao,
    fecharModalExclusao,
    abrirModalObservacao,
    fecharModalObservacao,
    salvarObservacao,
    confirmarDespacho,
    marcarComoPendente,
    confirmarExclusao,
    confirmarArquivamento,
    handleFileUpload,
    handleRemoverPdf,
  };
}
