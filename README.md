Go to https://mllee.github.io/abettersubway/ to play the hosted game

##Inspiration

One of my favorite experiences as an engineer is when complex technical ideas show up in real life. For example, in my previous work at Facebook we observed that election interference took the shape of bipartite graphs, and by using graph algorithms we could identify things like Russian propaganda campaigns. This was exciting to discover! A concept from deep computer science gave us an edge in our real battle against foreign actors, and it also inspired me to brush up on my graph theory.
 
I wanted to build an experience that gives someone that same feeling. Something that looks like a simple child’s game, but actually introduces the user into an interesting graph problem and leaves them curious about how to better tackle problems like it.

##Why it’s interesting

Everyone can relate to the challenge of getting around a city or wishing their bus came faster, so I thought building new trains for a city would be a great way to make graph problems feel real. There are many technical parallels here– the Steiner Tree Problem asks how to optimally connect nodes in a graph, Dijkstra's is running behind the scenes to find everyone’s best commute, and improving networks under resource constraints is a challenge for many engineers.

My twist on the classic Steiner Tree Problem is that in my game the nodes are already connected. Instead, I ask the user “What parts of this graph are the most important to improve?”

##Key Decisions and Tradeoffs

For this game to inspire its users to learn about graphs, I needed them to understand the problem quickly, understand the actions they could take, and want to improve their solutions. The most important decisions I made were around how to give the user the right affordances (“What can I do?”) and how I showed them the consequences (“What happened when I did it?”).

The biggest example of that was to give users only one input and one output. Users could only put down or pick up train tiles, and the commute times were either passing or failing. There are many inputs I could have created, from train station tiles to expensive track tiles for water features, but having only one input focuses the user’s attention on the core puzzle mechanics. Clear pass/fail feedback also gives a more tangible success than a vague goal like “lower commute times by 15%.”

Another key decision I made was to make the simulation continuous instead of click-to-run. My first instinct was to create a “Run Simulation” button to run the commutes, but it created too big of a gap between making a change and understanding if it worked. This nudged users towards finding any working solution instead of the best one. By providing live map updates, the player is always fine-tuning and the game pushes them towards the optimal solution.

In total, these decisions create an environment that nudges the user into curiosity and action. After all, the best way to teach an idea is to convince someone it’s worth learning. The user may not walk away knowing terms like the Steiner Tree Problem, but I hope they walk away with just enough spark to wonder “Huh. That was fun, I wonder what the best way to solve that is?” and go looking for more.

##Next Steps

With more time on the project, I’d love to build a level editor. Level design seems to have the biggest impact on how fun each puzzle is, and raises another interesting question: what makes some graphs harder to optimize than others? This would also surface the puzzle solver that’s currently behind the scenes. 

To find the best solution, I’m currently running a multi-start hill climb algorithm that greedily adds the next best tile, and then randomly mixes up tiles for various starts to discover the best solution. This is not provably optimal, but good enough to present a solution to the user. If we really needed to, we could represent the entire map as a linear equation and use that as an optimization function to then find a reliable best solution. That feels like overkill though; worst case I’m happy to leave a user thrilled that they found a better solution than I did.

##How I built it

I spent about 2.5 hours putting this together, not including additional time I later spent designing level 2 after my friends asked for it. I did this by writing up a product spec, using custom Claude skills to plan an engineering review to anticipate implementation kinks (ex. whether each tile’s travel time was calculated upon entry or exit), and scope out what lines I should draw between different coding instances. Then, after clearly scoping the work for each coding harness instance and defining the interactions and APIs between them, I ran 3 Claude Code instances in parallel in separate git worktrees, and minimized conflicts by having a frontend, backend, and coordinator instance that each touched different areas of the project. 

