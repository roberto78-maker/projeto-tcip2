import { useEffect, useMemo, useRef, useState } from "react";
import { excluirApreensao, updateApreensao } from "../services/api.js";
import { usePagedList } from "./usePagedList.js";

function buildFilters(busca) {
  const filters = { status: "conferencia" };

  if (busca.trim()) {
    filters.search = busca.trim();
  }

  return filters;
}

export function useTriagem() {
  const [valorBusca, setValorBusca] = useState("");
  const [busca, setBusca] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const filters = useMemo(() => buildFilters(busca), [busca]);

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
      alert("Registro excluido com sucesso.");
    } catch (error) {
      alert(error.message);
    }
  };

  return {
    busca: valorBusca,
    itemSelecionado,
    itemParaExcluir,
    itens,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    erro,
    carregarMais,
    handleBuscaChange,
    abrirModalDespacho,
    fecharModalDespacho,
    abrirModalExclusao,
    fecharModalExclusao,
    confirmarDespacho,
    confirmarExclusao,
  };
}
