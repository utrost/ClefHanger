#!/usr/bin/env python3
"""Install the CI test signing key only if its public certificate matches."""
import base64
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile


def install(encoded, destination, expected):
    if not encoded:
        raise ValueError('CLEFHANGER_TEST_KEYSTORE is required; refusing an ephemeral signing key')
    data = base64.b64decode(encoded, validate=True)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Validate before replacing anything. Neither key bytes nor passwords enter logs.
    with tempfile.NamedTemporaryFile(dir=destination.parent) as candidate:
        candidate.write(data)
        candidate.flush()
        certificate = subprocess.run(
            ['keytool', '-exportcert', '-keystore', candidate.name,
             '-storepass', 'android', '-alias', 'androiddebugkey'],
            check=True, capture_output=True,
        ).stdout
        if hashlib.sha256(certificate).hexdigest() != expected.strip().lower():
            raise ValueError('Signing certificate differs from the pinned test certificate')
        os.chmod(candidate.name, 0o600)
        # Atomic replace; NamedTemporaryFile still owns its original path.
        staged = destination.with_suffix('.staged')
        try:
            with staged.open('wb') as output:
                os.chmod(staged, 0o600)
                output.write(data)
            staged.replace(destination)
        finally:
            staged.unlink(missing_ok=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', required=True, type=Path)
    args = parser.parse_args()
    try:
        install(
            os.environ.get('CLEFHANGER_TEST_KEYSTORE', ''),
            args.destination,
            (Path(__file__).parent / 'android/test-signing.sha256').read_text(),
        )
    except (ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'Cannot install stable test signing key: {error}')
