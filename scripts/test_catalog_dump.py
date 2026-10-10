import unittest
from catalog_dump import content_only, statements, HEADER, TABLES


class CatalogDumpTest(unittest.TestCase):
    def test_only_content_tables_survive(self):
        source = """-- private export header
CREATE TABLE `mqu_user` (`id` int, `password` text) ENGINE=InnoDB;
INSERT INTO `mqu_user` VALUES (1, 'DO_NOT_COPY');
CREATE TABLE `mqu_product` (`id` int, `title` text) ENGINE=InnoDB;
INSERT INTO `mqu_product` VALUES (9, 'quote \\' ; -- still a string\nline'), (10, 'double ''quote');
CREATE TABLE `mqu_config` (`key` text, `value` text) ENGINE=InnoDB;
INSERT INTO `mqu_config` VALUES ('api_key', 'NEVER_COPY');
"""
        filtered = content_only(source)
        self.assertNotIn('DO_NOT_COPY', filtered)
        self.assertNotIn('NEVER_COPY', filtered)
        self.assertIn("-- still a string\nline", filtered)
        self.assertIn("double ''quote", filtered)
        for statement in statements(filtered):
            self.assertIn(HEADER.match(statement)[2], TABLES)

    def test_rejects_truncated_dump(self):
        with self.assertRaises(ValueError):
            content_only("INSERT INTO `mqu_product` VALUES ('unfinished")

    def test_requires_supported_schema(self):
        with self.assertRaises(ValueError):
            content_only('CREATE TABLE `unrelated` (`id` int) ENGINE=InnoDB;')


if __name__ == '__main__':
    unittest.main()
