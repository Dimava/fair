"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let FairLadderVue = class FairLadderVue extends VueWithProps({
    ladder: FairLadder,
}) {
    get _t() {
        let record = this.tableData[0];
        let ranker = this.tableData[0];
        let h = this.getHistory(ranker)[0];
        let text;
        let column;
        return `
			<LADDER>
				<a-table
						:columns="${this.columns}"
						:data-source="${this.tableData}"
						size="small"
						:rowKey="${(record) => record.accountId}"
						:rowClassName="${(record, index) => this.rowClassName(record)}"
						:pagination="${this.pagination}"
						x-tableLayout="fixed"
						>
					<template #headerCell="{ column, text }">
						<template v-if="${column.key == 'username'}">
							<b style="width: 1em;display:inline-flex;">
							</b>Username
						</template>
					</template>
					<template #bodyCell="{ text, record: ranker, index, column }">
						<template v-if="${column.key == 'rank'}">
							<span style="opacity: 0.2;">{${'0000'.slice((text + '').length)}}</span>{${text}}
						</template>
						<template v-if="${column.key == 'username'}">
							<a-tooltip
									placement="bottomLeft"
									>
								<b style="width: 1em;display:inline-flex;justify-content: center;"
										:style="${{ opacity: ranker.timesAsshole ? 1 : 0.1 }}">
									{${this.assholeTag(ranker) || '@'}}
								</b>{${text}}

								<template #title>
									<div v-if="${ranker.timesAsshole}">
										Pressed Asshole Button {${ranker.timesAsshole}} times
									</div>
									<div v-if="${!ranker.growing}">
										Promoted
									</div>
									id:{${ranker.accountId}}
								</template>
							</a-tooltip>
							<div style="float: right;">
								<b v-for="${h} of ${this.getHistory(ranker)}"
									style="display: inline-block;text-align:right;"
									:style="${h.style}"
								>{${h.text}}</b>
							</div>
							

						</template>
					</template>
					<template #footer>
						
						<a-row type="flex" style="align-items: center;">
							<a-col flex="9" />
							<a-col flex="1" style="padding: 0 8px;">
								<div style="white-space: nowrap;">
									({${this.bias.sPoints}} / {${this.bias.sCost}})
									[{${this.bias.sValue}}]
								</div>
							</a-col>
							<a-col flex="30%">
								<a-progress size="small" :percent="${this.bias.percent}" />
							</a-col>
							<a-col flex="70px">
								<a-button type="primary" class="button-green" :disabled="${!this.bias.canRequest}" @click="${this.bias.doRequest()}" block>
									Bias
								</a-button>
							</a-col>
						</a-row>
						<a-row type="flex" style="align-items: center;">
							<a-col flex="9">
								<a-switch v-model:checked="${this.interpolate}">
									<template #checkedChildren> interpolation </template>
									<template #unCheckedChildren> interpolation </template>
								</a-switch>
							</a-col>
							<a-col flex="1" style="padding: 0 8px;">
								<div style="white-space: nowrap;">
									({${this.multi.sPoints}} / {${this.multi.sCost}})
									[{${this.multi.sValue}}]
								</div>
							</a-col>
							<a-col flex="30%">
								<a-progress size="small" :percent="${this.multi.percent}" />
							</a-col>
							<a-col flex="70px">
								<a-button type="primary" :disabled="${!this.multi.canRequest}" @click="${this.multi.doRequest()}" block>
									Multi
								</a-button>
							</a-col>
						</a-row>
						
					</template>
				</a-table>
			</LADDER>
		`;
    }
    pageSize = 15;
    currentPage = -1;
    interpolate = false;
    get pagination() {
        if (this.currentPage == -1) {
            this.currentPage = Math.ceil(this.ladder.state.yourRanker.rank / this.pageSize);
        }
        return {
            defaultPageSize: this.pageSize,
            defaultCurrent: this.currentPage,
            // hideOnSinglePage: true,
            pageSize: this.pageSize,
            showSizeChanger: true,
            current: this.currentPage,
            onChange: (page, size) => {
                this.currentPage = page;
            },
            onShowSizeChange: (page, size) => {
                this.pageSize = size;
                setTimeout(() => {
                    this.currentPage = Math.ceil(this.ladder.state.yourRanker.rank / this.pageSize);
                    console.log({
                        rank: this.ladder.state.yourRanker.rank,
                        page: this.currentPage,
                        size
                    });
                });
            },
            pageSizeOptions: Array(30).fill(0).map((e, i) => i + 1).reverse(),
        };
    }
    columns = [
        { title: '#', dataIndex: 'rank', key: 'rank', width: 'calc(16px + 4ch)', align: 'right' },
        { title: 'Username', dataIndex: 'username', key: 'username' },
        { title: 'Power', dataIndex: 'powerFormatted', key: 'power', align: 'right', width: '30%' },
        { title: 'Points', dataIndex: 'pointsFormatted', key: 'points', align: 'right', width: '30%' },
    ];
    constructor(...a) {
        super(...a);
        this.columns[1].filters = [
            { text: 'Center yourself', value: true }
        ];
        this.columns[1].onFilter = (value, ranker) => {
            if (!value)
                return true;
            if (ranker.rank == 1)
                return true;
            return this.centeredLimits.min <= ranker.rank
                && ranker.rank <= this.centeredLimits.max;
        };
    }
    get centeredLimits() {
        let state = this.ladder.state;
        let half = ~~(this.pageSize / 2), extra = this.pageSize % 2;
        let middleRank = state.yourRanker.rank;
        middleRank = Math.min(middleRank, state.interpolated.rankers.length - half);
        middleRank = Math.max(middleRank, half + 1);
        return { min: middleRank - half + 1, max: middleRank + half - 1 + extra };
    }
    get tableData() {
        return this.ladder.state.interpolated.rankers;
    }
    rowClassName(record) {
        return {
            'ranker-row-you': record.you,
            'ranker-row-promoted': !record.growing,
        };
    }
    assholeTag(ranker) {
        let tags = this.ladder.state.infoData.assholeTags;
        if (ranker.timesAsshole < tags.length)
            return tags[ranker.timesAsshole];
        return tags[tags.length - 1];
    }
    getVisibleEvents(ranker) {
        const visibleDuration = 10;
        const disappearDuration = 10;
        let now = this.ladder.state.currentTime;
        return ranker.history
            .map(e => {
            let timeSince = now - e.currentTime;
            let opacity = timeSince < visibleDuration ? 1 : (1 - (timeSince - visibleDuration) / disappearDuration);
            return { delta: e.rank - e.oldRank, opacity };
        }).filter(e => e.opacity > 0)
            .flatMap(e => {
            return Array(Math.abs(e.delta)).fill(e);
        })
            .slice(-10).reverse();
    }
    getHistory(ranker) {
        // console.time()
        const visibleDuration = 10;
        const disappearDuration = 10;
        let now = this.ladder.state.currentTime;
        const texts = {
            UPRANK: '▲',
            DOWNRANK: '▼',
            LAST: '🥝',
            BIAS: ' B ',
            MULTI: ' M ',
        };
        const styleMap = {
            UPRANK: 'color:green;width:1ch;',
            DOWNRANK: 'color:red;width:1ch;',
            LAST: 'width:1ch;',
            BIAS: 'color:blue;width:2ch;',
            MULTI: 'color:purple;width:2ch;',
        };
        let v = [ranker.interpolated.history, ranker.history].flatMap(e => Vue.toRaw(e)).slice(0, 10)
            .flatMap(e => {
            let timeSince = now - e.currentTime;
            let opacity = timeSince < visibleDuration ? 1 : (1 - (timeSince - visibleDuration) / disappearDuration);
            if (opacity <= 0)
                return [];
            let text = texts[e.type] || ` ?${e.type}? `;
            let style = `opacity:${opacity}; ${styleMap[e.type] || ''}`;
            let data = { text, style, ...e };
            if (e.type != 'DOWNRANK' && e.type != 'UPRANK')
                return [data];
            else
                return Array(Math.abs(e.delta)).fill(0).map(e => data);
        }).slice(0, 10).reverse();
        // console.timeEnd()
        return Vue.markRaw(v);
    }
    format(n) {
        return numberFormatter.format(n);
    }
    get bias() {
        let time = this.ladder.state.currentTime;
        let value = this.ladder.state.yourRanker.bias;
        let cost = this.ladder.getBiasCost();
        let points = this.ladder.state.yourRanker.interpolated.points;
        return {
            value, cost, points,
            can: points >= cost,
            percent: Math.min(100, Math.floor(points / cost * 100)),
            sValue: '+' + value.toString().padStart(2, '0'),
            sCost: this.format(cost),
            sPoints: this.format(points),
            canRequest: this.ladder.canRequest('bias'),
            doRequest: () => {
                this.ladder.request('bias');
            },
        };
    }
    get multi() {
        let time = this.ladder.state.currentTime;
        let value = this.ladder.state.yourRanker.multiplier;
        let cost = this.ladder.getMultiplierCost();
        let points = this.ladder.state.yourRanker.interpolated.power;
        return {
            value, cost, points,
            can: points >= cost,
            percent: Math.min(100, Math.floor(points / cost * 100)),
            sValue: 'x' + value.toString().padStart(2, '0'),
            sCost: this.format(cost),
            sPoints: this.format(points),
            canRequest: this.ladder.canRequest('multi'),
            doRequest: () => {
                this.ladder.request('multi');
            },
        };
    }
    frameDuration = '';
    frames = '';
    mounted() {
        void (async () => {
            let frames = [0];
            let last = performance.now();
            while (1) {
                await new Promise(requestAnimationFrame);
                this.hanleAnimationFrame();
                let now = performance.now();
                let delta = now - last;
                if (delta > 30)
                    frames.unshift(delta);
                last = now;
                if (frames.length > 30)
                    frames.pop();
                this.frames = frames.map(e => e.toFixed(0).padStart(3, '0')).join(', ');
                this.frameDuration = frames.slice(0, 10)
                    .reduce((v, e, i, a) => v + e / a.length, 0).toFixed(3);
            }
        })();
    }
    hanleAnimationFrame() {
        if (!this.interpolate)
            return;
        let now = performance.now();
        let state = this.ladder.state;
        let estNextUpdate = state.updateStartRealtime + 1000;
        let estFinishInterpolate = now + (state.interpolated.realtimeEnd - state.interpolated.realtimeStart) + 8;
        if (estFinishInterpolate > estNextUpdate)
            return;
        this.ladder.interpolateLadder((now - state.updateEndRealtime) / 1000);
    }
};
__decorate([
    VueTemplate
], FairLadderVue.prototype, "_t", null);
FairLadderVue = __decorate([
    GlobalComponent
], FairLadderVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmFpckxhZGRlclZ1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlyTGFkZGVyVnVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFjLFNBQVEsWUFBWSxDQUFDO0lBQ3hDLE1BQU0sRUFBRSxVQUFVO0NBQ2xCLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDTCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLElBQWEsQ0FBQztRQUNsQixJQUFJLE1BQStCLENBQUM7UUFDcEMsT0FBTzs7O2tCQUdTLElBQUksQ0FBQyxPQUFPO3NCQUNSLElBQUksQ0FBQyxTQUFTOztpQkFFbkIsQ0FBQyxNQUFjLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTO3VCQUM5QixDQUFDLE1BQWMsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO3FCQUM5RCxJQUFJLENBQUMsVUFBVTs7Ozt3QkFJWixNQUFNLENBQUMsR0FBRyxJQUFJLFVBQVU7Ozs7Ozt3QkFNeEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNO3NDQUNOLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSTs7d0JBRTlELE1BQU0sQ0FBQyxHQUFHLElBQUksVUFBVTs7Ozs7b0JBSzVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FB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RyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7Q0FDRCxDQUFBO0FBblRBO0lBREMsV0FBVzt1Q0F1R1g7QUExR0ksYUFBYTtJQURsQixlQUFlO0dBQ1YsYUFBYSxDQXVUbEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuQEdsb2JhbENvbXBvbmVudFxyXG5jbGFzcyBGYWlyTGFkZGVyVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRsYWRkZXI6IEZhaXJMYWRkZXIsXHJcbn0pIHtcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRsZXQgcmVjb3JkID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRsZXQgcmFua2VyID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRsZXQgaCA9IHRoaXMuZ2V0SGlzdG9yeShyYW5rZXIpWzBdO1xyXG5cdFx0bGV0IHRleHQhOiBzdHJpbmc7XHJcblx0XHRsZXQgY29sdW1uITogdHlwZW9mIHRoaXMuY29sdW1uc1swXTtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxMQURERVI+XHJcblx0XHRcdFx0PGEtdGFibGVcclxuXHRcdFx0XHRcdFx0OmNvbHVtbnM9XCIke3RoaXMuY29sdW1uc31cIlxyXG5cdFx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCIke3RoaXMudGFibGVEYXRhfVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiXHJcblx0XHRcdFx0XHRcdDpyb3dLZXk9XCIkeyhyZWNvcmQ6IFJhbmtlcikgPT4gcmVjb3JkLmFjY291bnRJZH1cIlxyXG5cdFx0XHRcdFx0XHQ6cm93Q2xhc3NOYW1lPVwiJHsocmVjb3JkOiBSYW5rZXIsIGluZGV4OiBudW1iZXIpID0+IHRoaXMucm93Q2xhc3NOYW1lKHJlY29yZCl9XCJcclxuXHRcdFx0XHRcdFx0OnBhZ2luYXRpb249XCIke3RoaXMucGFnaW5hdGlvbn1cIlxyXG5cdFx0XHRcdFx0XHR4LXRhYmxlTGF5b3V0PVwiZml4ZWRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2hlYWRlckNlbGw9XCJ7IGNvbHVtbiwgdGV4dCB9XCI+XHJcblx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSB2LWlmPVwiJHtjb2x1bW4ua2V5ID09ICd1c2VybmFtZSd9XCI+XHJcblx0XHRcdFx0XHRcdFx0PGIgc3R5bGU9XCJ3aWR0aDogMWVtO2Rpc3BsYXk6aW5saW5lLWZsZXg7XCI+XHJcblx0XHRcdFx0XHRcdFx0PC9iPlVzZXJuYW1lXHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNib2R5Q2VsbD1cInsgdGV4dCwgcmVjb3JkOiByYW5rZXIsIGluZGV4LCBjb2x1bW4gfVwiPlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cIiR7Y29sdW1uLmtleSA9PSAncmFuayd9XCI+XHJcblx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9XCJvcGFjaXR5OiAwLjI7XCI+eyR7JzAwMDAnLnNsaWNlKCh0ZXh0ICsgJycpLmxlbmd0aCl9fTwvc3Bhbj57JHt0ZXh0fX1cclxuXHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0PHRlbXBsYXRlIHYtaWY9XCIke2NvbHVtbi5rZXkgPT0gJ3VzZXJuYW1lJ31cIj5cclxuXHRcdFx0XHRcdFx0XHQ8YS10b29sdGlwXHJcblx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlbWVudD1cImJvdHRvbUxlZnRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YiBzdHlsZT1cIndpZHRoOiAxZW07ZGlzcGxheTppbmxpbmUtZmxleDtqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDpzdHlsZT1cIiR7eyBvcGFjaXR5OiByYW5rZXIudGltZXNBc3Nob2xlID8gMSA6IDAuMSB9fVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7JHt0aGlzLmFzc2hvbGVUYWcocmFua2VyKSB8fCAnQCd9fVxyXG5cdFx0XHRcdFx0XHRcdFx0PC9iPnske3RleHR9fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjdGl0bGU+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgdi1pZj1cIiR7cmFua2VyLnRpbWVzQXNzaG9sZX1cIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRQcmVzc2VkIEFzc2hvbGUgQnV0dG9uIHske3Jhbmtlci50aW1lc0Fzc2hvbGV9fSB0aW1lc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PGRpdiB2LWlmPVwiJHshcmFua2VyLmdyb3dpbmd9XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0UHJvbW90ZWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlkOnske3Jhbmtlci5hY2NvdW50SWR9fVxyXG5cdFx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtdG9vbHRpcD5cclxuXHRcdFx0XHRcdFx0XHQ8ZGl2IHN0eWxlPVwiZmxvYXQ6IHJpZ2h0O1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGIgdi1mb3I9XCIke2h9IG9mICR7dGhpcy5nZXRIaXN0b3J5KHJhbmtlcil9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9XCJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpyaWdodDtcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6c3R5bGU9XCIke2guc3R5bGV9XCJcclxuXHRcdFx0XHRcdFx0XHRcdD57JHtoLnRleHR9fTwvYj5cclxuXHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcclxuXHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNmb290ZXI+XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQ8YS1yb3cgdHlwZT1cImZsZXhcIiBzdHlsZT1cImFsaWduLWl0ZW1zOiBjZW50ZXI7XCI+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI5XCIgLz5cclxuXHRcdFx0XHRcdFx0XHQ8YS1jb2wgZmxleD1cIjFcIiBzdHlsZT1cInBhZGRpbmc6IDAgOHB4O1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBzdHlsZT1cIndoaXRlLXNwYWNlOiBub3dyYXA7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdCh7JHt0aGlzLmJpYXMuc1BvaW50c319IC8geyR7dGhpcy5iaWFzLnNDb3N0fX0pXHJcblx0XHRcdFx0XHRcdFx0XHRcdFt7JHt0aGlzLmJpYXMuc1ZhbHVlfX1dXHJcblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbCBmbGV4PVwiMzAlXCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YS1wcm9ncmVzcyBzaXplPVwic21hbGxcIiA6cGVyY2VudD1cIiR7dGhpcy5iaWFzLnBlcmNlbnR9XCIgLz5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbCBmbGV4PVwiNzBweFwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGEtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgY2xhc3M9XCJidXR0b24tZ3JlZW5cIiA6ZGlzYWJsZWQ9XCIkeyF0aGlzLmJpYXMuY2FuUmVxdWVzdH1cIiBAY2xpY2s9XCIke3RoaXMuYmlhcy5kb1JlcXVlc3QoKX1cIiBibG9jaz5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Qmlhc1xyXG5cdFx0XHRcdFx0XHRcdFx0PC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0XHQ8L2Etcm93PlxyXG5cdFx0XHRcdFx0XHQ8YS1yb3cgdHlwZT1cImZsZXhcIiBzdHlsZT1cImFsaWduLWl0ZW1zOiBjZW50ZXI7XCI+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI5XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YS1zd2l0Y2ggdi1tb2RlbDpjaGVja2VkPVwiJHt0aGlzLmludGVycG9sYXRlfVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2NoZWNrZWRDaGlsZHJlbj4gaW50ZXJwb2xhdGlvbiA8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI3VuQ2hlY2tlZENoaWxkcmVuPiBpbnRlcnBvbGF0aW9uIDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L2Etc3dpdGNoPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCIxXCIgc3R5bGU9XCJwYWRkaW5nOiAwIDhweDtcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxkaXYgc3R5bGU9XCJ3aGl0ZS1zcGFjZTogbm93cmFwO1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQoeyR7dGhpcy5tdWx0aS5zUG9pbnRzfX0gLyB7JHt0aGlzLm11bHRpLnNDb3N0fX0pXHJcblx0XHRcdFx0XHRcdFx0XHRcdFt7JHt0aGlzLm11bHRpLnNWYWx1ZX19XVxyXG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHRcdFx0XHQ8YS1jb2wgZmxleD1cIjMwJVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGEtcHJvZ3Jlc3Mgc2l6ZT1cInNtYWxsXCIgOnBlcmNlbnQ9XCIke3RoaXMubXVsdGkucGVyY2VudH1cIiAvPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI3MHB4XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiA6ZGlzYWJsZWQ9XCIkeyF0aGlzLm11bHRpLmNhblJlcXVlc3R9XCIgQGNsaWNrPVwiJHt0aGlzLm11bHRpLmRvUmVxdWVzdCgpfVwiIGJsb2NrPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRNdWx0aVxyXG5cdFx0XHRcdFx0XHRcdFx0PC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0XHQ8L2Etcm93PlxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLXRhYmxlPlxyXG5cdFx0XHQ8L0xBRERFUj5cclxuXHRcdGA7XHJcblx0fVxyXG5cdHBhZ2VTaXplID0gMTU7XHJcblx0Y3VycmVudFBhZ2UgPSAtMTtcclxuXHJcblx0aW50ZXJwb2xhdGUgPSBmYWxzZTtcclxuXHRnZXQgcGFnaW5hdGlvbigpOiBhbnRkLlRhYmxlUHJvcHM8UmFua2VyPlsncGFnaW5hdGlvbiddIHtcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRQYWdlID09IC0xKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFBhZ2UgPSBNYXRoLmNlaWwodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rIC8gdGhpcy5wYWdlU2l6ZSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRkZWZhdWx0UGFnZVNpemU6IHRoaXMucGFnZVNpemUsXHJcblx0XHRcdGRlZmF1bHRDdXJyZW50OiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHQvLyBoaWRlT25TaW5nbGVQYWdlOiB0cnVlLFxyXG5cdFx0XHRwYWdlU2l6ZTogdGhpcy5wYWdlU2l6ZSxcclxuXHRcdFx0c2hvd1NpemVDaGFuZ2VyOiB0cnVlLFxyXG5cdFx0XHRjdXJyZW50OiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHRvbkNoYW5nZTogKHBhZ2U6IG51bWJlciwgc2l6ZTogbnVtYmVyKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IHBhZ2U7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uU2hvd1NpemVDaGFuZ2U6IChwYWdlOiBudW1iZXIsIHNpemU6IG51bWJlcikgPT4ge1xyXG5cdFx0XHRcdHRoaXMucGFnZVNpemUgPSBzaXplO1xyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IE1hdGguY2VpbCh0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmsgLyB0aGlzLnBhZ2VTaXplKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHtcclxuXHRcdFx0XHRcdFx0cmFuazogdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rLFxyXG5cdFx0XHRcdFx0XHRwYWdlOiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHRcdFx0XHRzaXplXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0cGFnZVNpemVPcHRpb25zOiBBcnJheSgzMCkuZmlsbCgwKS5tYXAoKGUsIGkpID0+IGkgKyAxKS5yZXZlcnNlKCksXHJcblx0XHR9O1xyXG5cdH1cclxuXHRjb2x1bW5zOiBFeGNsdWRlPGFudGQuVGFibGVQcm9wczxSYW5rZXI+Wydjb2x1bW5zJ10sIHVuZGVmaW5lZD4gPSBbXHJcblx0XHR7IHRpdGxlOiAnIycsIGRhdGFJbmRleDogJ3JhbmsnLCBrZXk6ICdyYW5rJywgd2lkdGg6ICdjYWxjKDE2cHggKyA0Y2gpJywgYWxpZ246ICdyaWdodCcgfSxcclxuXHRcdHsgdGl0bGU6ICdVc2VybmFtZScsIGRhdGFJbmRleDogJ3VzZXJuYW1lJywga2V5OiAndXNlcm5hbWUnIH0sXHJcblx0XHR7IHRpdGxlOiAnUG93ZXInLCBkYXRhSW5kZXg6ICdwb3dlckZvcm1hdHRlZCcsIGtleTogJ3Bvd2VyJywgYWxpZ246ICdyaWdodCcsIHdpZHRoOiAnMzAlJyB9LFxyXG5cdFx0eyB0aXRsZTogJ1BvaW50cycsIGRhdGFJbmRleDogJ3BvaW50c0Zvcm1hdHRlZCcsIGtleTogJ3BvaW50cycsIGFsaWduOiAncmlnaHQnLCB3aWR0aDogJzMwJScgfSxcclxuXHRdO1xyXG5cdGNvbnN0cnVjdG9yKC4uLmE6IGFueVtdKSB7XHJcblx0XHRzdXBlciguLi5hKTtcclxuXHRcdHRoaXMuY29sdW1uc1sxXS5maWx0ZXJzID0gW1xyXG5cdFx0XHR7IHRleHQ6ICdDZW50ZXIgeW91cnNlbGYnLCB2YWx1ZTogdHJ1ZSB9XHJcblx0XHRdO1xyXG5cdFx0dGhpcy5jb2x1bW5zWzFdLm9uRmlsdGVyID0gKHZhbHVlLCByYW5rZXI6IFJhbmtlcikgPT4ge1xyXG5cdFx0XHRpZiAoIXZhbHVlKVxyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRpZiAocmFua2VyLnJhbmsgPT0gMSlcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY2VudGVyZWRMaW1pdHMubWluIDw9IHJhbmtlci5yYW5rXHJcblx0XHRcdFx0JiYgcmFua2VyLnJhbmsgPD0gdGhpcy5jZW50ZXJlZExpbWl0cy5tYXg7XHJcblx0XHR9O1xyXG5cdH1cclxuXHRnZXQgY2VudGVyZWRMaW1pdHMoKSB7XHJcblx0XHRsZXQgc3RhdGUgPSB0aGlzLmxhZGRlci5zdGF0ZTtcclxuXHRcdGxldCBoYWxmID0gfn4odGhpcy5wYWdlU2l6ZSAvIDIpLCBleHRyYSA9IHRoaXMucGFnZVNpemUgJSAyO1xyXG5cdFx0bGV0IG1pZGRsZVJhbmsgPSBzdGF0ZS55b3VyUmFua2VyLnJhbms7XHJcblx0XHRtaWRkbGVSYW5rID0gTWF0aC5taW4obWlkZGxlUmFuaywgc3RhdGUuaW50ZXJwb2xhdGVkLnJhbmtlcnMubGVuZ3RoIC0gaGFsZik7XHJcblx0XHRtaWRkbGVSYW5rID0gTWF0aC5tYXgobWlkZGxlUmFuaywgaGFsZiArIDEpO1xyXG5cdFx0cmV0dXJuIHsgbWluOiBtaWRkbGVSYW5rIC0gaGFsZiArIDEsIG1heDogbWlkZGxlUmFuayArIGhhbGYgLSAxICsgZXh0cmEgfTtcclxuXHR9XHJcblx0Z2V0IHRhYmxlRGF0YSgpIHtcclxuXHRcdHJldHVybiB0aGlzLmxhZGRlci5zdGF0ZS5pbnRlcnBvbGF0ZWQucmFua2VycztcclxuXHR9XHJcblx0cm93Q2xhc3NOYW1lKHJlY29yZDogUmFua2VyKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHQncmFua2VyLXJvdy15b3UnOiByZWNvcmQueW91LFxyXG5cdFx0XHQncmFua2VyLXJvdy1wcm9tb3RlZCc6ICFyZWNvcmQuZ3Jvd2luZyxcclxuXHRcdH07XHJcblx0fVxyXG5cdGFzc2hvbGVUYWcocmFua2VyOiBSYW5rZXIpIHtcclxuXHRcdGxldCB0YWdzID0gdGhpcy5sYWRkZXIuc3RhdGUuaW5mb0RhdGEuYXNzaG9sZVRhZ3M7XHJcblx0XHRpZiAocmFua2VyLnRpbWVzQXNzaG9sZSA8IHRhZ3MubGVuZ3RoKVxyXG5cdFx0XHRyZXR1cm4gdGFnc1tyYW5rZXIudGltZXNBc3Nob2xlXTtcclxuXHRcdHJldHVybiB0YWdzW3RhZ3MubGVuZ3RoIC0gMV07XHJcblx0fVxyXG5cclxuXHRnZXRWaXNpYmxlRXZlbnRzKHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHRjb25zdCB2aXNpYmxlRHVyYXRpb24gPSAxMDtcclxuXHRcdGNvbnN0IGRpc2FwcGVhckR1cmF0aW9uID0gMTA7XHJcblx0XHRsZXQgbm93ID0gdGhpcy5sYWRkZXIuc3RhdGUuY3VycmVudFRpbWU7XHJcblx0XHRyZXR1cm4gcmFua2VyLmhpc3RvcnlcclxuXHRcdFx0Lm1hcChlID0+IHtcclxuXHRcdFx0XHRsZXQgdGltZVNpbmNlID0gbm93IC0gZS5jdXJyZW50VGltZTtcclxuXHRcdFx0XHRsZXQgb3BhY2l0eSA9IHRpbWVTaW5jZSA8IHZpc2libGVEdXJhdGlvbiA/IDEgOiAoMSAtICh0aW1lU2luY2UgLSB2aXNpYmxlRHVyYXRpb24pIC8gZGlzYXBwZWFyRHVyYXRpb24pO1xyXG5cdFx0XHRcdHJldHVybiB7IGRlbHRhOiBlLnJhbmsgLSBlLm9sZFJhbmssIG9wYWNpdHkgfTtcclxuXHRcdFx0fSkuZmlsdGVyKGUgPT4gZS5vcGFjaXR5ID4gMClcclxuXHRcdFx0LmZsYXRNYXAoZSA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIEFycmF5KE1hdGguYWJzKGUuZGVsdGEpKS5maWxsKGUpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuc2xpY2UoLTEwKS5yZXZlcnNlKCk7XHJcblx0fVxyXG5cdGdldEhpc3RvcnkocmFua2VyOiBSYW5rZXIpIHtcclxuXHRcdC8vIGNvbnNvbGUudGltZSgpXHJcblx0XHRjb25zdCB2aXNpYmxlRHVyYXRpb24gPSAxMDtcclxuXHRcdGNvbnN0IGRpc2FwcGVhckR1cmF0aW9uID0gMTA7XHJcblx0XHRsZXQgbm93ID0gdGhpcy5sYWRkZXIuc3RhdGUuY3VycmVudFRpbWU7XHJcblx0XHRjb25zdCB0ZXh0czogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgdW5kZWZpbmVkPiA9IHtcclxuXHRcdFx0VVBSQU5LOiAn4payJyxcclxuXHRcdFx0RE9XTlJBTks6ICfilrwnLFxyXG5cdFx0XHRMQVNUOiAn8J+lnScsXHJcblx0XHRcdEJJQVM6ICcgQiAnLFxyXG5cdFx0XHRNVUxUSTogJyBNICcsXHJcblx0XHR9O1xyXG5cdFx0Y29uc3Qgc3R5bGVNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD4gPSB7XHJcblx0XHRcdFVQUkFOSzogJ2NvbG9yOmdyZWVuO3dpZHRoOjFjaDsnLFxyXG5cdFx0XHRET1dOUkFOSzogJ2NvbG9yOnJlZDt3aWR0aDoxY2g7JyxcclxuXHRcdFx0TEFTVDogJ3dpZHRoOjFjaDsnLFxyXG5cdFx0XHRCSUFTOiAnY29sb3I6Ymx1ZTt3aWR0aDoyY2g7JyxcclxuXHRcdFx0TVVMVEk6ICdjb2xvcjpwdXJwbGU7d2lkdGg6MmNoOycsXHJcblx0XHR9O1xyXG5cdFx0bGV0IHYgPSBbcmFua2VyLmludGVycG9sYXRlZC5oaXN0b3J5LCByYW5rZXIuaGlzdG9yeV0uZmxhdE1hcChlID0+IFZ1ZS50b1JhdyhlKSkuc2xpY2UoMCwgMTApXHJcblx0XHRcdC5mbGF0TWFwKGUgPT4ge1xyXG5cdFx0XHRcdGxldCB0aW1lU2luY2UgPSBub3cgLSBlLmN1cnJlbnRUaW1lO1xyXG5cdFx0XHRcdGxldCBvcGFjaXR5ID0gdGltZVNpbmNlIDwgdmlzaWJsZUR1cmF0aW9uID8gMSA6ICgxIC0gKHRpbWVTaW5jZSAtIHZpc2libGVEdXJhdGlvbikgLyBkaXNhcHBlYXJEdXJhdGlvbik7XHJcblx0XHRcdFx0aWYgKG9wYWNpdHkgPD0gMClcclxuXHRcdFx0XHRcdHJldHVybiBbXTtcclxuXHJcblx0XHRcdFx0bGV0IHRleHQgPSB0ZXh0c1tlLnR5cGVdIHx8IGAgPyR7ZS50eXBlfT8gYDtcclxuXHRcdFx0XHRsZXQgc3R5bGUgPSBgb3BhY2l0eToke29wYWNpdHl9OyAke3N0eWxlTWFwW2UudHlwZV0gfHwgJyd9YDtcclxuXHRcdFx0XHRsZXQgZGF0YSA9IHsgdGV4dCwgc3R5bGUsIC4uLmUgfTtcclxuXHJcblx0XHRcdFx0aWYgKGUudHlwZSAhPSAnRE9XTlJBTksnICYmIGUudHlwZSAhPSAnVVBSQU5LJylcclxuXHRcdFx0XHRcdHJldHVybiBbZGF0YV07XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0cmV0dXJuIEFycmF5KE1hdGguYWJzKGUuZGVsdGEpKS5maWxsKDApLm1hcChlID0+IGRhdGEpO1xyXG5cdFx0XHR9KS5zbGljZSgwLCAxMCkucmV2ZXJzZSgpO1xyXG5cdFx0Ly8gY29uc29sZS50aW1lRW5kKClcclxuXHRcdHJldHVybiBWdWUubWFya1Jhdyh2KTtcclxuXHR9XHJcblxyXG5cdGZvcm1hdChuOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiBudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KG4pO1xyXG5cdH1cclxuXHJcblx0Z2V0IGJpYXMoKSB7XHJcblx0XHRsZXQgdGltZSA9IHRoaXMubGFkZGVyLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0bGV0IHZhbHVlID0gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5iaWFzO1xyXG5cdFx0bGV0IGNvc3QgPSB0aGlzLmxhZGRlci5nZXRCaWFzQ29zdCgpO1xyXG5cdFx0bGV0IHBvaW50cyA9IHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIuaW50ZXJwb2xhdGVkLnBvaW50cztcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR2YWx1ZSwgY29zdCwgcG9pbnRzLFxyXG5cdFx0XHRjYW46IHBvaW50cyA+PSBjb3N0LFxyXG5cdFx0XHRwZXJjZW50OiBNYXRoLm1pbigxMDAsIE1hdGguZmxvb3IocG9pbnRzIC8gY29zdCAqIDEwMCkpLFxyXG5cdFx0XHRzVmFsdWU6ICcrJyArIHZhbHVlLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKSxcclxuXHRcdFx0c0Nvc3Q6IHRoaXMuZm9ybWF0KGNvc3QpLFxyXG5cdFx0XHRzUG9pbnRzOiB0aGlzLmZvcm1hdChwb2ludHMpLFxyXG5cdFx0XHRjYW5SZXF1ZXN0OiB0aGlzLmxhZGRlci5jYW5SZXF1ZXN0KCdiaWFzJyksXHJcblx0XHRcdGRvUmVxdWVzdDogKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMubGFkZGVyLnJlcXVlc3QoJ2JpYXMnKTtcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0fVxyXG5cdGdldCBtdWx0aSgpIHtcclxuXHRcdGxldCB0aW1lID0gdGhpcy5sYWRkZXIuc3RhdGUuY3VycmVudFRpbWU7XHJcblx0XHRsZXQgdmFsdWUgPSB0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLm11bHRpcGxpZXI7XHJcblx0XHRsZXQgY29zdCA9IHRoaXMubGFkZGVyLmdldE11bHRpcGxpZXJDb3N0KCk7XHJcblx0XHRsZXQgcG9pbnRzID0gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5pbnRlcnBvbGF0ZWQucG93ZXI7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dmFsdWUsIGNvc3QsIHBvaW50cyxcclxuXHRcdFx0Y2FuOiBwb2ludHMgPj0gY29zdCxcclxuXHRcdFx0cGVyY2VudDogTWF0aC5taW4oMTAwLCBNYXRoLmZsb29yKHBvaW50cyAvIGNvc3QgKiAxMDApKSxcclxuXHRcdFx0c1ZhbHVlOiAneCcgKyB2YWx1ZS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyksXHJcblx0XHRcdHNDb3N0OiB0aGlzLmZvcm1hdChjb3N0KSxcclxuXHRcdFx0c1BvaW50czogdGhpcy5mb3JtYXQocG9pbnRzKSxcclxuXHRcdFx0Y2FuUmVxdWVzdDogdGhpcy5sYWRkZXIuY2FuUmVxdWVzdCgnbXVsdGknKSxcclxuXHRcdFx0ZG9SZXF1ZXN0OiAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXIucmVxdWVzdCgnbXVsdGknKTtcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0fVxyXG5cdGZyYW1lRHVyYXRpb24gPSAnJztcclxuXHRmcmFtZXMgPSAnJztcclxuXHRtb3VudGVkKCkge1xyXG5cdFx0dm9pZCAoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRsZXQgZnJhbWVzID0gWzBdO1xyXG5cdFx0XHRsZXQgbGFzdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHR3aGlsZSAoMSkge1xyXG5cdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSk7XHJcblx0XHRcdFx0dGhpcy5oYW5sZUFuaW1hdGlvbkZyYW1lKCk7XHJcblx0XHRcdFx0bGV0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRcdGxldCBkZWx0YSA9IG5vdyAtIGxhc3Q7XHJcblx0XHRcdFx0aWYgKGRlbHRhID4gMzApXHJcblx0XHRcdFx0XHRmcmFtZXMudW5zaGlmdChkZWx0YSk7XHJcblx0XHRcdFx0bGFzdCA9IG5vdztcclxuXHRcdFx0XHRpZiAoZnJhbWVzLmxlbmd0aCA+IDMwKVxyXG5cdFx0XHRcdFx0ZnJhbWVzLnBvcCgpO1xyXG5cdFx0XHRcdHRoaXMuZnJhbWVzID0gZnJhbWVzLm1hcChlID0+IGUudG9GaXhlZCgwKS5wYWRTdGFydCgzLCAnMCcpKS5qb2luKCcsICcpO1xyXG5cdFx0XHRcdHRoaXMuZnJhbWVEdXJhdGlvbiA9IGZyYW1lcy5zbGljZSgwLCAxMClcclxuXHRcdFx0XHRcdC5yZWR1Y2UoKHYsIGUsIGksIGEpID0+IHYgKyBlIC8gYS5sZW5ndGgsIDApLnRvRml4ZWQoMyk7XHJcblx0XHRcdH1cclxuXHRcdH0pKCk7XHJcblx0fVxyXG5cdGhhbmxlQW5pbWF0aW9uRnJhbWUoKSB7XHJcblx0XHRpZiAoIXRoaXMuaW50ZXJwb2xhdGUpIHJldHVybjtcclxuXHRcdGxldCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdGxldCBzdGF0ZSA9IHRoaXMubGFkZGVyLnN0YXRlO1xyXG5cdFx0bGV0IGVzdE5leHRVcGRhdGUgPSBzdGF0ZS51cGRhdGVTdGFydFJlYWx0aW1lICsgMTAwMDtcclxuXHRcdGxldCBlc3RGaW5pc2hJbnRlcnBvbGF0ZSA9IG5vdyArIChzdGF0ZS5pbnRlcnBvbGF0ZWQucmVhbHRpbWVFbmQgLSBzdGF0ZS5pbnRlcnBvbGF0ZWQucmVhbHRpbWVTdGFydCkgKyA4O1xyXG5cdFx0aWYgKGVzdEZpbmlzaEludGVycG9sYXRlID4gZXN0TmV4dFVwZGF0ZSkgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMubGFkZGVyLmludGVycG9sYXRlTGFkZGVyKChub3cgLSBzdGF0ZS51cGRhdGVFbmRSZWFsdGltZSkgLyAxMDAwKTtcclxuXHR9XHJcbn0iXX0=