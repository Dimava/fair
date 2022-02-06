


class Player {
	constructor() {
		return Vue.reactive(this);
	}
}

class Ranker {
	accountId: accountId = 0;
	username: string = '';
	points: number = 0;
	power: number = 1;
	bias: number = 0;
	multiplier: number = 1;
	you: boolean = false;
	growing: boolean = true;
	timesAsshole: number = 0;
	grapes: number = 0;
	vinegar: number = 0;

	rank: number = 0;
	autoPromote: boolean = false;

	rankHistory: { oldRank: number, rank: number, currentTime: number }[] = [];

	static from(source: SocketYouRanker): YouRanker;
	static from(source: SocketRanker): Ranker;
	static from(source: SocketRanker | SocketYouRanker): Ranker | YouRanker {
		let ranker = source.you ? new YouRanker() : new Ranker();
		ranker.username = unescapeHtml(source.username);
		ranker.you = source.you;
		ranker.accountId = source.accountId;
		ranker.bias = source.bias;
		ranker.growing = source.growing;
		ranker.multiplier = source.multiplier;
		ranker.rank = source.rank;
		ranker.timesAsshole = source.timesAsshole;
		ranker.points = +source.points;
		ranker.power = +source.power;
		if (source.you) {
			let youSource = source as SocketYouRanker;
			let youRanker = ranker as YouRanker;
			youRanker.autoPromote = youSource.autoPromote;
			youRanker.grapes = +youSource.grapes;
			youRanker.vinegar = +youSource.vinegar;
		}
		return ranker;
	}

	get powerFormatted() {
		return `${numberFormatter.format(this.power)
			} [+${(this.bias + '').padStart(2, '0')
			} x${(this.multiplier + '').padStart(2, '0')
			}]`;
	}
	get pointsFormatted() {
		return numberFormatter.format(this.points);
	}
}
class YouRanker extends Ranker {
	you = true;
}

class FairLadder {
	socket?: FairSocket;
	userData = new UserData();
	state = VueReactive({
		connected: false,
		connectionRequested: false,
		rankersById: {} as Record<accountId, Ranker>,
		ladderNum: 1,

		vinegared: {
			justVinegared: false,
			vinegaredBy: new Ranker(),
			vinegarThrown: 0,
		},

		currentLadder: {
			number: 0,
		},
		yourRanker: new YouRanker(),
		firstRanker: new Ranker(),
		rankers: [new Ranker()],
		startRank: 0,

		infoData: {
			pointsForPromote: 250000000,
			minimumPeopleForPromote: 10,
			assholeLadder: 15,
			assholeTags: ["", "♠", "♣", "♥", "♦"],
			baseVinegarNeededToThrow: 1000000,
			baseGrapesNeededToAutoPromote: 2000,
			manualPromoteWaitTime: 15,
			autoPromoteLadder: 2
		},

		pointsNeededForManualPromote: 0,

		currentTime: 0,
	});
	ladderSubscription: any;
	connect() {
		if (!this.socket) throw 0;
		if (!this.userData.uuid) throw 0;
		if (this.state.connected || this.state.connectionRequested) return false;
		this.state.connectionRequested = true;

		this.ladderSubscription = this.socket.subscribe('/topic/ladder/$ladderNum', (data) => {
			this.handleLadderUpdates(data);
		}, { uuid: this.userData.uuid }, this.state.ladderNum);

		this.socket.subscribe('/user/queue/ladder/', (data) => {
			this.handleLadderInit(data);
		}, { uuid: this.userData.uuid });

		this.socket.subscribe('/user/queue/ladder/updates', (data) => {
			this.handlePrivateLadderUpdates(data);
		}, { uuid: this.userData.uuid });

		this.socket.send('/app/ladder/init/$ladderNum'
			, { uuid: this.userData.uuid }, this.state.ladderNum);

		this.socket.subscribe('/user/queue/info', (data) => {
			this.handleInfo(data);
		}, { uuid: this.userData.uuid });

		this.socket.send('/app/info'
			, { uuid: this.userData.uuid })

	}
	disconnect() {
		// todo
	}


	handleLadderUpdates(message: FairSocketSubscribeResponseMap['/topic/ladder/$ladderNum']) {
		for (let event of message.events) {
			this.handleEvent(event);
		}
		this.calculateLadder(message.secondsPassed);
	}

	handleEvent(event: SocketLadderEvent) {
		console.log(event);

		switch (event.eventType) {
			case 'BIAS': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.bias++;
				ranker.points = 0;
				break;
			}
			case 'MULTI': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.multiplier++;
				ranker.bias = 0;
				ranker.points = 0;
				ranker.power = 0;
				break;
			}
			case 'VINEGAR': {
				let vinegarThrown = +event.data.amount;
				let ranker = this.state.rankersById[event.accountId];
				ranker.vinegar = 0;
				let target = this.state.firstRanker;
				if (target.you) {
					if (event.data.success) {
						this.state.vinegared = {
							justVinegared: true,
							vinegaredBy: ranker,
							vinegarThrown,
						};
						// alert(ranker.username + " threw their "
						// + numberFormatter.format(vinegarThrown)
						// + " Vinegar at you and made you slip to the bottom of the ladder.");
					}
				}
				target.vinegar = Math.max(0, target.vinegar - vinegarThrown);
				break;
			}
			case 'SOFT_RESET_POINTS': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.points = 0;
				break;
			}
			case 'PROMOTE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.growing = false;

				if (event.accountId == this.userData.accountId) {
					// let newLadderNum = ladderData.currentLadder.number + 1
					// changeLadder(newLadderNum);
					// changeChatRoom(newLadderNum);
				}
				break;
			}
			case 'AUTO_PROMOTE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.grapes -= this.getAutoPromoteGrapeCost(ranker.rank);
				ranker.autoPromote = true;
				break;
			}
			case 'JOIN': {
				let ranker = new Ranker();
				ranker.accountId = event.accountId;
				ranker.username = unescapeHtml(event.data.username);
				ranker.rank = this.state.rankers.length + 1;
				if (!this.state.rankers.find(e => e.accountId == event.accountId)) {
					this.state.rankers.push(ranker);
					this.state.rankersById[ranker.accountId] = ranker;
				}
				break;
			}
			case 'NAME_CHANGE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.username = unescapeHtml(event.data);
				break;
			}
			case 'RESET': {
				// disconnect is made automatically
				location.reload();
				break;
			}
		}
	}

	handleInfo(message: FairSocketSubscribeResponseMap['/user/queue/info']) {
		this.state.infoData = {
			assholeLadder: message.assholeLadder,
			assholeTags: message.assholeTags,
			autoPromoteLadder: message.autoPromoteLadder,
			baseGrapesNeededToAutoPromote: +message.baseGrapesNeededToAutoPromote,
			baseVinegarNeededToThrow: +message.baseVinegarNeededToThrow,
			manualPromoteWaitTime: message.manualPromoteWaitTime,
			minimumPeopleForPromote: message.minimumPeopleForPromote,
			pointsForPromote: +message.pointsForPromote,
		}
	}

	handlePrivateLadderUpdates(message: FairSocketSubscribeResponseMap['/user/queue/ladder/updates']) {
		for (let event of message.events) {
			this.handleEvent(event);
		}
	}

	handleLadderInit(message: FairSocketSubscribeResponseMap['/user/queue/ladder/']) {
		if (message.status === "OK") {
			if (message.content) {
				localStorage._ladder = JSON.stringify(message);
				console.log(message);
				this.state.currentLadder.number = message.content.currentLadder.number;
				this.state.startRank = message.content.startRank;
				this.state.rankers = message.content.rankers.map(e => Ranker.from(e));
				this.state.rankersById = Object.fromEntries(this.state.rankers.map(e => [e.accountId, e]));
				this.state.yourRanker = this.state.rankersById[message.content.yourRanker.accountId] as YouRanker;
				this.state.firstRanker = this.state.rankers[0];

				this.state.connectionRequested = false;
				this.state.connected = true;

				this.userData.accountId = this.state.yourRanker.accountId;
				this.userData.username = this.state.yourRanker.username;
			}
		}
	}

	calculateLadder(secondsPassed: number) {
		this.state.currentTime += secondsPassed;
		// FIXME this uses 400ms per 8k rankers
		this.state.rankers.sort((a, b) => b.points - a.points);

		let ladderStats = {
			growingRankerCount: 0,
			pointsNeededForManualPromote: 0,
			eta: 0
		}

		this.state.rankers.forEach((ranker, index) => {
			let rank = index + 1;
			ranker.rank = rank;
			// If the ranker is currently still on ladder
			if (!ranker.growing) return;
			ladderStats.growingRankerCount += 1;

			// Calculating Points & Power
			if (rank != 1) {
				ranker.power += Math.floor((ranker.bias + rank - 1) * ranker.multiplier * secondsPassed);
			}
			ranker.points += Math.floor(ranker.power * secondsPassed);


			// Calculating Vinegar based on Grapes count
			if (rank == 1) {
				if (this.state.currentLadder.number === 1)
					ranker.vinegar = Math.floor(ranker.vinegar * (0.9975 ** secondsPassed));
			} else {
				ranker.vinegar += Math.floor(ranker.grapes * secondsPassed)
			}
		});

		// let rankersOld = this.state.rankers.slice();
		// FIXME this uses 400ms per 8k rankers
		this.state.rankers.sort((a, b) => b.points - a.points);

		this.state.rankers.forEach((ranker, index, list) => {
			let rank = index + 1;
			if (rank == ranker.rank) return;

			ranker.rankHistory.unshift({
				currentTime: this.state.currentTime,
				oldRank: ranker.rank,
				rank,
			});
			if (ranker.rankHistory.length > 10) {
				ranker.rankHistory.pop();
			}

			if (rank < ranker.rank) {
				// rank increase, gain grapes
				for (let r = ranker.rank; r < rank; r++) {
					// let otherRanker = rankersOld[r];
					if (ranker.growing && (ranker.bias > 0 || ranker.multiplier > 1)) {
						ranker.grapes++;
					}
				}
			}

			ranker.rank = rank;
		});

		// Ranker on Last Place gains 1 Grape, only if he isn't the only one
		if (this.state.rankers.length >= Math.max(this.state.infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
			let lastRanker = this.state.rankers[this.state.rankers.length - 1];
			if (lastRanker.growing) {
				lastRanker.grapes += ~~secondsPassed;
			}
		}
		this.state.firstRanker = this.state.rankers[0];

		this.calculateStats();
	}

	calculateStats() {
		this.state.pointsNeededForManualPromote = this.calculatePointsNeededForManualPromote();
		// 	// ETA
		// 	// TODO: ETA
	}
	calculatePointsNeededForManualPromote() {
		let infoData = this.state.infoData;
		if (this.state.rankers.length < Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
			return Infinity;
		}
		if (this.state.firstRanker.points < infoData.pointsForPromote) {
			return infoData.pointsForPromote;
		}
		let firstRanker = this.state.firstRanker;
		let secondRanker = this.state.rankers[1];
		if (this.state.currentLadder.number < infoData.autoPromoteLadder) {
			if (!firstRanker.you) return firstRanker.points + 1;
			return secondRanker.points + 1;
		}

		let leadingRanker = firstRanker;
		let pursuingRanker = firstRanker.you ? secondRanker : firstRanker;

		// How many more points does the ranker gain against his pursuer, every Second
		let powerDiff = (leadingRanker.growing ? pursuingRanker.power : 0) - (pursuingRanker.growing ? pursuingRanker.power : 0);
		// Calculate the needed Point difference, to have f.e. 30seconds of point generation with the difference in power
		let neededPointDiff = Math.abs(powerDiff * infoData.manualPromoteWaitTime);

		return Math.max(
			(leadingRanker.you ? pursuingRanker : leadingRanker).points + neededPointDiff,
			infoData.pointsForPromote
		);
	}


	request(type: 'asshole' | 'auto-promote' | 'bias' | 'multi' | 'promote' | 'vinegar') {
		if (!this.socket) throw 0;
		if (!this.canRequest(type, this.state.yourRanker.accountId)) {
			console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.yourRanker), type);
		}
		this.socket.send(`/app/ladder/post/${type}`, { uuid: this.userData.uuid });
	}

	fakeUpdate(secondsPassed: number = 1) {
		this.calculateLadder(secondsPassed);
	}
	fakeRequest(eventType: SocketLadderEvent['eventType'], accountId: accountId = this.state.yourRanker.accountId) {
		if (!this.canRequest(eventType.toLowerCase().replace(/_/g, '-') as any, accountId)) {
			console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.rankersById[accountId]), eventType);
		}
		switch (eventType) {
			case 'BIAS':
			case 'MULTI':
			case 'SOFT_RESET_POINTS':
			case 'PROMOTE':
			case 'AUTO_PROMOTE':
				this.handleEvent({ eventType, accountId }); break;
			case 'VINEGAR': {
				let target = this.state.rankers[0];
				let source = this.state.rankersById[accountId];
				this.handleEvent({
					eventType, accountId, data: {
						amount: source.vinegar + '',
						success: source.vinegar > target.vinegar,
					}
				}); break;
			}
			default:
				eventType;
				console.error('not implemented', { fakeRequest: true, eventType, accountId });
				alert('not implemented');
		}
		this.calculateLadder(0);
	}



	getUpgradeCost(level: number) {
		return Math.round(Math.pow(this.state.currentLadder.number + 1, level));
	}

	getVinegarThrowCost() {
		return this.state.infoData.baseVinegarNeededToThrow * this.state.currentLadder.number;
	}

	getAutoPromoteGrapeCost(rank: number) {
		let infoData = this.state.infoData;
		let minPeople = Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number);
		let divisor = Math.max(rank - minPeople + 1, 1);
		return Math.floor(infoData.baseGrapesNeededToAutoPromote / divisor);
	}

	getBiasCost(ranker: Ranker = this.state.yourRanker) {
		return this.getUpgradeCost(ranker.bias + 1);
	}
	getMultiplierCost(ranker: Ranker = this.state.yourRanker) {
		return this.getUpgradeCost(ranker.multiplier);
	}

	canRequest(type: 'asshole' | 'auto-promote' | 'bias' | 'multi' | 'promote' | 'vinegar', accountId = this.state.yourRanker.accountId) {
		let ranker = this.state.rankersById[accountId];
		switch (type) {
			case 'bias': {
				return this.getBiasCost(ranker) <= ranker.points;
			}
			case 'multi': {
				return this.getMultiplierCost(ranker) <= ranker.power;
			}
			case 'vinegar': {
				return this.getVinegarThrowCost() <= ranker.vinegar;
			}
			case 'promote': {
				return !!'TODO';
			}
			case 'auto-promote': {
				return !!'TODO';
			}
			case 'asshole': {
				return !!'TODO';
			}
			default:
				return false;
		}
	}

}

@GlobalComponent
class FairLadderVue extends VueWithProps({
	ladder: FairLadder,
}) {
	@VueTemplate
	get _t() {
		let record = this.tableData[0];
		let ranker = this.tableData[0];
		return `
			<LADDER>
				<a-table
						:columns="columns"
						:data-source="tableData"
						size="small"
						:rowKey="(record) => record.accountId"
						:rowClassName="(record, index)=>rowClassName(record)"
						:pagination="pagination"
						x-tableLayout="fixed"
						>
					    <template #headerCell="{ column, text }">
							<template v-if="column.key == 'username'">
								<b style="width: 1em;display:inline-flex;">
								</b>Username
							</template>
						</template>
						<template #bodyCell="{ text, record: ranker, index, column }">
							<template v-if="column.key == 'rank'">
								<span style="opacity: 0.2;">{{'0000'.slice((text+'').length)}}</span>{{text}}
							</template>
							<template v-if="column.key == 'username'">
								<a-tooltip
										placement="bottomLeft"
										>
									<b style="width: 1em;display:inline-flex;justify-content: center;"
											:style="{opacity:ranker.timesAsshole?1:0.1}">
										{${this.assholeTag(ranker) || '@'}}
									</b>{{text}}

									<template #title>
										<div v-if="ranker.timesAsshole">
											Pressed Asshole Button {{ranker.timesAsshole}} times
										</div>
										<div v-if="!ranker.growing">
											Promoted
										</div>
										id:{{ranker.accountId}}
									</template>
								</a-tooltip>
								<div style="float: right;">
									<div
											v-for="a of ${this.getVisibleEvents(ranker)}"
											style="display: inline-block; width: 1ch;"
											:style="{opacity: a.opacity, color: a.delta>0?'red':'green'}"
											>
										{{ a.delta > 0 ? '▼' : '▲' }}
									</div>
								</div>
								

							</template>
						</template>
				</a-table>
			</LADDER>
		`
	}
	pageSize = 29;//15;
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
					})
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
			if (!value) return true;
			if (ranker.rank == 1) return true;
			return this.centeredLimits.min <= ranker.rank
				&& ranker.rank <= this.centeredLimits.max;
		}
	}
	get centeredLimits() {
		let state = this.ladder.state;
		let half = ~~(this.pageSize / 2), extra = this.pageSize % 2;
		let middleRank = state.yourRanker.rank;
		middleRank = Math.min(middleRank, state.rankers.length - half);
		middleRank = Math.max(middleRank, half + 1);
		return { min: middleRank - half + 1, max: middleRank + half - 1 + extra };
	}
	get tableData() {
		return this.ladder.state.rankers;
	}
	rowClassName(record: Ranker) {
		return {
			'ranker-row-you': record.you,
			'ranker-row-promoted': !record.growing,
		};
	}
	assholeTag(ranker: Ranker) {
		let tags = this.ladder.state.infoData.assholeTags;
		if (ranker.timesAsshole < tags.length) return tags[ranker.timesAsshole];
		return tags[tags.length - 1];
	}

	getVisibleEvents(ranker: Ranker) {
		const visibleDuration = 10;
		const disappearDuration = 10;
		let now = this.ladder.state.currentTime;
		return ranker.rankHistory
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
}