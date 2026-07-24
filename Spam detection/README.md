# Email / SMS Spam Classifier

A mini machine learning project that classifies text messages as **SPAM**
or **HAM (safe)** using NLP preprocessing and classic ML models
(Naive Bayes and Logistic Regression).

## Problem Statement
Spam messages (promotional, phishing, scam texts) waste time and can be
dangerous. This project builds a binary text classifier that automatically
sorts a message as spam or safe, using standard NLP + machine learning
techniques.

## Dataset
- **SMS Spam Collection Dataset** — 5,572 real SMS messages labeled
  `ham` or `spam`.
- Source: UCI Machine Learning Repository (also hosted on Kaggle).
- File used: `data/spam.csv` (columns: `label`, `message`)

## Approach / Pipeline
1. **Load & clean data** — remove duplicates/nulls, keep only label + message.
2. **Text preprocessing (NLP)**
   - Lowercasing
   - Removing URLs and numbers
   - Removing punctuation
   - Removing stopwords (NLTK)
   - Stemming (Porter Stemmer) — reduces words to their root form
     (e.g. "winning", "won" -> "win")
3. **Feature extraction** — convert cleaned text into numeric vectors using
   **TF-IDF** (Term Frequency–Inverse Document Frequency), capped at
   3000 features.
4. **Train/test split** — 80/20 split, stratified by label so both sets
   keep the same spam/ham ratio.
5. **Model training** — two models are trained and compared:
   - **Multinomial Naive Bayes** (classic, fast baseline for text)
   - **Logistic Regression**
6. **Evaluation** — accuracy, precision, recall, F1-score, and confusion
   matrix for each model.
7. **Model selection** — the model with the higher F1-score (better
   balance of precision/recall on the minority "spam" class) is saved.
8. **Save artifacts** — trained model and TF-IDF vectorizer are pickled
   so they can be reused without retraining.

## Results (on this run)

| Model               | Accuracy | Precision | Recall | F1-score |
|---------------------|----------|-----------|--------|----------|
| Naive Bayes         | ~97.5%   | ~0.99     | ~0.81  | ~0.89    |
| Logistic Regression | ~95.5%   | ~0.98     | ~0.66  | ~0.79    |

Naive Bayes performed better here — it's a well-known strong baseline
for text classification because of its speed and how well it handles
sparse, high-dimensional TF-IDF features.

(Exact numbers can vary slightly by run due to the random train/test split.)

## Project Structure
```
spam_classifier/
├── data/
│   └── spam.csv              # dataset
├── outputs/                   # created after running the script
│   ├── class_distribution.png
│   ├── confusion_matrix_naive_bayes.png
│   ├── confusion_matrix_logistic_regression.png
│   ├── model_comparison.csv
│   ├── spam_model.pkl
│   └── vectorizer.pkl
├── spam_classifier.py         # main training/evaluation script
├── predict.py                 # interactive script to test your own messages
├── requirements.txt
└── README.md
```

## How to Run

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Train the model (this also runs preprocessing, evaluation, and saves
   the model):
   ```
   python spam_classifier.py
   ```

3. Try your own messages using the saved model:
   ```
   python predict.py
   ```

## What I'd Improve Next
- Try more advanced vectorization (word embeddings, e.g. Word2Vec/GloVe)
- Try an ensemble (e.g. SVM, Random Forest) and compare
- Handle class imbalance more explicitly (e.g. SMOTE), since spam is
  the minority class
- Deploy as a simple Flask/Streamlit web app with a text box

## Tech Stack
Python, pandas, scikit-learn, NLTK, matplotlib, seaborn
