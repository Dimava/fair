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
				<a-input-number v-model:value="yourRanker.multiplier">
					<template #addonBefore>multi</template>
				</a-input-number>
				<a-input-number v-model:value="yourRanker.bias">
					<template #addonBefore>bias</template>
				</a-input-number>

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
    GlobalComponent
], LadderTesterVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyVGVzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlclRlc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxZQUFZLENBQUM7SUFDMUMsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUVELElBQUksRUFBRTtRQUNMLE9BQU87Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3VDQTBCOEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDOzs7V0FHNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO3lDQUV0RyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FDeEY7Ozt1Q0FHbUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDOzs7V0FHM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQzt5Q0FFakcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUNuRjs7Ozs7Ozs7Ozs7O0dBWUQsQ0FBQztJQUNILENBQUM7SUFFRCxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDZCxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBR2hCLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDZixPQUFPO1FBQ04sV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBQ0QsTUFBTSxDQUFDLENBQVE7UUFDZCxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO0lBQ3JDLENBQUM7SUFDRCxJQUFJO1FBQ0gsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2pCLElBQUksQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDO1lBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsRUFBRTtnQkFDOUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUNsQjtTQUNEO2FBQU07WUFDTixJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztTQUNwQjtJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsTUFBTSxDQUFDLG1CQUFtQixDQUFDO1lBQzFCLE1BQU0sRUFBRSxFQUFFO1lBQ1YsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTO1NBQzdCLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FFRCxDQUFBO0FBOUZBO0lBREMsV0FBVzt5Q0EwRFg7QUE3REksZUFBZTtJQURwQixlQUFlO0dBQ1YsZUFBZSxDQWtHcEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbkBHbG9iYWxDb21wb25lbnRcclxuY2xhc3MgTGFkZGVyVGVzdGVyVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRsYWRkZXI6IEZhaXJMYWRkZXIsXHJcbn0pIHtcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRyZXR1cm4gYFxyXG5cdFx0XHQ8VEVTVEVSLVZVRT5cclxuXHJcblx0XHRcdFx0PGRpdiBzdHlsZT1cIm1heC13aWR0aDogMzAwcHg7XCI+XHJcblx0XHRcdFx0XHRUaWNraW5nIGV2ZXJ5IHt7IHRpY2tJbnRlcnZhbC50b0ZpeGVkKDEpIH19c1xyXG5cdFx0XHRcdFx0PGEtc2xpZGVyIHYtbW9kZWw6dmFsdWU9XCJ0aWNrSW50ZXJ2YWxcIlxyXG5cdFx0XHRcdFx0XHRcdDpkb3RzPVwidHJ1ZVwiIDptaW49XCIwXCIgOm1heD1cIjFcIiA6c3RlcD1cIjAuMVwiXHJcblx0XHRcdFx0XHRcdFx0c3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiXHJcblx0XHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI21hcms+IHRpY2sgaW50ZXJ2YWwgPC90ZW1wbGF0ZT5cdFxyXG5cdFx0XHRcdFx0PC9hLXNsaWRlcj5cclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHJcblx0XHRcdFx0PGEtaW5wdXQtbnVtYmVyIG1pbj1cIjBcIiBtYXg9XCIxMFwiIHN0ZXA9XCIwLjFcIiB2LW1vZGVsOnZhbHVlPVwidGlja1NwZWVkXCI+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2FkZG9uQmVmb3JlPlxyXG5cdFx0XHRcdFx0XHRUaWNrIGFtb3VudFxyXG5cdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtaW5wdXQtbnVtYmVyPlxyXG5cdFx0XHRcdDxicj5cclxuXHJcblx0XHRcdFx0PGEtc3dpdGNoIHYtbW9kZWw6Y2hlY2tlZD1cInRpY2tpbmdcIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjY2hlY2tlZENoaWxkcmVuPiB0aWNraW5nIDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3VuQ2hlY2tlZENoaWxkcmVuPiBwYXVzZWQgPC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2Etc3dpdGNoPlxyXG5cdFx0XHRcdDxicj4gPGJyPlxyXG5cclxuXHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiBAY2xpY2s9XCIke3RoaXMubGFkZGVyLmZha2VSZXF1ZXN0KCdNVUxUSScpfVwiPlxyXG5cdFx0XHRcdFx0TXVsdGlcclxuXHRcdFx0XHQ8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdGNhbjp7JHt0aGlzLmxhZGRlci5jYW5SZXF1ZXN0KCdtdWx0aScpfX1cclxuXHRcdFx0XHQoeyR7dGhpcy5mb3JtYXQodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5wb3dlcil9fSAvIHske3RoaXMuZm9ybWF0KHRoaXMubGFkZGVyLmdldE11bHRpcGxpZXJDb3N0KCkpfX0pXHJcblx0XHRcdFx0PGEtcHJvZ3Jlc3MgdGl0bGU9XCJiaWFzXCIgOnBlcmNlbnQ9XCIke1xyXG5cdFx0XHRcdFx0Kyh0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnBvd2VyIC8gdGhpcy5sYWRkZXIuZ2V0TXVsdGlwbGllckNvc3QoKSAqIDEwMCkudG9GaXhlZCgwKVxyXG5cdFx0XHRcdH1cIiAvPlxyXG5cclxuXHRcdFx0XHQ8YnI+IDxicj5cclxuXHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiBAY2xpY2s9XCIke3RoaXMubGFkZGVyLmZha2VSZXF1ZXN0KCdCSUFTJyl9XCI+XHJcblx0XHRcdFx0XHRCaWFzXHJcblx0XHRcdFx0PC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRjYW46eyR7dGhpcy5sYWRkZXIuY2FuUmVxdWVzdCgnYmlhcycpfX1cclxuXHRcdFx0XHQoeyR7dGhpcy5mb3JtYXQodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5wb2ludHMpfX0gLyB7JHt0aGlzLmZvcm1hdCh0aGlzLmxhZGRlci5nZXRCaWFzQ29zdCgpKX19KVxyXG5cdFx0XHRcdDxhLXByb2dyZXNzIHRpdGxlPVwiYmlhc1wiIDpwZXJjZW50PVwiJHtcclxuXHRcdFx0XHRcdCsodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5wb2ludHMgLyB0aGlzLmxhZGRlci5nZXRCaWFzQ29zdCgpICogMTAwKS50b0ZpeGVkKDApXHJcblx0XHRcdFx0fVwiIGNvbG9yPVwieWVsbG93XCIgLz5cclxuXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0PGJyPiA8YnI+XHJcblx0XHRcdFx0PGEtaW5wdXQtbnVtYmVyIHYtbW9kZWw6dmFsdWU9XCJ5b3VyUmFua2VyLm11bHRpcGxpZXJcIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYWRkb25CZWZvcmU+bXVsdGk8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1pbnB1dC1udW1iZXI+XHJcblx0XHRcdFx0PGEtaW5wdXQtbnVtYmVyIHYtbW9kZWw6dmFsdWU9XCJ5b3VyUmFua2VyLmJpYXNcIj5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYWRkb25CZWZvcmU+YmlhczwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLWlucHV0LW51bWJlcj5cclxuXHJcblx0XHRcdDwvVEVTVEVSLVZVRT5cclxuXHRcdGA7XHJcblx0fVxyXG5cclxuXHR0aWNrSW50ZXJ2YWwgPSAxO1xyXG5cdHRpY2tTcGVlZCA9IDE7XHJcblx0dGlja2luZyA9IGZhbHNlO1xyXG5cclxuXHJcblx0cGFzc2VkVGltZSA9IDA7XHJcblx0bW91bnRlZCgpIHtcclxuXHRcdHNldEludGVydmFsKCgpID0+IHRoaXMudGljaygpLCAxMDApO1xyXG5cdH1cclxuXHRmb3JtYXQobjpudW1iZXIpe1xyXG5cdFx0cmV0dXJuIG51bWJlckZvcm1hdHRlci5mb3JtYXQobik7XHJcblx0fVxyXG5cclxuXHRnZXQgeW91clJhbmtlcigpe1xyXG5cdFx0cmV0dXJuIHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXI7XHJcblx0fVxyXG5cdHRpY2soKSB7XHJcblx0XHRpZiAodGhpcy50aWNraW5nKSB7XHJcblx0XHRcdHRoaXMucGFzc2VkVGltZSArPSAxMDA7XHJcblx0XHRcdGlmICh0aGlzLnBhc3NlZFRpbWUgPiB0aGlzLnRpY2tJbnRlcnZhbCAqIDk5OSkge1xyXG5cdFx0XHRcdHRoaXMucGFzc2VkVGltZSA9IDA7XHJcblx0XHRcdFx0dGhpcy5lbWl0VXBkYXRlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMucGFzc2VkVGltZSA9IDA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRlbWl0VXBkYXRlKCkge1xyXG5cdFx0bGFkZGVyLmhhbmRsZUxhZGRlclVwZGF0ZXMoe1xyXG5cdFx0XHRldmVudHM6IFtdLFxyXG5cdFx0XHRzZWNvbmRzUGFzc2VkOiB0aGlzLnRpY2tTcGVlZCxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcbn1cclxuXHJcblxyXG4iXX0=