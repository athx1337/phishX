import importlib.util
from pathlib import Path
import numpy as np
import pandas as pd

spec=importlib.util.spec_from_file_location('phishx_training',Path(__file__).resolve().parents[1]/'train.py')
training=importlib.util.module_from_spec(spec);spec.loader.exec_module(training)

def test_later_domains_are_purged_from_earlier_partitions():
    rows=pd.DataFrame([
        {'url':'https://shared.example/a','domain':'shared.example','date':'2025-01-01','label':0},
        {'url':'https://shared.example/b','domain':'shared.example','date':'2025-10-01','label':1},
        {'url':'https://older.example/','domain':'older.example','date':None,'label':0},
        {'url':'https://validation.example/','domain':'validation.example','date':'2025-06-01','label':1},
        {'url':'https://calibration.example/','domain':'calibration.example','date':'2025-08-01','label':0},
    ])
    selected,stats=training.partition(rows)
    assert stats['rows_purged_for_later_domain']==1
    assert selected[selected.domain=='shared.example'].split.tolist()==['test']
    assert selected[selected.domain=='older.example'].split.tolist()==['train']
    domains={name:set(part.domain) for name,part in selected.groupby('split')}
    assert not domains['train']&domains['test']
    assert not domains['validation']&domains['calibration']

def test_frequency_cap_is_deterministic_and_label_blind():
    rows=pd.DataFrame([{'url':f'https://many.example/{i}','domain':'many.example','date':'2025-01-01','label':i%2} for i in range(70)])
    a,stats=training.partition(rows)
    b,_=training.partition(rows.iloc[::-1].assign(label=1-rows.iloc[::-1].label))
    assert len(a)==30
    assert stats['rows_removed_by_domain_cap']==40
    assert set(a.url)==set(b.url)

def test_metrics_are_real_confusion_metrics_not_accuracy_aliases():
    m=training.metrics(np.array([0,0,1,1]),np.array([0.1,0.9,0.8,0.2]),0.5)
    assert m['confusion_matrix']=={'tn':1,'fp':1,'fn':1,'tp':1}
    assert m['precision']==m['recall']==m['false_positive_rate']==m['false_negative_rate']==0.5
    assert m['fpr_wilson_95'][0]<0.5<m['fpr_wilson_95'][1]

def test_low_base_rate_changes_precision():
    m=training.metrics(np.array([0,0,1,1]),np.array([0.1,0.9,0.8,0.2]),0.5)
    assert m['hypothetical_precision_by_base_rate']['0.001']<0.01

def test_wilson_bound_does_not_claim_zero_risk_from_zero_observed_errors():
    lower,upper=training.wilson(0,1000)
    assert lower<1e-12
    assert 0<upper<0.01
