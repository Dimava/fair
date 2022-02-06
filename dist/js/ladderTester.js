"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let LadderTesterVue = class LadderTesterVue extends VueWithProps({
    ladder: FairLadder,
}) {
    get _t() {
        return `
			<TESTER-VUE>

				<div style="max-width: 300px;">
					Ticking every {{ tickInterval.toFixed(1) }}s
					<a-slider v-model:value="tickInterval"
							:dots="true" :min="0" :max="1" :step="0.1"
							style="max-width: 300px;"
							>
						<template #mark> tick interval </template>	
					</a-slider>
				</div>

				<a-input-number min="0" max="10" step="0.1" v-model:value="tickSpeed">
					<template #addonBefore>
						Tick amount
					</template>
				</a-input-number>
				<br>

				<a-switch v-model:checked="ticking">
					<template #checkedChildren> ticking </template>
					<template #unCheckedChildren> paused </template>
				</a-switch>
				<br> <br>

				<a-button type="primary">
					TEST
				</a-button>

			</TESTER-VUE>
		`;
    }
    tickInterval = 1;
    tickSpeed = 1;
    ticking = false;
    passedTime = 0;
    mounted() {
        setInterval(() => this.tick(), 100);
    }
    tick() {
        if (this.ticking) {
            this.passedTime += 100;
            if (this.passedTime > this.tickInterval * 999) {
                this.passedTime = 0;
                this.emitUpdate();
            }
        }
        else {
            this.passedTime = 0;
        }
    }
    emitUpdate() {
        ladder.handleLadderUpdates({
            events: [],
            secondsPassed: this.tickSpeed,
        });
    }
};
__decorate([
    VueTemplate
], LadderTesterVue.prototype, "_t", null);
LadderTesterVue = __decorate([
    GlobalComponent
], LadderTesterVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyVGVzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlclRlc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxZQUFZLENBQUM7SUFDMUMsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUVELElBQUksRUFBRTtRQUNMLE9BQU87Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0ErQk4sQ0FBQztJQUNILENBQUM7SUFFRCxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDZCxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBR2hCLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDZixPQUFPO1FBQ04sV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNqQixJQUFJLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQztZQUN2QixJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLEVBQUU7Z0JBQzlDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7YUFDbEI7U0FDRDthQUFNO1lBQ04sSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7U0FDcEI7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztZQUMxQixNQUFNLEVBQUUsRUFBRTtZQUNWLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUztTQUM3QixDQUFDLENBQUM7SUFDSixDQUFDO0NBRUQsQ0FBQTtBQWhFQTtJQURDLFdBQVc7eUNBa0NYO0FBckNJLGVBQWU7SUFEcEIsZUFBZTtHQUNWLGVBQWUsQ0FvRXBCIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG5AR2xvYmFsQ29tcG9uZW50XHJcbmNsYXNzIExhZGRlclRlc3RlclZ1ZSBleHRlbmRzIFZ1ZVdpdGhQcm9wcyh7XHJcblx0bGFkZGVyOiBGYWlyTGFkZGVyLFxyXG59KSB7XHJcblx0QFZ1ZVRlbXBsYXRlXHJcblx0Z2V0IF90KCkge1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PFRFU1RFUi1WVUU+XHJcblxyXG5cdFx0XHRcdDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiPlxyXG5cdFx0XHRcdFx0VGlja2luZyBldmVyeSB7eyB0aWNrSW50ZXJ2YWwudG9GaXhlZCgxKSB9fXNcclxuXHRcdFx0XHRcdDxhLXNsaWRlciB2LW1vZGVsOnZhbHVlPVwidGlja0ludGVydmFsXCJcclxuXHRcdFx0XHRcdFx0XHQ6ZG90cz1cInRydWVcIiA6bWluPVwiMFwiIDptYXg9XCIxXCIgOnN0ZXA9XCIwLjFcIlxyXG5cdFx0XHRcdFx0XHRcdHN0eWxlPVwibWF4LXdpZHRoOiAzMDBweDtcIlxyXG5cdFx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdFx0PHRlbXBsYXRlICNtYXJrPiB0aWNrIGludGVydmFsIDwvdGVtcGxhdGU+XHRcclxuXHRcdFx0XHRcdDwvYS1zbGlkZXI+XHJcblx0XHRcdFx0PC9kaXY+XHJcblxyXG5cdFx0XHRcdDxhLWlucHV0LW51bWJlciBtaW49XCIwXCIgbWF4PVwiMTBcIiBzdGVwPVwiMC4xXCIgdi1tb2RlbDp2YWx1ZT1cInRpY2tTcGVlZFwiPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNhZGRvbkJlZm9yZT5cclxuXHRcdFx0XHRcdFx0VGljayBhbW91bnRcclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLWlucHV0LW51bWJlcj5cclxuXHRcdFx0XHQ8YnI+XHJcblxyXG5cdFx0XHRcdDxhLXN3aXRjaCB2LW1vZGVsOmNoZWNrZWQ9XCJ0aWNraW5nXCI+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2NoZWNrZWRDaGlsZHJlbj4gdGlja2luZyA8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICN1bkNoZWNrZWRDaGlsZHJlbj4gcGF1c2VkIDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLXN3aXRjaD5cclxuXHRcdFx0XHQ8YnI+IDxicj5cclxuXHJcblx0XHRcdFx0PGEtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCI+XHJcblx0XHRcdFx0XHRURVNUXHJcblx0XHRcdFx0PC9hLWJ1dHRvbj5cclxuXHJcblx0XHRcdDwvVEVTVEVSLVZVRT5cclxuXHRcdGA7XHJcblx0fVxyXG5cclxuXHR0aWNrSW50ZXJ2YWwgPSAxO1xyXG5cdHRpY2tTcGVlZCA9IDE7XHJcblx0dGlja2luZyA9IGZhbHNlO1xyXG5cclxuXHJcblx0cGFzc2VkVGltZSA9IDA7XHJcblx0bW91bnRlZCgpIHtcclxuXHRcdHNldEludGVydmFsKCgpID0+IHRoaXMudGljaygpLCAxMDApO1xyXG5cdH1cclxuXHJcblx0dGljaygpIHtcclxuXHRcdGlmICh0aGlzLnRpY2tpbmcpIHtcclxuXHRcdFx0dGhpcy5wYXNzZWRUaW1lICs9IDEwMDtcclxuXHRcdFx0aWYgKHRoaXMucGFzc2VkVGltZSA+IHRoaXMudGlja0ludGVydmFsICogOTk5KSB7XHJcblx0XHRcdFx0dGhpcy5wYXNzZWRUaW1lID0gMDtcclxuXHRcdFx0XHR0aGlzLmVtaXRVcGRhdGUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5wYXNzZWRUaW1lID0gMDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGVtaXRVcGRhdGUoKSB7XHJcblx0XHRsYWRkZXIuaGFuZGxlTGFkZGVyVXBkYXRlcyh7XHJcblx0XHRcdGV2ZW50czogW10sXHJcblx0XHRcdHNlY29uZHNQYXNzZWQ6IHRoaXMudGlja1NwZWVkLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuXHJcbiJdfQ==