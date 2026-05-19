/**
 * assinaturaService.js
 * Funções de API para o fluxo de Assinatura Eletrônica via QR Code.
 */

import { getToken } from "./auth.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Gera um token UUID de sessão no backend para o QR Code.
 * Chamado pelo PC do cartório (requer JWT).
 * @param {string} bou - Número do BOU (ex: "2026/786")
 * @returns {{ token, url_qr, expira_em }}
 */
export async function gerarTokenAssinatura(bou) {
  const jwt = getToken();
  const resp = await fetch(`${API_BASE}/api/assinatura/gerar-token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ bou }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao gerar token de assinatura.");
  }

  return resp.json();
}

/**
 * Verifica se a assinatura já foi enviada pelo celular (short polling).
 * Chamado pelo PC a cada 3 segundos — endpoint público, sem JWT.
 * @param {string} token - UUID da sessão
 * @param {string} bou   - BOU do cadastro
 * @returns {{ assinado: boolean, assinatura_base64: string|null, expirado?: boolean }}
 */
export async function verificarStatusAssinatura(token, bou) {
  const params = new URLSearchParams({ token });
  if (bou) params.set("bou", bou);

  const resp = await fetch(
    `${API_BASE}/api/assinatura/status/?${params.toString()}`,
    { method: "GET" }
  );

  if (!resp.ok) {
    throw new Error("Erro ao verificar status da assinatura.");
  }

  return resp.json();
}

/**
 * Envia a assinatura em Base64 do celular para o backend.
 * Chamado pela tela do celular — endpoint público, sem JWT.
 * @param {string} token          - UUID da sessão
 * @param {string} bou            - BOU do cadastro
 * @param {string} assinatura_b64 - String Base64 do canvas (data:image/png;base64,...)
 * @returns {{ ok: boolean, registros: number }}
 */
export async function enviarAssinatura(token, bou, assinatura_b64) {
  const resp = await fetch(`${API_BASE}/api/assinatura/receber/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, bou, assinatura_base64: assinatura_b64 }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao enviar assinatura.");
  }

  return resp.json();
}
