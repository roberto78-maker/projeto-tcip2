from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html

from .models import Apreensao, DiarioServico, Historico, LoteIncineracao, Policial


class HistoricoInline(admin.TabularInline):
    model = Historico
    extra = 0
    readonly_fields = ("acao", "data")
    can_delete = False


@admin.register(Apreensao)
class ApreensaoAdmin(admin.ModelAdmin):
    list_display = (
        "bou",
        "processo",
        "reu",
        "natureza_badge",
        "substancia",
        "peso_formatado",
        "status_badge",
        "vara",
        "data_fato",
        "data_criacao",
    )
    list_filter = ("natureza", "status", "substancia", "vara", "data_criacao")
    actions = [
        "trocar_para_drogas",
        "trocar_para_som",
        "trocar_para_ameaca",
        "trocar_para_outros",
    ]
    search_fields = ("bou", "processo", "reu", "substancia", "vara", "policial")
    readonly_fields = ("data_criacao", "arquivo_pdf_url", "arquivo_pdf")
    list_per_page = 30
    ordering = ("-data_criacao",)
    inlines = [HistoricoInline]

    fieldsets = (
        (
            "Identificação",
            {
                "fields": ("processo", "bou", "reu", "vara", "policial", "lacre", "natureza"),
                "description": (
                    "<strong style='color:#b91c1c'>⚠️ O campo NATUREZA define o tipo do registro "
                    "(DROGAS, SOM, AMEAÇA, OUTROS). Altere aqui caso tenha sido cadastrado incorretamente.</strong>"
                ),
            },
        ),
        (
            "Material",
            {"fields": ("substancia", "peso", "unidade", "descricao")},
        ),
        (
            "Documentos",
            {"fields": ("arquivo_pdf", "arquivo_pdf_url")},
        ),
        (
            "Custódia",
            {
                "fields": (
                    "status",
                    "lote_incineracao",
                    "observacao_cofre",
                    "autorizacao",
                )
            },
        ),
        (
            "Exclusão",
            {"fields": ("motivo_exclusao",), "classes": ("collapse",)},
        ),
        (
            "Datas",
            {
                "fields": (
                    "data_fato",
                    "data_criacao",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Documentação (Ofício)",
            {"fields": ("numero_oficio", "ano_oficio")},
        ),
    )

    def peso_formatado(self, obj):
        return f"{obj.peso} {obj.unidade}"

    peso_formatado.short_description = "Peso"

    def natureza_badge(self, obj):
        cores = {
            "DROGAS": "#10b981",
            "SOM": "#f59e0b",
            "AMEACA": "#3b82f6",
            "OUTROS": "#6b7280",
        }
        labels = {
            "DROGAS": "🌿 DROGAS",
            "SOM": "🔊 SOM",
            "AMEACA": "⚡ AMEAÇA",
            "OUTROS": "📦 OUTROS",
        }
        cor = cores.get(obj.natureza, "#6b7280")
        label = labels.get(obj.natureza, obj.natureza)
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 8px;'
            'border-radius:4px;font-size:11px;font-weight:bold;">{}"</span>',
            cor,
            label,
        )

    natureza_badge.short_description = "Natureza / Tipo"
    natureza_badge.admin_order_field = "natureza"

    # ── Actions para trocar natureza em lote ─────────────────────────────────
    def _trocar_natureza(self, request, queryset, natureza, label):
        total = queryset.update(natureza=natureza)
        self.message_user(
            request,
            f"{total} registro(s) alterado(s) para {label}.",
        )

    def trocar_para_drogas(self, request, queryset):
        self._trocar_natureza(request, queryset, "DROGAS", "DROGAS")

    trocar_para_drogas.short_description = "🌿 Alterar tipo → DROGAS"

    def trocar_para_som(self, request, queryset):
        self._trocar_natureza(request, queryset, "SOM", "SOM")

    trocar_para_som.short_description = "🔊 Alterar tipo → SOM"

    def trocar_para_ameaca(self, request, queryset):
        self._trocar_natureza(request, queryset, "AMEACA", "AMEAÇA")

    trocar_para_ameaca.short_description = "⚡ Alterar tipo → AMEAÇA"

    def trocar_para_outros(self, request, queryset):
        self._trocar_natureza(request, queryset, "OUTROS", "OUTROS")

    trocar_para_outros.short_description = "📦 Alterar tipo → OUTROS"
    # ─────────────────────────────────────────────────────────────────────────

    def status_badge(self, obj):
        cores = {
            "conferencia": "#f59e0b",
            "cofre": "#3b82f6",
            "incineracao": "#8b5cf6",
            "queima_pronta": "#10b981",
            "excluido": "#ef4444",
        }
        labels = {
            "conferencia": "Aguardando Conferência",
            "cofre": "No Cofre",
            "incineracao": "P. Queima",
            "queima_pronta": "Incinerado",
            "excluido": "Excluído",
        }
        cor = cores.get(obj.status, "#6b7280")
        label = labels.get(obj.status, obj.status)
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 8px;'
            'border-radius:4px;font-size:11px;font-weight:bold;">{}</span>',
            cor,
            label,
        )

    status_badge.short_description = "Status"

    def has_add_permission(self, request):
        # Somente superusuários podem criar registros pelo admin
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser or request.user.is_staff


@admin.register(LoteIncineracao)
class LoteIncineracaoAdmin(admin.ModelAdmin):
    list_display = (
        "protocolo",
        "numero",
        "ano",
        "origem",
        "total_itens",
        "data_criacao",
    )
    readonly_fields = ("data_criacao", "protocolo")
    search_fields = ("protocolo", "origem")
    list_filter = ("ano", "origem")
    ordering = ("-numero",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_total_itens=Count("apreensoes"))

    def total_itens(self, obj):
        return obj._total_itens

    total_itens.admin_order_field = "_total_itens"
    total_itens.short_description = "Itens"

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser or request.user.is_staff


@admin.register(Historico)
class HistoricoAdmin(admin.ModelAdmin):
    list_display = ("apreensao", "usuario", "acao", "data")
    readonly_fields = ("apreensao", "acao", "data")
    list_filter = ("data",)
    search_fields = ("apreensao__bou", "apreensao__processo", "acao")
    ordering = ("-data",)

    def has_add_permission(self, request):
        return False  # Histórico nunca deve ser criado manualmente

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser or request.user.is_staff


@admin.register(Policial)
class PolicialAdmin(admin.ModelAdmin):
    list_display = ("patente", "nome", "rg", "unidade_origem")
    search_fields = ("nome", "rg", "unidade_origem")
    list_filter = ("patente", "unidade_origem")


@admin.register(DiarioServico)
class DiarioServicoAdmin(admin.ModelAdmin):
    list_display = ("data_inicio", "data_fim", "operador", "data_criacao")
    search_fields = ("operador__username", "alteracoes")
    list_filter = ("data_inicio", "operador")
