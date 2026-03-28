from django.core.management.base import BaseCommand
from custodia.models import LoteIncineracao


class Command(BaseCommand):
    help = "Corrigir protocolos dos lotes removendo o asterisco"

    def handle(self, *args, **options):
        lotes = LoteIncineracao.objects.filter(protocolo__contains="*")
        count = 0
        for lote in lotes:
            lote.protocolo = lote.protocolo.replace("*", "")
            lote.save()
            count += 1
            self.stdout.write(
                self.style.SUCCESS(f"Protocolo corrigido: {lote.protocolo}")
            )

        self.stdout.write(self.style.SUCCESS(f"Total de {count} lotes corrigidos."))
