from django.urls import path
from .upload import upload_file  # Import the upload view

urlpatterns = [
    path('upload/', upload_file, name='upload_file'),  # This must match the frontend request
]
