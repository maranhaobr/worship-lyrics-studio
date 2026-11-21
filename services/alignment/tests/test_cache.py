import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from app.cache import ArtifactCache


class CacheTests(unittest.TestCase):
    def test_keys_follow_audio_contents_and_model_policy_and_corruption_is_a_miss(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'MODEL_CACHE_DIR': directory}):
            audio = Path(directory) / 'audio.mp3'
            audio.write_bytes(b'first')
            cache = ArtifactCache(audio, {'model': 'small'})
            cache.put('transcript', [{'word': 'Santo', 'start': 1, 'end': 2}])
            same = ArtifactCache(audio, {'model': 'small'})
            self.assertEqual(same.get('transcript')[0]['word'], 'Santo')
            self.assertIsNone(ArtifactCache(audio, {'model': 'base'}).get('transcript'))
            audio.write_bytes(b'changed')
            self.assertIsNone(ArtifactCache(audio, {'model': 'small'}).get('transcript'))
            cache.filename('transcript').write_text('{broken', encoding='utf-8')
            self.assertIsNone(cache.get('transcript'))

    def test_clip_checkpoints_use_text_and_window_and_expire(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'MODEL_CACHE_DIR': directory}):
            audio = Path(directory) / 'audio.mp3'; audio.write_bytes(b'audio')
            cache = ArtifactCache(audio, {})
            cache.put('clip', {'startMs': 1}, ['Santo', 1, 2])
            self.assertEqual(cache.get('clip', ['Santo', 1, 2]), {'startMs': 1})
            self.assertIsNone(cache.get('clip', ['Santo', 2, 3]))
            path = cache.filename('clip', ['Santo', 1, 2])
            os.utime(path, (0, 0))
            self.assertIsNone(cache.get('clip', ['Santo', 1, 2]))
