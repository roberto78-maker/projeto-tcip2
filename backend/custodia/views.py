import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters, permissions
from django.db.models import Sum, Count
from django.http import HttpResponse
from django_filters import rest_framework as django_filters
from django.utils import timezone
from .models import Apreensao, LoteIncineracao
from .serializers import ApreensaoSerializer, LoteIncineracaoSerializer

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

logger = logging.getLogger(__name__)


class LoteIncineracaoFilter(django_filters.FilterSet):
    ano = django_filters.NumberFilter(field_name="ano")
    protocolo = django_filters.CharFilter(
        field_name="protocolo", lookup_expr="icontains"
    )
    data_inicio = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="gte"
    )
    data_fim = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="lte"
    )

    class Meta:
        model = LoteIncineracao
        fields = ["ano", "protocolo", "origem"]


class LoteIncineracaoViewSet(viewsets.ModelViewSet):
    queryset = LoteIncineracao.objects.all().order_by("-data_criacao")
    serializer_class = LoteIncineracaoSerializer
    filterset_class = LoteIncineracaoFilter
    search_fields = ["protocolo", "origem"]
    ordering_fields = ["numero", "ano", "data_criacao"]
    ordering = ["-data_criacao"]


class ApreensaoFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    substancia = django_filters.CharFilter(
        field_name="substancia", lookup_expr="icontains"
    )
    reu = django_filters.CharFilter(field_name="reu", lookup_expr="icontains")
    bou = django_filters.CharFilter(field_name="bou", lookup_expr="icontains")
    processo = django_filters.CharFilter(field_name="processo", lookup_expr="icontains")
    data_inicio = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="gte"
    )
    data_fim = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="lte"
    )

    class Meta:
        model = Apreensao
        fields = ["status", "substancia", "reu", "bou", "processo"]


class ApreensaoViewSet(viewsets.ModelViewSet):
    queryset = (
        Apreensao.objects.select_related("lote_incineracao")
        .prefetch_related("historico")
        .order_by("-data_criacao")
    )
    serializer_class = ApreensaoSerializer
    filterset_class = ApreensaoFilter
    search_fields = ["processo", "bou", "reu", "substancia", "vara", "policial"]
    ordering_fields = ["data_criacao", "peso", "status"]
    ordering = ["-data_criacao"]
    filter_backends = [
        django_filters.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Erro ao atualizar apreensão: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def destinar_incineracao(self, request, pk=None):
        apreensao = self.get_object()

        if not apreensao.arquivo_pdf:
            return Response(
                {"error": "Arquivo PDF nao encontrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agora = timezone.now()
        ultimo_lote = LoteIncineracao.objects.order_by("-numero").first()

        if not ultimo_lote or ultimo_lote.apreensoes.count() >= 20:
            novo_numero = (ultimo_lote.numero + 1) if ultimo_lote else 1
            protocolo = f"1CART6BPM-{str(novo_numero).zfill(6)}.{agora.year}"
            ultimo_lote = LoteIncineracao.objects.create(
                numero=novo_numero, ano=agora.year, protocolo=protocolo
            )

        apreensao.lote_incineracao = ultimo_lote
        apreensao.status = "incineracao"
        apreensao.save()

        logger.info(
            f"Apreensão {apreensao.id} destinada para incineração no lote {ultimo_lote.protocolo}"
        )

        return Response(ApreensaoSerializer(apreensao).data)

    @action(detail=False, methods=["post"])
    def finalizar_lote(self, request):
        """
        Finaliza lote: recebe lote_id e altera status das apreensões para 'queima_pronta'
        """
        lote_id = request.data.get("lote_id")

        if not lote_id:
            return Response(
                {"error": "lote_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lote = LoteIncineracao.objects.get(id=lote_id)
        except LoteIncineracao.DoesNotExist:
            return Response(
                {"error": "Lote não encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        apreensoes = Apreensao.objects.filter(
            lote_incineracao=lote, status="incineracao"
        )

        if apreensoes.count() < 20:
            return Response(
                {"error": f"Lote precisa de 20 itens. Atual: {apreensoes.count()}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        count = apreensoes.count()
        apreensoes.update(status="queima_pronta")

        logger.info(f"Lote {lote.protocolo} finalizado com {count} apreensões")

        return Response(
            {
                "message": f"Lote {lote.protocolo} finalizada com sucesso",
                "itens_finalizados": count,
            }
        )

class RelatorioIncineracaoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Apreensao.objects.filter(status="queima_pronta")

        data_inicio = request.GET.get("data_inicio")
        data_fim = request.GET.get("data_fim")
        vara = request.GET.get("vara")
        substancia = request.GET.get("substancia")

        if data_inicio:
            qs = qs.filter(data_criacao__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_criacao__lte=data_fim)
        if vara:
            qs = qs.filter(vara__icontains=vara)
        if substancia:
            qs = qs.filter(substancia__icontains=substancia)

        total_processos = qs.count()
        peso_total = qs.aggregate(Sum('peso'))['peso__sum'] or 0.0

        por_substancia = list(
            qs.values("substancia").annotate(peso=Sum("peso"), quantidade=Count("id")).order_by("-peso")
        )
        por_substancia_formatado = [
            {"nome": item["substancia"] or "Não Informado", "peso": item["peso"], "quantidade": item["quantidade"]}
            for item in por_substancia
        ]

        por_vara = list(
            qs.values("vara").annotate(quantidade=Count("id")).order_by("-quantidade")
        )

        detalhado = list(
            qs.values("bou", "substancia", "peso", "vara", "data_criacao").order_by("-data_criacao")
        )
        detalhado_formatado = [
            {
                "bou": item["bou"],
                "substancia": item["substancia"],
                "peso": item["peso"],
                "vara": item["vara"],
                "data": item["data_criacao"].strftime("%Y-%m-%d") if item["data_criacao"] else None
            }
            for item in detalhado
        ]

        return Response({
            "total_processos": total_processos,
            "peso_total": peso_total,
            "por_substancia": por_substancia_formatado,
            "por_vara": por_vara,
            "detalhado": detalhado_formatado
        })

class RelatorioIncineracaoPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Apreensao.objects.filter(status="queima_pronta")

        data_inicio = request.GET.get("data_inicio")
        data_fim = request.GET.get("data_fim")
        vara = request.GET.get("vara")
        substancia = request.GET.get("substancia")

        if data_inicio: qs = qs.filter(data_criacao__gte=data_inicio)
        if data_fim: qs = qs.filter(data_criacao__lte=data_fim)
        if vara: qs = qs.filter(vara__icontains=vara)
        if substancia: qs = qs.filter(substancia__icontains=substancia)

        total_processos = qs.count()
        peso_total = qs.aggregate(Sum('peso'))['peso__sum'] or 0.0

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle('TitleCenter', parent=styles['Heading1'], alignment=1, spaceAfter=20)
        normal_style = styles['Normal']

        elements.append(Paragraph("POLÍCIA MILITAR DO PARANÁ - 6º BPM", title_style))
        elements.append(Paragraph("RELATÓRIO DE AUDITORIA DE INCINERAÇÃO", title_style))
        
        periodo_texto = f"Período: {data_inicio or 'Início'} a {data_fim or 'Hoje'}"
        info = f"<b>{periodo_texto}</b><br/><b>Total de Processos:</b> {total_processos} <br/><b>Peso Total:</b> {peso_total:.2f}g"
        elements.append(Paragraph(info, normal_style))
        elements.append(Spacer(1, 20))

        data = [["BOU", "Substância", "Peso", "Vara", "Data"]]
        for item in qs.order_by('-data_criacao'):
            data.append([
                item.bou or "-", 
                item.substancia or "-", 
                f"{item.peso} {item.unidade}", 
                item.vara or "-", 
                item.data_criacao.strftime("%d/%m/%Y") if item.data_criacao else "-"
            ])

        t = Table(data, colWidths=[1.5*inch, 1.5*inch, 1*inch, 1.5*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        elements.append(t)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="relatorio_auditoria.pdf"'
        return response
