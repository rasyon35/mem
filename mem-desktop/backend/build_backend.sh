#!/bin/bash
set -e

# Change to the script's directory (backend)
cd "$(dirname "$0")"

echo "Creating virtual environment for build..."
python3 -m venv .venv-build
source .venv-build/bin/activate

echo "Installing requirements..."
pip install -r requirements.txt
pip install pyinstaller

echo "Building executable with PyInstaller..."
# We use packaging/launcher.py as the entry point
pyinstaller --onefile --add-data "db.sqlite3:." --add-data "backend:backend" --add-data "ingest:ingest" --hidden-import=django --collect-all sentence_transformers --collect-all sklearn --name backend packaging/launcher.py

echo "Build complete. Executable is at dist/backend"
