import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getUsuario } from "./auth.js";
import logoBpm from "../assets/brasao.png";

export function formatarPesoDisplay(valor, unidade) {
  if (unidade === "Unid") return `${valor} Unid.`;

  const num = parseFloat(String(valor).replace(",", ".")) || 0;

  if (["Kg", "kg"].includes(unidade)) {
    return `${num.toFixed(3).replace(".", ",")} Kg`;
  }

  if (["Gr", "g"].includes(unidade)) {
    if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${num.toFixed(2).replace(".", ",")} g`;
  }

  return `${num.toFixed(2).replace(".", ",")} ${unidade}`;
}

export async function gerarReciboCadastroPdf(dados, numeroRecibo, anoRecibo, assinaturaBase64 = null) {
  const {
    crimesSelecionados,
    materiais,
    fielDepositario,
    bou,
    vara,
    patente,
    policial,
    rg,
    unidadeOrigem,
    processo,
  } = dados;

  const doc = new jsPDF();
  const marginX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  let currY = 15;

  const img = new Image();
  img.src = logoBpm;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
  });

  try {
    doc.addImage(img, "PNG", marginX, currY, 20, 24);
  } catch {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ESTADO DO PARANA", centerX, currY + 5, { align: "center" });
  doc.text("POLICIA MILITAR", centerX, currY + 10, { align: "center" });
  doc.text("5o COMANDO REGIONAL DE POLICIA MILITAR", centerX, currY + 15, { align: "center" });
  doc.text("6o BATALHAO DE POLICIA MILITAR", centerX, currY + 20, { align: "center" });
  doc.text("PRIMEIRO CARTORIO - TCIP", centerX, currY + 25, { align: "center" });

  currY += 32;
  doc.line(marginX, currY, pageWidth - marginX, currY);
  currY += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const tituloDoc = "RECIBO DE OBJETOS APREENDIDOS";
  // Número sequencial controlado pelo banco de dados (auditável)
  const numRecibo = numeroRecibo || "S/N";
  const anoRec = anoRecibo || new Date().getFullYear();
  doc.text(`${tituloDoc} No ${numRecibo}/${anoRec}`, centerX, currY, { align: "center" });
  currY += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BOU:", marginX, currY);
  doc.setFont("helvetica", "normal");
  doc.text(bou || "", marginX + 11, currY);
  doc.setFont("helvetica", "bold");
  doc.text("PROJUDI:", centerX + 5, currY);
  doc.setFont("helvetica", "normal");
  doc.text(processo || "", centerX + 25, currY);
  currY += 7;

  doc.setFont("helvetica", "bold");
  doc.text("JUIZADO:", marginX, currY);
  doc.setFont("helvetica", "normal");
  doc.text(vara || "", marginX + 20, currY);
  currY += 12;

  const listaCrimes = [...new Set(crimesSelecionados)];
  const acaoCustodia = fielDepositario
    ? "nomeado FIEL DEPOSITARIO (Objeto permanece com proprietario)"
    : "a custodia";
  const textoBase = `Certifico para os devidos fins que, na data de hoje, recebi do(a) ${patente} ${policial}, RG ${rg}, pertencente a unidade policial ${unidadeOrigem}, ${acaoCustodia} dos itens listados abaixo conforme a natureza constatada:`;

  doc.setFont("helvetica", "normal");
  const splitText = doc.splitTextToSize(textoBase, contentWidth);
  doc.text(textoBase, marginX, currY, { align: "justify", maxWidth: contentWidth });
  currY += splitText.length * 5 + 5;

  doc.setFontSize(10);
  listaCrimes.forEach((crime) => {
    if (crime === "Perturbação do Sossego: Artigo 42 da LCP") {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(`* ${crime}`, marginX + 5, currY);
    currY += 4;
  });
  doc.setFont("helvetica", "normal");
  currY += 8;

  const bodyTable = materiais.map((item, index) => {
    let descFinal = "";

    if (item.tipo === "NENHUM") {
      descFinal = "(S/ APREENSAO FISICA)";
    } else {
      const prefixo =
        item.tipo === "DROGA"
          ? "DROGA - "
          : item.tipo === "SOM"
            ? "SOM - "
            : "OBJETO - ";
      descFinal = `${prefixo}${item.substancia ? item.substancia.toUpperCase() : ""}`;
    }

    return [
      `1.${index + 1}`,
      item.reu || "NAO IDENTIFICADO",
      descFinal,
      item.tipo === "NENHUM" ? "0 Uni." : formatarPesoDisplay(item.peso, item.unidadePeso),
      item.lacre || "N/A",
    ];
  });

  autoTable(doc, {
    startY: currY,
    head: [["Item", "Noticiado/Infrator", "Objeto/Substancia", "Qtd/Peso", "No Lacre"]],
    body: bodyTable,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      fontStyle: "bold",
    },
    margin: { left: marginX, right: marginX },
  });

  currY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(8);
  const obsText =
    "Obs: O material coletado e de responsabilidade exclusiva da equipe policial signataria, na qual os entorpecentes sao recebidos mediante embalagem de custodia com lacre discriminado. Os demais objetos que compoem o termo, como aparelhos de som e facas, sao recebidos no estado em que se encontram no momento da entrega a este cartorio.";
  const splitObs = doc.splitTextToSize(obsText, contentWidth);
  doc.text(obsText, marginX, currY, { align: "justify", maxWidth: contentWidth });
  currY += splitObs.length * 4 + 40;

  const lineSize = 70;
  // ─── Campo de Assinatura — Responsável pela Entrega (Esquerda) ───────────
  // Se houver assinatura eletrônica, insere a imagem acima da linha
  if (assinaturaBase64) {
    try {
      // Imagem da assinatura a punho coletada no celular
      doc.addImage(
        assinaturaBase64,
        "PNG",
        marginX,           // x: alinhado com a linha
        currY - 22,        // y: 22pt acima da linha
        lineSize,          // largura = mesma da linha
        20                 // altura = 20pt
      );
    } catch {
      // Ignora erro de imagem — exibe apenas o nome abaixo da linha
    }
  }

  doc.line(marginX, currY, marginX + lineSize, currY);
  doc.setFont("helvetica", "bold");
  doc.text(`${patente.toUpperCase()} ${policial.toUpperCase()}`, marginX + lineSize / 2, currY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(`RG: ${rg}`, marginX + lineSize / 2, currY + 10, { align: "center" });
  doc.text("Responsavel pela Entrega", marginX + lineSize / 2, currY + 15, { align: "center" });

  const usuario = getUsuario();
  const nomeOperador = usuario?.username?.toUpperCase() || "ADMIN";

  doc.line(pageWidth - marginX - lineSize, currY, pageWidth - marginX, currY);
  doc.setFont("helvetica", "bold");
  doc.text(nomeOperador, pageWidth - marginX - lineSize / 2, currY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Primeiro Cartorio - TCIP", pageWidth - marginX - lineSize / 2, currY + 10, { align: "center" });
  doc.text("Recebedor / Cartorario", pageWidth - marginX - lineSize / 2, currY + 15, { align: "center" });

  doc.setFontSize(7);
  const agora = new Date();
  const dataHora = `${agora.toLocaleDateString("pt-BR")} - ${agora.toLocaleTimeString("pt-BR")}`;
  const protocolo = `PROTOCOLADO: #${numRecibo}/${anoRec}`;
  doc.text(`Gerado em: ${dataHora} - ${protocolo}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 10, {
    align: "right",
  });

  doc.save(`RECIBO_${bou.replace(/\//g, "-")}.pdf`);
}
