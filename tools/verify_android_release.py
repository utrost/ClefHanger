#!/usr/bin/env python3
"""Check that a published test APK can update the persistent signing series."""
import argparse
import os
from pathlib import Path
import re
import subprocess


def find_build_tools():
    sdk = Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
    return sorted((sdk / 'build-tools').glob('*'))[-1]


def verify(apk, build_tools, expected_version, expected_certificate):
    certificates = subprocess.run(
        [str(build_tools / 'apksigner'), 'verify', '--print-certs', str(apk)],
        check=True, capture_output=True, text=True,
    ).stdout
    # Build-tools 36 labels this "Signer #1"; 37 uses "V3.0 Signer:".
    # Accept repeated certificates across schemes, but never a different signer.
    fingerprints = {
        f.lower() for f in re.findall(
            r'^.*certificate SHA-256 digest: ([0-9a-fA-F]+)\s*$',
            certificates, re.MULTILINE,
        )
    }
    if fingerprints != {expected_certificate.strip().lower()}:
        raise ValueError(f'APK certificate check failed; observed public fingerprints: {sorted(fingerprints)}')
    package = subprocess.run(
        [str(build_tools / 'aapt'), 'dump', 'badging', str(apk)],
        check=True, capture_output=True, text=True,
    ).stdout
    if not re.search(r"package: name='com.simiono.clefhanger' versionCode='" + str(expected_version) + "'", package):
        raise ValueError('Unexpected application ID or version code')
    print(f'Verified persistent test certificate and Android build number {expected_version}.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--version', required=True, type=int)
    parser.add_argument('--build-tools', type=Path)
    args = parser.parse_args()
    build_tools = args.build_tools
    if build_tools is None:
        build_tools = find_build_tools()
    verify(args.apk, build_tools, args.version,
           (Path(__file__).parent / 'android/test-signing.sha256').read_text())
