# Superseded first experiment — do not serve

These v1 native/edge/evaluation/parity artifacts and feature/training source snapshots preserve the experiment history. v1 contains a learned HTTP/HTTPS shortcut that produces warnings for ordinary HTTP benign controls. It has been replaced by protocol-invariant v2 in the parent directory.

The source snapshots are historical records, not standalone entry points: `train.py` originally lived in `ml/`, using that directory's feature runner and the ignored dataset snapshot. To replay exactly, use the same pinned corpus/dependency versions and restore all three snapshots to their original paths in a separate checkout. Do not combine these weights with v2 features. Snapshot SHA256 values are retained in the historical evaluation report.

Both experiments evaluated the same fixed test; the v2 report explicitly discloses this second evaluation. Do not cite the earlier test as a fresh independent confirmation or deploy v1 as a rollback.
