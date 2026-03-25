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
    lote_incineracao_detalhe = LoteIncineracaoSerializer(
        source="lote_incineracao", read_only=True
    )

    class Meta:
        model = Apreensao
        fields = "__all__"
        read_only_fields = ["data_criacao"]

    def create(self, validated_data):
        instance = super().create(validated_data)
        try:
            if instance.arquivo_pdf:
                instance.arquivo_pdf_url = instance.arquivo_pdf.url
                instance.save(update_fields=["arquivo_pdf_url"])
        except Exception:
            pass
        return instance

    def update(self, instance, validated_data):
        arquivo_pdf_novo = validated_data.get("arquivo_pdf")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        try:
            if arquivo_pdf_novo:
                instance.arquivo_pdf_url = arquivo_pdf_novo.url
        except Exception:
            pass

        instance.save()
        return instance

    def validate(self, data):
        instance = self.instance
        novo_status = data.get("status")

        if instance and novo_status == "incineracao":
            if not instance.arquivo_pdf and not data.get("arquivo_pdf"):
                raise serializers.ValidationError(
                    {
                        "arquivo_pdf": "O upload do PDF é obrigatório para destinar à incineração."
                    }
                )

        return data
