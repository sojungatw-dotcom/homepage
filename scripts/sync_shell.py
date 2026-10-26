"""Update shared header/footer in static pages; --check verifies without writing."""
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    ('report.html', 'REPORT'), ('contents.html', 'CONTENTS'),
    ('sns.html', 'SNS'), ('final.html', 'FINAL PROJECT'),
    ('brand.html', 'BRAND'), ('service.html', 'SERVICE'),
)


def render_page(path):
    text = path.read_text()
    links = []
    for href, label in PAGES:
        current = ' class="is-active" aria-current="page"' if path.name == href else ''
        links.append(f'<a{current} href="{href}">{label}</a>')
    header = (ROOT / 'components/header.html').read_text().strip()
    header = header.replace('{{navigation}}', ''.join(links))
    footer = (ROOT / 'components/footer.html').read_text().strip()
    text, header_count = re.subn(r'<header class="site-header">.*?</header>', lambda _: header, text, count=1, flags=re.S)
    text, footer_count = re.subn(r'<footer class="site-footer">.*?</footer>', lambda _: footer, text, count=1, flags=re.S)
    if (header_count, footer_count) != (1, 1):
        raise ValueError(f'{path.name}: shared shell not found')
    return text


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    changed = []
    for name in ['index.html', *(name for name, _ in PAGES)]:
        path = ROOT / name
        rendered = render_page(path)
        if rendered != path.read_text():
            changed.append(name)
            if not args.check:
                path.write_text(rendered)
    if args.check and changed:
        raise SystemExit('Run python3 scripts/sync_shell.py: ' + ', '.join(changed))
    print('Shared shell verified on 7 pages.' if args.check else f'Updated {len(changed)} pages.')


if __name__ == '__main__':
    main()
