"""Copy the canonical web UI into Android and the static, sample-only demo."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
for dest in (ROOT / 'android/app/src/main/assets/dex', ROOT / 'docs/demo'):
    dest.mkdir(parents=True, exist_ok=True)
    for source in (ROOT / 'web').iterdir():
        target = dest / source.name
        if source.is_dir():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
    if dest == ROOT / 'docs/demo':
        for page in dest.glob('*.html'):
            page.write_text(page.read_text().replace('<body ', '<body data-demo="true" '))
print('Synced web → Android and sample demo.')
