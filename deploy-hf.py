#!/usr/bin/env python3
"""
Script de despliegue automático en Hugging Face Spaces (CLI)
=============================================================
Uso:
  python deploy-hf.py <tu_hf_token> [nombre_del_espacio]
"""

import sys
import os
from huggingface_hub import HfApi, create_repo

def main():
    if len(sys.argv) < 2:
        print("🎬 Despliegue Automático en Hugging Face Spaces (CLI)")
        print("=" * 55)
        print("Uso:")
        print("  python deploy-hf.py <TU_HF_WRITE_TOKEN> [nombre_espacio]")
        print("\n💡 Consigue tu token gratuito en: https://huggingface.co/settings/tokens (Rol: write)")
        sys.exit(1)

    hf_token = sys.argv[1].strip()
    space_name = sys.argv[2].strip() if len(sys.argv) > 2 else "pelis-stream"

    api = HfApi(token=hf_token)
    user_info = api.whoami()
    username = user_info["name"]
    repo_id = f"{username}/{space_name}"

    print(f"\n🚀 Autenticado como: @{username}")
    print(f"📦 Creando/verificando Space Docker: {repo_id}...")

    try:
        create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True,
            token=hf_token
        )
        print("✅ Space configurado con Docker SDK.")
    except Exception as e:
        print(f"⚠️ Aviso al crear repositorio: {e}")

    project_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"📤 Subiendo archivos desde: {project_dir}...")

    api.upload_folder(
        folder_path=project_dir,
        repo_id=repo_id,
        repo_type="space",
        ignore_patterns=["node_modules/**", ".git/**", "tmp/**", "*.log"],
        token=hf_token
    )

    space_url = f"https://{username}-{space_name}.hf.space"
    dashboard_url = f"https://huggingface.co/spaces/{repo_id}"

    print("\n" + "=" * 55)
    print("🎉 ¡Despliegue completado con éxito!")
    print(f"🌐 Dashboard / Logs: {dashboard_url}")
    print(f"📡 Tu Servidor Cloud Stream: {space_url}")
    print("=" * 55)
    print("\n💡 Hugging Face tardará ~1 minuto en compilar el contenedor.")
    print("Una vez listo, abre la URL pública para reproducir o enviar a VLC.")

if __name__ == "__main__":
    main()
