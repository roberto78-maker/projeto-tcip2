import os
from datetime import timedelta
from pathlib import Path

import cloudinary
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-temp-key")

DEBUG = os.environ.get("DEBUG", "False") == "True"

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    X_FRAME_OPTIONS = "SAMEORIGIN"

ALLOWED_HOSTS = ["*"]

RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_csv",
    "corsheaders",
    "cloudinary",
    "cloudinary_storage",
    "django_filters",
    "drf_yasg",
    "custodia",
    "simple_history",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR.parent / "cartorio_tcip_2" / "dist"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        ssl_require=os.environ.get("DATABASE_URL", "").startswith("postgres")
        and not DEBUG,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = []

if DEBUG:
    STATICFILES_DIRS = [
        BASE_DIR.parent / "cartorio_tcip_2" / "dist",
    ]

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.environ.get("CLOUD_NAME", ""),
    "API_KEY": os.environ.get("API_KEY", ""),
    "API_SECRET": os.environ.get("API_SECRET", ""),
    "SECURE": True,
}

cloudinary.config(
    cloud_name=os.environ.get("CLOUD_NAME"),
    api_key=os.environ.get("API_KEY"),
    api_secret=os.environ.get("API_SECRET"),
    secure=True,
)

USE_CLOUDINARY = all(
    [
        os.environ.get("CLOUD_NAME"),
        os.environ.get("API_KEY"),
        os.environ.get("API_SECRET"),
    ]
)

if USE_CLOUDINARY:
    STORAGES = {
        "default": {
            "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
        },
        "staticfiles": {
            "BACKEND": "backend.storage.TolerantWhiteNoiseStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "backend.storage.TolerantWhiteNoiseStorage",
        },
    }
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

CSRF_TRUSTED_ORIGINS = [
    "https://backend-tcip.onrender.com",
    "https://*.vercel.app",
]

FRONTEND_URL = os.environ.get("FRONTEND_URL")
if FRONTEND_URL and FRONTEND_URL not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(FRONTEND_URL)

if DEBUG:
    # Em dev: aceita o Vite dev server (localhost e IP de rede local)
    CORS_ALLOW_ALL_ORIGINS = True  # simplifica dev com dispositivos externos
    CORS_ALLOW_CREDENTIALS = True
else:
    # Em produção: Django serve o próprio frontend (mesmo domínio = sem CORS)
    # Só libera origens externas explicitamente configuradas
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOWED_ORIGINS = [
        "https://backend-tcip.onrender.com",
        "https://projeto-tcip2.vercel.app",
    ]
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https://projeto-tcip2.*\.vercel\.app$",
    ]
    # Adiciona FRONTEND_URL se configurada (ex: domínio customizado)
    _extra_cors = os.environ.get("FRONTEND_URL")
    if _extra_cors and _extra_cors not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_extra_cors)


CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

ADMIN_URL = os.environ.get("ADMIN_URL", "tcip-painel-restrito")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
        "rest_framework_csv.renderers.CSVRenderer",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "custodia": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

SWAGGER_SETTINGS = {
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT token. Example: Bearer <token>",
        }
    },
    "BASE_THROTTLE_CLASS": "rest_framework.throttling.AnonRateThrottle",
    "DEFAULT_MODEL_SORTING": ("name",),
    "DEFAULT_API_INFO": {
        "contact": {"email": "admin@tcip.com"},
        "description": "API do Sistema de Gestao de Custodia TCIP",
        "license": {"name": "MIT"},
        "title": "TCIP API",
        "version": "1.0.0",
    },
    "DEFAULT_AUTO_SCHEMA_CLASS": "drf_yasg.inspectors.SwaggerAutoSchema",
}

REDOC_SETTINGS = {
    "SPEC_URL": "/swagger/json/",
    "PATH_IN_MIDDLEWARE": "middle",
}
