"""
Email/SMS Spam Classifier
--------------------------
A mini machine learning project that classifies text messages as
SPAM or HAM (safe) using NLP preprocessing + TF-IDF + Naive Bayes /
Logistic Regression.

Dataset: SMS Spam Collection (5,572 labeled messages)

Author: [Your Name]
"""

import re
import string
import pickle

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

# ---------------------------------------------------------
# 0. One-time NLTK downloads (stopwords list used in cleaning)
# ---------------------------------------------------------
nltk.download("stopwords", quiet=True)

STOPWORDS = set(stopwords.words("english"))
STEMMER = PorterStemmer()


# ---------------------------------------------------------
# 1. Load the data
# ---------------------------------------------------------
def load_data(path="data/spam.csv"):
    df = pd.read_csv(path, encoding="latin-1")
    df = df[["label", "message"]]          # keep only what we need
    df.drop_duplicates(inplace=True)        # remove duplicate messages
    df.dropna(inplace=True)
    return df


# ---------------------------------------------------------
# 2. Text cleaning / preprocessing
#    lowercase -> remove punctuation/numbers -> remove stopwords -> stem
# ---------------------------------------------------------
def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)          # remove links
    text = re.sub(r"\d+", " ", text)                      # remove numbers
    text = text.translate(str.maketrans("", "", string.punctuation))
    words = text.split()
    words = [STEMMER.stem(w) for w in words if w not in STOPWORDS and len(w) > 2]
    return " ".join(words)


# ---------------------------------------------------------
# 3. EDA (quick look at the data — good to show in a report/notebook)
# ---------------------------------------------------------
def explore_data(df):
    print("\n--- Dataset Overview ---")
    print(df["label"].value_counts())

    plt.figure(figsize=(5, 4))
    sns.countplot(x="label", hue="label", data=df, palette="Set2", legend=False)
    plt.title("Spam vs Ham Message Count")
    plt.savefig("outputs/class_distribution.png", bbox_inches="tight")
    plt.close()
    print("Saved class distribution plot -> outputs/class_distribution.png")


# ---------------------------------------------------------
# 4. Train + evaluate a model, return metrics
# ---------------------------------------------------------
def train_and_evaluate(model, model_name, X_train, X_test, y_train, y_test):
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, pos_label="spam")
    rec = recall_score(y_test, preds, pos_label="spam")
    f1 = f1_score(y_test, preds, pos_label="spam")

    print(f"\n=== {model_name} ===")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 Score : {f1:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, preds))

    # Confusion matrix plot
    cm = confusion_matrix(y_test, preds, labels=["ham", "spam"])
    plt.figure(figsize=(4, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["ham", "spam"], yticklabels=["ham", "spam"])
    plt.title(f"Confusion Matrix - {model_name}")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    fname = f"outputs/confusion_matrix_{model_name.replace(' ', '_').lower()}.png"
    plt.savefig(fname, bbox_inches="tight")
    plt.close()

    return {"model": model_name, "accuracy": acc, "precision": prec,
            "recall": rec, "f1": f1}


# ---------------------------------------------------------
# 5. Main pipeline
# ---------------------------------------------------------
def main():
    import os
    os.makedirs("outputs", exist_ok=True)

    print("Loading data...")
    df = load_data()

    explore_data(df)

    print("\nCleaning text (this can take a few seconds)...")
    df["clean_message"] = df["message"].apply(clean_text)

    # Convert text -> TF-IDF numeric features
    vectorizer = TfidfVectorizer(max_features=3000)
    X = vectorizer.fit_transform(df["clean_message"])
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = []

    # Model 1: Multinomial Naive Bayes (classic baseline for text classification)
    nb_model = MultinomialNB()
    results.append(train_and_evaluate(
        nb_model, "Naive Bayes", X_train, X_test, y_train, y_test))

    # Model 2: Logistic Regression
    lr_model = LogisticRegression(max_iter=1000)
    results.append(train_and_evaluate(
        lr_model, "Logistic Regression", X_train, X_test, y_train, y_test))

    # Compare models
    results_df = pd.DataFrame(results)
    print("\n--- Model Comparison ---")
    print(results_df.to_string(index=False))
    results_df.to_csv("outputs/model_comparison.csv", index=False)

    # Pick the better model (by F1 score) and save it for later use
    best_row = results_df.loc[results_df["f1"].idxmax()]
    best_model = nb_model if best_row["model"] == "Naive Bayes" else lr_model
    print(f"\nBest model: {best_row['model']} (F1 = {best_row['f1']:.4f})")

    with open("outputs/spam_model.pkl", "wb") as f:
        pickle.dump(best_model, f)
    with open("outputs/vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)
    print("Saved model -> outputs/spam_model.pkl")
    print("Saved vectorizer -> outputs/vectorizer.pkl")

    # Quick manual sanity check with a few custom messages
    sample_messages = [
        "Congratulations! You've won a $1000 Walmart gift card. Click here to claim now!",
        "Hey, are we still meeting for lunch tomorrow?",
        "URGENT: Your account has been suspended. Verify your details immediately.",
        "Can you send me the notes from today's class?",
    ]
    print("\n--- Sample Predictions ---")
    for msg in sample_messages:
        cleaned = clean_text(msg)
        vec = vectorizer.transform([cleaned])
        pred = best_model.predict(vec)[0]
        print(f"[{pred.upper():5}] {msg}")


if __name__ == "__main__":
    main()
