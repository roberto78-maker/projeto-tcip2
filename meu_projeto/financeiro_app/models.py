from django.db import models


class Categoria(models.Model):
    nome = models.CharField(max_length=100)

    def __str__(self):
        return self.nome


class Despesa(models.Model):
    data = models.DateField()
    vencimento = models.DateField()
    categoria = models.CharField(max_length=100)
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    paga = models.BooleanField(default=False)
    recorrente = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.descricao} - R$ {self.valor}"


class Receita(models.Model):
    data = models.DateField()
    vencimento = models.DateField()
    tipo = models.CharField(max_length=100)
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    recebida = models.BooleanField(default=False)
    recorrente = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.descricao} + R$ {self.valor}"