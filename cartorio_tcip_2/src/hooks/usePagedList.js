/**
 * usePagedList.js — Reusable hook for paginated, cached list fetching.
 *
 * Wraps getApreensoesPaginado with:
 *  - Automatic page-1 fetch on mount and on filter change
 *  - Append-only load-more (previous pages are never re-fetched)
 *  - Cache awareness via apiCache (hits are instant, no network)
 *  - Stale-while-revalidate: shows cached data immediately, then
 *    silently refreshes in the background if TTL is close to expiring
 *  - Safe cleanup: ignores async results if the component unmounts
 *    mid-request
 *
 * Usage:
 *   const list = usePagedList({ status: "cofre", natureza: "DROGAS" });
 *   list.itens        → current items array
 *   list.loading      → true during initial page-1 load
 *   list.loadingMore  → true during load-more requests only
 *   list.hasMore      → whether there is a next page
 *   list.totalCount   → total record count from DRF (or null)
 *   list.erro         → error message string or null
 *   list.carregarMais → () → void — fetch next page and append
 *   list.recarregar   → () → void — invalidate cache and reload from page 1
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getApreensoesPaginado, invalidateApreensaoCache } from "../services/api.js";

// Stable serialisation of a filters object to a string for useEffect deps.
// Order-insensitive: { a:1, b:2 } and { b:2, a:1 } produce the same key.
function serializeFilters(filters) {
  return Object.keys(filters)
    .sort()
    .map(k => `${k}=${filters[k]}`)
    .join("|");
}

export function usePagedList(filters = {}) {
  const [itens, setItens]             = useState([]);
  const [nextUrl, setNextUrl]         = useState(null);
  const [totalCount, setTotalCount]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [erro, setErro]               = useState(null);

  // Tracks whether the component is still mounted — prevents setState after
  // unmount when an in-flight request resolves after navigation.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Stable key derived from the filters object, used as useEffect dependency.
  const filtersKey = serializeFilters(filters);

  // ── LOAD FIRST PAGE ────────────────────────────────────────────────────────
  // Called automatically when filters change. Cache is checked first.
  const carregarPrimeiraPagina = useCallback(async (currentFilters) => {
    if (!mountedRef.current) return;
    setLoading(true);
    setErro(null);
    setItens([]);
    setNextUrl(null);
    setTotalCount(null);

    try {
      const page = await getApreensoesPaginado({ filters: currentFilters });
      if (!mountedRef.current) return;
      setItens(page.results);
      setNextUrl(page.next);
      setTotalCount(page.count);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error("[usePagedList] Erro ao carregar página 1:", e);
      setErro("Não foi possível carregar os dados.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger page-1 fetch whenever the filters change.
  useEffect(() => {
    carregarPrimeiraPagina(filters);
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── LOAD MORE ──────────────────────────────────────────────────────────────
  // Fetches the next page and appends results. Cache is checked first,
  // so back-and-forth navigation never re-requests an already loaded page.
  const carregarMais = useCallback(async () => {
    if (!nextUrl || loadingMore || !mountedRef.current) return;
    setLoadingMore(true);

    try {
      const page = await getApreensoesPaginado({ nextUrl });
      if (!mountedRef.current) return;
      // Append — do NOT replace the current list.
      setItens(prev => [...prev, ...page.results]);
      setNextUrl(page.next);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error("[usePagedList] Erro ao carregar mais:", e);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [nextUrl, loadingMore]);

  // ── RECARREGAR (post-mutation) ─────────────────────────────────────────────
  // Invalidates all apreensao cache entries and reloads from page 1.
  // Call this after: upload_pdf, destinar_incineracao, liberar, excluir.
  const recarregar = useCallback(() => {
    invalidateApreensaoCache();
    carregarPrimeiraPagina(filters);
  }, [filters, carregarPrimeiraPagina]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    itens,
    loading,
    loadingMore,
    hasMore: !!nextUrl,
    totalCount,
    erro,
    carregarMais,
    recarregar,
  };
}
