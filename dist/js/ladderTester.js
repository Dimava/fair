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
					Ticking every {${this.tickInterval.toFixed(1)}}s
					<a-slider v-model:value="${this.tickInterval}"
							dots :min="${0}" :max="${1}" :step="${0.1}"
							style="max-width: 300px;"
							>
						<template #mark> tick interval </template>
					</a-slider>
				</div>

				<div style="max-width: 300px;">
					Interpolated by {${this.interpolateOffset.toFixed(1)}}s
					<a-slider v-model:value="${this.interpolateOffset}"
							dots :min="${0}" :max="${5}" :step="${0.1}"
							style="max-width: 300px;"
							>
						<template #mark> tick interval </template>
					</a-slider>
					ever
				</div>

				<a-input-number min="0" max="10" step="0.1" v-model:value="${this.tickSpeed}">
					<template #addonBefore>
						Tick amount
					</template>
				</a-input-number>
				<br>

				<a-switch v-model:checked="${this.ticking}">
					<template #checkedChildren> ticking </template>
					<template #unCheckedChildren> paused </template>
				</a-switch>
				<a-switch v-model:checked="${this.updateEveryFrame}">
					<template #checkedChildren> updating </template>
					<template #unCheckedChildren> paused </template>
				</a-switch>
				<br> <br>

				<a-button type="primary" @click="${this.ladder.fakeRequest('MULTI')}">
					Multi
				</a-button>
				can:{${this.ladder.canRequest('multi')}}
				({${this.format(this.ladder.state.yourRanker.power)}} / {${this.format(this.ladder.getMultiplierCost())}})
				<a-progress title="bias"
					:percent="${+(this.ladder.state.yourRanker.power / this.ladder.getMultiplierCost() * 100).toFixed(0)}" />

				<br> <br>
				<a-button type="primary" @click="${this.ladder.fakeRequest('BIAS')}">
					Bias
				</a-button>
				can:{${this.ladder.canRequest('bias')}}
				({${this.format(this.ladder.state.yourRanker.points)}} / {${this.format(this.ladder.getBiasCost())}})
				<a-progress title="bias"
					:percent="${+(this.ladder.state.yourRanker.points / this.ladder.getBiasCost() * 100).toFixed(0)}" color="yellow" />

				
				<br> <br>
				<a-input-number v-model:value="${this.yourRanker.multiplier}">
					<template #addonBefore>multi</template>
				</a-input-number>
				<a-input-number v-model:value="${this.yourRanker.bias}">
					<template #addonBefore>bias</template>
				</a-input-number>

			</TESTER-VUE>
		`;
    }
    tickInterval = 1;
    tickSpeed = 1;
    ticking = false;
    interpolateOffset = 0;
    updateEveryFrame = false;
    passedTime = 0;
    mounted() {
        setInterval(() => this.tick(), 100);
        void (async () => {
            while (true) {
                await new Promise(requestAnimationFrame);
                if (this.updateEveryFrame)
                    this.interpolateOffset = (performance.now() - this.ladder.state.updateEndRealtime) / 1000;
            }
        })();
    }
    format(n) {
        return numberFormatter.format(n);
    }
    get yourRanker() {
        return this.ladder.state.yourRanker;
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
    GlobalComponent({
        watch: {
            interpolateOffset(offset) {
                let ladder = this.ladder;
                ladder.interpolateLadder(offset);
            }
        }
    })
], LadderTesterVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyVGVzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlclRlc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBVUEsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxZQUFZLENBQUM7SUFDMUMsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUVELElBQUksRUFBRTtRQUNMLE9BQU87Ozs7c0JBSWEsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dDQUNsQixJQUFJLENBQUMsWUFBWTtvQkFDN0IsQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHOzs7Ozs7Ozt3QkFReEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0NBQ3pCLElBQUksQ0FBQyxpQkFBaUI7b0JBQ2xDLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRzs7Ozs7Ozs7aUVBUWlCLElBQUksQ0FBQyxTQUFTOzs7Ozs7O2lDQU85QyxJQUFJLENBQUMsT0FBTzs7OztpQ0FJWixJQUFJLENBQUMsZ0JBQWdCOzs7Ozs7dUNBTWYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDOzs7V0FHNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDOztpQkFFMUYsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENB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clxuXHR3YXRjaDoge1xyXG5cdFx0aW50ZXJwb2xhdGVPZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcclxuXHRcdFx0bGV0IGxhZGRlcjogRmFpckxhZGRlciA9IHRoaXMubGFkZGVyO1xyXG5cdFx0XHRsYWRkZXIuaW50ZXJwb2xhdGVMYWRkZXIob2Zmc2V0KTtcclxuXHRcdH1cclxuXHR9XHJcbn0pXHJcbmNsYXNzIExhZGRlclRlc3RlclZ1ZSBleHRlbmRzIFZ1ZVdpdGhQcm9wcyh7XHJcblx0bGFkZGVyOiBGYWlyTGFkZGVyLFxyXG59KSB7XHJcblx0QFZ1ZVRlbXBsYXRlXHJcblx0Z2V0IF90KCkge1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PFRFU1RFUi1WVUU+XHJcblxyXG5cdFx0XHRcdDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiPlxyXG5cdFx0XHRcdFx0VGlja2luZyBldmVyeSB7JHt0aGlzLnRpY2tJbnRlcnZhbC50b0ZpeGVkKDEpfX1zXHJcblx0XHRcdFx0XHQ8YS1zbGlkZXIgdi1tb2RlbDp2YWx1ZT1cIiR7dGhpcy50aWNrSW50ZXJ2YWx9XCJcclxuXHRcdFx0XHRcdFx0XHRkb3RzIDptaW49XCIkezB9XCIgOm1heD1cIiR7MX1cIiA6c3RlcD1cIiR7MC4xfVwiXHJcblx0XHRcdFx0XHRcdFx0c3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiXHJcblx0XHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI21hcms+IHRpY2sgaW50ZXJ2YWwgPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdDwvYS1zbGlkZXI+XHJcblx0XHRcdFx0PC9kaXY+XHJcblxyXG5cdFx0XHRcdDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiPlxyXG5cdFx0XHRcdFx0SW50ZXJwb2xhdGVkIGJ5IHske3RoaXMuaW50ZXJwb2xhdGVPZmZzZXQudG9GaXhlZCgxKX19c1xyXG5cdFx0XHRcdFx0PGEtc2xpZGVyIHYtbW9kZWw6dmFsdWU9XCIke3RoaXMuaW50ZXJwb2xhdGVPZmZzZXR9XCJcclxuXHRcdFx0XHRcdFx0XHRkb3RzIDptaW49XCIkezB9XCIgOm1heD1cIiR7NX1cIiA6c3RlcD1cIiR7MC4xfVwiXHJcblx0XHRcdFx0XHRcdFx0c3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiXHJcblx0XHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI21hcms+IHRpY2sgaW50ZXJ2YWwgPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdDwvYS1zbGlkZXI+XHJcblx0XHRcdFx0XHRldmVyXHJcblx0XHRcdFx0PC9kaXY+XHJcblxyXG5cdFx0XHRcdDxhLWlucHV0LW51bWJlciBtaW49XCIwXCIgbWF4PVwiMTBcIiBzdGVwPVwiMC4xXCIgdi1tb2RlbDp2YWx1ZT1cIiR7dGhpcy50aWNrU3BlZWR9XCI+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2FkZG9uQmVmb3JlPlxyXG5cdFx0XHRcdFx0XHRUaWNrIGFtb3VudFxyXG5cdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtaW5wdXQtbnVtYmVyPlxyXG5cdFx0XHRcdDxicj5cclxuXHJcblx0XHRcdFx0PGEtc3dpdGNoIHYtbW9kZWw6Y2hlY2tlZD1cIiR7dGhpcy50aWNraW5nfVwiPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNjaGVja2VkQ2hpbGRyZW4+IHRpY2tpbmcgPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjdW5DaGVja2VkQ2hpbGRyZW4+IHBhdXNlZCA8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1zd2l0Y2g+XHJcblx0XHRcdFx0PGEtc3dpdGNoIHYtbW9kZWw6Y2hlY2tlZD1cIiR7dGhpcy51cGRhdGVFdmVyeUZyYW1lfVwiPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNjaGVja2VkQ2hpbGRyZW4+IHVwZGF0aW5nIDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3VuQ2hlY2tlZENoaWxkcmVuPiBwYXVzZWQgPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2Etc3dpdGNoPlxyXG5cdFx0XHRcdDxicj4gPGJyPlxyXG5cclxuXHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiBAY2xpY2s9XCIke3RoaXMubGFkZGVyLmZha2VSZXF1ZXN0KCdNVUxUSScpfVwiPlxyXG5cdFx0XHRcdFx0TXVsdGlcclxuXHRcdFx0XHQ8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdGNhbjp7JHt0aGlzLmxhZGRlci5jYW5SZXF1ZXN0KCdtdWx0aScpfX1cclxuXHRcdFx0XHQoeyR7dGhpcy5mb3JtYXQodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5wb3dlcil9fSAvIHske3RoaXMuZm9ybWF0KHRoaXMubGFkZGVyLmdldE11bHRpcGxpZXJDb3N0KCkpfX0pXHJcblx0XHRcdFx0PGEtcHJvZ3Jlc3MgdGl0bGU9XCJiaWFzXCJcclxuXHRcdFx0XHRcdDpwZXJjZW50PVwiJHsrKHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG93ZXIgLyB0aGlzLmxhZGRlci5nZXRNdWx0aXBsaWVyQ29zdCgpICogMTAwKS50b0ZpeGVkKDApfVwiIC8+XHJcblxyXG5cdFx0XHRcdDxicj4gPGJyPlxyXG5cdFx0XHRcdDxhLWJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIEBjbGljaz1cIiR7dGhpcy5sYWRkZXIuZmFrZVJlcXVlc3QoJ0JJQVMnKX1cIj5cclxuXHRcdFx0XHRcdEJpYXNcclxuXHRcdFx0XHQ8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdGNhbjp7JHt0aGlzLmxhZGRlci5jYW5SZXF1ZXN0KCdiaWFzJyl9fVxyXG5cdFx0XHRcdCh7JHt0aGlzLmZvcm1hdCh0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnBvaW50cyl9fSAvIHske3RoaXMuZm9ybWF0KHRoaXMubGFkZGVyLmdldEJpYXNDb3N0KCkpfX0pXHJcblx0XHRcdFx0PGEtcHJvZ3Jlc3MgdGl0bGU9XCJiaWFzXCJcclxuXHRcdFx0XHRcdDpwZXJjZW50PVwiJHsrKHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG9pbnRzIC8gdGhpcy5sYWRkZXIuZ2V0Qmlhc0Nvc3QoKSAqIDEwMCkudG9GaXhlZCgwKX1cIiBjb2xvcj1cInllbGxvd1wiIC8+XHJcblxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdDxicj4gPGJyPlxyXG5cdFx0XHRcdDxhLWlucHV0LW51bWJlciB2LW1vZGVsOnZhbHVlPVwiJHt0aGlzLnlvdXJSYW5rZXIubXVsdGlwbGllcn1cIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYWRkb25CZWZvcmU+bXVsdGk8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1pbnB1dC1udW1iZXI+XHJcblx0XHRcdFx0PGEtaW5wdXQtbnVtYmVyIHYtbW9kZWw6dmFsdWU9XCIke3RoaXMueW91clJhbmtlci5iaWFzfVwiPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNhZGRvbkJlZm9yZT5iaWFzPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtaW5wdXQtbnVtYmVyPlxyXG5cclxuXHRcdFx0PC9URVNURVItVlVFPlxyXG5cdFx0YDtcclxuXHR9XHJcblxyXG5cdHRpY2tJbnRlcnZhbCA9IDE7XHJcblx0dGlja1NwZWVkID0gMTtcclxuXHR0aWNraW5nID0gZmFsc2U7XHJcblxyXG5cdGludGVycG9sYXRlT2Zmc2V0ID0gMDtcclxuXHR1cGRhdGVFdmVyeUZyYW1lID0gZmFsc2U7XHJcblxyXG5cdHBhc3NlZFRpbWUgPSAwO1xyXG5cdG1vdW50ZWQoKSB7XHJcblx0XHRzZXRJbnRlcnZhbCgoKSA9PiB0aGlzLnRpY2soKSwgMTAwKTtcclxuXHJcblx0XHR2b2lkIChhc3luYyAoKSA9PiB7XHJcblx0XHRcdHdoaWxlICh0cnVlKSB7XHJcblx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcclxuXHRcdFx0XHRpZiAodGhpcy51cGRhdGVFdmVyeUZyYW1lKVxyXG5cdFx0XHRcdFx0dGhpcy5pbnRlcnBvbGF0ZU9mZnNldCA9IChwZXJmb3JtYW5jZS5ub3coKSAtIHRoaXMubGFkZGVyLnN0YXRlLnVwZGF0ZUVuZFJlYWx0aW1lKSAvIDEwMDA7XHJcblx0XHRcdH1cclxuXHRcdH0pKCk7XHJcblx0fVxyXG5cdGZvcm1hdChuOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiBudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KG4pO1xyXG5cdH1cclxuXHJcblx0Z2V0IHlvdXJSYW5rZXIoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlcjtcclxuXHR9XHJcblx0dGljaygpIHtcclxuXHRcdGlmICh0aGlzLnRpY2tpbmcpIHtcclxuXHRcdFx0dGhpcy5wYXNzZWRUaW1lICs9IDEwMDtcclxuXHRcdFx0aWYgKHRoaXMucGFzc2VkVGltZSA+IHRoaXMudGlja0ludGVydmFsICogOTk5KSB7XHJcblx0XHRcdFx0dGhpcy5wYXNzZWRUaW1lID0gMDtcclxuXHRcdFx0XHR0aGlzLmVtaXRVcGRhdGUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5wYXNzZWRUaW1lID0gMDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGVtaXRVcGRhdGUoKSB7XHJcblx0XHRsYWRkZXIuaGFuZGxlTGFkZGVyVXBkYXRlcyh7XHJcblx0XHRcdGV2ZW50czogW10sXHJcblx0XHRcdHNlY29uZHNQYXNzZWQ6IHRoaXMudGlja1NwZWVkLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuXHJcbiJdfQ==