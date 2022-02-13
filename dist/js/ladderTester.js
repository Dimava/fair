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
				<a-progress title="bias" :percent="${+(this.ladder.state.yourRanker.power / this.ladder.getMultiplierCost() * 100).toFixed(0)}" />

				<br> <br>
				<a-button type="primary" @click="${this.ladder.fakeRequest('BIAS')}">
					Bias
				</a-button>
				can:{${this.ladder.canRequest('bias')}}
				({${this.format(this.ladder.state.yourRanker.points)}} / {${this.format(this.ladder.getBiasCost())}})
				<a-progress title="bias" :percent="${+(this.ladder.state.yourRanker.points / this.ladder.getBiasCost() * 100).toFixed(0)}" color="yellow" />

				
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
                    this.interpolateOffset = (performance.now() - this.ladder.state.updateRealTime) / 1000;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyVGVzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlclRlc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBVUEsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxZQUFZLENBQUM7SUFDMUMsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUVELElBQUksRUFBRTtRQUNMLE9BQU87Ozs7c0JBSWEsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dDQUNsQixJQUFJLENBQUMsWUFBWTtvQkFDN0IsQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHOzs7Ozs7Ozt3QkFReEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0NBQ3pCLElBQUksQ0FBQyxpQkFBaUI7b0JBQ2xDLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRzs7Ozs7Ozs7aUVBUWlCLElBQUksQ0FBQyxTQUFTOzs7Ozs7O2lDQU85QyxJQUFJLENBQUMsT0FBTzs7OztpQ0FJWixJQUFJLENBQUMsZ0JBQWdCOzs7Ozs7dUNBTWYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDOzs7V0FHNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO3lDQUNsRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FD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blx0d2F0Y2g6IHtcclxuXHRcdGludGVycG9sYXRlT2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XHJcblx0XHRcdGxldCBsYWRkZXI6IEZhaXJMYWRkZXIgPSB0aGlzLmxhZGRlcjtcclxuXHRcdFx0bGFkZGVyLmludGVycG9sYXRlTGFkZGVyKG9mZnNldCk7XHJcblx0XHR9XHJcblx0fVxyXG59KVxyXG5jbGFzcyBMYWRkZXJUZXN0ZXJWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxURVNURVItVlVFPlxyXG5cclxuXHRcdFx0XHQ8ZGl2IHN0eWxlPVwibWF4LXdpZHRoOiAzMDBweDtcIj5cclxuXHRcdFx0XHRcdFRpY2tpbmcgZXZlcnkgeyR7dGhpcy50aWNrSW50ZXJ2YWwudG9GaXhlZCgxKX19c1xyXG5cdFx0XHRcdFx0PGEtc2xpZGVyIHYtbW9kZWw6dmFsdWU9XCIke3RoaXMudGlja0ludGVydmFsfVwiXHJcblx0XHRcdFx0XHRcdFx0ZG90cyA6bWluPVwiJHswfVwiIDptYXg9XCIkezF9XCIgOnN0ZXA9XCIkezAuMX1cIlxyXG5cdFx0XHRcdFx0XHRcdHN0eWxlPVwibWF4LXdpZHRoOiAzMDBweDtcIlxyXG5cdFx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdFx0PHRlbXBsYXRlICNtYXJrPiB0aWNrIGludGVydmFsIDwvdGVtcGxhdGU+XHRcclxuXHRcdFx0XHRcdDwvYS1zbGlkZXI+XHJcblx0XHRcdFx0PC9kaXY+XHJcblxyXG5cdFx0XHRcdDxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiPlxyXG5cdFx0XHRcdFx0SW50ZXJwb2xhdGVkIGJ5IHske3RoaXMuaW50ZXJwb2xhdGVPZmZzZXQudG9GaXhlZCgxKX19c1xyXG5cdFx0XHRcdFx0PGEtc2xpZGVyIHYtbW9kZWw6dmFsdWU9XCIke3RoaXMuaW50ZXJwb2xhdGVPZmZzZXR9XCJcclxuXHRcdFx0XHRcdFx0XHRkb3RzIDptaW49XCIkezB9XCIgOm1heD1cIiR7NX1cIiA6c3RlcD1cIiR7MC4xfVwiXHJcblx0XHRcdFx0XHRcdFx0c3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiXHJcblx0XHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI21hcms+IHRpY2sgaW50ZXJ2YWwgPC90ZW1wbGF0ZT5cdFxyXG5cdFx0XHRcdFx0PC9hLXNsaWRlcj5cclxuXHRcdFx0XHRcdGV2ZXJcclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHJcblx0XHRcdFx0PGEtaW5wdXQtbnVtYmVyIG1pbj1cIjBcIiBtYXg9XCIxMFwiIHN0ZXA9XCIwLjFcIiB2LW1vZGVsOnZhbHVlPVwiJHt0aGlzLnRpY2tTcGVlZH1cIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYWRkb25CZWZvcmU+XHJcblx0XHRcdFx0XHRcdFRpY2sgYW1vdW50XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1pbnB1dC1udW1iZXI+XHJcblx0XHRcdFx0PGJyPlxyXG5cclxuXHRcdFx0XHQ8YS1zd2l0Y2ggdi1tb2RlbDpjaGVja2VkPVwiJHt0aGlzLnRpY2tpbmd9XCI+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2NoZWNrZWRDaGlsZHJlbj4gdGlja2luZyA8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICN1bkNoZWNrZWRDaGlsZHJlbj4gcGF1c2VkIDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLXN3aXRjaD5cdFx0XHRcdFxyXG5cdFx0XHRcdDxhLXN3aXRjaCB2LW1vZGVsOmNoZWNrZWQ9XCIke3RoaXMudXBkYXRlRXZlcnlGcmFtZX1cIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjY2hlY2tlZENoaWxkcmVuPiB1cGRhdGluZyA8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICN1bkNoZWNrZWRDaGlsZHJlbj4gcGF1c2VkIDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLXN3aXRjaD5cclxuXHRcdFx0XHQ8YnI+IDxicj5cclxuXHJcblx0XHRcdFx0PGEtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgQGNsaWNrPVwiJHt0aGlzLmxhZGRlci5mYWtlUmVxdWVzdCgnTVVMVEknKX1cIj5cclxuXHRcdFx0XHRcdE11bHRpXHJcblx0XHRcdFx0PC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRjYW46eyR7dGhpcy5sYWRkZXIuY2FuUmVxdWVzdCgnbXVsdGknKX19XHJcblx0XHRcdFx0KHske3RoaXMuZm9ybWF0KHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG93ZXIpfX0gLyB7JHt0aGlzLmZvcm1hdCh0aGlzLmxhZGRlci5nZXRNdWx0aXBsaWVyQ29zdCgpKX19KVxyXG5cdFx0XHRcdDxhLXByb2dyZXNzIHRpdGxlPVwiYmlhc1wiIDpwZXJjZW50PVwiJHsrKHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG93ZXIgLyB0aGlzLmxhZGRlci5nZXRNdWx0aXBsaWVyQ29zdCgpICogMTAwKS50b0ZpeGVkKDApXHJcblx0XHRcdH1cIiAvPlxyXG5cclxuXHRcdFx0XHQ8YnI+IDxicj5cclxuXHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiBAY2xpY2s9XCIke3RoaXMubGFkZGVyLmZha2VSZXF1ZXN0KCdCSUFTJyl9XCI+XHJcblx0XHRcdFx0XHRCaWFzXHJcblx0XHRcdFx0PC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRjYW46eyR7dGhpcy5sYWRkZXIuY2FuUmVxdWVzdCgnYmlhcycpfX1cclxuXHRcdFx0XHQoeyR7dGhpcy5mb3JtYXQodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5wb2ludHMpfX0gLyB7JHt0aGlzLmZvcm1hdCh0aGlzLmxhZGRlci5nZXRCaWFzQ29zdCgpKX19KVxyXG5cdFx0XHRcdDxhLXByb2dyZXNzIHRpdGxlPVwiYmlhc1wiIDpwZXJjZW50PVwiJHsrKHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG9pbnRzIC8gdGhpcy5sYWRkZXIuZ2V0Qmlhc0Nvc3QoKSAqIDEwMCkudG9GaXhlZCgwKVxyXG5cdFx0XHR9XCIgY29sb3I9XCJ5ZWxsb3dcIiAvPlxyXG5cclxuXHRcdFx0XHRcclxuXHRcdFx0XHQ8YnI+IDxicj5cclxuXHRcdFx0XHQ8YS1pbnB1dC1udW1iZXIgdi1tb2RlbDp2YWx1ZT1cIiR7dGhpcy55b3VyUmFua2VyLm11bHRpcGxpZXJ9XCI+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2FkZG9uQmVmb3JlPm11bHRpPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtaW5wdXQtbnVtYmVyPlxyXG5cdFx0XHRcdDxhLWlucHV0LW51bWJlciB2LW1vZGVsOnZhbHVlPVwiJHt0aGlzLnlvdXJSYW5rZXIuYmlhc31cIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYWRkb25CZWZvcmU+YmlhczwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLWlucHV0LW51bWJlcj5cclxuXHJcblx0XHRcdDwvVEVTVEVSLVZVRT5cclxuXHRcdGA7XHJcblx0fVxyXG5cclxuXHR0aWNrSW50ZXJ2YWwgPSAxO1xyXG5cdHRpY2tTcGVlZCA9IDE7XHJcblx0dGlja2luZyA9IGZhbHNlO1xyXG5cclxuXHRpbnRlcnBvbGF0ZU9mZnNldCA9IDA7XHJcblx0dXBkYXRlRXZlcnlGcmFtZSA9IGZhbHNlO1xyXG5cclxuXHRwYXNzZWRUaW1lID0gMDtcclxuXHRtb3VudGVkKCkge1xyXG5cdFx0c2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy50aWNrKCksIDEwMCk7XHJcblxyXG5cdFx0dm9pZCAoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHR3aGlsZSh0cnVlKSB7XHJcblx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcclxuXHRcdFx0XHRpZiAodGhpcy51cGRhdGVFdmVyeUZyYW1lKVxyXG5cdFx0XHRcdFx0dGhpcy5pbnRlcnBvbGF0ZU9mZnNldCA9IChwZXJmb3JtYW5jZS5ub3coKSAtIHRoaXMubGFkZGVyLnN0YXRlLnVwZGF0ZVJlYWxUaW1lKSAvIDEwMDA7XHJcblx0XHRcdH1cclxuXHRcdH0pKCk7XHJcblx0fVxyXG5cdGZvcm1hdChuOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiBudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KG4pO1xyXG5cdH1cclxuXHJcblx0Z2V0IHlvdXJSYW5rZXIoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlcjtcclxuXHR9XHJcblx0dGljaygpIHtcclxuXHRcdGlmICh0aGlzLnRpY2tpbmcpIHtcclxuXHRcdFx0dGhpcy5wYXNzZWRUaW1lICs9IDEwMDtcclxuXHRcdFx0aWYgKHRoaXMucGFzc2VkVGltZSA+IHRoaXMudGlja0ludGVydmFsICogOTk5KSB7XHJcblx0XHRcdFx0dGhpcy5wYXNzZWRUaW1lID0gMDtcclxuXHRcdFx0XHR0aGlzLmVtaXRVcGRhdGUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5wYXNzZWRUaW1lID0gMDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGVtaXRVcGRhdGUoKSB7XHJcblx0XHRsYWRkZXIuaGFuZGxlTGFkZGVyVXBkYXRlcyh7XHJcblx0XHRcdGV2ZW50czogW10sXHJcblx0XHRcdHNlY29uZHNQYXNzZWQ6IHRoaXMudGlja1NwZWVkLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuXHJcbiJdfQ==