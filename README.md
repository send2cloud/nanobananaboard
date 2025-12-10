# Project Analysis (2025-12-10)

## 1. Executive Summary 💡

**Original Vision**  
The project was founded to democratize high-fidelity storyboarding by leveraging the speed of lightweight AI models ("Nano"). The goal was to build a visual, node-based workspace where creators could iterate on cinematic concepts instantly, moving away from linear prompting to a branching, spatial workflow.

**How to Explain It**

*   **ELI5:** Imagine a magic drawing board where you tell a robot story, and it draws the pictures for you. You can connect the pictures with lines to show what happens next. If you don't like a picture, you can use a magic wand to change it or ask the robot to draw it from a different angle!
*   **Elevator Pitch:** Nano Banana is a node-based generative AI platform specifically designed for visual storytelling and storyboarding. It combines the rapid inference of Google's Gemini models with an infinite canvas, allowing directors and creatives to generate, branch, and refine visual narratives in a non-linear workflow that matches how human creativity actually works.
*   **Explain to Mom:** You know how movie directors draw comic strips to plan out their movies? This app lets them do that on the computer, but they don't have to draw. They just type what they want to see, and the AI creates the image. They can organize these images on a big digital wall, zoom in to fix details, and create different versions of the same scene instantly.

## 2. Current State 🚧

**What it does right now:**  
The application is a fully functional Single Page Application (SPA) that serves as a visual interface for AI image generation. Users can create "Start Nodes" to define scenes, generate images using Google's GenAI or OpenRouter, and create variations (Camera, Style, Narrative) that branch off into new nodes. It supports a "Pinterest-style" grid for selecting variations and a full-screen lightbox for reviewing assets.

**Features Implemented:**
*   **Visual Graph Editor:** Complete node-based workflow using React Flow with custom nodes (Start, Image, Variation, Grid, Group).
*   **Multi-Provider AI:** Robust integration with Google GenAI SDK (Nano/Flash/Pro) and OpenRouter (Custom/OpenAI).
*   **Intelligent Tooling:** "Magic Wand" for prompt enhancement and context-aware variation suggestions (e.g., suggesting "Over the shoulder" if the prompt implies conversation).
*   **Asset Management:** Lightbox view, high-res downloads, and image-to-image editing.
*   **Persistence:** LocalStorage saving for API keys and global settings.

**Incomplete or Broken:**
*   **Project Persistence:** There is **no mechanism to save the actual storyboard graph**. If the user refreshes the browser, the storyboard is lost. Only settings are saved.
*   **Mobile Responsiveness:** The UI is heavily desktop-focused; the complex node interactions would struggle on touch devices.
*   **Security:** API keys are stored in `localStorage` and used client-side. This is acceptable for a personal tool but a security risk for a production deployment.

## 3. Act as a Technical Cofounder 🤝

**Critique & Recommendations:**

1.  **🚨 Critical Pitfall - Data Loss:** We are currently running purely in-memory. We need to implement a "Save Project" feature immediately. Even a simple export/import to JSON file would suffice for MVP, but we should aim for IndexedDB for auto-saving the graph state.
2.  **Architecture Concern:** We are leaking business logic into the frontend. The `geminiService.ts` contains all the prompt engineering and API routing.
    *   *Recommendation:* Move the API interaction to a lightweight Edge Function (e.g., Vercel Functions). This solves the CORS issues we've been patching and secures the API keys if we ever move to a subscription model.
3.  **Refactoring Needed:** The `StoryboardFlow.tsx` component is becoming a "God Object," handling layout, logic, API orchestration, and state. We should extract the node logic into custom hooks (e.g., `useNodeOperations`, `useGraphLayout`).
4.  **Creative Opportunity:** We have the data to generate a "Animatic." We could add a feature to traverse the graph linearly and play the storyboard as a slideshow with simple AI-generated camera movements (zoom/pan).

## 4. Technology Stack & Modernization Analysis 🛠️

**a) Key Technologies Overview (as of Dec 2025)**

| Technology | Current Version | Latest Stable (2025-12) | Status |
|:-----------|:----------------|:------------------------|:-------|
| **React** | ^18.2.0 | v19.0.0 | ⚠️ Minor updates (React 19 is stable now) |
| **Vite** | ^5.1.5 | v6.2.0 | ✅ Up to date (v5 is still LTS) |
| **React Flow** | ^11.10.4 | v12.0.0 (XYFlow) | ⚠️ Major update (Rebranded to XYFlow) |
| **Google GenAI** | ^0.1.0 | v1.2.0 | 🚨 Major updates needed (SDK evolves fast) |
| **Tailwind** | ^3.4.1 | v4.0.0 | ⚠️ Minor updates |

**b) Visual System Overview**

```mermaid
graph LR
  Client[React SPA (Vite)] -- "User Action" --> Graph[React Flow Canvas]
  Graph -- "Config" --> Service[Gemini Service layer]
  
  subgraph "External AI Providers"
    Service -- "SDK" --> Google[Google GenAI API]
    Service -- "REST" --> Router[OpenRouter API]
    Service -- "REST" --> OpenAI[OpenAI API]
  end
  
  Client -- "Persist Keys" --> Storage[(LocalStorage)]
  
  style Client fill:#f9f,stroke:#333,stroke-width:2px
  style Google fill:#bbf,stroke:#333,stroke-width:1px
  style Storage fill:#dfd,stroke:#333,stroke-width:1px
```

**c) Brief Migration Feasibility**
*   **Lock-in Level:** Low. The core logic is standard TypeScript/React.
*   **Migration Considerations:** The biggest dependency is `React Flow`. Migrating to the newer `XYFlow` (v12+) might require breaking changes in how handles and nodes are registered.
*   **Approach:** Upgrade React to v19 first for better concurrent rendering (useful for large graphs), then refactor the `geminiService` into a serverless function structure before upgrading the flow library.

---
**Previous README Versions:**
- [Original README before 2025-12-10 analysis](#)

---

# Nano Banana Storyboarder

A node-based generative AI storyboard editor using Gemini Nano Banana models to explore creative variations.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run Development Server:**
    ```bash
    npm run dev
    ```

3.  **Build for Production:**
    ```bash
    npm run build
    ```

## Features

*   **Node-based Workflow:** visual branching of ideas.
*   **Multi-Model Support:** Google Gemini, OpenAI, OpenRouter.
*   **Smart Variations:** Generate camera angles, narrative shifts, and style changes instantly.
*   **Local Storage:** Your API keys stay in your browser.
