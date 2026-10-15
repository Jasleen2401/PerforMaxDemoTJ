import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Password resets based on seed scripts
resets = [
    ('admin',          'AdminPassword123!'),
    ('hr_sarah',       'SarahPassword123!'),
    ('manager_marcus', 'MarcusPassword123!'),
    ('manager_elena',  'ElenaPassword123!'),
    ('intern_liam',    'liam'),
    ('intern_maya',    'maya'),
    ('intern_alex',    'alex'),
]

print("=== Resetting Passwords ===")
for username, password in resets:
    try:
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"  {username} -> password set to: {password}  [DONE]")
    except User.DoesNotExist:
        print(f"  {username} -> NOT FOUND")

print("\n=== All done! ===")
