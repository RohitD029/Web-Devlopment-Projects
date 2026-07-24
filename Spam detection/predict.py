"""
predict.py
----------
Loads the already-trained model + vectorizer (created by running
spam_classifier.py first) and lets you classify your own messages.

Usage:
    python predict.py
"""

import pickle
from spam_classifier import clean_text

with open("outputs/spam_model.pkl", "rb") as f:
    model = pickle.load(f)

with open("outputs/vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)


def predict_message(message):
    cleaned = clean_text(message)
    vec = vectorizer.transform([cleaned])
    prediction = model.predict(vec)[0]
    probability = model.predict_proba(vec)[0]
    confidence = max(probability)
    return prediction, confidence


if __name__ == "__main__":
    print("Spam Classifier — type a message to check (type 'exit' to quit)\n")
    while True:
        msg = input("Enter message: ").strip()
        if msg.lower() == "exit":
            break
        if not msg:
            continue
        label, conf = predict_message(msg)
        print(f"  -> Prediction: {label.upper()}  (confidence: {conf:.2%})\n")
