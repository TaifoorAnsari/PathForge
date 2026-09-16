# PathForge 🚀
> An adaptive, goal-driven learning platform that turns "I want to learn X" into a clear, day-by-day roadmap with quizzes, gamification, study schedules, and printable study guides.

PathForge is built for self-learners who know what they want to study but get overwhelmed by scattered tutorials, unclear progression, and zero accountability. Whether it's Full-Stack MERN development, System Design, DSA in C++, or Organic Chemistry, PathForge constructs a structured learning path with curated resources, quizzes to test understanding, and a study planner that fits your schedule.

---

## 🎯 What Problem Does It Solve?

Most people drop out of self-learning for three reasons:
1. **Tutorial paralysis:** Jumping between YouTube playlists, documentation, and blog posts without knowing what order makes sense.
2. **No feedback loop:** Watching hours of video tutorials without testing if concepts actually stuck.
3. **Loss of momentum:** No system to track daily consistency or celebrate small wins along the way.

PathForge solves this by generating milestone-based roadmaps with clear checkpoints, active quiz gates before moving forward, and game mechanics (streaks, XP, ranks) to keep you coming back every day.

---

## ✨ Key Features & How They Work

### 1. Smart Roadmap Engine (Cluster-First + AI Generation)
- **Instant Matches for Popular Tech Tracks:** When you pick or search common subjects (like MERN stack, React, Docker, Python for ML, DSA), the platform instantly matches against curated, vetted templates with zero wait time and zero API cost.
- **On-Demand AI Fallback for Anything Else:** Want to learn something specific like Neuroscience, Film Scoring, or Cloud Security? The app uses Google Gemini to build a custom curriculum on the fly, breaking it down into logical sequential stages.
- **Academic Subject Validation:** A built-in topic validation guard ensures the engine only accepts real educational and career skills, filtering out conversational spam or nonsensical inputs.

### 2. Deep Milestones, Subtopics & Curated Resources
- Each roadmap is split into **Milestones** (e.g., *Backend Foundations*, *Database Architecture*, *Production Deployment*).
- Inside every milestone, you get:
  - **Granular Subtopics:** Each subtopic has bite-sized descriptions and key concept takeaways.
  - **Categorized Resources:** Direct links tagged by format—Video tutorials (🎥), official documentation (📚), articles (📄), and interactive sandboxes (🔧).
  - **Topic Completion Checkboxes:** Check off subtopics one by one as you study to watch your progress bar tick up.
  - **Personal Study Notes:** Take and save notes directly inside any milestone drawer so your thoughts stay attached to that specific topic.

### 3. Interactive Quiz Gates & Progression Lock
- Milestones aren't just a reading list; they have an active progress lock.
- Milestone 1 begins unlocked. Once you finish studying, you take a **Comprehension Quiz** (testing fundamental concepts, real-world patterns, and edge cases).
- Passing the quiz:
  - Automatically marks the milestone complete.
  - Unlocks the next milestone in sequence.
  - Awards XP directly to your profile.
  - Feeds into achievement badges.

### 4. Smart Study Timetable & Daily Focus
- Tell PathForge how many hours per week you want to study and which days you are free.
- The platform calculates an automated weekly schedule, distributing your current milestone sessions across your active days.
- **Today's Focus Widget:** Whenever you log in, your dashboard tells you exactly which milestone to focus on today, how long to study, and what topics to hit next—no thinking required.

### 5. PDF Roadmap Generator (Offline Study Guide)
- Hit **"Download PDF"** right on your roadmap to export a clean, colorful, multi-page study guide.
- Includes a branded cover page with your stats, an overall progress table, and dedicated pages for every milestone detailing all topics, key concepts, and clickable resource links.
- Rendered 100% on the client side using lazy loading—doesn't bog down initial page loads and works instantly.

### 6. Gamification System (Streaks, XP, Badges, Ranks)
- **XP & Levels:** Earn XP every time you complete study sessions, pass quizzes, or maintain streaks. Progress through ranks from *Novice Explorer* up to *Grandmaster*.
- **Daily Discipline Streak:** Logs your study activity each calendar day. Maintain daily momentum and earn streak freeze protections.
- **Achievement Badges:** Unlock badges for milestones like *First Steps*, *7-Day Consistency*, *Flawless Quiz*, and more.
- **Global Leaderboard:** Compare your XP, completed milestones, and streaks against fellow learners on the platform.

### 7. Multi-Roadmap Switcher
- Learners rarely study only one thing. You can enroll in 2 to 3 concurrent learning paths (e.g., *MERN Stack* + *DSA in C++*).
- Switch between them seamlessly with one click on your dashboard without losing your progress, notes, or quiz history.

### 8. Clean Responsive UI & Theme Persistence
- Fully responsive design tailored for mobile phones, tablets, and desktop displays.
- Defaults to a clean **Light theme** for first-time visitors, with a quick toggle to **Dark mode**. Your preference is remembered across visits.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS (with custom design system tokens & dark mode)
- **State Management:** Zustand (for clean, decoupled stores: Auth, Roadmap, Gamification, Schedule)
- **Routing:** React Router v6 (with Protected and Public route guards)
- **HTTP Client:** Axios (configured with token refresh interceptors and credentials)
- **Icons:** Lucide React
- **PDF Generation:** `@react-pdf/renderer` (code-split & lazy-loaded on demand)

### Backend
- **Runtime & Framework:** Node.js & Express.js
- **Database:** MongoDB Atlas via Mongoose
- **Caching & Queues:** Redis & BullMQ (for asynchronous AI roadmap generation jobs)
- **Authentication:** Dual-token JWT system (short-lived access token + rotating `httpOnly` secure refresh cookie)
- **AI Integration:** Google Gemini Generative AI SDK (`gemini-3.6-flash`)
- **Security:** Helmet, HPP, Express Mongo Sanitize, strict CORS origin matching

---
URL : https://pathforge-app-wine.vercel.app/

👨‍💻 Author
Taifoor Ansari
GitHub: @TaifoorAnsari
