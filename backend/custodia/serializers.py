from rest_framework import serializers
from .models import Apreensao, Historico, LoteIncineracao, OficioPersonalizado, Policial


class HistoricoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Historico
        # Explicit list — never use __all__ on models with FileField/ImageField
        # backed by cloud storage: DRF calls .url on every instance during
        # serialization, triggering one network request per object per list call.
        fields = ["id", "apreensao", "usuario", "acao", "data"]


class LoteIncineracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoteIncineracao
        fields = ["id", "numero", "ano", "protocolo", "origem", "data_criacao"]


class ApreensaoSerializer(serializers.ModelSerializer):
    historico = HistoricoSerializer(many=True, read_only=True)
    lote_incineracao_detalhe = LoteIncineracaoSerializer(
        source="lote_incineracao", read_only=True
    )

    class Meta:
        model = Apreensao
        # ── arquivo_pdf (FileField) is intentionally EXCLUDED ─────────────────
        # It is kept in the DB schema for backward compatibility, but accessing
        # its .url property triggers a Cloudinary API call on every serialized
        # object. All PDF access goes through arquivo_pdf_url (plain string).
        exclude = ["arquivo_pdf"]
        read_only_fields = ["data_criacao"]

    def validate(self, data):
        instance = self.instance
        novo_status = data.get("status")

        # Guard: PDF required before moving to incineration queue.
        # Checks arquivo_pdf_url (the stored Cloudinary URL string) instead of
        # the FileField, which is no longer written by any upload flow.
        if instance and novo_status == "incineracao":
            has_url = instance.arquivo_pdf_url or data.get("arquivo_pdf_url")
            if not has_url:
                raise serializers.ValidationError(
                    {
                        "arquivo_pdf_url": (
                            "O upload do PDF é obrigatório para destinar à incineração."
                        )
                    }
                )

        return data


class OficioPersonalizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OficioPersonalizado
        fields = "__all__"
        read_only_fields = ["numero_oficio", "ano_oficio", "usuario", "data_criacao"]


class PolicialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Policial
        fields = "__all__"

