from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from custodia.views import ApreensaoViewSet, LoteIncineracaoViewSet, RelatorioIncineracaoView, RelatorioIncineracaoPDFView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

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
    public=True,
    permission_classes=(permissions.AllowAny,),
)

router = DefaultRouter()
router.register(r"apreensoes", ApreensaoViewSet)
router.register(r"lotes", LoteIncineracaoViewSet)

from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # 📊 Relatórios de Auditoria
    path("api/relatorios/incineracao/", RelatorioIncineracaoView.as_view(), name="relatorio_incineracao"),
    path("api/relatorios/incineracao/pdf/", RelatorioIncineracaoPDFView.as_view(), name="relatorio_incineracao_pdf"),

    # 📚 Swagger / OpenAPI
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
    path("swagger/json/", schema_view.without_ui(cache_timeout=0), name="schema-json"),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    re_path(
        r"^(?!api/|admin/|static/|media/|swagger/|redoc/).*",
        TemplateView.as_view(template_name="index.html"),
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
