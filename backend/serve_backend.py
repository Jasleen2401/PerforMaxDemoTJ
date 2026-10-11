import os
import sys
import time
from pathlib import Path

# Add directories to sys.path
base_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(base_dir))
sys.path.insert(0, str(base_dir / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django
django.setup()

from config.wsgi import application
from waitress import serve

def run():
    print("[Performax] Starting resilient Waitress server on http://127.0.0.1:8000...")
    while True:
        try:
            serve(application, host='127.0.0.1', port=8000, threads=8)
        except Exception as e:
            print(f"[Performax] Server error: {e}. Restarting in 1s...")
            time.sleep(1)

if __name__ == '__main__':
    run()
