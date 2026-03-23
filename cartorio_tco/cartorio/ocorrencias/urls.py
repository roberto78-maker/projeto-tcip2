from django.urls import path
from . import views

urlpatterns = [

    path('', views.lista_ocorrencias, name='lista_ocorrencias'),

    path('nova/', views.nova_ocorrencia, name='nova_ocorrencia'),

    path('<int:id>/', views.detalhe_ocorrencia, name='detalhe_ocorrencia'),

    path('<int:id>/relatorio/', views.relatorio_ocorrencia, name='relatorio_ocorrencia'),

    path('<int:id>/release/', views.release_ocorrencia, name='release_ocorrencia'),

]