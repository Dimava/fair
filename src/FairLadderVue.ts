
@GlobalComponent
class FairLadderVue extends VueWithProps({
	ladder: FairLadder,
}) {
	@VueTemplate
	get _t() {
		let record = this.tableData[0];
		let ranker = this.tableData[0];
		let h = this.getHistory(ranker)[0];
		let text!: string;
		let column!: typeof this.columns[0];
		return `
			<LADDER>
				<a-table
						:columns="${this.columns}"
						:data-source="${this.tableData}"
						size="small"
						:rowKey="${(record: Ranker) => record.accountId}"
						:rowClassName="${(record: Ranker, index: number) => this.rowClassName(record)}"
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
	get pagination(): antd.TableProps<Ranker>['pagination'] {
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
			onChange: (page: number, size: number) => {
				this.currentPage = page;
			},
			onShowSizeChange: (page: number, size: number) => {
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
	columns: Exclude<antd.TableProps<Ranker>['columns'], undefined> = [
		{ title: '#', dataIndex: 'rank', key: 'rank', width: 'calc(16px + 4ch)', align: 'right' },
		{ title: 'Username', dataIndex: 'username', key: 'username' },
		{ title: 'Power', dataIndex: 'powerFormatted', key: 'power', align: 'right', width: '30%' },
		{ title: 'Points', dataIndex: 'pointsFormatted', key: 'points', align: 'right', width: '30%' },
	];
	constructor(...a: any[]) {
		super(...a);
		this.columns[1].filters = [
			{ text: 'Center yourself', value: true }
		];
		this.columns[1].onFilter = (value, ranker: Ranker) => {
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
	rowClassName(record: Ranker) {
		return {
			'ranker-row-you': record.you,
			'ranker-row-promoted': !record.growing,
		};
	}
	assholeTag(ranker: Ranker) {
		let tags = this.ladder.state.infoData.assholeTags;
		if (ranker.timesAsshole < tags.length)
			return tags[ranker.timesAsshole];
		return tags[tags.length - 1];
	}

	getVisibleEvents(ranker: Ranker) {
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
	getHistory(ranker: Ranker) {
		// console.time()
		const visibleDuration = 10;
		const disappearDuration = 10;
		let now = this.ladder.state.currentTime;
		const texts: Record<string, string | undefined> = {
			UPRANK: '▲',
			DOWNRANK: '▼',
			LAST: '🥝',
			BIAS: ' B ',
			MULTI: ' M ',
		};
		const styleMap: Record<string, string | undefined> = {
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

	format(n: number) {
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
}
