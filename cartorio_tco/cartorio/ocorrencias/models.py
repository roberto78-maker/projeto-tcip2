from django.db import models


class Ocorrencia(models.Model):

    data = models.DateField()
    hora = models.TimeField()
    cidade = models.CharField(max_length=100)
    bairro = models.CharField(max_length=100)
    natureza = models.CharField(max_length=200)
    descricao = models.TextField()

    def __str__(self):
        return f"{self.natureza} - {self.cidade}"


class Pessoa(models.Model):

    TIPOS = (
        ('autor', 'Autor'),
        ('vitima', 'Vítima'),
        ('testemunha', 'Testemunha'),
    )

    nome = models.CharField(max_length=200)
    cpf = models.CharField(max_length=14)
    tipo = models.CharField(max_length=20, choices=TIPOS)

    ocorrencia = models.ForeignKey(Ocorrencia, on_delete=models.CASCADE)

    def __str__(self):
        return self.nome


class Apreensao(models.Model):

    objeto = models.CharField(max_length=200)
    quantidade = models.IntegerField()

    ocorrencia = models.ForeignKey(Ocorrencia, on_delete=models.CASCADE)

    def __str__(self):
        return self.objeto