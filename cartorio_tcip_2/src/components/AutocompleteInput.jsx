import React, { useState, useEffect, useRef } from "react";

/**
 * Campo de texto com sugestões baseadas no histórico salvo no localStorage ou busca assíncrona.
 * Props:
 *   - historyKey: chave única no localStorage (ex: "historico_policial") (opcional se usar asyncSearch)
 *   - value, onChange: controlado pelo pai
 *   - style, placeholder: repassados ao input
 *   - maxHistory: quantos itens manter no histórico (padrão 30)
 *   - asyncSearch: função assíncrona (query) => Promise<Array<any>>
 *   - renderSuggestion: função (suggestion) => string/ReactNode
 *   - onSelectSuggestion: função (suggestion) => void
 */
export default function AutocompleteInput({
  historyKey,
  value,
  onChange,
  style = {},
  placeholder = "",
  maxHistory = 30,
  asyncSearch,
  renderSuggestion,
  onSelectSuggestion,
  onDeleteSuggestion,
  ...props
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const searchTimeout = useRef(null);

  // Carrega histórico do localStorage
  const getHistory = () => {
    if (!historyKey) return [];
    try {
      return JSON.parse(localStorage.getItem(historyKey) || "[]");
    } catch {
      return [];
    }
  };

  // Salva um valor novo no histórico
  const saveToHistory = (val) => {
    if (!historyKey || !val || !val.trim()) return;
    const cleaned = val.trim().toUpperCase();
    const hist = getHistory().filter((h) => h !== cleaned);
    hist.unshift(cleaned);
    localStorage.setItem(historyKey, JSON.stringify(hist.slice(0, maxHistory)));
  };

  // Exposição da função para o pai poder salvar
  AutocompleteInput.saveToHistory = saveToHistory;

  const handleInput = (e) => {
    const v = e.target.value;
    onChange(e);

    if (asyncSearch) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (v.length >= 1) {
        setLoading(true);
        setShowDropdown(true);
        searchTimeout.current = setTimeout(async () => {
          try {
            const results = await asyncSearch(v);
            setSuggestions(results);
          } catch (err) {
            console.error("Erro ao buscar sugestões async:", err);
          } finally {
            setLoading(false);
          }
        }, 300);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } else {
      if (v.length >= 1) {
        const hist = getHistory();
        const filtered = hist.filter((h) =>
          h.includes(v.toUpperCase())
        );
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      } else {
        setSuggestions(getHistory().slice(0, 8));
        setShowDropdown(true);
      }
    }
    setActiveIndex(-1);
  };

  const handleFocus = async () => {
    if (asyncSearch) {
      try {
        setLoading(true);
        setShowDropdown(true);
        const results = await asyncSearch(value || "");
        setSuggestions(results.slice(0, 8));
      } catch (err) {
        console.error("Erro ao carregar sugestões no foco:", err);
      } finally {
        setLoading(false);
      }
    } else {
      const hist = getHistory();
      if (hist.length > 0) {
        const filtered = value
          ? hist.filter((h) => h.includes(value.toUpperCase()))
          : hist.slice(0, 8);
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      }
    }
  };

  const handleSelect = (item) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    } else {
      onChange({ target: { value: item } });
    }
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
        {...props}
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 9999,
            margin: "2px 0 0",
            padding: 0,
            listStyle: "none",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {loading && (
            <li
              style={{
                padding: "9px 12px",
                fontSize: "13px",
                color: "#94a3b8",
                fontStyle: "italic",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⏳</span> Buscando no banco...
            </li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={s.id || s}
              onMouseDown={() => handleSelect(s)}
              style={{
                padding: "9px 12px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#1e293b",
                background: i === activeIndex ? "#f0fdf4" : "white",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                <span style={{ color: "#94a3b8", fontSize: "11px", flexShrink: 0 }}>
                  {asyncSearch ? "👤" : "👁️"}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {renderSuggestion ? renderSuggestion(s) : s}
                </span>
              </div>
              {onDeleteSuggestion && s.id && (
                <button
                  type="button"
                  title="Excluir do sistema"
                  onMouseDown={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.confirm(`Deseja realmente excluir este policial do sistema?`)) {
                      try {
                        await onDeleteSuggestion(s);
                        setSuggestions((prev) => prev.filter((item) => item.id !== s.id));
                      } catch (err) {
                        alert(err.message || "Erro ao excluir");
                      }
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: "4px 8px",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#fee2e2";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "none";
                  }}
                >
                  🗑️
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Salva um valor no histórico de uma chave específica.
 * Usar após submissão do formulário.
 */
export function saveHistory(key, value, maxHistory = 30) {
  if (!key || !value || !String(value).trim()) return;
  const cleaned = String(value).trim().toUpperCase();
  try {
    const hist = JSON.parse(localStorage.getItem(key) || "[]").filter(
      (h) => h !== cleaned
    );
    hist.unshift(cleaned);
    localStorage.setItem(key, JSON.stringify(hist.slice(0, maxHistory)));
  } catch {}
}

