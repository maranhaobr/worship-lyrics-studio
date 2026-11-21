"""Private worker artifacts. Keys include audio contents and processing policy.

Cache misses, corruption and unavailable storage never invalidate a job.
"""
import hashlib
import json
import logging
import os
from pathlib import Path
import tempfile
import time

VERSION = 'alignment-v2'


class ArtifactCache:
    def __init__(self, path, policy):
        self.root = Path(os.getenv('MODEL_CACHE_DIR', '/models')) / 'alignment-artifacts'
        self.key = None
        try:
            digest = hashlib.sha256()
            with open(path, 'rb') as audio:
                for chunk in iter(lambda: audio.read(1024 * 1024), b''):
                    digest.update(chunk)
            digest.update(json.dumps([VERSION, policy], sort_keys=True).encode())
            self.key = digest.hexdigest()
        except OSError:
            logging.warning('Alignment cache unavailable for this recording')

    def filename(self, kind, details=None):
        suffix = hashlib.sha256(json.dumps(details, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        return self.root / f'{self.key}-{kind}-{suffix}.json'

    def get(self, kind, details=None):
        if not self.key:
            return None
        try:
            path = self.filename(kind, details)
            if time.time() - path.stat().st_mtime > 30 * 86400:
                return None
            return json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return None

    def put(self, kind, value, details=None):
        if not self.key:
            return
        temporary = None
        try:
            self.root.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.root, delete=False) as output:
                temporary = output.name
                json.dump(value, output, ensure_ascii=False, allow_nan=False)
            os.replace(temporary, self.filename(kind, details))
            # Bounded retention for private transcripts/checkpoints, no source audio.
            files = sorted(self.root.glob('*.json'), key=lambda file: file.stat().st_mtime, reverse=True)
            for file in files[10000:]:
                file.unlink(missing_ok=True)
            for file in files[:10000]:
                if time.time() - file.stat().st_mtime > 30 * 86400:
                    file.unlink(missing_ok=True)
        except (OSError, ValueError):
            logging.warning('Alignment cache write skipped')
        finally:
            if temporary:
                try:
                    Path(temporary).unlink(missing_ok=True)
                except OSError:
                    pass
