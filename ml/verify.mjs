import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { createPredictor, validateArtifact } from './inference.mjs';
import { extractFeatures, FEATURE_NAMES } from './features.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const hash=name=>createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
const artifact=read('model/xgboost-edge.json'),evaluation=read('model/evaluation.json');
assert.equal(hash('model/xgboost-edge.json'),evaluation.artifact_sha256,'Edge artifact checksum');
assert.equal(hash('model/xgboost-native.json'),evaluation.native_sha256,'Native artifact checksum');
assert.equal(hash('ml/features.mjs'),evaluation.feature_sha256,'Feature code changed without retraining');
assert.ok(evaluation.promoted && Object.values(evaluation.promotion_gates).every(Boolean),'Promotion requirements');
assert.ok(Object.values(evaluation.datasets.pairwise_domain_overlap).every(n=>n===0),'Domain-disjoint partitions');
const predict=createPredictor(artifact),fixtures=read('model/parity-fixtures.json');
let rawDelta=0,marginDelta=0,calibratedDelta=0;
for(const row of fixtures){
  const actual=predict(row.features);
  rawDelta=Math.max(rawDelta,Math.abs(actual.raw_probability-row.native_probability));
  marginDelta=Math.max(marginDelta,Math.abs(actual.margin-row.native_margin));
  calibratedDelta=Math.max(calibratedDelta,Math.abs(actual.probability-row.calibrated_probability));
}
assert.ok(rawDelta<1e-6 && marginDelta<1e-6 && calibratedDelta<1e-6,'Native/edge parity');
for(const row of read('model/serving-fixtures.json')){
  assert.deepEqual(extractFeatures(row.url,row.domain),row.features,'Shared train/serve feature parity');
  assert.ok(Math.abs(predict(row.features).raw_probability-row.native_probability)<1e-6,'URL->native probability parity');
}
for(let i=0;i<8;i+=2){
  const controls=read('model/serving-fixtures.json');
  assert.deepEqual(controls[i].features,controls[i+1].features,'Protocol-invariant controls');
  assert.equal(predict(controls[i].features).warning,false,'Benign protocol control');
}
for(const mutate of [
  a=>{a.feature_version='unknown';},a=>{a.trees[0].left_children[0]=0;},
  a=>{a.trees[0].split_indices[0]=999;},a=>{a.calibration.slope=null;},
  a=>{a.trees[0].split_conditions[0]='not-a-number';},a=>{a.warning_threshold=0.01;},
]){const damaged=structuredClone(artifact);mutate(damaged);assert.throws(()=>validateArtifact(damaged));}
assert.throws(()=>predict(Array(FEATURE_NAMES.length).fill(NaN)));
assert.throws(()=>predict([0]));
const rows=read('model/serving-fixtures.json');
for(let i=0;i<1000;i++){const row=rows[i%rows.length];predict(extractFeatures(row.url,row.domain));}
const samples=[];
for(let i=0;i<10000;i++){const row=rows[i%rows.length],start=performance.now();predict(extractFeatures(row.url,row.domain));samples.push(performance.now()-start);}
samples.sort((a,b)=>a-b);
const result={verified:true,model_version:artifact.model_version,trees:artifact.trees.length,features:FEATURE_NAMES.length,
  native_parity:{fixtures:fixtures.length,max_raw_probability_delta:rawDelta,max_margin_delta:marginDelta,max_calibrated_probability_delta:calibratedDelta},
  serving_features_fixtures:rows.length,latency:{environment:`Node ${process.version} ${process.platform}/${process.arch}`,
    scope:'local synchronous feature extraction plus edge tree inference, warmed up; excludes HTTP/providers',samples:samples.length,
    p50_ms:samples[Math.floor(samples.length*0.5)],p95_ms:samples[Math.floor(samples.length*0.95)],p99_ms:samples[Math.floor(samples.length*0.99)]}};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(root,'model/runtime-verification.json'),`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));
