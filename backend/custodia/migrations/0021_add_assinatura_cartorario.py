from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("custodia", "0020_alter_apreensao_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="apreensao",
            name="assinatura_cartorario_base64",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="apreensao",
            name="tipo_assinatura_cartorario",
            field=models.CharField(default="TOKEN", max_length=20),
        ),
        migrations.AddField(
            model_name="historicalapreensao",
            name="assinatura_cartorario_base64",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalapreensao",
            name="tipo_assinatura_cartorario",
            field=models.CharField(default="TOKEN", max_length=20),
        ),
    ]
