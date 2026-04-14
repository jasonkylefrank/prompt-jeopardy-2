### Basic idea of the game

Build a game that uses a conversational large language model that allows contestants to ask a question to the model in order to try to determine what persona and action (parts of the P.A.C.E. approach) that was secretly selected for the model for that round.

P: persona  
A: action (tell the model what it should do).  
C: context  
E: example

_The rest of this document could serve as a prompt to an LLM to build the game or for user instructions._

---

### Basic Background

Build the following game which has some structural similarities to the popular TV game show “Jeopardy\!”. For example, just like how the TV game “Jeopardy\!” has 2 total rounds, my game will also have 2 rounds, where the second round will award (or deduct) more points than in the first round. However, my game also has many differences from the TV “Jeopardy” game, so be sure to read the rest of these instructions to understand the similarities and differences.

I’m calling my game “Prompt Jeopardy”.

This game will be a web application that will be played online by contestants and a host (more about the differences between the host and contestants in a bit). Contestants will see their own UI in their contestants view and the game will be shared online over a screen-sharing application (such as Microsoft Teams) for spectators and the contestants to see the host’s UI.

### Purpose of the game

This game offers a fun way to **help contestants learn how most large language models (LLMs) are curated** by app developers for better performance for specific requirements.

App developers often use a P.A.C.E. approach toward curating model behavior.

The “P” stands for persona. The “A” stands for action (what the model is being told to do). The “C” stands for context. The “E” stands for examples.

### The object of the game

The **object of this game** is for the contestants to **correctly choose the persona and action** that are being used behind the scenes to craft the LLM’s responses to their questions. Contestants are shown a set of possible personas and actions to choose from. Contestants are awarded points or deducted points based on the accuracy of their choices.

### Format of the game

The game consists of 2 “**rounds**”. Each round consists of 1 or more “**phases**”.

A “**phase**” consists of:

1. A contestant asking the LLM a question.

2. The LLM, who is acting according to the persona and action used for that round, provides an answer.

3. A timed “answer period” in which contestants can select the persona and the action that they think were used to craft the model’s responses for that round.

Each **“round” ends** when a contestant correctly chooses the persona and the action that was used for the prompt to the model.

There are **2 rounds to the game**. The points awarded or deducted are **doubled in the second round** (this is the “point consequences” which I’ll describe more about in a bit).

### Two types of users and user interfaces for this game

There are **2 to 4 contestants** in each game, who have a “contestant” user interface (UI).

Separately, there is also an **administrator** (admin) for the game who acts as a “host” for each game (like in a TV game show). This host has their own user interface to be able to:

1. Access previous games (each stop of previous games need to be saved in a database so that the admin can “replay” the game later).

2. Start and control active games by controlling:

   1. The **persona** and **action** to be used for each round. The admin’s UI should also offer the option to have the personas and the actions to be **randomly chosen** from the pool of all possible personas and actions. (I’ll provide those pools later in this prompt).

   2. The **flow** of the game such as when the game starts, when to advance to the next phase, and when to advance to the second round.

### Setting up a new game instance

The admin’s UI allows the administrator to set up a new game instance as the first step of playing a game.

So the admin’s dashboard should contain a button to **“Set up a new game”**.

After the admin clicks that button, the **app needs to generate a unique URL** for that game instance that contestants will use to access and join the game. The app also needs to show that URL in the admin’s UI so that the admin can copy it and send it to contestants.

**When a contestant accesses that URL in order to join the game**, their first step should be to login to this app with their Google credentials (implement Google Authentication using the latest Firebase Studio agentic provisioning so that authorized domains are set correctly for testing). Once the contestant has logged in, the app needs to use the avatar and name from the contestant’s Google credentials to be used during that game for the contestant game UI and the admin’s game UI. (I’ll explain in a minute how we’ll display that information.)

Once each contestant has logged in with their Google credentials, display a card for that contestant, as described below.

Another aspect that **the admin needs to perform before each round starts** is to select the **persona pool, the persona** to use for the round (the “secret persona”), the **action pool**, and the **action** to be used for that round (the “secret action”).

The “persona pool” for a round is the subset of all possible personas (which I’ll provide in a bit) and the “selected persona" (or the “secret persona”) is the persona that the LLM should portray in that round. Similarly, the “action pool” is a subset of all possible actions (which I’ll also provide in a bit) and the “selected action” (or “secret action”) is the action that the LLM should use during that round.

When the admin is satisfied with the number of contestants that have joined the game, and he has selected the persona and action to be used for the first round, he can click **“Start the game”** to complete the set up aspect of the game and move into playing mode.

### Information displayed throughout the game

After the admin has finished setting up the game and clicks “Start the game”, the game starts with **information** that is shown to the contestants and to the administrator and remain visible throughout the game:

1.  The **“round”** that the game is in.
2.  The **possible choices for the persona** and **possible choices for the action** for that round.
3.  The “**phase**” the game is in.
4.  A **card for each contestant**, showing their avatar, name and point total.
5.  The “**point consequences**” for that phase (I’ll explain more about the point consequences in a bit).

### Phase 1

The **first contestant gets to ask a single question** to the model in order to try to ascertain who the persona is and their action. They can input their question either by **typing in an input field** or by clicking a **microphone icon** next to the input field and speaking their question.

The **model responds** with a relatively short, but informative answer of up to 50 words. An AI-generated voice reads the answer out loud to the contestants as the words are made visible on the screen.

After the model’s answer has been read to the contestants, then a 15 second **"answer period”** timer starts.

The timer is shown on the screen and all users can see it **counting down to 0 seconds**.

During that time period, each contestant gets the **opportunity to select the correct persona and action**. They do this by selecting the choices that are visible on their screen and clicking a “submit” button. However, each contestant can only see their own selections (they cannot see what the other contestants are selecting).

Also during the answer period, the **admin UI** shows an indicator that indicates when each contestant has submitted their choices (but it does not reveal what those choices were).

**After the countdown timer expires**, **each contestant’s point total is updated**. Additionally, each contestant’s card shows a small “banner” at the bottom of the card that shows information about their result of that phase. This information should include either “Answered correctly\!”, “Answered incorrectly”, or “Abstained”, and the points that were awarded or deducted (which might include neither, according to the rules of the game). Show the points awarded in the format of “+3”, “-3”, “(no point change)”, but be sure to use the correct number, according to the rules of the game.

#### Crowning winner(s) of Round 1

**If any of the contestants answered correctly**, their card should show “confetti” flying around in their card for a few seconds and the background of their card should turn green (make sure that the foreground text turns white so that the text is still legible). The top of their card should display a “CORRECT” banner.

If only one contestant answers correctly, they are the winner of the round.

If multiple contestants answer correctly, the winner of the round is the one with the higher point total. If the point total is a tie, each contestant who answered correctly is considered the winner but “tied”.

If one or more contestants answered correctly, the **administrator’s UI** now shows a button to “Start round 2”. If no contestant answered correctly at this point, the admin’s UI shows a button to “Start next phase”. That button would show a background “progress bar timer effect” that takes 10 seconds to complete the “progress bar” aspect, at which point it would automatically click the “Start next phase” button.

### Phase 2 (if needed)

If no contestant answered correctly in the previous phase, the game continues much like the previous phase, except that this time the **second contestant** asks the LLM a question.

### Phase 3 (if needed)

If no contestant answered correctly in the previous phase, the game continues much like the previous phase, except that this time the **third contestant** asks the LLM a question.

### Phase 4 and beyond (if needed)

If no contestant answered correctly in the previous phase, the game continues much like the previous phase, except that this time the **we rotate to the next contestant** in the sequence for who gets to ask the LLM a question.

### Point consequences

The main idea of the point consequences is that it encourages risk taking, or at least offers the opportunity to play the game with a certain strategy as it pertains to when to try to answer.

It does this by giving **higher point rewards for answering correctly in earlier phases** and issuing **lower point deductions for incorrect answers in those earlier phases**. But then as a round goes further, the contestants are awarded fewer points for answering correctly and punished more for answering incorrectly.

#### Point consequences for **abstaining**

During each “phase” (each “answer period”), a user can choose to abstain (which is the same as not answering at all). A user is not awarded points nor are they deducted points unless they have **abstained for 3 or more phases** in a round. Starting with their third abstain in a round, that player **loses 4 points per phase** (but remember that all point values are doubled in the second round).

#### Point consequences for answering **correctly** or **incorrectly**

Here are the points awarded or deducted in the first round. Remember that the points are doubled in the second round.

Phase 1:

If they choose **correctly**, they get 3 points  
If they choose **incorrectly**, they lose 1 point.

Phase 2:

If they choose **correctly**, they get 2 points  
If they choose **incorrectly**, they lose 2 points.

Phase 3 or beyond (Phase 4, 5, etc.):

If they choose **correctly**, they get 1 points  
If they choose **incorrectly**, they lose 3 points.

**Handling a winner’s negative point total (edge case):** According to the point consequences described above, there can be a situation where a contestant could reach a later phase and lose points during that round even though they finally answered correctly. Instead of allowing that situation to occur, we alter the normal point consequence rules to make the winner receive 1 point for the round in round 1 and 2 points for the round in round 2\.

### Transitioning to Round 2

After Round 1 ends, the admin needs to select new values for the next round, akin to what he did for the first round:

1. the persona pool
2. the action pool
3. the selected persona
4. the selected action

Once the admin has selected those things, his UI should present a **button to “Start next round”**.

During the second round, each contestant’s card still shows the total points from the first round so everyone can see how many points they’ll need to win the game in this next round.

### Crowning a winner after Round 2 ends

When one or more contestants correctly answers in round 2, the UI for the contestants and the admin should first execute the same kind of Round crowning that was done after Round 1 (showing who won Round 2). Then the UI should display a “final winner(s)” UI that displays the overall winner(s) according to contestants’ total points across both Rounds of the game.

### Personas pool

In this section I’m specifying the pool of all possible personas that could be used for a round.  
The personas could vary by round.

6 of these personas would be chosen for each round by the administrator. Those selected personas become the pool of personas that the contestants choose from during a round.

1. Sports & entertainment:

   1. Michael Jordan
   2. Mike Tyson
   3. Hulk Hogan
   4. The Rock
   5. Taylor Swift

2. Historical:

   1. Leonardo da Vinci
   2. Abraham Lincoln
   3. Jane Goodall
   4. Helen Keller
   5. Amelia Earhart

3. Political:
   1. Bill Clinton
   2. George Bush

### Actions pool

This section contains the pool of all possible actions that could be used for a round.

5 of these actions will be chosen for each round by the administrator. Those actions become the pool of actions that the contestants choose from during a round.

1. Trying to **espouse a political party** that they are not very comfortable with.

2. Trying to **quote Michael Jackson songs** during natural conversation.

3. Trying to **appear a lot less competitive** than they really are.

4. Trying to appear a lot **less intelligent** than they really are.

5. Trying to appear a **lot less eloquent** than they really are.

### How the LLM should portray the selected persona and action:

As the LLM used in the game, please portray the administrator’s **selected persona** by answering the contestant’s questions from the persona’s point of view and personality, which might include their historical time period, things they’ve said, and their capabilities. Since this is a guessing game, do not reveal your portrayed persona directly. We want your answer to be useful for the contestant but not so obvious that it would remove the challenge for the contestant. In particular, try to formulate your answer such that it could indicate at least 2 of the personas from the persona pool for that round. This should help prevent contestants from being able to quickly narrow down the possible persona to just one persona easily.

Additionally, the LLM’s answers should incorporate the **selected action** while still answering the contestant’s question. As with the persona aspect, do not reveal your portrayed action directly. We want your answer to be useful for the contestant but not so obvious that it would remove the challenge for the contestant. As with the persona aspect, try to formulate your answer such that it could indicate at least 2 of the actions from the actions pool for that round.

### Game flow: a short summary

- **Setup Phase (Admin Only):**

  - The Host starts a new game, and the system generates a unique Game ID.

  - For the upcoming round, the Host secretly selects one **persona** and one **action** that the LLM will use.

  - The Host also selects a "persona pool" and an "action pool" – these are the lists of choices that will be displayed to the contestants. The correct **persona** and **action** must be included in these pools.

  - The Host starts the round.

- **Gameplay Loop (A Round):** A round consists of one or more "phases."

  - **Phase Start:**

    1. The system determines which contestant's turn it is to ask a question.

    2. That contestant is presented with a text box to ask a question to the LLM.

  - **LLM Response:**

    1. The contestant submits their question.

    2. The question is sent to the LLM, which has been pre-configured by the Host with the secret **persona** and **action** for the round.

    3. The LLM's response is displayed to _everyone_ (Host, all contestants, spectators).

  - **Answer Period (for ALL contestants):**

    1. After the LLM responds, _all_ contestants are simultaneously shown the "persona pool" and "action pool" as options to choose from.

    2. Each contestant has three choices:

       - Select one **persona** and one **action** and submit their guess.

       - Choose to **abstain** from answering in this phase.

       - Do nothing (which counts as abstaining).

  - **Scoring and Round Progression:**

    1. The system automatically checks the submissions.

    2. **If one or more contestants correctly guess BOTH the persona and action:**

       - Those contestants are awarded points.

       - The round immediately **ends**.

    3. **If NO contestants guess correctly:**

       - Any contestant who submitted an _incorrect_ guess has points deducted.

       - Any contestant who has **abstained** for 3 or more times in the round has points deducted.

       - The game moves to the **next phase**, and it becomes the next contestant's turn to ask a question.

This cycle of phases continues until someone correctly identifies the **persona** and **action**, ending the round. The game can then proceed to a second round with potentially higher point values.

---

### Similarities and differences between “Prompt Jeopardy” and the TV “Jeopardy” game

NOTE: **The information presented already** **should be enough for an LLM or a human to fully understand how the game works**. However, I found that the Gemini LLM in Firebase Studio formed its understanding of the game too much from the TV “Jeopardy” game. As such, I had to provide the following clarifications in order for it to understand how “Prompt Jeopardy” should work.

#### Similarities

1. Both games have 2 main rounds. The points awarded or deducted are more in the second round.

2. Both games have a host and a small number of contestants.

3. Both games have spectators, but the TV Jeopardy game is broadcast on TV. The spectators in my game will view the live game by joining a screen-sharing meeting over Microsoft Teams, with the host sharing his screen (the contestants will also be able to view the host's screen in that same manner).

4. The host controls the game's flow in both games.

#### Differences (this is not an exhaustive list)

##### My game has no "board of dollar values", it has "phases"

The TV Jeopardy has a game board with categories with varying dollar-amount rewards that correspond to "answers" that are clues for contestants to use to provide the corresponding "question".

My game is completely different than that.

As I said in my "Object of the game" section, "The object of this game is for the contestants to correctly choose the persona and action that are being used behind the scenes to craft the LLM’s responses to their questions."

I later went on to describe that process in more detail, saying that contestants get to ask a question to the LLM and the LLM responds to that question using the persona and action that it was told to use for its responses for that entire round.

Contestants ask questions to the LLM as a means to try to ascertain the identity ("persona") and agenda ("action") that the LLM currently has so that they can select those 2 aspects, and, in doing so, win the round.

The round starts with one contestant getting to ask the LLM their question. Once the LLM has responded, each contestant gets to select the persona and action that they believe the LLM has for that round.

If none of the contestants correctly select the persona and action that the LLM are using at that point, the next contestant gets to ask the LLM a question. Then once the LLM responds to that question, each contestant, once again, gets the opportunity to select the persona and action that they believe the LLM is using for that round. This process continues until a contestant correctly selects the LLM's persona and action, at which point the round ends.

Along the way, points are awarded or deducted as contestants correctly select the LLM's persona and action, or abstain from selecting it (see my original prompt's section about "Point consequences for abstaining").

Honing-in more on the structure of each contestant getting to ask the LLM a question, and then each contestant getting to select the persona and action that they believe the LLM is using, I described what I called a "phase". A "phase" consisted of a contestant getting to ask a single question to the LLM, the LLM responding, and an "answer period" where all contestants get the chance to select the persona and action that they think the LLM is using for that round.

So a round can consist of as many "phases" as needed. Eventually, one of the contestants will properly select the persona and action during one of those phases, ending the round.

##### Setup phase differences

The TV Jeopardy has categories of answers. My game does not have that at all.

The host does NOT "populate a board with categories, and for each dollar value, they provide an Answer" (as you said).

Instead I described in my original prompt how the host will select the persona and the action that the LLM should use for that round.

Additionally, I described how the host will select the "persona pool" and "action pool" that is a narrowed-down subset of personas and actions that contestants will see on their screen as the possible choices that they should select from when selecting the persona and action that they believe the LLM is using for that round.

##### "Judging" aspect

In my game, there should not need to be any human-judgement needed to "judge" a contestant's actions. That's because the contestant will select a persona and action from the "persona pool" and the "action pool" that they will have on their screen. So it is simply a matter of the web application determining which contestant selected the correct persona and action (so things like spelling are not a factor here).
