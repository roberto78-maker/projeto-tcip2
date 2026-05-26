import jsPDF from "jspdf";
import { getUserProfile } from "./api.js";
import { getUsuario } from "./auth.js";
import brasaoPM from "../assets/brasao.png";
import brasaoParana from "../assets/brasao_parana.png";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function carregarImagem(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawJustifiedLine(doc, words, x, y, targetWidth) {
  if (words.length === 0) return;
  if (words.length === 1) {
    doc.text(words[0], x, y);
    return;
  }
  
  let totalWordsWidth = 0;
  for (const word of words) {
    totalWordsWidth += doc.getTextWidth(word);
  }
  
  const remainingSpace = targetWidth - totalWordsWidth;
  const numGaps = words.length - 1;
  const gapWidth = remainingSpace / numGaps;
  
  let currentX = x;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    doc.text(word, currentX, y);
    currentX += doc.getTextWidth(word) + gapWidth;
  }
}

function printJustifiedParagraph(doc, text, x, y, contentWidth, firstLineIndent, lineHeight, pageHeight, marginT) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return y;

  let currentLine = [];
  let currentWidth = 0;
  let isFirstLine = true;
  
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    const wordWidth = doc.getTextWidth(word);
    const targetWidth = isFirstLine ? (contentWidth - firstLineIndent) : contentWidth;
    
    const spaceWidth = doc.getTextWidth(" ");
    const testWidth = currentWidth + (currentLine.length > 0 ? spaceWidth : 0) + wordWidth;
    
    if (testWidth <= targetWidth) {
      currentLine.push(word);
      currentWidth = testWidth;
      i++;
    } else {
      const startX = isFirstLine ? (x + firstLineIndent) : x;
      const lineTargetWidth = isFirstLine ? (contentWidth - firstLineIndent) : contentWidth;
      
      drawJustifiedLine(doc, currentLine, startX, y, lineTargetWidth);
      
      y += lineHeight;
      
      if (y > pageHeight - 60) {
        doc.addPage();
        y = marginT;
      }
      
      currentLine = [];
      currentWidth = 0;
      isFirstLine = false;
    }
  }
  
  if (currentLine.length > 0) {
    const startX = isFirstLine ? (x + firstLineIndent) : x;
    doc.text(currentLine.join(" "), startX, y);
    y += lineHeight;
  }
  
  return y;
}

export async function gerarOficioPersonalizadoPdf(dados) {
  // ── Buscar nome completo do operador ─────────────────────────────────────
  let nomeOperador = "";
  let patenteOperador = "";
  try {
    const perfil = await getUserProfile();
    nomeOperador = perfil.full_name || perfil.username || "OPERADOR";
  } catch {
    const usuario = getUsuario();
    nomeOperador = usuario?.username?.toUpperCase() || "OPERADOR";
  }

  const userLocal = getUsuario();
  const usernameParts = (userLocal?.username || "").split("_");
  if (usernameParts.length >= 2 && nomeOperador === (userLocal?.username || "").toUpperCase()) {
    patenteOperador = usernameParts[0] + ".";
    nomeOperador = usernameParts.slice(1).join(" ");
  }

  // ── Carregar imagens (Brasões) ──────────────────────────────────────────
  const [imgParana, imgPM] = await Promise.all([
    carregarImagem(brasaoParana),
    carregarImagem(brasaoPM),
  ]);

  // ── Configuração ABNT (A4, mm) ──────────────────────────────────────────
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const marginL = 30;
  const marginR = 20;
  const marginT = 30;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - marginL - marginR;
  const centerX = marginL + contentWidth / 2;
  let y = marginT;

  doc.setTextColor(0, 0, 0);

  // ══════════════════════════════════════════════════════════════════════════
  // CABEÇALHO (Brasões e Textos Institucionais)
  // ══════════════════════════════════════════════════════════════════════════
  const headerImgWidth = 22;
  const headerImgHeight = 28;

  if (imgParana) {
    try { doc.addImage(imgParana, "PNG", marginL, y - 8, headerImgWidth, headerImgHeight); } catch {}
  }
  if (imgPM) {
    try { doc.addImage(imgPM, "PNG", pageWidth - marginR - headerImgWidth, y - 8, headerImgWidth, headerImgHeight); } catch {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ESTADO DO PARANÁ", centerX, y + 2, { align: "center" });
  doc.text("POLÍCIA MILITAR", centerX, y + 7, { align: "center" });
  doc.text("5º COMANDO REGIONAL", centerX, y + 12, { align: "center" });
  doc.text("SEXTO BATALHÃO DE POLÍCIA MILITAR", centerX, y + 17, { align: "center" });

  y += 25;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 8;

  // ══════════════════════════════════════════════════════════════════════════
  // NÚMERO DO OFÍCIO E DATA
  // ══════════════════════════════════════════════════════════════════════════
  const agora = new Date();
  const numOficio = dados.numero_oficio || "___";
  const anoOficio = dados.ano_oficio || agora.getFullYear();
  const mesExtenso = MESES[agora.getMonth()];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Ofício nº ${String(numOficio).padStart(3, "0")}/${anoOficio}`, marginL, y);
  
  doc.setFont("helvetica", "normal");
  doc.text(
    `Cascavel, ${agora.getDate()} de ${mesExtenso} de ${anoOficio}`,
    pageWidth - marginR,
    y,
    { align: "right" }
  );

  y += 24;

  // ══════════════════════════════════════════════════════════════════════════
  // ASSUNTO E CORPO DO TEXTO
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.text("Assunto: ", marginL, y);
  const labelWidth = doc.getTextWidth("Assunto: ");
  doc.setFont("helvetica", "normal");
  
  const subjectText = dados.assunto || "";
  const subjectLines = doc.splitTextToSize(subjectText, contentWidth - labelWidth);
  doc.text(subjectLines[0] || "", marginL + labelWidth, y);
  let currentSubjectY = y;
  for (let j = 1; j < subjectLines.length; j++) {
    currentSubjectY += 6;
    doc.text(subjectLines[j], marginL + labelWidth, currentSubjectY);
  }
  
  y = currentSubjectY + 18;

  // Pegar vocativo selecionado
  let vocativo = "";
  if (dados.tratamento) {
    vocativo = dados.tratamento.trim();
    if (!vocativo.endsWith(",")) {
      vocativo += ",";
    }
  }

  if (vocativo) {
    doc.setFont("helvetica", "bold");
    doc.text(vocativo, centerX, y, { align: "center" });
    y += 14;
  }

  const recuoParagrafo = 12.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  // O texto base pode conter quebras de linha
  const paragrafos = (dados.texto || "").split("\n");
  
  for (const paragrafo of paragrafos) {
    if (!paragrafo.trim()) {
      y += 6;
      continue;
    }
    
    // Imprime o parágrafo justificado com recuo apenas na primeira linha
    y = printJustifiedParagraph(doc, paragrafo, marginL, y, contentWidth, recuoParagrafo, 6, pageHeight, marginT);
    
    // Se o y após o parágrafo estiver no limite inferior, adiciona nova página
    if (y > pageHeight - 60) {
      doc.addPage();
      y = marginT;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FECHAMENTO E ASSINATURA
  // ══════════════════════════════════════════════════════════════════════════
  if (y > pageHeight - 80) {
    doc.addPage();
    y = marginT;
  }

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.text("Respeitosamente,", centerX, y, { align: "center" });

  y += 25;
  const sigLineW = 60;
  const sigLineStartX = centerX - sigLineW / 2;
  doc.line(sigLineStartX, y, sigLineStartX + sigLineW, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  const assinatura = patenteOperador
    ? `${patenteOperador} ${nomeOperador}`.toUpperCase()
    : nomeOperador.toUpperCase();
  doc.text(assinatura, centerX, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("CARTORÁRIO", centerX, y, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // DESTINATÁRIO (Sem carimbo, apenas texto)
  // ══════════════════════════════════════════════════════════════════════════
  const footerY = pageHeight - 20; 

  // Colocar o destinatário (3 linhas: cargo/tratamento, órgão e cidade)
  y = footerY - 22;

  doc.setFont("helvetica", "bold");
  doc.text(dados.cargo_destinatario || "Exmo.(a) Sr.(a) Juiz(a)", marginL, y);
  y += 6;
  doc.text(dados.orgao_destino || "1º JUIZADO ESPECIAL CRIMINAL", marginL, y);
  y += 6;
  doc.text(dados.cidade_destino || "Cascavel - Pr.", marginL, y);

  // ══════════════════════════════════════════════════════════════════════════
  // RODAPÉ
  // ══════════════════════════════════════════════════════════════════════════
  doc.setLineWidth(0.3);
  doc.line(marginL, footerY, pageWidth - marginR, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  doc.text(
    "Rua Flamboyant, 2659 – Recanto Tropical – Cascavel – PR – CEP 85.807-317",
    centerX,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "Fone/WhatsApp: (45) 3122 – 4025 | E-mail: 6bpm-1cartorio@pm.pr.gov.br",
    centerX,
    footerY + 10,
    { align: "center" }
  );

  doc.save(`OFICIO_${String(numOficio).padStart(3, "0")}_${anoOficio}.pdf`);
}
