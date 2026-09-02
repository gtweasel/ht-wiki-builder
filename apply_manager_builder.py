#!/usr/bin/env python3
from __future__ import annotations

import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANAGER_VERSION = "0.1.0"


def find_project_root(base: Path) -> Path:
    if (base / "index.html").exists():
        return base
    candidates = [p.parent for p in base.rglob("index.html") if (p.parent / "versions.js").exists()]
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        raise RuntimeError("Could not find project root containing index.html and versions.js")
    candidates.sort(key=lambda p: len(p.parts))
    return candidates[0]


def add_object_property(text: str, object_name: str, key: str, value: str) -> str:
    if re.search(rf"\b{re.escape(key)}\s*:\s*[\"']", text):
        return text
    pattern = rf"(export\s+const\s+{re.escape(object_name)}\s*=\s*Object\.freeze\(\{{)([\s\S]*?)(\}}\);)"
    match = re.search(pattern, text)
    if not match:
        raise RuntimeError(f"Could not locate {object_name}")
    body = match.group(2)
    stripped = body.rstrip()
    suffix_ws = body[len(stripped):]
    if stripped and not stripped.endswith(","):
        stripped += ","
    indent_match = re.search(r"\n([ \t]+)\w+\s*:", body)
    indent = indent_match.group(1) if indent_match else "  "
    addition = f'\n{indent}{key}: "{value}"'
    new_body = stripped + addition + suffix_ws
    return text[:match.start(2)] + new_body + text[match.end(2):]


def patch_index(text: str) -> str:
    article_pattern = re.compile(
        r"<article\b[\s\S]*?<h3>Manager Page Builder</h3>[\s\S]*?</article>",
        re.I,
    )
    match = article_pattern.search(text)
    if not match:
        raise RuntimeError("Could not find Manager Page Builder card in index.html")
    card = match.group(0)
    card = re.sub(
        r'class="tool-card\s+tool-card-coming-soon"',
        'class="tool-card"',
        card,
        count=1,
    )
    card = re.sub(
        r'<span class="tool-card-badge(?:\s+tool-card-badge-live)?">[^<]*</span>',
        '<span class="tool-card-badge tool-card-badge-live">Available</span>',
        card,
        count=1,
    )
    if 'data-htwb-version="manager"' not in card:
        card = card.replace(
            "<h3>Manager Page Builder</h3>",
            '<h3>Manager Page Builder</h3>\n              <div class="tool-version" data-htwb-version="manager"></div>',
            1,
        )
    card = re.sub(
        r'<span class="tool-card-action disabled">[\s\S]*?</span>',
        '<a class="tool-card-action" href="/manager.html">\n              Open builder\n            </a>',
        card,
        count=1,
    )
    if '/manager.html' not in card:
        raise RuntimeError("Manager card action could not be activated")
    return text[:match.start()] + card + text[match.end():]


def integrate(root: Path) -> None:
    shutil.copy2(HERE / "manager.html", root / "manager.html")
    shutil.copy2(HERE / "manager.js", root / "manager.js")
    api_dir = root / "functions" / "api"
    api_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(HERE / "functions" / "api" / "manager.js", api_dir / "manager.js")

    index_path = root / "index.html"
    versions_path = root / "versions.js"
    chpp_path = root / "chpp-versions.js"

    index_path.write_text(patch_index(index_path.read_text(encoding="utf-8")), encoding="utf-8")
    versions_path.write_text(
        add_object_property(versions_path.read_text(encoding="utf-8"), "HTWB_VERSIONS", "manager", MANAGER_VERSION),
        encoding="utf-8",
    )
    if chpp_path.exists():
        chpp_path.write_text(
            add_object_property(chpp_path.read_text(encoding="utf-8"), "HTWB_CHPP_VERSIONS", "achievements", "1.2"),
            encoding="utf-8",
        )


def zip_tree(extracted_root: Path, output_zip: Path) -> None:
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(extracted_root.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(extracted_root))


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python apply_manager_builder.py <project-folder-or-zip>")
        return 2
    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.exists():
        print(f"Source not found: {source}")
        return 2

    if source.is_dir():
        root = find_project_root(source)
        integrate(root)
        print(f"Manager Page Builder added to: {root}")
        return 0

    if source.suffix.lower() != ".zip":
        print("Source must be a project folder or .zip archive")
        return 2

    output = source.with_name(f"{source.stem}-manager-builder{source.suffix}")
    with tempfile.TemporaryDirectory(prefix="htwb-manager-") as temp_name:
        temp = Path(temp_name)
        with zipfile.ZipFile(source, "r") as zf:
            zf.extractall(temp)
        root = find_project_root(temp)
        integrate(root)
        zip_tree(temp, output)
    print(f"Created: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
