import os
import logging
import math
import time
from .timing import search_windows, validate_search_windows, timed_clip, provisional_clip, match_words, valid_checkpoint
from .cache import ArtifactCache


class AlignmentEngine:
    def __init__(self):
        self.asr = None
        self.aligner = None
        self.metadata = None

    def run(self, path, clips, progress):
        import whisperx
        import torch
        from faster_whisper import WhisperModel
        device = os.getenv('ALIGNMENT_DEVICE', 'cpu')
        threads = int(os.getenv('CPU_THREADS', '2'))
        torch.set_num_threads(threads)
        cache = os.getenv('MODEL_CACHE_DIR', '/models')
        started = time.monotonic()
        model = os.getenv('WHISPER_MODEL', 'small')
        artifacts = ArtifactCache(path, {'model': model, 'language': 'pt', 'beam': 5, 'vad': False, 'asr': 'faster-whisper-1.2.1', 'aligner': 'whisperx-3.8.6'})
        progress(5)
        audio = whisperx.load_audio(str(path))
        duration = len(audio) / 16000
        if not 0.1 <= duration <= 3600:
            raise ValueError('O áudio precisa ter duração de até uma hora.')
        progress(15)
        # Speech VAD rejects sustained singing and accompaniment as non-speech.
        # Keep the complete recording so musical phrases retain their timestamps.
        recognized = artifacts.get('transcript')
        valid = isinstance(recognized, list) and all(isinstance(word, dict) and isinstance(word.get('word'), str) and isinstance(word.get('start'), (int, float)) and isinstance(word.get('end'), (int, float)) and math.isfinite(word['start']) and math.isfinite(word['end']) and 0 <= word['start'] < word['end'] <= duration for word in recognized)
        if not valid:
            if self.asr is None:
                self.asr = WhisperModel(model, device=device, compute_type='int8' if device == 'cpu' else 'float16', download_root=cache + '/asr', cpu_threads=threads, num_workers=1)
            segments, _ = self.asr.transcribe(str(path), language='pt', word_timestamps=True, vad_filter=False, beam_size=5)
            recognized = []
            for segment in segments:
                recognized.extend({'word': word.word.strip(), 'start': word.start, 'end': word.end} for word in segment.words or [] if 0 <= word.start < word.end <= duration)
                progress(min(39, 15 + round(24 * max(0, min(1, segment.end / duration)))))
            artifacts.put('transcript', recognized)
        logging.info('Transcription ready cache_hit=%s elapsed_seconds=%.1f', valid, time.monotonic() - started)
        progress(40)
        windows = search_windows(clips, recognized, duration)
        validate_search_windows(clips, windows)
        if self.aligner is None:
            self.aligner, self.metadata = whisperx.load_align_model(language_code='pt', device=device, model_dir=cache + '/alignment')
        output, warnings, estimated = [], [], 0
        for i, (clip, (low, high, uncertain)) in enumerate(zip(clips, windows)):
            if high - low > 120 or high - low < 0.1:
                raise ValueError(f'Não foi possível localizar o slide {i + 1}: "{clip["text"][:100]}". Confira a letra e as repetições desse trecho da gravação.')
            # Preserve the expensive transcript cache but invalidate old timing
            # checkpoints whose word pairing used the greedy repeat matcher.
            details = ['monotonic-v2', clip['text'], low, high, uncertain]
            timed = artifacts.get('clip', details)
            if not valid_checkpoint(timed, clip, low, high):
                aligned = whisperx.align([{'start': low, 'end': high, 'text': clip['text']}], self.aligner, self.metadata, audio, device, return_char_alignments=False)
                try:
                    timed = timed_clip(clip, aligned.get('word_segments', []), low, high, uncertain)
                    timed['timingSource'] = 'aligned'
                    artifacts.put('clip', timed, details)
                except ValueError:
                    # ASR timestamps are a secondary source; never let one failed
                    # short phrase discard all correctly measured slides.
                    candidates = [word for word in recognized if low <= word['start'] < word['end'] <= high]
                    matched = match_words(clip['text'].split(), candidates)
                    if len(matched) / max(1, len(clip['text'].split())) >= .5:
                        try:
                            timed = timed_clip(clip, candidates, low, high, True)
                            timed['timingSource'] = 'transcript'
                        except ValueError:
                            timed = None
                    else:
                        timed = None
                    if timed is None:
                        # Never invent the vocal entrance or the final phrase.
                        # Only a small, bounded interior gap can be provisional.
                        if i == 0 or i == len(clips) - 1:
                            raise ValueError(f'Não foi possível localizar o slide {i + 1}. A transcrição foi preservada; confira a letra e tente novamente.')
                        timed = provisional_clip(clip, low, high)
                        estimated += 1
                        if estimated > max(1, len(clips) // 7):
                            raise ValueError('Muitos trechos não foram reconhecidos. Confira a versão e as repetições. A transcrição foi preservada para a próxima tentativa.')
            timed = {**timed, 'clipId': clip['id']}
            output.append(timed)
            if timed.get('timingSource') == 'estimated':
                warnings.append(f'Slide {i + 1}: sem reconhecimento confiável. Posição PROVISÓRIA entre {low:.1f}s e {high:.1f}s; ajuste manualmente: {clip["text"][:100]}')
            elif timed['needsReview']:
                warnings.append(f'Slide {i + 1}: revise a sincronização: {clip["text"][:100]}')
            progress(45 + round((i + 1) / len(clips) * 50))
        if output and duration * 1000 - output[-1]['endMs'] > 15000:
            warnings.append('A gravação continua por mais de 15 segundos após a última frase alinhada. Confira se faltam repetições ou outras partes na letra; esse restante ficará sem letras.')
        logging.info('Alignment finished clips=%d provisional=%d elapsed_seconds=%.1f', len(output), estimated, time.monotonic() - started)
        return {'durationMs': round(duration * 1000), 'clips': output, 'warnings': warnings}
