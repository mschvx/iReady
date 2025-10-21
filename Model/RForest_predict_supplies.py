# ===========================================
# RANDOM FOREST PREDICTIONS FOR SUPPLIES
# ===========================================
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score
from RForest_train import train_rf_model  

# Call the random forest training model
rf, X_test, y_test = train_rf_model()

# Make predictions
y_pred = rf.predict(X_test)

# Build predictions one dataframe round to whole numbers
pred_df = pd.DataFrame(y_pred, columns=y_test.columns)
pred_df = pred_df.clip(lower=0).round(0).astype(int)
pred_only_df = pd.concat([X_test.reset_index(drop=True), pred_df.add_prefix('pred_')], axis=1)

# Area details and predictions
print("\n=== Sample Predictions (features | predicted) ===")
with pd.option_context('display.max_rows', 10, 'display.max_columns', None):
    print(pred_only_df.head(10).round(1))

# Evaluate using MAE and R2 per supply column
print('\n=== Evaluation per item ===')
mae_per_item = {}
r2_per_item = {}
for col in y_test.columns:
    mae_per_item[col] = mean_absolute_error(y_test[col], pred_df[col])
    try:
        r2_per_item[col] = r2_score(y_test[col], pred_df[col])
    except Exception:
        r2_per_item[col] = float('nan')

eval_df = pd.DataFrame({'MAE': mae_per_item, 'R2': r2_per_item})
print(eval_df.round(2))

# ===========================================
# Weight/importance of each category
# ===========================================
try:
    importances = rf.feature_importances_
    feature_importance = pd.DataFrame({
        'Feature': X_test.columns,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False)
    print("\n=== Feature Importance ===")
    print(feature_importance.round(3))
except Exception:
    print('\nFeature importances not available for this model type.')