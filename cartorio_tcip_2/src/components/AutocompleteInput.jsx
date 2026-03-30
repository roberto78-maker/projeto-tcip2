import React, { useState, useEffect, useRef } from "react";

/**
 * Campo de texto com sugestões baseadas no histórico salvo no localStorage.
 * Props:
 *   - historyKey: chave única no localStorage (ex: "historico_policial")
 *   - value, onChange: controlado pelo pai
 *   - style, placeholder: repassados ao input
 *   - maxHistory: quantos itens manter no histórico (padrão 30)
 */
export default function AutocompleteInput({
  historyKey,
  value,
  onChange,
  style = {},
  placeholder = "",
  maxHistory = 30,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  // Carrega histórico do localStorage
  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(historyKey) || "[]");
    } catch {
      return [];
    }
  };

  // Salva um valor novo no histórico (chamado externamente via ref ou função exposta)
  const saveToHistory = (val) => {
    if (!val || !val.trim()) return;
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
    setActiveIndex(-1);
  };

  const handleFocus = () => {
    const hist = getHistory();
    if (hist.length > 0) {
      const filtered = value
        ? hist.filter((h) => h.includes(value.toUpperCase()))
        : hist.slice(0, 8);
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
    }
  };

  const handleSelect = (item) => {
    onChange({ target: { value: item } });
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
      />
      {showDropdown && suggestions.length > 0 && (
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
          {suggestions.map((s, i) => (
            <li
              key={s}
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
                gap: "8px",
              }}
            >
              <span style={{ color: "#94a3b8", fontSize: "11px" }}>🕓</span>
              {s}
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
  if (!value || !String(value).trim()) return;
  const cleaned = String(value).trim().toUpperCase();
  try {
    const hist = JSON.parse(localStorage.getItem(key) || "[]").filter(
      (h) => h !== cleaned
    );
    hist.unshift(cleaned);
    localStorage.setItem(key, JSON.stringify(hist.slice(0, maxHistory)));
  } catch {}
}
