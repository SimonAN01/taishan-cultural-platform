"""Offline regression checks for the resumable image collector."""
import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('collector',Path(__file__).resolve().parent.parent/'scripts/collect_images.py')
collector=importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class CollectorTests(unittest.TestCase):
 def test_resume_keeps_metadata_and_writes_matching_csv(self):
  previous=collector.OUT
  with tempfile.TemporaryDirectory() as folder:
   collector.OUT=Path(folder)
   try:
    old={'pageid':1,'file':'images/old.jpg','label':'unclassified','author':'Original author','license':'CC BY 4.0','source_page':'https://commons.wikimedia.org/wiki/File:old.jpg'}
    collector.save_manifest({1:old})
    rows={row['pageid']:row for row in json.loads((collector.OUT/'manifest.json').read_text())}
    rows[2]={'pageid':2,'file':'images/new.jpg','label':'unclassified'}
    collector.save_manifest(rows)
    result=json.loads((collector.OUT/'manifest.json').read_text())
    self.assertEqual(len(result),2);self.assertEqual(result[0],old)
    with (collector.OUT/'dataset_manifest.csv').open(encoding='utf-8-sig') as stream:data=list(csv.DictReader(stream))
    self.assertEqual([r['file'] for r in data],['images/old.jpg','images/new.jpg']);self.assertEqual(data[0]['author'],'Original author')
   finally:collector.OUT=previous
 def test_dongyuzuo_is_not_eastern_mountain_trail(self):
  self.assertEqual(collector.infer('秦李斯小篆',['Category:Dongyuzuo']),'unclassified')
  self.assertEqual(collector.infer('东御道盘路',[]),'dongyu')
  self.assertEqual(collector.infer('Doumugong Butterworth Penang Malaysia',[]),'unclassified')
  self.assertEqual(collector.infer('泰安玉皇阁坊',['Category:Yuhuang Temple']),'unclassified')

if __name__=='__main__':unittest.main()
