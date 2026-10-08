import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'host'))
from card_profile import card_profile,TYPES,FINISHES

class CardProfile(unittest.TestCase):
    def test_browser_and_host_agree_for_every_type_and_unicode(self):
        examples=[('椅子','いす',t) for t in TYPES]+[('りんご','りんご','food'),('𠮷','よし','household')]+[('りんご','りんご','food',rarity,finish) for rarity,finishes in FINISHES.items() for finish in finishes]
        program="const profile=require('./web/card-profile.js');console.log(JSON.stringify(JSON.parse(process.argv[1]).map(args=>profile(...args))));"
        actual=json.loads(subprocess.check_output(['node','-e',program,json.dumps(examples)],cwd=ROOT,text=True))
        self.assertEqual(actual,[card_profile(*args) for args in examples])

    def test_rescanning_a_word_cannot_reroll_its_attributes(self):
        first=card_profile('椅子','いす','household')
        self.assertEqual(first,card_profile('椅子','いす','household'))
        self.assertEqual(first['rarity'],'Unassessed')
        self.assertEqual(first['finish'],'classic')
        self.assertTrue(all(20<=score<=90 for score in first['stats'].values()))

    def test_model_rarity_is_not_replaced_by_word_hash(self):
        common=card_profile('椅子','いす','household','Common','classic')
        rare=card_profile('椅子','いす','household','Rare','holo')
        self.assertEqual(common['rarity'],'Common')
        self.assertEqual(rare['rarity'],'Rare')
        self.assertEqual(rare['finish'],'holo')
        self.assertEqual(common['stats'],rare['stats'])
        self.assertEqual(card_profile('椅子','いす','household','Common','holo')['finish'],'classic')

    def test_unknown_type_cannot_choose_a_css_class(self):
        self.assertEqual(card_profile('x','x','<script>')['type'],'household')

if __name__=='__main__':unittest.main()
