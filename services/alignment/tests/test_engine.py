import sys
import unittest
import tempfile
from pathlib import Path
import os
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.engine import AlignmentEngine


class EngineTests(unittest.TestCase):
    def test_music_is_not_filtered_by_speech_vad(self):
        asr = Mock()
        asr.transcribe.return_value = (iter([SimpleNamespace(end=3., words=[
            SimpleNamespace(word='Santo', start=2., end=3.)
        ])]), None)
        whisperx = Mock()
        whisperx.load_audio.return_value = [0.] * 80000
        whisperx.align.return_value = {'word_segments': [
            {'word': 'Santo', 'start': 2., 'end': 3., 'score': .9}
        ]}
        engine = AlignmentEngine()
        engine.asr = asr
        engine.aligner, engine.metadata = object(), {}
        with patch.dict(sys.modules, {'whisperx': whisperx, 'torch': Mock(), 'faster_whisper': Mock()}):
            result = engine.run('music.mp3', [{'id': 'a', 'text': 'Santo'}], Mock())
        self.assertFalse(asr.transcribe.call_args.kwargs['vad_filter'])
        self.assertEqual(result['clips'][0]['startMs'], 2000)
        self.assertEqual(result['durationMs'], 5000)

    def run_fixture(self, recognized, align):
        asr = Mock()
        asr.transcribe.side_effect = lambda *args, **kwargs: (iter([SimpleNamespace(end=6., words=[SimpleNamespace(**word) for word in recognized])]), None)
        whisperx = Mock()
        whisperx.load_audio.return_value = [0.] * 128000
        whisperx.align.side_effect = align
        engine = AlignmentEngine(); engine.asr = asr
        engine.aligner, engine.metadata = object(), {}
        return engine, asr, whisperx

    def test_empty_forced_alignment_uses_measured_asr_words_with_review(self):
        recognized = [dict(word=text, start=start, end=start + .4) for text, start in [('Luz', 1.), ('Na', 3.), ('escuridão', 3.5), ('Rei', 6.)]]
        def align(segments, *args, **kwargs):
            text = segments[0]['text']
            return {'word_segments': [] if text == 'Na escuridão' else [word for word in recognized if word['word'] == text]}
        engine, asr, whisperx = self.run_fixture(recognized, align)
        clips = [{'id': str(i), 'text': text} for i, text in enumerate(['Luz', 'Na escuridão', 'Rei'])]
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'MODEL_CACHE_DIR': directory}), patch.dict(sys.modules, {'whisperx': whisperx, 'torch': Mock(), 'faster_whisper': Mock()}):
            audio = Path(directory) / 'audio.mp3'; audio.write_bytes(b'test')
            result = engine.run(audio, clips, Mock())
        self.assertEqual(result['clips'][1]['timingSource'], 'transcript')
        self.assertTrue(result['clips'][1]['needsReview'])
        self.assertEqual(result['clips'][1]['startMs'], 3000)
        self.assertEqual(len(result['clips']), 3)

    def test_one_unrecognized_interior_phrase_is_provisional_and_retry_reuses_work(self):
        recognized = [dict(word='Luz', start=1., end=1.5), dict(word='Rei', start=6., end=6.5)]
        def align(segments, *args, **kwargs):
            return {'word_segments': [word for word in recognized if word['word'] == segments[0]['text']]}
        engine, asr, whisperx = self.run_fixture(recognized, align)
        clips = [{'id': str(i), 'text': text} for i, text in enumerate(['Luz', 'Na escuridão', 'Rei'])]
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'MODEL_CACHE_DIR': directory}), patch.dict(sys.modules, {'whisperx': whisperx, 'torch': Mock(), 'faster_whisper': Mock()}):
            audio = Path(directory) / 'audio.mp3'; audio.write_bytes(b'test')
            first = engine.run(audio, clips, Mock())
            second = engine.run(audio, [{**clip, 'id': 'new-' + clip['id']} for clip in clips], Mock())
        self.assertEqual(first['clips'][1]['timingSource'], 'estimated')
        self.assertTrue(first['clips'][1]['needsReview'])
        self.assertIn('PROVISÓRIA', first['warnings'][0])
        self.assertEqual(second['clips'][0]['clipId'], 'new-0')
        self.assertEqual(asr.transcribe.call_count, 1, 'retry must reuse transcription')
        self.assertEqual(whisperx.align.call_count, 4, 'retry must reuse the two measured clips')

    def test_unrecognized_intro_is_not_assigned_invented_timings(self):
        recognized = [dict(word='Luz', start=4., end=4.5), dict(word='Rei', start=6., end=6.5)]
        engine, _, whisperx = self.run_fixture(recognized, lambda *args, **kwargs: {'word_segments': []})
        clips = [{'id': str(i), 'text': text} for i, text in enumerate(['Na escuridão', 'Luz', 'Rei'])]
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'MODEL_CACHE_DIR': directory}), patch.dict(sys.modules, {'whisperx': whisperx, 'torch': Mock(), 'faster_whisper': Mock()}):
            audio = Path(directory) / 'audio.mp3'; audio.write_bytes(b'test')
            with self.assertRaisesRegex(ValueError, 'slide 1'):
                engine.run(audio, clips, Mock())


if __name__ == '__main__':
    unittest.main()
