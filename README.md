
## <p align="center">
  <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/techsphere-logo.png.png" width="220" alt="TenderTool Logo"/>
</p>

# TenderTool

South Africa's smartest way to find tenders.

TenderTool is a next-generation **AI-powered tender discovery platform** that centralizes public tender information and streamlines the bidding research process.
Built with **modern web technologies** and leveraging **AWS cloud services**, it aggregates tenders from multiple official sources and enhances them with **AI-driven insights** (summaries, Q&A chatbot, and text-to-speech), delivering all the information bidders need in one convenient place.

---

## 📖 Table of Contents

1. [🟢 Introduction](#introduction)
2. [🟠 Purpose](#purpose)
3. [🎯 Objectives](#objectives)
4. [💡 Design Considerations](#design-considerations)
5. [⚙️ System Architecture](#system-architecture)
6. [🔗 REST API Documentation](#rest-api-documentation)
7. [🧩 Features](#features)
8. [📱 Screens](#screens)
9. [🧰 Tech Stack](#tech-stack)
10. [⚡ Functional Requirements](#functional-requirements)
11. [🛡 Non-Functional Requirements](#non-functional-requirements)
12. [🔁 GitHub and CI/CD](#github-and-cicd)
13. [🎉 Live Demo](#live-demo)
14. [🧭 Repository Links](#repository-links)
15. [🧠 References](#references)
16. [🤖 AI Usage Disclosure](#ai-usage-disclosure)

---
## 🔗 Important Links

- **Live Site (CloudFront):** https://d3g08dlqiq9hr8.cloudfront.net/  
- **Frontend Repo:** https://github.com/Techsphere-Solutions-TenderTool/Frontend.git  
- **Backend Repo:** https://github.com/Techsphere-Solutions-TenderTool/TenderToolBackend.git  
- **SonarCloud (Frontend):** https://sonarcloud.io/project/overview?id=Techsphere-Solutions-TenderTool_Frontend  
- **SonarCloud (Backend):** https://sonarcloud.io/project/overview?id=Techsphere-Solutions-TenderTool_TenderToolBackend  
- **Jira Scrum Board:** https://techsphere-solutions-tendertool-wil.atlassian.net/jira/software/projects/TTWTS/boards/1?atlOrigin=eyJpIjoiZDcxYTkwZGFmMzRjNGZiMWEwNjdkNzdiZThmNDgzMzIiLCJwIjoiaiJ9  
- **Project Docs (Drive):** https://drive.google.com/drive/folders/1UBoJQgK6DedaJttx_TQjX6SMAxpagMBd


## 🟢 Introduction

In an era where public tender information is scattered across numerous bulletins and websites, **TenderTool** redefines procurement discovery with an AI-powered, centralized platform.

Developed with a modern JavaScript/TypeScript stack (**React frontend**) and a **serverless API backend on AWS**, it integrates cutting-edge AI services to provide real-time insights and assistance. This ensures:

* 🧭 One-stop access to all current public tenders (national & regional) in a unified interface
* 🤖 AI-enhanced understanding through instant summaries and Q&A about tender details
* 🔊 Improved accessibility via text-to-speech audio and a user-friendly responsive design

<p align="center">
  <img src="https://media.giphy.com/media/YnTLgXn0zFXjbqF152/giphy.gif" width="400" alt="Data processing animation"/>
</p>

---

## 🟠 Purpose

To create an intelligent, efficient platform that helps businesses and individuals **quickly find and evaluate public tender opportunities**.

TenderTool eliminates the tedious manual search through multiple government websites by centralizing tenders in one hub. Through AI-driven features (like summarization and chat assistance), it reduces the time needed to understand complex tender documents, making the tendering process more accessible and less overwhelming.

---

## 🎯 Objectives

* 🏗 Develop a scalable web application that aggregates tender data from various official sources (e.g., government portals, SOEs).
* 🔐 Integrate secure authentication using **AWS Cognito** for user login and protected features.
* 🤖 Implement AI features: an automated **text summarizer** and an intelligent **Q&A chatbot**.
* 🔊 Utilize **AWS Polly** for text-to-speech functionality.
* 📊 Enable advanced search & filtering with real-time data updates.
* ⚙️ Deploy using CI/CD with automated builds and tests.

---

## 💡 Design Considerations

### 🖋 User Experience (UX)

* 🔍 **Streamlined Search**: Quick filtering by keyword, category, and location.
* 📋 **Centralized Dashboard**: Users see stats and latest tenders post-login.
* 📄 **Tender Detail Clarity**: Organized layout with expandable summaries.
* ⚡ **Instant Actions**: Buttons for "Summarize", "Ask Chatbot", and "Listen".
* 📱 **Responsive Design**: Works across mobile, tablet, and desktop.

### 🎨 Visual Design

* 🧼 **Professional Theme**: Clean interface with blue and grey tones.
* 🏷 **Iconography & Indicators**: Status badges and source tags.
* 🧭 **Minimalist Layout**: Focus on key info and collapsible sections.
* ♿ **Accessibility**: Screen reader support and dark mode toggle.

---

## ⚙️ System Architecture

TenderTool follows a cloud-native, multi-tier design:

| Layer          | Description                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Frontend**   | React SPA with TypeScript, hosted on AWS S3 + CloudFront                                         |
| **Backend**    | Node.js REST API (AWS Lambda / Express), aggregates tender data and calls AI services            |
| **Cloud & AI** | Amazon Cognito (auth), AWS Polly (voice), OpenAI GPT-4 (Q&A, summarization), DynamoDB/RDS (data) |

### 🔄 Data Flow

1. 🔄 Tender scraping from sources → stored in DB.
2. 🔐 Users authenticate via Cognito.
3. 🔍 Users search → `/tenders` endpoint.
4. 📄 View details via `/tenders/{id}`.
5. ✨ Click "Summarize" → `/summarise` → GPT-4 → summary response.
6. 🤖 Ask a question → `/chatbot` → contextual AI reply.
7. 🔊 "Listen" → `/polly` → Audio stream from AWS Polly.
8. 📈 Dashboard stats from `/stats` endpoint.

---

---

## 📱 Screens

| Page | Screenshots |
|------|-------------|
| Home | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/home%20screen1%20.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/home%20screen%202.png" width="250"/> |<br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/homescreen3.png" width="250"/> ||<br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h5.png" width="250"/> |
| Login | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l1.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l2.png" width="250"/> |
| User Preferances | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l5.png"/>|
| Tenders | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h8.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h9.png" width="250"/> |<br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h10.png" width="250"/> |
| Tender Details | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l3.png"/> <br> <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l3.png"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l4.png" width="250"/> | <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/l6.png" width="250"/> |
| Stats | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h11.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h12.png" width="250"/> |
| Chatbot | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h7.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h8.png" width="250"/> |
| AboutUs | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h13.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h14.png" width="250"/> |<img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h15.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h16.png" width="250"/> |
| Contact Us  | <img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h17.png" width="250"/> <br><img src="https://github.com/Techsphere-Solutions-TenderTool/Frontend/blob/main/TT-IMAGES/h18.png" width="250"/> |
---
---

## 🧰 Tech Stack

| Layer      | Tech                                   |
| ---------- | -------------------------------------- |
| Frontend   | React.js, Tailwind CSS, AWS Amplify    |
| Backend    | Node.js, Express, AWS Lambda, DynamoDB |
| AI & Voice | OpenAI GPT-4, AWS Polly                |
| Auth       | AWS Cognito (JWT-based)                |
| Hosting    | S3 + CloudFront, API Gateway           |
| CI/CD      | GitHub Actions, AWS Amplify            |

---

## 🔗 REST API Overview

All API calls require JWT (Cognito) where applicable.

| Endpoint                  | Method   | Description                           |
| ------------------------- | -------- | ------------------------------------- |
| `/tenders`                | GET      | Paginated tender listing with filters |
| `/tenders/{id}`           | GET      | Retrieve tender details               |
| `/tenders/{id}/documents` | GET      | List associated documents             |
| `/tenders/{id}/contacts`  | GET      | Contact information                   |
| `/stats`                  | GET      | Aggregate statistics                  |
| `/summarise`              | POST     | AI-generated summary of a tender      |
| `/chatbot`                | POST     | Ask questions about a tender          |
| `/polly`                  | GET/POST | Text-to-speech generation             |

> ⚠️ Users must create their own `.env` file with API keys and URLs.

---

## ⚡ Functional Requirements

* Aggregation of multiple public sources
* Filtering by keywords, category, region
* Tender detail view with full content
* AI summarization and chatbot Q&A
* Document download and contact info

---

## 🛡 Non-Functional Requirements

* HTTPS secured communication
* Cognito-protected endpoints
* Performance optimized for large datasets
* Serverless architecture (auto-scaling)
* Accessible UI and assistive tech support

---

## 🔁 CI/CD and Repositories

| Repo                                                                                | Purpose                             |
| ----------------------------------------------------------------------------------- | ----------------------------------- |
| [Frontend](https://github.com/Techsphere-Solutions-TenderTool/Frontend.git)         | React frontend + Amplify deployment |
| [Backend](https://github.com/Techsphere-Solutions-TenderTool/TenderToolBackend.git) | API endpoints via AWS Lambda        |

Uses **GitHub Actions** for deployment pipelines and testing.

---

## 🎉 Live Demo

🖥️ Visit TenderTool Live: [https://d3g08dlqiq9hr8.cloudfront.net/](https://d3g08dlqiq9hr8.cloudfront.net/)

---

## 🔗 Important Links

* **Frontend Repo:** [GitHub](https://github.com/Techsphere-Solutions-TenderTool/Frontend.git)
* **Backend Repo:** [GitHub](https://github.com/Techsphere-Solutions-TenderTool/TenderToolBackend.git)
* **SonarCloud (Frontend):** [View Report](https://sonarcloud.io/project/overview?id=Techsphere-Solutions-TenderTool_Frontend)
* **SonarCloud (Backend):** [View Report](https://sonarcloud.io/project/overview?id=Techsphere-Solutions-TenderTool_TenderToolBackend)
* **Jira Board:** [Scrum Board](https://techsphere-solutions-tendertool-wil.atlassian.net/jira/software/projects/TTWTS/boards/1)
* **Docs:** [Google Drive](https://drive.google.com/drive/folders/1UBoJQgK6DedaJttx_TQjX6SMAxpagMBd)

---

## 🧠 References

* AWS Cognito Docs (2025)
* AWS Polly Developer Guide (2025)
* OpenAI GPT-4 API Guide (2024)
* OWASP Secrets Management Cheat Sheet (2023)
* GitHub Actions + Amplify Integration (2025)

  
  
## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

You are free to use, modify, and distribute this software in both personal and commercial projects, provided that the original copyright and license notice are included.

© 2025 Techsphere Solutions — TenderTool. All rights reserved.

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPWFkZWE2ZTUydzF0NjUzd2NlbHU2aGFrODZyNmNzYmZqMmU5d3NoNmhsajFqeGd1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/970Sr8vpwEbXG/giphy.gif" width="380"/>
</p>



---




