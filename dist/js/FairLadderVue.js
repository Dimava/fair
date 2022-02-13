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
									can:{${this.bias.can}}
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
							<a-col flex="9" />
							<a-col flex="1" style="padding: 0 8px;">
								<div style="white-space: nowrap;">
									can:{${this.multi.can}}
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
        let value = this.ladder.state.yourRanker.bias;
        let cost = this.ladder.getBiasCost();
        let points = this.ladder.state.yourRanker.points;
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
        let value = this.ladder.state.yourRanker.multiplier;
        let cost = this.ladder.getMultiplierCost();
        let points = this.ladder.state.yourRanker.power;
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
};
__decorate([
    VueTemplate
], FairLadderVue.prototype, "_t", null);
FairLadderVue = __decorate([
    GlobalComponent
], FairLadderVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmFpckxhZGRlclZ1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlyTGFkZGVyVnVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFjLFNBQVEsWUFBWSxDQUFDO0lBQ3hDLE1BQU0sRUFBRSxVQUFVO0NBQ2xCLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDTCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLElBQWEsQ0FBQztRQUNsQixJQUFJLE1BQStCLENBQUM7UUFDcEMsT0FBTzs7O2tCQUdTLElBQUksQ0FBQyxPQUFPO3NCQUNSLElBQUksQ0FBQyxTQUFTOztpQkFFbkIsQ0FBQyxNQUFjLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTO3VCQUM5QixDQUFDLE1BQWMsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO3FCQUM5RCxJQUFJLENBQUMsVUFBVTs7Ozt3QkFJWixNQUFNLENBQUMsR0FBRyxJQUFJLFVBQVU7Ozs7Ozt3QkFNeEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNO3NDQUNOLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSTs7d0JBRTlELE1BQU0sQ0FBQyxHQUFHLElBQUksVUFBVTs7Ozs7b0JBSzVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FB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LENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4RSxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztxQkFDdEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNOLENBQUM7Q0FDRCxDQUFBO0FBalNBO0lBREMsV0FBVzt1Q0FvR1g7QUF2R0ksYUFBYTtJQURsQixlQUFlO0dBQ1YsYUFBYSxDQXFTbEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuQEdsb2JhbENvbXBvbmVudFxyXG5jbGFzcyBGYWlyTGFkZGVyVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRsYWRkZXI6IEZhaXJMYWRkZXIsXHJcbn0pIHtcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRsZXQgcmVjb3JkID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRsZXQgcmFua2VyID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRsZXQgaCA9IHRoaXMuZ2V0SGlzdG9yeShyYW5rZXIpWzBdO1xyXG5cdFx0bGV0IHRleHQhOiBzdHJpbmc7XHJcblx0XHRsZXQgY29sdW1uITogdHlwZW9mIHRoaXMuY29sdW1uc1swXTtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxMQURERVI+XHJcblx0XHRcdFx0PGEtdGFibGVcclxuXHRcdFx0XHRcdFx0OmNvbHVtbnM9XCIke3RoaXMuY29sdW1uc31cIlxyXG5cdFx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCIke3RoaXMudGFibGVEYXRhfVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiXHJcblx0XHRcdFx0XHRcdDpyb3dLZXk9XCIkeyhyZWNvcmQ6IFJhbmtlcikgPT4gcmVjb3JkLmFjY291bnRJZH1cIlxyXG5cdFx0XHRcdFx0XHQ6cm93Q2xhc3NOYW1lPVwiJHsocmVjb3JkOiBSYW5rZXIsIGluZGV4OiBudW1iZXIpID0+IHRoaXMucm93Q2xhc3NOYW1lKHJlY29yZCl9XCJcclxuXHRcdFx0XHRcdFx0OnBhZ2luYXRpb249XCIke3RoaXMucGFnaW5hdGlvbn1cIlxyXG5cdFx0XHRcdFx0XHR4LXRhYmxlTGF5b3V0PVwiZml4ZWRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2hlYWRlckNlbGw9XCJ7IGNvbHVtbiwgdGV4dCB9XCI+XHJcblx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSB2LWlmPVwiJHtjb2x1bW4ua2V5ID09ICd1c2VybmFtZSd9XCI+XHJcblx0XHRcdFx0XHRcdFx0PGIgc3R5bGU9XCJ3aWR0aDogMWVtO2Rpc3BsYXk6aW5saW5lLWZsZXg7XCI+XHJcblx0XHRcdFx0XHRcdFx0PC9iPlVzZXJuYW1lXHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNib2R5Q2VsbD1cInsgdGV4dCwgcmVjb3JkOiByYW5rZXIsIGluZGV4LCBjb2x1bW4gfVwiPlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cIiR7Y29sdW1uLmtleSA9PSAncmFuayd9XCI+XHJcblx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9XCJvcGFjaXR5OiAwLjI7XCI+eyR7JzAwMDAnLnNsaWNlKCh0ZXh0ICsgJycpLmxlbmd0aCl9fTwvc3Bhbj57JHt0ZXh0fX1cclxuXHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0PHRlbXBsYXRlIHYtaWY9XCIke2NvbHVtbi5rZXkgPT0gJ3VzZXJuYW1lJ31cIj5cclxuXHRcdFx0XHRcdFx0XHQ8YS10b29sdGlwXHJcblx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlbWVudD1cImJvdHRvbUxlZnRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YiBzdHlsZT1cIndpZHRoOiAxZW07ZGlzcGxheTppbmxpbmUtZmxleDtqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDpzdHlsZT1cIiR7eyBvcGFjaXR5OiByYW5rZXIudGltZXNBc3Nob2xlID8gMSA6IDAuMSB9fVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7JHt0aGlzLmFzc2hvbGVUYWcocmFua2VyKSB8fCAnQCd9fVxyXG5cdFx0XHRcdFx0XHRcdFx0PC9iPnske3RleHR9fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjdGl0bGU+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgdi1pZj1cIiR7cmFua2VyLnRpbWVzQXNzaG9sZX1cIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRQcmVzc2VkIEFzc2hvbGUgQnV0dG9uIHske3Jhbmtlci50aW1lc0Fzc2hvbGV9fSB0aW1lc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PGRpdiB2LWlmPVwiJHshcmFua2VyLmdyb3dpbmd9XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0UHJvbW90ZWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlkOnske3Jhbmtlci5hY2NvdW50SWR9fVxyXG5cdFx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtdG9vbHRpcD5cclxuXHRcdFx0XHRcdFx0XHQ8ZGl2IHN0eWxlPVwiZmxvYXQ6IHJpZ2h0O1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGIgdi1mb3I9XCIke2h9IG9mICR7dGhpcy5nZXRIaXN0b3J5KHJhbmtlcil9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9XCJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpyaWdodDtcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6c3R5bGU9XCIke2guc3R5bGV9XCJcclxuXHRcdFx0XHRcdFx0XHRcdD57JHtoLnRleHR9fTwvYj5cclxuXHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcclxuXHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNmb290ZXI+XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQ8YS1yb3cgdHlwZT1cImZsZXhcIiBzdHlsZT1cImFsaWduLWl0ZW1zOiBjZW50ZXI7XCI+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI5XCIgLz5cclxuXHRcdFx0XHRcdFx0XHQ8YS1jb2wgZmxleD1cIjFcIiBzdHlsZT1cInBhZGRpbmc6IDAgOHB4O1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBzdHlsZT1cIndoaXRlLXNwYWNlOiBub3dyYXA7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNhbjp7JHt0aGlzLmJpYXMuY2FufX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KHske3RoaXMuYmlhcy5zUG9pbnRzfX0gLyB7JHt0aGlzLmJpYXMuc0Nvc3R9fSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0W3ske3RoaXMuYmlhcy5zVmFsdWV9fV1cclxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCIzMCVcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxhLXByb2dyZXNzIHNpemU9XCJzbWFsbFwiIDpwZXJjZW50PVwiJHt0aGlzLmJpYXMucGVyY2VudH1cIiAvPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI3MHB4XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiBjbGFzcz1cImJ1dHRvbi1ncmVlblwiIDpkaXNhYmxlZD1cIiR7IXRoaXMuYmlhcy5jYW5SZXF1ZXN0fVwiIEBjbGljaz1cIiR7dGhpcy5iaWFzLmRvUmVxdWVzdCgpfVwiIGJsb2NrPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRCaWFzXHJcblx0XHRcdFx0XHRcdFx0XHQ8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdDwvYS1yb3c+XHJcblx0XHRcdFx0XHRcdDxhLXJvdyB0eXBlPVwiZmxleFwiIHN0eWxlPVwiYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cclxuXHRcdFx0XHRcdFx0XHQ8YS1jb2wgZmxleD1cIjlcIiAvPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbCBmbGV4PVwiMVwiIHN0eWxlPVwicGFkZGluZzogMCA4cHg7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8ZGl2IHN0eWxlPVwid2hpdGUtc3BhY2U6IG5vd3JhcDtcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FuOnske3RoaXMubXVsdGkuY2FufX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KHske3RoaXMubXVsdGkuc1BvaW50c319IC8geyR7dGhpcy5tdWx0aS5zQ29zdH19KVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRbeyR7dGhpcy5tdWx0aS5zVmFsdWV9fV1cclxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCIzMCVcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxhLXByb2dyZXNzIHNpemU9XCJzbWFsbFwiIDpwZXJjZW50PVwiJHt0aGlzLm11bHRpLnBlcmNlbnR9XCIgLz5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbCBmbGV4PVwiNzBweFwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGEtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgOmRpc2FibGVkPVwiJHshdGhpcy5tdWx0aS5jYW5SZXF1ZXN0fVwiIEBjbGljaz1cIiR7dGhpcy5tdWx0aS5kb1JlcXVlc3QoKX1cIiBibG9jaz5cclxuXHRcdFx0XHRcdFx0XHRcdFx0TXVsdGlcclxuXHRcdFx0XHRcdFx0XHRcdDwvYS1idXR0b24+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHRcdFx0PC9hLXJvdz5cclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS10YWJsZT5cclxuXHRcdFx0PC9MQURERVI+XHJcblx0XHRgO1xyXG5cdH1cclxuXHRwYWdlU2l6ZSA9IDE1O1xyXG5cdGN1cnJlbnRQYWdlID0gLTE7XHJcblx0Z2V0IHBhZ2luYXRpb24oKTogYW50ZC5UYWJsZVByb3BzPFJhbmtlcj5bJ3BhZ2luYXRpb24nXSB7XHJcblx0XHRpZiAodGhpcy5jdXJyZW50UGFnZSA9PSAtMSkge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRQYWdlID0gTWF0aC5jZWlsKHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucmFuayAvIHRoaXMucGFnZVNpemUpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0ZGVmYXVsdFBhZ2VTaXplOiB0aGlzLnBhZ2VTaXplLFxyXG5cdFx0XHRkZWZhdWx0Q3VycmVudDogdGhpcy5jdXJyZW50UGFnZSxcclxuXHRcdFx0Ly8gaGlkZU9uU2luZ2xlUGFnZTogdHJ1ZSxcclxuXHRcdFx0cGFnZVNpemU6IHRoaXMucGFnZVNpemUsXHJcblx0XHRcdHNob3dTaXplQ2hhbmdlcjogdHJ1ZSxcclxuXHRcdFx0Y3VycmVudDogdGhpcy5jdXJyZW50UGFnZSxcclxuXHRcdFx0b25DaGFuZ2U6IChwYWdlOiBudW1iZXIsIHNpemU6IG51bWJlcikgPT4ge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFBhZ2UgPSBwYWdlO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRvblNob3dTaXplQ2hhbmdlOiAocGFnZTogbnVtYmVyLCBzaXplOiBudW1iZXIpID0+IHtcclxuXHRcdFx0XHR0aGlzLnBhZ2VTaXplID0gc2l6ZTtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudFBhZ2UgPSBNYXRoLmNlaWwodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rIC8gdGhpcy5wYWdlU2l6ZSk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyh7XHJcblx0XHRcdFx0XHRcdHJhbms6IHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucmFuayxcclxuXHRcdFx0XHRcdFx0cGFnZTogdGhpcy5jdXJyZW50UGFnZSxcclxuXHRcdFx0XHRcdFx0c2l6ZVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHBhZ2VTaXplT3B0aW9uczogQXJyYXkoMzApLmZpbGwoMCkubWFwKChlLCBpKSA9PiBpICsgMSkucmV2ZXJzZSgpLFxyXG5cdFx0fTtcclxuXHR9XHJcblx0Y29sdW1uczogRXhjbHVkZTxhbnRkLlRhYmxlUHJvcHM8UmFua2VyPlsnY29sdW1ucyddLCB1bmRlZmluZWQ+ID0gW1xyXG5cdFx0eyB0aXRsZTogJyMnLCBkYXRhSW5kZXg6ICdyYW5rJywga2V5OiAncmFuaycsIHdpZHRoOiAnY2FsYygxNnB4ICsgNGNoKScsIGFsaWduOiAncmlnaHQnIH0sXHJcblx0XHR7IHRpdGxlOiAnVXNlcm5hbWUnLCBkYXRhSW5kZXg6ICd1c2VybmFtZScsIGtleTogJ3VzZXJuYW1lJyB9LFxyXG5cdFx0eyB0aXRsZTogJ1Bvd2VyJywgZGF0YUluZGV4OiAncG93ZXJGb3JtYXR0ZWQnLCBrZXk6ICdwb3dlcicsIGFsaWduOiAncmlnaHQnLCB3aWR0aDogJzMwJScgfSxcclxuXHRcdHsgdGl0bGU6ICdQb2ludHMnLCBkYXRhSW5kZXg6ICdwb2ludHNGb3JtYXR0ZWQnLCBrZXk6ICdwb2ludHMnLCBhbGlnbjogJ3JpZ2h0Jywgd2lkdGg6ICczMCUnIH0sXHJcblx0XTtcclxuXHRjb25zdHJ1Y3RvciguLi5hOiBhbnlbXSkge1xyXG5cdFx0c3VwZXIoLi4uYSk7XHJcblx0XHR0aGlzLmNvbHVtbnNbMV0uZmlsdGVycyA9IFtcclxuXHRcdFx0eyB0ZXh0OiAnQ2VudGVyIHlvdXJzZWxmJywgdmFsdWU6IHRydWUgfVxyXG5cdFx0XTtcclxuXHRcdHRoaXMuY29sdW1uc1sxXS5vbkZpbHRlciA9ICh2YWx1ZSwgcmFua2VyOiBSYW5rZXIpID0+IHtcclxuXHRcdFx0aWYgKCF2YWx1ZSlcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0aWYgKHJhbmtlci5yYW5rID09IDEpXHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdHJldHVybiB0aGlzLmNlbnRlcmVkTGltaXRzLm1pbiA8PSByYW5rZXIucmFua1xyXG5cdFx0XHRcdCYmIHJhbmtlci5yYW5rIDw9IHRoaXMuY2VudGVyZWRMaW1pdHMubWF4O1xyXG5cdFx0fTtcclxuXHR9XHJcblx0Z2V0IGNlbnRlcmVkTGltaXRzKCkge1xyXG5cdFx0bGV0IHN0YXRlID0gdGhpcy5sYWRkZXIuc3RhdGU7XHJcblx0XHRsZXQgaGFsZiA9IH5+KHRoaXMucGFnZVNpemUgLyAyKSwgZXh0cmEgPSB0aGlzLnBhZ2VTaXplICUgMjtcclxuXHRcdGxldCBtaWRkbGVSYW5rID0gc3RhdGUueW91clJhbmtlci5yYW5rO1xyXG5cdFx0bWlkZGxlUmFuayA9IE1hdGgubWluKG1pZGRsZVJhbmssIHN0YXRlLmludGVycG9sYXRlZC5yYW5rZXJzLmxlbmd0aCAtIGhhbGYpO1xyXG5cdFx0bWlkZGxlUmFuayA9IE1hdGgubWF4KG1pZGRsZVJhbmssIGhhbGYgKyAxKTtcclxuXHRcdHJldHVybiB7IG1pbjogbWlkZGxlUmFuayAtIGhhbGYgKyAxLCBtYXg6IG1pZGRsZVJhbmsgKyBoYWxmIC0gMSArIGV4dHJhIH07XHJcblx0fVxyXG5cdGdldCB0YWJsZURhdGEoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5sYWRkZXIuc3RhdGUuaW50ZXJwb2xhdGVkLnJhbmtlcnM7XHJcblx0fVxyXG5cdHJvd0NsYXNzTmFtZShyZWNvcmQ6IFJhbmtlcikge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0J3Jhbmtlci1yb3cteW91JzogcmVjb3JkLnlvdSxcclxuXHRcdFx0J3Jhbmtlci1yb3ctcHJvbW90ZWQnOiAhcmVjb3JkLmdyb3dpbmcsXHJcblx0XHR9O1xyXG5cdH1cclxuXHRhc3Nob2xlVGFnKHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHRsZXQgdGFncyA9IHRoaXMubGFkZGVyLnN0YXRlLmluZm9EYXRhLmFzc2hvbGVUYWdzO1xyXG5cdFx0aWYgKHJhbmtlci50aW1lc0Fzc2hvbGUgPCB0YWdzLmxlbmd0aClcclxuXHRcdFx0cmV0dXJuIHRhZ3NbcmFua2VyLnRpbWVzQXNzaG9sZV07XHJcblx0XHRyZXR1cm4gdGFnc1t0YWdzLmxlbmd0aCAtIDFdO1xyXG5cdH1cclxuXHJcblx0Z2V0VmlzaWJsZUV2ZW50cyhyYW5rZXI6IFJhbmtlcikge1xyXG5cdFx0Y29uc3QgdmlzaWJsZUR1cmF0aW9uID0gMTA7XHJcblx0XHRjb25zdCBkaXNhcHBlYXJEdXJhdGlvbiA9IDEwO1xyXG5cdFx0bGV0IG5vdyA9IHRoaXMubGFkZGVyLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0cmV0dXJuIHJhbmtlci5oaXN0b3J5XHJcblx0XHRcdC5tYXAoZSA9PiB7XHJcblx0XHRcdFx0bGV0IHRpbWVTaW5jZSA9IG5vdyAtIGUuY3VycmVudFRpbWU7XHJcblx0XHRcdFx0bGV0IG9wYWNpdHkgPSB0aW1lU2luY2UgPCB2aXNpYmxlRHVyYXRpb24gPyAxIDogKDEgLSAodGltZVNpbmNlIC0gdmlzaWJsZUR1cmF0aW9uKSAvIGRpc2FwcGVhckR1cmF0aW9uKTtcclxuXHRcdFx0XHRyZXR1cm4geyBkZWx0YTogZS5yYW5rIC0gZS5vbGRSYW5rLCBvcGFjaXR5IH07XHJcblx0XHRcdH0pLmZpbHRlcihlID0+IGUub3BhY2l0eSA+IDApXHJcblx0XHRcdC5mbGF0TWFwKGUgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBBcnJheShNYXRoLmFicyhlLmRlbHRhKSkuZmlsbChlKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LnNsaWNlKC0xMCkucmV2ZXJzZSgpO1xyXG5cdH1cclxuXHRnZXRIaXN0b3J5KHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHQvLyBjb25zb2xlLnRpbWUoKVxyXG5cdFx0Y29uc3QgdmlzaWJsZUR1cmF0aW9uID0gMTA7XHJcblx0XHRjb25zdCBkaXNhcHBlYXJEdXJhdGlvbiA9IDEwO1xyXG5cdFx0bGV0IG5vdyA9IHRoaXMubGFkZGVyLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0Y29uc3QgdGV4dHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD4gPSB7XHJcblx0XHRcdFVQUkFOSzogJ+KWsicsXHJcblx0XHRcdERPV05SQU5LOiAn4pa8JyxcclxuXHRcdFx0TEFTVDogJ/CfpZ0nLFxyXG5cdFx0XHRCSUFTOiAnIEIgJyxcclxuXHRcdFx0TVVMVEk6ICcgTSAnLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IHN0eWxlTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCB1bmRlZmluZWQ+ID0ge1xyXG5cdFx0XHRVUFJBTks6ICdjb2xvcjpncmVlbjt3aWR0aDoxY2g7JyxcclxuXHRcdFx0RE9XTlJBTks6ICdjb2xvcjpyZWQ7d2lkdGg6MWNoOycsXHJcblx0XHRcdExBU1Q6ICd3aWR0aDoxY2g7JyxcclxuXHRcdFx0QklBUzogJ2NvbG9yOmJsdWU7d2lkdGg6MmNoOycsXHJcblx0XHRcdE1VTFRJOiAnY29sb3I6cHVycGxlO3dpZHRoOjJjaDsnLFxyXG5cdFx0fTtcclxuXHRcdGxldCB2ID0gW3Jhbmtlci5pbnRlcnBvbGF0ZWQuaGlzdG9yeSwgcmFua2VyLmhpc3RvcnldLmZsYXRNYXAoZSA9PiBWdWUudG9SYXcoZSkpLnNsaWNlKDAsIDEwKVxyXG5cdFx0XHQuZmxhdE1hcChlID0+IHtcclxuXHRcdFx0XHRsZXQgdGltZVNpbmNlID0gbm93IC0gZS5jdXJyZW50VGltZTtcclxuXHRcdFx0XHRsZXQgb3BhY2l0eSA9IHRpbWVTaW5jZSA8IHZpc2libGVEdXJhdGlvbiA/IDEgOiAoMSAtICh0aW1lU2luY2UgLSB2aXNpYmxlRHVyYXRpb24pIC8gZGlzYXBwZWFyRHVyYXRpb24pO1xyXG5cdFx0XHRcdGlmIChvcGFjaXR5IDw9IDApXHJcblx0XHRcdFx0XHRyZXR1cm4gW107XHJcblxyXG5cdFx0XHRcdGxldCB0ZXh0ID0gdGV4dHNbZS50eXBlXSB8fCBgID8ke2UudHlwZX0/IGA7XHJcblx0XHRcdFx0bGV0IHN0eWxlID0gYG9wYWNpdHk6JHtvcGFjaXR5fTsgJHtzdHlsZU1hcFtlLnR5cGVdIHx8ICcnfWA7XHJcblx0XHRcdFx0bGV0IGRhdGEgPSB7IHRleHQsIHN0eWxlLCAuLi5lIH07XHJcblxyXG5cdFx0XHRcdGlmIChlLnR5cGUgIT0gJ0RPV05SQU5LJyAmJiBlLnR5cGUgIT0gJ1VQUkFOSycpXHJcblx0XHRcdFx0XHRyZXR1cm4gW2RhdGFdO1xyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdHJldHVybiBBcnJheShNYXRoLmFicyhlLmRlbHRhKSkuZmlsbCgwKS5tYXAoZSA9PiBkYXRhKTtcclxuXHRcdFx0fSkuc2xpY2UoMCwgMTApLnJldmVyc2UoKTtcclxuXHRcdC8vIGNvbnNvbGUudGltZUVuZCgpXHJcblx0XHRyZXR1cm4gVnVlLm1hcmtSYXcodik7XHJcblx0fVxyXG5cclxuXHRmb3JtYXQobjogbnVtYmVyKSB7XHJcblx0XHRyZXR1cm4gbnVtYmVyRm9ybWF0dGVyLmZvcm1hdChuKTtcclxuXHR9XHJcblxyXG5cdGdldCBiaWFzKCkge1xyXG5cdFx0bGV0IHZhbHVlID0gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5iaWFzO1xyXG5cdFx0bGV0IGNvc3QgPSB0aGlzLmxhZGRlci5nZXRCaWFzQ29zdCgpO1xyXG5cdFx0bGV0IHBvaW50cyA9IHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG9pbnRzO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHZhbHVlLCBjb3N0LCBwb2ludHMsXHJcblx0XHRcdGNhbjogcG9pbnRzID49IGNvc3QsXHJcblx0XHRcdHBlcmNlbnQ6IE1hdGgubWluKDEwMCwgTWF0aC5mbG9vcihwb2ludHMgLyBjb3N0ICogMTAwKSksXHJcblx0XHRcdHNWYWx1ZTogJysnICsgdmFsdWUudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpLFxyXG5cdFx0XHRzQ29zdDogdGhpcy5mb3JtYXQoY29zdCksXHJcblx0XHRcdHNQb2ludHM6IHRoaXMuZm9ybWF0KHBvaW50cyksXHJcblx0XHRcdGNhblJlcXVlc3Q6IHRoaXMubGFkZGVyLmNhblJlcXVlc3QoJ2JpYXMnKSxcclxuXHRcdFx0ZG9SZXF1ZXN0OiAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXIucmVxdWVzdCgnYmlhcycpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHR9XHJcblx0Z2V0IG11bHRpKCkge1xyXG5cdFx0bGV0IHZhbHVlID0gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5tdWx0aXBsaWVyO1xyXG5cdFx0bGV0IGNvc3QgPSB0aGlzLmxhZGRlci5nZXRNdWx0aXBsaWVyQ29zdCgpO1xyXG5cdFx0bGV0IHBvaW50cyA9IHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG93ZXI7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dmFsdWUsIGNvc3QsIHBvaW50cyxcclxuXHRcdFx0Y2FuOiBwb2ludHMgPj0gY29zdCxcclxuXHRcdFx0cGVyY2VudDogTWF0aC5taW4oMTAwLCBNYXRoLmZsb29yKHBvaW50cyAvIGNvc3QgKiAxMDApKSxcclxuXHRcdFx0c1ZhbHVlOiAneCcgKyB2YWx1ZS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyksXHJcblx0XHRcdHNDb3N0OiB0aGlzLmZvcm1hdChjb3N0KSxcclxuXHRcdFx0c1BvaW50czogdGhpcy5mb3JtYXQocG9pbnRzKSxcclxuXHRcdFx0Y2FuUmVxdWVzdDogdGhpcy5sYWRkZXIuY2FuUmVxdWVzdCgnbXVsdGknKSxcclxuXHRcdFx0ZG9SZXF1ZXN0OiAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXIucmVxdWVzdCgnbXVsdGknKTtcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0fVxyXG5cdGZyYW1lRHVyYXRpb24gPSAnJztcclxuXHRmcmFtZXMgPSAnJztcclxuXHRtb3VudGVkKCkge1xyXG5cdFx0dm9pZCAoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRsZXQgZnJhbWVzID0gWzBdO1xyXG5cdFx0XHRsZXQgbGFzdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHR3aGlsZSAoMSkge1xyXG5cdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSk7XHJcblx0XHRcdFx0bGV0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRcdGxldCBkZWx0YSA9IG5vdyAtIGxhc3Q7XHJcblx0XHRcdFx0aWYgKGRlbHRhID4gMzApXHJcblx0XHRcdFx0XHRmcmFtZXMudW5zaGlmdChkZWx0YSk7XHJcblx0XHRcdFx0bGFzdCA9IG5vdztcclxuXHRcdFx0XHRpZiAoZnJhbWVzLmxlbmd0aCA+IDMwKVxyXG5cdFx0XHRcdFx0ZnJhbWVzLnBvcCgpO1xyXG5cdFx0XHRcdHRoaXMuZnJhbWVzID0gZnJhbWVzLm1hcChlID0+IGUudG9GaXhlZCgwKS5wYWRTdGFydCgzLCAnMCcpKS5qb2luKCcsICcpO1xyXG5cdFx0XHRcdHRoaXMuZnJhbWVEdXJhdGlvbiA9IGZyYW1lcy5zbGljZSgwLCAxMClcclxuXHRcdFx0XHRcdC5yZWR1Y2UoKHYsIGUsIGksIGEpID0+IHYgKyBlIC8gYS5sZW5ndGgsIDApLnRvRml4ZWQoMyk7XHJcblx0XHRcdH1cclxuXHRcdH0pKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==