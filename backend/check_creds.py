import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import authenticate

test_creds = [
    ('admin', 'admin123'),
    ('admin', 'admin'),
    ('admin', 'password'),
    ('admin', 'Admin@123'),
    ('admin', 'performax123'),
    ('manager_elena', 'manager123'),
    ('manager_elena', 'password'),
    ('manager_elena', 'Manager@123'),
    ('manager_marcus', 'manager123'),
    ('intern_liam', 'intern123'),
    ('intern_liam', 'password'),
    ('hr_sarah', 'hr123'),
    ('hr_sarah', 'password'),
]

print("=== Credential Check ===")
for u, p in test_creds:
    result = authenticate(username=u, password=p)
    status = "OK" if result else "FAIL"
    print(f"  {u} / {p} -> {status}")
