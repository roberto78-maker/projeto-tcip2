from django.db import models


class LoteIncineracao(models.Model):
    numero = models.IntegerField()
    ano = models.IntegerField()
    protocolo = models.CharField(max_length=100, unique=True)
    origem = models.CharField(max_length=50, default="1ºCART6BPM")
    data_criacao = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.protocolo:
            # Formato: 1ºCART6BPM-000125-2026
            self.protocolo = f"{self.origem}-{str(self.numero).zfill(6)}-{self.ano}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"LOTE {self.numero} ({self.protocolo})"


class Apreensao(models.Model):
    processo = models.CharField(max_length=100)
    bou = models.CharField(max_length=100)
    reu = models.CharField(max_length=200)

    substancia = models.CharField(max_length=100)
    peso = models.FloatField()
    unidade = models.CharField(max_length=50)

    lacre = models.CharField(max_length=100, blank=True, null=True)
    policial = models.CharField(max_length=200, blank=True, null=True)
    vara = models.CharField(max_length=200, blank=True, null=True)
    descricao = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=50, default="conferencia", db_index=True)
    autorizacao = models.TextField(blank=True, null=True)

    # Novos campos para o fluxo de incineração
    observacao_cofre = models.TextField(blank=True, null=True)
    arquivo_pdf = models.FileField(upload_to="laudos_pdf/", blank=True, null=True)
    arquivo_pdf_url = models.URLField(max_length=500, blank=True, null=True)
    lote_incineracao = models.ForeignKey(
        LoteIncineracao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apreensoes",
    )

    data_criacao = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.bou} - {self.substancia}"


class Historico(models.Model):
    apreensao = models.ForeignKey(
        Apreensao, on_delete=models.CASCADE, related_name="historico"
    )

    acao = models.CharField(max_length=200)
    data = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.apreensao.bou} - {self.acao}"
