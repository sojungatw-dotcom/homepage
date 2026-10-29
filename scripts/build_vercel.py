"""Copy only browser assets to the Vercel static output. Never read .env."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'public'
PUBLIC_DIRS = ('assets', 'css', 'js', 'data', 'components', 'oryukdo-cardnews')
EXTENSIONS = {'.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg',
              '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.mp4', '.webm', '.zip'}


def build():
    if OUTPUT.is_symlink():
        raise RuntimeError('public must not be a symlink')
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    sources = list(ROOT.glob('*.html'))
    for directory in PUBLIC_DIRS:
        sources.extend((ROOT / directory).rglob('*'))
    count = 0
    for source in sources:
        relative = source.relative_to(ROOT)
        if (source.is_symlink() or not source.is_file() or source.suffix.lower() not in EXTENSIONS
                or any(part.startswith('.') for part in relative.parts)
                or any(parent.is_symlink() for parent in source.parents if parent != ROOT)):
            continue
        destination = OUTPUT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        count += 1
    print(f'Vercel static output: {count} public files')


if __name__ == '__main__':
    build()
