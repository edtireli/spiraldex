"""Stable collectible attributes. These are game ratings, not real object measurements."""
TYPES = ('household', 'nature', 'food', 'tool', 'technology', 'wearable')
LABELS = dict(zip(TYPES, ('Household', 'Nature', 'Food', 'Tool', 'Technology', 'Wearable')))


def card_profile(word, reading, card_type='household'):
    if card_type not in TYPES:
        card_type = 'household'
    seed = 2166136261
    for char in f'{word}|{reading}':
        seed = ((seed ^ ord(char)) * 16777619) & 0xffffffff
    roll = seed % 1000
    rarity = 'Common' if roll < 700 else 'Uncommon' if roll < 940 else 'Rare' if roll < 995 else 'Ultra rare'
    return {
        'version': 1, 'type': card_type, 'label': LABELS[card_type], 'rarity': rarity,
        'finish': 'foil' if roll >= 940 else 'classic', 'hp': 50 + ((seed >> 8) % 12) * 10,
        'stats': {'power': 20 + seed % 71, 'guard': 20 + (seed >> 7) % 71,
                  'wonder': 20 + (seed >> 15) % 71},
    }
