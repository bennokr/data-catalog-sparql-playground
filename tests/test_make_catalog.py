import json
import tempfile
import unittest
from pathlib import Path

from make_catalog import _guess_media_type, build_site, catalog


class MakeCatalogTests(unittest.TestCase):
    def test_guess_media_type_treats_json_as_jsonld(self):
        self.assertEqual(
            _guess_media_type(Path("data/source.json")),
            "application/ld+json",
        )

    def test_catalog_emits_relative_data_and_query_urls(self):
        with tempfile.TemporaryDirectory() as temporary:
            document = catalog(
                Path("data/source.trig"),
                base_url="./",
                name="Test catalog",
                out=Path(temporary) / "catalog.json",
                queries=[Path("queries/example.rq")],
            )

        distribution = document["dataset"][0]["distribution"][0]
        self.assertEqual(distribution["encodingFormat"], "application/trig")
        self.assertEqual(distribution["contentUrl"], "./data/source.trig")
        self.assertEqual(
            document["hasPart"][0]["contentUrl"],
            "./queries/example.rq",
        )

    def test_build_site_copies_only_selected_consumer_inputs(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            consumer = root / "consumer"
            template = root / "template"
            output = root / "_site"
            (consumer / "demo").mkdir(parents=True)
            (consumer / "demo" / "graph.trig").write_text(
                "<urn:s> <urn:p> <urn:o> .\n",
                encoding="utf-8",
            )
            (consumer / "demo" / "example.rq").write_text(
                "SELECT * WHERE { ?s ?p ?o }\n",
                encoding="utf-8",
            )
            template.mkdir()
            (template / "minimal.html").write_text(
                "<title>Minimal SPARQL playground</title>",
                encoding="utf-8",
            )
            (template / "query.html").write_text(
                "<title>SPARQL playground</title>",
                encoding="utf-8",
            )
            (template / "sparnatural-yasgui-plugins.js").write_text(
                "advanced bundle",
                encoding="utf-8",
            )
            (template / "components").mkdir()
            (template / "vendor").mkdir()
            (template / "data").mkdir()
            (template / "data" / "bundled.ttl").write_text("", encoding="utf-8")

            build_site(
                data_patterns=["demo/*.trig"],
                query_patterns=["demo/*.rq"],
                source_root=consumer,
                template=template,
                output=output,
                name="Consumer demo",
            )

            self.assertTrue((output / "index.html").is_file())
            self.assertTrue((output / ".nojekyll").is_file())
            self.assertFalse((output / "minimal.html").exists())
            self.assertFalse((output / "query.html").exists())
            self.assertFalse((output / "sparnatural-yasgui-plugins.js").exists())
            self.assertTrue((output / "data" / "graph.trig").is_file())
            self.assertFalse((output / "data" / "bundled.ttl").exists())
            document = json.loads((output / "catalog.json").read_text())
            self.assertEqual(document["name"], "Consumer demo")
            self.assertEqual(
                document["dataset"][0]["distribution"][0]["contentUrl"],
                "./data/graph.trig",
            )


if __name__ == "__main__":
    unittest.main()
