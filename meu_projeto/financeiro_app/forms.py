from django import forms
from .models import Despesa, Receita

class DespesaForm(forms.ModelForm):
    class Meta:
        model = Despesa
        fields = ['data', 'vencimento', 'categoria', 'descricao', 'valor', 'paga', 'recorrente']
        widgets = {
            'data': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'vencimento': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'categoria': forms.TextInput(attrs={'class': 'form-control'}),
            'descricao': forms.TextInput(attrs={'class': 'form-control'}),
            'valor': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'paga': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'recorrente': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

class ReceitaForm(forms.ModelForm):
    class Meta:
        model = Receita
        fields = ['data', 'vencimento', 'tipo', 'descricao', 'valor', 'recebida', 'recorrente']
        widgets = {
            'data': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'vencimento': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'tipo': forms.TextInput(attrs={'class': 'form-control'}),
            'descricao': forms.TextInput(attrs={'class': 'form-control'}),
            'valor': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'recebida': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'recorrente': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
