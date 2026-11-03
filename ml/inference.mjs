/** Bounded numeric-tree evaluator for a genuine exported XGBoost binary classifier. */
import { FEATURE_NAMES, FEATURE_VERSION } from './features.mjs';

const finite=Number.isFinite;
export function validateArtifact(artifact) {
  if(!artifact || artifact.format!=='phishx-xgboost-trees-v1' || artifact.objective!=='binary:logistic' ||
      artifact.feature_version!==FEATURE_VERSION || JSON.stringify(artifact.feature_names)!==JSON.stringify(FEATURE_NAMES) ||
      typeof artifact.model_version!=='string' || !finite(artifact.base_margin) ||
      !finite(artifact.warning_threshold) || artifact.warning_threshold<0.5 || artifact.warning_threshold>1 ||
      artifact.calibration?.method!=='platt' || !finite(artifact.calibration.slope) || !finite(artifact.calibration.intercept) ||
      !Array.isArray(artifact.trees) || artifact.trees.length<1 || artifact.trees.length>200)throw Error('Unsupported model artifact');
  for(const tree of artifact.trees){
    const fields=['left_children','right_children','split_indices','split_conditions','default_left'];
    const n=tree?.left_children?.length;
    if(!Number.isInteger(n) || n<1 || n>1023 || !fields.every(key=>Array.isArray(tree[key])&&tree[key].length===n))throw Error('Invalid tree');
    const visited=new Set();const visiting=new Set();
    const walk=i=>{
      if(!Number.isInteger(i)||i<0||i>=n||visiting.has(i)||visited.has(i))throw Error('Invalid tree graph');
      visiting.add(i);
      const l=tree.left_children[i],r=tree.right_children[i],f=tree.split_indices[i];
      if(!finite(tree.split_conditions[i]) || ![0,1,false,true].includes(tree.default_left[i]))throw Error('Invalid tree value');
      if(l===-1){if(r!==-1)throw Error('Invalid leaf');}
      else {if(!Number.isInteger(f)||f<0||f>=FEATURE_NAMES.length)throw Error('Unknown feature');walk(l);walk(r);}
      visiting.delete(i);visited.add(i);
    };
    walk(0);if(visited.size!==n)throw Error('Unreachable tree node');
  }
  return artifact;
}

const sigmoid=value=>1/(1+Math.exp(-Math.max(-80,Math.min(80,value))));
export function createPredictor(candidate) {
  const artifact=validateArtifact(candidate);
  return features=>{
    if(!Array.isArray(features)||features.length!==FEATURE_NAMES.length||!features.every(finite))throw Error('Invalid model features');
    let margin=Math.fround(artifact.base_margin);
    for(const tree of artifact.trees){
      let node=0,steps=0;
      while(tree.left_children[node]!==-1){
        if(++steps>tree.left_children.length)throw Error('Invalid tree traversal');
        const f=Math.fround(features[tree.split_indices[node]]);
        node=f<tree.split_conditions[node]?tree.left_children[node]:tree.right_children[node];
      }
      margin=Math.fround(margin+Math.fround(tree.split_conditions[node]));
    }
    const rawProbability=sigmoid(margin);
    const probability=sigmoid(artifact.calibration.slope*margin+artifact.calibration.intercept);
    return {margin,raw_probability:rawProbability,probability,warning:probability>=artifact.warning_threshold};
  };
}
