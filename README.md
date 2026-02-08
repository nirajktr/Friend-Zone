## Inspiration
It’s 2:00 AM in downtown Athens. The bars are closing, the sidewalks are crowded, and chaos begins. You started the night as a squad of five, but now? One friend stopped mid walk to daydream, another got distracted by a girl, and suddenly, someone is lost. 

Research on campus safety consistently shows that individuals walking alone are significantly more vulnerable to danger than groups and that many people agree they feel safer when with their respective group. To solve this safety issue, we built a tool that creates a buddy system. We want to ensure that **no one is lost**

## What it does
**Friend-Zone** is a real-time, peer-to-peer safety tether that connects a group of phones together.

###Setup
One person hosts a "tether" on the app, and other people join using a QR code or a code. 

###Tethering
The app continuously calculates the distance between all members live and give the exact location to each and everyone in the tether, while simultaneously recalculating the center of the radius set by the host. Therefore, the radius is always centered around the group when they are together. The app also lets the host adjust the radius in real time in case of high stress areas etc. 

###Alert
 If any user drifts outside the tether distance, the entire group's phones trigger a "Red Alert" notification and vibrate violently to alert the other member in the tether. 

## How we built it
We prioritized speed and real-time updates to ensure the safety alerts were instant and everyone got to their respective places safe. 

###Stack
* **Frontend:** Built with **React Native (Expo)**, allowing us to deploy a native experience to both iOS and Android from a single codebase.
* **Backend (Firebase):** We utilized **Firebase Realtime Database** (over Firestore) to handle high-frequency GPS updates. We needed low latency so that when one person drifts, everyone is alerted instantly.
* **The Math:** To calculate the "Drift," we implemented the **Haversine Formula** to account for nonlinear distance between coordinates:

$$
d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\phi_2 - \phi_1}{2}\right) + \cos(\phi_1) \cos(\phi_2)\sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)
$$

* **Hardware:** We utilized `expo-haptics` and the **Camera Flash API** to bypass "Do Not Disturb" modes and create the alarm.

## Challenges we ran into
* **React Native:** Neither if us had worked on app development, so the hardest part was learning the frameworks and our tech stack. We utilized youtube videos and documentation, and we debugged A LOT.
* **GPS Inconsistency:** Indoors, GPS signals often bounce, creating crazy movements that triggered false alarms. We solved this by implementing a signal filter that ignores movements under 2 meters unless sustained for more than 5 seconds.
* **Latency Sync:** Initially, different phones received alerts at different times. By switching to a websocket-based architecture, we made sure the alarm hits everyone at the same time. 

## What we are proud of
We learned a lot during this hackathon. From experimenting different tech stacks to frameworks, we gained valuable experience which we wouldn't in classes. Whether we win or not, this was an amazing first time for us and definitely won't be our last. We are proud of this project and it is amazing to see the UGAHacks community come together and grow together.

## What's next for Friend-Zone
###Smart Watch Integration 
###Battery Prediction
###SOLO MODE

**Friend-Zone: Finally, a FriendZone you actually *want* to be in.**
