import React from "react";
import brasao from "../assets/brasao.png";

function Header() {
  return (
    <header
      style={{
        width: "100%",
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        padding: "10px 20px",
        boxSizing: "border-box",
        borderBottom: "2px solid #38bdf8"
      }}
    >
      <img
        src={brasao}
        alt="Brasão"
        style={{
          width: "50px",
          marginRight: "15px"
        }}
      />

      <div style={{ lineHeight: "1.2" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>
          GESTÃO CARTORÁRIA - 6º BPM
        </div>

        <div style={{ fontSize: "13px", color: "#cbd5f5" }}>
          PRIMEIRO CARTÓRIO - CASCAVEL/PR
        </div>
      </div>
    </header>
  );
}

export default Header;