# Matrix Smart AI - ML Engine API

This is the real Machine Learning Engine written in Python using `FastAPI`. It uses predictive analytics and natural language processing (NLP) to self-learn and evaluate user timesheet inputs against their R&R matrix.

## Core ML Tech Stack:
1. **Sentence Transformers (`all-MiniLM-L6-v2`)**: Supervised NLP to encode meaning behind User Tasks & Assigned Responsibilities and measure Semantic Cosine Similarity for **Role-KPI Alignment**.
2. **Scikit-Learn (`IsolationForest`)**: Unsupervised Predictive learning to train on typical workforce baseline data to detect severe anomalies and **Burnout/Workload Risks**.

---

## 🚀 How to Start the Machine Learning Engine

You must run this API alongside your Next.js project.

**Step 1:** Open a NEW terminal window in Windows and navigate to this folder:
```bash
cd ml-engine
```

**Step 2:** Ensure Python is installed, then install the ML dependencies:
```bash
pip install -r requirements.txt
```
*(Note: Installing `torch` and `sentence-transformers` may take 1-2 minutes depending on your internet connection as it includes the AI tensor libraries).*

**Step 3:** Start the AI Server:
```bash
python main.py
```

The ML server will start running on `http://127.0.0.1:8000`. 
Once it says `"Matrix ML Engine is Online"`, go click the **"Run Deep Analysis"** button in your Next.js `ML Insights` dashboard to trigger standard HTTP fetch calls directly to your local Python AI model!
