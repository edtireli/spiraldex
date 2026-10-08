"""Exercise the same pure Java URL policy used by Android, without an emulator."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PairingAddressTests(unittest.TestCase):
    def test_android_url_policy(self):
        java_home = os.environ.get('JAVA_HOME')
        javac = str(Path(java_home) / 'bin/javac') if java_home else shutil.which('javac')
        java = str(Path(java_home) / 'bin/java') if java_home else shutil.which('java')
        if not javac or not java:
            self.skipTest('Set JAVA_HOME to a JDK to test Android pairing addresses')
        with tempfile.TemporaryDirectory(prefix='spiraldex-java-test-') as classes:
            subprocess.run([javac, '-d', classes,
                            str(ROOT / 'android/app/src/main/java/app/spiraldex/PairingAddress.java'),
                            str(ROOT / 'tests/java/app/spiraldex/PairingAddressTest.java')], check=True)
            subprocess.run([java, '-cp', classes, 'app.spiraldex.PairingAddressTest'], check=True)
