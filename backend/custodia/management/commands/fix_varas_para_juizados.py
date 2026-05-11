"""
Management command to migrate old 'vara' values from
"Xª VARA ESPECIAL CRIMINAL" -> "Xº JUIZADO ESPECIAL CRIMINAL"
"""
from django.core.management.base import BaseCommand
from custodia.models import Apreensao


MAPA_VARAS = {
    "1ª VARA ESPECIAL CRIMINAL": "1º JUIZADO ESPECIAL CRIMINAL",
    "2ª VARA ESPECIAL CRIMINAL": "2º JUIZADO ESPECIAL CRIMINAL",
    "3ª VARA ESPECIAL CRIMINAL": "3º JUIZADO ESPECIAL CRIMINAL",
    "1a VARA ESPECIAL CRIMINAL": "1º JUIZADO ESPECIAL CRIMINAL",
    "2a VARA ESPECIAL CRIMINAL": "2º JUIZADO ESPECIAL CRIMINAL",
    "3a VARA ESPECIAL CRIMINAL": "3º JUIZADO ESPECIAL CRIMINAL",
    "1ª VARA CRIMINAL": "1º JUIZADO ESPECIAL CRIMINAL",
    "2ª VARA CRIMINAL": "2º JUIZADO ESPECIAL CRIMINAL",
    "3ª VARA CRIMINAL": "3º JUIZADO ESPECIAL CRIMINAL",
}


class Command(BaseCommand):
    help = "Corrige o campo 'vara' de VARA para JUIZADO nos registros existentes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas mostra o que seria alterado, sem salvar",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        total_alterados = 0

        for vara_antiga, vara_nova in MAPA_VARAS.items():
            qs = Apreensao.objects.filter(vara__iexact=vara_antiga)
            count = qs.count()

            if count == 0:
                continue

            self.stdout.write(
                f'  "{vara_antiga}" → "{vara_nova}": {count} registro(s)'
            )

            if not dry_run:
                qs.update(vara=vara_nova)
                total_alterados += count

        # Também corrige valores que contenham "VARA" mas não "JUIZADO"
        # (captura variações não mapeadas acima)
        qs_vara = Apreensao.objects.filter(
            vara__icontains="VARA ESPECIAL"
        ).exclude(vara__icontains="JUIZADO")

        restantes = qs_vara.count()
        if restantes > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"\n  Atenção: {restantes} registro(s) com 'VARA ESPECIAL' "
                    f"ainda não corrigidos (variações não mapeadas):"
                )
            )
            for item in qs_vara[:20]:
                self.stdout.write(f"    ID={item.id} vara='{item.vara}'")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("\n[DRY-RUN] Nenhuma alteração foi salva.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✅ Migração concluída: {total_alterados} registro(s) atualizados."
                )
            )
