import unittest
import json
from app.timing import normalize, match_words, search_windows, validate_search_windows, timed_clip, provisional_clip, valid_checkpoint


class TimingTests(unittest.TestCase):
    def test_refrains_are_matched_in_order_even_when_last_repeat_is_more_accurate(self):
        clips = [{'id': str(i), 'text': 'Como não confiar em Ti'} for i in range(3)]
        recognized = [{'word': word, 'start': 10 + verse * 10 + index * .5, 'end': 10.4 + verse * 10 + index * .5}
                      for verse in range(3) for index, word in enumerate(['Como', 'não', 'confiarem' if verse < 2 else 'confiar', 'em', 'Ti'])]
        matched = match_words([word for clip in clips for word in clip['text'].split()], recognized)
        self.assertEqual(len(matched), 13)
        self.assertEqual(matched[0]['start'], 10)
        self.assertEqual(matched[10]['start'], 30)
        windows = search_windows(clips, recognized, 40)
        validate_search_windows(clips, windows)
        for i, (low, high, _) in enumerate(windows):
            self.assertLessEqual(low, 10 + i * 10)
            self.assertGreaterEqual(high, 12.4 + i * 10)

    def test_word_matching_keeps_exact_spelling_order_and_skips_empty_tokens(self):
        recognized = [{'word': word, 'start': i, 'end': i + .5} for i, word in enumerate(['d', 'i', 'e', 't'])]
        self.assertEqual(len(match_words(['t', 'i', 'd', 'e'], recognized)), 2)
        self.assertEqual(match_words(['!!!'], [{'word': '...', 'start': 0, 'end': 1}]), {})
        self.assertEqual(match_words([], recognized), {})

    def test_unmatched_verse_is_rejected_before_forced_alignment(self):
        clips = [{'text': 'Santo'} for _ in range(5)]
        with self.assertRaisesRegex(ValueError, 'slides 2 a 4'):
            validate_search_windows(clips, [(1, 2, False), (2, 3, True), (3, 4, True), (4, 5, True), (5, 6, False)])
        validate_search_windows(clips[:3], [(1, 2, False), (2, 3, True), (3, 4, False)])
        with self.assertRaisesRegex(ValueError, 'slide 1'):
            validate_search_windows([{'text': 'Uma frase inteira aqui'}], [(1, 1.2, True)])

    def test_provisional_positions_are_bounded_and_never_claim_measured_words(self):
        clip = {'id': 'a', 'text': 'Na escuridão'}
        result = provisional_clip(clip, 10, 12)
        self.assertTrue(result['needsReview'])
        self.assertEqual(result['timingSource'], 'estimated')
        self.assertEqual(result['endMs'], 12000)
        with self.assertRaises(ValueError):
            provisional_clip(clip, 10, 40)
        with self.assertRaises(ValueError):
            provisional_clip(clip, 10, 10.001)

    def test_invalid_checkpoints_do_not_override_fresh_results(self):
        clip = {'id': 'a', 'text': 'Santo'}
        value = {**timed_clip(clip, [{'word': 'Santo', 'start': 1., 'end': 2.}], 0, 3), 'timingSource': 'aligned'}
        self.assertTrue(valid_checkpoint(value, clip, 0, 3))
        self.assertFalse(valid_checkpoint({**value, 'startMs': 'bad'}, clip, 0, 3))
        self.assertFalse(valid_checkpoint({**value, 'words': [{}]}, clip, 0, 3))
        self.assertFalse(valid_checkpoint(value, clip, 4, 5))

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
        self.assertGreater(windows[0][0], 0)
        self.assertLess(windows[1][1], 12)
        self.assertLessEqual(windows[0][1], windows[1][0])
        self.assertGreater(windows[1][0], 3)

    def test_instrumental_tail_does_not_become_a_long_final_phrase(self):
        clips = [{'id': 'a', 'text': 'Santo pra sempre'}]
        recognized = [{'word': text, 'start': start, 'end': start + .5} for text, start in [('Santo', 9), ('pra', 10), ('sempre', 11)]]
        low, high, uncertain = search_windows(clips, recognized, 310)[0]
        self.assertGreaterEqual(low, 8)
        self.assertLess(high, 13)
        self.assertFalse(uncertain)

    def test_long_gaps_between_recognized_phrases_remain_gaps(self):
        clips = [{'id': 'a', 'text': 'Santo'}, {'id': 'b', 'text': 'Glória'}]
        recognized = [{'word': 'Santo', 'start': 10, 'end': 12}, {'word': 'Glória', 'start': 200, 'end': 202}]
        windows = search_windows(clips, recognized, 310)
        self.assertLess(windows[0][1], 14)
        self.assertGreater(windows[1][0], 198)

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
