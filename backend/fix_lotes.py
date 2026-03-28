import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from custodia.models import LoteIncineracao  # noqa: E402

lotes = LoteIncineracao.objects.filter(protocolo__contains="*")
count = 0
for lote in lotes:
    lote.protocolo = lote.protocolo.replace("*", "")
    lote.save()
    count += 1

print(f"Updated {count} lotes.")
