"""Build locally. No GitHub runner or remote build service is required."""
from pathlib import Path
import hashlib
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = '0.1.0'
DIST = ROOT / 'dist' / VERSION
DIST.mkdir(parents=True, exist_ok=True)
subprocess.run([sys.executable, str(ROOT / 'scripts/sync-web.py')], check=True)
if not (ROOT / 'android/signing.properties').is_file():
    raise SystemExit('Create android/signing.properties with your private release key first; see CONTRIBUTING.md.')
subprocess.run(['./gradlew', '--no-daemon', ':app:assembleRelease'], cwd=ROOT / 'android', check=True)
apk = ROOT / 'android/app/build/outputs/apk/release/app-release.apk'
shutil.copy2(apk, DIST / f'SpiralDex-{VERSION}.apk')
subprocess.run(['clang', '-O2', '-arch', 'arm64', '-arch', 'x86_64', '-mmacosx-version-min=14.0',
                '-framework', 'Foundation', '-framework', 'Vision', '-framework', 'CoreImage',
                '-framework', 'CoreVideo', '-framework', 'CoreGraphics',
                str(ROOT / 'host/segment.m'), '-o', str(ROOT / 'host/segment')], check=True)

def archive(name, files, readme=None):
    with zipfile.ZipFile(DIST / name, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(files):
            bundle.write(path, 'SpiralDex/' + str(path.relative_to(ROOT)))
        if readme:
            bundle.write(readme, 'SpiralDex/README.md')

host_files = [ROOT / n for n in ('Start SpiralDex.command', 'requirements.txt', 'LICENSE', 'PRIVACY.md', 'CREDITS.md')]
host_files += [f for folder in ('web', 'host') for f in (ROOT / folder).rglob('*')
               if f.is_file() and '__pycache__' not in f.parts]
host_files += list((ROOT / 'licenses').glob('*.txt'))
archive(f'SpiralDex-Mac-Host-{VERSION}.zip', host_files, ROOT / 'host/INSTALL.md')
archive(f'SpiralDex-Demo-{VERSION}.zip', [f for f in (ROOT / 'docs').rglob('*') if f.is_file()])
checks = []
for file in sorted(DIST.iterdir()):
    if file.suffix in ('.apk', '.zip'):
        checks.append(f'{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}')
(DIST / 'SHA256SUMS').write_text('\n'.join(checks) + '\n')
print(f'Release ready: {DIST}')
