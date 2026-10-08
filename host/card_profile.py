"""Model-assessed rarity and stable game ratings, never real object measurements."""
TYPES = ('household', 'nature', 'food', 'tool', 'technology', 'wearable')
LABELS = dict(zip(TYPES, ('Household', 'Nature', 'Food', 'Tool', 'Technology', 'Wearable')))
RARITIES = ('Common', 'Uncommon', 'Rare', 'Ultra rare')
FINISHES = {'Common': ('classic',), 'Uncommon': ('classic',), 'Rare': ('holo', 'reverse-holo'), 'Ultra rare': ('full-art',)}


def card_profile(word, reading, card_type='household', rarity=None, finish=None):
    if card_type not in TYPES:
        card_type = 'household'
    assessed = rarity in RARITIES
    # Existing entries without a model assessment never inherit the old random rarity.
    rarity = rarity if assessed else 'Unassessed'
    allowed = FINISHES.get(rarity, ('classic',))
    finish = finish if finish in allowed else allowed[0]
    seed = 2166136261
    for char in f'{word}|{reading}':
        seed = ((seed ^ ord(char)) * 16777619) & 0xffffffff
    return {
        'version': 2, 'type': card_type, 'label': LABELS[card_type], 'rarity': rarity,
        'assessed': assessed, 'finish': finish, 'hp': 50 + ((seed >> 8) % 12) * 10,
        'stats': {'power': 20 + seed % 71, 'guard': 20 + (seed >> 7) % 71,
                  'wonder': 20 + (seed >> 15) % 71},
    }
