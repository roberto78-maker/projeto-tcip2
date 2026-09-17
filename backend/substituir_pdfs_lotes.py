import os
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Set environment variables for Production Neon Database and Cloudinary
os.environ["API_KEY"] = "249443346976145"
os.environ["API_SECRET"] = "SUIaJRYha36su63XKwOgI-5_aeQ"
os.environ["CLOUD_NAME"] = "dospqurfs"
os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_gq4TSDHms3Ol@ep-raspy-boat-acto9w7z-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
os.environ["SECRET_KEY"] = "ers369seguro888"
os.environ["DEBUG"] = "False"

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django
django.setup()

from django.conf import settings
from custodia.models import LoteIncineracao, Apreensao, Historico
import cloudinary.uploader

PDF_DIR = BASE_DIR.parent / "laudos_incineracao"

def main():
    print("=" * 70)
    print("SUBSTITUICAO DE PDFs DOS LOTES INCINERADOS (01 a 09) - PRODUCAO")
    print("=" * 70)
    print(f"Diretorio dos PDFs: {PDF_DIR}")
    print(f"Cloudinary: {settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')}")
    print(f"Database Engine: {settings.DATABASES['default'].get('ENGINE')}")
    print(f"Database Host: {settings.DATABASES['default'].get('HOST')}")
    print("-" * 70)

    # 1. List all lotes in database
    lotes = list(LoteIncineracao.objects.all().order_by("numero"))
    print(f"Total de lotes encontrados no banco: {len(lotes)}")
    for l in lotes:
        count = Apreensao.objects.filter(lote_incineracao=l).count()
        print(f"  - Lote {l.numero:02d} | Protocolo: {l.protocolo} | Itens: {count}")
    print("-" * 70)

    sucessos = 0

    for num in range(1, 10):
        pdf_file = PDF_DIR / f"LOTE_{num:02d}.pdf"
        if not pdf_file.exists():
            print(f"[AVISO] Arquivo nao encontrado: {pdf_file.name}")
            continue

        try:
            lote = LoteIncineracao.objects.get(numero=num)
        except LoteIncineracao.DoesNotExist:
            lote = LoteIncineracao.objects.filter(protocolo__icontains=f"{num:06d}").first()
            if not lote:
                print(f"[ERRO] Lote {num:02d} nao encontrado no banco.")
                continue

        apreensoes = Apreensao.objects.filter(lote_incineracao=lote)
        total_itens = apreensoes.count()

        if total_itens == 0:
            print(f"[AVISO] Lote {num:02d} ({lote.protocolo}) encontrado, mas sem apreensoes vinculadas.")
            continue

        public_id = f"lote_{lote.protocolo.replace('.', '_').replace('/', '_')}"
        print(f"[UPLOAD] Enviando {pdf_file.name} para o Cloudinary (Public ID: {public_id})...")

        with open(pdf_file, "rb") as f:
            upload_result = cloudinary.uploader.upload(
                f,
                resource_type="auto",
                folder="laudos_pdf",
                public_id=public_id,
                overwrite=True,
            )

        url_cloudinary = upload_result.get("secure_url")
        print(f"         URL gerada: {url_cloudinary}")

        # Atualiza todas as apreensões vinculadas a este lote
        lista = list(apreensoes)
        for ap in lista:
            ap.arquivo_pdf_url = url_cloudinary
            if ap.status != "queima_pronta":
                ap.status = "queima_pronta"

        Apreensao.objects.bulk_update(lista, ["arquivo_pdf_url", "status"])

        # Registra no historico
        for ap in lista:
            Historico.objects.create(
                apreensao=ap,
                acao=f"Substituicao do PDF assinado oficial do Lote {lote.protocolo}",
            )

        print(f"[SUCESSO] Lote {num:02d} ({lote.protocolo}) atualizado com {total_itens} apreensoes!")
        sucessos += 1

    print("=" * 70)
    print(f"FINALIZADO COM SUCESSO! {sucessos} lotes atualizados no Cloudinary e no Banco Neon.")
    print("=" * 70)

if __name__ == "__main__":
    main()
