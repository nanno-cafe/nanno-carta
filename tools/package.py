"""Paquete para subir a un repositorio nuevo desde el navegador."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
files = ['index.html', 'admin.html', 'store.js', 'admin.js', 'data.js', 'core.js', 'theme.js', 'styles.css', 'package.json', 'package-lock.json', 'vite.config.js', 'vercel.json', '.gitignore', '.env.example', 'README.md']
output = root / 'nanno-carta-github.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, name)
    for folder in ['public', 'supabase', 'tests', 'tools']:
        for file in (root / folder).rglob('*'):
            if file.is_file() and 'screenshots' not in file.parts:
                archive.write(file, file.relative_to(root))
print(output)
