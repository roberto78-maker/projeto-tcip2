"""
Management command: go_live
===========================
Limpa TODOS os dados ficticios de teste do sistema, preparando-o para
uso em producao com dados reais.

O que eh APAGADO:
  - Todas as Apreensoes (custodia_apreensao)
  - Todos os Historicos manuais (custodia_historico)
  - Todos os Lotes de Incineracao (custodia_loteincineracao)
  - Todo o historico automatico (django-simple-history)
  - Arquivos PDF locais em media/laudos_pdf/

O que eh PRESERVADO:
  - Usuarios e permissoes (auth_user, auth_group, etc.)
  - Estrutura do banco (migracoes, tabelas)
  - Configuracoes do Django (sessions, content_types, etc.)

Uso:
  python manage.py go_live              # mostra resumo e pede confirmacao
  python manage.py go_live --confirm    # executa direto sem perguntar
"""

import os
import shutil

# pyrefly: ignore [missing-import]
from django.conf import settings

# pyrefly: ignore [missing-import]
from django.core.management.base import BaseCommand

from custodia.models import Apreensao, Historico, LoteIncineracao


class Command(BaseCommand):
    help = (
        "Inaugura o sistema: limpa todos os dados ficticios"
        " mantendo usuarios e estrutura."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Pula a confirmacao interativa e executa direto.",
        )

    def handle(self, *args, **options):
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("=" * 60))
        self.stdout.write(self.style.WARNING("  GO LIVE - Inauguracao do Sistema TCIP"))
        self.stdout.write(self.style.WARNING("=" * 60))
        self.stdout.write("")

        # -- Coletar contagens antes da limpeza ----------------------
        counts = {
            "Apreensoes": Apreensao.objects.count(),
            "Historicos manuais": Historico.objects.count(),
            "Lotes de Incineracao": LoteIncineracao.objects.count(),
            "Historico auto (Apreensao)": Apreensao.history.all().count(),
            "Historico auto (Lote)": LoteIncineracao.history.all().count(),
        }

        # Contar PDFs locais
        pdf_dir = os.path.join(settings.MEDIA_ROOT, "laudos_pdf")
        pdf_count = 0
        if os.path.exists(pdf_dir):
            pdf_count = sum(
                1
                for f in os.listdir(pdf_dir)
                if os.path.isfile(os.path.join(pdf_dir, f))
            )
        counts["Arquivos PDF locais"] = pdf_count

        total = sum(counts.values())

        self.stdout.write("  Dados ficticios encontrados:")
        self.stdout.write("  " + "-" * 45)
        for label, count in counts.items():
            marker = "[X]" if count > 0 else "[ ]"
            self.stdout.write(f"  {marker} {label}: {count}")
        self.stdout.write("  " + "-" * 45)
        self.stdout.write(f"  Total de registros a apagar: {total}")
        self.stdout.write("")

        self.stdout.write("  O que sera PRESERVADO:")
        self.stdout.write("     - Todos os usuarios e senhas")
        self.stdout.write("     - Permissoes e grupos")
        self.stdout.write("     - Estrutura das tabelas e migracoes")
        self.stdout.write("     - Configuracoes do sistema")
        self.stdout.write("")

        if total == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    "  O sistema ja esta limpo! Nenhum dado ficticio encontrado."
                )
            )
            return

        # -- Confirmacao ---------------------------------------------
        if not options["confirm"]:
            self.stdout.write(self.style.ERROR("  ATENCAO: Esta acao eh IRREVERSIVEL!"))
            self.stdout.write("")
            resposta = input("  Digite 'GO LIVE' para confirmar a limpeza: ")
            if resposta.strip() != "GO LIVE":
                self.stdout.write(self.style.ERROR("\n  Operacao cancelada.\n"))
                return

        self.stdout.write("")
        self.stdout.write("  Iniciando limpeza...")

        # -- 1. Apagar Historicos manuais (FK para Apreensao) --------
        deleted_hist = Historico.objects.all().delete()
        self.stdout.write(f"  [OK] Historicos manuais apagados: {deleted_hist[0]}")

        # -- 2. Apagar historico automatico (simple-history) ---------
        deleted_hist_apr = Apreensao.history.all().delete()
        self.stdout.write(
            f"  [OK] Historico automatico (Apreensao): {deleted_hist_apr[0]}"
        )

        deleted_hist_lote = LoteIncineracao.history.all().delete()
        self.stdout.write(f"  [OK] Historico automatico (Lote): {deleted_hist_lote[0]}")

        # -- 3. Apagar Apreensoes ------------------------------------
        deleted_apr = Apreensao.objects.all().delete()
        self.stdout.write(f"  [OK] Apreensoes apagadas: {deleted_apr[0]}")

        # -- 4. Apagar Lotes de Incineracao --------------------------
        deleted_lote = LoteIncineracao.objects.all().delete()
        self.stdout.write(f"  [OK] Lotes de Incineracao apagados: {deleted_lote[0]}")

        # -- 5. Limpar PDFs locais -----------------------------------
        if os.path.exists(pdf_dir):
            # Remove todo conteudo do diretorio, mas mantem o diretorio
            for item in os.listdir(pdf_dir):
                item_path = os.path.join(pdf_dir, item)
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            self.stdout.write(f"  [OK] Arquivos PDF locais removidos: {pdf_count}")

        # -- Finalizacao ---------------------------------------------
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  SISTEMA INAUGURADO COM SUCESSO!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write("  O sistema esta limpo e pronto para dados reais.")
        self.stdout.write("  Todos os usuarios e configuracoes foram mantidos.")
        self.stdout.write("")
