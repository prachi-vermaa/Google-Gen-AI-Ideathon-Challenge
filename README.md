# Reflection Journal &bull; User-Authenticated Gemini & Firestore App

A production-grade, privacy-first reflection and journaling web application powered by **Firebase Authentication**, **Cloud Firestore**, and the **Gemini 3.6 Flash API** with an automated resilient fallback ladder.

---

## 🛡️ Architecture & Threat Model Overview

| Threat Zone | Identified Risk | Countermeasure & Security Implementation |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection in journal text or chat prompts; denial-of-service payload attacks. | Strict client-side and server-side schema validation; defensive null-safe destructuring; payload limits (`10mb`). |
| **Planning & Reasoning** | Indirect prompt injection via stored reflections attempting system instruction bypass. | Strong system prompt boundaries treating user reflection entries as unprivileged data, not instructions. |
| **Tool Execution** | API credential leakage and unauthorized model invocations. | Zero client-side API keys; server-side proxy `/api/gemini/reflect` backed by Google Cloud Secret Manager / env vars. |
| **Memory & State** | Cross-user data leakage and unauthorized reading or tampering of private reflections. | Strict Firestore owner-bound security rules (`request.auth.uid == userId`) isolating each user's `/users/{userId}` tree. |
| **Inter-System Communication** | Token theft and credential exposure over network transit. | Federated Google Sign-In via Firebase Auth; zero password storage; secure HTTPS token exchange. |

---

## 🚀 Step-by-Step Deployment & Configuration Guide

### 1. Prerequisites & GCP API Enablement

Ensure you have the Google Cloud SDK (`gcloud`) installed and authenticated:

```bash
# Login and set your active project
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# Enable the required APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

---

### 2. Secret Management Setup (Zero-Hardcoding Hygiene)

Securely store your Gemini API key in Google Cloud Secret Manager and grant the Cloud Run runtime service account access:

```bash
# 1. Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key as a secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_GCP_PROJECT_ID --format="value(projectNumber)")

# 4. Grant the default Compute Engine service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Cloud Firestore Provisioning & Security Rules

Configure Cloud Firestore in Native mode. Deploy the owner-bound security rules to ensure strict user data isolation:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

### 4. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run, mounting the secret from Secret Manager:

```bash
gcloud run deploy reflection-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

### 5. Required Campaign Labeling Verification

Apply the mandatory resource label to register the Cloud Run service for automated verification:

```bash
gcloud run services update reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Stability & Test Walkthrough Guide

To verify complete end-to-end functionality, click the **Test Walkthrough** button in the app header or follow these test procedures:

1. **TC-AUTH-01 (Federated Google Sign-In)**: Navigate to the landing page, click *Continue with Google*, and complete Google OAuth in the popup. User is directed to their isolated dashboard.
2. **TC-FS-01 (User-Isolated Persistence)**: Create a reflection entry. Confirm it saves under `/users/{userId}/interactions/{interactionId}`.
3. **TC-AI-01 (Multi-Turn Reflection)**: Submit a journal entry in *Reflect & Inquire* mode. Verify Gemini 3.6 Flash responds with an empathetic synthesis and inquiry prompts.
4. **TC-AI-02 (Structured Thematic Summary)**: Click *Summarize Insights* to synthesize ongoing reflections into Core Themes, Emotional Undercurrents, and Key Takeaways.
5. **TC-AI-03 (Creative Brainstorming)**: Click *Brainstorm Ideas* to produce 3-4 constructive reframings and actionable exercises.
6. **TC-FEAT-02 (LifeMirror Long-Term Patterns)**: Analyze past entries to discover recurring themes, explicit user quotes, and strictly distinguished AI interpretations.
7. **TC-FEAT-03 (Ask Your Past Self)**: Grounded Q&A against journal entries with strict temporal citations; explicitly refuses to speculate if insufficient data exists.
8. **TC-FEAT-04 (Decision Journal)**: Record decisions, options, reasons, expected outcomes, and confidence ratings; revisit outcomes retrospectively.
9. **TC-FEAT-05 (Personal Timeline)**: Chronological timeline grouped by month/year with decision badges and tag filtering.
10. **TC-FEAT-06 (Intelligent Semantic Search)**: Natural language search across reflections with relevance scores and match explanations.
11. **TC-FEAT-07 (Journal Summaries)**: Period-based synthesis for individual sessions, past week, past month, or custom date ranges.
12. **TC-SEC-01 (Model Resilience Fallback)**: Verified backend fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`).
13. **TC-UI-01 (Zero-Loss Input Retention)**: User writing buffer remains preserved if network interruptions occur, with instant *Retry* option.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript validation
npm run lint

# Build production bundle
npm run build
```
