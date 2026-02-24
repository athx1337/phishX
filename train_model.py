# pyre-ignore-all-errors
import pandas as pd  # pyre-ignore
from xgboost import XGBClassifier  # pyre-ignore
import pickle

data = pd.read_csv('repo/DataFiles/5.urldata.csv')
# We drop features that overfit incorrectly (Length/Depth) or rely on dead APIs (Web_Traffic) or slow lookup (Domain_Age/End)
X = data.drop(['Domain', 'Label', 'URL_Length', 'URL_Depth', 'Domain_Age', 'Domain_End', 'Web_Traffic'], axis=1)
y = data['Label']

model = XGBClassifier(learning_rate=0.4,max_depth=7, use_label_encoder=False)
model.fit(X, y)

print("Trained model:", model)

with open('backend/new_model.pickle', 'wb') as f:
    pickle.dump(model, f)
print("Saved new model successfully!")
