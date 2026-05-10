from django.db import models
from django.contrib.auth.models import User
from simple_history.models import HistoricalRecords
from simple_history import register


class LoteIncineracao(models.Model):
    numero = models.IntegerField()
    ano = models.IntegerField()
    protocolo = models.CharField(max_length=100, unique=True)
    origem = models.CharField(max_length=50, default="1ºCART6BPM")
    data_criacao = models.DateTimeField(auto_now_add=True)

    history = HistoricalRecords()

    def save(self, *args, **kwargs):
        if not self.protocolo:
            # Formato: 1ºCART6BPM-000125-2026
            self.protocolo = f"{self.origem}-{str(self.numero).zfill(6)}-{self.ano}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"LOTE {self.numero} ({self.protocolo})"


class Apreensao(models.Model):
    # Tipos de Natureza (Define o Fluxo)
    NATUREZA_CHOICES = [
        ("DROGAS", "Tráfico / Posse de Drogas"),
        ("AMEACA", "Ameaça / Desobediência / Injúria"),
        ("SOM", "Perturbação do Sossego (Som)"),
        ("OUTROS", "Outros Tipos de Termos"),
    ]

    processo = models.CharField(max_length=100)
    bou = models.CharField(max_length=100)
    reu = models.CharField(max_length=200)

    # Agora natureza define se é droga ou não
    natureza = models.CharField(
        max_length=50, choices=NATUREZA_CHOICES, default="DROGAS", db_index=True
    )

    # Tornamos estes campos opcionais (Podem ser Nulos para crimes sem apreensão)
    substancia = models.TextField(blank=True, null=True)
    peso = models.FloatField(blank=True, null=True)
    unidade = models.CharField(max_length=50, blank=True, null=True)

    lacre = models.CharField(max_length=100, blank=True, null=True)
    policial = models.CharField(max_length=200, blank=True, null=True)
    vara = models.CharField(max_length=200, blank=True, null=True)
    descricao = models.TextField(blank=True, null=True)

    # Status permanece, mas o fluxo mudará via código
    status = models.CharField(max_length=50, default="conferencia", db_index=True)
    autorizacao = models.TextField(blank=True, null=True)

    # Identificação se houve ou não apreensão física
    tem_apreensao = models.BooleanField(default=True)

    # Novos campos para o fluxo de incineração
    observacao_cofre = models.TextField(blank=True, null=True)
    # ─── PDF Storage ─────────────────────────────────────────────────────────
    # DEPRECATED: arquivo_pdf (FileField) caused Cloudinary network calls on
    # every serialization of every object in a list. It is kept in the DB schema
    # to avoid a migration, but is excluded from all forms and serializers.
    # All new code must read/write arquivo_pdf_url (plain URLField).
    arquivo_pdf = models.FileField(
        upload_to="laudos_pdf/",
        blank=True,
        null=True,
        editable=False,  # ← hidden from ModelForm / DRF serializers by default
    )
    arquivo_pdf_url = models.URLField(max_length=500, blank=True, null=True)
    lote_incineracao = models.ForeignKey(
        LoteIncineracao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apreensoes",
    )
    motivo_exclusao = models.TextField(blank=True, null=True)

    data_fato = models.DateTimeField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True, db_index=True)

    # Persistência de numeração de ofícios
    numero_oficio = models.IntegerField(blank=True, null=True)
    ano_oficio = models.IntegerField(blank=True, null=True)

    history = HistoricalRecords()

    def __str__(self):
        return f"{self.bou} - {self.substancia}"


class Historico(models.Model):
    apreensao = models.ForeignKey(
        Apreensao, on_delete=models.CASCADE, related_name="historico"
    )

    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    acao = models.CharField(max_length=200)
    data = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.apreensao.bou} - {self.acao}"


# Registrar o modelo User para rastreamento de histórico
try:
    register(User, app="custodia")
except Exception:
    pass
