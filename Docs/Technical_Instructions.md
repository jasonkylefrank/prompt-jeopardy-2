### About this document

This document is meant to provide technical instructions to a code-generating LLM for the “Prompt Jeopardy” game.  See other documents which describe the actual game play experience, etc.

### **Use Next.js as the main application framework**

Next.js should be used for both server-side route handling and frontend code (including frontend routing).  As such, Express.js should not be needed.

#### *** Structure the application as a "single-page app" which can be deployed as a "static website" ***

Although the application will have dynamic URL aspects (such as a generated game ID), structure the code such that the entire application can be deployed to simple static site hosting platforms.  This should allow the game to be run without needing to host it on a server that runs a node.js backend.

This directive should be feasible by using "generic slug" techniques with Next.js's routing and client-side URL parameter hook capabilities.

### **Use Tailwind.css as the main styling framework**

Use the Tailwind.css styling framework unless there are specific elements where another approach makes more sense.

### **First-pass user-identity approach**: Use a name and generated avatar instead of Google Authentication

In my original game instructions prompt that I fed into Gemini (inside of Firebase Studio), I told the LLM to use Google Authentication as the way to handle contestant identity (using that to get their name and avatar).

But as of early 2026, I found that Gemini, inside of Firebase Studio, was unable to successfully implement the Google Authentication login flow after I had enabled Google Authentication in the backend of the Firebase project (including setting up “Authorized domains”).

So for the first-pass implementation, we’ll use a more-basic user-identity approach.

Recall that my original prompt included this section that said:

"When a contestant accesses that URL in order to join the game, their first step should be to login to this app with their Google credentials.  Once they have done that, the app needs to use the avatar and name from the contestant’s Google credentials to be used during that game for the contestant game UI and the admin’s game UI."

Now let's amend that portion of my instructions as follows:

When a contestant accesses the game URL in order to join the game, their first step should be to **enter their name**.  The app should ensure that the name they enter is unique amongst the contestant names.  **Assign each contestant an avatar image** of a cute animal (make sure each contestant is given a unique cute animal image).  This avatar, along with the contestant's name should be used in the contestant UI and the admin's UI.