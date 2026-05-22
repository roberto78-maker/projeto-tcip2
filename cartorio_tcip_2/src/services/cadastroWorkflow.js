import { addApreensao, gerarNumeroRecibo, invalidateApreensaoCache } from "./api.js";
import { saveHistory } from "../components/AutocompleteInput.jsx";
import { gerarReciboCadastroPdf } from "./cadastroReciboPdf.js";

export function criarMaterialPadrao() {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    reu: "",
    tipo: "OBJETO",
    substancia: "",
    peso: "1",
    unidadePeso: "Unid",
    lacre: "",
  };
}

export function criarEstadoInicialCadastro() {
  return {
    crimesSelecionados: [],
    fielDepositario: false,
    dataFato: "",
    bou: `${new Date().getFullYear()}/`,
    processo: "",
    vara: "",
    unidadeOrigem: "RPA",
    patente: "SD",
    policial: "",
    rg: "",
    materiais: [criarMaterialPadrao()],
  };
}

export function upper(value = "") {
  return String(value).toUpperCase();
}

export function formatarPeso(valor) {
  const digits = String(valor).replace(/\D/g, "");
  const normalizado = (parseInt(digits || "0", 10) / 100).toFixed(2);
  return normalizado.replace(".", ",");
}

export function formatarRG(valor) {
  const d = String(valor).replace(/\D/g, "").slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
}

export function formatarBOU(valor) {
  let raw = String(valor).replace(/[^\d/]/g, "");
  
  if (raw.includes("/")) {
    const partes = raw.split("/");
    const ano = partes[0].slice(0, 4);
    const seq = (partes[1] || "").replace(/\D/g, "").slice(0, 7);
    return `${ano}/${seq}`;
  } else {
    const digitos = raw.replace(/\D/g, "");
    if (digitos.length <= 4) return digitos;
    return `${digitos.slice(0, 4)}/${digitos.slice(4, 11)}`;
  }
}

export function formatarProcesso(valor) {
  const d = String(valor).replace(/\D/g, "").slice(0, 13);
  if (d.length <= 7) return d;
  if (d.length <= 9) return `${d.slice(0, 7)}-${d.slice(7)}`;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}`;
}

export function atualizarMaterialPorTipo(material, tipo) {
  let substancia = "";
  let unidadePeso = "Unid";
  let peso = material.peso;

  if (tipo === "DROGA") {
    substancia = "Maconha";
    unidadePeso = "g";
  } else if (tipo === "SOM") {
    substancia = "Caixa de Som";
    unidadePeso = "Unid";
  } else if (tipo === "NENHUM") {
    substancia = "NAO HA APREENSAO";
    unidadePeso = "Unid";
    peso = "0";
  }

  return {
    ...material,
    tipo,
    substancia,
    unidadePeso,
    peso,
  };
}

export function validarCadastro(form) {
  if (form.crimesSelecionados.length === 0) return "Selecione pelo menos um CRIME para prosseguir.";
  if (!form.dataFato) return "Informe a DATA DO FATO.";
  if (!form.bou || form.bou.length < 8) return "Informe o No BOU completo.";
  if (!form.processo) return "Informe o No PROJUDI.";
  if (!form.vara) return "Selecione o JUIZADO criminal.";
  if (!form.unidadeOrigem) return "Selecione a UNIDADE de origem.";
  if (!form.patente) return "Selecione a GRADUACAO do policial.";
  if (!form.policial) return "Informe o NOME do Policial Entregador.";
  if (!form.rg) return "Informe o RG do policial.";

  for (const [index, material] of form.materiais.entries()) {
    const itemNum = index + 1;
    if (!material.reu) return `Item ${itemNum}: Informe o NOTICIADO / AUTOR.`;
    if (!material.tipo) return `Item ${itemNum}: Selecione o TIPO.`;

    if (material.tipo !== "NENHUM") {
      if (!material.substancia) return `Item ${itemNum}: Informe a APREENSAO / SUBSTANCIA.`;
      if (!material.peso || material.peso === "0" || material.peso === "0,00") {
        return `Item ${itemNum}: Informe a QUANTIA / PESO.`;
      }
    }
  }

  return null;
}

export function montarPayloadApreensao(form, material) {
  const peso = parseFloat(String(material.peso).replace(",", "."));

  return {
    processo: form.processo,
    bou: form.bou,
    reu: material.reu || "NAO IDENTIFICADO",
    natureza:
      material.tipo === "DROGA"
        ? "DROGAS"
        : material.tipo === "SOM"
          ? "SOM"
          : material.tipo === "NENHUM"
            ? "AMEACA"
            : "OUTROS",
    substancia: material.substancia || (material.tipo === "NENHUM" ? "NAO HA APREENSAO" : ""),
    descricao: form.crimesSelecionados.length > 0 ? form.crimesSelecionados.join(", ") : "TERMO GERAL",
    peso: Number.isNaN(peso) ? 0 : peso,
    unidade: material.unidadePeso,
    data_fato: form.dataFato || null,
    tem_apreensao: material.tipo !== "NENHUM",
    status:
      material.tipo === "NENHUM" || (material.tipo !== "DROGA" && (!material.substancia || form.fielDepositario))
        ? "arquivado"
        : "conferencia",
    lacre: material.lacre || "",
    vara: form.vara || "",
    policial: `${form.patente} ${form.policial}`,
  };
}

function salvarHistoricosFormulario(form) {
  saveHistory("hist_policial", form.policial);
  saveHistory("hist_rg", form.rg);

  form.materiais.forEach((material) => {
    saveHistory("hist_noticiado", material.reu);
  });
}

export async function salvarCadastro(form, assinaturaBase64 = null) {
  const erroValidacao = validarCadastro(form);
  if (erroValidacao) {
    throw new Error(erroValidacao);
  }

  for (const material of form.materiais) {
    const payload = montarPayloadApreensao(form, material);
    if (assinaturaBase64) {
      payload.assinatura_base64 = assinaturaBase64;
    }
    await addApreensao(payload);
  }

  // Gerar número sequencial de recibo (controlado pelo banco de dados)
  const { numero_recibo, ano_recibo } = await gerarNumeroRecibo(form.bou);

  // Passa a assinatura eletrônica para o PDF (pode ser null se não coletada)
  await gerarReciboCadastroPdf(form, numero_recibo, ano_recibo, assinaturaBase64);
  salvarHistoricosFormulario(form);
  invalidateApreensaoCache();

  return {
    mensagem: "Procedimento registrado com sucesso!",
    proximoEstado: {
      ...criarEstadoInicialCadastro(),
      dataFato: form.dataFato,
      vara: form.vara,
      unidadeOrigem: form.unidadeOrigem,
      patente: form.patente,
    },
  };
}
