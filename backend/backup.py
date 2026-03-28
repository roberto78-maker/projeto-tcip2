#!/usr/bin/env python
"""
Script de backup automático do banco de dados SQLite
Execute: python backup.py
"""

import os
import shutil
import json
from datetime import datetime
from pathlib import Path

# Configuração
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "db.sqlite3"
BACKUP_DIR = BASE_DIR / "backups"

# Criar diretório de backups se não existir
BACKUP_DIR.mkdir(exist_ok=True)


def create_backup():
    """Cria um backup do banco de dados SQLite"""
    if not DB_PATH.exists():
        print(f"❌ Banco de dados não encontrado em {DB_PATH}")
        return None

    # Gerar nome do arquivo com data/hora
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"db_backup_{timestamp}.sqlite3"

    # Copiar arquivo
    shutil.copy2(DB_PATH, backup_file)

    # Criar metadata
    metadata = {
        "backup_date": datetime.now().isoformat(),
        "original_file": str(DB_PATH),
        "backup_file": str(backup_file),
        "size_bytes": backup_file.stat().st_size,
    }

    metadata_file = BACKUP_DIR / f"metadata_{timestamp}.json"
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"✅ Backup criado: {backup_file.name}")
    print(f"   Tamanho: {backup_file.stat().st_size / 1024:.2f} KB")

    return backup_file


def list_backups():
    """Lista todos os backups existentes"""
    backups = sorted(BACKUP_DIR.glob("db_backup_*.sqlite3"), reverse=True)
    print(f"\n📁 Backups em {BACKUP_DIR}:")
    print(f"   Total: {len(backups)} backup(s)\n")

    for backup in backups[:10]:
        size_kb = backup.stat().st_size / 1024
        date = datetime.fromtimestamp(backup.stat().st_mtime)
        print(
            f"   - {backup.name} ({size_kb:.2f} KB) - {date.strftime('%d/%m/%Y %H:%M')}"
        )

    return backups


def cleanup_old_backups(max_backups=30):
    """Remove backups antigos, mantendo apenas os mais recentes"""
    backups = sorted(BACKUP_DIR.glob("db_backup_*.sqlite3"))

    if len(backups) > max_backups:
        to_delete = backups[:-max_backups]
        for backup in to_delete:
            backup.unlink()
            # Também remove metadata
            metadata_file = BACKUP_DIR / backup.name.replace(".sqlite3", ".json")
            if metadata_file.exists():
                metadata_file.unlink()
            print(f"🗑️  Backup antigo removido: {backup.name}")
        print(
            f"\n✅ Limpeza concluída. Mantidos os {max_backups} backups mais recentes."
        )


def export_json():
    """Exporta todos os dados para JSON (para migração ou backup legível)"""
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
    django.setup()

    from custodia.models import Apreensao, LoteIncineracao

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_file = BACKUP_DIR / f"export_{timestamp}.json"

    data = {
        "export_date": datetime.now().isoformat(),
        "apreensoes": [],
        "lotes": [],
    }

    for apreensao in (
        Apreensao.objects.all()
        .select_related("lote_incineracao")
        .prefetch_related("historico")
    ):
        data["apreensoes"].append(
            {
                "id": apreensao.id,
                "processo": apreensao.processo,
                "bou": apreensao.bou,
                "reu": apreensao.reu,
                "substancia": apreensao.substancia,
                "peso": apreensao.peso,
                "unidade": apreensao.unidade,
                "lacre": apreensao.lacre,
                "policial": apreensao.policial,
                "vara": apreensao.vara,
                "status": apreensao.status,
                "data_criacao": (
                    apreensao.data_criacao.isoformat()
                    if apreensao.data_criacao
                    else None
                ),
                "lote_incineracao": (
                    apreensao.lote_incineracao.protocolo
                    if apreensao.lote_incineracao
                    else None
                ),
            }
        )

    for lote in LoteIncineracao.objects.all():
        data["lotes"].append(
            {
                "id": lote.id,
                "numero": lote.numero,
                "ano": lote.ano,
                "protocolo": lote.protocolo,
                "origem": lote.origem,
                "data_criacao": (
                    lote.data_criacao.isoformat() if lote.data_criacao else None
                ),
            }
        )

    with open(export_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Exportação JSON criada: {export_file.name}")
    print(f"   Total de apreensões: {len(data['apreensoes'])}")
    print(f"   Total de lotes: {len(data['lotes'])}")

    return export_file


if __name__ == "__main__":
    import sys

    print("=" * 50)
    print("🔒 SISTEMA DE BACKUP - TCIP")
    print("=" * 50)

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "list":
            list_backups()
        elif command == "export":
            export_json()
        elif command == "cleanup":
            cleanup_old_backups()
        elif command == "help":
            print("""
📖 Comandos disponíveis:
   python backup.py           - Criar novo backup
   python backup.py list      - Listar backups
   python backup.py export    - Exportar dados para JSON
   python backup.py cleanup   - Limpar backups antigos
            """)
        else:
            print(f"❌ Comando desconhecido: {command}")
    else:
        create_backup()
        list_backups()
