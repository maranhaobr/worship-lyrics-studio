import unittest
import json
from app.timing import normalize, search_windows, timed_clip


class TimingTests(unittest.TestCase):
    def test_numpy_model_scores_produce_json_safe_booleans(self):
        try:
            import numpy as np
        except ImportError:
            self.skipTest('NumPy checked inside the worker image')
        result = timed_clip({'id': 'a', 'text': 'Santo'}, [{'word': 'Santo', 'start': 1., 'end': 2., 'score': np.float64(.9)}], 0, 3)
        self.assertIs(type(result['needsReview']), bool)
        self.assertIn('false', json.dumps(result))

    def test_portuguese_and_repeated_occurrences(self):
        self.assertEqual(normalize('GLÓRIA!'), 'gloria')
        clips = [{'id': 'a', 'text': 'Glória a Ti'}, {'id': 'b', 'text': 'Glória a Ti'}]
        recognized = [{'word': word, 'start': start, 'end': start + .3} for word, start in [('gloria', 2), ('a', 2.4), ('ti', 2.8), ('gloria', 8), ('a', 8.4), ('ti', 8.8)]]
        windows = search_windows(clips, recognized, 12)
        self.assertEqual(windows[0][0], 0)
        self.assertEqual(windows[1][1], 12)
        self.assertEqual(windows[0][1], windows[1][0])
        self.assertGreater(windows[1][0], 3)

    def test_missing_words_are_explicitly_marked_for_review(self):
        clip = {'id': 'a', 'text': 'Santo para sempre'}
        result = timed_clip(clip, [{'word': 'Santo', 'start': 2., 'end': 2.4, 'score': .9}, {'word': 'sempre', 'start': 3., 'end': 3.8, 'score': .9}], 1, 5)
        self.assertTrue(result['needsReview'])
        self.assertEqual([w['text'] for w in result['words']], ['Santo', 'para', 'sempre'])
        self.assertEqual(result['startMs'], 2000)
        self.assertEqual(result['words'][0]['startMs'], 0)
        self.assertLessEqual(result['words'][1]['endMs'], result['words'][2]['startMs'])

    def test_unrelated_audio_and_unrecognized_phrase_fail_instead_of_fake_alignment(self):
        with self.assertRaises(ValueError):
            search_windows([{'id': 'a', 'text': 'Santo para sempre'}], [{'word': 'hello', 'start': 1, 'end': 2}], 5)
        with self.assertRaises(ValueError):
            timed_clip({'id': 'a', 'text': 'Santo para sempre'}, [], 0, 5)

    def test_measured_timings_keep_original_spelling_and_offsets(self):
        result = timed_clip({'id': 'a', 'text': 'Glória a Ti!'}, [{'word': 'glória', 'start': 10, 'end': 10.5, 'score': .9}, {'word': 'a', 'start': 10.6, 'end': 10.7, 'score': .9}, {'word': 'ti', 'start': 11, 'end': 12, 'score': .9}], 9, 13)
        self.assertFalse(result['needsReview'])
        self.assertEqual(result['endMs'], 12000)
        self.assertEqual(result['words'][2], {'text': 'Ti!', 'startMs': 1000, 'endMs': 2000})


if __name__ == '__main__':
    unittest.main()
