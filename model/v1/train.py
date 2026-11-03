"""Train/evaluate/export real XGBoost using shared JavaScript lexical features.

No request is ever made to an observed URL. Downloads are handled separately.
"""
from __future__ import annotations
import argparse, collections, hashlib, json, math, pathlib, subprocess, sys, time
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
    precision_score, recall_score, roc_auc_score, log_loss)
import sklearn, xgboost
from xgboost import XGBClassifier

ROOT=pathlib.Path(__file__).resolve().parent.parent
DATA=ROOT/'ml/data'; ARTIFACT=ROOT/'model'
SEED=20261103

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def project_features():
    source=DATA/'corpus.jsonl'; output=DATA/'features.jsonl'
    manifest=DATA/'features-manifest.json'
    inputs={'corpus_sha256':sha(source),'features_sha256':sha(ROOT/'ml/features.mjs'),'runner_sha256':sha(ROOT/'ml/feature-runner.mjs')}
    if output.exists() and manifest.exists() and json.loads(manifest.read_text())==inputs:return output
    with source.open('r',encoding='utf-8') as stdin,output.open('w',encoding='utf-8') as stdout:
        subprocess.run(['node',str(ROOT/'ml/feature-runner.mjs')],stdin=stdin,stdout=stdout,check=True,cwd=ROOT)
    manifest.write_text(json.dumps(inputs,indent=2),encoding='utf-8')
    return output

def partition(frame):
    """Use collection time, then purge earlier partitions by registrable-domain ownership."""
    frame=frame.copy()
    frame['split']='train'
    dated=frame['date'].notna()
    frame.loc[dated & (frame['date']>='2025-06-01'),'split']='validation'
    frame.loc[dated & (frame['date']>='2025-08-01'),'split']='calibration'
    frame.loc[dated & (frame['date']>='2025-10-01'),'split']='test'
    order={'train':0,'validation':1,'calibration':2,'test':3}
    rank=frame['split'].map(order)
    latest=rank.groupby(frame['domain']).transform('max')
    before=len(frame);frame=frame[rank==latest].copy();domain_purged=before-len(frame)
    # Campaign/domain frequency cap applied label-blind by stable URL hash.
    frame['order']=frame['url'].map(lambda u:hashlib.sha256(u.encode()).hexdigest())
    frame=frame.sort_values('order').groupby(['domain','split'],sort=False).head(30)
    return frame.drop(columns=['order']),{'rows_purged_for_later_domain':domain_purged,'rows_removed_by_domain_cap':before-domain_purged-len(frame)}

def wilson(successes,total):
    if not total:return [0.,1.]
    z=1.959963984540054;p=successes/total;den=1+z*z/total
    center=(p+z*z/(2*total))/den;radius=z*math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den
    return [max(0,center-radius),min(1,center+radius)]

def metrics(y,p,threshold):
    pred=p>=threshold;tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
    bins=np.linspace(0,1,11);ece=0.
    for low,high in zip(bins[:-1],bins[1:]):
        mask=(p>=low)&(p<high if high<1 else p<=high)
        if mask.any():ece+=mask.mean()*abs(float(y[mask].mean())-float(p[mask].mean()))
    return {'samples':len(y),'positives':int(y.sum()),'negatives':int((1-y).sum()),
        'confusion_matrix':{'tn':int(tn),'fp':int(fp),'fn':int(fn),'tp':int(tp)},
        'precision':float(precision_score(y,pred,zero_division=0)),'recall':float(recall_score(y,pred,zero_division=0)),
        'false_positive_rate':float(fp/max(1,fp+tn)),'false_negative_rate':float(fn/max(1,tp+fn)),
        'fpr_wilson_95':wilson(int(fp),int(fp+tn)),'recall_wilson_95':wilson(int(tp),int(tp+fn)),
        'roc_auc':float(roc_auc_score(y,p)) if len(np.unique(y))>1 else None,
        'average_precision':float(average_precision_score(y,p)),
        'brier':float(brier_score_loss(y,p)),'ece_10_bins':float(ece),
        'log_loss':float(log_loss(y,np.clip(p,1e-9,1-1e-9),labels=[0,1])),
        'hypothetical_precision_by_base_rate':{str(rate):float((tp/max(1,tp+fn))*rate/max(1e-15,(tp/max(1,tp+fn))*rate+(fp/max(1,fp+tn))*(1-rate))) for rate in [0.0005,0.001,0.005,0.01,0.05]}}

def sigmoid(x):return 1/(1+np.exp(-np.clip(x,-80,80)))

def run():
    ARTIFACT.mkdir(exist_ok=True)
    records=[]
    for line in project_features().open(encoding='utf-8'):
        row=json.loads(line)
        if row is not None:records.append(row)
    frame=pd.DataFrame(records);raw_count=len(frame)
    raw_downloaded=sum(1 for _ in (DATA/'corpus.jsonl').open(encoding='utf-8'))
    conflicts=frame.groupby('url')['label'].nunique();ambiguous=set(conflicts[conflicts>1].index)
    frame=frame[~frame['url'].isin(ambiguous)].drop_duplicates('url');deduplicated_count=len(frame)
    frame,purged=partition(frame)
    parts={name:part.reset_index(drop=True) for name,part in frame.groupby('split')}
    for name in ['train','validation','calibration','test']:
        if name not in parts or len(parts[name])<100 or parts[name]['label'].nunique()!=2:
            raise RuntimeError(f'Insufficient independent {name} data')
    domain_sets={name:set(part.domain) for name,part in parts.items()}
    for a in domain_sets:
        for b in domain_sets:
            if a!=b:assert not domain_sets[a]&domain_sets[b]
    X={name:np.asarray(part.features.tolist(),dtype=np.float32) for name,part in parts.items()}
    y={name:part.label.to_numpy(dtype=np.int32) for name,part in parts.items()}
    print('PARTITIONS',json.dumps({name:{'rows':len(part),'domains':part.domain.nunique(),'labels':part.label.value_counts().to_dict(),'dates':[str(part.date.dropna().min()),str(part.date.dropna().max())]} for name,part in parts.items()},default=int),flush=True)
    model=XGBClassifier(n_estimators=160,max_depth=4,learning_rate=0.08,min_child_weight=8,
        subsample=0.85,colsample_bytree=0.9,reg_lambda=3,reg_alpha=0.2,
        objective='binary:logistic',eval_metric='logloss',tree_method='hist',random_state=SEED,
        n_jobs=4,early_stopping_rounds=20)
    start=time.perf_counter();model.fit(X['train'],y['train'],eval_set=[(X['validation'],y['validation'])],verbose=False)
    training_seconds=time.perf_counter()-start
    # Calibration is separate from fitting and threshold selection. The test remains untouched.
    booster=model.get_booster()[:model.best_iteration+1]
    margins={name:booster.predict(xgboost.DMatrix(features),output_margin=True) for name,features in X.items()}
    calibrator=LogisticRegression(C=10,random_state=SEED).fit(margins['calibration'].reshape(-1,1),y['calibration'])
    a=float(calibrator.coef_[0,0]);b=float(calibrator.intercept_[0])
    scores={name:sigmoid(a*margin+b) for name,margin in margins.items()}
    # Max recall subject to empirical validation FPR <=0.5%; test is never used to tune.
    negatives=np.sort(scores['validation'][y['validation']==0]);n_neg=len(negatives)
    allowed=max(0,int(math.floor(0.005*n_neg)))
    threshold=float(np.nextafter(negatives[-allowed-1],np.inf)) if n_neg else 1.
    threshold=min(1.,max(0.5,threshold))
    reports={name:metrics(y[name],scores[name],threshold) for name in ['validation','calibration','test']}
    base_score=float(y['train'].mean());baseline={name:metrics(y[name],np.full(len(y[name]),base_score),threshold) for name in ['validation','test']}
    native=ARTIFACT/'xgboost-native.json';booster.save_model(native)
    official=json.loads(native.read_text())
    base=json.loads(official['learner']['learner_model_param']['base_score'])
    if isinstance(base,list):base=base[0]
    base_margin=math.log(float(base)/(1-float(base)))
    trees=[]
    for tree in official['learner']['gradient_booster']['model']['trees']:
        if any(tree['split_type']):raise RuntimeError('Categorical trees are not supported by the edge exporter')
        trees.append({key:tree[key] for key in ['left_children','right_children','split_indices','split_conditions','default_left']})
    feature_info=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{FEATURE_VERSION,FEATURE_NAMES}from'./ml/features.mjs';console.log(JSON.stringify({version:FEATURE_VERSION,names:FEATURE_NAMES}))"],cwd=ROOT,text=True))
    artifact={'format':'phishx-xgboost-trees-v1','model_version':'xgb-url-2026-11-03-v1','feature_version':feature_info['version'],
        'feature_names':feature_info['names'],'objective':'binary:logistic','base_margin':base_margin,'trees':trees,
        'calibration':{'method':'platt','slope':a,'intercept':b},'warning_threshold':threshold,
        'policy':'positive_warning_only','training_library':f'xgboost {xgboost.__version__}'}
    edge=ARTIFACT/'xgboost-edge.json';edge.write_text(json.dumps(artifact,separators=(',',':')),encoding='utf-8')
    # Promote solely on prespecified validation gates. Heldout degradation is reported, not tuned away.
    gates={'validation_fpr_at_most_0_005':reports['validation']['false_positive_rate']<=0.005,
        'validation_fpr_wilson_upper_at_most_0_01':reports['validation']['fpr_wilson_95'][1]<=0.01,
        'validation_precision_at_least_0_80':reports['validation']['precision']>=0.8,
        'validation_recall_at_least_0_10':reports['validation']['recall']>=0.1,
        'artifact_under_1mb':edge.stat().st_size<1_000_000}
    provenance=json.loads((DATA/'download-provenance.json').read_text())
    counts={name:{'rows':len(part),'domains':int(part.domain.nunique()),'labels':{str(k):int(v) for k,v in part.label.value_counts().items()},
        'date_min':str(part.date.dropna().min()) if part.date.notna().any() else None,
        'date_max':str(part.date.dropna().max()) if part.date.notna().any() else None,
        'sources':{str(k):int(v) for k,v in part.source.value_counts().items()}} for name,part in parts.items()}
    report={'model_version':artifact['model_version'],'feature_version':feature_info['version'],'seed':SEED,
        'datasets':{'downloaded_rows':raw_downloaded,'raw_valid_rows':raw_count,'feature_eligibility_coverage':raw_count/raw_downloaded,'conflicting_urls_removed':len(ambiguous),'deduplicated_before_domain_purge':deduplicated_count,
            'purge_counts':purged,'partitions':counts,'train_test_domain_overlap':0,
            'pairwise_domain_overlap':{f'{a}:{b}':len(domain_sets[a]&domain_sets[b]) for a in sorted(domain_sets) for b in sorted(domain_sets) if a<b}},
        'split_policy':'Collection-time train<2025-06,validation June-July,calibration August-September,test October-December; UCI publication-2024 undated prior only in training; earlier observations of later-owned registrable domains purged; max30 URLs/domain.',
        'threshold_policy':'Maximum validation recall subject to empirical FPR<=0.5%, threshold>=0.5; no test tuning.',
        'threshold':threshold,'calibration':artifact['calibration'],'metrics':reports,'constant_prevalence_baseline':baseline,
        'validation_operating_points':{str(point):metrics(y['validation'],scores['validation'],point) for point in sorted(set([0.5,0.75,threshold,0.95,0.99]))},
        'promotion_gates':gates,'promoted':all(gates.values()),'training_seconds':training_seconds,'trees':len(trees),'artifact_bytes':edge.stat().st_size,
        'libraries':{'python':sys.version.split()[0],'xgboost':xgboost.__version__,'sklearn':sklearn.__version__,'numpy':np.__version__,'pandas':pd.__version__},
        'artifact_sha256':sha(edge),'native_sha256':sha(native),'feature_sha256':sha(ROOT/'ml/features.mjs'),
        'corpus_sha256':sha(DATA/'corpus.jsonl'),'download_provenance':provenance,
        'limitations':['URL-only model; cannot inspect page content or prove safety.','Historical labels are not current live validity.',
            'Deterministic first-two-rowgroup shard sampling and domain frequency caps change base rates; this is not the full official PhreshPhish benchmark.',
            'UCI rows lack individual collection timestamps; publication date is a prior-source assumption, not invented per-row dates.',
            'No superiority over another scanner is established.','Calibration and measured probabilities do not guarantee population calibration under distribution shift.']}
    fixtures=[]
    selected=parts['test'].head(100)
    for index,row in selected.iterrows():
        features=np.asarray(row.features,dtype=np.float32)
        native_raw=float(booster.predict(xgboost.DMatrix(features.reshape(1,-1)))[0])
        fixtures.append({'url':row.url,'domain':row.domain,'features':row.features,'native_probability':native_raw,
            'native_margin':float(margins['test'][index]),'calibrated_probability':float(scores['test'][index])})
    # Fixtures contain public historical URLs; redact URL content from tracked fixtures while retaining feature/parity evidence.
    (ARTIFACT/'parity-fixtures.json').write_text(json.dumps([{k:v for k,v in f.items() if k not in ['url','domain']} for f in fixtures],separators=(',',':')),encoding='utf-8')
    # Public, synthetic controls exercise the actual URL->PSL->float32->native chain.
    controls=['https://example.com/','http://example.com/','https://google.com/','http://google.com/',
        'https://github.com/','http://github.com/','https://wikipedia.org/','http://wikipedia.org/',
        'HTTPS://EXAMPLE.COM/Account?x=12','https://example.com:8443/login','https://example.com/a/b/../c',
        'https://example.com/%61ccount?q=%2Fverify','https://example.com/a//b','https://example.com/?a=1&a=2',
        'https://example.com/a-b_c.txt','https://login.account.example.com/verify/password',
        'https://bücher.de/über','https://xn--bcher-kva.de/','http://8.8.8.8/login','https://[2606:4700:4700::1111]/',
        'https://tenant.github.io/login','https://a.b.example.co.uk/wallet','https://example.com/?q='+'a'*3800]
    output=subprocess.check_output(['node',str(ROOT/'ml/feature-runner.mjs')],input=''.join(json.dumps({'url':u,'label':0,'source':'synthetic-control'})+'\n' for u in controls),text=True,cwd=ROOT)
    serving=[]
    for line in output.splitlines():
        row=json.loads(line)
        if row is None:raise RuntimeError('Synthetic control failed the canonical URL contract')
        vector=np.asarray(row['features'],dtype=np.float32).reshape(1,-1)
        row['native_probability']=float(booster.predict(xgboost.DMatrix(vector))[0])
        row['native_margin']=float(booster.predict(xgboost.DMatrix(vector),output_margin=True)[0])
        row['calibrated_probability']=float(sigmoid(a*row['native_margin']+b))
        row['warning']=row['calibrated_probability']>=threshold
        serving.append({k:v for k,v in row.items() if k not in ['label','date','source']})
    (ARTIFACT/'serving-fixtures.json').write_text(json.dumps(serving,separators=(',',':')),encoding='utf-8')
    report['benign_protocol_controls']=[{k:row[k] for k in ['url','calibrated_probability','warning']} for row in serving[:8]]
    report['test_slices']={name:metrics(y['test'][mask],scores['test'][mask],threshold) for name,mask in {
        'http':parts['test'].url.str.startswith('http:').to_numpy(),
        'https':parts['test'].url.str.startswith('https:').to_numpy(),
        'url_length_over_100':parts['test'].url.str.len().gt(100).to_numpy(),
        'url_length_at_most_100':parts['test'].url.str.len().le(100).to_numpy(),
    }.items() if mask.any()}
    split_manifest=DATA/'split-manifest.json'
    split_manifest.write_text(json.dumps({name:{'urls':[hashlib.sha256(u.encode()).hexdigest() for u in part.url],
        'domains':[hashlib.sha256(d.encode()).hexdigest() for d in sorted(domain_sets[name])]} for name,part in parts.items()}),encoding='utf-8')
    report['split_manifest_sha256']=sha(split_manifest)
    (ARTIFACT/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('RESULT',json.dumps({'metrics':reports,'threshold':threshold,'promoted':all(gates.values()),'gates':gates,'trees':len(trees),'bytes':edge.stat().st_size,'training_seconds':training_seconds}),flush=True)

if __name__=='__main__':run()
