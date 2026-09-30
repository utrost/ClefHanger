import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("verify", Path(__file__).parents[1] / "verify_store_build.py")
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def elf(machine=183, alignment=16384):
    data = bytearray(120)
    data[:6] = b"\x7fELF\x02\x01"
    struct.pack_into("<H", data, 18, machine)
    struct.pack_into("<Q", data, 32, 64)
    struct.pack_into("<HH", data, 54, 56, 1)
    struct.pack_into("<IIQQQQQQ", data, 64, 1, 5, 0, 0, 0, 120, 120, alignment)
    return data


class PackagingTest(unittest.TestCase):
    def test_rejects_4k_and_truncated_native_code(self):
        verify.verify_elf(elf())
        for data in (elf(alignment=4096), elf()[:70]):
            with self.assertRaises(ValueError):
                verify.verify_elf(data)

    def test_rejects_google_sdk_and_missing_aot_library(self):
        for bad_dex, missing_aot in ((False, False), (True, False), (False, True)):
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "candidate.apk"
                with zipfile.ZipFile(path, "w") as archive:
                    archive.writestr("assets/flutter_assets/assets/legal/LICENSE.txt", "AGPL-3.0-or-later")
                    archive.writestr("classes.dex", b"Lcom/google/android/gms/Foo;" if bad_dex else b"Landroid/media/AudioTrack;")
                    for abi, machine in verify.SUPPORTED.items():
                        for lib in ("libflutter.so", "libapp.so", "libclefhanger_core.so"):
                            if missing_aot and lib == "libapp.so":
                                continue
                            archive.writestr(f"lib/{abi}/{lib}", elf(machine))
                if bad_dex or missing_aot:
                    with self.assertRaises(ValueError):
                        verify.verify_archive(path)
                else:
                    verify.verify_archive(path)


if __name__ == "__main__":
    unittest.main()
