"""Create a private local pairing identity, or show an existing identity to its owner."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import ssl
import subprocess


def identity_dir():
    return Path(os.environ.get('SPIRALDEX_IDENTITY', os.environ.get(
        'SPIRALCHAT_GATEWAY_DIR', str(Path.home() / '.spiraldex')))).expanduser()


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    paths = [directory / name for name in ('config.json', 'cert.pem', 'key.pem')]
    if any(p.exists() for p in paths):
        if not all(p.is_file() for p in paths):
            raise SystemExit('Pairing identity is incomplete. Restore its missing files; existing keys were not replaced.')
        return
    previous = os.umask(0o077)
    try:
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:3072', '-nodes',
                        '-keyout', str(paths[2]), '-out', str(paths[1]), '-days', '365',
                        '-subj', '/CN=SpiralDex Local Host'], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        paths[0].write_text(json.dumps({'token': secrets.token_urlsafe(32)}) + '\n')
    finally:
        os.umask(previous)


def show(directory, port):
    config = json.loads((directory / 'config.json').read_text())
    der = ssl.PEM_cert_to_DER_cert((directory / 'cert.pem').read_text())
    fingerprint = hashlib.sha256(der).hexdigest()
    addresses = []
    for interface in ('en0', 'en1'):
        result = subprocess.run(['ipconfig', 'getifaddr', interface], capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            addresses.append(result.stdout.strip())
    print('\nSpiralDex · private Mac pairing details')
    for address in addresses:
        print(f'Mac address: https://{address}:{port}')
    if not addresses:
        print(f'Mac address: https://<your-Mac-LAN-IP>:{port}')
    print(f'Pairing token: {config["token"]}')
    print(f'Certificate SHA-256: {fingerprint}')
    print('Enter these in the Android app’s Mac connection screen. Keep the token private.\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8445)
    args = parser.parse_args()
    identity = identity_dir()
    prepare(identity)
    show(identity, args.port)
