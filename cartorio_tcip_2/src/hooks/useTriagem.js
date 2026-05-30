import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { excluirApreensao, updateApreensao, removerPdf, invalidateApreensaoCache, getApreensoesPaginado } from "../services/api.js";
import { usePagedList } from "./usePagedList.js";

function buildFilters(abaAtiva, busca) {
  const filters = { status: "conferencia" };

  filters.triagem_aba = abaAtiva;

  if (busca.trim()) {
    filters.search = busca.trim();
  }

  return filters;
}

export function useTriagem() {
  const [abaAtiva, setAbaAtiva] = useState("CORRETOS");
  const [valorBusca, setValorBusca] = useState("");
  const [busca, setBusca] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
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

  const confirmarDespacho = async (observacao) => {
    if (!itemSelecionado) return;

    try {
      await updateApreensao(itemSelecionado.id, {
        ...itemSelecionado,
        status: "cofre",
        observacao_cofre: observacao,
      });
      fecharModalDespacho();
      recarregar();
      carregarTotalPendencias();
    } catch (error) {
      console.error(error);
      alert("Erro ao despachar item.");
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
    confirmarDespacho,
    confirmarExclusao,
    confirmarArquivamento,
    handleFileUpload,
    handleRemoverPdf,
  };
}
