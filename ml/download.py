"""Reproducible licensed metadata-only corpus collection. Never visits a corpus URL."""
from __future__ import annotations
import concurrent.futures, csv, hashlib, io, json, pathlib, time, urllib.request, zipfile
import fsspec
import pyarrow.parquet as pq

ROOT=pathlib.Path(__file__).resolve().parent
DATA=ROOT/'data'
UCI='https://archive.ics.uci.edu/static/public/967/phiusiil+phishing+url+dataset.zip'
PHRESH='https://datasets-server.huggingface.co/parquet?dataset=phreshphish/phreshphish'
PHRESH_SOURCE_REVISION='eca603e0ecd4f698f8d4d226c088659e72681239'
PHRESH_PARQUET_REVISION='875e5842650e0ec464e911f1cb6d84d14466986a'

def fetch(url):
    with urllib.request.urlopen(url,timeout=60) as response:return response.read()

def phresh_shard(item):
    path=DATA/f"phresh-{item['split']}-{item['filename']}.jsonl"
    if path.exists():return path
    for attempt in range(3):
        try:
            with fsspec.open(item['url'],mode='rb',block_size=65536,cache_type='none') as source:
                parquet=pq.ParquetFile(source)
                # Bounded, deterministic projection: first two row groups of every published shard.
                table=parquet.read_row_groups(list(range(min(2,parquet.num_row_groups))),columns=['url','label','date'])
                records=table.to_pylist()
            with path.open('w',encoding='utf-8') as output:
                for row in records:
                    output.write(json.dumps({'url':row['url'],'label':int(row['label']=='phish'),'date':str(row['date']),
                        'source':'phreshphish-1.0.1','source_split':item['split']},ensure_ascii=True)+'\n')
            return path
        except Exception:
            if attempt==2:raise
            time.sleep(2**attempt)

def main():
    DATA.mkdir(parents=True,exist_ok=True)
    snapshot=json.loads((ROOT/'sources.json').read_text(encoding='utf-8'))
    expected=snapshot['provenance']['sha256']
    archive=DATA/'phiusiil.zip'
    if not archive.exists():archive.write_bytes(fetch(UCI))
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected[archive.name]:raise RuntimeError('UCI snapshot checksum mismatch')
    raw_path=DATA/'corpus.jsonl'
    # The checked-in manifest pins every shard to an immutable converted-data revision.
    files=snapshot['parquet_files']
    paths=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i,path in enumerate(pool.map(phresh_shard,files)):
            if hashlib.sha256(path.read_bytes()).hexdigest()!=expected[path.name]:raise RuntimeError(f'Projected snapshot checksum mismatch: {path.name}')
            paths.append(path)
            if (i+1)%10==0:print('Projected PhreshPhish shards',i+1,'of',len(files),flush=True)
    with raw_path.open('w',encoding='utf-8') as output:
        with zipfile.ZipFile(archive) as z:
            name=next(name for name in z.namelist() if name.lower().endswith('.csv'))
            reader=csv.DictReader(io.TextIOWrapper(z.open(name),encoding='utf-8-sig'))
            for row in reader:
                output.write(json.dumps({'url':row['URL'],'label':1-int(row['label']),'date':None,'source':'uci-phiusiil-2024'},ensure_ascii=True)+'\n')
        for path in paths:
            with path.open(encoding='utf-8') as source:
                for line in source:output.write(line)
    hashes={path.name:hashlib.sha256(path.read_bytes()).hexdigest() for path in [archive,raw_path,*paths]}
    if hashes['corpus.jsonl']!=expected['corpus.jsonl']:raise RuntimeError('Combined corpus checksum mismatch')
    (DATA/'download-provenance.json').write_text(json.dumps({'uci_url':UCI,'phresh_manifest_url':PHRESH,
        'phresh_source_revision':PHRESH_SOURCE_REVISION,'phresh_parquet_revision':PHRESH_PARQUET_REVISION,
        'sampling':'first two row groups per converted shard, projected url,label,date; no HTML or target URLs fetched',
        'sha256':hashes},indent=2),encoding='utf-8')
    print('Corpus complete',raw_path.stat().st_size,'bytes',flush=True)

if __name__=='__main__':main()
