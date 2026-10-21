from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("backend.urls")),
    path("", lambda request: JsonResponse({"sistema": "AgroPet", "api": "/api/"})),
]
