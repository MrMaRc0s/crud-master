import unittest
import uuid

from app.routes.movies import is_non_empty_string, parse_movie_id


class IsNonEmptyStringTests(unittest.TestCase):
    def test_accepts_non_empty_strings(self):
        self.assertTrue(is_non_empty_string("Inception"))

    def test_rejects_blank_or_non_string_values(self):
        invalid_values = ("", "   ", None, 42, [])

        for value in invalid_values:
            with self.subTest(value=value):
                self.assertFalse(is_non_empty_string(value))


class ParseMovieIdTests(unittest.TestCase):
    def test_parses_a_valid_uuid(self):
        movie_id = uuid.uuid4()
        self.assertEqual(parse_movie_id(str(movie_id)), movie_id)

    def test_rejects_a_malformed_id(self):
        self.assertIsNone(parse_movie_id("not-a-uuid"))

    def test_rejects_a_non_string_id(self):
        self.assertIsNone(parse_movie_id(None))


if __name__ == "__main__":
    unittest.main()
