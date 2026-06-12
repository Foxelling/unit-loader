# Unit Loader Mod

A utility automation mod that introduces a dedicated RTS unit command, allowing players to order flying units to fetch specific resources from any nearby storage block.

## Features

* **New "Fetch Item" Command:** Adds a custom action button to the unit command bar.
* **Interactive Item Selector:** Activating the command opens a pop-up dialog displaying all items available in the game for quick filtering.
* **Smart Storage Search:** Units don't just fly to the core; they dynamically scan all team storage blocks, including Cores, Containers, and Vaults, (maybe also modded storages) and pathfind to the closest one containing the requested resource.
* **Smart Inventory Management:** Units automatically clear any garbage or incorrect items from their inventory before collecting the target resource.
