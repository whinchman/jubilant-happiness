# TODO-ER

A Tool to help people with ADHD (ME!) with chores.

## Features.
1. simple Kanban board with 4 lanes. backlog - ready - doing - done.
2. Database for Tasks.
3. Certain Tasks Repeat 1x a week.
4. each task requires a time estimate in minutes. 
5. Here's the big "innovation" - inputting a large task like "clean the kitchen" should breakdown the task into manageable steps - (each step should take no more than 10 minutes) using claude's api.
6. pomodoro mode - user can input an amount of time, and Claude will pick a set of related tasks (i.e. 30 minutes - clean kitchen - a. put dirty dishes in dishwasher 5 min b. start dishwasher 5 min. c. wipe down counter 5min, etc. etc.) that can be accomplished in that time.
7. get started mode - similar to pomodoro, except it finds the smallest easiest task and then finds the related tasks and organizes them by increasing difficulty (i.e. amount of time.)
8. for both pomodoro and get started mode - the screen should only show the active task on the screen.
9. User Login/Logout - doesn't need OAuth, plain user/password will be fine (unless OAuth is a simplier lift)
10. weekly repeating tasks reset on sunday. repeating tasks should also note the last time they were completed (so they can be prioritized if they weren't completed last week. I.E. i haven't vacuumed in a month, that should bubble up to the top)

## UI
- Mobile Forward Design, Material Design Focused.
### screens needed
- Home - 4 buttons - Get Started, Board, Settings
- Get Started Start - Allows user to adjust Work Interval, Break Interval, and shows Cancel/Start buttons. (see Get Started Flow under UI Flows)
- Board - Shows KanBan Board with lanes. Add Task Button at top, has navigation to return to landing
- Active Task View - Shows the Task information, the amount of time estimated, a stopwatch showing how long it's been running, and 2 buttons at the bottom - Abandon / Complete. 
- Run Screen - single screen that shows 1. Total Elapsed time 2. buttons for STOP/Continue.
- finish screen - shows 1. Total Elapsed Time 2. Total Tasks Completed. 3. total break time. 
- break screen. Shows a countdown till break is over and the Abandon/Continue buttons. 
- confirmation screen - used on all cancel/abandon - classic double confirmation, tapping OKAY ends the run, tapping Resume, returns to the run. 

## UI Flow
Consider each step of these to be a single screen.

### Get Started Flow
1. Get Started Screen. 
1.1.1 Tapping Cancel returns to home screen.
1.2.1 Ready Advances to Active Task Loop
2. === ACTIVE TASK LOOP ===
2.1.1 tapping abandon shows confirmation screen.
2.1.2. tapping OKAY ends run. Shows finish screen. 
2.2.1 tapping continue shows next task.
2.2.2 if elapsed time > work interval shows break screen

## Task Loop
Task -> Run Screen/Break Screen -> repeat until user is done.

## Task Selection
the tasks should be weighted by estimated time + task group + last completion. We should try to avoid tasks that are completely separate (i.e. Wash Dishes/Mow Lawn). 

## Adding Tasks
Simple Text box input that we run through Claude API (probably need to use OPUS 4.7) that breaks the input task into a smaller subtasks, we then display. (note - for MVP, we may be able to just hand this off to Ultraplan? Use a Skill idk?) user then reviews the breakdown and accepts, at which point the tasks are added to the backlog. 

## Board View.
manual mode, drag/drop tasks from one column to the next.

## Edit Task
Allows for Deleting a task (show confirmation) - adding notes, adjusting time estimate, saving edits.

## Technical Stack
0. Note, we can rely on existing technology for this - i.e. if something exists that we can leverage directly (like notion or trello for the board view that's a plus)
1. Mobile Forward
2. React/React Native?
3. Containerized would be best, can run on homelab, no hosting costs, single user accesible.
4. board view should have a larger desktop/TV View. (it would be fine to run this view as a separate site entirely off the same backend, idea being I can slap it up on my TV or a monitor somewhere like a dashboard)
5. Get Started Flow doesn't need desktop views. it should be easily accessible via phone. 

## strech goals 
1. Notifications (local, no need for push?)
2. Sounds!
3. Random Motivations and Affirmations on the Run/Finish Screen.