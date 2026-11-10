import os
from .timing import search_windows, timed_clip


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
        progress(5)
        if self.asr is None:
            self.asr = WhisperModel(os.getenv('WHISPER_MODEL', 'small'), device=device, compute_type='int8' if device == 'cpu' else 'float16', download_root=cache + '/asr', cpu_threads=threads, num_workers=1)
        audio = whisperx.load_audio(str(path))
        duration = len(audio) / 16000
        if not 0.1 <= duration <= 3600:
            raise ValueError('O áudio precisa ter duração de até uma hora.')
        progress(15)
        # Speech VAD rejects sustained singing and accompaniment as non-speech.
        # Keep the complete recording so musical phrases retain their timestamps.
        segments, _ = self.asr.transcribe(str(path), language='pt', word_timestamps=True, vad_filter=False, beam_size=5)
        recognized = [{'word': word.word.strip(), 'start': word.start, 'end': word.end} for segment in segments for word in segment.words or []]
        progress(40)
        windows = search_windows(clips, recognized, duration)
        if self.aligner is None:
            self.aligner, self.metadata = whisperx.load_align_model(language_code='pt', device=device, model_dir=cache + '/alignment')
        output = []
        for i, (clip, (low, high, uncertain)) in enumerate(zip(clips, windows)):
            if high - low > 120 or high - low < 0.1:
                raise ValueError(f'Não foi possível localizar o slide {i + 1}: "{clip["text"][:100]}". Confira a letra e as repetições desse trecho da gravação.')
            aligned = whisperx.align([{'start': low, 'end': high, 'text': clip['text']}], self.aligner, self.metadata, audio, device, return_char_alignments=False)
            output.append(timed_clip(clip, aligned.get('word_segments', []), low, high, uncertain))
            progress(45 + round((i + 1) / len(clips) * 50))
        warnings = [f'Revise a sincronização de: {clip["text"][:100]}' for clip, timed in zip(clips, output) if timed['needsReview']]
        if output and duration * 1000 - output[-1]['endMs'] > 15000:
            warnings.append('A gravação continua por mais de 15 segundos após a última frase alinhada. Confira se faltam repetições ou outras partes na letra; esse restante ficará sem letras.')
        return {'durationMs': round(duration * 1000), 'clips': output, 'warnings': warnings}
