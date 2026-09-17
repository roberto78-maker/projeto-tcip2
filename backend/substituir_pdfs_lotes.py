import os
import sys
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django
django.setup()

from django.conf import settings
from custodia.models import LoteIncineracao, Apreensao, Historico
from custodia.views import upload_documento

PDF_DIR = BASE_DIR.parent / "laudos_incineracao"

def main():
    print("=" * 60)
    print("SUBSTITUIÇÃO DE PDFs DOS LOTES INCINERADOS (01 a 09)")
    print("=" * 60)
    print(f"Diretório dos PDFs: {PDF_DIR}")
    print(f"Cloudinary ativo: {getattr(settings, 'USE_CLOUDINARY', False)}")
    print(f"Database: {settings.DATABASES['default'].get('ENGINE')} - {settings.DATABASES['default'].get('NAME')}")
    print("-" * 60)

    for num in range(1, 10):
        pdf_file = PDF_DIR / f"LOTE_{num:02d}.pdf"
        if not pdf_file.exists():
            print(f"⚠️ Arquivo não encontrado: {pdf_file.name}")
            continue

        try:
            lote = LoteIncineracao.objects.get(numero=num)
        except LoteIncineracao.DoesNotExist:
            print(f"❌ Lote {num:02d} não encontrado no banco de dados.")
            continue

        apreensoes = Apreensao.objects.filter(lote_incineracao=lote)
        total_itens = apreensoes.count()

        if total_itens == 0:
            print(f"⚠️ Lote {num:02d} ({lote.protocolo}) encontrado, mas sem apreensões vinculadas.")
            continue

        print(f"📤 Fazendo upload do PDF para o Lote {num:02d} ({lote.protocolo}) - {total_itens} itens...")
        
        with open(pdf_file, "rb") as f:
            url_documento = upload_documento(
                f,
                folder="laudos_pdf",
                public_id=f"lote_{lote.protocolo.replace('.', '_')}",
            )

        # Atualiza todas as apreensões do lote
        lista = list(apreensoes)
        for ap in lista:
            ap.arquivo_pdf_url = url_documento
        
        Apreensao.objects.bulk_update(lista, ["arquivo_pdf_url"])

        # Registra no histórico de cada apreensão
        for ap in lista:
            Historico.objects.create(
                apreensao=ap,
                acao=f"Substituição do PDF assinado do Lote {lote.protocolo}",
            )

        print(f"✅ Lote {num:02d} atualizado com sucesso! Nova URL: {url_documento}")

    print("=" * 60)
    print("Processamento concluído!")
    print("=" * 60)

if __name__ == "__main__":
    main()
