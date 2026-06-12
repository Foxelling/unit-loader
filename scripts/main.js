"use strict";

let targetItem = Items.blastCompound; 
let itemDialog = null;
let lastDialogTime = 0;

const FetchAI = () => extend(AIController, {
    updateUnit() {
        if (this.unit.hasItem() && this.unit.item() === targetItem && this.unit.stack.amount >= this.unit.type.itemCapacity) {
            return;
        }

        if (this.unit.hasItem() && this.unit.item() !== targetItem) {
            this.unit.clearItem();
        }

        // --- НОВЫЙ АЛГОРИТМ ПОИСКА ---
        let targetBuilding = null;
        let minDist = Number.MAX_VALUE;
        
        // Получаем список всех хранилищ команды (ядра, контейнеры, хранилища)
        let storages = Vars.indexer.getFlagged(this.unit.team, BlockFlag.storage);
        
        if (storages != null) {
            storages.each(build => {
                // Если в хранилище есть нужный предмет
                if (build.items != null && build.items.has(targetItem)) {
                    // Вычисляем квадрат расстояния (dst2 работает быстрее обычного dst)
                    let dist = this.unit.dst2(build); 
                    if (dist < minDist) {
                        minDist = dist;
                        targetBuilding = build;
                    }
                }
            });
        }
        // -----------------------------

        if (targetBuilding != null) {
            if (!this.unit.within(targetBuilding, 20)) {
                this.moveTo(targetBuilding, 10);
                this.unit.lookAt(targetBuilding); 
            } else {
                if (!Vars.net.client() && targetBuilding.items.has(targetItem)) {
                    let amount = Math.min(10, this.unit.type.itemCapacity - this.unit.stack.amount);
                    amount = Math.min(amount, targetBuilding.items.get(targetItem));
                    
                    if(amount > 0){
                        this.unit.addItem(targetItem, amount);
                        targetBuilding.items.remove(targetItem, amount);
                    }
                }
            }
        }
    }
});

Events.on(EventType.ClientLoadEvent, cons(e => {
    
    // ФИКС ЛОКАЛИЗАЦИИ: Английский текст
    Core.bundle.getProperties().put("command.fetch", "Fetch Item");
    
    let modIcon = Core.atlas.find("unit-loader-fetch-icon");
    Icon.icons.put("custom-fetch", new Packages.arc.scene.style.TextureRegionDrawable(modIcon));

    // ФИКС МЕНЮ: Теперь мы ловим момент, когда игра выдает юнту этот ИИ
    let fetchCommand = new UnitCommand("fetch", "custom-fetch", u => {
        
        // Открываем меню ТОЛЬКО если игрок сейчас держит этого юнита выделенным рамкой.
        // Задержка Time.time нужна, чтобы меню открылось 1 раз, а не 10 раз для каждого из 10 выделенных юнитов.
        if (Vars.control.input.selectedUnits.contains(u) && Time.time - lastDialogTime > 30) {
            lastDialogTime = Time.time;
            itemDialog.show();
        }
        
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

    itemDialog = new BaseDialog("Select Item to Fetch");
    itemDialog.addCloseButton();
    
    itemDialog.cont.pane(t => {
        let i = 0;
        Vars.content.items().each(item => {
            t.button(new Packages.arc.scene.style.TextureRegionDrawable(item.uiIcon), () => {
                targetItem = item; 
                itemDialog.hide(); 
                Vars.ui.showInfoToast("Fetching: " + item.localizedName, 2);
            }).size(50).pad(4).tooltip(item.localizedName);
            
            if (++i % 8 === 0) t.row();
        });
    });
}));