#!/usr/bin/env python3
"""Fail closed on debug APKs, Google SDK references and incompatible native libraries."""
import argparse
from pathlib import Path
import struct
import subprocess
import zipfile

SUPPORTED = {"arm64-v8a": 183, "x86_64": 62}


def verify_elf(data):
    if data[:6] != b'\x7fELF\x02\x01':
        raise ValueError('Expected a little-endian 64-bit ELF')
    try:
        start = struct.unpack_from('<Q', data, 32)[0]
        size, count = struct.unpack_from('<HH', data, 54)
        if size < 56 or not count or start + size * count > len(data):
            raise ValueError('Invalid ELF program headers')
        loads = 0
        for i in range(count):
            kind, _, offset, address, _, _, _, alignment = struct.unpack_from(
                '<IIQQQQQQ', data, start + size * i)
            if kind == 1:
                loads += 1
                if alignment < 16384 or alignment & (alignment - 1) or (address - offset) % 16384:
                    raise ValueError('Native library is not 16 KB page aligned')
        if not loads:
            raise ValueError('Native library has no loadable segments')
    except struct.error as error:
        raise ValueError('Truncated ELF') from error


def verify_archive(path):
    prefix = 'base/' if path.suffix == '.aab' else ''
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        libraries = [n for n in names if n.startswith(prefix + 'lib/') and n.endswith('.so')]
        if {n.split('/')[-2] for n in libraries} != set(SUPPORTED):
            raise ValueError('Missing or unexpected native architectures')
        for abi in SUPPORTED:
            for lib in ['libflutter.so', 'libapp.so', 'libclefhanger_core.so']:
                if prefix + f'lib/{abi}/{lib}' not in names:
                    raise ValueError(f'Missing release library {abi}/{lib}')
        for name in libraries:
            data = archive.read(name)
            try:
                verify_elf(data)
                abi = name.split('/')[-2]
                if int.from_bytes(data[18:20], 'little') != SUPPORTED[abi]:
                    raise ValueError('Wrong native architecture')
            except ValueError as error:
                raise ValueError(f'{name}: {error}') from error
        if prefix + 'assets/flutter_assets/assets/legal/LICENSE.txt' not in names:
            raise ValueError('Missing bundled project licence')
        dex = [n for n in names if n.endswith('.dex')]
        if not dex:
            raise ValueError('Missing Android executable code')
        for name in dex:
            data = archive.read(name)
            if b'Lcom/google/android/gms/' in data or b'Lcom/google/firebase/' in data:
                raise ValueError(f'Proprietary Google SDK references in {name}')


def verify_apk_manifest(path, build_tools):
    badging = subprocess.check_output([str(build_tools / 'aapt'), 'dump', 'badging', str(path)], text=True)
    if 'application-debuggable' in badging:
        raise ValueError('Store APK is debuggable')
    if "targetSdkVersion:'36'" not in badging:
        raise ValueError('Unexpected target SDK')
    if "package: name='com.simiono.clefhanger'" not in badging:
        raise ValueError('Unexpected package ID')
    if 'android.permission.INTERNET' in badging:
        raise ValueError('Offline release unexpectedly requests internet access')
    if 'android.permission.RECORD_AUDIO' not in badging:
        raise ValueError('Missing microphone permission')
    subprocess.run([str(build_tools / 'zipalign'), '-c', '-P', '16', '4', str(path)], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact', type=Path)
    parser.add_argument('--build-tools', type=Path)
    args = parser.parse_args()
    verify_archive(args.artifact)
    if args.artifact.suffix == '.apk':
        if not args.build_tools:
            parser.error('--build-tools is required for APK manifest and ZIP checks')
        verify_apk_manifest(args.artifact, args.build_tools)
    print('Verified release native code, 16 KB ELF alignment, and absence of Google SDK references.')
