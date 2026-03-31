from django.test import TestCase
from custodia.models import LoteIncineracao, Apreensao
from django.contrib.auth.models import User

class LoteIncineracaoTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username='admin', password='pass', email='admin@tcip.com')
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
        self.assertEqual(self.lote.history.count(), 2) # Create + Update
        self.assertEqual(self.lote.history.first().numero, 99)

class ApreensaoTest(TestCase):
    def setUp(self):
        self.apreensao = Apreensao.objects.create(
            processo="001", 
            bou="BOU-001", 
            reu="John Doe", 
            substancia="Cannabis", 
            peso=1.5, 
            unidade="kg"
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
