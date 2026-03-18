import json
import tempfile
import unittest
from pathlib import Path

from make_catalog import _guess_media_type, catalog


class MakeCatalogTests(unittest.TestCase):
    def test_guess_media_type_treats_json_as_jsonld(self):
        self.assertEqual(_guess_media_type(Path('data/source.json')), 'application/ld+json')

    def test_catalog_emits_json_distribution_as_jsonld(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            data_file = tmp_path / 'source.json'
            data_file.write_text('{"@context": "./context.jsonld", "@id": "ex:item"}', encoding='utf-8')
            out_file = tmp_path / 'catalog.json'

            catalog(
                data_file,
                base_url='https://example.test/',
                name='Test catalog',
                out=out_file,
            )

            doc = json.loads(out_file.read_text(encoding='utf-8'))
            self.assertEqual(
                doc['dataset'][0]['distribution'][0]['encodingFormat'],
                'application/ld+json',
            )


if __name__ == '__main__':
    unittest.main()
