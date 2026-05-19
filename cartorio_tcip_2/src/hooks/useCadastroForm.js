import React, { useState, useRef } from "react";
import { getUsuario } from "../services/auth.js";
import { gerarTokenAssinatura } from "../services/assinaturaService.js";
import {
  atualizarMaterialPorTipo,
  criarEstadoInicialCadastro,
  criarMaterialPadrao,
  formatarBOU,
  formatarPeso,
  formatarProcesso,
  formatarRG,
  salvarCadastro,
  validarCadastro,
  upper,
} from "../services/cadastroWorkflow.js";

export function useCadastroForm() {
  const [form, setForm] = useState(criarEstadoInicialCadastro);
  const [salvando, setSalvando] = useState(false);
  // Estados do fluxo de assinatura eletrônica
  const [showQRModal, setShowQRModal] = useState(false);
  const [tokenQR, setTokenQR] = useState("");
  const [urlQR, setUrlQR] = useState("");
  const [assinaturaBase64, setAssinaturaBase64] = useState(null);

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

  /**
   * ETAPA 1: Valida o formulário e abre o modal do QR Code.
   * O cadastro só é salvo no banco após a assinatura ser coletada.
   */
  const handleColetarAssinatura = async () => {
    // Validação antes de abrir o QR
    const erroValidacao = validarCadastro(form);
    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    setSalvando(true);
    try {
      const { token, url_qr } = await gerarTokenAssinatura(form.bou);
      setTokenQR(token);
      setUrlQR(url_qr);
      setShowQRModal(true);
    } catch (err) {
      alert(`Erro ao gerar QR Code: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  /**
   * ETAPA 2: Chamado pelo QRCodeModal quando a assinatura chega.
   * Salva os registros no banco, gera o PDF com a assinatura e faz download.
   */
  const handleFinalizarComAssinatura = async (assinatura) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setShowQRModal(false);
    setSalvando(true);

    try {
      const { mensagem, proximoEstado } = await salvarCadastro(
        form,
        assinatura
      );
      setAssinaturaBase64(null);
      alert(mensagem);
      setForm(proximoEstado);
    } catch (err) {
      console.error("❌ Erro ao salvar cadastro:", err);
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setTimeout(() => {
        isSubmitting.current = false;
        setSalvando(false);
      }, 500);
    }
  };

  const handleCancelarQR = () => {
    setShowQRModal(false);
    setTokenQR("");
    setUrlQR("");
  };

  // Mantido por compatibilidade (não é mais usado no fluxo principal)
  const handleSalvar = handleColetarAssinatura;

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
    // Estados do QR Code
    showQRModal,
    tokenQR,
    urlQR,
    assinaturaBase64,
    // Handlers
    adicionarMaterial,
    removerMaterial,
    toggleCrime,
    updateMaterialTipo,
    handleSalvar,
    handleColetarAssinatura,
    handleFinalizarComAssinatura,
    handleCancelarQR,
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
