#!/usr/bin/env python3
"""Explicitly sign and verify the finished APK, independent of Gradle defaults."""
import argparse
from pathlib import Path
import subprocess
from verify_android_release import find_build_tools, verify


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--keystore', required=True, type=Path)
    parser.add_argument('--version', required=True, type=int)
    parser.add_argument('--build-tools', type=Path)
    args = parser.parse_args()
    build_tools = args.build_tools or find_build_tools()
    signed = args.apk.with_name(args.apk.stem + '-signed.apk')
    try:
        subprocess.run([
            str(build_tools / 'apksigner'), 'sign',
            '--ks', str(args.keystore), '--ks-key-alias', 'androiddebugkey',
            '--ks-pass', 'pass:android', '--key-pass', 'pass:android',
            '--v4-signing-enabled', 'false', '--out', str(signed), str(args.apk),
        ], check=True)
        verify(signed, build_tools, args.version,
               (Path(__file__).parent / 'android/test-signing.sha256').read_text())
        signed.replace(args.apk)
    finally:
        signed.unlink(missing_ok=True)
