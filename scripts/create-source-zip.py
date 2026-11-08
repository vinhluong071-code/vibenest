from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "vibenest-source.zip"
EXCLUDED_DIRS = {".git", "node_modules", ".next", ".vercel", "coverage", "dist", "artifacts", ".turbo", ".gradle", "build"}
SECRET_FILENAMES = {".env", ".env.production", ".env.local", ".env.development", ".env.test"}

def should_include(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(part in EXCLUDED_DIRS for part in relative.parts):
        return False
    if path.name in SECRET_FILENAMES:
        return False
    if path.name.startswith(".env.") and path.name != ".env.production.example":
        return False
    if path.suffix in {".keystore", ".jks", ".p12", ".mobileprovision"}:
        return False
    return path.is_file()

def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(path for path in ROOT.rglob("*") if should_include(path))
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED, compresslevel=8) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())
    print(f"Created {OUTPUT.relative_to(ROOT)} with {len(files)} files")

if __name__ == "__main__":
    main()
