from django.db import migrations


def make_alteracoes_uppercase(apps, schema_editor):
    DiarioServico = apps.get_model("custodia", "DiarioServico")
    for ds in DiarioServico.objects.all():
        if ds.alteracoes:
            ds.alteracoes = ds.alteracoes.upper()
            ds.save(update_fields=["alteracoes"])

    # Also update simple-history tracking tables to keep it consistent
    HistoricalDiarioServico = apps.get_model("custodia", "HistoricalDiarioServico")
    for hds in HistoricalDiarioServico.objects.all():
        if hds.alteracoes:
            hds.alteracoes = hds.alteracoes.upper()
            hds.save(update_fields=["alteracoes"])


class Migration(migrations.Migration):

    dependencies = [
        ("custodia", "0023_diarioservicoanexo"),
    ]

    operations = [
        migrations.RunPython(
            make_alteracoes_uppercase, reverse_code=migrations.RunPython.noop
        ),
    ]
