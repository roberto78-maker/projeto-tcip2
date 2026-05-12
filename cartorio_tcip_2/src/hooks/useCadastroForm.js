import React, { useState, useRef } from "react";
import { getUsuario } from "../services/auth.js";
import {
  atualizarMaterialPorTipo,
  criarEstadoInicialCadastro,
  criarMaterialPadrao,
  formatarBOU,
  formatarPeso,
  formatarProcesso,
  formatarRG,
  salvarCadastro,
  upper,
} from "../services/cadastroWorkflow.js";

export function useCadastroForm() {
  const [form, setForm] = useState(criarEstadoInicialCadastro);
  const [salvando, setSalvando] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const adicionarMaterial = () => {
    setForm((current) => ({
      ...current,
      materiais: [...current.materiais, criarMaterialPadrao()],
    }));
  };

  const removerMaterial = (id) => {
    if (form.materiais.length <= 1) return;

    setForm((current) => ({
      ...current,
      materiais: current.materiais.filter((material) => material.id !== id),
    }));
  };

  const updateMaterial = (id, field, value) => {
    setForm((current) => ({
      ...current,
      materiais: current.materiais.map((material) =>
        material.id === id ? { ...material, [field]: value } : material
      ),
    }));
  };

  const updateMaterialTipo = (id, tipo) => {
    setForm((current) => ({
      ...current,
      materiais: current.materiais.map((material) =>
        material.id === id ? atualizarMaterialPorTipo(material, tipo) : material
      ),
    }));
  };

  const toggleCrime = (crime, checked) => {
    if (checked) {
      updateField("crimesSelecionados", [...form.crimesSelecionados, crime]);
      return;
    }

    updateField(
      "crimesSelecionados",
      form.crimesSelecionados.filter((item) => item !== crime)
    );
  };

  const handleDataFatoChange = (value) => updateField("dataFato", value);
  const handleBouChange = (value) => updateField("bou", formatarBOU(value));
  const handleProcessoChange = (value) => updateField("processo", formatarProcesso(value));
  const handleVaraChange = (value) => updateField("vara", value);
  const handleUnidadeOrigemChange = (value) => updateField("unidadeOrigem", value);
  const handlePatenteChange = (value) => updateField("patente", value);
  const handlePolicialChange = (value) => updateField("policial", upper(value));
  const handleRgChange = (value) => updateField("rg", formatarRG(value));
  const handleFielDepositarioChange = (checked) => updateField("fielDepositario", checked);

  const handleMaterialReuChange = (id, value) => updateMaterial(id, "reu", upper(value));
  const handleMaterialSubstanciaChange = (id, value) => updateMaterial(id, "substancia", value);
  const handleMaterialDescricaoChange = (id, value) => updateMaterial(id, "substancia", upper(value));
  const handleMaterialPesoChange = (id, tipo, value) => {
    updateMaterial(id, "peso", tipo === "DROGA" ? formatarPeso(value) : value);
  };
  const handleMaterialUnidadeChange = (id, value) => updateMaterial(id, "unidadePeso", value);
  const handleMaterialLacreChange = (id, value) => updateMaterial(id, "lacre", value);

  const isSubmitting = useRef(false);

  const handleSalvar = async () => {
    if (isSubmitting.current || salvando) return;

    isSubmitting.current = true;
    setSalvando(true);
    try {
      const { mensagem, proximoEstado } = await salvarCadastro(form);
      alert(mensagem);
      setForm(proximoEstado);
    } catch (err) {
      console.error(err);
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      isSubmitting.current = false;
      setSalvando(false);
    }
  };

  return {
    operador: getUsuario()?.username?.toUpperCase() || "",
    crimesSelecionados: form.crimesSelecionados,
    fielDepositario: form.fielDepositario,
    dataFato: form.dataFato,
    bou: form.bou,
    processo: form.processo,
    vara: form.vara,
    unidadeOrigem: form.unidadeOrigem,
    patente: form.patente,
    policial: form.policial,
    rg: form.rg,
    materiais: form.materiais,
    salvando,
    adicionarMaterial,
    removerMaterial,
    toggleCrime,
    updateMaterialTipo,
    handleSalvar,
    handleDataFatoChange,
    handleBouChange,
    handleProcessoChange,
    handleVaraChange,
    handleUnidadeOrigemChange,
    handlePatenteChange,
    handlePolicialChange,
    handleRgChange,
    handleFielDepositarioChange,
    handleMaterialReuChange,
    handleMaterialSubstanciaChange,
    handleMaterialDescricaoChange,
    handleMaterialPesoChange,
    handleMaterialUnidadeChange,
    handleMaterialLacreChange,
  };
}
