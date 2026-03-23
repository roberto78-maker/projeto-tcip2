from django.contrib import admin
from .models import Despesa, Receita, Categoria

admin.site.register(Despesa)
admin.site.register(Receita)
admin.site.register(Categoria)