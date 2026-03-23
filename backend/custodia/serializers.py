from rest_framework import serializers
from .models import Apreensao, Historico, LoteIncineracao


class HistoricoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Historico
        fields = "__all__"


class LoteIncineracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoteIncineracao
        fields = "__all__"


class ApreensaoSerializer(serializers.ModelSerializer):
    historico = HistoricoSerializer(many=True, read_only=True)
    lote_incineracao_detalhe = LoteIncineracaoSerializer(source="lote_incineracao", read_only=True)

    class Meta:
        model = Apreensao
        fields = "__all__"
        read_only_fields = ["data_criacao"]

    def validate(self, data):
        instance = self.instance
        novo_status = data.get("status")
        
        # Se está tentando ir para incineração, arquivo_pdf deve existir (ou estar sendo enviado)
        if instance and novo_status == "incineracao":
            if not instance.arquivo_pdf and not data.get("arquivo_pdf"):
                raise serializers.ValidationError({
                    "arquivo_pdf": "O upload do PDF é obrigatório para destinar à incineração."
                })

        return data

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance