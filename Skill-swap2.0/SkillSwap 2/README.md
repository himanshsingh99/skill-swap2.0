# SkillSwap — Student Skill Exchange Platform

This is a multi-page frontend wired to Firebase Authentication and Cloud Firestore.

## File structure

```text
SkillSwap/
├── index.html
├── style.css
├── login.html
├── profile.html
├── requests.html
├── firestore.rules
└── js/
    ├── firebase-config.js
    ├── auth.js
    ├── auth-page.js
    ├── profile.js
    ├── students.js
    └── requests.js
```

`auth-page.js` is an extra page controller used by `login.html`.

## 1. Create and configure Firebase

1. Open https://console.firebase.google.com/ and create a project.
2. In Project settings → General → Your apps, create a Web app.
3. Copy the Firebase Web App config into `js/firebase-config.js`, replacing every `PASTE_...` placeholder.
4. In Build → Authentication → Sign-in method, enable **Email/Password** and **Google**.
5. For Google sign-in, configure the support email if asked. In Authentication → Settings → Authorized domains, ensure your local domain and deployed domain are listed.
6. In Build → Firestore Database, create a database.
7. Open Firestore → Rules, paste the contents of `firestore.rules`, and click **Publish**.

Do not put Firebase Admin SDK service-account credentials in browser code. Firebase web config is designed to be used in client apps; access control belongs in Authentication and Firestore Rules.

## 2. Run locally

Because this uses JavaScript modules, do not open `index.html` directly as a `file://` URL.

- Open the folder in VS Code.
- Install/use the **Live Server** extension.
- Right-click `index.html` → **Open with Live Server**.
- Or use another local static HTTP server.

## 3. Deploy

You can deploy the static files to Netlify or Firebase Hosting. If deploying to Netlify, add your Netlify domain to Firebase Authentication → Settings → Authorized domains.

## Features

- Email/password registration and login
- Google sign-in
- Logout
- Student profile with course, bio, skills to teach and skills to learn
- Search/filter student profiles
- Send exchange requests
- Accept/reject incoming requests
- Request updates appear live through Firestore listeners

## Notes

- This project does not implement chat/video calling or automatically schedule learning sessions. Students need to coordinate after accepting a request.
- Profiles are visible to authenticated users. Do not put private or sensitive information in the bio.
- The rules are a starter set for a mini project. Test them in the Firebase Emulator or with test accounts before public deployment, and consider adding stricter field validation/rate limits before real-world use.
- The student search uses `orderBy("name")`. If Firebase displays a message asking you to create an index, follow the console link to create it.
