"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import subprocess
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# 🚀 TAREFAS DE BOOT (Render script automatizado preventivo)
try:
    print("⏳ Executando migrate no boot (Fail-safe)...")
    subprocess.run(["python", "manage.py", "migrate"], check=True)
    print("✅ Migrate concluído.")

    print("⏳ Executando collectstatic no boot (Fail-safe)...")
    subprocess.run(["python", "manage.py", "collectstatic", "--no-input"], check=True)
    print("✅ Collectstatic concluído.")
except Exception as e:
    print(f"❌ Erro nas tarefas de boot (manage.py): {e}")

application = get_wsgi_application()


# 🔐 Criação automática de superuser (Render - sem shell)
from django.contrib.auth import get_user_model  # noqa: E402


def create_superuser():
    User = get_user_model()

    username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin")
    email = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@email.com")
    password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin123")

    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username, email, password)
        print("✅ Superuser criado automaticamente!")


try:
    create_superuser()
except Exception as e:
    print(f"Erro ao criar superuser: {e}")
