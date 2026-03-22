"""Root conftest — runs before any test module is imported."""
import ctypes.util
import os
import sys

# WeasyPrint needs system libraries (GLib, Pango, Cairo) that may not be on
# the default library search path. This patches ctypes.util.find_library to
# check platform-specific locations before falling back to the default search.
#
# macOS:   Homebrew installs to /opt/homebrew/lib (Apple Silicon) or /usr/local/lib (Intel)
# Windows: GTK3 runtime typically at C:\Program Files\GTK3-Runtime Win64\bin
# Linux:   usually works out of the box via ldconfig

_LIB_SEARCH_DIRS: list[str] = []

if sys.platform == "darwin":
    _LIB_SEARCH_DIRS = ["/opt/homebrew/lib", "/usr/local/lib"]
    _LIB_EXTENSIONS = (".dylib",)
elif sys.platform == "win32":
    _gtk_dir = os.path.join(os.environ.get("ProgramFiles", ""), "GTK3-Runtime Win64", "bin")
    _LIB_SEARCH_DIRS = [_gtk_dir]
    _LIB_EXTENSIONS = (".dll",)

_LIB_SEARCH_DIRS = [d for d in _LIB_SEARCH_DIRS if os.path.isdir(d)]

if _LIB_SEARCH_DIRS:
    _original_find = ctypes.util.find_library

    def _patched_find_library(name: str) -> str | None:
        for lib_dir in _LIB_SEARCH_DIRS:
            for ext in _LIB_EXTENSIONS:
                for candidate in (f"lib{name}{ext}", f"{name}{ext}"):
                    full = os.path.join(lib_dir, candidate)
                    if os.path.exists(full):
                        return full
        return _original_find(name)

    ctypes.util.find_library = _patched_find_library
