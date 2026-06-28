"use strict";

const packetSelectItem = "unit-loader-select-item";
const selectedItemsByCommander = new ObjectMap();

let targetItem = Items.blastCompound;
let itemDialog = null;
let lastDialogTime = 0;
let fetchCommand = null;
let commandRegistered = false;
let packetHandlerRegistered = false;

const cons2 = method => new Cons2(){get: method};

function itemFor(unit) {
    if (unit.lastCommanded != null) {
        let selected = selectedItemsByCommander.get(unit.lastCommanded);
        if (selected != null) return selected;
    }

    return targetItem;
}

function setSelectedItem(player, item) {
    if (item == null) return;

    targetItem = item;

    if (player != null) {
        selectedItemsByCommander.put(player.coloredName(), item);
    }
}

function sendSelectedItem(item) {
    setSelectedItem(Vars.player, item);

    if (Vars.net.client()) {
        Call.serverPacketReliable(packetSelectItem, item.name);
    }
}

function registerPacketHandler() {
    if (packetHandlerRegistered || Vars.netServer == null) return;

    packetHandlerRegistered = true;
    Vars.netServer.addPacketHandler(packetSelectItem, cons2((player, itemName) => {
        let item = Vars.content.item(itemName);
        if (item != null) {
            setSelectedItem(player, item);
        }
    }));
}

function showItemDialogFor(unit) {
    if (Vars.headless || itemDialog == null || Vars.control == null || Vars.control.input == null) return;

    if (Vars.control.input.selectedUnits.contains(unit) && Time.time - lastDialogTime > 30) {
        lastDialogTime = Time.time;
        itemDialog.show();
    }
}

const FetchAI = () => extend(AIController, {
    updateUnit() {
        let wanted = itemFor(this.unit);

        if (this.unit.hasItem() && this.unit.item() === wanted && this.unit.stack.amount >= this.unit.type.itemCapacity) {
            return;
        }

        if (this.unit.hasItem() && this.unit.item() !== wanted) {
            this.unit.clearItem();
        }

        let targetBuilding = null;
        let minDist = Number.MAX_VALUE;
        
        let storages = Vars.indexer.getFlagged(this.unit.team, BlockFlag.storage);
        
        if (storages != null) {
            storages.each(build => {
                if (build.items != null && build.items.has(wanted)) {
                    let dist = this.unit.dst2(build); 
                    if (dist < minDist) {
                        minDist = dist;
                        targetBuilding = build;
                    }
                }
            });
        }

        if (targetBuilding != null) {
            if (!this.unit.within(targetBuilding, 20)) {
                this.moveTo(targetBuilding, 10);
                this.unit.lookAt(targetBuilding); 
            } else {
                if (!Vars.net.client() && targetBuilding.items.has(wanted)) {
                    let amount = Math.min(10, this.unit.type.itemCapacity - this.unit.stack.amount);
                    amount = Math.min(amount, targetBuilding.items.get(wanted));
                    
                    if(amount > 0){
                        this.unit.addItem(wanted, amount);
                        targetBuilding.items.remove(wanted, amount);
                    }
                }
            }
        }
    }
});

function registerFetchCommand() {
    if (commandRegistered) return;

    commandRegistered = true;
    Core.bundle.getProperties().put("command.fetch", "Fetch Item");

    fetchCommand = new UnitCommand("fetch", "custom-fetch", u => {
        showItemDialogFor(u);
        return FetchAI();
    });

    fetchCommand.drawTarget = true;
    fetchCommand.resetTarget = false;
    fetchCommand.switchToMove = true;

    Vars.content.units().each(type => {
        if (type.itemCapacity > 0 && type.flying) {
            type.commands.add(fetchCommand);
        }
    });
}

function buildItemDialog() {
    if (Vars.headless || itemDialog != null) return;

    itemDialog = new BaseDialog("Select Item to Fetch");
    itemDialog.addCloseButton();
    
    itemDialog.cont.pane(t => {
        let i = 0;
        Vars.content.items().each(item => {
            t.button(new Packages.arc.scene.style.TextureRegionDrawable(item.uiIcon), () => {
                sendSelectedItem(item);
                itemDialog.hide(); 
                Vars.ui.showInfoToast("Fetching: " + item.localizedName, 2);
            }).size(50).pad(4).tooltip(item.localizedName);
            
            if (++i % 8 === 0) t.row();
        });
    });
}

Events.on(EventType.ContentInitEvent, cons(e => {
    registerFetchCommand();
    registerPacketHandler();
}));

Events.on(EventType.ServerLoadEvent, cons(e => {
    registerFetchCommand();
    registerPacketHandler();
}));

Events.on(EventType.ClientLoadEvent, cons(e => {
    registerFetchCommand();

    let modIcon = Core.atlas.find("unit-loader-fetch-icon");
    Icon.icons.put("custom-fetch", new Packages.arc.scene.style.TextureRegionDrawable(modIcon));

    buildItemDialog();
}));
