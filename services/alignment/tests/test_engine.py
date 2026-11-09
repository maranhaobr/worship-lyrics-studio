import sys
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.engine import AlignmentEngine


class EngineTests(unittest.TestCase):
    def test_music_is_not_filtered_by_speech_vad(self):
        asr = Mock()
        asr.transcribe.return_value = (iter([SimpleNamespace(words=[
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


if __name__ == '__main__':
    unittest.main()
