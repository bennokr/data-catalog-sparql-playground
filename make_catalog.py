#!/usr/bin/env python3
"""Build static, in-browser SPARQL playground sites."""

from __future__ import annotations

import argparse
import glob
import html
import json
import mimetypes
from pathlib import Path
import re
import shutil
from typing import Iterable


_RDF_TYPES = {
    ".ttl": "text/turtle",
    ".trig": "application/trig",
    ".nt": "application/n-triples",
    ".nq": "application/n-quads",
    ".jsonld": "application/ld+json",
    ".json": "application/ld+json",
    ".rdf": "application/rdf+xml",
    ".xml": "application/rdf+xml",
    ".rq": "application/sparql-query",
    ".sparql": "application/sparql-query",
}


def _guess_media_type(path: Path) -> str:
    if path.suffix.lower() in _RDF_TYPES:
        return _RDF_TYPES[path.suffix.lower()]
    media_type, _ = mimetypes.guess_type(path.name)
    return media_type or "application/octet-stream"


def _rel_url(base_url: str, file_path: Path) -> str:
    relative = file_path.as_posix().lstrip("/")
    if base_url in {"", ".", "./"}:
        return f"./{relative}"
    return f"{base_url.rstrip('/')}/{relative}"


def catalog(
    *files: Path,
    base_url: str,
    name: str,
    out: Path | None = None,
    license: str | None = None,
    queries: Iterable[Path] | None = None,
) -> dict:
    """Create a schema.org DataCatalog for RDF files and example queries."""
    if not files:
        raise ValueError("At least one RDF data file is required")

    datasets = []
    for path in map(Path, files):
        dataset = {
            "@type": "Dataset",
            "name": path.stem,
            "identifier": path.stem,
            "distribution": [
                {
                    "@type": "DataDownload",
                    "encodingFormat": _guess_media_type(path),
                    "contentUrl": _rel_url(base_url, path),
                }
            ],
        }
        if license:
            dataset["license"] = license
        datasets.append(dataset)

    parts = []
    for path in map(Path, queries or []):
        if _guess_media_type(path) != "application/sparql-query":
            continue
        parts.append(
            {
                "@type": "SoftwareSourceCode",
                "name": path.stem.replace("_", " ").replace("-", " "),
                "programmingLanguage": "SPARQL",
                "encodingFormat": "application/sparql-query",
                "contentUrl": _rel_url(base_url, path),
            }
        )

    document = {
        "@context": "https://schema.org",
        "@type": "DataCatalog",
        "name": name,
        "url": base_url,
        "dataset": datasets,
    }
    if parts:
        document["hasPart"] = parts

    text = json.dumps(document, indent=2, ensure_ascii=False) + "\n"
    if out:
        out = Path(out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return document


def _expand(patterns: Iterable[str], root: Path) -> list[Path]:
    matches: list[Path] = []
    seen: set[Path] = set()
    for pattern in patterns:
        for match in sorted(glob.glob(str(root / pattern), recursive=True)):
            path = Path(match).resolve()
            if path.is_file() and path not in seen:
                matches.append(path)
                seen.add(path)
    return matches


def _copy_inputs(paths: Iterable[Path], destination: Path, source_root: Path) -> list[Path]:
    destination.mkdir(parents=True, exist_ok=True)
    deployed: list[Path] = []
    for source in paths:
        try:
            relative = source.relative_to(source_root)
        except ValueError as error:
            raise ValueError(f"Input is outside the source root: {source}") from error
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        deployed.append(Path(destination.name) / relative)
    return deployed


def _set_page_copy(page: Path, title: str, tagline: str) -> None:
    text = page.read_text(encoding="utf-8")
    escaped_title = html.escape(title, quote=True)
    escaped_tagline = html.escape(tagline, quote=True)
    text = re.sub(r"<title>.*?</title>", f"<title>{escaped_title}</title>", text, count=1)
    text = re.sub(
        r'(<playground-page\b[^>]*\bpage-title=")[^"]*(")',
        rf'\g<1>{escaped_title}\g<2>',
        text,
        count=1,
    )
    text = re.sub(
        r'(<yasgui-playground\b[^>]*\btitle=")[^"]*(")',
        rf'\g<1>{escaped_title}\g<2>',
        text,
        count=1,
    )
    text = re.sub(
        r'(<yasgui-playground\b[^>]*\bdescription=")[^"]*(")',
        rf'\g<1>{escaped_tagline}\g<2>',
        text,
        count=1,
    )
    page.write_text(text, encoding="utf-8")


def build_site(
    *,
    data_patterns: Iterable[str],
    query_patterns: Iterable[str] = (),
    source_root: Path = Path("."),
    template: Path | None = None,
    output: Path = Path("_site"),
    name: str = "SPARQL playground",
    tagline: str = "Explore RDF data with SPARQL in your browser.",
    base_url: str = "./",
    license: str | None = None,
    variant: str = "minimal",
) -> Path:
    """Build a complete static site from a consumer's RDF and query files."""
    source_root = Path(source_root).resolve()
    template = Path(template or Path(__file__).with_name("data-catalog-sparql-playground")).resolve()
    output = Path(output).resolve()

    if output == template or template in output.parents:
        raise ValueError("Output must be outside the playground template")

    data_files = _expand(data_patterns, source_root)
    query_files = _expand(query_patterns, source_root)
    if not data_files:
        raise ValueError("No RDF data files matched the supplied patterns")

    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(
        template,
        output,
        ignore=shutil.ignore_patterns("catalog.json", "data", "queries", "docs"),
    )

    page_name = "minimal.html" if variant == "minimal" else "query.html"
    shutil.copy2(output / page_name, output / "index.html")
    _set_page_copy(output / "index.html", name, tagline)
    (output / "minimal.html").unlink(missing_ok=True)
    (output / "query.html").unlink(missing_ok=True)
    if variant == "minimal":
        (output / "sparnatural-yasgui-plugins.js").unlink(missing_ok=True)
    (output / ".nojekyll").write_text("", encoding="utf-8")

    deployed_data = _copy_inputs(data_files, output / "data", source_root)
    deployed_queries = _copy_inputs(query_files, output / "queries", source_root)
    catalog(
        *deployed_data,
        base_url=base_url,
        name=name,
        out=output / "catalog.json",
        license=license,
        queries=deployed_queries,
    )
    return output


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)

    generate = subcommands.add_parser("catalog", help="generate catalog.json")
    generate.add_argument("files", nargs="+", type=Path)
    generate.add_argument("--queries", nargs="*", type=Path, default=[])
    generate.add_argument("--base-url", default="./")
    generate.add_argument("--name", required=True)
    generate.add_argument("--out", type=Path)
    generate.add_argument("--license")

    build = subcommands.add_parser("build", help="build a deployable static site")
    build.add_argument("--data", action="append", required=True, dest="data_patterns")
    build.add_argument("--queries", action="append", default=[], dest="query_patterns")
    build.add_argument("--source-root", type=Path, default=Path("."))
    build.add_argument("--template", type=Path)
    build.add_argument("--output", type=Path, default=Path("_site"))
    build.add_argument("--name", default="SPARQL playground")
    build.add_argument("--tagline", default="Explore RDF data with SPARQL in your browser.")
    build.add_argument("--base-url", default="./")
    build.add_argument("--license")
    build.add_argument("--variant", choices=("minimal", "advanced"), default="minimal")
    return parser


def main(argv: list[str] | None = None) -> None:
    args = _parser().parse_args(argv)
    if args.command == "catalog":
        catalog(
            *args.files,
            queries=args.queries,
            base_url=args.base_url,
            name=args.name,
            out=args.out,
            license=args.license,
        )
        return
    build_site(
        data_patterns=args.data_patterns,
        query_patterns=args.query_patterns,
        source_root=args.source_root,
        template=args.template,
        output=args.output,
        name=args.name,
        tagline=args.tagline,
        base_url=args.base_url,
        license=args.license,
        variant=args.variant,
    )


if __name__ == "__main__":
    main()
