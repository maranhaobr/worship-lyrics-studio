"""Pure timing helpers: estimated positions are search windows, never final timings."""
import difflib
import unicodedata
import math
from array import array


def normalize(word):
    return ''.join(c for c in unicodedata.normalize('NFD', word.lower()) if c.isalnum())


def match_words(expected, recognized):
    left = [normalize(word) for word in expected]
    right = [normalize(word['word']) for word in recognized]
    if not left or not right:
        return {}
    # Long contiguous-block heuristics can skip entire refrains when one repeat
    # is transcribed more accurately than another. Maximize monotonic matches
    # globally, preserving the original ASR timestamps and exact word identity.
    # Bound the table to ~16 MB; exceptionally large inputs retain the previous
    # matcher rather than allocating unbounded memory inside the worker.
    width = len(right) + 1
    if (len(left) + 1) * width > 4_000_000:
        matcher = difflib.SequenceMatcher(a=left, b=right, autojunk=False)
        return {block.a + i: recognized[block.b + i] for block in matcher.get_matching_blocks() for i in range(block.size) if left[block.a + i]}
    rows = array('I', [0]) * ((len(left) + 1) * width)
    for i in range(len(left) - 1, -1, -1):
        row, following = i * width, (i + 1) * width
        for j in range(len(right) - 1, -1, -1):
            rows[row + j] = rows[following + j + 1] + 1 if left[i] and left[i] == right[j] else max(rows[following + j], rows[row + j + 1])
    result, i, j = {}, 0, 0
    while i < len(left) and j < len(right):
        if left[i] and left[i] == right[j]:
            result[i] = recognized[j]
            i += 1
            j += 1
        elif rows[(i + 1) * width + j] >= rows[i * width + j + 1]:
            i += 1
        else:
            j += 1
    return result


def search_windows(clips, recognized, duration):
    words = [word for clip in clips for word in clip['text'].split()]
    matches = match_words(words, recognized)
    if len(matches) / max(1, len(words)) < 0.35:
        raise ValueError('Não foi possível relacionar a letra à gravação. Confira a versão, as repetições e a presença da voz no áudio.')
    anchors, margins, cursor = [], [], 0
    for clip in clips:
        count = len(clip['text'].split())
        found = [matches[i] for i in range(cursor, cursor + count) if i in matches]
        anchors.append((found[0]['start'], found[-1]['end']) if found else None)
        indices = [i for i in range(count) if cursor + i in matches]
        # Only missing edge words need extra search space. Do not force an
        # instrumental gap or the remaining recording into an anchored phrase.
        margins.append((max(.75, indices[0] * .65), max(.75, (count - indices[-1] - 1) * .65)) if indices else (0, 0))
        cursor += count
    centers = [(anchor[0] + anchor[1]) / 2 if anchor else None for anchor in anchors]
    for i, center in enumerate(centers):
        if center is not None:
            continue
        left = next((j for j in range(i - 1, -1, -1) if anchors[j]), -1)
        right = next((j for j in range(i + 1, len(clips)) if anchors[j]), len(clips))
        low = centers[left] if left >= 0 else 0
        high = centers[right] if right < len(clips) else duration
        centers[i] = low + (high - low) * (i - left) / (right - left)
    boundaries = [0.0]
    for i in range(1, len(clips)):
        boundary = (anchors[i - 1][1] + anchors[i][0]) / 2 if anchors[i - 1] and anchors[i] else (centers[i - 1] + centers[i]) / 2
        boundaries.append(max(boundaries[-1], min(duration, boundary)))
    boundaries.append(duration)
    windows = []
    for i, anchor in enumerate(anchors):
        low, high = boundaries[i], boundaries[i + 1]
        if anchor:
            low = max(low, anchor[0] - margins[i][0])
            high = min(high, anchor[1] + margins[i][1])
        windows.append((low, high, anchor is None))
    return windows


def timed_clip(clip, recognized, low, high, uncertain=False):
    expected = clip['text'].split()
    matched = match_words(expected, recognized)
    slots = []
    previous = low
    for i in range(len(expected)):
        word = matched.get(i)
        if word and word.get('start') is not None and word.get('end') is not None:
            start, end = max(low, previous, word['start']), min(high, word['end'])
            if end > start:
                slots.append((start, end)); previous = end
                uncertain |= word.get('score', 1) < 0.4
                continue
        slots.append(None)
    if all(slot is None for slot in slots):
        raise ValueError('Uma frase não pôde ser alinhada: ' + clip['text'][:100] + '. Confira a letra e tente novamente.')
    i = 0
    while i < len(slots):
        if slots[i] is not None:
            i += 1; continue
        begin = i
        while i < len(slots) and slots[i] is None:
            i += 1
        start = slots[begin - 1][1] if begin else low
        end = slots[i][0] if i < len(slots) else high
        if end - start < (i - begin) * 0.01:
            raise ValueError('Tempos ambíguos em uma frase. Revise a letra e a gravação.')
        for j in range(begin, i):
            slots[j] = (start + (end - start) * (j - begin) / (i - begin), start + (end - start) * (j - begin + 1) / (i - begin))
        uncertain = True
    start_ms, end_ms = round(slots[0][0] * 1000), round(slots[-1][1] * 1000)
    words = [{'text': text, 'startMs': round(slot[0] * 1000) - start_ms, 'endMs': round(slot[1] * 1000) - start_ms} for text, slot in zip(expected, slots)]
    if any(word['endMs'] <= word['startMs'] for word in words):
        raise ValueError('Tempos muito curtos para alinhar as palavras com segurança.')
    return {'clipId': clip['id'], 'startMs': start_ms, 'endMs': end_ms, 'words': words, 'needsReview': bool(uncertain)}


def validate_search_windows(clips, windows):
    """Reject an unmatched verse before spending minutes forcing every slide."""
    begin = None
    for i, (low, high, uncertain) in enumerate(windows):
        if uncertain:
            if begin is None:
                begin = i
            if i - begin >= 2:
                raise ValueError(f'Os slides {begin + 1} a {i + 1} não encontraram correspondência na gravação. Confira trechos repetidos e a versão da música. A transcrição foi preservada para a próxima tentativa.')
        else:
            begin = None
        if high - low < max(.1, len(clips[i]['text'].split()) * .08):
            raise ValueError(f'O slide {i + 1} ficou sem espaço suficiente na gravação. Confira trechos repetidos e a ordem da letra. A transcrição foi preservada para a próxima tentativa.')


def provisional_clip(clip, low, high):
    """Explicit manual-review placeholder, never claimed as measured word timing."""
    words = clip['text'].split()
    start, end = round(low * 1000), round(high * 1000)
    if not words or not math.isfinite(low) or not math.isfinite(high) or not 0 < high - low <= 12 or end - start < len(words) * 10:
        raise ValueError('Trecho sem evidência suficiente para sugerir uma posição segura.')
    return {'clipId': clip['id'], 'startMs': start, 'endMs': end,
            'words': [{'text': text, 'startMs': round((end - start) * i / len(words)), 'endMs': round((end - start) * (i + 1) / len(words))} for i, text in enumerate(words)],
            'needsReview': True, 'timingSource': 'estimated'}


def valid_checkpoint(value, clip, low, high):
    if not isinstance(value, dict) or value.get('timingSource') != 'aligned' or type(value.get('needsReview')) is not bool:
        return False
    start, end, words = value.get('startMs'), value.get('endMs'), value.get('words')
    if type(start) is not int or type(end) is not int or not low * 1000 - 1 <= start < end <= high * 1000 + 1 or not isinstance(words, list) or len(words) != len(clip['text'].split()):
        return False
    previous = 0
    for expected, word in zip(clip['text'].split(), words):
        if not isinstance(word, dict) or word.get('text') != expected or type(word.get('startMs')) is not int or type(word.get('endMs')) is not int or not previous <= word['startMs'] < word['endMs'] <= end - start:
            return False
        previous = word['endMs']
    return bool(words) and words[0]['startMs'] == 0
