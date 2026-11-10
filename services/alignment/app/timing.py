"""Pure timing helpers: estimated positions are search windows, never final timings."""
import difflib
import unicodedata


def normalize(word):
    return ''.join(c for c in unicodedata.normalize('NFD', word.lower()) if c.isalnum())


def match_words(expected, recognized):
    matcher = difflib.SequenceMatcher(a=[normalize(w) for w in expected], b=[normalize(w['word']) for w in recognized], autojunk=False)
    return {block.a + i: recognized[block.b + i] for block in matcher.get_matching_blocks() for i in range(block.size)}


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
