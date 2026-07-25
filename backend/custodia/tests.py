import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from custodia.models import Apreensao, LoteIncineracao


class LoteIncineracaoTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="admin", password="pass", email="admin@tcip.com"
        )
        self.lote = LoteIncineracao.objects.create(numero=1, ano=2026)

    def test_protocol_generation(self):
        """Verify that protocol is generated correctly on save"""
        self.assertEqual(self.lote.protocolo, "1ºCART6BPM-000001-2026")

    def test_audit_log_works(self):
        """Verify that simple-history is tracking changes"""
        # Change something
        self.lote.numero = 99
        self.lote.save()

        # Check history
        self.assertEqual(self.lote.history.count(), 2)  # Create + Update
        self.assertEqual(self.lote.history.first().numero, 99)


class ApreensaoTest(TestCase):
    def setUp(self):
        self.apreensao = Apreensao.objects.create(
            processo="001",
            bou="BOU-001",
            reu="John Doe",
            substancia="Cannabis",
            peso=1.5,
            unidade="kg",
        )

    def test_default_status(self):
        """Ensure initial status is 'conferencia'"""
        self.assertEqual(self.apreensao.status, "conferencia")

    def test_audit_trail(self):
        """Check if changes in 'Apreensao' are logged"""
        self.apreensao.status = "deposito"
        self.apreensao.save()

        history = self.apreensao.history.latest()
        self.assertEqual(history.status, "deposito")


class AssinaturaSecurancaTest(TestCase):
    def setUp(self):
        self.token_valido = uuid.uuid4()
        self.apreensao = Apreensao.objects.create(
            processo="002",
            bou="BOU-002",
            reu="Jane Doe",
            substancia="Cocaine",
            peso=2.0,
            unidade="kg",
            token_assinatura=self.token_valido,
            token_expira_em=timezone.now() + timedelta(minutes=30),
        )

    def test_receber_assinatura_token_correto(self):
        """Verifica que assinatura é salva com token correto"""
        url = reverse("assinatura_receber")
        data = {
            "token": str(self.token_valido),
            "bou": "BOU-002",
            "assinatura_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }
        response = self.client.post(url, data, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.apreensao.refresh_from_db()
        self.assertTrue(self.apreensao.assinatura_base64.startswith("data:image/"))

    def test_receber_assinatura_dupla_cartorario_sem_token(self):
        """Verifica que a assinatura do cartorário também é salva quando enviada"""
        url = reverse("assinatura_receber")
        data = {
            "token": str(self.token_valido),
            "bou": "BOU-002",
            "assinatura_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "assinatura_cartorario_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }
        response = self.client.post(url, data, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.apreensao.refresh_from_db()
        self.assertTrue(self.apreensao.assinatura_base64.startswith("data:image/"))
        self.assertTrue(
            self.apreensao.assinatura_cartorario_base64.startswith("data:image/")
        )
        self.assertEqual(self.apreensao.tipo_assinatura_cartorario, "MANUAL")

    def test_receber_assinatura_token_incorreto(self):
        """Verifica que erro é retornado com token incorreto para o BOU"""
        url = reverse("assinatura_receber")
        token_errado = uuid.uuid4()
        data = {
            "token": str(token_errado),
            "bou": "BOU-002",
            "assinatura_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }
        response = self.client.post(url, data, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.apreensao.refresh_from_db()
        self.assertTrue(not self.apreensao.assinatura_base64)

    def test_status_assinatura_token_incorreto(self):
        """Verifica que status de assinatura retorna assinado=False com token incorreto"""
        url = reverse("assinatura_status")
        token_errado = uuid.uuid4()

        # Define uma assinatura na apreensão para simular que está assinado no DB
        self.apreensao.assinatura_base64 = "data:image/png;base64,fake"
        self.apreensao.save()

        # Tenta buscar usando o BOU mas com token errado
        response = self.client.get(f"{url}?token={token_errado}&bou=BOU-002")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["assinado"])

    def test_apreensao_create_validation_error(self):
        """Verifica que erros de validação retornam 400 em vez de 500"""
        url = reverse("apreensao-list")
        from django.contrib.auth.models import User

        user = User.objects.create_user(username="testuser", password="password")
        self.client.force_login(user)

        data = {
            "processo": "003",
            "bou": "BOU-003",
            "reu": "Mary Doe",
            "peso": "invalido",  # causa ValidationError no serializer
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("peso", response.json())

    def test_destinar_incineracao(self):
        """Verifica que o endpoint destinar_incineracao funciona corretamente"""
        from django.contrib.auth.models import User

        user = User.objects.create_user(
            username="testuser_incineracao", password="password"
        )
        self.client.force_login(user)

        # 1. Deve falhar com 400 se não tiver PDF
        url = reverse(
            "apreensao-destinar-incineracao", kwargs={"pk": self.apreensao.id}
        )
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

        # 2. Configura PDF na apreensão
        self.apreensao.arquivo_pdf_url = "https://example.com/laudo.pdf"
        self.apreensao.save()

        # 3. Deve ter sucesso e criar o lote se não houver lote aberto
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.apreensao.refresh_from_db()
        self.assertEqual(self.apreensao.status, "incineracao")
        self.assertIsNotNone(self.apreensao.lote_incineracao)
        self.assertEqual(self.apreensao.lote_incineracao.numero, 1)

        # 4. Outra apreensão deve ir para o mesmo lote (pois tem menos de 20 itens)
        apreensao2 = Apreensao.objects.create(
            processo="002",
            bou="BOU-002",
            reu="Jane Doe",
            substancia="Cannabis",
            peso=2.5,
            unidade="kg",
            arquivo_pdf_url="https://example.com/laudo2.pdf",
        )
        url2 = reverse("apreensao-destinar-incineracao", kwargs={"pk": apreensao2.id})
        response2 = self.client.post(url2)
        self.assertEqual(response2.status_code, 200)
        apreensao2.refresh_from_db()
        self.assertEqual(apreensao2.lote_incineracao, self.apreensao.lote_incineracao)
