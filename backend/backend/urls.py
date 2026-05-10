from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from custodia.views import (
    ApreensaoViewSet,
    LoteIncineracaoViewSet,
    RelatorioIncineracaoView,
    RelatorioIncineracaoPDFView,
    DashboardStatsView,
    UserProfileView,
    # ResetSystemView,
)

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# 🔒 Swagger só disponível em ambiente de desenvolvimento (DEBUG=True)
if settings.DEBUG:
    from drf_yasg.views import get_schema_view
    from drf_yasg import openapi

    schema_view = get_schema_view(
        openapi.Info(
            title="TCIP API",
            default_version="v1",
            description="API do Sistema de Gestão de Custódia TCIP",
            terms_of_service="https://www.tcip.com.br/terms/",
            contact=openapi.Contact(email="admin@tcip.com"),
            license=openapi.License(name="MIT License"),
        ),
        public=False,
        permission_classes=(permissions.IsAdminUser,),
    )

router = DefaultRouter()
router.register(r"apreensoes", ApreensaoViewSet)
router.register(r"lotes", LoteIncineracaoViewSet)

# 🔐 URL do Admin customizada — dificulta ataques automatizados
admin.site.site_header = "TCIP — Administração"
admin.site.site_title = "TCIP Admin"
admin.site.index_title = "Painel de Controle"

urlpatterns = [
    # 🔒 Admin em URL personalizada (não o padrão /admin/)
    path("tcip-painel-restrito/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # 📊 Relatórios de Auditoria
    path(
        "api/relatorios/incineracao/",
        RelatorioIncineracaoView.as_view(),
        name="relatorio_incineracao",
    ),
    path(
        "api/relatorios/incineracao/pdf/",
        RelatorioIncineracaoPDFView.as_view(),
        name="relatorio_incineracao_pdf",
    ),
    # 📈 Dashboard — aggregated stats (single DB query, replaces fetchAll)
    path(
        "api/dashboard/stats/",
        DashboardStatsView.as_view(),
        name="dashboard_stats",
    ),
    # 👤 User profile — returns operator's full name for documents
    path(
        "api/me/",
        UserProfileView.as_view(),
        name="user_profile",
    ),
    # path(
    #     "api/system/reset/",
    #     ResetSystemView.as_view(),
    #     name="system_reset",
    # ),
    # 🌐 Frontend SPA — captura tudo que não é API
    re_path(
        r"^(?!api|tcip-painel-restrito|static|media|swagger|redoc|favicon\.ico).*",
        TemplateView.as_view(template_name="index.html"),
    ),
]

# 📚 Swagger / ReDoc — APENAS em desenvolvimento local
if settings.DEBUG:
    urlpatterns += [
        path(
            "swagger/",
            schema_view.with_ui("swagger", cache_timeout=0),
            name="schema-swagger-ui",
        ),
        path(
            "redoc/",
            schema_view.with_ui("redoc", cache_timeout=0),
            name="schema-redoc",
        ),
        path(
            "swagger/json/",
            schema_view.without_ui(cache_timeout=0),
            name="schema-json",
        ),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
